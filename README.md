# film.bluesia.net

## Bản 3.0.2 — VPS bounded cache fix

Ứng dụng xem phim cá nhân, mobile-first, dùng Next.js App Router và API OPhim qua server proxy `/api/ophim/*`.

## Tính năng

- Giao diện mobile kiểu app: hero slider, hàng phim lẻ/phim bộ/TV show/hoạt hình, bottom tab.
- Smart Spotlight cho banner trang chủ: chấm điểm phim từ nhiều nguồn và cá nhân hóa theo yêu thích/lịch sử xem cục bộ.
- Bộ lọc nhanh theo quốc gia cho tab Phim lẻ, Phim bộ và TV Show: Tất cả, Âu Mỹ, Hàn Quốc.
- Tab Phim lẻ có thêm bộ lọc Nhóm phim: Tất cả, Phim chiếu rạp. Có thể chọn đồng thời quốc gia và Phim chiếu rạp.
- Tìm kiếm phim.
- Trang chi tiết phim.
- Trang xem phim bằng `link_embed`; nếu không có embed thì thử `link_m3u8` qua HLS.js.
- Yêu thích và lịch sử xem lưu bằng `localStorage` trên trình duyệt.
- Không dùng đăng nhập Basic Auth.
- Có favicon/app icon riêng cho film.bluesia.net.
- Cache ảnh và metadata JSON trên VPS/Docker, giới hạn tổng 8GB.
- Không cache video/HLS/m3u8/mp4; video vẫn đi trực tiếp từ nguồn ngoài về trình duyệt.

## Cache VPS v3.0.2

Bản 3.0.2 sửa thiết kế cache so với bản 3.0.1 cũ: không dùng một TTL 15 ngày cho mọi metadata nữa.

```text
FILM_BLUESIA_NET_CACHE_DIR=/cache/film-bluesia-net
FILM_BLUESIA_NET_CACHE_MAX_BYTES=8589934592
FILM_BLUESIA_NET_IMAGE_CACHE_TTL_SECONDS=1296000
FILM_BLUESIA_NET_DETAIL_CACHE_TTL_SECONDS=1296000
FILM_BLUESIA_NET_TAXONOMY_CACHE_TTL_SECONDS=1296000
FILM_BLUESIA_NET_LIST_CACHE_TTL_SECONDS=300
FILM_BLUESIA_NET_SEARCH_CACHE_TTL_SECONDS=1800
```

Ý nghĩa:

```text
Ảnh poster/backdrop: 15 ngày
Chi tiết phim: 15 ngày
Thể loại/quốc gia: 15 ngày
Danh sách phim mới/các tab phim: 5 phút
Tìm kiếm: 30 phút
Tổng cache ảnh + metadata JSON: 8GB
```

Endpoint kiểm tra:

```text
/api/cache/status
```

## Chạy local

```bash
cp .env.example .env.local
npm install
npm run dev
```

Mở: `http://localhost:3000`

## Chạy bằng Docker/Dockge trên VPS

Stack mặc định dùng port local:

```text
127.0.0.1:3030 → container 3000
```

Build và chạy:

```bash
docker compose up -d --build
```

Caddy reverse proxy khuyến nghị:

```caddy
film.bluesia.net {
    encode gzip
    reverse_proxy 127.0.0.1:3030
}
```

Kiểm tra cache:

```bash
curl -s http://127.0.0.1:3030/api/cache/status | python3 -m json.tool
```



## Cấu trúc chính

```text
app/
  api/ophim/*       Server proxy tới OPhim metadata
  api/image         Proxy/cache ảnh poster/backdrop
  api/cache/status  Kiểm tra cache VPS
  page.tsx          Trang chủ
  list/[type]       Danh sách phim
  movie/[slug]      Chi tiết phim
  watch/[slug]      Xem phim
components/         UI components
lib/cache.ts        Cache manager giới hạn 8GB + TTL theo nhóm
lib/ophim.ts        Adapter/normalizer dữ liệu OPhim
lib/spotlight.ts    Smart Spotlight scoring
```


