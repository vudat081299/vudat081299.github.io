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

Hai mục trong `CLAUDE.md` là **luật cứng**, không phải gợi ý, và file này không lặp lại
chúng — nó chỉ cho biết cách áp dụng:

- **§7 — ba tầng trình bày.** Cái gì lên mạch chính, cái gì vào popup, cái gì vào drawer.
- **§10 — khổ chữ.** Cả trang chỉ có **một mép phải**.

---

## 0. Luật của lớp vỏ — bốn thứ áp cho CẢ trang

Mục §1–§8 nói về **một khối nội dung**. Mục này nói về **lớp vỏ**: thanh trên, thanh bên,
chân trang, tiêu đề tab, và cách cả trang được đo. Chúng không phải "tính năng" nên dễ
bị bỏ qua khi soát — nhưng sai thì người đọc thấy ngay từ giây đầu, trước cả khi đọc
được chữ nào.

### 0.1 Lớp vỏ nói tiếng Việt

Thuật ngữ **trong bài** giữ tên gốc theo `CLAUDE.md` §11 (định nghĩa ngay lần đầu, dùng
nhất quán). **Lớp vỏ thì không**: nó là chỗ điều hướng, không phải chỗ dạy, nên không có
lý do gì để một người mới phải đọc tiếng Anh ở đó.

Cụ thể là những chỗ này: `<title>` · `<meta description>` · tên trang trên thanh trên ·
mọi nhãn nút · dòng tiến độ ở thanh bên · chân trang · nhãn ô tìm kiếm · tiêu đề popup /
ngăn phụ / sổ học · `aria-label` và `title=` (trình đọc màn hình đọc chúng thành tiếng).

Đã sửa theo luật này: `roadmap` → **lộ trình học** · `workload` → **khối lượng** ·
`artifact và acceptance criteria` (chân trang) → **sản phẩm làm ra và tiêu chí đạt**.

**Ngoại lệ duy nhất: panel ghi chú tên là `Notes`.** Nó từng tên "Sổ học", và chủ trang bỏ
cái tên đó vì nó mô tả *cơ chế* (`LEARNING-LOG.md`, cổng `G-LEARN`, mục `## Sổ`) chứ không
mô tả *việc người dùng đang làm* — người dùng chỉ đang ghi một cái note. Ranh giới:

- **tên của panel** = `Notes` (nhãn nút, tiêu đề dock, `aria-label`, `title=`);
- **mọi câu nói về nó** = tiếng Việt, và dùng từ **ghi chú**, không dùng "sổ" ("Tải ghi chú
  về máy", "Chưa có ghi chú nào cho bài này");
- **tên cơ chế** (`LEARNING-LOG.md`, `## Sổ`, `learn.mjs --sync`) giữ nguyên — chúng là
  đường dẫn và cú pháp file, không phải nhãn giao diện.

Đừng "sửa lại cho đúng luật" thành `Ghi chú`: đây là quyết định của chủ trang, ghi ở đây
đúng để phiên sau không đổi ngược.

Và khi một từ đã đổi ở lớp vỏ thì **phải đổi luôn trong bài** — hai tên cho một khái niệm
là đúng thứ `CLAUDE.md` §11 cấm. `khối lượng` được nêu kèm tên tiếng Anh **đúng một lần**
ở trang chủ, để người học tra được khi gặp ở nơi khác.

Tự kiểm: mở trang, chạy trong console
`document.querySelector('.wb-navbar').innerText + document.querySelector('.ds-rail').innerText`
— chữ tiếng Anh duy nhất được phép còn lại là tên ligature của icon (`search`, `edit_note`),
vì đó là *nội dung* của font icon chứ không phải chữ hiển thị, cộng với `Notes` ở trên.

### 0.2 Nới cột thì phải nới chữ — hai token đi cùng nhau

Số ký tự trên một dòng = bề rộng cột ÷ bề rộng một chữ. Nên `--ds-measure` (bề rộng) và
`--ds-fs` (cỡ chữ) **luôn đổi cùng nhau**; đổi một cái là tự đẩy độ dài dòng ra ngoài
khoảng dễ đọc 45–90 ký tự. Với tiếng Việt hãy nhắm **nửa dưới** của khoảng đó: từ tiếng
Việt ngắn hơn từ tiếng Anh, nên cùng một số ký tự là nhiều từ hơn để mắt phải quét.

Đo lại 2026-08-04, cửa sổ 1440px (chỉ tính **dòng đầy**, bỏ dòng cuối dở):

| cột / chữ | trung vị | p90 | cao nhất | |
|---|---|---|---|---|
| 860 / 18px | 102 | 108 | 118 | bản trước — **đã ở ngoài khoảng** |
| 1060 / 26px | 91 | 95 | 104 | còn sát trần |
| 1060 / 27px | 88 | 91 | 104 | ~ |
| **1060 / 28px** | **84** | **88** | **93** | **đang dùng** |

`--ds-fs` là **`clamp()`**, nên `28px` chỉ là đầu rộng của thang: 17px ở cửa sổ 375px,
nội suy thẳng, 28px từ cửa sổ ~1306px trở lên. Lý do phải fluid: cột cũng co theo cửa sổ,
nên chữ cố định 28px trên điện thoại còn **30 ký tự/dòng** — dưới sàn 45. Đo ba đầu:
375px → cột 339px, trung vị 47 · 1000px → cột 656px · 1440px → cột 954px, trung vị 84.

⚠️ **Hai con số 75 và 81 từng ghi ở bảng này (cho 720/16 và 860/18) là đo sai** — bản đo
cũ gom ký tự theo `top` với ngưỡng quá rộng nên gộp hai dòng thành một. Kiểm lại bằng cách
in **thẳng chuỗi của từng dòng** ra rồi đếm tay: một dòng 774px ở 18px chứa 100–103 ký tự.
Nghĩa là bản 860/18 đã ở ngoài khoảng dễ đọc, và lần nới này *vừa rộng hơn vừa dễ đọc hơn*.

Cách đo lại — và **luôn in một dòng ra để kiểm chính cái thước**:

```js
// tách dòng bằng rect TỪNG KÝ TỰ; ngưỡng 4–6px, không lớn hơn
const el = document.querySelector('#main .ds-prose > p');          // đoạn thân bài
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

**Bỏ dòng cuối** của mỗi đoạn là bắt buộc: nó luôn dở nên kéo trung vị xuống và làm một
khổ đã quá rộng trông như vẫn ổn.

Kèm theo — mọi cỡ chữ **trong cột bài** phải suy ra từ `--ds-fs`, không được là px cứng:

- bậc tiêu đề (`h2/h3/h4`), bảng, `.wb-help` đặt bằng `em`;
- **bốn token chữ của kit được định nghĩa lại trong `#main`** (`--wb-text-title/-body/`
  `-help/-caption` = `calc(var(--ds-fs) * .84/.78/.72/.67)`), vì ~35 lớp `ds-*` đọc chúng.
  Đặt ở `#main` chứ không `.ds-prose`: dải mục tiêu, breadcrumb, chip, hộp kết bài, pager
  nằm ngoài `.ds-prose` nhưng vẫn thuộc cột bài. Dùng `calc()` **không dùng `em`** — `em`
  trong custom property giải ở chỗ dùng nên hai lớp lồng nhau sẽ nhân dồn.

Vì sao quan trọng: một đoạn 13px trải hết cột 954px là **hơn 170 ký tự/dòng**. Và
`--wb-text-body` của kit là 14px, nhỏ hơn thân bài — nên `h4` từng nhỏ hơn đoạn văn nó
đứng đầu.

### 0.3 Trang tự mở ở 90%

`html { zoom: var(--ds-zoom) }`, `--ds-zoom: .9`. Việc của nó **không phải** làm chữ nhỏ
đi — `--ds-measure` và `--ds-fs` lo cỡ chữ. Việc của nó là làm **lớp vỏ** nhỏ đi: thanh
trên, thanh bên, nút, chip, chân trang đều là px trong bộ kit và không có token nào để
nới, nên zoom là cách duy nhất co cả bộ đó cùng một nhịp mà không sửa từng con số của kit.
Kết quả: chữ bài hiện ra 28 × 0,9 ≈ 25,2px trong cột 1060 × 0,9 ≈ 954px, lớp vỏ nhỏ hơn
10% — đúng thứ tự ưu tiên muốn có. Zoom của trình duyệt **nhân thêm** lên số này, nên
người đọc vẫn tự điều chỉnh được.

**Cái bẫy, và nó đã cắn hai lần:** `zoom` không điều chỉnh đơn vị viewport. Đo thật: trong
`zoom:.9`, một khối `width:100vw` ra **1152px** trên cửa sổ 1280px — `100vw` vẫn là 1280
*đơn vị cục bộ* rồi bị co 0,9. Hệ quả lần thứ hai (phiên (g) → (h)): kit đặt
`--wb-shell-h: 100dvh` và `.wb-drawer { height: 100vh }`, nên **thanh bên, ngăn phụ và
dock ghi chú đều cụt đúng 10% đáy**.

Luật, không có ngoại lệ: **trong trang này không viết `vh`/`vw`/`dvh` trần.** Dùng hai
token ở `:root`:

```css
--ds-vh: calc(1vh / var(--ds-zoom));   /* 1% chiều cao cửa sổ THẬT */
--ds-vw: calc(1vw / var(--ds-zoom));   /* 1% chiều rộng cửa sổ THẬT */
```

Chỗ đang dùng: `--wb-shell-h` (override token của kit — kit tự ghi chú "override if the
page is zoomed"), `.wb-drawer` (height + max-width, sửa ở **lớp** nên cả ngăn phụ lẫn dock
đúng theo), `.ds-notesdock` (height), `.ds-mathmodal` (width + max-height body),
`.ds-drawer` (width), `--ds-bleed`, `--ds-dock-w`, `--ds-fs`. `tools/gate.test.mjs` có một
ca canh việc này.

Hai thứ khác cùng gốc:

- **Media query** cũng so với `viewport / zoom`. Một `min-width: 1200px` ở đây thật ra là
  ngưỡng **1080px thật**. Trang có 5 ngưỡng: bốn cái `560px` (lớp vỏ trên điện thoại — tức
  504px thật) và một cái `1333px` = 1200 thật (dock nhường chỗ). `gate.test.mjs` in cả 5 ra
  mỗi lần chạy, đúng để lần thêm cái thứ sáu không ai quên chia.
- **`position: fixed` thì Chrome xử lý đúng** — đã kiểm, popup và ngăn phụ vẫn phủ kín.
- **`getBoundingClientRect()` và `clientX` là px SAU zoom; `getComputedStyle().width` là px
  cục bộ.** Trộn hai hệ là cách để một tay kéo nhảy 10% mỗi lần kéo. Quy tắc: từ chuột vào
  CSS thì **chia** zoom, từ CSS ra chuột thì **nhân**.

### 0.4 `Notes` là tầng thứ tư: dock, không phải lớp phủ

Ba tầng ở `CLAUDE.md` §7 đều là chỗ **đọc**, nên chúng là lớp phủ: mở ra thì trang phía
sau bị chặn, đóng lại là về chỗ cũ. `Notes` là chỗ **viết về cái đang đọc**, nên luật
ngược lại: mở ra thì trang vẫn phải **cuộn được, bấm được, chọn chữ được**.

Ba việc để nó thật là dock — thiếu một cái là nó lại thành lớp phủ:

1. `wb-overlay--pass` (không làm tối nền, không nhận chuột — con của nó nhận lại).
2. **Không** `inert` cái nền, **không** nhốt tiêu điểm, **không** `aria-modal`. Ba thứ đó
   *là* định nghĩa của modal; khai nhầm thì trình đọc màn hình nói sai với người dùng.
3. Thân trang **nhường chỗ** đúng `--ds-dock-w` (`body.ds-dock-on`), nên dock không đè
   lên chữ. Cột co lại và chữ gói lại dòng — đó là giá phải trả, và nó rẻ hơn việc che
   mất đoạn văn đang được ghi chú. Dưới 1200px **thật** thì hết chỗ nhường: dock nằm đè
   (media query `1333px`, xem §0.3 — con số phải đã chia zoom).

Hệ quả cần biết: `Notes` **không** nằm trong `LAYER_IDS`, nên Esc chỉ đóng nó khi không
còn popup nào mở, bấm ra ngoài không đóng nó (bấm để chọn một câu mà mất cái đang viết
là đúng cái bẫy dock tồn tại để tránh), và mở popup toán không làm mất nó.

**Bề rộng: mặc định 1/4 cửa sổ, kéo được.** Không phải một số px cố định, vì dock lấy chỗ
của cột bài nên "bao nhiêu là đủ" phụ thuộc cửa sổ — 380px là 30% cột trên màn 1280 và 15%
trên màn 2560. Bốn luật của phần này:

1. Mặc định là `clamp(300px, calc(25 * var(--ds-vw)), 640px)` — **CSS tính, không phải JS**.
   Nghĩa là người chưa từng kéo thì đổi cửa sổ vẫn luôn được đúng 1/4.
2. Kéo thì JS ghi `--ds-dock-w` bằng **px cục bộ** và lưu `localStorage['ds.dockW']`.
   Reset (nhấn đúp tay kéo, hoặc Enter/Space khi tay kéo có tiêu điểm) = **xoá** khoá đó,
   không phải ghi lại 25% — để mặc định fluid quay về đúng nghĩa mặc định.
3. Đọc bề rộng hiện tại bằng `getComputedStyle(dock).width`, **không** bằng
   `getBoundingClientRect()`: rect ra 0 khi dock đang đóng (`.wb-overlay` là `display:none`)
   và rect là px sau zoom (xem §0.3).
4. Tay kéo là `<div role="separator" tabindex="0">` với `aria-valuemin/max/now/valuetext`,
   và **bàn phím phải đổi được** (←/→ 16px, Shift ×4, Home/End hai đầu). Một tay kéo chỉ
   chuột dùng được thì nó không phải điều khiển, nó là cái bẫy.

Tay kéo là một **viên 5×44px luôn thấy** ở giữa mép trái, không phải một vạch 1px hiện khi
hover. Vạch 1px trông "mỏng mỏng" và không nói được rằng nó kéo được; hình viên thuốc là
hình mà người dùng đã học nghĩa "kéo tôi" từ chỗ khác. Hover/tiêu điểm/đang kéo thì nó đổi
**màu và chiều cao** — đừng đổi bề rộng hay `left`, vì đổi hai cái đó thì tay nắm nhảy ngang
đúng lúc con trỏ vừa tới. Vùng bấm 13px, rộng hơn thứ nhìn thấy. Phụ đề dock vẫn nói ra rằng
mép trái kéo được.

**Danh sách ghi chú: MỘT danh sách, không lọc theo bài đang mở.** Bản đầu mặc định lọc "bài
này", nên đổi bài là danh sách trông như vừa bị xoá sạch — ghi chú là của cả quá trình học,
không phải của một trang. Năm luật của phần này:

1. Mọi ghi chú, **mới nhất trước**, và **mỗi dòng tự khai nó thuộc bài nào** — cái nhãn đó
   là link mở bài, và bấm nó **giữ panel mở** (bạn bấm sang bài đó chính vì muốn xem lại chỗ
   đã ghi).
2. **Hàng, không phải thẻ.** Thẻ = nền riêng + viền quanh + mép trái 3px màu + bo góc một
   bên: bốn thứ trang trí cho một dòng chữ, và trong một dock hẹp chúng cộng lại thành nhiễu.
   Hàng phẳng ngăn nhau bằng một vạch, chữ ghi chú là thứ đậm nhất.
3. **Không nhãn cho loại mặc định.** `tắc` và `gỡ` được nói hai lần (điểm màu + chữ, cho
   người không phân biệt được màu); `ghi` là mặc định nên nó không có nhãn nào — nhãn cho
   thứ mặc định là nhiễu.
4. **Sửa/xoá chỉ hiện khi hover hoặc `:focus-within`** (hai nút × 20 ghi chú = 40 nút cạnh
   chữ). `@media (hover: none)` cho chúng hiện sẵn trên màn cảm ứng.
5. **Ô ghi `resize: none` + tự cao dần bằng JS.** Tay kéo chéo mặc định của trình duyệt ở
   góc dưới-phải là chi tiết duy nhất trong panel mà trang không kiểm soát được màu lẫn hình,
   nên nó luôn trông lạc.

**Số ghi chú trên nút ở thanh trên KHÔNG phải badge.** Viên đặc màu nghịch đảo là ngôn ngữ
của "có việc chưa xử lý" — tin nhắn chưa đọc, lỗi chưa xem. Ghi chú của chính mình không
phải việc tồn, nên viên đó vừa xấu vừa nói sai. Đúng: một con số sau nhãn, ngăn bằng một
vạch mảnh, đọc như `Notes · 3`. Và **đừng tô màu con số theo "có chỗ tắc"** — nó là *tổng*
ghi chú, tô vàng vì 2/5 dòng là chỗ tắc thì màu đang nói sai về chính con số nó đứng cạnh;
số chỗ tắc được nói ở tiêu đề mục "Đã ghi" và ở tooltip của nút.

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
| **Dock** (tầng thứ tư) | không phải chỗ đọc mà là chỗ **viết về** cái đang đọc | Hiện chỉ có **sổ học**. Khác cả ba tầng trên ở chỗ nó KHÔNG chặn trang — xem §0.4. |
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

**Lỗi ngược cũng là lỗi.** Rút quá nhiều vào popup thì mạch chính rỗng: một bài mà nội
dung thật nằm hết trong 6 cái chip thì không còn là bài học, nó là mục lục. Ngoại lệ hợp
lệ duy nhất là hai bài tra cứu (`s-lookup`, `t-stack`) — chúng *là* index, có chủ ý.

**Phép thử cuối, bắt buộc:** đọc hết mạch chính của bài, **không mở một popup nào**. Có
theo được không? Nếu một đoạn trên mạch chính chỉ hiểu được sau khi mở popup thì phần
thiếu đó thuộc mạch chính — kéo nó lên.

---

## 2. Khổ chữ: một mép phải

Chi tiết và chín con số ở `CLAUDE.md` §10; cách nới cột cho đúng ở **§0.2** trên. Bốn điều
cần nhớ khi thêm một khối:

1. **Đừng đặt `max-width` cứng.** Cột nội dung *đã* đúng bằng khổ chữ. Cổng `G-MEASURE` bắt.
2. **Bảng là khối duy nhất được tràn ra hai bên** (`--ds-bleed`). Code, card, alert, hộp
   kết bài đều dừng ở cùng mép với chữ.
3. **Muốn nới trang thì sửa `--ds-measure` + `--ds-fs`, và chỉ sửa hai cái đó** (§0.2 nói
   vì sao phải cả hai). Mọi thứ khác suy ra bằng `calc()`. Đơn vị `ch` bị cấm ở đây — nó
   co theo `font-size` nên `h2` và `<p>` cùng `74ch` ra hai mép lệch nhau 200px.
4. **Không px cứng cho cỡ chữ trong `#main`.** Cột rộng 954px thì một đoạn 13px là hơn 170
   ký tự/dòng. Dùng `em`, hoặc `calc(var(--ds-fs) * k)`, hoặc token của kit (bốn token đó
   đã được định nghĩa lại trong `#main` — §0.2). Px cứng chỉ đúng ở **lớp vỏ**, ngoài `#main`.

---

## 3. Dùng component nào

Trang dựng trên `../../web-builder/web-builder.css`. **Luật đầu tiên: tra kit trước khi
tự viết CSS.** Tự dựng một component đã có trong kit là thêm một ngôn ngữ hình thứ hai
cho cùng một việc.

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

**Ba token thường bị gõ sai** (không có trong kit, dùng là im lặng không có tác dụng):

| gõ sai | đúng |
|---|---|
| `--wb-bg` | `--wb-canvas` (nền trang) hoặc `--wb-surface` (nền thẻ) |
| `wb-btn--solid` | **không tồn tại.** `wb-btn` mặc định *đã* là nút đặc màu tối |
| `wb-segmented` | **không tồn tại.** Dùng `ds-lvlbtn` + `is-active` |

Cách tự kiểm trong 5 giây: `grep -c -- "--wb-canvas" ../../web-builder/web-builder.css`.
Ra `0` thì nó không tồn tại, và CSS sẽ **im lặng bỏ qua dòng đó** — không có lỗi nào hiện
ra, thuộc tính chỉ đơn giản không được đặt. Đây là loại lỗi đắt nhất trong CSS.

---

## 4. Nút bật/tắt: hai trạng thái phải **thấy được**

`.wb-btn` mặc định trong kit **đã là nút đặc màu tối**. Nghĩa là một nhóm nút mặc định
trông như đang được chọn hết. Trạng thái phải được định nghĩa cả hai đầu:

```
chưa chọn  →  .ds-lvlbtn            (nền trong suốt, có viền)
đang chọn  →  .ds-lvlbtn.is-active  (nền đặc, chữ đảo màu)
```

Và **một class trạng thái, không hai**. Đây là một lỗi thật đã xảy ra: code bật đồng thời
`wb-btn--solid` — một class không có trong kit — nên nút "đang chọn" ở cuối mỗi bài chỉ
khác nút thường bằng một vòng inset gần như vô hình trên nền tối. Nút không sai, CSS không
báo lỗi, chỉ là **không ai thấy mình đã bấm gì**.

---

## 5. Icon hay chữ

Cả hai đều đúng, tuỳ việc. Một câu để chọn:

> **Hành động lặp lại nhiều lần mà ngữ cảnh đã nói rõ nó làm gì → chỉ icon.**
> **Một tính năng cần được phát hiện → icon kèm nhãn chữ.**

| ví dụ trong trang | chọn gì | vì sao |
|---|---|---|
| sao chép khối code | **chỉ icon** `content_copy` | nó ở **175** khối code. Một chữ "Chép" cạnh mỗi khối là 175 lần nhắc một việc mà cái icon đã nói xong — nó thành nhiễu ngay cạnh đúng thứ người đọc cần đọc |
| **Sổ học** ở thanh trên | **icon + nhãn** | không ai đoán được cái bút chì mở ra cái gì; đây là tính năng phải tìm thấy được lần đầu |
| Sửa / Xoá một ghi chú | **chỉ icon** | lặp ở mọi ghi chú, và bút chì / thùng rác là hai icon phổ dụng nhất |
| Tải .md | **icon + nhãn** | ".md" là thông tin mà icon không nói được |

**Chỉ-icon vẫn phải nói được, ba việc bắt buộc, không bỏ cái nào:**

1. `aria-label` — trình đọc màn hình không thấy icon.
2. `title` — chuột hover ra chữ.
3. **Phản hồi sau khi bấm đổi hẳn icon, không chỉ đổi màu.** `content_copy` → `check`.
   Đổi màu một mình thì người không phân biệt được màu không thấy gì xảy ra.

Và **đừng nói dối trong phản hồi**: nhánh sao chép thất bại đổi sang `priority_high` +
"chọn đoạn code rồi bấm Ctrl/⌘+C", không phải dấu ✓.

---

## 6. Sáng và tối: hai trạng thái, không có "theo hệ thống"

- `.dark` trên `<html>`. Hệ thống chỉ quyết định lần mở **đầu tiên**; sau đó luôn theo
  đúng lựa chọn người dùng đã bấm, kể cả khi OS đổi giao diện.
- **Không hardcode màu.** Mọi màu đi qua token `--wb-*`; token tự đảo trong `.dark`. Viết
  `#fff` là một chỗ sẽ hỏng ở chế độ tối.
- **Kiểm cả hai chế độ** trước khi xong. Lỗi hay gặp nhất: nền lấy `--wb-fg` mà chữ lấy
  một token không tồn tại → chữ cùng màu nền, đọc được ở chế độ này và biến mất ở chế độ kia.

---

## 7. Số

Mọi chỗ có số xếp thành cột hoặc số hay đổi tại chỗ: `font-variant-numeric: tabular-nums`.
Không có nó thì `1` → `11` làm cả nút nhảy bề rộng, và một cột số trong bảng đọc như bị lệch.

---

## 8. Kiểm bằng mắt — và cái bẫy của pane preview

Cổng **không thấy được layout**. Sửa giao diện thì phải mở trang. Cách mở ở
[../HANDOFF.md](../HANDOFF.md) mục "Chạy preview". Ba cái bẫy đã dính:

1. **Screenshot khi cuộn sâu hay ra khung đen** — giới hạn compositor của pane, không phải
   lỗi của trang. Muốn thấy một khối ở cuối bài thì tạm ẩn `#prose` rồi cuộn lên đầu.
2. **`getComputedStyle` đọc ngay trong cùng một lượt với lúc vừa đổi class/theme có thể ra
   giá trị CŨ.** Đổi ở một lệnh, đọc ở lệnh sau — nếu không sẽ đi sửa một lỗi không tồn tại.
3. Lặp qua nhiều bài bằng `location.hash` thì **bỏ qua `await` nếu hash không đổi** — set
   lại đúng hash hiện tại thì `hashchange` không bắn và script treo.
