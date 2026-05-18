import Link from "next/link";
import { ArrowLeft, Database, Globe2, ShieldCheck } from "lucide-react";

const apiBase = process.env.OPHIM_BASE_URL || "https://ophim1.com";

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
          <div className="mb-3 flex items-center gap-3 text-red-500"><ShieldCheck className="h-6 w-6" /><h2 className="text-lg font-black text-white">Miễn trừ trách nhiệm</h2></div>
          <p className="text-sm leading-6 text-zinc-400">Ứng dụng này hoạt động hoàn toàn dựa trên cơ chế proxy dữ liệu. Chúng tôi không lưu trữ, phân phối hay sở hữu bất kỳ tệp tin video nào trên máy chủ riêng. Mọi nội dung phim đều được trích xuất tự động từ nguồn dữ liệu công khai của bên thứ ba (Ophim). Do đó, chúng tôi hoàn toàn miễn trừ trách nhiệm liên quan đến vấn đề bản quyền của các nội dung này.</p>
        </div>
      </section>
    </>
  );
}
