# `masters-degree/big-data-storage-processing/` — môn IT4043E

- Một trang tự chứa, `big-data-storage-processing.html`: dạy lại môn Lưu trữ và xử lý dữ liệu lớn theo đúng
  thứ tự các file slide (1, 2, 3.1, 3.3, 4.1, 4.2, 4.3, 4.6, 5 … 10).
- Chỉ nạp font Google. Không build, mở thẳng là chạy. Có mục trên trang chủ (section Master's Degree).
- Hai bản giao diện, cùng nội dung, để chủ trang so sánh: `big-data-storage-processing.html` (màu theo chặng)
  và `big-data-storage-processing-v2.html` (khung theo trang chủ: trắng pha xanh, đen pha xanh, xanh lá để nhấn; tiêu đề Space Grotesk;
  màu chặng dịu chỉ trong sơ đồ và nhãn chặng; khung chú ý xanh dương / hổ phách).
  Hai bản chỉ khác `<style>`, các marker mũi tên và thanh trên. Sửa nội dung thì sửa cả hai file.
- Nút `.vswitch` trên thanh trên chuyển qua lại giữa hai bản, giữ bài đang đọc.
- Nút `#readBtn` "Đọc liền" (`aria-pressed`) mở mọi khối Chi tiết `details.deep`; đáp án `.quiz` vẫn gập để người đọc tự trả lời trước.
- Trạng thái Đọc liền lưu ở `localStorage['bd-read-all']` (`'1'` = bật), áp cho cả hai bản. Bật/tắt giữ nguyên chỗ đang đọc.
- Máy ≤ 640px nút chỉ còn biểu tượng; thanh trên ở 320px không được tràn ngang.
- Không có cổng riêng. Cổng tĩnh của `pages/` chạy tay được, với đường dẫn tuyệt đối:
  `python3 pages/tools/lint-pages.py "$PWD/masters-degree/big-data-storage-processing/big-data-storage-processing.html"`.

## Cấu trúc trang

- Thứ tự: thanh trên → `#tong-quan` (bản đồ bốn chặng + nền móng, đường đọc theo slide) → cách đọc → 14 bài → `#on-tap` (Ôn tập).
- Một bài là `<section class="chap" id="b…" data-stage data-lec data-short>`. `data-stage` là một trong
  `found`, `ingest`, `store`, `process`, `query`.
- Số bài, dải chặng, mục lục, chip trên bản đồ, đường đọc và nút "sang bài sau" do JS dựng từ các section ấy;
  đừng viết tay.
- Thứ tự trong bài: `.chap-head` (h2 + `.lede` một câu) → `.fig.map` (bản đồ bài, xem trước cả bài) → `.keys`
  (thẻ khái niệm) → các mục `h3.sec` → `section.recap` (h3 "Nhớ" + `ul`) → `.quiz`.
- Khối Chi tiết là `details.deep > summary + .deep-body`, đặt ngay sau ý nó mở rộng; một mục có thể có nhiều khối.
- Chữ của `summary` (và `.hint`) nói bên trong có gì; luật ở mục "Hai độ sâu đọc".
- Dòng "Chi tiết · n phút · có hình…" trên `summary` do JS tính từ số chữ, hình, bảng, code; đừng viết tay.
- Thuật ngữ giải nghĩa ở lần dùng đầu tiên; từ viết tắt viết đủ một lần.
- Mục "Ôn tập" cuối trang do JS gom từ các `.recap`; đừng viết tay.
- Đoạn văn tối đa ba câu. Cơ chế vẽ được thì vẽ bằng SVG inline, không nhúng ảnh slide.
- `id` trong bài bắt đầu bằng id của bài: `b5-…`, `b4-3-…`.

## Hai độ sâu đọc (REPO-026)

- Trang có hai chế độ: khung xương (mặc định, mọi khối Chi tiết gập) và Đọc liền (mở hết).
- Khung xương dẫn đường: người đọc thấy cả bài, thấy chỗ đáng đào, rồi tự mở chi tiết.
- Hai chế độ là hai độ sâu của cùng một bài, không phải "khung xương cộng phụ lục".

Khung xương đạt khi:

- Mỗi bài đọc trong vài phút và trả lời được: giải quyết vấn đề gì, gồm mảnh nào, các mảnh nối và chạy ra sao.
- Đứng một mình được: không câu nào trỏ tới thứ chỉ có trong khối gập.
- Thuật ngữ dùng ở khung xương được giải nghĩa ngay ở khung xương.
- Mỗi mục: tiêu đề, một sơ đồ cơ chế, 1–3 câu ý lõi; mục không có cơ chế để vẽ thì chỉ 1–3 câu.
- Luôn mở: bản đồ bài, thẻ khái niệm, hộp "Nhớ", câu hỏi quiz.
- Nhãn khối gập nói bên trong có gì, tốt nhất là câu người đọc sẽ hỏi tiếp; không ghi "Xem thêm" hay "Chi tiết" trơn.
- Vào khối gập: ví dụ tính tay dài, code, bảng tham số hay lệnh, bảng so sánh chi tiết, ngoại lệ, lịch sử phiên bản, ghi chú "slide cũ", số liệu phụ.
- Sơ đồ chỉ vào khối gập khi nó minh hoạ chi tiết, không phải cơ chế lõi.
- Chỉ báo cỡ: thân mục để mở (ngoài đầu bài, bản đồ, thẻ, Nhớ, câu hỏi quiz) khoảng 30–40% số chữ của bài,
  không tính đáp án quiz; cả khung xương thường 50–65%.

Đọc liền đạt khi:

- Mở hết rồi đọc từ trên xuống liền như một bài viết: không lặp ý, không câu nối gãy, không định nghĩa lại.
- Câu đầu của khối gập nối thẳng từ ý lõi ngay trên nó.
- Không khối gập nào chứa ý mà phần mở phía sau cần để hiểu.
- Link tới một `id` nằm trong khối gập phải mở khối ấy (JS chung đã làm).
- Khi dựng lại không đổi kiến thức: chỉ chuyển chỗ, gộp, cắt câu lặp, viết lại câu nối; thấy sai thì ghi lại, sửa ở lượt khác.

## Giao diện

- Màu chỉ khai ở token `:root` / `html.dark`. Mỗi chặng một màu (`--found` … `--query`), áp vào bài qua `--acc`.
- SVG mang class `dg`; tô bằng lớp `bx`, `bxa`, `bxh`, `ln`, `lna`, `t2`, `ta`…, không ghi mã màu.
  Thành phần thuộc chặng khác (HDFS, Kafka…) luôn bọc `<g class="c-<chặng>">` + `.bxa`; `--acc` chỉ cho thứ bài đang dạy.
  Mũi tên: `url(#ah)`, `url(#ah-<stage>)`, `url(#ah-bad)`; bản v2 lấy màu nét (`context-stroke`).
- Marker cỡ cố định (`userSpaceOnUse`, 9 đơn vị, `refX=7`). Đầu có mũi tên dừng cách mép hộp 3,3 đơn vị để
  mũi nhọn chạm mép; đầu không mũi tên chạm đúng mép.
- Sơ đồ vẽ 1:1 (`max-width` = bề rộng `viewBox`, JS đặt `--vbw`).
- Hình chạy từng bước: `figure.fig.stepper` + `ol.steps`; phần tử SVG có `data-s`, `data-only`, `data-dim`.
  JS chung tự thêm nút.
- Tab: `.tabs > section.tab[data-label]`.
- Theme: khoá `localStorage['hub-theme']`; bài đã mở lưu ở `bd-seen`.
- Mở khối gập bằng JS (Đọc liền, in) không được làm bài thành đã đọc trong `bd-seen`.
- In: JS mở mọi `details` (cả đáp án) rồi trả lại như cũ.

## Nội dung

- Không ghi tên giảng viên, phòng, giờ học.
- Hai file slide Spark Streaming gộp vào bài 8; hai file slide bài 10 gộp vào một bài.
- Ví dụ số (word count, PageRank, quorum, vector clock, K-means…) phải tính thật và khớp hình.
