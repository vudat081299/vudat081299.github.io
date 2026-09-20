# ADR 0005 — Ẩn icon cho tới khi font ligature nạp xong

**Ngày:** 20/09/2026 · **Trạng thái:** đang áp dụng

## Bối cảnh

Toàn bộ icon dùng Material Symbols Rounded qua **ligature**: chữ `shopping_bag` chỉ biến thành
cái túi khi font đã về. Font ấy nằm ở Google Fonts, tức là một máy chủ khác.

Đo được trong phiên 20/09/2026: máy không ra được `fonts.googleapis.com`, và nút giỏ hàng đọc
thành `dark_modeshopping_bag`. Danh sách "vì sao lại là mùi này" ở trang Tìm mùi thì mỗi dòng
mở đầu bằng chữ `arrow_right_alt`.

## Quyết định

`html.js .ms { visibility: hidden }`, và chỉ hiện khi `document.fonts.load()` báo font đã về.
**Không** có đường hết-giờ-thì-hiện-đại.

## Vì sao không có hẹn giờ dự phòng

Đã thử bản có hẹn giờ 2,5 giây rồi chụp lại: hết giờ, icon hiện ra thành chữ tiếng Anh nằm giữa
câu tiếng Việt. Xấu hơn hẳn một nút tròn trống. Mọi nút icon đều đã có `aria-label` nên máy đọc
màn hình không mất gì khi icon ẩn.

`.then(ok, ok)` bắt cả nhánh hỏng, nên mạng lỗi vẫn chốt và icon vẫn hiện. Trường hợp duy nhất
icon ẩn vĩnh viễn là request treo mãi không hỏng hẳn — hiếm, và khi đó ô trống vẫn đỡ hơn chữ.

Trình duyệt không có Font Loading API thì hiện luôn, không giấu.

## Đánh đổi chấp nhận

- Có một nhịp rất ngắn lúc mới vào trang mà icon chưa hiện. Chấp nhận: nhịp ấy ngắn hơn nhiều
  so với việc đọc phải chữ `shopping_bag`.

## Xét lại khi

Tự chứa font trong repo thay vì gọi Google Fonts. Lúc đó font về cùng lúc với CSS và cả quy tắc
này lẫn đoạn JS kèm theo đều bỏ được.
