# `masters-degree/data-management-visualization/` — môn IT5425

- `data-management-visualization.html` (trang môn): tự chứa, dạy lại môn Data Management and Visualization theo
  đúng thứ tự mười ba file slide (1, 2.1, 2.2, 3 … 12). Mở thẳng là chạy.
- `sports-monitoring-project.html` (trang đồ án): đồ án nhóm ngoại lai, ANOM, CUSUM, SPRT trên dữ liệu thể thao;
  chấm điểm nguồn, phương án, chia việc. Chữ lặp ở `data/sports-monitoring-project.json`.
- Chỉ nạp font Google. Không build. Cả hai trang có mục trên trang chủ (section Master's Degree); hero trang môn
  có nút sang trang đồ án.
- Không có cổng riêng. Cổng tĩnh của `pages/` chạy tay được, với đường dẫn tuyệt đối:
  `python3 pages/tools/lint-pages.py "$PWD/masters-degree/data-management-visualization/<file>"`.
- Đo hai chế độ đọc (chạy tay, không phải cổng):
  `python3 masters-degree/data-management-visualization/tools/measure-modes.py <file> -v`.

## Bảng màu (DMV-002)

- Một bản giao diện, màu trang chủ: đen, trắng, một xanh lá, tiêu đề Space Grotesk.
- Năm màu: trắng, đen, xanh lá, trắng pha xanh (`--a-soft`), đen pha xanh (`--a`). Cả hai phần dùng `--a` làm `--acc`.
- Xanh tươi `--green` / `--green-hi` chỉ cho chi tiết nhỏ (gạch nhãn, thanh tiến độ, mục đang đọc, gạch chân link,
  mục đã xem); không tô khối lớn. Trong `.map`, `--a` đổi sang `--green-hi` cho tuyến A.
- Hình, `.demo`, `summary` đóng và `.f-bg` nằm trong thẻ trắng nên tô `--inset` (trắng ở theme sáng);
  không đặt `--bg` xám trong thẻ trắng.

## Cấu trúc trang môn

- Thứ tự: thanh trên → `#tong-quan` (hero, cách đọc, lộ trình gợi ý, thẻ câu hỏi từng bài, bản đồ môn) →
  Phần A (bài 1–5) → Phần B (bài 6–12) → `#nguon`.
- Một bài là `<section class="chap part-a|part-b" data-no data-short data-map>`. Mục lục, thẻ câu hỏi, số phút,
  ga trên bản đồ, dòng tiến độ, link bài trước/sau, số hình và số liệu hero đều do JS dựng; đừng viết tay.
- Toạ độ ga trên bản đồ khai trong JS theo id bài (`POS`); thêm bài thì thêm toạ độ.
- Thứ tự trong bài: `.chap-head` (`h2`, `p.chap-q`, `p.chap-links`) → `.skel` (bản đồ bài) → `.chap-tools` (JS điền)
  → `.nodes` (mỗi khái niệm một `article.node`, luôn mở) → `.recap` → `details.quiz`.
- `p.chap-links`: "Dựa vào: … · Dùng lại ở: …", link tới bài hoặc mục khác.
- Hộp trong `.skel` ứng với một mục thì bọc bằng `<a href="#<id mục>" class="sk">` (cả rect lẫn chữ).
- Dòng đầu mỗi `.demo`: `<p class="try"><b>Thử:</b> …</p>`.
- `figcaption` không tự ghi số; JS thêm "Hình <bài>.<k>" và id `hinh-<bài>-<k>` cho figure chưa có id.
- `id` trong bài bắt đầu bằng id của bài: `b1-…`, `b2-1-…`, `b12-…`. Không đổi id đã có: nơi khác link vào.

## Hai độ sâu: khung xương và Đọc liền (REPO-026)

- Mục: `article.node` > `header.node-h` (`span.node-k`, `h3.node-t`) + `div.node-body`. Không dùng `section` cho mục.
- Phần luôn mở của mục: tối đa một hình cơ chế, rồi 1–3 câu ý lõi. Không bảng, code, danh sách, `h4`, ghi chú slide.
- Chi tiết: `details.more` > `summary` + `div.more-body`, đặt ngay sau ý nó mở rộng; một mục có nhiều khối được; không lồng.
- Nhãn `summary` nói rõ bên trong có gì, tốt nhất là câu người đọc sẽ hỏi tiếp; không ghi "Xem thêm".
- Khung xương đứng một mình: không trỏ tới thứ chỉ có trong khối gập; thuật ngữ ở câu lõi, recap, câu quiz được giải
  nghĩa ngay ở phần mở.
- Mở hết thì đọc liền: câu đầu khối gập nối từ ý ngay trên, không lặp, không định nghĩa lại.
- Cỡ khung xương khoảng 25–35% số chữ của bài: chỉ báo để phát hiện bài lệch xa, đo bằng `tools/measure-modes.py`;
  không cắt khung xương cho đạt số (REPO-027).
- Trong một mục và trong một khối gập: hình trước, chữ sau; đoạn văn tối đa ba câu.
- Ghi chú đối chiếu slide: `<p class="slide-note">` cuối `more-body` của khối nó đối chiếu; CSS thêm nhãn "Đối chiếu slide".

## Giao diện

- Màu chỉ khai ở token `:root` / `[data-theme="dark"]`, chép lại bản sáng trong `@media print`.
- Bảng màu biểu đồ `--c1…--c6` trầm: lục, lam than, vàng đất, mận, xám, xanh đá. Chú giải gọi tên màu phải khớp.
- Chữ trắng `.t-on` trên `--c1…--c6`, `--a`, `--b` đạt 4.5:1 ở theme sáng; đổi token thì tính lại.
- SVG tô bằng lớp `f-*`, `s-*`, `t-*`; không ghi mã màu. Mũi tên dùng chung: `url(#arr)`, `url(#arr-a)`, `url(#arr-b)`.
- Marker cố định 8 đơn vị hình (`markerUnits="userSpaceOnUse"`, `refX="4"`): đầu nhọn nằm 4.8 đơn vị sau điểm cuối
  của nét. Nét có mũi tên dừng ở mép đích − 6 (đầu nhọn cách mép 1.2); nét không mũi tên chạm đúng mép hộp.
- Mỗi `path` mang marker chỉ có một nét con (một `M`); nhiều nhánh thì nhiều `path`.
- Nhãn chữ trong hình không nằm đè lên nét.
- `rect.s-line` dùng `--stroke` (3:1 với nền); `path`/`line` `.s-line` giữ `--line-2` cho lưới.
- SVG có `min-width` theo bề rộng viewBox (JS gán `--vbw`), hẹp hơn thì cuộn ngang kèm gợi ý; `.fit` bỏ min-width.
- Ở ≤ 600px, `.skel` hiện danh sách mục do JS dựng; hình bản đồ bài mở bằng nút "Xem bản đồ bài".
- localStorage: `hub-theme` (theme, chỉ ghi khi bấm nút), `dmv-opened` (mục đã xem), `dmv-read-all` (công tắc Đọc liền).
- Mục tính "đã xem" khi nằm trên màn hình ít nhất 1,5 giây; khi in thì không tính.
- Đọc liền mở mọi `details` trừ `details.quiz` và giữ chỗ đang đọc; đáp án quiz chỉ mở khi in.
- Link, hash, `#hinh-…` tới id nằm trong khối gập: JS mở mọi khối tổ tiên rồi cuộn tới.
- In: `beforeprint` mở mọi `details`, `afterprint` trả lại.
- Viền một hoặc hai cạnh thì không bo góc (REPO-025).

## Nội dung

- Không ghi tên giảng viên hay người soạn slide.
- Slide chỉ có hình mà mang kiến thức thì vẽ lại bằng SVG, không nhúng ảnh.
- Kiến thức đề cương có mà slide không dạy: mục ngắn trong bài gần nhất, `p.slide-note` ghi theo đề cương nằm trong khối
  gập của mục ấy.

## Trang đồ án `sports-monitoring-project.html`

- Thứ tự: hero (có `#ke-hoach`) → `#de-tai` → `#lineage` → `#cham-diem` (biểu đồ, `#hai-vong`, thẻ nguồn) → `#top-3`
  → `#lo-trinh` → `#can-xac-nhan` → `#thuat-ngu` → `#nguon`. Thêm mục thì sửa luôn chip `.jump` ở hero.
- `#top-3` và `#lo-trinh` ở nửa dưới theo ý chủ trang; muốn dễ thấy thì sửa khung `#ke-hoach`, đừng dời hai mục ấy lên.
- Chữ lặp ở `data/sports-monitoring-project.json`; văn xuôi độc nhất ở HTML (REPO-001).
- Trang đọc JSON bằng `fetch`: chạy `python3 -m http.server` ở gốc repo. Mở bằng `file://` thì `#notice` hiện.
- Chỉ trường tên kết thúc bằng `_html` vào `innerHTML`, kể cả mảng (`pros_html`, `tasks_html`: từng phần tử); JS ném
  lỗi nếu trường khác bị đưa vào.

### Số do JS tính, đừng ghi tay

- Điểm tổng, kết luận, thứ tự thanh, số trên chip, số đếm ở hero: từ `scores`, `criteria[].weight`, `verdicts[].min`.
- Điểm tổng hiện một chữ số, làm tròn xuống (`fmt1`), để con số không bao giờ vượt ngưỡng kết luận.
- `scores` theo đúng thứ tự `criteria`. Đổi điểm thì sửa `why_html` cho khớp; điểm vòng trước để ở `scores_r1`.
- `rounds[].src` trỏ tới một nguồn có `scores_r1`: bảng hai vòng tự in "điểm cũ → điểm mới".
- `options[].src`: điểm của phương án là điểm tổng của nguồn ấy; `[data-total="<id>"]` trong HTML cũng lấy từ đó.
- `sprt_check`: p1, a, b tính từ p0, draw, alpha, beta; chèn bằng `<span data-calc>`. Số đã kiểm trên CSV
  (`stop`, các tỉ lệ trong `notes_html`) chỉ sửa khi chạy lại trên dữ liệu.
- p0, p1 và mọi tham số khác chỉ lấy từ Phase I; kết quả chạy trên mùa được kiểm để ở `check_html` (nhãn "Kiểm tra khả thi").
- Tổng trang (`report`), tổng phút (`slides`), pha của mỗi vai (suy từ `phases[].roles`), nhãn tuần trên lịch.

### Các khối

- `#ke-hoach`: bốn câu hỏi lấy từ `plan_a[].q`, việc tuần 1 từ `week1` (mỗi vai một dòng). Sửa câu hỏi ở `plan_a`.
- Thẻ nguồn là `details`, gập mặc định thành một dòng; bấm thanh biểu đồ hay link `#src-…` thì mở thẻ ấy.
- `#de-tai`: hình SPRT dùng tham số chung chung, không phải tham số của đồ án.
- `#can-xac-nhan`: `#gvMsg` là tin nhắn gửi giảng viên, đánh số câu; bẫy 6 trỏ "câu 5". Đổi thứ tự câu thì sửa chỗ trỏ.
- `#thuat-ngu`: thuật ngữ dùng ở hero, `#de-tai`, `#top-3`, `#lo-trinh` (kể cả mọi pha) hiện sẵn; còn lại trong
  `#glossMore`.
- `options[].fit` chấm 1–3 theo `fit_rows`; nhiều chấm là tốt hơn ở tiêu chí ấy.
- `phases`: `start`, `len` là phần trăm tổng thời gian; nút 4/6/8/10 tuần (mặc định 6) chỉ đổi nhãn tuần và số ngày.
- Bấm một pha, hoặc Tab rồi Enter, mở khung chi tiết; mũi tên lên xuống chuyển pha. Ở ≤ 600px lịch thành danh sách.
- Rê, focus hay bấm một vai thì tô các pha của vai ấy; bấm lần nữa thì bỏ.
- `flow`, `flow_out`: mỗi ô có `phase`, bấm thì mở pha ấy. Ô có `demo: true` nối vào ô Demo qua đường gom bên phải.
  SVG vẽ theo bề rộng thật, theo luật mũi tên ở mục Giao diện.
- "Ví dụ quen thuộc" (`methods[].familiar_html`) so với việc theo dõi một app di động; không nhắc tới chủ trang.
- Bốn hình nhỏ ở `#de-tai` dùng số giả lập, luôn kèm nhãn "minh hoạ, số giả lập".

### Thuật ngữ, link, nội dung

- Bọc thuật ngữ bằng `<span class="term">…</span>`, trong HTML hay trong trường `_html`. Khoá tra là `data-t` hoặc chính
  chữ, khớp `id`, `term` hoặc `aliases` của `glossary`; thiếu thì console báo "Thiếu thuật ngữ".
- Chú giải hiện khi rê chuột, khi focus bàn phím và khi chạm; Esc đóng; luôn nằm trong khung nhìn.
- `#thuat-ngu` dựng từ toàn bộ `glossary` (hai phần), cho khi in và khi đọc trên điện thoại.
- Kết luận trên biểu đồ có nhãn chữ ở mỗi thanh, không chỉ bằng màu.
- Link sang trang môn dùng id bài (`b1`, `b2-2`, `b3`…) hoặc id mục (`b1-quy-trinh`, `b3-nifi`). Đổi id bên trang môn
  thì sửa `lessons` trong JSON và link trong HTML.
- Viết cho người mới: câu ngắn, mỗi thuật ngữ có chú giải.
- "Chưa ai làm" thì viết "chúng tôi không tìm thấy", không khẳng định là không có.
- Câu hỏi chờ chủ trang nằm ở `#can-xac-nhan` và trong `HANDOFF.md`; có câu trả lời thì sửa cả hai.
- Không ghi tên chủ trang, thành viên nhóm hay giảng viên; tên tác giả bài báo thì được.
- Ngày kiểm link ở trường `checked` của JSON.
