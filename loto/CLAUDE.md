# `loto/` — thống kê xổ số miền Bắc

- Một trang, `loto.html`: bảng nhiệt 100 số × N ngày và các biểu đồ thống kê. Thông điệp: kết quả ngẫu nhiên,
  kỳ vọng âm — công cụ để hiểu trò chơi, không để dự đoán.
- Dữ liệu XSMB nhúng sẵn trong file (`<script type="text/csv" id="xsmb-data">`), nên file rất dài. Đừng đọc
  cả file; đọc `docs/loto-summary.md` (trang có gì) và `docs/loto-experiment.md` (thí nghiệm backtest).
- Mở thẳng `loto.html` là chạy. Nút "Cập nhật mới nhất" tải từ `raw.githubusercontent.com`
  (`khiemdoan/vietnam-lottery-xsmb-analysis`); không có mạng thì dùng dữ liệu nhúng.
- Không có cổng. Sửa xong thì mở trang ở khổ điện thoại và khổ rộng.
- Chỉ có nền tối, không dùng khoá theme `hub-theme`; `localStorage` chỉ giữ bảng màu (`loto-pal`).
- Trang chủ trỏ tới `loto/loto.html`, và `tools/smoke-index.js` tìm "loto" rồi đòi đúng một kết quả. Đổi tên
  thì sửa cả hai.
