import { NextRequest, NextResponse } from 'next/server';
import { searchPirateBay } from '@/lib/piratebay';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q');
  const source = searchParams.get('source');

  if (!q || !source) {
    return NextResponse.json({ error: 'Missing q or source parameter' }, { status: 400 });
  }

  if (source === 'piratebay') {
    const results = await searchPirateBay(q);

    // Filter only 720p/1080p versions (removed 5GB size limit)
    const sorted = [...results]
      .filter((r) => {
        const nameLower = r.name.toLowerCase();
        return nameLower.includes('720p') || nameLower.includes('1080p');
      })
      .sort((a, b) => Number(b.seeders) - Number(a.seeders));

    return NextResponse.json({ results: sorted });
  }

  return NextResponse.json({ error: 'Unknown source' }, { status: 400 });
}

