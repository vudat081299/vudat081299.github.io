# HANDOFF — pages/

## CHỜ CHỦ TRANG

- ML 101 và Toán cho ML — đề xuất cấu trúc, chỉ làm khi chủ trang gọi (PAGES-004):
  - ML 101: tách chương 10 thành "CNN" và "Dùng CNN"; tách transfer / multi-task / end-to-end khỏi chương 8.
  - ML 101: mô hình attention đủ ba bước; PCA tương tác; thanh ngưỡng precision/recall; cổng kiểm mọi chip
    thuật ngữ có trong GLOSS.
  - Toán: đảo 3.9 (kỳ vọng, phương sai) lên trước 3.7–3.8, vì hai mục ấy dùng σ trước khi định nghĩa.
  - Toán: ô TOÁN cho chặng 3–4; khối "span, cơ sở, số chiều" ở chặng 1; hộp "một phía hay hai phía" ở 4.7.
  - Toán: m6 thêm trục thử tự xoay; m8 thêm hướng u xoay được; mô hình đường hợp lý L(p) cho 4.3.
- jazz-piano-theory: bản rà nội dung của chủ trang (một artifact, không nằm trong repo) chưa đối chiếu hết.
- Ba trang sách (books-in-brief, how-to-lie-with-statistics, a-short-history-of-nearly-everything): ghi chú
  biên tập cũ (độ dài so với đề bài, thứ tự chương, giọng vài đoạn) đã gỡ khỏi web ở commit 5bb410d. Muốn
  làm tiếp thì xem diff của commit ấy; không bắt buộc.

## NỢ

- `scooter-maintenance-guide.html`: mục checklist là `<label>` không có ô input — không dùng được bằng bàn
  phím, không báo trạng thái đã tích.
- Sáu trang cho `.wb-navbar__brand` co bằng `flex: 0 1 auto`, điều `web-builder/CLAUDE.md` bảo đừng làm:
  books-in-brief, how-to-lie-with-statistics, a-short-history-of-nearly-everything, cryptography, relativity,
  finance-econ-rulebook. Đổi sang span cắt chữ.
- `jazz-piano-theory.html` lưu theme ở khoá `nlp-theme`, không phải `hub-theme` chung của site.
- how-to-lie-with-statistics: ví dụ bại liệt có 680 người đối chứng, không khớp tiêu đề "Không có nhóm để so".
- a-short-history-of-nearly-everything: bảng 7.2 ghi một dòng "xác nhận", dòng song song "bị bác" — đối chiếu
  lại với sách.
- family-insurance-benefits, wealth-roadmap (không lên web): thanh trên cùng xuống hai hàng ở khoảng 940–1200px.
