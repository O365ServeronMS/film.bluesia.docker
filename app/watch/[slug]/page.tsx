import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, ExternalLink, ListVideo } from "lucide-react";
import { IframePlayerFacade } from "@/components/IframePlayerFacade";
import { WatchRecorder } from "@/components/WatchRecorder";
import { episodeWatchKey, findEpisodeByWatchKey } from "@/lib/episodes";
import { displayEpisodeServerName, getMovie } from "@/lib/ophim";

const HlsVideo = dynamic(() => import("@/components/HlsVideo").then((mod) => mod.HlsVideo), {
  loading: () => (
    <div className="grid h-full place-items-center bg-black p-6 text-center text-sm text-zinc-400">
      Đang tải trình phát video...
    </div>
  )
});

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ server?: string; ep?: string; player?: string; mirror?: string }> };

const vidsrcHosts = new Set([
  "vsembed.ru",
  "vsembed.su",
  "vidsrc-embed.ru",
  "vidsrc-embed.su",
  "vidsrcme.su",
  "vsrc.su"
]);

function isMobileUserAgent(userAgent: string) {
  return /android|iphone|ipad|ipod|mobile|iemobile|opera mini|webos/i.test(userAgent);
}

function mobileVidsrcHost() {
  const host = String(process.env.VSEMBED_MOBILE_EMBED_HOST || "vsembed.su").trim().toLowerCase();
  return vidsrcHosts.has(host) ? host : "vsembed.su";
}

function resolveEmbedUrl(src: string | undefined, options: { mobile: boolean; mirror?: string }) {
  if (!src) return undefined;

  try {
    const url = new URL(src);
    if (!vidsrcHosts.has(url.hostname)) return src;

    const mirror = String(options.mirror || "").trim().toLowerCase();
    if (vidsrcHosts.has(mirror)) {
      url.hostname = mirror;
    } else if (options.mobile) {
      url.hostname = mobileVidsrcHost();
    }

    if (options.mobile) {
      url.searchParams.set("autoplay", "0");
    }

    return url.toString();
  } catch {
    return src;
  }
}

function movieDisplayTitle(movie: Awaited<ReturnType<typeof getMovie>>) {
  const englishTitle = String(movie.originName || movie.name || "").trim();
  return englishTitle || "Phim";
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  try {
    const params = await props.params;
    const movie = await getMovie(params.slug);
    const movieTitle = movieDisplayTitle(movie);
    const title = `Watching - ${movieTitle}`;
    const description = `Đang xem ${movieTitle} trên Bluesia Cinema`;
    const image = movie.thumb || movie.poster || "/icon-512.png";

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        siteName: "Bluesia Cinema",
        type: "video.movie",
        locale: "vi_VN",
        images: [
          {
            url: image,
            alt: movieTitle
          }
        ]
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [image]
      }
    };
  } catch {
    return {
      title: "Watching - Bluesia Cinema",
      description: "Góc nhỏ của người đam mê phim"
    };
  }
}

export default async function WatchPage(props: Props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent") || "";
  const movie = await getMovie(params.slug);
  const serverIndex = Math.max(0, Number(searchParams?.server || "0"));
  const server = movie.episodes[serverIndex] || movie.episodes[0];
  const epKey = searchParams?.ep;
  const episode = findEpisodeByWatchKey(server, epKey);
  const embed = episode?.linkEmbed;
  const m3u8 = episode?.linkM3u8;
  const requestedPlayer = String(searchParams?.player || "").toLowerCase();
  const forceEmbed = requestedPlayer === "embed";
  const forceHls = requestedPlayer === "hls";
  const mobileUA = isMobileUserAgent(userAgent);
  const playerEmbed = resolveEmbedUrl(embed, { mobile: mobileUA, mirror: searchParams?.mirror });
  const useEmbedPlayer = Boolean(playerEmbed) && (forceEmbed || (mobileUA && !forceHls));

  return (
    <article className="min-h-screen bg-black">
      <link rel="preconnect" href="https://vsembed.ru" />
      <link rel="preconnect" href="https://vsembed.su" />
      <link rel="preconnect" href="https://img.ophim.live" />
      <link rel="preconnect" href="https://img.ophim.cc" />
      <link rel="dns-prefetch" href="https://vsembed.ru" />
      <link rel="dns-prefetch" href="https://vsembed.su" />
      <WatchRecorder movie={movie} />
      <header className="watch-header sticky top-0 z-40 flex items-center gap-3 border-b border-white/10 bg-black/90 px-3 py-2 backdrop-blur-xl">
        <Link href={`/movie/${movie.slug}`} aria-label={`Quay lại ${movie.name}`} className="watch-header-action grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="watch-header-content min-w-0 flex-1">
          <p className="watch-header-eyebrow text-[10px] font-bold uppercase tracking-[0.16em] text-gold">Đang xem</p>
          <div className="watch-header-copy min-w-0">
            <h1 className="watch-header-title truncate text-base font-black text-white">{movie.name}</h1>
            <p className="watch-header-meta truncate text-xs text-zinc-400">
              {displayEpisodeServerName(server?.serverName)} · {episode?.name || "Tập phim"}
            </p>
          </div>
        </div>
        {embed && <a href={embed} target="_blank" rel="noreferrer" aria-label="Mở trình phát trong tab mới" className="watch-header-action grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white"><ExternalLink className="h-5 w-5" /></a>}
      </header>

      <section className="aspect-video w-full bg-black">
        {!useEmbedPlayer && m3u8 ? (
          <HlsVideo src={m3u8} poster={movie.thumb || movie.poster} />
        ) : playerEmbed ? (
          <IframePlayerFacade
            src={playerEmbed}
            poster={movie.thumb || movie.poster}
            title={`${movie.name} - ${episode?.name || "Tập phim"}`}
          />
        ) : (
          <div className="grid h-full place-items-center p-6 text-center text-sm text-zinc-400">Không có link xem cho tập này.</div>
        )}
      </section>

      <section className="bg-[#07090f] px-4 py-5">
        <div className="mb-4 flex items-center gap-2 text-lg font-black"><ListVideo className="h-5 w-5 text-gold" /> Danh sách tập</div>
        {movie.episodes.map((sv, svIndex) => (
          <div key={`${sv.serverName}-${svIndex}`} className="mb-5 rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
            <h2 className="mb-3 text-sm font-bold text-zinc-300">{displayEpisodeServerName(sv.serverName)}</h2>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {sv.serverData.map((ep, epIndex) => {
                const currentKey = episode ? episodeWatchKey(episode, server?.serverData.indexOf(episode) ?? 0) : "";
                const active = svIndex === serverIndex && (episodeWatchKey(ep, epIndex) === currentKey || epIndex === 0 && !epKey);
                return (
                  <Link key={`${ep.slug || ep.name}-${epIndex}`} href={`/watch/${movie.slug}?server=${svIndex}&ep=${encodeURIComponent(episodeWatchKey(ep, epIndex))}`} className={active ? "rounded-xl bg-gold px-3 py-2 text-center text-xs font-black text-black" : "rounded-xl bg-white/10 px-3 py-2 text-center text-xs font-bold text-white transition hover:bg-white/15"}>
                    {ep.name || epIndex + 1}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </article>
  );
}
