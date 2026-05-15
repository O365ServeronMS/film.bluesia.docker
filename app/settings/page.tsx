import Link from "next/link";
import { ArrowLeft, Database, Globe2, ShieldCheck, Smartphone } from "lucide-react";

const apiBase = process.env.OPHIM_BASE_URL || "https://ophim1.com";
const cacheMaxBytes = Number(process.env.FILM_BLUESIA_NET_CACHE_MAX_BYTES || process.env.BLUESIA_CACHE_MAX_BYTES || 8589934592);
const listTtl = Number(process.env.FILM_BLUESIA_NET_LIST_CACHE_TTL_SECONDS || process.env.BLUESIA_LIST_CACHE_TTL_SECONDS || 300);
const imageTtl = Number(process.env.FILM_BLUESIA_NET_IMAGE_CACHE_TTL_SECONDS || process.env.BLUESIA_IMAGE_CACHE_TTL_SECONDS || 1296000);

function gb(value: number) {
  return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export default function SettingsPage() {
  return (
    <>
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-white/5 bg-[#07090f]/90 px-4 py-4 backdrop-blur-xl">
        <Link href="/" className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-black">Cài đặt</h1>
          <p className="text-sm text-zinc-400">Thông tin triển khai cá nhân.</p>
        </div>
      </header>

      <section className="grid gap-4 px-4 pt-6">
        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
          <div className="mb-3 flex items-center gap-3 text-gold"><Globe2 className="h-6 w-6" /><h2 className="text-lg font-black text-white">Truy cập</h2></div>
          <p className="text-sm leading-6 text-zinc-300">App đang mở không cần đăng nhập.</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">Ai có link đều có thể truy cập. Không đặt route proxy video qua app.</p>
        </div>

        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
          <div className="mb-3 flex items-center gap-3 text-gold"><Database className="h-6 w-6" /><h2 className="text-lg font-black text-white">Nguồn dữ liệu</h2></div>
          <p className="break-all text-sm leading-6 text-zinc-300">{apiBase}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">Danh sách, tìm kiếm, chi tiết và tập phim đều đi qua proxy metadata nội bộ <code>/api/ophim/*</code>.</p>
        </div>

        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
          <div className="mb-3 flex items-center gap-3 text-gold"><Database className="h-6 w-6" /><h2 className="text-lg font-black text-white">Cache VPS</h2></div>
          <p className="text-sm leading-6 text-zinc-300">Giới hạn tổng cache: <strong>{gb(cacheMaxBytes)}</strong></p>
          <p className="text-sm leading-6 text-zinc-300">TTL ảnh/chi tiết: <strong>{Math.round(imageTtl / 86400)} ngày</strong></p>
          <p className="text-sm leading-6 text-zinc-300">TTL danh sách phim: <strong>{Math.round(listTtl / 60)} phút</strong></p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">Xem trạng thái tại <code>/api/cache/status</code>.</p>
        </div>

        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
          <div className="mb-3 flex items-center gap-3 text-gold"><Smartphone className="h-6 w-6" /><h2 className="text-lg font-black text-white">Lưu cục bộ</h2></div>
          <p className="text-sm leading-6 text-zinc-400">Yêu thích và lịch sử xem được lưu bằng localStorage trên từng trình duyệt.</p>
        </div>

        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
          <div className="mb-3 flex items-center gap-3 text-gold"><ShieldCheck className="h-6 w-6" /><h2 className="text-lg font-black text-white">Khuyến nghị sử dụng</h2></div>
          <p className="text-sm leading-6 text-zinc-400">Chỉ cache ảnh và metadata JSON. Không cache video, m3u8, ts, m4s hoặc mp4.</p>
        </div>
      </section>
    </>
  );
}
