"use client";

import { useEffect, useRef, useState } from "react";
import Artplayer from "artplayer";
import { Loader2, WifiOff, RefreshCw } from "lucide-react";

interface Subtitle {
  release_name: string;
  lang: string;
  url: string;
}

interface Props {
  hash: string;
  poster?: string;
  imdbId?: string;
  movieTitle?: string;
}

type PlayerState = "loading" | "playing" | "error";

export function TorrentVideo({ hash, poster, imdbId, movieTitle }: Props) {
  const artRef = useRef<HTMLDivElement | null>(null);
  const artInstanceRef = useRef<any>(null);
  const [playerState, setPlayerState] = useState<PlayerState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);

  const streamUrl = `/api/torrent/stream?hash=${encodeURIComponent(hash)}`;

  // Fetch subtitles from Subdl (non-blocking)
  useEffect(() => {
    if (!imdbId && !movieTitle) return;
    const searchParam = imdbId
      ? `imdb_id=${encodeURIComponent(imdbId)}`
      : `title=${encodeURIComponent(movieTitle || "")}`;
    fetch(`/api/subtitles?${searchParam}`)
      .then((r) => r.json())
      .then((data) => setSubtitles(data.subtitles || []))
      .catch(() => {/* silent */});
  }, [imdbId, movieTitle]);

  // Mount Artplayer once we have everything
  useEffect(() => {
    if (!artRef.current) return;

    // Destroy previous instance if re-mounting
    if (artInstanceRef.current) {
      try { artInstanceRef.current.destroy(false); } catch {}
    }

    const subtitleItems = subtitles.slice(0, 10).map((sub) => ({
      html: `[${sub.lang.toUpperCase()}] ${sub.release_name.slice(0, 40)}`,
      url: `/api/subtitles/proxy?url=${encodeURIComponent(sub.url)}`,
    }));

    const artOptions: any = {
      container: artRef.current,
      url: streamUrl,
      poster: poster || "",
      type: "mp4",
      volume: 1,
      isLive: false,
      muted: false,
      autoplay: true,
      pip: true,
      autoSize: false,
      setting: true,
      loop: false,
      playbackRate: true,
      aspectRatio: true,
      fullscreen: true,
      fullscreenWeb: true,
      subtitleOffset: true,
      miniProgressBar: true,
      mutex: true,
      backdrop: true,
      playsInline: true,
      autoPlayback: true,
      theme: "#ffd22e",
      lang: "en",
      // pre-buffer settings
      preload: "auto",
      settings: subtitleItems.length > 0 ? [
        {
          html: "Phụ đề (Subdl)",
          tooltip: "Chọn phụ đề",
          icon: '<svg style="width:20px;height:20px" viewBox="0 0 24 24"><path fill="#fff" d="M20,4H4C2.89,4 2,4.89 2,6V18C2,19.11 2.89,20 4,20H20C21.11,20 22,19.11 22,18V6C22,4.89 21.11,4 20,4M4,18V6H20V18H4M6,10H8V12H6V10M14,10H18V12H14V10M16,14H18V16H16V14M6,14H14V16H6V14Z" /></svg>',
          selector: [
            { html: "Tắt phụ đề", url: "" },
            ...subtitleItems,
          ],
          onSelect(item: any) {
            art.subtitle.url = item.url || "";
            return item.html;
          },
        },
      ] : [],
      controls: [
        {
          position: "right",
          html: '<svg style="width:24px;height:24px;margin-top:2px" viewBox="0 0 24 24"><path fill="#ffd22e" d="M20,4H4C2.89,4 2,4.89 2,6V18C2,19.11 2.89,20 4,20H20C21.11,20 22,19.11 22,18V6C22,4.89 21.11,4 20,4M4,18V6H20V18H4M6,10H8V12H6V10M14,10H18V12H14V10M16,14H18V16H16V14M6,14H14V16H6V14Z" /></svg>',
          tooltip: "Tải phụ đề từ máy",
          style: { marginRight: "10px", cursor: "pointer" },
          click() {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".srt,.vtt,.ass";
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (!file) return;
              art.subtitle.url = URL.createObjectURL(file);
              art.notice.show = `Đã tải: ${file.name}`;
            };
            input.click();
          },
        },
      ],
    };

    if (subtitleItems.length > 0) {
      artOptions.subtitle = { url: subtitleItems[0].url, type: "srt", encoding: "utf-8" };
    }

    const art = new Artplayer(artOptions);

    artInstanceRef.current = art;

    // When the video starts playing → hide loading overlay
    art.on("video:canplay", () => {
      setPlayerState("playing");
    });

    // Error handler — show error state
    art.on("video:error", () => {
      setErrorMsg("Không thể tải stream. Torrent có thể chưa đủ peers — vui lòng thử lại sau vài phút.");
      setPlayerState("error");
    });

    return () => {
      try { art.destroy(false); } catch {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamUrl, poster, subtitles]);

  const handleRetry = () => {
    setPlayerState("loading");
    setErrorMsg("");
    // Re-mount by destroying and re-creating
    if (artInstanceRef.current) {
      try { artInstanceRef.current.destroy(false); } catch {}
      artInstanceRef.current = null;
    }
    // Trigger re-mount via key change is handled by parent; here we just reload
    window.location.reload();
  };

  return (
    <div className="relative h-full w-full bg-black">
      {/* Loading overlay */}
      {playerState === "loading" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/95 pointer-events-none">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
          <p className="text-sm font-bold text-zinc-200">Đang kết nối Torrent Engine...</p>
          <p className="text-xs text-zinc-500">Server đang tìm peers — thường mất 10–30 giây</p>
        </div>
      )}

      {/* Error overlay */}
      {playerState === "error" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/95 px-8 text-center">
          <WifiOff className="h-10 w-10 text-red-400" />
          <div>
            <p className="text-sm font-bold text-zinc-200">Không thể kết nối</p>
            <p className="mt-1 text-xs text-zinc-500">{errorMsg}</p>
          </div>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-black text-black transition hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" /> Thử lại
          </button>
        </div>
      )}

      {/* Artplayer container — always rendered so the engine starts */}
      <div ref={artRef} className="h-full w-full" />
    </div>
  );
}
