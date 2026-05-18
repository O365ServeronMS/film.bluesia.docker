import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Play, Star, Users } from "lucide-react";
import { MovieActions } from "@/components/LocalMovieActions";
import { TorrentSources } from "@/components/TorrentSources";
import { getMovie } from "@/lib/ophim";
import { proxiedImage, ratingLabel, stripHtml } from "@/lib/utils";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

function movieDisplayTitle(movie: Awaited<ReturnType<typeof getMovie>>) {
  const englishTitle = String(movie.originName || movie.name || "").trim();
  return englishTitle || "Phim";
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  try {
    const params = await props.params;
    const movie = await getMovie(params.slug);
    const title = `Bluesia Cinema - ${movieDisplayTitle(movie)}`;
    const description = stripHtml(movie.content) || "Góc nhỏ của người đam mê phim";
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
            alt: movieDisplayTitle(movie)
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
      title: "Bluesia Cinema",
      description: "Góc nhỏ của người đam mê phim"
    };
  }
}

export default async function MoviePage(props: Props) {
  const params = await props.params;
  const movie = await getMovie(params.slug);
  const firstEp = movie.episodes[0]?.serverData[0];
  const heroImage = movie.thumb || movie.poster;
  const posterImage = movie.poster || movie.thumb;

  return (
    <article>
      <section className="relative min-h-[560px] overflow-hidden">
        {heroImage ? (
          <picture>
            <source media="(min-width: 640px)" srcSet={proxiedImage(heroImage, 720, 70)} />
            <img
              src={proxiedImage(heroImage, 420, 65)}
              alt={movie.name}
              className="absolute inset-0 h-full w-full object-cover opacity-60"
              fetchPriority="high"
              loading="eager"
              decoding="async"
            />
          </picture>
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-[#07090f]/80 to-[#07090f]" />
        <div className="relative z-10 px-4 pb-8 pt-5">
          <Link href="/" className="grid h-11 w-11 place-items-center rounded-full bg-black/50 text-white backdrop-blur">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="mt-10 flex gap-4">
            <div className="w-36 shrink-0 overflow-hidden rounded-3xl bg-zinc-900 shadow-2xl ring-1 ring-white/10">
              {posterImage ? (
                <picture>
                  <source media="(min-width: 640px)" srcSet={proxiedImage(posterImage, 320, 60)} />
                  <img
                    src={proxiedImage(posterImage, 240, 55)}
                    alt={movie.name}
                    className="aspect-[2/3] h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </picture>
              ) : null}
            </div>
            <div className="min-w-0 flex-1 pt-4">
              <div className="mb-3 inline-flex items-center gap-1 rounded-lg bg-black/50 px-2.5 py-1 text-xs font-bold text-gold backdrop-blur">
                <Star className="h-3.5 w-3.5 fill-gold" /> {ratingLabel(movie)}
              </div>
              <h1 className="text-3xl font-black leading-tight tracking-tight">{movie.name}</h1>
              <p className="mt-2 line-clamp-2 text-sm italic text-zinc-300">{movie.originName}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-300">
                {movie.year && <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1"><Calendar className="h-3.5 w-3.5" /> {movie.year}</span>}
                {movie.time && <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1"><Clock className="h-3.5 w-3.5" /> {movie.time}</span>}
                {movie.episodeCurrent && <span className="rounded-lg bg-white/10 px-2.5 py-1">{movie.episodeCurrent}</span>}
                {movie.quality && <span className="rounded-lg bg-gold px-2.5 py-1 font-black text-black">{movie.quality}</span>}
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-3">
            <Link href={`/watch/${movie.slug}${firstEp?.slug ? `?ep=${encodeURIComponent(firstEp.slug)}` : ""}`} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold px-5 py-4 text-base font-black text-black shadow-glow transition hover:scale-[1.01]">
              <Play className="h-5 w-5 fill-black" /> Xem phim
            </Link>
            <MovieActions movie={movie} />
          </div>
        </div>
      </section>

      <section className="px-4 pb-6">
        <div className="flex flex-wrap gap-2">
          {movie.categoryList?.map((item) => <span key={item.slug} className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-zinc-300">{item.name}</span>)}
          {movie.countryList?.map((item) => <span key={item.slug} className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-zinc-300">{item.name}</span>)}
        </div>

        <h2 className="mt-8 text-xl font-black">Nội dung</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-300">{stripHtml(movie.content) || "Chưa có mô tả."}</p>

        {movie.actor?.length ? (
          <div className="mt-6 rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
            <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-zinc-100"><Users className="h-4 w-4 text-gold" /> Diễn viên</h3>
            <p className="text-sm leading-7 text-zinc-300">{movie.actor.slice(0, 12).join(", ")}</p>
          </div>
        ) : null}

        <TorrentSources
          movieSlug={movie.slug}
          movieTitle={movie.originName || movie.name}
        />

        {movie.episodes.length ? (
          <div className="mt-8">
            <h2 className="text-xl font-black">Tập phim (Ophim)</h2>
            {movie.episodes.map((server, serverIndex) => (
              <div key={`${server.serverName}-${serverIndex}`} className="mt-4 rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
                <h3 className="mb-3 text-sm font-bold text-zinc-300">{server.serverName}</h3>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {server.serverData.map((ep, epIndex) => (
                    <Link key={`${ep.slug || ep.name}-${epIndex}`} href={`/watch/${movie.slug}?server=${serverIndex}&ep=${encodeURIComponent(ep.slug || ep.name || String(epIndex))}`} className="rounded-xl bg-white/10 px-3 py-2 text-center text-xs font-bold text-white transition hover:bg-gold hover:text-black">
                      {ep.name || epIndex + 1}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </article>
  );
}
