# Sổ nợ kỹ thuật

Nợ không ghi ra là nợ sẽ quên. Mỗi dòng gồm: nợ gì, **nó cắn vào lúc nào**, và trả bằng cách nào.
Cột giữa là cột quan trọng — một khoản nợ chưa bao giờ cắn thì chưa cần trả.

Cập nhật lần cuối: 20/09/2026.

## Chặn việc bán thật

| # | Nợ | Cắn khi | Trả bằng cách |
|---|---|---|---|
| 1 | **24 mục còn cờ `placeholder`** — tên và mô tả 5 mùi, giá, thông số, tồn kho, liên hệ | Ngay khi có người thật vào xem | Chủ shop gửi nội dung → điền vào `data/shop.json` → hạ cờ. Dải cảnh báo cam tự tắt. |
| 2 | **Chưa có số tài khoản** nên VietQR chưa bật | Ngay khi muốn nhận chuyển khoản | Điền `payment.methods[bank].bank` (tên NH, mã BIN 6 số, số TK, chủ TK) rồi đặt `ready: true`. Cổng kiểm định dạng. |
| 3 | **Form nhận hàng không gửi đi đâu** — chỉ chảy vào nội dung đơn để sao chép | Khi khách tưởng bấm xong là shop đã nhận đơn | Một hàm serverless, hoặc dịch vụ form (Formspree/Basin). Xem [adr/0001](adr/0001-trang-tinh.md). |
| 4 | **Chưa có trang cảm ơn** sau khi đặt | Cùng lúc với #3 | Đi kèm #3. |
| 5 | **Chưa rõ nghĩa vụ pháp lý** với Bộ Công Thương sau 01/07/2026 | Trước khi mở bán trên tên miền riêng | **Hỏi luật sư.** Hai nguồn luật nói ngược nhau; phạt 10–20 triệu rơi vào chủ shop. Xem [03-DOI-THU-VA-TICH-HOP.md](03-DOI-THU-VA-TICH-HOP.md). |

## Sẽ cắn khi lớn hơn

| # | Nợ | Cắn khi | Trả bằng cách |
|---|---|---|---|
| 6 | **`g` trong giỏ hàng chưa có số phiên bản** — đổi cấu trúc hộp quà làm hỏng giỏ đang lưu ở máy khách | Lần đầu đổi schema hộp quà sau khi có khách thật | Thêm `v: 1` vào `g`, và bỏ qua dòng nào có `v` lạ lúc nạp. Rẻ, nên làm sớm. |
| 7 | **`shop.css` / `shop.js` chưa gắn hash vào tên** | Sau mỗi lần deploy, khách cũ dùng bản cache tới ~10 phút | Thêm một bước build gắn hash. Chỉ đáng khi tần suất sửa tăng. |
| 8 | **Mã VietQR gọi ảnh từ `img.vietqr.io`** (dịch vụ ngoài) | Nếu dịch vụ ấy chết hoặc đổi giá | Sinh QR ngay trong trình duyệt. Chuẩn VietQR là chuẩn mở của NAPAS nên làm được. Hiện chỉ đẩy số tiền và mã đơn, **không** đẩy tên/số điện thoại/địa chỉ khách. |
| 9 | **Một mùi có hai sản phẩm thì hộp quà lặng lẽ lấy cái đầu** | Khi thêm sản phẩm thứ hai cho cùng một mùi | Cho `gift` chỉ định sản phẩm, hoặc cho khách chọn. Cổng đang cảnh báo ở mức XEM. |
| 9b | **Mức giảm 8% và 14% của hộp quà là số dựng tạm** | Ngay khi biết giá vốn một cây nến | Ở giá vốn cao, khoản giảm 8% (48.000₫ mỗi hộp đôi) có thể ăn sạch phần doanh thu tăng thêm. Quyết lại sau khi biết `V` — xem [01-BOI-CANH-VA-CO-HOI.md](01-BOI-CANH-VA-CO-HOI.md) đòn bẩy 2. |
| 10 | **Trọng số Tìm mùi do người đặt, chưa học từ dữ liệu** | Khi có đủ lượt làm quiz thật và biết khách mua gì sau đó | Xem [adr/0002](adr/0002-cham-diem-tim-mui.md). **Chưa có dữ liệu thì đừng đụng vào.** |

## Chưa làm, và biết là chưa làm

| # | Nợ | Ghi chú |
|---|---|---|
| 10b | **Sự kiện đo đạc chỉ nằm trong máy khách, chưa gộp được** | Ngay khi muốn biết khách THẬT rụng ở đâu | `SINK` trong `assets/shop.js` đang là `null`. Đổi thành URL là phần trang xong; còn phải dựng một hàm serverless nhận và một trang nói rõ thu thập gì. Đi cùng nợ #3. |
| 11 | Chưa đo hiệu năng (Lighthouse) | Trang nhiều animation và SVG, đáng đo trước khi đẩy quảng cáo vào. |
| 12 | Chưa kiểm với trình đọc màn hình | Có `aria-label`, có bẫy tiêu điểm, có `prefers-reduced-motion` — nhưng **chưa ai thật sự nghe thử**. |
| 13 | Chưa có ảnh OG khi chia sẻ link | Link dán lên Facebook/Zalo hiện ra trơ trụi. Rẻ, đáng làm trước khi chạy quảng cáo. |
| 14 | Chưa nối tên miền | Đang chạy dưới đường dẫn `/shop/` của GitHub Pages. |
| 15 | Chưa có ảnh chụp thật của nến | Đang vẽ bằng SVG từ ba màu của mùi. Đồng bộ và không bao giờ vỡ ảnh, nhưng ảnh thật bán tốt hơn. |
| 16 | Trang `pitch/` và `measure/` không nằm trong cổng shell | Cố ý — nó không phải trang cửa hàng. Nhưng cũng nghĩa là **không cổng nào soi nó**; sửa thì phải tự mở xem. |

## Nợ đã trả trong phiên 20/09/2026

Giữ lại để phiên sau biết lớp lỗi nào từng xảy ra ở đây.

| Lỗi | Tìm ra bằng cách | Đã làm gì |
|---|---|---|
| `renderFinder()`/`renderGift()` móc nhầm vào cuối `renderCart()` thay vì `boot()` → hộp quà bị trả về mặc định sau **mỗi** lần giỏ đổi, và mỗi lần lại gắn thêm một listener bàn phím | Chạy thật: bấm "thêm hộp" 8 lần ra 2 dòng giỏ khác nhau | Chuyển vào `boot()`. Nguyên nhân gốc: neo tìm-thay vào một dòng có ở **hai** hàm. |
| Trần tồn kho hộp quà không được tôn trọng — bấm 8 lần vào hộp chỉ gói được 6 thì cả 8 lần đều báo "đã thêm" | Đo `localStorage` sau mỗi lần bấm | Cùng nguyên nhân với lỗi trên. Sau khi sửa: 6 lần thành công, lần 7–8 báo "Chỉ gói được 6 hộp như vậy". |
| Icon ligature hiện thành chữ thô khi font Google bị chặn | Chụp màn hình thật | Ẩn cho tới khi font về — [adr/0005](adr/0005-an-icon-cho-toi-khi-font-ve.md). |
| Câu hỏi Tìm mùi xuống 4 dòng, nửa phải màn hình trống trơn | Chụp màn hình ở 1280px | Căn giữa khối câu hỏi, hạ cỡ chữ từ 55px xuống 46px. |
| Bản đề xuất cộng "phí sàn giữ lại" (tiền thật) với "doanh thu hộp quà" (chưa trừ giá vốn) thành một con số lãi | Tự soát lại phép tính | Tách làm hai khối, kèm một đoạn giải thích vì sao không cộng được. |
| **Tài liệu bảo "đo bằng gì / bỏ khi nào" nhưng sản phẩm không đếm gì cả** — mọi tiêu chí bỏ tính năng trong lộ trình đều không chạy được | Tự soát lại thứ đã giao | Thêm `track()` và 12 sự kiện, cộng trang `measure/` đọc phễu. Đo lại: bỏ quiz giữa chừng ở câu 3 thì phễu hiện đúng rụng −50% ở bậc đó. |
| `smoke.js` không tìm thấy Chromium trên CI — `playwright install chromium` chỉ tải `chromium_headless_shell-<rev>/…/headless_shell`, hàm dò chỉ nhận `chromium-<rev>/…/chrome` | CI đỏ ngay lần chạy đầu tiên | Nhận cả hai dạng thư mục và sáu đường dẫn binary. Thử lại bằng cách dựng một thư mục chỉ có headless shell: 12/12 qua. |
| Comment trong `smoke.js` chứa một đường dẫn có dấu sao ghép thành `*/`, đóng block comment sớm; node báo SyntaxError cách đó 30 dòng | `node --check` ngay sau khi sửa | Viết lại câu ấy. **Bài học: đừng đặt glob dạng `thư-mục-*/file` trong block comment JS.** |
| **`shop/docs/` đang được publish công khai** — `04-DAM-PHAN.md` (kịch bản đàm phán với một người có thật, gồm mục "dấu hiệu nên rút") trả HTTP 200 trên GitHub Pages | Review cuối phiên: `curl` thẳng vào URL đoán được | Loại trừ `shop/docs` và `shop/*.md` khỏi rsync của `deploy.yml`, **cộng một cổng** bắt lỗi nếu hai dòng loại trừ đó biến mất. `shop/pitch/` cố ý vẫn công khai — trang đó viết cho chị ấy. |
| Tiêu điểm bàn phím rơi về `<body>` sau **mỗi** câu trả lời ở Tìm mùi, và sau mỗi lần bấm ở Hộp quà — người dùng bàn phím phải Tab lại từ đầu trang | Đi hết một lượt bằng bàn phím rồi đọc `document.activeElement` | Tìm mùi dời tiêu điểm sang tiêu đề câu mới; Hộp quà nhớ nút đang giữ tiêu điểm bằng bộ `data-*` rồi trả lại sau khi vẽ. |
| `aria-live="polite"` phủ cả khối 726 ký tự ở Tìm mùi — trình đọc màn hình đọc lại toàn bộ mỗi lần đổi câu | Cùng lượt đo trên | Bỏ `aria-live`; dời tiêu điểm là đủ để trình đọc đọc đúng câu hỏi mới. |
| Bản đề xuất ghi "[đã kiểm]" cho phí Shopee, trong khi nguồn là bản tin ngành chứ không phải trang chính thức của Shopee | Đối chiếu lại với bản nghiên cứu | Đổi nhãn thành "[nguồn ngành]" và thêm một đoạn nói thẳng là đừng tin, hãy mở Seller Centre đối chiếu. |
| **Bản đề xuất lập luận trên giá 300.000 ₫, cửa hàng mẫu bán 100.000 ₫** — mà `pitch/` chính là thứ được dặn mở ra trước rồi bấm sang cửa hàng | Review cuối: đối chiếu `data/shop.json` với thanh trượt mặc định ở `pitch/index.html` | Đưa giá mẫu về 300.000 ₫ — con số thật **duy nhất** biết về shop này. Kéo theo: ngưỡng miễn phí ship 500.000 ₫ giờ bằng 2 cây (trước là 5), hộp đôi 552.000 ₫, hộp ba 774.000 ₫. Thêm cổng kiểm ngưỡng ship quy ra 2–4 cây. |
| **Font icon không về thì cả trang lộ chữ `storefront`, `local_shipping`, `qr_code_2`** — đúng thứ ADR 0005 lập ra để chặn, và chính ADR ấy bênh nhầm cách kiểm | Review cuối: chụp lại trang trong môi trường chặn Google Fonts | `fonts.load()` resolve với mảng rỗng chứ không reject, `check()` trả true — cả hai đều không dùng được. Đổi sang "mảng có phần tử **và** mọi phần tử `loaded`". Thêm phép đo thứ 13 trong `smoke.js` tự chặn tên miền font rồi kiểm; đã thử ngược. |
| Lời khuyên `smoke.js` in ra khi thiếu công cụ — "cài bằng `npm i -g playwright-core` rồi chạy lại" — **làm đúng y như thế thì vẫn ra đúng câu ấy** | Cùng lượt review: làm theo chính lời khuyên của cổng | `require()` không tìm trong `npm root -g`. Thêm nhánh nạp thứ hai đọc `npm root -g`. **Bài học: lời khuyên một cổng in ra cũng là một lời hứa — phải thử làm theo nó một lần.** |
| `smoke.js` dò Chromium ở `~/.cache/ms-playwright` nhưng **macOS đặt ở `~/Library/Caches/ms-playwright`** — máy chính của chủ repo là Mac | Đọc lại hàm dò khi sửa lỗi trên | Thêm đường dẫn macOS. Trước đó trên Mac tầng 2 luôn bỏ qua trong im lặng, còn CI Linux vẫn xanh nên không ai thấy. |
