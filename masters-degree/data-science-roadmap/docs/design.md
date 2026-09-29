# Luật thiết kế của trang

File này trả lời: một khối nội dung hay một nút trông thế nào, nằm ở đâu. Chỉ ghi trạng thái hiện tại (DS-033).

- Đổi cái này thì phải đổi gì nữa: [editing.md](editing.md). Giải thích cho người đọc hiểu: [writing.md](writing.md).
- Luật bắt buộc: [../CLAUDE.md](../CLAUDE.md). File này không lặp lại §7 (ba tầng trình bày) và §10 (một mép phải).
- Chủ trang chốt gì: mã `DS-…` ở [../DECISIONS.md](../DECISIONS.md).

## 0. Luật áp cho cả trang

Mọi con số nằm ở một khối `:root` duy nhất đầu `<style>`; mọi thứ khác suy ra bằng `calc()`.

| token | mặc định | là gì |
|---|---|---|
| `--ds-measure` | 1060px | khổ chữ và bề rộng cột (§0.3) |
| `--ds-wide` | 1260px | bảng được tràn tới đây (§2) |
| `--ds-side` | 330px | `.wb-shell__side`, chỉ để tính chỗ trống |
| `--ds-gutter` | 20px | lề ngang `.wb-container--pad` |
| `--ds-fs` | `clamp(14px, …, 15px)` | cỡ chữ thân bài, gốc của thang `--ds-t-*` |
| `--ds-t-*` | 9 bậc × `--ds-fs` | thang chữ `hero h1 h2 h3 body sub code cap label` (§0.2) |
| `--ds-sp-*` | 7 bậc, 4→44px | thang khoảng cách (§0.6) |
| `--ds-ctl*` | 30 / 26 / 24px | cỡ nút vuông-tròn (§0.7) |
| `--ds-aside-w` | 1/3 cửa sổ | bề rộng ngăn phụ, kéo được (§1.2) |
| `--ds-dock-w` | 1/4 cửa sổ | bề rộng dock `Notes`, kéo được (§0.5) |
| `--ds-zoom` | 1 | không zoom; token giữ cho luật đơn vị viewport (§0.4) |
| `--ds-vh` / `--ds-vw` | `1dvh` / `1dvw` ÷ zoom | 1% cửa sổ thật (§0.4) |

Muốn nới trang thì sửa `--ds-measure` và `--ds-fs` cùng lúc, và hỏi chủ trang trước (DS-014).

### 0.1 Lớp vỏ trang: nói tiếng gì, cao bao nhiêu

Thuật ngữ trong bài giữ tên gốc theo `CLAUDE.md` §11. Lớp vỏ chia vùng:

| vùng | tiếng | gồm |
|---|---|---|
| thanh trên | Anh | nhãn nút, phụ đề thương hiệu, `title=`, `aria-label`, chữ do JS sinh (`syncNotesCount`) |
| chân trang | Anh | dòng credit và link "← Back to home" (DS-016) |
| hero của `roadmap.html` | Anh | `.rm-hero__h`, `__sub`, `__stats`, `__note` (DS-017) |
| lớp vỏ còn lại | Việt | thanh bên, `<title>`, `<meta description>`, nhãn ô tìm kiếm, tiêu đề popup và ngăn phụ, mọi `aria-label` ngoài thanh trên |

- Vùng tiếng Anh của `roadmap.html` là thanh trên, hero và chân trang (`.rm-foot`). Đừng dịch hero sang tiếng Việt.
- Sửa hero ở `tools/build-roadmap.mjs` rồi chạy lại nó; `roadmap.html` là file sinh.
- Số trong `__stats` dùng dấu thập phân kiểu Anh (dấu chấm).
- Ngoại lệ duy nhất ngoài thanh trên: panel ghi chú tên là `Notes`, cả ở nút thanh trên lẫn tiêu đề dock.
- Mọi câu nói về panel đó là tiếng Việt và dùng từ "ghi chú", không dùng "sổ" ("Tải ghi chú về máy").
- Tên cơ chế (`LEARNING-LOG.md`, `## Sổ`, `learn.mjs --sync`) giữ nguyên: đó là đường dẫn và cú pháp file.
- Đổi một từ ở lớp vỏ thì đổi luôn trong bài (`CLAUDE.md` §11). `khối lượng` kèm tên tiếng Anh đúng một lần ở trang chủ.
- Tên ligature của icon (`search`, `edit_note`) được phép ở vùng tiếng Việt: đó là nội dung của font icon.
- Tự kiểm trong console: `document.querySelector('.wb-navbar').innerText` không còn tiếng Việt,
  `document.querySelector('.ds-rail').innerText` không còn tiếng Anh.
- Mọi ô trên thanh trên (nút-logo, chip %, `Notes`, `Light`/`Dark`) cao đúng `--ds-navctl` (30px).
- `align-items: center` một mình không đủ: mắt đọc mép trên và mép dưới của từng ô, không đọc tâm.
- Mỗi ô `box-sizing: border-box`; kit không đặt border-box toàn cục, thiếu nó thì viền cộng thêm 2px.
- Phụ đề thương hiệu canh giữa, không canh chân chữ, có vạch ngăn (`Data Science │ Roadmap`), cùng hình `Notes │ 3`.
- `--ds-navctl` khai ở `.wb-navbar`, không ở `:root`: nó là số của lớp vỏ, `:root` giữ đại lượng của khổ trang.

### 0.2 Một thang chữ, khai theo loại nội dung

Mọi cỡ chữ trong cột bài trỏ vào một bậc có tên. Thang có ba tầng:

```
tầng 1  :root ⑧      9 bậc theo loại nội dung, tất cả = calc(--ds-fs × k)
                     hero 1,72 · h1 1,5 · h2 1,28 · h3 1,12 · body 1
                     sub ,92 · code ,88 · cap ,84 · label ,78
tầng 2  #main        cả 8 token chữ của kit nối vào tầng 1
tầng 3  #main .wb-*  component nào kit ghi px cứng thì kéo về tầng 1, một dòng mỗi loại
```

- Thiếu tầng 3 là có hai hệ chữ trong một cột: kit ghi px cứng ở nhiều chỗ, chỉ 8 token chữ là đọc được.
- Thứ bậc đúng ở mọi giá trị `--ds-fs`, nên đổi cỡ chữ là đổi một token.
- Hai bậc liền kề cách nhau 1,07–1,17×: chỉ tiêu đề mới được to hẳn.
- Bậc thấp nhất phân biệt bằng độ đậm và màu, không bằng cỡ. `h4` = cỡ thân bài + in đậm.
- Cùng loại nội dung thì cùng bậc: `.ds-obj__v` (đầu bài) và `.ds-gain__v` (hộp kết bài) là cùng một câu
  (`CLAUDE.md` §9), cùng `--ds-t-h3`.
- Trong cột bài không viết px cứng, `em` hay `ch`. Px cứng chỉ đúng ngoài `#main` (lớp vỏ).
- `ch` co theo `font-size`, nên `h2` và `<p>` cùng `74ch` ra hai mép lệch nhau.
- Thêm một loại nội dung → thêm một bậc ở ⑧ rồi trỏ vào. Thêm một component kit vào bài → thêm một dòng ở tầng 3.
- Một bậc, một tên: rule chỉ trong cột bài dùng `--ds-t-*`; rule chỉ ở lớp vỏ dùng `--wb-text-*` (px của kit);
  rule trải cả hai lớp dùng `--wb-text-*` để tầng 2 tự đổi theo ngữ cảnh. Rule duy nhất thuộc loại thứ ba:
  `.ds-keyhint kbd, .ds-prose kbd, .ds-notes kbd`.
- `em` chỉ cho thứ phải co theo phần tử chứa. Hai chỗ đúng, đừng đổi: `code:not(pre code)` (.88em: code trong
  `<th>` nhỏ như `<th>`) và `.ds-brand__sub` (.8em, lớp vỏ).
- `em` trong custom property luôn sai: nó được giải ở chỗ dùng, nên hai lớp lồng nhau nhân dồn.
- Sửa thang xong thì đếm lại số cỡ chữ. Mục tiêu: ≤ ~10 cỡ, trải ≤ 2×.

```js
const seen = new Map();   // mọi phần tử trong cột bài có text trực tiếp, gom theo cỡ chữ
document.querySelectorAll('#main *').forEach(el => {
  if (!el.offsetHeight) return;
  let direct = ''; el.childNodes.forEach(n => { if (n.nodeType === 3) direct += n.nodeValue.trim(); });
  if (direct.length < 3 || el.closest('.wb-ico')) return;   // icon là thang riêng của kit
  const fs = parseFloat(getComputedStyle(el).fontSize);
  const cls = (el.className || el.tagName).toString().split(' ')[0];
  if (!seen.has(cls + fs)) seen.set(cls + fs, cls + ':' + fs);
});
const sizes = [...new Set([...seen.values()].map(v => +v.split(':')[1]))].sort((a, b) => b - a);
console.log(sizes.length, 'cỡ · trải', (sizes[0] / sizes.at(-1)).toFixed(2) + '×', sizes);
```

### 0.3 Cột 1060px, chữ 15px — muốn đổi thì hỏi

`ký tự/dòng ≈ --ds-measure ÷ (0,46 × --ds-fs)`. 0,46em là bề rộng một chữ tiếng Việt trong font này, ổn định qua
mọi cỡ.

- Biết hai đại lượng là cái thứ ba bị quyết định. Khoảng khuyến nghị của typography là 45–90 ký tự/dòng.
- Cấu hình đang dùng ưu tiên, theo thứ tự: cột rộng hết chỗ (cột hẹp thì bảng tràn lệch hẳn sang trái), rồi chữ
  nhỏ (15px thân bài).
- Hệ quả: 152 ký tự/dòng ở cửa sổ 1440px, vượt trần 90. Đó là lựa chọn có chủ ý (DS-014).
- Đừng hẹp cột lại hay phóng chữ to để "sửa" con số đó. Muốn đổi thì hỏi chủ trang.
- Thứ duy nhất được nới để bù dòng dài: `line-height` của `p`/`li` = 1,8.
- Ở 375px trang tự về trong khoảng 45–90; không cần luật riêng cho điện thoại.
- Suy ra từ `--ds-measure` và `--ds-fs`: `--wb-container-max`; alias `--wb-measure` và `--wb-measure-tight`
  (thiếu cái sau thì đoạn intro trang chủ kẹt ~586px); cả 8 token chữ của kit và các component kit ghi px cứng;
  bậc tiêu đề; cỡ chữ bảng; `--ds-bleed` (mức tràn mỗi bên của bảng, `clamp()` trên `100 * --ds-vw`).

Đổi đúng một token `--ds-measure` thì ra (cửa sổ 1440px):

| `--ds-measure` | ký tự/dòng | trống bên phải chữ |
|---|---|---|
| 1060px (đang dùng) | 152 | 0 |
| 900px | 130 | 160px |
| 740px | 107 | 320px |
| 620px | 90 (đúng trần) | 440px |

- Mẫu đo: đoạn văn và gạch đầu dòng ở mạch chính. Bỏ dòng cuối của mỗi đoạn: nó luôn dở, kéo trung vị xuống.
- In chuỗi của từng dòng ra để kiểm chính cái thước. Tách dòng bằng rect từng ký tự, ngưỡng 4–6px.
- Ghi số đo vào tài liệu thì ghi cả mẫu đã dùng, và sửa cả khối chú thích đầu `<style>`.

```js
const el = document.querySelector('#main .ds-prose > p, #main .ds-prose > ul > li');
const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
let node, lastTop = null, lines = [''];
while ((node = w.nextNode())) for (let i = 0; i < node.nodeValue.length; i++) {
  const rg = document.createRange(); rg.setStart(node, i); rg.setEnd(node, i + 1);
  const rc = rg.getBoundingClientRect();
  if (!rc.height) continue;
  if (lastTop === null) lastTop = rc.top;
  if (rc.top > lastTop + 4) { lines.push(''); lastTop = rc.top; }
  lines[lines.length - 1] += node.nodeValue[i];
}
console.log(lines.map(s => s.length), lines);   // đọc chuỗi, đừng chỉ tin con số
```

### 0.4 Không zoom (`--ds-zoom: 1`), vẫn giữ token

- Trong trang này không viết `vh`/`vw`/`dvh`/`dvw` trần; dùng `--ds-vh` / `--ds-vw`. `gate.test.mjs` có ca canh.

```css
--ds-vh: calc(1dvh / var(--ds-zoom));   /* 1% chiều cao cửa sổ thật */
--ds-vw: calc(1dvw / var(--ds-zoom));   /* 1% chiều rộng cửa sổ thật */
```

- Gốc là `dvh`/`dvw`: trên điện thoại cửa sổ thật co giãn theo thanh địa chỉ, còn `vh` đứng yên theo cửa sổ lớn
  nhất (thanh bên dạng drawer dưới 900px sẽ hở mép dưới).
- `--wb-shell-h` của kit được ghi đè bằng token này; `.wb-drawer` sửa ở lớp, nên ngăn phụ lẫn dock cùng đúng.
- Media query cũng so với viewport ÷ zoom. `gate.test.mjs` in danh sách ngưỡng mỗi lần chạy; thêm ngưỡng thì
  kiểm lại con số.
- Đừng bật lại `zoom`: nó nhân mọi px cứng của kit xuống (nhãn 11px ra 9,9px), không điều chỉnh đơn vị viewport
  (thanh bên, ngăn phụ, dock cụt đáy), và đẻ ra hai hệ toạ độ px (`getBoundingClientRect()`/`clientX` sau zoom,
  `getComputedStyle().width` cục bộ) làm tay kéo nhảy.
- Giữ token vì luật trên bám vào nó; với `--ds-zoom: 1` thì `--ds-vh` = `1dvh`.
- Từ chuột vào CSS thì chia zoom, từ CSS ra chuột thì nhân (`dsZoom()` trong `makeEdgeResizer()`). Với zoom = 1
  hai hệ trùng nên code sai chiều không lộ; giữ đúng chiều.

### 0.5 `Notes` là tầng thứ tư: dock, không phải lớp phủ

Ba tầng ở `CLAUDE.md` §7 là chỗ đọc, nên là lớp phủ. `Notes` là chỗ viết về cái đang đọc: mở ra thì trang vẫn
cuộn, bấm, chọn chữ được (DS-023). Ba việc giữ nó là dock, thiếu một là nó thành lớp phủ:

1. `wb-overlay--pass`: không làm tối nền, không nhận chuột (con của nó nhận lại).
2. Không `inert` nền, không nhốt tiêu điểm, không `aria-modal`: ba thứ đó là định nghĩa của modal.
3. Thân trang nhường đúng `--ds-dock-w` (`body.ds-dock-on`), nên dock không đè chữ. Dưới 1200px hết chỗ nhường:
   dock nằm đè.

- `Notes` không nằm trong `LAYER_IDS`: Esc chỉ đóng nó khi không còn popup nào mở, bấm ra ngoài không đóng nó,
  mở popup toán không làm mất nó.
- Bề rộng mặc định 1/4 cửa sổ, do CSS tính: `clamp(300px, calc(25 * var(--ds-vw)), 640px)`.
- Mọi ngăn kéo được (dock `Notes`, ngăn phụ) kéo trong khoảng 1/4 → 1/2 cửa sổ (DS-022): `makeEdgeResizer({minRatio:
  .25, maxRatio: .5})`, kèm sàn px cứng (280 / 340) cho cửa sổ hẹp.
- Kéo thì JS ghi `--ds-dock-w` bằng px cục bộ và lưu `localStorage['ds.dockW']`.
- Reset (nhấn đúp tay kéo, hoặc Enter/Space khi nó có tiêu điểm) = xoá khoá đó, không ghi lại 25%.
- Đọc bề rộng bằng `getComputedStyle(dock).width`, không bằng `getBoundingClientRect()` (rect ra 0 khi dock đóng).
- Tay kéo là `<div role="separator" tabindex="0">` có `aria-valuemin/max/now/valuetext`. Bàn phím đổi được:
  ←/→ 16px, Shift ×4, Home/End về hai đầu.
- Hình tay kéo (`.ds-grip`): một viên 5×44px luôn thấy ở giữa mép trái, vùng bấm 13px.
- Hover, tiêu điểm, đang kéo: đổi màu và chiều cao. Đừng đổi bề rộng hay `left` (tay nắm nhảy ngang).
- Tay kéo luôn thấy và có `title` riêng, nên phụ đề dock không nói lại rằng mép trái kéo được.

#### Bố cục panel

Panel hẹp (300–640px), nên mọi thứ giành nhau bề rộng:

1. Gom nhóm theo bài, không lọc theo bài đang mở (DS-023): vẫn hiện hết. Tiêu đề nhóm là tên bài (link mở bài;
   bấm thì giữ panel mở), kèm số ghi chú và số chỗ tắc. Nhóm xếp theo ghi chú mới nhất; trong nhóm, mới nhất trước.
2. Hàng phẳng ngăn bằng một vạch, không phải thẻ. Chữ ghi chú là thứ đậm nhất.
3. Mỗi ghi chú hai hàng: hàng meta `loại · thời điểm · [sửa] [xoá]`, rồi chữ ghi chú. Đừng gộp vào một hàng
   `flex-wrap: wrap` (dấu `·` treo ở đầu hay cuối dòng). Tên bài dài cắt bằng "…".
4. Không nhãn cho loại mặc định: `tắc` và `gỡ` có điểm màu kèm chữ; `ghi` không nhãn.
5. Sửa/xoá chỉ hiện khi hover hoặc `:focus-within`; `@media (hover: none)` cho hiện sẵn. Nút xoá đã lên nòng
   thì luôn thấy (`:has(.is-armed)`).
6. Ô ghi `resize: none`, tự cao dần bằng JS.

- Chữ hướng dẫn: một câu ở phụ đề dock, một câu gợi ý mỗi khối, và chỉ nói thứ bố cục không tự nói.
- Khối "Đưa vào repo" là hai bước; hai nút xếp theo thứ tự đã nói ra điều đó, đừng đánh số vào nhãn.
- Số ghi chú trên nút thanh trên không phải badge: một con số sau nhãn, ngăn bằng vạch mảnh (`Notes · 3`).
- Đừng tô màu con số theo "có chỗ tắc": nó là tổng ghi chú. Số chỗ tắc nói ở tiêu đề mục "Đã ghi" và tooltip.

### 0.6 Một thang khoảng cách, khai theo quan hệ

Chỗ dùng hỏi "hai khối này liên quan thế nào", không hỏi "mấy px". Bảy bậc ở `:root` ⑨:

| token | px | dùng cho quan hệ |
|---|---|---|
| `--ds-sp-hair` | 4 | nhãn ↔ giá trị của nó, trong cùng một khối |
| `--ds-sp-tight` | 6 | giữa hai `<li>`; tiêu đề mục con ↔ thân nó |
| `--ds-sp-near` | 8 | tiêu đề ↔ thân nó |
| `--ds-sp-text` | 14 | giữa hai đoạn văn — nhịp nền của bài |
| `--ds-sp-block` | 20 | văn ↔ một khối: code, bảng, viz, alert, hàng chip |
| `--ds-sp-sub` | 28 | giữa hai mục con (kit gọi `--wb-block-gap`) |
| `--ds-sp-sec` | 44 | trước một tiêu đề mục (kit gọi `--wb-section-gap`) |

- Nhịp rời rạc đọc ra "trang xộc xệch". `.wb-alert` của kit không có margin; không khai thì alert dán sát khối dưới.
- Chỗ khai nhịp là trang, không phải kit. Nhịp "khối ↔ khối kế tiếp" khai một danh sách gộp trong `<style>`
  (`.ds-prose > .wb-alert, … { margin-bottom: var(--ds-sp-block) }`); thêm một loại khối thì thêm tên nó vào đó.
- Ranh giới: `margin` giữa hai khối anh em thì lên thang; `padding` trong lòng một component thì không.
- Ngoài thang, có chủ ý: `padding` của component (hình dạng của nó, như `7px 10px` của `.ds-leaf`) và nhích quang
  học ≤5px bên trong component.
- `margin` dọc còn px trần trong `<style>` thì `G-SPACING` nhắc; buộc phải px trần thì ghi `/* gate:sp: lý do */`.
- Sửa nhịp xong thì đếm lại. Mục tiêu: ≤ 7 nhịp, không có nhịp 0px.

```js
const ids = [...document.querySelectorAll('template[data-node]')].map(t => t.dataset.node);
const hist = {};   // mọi cặp khối anh em liền nhau trong cột bài, gom theo khoảng cách thật
for (const id of ids) {
  location.hash = '#/' + id; render();
  const k = [...document.querySelectorAll('#main .ds-prose > *')];
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i].getBoundingClientRect(), b = k[i + 1].getBoundingClientRect();
    if (!a.height || !b.height) continue;
    const g = Math.round(b.top - a.bottom); hist[g] = (hist[g] || 0) + 1;
  }
}
console.log(Object.keys(hist).length, 'nhịp', hist);
```

### 0.7 Cỡ nút vuông/tròn: `--ds-ctl` ba bậc

Ô có chiều cao bằng chiều rộng thì một token lo cả hai. Cùng một vai thì cùng một bậc; đừng gõ số rời.

- `--ds-ctl` 30px: mốc stepper, nút sao chép. `--wb-steps-size` của kit nối vào đây, nên mốc stepper và nút trong
  bài không lệch nhau.
- `--ds-ctl-sm` 26px: nút nhỏ trên thanh trên và trong dock. `--ds-ctl-xs` 24px: logo.

## 1. Nội dung chính và nội dung phụ — cách phân biệt

Quyết định đầu tiên cho mọi khối nội dung mới. Chính hay phụ, và phép thử `ACCEPT`: `CLAUDE.md` §7. Nội dung chính
hiện đầy đủ trên trang, không gập, không click. Nội dung phụ chọn vật chứa:

| vật chứa | dùng khi | vì sao |
|---|---|---|
| popup `data-math` (mặc định) | đọc xong là xong | ở giữa màn hình; đóng lại là về đúng chỗ đang đọc |
| drawer `data-aside` (ngoại lệ, có lý do) | phải đọc song song với mạch chính | bảng so sánh công cụ đang phải chọn (`cmp-*`); bộ câu hội đồng đọc cạnh dàn ý slide (`qbank`) |
| dock (tầng thứ tư) | viết về cái đang đọc | hiện chỉ có `Notes`; không chặn trang (§0.5) |
| `<details>` / gập tại chỗ | không bao giờ | đẩy nội dung phía dưới nhảy xuống; `G-NO-DETAILS` chặn |

- Chọn drawer chỉ khi trả lời được: vì sao người đọc cần thấy mạch chính phía sau trong lúc đọc cái này?

Dấu hiệu một khối là nội dung phụ:

1. So sánh ≥2 sản phẩm cụ thể (LightGBM vs XGBoost, chọn bộ dữ liệu nào) → drawer.
2. Danh mục lỗi, bảng thông báo lỗi → popup, trừ khi chính danh mục đó là sản phẩm của bài (`PAYOFF[id][0]` gọi
   tên nó): bảng chẩn đoán đường cong loss của `dl-train` ở lại mạch chính.
3. "Ba cách, chỉ dùng cách 1" → mạch chính giữ cách dùng thật, hai cách kia vào popup.
4. Tự khai là không cần thiết ("chưa cần", "có thể bỏ qua", "đọc thêm") → phụ. `G-LAYER` bắt tiêu đề kiểu này.
5. Paper, lịch sử, tên riêng để biết → popup.
6. Code đầy đủ của một file mà mạch chính chỉ cần 5 dòng cốt lõi → popup.

- Rút quá nhiều vào popup thì mạch chính rỗng. Ngoại lệ: hai bài tra cứu `s-lookup`, `r-stack` là index, có chủ ý.
- Phép thử cuối: đọc hết mạch chính mà không mở popup nào. Đoạn nào chỉ hiểu được sau khi mở popup thì phần thiếu
  thuộc mạch chính — kéo nó lên.

### 1.1 Hình dạng của chip mở nhánh phụ

Hai loại chip cùng hình (viên nét đứt: bấm được, không bắt buộc), khác nhau ở dấu đầu:

| chip | dấu | nói gì |
|---|---|---|
| `.ds-math` → popup | `∑` | trong này là công thức |
| `.ds-aside` → drawer | `chevron_right` | đi tới một ngăn trượt ra bên phải |

- Không dùng `+`: nó đọc ra là "thêm một cái nữa", mà chip không thêm gì.
- Nét đứt giữ nguyên lúc hover: nó là nghĩa của chip. Hover chỉ đổi nền và màu viền; rule `:hover` của chip không
  chứa `border-style`.

### 1.2 Bề rộng của drawer: 1/3 cửa sổ, kéo được, và khoá cuộn trang (trang chính) / nhường chỗ (roadmap)

- Bề rộng mặc định là tỉ lệ cửa sổ, không px cứng: `--ds-aside-w` = 1/3 (token ⑪). Kéo trong khoảng 1/4 → 1/2,
  cùng luật với dock (§0.5, DS-022).
- Kéo ở mép trái bằng đúng `.ds-grip` và `makeEdgeResizer()` của dock: hai ngăn, một cơ chế. Không dùng
  `setPointerCapture`.
- Ngăn phủ thì khoá cuộn trang, vì `inert` không chặn bánh xe chuột: `html.ds-scrolllock { overflow: hidden }`.
- `scrollbar-gutter: stable` đặt vô điều kiện ở `html`, không đặt kèm lúc khoá (nội dung sẽ nhảy ngang).
- Dock `Notes` không khoá cuộn (§0.5).
- Ngăn của `roadmap.html` không phủ (DS-027): không lớp mờ, không đóng khi bấm ra ngoài, không khoá cuộn,
  `aria-modal="false"`; chỉ ✕ và Esc đóng. Đổi một trong bốn thứ đó thì đổi cả bốn.
- Thân `roadmap.html` nhường đúng bề rộng ngăn: `html.rm-open body { padding-right: var(--rm-drawer-w) }`, và
  `.rm-main` (`margin: 0 auto`) tự căn giữa trong phần còn thấy. Đặt trên `<body>` để navbar sticky cũng ngắn lại.
- Ở ≤680px ngăn roadmap rộng `100vw`, nên rule nhường chỗ phải huỷ (`padding-right: 0`).
- `--rm-drawer-w` đang là 47% cửa sổ, còn DS-026 ghi 1/3: đang chờ chủ trang chọn (`HANDOFF.md`).
- Trang chính giữ lớp phủ và khoá cuộn cho ngăn phụ: ở đó nhánh phụ đọc song song với một bài; ở roadmap, danh
  sách phía sau chính là thứ đang được duyệt.
- Cả hai ngăn dùng đúng `wb-drawer` của kit (§33), kể cả đầu ngăn: `wb-drawer__head`, `wb-drawer__title`,
  `wb-drawer__sub`, `wb-close`. Class riêng (`.ds-drawer`, `.rm-drawer`) chỉ để ghi đè; đừng tự vẽ thanh đầu
  ngăn thứ hai (DS-028).
- `wb-close` lấy dấu ✕ từ icon font của kit (`\e5cd`), không phải ký tự văn bản.
- Nền ngăn là `--wb-canvas` (nền trang), không phải `--wb-surface` (DS-028). Khai ở `.ds-drawer` và `.rm-drawer`;
  đổi một bên thì đổi cả bên kia.
- Đầu ngăn có dòng phụ thì cao theo nội dung; không có dòng phụ thì cao đúng `--wb-navbar-h` (DS-028). Dòng phụ
  đang có ở đâu thì giữ ở đó.
  - Neo vào `--wb-navbar-h`, đừng viết 56px.
  - Kể cả hai dạng "không có": thiếu hẳn thẻ (`:not(:has(…__sub))`) và thẻ rỗng (`:has(…__sub:empty)`, vì
    `#asideSub` luôn có trong markup).
  - Ghi đè `align-self` của `.wb-close` để dấu ✕ nằm giữa thanh.
  - Rule khai một bản ở `data-science-roadmap.html`; `build-roadmap.mjs` trích sang (`headCss()`), `pickCss` ném
    lỗi nếu không trích được gì.
  - Hiện cả ba đầu ngăn đều có dòng phụ; luật này dành cho ngăn sau.
  - Popup toán (`.wb-modal__head`) không thuộc luật này: yêu cầu chỉ nói "nav trong drawer".
- `[hidden]` trên một `.wb-drawer` đứng một mình không ẩn nó: kit khai `.wb-drawer { display: flex }`, thắng
  `[hidden]` của trình duyệt. Ngăn nào đứng ngoài `.wb-overlay` thì tự khai `[hidden] { display: none }`.

## 2. Khổ chữ: một mép phải

Luật ở `CLAUDE.md` §10 (DS-013). Token ở đầu §0, thang chữ §0.2, cột §0.3.

- Đừng đặt `max-width` cứng: cột nội dung đã đúng bằng khổ chữ. `G-MEASURE` nhắc.
- Bảng là khối duy nhất được tràn ra hai bên, tới `--ds-wide` (qua `--ds-bleed`). Code, card, alert, hộp kết bài
  dừng ở mép chữ.
- Chỉ bảng, vì bảng rộng tự nhiên (trung vị ~844px) còn code hẹp (~587px): cho code tràn thì mất mép chung mà
  được rất ít.
- Muốn nới trang: §0.3. Cỡ chữ trong `#main`: §0.2.

Ba cái bẫy khi sửa phần tràn của bảng:

1. Kit đặt `.wb-table-scroll { width: 100% }`, nên phải ép `width: auto` (width cố định thì margin âm chỉ đẩy
   khối lệch).
2. Rule tràn phải là con trực tiếp `>` và đứng sau `.ds-prose .wb-table-scroll { margin: 0 0 16px }`: shorthand
   `margin` đặt sau xoá `margin-inline` đặt trước.
3. Drawer và popup phải `--ds-bleed: 0px`: không có chỗ trống hai bên để tràn.

## 3. Dùng component nào

Trang dựng trên `../../web-builder/web-builder.css`. Tra kit trước khi tự viết CSS.

| cần gì | dùng |
|---|---|
| nhãn trạng thái, chip nhỏ | `wb-cap` (+ `--success` / `--warning` / `--dashed` / `--sm`) |
| nút | `wb-btn` (+ `--sm` / `--ghost` / `--outline` / `--danger`) |
| nút bật/tắt trong một nhóm | `wb-btn wb-btn--sm ds-lvlbtn`, bật thì thêm `is-active` (§4) |
| hộp thông tin có màu trạng thái | `wb-alert wb-alert--info` / `--warning` / `--danger` |
| thẻ | `wb-card`; `wb-card--flat` khi muốn nó đọc như chỗ nghỉ, không phải cảnh báo |
| bảng | `wb-table-scroll` bọc `<table>` (khối duy nhất được tràn) |
| icon | `wb-ico`, chữ bên trong là tên ligature Material Symbols (`content_copy`, `edit_note`, `download`) |
| xếp ngang có khoảng cách | `wb-cluster` |
| popup / drawer | `wb-modal` / `wb-drawer` trong một `wb-overlay` |
| một chuỗi bước có thứ tự | `wb-steps` — luôn luôn |

- Mọi chuỗi bước có thứ tự dùng `wb-steps` (kết quả ở trang chủ, các chặng, lịch 14 ngày). Đừng tự vẽ số trong
  vòng tròn: thiếu đường nối dọc thì người đọc không thấy đó là một chuỗi.
- Stepper: mốc canh giữa dọc với tiêu đề của bước, chữ phụ nằm ngay dưới tiêu đề. Áp cho mọi stepper.
- Cách làm: `display: grid` trên item, `display: contents` trên `.wb-steps__content` để tiêu đề và chữ phụ thành
  hai hàng thật, rồi `align-self: center` mốc với hàng đầu. Đo lệch tâm phải ra 0, ở 1440px và 375px.
- Đừng dựa vào `padding-top: 4px` của kit: nó chỉ đúng cho tiêu đề một dòng ở một cỡ chữ.
- Kit khai `gap: 14px` (cả hai trục), nên phải `row-gap: 0`.
- Khoảng tiêu đề ↔ chữ phụ đặt ở margin-trên của chữ phụ, không ở margin-dưới của tiêu đề (`align-self: center`
  canh hộp lề).

Ba token hay gõ sai (không có trong kit; CSS im lặng bỏ qua dòng đó):

| gõ sai | đúng |
|---|---|
| `--wb-bg` | `--wb-canvas` (nền trang) hoặc `--wb-surface` (nền thẻ) |
| `wb-btn--solid` | không tồn tại; `wb-btn` mặc định đã là nút đặc màu tối |
| `wb-segmented` | không tồn tại; dùng `ds-lvlbtn` + `is-active` |

- Tự kiểm: `grep -c -- "--wb-canvas" ../../web-builder/web-builder.css`. Ra 0 là không tồn tại.
- Đừng chồng hai variant của kit cùng đặt một thuộc tính: `wb-btn--ghost` + `wb-btn--danger` lúc hover ra icon đen
  trên nền đỏ (`.wb-btn--ghost:hover` 0-2-0 thắng `.wb-btn--danger` 0-1-0).
- Cần nút hai trạng thái mà kit không có thì viết class riêng của trang (`.ds-nact`), và kiểm ở trạng thái hover.

## 4. Nút bật/tắt: hai trạng thái phải thấy được

`wb-btn` mặc định đã là nút đặc màu tối, nên một nhóm nút mặc định trông như đang được chọn hết.

```
chưa chọn  →  .ds-lvlbtn            (nền trong suốt, có viền)
đang chọn  →  .ds-lvlbtn.is-active  (nền đặc, chữ đảo màu)
```

- Một class trạng thái, không hai. Thêm `wb-btn--solid` (không có trong kit) thì nút đang chọn gần như không khác
  nút thường.
- Nhóm nút chia đều bề rộng thì không cần nhãn đứng trước: đúng một nút đặc màu tự đọc thành "chọn một" (nhóm
  `data-nkind` trong `Notes`).

## 5. Icon hay chữ

- Hành động lặp lại nhiều lần mà ngữ cảnh đã nói rõ nó làm gì → chỉ icon.
- Một tính năng cần được phát hiện → icon kèm nhãn chữ.

| ví dụ | chọn | vì sao |
|---|---|---|
| sao chép khối code | chỉ icon `content_copy` (DS-020) | có ở mọi khối code; chữ cạnh mỗi khối thành nhiễu |
| `Notes` ở thanh trên | icon + nhãn | không ai đoán được cái bút chì mở ra gì |
| Sửa / Xoá một ghi chú | chỉ icon | lặp ở mọi ghi chú; bút chì và thùng rác là icon phổ dụng |
| Tải ghi chú về máy | icon + nhãn | bước 1 của việc hai bước, nhãn phải nói nó làm gì |

- Nút chỉ-icon có đủ ba thứ: `aria-label`, `title`, và phản hồi sau khi bấm đổi hẳn icon (`content_copy` →
  `check`), không chỉ đổi màu.
- Phản hồi không được nói dối: sao chép thất bại đổi sang `priority_high` + "chọn đoạn code rồi bấm Ctrl/⌘+C",
  màu đỏ.
- Nút icon cần trạng thái thứ ba (chờ xác nhận) thì đổi sang chữ: nút xoá lên nòng thành `Xoá?` trên nền đỏ nhạt.

## 6. Sáng và tối: hai trạng thái, không có "theo hệ thống"

- `.dark` trên `<html>`. Hệ thống chỉ quyết định lần mở đầu tiên; sau đó theo đúng lựa chọn người dùng đã bấm.
- Không hardcode màu. Mọi màu đi qua token `--wb-*`; token tự đảo trong `.dark`.
- Chọn token theo khoảng cách, không theo tên: ở tối `--wb-surface` (`#131316`) và `--wb-surface-2` (`#1a1a1e`)
  gần như trùng. Cần khối nổi rõ trên nền khác thì dùng `--wb-canvas`.
- Kiểm cả hai chế độ trước khi xong. Lỗi hay gặp: chữ lấy một token không tồn tại, đọc được ở chế độ này và biến
  mất ở chế độ kia.

## 7. Số

- Số xếp thành cột hoặc số đổi tại chỗ: `font-variant-numeric: tabular-nums`.

## 8. Kiểm bằng mắt — và cái bẫy của pane preview

Cổng không thấy layout. Sửa giao diện thì mở trang; sửa chữ hay lịch học thì không cần (`G-PLAN` đã gồm
`auditPlan()`).

- Cách mở: serve thẳng từ gốc repo (`python3 -m http.server`), rồi vào
  `http://localhost:<cổng>/masters-degree/data-science-roadmap/data-science-roadmap.html`.
- Pane preview của Claude Code đọc `.claude/launch.json` cục bộ (không nằm trong git). Server chạy mà 404 mọi đường
  dẫn thì kiểm `ps` xem tiến trình có bị sandbox bọc trước khi đi sửa config.
- Screenshot khi cuộn sâu, khi có lớp phủ mở, hay khi có canvas z-index cực cao (`#dsConfetti`) ra khung đen: giới
  hạn của pane. Đọc DOM/CSS thay vì tin ảnh (`querySelectorAll`; `getImageData(0,0,1,1)` của canvas). Muốn thấy
  khối ở cuối bài thì xoá các khối đứng trước trong DOM rồi cuộn lên.
- `getComputedStyle` đọc ngay trong lượt vừa đổi class hay theme có thể ra giá trị cũ: đổi ở một lệnh, đọc ở lệnh sau.
- Lặp qua nhiều bài bằng `location.hash`: bỏ `await` nếu hash không đổi (`hashchange` không bắn). `location.hash`
  không tải lại trang; thứ chỉ đọc `localStorage` lúc khởi động thì cần `location.reload()`.
- Pane ẩn giữa hai lệnh tool thì trang đóng băng: `innerWidth` ra 0, `requestAnimationFrame` không tick, transition
  không tiến, `getComputedStyle` lệch một nhịp. Chụp một ảnh cho pane tỉnh (kiểm `innerWidth` khác 0 trước khi đo);
  đo trạng thái cuối thì tắt transition (`*,*::before,*::after{transition:none !important}`) rồi bỏ ra. Đo thời
  gian của một animation: §9.

## 9. Pháo giấy khi đạt một bài (`celebrate()`)

DS-024. Một bài lần đầu chạm mức cao nhất của nó (đọc-xong nếu không có deliverable, đạt-deliverable nếu có) thì
bắn pháo giấy.

- Kích hoạt ở tiến độ: `setLevel()` gọi khi `lvl >= maxLevel(l) && before < maxLevel(l)`. `loadProgress()`, undo
  và import ghi thẳng vào `prog`, nên không bắn lúc tải trang.
- Không tự nhảy bài; đừng thêm lại `setTimeout` nhảy sang bài sau.
- `<canvas id="dsConfetti">`: `position: fixed`, `z-index: 2147483647`, `pointer-events: none`, trong suốt ở chỗ
  không có mảnh.
- `prefers-reduced-motion` thì bỏ hẳn hiệu ứng.
- Đừng đổi dáng hiệu ứng (bắn từ dưới lên, từ hai bên) khi chưa hỏi chủ trang.
- Rơi chậm là một yêu cầu riêng (`vy`/`g` đã giảm theo chủ trang): `vy` không phải dial của câu nào dưới đây.

| muốn đổi | xoay | đang là |
|---|---|---|
| mảnh đầu hiện khi nào | `INSTANT` (số mảnh có `spawn = 0` và `y` sát mép trên) | 3 mảnh → 0 ms (khung 1) |
| hiệu ứng dài bao lâu | `SPAWN_WINDOW` + `BAND` (dải sinh cao mấy lần màn) | 3000 ms + 2 → canvas tắt ~7,2 s |
| trên màn dày bao nhiêu | `COUNT` | 70 mảnh → đỉnh ~46 mảnh lúc 3,0 s |

- `INSTANT` khai tường minh; đừng để độ trễ đầu phụ thuộc `COUNT` (mảnh gần mép chỉ có nhờ đông).
- `BAND` dùng luỹ thừa 3: đa số mảnh sát mép trên, một ít tạo đuôi. Dải phẳng thì mảnh đầu hiện rất muộn.
- `VMAX` = 7,6 px/khung × dpr là hệ quả của `BAND`: chặn mảnh sinh cao để tốc độ rơi nhìn thấy không đổi.
- Mảnh rơi khỏi mép dưới là hết. `LIFE` (9000) chỉ là hạn mờ, phải lớn hơn quãng bay dài nhất.
- Gọi lại khi đang chạy thì huỷ vòng cũ trước (một canvas một lúc). Vanilla, không thư viện.
- Kiểm: screenshot ra khung đen (§8); đọc `getImageData` để xác nhận canvas trong suốt, và `localStorage` để xác
  nhận `hash` không đổi.
- Đo thời gian khi pane đóng băng rAF: chặn `requestAnimationFrame` (giữ callback) và `performance.now` (đồng hồ giả
  +1000/60 mỗi vòng), rồi tự bơm khung. Đếm mật độ bằng `drawImage` xuống canvas 160×90 rồi đọc alpha. Trả lại hai
  hàm gốc khi xong. So trước/sau: `git show HEAD:<file> > scratchpad/old.html`, đo hai bản cùng cỡ cửa sổ.

## 10. Trắc nghiệm tự kiểm (`.ds-quiz`)

Nội dung ở `data/quiz.json`; cách thêm, sửa và luật nội dung ở [editing.md](editing.md) việc 7. Mục này nói hình
thức và hành xử.

- Trang chính: `<section class="ds-quiz-mount">` chèn trong `render()` ngay sau hộp kết bài (`gainBox`), trước
  `.ds-nodefoot`: đọc bài → thấy mình vừa được gì → tự kiểm → đánh dấu mức.
- Ô cắm luôn được phát ra, kể cả khi bài chưa có câu hỏi: lúc `render()` chạy thì JSON có thể chưa về.
- Luật hình thức đặt lên `.ds-quiz` (do `mount()` gắn), không lên `.ds-quiz-mount`.
- Một module, hai trang: `DSQuiz.mount(root, questions)` (khối "QUIZ MODULE"). Trang chính gọi nó trong `enhance()`
  sau `loadQuiz()`; `roadmap.html` gọi nó trong một popup (`build-roadmap.mjs` trích nguyên khối JS và mọi rule
  `.ds-quiz`).
- Cả hai trang `fetch('data/quiz.json')`: sửa câu hỏi không cần build lại roadmap. Sửa carousel thì sửa ở trang
  chính rồi build lại.

Ô quiz nổi hơn mọi khối khác bằng bóng, không bằng lối trình bày riêng (DS-031):

- Nền, viền, bo góc giữ ngôn ngữ card của kit (`--wb-surface` + `--wb-bw solid --wb-border` + `--wb-radius-lg`).
- Bóng là bậc thứ ba, rộng và đậm hơn `--wb-shadow-md`, giữ cấu trúc hai lớp của kit (lớp tiếp xúc + lớp toả):

```css
box-shadow: 0 2px 6px rgba(16,17,18,.06), 0 14px 40px rgba(16,17,18,.16);      /* sáng */
box-shadow: 0 2px 6px rgba(255,255,255,.06), 0 14px 40px rgba(255,255,255,.07); /* tối */
```

- Ở tối kit đổ bóng bằng ánh sáng trắng; lớp toả mờ hơn hẳn bản sáng, không thì khối trông như phát sáng.
- Rule `.dark .ds-quiz` đặt cạnh rule kia, không ở `:root`: bộ trích của `build-roadmap` lọc selector khớp `.ds-quiz`.
- Bóng chỉ ở khung, không đi vào trong, và chỉ ở trang chính. `roadmap.html` gỡ khung ngoài nên tự không nhận;
  thêm bóng cho phần tử bên trong là rò sang roadmap.

Hành xử (DS-030):

1. Một câu mỗi lần, tua ngang: `.ds-quiz__track` dịch `translateX(-cur*100%)`, `.ds-quiz__viewport` cắt bằng
   `overflow: hidden`. Tua bằng nút ‹ ›, vạch tiến độ, phím ←/→, hoặc vuốt (ngón tay, bút; trackpad nhận `wheel`
   khi `|deltaX| > 1,5 × |deltaY|`). Chuột không kéo được: giữ trái rồi rê là bôi chữ.
2. Chọn đáp án không tự chuyển câu: chỉ đánh dấu `aria-checked`, đổi được tới khi chấm.
3. Trả lời hết mới bật nút chấm (`Chấm điểm · k/N`). Chấm xong: ô hiện đúng/sai, `.ds-quiz__why` bung ra, có dải
   điểm, nút thành "Làm lại".
4. "Làm lại" xoá sạch về câu 1.

- Mỗi thông tin một chỗ. Đầu ô: tên + bộ đếm `3 / 5` (`.ds-quiz__count`, `margin-left: auto`).
- Dải điểm ngay dưới đầu ô, không ở đáy: tua lại xem câu sai thì kết quả đứng yên.
- Đáy là một hàng `.ds-quiz__bar`: ‹ › · vạch tiến độ · nút hành động. ≤560px vạch tiến độ xuống hàng riêng.
- Câu không hiện phải `inert` + `aria-hidden`.
- ← → luôn đổi câu, kể cả khi tiêu điểm ở một đáp án; ↑ ↓ đi giữa các đáp án; `1…6` / `a…f` chọn thẳng.
- Listener gắn trên `root`, không cướp phím của trang hay panel ghi chú.
- Trung tính tới khi chấm: ô đang chọn chỉ `--wb-ink-hover` + viền `--wb-fg`.
- Sau khi chấm: xanh (`--wb-success*`) cho đáp án đúng, đỏ (`--wb-danger*`) cho ô chọn sai; ô còn lại lùi về nền
  trang và chữ mờ.

Bẫy, giữ nguyên cách chữa:

- `box-sizing: border-box` cho cả cây `.ds-quiz`: kit chỉ đặt border-box cho `wb-*`, thiếu thì slide rộng hơn
  khung và mỗi câu lệch dần.
- `.ds-quiz__viewport` không được có padding ngang (`overflow: hidden` cắt ở padding-box, câu bên cạnh ló ra). Chỗ
  cho vòng focus nằm trong `.ds-quiz__slide`.
- Hai câu cách nhau bằng `gap` ở `.ds-quiz__track`; JS đọc lại giá trị đó từ computed style (`place()`) và trừ
  `cur × gap` vào transform. Số chỉ ở CSS.
- `roadmap.html` khai lại token `--ds-*` bằng tay: thêm một `var(--ds-…)` mới vào rule `.ds-quiz` thì thêm token đó
  vào khối `:root` trong `STYLE()` của `build-roadmap.mjs`, cùng giá trị với trang chính. Bộ build ném lỗi nếu thiếu.
- `.ds-quiz__why[hidden]` tự khai `display: none` (`display: flex` thắng `[hidden]`). `.ds-quiz__score` không dùng
  flex: `gap` không có ký tự nên trình đọc màn hình đọc liền chữ.
- Margin dọc trong quiz trỏ vào `--ds-sp-*` (§0.6); `roadmap.html` khai sẵn `--ds-sp-text` / `--ds-sp-block`.
- Popup roadmap: mount vào một div con rồi `#quizModalBody .ds-quiz{border:0;background:none;padding:0;margin:0;
  box-shadow:none}`, để không lồng hai khung. Popup ẩn tiêu đề "Kiểm tra nhanh" vì đầu modal đã ghi tên bài.
- Popup ở roadmap là modal của kit (`wb-overlay--blur` + `wb-modal`, như `facts/index.html`), khác ngăn tóm tắt
  (không phủ). Kit cho `.wb-overlay` z-index 100, `.wb-drawer` 101, nên `#quizModal` nâng lên `z-index: 200`.
- Đóng bằng ✕, Esc hoặc bấm nền. Bấm nền dùng chốt `pointerdown` + `pointerup`, để kéo chữ ra nền không đóng oan.
  Esc đóng popup trước, rồi mới tới ngăn.
- Không KaTeX trong câu hỏi: popup roadmap không nạp KaTeX. Ký hiệu toán viết bằng Unicode.
