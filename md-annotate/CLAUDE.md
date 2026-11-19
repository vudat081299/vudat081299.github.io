# `md-annotate/` — nhận xét lên văn bản markdown, gom thành prompt

- Một trang, `index.html`: dán văn bản markdown, xem ở *Nguồn* hoặc *Hiển thị* (máy rộng có *Song song*), bôi
  đen một đoạn để ghi nhận xét, mọi nhận xét gom thành một prompt theo thứ tự trong văn bản.
- CSS và JS inline trong `index.html`. Chữ lặp duy nhất là gợi ý mặc định: `data/hints.json` (REPO-001).
- Văn bản mẫu (nút *Văn bản mẫu*) và câu mẫu của lời dẫn đầu là khối độc nhất, nằm trong HTML.
- Trang chủ trỏ tới `md-annotate/`; đổi tên thư mục thì `tools/lint-collection.py` đỏ.

## Giao diện

- Token màu và font chép từ `index.html` gốc (REPO-023). Mã màu chỉ khai ở `:root` / `html.dark`.
- Theme: khoá chung `hub-theme`, đặt trước lần vẽ đầu; chưa chọn thì theo hệ điều hành (REPO-024).
- Điện thoại (≤ 720px): một cột, vùng chạm ≥ 44px, thanh đáy có nút chép, không có *Song song*.
- Hộp nhận xét: chuột thì mở ngay khi thả; cảm ứng và bàn phím thì hiện nút nổi *Nhận xét đoạn đã chọn*.
  Máy hẹp hoặc màn cảm ứng: hộp là tấm trượt đáy.
- Đoạn đang chọn tô bằng CSS Custom Highlight (`::highlight(ma-pending)`), không sửa DOM: sửa DOM giữa lúc
  kéo chuột làm mất vùng chọn.
- Highlight của nhận xét là `<mark class="ma-hl" data-ids>`; số thứ tự hiện bằng `::after`, nên không lọt vào
  chữ của chế độ xem.

## Neo đoạn trích

- Mỗi nhận xét lưu `quote`, `prefix`, `suffix` (48 ký tự), `origin` (`src` | `md`) và `rel` (vị trí tương đối),
  kiểu TextQuoteSelector của W3C Web Annotation. Không lưu offset: văn bản đổi thì offset sai.
- Mỗi lần vẽ, tìm lại đoạn trích trong cả nguồn lẫn bản dựng: tầng 1 khớp nguyên văn sau khi gộp khoảng
  trắng; tầng 2 chỉ so chữ và số, chữ thường, bỏ cú pháp markdown có chữ (`SYNTAX`).
- Đoạn trích xuất hiện nhiều lần: chọn chỗ khớp `prefix` / `suffix` dài nhất, rồi gần `rel` nhất.
- Không tìm thấy ở cả hai chế độ: nhận xét mất neo, hiện `!` trong danh sách và không vào prompt.
- Chọn ở *Nguồn* thì trích đúng nguồn markdown; chọn ở *Hiển thị* thì trích chữ đã dựng.
- Thứ tự trong prompt là thứ tự đoạn trích trong nguồn.

## Prompt

- Hai kiểu: gọn `1. "trích" — nhận xét` (mặc định) và khối `### 1` + `> trích` + nhận xét.
- Lời dẫn đầu, cuối và tuỳ chọn kèm toàn văn (trong khối rào dài hơn mọi dãy backtick của văn bản).

## Gợi ý nhận xét

- Đếm số lần dùng theo khoá chuẩn hoá (`normKey`); xếp theo số lần, rồi lần dùng gần nhất, rồi thứ tự gốc.
- Tỉ lệ hiện trên gợi ý: (số lần + 1) / (tổng số lần + số gợi ý). Hộp nhận xét hiện 6 gợi ý đầu.
- Nhận xét gõ tay ≤ 80 ký tự được đếm; dùng từ hai lần trở lên thì thành gợi ý.
- Bỏ gợi ý là ẩn, không xoá số đếm: gợi ý mặc định không quay lại khi nạp lại `data/hints.json`.

## Lưu trữ

- Mọi lần đọc ghi `localStorage` bọc try/catch; hỏng thì trang vẫn chạy, chỉ báo một lần.
- Khoá: `md-annotate:index:v1` (danh sách phiên), `md-annotate:s:<id>` (một phiên), `md-annotate:current`,
  `md-annotate:stats:v1` (số đếm gợi ý), `md-annotate:prefs:v1` (chế độ xem, kiểu prompt, lời dẫn mặc định).
- Đổi cấu trúc phiên thì tăng hậu tố `v1` và chuyển dữ liệu cũ, đừng bỏ.
- Phiên trống (không văn bản, không nhận xét) không vào lịch sử.
- Mở file hoặc văn bản mẫu khi phiên đang có nội dung thì mở phiên mới, không ghi đè.

## An toàn

- Markdown dựng bằng `marked` rồi làm sạch bằng `DOMPurify`, cả hai ghim phiên bản và có `integrity`.
- Chỉ một chỗ gán `innerHTML`: HTML đã qua DOMPurify. Mọi chỗ khác dựng DOM bằng `h()` và `textContent`.
- Thiếu mạng thì *Hiển thị* báo lỗi, *Nguồn* vẫn dùng được.
- Mở bằng `file://`: trang báo không nạp được `data/hints.json`; mọi thứ khác vẫn chạy.

## Cổng: `sh md-annotate/tools/check.sh`

- `tools/lint.py`: `data/hints.json` đúng khuôn và không trùng; một chỗ `innerHTML`; script ngoài ghim
  phiên bản và có `integrity`.
- Cổng không bấm nút. Sửa sự kiện, neo hay giao diện thì chạy `tools/smoke.cjs` (CI chưa chạy): dán, bôi đen
  ở hai chế độ, gõ và bấm gợi ý, prompt, chép, mất neo, tải lại, lịch sử, theme, khổ 390px.
  Chạy tay: `python3 -m http.server 8347` ở gốc repo, rồi
  `node md-annotate/tools/smoke.cjs http://127.0.0.1:8347/md-annotate/`.
