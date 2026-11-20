# `md-annotate/` — nhận xét lên văn bản markdown, gom thành prompt

- Một trang, `index.html`: dán văn bản markdown, xem ở *Source* hoặc *Preview* (đủ chỗ thì có *Split*), bôi đen
  một đoạn để ghi nhận xét, mọi nhận xét gom thành một prompt theo thứ tự trong văn bản.
- Không bước build: `index.html` là markup, CSS ở `css/`, JS là module ES ở `js/` (mục *Code*, MDAN-008).
  Chữ lặp ở `data/` (REPO-001): gợi ý mặc định `hints.json`, bảng phím tắt `shortcuts.json`; *Sample text* và câu mẫu lời dẫn ở HTML.

## Code (MDAN-008)

| File | Việc |
|---|---|
| `index.html`, `js/main.js` | markup, script theme (trước lần vẽ đầu), báo `file://`, ba thư viện CDN; gọi `init…` theo thứ tự, khởi động, phím tắt chép, đóng hộp thoại, nút theme |
| `css/*.css` | `tokens` → `base` → `views` → `panel` → `tree` → `popup` → `dialogs` → `focus` → `review` → `reading` → `mobile`; thứ tự link là cascade |
| `js/core/anchor.js`, `js/core/comments.js` | neo đoạn trích (`locate`, `quoteFrom`); thêm / sửa / xoá, neo, xếp, đánh số nhận xét, `partsOf` |
| `js/core/session.js`, `js/core/tree.js`, `js/core/zip.js`, `js/core/prompt.js` | phiên là cây file (thêm, xoá, nạp, mở file từ đĩa, Undo), index, tên tự đặt; cây phẳng (thứ tự, tên, chuyển); ghi `.zip`; prompt một / mọi file, nhãn L12 |
| `js/core/hints.js`, `js/core/place.js`, `js/core/tokens.js`, `js/core/runs.js`, `js/core/color.js` | đếm, xếp hạng gợi ý, chip; chỗ đặt hộp nổi (`popPlace`); token của *Source*; cắt chữ theo token / highlight / dòng, `lineCount`; trộn lớp mờ lên nền (`barColor`) |
| `js/core/blocks.js`, `js/core/sections.js`, `js/core/panes.js`, `js/core/picks.js`, `js/core/sync-math.js`, `js/core/text.js`, `js/core/shortcuts.js` | `lexSpans`, `pairBlocks` (khối nguồn ↔ Preview); đánh số section, dải đọc; `splitFits`, cao hai khung; nhiều dòng (`pickInfo`); cuộn theo nhau; `plural`, `lineOf`, `slug`, `importCheck`; `normShortcuts` |
| `js/{core,ui}/review.js`, `js/ui/review-panel.js`, `js/{core,ui}/minimap.js`, `js/{core,ui}/dwell.js` | đã đọc: đơn vị, neo dấu, tiến độ; làn, phím, nút hộp nhận xét, viên thuốc; tab *Review*; dải tiến độ; gợi ý theo thời gian đọc (MDAN-016) |
| `js/ui/store.js`, `js/ui/dom.js`, `js/ui/state.js`, `js/ui/render.js` | `localStorage`, khoá, `prefs`; `$`, `h()`, `icon()`, `toast()`, `dragBar()`, `saveFile()`, `syncBar()`; phiên `S`, file mở `D`, lưu, chuyển phiên / file; `renderAll()`, kết quả neo `mdText`, `anchors`…, `anchorsOf(doc)` |
| `js/ui/anchor-dom.js`, `js/ui/marks.js`, `js/ui/markdown.js`, `js/ui/source-view.js` | vùng chọn ↔ vị trí chữ; `<mark class="ma-hl">`, tô active / hover; `marked` + DOMPurify, `unlink()`, `ghExtras()`, `mdLex()`; vẽ `#v-src` |
| `js/ui/list.js`, `js/ui/prompt.js`, `js/ui/popup.js`, `js/ui/selection.js`, `js/ui/picks.js` | danh sách nhận xét; panel *Prompt*, chép, tải, *Options*; hộp nhận xét; bôi đen → hộp, nút nổi, `ma-mirror`; chọn nhiều dòng ở lề số, nút kéo hộp |
| `js/ui/views.js`, `js/ui/sync-scroll.js`, `js/ui/focus.js`, `js/ui/layout.js`, `js/ui/help.js` | chế độ xem, `splitOK()`, `sizePanes()`, vách giữa; cuộn theo nhau; *Focus mode*, dải đọc; hộp *Settings* (`#dlg-layout`), `layoutVal()`; hộp *Shortcuts* |
| `js/ui/panel.js`, `js/ui/hints.js`, `js/ui/history.js`, `js/ui/editor.js`, `js/ui/tree.js`, `js/ui/files.js` | panel, mép kéo, thanh dọc, tấm trượt; số đếm gợi ý, hộp *Hints*; hộp *History*; khung *Edit*, dán, mở / thả file, văn bản mẫu, tên phiên; cột cây / tấm trượt trái, chỉ vẽ và nghe (`renderTree(model, actions)`); việc của cây, `setTree()`, nạp folder, tải |

- `js/core/` là logic: nhận và trả dữ liệu thường; không DOM, `window`, `localStorage`, lớp CSS; chỉ import `js/core/`
  (`tools/lint.py` kiểm). Tính năng mới: giao diện và sự kiện vào một module `js/ui/` (đọc DOM, gọi `js/core/`, ghi DOM), sự kiện trong `init…()` của nó, `main.js` gọi.
- Thứ tự gọi `init…()` là thứ tự đăng ký sự kiện: hai module nghe cùng phần tử thì đừng đảo (cặp ghi ở đầu `main.js`).
- Biến dùng chung: `export var` ở module sở hữu; nơi khác chỉ đọc, gán lại qua hàm của chủ (`switchTo()`, `openFileId()`).
- Import vòng được; code cấp cao của module không gọi sang module khác, việc lúc nạp nằm trong `init…()`. Mỗi file mở đầu bằng chú thích: làm gì, xuất gì, dùng module nào.

## Ngôn ngữ (MDAN-007)

- Chữ giao diện bằng tiếng Anh: nút, nhãn, tooltip, placeholder giao diện, `aria-label`, toast, hộp thoại, văn bản mẫu; `<html lang="en">`.
- Prompt bằng tiếng Việt: gợi ý mặc định, câu số dòng, `Văn bản gốc:`, dòng đã đọc, câu mẫu / placeholder lời dẫn. Trích dẫn, nhận xét giữ nguyên.
- Chú thích code, tài liệu `.md`, `desc` trang chủ: tiếng Việt. Số nhiều qua `plural(n, word)`; số theo `en`, ngày theo `en-GB`.

## Giao diện

- Nền, mực, font chép từ `index.html` gốc. Một màu xanh: `--accent` (MDAN-009); nền nhạt, highlight, vạch pha từ nó.
- Xanh không làm chữ trên nền sáng (~2,3:1): chữ là mực, nhấn bằng vạch / nền nhạt / huy hiệu. Chữ trên `--accent`: `--on-accent`.
- Chữ ≥ 4,5:1; chỉ báo trạng thái ≥ 3:1 (focus `--ring`, thẻ / hàng đang chọn `--edge-on`), cả hai theme. Vòng focus chỉ sau phím Tab (MDAN-020).
- Token ở `css/tokens.css` (chữ `--fs-*` + `--lh*`, bo `--r-*`, vật lồng trong bo nhỏ hơn; cao `--h-*`, khoảng `--s*`, `--dur`).
- Họ component chung luật ở `css/base.css` (nút, nhóm tab `.ma-tabs` / `.ma-seg` / `.ma-fmt`, ô nhập, huy hiệu, phím): thêm biến thể vào họ.
- Theme: khoá chung `hub-theme`, đặt trước lần vẽ đầu; chưa chọn thì theo hệ điều hành (REPO-024). `html` và `body` có nền `--bg` đặt rõ.
- Lớp mờ: phần tử fixed trọn khung nhìn, nền `--scrim` / `--scrim-live` (hộp thoại: chính `<dialog>`, thẻ là con; tấm nhận xét: `#pop-scrim`, không có khi chọn dòng,
  MDAN-026), không `::backdrop` / bóng: iOS 26 Safari tô vùng thanh trạng thái theo nền phần tử fixed ở mép. Hiện / ẩn lớp: `syncBar()` (`theme-color` = nền trộn lớp).
- Bề rộng (MDAN-005): `.ma-wrap` rộng `max(70vw, 1280px)`, không quá khung nhìn, căn giữa, lề `--pad`. Panel rộng `--side` (kéo `#panel-grip`,
  320–560, `prefs.side`), thu gọn thành `.ma-rail` 56px (`html.ma-railed`, `prefs.rail`); thanh dọc giữ nút chép.
- *Split* khi `#doc` đủ cho hai khung ≥ 420px (`splitFits()`), không theo media query; chưa đủ thì hiện *Preview*, `prefs.view`
  vẫn nhớ `split`. Hai khung cao `--pane-h` (`paneHeight`), cuộn riêng; trang không cuộn. Vách `#divider` lưu `prefs.split`.
- Split vừa khung nhìn (khung ≥ 320px): `sizePanes()` gắn `html.ma-fit` (khoá cuộn trang), để thanh cuộn chính không
  chập chờn khi trang dư 1px. Rời Split thì bỏ. Đừng thêm `scrollbar-gutter` cho `html`: nó ăn bề rộng, mất Split ở 1280px.
- Hộp *Settings* (`#dlg-layout`): `prefs.wrap` (bề rộng vùng làm việc, `auto` / 50–100%, sàn 720px; điện thoại ẩn), `prefs.measure` (khổ chữ
  *Preview*, 0 / 50–140ch), `prefs.mdfs` (cỡ chữ *Preview*, 13–22px); áp ngay khi kéo. ≤ 420px, nền mờ nhẹ `--scrim-live` (MDAN-015).
- *Settings* và *Shortcuts* (`#dlg-keys`: phím / cú bấm mới, từ `data/shortcuts.json`; nút đầu *Settings* hoặc `?` ngoài ô nhập) giữa màn hình (`.ma-dlg--center`).
- *Focus mode* (hộp *Settings*, `prefs.focus`, `prefs.dim` 10–70%, `html.ma-focus`, `--dim`): mờ ngoài một section. Section mở ở mỗi tiêu đề
  cấp cao: h1–h6 con của `#v-md`; *Source*: token `heading` hay khối HTML `<h1>`…`<h6>` của `marked.lexer` (số khớp). Sáng: `.is-sec`.
- Chọn section (`prefs.focusBy`): `pointer` theo chuột (rời cả hai khung thì hết mờ, trừ khi hộp nhận xét mở); `band` là section
  chạm dải 25–50% vùng nhìn (khung cuộn ở *Split*, cửa sổ ở chế độ khác); trong nửa vùng nhìn sát đầu / cuối, hai mốc trượt về mép
  (`bandBounds`). Vẽ lại thì section đang sáng được đặt lại (`refreshBand()`). *Split*: section cùng số ở khung kia cũng sáng; dải
  chỉ đo trên khung người dùng cuộn gần nhất (`bandFrom`), cuộn do trang đặt (`setByPage`) không đổi nó; chưa cuộn thì đo trên Preview.
- "Chạm dải" (`bandPick`): khối đầu tiên có đáy dưới mốc 25%, đỉnh trên mốc 50%; đuôi khối trước còn trong dải thì nó thắng; không chạm thì khối ngay trên.
- Ở dải đọc, dòng dưới chuột cũng sáng (`.is-line`): một `.ma-ln`, hoặc `li` / `tr` / `dt` / `dd` / khối cấp cao ở *Preview*; phần
  khác của khối chứa nó mờ (`.ma-dimx`). *Split*: khung kia sáng khối ghép (`blockPairs()`: cùng số khối thì i ↔ i, lệch thì
  `pairBlocks` theo dãy con chung dài nhất của thẻ). Cuộn thì tìm lại dòng dưới chuột; rời khung thì hết.
- Khối nguồn (`lexSpans`) neo vào văn bản gốc, không cộng dồn `raw`: marked bỏ khối `[id]: url` và đổi tab đầu dòng.
- Bôi đen ở *Split*: đoạn tương ứng ở khung kia tô bằng Highlight `ma-mirror` (`mirrorSel`, `locate`); hộp nhận xét mở thì `ma-pending` thay.
- *Preview* giống GitHub (MDAN-006): màu `--gh-*`, code tô bằng highlight.js (`--hl-*`) khi khối rào ghi ngôn ngữ hljs biết; `ghExtras()` đổi
  `> [!NOTE|TIP|…]` thành `.ma-alert`. Cỡ chữ trong `.ma-md` bằng `em` theo `--md-fs`. Rộng hết khung; trích khối vạch trái, bảng viền bo góc.
- Cuộn theo nhau ở *Split* (`prefs.sync`, mặc định bật): mốc là đỉnh các cặp khối của `blockPairs()` (thêm đáy làm giật), nội suy Hermite
  đơn điệu; tham chiếu giữa khung, sát mép trượt về mép. Khung theo đặt ngay trong sự kiện cuộn (không rAF); bỏ qua `syncExpect`.
- Chỉ `.ma-dlg__b` của hộp thoại cuộn; *Options* (tab *Prompt*) cuộn riêng ≤ 38vh; không lồng vùng cuộn. Góc bo x: thanh cuộn cách góc ≥ x (MDAN-018).
- Trống văn bản: thẻ `#start`; có chữ thì hiện hàng công cụ. Ctrl/⌘ + V ngoài ô nhập cũng dán khi trống. Một `#file-in` ẩn cho mọi `.js-open`.
- Rê chuột bọc trong `@media (hover: hover)`. `.ma-sr` đặt `top: 0`, không thì trang dài thêm 1px.

## Panel bên phải

- Một panel (`#panel`): đầu có ba tab *Comments · N* / *Prompt* / *Review* và nút biểu tượng *Hints*, thân cuộn, đáy ghim trạng thái,
  *Download .md* và *Copy prompt*. Nút chép luôn trong khung nhìn (smoke đo với 32 nhận xét). Panel hẹp thì bỏ huy hiệu tab (container query).
- Máy rộng (≥ 1081px): panel dính từ đỉnh vùng nội dung tới đáy khung nhìn; `top`, `height` của panel và đệm dọc lưới cùng `--s4`.
- Tuỳ chọn prompt (kiểu, mọi file, số dòng, folder, dòng đã đọc, toàn văn, lời dẫn) gập trong *Options* ở tab Prompt; dòng tóm tắt cho biết đang bật gì.
- ⌘/Ctrl + Shift + C chép ở mọi chỗ; chép xong nút thành *Copied ✓* một lúc, báo qua `#sr-live`, toast chỉ khi hỏng. Chép / tải neo lại lúc bấm (`freshDoc()`).
- ≤ 1080px: panel ra khỏi lưới; thanh đáy: *Comments · N* (panel vào tấm trượt `#dlg-panel`, đóng thì về chỗ), `✓ N%`, nút chép; một cột cả khi `ma-railed`.
- Thẻ nhận xét: không viền; số, L12, nhận xét, trích dẫn mờ vạch trái (không bo, REPO-025). Sửa / xoá hiện khi rê / focus (cảm ứng: luôn); rê thẻ tô đoạn và ngược lại.
- Điện thoại (≤ 720px): một cột, không có *Split*; vùng chạm ≥ `--h-touch` (cả màn cảm ứng). Lưu nhận xét không cuộn trang.
- Toast không nhận chuột (trừ nút *Undo*), để không chặn bôi đen chữ dưới; có hộp thoại mở thì toast nằm trong nó.

## Hộp nhận xét

- Trích dẫn tối đa 2 dòng, dài hơn thì mờ dần (`.is-long`, mask theo `--ink`). Chuyển động mở tắt khi `prefers-reduced-motion`.
- Chuột thì mở ngay khi thả, kể cả khi kéo bắt đầu ở vùng nền (lề trái / phải, nền trang quanh khung; trừ nút, ô nhập,
  panel, hộp thoại, vách kéo, thanh cuộn); cảm ứng và bàn phím thì hiện nút nổi *Comment on selection*. Máy hẹp hoặc màn cảm
  ứng: hộp là tấm trượt đáy. Hộp dưới đoạn chọn (Split: ở khung đã bôi đen), thiếu chỗ thì lên trên, trọn khung nhìn (`popPlace`).
- Đoạn đang chọn tô bằng `::highlight(ma-pending)`, không sửa DOM: sửa DOM giữa lúc kéo chuột làm mất vùng chọn. Mọi Highlight tô qua `paintHL()`.
- Highlight của nhận xét là `<mark class="ma-hl" data-ids>`; số thứ tự hiện bằng `::after`, không lọt vào chữ của khung.

## Tô màu và lề số dòng ở *Source* (MDAN-001)

- `tokens()` tách token theo dòng (khối rào, đầu mục, kẻ ngang, phân cách bảng, trích khối, dấu danh sách), rồi
  `inlineToks()` trong dòng (mã, link, thẻ HTML, URL, đậm, nghiêng, gạch, chuỗi, `|` của bảng).
- Token không chồng nhau, theo thứ tự. `paintSrc()` cắt nguồn theo mép token, mép highlight và đầu dòng; `<mark>` bọc ngoài `<span class="sx-*">`.
- Text của `#v-src` phải đúng bằng nguồn: vùng chọn, neo, số dòng đều đếm trên nó (smoke kiểm). `#doc-meta` đếm dòng
  bằng `lineCount()` như lề. Tìm token không quét lại cả dòng sau mỗi token (dòng dài vẫn tuyến tính).
- Màu chỉ ở token `--sx-*`; mỗi màu ≥ 4,5:1 trên nền thẻ và trên `--hl` / `--hl-2`, cả hai theme. *Syntax colors* (`prefs.syntax`) tắt: chữ trơn.
- Lề số dòng: mỗi dòng một `<span class="ma-ln">` (block, giữ cả ký tự xuống dòng), số là `::before` + counter,
  `user-select: none`. Không chèn số dòng thành chữ. Dòng có nhận xét: `.has-c` + `data-c` (id), vạch `--accent`;
  bấm vào lề mở nhận xét đầu của dòng, bấm đúp thì chọn nhiều dòng. Sau vạch là làn đã đọc (`--lane-w`), rồi chữ.

## Nhận xét nhiều dòng (MDAN-012)

- Chỉ bằng lề số dòng (*Source*, khung Source của *Split*; `ui/picks.js`). Bấm đúp hoặc Shift + bấm lề: vào chế độ chọn dòng với
  dòng ấy, mở hộp; không bôi đen chữ. Ngoài chế độ, bấm một lần giữ như cũ. Dòng chọn `.is-pick`; *Split* tô Preview (`ma-mirror`).
- Trong chế độ, bấm lề thêm / bỏ một dòng (không cần liền; dòng trống không chọn được); hộp đang mở cập nhật tại chỗ. Shift + bấm thêm cả
  dải từ dòng bấm gần nhất; kéo trên lề (chuột) thêm cả dải nếu bắt đầu ở dòng chưa chọn, bỏ nếu đã chọn, lùi thì co (MDAN-019).
- Thoát: Esc, Save, bỏ dòng cuối, sang Edit / Preview, mở phiên khác, văn bản đổi (`repaintPicks()`). Hộp của chế độ không đóng
  khi bấm ra ngoài (MDAN-014); Cancel chỉ ẩn hộp, giữ các dòng, bấm lề thì hộp hiện lại. Bôi đen chữ trong chế độ: không hộp, không nút nổi.
- Hộp: `3 lines · L12, L15-16` và nút kéo `#pop-grip` (con trỏ, phím mũi tên; trọn khung nhìn; không nhớ chỗ). Mặc định
  dưới dòng vừa bấm, lùi qua lề số để không che lề. Tấm trượt đáy và hộp bôi đen không có nút kéo.
- `parts`: mỗi dải dòng liền một đoạn trích (`origin: 'src'`, quote là trọn các dòng); chỉ lưu khi ≥ 2 phần; `quote`…
  ở ngoài bằng `parts[0]`. Đọc đoạn trích qua `partsOf(c)`, đừng đọc thẳng `c.quote`.
- Mỗi phần neo riêng; phần mất neo bỏ khỏi highlight và prompt; mất hết mới mất neo. Xếp theo phần đầu tìm thấy; số ở phần đầu.
- Thẻ: `L12, L15-16`, mỗi phần một trích dẫn (mất neo thì gạch). `overlapWarning`: trùng khi mọi trích dẫn giống nhau.

## Đánh dấu đã đọc (MDAN-013)

- Đơn vị: khối của `lexSpans`; danh sách ≥ 2 mục thì mỗi mục cấp cao một đơn vị (mục con thuộc mục cha); bảng, khối code là
  một đơn vị; khối không chữ / số / emoji (kẻ ngang), khối chỉ có chú thích HTML không tính. Tiến độ theo số dòng, làm tròn xuống.
- Dấu ở `D.reviews` (`{ h, p, n, q, r }`, không số dòng): băm chữ chuẩn hoá (bỏ dấu mục), băm hai hàng xóm (mép văn bản: rỗng), 80 ký tự
  đầu. Chuyển chỗ, chữ giữ nguyên: ✓. Chữ đổi: ○, tính là chưa đọc. Không tìm lại được: mất, báo toast lúc mất và ở tab *Review*.
- Một chỗ hỏi: `rvState()`; một chỗ ghi: `setReviews()` (lưu, vẽ, Undo, cả khi đã đổi file / phiên). Luật ở `core/review.js` (`resolveMarks`,
  `allDone`, `markWord`, `withSug`…); `ui/*` không tự quyết đơn vị nào đã đọc. Lớp và tooltip nút làn, kể cả `.is-sug`, chỉ dựng ở `ui/review.js`.
- Nhận xét không đánh dấu đã đọc. *Dim reviewed* (`prefs.rvDim`, cùng công tắc ở *Settings*; độ sáng `prefs.rvDimV` 10–80%, `--rv-dim`) chỉ làm mờ, không gập: gập làm lệch cuộn theo nhau và dải đọc.
- Làn: lớp phủ `.ma-lane` trong `#wrap-*`, ngoài `#v-src` / `#v-md`. *Source*: giữa vạch nhận xét và chữ, không phải lề số;
  *Preview*: lề trái. Bấm: bật / tắt; Shift + bấm: cả dải (mốc mất khi văn bản đổi); làn của tiêu đề (hình vuông) bật cả section.
- Phím X / Shift+X / J / K: bỏ qua khi đang gõ chữ, khi hộp thoại hay hộp nhận xét mở, khi có phím bổ trợ khác Shift. Đơn vị hiện tại: chạm
  dải đọc (dưới con trỏ khi Focus theo chuột; khung không cuộn được: đơn vị đầu), làn `.is-cur`; vừa nhảy tới thì là nó (`pin`).
- Nút ✓ Reviewed của hộp nhận xét (nới ra trọn khối, cả dòng chọn ở lề số): `ui/review.js` theo dõi hộp (MutationObserver). Prompt: *Say which lines I reviewed* (`rvPrompt`, mặc định tắt, ẩn khi tắt số dòng) thêm `Đã đọc kỹ: … Chưa đọc: …`; tắt thì y hệt từng byte.
- Bộ dấu (MDAN-017): tròn là khối, vuông là section, ✓ là ảnh `--ic-check`, cỡ `--ic-box`; khai báo một lần ở `css/review.css` (cả gợi ý), ô đánh dấu
  của form dùng cùng ảnh, cùng cỡ; dấu căn giữa dòng đầu khối (`--c`). Máy hẹp / cảm ứng: `#rv-pill` chỉ đánh dấu, không bỏ dấu; chưa có dấu thì tắt làn.
- Dải tiến độ (MDAN-016): `.ma-mm` fixed, mép phải khung; mỗi đơn vị một đoạn (đặc ✓, rỗng ○, nhạt, viền đứt gợi ý) trên rãnh `--line-2` cao hết dải. Trái dải,
  cách `--mm-gap`, là thanh cuộn tự vẽ (con trượt `--sb-thumb`, chấm nhận xét), ở *Split* thay thanh của khung; hai đầu tránh góc bo (`cornerLimits`). ≤ 720px ẩn; cảm ứng chỉ xem.
- Gợi ý (`prefs.rvSuggest`, mặc định bật): đơn vị chạm dải đọc (luật của Focus band, cả khi Focus tắt) cộng thời gian; rời dải đi lên sau
  `dwellNeed` (40% số từ ÷ 230 wpm, 4–60 s) thì có ✓ viền đứt `.is-sug` và nút *Accept N suggested* ở tab *Review*. Tiêu đề không được gợi ý. Không tự đánh dấu.
- Chỉ đếm khi tab hiện, cửa sổ có focus, có thao tác trong 60 s; rời dải chỉ tính lúc người dùng tự cuộn; J / K / X, dải tiến độ gọi `noteJump()`.
  Gợi ý chỉ ở bộ nhớ, theo file đang mở; khoá là băm chữ, chữ đổi thì rơi. Chấp nhận: X, bấm làn, nút (Undo trả cả gợi ý).

## Neo đoạn trích

- Mỗi nhận xét lưu `quote`, `prefix`, `suffix` (48 ký tự), `origin` (`src` | `md`), `rel` (vị trí tương đối), kiểu W3C TextQuoteSelector; không lưu offset.
- Mỗi lần vẽ, tìm lại đoạn trích ở nguồn lẫn bản dựng: tầng 1 nguyên văn sau khi gộp khoảng trắng; tầng 2 chỉ chữ và số, chữ thường, bỏ cú pháp (`SYNTAX`).
- Nhiều chỗ khớp: `prefix` / `suffix` khớp dài nhất, rồi gần `rel` nhất (so mọi chỗ; trích ở khung kia thì so ở tầng 2).
- Không tìm thấy ở cả hai chế độ: nhận xét mất neo, hiện `!` trong danh sách, không vào prompt. Prompt xếp theo vị trí trích trong nguồn.
- Chọn ở *Source* thì trích đúng nguồn, ở *Preview* thì chữ đã dựng; vùng chọn giữa từ thì nới ra mép từ (chữ, số, dấu Unicode).

## Prompt

- Hai kiểu: gọn `1. L12 "quote" — comment` (mặc định) và khối `### 1 · L12-14` + `> quote` + comment.
- Nhiều phần: `3. L12 "q1"; L15-16 "q2" — comment`; khối `### 3 · L12, L15-16` + mỗi phần một khối `>`. Một đoạn: y như cũ.
- *Line numbers* (mặc định bật, lưu theo phiên): dòng đầu và cuối của neo trong nguồn; chọn ở bản dựng cũng tính
  qua neo nguồn. Nhãn `tệp:12-14` (`fileLabel`: ô *Folder* `S.path` là tiền tố trên đĩa + đường dẫn trong cây) khi phiên ≥ 2 file, file có tên thật hay có *Folder*.
- Bật số dòng thì lời dẫn thêm câu: số dòng chỉ là gợi ý, lệch thì tìm theo trích dẫn (luôn giữ). Lời dẫn đầu, cuối, tuỳ chọn kèm toàn văn (khối rào dài hơn mọi dãy backtick).

## Gợi ý nhận xét

- Đếm theo khoá chuẩn hoá (`normKey`); xếp theo số lần, lần dùng gần nhất, thứ tự gốc. Tỉ lệ (số lần + 1) / (tổng + số gợi ý), hiện từ 5 lần (`MIN_PCT`).
- Hộp nhận xét hiện 5 gợi ý đầu (`POP_CHIPS`), còn lại sau chip `+N`. Nhận xét gõ tay ≤ 80 ký tự được đếm; từ hai lần thì thành gợi ý.
- Bỏ gợi ý là ẩn, không xoá số đếm (gợi ý mặc định không quay lại). Đổi chữ gợi ý mặc định: cặp cũ → mới vào `renamed` của `data/hints.json`;
  `migrateHints()` dồn số đếm, giữ trạng thái ẩn, chỉ cho khoá từng là gợi ý mặc định (`seed`).

## Cây file (MDAN-022…025)

- Phiên là cây (`core/session.js`, `core/tree.js`): `nodes` phẳng trỏ cha, `docs[fileId]` (`text`, `comments`, `reviews`, `rvPct`, `real`), `open`, `collapsed`.
  Bất biến (≥ 1 file, `open` là một file, mỗi file đúng một doc) và mọi luật tên, trùng, file kế bên ở core; hàm đổi cây trả phiên mới.
- `S` là phiên, `D` là doc của file mở: chữ, nhận xét, dấu đọc qua `D`, tuỳ chọn prompt ở `S`. Gắn với một văn bản (Undo, gợi ý, chọn dòng): `docKey()`.
- Một chỗ ghi cây: `setTree()` ở `ui/files.js` (lưu, vẽ prompt và cây, Undo bằng `restoreTree`). Actions của `renderTree` chỉ gọi core rồi `setTree`.
- Cây hiện mặc định khi phiên ≥ 2 mục; Ctrl/⌘ + B, `prefs.tree` (MDAN-023). Đổi file giữ chế độ xem; chỗ cuộn mỗi file nhớ trong bộ nhớ.
- Mở file từ đĩa: file mở trống thì điền, không thì thêm cạnh nó (MDAN-024). Nạp folder (nút đầu cây, thả lên cây hay thẻ văn bản) là bản sao:
  bỏ mục ẩn, `node_modules`, file không phải chữ hay > 1 MB (`importCheck`); phiên trống thì folder là cả phiên; bộ nhớ đầy thì hoàn lại.
- Xoá không hỏi, toast có Undo (cả chuyển). Tải: file `.md`, folder và cả phiên `.zip` (`zipOf`). Không ghi ngược ra đĩa (MDAN-022).
- *All files* (`S.promptAll`, ẩn khi một file, MDAN-025): `buildPromptAll`; file không mở neo qua `anchorsOf()`. Tab *Comments* chỉ có file mở.

## Lưu trữ

- Mọi lần đọc ghi `localStorage` bọc try/catch; hỏng thì trang vẫn chạy, chỉ báo một lần. Phiên trống không vào lịch sử.
- Khoá `md-annotate:`: `index:v1` (danh sách phiên), `s:<id>` (một phiên, cả cây), `current`, `stats:v1` (số đếm gợi ý), `prefs:v1` (tuỳ chọn người dùng, cả `tree`, `treeW`).
- Đổi cấu trúc phiên thì tăng hậu tố `v1` và chuyển dữ liệu cũ, trừ khi `normSession` nâng tại chỗ (phiên một văn bản → cây một file, prompt y hệt từng byte).
- Lớp lưu tách riêng (`ui/state.js`, `ui/store.js`): chế độ folder thật sau này chỉ thay lớp ấy. *Sample text* khi phiên có nội dung thì mở phiên mới.

## An toàn

- Markdown dựng bằng `marked` rồi làm sạch bằng `DOMPurify`, cả hai ghim phiên bản và có `integrity`. DOMPurify bỏ
  `<style>`, `style=`, `<form>`, `<dialog>`; id / name thêm tiền tố `user-content-`: markdown không chạm CSS, id của trang.
- Link ở bản dựng thành `<span class="ma-a">` (`unlink()`, URL ở `title`), không dựng lại `<a>`: kéo trên link vẫn là bôi đen.
- Chỉ một chỗ gán `innerHTML` (`mdInto()` ở `js/ui/render.js`, cho `#v-md` và bản dựng tách rời): HTML đã qua DOMPurify. Mọi chỗ khác dựng DOM bằng `h()` và `textContent`.
- Thiếu mạng thì *Preview* báo lỗi, *Source* vẫn dùng được (không có đơn vị đã đọc; dấu giữ, không báo mất, không ghi `rvPct`). `file://`: chỉ hiện `#file-notice`.

## Cổng: `sh md-annotate/tools/check.sh`

- `tools/lint.py`: luật nó kiểm ghi ở đầu file (dữ liệu gợi ý và phím tắt, một chỗ `innerHTML`, file mồ côi, `js/core/` thuần, token).
- `tools/test-core.mjs`: bài thử của `js/core/`, logic thuần mới thêm bài ở đây. Sửa sự kiện, neo, giao diện: chạy `tools/smoke.cjs` (cách chạy ở đầu file).
