# Memory - Tổng hợp tính năng của FilmBluesia

Tài liệu này tổng hợp cấu trúc kiến trúc và các tính năng chính của dự án **FilmBluesia** (phiên bản 6.0.1) dựa trên phân tích mã nguồn.

---

## 1. Công nghệ Sử dụng & Kiến trúc Hệ thống

- **Frontend:** Next.js 16 (App Router) kết hợp React 19, được tối ưu hóa SEO với dữ liệu động sinh tự động (Dynamic Metadata) và cấu trúc HTML5 chuẩn SEO.
- **Styling:** Tailwind CSS v4 kế thừa hệ biến theme HSL tùy chỉnh (giao diện tối `dark-mode` hiện đại, tông vàng gold `#ffd22e` chủ đạo).
- **Bộ máy Streaming:** 
  - Trình phát mặc định hỗ trợ định dạng HLS (`.m3u8`) thông qua thư viện `Artplayer.js` và `hls.js`.
  - Hỗ trợ fallback sang Embed Player (trình phát nhúng thông qua TMDB/IMDB ID).
- **Nguồn dữ liệu:** Proxy trung gian từ API công khai của bên thứ ba (OPhim) để truy vấn thông tin chi tiết phim, danh sách, tìm kiếm, tập phim.
- **Triển khai & Vận hành:** Docker Compose quản lý 2 container:
  - `bluesia-app`: Next.js web application chạy ở cổng nội bộ `3000` (được map ra ngoài `3030`).
  - `bluesia-cache-warmer`: Tự động gửi yêu cầu khởi tạo bộ nhớ đệm (warmup) đến app sau mỗi 30 phút.

---

## 2. Các Tính năng Chính

### 2.1. Bộ máy Phát Video Đa nguồn Thích ứng (Ophim & Vidsrc)
Hệ thống cho phép người dùng chọn và chuyển đổi linh hoạt giữa 2 nguồn phát phim có cơ chế hoạt động, API và cách gọi khác nhau nhằm tối ưu hóa trải nghiệm xem phim:

#### 2.1.1. Nguồn Phim Ophim (Mặc định - HLS Streaming & Embed)
- **Cơ chế hoạt động:** Lấy trực tiếp từ API của OPhim qua endpoint `/phim/[slug]`. Mỗi tập phim cung cấp 2 định dạng đường dẫn: `link_m3u8` (HLS stream segment/chunk) và `link_embed` (iframe nhúng).
- **Cơ chế HLS Stream Chunks:** 
  - Video được chia nhỏ thành nhiều phân đoạn ngắn (video chunks - định dạng `.ts`) được lập chỉ mục bởi tệp `.m3u8`.
  - Trình duyệt sẽ tải tuần tự các chunk này qua giao thức HLS.js tích hợp trong Artplayer, giúp tối ưu hóa tốc độ tải dữ liệu, hỗ trợ chuyển đổi chất lượng động và tiết kiệm băng thông khi xem dở dang.
- **Cơ chế nhúng (Iframe Embed):** Khi chạy ở chế độ nhúng, ứng dụng sử dụng iframe trực tiếp trỏ đến `link_embed` do OPhim cung cấp.

#### 2.1.2. Nguồn Phim Vidsrc (Trình phát bổ sung qua TMDB/IMDB)
- **Cơ chế hoạt động:** Không gọi API ngoài lúc tải phim mà được **sinh tự động trên server (on-the-fly)** dựa trên ID TMDB hoặc ID IMDB từ metadata của OPhim bằng thuật toán trong `lib/vsembed.ts`.
- **Thuật toán sinh đường dẫn Vidsrc:**
  - *Đối với phim lẻ (Single Movie):* Nhận diện qua thuộc tính loại hình (`type` chứa "single", "phim-le", "movie" hoặc tổng số tập là "full", "1"). Đường dẫn nhúng được tạo theo cú pháp:
    `https://vidsrc-embed.ru/embed/movie?tmdb=[TMDB_ID]&autoplay=0` (hoặc thay bằng `imdb=[IMDB_ID]`).
  - *Đối với phim bộ (TV Show / Series):* Thuật toán sẽ duyệt qua danh sách tập phim OPhim để trích xuất số tập tương ứng (ví dụ: tập "Tập 5" -> chỉ số tập 5). Đường dẫn nhúng tập phim được tạo theo cú pháp:
    `https://vidsrc-embed.ru/embed/tv?tmdb=[TMDB_ID]&season=1&episode=[EPISODE_NUMBER]&autoplay=0&autonext=1`.
- **Cơ chế phát:** Vidsrc không cung cấp link direct `.m3u8` công khai nên nguồn phim này **luôn luôn được nhúng dưới dạng Iframe**.

#### 2.1.3. Thuật toán Lựa chọn Trình phát Đúng (Adaptive Player Algorithm)
Để đảm bảo phim phát thành công, không bị lỗi màn hình đen hay chặn nội dung trên các nền tảng khác nhau, hàm xử lý trong `app/watch/[slug]/page.tsx` áp dụng thuật toán sau:

```
[Khởi chạy WatchPage]
       │
       ├─► 1. Đọc User-Agent: Xác định có phải thiết bị di động (mobileUA) không?
       ├─► 2. Phân tích tham số URL: Đọc nguồn phát (?server=), số tập (?ep=), và yêu cầu người chơi (?player=)
       ├─► 3. Tìm thông tin tập phim: Lấy linkEmbed (Vidsrc/Ophim) và linkM3u8 (chỉ có ở Ophim)
       │
       ▼
[Thuật toán quyết định nhúng Iframe hay HLS]
  Đặt biến useEmbedPlayer = có linkEmbed VÀ (yêu cầu ép nhúng OR (đang ở di động VÀ không bắt buộc HLS))
       │
       ├─► THẾ 1: useEmbedPlayer == FALSE và có linkM3u8 (HLS segment chunks)
       │    └─► Chạy HlsVideo (Artplayer + Hls.js) -> Phát trực tiếp HLS chunks.
       │        Ưu điểm: Tự quản lý UI, không quảng cáo, cho phép nạp phụ đề cục bộ srt/vtt/ass.
       │
       ├─► THẾ 2: useEmbedPlayer == TRUE hoặc không có linkM3u8 nhưng có linkEmbed
       │    └─► Nhúng Iframe qua hàm resolveEmbedUrl()
       │        Thuật toán resolveEmbedUrl():
       │          - Kiểm tra host nhúng (nhóm vidsrc).
       │          - Nếu là mobileUA: Tự động đổi hostname sang máy chủ tối ưu di động `vsrc.su` (hoặc cấu hình tùy chỉnh) và ép tham số `autoplay=0` để tránh bị hệ điều hành di động chặn iframe.
       │          - Nếu có chỉ định gương phụ (?mirror=): Đổi hostname sang host gương tương ứng (ví dụ: `vidsrc-embed.su`, `vidsrcme.su`).
       │
       └─► THẾ 3: Không có cả linkM3u8 lẫn linkEmbed
            └─► Hiển thị thông báo: "Không có link xem cho tập này."
```

---

### 2.2. Tính năng Phân nhóm Trang (Pagination Chunking)
Để đảm bảo khả năng duyệt danh sách phim lớn (lên tới hàng trăm trang) mà không làm tràn giao diện điều hướng, dự án áp dụng tính năng **phân nhóm trang (pagination chunking)**:
- Hằng số định nghĩa kích thước nhóm trang: `PAGE_GROUP_SIZE = 10`.
- Hàm `paginationPages(currentPage, totalPages)` sẽ thực hiện chia toàn bộ danh sách trang thành các "chunks" 10 trang một:
  - *Ví dụ:* Nếu người dùng đang ở trang 12, hệ thống tự động tính toán nhóm trang hiện tại bắt đầu từ trang 11 đến trang 20.
  - Người dùng có thể dễ dàng chuyển nhanh giữa các trang trong cùng một nhóm thông qua các nút số trang, hoặc di chuyển sang nhóm trang trước/sau thông qua nút "Trang trước" / "Trang sau".

---

### 2.3. Hệ thống Cache Tối ưu Hiệu năng (`lib/cache.ts`)
Nhằm giảm tải cho API của bên thứ ba và tăng tốc độ tải trang, dự án triển khai hệ thống lưu trữ đệm 2 lớp mạnh mẽ:
- **Lưu trữ đệm trên ổ cứng (Filesystem Cache):**
  - Lưu trữ metadata JSON và ảnh nhị phân trực tiếp trên thư mục cache (được mount qua Docker volume để lưu trữ lâu dài).
  - Phân chia thời gian sống (TTL) khoa học:
    - Danh sách phim lẻ/phim bộ/hoạt hình: Cache 5 phút.
    - Tìm kiếm phim: Cache 30 phút.
    - Chi tiết phim, danh mục thể loại, quốc gia, ảnh: Cache 15 ngày.
- **Cơ chế Prune Cache tự động:**
  - Khới tạo giới hạn dung lượng cache tối đa (mặc định 2 GB).
  - Khi vượt quá 90% dung lượng tối đa, hệ thống tự động dọn dẹp các tập tin hết hạn trước, sau đó xóa bớt các file cũ nhất dựa trên thời gian truy cập gần nhất (thuật toán LRU).
- **Bộ đệm hình ảnh 2 lớp & Chuyển đổi WebP (`app/api/image/route.ts`):**
  - **Lớp 1 (In-Memory Cache):** Sử dụng cấu trúc Map trong bộ nhớ lưu trữ tối đa 150 hình ảnh kích thước nhỏ (dưới 200 KB) để phục vụ siêu nhanh các hình ảnh có lượng truy cập cực lớn.
  - **Lớp 2 (Filesystem Cache):** Nếu không có trong RAM sẽ đọc từ đĩa.
  - **Sharp Image Optimizer:** Tải ảnh từ CDN gốc của OPhim về máy chủ, tự động xoay đúng chiều, thu nhỏ kích thước về giới hạn (mặc định chiều ngang tối đa 720px) và chuyển đổi sang định dạng **WebP** với chất lượng nén tối ưu (mặc định 70-76) giúp tiết kiệm băng thông tối đa cho client.

---

### 2.4. Dịch vụ Làm nóng Cache Chủ động (Proactive Cache Warmer)
Hệ thống không đợi người dùng truy cập mới bắt đầu tạo cache mà sử dụng một cơ chế làm nóng tự động:
- Docker container `bluesia-cache-warmer` hoạt động song song, định kỳ gọi đến route nội bộ `/api/cache/warmup`.
- Route này sẽ quét qua các trang danh sách phim mới nhất (mặc định quét 10 trang đầu của phim bộ và phim lẻ).
- Tải trước thông tin phim, sinh sẵn ảnh đại diện cho **7 phiên bản kích thước khác nhau** tương ứng với kích thước hiển thị trên giao diện điện thoại và máy tính, đồng thời gọi tĩnh để Next.js dựng sẵn nội dung HTML tĩnh.
- Cơ chế bảo mật: Chỉ cho phép các kết nối nội bộ hoặc kết nối mang token bảo mật `BLUESIA_CACHE_WARMUP_TOKEN` thực thi warmup.

---

### 2.5. Đề xuất Cá nhân hóa "Smart Spotlight" & Re-rank
Nổi bật ở giao diện trang chủ là thanh trượt trình chiếu Hero Banner được vận hành bởi thuật toán thông minh:
- **Thuật toán Smart Spotlight gốc (`lib/spotlight.ts`):**
  - Chấm điểm từng phim để lựa chọn ra các phim tiêu biểu dựa trên: Điểm đánh giá (IMDB/TMDB), độ mới (năm phát hành), nguồn gốc (phim chiếu rạp được ưu tiên), định dạng (4K, HD, Vietsub, thuyết minh) và độ nhiễu ổn định (stable noise) để tạo sự đa dạng hàng ngày.
- **Tái xếp hạng theo thói quen người dùng (Re-ranking):**
  - Trình duyệt đọc lịch sử xem (tối đa 80 phim gần nhất) và danh sách yêu thích (tối đa 60 phim) lưu trữ cục bộ.
  - Phân tích và tính trọng số cho các thể loại (category), quốc gia (country) và loại hình phim (phim bộ/phim lẻ) mà người dùng ưa thích nhất.
  - Cộng điểm đề xuất cho các phim tương thích với thói quen, trừ điểm các phim đã xem nhưng không lưu yêu thích để hiển thị banner được cá nhân hóa hoàn toàn cho từng cá nhân (giao diện hiển thị nhãn *"Dành cho bạn"* thay vì *"Smart Spotlight"*).

---

### 2.6. Thư viện Cá nhân Không cần Tài khoản (Local Library)
Người dùng có thể quản lý kho lưu trữ của mình một cách riêng tư và bảo mật:
- **Yêu thích (Favorites) & Lịch sử xem (History):**
  - Lưu trữ trực tiếp trên LocalStorage của trình duyệt (`film.bluesia.net:favorites`, `film.bluesia.net:history`) và có cơ chế tương thích ngược với các khóa lưu trữ cũ (`bluesia:*`).
  - Lịch sử xem được ghi nhận tự động ngay khi người dùng truy cập trang phát phim (`/watch/[slug]`).
- **Giao diện Đồng bộ Tức thời (Reactive Syncing):**
  - Phát các sự kiện tùy chỉnh (`film.bluesia.net:local-movies-updated` và sự kiện legacy) mỗi khi có thay đổi dữ liệu yêu thích hoặc lịch sử. Các thành phần giao diện khác (như Hero Slider, danh sách yêu thích) sẽ lắng nghe sự kiện này để cập nhật trạng thái ngay lập tức mà không cần tải lại trang.
- **Hoàn toàn ẩn danh:** Không yêu cầu đăng nhập, không lưu trữ thông tin trên máy chủ để tối đa hóa quyền riêng tư của người dùng.

---

### 2.7. Tìm kiếm Đề xuất Trực tiếp (Search Autocomplete)
Hộp tìm kiếm ở TopBar tích hợp gợi ý thời gian thực:
- Nhận diện sự kiện gõ từ khóa từ ký tự thứ 2 trở đi, trì hoãn 280ms (debounce) trước khi gửi yêu cầu tìm kiếm lên proxy `/api/ophim/search`.
- Hiển thị bảng gợi ý nhanh tối đa 6 phim phù hợp gồm: Ảnh bìa, tên tiếng Việt, tên gốc tiếng Anh, năm sản xuất, trạng thái số tập và chất lượng phim.

---

### 2.8. Giao diện Tối ưu hóa Trải nghiệm Di động
- Layout giới hạn chiều rộng tối đa ở mức `720px` tạo cảm giác giống như một ứng dụng Native trên điện thoại di động.
- Thanh điều hướng BottomNav đặt cố định ở góc dưới cùng, có tính toán thêm khoảng đệm an toàn `safe-area-inset-bottom` của hệ điều hành iOS/Android để nút bấm không bị che khuất hoặc khó chạm.
- Tận dụng cơ chế preload trong thẻ `<link rel="preload" as="image">` để tải trước hình ảnh chất lượng cao của slide Banner đầu tiên trên Home, giúp chỉ số LCP đạt mức tối ưu.
- Các ảnh nhỏ hiển thị dạng lưới sử dụng component `LazyImage` tự dựng kết hợp thẻ `<picture>` giúp giảm tải băng thông và tránh hiện tượng giật màn hình (layout shift) khi cuộn.
