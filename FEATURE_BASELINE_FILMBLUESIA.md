# FilmBluesia - Baseline tính năng và tiêu chí không hồi quy

## Mục đích

Tài liệu này là danh sách tính năng cần được chủ sở hữu duyệt và là hợp đồng kiểm tra hồi quy cho các lần chỉnh sửa codebase sau này.

- Sản phẩm: **Bluesia Cinema / film.bluesia.net**
- Phiên bản được khảo sát: `5.0.2`
- Ngày đối chiếu mã nguồn: `2026-05-25`
- Trạng thái phê duyệt: **Đã duyệt ngày 2026-05-25**
- Phạm vi: hành vi đang được triển khai trong repository, không phải danh sách ý tưởng tương lai.

## Quy tắc bảo toàn tính năng

1. Mọi thay đổi làm mất, đổi hành vi, giảm khả năng sử dụng hoặc giảm bảo vệ vận hành của một mục `F-*` bên dưới phải được phê duyệt trước.
2. Khi sửa code liên quan, người thực hiện phải kiểm tra lại các tiêu chí nghiệm thu của tính năng bị ảnh hưởng.
3. Nếu chủ động thay đổi một tính năng đã duyệt, phải cập nhật tài liệu này trong cùng thay đổi code, ghi rõ hành vi mới và lý do.
4. Không xem việc build thành công là đủ; các luồng người dùng và hợp đồng API/cache/player liên quan vẫn phải được kiểm tra.
5. Các giá trị cấu hình môi trường có thể điều chỉnh khi triển khai, nhưng không được vô hiệu hóa năng lực cốt lõi mà không có phê duyệt.

## Tổng quan tính năng cần duyệt

| ID | Nhóm | Tính năng | Trạng thái duyệt |
| --- | --- | --- | --- |
| F-01 | Khám phá | Trang chủ tổng hợp và các hàng danh mục | Đã duyệt |
| F-02 | Khám phá | Smart Spotlight và cá nhân hóa hero | Đã duyệt |
| F-03 | Khám phá | Tìm kiếm đầy đủ và gợi ý tức thời | Đã duyệt |
| F-04 | Khám phá | Duyệt danh sách, lọc nhanh và phân trang | Đã duyệt |
| F-05 | Nội dung | Trang chi tiết phim và SEO chia sẻ | Đã duyệt |
| F-06 | Xem phim | Danh sách tập/server và định tuyến tập ổn định | Đã duyệt |
| F-07 | Xem phim | Player HLS với điều khiển chất lượng/phụ đề | Đã duyệt |
| F-08 | Xem phim | Player nhúng Vidsrc/Vsembed và tối ưu mobile | Đã duyệt |
| F-09 | Cá nhân | Yêu thích và lịch sử cục bộ, không cần tài khoản | Đã duyệt |
| F-10 | Giao diện | Điều hướng mobile-first, PWA và tải ảnh tối ưu | Đã duyệt |
| F-11 | Dữ liệu | Proxy metadata OPhim và chuẩn hóa dữ liệu | Đã duyệt |
| F-12 | Hiệu năng | Proxy/optimizer ảnh và cache hai tầng | Đã duyệt |
| F-13 | Hiệu năng | Cache metadata, stale fallback và giới hạn dung lượng | Đã duyệt |
| F-14 | Vận hành | Warmup cache và quan sát trạng thái cache | Đã duyệt |
| F-15 | Chính sách | Cài đặt/thông tin nguồn dữ liệu và tuyên bố lưu trữ | Đã duyệt |

## Tiêu chí nghiệm thu chi tiết

### F-01 - Trang chủ tổng hợp và các hàng danh mục

**Hành vi cần giữ**

- Route `/` hiển thị thanh tìm kiếm/điều hướng trên, hero và các hàng nội dung có dữ liệu: `Phim lẻ`, `Phim bộ`, `TV Show`, `Hoạt hình`.
- Mỗi hàng cung cấp liên kết `Xem tất cả` về danh sách tương ứng và thẻ phim đi đến trang chi tiết.
- Dữ liệu trang chủ được tổng hợp đồng thời từ các nguồn mới cập nhật, phim lẻ, phim bộ, hoạt hình, TV show, chiếu rạp, phim lẻ Âu Mỹ và Hàn Quốc; lỗi một nhóm không làm sập toàn trang.

**Phải thỏa mãn**

- [ ] Trang chủ render được khi ít nhất một nhóm dữ liệu khả dụng.
- [ ] Chỉ hiển thị hàng có item, và liên kết hàng mở đúng route `/list/{type}`.
- [ ] Ảnh hero đầu tiên được preload bằng ảnh proxy responsive để bảo vệ LCP.

**Nguồn triển khai:** `app/page.tsx`, `components/SectionRow.tsx`, `lib/ophim.ts`.

### F-02 - Smart Spotlight và cá nhân hóa hero

**Hành vi cần giữ**

- Hero chọn ứng viên bằng điểm xếp hạng dựa trên nguồn danh sách, rating, năm, chất lượng/ngôn ngữ/trạng thái tập, nội dung, ảnh và nhiễu ổn định theo slug.
- Hero loại trùng phim, hiển thị tối đa 8 slide trên client, tự chuyển sau 5 giây, hỗ trợ nút, chấm chọn, phím mũi tên và thao tác vuốt.
- Khi trình duyệt có lịch sử/yêu thích, thứ hạng hero được điều chỉnh theo quốc gia, thể loại, loại phim và trạng thái đã xem/đã thích; nhãn chuyển thành `Dành cho bạn`.

**Phải thỏa mãn**

- [ ] Người chưa có dữ liệu local thấy nhãn `Smart Spotlight`; người có dữ liệu local thấy `Dành cho bạn`.
- [ ] Nút xem dẫn tới `/watch/{slug}` và nút thông tin dẫn tới `/movie/{slug}` của slide hiện tại.
- [ ] Thay đổi favorites/history cập nhật hero mà không cần reload, qua sự kiện storage hoặc sự kiện local của ứng dụng.

**Nguồn triển khai:** `lib/spotlight.ts`, `components/HeroSlider.tsx`, `app/page.tsx`.

### F-03 - Tìm kiếm đầy đủ và gợi ý tức thời

**Hành vi cần giữ**

- Top bar và trang `/search` có hộp tìm kiếm.
- Khi nhập từ 2 ký tự, client debounce 280 ms rồi gọi `/api/ophim/search` để hiển thị tối đa 6 gợi ý gồm poster, tên, tên gốc và metadata khả dụng.
- Submit mở `/search?q=...`; trang kết quả hiển thị lưới phim hoặc trạng thái không có kết quả.

**Phải thỏa mãn**

- [ ] Không gọi gợi ý với chuỗi ngắn hơn 2 ký tự.
- [ ] Request cũ được hủy khi từ khóa đổi; trạng thái loading, rỗng và lỗi không làm vỡ UI.
- [ ] Chọn gợi ý mở đúng trang `/movie/{slug}`; submit bảo toàn ký tự đặc biệt qua URL encoding.

**Nguồn triển khai:** `components/SearchSuggest.tsx`, `app/search/page.tsx`, `app/api/ophim/search/route.ts`.

### F-04 - Duyệt danh sách, lọc nhanh và phân trang

**Hành vi cần giữ**

- Route `/list/[type]` phục vụ `phim-le`, `phim-bo`, `tv-shows`, `hoat-hinh` và các loại được backend hỗ trợ.
- Lọc quốc gia nhanh `Âu Mỹ`, `Hàn Quốc` áp dụng cho phim lẻ/phim bộ/TV Show; lọc `Phim chiếu rạp` áp dụng cho phim lẻ.
- Phân trang có nút trước/sau và nhóm tối đa 10 số trang, bảo toàn bộ lọc khi chuyển trang.

**Phải thỏa mãn**

- [ ] Bộ lọc không hợp lệ bị bỏ qua; chọn/xóa bộ lọc đưa người dùng về trang 1.
- [ ] `phim-le?category=phim-chieu-rap` truy vấn danh sách chiếu rạp nhưng tiêu đề vẫn thể hiện bộ lọc.
- [ ] Nút trước/sau bị vô hiệu hóa hợp lý ở ranh giới; nhóm số trang đổi theo trang hiện tại.

**Nguồn triển khai:** `app/list/[type]/page.tsx`, `lib/ophim.ts`, `app/api/ophim/list/[type]/route.ts`.

### F-05 - Trang chi tiết phim và SEO chia sẻ

**Hành vi cần giữ**

- Route `/movie/[slug]` hiển thị ảnh nền/poster, tên, tên gốc, rating, năm, thời lượng, tình trạng tập, chất lượng, thể loại, quốc gia, mô tả và diễn viên khi có.
- Trang có nút xem, nút yêu thích/lưu lịch sử và các nút tập theo server.
- Metadata động cho title, description, Open Graph và Twitter sử dụng nội dung/ảnh của phim, có fallback an toàn khi tải dữ liệu lỗi.

**Phải thỏa mãn**

- [ ] Nút `Xem phim` chọn tập đầu tiên khi có tập; phim không có metadata tùy chọn vẫn render.
- [ ] Nút tập mang đúng `server` và khóa `ep`, không trộn tập giữa các server.
- [ ] Nội dung HTML từ upstream được hiển thị dưới dạng văn bản sạch.

**Nguồn triển khai:** `app/movie/[slug]/page.tsx`, `lib/episodes.ts`, `lib/utils.ts`.

### F-06 - Danh sách tập/server và định tuyến tập ổn định

**Hành vi cần giữ**

- Tập phim OPhim được chuẩn hóa tên/slug và hiển thị dưới server `OPhim`.
- Nếu phim có TMDB ID hoặc IMDB ID hợp lệ, ứng dụng thêm server nhúng `Vidsrc`; phim lẻ sinh tập `Full`, phim bộ sinh tập theo danh sách tập OPhim.
- Trang `/watch/[slug]` đọc `server` và `ep`, chọn fallback tập đầu khi khóa không hợp lệ và đánh dấu tập đang phát.

**Phải thỏa mãn**

- [ ] Tên tập chung chung hoặc thiếu slug vẫn tạo được liên kết phát ổn định.
- [ ] Không thêm server Vidsrc khi thiếu định danh TMDB/IMDB phù hợp.
- [ ] Chuyển server/tập thay đổi player và trạng thái active đúng dữ liệu đã chọn.

**Nguồn triển khai:** `lib/ophim.ts`, `lib/episodes.ts`, `lib/vsembed.ts`, `app/watch/[slug]/page.tsx`.

### F-07 - Player HLS với điều khiển chất lượng và phụ đề

**Hành vi cần giữ**

- Khi tập có `linkM3u8` và không ưu tiên embed, player Artplayer + Hls.js phát HLS; Safari/native HLS dùng khả năng gốc nếu Hls.js không khả dụng.
- Player HLS, Artplayer và Hls.js phải được tải động theo nhu cầu trên trang xem, không nhập vào bundle tải ban đầu của trang chủ, danh sách hoặc chi tiết phim.
- Luồng HLS phải giữ cơ chế streaming theo segment `.m3u8` với buffer có kiểm soát, không chủ động tải toàn bộ phim trước khi người dùng xem.
- Trang xem duy trì resource hint phù hợp (`preconnect`/`dns-prefetch`) cho nguồn phát và CDN ảnh đang sử dụng để giảm thời gian khởi tạo kết nối.
- Player cung cấp picture-in-picture, fullscreen, playback rate, chọn chất lượng HLS tự động/thủ công và lưu chất lượng đã chọn tại `bluesia-preferred-quality`.
- Người dùng có thể tải phụ đề cục bộ định dạng `.srt`, `.vtt`, `.ass`.

**Phải thỏa mãn**

- [ ] Desktop mặc định sử dụng HLS khi có `linkM3u8`; tham số `player=hls` giữ HLS trên mobile khi có stream.
- [ ] Bundle player HLS được code-split/lazy-load và không được tải khi người dùng chỉ mở trang chủ, trang danh sách hoặc trang chi tiết.
- [ ] Bắt đầu phát HLS chỉ kéo các segment cần cho quá trình phát/buffer hợp lý, không tải trước toàn bộ nội dung phim.
- [ ] Resource hint của trang watch phản ánh đúng các nguồn phát/CDN đang được dùng; không xóa cơ chế này khi chưa có thay thế đo được tốt hơn.
- [ ] Chuyển chất lượng cập nhật stream và được khôi phục ở lần phát kế tiếp nếu level còn hợp lệ.
- [ ] Player giải phóng instance HLS/Artplayer khi đổi tập hoặc rời trang.

**Nguồn triển khai:** `components/HlsVideo.tsx`, `app/watch/[slug]/page.tsx`.

### F-08 - Player nhúng Vidsrc/Vsembed và tối ưu mobile

**Hành vi cần giữ**

- Server bổ sung được sinh từ `VSEMBED_EMBED_BASE_URL`, mặc định `https://vsembed.ru`, dưới nhãn UI `Vidsrc`.
- Mobile ưu tiên iframe khi có embed trừ khi ép `player=hls`; desktop có thể ép iframe bằng `player=embed`.
- Host nhúng thuộc whitelist có thể đổi qua `mirror` hoặc host mobile `VSEMBED_MOBILE_EMBED_HOST` (mặc định `vsembed.su`); trên mobile ép `autoplay=0`.
- Iframe chỉ được nạp sau khi người dùng nhấn nút phát trên facade.

**Phải thỏa mãn**

- [ ] URL embed phim lẻ và phim bộ mang đúng TMDB/IMDB, season/episode và tham số autoplay.
- [ ] Chỉ hostname được cho phép mới được thay bởi mirror/mobile host; link embed bên ngoài không bị sửa tùy ý.
- [ ] Khi facade chưa được bấm phát, trình duyệt không tạo request tải iframe hoặc nội dung video từ nguồn embed.
- [ ] Không có HLS lẫn embed thì hiển thị thông báo không có link xem, không render player lỗi.

**Nguồn triển khai:** `lib/vsembed.ts`, `app/watch/[slug]/page.tsx`, `components/IframePlayerFacade.tsx`.

### F-09 - Yêu thích và lịch sử cục bộ, không cần tài khoản

**Hành vi cần giữ**

- Favorites lưu tại `film.bluesia.net:favorites`, history lưu tại `film.bluesia.net:history`; đọc tương thích khóa cũ `bluesia:*`.
- Người dùng thêm/bỏ yêu thích trên trang chi tiết, lưu lịch sử thủ công, và history tự ghi nhận khi mở trang xem.
- `/favorites` và `/history` hiển thị lưới nội dung đã lưu hoặc empty state; dữ liệu chỉ ở trình duyệt.
- Mỗi danh sách lưu tối đa 100 mục, mục mới nhất đứng trước và không trùng slug.

**Phải thỏa mãn**

- [ ] Không yêu cầu đăng nhập hay gửi favorites/history lên máy chủ.
- [ ] Mở trang watch tự đưa phim lên đầu history; thêm lại không tạo bản sao.
- [ ] Thay đổi local library phát sự kiện cập nhật để thành phần liên quan phản ứng ngay.

**Nguồn triển khai:** `components/LocalMovieActions.tsx`, `components/WatchRecorder.tsx`, `components/StoredMovieGrid.tsx`, `app/favorites/page.tsx`, `app/history/page.tsx`.

### F-10 - Điều hướng mobile-first, PWA và tải ảnh tối ưu

**Hành vi cần giữ**

- Bố cục chính tối đa `720px`, dark theme và thanh điều hướng dưới cố định gồm Trang chủ, Phim lẻ, Phim bộ, TV Show, Hoạt hình, Cài đặt; thanh dưới tôn trọng safe area.
- Manifest PWA khai báo tên, biểu tượng, màu theme và chế độ standalone.
- Thẻ phim dùng ảnh responsive qua image proxy; ảnh ngoài vùng nội dung ưu tiên phải trì hoãn tải bằng native lazy loading hoặc `IntersectionObserver` với khoảng đệm tải trước hợp lý.
- Chất lượng ảnh responsive duy trì hai tier đã duyệt: mobile dưới `640px` dùng biến thể nhẹ hơn, còn viewport từ `640px` trở lên dùng biến thể chi tiết hơn; không yêu cầu tách riêng tier tablet.
- Chỉ ảnh LCP được xác định trên từng trang (ví dụ hero đầu trang chủ hoặc ảnh dẫn đầu của trang hiện tại) được preload hoặc đặt ưu tiên tải cao; không áp dụng ưu tiên cao hàng loạt.

**Phải thỏa mãn**

- [ ] Điều hướng active thể hiện đúng route hiện tại và vẫn bấm được trên viewport hẹp.
- [ ] Manifest và icon vẫn được phục vụ từ public assets.
- [ ] Ảnh hero/card giữ alt text, kích thước/aspect ổn định, `srcSet` responsive và proxy resize.
- [ ] Ảnh ngoài vùng nội dung ưu tiên không được request trước khi tiến gần viewport; ảnh không phải LCP không được preload hoặc gán ưu tiên cao không cần thiết.

**Nguồn triển khai:** `app/layout.tsx`, `components/BottomNav.tsx`, `components/MovieCard.tsx`, `components/LazyImage.tsx`, `public/manifest.webmanifest`.

### F-11 - Proxy metadata OPhim và chuẩn hóa dữ liệu

**Hành vi cần giữ**

- Metadata dùng upstream `OPHIM_BASE_URL`, mặc định `https://ophim1.com`; ứng dụng cung cấp API nội bộ cho home, list, search, movie, categories và countries.
- Dữ liệu upstream được chuẩn hóa thành card/detail, sửa URL ảnh OPhim khi cần, lọc item thiếu slug, và hỗ trợ fallback endpoint cho danh sách phim mới cập nhật.
- Route API trả cache headers phù hợp để client/CDN tái sử dụng metadata.

**Phải thỏa mãn**

- [ ] UI lấy được danh sách, tìm kiếm, chi tiết và tập qua lớp nội bộ mà không cần client gọi trực tiếp upstream.
- [ ] Payload upstream có biến thể field phổ biến vẫn được chuẩn hóa thành dữ liệu có thể render.
- [ ] Khi upstream thất bại nhưng cache cũ tồn tại, metadata cũ được dùng làm fallback thay vì làm sập luồng.

**Nguồn triển khai:** `lib/ophim.ts`, `app/api/ophim/**/route.ts`, `app/settings/page.tsx`.

### F-12 - Proxy/optimizer ảnh và cache hai tầng

**Hành vi cần giữ**

- `/api/image?url=...&w=...&q=...` kiểm tra URL HTTP(S), thử nguồn ảnh gốc và fallback OPhim, resize theo giới hạn và chuyển các định dạng phù hợp sang WebP bằng Sharp.
- Ảnh được cache trên filesystem và cache LRU trong RAM cho tối đa 150 ảnh nhỏ hơn hoặc bằng 200 KB; response hỗ trợ `ETag`/`304`.
- Response ảnh phát cache headers CDN/browser và các header chẩn đoán `X-Film-Bluesia-Net-*`.

**Phải thỏa mãn**

- [ ] URL không hợp lệ bị trả `400`; lỗi upstream không trả dữ liệu giả.
- [ ] Tham số quality bị giới hạn `40..95`, width không vượt giới hạn cấu hình; GIF/SVG không bị chuyển đổi phá định dạng.
- [ ] Cache hit từ memory/filesystem và revalidation bằng ETag vẫn trả đúng content type/body.

**Nguồn triển khai:** `app/api/image/route.ts`, `lib/cache.ts`, `lib/utils.ts`.

### F-13 - Cache metadata, stale fallback và giới hạn dung lượng

**Hành vi cần giữ**

- Cache filesystem phân namespace cho ảnh, danh sách metadata, tìm kiếm, chi tiết và taxonomy.
- TTL mặc định trong mã: ảnh/chi tiết/taxonomy 15 ngày, list 5 phút, search 30 phút; deployment được override qua biến môi trường, hiện `compose.yaml` đặt list là 30 phút.
- Giới hạn mặc định là 2 GiB; prune chạy theo chu kỳ tối đa mỗi 10 phút, xóa mục hết hạn rồi xóa mục cũ cho đến khi còn tối đa 90% giới hạn.

**Phải thỏa mãn**

- [ ] Key cache được hash và namespace được làm sạch trước khi tạo đường dẫn.
- [ ] Không dùng dữ liệu hết hạn trong đường dẫn bình thường; chỉ cho phép stale metadata khi upstream request lỗi.
- [ ] Điều chỉnh TTL/dung lượng qua biến môi trường vẫn được phản ánh trong thống kê cache.

**Nguồn triển khai:** `lib/cache.ts`, `lib/ophim.ts`, `compose.yaml`.

### F-14 - Warmup cache và quan sát trạng thái cache

**Hành vi cần giữ**

- `/api/cache/warmup` làm nóng danh sách mặc định `phim-le,phim-bo`, ảnh với 7 biến thể khớp UI, HTML list, và trang chi tiết/watch cho phim đầu trang 1.
- Warmup chỉ chấp nhận request từ host nội bộ được cho phép hoặc request có token `BLUESIA_CACHE_WARMUP_TOKEN` hợp lệ.
- Docker Compose chạy service ứng dụng và service warmer định kỳ 1800 giây; `/api/cache/status` trả thống kê và không cache response.

**Phải thỏa mãn**

- [ ] Request warmup không được phép trả `403`.
- [ ] Response warmup báo số request/lỗi/cache hit/thời lượng và thống kê cache sau khi chạy.
- [ ] Warmer không làm ứng dụng không thể khởi động; healthcheck ứng dụng là điều kiện chạy warmer.

**Nguồn triển khai:** `app/api/cache/warmup/route.ts`, `app/api/cache/status/route.ts`, `compose.yaml`.

### F-15 - Cài đặt, thông tin nguồn dữ liệu và tuyên bố lưu trữ

**Hành vi cần giữ**

- Trang `/settings` thông báo ứng dụng truy cập không cần đăng nhập, hiển thị nguồn API metadata hiện hành và cho biết metadata đi qua `/api/ophim/*`.
- Trang nêu rõ ứng dụng không proxy/lưu trữ/phân phối tệp video trên server riêng và nội dung đến từ nguồn bên thứ ba.

**Phải thỏa mãn**

- [ ] Nội dung cài đặt không tuyên bố có tài khoản hoặc tính năng lưu server khi code không triển khai các tính năng đó.
- [ ] Khi kiến trúc nguồn dữ liệu hoặc luồng video thay đổi, phần thông tin này và baseline phải được cập nhật cùng thay đổi.

**Nguồn triển khai:** `app/settings/page.tsx`, `README.md`.

## Bề mặt route/API cần được giữ hoặc phê duyệt khi thay đổi

| Bề mặt | Vai trò bắt buộc |
| --- | --- |
| `/` | Trang chủ, hero và hàng nội dung |
| `/list/[type]` | Danh sách, lọc và phân trang |
| `/search?q=` | Tìm kiếm toàn trang |
| `/movie/[slug]` | Chi tiết phim và lựa chọn tập |
| `/watch/[slug]?server=&ep=&player=&mirror=` | Trang xem và lựa chọn player/server/tập |
| `/favorites`, `/history` | Thư viện local |
| `/settings` | Thông tin triển khai/chính sách |
| `/api/ophim/home` | Dữ liệu trang chủ chuẩn hóa |
| `/api/ophim/list/[type]` | Danh sách chuẩn hóa |
| `/api/ophim/search` | Tìm kiếm/gợi ý |
| `/api/ophim/movie/[slug]` | Chi tiết/tập phim chuẩn hóa |
| `/api/ophim/categories`, `/api/ophim/countries` | Taxonomy proxy |
| `/api/image` | Proxy, tối ưu và cache ảnh |
| `/api/cache/status` | Quan sát cache |
| `/api/cache/warmup` | Làm nóng cache có kiểm soát |

## Cấu hình có ý nghĩa tính năng

| Biến môi trường | Ảnh hưởng |
| --- | --- |
| `OPHIM_BASE_URL` | Nguồn metadata upstream |
| `NEXT_PUBLIC_SITE_URL` | Base URL metadata/SEO |
| `VSEMBED_EMBED_BASE_URL` | Nguồn server nhúng bổ sung |
| `VSEMBED_MOBILE_EMBED_HOST` | Host nhúng ưu tiên trên thiết bị mobile |
| `BLUESIA_CACHE_DIR`, `FILM_BLUESIA_NET_CACHE_DIR` | Vị trí cache bền vững |
| `BLUESIA_CACHE_MAX_BYTES`, `FILM_BLUESIA_NET_CACHE_MAX_BYTES` | Giới hạn dung lượng cache |
| `BLUESIA_IMAGE_CACHE_TTL_SECONDS`, `BLUESIA_DETAIL_CACHE_TTL_SECONDS`, `BLUESIA_TAXONOMY_CACHE_TTL_SECONDS`, `BLUESIA_LIST_CACHE_TTL_SECONDS`, `BLUESIA_SEARCH_CACHE_TTL_SECONDS` | TTL của các nhóm dữ liệu |
| `BLUESIA_IMAGE_WEBP_QUALITY`, `BLUESIA_IMAGE_MAX_WIDTH` | Chất lượng/kích thước ảnh proxy |
| `BLUESIA_CACHE_WARMUP_TOKEN` | Quyền gọi warmup từ bên ngoài mạng nội bộ |
| `BLUESIA_CACHE_WARMUP_*` | Phạm vi và độ đồng thời warmup |

## Checklist bắt buộc trước khi nhận thay đổi code

### Kiểm tra chức năng người dùng

- [ ] Trang chủ tải được, hero điều hướng/xoay/vuốt được và các section dẫn đúng nơi.
- [ ] Tìm kiếm gợi ý và trang kết quả hoạt động với từ khóa có dấu và không có kết quả.
- [ ] List lọc, phân trang và giữ filter đúng.
- [ ] Chi tiết phim render đầy đủ và liên kết xem/tập đúng.
- [ ] Watch phát được ít nhất một luồng HLS và một luồng embed khả dụng; chuyển tập/server hoạt động.
- [ ] Favorites/history tồn tại sau refresh và không cần đăng nhập.
- [ ] Giao diện hoạt động ở viewport mobile và desktop trong khung ứng dụng.

### Kiểm tra hợp đồng kỹ thuật

- [ ] Các API OPhim trả JSON chuẩn hóa và xử lý lỗi hợp lý.
- [ ] Image proxy trả WebP/ảnh gốc phù hợp, cache header và ETag đúng.
- [ ] Cache status/warmup giữ điều kiện bảo vệ truy cập.
- [ ] Metadata SEO và PWA manifest/icon vẫn khả dụng.
- [ ] Build/phân tích tải trang xác nhận chunk của Artplayer/Hls.js không tải ở trang chủ, danh sách hoặc chi tiết phim trước khi vào luồng cần player HLS.
- [ ] Trên trang watch dùng embed, không có request iframe/video embed trước thao tác bấm phát.
- [ ] Ảnh ngoài vùng nhìn không phát request trước khi đi vào ngưỡng lazy-load được quy định.
- [ ] Trên luồng HLS, network chỉ tải manifest/segment phục vụ phát và buffer hợp lý, không tải toàn bộ phim ngay khi mở player.
- [ ] Trang watch vẫn khai báo resource hints cần thiết cho nguồn phát/CDN hiện hành hoặc có bằng chứng đo lường cho phương án thay thế.
- [ ] `npm run build` hoàn tất trước khi phát hành.

## Nhật ký duyệt

| Ngày | Người duyệt | Kết quả | Ghi chú |
| --- | --- | --- | --- |
| 2026-05-25 | Chủ sở hữu sản phẩm | Đã duyệt | Phê duyệt toàn bộ baseline `F-01` đến `F-15` theo xác nhận trong hội thoại. |
| 2026-05-25 | Chủ sở hữu sản phẩm | Đã duyệt | Phê duyệt đề xuất tối ưu tải trang/phim 1-6: quản lý baseline trong Git, code splitting player, lazy load/ưu tiên ảnh, trì hoãn iframe, resource hints và kiểm tra hồi quy hiệu năng. |
| 2026-05-25 | Chủ sở hữu sản phẩm | Đã duyệt | Giảm giới hạn cache mặc định và cấu hình Docker từ 8 GiB xuống 2 GiB. |
| 2026-05-25 | Chủ sở hữu sản phẩm | Đã duyệt | Giữ thiết kế chất lượng ảnh responsive hiện tại theo hai tier mobile và `>=640px`; không bổ sung tier tablet. |
| 2026-05-25 | Chủ sở hữu sản phẩm | Đã duyệt | Khắc phục route tìm kiếm cho Next.js 16, chuyển lint sang ESLint CLI và giới hạn Turbopack tracing đối với thư mục cache runtime. |
