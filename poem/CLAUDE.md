# `poem/` — thơ Việt

Mỗi bài thơ một trang HTML ở gốc thư mục (`truyen-kieu.html`, `thu-dieu.html`…), và mọi trang
dùng chung một khung: `style.css`, `main.js`, thanh bên liệt kê tất cả các bài.

**Lời thơ không nằm trong HTML.** Nó nằm trong `main.js`, hàm `mount(name)`: mỗi bài một nhánh
`name === "…"` giữ mảng các câu. Trang chỉ gọi `mount("<Tên bài>")` ở khối script cuối. Sửa một câu
thơ là sửa `main.js`. `main.js` còn vài hàm tìm câu (`searchTags`, `findBestMatch`) mà hiện không
ô nào trên trang gọi tới — ô tìm kiếm trong HTML đang bị comment lại.

Thêm một bài: một trang mới chép từ trang có sẵn, một nhánh mới trong `mount()`, và một dòng trong
thanh bên của **mọi** trang — thanh bên được chép tay vào từng file, không sinh ra từ đâu cả.

## Mở

Mở thẳng một trang là chạy, không cần server (không `fetch` gì). Cần mạng cho Bootstrap 5 và các
bộ icon nạp từ jsDelivr.

## Cổng

**Không có.** Không hook, không CI nào kiểm `poem/`, và cổng trang mồ côi của
`tools/lint-collection.py` cố ý không soi thư mục này. Sửa xong thì tự mở trang ra xem.

## Phụ thuộc

- **Nó dùng:** Bootstrap + bootstrap-icons + boxicons từ CDN; và **ảnh đại diện lấy từ
  `../portfolio/GlassCard/assets/img/avar.jpg`** — mọi trang thơ đều trỏ vào đó. Xoá, đổi tên hay
  dời thư mục ấy của `portfolio/` là gãy ảnh ở mọi trang thơ cùng lúc. Ảnh thứ hai của trang
  (một file `*-avar.jpeg` trong `assets/`) thì nằm ngay trong thư mục này.
- **Dùng nó:** không có gì trong repo trỏ tới `poem/` — trang chủ không có mục nào cho nó. Nhưng
  thư mục vẫn được deploy (không có `--exclude` trong `.github/workflows/deploy.yml`), nên mọi
  trang ở đây công khai ở URL trực tiếp.
