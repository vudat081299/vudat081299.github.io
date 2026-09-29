# `portfolio/` — trang cá nhân cũ và vài component thử nghiệm

- Lối vào là `index-portfolio.html`. Thư mục không có `index.html`, nên `/portfolio/` trả 404.
- Mỗi thư mục con là một thí nghiệm độc lập, phần lớn chép từ CodePen (`README.md` trong đó ghi nguồn).
- Mở thẳng file là chạy. Cần mạng cho thư viện CDN (jQuery, GSAP, Velocity, boxicons).
- Không có cổng. Sửa xong thì mở trang ra xem, và đo tràn ngang ở 320px.
- `poem/` và `index-portfolio.html` dùng ảnh `GlassCard/assets/img/avar.jpg`. Đừng xoá hay dời nó; kiểm
  `git grep -n "portfolio/" -- poem` trước khi động vào.
- Trang chủ không trỏ tới đây, nhưng thư mục vẫn được deploy: mọi trang ở đây công khai ở URL trực tiếp.
