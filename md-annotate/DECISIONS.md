# Quyết định — md-annotate

<!-- index:start -->
- MDAN-001 · Tab Nguồn tô màu cú pháp kiểu VS Code · `md-annotate/index.html`
- MDAN-002 · Xanh lá riêng, sáng hơn trang chủ · `md-annotate/index.html`
- MDAN-005 · Vùng làm việc khoảng 70% màn hình, ở giữa · thay cho MDAN-003 · `md-annotate/index.html`
- MDAN-006 · Preview giống GitHub, cuộn theo nhau ở Split · `md-annotate/index.html`
- MDAN-007 · Giao diện tiếng Anh, gợi ý và prompt tiếng Việt · thay cho MDAN-004 · `md-annotate/index.html`, `md-annotate/data/hints.json`
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

## MDAN-005 · Vùng làm việc khoảng 70% màn hình, ở giữa · thay cho MDAN-003
19/11/2026 · `md-annotate/index.html`

Vùng làm việc rộng 70% khung nhìn, căn giữa, không hẹp hơn 1280px (màn nhỏ hơn thì tràn hết, lề 24px; điện thoại
16px). Panel rộng 360px, kéo mép trái được (320–560px) hoặc thu thành thanh dọc 56px vẫn giữ nút chép; cả hai nhớ
trong trình duyệt. *Song song* có khi mỗi khung được ≥ 420px: hai khung cao trọn khung nhìn, cuộn riêng, vách giữa
kéo được và nhớ tỉ lệ. Chữ ở *Preview* mặc định rộng hết khung. Người dùng chỉnh bề rộng vùng làm việc, khổ chữ và cỡ chữ *Preview*
trong hộp *Layout*; mặc định là các số trên.

## MDAN-006 · Preview giống GitHub, cuộn theo nhau ở Split
19/11/2026 · `md-annotate/index.html`

*Preview* dựng markdown theo kiểu GitHub: font hệ thống, màu Primer sáng / tối, tiêu đề h1–h2 có gạch dưới, khối
code xám có tô màu theo ngôn ngữ, bảng sọc, hộp `[!NOTE]` / `[!TIP]` / `[!IMPORTANT]` / `[!WARNING]` / `[!CAUTION]`.
Ở *Split*, cuộn một khung thì khung kia cuộn theo để cùng một đoạn nằm giữa cả hai; tắt được trong *Layout*.

## MDAN-007 · Giao diện tiếng Anh, gợi ý và prompt tiếng Việt · thay cho MDAN-004
19/11/2026 · `md-annotate/index.html`, `md-annotate/data/hints.json`

Chữ giao diện bằng tiếng Anh: nút, nhãn, tooltip, placeholder giao diện, toast, hộp thoại, văn bản mẫu; `lang="en"`.
Nội dung đi vào prompt bằng tiếng Việt: gợi ý nhận xét mặc định, câu số dòng, `Văn bản gốc:`, câu mẫu và ví dụ của lời
dẫn đầu / cuối. Số đếm của gợi ý tiếng Anh cũ chuyển về gợi ý tiếng Việt tương ứng qua `renamed`; phiên đã lưu không
đổi. `desc` trên trang chủ vẫn tiếng Việt (REPO-002).
