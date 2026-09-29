# `poem/` — thơ Việt

- Mỗi bài thơ một trang HTML (`truyen-kieu.html`, `thu-dieu.html`…), dùng chung `style.css` và `main.js`.
- Lời thơ nằm trong `main.js`, hàm `mount(name)`, mỗi bài một nhánh `name === "…"`. Sửa câu thơ là sửa `main.js`.
- Thêm một bài: chép một trang có sẵn, thêm một nhánh trong `mount()`, và thêm một dòng vào thanh bên của
  mọi trang (thanh bên chép tay vào từng file).
- `searchTags`, `findBestMatch` trong `main.js` hiện không được gọi (ô tìm kiếm đang bị comment).
- Mở thẳng một trang là chạy. Cần mạng cho Bootstrap và bộ icon từ jsDelivr.
- Không có cổng. Sửa xong thì mở trang ra xem.
- Ảnh đại diện lấy từ `../portfolio/GlassCard/assets/img/avar.jpg`: dời thư mục ấy là gãy ảnh mọi trang thơ.
- Trang chủ không trỏ tới đây, nhưng thư mục vẫn được deploy: mọi trang công khai ở URL trực tiếp.
