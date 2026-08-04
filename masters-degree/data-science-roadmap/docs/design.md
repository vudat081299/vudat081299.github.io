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

Và khi một từ đã đổi ở lớp vỏ thì **phải đổi luôn trong bài** — hai tên cho một khái niệm
là đúng thứ `CLAUDE.md` §11 cấm. `khối lượng` được nêu kèm tên tiếng Anh **đúng một lần**
ở trang chủ, để người học tra được khi gặp ở nơi khác.

Tự kiểm: mở trang, chạy trong console
`document.querySelector('.wb-navbar').innerText + document.querySelector('.ds-rail').innerText`
— chữ tiếng Anh duy nhất được phép còn lại là tên ligature của icon (`search`, `edit_note`),
vì đó là *nội dung* của font icon chứ không phải chữ hiển thị.

### 0.2 Nới cột thì phải nới chữ — hai token đi cùng nhau

Số ký tự trên một dòng = bề rộng cột ÷ bề rộng một chữ. Nên `--ds-measure` (bề rộng) và
`--ds-fs` (cỡ chữ) **luôn đổi cùng nhau**; đổi một cái là tự đẩy độ dài dòng ra ngoài
khoảng dễ đọc 45–90 ký tự.

Đo thật trên trang (tiếng Việt, chỉ tính **dòng đầy**, bỏ dòng cuối dở):

| cột / chữ | trung vị | cao nhất | |
|---|---|---|---|
| 720 / 16px | 75 | 84 | bản cũ |
| **860 / 18px** | **81** | **86** | **đang dùng** |
| 860 / 17px | 83 | 90 | sát trần |
| 900 / 17px | 89 | 93 | đã vượt |

Cách đo lại (đừng đo bằng cảm giác): với mỗi đoạn `<p>` trong `.ds-prose`, dùng `Range`
lấy `getBoundingClientRect().top` của **từng ký tự**, gom theo `top` để biết mỗi dòng có
bao nhiêu ký tự, rồi **bỏ dòng cuối** của mỗi đoạn. Bỏ dòng cuối là bắt buộc: nó luôn dở
nên nó kéo trung vị xuống ~8 ký tự và làm một khổ đã quá rộng trông như vẫn ổn.

Kèm theo: bậc tiêu đề trong bài (`h2/h3/h4`), cỡ chữ bảng và `.wb-help` đều đặt bằng `em`
để giãn theo `--ds-fs`. **Đừng dùng token px của kit cho chúng** — `--wb-text-body` là
14px, nhỏ hơn thân bài, nên `h4` từng nhỏ hơn chính đoạn văn nó đứng đầu.

### 0.3 Trang tự mở ở 90%

`html { zoom: var(--ds-zoom) }`, `--ds-zoom: .9`. Lý do: trang để đọc liên tục 45 phút,
nên "một màn hình thấy được bao nhiêu" quan trọng ngang "chữ to bao nhiêu". 90% cho thêm
~11% nội dung mỗi màn hình mà **không** đổi số ký tự/dòng (zoom co cả bề rộng lẫn cỡ chữ
cùng tỉ lệ). Chữ hiện ra thật là 18 × 0,9 ≈ 16,2px — đúng bằng cỡ chữ cũ.

Zoom của trình duyệt **nhân thêm** lên trên số này, nên người đọc vẫn tự điều chỉnh được.

**Cái bẫy:** `zoom` không điều chỉnh đơn vị viewport. Đo thật: trong `zoom:.9`, một khối
`width:100vw` ra **1152px** trên cửa sổ 1280px — `100vw` vẫn là 1280 *đơn vị cục bộ* rồi
bị co 0,9. Nên mọi công thức dùng `100vw` phải chia `var(--ds-zoom)`; hiện có một chỗ là
`--ds-bleed`. `position: fixed` thì Chrome xử lý đúng — đã kiểm: popup và ngăn phụ vẫn
phủ kín màn hình.

### 0.4 Sổ học là tầng thứ tư: dock, không phải lớp phủ

Ba tầng ở `CLAUDE.md` §7 đều là chỗ **đọc**, nên chúng là lớp phủ: mở ra thì trang phía
sau bị chặn, đóng lại là về chỗ cũ. Sổ học là chỗ **viết về cái đang đọc**, nên luật
ngược lại: mở ra thì trang vẫn phải **cuộn được, bấm được, chọn chữ được**.

Ba việc để nó thật là dock — thiếu một cái là nó lại thành lớp phủ:

1. `wb-overlay--pass` (không làm tối nền, không nhận chuột — con của nó nhận lại).
2. **Không** `inert` cái nền, **không** nhốt tiêu điểm, **không** `aria-modal`. Ba thứ đó
   *là* định nghĩa của modal; khai nhầm thì trình đọc màn hình nói sai với người dùng.
3. Thân trang **nhường chỗ** đúng `--ds-dock-w` (`body.ds-dock-on`), nên dock không đè
   lên chữ. Cột co lại và chữ gói lại dòng — đó là giá phải trả, và nó rẻ hơn việc che
   mất đoạn văn đang được ghi chú. Dưới 1200px thì hết chỗ nhường: dock nằm đè.

Hệ quả cần biết: sổ học **không** nằm trong `LAYER_IDS`, nên Esc chỉ đóng nó khi không
còn popup nào mở, bấm ra ngoài không đóng nó (bấm để chọn một câu mà mất cái sổ đang viết
là đúng cái bẫy dock tồn tại để tránh), và mở popup toán không làm mất cái sổ.

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

Chi tiết và bảy con số ở `CLAUDE.md` §10; cách nới cột cho đúng ở **§0.2** trên. Ba điều
cần nhớ khi thêm một khối:

1. **Đừng đặt `max-width` cứng.** Cột nội dung *đã* đúng bằng khổ chữ. Cổng `G-MEASURE` bắt.
2. **Bảng là khối duy nhất được tràn ra hai bên** (`--ds-bleed`). Code, card, alert, hộp
   kết bài đều dừng ở cùng mép với chữ.
3. **Muốn nới trang thì sửa `--ds-measure` + `--ds-fs`, và chỉ sửa hai cái đó** (§0.2 nói
   vì sao phải cả hai). Mọi thứ khác suy ra bằng `calc()`. Đơn vị `ch` bị cấm ở đây — nó
   co theo `font-size` nên `h2` và `<p>` cùng `74ch` ra hai mép lệch nhau 200px.

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
