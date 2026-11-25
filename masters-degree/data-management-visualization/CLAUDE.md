# `masters-degree/data-management-visualization/` — môn IT5425

- `data-management-visualization.html` (trang môn): tự chứa, dạy lại môn Data Management and Visualization theo
  đúng thứ tự mười ba file slide (1, 2.1, 2.2, 3 … 12). Mở thẳng là chạy.
- Đồ án nhóm (ngoại lai, ANOM, CUSUM, SPRT trên dữ liệu thể thao) có hai trang con (DMV-005):
  trang 1 `sports-monitoring-project.html` (từ đề tài tới phương án, chốt gì trước khi làm) và
  trang 2 `sports-monitoring-build.html` (làm đề tài A từ đầu tới cuối). Chữ lặp ở `data/<tên trang>.json`.
- Chỉ nạp font Google. Không build. Trang chủ có mục trang môn và mục đồ án (trỏ trang 1); hero trang môn có nút
  sang trang 1.
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

## Đồ án: hai trang con (DMV-005)

- Hai trang có chung `nav.subpages` ngay dưới `header.top` ("1 · Chọn đề tài", "2 · Làm đề tài A") và khối CSS
  `/* ═══ TRANG CON ═══ */`; sửa ở trang này thì sửa y hệt trang kia.
- Trang đọc JSON bằng `fetch`: chạy `python3 -m http.server` ở gốc repo. Mở bằng `file://` thì `#notice` hiện.
- Chỉ trường tên kết thúc bằng `_html` vào `innerHTML`, kể cả mảng; JS ném lỗi nếu trường khác bị đưa vào.
- Thuật ngữ và nguồn gập chung trong `details#phu-luc`; link hay hash tới đích trong khối gập thì `openTo` mở khối.
- Link sang phần thi công luôn trỏ trang 2. Trang 1 chuyển hash cũ (`#lt-…`, `#cong-thuc`) qua bảng `MOVED` trong JS;
  dời một mục thì thêm dòng.

### Trang 1 `sports-monitoring-project.html`

- Thứ tự: hero (sơ đồ `#journey`, `#ke-hoach`) → `#de-tai` (có `#lineage`) → `#tim-nguon` → `#cham-diem` → `#top-3`
  → `#chon` → `#truoc-khi-lam` (`#can-chot`, `#cau-hoi`) → `#can-xac-nhan` → `#phu-luc`. Thêm mục thì sửa chip `.jump`
  và `journey`.
- Chặng lấy từ `journey`; mỗi mục chặng có `div.eyebrow[data-stage]` (JS điền "Chặng k / n") và `p.stage-why`.
- `agree[].when` chọn mốc trong `bands`; `agree[].build` là id bước ở trang 2, tên lấy từ `build_steps`.
- `plan_a` ở trang 1 chỉ có câu hỏi và `decision_html` (ai quyết định gì, DMV-004); cách làm và số đã kiểm ở trang 2.
- Điểm tổng, kết luận, thứ tự thanh, số trên chip, số đếm ở hero: tính từ `scores`, `criteria[].weight`,
  `verdicts[].min`. Điểm tổng hiện một chữ số, làm tròn xuống (`fmt1`). `scores` theo đúng thứ tự `criteria`; đổi điểm
  thì sửa `why_html`. Điểm vòng trước ở `scores_r1`, `scores_r2`.
- `options[].src`: điểm phương án là điểm tổng của nguồn ấy; `[data-total="<id>"]` cũng lấy từ đó. `options[].fit`
  chấm 1–3 theo `fit_rows`.
- Thẻ nguồn nằm trong `#cardsBox` (gập); bấm thanh biểu đồ hay link `#src-…` thì mở thẻ ấy rồi cuộn tới.
- `#de-tai`: hình minh hoạ dùng số giả lập, luôn kèm nhãn "minh hoạ, số giả lập".
- `#can-xac-nhan`: `#gvMsg` (tin nhắn gửi giảng viên, đánh số câu), `#fdMsg` (thư tiếng Anh xin phép
  football-data.co.uk, không tên người, không tên trường), việc nhóm tự chốt.
- "Ví dụ quen thuộc" (`methods[].familiar_html`) so với việc theo dõi một app di động; không nhắc tới chủ trang.

### Trang 2 `sports-monitoring-build.html`

- 16 bước, id cố định: `#khoi-dong`, `#bai-toan`, `#nguon-du-lieu`, `#kien-truc`, `#mo-hinh-du-lieu`, `#thu-nap`,
  `#lam-sach`, `#eda`, `#ke-hoach-phan-tich`, `#phuong-phap`, `#kiem-chung`, `#truc-quan`, `#demo`, `#gioi-han`,
  `#bao-cao`, `#tai-lap`; thêm `#lich`, `#vai`, `#repo`, `#xong`. Trang 1 và trang khác link vào: không đổi id.
- Mỗi bước: phần luôn hiện (câu hỏi, tên chung, vào → ra, sơ đồ, các dòng "Chốt", "Xong khi"); phần gập (phương án khác
  của từng chốt: vì sao không, khi nào nên chọn; việc, file, vai, bài môn; code; bẫy; dùng lại). `h2` trùng `steps[].title`.
- Mỗi chỗ phải chốt thì chốt một phương án và liệt kê phương án khác; không để "tuỳ nhóm".
- Số kết quả lấy từ lần chạy thử đề tài A (results/*.csv); chạy lại thì sinh lại JSON, đừng sửa tay. Hình kết quả ghi
  nhãn "Số thật"; hình giả lập ghi "minh hoạ, số giả lập".
- Sơ đồ mô tả bằng toạ độ trong `DG` của JS; chữ tràn hộp thì console báo "Chữ tràn hộp".
- `phases`: `start`, `len` là phần trăm tổng thời gian; nút số tuần chỉ đổi nhãn tuần và số ngày. Pha của mỗi vai suy từ
  `phases[].roles`; tổng trang (`report`) và tổng phút (`slides`) do JS tính.
- Glossary trang 2 chỉ giữ thuật ngữ có trên trang; mã luật chất lượng (B1…, F1…) không tự bọc.

### Thuật ngữ, link, nội dung

- Mọi thuật ngữ, viết tắt, tên công cụ hay tổ chức lạ với người mới phải có mục trong `glossary` (DMV-003).
- JS (`autoTerms`) tự bọc lần đầu mỗi mục glossary trong mỗi đoạn (`p`, `li`, `td`…). Khoá có chữ hoa khớp đúng hoa
  thường; khoá chữ thường thì không phân biệt.
- Không tự bọc: tiêu đề, link, nút, `summary`, `code`, SVG, `.msg`, `#thuat-ngu`, `#nguon`; bốn phương pháp chính,
  lợi thế sân nhà, α, β. Chỗ ấy cần chú giải thì bọc tay.
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
