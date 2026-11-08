# HANDOFF — pages/

## CHƯA LÀM

- ML 101 chương 7 (`#s-deep`, mục 2–3): hình đường đồng mức elip với bốn đường đi cùng số bước — cả tập (mượt),
  mini-batch (zíc-zắc nhẹ), một ví dụ (zíc-zắc dữ), momentum (mượt lại). Đặt ngay dưới bảng mini-batch.
- ML 101 mô hình 4 (`#m4`): thêm hình thứ ba là đường cong học — điểm trừ đề ôn và đề thử theo số bài 8→40, ở bậc
  và λ đang chọn — để người đọc thấy hình mà chương 5, cách chữa 1 dạy đọc.
- `machine-learning.html`, đề xuất của lượt rà sư phạm vòng 3 (cần mô hình hoặc hình mới):
  - M3 (#s-scale): chip GD / Momentum / Adam trên bản chưa chuẩn hoá, cùng α; phải cho thấy momentum bớt nảy
    giữa hai vách khe và Adam đi gần thẳng. Đổi luật "Chạy cả hai" nên phải sửa cả phép kiểm M3 trong cổng.
  - M8 (#s-backprop): thêm một nút có hai đầu ra để bước ngược cho thấy hai đạo hàm cộng vào một nút.

## CHỜ CHỦ TRANG

- ML 101 và Toán cho ML — đề xuất cấu trúc, chỉ làm khi chủ trang gọi (PAGES-004):
  - ML 101: tách chương 10 thành "CNN" và "Dùng CNN"; tách transfer / multi-task / end-to-end khỏi chương 8.
  - ML 101: mô hình attention đủ ba bước; PCA tương tác; thanh ngưỡng precision/recall; cổng kiểm mọi chip
    thuật ngữ có trong GLOSS.
  - Toán: đảo 3.9 (kỳ vọng, phương sai) lên trước 3.7–3.8 cho mạch gọn hơn. Không bắt buộc: hộp định nghĩa
    μ, σ² và σ ở đầu 3.7 đã đủ để đọc theo thứ tự hiện tại.
  - Toán: ô TOÁN cho chặng 3–4; khối "span, cơ sở, số chiều" ở chặng 1; hộp "một phía hay hai phía" ở 4.7.
  - Toán: m6 thêm trục thử tự xoay; m8 thêm hướng u xoay được; mô hình đường hợp lý L(p) cho 4.3.
- jazz-piano-theory: bản rà nội dung của chủ trang (một artifact, không nằm trong repo) chưa đối chiếu hết.
- Ba trang sách (books-in-brief, how-to-lie-with-statistics, a-short-history-of-nearly-everything): ghi chú
  biên tập cũ (độ dài so với đề bài, thứ tự chương, giọng vài đoạn) đã gỡ khỏi web ở commit 5bb410d. Muốn
  làm tiếp thì xem diff của commit ấy; không bắt buộc.
- hidden-curriculum, đề xuất từ lượt rà toàn trang:
  - Rút bảo hiểm xã hội một lần (luật đổi năm 2025): đưa vào 1.5, 4.1, hay để cho `family-insurance-benefits.html`?
  - Phần 9 kém đòn bẩy với người đọc 26 tuổi: 9.3 "bản đồ văn minh"; "Khoe và không khoe" ở 9.1 lặp 5.6. Gộp hay cắt mục?
  - Chưa có cách xử lý khi bị nói xấu, tin đồn ở công sở; nếu thêm thì gộp vào 6.4, phần "Khi bị thiếu tôn trọng".
  - Lộ trình `dating` đã đủ 5 mục (trần của cổng), nên chưa có 6.1; muốn thêm thì đổi một mục.
- Chữ SVG trên điện thoại ở bốn trang ML / Toán / Causal: cỡ chữ theo viewBox (thường 620) nên ở 390px còn 4–6px,
  ở 320px còn 4–7px. Phóng chữ bằng media query thì chồng nhãn (Causal 1,5× → 97 chỗ; Toán 1,5× → 8 mô hình). Chọn
  một: bọc hình trong khung cuộn ngang `min-width:540px`, hay vẽ lại từng hình theo bề rộng cột. Đã nâng tạm năm hình
  của machine-learning (m2-nc, m4-loss, m8, m9-curve, m13) lên ~8px ở 390px.
## NỢ

- `machine-learning.html`: 608 thuật ngữ gạch chân là 608 điểm dừng Tab (hơn nửa số điểm dừng của trang).
- Bốn trang ML / ML 101 / Toán / Causal chưa có smoke trình duyệt (mẫu `shop/tools/smoke.js`, CI chạy). Cổng tĩnh
  không giữ được: popup thuật ngữ mở bằng phím rồi cuộn, ngăn mục lục (inert), aria-live chỉ đọc khi chữ đổi, tab
  bằng phím mũi tên, bản in theme tối giống bản in sáng (đủ tab, `details` mở), nhãn SVG không chồng/cắt (m6, m8,
  m11 của ML 101; M8 của ML), chữ nút chạy/Dừng, câu tự sinh của các mô hình chưa dựng lại được trong cổng
  (ML: M6, M13; Causal: sáu mô hình có quét trạng thái).
- `scooter-maintenance-guide.html`: mục checklist là `<label>` không có ô input — không dùng được bằng bàn
  phím, không báo trạng thái đã tích.
- Sáu trang cho `.wb-navbar__brand` co bằng `flex: 0 1 auto`, điều `web-builder/CLAUDE.md` bảo đừng làm:
  books-in-brief, how-to-lie-with-statistics, a-short-history-of-nearly-everything, cryptography, relativity,
  finance-econ-rulebook. Đổi sang span cắt chữ.
- `jazz-piano-theory.html` lưu theme ở khoá `nlp-theme`, không phải `hub-theme` chung của site.
- a-short-history-of-nearly-everything: bảng 7.2 ghi một dòng "xác nhận", dòng song song "bị bác" — đối chiếu
  lại với sách.
- family-insurance-benefits, wealth-roadmap (không lên web): thanh trên cùng xuống hai hàng ở khoảng 940–1200px.
