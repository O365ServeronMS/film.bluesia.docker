import { NextRequest, NextResponse } from 'next/server';
import { torrentEngine } from '@/lib/torrent-engine';

const MAX_CHUNK_SIZE = 500 * 1024 * 1024;

function parseRange(range: string | null, fileSize: number) {
  if (!range) {
    return { start: 0, end: Math.min(fileSize - 1, MAX_CHUNK_SIZE - 1) };
  }

  const match = range.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;

  let start: number;
  let end: number;

  if (!match[1] && match[2]) {
    const suffixLength = Number.parseInt(match[2], 10);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    const boundedSuffixLength = Math.min(suffixLength, MAX_CHUNK_SIZE, fileSize);
    start = fileSize - boundedSuffixLength;
    end = fileSize - 1;
  } else {
    start = match[1] ? Number.parseInt(match[1], 10) : 0;
    end = match[2] ? Number.parseInt(match[2], 10) : start + MAX_CHUNK_SIZE - 1;
  }

  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return null;
  if (start < 0 || start >= fileSize || end < start) return null;

  end = Math.min(end, fileSize - 1, start + MAX_CHUNK_SIZE - 1);
  return { start, end };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const hash = searchParams.get('hash');

  if (!hash) {
    return new NextResponse('Missing hash parameter', { status: 400 });
  }

  try {
    const file = await torrentEngine.getStreamFile(hash);
    const fileSize = file.length;
    const range = parseRange(request.headers.get('range'), fileSize);

    if (!range) {
      return new NextResponse('Invalid range', {
        status: 416,
        headers: {
          'Content-Range': `bytes */${fileSize}`,
          'Accept-Ranges': 'bytes',
        },
      });
    }

    const { start, end } = range;
    const chunkSize = end - start + 1;
    const fileStream = file.createReadStream({ start, end });

    const stream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk: Buffer) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err: Error) => controller.error(err));
      },
      cancel() {
        fileStream.destroy();
      },
    });

    return new NextResponse(stream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': 'video/mp4',
      },
    });
  } catch (error: any) {
    console.error('[Torrent Stream API] Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
