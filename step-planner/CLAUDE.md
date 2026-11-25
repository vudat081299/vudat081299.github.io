# `step-planner/` — Data Science Step Planner

- Tên hiển thị: Data Science Step Planner (`<title>`, thanh trên, trang chủ, Markdown); thư mục, khoá giữ `step-planner`.
- Một trang, `index.html`: dự án chia thành bước (hàng) và bước con (thẻ), trạng thái, hạn, tài liệu, nhật ký quyết
  định, xuất / nhập Markdown và JSON. Ưu tiên dự án dữ liệu, dùng được cho dự án bất kỳ. Không có người làm (PLAN-010).
- Giao diện tiếng Anh (PLAN-012), chữ ngắn kiểu ghi chú; nội dung mẫu, tài liệu repo tiếng Việt. Quyết định: [DECISIONS.md](DECISIONS.md).
- Không build. Mở qua HTTP: `python3 -m http.server` ở gốc repo, `http://localhost:8000/step-planner/` (`file://`: trang báo).

## File

| File | Việc |
|---|---|
| `index.html` | markup, hộp thoại, script theme trước lần vẽ đầu, script báo `file://` |
| `css/planner.css` | token ở đầu (tới dòng `/* ── hết token ── */`), rồi từng component, mỗi khối mở bằng một dòng chú thích |
| `js/core.js` | logic thuần: chuẩn hoá, ngày, tiến độ, việc tiếp theo, Markdown và JSON vào / ra; không DOM, chạy được trong Node |
| `js/md.js` | Markdown của tài liệu văn bản → cây khối (`parseMd`, thuần) → DOM (`renderMd`, chỉ createElement / text node) |
| `js/store.js` | `localStorage` (dữ liệu, mẹo `stepPlanner.hintOff`, Compact `stepPlanner.compact`, theme `hub-theme`), `sessionStorage` (dự án của tab); mọi truy cập bọc try/catch |
| `js/dropdown.js` | danh sách chọn tự dựng: `enhanceSelect` (thay giao diện `<select>`, giữ nó làm nguồn value và `change`), `openList` |
| `js/drag.js` | kéo thả bằng pointer events (chuột, chạm, bút): bóng, ô "Drop here", FLIP, tự cuộn, Esc; mỗi khung hình một lượt, toạ độ đo một lần |
| `js/main.js` | vẽ bảng theo hàng (`renderBoard`: khoá mỗi hàng, chỉ hàng đổi dựng lại), sự kiện, hộp thoại, kéo thả, toast Hoàn tác, nhắc sao lưu |

## Dữ liệu

- `localStorage['stepPlanner.v2']`: `{version, workspaces[], lastId, lastBackup, dirtySince}`. Đổi khuôn thì tăng số khoá;
  khoá cũ (`OLD_KEYS`) đọc khi khoá mới chưa có rồi ghi sang khoá mới. Trường mới có mặc định thì không cần đổi khoá.
- Workspace `{id, name, templateId, createdAt, updatedAt, notes, steps[], log[]}`. Log `{id, date, decision, why, stepId}`;
  `stepId`: id một bước hoặc rỗng; bước không còn thì rỗng; nhân bản, nhập thì theo id mới.
- Step `{id, title, goal, doneWhen, notes, revisit: null | {reason, date, round}, round, docs[], subs[]}`. `round`: vòng gần
  nhất (1 = chưa mở lại); đang mở lại thì `round` = `revisit.round` ≥ 2.
- Sub `{id, title, status, reason, due, doneWhen, notes, docs[], par, redo}`; `status` ∈ `todo doing pending blocked done skip
  cancel`; `reason` (nhiều dòng) chỉ giữ khi `pending`, `blocked`, `cancel` (`cancelReason` cũ đọc thành `reason`); `due`:
  `YYYY-MM-DD` hoặc rỗng. `par: true` = nhập ô của bước con ngay trước; `subs[0].par` luôn false. Ô (slot), chỗ (`Place`), mọi
  phép dời ở `core.js`. `redo: true` = được gửi lại làm trong vòng đang mở; bước không mở lại thì mọi `redo` là false.
- Doc `{id, kind: 'link', title, url}` hoặc `{id, kind: 'md', title, body}`. `url` chỉ http(s) (`safeUrl`); link khác bị bỏ
  (nhập thì cảnh báo). `body` giữ nguyên từng dòng, chỉ bỏ dòng trống đầu và khoảng trắng cuối.
- Mọi dữ liệu đi qua `normSub` / `normStep` / `normWorkspace`: chuỗi một dòng gộp khoảng trắng, phần tử sai kiểu bị bỏ,
  ngày phải có thật (`parseDate`). Trường lạ (kể cả `owner`, `people`, `me` của dữ liệu cũ) bị bỏ, không lỗi.
- Hai mốc sao lưu chỉ ở máy này, không xuất. Dự án đang mở của tab ở `sessionStorage['stepPlanner.tab']`. Bộ nhớ bị
  chặn: bộ nhớ tạm + banner. Hỏng: chép sang `stepPlanner.v2.corrupt`, bắt đầu trống. Lúc mở gọi
  `navigator.storage.persist()` (Safari xoá dữ liệu do script ghi sau 7 ngày không mở trang).

## Hành vi

- Bảy trạng thái, ý nghĩa ở PLAN-003, thứ tự này ở mọi chỗ: New (`todo`), In progress, Pending, Blocked, Done, Skipped,
  Cancelled. Nhãn lý do: Pending "Waiting on", Blocked "Blocked by", Cancelled "Cancelled because" (`REASON_LABEL`).
- Tiến độ = xong / (tổng − bỏ qua − huỷ), không đổi với ô song song. "Next" tô các thẻ còn mở (không xong, bỏ qua, huỷ),
  trừ thẻ chờ, của ô đầu tiên còn việc trong bước đầu tiên còn việc. Hạn qua: "(overdue)", trừ thẻ xong, bỏ qua, huỷ.
- Song song (PLAN-013): mỗi ô một cột của hàng, thẻ song song xếp chồng. Số thẻ là vị trí ô (`1`, `2`…), ô k thẻ thì `n.1`
  … `n.k`. "Add parallel" trên thẻ, ô "Position" ("Position n" / "Parallel with n"); Alt + ← →: đổi ô (thẻ ở ô song song thì
  tách ra ô riêng), Alt + ↑ ↓: đổi thứ tự trong ô. Toast dời tả chỗ mới bằng tên hàng xóm, không bằng số.
- Số đứng yên trong phiên (PLAN-014): chụp số khi dự án hiện lần đầu sau khi mở trang (và sau nhập thay nội dung); dời,
  xoá không đổi số (hàng đọc "1 3 2"); cái thêm trong phiên hiện chấm thay số. Số lệch thì nút "Renumber" hiện.
- Bấm chip: New → In progress → Done. Chip trạng thái khác bấm là mở danh sách bảy trạng thái (chấm, một dòng gợi ý, đánh
  dấu cái hiện tại); Shift + bấm hay Alt + ↓ luôn mở. Chọn Cancelled: mở hộp sửa, trạng thái đặt sẵn, focus ô lý do; Lưu mới
  huỷ. Pending, Blocked đặt ngay, lý do sửa trong hộp. Lý do trong thân thẻ kèm nhãn (cắt như ghi chú). Thẻ huỷ: tên gạch.
- Thêm bước: nút cuối bảng, hoặc rê chuột lên vạch chia trên một bước thì nút "Add step" nổi lên (không xê dịch bố cục),
  bấm mở hộp thêm bước đặt sẵn vị trí ấy; màn cảm ứng: nút tròn nhỏ luôn hiện. Thêm bước con: nút ở cột tên bước.
- Bấm vào thẻ (ngoài nút) là mở hộp sửa; mỗi thẻ chỉ hai điểm dừng Tab: tên và chip. Nút phụ (song song, nhân bản, xoá,
  mở lại, tài liệu, nhãn kẹp, "Show more", vạch chia) có `tabindex=-1`; bàn phím làm cùng việc: Alt + mũi tên trên tên bước
  con, Alt + ↑ ↓ trên tên bước, ô bước / vị trí và các nút trong hộp sửa.
- Kéo thả: chuột kéo thẻ (trừ nút, link) hay đầu bước; chạm thì giữ thẻ rồi kéo, bước kéo bằng tay nắm. Đang kéo: chỗ thả
  là ô viền đứt "Drop here" cỡ thẻ, thẻ khác trượt nhường chỗ, không vẽ lại bảng. Nửa trái / phải một ô: chen ô mới trước /
  sau nó; phần dưới thẻ hay giữa ô song song: nhập ô ấy. Gần mép thì hàng / trang tự cuộn; Esc huỷ. Bước không có nút lên xuống.
- Đổi chỗ (mọi cách): cái vừa dời có lớp `moved`, cái bị đổi chỗ có `swapped` (tự gỡ sau `--flash-dur`); toast "Moved …"
  có Hoàn tác, không lấy focus. Dời liền nhiều lần khi toast còn hiện: Hoàn tác về chỗ trước lần đầu.
- "Reopen" (PLAN-004): hộp có một câu khi nào dùng, lý do bắt buộc, danh sách bước con đã xong để gửi lại làm (mặc định
  không chọn). Mở vòng `round + 1`; bước con đã chọn về New, mang dấu "Redo" tới khi xong lại; nhật ký ghi "Reopened: tên
  (iteration N)" gắn với bước ấy; một Hoàn tác trả hết. Băng "Reopened · Iteration N · ngày · lý do" (bấm để sửa lý do) đếm "k of n redo
  tasks left"; xong hết thì "Close iteration" thành nút chính. Đóng vòng bỏ băng và dấu Redo (Hoàn tác được).
- Mẹo tắt bằng ×; "Compact" ẩn "Done when", ghi chú, lý do, ở cảm ứng cả nút thẻ (cả hai nhớ ở máy này). "Log (N)" tới nhật ký,
  focus. Tìm bỏ qua dấu và hoa thường, khớp cả lý do, tài liệu; bước khớp thì hiện cả hàng; đang tìm thì tắt sắp xếp, thêm bước.
- Xoá bước con, quyết định, tài liệu: một bấm. Xoá bước còn bước con, xoá dự án (không hoàn tác): hỏi lại. Sau khi xoá,
  focus nhảy vào Hoàn tác của toast (15 giây); Ctrl/Cmd + Z cũng hoàn tác khi không gõ chữ và không có hộp thoại mở. Hoàn
  tác tìm lại dự án và bước theo id (tab khác có thể đã thay `state`).
- Hộp sửa: mở thì focus ô đầu (cảm ứng: không tự focus ô chữ); tên tự cao, Enter lưu. Esc, ×, Close, Duplicate khi chữ
  đổi thì hỏi lại. Nút đóng ghi "Close", không "Cancel". Đóng hộp: focus về chỗ mở, không vòng tới lần Tab / mũi tên kế.
- Ghi chú bước gập dưới tên. Thẻ cao theo nội dung, quá `--card-max` thì cắt (chỉ dựng phần đầu ghi chú), "Show more" mở cả
  thẻ; link trong ghi chú bấm được. Vẽ lại giữ ghi chú đang mở, thẻ đã mở, chỗ cuộn ngang; hàng không đổi giữ nguyên nút DOM.
- Tài liệu (PLAN-011): tài liệu của bước là dải chip rộng cả hàng ngay dưới băng Reopened (không băng thì ở chỗ ấy), trên
  hàng thẻ; nút phụ "Doc" ở cuối dải (bước chưa có tài liệu: ở cột tên bước). Thẻ chỉ có nhãn kẹp + số ở hàng đầu; bấm là
  mở hộp sửa bước con ở phần tài liệu. Thêm / sửa / xoá trong hộp sửa, lưu ngay; xoá khi hộp đang mở thì Hoàn tác là một
  hàng trong hộp. Link mở tab mới (`noopener noreferrer`); văn bản mở hộp lớn Edit / Preview (`#dlg-md`).
- Nhật ký (PLAN-005): ô ghi gập tới khi bấm; mở thì focus Decision, ngày mặc định hôm nay, bước tuỳ chọn; Esc gập, giữ chữ.
  Mới nhất trước, nhóm theo tháng; lý do dài cắt, "Show more"; bấm mục là sửa; bấm chip bước là tới bước ấy (bỏ lọc nếu cần).
- Ghi bộ nhớ sau khung hình kế (rời, ẩn trang: ghi ngay). Tab khác sửa cùng khoá thì đọc lại (`storage`), giữ dự án của tab.
- Nhắc sao lưu: thay đổi chưa sao lưu ≥ 3 ngày thì nút nhắc hiện cạnh Export, bấm là tải sao lưu mọi dự án (mới đặt lại mốc).
- Chữ người dùng chỉ vào DOM qua text node; không `innerHTML` ở `js/`. Không `alert` / `confirm` / `prompt` (`#dlg-ask`).

## Mẫu (`data/templates.json`)

- `{note, templates[]}`; mẫu `{id, name, description, steps[]}`; bước `{title, goal, doneWhen, notes?, subs[]}`; bước con
  `{title, doneWhen?, notes?}`. Không thẻ HTML, không người làm. Đúng một mẫu trống. Mẫu chung không gắn vào một bài toán.
- Tên mẫu, bước, bước con: tiếng Anh, đúng tên gốc của chuẩn (PLAN-015, cổng kiểm); nội dung khác tiếng Việt.
- `crisp-dm` theo CRISP-DM 1.0 Step-by-step guide (Chapman et al., 2000): bước là sáu pha, bước con là generic task,
  `doneWhen` là output của task, `notes` là câu hỏi gợi ý và bẫy hay gặp. Việc thêm ngoài guide ghi nguồn trong tên thẻ
  (CRISP-ML(Q), Mitchell et al. 2019, TDSP); không thêm việc không có nguồn.
- CRISP-DM: chia train / validation / test (task 4.2, dời lên pha 3 ngay sau Integrate Data, ghi chú thẻ nói vì sao) trước làm
  sạch, điền thiếu, tạo đặc trưng; mọi biến đổi fit chỉ trên train. Đừng thêm bước con làm rò rỉ dữ liệu test.
- `smoke.cjs` tìm `VERIFY data quality` (đúng một bước con) và `BUSINESS understanding` (đúng một bước) trên `crisp-dm`.
- `stats-report` theo chu trình PPDAC (MacKay & Oldford; Wild & Pfannkuch, 1999): năm khâu, việc theo Wild & Pfannkuch.
- `it5425-sports` sinh từ `masters-degree/data-management-visualization/data/sports-monitoring-project.json` và "Xong khi
  nào" (`#lt-xong`) của trang đồ án: `python3 step-planner/tools/lint.py --write-course`, không sửa tay; cổng đỏ khi nguồn
  đổi mà chưa sinh lại. Tên việc giữ nguyên chữ nguồn (kể cả "Vai N, …"); ghi chú bước có dòng "Vai:" và link trang đồ án
  kèm neo (cổng kiểm neo còn). Không tên người, kể cả giảng viên.

## Markdown

Xuất rồi nhập lại ra đúng cấu trúc cũ. Nhãn và khối cách nhau một dòng trống (khuôn dưới bỏ bớt), dòng trong khối có hai
dấu cách cuối (xuống dòng khi xem trên GitHub / VS Code).

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

- [/] Tên bước con · parallel · redo · due YYYY-MM-DD
  Done when: …
  Cancelled because: dòng đầu
    dòng tiếp của lý do
  dòng ghi chú
  Docs:
    - [Tên link](https://…)

## Decision log
- YYYY-MM-DD · quyết định
  Step: tên bước
  Why: dòng đầu
  dòng tiếp
```

- Nhãn định dạng 2 (tiếng Việt) vẫn nhập: `Mẫu`, `Mục tiêu`, `Xong khi`, `Quay lại` (`· vòng N`), `Vòng`, `Ghi chú`, `Tài liệu`,
  `Huỷ vì`, `Vì sao`, `Bước`, `hạn`, `## Nhật ký quyết định`. Nhãn không phân biệt hoa thường. Dòng đầu (`… · format N`) chỉ để
  đọc, trang không dựa vào nó. Số thứ tự trên bảng không ghi vào Markdown.
- Phần tử `parallel` (nhận cả `song song`): nhập ô của bước con ngay trước. `redo` (nhận cả `làm lại`): dấu Redo.
- Dấu: `[ ]` / `[]` mới, `[~]` đang làm, `[>]` chờ, `[!]` bị chặn, `[x]` / `[X]` xong, `[-]` bỏ qua, `[/]` huỷ; dấu lạ là mới.
- Trên dòng bước con, phần tử tách bằng ` · `. Trong tên: `\` → `\\`, `·` → `\·`, `@` → `\@`, `hạn` / `due` → `\hạn` / `\due`.
- Dòng thụt hai dấu cách thuộc bước con / `Notes:` / quyết định ngay trên nó. Dòng thụt đầu `Done when: ` của bước con là
  `doneWhen`; dòng thụt đầu `Why: ` của quyết định mở phần lý do. `Step: tên` ngay dưới dòng quyết định gắn nó với bước đầu
  tiên cùng tên (bỏ dấu, không phân biệt hoa thường); không có bước ấy thì cảnh báo, bỏ link.
- Lý do: dòng thụt `<nhãn>: dòng đầu` sau `Done when:`, dòng sau thụt bốn; nhập nhận mọi nhãn lý do (cả `Huỷ vì`) khi trạng thái có lý do, không thì là ghi chú.
- Dòng ghi chú: dòng trống viết `\`; dòng mở bằng `\`, khoảng trắng, `#`, `>`, đầu mục danh sách, `**` hay nhãn (cả định dạng 2) thêm `\`.
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

- Một dự án: `{format: "step-planner", version: 3, exportedAt, workspace}`. Sao lưu: `{…, workspaces: [...]}`. Trang không
  dựa vào `version`: bản 1 (có người, không tài liệu), bản 2 (không ô song song) vẫn nhập.
- Nhập nhận cả hai, mảng dự án, hoặc một dự án trần. Mục sai khuôn thì bỏ, kèm cảnh báo; không còn dự án nào thì báo lỗi,
  không lộ TypeError. Chữ mở bằng `{`, hay `[` rồi một giá trị JSON, là JSON; còn lại (kể cả `[tên](url)`) là Markdown.
- Mặc định tạo dự án mới (id mới, trùng tên thì ` (imported)`, ` (imported 2)`…). "Thay dự án đang mở" (một dự án) có Hoàn tác.

## Giao diện

- Màu, cỡ, khoảng cách chỉ ở token đầu `css/planner.css` (REPO-028, REPO-023); dáng chung chép từ `md-annotate/`.
- Theme theo hệ điều hành tới khi bấm nút (REPO-024), khoá `hub-theme`. Thanh trên ghi đủ tên, không cắt "…".
- Biểu tượng: một bộ `<symbol id="i-…">` trong `index.html` qua `<use>`, không ký tự unicode; nút chỉ biểu tượng có `aria-label`, `title`.
- Đầu dự án: tên (bấm để đổi dự án), tiến độ chung, chú giải trạng thái kèm số đếm. Chip trạng thái có chữ và chấm khác hình.
- Cột tên bước rộng cố định, thẻ cùng bề rộng (các hàng thẳng cột). Hàng thẻ cuộn ngang bên trong, không hiện thanh cuộn,
  mép mờ báo còn chỗ cuộn. ≤ 640px: một cột, đầu bước trên cùng, rồi băng Reopened, dải tài liệu, hàng thẻ.
- Hộp thoại: chỉ thân cuộn (đầu, chân đứng yên; trang sau khoá cuộn); ≤ 640px tấm đáy; Markdown toàn màn; trạng thái: viên radio.
- Mọi `<select>` chọn thứ có nghĩa dùng danh sách tự dựng (nổi ở lớp trên cùng, không đẩy bố cục; phím ↑ ↓, gõ chữ đầu,
  Enter, Esc trả focus); ô chỉ chọn số giữ `<select>` gốc (`data-native`). Option có `data-dot`, `data-hint` thì hiện thêm.
- Cảm ứng và ≤ 640px: vùng bấm ≥ 44px. Trang không cuộn ngang. Tạo hay mở dự án thì về đầu trang, không cuộn theo focus.

## Cổng: `sh step-planner/tools/check.sh`

- `tools/lint.py`: khuôn mẫu, mẫu đồ án khớp nguồn và neo, không `innerHTML`, mã màu chỉ trong khối token.
- `node --check` cho `js/*.js`; `tools/test-core.mjs`: logic thuần của `core.js`, `md.js`; danh sách ở chính file.
- `tools/smoke.cjs` (cổng tự dựng máy chủ tạm; thiếu playwright thì bỏ qua, CI chạy ở job smoke): bấm thật các hành vi trên,
  hai tab, 390px, bộ nhớ bị chặn / hỏng / khoá cũ, lỗi console; số mẫu đọc từ `templates.json`. Chạy tay: `node <file> <url>`.
