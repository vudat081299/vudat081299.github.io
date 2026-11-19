# Quyết định — md-annotate

<!-- index:start -->
- MDAN-001 · Tab Nguồn tô màu cú pháp kiểu VS Code · `md-annotate/index.html`
- MDAN-002 · Xanh lá riêng, sáng hơn trang chủ · `md-annotate/index.html`
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
