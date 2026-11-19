# Quyết định — md-annotate

<!-- index:start -->
- MDAN-001 · Tab Nguồn tô màu cú pháp kiểu VS Code · `md-annotate/index.html`
<!-- index:end -->

## MDAN-001 · Tab Nguồn tô màu cú pháp kiểu VS Code
19/11/2026 · `md-annotate/index.html`

Tab *Nguồn* tô màu markdown như trình soạn VS Code: đầu mục, dấu nhấn, chữ link và URL (xanh dương), mã, trích
khối, dấu danh sách, bảng, đường kẻ, thẻ HTML, chuỗi trong ngoặc kép. Bộ tách token tự viết, theo dòng, không
thư viện; chỉ bọc chữ trong `<span>`, nên text của khung đúng bằng nguồn. Màu là token `--sx-*`, ≥ 4,5:1 trên nền
và trên highlight. Nút *Tô màu* (mặc định bật, nhớ trong trình duyệt) trả về chữ trơn.
