# Cách thêm và sửa nội dung

Công thức nấu ăn. Quy tắc *vì sao* nằm ở [CLAUDE.md](../CLAUDE.md); rubric nội dung ở
[content-gates.md](content-gates.md). File này chỉ trả lời "gõ ở đâu, wire vào đâu".

Mọi thứ trong `data-science-roadmap.html`. Mở đúng đoạn cần sửa:

```bash
node tools/gate.mjs --where <id>     # dải dòng
node tools/gate.mjs --show <id>      # in cả nội dung
```

---

## Bản đồ các khối dữ liệu trong `<script>`

Tìm bằng `grep -n '^const TREE' data-science-roadmap.html` — số dòng đổi liên tục nên
đừng tin số dòng ghi ở đây.

| khối | giữ gì | bắt buộc cho mọi bài? |
|---|---|---|
| `TREE` | mục lục: id, tiêu đề, `r`/`x`/`d`, `p` (core/good/skim) | **có** |
| `PAYOFF` | `[kết quả, dẫn đi đâu]` — render thành mục tiêu đầu bài + hộp kết bài | **có** |
| `WEEKS` | lịch 8 tuần: `ids`, `out`, `needs`, `proof`, `mile` | **có** (phải phủ hết bài) |
| `COMP_PHASE` | chặng → nhóm năng lực | **có** (theo chặng, tự khớp) |
| `DAYS` | fast track 14 ngày | không — chỉ bài vào fast track |
| `ACCEPT` | tiêu chí đạt | không — nhưng bài `core` gần như luôn cần |
| `SCOPE` | nhãn phạm vi (`aware`/`skeleton`/`weeks`) | không |
| `PORTFOLIO` | danh sách artifact trên trang chủ | không |
| `PHASE_OUTCOME` | một câu "xong chặng làm được gì" | theo chặng |
| `DELIV_MIN` | sàn phút deliverable, canh trong `auditPlan()` | không |

---

## Việc 1 · Thêm một bài

Trước khi gõ, trả lời **bốn câu ở CLAUDE.md §6** (đúng chặng chưa · thứ tự còn dễ→khó
không · có làm bài nào thành dư không · có dùng khái niệm chưa dạy không).

Rồi sáu bước:

1. **`TREE`** — thêm vào đúng chặng, **đúng vị trí trong chặng**.
   ```js
   { id:'f-newthing', t:'★ Tên bài', r:30, x:15, d:20, p:'core' },
   ```
   `★` = bài xương sống. `r`/`x`/`d` là phút đọc / thực hành / làm ra artifact — ba số
   riêng, đừng gộp; mọi con số giờ trên trang tính từ đây.

2. **`<template data-node="f-newthing">`** — chèn **đúng thứ tự vật lý** khớp `TREE`.
   Cổng `G-ORDER` chặn nếu lệch: đọc file từ trên xuống phải là đọc giáo trình theo
   thứ tự học. Chèn ngay sau template của bài đứng trước nó trong `TREE`.

3. **`PAYOFF`** — bắt buộc. `[0]` là kết quả cầm được (nó hiện ở **đầu** bài), `[1]` là
   bài sau dùng nó làm gì.
   ```js
   'f-newthing': ['Artifact cụ thể người học cầm được.', 'Bài sau dùng nó để…'],
   ```
   Đồng thời **sửa `PAYOFF[bài-trước][1]`** — câu "bài sau…" của nó giờ trỏ sai bài.
   Không cổng nào bắt được lỗi này; phải tự nhớ.

4. **`WEEKS`** — thêm id vào `ids` của một tuần. `auditPlan()` chặn nếu bài không nằm ở
   tuần nào. Nếu bài là prerequisite cho deliverable của tuần nào thì thêm vào `needs`.

5. **`ACCEPT`** nếu là bài `core` có deliverable. Dạng:
   ```js
   'f-newthing':[
     {k:'file',   v:'<code>src/x.py</code> tồn tại'},
     {k:'cmd',    v:'<code>python -m src.x</code> chạy không lỗi'},
     {k:'test',   v:'assert … pass'},
     {k:'result', v:'in ra … khớp …'},
     {k:'ask',    v:'Tự giải thích được vì sao …'},
   ],
   ```
   Bài `core` mà không có `x`, `d`, lẫn `ACCEPT` thì `auditPlan()` báo lỗi — trừ khi
   thêm vào `READONLY_OK` (chỉ dành cho bài định vị/tra cứu thật).

6. **Cổng.**
   ```bash
   node tools/gate.mjs            # phải qua
   node tools/gate.mjs --write    # sinh lại TOC.md
   ```
   Rồi mở trang, gõ `auditPlan()` → phải `[]`.

---

## Việc 2 · Thêm một nhánh phụ

Chọn tầng trước: **popup là mặc định**, drawer chỉ khi cần đọc song song mạch chính
(CLAUDE.md §7).

**Popup** — công thức, đào sâu, catalogue:
```html
<template data-mathdef="khoa" data-title="Tiêu đề hiện trên popup">
  <p>…</p>
</template>
```
đặt trong vùng popup (trước vùng `data-aside`), rồi mở từ mạch chính:
```html
<button class="ds-math" data-math="khoa">Nhãn chip</button>
```

**Drawer** — so sánh công cụ:
```html
<template data-aside="cmp-x" data-title="…" data-sub="…">…</template>
```
```html
<button class="ds-aside" data-aside="cmp-x">Nhãn chip</button>
```

`G-ORPHAN` chặn nếu tạo template mà không bài nào mở. `G-REF` chặn nếu chip trỏ tới
khoá không tồn tại.

---

## Việc 3 · Thêm một hình tương tác

1. Đăng ký hàm vẽ trong `VIZ` (`grep -n '^const VIZ' `):
   ```js
   VIZ.tenhinh = (el) => { /* dựng SVG + control vào el */ };
   ```
2. Gọi từ mạch chính:
   ```html
   <div class="ds-viz" data-viz="tenhinh"></div>
   ```
3. **Bắt buộc** thêm `.ds-viz__alt` — mô tả bằng chữ, mọi thông tin trong SVG phải đọc
   được ở đó. Không phải để cho có: nó là bản dự phòng cho trình đọc màn hình và cho
   người in trang ra giấy.
4. Màu lấy từ token `var(--wb-fg)`, `var(--wb-border-strong)`… — **không** hardcode hex.
   SVG dùng `width:100%`.

---

## Việc 4 · Dời hoặc xoá một bài

Đây là việc dễ để lại rác nhất. Danh sách chỗ phải sửa:

- `TREE` (vị trí) **và** thứ tự vật lý của `<template>` — hai chỗ, phải khớp
- `PAYOFF` của **bài trước** và **bài sau** (câu "bài sau…")
- `WEEKS.ids`, `WEEKS.needs`, `WEEKS.proof`
- `DAYS.ids`, `DAYS.proof` nếu bài ở fast track
- `ACCEPT`, `SCOPE`, `DELIV_MIN`, `READONLY_OK` nếu có
- `COMPS[].lessons` / `.key`
- `PORTFOLIO[].id`
- `tools/concepts.json` — nếu bài này là `definedIn` của một khái niệm, hoặc nằm trong
  `allowEarly` của khái niệm nào
- mọi `data-goto="id"` và `href="#/id"` trong các bài khác

`G-REF` bắt liên kết hỏng, `auditPlan()` bắt tham chiếu lịch hỏng. **Không cổng nào bắt
được** một câu văn "bài sau nói về X" giờ trỏ sai — đó là việc của mắt.

Xoá bài thì ghi vào `HANDOFF.md` **mất gì**.

---

## Việc 5 · Thêm một cổng mới vào gate.mjs

Cổng mới đi vào `tools/gate.mjs`, mục 3. Ba câu phải trả lời trước:

1. **Chặn hay khuyến nghị?** Chặn chỉ khi lỗi là *chắc chắn sai* và *chắc chắn bắt
   đúng*. Nghi ngờ một trong hai → khuyến nghị. Một cổng chặn bắt sai một lần là một
   cổng sẽ bị tắt.
2. **Ở trạng thái ổn định nó có im không?** Nếu cổng mới sinh ra 40 cảnh báo ngay hôm
   nay, nó không dùng được — thu hẹp mẫu, hoặc gộp theo nhóm như `G-FWD` làm.
3. **Có thoát cửa không?** Mọi heuristic cần một cách nói "chỗ này cố ý".

Thêm rồi phải **thử cả hai chiều**: tự tạo một vi phạm để xem cổng có nổ, rồi hoàn lại
để xem nó có im. Cổng chưa bao giờ thấy nổ là cổng chưa biết có chạy hay không.

### Bốn thoát cửa hiện có — và cái nào dùng khi nào

| thoát cửa | ở đâu | dùng khi |
|---|---|---|
| `<!-- gate:main -->` | ngay trước một `<h2>`/`<h3>` trong template | tiêu đề trông giống nhánh phụ nhưng mục đó **thật sự** là mạch chính |
| `<!-- gate:long: lý do -->` | trong template, sau thẻ `<template>` | bài dài > 200 dòng, đã soát, và dài là **đúng** (ví dụ bài đi qua sáu file nguồn) |
| `allowEarly` + `allowWhy` | `tools/concepts.json` | bài nhắc một khái niệm trước bài dạy nó, nhưng chỉ để **định vị** hoặc đã tự định nghĩa một câu tại chỗ |
| `waivers.json` | `tools/waivers.json` | lỗi CHẶN **thật**, đã biết cách sửa, nhưng cách sửa là một quyết định giáo trình cần phiên riêng |

Ba cái đầu **đóng vĩnh viễn** một phát hiện — nên chúng bắt buộc kèm lý do cụ thể, và lý
do đó phải nói *vì sao cổng bắt sai ở đây*, không phải "đã xem rồi". Cái thứ tư là **nợ**:
nó in lại mỗi lần chạy cho tới khi bị xoá. Đừng dùng waiver cho việc mà `gate:main` /
`gate:long` / `allowEarly` mới là câu trả lời đúng — và ngược lại, đừng dùng ba cái đầu để
làm im một lỗi thật.

---

## Class CSS hay dùng

Token và component `wb-*` từ [web-builder](../../../web-builder/); `ds-*` là của trang.

| việc | class |
|---|---|
| khối code | `<div class="ds-code">` (nút Chép tự thêm) |
| nhãn trên khối code | `<p class="ds-codecap">` |
| chip mở popup toán | `<button class="ds-math" data-math="…">` |
| chip mở ngăn phụ | `<button class="ds-aside" data-aside="…">` |
| hình tương tác | `<div class="ds-viz" data-viz="…">` |
| mô tả chữ của hình | `<p class="ds-viz__alt">` |
| chú thích nhạt | `<p class="wb-help">` |
| cảnh báo | `<div class="wb-alert wb-alert--danger\|warning">` |
| thẻ | `<div class="wb-card"><div class="wb-card__body">` |
| bảng rộng | bọc `<div class="wb-table-scroll">` |
| loại phát biểu | `<span class="ds-claim ds-claim--fact\|quota\|judgment">` |
| nguồn | `<ul class="ds-srclist">`, `<p class="ds-srcline">` |

**Đừng** đặt `max-width` mới. Hai mép của trang do `--ds-measure` và bề rộng cột quyết
định; `G-MEASURE` bắt mọi giá trị cứng viết thêm.
