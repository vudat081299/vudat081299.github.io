# Sửa trang này thế nào

File này trả lời hai câu: đổi cái này thì phải đổi gì nữa, và thêm một bài, chặng, hình, câu hỏi thì gõ ở đâu.
Luật ở [CLAUDE.md](../CLAUDE.md); cách viết ở [writing.md](writing.md); trông thế nào ở [design.md](design.md);
cổng ở [gates.md](gates.md).

Mở đúng đoạn, đừng mở cả file: `node tools/gate.mjs --where <id>` (dải dòng) hoặc `--show <id>` (in cả bài).

## Đổi cái này thì phải đổi cái kia

Cột cuối cho biết ai bắt; "mắt" là không cổng nào canh.

| vừa đổi | phải đổi theo | ai bắt |
|---|---|---|
| thêm một bài | `TREE` · `<template>` đúng vị trí · `PAYOFF` của bài mới và của bài đứng ngay trước · `WEEKS[].ids` · `ACCEPT` nếu là bài bắt buộc | cổng, trừ `PAYOFF` bài trước (`G-NEXT` chỉ nhắc) |
| xoá một bài | như trên, cộng `DAYS` · `SCOPE` · `DELIV_MIN` · `READONLY_OK` · `COMPS[].lessons` và `.key` · `PORTFOLIO[].id` · `tools/concepts.json` · mọi `data-goto="id"`, `href="#/id"` | cổng, phần tham chiếu |
| dời bài trong chặng | vị trí trong `TREE` và vị trí `<template>` (phải khớp nhau) · `PAYOFF` các bài kề · `WEEKS`/`DAYS` nếu tuần, ngày đổi | `G-ORDER`, `G-NEXT` |
| dời bài sang chặng khác | như trên, cộng đổi tiền tố id theo chặng (bảng dưới) rồi sửa mọi chỗ nhắc id cũ | cổng bắt id hỏng; tiền tố là mắt |
| đổi tên, thời lượng, ưu tiên bài | chỉ `TREE`, rồi sinh lại `TOC.md`; ngày 6 fast track là ngày deliverable, cố ý nhẹ nhất: đừng cắt giờ của bài trong đó | `G-TOC-STRUCT`; `G-PLAN` nếu một ngày dưới 3,5 giờ |
| dời một chặng | [việc 3](#việc-3--dời-thêm-hoặc-xoá-một-chặng) | một phần |
| thêm nhánh phụ (popup, ngăn phải) | `<template>` của nó, cộng một chip mở nó | `G-ORPHAN` |
| thêm lớp phủ mới | id vào `LAYER_IDS`, không thì Esc và bấm ra ngoài không đóng được, phím `[` `]` không bị chặn; dock `Notes` cố ý không có trong đó | mắt: mở rồi bấm Esc |
| thêm nút bật/tắt | `wb-btn wb-btn--sm ds-lvlbtn`, bật thì thêm `is-active`, một class trạng thái (design.md §4) | mắt |
| cần nút có trạng thái kit không có | class riêng của trang; đừng chồng hai variant `wb-btn--*` cùng đặt một thuộc tính (design.md §3) | mắt, kiểm cả hover |
| thêm một cổng | [gates.md](gates.md), mục *Thêm một cổng* | `G-DOC`, `gate.test.mjs` |
| thêm một lệnh vào `tools/` | bảng lệnh ở CLAUDE.md §3 · một ca "chạy được" trong `gate.test.mjs` | mắt |
| đổi khuôn dòng của `LEARNING-LOG.md` | `RE_ENTRY`/`RE_GROUP` trong `tools/learn.mjs` và `N_RE_ENTRY`/`N_RE_GROUP` trong HTML (trang không import được `.mjs`) | mắt; chỗ dễ lệch nhất |
| cần cao, rộng bằng cửa sổ | `--ds-vh`/`--ds-vw`, không `vh`/`vw`/`dvh` trần; media query cũng vậy (design.md §0.4) | `gate.test.mjs` |
| đặt cỡ chữ cho khối trong `#main` | một bậc `--ds-t-*` (design.md §0.2); loại nội dung chưa có bậc thì thêm bậc ở `:root`; px cứng chỉ ở lớp vỏ | mắt, đếm lại cỡ chữ |
| thêm component `wb-*` vào bài | kit ghi `font-size` px cứng thì thêm một dòng vào khối `#main .wb-*` để kéo về thang | đếm lại cỡ chữ: ≤ ~10 |
| nới cột, đổi khổ chữ | `--ds-measure` và `--ds-fs` cùng lúc, hỏi chủ trang trước (DS-014); sửa số đo ở chú thích đầu `<style>` và design.md §0.3 | `G-MEASURE`; đo lại, đừng chép số cũ |
| đổi bề rộng dock `Notes` | `--ds-dock-w` ở `:root` là mặc định fluid; JS chỉ ghi đè khi người dùng kéo; reset là xoá `localStorage['ds.dockW']` | mở dock, kéo, F5 |
| đổi tên file ghi chú tải về | `a.download` trong HTML và `PAT_EXPORT` trong `tools/learn.mjs` | `gate.test.mjs`; `learn.mjs --sync` sau khi tải |
| đổi một từ ở lớp vỏ | cùng từ đó trong bài (CLAUDE.md §11) | `grep -n '<từ cũ>' data-science-roadmap.html` ra 0 |
| thêm ô vào thanh trên | `height: var(--ds-navctl)`, `box-sizing: border-box`, nhãn, `title`, `aria-label` tiếng Anh (design.md §0.1) | mắt: mọi ô cùng mép trên và mép dưới |

Ba chỗ không cổng nào bắt, vì là văn xuôi:

- câu "bài sau dùng nó để…" trong `PAYOFF[id][1]` (`G-NEXT` chỉ biết bài sau đã đổi);
- câu giữa bài nói "bài X dạy Y" mà không có link (có link thì `G-REF` bắt);
- chú thích trong `<script>` nhắc tên bài khác, nhất là quanh `TREE` và `PAYOFF`.

Thêm, xoá, dời bài thì không phải sửa `PRIO`, `SCOPE_LABEL`, `ACC_META`, `PF_TAG`, `SYN`, `VIZ`: chúng không đánh theo tên bài.

## Các khối dữ liệu trong trang

Tìm bằng `grep -n "^const TREE" data-science-roadmap.html`; đừng tin số dòng ghi trong tài liệu.

| khối | giữ gì | đánh theo | bài nào cũng phải có? |
|---|---|---|---|
| `TREE` | mục lục: id, tiêu đề, `r`/`x`/`d`, `p` (core/good/skim) | bài và chặng | có |
| `PAYOFF` | `[kết quả, dẫn đi đâu]`, hiện ở đầu và cuối bài | bài | có |
| `WEEKS` | lịch 8 tuần: `ids`, `out`, `needs`, `proof`, `next`, `mile` | bài | có, phải phủ hết bài |
| `DAYS` | lịch 14 ngày: `ids`, `out`, `proof`, `note`, `mile` | bài | không, chỉ bài vào fast track |
| `ACCEPT` | tiêu chí đạt | bài | không; bài bắt buộc gần như luôn cần |
| `QUIZ` | câu hỏi, nằm ở `data/quiz.json` (việc 7) | bài | nên có (`G-QUIZ-COV`) |
| `SCOPE` | nhãn phạm vi (`aware`/`skeleton`/`weeks`) | bài | không |
| `DELIV_MIN` | sàn phút cho cột deliverable | bài | không |
| `READONLY_OK` | bài bắt buộc được phép chỉ đọc (bài tra cứu) | bài | không |
| `COMPS` | 9 nhóm năng lực: `lessons`, `key`, `cap`, `evid` | bài | có, mọi bài thuộc ≥1 nhóm |
| `PORTFOLIO` | sản phẩm hiện trên trang chủ | bài | không |
| `PHASE_OUTCOME` | một câu "xong chặng này làm được gì" | chặng | theo chặng |
| `COMP_PHASE` | chặng → số hiệu nhóm năng lực | chặng | theo chặng |

- `mile` (ở `WEEKS` và `DAYS`) phải đi kèm `proof`: `milestoneDone()` chỉ báo "đã đạt" khi mọi bài trong
  `proof` ở mức cao nhất, nên mốc thiếu `proof` đứng ở "chưa đạt checklist" mãi mà không cổng nào bắt.
- Tiền tố id của bài theo `id` chặng (số hiển thị trong tiêu đề có thể khác, ví dụ `p3` hiện là "2 · Vòng đời dữ liệu"):

| `id` chặng | `p0` | `p1` | `p2` | `p3` | `p4` | `p5` | `p6` | `p7` | `p8` | `p9` | `p10` |
|---|---|---|---|---|---|---|---|---|---|---|---|
| tiền tố | `s-` | `t-` | `m-` | `d-` | `f-` | `ml-` | `dl-` | `q-` | `pr-` | `th-` | `r-` |

## Việc 1 · Thêm một bài

Trước khi gõ, trả lời bốn câu ở CLAUDE.md §6. Rồi:

1. `TREE`: thêm vào đúng chặng, đúng vị trí trong chặng. `★` đánh dấu bài xương sống; `r`/`x`/`d` là phút
   đọc, thực hành, làm ra sản phẩm, ba số riêng.
   ```js
   { id:'f-newthing', t:'★ Tên bài', r:30, x:15, d:20, p:'core' },
   ```
2. `<template data-node="f-newthing">`: chèn ngay sau khối của bài đứng trước nó, để đọc file từ trên xuống
   là đọc giáo trình theo thứ tự học (`G-ORDER`).
3. `PAYOFF`: `[0]` là kết quả cầm được (hiện ở đầu bài), `[1]` nói bài sau dùng nó làm gì. Rồi sửa `PAYOFF`
   của bài đứng trước: câu "bài sau…" của nó giờ trỏ sai bài.
   ```js
   'f-newthing': ['Sản phẩm cụ thể người học cầm được.', 'Bài sau dùng nó để…'],
   ```
4. `WEEKS`: thêm id vào `ids` của một tuần (`G-PLAN` chặn nếu bài không ở tuần nào); deliverable tuần nào
   cần bài này thì thêm vào `needs` của tuần đó.
5. `ACCEPT` nếu là bài bắt buộc có deliverable. Bài `core` không có `x`, `d` lẫn `ACCEPT` thì `G-PLAN` báo
   lỗi, trừ khi nằm trong `READONLY_OK` — chỗ đó chỉ cho bài tra cứu thật.
   ```js
   'f-newthing':[
     {k:'file',   v:'<code>src/x.py</code> tồn tại'},
     {k:'cmd',    v:'<code>python -m src.x</code> chạy không lỗi'},
     {k:'test',   v:'assert … pass'},
     {k:'result', v:'in ra … khớp …'},
     {k:'ask',    v:'Tự giải thích được vì sao …'},
   ],
   ```
6. `node tools/gate.mjs` phải qua, rồi `node tools/gate.mjs --write`.

## Việc 2 · Dời hoặc xoá một bài

Dùng bảng đầu file làm danh sách kiểm. Ba điều dễ quên nhất:

- vị trí trong `TREE` và vị trí `<template>` phải khớp nhau;
- sửa `PAYOFF` của cả bài trước và bài sau, không chỉ bài vừa dời;
- dời sang chặng khác thì đổi tiền tố id (một bài `pr-*` sang `p3` thành `d-*`) và sửa mọi chỗ nhắc id cũ.

Xoá bài thì ghi vào mục của phiên ở [HISTORY.md](../HISTORY.md) là mất gì.

## Việc 3 · Dời, thêm hoặc xoá một chặng

Số hiệu chặng nằm trong tiêu đề: `{ id:'p7', t:'8 · Các họ bài toán khác — chuyển giao kiến thức', kids:[…] }`,
và `TOC.md` in `t` nguyên văn.

| phải đổi | vì sao |
|---|---|
| vị trí khối chặng trong `TREE` | việc chính |
| số ở đầu `t` của mọi chặng bị xê dịch | dời chặng 7 xuống sau chặng 8 thì hai số đầu đổi chỗ |
| thứ tự `<template>` của mọi bài trong chặng bị dời | `G-ORDER` chặn |
| `WEEKS` | tuần đi theo thứ tự chặng |
| `DAYS` nếu chặng có bài trong fast track | `G-PLAN` chặn nếu giờ mỗi ngày ra ngoài 3,5–6,5 |
| `PAYOFF` của bài cuối hai chặng liên quan | câu "bài sau…" ở ranh giới trỏ sai |

- Giữ nguyên `id` chặng dù nó đổi vị trí: `PHASE_OUTCOME` và `COMP_PHASE` đánh theo `id`, nên khỏi sửa.
- Chặng mới phải khai đủ ba chỗ, thiếu một là `G-PLAN` chặn; rồi chọn tiền tố id cho bài và thêm bài vào `WEEKS`.
  ```js
  TREE          → { id:'p11', t:'11 · Tên chặng', kids:[…] }
  PHASE_OUTCOME → p11: 'Xong chặng này bạn làm được…'
  COMP_PHASE    → p11: [số hiệu nhóm năng lực]
  ```

## Việc 4 · Thêm một nhánh phụ

Popup là mặc định; ngăn phải chỉ khi người đọc cần thấy mạch chính trong lúc đọc nhánh phụ (CLAUDE.md §7).

- Popup (công thức, đào sâu, danh mục): đặt trong vùng popup, trước vùng `data-aside`, rồi mở từ bài bằng chip.
  ```html
  <template data-mathdef="khoa" data-title="Tiêu đề trên popup"><p>…</p></template>
  <button class="ds-math" data-math="khoa">Nhãn chip</button>
  ```
- Ngăn phải (bảng so sánh công cụ):
  ```html
  <template data-aside="cmp-x" data-title="…" data-sub="…">…</template>
  <button class="ds-aside" data-aside="cmp-x">Nhãn chip</button>
  ```
- `G-ORPHAN` chặn nhánh phụ không bài nào mở; `G-REF` chặn chip trỏ tới khoá không có.

## Việc 5 · Thêm một hình tương tác

1. Đăng ký hàm vẽ trong `VIZ` (`grep -n "^const VIZ"`): `VIZ.tenhinh = (el) => { /* dựng SVG + nút vào el */ };`
2. Gọi từ bài: `<div class="ds-viz" data-viz="tenhinh"></div>`.
3. Bắt buộc có `.ds-viz__alt`: mô tả bằng chữ chứa mọi thông tin của hình, cho trình đọc màn hình và bản in.
4. Mô tả nói hình dạng, hai đầu mút và kết luận, không đọc lại từng số (`G-DUMP`); số thô, nếu cần, để trong `<desc>` của SVG.
5. Màu lấy từ token (`var(--wb-fg)`, `var(--wb-border-strong)`…), không gõ mã màu; SVG dùng `width:100%`.
6. Chạy `node tools/viz-check.mjs`.

## Việc 6 · Thêm một cổng

Xem [gates.md](gates.md), mục *Thêm một cổng*, và bảng thoát cửa ở đó.

## Việc 7 · Thêm hoặc sửa câu hỏi trắc nghiệm

Câu hỏi ở `data/quiz.json`, không trong HTML: khoá là id bài, giá trị là mảng câu. Cả hai trang fetch
đúng file này lúc chạy, nên sửa JSON là cả hai đổi ngay; `tools/` đọc nó qua `read-html.mjs` → `readQuiz()`.
Carousel trông và hành xử thế nào: [design.md §10](design.md).

```json
"f-cyclic": [
  { "q": "Vì sao mã hoá giờ bằng sin/cos thay vì để số 0–23?",
    "o": ["Để giảm số cột", "Để 23h và 0h nằm cạnh nhau trong không gian feature",
          "Vì cây quyết định bắt buộc", "Để chuẩn hoá về [0,1]"],
    "a": 1,
    "why": "23 và 0 xa nhau trên trục số nhưng liền nhau trong ngày; sin/cos đặt chúng cạnh nhau." }
]
```

- JSON thuần; file ghi một câu một dòng để diff đọc được.
- `q`: HTML inline `<code>`, `<b>`, `<i>` được, không `$…$` (popup roadmap không có KaTeX) — ký hiệu toán
  viết bằng Unicode. `o`: 2–6 lựa chọn. `a`: chỉ số 0-based, trong `0..o.length−1`. `why`: bắt buộc.
- Chỉ hỏi thứ có trong bài; phủ kiến thức chính, không mẹo vặt; đúng một đáp án đúng; mồi nhử là hiểu
  nhầm thật, lý tưởng là cái bài nêu ra để sửa.
- Bao phủ (DS-010): mỗi mục `h2`/`h3` của mạch chính ít nhất một câu, mỗi tiêu chí `ACCEPT` ít nhất một câu.
  Số câu theo bài, không theo định mức (`G-QUIZ-COV`).
- Phạm vi dừng ở mạch chính: không hỏi nội dung popup hay ngăn phải. Khối `data-viz` thì có hỏi — trường
  `wrong:` của nó chính là hiểu nhầm bài muốn gỡ.
- Không hỏi con số phải nhớ (phiên bản thư viện, số lớp của GPT-3), cú pháp thuần tuý, danh mục tra cứu. Bài
  tra cứu (`r-*`) hỏi quyết định và phân biệt, không hỏi thuộc lòng.
- Câu hỏi buộc người đọc hiểu mới trả lời được (DS-011): hỏi tình huống phải áp dụng, không hỏi lại chữ trong bài.
- Sửa câu nào chỉ sửa câu đó. Đừng chuẩn hoá escape cả file, và đừng `sed` cụm "theo bài": phần lớn câu có
  cụm đó đã là câu tình huống.
- Rải vị trí đáp án đúng về ~25% mỗi ô. Giải thích gọi lựa chọn bằng nội dung, không bằng vị trí (`G-QUIZ-POS`).
- Độ dài lựa chọn và các cổng quiz khác: [gates.md](gates.md), mục *Quiz*.
- Xong: `node tools/gate.mjs`, rồi mở trang xem carousel chạy hết một vòng (chọn → chấm → làm lại) ở cả hai
  chế độ. Chỉ build lại `roadmap.html` khi số câu của một bài đổi (nút trong ngăn tóm tắt in số đó) hoặc khi
  sửa module carousel.

## Class CSS hay dùng

Token và component `wb-*` đến từ [web-builder](../../../web-builder/); `ds-*` là của riêng trang này.

| việc | class |
|---|---|
| khối code | `<div class="ds-code">` (nút sao chép tự thêm) |
| nhãn trên khối code | `<p class="ds-codecap">` |
| chip mở popup, mở ngăn phải | `<button class="ds-math" data-math="…">`, `<button class="ds-aside" data-aside="…">` |
| hình tương tác, mô tả bằng chữ | `<div class="ds-viz" data-viz="…">`, `<p class="ds-viz__alt">` |
| chú thích nhạt | `<p class="wb-help">` |
| cảnh báo | `<div class="wb-alert wb-alert--danger\|warning">` |
| thẻ | `<div class="wb-card"><div class="wb-card__body">` |
| bảng | bọc `<div class="wb-table-scroll">` |
| loại phát biểu | `<span class="ds-claim ds-claim--fact\|quota\|judgment">` |
| nguồn | `<ul class="ds-srclist">`, `<p class="ds-srcline">` |

- Không đặt `max-width` mới (`G-MEASURE`); mép phải do `--ds-measure` quyết định.
- Sửa phần bảng tràn ra hai bên: đọc ba cái bẫy ở design.md §2 trước.
