import Link from "next/link";
import { X } from "lucide-react";
import { MovieCard } from "@/components/MovieCard";
import { SearchSuggest } from "@/components/SearchSuggest";
import { searchMovies } from "@/lib/ophim";

export const revalidate = 120;

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

export default async function SearchPage(props: Props) {
  const searchParams = await props.searchParams;
  const q = searchParams?.q || "";
  const page = Math.max(1, Number(searchParams?.page || "1"));
  const data = q ? await searchMovies(q, page, 30) : { title: "Tìm kiếm", items: [], page };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#07090f]/90 px-4 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <SearchSuggest initialQuery={q} autoFocus />
          <Link href="/" className="grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-white/10 text-zinc-300">
            <X className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <section className="px-4 pt-6">
        <h1 className="text-3xl font-black tracking-tight">{q ? data.title : "Bạn muốn xem gì?"}</h1>
        <p className="mt-1 text-sm text-zinc-400">Nhập tên phim, tên gốc hoặc từ khóa để tìm nhanh.</p>
      </section>

      {data.items.length > 0 ? (
        <section className="grid grid-cols-3 gap-3 px-4 pt-5 sm:grid-cols-4">
          {data.items.map((movie) => <MovieCard key={movie.slug} movie={movie} compact />)}
        </section>
      ) : q ? (
        <div className="mx-4 mt-8 rounded-3xl border border-dashed border-white/15 bg-white/5 p-8 text-center text-sm text-zinc-400">Không tìm thấy kết quả phù hợp.</div>
      ) : null}
    </>
  );
}
