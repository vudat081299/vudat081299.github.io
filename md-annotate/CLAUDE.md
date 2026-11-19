# `md-annotate/` — nhận xét lên văn bản markdown, gom thành prompt

- Một trang, `index.html`: dán văn bản markdown, xem ở *Source* hoặc *Preview* (đủ chỗ thì có *Split*), bôi đen
  một đoạn để ghi nhận xét, mọi nhận xét gom thành một prompt theo thứ tự trong văn bản.
- CSS và JS inline trong `index.html`. Chữ lặp duy nhất là gợi ý mặc định: `data/hints.json` (REPO-001).
- Văn bản mẫu (*Sample text*) và câu mẫu của lời dẫn đầu là khối độc nhất, nằm trong HTML.
- Trang chủ trỏ tới `md-annotate/`; đổi tên thư mục thì `tools/lint-collection.py` đỏ.

## Ngôn ngữ (MDAN-004)

- Mọi chữ trên giao diện bằng tiếng Anh: nút, nhãn, tooltip, placeholder, `aria-label`, toast, hộp thoại, văn bản
  mẫu, gợi ý mặc định. `<html lang="en">`.
- Chữ khung của prompt (câu số dòng, `Original text:`, câu mẫu lời dẫn) cũng tiếng Anh. Trích dẫn và nhận xét
  của người dùng giữ nguyên như đã gõ.
- Chú thích trong code, tài liệu `.md` và `desc` ở `data/collection.json` vẫn tiếng Việt.
- Số nhiều đi qua `plural(n, word)`; số và ngày định dạng `en` / `en-GB`.

## Giao diện

- Nền, mực và font chép từ `index.html` gốc; xanh lá riêng, sáng hơn (MDAN-002). Mã màu chỉ khai ở `:root` /
  `html.dark`.
- Nền nút chính và huy hiệu: `--accent` + chữ `--on-accent`. Chữ, viền, link xanh: `--green` (sắc đậm cùng họ).
- Theme: khoá chung `hub-theme`, đặt trước lần vẽ đầu; chưa chọn thì theo hệ điều hành (REPO-024).
- Khoảng cách theo thang `--s1`…`--s6`, bo góc `--r-sm` / `--r` / `--r-lg`, chuyển động `--dur` + `--ease`.
- Tiêu đề trang một dòng ở cột trái. Tên phiên sửa tại chỗ ở thanh của khung văn bản.
- Bề rộng (MDAN-005): `.ma-wrap` rộng `max(70vw, 1280px)`, không quá khung nhìn, căn giữa, lề `--pad`. Panel rộng `--side` (kéo `#panel-grip`,
  320–560, `prefs.side`), thu gọn thành `.ma-rail` 56px (`html.ma-railed`, `prefs.rail`); thanh dọc giữ nút chép.
- *Split* khi `#doc` đủ cho hai khung ≥ 420px (`splitOK()`), không theo media query. Chưa đủ chỗ thì hiện
  *Preview* nhưng `prefs.view` vẫn nhớ `split`. Hai khung cao `--pane-h` (JS: khung nhìn trừ đỉnh khung và 17px
  đáy, trừ thêm thanh đáy khi ≤ 1080px), cuộn riêng; trang không cuộn. Vách `#divider` lưu `prefs.split`.
- Hộp *Layout* (`#btn-layout`, `#dlg-layout`): bề rộng vùng làm việc (`prefs.wrap`: `auto` hoặc 50–100%, sàn 720px,
  đặt `--wrap-w`), khổ chữ *Preview* (`prefs.measure`: 0 = hết khung hoặc 50–140ch, `--md-max`), cỡ chữ *Preview*
  (`prefs.mdfs` 13–22px, `--md-fs`). Áp ngay khi kéo; hộp neo góc phải, nền sau trong suốt; điện thoại ẩn mục bề rộng.
- *Preview* mặc định rộng hết khung; trích khối là vạch trái một cạnh (không bo), bảng có viền ngoài bo góc.
- Trống văn bản: thẻ `#start` (vùng thả, *Paste from clipboard*, *Open .md file*, *Sample text*, ba bước) trên ô
  nhập thấp; có chữ thì ẩn thẻ, hiện hàng công cụ. Ctrl/⌘ + V ngoài ô nhập cũng dán khi còn trống.
- Một `<input type="file" id="file-in">` ẩn; mọi nút *Open .md file* (`.js-open`) gọi `click()` của nó.
- Hiệu ứng rê chuột bọc trong `@media (hover: hover)`, để màn cảm ứng không dính trạng thái rê.
- Phần tử ẩn cho trình đọc màn hình (`.ma-sr`) đặt `top: 0`, không thì nó đẩy trang dài thêm 1px.

## Panel bên phải

- Một panel (`#panel`): đầu có hai tab *Comments · N* / *Prompt*, thân là chỗ cuộn duy nhất, đáy ghim trạng thái,
  *Download .md* và *Copy prompt*. Nút chép luôn trong khung nhìn, dù bao nhiêu nhận xét (smoke đo với 32).
- Máy rộng (≥ 1081px): panel dính, chạy từ đỉnh vùng nội dung tới đáy khung nhìn. `top`, `height` của panel và
  `padding` trên dưới của lưới cùng dùng `--s4`: đổi một chỗ thì đổi cả ba.
- Tuỳ chọn prompt (kiểu, số dòng, tệp, toàn văn, lời dẫn) gập trong *Options* ở tab Prompt; dòng tóm tắt cạnh nhãn
  cho biết đang bật gì. Khung prompt cao theo nội dung; thân panel cuộn.
- ⌘/Ctrl + Shift + C chép prompt ở mọi chỗ. Chép xong nút đổi thành *Copied ✓* một lúc; báo đọc màn hình qua
  `#sr-live`. Toast chỉ dùng khi chép hỏng.
- ≤ 1080px: panel ẩn khỏi lưới; thanh đáy có *Comments · N* (mở panel trong tấm trượt `#dlg-panel`, đóng thì panel
  về chỗ cũ) và nút chép.
- Thẻ nhận xét: không viền; số, vị trí (L12), nhận xét nổi bật, trích dẫn mờ có vạch trái (một cạnh nên không bo,
  REPO-025). Nút sửa / xoá hiện khi rê hoặc focus; màn cảm ứng thì luôn hiện. Rê thẻ thì tô đoạn và ngược lại.
- Điện thoại (≤ 720px): một cột, vùng chạm ≥ 44px, không có *Split*. Lưu nhận xét không cuộn trang.
- Toast không nhận chuột (trừ nút *Undo*), để không chặn bôi đen chữ bên dưới; có hộp thoại mở thì toast nằm trong
  hộp thoại.
- Tối: tab đang chọn dùng `--tab-on` / `--tab-ring` (nền sáng hơn nhóm tab, viền xanh).

## Hộp nhận xét

- Khung soạn nổi: trích dẫn tối đa 2 dòng, dài hơn thì mờ dần (`.is-long`, mask theo `--ink`); chip gợi ý nền
  `--chip`, không viền; *Save* là nút `--accent`. Hiện ra có chuyển động ngắn, tắt khi `prefers-reduced-motion`.
- Chuột thì mở ngay khi thả; cảm ứng và bàn phím thì hiện nút nổi *Comment on selection*. Máy hẹp hoặc màn cảm
  ứng: hộp là tấm trượt đáy.
- Đoạn đang chọn tô bằng CSS Custom Highlight (`::highlight(ma-pending)`), không sửa DOM: sửa DOM giữa lúc kéo chuột
  làm mất vùng chọn.
- Highlight của nhận xét là `<mark class="ma-hl" data-ids>`; số thứ tự hiện bằng `::after`, nên không lọt vào chữ
  của chế độ xem.

## Tô màu và lề số dòng ở *Source* (MDAN-001)

- `tokens()` tách token theo dòng (khối rào, đầu mục, kẻ ngang, phân cách bảng, trích khối, dấu danh sách), rồi
  `inlineToks()` trong dòng (mã, link, thẻ HTML, URL, đậm, nghiêng, gạch, chuỗi, `|` của bảng).
- Token không chồng nhau, theo thứ tự. `paintSrc()` cắt nguồn theo mép token, mép highlight và đầu dòng; `<mark>`
  bọc ngoài `<span class="sx-*">`. Không bao giờ gán innerHTML từ chữ người dùng.
- Text của `#v-src` phải đúng bằng nguồn: vùng chọn, neo, số dòng đều đếm trên nó (smoke kiểm).
- Màu chỉ ở token `--sx-*`; mỗi màu ≥ 4,5:1 trên nền thẻ và trên `--hl` / `--hl-2`, cả hai theme.
- Nút *Syntax colors* lưu ở `prefs.syntax`; tắt thì khung là chữ trơn.
- Lề số dòng: mỗi dòng một `<span class="ma-ln">` (block, giữ cả ký tự xuống dòng), số là `::before` + counter,
  `user-select: none`. Không chèn số dòng thành chữ. Dòng có nhận xét: `.has-c` + `data-c` (id), vạch `--accent`;
  bấm vào lề mở nhận xét đầu của dòng.

## Neo đoạn trích

- Mỗi nhận xét lưu `quote`, `prefix`, `suffix` (48 ký tự), `origin` (`src` | `md`) và `rel` (vị trí tương đối),
  kiểu TextQuoteSelector của W3C Web Annotation. Không lưu offset: văn bản đổi thì offset sai.
- Mỗi lần vẽ, tìm lại đoạn trích trong cả nguồn lẫn bản dựng: tầng 1 khớp nguyên văn sau khi gộp khoảng trắng;
  tầng 2 chỉ so chữ và số, chữ thường, bỏ cú pháp markdown có chữ (`SYNTAX`).
- Đoạn trích xuất hiện nhiều lần: chọn chỗ khớp `prefix` / `suffix` dài nhất, rồi gần `rel` nhất.
- Không tìm thấy ở cả hai chế độ: nhận xét mất neo, hiện `!` trong danh sách và không vào prompt.
- Chọn ở *Source* thì trích đúng nguồn markdown; chọn ở *Preview* thì trích chữ đã dựng.
- Vùng chọn bắt đầu hay kết thúc giữa từ thì nới ra tới mép từ (chữ, số, dấu Unicode) trước khi neo.
- Thứ tự trong prompt là thứ tự đoạn trích trong nguồn.

## Prompt

- Hai kiểu: gọn `1. L12 "quote" — comment` (mặc định) và khối `### 1 · L12-14` + `> quote` + comment.
- *Line numbers* (mặc định bật, lưu theo phiên): dòng đầu và cuối của neo trong nguồn; chọn ở bản dựng cũng tính
  qua neo nguồn. Có *File* thì ghi `file:12-14`, dạng agent đọc thẳng; mở file thì điền sẵn tên file.
- Bật số dòng thì lời dẫn có thêm một câu: số dòng chỉ là gợi ý, lệch thì tìm theo trích dẫn. Luôn giữ trích dẫn.
- Lời dẫn đầu, cuối và tuỳ chọn kèm toàn văn (trong khối rào dài hơn mọi dãy backtick của văn bản).

## Gợi ý nhận xét

- Đếm số lần dùng theo khoá chuẩn hoá (`normKey`); xếp theo số lần, rồi lần dùng gần nhất, rồi thứ tự gốc.
- Tỉ lệ: (số lần + 1) / (tổng số lần + số gợi ý). Chỉ hiện khi đã đếm từ 5 lần nhận xét (`MIN_PCT`).
- Hộp nhận xét hiện 5 gợi ý đầu (`POP_CHIPS`); phần còn lại sau chip `+N`.
- Nhận xét gõ tay ≤ 80 ký tự được đếm; dùng từ hai lần trở lên thì thành gợi ý.
- Bỏ gợi ý là ẩn, không xoá số đếm: gợi ý mặc định không quay lại khi nạp lại `data/hints.json`.
- Đổi chữ một gợi ý mặc định: thêm cặp cũ → mới vào `renamed` trong `data/hints.json`; `migrateHints()` dồn số đếm
  và giữ trạng thái ẩn. Gợi ý tự gõ không đổi.

## Lưu trữ

- Mọi lần đọc ghi `localStorage` bọc try/catch; hỏng thì trang vẫn chạy, chỉ báo một lần.
- Khoá: `md-annotate:index:v1` (danh sách phiên), `md-annotate:s:<id>` (một phiên), `md-annotate:current`,
  `md-annotate:stats:v1` (số đếm gợi ý), `md-annotate:prefs:v1` (chế độ xem, kiểu prompt, lời dẫn mặc định, tô màu,
  bề rộng panel, thu gọn, tỉ lệ hai khung).
- Đổi cấu trúc phiên thì tăng hậu tố `v1` và chuyển dữ liệu cũ, đừng bỏ.
- Phiên trống (không văn bản, không nhận xét) không vào lịch sử.
- Mở file hoặc văn bản mẫu khi phiên đang có nội dung thì mở phiên mới, không ghi đè.

## An toàn

- Markdown dựng bằng `marked` rồi làm sạch bằng `DOMPurify`, cả hai ghim phiên bản và có `integrity`.
- Link ở bản dựng đổi thành `<span class="ma-a">` (`unlink()`, URL ở `title`): không chuyển trang, kéo trên link vẫn
  là bôi đen. Không dựng lại `<a>`.
- Chỉ một chỗ gán `innerHTML`: HTML đã qua DOMPurify. Mọi chỗ khác dựng DOM bằng `h()` và `textContent`.
- Thiếu mạng thì *Preview* báo lỗi, *Source* vẫn dùng được.
- Mở bằng `file://`: trang báo không nạp được `data/hints.json`; mọi thứ khác vẫn chạy.

## Cổng: `sh md-annotate/tools/check.sh`

- `tools/lint.py`: `data/hints.json` đúng khuôn, không trùng, `renamed` trỏ đúng gợi ý; một chỗ `innerHTML`; script
  ngoài ghim phiên bản và có `integrity`.
- Cổng không bấm nút. Sửa sự kiện, neo hay giao diện thì chạy `tools/smoke.cjs` (CI chưa chạy): dán, bôi đen ở hai
  chế độ, gõ và bấm gợi ý, prompt, chép, phím tắt, mất neo, tải lại, lịch sử, bố cục rộng, chuyển gợi ý cũ, theme,
  khổ 1024px và 390px. Chạy tay: `python3 -m http.server 8347` ở gốc repo, rồi
  `node md-annotate/tools/smoke.cjs http://127.0.0.1:8347/md-annotate/`.
