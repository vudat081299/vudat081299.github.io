# shop/ — storefront nến thơm

scentsitive.vn: trang bán hàng tĩnh cho một shop nến thơm thủ công. Ở đây sai một con số là khách
trả nhầm tiền; mọi luật dưới đây sinh ra từ đó.

- Mục lục tài liệu: [docs/00-READ-THIS-FIRST.md](docs/00-READ-THIS-FIRST.md).
- Quyết định đã chốt: [DECISIONS.md](DECISIONS.md), mã `SHOP-NNN`; luật nào sinh từ quyết định thì trích mã.
- Việc dở: [HANDOFF.md](HANDOFF.md). Nhật ký phiên: [HISTORY.md](HISTORY.md).
- Skill `.claude/skills/shop/` giữ thứ tự các bước; luật nằm ở file này.
- Mọi tính năng đã dựng là giả thuyết, chưa ai gặp chủ shop; rủi ro lớn nhất là xây nhầm thứ.
- Trước khi viết thêm mã: đọc mục *Bốn việc đáng thử trước khi nghĩ tới website* trong
  `pitch/index.html` — một trong bốn việc ấy ăn thì rẻ hơn và trả lời nhanh hơn mọi phần mềm.

## Phiên làm việc

- Mở trang: `python3 -m http.server 8000` ở gốc repo, rồi `http://localhost:8000/shop/` (mở `file://`
  là trang rỗng vì trang `fetch` data).
- Đầu phiên đọc `HANDOFF.md`; sắp sửa file nào thì `python3 tools/decisions.py find shop/<file>`.
- Cổng: `sh shop/tools/check.sh` (kiểm tĩnh bằng `tools/lint-shop.py`). Commit chạm `shop/` thì hook
  gốc repo chạy nó; CI chạy nó cùng `tools/smoke.js`; deploy chờ CI xanh (REPO-017).
- Xem cả mức XEM (phân bố Tìm mùi, số cờ placeholder): `python3 shop/tools/lint-shop.py -v`.
- Chạy smoke ở máy: server như trên, rồi `node shop/tools/smoke.js http://localhost:8000/shop/`.
- Xong việc: cập nhật `HANDOFF.md` và `HISTORY.md`; chủ repo vừa chốt điều gì thì ghi `DECISIONS.md`.

## Dữ liệu trước, UI sau

- Chữ của khối lặp (mùi, sản phẩm, câu hỏi Tìm mùi, hộp quà, giá trị, hỏi đáp, cách thanh toán) ở
  `data/shop.json`; chữ độc nhất (hero, tên section) ở HTML.
- `lint-shop.py` so từng text node với chuỗi trong data, ngưỡng 0,40 — số đo được (comment trong
  file); có câu vượt ngưỡng thì đo lại rồi chỉnh, đừng đoán số mới.
- Chỉ trường có hậu tố `_html` được `innerHTML`; còn lại là chữ thuần, UI tự escape.
- Số suy ra được thì không ghi: giá hộp quà tính từ giá sản phẩm, tồn kho hộp từ món khan nhất,
  tỉ lệ khớp Tìm mùi từ trọng số.
- Giỏ lưu cấu hình hộp quà, không lưu giá (SHOP-003): đổi giá nến thì hộp đang trong giỏ đổi theo.
- Thứ tự: nội dung vào data (chữ thuần) → UI đọc data bằng vòng lặp → chạy cổng → chụp màn hình
  bằng trình duyệt thật rồi mới ship.

## Năm trang, một shell

- Nav, menu điện thoại, chân trang giống hệt nhau ở năm trang; chỉ `is-active` và `nav--over` được
  khác. `check_shell` so từng ký tự và đòi mỗi trang nạp đủ `assets/shop.css` + `assets/shop.js`.
- Sửa shell: sửa một file rồi chép sang bốn file kia bằng script, gắn lại `is-active`/`nav--over`
  ([docs/05-ARCHITECTURE.md](docs/05-ARCHITECTURE.md), *Shell sinh ra thế nào*). Đừng sửa tay năm file.
- Kiểm HTML chung (id, anchor, asset, thẻ lệch, svg không tên, tiêu đề nhảy cấp, nhãn tiếng Anh)
  ở `tools/htmlcheck.py`; `<title>` tiếng Việt là đúng ở đây (REPO-016).

| Trang | Việc của nó | Cổng soi |
|---|---|---|
| `index.html` | landing, dẫn thẳng sang mua (SHOP-006) | có |
| `products.html` | năm mùi, màu trang đổi theo mùi đang đọc | có |
| `scent-finder.html` | năm câu hỏi → một mùi, kèm lý do | có |
| `gift.html` | hộp quà, xem trước trực tiếp | có |
| `checkout.html` | giỏ, VietQR, COD | có |
| `pitch/index.html` | bản đề xuất mang đi gặp chủ shop, không phải trang cửa hàng | không |
| `measure/index.html` | phễu đọc từ sự kiện đã ghi trong máy — trang nội bộ | không |

- `pitch/` và `measure/` mượn token màu của `assets/shop.css` nhưng không có nav, không có giỏ và
  không dùng lớp `.ms`: trang đem đi thuyết trình không được chờ font icon.
- Không cổng nào soi hai trang ấy (`SHOP.glob('*.html')` không quét thư mục con): sửa thì tự mở xem.

## Tiền nằm ở quan hệ giữa các trường

- Kiểm từng trường chưa đủ: đổi chỗ phí ship và ngưỡng miễn phí thì từng số vẫn hợp lệ mà đơn
  300.000 ₫ phải trả 500.000 ₫ tiền ship.
- `lint-shop.py` chặn commit khi:
  - giá không phải số nguyên dương; giá gạch (`compare`) không lớn hơn giá bán; tồn kho âm;
  - `labels.ship_fee` hay `labels.free_ship` không phải số nguyên dương, hoặc không có trong đoạn
    `shipping` — giỏ và đoạn Giao hàng phải nói cùng một giá;
  - `ship_fee` ≥ `free_ship`;
  - ngưỡng miễn phí ship quy ra ngoài 2–4 cây nến rẻ nhất (dưới 2 thì đơn nào cũng miễn, trên 4
    thì không ai với tới);
  - một mục `marquee` không khai `placeholder` — nó là lời khẳng định về sản phẩm, phải nói đã xác
    nhận hay đang đoán;
  - cách thanh toán `ready: false` mà không liệt kê `need`; tài khoản ngân hàng `ready: true` mà
    thiếu trường, BIN không đủ 6 chữ số, hoặc số tài khoản ngoài 6–20 chữ số.
- Tuyên bố an toàn sản phẩm (*"bấc cotton không lõi chì"*) chỉ chủ shop xác nhận được: chưa xác nhận
  thì gỡ khỏi trang, đừng chỉ gắn cờ.
- Không ghi *"100% thiên nhiên"* khi không đúng ([docs/04-NEGOTIATION.md](docs/04-NEGOTIATION.md)).

## Tìm mùi (SHOP-002)

- Mỗi đáp án mang trọng số trên khoá mùi; sửa một con số là lệch kết quả mà trang không kêu.
- Cổng duyệt hết tổ hợp đáp án và chặn khi: một mùi không bao giờ thắng; một mùi thắng quá nửa số
  tổ hợp; một đáp án mọi trọng số bằng 0; `tiebreak` không trỏ vào một câu có chấm điểm.
- Sửa trọng số thì chạy `lint-shop.py -v` và đọc dòng phân bố cùng số tổ hợp hoà không gỡ được;
  đừng đoán.

## Chạy thật rồi đo

- Cổng tĩnh không bắt được hành vi; các lỗi nặng nhất ở đây đều lộ ra khi chạy thật rồi đo
  ([docs/TECH-DEBT.md](docs/TECH-DEBT.md)).

| Sửa gì | Đo thế nào |
|---|---|
| Giỏ hàng / tồn kho | Bấm quá số tồn rồi đọc toast: không được báo "đã thêm" khi bị chặn. |
| Hộp quà | Gói một hộp, thêm vào giỏ, đọc `localStorage.getItem('scentsitive-cart')`: cấu hình còn nguyên. |
| Tìm mùi | Làm hết một lượt, xem `/shop/measure/` có đủ sự kiện không. |

- Lỗi chỉ lộ khi môi trường hỏng (font, `localStorage` bị chặn) thì phải dựng lại tình huống hỏng
  rồi đo, như `smoke.js` chặn tên miền font và `localStorage`.
- `smoke.js` cần Node ≥ 20 và `playwright-core`; Node mặc định cũ thì `PATH=/opt/homebrew/bin:$PATH`.
- Nó tự dò Chromium: `CHROME_PATH`, `PLAYWRIGHT_BROWSERS_PATH`, `/opt/pw-browsers`, rồi cache của
  Playwright. Máy có Google Chrome thì đặt `CHROME_PATH` là đủ.
- Máy chưa có gì: `npm i -g playwright-core playwright && npx playwright install chromium`.
- Container agent đã có `/opt/pw-browsers`: đừng chạy `playwright install`.
- Thiếu công cụ thì `smoke.js` thoát mã 2 (đã bỏ qua), không phải mã 1 (lỗi).

## Đo đạc

- `track(ev, props)` trong `assets/shop.js`; thêm sự kiện là thêm một lời gọi, đừng thêm một hệ thống.
- Sự kiện hiện có dựng được phễu Tìm mùi — con số mà các tiêu chí "bỏ tính năng khi nào" trong
  `docs/02-ROADMAP.md` cần.
- Dữ liệu nằm trong `localStorage` của từng máy: shop không thấy gì, `/shop/measure/` chỉ thấy máy đang mở.
- Gộp số thật: đổi `SINK` thành một URL (một dòng) và dựng một hàm serverless nhận nó.
- Đừng bật `SINK` khi chưa có trang nói rõ trang thu thập gì.

## Cổng mới

- Lớp lỗi mới → phép kiểm trong `tools/lint-shop.py` (hành vi thì `tools/smoke.js`) → thử ngược
  (cố tình phá, xem nó có kêu) → ghi lỗi gốc vào comment của phép kiểm. Mọi phép kiểm hiện có đã
  thử ngược.
- Có nhiều lớp phòng thủ thì phá thứ cả mấy lớp cùng gọi (`remaining()`), không phá riêng một lớp
  (`addToCart`) — lớp khác che mất.
- Tài liệu không hứa nhiều hơn cổng làm: mô tả phép kiểm thì đọc code của nó trước; thêm hay bỏ
  phép kiểm thì sửa mô tả cùng lúc.
- Lời khuyên cổng in ra cũng là một lời hứa: tự làm theo nó một lần trước khi viết ra.

## Tài liệu

- Mọi thứ trong `shop/`, kể cả `docs/` và `*.md`, lên web công khai (SHOP-007): viết như thể chủ shop
  sẽ đọc.
- Đừng thêm `--exclude` cho `shop/` vào `deploy.yml` (`check_publish` đỏ); muốn giấu lại thì hỏi chủ repo.
- Tên file tiếng Anh, nội dung tiếng Việt (SHOP-008). Đổi tên thì sửa mọi chỗ trỏ tới: `check_docs`
  bắt liên kết markdown gãy, không bắt tên file nhắc bằng chữ.
- Mọi con số mang nhãn nguồn: *[đã kiểm: nguồn]* chỉ khi đã mở đúng trang ấy và đọc được con số;
  *[chưa kiểm]*; *[đoán — phải hỏi chị ấy]*. Quy ước đầy đủ ở cuối `docs/00-READ-THIS-FIRST.md`.
- `docs/index.html` là bản đọc, không phải nguồn: lệch markdown thì sửa markdown trước, rồi mới sửa trang.
- Để lại nợ: ghi `docs/TECH-DEBT.md`, kèm cột *cắn khi nào*.
- Quyết định kỹ thuật người sau có thể hỏi "vì sao": một ADR trong `docs/adr/`, có điều kiện xét lại.

## Đừng làm

- Đừng xây phần mềm quản lý bán hàng, kho hay đơn (SHOP-004): mua sẵn rẻ hơn nhiều lần.
- Đừng nói "không phần mềm bán lẻ nào biết công thức nến": phần mềm bán hàng đại trà đã trừ nguyên
  liệu theo định mức ([docs/06-VALUE-CHAIN.md](docs/06-VALUE-CHAIN.md) §5, ADR 0004).
- Đừng hứa đồng bộ Shopee trước khi xác minh shop đủ điều kiện dùng API (Shopee cấp quyền theo hạng
  người bán).
- Đừng bịa số uplift, và đừng tin số đang lưu hành: "quiz tăng chuyển đổi 40%" do chính bên bán
  phần mềm quiz công bố, không có nhóm đối chứng; "McKinsey: bundling tăng AOV 20–35%" không có ấn
  phẩm nào đứng sau.
- Đừng bịa đánh giá của khách: trên một shop bán thật đó là lừa người mua.
- Đừng đặt ô nhập số thẻ: cách thanh toán nào chưa chạy được thì nút khoá kèm danh sách việc còn thiếu.
- Đừng thêm test đơn vị, TypeScript, bước build hay CMS chỉ vì thấy nên có: thêm khi có một lỗi thật
  mà cổng hiện có không bắt được (docs/05-ARCHITECTURE.md, *Chỗ dừng lại*).

## Chỗ dễ sai

- Đừng dùng `display:grid; place-items:center` cho phần tử có hơn một con: grid xếp theo hàng, con
  thứ hai rơi xuống dưới (`check_centring` chặn).
- Đừng neo tìm-thay vào một dòng xuất hiện ở hai hàm: `renderCart()` và `boot()` cùng kết thúc bằng
  `if ($('#coLines')) renderCheckout();`. Neo vào cả khối, rồi chạy thật để xác nhận.
- Toast phải nói sự thật: không báo "đã thêm" khi tồn kho chặn — bấm quá số tồn rồi đọc toast.
- Đừng thêm liên kết markdown tới file chưa có: trên GitHub nó vẫn hiện như liên kết thường
  (`check_docs` chặn).
- Đừng viết đường dẫn có dấu sao kiểu `thư-mục-*/file` trong block comment JS: `*/` đóng comment sớm
  và node báo SyntaxError ở một dòng rất xa.
