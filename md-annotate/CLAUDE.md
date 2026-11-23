# `md-annotate/` — nhận xét lên văn bản markdown, gom thành prompt

- Một trang, `index.html`: dán văn bản markdown, xem ở *Source* hoặc *Preview* (đủ chỗ thì có *Split*), bôi đen
  một đoạn để ghi nhận xét, mọi nhận xét gom thành một prompt theo thứ tự trong văn bản.
- Không bước build: `index.html` là markup, CSS ở `css/`, JS là module ES ở `js/` (mục *Code*, MDAN-008).
  Chữ lặp ở `data/` (REPO-001): gợi ý mặc định `hints.json`, bảng phím tắt `shortcuts.json`; *Sample text* và câu mẫu lời dẫn ở HTML.

## Code (MDAN-008)

| File | Việc |
|---|---|
| `index.html`, `js/main.js` | markup, script theme (trước lần vẽ đầu), báo `file://`, hai thư viện CDN (marked, DOMPurify); gọi `init…` theo thứ tự, khởi động, phím tắt chép, đóng hộp thoại, nút theme, bàn phím ảo |
| `css/*.css` | `tokens` → `base` → `views` → `panel` → `tree` → `popup` → `dialogs` → `focus` → `review` → `reading`; thứ tự link là cascade |
| `js/core/anchor.js`, `js/core/comments.js` | neo đoạn trích (`locate`, `quoteFrom`); thêm / sửa / xoá, neo, xếp, đánh số nhận xét, `partsOf` |
| `js/core/session.js`, `js/core/tree.js`, `js/core/tree-find.js`, `js/core/zip.js`, `js/core/prompt.js` | phiên là cây file (thêm, xoá, nạp, mở file từ đĩa, Undo), index, tên tự đặt; cây phẳng (thứ tự, tên, chuyển); lọc file theo mẫu (`findFiles`); ghi `.zip`; prompt một / mọi file, nhãn L12 |
| `js/core/hints.js`, `js/core/hint-keys.js`, `js/core/place.js`, `js/core/tokens.js`, `js/core/runs.js`, `js/core/color.js` | đếm, xếp hạng gợi ý, chip; phím chọn gợi ý (MDAN-084); chỗ đặt hộp nổi (`popPlace`), tấm đáy cuộn bao nhiêu (`sheetReveal`), nút nổi (`fabSide`), cây cuộn ngang tới tên (`nameReveal`); token của *Source*; cắt chữ theo token / highlight / dòng, `lineCount`; trộn lớp mờ lên nền (`barColor`) |
| `js/core/langs.js`, `js/core/file-type.js`, `js/core/code-tokens.js`, `js/ui/highlight.js` | sổ loại file và ngôn ngữ highlight.js (chỉ dữ liệu); tên file → loại (`fileType`), chế độ xem, tab panel có được (`viewFor`, `paneFor`), tên khối rào → ngôn ngữ (`langOf`); HTML của highlight.js → token; nạp highlight.js khi cần, tô khối code ở *Preview* (`paintFences`), token *Source* của file code (`codeTokens`) |
| `js/core/blocks.js`, `js/core/sections.js`, `js/core/panes.js`, `js/core/picks.js`, `js/core/sync-math.js`, `js/core/text.js`, `js/core/help.js` | `lexSpans`, `pairBlocks` (khối nguồn ↔ Preview); đánh số section, dải đọc; `splitFits`, cao hai khung; nhiều dòng (`pickInfo`); cuộn theo nhau; `plural`, `lineOf`, `slug`, `importCheck`; `normHelp` |
| `js/{core,ui}/review.js`, `js/ui/review-panel.js`, `js/{core,ui}/minimap.js`, `js/{core,ui}/dwell.js` | đã đọc: đơn vị, neo dấu, tiến độ; làn, phím, nút hộp nhận xét, viên thuốc; tab *Review*; dải tiến độ; gợi ý theo thời gian đọc (MDAN-016) |
| `js/ui/store.js`, `js/ui/dom.js`, `js/ui/state.js`, `js/ui/render.js` | `localStorage`, khoá, `prefs`; `$`, `getJSON()`, `h()`, `icon()`, `toast()` / `placeToast()`, `dragBar()`, `saveFile()`, `syncBar()` (cả khoá cuộn), `trackKeyboard()`, `barBottom()` / `dockTop()`; phiên `S`, file mở `D`, lưu, chuyển phiên / file; `renderAll()`, kết quả neo `mdText`, `anchors`…, `anchorsOf(doc)` |
| `js/ui/anchor-dom.js`, `js/ui/marks.js`, `js/ui/markdown.js`, `js/ui/source-view.js` | vùng chọn ↔ vị trí chữ; `<mark class="ma-hl">`, tô active / hover; `marked` + DOMPurify, `unlink()`, `ghExtras()`, `mdLex()`; vẽ `#v-src` |
| `js/ui/list.js`, `js/ui/prompt.js`, `js/ui/popup.js`, `js/ui/selection.js`, `js/ui/picks.js` | danh sách nhận xét; panel *Prompt*, chép, tải, *Options*; hộp nhận xét; bôi đen → hộp, kéo từ vùng nền, nút nổi, `ma-mirror`; chọn nhiều dòng ở lề số, nút kéo hộp |
| `js/ui/views.js`, `js/ui/sync-scroll.js`, `js/ui/focus.js`, `js/ui/layout.js`, `js/ui/help.js`, `js/ui/bar.js` | chế độ xem, `splitOK()`, `sizePanes()`, vách giữa, `paneWrap` / `paneRoot` (khung theo 'src' / 'md'); cuộn theo nhau; *Focus mode*, dải đọc; hộp *Settings* (`#dlg-layout`), `layoutVal()`; hộp *Help*; menu *More*, thanh trên tự ẩn |
| `js/ui/panel.js`, `js/ui/hints.js`, `js/ui/history.js`, `js/ui/editor.js`, `js/ui/tree.js`, `js/ui/tree-find.js`, `js/ui/files.js` | panel, mép kéo, thanh dọc, tấm trượt; số đếm gợi ý, hộp *Hints*; hộp *History*; khung *Edit*, dán, mở / thả file, văn bản mẫu, tên phiên; cây (cột ở mép trái màn hình hay tấm trượt trái, `layoutTree()`), chỉ vẽ và nghe (`renderTree(model, actions)`); ô lọc file; việc của cây, `setTree()`, nạp folder, tải |

- Code đơn giản nhất mà dễ đọc (MDAN-070): giao diện (`js/ui/`, `css/`), logic (`js/core/`: dữ liệu vào, dữ liệu ra; không DOM, `window`, `localStorage`, lớp CSS; chỉ import `js/core/`, `tools/lint.py` kiểm), luật / cấu hình (`data/*.json`, `css/tokens.css`, hằng đầu module) tách nhau; tính năng riêng thì module riêng trong lớp của nó.
  Hàm và module thường, không framework. Thứ dùng ≥ 2 chỗ nằm một chỗ chung (`ui/dom.js`, `css/base.css`, `css/tokens.css`) và mọi nơi gọi nó; dùng một chỗ thì không tách, không lớp trừu tượng "để sau". Tính năng mới: sự kiện trong `init…()` của module `js/ui/`, `main.js` gọi.
- Thứ tự gọi `init…()` là thứ tự đăng ký sự kiện: hai module nghe cùng phần tử thì đừng đảo (cặp ghi ở đầu `main.js`).
- Biến dùng chung: `export var` ở module sở hữu; nơi khác chỉ đọc, gán lại qua hàm của chủ (`switchTo()`, `openFileId()`).
- Import vòng được; code cấp cao của module không gọi sang module khác, việc lúc nạp nằm trong `init…()`. Mỗi file mở đầu bằng chú thích: làm gì, xuất gì, dùng module nào.

## Ngôn ngữ (MDAN-007)

- Chữ giao diện bằng tiếng Anh: nút, nhãn, tooltip, placeholder giao diện, `aria-label`, toast, hộp thoại, văn bản mẫu; `<html lang="en">`.
- Prompt bằng tiếng Việt: gợi ý mặc định, câu số dòng, `Văn bản gốc:`, dòng đã đọc, câu mẫu / placeholder lời dẫn. Trích dẫn, nhận xét giữ nguyên.
- Chú thích code, tài liệu `.md`, `desc` trang chủ: tiếng Việt. Số nhiều qua `plural(n, word)`; số theo `en`, ngày theo `en-GB`.

## Giao diện

- Giao diện không ghi thành văn (REPO-028): màu, cỡ, bo, khoảng cách là token ở `css/tokens.css`, dáng là CSS. Đang đẹp thì đừng đổi.
- Chữ ≥ 4,5:1, chỉ báo trạng thái ≥ 3:1, cả hai theme; `--accent` không làm chữ trên nền sáng (chữ trên nó: `--on-accent`). Vòng focus chỉ sau Tab, hay mũi tên / Home / End trong cây, menu của nó và menu *More* (MDAN-020).
- Token ở `css/tokens.css` (chữ `--fs-*` + `--lh*`, bo `--r-*`, vật lồng trong bo nhỏ hơn; cao `--h-*`, khoảng `--s*`, `--dur`). Mỗi file CSS gom luật theo component, mỗi component một đoạn liền có chú thích đầu, kể cả luật cảm ứng / điện thoại của nó; component dùng token, không số thô. Dời luật giữa file: giữ kết quả cascade, so ảnh trước / sau (skill `agent-practices`). Biến đổi lúc chạy mà văn bản không dùng (cây, vách): `@property … inherits: false`, đặt lên phần tử dùng nó; lớp ở `html` không kết bộ chọn bằng `:not()` / `*`. Không thì mỗi lần đổi tính lại kiểu mọi nút của văn bản (10.000 dòng: ~0,6 s).
- Họ component chung luật ở `css/base.css` (nút, menu, nhóm tab `.ma-tabs` / `.ma-seg` / `.ma-fmt`, ô nhập, huy hiệu, phím): thêm biến thể vào họ.
- Theme: khoá chung `hub-theme`, đặt trước lần vẽ đầu; chưa chọn thì theo hệ điều hành (REPO-024). `html` và `body` có nền `--bg` đặt rõ. Thanh trên, cây, panel, thanh đáy không bôi đen được trừ ô gõ chữ và hộp prompt `.ma-out` (MDAN-072): một luật ở `css/base.css` (MDAN-064), đừng đặt `user-select` từng phần tử.
- Lớp mờ: phần tử fixed trọn khung nhìn, không `::backdrop` / bóng (iOS 26 Safari tô vùng thanh trạng thái theo nền phần tử fixed ở mép). Hộp thoại: chính `<dialog>`, nền `--scrim`, thẻ là con; tấm nhận xét: `#pop-scrim`, `--scrim-live` (nhẹ hơn: không chặn chạm), không có khi chọn dòng (MDAN-026).
  Hiện / ẩn lớp: `syncBar()`: `theme-color` = nền trộn lớp, và `html.ma-lock` (trang sau lớp không cuộn, đóng không nhảy); thẻ, tấm `overscroll-behavior: contain`.
- Bề rộng (MDAN-005): `.ma-wrap` theo `--wrap-f`, `--wrap-min` của khung nhìn trừ cây docked, không quá chỗ ấy, căn giữa trong nó, lề `--pad`. Panel rộng `--side` (kéo `#panel-grip`,
  `prefs.side`), thu gọn thành `.ma-rail` (`html.ma-railed`, `prefs.rail`); thanh dọc giữ nút chép.
- *Split* khi `#doc` đủ cho hai khung ≥ 420px (`splitFits()`), không theo media query; chưa đủ thì hiện *Preview*, `prefs.view` vẫn nhớ `split`. Hai khung cao `--pane-h` (`paneHeight`), cuộn riêng; trang không cuộn. Vách `#divider` lưu `prefs.split`. Văn bản > 1.500 dòng (`longText()`): kéo vách, mép cây, mép panel chỉ dời vạch `.ma-ghost` (dừng ở giới hạn, cùng hàm chặn khi thả), thả ra mới dàn lại (`dragBar`); kéo kết thúc thế nào (thả, mất pointer capture, cửa sổ mất focus, chuột về không giữ nút) cũng áp chỗ cuối, dọn vạch.
  Phần của markdown (*Preview*, *Split*, *Focus mode*, đã đọc) chỉ ở file markdown: một cờ `fileType(tên).md` (MDAN-067, MDAN-073); file khác không chạy `marked` (`renderAll`, `blockPairs`, `anchorsOf` / `reviewDocOf` nhận cờ). File khác chỉ có tab *Source*, *Edit* là nút bật / tắt trong nó (`#btn-edit`, mũi tên ở tab cũng bật / tắt; MDAN-074); ở đó không ghi chế độ đọc đã nhớ (`lastRead`, lưu riêng `prefs.read`).
- Split vừa khung nhìn (khung ≥ 320px): `sizePanes()` gắn `html.ma-fit` (khoá cuộn trang), để thanh cuộn chính không
  chập chờn khi trang dư 1px. Rời Split thì bỏ. Đừng thêm `scrollbar-gutter` cho `html`: nó ăn bề rộng, mất Split ở 1280px.
- Hộp *Settings* (`#dlg-layout`): `prefs.wrap` (bề rộng vùng làm việc, `auto` / 50–100%, sàn 720px; điện thoại ẩn), `prefs.measure` (khổ chữ
  *Preview*, 0 / 50–140ch), `prefs.mdfs` (cỡ chữ *Preview*, 13–22px); áp ngay khi kéo. ≤ 420px, nền mờ nhẹ `--scrim-live` (MDAN-015). *Settings* và *Help* (`#dlg-keys`, MDAN-069: phím / cú bấm mới `data/shortcuts.json`, tìm file `data/search-help.json`, cùng một dạng, một vòng lặp vẽ; nút đầu *Settings* hoặc `?` ngoài ô nhập) giữa màn hình (`.ma-dlg--center`).
- *Focus mode* (hộp *Settings*, `prefs.focus`, `prefs.dim` 10–70%, `html.ma-focus`, `--dim`): mờ ngoài một section. Section mở ở mỗi tiêu đề
  cấp cao: h1–h6 con của `#v-md`; *Source*: token `heading` hay khối HTML `<h1>`…`<h6>` của `marked.lexer` (số khớp). Sáng: `.is-sec`.
- Chọn section (`prefs.focusBy`; màn cảm ứng luôn `band`, `layoutVal`): `pointer` theo chuột (rời cả hai khung thì hết mờ, trừ khi hộp nhận xét mở); `band` là section
  chạm dải 25–50% vùng nhìn (khung cuộn ở *Split*, cửa sổ ở chế độ khác); trong nửa vùng nhìn sát đầu / cuối, hai mốc trượt về mép
  (`bandBounds`). Vẽ lại thì section đang sáng được đặt lại (`refreshBand()`). *Split*: section cùng số ở khung kia cũng sáng; dải
  chỉ đo trên khung người dùng cuộn gần nhất (`bandFrom`), cuộn do trang đặt (`setByPage`) không đổi nó; chưa cuộn thì đo trên Preview.
- "Chạm dải" (`bandPick`): khối đầu tiên có đáy dưới mốc 25%, đỉnh trên mốc 50%; đuôi khối trước còn trong dải thì nó thắng; không chạm thì khối ngay trên.
- Dòng dưới chuột luôn sáng (`.is-line`, cả hai cách chọn): một `.ma-ln`, hoặc `li` / `tr` / `dt` / `dd` / khối cấp cao ở *Preview*; phần khác của khối chứa nó mờ (`.ma-dimx`).
  *Split*: hai khung sáng cùng phần sâu nhất ghép được (khối của `blockPairs()`, mục / hàng `partAt`, mục con `subItems`); Source sáng mọi dòng của phần ấy. Cuộn thì tìm lại dòng (theo chuột: cả section) dưới chuột; rời khung thì hết.
- Hai lớp mờ (Focus, *Dim reviewed*) gộp bằng min, không nhân; dòng dưới chuột = 1 (MDAN-045). Lớp chỉ đặt biến `--o-f` / `--o-r`; `opacity` chỉ ở phần tử mang, không ở tổ tiên của phần tử mang khác (`css/focus.css`).
- Khối nguồn (`lexSpans`) neo vào văn bản gốc, không cộng dồn `raw`: marked bỏ khối `[id]: url` và đổi tab đầu dòng. Bôi đen ở *Split*: đoạn tương ứng ở khung kia tô bằng Highlight `ma-mirror` (`mirrorSel`, `locate`); hộp nhận xét mở thì `ma-pending` thay.
- *Preview* giống GitHub (MDAN-006): màu `--gh-*`, code tô bằng highlight.js (`--hl-*`) khi khối rào ghi ngôn ngữ có trong sổ (`langOf`); `ghExtras()` đổi
  `> [!NOTE|TIP|…]` thành `.ma-alert`. Cỡ chữ trong `.ma-md` bằng `em` theo `--md-fs`.
- Cuộn theo nhau ở *Split* (`prefs.sync`, mặc định bật, điện thoại ẩn ở *Settings*): mốc là đỉnh các cặp khối của `blockPairs()` (thêm đáy làm giật), nội suy Hermite
  đơn điệu; tham chiếu giữa khung, sát mép trượt về mép. Khung theo đặt ngay trong sự kiện cuộn (không rAF); bỏ qua `syncExpect`.
- Trống văn bản: thẻ `#start`; có chữ thì hiện hàng công cụ. Ctrl/⌘ + V ngoài ô nhập cũng dán khi trống. Một `#file-in` ẩn cho mọi `.js-open`. Rê chuột bọc trong `@media (hover: hover)`. `.ma-sr` đặt `top: 0`, không thì trang dài thêm 1px. Chỉ `.ma-dlg__b` của hộp thoại cuộn; *Options* (tab *Prompt*) cuộn riêng ≤ 38vh; không lồng vùng cuộn. Vùng cuộn có góc bo x thì thanh cuộn cách góc ≥ x (smoke đo; dải tiến độ: `cornerLimits`).

## Panel bên phải

- Một panel (`#panel`): đầu có ba tab *Comments · N* / *Prompt* / *Review* (*Review* chỉ ở file markdown: `paneFor`; file khác hiện *Comments*, tab đã chọn vẫn nhớ; MDAN-081) và nút biểu tượng *Hints*, thân cuộn, đáy ghim trạng thái,
  *Download .md* và *Copy prompt*. Nút chép luôn trong khung nhìn (smoke đo với 32 nhận xét). Panel hẹp thì bỏ huy hiệu tab (container query).
- Máy rộng (≥ 1081px): panel dính từ đỉnh vùng nội dung tới đáy khung nhìn; `top`, `height` của panel và đệm dọc lưới cùng `--s4`. Tuỳ chọn prompt (kiểu, mọi file, số dòng, folder, dòng đã đọc, toàn văn, lời dẫn) gập trong *Options* ở tab Prompt; dòng tóm tắt cho biết đang bật gì.
- ⌘/Ctrl + Shift + C chép ở mọi chỗ; chép xong nút thành *Copied ✓* một lúc, báo qua `#sr-live`, toast chỉ khi hỏng. Chép / tải neo lại lúc bấm (`freshDoc()`).
- ≤ 1080px: panel ra khỏi lưới; thanh đáy: *Comments · N* (panel vào tấm trượt `#dlg-panel`, đóng thì về chỗ), `✓ N%`, nút chép; một cột cả khi `ma-railed`.
- Thẻ nhận xét: số, L12, nhận xét, trích dẫn. Sửa / xoá hiện khi rê / focus (cảm ứng: luôn); rê thẻ tô đoạn và ngược lại.
- Điện thoại (≤ 720px): một cột, không có *Split*; vùng chạm ≥ `--h-touch` (cả màn cảm ứng; vật nhỏ trong dòng nới bằng lớp giả). Lưu nhận xét không cuộn trang. Vùng an toàn: lề vùng làm việc, mọi phần tử fixed / sticky dùng `--sa-*`.
- Thanh trên điện thoại (MDAN-036): dính, cuộn xuống thì khuất, cuộn lên chút thì về (MDAN-051, `.is-away`, cả nằm ngang thấp); *Files*, tên gọn, *History*, *Settings*, *More*; `.ma-bar__opt` (*New session*, theme) ẩn, vào `#bar-menu` cùng *Help*;
  mỗi mục bấm nút thật của nó (`data-for`); kiểu `.ma-menu` chung với cây (`css/base.css`), phím theo mẫu menu button WAI-ARIA. Toast không nhận chuột (trừ *Undo*); có hộp thoại mở thì toast nằm trong nó; không thì nằm trên tấm nhận xét, nút nổi, viên thuốc (`placeToast()`).

## Hộp nhận xét

- Trích dẫn tối đa 2 dòng, dài hơn thì mờ dần (`.is-long`, mask theo `--ink`). Chuyển động mở tắt khi `prefers-reduced-motion`. Highlight của nhận xét là `<mark class="ma-hl" data-ids>`; số thứ tự hiện bằng `::after`, không lọt vào chữ của khung. Đoạn đang chọn tô bằng `::highlight(ma-pending)`, không sửa DOM (sửa giữa lúc kéo chuột làm mất vùng chọn); mọi Highlight tô qua `paintHL()`.
- Chuột / bút thì mở ngay khi thả. Kéo bắt đầu ở vùng nền (`BG` ở `ui/selection.js`: lề trang hai bên, nền thẻ, nền panel; không nút, ô nhập, hộp prompt, thẻ nhận xét, hộp thoại, vách kéo, thanh cuộn) bôi đen khung đích (MDAN-064):
  điểm kéo vào hộp chữ (`clampInto`), sát mép thì cuộn (`edgeScroll`); Split: trái tâm vách là Source, phải là Preview. Cảm ứng và bàn phím thì hiện nút nổi *Comment on selection* (đoạn ở nửa dưới thì nút lên đỉnh, `fabSide`).
  Hộp dưới đoạn chọn (Split: ở khung đã bôi đen), thiếu chỗ thì lên trên, trọn khung nhìn (`popPlace`). Máy hẹp hoặc màn cảm ứng: tấm trượt đáy;
  mở thì trang (khung *Split*) cuộn ngay để đoạn nằm trên tấm (MDAN-053, `sheetReveal`), đáy trang thêm chỗ bằng tấm (`html.ma-sheet-sp`, bỏ khi không làm trang nhảy).
- Mọi tấm đáy (nhận xét, panel, History / Hints): tay nắm `--grip` vẽ bằng nền, trượt lên, chừa thanh home. Bàn phím ảo: `trackKeyboard()` đặt `--kb` / `--vvh`, tấm, hộp thoại, toast nằm trên nó. Màn cảm ứng: Return xuống dòng, lưu bằng Save (MDAN-054).

## Tô màu và lề số dòng ở *Source* (MDAN-001, MDAN-066)

- Loại file theo tên (`fileType`): markdown (md, markdown, mdx, không đuôi) tô bằng `tokens()`; đuôi / tên của một ngôn ngữ trong `LANGS` tô bằng highlight.js (`codeTokens`: lớp `hljs-*` → `sx-*`, `.sx-comment`); còn lại chữ trơn.
- highlight.js chỉ tải khi cần: lõi và module ES của từng ngôn ngữ trên cdnjs, `fetch` có integrity rồi `import()` từ blob; mở trang không tải gì, file mặc định là markdown nên không preload. Chữ trơn trước, ngôn ngữ sẵn thì `renderAll()` (đang bôi đen trong khung thì chờ bỏ chọn); hỏng thì chữ trơn, một cảnh báo console, lần vẽ sau tải lại. Thêm ngôn ngữ: một dòng trong `LANGS` (`js/core/langs.js`), in bằng `node md-annotate/tools/hl-lang.mjs <id>`; `--check` tải lại cả sổ và so integrity (cần mạng).
- `tokens()` tách token theo dòng (khối rào, đầu mục, kẻ ngang, phân cách bảng, trích khối, dấu danh sách), rồi `inlineToks()` trong dòng (mã, link, chú thích HTML `.sx-comment`, thẻ HTML, URL, đậm, nghiêng, gạch, chuỗi, `|` của bảng).
- Token không chồng nhau, theo thứ tự. `paintSrc()` cắt nguồn theo mép token, mép highlight và đầu dòng; `<mark>` bọc ngoài `<span class="sx-*">`.
- Text của `#v-src` phải đúng bằng nguồn: vùng chọn, neo, số dòng đều đếm trên nó (smoke kiểm). `#doc-meta` đếm dòng bằng `lineCount()` như lề. Tìm token không quét lại cả dòng sau mỗi token (dòng dài vẫn tuyến tính).
- Màu chỉ ở token `--sx-*`; mỗi màu ≥ 4,5:1 trên nền thẻ và trên `--hl` / `--hl-2`, cả hai theme. *Syntax colors* (`prefs.syntax`) tắt: chữ trơn.
- Lề số dòng: mỗi dòng một `<span class="ma-ln">` (block, giữ cả ký tự xuống dòng), số là `::before` + counter (inline-block rộng 0; dòng không định vị trừ `.has-c`: mỗi phần tử định vị là một lớp vẽ, cuộn văn bản dài giật), `user-select: none`. Không chèn số dòng thành chữ. Dòng có nhận xét: `.has-c` + `data-c` (id), có vạch;
  bấm vào lề mở nhận xét đầu của dòng, bấm đúp thì chọn nhiều dòng. Sau vạch là làn đã đọc (`--lane-w`; cảm ứng: vùng chạm `--h-touch` bằng `::before`), rồi chữ; lề (`gutterLine`) dừng trước làn.

## Nhận xét nhiều dòng (MDAN-012)

- Chỉ bằng lề số dòng (*Source*, khung Source của *Split*; `ui/picks.js`). Bấm đúp, nhấn giữ (chạm, MDAN-050) hoặc Shift + bấm lề: vào chế độ chọn dòng với
  dòng ấy, mở hộp; không bôi đen chữ. Ngoài chế độ, bấm một lần giữ như cũ. Dòng chọn `.is-pick`; *Split* tô Preview (`ma-mirror`).
- Trong chế độ, bấm lề thêm / bỏ một dòng (không cần liền; dòng trống không chọn được); hộp đang mở cập nhật tại chỗ. Shift + bấm thêm cả
  dải từ dòng bấm gần nhất; kéo trên lề (chuột) thêm cả dải nếu bắt đầu ở dòng chưa chọn, bỏ nếu đã chọn, lùi thì co (MDAN-019).
- Thoát: Esc, Save, *Done* (`#pop-done`), bỏ dòng cuối, sang Edit / Preview, mở phiên khác, văn bản đổi (`repaintPicks()`). Hộp của chế độ không đóng
  khi bấm ra ngoài (MDAN-014); Cancel chỉ ẩn hộp, giữ các dòng (cảm ứng: thoát), bấm lề thì hộp hiện lại (dòng đã chọn không bị bỏ). Bôi đen chữ trong chế độ: không hộp, không nút nổi.
- Hộp: `3 lines · L12, L15-16` và nút kéo `#pop-grip` (con trỏ, phím mũi tên; trọn khung nhìn; không nhớ chỗ). Mặc định
  dưới dòng vừa bấm, lùi qua lề số để không che lề. Tấm trượt đáy và hộp bôi đen không có nút kéo.
- `parts`: mỗi dải dòng liền một đoạn trích (`origin: 'src'`, quote là trọn các dòng); chỉ lưu khi ≥ 2 phần; `quote`…
  ở ngoài bằng `parts[0]`. Đọc đoạn trích qua `partsOf(c)`, đừng đọc thẳng `c.quote`.
- Mỗi phần neo riêng; phần mất neo bỏ khỏi highlight và prompt; mất hết mới mất neo. Xếp theo phần đầu tìm thấy; số ở phần đầu.
- Thẻ: `L12, L15-16`, mỗi phần một trích dẫn (mất neo thì gạch). `overlapWarning`: trùng khi mọi trích dẫn giống nhau.

## Đánh dấu đã đọc (MDAN-013)

- Chỉ file markdown (MDAN-073); file khác: không có tab *Review* (MDAN-081), dấu cũ giữ, không báo mất. Đơn vị: khối của `lexSpans`; danh sách ≥ 2 mục thì mỗi mục cấp cao một đơn vị (mục con thuộc mục cha); bảng, khối code là
  một đơn vị; khối không chữ / số / emoji (kẻ ngang), khối chỉ có chú thích HTML không tính. Tiến độ theo số dòng, làm tròn xuống.
- Dấu ở `D.reviews` (`{ h, p, n, q, r }`, không số dòng): băm chữ chuẩn hoá (bỏ dấu mục), băm hai hàng xóm (mép văn bản: rỗng), 80 ký tự
  đầu. Chuyển chỗ, chữ giữ nguyên: ✓. Chữ đổi: ○, tính là chưa đọc. Không tìm lại được: mất, báo toast lúc mất và ở tab *Review*.
- Một chỗ hỏi: `rvState()`; một chỗ ghi: `setReviews()` (lưu, vẽ, Undo, cả khi đã đổi file / phiên). Luật ở `core/review.js` (`resolveMarks`,
  `allDone`, `markWord`, `withSug`…); `ui/*` không tự quyết đơn vị nào đã đọc. Lớp và tooltip nút làn, kể cả `.is-sug`, chỉ dựng ở `ui/review.js`.
- Nhận xét không đánh dấu đã đọc. *Dim reviewed* (`prefs.rvDim`, cùng công tắc ở *Settings*; độ sáng `prefs.rvDimV` 10–80%, `--rv-dim`) chỉ làm mờ, không gập: gập làm lệch cuộn theo nhau và dải đọc. Dòng trống ở Source mờ theo dòng ngay trên (`rvLines`).
- Làn: lớp phủ `.ma-lane` trong `#wrap-*`, ngoài `#v-src` / `#v-md`; nút là `<span>` trong dòng chảy của cột (không định vị), dùng lại qua các lần xếp, chỉ ghi lề trên / cao đã đổi, không biến CSS riêng mỗi nút. *Source*: giữa vạch nhận xét và chữ, không phải lề số;
  *Preview*: lề trái. Bấm: bật / tắt; Shift + bấm: cả dải (mốc mất khi văn bản đổi); làn của tiêu đề (hình vuông) bật cả section.
- Phím X / Shift+X / J / K: bỏ qua khi đang gõ chữ, khi hộp thoại hay hộp nhận xét mở, khi có phím bổ trợ khác Shift. Đơn vị hiện tại: chạm
  dải đọc (dưới con trỏ khi Focus theo chuột; khung không cuộn được: đơn vị đầu), làn `.is-cur` (MDAN-079); vừa nhảy tới thì là nó (`pin`, người dùng tự cuộn thì bỏ).
- Nút ✓ Reviewed của hộp nhận xét (nới ra trọn khối, cả dòng chọn ở lề số): `ui/review.js` theo dõi hộp (MutationObserver). Prompt: *Say which lines I reviewed* (`rvPrompt`, mặc định tắt; ẩn khi tắt số dòng hay prompt không có file markdown: `reviewOffered`) thêm một dòng dưới câu số dòng, chỉ dải đã đọc, mỗi tệp ghi tên một lần: `Đã đọc kỹ: a.md L1-20, L30; b.md L5. …` (MDAN-082); tắt thì y hệt từng byte.
- Bộ dấu: khối, section, gợi ý khai một lần ở `css/review.css`; ô đánh dấu của form dùng cùng bộ. Máy hẹp / cảm ứng: `#rv-pill` chỉ đánh dấu, không bỏ dấu (cảm ứng có gợi ý: *Accept N*); chưa có dấu thì tắt làn.
- Dải tiến độ (MDAN-016): `.ma-mm` fixed, mép phải khung; mỗi đơn vị một đoạn theo trạng thái (✓, ○, chưa đọc, gợi ý). Trái dải
  là thanh cuộn tự vẽ (chấm nhận xét), ở *Split* thay thanh của khung; hai đầu tránh góc bo (`cornerLimits`). ≤ 720px ẩn; cảm ứng chỉ xem.
- Gợi ý (`prefs.rvSuggest`, mặc định bật): đơn vị chạm dải đọc (luật của Focus band, cả khi Focus tắt) cộng thời gian; rời dải đi lên sau
  `dwellNeed` (40% số từ ÷ 230 wpm, 4–60 s) thì `.is-sug` (thắng `.is-cur` khi trùng, MDAN-079) và nút *Accept N suggested* ở tab *Review*. Tiêu đề không được gợi ý. Không tự đánh dấu.
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
  qua neo nguồn. Nhãn `tệp:12-14` (`fileLabel`, MDAN-029: ô *Folder* `S.path` + đường dẫn trong cây) khi phiên ≥ 2 file hay file có tên thật.
- Bật số dòng thì lời dẫn thêm câu: số dòng chỉ là gợi ý, lệch thì tìm theo trích dẫn (luôn giữ). Lời dẫn đầu, cuối, tuỳ chọn kèm toàn văn (khối rào dài hơn mọi dãy backtick).

## Gợi ý nhận xét

- Đếm theo khoá chuẩn hoá (`normKey`); xếp theo số lần, lần dùng gần nhất, thứ tự gốc. Tỉ lệ (số lần + 1) / (tổng + số gợi ý), hiện từ 5 lần (`MIN_PCT`).
- Hộp nhận xét hiện 5 gợi ý đầu (`POP_CHIPS`), còn lại sau chip `+N`; giữ Mod hay bấm `+N` hiện mọi gợi ý (lọc theo chữ gõ), vùng chip cuộn; Mod + phím chọn gợi ý 1–10, giữ Mod hiện chữ phím trên chip (MDAN-084); Mod + 1 lưu `remove` của `hints.json`, không chip, không đếm (MDAN-085). Nhãn phím tắt chỉ qua `shortcut()` (`ui/dom.js`). Nhận xét gõ tay ≤ 80 ký tự được đếm; từ hai lần thì thành gợi ý.
- Bỏ gợi ý là ẩn, không xoá số đếm (gợi ý mặc định không quay lại). Đổi chữ gợi ý mặc định: cặp cũ → mới vào `renamed` của `data/hints.json`;
  `migrateHints()` dồn số đếm, giữ trạng thái ẩn, chỉ cho khoá từng là gợi ý mặc định (`seed`).

## Cây file (MDAN-022…025)

- Phiên là cây (`core/session.js`, `core/tree.js`): `nodes` phẳng trỏ cha, `docs[fileId]` (`text`, `comments`, `reviews`, `rvPct`, `real`), `open`, `collapsed`.
  Bất biến và mọi luật (tên, trùng, file kế bên, `canMove`, tên tải về, tên phiên tự đặt `sessionTitle` không theo file mở MDAN-027) ở core.
- `S` là phiên, `D` là doc của file mở (chữ, nhận xét, dấu đọc); tuỳ chọn prompt ở `S`; gắn với một văn bản (Undo, gợi ý, chọn dòng): `docKey()`. Một chỗ ghi
  cây: `setTree()` ở `ui/files.js`; actions của `renderTree` chỉ gọi core rồi `setTree`. Hộp nhận xét có chữ thì không rời file mở (`canLeave()`). Đổi file giữ chế độ xem, chỗ cuộn (bộ nhớ).
- Hai cách hiện (MDAN-061): điện thoại (`mqHandset`: ≤ 720px, hay cảm ứng cao ≤ 500px khi xoay ngang) thì tấm trượt `#dlg-tree` (chọn file thì đóng); mọi khổ khác là cột, không tự ẩn khi chật. Cột (MDAN-037): con của `body`, fixed ở mép trái màn hình, từ đáy
  thanh trên tới đáy khung nhìn (≤ 1080px: trên thanh đáy); `body` đệm trái `--tree`, vùng làm việc và phần trong thanh trên căn giữa phần còn lại.
- `prefs.tree` (chưa chọn: hiện) là "muốn thấy cây": cột thì `#btn-tree` / Ctrl/⌘ + B đổi nó; tấm trượt thì chỉ mở tấm. Nạp folder hiện cây cho phiên ấy, không ghi
  nó (MDAN-032). Cột ở phiên mở ra với ≤ 1 file (`fileCount`) ẩn tới khi phiên có ≥ 2 file, xoá về 1 không ẩn lại; ở phiên ≤ 1 file nút / Ctrl/⌘ + B chỉ đổi cho phiên ấy, không ghi `prefs.tree` (MDAN-083). Kéo mép 180–420px tự do; *Split* theo bề rộng `#doc` thật (cột cây chiếm chỗ thì *Split* lùi về *Preview*, ẩn cây thì về lại).
- Dáng (MDAN-060): `#btn-tree` > 720px ở mép trái thanh trên (`--pad` + vùng an toàn), tên trang thẳng vùng làm việc, hẹp thì sau nút. Đầu cây: FILES nhỏ trên tên phiên, New file, New folder, ⋯ (tấm trượt: Close sau một vạch).
  Hàng cao đúng `--row-h`; thụt đều `--tree-step` mọi cấp, không trần. `#tree-body` chỉ cuộn ngang khi phần thụt đẩy tên hàng sâu nhất dưới `--name-min` (`--dmax`, MDAN-063); thụt ≤ `--fit-d` cấp thì không bao giờ, tên dài cắt …; trang không. Không gì trong hàng vẽ ra ngoài khối hàng, trừ bóng (không tính vào vùng cuộn): lố 1px là thanh cuộn ngang. Mỗi folder mở một vạch `#tree-guides` dưới tâm chevron, dài đúng các hàng con.
  Rê, file mở, thả, focus: cùng một thẻ (`::before`), bắt đầu trước biểu tượng, không tô cả hàng. ⋯ là cột `--more-w` sát mép phải hàng, huy hiệu đứng trước nó; chuột: cột giữ chỗ, ⋯ hiện khi rê / focus / file mở / menu mở; cảm ứng: luôn. Đuôi dính mép phải thân khi cuộn ngang. `reveal()` cuộn ngang tới đầu tên (`nameReveal`) chỉ khi mở file, chọn hàng, hiện cây, đổi bề rộng, `--dmax` đổi; không theo cuộn tay (MDAN-080). Đổi tên: ô nhập trong suốt đúng chỗ tên. Tấm trượt tránh vùng an toàn. Danh sách cao hơn thân thì cuộn hết, hàng cuối ở giữa thân (`.is-tall`); thấp hơn thì không cuộn. Ô lọc (MDAN-068, ≥ 2 file, `/` ở hàng): `findFiles` RegExp không phân biệt hoa thường trên 200 ký tự đầu của tên, hỏng thì chuỗi con (`#tree-q-note`); lọc sau phím cuối 150 ms, phím của bộ gõ đang ghép chữ bỏ qua (MDAN-075); hiện file khớp và folder tổ tiên (mở, bấm không gập); không khớp: `#tree-none`; Esc xoá, gập / mở cũ giữ nguyên.
- Mở file từ đĩa: file mở trống, chưa có tên thật thì điền, không thì thêm cạnh nó (MDAN-024). Nạp folder là bản sao, bộ nhớ đầy thì hoàn lại: bỏ `skipEntry`
  (không đọc vào), không phải chữ (`isTextFile`, MDAN-030), có NUL, > 1 MB; phiên trống thì mở `firstFile` (MDAN-031); xong mà đã đổi phiên thì vào phiên ấy.
- Xoá không hỏi, toast có Undo (cả chuyển): `applyUndo` chỉ trả lại mục ấy (MDAN-028), cả khi đã đổi phiên (`sessionFor`). Tải: `downloadOf`, `zipOf`. *All files* (`S.promptAll`, `allFilesOffered`, MDAN-025): `buildPromptAll`; file không mở neo qua `anchorsOf()` (nhớ theo doc). Tab *Comments* chỉ có file mở.

## Lưu trữ

- Mọi lần đọc ghi `localStorage` bọc try/catch; hỏng thì trang vẫn chạy, chỉ báo một lần. Phiên trống không vào lịch sử.
- Khoá `md-annotate:`: `index:v1` (danh sách phiên), `s:<id>` (một phiên, cả cây), `current`, `stats:v1` (số đếm gợi ý), `prefs:v1` (tuỳ chọn người dùng, cả `tree`, `treeW`).
- Đổi cấu trúc phiên thì tăng hậu tố `v1` và chuyển dữ liệu cũ, trừ khi `normSession` nâng tại chỗ (phiên một văn bản → cây một file, prompt y hệt từng byte).
- Lớp lưu tách riêng (`ui/state.js`, `ui/store.js`): chế độ folder thật sau này chỉ thay lớp ấy. *Sample text* khi phiên có nội dung thì mở phiên mới.

## An toàn

- Markdown dựng bằng `marked` rồi làm sạch bằng `DOMPurify`, cả hai ghim phiên bản và có `integrity`; highlight.js cũng ghim, `fetch` kiểm `integrity` (`CORE_SRI`, `LANGS`). DOMPurify bỏ
  `<style>`, `style=`, `<form>`, `<dialog>`; id / name thêm tiền tố `user-content-`: markdown không chạm CSS, id của trang.
- Link ở bản dựng thành `<span class="ma-a">` (`unlink()`, URL ở `title`), không dựng lại `<a>`: kéo trên link vẫn là bôi đen.
- Chỉ một chỗ gán `innerHTML` (`mdInto()` ở `js/ui/render.js`, cho `#v-md` và bản dựng tách rời): HTML đã qua DOMPurify. Mọi chỗ khác dựng DOM bằng `h()` và `textContent`.
- Thiếu mạng thì *Preview* báo lỗi, *Source* vẫn dùng được (không có đơn vị đã đọc; dấu giữ, không báo mất, không ghi `rvPct`). `file://`: chỉ hiện `#file-notice`.

## Cổng: `sh md-annotate/tools/check.sh`

- `tools/lint.py` (luật kiểm ghi ở đầu file) và `tools/test-core.mjs` (bài thử `js/core/`; logic thuần mới thêm bài ở đây).
- Sửa sự kiện, neo, giao diện: chạy `tools/smoke.cjs` (cách chạy ở đầu file) sau khi push. Cổng `check.sh` xanh thì push `main` ngay; smoke đỏ thì sửa bằng commit mới rồi push tiếp (MDAN-076).
