# `masters-degree/data-management-visualization/` — môn IT5425

- Một trang tự chứa, `data-management-visualization.html`: dạy lại môn Data Management and Visualization theo
  đúng thứ tự mười ba file slide (1, 2.1, 2.2, 3 … 12).
- Chỉ nạp font Google. Không build, mở thẳng là chạy. Có mục trên trang chủ (section Master's Degree).
- Không có cổng riêng. Cổng tĩnh của `pages/` chạy tay được: `python3 pages/tools/lint-pages.py <file>`.

## Cấu trúc trang

- Thứ tự: thanh trên → `#tong-quan` (bản đồ hai tuyến, thẻ câu hỏi từng bài, cách đọc) → Phần A (bài 1–5) →
  Phần B (bài 6–12) → `#nguon`.
- Một bài là `<section class="chap part-a|part-b" data-no data-short data-map>`. Mục lục, thẻ câu hỏi, ga trên
  bản đồ, chip nút và số liệu hero đều do JS dựng từ các section này; đừng viết tay.
- Thứ tự trong bài: `.chap-head` (câu hỏi của bài) → `.skel` (hình khung xương) → `.chap-tools` (JS điền) →
  `.nodes` (mỗi khái niệm một `details.node`, đóng sẵn) → `.recap` → `details.quiz`.
- Trong một nút: hình trước, chữ sau; đoạn văn tối đa ba câu.
- `id` trong bài bắt đầu bằng id của bài: `b1-…`, `b2-1-…`, `b12-…`.

## Giao diện

- Màu chỉ khai ở token `:root` / `[data-theme="dark"]`. Phần A dùng `--a` (xanh), Phần B `--b` (cam), qua `--acc`.
- SVG tô bằng lớp `f-*`, `s-*`, `t-*`; không ghi mã màu. Mũi tên dùng chung: `url(#arr)`, `url(#arr-a)`, `url(#arr-b)`.
- Theme: khoá `localStorage['hub-theme']`; nút đã mở lưu ở `dmv-opened`.

## Nội dung

- Không ghi tên giảng viên hay người soạn slide.
- Slide chỉ có hình mà mang kiến thức thì vẽ lại bằng SVG, không nhúng ảnh.
