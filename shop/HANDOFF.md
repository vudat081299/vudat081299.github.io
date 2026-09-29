# HANDOFF — việc dở của shop/

Chỉ việc chưa xong. Làm xong một mục thì xoá nó khỏi đây và ghi phiên ấy vào
[HISTORY.md](HISTORY.md). Luật ở [CLAUDE.md](CLAUDE.md), quyết định đã chốt ở
[DECISIONS.md](DECISIONS.md), sổ nợ kỹ thuật ở [docs/TECH-DEBT.md](docs/TECH-DEBT.md).

## CHỜ CHỦ TRANG

Những việc chờ người thật — chủ repo, hoặc chủ shop qua chủ repo. Agent không tự làm được; có
thông tin rồi thì làm phần việc của agent ghi trong từng dòng.

- **Buổi gặp đầu với chủ shop chưa diễn ra.** Đọc [docs/04-NEGOTIATION.md](docs/04-NEGOTIATION.md)
  trước khi đi. Mục tiêu buổi đầu là *khám phá*, không phải trình diễn — hôm đó nói nhiều hơn
  nghe thì buổi gặp hỏng.
- **Giá vốn một cây nến (`V`).** Thiếu nó thì mọi phép tính chỉ nói về doanh thu. Cách hỏi tốt
  nhất là xin cùng xem file Excel của chủ shop (câu E4 ở 04 — cùng xem, không xin file, vì nó chứa
  thông tin khách), rồi tính hai cách ở [docs/06-VALUE-CHAIN.md](docs/06-VALUE-CHAIN.md) §4; câu
  trả lời từ trí nhớ nhiều khả năng thiếu cây lỗi, cây thử, bao bì. Chưa ai xem file ấy, nên §7
  của 06 toàn là điều kiện *"nếu file có…"*, còn số minh hoạ ở §4 và lịch ngược tháng 12 là số
  bịa có nhãn. Có `V` rồi thì quyết lại mức giảm 8% và 14% của hộp quà (sổ nợ 9b).
- **Nội dung 5 mùi hương** → điền vào `data/shop.json`, hạ **10** cờ `placeholder` (`scents` 5 +
  `products` 5). 18 cờ còn lại là chính sách ship, thanh toán và cam kết thương hiệu — phải hỏi
  riêng. Có mùi thật thì chỉnh trọng số Tìm mùi theo mùi thật, rồi chạy lại cổng và đọc dòng
  phân bố (SHOP-002).
- **Số tài khoản ngân hàng** → bật VietQR: điền `payment.methods[bank].bank` rồi đặt
  `ready: true`; cổng kiểm định dạng BIN và số tài khoản.
- **Shop có đủ điều kiện dùng API Shopee không**: mở `https://banhang.shopee.vn/edu/article/8450`
  và `/8451` bằng trình duyệt — máy không đọc được hai trang đó. Chưa xác minh thì đừng hứa đồng
  bộ Shopee.
- **Nghĩa vụ thông báo website sau 01/07/2026**: hỏi luật sư một câu hẹp — sổ nợ mục 5.

## NỢ

- `shop/tools/lint-shop.py` là bản chép thứ ba của bộ kiểm HTML (sau `pages/` và `cooking/`), và chưa có
  ba phép kiểm svg / cây tiêu đề / aria-label. `pages/` và `cooking/` nay dùng chung
  `tools/htmlcheck.py`; cho shop dùng nó luôn thì hết một bản chép.

- **Sổ nợ đầy đủ nằm ở [docs/TECH-DEBT.md](docs/TECH-DEBT.md), và giữ nguyên ở đó** — các tài liệu
  trong `docs/`, một ADR và trang đọc `docs/index.html` trỏ vào nó theo từng số thứ tự. Sáu khoản
  đầu chặn việc bán thật: cờ placeholder, VietQR, form đơn không gửi đi đâu, trang cảm ơn, thủ tục
  thông báo, quyền riêng tư. Sổ có hai dòng cùng mang số 6 (quyền riêng tư; số phiên bản của `g`
  trong giỏ) — đánh lại số thì sửa luôn mọi chỗ trỏ tới.
- **Máy chính chưa cài sẵn gì cho tầng 2 của `check.sh`.** Không có `playwright-core` ở Node nào,
  cache Chromium của Playwright rỗng, và `node` mặc định là v16 trong khi `playwright-core` cần
  ≥ 20 — nên chạy trơn thì `smoke.js` thoát mã 2 và `check.sh` vẫn in *XONG*. Chạy được mà không
  cài gì toàn máy: cài `playwright-core` vào một thư mục tạm, rồi
  `PATH=/opt/homebrew/bin:$PATH NODE_PATH=<thư mục tạm>/node_modules CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" sh shop/tools/check.sh`.
  Cài hẳn (hoặc dựng một lệnh gói sẵn) thì xoá mục này.
- **`shop/` không có lớp cổng thứ ba.** Có post-edit (lớp 1), pre-commit (lớp 2) và
  `gates.yml` (lớp 4), nhưng không `pre-push` nào chạy `lint-shop.py`, nên commit vào bằng
  `--no-verify`, merge hay cherry-pick chỉ bị bắt ở CI. Thêm `shop/tools/hooks/pre-push` — bộ điều
  phối tự tìm nó — rồi bỏ chữ "chưa có" ở bảng lớp cổng của `docs/05-ARCHITECTURE.md`.
