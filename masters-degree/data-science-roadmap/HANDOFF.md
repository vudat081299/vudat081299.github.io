## ĐANG LÀM

**Chữ navbar "Data Science" → "DS" — TẠM THỜI, chủ trang sẽ tự revert ~2026-08-25.**
Đổi 2026-08-18 theo yêu cầu trực tiếp của chủ trang ("tạm thời thôi, 1 tuần sau tôi sẽ
revert lại"). Đã sửa ở **hai chỗ**, cả hai đều commit:
- `data-science-roadmap.html` dòng ~1545 (`<a class="wb-navbar__brand ds-brand" href="#/home">`)
- `tools/build-roadmap.mjs` dòng ~319 (template sinh `roadmap.html`) — **rồi chạy lại**
  `node tools/build-roadmap.mjs` để `roadmap.html` khớp; đừng sửa tay file sinh đó.

Việc revert: đổi `DS` lại thành `Data Science` ở cả hai chỗ trên, chạy lại
`node tools/build-roadmap.mjs`, commit. Agent phiên sau: **đừng tự ý revert trước khi chủ
trang xác nhận** — mốc ~1 tuần chỉ là ước lượng của chủ trang, không phải deadline cứng.

---

# Handoff — data-science-roadmap.html

File là single-page app (~16,7k dòng) dựng trên web-builder CSS. Nội dung bài nằm trong các
`<template data-node="…">`, router hash dựng ra. **Không còn tự chứa hoàn toàn:** câu hỏi trắc
nghiệm ở `data/quiz.json`, trang fetch lúc chạy (xem phiên (t) bên dưới).

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

## Phiên 2026-08-20 (aa) — ba món "nợ nhỏ đã ĐO" về 0 · hai cổng mới cho quiz · và một món trong đó đo bằng THƯỚC SAI

Chủ trang: *"còn gì làm nốt đi… rà soát toàn bộ handoff xem còn gì không làm nốt đi"*, kèm
trần **dưới 5 subagent** và *"cung cấp vừa đủ context, không được thừa"*. Đã rà cả file, kể
cả mục `Còn nợ của riêng phiên này` của **mọi** phiên (lần trước tôi tin bản rà của (n8) chứ
không tự soi). Kết quả: các phiên ≤ (n8) đã đóng thật; ngoài mục `## CHƯA LÀM` chỉ còn **một**
món đo được chưa ai đóng — "19 câu lệch ≥2×" của phiên (w).

### 1. Món nợ được đo bằng THƯỚC SAI — phần đáng đọc nhất của mục này

Mục `Nợ nhỏ đã ĐO` ghi *"124 câu quiz có thế hoà"*. Con số đó **sai**, và sai theo một kiểu
đã cắn dự án này năm lần: nó đếm độ dài **kể cả thẻ HTML**, còn `G-QUIZ-GUESS` — đúng cái
cổng mà thế hoà làm nhiễu — đếm **sau khi bỏ thẻ**. Hai thước cho hai danh sách khác nhau:

```
đếm cả thẻ   124 câu
bỏ thẻ        77 câu      trùng nhau chỉ 66
```

Tức **58 câu trong danh sách cũ không ảnh hưởng gì tới cổng**, còn **11 câu có ảnh hưởng thì
chưa từng nằm trong danh sách**. Tôi đã phóng 4 agent theo danh sách sai rồi mới phát hiện,
và phải nhắn lại giữa lượt cho cả bốn (kèm lệnh xoá những file thuộc câu không hỏng — sửa một
câu không hỏng là thêm rủi ro không đổi lấy gì).

**Luật rút ra, tổng quát hơn chuyện quiz:** một món nợ phải được đo bằng **đúng thước của cái
cổng nó làm hỏng**, không phải bằng thước dễ viết nhất. Và con số trong `HANDOFF.md` cũng cần
được đo lại chứ không được tin — nó là số của phiên viết ra nó, không phải chân lý.

### 2. Ba món của `Nợ nhỏ đã ĐO` — cả ba đóng, nhưng món thứ ba đóng KHÁC cách nó được viết

| món | trước | sau |
|---|---|---|
| thế hoà (chênh đáp án <3 ký tự, bỏ thẻ) | 77 | **0** |
| lệch ≥1,5× (bỏ thẻ) — nợ mở từ phiên (w) | 5 | **0** |
| `s-plan14` thiếu `day` trong `DATA` | 14 số NÓI RA | **dựng lại được tại chỗ** |
| escape `quiz.json` lẫn `&gt;` với `&amp;gt;` | — | **triệu chứng KHÔNG tồn tại** — xem dưới |

Phân phối hạng sau lượt sửa: **24,3 · 25,2 · 24,7 · 25,8%**, chiến lược đoán theo độ dài tốt
nhất **25,8%** (ngẫu nhiên 25%). Và "19 câu lệch ≥2×" của phiên (w) đo lại ra **0** — đóng.

`s-plan14`: `P.dayOf` đã có sẵn trong `read-html.mjs`, chỉ thiếu một dòng đưa vào `DATA` và
ghép vào chip fast track (`Fast track 14 ngày · ngày N`). Kiểm bằng cách cộng `mins` theo
`day` từ `DATA` trong `roadmap.html` đã sinh: ra **đúng 14 con số** của ví dụ (N1 5h50 …
N14 5h45) và **đúng tổng 4.520 phút = 75,3 giờ**.

**Món escape: triệu chứng như mô tả không có thật, và tôi cố ý KHÔNG chuẩn hoá.** Đo `quiz.json`:
`&amp;gt;` xuất hiện **0 lần** — cặp `&gt;` / `&amp;gt;` mà (x) ghi lại không tồn tại. Bất nhất
thật là **trần vs escape** (15 dấu `>` trần, 13 dấu `<` trần, 56 dấu `&` trần cạnh 20 `&gt;`,
9 `&lt;`), nhưng **cả hai dạng render y hệt nhau**, và số chỗ **thật sự hỏng là 0**. Nên chuẩn
hoá cả file là sửa ~84 chỗ để đổi lấy **không gì người đọc thấy**, mà mỗi chỗ chạm là một cơ
hội phá thứ đang đúng. Thay vào đó bịt lớp lỗi thật bằng một cổng — mục 3.

### 3. Hai cổng mới

- **`G-QUIZ-ESC` (CHẶN)** — cả ba trường chữ của một câu vào trang bằng `innerHTML`, nên một
  dấu `<` trần **đứng ngay trước chữ cái** làm trình duyệt mở một thẻ không tồn tại và **ăn
  sạch chữ tới dấu `>` kế tiếp**: không lỗi, không cảnh báo, chỉ mất chữ. Ba hình dạng bị
  chặn: `<` trần trước chữ cái · `&` trần thành entity khác · thẻ hở/đóng lệch. Cổng **không**
  đòi "luôn viết `&lt;`/`&gt;`/`&amp;`" — bắt rộng thế thì nó nổ vào mọi câu tương lai viết
  `recall > 0,8`, tức thành tiếng ồn.
- **`G-QUIZ-TIE` (nhắc)** — thế hoà, đo **sau khi bỏ thẻ**, cùng thước `G-QUIZ-GUESS` dùng.

Cổng `G-QUIZ-TIE` **trượt ca "im" cho tới khi nợ về 0** — đúng như thiết kế, nên nó buộc phải
commit SAU lượt sửa. Đó là một tính chất tốt, không phải trở ngại: một cổng nhắc mà xanh ngay
lúc thêm vào thì không chứng minh được nó đang canh gì.

### 4. Lần thứ NĂM luật của tôi khớp KÝ TỰ thay vì khớp Ý

Bản kiểm của tôi có luật *"distractor nào sửa thì phải nhích ≥3 ký tự"* — một **proxy** cho
"đã thêm hoặc bỏ một lý lẽ". Nó từ chối oan 2 câu mà lựa chọn là **thuật ngữ trần**:
`Optuna` → `LightGBM` chỉ nhích 2 ký tự nhưng đổi hẳn lý lẽ sai (importance toàn tập vs đóng
góp từng dòng), `RMSE` → `R²` giữ đúng vai "metric hồi quy" mà **ngắn đi** 2. Một tên công cụ
6 ký tự không có mệnh đề nào để mang lý lẽ. Sửa: miễn luật khi lựa chọn gốc ≤20 ký tự và
không có dấu câu. Cùng hình dạng với bốn ca của phiên (z) — **đây là lớp lỗi hay tái phát nhất
của tôi trên dự án này.**

Một ca bó khác đáng biết: `t-numpy#6` có đáp án `np.expm1(y)` **11 ký tự, hạng 3**, nên
distractor đang hoà (`np.exp(y)`, 9) **buộc phải xuống ≤8** — nới lên là đổi hạng. Đã rút
thành `np.exp`. Với một lựa chọn là mẩu code 9 ký tự thì không có lý lẽ nào để bỏ; muốn giữ
luật tuyệt đối thì phải đổi cả đáp án, và đó là việc khác.

### 5. Một rủi ro do agent tạo ra — thư mục làm việc DÙNG CHUNG

Một lô chạy `rm -rf fix/` trên **cả thư mục dùng chung** khi đổi thước đo, không chỉ trên phần
của nó. Một lô khác báo 15 file của mình *"biến mất giữa lượt"* rồi tự ghi lại. Cuối cùng
không mất gì (đếm ra đúng **82 = 77 + 5**), nhưng chỉ vì hai lô tình cờ ghi lại sau. **Bài
học: brief cho agent phải nói thẳng "chỉ xoá file MÌNH ghi, không bao giờ xoá cả thư mục"** —
đây là lần thứ hai một agent đụng vào file dùng chung của phiên khác (lần đầu: phiên (x), ghi
đè `scratchpad/extract.mjs`). Và **đếm, đừng tin báo cáo**: tôi đối chiếu từng câu trong bốn
lô với file trên đĩa trước khi nạp.

### 6. Cố ý KHÔNG làm

- **Không chuẩn hoá escape trong `quiz.json`** — lý do đầy đủ ở mục 2. Đã đưa vào bảng
  `Đã quyết là GIỮ NGUYÊN` để đừng ai mở lại.
- **Không revert chữ navbar `DS` → `Data Science`.** Mục `## ĐANG LÀM` nói rõ đây là việc chờ
  **chủ trang xác nhận**, mốc ~2026-08-25 chỉ là ước lượng. Không tự làm.
- **Không làm 8 hình P1** — điều kiện của chính nó vẫn chưa đạt: chưa ai ĐO comprehension của
  8 hình P0, và việc đo đó cần người đọc thật.
- **Không làm nhãn Foundation / Applied / Advanced** — backlog tự nói "cần thì chủ trang gọi
  tên nó ra".
- **Không đổi đáp án của `t-numpy#6`** (mục 4) — đó là sửa nội dung một câu, ngoài phạm vi một
  lượt dọn độ dài.

### 7. Còn nợ của riêng phiên này

- Không có. Cả 4 lô đã nạp, `gate.mjs` CHẶN qua, `gate.test.mjs` **74 đạt / 0 trượt**,
  `G-QUIZ-TIE` và `G-QUIZ-ESC` đều im.

---

## Phiên 2026-08-17 (z) — roadmap đứng một mình (bốn gạch cuối) · nợ dư quiz về 0

Chủ trang: *"còn gì chưa xong thì làm nốt luôn đi"*. Backlog `## CHƯA LÀM` còn 5 mục; hai
mục làm được đã làm xong, ba mục còn lại **không** làm và lý do ở cuối.

### 1. Hợp đồng "Roadmap độc lập" — xong cả bốn gạch cuối

Mục `## CHƯA LÀM` đã **xoá** (hợp đồng 7/7 gạch). Trước phiên này `roadmap.html` chỉ có 2/4
vật mỗi bước, nên cách gọi trung thực của nó là *visual syllabus*; giờ nó là một khoá học
ngắn thật.

| gạch | làm gì |
|---|---|
| bốn vật mỗi bước core | thêm `example` + `check` cho **cả 65 bước** vào `roadmap-summaries.json` |
| code chạy được / ví dụ số | `kind:"code"` cho bài code, `kind:"num"` cho bài khái niệm |
| capstone | 8 bước sau mạch chính, mỗi bước một tiêu chí đạt kiểm được |
| hết phụ thuộc trang DS | bỏ link "Mở bài đầy đủ →", 2 href navbar, và tiến độ đọc ké |

**Số đo đáng tin tới đâu:** 46/65 snippet là pandas/numpy thuần và agent chạy thật. Tôi
**tự chạy lại 8 cái** (`d-leak d-split dl-attn f-cyclic ml-cv pr-eval t-numpy th-stats`) và
output khớp trường `out` **từng byte cả 8**. Bài cần sklearn/torch (không có trên máy) thì
`out` chỉ chứa số học kiểm được hoặc số đã có trong bài — agent nào không kiểm được đều nói
ra thay vì bịa.

**Tiến độ dùng khoá MỚI `rm-progress-v1`, không dùng lại `ds-roadmap-progress-v3`.** Lý do
không phải thẩm mỹ: hai trang đếm bằng đơn vị khác nhau (bên kia ba mức đọc/thực hành/
deliverable, bên này xong-hoặc-chưa), ghi chung một khoá là trang này **ghi đè tiến độ học
thật** của chủ trang ở trang kia.

**Ngăn phải: 1/3 cửa sổ → 47%.** Đây là thứ chỉ thấy khi mở trang, và nó là ví dụ cho việc
"đo trước khi chọn số". Ở 1440px, mono 12,5px = 7,53px/ký tự, khung ngăn ăn 89px:

| bề rộng | ngăn | ký tự/dòng vừa | kết quả |
|---|---|---|---|
| 1/3 (cũ) | 479px | 52 | **mọi** snippet cuộn ngang, kể cả dòng 70 ký tự |
| 44% | 634px | 72 | dòng 73 ký tự vẫn cuộn |
| **47%** | 677px | **78** | 0/65 khối code cuộn ngang ✓ |

Đi kèm là trần **76 ký tự/dòng** trong `example.code`, áp bằng bộ kiểm. Trần này đến *giữa*
lượt nên 19 file phải ngắt dòng lại — và mọi agent đều **chạy lại snippet sau khi ngắt** rồi
so `out`, không ai chỉ đếm ký tự.

**Cổng mới `G-ROADMAP-4`** (nhắc) đếm bốn vật của từng bước core, kèm ca NỔ trong
`gate.test.mjs`. Hợp đồng này đã nằm trong HANDOFF **nhiều phiên mà không gì canh** — tức nó
chỉ sống trong đầu người đọc handoff, đúng thứ luật 1 của repo gốc cấm.

### 2. Nợ dư của quiz — cả hai mục về 0

| | phiên (x) | nay |
|---|---|---|
| câu đáp án lệch ≥1,5× | 51 | **0** |
| `why` không bác phương án sai nào | 49 | **0** |
| hạng độ dài đáp án | 24,8 / 25,2 / 24,7 / 25,4% | 26,4 / 26,5 / 22,5 / 24,7% |
| chiến lược đoán theo độ dài tốt nhất | 25,4% | **26,7%** (ngẫu nhiên 25%) |

(Hai con số 51/49 lệch với 43/52 ghi ở phiên (x) vì heuristic khác nhau — bản này lấy trung
bình ba lựa chọn kia, bản trước lấy lựa chọn dài nhất. Không ai sai, chỉ là hai thước.)

Cách chữa loại lệch: **nới distractor, KHÔNG rút đáp án.** Phần bị rút ở đáp án luôn là lý
lẽ, mà lý lẽ thuộc về `why`. Và mỗi distractor được nới phải mang **một lý lẽ sai riêng**,
không phải ba cách nói cùng một ý — nới bằng cách diễn đạt lại là gian lận với chính cổng.

### 3. Bốn dương tính giả do CHÍNH TÔI viết luật quá rộng — cùng một hình dạng

Đây là phần đáng đọc nhất của mục này, vì nó lặp lại đúng lỗi của lượt rà quiz phiên (x):
**luật khớp KÝ TỰ thay vì khớp Ý.**

| luật tôi viết | nó tố oan | thật ra đó là |
|---|---|---|
| `/còn lại\|tương tự/` = chỗ bỏ lửng | `s-plan14` | "còn lại 4.520 − 940" — một phép trừ |
| `/\.\.\.\|…/` = chỗ bỏ lửng | `pr-arch` | "500 … 3.000 ms" — một khoảng giá trị |
| như trên, bản "phải có số hai bên" | `th-stats` | `{lo:+.4f} … {hi:+.4f}` — phân cách trong f-string |
| `phương án (A\|B\|C\|D)\b` = gọi theo vị trí | 3 câu | "phương án còn lại", "Phương án dựa vào…" |

Ca thứ tư là **cùng một cái bẫy `\b` đã cắn ở phiên (x)**: trong JS, ranh giới từ nằm giữa
`d` và một chữ có dấu (`ò`, `ự`), nên `\b` sau `A-D` khớp cả chữ Việt. Bản đúng:
`phương án ([A-D])(?![\p{L}])` với cờ `u`. Bản cuối của luật bỏ lửng cũng chuyển từ "khớp
ký tự" sang "khớp vị trí": chỉ bắt dòng **chỉ có** dấu ba chấm, hoặc `# …`.

Rút ra, và nó áp cho mọi cổng tương lai: **luật mới phải chạy thử trên toàn bộ dữ liệu hiện
có trước khi tin nó** — cả bốn ca trên đều lộ ra ngay lần chạy đầu, không ca nào cần suy
luận. Bốn lần trong một phiên là đủ để coi đây là mặc định, không phải may.

### 4. Cố ý KHÔNG làm

- **Tám hình P1** — điều kiện của chính nó chưa đạt: audit n9 nói *"làm 8 hình P0 trước, ĐO
  comprehension/usability, chỉ sau đó mới làm P1"*. Đo comprehension cần người đọc thật;
  agent không đo được, và bỏ qua bước đo là bỏ luôn lý do xếp thứ tự. Vẫn ở `## CHƯA LÀM`.
- **Nhãn Foundation / Applied / Advanced** — mục `## CHƯA LÀM` **tự nói** *"cần thì chủ trang
  gọi tên nó ra, 'làm hết backlog' không tính"*. Lượt này chính là "làm hết backlog", nên
  không tính. Không làm.
- **Không bỏ 7 chỗ nhắc `data-science-roadmap.html` còn lại trong `roadmap.html`** — cả 7 đều
  nằm trong **comment**, ghi nguồn build (navbar/CSS/JS được TRÍCH từ trang chính lúc build).
  Hợp đồng nói *"reader-facing phải tự chứa"*, và nó nói thẳng rằng lấy trang DS làm nguồn
  build là **chi tiết triển khai, không phải quan hệ lộ ra cho người đọc**. Xoá comment là
  xoá đúng thứ giữ cho phiên sau biết sửa ở đâu.
- **Không tự chuẩn hoá escape trong `data/quiz.json`** (`&gt;` vs `&amp;gt;` còn lẫn nhau) —
  vẫn theo luật cũ: sửa câu nào thì copy dạng của nguồn câu đó, đừng chuẩn hoá cả file.

### 5. Còn nợ của riêng phiên này

Hai món đo được trong phiên này (**124 câu quiz ở "thế hoà"** và **`s-plan14` thiếu `day`
trong `DATA`**) đã được đưa lên mục `## CHƯA LÀM` → *Nợ nhỏ đã ĐO, chưa làm*, cùng với món
escape `quiz.json` còn treo từ (x). Chi tiết ở đó, **không lặp lại ở đây**: một việc đang mở
mà được mô tả ở hai chỗ là cách nhanh nhất làm `HANDOFF.md` hết đáng tin, và `## CHƯA LÀM`
là chỗ `session.mjs` in ra mỗi lần mở phiên.

Ngoài ba món đó, phiên này không để lại việc dở nào: cổng CHẶN qua, `gate.test.mjs` 69/0,
`gate.mjs --advice` **0 khuyến nghị**, `G-ROADMAP-4` im (65/65 bước core đủ bốn vật).

---

## Phiên 2026-08-16 (y) — TOC bên trái lộ nội dung phía sau khi cuộn quá đầu (mobile)

> **Nhãn đổi từ (w) sang (y) lúc merge.** Hai phiên chạy song song cùng chọn chữ (w); phiên
> 2026-08-15 (w) nằm ngay dưới trong file này. Nội dung mục không bị sửa gì khác.

Chủ trang báo: ở TOC bên trái (`#sidenav`, cây lộ trình), cuộn quá giới hạn thì lộ nội dung
của layer nằm dưới nó.

### Lần đầu — SAI, nhưng vẫn đáng giữ như một fix riêng

Đoán đầu tiên: `--ds-vh`/`--ds-vw` lấy gốc từ `1vh`/`1vw` trần thay vì `1dvh`/`1dvw`, làm
drawer TOC trên mobile (<900px) lệch cửa sổ thật một nhịp lúc thanh địa chỉ ẩn/hiện. Đã sửa
(`calc(1dvh / var(--ds-zoom))`) + cập nhật `docs/design.md` §0.4. Chủ trang xác nhận: **không
khác gì** — sai chẩn đoán. Giữ lại thay đổi này vì bản thân nó vẫn là một cải thiện đúng, chỉ
là không phải nguyên nhân của bug đang báo.

### Cập nhật cùng ngày — chẩn đoán đúng, chủ trang gửi ảnh chụp lúc lỗi xảy ra

Chủ trang mô tả lại chính xác hơn — kéo mạnh (không phải cuộn thường) quá đầu cây TOC, trên
**Chrome/Mac**, thì lộ ra content của
layer sau nó (không cố định là gì, "bất kì cái gì" nằm ở vị trí đó lúc đó). Kèm ảnh chụp thật:
`#sidenav` render như một thẻ trắng nổi, bo góc, có đổ bóng, KHÔNG cao hết cửa sổ — nội dung
chính (một alert đỏ, một tiêu đề) hiện xuyên ra ở mép trên/phải/dưới của thẻ đó, như thể
`#sidenav` không còn chiếm chỗ thật trong hàng flex nữa.

**Chẩn đoán lần hai (đúng — có bằng chứng, không phải suy đoán tự dựng):** kit đặt CẢ
`position: sticky` LẪN `overflow-y: auto` trên CÙNG một phần tử (`.wb-shell__side`). Đây là tổ
hợp Chromium biết xử lý sai: phần tử vừa phải "dính" theo scroll của khung ngoài, vừa tự cuộn
nội dung của chính nó — sau một cú cuộn nhanh/mạnh, việc tính lại kích thước/vị trí của nó có
thể trật một nhịp, làm nó co về đúng bằng nội dung rồi nổi lên như một thẻ (khớp ảnh chụp: bo
góc + đổ bóng là dấu của `.wb-card`/box-shadow, không phải dấu của `.wb-shell__side` bình
thường — phần tử "thật" không có hai thứ đó). Vì nó không còn chiếm chỗ trong flex, nội dung
chính chảy tràn ngay bên dưới/quanh vị trí cũ của nó.

**Sửa:** tách hai vai ra hai phần tử. `#sidenav` (ngoài) chỉ còn lo sticky + kích thước +
`overflow: hidden` (clip cứng, không tự cuộn). `#sidenav > .ds-rail` (trong, con trực tiếp có
sẵn trong HTML, không cần thêm khối mới) nhận `overflow-y: auto` + `overscroll-behavior:
contain` + toàn bộ padding (dọn từ `#sidenav` sang, giữ đúng số cũ `14px 22px 56px 12px`).
Bốn selector thanh cuộn tuỳ biến (`::-webkit-scrollbar*`) đổi theo từ `.wb-shell__side` sang
`.ds-rail`, vì đó mới là phần tử thật sự cuộn.

**Mức tin cậy — nói thẳng:** đây là chẩn đoán tốt nhất dựa trên ảnh chụp thật + một anti-
pattern CSS/Chromium đã biết (sticky + overflow:auto cùng một phần tử), KHÔNG phải một repro
tôi tự tay bấm ra được. Trong phiên này tôi thử lại đúng cách chủ trang gợi ý (đổi nền tương
phản mạnh để lộ chỗ hở) và ban đầu tưởng bắt được — màn hình chụp còn lại toàn một màu — nhưng
đối chiếu bằng cách đọc thẳng nội dung DOM (không qua ảnh) thì nội dung vẫn còn nguyên, tức
đó là lỗi của chính công cụ chụp ảnh trong sandbox, không phải lỗi thật. Nên: đã kiểm không có
regression (layout/padding/khoảng cuộn giống hệt trước, cổng + test đều xanh), nhưng **CHƯA**
tự tay xác nhận thao tác "kéo mạnh quá đầu" trên Chrome/Mac hết lộ layer. Nếu chủ trang thử
lại mà vẫn còn, báo cụ thể: còn thấy thẻ nổi bo góc đó không, hay đổi dạng khác.

---

## Phiên 2026-08-15 (x) — rà đúng/sai độc lập · độ dài hết mang tín hiệu (92,3% → 25,4%)

Chủ trang: *"chạy tất cả"* — cả hai lượt còn nợ của phiên (w), rồi commit và push.

### Lượt B — rà đúng/sai ĐỘC LẬP, và nó trả lời câu (w) để ngỏ

Phiên (w) tìm 6 lỗi kiến thức trên 941 câu, nhưng bản giao việc lần đó mở đầu bằng con số
92,3% của lỗ độ dài, nên **không biết 6 là số thật hay là do agent bị mồi sang trục khác**.
Lượt này giao một bản brief **không nhắc một chữ nào về độ dài/hình thức**, bố cục lô trộn
khác hẳn (bài nào cũng do một agent khác đọc lại). Kết quả: **4 lỗi / 941 câu**.

Hai lượt độc lập cho cùng một bậc kết quả → **bộ câu sạch về kiến thức**, nghi ngờ của (w)
đã có câu trả lời. Nhưng 3/4 lỗi mới là loại `bai-sai`, tức **thân bài sai và câu hỏi khoá
theo cái sai đó**:

| câu | lỗi | kiểm bằng |
|---|---|---|
| `pr-monitor#5` | bài nói `np.histogram` báo `bins must increase monotonically` khi phân vị trùng. **Sai** — cạnh BẰNG nhau đi qua, chỉ cạnh GIẢM mới ném. Câu này **chấm ngược người trả lời đúng** | numpy 2.0.2 |
| `pr-serve#4` | `Library not loaded: libomp` là lối nói dyld/macOS, gán cho container `python:3.11-slim` (Debian → `libgomp.so.1: cannot open shared object file`) | đọc nguồn |
| `ml-shap#6` | `named_steps["prep"].transform(X_test)` không chạy được: pipeline thật là `derive → prep → model`, `prep` chọn cột theo TÊN mà `NUM_FEATURES` toàn cột do `derive` sinh. Bài tự mâu thuẫn với khối tương tác của chính nó (`pipe[:-1]`) | đọc nguồn |
| `d-data#8` | đề giả định mốc gốc lệch "một tháng" — một tháng là 28–31 ngày **tròn** nên `hour` không đổi chút nào | pandas |

**Rà quiz là một cách soi nội dung bài.** Câu hỏi buộc phát biểu lại kiến thức ở dạng nhị
phân, nên chỗ bài viết mơ hồ hay sai thì câu hỏi làm nó lộ ra. Ba lỗi trên đều tìm được
theo đường đó, không phải bằng cách đọc bài.

### Lượt A + C — và BA LẦN luật của tôi sai cùng một hình dạng

Đây là phần đáng đọc nhất của mục này. Lỗ "đoán bằng độ dài" bị bịt ba lần, hai lần đầu
thất bại vì **luật nói về MỘT CÂU thay vì về PHÂN PHỐI**:

| lượt | luật đã giao | kết quả | vì sao trượt |
|---|---|---|---|
| (w) | "nới distractor cho **ngang** đáp án" | 92,3% → **70,6%** | ngang → **thế hoà**, hoà vẫn ăn 50% |
| (x) A | "**ít nhất một** distractor dài hơn" | hạng 1 về 0%, nhưng "chọn cái dài **THỨ NHÌ**" ăn **82,3%** | agent cho đúng một cái → đáp án dồn vào hạng 2 |
| (x) C | "hạng độ dài của đáp án phải **rải đều 1–4**" | **25,4%** (ngẫu nhiên 25%) | ✓ |

```
hạng 1   hạng 2   hạng 3   hạng 4     chiến lược đoán tốt nhất
 0,0      82,3      8,6      9,1          82,3%   ← sau lượt A
24,8      25,2     24,7     25,4          25,4%   ← nay
```

**Bài học, viết ra vì nó tổng quát hơn chuyện quiz:** bịt một lối tắt bằng ràng buộc đúng
một điểm thì lối tắt dịch sang điểm kế bên. Ràng buộc phải nói về **hình dạng của cả phân
phối**, và bản áp phải **từ chối cả những bản sửa "có cải thiện"** nếu chúng không đúng
hình dạng đó — mục tiêu và ràng buộc là hai thứ khác nhau.

`G-QUIZ-GUESS` được sửa theo: bản đầu chỉ đếm hạng 1 nên **nó đã im lặng ở đúng lỗ 82,3%**.
Nay nó đo cả bốn hạng, kêu khi hạng nào vượt 40%, và `gate.test` có thêm ca NỔ "cả bộ đáp
án dài thứ nhì" — canh một hồi quy CÓ THẬT, không phải giả định.

### Số liệu đầu phiên → cuối phiên

| | đầu (w) | nay |
|---|---|---|
| chiến lược đoán theo độ dài tốt nhất | 92,3% | **25,4%** |
| câu lệch độ dài ≥1,5× | 788 | **43** |
| `why` không nói phương án sai sai ở đâu | 742 | **52** |
| từ tuyệt đối chỉ nằm ở distractor | 17 | **2** |
| lỗi kiến thức / chấm sai | — | **10 đã sửa** (6 ở (w) + 4 ở (x)) |

### Nợ còn lại — có số, có cách làm

> **Đã đóng ở phiên (z) 2026-08-17** — hai gạch đầu tiên dưới đây KHÔNG còn mở, giữ lại để
> đọc được mạch. Gạch thứ ba và thứ tư thì vẫn đúng nguyên (một là ngoại lệ của phép đo, một
> đã sửa xong ở (z)); món escape `quiz.json` đã lên `## CHƯA LÀM`.

- ~~**Findings chưa áp**~~ — kiểm lại ở (z): **242 finding, 100% là `kind:"do-dai"` /
  `sev:"nhac"`, KHÔNG có finding đúng/sai nào.** Mục tiêu của chúng đã đạt bằng đường khác
  (lệch ≥1,5× về 0, chiến lược đoán theo độ dài 26,7% vs ngẫu nhiên 25%), nên chúng là **đã
  bị vượt qua, không phải nợ**. Và **đừng đi tìm `scratchpad/findings/`**: scratchpad thuộc
  một phiên cụ thể, nó không đi theo repo và giờ coi như không còn.
- ~~**43 câu còn lệch ≥1,5×** và **52 `why` chưa bác phương án sai**~~ — **xong ở (z)**, cả
  hai về **0**. (Phiên (z) đo ra 51/49 chứ không phải 43/52: hai heuristic khác nhau — (x)
  lấy lựa chọn dài nhất làm mốc, (z) lấy trung bình ba lựa chọn kia.)
- **Ngoại lệ của phép chia hạng đều:** câu có đáp án **dưới ~40 ký tự không thể đạt hạng 1**
  (không có ba distractor ngắn hơn mà vẫn là mệnh đề đọc được). Bộ sinh `targets/` đã lọc.
- **Hai chỗ thân bài nên dọn, KHÔNG phải lỗi** (agent nêu, tôi không sửa vì ngoài phạm vi):
  `th-design` lấy ví dụ "PR-AUC giảm 0,031" trong khi bảng ablation ngay trên ghi −0,071 và
  −0,045 (bảng tự khai là số minh hoạ) · `ml-linear` dạy hệ số hạng mục đọc "so với hạng mục
  tham chiếu" nhưng code không có `drop='first'`, mà mặc định `OneHotEncoder` giữ đủ cột.
- **`data/quiz.json` không nhất quán chuyện escape** — có câu viết `&gt;`, có câu `&amp;gt;`.
  Bản sửa phải chép đúng dạng của nguồn, **đừng chuẩn hoá**; một lượt dọn riêng thì được.

### Ba chuyện về độ tin cậy của agent — đọc trước khi giao việc cho chúng

1. **Agent báo "đã ghi đủ file" nhưng file không tồn tại.** `q-nlp` và `th-defense` bị hai
   lô khác nhau báo xong, thực tế trắng — 30 câu suýt không được rà mà tôi vẫn tưởng đủ.
   Phép **đếm lại** bắt được. Đừng tin báo cáo, đếm.
2. **Agent bịa việc chạy thử.** Một lô báo "đã chạy với sklearn 1.9.0"; máy **không có
   sklearn** ở bất kỳ python nào, và 1.9.0 không phải phiên bản có thật. Kết luận của nó
   vẫn đúng, nhưng tôi xác nhận lại bằng nguồn chứ không bằng lời nó.
3. **Agent ghi đè file của phiên chính.** Một lô viết script riêng vào đúng tên
   `scratchpad/extract.mjs` và xoá bộ sinh bản trích của tôi. Công cụ nào còn cần thì để
   ngoài thư mục agent dùng chung.

**Và một lỗ IM LẶNG mà không cổng nào thấy:** bản trích cho agent render đề bài thành text
trần, nên agent chép `q` từ brief là **xoá sạch `<b>`/`<i>`/`<code>`** — không lỗi, không ai
thấy. 11 câu dính + 4 câu bị sửa chữ đáp án. Bắt được bằng luật "lượt này chỉ được đổi
distractor" trong `apply.mjs`, rồi khôi phục 23 trường từ nguồn bằng máy. **Bản áp phải so
từng byte với nguồn những trường mà brief cấm đổi** — đó là cách duy nhất thấy lớp lỗi này.

### Cố ý KHÔNG làm

- **Không nhận bản sửa của lô R1 cho 9 câu `pr-eval`.** `BRIEF-A` cho phép chuyển lý lẽ từ
  đáp án sang `why`, nên R1 cắt chữ đáp án — hợp luật brief, nhưng vi phạm guard "đáp án
  không được đổi" đang bắt lớp lỗi mất-thẻ-HTML. Hai luật của tôi mâu thuẫn; tôi giữ guard
  và lấy bản của lô vét (giữ nguyên từng byte). Bản R1 ở `scratchpad/superseded/`.
- **Không sửa 110 câu còn cụm "theo bài".** Xem mục (w) — đếm cụm từ bắt CHỮ không bắt HÌNH
  DẠNG, phần lớn đã là tình huống. Đừng chạy sed trên cụm đó.
- **Không đụng backlog "Roadmap độc lập — bốn gạch cuối"** và **không làm 8 hình P1** (điều
  kiện của chính nó chưa đạt: chưa ai ĐO 8 hình P0). Cả hai vẫn ở `## CHƯA LÀM`.

### Verify

`gate.mjs` CHẶN qua · `gate.test.mjs` **67 đạt / 0 trượt** · `G-QUIZ-GUESS` im ở trạng thái
mới · mở trang thật: 1429px không cuộn ngang, ô quiz 1059px = đúng `--ds-measure`; 375px với
`pr-code` (24 câu) vẫn **22px/vạch · 3 hàng** — khớp con số (v) chốt, không hồi quy.

---

## Phiên 2026-08-15 (w) — rà tính đúng/sai quiz · lỗ "đoán dài nhất" 92,3% → 70,6%

Chủ trang: *"review tính đúng sai của câu hỏi, câu trả lời, và các đáp án song hành cùng
nó, làm sao cho người đọc phải thực sự hiểu kiến thức thì mới trả lời được"*.

### Chẩn đoán: phiên (v) làm quiz ĐỦ, phiên này phát hiện nó không KIỂM được gì

Phiên (v) đưa 475 → 941 câu, mọi mục có ít nhất một câu. Nhưng không ai hỏi câu tiếp theo:
**những câu đó có kiểm được hiểu biết không.** Đo ra thì không:

```
chiến lược "chọn lựa chọn DÀI NHẤT"  →  đúng 869/941 = 92,3%
độ dài đáp án đúng ÷ trung bình 3 lựa chọn kia  →  trung vị 2,19×
```

Một người không biết gì về Data Science, chỉ đếm ký tự, làm đúng 92% bài kiểm tra.

**Lỗ này toàn cục, không khu trú** — và đó là phát hiện quan trọng hơn con số: 74/84 bài
≥80%, bài "kín" nhất (`s-lookup`) cũng 58%. Không có tập con nào để khoanh vùng; cả bộ được
viết bằng cùng một thói quen — đáp án đúng là lựa chọn duy nhất được viết đủ nghĩa (mang cả
cơ chế lẫn hậu quả), ba distractor bị cắt còn một mệnh đề trần.

### Đã làm — 717 câu, 84/84 bài

| lớp lỗi | số câu | cách sửa |
|---|---|---|
| lệch độ dài | 502 | nới distractor cho mỗi cái mang lý lẽ sai của riêng nó |
| hỏi nhớ chữ | 100 | đổi thành tình huống phải áp dụng |
| distractor không ai chọn | 54 | thay bằng hiểu nhầm thật mà chính bài đi gỡ |
| từ tuyệt đối chỉ ở distractor | 50 | bỏ "luôn"/"không bao giờ" — loại được bằng phản xạ làm bài |
| **chấm sai người hiểu bài** | **6** | xem bảng dưới |

Kết quả đo lại: **70,6%** (từ 92,3%) · độ dài trung vị **1,14×** (từ 2,19×) · từ tuyệt đối
chỉ ở distractor **1** (từ 17) · vị trí đáp án A/B/C/D = 23,0/28,9/27,8/20,3%.

### Sáu câu chấm sai — bốn cái chỉ lộ ra khi đọc đối chiếu thân bài

`t-env#7` "Codespaces vì có VS Code đầy đủ" bị chấm sai, nhưng bảng "Đường đi mặc định" của
chính bài ghi *"sửa `src/*.py` → github.dev **hoặc Codespaces**"* · `f-cat#2` "LabelEncoder
không xử lý được giá trị lạ" là nhược điểm THẬT nên cũng đúng · `q-forecast#7` xem mục dưới ·
`ml-cv#0` phủ định chồng phủ định ("std KHÔNG phải là gì" + lựa chọn mở bằng "Không phải…") ·
`t-pandas#7` "đảo thứ tự hai điều kiện" có hai cách đọc, một cách cho **không đáp án nào
đúng** · `d-eda#5` gán nhầm Thì 1/Thì 2, mà ranh giới hai thì là ý chính của bài.

### Một lỗi trong THÂN BÀI, tìm được nhờ rà quiz

`q-forecast` viết *".shift(1).rolling(w) chứ không phải .rolling(w).shift(1) — cả hai đều
chạy, chỉ một cái đúng"*. **Sai.** Kiểm bằng pandas: hai cách cho cùng một cột, khớp từng
dòng kể cả vị trí `NaN`. Chỗ rò rỉ thật là **quên `.shift(1)`** — và khối tương tác của
chính bài đã nói đúng điều đó (`shift(1).rolling(w) — đúng` / `rolling(w) — rò rỉ`), nên
trước lượt này thân bài đang mâu thuẫn với hình của nó. Bản tóm tắt roadmap chép lại nguyên
mệnh đề sai, đã sửa theo.

Đáng ghi vì nó nói một điều về quy trình: **rà quiz là một cách soi nội dung bài.** Câu hỏi
buộc phải phát biểu lại kiến thức ở dạng đúng/sai nhị phân, nên chỗ bài viết mơ hồ hay sai
thì câu hỏi làm nó lộ ra.

### Cách làm — và hai chỗ suýt hỏng

13 agent đọc từng câu đối chiếu thân bài. Bản trích cho agent gồm: mạch chính · tiêu chí
đạt · **khối tương tác** (`see:`/`wrong:` nằm trong `<script>`) · *tên* nhánh phụ (không nội
dung) · toàn bộ câu hỏi. **Đếm-đối-chiếu với nguồn TRƯỚC khi giao** — 941/941 câu, 63/63
tiêu chí đạt, 50/50 khối tương tác. Đây đúng là bước phiên (v) bỏ và mất hai vòng vì nó.

1. **Agent tái sinh lỗi `G-QUIZ-POS` ở tỉ lệ ~1%.** Bảy bản sửa viết "Phương án đầu…",
   "Phương án cuối…" trong `why` — đúng lớp lỗi phiên (v) dựng cổng để chặn. Bản áp
   (`apply.mjs`, kiểm 10 lớp lỗi trước khi ghi) bắt cả bảy, đã chữa tay sang gọi theo nội
   dung. **Đừng áp thẳng bản sửa của agent.**
2. **Cả 12 agent lô đầu chết cùng lúc** vì org chạm hạn mức chi tiêu tháng. Chúng kịp ghi
   209 bản sửa / 27 bài, nhưng hai agent dùng trùng tên file và ghi đè nhau. Lượt phóng lại
   bắt **một file mỗi bài, ghi ngay sau khi đọc xong bài đó** — nếu chết giữa chừng thì chỉ
   mất bài đang làm.

### Nợ đang mang — ghi ra để đừng ai tưởng đã xong

- **"Chọn dài nhất" còn 70,6%, mục tiêu là 25%.** Nguyên nhân là lỗi của tôi trong bản giao
  việc: `BRIEF.md` viết *"nới distractor cho ngang đáp án"*, mà **ngang thì thế hoà vẫn
  nghiêng về đáp án** — dài hơn một ký tự cũng là dài nhất. Lượt sau phải yêu cầu **"ít nhất
  một distractor DÀI HƠN đáp án"**. Phần thực chất đã cải thiện thật (2,19× → 1,14×), phần
  còn lại là thế hoà.
- **19 câu còn ≥2×** (`s-intro#3` `s-plan8w#3` `t-colab#11` `d-split#8` `ml-linear#6`
  `ml-metrics#3` `pr-code#8` `pr-code#21` `pr-eval#4` `q-multi#4` `r-stack#4` `#6` `#11`
  `#16` `r-mistakes#8` `#10` `#18` `r-glossary#8` `#12`) — **đóng ở phiên (aa) 2026-08-20:
  đo lại ra 0 câu ≥2× và 0 câu ≥1,5×**. `G-QUIZ-GUESS` đặt ngưỡng
  từng-câu ở **2,5×** chứ không phải 2×, cố ý: đặt ngưỡng cho vừa nợ thì cổng thành con dấu
  cao su. 19 câu này là nợ, không phải chuẩn mới.

### Cố ý KHÔNG làm

- **Không rà lại tính đúng/sai bằng một lượt độc lập.** `BRIEF.md` mở đầu bằng con số 92,3%,
  và tỉ lệ báo cáo phản ánh đúng thứ tự đó: 502 `do-dai` / 6 `chan`. Có thể bộ câu thật sự
  đúng (phiên (v) đã rà nội dung), cũng có thể bản giao việc mồi agent nhìn một trục và làm
  mờ trục kia. **Chưa có bằng chứng chọn giữa hai khả năng**, nên đừng đọc "6 lỗi chặn" là
  "bộ câu đã sạch về kiến thức". Muốn chắc thì cần một lượt **chỉ hỏi đúng/sai, không nhắc
  gì tới độ dài** — hai lượt không mồi lẫn nhau.
- **Không sửa 110 câu còn cụm "theo bài".** Đếm cụm từ bắt CHỮ chứ không bắt HÌNH DẠNG: phần
  lớn đã là tình huống (*"Bạn train mô hình bằng log loss, nhưng báo cáo lại nói…"*) và giữ
  "theo bài" như một giới hạn phạm vi, nghĩa là "trả lời theo khung bài này". Còn ca thật
  sót lại (`s-how#0`), nhưng không phải 110 — đừng chạy sed trên cụm đó.
- **Không tách bài dài thành nhiều cụm quiz.** Nợ cũ từ (v), vẫn là quyết định giáo trình.
- **Không đụng nội dung bài học** ngoài một câu ở `q-forecast` — vì câu đó SAI, không phải
  vì nó mỏng.

### Verify

`gate.mjs` CHẶN qua · `gate.test.mjs` **66 đạt / 0 trượt** · `G-QUIZ-GUESS` im ở trạng thái
mới · mở trang thật: 1429px không cuộn ngang, ô quiz 1059px = đúng `--ds-measure`, bốn lựa
chọn cùng cao 66px cùng rộng 1009px; 375px với `pr-code` (24 câu) vẫn **22px/vạch · 3 hàng**
— đúng con số (v) chốt, không hồi quy. Screenshot ra khung đen khi cuộn sâu, đúng như mục
"Chạy preview" đã ghi — verify bằng DOM.

---

## Phiên 2026-08-14 (v) — rà bao phủ quiz · 475 → 941 câu · hai cổng mới

Chủ trang hỏi "mỗi bộ câu hỏi đã bao phủ toàn bộ kiến thức của bài chưa, tôi muốn nó đầy đủ".

### Chẩn đoán: tổng thì đủ, phân bố thì lệch

475 câu cho 473 mục — nhìn tổng tưởng vừa. Nhưng số câu được phát theo **định mức ~6 câu mỗi
bài** bất kể bài 400 chữ hay 6.400 chữ: 68/84 bài có đúng 5 hoặc 6 câu. Hệ quả đo được:
**29/84 bài có ít câu hơn số mục của chính nó**, trong khi bài ngắn thì dư. `pr-eval` 12 mục /
7 câu (917 chữ mỗi câu); `r-stack` 13 mục / 5 câu; `f-store` 3 mục / 3 câu.

Sau khi bù: **928 câu, 0/84 bài thiếu** theo chuẩn "mỗi mục ít nhất một câu". Số câu mỗi bài
giờ chạy 5–24, trung vị 10.

### Phạm vi — hai quyết định, ghi lại vì phiên sau sẽ hỏi

- **Popup / ngăn phải KHÔNG bị hỏi.** Đó là nhánh phụ (§7 — "bỏ qua vẫn học được bài"), nên
  hỏi vào đó là phạt đúng người đã bỏ qua theo thiết kế.
- **Khối `data-viz` CÓ bị hỏi.** Nó thuộc mạch chính. Hai trường `see:` / `wrong:` của nó nằm
  trong `<script>` nên vô hình khi đọc `<template>` — mà `wrong:` chính là hiểu nhầm bài muốn
  gỡ, loại nội dung đáng hỏi nhất. 43 khối, 40 bài.

### Hai lỗ trong bản trích, cả hai do subagent bắt được

1. **`ACCEPT` là mảng `{k,v}` chứ không phải mảng chuỗi** — bản trích đầu in ra `[object
   Object]`, xoá sạch tiêu chí đạt của **cả 22 bài có ACCEPT**, đúng phần quan trọng nhất phải
   kiểm. Bốn agent tự vào HTML lấy lại; ba bài (`d-data`, `d-leak`, `m-bayes`) chỉ soi được
   mạch chính ở vòng đó. Đã sửa trước vòng hai.
2. **`data-viz` trích ra rỗng** (mục 2 ở trên). Lô 7 phát hiện.

Bài học chung: **bản trích cho subagent là một nguồn lỗi im lặng.** Nó không nổ, chỉ làm
agent không thấy — và cái không thấy thì không có trong báo cáo. Lần sau: đối chiếu số mục /
số tiêu chí trong bản trích với số đếm từ nguồn TRƯỚC khi giao việc.

### Vòng bù `data-viz` — tôi định bỏ, chủ trang bảo chạy, và chạy là đúng

Tôi đã dựng xong đầu vào rồi định bỏ, lý do: 7/7 khối lấy mẫu đều đã có câu hỏi chạm tới hiểu
nhầm của nó, nên vòng bù sẽ sinh ~40 câu trùng ý. Chủ trang bảo chạy. **Kết quả: 44 khối, 31
đã phủ, 13 câu thật sự thiếu** — suy từ mẫu 7 khối là suy sai, và cái sai đó không nằm ở tỉ lệ
mà ở chỗ mẫu của tôi toàn rơi vào trường `wrong:`.

**Khuôn lộ ra sau khi rà đủ 44 khối: `wrong:` gần như đã phủ, `see:` thì chưa.** Hợp lý —
`wrong:` là hiểu nhầm nên nó cũng được nêu trong thân bài, mà thân bài thì vòng trước đã rà.
Còn `see:` là *thứ chỉ thấy được khi kéo/bấm khối*, nó không có bản sao nào trong chữ. 9/13
câu mới đến từ `see:`.

Vài câu đáng giữ làm ví dụ về loại nội dung này: `ml-imb` — hiệu chỉnh là biến đổi đơn điệu
tăng nên **AUC không nhúc nhích**, và AUC cao không cho quyền nhân xác suất với tiền;
`q-analytics` — chỗ tụt sâu nhất của phễu không phải chỗ đáng sửa nhất; `f-time` — giao dịch
gian lận đầu tiên tự kéo "mức thường ngày" lên nên `z_vs_history` tự làm mờ mình đúng lúc
chuỗi rút đang diễn ra.

**Cách đo tự tố cáo là yếu, và tôi đã dựa vào nó quá lâu.** Phép trùng-từ-khoá cho "0 còn hở"
ở ngưỡng 0,5 nhưng "16 còn hở" ở ngưỡng 0,8 — một phép đo mà kết luận lật theo hằng số thì nó
không phải bằng chứng. Cái ra kết quả đúng là giao cho agent đọc từng khối và đối chiếu với
**toàn bộ** câu của bài, với chốt "mặc định không viết gì".

Sau vòng này: **941 câu**, trung vị 10, vị trí đáp án đúng A/B/C/D = 22,5 / 28,1 / 27,8 /
21,6%.

### Đáp án dồn về ô B — và cái giá của việc sửa

453 câu mới dồn **40,6% đáp án vào ô B** (bộ cũ: cao nhất 30,7%). Đoán bừa "chọn B" ăn 40%.
Đã rải lại về 25% mỗi ô bằng hoán vị hai lựa chọn, bỏ qua 9 câu có lựa chọn tham chiếu lẫn
nhau ("cả ba đáp án trên").

**Việc đó làm hỏng 2 câu**, và đó là phát hiện đáng giá nhất phiên này: giải thích viết "đáp
án cuối sai vì…" phụ thuộc vào **thứ tự lựa chọn**. Quét ra 11 câu mới + **7 câu CŨ có sẵn từ
trước** cùng lỗi. Đã đổi hết sang gọi theo nội dung, và thêm cổng `G-QUIZ-POS` để lớp lỗi này
không quay lại.

### Hồi quy layout do chính lượt này gây ra

Vạch tiến độ dưới carousel thiết kế cho "4–8 câu" (comment cũ ghi thẳng vậy). 24 câu ở màn
375px làm mỗi vạch teo còn **7px** — nhỏ hơn cả mốc ~10px mà media query 560px đã sinh ra để
chữa. Sửa: cho vạch `flex-wrap` + sàn `min-width`, và hạ `flex-basis` xuống 22px trên điện
thoại (flexbox xuống hàng theo *basis* rồi mới co — hạ `min-width` không đổi số hàng).

**Popup roadmap cần luật RIÊNG cho việc này**: modal chỉ rộng 560px nhưng *cửa sổ* thì không,
nên media query theo viewport không chạm tới nó — không có luật riêng thì 24 vạch thành 6
hàng. Đo lại sau khi sửa: trang chính 2 hàng (desktop) / 3 hàng (375px), popup 2 hàng.

### Cố ý KHÔNG làm

- **Không tách bài dài thành nhiều cụm quiz.** `pr-code` 24 câu và `pr-eval` 23 câu thì cái
  tên "Kiểm tra nhanh" không còn đúng. Nhưng chia cụm là quyết định giáo trình (chia theo
  mục? theo mức?) và nó đổi cả cách đọc điểm — chủ trang quyết, không phải phiên này.
- **Không giảm số câu cho vừa cái tên.** Chủ trang nói rõ "tôi muốn nó đầy đủ".
- **Không đụng nội dung bài học.** Vài agent nêu chỗ bài viết mỏng; đó là việc khác.
- **Không viết câu cho mục chỉ là danh mục tra cứu** (`r-glossary` phần từ vựng một dòng,
  `r-books` mục "Khi bí"). Hỏi vào đó chỉ ra câu thuộc lòng.

---

## Phiên 2026-08-14 (u) — độ nổi ô quiz · cửa sổ carousel · chặn token thiếu

Ba việc chủ trang giao, ba commit (+ hai lượt sửa phạm vi sau đó, xem mục độ nổi).

### Cửa sổ carousel: lỗi TÔI tạo ra ở phiên (t)

Phiên (t) sửa lỗi trôi bằng `box-sizing` (đúng) rồi thêm `padding:4px` vào
`.ds-quiz__viewport` để lấy chỗ cho vòng focus (**sai**). `overflow:hidden` cắt ở *padding-box*,
nên cái padding đó chính là khe 4px mỗi bên cho câu bên cạnh ló ra. Chủ trang chỉ ra, đo lại
đúng: cửa sổ 1023px / một câu 1015px. Bài học đủ chung để viết vào `docs/design.md` §10:
**đừng bao giờ trả padding ngang về viewport**.

Kèm theo, `gap` giữa hai câu đang là 0 — cửa sổ khít thì không thò, nhưng lúc kéo tay hai câu
dán liền nhau thành một dải chữ. Có `gap` thì transform phải trừ thêm `cur × gap`; gom vào
`place()` và **đọc gap lại từ computed style** nên con số vẫn chỉ nằm ở CSS.

### Độ nổi ô quiz — ba lượt, kết quả là MỘT BẬC BÓNG, không phải một lối trình bày

Đây là chỗ tốn nhiều lượt nhất phiên này; ghi cả đường đi vì cái sai lặp lại được.

1. Phiên (t) thêm **viền đen 2px** để ô nhận ra được khi lướt. Chủ trang bác.
2. Chủ trang bảo thử **neumorphism**. Tôi làm cho **cả cây** (ô đáp án lõm như phím bấm, huy
   hiệu đảo chiều, nút, vạch tiến độ) → bác: chỉ card ngoài, `roadmap.html` để nguyên, bên
   trong giữ nguyên. Thu về đúng khung.
3. Chủ trang **bỏ hẳn neumorphism**: *"giờ chỉ cần shadow mạnh hơn rộng hơn cho card này"*.

**Kết quả cuối, đang chạy:** ô quay lại đúng ngôn ngữ card của kit — `--wb-surface`,
`--wb-bw solid --wb-border`, `--wb-radius-lg`, `padding 18px 20px` — và thứ duy nhất khác mọi
khối khác là **bóng**: một bậc thứ ba, rộng hơn cả `--wb-shadow-md` của kit
(`0 14px 40px rgba(16,17,18,.16)`, tối thì `.07` trắng). Đo trên trang thật: khối cạnh nó hoặc
không có bóng, hoặc là `sm` (blur 3px). Nên chênh lệch là **40px so với 3px**, thấy rõ.

**Bài học của cả ba lượt:** cái đúng không phải một *lối trình bày riêng* cho ô quiz, mà là
**cùng ngôn ngữ, khác một bậc**. Cả viền đen lẫn neumorphism đều tách ô ra khỏi hệ thống; bậc
bóng thì không. Nếu lần sau lại thấy "ô này cần nổi hơn" thì nghĩ theo hướng bậc, đừng nghĩ
theo hướng phong cách.

**Bóng dừng ở khung.** Popup roadmap gỡ hẳn khung ngoài nên luật đặt trên `.ds-quiz` không rò
sang — nhưng nó **chỉ chặn được đúng cái khung**; thêm bóng cho phần tử BÊN TRONG là rò ngay,
không có gì chặn. Lý do dark không đảo thẳng được: `docs/design.md` §10.

### Câu hỏi về chuẩn margin — trả lời: ĐÃ CÓ, và 44px là học từ nó

Chủ trang hỏi "web DS này đã có chuẩn design gì chưa". Có: thang `--ds-sp-*`, 6 bậc, luật ở
`docs/design.md` §0.6, `G-SPACING` canh. Đo lại trên trang thật: 44px trước mỗi `h2`, 28 trước
`h3`, 20 sau một khối, 14 giữa hai đoạn, 8 tiêu đề→thân. `margin-top: --ds-sp-sec` (44px) của
quiz khớp đúng bậc mà `.ds-nodefoot` ngay dưới dùng, nên **không sửa gì** — chỉ trả lời.

### Lỗ đã bịt: token khai tay ở roadmap.html

`roadmap.html` khai lại token `--ds-*` **bằng tay** trong khi CSS thì **trích tự động**. Thêm
một `var(--ds-…)` mới vào rule `.ds-quiz` là roadmap im lặng mất luật đó. Dính thật hai chỗ
cùng lúc phiên này. `build-roadmap.mjs` giờ đối chiếu tên-dùng với tên-khai và **ném lúc
build** — không phải cổng riêng, vì bắt ở build thì bản hỏng không bao giờ ra tới đĩa.

### Cố ý KHÔNG làm

- **Không đổi `--ds-measure` / `--ds-fs`** — quyết định của chủ trang, `CLAUDE.md` §10 bắt hỏi.
- **Không đưa bậc bóng này ra khối thứ hai trong bài.** Nó chỉ có nghĩa vì nó là block DUY
  NHẤT nổi hơn phần còn lại; dùng ở khối thứ hai là mất tác dụng cả hai.
- **Không đổi kích thước/nhịp của quiz theo cảm tính** — mọi margin trong ô đều trỏ vào một
  bậc `--ds-sp-*` có sẵn.

### Pane preview: chụp được, nhưng CHỈ vùng đã vẽ khi cuộn = 0

Suốt hai lượt đầu phiên này pane không vẽ gì (`visibilityState = 'hidden'`, ảnh đen), nên tôi
chỉ kiểm được bằng số đo. Lượt cuối thì **chụp được** — nhưng chỉ ở `scrollY = 0`; cuộn xuống
rồi chụp ra ảnh trắng trơn, kể cả khi `getBoundingClientRect()` nói khối đang nằm trong khung
nhìn. Tab ẩn thì compositor không vẽ phần mới cuộn tới.

**Cách chụp được một khối nằm sâu trong trang:** `scrollTo(0,0)` rồi đặt tạm khối đó
`position:fixed; top:70px; left:60px` — nó rơi vào vùng đã vẽ và hiện ra. Đổi theme bằng cách
bật/tắt class `dark` trên `<html>` để chụp cả hai chế độ. Nhớ `navigate` lại để xoá style tạm.

Bẫy còn nguyên giá trị: khi pane không vẽ, **CSS transition bị treo hẳn**, nên
`getComputedStyle` trả giá trị *trước khi* chuyển — `transform` đọc ra identity dù inline style
đúng, `box-shadow` đọc ra hình khối cũ. Suýt sửa oan hai chỗ. Chèn `transition: none !important`
rồi mới đo, hoặc đọc thẳng inline.

---

## Phiên 2026-08-14 (t) — quiz ra file ngoài · sửa lỗi trôi carousel · rà chữ dạy đời

Sáu commit, mỗi gạch đầu dòng của chủ trang một commit (yêu cầu rõ).

### 1. `data/quiz.json` — bước đầu của "HTML chỉ còn design + layout"

**Chủ trang chốt hướng dài hạn:** nội dung text phải nạp từ file ngoài, HTML chỉ dựng giao
diện. Lý do là chi phí đọc — cả người lẫn công cụ phải nạp toàn bộ nội dung để sửa một dòng
layout, và file lớn thì tool còn không mở nổi. Phiên này tách **quiz trước**; nội dung bài học
tách sau, **đừng tự khởi động**. `CLAUDE.md` §2 luật 3 đã viết lại theo hướng đó, kèm khuôn để
theo (file dưới `data/`, trang fetch tương đối và sống được khi fetch hỏng, `read-html.mjs` có
hàm đọc thẳng cho `tools/`).

Điểm thiết kế đáng giữ: **cả hai trang fetch CÙNG file**, `roadmap.html` không nhúng câu hỏi
nữa (chỉ nhúng `quizN` để in nhãn nút). Nên sửa nội dung câu hỏi **không phải build lại gì**.
HTML −370 KB, roadmap −355 KB.

Giá phải trả, đã cân nhắc và chấp nhận: mở bằng `file://` thì fetch bị CORS chặn → mất quiz,
phần còn lại chạy y nguyên. Bản thật chạy trên GitHub Pages nên không đáng đổi lấy việc nhúng
lại 360 KB.

### 2. Lỗi trôi carousel — nguyên nhân gốc là `box-sizing`, không phải carousel

Chủ trang thấy "câu bên cạnh thò ra 2–5px, câu đang đọc bị cắt". Đo ra: kit chỉ đặt
`border-box` cho phần tử `wb-*`, phần còn lại của trang là `content-box`. Slide `flex:0 0 100%`
+ `padding:0 1px` rộng hơn khung 2px, track dịch đúng `cur × 100%` **khung** → câu *i* lệch
`2i` px (đo 6px ở câu 4). Ô đáp án `width:100%` + padding 13px cũng đang tràn 26px, im lặng.

Chữa ở **lớp**, không ở chỗ: `box-sizing: border-box` cho cả cây `.ds-quiz`. Chỗ cho vòng focus
chuyển sang viewport (`padding:4px; margin:-4px`) chứ không đặt lên slide nữa.

### 3–6. Còn lại

Nav + điểm gộp một hàng, chấm tròn → vạch, số câu gom về một chỗ (từng nằm ba chỗ); viền 2px +
bóng cho ô quiz; bỏ 9 câu dạy người đọc thao tác hiển nhiên; `inert` cho câu ngoài khung +
phím ← → ↑ ↓ / `1…6`. Chi tiết trong `docs/design.md` §10 và message từng commit.

### Cố ý KHÔNG làm

- **Không tách nội dung bài học ra khỏi HTML.** Chủ trang nói rõ "tách content để tương lai
  tính". Việc đó chạm 84 template + router + `read-html.mjs` + cả bộ cổng — không phải việc
  làm kèm.
- **Không đụng `s-lookup` / `t-stack` / phần còn lại của trang** khi rà chữ. Bản rà chỉ nhắm
  bốn dạng câu (chỉ dẫn thao tác hiển nhiên / đếm lại thứ đã hiện / trấn an / dạy cách đọc
  trang) và cố ý **không** bắt các nhãn `ds-viz__label` dạng "Kéo X — xem Y": vế sau nói *nhìn
  cái gì*, đó là nội dung dạy học. Chỉ những câu trong thân bài **lặp lại** nhãn đó mới bị cắt.
- **Không nối quiz vào tiến độ/pháo giấy** — giữ nguyên quyết định phiên (s).
- **Không tự chuyển câu khi chọn đáp án** — giữ nguyên yêu cầu phiên (s), dù giờ đã có vuốt.
- **Không thêm cổng cho lỗi `box-sizing`.** Đã cân nhắc: một cổng quét `content-box` gây trôi
  thì phải hiểu layout, mà bộ cổng đọc HTML như văn bản. Thay vào đó viết cái bẫy vào
  `docs/design.md` §10 kèm số đo — chỗ người sửa carousel chắc chắn đọc.

### Không kiểm được bằng mắt

Ảnh chụp trong pane preview trả về khung đen (`document.visibilityState = 'hidden'` → renderer
không vẽ). Đã thay bằng **đo trong trang**: tràn ngang, bề rộng slide so với khung, thứ tự hàng
ở 1440/375px, màu viền ở cả hai chế độ, và chạy trọn vòng chọn → chấm → làm lại. **Phiên sau
nếu mở được pane thì nên nhìn một lượt** — số đo không thay được câu "nó có đẹp không".

---

## Phiên 2026-08-14 (s) — trắc nghiệm tự kiểm mỗi bài (carousel) + popup ở roadmap · cổng G-QUIZ · 475 câu

Yêu cầu chủ trang: mỗi bài có câu hỏi trắc nghiệm ở dưới, **đủ phủ kiến thức chính**, dạng
**collapse/carousel** (bấm thì câu tua trái/phải), **chọn đáp án KHÔNG tự chuyển câu**, làm hết
thì **chấm điểm**. Ở **roadmap** thì không để dưới bài mà làm **popup** (tham khảo `facts/index.html`).
Minimalism, dùng skill web-builder, cập nhật docs, verify → commit → push.

### 1. Một module carousel, chạy ở HAI trang
`DSQuiz.mount(root, questions)` (khối "QUIZ MODULE" trong `<script>`) dựng cả carousel — một câu mỗi
lần, tua bằng ‹ › / chấm tròn / phím ←/→; chọn đáp án chỉ đánh dấu (KHÔNG nhảy câu); trả lời hết mới
bật "Chấm điểm"; chấm xong hiện đúng/sai + giải thích + điểm, có "Làm lại". Trang chính cắm ở cuối mỗi
bài (`quizSection` sau `gainBox`, trước tự-đánh-giá). `roadmap.html` gọi ĐÚNG module đó trong một popup
(`wb-modal` kiểu facts) — `build-roadmap.mjs` TRÍCH nguyên khối JS + mọi rule `.ds-quiz` (như cách trích
khối tương tác, CLAUDE.md §2 luật 3). Look + behaviour đầy đủ: [docs/design.md §10](docs/design.md).

### 2. Nội dung: object `QUIZ`, một nguồn sự thật
Câu hỏi ở object `QUIZ` trong HTML (`read-html` đọc, `build-roadmap` nhúng vào popup — không gõ hai
lần). **84/84 bài · 475 câu** (3–8 câu/bài tuỳ độ dày; bài ★ 6–8). Viết bằng cách đọc CHÍNH bài rồi neo
từng câu vào chữ trong bài; mồi nhử là hiểu nhầm bài nêu ra để sửa. Luật nội dung + dạng `{q,o,a,why}`
ở [editing.md việc 7](docs/editing.md).

### 3. Cổng `G-QUIZ` (chặn) + `G-QUIZ-COV` (nhắc)
`G-QUIZ` kiểm phần máy kiểm được: đủ trường, `a` trỏ đúng đáp án CÓ THẬT, id có trong TREE — `a` lệch là
chấm sai đáp án, một lỗi chạy được. `G-QUIZ-COV` liệt kê bài chưa có câu. Cả hai có ca NỔ + ca IM trong
`gate.test.mjs` (chèn khoá trùng ở CUỐI object QUIZ, bản cuối thắng — ca test không phụ thuộc nội dung).

### Ba cái bẫy đã dính (cách chữa ghi ở design.md §10)
- `.ds-quiz__why[hidden]` phải tự khai `display:none` (`display:flex` thắng `[hidden]` — cùng lỗi `.wb-drawer` §1.2).
- Margin dọc quiz trỏ vào thang `--ds-sp-*` (G-SPACING), và roadmap khai sẵn `--ds-t-h3/-body` + `--ds-sp-text/-block` cho bản trích.
- Popup: mount vào một div CON (mount gắn class `.ds-quiz` lên chính root nên rule bỏ-khung phải trúng hậu duệ) + `#quizModal` z-index 200 (trên drawer 101 của kit).

### Cố ý KHÔNG làm
- **Không KaTeX trong câu hỏi.** Popup roadmap không nạp KaTeX; ký hiệu toán viết Unicode. Text câu hỏi là HTML tin cậy (`<code>/<b>/<i>`) như PAYOFF/ACCEPT.
- **Không chấm ngay mỗi câu / không tự nhảy câu** — chủ trang chốt: chọn không chuyển câu, chấm khi xong hết.
- **Không nối quiz vào tiến độ/pháo giấy** — quiz là tự kiểm, tách khỏi cơ chế đánh dấu mức.
- **Không đụng "Roadmap độc lập — bốn gạch cuối".** Quiz phủ phần *self-check có đáp án* cho cả hai trang, nhưng ba gạch còn lại (mental model / visual / worked example mỗi node) vẫn là quyết định giáo trình riêng, chưa chốt.

### Verify
Cổng CHẶN xanh (`G-QUIZ` qua · `G-SYNTAX` qua với 475 câu). `gate.test.mjs`: **61 đạt · 0 trượt** (thêm ca
`G-QUIZ` + `G-QUIZ-COV`). `G-QUIZ-COV` im (84/84). Mở trang bằng mắt: carousel chạy hết một vòng
(chọn → chấm → làm lại) ở `s-intro`/`m-bayes`, ký hiệu Unicode hiện đúng, không rò `$…$`; 375px không cuộn
ngang; sáng/tối đều đọc được; popup roadmap mở từ nút trong ngăn (`ml-metrics` 7 câu) chấm điểm được.

Chạm vào: `(data-science-roadmap.html + tools/read-html.mjs + tools/gate.mjs + tools/gate.test.mjs + tools/build-roadmap.mjs + roadmap.html sinh lại + CLAUDE.md + docs/design.md + docs/editing.md)`

---

## Phiên 2026-08-12 (r) — ba mốc HIỆN trong lịch 14 ngày · session.mjs hỏi remote · một bản luật hook

Chủ trang đọc `s-plan14` và hỏi đúng một câu: *"sao ngày 6 và 14 ngày không thấy liên quan
gì với nhau hết vậy"* — kèm xác nhận trang **không** hứa deadline nào và bài này **giữ
nguyên**. Rồi: *"có làm hết đi, mà có gì đang handoff không cũng làm nốt luôn"*.

### 1. Chẩn đoán: mốc chỉ tồn tại trong một đoạn văn

Ý định cũ đúng (ngày 6 là mốc giữa của 14 ngày) nhưng trang không dẫn được nó. Ba chỗ hỏng,
sửa cả ba:

- **Cụm "hết ngày 6" xuất hiện đúng MỘT lần trong cả trang** — trong alert đầu bài. Danh
  sách 14 ngày và biểu đồ 14 cột không có dấu nào ở ngày 6. Lịch 8 tuần thì **có** cơ chế
  mốc thật (`mile` → chip `wb-cap--solid`), `DAYS` không có trường đó. → thêm `mile` cho
  ngày 6/11/14, `renderPlan14` render chip **bằng đúng cơ chế của `renderPlanWeeks`**
  (cùng `milestoneDone`), và số ngày mốc dưới trục biểu đồ in đậm + `--wb-fg` thay vì
  `-subtle`. Nhãn hình và `.ds-viz__alt` đều nói ra việc in đậm nghĩa là gì.
- **Alert mô tả sản phẩm ngày 6 bằng một bước chưa được dạy lúc đó** — chuỗi cũ là
  "đọc dữ liệu → **tạo feature** → train → in ra một con số", nhưng feature engineering là
  ngày 7–8. → chuỗi mới: đọc dữ liệu → chia tập hợp lệ → train logistic → in ra một con số
  validation, kèm một câu nói rõ mốc này chỉ đòi *vòng chạy khép kín*.
- **"Tám ngày sau chỉ là cải tiến" mâu thuẫn với chính ngày 10–14** — ngày 10–11 mới làm ra
  sản phẩm, ngày 14 ra dàn ý luận văn. → alert giờ kể **ba** mốc, và nói rõ chỗ cắt được khi
  hụt giờ là ngày 7–9 (cải tiến mô hình), không phải ba ngày mốc.

Ghi chú ngày 11 cũng sửa theo: bỏ "sớm hơn lịch cũ hai ngày" (so với một bản lịch người đọc
chưa từng thấy) và nói thẳng ngày 12–13 là mở rộng, ngày 14 là khung luận văn.

Số đo cho biết vì sao **không** nên gọi đây là "hai nửa": ngày 1–6 là 31,2 giờ (41%),
ngày 7–14 là 44,2 giờ. Sáu ngày ≠ nửa lịch.

### 2. `session.mjs` giờ hỏi cả remote (nợ từ phiên (o) — đóng)

`git status` chỉ biết working tree, nên "thư mục sạch" là câu trả lời gây nhầm khi một phiên
khác vừa push thẳng `main`. Mở phiên giờ `git fetch` (có **timeout 8 giây** — mở phiên không
được treo vì mạng) rồi so `origin/main...HEAD`: cũ bao nhiêu commit, hơn bao nhiêu, và khi
cũ thì in luôn `git pull --rebase` + câu "ĐỪNG `--amend`". Không fetch được thì nói rõ số
đang tính bằng dữ liệu cũ, chứ không im lặng báo "ngang origin".

### 3. Một bản luật cho "hook đã cài chưa" → `tools/hook-state.mjs`

Mở phiên báo **"2/3 lớp CHƯA cài"** trong khi cả hai git hook vẫn đang chạy thật. Nguyên
nhân: cùng một câu hỏi có hai bản trả lời. `gate.mjs` (G-HOOK) đã được sửa ở phiên (p) để
hiểu **bộ điều phối**; `session.mjs` thì chưa, nó vẫn tìm chuỗi `data-science-roadmap` trong
`.git/hooks/*` — mà bộ điều phối không chứa chuỗi đó.

False negative này không vô hại: nó đẩy người đọc đi chạy `tools/install-hooks.sh`, và theo
`CLAUDE.md` **gốc repo** thì cài lại bằng script của project con là đúng thao tác xoá bộ
điều phối. → luật chuyển sang `tools/hook-state.mjs`, cả `gate.mjs` và `session.mjs` import.
Thông báo "chưa cài" giờ in **hai lệnh, đúng thứ tự** (project trước, `facts/` sau).

### 4. `launch.json` cài vào HAI chỗ (nợ cũ, hoá ra chưa xong hẳn)

`tools/hooks/launch.json` đã có từ phiên (n6), nhưng `install-hooks.sh` chỉ trộn nó vào
`.claude/` của **thư mục project**. Phiên này dính ngay hậu quả: phiên mở ở **gốc repo**,
`preview_start` với `name: "ds-review"` không tìm thấy config, rơi vào config đầu tiên của
project khác (`pages-mirror`) và trang trả về `Error response`. Preview đọc `launch.json`
theo thư mục làm việc, mà thư mục đó không cố định → cài vào cả hai, `jq` chỉ thay
configuration cùng tên nên không chạm config của project khác.

### Cố ý KHÔNG làm trong phiên này

- **"Roadmap độc lập — bốn gạch cuối"** (mục `## CHƯA LÀM`). Chủ trang nói "làm hết", nhưng
  mục đó tự ghi rõ ước lượng ~65 ví dụ có số + ~65 câu tự kiểm, mỗi cái phải khớp bài gốc,
  và **"đây là một phiên riêng, không phải phần đuôi của phiên khác"**. Nhồi vào cuối một
  phiên sửa chữ là cách chắc chắn làm ra 130 mục hạng vừa. Vẫn nằm trong backlog.
- **Tám hình P1.** Điều kiện của chính nó chưa đạt: audit (n9) §5 xếp "làm 8 hình P0 → **đo**
  comprehension/usability → mới làm P1". P0 xong ở phiên (p), phần **đo** thì chưa có dữ
  liệu nào — sổ học đang 0/84 bài. Làm P1 lúc này là bỏ qua đúng cái điều kiện khiến thứ tự
  đó tồn tại.
- **Nhãn Foundation / Applied / Advanced.** Vẫn là *"đang chờ chủ trang gọi"*: trang đã có 3
  chip ưu tiên + chip 14 ngày + nhãn `SCOPE`, và phiên này vừa **thêm** một trục nữa (chip
  mốc) vào lịch. Thêm trục thứ năm ngay sau đó là chắc chắn thành nhiễu. Cần thì gọi tên nó
  ra, đừng gộp vào "làm hết".
- **Không xoá `ds-mirror` / `pages-mirror`** khỏi `.claude/launch.json` dù chúng trỏ vào
  scratchpad của phiên khác. Đã kiểm: hai file `serve.py` đó **vẫn tồn tại**, nên không phải
  "đường dẫn chết" — và một luật kiểu "bỏ mọi config trỏ vào `/private/tmp/claude-*`" sẽ xoá
  config của project khác mà không ai nhờ.
- **Không sửa hộp "Nộp được" vỡ chữ ở 375px.** Lỗi CÓ TRƯỚC (chỉ xảy ra khi `d.out` chứa
  `<code>`; ngày 5 không có `<code>` thì bình thường), không do chip mốc. Đã tách thành một
  việc riêng để không trộn một sửa CSS vào phiên nội dung.

### Verify

`node tools/gate.test.mjs`: **57 đạt · 0 trượt** (thêm 1 ca so với trước, không phải ca mới
— trước đó ca `G-ROADMAP-SUM kêu dù không có vi phạm` trượt thật vì `s-plan14` đã đổi mà tóm
tắt chưa đọc lại). Cổng CHẶN xanh; sau khi ghi mục này thì `G-HANDOFF` cũng im.

Bản tóm tắt `s-plan14` trong `roadmap-summaries.json` **đã đọc lại rồi mới đóng dấu**:
`tldr` + gạch đầu dòng 1 còn nguyên văn "một mốc duy nhất / hai nửa / tạo feature" — tức
đúng ba câu vừa bị sửa trong trang. Sửa cả ba rồi `--stamp`.

Trang mở bằng mắt (preview `ds-review`, cả sáng lẫn tối, 1280px và 375px): chip mốc nằm cùng
dòng tiêu đề ngày, số ngày 6·11·14 in đậm rõ ở cả hai chế độ, `scrollWidth == clientWidth`
ở 375px.

---

## Phiên 2026-08-10 (q) — bấm nền chỉ đóng lớp phủ khi bấm VÀ nhả đều trúng overlay

Bug toàn repo (chủ trang báo): bấm chuột trong một modal/popup rồi kéo ra **nhả trên nền**
thì lớp phủ đóng oan. Nguyên nhân: handler đóng bằng sự kiện `click` trên overlay, mà click
nhắm vào **tổ tiên chung** của điểm bấm và điểm nhả — kéo từ hộp ra nền thì tổ tiên chung
chính là overlay, nên click rơi trúng overlay và đóng.

Sửa ở trang này: nhánh click chỉ còn lo `[data-modal-close]`; tách phần bấm-nền sang một
cặp `pointerdown`/`pointerup` trên `document` — chỉ `closeLayers()` khi CẢ hai đều rơi trúng
đúng một overlay có id trong `LAYER_IDS` (mathOverlay/asideOverlay). Kiểm trong trình duyệt:
kéo content→nền GIỮ MỞ; bấm+nhả trên nền ĐÓNG; nút × ĐÓNG; bôi đen chữ trong hộp GIỮ MỞ.

**Cố ý KHÔNG sửa `roadmap.html`:** nó là sản phẩm sinh ra và drawer của nó đóng bằng nút
`#drClose` + Esc, không có bấm-nền-đóng nên không dính bug. `build-roadmap` không trích
handler modal của trang chính, nên `gate --write` để `roadmap.html` "không đổi" là đúng.
(Ba chỗ file này có chuỗi ".wb-overlay" là **văn bản bài học** đang giảng đúng hiện tượng
này, không phải code.)

Cùng lỗi còn ở 5 nơi khác trong repo (web-builder/app.js, facts/app.js, 3 trang bếp) — đã
sửa và commit riêng, ngoài project này.

---

## Phiên 2026-08-09 (p) — thực thi bản audit (n9): 12 điểm kiến thức, 8 hình thật, cổng `G-ABS`, mạch chính cho roadmap

Yêu cầu: *"làm hết đi"* (toàn bộ khuyến nghị của audit n9), cộng một yêu cầu về chính file
này: *"mấy cái đã làm thì bỏ trong handoff hoặc mark là đã làm — không phải tư tưởng hay
quyết định xuyên suốt thì nên xoá, tuỳ bạn quyết định"*. Đã xoá — xem mục cuối.

### 1. Mười hai điểm kiến thức P0/P1 (audit §1) — xong cả 12

| bài | sửa gì |
|---|---|
| `s-how` | bỏ "48 giờ sau còn ~10%". Không có tỉ lệ quên phổ quát; giữ lại **chiều** (truy xuất chủ động > đọc lại) và nói rõ mức rơi tuỳ vật liệu/cách đo. Sửa ở cả trang chủ lẫn thân bài |
| `d-eda` · `d-split` · `d-clean` | **dời `d-eda` lên TRƯỚC `d-split`** — hai bài đã tự viết theo trình tự "EDA Thì 1 → chia tập → EDA Thì 2" trong khi `TREE` xếp ngược lại. Thêm vào `d-clean` bảng **hai loại làm sạch** (A sửa tuyệt đối, chạy trước khi chia · B học tham số, fit trên train) và một cảnh báo: **bỏ trùng sau khi chia là một đường rò rỉ** |
| `m-prob` | **tách probability khỏi calibration.** `m-prob` giữ khái niệm + thêm hẳn phần **tỉ lệ nền** (thiếu trước đó, mà nó là cái làm PR-AUC đọc được); toàn bộ `calibration_curve` / `CalibratedClassifierCV` chuyển sang `ml-metrics`, ngay cạnh phần quy ngưỡng ra tiền |
| `m-infer` · `th-stats` | quy tắc **"bốc lại đơn vị độc lập"** đưa lên mạch chính ở lần đầu dạy bootstrap (trước đó chỉ nằm trong popup `ci`), và code mẫu ở `th-stats` đổi sang **cluster bootstrap theo `card_id`** |
| `f-numeric` | "scaling bắt buộc" → **ba mức**: đổi hẳn kết quả (KNN/k-means/SVM-RBF/PCA) · không đổi dự đoán nhưng hỏng regularization + hội tụ + diễn giải (tuyến tính/logistic/NN) · không cần (cây) |
| `f-what` · `f-pipeline` | Pipeline chặn **một nửa** lệch train–serve (phần đã học tham số), không chặn feature cần lịch sử. Nêu ba cách cho nửa còn lại: hàm dùng chung → point-in-time join → feature store |
| `dl-nn` | "sigmoid/softmax chỉ ở lớp đầu ra" → đúng **trong mạng xuôi của bài này**; sigmoid là cổng LSTM/GRU, softmax nằm trong attention. Quy tắc đúng là "hàm này ép đầu ra về dạng gì" |
| `q-causal` | randomization cân bằng **theo kỳ vọng**, cho **ước lượng** chứ không phải bảo đảm. Thêm ba giả định: may rủi khi chia nhóm, SUTVA/không lây, và phân tích theo ý định điều trị |
| `pr-monitor` | bỏ "cách giảm thiểu chuẩn là cho lọt 0,5–1%". Đổi thành exploration có governance: **năm câu phải trả lời trước**, tỉ lệ là câu cuối; và nêu phương án rẻ hơn (xác minh thủ công một mẫu) là cách trình bày an toàn cho luận văn |
| `th-repro` | bỏ "1–2% bình thường / 10% là sai". Mốc đúng là **độ bất định của chính bài gốc**, hoặc dao động seed khi chạy lại mã nguồn của họ; kèm thứ tự truy nguyên khi lệch |
| `ml-metrics` · `pr-code` · `pr-eval` | "trần lý thuyết 0,05–0,07" → **mốc oracle đo bằng thực nghiệm** (trần của AP luôn là 1). Thêm code tái lập mốc và yêu cầu công bố seed / số lần chạy / khoảng |
| `pr-arch` · `pr-eval` · `pr-serve` | 0,90 / 0,40 trong sơ đồ kiến trúc được gắn nhãn **số minh hoạ**, kèm câu chốt "một nguồn sự thật duy nhất cho ngưỡng: artifact của mô hình". Nhãn tương tự cho ngưỡng trong viz SHAP |

Hàng thứ 13 (`s-plan8w`) đã xong ở phiên (o).

### 2. Hạ giọng / gắn nhãn heuristic (audit §2)

`m-vector` ("mọi ML là hình học" → "rất nhiều thuật toán nhìn được qua lăng kính hình học") ·
`m-prob` (cây **không giả định phân phối tham số**, nhưng vẫn giả định i.i.d./nhãn/mẫu đại
diện) · `ml-linear` (**năm** điều kiện để so độ lớn hệ số, và mô hình logistic song song
*không* giải thích quyết định của LightGBM) · `ml-cv` (std giữa fold là thống kê mô tả —
không phải khoảng tin cậy, không phải "độ ổn định") · `ml-imb` ("xác suất vô nghĩa" → "đổi
tỉ lệ nền, mất hiệu chỉnh") · `dl-cnn-rnn` (RNN bị thay gần hết **trong NLP**, CNN vẫn cạnh
tranh trong thị giác) · `th-design` (ablation cho **đóng góp biên trong một setup**, không
phải bằng chứng nhân quả) · `th-write`/`th-tools` (số trang, khổ hình là **mẫu**; DPI không
làm hình vector nét hơn) · `t-colab` (thời gian chạy là bậc độ lớn, không phải cam kết) ·
`q-nlp` (**BLEU là của dịch máy**, đừng dùng cho tóm tắt; mốc ~2.000 nhãn là điểm khởi đầu) ·
`d-eda` (mốc tương quan 0,9) · `d-clean` (mốc thiếu 60%) · `ml-tune`/`ml-map` (1–3%) ·
`q-multi` (~50 mẫu/lớp).

### 3. Năm nhóm forward reference (audit §3) — đóng hết, `G-FWD` về 0

Theo đúng khuyến nghị "micro-definition tại lần dùng đầu, **không** kéo cả bài lên trước":
`f-what` và `f-cyclic` được thêm một câu chú tại chỗ cho PR-AUC; `ml-cv` chú một câu cho
bootstrap; `dl-nn` định nghĩa vai trò của attention ngay chỗ nhắc tên. Các bài còn lại chỉ
nêu tên trong bảng tra hoặc trong lịch học → vào `allowEarly` **kèm lý do từng bài**.
`concepts.json` cũng sửa một mục sai sau khi nội dung dời: `calibration.definedIn` đổi từ
`m-prob` sang `ml-metrics`.

### 4. Tám hình P0 (audit §5) — tất cả là hình thật, tương tác được

`meanmed` (m-prob: kéo đuôi, xem trung bình rời trung vị) · `broadcast` (t-numpy: ba cặp
shape, ô mờ = ô NumPy tự nhân bản, kèm ca hỏng) · `fittransform` (t-sklearn: fit trên train
vs fit trên tất cả — cùng một giao dịch 900 ở valid, z tụt hẳn) · `edapanel` (d-eda: bốn ô,
mỗi ô **một câu hỏi khác**) · `nnforward` (dl-nn: shape từng tầng, kéo batch thì shape đổi mà
số tham số không) · `losscurve` (dl-train: bốn hình dạng đường loss + chỗ early stopping
dừng) · `residual` (q-regress: ba tình huống phần dư + độ phủ thực tế của khoảng) · `confmat`
(q-multi: ma trận 5 lớp, đổi giữa số đếm / chuẩn hoá hàng / chuẩn hoá cột — macro-F1 0,54 vs
micro-F1 0,97 trên **cùng** một ma trận). Thêm `calib` (đã có sẵn) vào phần hiệu chỉnh mới
của `ml-metrics`.

Đã kiểm trên trình duyệt: cả 9 mount đúng bài, mọi nút/thanh trượt chạy không lỗi, không
`getBBox` nào vượt viewBox, không cuộn ngang ở 375px, và cả hai chế độ sáng/tối. **Một lỗi
thật bắt được lúc kiểm**: `confmat` dùng `fill="var(--wb-bw)"` cho chữ trên ô đậm — `--wb-bw`
là **bề rộng viền (1px)**, không phải màu, nên chữ rơi về màu mặc định. Đổi sang
`var(--wb-surface)`.

### 5. `G-ABS` — cổng cho ngưỡng viết như quy luật (audit §7 mục 6)

Audit đề nghị "một content lint riêng cho absolute words". **Bản rộng đã thử và bị bác bằng
số đo**: quét `luôn` / `duy nhất` / `bảo đảm` / `không bao giờ` cho **22** kết quả, gần hết là
dương tính giả — câu phủ định ("GPU **không được** bảo đảm"), câu trích tài liệu nhà cung cấp,
và cả đoạn đang *sửa* một tuyên bố tuyệt đối (đoạn giải thích "trần lý thuyết của AP là 1" bị
chính nó bắt). Một khuyến nghị sai nhiều hơn đúng thì kéo cả danh sách xuống, nên bản giữ lại
chỉ bắt **một hình dạng câu**: ngưỡng `%` + mệnh lệnh, không có từ hạ giọng ở gần. Ở trạng
thái hiện tại nó **im hoàn toàn**, và ca test dựng lại đúng câu đã có thật trên trang
(`cột thiếu > 60% → bỏ cột`).

Ca test đó còn lộ ra một lỗi trong chính cổng: HTML viết dấu so sánh bằng thực thể (`&gt;`),
mà bước làm sạch xoá thực thể *trước* khi so khớp — tức cổng mù đúng thứ nó đi tìm. Đã đổi
`&gt;`/`&lt;` thành ký tự thật trước khi lọc.

### 6. `G-HOOK` báo sai — đã sửa cách kiểm

Cổng báo "2/3 lớp tự động chưa cài" trong khi cả hai hook git **vẫn chạy**. Nguyên nhân: repo
này dùng **bộ điều phối** ở `.git/hooks/` (do `facts/tools/install-hooks.sh` sinh) — nó quét
mọi `tools/hooks/<tên>` trong repo rồi gọi từng cái, nên không chứa chuỗi
`data-science-roadmap` mà cách kiểm cũ đi tìm. Đây là loại false negative tệ nhất: nó đẩy
người ta đi cài lại và sinh hook chạy hai lần. `hookOk()` giờ nhận cả ba cách cài.

### 7. Roadmap: mạch chính là mặc định (audit §4 gạch 1)

`roadmap.html` mở ra giờ hiện **65 bước core** (88,5 h) thay vì cả 84; nút ở hero mở lại đủ
84 (106,5 h). Số bước từng chặng, hai con số ở hero và chân trang đều đổi theo — hiện 65 mà
vẫn khoe 84 là đúng kiểu lệch làm người đọc mất tin. Ẩn bằng CSS (`body.rm-core`) chứ không
xoá node, nên bật lại là tức thì. Hero cũng bỏ lời hứa "grasp its core idea **in seconds**"
(audit đo được 25.770 từ — "vài giây" là hứa quá).

### Cố ý KHÔNG làm — và vì sao

- **Không bỏ link "Mở bài đầy đủ →" và link navbar về trang DS** (audit §4 gạch 5). Bỏ link
  *trước khi* có chiều sâu chỉ làm trang tệ đi: người đọc mất đường thoát sang nội dung thật
  mà không được bù lại gì. Việc này chỉ đúng khi làm **cùng lượt** với bốn vật mỗi node ở
  gạch dưới. Đã ghi vào `## CHƯA LÀM` như một đơn vị công việc, không tách.
- **Không viết bốn vật cho từng node** (mental model → visual → worked example → self-check,
  audit §4 gạch 2–4). Đó là ~65 ví dụ có số + ~65 câu tự kiểm có đáp án, mỗi cái phải đúng và
  phải khớp bài gốc. Viết ẩu để "cho đủ gạch" thì tệ hơn không viết: nó biến trang thành một
  bộ bài tập sai. Đây là việc của một phiên riêng, có phạm vi riêng.
- **Không làm 8 hình P1** (audit §5). Audit tự nói thứ tự: *"làm 8 visual P0 trước, đo
  comprehension/usability; chỉ sau đó mới làm P1"*. Làm cả 16 một lượt là bỏ qua bước đo.
- **Không đổi 11 chặng** — audit §3 nói rõ "chưa có lý do đủ mạnh để đảo toàn bộ curriculum",
  chỉ sửa ba đường nối, và cả ba đã sửa.
- **Không thêm `git fetch` vào `session.mjs`** (nợ từ phiên (o)). Vẫn là việc đáng làm, nhưng
  nó chạm quy trình phiên chứ không chạm nội dung, và phiên này đã đủ rộng.

---

## Phiên 2026-08-09 (o) — cổng cho trang thứ hai: vân tay nội dung của từng bản tóm tắt

Yêu cầu: *"commit gần nhất đã nêu các vấn đề chưa hoàn thiện — rà soát tính đúng sai rồi
làm"*. Phiên này mở trên một nền **cũ** (local đứng ở `1a75135`, remote đã đi tới `2ce5148`),
nên phần đầu là bài học chứ không phải kết quả.

### Bài học quy trình — `session.mjs` không kiểm remote

`node tools/session.mjs` báo "✓ thư mục sạch — bạn bắt đầu từ nền commit", và điều đó ĐÚNG
với working tree nhưng **không nói gì về `origin`**. Local lúc đó thiếu ~20 commit (n3–n9).
Hậu quả: hai việc đã làm xong và commit tại chỗ hoá ra **trùng với việc upstream đã làm rồi**,
và làm tốt hơn:

- `th-defense` T−3/T−2/T−1 → `wb-steps`, xoá `.ds-day`: upstream làm ngày 2026-08-05, cùng
  cách đếm ngược 3→2→1 (vòng tròn 30px không chứa nổi ba ký tự `T−3`).
- "zoo optimizer" của `ml-loss` → popup: upstream làm bằng popup `optzoo`, câu dẫn ở mạch
  chính sắc hơn bản của tôi ("bạn **không phải chọn** — gõ AdamW rồi đi tiếp").
- drawer `roadmap.html` kéo được 1/4–1/2: upstream làm bằng cách **TRÍCH `makeEdgeResizer()`
  nguyên văn** từ trang chính, còn tôi chép tay một bản thứ hai. Trích đúng hơn theo §2 luật 3.

Hai commit đó đã bị **bỏ** (còn giữ ở nhánh `wip-o-gates` nếu cần đối chiếu), và phiên này
chỉ giữ lại phần upstream chưa có. **Việc cần làm cho phiên sau: `git fetch` trước khi sửa,
hoặc thêm bước đó vào `session.mjs`.**

### Đã làm — hai cổng cho trang thứ hai

`roadmap.html` + `build-roadmap.mjs` + `roadmap-summaries.json` tồn tại từ phiên (n2) mà
`CLAUDE.md` §2 không nhắc tới cái nào và **không cổng nào canh**. Audit (n9) §4 mục 4 đã gọi
tên đúng lỗ này: *"Summary không có checksum/source hash nên có drift thật (`s-plan8w`)"*, và
definition-of-done của audit yêu cầu *"gate kiểm sourceHash/version của mọi summary"*. Đã làm:

- **`G-ROADMAP`** (nhắc, **CHẶN với `--ci`**) — `roadmap.html` phải bằng bản sinh lại từ
  nguồn. Cùng hai-mức với cặp `G-TOC-STRUCT`/`G-TOC-STALE`. Cổng này đáng giá hơn ở nền hiện
  tại vì bộ sinh **trích** CSS/JS từ trang chính: sửa trang chính là bản đã sinh thành cũ.
- **`G-ROADMAP-SUM`** (luôn chỉ nhắc) — mỗi bài một **vân tay nội dung** trong
  `roadmap-summaries.json`, đóng dấu bằng `node tools/build-roadmap.mjs --stamp`. Cổng gọi tên
  bài đã đổi *sau khi* bản tóm tắt được viết. Máy không biết tóm tắt đúng hay sai; nó chỉ biết
  bài đã đổi — nên cổng chỉ nhắc, và việc đọc lại là của người.
- `gate.mjs --write` giờ sinh **cả hai** sản phẩm (hook sau-mỗi-Edit tự làm mới `roadmap.html`
  y như đang làm với `TOC.md`); `pre-commit` chặn việc quên `git add roadmap.html`.
- `build-roadmap.mjs` giữ nguyên dạng script, chỉ **rào phần ghi file** vào nhánh chạy-từ-CLI
  và `export { html, OUT, sums, srcHash, nodeHash }` — import không ghi gì, không in gì.
  `gate.mjs` import **động trong `try`**: bộ sinh cố ý ném khi không trích được CSS/JS từ
  trang chính, và một stack trace làm chết cả bộ cổng thì tệ hơn một câu nói rõ chuyện gì.
- **Đã sửa drift thật trước khi lấy mốc**: tóm tắt `s-plan8w` còn ghi *"deep learning ở TUẦN
  5"* trong khi trang đã đổi sang *tuần 6* (từ phiên m2). Sửa xong mới `--stamp`, vì đóng dấu
  đè lên một bản tóm tắt sai chính là biến cổng thành con dấu cao su.
- Tài liệu: `CLAUDE.md` §0a (một dòng "sửa trang Roadmap học nhanh"), §2 (sơ đồ + luật 2/3),
  §3 (lệnh), §4 (hai cổng mới → 10 chặn · 13 nhắc). `gate.test.mjs` +2 ca nổ (55 đạt / 0 trượt).

### Cố ý KHÔNG làm

- **Không đụng phần "Roadmap độc lập"** mà audit (n9) §4 mô tả (bỏ link về trang DS, chỉ giữ
  core spine, mỗi node bốn vật, capstone). Đó là một quyết định giáo trình lớn, chủ trang phải
  chốt. Cổng vân tay chỉ là **một** trong bảy gạch đầu dòng của definition-of-done đó.
- **Không sinh lại 84 bản tóm tắt.** Mốc vân tay lấy ở trạng thái hiện tại; từ nay bài nào đổi
  thì cổng gọi tên bài đó, nên không cần chạy lại cả workflow để biết chỗ nào lệch.
- **Không đụng 5 khuyến nghị `G-FWD`** — audit (n9) đã đề xuất micro-definition, và đó là việc
  nội dung của một phiên khác.
- **Không tự đóng dấu trong lượt build thường.** `--stamp` phải là một hành động có ý thức;
  build tự đóng dấu thì cổng không bao giờ phát hiện được drift nữa.

## Phiên 2026-08-07 (n9) — audit kiến thức, thứ tự, khả năng tự học và visualization

Phiên đó chỉ **thẩm định**, không sửa dòng nào. Toàn bộ khuyến nghị của nó (§1 12 điểm kiến
thức, §2 danh sách hạ giọng, §3 ba đường nối + 5 nhóm forward reference, §5 tám hình P0, §7
mục 6 content lint) **đã được thực thi ở phiên (p)** — bảng chi tiết từng chỗ sửa nằm ở mục
đó, nên không lặp lại ở đây. Phần còn nợ nằm ở `## CHƯA LÀM`.

Giữ lại ba thứ dưới đây vì chúng là **quyết định và nguyên tắc**, không phải danh sách việc.

### Hợp đồng "Roadmap độc lập" — target đã chốt với chủ trang

Roadmap là một bản giáo trình ngắn hơn chạy song song với trang DS, nhưng **reader-facing
phải hoàn toàn tự chứa**: không cần mở, không cần biết tới, không được nhắc sang trang DS.
Việc build nội bộ vẫn được lấy trang DS làm nguồn để chống drift — đó là chi tiết triển khai,
không phải mối quan hệ lộ ra cho người đọc.

Definition of done (còn 4/7 gạch, xem `## CHƯA LÀM`):

- mặc định chỉ hiện **core spine** — *xong (p)*;
- gate kiểm `sourceHash` của mọi summary — *xong (o)*;
- hero không hứa quá mức so với 25.770 từ thật — *xong (p)*;
- mỗi core node có đúng bốn vật: *mental model một câu → một visual phù hợp → một worked
  example hoặc snippet chạy được → một self-check có đáp án*;
- coding node có code tối thiểu chạy được; conceptual node có ví dụ số nhỏ thay vì thêm chữ;
- sau core spine, reader tự làm được một capstone nhỏ (frame target → chia tập không leak →
  baseline → chọn metric → pipeline → đánh giá có uncertainty/cost → đóng gói → mô tả monitor);
- không còn link/copy "bài đầy đủ", không cần progress hay context của trang DS.

**Chừng nào bốn gạch cuối chưa xong, cách gọi trung thực là *visual syllabus / companion*,
không phải standalone basic course.**

### Những điểm đang làm tốt — bảo toàn khi sửa

- Một project fraud xuyên suốt giúp concrete → abstract; phần lớn bài có đầu ra cầm được.
- Đặt leakage/split trước modeling, product/reproducibility trước DL, transfer trước thesis
  là lựa chọn curriculum tốt.
- Phân biệt fast/full, `SCOPE` thật, misconception và giới hạn ví von nhìn chung trung thực.
- Nội dung về Average Precision (không nội suy hình thang), cross-fitting của TargetEncoder,
  calibration trên dữ liệu độc lập/CV, và cluster/block bootstrap ở `pr-eval` là đúng hướng.
- Các visual đang tốt dùng để **ra quyết định hoặc giải thích quan hệ**, không trang trí —
  đây là tiêu chuẩn cho mọi visual mới.

### Nguồn đối chiếu chính

- Memory/forgetting: [OpenStax Psychology 2e — Problems with Memory](https://openstax.org/books/psychology-2e/pages/8-3-problems-with-memory)
- Average Precision: [scikit-learn `average_precision_score`](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.average_precision_score.html)
- Time-series split: [scikit-learn `TimeSeriesSplit`](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html)
- Calibration: [scikit-learn — Probability calibration](https://scikit-learn.org/stable/modules/calibration.html)
- Target encoding cross-fitting: [scikit-learn example](https://scikit-learn.org/stable/auto_examples/preprocessing/plot_target_encoder_cross_val.html)
- Cluster bootstrap: [PMC — cluster bootstrap methods](https://pmc.ncbi.nlm.nih.gov/articles/PMC7148287/)
- SHAP contract: [TreeExplainer documentation](https://shap.readthedocs.io/en/latest/generated/shap.TreeExplainer.html)
- Colab limits: [Google Colab FAQ](https://research.google.com/colaboratory/faq.html)
- GitHub Actions included usage: [GitHub billing reference](https://docs.github.com/en/billing/reference/product-usage-included)
- Prophet trạng thái hiện tại: [official `facebook/prophet` repository](https://github.com/facebook/prophet)
- Roadmap ngoài repo là nguồn biến động: [AI/Data Scientist PDF](https://roadmap.sh/pdfs/roadmaps/ai-data-scientist.pdf), [Machine Learning](https://roadmap.sh/machine-learning), [MLOps](https://roadmap.sh/mlops), [AI Engineer](https://roadmap.sh/ai-engineer)

### Một điều audit tự nói và vẫn đúng

Các con số benchmark của bộ mô phỏng fraud **chưa được verify thực nghiệm độc lập** — cần
script/artifact/seed/environment tái tạo được mới gọi là verified. Audit đó là audit học
thuật + cấu trúc + render, không chạy lại notebook.

---

## Phiên 2026-08-06 (n8) — rà nợ handoff (còn 1 việc, là dọn chính handoff) · pháo giấy dài gấp đôi thưa một nửa · ngăn roadmap thành tầng KHÔNG phủ

Ba việc, chủ trang nêu lần lượt trong phiên: (1) *"rà soát hand-off xem còn gì chưa làm
không"*; (2) *"hiệu ứng pháo giấy quá ngắn, tôi muốn kéo dài height ra, và cho mật độ pháo
giấy thưa hơn 50% hiện tại"*; (3) *"ở màn road map tôi muốn khi drawer xuất hiện thì phần
content danh sách bài học phải được căn giữa, và bỏ dismissable layer đi"*.

### 1. Rà nợ: không còn việc kỹ thuật nào — nhưng mục `## CHƯA LÀM` đã mục từ (n5)

Soát toàn bộ mục `Còn nợ của riêng phiên này` của (e)(f)(h)(j)(k)(n7) + mục `## CHƯA LÀM`,
đối chiếu với việc thật của (n4)→(n7). Trạng thái nền: cổng CHẶN xanh · **5** khuyến nghị
`G-FWD` · `waivers.json` **rỗng** · `audit` nhất quán · không có mục `## ĐANG LÀM`.

**Việc duy nhất còn thật là dọn chính handoff.** `session.mjs` in tiêu đề các mục `###` dưới
`## CHƯA LÀM` mỗi lần mở phiên, nên 6 gạch đầu dòng đã cũ được in ra suốt **bốn phiên**:

| gạch đầu dòng của `Còn nợ thật` | thực tế |
|---|---|
| "Ngày **9** fast track đúng 3,5 giờ" | số đã sai từ (n4) — nay là **ngày 6** |
| "**6** khuyến nghị `G-FWD`" | nay **5**; quyết định "để nguyên" không đổi |
| Rà thời lượng từng bài (`pr-code`, bài DL, `s-intro`) | **xong**: (m) spot-check `pr-code` 150′/`dl-attn` 120′/`s-intro` 40′; (n5) đo cả 84 bài, chỉ `s-how` sai thật |
| `th-defense` → `wb-steps` | **xong ở (n5)** |
| `ml-loss` zoo optimizer → popup | **xong ở (n5)** (popup `optzoo`) |
| `dl-train` bảng gỡ lỗi → popup | **đã bác ở (n5)** — bảng đó *là* deliverable của bài |

Đã viết lại mục đó thành ba mục có tiêu đề tự nói đúng việc — *đang chờ chủ trang gọi* (còn
đúng một: nhãn Foundation/Applied/Advanced) · *đã quyết là giữ nguyên* · *hai thứ để biết
trước, không phải việc* — và thêm luật ngay đầu mục: **xong thì xoá khỏi đây**, đừng để lại
kèm chữ "đã xử". Đó là lỗi đã sinh ra bốn phiên nhiễu.

### 2. Pháo giấy: 3,7s → 7,2s, và hoá ra nó đang là MỘT CỤC

Đo trước khi sửa (mô phỏng node, đồng hồ giả 1000/60 mỗi khung, 1280×720) thì lộ ra một
chuyện chủ trang không nói nhưng là gốc của cảm giác "ngắn": lúc dày nhất, cả 140 mảnh chỉ
trải **179px trong 720px** chiều cao màn. Nó không phải mưa giấy, nó là một tấm giấy rơi
qua — nên vừa đặc vừa hết nhanh.

| | mảnh đầu | đỉnh trên màn | trải dọc lúc đỉnh | nửa đỉnh tới | canvas tắt |
|---|---|---|---|---|---|
| trước | 33 ms | **140 mảnh** (1,37s) | **179 / 720px** | 3,27s | 3,73s |
| sau | **0 ms** (khung 1) | **46 mảnh** (3,03s) | **720 / 720px** | 5,23s | **7,18s** |

Ba dial, mỗi cái một câu — và đây là phần đáng giữ lại của phiên:

- `COUNT` 140 → **70** (thưa 50% như yêu cầu)
- `SPAWN_WINDOW` 500 → **3000 ms**, `SPAWN_PEAK` 80 → 200, `BAND` 0,12 → **2** lần chiều
  cao màn với **luỹ thừa 3** (đa số mảnh vẫn sát mép trên, một ít lên cao tạo đuôi)
- `INSTANT` = 3 mảnh có `spawn = 0`, `y` sát mép trên

**`INSTANT` là chỗ phiên này bắt được một quả mìn của (n7).** 33 ms của (n7) là **ăn may**:
nó đến từ chuyện có 140 mảnh nên bốc trúng một mảnh vừa sinh sớm vừa nằm sát mép. Chỉ giảm
`COUNT` xuống 70 thôi (chưa đụng gì khác) là độ trễ tự bật về **250 ms**, và dùng dải sinh
phẳng cao 1,2 màn thì lên **517 ms** — tức là làm đúng yêu cầu "thưa hơn" sẽ âm thầm phá
đúng yêu cầu của phiên trước. Nay bảo đảm mảnh đầu **không phụ thuộc `COUNT`** nữa.

`VMAX` = 7,6 px/khung × dpr là **hệ quả bắt buộc của `BAND`**, không phải một lựa chọn: mảnh
sinh ở −2 màn rơi tự do hai màn trước khi vào khung, không chặn thì nó lao qua nhanh gấp ba
mảnh sinh sát mép — một hiệu ứng hai tốc độ. Con số đó đúng bằng vận tốc mảnh sinh sát mép
đạt được lúc tới đáy ở bản trước, nên **tốc độ rơi nhìn thấy không đổi**: `vy` và `g` vẫn
nguyên giá trị đã giảm 75% theo yêu cầu chủ trang. Luật đầy đủ: `docs/design.md` §9.

Verify: đo lại **trên trình duyệt thật** (không chỉ mô phỏng) bằng cách bơm khung của §8 —
mảnh đầu 0 ms, đỉnh 3,03s, canvas tắt 7,18s, trải 86% chiều cao màn, khớp mô phỏng trong
16 ms. Ở 375px: `scrollWidth == clientWidth == 375`, `scrollLeft` tối đa 0,
`pointer-events: none`. Cổng CHẶN xanh, vẫn đúng 5 khuyến nghị `G-FWD` cũ.

Chạm vào: `(khung: script + docs/design.md §9 + HANDOFF.md)`

### 3. Ngăn roadmap: bỏ lớp phủ, và thân trang NHƯỜNG CHỖ để danh sách tự căn giữa

Sửa ở `tools/build-roadmap.mjs` rồi chạy lại nó — `roadmap.html` là file sinh.

**Căn giữa không cần tính toạ độ.** `.rm-main` vốn đã `max-width: 920px; margin: 0 auto`, nên
chỉ cần thu hẹp hộp chứa là nó tự căn giữa lại: `html.rm-open body { padding-right:
var(--rm-drawer-w) }`. Một rule, không biến mới, và **đúng cả khi người dùng kéo bề rộng
ngăn** vì nó đọc chính token đó (đo được `lệch = 0px` ở 1/3 mặc định 427px *và* lúc kéo tới
trần 640px). Đặt trên `<body>` chứ không trên `.rm-main`: navbar `wb-navbar--sticky` cũng phải
ngắn lại, không thì nút theme nằm dưới ngăn.

**Bỏ lớp phủ kéo theo ba thứ nữa, không phải một.** Xoá `.rm-overlay` (div + CSS + listener
`click` đóng ngăn) thì ngăn không còn là modal, nên phải bỏ luôn `aria-modal="true"` → `false`
và bỏ `documentElement.style.overflow = 'hidden'`. Giữ khoá cuộn lại là một trạng thái nửa
vời: nhường chỗ cho người ta đọc danh sách rồi lại không cho cuộn danh sách. Ngăn giờ theo
đúng luật của dock `Notes` ở trang chính (tầng KHÔNG phủ, §0.5) — đóng bằng ✕ hoặc Esc.

Ở `≤680px` ngăn rộng `100vw` nên **phải huỷ đúng rule nhường chỗ** (`padding-right: 0`);
nhường 100vw là đẩy cả danh sách ra khỏi màn hình. Đã kiểm ở 375px: ngăn 375px,
`padding-right: 0px`, tay kéo vẫn ẩn, `scrollWidth == clientWidth == 375`.

**Trang chính KHÔNG đổi theo.** Ở đó nhánh phụ là thứ đọc song song *với một bài đang đọc*,
nên lớp phủ + khoá cuộn (§1.2) vẫn đúng; ở roadmap thì danh sách 84 bước phía sau chính là
thứ người ta đang duyệt. Luật của cả hai nằm cạnh nhau ở `docs/design.md` §1.2.

Verify ở 1280×720/1280×800: lệch **0px** ở hai bề rộng ngăn · mép phải navbar == mép trái
ngăn (842/842, rồi 629/629) · **bấm ra ngoài ngăn không đóng** · Esc đóng · cuộn được khi ngăn
mở (`scrollY` lên 500) · không còn node nào khớp `.rm-overlay, #overlay` · 375px như trên.
Ba chuỗi "overlay" còn lại trong `roadmap.html` là **chú thích của `makeEdgeResizer()` trích
từ trang chính** (kể về `.wb-overlay` của trang chính), không phải code sống.

Chạm vào: `(tools/build-roadmap.mjs + roadmap.html sinh lại + docs/design.md §1.2, §8)`

### 4. Hai trang dùng CHUNG đầu ngăn của kit, và nền ngăn = nền trang

Chủ trang, sau khi xem bản vừa push: *"drawer ở roadmap có nav khác drawer ở bên page DS quá
ví dụ như button x không giống, nói chung là dùng lại drawer nav của trang DS ấy"*, rồi
*"background của drawer bên trang DS cho màu giống màu nền chính đi, hiện tại đang thấy màu
trắng tinh"*.

**Đầu ngăn: bỏ ba class tự vẽ, dùng component của kit.** `.rm-drawer__bar/__phase/__close`
(một ký tự `✕` thô trong hộp 32px có viền) → `wb-drawer__head` + `__title` + `__sub` +
`wb-close`, và `<aside>` nay là `class="wb-drawer rm-drawer"` — đúng khuôn
`"wb-drawer ds-drawer"` của trang chính. `.rm-drawer` giờ **chỉ còn ba dòng ghi đè** (bề rộng
token kéo được · `[hidden]` · chỗ thở ở đáy) thay vì khai lại vị trí/nền/viền/bóng/transform.
Khai lại là chỗ hai trang trôi khỏi nhau — lần này lệch đúng ở nút mắt nhìn vào đầu tiên.

**Tên bài lên `wb-drawer__title`, chặng xuống `wb-drawer__sub`**, và `.rm-dh` h2 trong thân bị
bỏ (nó lặp lại chính tên bài). Hai cái được thêm: `aria-labelledby="drTitle"` của thẻ `aside`
**vốn đã trỏ vào một id chưa từng tồn tại** — lỗi có sẵn, nay đóng lại; và tên bài không cuộn
đi mất vì đầu ngăn là `flex: none`.

**Nền ngăn = `--wb-canvas`, không phải `--wb-surface`.** Khai ở `.ds-drawer` (trang chính) và
`.rm-drawer`, mỗi chỗ kèm câu "đổi bên này thì đổi cả bên kia". Không trích dùng chung được:
`pickCss` sẽ mang theo cả `width: var(--ds-aside-w)` của trang chính, đánh nhau với
`--rm-drawer-w` ở cùng độ đặc hiệu — nhập một dòng mà kéo theo một lỗi.

**Một lỗi có sẵn bắt được nhờ việc này: `[hidden]` không ẩn được `.wb-drawer` đứng một mình.**
Kit khai `.wb-drawer { display: flex }`, rule của author thắng `[hidden] { display: none }` của
UA ở cùng độ đặc hiệu — nên ngăn "đóng" vẫn trong luồng `Tab` và vẫn trả `rect` thật (chính là
`width: 1px` mà phép đo ở mục 3 trả về khi ngăn đóng, tôi đã cho là chuyện của pane). Trang
chính không lộ vì ngăn của nó nằm trong `.wb-overlay` (`display: none`). Đã thêm
`.rm-drawer[hidden] { display: none }`.

Verify (đo ở **sáng**, chế độ chủ trang báo lỗi): nền ngăn `rgb(247,247,248)` == nền trang ở
**cả hai** trang. Đầu ngăn khớp từng số: `padding 16px 18px` · viền dưới `1px rgb(228,228,231)`
· title `16px/700` · sub `13px rgb(113,113,122)` · `wb-close` `26×26`, `radius 7px`,
`rgb(113,113,122)`, glyph **U+E5CD** trong `Material Symbols Rounded` (kiểm bằng
`getComputedStyle(el,'::before')`, không chỉ bằng mắt — CSSOM in ra chuỗi rỗng vì đó là ký tự
vùng dùng riêng, đừng vội kết luận là thiếu glyph). `[hidden]` nay trả `display: none`. Không
còn `.rm-dh` trong thân. Cổng CHẶN xanh.

Chạm vào: `(data-science-roadmap.html + tools/build-roadmap.mjs + roadmap.html sinh lại + docs/design.md §1.2)`

### 5. Đầu ngăn không có dòng phụ thì cao đúng bằng navbar

Chủ trang: *"nếu navbar của drawer ở cả màn roadmap và DS đều không có description dưới header
thì để chiều cao tương đương chiều cao nav của page main thôi"*, và khi được hỏi rõ thì chốt:
*"dòng sub hiện tại như thế nào giữ nguyên, những nav trong drawer không có dòng sub => height
phải bằng nav bar tổng"*.

**Hỏi trước khi làm là đúng ở chỗ này.** Đo ra: đầu ngăn **81px** vs navbar **56px**, và 25px
chênh **đúng bằng dòng phụ** — nên "cho bằng navbar" chỉ có thể đạt bằng cách bỏ dòng phụ. Mà
dòng phụ của trang chính là **chữ tác giả viết cho từng ngăn** (28 ngăn, lấy từ `data-sub`), xoá
là xoá thật. Ba phương án đã đưa cho chủ trang chọn; chốt: **giữ dòng phụ, chỉ ràng chiều cao
cho đầu ngăn KHÔNG có dòng phụ.**

Ba chi tiết của rule, thiếu cái nào là hụt:
1. neo vào token **`--wb-navbar-h`** của kit, không viết `56px` — navbar đổi thì hai trang theo;
2. kể **cả hai dạng** "không có": thiếu hẳn thẻ (`:not(:has(…__sub))`) **và** có thẻ mà chữ rỗng
   (`:has(…__sub:empty)`) — `#asideSub` luôn tồn tại trong markup, chỉ nội dung mới rỗng;
3. ghi đè `align-self` cho `.wb-close`: kit cố ý cho ✕ dính lề trên, ở thanh cao bằng navbar thì
   nó phải nằm giữa. Không có dòng này thì cao đúng mà ✕ lệch lên.

Khai **một bản** ở trang chính, roadmap **trích** bằng `headCss()` — `pickCss` ném lỗi nếu không
trích được gì, nên xoá rule ở trang chính thì build đổ ngay chứ không âm thầm mất luật.

**Nói thẳng: hôm nay rule này chưa đổi gì trên màn hình.** Cả ba đầu ngăn đều có dòng phụ (ngăn
phụ trang chính luôn có câu mặc định vì `tpl?.dataset.sub || '…'`, dock `Notes` có câu tĩnh, ngăn
roadmap có tên chặng). Nên nó là luật cho ngăn sau, và đã được kiểm bằng **ca thật** chứ không
bằng suy luận — trên **cả hai trang**: xoá chữ trong dòng phụ → **56px** (== navbar) và ✕ về
giữa · xoá hẳn thẻ → **56px** · trả lại chữ → **81px** và ✕ về lề trên. Token đọc ra `56px`.

Popup toán **không** thuộc luật này: chủ trang nói "nav trong drawer", và `.wb-modal__head` đang
`43px` (kit cho `padding: 18px 20px 0`) — ràng nó lên 56px là làm cao thêm một thứ không ai yêu cầu.

Chạm vào: `(data-science-roadmap.html + tools/build-roadmap.mjs + roadmap.html sinh lại + docs/design.md §1.2)`

### Cố ý KHÔNG làm trong phiên này

- **Không giữ mật độ trên màn ở −50%.** Hai yêu cầu ("dài hơn" và "thưa hơn 50%") đè lên
  cùng một con số: kéo dài 1,9× thì mật độ tức thời tự loãng ra dù `COUNT` không đổi. Đã
  chọn cách hiểu **đếm mảnh**: 140 → 70. Hệ quả là đỉnh trên màn xuống −67% (140 → 46 mảnh),
  sâu hơn 50%. Nếu chủ trang muốn đúng −50% **trên màn** thì `COUNT` ≈ 100 (đo được: đỉnh
  70 mảnh) — đổi một con số, không đổi gì khác.
- **Không đụng `vy`/`g`.** Yêu cầu "chậm" của phiên trước còn nguyên; `VMAX` chỉ chặn phần
  vận tốc mà `BAND` mới sinh ra, không giảm vận tốc nào đã có.
- **Không thêm cổng canh hiệu ứng.** Không có cách đọc "hiệu ứng dài bao lâu" bằng cách đọc
  HTML như văn bản; muốn thành cổng thì phải bơm khung trong node. Ba dial giờ là hằng số có
  tên và có bảng số trong `docs/design.md` §9 — đủ cho việc sửa lần sau.
- **Không sửa 5 khuyến nghị `G-FWD`.** Nợ cũ đã soát, backlog ghi rõ: đừng nhồi `allowEarly`.
- **Không làm nhãn Foundation/Applied/Advanced.** Đang chờ chủ trang gọi, xem `## CHƯA LÀM`.
- **Không bỏ lớp phủ của ngăn phụ ở TRANG CHÍNH.** Chủ trang nói "ở màn road map"; hai trang
  có lý do khác nhau cho cùng một component (xem mục 3). Muốn đồng bộ thì phải nói rõ.
- **Không làm ngăn roadmap đẩy nội dung bằng `transform` hay `grid`.** `padding-right` trên
  `<body>` là một dòng, tự đúng khi kéo bề rộng, và không tạo containing block mới (`transform`
  trên tổ tiên sẽ phá `position: fixed` của chính cái ngăn đó và của canvas pháo giấy).
- **Không thêm bẫy tiêu điểm (focus trap) cho ngăn roadmap.** Nó không còn là modal, nên
  Tab đi ra trang phía sau là ĐÚNG — thêm trap là dựng lại cái vừa được yêu cầu bỏ.

### Hai chuyện về pane preview, ngược với ghi chú cũ

1. **`preview_start` đọc `.claude/launch.json` theo THƯ MỤC LÀM VIỆC của phiên, không theo
   thư mục trang.** Đứng ở gốc repo thì `ds-review` **không tồn tại** (chỉ thấy 8 config của
   cashy + `root-static`). Dùng `root-static` rồi `navigate` tới đường dẫn đầy đủ là xong —
   đừng đi sửa `launch.json`. (n6) ghi mặt còn lại của cùng chuyện này: đích cài là `.claude/`
   của thư mục trang.
2. **Ảnh chụp trang DS lần này DÙNG ĐƯỢC**, không ra khung đen — chụp được cả trang lẫn
   canvas pháo giấy ở 1280×720, dpr 1, serve từ gốc repo. (n4) ghi "đã lặp ở ba phiên liên
   tiếp, đừng thử lại"; nay biết là **không phải luôn luôn**. Vẫn nên đo DOM trước, nhưng
   thử một ảnh thì không còn là chắc chắn mất thời gian.
3. **Pane ẩn thì `getComputedStyle` lệch MỘT NHỊP, không phải trả sai ngẫu nhiên** — mất thời
   gian ở mục 3 vì nó: đo lúc ngăn mở thì `padding-right` còn `0px`, đo lúc đã Esc thì mới
   thấy `426px`, đọc theo đó thì tưởng logic bị đảo. Nguyên nhân là transition không tiến khi
   không có khung hình. Cách đo trạng thái cuối: chèn `transition:none !important` rồi đo.
   Đã ghi thành cái bẫy thứ tư ở `docs/design.md` §8, cùng chỗ với `innerWidth` trả 0.
4. **`resize_window` về desktop rồi mà `innerWidth` vẫn là 375** cho tới khi tải lại trang —
   ảnh chụp ra một khung lai (bố cục desktop, kích thước ảnh 364×812). Đổi khổ xong thì
   `navigate` lại đúng URL trước khi đo hoặc chụp.

### Còn nợ của riêng phiên này

- Không có.

---

## Phiên 2026-08-06 (n7) — pháo giấy nổ NGAY (1,43s → 33ms) · hero roadmap về tiếng Anh + đóng lỗ luật §11

### Hero `roadmap.html` về tiếng Anh — và nguyên nhân nó bị dịch ngược

Chủ trang: *"tại sao phần text 'Lộ trình rút gọn…' lại bị đổi thành tiếng Việt rồi, trước
đấy nó là tiếng Anh mà"*. Truy được cả chuỗi, **cùng ngày 2026-08-05**:

| giờ | commit | hero |
|---|---|---|
| — | `1a75135` | tiếng Việt "Bản đồ học nhanh" (bản đầu) |
| 12:05 | `82bd55f` | → **tiếng Anh** "Quick Roadmap / The same roadmap, a different way to learn…" |
| 14:05 | `3e699a5` | viết lại tiếng Anh "A condensed map of Data Science…" + `84 steps · 11 phases · 106.5 hours` |
| 17:52 | `52a15f9` | → **về tiếng Việt** + thêm `.replace('.', ',')` cho dấu thập phân |

**Nguyên nhân không phải ai làm sai, mà là luật và ý định thiết kế không khớp — và luật
thắng vì luật được ghi ra.** Hero tiếng Anh vào ở 12:05 trong một phiên *làm lại giao diện*,
tức là một lựa chọn thẩm mỹ không có chỗ nào ghi lại. Tới 17:52, phiên (n3) soát trang theo
`CLAUDE.md` §11 — luật lúc đó kể **đúng hai vùng** tiếng Anh (thanh trên, chân trang) — thấy
hero không thuộc vùng nào nên xếp nó vào "nội dung → tiếng Việt". Phiên đó **có** ghi lại và
**có** cảnh báo trước, ở [HANDOFF.md:428](HANDOFF.md#L428): *"nếu chủ trang cố ý muốn hero
tiếng Anh thì đây là chỗ lật lại"*. `.rm-hero__note` sinh ra cùng lúc 17:52 nên nó chưa từng
có bản tiếng Anh — lần này mới dịch.

Đã làm: dịch **đúng bốn ô chủ trang gửi** (`__h`, `__sub`, `__stats`, `__note`) ở
`tools/build-roadmap.mjs` rồi chạy lại nó, bỏ `.replace('.', ',')` (tiếng Anh dùng dấu chấm
thập phân → `106.5 hours`). **Và đóng lỗ luật** để không lặp lại: `CLAUDE.md` §11 +
`docs/design.md` §0.1 nay ghi vùng tiếng Anh của `roadmap.html` là **thanh trên + hero +
chân trang**, kèm câu "ô này đã bị dịch ngược một lần, gặp hero tiếng Anh là ĐÚNG luật".
Thêm một comment cạnh chính khối hero trong builder cho người sửa tay tại chỗ.

Verify: `Quick Roadmap` / `84 steps · 11 phases · 106.5 hours` hiện đúng ở **cả sáng lẫn
tối**, 1280px và 375px, `scrollWidth == clientWidth` (không cuộn ngang). Cổng CHẶN xanh,
vẫn đúng 5 khuyến nghị `G-FWD` cũ.

Chạm vào: `(tools/build-roadmap.mjs + roadmap.html sinh lại + CLAUDE.md §11 + docs/design.md §0.1)`

### Pháo giấy nổ NGAY: 1,43s → 33ms, và dial đúng là chỗ sinh mảnh

Chủ trang: *"phần pháo giấy begin chậm quá, phải mất 1 lúc mới thấy… khả năng đang ease in"*.

#### Chẩn đoán: không phải easing, là CHỖ SINH

Bản trước sinh mảnh ở `y = (−0,2 … −0,8) × chiều cao cửa sổ`, tức cách mép trên từ 0,2 đến
0,8 màn hình, rồi rơi bằng vận tốc **đã cố ý giảm 75%** (yêu cầu phiên trước). Đường
`triangularSpawn` đúng là một đường ease-in-out, nhưng nó là ease của **mật độ sinh mảnh**,
không phải của chuyển động — nó không gây trễ đáng kể. Trễ đến từ quãng bay vào khung.

Đo A/B thật (cùng cửa sổ 1280×720, bản cũ lấy bằng `git show HEAD:… > scratchpad/old.html`):

| | mảnh đầu hiện | nửa mật độ | đỉnh | canvas biến mất |
|---|---|---|---|---|
| trước | **1433 ms** | 2583 ms | 3450 ms | 6150 ms |
| sau | **33 ms** (khung 2) | 783 ms | 2783 ms | 3633 ms |

#### Đã sửa — ba dòng, không chạm vật lý rơi

- dải sinh dán vào mép trên: `y = −Math.random() * 0,12 × cv.height`. Mảnh có `spawn` gần 0
  nằm ngay mép trên → thấy tức thì; số còn lại vào dần nên vẫn ra dòng rơi, không phải một
  tấm màn xuất hiện cùng lúc.
- `SPAWN_WINDOW` 1400 → **500 ms**, `SPAWN_PEAK` 300 → **80 ms**.
- thêm cull `if (b.y - b.h > cv.height) continue;` — dải sinh ngắn nên mảnh ra khỏi khung
  sớm hơn `LIFE`; thiếu dòng này thì vòng rAF chạy không cho một canvas rỗng ~1,7s.

**KHÔNG tăng `vy`/`g`.** Vận tốc chậm là yêu cầu của chủ trang ở phiên trước; sửa độ trễ
bằng cách bỏ yêu cầu đó là đổi hai thứ khi chỉ cần đổi một. Ghi luôn vào
`docs/design.md` §9 rằng **dial để xoay là chỗ sinh, không phải vy** — để phiên sau không
đi lại đường đó.

Chạm vào: `(khung: script + docs/design.md §8, §9)`

### Cách đo thời gian khi pane đóng băng rAF — đã ghi vào docs/design.md §8

Tab preview ở `visibilityState: hidden` giữa hai lệnh tool, nên rAF không tick: phép đo theo
đồng hồ thật chỉ ra **1 khung hình** rồi treo. Cách làm được: chặn `requestAnimationFrame`
(giữ callback) **và** `performance.now` (đồng hồ giả +1000/60 mỗi vòng) rồi tự bơm khung —
chạy đúng code thật nhưng thời gian xác định, lặp lại được. Đây là cái bẫy pane thứ tư và
nó đã được ghi cạnh ba cái kia.

### Cố ý KHÔNG làm trong phiên này

- **Không dịch gì khác trên `roadmap.html` ngoài bốn ô hero.** Chủ trang nói rõ *"chỉ cái
  phần tôi gửi bạn thôi"*. Nên `<title>`, `<meta description>`, tên chặng, nhãn mục ("Kiến
  thức chính", "Xong bước này", "Tiêu chí đạt"), chip `N bước` và 84 bản tóm tắt **vẫn tiếng
  Việt** — trang giờ là khung Anh / thân Việt, đúng như trang chính.
- **Không đổi hero của trang chính (`data-science-roadmap.html`).** Chủ trang chỉ nói về
  trang roadmap; hero trang chính là nội dung dạy, §11 vẫn áp nguyên.
- **Không thêm cổng kiểm ngôn ngữ.** Đã cân nhắc: một cổng kiểu "hero phải khớp danh sách
  chuỗi tiếng Anh" sẽ chặn được lần dịch ngược thứ hai, nhưng nó khoá luôn cả việc chủ trang
  đổi câu chữ — và cái sai lần này là *luật thiếu vùng*, đã sửa ở đúng chỗ đó (§11 + §0.1).
  Cổng chỉ đáng thêm nếu chuyện này lặp lại lần nữa.
- **Không thêm "burst" bắn từ dưới lên / từ hai bên** (dáng pháo giấy kiểu confetti cannon).
  Nó sẽ giải quyết độ trễ triệt để hơn, nhưng là đổi *hình dáng* hiệu ứng — chủ trang chỉ
  yêu cầu nổ sớm, không yêu cầu đổi dáng. Muốn làm thì hỏi trước.
- **Không sinh mảnh ĐÃ ở trong khung** (`y > 0`). Thấy mảnh bật ra giữa màn hình đọc như lỗi
  render; dán mép trên đã đủ 33 ms.
- **Không giảm `LIFE`.** Sau khi có cull thì `LIFE` chỉ còn là hạn mờ dần, không còn ảnh
  hưởng thời lượng thật (3,6s) — sửa nó là sửa một con số đã hết tác dụng.
- **Không sửa `.claude/launch.json` để trỏ vào scratchpad.** Sandbox phiên này TỪ CHỐI cho
  tiến trình preview đọc thư mục repo (log: `getcwd: Operation not permitted`, mọi request
  404) nên đã phải mirror trang sang scratchpad để xem — nhưng đó là chuyện của sandbox từng
  phiên, và bản trước đã mục vì trỏ vào scratchpad của một phiên đã chết. Đã thêm một config
  thứ hai để xem, rồi **chạy lại `tools/install-hooks.sh`** để trả `.claude/launch.json` về
  bản nguồn. Ai gặp 404 khi serve từ gốc repo thì mirror sang scratchpad **trong phiên của
  mình**, đừng ghi vào `tools/hooks/launch.json`.

### Còn nợ của riêng phiên này

- Không có. 5 khuyến nghị `G-FWD` còn lại là nợ cũ, không phải của phiên này.

---

## Phiên 2026-08-05 (n6) — dọn nốt backlog cũ: cổng cho thang khoảng cách, launch.json theo repo, soát bảng dài

Chủ trang: *"còn gì cần làm nữa không, làm nốt đi, handoff còn gì không"*. Rà toàn bộ mục
`Còn nợ của riêng phiên này` + `Còn nợ thật` của các phiên trước → **3 việc còn thật**, làm
cả 3. Phần còn lại là ghi chú hoặc đã tự khai "đừng làm" — liệt kê ở cuối.

### 1. `G-SPACING` — cổng còn thiếu cho thang `--ds-sp-*` (nợ từ phiên (k))

Phiên (k) ghi: *"`G-MEASURE` canh `max-width` cứng, nhưng chưa có cổng nào bắt 'vừa viết
`margin-bottom: 17px` tại chỗ'"*. Giờ có. Luật lấy nguyên câu chốt của
[docs/design.md](docs/design.md) §0.6: **`margin` giữa hai khối anh em thì lên thang;
`padding` trong lòng component thì không.**

Chạy lần đầu ra **9 chỗ, và cả 9 rơi ĐÚNG vào một bậc có sẵn** (4 / 6 / 8 / 14px) — tức là
drift thật chứ không phải cổng bắt sai. Đã trỏ hết vào token; cổng im.

Ba ngoại lệ được kiểm bằng ca thật, không chỉ bằng suy luận: `margin-top: 3px` (nhích quang
học ≤5px) · `padding: 12px 16px` · `margin: 0 24px` (trục ngang) — **đều im**; `margin:
21px 0 9px` **nổ và báo cả hai giá trị**. Thoát cửa `/* gate:sp: lý do */` cũng đã thử.
`gate.test.mjs` 49 → **51 ca**.

### 2. `.claude/launch.json` theo repo được (nợ từ phiên (e), nhắc lại ở (h))

Nguồn giờ là `tools/hooks/launch.json` (được git theo dõi), `install-hooks.sh` thay
`__REPO_ROOT__` rồi trộn bằng `jq` — giữ nguyên configuration khác, chạy nhiều lần không
sinh trùng (kiểm: 8 config của cashy còn nguyên).

**Đích là `.claude/` của THƯ MỤC NÀY, không phải gốc repo** — preview đọc `launch.json` theo
thư mục làm việc. (Lần đầu tôi cài nhầm vào gốc repo rồi phải gỡ ra.)

Nhân tiện sửa luôn ba chỗ làm config cũ chỉ chạy được trên đúng một máy / một trạng thái
sandbox. Cả ba đều là **`os.getcwd()` bị sandbox từ chối HẲN** — không phải đứng sai thư mục,
nên `cd` hay `os.chdir()` đều không cứu:

1. `-m http.server` → argparse tính `default=os.getcwd()` ngay lúc dựng parser, nên truyền
   `--directory` cũng vô ích → dựng server bằng tay, không qua argparse.
2. `python -c` để `sys.path[0]` = cwd → chính bước **import** đã ném → cờ `-I`.
3. `SimpleHTTPRequestHandler.__init__` gọi `os.getcwd()` **mỗi request** (Python 3.9) → server
   chạy được mà vẫn 500 mọi request → `functools.partial(..., directory=)`.

Cộng thêm: bỏ `/opt/homebrew/bin/python3.11` viết cứng, lấy `python3` từ PATH.

### 3. Soát bảng cao quá một màn hình (nợ từ phiên (h))

Phiên (h) lo *"chưa soát bài nào có bảng dài quá một màn hình"*. Đo xong: **160 bảng / 84 bài,
chỉ 3 cái vượt một màn hình** — `s-plan8w` 3350px · `r-roadmapsh` 897px · `s-intro` 893px. Hai
trong ba là **bảng tra**, cao là đúng bản chất. (Bảng 839px ở `s-families` mà phiên (h) nêu
tên giờ không còn trong danh sách.) Kết luận: **không phải vấn đề**, đừng soát lại.

**Đã thử hàng tiêu đề dính và BỎ — đừng thử lần nữa.** `position: sticky` trên `thead th`
không chạy ở trang này: mọi bảng nằm trong `.wb-table-scroll` (`overflow: auto`), nên phần tử
sticky bám vào wrapper chứ không bám cửa sổ. Không gỡ được bằng `overflow-y: visible` — theo
spec, một trục khác `visible` thì trục kia tự thành `auto`. Muốn có thì phải bỏ wrapper, mà
wrapper là thứ mang phần tràn `--ds-bleed`: đổi layout của 41 bảng để lợi cho 3. Lý do đầy đủ
nằm trong comment ngay chỗ `.ds-prose th` trong `<style>`.

### Đã rà và KHÔNG làm — kèm lý do, để phiên sau khỏi mở lại

| mục backlog (phiên) | vì sao không |
|---|---|
| `--ds-measure` fluid theo cửa sổ (i) | chính mục đó đã tự kết luận "chưa đáng làm"; ký tự/dòng vẫn trong khoảng 45–90 ở mọi bề rộng |
| `G-HANDOFF` phân biệt "đã ghi" vs "chỉ chạm" (l) | mục đó đã tự chốt "để nguyên" — đòi đúng khuôn `## Phiên <ngày>` là bắt agent theo khuôn cứng hơn mức cần |
| `gate.test.mjs` chạy ~20–25 giây (l, h) | ghi chú về chi phí, không phải việc. Giờ 51 ca vẫn ~20s vì `pre-push` chỉ chạy khi `tools/` đổi |
| Sổ học xuất riêng MỘT bài (l) | sổ đang 0 dòng; tối ưu cho vấn đề chưa tồn tại |
| `docs/design.md` dài ~540 dòng (j) | mục đó ghi rõ "nếu chủ trang thấy vẫn rườm rà" → quyết định của chủ trang, không tự cắt |
| 5 khuyến nghị `G-FWD` | backlog cũ đã ghi: **đừng nhồi `allowEarly`** |

### Một chỗ lệch số, cố ý để nguyên

`audit.mjs` in **106.6 giờ**, còn trang chủ và roadmap in **106,5 giờ**. Không phải file cũ:
trang làm tròn về nửa giờ (6396 phút → 106,5) còn `audit` in một chữ số thập phân. Hai đối
tượng đọc khác nhau. Trước phiên (n5) hai con số trùng nhau **do may** (6390 phút chia hết).
Đừng "sửa" một bên cho khớp mà không hỏi.

### Verify

Cổng CHẶN xanh · `gate.test` **51/51** · `audit` nhất quán · khuyến nghị về đúng **5 `G-FWD`
cũ**. `install-hooks.sh` chạy hai lần liên tiếp: đúng 1 configuration `ds-review`, 8 config
của project khác còn nguyên.

### Cái bẫy pane thứ ba (đã mất khá nhiều thời gian vì nó)

Server preview mới khởi động bị bọc trong `Claude.app/Contents/Helpers/disclaimer` — sandbox
đó **chặn cả `getcwd()` lẫn việc đọc file trong repo**, nên server chạy nhưng trả 404 cho mọi
đường dẫn. Bằng chứng phân biệt được: một server CŨ còn sống (không bị bọc) phục vụ đúng thư
mục đó trả **200**. Đây là trạng thái môi trường, **không phải lỗi `launch.json`** — và bản
config mới còn khá hơn bản cũ dưới cùng sandbox đó (bản cũ nổ ngay lúc khởi động, bản mới
chạy và phục vụ). Nếu preview 404 toàn tập: kiểm `ps` xem tiến trình có bị bọc `disclaimer`
không trước khi đi sửa config.

---

## Phiên 2026-08-05 (n5) — roadmap dùng chung component cuộn + ngăn kéo được; làm nốt backlog

Ba yêu cầu của chủ trang: (1) `roadmap.html` dùng **cùng component thanh cuộn** với trang
chính, (2) ngăn trong roadmap **mặc định 1/3 cửa sổ và kéo chỉnh được**, (3) *"còn gì cần
làm đang handoff nữa không? triển khai làm nốt đi"*. Giữa phiên chủ trang báo thêm một lỗi
thật khi kéo — mục "Nhả chuột trên overlay" dưới đây.

### 1–2. Roadmap: thanh cuộn + ngăn kéo được — TRÍCH, không chép

Cả hai đều **trích từ trang chính lúc build**, không viết bản thứ hai:

| thứ | cách mang sang | vì sao không chép |
|---|---|---|
| thanh cuộn | `class="wb-scrollbars"` trên `<html>` (kit §27) + `wb-scroll-y` cho thân ngăn | là component của kit — chỉ cần gọi đúng tên |
| CSS tay kéo | `pickCss(/\.ds-(grip\|dragging)\b/)` — cùng bộ trích đã dùng cho khối tương tác | 6 rule, sửa một chỗ là hai trang cùng đổi |
| JS tay kéo | `resizerJs()` cắt `dsZoom()` + `makeEdgeResizer()` nguyên văn | chú thích ngay trên hàm đó đã nói: *"chép thì rẻ hôm nay và đắt mãi về sau"* |

`vizCss()` được tách thành `pickCss(need, what)` để dùng được hai lần. `--rm-drawer-w` đổi
từ `min(50vw,760px)` cứng → `clamp(340px, 33.333 * --ds-vw, 720px)`, **đúng con số/sàn/trần
với token ⑪** của trang chính. Roadmap khai `--ds-zoom: 1` + `--ds-vw` chỉ để hàm trích về
chạy nguyên văn — **đừng sửa hàm cho "gọn hơn"**, sửa là bắt đầu có hai bản.

Khoá lưu **riêng** (`rm.drawerW` ≠ `ds.asideW`): hai ngăn mở ra bằng nhau, nhưng nội dung
khác nhau nên bề rộng người dùng chọn cũng có quyền khác.

Ở ≤680px ngăn chiếm cả màn nên **tay kéo bị giấu** và `--rm-drawer-w:100vw !important` —
cần `!important` vì `makeEdgeResizer()` ghi biến đó vào style inline của `<html>`.

### Nhả chuột trên overlay khi đang kéo — lỗi THẬT, đã sửa ở hàm dùng chung

Chủ trang báo: kéo chỉnh bề rộng rồi nhả chuột lúc con trỏ đang ở trên lớp phủ thì ngăn bị
đóng. **Tái hiện được trên trang chính** (kéo thật bằng chuột: `overlayDisplay` từ `flex`
→ `none`).

Cơ chế: sau một lần kéo, trình duyệt bắn thêm một `click` vào **tổ tiên chung** của chỗ bấm
xuống và chỗ nhả ra. Ở trang chính `.ds-grip` nằm **bên trong** `#asideOverlay`, nên tổ tiên
chung chính là cái overlay — và overlay đóng lớp khi bị bấm.

Sửa trong `makeEdgeResizer()` (nên roadmap được hưởng theo): `swallowNextClick()` nuốt đúng
một click ở **pha capture**, và chỉ khi con trỏ **thật sự có di chuyển** (`moved`), kèm hẹn
giờ 300ms để gỡ. Ba điều kiện đó đều có ca kiểm riêng — bỏ bất kỳ cái nào là hỏng một hướng:
không có `moved` thì một cú bấm nhẹ lên tay kéo sẽ ăn mất cú bấm kế tiếp; không có hẹn giờ
thì lần nhả nào không sinh click (nhả ngoài cửa sổ, `pointercancel`) sẽ để lại cái bẫy nằm chờ.

**Roadmap vốn KHÔNG dính lỗi này** vì ở đó overlay và ngăn là hai node anh em, tổ tiên chung
là `<body>`. Nhưng đó là may, không phải thiết kế — nên guard vẫn nằm ở hàm chung.

### 3. Backlog: làm 3, BÁC 1, để lại 2 — kèm lý do từng cái

| mục backlog | kết quả |
|---|---|
| `th-defense` lịch T−3/T−2/T−1 → `wb-steps` | **LÀM.** Xoá luôn 3 rule `.ds-day*` — trang giờ không còn chuỗi bước nào tự vẽ |
| `ml-loss` zoo optimizer → popup | **LÀM.** Mạch chính giữ đúng cái dùng thật (`AdamW`), ba cái tên vào popup `optzoo` |
| `dl-train` bảng gỡ lỗi → popup | **BÁC — đừng làm lại.** `PAYOFF[dl-train][0]` là *"Bảng chẩn đoán đường cong loss, và quy trình gỡ lỗi"*: cái bảng đó **là** sản phẩm của bài. §7 nói "danh mục lỗi → popup", nhưng ngoại lệ là khi danh mục chính là deliverable |
| rà thời lượng | **LÀM một chỗ** (`s-how`), đo cả 84 bài — xem dưới |
| nhãn Foundation/Applied/Advanced | **để lại** — trang đã có 3 chip ưu tiên + chip 14 ngày + nhãn `SCOPE`; thêm trục thứ tư là thêm nhiễu. Cần thì chủ trang gọi |
| 6 khuyến nghị `G-FWD` | **để nguyên** (backlog cũ đã ghi rõ: đừng nhồi `allowEarly`) |

`th-defense`: mốc đếm **ngược 3 → 2 → 1** (số ngày còn lại), tiêu đề mang nhãn `T−3` để không
phải suy ra. Đo lại: tâm mốc khớp tâm tiêu đề **lệch 0px**, có đường nối.

### Rà thời lượng: đo cả 84 bài, chỉ MỘT bài đáng sửa

Đo hai lần vì lần đầu **không công bằng**: đếm chữ trong thân bài thì các bài toán/DL bị
oan (nội dung của chúng nằm trong popup). Đếm cả popup thì lại oan chiều ngược lại — một
ngăn `cmp-*` được 6 bài mở chung nên bị cộng vào cả 6.

Kết luận sau khi trừ hai nhiễu đó: **chỉ `s-how` là sai thật.** 1.531 từ trong **28 đoạn văn**
(không phải bảng để liếc) mà khai 10 phút → 153 từ/phút, gấp 8 lần trung vị 18 của trang và
gấp đôi bài đứng thứ hai. Nó lại là bài **thứ hai** người mới đọc. → `r: 10 → 15`.

Các bài xếp cao kế tiếp đã soát và **để nguyên, đừng đo lại**: `s-lookup` / `r-stack` là bài
tra cứu (CLAUDE.md §7 công nhận) — bảng tra thì liếc chứ không đọc; `pr-eval` (73 từ/ph),
`s-intro` (71), `t-colab` (73) nằm trong khoảng chấp nhận được, không phải sai gấp đôi.

Hệ quả: tổng **106,5 → 106,6 giờ**, ngày 1 fast track 5,75 → 5,83h (trần 6,5). `learn.mjs
--write` phải chạy theo vì khối summary nhúng tổng giờ — `gate.test.mjs` bắt đúng chỗ này.

### Lại một lỗ tràn 52px ở 375px — cùng con số, khác đường vào

`s-plan14` tràn đúng 52px như phiên trước. **Không phải lỗi cũ tái phát**: rule
`#main code { overflow-wrap: anywhere }` vẫn còn và vẫn đúng. Lần này thủ phạm là
`assert_split_ok` trong trường `out` của `DAYS` — **chữ trần, không bọc `<code>`**, nên
rule kia không với tới. Thêm `#main .wb-steps__note { overflow-wrap: anywhere }`: neo vào
cái chip chứ không vào `<code>`, vì chip đó không bao giờ được rộng hơn cột **bất kể bên
trong là thẻ gì**.

Đáng chú ý: `documentElement.scrollWidth` báo 427 nhưng `scrollLeft` tối đa = **0** — trang
không cuộn ngang thật. Nên **đừng chỉ tin `scrollWidth`**; kiểm thêm có cuộn được không, và
truy ngược bằng `Range.getClientRects()` (thủ phạm là một *inline box*, không phải element,
nên vòng lặp `getBoundingClientRect()` trên element bỏ sót nó).

### Verify

Cổng CHẶN xanh · `gate.test` **49/49** · `audit` nhất quán (106,6h / 75,3h) · khuyến nghị về
đúng **5 `G-FWD` cũ**. Quét DOM **85/85 trang (home + 84 bài) tràn ngang = 0 ở 375px**;
roadmap 0 ở cả 375 và desktop. Ngăn roadmap: mặc định đúng 1/3 (427/1280), kẹp sàn 340 /
trần 1/2, bàn phím ←/→/Home/End, nhấn đúp reset + xoá khoá lưu, nhớ qua reload, thanh cuộn
đổi màu theo sáng/tối. Guard nhả-chuột: **3 lần chạy liên tiếp** đều đúng, và cú bấm thường
vẫn đóng ngăn.

### Hai cái bẫy của pane preview — ghi lại để phiên sau đỡ mất giờ

1. **`resize_window` KHÔNG bắn sự kiện `resize`** (đo được: 0 lần sau khi đổi 900 → 1100px).
   Nên logic nghe `resize` — như đoạn kẹp lại bề rộng đã lưu — **trông như hỏng mà thật ra
   không**. Muốn kiểm thì `dispatchEvent(new Event('resize'))` bằng tay.
2. **Pane bị ẩn thì `requestAnimationFrame` dừng.** Ngăn roadmap thêm class `is-open` trong
   rAF, nên khi pane ẩn nó "không mở" và mọi phép đo sau đó sai theo. Dấu hiệu: `innerWidth`
   trả 0. Chụp một ảnh màn hình là pane tỉnh lại.

### Cố ý KHÔNG làm

- Không đụng hệ thống mốc (`mile`), không đổi `id` chặng — như phiên (n4) đã ghi.
- Không rải chặng toán.
- Không sửa thời lượng `pr-eval` / `s-intro` / `t-colab`: đã đo, nằm trong khoảng.

---

## Phiên 2026-08-05 (n4) — ĐỔI THỨ TỰ MẠCH CHÍNH — XONG

Chủ trang gỡ hoãn cho backlog "đổi thứ tự mạch chính" (review §2) với chỉ thị: *"option nào
khiến nội dung trở nên tốt nhất thì làm, không cần quan tâm đến effort"*. Kiến trúc
`roadmap.html` vẫn **giữ view dẫn xuất** — chủ trang xác nhận lại lần hai.

### Đã bác một phần bản review, có bằng chứng — đừng làm lại theo nguyên văn §2

Thứ tự 10 bước review đề xuất **tự mâu thuẫn**: nó đặt *"công cụ vừa đủ"* ở bước 5, **sau**
EDA (bước 4) và data/split (bước 3). Đo trên file: `d-data`/`d-leak`/`d-split`/`d-eda`/`d-clean`
dùng pandas ở **19/6/4/7/3** chỗ. Không thể làm EDA trước khi có pandas. Nên phần đã làm là
**"C trừ bước 5"** — mọi ý còn lại của review đều nhận, riêng ý đó bác.

Ngược lại, `d-framing` đo được **0 dòng pandas, 0 công thức** — nó là bài duy nhất cả trang học
được trước khi có công cụ, nên nó lên chặng 0.

### Bốn move, và số đo biện minh cho từng cái

| move | bằng chứng đo được | kết quả |
|---|---|---|
| `d-framing` → cuối chặng 0 | trang tự nói framing phải xong "trước khi mở notebook" mà lại đặt nó sau 22,3 giờ | framing ở **3,3h** thay vì 22,3h; chặng 0 có deliverable đầu tiên thay vì 3,3h chỉ đọc |
| chặng dữ liệu lên trước chặng toán, và sắp lại thành data → **leak → split** → eda → clean | `d-eda` dạy "sau khi chia tập chỉ nhìn train" nhưng bài chia tập đứng **sau** nó hai bài | mọi cái nhìn vào dữ liệu đều sau khi đã chia |
| chặng toán xuống trước FE; `m-infer` tách hẳn sang chặng 5 cạnh `ml-cv` | khoảng cách "dạy → dùng thật" (đo bằng popup toán): `m-infer` **38 bài**, `m-deriv` 22 bài | m-infer còn cách `pr-eval` 4 bài, và nối thẳng vào câu `ml-cv` vừa để ngỏ |
| product (p8) lên trước deep learning (p6) | cả chặng product chạy bằng LightGBM, **0 dòng mạng nơ-ron** | người học chạm product ở **53,6h** thay vì 64,8h |

Thứ tự chặng hiển thị mới: 0 Bắt đầu · 1 Công cụ · **2 Vòng đời dữ liệu** · **3 Toán** · 4 FE ·
5 ML · **6 Product** · **7 Deep learning** · 8 Họ bài toán · 9 Luận văn · 10 Tra cứu.
**`id` chặng giữ nguyên** (`p2` vẫn là toán dù hiển thị "3", `p8` vẫn là product) — link cũ và
tiến độ đã lưu bám vào id.

### Hai chỗ CỔNG bắt được, và tôi đã sai trước khi cổng nói

1. **`d-split` trước `d-leak` là sai** — tôi xếp thế theo đúng chữ của review, `G-FWD` nổ ngay:
   tiêu chí đạt của `d-split` đòi người học nhận ra cột rò rỉ. Đảo lại thành leak → split.
2. **"bootstrap" thành phụ thuộc ngược mới** khi `m-infer` xuống chặng 5 — `ml-trees` (bagging)
   và `d-data` dùng nó trước. **Không dời `m-infer` lên trước `ml-trees` được**: chính m-infer
   lấy baseline LightGBM của `ml-trees` làm ví dụ chạy suốt bài. Xử lý theo đúng ca §8 cho
   phép: `ml-trees` đã tự định nghĩa tại chỗ, thêm con trỏ sang `m-infer`, rồi khai `allowEarly`
   kèm lý do. Khuyến nghị về lại **đúng 5 cái G-FWD cũ**, không thêm cái nào.

### Hai lỗi CÓ SẴN mà việc sắp lại làm lộ ra

1. **Trang chủ đánh số chặng theo `p.id` chứ không theo số hiển thị.** Đã sai từ phiên (m2)
   lúc p7/p8 hoán chỗ — trang chủ in "Chặng 8: Làm ra product" ở vị trí thứ bảy suốt từ đó.
   Sửa thành `p.t.split(' · ')[0]`. Đây là lý do phải **mở trang bằng mắt**: cả 10 cổng CHẶN
   đều xanh trong khi trang chủ in sai số chặng.
2. **`code` ngoài `.ds-prose` không được phép ngắt dòng.** Luật `overflow-wrap` chỉ khai trong
   `.ds-prose`, còn các stepper lịch dựng bằng template literal thì nằm ngoài — một tên đường
   dẫn 16 ký tự đẩy `s-plan14` tràn **52px ở 375px**. Đã kiểm ngược bản HEAD để chắc đây là lỗi
   MỚI do chữ tôi viết chạm ngòi, rồi sửa ở gốc bằng một rule `#main code` (chỉ overflow-wrap,
   không lan phần nền/viền của `.ds-prose` ra cả trang).

### Lịch: cả hai bản đều đã sắp lại, không chỉ chặng

- **8 tuần**: T1 thêm `d-framing` (deliverable `problem-statement.md` chuyển từ T2 lên T1) ·
  T2 = vòng đời dữ liệu + toán · T4 thêm `m-infer` · **T5 ↔ T6 hoán** (product lên T5) ·
  `t-colab` chuyển sang T6 vì đó mới là chỗ cần GPU, và như thế nó khớp với fast track.
- **14 ngày**: framing lên ngày 1 · ngày 4 = vòng đời dữ liệu · ngày 5 = làm sạch + toán ·
  `m-infer` sang ngày 9 · **product ngày 10–11, deep learning ngày 12–13** (trước là ngược lại).
  Ngày 6 cố ý nhẹ nhất (3,5h) vì đó là ngày deliverable — giờ đổ vào việc CHẠY, không phải đọc.
- Tổng **không đổi**: 106,5h / fast 75,3h. Giãn giờ: tuần 11,2–16,5h, ngày 3,5–6,4h.
- **11 tham chiếu chéo dạng "chặng 6" / "tuần 5"** trong thân bài đã sửa theo số mới, cộng
  ba chỗ nữa (mục cắt lịch 3 giờ/ngày, bộ dữ liệu thiếu `card_id`, `m-deriv`). Cổng KHÔNG bắt
  được loại này — grep `"chặng [0-9]"` và `"tuần [0-9]"` là cách duy nhất.

### Verify

`gate` CHẶN xanh · `gate.test` **49/49** · `audit` nhất quán · `auditPlan()` trên trình duyệt
trả `[]`, console sạch · khuyến nghị đúng **5 G-FWD cũ**. Đo DOM: **cả 84 bài + trang chủ,
overflowX = 0 ở 375px**; 1280px cũng 0; roadmap 84 node đúng thứ tự mới, drawer `m-infer` hiện
"Tuần 4", không tràn ở cả hai khổ. Trang chủ in đúng Chặng 0→10 theo thứ tự.

*Ảnh chụp trang DS vẫn trả frame đen — lỗi này giờ đã lặp ở ba phiên liên tiếp, đừng tốn thời
gian thử lại, đo DOM luôn.*

### Cố ý KHÔNG làm

- **Không rải chặng toán thành 4 mảnh** như review gợi ý ("vector khi học linear model, gradient
  khi học loss…"). Chỉ tách đúng `m-infer` — cái có khoảng cách 38 bài. Bốn bài còn lại giữ thành
  một khối vì với người sợ toán, "đây là toàn bộ phần toán, 5,2 giờ, hết" là một lời hứa có giá
  trị; rải ra thì mất lời hứa đó mà chỉ được thêm vài bài gần hơn.
- **Không đổi mốc (`mile`)**: Mốc 1/2/3 vẫn ở tuần 3/7/8. Product xong ở tuần 5 giờ đáng là một
  mốc, nhưng đổi hệ thống mốc là quyết định riêng của chủ trang.
- **Không đổi `id` chặng** để khớp số hiển thị. Hai con số đó cố ý rời nhau — xem comment mới ở
  `renderHome`.

---

## Phiên 2026-08-05 (n3) — thẩm định bản review thứ hai — XONG + đã push

Chủ trang đưa một **bản review thứ hai** (khác bản đã thẩm định ở phiên (l)) về cả hai trang, hỏi
"mệnh đề nào đúng, đúng thì sửa". Đã kiểm từng mệnh đề bằng grep/đếm trên file thật, **sửa xong
toàn bộ phần factual**, và **dừng trước ba việc là quyết định giáo trình/kiến trúc**.

### Đã sửa — 12 chỗ trong HTML, 10 chỗ trong `roadmap-summaries.json`

Nguyên tắc chung của cả loạt: **giữ nguyên trực giác, chỉ đóng lại phạm vi** — không câu nào bị
làm phức tạp thêm, chỗ nào cũng nói rõ "luật này đúng trong điều kiện nào".

| chỗ | trước | sau |
|---|---|---|
| `ml-loss` bảng + đoạn dưới | "Hàm mất mát **phải khả vi** để tối ưu được" | khả vi là điều kiện của **cách tối ưu bằng gradient**; thêm `wb-help` nêu MAE/subgradient + cây không hạ gradient, trỏ aside `x-tree-learn` |
| popup `dot` | tích vô hướng = 0 → "(không liên quan gì nhau)" | trực giao **trong biểu diễn & thang đo đang dùng**; nói rõ KHÔNG suy ra độc lập thống kê / không tương quan / nhân quả |
| popup `ci` | bootstrap "dùng được cho **mọi** chỉ số", code bốc theo dòng, không caveat | giữ "mọi chỉ số" (đúng — nói về *chỉ số*), thêm `wb-alert--warning`: bốc theo **dòng** chỉ đúng khi dòng độc lập, dữ liệu giao dịch vi phạm hai chiều → cluster/block, trỏ `pr-eval` |
| popup `mse` | "$R^2=0$ ngang với **đoán bừa** bằng trung bình" | ngang với **baseline luôn dự đoán trung bình** (đoán ngẫu nhiên còn tệ hơn) |
| popup `logloss` | "nó **buộc** mô hình phải hiệu chỉnh" | log loss là **proper scoring rule** → **thưởng** cho hiệu chỉnh; thêm dòng "thưởng ≠ bảo đảm" (model hữu hạn/regularized/misspecified vẫn lệch) |
| popup `posenc` | "đảo hai từ trong câu, điểm số **y hệt**" | self-attention **hoán vị-đồng biến**: đảo token thì output đổi chỗ theo, giá trị không đổi → lớp đó nhìn câu như **túi token** |
| `f-select` | "LightGBM **tự bỏ** cột vô dụng nên cứ giữ hết" | "**ít bị** cột vô dụng làm hỏng"; thêm `wb-help`: cột nhiễu vẫn tốn thời gian + tăng phương sai, đây là **heuristic vòng đầu** |
| `f-select` RFE | "**Chính xác nhất**, chậm nhất" | "sát nhất với chỉ số bạn tối ưu vì nó thử thật"; kết quả chỉ đúng với **đúng estimator + chỉ số + cách chia CV** đó |
| `dl-tf` | "xếp chồng **bao nhiêu lần cũng được**" | "hình dạng không chặn việc xếp chồng"; thêm `wb-help`: cái chặn thật là compute/bộ nhớ/độ ổn định khi tối ưu |
| `dl-tab` | "Vì sao boosting **vẫn thắng**" (không giới hạn) | giữ nguyên phần thân + thêm `wb-alert--info` "phát biểu cho đúng mức": baseline rất mạnh trên bảng **cỡ vừa**; Grinsztajn đo ~10k mẫu, không pretraining/multimodal; TabZilla cho thấy phụ thuộc bộ dữ liệu |
| `ml-shap` | "với mô hình cây phân loại, dự đoán cuối **là** log-odds" | thang nào là **tuỳ `model_output`**: mặc định `raw` của TreeExplainer (LightGBM/XGBoost nhị phân) → log-odds; `"probability"` → thang xác suất |
| `t-env` Kaggle | "~30 giờ GPU/tuần **được bảo đảm**", reset cố định | "hạn mức **theo tuần**, thường ~30 giờ, phụ thuộc tài nguyên sẵn có"; mốc reset ghi là "hay gặp", bảo người học **tự xem đồng hồ quota** |
| `t-pandas` | vector hoá "nhanh cỡ **100 lần**" | "một tới hai bậc độ lớn (10–100), tuỳ phép tính" + bảo tự đo bằng `%timeit`, đừng trích con số |
| `ml-tune` | "tuning **là** bước cho thêm 1–3%" | "**thường** cho thêm ít nhất (kinh nghiệm phổ biến trên dữ liệu bảng: cỡ 1–3%, không phải hằng số)" |

`roadmap-summaries.json` sửa **đúng những chỗ bản tóm tắt tự sinh ra lỗi mà bài đầy đủ không có** —
đây là loại lỗi nguy hiểm nhất của trang tóm tắt, vì bài gốc đúng nên không cổng nào bắt:

- **`ml-loss`**: "chọn ngưỡng để tối ưu … (**PR-AUC**, F1, tiền)" → ngưỡng **không** tối ưu được
  PR-AUC (AP tổng hợp trên toàn dải ngưỡng, đổi ngưỡng không đổi nó). Bài đầy đủ **không** mắc lỗi
  này — nó chỉ liệt PR-AUC ở cột "ví dụ chỉ số đánh giá". Tóm tắt gộp hai cột thành một.
- **`q-causal`**: "ngẫu nhiên hoá là thứ **duy nhất** giải được" → sai, và **tự mâu thuẫn với chính
  point cuối của nó** (DiD / RDD / PSM / IV). Bài đầy đủ có hẳn mục "Khi không thể chạy thí nghiệm".
- **`ml-trees`**: "500 cây **độc lập**" → "được ngẫu nhiên hoá cho **ít tương quan**" (bài đầy đủ đã
  nói đúng ở đoạn "chỗ ví von hỏng").
- `f-select` (×2), `dl-tf` (×2), `dl-tab` (×2), `ml-shap` (×2): đồng bộ với 12 sửa ở trên.

### Đã sửa ở `roadmap.html` (qua `build-roadmap.mjs` — KHÔNG sửa tay file sinh)

1. **Hero về tiếng Việt.** "Quick Roadmap / A condensed map…" → "Lộ trình rút gọn / Bản đồ cô đọng…",
   `84 steps · 11 phases · 106.5 hours` → `84 bước · 11 chặng · 106,5 giờ` (thêm `.replace('.', ',')`).
   Theo CLAUDE.md §11: **chỉ thanh trên và chân trang nói tiếng Anh**, hero là nội dung → tiếng Việt.
   Chân trang giữ nguyên tiếng Anh, đúng luật. *Lưu ý: phiên (n2)/commit 3e699a5 vừa viết lại đúng
   câu hero tiếng Anh này — nếu chủ trang cố ý muốn hero tiếng Anh thì đây là chỗ lật lại.*
2. **Hết mập mờ thời lượng.** Review đúng: `fmt(l.mins)` là thời lượng **bài đầy đủ** lấy từ `TREE`,
   nhưng trang hứa "nắm ý lõi trong vài giây" → người đọc không biết `45′` là của cái nào. Thêm
   `.rm-hero__note` dưới hero + đổi chip thành `45′ · bài đầy đủ` kèm `title=`.
3. `.rm-hero__note` dùng **`--wb-fg-muted` chứ không phải `--wb-fg-subtle`** — đo được ở sáng:
   subtle `#a1a1aa` trên nền `#f7f7f8` chỉ ~2,6:1 (dưới AA), muted `#71717a` ~4,8:1. Đã ghi lý do
   ngay trong CSS để phiên sau không "dọn" ngược lại.

**Verify:** `gate` CHẶN xanh · `gate.test` 49/49 · `audit` nhất quán · khuyến nghị vẫn đúng **6 cái
cũ**, không sinh cái mới. Đo trên trình duyệt (server tĩnh 8813, không mirror): không cuộn ngang ở
375px và 1440px; mọi khối mới nằm trong cột (max-right 1249 = mép bảng, không phải khối mới);
popup `ci` mở ra, alert mới rộng 707px trong popup; roadmap **hai chế độ sáng/tối** đều đọc được,
chip hiện `10′ · bài đầy đủ`. *Chụp màn hình trang DS không dùng được — pane preview trả frame cũ
(vẽ dở); đã kiểm bằng đo DOM thay thế.*

### Mệnh đề của review mà kiểm ra là SAI hoặc trang đã tự phòng — ĐỪNG "sửa" theo

| review nói | thực tế |
|---|---|
| "~1.000 mẫu lớp hiếm" trình bày như quy luật | **đã gắn nhãn sẵn**: "Đây là kinh nghiệm thực dụng, không phải ngưỡng lý thuyết — đường cong học tập của chính bạn mới là câu trả lời" (`s-lookup`) |
| "LightGBM 300k dòng **luôn** chạy vài giây" | trang không có chữ "luôn"; câu là "chạy vài giây bằng CPU máy bạn" |
| "Embedding + LightGBM **thường** tốt hơn cả hai" | đã có chữ "thường" ở cả hai chỗ (`dl-embed`, `dl-tab`) |
| "AUC 0,999 gần như chắc chắn leakage" | đang là **dấu hiệu điều tra**, đúng vai: bảng triệu chứng ở `s-lookup` + "phản xạ đúng không phải vui mừng mà là *tôi vừa rò rỉ ở đâu?*" ở `d-leak` |
| "15 thao tác pandas chiếm 90%" | đã khoanh phạm vi "số dòng bạn sẽ viết **trong cả dự án**", không phải phát biểu về pandas nói chung |
| "Pipeline được ráp quá muộn — người học làm cleaning + feature trước khi có mô hình tinh thần về fit/transform" | **SAI**: `t-sklearn` (bài 15, chặng 1, **ngày 3** fast track) dạy đúng bốn khái niệm estimator/transformer/**Pipeline**/**ColumnTransformer**, có luôn `pipe.fit(X_train)` vs `pipe.predict_proba(X_test)` và ba lý do. `f-pipeline` ở chặng 4 là bài **ráp đầy đủ**, không phải lần giới thiệu đầu |
| "EDA mâu thuẫn với split" | **không mâu thuẫn**: `d-eda` tách rõ **hai thì** — thì 1 trước khi chia (kiểm cấu trúc), thì 2 sau khi chia và chỉ trên train. Thứ tự `d-eda` → `d-split` vẫn là điều đáng bàn (xem dưới), nhưng "trang tự mâu thuẫn" là đọc nhầm |

### Chủ trang đã chốt ba việc lớn (trong phiên) — và việc thứ ba ĐÃ LÀM XONG

| việc | chốt | trạng thái |
|---|---|---|
| Kiến trúc `roadmap.html` | **giữ view dẫn xuất** (84 node, vẫn link "Mở bài đầy đủ →") | không đổi thêm gì ngoài mục trên |
| Đổi thứ tự mạch chính DS | **chưa đổi, ghi backlog** | số liệu ở mục dưới, đừng tự làm |
| Visualization | **vẽ mới cho DS RỒI port sang roadmap** | ✅ XONG, chi tiết ngay dưới |

### Visualization — 17 khối mới, và roadmap giờ chạy khối THẬT

**Độ phủ: 19/84 bài · 23 khối → 36/84 bài · 41 khối** (đếm bằng số mount `data-viz`
trong các `<template>`; con số nền 19/23 khớp đúng bản review). Mười bảy khối mới, mỗi khối
nằm ở đúng bài mà review §4 chỉ ra là "thiếu":

| khối | bài | nó làm được điều mà chữ không làm được |
|---|---|---|
| `loop10` | `s-pipeline` | 6 cạnh quay lui bấm được, mỗi cạnh nêu NGUYÊN NHÂN; bật chế độ "thẳng một mạch" để thấy bản đồ sai mà người mới mang trong đầu |
| `scale2d` | `m-vector` | láng giềng gần ★ **đổi người** khi bật chuẩn hoá (162k/1 lần → 140k/9 lần) |
| `baserate` | `m-bayes` | icon-array 1.000 ô; giữ recall 90%/FPR 5% rồi kéo tỉ lệ nền → precision 82% → 3,8% |
| `bootci` | `m-infer` | kéo ρ: hai khoảng riêng ĐỨNG YÊN, khoảng Δ co gần 4×; ở mọi ρ hai khoảng vẫn chồng lấn mà Δ vẫn loại 0 |
| `logskew` | `f-numeric` | cột cao nhất 99% → 9% (log) → 18% (cắt), và cắt thì 3 giao dịch 180/320/500 triệu về cùng một giá trị |
| `onehot` | `f-cat` | ma trận thật của LabelEncoder / one-hot / target encoding trên cùng 6 dòng |
| `fitdag` | `f-pipeline` | mũi tên **đổi chiều** giữa `fit` (train) và `transform` (valid/test/serve) |
| `logit` | `ml-linear` | kéo w thì đường cong đổi (mô hình), kéo ngưỡng thì đường cong đứng yên (quyết định) |
| `treesplit` | `ml-trees` | **cây thật**, tự tìm điểm chia theo Gini; sai-trên-train giảm 29→5 khi tăng độ sâu; 3 chế độ một cây / RF 30 cây / boosting |
| `calib` | `ml-imb` | đường reliability lệch hẳn khỏi đường chéo **trong khi ROC-AUC không đổi** |
| `nngraph` | `dl-backprop` | kiểm được đúng con số ở mục tự kiểm của bài: 0,25^19 = 3,6e-12; đổi ReLU hoặc bật residual thì sống |
| `tfblock` | `dl-tf` | shape (512,768) đứng yên còn tham số/bộ nhớ tăng tuyến tính — chống lại đúng chữ "vô hạn" đã sửa ở trên |
| `prodloop` | `pr-arch` | trục thời gian **đổi đơn vị**: 5 chặng đầu trong 26 ms, nhãn thật về sau 45 ngày |
| `rankk` | `q-rec` | cùng 4 sản phẩm đúng: Recall@10 giữ 100% ở cả hai thứ tự, NDCG@10 thì không |
| `causaldag` | `q-causal` | ngẫu nhiên hoá **xoá đúng một mũi tên**; chế độ hiệu chỉnh cho thấy phần nhiễu chưa đo vẫn còn |
| `funnel` | `q-analytics` | phễu + bảng nhiệt cohort (dòng T3 rơi 100%→38%, thứ trung bình toàn công ty chôn mất) |
| `ablation` | `th-stats` | bảng ablation của `th-design` vẽ lại **kèm KTC**: 2/4 dòng chồng lấn nên chưa kết luận được |

**Hai lỗi tự bắt được khi test, đã sửa** — ghi ra vì cả hai đều là loại "khối chạy đúng
nhưng dạy sai", cổng không bắt được:

1. `scale2d` bản đầu có bộ điểm mà láng giềng gần nhất **giống nhau ở cả hai thang** — tức
   là khối minh hoạ cho một hiện tượng nó không tạo ra. Đã dựng lại bộ điểm quanh hai ứng
   viên cố ý (một giống về tiền, một giống về hành vi).
2. `bootci` bản đầu có câu "kéo ρ xuống thì Δ trùm qua mốc 0" — **sai**: với σ của bài,
   Δ không bao giờ chứa 0 ở bất kỳ ρ nào. Đã đổi luận điểm sang thứ đúng và mạnh hơn:
   hai khoảng riêng chồng lấn ở *mọi* ρ trong khi Δ loại 0 ở *mọi* ρ.

**Ba chi tiết kỹ thuật đáng nhớ:**

- `treesplit` train thật nên đắt (gb 40 vòng ≈ 190 ms). Đã thêm **memo hoá theo `mode+d`**
  và gộp sự kiện. Dùng `setTimeout` **chứ không phải `requestAnimationFrame`**: rAF bị treo
  khi tab ẩn, đo được là bản vẽ cuối bị nuốt mất hoàn toàn.
- `.rm-hero__note` (và mọi chữ giải thích thật) dùng `--wb-fg-muted`, **không** dùng
  `--wb-fg-subtle`: ở sáng subtle `#a1a1aa` trên `#f7f7f8` chỉ ~2,6:1, dưới ngưỡng AA.
- Chữ nhỏ *trong SVG* thì vẫn dùng `--wb-fg-subtle` như 24 khối cũ — đúng quy ước sẵn có,
  và hợp lệ vì §10 bắt mọi thông tin trong SVG phải đọc được ở `.ds-viz__alt`.

**Port sang `roadmap.html` — không sinh bản sao code.** `build-roadmap.mjs` thêm ba hàm
`vizJs()` / `vizCss()` / `vizOfLesson()` **trích** mục 6 và các rule CSS `.ds-viz|ctrl|seg|key|
costm|fam|maptable|wf` thẳng từ `data-science-roadmap.html` lúc build, rồi drawer gọi
`initViz`. Nên CLAUDE.md §2 luật 3 vẫn đúng: code khối chỉ có MỘT bản, ở trang chính — sửa
ở đó rồi chạy lại `node tools/build-roadmap.mjs`.

- **`plan14` bị loại có chủ ý** (`VIZ_SKIP`): nó đọc `TREE`/`DAYS`/`byId`/`sumMins` của trang
  chính. Thêm khối mới mà nó đọc dữ liệu trang chính thì phải thêm tên vào `VIZ_SKIP`.
- Tám token `--ds-*` mà CSS trích cần được khai lại trong `:root` của roadmap, cùng giá trị;
  `--ds-fs` cố định **15px** vì drawer không có cột bài để giãn theo.
- Trường `viz` dạng chữ trong `roadmap-summaries.json` **không bỏ đi**: bài nào có khối thật
  thì nó tụt xuống làm chú thích (`.rm-vizcap`), bài nào chưa có thì vẫn hiện như cũ.
- roadmap.html: 222 KB → **409 KB** (mang theo mục 6 + CSS khối).

**Verify:** 17/17 khối mới mount + có `.ds-viz__alt` + có `seeBlock`; không cuộn ngang ở
**375px và 1440px** cho cả 17 bài; màu chữ SVG lật đúng theo token ở cả sáng lẫn tối;
roadmap drawer chạy khối thật (kiểm 10 bài, gồm bài nhiều khối như `q-forecast` 3 khối và
`pr-eval` 2 khối), không cuộn ngang ở 375px. `gate` CHẶN xanh · `gate.test` **49/49** ·
`audit` nhất quán · khuyến nghị vẫn đúng **5 cái G-FWD cũ**, không sinh cái mới.

*Cảnh báo cho phiên sau:* **chụp màn hình trang DS qua pane preview không tin được** — nó
trả frame vẽ dở/cũ nhiều lần trong phiên này (trang nặng ~1 MB). Kiểm bằng **đo DOM**
(`scrollWidth` vs `clientWidth`, `getComputedStyle`, đọc `textContent` của readout/alt) thì
ổn định. Trang roadmap nhẹ hơn nên chụp được bình thường.

### Hai việc chủ trang chốt HOÃN — đừng tự làm lại

1. **Đổi thứ tự mạch chính** (review §2). Số liệu kiểm ra đúng: framing (`d-framing`) đứng sau
   **22,4 giờ** (3,3h dẫn nhập + 12,2h công cụ + 6,9h toán); DL chặn đường tới product **11,25 giờ**;
   `d-split` đứng sau `d-eda`/`d-clean`. Nhưng chủ trang **vừa duyệt và làm hai move chặng ở phiên
   (m2)** (product lên trước họ-bài-toán), nên đây không phải chỗ tự ý xáo tiếp. Cũng lưu ý: 5 khuyến
   nghị `G-FWD` còn lại **chính là** phần "phụ thuộc ngược" mà review nêu — chúng là bảng theo dõi
   đang mở, không phải lỗi mới.
2. **Đổi định nghĩa `roadmap.html`** (review §5) từ *view dẫn xuất* thành *giáo trình độc lập
   25–35 node*: mệnh đề của review **đúng** (hiện vẫn 84 node / 11 chặng / 106,5 giờ, navbar +
   brand trỏ về DS, mỗi drawer có "Mở bài đầy đủ →"), nhưng chủ trang **chốt giữ view dẫn xuất**.
   Đừng revisit — kiến trúc "nội dung đầy đủ chỉ ở trang chính" mà phiên (n2) tự khai vẫn đứng.

### Vòng 2 (cùng phiên) — quét nốt những dòng review mà vòng 1 chưa chạm

Vòng 1 sửa những mệnh đề review **gọi tên trực tiếp**. Vòng 2 đối chiếu lại từng dòng của bản
review với file thật và tìm ra bốn chỗ còn hở — ba chỗ là lỗi thật, một chỗ là mệnh đề sai.

**1. Khối thứ 41: `rollwin` cho `f-time`** (§4, ô "rolling window loại dòng hiện tại"). Đây là ô
duy nhất trong bảng §4 mà vòng 1 bỏ sót — `f-time` là bài **duy nhất** của chặng 4 còn trắng viz.
Ba chế độ chính là **ba dòng kiểm tra rò rỉ ở cuối bài**, và mọi số trong bảng đều tính tại chỗ:

| chế độ | dòng đầu | z của giao dịch gian lận đầu |
|---|---|---|
| `sort` + `closed="left"` | `hist_mean` = NaN — đúng như phải thế | **109,9** |
| quên `closed="left"` | `hist_mean` = 120,0, sai lộ ra ngay dòng 1 | **2,0** |
| quên `sort_values` | NaN rơi vào giao dịch 10:05, không phải dòng đầu | 106,8 nhưng 09:12 lấy lịch sử từ giao dịch xảy ra SAU nó |

Điểm dạy được mà chữ không làm được: bỏ `closed="left"` **không** báo lỗi, và hậu quả không phải
"lệch một dòng" mà là **feature tự pha loãng bằng chính số tiền nó phải tố giác** — z tụt 55 lần.
Khối cũng nói thẳng một điều đúng ngay ở chế độ đúng: hai giao dịch gian lận *sau* có z nhỏ, vì
lịch sử của thẻ đã bị ca đầu kéo lên → `z_vs_history` phải đứng **cạnh** `secs_since_last`/`n_tx_1h`
chứ không thay được chúng.

**2. Cái bẫy im lặng trong `build-roadmap.mjs` — đáng nhớ hơn cả khối mới.** Mount đầu tiên tôi viết
là `<div class="ds-viz" data-viz="rollwin">`, còn 40 mount cũ đều là `<div data-viz="…">`. Bộ trích
`vizOfLesson()` khớp `/div data-viz="…"/` nên **bỏ khối mới mà không báo gì**: cổng xanh, build
in ra "84/84 bản tóm tắt", roadmap chỉ đơn giản là thiếu một khối. Đã sửa **hai đầu**: regex thành
`/<div\b[^>]*\bdata-viz="…"/` (nhận mọi thứ tự thuộc tính), **và** thêm một đối chiếu ở build —
khối nào được định nghĩa mà không bài nào mount thì in cảnh báo. Hiện: 40 khối định nghĩa,
41 mount, **0 khối mồ côi**.

**3. Ba con số trình bày như quy luật mà vòng 1 chưa gắn nhãn** (§1, danh sách "nên gắn nhãn
heuristic"):

- `f-what` — "feature ăn đứt mô hình": giữ nguyên luận điểm, thêm `wb-help` nói `+0,03`/`+0,12` là
  **độ lớn minh hoạ cho bài fraud này**, và nêu **ranh giới**: cán cân đảo lại khi bộ feature đã
  bão hoà, hoặc khi dữ liệu là ảnh/chữ nơi mô hình tự học biểu diễn.
- `t-numpy` — "0,3 giây so với 0,003 giây": thêm "trên một máy tính xách tay thông thường" và
  "để thấy độ lớn, không phải để trích dẫn"; bảo tự đo bằng `%timeit`.
- **7 chỗ trong `roadmap-summaries.json` còn giữ bản chưa gắn nhãn** trong khi bài đầy đủ đã sửa
  ở vòng 1 — đúng loại lỗi review §3 gọi tên ("số liệu có ngữ cảnh ở DS, sang Roadmap thành fact"):
  `t-pandas` (100 lần + mất phạm vi "90% *số dòng bạn viết*"), `t-numpy` (100 lần), `ml-tune` +
  `ml-map` ("**chỉ** +1–3%"), `s-lookup` (1.000 mẫu, mất câu "không phải ngưỡng lý thuyết"),
  `s-pipeline` + `f-what` (FE > model). **Bài học lặp lại lần thứ hai trong cùng phiên: sửa bài
  đầy đủ xong PHẢI grep lại `roadmap-summaries.json` bằng chính cụm từ vừa sửa.**

**4. Mệnh đề SAI thêm một cái** — review §3: *"Roadmap không có micro-exercise hoặc câu tự kiểm"*.
Drawer **có** mục **Tiêu chí đạt** dựng từ `ACCEPT[id]` (`build-roadmap.mjs` dòng ~474), và từ
phiên này mỗi khối port sang còn mang theo ô "Hiểu nhầm hay gặp" của `seeBlock`. Đừng thêm bài
tập riêng cho roadmap — nội dung thứ hai là đúng thứ CLAUDE.md §2 luật 3 cấm.

**Verify vòng 2:** `gate` CHẶN xanh · `gate.test` **49/49** · `audit` nhất quán · vẫn đúng 5 khuyến
nghị `G-FWD` cũ. Đo DOM ở **1280px và 375px**, cả trang DS lẫn drawer roadmap: `overflowX = 0` ở
cả trang lẫn drawer, bảng cuộn **trong hộp của chính nó** (đúng §10). Ba chế độ đổi đúng số trên
cả hai trang. *Ảnh chụp trang DS vẫn trả frame đen — cảnh báo ở trên còn nguyên giá trị.*

## Phiên 2026-08-05 (n2) — trang Roadmap học nhanh (roadmap.html) — XONG + đã push

Trang HTML thứ hai, **học theo style khác** (chủ trang giao; đã bảo "commit + push luôn, không
cần đợi review"). Đã làm + verify preview mirror + push.

**Kiến trúc — được SINH, không viết tay** (để không phạm CLAUDE.md §2 luật 3):
- `tools/build-roadmap.mjs` — đọc `data-science-roadmap.html` bằng `readPage()` (TREE/PAYOFF/
  ACCEPT/PHASE_OUTCOME/FAST/weekOf) + `tools/roadmap-summaries.json` → sinh `roadmap.html`.
  Chạy lại: `node tools/build-roadmap.mjs`.
- `tools/roadmap-summaries.json` — **dữ liệu** tóm tắt 84 bài (tldr + 3–6 points + viz), sinh
  bằng **Workflow `ds-roadmap-summaries`** (11 agent, mỗi agent một chặng, đọc slice HTML rồi
  rút gọn; 11/11 done, 0 lỗi). Đây là NGUỒN của phần tóm tắt — sinh lại khi nội dung chính đổi.
- `roadmap.html` — **sản phẩm sinh ra** (không sửa tay). Nội dung ĐẦY ĐỦ vẫn chỉ ở trang chính;
  mỗi node có link "Mở bài đầy đủ →" trỏ `data-science-roadmap.html#/id`.

**UI:** navbar = 1 logo (trỏ về trang chính) + 1 nút đổi theme (chung khoá `ds-theme` với trang
chính, nên theme đồng bộ hai trang). Đường đi kiểu timeline (xương sống dọc nét đứt, node so le
hai bên, header mỗi chặng có badge số + outcome), 84 node / 11 chặng. Node tô theo ưu tiên
(core đặc / good viền / skim nét đứt), ★ cho bài sao, **✓ xanh cho bài đã đạt** (đọc localStorage
`ds-roadmap-progress-v3` của trang chính — cùng origin). Bấm node → **drawer phải 1/2 cửa sổ**
(đo đúng 640/1280) với: chip ưu tiên/thời lượng/fast/tuần · tldr · Kiến thức chính (points) ·
Hình/ví dụ (viz) · Xong bước này (payoff) · Tiêu chí đạt (accept) · link mở bài đầy đủ. Esc/✕/
click nền để đóng. Verify: light+dark, drawer 3 bài (f-cyclic/ml-metrics/d-leak) nội dung đúng.

**Link vào:** navbar trang DS — tách "Roadmap" khỏi brand (`<a>` không lồng `<a>`) thành
`.ds-brand__road` trỏ `roadmap.html`, giữ hình `Data Science │ Roadmap`.

**Cần chủ trang quyết (đã ghi để review):**
- **Tóm tắt drift**: summaries.json KHÔNG tự kiểm khớp nội dung chính như TOC.md. Nội dung chính
  đổi → chạy lại workflow + `build-roadmap.mjs`. Chưa có cổng canh việc này (có thể thêm nếu muốn).
- Có muốn đưa `roadmap.html` vào cổng/`session.mjs` không, hay để ngoài luồng gate.
- Drawer hiện KHÔNG kéo được (cố định 1/2 theo yêu cầu). Nếu muốn kéo 1/4–1/2 như trang chính thì
  dùng lại `makeEdgeResizer`.

## Phiên 2026-08-05 (n) — 10 sửa UI theo yêu cầu chủ trang (đã verify preview + cổng xanh)

Mười việc chủ trang liệt kê, làm hết + verify bằng preview mirror (xem "Chạy preview" cuối file):

1. **Pháo giấy khi đạt bài** — `celebrate()` (canvas `#dsConfetti`, z-index 2147483647,
   `pointer-events:none`, ~2,3s tự dọn, tôn trọng `prefers-reduced-motion`). Gọi từ `setLevel()`
   khi lần đầu chạm `maxLevel` → cả pip cây lẫn nút cuối bài đều bắn; load/undo/import KHÔNG bắn.
   Verify: `getImageData(0,0)` alpha 0 (trong suốt), hash không đổi. Doc: design.md §9.
2. **Bỏ tự nhảy bài** khi đạt mức cao nhất (xoá `setTimeout location.hash = next`). Verify: hash
   giữ `#/s-how` sau khi bấm "Đã đọc xong".
3. **Gom ghi chú theo bài** — `renderNotes()` gom nhóm, tách `noteItem()`; tiêu đề nhóm = tên bài
   (link mở bài), số ghi chú + số tắc; nhóm xếp theo ghi chú mới nhất; trong nhóm mới-nhất-trước.
   Bỏ `.ds-notes__at` (tên bài từng ở mỗi dòng). Doc: design.md §0.5 điểm 1 & 3.
4. **h1 không còn viền tiêu điểm khi tải bài** — bỏ `#main h1:focus-visible` box-shadow. Tiêu điểm
   vẫn dời (đọc màn hình vẫn nghe); h1 `tabindex=-1` nên Tab không tới, viền chỉ từng hiện từ cú
   dời tiêu điểm khi đổi bài.
5. **Chân trang → tiếng Anh.** Doc: CLAUDE.md §11 + design.md §0.1 (chân trang chuyển sang vùng English).
6. **Drawer: sàn 1/4, trần 1/2 cửa sổ** cho CẢ dock `Notes` lẫn ngăn phụ — `makeEdgeResizer` thêm
   `minRatio`; hai lời gọi `minRatio:.25, maxRatio:.5` (trước là `maxRatio:.72`, không có sàn tỉ lệ).
   Sàn px cứng (280/340) giữ làm lưới an toàn. Verify aria 1280px: dock 320–640, aside 340–640. Doc:
   design.md §0.5 + §1.2.
7. **Thanh bên: nới `#sidenav` padding phải 12→22px** để thanh cuộn nổi macOS không che cột phút (r/x/d).
8. **Không cho bôi đen chữ** ở navbar / thanh bên / chân trang (`user-select:none` + `-webkit-`),
   **trừ `#searchBox`** (`user-select:text`). Verify computed style.
9. **Nút xoá ô tìm kiếm** — `#searchClear` (kit `wb-input-group__btn`), chỉ hiện khi ô có chữ; bấm
   xoá + chạy lại tìm + trả tiêu điểm. Cần `.ds-searchclear[hidden]{display:none}` vì
   `.wb-input-group__btn{display:inline-flex}` của kit đè UA `[hidden]` (cùng bẫy `.ds-undo[hidden]`).
10. **(gộp trong 3)** — không có việc thứ 10 riêng; danh sách chủ trang có 9 mục + xác nhận nguyên tắc
    "cái gì reuse/tokenize/componentize đều phải document" → đã cập nhật CLAUDE.md §11, design.md §0.1/
    §0.5/§1.2/§8/§9.

**Cố ý KHÔNG đổi:** (a) DEFAULT bề rộng drawer (dock 1/4, aside 1/3) — chủ trang chỉ đổi giới hạn
kéo, không đổi mặc định. (b) Pháo giấy bắn cho MỌI bài chạm maxLevel kể cả bài đọc-xong mức 1 — hợp
với `is-done` sẵn có. (c) Màu pháo giấy là palette lễ hội cố định, KHÔNG token theme — nó là hiệu ứng
thoáng qua, không phải chrome bền. (d) Các G-FWD cũ (PR-AUC, rò rỉ dữ liệu…) — ngoài phạm vi, không đụng.

**Preview mirror (vì sandbox chặn getcwd trên repo — xem memory):** serve từ scratchpad
(`serve-site.py` root `scratchpad/site`, cổng 8808); mirror gồm `web-builder/web-builder.css` +
bản copy HTML. Sau mỗi Edit chạy `scratchpad/sync.sh` rồi navigate lại. `.claude/launch.json` = `ds-mirror`.

## Phiên 2026-08-04 (m2) — hai move chặng giáo trình (chủ trang duyệt cả hai)

Chủ trang duyệt **cả hai** move trong backlog "Quyết định giáo trình" (phiên m Vòng 2); đã làm
**xong cả hai + verify bằng preview sống**:

- **`t-stack` → chặng 10**: ✅ **XONG + verify** (đổi id `t-stack`→`r-stack`, đưa lên đầu chặng 10;
  bỏ khỏi tuần 1 + ngày 3 fast track; thêm vào tuần 8; sửa `PAYOFF` t-sklearn→toán, r-stack→
  r-roadmapsh; `READONLY_OK`. Cổng xanh, preview xác nhận r-stack render ở chặng 10, hết `#/t-stack`.)
- **Dời chặng 7 (q-\*, họ bài toán) xuống sau chặng 8 (pr-\*, product)**: ✅ **XONG + verify** —
  làm theo docs/editing.md việc 3, các bước:
  1. Dời khối template `q-*` (`q-regress`…`q-mini`) ra **sau** khối `pr-*` (trước `th-topic`).
  2. `TREE`: đưa block `p7` xuống sau `p8`; **đổi số ở `t`**: p8 → "7 · …", p7 → "8 · …" (giữ `id`).
  3. `WEEKS`: hoán nội dung tuần 6↔7 (product = tuần 6, họ-bài-toán = tuần 7); `mile:'Mốc 2'` đi
     theo q-mini sang tuần 7; sửa các câu `next`. **Kiểm**: q-* cần DL (tuần 5) vẫn đứng trước; product
     không cần q-* → không sinh phụ thuộc ngược.
  4. `DAYS`: **không đổi** — q-* không nằm trong fast track, và DAYS vốn đã interleave (th-topic ngày 11
     trước pr-* ngày 12), nên auditPlan không ép DAYS theo thứ tự TREE.
  5. `PAYOFF` 3 nhịp nối: `dl-tab`[1]→product · `pr-cost`[1]→họ-bài-toán · `q-mini`[1]→luận văn.
  6. **~9 câu văn "chặng 7/8"** phải lật (chỉ 7↔8; chặng 6/9 giữ) — không cổng nào bắt, phải grep tay:
     dòng ~2827/2832/3203/3256/3286/6451 (họ-bài-toán, 7→8) · ~2918 card + ~10174 DAYS note (product, 8→7)
     · ~5810 "chặng 7–8" (kiểm nghĩa trước khi sửa).
  7. **"Sơ đồ phụ thuộc" trong `s-plan8w`**: hoá ra KHÔNG phải SVG riêng — nó là bảng tuần
     `#planWeeks` render từ `WEEKS` (needs/next), tự cập nhật. Không phải sửa tay.
  `PHASE_OUTCOME`/`COMP_PHASE` đánh theo `id` → không đổi. (Đã đổi id chặng: **không**; chỉ đổi
  số hiển thị trong `t` — p8→"7·", p7→"8·".)

  **Verify (preview 8806):** trang chủ thứ tự **6 DL → 7 Product → 8 Họ bài toán → 9 Luận văn →
  10 Tra cứu**; lịch 8 tuần: **tuần 6 = Sản phẩm, tuần 7 = Mốc 2 Các họ bài toán, tuần 8 = Mốc 3**;
  `pr-arch`/`q-regress`/`q-mini`/`pr-cost` render đúng chương. Cổng CHẶN xanh, **không sinh G-FWD
  mới** (còn đúng 5 khuyến nghị cũ; "bootstrap" tự hết vì r-stack xuống cuối). Prose đã kiểm: pr-*
  không nhắc chuyển-giao/mini-project, q-* nhắc "sản phẩm/API" đều là nghĩa chung → không vỡ theo
  thứ tự. 12 câu "chặng 7/8" + ~10 câu "tuần 6/7" đã lật đúng chiều (grep xác nhận).

**Preview đã sửa** (không còn mù): `serve-live.py` trong scratchpad phiên này serve mirror **sống**,
launch.json thêm entry `ds-live` (cổng 8806). Sau mỗi Edit chạy `sh <scratch>/sync-preview.sh` rồi reload.
Server cũ `ds-review` (8805) serve bản mirror của phiên khác — **bỏ, đừng dùng**.

## Phiên 2026-08-04 (m) — thực thi các sửa nội dung mà phiên (l) §2 thẩm định là "đáng sửa"

Yêu cầu: *"làm tất cả handoff mới thêm từ commit e189805"* — tức thực thi các sửa nội dung mà
phiên (l) đã thẩm định trong §2 nhưng **cố ý hoãn** (xem "Cố ý KHÔNG làm" của phiên l). Đã làm
đúng hai nhóm phiên (l) gắn nhãn **"đáng sửa (P0 factual)"** + **"tinh chỉnh precision"**, cộng
một clarification phiên (l) khuyến nghị. **Không** đụng nhóm "đừng sửa theo review" và các quyết
định của chủ trang.

### Đã sửa — 7 chỗ, 6 bài

1. **`q-forecast` MASE** (P0): mẫu số đổi sang MAE naive-**một bước trên train** (Hyndman) —
   `d = mean_absolute_error(y_train.iloc[1:], y_train.shift(1).iloc[1:])`. Thêm một đoạn tách
   rõ: chia cho naive **trên test** (code cũ) là **relative MAE**, không phải MASE. Giữ tên
   "MASE" làm chỉ số chính (mục tiêu bài hứa MASE), nhưng gọi đúng cả hai.
2. **`q-forecast` gap** (precision): tách `gap` = **độ trễ dữ liệu**; **tầm dự báo** (horizon)
   nằm ở cách dựng target, không ở `gap`. Bỏ hàm ý "gap=7 ⇒ dự báo trước 7 ngày".
3. **`dl-tab` multimodal** (P0): "Chỉ mạng nơ-ron kết hợp được" → "kết hợp **end-to-end** trong
   một mô hình thường phải là NN", trỏ thẳng tới mục embedding→LightGBM cuối bài — chỗ trước đây
   **tự mâu thuẫn**.
4. **`dl-llm` post-training** (P0): thêm đoạn hedge — "mọi khả năng nổi lên từ đoán token" mới
   là **tiền huấn luyện**; hành vi bám chỉ dẫn/từ chối đến từ **hậu huấn luyện** (SFT→RLHF);
   decoder-only không phải kiến trúc duy nhất (có encoder-decoder). SFT/RLHF gloss tại chỗ (§11).
5. **`ml-metrics` AP** (precision): thêm một câu — `average_precision_score` = **AP**, là ước
   lượng PR-AUC sklearn khuyên; **đừng** đổi sang `auc(recall, precision)` (nội suy tuyến tính
   cho số lạc quan giả — đúng cái review đề xuất mà sklearn khuyên tránh). Giữ tên "PR-AUC" xuyên
   suốt (§11).
6. **`ml-shap` log-odds** (clarification): thêm câu ở chỗ "cộng lại đúng bằng" — với mô hình cây
   "dự đoán cuối" là **log-odds**, phép cộng đúng bằng ở thang đó chứ không phải xác suất; sửa
   câu đọc beeswarm thành "mức đẩy dự đoán **theo log-odds**". (Review nói trang sai "= xác suất"
   — trang không hề nói thế; đây là làm rõ, không phải sửa lỗi.)
7. **`d-leak` rò rỉ nhóm** (precision): thêm câu — "sụp khi gặp khách mới" chỉ đúng khi hệ thống
   chấm **entity mới**; nếu luôn gặp lại thẻ cũ thì cùng entity hai bên không đương nhiên là rò
   rỉ, tuỳ kịch bản. Giữ group-split làm mặc định an toàn.

Chạm vào: 6 template bài (`q-forecast` ×2, `dl-tab`, `dl-llm`, `ml-metrics`, `ml-shap`, `d-leak`)
· `TOC.md` (số dòng). **Không** đổi CSS/JS/layout. Cổng CHẶN đều qua, **G-SYNTAX xanh**.

**Chưa xem được bằng mắt trên trình duyệt:** preview_start ở sandbox này serve một **bản mirror
cũ** của repo (đo được: server trả 942 KB, file thật trên đĩa 1,20 MB; restart server không cập
nhật). Đã xác minh bằng `grep` trên đĩa (cả 7 chỗ có mặt) + cổng `G-SYNTAX` (script phân tích
được). Vì đây là sửa **chữ trong template tĩnh**, markup y hệt các khối anh em cùng bài, và không
có math `$…$` mới, rủi ro render ≈ 0. Nếu muốn render thật thì mirror sang scratchpad rồi serve
(xem memory `preview-sandbox-mirror`).

### Vòng 2 — làm nốt backlog "CHƯA LÀM" (chủ trang: "làm nốt cho tôi")

- **`f-cyclic` Cách 4 → popup** ✓ (backlog "Còn nợ thật", mục được gọi là "đáng dời nhất"):
  "Cách 4 · SplineTransformer" rời mạch chính vào popup `data-mathdef="cyclicspline"`; đổi tiêu
  đề "bốn cách"→"ba cách"; nút mở đặt cuối mục "Đa hài". Popup đếm 27→28, `G-REF` xanh. Mạch
  chính giờ = sin/cos ở ba mức + đa hài; spline là đào sâu tuỳ chọn. (Nút mở popup nên xem bằng
  mắt khi preview render được — cơ chế y hệt 27 popup cũ nên rủi ro thấp.)
- **`r-roadmapsh` verify** ✓ (backlog): đọc lại — bài **đã** là bản dịch giữ/để-sau/bỏ + mục
  "roadmap.sh thiếu gì", KHÔNG phải bài hơn-thua ("roadmap.sh làm tốt đúng việc nó định làm").
  Không cần sửa; gạch khỏi backlog.
- **Rà thời lượng** (spot-check): pr-code 150′, dl-attn 120′, s-intro 40′ — không số nào bất
  thường lộ ra. Rà kỹ từng bài vẫn để mở (open-ended, không phải lỗi).

### Backlog "Quyết định giáo trình" — chủ trang duyệt, đã làm

- **Dời chặng 7 (họ bài toán, q-*) xuống sau chặng 8 (product)** và **`t-stack` → chặng 10**:
  chủ trang duyệt cả hai → **đã làm + verify**. Chi tiết + kết quả verify ở mục **Phiên (m2)**
  đầu file.
- **`th-defense` timeline → `wb-steps`**: HOÃN — cần xem căn chỉnh bằng mắt ("tâm mốc khớp tâm
  tiêu đề, đo ra 0") mà preview đang serve bản cũ. Làm khi preview render được.
- **Giữ nguyên theo khuyến nghị**: `f-store` (giữ, skim 30′), `q-analytics` (giữ), nhãn
  Foundation/Applied/Advanced (không thêm — chỉ tăng nhiễu). `ml-loss` zoo optimizer & `dl-train`
  bảng gỡ lỗi: ưu tiên thấp, để nguyên trên mạch chính.

### Cố ý KHÔNG làm trong phiên này

- **Nhóm "Review SAI / trang đã tự phòng"** (phiên l §2): `ml-linear`/`m-prob` phân phối chuẩn,
  `dl-tab` "không cấu trúc" (đã trích Grinsztajn), production/thesis heuristic (PSI/latency/
  defense đã hedge sẵn), MLflow-log-test. Không đụng — trang đã đúng.
- **`ml-loss`/`ml-linear`** ("loss không luôn GD" / "logistic↔LightGBM đo interaction"): phiên l
  đánh giá là simplification nhẹ, đã có aside `x-tree-learn`. Bỏ qua.
- **6 khuyến nghị `G-FWD`** (PR-AUC / rò rỉ / Pipeline / bootstrap / embedding / attention dùng
  trước bài dạy): **nợ giáo trình có sẵn**, quyết định của chủ trang — không nhồi allowEarly
  (§4 + "Còn nợ thật"). Các sửa phiên này **không thêm G-FWD mới** (mọi bài chạm đều ở/sau bài
  dạy khái niệm liên quan).
- **Cột 1060px / chữ 14–15px / thứ tự bài**: quyết định của chủ trang (§10). Review khuyên đổi
  nhưng **phải hỏi** — không tự đổi.
- **Không đổi tag `.ds-codecap`** (`<div>` vs `<p>` còn lẫn): là việc dọn dẹp riêng của phiên (l),
  không thuộc phạm vi "sửa nội dung theo review".
- **Không commit/push**: chủ trang chưa yêu cầu. Và `pre-push` chưa cài (G-HOOK) — chạy
  `tools/install-hooks.sh` trước khi push (push `main` = deploy).

## Phiên 2026-08-04 (l) — chốt một chiều cho `.ds-codecap`, và thẩm định một bản review nội dung

Hai việc: (1) chốt chiều cho nhãn tên file `.ds-codecap` (việc mà phiên (k) cố ý hoãn, xem
mục "Cố ý KHÔNG làm" của nó); (2) thẩm định một báo cáo review kỹ thuật của trang — chủ
trang hỏi "review này đúng hay sai".

### 1. `.ds-codecap` — chốt **NHÃN DƯỚI** (caption), KHÔNG phải "nhãn trên" như spec khuyến nghị

Đọc cả 33 nhãn: **23/33 vốn đã là nhãn-dưới**, và cả trục dự án (`t-ai`, `pr-code`,
`pr-eval`, `pr-serve`) đặt tên file **sau** khối code. Chỉ 10 nhãn ở các bài giải-thích
(`t-env`, `t-online`, `t-colab`, `f-time`, và "bốn cách" của `f-cyclic`) đang là nhãn-trên.

**Chốt nhãn-dưới, tức NGƯỢC khuyến nghị "nhãn trên" trong spec chủ trang gửi.** Bốn bằng
chứng cho thấy nhãn-dưới mới là ý đồ tác giả, spec đếm "24 sau / 16 trước" nhưng không cân
ba thứ dưới:

1. **23/33 đã là nhãn-dưới** — nhãn-trên phải dời 23, nhãn-dưới chỉ dời 10.
2. **Đuôi chú thích tố cáo vai caption**: `— trích`, `· phần so sánh`, `· chạy: uvicorn…`,
   `(test cho API nằm ở bài sau)`. Đọc là chú thích cho cái *vừa xem*, không phải tiêu đề.
3. **Bài dự án đã có `<h2>N · src/X.py</h2>` đặt tên file TRƯỚC code** — để nhãn lên trên
   nữa là lặp tên file ngay cạnh heading.
4. **Cơ chế CSS**: nhãn-dưới xử được sạch bằng `margin-top` âm (xem dưới); còn "nhãn trên"
   thì spec nói CSS `margin-bottom: tight` đã sẵn — đúng, nhưng chỉ đúng cho 10 nhãn kia.

Đã dời 10 nhãn giải-thích xuống dưới khối code của chúng. Sau đó **cả 33 nhãn đều đứng ngay
sau một `</div>` khối code** (kiểm bằng awk: 0 nhãn không có `</div>` liền trên).

**Nhịp lệch (CSS)** — `.ds-prose > .ds-codecap { margin: calc(var(--ds-sp-tight) −
var(--ds-sp-block)) 0 var(--ds-sp-block) }`. `margin-top` âm = `tight − block`, collapse với
`margin-bottom: block` của khối code (`.ds-codewrap`) ngay trên → hở còn đúng `tight` (6px);
hở xuống khối sau = `block` (20px). **Phải đặt ở `.ds-prose > .ds-codecap` (0-2-0)** vì
`.ds-prose p` (0-1-1) đè base `.ds-codecap` (0-1-0) — lần đầu tôi bỏ rule prose đi và nhịp
ra ngược (đo được 20/14 thay vì 6/20), thêm lại thì đúng. Popup/drawer cũng là `.ds-prose`
(rule §324) nên một rule này phủ cả ba nơi.

**Đã đo trên trình duyệt** (`t-env`, nhãn "Colab / Codespaces…"): `gapAbove=6px`,
`gapBelow=20px`, `margin-top:-14px`, `margin-bottom:20px`. Nhãn popup dùng đúng rule đó.

Chạm vào: `(khung: CSS)` + 10 chỗ dời nhãn trong thân bài · `TOC.md` (số dòng).

**Nếu chủ trang muốn "nhãn trên" như spec:** lật lại là dời 23 nhãn còn lại lên trên khối
của chúng và đổi CSS về `margin: var(--ds-sp-block) 0 var(--ds-sp-tight)` (bỏ margin âm).

### 2. Thẩm định bản review — phần lớn ĐÚNG, vài chỗ SAI hoặc trang đã tự phòng

Không sửa nội dung theo review trong phiên này (các mục là **quyết định giáo trình**, và §1
đã là một thay đổi đủ lớn cho một lần push). Kết luận từng ý, để phiên sau / chủ trang xử:

**Đúng, đáng sửa (P0 factual):**
- `q-forecast` **MASE**: code chia cho `mean_absolute_error(y_true, pred_naive)` = MAE naive
  **trên tập test**; định nghĩa chuẩn (Hyndman) dùng MAE naive **một bước trên train**. Đang
  là "relative MAE", gọi tên MASE là sai định nghĩa. → nên đổi mẫu số, hoặc đổi tên chỉ số.
- `dl-tab` dòng "**Chỉ mạng nơ-ron kết hợp được** [multimodal] trong một mô hình" — sai và
  **tự mâu thuẫn** với đúng đoạn dưới nó (dạy dùng embedding của NN làm feature cho
  LightGBM = kết hợp modal trong mô hình không-NN). → nới thành "kết hợp *end-to-end* trong
  một mô hình thường là NN".
- `dl-llm` "Transformer decoder-only… đúng **một** nhiệm vụ đoán token; **mọi khả năng nổi
  lên từ đó**" — bỏ qua post-training (SFT/RLHF) và LLM encoder-decoder. Đơn giản hoá được
  cho intro, nhưng với nguồn trích luận văn nên hedge một câu.

**Đúng nhưng nhẹ / là tinh chỉnh precision:**
- `ml-metrics` **AP vs PR-AUC**: `average_precision_score` là **AP**, không phải diện tích
  hình thang dưới PR. Gọi "PR-AUC" là quy ước phổ biến nhưng thiếu chính xác. **Lưu ý**: đề
  xuất của review ("tính bằng `auc(recall, precision)`") lại là cách sklearn **khuyên tránh**
  — nếu sửa thì nên ghi "PR-AUC (Average Precision)", đừng đổi sang `auc`.
- `f-time`/`d-leak` leakage: review đúng rằng (a) cửa sổ chứa giao dịch hiện tại không tự
  động là leakage nếu giá trị có sẵn lúc chấm điểm; (b) cùng entity ở train/test chỉ sai nếu
  triển khai để dự đoán entity **mới**. Trang dạy mặc định bảo thủ (đúng, an toàn) nhưng lý
  do nêu ra ("sụp khi gặp khách mới") là **tuỳ kịch bản triển khai** — đáng thêm một câu.
- `q-forecast`/`ml-cv` `gap`: đúng rằng `gap` xử **độ trễ dữ liệu**, không tự biến bài thành
  "dự báo trước k bước" (horizon nằm ở cách dựng target). Trang có nói rời ở bước 2 quy trình
  nhưng câu "đặt gap=7 ⇒ dự báo trước 7 ngày" là đơn giản hoá dễ gây nhầm.
- `ml-loss`/`ml-linear`: "loss không luôn tối ưu bằng GD" — đúng, nhưng trang đã có aside
  `x-tree-learn`; "khoảng cách logistic↔LightGBM đo interaction" — đúng là đo cả phi tuyến,
  simplification nhẹ.

**Review SAI hoặc trang đã tự phòng (đừng sửa theo):**
- `ml-shap`: review nói câu "base + SHAP = **xác suất**" là sai. Nhưng trang viết "= **dự
  đoán cuối**" (không nói xác suất) — với `TreeExplainer(model_output="raw")` tính cộng đúng
  ở không gian log-odds, nên trang KHÔNG sai. (Đáng thêm một câu "trục là log-odds, không
  phải xác suất" cho rõ, nhưng claim của review là đọc nhầm.)
- `ml-linear`/`m-prob` "hồi quy tuyến tính không đòi predictor phân phối chuẩn": trang KHÔNG
  hề đòi thế — `m-prob` nói giả định chuẩn "cho khoảng tin cậy của hồi quy", đúng. Review
  dựng một claim trang không nêu.
- `dl-tab` "tabular không có cấu trúc": trang nói rõ "cấu trúc **không gian/tuần tự**" và
  trích **đúng Grinsztajn 2022** — chính nguồn review tự dẫn. Trang đã đúng và có nguồn.
- **Production/thesis (PSI, latency, retrain, defense)**: review bảo "phải ghi là heuristic".
  Trang **đã ghi rồi**: PSI "là quy ước ngành… không phải định lý — hãy trích dẫn nguồn"
  (`pr-monitor`); latency "ngân sách công nghiệp **thường** là 100ms"; defense "con số cụ thể
  **tuỳ trường**". Và `th-defense` mở đầu "không tuyên bố đọc xong là sẵn sàng bảo vệ".
- **"Log test metric trong MLflow mâu thuẫn mở-test-một-lần"**: trang không bảo log test mỗi
  run — MLflow ghi param/val, `final_eval.py` mở test một lần riêng. Đây là lo ngại giả định
  của review, không phải lỗi trang.

**Mục 2/3 của review (thứ tự bài; cột 1059px; chữ mobile 14px):**
- 6 khuyến nghị `G-FWD` (leakage/PR-AUC/… dùng trước bài dạy) trùng đúng phần "thứ tự" của
  review — **nợ giáo trình có sẵn**, là quyết định của chủ trang.
- Cột **1059px / 152 ký tự/dòng** và **chữ 14–15px** là **quyết định của chủ trang** (§10
  CLAUDE.md), không phải lỗi. Review khuyên hạ về 70–80ch/chữ to hơn — **đừng tự đổi, phải
  hỏi**. Ghi ở đây để phiên sau không "sửa theo review".

### Cố ý KHÔNG làm trong phiên này

- **Không sửa nội dung theo review** — xem §2, phần lớn là quyết định giáo trình / đã tự
  phòng, và trộn vào cùng lần push với §1 là quá tải một commit.
- **Không đổi `--ds-measure` / `--ds-fs`** dù review nêu — quyết định của chủ trang.
- **Không đổi tag nhãn** (`<div>` vs `<p class="ds-codecap">` còn lẫn): không thuộc phạm vi
  "chiều nhãn", và cả hai đều khớp `.ds-prose > .ds-codecap`. Nếu muốn sạch thì đổi 3 chỗ
  `<div class="ds-codecap">` (`t-online`) sang `<p>`.

## Phiên 2026-08-04 (k) — token hoá spacing/cỡ nút, một tên cho một bậc chữ, stepper về một loại, drawer 1/3 kéo được

Chủ trang yêu cầu: ba nhóm **chuẩn hoá dùng chung** (chữ / kích thước / margin-padding) và
bốn **góp ý cụ thể**. Nguyên tắc xuyên suốt phiên: chỉ dồn chỗ khai báo về một nơi, **không**
đổi giá trị hiện ra mắt — trừ chỗ chính chủ trang chỉ ra là sai.

### Thang khoảng cách `--ds-sp-*` (7 bậc, khai theo QUAN HỆ)

Đo trước khi sửa: 85 bài × **1686 cặp khối liền nhau** ra **9 nhịp** khác nhau, trong đó
13/14/16px là ba giá trị gần trùng cho cùng một quan hệ (823 cặp), và **0px × 24** — đúng lỗi
chủ trang thấy: `.wb-alert` của kit **không khai margin nào cả**, nên 23 chỗ có alert dán sát
khối ngay dưới. Sau khi token hoá: **6 nhịp, hết hẳn 0px.** Cách đo ở design.md §0.6.

Quyết định đáng ghi: nhịp "khối ↔ khối kế tiếp" khai **một danh sách gộp** trong `<style>`
chứ không rải mỗi component một rule — nó là một *quyết định*, nên phải đọc được ở một chỗ.
Và **nhích quang học ≤5px bên trong component + padding ngang của component KHÔNG lên thang**,
có chủ ý: chúng là hình dạng của component, không phải nhịp của trang.

### Một bậc chữ, một tên

Thang `--ds-t-*` đã có từ phiên trước; việc còn lại là 22 chỗ gõ `--ds-t-*` và **50 chỗ gõ
`--wb-text-*`** cho cùng những bậc đó (tầng 2 làm chúng bằng nhau *bên trong* `#main`), nên
đọc code không biết một rule thuộc cột bài hay lớp vỏ. Đổi 43 rule phía cột bài sang
`--ds-t-*`, giữ `--wb-text-*` cho lớp vỏ và cho **một** rule trải cả hai lớp
(`.ds-keyhint kbd, .ds-prose kbd, .ds-notes kbd` — alias đang làm đúng việc nó sinh ra để làm).

**Chứng minh no-op:** đo `font-size` của **263 khoá phần tử** trên 85 bài, so bản mới với bản
`HEAD` nạp trong iframe cùng cửa sổ → **đúng 1 chỗ đổi**, là chỗ cố ý:
`.ds-viz__readout` 28px → 25,8px (`--ds-t-hero`) vì nó đang là `clamp(20px, 3vw, 28px)` —
vừa `vw` trần (phạm luật §0.4) vừa ngoài thang.

### Bốn góp ý

1. **Chip nét đứt mất nét khi hover** — `.ds-math:hover` và `.ds-aside:hover` đều đặt
   `border-style: solid`. Bỏ, đổi `border-color` thay vì `border-style`: nét đứt là *nghĩa*
   của chip ("bỏ qua được"), không phải trạng thái nghỉ.
2. **Dấu `+` sai nghĩa** → `chevron_right`. `+` đọc ra "thêm một cái nữa"; chip này đưa người
   đọc *tới* một ngăn đã có sẵn. Chú thích trong code vốn đã ghi `›` từ đầu — `add` là chỗ
   code trôi khỏi chú thích.
3. **Drawer**: `--ds-aside-w` = 1/3 cửa sổ (thay 660px cứng), **kéo được** bằng đúng
   `.ds-grip` + đúng `makeEdgeResizer()` của dock `Notes` — tách hàm chung thay vì chép 80
   dòng lần thứ hai. Khoá cuộn trang khi lớp phủ mở (`inert` không chặn bánh xe chuột);
   `scrollbar-gutter: stable` đặt **vô điều kiện** nên nội dung dịch ngang **0,00px**.
4. **Stepper**: trang chủ có **stepper thứ hai tự vẽ** (`.ds-map__phase` + `.ds-map__num`
   34px) — cùng hình, gõ lần thứ hai, và thiếu đường nối. Đổi sang `wb-steps`, xoá hai class
   đó. Mốc canh giữa dọc với tiêu đề áp cho **mọi** stepper bằng grid + `display: contents`;
   đo lại lệch tâm **0,00px** ở cả 4 stepper, ở 1440px và 375px (bản cũ lệch 3px một dòng,
   12px hai dòng).

### Cổng mới `G-SYNTAX` — vì tôi tự dính đúng cái bẫy nó canh

Giữa phiên tôi thêm một comment HTML vào trong template literal của `renderHome()`, và comment
đó chứa dấu **backtick**. Một backtick là đứt template → `SyntaxError` → **không hàm nào được
định nghĩa** → trang chỉ còn cái vỏ. Và **cả 9 cổng CHẶN vẫn xanh**, vì tất cả đọc HTML như
văn bản; không cổng nào hỏi "script này có chạy được không".

Đó là loại lỗi tệ nhất bộ cổng có thể bỏ sót: hậu quả tối đa, diff nhìn vô hại nhất (một
comment), và người đang sửa CSS không có lý do nào để mở trình duyệt kiểm lại JS. `G-SYNTAX`
bóc script dài nhất rồi `new Function` — chỉ phân tích, không chạy, ~10ms. Ca test dựng lại
**đúng** hình dạng lỗi đã xảy ra, không phải một lỗi cú pháp bất kỳ.

Chạm vào: `(khung: CSS / script / dữ liệu)` · `tools/gate.mjs` · `tools/gate.test.mjs`

### Cố ý KHÔNG làm trong phiên này

- **KHÔNG đổi `--ds-measure` (1060px) và `--ds-fs` (15px).** Chúng là quyết định của chủ
  trang (CLAUDE.md §10). Việc token hoá giữ nguyên mọi giá trị hiện ra mắt.
- **KHÔNG đảo nhịp lệch cho `.ds-codecap`.** Nhãn tên file phải dính khối nó gọi tên và cách
  xa khối kia — nhưng 33 nhãn trong bài đang dùng **cả hai chiều**: 5156 và 3554 gọi tên khối
  DƯỚI, còn 1862 (`tests/conftest.py`) gọi tên khối TRÊN (khối trên nó là các pytest fixture).
  Chừng nào hai chiều còn lẫn nhau thì mọi nhịp lệch đều sai một nửa số chỗ, nên nhịp giữ đối
  xứng. Đây là lỗi **nội dung**, sửa cần đọc từng khối code — không phải việc của một phiên CSS.
- **KHÔNG bắt 10px và 12px lên thang bằng cách thêm bậc.** Chúng được map theo *vai* (10 → nhãn
  ↔ thân = `near`; 12 → hai khối khác nhau = `text`). Thêm một bậc 11px thì thang thành 8 bậc và
  mất luôn lý do tồn tại của nó.
- **KHÔNG khoá cuộn của thanh bên** khi lớp phủ mở — chủ trang nói "thanh cuộn của main web",
  và thanh bên là vùng cuộn riêng có thể đang ở vị trí người đọc muốn giữ.
- **KHÔNG sửa 6 khuyến nghị `G-FWD`** (PR-AUC, rò rỉ dữ liệu, Pipeline, bootstrap, embedding,
  attention dùng trước bài dạy). Có từ trước phiên này, và cách sửa là quyết định giáo trình.

### Đường nối stepper: `--wb-border-strong`, chủ trang chốt

Đường nối lúc đầu dùng `--wb-border` của kit, và ở chế độ sáng nó ra 228,228,231 trên nền
247,247,248 — tương phản **1,19:1**, sát ngưỡng thấy được. Chủ trang duyệt đổi lên bậc kế tiếp
có sẵn của kit: **sáng 1,19 → 1,38:1 · tối 1,30 → 1,59:1**, và token tự đảo đúng chiều ở tối.

Lý do đáng ghi để phiên sau không kéo về `--wb-border` cho "nhất quán hairline": đường này
**không cùng loại** với hairline chia ô bảng. Nó là thứ duy nhất nói *"các mốc này là MỘT
chuỗi"* — nó mang nghĩa, còn hairline bảng chỉ ngăn cách. Mờ đi là mất đúng cái nghĩa đó.

### Còn nợ của riêng phiên này

- Thang `--ds-sp-*` chưa có cổng canh. `G-MEASURE` canh `max-width` cứng, nhưng chưa có cổng
  nào bắt "vừa viết `margin-bottom: 17px` tại chỗ". Script đếm nhịp ở design.md §0.6 chạy
  trong trình duyệt; muốn thành cổng thì phải đọc CSS bằng node và so với danh sách token.

## Phiên 2026-08-04 (j) — thanh trên nói tiếng Anh + cùng chiều cao, nút sao chép & panel Notes làm lại, docs bỏ hết nhật ký

Chủ trang báo bốn việc: (1) thanh trên canh giữa dọc toàn bộ, và **mọi chữ trên thanh trên
phải là tiếng Anh**; (2) nút sao chép code xấu; (3) nút xoá ghi chú xấu — bấm xoá xong nền
đỏ, hover vào thì icon thành **đen trên nền đỏ** — và "bố cục note này rất xấu, design đẹp
hơn được không"; (4) docs đang ghi kiểu nhật ký (*"Chủ trang chốt 2026-08-04, sau khi xem
trang ở cấu hình 660/18px, theo thứ tự ưu tiên:"*) — **docs chỉ để ghi tài liệu**, cái gì
đổi theo thời gian thì vào changelog; rà toàn bộ `.md` xem còn lỗi tương tự.

### 1. Thanh trên — canh giữa KHÔNG phải là vấn đề, ba chiều cao khác nhau mới là

Đo trước khi sửa: cả bốn ô đã có `mid = 27,5px`, tức **đã canh giữa dọc đúng**. Thứ làm hàng
đọc so le là **chiều cao**: nút-logo 32 · chip % 19,4 · Notes 32 · sáng/tối 28. Mắt đọc mép
trên và mép dưới của mỗi ô, không đọc tâm nó — nên "canh giữa" thêm nữa sẽ không sửa được gì.

Sửa: token `--ds-navctl: 30px` khai ở `.wb-navbar`, cả bốn ô dùng nó, **kèm
`box-sizing: border-box`** (kit không đặt border-box toàn cục, thiếu nó là viền cộng thêm 2px
và ô đó lại lệch). Phụ đề thương hiệu chuyển từ `align-items: baseline` sang `center` và có
vạch ngăn — canh giữa hai cỡ chữ khác nhau chỉ đọc đúng khi chúng là hai thứ tách biệt, và
vạch ngăn dùng lại đúng hình của `Notes │ 3` ở đầu bên kia thanh.

**Luật ngôn ngữ đảo chiều cho thanh trên** (`lộ trình học` → `Roadmap`, cùng mọi `title=` /
`aria-label` / chữ do `syncNotesCount()` sinh). Cái được thêm: luật cũ có **hai ngoại lệ rời**
(`Notes`, `Light`/`Dark`) — cả hai nằm trên thanh trên, nên giờ chúng tan vào một luật thay vì
là hai ca đặc biệt phải nhớ. Lớp vỏ còn lại (thanh bên, chân trang, panel, `<title>`) vẫn
tiếng Việt; ngoại lệ duy nhất còn lại là **tiêu đề dock** `Notes` vì nó là tên của panel.

Chạm vào: `CSS lớp vỏ · markup navbar · syncNotesCount`

### 2. Nút sao chép — `opacity: .5` là nguyên nhân của cả ba chỗ xấu

`.5` áp cho **cả hộp** nên nền và viền cũng mờ theo: viền hoá một vạch đục nằm giữa nền code
và nền nút, không ra viền mà cũng không ra bóng. Cộng thêm `--wb-radius` (10px) **đúng bằng**
bán kính góc khối code mà chỉ cách nó 8px → hai góc bo cùng bán kính lồng nhau. Sửa bằng cách
bỏ chính quyết định "luôn hiện ở .5": khi nghỉ là **icon trần** (không nền, không viền, không
góc — không có gì để đục), trỏ vào khối code mới thành chip đủ nét, bán kính `--wb-radius-sm`
để hai góc đọc thành hai cấp.

Nền chip là `--wb-canvas`, **không** `--wb-surface`: khối code là `--wb-surface-2`, và ở chế
độ tối hai token đó cách nhau đúng 7 đơn vị xám (`#131316` / `#1a1a1e`) — chip đặt lên gần như
tàng hình. Luật này đã ghi vào `design.md` §6: **chọn token theo khoảng cách, không theo tên.**

Bắt kèm một lỗi thật: nhánh sao chép **thất bại** cũng bật `is-done` (xanh). Tách `is-fail`
(đỏ) — một lần chép thất bại không được hiện ra màu thành công.

Chạm vào: `CSS .ds-copy · addCopyButtons`

### 3. Panel Notes — lỗi nút xoá là cascade của kit, không phải màu chọn sai

Nguyên nhân đúng như chủ trang thấy, và nó nằm ở kit: nút xoá là
`wb-btn wb-btn--ghost`, lúc lên nòng thì code bật thêm `wb-btn--danger`. Nhưng
`.wb-btn--ghost:hover` đặt `color: var(--wb-fg)` với độ ưu tiên **0-2-0**, còn
`.wb-btn--danger` đặt màu chữ với **0-1-0** — nên hover thắng: **icon đen trên nền đỏ**. Đây
không phải lỗi đặt màu, là lỗi **chồng hai variant của kit cùng đặt một thuộc tính**.

Sửa: hai nút sửa/xoá dùng `.ds-nact` của riêng trang, không dùng nút kit nữa. Và trạng thái
lên nòng **đổi hình chứ không chỉ đổi màu**: icon thùng rác → chữ `Xoá?` trên nền
`--wb-danger-soft`. Ô đỏ đặc chỉ nói được "nguy hiểm"; dấu hỏi nói ra đúng việc đang xảy ra —
trang đang **chờ** cú bấm thứ hai. Thêm `:has(.is-armed)` để nút đang chờ không tàng hình khi
chuột rời hàng.

Ba lỗi bố cục còn lại, cùng một gốc — **panel hẹp mà mọi thứ đều tranh bề rộng**:

| lỗi | nguyên nhân | sửa |
|---|---|---|
| nút `Lưu` nằm một dòng riêng, canh trái | nhãn "Đây là" + 3 nút loại + `Lưu` không đủ chỗ trên một hàng | ba nút loại **chia đều bề rộng** (tự nói ra "chọn một trong ba", nên bỏ được nhãn), `Lưu` rộng hết hàng |
| dấu `·` treo ở đầu/cuối dòng trong hàng meta | một hàng `flex-wrap: wrap` + các phần ngăn bằng `·` rời → gói ở **mọi** bề rộng | bỏ hẳn dấu `·`, chia **ba hàng** theo thứ đo được: loại+giờ+nút · chữ ghi chú · tên bài (cắt "…") |
| ~7 dòng chữ xám cho 1 ô nhập | 3 câu phụ đề + placeholder dài + 2 đoạn gợi ý + 1 nhãn HOA trùng vai với dòng "Ghi cho" | mỗi khối **một** câu; bỏ nhãn HOA của khối ghi; bỏ số "1." "2." (hai nút xếp thứ tự đã nói ra rằng chúng là hai bước) |

Chạm vào: `CSS .ds-notes* + .ds-nact · markup panel · renderNotes · noteAction`

### 4. Docs bỏ hết nhật ký — và một luật mới để nó không quay lại

Luật thêm vào `CLAUDE.md` §0a: **bốn file `.md` docs ghi trạng thái hiện tại, HANDOFF.md ghi
lịch sử.** Thấy mình định viết "chủ trang chốt \<ngày\>" hay "bản trước để X" vào docs thì đó
là dòng thuộc HANDOFF; docs chỉ ghi **luật, và con số đang dùng**.

Đã bỏ khỏi docs: mọi "chủ trang chốt 2026-08-04", "bản (a)/(b)", "phiên (e)/(f)/(g)", bảng
before/after của thang chữ, đoạn kể `--ds-measure` đổi ba lần trong một ngày, hai con số đo
sai từng ghi ở `design.md`. Không mất gì: mục `## Phiên … (i)` ngay dưới đây **đã** giữ đủ
những chuyện đó. Cái *giữ lại* là phần vẫn là luật — "muốn đổi cột/chữ thì HỎI", "đừng bật
lại zoom", kèm lý do đủ ngắn để đọc.

Đồng thời sửa ba lỗi thật trong docs, không phải lỗi văn phong:

- `CLAUDE.md` §0a lấy **"trung vị ≤ 85 ký tự/dòng"** làm tiêu chí xong việc, trong khi §10
  của chính nó nói 152 là **có chủ ý**. Hai dòng trong một file bảo hai điều trái nhau.
- `editing.md` có **hai hàng trùng nhau** cho "Thêm một lớp phủ mới", và hai hàng gần trùng
  cho "Đổi khổ chữ" / "Nới cột nội dung" — trong đó một hàng nói sửa `--ds-measure` **và**
  `--ds-fs`, hàng kia nói *"sửa `--ds-measure`, chỉ nó"*.
- `design.md` đánh số `§0.2b` giữa `§0.2` và `§0.3`. Đổi thành `§0.1–0.5` phẳng, và sửa hết
  tham chiếu chéo trong `CLAUDE.md` + `editing.md` theo.

Chạm vào: `CLAUDE.md §0a/§10/§11 · docs/design.md (viết lại §0) · docs/editing.md · docs/writing.md`

### Cố ý KHÔNG làm trong phiên này

- **Không chạm `--ds-measure` / `--ds-fs`.** Đó là quyết định của chủ trang (§0.3), và phiên
  này không có yêu cầu nào về khổ trang.
- **Không dịch nội dung panel Notes sang tiếng Anh.** Yêu cầu nói rõ "text xuất hiện trên
  navbar", và panel không phải navbar. Dịch thêm là tự nới phạm vi.
- **Giữ hai nhãn HOA `ĐÃ GHI` / `ĐƯA VÀO REPO`** dù đã bỏ cái thứ ba. Chúng là thứ duy nhất
  chia panel thành các khối; bỏ hết thì ba phần chạy liền vào nhau.
- **Không bỏ `★` khỏi tên bài** hiện trong dòng "bài nào" của mỗi ghi chú. Dấu đó nằm trong
  `TREE.t` nên bỏ là chạm `TOC.md` + cổng, mà nó vẫn khớp với cây bên trái.
- **Không sửa vòng focus quanh `h1`** sau khi đổi bài (router đưa tiêu điểm vào `#main`) —
  hành vi có từ trước, không thuộc phạm vi phiên này.
- **6 khuyến nghị `G-FWD`** giữ nguyên: chúng là quyết định về giáo trình, không phải lỗi UI.

### Còn nợ của riêng phiên này

- `docs/design.md` dài **~540 dòng**, hơn bản trước một ít dù đã bỏ hết nhật ký — vì phiên này
  thêm luật mới (chiều cao thanh trên, bố cục panel, chọn token theo khoảng cách). Nếu chủ
  trang thấy vẫn rườm rà thì chỗ cắt tiếp là §0.5, mục dài nhất.

---

## Phiên 2026-08-04 (i) — MỘT thang chữ token hoá, cột 1060px / chữ 15px, bỏ zoom

Chủ trang báo ba việc: cỡ chữ **không đồng đều**, một số chữ *chỉ là nội dung* mà **to như
tiêu đề**, và nghi `zoom: .9` là nguồn loạt lỗi UI. Đo trước khi sửa → **nghi đúng một phần
ba**. Trong phiên chủ trang bổ sung hai yêu cầu nữa: **giảm khoảng trống** và **chữ nhỏ đi
nhiều** ("13, 14 hoặc 15 cho content là dễ đọc lắm rồi").

| | nguyên nhân | do zoom? |
|---|---|---|
| chữ nội dung to quá | `--ds-fs` bị đẩy lên **28px** ở phiên (a) để chữa 102 ký tự/dòng | **không** |
| cỡ chữ không đồng đều | kit ghi px cứng ở 60+ chỗ, chỉ 4/8 token chữ được nối vào `--ds-fs` | **không** |
| nhãn 9,9px · bảng mất mức tràn · thanh bên cụt đáy | `zoom` không điều chỉnh đơn vị viewport, và nhân mọi px kit × 0,9 | **có** |

Số đo trước khi sửa (bài `d-eda`, 1440px): thân bài **25,2px** — **to hơn tên bài `h1`
(24,3px)**; 99 khối `.wb-alert` giữ 12,2px = **2,07×** so với đoạn văn cạnh nó; **18 cỡ chữ**
trên một trang, trải **3,31×**.

### 1. Thang chữ ba tầng, khai theo LOẠI NỘI DUNG (`--ds-t-*`) — phần giá trị nhất của phiên

Gốc của "không đồng đều" không phải một con số sai mà là **hai hệ chữ chồng nhau trong cùng
một cột**: `--ds-fs` chỉ chi phối `.ds-prose`, còn `wb-*` thì kit đặt px cứng. Phiên (a)
"định nghĩa lại 4 token" nên chỉ với tới ~35 lớp `ds-*`. Nay:

```
:root ⑧        9 bậc, tên theo loại nội dung: hero h1 h2 h3 body sub code cap label
#main          CẢ TÁM token chữ của kit nối vào 9 bậc đó (trước: 4)
#main .wb-*    component nào kit ghi px cứng thì kéo về thang — một dòng mỗi loại
```

Kết quả: **8 cỡ chữ, trải 1,92×** (không tính icon). Và điểm quan trọng hơn con số đó:
**thứ bậc giờ đúng ở MỌI giá trị `--ds-fs`** — `h1` luôn = 1,5 × thân bài. Nhờ vậy khi chủ
trang đổi ý về cỡ chữ (18 → 15px) thì chỉ đổi **một** token, không phải soát lại cả trang.

### 2. Cột 1060px + chữ 15px — CHỦ TRANG CHỐT, và đây là chỗ phiên này làm sai một lần

`ký tự/dòng ≈ cột ÷ (0,46 × cỡ chữ)`. Ba đại lượng khoá nhau; chọn hai là cái thứ ba bị
quyết định. Phiên này **tự chọn** "đúng trần 90 ký tự/dòng" làm ưu tiên số một, nên hạ
`--ds-measure` 1060 → **660px** — trong khi `HANDOFF` phiên (h) đã ghi rõ *"1060px là đúng
con số chủ trang chỉ vào, không nới cột thêm nữa"*. Chủ trang bắt đảo lại ngay, và nói đúng:
ở 660px thì `#main` chỉ 700px (trống **210px** bên phải) và bảng phải tràn margin âm nên
**lệch 193px sang trái so với chữ**.

Cấu hình cuối, do chủ trang chốt: `--ds-measure` **1060px** · `--ds-fs`
**clamp(14px, …, 15px)** · `--ds-wide` 1260px · `line-height` p/li 1,68 → **1,8**.
Đo thật: 375px → cột 335/chữ 14px → **48** ✓ · 1200px → 819/15 → **115** · 1440px → 1059/15
→ **152**. Trống bên phải `#main`: 210px → **11px**. Bảng: cùng x, cùng bề rộng với chữ.

⚠️ **152 ký tự/dòng vượt trần khuyến nghị 90, và đó là quyết định có chủ ý.** Bảng dial
(1060/900/740/620px) ở `design.md` §0.2b. **Phiên sau đừng tự hẹp cột lại** — `--ds-measure`
đã đổi ba lần trong một ngày (720 → 1060 → 660 → 1060) vì mỗi phiên tự chọn một cặp khác.

### 3. `--ds-zoom: .9` → `1`, nhưng GIỮ token

Ba cái giá cho một lợi ích (vỏ nhỏ hơn 10%): nhân mọi px cứng của kit × 0,9 (nhãn 11px →
9,9px, dưới ngưỡng đọc được và không khai ở đâu cả) · đơn vị viewport không theo zoom (**đã
cắn hai lần**: mức tràn bảng, rồi thanh bên/ngăn phụ/dock cụt 10% đáy) · hai hệ toạ độ px
trong cùng một file (`getBoundingClientRect` vs `getComputedStyle`).

**Token `--ds-zoom` / `--ds-vh` / `--ds-vw` được giữ dù bằng 1** — luật "không viết
`vh`/`vw`/`dvh` trần" bám vào đó và `gate.test.mjs` có ca canh. Media query `1333px` →
**`1200px`** (số thật). `gate.test` in 5 ngưỡng: `560 560 560 1200 560`.

### CỐ Ý KHÔNG SỬA

- **Không hẹp cột lại để cứu con số 152 ký tự/dòng** — xem §2. Đây là mục quan trọng nhất
  của cả phiên: nó là *quyết định của chủ trang*, không phải nợ kỹ thuật.
- **Không kéo icon (`--wb-ico-*`) vào thang chữ.** Icon là trục riêng và nhiều nút của kit
  lấy kích thước từ padding + icon. Script đếm cỡ chữ **bỏ qua `.wb-ico`** vì lý do đó.
- **Không sửa cỡ chữ popup/ngăn phụ** (`--ds-fs: 16px` riêng, ngoài `#main`) — chúng hẹp
  ~420–660px nên khổ chữ khác là đúng.
- **Không tách "khổ chữ" khỏi "bề rộng cột"** (đề xuất hai bề rộng: chữ 700px, bảng/code
  1060px). Đã trình bày và chủ trang **không chọn** — muốn một mép, chữ rộng hết cột. Đừng
  đề xuất lại mà không có lý do mới.
- **Không sửa `dockZoom()`** dù zoom = 1 làm hai hệ toạ độ trùng nhau — giữ đúng chiều
  nhân/chia để không thành bom hẹn giờ nếu ai bật lại zoom.
- **6 khuyến nghị `G-FWD`** (PR-AUC, rò rỉ dữ liệu, Pipeline, bootstrap, embedding,
  attention) là nợ giáo trình có từ trước.

### Đã quyết trong phiên

- **Nhãn nút giao diện `Sáng`/`Tối` → `Light`/`Dark`** theo yêu cầu trực tiếp của chủ trang,
  ngược `CLAUDE.md` §11. Ghi thành **ngoại lệ thứ hai** ở `design.md` §0.1 (cùng chỗ với
  ngoại lệ `Notes`) để phiên sau không đổi ngược. `aria-label`/`title` vẫn tiếng Việt.
- **Bảng không cần tràn nữa.** Cột 1060px = đúng bề rộng bảng cần, nên `--ds-bleed` tự về 0
  ở 1440px và bảng nằm đúng mép chữ. Cơ chế tràn vẫn còn cho cửa sổ rộng hơn.

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

**Đây là backlog đang sống, không phải nhật ký.** `node tools/session.mjs` in tiêu đề mọi
mục `###` dưới đây **mỗi lần mở phiên**, nên việc nào xong thì **xoá hẳn khỏi đây** (chuyện
"ai làm nó, phiên nào" thuộc mục `## Phiên …` của phiên đó). Để lại một mục đã xong kèm chữ
"đã xử" là cách nhanh nhất làm dòng CHƯA LÀM thành tiếng ồn — chính lỗi đó đã sống từ (n5)
tới (n8), khiến bốn việc đã làm vẫn được in ra suốt bốn phiên.

### Tám hình P1 — chỉ làm SAU khi đo được 8 hình P0

Audit n9 §5 xếp thứ tự rõ: *"làm 8 visual P0 trước, đo comprehension/usability; chỉ sau đó
mới làm P1"*. Tám hình P0 đã xong ở phiên (p). Danh sách P1: `s-plan8w` (dependency/workload
timeline 8 tuần) · `ml-tune` (grid vs random vs TPE trên cùng search space) · `ml-unsup`
(cluster/outlier 2D có slider) · `pr-cost` (threshold → FP/FN → cost curve; hiện có bảng) ·
`pr-mlops` (lineage graph data → run → registry → deploy) · `dl-embed` (lookup table → 2D
neighborhood) · `q-cv` (classification/detection/segmentation triptych) · `f-text`/`q-nlp`
(document → token → term matrix/embedding → output).

Ba bài **chưa có trường `viz` nào** trong `roadmap-summaries.json`: `pr-mlops`, `q-nlp`,
`r-glossary`.

### Đang chờ chủ trang gọi — agent đừng tự làm

- **Nhãn Foundation / Applied / Advanced.** (n5) để lại: trang đã có 3 chip ưu tiên + chip
  14 ngày + nhãn `SCOPE`, và (r) vừa thêm chip mốc vào lịch 14 ngày — thêm một trục nữa là
  thêm nhiễu. Đây là quyết định về *cách trình bày giáo trình*, không phải việc kỹ thuật —
  cần thì chủ trang gọi tên nó ra, "làm hết backlog" không tính.

### Đã quyết là GIỮ NGUYÊN — đừng revisit

| việc | quyết định | vì sao |
|---|---|---|
| Cắt `f-store` | **giữ, không cắt** | nội dung thật của nó là *một câu trả lời cho hội đồng* + point-in-time correctness; đang `skim` 30′ |
| `q-analytics` off-goal | **giữ** | bài duy nhất vạch ranh giới analytics / predictive / causal — câu hội đồng hay hỏi |
| `dl-train` bảng gỡ lỗi → popup | **giữ trên mạch chính** | (n5) bác: `PAYOFF[dl-train][0]` *là* "bảng chẩn đoán đường cong loss" — danh mục chính là deliverable của bài |
| Đổi thứ tự mạch chính | **xong** | (n4) đổi thứ tự chặng; (p) đổi thêm một đường nối trong chặng 2 (`d-eda` lên trước `d-split`) |
| 11 chặng | **giữ** | audit n9 §3: "chưa có lý do đủ mạnh để đảo toàn bộ curriculum" — chỉ sửa ba đường nối, cả ba đã sửa ở (p) |
| Cổng "từ tuyệt đối" bản rộng | **bác, có số đo** | quét `luôn`/`duy nhất`/`bảo đảm` cho 22 kết quả, gần hết là dương tính giả. `G-ABS` chỉ bắt hình dạng "ngưỡng % + mệnh lệnh" — xem (p) mục 5 |
| 110 câu quiz còn cụm "theo bài" | **giữ, đừng sed** | (x): đếm CỤM TỪ bắt chữ chứ không bắt hình dạng — phần lớn 110 câu đó đã là câu tình huống thật. Chạy `sed` trên cụm đó là sửa thứ không hỏng |
| 7 chỗ nhắc `data-science-roadmap.html` trong `roadmap.html` | **giữ** | (z): cả 7 nằm trong **comment** ghi nguồn build. Hợp đồng "Roadmap độc lập" nói thẳng lấy trang DS làm nguồn build là *chi tiết triển khai, không phải quan hệ lộ ra cho người đọc*. Xoá là xoá thứ giữ cho phiên sau biết sửa ở đâu |
| Chuẩn hoá escape trong `data/quiz.json` | **không chuẩn hoá** | (aa): triệu chứng như (x) mô tả KHÔNG có thật — `&amp;gt;` xuất hiện **0 lần**. Bất nhất thật là trần vs escape (15 `>`, 13 `<`, 56 `&` trần), nhưng **cả hai dạng render y hệt**, và số chỗ thật sự hỏng là **0**. Chuẩn hoá = sửa ~84 chỗ đổi lấy không gì người đọc thấy, mỗi chỗ chạm là một cơ hội phá thứ đang đúng. Lớp lỗi thật đã có `G-QUIZ-ESC` canh |
| Đòi `G-QUIZ-ESC` bắt mọi dấu `<` / `>` / `&` trần | **bác, có số đo** | (aa): 941 câu có 15 `>` trần, 13 `<` trần, 56 `&` trần và **không cái nào hỏng**. Cổng bắt rộng thế sẽ nổ vào mọi câu tương lai viết `recall > 0,8` — thành tiếng ồn. Nó chỉ bắt ba hình dạng LÀM MẤT CHỮ |

### Một thứ để biết trước, KHÔNG phải việc

- **Có một ngày fast track nằm đúng ngưỡng dưới 3,5 giờ của `G-PLAN`.** Từ (n4) đó là
  **ngày 6** — cố ý nhẹ nhất vì là ngày deliverable, giờ đổ vào việc CHẠY. Cắt thời lượng bài
  nào trong ngày đó thì `G-PLAN` trượt: cổng làm đúng việc, nhưng biết trước thì đỡ mất
  thời gian truy.

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
