# `portfolio/` — trang cá nhân cũ và vài component thí nghiệm

Lối vào là **`index-portfolio.html`**, không phải `index.html` — thư mục không có `index.html`,
nên URL `/portfolio/` trả 404. Trang ấy dùng `style.css`, `main.js`, hai script trong
`Components/` (`header.js`, `sidebar.js`) cùng file âm thanh ở đó, và trỏ tới các thí nghiệm dưới.

Mỗi thư mục con là một thí nghiệm độc lập, phần lớn chép từ CodePen hay video hướng dẫn
(`ClockComponent/` và `GlassCard/` có `README.md` ghi nguồn): `ClockComponent/`, `GlassCard/`,
`Universe/VirtualStar/` — có đường vào từ `index-portfolio.html` — và `TextInputCSS/`, không có
đường vào nào. Chúng không dùng chung gì với phần còn lại của repo, trừ một ngoại lệ ở mục
*Phụ thuộc*.

## Mở

Mở thẳng `index-portfolio.html` (hoặc `index.html` của một thí nghiệm) là chạy, không cần server.
Cần mạng cho thư viện nạp từ CDN: jQuery, GSAP, Velocity (cdnjs) và boxicons (jsDelivr).

## Cổng

**Không có.** Không hook, không CI nào kiểm `portfolio/`, và cổng trang mồ côi của
`tools/lint-collection.py` cố ý không soi thư mục này. Sửa xong thì tự mở trang ra xem.

## Phụ thuộc

- **Nó dùng:** các thư viện CDN ở trên. Không dùng `web-builder.css`, không dùng khoá theme chung.
- **Dùng nó:** **`poem/` lấy ảnh đại diện từ `GlassCard/assets/img/avar.jpg`** — mọi trang thơ
  trỏ vào đó, và `index-portfolio.html` cũng vậy. Xoá, đổi tên hay dời `GlassCard/` (hay chỉ file
  ảnh ấy) là gãy ảnh ở mọi trang thơ; kiểm `git grep -n "portfolio/" -- poem` trước khi động vào.
- Trang chủ không có mục nào cho `portfolio/`, nhưng thư mục vẫn được deploy (không có
  `--exclude` trong `.github/workflows/deploy.yml`), nên mọi trang ở đây công khai ở URL trực tiếp.

Nợ đang mở: [HANDOFF.md](HANDOFF.md).
