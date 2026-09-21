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

Trình duyệt không có Font Loading API thì hiện luôn, không giấu.

## Sửa ngày 21/09/2026 — bản đầu của quyết định này KHÔNG chạy

Bản viết ngày 20/09 chốt bằng `document.fonts.load(...).then(ok, ok)`, và ADR này từng khẳng
định rằng "`.then(ok, ok)` bắt cả nhánh hỏng, nên mạng lỗi vẫn chốt và icon vẫn hiện" — coi đó
là điểm mạnh. Câu ấy **sai**, và sai theo hướng phá đúng thứ ADR này lập ra để chặn.

Đo lại bằng trình duyệt thật, chặn `fonts.googleapis.com`:

| Cách kiểm | Trả về khi font KHÔNG về | Dùng được? |
|---|---|---|
| `fonts.load(...).then(ok, ok)` | resolve, mảng **rỗng** — không reject | **không** |
| `document.fonts.check(...)` | `true` | **không** |
| `faces.length && mọi face 'loaded'` | `false` | **có** |

`fonts.load()` không reject khi tải hỏng: stylesheet không về thì `document.fonts` rỗng hoàn
toàn và promise vẫn resolve — với mảng rỗng. Nhánh `ok` vẫn chạy, class `icons` vẫn được gắn,
và hero hiện nguyên chữ `storefront`, `local_shipping`, `qr_code_2`. `check()` cũng không cứu
được: không có face nào khớp thì nó trả `true`, vì chữ vẫn vẽ được bằng font thay thế.

Dấu hiệu đúng duy nhất là mảng trả về **có** phần tử và mọi phần tử `status === 'loaded'`.

Hai điều rút ra, quan trọng hơn chính cái bug:

1. **Lỗi này chỉ lộ khi mạng hỏng, nên mạng tốt thì nó xanh mãi mãi.** Không cổng nào trong
   bốn lớp bắt được, kể cả `smoke.js` — vì `smoke.js` chạy ở nơi font vẫn về. Phải **dựng lại**
   tình huống hỏng chứ không đợi nó tự xảy ra. Nay có phép đo *"font hỏng thì không lộ chữ
   icon"* trong `tools/smoke.js`: nó `route(...).abort()` hai tên miền font rồi kiểm.
2. **Một ADR có thể tự mâu thuẫn mà không ai thấy.** Phần "Quyết định" nói ẩn icon khi font
   không về; phần "Vì sao" lại khoe rằng mạng lỗi thì icon **vẫn hiện**. Hai câu ấy nằm cách
   nhau sáu dòng trong cùng một file và đã sống một ngày. Viết xong một ADR thì đọc ngược phần
   lý do xem nó có đang bênh đúng cái quyết định bên trên không.

## Đánh đổi chấp nhận

- Có một nhịp rất ngắn lúc mới vào trang mà icon chưa hiện. Chấp nhận: nhịp ấy ngắn hơn nhiều
  so với việc đọc phải chữ `shopping_bag`.

## Xét lại khi

Tự chứa font trong repo thay vì gọi Google Fonts. Lúc đó font về cùng lúc với CSS và cả quy tắc
này lẫn đoạn JS kèm theo đều bỏ được.
