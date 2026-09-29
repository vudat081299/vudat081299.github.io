# HANDOFF — shop/

Chỉ việc chưa xong; xong thì xoá khỏi đây và ghi vào [HISTORY.md](HISTORY.md).

## CHỜ CHỦ TRANG

Chờ chủ repo, hoặc chủ shop qua chủ repo. Có thông tin rồi thì làm phần của agent ghi trong dòng.

- Buổi gặp đầu với chủ shop chưa diễn ra: đọc [docs/04-NEGOTIATION.md](docs/04-NEGOTIATION.md)
  trước; buổi đầu để khám phá, không để trình diễn.
- Giá vốn một cây nến (`V`): cùng xem file Excel của chủ shop (câu E4 ở 04; xem cùng, không xin file vì
  nó chứa thông tin khách), rồi tính hai cách ở [docs/06-VALUE-CHAIN.md](docs/06-VALUE-CHAIN.md) §4.
  Có `V` thì quyết lại mức giảm giá của hộp quà (sổ nợ 9b).
- Nội dung thật của 5 mùi: điền `data/shop.json`, hạ 10 cờ `placeholder` (`scents` + `products`),
  chỉnh trọng số Tìm mùi rồi đọc dòng phân bố (SHOP-002). Các cờ còn lại (ship, thanh toán, cam kết
  thương hiệu) hỏi riêng.
- Số tài khoản ngân hàng: điền `payment.methods[bank].bank`, đặt `ready: true`; cổng kiểm BIN và số
  tài khoản.
- Shop có đủ điều kiện dùng API Shopee không: mở `https://banhang.shopee.vn/edu/article/8450` và
  `/8451` bằng trình duyệt (máy không đọc được); chưa xác minh thì đừng hứa đồng bộ Shopee.
- Nghĩa vụ thông báo website sau 01/07/2026: hỏi luật sư một câu hẹp (sổ nợ mục 5).

## NỢ

- Sổ nợ đầy đủ ở [docs/TECH-DEBT.md](docs/TECH-DEBT.md) và giữ ở đó: `docs/`, một ADR và
  `docs/index.html` trỏ vào nó theo số thứ tự. Sáu khoản đầu chặn việc bán thật.
- Sổ nợ có hai dòng cùng số 6 (quyền riêng tư; số phiên bản của `g` trong giỏ): đánh lại số thì sửa
  mọi chỗ trỏ tới.
- Chân trang ở màn hẹp: chữ `scentsitive.vn` (eyebrow cột 1) tràn sang cột 2, đè lên "Cửa hàng" ở 320
  và 600px, vừa chạm ở 390px. Có từ trước; cột 1 của `.foot__grid` quá hẹp so với chữ giãn cách.
