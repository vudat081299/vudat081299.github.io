# Việc dở — `portfolio/`

## NỢ

Link tương đối gãy — đo lại bằng cách dò mọi `src`/`href`/`url()` trỏ vào file trong repo:

- `ClockComponent/index.html` — nút *Home* trỏ `../index.html`, mà `portfolio/` không có
  `index.html`. Lối vào thật là `../index-portfolio.html`.
- `GlassCard/index.html` — ba ảnh thẻ `assets/img/img1.jpg`, `img2.jpg`, `img3.jpg` không có
  trong repo; chỉ có `assets/img/avar.jpg` (ảnh mà `poem/` dùng — đừng xoá nó khi dọn thư mục này).
- `TextInputCSS/index.html` — nạp `./script.js`, file không tồn tại.
- `style.css` — con trỏ chuột `url(sun.png)` trỏ vào file không tồn tại; trình duyệt rơi về con
  trỏ dự phòng `no-drop`.

Không phải link gãy nhưng đo được:

- `index-portfolio.html` tràn ngang ở khổ điện thoại: 80px ở 320, 98px ở 390 (`div.text-zone` /
  `h1.blast-root`, Chrome thật); ở 1280 thì không tràn.
