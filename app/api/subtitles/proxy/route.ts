import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy route to download subtitles from Subdl.
 * Subdl subtitle zip files require a server-side fetch to bypass CORS.
 * This route forwards the subtitle file download to the client.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  // Security: Only allow subdl domains
  if (!url.includes('subdl.com') && !url.includes('dl.subdl.com')) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Bluesia/1.0)'
      }
    });

    if (!upstream.ok) {
      return new NextResponse('Failed to fetch subtitle', { status: upstream.status });
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error) {
    console.error('[Subtitle Proxy] Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
