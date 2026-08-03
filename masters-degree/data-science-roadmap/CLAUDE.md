# CLAUDE.md — trang dạy Data Science

Đọc file này **trước khi sửa bất cứ thứ gì** trong thư mục này, kể cả khi việc được nhờ
chỉ là "sửa một câu" hay "thêm một bài".

Trang có một mục tiêu duy nhất, và mọi quy tắc dưới đây suy ra từ nó:

> **Đưa một người từ số 0 về Data Science (nhưng đọc được Python cơ bản) tới chỗ tự làm
> ra một product AI thật và viết được luận văn thạc sĩ về nó.**

"Từ 0 tới master" là lời hứa về **quỹ đạo**, không phải về một trang web. Trang cho lộ
trình, giải thích, và tiêu chí đạt; năng lực thật đến từ việc người học làm ra artifact.
Chỗ nào trang chỉ tạo nhận biết chứ không tạo năng lực thì **phải nói thẳng** (đó là việc
của nhãn phạm vi `SCOPE`). Hứa quá là lỗi nội dung nghiêm trọng, không phải marketing.

---

## 0. Đừng mở file HTML để tìm hiểu

`data-science-roadmap.html` là **12k dòng, 0,87 MB**. Đọc cả file tốn ~250k token và gần
như luôn là việc vô ích.

Thứ tự đọc đúng:

```bash
# 1. bản đồ toàn trang — 84 bài, mỗi bài một dòng, kèm số dòng trong HTML
cat TOC.md

# 2. mở đúng một bài (in kèm số dòng, mục tiêu, tiêu chí đạt)
node tools/gate.mjs --show f-cyclic

# 3. chỉ cần dải dòng để Read/sed đúng đoạn
node tools/gate.mjs --where f-cyclic
```

`TOC.md` tồn tại **chính vì lý do này**: để một AI quyết định được "bài này có liên quan
không, có cần mở không, mở thì từ dòng nào" mà không nạp cả file vào ngữ cảnh.

---

## 1. Mô hình tư duy, một đoạn

Một file HTML tự chứa, không build, không server. Nội dung **84 bài** nằm trong các khối
`<template data-node="id">`; một router theo hash dựng chúng ra. `TREE` (mảng ở đầu
`<script>`) là **mục lục nguồn**: id, tiêu đề, và ba loại thời lượng `r` (đọc) / `x`
(thực hành) / `d` (deliverable). Mọi con số giờ trên trang — trang chủ, cây bên trái,
lịch 8 tuần, fast track 14 ngày — đều tính từ đúng ba trường đó, nên không thể lệch nhau.
`PAYOFF[id]` khai `[bạn có gì, nó dẫn đi đâu]` và được dùng **hai lần**: làm dải mục tiêu
ở đầu bài, và hộp kết bài. `ACCEPT[id]` là tiêu chí đạt — ranh giới giữa "đã đọc" và
"làm được". `auditPlan()` chạy mỗi lần tải trang và kiểm tính nhất quán của lịch.

---

## 2. Nguồn sự thật và hướng phụ thuộc

Một chiều, không vòng:

```
data-science-roadmap.html      ← NGUỒN SỰ THẬT DUY NHẤT
  │  phụ thuộc: ../../web-builder/web-builder.css (token + component wb-*)
  │  KHÔNG phụ thuộc bất cứ thứ gì khác trong thư mục này
  ↓ đọc
tools/gate.mjs  ──sinh──→  TOC.md        (SẢN PHẨM — không sửa tay, không phải nguồn)
  ↑ đọc
tools/concepts.json   khái niệm nào dạy ở bài nào  (đầu vào cổng G-FWD)
tools/waivers.json    lỗi thật đang hoãn có chủ ý

CLAUDE.md             → quy tắc bắt buộc + đường vào; không code nào đọc nó
docs/content-gates.md → rubric cho các cổng cần phán đoán ("giải thích này có hiểu được")
docs/authoring.md     → công thức: thêm bài / nhánh phụ / hình, wire vào đâu
HANDOFF.md            → sổ nhật ký phiên làm việc
```

Mỗi file **một lý do để đổi** — đó là cách giữ cho bộ tài liệu không phình ra:

| file | đổi khi nào |
|---|---|
| `CLAUDE.md` | quy trình / luật đổi |
| `docs/content-gates.md` | tiêu chuẩn *chất lượng nội dung* đổi |
| `docs/authoring.md` | *cấu trúc kỹ thuật* của trang đổi (thêm khối dữ liệu, thêm class) |
| `TOC.md` | tự động, mỗi lần nội dung đổi |
| `tools/*` | thêm/sửa cổng |
| `HANDOFF.md` | mỗi phiên |

Thấy mình định thêm mục vào `CLAUDE.md` thì hỏi trước: nó có thuộc một trong ba file
kia không? `CLAUDE.md` phải đủ ngắn để thật sự được đọc.

Ba luật không được vi phạm:

1. **HTML không bao giờ phụ thuộc vào `tools/` hay `docs/`.** Xoá cả hai thư mục đó thì
   trang vẫn chạy y nguyên. Cổng là thứ *soi* trang, không phải thứ trang cần để sống.
2. **`TOC.md` không bao giờ là nguồn.** Thấy TOC.md khác HTML thì HTML đúng, TOC.md sai.
3. **Không thêm file thứ hai chứa nội dung bài học.** Nội dung ở một chỗ. Muốn tra cứu
   nhanh thì sinh ra bản index (như TOC.md), đừng sinh ra bản sao nội dung.

---

## 3. Chạy cổng

```bash
node tools/gate.mjs             # cổng chặn; thoát 1 nếu có lỗi
node tools/gate.mjs --advice    # kèm khuyến nghị (không chặn)
node tools/gate.mjs --write     # sinh lại TOC.md
tools/install-hooks.sh          # cài CẢ HAI hook (một lần mỗi máy / mỗi bản clone)
```

`install-hooks.sh` phải tồn tại vì **cả `.git/hooks/` lẫn `.claude/` đều không được git
theo dõi** (`.claude/` nằm trong `.gitignore`), nên hook không tự theo repo về máy mới.
Nguồn sự thật là `tools/hooks/pre-commit` và `tools/hooks/claude-settings.json` — hai file
được theo dõi; script chỉ nối chúng vào chỗ git và Claude Code thật sự đọc. Chạy lại nhiều
lần không sinh hook trùng.

**Hai lớp tự động, cố ý khác nhau:**

| khi nào | ai chạy | làm gì |
|---|---|---|
| **ngay sau mỗi lần Edit/Write** vào file HTML | Claude Code hook `PostToolUse` (`.claude/settings.json` → `tools/hooks/post-edit.sh`) | chạy cổng; trượt thì **đưa lỗi lại cho agent ngay trong lượt đó**; qua thì tự làm mới số dòng trong `TOC.md` |
| **khi commit** | git `pre-commit` (`tools/hooks/pre-commit`) | chạy cổng; chặn commit; chặn cả việc sửa HTML mà quên `git add TOC.md` |

Lớp thứ nhất mới là lớp quan trọng: một agent sửa 20 lần rồi mới commit một lần, nên bắt
lỗi ở commit nghĩa là nó phải lần lại 20 bước để tìm chỗ hỏng. Bắt ngay lúc sửa thì nó
tự sửa trong cùng một lượt, khi còn nhớ mình vừa làm gì.

Ngoài ra: mở trang trong trình duyệt và gõ `auditPlan()` ở Console — nó kiểm những thứ
cần DOM thật (id trùng, tổng giờ giữa các view). Phải trả về `[]`.

---

## 4. Cổng tự động — máy đã canh, đừng canh lại bằng tay

**Chặn commit:**

| cổng | canh điều gì |
|---|---|
| `G-TOC-STRUCT` | **cấu trúc** mục lục khớp HTML (bài, tên, chặng, ưu tiên, thời lượng, tuần) |
| `G-ORDER` | thứ tự khối `<template>` trong file == thứ tự `TREE` |
| `G-NODE` | mỗi bài đúng một template, không thừa không trùng |
| `G-REF` | mọi `data-aside` / `data-math` / `data-goto` / `#/id` giải được |
| `G-ORPHAN` | không có nhánh phụ nào không bài nào mở |
| `G-PAYOFF` | mọi bài có `PAYOFF` (thiếu = đầu bài không có dòng mục tiêu) |
| `G-NO-DETAILS` | không dùng `<details>` cho kiến thức |
| `G-FWD` | tiêu chí đạt / deliverable tuần không đòi thứ chưa được dạy |

**Khuyến nghị (người quyết định):** `G-LAYER` (mục tự khai là nhánh phụ, bài quá dài),
`G-VIZ` (bài chưa có gì để nhìn), `G-MEASURE` (khổ chữ trôi), `G-FWD` ở mức thân bài.

**Thoát cửa** khi cổng bắt sai một chỗ cố ý: `<!-- gate:main -->` (tiêu đề trông giống
nhánh phụ nhưng là mạch chính) · `<!-- gate:long: lý do -->` (bài dài đã soát và dài là
đúng) · `allowEarly` trong `concepts.json` (nhắc tên để định vị). Cả ba **bắt buộc kèm lý
do nói vì sao cổng bắt sai**, không phải "đã xem rồi". Lỗi CHẶN thật mà chưa sửa thì vào
`waivers.json` — nó in lại mỗi lần chạy, và đó là điểm khác biệt. Bảng đầy đủ:
[docs/authoring.md](docs/authoring.md#việc-5--thêm-một-cổng-mới-vào-gatemjs).

Khuyến nghị phải **gần bằng 0 ở trạng thái ổn định**. Danh sách dài ra là dấu hiệu hoặc
nội dung đang trôi, hoặc cổng bắt sai — sửa một trong hai, đừng để nó thành tiếng ồn.

---

## 5. Cổng cần phán đoán — bạn phải tự soi

Máy không kiểm được "giải thích này có làm người ta hiểu không". Rubric đầy đủ, kèm cách
soi từng cổng: **[docs/content-gates.md](docs/content-gates.md)**. Tám cổng, tóm lại:

1. **Đúng** — mọi tuyên bố kiểm chứng được; không câu tuyệt đối; hạn mức của nhà cung cấp
   phải ghi ngày kiểm.
2. **Trình tự ADEPT** — ví von → hình → ví dụ có số → lời thường → công thức. Định nghĩa
   hình thức đứng cuối, không đứng đầu.
3. **Gỡ hiểu nhầm trước khi xây** — nêu điều sai người ta hay tin, nói tại sao nó nghe có
   lý, rồi mới đưa cái đúng.
4. **Ví von phải có ranh giới** — bắt buộc nói nó hỏng ở đâu.
5. **Một ý mới mỗi lúc** — không hai khái niệm lạ trong một câu; ngoại lệ đi sau.
6. **Mỗi bài có kết quả kiểm được** — không phải "đã đọc" mà "làm ra được cái này".
7. **Mạch chính sạch** — xem §7.

---

## 6. Kỷ luật mục lục

`TREE` là mục lục nguồn, và nó là thứ **AI nhìn vào để ra quyết định mà không đọc chi
tiết**. Vì thế nó phải luôn đúng, và luôn khớp `TOC.md`.

**Khi nào phải soi lại cả mục lục:** chỉ khi bạn **thêm / xoá / dời / đổi vai một bài**.
Sửa một câu trong bài, sửa CSS, sửa một con số — **không** phải soi lại mục lục. Cổng
`G-TOC-STRUCT` tự phân biệt hộ: nó so **chữ ký cấu trúc**, không so số dòng, nên nó chỉ
nổ khi thay đổi thật sự chạm tới mục lục. Số dòng cũ chỉ là một nhắc nhở
(`G-TOC-STALE`) và được hook sau-khi-sửa tự làm mới.

**Thêm một bài — bốn câu phải trả lời trước khi gõ:**

1. Nó thuộc chặng nào, và **vì sao chặng đó** chứ không phải chặng liền trước/sau?
2. Đặt ở vị trí nào trong chặng, để thứ tự vẫn là **bao quát → chi tiết, dễ → khó**?
3. Nó có làm bài nào phía trước **trở thành dư** không? Nếu có, gộp hoặc hạ bài kia
   xuống `skim` — đừng để hai bài dạy cùng một thứ.
4. Nó có dùng khái niệm nào **chưa được dạy** ở vị trí đó không? (xem §8)

**Xoá một bài:** nói rõ **mất gì**. Bài nào trỏ tới nó (`PAYOFF` "bài sau…", `WEEKS`,
`DAYS`, `COMPS`, `PORTFOLIO`) đều phải sửa theo — `G-REF` bắt liên kết hỏng, nhưng không
bắt được một câu "bài sau nói về X" giờ trỏ sai bài.

**Xong thì:** `node tools/gate.mjs --write` và commit `TOC.md` kèm HTML.

---

## 7. Mạch chính và mạch phụ

Trang có đúng **ba tầng trình bày**, và việc phân loại là bắt buộc — không có "để tạm ở
đây rồi tính sau".

| tầng | ở đâu | dùng cho |
|---|---|---|
| **mạch chính** | thân bài | con đường ngắn nhất từ chưa biết tới làm được: giải thích lõi, code phải gõ, một ví dụ chạy hết, tự kiểm |
| **popup** `data-mathdef` | modal giữa màn hình | **mặc định cho mọi nhánh phụ**: công thức, đào sâu, catalogue, danh mục lỗi, ba cách khác, paper |
| **ngăn phải** `data-aside` | drawer bên phải | **chỉ khi cần đọc SONG SONG với mạch chính** |

**Popup là mặc định, drawer là ngoại lệ.** Lý do rất cụ thể: trang dài, drawer cao thì
người đọc phải ngước cổ lên xuống, và mắt phải rời chỗ đang đọc. Drawer chỉ thắng khi
người đọc **cần thấy mạch chính phía sau trong lúc đọc nhánh phụ** — điển hình là một
bảng so sánh công cụ mà họ đang phải chọn ngay lúc đó (`cmp-*`).

**Cấm:** `<details>` / gập tại chỗ cho kiến thức. Nó đẩy nội dung nhảy xuống và người đọc
mất chỗ. Cổng `G-NO-DETAILS` chặn cứng.

**Dấu hiệu một khối đang ở sai tầng** — nếu khối đó:

- so sánh ≥2 sản phẩm cụ thể (LightGBM vs XGBoost, chọn bộ dữ liệu nào) → nhánh phụ
- là danh mục lỗi / thông báo lỗi → popup
- là "ba cách, chỉ dùng cách 1" → mạch chính giữ cách dùng thật, hai cách kia vào popup
- **tự khai là không cần thiết** ("chưa cần", "có thể bỏ qua", "đọc thêm") → nhánh phụ
- là paper / lịch sử / tên để biết → popup

`G-LAYER` bắt các tiêu đề mục tự tố giác kiểu đó. Nếu một mục **thật sự** thuộc mạch
chính dù trông giống nhánh phụ (ví dụ ba cách đặt ngưỡng mà cả bài dựa vào để quyết
định), viết `<!-- gate:main -->` ngay trước tiêu đề — và viết luôn lý do.

Ngược lại cũng là lỗi: **rút quá nhiều vào popup thì mạch chính rỗng**. Một bài mà nội
dung thật nằm hết trong 6 cái chip thì không còn là bài học, là mục lục. Ngoại lệ hợp lệ
duy nhất là các bài tra cứu (`s-lookup`, `t-stack`) — chúng *là* index, có chủ ý.

---

## 8. Thứ tự và phụ thuộc

Trình tự bắt buộc: **bao quát → chi tiết · dễ → khó · nhỏ → to · cụ thể → trừu tượng.**

Luật cứng: **không dùng khái niệm trước khi dạy nó.** Ba mức nghiêm khắc khác nhau:

- **Trong `ACCEPT` hoặc deliverable tuần** → lỗi CHẶN. Không thể bắt người học *làm* một
  việc dựa trên thứ chưa được dạy.
- **Trong thân bài** → khuyến nghị. Chấp nhận được nếu bài **tự định nghĩa một câu tại
  chỗ** rồi trỏ tới bài dạy đầy đủ.
- **Chỉ nêu tên để định vị** ("sẽ học ở chặng 5") → được, khai vào `allowEarly`.

Khái niệm cần canh khai ở `tools/concepts.json`. Chỉ đưa vào những khái niệm mà **dùng
sớm là sai thật** — danh sách toàn thứ vô hại thì cổng thành tiếng ồn.

`auditPlan()` **không** bắt được loại lỗi này: nó chỉ kiểm phụ thuộc đã khai
(`WEEKS.needs`), còn phụ thuộc thật nằm trong chữ. Đó là lý do `G-FWD` tồn tại.

---

## 9. Đầu mỗi bài phải trả lời được bốn câu

Trước khi người đọc bỏ ra 45 phút, họ phải biết mình đổi lấy cái gì. Bốn thông tin, tất
cả nằm **trên** nội dung:

| câu hỏi | do đâu render |
|---|---|
| bài **nói về** cái gì | `<h1>` + đoạn đầu của template |
| **kết quả**: xong bài có gì | dải `.ds-obj` — đọc từ `PAYOFF[id][0]` |
| **độ ưu tiên** | chip `Bắt buộc` / `Nên biết` / `Định vị là đủ` (`TREE.p`) |
| **độ cần thiết** | chip `14 ngày` + thời lượng + nhãn phạm vi (`SCOPE`) |

Ba trong bốn cái tự sinh. Nghĩa là: **viết `PAYOFF` cho tử tế thì đầu bài tự đúng**, và
`PAYOFF[id][0]` phải là một **kết quả cầm được**, không phải một chủ đề. "Hiểu về
feature engineering" là sai; "Mã hoá sin/cos, gõ được ở cả bốn mức từ notebook tới
Pipeline" là đúng.

Cùng một câu xuất hiện lại ở cuối bài (hộp kết bài) là **chủ ý**: đầu bài là lời hứa,
cuối bài là biên nhận.

---

## 10. Hình và khổ chữ

**Visualize thứ nào visualize được.** Không ép: có khái niệm không có hình nào tốt hơn
một ví dụ có số, và một hình trang trí thì tệ hơn không có hình (nó cạnh tranh bộ nhớ
làm việc với ý chính). `G-VIZ` chỉ **liệt kê** bài chưa có gì để nhìn, không chặn.

Hình phải: (a) chỉ rõ cái gì ánh xạ sang cái gì, (b) có `.ds-viz__alt` mô tả bằng chữ —
mọi thông tin trong SVG phải đọc được ở đó, (c) kéo được thì tốt hơn tĩnh.

**Khổ chữ: cả trang chỉ được có HAI mép phải.**

- `--ds-measure` (720px) — mọi dòng chữ chảy
- hết cột (900px) — bảng, code, hình, card, pager

Đừng đặt `max-width` cứng ở đâu nữa; `G-MEASURE` bắt. Và **đừng nới `--ds-measure` to
thêm**: đo thật thì 720px đã là ~105 ký tự một dòng, dài hơn khoảng dễ đọc (45–75). Nếu
sửa thì sửa theo hướng nhỏ đi. Đơn vị `ch` bị cấm ở đây — nó co theo `font-size`, nên
`h2` và `<p>` cùng `74ch` lại ra hai mép lệch nhau 200px.

---

## 11. Thuật ngữ và từ viết tắt

- Thuật ngữ **bắt buộc phải dùng**: định nghĩa **ngay lần xuất hiện đầu tiên, kèm một ví
  dụ**, rồi dùng nhất quán. Khái niệm quan trọng đến mức không thể không biết thì dạy ở
  bài sớm nhất (`s-intro` giữ bộ từ vựng tối thiểu), đừng rải rác.
- Thuật ngữ **không bắt buộc**: bỏ. Nhưng nếu người học sẽ gặp lại nó ở nơi khác, nêu tên
  chính thức **một lần** để họ tra được — đừng bắt họ học tên trước khi hiểu ý.
- **Không đổi cách gọi giữa chừng.** Cùng khái niệm, cùng một từ, từ đầu tới cuối.
- Viết tắt và khái niệm khó: giải thích tại chỗ, hoặc `title=` để hover, hoặc chip popup
  `data-math`. Đừng để người đọc phải rời bài đi tra.
- `r-glossary` là bảng tra, **không** phải chỗ thay cho việc định nghĩa tại chỗ.

---

## 12. Xong việc thì làm đủ ba bước

```bash
node tools/gate.mjs --advice     # 1. cổng chặn qua; đọc khuyến nghị mới sinh ra
                                 # 2. mở trang, gõ auditPlan() → phải là []
node tools/gate.mjs --write      # 3. nếu mục lục đổi: sinh lại + git add TOC.md
```

Và ghi vào `HANDOFF.md`: đã sửa gì, **cố ý không sửa gì và vì sao**. Mục thứ hai quan
trọng hơn mục thứ nhất — nó là thứ giữ cho phiên sau không làm lại việc đã cân nhắc và
bỏ qua.

**Cẩn thận:** file HTML này thỉnh thoảng có nhiều phiên làm việc song song. Trước khi
sửa, `git log --oneline -3` và `git status`; nếu file đã đổi so với lúc bạn đọc, đọc lại
vùng sắp sửa trước khi Edit.
