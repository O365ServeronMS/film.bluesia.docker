import { NextRequest, NextResponse } from 'next/server';
import { getSubtitles } from '@/lib/subdl';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imdbId = searchParams.get('imdb_id');
  const title = searchParams.get('title');

  if (!imdbId && !title) {
    return NextResponse.json({ error: 'Missing imdb_id or title' }, { status: 400 });
  }

  const subtitles = await getSubtitles(imdbId || title || '');
  return NextResponse.json({ subtitles });
}
