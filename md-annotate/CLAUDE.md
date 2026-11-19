# `md-annotate/` — nhận xét lên văn bản markdown, gom thành prompt

- Một trang, `index.html`: dán văn bản markdown, xem ở *Source* hoặc *Preview* (đủ chỗ thì có *Split*), bôi đen
  một đoạn để ghi nhận xét, mọi nhận xét gom thành một prompt theo thứ tự trong văn bản.
- Không bước build: `index.html` là markup, CSS ở `css/`, JS là module ES ở `js/` (mục *Code*, MDAN-008).
  Chữ lặp ở `data/` (REPO-001): gợi ý mặc định `hints.json`, bảng phím tắt `shortcuts.json`; *Sample text* và câu mẫu lời dẫn ở HTML.

## Code (MDAN-008)

| File | Việc |
|---|---|
| `index.html` | markup, script theme (trước lần vẽ đầu), báo `file://`, ba thư viện CDN, `js/main.js` |
| `css/*.css` | `tokens` → `base` → `views` → `panel` → `popup` → `dialogs` → `focus` → `mobile`; thứ tự link là cascade |
| `js/main.js` | gọi `init…` theo thứ tự, khởi động; phím tắt chép, đóng hộp thoại, nút theme |
| `js/core/anchor.js`, `js/core/comments.js` | neo đoạn trích (`locate`, `quoteFrom`); thêm / sửa / xoá, neo, xếp, đánh số nhận xét, `partsOf` |
| `js/core/session.js`, `js/core/prompt.js` | mô hình phiên, index, tên tự đặt; dựng prompt, nhãn L12 |
| `js/core/hints.js`, `js/core/place.js` | đếm, xếp hạng gợi ý, chip của hộp nhận xét; chỗ đặt hộp nổi (`popPlace`) |
| `js/core/tokens.js`, `js/core/runs.js` | token của *Source*; cắt chữ theo token / highlight / dòng, `lineCount` |
| `js/core/blocks.js`, `js/core/sections.js` | `lexSpans`, `pairBlocks` (khối nguồn ↔ Preview); đánh số section, dải đọc |
| `js/core/panes.js`, `js/core/picks.js` | Split đủ chỗ không (`splitFits`), cao hai khung, `ma-fit`; nhiều dòng: dải dòng, nhãn, `pickInfo` |
| `js/core/sync-math.js`, `js/core/text.js`, `js/core/shortcuts.js` | đường cong cuộn theo nhau; `plural`, `lineOf`, `slug`; `normShortcuts` |
| `js/ui/store.js`, `js/ui/dom.js` | `localStorage`, khoá, `prefs`; `$`, `h()`, `icon()`, `toast()`, `dragBar()` |
| `js/ui/state.js`, `js/ui/render.js` | phiên `S`, lưu, chuyển phiên; `renderAll()`, kết quả neo `mdText`, `anchors`, `ordered`… |
| `js/ui/anchor-dom.js`, `js/ui/marks.js` | vùng chọn ↔ vị trí chữ; `<mark class="ma-hl">`, tô active / hover |
| `js/ui/markdown.js`, `js/ui/source-view.js` | `marked` + DOMPurify, `unlink()`, `ghExtras()`, `mdLex()`; vẽ `#v-src` |
| `js/ui/list.js`, `js/ui/prompt.js` | danh sách nhận xét; panel *Prompt*, chép, tải, *Options* |
| `js/ui/popup.js`, `js/ui/selection.js`, `js/ui/picks.js` | hộp nhận xét; bôi đen → hộp, nút nổi, `ma-mirror`; chọn nhiều dòng ở lề số, nút kéo hộp |
| `js/ui/views.js`, `js/ui/sync-scroll.js` | chế độ xem, `splitOK()`, `sizePanes()`, vách giữa; cuộn theo nhau |
| `js/ui/focus.js`, `js/ui/layout.js`, `js/ui/help.js` | *Focus mode*, dải đọc; hộp *Settings* (`#dlg-layout`), `layoutVal()`; hộp *Shortcuts* |
| `js/ui/panel.js`, `js/ui/hints.js` | panel, mép kéo, thanh dọc, tấm trượt; số đếm gợi ý trong bộ nhớ, hộp *Hints* |
| `js/ui/history.js`, `js/ui/editor.js` | hộp *History*; khung *Edit*, dán, mở / thả file, văn bản mẫu, tên phiên |

- `js/core/` là logic: nhận và trả dữ liệu thường; không DOM, `window`, `localStorage`, lớp CSS; chỉ import `js/core/`
  (`tools/lint.py` kiểm). `js/ui/` đọc DOM và vị trí, gọi `js/core/`, ghi DOM; sự kiện trong `init…()` của nó.
- Tính năng mới: logic vào `js/core/`, giao diện và sự kiện vào một module `js/ui/`; `main.js` gọi `init…()`.
- Thứ tự gọi `init…()` là thứ tự đăng ký sự kiện: hai module nghe cùng phần tử thì đừng đảo (cặp ghi ở đầu `main.js`).
- Biến dùng chung: `export var` ở module sở hữu; nơi khác chỉ đọc, gán lại qua hàm của chủ (`switchTo()`, `replaceDeleted()`).
- Import vòng được; code cấp cao của module không gọi sang module khác, việc lúc nạp nằm trong `init…()`.
- Mỗi file mở đầu bằng chú thích: làm gì, xuất gì, dùng module nào.

## Ngôn ngữ (MDAN-007)

- Chữ giao diện bằng tiếng Anh: nút, nhãn, tooltip, placeholder giao diện, `aria-label`, toast, hộp thoại, văn bản mẫu; `<html lang="en">`.
- Nội dung vào prompt bằng tiếng Việt: gợi ý mặc định (`data/hints.json`), câu số dòng, `Văn bản gốc:`, câu mẫu và
  placeholder của lời dẫn đầu / cuối. Trích dẫn và nhận xét của người dùng giữ nguyên như đã gõ.
- Chú thích code, tài liệu `.md`, `desc` trang chủ: tiếng Việt. Số nhiều qua `plural(n, word)`; số theo `en`, ngày theo `en-GB`.

## Giao diện

- Nền, mực, font chép từ `index.html` gốc. Một màu xanh: `--accent` (MDAN-009); nền nhạt, highlight, vạch pha từ nó.
- Xanh không làm chữ trên nền sáng (~2,3:1): chữ là mực, nhấn bằng vạch / nền nhạt / huy hiệu. Chữ trên `--accent`: `--on-accent`.
- Chữ ≥ 4,5:1; chỉ báo trạng thái ≥ 3:1 (focus `--ring`, thẻ / hàng đang chọn `--edge-on`), cả hai theme.
- Token ở `css/tokens.css` (chữ `--fs-*` + `--lh*`, bo `--r-*`, vật lồng trong bo nhỏ hơn; cao `--h-*`, khoảng `--s*`, `--dur`).
- Họ component chung luật ở `css/base.css` (nút, nhóm tab `.ma-tabs` / `.ma-seg` / `.ma-fmt`, ô nhập, huy hiệu, phím): thêm biến thể vào họ.
- Theme: khoá chung `hub-theme`, đặt trước lần vẽ đầu; chưa chọn thì theo hệ điều hành (REPO-024).
- Bề rộng (MDAN-005): `.ma-wrap` rộng `max(70vw, 1280px)`, không quá khung nhìn, căn giữa, lề `--pad`. Panel rộng `--side` (kéo `#panel-grip`,
  320–560, `prefs.side`), thu gọn thành `.ma-rail` 56px (`html.ma-railed`, `prefs.rail`); thanh dọc giữ nút chép.
- *Split* khi `#doc` đủ cho hai khung ≥ 420px (`splitFits()`), không theo media query; chưa đủ thì hiện *Preview*, `prefs.view`
  vẫn nhớ `split`. Hai khung cao `--pane-h` (`paneHeight`), cuộn riêng; trang không cuộn. Vách `#divider` lưu `prefs.split`.
- Split vừa khung nhìn (khung ≥ 320px): `sizePanes()` gắn `html.ma-fit` (khoá cuộn trang), để thanh cuộn chính không
  chập chờn khi trang dư 1px. Rời Split thì bỏ. Đừng thêm `scrollbar-gutter` cho `html`: nó ăn bề rộng, mất Split ở 1280px.
- Hộp *Settings* (`#dlg-layout`): bề rộng vùng làm việc (`prefs.wrap`: `auto` hoặc 50–100%, sàn 720px, `--wrap-w`), khổ chữ *Preview*
  (`prefs.measure`: 0 = hết khung hoặc 50–140ch, `--md-max`), cỡ chữ *Preview* (`prefs.mdfs` 13–22px, `--md-fs`). Áp ngay khi kéo; điện thoại ẩn bề rộng.
- *Settings* và *Shortcuts* giữa màn hình cả ở điện thoại (`.ma-dlg--center`); *Settings* ≤ 420px, nền mờ nhẹ `--scrim-live` để vẫn thấy
  thay đổi (MDAN-015). *Shortcuts* (`#dlg-keys`): chỉ phím / cú bấm mới, từ `data/shortcuts.json`; mở bằng nút ở đầu *Settings* hoặc `?` ngoài ô nhập.
- *Focus mode* trong hộp *Settings* (`prefs.focus`, `prefs.dim` 10–70%, `html.ma-focus`, `--dim`): mờ mọi thứ ngoài một
  section. Section bắt đầu ở mỗi tiêu đề cấp cao: h1–h6 con trực tiếp của `#v-md`; ở *Source* là dòng đầu token
  `heading` hoặc khối HTML mở bằng `<h1>`…`<h6>` của `marked.lexer` (số section hai bên khớp). Sáng: `.is-sec`.
- Chọn section (`prefs.focusBy`): `pointer` theo chuột (rời cả hai khung thì hết mờ, trừ khi hộp nhận xét mở); `band` là section
  chạm dải 25–50% vùng nhìn (khung cuộn ở *Split*, cửa sổ ở chế độ khác); trong nửa vùng nhìn sát đầu / cuối, hai mốc trượt về mép
  (`bandBounds`). Vẽ lại thì section đang sáng được đặt lại (`refreshBand()`). *Split*: section cùng số ở khung kia cũng sáng; dải
  chỉ đo trên khung người dùng cuộn gần nhất (`bandFrom`), cuộn do trang đặt (`setByPage`) không đổi nó; chưa cuộn thì đo trên Preview.
- "Chạm dải" (`bandPick`): khối đầu tiên có đáy dưới mốc 25% và đỉnh trên mốc 50%. Đuôi section trước còn nằm trong
  dải thì section trước thắng; không khối nào chạm thì lấy khối ngay trên dải.
- Ở dải đọc, dòng dưới chuột cũng sáng (`.is-line`): một `.ma-ln`, hoặc `li` / `tr` / `dt` / `dd` / khối cấp cao ở
  *Preview*; phần khác của khối cấp cao chứa nó mờ (`.ma-dimx`). Ở *Split* khung kia sáng cả khối tương ứng (cặp của
  `blockPairs()`: cùng số khối thì i ↔ i, lệch thì `pairBlocks` ghép theo dãy con chung dài nhất của thẻ). Cuộn thì tìm lại dòng dưới chuột; rời khung thì hết.
- Khối nguồn (`lexSpans`) neo vào văn bản gốc, không cộng dồn `raw`: marked bỏ khối `[id]: url` và đổi tab đầu dòng.
- Bôi đen ở *Split*: đoạn tương ứng ở khung kia tô bằng CSS Highlight `ma-mirror` (`mirrorSel`, tìm bằng `locate`, như neo
  nhận xét). Hộp nhận xét mở thì `ma-pending` thay thế.
- *Preview* giống GitHub (MDAN-006): màu Primer `--gh-*`, code tô bằng highlight.js (`--hl-*`) khi khối rào ghi ngôn ngữ hljs biết.
  `ghExtras()` đổi `> [!NOTE|TIP|…]` thành `.ma-alert`, tiêu đề vẽ bằng CSS. Cỡ chữ trong `.ma-md` bằng `em` theo `--md-fs`.
- Cuộn theo nhau ở *Split* (`prefs.sync`, mặc định bật): `buildSyncMap()` lấy mốc từ các cặp khối của `blockPairs()`, chỉ đỉnh với
  đỉnh (thêm đáy làm tốc độ giật), nội suy Hermite đơn điệu (`monoCurve`). Điểm tham chiếu ở giữa khung, sát đầu / cuối trượt về mép.
- Khung theo đặt ngay trong sự kiện cuộn của khung dẫn (không rAF); cuộn do trang đặt (`syncExpect`) bị bỏ qua.
- Hộp thoại: chỉ `.ma-dlg__b` cuộn. Tab *Prompt*: thân panel không cuộn, *Options* cuộn riêng (≤ 38vh), `#out` lấp phần còn lại, tự cuộn.
- *Preview* mặc định rộng hết khung; trích khối là vạch trái một cạnh (không bo), bảng có viền ngoài bo góc.
- Trống văn bản: thẻ `#start` trên ô nhập thấp; có chữ thì ẩn thẻ, hiện hàng công cụ. Ctrl/⌘ + V ngoài ô nhập cũng dán khi còn trống.
- Một `<input type="file" id="file-in">` ẩn; mọi nút *Open .md file* (`.js-open`) gọi `click()` của nó.
- Hiệu ứng rê chuột bọc trong `@media (hover: hover)`, để màn cảm ứng không dính trạng thái rê.
- Phần tử ẩn cho trình đọc màn hình (`.ma-sr`) đặt `top: 0`, không thì nó đẩy trang dài thêm 1px.

## Panel bên phải

- Một panel (`#panel`): đầu có hai tab *Comments · N* / *Prompt*, thân cuộn (tab *Prompt*: xem mục Hộp thoại ở trên), đáy ghim trạng thái,
  *Download .md* và *Copy prompt*. Nút chép luôn trong khung nhìn, dù bao nhiêu nhận xét (smoke đo với 32).
- Máy rộng (≥ 1081px): panel dính, chạy từ đỉnh vùng nội dung tới đáy khung nhìn. `top`, `height` của panel và
  `padding` trên dưới của lưới cùng dùng `--s4`: đổi một chỗ thì đổi cả ba.
- Tuỳ chọn prompt (kiểu, số dòng, tệp, toàn văn, lời dẫn) gập trong *Options* ở tab Prompt; dòng tóm tắt cho biết đang bật gì.
- ⌘/Ctrl + Shift + C chép prompt ở mọi chỗ. Chép xong nút đổi thành *Copied ✓* một lúc; báo đọc màn hình qua
  `#sr-live`. Toast chỉ dùng khi chép hỏng. Chép / tải neo lại lúc bấm (`freshDoc()`): *Edit* vẽ lại trễ 250ms.
- ≤ 1080px: panel ẩn khỏi lưới; thanh đáy có *Comments · N* (mở panel trong tấm trượt `#dlg-panel`, đóng thì panel
  về chỗ cũ) và nút chép. Lưới một cột kể cả khi `html.ma-railed`.
- Thẻ nhận xét: không viền; số, vị trí (L12), nhận xét nổi bật, trích dẫn mờ có vạch trái (một cạnh nên không bo,
  REPO-025). Nút sửa / xoá hiện khi rê hoặc focus; màn cảm ứng thì luôn hiện. Rê thẻ thì tô đoạn và ngược lại.
- Điện thoại (≤ 720px): một cột, không có *Split*; vùng chạm ≥ `--h-touch` (cả màn cảm ứng). Lưu nhận xét không cuộn trang.
- Toast không nhận chuột (trừ nút *Undo*), để không chặn bôi đen chữ dưới; có hộp thoại mở thì toast nằm trong nó.

## Hộp nhận xét

- Trích dẫn tối đa 2 dòng, dài hơn thì mờ dần (`.is-long`, mask theo `--ink`). Chuyển động mở tắt khi `prefers-reduced-motion`.
- Chuột thì mở ngay khi thả, kể cả khi kéo bắt đầu ở vùng nền (lề trái / phải, nền trang quanh khung; trừ nút, ô nhập,
  panel, hộp thoại, vách kéo, thanh cuộn); cảm ứng và bàn phím thì hiện nút nổi *Comment on selection*. Máy hẹp hoặc màn cảm
  ứng: hộp là tấm trượt đáy. Hộp dưới đoạn chọn, thiếu chỗ thì lên trên, luôn trọn khung nhìn (`popPlace`).
- Đoạn đang chọn tô bằng `::highlight(ma-pending)`, không sửa DOM: sửa DOM giữa lúc kéo chuột làm mất vùng chọn.
- Highlight của nhận xét là `<mark class="ma-hl" data-ids>`; số thứ tự hiện bằng `::after`, không lọt vào chữ của khung.

## Tô màu và lề số dòng ở *Source* (MDAN-001)

- `tokens()` tách token theo dòng (khối rào, đầu mục, kẻ ngang, phân cách bảng, trích khối, dấu danh sách), rồi
  `inlineToks()` trong dòng (mã, link, thẻ HTML, URL, đậm, nghiêng, gạch, chuỗi, `|` của bảng).
- Token không chồng nhau, theo thứ tự. `paintSrc()` cắt nguồn theo mép token, mép highlight và đầu dòng; `<mark>`
  bọc ngoài `<span class="sx-*">`. Không bao giờ gán innerHTML từ chữ người dùng.
- Text của `#v-src` phải đúng bằng nguồn: vùng chọn, neo, số dòng đều đếm trên nó (smoke kiểm). `#doc-meta` đếm dòng
  bằng `lineCount()` như lề. Tìm token không quét lại cả dòng sau mỗi token (dòng dài vẫn tuyến tính).
- Màu chỉ ở token `--sx-*`; mỗi màu ≥ 4,5:1 trên nền thẻ và trên `--hl` / `--hl-2`, cả hai theme.
- Nút *Syntax colors* lưu ở `prefs.syntax`; tắt thì khung là chữ trơn.
- Lề số dòng: mỗi dòng một `<span class="ma-ln">` (block, giữ cả ký tự xuống dòng), số là `::before` + counter,
  `user-select: none`. Không chèn số dòng thành chữ. Dòng có nhận xét: `.has-c` + `data-c` (id), vạch `--accent`;
  bấm vào lề mở nhận xét đầu của dòng, bấm đúp thì chọn nhiều dòng (mục dưới).

## Nhận xét nhiều dòng (MDAN-012)

- Chỉ ở nơi có lề số dòng (*Source*, khung Source của *Split*), chỉ bằng lề số (`ui/picks.js`). *Preview* không chọn dòng.
- Bấm đúp lề: vào chế độ chọn dòng với dòng ấy, mở hộp; không bôi đen chữ. Ngoài chế độ, bấm một lần giữ như cũ.
- Trong chế độ, bấm lề thêm / bỏ một dòng (không cần liền; dòng trống không chọn được); hộp đang mở cập nhật tại chỗ.
- Thoát: Esc, Save, bỏ dòng cuối, sang Edit / Preview, mở phiên khác, văn bản đổi (`repaintPicks()`).
- Hộp của chế độ không đóng khi bấm ra ngoài (MDAN-014); Cancel chỉ ẩn hộp, giữ các dòng, bấm lề thì hộp hiện lại.
- Trong chế độ, bôi đen chữ không mở hộp, không hiện nút nổi. Dòng đã chọn `.is-pick`; *Split* tô chữ ở Preview (`ma-mirror`).
- Hộp: `3 lines · L12, L15-16` và nút kéo `#pop-grip` (con trỏ, phím mũi tên; trọn khung nhìn; không nhớ chỗ). Mặc định
  dưới dòng vừa bấm, lùi qua lề số để không che lề. Tấm trượt đáy và hộp bôi đen không có nút kéo.
- `parts`: mỗi dải dòng liền một đoạn trích (`origin: 'src'`, quote là trọn các dòng); chỉ lưu khi ≥ 2 phần; `quote`…
  ở ngoài bằng `parts[0]`. Đọc đoạn trích qua `partsOf(c)`, đừng đọc thẳng `c.quote`.
- Mỗi phần neo riêng; phần mất neo bỏ khỏi highlight và prompt; mất hết mới mất neo. Xếp theo phần đầu tìm thấy; số ở phần đầu.
- Thẻ: `L12, L15-16`, mỗi phần một trích dẫn (mất neo thì gạch). `overlapWarning`: trùng khi mọi trích dẫn giống nhau.

## Neo đoạn trích

- Mỗi nhận xét lưu `quote`, `prefix`, `suffix` (48 ký tự), `origin` (`src` | `md`) và `rel` (vị trí tương đối),
  kiểu TextQuoteSelector của W3C Web Annotation. Không lưu offset: văn bản đổi thì offset sai.
- Mỗi lần vẽ, tìm lại đoạn trích trong cả nguồn lẫn bản dựng: tầng 1 khớp nguyên văn sau khi gộp khoảng trắng;
  tầng 2 chỉ so chữ và số, chữ thường, bỏ cú pháp markdown có chữ (`SYNTAX`).
- Nhiều chỗ khớp: `prefix` / `suffix` khớp dài nhất, rồi gần `rel` nhất (so mọi chỗ; trích ở khung kia thì so ở tầng 2).
- Không tìm thấy ở cả hai chế độ: nhận xét mất neo, hiện `!` trong danh sách và không vào prompt.
- Chọn ở *Source* thì trích đúng nguồn markdown; chọn ở *Preview* thì trích chữ đã dựng.
- Vùng chọn bắt đầu hay kết thúc giữa từ thì nới ra tới mép từ (chữ, số, dấu Unicode) trước khi neo.
- Thứ tự trong prompt là thứ tự đoạn trích trong nguồn.

## Prompt

- Hai kiểu: gọn `1. L12 "quote" — comment` (mặc định) và khối `### 1 · L12-14` + `> quote` + comment.
- Nhiều phần: `3. L12 "q1"; L15-16 "q2" — comment`; khối `### 3 · L12, L15-16` + mỗi phần một khối `>`. Một đoạn: y như cũ.
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
  và giữ trạng thái ẩn. Chỉ khoá từng là gợi ý mặc định (`seed`) được dồn.

## Lưu trữ

- Mọi lần đọc ghi `localStorage` bọc try/catch; hỏng thì trang vẫn chạy, chỉ báo một lần.
- Khoá: `md-annotate:index:v1` (danh sách phiên), `md-annotate:s:<id>` (một phiên), `md-annotate:current`,
  `md-annotate:stats:v1` (số đếm gợi ý), `md-annotate:prefs:v1` (mọi tuỳ chọn giao diện: chế độ xem, prompt, *Settings*, panel).
- Đổi cấu trúc phiên thì tăng hậu tố `v1` và chuyển dữ liệu cũ, đừng bỏ. Trường thêm, tuỳ chọn (`parts`) thì không tăng.
- Phiên trống (không văn bản, không nhận xét) không vào lịch sử.
- Mở file hoặc văn bản mẫu khi phiên đang có nội dung thì mở phiên mới, không ghi đè.

## An toàn

- Markdown dựng bằng `marked` rồi làm sạch bằng `DOMPurify`, cả hai ghim phiên bản và có `integrity`. DOMPurify bỏ
  `<style>`, `style=`, `<form>`, `<dialog>`; id / name thêm tiền tố `user-content-`: markdown không chạm CSS, id của trang.
- Link ở bản dựng thành `<span class="ma-a">` (`unlink()`, URL ở `title`), không dựng lại `<a>`: kéo trên link vẫn là bôi đen.
- Chỉ một chỗ gán `innerHTML` (`renderAll()` ở `js/ui/render.js`): HTML đã qua DOMPurify. Mọi chỗ khác dựng DOM bằng `h()` và `textContent`.
- Thiếu mạng thì *Preview* báo lỗi, *Source* vẫn dùng được.
- Mở bằng `file://`: module ES không chạy; script inline chỉ hiện `#file-notice` (cách mở qua HTTP).

## Cổng: `sh md-annotate/tools/check.sh`

- `tools/lint.py`: luật nó kiểm ghi ở đầu file (dữ liệu gợi ý và phím tắt, một chỗ `innerHTML`, file mồ côi, `js/core/` thuần, token).
- `tools/test-core.mjs` (node, không trình duyệt): bài thử của `js/core/`. Logic thuần mới thì thêm bài thử ở đây.
- Sửa sự kiện, neo hay giao diện thì chạy thêm `tools/smoke.cjs` (CI chưa chạy; cách chạy ở đầu file). Văn bản mẫu: `tools/fixtures/`.
