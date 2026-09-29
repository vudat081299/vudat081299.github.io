# `read-excel-file-to-table/` — Excel thành bảng HTML

- Một trang, `index.html`: chọn file `.xlsx`/`.xls`, *Export To Table* dựng sheet đầu tiên thành bảng,
  *Get Code* lấy mã HTML của bảng.
- Toàn bộ logic nằm trong khối `<script>` cuối `index.html`; giao diện ở `styles.css`.
- Mở thẳng `index.html` là chạy. Cần mạng: thư viện nạp từ cdnjs, ghim phiên bản trong URL.
- Không có cổng. Sửa xong thì thử thật với một file `.xlsx` vài dòng.
- Trang chủ trỏ tới `read-excel-file-to-table/index.html`; đổi tên thì `tools/lint-collection.py` đỏ.
