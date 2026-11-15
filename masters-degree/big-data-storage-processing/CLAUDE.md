# `masters-degree/big-data-storage-processing/` — môn IT4043E

- Một trang tự chứa, `big-data-storage-processing.html`: dạy lại môn Lưu trữ và xử lý dữ liệu lớn theo đúng
  thứ tự các file slide (1, 2, 3.1, 3.3, 4.1, 4.2, 4.3, 4.6, 5 … 10).
- Chỉ nạp font Google. Không build, mở thẳng là chạy. Có mục trên trang chủ (section Master's Degree).
- Không có cổng riêng. Cổng tĩnh của `pages/` chạy tay được, với đường dẫn tuyệt đối:
  `python3 pages/tools/lint-pages.py "$PWD/masters-degree/big-data-storage-processing/big-data-storage-processing.html"`.

## Cấu trúc trang

- Thứ tự: thanh trên → `#tong-quan` (bản đồ bốn chặng + nền móng, đường đọc theo slide) → cách đọc → 14 bài.
- Một bài là `<section class="chap" id="b…" data-stage data-lec data-short>`. `data-stage` là một trong
  `found`, `ingest`, `store`, `process`, `query`.
- Số bài, dải chặng, mục lục, chip trên bản đồ, đường đọc và nút "sang bài sau" do JS dựng từ các section ấy;
  đừng viết tay.
- Thứ tự trong bài: `.chap-head` (h2 + `.lede` một câu) → `.fig.map` (bản đồ bài) → `.keys` (thẻ khái niệm)
  → sơ đồ cơ chế → `details.deep` (chi tiết, đóng sẵn) → `.quiz` → `.recap`.
- Đoạn văn tối đa ba câu. Cơ chế vẽ được thì vẽ bằng SVG inline, không nhúng ảnh slide.
- `id` trong bài bắt đầu bằng id của bài: `b5-…`, `b4-3-…`.

## Giao diện

- Màu chỉ khai ở token `:root` / `html.dark`. Mỗi chặng một màu (`--found` … `--query`), áp vào bài qua `--acc`.
- SVG mang class `dg`; tô bằng lớp `bx`, `bxa`, `bxh`, `ln`, `lna`, `t2`, `ta`…, không ghi mã màu.
  Màu chặng khác trong một hình: bọc `<g class="c-store">`. Mũi tên: `url(#ah)`, `url(#ah-<stage>)`, `url(#ah-bad)`.
- Hình chạy từng bước: `figure.fig.stepper` + `ol.steps`; phần tử SVG có `data-s`, `data-only`, `data-dim`.
  JS chung tự thêm nút.
- Tab: `.tabs > section.tab[data-label]`.
- Theme: khoá `localStorage['hub-theme']`; bài đã mở lưu ở `bd-seen`.

## Nội dung

- Không ghi tên giảng viên, phòng, giờ học.
- Hai file slide Spark Streaming gộp vào bài 8; hai file slide bài 10 gộp vào một bài.
- Ví dụ số (word count, PageRank, quorum, vector clock, K-means…) phải tính thật và khớp hình.
