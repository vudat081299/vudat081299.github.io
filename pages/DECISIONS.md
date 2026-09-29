# Quyết định — pages/

<!-- index:start -->
- PAGES-001 · Trang giải thích: dễ hiểu nhưng đủ kiến thức, visualize được thì phải visualize · `pages/*.html`
- PAGES-002 · jazz-piano-theory: giao diện tự do, không dựng theo skill · `pages/jazz-piano-theory.html`
- PAGES-003 · betting-strategy-lab: không có trên trang chủ nhưng vẫn lên web · `pages/betting-strategy-lab.html`
- PAGES-004 · ML 101 và Toán cho ML: đề xuất cấu trúc lớn chỉ đề xuất, không tự làm · `pages/machine-learning-101.html`, `pages/mathematics-for-machine-learning.html`
<!-- index:end -->

## PAGES-001 · Trang giải thích: dễ hiểu nhưng đủ kiến thức, visualize được thì phải visualize
09/09/2026 · `pages/*.html`

Trang giải thích một chủ đề chuyên môn phải dễ hiểu tới mức người không chuyên cũng theo được, **và** đủ kiến thức — cả hai là ràng buộc, không cái nào đổi lấy cái kia. Ý nào visualize được thì bắt buộc visualize.
Vì: "dễ hiểu" không có nghĩa là cắt bớt; đơn giản hoá mà làm phát biểu thành sai là hỏng cả hai.
Đừng coi khuôn "ba ô" (chuyện sờ được → ký hiệu chuẩn → dùng ở đâu) là bắt buộc — đó là cách một phiên chọn để đáp ứng yêu cầu, chủ trang chưa duyệt lại.

## PAGES-002 · jazz-piano-theory: giao diện tự do, không dựng theo skill
25/09/2026 · `pages/jazz-piano-theory.html`

Chủ trang bác giao diện cũ (dựng bằng skill) và yêu cầu thiết kế lại tự do, giữ nguyên tính năng: bộ "liner notes" hiện tại. Mọi chuyển động mới nằm trong một `<script>` "LỚP GIAO DIỆN" riêng ở cuối trang, chỉ đọc trạng thái và thêm class.
Đừng đưa trang về lại một skill hay bộ web-builder; sửa giao diện thì sửa ở lớp giao diện, đừng đụng các module hành vi.
Nguồn: f5210e7

## PAGES-003 · betting-strategy-lab: không có trên trang chủ nhưng vẫn lên web
21/09/2026 · `pages/betting-strategy-lab.html`

Trang push thẳng lên `main` như mọi trang, chỉ là trang chủ không trỏ tới. Nó nằm trong `UNLISTED` của `tools/lint-collection.py`, và cổng đòi `deploy.yml` KHÔNG có `--exclude` cho nó.
Đừng thêm `--exclude` cho trang này vì "trang chủ không link tới" — như thế là làm nhiều hơn điều được yêu cầu, trang sẽ biến mất khỏi web.
Nguồn: 16f2c58

## PAGES-004 · ML 101 và Toán cho ML: đề xuất cấu trúc lớn chỉ đề xuất, không tự làm
25/09/2026 · `pages/machine-learning-101.html`, `pages/mathematics-for-machine-learning.html`

Sau đợt rà hai trang theo bộ tiêu chí sư phạm của chủ trang, việc tách trang, tách chương hay đảo chương thì chỉ đề xuất, không tự làm. Danh sách đề xuất đang chờ nằm ở `pages/HANDOFF.md`, mục CHỜ CHỦ TRANG.
Nguồn: d76644c, 60ec8d5
