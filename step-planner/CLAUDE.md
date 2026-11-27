# `step-planner/` — Data Science Step Planner

- Tên hiển thị: Data Science Step Planner (`<title>`, thanh trên, trang chủ, Markdown); thư mục, khoá giữ `step-planner`.
- Một trang, `index.html`: dự án chia thành bước (hàng) và bước con (thẻ), trạng thái, hạn, tài liệu, bàn giao, nhật ký quyết
  định, System design, xuất / nhập Markdown và JSON. Ưu tiên dự án dữ liệu, dùng được cho dự án bất kỳ. Không có người làm (PLAN-010).
- Chữ giao diện tiếng Anh, ngắn kiểu ghi chú (PLAN-012); nội dung mẫu, lời giải thích, tài liệu repo tiếng Việt (PLAN-028).
  Chuỗi tiếng Việt có chủ ý trong `js/` mang chú thích `lang: vi — lý do` trên dòng mở hoặc dòng đóng chuỗi; một chú thích miễn đúng một
  chuỗi (hai chuỗi tiếng Việt thì tách dòng). Quyết định: [DECISIONS.md](DECISIONS.md).
- Khuôn Markdown và JSON: [FORMAT.md](FORMAT.md). Đổi khuôn thì sửa file ấy cùng commit.
- Không build. Mở qua HTTP: `python3 -m http.server` ở gốc repo, `http://localhost:8000/step-planner/` (`file://`: trang báo).

## Code (PLAN-034)

| File | Việc |
|---|---|
| `index.html`, `js/main.js` | markup, hộp thoại, bộ biểu tượng `<symbol id="i-…">`, script theme trước lần vẽ đầu, script báo `file://`; gọi `init…` theo thứ tự ghi ở đầu file, rồi nạp mẫu, chọn dự án, vẽ |
| `css/*.css` | `tokens` → `base` → `project` → `board` → `cards` → `drag` → `foot` → `log` → `design` → `dropdown` → `dialogs` → `docs` → `hand` → `md` → `start` → `toast`; thứ tự link là cascade |
| `js/core/model.js`, `js/core/board.js`, `js/core/handoffs.js` | trạng thái, ngày, id, chuẩn hoá (`normSub`, `normStep`, `normWorkspace`), gộp khi lưu (`EDIT_FIELDS`, `mergeEdit`), `freshCopy`, `fromTemplate`, nhóm mẫu (`tplGroups`); tiến độ, ô, chỗ (`Place`) và mọi phép dời, số, việc tiếp theo, nhóm lọc; bàn giao (`holders`, `handoffs`, `ioStatus`, `consumersOf`, "on hold" theo chỗ chưa lưu) |
| `js/core/markdown.js`, `js/core/io.js` | Markdown dự án vào / ra; JSON, sao lưu, `parseImport`, `counts`, `plural`, `slug`, `shape` (cho test) |
| `js/core/design.js`, `js/core/design-plan.js`, `js/core/design-md.js`, `js/core/arch-diagram.js` | System design: `normDesign`, `rankOptions`, `stageLists`, `applyPath`, `archAdvice`, `archState`, `archMissing`, `warnings`, `catalogErrors`, `presetDesign`, `isPreset`, `isPresetStage`; sơ đồ (`diagramNodes`, `flowEdges`), việc (`planTasks`, `planDiff`, `applyPlan`); mục Markdown (`designMd`, `designReader`); sơ đồ của một kiến trúc (`diagramGrid`, `diagramErrors`, `layoutDiagram`) |
| `js/core/md.js`, `js/ui/md-view.js`, `js/ui/md-dialog.js` | tài liệu văn bản: cây khối (`parseMd`), URL trần (`linkParts`, dấu câu cuối ở ngoài), token khung Edit (`srcTokens`); DOM (`renderMd`, `renderSrc`, chỉ createElement / text node); hộp `#dlg-md` |
| `js/core/view-math.js`, `js/ui/diagram-view.js`, `js/ui/design.js`, `js/ui/arch-diagram.js` | khung nhìn của sơ đồ: toán (hằng ở đầu file), DOM (bánh xe, kéo, phím, cụm nút; `attach` sau mỗi lần vẽ); System design: mục trên trang, sơ đồ SVG, `#dlg-sd`, hộp Update plan; trang Architecture: câu hỏi chọn, sơ đồ luồng mỗi kiến trúc (vẽ khi thẻ mở, theo bề rộng) |
| `js/ui/store.js`, `js/ui/state.js`, `js/ui/dom.js`, `js/ui/toast.js`, `js/ui/dialogs.js` | `localStorage` (dữ liệu, `stepPlanner.hintOff`, `stepPlanner.compact`, `hub-theme`), `sessionStorage` (dự án của tab), mọi truy cập bọc try/catch; `state`, `curId`, `templates`, `ui`, `persist`, `commit`, `refocus`; `$`, `h()`, `icon()`, `withLinks()`, `field()`, `fmtDate()`; toast có Hoàn tác; mở / đóng hộp, `ask` (`#dlg-ask`), `mergeSaved` |
| `js/ui/render.js`, `js/ui/board.js`, `js/ui/step-row.js`, `js/ui/clamp.js` | vẽ cả trang (`render`); bảng theo hàng (`renderBoard`: khoá mỗi hàng, chỉ hàng đổi dựng lại), số đứng yên; một hàng (`stepRow`); chữ dài bị cắt, "Show more" |
| `js/ui/actions.js`, `js/ui/move.js`, `js/ui/drag.js`, `js/ui/dropdown.js` | bấm, phím trên bảng, danh sách trạng thái, nhân bản, xoá; dời, toast "Moved", tô; kéo thả bằng pointer events (bóng, "Drop here", FLIP, tự cuộn, Esc; mỗi khung hình một lượt); danh sách chọn tự dựng (`enhanceSelect`, `openList`) |
| `js/ui/sub-dialog.js`, `js/ui/step-dialog.js`, `js/ui/docs.js`, `js/ui/revisit.js`, `js/ui/hand.js` | hộp sửa bước con, bước; tài liệu (`#dlg-doc`); Reopen (`#dlg-revisit`); bàn giao: chip In / Out, hai chấm (`ioDots`), mũi tên, `#dlg-hand`, Inputs / Outputs, `#dlg-pick` |
| `js/ui/projects.js`, `js/ui/start.js`, `js/ui/toolbar.js`, `js/ui/filter.js`, `js/ui/log.js`, `js/ui/export.js`, `js/ui/import.js` | dự án (`#dlg-ws`); màn đầu; mẹo, Compact, ghi chú dự án, theme; tìm, lọc, "Next waits on"; nhật ký; xuất, nhắc sao lưu; nhập |

- Ba lớp tách nhau: giao diện (`js/ui/`, `css/`), logic (`js/core/`: dữ liệu vào, dữ liệu ra; không DOM, `window`, bộ nhớ trình duyệt, lớp CSS; chỉ import `js/core/`; `lint.py` kiểm), luật / cấu hình (`data/*.json`, `css/tokens.css`, hằng đầu module).
- Tính năng mới: module riêng trong lớp của nó. Thứ dùng ≥ 2 chỗ nằm một chỗ chung (`ui/dom.js`, `ui/state.js`, `css/base.css`); dùng một chỗ thì không tách.
- Sự kiện gắn trong `init…()` của module `js/ui/`, `main.js` gọi; thứ tự gọi là thứ tự đăng ký (cặp cùng phần tử ghi ở đầu `main.js`). Code cấp cao của module không gọi sang module khác.
- Biến dùng chung: `export let` ở module sở hữu; nơi khác chỉ đọc, gán lại qua hàm của chủ (`setCur`, `resetBoard`, `clearDocUndo`). Mỗi file mở đầu bằng chú thích: làm gì, `Xuất:`, `Dùng:`.

## Dữ liệu

- `localStorage['stepPlanner.v2']`: `{version, workspaces[], lastId, lastBackup, dirtySince}`. Đổi khuôn thì tăng số khoá;
  khoá cũ (`OLD_KEYS`) đọc khi khoá mới chưa có rồi ghi sang khoá mới. Trường mới có mặc định thì không đổi khoá.
- Workspace `{id, name, templateId, createdAt, updatedAt, notes, steps[], log[], design}`.
- Log `{id, date, decision, why, stepId}`; `stepId`: id một bước hoặc rỗng; bước không còn thì rỗng.
- Step `{id, title, goal, doneWhen, notes, revisit: null | {reason, date, round}, round, docs[], outs[], ins[], subs[]}`.
  `round`: vòng gần nhất (1 = chưa mở lại); đang mở lại thì `round` = `revisit.round` ≥ 2.
- Sub `{id, title, status, reason, due, doneAt, doneWhen, notes, docs[], outs[], ins[], par, redo, sd?}`.
- `status` ∈ `todo doing pending blocked done skip cancel`. `reason` (nhiều dòng) chỉ giữ khi `pending`, `blocked`, `cancel`.
- `due`, `doneAt`: `YYYY-MM-DD` hoặc rỗng. `doneAt`: ngày sang Done (`setStatus`), chỉ giữ khi `done`; dữ liệu cũ rỗng, không bịa ngày.
- `par: true` = nhập ô của bước con ngay trước; `subs[0].par` luôn false. Ô (slot), chỗ (`Place`), mọi phép dời ở `core/board.js`.
- `redo: true` = được gửi lại làm trong vòng đang mở; bước không mở lại thì mọi `redo` là false.
- `sd`: `stage:<khâu>@<chữ ký>` hoặc `edge:<a>><b>@<chữ ký>`, chỉ ở bước con System design sinh ra; nhân bản bước con thì bỏ. `kept`: đã chọn Keep, nhân bản giữ.
- Doc `{id, kind: 'link', title, url, proof}` hoặc `{id, kind: 'md', title, body, proof}`. `url` chỉ http(s) (`safeUrl`); link
  khác bị bỏ (nhập thì cảnh báo). `body` giữ nguyên từng dòng. `proof: true` = bằng chứng cho "Done when".
- Out `{id, name, ref, note, final}`: `name` bắt buộc (không tên thì bỏ); `ref` đường dẫn file hay link; `note` hợp đồng một dòng; `final: true` = sản phẩm cuối (PLAN-038).
- `ins`: id đầu ra ở chỗ khác trong dự án; bỏ trùng, bỏ id của chính nó; id không còn đầu ra (mất nguồn) vẫn giữ. `normWorkspace`: id đầu ra duy nhất.
- `design`: null hoặc `{path, profile, stages: {khâu: {pick[], skip, own, note}}, edges: {"a>b": {via, what, where, promise, check}}, arch: {nhóm: kiến trúc}, archWhy: {nhóm: lý do một dòng}}`
  (`normDesign`). Khâu `skip` vẫn giữ `pick`, `own` (ẩn, bỏ qua ở mọi chỗ); bỏ `skip` là chúng về lại. `arch` không giữ kiến trúc mang lối (đó là `path`).
- Mọi dữ liệu đi qua `normSub` / `normStep` / `normWorkspace`: chuỗi một dòng gộp khoảng trắng, phần tử sai kiểu bị bỏ,
  ngày phải có thật (`parseDate`). Trường lạ (kể cả `owner`, `people`, `me` cũ) bị bỏ, không lỗi; `cancelReason` cũ đọc thành `reason`.
- Nhân bản dự án, nhập: id mới cho mọi thứ, đầu vào và quyết định trỏ theo (`freshCopy`). Nhân bản bước con: đầu ra id mới, giữ đầu vào.
- Hai mốc sao lưu chỉ ở máy này, không xuất. Dự án đang mở của tab ở `sessionStorage['stepPlanner.tab']`. Bộ nhớ bị chặn: bộ nhớ tạm + banner.
  Hỏng: chép sang `stepPlanner.v2.corrupt`, bắt đầu trống. Lúc mở gọi `navigator.storage.persist()` (Safari xoá dữ liệu script ghi sau 7 ngày không mở).

## Hành vi

- Bảy trạng thái (PLAN-003), thứ tự này ở mọi chỗ: New (`todo`), In progress, Pending, Blocked, Done, Skipped, Cancelled.
  Nhãn lý do (`REASON_LABEL`): Pending "Waiting on", Blocked "Blocked by", Cancelled "Cancelled because".
- Tiến độ = xong / (tổng − bỏ qua − huỷ). "Next" = thẻ còn mở, trừ thẻ chờ (Pending, Blocked), của ô đầu tiên còn việc trong bước đầu tiên còn việc.
- Ô ấy chỉ còn Pending / Blocked (`nextWaitingOn`): dòng "Next waits on …" nêu thẻ và lý do; nút lọc Actionable. "Next" không vượt chỗ chờ.
- Hạn qua: "(overdue)", trừ thẻ xong, bỏ qua, huỷ. Thẻ xong có `doneAt` hiện ngày xong.
- Lọc trạng thái (`STATUS_GROUPS`): All statuses, Actionable (New, In progress), Waiting (Pending, Blocked), Done, Skipped, cancelled.
  Lọc và tìm là giao; "Clear filters" bỏ cả hai. Mỗi tab một bộ lọc, không lưu; đổi / tạo / nhập dự án thì bỏ.
- Tìm bỏ qua dấu và hoa thường, khớp cả lý do, tài liệu, tên và `ref` của đầu ra; bước khớp thì hiện cả hàng. Đang tìm hay lọc thì tắt sắp xếp, thêm bước, Renumber, ẩn vạch bàn giao.
- Song song (PLAN-013): mỗi ô một cột của hàng; ô k thẻ đánh `n.1` … `n.k`. Alt + ← →: đổi ô (thẻ ở ô song song thì tách ra
  ô riêng), Alt + ↑ ↓: đổi thứ tự trong ô. Toast dời tả chỗ mới bằng tên hàng xóm, không bằng số.
- Số đứng yên trong phiên (PLAN-014): chụp số khi dự án hiện lần đầu sau khi mở trang (và sau nhập thay nội dung); dời, xoá không đổi số;
  cái thêm trong phiên hiện chấm thay số (dự án trống lúc chụp: cái thêm nhận số tới khi một số cũ phải đổi). Số lệch thì nút "Renumber" hiện.
- Bấm chip: New → In progress → Done; chip trạng thái khác (hoặc Shift + bấm, Alt + ↓) mở danh sách bảy trạng thái.
  Chọn Cancelled: mở hộp sửa, focus ô lý do; Lưu mới huỷ. Pending, Blocked đặt ngay, lý do sửa trong hộp.
- Thêm bước: nút cuối bảng, hoặc "Add step" giữa hai bước (đặt sẵn vị trí). Thêm bước con: nút ở cột tên bước.
- Bấm vào thẻ (ngoài nút) mở hộp sửa; bấm dấu tài liệu mở hộp sửa ở phần tài liệu.
- Mỗi thẻ hai điểm dừng Tab: tên và chip; nút phụ `tabindex=-1`, việc của chúng làm được bằng phím (Alt + mũi tên, hộp sửa).
- Kéo thả: chuột kéo thẻ (trừ nút, link) hay đầu bước; chạm thì giữ rồi kéo, bước kéo bằng tay nắm. Đang kéo không vẽ lại bảng.
  Nửa trái / phải một ô: chen ô mới trước / sau; phần dưới thẻ hay giữa ô song song: nhập ô ấy. Gần mép tự cuộn; Esc huỷ.
- Đổi chỗ (mọi cách): toast "Moved …" có Hoàn tác, không lấy focus; dời liền: Hoàn tác về chỗ đầu.
- Dời bước con sang bước khác (`moveSubTo`, mọi cách) bỏ dấu Redo; Hoàn tác trả dấu nếu bước gốc còn mở lại.
- "Reopen" (PLAN-004): chỉ khi bước có bước con Done (`canReopen`). Lý do bắt buộc; chọn bước con Done để gửi lại (mặc định không).
  Mở vòng `round + 1`; bước con đã chọn về New, mang dấu Redo tới khi xong lại; nhật ký ghi "Reopened: tên (iteration N)" gắn với bước.
- Reopen: đầu ra của bước, của bước con gửi lại đang được nơi khác dùng thì hộp nêu "Also check: …", dòng ấy vào Why của nhật ký.
- Băng Reopened đếm "k of n redo tasks left"; xong hết thì "Close iteration" là nút chính. Đóng vòng bỏ dấu Redo. Mỗi thao tác một Hoàn tác.
- Xoá bước con, quyết định, tài liệu: một bấm. Xoá bước còn bước con, xoá dự án (không hoàn tác): hỏi lại. Sau khi xoá, focus vào
  Hoàn tác của toast; Ctrl/Cmd + Z hoàn tác khi không gõ chữ, không có hộp mở, và không bấm nút toast khác Hoàn tác.
- Hoàn tác tìm lại dự án và bước theo id (tab khác có thể đã thay `state`).
- Hộp sửa: Enter ở tên lưu; Esc, ×, Close, Duplicate khi chữ đổi thì hỏi lại. Nút đóng ghi "Close", không "Cancel". Đóng: focus về chỗ mở.
- Lưu hộp sửa (bước con, bước, quyết định): chỉ ghi trường đã đổi so với lúc mở (`EDIT_FIELDS`, `mergeEdit`) lên bản mới nhất. Trường mới của hộp sửa phải thêm vào `EDIT_FIELDS`.
- Cùng trường bị tab khác đổi khác: `#dlg-ask` liệt kê, "Keep mine" / "Keep the other tab's"; Close thì hộp sửa vẫn mở.
  Mục đã bị tab khác xoá: "Re-create" / "Discard my edits". Vị trí chỉ đổi khi người dùng đổi ô Bước / Vị trí.
- Tài liệu (PLAN-011): thêm / sửa / xoá trong hộp sửa, lưu ngay. Link mở tab mới (`noopener noreferrer`); văn bản mở `#dlg-md`.
- Bằng chứng: nút "Evidence" trên mỗi tài liệu của bước, bước con bật `proof`; sửa tài liệu giữ `proof`. Thẻ xong có bằng chứng có dấu riêng.
- Vừa sang Done mà có "Done when" và chưa có bằng chứng (`needsEvidence`): toast gợi ý "Add evidence", không chặn.
- Nhật ký (PLAN-005): mới nhất trước, nhóm theo tháng; bấm mục là sửa; bấm chip bước là tới bước ấy (bỏ lọc nếu cần).
- Ghi bộ nhớ ở lượt việc kế, không chờ khung hình (tab nền bị hãm); rời, ẩn trang: ghi ngay. Tab khác sửa cùng khoá thì đọc lại (`storage`), giữ dự án của tab.
- Chữ dài trên bảng dừng ở số dòng của token `--lines-*`, thẻ ở `--card-max`; bị cắt thì "Show more" mở cả thẻ / đầu bước (nút của đầu bước
  trong vòng Tab), link ở phần bị che ra khỏi vòng Tab. Vẽ lại giữ ghi chú đang mở, khối đã mở, chỗ cuộn ngang; hàng không đổi giữ nút DOM.
- Mẹo tắt bằng ×; "Compact" ẩn "Done when", ghi chú, lý do (cả hai nhớ ở máy này). "Log (N)" tới nhật ký.
- Nhắc sao lưu: thay đổi chưa sao lưu ≥ 3 ngày thì nút nhắc hiện cạnh Export, bấm là tải sao lưu mọi dự án.
- Chữ người dùng chỉ vào DOM qua text node; không `innerHTML` ở `js/`. Không `alert` / `confirm` / `prompt` (`#dlg-ask`).

## Bàn giao (outs / ins)

- Đầu ra khai ở bước / bước con tạo ra nó; nơi dùng chọn "Use existing output". Một đầu ra nhiều nơi dùng; liên kết theo id.
- Bước không chọn được đầu ra của chính nó và các bước con của nó; có sẵn (dời bước con vào) thì không tính, hộp sửa ghi "inside this step" để gỡ. Inputs / Outputs lưu cùng Save.
- Thẻ bước con không liệt kê đầu vào, đầu ra; xem và sửa trong hộp sửa. Bước có chip "In n" (mọi đầu vào, kể cả treo, mất nguồn), "Out n".
- Thẻ và đầu bước hiện trạng thái đầu vào, đầu ra (`ioStatus`, PLAN-025): ổn, lỗi, không có; không có cả hai thì không hiện.
  Đầu vào lỗi: treo hoặc trỏ tới đầu ra không còn. Bước gộp đầu vào của bước con: có đầu vào khi nó hay một bước con nhận từ
  ngoài bước; lỗi khi một đầu vào nào lỗi, kể cả nhận trong bước. Đầu ra lỗi: không có nơi nhận đang nối (chỉ nơi nhận treo cũng tính;
  đầu ra `final` không ai dùng thì ổn) hoặc có một nơi nhận treo. Bước con lỗi khi một đầu ra lỗi; bước gộp đầu ra của bước con, lỗi khi
  không đầu ra nào ổn (có nơi nhận đang nối, hay `final` không ai dùng) hoặc một đầu ra có nơi nhận treo.
- Hàng j nhận từ hàng trước nó (`handoffs().rows`): mũi tên trên hàng j. Ô k + 1 nhận từ ô trước nó cùng hàng (`gaps`): một ô
  mũi tên trước ô k + 1. Nút giữa mũi tên ghi tên đầu ra; bấm thì nêu từng cặp. Chảy ngược hay cùng ô: chỉ trong hộp sửa.
- Danh sách nêu đường dẫn, hợp đồng, bên giao / nơi dùng, mỗi bên nhảy tới được.
- Chọn dòng trong danh sách cặp: tô hai bên, focus bên nhận, không cuộn; bên nào ngoài tầm nhìn (trang, hàng thẻ) thì toast
  nói hướng, nút "Show" mới cuộn tới. Nút một bên vẫn bỏ lọc và cuộn tới.
- Treo (`handoffs().held`): bên nhận đứng trước bên giao sau khi sắp xếp, hay cùng ô song song với nó (`parKeys`; chữ ghi "runs in parallel"). Giữ nguyên `ins`, không mũi tên; danh sách ghi "on hold";
  toast dời, toast Lưu của hộp sửa báo cái vừa treo. Dời về đúng thứ tự là nối lại, không cần làm gì.
- Hộp sửa tính "on hold" theo ô Bước / Vị trí đang chọn, chưa Lưu (`heldInfoAt`, `handoffsAt`); hộp chọn đầu ra ghi đầu ra đứng sau hay cùng ô.
- Xoá bên giao không gỡ đầu vào nơi khác: đầu vào mất nguồn giữ qua lần tải lại, xuất / nhập, chấm đỏ; danh sách, hộp sửa ghi "Deleted output", gỡ bằng nút x. Hoàn tác xoá nối lại (`insBackup`).

## Mẫu (`data/templates.json`)

- Khuôn, khoá, chuỗi, ngôn ngữ, `output`, bàn giao, `design`: `lint.py` (docstring đầu file); khuôn đầy đủ ở đó, đừng chép lại.
- Đúng một mẫu trống. Mẫu chung không gắn vào một bài toán; dự án cụ thể chủ trang đang làm ghi `"group": "specific"` (PLAN-039). Không thẻ HTML, không người làm.
- `design` (PLAN-033, PLAN-042): câu hồ sơ, lối, kiến trúc mẫu thật sự chọn; `stages` chỉ khi dự án của mẫu đã quyết stack (khuôn như dự án); `fromTemplate` chép một lần. Hộp ghi "Preset from template" khi còn đúng (`isPreset`, `isPresetStage`).
- Mọi chữ của mẫu tiếng Việt (PLAN-028); tên bước, bước con theo chuẩn: tên tiếng Việt, tên gốc trong ngoặc, ví dụ
  "Hiểu dữ liệu (Data Understanding)". Giữ nguyên tên công cụ, thư viện, file, lệnh, URL.
- `output`: loại đầu ra, hiện trên thẻ mẫu. `description` nói khi nào chọn mẫu, phần nào bỏ được khi làm một mình.
- `outs: [{key, name, ref?, note?, final?}]`, `ins: [key]`: `fromTemplate` đổi key thành id mới, key lạ bỏ. Dữ liệu chỉ chảy xuôi (`check_flow`); `test-core` kiểm mọi mẫu: không đầu vào treo (kể cả cùng ô), không đầu vào lơ lửng, không đầu ra lỗi (sản phẩm cuối ghi `final: true`; không ngoại lệ).
- `ref` là đường dẫn quy ước (CRISP-DM: Cookiecutter Data Science) hoặc link https; `note`: một dòng là gì, khoá, cách kiểm.
- `crisp-dm` theo CRISP-DM 1.0 Step-by-step guide (Chapman et al., 2000): bước là sáu pha, bước con là generic task, `doneWhen`
  là output của task, `notes` là câu hỏi gợi ý và bẫy hay gặp. Việc ngoài guide ghi nguồn trong tên thẻ; không thêm việc không có nguồn.
- CRISP-DM: chia train / validation / test (task 4.2, dời lên pha 3 ngay sau Ghép dữ liệu) trước làm sạch, điền thiếu, tạo đặc trưng;
  mọi biến đổi fit chỉ trên train, đặt chung Pipeline với mô hình. Đừng thêm bước con làm rò rỉ dữ liệu test.
- CRISP-DM: pha Mô hình hoá xong khi có bảng so với baseline và một quyết định kèm số đo; giữ baseline là kết quả hợp lệ.
- `smoke.cjs` tìm `VERIFY data quality` (đúng một bước con) và `BUSINESS understanding` (đúng một bước) trên `crisp-dm`.
- `stats-report` theo PPDAC, tên bước, bước con đúng hình 1(a) của Wild & Pfannkuch (1999). Không thêm thẻ ngoài hình.
- `data-pipeline` theo vòng đời data engineering (Reis & Housley, 2022): năm khâu và mạch ngầm (Undercurrents); việc từ nguồn khác ghi nguồn trong tên thẻ.
- `big-data-ds` (PLAN-024): sáu pha CRISP-DM, thêm bước Thu nạp và lưu trữ dữ liệu sau pha Hiểu bài toán kinh doanh; ghi chú mỗi bước
  nói khác gì dự án thường; link bài giảng `masters-degree/big-data-storage-processing/` theo neo (`lint.py` kiểm neo).
- `lakehouse-oss` (PLAN-029): mẫu chung cho mọi lakehouse mã nguồn mở; stack cụ thể chỉ là ví dụ ở ghi chú. Hạ tầng, dữ liệu trước,
  điều phối sau; bước cuối kiểm tuân thủ medallion. Ghi chú về giấy phép, tình trạng bảo trì công cụ ghi kèm link nguồn.
- `app-feature` không theo chuẩn; việc phát hành theo tài liệu App Store Connect, Google Play, Flutter (link ở ghi chú bước).
- `it5425-sports` (PLAN-040, PLAN-041): mẫu viết tay, không sinh từ trang đồ án, theo mọi luật chung ở trên. Không tên người.
  Số liệu, link, lý do bỏ công cụ ở ghi chú bước chỉ lấy từ nguồn đã mở; hồ sơ trả lời thật cỡ dữ liệu; mọi khâu đặt sẵn stack của nhóm, không khâu trống, không luật báo (`test-core`).

## System design (`data/system-design.json`, PLAN-016)

- Danh mục `{note, paths[], profile[], stages[], checks[], architectures[]}`; khuôn, độ phủ, luật: `lint.py`. Số khâu, phương án, luật đọc từ file.
- `label`, `title`, `kind`, `name`, `flow` của kiến trúc tiếng Anh (giao diện); tên trang ngoài (`links[].title`, `sources[].title`) giữ chữ
  của trang ấy; id, URL, lệnh không xét; mọi chữ khác, cả trường mới, tiếng Việt (lời giải thích). Link chỉ trang chính thức đã mở được; không ghi giá, hạn mức bằng số; lệnh chép từ quickstart.
- Hộp mở ở "What do you deliver?" (lối), rồi hồ sơ, Architecture, từng khâu, Handoffs, Checks. Câu hồ sơ ngoài `ask` của lối gập lại, vẫn trả lời được.
- Gợi ý: câu chưa trả lời lấy theo `implies` của lối; xếp hợp hồ sơ trước, rồi `suggest` của lối theo đúng thứ tự, rồi khớp nhiều câu,
  dễ hơn, thứ tự danh mục. Lựa chọn lưu ngay. `fit` nghĩa là "dùng được", không thêm khoá `fit` chỉ để đẩy hạng.
- Khâu có `when` (câu hồ sơ → câu trả lời cần khâu): trả lời ngoài `when` thì khâu "thường không cần" (`notNeededBy`), "Apply path"
  đánh dấu Not needed; độ phủ của `lint.py` bỏ qua câu trả lời ấy. Câu chưa trả lời: khâu vẫn hiện.
- Catalog của table format (Polaris, Hive Metastore, Nessie, JDBC) là phương án của khâu `raw`, cùng chỗ lưu và table format; không có khâu riêng.
- Câu `selfhost` = `yes`: dịch vụ được quản lý mang `fit.selfhost: ["no"]`; phương án mới chạy trên hạ tầng người khác thì thêm khoá ấy.
- Công cụ nên tránh khi làm một mình vẫn có trong danh mục nếu người học hay gặp: `avoid` nói vì sao và chọn gì thay, có luật báo, không đứng đầu `suggest` của lối nào.
- "Apply path" (`applyPath`): chỉ khâu chưa quyết; `skip` → Not needed (`when` của khâu khớp hồ sơ thì để trống); `need` có gợi ý → phương án hợp đầu tiên làm ít luật báo
  nhất, công cụ của kiến trúc (chọn, chưa chọn thì gợi ý) đứng trước gợi ý của lối (PLAN-037: kho thô, kho phân tích theo nhóm lưu trữ rồi xử lý; khâu khác theo nhóm xử lý; không theo nhóm chia tầng), không phương án nào hợp thì để trống; `maybe` để trống trừ khi kiến trúc chọn có công cụ ở đó. Không tự gây luật báo (trừ `caveat`): bỏ khâu, hay phương án lấy được, mà làm luật báo thì để khâu ấy trống. `test-core` dò lưới hồ sơ × lối.
- Luật phối hợp (`warnings`): báo khi mọi `if` khớp và mọi khâu trong `unless` đã quyết mà không khớp; khâu chưa quyết thì chưa báo.
  Khoá điều kiện: id khâu (phương án, `skip`, `own`), câu hồ sơ, `path`, hay (chỉ ở `if`) id nhóm kiến trúc không trùng id khâu: kiến trúc người dùng chọn. Phương án không được có id `skip`, `own`.
  `caveat: true`: luật chỉ nhắc cách dùng, phương án vẫn đúng (host miễn phí ngủ, đĩa không bền, file DuckDB sau API).
- Kiến trúc (`architectures`, PLAN-043): nhóm (câu hỏi chọn `guide`) → kiến trúc (khi dùng, khi tránh, ví dụ, luồng, sơ đồ `diagram`, công cụ, nguồn); `archNote`: các nhóm ghép với nhau.
  Sơ đồ: mỗi đường nối đi đúng một tầng, ≤ 5 tầng, ≤ 3 làn (`test-core`). Gợi ý: `archAdvice` lấy luật đầu tiên khớp của nhóm (khoá điều kiện như `checks`), `""` = nhóm không cần.
  Lựa chọn (PLAN-042): `design.arch`, nhóm app chọn qua `path`; `archState` gộp cả hai. Kiến trúc chọn: thứ tự `tools` là thứ tự ưu tiên; câu hồ sơ nó đứng trên ở `ARCH_RELAX`; luật hồ sơ ↔ công cụ nó giải thích có `arch`, chỉ là lời nhắc.
  Kiến trúc được gợi ý phải có ở mỗi khâu một công cụ không làm luật báo với hồ sơ ấy (`test-core`; khâu nhiều công cụ đã quyết thì thêm bên cạnh); hồ sơ nói ngược khâu đã quyết thì luật hồ sơ đứng trước.
- Bàn giao (`edges`): đường nối hai khâu liền nhau của luồng, cả hai đã quyết (`flowEdges`). Hợp đồng giữ cả khi đường nối không còn.
- Sơ đồ: đường nối nét liền khi cả hai khâu đã quyết (`bothDecided`, cùng luật với `flowEdges`), còn lại nét đứt.
- Sơ đồ là khung nhìn (PLAN-031): không lưu, tải lại về khung ban đầu; bánh xe trơn chỉ kéo khung khi khung có focus hay giữ Space. Luật đủ: đầu `ui/diagram-view.js`.
- "Add tasks to plan" / "Update plan": luôn xem trước New / Changed / No longer in the design, chọn từng mục và bước nhận
  (mặc định "System build", chưa có thì tạo ở vị trí 2). Mỗi khâu đã quyết một việc, mỗi bàn giao đã ghi một việc `Handoff: A → B`.
- Đối chiếu theo `sd`; bước con chưa có `sd` thì theo tên trong bước "System build".
- Update: thay tên, Done when, thêm link và dòng ghi chú mới; giữ ghi chú, tài liệu của người dùng; Done về New.
  "Keep old and add new": cũ thành Cancelled ("Replaced in system design: …"). Cancel: "No longer in system design: …". Keep: `sd` = `kept`, không đối chiếu lại. Một Hoàn tác.

## Giao diện

- Màu, cỡ, khoảng cách chỉ ở token `css/tokens.css` (REPO-028, REPO-023); dáng chung chép từ `md-annotate/`; theme theo hệ điều hành tới khi bấm nút (REPO-024), khoá `hub-theme`.
- Biểu tượng: `<symbol id="i-…">` trong `index.html` qua `<use>`, không ký tự unicode; nút chỉ biểu tượng có `aria-label`, `title`.
- Mọi `<select>` chọn thứ có nghĩa dùng danh sách tự dựng (↑ ↓, gõ chữ đầu, Enter, Esc); ô chỉ chọn số giữ `<select>` gốc (`data-native`).
- Nút bàn giao, nút phụ trên thẻ ngoài vòng Tab. Vùng bấm ở cảm ứng và trang không cuộn ngang: smoke đo.
- Vòng focus chỉ khi dùng bàn phím: chuột, chạm bật lớp `quiet-focus`; Tab, phím điều hướng, phím tắt gỡ (`ui/dialogs.js`). Luật CSS vẽ vòng mở bằng `:where(:root:not(.quiet-focus))`.

## Cổng: `sh step-planner/tools/check.sh`

- `tools/lint.py`: khuôn mẫu và bàn giao trong mẫu, ngôn ngữ (giao diện, mẫu, System design), danh mục System design, link trang của repo có file và neo, không `innerHTML`, mã màu chỉ trong `css/tokens.css`, vòng focus có gác `quiet-focus`, mọi file CSS được link, `js/core/` thuần, import có file, không file mồ côi.
  `lint.py --self-test`: cài lỗi vào bản sao tạm, mỗi lỗi phải bị bắt.
- `node --input-type=module --check < file` cho mọi file dưới `js/` (`node --check file.js` bỏ sót lỗi của module).
- `tools/test-core.mjs`: logic thuần của `js/core/`; danh sách ở chính file.
  Gợi ý kiến trúc và luật báo so với ảnh chụp `tools/design-snapshot.json`; đổi danh mục có chủ ý thì sinh lại: `node step-planner/tools/test-core.mjs --write-snapshot`.
- `tools/smoke.cjs` (cổng tự dựng máy chủ tạm; thiếu playwright thì bỏ qua, CI chạy ở job smoke): bấm thật các hành vi trên,
  hai tab, 390px, bộ nhớ bị chặn / hỏng / khoá cũ, lỗi console; số mẫu đọc từ `templates.json`. Chạy tay: `node <file> <url>`.
  Mỗi phần `section(tên, …)` chạy riêng: một phần ném lỗi thì báo LỖI, phần sau vẫn chạy. `SMOKE_ONLY=<chữ trong tên>` chạy riêng phần ấy.
  Chờ bằng điều kiện (`waitTo`, `synced` cho hai tab), không ngủ cố định. Font Google tải thật; phần đo lần vẽ chặn font để sự kiện font không sửa hộ.
