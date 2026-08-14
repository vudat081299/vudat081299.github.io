# Luật thiết kế của trang

File này trả lời **một câu**: *"tôi có một khối nội dung / một nút — nó trông thế nào và
nằm ở đâu?"*

Ba file khác trả lời ba câu khác, đừng trộn:

| câu hỏi | file |
|---|---|
| tôi đổi cái này thì phải đổi cái gì nữa? | [editing.md](editing.md) |
| giải thích thế nào để người ta hiểu? | [writing.md](writing.md) |
| luật bắt buộc và vì sao có luật đó? | [../CLAUDE.md](../CLAUDE.md) |
| **nó trông thế nào, nằm ở đâu?** | **file này** |

Đây là tài liệu **trạng thái hiện tại**, không phải nhật ký. Ai chốt gì, ngày nào, bản
trước sai ra sao → [../HANDOFF.md](../HANDOFF.md).

Hai mục trong `CLAUDE.md` là **luật cứng**, và file này không lặp lại chúng — nó chỉ cho
biết cách áp dụng:

- **§7 — ba tầng trình bày.** Cái gì lên mạch chính, cái gì vào popup, cái gì vào drawer.
- **§10 — khổ chữ.** Cả trang chỉ có **một mép phải**.

---

## 0. Luật áp cho CẢ trang

Mục §1–§8 nói về **một khối nội dung**. Mục này nói về những thứ không thuộc khối nào:
lớp vỏ, thang chữ, khổ trang, đơn vị đo. Chúng không phải "tính năng" nên dễ bị bỏ qua khi
soát — nhưng sai thì người đọc thấy ngay từ giây đầu, trước cả khi đọc được chữ nào.

### 0.1 Lớp vỏ trang: nói tiếng gì, cao bao nhiêu

**Ngôn ngữ.** Thuật ngữ **trong bài** giữ tên gốc theo `CLAUDE.md` §11. Lớp vỏ thì chia
hai vùng:

| vùng | tiếng | gồm |
|---|---|---|
| **thanh trên** | **Anh** | nhãn nút, phụ đề thương hiệu, `title=`, `aria-label`, và cả chữ do JS sinh (`syncNotesCount`) |
| **chân trang** | **Anh** | dòng credit + link "← Back to home" — chủ trang chốt 2026-08-05: chân trang là dòng ký tên / điều hướng cuối, không phải chỗ dạy, để tiếng Anh cho gọn |
| **hero `roadmap.html`** | **Anh** | `.rm-hero__h` / `__sub` / `__stats` / `__note` — chủ trang chốt 2026-08-06 |
| lớp vỏ còn lại | Việt | thanh bên, `<title>`, `<meta description>`, nhãn ô tìm kiếm, tiêu đề popup / ngăn phụ, mọi `aria-label` ngoài thanh trên |

**Hero của `roadmap.html` là vùng tiếng Anh, và ô đó đã bị dịch ngược một lần** — đừng dịch
lại. Vùng tiếng Anh của trang đó là **thanh trên + hero + chân trang** (`.rm-foot` vốn đã
tiếng Anh): cả ba là khung của trang, phần dạy là 84 khối tóm tắt ở giữa. Sửa ở
`tools/build-roadmap.mjs` rồi chạy lại nó — `roadmap.html` là file **sinh**, sửa tay là mất
ở lần build sau. Ba số trong `__stats` dùng dấu **thập phân kiểu Anh** (`106.5 hours`), nên
đừng thêm lại `.replace('.', ',')`.

Thanh trên là vùng nhỏ nhất và quen mắt nhất của trang (`Notes`, `Light`/`Dark`, `0%`),
nên nó là chỗ duy nhất mà tiếng Anh không bắt người mới phải dịch gì để dùng được trang.

**Ngoại lệ duy nhất ngoài thanh trên: panel ghi chú tên là `Notes`.** Ranh giới:

- **tên panel** = `Notes` — cả nhãn nút trên thanh trên lẫn tiêu đề dock;
- **mọi câu nói về nó** = tiếng Việt, dùng từ **ghi chú**, không dùng "sổ" ("Tải ghi chú về
  máy", "Chưa có ghi chú nào");
- **tên cơ chế** (`LEARNING-LOG.md`, `## Sổ`, `learn.mjs --sync`) giữ nguyên — đó là đường
  dẫn và cú pháp file, không phải nhãn giao diện.

Và khi một từ đã đổi ở lớp vỏ thì **phải đổi luôn trong bài** — hai tên cho một khái niệm
là đúng thứ `CLAUDE.md` §11 cấm. `khối lượng` được nêu kèm tên tiếng Anh **đúng một lần** ở
trang chủ, để người học tra được khi gặp ở nơi khác.

Tự kiểm — mở trang, chạy trong console:

```js
document.querySelector('.wb-navbar').innerText   // phải KHÔNG còn tiếng Việt
document.querySelector('.ds-rail').innerText     // phải KHÔNG còn tiếng Anh
```

Chữ tiếng Anh được phép ở vùng tiếng Việt: tên ligature của icon (`search`, `edit_note`) —
đó là *nội dung* của font icon, không phải chữ hiển thị.

**Chiều cao.** Mọi ô trên thanh trên cùng **một** chiều cao, token `--ds-navctl` (30px,
khai ở `.wb-navbar`):

```
nút-logo · chip %  ·  Notes  ·  Light/Dark      → height: var(--ds-navctl)
```

`align-items: center` một mình **không đủ**: bốn ô cao 32 / 19 / 32 / 28px thì tâm trùng
nhau mà hàng vẫn đọc so le, vì mắt đọc mép trên và mép dưới của mỗi ô chứ không đọc tâm.
Kèm theo hai điều:

- **`box-sizing: border-box`** ở mỗi ô — kit không đặt border-box toàn cục, nên thiếu nó
  thì viền cộng thêm 2px và ô đó lại lệch.
- **Phụ đề thương hiệu canh giữa, không canh chân chữ**, và có một vạch ngăn (`Data Science
  │ Roadmap`). Canh giữa hai cỡ chữ khác nhau chỉ đọc đúng khi chúng là hai thứ tách biệt;
  vạch ngăn là thứ nói ra điều đó, và nó dùng lại đúng hình của `Notes │ 3` ở đầu bên kia.

Token đặt ở `.wb-navbar` chứ không ở `:root`: nó là số của lớp vỏ, còn khối `:root` chỉ giữ
các đại lượng của khổ trang (§0.3).

### 0.2 MỘT thang chữ, khai theo loại nội dung

Mọi cỡ chữ trong cột bài phải **trỏ vào một bậc có tên**. Thang có ba tầng, và mọi cỡ chữ
trong cột bài phải nằm ở tầng 1:

```
tầng 1  :root ⑧   9 bậc, tên theo LOẠI NỘI DUNG, tất cả = calc(--ds-fs × k)
                  hero 1,72 · h1 1,5 · h2 1,28 · h3 1,12 · body 1
                  sub ,92 · code ,88 · cap ,84 · label ,78
tầng 2  #main     8 token chữ của kit nối vào tầng 1 (cả 8, không phải 4)
tầng 3  #main .wb-*  component nào ghi px cứng thì kéo về tầng 1, một dòng mỗi loại
```

Vì sao cần cả ba tầng: kit đặt **px cứng ở 60+ chỗ** và chỉ **8 token chữ** của nó là đọc
được. Nối 4 token thì chỉ với tới ~35 lớp `ds-*`; toàn bộ `wb-*` trong bài (99 alert, 58
help, card, steps, cap, btn, pager) vẫn ngoài thang — **hai hệ chữ trong cùng một cột.**

Điểm quan trọng nhất: **thứ bậc đúng ở MỌI giá trị `--ds-fs`.** `h1` luôn = 1,5 × thân bài
vì cả hai đọc cùng một gốc, nên đổi cỡ chữ là đổi **một** token, và lỗi "thân bài to hơn
tiêu đề bài" không tái hiện được nữa.

Khoảng giữa hai bậc liền kề là **1,07–1,17×** có chủ ý: chỉ *tiêu đề* mới được to, còn mọi
thứ là *nội dung* thì phải đọc như cùng một trang. Bậc thấp nhất phân biệt bằng **độ đậm và
màu**, không bằng cỡ — `h4` = đúng cỡ thân bài + in đậm.

Ba luật kèm theo:

- **Cùng loại nội dung thì cùng bậc.** `.ds-obj__v` (dải mục tiêu đầu bài) và `.ds-gain__v`
  (hộp kết bài) là **cùng một câu** (`CLAUDE.md` §9), nên cùng `--ds-t-h3`.
- **Không px cứng, không `em`, không `ch` trong cột bài.** `em` đúng về kết quả nhưng không
  nói ra được rằng đây *cùng bậc* với chỗ khác; token nói ra được, và đó là toàn bộ điểm
  khác. `ch` thì sai hẳn — nó co theo `font-size` nên `h2` và `<p>` cùng `74ch` ra hai mép
  lệch nhau 200px. Px cứng chỉ được dùng **ngoài `#main`** (lớp vỏ).
- **Thêm một loại nội dung mới** → thêm một bậc ở ⑧ rồi trỏ vào; **thêm một component kit
  vào bài** → thêm một dòng ở tầng 3. Đừng viết `font-size` rời tại chỗ dùng.
- **MỘT bậc, MỘT tên.** Tầng 2 làm `--ds-t-cap` và `--wb-text-caption` bằng nhau *bên trong*
  `#main`, nên trước 2026-08-04 trang có 22 chỗ gõ tên này và 50 chỗ gõ tên kia cho cùng
  những bậc đó — đọc code không biết được một rule thuộc cột bài hay lớp vỏ. Luật:
  rule **chỉ trong cột bài** → `--ds-t-*`; rule **chỉ ở lớp vỏ** → `--wb-text-*` (px của
  kit, vì lớp vỏ không được giãn theo cỡ chữ bài); rule **trải cả hai lớp** → `--wb-text-*`
  và để tầng 2 tự đổi theo ngữ cảnh. Đúng một rule thuộc loại thứ ba:
  `.ds-keyhint kbd, .ds-prose kbd, .ds-notes kbd`.

Hai chỗ dùng `em` còn lại là **đúng** và đừng đổi: `code:not(pre code)` (.88em) và
`.ds-brand__sub` (.8em, ở lớp vỏ). Cả hai phải co theo *phần tử chứa* chứ không theo thân
bài — một đoạn code inline nằm trong `<th>` thì phải nhỏ như `<th>`, không phải như `<p>`.
Đó là ranh giới: `em` cho thứ **phụ thuộc ngữ cảnh**, token cho thứ **có bậc riêng**. Còn
`em` trong **custom property** thì luôn sai: nó được giải ở *chỗ dùng*, nên hai lớp lồng
nhau cùng đọc token sẽ nhân dồn (`.67 × .72 × 26 ≈ 12,5px` thay vì 17,4px).

**Đếm lại số cỡ chữ sau mỗi lần sửa thang** — một con số, nói được ngay là thang còn khít
hay đã trôi. Mục tiêu ≤ ~10 cỡ, trải ≤ 2×; đang là **8 cỡ / 1,92×** (22,5 · 19,2 · 16,8 ·
15 · 13,8 · 13,2 · 12,6 · 11,7 px ở cửa sổ ≥1200px):

```js
// mọi phần tử trong cột bài CÓ text trực tiếp, gom theo cỡ chữ
const seen = new Map();
document.querySelectorAll('#main *').forEach(el => {
  if (!el.offsetHeight) return;
  let direct = ''; el.childNodes.forEach(n => { if (n.nodeType === 3) direct += n.nodeValue.trim(); });
  if (direct.length < 3) return;
  if (el.closest('.wb-ico')) return;        // icon là thang riêng của kit, không phải chữ
  const fs = parseFloat(getComputedStyle(el).fontSize);
  const cls = (el.className || el.tagName).toString().split(' ')[0];
  if (!seen.has(cls + fs)) seen.set(cls + fs, cls + ':' + fs);
});
const sizes = [...new Set([...seen.values()].map(v => +v.split(':')[1]))].sort((a, b) => b - a);
console.log(sizes.length, 'cỡ · trải', (sizes[0] / sizes.at(-1)).toFixed(2) + '×', sizes);
```

### 0.3 Cột 1060px / chữ 15px — muốn đổi thì HỎI

Ba đại lượng khoá nhau bằng **một phép chia**, không phải bằng luật thiết kế:

```
ký tự/dòng  ≈  --ds-measure  ÷  (0,46 × --ds-fs)
```

0,46em là bề rộng một chữ tiếng Việt trong font này — đo thật, ổn định qua mọi cỡ. Biết hai
đại lượng là cái thứ ba **bị quyết định**. Khoảng khuyến nghị của typography là 45–90 ký
tự/dòng.

Cấu hình đang dùng chọn hai đại lượng khác, theo thứ tự ưu tiên này:

1. **Hết khoảng trống** — cột phải rộng hết chỗ. Cột hẹp thì bảng phải tràn bằng margin âm
   và **lệch hẳn sang trái so với chữ**, vì chỗ trống chỉ có ở một bên.
2. **Chữ nhỏ** — 15px cho thân bài.

Hai ưu tiên đó đẩy con số thứ ba lên **152 ký tự/dòng** ở cửa sổ 1440px, vượt trần 90.
**Đó là lựa chọn có chủ ý, không phải lỗi chưa ai thấy.**

⚠️ **Đừng "sửa" bằng cách hẹp cột lại, và đừng bù bằng cách phóng chữ.** Ba đại lượng này
đã bị đổi qua lại nhiều lần vì mỗi lần chỉ có hai trong ba được chọn, và cái giá của việc
đổi qua đổi lại đắt hơn cái giá của dòng dài. **Muốn đổi thì HỎI chủ trang.**

Thứ duy nhất được nới để bù dòng dài: `line-height` của `p`/`li` = **1,8**. Lỗi duy nhất
của dòng dài là mắt quay về đầu dòng sau bị nhảy lộn dòng, và giãn dòng chống đúng lỗi đó.

Đo thật, mẫu = đoạn văn + gạch đầu dòng ở mạch chính, bỏ dòng cuối mỗi đoạn:

| cửa sổ | cột | chữ | trung vị | p90 | |
|---|---|---|---|---|---|
| 375px | 335px | 14,0px | **48** | 52 | điện thoại tự về trong khoảng — không cần luật riêng |
| 1200px | 819px | 15,0px | **115** | 121 | |
| 1440px | 1059px | 15,0px | **152** | 153 | cấu hình đang dùng |

Bảng để chủ trang chỉ vào nếu muốn dial lại — đổi **đúng một** token `--ds-measure`:

| `--ds-measure` | ký tự/dòng | trống bên phải chữ |
|---|---|---|
| **1060px** | **152** | 0 ← đang dùng |
| 900px | 130 | 160px |
| 740px | 107 | 320px |
| 620px | 90 (đúng trần) | 440px |

Cách đo lại. **Bỏ dòng cuối** của mỗi đoạn là bắt buộc: nó luôn dở nên kéo trung vị xuống
và làm một khổ đã quá rộng trông như vẫn ổn. Và **luôn in chuỗi của từng dòng ra để kiểm
chính cái thước** — một bản đo cũ từng gom ký tự theo `top` với ngưỡng quá rộng, gộp hai
dòng thành một và ghi vào tài liệu hai con số sai:

```js
// tách dòng bằng rect TỪNG KÝ TỰ; ngưỡng 4–6px, không lớn hơn
// MẪU ĐO: đoạn văn + gạch đầu dòng ở mạch chính. Đổi mẫu là đổi con số, nên khi ghi số
// vào docs thì ghi luôn mẫu đã dùng.
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
console.log(lines.map(s => s.length), lines);   // ĐỌC chuỗi, đừng chỉ tin con số
```

### 0.4 Không zoom (`--ds-zoom: 1`) — và vì sao vẫn giữ token

Luật, không có ngoại lệ: **trong trang này không viết `vh`/`vw`/`dvh` trần.** Dùng hai
token ở `:root`:

```css
--ds-vh: calc(1vh / var(--ds-zoom));   /* 1% chiều cao cửa sổ THẬT */
--ds-vw: calc(1vw / var(--ds-zoom));   /* 1% chiều rộng cửa sổ THẬT */
```

Chỗ đang dùng: `--wb-shell-h` (override token của kit — kit tự ghi chú "override if the page
is zoomed"), `.wb-drawer` (height + max-width, sửa ở **lớp** nên cả ngăn phụ lẫn dock đúng
theo), `.ds-notesdock` (height), `.ds-mathmodal` (width + max-height body), `.ds-drawer`
(width), `--ds-bleed`, `--ds-dock-w`, `--ds-fs`. `tools/gate.test.mjs` có một ca canh.

**`--ds-zoom` bằng 1, và token được GIỮ chứ không xoá.** `zoom` mua được đúng một thứ — co
lớp vỏ 10% ở chỗ kit ghi px cứng — và phải trả ba cái giá, nên đừng bật lại:

1. **Nhân mọi px cứng của kit xuống 0,9.** Nhãn 11px ra 9,9px: dưới ngưỡng đọc được, mà
   không có chỗ nào trong trang khai con số đó nên không ai soát được nó.
2. **`zoom` không điều chỉnh đơn vị viewport.** Trong `zoom: .9`, `width: 100vw` ra
   **1152px** trên cửa sổ 1280px — bảng mất 10% mức tràn, còn thanh bên + ngăn phụ + dock
   **cụt đúng 10% đáy** vì kit đặt `--wb-shell-h: 100dvh` và `.wb-drawer { height: 100vh }`.
3. **Đẻ ra hai hệ toạ độ px.** `getBoundingClientRect()`/`clientX` là px SAU zoom;
   `getComputedStyle().width` là px cục bộ. Trộn hai hệ là tay kéo nhảy 10% mỗi lần kéo.

Lợi ích đó giờ mua bằng thang §0.2: cột bài không còn đọc px của kit nữa. Giữ token vì luật
trên bám vào nó, và vì xoá đi thì lần sau ai bật lại `zoom` sẽ dựng lại cả ba cái bẫy từ
đầu. Với `--ds-zoom: 1` thì `--ds-vh` = `1vh`: không tốn gì.

Hai thứ khác cùng gốc:

- **Media query** cũng so với `viewport / zoom`, nên khi zoom ≠ 1 thì số trong media query
  phải là số **đã chia**. Trang có 5 ngưỡng: bốn cái `560px` (lớp vỏ trên điện thoại) và
  một cái `1200px` (dock nhường chỗ). Với zoom = 1 chúng là ngưỡng thật.
  `gate.test.mjs` in cả 5 ra mỗi lần chạy, đúng để lần thêm cái thứ sáu không ai quên chia.
- **`position: fixed` thì Chrome xử lý đúng** — đã kiểm, popup và ngăn phụ vẫn phủ kín.
- **Từ chuột vào CSS thì CHIA zoom, từ CSS ra chuột thì NHÂN.** Với zoom = 1 hai hệ trùng
  nhau, nên code sai kiểu này **hiện không lộ ra** — giữ đúng chiều nhân/chia trong
  `dockZoom()` để nó không thành bom hẹn giờ nếu ai bật lại zoom.

### 0.5 `Notes` là tầng thứ tư: dock, không phải lớp phủ

Ba tầng ở `CLAUDE.md` §7 đều là chỗ **đọc**, nên chúng là lớp phủ: mở ra thì trang phía sau
bị chặn, đóng lại là về chỗ cũ. `Notes` là chỗ **viết về cái đang đọc**, nên luật ngược
lại: mở ra thì trang vẫn phải **cuộn được, bấm được, chọn chữ được**.

Ba việc để nó thật là dock — thiếu một cái là nó lại thành lớp phủ:

1. `wb-overlay--pass` (không làm tối nền, không nhận chuột — con của nó nhận lại).
2. **Không** `inert` cái nền, **không** nhốt tiêu điểm, **không** `aria-modal`. Ba thứ đó
   *là* định nghĩa của modal; khai nhầm thì trình đọc màn hình nói sai với người dùng.
3. Thân trang **nhường chỗ** đúng `--ds-dock-w` (`body.ds-dock-on`), nên dock không đè lên
   chữ. Cột co lại và chữ gói lại dòng — đó là giá phải trả, và nó rẻ hơn việc che mất đoạn
   văn đang được ghi chú. Dưới 1200px thì hết chỗ nhường: dock nằm đè.

Hệ quả cần biết: `Notes` **không** nằm trong `LAYER_IDS`, nên Esc chỉ đóng nó khi không còn
popup nào mở, bấm ra ngoài không đóng nó (bấm để chọn một câu mà mất cái đang viết là đúng
cái bẫy dock tồn tại để tránh), và mở popup toán không làm mất nó.

**Bề rộng: mặc định 1/4 cửa sổ, kéo được — sàn 1/4, trần 1/2 cửa sổ.** Không phải một số px
cố định, vì dock lấy chỗ của cột bài nên "bao nhiêu là đủ" phụ thuộc cửa sổ — 380px là 30%
cột trên màn 1280 và 15% trên màn 2560. **Chủ trang chốt 2026-08-05: MỌI ngăn kéo được (dock
`Notes` và drawer ngăn phụ) có sàn 1/4 và trần 1/2 cửa sổ** — `makeEdgeResizer({minRatio,
maxRatio})`, kèm một sàn px cứng (280/340) làm lưới an toàn cho cửa sổ hẹp. Bốn luật:

1. Mặc định là `clamp(300px, calc(25 * var(--ds-vw)), 640px)` — **CSS tính, không phải JS**,
   nên người chưa từng kéo thì đổi cửa sổ vẫn luôn được đúng 1/4.
2. Kéo thì JS ghi `--ds-dock-w` bằng **px cục bộ** và lưu `localStorage['ds.dockW']`. Reset
   (nhấn đúp tay kéo, hoặc Enter/Space khi nó có tiêu điểm) = **xoá** khoá đó, không phải
   ghi lại 25% — để mặc định fluid quay về đúng nghĩa mặc định.
3. Đọc bề rộng hiện tại bằng `getComputedStyle(dock).width`, **không** bằng
   `getBoundingClientRect()`: rect ra 0 khi dock đang đóng (`.wb-overlay` là `display:none`)
   và rect là px sau zoom (§0.4).
4. Tay kéo là `<div role="separator" tabindex="0">` với `aria-valuemin/max/now/valuetext`,
   và **bàn phím phải đổi được** (←/→ 16px, Shift ×4, Home/End hai đầu). Một tay kéo chỉ
   chuột dùng được thì nó không phải điều khiển, nó là cái bẫy.

Hình của tay kéo: một **viên 5×44px LUÔN thấy** ở giữa mép trái, vùng bấm 13px (rộng hơn
thứ nhìn thấy). Không phải vạch 1px hiện khi hover — vạch đó không nói được rằng nó kéo
được, còn hình viên thuốc thì người dùng đã học nghĩa "kéo tôi" từ chỗ khác.
Hover/tiêu điểm/đang kéo thì đổi **màu và chiều cao**, đừng đổi bề rộng hay `left`: đổi hai
cái đó thì tay nắm nhảy ngang đúng lúc con trỏ vừa tới. Và vì nó luôn thấy và có `title`
riêng, phụ đề dock **không** cần nói lại rằng mép trái kéo được.

#### Bố cục panel

Panel hẹp (300–640px) nên mọi thứ ở đây là một cuộc thi giành bề rộng. Sáu luật:

1. **GOM NHÓM theo bài, KHÔNG lọc theo bài đang mở** (chủ trang chốt 2026-08-05). Ghi chú
   là của cả quá trình học, không phải của một trang; lọc theo bài thì đổi bài là danh sách
   trông như vừa bị xoá sạch — nên vẫn hiện HẾT, gom nhóm chỉ đổi cách xếp. Mỗi nhóm có một
   **tiêu đề là tên bài** (link mở bài — bấm **giữ panel mở** vì bạn sang bài đó để xem lại
   chỗ đã ghi), kèm số ghi chú + số chỗ tắc của bài. Nhóm xếp theo ghi chú **mới nhất** của
   nhóm (nhóm vừa thêm nổi lên đầu); trong nhóm, mới nhất trước.
2. **Hàng, không phải thẻ.** Thẻ = nền riêng + viền quanh + mép trái 3px màu + bo góc một
   bên: bốn thứ trang trí cho một dòng chữ, và trong một dock hẹp chúng cộng lại thành
   nhiễu. Hàng phẳng ngăn nhau bằng một vạch, chữ ghi chú là thứ đậm nhất.
3. **Mỗi ghi chú là HAI HÀNG, không phải một hàng gói dòng.** Từ 2026-08-05 tên bài lên
   tiêu đề nhóm (điểm 1), nên mỗi ghi chú chỉ còn hàng meta + chữ. Vẫn KHÔNG gộp mọi thứ vào
   một hàng `flex-wrap: wrap`: các phần ngăn nhau bằng dấu `·` rời nên mỗi lần gói lại để một
   dấu `·` treo ở cuối/đầu dòng. Chia hàng theo thứ **đo được**:

   ```
   hàng đầu   loại · thời điểm · [sửa] [xoá]     ← đều ngắn, bề rộng gần như cố định
   dưới       chữ ghi chú                        ← thứ đậm nhất
   ```
   Tên bài giờ là **tiêu đề nhóm** ở trên, cắt bằng "…" khi dài — vẫn là thứ duy nhất không
   đoán được bề rộng.

4. **Không nhãn cho loại mặc định.** `tắc` và `gỡ` được nói hai lần (điểm màu + chữ, cho
   người không phân biệt được màu); `ghi` là mặc định nên nó không có nhãn nào — nhãn cho
   thứ mặc định là nhiễu.
5. **Sửa/xoá chỉ hiện khi hover hoặc `:focus-within`** (hai nút × 20 ghi chú = 40 nút cạnh
   chữ). `@media (hover: none)` cho chúng hiện sẵn trên màn cảm ứng. Ngoại lệ: nút xoá đã
   **lên nòng** thì luôn thấy (`:has(.is-armed)`) — một thứ đang chờ cú bấm thứ hai mà tàng
   hình khi chuột rời đi thì là cái bẫy.
6. **Ô ghi `resize: none` + tự cao dần bằng JS.** Tay kéo chéo mặc định của trình duyệt ở
   góc dưới-phải là chi tiết duy nhất trong panel mà trang không kiểm soát được màu lẫn
   hình, nên nó luôn trông lạc.

**Chữ hướng dẫn trong panel phải đếm được.** Panel là chỗ *làm*, không phải chỗ đọc: ba câu
giới thiệu ở đầu + một placeholder dài + một đoạn gợi ý dưới nút là bảy dòng chữ xám cho
một ô nhập. Luật: **một câu** ở phụ đề dock, **một câu** gợi ý mỗi khối, và mỗi câu chỉ
được nói thứ mà bố cục không tự nói. Khối "Đưa vào repo" là hai bước, và **hai nút xếp theo
thứ tự đã nói ra rằng chúng là hai bước** — không cần đánh số "1." "2." vào nhãn.

**Số ghi chú trên nút ở thanh trên KHÔNG phải badge.** Viên đặc màu nghịch đảo là ngôn ngữ
của "có việc chưa xử lý" — tin nhắn chưa đọc, lỗi chưa xem. Ghi chú của chính mình không
phải việc tồn, nên viên đó vừa xấu vừa nói sai. Đúng: một con số sau nhãn, ngăn bằng một
vạch mảnh, đọc như `Notes · 3`. Và **đừng tô màu con số theo "có chỗ tắc"** — nó là *tổng*
ghi chú, tô vàng vì 2/5 dòng là chỗ tắc thì màu đang nói sai về chính con số nó đứng cạnh;
số chỗ tắc được nói ở tiêu đề mục "Đã ghi" và ở tooltip của nút.

### 0.6 MỘT thang khoảng cách, khai theo QUAN HỆ

Cùng ý tưởng như thang chữ, chỉ đổi câu hỏi: chỗ dùng hỏi **"hai khối này liên quan tới nhau
thế nào"**, không hỏi "mấy px". Bảy bậc ở `:root` ⑨:

| token | px | dùng cho quan hệ |
|---|---|---|
| `--ds-sp-hair` | 4 | nhãn ↔ giá trị của nó, trong cùng một khối |
| `--ds-sp-tight` | 6 | giữa hai `<li>`; tiêu đề mục con ↔ thân nó |
| `--ds-sp-near` | 8 | tiêu đề ↔ thân nó |
| `--ds-sp-text` | 14 | giữa hai đoạn văn — **nhịp nền** của bài |
| `--ds-sp-block` | 20 | văn ↔ một **khối**: code, bảng, viz, alert, hàng chip |
| `--ds-sp-sub` | 28 | giữa hai mục con (kit gọi `--wb-block-gap`) |
| `--ds-sp-sec` | 44 | trước một tiêu đề mục (kit gọi `--wb-section-gap`) |

**Vì sao cần.** Đo 85 bài × 1686 cặp khối liền nhau (script dưới) ra **9 nhịp** cho vài quan
hệ: 13px giữa hai đoạn văn, 14px giữa hai danh sách, 16px quanh bảng/code, 18px quanh viz,
20px quanh hàng chip. Mắt không đọc năm nhịp đó thành năm ý — nó đọc ra "trang xộc xệch".
Và nhịp thứ sáu tệ hơn: **0px**, vì `.wb-alert` của kit không khai margin nào cả, nên **23
chỗ** có alert dán sát khối ngay dưới. Sau khi token hoá: **6 nhịp, không còn 0px.**

**Chỗ khai nhịp là trang, không phải kit.** Kit đúng khi không áp nhịp cho trang dùng nó
(`.wb-alert` chỉ có `padding`). Nên nhịp "khối ↔ khối kế tiếp" khai **một danh sách gộp**
trong `<style>` (`.ds-prose > .wb-alert, … { margin-bottom: var(--ds-sp-block) }`) — thêm
một loại khối vào bài thì **thêm tên nó vào danh sách đó**, đừng viết `margin` riêng ở chỗ
định nghĩa khối.

**Cái KHÔNG thuộc thang, có chủ ý** — hai loại:

- **`padding` của một component**, cả hai trục: `3px 12px` của một chip, `8px 10px` của ô
  bảng, `14px 16px` của khối code, `7px 10px` của một hàng bấm được. Đó là *hình dạng* của
  chính component — nó quyết định component trông dày hay mỏng, không quyết định nhịp của
  trang. Ép `.ds-leaf` từ `7px` lên `8px` cho "đúng thang" thì được sự nhất quán trên giấy mà
  đổi hình một thứ chẳng liên quan.
- **Nhích quang học ≤5px bên trong** một component: gap 2px giữa nhãn và giá trị, `margin-top:
  1px` bù đường viền của một icon, `row-gap: 0` để huỷ một `gap` của kit.

**Ranh giới, một câu: `margin` giữa hai khối anh em thì LÊN thang; `padding` trong lòng một
component thì KHÔNG.** Tự kiểm bằng cách grep `margin` dọc còn viết px trần trong `<style>` —
ra chỗ nào ngoài lớp vỏ là chỗ đó chưa lên thang.

Đếm lại sau mỗi lần sửa nhịp — một con số nói ngay là thang còn khít hay đã trôi:

```js
// mọi cặp khối anh em liền nhau trong cột bài, gom theo khoảng cách thật
const ids = [...document.querySelectorAll('template[data-node]')].map(t => t.dataset.node);
const hist = {};
for (const id of ids) {
  location.hash = '#/' + id; render();
  const k = [...document.querySelectorAll('#main .ds-prose > *')];
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i].getBoundingClientRect(), b = k[i + 1].getBoundingClientRect();
    if (!a.height || !b.height) continue;
    const g = Math.round(b.top - a.bottom); hist[g] = (hist[g] || 0) + 1;
  }
}
console.log(Object.keys(hist).length, 'nhịp', hist);   // mục tiêu: ≤7, và KHÔNG có khoá "0"
```

### 0.7 Cỡ nút vuông/tròn: `--ds-ctl` ba bậc

Ô có chiều cao == chiều rộng thì **một** token lo cả hai: `--ds-ctl` 30px (mốc stepper, nút
sao chép), `--ds-ctl-sm` 26px (nút nhỏ trên thanh trên và trong dock), `--ds-ctl-xs` 24px
(logo). Trước đây bốn con số rời, trong đó **30 và 34 là cùng một vai** — một số thứ tự
trong một vòng tròn — chỉ khác nhau vì được gõ hai lần ở hai chỗ. `--ds-ctl` cũng là chỗ
`--wb-steps-size` của kit nối vào, nên mốc stepper và nút trong bài không thể lệch nhau nữa.

---

## 1. Nội dung chính và nội dung phụ — cách phân biệt

Đây là quyết định đầu tiên và quan trọng nhất cho mọi khối nội dung mới.

> **Chính** = không biết thì không đi tiếp được.
> **Phụ** = biết thì tốt, bỏ qua vẫn học được bài này.

Cách thử, một câu: **xoá khối này khỏi mạch chính, người học vẫn làm được tiêu chí đạt
(`ACCEPT`) của bài không?**

- **Không làm được** → nội dung chính → **hiện đầy đủ trên trang**, không gập, không click.
- **Vẫn làm được** → nội dung phụ → **popup** (mặc định) hoặc **drawer** (ngoại lệ).

Chọn vật chứa cho nội dung phụ:

| | dùng khi | vì sao |
|---|---|---|
| **Popup** `data-math` <br>(mặc định) | đọc xong là xong, không cần nhìn lại mạch chính | Ở **giữa màn hình** → mắt không phải đi tìm. Đóng lại là về đúng chỗ đang đọc. |
| **Drawer** `data-aside` <br>(ngoại lệ, phải có lý do) | phải đọc **song song** với mạch chính | Ví dụ đúng: bảng so sánh công cụ mà người đọc đang phải chọn ngay lúc đó (`cmp-*`); bộ câu hội đồng đọc cạnh dàn ý slide (`qbank`). |
| **Dock** (tầng thứ tư) | không phải chỗ đọc mà là chỗ **viết về** cái đang đọc | Hiện chỉ có `Notes`. Khác cả ba tầng trên ở chỗ nó KHÔNG chặn trang — xem §0.5. |
| **`<details>` / gập tại chỗ** | **không bao giờ** | Nó đẩy nội dung phía dưới nhảy xuống, người đọc mất chỗ. Cổng `G-NO-DETAILS` chặn cứng. |

**Popup trước, drawer sau.** Trang này dài; drawer cao thì người đọc phải ngước cổ lên
xuống và mắt phải rời chỗ đang đọc. Chỉ chọn drawer khi trả lời được: *"vì sao người đọc
cần thấy mạch chính phía sau trong lúc đọc cái này?"*

**Sáu dấu hiệu một khối là nội dung phụ** — thấy một trong sáu thì gần như chắc:

1. So sánh ≥2 sản phẩm cụ thể (LightGBM vs XGBoost, chọn bộ dữ liệu nào) → drawer.
2. Danh mục lỗi / bảng thông báo lỗi → popup.
3. "Ba cách, nhưng chỉ dùng cách 1" → mạch chính giữ cách dùng thật, hai cách kia vào popup.
4. **Tự khai là không cần thiết** — "chưa cần", "có thể bỏ qua", "đọc thêm" → phụ.
   (Cổng `G-LAYER` bắt các tiêu đề tự tố giác kiểu này.)
5. Paper / lịch sử / tên riêng để biết → popup.
6. Code đầy đủ của một file mà mạch chính chỉ cần 5 dòng cốt lõi → popup.

**Lỗi ngược cũng là lỗi.** Rút quá nhiều vào popup thì mạch chính rỗng: một bài mà nội dung
thật nằm hết trong 6 cái chip thì không còn là bài học, nó là mục lục. Ngoại lệ hợp lệ duy
nhất là hai bài tra cứu (`s-lookup`, `t-stack`) — chúng *là* index, có chủ ý.

**Phép thử cuối, bắt buộc:** đọc hết mạch chính của bài, **không mở một popup nào**. Có
theo được không? Nếu một đoạn trên mạch chính chỉ hiểu được sau khi mở popup thì phần thiếu
đó thuộc mạch chính — kéo nó lên.

### 1.1 Hình dạng của cái chip mở nhánh phụ

Hai loại chip, **cùng hình** (viên nét đứt) để người đọc học một lần là biết cả hai đều
"bấm được, không bắt buộc", khác nhau ở **dấu đầu dòng**:

| chip | dấu | nói gì |
|---|---|---|
| `.ds-math` → popup | `∑` | "trong này là công thức" — nói về **loại nội dung** |
| `.ds-aside` → drawer | `chevron_right` | "đi tới một ngăn trượt ra **bên phải**" — nói về **việc sắp xảy ra**, và chỉ đúng hướng ngăn |

**Không dùng `+`.** Dấu cộng đọc ra là *"thêm một cái nữa"* — tạo mới, cộng vào, mở rộng một
danh sách — mà chip này không thêm gì cả: nó đưa người đọc **tới** một ngăn đã có sẵn nội
dung. (Trang đã để `add` một thời gian trong khi chú thích ngay cạnh nó vẫn ghi `›`; đó là
code trôi khỏi chú thích, không phải một quyết định khác.)

**Nét đứt phải SỐNG QUA hover.** Nét đứt là *nghĩa* của chip — "khối này không nằm trên mạch
chính, bỏ qua được" — không phải trạng thái nghỉ của nó. Đổi sang nét liền lúc hover thì đúng
lúc người đọc chú ý nhất, chip lại tự nói ngược điều nó vừa nói, và nhìn ra như một chip khác
hẳn nhảy vào chỗ cũ. Hover chỉ được đổi **nền** và **màu viền**; `border-style` thì không.
Cách tự kiểm: rule `:hover` của chip **không được chứa** `border-style`.

### 1.2 Bề rộng của drawer: 1/3 cửa sổ, kéo được, và khoá cuộn trang (trang chính) / nhường chỗ (roadmap)

- **Bề rộng mặc định là tỉ lệ cửa sổ, không phải px cứng** (`--ds-aside-w` = 1/3, token ⑪).
  660px cứng vừa không nói được vì sao là 660, vừa cho hai cảm giác khác nhau trên hai màn:
  52% cửa sổ ở laptop 1280px, 26% ở màn 2560px. **Kéo được trong khoảng sàn 1/4 → trần 1/2
  cửa sổ** (`minRatio: .25, maxRatio: .5`) — cùng luật với dock `Notes`, chủ trang chốt
  2026-08-05; xem §0.5 khối "Bề rộng".
- **Kéo được ở mép trái**, bằng **đúng** tay kéo `.ds-grip` và **đúng** hàm
  `makeEdgeResizer()` mà dock `Notes` dùng. Có hai ngăn kéo được nhưng chỉ một cơ chế: mọi cái
  bẫy của việc kéo (hệ toạ độ zoom, `rect` trả 0 khi ngăn đang đóng, reset = *xoá* token chứ
  không ghi lại tỉ lệ mặc định, không dùng `setPointerCapture`) chỉ được nhớ đúng ở một chỗ.
- **Lớp phủ thì phải KHOÁ CUỘN trang.** `inert` chặn tiêu điểm và chuột nhưng **không** chặn
  bánh xe chuột, nên trước 2026-08-04 thanh cuộn trang vẫn còn và vẫn lái được trong lúc
  drawer mở — hai vùng cuộn cạnh nhau, không dấu hiệu nào nói cái nào đang nhận. Khoá bằng
  `html.ds-scrolllock { overflow: hidden }`, và **`scrollbar-gutter: stable` phải đặt vô điều
  kiện** ở `html` chứ không đặt kèm lúc khoá: đặt kèm thì chỗ chừa và chỗ mất xảy ra cùng một
  frame và nội dung nhảy ngang 11px. Đo sau khi làm: dịch ngang **0,00px**.
  Dock `Notes` **không** khoá — trang phía sau phải cuộn được, đó là điều làm nó khác ba tầng
  kia (§0.5).
- **Ngăn của `roadmap.html` là KHÔNG phủ** (chủ trang chốt 2026-08-06) — nó theo luật của dock
  `Notes`, không theo luật ba tầng phủ: **không lớp phủ mờ, không đóng khi bấm ra ngoài, không
  khoá cuộn, `aria-modal="false"`**. Chỉ ✕ và Esc đóng. Đổi một trong bốn thứ đó thì phải đổi
  cả bốn: một ngăn không phủ mà vẫn khoá cuộn là nhường chỗ cho người ta đọc danh sách rồi lại
  không cho cuộn danh sách.
  Kèm theo là **thân trang nhường đúng bề rộng ngăn** — `html.rm-open body { padding-right:
  var(--rm-drawer-w) }`. `.rm-main` vốn `margin: 0 auto` nên thu hẹp hộp chứa là nó **tự căn
  giữa lại** trong phần còn thấy: không tính toạ độ, không thêm biến thứ hai (đo được `lệch =
  0px` ở cả 1/3 mặc định 427px và lúc kéo tới trần 640px). Đặt trên `<body>` chứ không trên
  `.rm-main` vì navbar sticky cũng phải ngắn lại, không thì nút theme nằm dưới ngăn. Ở
  `≤680px` ngăn rộng `100vw` nên **phải huỷ đúng rule này** (`padding-right: 0`) — nhường
  100vw là đẩy cả danh sách ra khỏi màn hình.
  Trang chính thì **giữ nguyên** lớp phủ + khoá cuộn cho ngăn phụ: ở đó nhánh phụ là thứ đọc
  song song *với một bài đang đọc*, còn ở roadmap thì danh sách 84 bước phía sau chính là thứ
  người ta đang duyệt.
- **Cả hai ngăn dùng ĐÚNG component `wb-drawer` của kit (§33), kể cả phần đầu ngăn**:
  `wb-drawer__head` + `wb-drawer__title` + `wb-drawer__sub` + `wb-close`, và class riêng của
  trang (`.ds-drawer` / `.rm-drawer`) **chỉ để ghi đè**. Đừng tự vẽ một thanh đầu ngăn thứ hai:
  roadmap từng có `.rm-drawer__bar/__phase/__close` với một ký tự `✕` thô trong hộp 32px, và
  hai trang lệch nhau ngay ở chỗ mắt nhìn vào đầu tiên (chủ trang báo 2026-08-06). `wb-close`
  lấy dấu ✕ từ **icon font** của kit (`\e5cd`, Material Symbols Rounded — `@import` sẵn trong
  `web-builder.css`), không phải ký tự văn bản, nên nó cùng một hình ở mọi chỗ.
- **Nền ngăn = `--wb-canvas` (nền TRANG), không phải `--wb-surface` của kit** (chủ trang chốt
  2026-08-06): ở sáng `--wb-surface` là trắng tinh nên ngăn trông như một tờ giấy dán lên trang
  xám. Ngăn là chỗ **đọc tiếp** mạch chính, không phải một cái card nổi lên. Khai ở `.ds-drawer`
  và `.rm-drawer` — đổi một bên thì đổi cả bên kia.
- **Đầu ngăn có dòng phụ thì cao theo nội dung; KHÔNG có dòng phụ thì cao đúng
  `--wb-navbar-h`** (chủ trang chốt 2026-08-06). Dòng phụ đang có ở đâu thì **giữ nguyên** ở
  đó — luật này chỉ ràng những đầu ngăn trống. Số đo: đầu ngăn có dòng phụ **81px** (title 25
  + sub 20 + padding 32), bỏ dòng phụ còn **58px**, ràng `min-height` là đúng **56px** = navbar.
  Ba chi tiết bắt buộc, thiếu cái nào là hụt:
  **(a)** neo vào token `--wb-navbar-h` của kit, đừng viết `56px` — navbar đổi thì hai chỗ đi
  theo; **(b)** kể **cả hai dạng** "không có" — thiếu hẳn thẻ (`:not(:has(…__sub))`) và có thẻ
  mà chữ rỗng (`:has(…__sub:empty)`, vì `#asideSub` luôn tồn tại trong markup, chỉ nội dung mới
  rỗng); **(c)** ghi đè `align-self` cho `.wb-close` — kit cố ý cho dấu ✕ dính lề trên, mà ở
  một thanh cao bằng navbar thì nó phải nằm giữa.
  Rule khai **một bản** ở `data-science-roadmap.html`, `build-roadmap.mjs` **trích** sang
  roadmap (`headCss()`); `pickCss` ném lỗi nếu không trích được gì, nên xoá rule ở trang chính
  là build đổ ngay chứ không âm thầm mất luật.
  **Hôm nay chưa đầu ngăn nào rơi vào luật này** — cả ba đều có dòng phụ (ngăn phụ trang chính
  luôn có câu mặc định, dock `Notes` có câu tĩnh, ngăn roadmap có tên chặng). Đây là luật cho
  ngăn sau, và nó đã được kiểm bằng ca thật (xoá chữ / xoá thẻ → 56px, ✕ về giữa; trả lại → 81px).
  Popup toán (`.wb-modal__head`) **không** thuộc luật này: chủ trang nói "nav trong drawer", và
  head của modal đang `43px` — ràng nó lên 56px là làm cao thêm một thứ không ai yêu cầu.
- **`[hidden]` trên một `.wb-drawer` đứng một mình KHÔNG ẩn nó.** Kit khai
  `.wb-drawer { display: flex }`, và rule của author thắng `[hidden] { display: none }` của UA
  ở cùng độ đặc hiệu — nên ngăn "đóng" vẫn nằm trong luồng `Tab` và vẫn trả `rect` thật (đó là
  lý do phép đo từng ra `width: 1px` khi ngăn đóng). Ngăn trang chính không lộ lỗi này vì nó
  nằm trong `.wb-overlay` (`display: none`). Ngăn nào đứng ngoài overlay thì phải tự khai
  `[hidden] { display: none }`.

---

## 2. Khổ chữ: một mép phải

Chi tiết và các token ở `CLAUDE.md` §10; thang chữ ở **§0.2**, cột và khổ chữ ở **§0.3**.
Bốn điều cần nhớ khi thêm một khối:

1. **Đừng đặt `max-width` cứng.** Cột nội dung *đã* đúng bằng khổ chữ. Cổng `G-MEASURE` bắt.
2. **Bảng là khối duy nhất được tràn ra hai bên** (`--ds-bleed`). Code, card, alert, hộp kết
   bài đều dừng ở cùng mép với chữ.
3. **Muốn nới trang thì sửa `--ds-measure` + `--ds-fs`, và chỉ sửa hai cái đó** — nhưng đọc
   §0.3 trước, hai con số đó là quyết định của chủ trang. Mọi thứ khác suy ra bằng `calc()`.
4. **Không px cứng cho cỡ chữ trong `#main` — trỏ vào một bậc của thang** (`--ds-t-*`,
   §0.2). `em` chỉ dùng cho thứ phụ thuộc ngữ cảnh (code inline). Px cứng chỉ đúng ở **lớp
   vỏ**, ngoài `#main`.

---

## 3. Dùng component nào

Trang dựng trên `../../web-builder/web-builder.css`. **Luật đầu tiên: tra kit trước khi tự
viết CSS.** Tự dựng một component đã có trong kit là thêm một ngôn ngữ hình thứ hai cho
cùng một việc.

| cần gì | dùng |
|---|---|
| nhãn trạng thái, chip nhỏ | `wb-cap` (+ `--success` / `--warning` / `--dashed` / `--sm`) |
| nút | `wb-btn` (+ `--sm` / `--ghost` / `--outline` / `--danger`) |
| nút bật/tắt trong một nhóm | `wb-btn wb-btn--sm ds-lvlbtn`, bật thì thêm `is-active` — xem §4 |
| hộp thông tin có màu trạng thái | `wb-alert wb-alert--info` / `--warning` / `--danger` |
| thẻ | `wb-card`, `wb-card--flat` khi muốn nó đọc như một chỗ nghỉ chứ không phải cảnh báo |
| bảng | `wb-table-scroll` bọc `<table>` (đây là khối duy nhất được tràn) |
| icon | `wb-ico` — chữ bên trong là **tên ligature** Material Symbols (`content_copy`, `edit_note`, `download`) |
| xếp ngang có khoảng cách | `wb-cluster` |
| popup / drawer | `wb-modal` / `wb-drawer` trong một `wb-overlay` |
| **một chuỗi bước có thứ tự** | `wb-steps` — **luôn luôn**, xem ngay dưới |

**`wb-steps` là component duy nhất cho "một chuỗi bước".** Trang có ba chỗ như vậy: sáu kết
quả ở trang chủ, mười một chặng giáo trình, và lịch 14 ngày. Trước 2026-08-04 chặng giáo
trình tự vẽ bằng một grid riêng (`.ds-map__phase` + `.ds-map__num` 34px) — cùng một hình (số
trong vòng tròn) nhưng gõ lại lần thứ hai, và lần thứ hai **thiếu đường nối dọc**. Người đọc
không thấy "thiếu một đường kẻ", họ thấy *"cái này không phải một chuỗi"*. Sửa bằng cách
dùng đúng component kia, **không** bằng cách vẽ thêm một đường nối thứ hai.

Hai luật hình thức của stepper, áp cho **mọi** stepper trừ khi cố ý trình bày khác:

- **Mốc canh giữa dọc với TIÊU ĐỀ của bước**, và chữ phụ nằm **ngay dưới** tiêu đề. Kit bù
  bằng `padding-top: 4px` trên khối nội dung — con số đó chỉ đúng cho tiêu đề đúng một dòng
  ở đúng một cỡ chữ: đo thật thì tâm lệch 3px ở tiêu đề một dòng và 12px ở tiêu đề hai dòng.
  Cách đúng là `display: grid` + `display: contents` trên `.wb-steps__content`, để tiêu đề và
  chữ phụ thành **hai hàng thật**, rồi `align-self: center` mốc với hàng đầu. Đo lại sau khi
  làm: lệch **0,00px** ở cả 4 stepper, ở 1440px và 375px.
- **Hai cái bẫy khi đổi item từ flex sang grid.** (a) Kit khai `gap: 14px` — shorthand đặt
  **cả hai trục** — nên phải `row-gap: 0`, không thì chữ phụ cách tiêu đề 18px, xa hơn cả
  khoảng cách giữa hai bước. (b) Khoảng cách tiêu đề↔chữ phụ đặt ở **margin-trên của chữ
  phụ**, không phải margin-dưới của tiêu đề: `align-self: center` canh *hộp lề*, nên 2px lề
  dưới của tiêu đề làm tâm lệch đúng 1px.

**Ba token thường bị gõ sai** (không có trong kit, dùng là im lặng không có tác dụng):

| gõ sai | đúng |
|---|---|
| `--wb-bg` | `--wb-canvas` (nền trang) hoặc `--wb-surface` (nền thẻ) |
| `wb-btn--solid` | **không tồn tại.** `wb-btn` mặc định *đã* là nút đặc màu tối |
| `wb-segmented` | **không tồn tại.** Dùng `ds-lvlbtn` + `is-active` |

Cách tự kiểm trong 5 giây: `grep -c -- "--wb-canvas" ../../web-builder/web-builder.css`. Ra
`0` thì nó không tồn tại, và CSS sẽ **im lặng bỏ qua dòng đó** — không có lỗi nào hiện ra,
thuộc tính chỉ đơn giản không được đặt. Đây là loại lỗi đắt nhất trong CSS.

**Và đừng chồng hai variant của kit lên nhau khi chúng đặt cùng một thuộc tính.**
`wb-btn--ghost` + `wb-btn--danger` là ca cụ thể: `.wb-btn--ghost:hover` đặt
`color: var(--wb-fg)` với độ ưu tiên 0-2-0, còn `.wb-btn--danger` đặt màu chữ với 0-1-0 —
nên lúc hover, nút "nguy hiểm" cho ra **icon đen trên nền đỏ**. Cần một nút hai trạng thái
mà kit không có sẵn thì viết một class của riêng trang (`.ds-nact`), đừng ghép variant.

---

## 4. Nút bật/tắt: hai trạng thái phải **thấy được**

`.wb-btn` mặc định trong kit **đã là nút đặc màu tối**. Nghĩa là một nhóm nút mặc định
trông như đang được chọn hết. Trạng thái phải được định nghĩa cả hai đầu:

```
chưa chọn  →  .ds-lvlbtn            (nền trong suốt, có viền)
đang chọn  →  .ds-lvlbtn.is-active  (nền đặc, chữ đảo màu)
```

Và **một class trạng thái, không hai**. Bật thêm `wb-btn--solid` — một class không có trong
kit — thì nút "đang chọn" chỉ khác nút thường bằng một vòng inset gần như vô hình trên nền
tối: nút không sai, CSS không báo lỗi, chỉ là **không ai thấy mình đã bấm gì**.

**Một nhóm nút chia đều bề rộng thì không cần nhãn đứng trước.** Ba nút bằng nhau, đúng một
nút đặc màu — hình đó tự đọc thành "chọn MỘT trong ba" (nhóm `data-nkind` trong panel
`Notes` làm vậy). Thêm một nhãn chữ vào hàng đó là thêm một thứ phải xếp chỗ, và trong dock
hẹp nó đẩy nút chính xuống dòng riêng.

---

## 5. Icon hay chữ

Cả hai đều đúng, tuỳ việc. Một câu để chọn:

> **Hành động lặp lại nhiều lần mà ngữ cảnh đã nói rõ nó làm gì → chỉ icon.**
> **Một tính năng cần được phát hiện → icon kèm nhãn chữ.**

| ví dụ trong trang | chọn gì | vì sao |
|---|---|---|
| sao chép khối code | **chỉ icon** `content_copy` | nó ở **175** khối code. Một chữ "Chép" cạnh mỗi khối là 175 lần nhắc một việc mà cái icon đã nói xong — nó thành nhiễu ngay cạnh đúng thứ người đọc cần đọc |
| `Notes` ở thanh trên | **icon + nhãn** | không ai đoán được cái bút chì mở ra cái gì; đây là tính năng phải tìm thấy được lần đầu |
| Sửa / Xoá một ghi chú | **chỉ icon** | lặp ở mọi ghi chú, và bút chì / thùng rác là hai icon phổ dụng nhất |
| Tải ghi chú về máy | **icon + nhãn** | đây là bước 1 của một việc hai bước, nhãn phải nói ra được nó làm gì |

**Chỉ-icon vẫn phải nói được, ba việc bắt buộc, không bỏ cái nào:**

1. `aria-label` — trình đọc màn hình không thấy icon.
2. `title` — chuột hover ra chữ.
3. **Phản hồi sau khi bấm đổi hẳn icon, không chỉ đổi màu.** `content_copy` → `check`. Đổi
   màu một mình thì người không phân biệt được màu không thấy gì xảy ra.

Và **đừng nói dối trong phản hồi**: nhánh sao chép thất bại đổi sang `priority_high` + "chọn
đoạn code rồi bấm Ctrl/⌘+C" và màu **đỏ**, không phải dấu ✓ màu xanh. Một nút icon cần một
trạng thái thứ ba (xác nhận trước khi làm) thì **đổi sang chữ**, đừng đổi sang một ô màu:
nút xoá ghi chú lên nòng thành chữ `Xoá?` trên nền đỏ nhạt, vì ô đỏ đặc chỉ nói được "nguy
hiểm" còn dấu hỏi nói ra đúng việc đang xảy ra — trang đang **chờ** một cú bấm nữa.

---

## 6. Sáng và tối: hai trạng thái, không có "theo hệ thống"

- `.dark` trên `<html>`. Hệ thống chỉ quyết định lần mở **đầu tiên**; sau đó luôn theo đúng
  lựa chọn người dùng đã bấm, kể cả khi OS đổi giao diện.
- **Không hardcode màu.** Mọi màu đi qua token `--wb-*`; token tự đảo trong `.dark`. Viết
  `#fff` là một chỗ sẽ hỏng ở chế độ tối.
- **Chọn token theo KHOẢNG CÁCH, không theo tên.** `--wb-surface` và `--wb-surface-2` ở chế
  độ tối chỉ cách nhau 7 đơn vị xám (`#131316` so với `#1a1a1e`), nên một chip `--wb-surface`
  đặt trên khối code `--wb-surface-2` là gần như tàng hình. Cần một khối nổi rõ trên nền
  khác thì dùng `--wb-canvas` — nó cách xa nhất ở **cả hai** chế độ.
- **Kiểm cả hai chế độ** trước khi xong. Lỗi hay gặp nhất: nền lấy `--wb-fg` mà chữ lấy một
  token không tồn tại → chữ cùng màu nền, đọc được ở chế độ này và biến mất ở chế độ kia.

---

## 7. Số

Mọi chỗ có số xếp thành cột hoặc số hay đổi tại chỗ: `font-variant-numeric: tabular-nums`.
Không có nó thì `1` → `11` làm cả nút nhảy bề rộng, và một cột số trong bảng đọc như bị lệch.

---

## 8. Kiểm bằng mắt — và cái bẫy của pane preview

Cổng **không thấy được layout**. Sửa giao diện thì phải mở trang. Cách mở ở
[../HANDOFF.md](../HANDOFF.md) mục "Chạy preview". Bốn cái bẫy:

1. **Screenshot khi cuộn sâu, khi có LỚP PHỦ mở, hay khi có canvas z-index cực cao → khung
   đen** — giới hạn compositor của pane, không phải lỗi của trang. Ba thứ đã trúng bẫy này:
   khối ở cuối bài, dock `Notes` / popup đang mở, và **pháo giấy** (`#dsConfetti`,
   z-index 2147483647). Muốn kiểm chúng thì **đừng tin screenshot** — đọc DOM/CSS bằng
   `javascript_tool`: cấu trúc nhóm ghi chú bằng `querySelectorAll`, độ trong suốt của canvas
   pháo giấy bằng `getImageData(0,0,1,1)` (góc phải ra alpha 0 → người dùng thật thấy xuyên
   qua). Muốn thấy một khối ở cuối bài thì xoá các khối đứng trước nó trong DOM rồi cuộn lên.
2. **`getComputedStyle` đọc ngay trong cùng một lượt với lúc vừa đổi class/theme có thể ra
   giá trị CŨ.** Đổi ở một lệnh, đọc ở lệnh sau — nếu không sẽ đi sửa một lỗi không tồn tại.
   Cùng lý do: đổi `.dark` bằng JS xong screenshot ngay có thể ra ảnh của theme cũ.
3. Lặp qua nhiều bài bằng `location.hash` thì **bỏ qua `await` nếu hash không đổi** — set
   lại đúng hash hiện tại thì `hashchange` không bắn và script treo. Và `location.hash = …`
   **không** tải lại trang, nên thứ chỉ đọc `localStorage` lúc khởi động sẽ không thấy dữ
   liệu vừa ghi: phải `location.reload()`.
4. **Pane ẩn giữa hai lệnh tool thì trang bị đóng băng — và nó nói dối chứ không báo lỗi.**
   Ba dấu hiệu của cùng một nguyên nhân: `innerWidth` trả **0** (nên canvas đặt theo
   `innerWidth` ra bề rộng 0 và `drawImage` ném `InvalidStateError`), `requestAnimationFrame`
   không tick, và **transition không tiến** — nên `getComputedStyle` trả giá trị **lệch một
   nhịp**: đo lúc mở ngăn thì `padding` còn 0, đo lúc đóng thì mới thấy giá trị của lúc mở.
   Đọc theo đó là đi sửa một lỗi không tồn tại. Hai cách xử:
   **(a) chụp một ảnh màn hình → pane tỉnh lại** (và kiểm `innerWidth` khác 0 trước khi đo);
   **(b) đo trạng thái CUỐI thì tắt hẳn transition** — chèn
   `*,*::before,*::after{transition:none !important}` rồi đo, rồi bỏ style đó ra. Muốn đo
   *thời gian* của một animation thì xem cách bơm khung ở §9.

---

## 9. Pháo giấy — chúc mừng khi ĐẠT một bài (`celebrate()`)

Chủ trang yêu cầu 2026-08-05. Khi một bài lần đầu chạm **mức cao nhất của nó** (đọc-xong
với bài không có deliverable, hoặc đạt-deliverable với bài có), trang bắn pháo giấy.

- **Kích hoạt ở TIẾN ĐỘ, không ở nút.** `celebrate()` gọi từ `setLevel()` khi
  `lvl >= maxLevel(l) && before < maxLevel(l)` — nên cả pip trong cây lẫn nút cuối bài đều
  bắn, còn `loadProgress()`/undo/import ghi thẳng vào `prog` (không qua `setLevel`) nên
  **không** bắn lúc tải trang. "Hoàn thành một bài" là sự kiện của tiến độ, không của một cái nút.
- **Không tự nhảy bài.** Trước đây đạt mức cao nhất thì `setTimeout` nhảy sang bài sau; chủ
  trang bỏ (2026-08-05) — đánh dấu xong thì ở lại để đọc lại / ghi chú.
- **Layer cao nhất, không chặn gì.** Một `<canvas id="dsConfetti">` `position:fixed`,
  `z-index: 2147483647` (trên popup 100/101 và dock 90), `pointer-events:none`. Giấy trong
  suốt ở chỗ không có mảnh (clearRect), nên trang phía sau vẫn thấy và vẫn bấm được.
- **Tôn trọng `prefers-reduced-motion`**: người tắt chuyển động thì bỏ hẳn hiệu ứng.
- **BA dial rời nhau — đừng xoay sai cái.** Vận tốc rơi cố ý chậm (`vy`/`g` đã giảm 75%
  theo yêu cầu chủ trang), nên **`vy` không phải dial của bất kỳ câu nào dưới đây**:

  | muốn đổi | xoay | đang là |
  |---|---|---|
  | mảnh đầu hiện khi nào | `INSTANT` — số mảnh có `spawn = 0` và `y` sát mép trên | 3 mảnh → **0 ms (khung 1)** |
  | hiệu ứng dài bao lâu | `SPAWN_WINDOW` (mảnh vào khung rải trong bao lâu) + `BAND` (dải sinh cao mấy lần chiều cao màn) | 3000 ms + 2 → **canvas tắt 7,2 s** |
  | trên màn dày bao nhiêu | `COUNT` | 70 mảnh → **đỉnh 46 mảnh lúc 3,0 s** |

  `INSTANT` phải là **khai báo tường minh**, đừng để độ trễ đầu phụ thuộc `COUNT`: dải sinh
  bốc ngẫu nhiên thì mảnh gần `y = 0` chỉ xuất hiện *nhờ đông*, nên giảm `COUNT` là độ trễ
  tự bật lên (đo được: 140 → 70 mảnh thì 33 ms → 250 ms). `BAND` dùng **luỹ thừa 3** để đại
  đa số mảnh vẫn nằm sát mép trên, một ít lên tới 2 lần chiều cao màn tạo đuôi — dải PHẲNG
  thì mất hết mảnh gần mép và mảnh đầu tụt về 517 ms.
- **`VMAX` là hệ quả của `BAND`, không phải lựa chọn thẩm mỹ.** Mảnh sinh ở −2 lần chiều cao
  màn rơi tự do hai màn trước khi vào khung; không chặn thì nó lao qua khung nhanh gấp ba
  mảnh sinh sát mép — cùng một hiệu ứng mà hai tốc độ. `VMAX` = 7,6 px/khung × dpr đúng bằng
  vận tốc mảnh sinh sát mép đạt được lúc tới đáy, nên tốc độ rơi **nhìn thấy** không đổi.
- **Tự dọn**: mảnh rơi khỏi mép dưới là hết, không đợi `LIFE`; canvas biến mất ~7,2 s sau
  khi bắn, trải **86% chiều cao màn** lúc dày nhất. `LIFE` (9000) chỉ là hạn mờ dần cho mảnh
  chưa kịp ra khỏi khung — nó phải lớn hơn quãng bay dài nhất, nếu không mảnh sinh cao nhất
  mờ mất giữa khung. Gọi lại khi đang chạy thì huỷ vòng cũ trước (một canvas một lúc).
  Vanilla, không thư viện — trang là một file HTML tự chứa.
- **Kiểm**: screenshot ra khung đen (§8) — đọc `getImageData` để xác nhận canvas trong suốt,
  và `localStorage` để xác nhận `hash` không đổi (không nhảy bài).
- **Đo được THỜI GIAN dù pane đóng băng rAF.** Tab preview thường ở `visibilityState:
  hidden` giữa hai lệnh tool, nên rAF không chạy và mọi phép đo theo đồng hồ thật ra 1 khung.
  Cách đo: chặn `requestAnimationFrame` (giữ callback lại) **và** `performance.now` (đồng hồ
  giả cộng 1000/60 mỗi vòng), rồi tự bơm khung hình — chạy đúng code thật nhưng theo thời
  gian xác định. Đếm mật độ bằng `drawImage` canvas thật xuống một canvas 160×90 rồi đọc
  alpha, đừng `getImageData` cả canvas mỗi khung. Nhớ trả lại hai hàm gốc khi xong. Muốn
  so trước/sau thì `git show HEAD:<file> > scratchpad/old.html` rồi đo hai bản cùng một
  cỡ cửa sổ.

---

## 10. Trắc nghiệm tự kiểm (`.ds-quiz`)

Mỗi bài có một bộ câu hỏi trắc nghiệm ở cuối. Nội dung câu hỏi ở **`data/quiz.json`**, không
trong HTML — **cách thêm/sửa và luật nội dung ở [editing.md](editing.md) việc 7**; mục này chỉ
nói *nó trông thế nào, nằm ở đâu, hành xử ra sao*.

**Nằm ở đâu.** Trang chính: một `<section class="ds-quiz-mount">` chèn trong `render()` **ngay
sau hộp kết bài (`gainBox`)**, trước `.ds-nodefoot` (tự đánh giá + pager). Thứ tự đó là chủ ý:
đọc bài → thấy mình vừa được gì → **tự kiểm** → mới đánh dấu mức.

**Ô cắm luôn được phát ra, kể cả khi bài không có câu hỏi.** Lúc `render()` chạy thì JSON có
thể chưa về, nên `quizSection()` không thể hỏi "bài này có quiz không". Ô rỗng vô hại: class
`.ds-quiz` (viền + nền + `margin-top`) do `mount()` gắn, nên chưa mount thì section không
chiếm một pixel nào. **Đừng đặt luật hình thức lên `.ds-quiz-mount`** — đặt lên `.ds-quiz`.

**Một module, hai trang, một file nội dung.** `DSQuiz.mount(root, questions)` (khối "QUIZ
MODULE" trong `<script>`) dựng cả carousel. Trang chính gọi nó trong `enhance()` sau khi
`loadQuiz()` xong; `roadmap.html` gọi đúng nó trong một **popup** (`build-roadmap.mjs` TRÍCH
nguyên khối JS + mọi rule `.ds-quiz`, y như cách nó trích khối tương tác). Cả hai trang
`fetch('data/quiz.json')` — nên **sửa câu hỏi không cần build lại roadmap**, chỉ sửa carousel
mới cần. Sửa carousel là sửa ở trang chính rồi build lại, đừng chạm `roadmap.html`.

**Ô này là block DUY NHẤT trong bài mang viền nặng.** 2px `--wb-fg` + `--wb-shadow-md`, trong
khi mọi khối khác chỉ có viền chỉ `--wb-border`. Lý do: đây là chỗ duy nhất đòi người đọc *làm*
chứ không *đọc*, nên lướt qua phải nhận ra ngay. Thêm một block thứ hai nặng bằng nó là mất
sạch tác dụng của cả hai. Dark mode hạ viền về `--wb-gray-500` (`--wb-fg` là trắng gần tuyệt
đối, chói trên `#131316`) — rule `.dark .ds-quiz` đặt **cạnh** rule kia, KHÔNG dùng token khai
ở `:root`, vì bộ trích của `build-roadmap` lọc theo selector khớp `.ds-quiz`.

**Hành xử (chủ trang yêu cầu, giữ đúng bốn điều):**

1. **Một câu mỗi lần, tua ngang.** `.ds-quiz__track` dịch bằng `translateX(-cur*100%)`,
   `.ds-quiz__viewport` cắt bằng `overflow:hidden`. Bốn cách tua: nút ‹ ›, vạch tiến độ, phím
   ←/→, và **vuốt** — kéo ngón tay/bút (có chùn ở mép), hoặc vuốt ngang trên trackpad (sự kiện
   `wheel` có `deltaX`, chỉ nhận khi `|deltaX| > 1,5 × |deltaY|` để không cướp cuộn dọc).
   **Chuột bị loại khỏi kéo** — giữ trái rồi rê là thao tác bôi chữ.
2. **Chọn đáp án KHÔNG tự chuyển câu.** Bấm một ô chỉ đánh dấu `aria-checked`; đổi được tới
   khi chấm. Đây là điều khác một quiz thường và là yêu cầu rõ của chủ trang — đừng "tiện tay"
   cho nhảy câu.
3. **Trả lời HẾT mới bật nút Chấm điểm** (nhãn đếm `Chấm điểm · k/N`). Chấm xong: mỗi ô hiện
   đúng/sai, `.ds-quiz__why` bung ra, có dải điểm, nút đổi thành **Làm lại**.
4. **Làm lại** xoá sạch về câu 1.

**Bố cục — mỗi thông tin đúng MỘT chỗ.** Đầu ô: tên + bộ đếm `3 / 5` (`.ds-quiz__count`,
`margin-left:auto` để vẫn nằm phải khi popup ẩn tiêu đề). Dải điểm nằm **ngay dưới đầu ô**, không
ở đáy: chấm xong người đọc tua lại xem câu sai, kết quả phải đứng yên ở trên. Đáy là **một** hàng
`.ds-quiz__bar`: ‹ › · vạch tiến độ · nút hành động. Số câu từng nằm ba chỗ (trong đề, ở dãy chấm,
ở một ô `k/N` riêng) — giờ một chỗ. ≤560px vạch tiến độ xuống hàng riêng, nếu không mỗi vạch teo
còn ~10px.

**Bàn phím + thứ tự Tab.** Câu không hiện phải `inert` + `aria-hidden`: thiếu nó thì Tab đi
xuyên cả N câu (~28 điểm dừng cho bài 5 câu) và trình đọc màn hình đọc luôn những câu nằm ngoài
khung. ← → **luôn** đổi câu, kể cả khi tiêu điểm đang ở một đáp án; ↑ ↓ đi giữa các đáp án
(quy ước radiogroup); `1…6` / `a…f` chọn thẳng. Listener gắn trên `root` nên không cướp phím của
trang hay panel ghi chú.

**Màu theo thang §1 / CLAUDE.md.** Trung tính hoàn toàn tới khi chấm: ô đang chọn chỉ tô
`--wb-ink-hover` + viền `--wb-fg`. **Chỉ sau khi chấm** mới có màu trạng thái — xanh
(`--wb-success*`) cho đáp án đúng, đỏ (`--wb-danger*`) cho ô người dùng chọn sai; ô còn lại lùi
về nền trang + chữ mờ. Đúng/sai *là* trạng thái, nên đây là chỗ hợp lệ để tiêu màu.

**Bốn cái bẫy đã dính, giữ nguyên cách chữa:**

- **`box-sizing: border-box` cho CẢ cây `.ds-quiz`.** Kit chỉ đặt border-box cho phần tử `wb-*`;
  phần còn lại của trang là `content-box`. Trong một carousel đó là lỗi **chạy được**, không phải
  chuyện gọn gàng: slide `flex:0 0 100%` cộng thêm `padding:0 1px` thành rộng hơn khung 2px,
  trong khi track dịch đúng `cur × 100%` **khung** — nên tới câu *i* lệch `2i` px, câu bên cạnh
  thò ra và câu đang đọc bị cắt (đo được 6px ở câu 4). Ô đáp án `width:100%` + padding 13px cũng
  tràn 26px vì cùng lý do. **Đừng đặt padding ngang lên `.ds-quiz__slide`** — chỗ cho vòng focus
  nằm ở viewport (`padding:4px; margin:-4px`).
- **`.ds-quiz__why[hidden]` phải tự khai `display:none`.** `.ds-quiz__why{display:flex}` thắng
  `[hidden]{display:none}` của trình duyệt ở cùng độ đặc hiệu (đúng lỗi `.wb-drawer[hidden]` ở
  §1.2) — thiếu dòng đó thì giải thích hiện ra trước khi chấm. Cùng lý do, `.ds-quiz__score` cố ý
  **không** dùng flex: một dòng chữ chảy, vì `gap` vẽ khoảng trắng cho mắt mà không có ký tự nào
  nên trình đọc màn hình đọc liền "4/5câu đúng".
- **Margin dọc trong quiz trỏ vào thang `--ds-sp-*`** (§0.6), không px trần — nếu không `G-SPACING`
  kêu, và `roadmap.html` phải khai sẵn `--ds-sp-text/-block` để bản trích chạy.
- **Popup roadmap: đừng lồng hai khung.** `DSQuiz.mount` gắn class `.ds-quiz` (có viền + nền +
  `margin-top` + bóng) lên chính phần tử nhận, nên trong modal phải mount vào **một div CON** rồi
  `#quizModalBody .ds-quiz{border:0;background:none;padding:0;margin:0;box-shadow:none}` mới bỏ
  được khung trong. Popup cũng ẩn tiêu đề "Kiểm tra nhanh" — đầu modal đã ghi tên bài.

**Popup ở roadmap = modal của kit** (`wb-overlay--blur` + `wb-modal`, tham khảo `facts/index.html`),
**khác** ngăn tóm tắt (ngăn KHÔNG phủ). Kit cho `.wb-overlay` z-index 100, `.wb-drawer` 101, nên
`#quizModal` phải nâng lên (`z-index:200`) để nằm TRÊN ngăn. Đóng bằng ✕ / Esc / bấm nền, và
bấm-nền dùng chốt `pointerdown`+`pointerup` để kéo chữ ra nền không đóng oan (lỗi phiên (q)); Esc
đóng popup TRƯỚC, rồi mới tới ngăn.

**Không dùng KaTeX trong câu hỏi.** Popup roadmap không nạp KaTeX; text câu hỏi là HTML tin cậy
(`<code>/<b>/<i>`) nhưng **không** `$…$` — ký hiệu toán viết bằng Unicode.
