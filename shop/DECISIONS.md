# Quyết định — shop/

<!-- decisions: prefix=SHOP; nhóm=cấu trúc, dữ liệu, giao diện, xuất bản -->

Những gì đã chốt cho storefront trong `shop/`. Luật đang áp dụng nằm ở [CLAUDE.md](CLAUDE.md);
file này ghi ai chốt, khi nào, vì sao, và áp tới đâu. Nhật ký các phiên ở
[HISTORY.md](HISTORY.md), việc dở ở [HANDOFF.md](HANDOFF.md).

Năm mục SHOP-001…005 là năm ADR trong [docs/adr/](docs/adr/), cùng số thứ tự; mỗi mục ở đây chỉ
tóm tắt, lập luận đầy đủ và **điều kiện xét lại** nằm trong file ADR. Muốn đảo một mục thì hỏi
chủ repo trước; đảo xong thì giữ cả hai mục (*"đã thay bằng …"* / *"Thay cho: …"*).

<!-- index:start -->
**cấu trúc**
- SHOP-001 — Giữ trang tĩnh, không dựng framework · `shop/`
- SHOP-004 — Không tự xây phần mềm quản lý bán hàng · `shop/`
- SHOP-006 — Ba trang lõi: trang chủ dẫn thẳng sang mua, trang sản phẩm chia theo mùi, thanh toán · `shop/index.html`, `shop/products.html`, `shop/checkout.html`, `shop/data/shop.json`
- SHOP-008 — Tên file trong shop/ bằng tiếng Anh, nội dung giữ tiếng Việt · `shop/`

**dữ liệu**
- SHOP-002 — Tìm mùi chấm điểm bằng trọng số tường minh, phân xử bằng câu ký ức · `shop/data/shop.json`, `shop/assets/shop.js`, `shop/scent-finder.html`, `shop/tools/lint-shop.py`
- SHOP-003 — Hộp quà là một dòng ghép trong giỏ; giỏ lưu cấu hình, không lưu giá · `shop/assets/shop.js`, `shop/gift.html`, `shop/checkout.html`

**giao diện**
- SHOP-005 — Ẩn icon cho tới khi font ligature thật sự về, không hẹn giờ dự phòng · `shop/assets/shop.css`, `shop/assets/shop.js`

**xuất bản**
- SHOP-007 — Tài liệu của shop/ lên web · `.github/workflows/deploy.yml`, `shop/docs/`, `shop/*.md`, `shop/tools/lint-shop.py`
<!-- index:end -->

### SHOP-001 — Giữ trang tĩnh, không dựng framework
- **Ngày:** 20/09/2026
- **Phạm vi:** shop/
- **Nhóm:** cấu trúc
- **Trạng thái:** đang áp dụng
- **Quyết định:** `shop/` là HTML/CSS/JS thuần trên GitHub Pages, không bước build, không
  framework. Trang mới dựng theo đúng lối cũ.
- **Vì sao:** việc cần làm là một bản demo mang đi gặp chủ shop — một đường link mở được ngay
  trên điện thoại có giá trị hơn một kiến trúc đẹp. Đổi stack là viết lại toàn bộ cổng; chi phí
  lưu trữ bằng không.
- **Đừng:** bàn lại khi chưa chạm một trong bốn điều kiện xét lại của ADR. Ba điều kiện đầu (giữ
  bí mật, nhận webhook, trạng thái chung) giải được bằng một hàm serverless đặt cạnh trang tĩnh.
- **Nguồn:** ADR 0001, phiên 20/09/2026 (commit 5a04a8b). Phiên ấy được phép đổi sang framework
  khác; ADR ghi lựa chọn giữ nguyên.
  Chủ trang xác nhận ngày 28/09/2026 (cả năm ADR của shop/docs/adr/).
- **Chi tiết:** docs/adr/0001-static-site.md

### SHOP-002 — Tìm mùi chấm điểm bằng trọng số tường minh, phân xử bằng câu ký ức
- **Ngày:** 20/09/2026
- **Phạm vi:** shop/data/shop.json, shop/assets/shop.js, shop/scent-finder.html, shop/tools/lint-shop.py
- **Nhóm:** dữ liệu
- **Trạng thái:** đang áp dụng
- **Quyết định:** Mỗi đáp án mang một bộ trọng số `w` (khoá mùi → số nguyên dương). Hoà ở đỉnh thì
  phân xử bằng trọng số của câu ký ức (`q-kyuc`), vẫn hoà thì theo thứ tự trong `scents`. Không
  so tag.
- **Vì sao:** trọng số cộng được và kiểm được bằng máy — cổng duyệt toàn bộ tổ hợp đáp án; so tag
  thì không có gì để duyệt.
- **Đừng:** học trọng số từ dữ liệu khi chưa có đủ lượt làm quiz thật; sửa trọng số mà không chạy
  lại cổng và đọc dòng phân bố.
- **Nguồn:** ADR 0002, phiên 20/09/2026 (commit a18de77, 5a04a8b).
  Chủ trang xác nhận ngày 28/09/2026 (cả năm ADR của shop/docs/adr/).
- **Chi tiết:** docs/adr/0002-scent-finder-scoring.md

### SHOP-003 — Hộp quà là một dòng ghép trong giỏ; giỏ lưu cấu hình, không lưu giá
- **Ngày:** 20/09/2026
- **Phạm vi:** shop/assets/shop.js, shop/gift.html, shop/checkout.html
- **Nhóm:** dữ liệu
- **Trạng thái:** đang áp dụng
- **Quyết định:** Dòng hộp quà là `{id, q, g}` — `id` băm ổn định từ cấu hình, `g` là cấu hình chứ
  không phải giá. `byId()` dựng tạm một sản phẩm từ `g`, nên tính tiền, vẽ dòng và soạn đơn chạy
  như với món thường. Giá và tồn kho của hộp tính lại mỗi lần đọc.
- **Vì sao:** lưu giá thì shop đổi giá nến xong, cái hộp nằm sẵn trong giỏ của khách vẫn giữ giá
  cũ mà không ai biết là cũ.
- **Nguồn:** ADR 0003, phiên 20/09/2026 (commit a18de77, 5a04a8b).
  Chủ trang xác nhận ngày 28/09/2026 (cả năm ADR của shop/docs/adr/).
- **Chi tiết:** docs/adr/0003-gift-box-in-cart.md

### SHOP-004 — Không tự xây phần mềm quản lý bán hàng
- **Ngày:** 20/09/2026
- **Phạm vi:** shop/
- **Nhóm:** cấu trúc
- **Trạng thái:** đang áp dụng
- **Quyết định:** Không xây quản lý đơn, kho, khách hàng, thanh toán, vận chuyển hay dashboard. Khi
  shop cần những năng lực đó thì khuyên chủ shop mua phần mềm có sẵn. Ngoại lệ duy nhất còn lại
  là nửa *chất lượng* của sổ mẻ sản xuất, và cả nó cũng chỉ khi đã thành nút thắt thật.
- **Vì sao:** phần lớn nghiệp vụ bán lẻ là hàng hoá phổ thông, mua được với giá bằng một phần nhỏ
  công tự xây — bảng giá đã kiểm nằm trong ADR.
- **Đừng:** tưởng tượng ra nút thắt từ một mô tả. Đừng khẳng định "không phần mềm bán lẻ nào biết
  công thức của shop" — sai: phần mềm bán hàng đại trà đã có tính năng sản xuất, trừ nguyên liệu
  theo định mức (ADR, mục sửa 24/09/2026).
- **Nguồn:** ADR 0004, phiên 20/09/2026 (commit 5a04a8b); sửa ngày 24/09/2026 (commit f2fafec).
  Chủ trang xác nhận ngày 28/09/2026 (cả năm ADR của shop/docs/adr/).
- **Chi tiết:** docs/adr/0004-dont-rebuild-retail-software.md

### SHOP-005 — Ẩn icon cho tới khi font ligature thật sự về, không hẹn giờ dự phòng
- **Ngày:** 20/09/2026
- **Phạm vi:** shop/assets/shop.css, shop/assets/shop.js
- **Nhóm:** giao diện
- **Trạng thái:** đang áp dụng
- **Quyết định:** `html.js .ms { visibility: hidden }`, và chỉ hiện khi mảng `document.fonts.load()`
  trả về **có** phần tử và mọi phần tử `loaded`. Không có đường hết-giờ-thì-hiện.
- **Vì sao:** font không về thì icon hiện thành chữ tiếng Anh (`shopping_bag`) giữa câu tiếng
  Việt, xấu hơn hẳn một nút tròn trống; mọi nút icon đã có `aria-label`.
- **Đừng:** kiểm bằng `fonts.load(...).then(ok, ok)` hay `document.fonts.check()` — cả hai báo
  "đã về" khi font không về (ADR, mục sửa 21/09/2026).
- **Nguồn:** ADR 0005, phiên 20/09/2026 (commit a18de77, 5a04a8b); sửa ngày 21/09/2026 (commit
  5799dde).
  Chủ trang xác nhận ngày 28/09/2026 (cả năm ADR của shop/docs/adr/).
- **Chi tiết:** docs/adr/0005-hide-icons-until-font-loads.md

### SHOP-006 — Ba trang lõi: trang chủ dẫn thẳng sang mua, trang sản phẩm chia theo mùi, thanh toán
- **Ngày:** 17/09/2026
- **Phạm vi:** shop/index.html, shop/products.html, shop/checkout.html, shop/data/shop.json
- **Nhóm:** cấu trúc
- **Trạng thái:** đang áp dụng
- **Quyết định:** Storefront có ba trang lõi, đúng ba việc chủ trang cần: trang chủ dẫn thẳng sang
  mua hàng, một trang xem hàng riêng phân loại theo mùi hương, và trang thanh toán. Mùi hương
  (`scents`) là trục phân loại của trang sản phẩm.
- **Nguồn:** commit bbe20d1 (*"tách một trang thành ba, đúng ba việc chủ trang cần"*).

### SHOP-007 — Tài liệu của shop/ lên web
- **Ngày:** 21/09/2026
- **Phạm vi:** .github/workflows/deploy.yml, shop/docs/, shop/*.md, shop/tools/lint-shop.py
- **Nhóm:** xuất bản
- **Trạng thái:** đang áp dụng
- **Quyết định:** Mọi thứ trong `shop/` được deploy công khai, kể cả `shop/docs/` và mọi
  `shop/*.md`. `deploy.yml` không có `--exclude` cho hai đường dẫn ấy, và `check_publish` trong
  `lint-shop.py` làm đỏ nếu một trong hai dòng loại trừ quay lại.
- **Vì sao:** chủ repo muốn đọc bộ tài liệu trên web, và coi nó là kế hoạch chứ không phải bí
  mật. Chủ repo đã được báo trước rằng cả hai tài liệu đàm phán (01 và 04) sẽ lên web cùng, và
  khẳng định lại.
- **Đừng:** tự thêm lại dòng loại trừ vì thấy nội dung nhạy cảm — hỏi chủ repo. Viết gì vào
  `docs/` thì viết như thể chủ shop sẽ đọc.
- **Nguồn:** commit fae93a9; comment đầu `.github/workflows/deploy.yml`; HISTORY.md, phiên
  21/09/2026.

### SHOP-008 — Tên file trong shop/ bằng tiếng Anh, nội dung giữ tiếng Việt
- **Ngày:** 21/09/2026
- **Phạm vi:** shop/
- **Nhóm:** cấu trúc
- **Trạng thái:** đang áp dụng
- **Quyết định:** Mọi file trong `shop/` mang tên tiếng Anh; nội dung vẫn viết tiếng Việt.
- **Đừng:** đặt tên file mới bằng tiếng Việt. Đổi tên một file thì sửa mọi chỗ trỏ tới tên cũ —
  `check_docs` bắt liên kết markdown gãy, nhưng không bắt tên file nhắc bằng chữ trong comment.
- **Nguồn:** commit 60b37ba (*"Chủ repo muốn mọi file trong shop/ mang tên tiếng Anh"*);
  HISTORY.md, phiên 21/09/2026.
