# Sửa trang này thế nào

Trang là **một** file HTML. Mọi thứ nối vào nhau bên trong nó, nên sửa một chỗ thường kéo
theo phải sửa vài chỗ khác. File này trả lời đúng hai câu:

1. **Tôi vừa đổi cái này — còn phải đổi những gì nữa?**
2. **Tôi muốn thêm một bài / một chặng / một hình — gõ vào đâu?**

Vì sao cần: một câu như *"bài sau nói về X"* nằm ở bài thứ 40; dời bài thứ 41 đi thì câu
đó sai, mà máy không đọc được văn để biết nó sai. Danh sách dưới đây ghi lại những mối nối
như vậy.

Luật *vì sao* nằm ở [CLAUDE.md](../CLAUDE.md). Cách viết cho người đọc hiểu nằm ở
[writing.md](writing.md). Nó trông thế nào và nằm ở đâu trên màn hình nằm ở
[design.md](design.md). File này chỉ nói gõ ở đâu — và nó ghi **trạng thái hiện tại**, không
ghi phiên nào đã làm gì; việc đó thuộc [HANDOFF.md](../HANDOFF.md).

Mở đúng đoạn cần sửa, đừng mở cả file:

```bash
node tools/gate.mjs --where <id>     # bài đó nằm từ dòng nào tới dòng nào
node tools/gate.mjs --show <id>      # in luôn nội dung bài đó
```

---

## Đổi cái này thì phải đổi cái kia

Đọc theo dòng. Cột cuối cho biết máy có tự bắt hộ không — chỗ nào ghi **mắt** thì không có
cổng nào canh, bạn phải tự nhớ.

| Bạn vừa đổi | Phải đổi theo | Ai bắt |
|---|---|---|
| **Thêm một bài** | `TREE` · khối `<template>` đặt đúng vị trí · `PAYOFF` của bài mới **và của bài đứng ngay trước nó** · `WEEKS[].ids` · `ACCEPT` nếu là bài bắt buộc | cổng bắt hết, trừ `PAYOFF` của bài trước — `G-NEXT` chỉ **nhắc** |
| **Xoá một bài** | tất cả ô trên, cộng: `DAYS` · `SCOPE` · `DELIV_MIN` · `READONLY_OK` · `COMPS[].lessons` và `.key` · `PORTFOLIO[].id` · `tools/concepts.json` · mọi `data-goto="id"` và `href="#/id"` | cổng bắt hết phần tham chiếu |
| **Dời một bài trong cùng chặng** | vị trí trong `TREE` · vị trí khối `<template>` (hai chỗ, phải khớp nhau) · `PAYOFF` của các bài kề · `WEEKS`/`DAYS` nếu tuần hoặc ngày đổi | `G-ORDER` + `G-NEXT` |
| **Dời một bài SANG chặng khác** | tất cả ô trên, **cộng việc đổi id** — id có tiền tố theo chặng, nên `pr-data` chuyển sang chặng 3 phải thành `d-data`, rồi sửa mọi chỗ nhắc id cũ | cổng bắt id hỏng, nhưng **mắt** phải nhớ đổi tiền tố |
| **Đổi tên / thời lượng / ưu tiên một bài** | chỉ `TREE`, rồi sinh lại `TOC.md` | `G-TOC-STRUCT` chặn để bạn xác nhận có ý thức |
| **Dời một chặng** | xem [việc 3](#việc-3--dời-thêm-hoặc-xoá-một-chặng) — nhiều hơn bạn nghĩ | một phần |
| **Thêm một nhánh phụ** (popup / ngăn phải) | khối `<template>` của nó, cộng một chip mở nó | `G-ORPHAN` chặn nếu tạo mà không ai mở |
| **Thêm một lớp phủ mới** (popup / drawer / panel) | thêm id vào `LAYER_IDS` — thiếu thì `Esc` và bấm-ra-ngoài không đóng được nó, và nó không chặn phím `[` `]`. Dock `Notes` **cố ý không có** trong danh sách đó ([design.md](design.md) §0.5) | **mắt**: mở lớp mới rồi bấm Esc |
| **Thêm một nút bật/tắt** | `wb-btn wb-btn--sm ds-lvlbtn`, bật thì thêm **`is-active`** — một class trạng thái, không hai. Xem [design.md](design.md) §4 | **mắt** |
| **Cần một nút có trạng thái kit không có sẵn** | viết một class của riêng trang, **đừng chồng hai variant `wb-btn--*`** đặt cùng thuộc tính — `--ghost` + `--danger` cho ra icon đen trên nền đỏ ([design.md](design.md) §3) | **mắt**, và phải kiểm ở trạng thái hover |
| **Thêm một cổng vào `gate.mjs`** | hàng trong mảng `GATES` · bảng §4 của `CLAUDE.md` · một ca NỔ + để nó vào chiều IM ở `gate.test.mjs` | `G-DOC` nhắc nếu `CLAUDE.md` thiếu tên; `gate.test.mjs` in ra cổng nào chưa có ca NỔ |
| **Thêm một lệnh vào `tools/`** | bảng lệnh ở `CLAUDE.md` §3 · bảng định tuyến §0a · một ca "chạy được" trong `gate.test.mjs` | **mắt** |
| **Đổi khuôn dòng của `LEARNING-LOG.md`** | `RE_ENTRY`/`RE_GROUP` trong `tools/learn.mjs` **và** `N_RE_ENTRY`/`N_RE_GROUP` trong HTML — hai bản của cùng một ngữ pháp, vì trang không có build nên không import được `.mjs` | **mắt**, và đây là chỗ dễ lệch nhất |
| **Cần "cao/rộng bằng cửa sổ"** | dùng `--ds-vh` / `--ds-vw`, **không** `vh`/`vw`/`dvh` trần ([design.md](design.md) §0.4). Media query cũng vậy — con số phải đã chia zoom | `node tools/gate.test.mjs` có ca canh |
| **Đặt cỡ chữ cho khối trong `#main`** | trỏ vào **một bậc của thang** `--ds-t-*` ([design.md](design.md) §0.2). Cần một loại nội dung chưa có bậc → thêm bậc ở `:root` ⑧, đừng viết `font-size` rời. `em` chỉ cho thứ phụ thuộc ngữ cảnh (code inline). **Px cứng chỉ đúng ở lớp vỏ** | **mắt** + đếm lại số cỡ chữ (§0.2) |
| **Thêm một component `wb-*` của kit vào bài** | nếu kit ghi `font-size` px cứng cho nó (đúng với hầu hết: alert, help, card, steps, cap, btn, pager…) thì thêm một dòng vào khối `#main .wb-*` để kéo về thang — không thêm thì nó đọc như một trang khác dán vào | đếm lại số cỡ chữ (§0.2): phải ≤ ~10 |
| **Nới cột nội dung / đổi khổ chữ** | `--ds-measure` **và** `--ds-fs` cùng lúc — nhưng đọc [design.md](design.md) §0.3 trước, hai con số đó là quyết định của chủ trang. Rồi sửa số đo ở hai chỗ: khối chú thích đầu `<style>` và `design.md` §0.3 | `G-MEASURE`, và đo lại ký tự/dòng — **đừng** copy số cũ sang |
| **Đổi bề rộng dock `Notes`** | `--ds-dock-w` trong `:root` là mặc định fluid; JS chỉ ghi đè khi người dùng KÉO, và reset = **xoá** `localStorage['ds.dockW']` chứ không ghi lại 25% | mở dock, kéo, F5, kiểm bề rộng còn nhớ |
| **Đổi tên file ghi chú tải về** | `a.download` trong HTML **và** `PAT_EXPORT` trong `tools/learn.mjs` — đây là hợp đồng để `--sync` tự tìm được file; lệch một bên là `--sync` báo "không thấy bản xuất nào" | chạy `node tools/learn.mjs --sync` sau khi bấm tải về |
| **Đổi một từ ở lớp vỏ trang** | cùng từ đó **trong bài** — hai tên cho một khái niệm là lỗi `CLAUDE.md` §11. Thanh trên nói tiếng Anh, lớp vỏ còn lại tiếng Việt ([design.md](design.md) §0.1) | `grep -n '<từ cũ>' data-science-roadmap.html` phải ra 0 (hoặc chỉ còn chỗ nêu tên tiếng Anh một lần) |
| **Thêm một ô vào thanh trên** | `height: var(--ds-navctl)` **và** `box-sizing: border-box`, nhãn/`title`/`aria-label` bằng tiếng Anh ([design.md](design.md) §0.1) | **mắt**: bốn ô phải cùng mép trên và mép dưới |

**Ba chỗ không cổng nào bắt được** — chúng là văn xuôi, máy không đọc được nội dung:

- Câu *"bài sau dùng nó để…"* trong `PAYOFF[id][1]`. Cổng `G-NEXT` biết được **bài sau đã
  đổi** và nhắc tên những bài cần đọc lại, nhưng nó không biết câu đó đúng hay sai.
- Một câu giữa bài nói *"bài X dạy Y"* mà không dùng link. Có link thì `G-REF` bắt.
- Chú thích trong `<script>` nhắc tên bài khác. `TREE` và `PAYOFF` có nhiều chú thích như
  vậy, ví dụ *"ml-metrics đứng ngay sau baseline đầu tiên"*.

**Những khối bạn KHÔNG phải sửa** khi thêm/xoá/dời bài, vì chúng không đánh theo tên bài:
`PRIO`, `SCOPE_LABEL`, `ACC_META`, `PF_TAG`, `SYN`, `VIZ`.

---

## Các khối dữ liệu trong trang

Tìm bằng `grep -n "^const TREE" data-science-roadmap.html`. Đừng tin số dòng ghi trong tài
liệu — nó đổi liên tục.

| khối | giữ gì | đánh theo | mọi bài đều phải có? |
|---|---|---|---|
| `TREE` | mục lục: id, tiêu đề, `r`/`x`/`d`, `p` (core/good/skim) | bài **và** chặng | **có** |
| `PAYOFF` | `[kết quả, dẫn đi đâu]` — hiện ở đầu bài và cuối bài | bài | **có** |
| `WEEKS` | lịch 8 tuần: `ids`, `out`, `needs`, `proof`, `next`, `mile` | bài | **có** — phải phủ hết bài |
| `DAYS` | lịch 14 ngày: `ids`, `out`, `proof` | bài | không — chỉ bài vào fast track |
| `ACCEPT` | tiêu chí đạt | bài | không, nhưng bài bắt buộc gần như luôn cần |
| `SCOPE` | nhãn phạm vi (`aware`/`skeleton`/`weeks`) | bài | không |
| `DELIV_MIN` | sàn phút cho cột deliverable | bài | không |
| `READONLY_OK` | bài bắt buộc được phép chỉ-đọc (bài tra cứu) | bài | không |
| `COMPS` | 9 nhóm năng lực: `lessons`, `key`, `cap`, `evid` | bài | **có** — mọi bài phải thuộc ≥1 nhóm |
| `PORTFOLIO` | danh sách sản phẩm hiện trên trang chủ | bài | không |
| `PHASE_OUTCOME` | một câu "xong chặng này làm được gì" | **chặng** | theo chặng |
| `COMP_PHASE` | chặng → số hiệu nhóm năng lực | **chặng** | theo chặng |

Tiền tố id theo chặng. Giữ đúng quy ước này — `TOC.md` và người đọc đều dựa vào nó:

| chặng | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| tiền tố | `s-` | `t-` | `m-` | `d-` | `f-` | `ml-` | `dl-` | `q-` | `pr-` | `th-` | `r-` |

---

## Việc 1 · Thêm một bài

Trước khi gõ, trả lời **bốn câu ở CLAUDE.md §6**: đúng chặng chưa · thứ tự còn dễ→khó
không · có làm bài nào phía trước thành dư không · có dùng khái niệm chưa được dạy không.

Rồi sáu bước:

1. **`TREE`** — thêm vào đúng chặng, **đúng vị trí trong chặng**.
   ```js
   { id:'f-newthing', t:'★ Tên bài', r:30, x:15, d:20, p:'core' },
   ```
   `★` đánh dấu bài xương sống. `r`/`x`/`d` là phút đọc / thực hành / làm ra sản phẩm — ba
   số riêng, đừng gộp. Mọi con số giờ trên trang tính từ đây.

2. **`<template data-node="f-newthing">`** — chèn vào **đúng vị trí vật lý** khớp `TREE`,
   tức ngay sau khối của bài đứng trước nó. Đọc file từ trên xuống phải là đọc giáo trình
   theo thứ tự học. `G-ORDER` chặn nếu lệch.

3. **`PAYOFF`** — bắt buộc. `[0]` là kết quả cầm được (hiện ở **đầu** bài), `[1]` nói bài
   sau dùng nó làm gì.
   ```js
   'f-newthing': ['Sản phẩm cụ thể người học cầm được.', 'Bài sau dùng nó để…'],
   ```
   **Rồi sửa `PAYOFF` của bài đứng trước** — câu "bài sau…" của nó giờ trỏ sai bài.
   `G-NEXT` sẽ nhắc, nhưng nó không đọc được câu nên vẫn là việc của bạn.

4. **`WEEKS`** — thêm id vào `ids` của một tuần. `G-PLAN` chặn nếu bài không nằm ở tuần
   nào. Nếu deliverable của tuần nào cần bài này thì thêm vào `needs` của tuần đó.

5. **`ACCEPT`** nếu là bài bắt buộc có deliverable:
   ```js
   'f-newthing':[
     {k:'file',   v:'<code>src/x.py</code> tồn tại'},
     {k:'cmd',    v:'<code>python -m src.x</code> chạy không lỗi'},
     {k:'test',   v:'assert … pass'},
     {k:'result', v:'in ra … khớp …'},
     {k:'ask',    v:'Tự giải thích được vì sao …'},
   ],
   ```
   Bài `core` mà không có `x`, `d`, lẫn `ACCEPT` thì `G-PLAN` báo lỗi — trừ khi thêm vào
   `READONLY_OK`, và chỗ đó chỉ dành cho bài tra cứu thật.

6. **Chạy cổng:**
   ```bash
   node tools/gate.mjs            # phải qua
   node tools/gate.mjs --write    # sinh lại TOC.md
   ```

---

## Việc 2 · Dời hoặc xoá một bài

Đây là việc dễ để lại rác nhất. Dùng bảng ở đầu file làm danh sách kiểm. Ba điều dễ quên
nhất:

- **Hai chỗ phải khớp nhau:** vị trí trong `TREE` và vị trí vật lý của khối `<template>`.
- **`PAYOFF` của cả bài trước và bài sau**, không chỉ bài bạn vừa dời.
- **Dời sang chặng khác thì phải đổi id** theo tiền tố chặng: một bài `pr-*` chuyển sang
  chặng 3 phải thành `d-*`, rồi sửa mọi chỗ nhắc id cũ.

Xoá bài thì ghi vào [HANDOFF.md](../HANDOFF.md) **mất gì** — nội dung đó biến mất khỏi
trang, và phiên sau cần biết nó từng có.

---

## Việc 3 · Dời, thêm hoặc xoá một chặng

Dời một chặng đắt hơn dời một bài, vì **số hiệu chặng nằm trong chính tiêu đề**:

```js
{ id:'p7', t:'7 · Các họ bài toán khác — chuyển giao kiến thức', kids:[…] }
```

`id` là `p7`, còn `t` mở đầu bằng `"7 · "`. `TOC.md` in tiêu đề `t` nguyên văn. Nên:

| phải đổi | vì sao |
|---|---|
| vị trí khối chặng trong `TREE` | đây là việc chính |
| **số ở đầu `t` của mọi chặng bị xê dịch** | dời chặng 7 xuống sau chặng 8 thì chặng 8 phải thành "7 ·", chặng 7 thành "8 ·" |
| thứ tự vật lý khối `<template>` của **toàn bộ bài** trong chặng bị dời | `G-ORDER` chặn |
| `WEEKS` | tuần đi theo thứ tự chặng; dời chặng mà không dời tuần thì lịch nói ngược nhau |
| `DAYS` nếu chặng có bài trong fast track | `G-PLAN` chặn nếu số giờ mỗi ngày lệch khỏi 3,5–6,5 |
| `PAYOFF` của bài cuối hai chặng liên quan | câu "bài sau…" ở ranh giới hai chặng giờ trỏ sai |

**Giữ nguyên `id` chặng** — `p7` vẫn là `p7` dù nó chuyển xuống vị trí thứ 8. Làm vậy thì
`PHASE_OUTCOME` và `COMP_PHASE` không phải sửa, vì hai khối đó đánh theo `id` chứ không
theo vị trí. Đổi `id` thì phải sửa cả hai mà không được lợi gì.

**Thêm một chặng mới** phải khai đủ ba chỗ; thiếu một chỗ là `G-PLAN` chặn:

```js
TREE          → { id:'p11', t:'11 · Tên chặng', kids:[…] }
PHASE_OUTCOME → p11: 'Xong chặng này bạn làm được…'
COMP_PHASE    → p11: [số hiệu nhóm năng lực]
```

Cộng thêm: chọn tiền tố id cho bài trong chặng mới, và thêm những bài đó vào `WEEKS`.

---

## Việc 4 · Thêm một nhánh phụ

"Nhánh phụ" là phần không nằm trên đường đi chính: công thức, đào sâu, danh sách lỗi, bảng
so sánh công cụ. Chọn chỗ đặt trước — **popup là mặc định**, ngăn phải chỉ dùng khi người
đọc cần thấy mạch chính trong lúc đọc nhánh phụ (CLAUDE.md §7).

**Popup** — công thức, đào sâu, danh mục:
```html
<template data-mathdef="khoa" data-title="Tiêu đề hiện trên popup">
  <p>…</p>
</template>
```
đặt trong vùng popup (trước vùng `data-aside`), rồi mở từ trong bài:
```html
<button class="ds-math" data-math="khoa">Nhãn chip</button>
```

**Ngăn phải** — bảng so sánh công cụ:
```html
<template data-aside="cmp-x" data-title="…" data-sub="…">…</template>
```
```html
<button class="ds-aside" data-aside="cmp-x">Nhãn chip</button>
```

`G-ORPHAN` chặn nếu tạo mà không bài nào mở. `G-REF` chặn nếu chip trỏ tới khoá không có.

---

## Việc 5 · Thêm một hình tương tác

1. Đăng ký hàm vẽ trong `VIZ` (`grep -n "^const VIZ"`):
   ```js
   VIZ.tenhinh = (el) => { /* dựng SVG + nút điều khiển vào el */ };
   ```
2. Gọi từ trong bài:
   ```html
   <div class="ds-viz" data-viz="tenhinh"></div>
   ```
3. **Bắt buộc** thêm `.ds-viz__alt` — mô tả bằng chữ. Mọi thông tin trong hình phải đọc
   được ở đó. Không phải để cho có: đó là bản dự phòng cho người dùng trình đọc màn hình,
   và cho người in trang ra giấy.
4. Mô tả nói **hình dạng, hai đầu mút, và kết luận**. Đừng đọc lại từng con số — mắt đã
   thấy chúng trên hình rồi, và cổng `G-DUMP` bắt lỗi này. Số liệu thô, nếu cần cho trình
   đọc màn hình, để trong `<desc>` của SVG.
5. Màu lấy từ token `var(--wb-fg)`, `var(--wb-border-strong)`… — **đừng** gõ mã màu trực
   tiếp. SVG dùng `width:100%`.

---

## Việc 6 · Thêm một cổng mới vào gate.mjs

Ba câu phải trả lời trước:

1. **Chặn commit hay chỉ nhắc?** Chặn chỉ khi lỗi *chắc chắn là sai* và cổng *chắc chắn
   bắt đúng*. Nghi ngờ một trong hai thì cho nó nhắc. Một cổng chặn mà bắt sai một lần là
   một cổng sẽ bị tắt.
2. **Ở trạng thái bình thường nó có im không?** Cổng mới sinh ra 40 cảnh báo ngay hôm nay
   thì không dùng được — thu hẹp lại, hoặc gộp theo nhóm như `G-FWD` đang làm.
3. **Có cách nói "chỗ này cố ý" không?** Mọi cổng đoán bằng dấu hiệu đều cần một cách để
   người viết bảo nó im ở một chỗ cụ thể.

Thêm rồi phải làm đủ ba việc:

1. Khai tên cổng vào mảng `GATES` trong `gate.mjs`. Không khai thì `G-DOC` nhắc, và bảng
   cổng trong `CLAUDE.md` sẽ trôi lệch so với code.
2. Thêm một ca vào `tools/gate.test.mjs`: một vi phạm cố ý mà cổng phải kêu lên.
3. Chạy `node tools/gate.test.mjs`.

Test chạy **cả hai chiều**: tạo vi phạm để xem cổng có kêu, rồi bỏ vi phạm để xem nó có
im. Cổng chưa bao giờ thấy kêu là cổng chưa biết có chạy hay không.

### Bốn cách nói với cổng rằng "chỗ này cố ý"

| cách | viết ở đâu | dùng khi |
|---|---|---|
| `<!-- gate:main -->` | ngay trước một `<h2>`/`<h3>` trong bài | tiêu đề trông giống nhánh phụ nhưng mục đó **thật sự** nằm trên đường đi chính |
| `<!-- gate:long: lý do -->` | trong khối `<template>`, sau thẻ mở | bài dài hơn 200 dòng, đã soát, và dài là **đúng** (ví dụ bài đi qua sáu file nguồn) |
| `allowEarly` + `allowWhy` | `tools/concepts.json` | bài nhắc một khái niệm trước bài dạy nó, nhưng chỉ để **định vị**, hoặc bài đã tự định nghĩa một câu tại chỗ |
| `waivers.json` | `tools/waivers.json` | lỗi CHẶN **thật**, đã biết cách sửa, nhưng cách sửa là một quyết định về giáo trình cần một phiên riêng |

Ba cách đầu **đóng vĩnh viễn** một phát hiện, nên chúng bắt buộc kèm lý do, và lý do phải
nói *vì sao cổng bắt sai ở chỗ này* — không phải "đã xem rồi". Cách thứ tư là **nợ**: nó
in lại mỗi lần chạy cổng cho tới khi bị xoá. Đừng dùng waiver cho việc mà ba cách đầu mới
là câu trả lời đúng, và đừng dùng ba cách đầu để làm im một lỗi thật.

---

## Class CSS hay dùng

Token và component `wb-*` đến từ [web-builder](../../../web-builder/); `ds-*` là của riêng
trang này.

| việc | class |
|---|---|
| khối code | `<div class="ds-code">` (nút Chép tự thêm) |
| nhãn trên khối code | `<p class="ds-codecap">` |
| chip mở popup toán | `<button class="ds-math" data-math="…">` |
| chip mở ngăn phải | `<button class="ds-aside" data-aside="…">` |
| hình tương tác | `<div class="ds-viz" data-viz="…">` |
| mô tả bằng chữ của hình | `<p class="ds-viz__alt">` |
| chú thích nhạt | `<p class="wb-help">` |
| cảnh báo | `<div class="wb-alert wb-alert--danger\|warning">` |
| thẻ | `<div class="wb-card"><div class="wb-card__body">` |
| bảng | bọc `<div class="wb-table-scroll">` |
| loại phát biểu | `<span class="ds-claim ds-claim--fact\|quota\|judgment">` |
| nguồn | `<ul class="ds-srclist">`, `<p class="ds-srcline">` |

**Đừng đặt `max-width` mới ở đâu cả.** Mép phải của trang do `--ds-measure` quyết định, và
`G-MEASURE` bắt mọi giá trị cứng viết thêm. Muốn nới trang thì sửa `--ds-measure` **và**
`--ds-fs` — xem hàng "Nới cột nội dung" ở bảng đầu file. Ba cái bẫy khi sửa phần bảng tràn ra
hai bên nằm ở `CLAUDE.md` §10; đọc trước khi động vào.
