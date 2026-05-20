import { NextRequest, NextResponse } from "next/server";
import { cacheStats, pruneCache } from "@/lib/cache";
import { getList } from "@/lib/ophim";
import type { MovieCard } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_TYPES = ["phim-le", "phim-bo"];

// Variants khớp với MovieCard (mobile: 180/240/320 @q55, desktop: 420/720 @q70)
// và HeroSlider (360@q60, 540@q65, 720@q70)
const IMAGE_VARIANTS: Array<{ width: number; quality: number }> = [
  { width: 180, quality: 55 },
  { width: 240, quality: 55 },
  { width: 320, quality: 55 },
  { width: 360, quality: 60 },
  { width: 420, quality: 70 },
  { width: 540, quality: 65 },
  { width: 720, quality: 70 }
];

function numberFromEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function booleanFromEnv(name: string, fallback: boolean) {
  const value = String(process.env[name] || "").trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  return fallback;
}

function warmupTypes() {
  const raw = process.env.BLUESIA_CACHE_WARMUP_TYPES || "phim-le,phim-bo";
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((type) => DEFAULT_TYPES.includes(type));
}

function isInternalRequest(request: NextRequest) {
  const host = request.headers.get("host") || "";
  return (
    host.startsWith("127.0.0.1") ||
    host.startsWith("localhost") ||
    host.startsWith("bluesia-app")
  );
}

function isAllowed(request: NextRequest) {
  const expectedToken = process.env.BLUESIA_CACHE_WARMUP_TOKEN || "";
  const token =
    request.nextUrl.searchParams.get("token") ||
    request.headers.get("x-bluesia-cache-token") ||
    "";

  if (expectedToken && token === expectedToken) return true;
  return isInternalRequest(request);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function movieImageUrls(movie: MovieCard) {
  return unique([movie.poster || "", movie.thumb || ""]);
}

async function mapLimit<T, R>(
  values: T[],
  limit: number,
  worker: (value: T, index: number) => Promise<R>
) {
  const results: R[] = [];
  let index = 0;

  async function runner() {
    while (index < values.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await worker(values[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, () => runner())
  );

  return results;
}

async function warmImage(origin: string, imageUrl: string, width?: number, quality?: number) {
  const endpoint = new URL("/api/image", origin);
  endpoint.searchParams.set("url", imageUrl);
  if (width) endpoint.searchParams.set("w", String(width));
  if (quality) endpoint.searchParams.set("q", String(quality));

  const res = await fetch(endpoint.toString(), {
    cache: "no-store",
    headers: {
      "User-Agent": "BluesiaCacheWarmer/3.0.5 image"
    }
  });

  return {
    url: imageUrl,
    width: width ?? null,
    quality: quality ?? null,
    ok: res.ok,
    status: res.status,
    cache:
      res.headers.get("x-film-bluesia-net-cache") ||
      res.headers.get("x-bluesia-image-cache") ||
      ""
  };
}

async function warmHtmlPage(origin: string, type: string, page: number) {
  const endpoint = new URL(`/list/${type}`, origin);
  endpoint.searchParams.set("page", String(page));

  const res = await fetch(endpoint.toString(), {
    cache: "no-store",
    headers: {
      "User-Agent": "BluesiaCacheWarmer/3.0.5 html",
      "X-Bluesia-Cache-Warmup": "1"
    }
  });

  return {
    type,
    page,
    url: endpoint.pathname + endpoint.search,
    ok: res.ok,
    status: res.status,
    contentType: res.headers.get("content-type") || "",
    bytes: Number(res.headers.get("content-length") || 0) || undefined
  };
}

async function warmMoviePage(origin: string, slug: string) {
  const endpoint = new URL(`/movie/${slug}`, origin);
  const res = await fetch(endpoint.toString(), {
    cache: "no-store",
    headers: {
      "User-Agent": "BluesiaCacheWarmer/3.0.5 html",
      "X-Bluesia-Cache-Warmup": "1"
    }
  });
  return {
    slug,
    ok: res.ok,
    status: res.status
  };
}

async function warmWatchPage(origin: string, slug: string) {
  const endpoint = new URL(`/watch/${slug}`, origin);
  const res = await fetch(endpoint.toString(), {
    cache: "no-store",
    headers: {
      "User-Agent": "BluesiaCacheWarmer/3.0.5 html",
      "X-Bluesia-Cache-Warmup": "1"
    }
  });
  return {
    slug,
    ok: res.ok,
    status: res.status
  };
}

export async function GET(request: NextRequest) {
  if (!isAllowed(request)) {
    return NextResponse.json(
      { error: "Cache warmup is only allowed from internal Docker network or with a valid token." },
      { status: 403 }
    );
  }

  const startedAt = Date.now();
  const types = warmupTypes();
  const pages = numberFromEnv("BLUESIA_CACHE_WARMUP_PAGES", 10);
  const limit = numberFromEnv("BLUESIA_CACHE_WARMUP_LIMIT", 30);
  const imageConcurrency = numberFromEnv("BLUESIA_CACHE_WARMUP_IMAGE_CONCURRENCY", 6);
  const htmlConcurrency = numberFromEnv("BLUESIA_CACHE_WARMUP_HTML_CONCURRENCY", 2);

  const shouldWarmImages = request.nextUrl.searchParams.get("images") !== "0";
  const shouldWarmHtml =
    request.nextUrl.searchParams.get("html") !== "0" &&
    booleanFromEnv("BLUESIA_CACHE_WARMUP_HTML", true);

  const pageResults: Array<{
    type: string;
    page: number;
    ok: boolean;
    items: number;
    error?: string;
  }> = [];

  const movies: MovieCard[] = [];
  const page1Movies: MovieCard[] = [];
  const htmlTargets: Array<{ type: string; page: number }> = [];

  await pruneCache(false);

  for (const type of types) {
    for (let page = 1; page <= pages; page += 1) {
      htmlTargets.push({ type, page });

      try {
        const data = await getList(type, page, limit);
        movies.push(...data.items);
        if (page === 1) {
          page1Movies.push(...data.items.slice(0, 8));
        }
        pageResults.push({
          type,
          page,
          ok: true,
          items: data.items.length
        });
      } catch (error) {
        pageResults.push({
          type,
          page,
          ok: false,
          items: 0,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  }

  const uniqueImageUrls = shouldWarmImages
    ? unique(movies.flatMap((movie) => movieImageUrls(movie)))
    : [];

  // Tạo danh sách tất cả (url, width, quality) cần warm
  type ImageTask = { url: string; width: number; quality: number };
  const imageVariantTasks: ImageTask[] = shouldWarmImages
    ? uniqueImageUrls.flatMap((url) => IMAGE_VARIANTS.map((v) => ({ url, ...v })))
    : [];

  const imageResults = shouldWarmImages
    ? await mapLimit(imageVariantTasks, imageConcurrency, (task) =>
        warmImage(request.nextUrl.origin, task.url, task.width, task.quality)
      )
    : [];

  const htmlResults = shouldWarmHtml
    ? await mapLimit(htmlTargets, htmlConcurrency, (target) => warmHtmlPage(request.nextUrl.origin, target.type, target.page))
    : [];

  const detailResults = shouldWarmHtml
    ? await mapLimit(page1Movies, htmlConcurrency, async (movie) => {
        const detail = await warmMoviePage(request.nextUrl.origin, movie.slug);
        const watch = await warmWatchPage(request.nextUrl.origin, movie.slug);
        return { slug: movie.slug, detailOk: detail.ok, watchOk: watch.ok };
      })
    : [];

  await pruneCache(false);

  const stats = await cacheStats();

  return NextResponse.json({
    ok: true,
    mode: "film.bluesia.net-cache-warmup-v3.0.5",
    warmedTypes: types,
    warmedPagesPerType: pages,
    listLimit: limit,

    pageRequests: pageResults.length,
    pageErrors: pageResults.filter((item) => !item.ok).length,

    moviesDiscovered: movies.length,

    uniqueImagesDiscovered: uniqueImageUrls.length,
    imageVariantsTotal: imageVariantTasks.length,
    imageVariantsWarmed: imageResults.length,
    imageErrors: imageResults.filter((item) => !item.ok).length,
    imageVariantsCacheHit: imageResults.filter((item) => item.cache === "HIT" || item.cache === "MEM").length,

    htmlPagesDiscovered: htmlTargets.length,
    htmlPagesWarmed: htmlResults.length,
    htmlErrors: htmlResults.filter((item) => !item.ok).length,

    detailPagesWarmed: detailResults.length,
    detailErrors: detailResults.filter((item) => !item.detailOk || !item.watchOk).length,

    durationMs: Date.now() - startedAt,
    cache: stats
  });
}
