# `loto/` — thống kê xổ số miền Bắc

Một trang, **`loto.html`**: bảng nhiệt 100 số × N ngày cùng các biểu đồ thống kê (lô gan,
nóng/lạnh, đầu/đuôi, χ², entropy, kỳ vọng âm của nhà cái). Thông điệp của trang: kết quả ngẫu
nhiên và kỳ vọng âm — nó là công cụ hiểu trò chơi, không phải công cụ dự đoán.

Kết quả XSMB nhiều năm được **nhúng sẵn trong chính file**, trong thẻ
`<script type="text/csv" id="xsmb-data">` — phần lớn dung lượng của `loto.html` là dữ liệu ấy.
Đừng Read cả file để tìm hiểu trang; đọc hai tài liệu trước:

- `docs/loto-summary.md` — trang có gì, từng khối UI để làm gì.
- `docs/loto-experiment.md` — thí nghiệm backtest chiến lược: giao thức, độ đo, cách đọc kết quả.

## Mở

Mở thẳng `loto.html` trong trình duyệt là chạy — dữ liệu nằm sẵn trong file, không cần server.
Nút "Cập nhật mới nhất" tải bản mới từ `raw.githubusercontent.com`
(`khiemdoan/vietnam-lottery-xsmb-analysis`); không có mạng thì trang dùng dữ liệu nhúng.

## Cổng

**Không có.** Không hook, không CI nào kiểm `loto/`. Sửa xong thì tự mở trang ra xem, ở cả khổ
điện thoại lẫn khổ rộng.

## Phụ thuộc

- **Nó dùng:** Google Fonts (có font hệ thống dự phòng), và nguồn dữ liệu ngoài ở trên khi bấm
  cập nhật. Không dùng `web-builder.css`, không dùng file nào của project khác. Chỉ có nền tối
  (`color-scheme: dark`), không dùng khoá theme `hub-theme` của cả site; `localStorage` chỉ giữ
  bảng màu người dùng chọn (`loto-pal`).
- **Dùng nó:** trang chủ có một mục trỏ tới `loto/loto.html` trong `data/collection.json`. Đổi
  tên hay dời file thì `tools/lint-collection.py` đỏ vì href chết — sửa mục ấy cùng lúc.
- `tools/smoke-index.js` gõ "loto" vào ô tìm kiếm của trang chủ và đòi đúng một kết quả. Đổi tên
  mục trên trang chủ thì sửa cả phép kiểm ấy.
