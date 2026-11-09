# `portfolio/` — trang cá nhân cũ và vài component thử nghiệm

- Lối vào là `index-portfolio.html`. Thư mục không có `index.html`, nên `/portfolio/` trả 404.
- Mỗi thư mục con là một thí nghiệm độc lập, phần lớn chép từ CodePen (`README.md` trong đó ghi nguồn).
- Mở thẳng file là chạy. Cần mạng cho thư viện CDN (jQuery, GSAP, Velocity, boxicons).
- Không có cổng. Sửa xong thì mở trang ra xem, và đo tràn ngang ở 320px.
- Mọi trang theo `prefers-color-scheme` khi lần đầu mở. Theme thêm sau nằm trong khối `@media` cuối file CSS
  của trang.
- `ClockComponent/` có nút đổi theme, khoá `selected-theme`: đã chọn thì giữ; chưa chọn thì script đầu
  `<body>` theo hệ điều hành.
- `Universe/VirtualStar/`: nền tối giữ nguyên bản gốc; nền sáng là trời rạng sáng, sao tối màu. Màu sao ở
  `js/app.js` (`starConfig`), màu trời ở `css/style.css`.
- `GlassCard/assets/scss/` đã lệch khỏi `assets/css/styles.css`; trang chỉ nạp file `.css`.
- `poem/` và `index-portfolio.html` dùng ảnh `GlassCard/assets/img/avar.jpg`. Đừng xoá hay dời nó; kiểm
  `git grep -n "portfolio/" -- poem` trước khi động vào.
- Trang chủ không trỏ tới đây, nhưng thư mục vẫn được deploy: mọi trang ở đây công khai ở URL trực tiếp.
