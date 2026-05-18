"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Magnet, Loader2, Wifi, WifiOff, ChevronDown, ChevronUp } from "lucide-react";

interface PbResult {
  name: string;
  info_hash: string;
  seeders: string;
  leechers: string;
  size: string;
}

type Props = {
  movieSlug: string;
  movieTitle: string; // English title for search
};

function SeedBadge({ seeds }: { seeds: number }) {
  const color =
    seeds >= 100 ? "text-emerald-400" : seeds >= 10 ? "text-amber-400" : "text-red-400";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${color}`}>
      <Wifi className="h-3 w-3" />
      {seeds} seeds
    </span>
  );
}

export function TorrentSources({ movieSlug, movieTitle }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [pbData, setPbData] = useState<PbResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!expanded) return;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        if (pbData) { setLoading(false); return; }
        const res = await fetch(`/api/torrent/sources?q=${encodeURIComponent(movieTitle)}&source=piratebay`);
        const data = await res.json();
        setPbData(data.results || []);
      } catch {
        setError("Không thể tải danh sách nguồn. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [expanded, movieTitle, pbData]);

  return (
    <div className="mt-8">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl bg-white/5 px-4 py-3.5 text-left ring-1 ring-white/10 transition hover:bg-white/10"
        id="torrent-sources-toggle"
        aria-expanded={expanded}
      >
        <span className="inline-flex items-center gap-2 font-black">
          <Magnet className="h-4 w-4 text-gold" />
          Xem bản quốc tế (Torrent)
        </span>
        {expanded ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
      </button>

      {expanded && (
        <div className="mt-3 rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
          {/* Tabs */}
          <div className="mb-4 flex gap-2">
            <button
              id="tab-piratebay"
              className="rounded-xl px-4 py-2 text-sm font-bold transition bg-gold text-black"
            >
              PirateBay
            </button>
          </div>

          {/* Content */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tìm kiếm nguồn...
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center gap-2 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400 ring-1 ring-red-500/20">
              <WifiOff className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {/* PirateBay Results */}
          {!loading && !error && pbData !== null && (
            pbData.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-500">Không tìm thấy trên PirateBay.</p>
            ) : (
              <div className="grid gap-2">
                {pbData.slice(0, 10).map((r) => (
                  <Link
                    key={r.info_hash}
                    href={`/watch/${movieSlug}?source=torrent&hash=${r.info_hash}`}
                    id={`pb-${r.info_hash.slice(0, 8)}`}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10 transition hover:bg-gold/10 hover:ring-gold/30"
                  >
                    <p className="min-w-0 truncate text-sm text-zinc-200">{r.name}</p>
                    <div className="shrink-0 text-right">
                      <SeedBadge seeds={Number(r.seeders)} />
                      <p className="mt-0.5 text-xs text-zinc-500">{(Number(r.size) / 1073741824).toFixed(2)} GB</p>
                    </div>
                  </Link>
                ))}
              </div>
            )
          )}

          <p className="mt-4 text-center text-xs text-zinc-600">
            Dữ liệu từ nguồn bên thứ ba. Chất lượng có thể khác nhau.
          </p>
        </div>
      )}
    </div>
  );
}
