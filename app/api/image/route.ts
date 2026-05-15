import { NextRequest, NextResponse } from "next/server";
import { imageCacheTtlSeconds, readBinaryCache, writeBinaryCache } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FALLBACK_IMAGE_ROOTS = [
  "https://img.ophim.live",
  "https://img.ophim.cc"
];

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function imageCandidates(imageUrl: string) {
  const url = safeUrl(imageUrl);
  if (!url) return [];

  const candidates = [url.toString()];
  const fileName = url.pathname.split("/").filter(Boolean).pop();
  const isOphimImage = /(^|\.)ophim\./i.test(url.hostname) || url.hostname.startsWith("img.");

  if (isOphimImage && fileName) {
    const existingPath = url.pathname.startsWith("/uploads/movies/")
      ? url.pathname
      : `/uploads/movies/${fileName}`;

    candidates.push(`${url.origin}${existingPath}`);
    for (const root of FALLBACK_IMAGE_ROOTS) {
      candidates.push(`${root}${existingPath}`);
      candidates.push(`${root}/uploads/movies/${fileName}`);
    }
  }

  return unique(candidates);
}

async function fetchImage(url: string) {
  return fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (film.bluesia.net; VPS image cache)",
      "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "Referer": process.env.OPHIM_BASE_URL || "https://ophim1.com/"
    },
    cache: "no-store"
  });
}

function imageResponse(body: Buffer, contentType: string, cacheStatus: "HIT" | "MISS", sourceUrl?: string) {
  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
      "X-Film-Bluesia-Net-Cache": cacheStatus,
      "X-Film-Bluesia-Net-Cache-Type": "image",
      ...(sourceUrl ? { "X-Film-Bluesia-Net-Image-Source": sourceUrl } : {})
    }
  });
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url") || "";
  const imageUrl = decodeURIComponent(rawUrl);
  const candidates = imageCandidates(imageUrl);

  if (!candidates.length) {
    return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
  }

  const cached = await readBinaryCache("images", imageUrl, imageCacheTtlSeconds());
  if (cached) {
    return imageResponse(cached.body, cached.contentType, "HIT", cached.sourceUrl);
  }

  let lastStatus = 0;

  try {
    for (const candidate of candidates) {
      const upstream = await fetchImage(candidate);
      lastStatus = upstream.status;

      const contentType = upstream.headers.get("content-type") || "";
      const isImage = contentType.toLowerCase().startsWith("image/");

      if (upstream.ok && isImage) {
        const arrayBuffer = await upstream.arrayBuffer();
        const body = Buffer.from(arrayBuffer);
        const finalContentType = contentType || "image/jpeg";

        await writeBinaryCache("images", imageUrl, body, finalContentType, candidate);
        return imageResponse(body, finalContentType, "MISS", candidate);
      }
    }

    return NextResponse.json({ error: `Image upstream error ${lastStatus || "unknown"}` }, { status: 502 });
  } catch {
    return NextResponse.json({ error: "Image proxy failed" }, { status: 500 });
  }
}
