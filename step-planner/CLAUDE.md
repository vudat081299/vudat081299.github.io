# `step-planner/` — Data Science Step Planner

- Tên hiển thị: Data Science Step Planner (`<title>`, thanh trên, trang chủ, Markdown); thư mục, khoá giữ `step-planner`.
- Một trang, `index.html`: dự án chia thành bước (hàng) và bước con (thẻ), trạng thái, hạn, tài liệu, bàn giao, nhật ký quyết
  định, System design, xuất / nhập Markdown và JSON. Ưu tiên dự án dữ liệu, dùng được cho dự án bất kỳ. Không có người làm (PLAN-010).
- Chữ giao diện tiếng Anh, ngắn kiểu ghi chú (PLAN-012); nội dung mẫu, lời giải thích, tài liệu repo tiếng Việt (PLAN-028).
  Chuỗi tiếng Việt có chủ ý trong `js/` mang chú thích `lang: vi — lý do` trên dòng mở hoặc dòng đóng chuỗi; một chú thích miễn đúng một
  chuỗi (hai chuỗi tiếng Việt thì tách dòng). Quyết định: [DECISIONS.md](DECISIONS.md).
- Khuôn Markdown và JSON: [FORMAT.md](FORMAT.md). Đổi khuôn thì sửa file ấy cùng commit.
- Không build. Mở qua HTTP: `python3 -m http.server` ở gốc repo, `http://localhost:8000/step-planner/` (`file://`: trang báo).

## File

| File | Việc |
|---|---|
| `index.html` | markup, hộp thoại, bộ biểu tượng `<symbol id="i-…">`, script theme trước lần vẽ đầu, script báo `file://` |
| `css/planner.css` | token ở đầu (tới dòng `/* ── hết token ── */`), rồi từng component, mỗi khối mở bằng một dòng chú thích |
| `js/core.js` | logic thuần: chuẩn hoá, gộp khi lưu, ngày, tiến độ, việc tiếp theo, bàn giao (`holders`, `handoffs`, `ioStatus`, `consumersOf`), Markdown và JSON vào / ra; không DOM, chạy được trong Node |
| `js/md.js` | Markdown của tài liệu văn bản → cây khối (`parseMd`, thuần) → DOM (`renderMd`, chỉ createElement / text node); URL trần trong chữ thường (`linkParts`, thuần, dấu câu cuối ở ngoài); khung Edit: token (`srcTokens`, thuần) → dòng có số (`renderSrc`) |
| `js/design-core.js` | System design, thuần: `normDesign`, `rankOptions`, `applyPath`, `warnings`, `archAdvice`, `flowEdges`, `diagramNodes`, `planTasks`, `planDiff`, `applyPlan`, `designMd`, `designReader` (core.js chỉ gọi hai hàm cuối) |
| `js/design.js` | System design, UI: mục trên trang, sơ đồ SVG, hộp `#dlg-sd`, hộp xem trước Update plan; nhận hàm chung qua `initDesign` |
| `js/hand.js` | bàn giao, UI: chip In / Out của bước, hai chấm đầu vào / đầu ra (`ioDots`), mũi tên trên bước nhận và trước ô nhận, hộp `#dlg-hand`, phần Inputs / Outputs của hộp sửa, hộp `#dlg-pick`; nhận hàm chung qua `initHand` |
| `js/store.js` | `localStorage` (dữ liệu, mẹo `stepPlanner.hintOff`, Compact `stepPlanner.compact`, theme `hub-theme`), `sessionStorage` (dự án của tab); mọi truy cập bọc try/catch |
| `js/dropdown.js` | danh sách chọn tự dựng: `enhanceSelect` (thay giao diện `<select>`, giữ nó làm nguồn value và `change`), `openList` |
| `js/drag.js` | kéo thả bằng pointer events (chuột, chạm, bút): bóng, ô "Drop here", FLIP, tự cuộn, Esc; mỗi khung hình một lượt |
| `js/main.js` | vẽ bảng theo hàng (`renderBoard`: khoá mỗi hàng, chỉ hàng đổi dựng lại), sự kiện, hộp thoại, kéo thả, toast, nhắc sao lưu |

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
- `par: true` = nhập ô của bước con ngay trước; `subs[0].par` luôn false. Ô (slot), chỗ (`Place`), mọi phép dời ở `core.js`.
- `redo: true` = được gửi lại làm trong vòng đang mở; bước không mở lại thì mọi `redo` là false.
- `sd`: `stage:<khâu>@<chữ ký>` hoặc `edge:<a>><b>@<chữ ký>`, chỉ ở bước con System design sinh ra; nhân bản bước con thì bỏ.
- Doc `{id, kind: 'link', title, url, proof}` hoặc `{id, kind: 'md', title, body, proof}`. `url` chỉ http(s) (`safeUrl`); link
  khác bị bỏ (nhập thì cảnh báo). `body` giữ nguyên từng dòng. `proof: true` = bằng chứng cho "Done when".
- Out `{id, name, ref, note}`: `name` bắt buộc (không tên thì bỏ); `ref` đường dẫn file hay link; `note` hợp đồng một dòng.
- `ins`: id đầu ra ở chỗ khác trong dự án; bỏ trùng, bỏ id của chính nó; id không còn đầu ra (mất nguồn) vẫn giữ. `normWorkspace`: id đầu ra duy nhất.
- `design`: null hoặc `{path, profile, stages: {khâu: {pick[], skip, own, note}}, edges: {"a>b": {via, what, where, promise, check}}}`
  (`normDesign`). Khâu `skip` vẫn giữ `pick`, `own` (ẩn, bỏ qua ở mọi chỗ); bỏ `skip` là chúng về lại.
- Mọi dữ liệu đi qua `normSub` / `normStep` / `normWorkspace`: chuỗi một dòng gộp khoảng trắng, phần tử sai kiểu bị bỏ,
  ngày phải có thật (`parseDate`). Trường lạ (kể cả `owner`, `people`, `me` cũ) bị bỏ, không lỗi; `cancelReason` cũ đọc thành `reason`.
- Nhân bản dự án, nhập: id mới cho mọi thứ, đầu vào và quyết định trỏ theo (`freshCopy`). Nhân bản bước con: đầu ra id mới, giữ đầu vào.
- Hai mốc sao lưu chỉ ở máy này, không xuất. Dự án đang mở của tab ở `sessionStorage['stepPlanner.tab']`. Bộ nhớ bị chặn: bộ nhớ tạm + banner.
  Hỏng: chép sang `stepPlanner.v2.corrupt`, bắt đầu trống. Lúc mở gọi `navigator.storage.persist()` (Safari xoá dữ liệu script ghi sau 7 ngày không mở).

## Hành vi

- Bảy trạng thái (PLAN-003), thứ tự này ở mọi chỗ: New (`todo`), In progress, Pending, Blocked, Done, Skipped, Cancelled.
  Nhãn lý do (`REASON_LABEL`): Pending "Waiting on", Blocked "Blocked by", Cancelled "Cancelled because".
- Tiến độ = xong / (tổng − bỏ qua − huỷ). "Next" = thẻ còn mở, trừ thẻ chờ, của ô đầu tiên còn việc trong bước đầu tiên còn việc.
- Ô ấy chỉ còn Pending / Blocked (`nextWaitingOn`): dòng "Next waits on …" nêu thẻ và lý do; nút lọc Actionable. "Next" không vượt chỗ chờ.
- Hạn qua: "(overdue)", trừ thẻ xong, bỏ qua, huỷ. Thẻ xong có `doneAt` hiện ngày xong.
- Lọc trạng thái (`STATUS_GROUPS`): All statuses, Actionable (New, In progress), Waiting (Pending, Blocked), Done, Skipped, cancelled.
  Lọc và tìm là giao; "Clear filters" bỏ cả hai.
  Mỗi tab một bộ lọc, không lưu; đổi / tạo / nhập dự án thì bỏ.
- Tìm bỏ qua dấu và hoa thường, khớp cả lý do, tài liệu, tên và `ref` của đầu ra; bước khớp thì hiện cả hàng.
  Đang tìm hay lọc thì tắt sắp xếp, thêm bước, ẩn vạch bàn giao.
- Song song (PLAN-013): mỗi ô một cột của hàng; ô k thẻ đánh `n.1` … `n.k`. Alt + ← →: đổi ô (thẻ ở ô song song thì tách ra
  ô riêng), Alt + ↑ ↓: đổi thứ tự trong ô. Toast dời tả chỗ mới bằng tên hàng xóm, không bằng số.
- Số đứng yên trong phiên (PLAN-014): chụp số khi dự án hiện lần đầu sau khi mở trang (và sau nhập thay nội dung); dời,
  xoá không đổi số; cái thêm trong phiên hiện chấm thay số. Số lệch thì nút "Renumber" hiện.
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
- Lưu hộp sửa (bước con, bước, quyết định): chỉ ghi trường đã đổi so với lúc mở (`EDIT_FIELDS`, `mergeEdit`) lên bản mới nhất.
  Trường mới của hộp sửa phải thêm vào `EDIT_FIELDS`.
- Cùng trường bị tab khác đổi khác: `#dlg-ask` liệt kê, "Keep mine" / "Keep the other tab's"; Close thì hộp sửa vẫn mở.
  Mục đã bị tab khác xoá: "Re-create" / "Discard my edits". Vị trí chỉ đổi khi người dùng đổi ô Bước / Vị trí.
- Tài liệu (PLAN-011): thêm / sửa / xoá trong hộp sửa, lưu ngay. Link mở tab mới (`noopener noreferrer`); văn bản mở `#dlg-md`.
- Bằng chứng: nút "Evidence" trên mỗi tài liệu của bước, bước con bật `proof`; sửa tài liệu giữ `proof`. Thẻ xong có bằng chứng có dấu riêng.
- Vừa sang Done mà có "Done when" và chưa có bằng chứng (`needsEvidence`): toast gợi ý "Add evidence", không chặn.
- Nhật ký (PLAN-005): mới nhất trước, nhóm theo tháng; bấm mục là sửa; bấm chip bước là tới bước ấy (bỏ lọc nếu cần).
- Ghi bộ nhớ ở lượt việc kế, không chờ khung hình (tab nền bị hãm); rời, ẩn trang: ghi ngay. Tab khác sửa cùng khoá thì đọc lại (`storage`), giữ dự án của tab.
- Thẻ dài thì cắt, "Show more" mở cả thẻ; vẽ lại giữ ghi chú đang mở, thẻ đã mở, chỗ cuộn ngang; hàng không đổi giữ nút DOM.
- Mẹo tắt bằng ×; "Compact" ẩn "Done when", ghi chú, lý do (cả hai nhớ ở máy này). "Log (N)" tới nhật ký.
- Nhắc sao lưu: thay đổi chưa sao lưu ≥ 3 ngày thì nút nhắc hiện cạnh Export, bấm là tải sao lưu mọi dự án.
- Chữ người dùng chỉ vào DOM qua text node; không `innerHTML` ở `js/`. Không `alert` / `confirm` / `prompt` (`#dlg-ask`).

## Bàn giao (outs / ins)

- Đầu ra khai ở bước / bước con tạo ra nó; nơi dùng chọn "Use existing output". Một đầu ra nhiều nơi dùng; liên kết theo id.
- Bước không chọn được đầu ra của chính nó và các bước con của nó. Inputs / Outputs lưu cùng Save của hộp sửa.
- Thẻ bước con không liệt kê đầu vào, đầu ra; xem và sửa trong hộp sửa. Bước có chip "In n" (mọi đầu vào, kể cả treo, mất nguồn), "Out n".
- Thẻ và đầu bước hiện trạng thái đầu vào, đầu ra (`ioStatus`, PLAN-025): ổn, lỗi, không có; không có cả hai thì không hiện.
  Đầu vào lỗi: treo hoặc trỏ tới đầu ra không còn. Bước gộp đầu vào của bước con: có đầu vào khi nó hay một bước con nhận từ
  ngoài bước; lỗi khi một đầu vào nào lỗi, kể cả nhận trong bước. Đầu ra lỗi: không có nơi nhận đang nối
  (chỉ nơi nhận treo cũng tính) hoặc có một nơi nhận treo. Bước con lỗi khi một đầu ra lỗi; bước gộp đầu ra của bước con, lỗi khi
  không đầu ra nào có nơi nhận đang nối hoặc một đầu ra có nơi nhận treo.
- Hàng j nhận từ hàng trước nó (`handoffs().rows`): mũi tên trên hàng j. Ô k + 1 nhận từ ô trước nó cùng hàng (`gaps`): một ô
  mũi tên trước ô k + 1. Nút giữa mũi tên ghi tên đầu ra; bấm thì nêu từng cặp. Chảy ngược hay cùng ô: chỉ trong hộp sửa.
- Danh sách nêu đường dẫn, hợp đồng, bên giao / nơi dùng, mỗi bên nhảy tới được.
- Chọn dòng trong danh sách cặp: tô hai bên, focus bên nhận, không cuộn; bên nào ngoài tầm nhìn (trang, hàng thẻ) thì toast
  nói hướng, nút "Show" mới cuộn tới. Nút một bên vẫn bỏ lọc và cuộn tới.
- Treo (`handoffs().held`): bên nhận đứng trước bên giao sau khi sắp xếp, hay cùng ô song song với nó (`parKeys`; chữ ghi "runs in parallel"). Giữ nguyên `ins`, không mũi tên; danh sách ghi "on hold";
  toast dời, toast Lưu của hộp sửa báo cái vừa treo. Dời về đúng thứ tự là nối lại, không cần làm gì.
- Hộp sửa tính "on hold" theo ô Bước / Vị trí đang chọn, chưa Lưu (`heldInfoAt`, `handoffsAt`); hộp chọn đầu ra ghi đầu ra đứng sau hay cùng ô.
- Xoá bên giao không gỡ đầu vào nơi khác: đầu vào mất nguồn giữ qua lần tải lại, xuất / nhập, chấm đỏ; danh sách, hộp sửa ghi
  "Deleted output", gỡ bằng nút x. Hoàn tác xoá nối lại (`insBackup`).

## Mẫu (`data/templates.json`)

- Khuôn, khoá, chuỗi, ngôn ngữ, `output`, bàn giao: `lint.py` (docstring đầu file); khuôn đầy đủ ở đó, đừng chép lại.
- Đúng một mẫu trống. Mẫu chung không gắn vào một bài toán. Không thẻ HTML, không người làm.
- Mọi chữ của mẫu tiếng Việt (PLAN-028); tên bước, bước con theo chuẩn: tên tiếng Việt, tên gốc trong ngoặc, ví dụ
  "Hiểu dữ liệu (Data Understanding)". Giữ nguyên tên công cụ, thư viện, file, lệnh, URL.
- `output`: loại đầu ra, hiện trên thẻ mẫu. `description` nói khi nào chọn mẫu, phần nào bỏ được khi làm một mình.
- `outs: [{key, name, ref?, note?}]`, `ins: [key]`: `fromTemplate` đổi key thành id mới, key lạ bỏ. Dữ liệu chỉ chảy xuôi (`check_flow`).
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
- `app-feature` không theo chuẩn; việc phát hành theo tài liệu App Store Connect, Google Play, Flutter (link ở ghi chú bước).
- `it5425-sports` sinh từ `masters-degree/data-management-visualization/data/sports-monitoring-build.json` và "Xong khi nào"
  (`#xong`) của trang 2 đồ án: `python3 step-planner/tools/lint.py --write-course`, không sửa tay; cổng đỏ khi nguồn đổi mà chưa sinh lại.
- `it5425-sports`: tên việc giữ chữ nguồn; outs / ins suy từ đường dẫn trong `io_html` từng pha (`course_flow`). Không tên người.

## System design (`data/system-design.json`, PLAN-016)

- Danh mục `{note, paths[], profile[], stages[], checks[], architectures[]}`; khuôn, độ phủ, luật: `lint.py`. Số khâu, phương án, luật đọc từ file.
- `label`, `title`, `kind`, `name`, `flow` của kiến trúc tiếng Anh (giao diện); tên trang ngoài (`links[].title`, `sources[].title`) giữ chữ
  của trang ấy; id, URL, lệnh không xét; mọi chữ khác, cả trường mới, tiếng Việt (lời giải thích). Link chỉ trang chính thức đã mở được; không ghi giá, hạn mức bằng số; lệnh chép từ quickstart.
- Hộp mở ở "What do you deliver?" (lối), rồi hồ sơ, Architecture, từng khâu, Handoffs, Checks. Câu hồ sơ ngoài `ask` của lối gập lại, vẫn trả lời được.
- Gợi ý: câu chưa trả lời lấy theo `implies` của lối; xếp hợp hồ sơ trước, rồi `suggest` của lối theo đúng thứ tự, rồi khớp nhiều câu,
  dễ hơn, thứ tự danh mục. Lựa chọn lưu ngay. `fit` nghĩa là "dùng được", không thêm khoá `fit` chỉ để đẩy hạng.
- Khâu có `when` (câu hồ sơ → câu trả lời cần khâu): trả lời ngoài `when` thì khâu "thường không cần" (`notNeededBy`), "Apply path"
  đánh dấu Not needed; độ phủ của `lint.py` bỏ qua câu trả lời ấy. Câu chưa trả lời: khâu vẫn hiện.
- Công cụ nên tránh khi làm một mình vẫn có trong danh mục nếu người học hay gặp: `avoid` nói vì sao và chọn gì thay, có luật báo,
  không đứng đầu `suggest` của lối nào.
- "Apply path" (`applyPath`): chỉ khâu chưa quyết; `skip` → Not needed; `need` có gợi ý → phương án hợp đầu tiên làm ít luật báo
  nhất; `maybe` để trống. Không tự gây luật báo (trừ `caveat`): bỏ khâu mà làm luật báo thì để khâu ấy trống. `test-core` dò lưới hồ sơ × lối.
- Luật phối hợp (`warnings`): báo khi mọi `if` khớp và mọi khâu trong `unless` đã quyết mà không khớp; khâu chưa quyết thì chưa báo.
  Khoá điều kiện: id khâu (phương án, `skip`, `own`), câu hồ sơ hay `path`. Phương án không được có id `skip`, `own`.
  `caveat: true`: luật chỉ nhắc cách dùng, phương án vẫn đúng (host miễn phí ngủ, đĩa không bền, file DuckDB sau API).
- Kiến trúc (`architectures`): nhóm → kiến trúc (khi dùng, khi tránh, luồng, công cụ theo khâu, nguồn). Không lưu lựa chọn;
  `archAdvice` lấy luật đầu tiên khớp của nhóm (khoá điều kiện như `checks`), `""` = nhóm không cần. Lối là kiến trúc của nhóm app (`path`).
  Kiến trúc được gợi ý phải có ở mỗi khâu một công cụ không làm luật báo với hồ sơ ấy (`test-core`); hồ sơ nói ngược khâu đã quyết thì luật hồ sơ đứng trước.
- Bàn giao (`edges`): đường nối hai khâu liền nhau của luồng, cả hai đã quyết (`flowEdges`). Hợp đồng giữ cả khi đường nối không còn.
- Sơ đồ: đường nối nét liền khi cả hai khâu đã quyết (`bothDecided`, cùng luật với `flowEdges`), còn lại nét đứt.
- "Add tasks to plan" / "Update plan": luôn xem trước New / Changed / No longer in the design, chọn từng mục và bước nhận
  (mặc định "System build", chưa có thì tạo ở vị trí 2). Mỗi khâu đã quyết một việc, mỗi bàn giao đã ghi một việc `Handoff: A → B`.
- Đối chiếu theo `sd`; bước con chưa có `sd` thì theo tên trong bước "System build".
- Update: thay tên, Done when, thêm link và dòng ghi chú mới; giữ ghi chú, tài liệu của người dùng; Done về New.
  "Keep old and add new": cũ thành Cancelled ("Replaced in system design: …"). Cancel: "No longer in system design: …". Một Hoàn tác.

## Giao diện

- Màu, cỡ, khoảng cách chỉ ở token đầu `css/planner.css` (REPO-028, REPO-023); dáng chung chép từ `md-annotate/`.
- Theme theo hệ điều hành tới khi bấm nút (REPO-024), khoá `hub-theme`.
- Biểu tượng: `<symbol id="i-…">` trong `index.html` qua `<use>`, không ký tự unicode; nút chỉ biểu tượng có `aria-label`, `title`.
- Mọi `<select>` chọn thứ có nghĩa dùng danh sách tự dựng (↑ ↓, gõ chữ đầu, Enter, Esc); ô chỉ chọn số giữ `<select>` gốc (`data-native`).
- Nút bàn giao, nút phụ trên thẻ ngoài vòng Tab. Vùng bấm ở cảm ứng và trang không cuộn ngang: smoke đo.

## Cổng: `sh step-planner/tools/check.sh`

- `tools/lint.py`: khuôn mẫu và bàn giao trong mẫu, ngôn ngữ (giao diện, mẫu, System design), danh mục System design, mẫu đồ án khớp nguồn và neo, không `innerHTML`, mã màu chỉ trong khối token.
  `lint.py --self-test`: cài lỗi vào bản sao tạm, mỗi lỗi phải bị bắt.
- `node --input-type=module --check < file` cho `js/*.js` (`node --check file.js` bỏ sót lỗi của module).
- `tools/test-core.mjs`: logic thuần của `core.js`, `md.js`, `design-core.js`; danh sách ở chính file.
  Gợi ý kiến trúc và luật báo so với ảnh chụp `tools/design-snapshot.json`; đổi danh mục có chủ ý thì sinh lại: `node step-planner/tools/test-core.mjs --write-snapshot`.
- `tools/smoke.cjs` (cổng tự dựng máy chủ tạm; thiếu playwright thì bỏ qua, CI chạy ở job smoke): bấm thật các hành vi trên,
  hai tab, 390px, bộ nhớ bị chặn / hỏng / khoá cũ, lỗi console; số mẫu đọc từ `templates.json`. Chạy tay: `node <file> <url>`.
  Mỗi phần `section(tên, …)` chạy riêng: một phần ném lỗi thì báo LỖI, phần sau vẫn chạy. `SMOKE_ONLY=<chữ trong tên>` chạy riêng phần ấy.
  Chờ bằng điều kiện (`waitTo`, `synced` cho hai tab), không ngủ cố định. Font Google tải thật; phần đo lần vẽ chặn font để sự kiện font không sửa hộ.
