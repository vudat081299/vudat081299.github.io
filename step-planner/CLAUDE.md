# `step-planner/` — Data Science Step Planner

- Tên hiển thị: Data Science Step Planner (`<title>`, thanh trên, trang chủ, Markdown); thư mục, khoá giữ `step-planner`.
- Một trang, `index.html`: dự án chia thành bước (hàng) và bước con (thẻ), trạng thái, hạn, tài liệu, nhật ký quyết
  định, xuất / nhập Markdown và JSON. Ưu tiên dự án dữ liệu, dùng được cho dự án bất kỳ.
- Không có khái niệm người làm (PLAN-010): không thành viên, không giao việc, không lọc theo người.
- Giao diện tiếng Anh (PLAN-012), chữ ngắn kiểu ghi chú; nội dung mẫu và tài liệu repo giữ tiếng Việt. Quyết định của chủ
  trang: [DECISIONS.md](DECISIONS.md).
- Không bước build. Mở bằng HTTP: `python3 -m http.server` ở gốc repo, rồi `http://localhost:8000/step-planner/`.
  Mở bằng `file://` thì trang báo cách mở; `fetch` mẫu hỏng thì banner báo cùng lệnh ấy.

## File

| File | Việc |
|---|---|
| `index.html` | markup, hộp thoại, script theme trước lần vẽ đầu, script báo `file://` |
| `css/planner.css` | token ở đầu (tới dòng `/* ── hết token ── */`), rồi từng component, mỗi khối mở bằng một dòng chú thích |
| `js/core.js` | logic thuần: chuẩn hoá, ngày, tiến độ, việc tiếp theo, Markdown và JSON vào / ra; không DOM, chạy được trong Node |
| `js/md.js` | Markdown của tài liệu văn bản → cây khối (`parseMd`, thuần) → DOM (`renderMd`, chỉ createElement / text node) |
| `js/store.js` | `localStorage` (dữ liệu, mẹo `stepPlanner.hintOff`, Compact `stepPlanner.compact`, theme `hub-theme`), `sessionStorage` (dự án của tab); mọi truy cập bọc try/catch |
| `js/dropdown.js` | danh sách chọn tự dựng: `enhanceSelect` (thay giao diện `<select>`, giữ nó làm nguồn value và `change`), `openList` |
| `js/main.js` | vẽ bảng, sự kiện, hộp thoại, kéo thả, toast Hoàn tác, nhắc sao lưu |
| `data/templates.json` | mẫu dự án, trang đọc bằng vòng lặp (REPO-001) |

## Dữ liệu

- `localStorage['stepPlanner.v2']`: `{version, workspaces[], lastId, lastBackup, dirtySince}`. Đổi khuôn thì tăng số khoá.
  Khoá cũ (`OLD_KEYS` trong `store.js`) đọc khi khoá mới chưa có, chuẩn hoá rồi ghi sang khoá mới; khoá cũ giữ nguyên.
- Workspace `{id, name, templateId, createdAt, updatedAt, notes, steps[], log[]}`. Log `{id, date, decision, why}`.
- Step `{id, title, goal, doneWhen, notes, revisit: null | {reason, date, round}, round, docs[], subs[]}`. `round`: vòng gần
  nhất (1 = chưa làm lại); đang đánh dấu thì `round` = `revisit.round` ≥ 2.
- Sub `{id, title, status, cancelReason, due, doneWhen, notes, docs[]}`; `status` ∈ `todo doing done blocked skip cancel`;
  `cancelReason` (nhiều dòng) chỉ giữ khi `cancel`; `due` là `YYYY-MM-DD` hoặc rỗng.
- Doc `{id, kind: 'link', title, url}` hoặc `{id, kind: 'md', title, body}`. `url` chỉ http(s) (`safeUrl`); link khác bị bỏ
  (nhập thì cảnh báo). `body` giữ nguyên từng dòng, chỉ bỏ dòng trống đầu và khoảng trắng cuối.
- Mọi dữ liệu đi qua `normSub` / `normStep` / `normWorkspace`: chuỗi một dòng gộp khoảng trắng, ghi chú bỏ khoảng trắng
  cuối dòng, phần tử không phải object bị bỏ, ngày phải có thật (`parseDate` kiểm đi rồi về). Trường lạ (kể cả `owner`,
  `people`, `me` của dữ liệu cũ) bị bỏ, không lỗi.
- Hai mốc sao lưu chỉ ở máy này, không xuất. Dự án đang mở của tab ở `sessionStorage['stepPlanner.tab']`. Bộ nhớ bị
  chặn: bộ nhớ tạm + banner. Hỏng: chép sang `stepPlanner.v2.corrupt`, bắt đầu trống. Lúc mở gọi
  `navigator.storage.persist()` (Safari xoá dữ liệu do script ghi sau 7 ngày không mở trang).

## Hành vi

- Sáu trạng thái (PLAN-003), tên trên giao diện: New (`todo`), In progress, Done, Blocked, Skipped, Cancelled. Skipped: việc
  không cần với dự án này. Cancelled: đã quyết không làm, giữ thẻ để nhớ vì sao.
- Tiến độ = xong / (tổng − bỏ qua − huỷ). "Next" chỉ tô một thẻ: bước con đầu tiên không xong, không bỏ qua, không huỷ của
  bước đầu tiên còn việc. Hạn đã qua thì báo "(overdue)", trừ thẻ xong, bỏ qua, huỷ.
- Bấm chip: New → In progress → Done. Chip Done, Blocked, Skipped, Cancelled bấm là mở danh sách sáu trạng thái (chấm,
  một dòng gợi ý, đánh dấu cái hiện tại); Shift + bấm hay Alt + ↓ luôn mở. Chọn Cancelled: mở hộp sửa, trạng thái đặt sẵn,
  focus ô lý do; Lưu mới huỷ. Rời Cancelled thì bỏ lý do. Thẻ huỷ: tên gạch, lý do trong thân thẻ (cắt như ghi chú).
- Bấm vào thẻ (ngoài nút) là mở hộp sửa. Mỗi thẻ chỉ hai điểm dừng Tab: tên (mở sửa) và chip.
- Nút phụ (dời, nhân bản, xoá, cần làm lại, tài liệu, nhãn kẹp, "Xem thêm") có `tabindex=-1`. Bàn phím làm cùng việc: Alt
  + ← → trên tên bước con, Alt + ↑ ↓ trên tên bước, ô "Thuộc bước" / "Vị trí" và các nút trong hộp sửa.
- Đổi chỗ (nút dời, Alt + mũi tên, kéo thả, ô bước / vị trí; cả bước): cái vừa dời có lớp `moved`, cái bị đổi chỗ có
  `swapped`, tự gỡ sau `--flash-dur`; toast "Moved …" có Hoàn tác, không lấy focus; hàng thẻ cuộn để thẻ trong tầm nhìn.
  Dời liền nhiều lần khi toast còn hiện: Hoàn tác về chỗ trước lần đầu; dời về đúng chỗ cũ thì toast tắt.
- "Reopen" (PLAN-004): nút có chữ ở cột tên bước; hộp có giải thích, ví dụ, ô lý do, và (khi mở lại) danh sách bước con
  đưa về New — mặc định không chọn. Mở lại mở vòng `round + 1`, ghi nhật ký "Reopened: tên bước (iteration N)" với lý do;
  một Hoàn tác trả cả trạng thái thẻ, nhật ký, đánh dấu, vòng. Băng "Reopened · Iteration N · ngày · lý do" (bấm để sửa
  lý do), nút "Close iteration" (vòng giữ để lần sau tăng tiếp).
- Mẹo người mới hiện tới khi bấm × (nhớ ở máy này). Nút "Compact" (nhớ ở máy này) ẩn "Done when", ghi chú, lý do huỷ
  trên thẻ và cột bước. Nút "Log (N)" cuộn tới khung nhật ký và focus vào đó.
- Tìm không phân biệt hoa thường và dấu, khớp cả tên tài liệu. Tên, mục tiêu, ghi chú hay tài liệu của bước khớp thì
  hiện cả hàng. Đang tìm thì tắt sắp xếp và nút thêm bước; thẻ mới bị lọc ẩn thì toast "Added — hidden by the search filter".
- Xoá bước con, quyết định, tài liệu: một bấm. Xoá bước còn bước con, xoá dự án (không hoàn tác): hỏi lại. Sau khi xoá,
  focus nhảy vào Hoàn tác của toast (15 giây); Ctrl/Cmd + Z cũng hoàn tác khi không gõ chữ và không có hộp thoại mở. Hoàn
  tác tìm lại dự án và bước theo id (tab khác có thể đã thay `state`).
- Hộp sửa: mở thì focus ô đầu; tên là textarea tự cao, Enter lưu. Esc, ×, Đóng hay Nhân bản khi chữ đã đổi thì hỏi "Bỏ
  thay đổi?". Nút đóng không lưu của mọi hộp ghi "Đóng", không "Huỷ" (trùng tên trạng thái).
- Ghi chú bước gập dưới tên bước. Thẻ cao theo nội dung (`--card-min` … `--card-max`); vượt max thì thân bị cắt, mờ dần,
  "Xem thêm" mở cả thẻ. Link http(s) trong ghi chú bấm được. Vẽ lại giữ ghi chú đang mở, thẻ đã mở, chỗ cuộn ngang.
- Tài liệu (PLAN-011): tài liệu của bước là dải chip rộng cả hàng ngay dưới băng Reopened (không băng thì ở chỗ ấy), trên
  hàng thẻ; nút phụ "Doc" ở cuối dải (bước chưa có tài liệu: ở cột tên bước). Thẻ chỉ có nhãn kẹp + số ở hàng đầu; bấm là
  mở hộp sửa bước con ở phần tài liệu. Thêm / sửa / xoá trong hộp sửa, lưu ngay; xoá khi hộp đang mở thì Hoàn tác là một
  hàng trong hộp. Link mở tab mới (`noopener noreferrer`); văn bản mở hộp lớn Sửa / Xem / Chia đôi (`#dlg-md`).
- Nhật ký quyết định: sửa, xoá được; mới nhất trước. Tab khác sửa cùng khoá thì đọc lại (`storage`), giữ dự án của tab.
- Nhắc sao lưu: có thay đổi chưa sao lưu từ ≥ 3 ngày thì nút "Not backed up for N days" / "Never backed up" hiện cạnh
  Export; bấm là tải bản sao lưu mọi dự án. Chỉ bản sao lưu tất cả (tải hoặc chép) mới đặt lại mốc.
- Chữ người dùng chỉ vào DOM qua text node (`h` trong `main.js`, `md.js`); không `innerHTML` ở `js/`. Không `alert` /
  `confirm` / `prompt`: hỏi lại bằng `#dlg-ask`.

## Mẫu (`data/templates.json`)

- `{note, templates[]}`; mẫu `{id, name, description, steps[]}`; bước `{title, goal, doneWhen, notes?, subs[]}`; bước con
  `{title, doneWhen?, notes?}`. Không thẻ HTML, không người làm. Đúng một mẫu trống. Mẫu chung không gắn vào một bài toán.
- Tên bước, bước con: tiếng Việt, tên gốc tiếng Anh trong ngoặc để tra.
- `crisp-dm` theo CRISP-DM 1.0 Step-by-step guide (Chapman et al., 2000): bước là sáu pha, bước con là generic task,
  `doneWhen` là output của task, `notes` là câu hỏi gợi ý và bẫy hay gặp. Việc thêm ngoài guide ghi nguồn trong tên thẻ
  (CRISP-ML(Q), Mitchell et al. 2019, TDSP); không thêm việc không có nguồn.
- CRISP-DM: chia train / validation / test (task 4.2, dời lên pha 3 ngay sau Tích hợp, ghi chú thẻ nói vì sao) trước làm
  sạch, điền thiếu, tạo đặc trưng; mọi biến đổi fit chỉ trên train. Đừng thêm bước con làm rò rỉ dữ liệu test.
- `smoke.cjs` tìm `kiem chat` (đúng một bước con) và `hieu nghiep vu` (đúng một bước) trên `crisp-dm`.
- `stats-report` theo chu trình PPDAC (MacKay & Oldford; Wild & Pfannkuch, 1999): bước là năm khâu.
- `it5425-sports` sinh từ `masters-degree/data-management-visualization/data/sports-monitoring-project.json` và "Xong khi
  nào" (`#lt-xong`) của trang đồ án: `python3 step-planner/tools/lint.py --write-course`, không sửa tay; cổng đỏ khi nguồn
  đổi mà chưa sinh lại. Tên việc giữ nguyên chữ nguồn (kể cả "Vai N, …"); ghi chú bước có dòng "Vai:" và link trang đồ án
  kèm neo (cổng kiểm neo còn). Không tên người, kể cả giảng viên.

## Markdown

Xuất rồi nhập lại ra đúng cấu trúc cũ (tên, trạng thái, hạn, ghi chú, quay lại, tài liệu, nhật ký, ghi chú dự án).
Xem trên GitHub / VS Code: nhãn và khối cách nhau một dòng trống (khuôn dưới bỏ bớt), dòng trong khối có hai dấu cách cuối.

```
# Tên dự án
> Data Science Step Planner · format 3
>
> Template: <templateId>
dòng ghi chú dự án

## 1. Tên bước
Goal: …
Done when: …
Reopened: YYYY-MM-DD · iteration N · lý do
Notes:
  dòng ghi chú
Docs:
  - [Tên link](https://…)
  - Tên văn bản
    ````markdown
    thân văn bản, kể cả ``` và dòng #, -, nhãn
    ````

- [/] Tên bước con · due YYYY-MM-DD
  Done when: …
  Cancelled because: dòng đầu
    dòng tiếp của lý do
  dòng ghi chú
  Docs:
    - [Tên link](https://…)

## Decision log
- YYYY-MM-DD · quyết định
  Why: dòng đầu
  dòng tiếp
```

- Nhãn định dạng 2 (tiếng Việt) vẫn nhập: `Mẫu`, `Mục tiêu`, `Xong khi`, `Quay lại` (`· vòng N`), `Vòng`, `Ghi chú`, `Tài liệu`,
  `Huỷ vì`, `Vì sao`, `hạn`, `## Nhật ký quyết định`. Nhãn không phân biệt hoa thường. Dòng đầu (`… · format N`) chỉ để
  đọc, trang không dựa vào nó. Số thứ tự trên bảng không ghi vào Markdown.
- Dấu trạng thái: `[ ]` / `[]` mới, `[~]` đang làm, `[x]` / `[X]` xong, `[!]` bị chặn, `[-]` bỏ qua, `[/]` huỷ. Dấu lạ đọc là mới.
- Trên dòng bước con, phần tử tách bằng ` · `. Trong tên: `\` → `\\`, `·` → `\·`, `@` → `\@`, `hạn` / `due` → `\hạn` / `\due`.
- Dòng thụt hai dấu cách thuộc bước con / `Notes:` / quyết định ngay trên nó. Dòng thụt đầu `Done when: ` của bước con là
  `doneWhen`; dòng thụt đầu `Why: ` của quyết định mở phần lý do.
- Bước con huỷ: dòng thụt `Cancelled because: dòng đầu` ngay sau `Done when:`, dòng sau của lý do thụt bốn (thoát như ghi chú).
- Dòng ghi chú: dòng trống viết `\`; dòng bắt đầu bằng `\`, khoảng trắng, `#`, `>`, đầu mục danh sách, `**` hay một nhãn (cả
  nhãn định dạng 2) thêm một `\` phía trước.
- Vòng: bước đang mở lại ghi vòng trong `Reopened:`; bước đã đóng vòng mà `round` > 1 có dòng `Iteration: N` thay chỗ ấy.
  Dòng cũ `Quay lại: YYYY-MM-DD · lý do` (không vòng) đọc là vòng 2.
- Tài liệu: nhãn `Docs:` (bước: không thụt, sau `Notes:`; bước con: thụt hai, cuối bước con), mỗi tài liệu một mục thụt thêm
  hai. Link `- [tên](url)`, url có ngoặc thì `(<url>)`. Văn bản `- tên` rồi khối rào thụt thêm hai, rào `` ` `` dài hơn chuỗi
  `` ` `` dài nhất trong thân (tối thiểu ba), dòng trống của thân ghi rỗng. Trong tên: `\`, `[`, `]` thoát bằng `\`.

Nhập file cũ và Markdown viết tay (dễ dãi):

- Người làm (dòng `Người:`, `` `@tên` ``, `@tên`) bị bỏ khỏi tên, không cảnh báo. Trước `##` đầu: dòng đầu không `#` là tên
  dự án, việc thành bước "General", chữ khác là ghi chú dự án. Dòng lạ trong bước (đoạn văn, `###`) nối vào ghi chú bước.
- Bước con: `- [ ] x`, `- [] x`, `* [ ] x`, `+ [ ] x`, `1. [ ] x`, gạch đầu dòng thường `- x` (mới); mục lồng xếp phẳng.
- Hạn: `hạn` / `due` + `YYYY-MM-DD`, `YYYY-M-D`, `DD/MM/YYYY`, `D/M/YYYY`. Ngày không có thật thì cảnh báo, giữ trong tên.
- Tiêu đề bước: `## 1. x`, `## 1) x`, `## 2 x`, `## Bước 1: x`, `## Step 2) x`, `## x`. `## Nhật ký (quyết định)` / `## Decision
  log` là nhật ký; trong đó mỗi gạch đầu dòng hay dòng thường là một quyết định, ngày đầu dòng (hai kiểu) là ngày.
- Sau `Docs:`: mục là link, hoặc mục có rào ``` / ~~~ ngay dòng sau; mục của bước không cần thụt, của bước con thụt ≥ 2.
  Link không phải http(s): cảnh báo, bỏ. Thiếu rào đóng: đọc tới hết file, cảnh báo. Xem trước liệt kê mọi cảnh báo.

## JSON

- Một dự án: `{format: "step-planner", version: 2, exportedAt, workspace}`. Sao lưu: `{…, workspaces: [...]}`. Trang không
  dựa vào `version`: bản 1 (có người, không tài liệu) vẫn nhập.
- Nhập nhận cả hai, mảng dự án, hoặc một dự án trần. Mục nào không phải object hay thiếu mảng `steps` thì bỏ, kèm cảnh
  báo; không còn dự án nào thì báo lỗi, không bao giờ lộ TypeError. Chữ mở bằng `{`, hay `[` rồi một giá trị
  JSON, là JSON; còn lại (kể cả `[tên](url)`, `[ ] việc`) là Markdown.
- Mặc định tạo dự án mới (id mới, trùng tên thì ` (imported)`, ` (imported 2)`…). "Thay dự án đang mở" (một dự án) có Hoàn tác.

## Giao diện

- Màu, cỡ, khoảng cách chỉ ở token đầu `css/planner.css` (REPO-028); bảng màu theo trang chủ (REPO-023).
- Dáng chung chép từ `md-annotate/` (token, thanh trên, nút, nhóm chọn, ô nhập, màn đầu, hộp thoại, toast, bản xem
  Markdown `.ma-md`): chép vào file của project này, không link sang project khác. Sửa dáng thì so ảnh với md-annotate.
- Theme theo hệ điều hành tới khi bấm nút (REPO-024), khoá `hub-theme` chung cả site.
- Thanh trên ghi đủ `vudat081299 / Data Science Step Planner`, không cắt "…"; hẹp thì xuống dòng.
- Biểu tượng: một bộ `<symbol id="i-…">` trong `index.html`; HTML và `icon()` của `main.js` dùng `<use>`. Không dùng ký tự
  unicode làm biểu tượng. Nút chỉ có biểu tượng thì có `aria-label` và `title`.
- Đầu dự án: tên (bấm để đổi dự án), tiến độ chung, chú giải trạng thái kèm số bước con (đếm, không ghi tay). Chip
  trạng thái có chữ và chấm khác hình, không chỉ khác màu. Thanh công cụ: lọc bên trái, Export là nút chính.
- Cột tên bước rộng cố định, thẻ cùng bề rộng (các hàng thẳng cột), không bị kéo cao theo thẻ cao nhất hàng. Hàng thẻ
  cuộn ngang bên trong, không hiện thanh cuộn, mép mờ báo còn chỗ cuộn (`more-left` / `more-right`). ≤ 640px: tên bước nằm trên hàng thẻ.
- Hộp văn bản Markdown gần toàn màn, ≤ 640px toàn màn; Chia đôi xếp trên / dưới khi hẹp.
- Mọi `<select>` chọn thứ có nghĩa dùng danh sách tự dựng (nổi ở lớp trên cùng, không đẩy bố cục; phím ↑ ↓, gõ chữ đầu,
  Enter, Esc trả focus); ô chỉ chọn số giữ `<select>` gốc (`data-native`). Option có `data-dot`, `data-hint` thì hiện thêm.
- Màn cảm ứng và ≤ 640px: vùng bấm ≥ 44px (vật nhỏ trong dòng nới bằng lớp giả). Trang không bao giờ cuộn ngang. Tạo
  hay mở dự án thì về đầu trang, không cuộn theo focus.

## Cổng: `sh step-planner/tools/check.sh`

- `tools/lint.py`: khuôn mẫu, mẫu đồ án khớp nguồn và neo, không `innerHTML`, mã màu chỉ trong khối token.
- `node --check` cho `js/*.js`; `tools/test-core.mjs`: logic thuần của `core.js`, `md.js`; danh sách ở chính file.
- `tools/smoke.cjs` (cổng tự dựng máy chủ tạm; thiếu playwright thì bỏ qua, CI chạy ở job smoke): bấm thật các hành vi
  trên, hai tab, 390px, bộ nhớ bị chặn / hỏng / khoá cũ, lỗi console; số của mẫu đọc từ `templates.json`. Chạy tay: `node
  step-planner/tools/smoke.cjs http://127.0.0.1:8347/step-planner/`.
