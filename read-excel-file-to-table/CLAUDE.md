# `read-excel-file-to-table/` — Excel thành bảng HTML

Một trang, **`index.html`**: chọn một file `.xlsx` / `.xls`, bấm để dựng sheet đầu tiên có dữ liệu
thành bảng HTML, rồi lấy mã HTML của bảng ấy để dán đi nơi khác. Toàn bộ logic nằm trong khối
`<script>` cuối `index.html` (`ExportToTable`, `BindTable`, `BindTableHeader`); giao diện ở
`styles.css`.

`main.js` **không** được `index.html` nạp. Nó là một phiên bản khác của cùng công cụ, nhắm vào
những phần tử (`#file-btn`, `#columns`, `#output`) không có trong trang. Sửa hành vi của trang thì
sửa khối script trong `index.html`, không phải `main.js`.

## Mở

Mở thẳng `index.html` là chạy — file Excel được đọc bằng `FileReader` ngay trong trình duyệt,
không lên server nào. Cần mạng: các thư viện nạp từ cdnjs (`xlsx.core`, `xls.core`, jQuery).

## Cổng

**Không có.** Không hook, không CI nào kiểm thư mục này. Sửa xong thì thử thật: chọn một file
`.xlsx` có vài dòng, bấm *Export To Table*, xem bảng hiện đủ dòng, rồi *Get Code*.

## Phụ thuộc

- **Nó dùng:** các thư viện trên cdnjs, ghim phiên bản trong URL. Không dùng `web-builder.css`,
  không dùng file nào của project khác, không dùng khoá theme của site.
- **Dùng nó:** trang chủ có một mục trỏ tới `read-excel-file-to-table/index.html` trong
  `data/collection.json` — đổi tên thư mục hay file thì `tools/lint-collection.py` đỏ vì href chết.

Nợ đang mở: [HANDOFF.md](HANDOFF.md).
