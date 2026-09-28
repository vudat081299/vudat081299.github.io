# Việc dở — `read-excel-file-to-table/`

## NỢ

- **Hai thẻ `<script>` trỏ vào file không tồn tại.** `index.html` nạp `./Upload.js` và
  `./text.js`; cả hai không có trong repo, nên mỗi lần mở trang là hai lỗi 404 trong console.
  Công cụ **vẫn chạy**, vì mọi hàm nó cần nằm trong khối script inline — đã thử bằng Chrome thật:
  một file `.xlsx` ba dòng dựng ra bảng đủ dòng tiêu đề và ba dòng dữ liệu, không lỗi JS nào. Sửa:
  xoá hai thẻ ấy.
- **`main.js` là mã chết.** Trang không nạp nó, và nó nhắm vào phần tử trang không có (xem
  `CLAUDE.md`). Hoặc xoá, hoặc nối vào trang thay cho khối inline — đừng để hai bản logic song song.
- **Tràn ngang ở khổ 320px**: ô chọn file thò ra 41px (`scrollWidth − clientWidth`, Chrome thật).
  Từ 390px trở lên thì không tràn.
