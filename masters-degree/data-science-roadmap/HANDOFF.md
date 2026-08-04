# Handoff — data-science-roadmap.html

File là single-page app (~12,6k dòng, tự chứa) dựng trên web-builder CSS. Nội dung bài nằm
trong các `<template data-node="…">`, router hash dựng ra.

**Đọc [CLAUDE.md](CLAUDE.md) trước.** Đừng mở cả file HTML để tìm hiểu — dùng `TOC.md`
và `node tools/gate.mjs --show <id>`.

**Mở phiên bằng `node tools/session.mjs`** — nó nói ngay có phiên khác đang làm dở không,
việc gì đang dở, cổng xanh hay đỏ. Đóng phiên bằng `--close`.

Ba lớp kiểm tự động (`tools/install-hooks.sh` cài cả ba):
- sau mỗi Edit → Claude Code hook · lúc commit → `pre-commit` · lúc push → `pre-push` (CHẶN)
- `node tools/gate.mjs` đã bao gồm `auditPlan()` (cổng `G-PLAN`) — **không cần mở trình
  duyệt để kiểm lịch học nữa**.
- `node tools/gate.test.mjs` — test cho chính bộ cổng. Chạy khi sửa `tools/`.

---

## Phiên 2026-08-04 (h) — cột bằng bề rộng bảng, chữ fluid, hết cụt 10% vì zoom, `Notes` mới

Phiên (g) để lại ba lỗi mà chủ trang thấy ngay: thanh bên và dock cụt đáy, cột vẫn hẹp,
và cái panel ghi chú tên là "Sổ học". Phiên này sửa cả ba, và **hai con số đo được ghi ở
(g) là đo sai** — chỗ đó quan trọng hơn cả ba việc trên, xem §2.

### 1. `zoom` không điều chỉnh đơn vị viewport — lần thứ hai

Phiên (g) đã biết cái bẫy này (công thức `--ds-bleed` chia `--ds-zoom`) nhưng chỉ sửa
**một** chỗ. Còn lại: kit đặt `--wb-shell-h: 100dvh` và `.wb-drawer { height: 100vh }`, nên
dưới `zoom:.9` **thanh bên + ngăn phụ + dock đều cao đúng 90% cửa sổ**. Đo: thanh bên
597,6px trong khi chỗ trống là 669,6px.

Sửa theo *lớp*, không theo từng chỗ: hai token `--ds-vh` / `--ds-vw` = `calc(1vh|1vw / zoom)`,
rồi override `--wb-shell-h` (kit tự ghi chú "override if the page is zoomed") và **`.wb-drawer`**
— sửa ở lớp nên cả ngăn phụ lẫn dock đúng theo cùng lúc. Cộng `.ds-mathmodal` (94vw/72vh),
`.ds-drawer` (94vw), `--ds-bleed`.

Hai thứ cùng gốc, cũng đã sửa:
- **Media query** so với `viewport / zoom`, nên `min-width: 1200px` thật ra là ngưỡng
  **1080px thật** → đổi thành `1333px`. Ở 1080px, cột sau khi nhường chỗ dock còn ~38 ký
  tự/dòng, dưới sàn 45.
- `getBoundingClientRect()`/`clientX` là px **sau** zoom, `getComputedStyle().width` là px
  **cục bộ**. Luật cho code kéo dock: từ chuột vào CSS thì **chia**, từ CSS ra chuột thì **nhân**.

Không có cổng nào bắt được loại lỗi này (nó là con số đúng cú pháp mà sai nghĩa), nên nó
thành **một ca test** trong `gate.test.mjs`: không `vh|vw|dvh` trần nào trong `<style>`
ngoài hai token, cộng in ra cả 5 ngưỡng media query mỗi lần chạy.

Chạm vào: `(khung: CSS)` · `tools/gate.test.mjs`

### 2. Hai con số ký tự/dòng ở (g) là ĐO SAI — và bản 860/18 đã ở ngoài khoảng dễ đọc

Phiên (g) ghi "860px/18px → trung vị 81 ký tự/dòng". Đo lại: **100–103**. Bản đo cũ gom ký
tự theo `top` với ngưỡng quá rộng nên gộp hai dòng thành một. Cách kiểm chắc chắn — và giờ
là cách bắt buộc, ghi ở `design.md` §0.2: **in thẳng chuỗi của từng dòng ra rồi đếm tay.**
Một dòng ở 774px/18px chứa đúng 100–103 ký tự, đọc được bằng mắt trong console.

Nghĩa là bản (g) **đã ở ngoài khoảng 45–90**, nên lần nới này không phải "đánh đổi rộng lấy
dễ đọc" mà tốt hơn ở cả hai: `--ds-measure` 860 → **1060px** (đúng bề rộng `.wb-table-scroll`
mà chủ trang lấy làm mốc: 1060 × 0,9 = 954px hiện ra) và `--ds-fs` 18 → **28px**, trung vị
tụt 102 → **84**.

`--ds-fs` giờ là **`clamp(17px, …, 28px)`** — cột co theo cửa sổ nên chữ phải co theo, nếu
không thì điện thoại 375px còn 30 ký tự/dòng (dưới sàn 45). Đo ba đầu: 375px → 47 · 1000px
→ 66 · 1440px → 84. `--ds-wide` 1060 → 1260px để bảng vẫn còn chỗ tràn.

Việc đi kèm, và nó lớn hơn hai token: **cỡ chữ trong cột bài không được là px cứng.** Cột
954px mà một đoạn 13px thì hơn 170 ký tự/dòng. ~35 lớp `ds-*` đọc bốn token chữ của kit
(12–15px cứng), nên sửa **ở token**, trong `#main`:
`--wb-text-title/-body/-help/-caption = calc(var(--ds-fs) * .84/.78/.72/.67)` — giữ đúng tỉ
lệ mà thiết kế cũ đã chọn (15/18, 14/18, 13/18, 12/18), nên không có gì đổi *tương đối*.
Đặt ở `#main` chứ không `.ds-prose` vì dải mục tiêu, breadcrumb, chip, hộp kết bài, pager
nằm ngoài `.ds-prose` nhưng vẫn thuộc cột bài. Cộng 6 chỗ px cứng còn lại (`.ds-code`,
`.ds-accept__tag`, `.ds-mx__c`, `.ds-map__badge`, `.ds-leaf__m`, `kbd`) → `calc()`.

**Dùng `calc()`, không dùng `em`** cho token: `em` trong custom property được giải ở *chỗ
dùng*, nên hai lớp lồng nhau cùng đọc token sẽ nhân dồn (`.ds-fam dt` ra 12,5px thay vì 17,4px).

Chạm vào: `(khung: CSS)`

### 3. Dock `Notes`: mặc định 1/4 cửa sổ, kéo được

`--ds-dock-w` từ `380px` cố định → `clamp(300px, calc(25 * var(--ds-vw)), 640px)`. Vì sao %:
dock lấy chỗ của cột bài, nên "bao nhiêu là đủ" phụ thuộc cửa sổ — 380px là 30% cột trên màn
1280 và 15% trên màn 2560. Mặc định do **CSS** tính, không phải JS, nên người chưa từng kéo
thì đổi cửa sổ vẫn luôn được đúng 1/4.

Tay kéo `.ds-dockgrip` ở mép trái: `role="separator"` + `tabindex` + `aria-valuemin/max/now/`
`valuetext`, ←/→ 16px (Shift ×4), Home/End hai đầu, nhấn đúp về mặc định. Bàn phím là bắt
buộc — một tay kéo chỉ chuột dùng được thì nó không phải điều khiển, nó là cái bẫy.

Ba chi tiết đã phải sửa sau khi thử:
- **Không `setPointerCapture`** — nó ném khi pointerId không phải con trỏ thật, nên bản đầu
  im lặng không kéo được và *không kiểm được bằng script*. Đổi sang cờ + listener trên
  `window` (cũng là thứ giữ cho việc kéo không đứt khi chuột ra ngoài dock).
- **Đọc bề rộng bằng `getComputedStyle`**, không bằng rect: rect ra **0** khi dock đang
  đóng (`.wb-overlay` là `display:none`).
- **Reset = XOÁ `localStorage['ds.dockW']`**, không phải ghi lại 25% — để mặc định fluid
  quay về đúng nghĩa mặc định.

Tay kéo chỉ hiện vạch khi hover, nên **phụ đề dock phải nói ra rằng mép trái kéo được**.

Chạm vào: `(khung: CSS / script)`

### 4. `Sổ học` → `Notes`

Người dùng chỉ đang ghi một note; `LEARNING-LOG.md` / `## Sổ` / `G-LEARN` là cơ chế bên
dưới và không nên lộ ra ở lớp vỏ. Ranh giới đã ghi ở `design.md` §0.1 và `CLAUDE.md` §11:
**tên panel** = `Notes`; **mọi câu nói về nó** = tiếng Việt, dùng từ "ghi chú"; **tên cơ
chế** giữ nguyên (đường dẫn và cú pháp file, không phải nhãn giao diện).

Đây là **ngoại lệ duy nhất** của luật lớp-vỏ-tiếng-Việt, và nó được ghi ở cả hai chỗ đúng
để phiên sau không "sửa cho đúng luật" thành `Ghi chú`.

### 5. Thiết kế lại panel `Notes` — sáu chỗ, mỗi chỗ một lý do

Chủ trang chỉ ra bốn thứ; sửa thành sáu vì hai trong số đó có cùng gốc.

**a. Một danh sách, không lọc theo bài đang mở.** Bản trước mặc định lọc "Bài này", nên đổi
bài là danh sách trông như vừa bị xoá sạch. Ghi chú là của cả quá trình học, không phải của
một trang. Bỏ hẳn cặp nút lọc và biến `noteFilter`; mỗi dòng **luôn** mang tên bài, và tên
đó là link mở bài — bấm nó **giữ panel mở**, vì bạn bấm sang bài đó chính vì muốn xem lại
chỗ đã ghi.

**b. Hàng, không phải thẻ.** Mỗi ghi chú từng là thẻ có nền riêng + viền quanh + mép trái 3px
màu theo loại + bo góc một bên: bốn thứ trang trí cho một dòng chữ, và trong một dock hẹp
chúng cộng lại thành nhiễu. Giờ là hàng phẳng ngăn nhau bằng một vạch. Loại vẫn được nói hai
lần (điểm màu + chữ) cho người không phân biệt được màu, **nhưng chỉ với `tắc` và `gỡ`** —
`ghi` là mặc định nên nó không có nhãn nào.

**c. Số trên nút không còn là badge.** Viên đặc màu nghịch đảo là ngôn ngữ của "có việc chưa
xử lý"; ghi chú của chính mình không phải việc tồn, nên viên đó vừa xấu vừa nói sai. Giờ là
một con số sau nhãn, ngăn bằng vạch mảnh: `Notes · 3`. Tôi đã thử tô nó vàng khi có chỗ tắc
rồi **bỏ** — con số là *tổng*, tô nó theo 2/5 dòng là để màu nói sai về chính con số nó đứng
cạnh. Số chỗ tắc nói ở tiêu đề mục "Đã ghi" và ở tooltip nút.

**d. Hai cái "line mỏng mỏng" — cùng một loại lỗi.** Tay kéo dock là vạch 1px chỉ hiện khi
hover; góc dưới-phải ô ghi là tay kéo chéo mặc định của trình duyệt. Cả hai là *affordance*
mà trang không kiểm soát được hình. Sửa: tay kéo thành **viên 5×44px luôn thấy** (hover thì
đổi màu + dài ra, **không** đổi bề rộng — đổi bề rộng thì nó nhảy ngang đúng lúc con trỏ vừa
tới); ô ghi thành `resize: none` + **tự cao dần** theo chữ, nên cái tay kéo chéo biến mất.

**e. Ô "bài đang mở" bỏ hộp.** Nó là hộp viền + nền `surface-2` nên đọc như một input bị vô
hiệu hoá, mà nó không nhận chữ. Tiêu đề mục ngay trên đã nói vai của nó.

**f. Sửa/xoá chỉ hiện khi hover hoặc `:focus-within`.** Hai nút × 20 ghi chú = 40 nút cạnh
chữ. `@media (hover: none)` cho chúng hiện sẵn trên màn cảm ứng.

Đã kiểm bằng 5 ghi chú mẫu ở 5 bài khác nhau: bấm tên bài → đổi bài, panel vẫn mở, danh sách
**không đổi** (5/5), ô ghi chuyển sang bài mới · nút hành động opacity 0 → 1 khi có tiêu điểm
bàn phím · ô ghi 70 → 125px rồi thu lại 70px · cả sáng lẫn tối.

Chạm vào: `(khung: CSS / script)`

### Đã kiểm

| bề rộng | chữ | cuộn ngang | thanh bên | cột | bảng | dock |
|---|---|---|---|---|---|---|
| 1440 | 28px | 0 | 849,6 = đủ | 954 | 1085 (tràn) | 360 = 1/4 · thân trang nhường chỗ (pad 400) |
| 1200 | 26,7px | 0 | 769,6 = đủ | 856 | 856 | 300 · nằm đè (ngưỡng `1333` rơi ngay trên 1200) |
| 1000 | 24,4px | 0 | 709,6 = đủ | 656 | 656 | 270 · nằm đè (đúng) |
| 375 | 17px | 0 | 812 = cả màn | 339 | 339 | 270 · nằm đè |

Cả sáng và tối. Kéo dock: 1:1 với chuột, kẹp đúng ở min, nhớ qua F5, nhấn đúp về 1/4.
Console không lỗi. Cổng CHẶN qua · 7 khuyến nghị (6 `G-FWD` ổn định + `G-TOC-STALE`) ·
`gate.test.mjs` **47 đạt / 0 trượt** · `audit` nhất quán.

### Cố ý KHÔNG làm trong phiên này

- **Không nới cột thêm nữa.** 1060px là *đúng* con số chủ trang chỉ vào (bề rộng
  `.wb-table-scroll` ở `#/s-how` trên cửa sổ ~1440 = 954px hiện ra). Nới nữa thì phải nới
  `--ds-fs` lên >28px, và mỗi bước nới là bớt số dòng thấy được trên một màn hình.
- **Không thu `--ds-side` (330px) để cột rộng thêm.** Cây lộ trình 84 bài là thứ điều hướng
  chính; 330px đã là mức mà tên bài dài phải gói 2 dòng.
- **Không cho code/card tràn ra hai bên như bảng.** Đo lại 2026-08-04: 26/26 bảng có
  `scrollWidth == clientWidth` (bảng của kit là `width:100%`, ô gói dòng chứ không cuộn),
  nên tràn chỉ mua được "ô bớt gói dòng". Cho code tràn theo là mất mép chung mà được rất ít.
- **Không đổi cỡ chữ trong popup / ngăn phụ** (vẫn `--ds-fs: 16px`). Chúng hẹp (549–620px
  hiện ra) nên 16px cho ~80 ký tự/dòng — đúng khoảng. Chữ ở đó nhỏ hơn thân bài nhiều là
  *chủ ý*: nó nói "đây là nhánh phụ".
- **Không đưa luật `vh/vw` thành một CỔNG.** Nó không phải lỗi cấu trúc mà là một con số
  đúng cú pháp sai nghĩa; đặt thành cổng thì phải thêm tên vào `CLAUDE.md` §4 và một ca
  NỔ/IM cho `G-DOC`, mà giá trị y hệt một ca test. Để ở `gate.test.mjs`.
- **Không nhớ trạng thái mở/đóng của dock** (chỉ nhớ *bề rộng*). Mở trang ra mà đã có một
  cái panel chiếm 1/4 màn hình là quyết định hộ người đọc.
- **Không nhóm danh sách ghi chú theo bài** (kiểu tiêu đề bài rồi các ghi chú dưới nó). Đã
  cân nhắc: nó làm mất thứ tự thời gian, mà "hôm nay tôi tắc ở đâu" là câu hay hỏi hơn "bài
  này tôi từng tắc ở đâu". Tên bài trên từng dòng đã đủ để lọc bằng mắt.
- **Không thêm ô tìm trong ghi chú.** Với vài chục dòng thì cuộn nhanh hơn gõ. Thêm khi số
  ghi chú vượt ~50, không thêm trước.
- **Không sửa `.ds-viz__alt`** cho ngắn dòng lại. Nó là mô tả bằng chữ của hình, đọc một
  lần, không đọc theo dòng — 114 ký tự/dòng ở đó là chấp nhận được, và cách duy nhất để
  ngắn hơn là cho nó một mép phải riêng, tức phá luật một-mép.

### Còn nợ của riêng phiên này

- Bảng trong bài giờ **cao hơn** (chữ +55% mà `width:100%` nên ô gói nhiều dòng hơn): một
  bảng ở `s-families` cao 839px. Chưa soát bài nào có bảng dài quá một màn hình.
- `--ds-fs` là `clamp()` nhưng `--ds-measure` vẫn là một số cứng — cột chỉ hẹp lại khi HẾT
  chỗ (dưới ~1287px thật). Hai đường cong không khớp hoàn hảo, nên ký tự/dòng không phẳng
  theo cửa sổ mà đi 47 → 63 → 80 → 84 từ 375px tới 1440px. Vẫn trong khoảng 45–90 ở mọi
  bề rộng đã đo, nên chưa đáng làm `--ds-measure` fluid theo.

## Phiên 2026-08-04 (g) — khổ trang rộng ra, lớp vỏ nói tiếng Việt, sổ học thành dock

Sáu việc, tất cả do chủ trang nêu trong một lượt. Trạng thái cuối: **cổng CHẶN qua · 7
khuyến nghị (6 `G-FWD` là trạng thái ổn định đã soát ở phiên (b), + `G-HANDOFF` mà mục này
đóng lại) · `gate.test.mjs` 44 đạt / 0 trượt.**

### 1. Cột 720 → 860px, chữ 16 → 18px, và **hai token này đi cùng nhau**

Chủ trang: *"content bé quá nên còn nhiều vacuum, cho content rộng ra — main rộng ra và
thẻ `<p>` cũng phải rộng theo"*. Nới cột mà giữ nguyên cỡ chữ là đẩy thẳng số ký tự/dòng
lên, nên phải nới cả hai. Đo thật (chỉ tính **dòng đầy**, bỏ dòng cuối dở):

| cột / chữ | trung vị | cao nhất | |
|---|---|---|---|
| 720 / 16px | 75 | 84 | bản cũ |
| **860 / 18px** | **81** | **86** | chọn cái này |
| 860 / 17px | 83 | 90 | sát trần 90 |
| 900 / 17px | 89 | 93 | vượt |

`--ds-fs` là token thứ năm trong khối `:root`. Kèm theo, **bậc tiêu đề trong bài chuyển
sang `em`**: trước đây `h4` dùng `--wb-text-body` = 14px trong khi thân bài 16px, tức
**tiêu đề nhỏ hơn đoạn văn nó đứng đầu** — lỗi có sẵn, `em` là cách để nó không quay lại.
Bảng và `.wb-help` cũng vậy. `--ds-wide` 900 → 1060 để bảng vẫn tràn được tương ứng.

**Số đo nằm ở ba chỗ** (khối chú thích đầu `<style>`, CLAUDE.md §10, design.md
§0.2) — đã thêm dòng vào `docs/editing.md` để phiên sau không sửa một chỗ rồi bỏ hai.

### 2. Trang tự mở ở 90%

`html { zoom: var(--ds-zoom) }`. Không đổi số ký tự/dòng (zoom co cả bề rộng lẫn cỡ chữ),
chỉ cho thêm ~11% nội dung mỗi màn hình; chữ hiện ra thật 18 × 0,9 ≈ 16,2px = đúng cỡ chữ
cũ. Zoom trình duyệt nhân thêm lên, nên không khoá tay ai.

**Cái bẫy đã đo:** `zoom` KHÔNG điều chỉnh đơn vị viewport — trong `zoom:.9`, một khối
`width:100vw` ra 1152px trên cửa sổ 1280px. Nên `--ds-bleed` phải chia `var(--ds-zoom)`;
không chia thì bảng mất 10% mức tràn. `position: fixed` thì Chrome xử lý đúng (đã kiểm:
popup phủ kín 1269×720 dưới zoom). Media query cũng tính theo `viewport / zoom` — nên
`min-width: 1200px` của dock ứng với ~1080px thật.

### 3. Lớp vỏ nói tiếng Việt

`roadmap` → **lộ trình học** · `workload` → **khối lượng** (cả 6 chỗ trong bài, kèm nêu
tên tiếng Anh **một lần** ở trang chủ để tra được) · chân trang `artifact và acceptance
criteria` → **sản phẩm làm ra và tiêu chí đạt** · `<title>` + `<meta description>`.

Luật + danh sách "chỗ nào là lớp vỏ" + cách tự kiểm: **design.md §0.1**, và một
gạch đầu dòng trong `CLAUDE.md` §11 (vì luật "không đổi cách gọi giữa chừng" nằm ở đó).

### 4. Sổ học là **tầng thứ tư**: dock, không phải lớp phủ

Chủ trang: *"khi đang note thì vẫn phải cho thao tác + đọc được content chính"*. Ba tầng ở
§7 đều là chỗ **đọc** nên đều chặn trang; sổ học là chỗ **viết về** cái đang đọc nên luật
ngược lại. Ba việc để nó thật là dock — `wb-overlay--pass`, **không** `inert`/focus-trap/
`aria-modal`, và thân trang **nhường** đúng `--ds-dock-w`. Đã kiểm bằng
`elementFromPoint(400,300)` → trả về phần tử của trang, không phải lớp phủ.

Hệ quả có chủ ý: sổ học **ra khỏi `LAYER_IDS`**, nên Esc chỉ đóng nó khi không còn popup
nào, bấm ra ngoài không đóng nó, mở popup toán không làm mất sổ đang viết, và **bấm tên
bài trong danh sách "Tất cả" giữ sổ mở** (bản cũ đóng lại, vì lúc đó nó là lớp phủ).
Ngược lại: `openLayer` phải `inert` cả dock, không thì popup "modal" mà vẫn gõ được vào sổ.

### 5. Thiết kế lại panel sổ học cho dễ hiểu

Chủ trang: *"design lại note cho dễ hiểu hơn, sao có thêm 1 tính năng trộn sổ là gì thế"*.

- **Ba khối, mỗi khối một tiêu đề** nói nó để làm gì: GHI CHO BÀI ĐANG MỞ · ĐÃ GHI · ĐƯA
  VÀO REPO. Bản cũ xếp ba nhóm nút thẳng vào nhau, người đọc phải tự đoán nhóm nào việc gì.
- Nhãn **"Đây là"** trước ba nút loại — không có nó thì ba nút không tự nói được rằng
  chúng là ba lựa chọn của **một** câu hỏi.
- **Bỏ nút sao chép** (trùng việc với Tải về) và **bỏ "Trộn vào sổ"**: việc đó giờ là
  *"Khôi phục sổ từ một file đã tải về"* — một dòng chữ bấm được ở cuối, kèm một câu nói
  khi nào cần (xoá bộ nhớ trình duyệt, hoặc sang máy khác). Nó là việc **hiếm**, nên nó
  không được đứng ngang hàng với việc làm mỗi buổi.
- `focus({preventScroll:true})` khi mở: trên 375px, cuộn-tới-tiêu-điểm đẩy luôn tên bài ra
  khỏi tầm nhìn — mở sổ mà không thấy đang ghi cho bài nào.

### 6. `learn.mjs --sync` — hết phải dán tay

Chủ trang: *"khi lưu note không tự động thêm vào LEARNING log mà phải paste tay à"*.

Câu trả lời thẳng: **trang không ghi được vào file trong repo** — file HTML tĩnh, không
server, thường mở từ GitHub Pages nên còn khác origin; File System Access API thì phải cấp
quyền lại mỗi phiên. Nên đường đi *trang → file tải về → repo* là bắt buộc. Việc duy nhất
bỏ được là bắt người dùng tự tìm file và gõ đường dẫn:

- `--sync` quét `~/Downloads` → Desktop → thư mục trang → gốc repo, lấy bản **mới nhất**.
  Idempotent nhờ khoá lọc trùng (đã thử: lần 1 thêm 3, lần 2 thêm 0) nên **không cần** đánh
  dấu "file đã nạp".
- `session.mjs` khi mở phiên tự phát hiện bản xuất **còn dòng chưa nạp** và in đúng một
  lệnh. Đây là thứ không đọc được bằng cách xem repo — file nằm ở `~/Downloads`.
- Panel in thẳng cả hai bước + đúng câu lệnh, `user-select: all` để chép được.
- **Hợp đồng tên file** `learning-log-YYYY-MM-DD.md` giữa `a.download` (HTML) và `PAT_EXPORT`
  (learn.mjs) → có **test riêng**, vì lệch một bên thì không cổng nào nổ, không lỗi nào
  hiện ra, chỉ là `--sync` mãi mãi báo "không thấy bản xuất nào". Test khớp cả bản trùng
  tên của Chrome (`learning-log-… (1).md`).

### 7. Tên file sang tiếng Anh

Chủ trang: *"tên các file phải là tiếng anh hết chứ"*. Ba file docs, và tên file mà trang
tải về:

| cũ | mới | câu nó trả lời |
|---|---|---|
| `docs/sua-trang.md` | **`docs/editing.md`** | đổi cái này thì phải đổi cái gì nữa |
| `docs/viet-de-hieu.md` | **`docs/writing.md`** | giải thích thế nào để người ta hiểu |
| `docs/thiet-ke-trang.md` | **`docs/design.md`** | nó trông thế nào, nằm ở đâu |
| `so-hoc-YYYY-MM-DD.md` | **`learning-log-YYYY-MM-DD.md`** | bản xuất sổ học |

`git mv` (giữ lịch sử) + 79 chỗ trỏ tới ba file docs trong 5 file khác. **`PAT_EXPORT` vẫn
nhận cả tiền tố `so-hoc-`**: một bản xuất còn nằm trong `~/Downloads` từ trước không được
im lặng trở thành vô hình với `--sync`.

Chú ý cho phiên sau: **nội dung file vẫn tiếng Việt** — chỉ tên file là tiếng Anh, cùng lý
do với §0.1 (tên file là chỗ điều hướng, không phải chỗ dạy).

### Đã kiểm bằng mắt và bằng số

| bề rộng thật | cuộn ngang | cột `<p>` | bảng | dock mở |
|---|---|---|---|---|
| 1440 | không | 774 | 954 (đủ trần) | nhường 380, cột 754 |
| 1200 | không | 774 | 845 | nhường 380, cột 514 |
| 1000 | không | 656 | 656 | **đè** (hết chỗ nhường) |
| 375 | không | 339 | 339 | đè, rộng 317 (94vw) |

Cả sáng lẫn tối. Bẫy của pane preview lại dính: **ảnh chụp trả về frame cũ** sau khi đổi
theme — `getComputedStyle(body).backgroundColor` đã là màu sáng mà ảnh vẫn tối, phải cuộn
một cái mới ra frame mới. Đọc giá trị tính toán, đừng tin ảnh.

### Cố ý KHÔNG làm

- **Không nới cột thêm nữa.** 900/17px đã cho trung vị 89 ký tự/dòng, sát trần 90. Chỗ
  trống hai bên còn lại **không phải chỗ để nhồi thêm chữ** — nó là chỗ bảng tràn vào. Muốn
  hẹp khoảng trống đó thì hai cách: thu `--ds-side` (330px), hoặc cho thêm loại khối được
  tràn (viz chẳng hạn). Cả hai đều là quyết định hình thức, không phải lỗi — chưa làm vì
  chưa được nhờ, và cách thứ hai làm yếu luật "một mép phải".
- **Không tự thu thanh bên khi mở dock.** Làm vậy thì cột giữ đúng 860px (không gói lại
  dòng), nhưng chữ **nhảy ngang ~365px** — đổi một cái khó chịu thành một cái khó chịu
  khác, mà cái sau còn bất ngờ hơn vì người dùng không bấm gì vào thanh bên.
- **Không nhớ trạng thái dock trong localStorage.** Chưa có bằng chứng người dùng muốn sổ
  tự mở lại; thêm một khoá storage nữa thì thêm một thứ phải dọn khi "Xoá tiến độ".
- **Không đổi `Fast track 14 ngày`** dù nó là tiếng Anh: đó là **tên một bài** trong `TREE`,
  đổi là kéo theo `DAYS`/`WEEKS`/`TOC.md`/cổng. Nó là thuật ngữ trong nội dung (§11), không
  phải lớp vỏ. Muốn đổi thì làm như một việc riêng, theo `docs/editing.md` việc 2.
- **Không để `session.mjs` tự chạy `--sync`.** Nó được định nghĩa là "chỉ đọc và in"; một
  lệnh mở phiên mà ghi vào file nguồn là phá đúng tính chất làm nó an toàn để chạy mọi lúc.

---

## Phiên 2026-08-04 (f) — quy trình phiên, cổng lúc push, và sổ học

Phiên này xây **7 việc mà phiên (e) đã chốt phạm vi nhưng chưa code**, cộng ba việc chủ
trang thêm giữa phiên. Trạng thái cuối: **cổng CHẶN qua · 6 khuyến nghị (trạng thái ổn
định đã soát ở phiên (b)) · `gate.test.mjs` 41 đạt / 0 trượt · 3/3 lớp hook đã cài.**

### 1. Hai lệnh cho một phiên — `tools/session.mjs`

`node tools/session.mjs` (mở) và `--close` (đóng). **Không phải cổng** — nó không bao giờ
thoát khác 0 vì nội dung, chỉ đọc và in. Đó là lý do nó là file riêng chứ không phải một
cờ của `gate.mjs`: `gate.mjs` có một lý do để đổi (thêm/sửa cổng), quy trình phiên là lý
do khác.

Hai lỗ nó lấp, cả hai đều là lỗ **thật đã dính**, không phải giả định:

- **Mở phiên.** Phiên (e) dính bẫy phiên-song-song **hai lần**: đọc `HANDOFF.md`, phân
  tích, kết luận — rồi phát hiện một phiên khác đã sửa đúng chỗ đó và bản mình đọc là bản
  cũ. `git status` biết điều này ngay từ giây đầu, chỉ là không ai gọi nó. Giờ nó là dòng
  **đầu tiên** của lệnh mở phiên, in đỏ, kèm câu "đọc lại vùng sắp sửa".
- **Đóng phiên.** `CLAUDE.md` §12 bắt ghi HANDOFF *"đã sửa gì, cố ý KHÔNG sửa gì"*. Một
  bắt buộc mà phải tự nhớ và tự gõ lại từ đầu mỗi lần thì trên thực tế sẽ bị bỏ. Giờ nó là
  một khung điền trước, dựng từ `git diff` thật.

Phần đáng giá nhất của `--close` là bảng **"dòng đã đổi thuộc về bài nào"**: `git diff
--stat` chỉ nói *"HTML +776/−…"*, một con số vô nghĩa cho file 13k dòng — nó không cho biết
đã chạm bài NÀO, tức không đủ để viết HANDOFF hay để biết phải đọc lại `PAYOFF` của bài nào.
Bảng đó map dải dòng `@@` sang `TPL` để ra tên bài.

### 2. Lớp tự động thứ ba: `pre-push`, và nó CHẶN

Chủ trang chốt "chặn push nếu cổng trượt". `tools/hooks/pre-push` chạy `gate --ci` +
`audit`, và `gate.test` **chỉ khi `tools/` có đổi** trong khoảng đang đẩy (test mất ~20
giây; chạy nó khi chỉ sửa một câu trong bài là 20 giây không mua được gì).

Vì sao cần lớp thứ ba khi đã có `pre-commit` — bốn lý do cụ thể: push `main` là **deploy
GitHub Pages**, sau bước đó lỗi nằm trên web; `pre-commit` bỏ qua được bằng `--no-verify`
(đúng và nên có); một commit cũ có thể được rebase/cherry-pick vào mà chưa từng qua cổng;
và commit merge **không chạy `pre-commit` chút nào**. `pre-push` kiểm *trạng thái cuối* của
đúng những gì đang được đẩy.

`install-hooks.sh` giờ cài cả ba trong một vòng lặp, và `G-HOOK` kiểm cả ba — không thì
lớp mới cũng tắt âm thầm đúng như hai lớp cũ đã từng tắt.

### 3. `LEARNING-LOG.md` + `tools/learn.mjs` — MỘT file, không hai

Chủ trang hỏi trực tiếp: tách file note riêng, hay gộp vào nhật ký học? **Gộp một file.**
Lý do: một ghi chú và một mức tick đều nói về *cùng một bài*; tách ra thì phải mở hai file
để trả lời một câu (*"bài `d-eda` đang thế nào"*).

Rủi ro của việc gộp là **sinh lại đè mất ghi chú tay**. Cách chống, và đây là điểm thiết kế
quan trọng nhất của file:

- Mục `## Sổ` là **nguồn**, và **chỉ được thêm vào cuối**. Không lệnh nào trong `learn.mjs`
  sửa hay xoá một dòng đã có. Hạ mức cũng là *thêm* một dòng `mức` mới — mức hiện tại của
  một bài là dòng `mức` **mới nhất**, nên lịch sử không bao giờ bị viết lại.
- Khối giữa hai dấu `learn:summary` là **sản phẩm**, sinh lại toàn bộ mỗi lần `--write`. Nó
  là **hàm thuần** của (Sổ + HTML): không có dấu thời gian, nên chạy hai lần ra đúng một
  kết quả và không sinh churn trong git diff.

Sáu loại dòng, và loại quan trọng nhất là **`tac`** (chỗ đọc mà không hiểu). Cổng `G-LEARN`
đọc chúng và báo khi **≥2 bài khác nhau cùng tắc ở một khái niệm** — tín hiệu mà
`concepts.json` không thể tự có, vì nó khai theo *phán đoán của người viết* còn đây là *dữ
liệu từ người học thật*. Đã thử: gõ hai dòng `tac` có chữ "datacard" ở `d-eda` và `d-clean`
thì cổng chỉ đúng ra `datacard` (dạy ở `d-data`).

### 4. Giao diện Sổ học trên trang — và vòng khép kín với repo

Nút **Sổ học** ở thanh trên, phím `n`. Thêm / sửa / xoá ghi chú, gắn tự động vào bài đang
mở, chọn loại (Ghi chú / Chỗ tắc / Đã gỡ), lọc "Bài này / Tất cả".

**Là DRAWER, không popup** — và đây là ngoại lệ hợp lệ theo `CLAUDE.md` §7, không phải vi
phạm: viết một câu về đoạn vừa đọc thì phải còn thấy đoạn đó phía sau. Popup giữa màn hình
che mất chính thứ đang được ghi chú, tức bắt người ta giữ ý trong đầu — đúng việc mà cái sổ
tồn tại để khỏi phải làm.

Nối với repo bằng **đúng một định dạng văn bản**: bản xuất của trang *là* mục `## Sổ` của
`LEARNING-LOG.md`. Đã kiểm vòng khép kín thật trên trình duyệt:

- xuất từ trang → `learn.mjs --import` → **import lần 2 và 3 thêm 0 dòng** (lọc trùng đúng)
- xoá sạch bộ nhớ trình duyệt → nạp lại từ nội dung file → **ghi chú về đủ, và mức đã tick
  cũng về đủ**, ghi chú nhiều dòng không bị vỡ
- `notesExport()` sau vòng đó **bằng đúng từng byte** với nội dung đã nạp vào

Hai chỗ phải cẩn thận, đã sửa sau khi test bắt được:

- **Dòng tiếp của ghi chú nhiều dòng phải thụt 2 dấu cách khi ghi ra file.** Không thụt thì
  lần đọc sau `parseLog` không nối nó vào dòng trên — và hệ quả không chỉ là hiển thị: khoá
  lọc trùng tính trên cả nội dung, nên mỗi lần import lại thêm một bản.
- **Ngày đạt mức phải được LƯU, không phải "hôm nay"**. Thêm key riêng
  `ds-roadmap-progress-ts-v1` thay vì đổi schema `v3` — mất key này thì chỉ mất ngày, tiến
  độ vẫn nguyên. Không lưu ngày thì mỗi lần xuất là một dòng mới cho cùng một việc.

`N_RE_ENTRY`/`N_RE_GROUP` trong HTML là **bản thứ hai** của ngữ pháp trong `learn.mjs`.
Trang không có build nên không import được `.mjs`; bù lại ngữ pháp được giữ **bé đến mức
hai bản không thể lệch** — một regex nhóm, một regex dòng, hết. Đã ghi vào bảng lan truyền
của `editing.md`.

### 5. `docs/design.md` — file thứ tư, chủ trang yêu cầu giữa phiên

Ba file docs cũ trả lời ba câu; **"nó trông thế nào, nằm ở đâu"** thì không file nào trả
lời — luật hình thức đang nằm rải trong `CLAUDE.md` §7 (phân tầng) và §10 (khổ chữ), còn
"dùng component nào, icon hay chữ" thì không ở đâu cả. File mới gom phần đó.

**KHÔNG dời §7 và §10 ra khỏi `CLAUDE.md`** — chúng là luật cứng, và `CLAUDE.md` là file
chắc chắn được đọc (cùng lý do phiên (e) đã bỏ ý định dời ba cái bẫy CSS ra khỏi §10). File
mới *bổ sung cách áp dụng*, và cả hai bên trỏ nhau.

### 6. Hai lỗi THẬT tìm được trong lúc làm, không phải việc được nhờ

- **`wb-btn--solid` không tồn tại trong kit.** Code bật class đó để đánh dấu "đang chọn" ở
  bộ nút mức cuối mỗi bài (`syncLessonControl`), nên trạng thái đó chỉ còn một vòng inset
  gần như vô hình trên nền tối. Nút không sai, CSS không báo lỗi — **không ai thấy mình đã
  bấm gì**. Đã định nghĩa hẳn hai trạng thái cho `.ds-lvlbtn` (chưa chọn = viền, đang chọn
  = đặc) và bỏ class ma. Sửa một chỗ, đúng cho cả bộ nút mức lẫn hai bộ nút mới trong sổ.
- **`--wb-bg` không tồn tại** (đúng tên là `--wb-canvas` / `--wb-surface`). Tôi tự gõ sai
  khi viết CSS mới; CSS **im lặng bỏ qua** dòng đó nên nút "đang chọn" ra chữ cùng màu nền.
  Đã ghi cả hai vào bảng "ba token thường bị gõ sai" của `design.md`, kèm cách tự
  kiểm trong 5 giây (`grep -c -- "--wb-canvas" ...`).

### 7. Nút "Chép" → icon

Chủ trang: *"chép để copy code vô nghĩa quá, để icon đi"*. Đúng: nút đó ở **175** khối code,
nên nhãn chữ là 175 lần nhắc một việc mà biểu tượng hai-tờ-giấy đã nói xong, ngay cạnh đúng
thứ người đọc cần đọc. Nay chỉ `content_copy`, và **đổi hẳn icon sang `check`** khi xong —
không chỉ đổi màu, để người không phân biệt được màu vẫn thấy phản hồi. Nhánh thất bại ra
`priority_high` + hướng dẫn, **không** ra dấu ✓ (lúc đó nội dung chưa nằm trong clipboard,
một cái ✓ ở đây là nói dối). Hai câu trong bài gọi tên "nút **Chép**" đã sửa theo.

Luật rút ra, ghi vào `design.md` §5: **hành động lặp lại mà ngữ cảnh đã nói rõ →
chỉ icon; một tính năng cần được phát hiện → icon kèm nhãn.** Nên nút **Sổ học** giữ nhãn.

### 8. `LEARNING-LOG.md` không lên web

Đã thêm `--exclude` vào `.github/workflows/deploy.yml`. Chủ trang chưa trả lời câu này nên
tôi làm theo khuyến nghị đã nêu ở phiên (e), vì đây là hướng **ít hối tiếc hơn**: bỏ
`--exclude` đi là một dòng, còn rút một trang đã bị Google index về thì không. Repo vẫn
public nên file vẫn thấy được trên GitHub — `--exclude` chỉ giữ nó khỏi *website*. Muốn kín
hơn thì chuyển vào `stuff/` (đã bị loại sẵn).

### Cố ý KHÔNG làm trong phiên này

- **Không thêm "focus mode" / "reading progress bar" / "done-tick"** dù skill giao diện
  khuyến nghị bộ đó cho trang học. Ba thứ đầu **trang đã có** (thanh tiến độ, `%` ở thanh
  trên, ba mức tick theo bài, thời lượng từng bài). Còn focus mode thì **vô nghĩa ở đây**:
  router dựng đúng MỘT bài mỗi lần, nên không có "phần khác đang tranh sự chú ý" để làm mờ.
  Thêm vào là thêm một nút không làm gì.
- **Không đổi `CLAUDE.md` §7 và §10 sang file khác** — xem mục 5.
- **Không đụng nội dung bài nào.** Hai dòng duy nhất chạm thân bài là hai câu gọi tên nút
  Chép (`home`, `s-how`). Các bài `ml-metrics`/`pr-cost`/`ml-imb`… trong `git diff` là của
  **phiên (d)**, không phải của phiên này — nếu commit thì cân nhắc tách hai nhóm.
- **Không sửa 6 khuyến nghị `G-FWD`** — trạng thái ổn định đã soát ở phiên (b). Đừng nhồi
  `allowEarly`.
- **Không thêm dependency nào.** `learn.mjs` và `session.mjs` chỉ dùng `node:*`.

### Còn nợ của riêng phiên này

- **`G-HANDOFF` không phân biệt được "HANDOFF đã ghi" với "HANDOFF chỉ được chạm".** Nó chỉ
  biết file có nằm trong lần đổi hay không. Sửa được bằng cách đòi có mục `## Phiên <ngày>`
  mới, nhưng như vậy là bắt agent theo một khuôn cứng hơn mức cần — để nguyên, và biết rằng
  cổng này chỉ chặn được sự **quên hẳn**.
- **`gate.test.mjs` giờ mất ~25 giây** (41 ca, mỗi ca một tiến trình con). Vẫn chấp nhận
  được, nhưng nó đã là thứ đắt nhất trong bộ — đừng nhồi thêm ca mà không nghĩ tới thời gian.
  Đây cũng là lý do `pre-push` chỉ chạy nó khi `tools/` đổi.
- **Sổ học chưa có cách xuất chỉ MỘT bài.** Bản xuất luôn là cả sổ. Với sổ vài trăm dòng thì
  vẫn ổn (lọc trùng lo phần còn lại), nhưng nếu sổ to lên thì đây là chỗ đầu tiên thấy chật.
- `.claude/launch.json` vẫn không theo repo về máy mới (`.claude/` bị gitignore) — nợ cũ từ
  phiên (e), ưu tiên thấp.

---

## Phiên 2026-08-04 (b) — áp dụng phần nội dung mà phiên (a) chỉ chẩn đoán

Phiên trước dựng bộ cổng và ghi lại các lỗi nội dung mà nó tìm ra, **nhưng không sửa**.
Phiên này sửa. Trạng thái cuối: **0 waiver · cổng CHẶN qua hết · `auditPlan()` = `[]` ·
khuyến nghị 16 → 6.**

### 1. `ml-metrics` dời từ vị trí 43 lên 38 — xoá cả hai waiver

Lỗi: tiêu chí đạt của `ml-linear` (thứ 37) bắt "in PR-AUC validation" trong khi
`ml-metrics` dạy PR-AUC ở thứ 43; deliverable tuần 3 cũng đòi PR-AUC mà bài dạy nó ở
tuần 4.

Đã làm — và chỗ quan trọng nhất **không phải** việc dời bài:

- `ml-metrics` giờ đứng ngay sau `ml-linear` trong `TREE` và trong thứ tự `<template>`.
- **Ranh giới tiêu chí đạt được đặt lại cho đúng bài dạy nó.** `ml-linear` chỉ còn phải
  sinh ra `y_prob` validation; `ml-metrics` mới là bài biến `y_prob` thành một con số.
  Đây mới là cách sửa gốc — chỉ dời bài thôi thì vẫn còn một bài đòi khái niệm của bài
  liền sau nó, và thêm `ml-linear` vào `allowEarly` chỉ là waiver đổi chỗ.
- `ml-imb` §1–2 đổi từ tham chiếu tiến ("chi tiết ở bài Đo lường") thành trỏ về.
- Sửa luôn một lỗi thật trong code `ml-linear`: nó `predict_proba(X_test)` trong khi cả
  bài nói phải dùng validation.
- Lịch: ngày 6 nhận `ml-metrics`, `f-what` sang ngày 7, ngày 9 còn overfit/CV/lệch (3,5 h —
  ngày nhẹ có chủ ý, note của ngày nói rõ vì sao). Tuần 3 nhận `ml-metrics`.
- `waivers.json` giờ là `[]`.

### 2. `pr-data` → `d-data`, chuyển từ chặng 8 sang chặng 3

Bài định nghĩa schema chuẩn + `datacard` + adapter, mà tuần 2 đã phải làm EDA trên chính
dữ liệu đó (`ACCEPT[d-eda]` tham chiếu `datacard`). Nặng hơn: **lịch 14 ngày xếp nó ngày 6
còn lịch 8 tuần xếp tuần 7** — hai lịch nói khác nhau về cùng một bài.

Đã dời cả bài (không tách nửa) vì soát lại thì **không mục nào trong nó thuộc tuần 7**:
schema, adapter, `prepare_data`, bộ mô phỏng, tải dữ liệu — tất cả đều phải xong trước EDA.
Đổi id `pr-data` → `d-data` để giữ quy ước tiền tố-theo-chặng mà `TOC.md` dựa vào. Thêm
`ACCEPT[d-data]`. `datacard.allowEarly` trong `concepts.json` giờ rỗng lại.

### 3. `pr-eval`: thêm hai artifact mà cả trang đang giả định là đã có

- **Mục 4 · `src/rules.py` — baseline theo luật.** `th-defense` đưa mẫu trả lời "luật hiện
  tại bắt 31%, mô hình bắt 64%" nhưng không bài nào tạo ra con số đó. Nay có: 3–5 luật viết
  trước khi xem kết quả, chấm trên **đúng cùng tập test**, so bằng `paired_ci` trên hiệu chi
  phí. Kèm điểm mà bài này tồn tại để dạy: **luật không có xác suất nên không so được bằng
  PR-AUC** — phải so tại điểm vận hành, và cột "số cảnh báo" là cột hay bị bỏ.
- **Mục 7 · công bằng theo nhóm.** `th-defense` nhóm E và `th-write` đều giả định đã đo FPR
  theo nhóm. Nay có `group_report()`, bảng FPR/precision theo nhóm tại ngưỡng đã chọn, tỉ lệ
  cao nhất/thấp nhất, ba việc phải làm với con số đó, và một hộp nói rõ **đây là kiểm kê mô
  tả chứ không phải can thiệp công bằng**.
- Hai `ACCEPT` mới; `pr-eval` r35/x30/d45 → r45/x40/d50.
- `th-defense` và `th-write` giờ trỏ ngược về đúng mục sinh ra con số, kèm câu "chưa có nó
  thì đây là câu bạn không trả lời được".

### 4. Phân tầng: 252 + ~170 dòng rời khỏi mạch chính

| chỗ | đi đâu | vì sao |
|---|---|---|
| 4 file test đầy đủ trong `pr-eval` (252 dòng) | popup `testsuite` | mạch chính giữ **bảng bốn lỗi im lặng → test chặn nó** (đúng 4 dòng tiêu chí đạt) + 2 test đáng gõ tay + output `pytest -q` |
| bộ 24 câu hội đồng trong `th-defense` (57 dòng) | **ngăn phải** `qbank` | ca drawer thật: đọc song song với dàn ý 12 slide |
| app Streamlit trong `pr-serve` (29 dòng) | popup `streamlit` | UI thứ hai; mạch chính giữ lý do dùng + ràng buộc "đọc ngưỡng từ artifact" |
| bảng 10 khả năng Colab | popup `colab10` | bài tự nói chỉ 3 cái quan trọng |
| bảng so 4 bộ dữ liệu + lý do loại ULB | ngăn phải `cmp-data` | so sánh dữ liệu = ca drawer theo CLAUDE.md §7 |
| PaySim & đồ án cũ | popup `paysim` | bài tự nói "đáng trả lời riêng" |

Bốn tiêu đề tự tố giác đã sửa tận gốc thay vì dời: `m-infer` "Thứ bạn có thể bỏ qua" →
"Phạm vi của bài này — và một ngoại lệ bắt buộc" (ngoại lệ power analysis là yêu cầu cứng,
nó thuộc mạch chính); `f-store` "Vì sao bạn chưa cần" → "Bốn điều kiện để nó có ích";
`ml-trees` "XGBoost hay LightGBM?" → "Chọn LightGBM, và đừng đi so thư viện".

### 5. `s-plan14` — sửa lỗi cấu trúc, không sửa từng câu

Người đọc đến để hỏi "14 ngày làm gì" nhưng gặp **ba hộp cảnh báo full-width trước khi
thấy lịch**, và ba hộp đó cùng một sức nặng thị giác nên không có thứ bậc. Đảo lại:
mở đầu → **một** hộp nêu mốc ngày 6 (xương sống của cả lịch) → lịch → hình → hai hộp phạm
vi. Ghi chú "số giờ tính từ đâu" chuyển xuống **sau** lịch, và bỏ con số gõ tay khỏi nó.
Bỏ đoạn trùng nguyên văn giữa hộp cảnh báo và note của ngày 6.

### 6. `m-bayes` và `pr-cost` → `core`

Trang tự mâu thuẫn: `m-bayes` là tiền đề của một tiêu chí đạt trong `ml-metrics`, `pr-cost`
được trang gọi là bài có tỉ lệ giá trị/công sức cao nhất — cả hai không thể là "nên biết".
Thêm `ACCEPT[m-bayes]` (tính bằng tay precision ở prevalence 0,17%).

### 7. Cổng: hai thay đổi, cả hai để khuyến nghị về được 0

- `G-VIZ` **báo sai** `s-plan8w`: bài có bảng, nhưng do JS dựng nên nguồn chỉ có `<div>`
  rỗng. Đã tính cả các hộp `<div id="plan…">`. Một khuyến nghị báo sai kéo cả danh sách
  xuống thành tiếng ồn.
- Thêm thoát cửa `<!-- gate:long: lý do -->`. `G-LAYER` cảnh báo bài > 200 dòng, nhưng có
  bài dài vì catalogue lọt lên mạch chính (phải sửa) và có bài dài vì nó **thật sự** là sáu
  file nguồn phải gõ (`pr-code`). Không có cách ghi nhận "đã soát, dài là đúng" thì bốn
  khuyến nghị đó ở lại mãi. Đã ghi lý do cụ thể cho `pr-code`, `pr-eval`, `pr-serve`,
  `d-data`. Đã thử cả hai chiều: bỏ thẻ → khuyến nghị quay lại; làm hỏng một `data-aside`
  trong bài có `gate:long` → `G-REF` + `G-ORPHAN` vẫn nổ (thoát cửa không làm cổng mù).
- `m-vector` là bài duy nhất `G-VIZ` bắt đúng. Đã thêm bảng bốn shape + một khối code
  **in ra lỗi shape thật** kèm cách đọc nó — đúng thứ bài tự nói là mục tiêu ("đọc được
  lỗi"), không phải hình trang trí.

### 8. Sửa một chỗ HANDOFF phiên trước ghi sai

Phiên (a) ghi *"`m-infer` (100′) và `th-stats` (85′) dạy trùng, `pr-eval` viết code lần thứ
ba"*. **Soát lại thì không đúng.** Cả hai đã trỏ vào cùng popup `ci`; `m-infer` dạy *vì sao*
so ghép cặp (không có code), `th-stats` cho *quy trình* nhiều seed + một khối code, `pr-eval`
cho *hàm dùng được* (`bootstrap_ci`/`paired_ci`). Đó chính là cách chia khái niệm → quy
trình → hiện thực mà phiên trước muốn, và nó **đã đúng sẵn**. Chỗ trùng thật chỉ là hai mẫu
câu viết — mức trùng chấp nhận được. **Không sửa, và đây là kết luận cuối, đừng làm lại.**

---

## Phiên 2026-08-04 (c) — khổ chữ đoạn intro (phiên UI song song)

> **Đã bị phiên (d) thay thế một phần.** Kết luận "chủ trang đã chốt 720px" vẫn đúng cho
> *khổ chữ*, nhưng mô hình "hai mép" thì không còn: (d) thu **cột** về bằng khổ chữ nên
> cả trang chỉ còn MỘT mép. Đọc mục 1 phiên (d) trước khi động vào layout.

Chỉ một sửa, đã commit `effabda` + push. Không đụng nội dung của (b).

**Đoạn mô tả `.wb-page-head` + lede trang chủ bị kẹt ~586–600px** trong khi phần còn lại
đã ở 720px — đúng lỗi "có text full, có text không" chủ trang báo. Gốc: hai token khổ chữ
CỦA KIT — `--wb-measure` (68ch) và `--wb-measure-tight` (62ch, cho phần mô tả hero) — vẫn
là đơn vị `ch` co theo font, đúng thứ raggedness mà (a) đã bỏ cho các class `ds-*` nhưng
nó lọt lại qua shell. Alias CẢ HAI về `--ds-measure` trên `#main` → mọi dòng chữ (kể cả
text do kit quản) dùng chung mép 720px. Không thêm `max-width` cứng nên `G-MEASURE` vẫn
sạch. Verify DOM: intro 586→720px, 0 đoạn nào còn bị chặn dưới 720 ở cả trang chủ lẫn bài.

**Chủ trang đã chốt 720px** (không nới tới 940px): 940px ≈ 137 ký tự/dòng hại việc đọc —
khớp comment "ĐỪNG nới --ds-measure" sẵn có. Đây là kết luận cuối cho khổ chữ, đừng làm lại.

---

## Phiên 2026-08-04 (d) — khổ trang về MỘT mép, và trả xong nợ "hai hệ số liệu"

### 1. Khổ trang: một mép, bốn token, không media query

Chủ trang báo "tất cả thẻ `p` đều hẹp hơn cột" và hỏi có phải đang hardcode không.
**Không có hardcode** — cả trang chỉ có một con số. Nhưng câu hỏi thật nằm dưới đó: cột
900px mà chữ 720px thì mọi đoạn văn chừa 180px trống bên phải trong khi bảng/code chạm
mép, và khoảng so le đó đọc ra "layout hỏng". Đã đưa chủ trang ba phương án kèm số đo,
chủ trang chọn **C: thu cột về bằng khổ chữ**.

Kết quả: `p` chạm đúng mép cột, mà **không** phải nới khổ chữ (đo thật: 720px → 62–90
ký tự/dòng, trung vị 77; 900px → 80–119, đã vượt khoảng dễ đọc).

- Bốn token gom về **một khối `:root`**; `--wb-container-max`, hai alias khổ chữ của kit,
  và `--ds-bleed` đều suy ra bằng `calc()`. **Nới trang = sửa `--ds-measure`, chỉ nó.**
- Bỏ được hai chỗ ghi `720px` rời (`.ds-prose`, fallback của `.ds-obj`).
- **Chỉ bảng được tràn**, và lý do là số đo chứ không phải cảm tính: bảng rộng tự nhiên
  trung vị 844px (106/155 vượt 720px), code chỉ 587px (12/175 vượt) — cho code tràn theo
  thì mất mép chung mà được rất ít.
- `--ds-bleed` dùng `clamp()` trên `100vw`, **không media query**. Đo thật: 1440→bảng
  900px · 1280→886px · 1100→719px · 834→720px · mobile 375→335px, **cuộn ngang = 0 ở
  mọi bề rộng**. Quét cả 85 node: mọi loại phần tử đúng 720px, chỉ `.wb-table-scroll`
  là 900px. Drawer/popup có `--ds-bleed: 0px` nên không rò cơ chế tràn.

Ba cái bẫy đã dính đủ cả ba, đã ghi vào CLAUDE.md §10 để phiên sau khỏi dính lại: kit đặt
`.wb-table-scroll { width: 100% }` nên phải ép `width: auto`; rule tràn phải là con trực
tiếp `>` **và** phải đứng sau `.ds-prose .wb-table-scroll { margin: 0 0 16px }` (shorthand
`margin` xoá `margin-inline`); drawer/popup phải tắt bleed.

**Đây là kết luận cuối cho khổ chữ.** 720px đã đo, không nới lên 900px.

### 2. Hai hệ số liệu — đã nối, không đồng bộ hoá

Việc mục "Còn nợ thật" gọi là đáng làm nhất. Kiểm kê toàn trang bằng script map
dòng→node: **11 bài dùng số minh hoạ** (`ml-metrics`, `ml-imb`, `ml-linear`, `ml-cv`,
`f-cyclic`, `m-infer`, `t-stack`, `pr-cost`, `th-design`, `th-stats`, `th-write`) và
**3 bài dùng số chạy thật** (`pr-code`, `pr-eval`, `pr-serve`).

**Không đổi con số nào.** Soát lại thì cả hai hệ đều đúng trong ngữ cảnh của nó: 0,412 ở
tỉ lệ nền 0,17% là hoàn toàn đạt được trên dữ liệu thẻ thật, còn 0,0485 là sát trần lý
thuyết 0,05–0,07 của bộ mô phỏng. Ép chúng về một hệ sẽ hoặc bịa số, hoặc giết ví dụ dạy
học (chênh lệch 0,0294→0,0485 quá nhỏ để tập đọc).

Chỗ hỏng thật **không phải** việc hai hệ tồn tại song song, mà là `ml-metrics` hứa rằng
đó là số của người học: *"Ba dòng còn lại điền dần… dòng luật thủ công ở bài `pr-eval`"*.
Người học nhắm 0,412 rồi chạy ra 0,0485 sẽ tưởng mình làm hỏng. Đã sửa bằng cách nối hai
thứ trang **đã có sẵn** mà chưa nối: `ml-metrics` dạy "đường cơ sở PR-AUC = tỉ lệ dương",
`pr-code` đã đo trần lý thuyết.

- `ml-metrics` — hộp gỡ hiểu nhầm ngay dưới bảng đích: nêu tên hai hệ, báo trước số của
  bạn sẽ là 0,03–0,05, và rút thành một luật dùng được trong luận văn (*PR-AUC trần trụi
  không nói lên điều gì — luôn kèm tỉ lệ nền, biết thì kèm cả trần*).
- `pr-eval` — bullet đầu mục "Đọc bảng đó" kẹp 0,0485 giữa hai mốc: gấp ~21 lần tỉ lệ nền
  0,00228, và sát trần 0,05–0,07. Nói luôn recall 21,8% không phải "kém hơn 64%".
- `pr-cost` — bảng của nó dùng hệ minh hoạ trong khi `pr-eval` cùng chặng dùng hệ thật;
  thêm câu dẫn **trước** bảng (disclaimer cũ nằm cuối bài, đọc xong mới biết) và trỏ sang
  bảng thật.
- `th-design`, `th-stats`, `ml-imb` — nhãn "số minh hoạ" một câu, kèm điều đáng nhớ là
  *thứ tự và khoảng cách giữa các dòng*, không phải giá trị tuyệt đối.

Từ vựng thống nhất cả trang: **"số minh hoạ"** ↔ **"số chạy thật trên bộ mô phỏng"**.

### Cố ý KHÔNG làm trong phiên này

- **Hai quyết định giáo trình** (dời chặng 7, `t-stack` → chặng 10) vẫn để nguyên cho chủ
  trang — chúng đổi hình dạng giáo trình, không phải việc của agent. Khuyến nghị ở bảng
  dưới không đổi.
- **Không đụng `m-infer` / `th-stats` / `pr-eval`** theo kết luận mục 8 phiên (b).

---

## Phiên 2026-08-04 (e) — bật lại automation, và đưa auditPlan ra khỏi trình duyệt

Phiên này **không sửa một chữ nội dung bài nào**. Toàn bộ là tài liệu + bộ cổng.

### 1. Phát hiện lớn nhất: hai lớp hook đang TẮT

`.git/hooks/` chỉ có file `.sample`, và gốc repo **không có** `.claude/settings.json`. Nghĩa
là `install-hooks.sh` chưa từng chạy trên máy này: mọi thứ §3 của CLAUDE.md mô tả — chạy cổng
ngay sau mỗi Edit, chặn commit — đều **không hoạt động**. Hai commit gần nhất lẽ ra phải đi
qua `pre-commit`; chúng không đi qua.

Điều đáng lo không phải việc quên cài, mà là **không có gì tự phát hiện ra**. Đã sửa gốc:
thêm cổng `G-HOOK`, nó kiểm và nhắc mỗi lần chạy. Đã cài hook và thử cả hai chiều.

### 2. `auditPlan()` giờ chạy bằng node — cổng bắt buộc hết là bước thủ công

Cổng này bắt buộc (§12 bước 2) nhưng tốn sáu bước tay, nên trên thực tế nó bị bỏ. Đã tách:

| file mới | việc |
|---|---|
| `tools/read-html.mjs` | luật đọc dữ liệu ra khỏi HTML — **một** bản, dùng chung |
| `tools/plan.mjs` | luật kiểm lịch học (port của `auditPlan`) |
| `tools/audit.mjs` | chạy riêng cho người đọc |

`gate.mjs` gọi `plan.mjs` như cổng **`G-PLAN`** (chặn). Refactor phần đọc HTML sang module
dùng chung đã kiểm là **không đổi hành vi**: output `--advice` giống hệt từng ký tự.

Đối chiếu chéo: `node tools/audit.mjs` trả rỗng, và `auditPlan()` gõ trong trình duyệt thật
cũng trả `[]`. Hai đường độc lập cho cùng kết quả.

Phần duy nhất từng cần DOM là "id trùng" — làm bằng cách đọc thuộc tính `id` trong vùng HTML
và **bỏ hẳn `<script>`/`<style>`** ra khỏi phạm vi quét. Không bỏ thì quét cả file sẽ nhặt
`id="…"` trong chuỗi JS và báo sai, mà đây là cổng chặn nên báo sai là tai hoạ.

### 3. Bốn cổng mới, và test cho chính bộ cổng

- **`G-PLAN`** (chặn) — mục 2.
- **`G-NEXT`** (nhắc) — tài liệu ghi **ba lần** rằng "câu *bài sau…* trong `PAYOFF[id][1]`
  trỏ sai thì không cổng nào bắt được, phải tự nhớ". Máy không đọc được nội dung câu, nhưng
  đọc được **điều kiện** làm nó sai: bài đứng sau đã đổi. `TOC.md` trên đĩa còn giữ thứ tự
  cũ, nên chỉ cần so hai thứ tự là nêu được đúng tên những bài cần đọc lại. Không cần thêm
  file trạng thái nào.
- **`G-HOOK`** (nhắc) — mục 1.
- **`G-DOC`** (nhắc) — đối chiếu mảng `GATES` trong code với `CLAUDE.md`. Nó **bắt được ngay
  một lỗi thật đang tồn tại**: `G-DUMP` có trong code và trong tài liệu nội dung, nhưng bảng
  cổng ở §4 không có tên nó. Cùng lúc đó §4 cũng thiếu `G-TOC-STALE`. Đã sửa cả hai.

`tools/gate.test.mjs` — **33 ca, 17/17 cổng có cả ca NỔ và ca IM**, chạy trên bản sao trong
thư mục tạm, không bao giờ chạm file thật. Lý do cần: `G-VIZ` đã từng báo sai và chỉ mắt
người phát hiện.

### 4. Bổ sung case còn thiếu trong danh sách lan truyền: **CHẶNG**

Soi lại toàn bộ khối dữ liệu trong `<script>` và đối chiếu với checklist cũ. Kết quả: phần
đánh theo **bài** đã đủ. Nhưng **không có case nào cho chặng** — mà đó đúng là việc đang treo
("dời chặng 7 xuống sau chặng 8", "`t-stack` sang chặng 10").

Dời một chặng đắt hơn tưởng, vì **số hiệu chặng nằm trong chính tiêu đề** (`t:'7 · …'`), nên
dời chặng 7 xuống sau chặng 8 thì phải đánh số lại cả hai. Đã ghi thành checklist riêng, kèm
kết luận: **giữ nguyên `id` chặng** (`p7` vẫn là `p7`) thì `PHASE_OUTCOME` và `COMP_PHASE`
không phải sửa, vì chúng đánh theo `id` chứ không theo vị trí.

Cũng đã ghi rõ hai thứ mà checklist cũ không nói: **dời bài sang chặng khác phải đổi id theo
tiền tố chặng** (`pr-data` → `d-data`, đúng việc phiên (b) đã phải làm), và **danh sách khối
KHÔNG phải sửa** (`PRIO`, `SCOPE_LABEL`, `ACC_META`, `PF_TAG`, `SYN`, `VIZ`) — biết cái gì
không phải sửa cũng tiết kiệm thời gian bằng biết cái gì phải sửa.

### 5. Hai file docs: đổi tên và viết lại cho dễ hiểu

Chủ trang nói đọc `authoring.md` không hiểu tên file nghĩa là gì, và câu mở đầu *"Công thức
nấu ăn"* thì không hiểu là cái gì luôn.

| cũ | mới | vì sao |
|---|---|---|
| `docs/authoring.md` | `docs/editing.md` | "authoring" là từ nghề; dịch ra "soạn thảo" cũng không rõ hơn |
| `docs/content-gates.md` | `docs/writing.md` | "cổng nội dung" nghe như một cơ chế máy, mà nó là danh sách tự soi cho người |

Cả hai viết lại: bỏ ví von phải giải mã ("công thức nấu ăn", "wire vào đâu", "rubric",
"thoát cửa", "Diátaxis", "concreteness fading"), câu ngắn hơn, và **`editing.md` được xếp
lại quanh câu hỏi thật của người dùng: "tôi vừa đổi cái này, còn phải đổi gì nữa"** — bảng đó
giờ nằm ngay đầu file thay vì rải trong sáu mục.

### 6. Lối vào cho agent, ở `README.md` gốc repo

Dòng `masters-degree/` trong README gốc chỉ có bảy chữ và **không nhắc `data-science-roadmap`
một lần nào** — trong khi dòng `cashy/` ngay trên đó đã có sẵn khuôn *"Có `CLAUDE.md` +
`docs/` riêng, đọc từ đó"*. Hệ quả: một agent khởi động ở gốc repo không có cách nào biết
`gate.mjs` tồn tại, và sẽ mở file HTML 0,9 MB — đúng việc §0 viết cả một mục để ngăn. Đã thêm
một dòng theo đúng khuôn của `cashy`.

### Cố ý KHÔNG làm trong phiên này

- **Không dời ba cái bẫy CSS ra khỏi CLAUDE.md §10.** Lúc review có đề xuất dời chúng sang
  `editing.md` cho đúng bảng phân vai ở §2 (§10 đang là mục dài nhất, 48 dòng). **Bỏ ý
  đó:** phiên (d) đặt chúng vào CLAUDE.md *có chủ ý* sau khi dính cả ba, và CLAUDE.md là file
  chắc chắn được đọc. Đổi lấy sự gọn gàng mà mất một cái phanh thật thì không đáng.
  `editing.md` chỉ trỏ sang §10.
- **Không đổi tên `CLAUDE.md` / `HANDOFF.md` / `TOC.md`** — chúng là quy ước công cụ đọc.
- **Không đụng nội dung bài nào**, kể cả 6 khuyến nghị `G-FWD` (trạng thái ổn định đã soát ở
  phiên (b) — đừng nhồi `allowEarly`).
- **Hai quyết định giáo trình vẫn treo** cho chủ trang: dời chặng 7, `t-stack` → chặng 10.
  Giờ đã có checklist ở `editing.md` việc 3 để làm, nhưng *có nên làm hay không* vẫn không
  phải việc của agent.
- **Không thêm dependency nào.** `plan.mjs` viết để không cần jsdom: mọi thứ `auditPlan` kiểm
  đều nằm trong dữ liệu, nên không cần dựng DOM. Node ở máy này là v16.20.2 (có v26 ở
  homebrew) — code giữ trong phạm vi v16 chạy được.

### Còn nợ của riêng phiên này

- `.claude/` bị `.gitignore` nên `launch.json` **vẫn không theo repo về máy mới**. Đã sửa
  nội dung cho khỏi mục (serve thẳng từ repo, `autoPort`), nhưng muốn nó theo repo thì phải
  đưa vào `tools/hooks/` và cho `install-hooks.sh` cài — cùng khuôn với `claude-settings.json`.
  Chưa làm, ưu tiên thấp.
- `gate.test.mjs` chạy `gate.mjs` bằng cách gọi tiến trình con, mỗi ca một lần, nên mất ~20
  giây cho cả bộ. Chấp nhận được, nhưng đừng nhồi thêm nhiều ca mà không nghĩ tới thời gian.

---

## CHƯA LÀM — và vì sao

### Quyết định giáo trình, không phải lỗi: cần chủ trang chọn

Bốn việc dưới đây phiên (a) ghi là "cân nhắc". Chúng **đổi hình dạng giáo trình**, nên theo
đúng tinh thần CLAUDE.md §6 (thêm/xoá bài phải soi lại triết lý) chúng là quyết định của
chủ trang, không phải của agent. Khuyến nghị kèm theo:

| việc | khuyến nghị | lý do |
|---|---|---|
| Dời chặng 7 xuống sau chặng 8 | **nên làm** | 975 phút, lớn nhất trang, 0 bài trong fast track, mà nó nằm chắn giữa DL và hai chặng mà trang tồn tại vì chúng |
| `t-stack` → chặng 10 (tra cứu) | **nên làm** | nó là sổ tra (r60/x0/d0), không phải bài học; đặt ở chặng 1 làm tuần 1 dài ra vô ích |
| Cắt `f-store` | **không nên** | sau khi sửa tiêu đề thì nội dung thật của nó là *một câu trả lời cho hội đồng* + point-in-time correctness. Giữ, nó đang là `skim` 30′ |
| `q-analytics` off-goal | **giữ** | nó là bài duy nhất vạch ranh giới analytics / predictive / causal, và đó là câu hội đồng hay hỏi |

### Còn nợ thật

- ~~**Hai hệ số liệu song song.**~~ **Xong ở phiên (d)** — đã rà toàn trang, nối bằng
  nhãn thống nhất + hộp gỡ hiểu nhầm ở `ml-metrics`, không đổi con số nào. Xem mục 2
  phiên (d) để biết vì sao **không** đồng bộ hoá hai hệ. Đừng làm lại.
- **Ngày 9 của fast track đúng 3,5 giờ**, tức đúng ngưỡng dưới của `auditPlan()`. Cắt bất
  kỳ thời lượng nào trong ba bài của ngày đó sẽ làm `auditPlan()` trượt. Đó là cổng làm
  đúng việc, nhưng biết trước thì đỡ mất thời gian.
- **6 khuyến nghị `G-FWD` còn lại là trạng thái ổn định đã soát**, không phải việc chưa
  làm. Chúng là các bài bản đồ/tra cứu (`s-*`, `t-stack`, `t-ai`) và vài bài FE nêu tên
  khái niệm để định vị. Đưa hết vào `allowEarly` sẽ biến `concepts.json` thành con dấu
  cao su; để nguyên thì cổng còn là bảng theo dõi đọc được. **Đừng "sửa" bằng cách nhồi
  allowEarly.**
- Rà thời lượng từng bài (`auditPlan` chỉ kiểm *nhất quán*, không kiểm *hợp lý*) — đặc
  biệt `pr-code`, các bài DL dài, `s-intro`.
- `r-roadmapsh`: chắc lại là **bản dịch thứ tự bài học** của roadmap.sh, không phải bài so
  sánh hơn thua.
- Nhãn Foundation/Applied/Advanced: cân nhắc có thật cần không trước khi làm.
- `th-defense` cũng là timeline (T−3/T−2/T−1) — cân nhắc chuyển sang `wb-steps` cho nhất
  quán với lịch 14 ngày.
- `f-cyclic` "Cách 4 · SplineTransformer", `ml-loss` zoo optimizer, `dl-train` bảng gỡ lỗi:
  vẫn trên mạch chính. Mỗi cái 6–15 dòng, `G-LAYER` không bắt (tiêu đề không tự tố giác).
  Ưu tiên thấp — nhưng `f-cyclic` Cách 4 đáng dời nhất vì bài đã nói dùng Cách 2/3.

---

## Chạy preview

> **Sửa 2026-08-04 (e): ghi chú cũ ở đây SAI.** Nó nói "sandbox chặn đọc thẳng file repo —
> phải mirror sang scratchpad". Không phải. Cái bị chặn là **mở socket từ Bash**; đọc file
> repo thì bình thường. Bằng chứng: `root-static` trong `.claude/launch.json` ở gốc repo vẫn
> đang serve thẳng từ repo, và đã kiểm lại — trang load đủ cả CSS.

`.claude/launch.json` của thư mục này giờ serve **thẳng từ gốc repo**, và bật `autoPort`
(nhiều phiên chạy song song thì cổng cố định 8805 làm phiên thứ hai không mở được preview).
Mở bằng `preview_start` với `name: "ds-review"`, rồi vào:

```
http://localhost:<cổng được cấp>/masters-degree/data-science-roadmap/data-science-roadmap.html
```

**Bỏ được cả bước mirror lẫn cái bẫy `?v=n`** — chỉ còn một bản file, nên không thể đo
bản cũ nữa.

`auditPlan()` **không cần chạy tay nữa** — `node tools/gate.mjs` đã bao gồm nó (cổng
`G-PLAN`). Vẫn gõ được ở Console nếu muốn đối chiếu; đã kiểm ngày 2026-08-04, cả hai đều
trả rỗng. Chỉ mở trình duyệt khi sửa **giao diện** — cổng không thấy được layout.

Khi lặp qua nhiều bài bằng `location.hash`, **nhớ bỏ qua `await` nếu hash không đổi** — set
lại đúng hash hiện tại thì `hashchange` không bắn và script treo.

Trang rất dài: screenshot khi cuộn sâu hay ra khung đen (giới hạn compositor của pane) —
verify bằng DOM/JS, đừng tin mỗi ảnh đen là lỗi thật.

**Nhiều phiên có thể sửa file này cùng lúc.** Trước khi Edit: `git log --oneline -3` và
`git status`; file đổi so với lúc bạn đọc thì đọc lại vùng sắp sửa.
