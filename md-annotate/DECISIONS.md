# Quyết định — md-annotate

<!-- index:start -->
- MDAN-001 · Tab Nguồn tô màu cú pháp kiểu VS Code · `md-annotate/`
- MDAN-005 · Vùng làm việc khoảng 70% màn hình, ở giữa · thay cho MDAN-003 · `md-annotate/`
- MDAN-006 · Preview giống GitHub, cuộn theo nhau ở Split · `md-annotate/`
- MDAN-007 · Giao diện tiếng Anh, gợi ý và prompt tiếng Việt · thay cho MDAN-004 · `md-annotate/`
- MDAN-008 · Code tách theo tính năng, logic tách khỏi giao diện, không build · `md-annotate/`
- MDAN-009 · Một màu xanh sáng, thang token cho chữ, bo góc, chiều cao · thay cho MDAN-002 · `md-annotate/`
<!-- index:end -->

## MDAN-001 · Tab Nguồn tô màu cú pháp kiểu VS Code
19/11/2026 · `md-annotate/`

Tab *Nguồn* tô màu markdown như trình soạn VS Code: đầu mục, dấu nhấn, chữ link và URL (xanh dương), mã, trích
khối, dấu danh sách, bảng, đường kẻ, thẻ HTML, chuỗi trong ngoặc kép. Bộ tách token tự viết, theo dòng, không
thư viện; chỉ bọc chữ trong `<span>`, nên text của khung đúng bằng nguồn. Màu là token `--sx-*`, ≥ 4,5:1 trên nền
và trên highlight. Nút *Tô màu* (mặc định bật, nhớ trong trình duyệt) trả về chữ trơn.

## MDAN-005 · Vùng làm việc khoảng 70% màn hình, ở giữa · thay cho MDAN-003
19/11/2026 · `md-annotate/`

Vùng làm việc rộng 70% khung nhìn, căn giữa, không hẹp hơn 1280px (màn nhỏ hơn thì tràn hết, lề 24px; điện thoại
16px). Panel rộng 360px, kéo mép trái được (320–560px) hoặc thu thành thanh dọc 56px vẫn giữ nút chép; cả hai nhớ
trong trình duyệt. *Song song* có khi mỗi khung được ≥ 420px: hai khung cao trọn khung nhìn, cuộn riêng, vách giữa
kéo được và nhớ tỉ lệ. Chữ ở *Preview* mặc định rộng hết khung. Người dùng chỉnh bề rộng vùng làm việc, khổ chữ và cỡ chữ *Preview*
trong hộp *Layout*; mặc định là các số trên.

## MDAN-006 · Preview giống GitHub, cuộn theo nhau ở Split
19/11/2026 · `md-annotate/`

*Preview* dựng markdown theo kiểu GitHub: font hệ thống, màu Primer sáng / tối, tiêu đề h1–h2 có gạch dưới, khối
code xám có tô màu theo ngôn ngữ, bảng sọc, hộp `[!NOTE]` / `[!TIP]` / `[!IMPORTANT]` / `[!WARNING]` / `[!CAUTION]`.
Ở *Split*, cuộn một khung thì khung kia cuộn theo để cùng một đoạn nằm giữa cả hai; tắt được trong *Layout*.

## MDAN-007 · Giao diện tiếng Anh, gợi ý và prompt tiếng Việt · thay cho MDAN-004
19/11/2026 · `md-annotate/`

Chữ giao diện bằng tiếng Anh: nút, nhãn, tooltip, placeholder giao diện, toast, hộp thoại, văn bản mẫu; `lang="en"`.
Nội dung đi vào prompt bằng tiếng Việt: gợi ý nhận xét mặc định, câu số dòng, `Văn bản gốc:`, câu mẫu và ví dụ của lời
dẫn đầu / cuối. Số đếm của gợi ý tiếng Anh cũ chuyển về gợi ý tiếng Việt tương ứng qua `renamed`; phiên đã lưu không
đổi. `desc` trên trang chủ vẫn tiếng Việt (REPO-002).

## MDAN-008 · Code tách theo tính năng, logic tách khỏi giao diện, không build
19/11/2026 · `md-annotate/`

Chủ trang muốn cấu trúc đơn giản, phân chia mục đích rõ ràng, để agent sau sửa nhanh, và sửa giao diện không làm hỏng
logic (cũng như ngược lại). `index.html` chỉ còn markup; CSS tách theo mục đích trong `css/`. JS là module ES: logic
thuần trong `js/core/` (dữ liệu vào, dữ liệu ra, không DOM, không `localStorage`), giao diện trong `js/ui/` (đọc DOM,
gọi logic, ghi DOM, sự kiện trong `init…` của chính module), `js/main.js` gọi theo thứ tự. Vẫn không có bước build.
Đổi lại, trang không chạy qua `file://`: mở bằng `file://` chỉ thấy lời báo cách mở qua HTTP.

## MDAN-009 · Một màu xanh sáng, thang token cho chữ, bo góc, chiều cao · thay cho MDAN-002
19/11/2026 · `md-annotate/`

Chủ trang thấy trang dùng quá nhiều sắc xanh: chỉ giữ xanh sáng `--accent` (`#22c55e` sáng, `#4ade80` tối). Nền nhạt,
highlight, gạch chân, vùng chọn phản chiếu pha từ chính nó; không còn xanh đậm. Xanh sáng trên nền trắng chỉ ~2,3:1 nên
không làm chữ: chữ từng xanh thành mực, nhấn bằng vạch, nền nhạt hoặc huy hiệu; chữ trên nền xanh là `--on-accent`.
Cỡ chữ, bo góc, chiều cao điều khiển và khoảng cách theo thang token ở `css/tokens.css`; mỗi họ component (nút, nhóm tab,
ô nhập, chip, huy hiệu, thẻ, hộp thoại) cùng cao, cùng bo, cùng chữ, cùng trạng thái. Nền, mực và font vẫn chép từ trang chủ.
