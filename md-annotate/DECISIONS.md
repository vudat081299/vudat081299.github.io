# Quyết định — md-annotate

<!-- index:start -->
- MDAN-001 · Tab Nguồn tô màu cú pháp kiểu VS Code · `md-annotate/index.html`
- MDAN-002 · Xanh lá riêng, sáng hơn trang chủ · `md-annotate/index.html`
- MDAN-004 · Giao diện bằng tiếng Anh · `md-annotate/index.html`, `md-annotate/data/hints.json`
- MDAN-005 · Vùng làm việc khoảng 70% màn hình, ở giữa · thay cho MDAN-003 · `md-annotate/index.html`
<!-- index:end -->

## MDAN-001 · Tab Nguồn tô màu cú pháp kiểu VS Code
19/11/2026 · `md-annotate/index.html`

Tab *Nguồn* tô màu markdown như trình soạn VS Code: đầu mục, dấu nhấn, chữ link và URL (xanh dương), mã, trích
khối, dấu danh sách, bảng, đường kẻ, thẻ HTML, chuỗi trong ngoặc kép. Bộ tách token tự viết, theo dòng, không
thư viện; chỉ bọc chữ trong `<span>`, nên text của khung đúng bằng nguồn. Màu là token `--sx-*`, ≥ 4,5:1 trên nền
và trên highlight. Nút *Tô màu* (mặc định bật, nhớ trong trình duyệt) trả về chữ trơn.

## MDAN-002 · Xanh lá riêng, sáng hơn trang chủ
19/11/2026 · `md-annotate/index.html`

REPO-023 chỉ ràng `index.html`; trang này có xanh lá riêng, tươi hơn. Nền nút chính và huy hiệu số là `--accent`
(`#22c55e` sáng, `#4ade80` tối) với chữ tối `--on-accent` (`#052e16`, ≥ 6,5:1). Chữ, viền, link xanh trên nền sáng
dùng sắc đậm cùng họ `--green` (`#15803d`). Nền highlight pha từ cùng màu; ở theme tối phủ mỏng để chữ màu của
tab Nguồn vẫn ≥ 4,5:1. Nền, mực và font vẫn chép từ trang chủ.

## MDAN-004 · Giao diện bằng tiếng Anh
19/11/2026 · `md-annotate/index.html`, `md-annotate/data/hints.json`

Mọi chữ trên giao diện bằng tiếng Anh, kể cả văn bản mẫu, gợi ý mặc định và chữ khung của prompt; `lang="en"`.
Trích dẫn và nhận xét người dùng gõ giữ nguyên. Số đếm của gợi ý mặc định tiếng Việt cũ chuyển sang gợi ý tiếng Anh
tương ứng qua `renamed`; phiên đã lưu không đổi. `desc` trên trang chủ vẫn tiếng Việt (REPO-002).

## MDAN-005 · Vùng làm việc khoảng 70% màn hình, ở giữa · thay cho MDAN-003
19/11/2026 · `md-annotate/index.html`

Vùng làm việc rộng 70% khung nhìn, căn giữa, không hẹp hơn 1280px (màn nhỏ hơn thì tràn hết, lề 24px; điện thoại
16px). Panel rộng 360px, kéo mép trái được (320–560px) hoặc thu thành thanh dọc 56px vẫn giữ nút chép; cả hai nhớ
trong trình duyệt. *Song song* có khi mỗi khung được ≥ 420px: hai khung cao trọn khung nhìn, cuộn riêng, vách giữa
kéo được và nhớ tỉ lệ. Chữ ở *Preview* rộng hết khung, không giới hạn khổ.
