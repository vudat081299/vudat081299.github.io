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
- **jazz-piano-theory — bản rà nội dung chưa đối chiếu xong.** Phạm vi chủ trang giao: giao diện làm
  lại, nội dung chỉ rà. Bản rà (điểm, lỗi đã kiểm, tham chiếu chéo cũ, kế hoạch theo cấp) nằm ở một
  artifact của chủ trang, không ở trong repo. Đã làm theo nó: tham chiếu chéo, cổng
  `verify-jazz-piano.py`, và các lỗi kiến thức mà nhánh rà cũ từng sửa (67a1d62…7d889b2). Phần còn lại
  chưa đối chiếu — hỏi chủ trang trước khi sửa nội dung theo bản rà ấy.
- **jazz-piano-theory — dòng chữ trên bìa "HỌC LẠI SAU 10 NĂM".** Nó nói về người đặt trang, không về
  nội dung (REPO-008), nhưng là một phần của bìa. Bỏ, hay giữ?
- **scooter-maintenance-guide — theme.** Trang đang theo theme của hệ điều hành như mọi trang (commit
  dbd2fc7), trong khi một ghi chú cũ nói chủ trang muốn nó tối trước. Hỏi chủ trang muốn bên nào.

## NỢ

- `jazz-piano-theory.html`, hai lỗi demo nhỏ ngoài đợt sửa kiến thức:
  - ①09 demo vòng hợp âm: lời nhắc "chú ý cú V→I ở cuối mỗi vòng" chỉ đúng với nút ii–V–I — mỗi vòng
    chỉ phát một lần, các vòng khác không tới V→I.
  - ⑤19 demo "Comping (Charleston)": nốt "và" của phách 2 vẫn phát thẳng, và bass C–E–G–A không tiếp
    cận gốc ô sau như luật walking bass ở ②04.
- Nợ đo được của cổng tĩnh nằm ở bảng `DEBT` trong `pages/tools/lint-pages.py` — không chép lại ở đây.
