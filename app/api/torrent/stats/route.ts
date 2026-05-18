import { NextRequest, NextResponse } from 'next/server';
import { torrentEngine } from '@/lib/torrent-engine';

function isAllowed(request: NextRequest) {
  const expectedToken = process.env.TORRENT_STATS_TOKEN || '';
  const token =
    request.nextUrl.searchParams.get('token') ||
    request.headers.get('x-torrent-stats-token') ||
    '';
  const host = request.headers.get('host') || '';

  return (
    (expectedToken && token === expectedToken) ||
    host.startsWith('127.0.0.1') ||
    host.startsWith('localhost') ||
    host.startsWith('bluesia-app')
  );
}

export async function GET(request: NextRequest) {
  if (!isAllowed(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({
    torrents: torrentEngine.getStats(),
  });
}
