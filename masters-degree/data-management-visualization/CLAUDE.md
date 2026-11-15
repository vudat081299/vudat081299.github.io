# `masters-degree/data-management-visualization/` — môn IT5425

- Một trang tự chứa, `data-management-visualization.html`: dạy lại môn Data Management and Visualization theo
  đúng thứ tự mười ba file slide (1, 2.1, 2.2, 3 … 12).
- Chỉ nạp font Google. Không build, mở thẳng là chạy. Có mục trên trang chủ (section Master's Degree).
- Không có cổng riêng. Cổng tĩnh của `pages/` chạy tay được, với đường dẫn tuyệt đối:
  `python3 pages/tools/lint-pages.py "$PWD/masters-degree/data-management-visualization/<file>"`.

## Hai bản giao diện (tạm, chờ chủ trang chọn — xem HANDOFF.md)

- `data-management-visualization.html` (kem) và `data-management-visualization-green.html` (màu trang chủ: đen,
  trắng, một xanh lá, tiêu đề Space Grotesk) có cùng `<body>` và JS; chỉ khác `<style>` và `aria-current` trong `nav.ver`.
- Sửa nội dung thì sửa cả hai file giống hệt nhau. Mục trên trang chủ trỏ bản kem.
- Bản xanh: cả hai phần dùng `--a` làm màu nhấn; `--b` (than chì) chỉ còn cho tuyến B trên bản đồ.

## Cấu trúc trang

- Thứ tự: thanh trên → `#tong-quan` (hero, cách đọc, lộ trình gợi ý, thẻ câu hỏi từng bài, bản đồ môn) →
  Phần A (bài 1–5) → Phần B (bài 6–12) → `#nguon`.
- Một bài là `<section class="chap part-a|part-b" data-no data-short data-map>`. Mục lục, thẻ câu hỏi, số phút,
  ga trên bản đồ, dòng tiến độ, link bài trước/sau, số hình và số liệu hero đều do JS dựng; đừng viết tay.
- Toạ độ ga trên bản đồ khai trong JS theo id bài (`POS`); thêm bài thì thêm toạ độ.
- Thứ tự trong bài: `.chap-head` (`h2`, `p.chap-q`, `p.chap-links`) → `.skel` → `.chap-tools` (JS điền) →
  `.nodes` (mỗi khái niệm một `details.node`, đóng sẵn) → `.recap` → `details.quiz`.
- `p.chap-links`: "Dựa vào: … · Dùng lại ở: …", link tới bài hoặc nút khác.
- Hộp trong `.skel` ứng với một nút thì bọc bằng `<a href="#<id nút>" class="sk">` (cả rect lẫn chữ).
- Tiêu đề nút: `<h3 class="node-t">` trong `summary`; heading trong thân nút là `h4`.
- Trong một nút: hình trước, chữ sau; đoạn văn tối đa ba câu.
- Dòng đầu mỗi `.demo`: `<p class="try"><b>Thử:</b> …</p>`.
- Ghi chú đối chiếu slide: `<p class="slide-note">` cuối thân nút; CSS thêm nhãn "Đối chiếu slide".
- `figcaption` không tự ghi số; JS thêm "Hình <bài>.<k>" và id `hinh-<bài>-<k>` cho figure chưa có id.
- `id` trong bài bắt đầu bằng id của bài: `b1-…`, `b2-1-…`, `b12-…`. Không đổi id đã có: nơi khác link vào.

## Giao diện

- Màu chỉ khai ở token `:root` / `[data-theme="dark"]`, chép lại bản sáng trong `@media print`.
- Phần A dùng `--a` (xanh), Phần B `--b` (cam), qua `--acc`.
- Bảng màu biểu đồ `--c1…--c6`: lam, cam đất, lục, tím hồng, xám đá, xanh ngọc. Chú giải gọi tên màu phải khớp.
- Chữ trắng `.t-on` trên `--c1…--c6`, `--a`, `--b` đạt 4.5:1 ở theme sáng; đổi token thì tính lại.
- SVG tô bằng lớp `f-*`, `s-*`, `t-*`; không ghi mã màu. Mũi tên dùng chung: `url(#arr)`, `url(#arr-a)`, `url(#arr-b)`.
- `rect.s-line` dùng `--stroke` (3:1 với nền); `path`/`line` `.s-line` giữ `--line-2` cho lưới.
- SVG có `min-width` theo bề rộng viewBox (JS gán `--vbw`), hẹp hơn thì cuộn ngang kèm gợi ý; `.fit` bỏ min-width.
- Ở ≤ 600px, `.skel` hiện danh sách nút do JS dựng; hình khung xương mở bằng nút "Xem hình khung xương".
- localStorage: `hub-theme` (theme, chỉ ghi khi bấm nút), `dmv-opened` (nút đã mở), `dmv-read-all` (công tắc Đọc liền).
- Nút mở bằng code (Đọc liền, Mở hết, in) chỉ tính "đã mở" khi người đọc thấy nó trên màn hình.
- In: `beforeprint` mở mọi `details`, `afterprint` trả lại.

## Nội dung

- Không ghi tên giảng viên hay người soạn slide.
- Slide chỉ có hình mà mang kiến thức thì vẽ lại bằng SVG, không nhúng ảnh.
