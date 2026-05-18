import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MovieCard } from "@/components/MovieCard";
import { TopBar } from "@/components/TopBar";
import { getList } from "@/lib/ophim";

export const revalidate = 1800;

type Props = {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ page?: string; country?: string; category?: string }>;
};

const quickCountries = [
  { label: "Âu Mỹ", slug: "au-my" },
  { label: "Hàn Quốc", slug: "han-quoc" }
] as const;

const quickCategories = [
  { label: "Phim chiếu rạp", slug: "phim-chieu-rap" }
] as const;

const countryFilterableTypes = new Set(["phim-le", "phim-bo", "tv-shows"]);
const categoryFilterableTypes = new Set(["phim-le"]);
const PAGE_GROUP_SIZE = 10;

function normalizeCountry(country?: string) {
  const slug = String(country || "").trim().toLowerCase();
  return quickCountries.some((item) => item.slug === slug) ? slug : "";
}

function normalizeCategory(category?: string) {
  const slug = String(category || "").trim().toLowerCase();
  return quickCategories.some((item) => item.slug === slug) ? slug : "";
}

function listHref(type: string, page: number, filters?: { country?: string; category?: string }) {
  const query = new URLSearchParams({ page: String(Math.max(1, page)) });
  if (filters?.country) query.set("country", filters.country);
  if (filters?.category) query.set("category", filters.category);
  return `/list/${type}?${query.toString()}`;
}

function paginationPages(currentPage: number, totalPages?: number) {
  const groupStart = Math.floor((Math.max(1, currentPage) - 1) / PAGE_GROUP_SIZE) * PAGE_GROUP_SIZE + 1;
  const hardEnd = groupStart + PAGE_GROUP_SIZE - 1;
  const groupEnd = totalPages ? Math.min(hardEnd, totalPages) : hardEnd;

  return Array.from({ length: Math.max(0, groupEnd - groupStart + 1) }, (_, index) => groupStart + index);
}

export default async function ListPage(props: Props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const page = Math.max(1, Number(searchParams?.page || "1"));
  const supportsCountryFilter = countryFilterableTypes.has(params.type);
  const supportsCategoryFilter = categoryFilterableTypes.has(params.type);
  const country = supportsCountryFilter ? normalizeCountry(searchParams?.country) : "";
  const category = supportsCategoryFilter ? normalizeCategory(searchParams?.category) : "";
  const activeFilters = { country, category };
  const data = await getList(params.type, page, 30, country, category);

  const pageNumbers = paginationPages(data.page || page, data.totalPages);
  const currentPage = data.page || page;
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = data.totalPages ? currentPage < data.totalPages : true;

  return (
    <>
      <TopBar />
      <section className="px-4 pt-6">
        <h1 className="text-3xl font-black tracking-tight">{data.title}</h1>
        <p className="mt-1 text-sm text-zinc-400">Trang {currentPage}{data.totalPages ? ` / ${data.totalPages}` : ""}</p>
      </section>

      {supportsCountryFilter || supportsCategoryFilter ? (
        <section className="space-y-3 px-4 pt-4">
          {supportsCountryFilter ? (
            <div aria-label="Lọc nhanh theo quốc gia">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Quốc gia</p>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                <Link
                  href={listHref(params.type, 1, { ...activeFilters, country: "" })}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-extrabold ring-1 transition ${!country ? "bg-gold text-black ring-gold" : "bg-white/10 text-zinc-200 ring-white/10"}`}
                >
                  Tất cả
                </Link>
                {quickCountries.map((item) => (
                  <Link
                    key={item.slug}
                    href={listHref(params.type, 1, { ...activeFilters, country: item.slug })}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-extrabold ring-1 transition ${country === item.slug ? "bg-gold text-black ring-gold" : "bg-white/10 text-zinc-200 ring-white/10"}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {supportsCategoryFilter ? (
            <div aria-label="Lọc nhanh theo nhóm phim">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Nhóm phim</p>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                <Link
                  href={listHref(params.type, 1, { ...activeFilters, category: "" })}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-extrabold ring-1 transition ${!category ? "bg-gold text-black ring-gold" : "bg-white/10 text-zinc-200 ring-white/10"}`}
                >
                  Tất cả
                </Link>
                {quickCategories.map((item) => (
                  <Link
                    key={item.slug}
                    href={listHref(params.type, 1, { ...activeFilters, category: item.slug })}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-extrabold ring-1 transition ${category === item.slug ? "bg-gold text-black ring-gold" : "bg-white/10 text-zinc-200 ring-white/10"}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="grid grid-cols-3 gap-3 px-4 pt-5 sm:grid-cols-4">
        {data.items.map((movie, index) => (
          <MovieCard
            key={movie.slug}
            movie={movie}
            compact
            headingLevel={2}
            priority={index === 0}
            deferImage={index >= 9}
          />
        ))}
      </section>

      <nav className="px-4 pt-8" aria-label="Phân trang">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={listHref(params.type, Math.max(1, currentPage - 1), activeFilters)}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white ring-1 ring-white/10 aria-disabled:pointer-events-none aria-disabled:opacity-40"
            aria-disabled={!hasPreviousPage}
          >
            <ChevronLeft className="h-4 w-4" /> Trang trước
          </Link>

          <Link
            href={listHref(params.type, currentPage + 1, activeFilters)}
            className="inline-flex items-center gap-2 rounded-2xl bg-gold px-4 py-3 text-sm font-black text-black aria-disabled:pointer-events-none aria-disabled:opacity-40"
            aria-disabled={!hasNextPage}
          >
            Trang sau <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {pageNumbers.map((pageNumber) => {
            const active = pageNumber === currentPage;

            return (
              <Link
                key={pageNumber}
                href={listHref(params.type, pageNumber, activeFilters)}
                aria-current={active ? "page" : undefined}
                className={`grid h-11 min-w-11 place-items-center rounded-2xl px-3 text-sm font-black ring-1 transition ${
                  active
                    ? "bg-gold text-black ring-gold shadow-glow"
                    : "bg-white/10 text-zinc-200 ring-white/10 hover:bg-white/15 hover:text-white"
                }`}
              >
                {pageNumber}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
