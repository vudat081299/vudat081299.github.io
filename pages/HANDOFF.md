# HANDOFF — pages/

## CHỜ CHỦ TRANG

- **ML 101 và Toán cho ML — đề xuất cấu trúc chưa làm** (PAGES-004: chỉ đề xuất, không tự làm).
  - ML 101: tách chương 10 thành "CNN" và "Dùng CNN".
  - ML 101: mô hình attention đủ ba bước (điểm = nhân từng cặp → softmax → trộn nội dung).
  - ML 101: PCA tương tác thay cho hình tĩnh.
  - ML 101: thanh ngưỡng precision/recall.
  - ML 101: cổng kiểm mọi chip thuật ngữ trong thân bài có trong GLOSS, và nhóm chương khớp.
  - ML 101: tách transfer / multi-task / end-to-end ra khỏi chương 8.
  - Toán: đảo 3.9 (kỳ vọng, phương sai) lên trước 3.7–3.8 — hai mục ấy dùng σ trước khi định nghĩa.
  - Toán: ô TOÁN cho chặng 3–4 (phần lớn mục ở hai chặng này chưa có khuôn ba ô).
  - Toán: m6 thêm "trục thử" tự xoay (thương Rayleigh); m8 thêm hướng u xoay được để hiện ∇f·u.
  - Toán: mô hình đường hợp lý L(p) cho 4.3.
  - Toán: khối "span, cơ sở, số chiều" ở chặng 1.
  - Toán: hộp "một phía hay hai phía, z là gì" ở 4.7.
- **jazz-piano-theory — bản rà nội dung.** Chủ trang từng tách yêu cầu thành "giao diện: làm lại, nội
  dung: rà". Bản rà (điểm, lỗi đã kiểm, tham chiếu chéo cũ, kế hoạch theo cấp) nằm ở một artifact của
  chủ trang, không ở trong repo. Đợt sau đó đã sửa tham chiếu chéo và thêm cổng `verify-jazz-piano.py`;
  phần còn lại của bản rà chưa được đối chiếu. Hỏi chủ trang trước khi sửa nội dung theo bản rà ấy.
  Liên quan: nhánh `claude/jazz-redesign-842466c0` (chưa merge) có commit 59aa04e sửa kiến thức —
  phần lớn các chỗ sai nó sửa vẫn còn trên trang (ví dụ Napoli ghi là "tritone sub của V/V",
  "Swing ⇒ mọi thứ trước 1970", "80% bản thu"). Patch không áp thẳng được vì trang đã dựng lại giao
  diện; phải áp lại bằng tay.
- **Tiêu đề tab tiếng Anh cho mọi trang?** Nhánh `claude/web-page-title-english-ba4ca1` (chưa merge,
  commit 96b69ff) đổi `<title>` của các trang sang tiếng Anh; gần như toàn bộ áp sạch. Chủ trang chưa
  chốt có muốn vậy không.
- **scooter-maintenance-guide — theme.** Một ghi chú cũ nói chủ trang muốn trang này giữ tối trước;
  commit dbd2fc7 sau đó cho nó theo hệ điều hành như mọi trang. Hỏi chủ trang muốn bên nào.

## NỢ

- `cryptography.html`: định nghĩa MAC vẫn là bản yếu ("m chưa từng hỏi") — bản đúng có ở nhánh
  `claude/review-learning-pages-ux-c78e73` (chưa merge).
- `machine-learning-101.html`: bí danh `phá đối xứng|đối xứng` của từ điển thuật ngữ bật popup sai
  chỗ (cùng nhánh trên).
- `how-to-win-every-argument.html`: tên trang dài tràn ngang ở thanh trên — đo được 62px ở 320px,
  22px ở 360px. Cách sửa là luật navbar trong `web-builder/CLAUDE.md`.
- Nợ đo được của cổng tĩnh nằm ở bảng `DEBT` trong `pages/tools/lint-pages.py` — không chép lại ở đây.
