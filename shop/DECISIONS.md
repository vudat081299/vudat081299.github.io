# Quyết định — shop/

<!-- index:start -->
- SHOP-001 · Giữ trang tĩnh, không dựng framework · `shop/`
- SHOP-002 · Tìm mùi chấm điểm bằng trọng số tường minh, phân xử bằng câu ký ức · `shop/data/shop.json`, `shop/assets/shop.js`, `shop/scent-finder.html`, `shop/tools/lint-shop.py`
- SHOP-003 · Hộp quà là một dòng ghép trong giỏ; giỏ lưu cấu hình, không lưu giá · `shop/assets/shop.js`, `shop/gift.html`, `shop/checkout.html`
- SHOP-004 · Không tự xây phần mềm quản lý bán hàng · `shop/`
- SHOP-005 · Ẩn icon cho tới khi font ligature thật sự về, không hẹn giờ dự phòng · `shop/assets/shop.css`, `shop/assets/shop.js`
- SHOP-006 · Ba trang lõi: trang chủ dẫn thẳng sang mua, trang sản phẩm chia theo mùi, thanh toán · `shop/index.html`, `shop/products.html`, `shop/checkout.html`, `shop/data/shop.json`
- SHOP-007 · Tài liệu của shop/ lên web · `.github/workflows/deploy.yml`, `shop/docs/`, `shop/*.md`, `shop/tools/lint-shop.py`
- SHOP-008 · Tên file trong shop/ bằng tiếng Anh, nội dung giữ tiếng Việt · `shop/`
<!-- index:end -->

## SHOP-001 · Giữ trang tĩnh, không dựng framework
20/09/2026 · `shop/`

`shop/` là HTML/CSS/JS thuần trên GitHub Pages, không bước build, không framework; trang mới dựng
theo đúng lối ấy. Vì: một đường link mở được ngay trên điện thoại đáng giá hơn một kiến trúc đẹp,
và đổi stack là viết lại toàn bộ cổng. Chỉ bàn lại khi chạm một trong bốn điều kiện xét lại của
`docs/adr/0001-static-site.md`; ba điều kiện đầu giải được bằng một hàm serverless cạnh trang tĩnh.
Nguồn: 5a04a8b.

## SHOP-002 · Tìm mùi chấm điểm bằng trọng số tường minh, phân xử bằng câu ký ức
20/09/2026 · `shop/data/shop.json`, `shop/assets/shop.js`, `shop/scent-finder.html`, `shop/tools/lint-shop.py`

Mỗi đáp án mang trọng số `w` (khoá mùi → số nguyên dương); hoà ở đỉnh thì phân xử bằng trọng số
của câu ký ức (`q-kyuc`), vẫn hoà thì theo thứ tự trong `scents`; không so tag. Vì: trọng số cộng
được nên cổng duyệt được toàn bộ tổ hợp đáp án. Chưa đủ lượt làm quiz thật thì đừng học trọng số
từ dữ liệu, và sửa trọng số thì chạy lại cổng, đọc dòng phân bố (`docs/adr/0002-scent-finder-scoring.md`).
Nguồn: a18de77, 5a04a8b.

## SHOP-003 · Hộp quà là một dòng ghép trong giỏ; giỏ lưu cấu hình, không lưu giá
20/09/2026 · `shop/assets/shop.js`, `shop/gift.html`, `shop/checkout.html`

Dòng hộp quà là `{id, q, g}`: `id` băm ổn định từ cấu hình, `g` là cấu hình chứ không phải giá;
`byId()` dựng tạm một sản phẩm từ `g`, nên tính tiền, vẽ dòng và soạn đơn chạy như món thường.
Giá và tồn kho của hộp tính lại mỗi lần đọc, vì lưu giá thì shop đổi giá nến xong hộp trong giỏ
vẫn giữ giá cũ mà không ai biết (`docs/adr/0003-gift-box-in-cart.md`). Nguồn: a18de77, 5a04a8b.

## SHOP-004 · Không tự xây phần mềm quản lý bán hàng
20/09/2026 · `shop/`

Không xây quản lý đơn, kho, khách hàng, thanh toán, vận chuyển hay dashboard; shop cần thì khuyên
mua phần mềm có sẵn, vì phần lớn nghiệp vụ bán lẻ mua được với giá bằng một phần nhỏ công tự xây.
Ngoại lệ duy nhất là nửa *chất lượng* của sổ mẻ sản xuất, và chỉ khi nó đã thành nút thắt thật chứ
không phải tưởng tượng từ một mô tả. Đừng khẳng định "không phần mềm bán lẻ nào biết công thức của
shop": phần mềm bán hàng đại trà đã trừ nguyên liệu theo định mức
(`docs/adr/0004-dont-rebuild-retail-software.md`). Nguồn: 5a04a8b, f2fafec.

## SHOP-005 · Ẩn icon cho tới khi font ligature thật sự về, không hẹn giờ dự phòng
20/09/2026 · `shop/assets/shop.css`, `shop/assets/shop.js`

`html.js .ms { visibility: hidden }`, chỉ hiện khi mảng `document.fonts.load()` trả về có phần tử
và mọi phần tử `loaded`; không có đường hết-giờ-thì-hiện. Vì: font không về thì icon hiện thành chữ
tiếng Anh giữa câu tiếng Việt, xấu hơn một nút tròn trống, và mọi nút icon đã có `aria-label`.
Đừng kiểm bằng `fonts.load(...).then(ok, ok)` hay `document.fonts.check()`: cả hai báo "đã về" khi
font không về (`docs/adr/0005-hide-icons-until-font-loads.md`). Nguồn: a18de77, 5a04a8b, 5799dde.

## SHOP-006 · Ba trang lõi: trang chủ dẫn thẳng sang mua, trang sản phẩm chia theo mùi, thanh toán
17/09/2026 · `shop/index.html`, `shop/products.html`, `shop/checkout.html`, `shop/data/shop.json`

Storefront có ba trang lõi, đúng ba việc chủ trang cần: trang chủ dẫn thẳng sang mua, một trang xem
hàng phân loại theo mùi hương (`scents`), và trang thanh toán. Nguồn: bbe20d1.

## SHOP-007 · Tài liệu của shop/ lên web
21/09/2026 · `.github/workflows/deploy.yml`, `shop/docs/`, `shop/*.md`, `shop/tools/lint-shop.py`

Mọi thứ trong `shop/`, kể cả `shop/docs/` và mọi `shop/*.md`, được deploy công khai: chủ repo coi
bộ tài liệu là kế hoạch chứ không phải bí mật, và đã được báo trước rằng hai tài liệu đàm phán (01,
04) lên web cùng. `check_publish` trong `lint-shop.py` đỏ nếu `deploy.yml` có lại `--exclude` cho hai
đường dẫn ấy. Đừng tự thêm lại dòng loại trừ — hỏi chủ repo; viết gì vào `docs/` thì viết như thể
chủ shop sẽ đọc. Nguồn: fae93a9.

## SHOP-008 · Tên file trong shop/ bằng tiếng Anh, nội dung giữ tiếng Việt
21/09/2026 · `shop/`

Mọi file trong `shop/` mang tên tiếng Anh, nội dung viết tiếng Việt. Đổi tên một file thì sửa mọi
chỗ trỏ tới tên cũ: `check_docs` bắt liên kết markdown gãy, không bắt tên file nhắc bằng chữ trong
comment. Nguồn: 60b37ba.
