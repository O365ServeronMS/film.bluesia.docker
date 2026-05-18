import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, ListVideo } from "lucide-react";
import { HlsVideo } from "@/components/HlsVideo";
import { WatchRecorder } from "@/components/WatchRecorder";
import { getMovie } from "@/lib/ophim";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ server?: string; ep?: string }> };

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
  const movie = await getMovie(params.slug);
  const serverIndex = Math.max(0, Number(searchParams?.server || "0"));
  const server = movie.episodes[serverIndex] || movie.episodes[0];
  const epKey = searchParams?.ep;
  const episode = server?.serverData.find((ep) => ep.slug === epKey || ep.name === epKey) || server?.serverData[0];
  const embed = episode?.linkEmbed;
  const m3u8 = episode?.linkM3u8;

  return (
    <article className="min-h-screen bg-black">
      <WatchRecorder movie={movie} />
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-white/10 bg-black/90 px-4 py-3 backdrop-blur-xl">
        <Link href={`/movie/${movie.slug}`} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-black">{movie.name}</h1>
          <p className="truncate text-xs text-zinc-400">{server?.serverName || "Server"} · {episode?.name || "Tập phim"}</p>
        </div>
        {embed && <a href={embed} target="_blank" rel="noreferrer" className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white"><ExternalLink className="h-5 w-5" /></a>}
      </header>

      <section className="aspect-video w-full bg-black">
        {embed ? (
          <iframe src={embed} title={`${movie.name} - ${episode?.name || "Tập phim"}`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen className="h-full w-full border-0" />
        ) : m3u8 ? (
          <HlsVideo src={m3u8} poster={movie.thumb || movie.poster} />
        ) : (
          <div className="grid h-full place-items-center p-6 text-center text-sm text-zinc-400">Không có link xem cho tập này.</div>
        )}
      </section>

      <section className="bg-[#07090f] px-4 py-5">
        <div className="mb-4 flex items-center gap-2 text-lg font-black"><ListVideo className="h-5 w-5 text-gold" /> Danh sách tập</div>
        {movie.episodes.map((sv, svIndex) => (
          <div key={`${sv.serverName}-${svIndex}`} className="mb-5 rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
            <h2 className="mb-3 text-sm font-bold text-zinc-300">{sv.serverName}</h2>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {sv.serverData.map((ep, epIndex) => {
                const active = svIndex === serverIndex && (ep.slug === episode?.slug || ep.name === episode?.name || epIndex === 0 && !epKey);
                return (
                  <Link key={`${ep.slug || ep.name}-${epIndex}`} href={`/watch/${movie.slug}?server=${svIndex}&ep=${encodeURIComponent(ep.slug || ep.name || String(epIndex))}`} className={active ? "rounded-xl bg-gold px-3 py-2 text-center text-xs font-black text-black" : "rounded-xl bg-white/10 px-3 py-2 text-center text-xs font-bold text-white transition hover:bg-white/15"}>
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
