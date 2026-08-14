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

## 0a. Bắt đầu ở đây — định làm X thì đọc gì, chạy gì

**Mọi phiên mở bằng một lệnh**, kể cả phiên chỉ sửa một câu:

```bash
node tools/session.mjs
```

Nó trả lời năm câu bạn không thể biết bằng cách đọc file: **có phiên khác đang làm dở
không** (thư mục này thường có nhiều phiên song song), **nền local có còn mới không** (nó
`git fetch` rồi so với upstream — `git status` im lặng khi phiên khác vừa push thẳng
`main`), hook đã cài chưa, việc gì đang dở, cổng đang xanh hay đỏ.

Rồi tìm việc mình định làm trong bảng này:

| định làm | đọc | chạy | xong là khi nào |
|---|---|---|---|
| **sửa chữ trong một bài** | `node tools/gate.mjs --show <id>` · [docs/writing.md](docs/writing.md) | `gate.mjs --advice` | cổng CHẶN qua · không sinh khuyến nghị mới |
| **thêm / xoá / dời một bài** | §6 (bốn câu phải trả lời) → [docs/editing.md](docs/editing.md) việc 1–2 | `gate.mjs --write` rồi `git add TOC.md` | `G-TOC-STRUCT` qua · đọc lại `G-NEXT` |
| **thêm / xoá / dời một chặng** | [docs/editing.md](docs/editing.md) **việc 3** | `gate.mjs --write` | như trên. Giữ nguyên `id` chặng, đừng đổi số |
| **thêm hình / bảng / code** | §10 (một mép phải) · [docs/design.md](docs/design.md) | `gate.mjs --advice` + **mở trang bằng mắt** | không cuộn ngang ở 1440 / 1100 / 375px |
| **đổi giao diện, thêm nút, thêm component** | **[docs/design.md](docs/design.md)** · §7 · §10 | mở trang, kiểm **cả sáng lẫn tối** | `G-MEASURE` im · hai chế độ đều đọc được |
| **đổi chữ / thêm một ô ở thanh trên** | [docs/design.md](docs/design.md) **§0.1** | mở trang | thanh trên: chữ tiếng Anh, mọi ô cùng `--ds-navctl` |
| **đổi chữ ở thanh bên / chân trang / panel** | [docs/design.md](docs/design.md) **§0.1** | mở trang | không còn chữ tiếng Anh nào ngoài tên icon và `Notes` |
| **đổi cỡ chữ / thêm một bậc chữ** | [docs/design.md](docs/design.md) **§0.2** · §10 | đếm lại số cỡ chữ (script ở §0.2) | ≤ ~10 cỡ chữ, trải ≤ 2× (nay 8 / 1,92×) |
| **nới cột nội dung** | [docs/design.md](docs/design.md) **§0.3** — cột/chữ là quyết định của chủ trang, **hỏi trước** | đo lại ký tự/dòng (script ở §0.3) | 1440/1200/375px không cuộn ngang |
| **đặt margin / padding cho một khối** | [docs/design.md](docs/design.md) **§0.6** | trỏ vào một bậc `--ds-sp-*`; đếm lại số nhịp (script ở §0.6) | ≤ 7 nhịp · **không có nhịp 0px** (nay 6) |
| **thêm một chuỗi bước (stepper)** | [docs/design.md](docs/design.md) **§3** | dùng `wb-steps`, đừng tự vẽ | có đường nối · tâm mốc khớp tâm tiêu đề (đo phải ra 0) |
| **dùng chiều cao / bề rộng cửa sổ** | [docs/design.md](docs/design.md) **§0.4** (đơn vị viewport) | `node tools/gate.test.mjs` | không có `vh`/`vw`/`dvh` trần — dùng `--ds-vh` / `--ds-vw` |
| **chuyển một khối ra ngoài mạch chính** | §7 · [docs/design.md](docs/design.md) §1 | `gate.mjs --advice` | popup là mặc định; chọn drawer thì phải viết ra lý do |
| **sửa lịch 8 tuần / 14 ngày** | §8 · [docs/editing.md](docs/editing.md) việc 4 | `node tools/audit.mjs` | `G-PLAN` qua |
| **sửa trang Roadmap học nhanh** | §4 (hai cổng `G-ROADMAP*`) · `tools/build-roadmap.mjs` | `node tools/build-roadmap.mjs` | `G-ROADMAP` im. **Đừng sửa tay `roadmap.html`** — nó là sản phẩm sinh ra |
| **thêm / sửa một cổng** | §4 · [docs/editing.md](docs/editing.md) việc 6 | `node tools/gate.test.mjs` | test xanh · thêm tên cổng vào §4 (`G-DOC` bắt) |
| **thêm / sửa câu hỏi trắc nghiệm** | [docs/editing.md](docs/editing.md) **việc 7** — nội dung ở `data/quiz.json`, KHÔNG trong HTML | `gate.mjs` | `G-QUIZ` qua · `G-QUIZ-COV` và `G-QUIZ-POS` im |
| **ghi việc học của mình** | [LEARNING-LOG.md](LEARNING-LOG.md) | `learn.mjs --add` hoặc nút **Notes** trên trang | `learn.mjs --check` im |
| **đóng phiên / commit / push** | §12 | `node tools/session.mjs --close` | HANDOFF đã ghi · `G-HANDOFF` im |

Ba file docs, ba câu khác nhau — đừng đọc sai file:

- [docs/editing.md](docs/editing.md) — *"đổi cái này thì phải đổi cái gì nữa"*
- [docs/writing.md](docs/writing.md) — *"giải thích thế nào để người ta hiểu"*
- [docs/design.md](docs/design.md) — *"nó trông thế nào, nằm ở đâu"*

Và **cả bốn file `.md` này ghi trạng thái hiện tại, không ghi lịch sử.** Ai chốt gì ngày
nào, bản trước sai ra sao, phiên nào bỏ việc gì → [HANDOFF.md](HANDOFF.md). Thấy mình định
viết "chủ trang chốt <ngày>" hay "bản trước để X" vào một file docs thì đó là dòng thuộc
HANDOFF; trong docs chỉ ghi **luật, và con số đang dùng**.

---

## 0. Đừng mở file HTML để tìm hiểu

`data-science-roadmap.html` là **~16,6k dòng, ~1,4 MB**. Đọc cả file tốn ~350k token và gần
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
data-science-roadmap.html      ← NGUỒN SỰ THẬT cho bài học, layout, bộ cổng
  │  phụ thuộc: ../../web-builder/web-builder.css (token + component wb-*)
  │             data/quiz.json  — fetch lúc chạy; thiếu thì mất quiz, trang vẫn chạy
  │  KHÔNG phụ thuộc bất cứ thứ gì khác trong thư mục này
  │
data/quiz.json                 ← NGUỒN SỰ THẬT cho câu hỏi trắc nghiệm (84 bài · 475 câu)
  │  CẢ HAI trang fetch chính file này lúc chạy — không trang nào nhúng câu hỏi
  ↓ đọc
tools/read-html.mjs   luật đọc dữ liệu ra khỏi HTML — dùng chung, chỉ có MỘT bản
  ├─ tools/gate.mjs   ──sinh──→  TOC.md   (SẢN PHẨM — không sửa tay, không phải nguồn)
  │     (đọc cả data/quiz.json — hàm readQuiz(), cùng file trang fetch)
  ├─ tools/build-roadmap.mjs ──sinh──→ roadmap.html  (SẢN PHẨM — trang học nhanh; nó còn
  │     TRÍCH CSS/JS của trang chính lúc build, nên sửa trang chính là bản đã sinh thành cũ)
  │     + tools/roadmap-summaries.json   84 bản tóm tắt (DỮ LIỆU, một workflow viết ra)
  ├─ tools/plan.mjs     luật kiểm lịch học      (cổng G-PLAN)
  ├─ tools/learn.mjs  ↔ LEARNING-LOG.md         (cổng G-LEARN)
  ├─ tools/audit.mjs    chạy riêng plan.mjs cho người đọc
  └─ tools/session.mjs  mở / đóng phiên — KHÔNG phải cổng, chỉ đọc và in
tools/hook-state.mjs  luật "ba lớp hook đã cài chưa" — dùng chung bởi gate.mjs (G-HOOK)
                      và session.mjs; hai bản đã từng lệch nhau, xem đầu file đó
tools/gate.test.mjs   test cho chính bộ cổng — mỗi cổng một ca nổ + một ca im
tools/concepts.json   khái niệm nào dạy ở bài nào  (đầu vào cổng G-FWD)
tools/waivers.json    lỗi thật đang hoãn có chủ ý

CLAUDE.md               → quy tắc bắt buộc + đường vào; không code nào đọc nó
docs/editing.md         → đổi cái này thì phải đổi cái kia; thêm bài/chặng/hình gõ ở đâu
docs/writing.md         → tám thứ máy không kiểm được ("giải thích này có hiểu được")
docs/design.md          → nó trông thế nào, nằm ở đâu; component nào, icon hay chữ
HANDOFF.md              → sổ nhật ký phiên làm việc
LEARNING-LOG.md         → việc học của chủ trang (agent ghi); nguồn của cổng G-LEARN
```

Mỗi file **một lý do để đổi** — đó là cách giữ cho bộ tài liệu không phình ra:

| file | đổi khi nào |
|---|---|
| `CLAUDE.md` | quy trình / luật đổi |
| `docs/writing.md` | tiêu chuẩn *chất lượng nội dung* đổi |
| `docs/editing.md` | *cấu trúc kỹ thuật* của trang đổi (thêm khối dữ liệu, thêm class) |
| `docs/design.md` | *hình thức* đổi (component mới, luật trình bày mới) |
| `data/quiz.json` | thêm/sửa câu hỏi trắc nghiệm — không đụng HTML, không build lại gì |
| `TOC.md` | tự động, mỗi lần nội dung đổi |
| `tools/*` | thêm/sửa cổng, hoặc thêm/sửa lệnh phiên |
| `HANDOFF.md` | mỗi phiên |
| `LEARNING-LOG.md` | mỗi lần chủ trang học xong một bài, hoặc tắc ở đâu |

Thấy mình định thêm mục vào `CLAUDE.md` thì hỏi trước: nó có thuộc một trong bốn file
docs kia không? `CLAUDE.md` phải đủ ngắn để thật sự được đọc.

Bốn luật không được vi phạm:

1. **HTML không bao giờ phụ thuộc vào `tools/` hay `docs/`.** Xoá cả hai thư mục đó thì
   trang vẫn chạy y nguyên. Cổng là thứ *soi* trang, không phải thứ trang cần để sống.
2. **`TOC.md` và `roadmap.html` không bao giờ là nguồn.** Cả hai là SẢN PHẨM sinh ra; lệch
   với HTML thì HTML đúng. **Đừng sửa tay `roadmap.html`** — lượt sinh sau xoá sạch.
3. **Mỗi mẩu nội dung có đúng MỘT nguồn.** Luật này *không* cấm tách nội dung ra file
   riêng — nó cấm **bản sao thứ hai**. Muốn tra cứu nhanh thì sinh ra bản index (như
   `TOC.md`) hoặc một VIEW sinh từ nguồn (như `roadmap.html`), đừng gõ tay một bản sao.

   **Hướng đang đi: HTML chỉ còn design + layout, nội dung nạp từ file ngoài** (chủ trang
   chốt 2026-08-14). Câu hỏi trắc nghiệm đã tách xong — `data/quiz.json`, và cả hai trang
   fetch chính nó nên vẫn đúng một nguồn. Nội dung bài học còn trong HTML và sẽ tách sau;
   **đừng tự khởi động việc đó**, nhưng thứ nội dung MỚI thì đặt ra ngoài ngay từ đầu.
   Khuôn để theo: một file dưới `data/`, trang `fetch` tương đối và chạy được kể cả khi
   fetch hỏng, `read-html.mjs` có một hàm đọc thẳng file đó cho `tools/`.
4. **`LEARNING-LOG.md` là dữ liệu, không phải nội dung trang.** Xoá nó thì cổng vẫn chạy,
   chỉ mất `G-LEARN`. Mục `## Sổ` trong nó **chỉ được thêm vào cuối** — xem §13.

---

## 3. Chạy cổng

```bash
node tools/session.mjs          # MỞ PHIÊN — chạy cái này trước mọi thứ khác
node tools/session.mjs --close  # ĐÓNG PHIÊN — khung HANDOFF + câu commit

node tools/gate.mjs             # tất cả cổng; thoát 1 nếu có lỗi chặn
node tools/gate.mjs --advice    # kèm phần chỉ nhắc (không chặn)
node tools/gate.mjs --write     # sinh lại CẢ HAI sản phẩm: TOC.md + roadmap.html
node tools/gate.mjs --gates     # in danh sách cổng đang chạy
node tools/audit.mjs            # chỉ phần lịch học — bản node của auditPlan()
node tools/build-roadmap.mjs    # sinh riêng roadmap.html; --stamp = đóng dấu lại tóm tắt
node tools/learn.mjs            # tóm tắt sổ học; --add / --sync / --write / --check
node tools/gate.test.mjs        # test cho chính bộ cổng
tools/install-hooks.sh          # lớp 1 + cấu hình preview (một lần mỗi máy / mỗi bản clone)
sh ../../facts/tools/install-hooks.sh   # lớp 2–3 — bộ điều phối git hook cho CẢ repo
```

`install-hooks.sh` phải tồn tại vì **cả `.git/hooks/` lẫn `.claude/` đều không được git
theo dõi** (`.claude/` nằm trong `.gitignore`), nên hook không tự theo repo về máy mới.
Nguồn sự thật là `tools/hooks/pre-commit`, `tools/hooks/pre-push`,
`tools/hooks/claude-settings.json` và `tools/hooks/launch.json` — các file được theo dõi;
script chỉ nối chúng vào chỗ git, Claude Code và preview thật sự đọc. Chạy lại nhiều lần
không sinh hook trùng.

**Cần CẢ HAI lệnh, và git hook thuộc lệnh thứ hai.** Repo có nhiều project con nên
`.git/hooks/*` phải là **bộ điều phối** (gọi mọi `*/tools/hooks/<event>`), không phải
symlink trỏ vào một project — xem `CLAUDE.md` ở **gốc repo**. Script của thư mục này biết
nhường: gặp hook đã là file thật thì nó không ghi đè, chỉ in ra dòng cần thêm. Nên nó chỉ
còn lo lớp 1 (`PostToolUse`) và `launch.json`.

`launch.json` được cài vào **hai chỗ**: `.claude/` của thư mục này *và* `.claude/` ở gốc
repo. Preview đọc file theo **thư mục làm việc của phiên**, mà phiên hay mở ở gốc repo —
thiếu bản ở gốc thì `preview_start` với `name: "ds-review"` không tìm thấy config và rơi
vào config đầu tiên của project khác.

**Ba lớp tự động, ba thời điểm khác nhau có chủ ý:**

| khi nào | ai chạy | làm gì |
|---|---|---|
| **ngay sau mỗi lần Edit/Write** vào file HTML | Claude Code hook `PostToolUse` (`.claude/settings.json` → `tools/hooks/post-edit.sh`) | chạy cổng; trượt thì **đưa lỗi lại cho agent ngay trong lượt đó**; qua thì tự làm mới số dòng trong `TOC.md` |
| **khi commit** | git `pre-commit` (`tools/hooks/pre-commit`) | chạy cổng; chặn commit; chặn cả việc sửa HTML mà quên `git add TOC.md` |
| **khi push** | git `pre-push` (`tools/hooks/pre-push`) — **CHẶN** | `gate --ci` + `audit`, và `gate.test` nếu `tools/` có đổi (~20 giây) |

Vì sao cần lớp thứ ba khi đã có `pre-commit`: **push nhánh `main` là deploy GitHub Pages.**
Sau bước đó lỗi nằm trên web. `pre-commit` bỏ qua được bằng `--no-verify` (đúng và nên có),
một commit cũ có thể được rebase/cherry-pick vào mà chưa từng qua cổng, và commit merge
không chạy `pre-commit` chút nào. `pre-push` kiểm **trạng thái cuối** của đúng những gì
đang được đẩy lên. Bỏ qua có ý thức: `git push --no-verify`.

Lớp thứ nhất mới là lớp quan trọng: một agent sửa 20 lần rồi mới commit một lần, nên bắt
lỗi ở commit nghĩa là nó phải lần lại 20 bước để tìm chỗ hỏng. Bắt ngay lúc sửa thì nó
tự sửa trong cùng một lượt, khi còn nhớ mình vừa làm gì.

**`auditPlan()` giờ chạy được bằng node, không cần mở trình duyệt.** Hàm đó vẫn nằm trong
trang và vẫn tự chạy khi tải trang, nhưng luật của nó đã được viết lại trong
`tools/plan.mjs` và chạy như cổng `G-PLAN`. Nên `node tools/gate.mjs` bao gồm cả nó.

Vì sao đáng đổi: cổng này là **bắt buộc**, nhưng cách chạy cũ tốn sáu bước tay (chép file
sang thư mục khác, bật server, mở trang, thêm `?v=n` chống cache, gõ hàm, đọc kết quả). Một
cổng bắt buộc mà đắt như vậy thì trên thực tế sẽ bị bỏ.

Vẫn nên mở trang bằng mắt khi sửa **giao diện** — cổng không thấy được layout. Luật hình
thức ở [docs/design.md](docs/design.md), kèm ba cái bẫy của pane preview.

---

## 4. Cổng tự động — máy đã canh, đừng canh lại bằng tay

Bảng này phải khớp mảng `GATES` trong `gate.mjs` — cổng `G-DOC` tự đối chiếu và nhắc nếu
lệch. In danh sách thật bất cứ lúc nào: `node tools/gate.mjs --gates`.

**Chặn commit — 11 cổng:**

| cổng | canh điều gì |
|---|---|
| `G-SYNTAX` | script chính **phân tích được** — `SyntaxError` là trang trắng, xem ngay dưới bảng |
| `G-TOC-STRUCT` | **cấu trúc** mục lục khớp HTML (bài, tên, chặng, ưu tiên, thời lượng, tuần) |
| `G-ORDER` | thứ tự khối `<template>` trong file == thứ tự `TREE` |
| `G-NODE` | mỗi bài đúng một template, không thừa không trùng |
| `G-REF` | mọi `data-aside` / `data-math` / `data-goto` / `#/id` giải được |
| `G-ORPHAN` | không có nhánh phụ nào không bài nào mở |
| `G-PAYOFF` | mọi bài có `PAYOFF` (thiếu = đầu bài không có dòng mục tiêu) |
| `G-NO-DETAILS` | không dùng `<details>` cho kiến thức |
| `G-FWD` | tiêu chí đạt / deliverable tuần không đòi thứ chưa được dạy |
| `G-PLAN` | lịch 14 ngày & 8 tuần nhất quán — **bản node của `auditPlan()`**, xem §3 |
| `G-QUIZ` | mỗi câu hỏi trắc nghiệm (`QUIZ`) đủ trường và `a` trỏ đúng một đáp án CÓ THẬT — `a` lệch là chấm sai đáp án, một lỗi chạy được. Câu hỏi có ĐÚNG/HAY không thì máy không kiểm, đó là việc đọc của người |

**`G-SYNTAX` — cái bẫy backtick, và vì sao nó xứng đáng có một cổng riêng.** Trang là một
file HTML tự chứa, nên phần lớn nội dung động nằm trong **template literal** của JS
(`renderHome`, `renderPlan14`, `renderNotes`…). Trong một template literal, **một dấu
backtick là hết** — kể cả khi nó nằm trong một comment HTML, vì JS không biết gì về comment
HTML. Hậu quả không phải "một khối hiện sai" mà là `SyntaxError` cho cả `<script>`, tức
**không hàm nào được định nghĩa** và trang chỉ còn cái vỏ.

Đã dính 2026-08-04: thêm một comment giải thích, trong comment có `` `wb-steps` ``. Và cả 9
cổng CHẶN lúc đó vẫn xanh, vì tất cả chúng đọc HTML như **văn bản** — không cổng nào hỏi
"đoạn script này có chạy được không". Đó là loại lỗi tệ nhất bộ cổng có thể bỏ sót: hậu quả
tối đa, diff nhìn vô hại nhất (chỉ là một comment), và người đang sửa CSS thì không có lý do
nào để mở trình duyệt kiểm lại JS.

**Luật:** viết chú thích BÊN TRONG một template literal thì **không dùng backtick** — gọi
tên class/token bằng chữ trần (`wb-steps`, không phải `` `wb-steps` ``). Muốn dùng backtick
thì đưa chú thích ra ngoài template, thành comment JS phía trên hàm.

**Chỉ nhắc, người quyết định — 15 cổng** (`G-FWD` có mặt ở cả hai bảng: chặn ở mức tiêu chí
đạt, chỉ nhắc ở mức thân bài):

| cổng | nhắc điều gì |
|---|---|
| `G-TOC-STALE` | `TOC.md` còn số dòng cũ (khi commit thì thành lỗi chặn) |
| `G-ROADMAP` | `roadmap.html` không còn khớp bản sinh lại từ nguồn (khi commit thì thành lỗi chặn) |
| `G-ROADMAP-SUM` | bài đã đổi nội dung **sau khi** bản tóm tắt của nó được viết, hoặc bài chưa có tóm tắt |
| `G-LAYER` | mục tự khai là nhánh phụ, hoặc bài dài quá 200 dòng |
| `G-DUMP` | đoạn văn đọc lại một bảng số thay vì nói ý |
| `G-ABS` | một ngưỡng `%` được viết như quy luật, không gắn nhãn "điểm khởi đầu" — xem ngay dưới bảng |
| `G-VIZ` | bài chưa có hình / bảng / code nào để nhìn |
| `G-MEASURE` | có `max-width` cứng làm trôi khổ chữ |
| `G-SPACING` | `margin` dọc còn viết px trần thay vì trỏ vào một bậc `--ds-sp-*` ([docs/design.md](docs/design.md) §0.6) |
| `G-FWD` | (mức thân bài) dùng khái niệm trước bài dạy nó |
| `G-NEXT` | bài sau đã đổi → đọc lại câu "bài sau…" trong `PAYOFF` của những bài nó nêu tên |
| `G-HOOK` | ba lớp tự động ở §3 đã được cài chưa |
| `G-DOC` | có cổng trong code mà `CLAUDE.md` không nhắc tên |
| `G-HANDOFF` | đổi trang hoặc bộ cổng mà `HANDOFF.md` không đổi — xem §12 |
| `G-LEARN` | sổ học đọc được, và **≥2 bài cùng tắc ở một khái niệm** = khái niệm đó dạy quá muộn (§13) |
| `G-QUIZ-COV` | bài chưa có quiz, **hoặc có ít câu hơn số mục của chính nó** — xem ngay dưới bảng |
| `G-QUIZ-POS` | giải thích gọi lựa chọn theo VỊ TRÍ (`đáp án cuối`) — đảo thứ tự lựa chọn là nó nói sai |

**`G-QUIZ-COV` đếm câu SO VỚI BÀI, không đếm có/không.** Bản đầu chỉ hỏi "bài này có câu
nào chưa" — và nó im suốt, vì bài nào cũng có ~6 câu. Đo lại 2026-08-14 mới thấy chỗ hỏng
thật: **0/84 bài trắng quiz, nhưng 29/84 bài có ít câu hơn số mục của chính nó.** Số câu
được phát theo định mức ~6 câu/bài chứ không theo lượng nội dung, nên `pr-eval` (12 mục,
6.418 chữ) và `f-store` (3 mục, 400 chữ) cùng được ~6 câu. Cổng giờ so `số câu` với `số mục
h2/h3 của mạch chính`. Không phải mục nào cũng đáng một câu — nên nó **chỉ nhắc** — nhưng
lệch nhiều thì gần như chắc là bỏ sót.

**`G-QUIZ-POS` canh một lớp lỗi chỉ nổ khi bạn động vào.** Một giải thích viết "đáp án cuối
sai vì…" đang đúng, nhưng nó phụ thuộc vào **thứ tự lựa chọn**. Đo được: lượt rải lại vị trí
đáp án cho 453 câu (chống việc "cứ chọn B" trúng 40%) làm **2 trong 11** câu loại này thành
sai thật. Viết đúng là gọi lựa chọn bằng nội dung — `Phương án "…" sai ở chỗ…`.

**Hai cổng `G-ROADMAP*` canh trang thứ hai** (`roadmap.html`). Trang đó được **sinh** từ
đúng nguồn này — và bộ sinh còn trích thẳng CSS/JS của trang chính — nên phần cấu trúc tự
đúng; `G-ROADMAP` chỉ kiểm file trên đĩa còn bằng bản sinh lại không. Phần **không** sinh
được là 84 bản tóm tắt trong `tools/roadmap-summaries.json`. Máy không đọc được "tóm tắt này
còn đúng không", nhưng đọc được "bài đã đổi kể từ lúc tóm tắt được viết": mỗi bài có một vân
tay nội dung, đóng dấu bằng `node tools/build-roadmap.mjs --stamp`. Cổng kêu → **đọc lại bản
tóm tắt của đúng những bài đó**, sửa nếu lệch, rồi mới đóng dấu lại. Đóng dấu mà không đọc
thì cổng này thành con dấu cao su. (Đã bắt được một ca thật: tóm tắt `s-plan8w` còn ghi
"deep learning ở tuần 5" sau khi trang đổi sang tuần 6.)

**`G-ABS` canh một hình dạng câu, không canh một danh sách từ.** Lỗi hay gặp nhất trong bản
audit 2026-08-07 không phải "nói sai" mà **"nói chắc quá"**: một con số đúng trong một bối
cảnh được viết thành quy tắc chung (`cột thiếu > 60% → bỏ cột`). Đã thử bản rộng — quét
`luôn`, `duy nhất`, `bảo đảm` — và nó cho 22 kết quả mà gần hết là dương tính giả: câu phủ
định, câu trích tài liệu nhà cung cấp, và cả những đoạn đang *sửa* một tuyên bố tuyệt đối.
Nên bản giữ lại chỉ bắt **ngưỡng `%` + mệnh lệnh, không có từ nào hạ giọng ở gần** — ở trạng
thái ổn định nó im hoàn toàn. Thoát cửa: `<!-- gate:abs: lý do -->`.

**Thoát cửa** khi cổng bắt sai một chỗ cố ý: `<!-- gate:main -->` (tiêu đề trông giống
nhánh phụ nhưng là mạch chính) · `<!-- gate:long: lý do -->` (bài dài đã soát và dài là
đúng) · `/* gate:sp: lý do */` trong `<style>` (margin dọc buộc phải là px trần) ·
`<!-- gate:abs: lý do -->` (con số THẬT SỰ là ràng buộc cứng, không phải kinh nghiệm) ·
`allowEarly` trong `concepts.json` (nhắc tên để định vị). Cả năm **bắt buộc kèm lý
do nói vì sao cổng bắt sai**, không phải "đã xem rồi". Lỗi CHẶN thật mà chưa sửa thì vào
`waivers.json` — nó in lại mỗi lần chạy, và đó là điểm khác biệt. Bảng đầy đủ:
[docs/editing.md](docs/editing.md#việc-6--thêm-một-cổng-mới-vào-gatemjs).

Khuyến nghị phải **gần bằng 0 ở trạng thái ổn định**. Danh sách dài ra là dấu hiệu hoặc
nội dung đang trôi, hoặc cổng bắt sai — sửa một trong hai, đừng để nó thành tiếng ồn.

---

## 5. Cổng cần phán đoán — bạn phải tự soi

Máy không kiểm được "giải thích này có làm người ta hiểu không". Rubric đầy đủ, kèm cách
soi từng mục: **[docs/writing.md](docs/writing.md)**. Tám mục, tóm lại:

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
đây rồi tính sau". Một câu để phân biệt:

> **Chính** = không biết thì không đi tiếp được → **hiện đầy đủ trên trang.**
> **Phụ** = biết thì tốt, bỏ qua vẫn học được bài này → **popup, hoặc drawer nếu có lý do.**

Cách thử: xoá khối này khỏi mạch chính, người học vẫn làm được `ACCEPT` của bài không?
Vẫn được → phụ. Chi tiết cách chọn vật chứa + sáu dấu hiệu:
[docs/design.md](docs/design.md) §1.

| tầng | ở đâu | dùng cho |
|---|---|---|
| **mạch chính** | thân bài | con đường ngắn nhất từ chưa biết tới làm được: giải thích lõi, code phải gõ, một ví dụ chạy hết, tự kiểm |
| **popup** `data-mathdef` | modal giữa màn hình | **mặc định cho mọi nhánh phụ**: công thức, đào sâu, catalogue, danh mục lỗi, ba cách khác, paper |
| **ngăn phải** `data-aside` | drawer bên phải | **chỉ khi cần đọc SONG SONG với mạch chính** |

Ba tầng trên đều là chỗ **đọc**, nên cả ba đều là lớp phủ: mở ra thì trang phía sau bị
chặn. **`Notes` là tầng thứ tư** và luật ngược lại — nó là chỗ *viết về* cái đang đọc, nên
mở ra thì trang vẫn phải cuộn được, bấm được, chọn chữ được (dock, không phải lớp phủ).
Đó là tầng duy nhất kiểu này, và thêm tầng thứ năm thì phải viết ra lý do:
[docs/design.md](docs/design.md) §0.5.

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

**Khổ chữ: cả trang chỉ được có MỘT mép phải.**

Cột nội dung **đúng bằng** khổ chữ, nên chữ, code, card, alert, pager, hộp kết bài đều
dừng ở cùng một mép. **Bảng là ngoại lệ duy nhất** — nó được tràn ra hai bên tới
`--ds-wide`, vì đo thật thì bảng rộng tự nhiên trung vị 844px (106/155 bảng vượt khổ
chữ) trong khi code chỉ 587px (12/175 vượt): cho code tràn theo thì mất mép chung mà
được rất ít.

Mọi con số nằm ở **một khối `:root` duy nhất** đầu `<style>`, mọi thứ khác suy ra bằng
`calc()`. **Muốn nới trang thì sửa `--ds-measure` VÀ `--ds-fs`** — hai cái này đi cùng
nhau, xem ngay dưới bảng.

| token | mặc định | là gì |
|---|---|---|
| `--ds-measure` | **1060px** | khổ chữ **và** bề rộng cột |
| `--ds-wide` | 1260px | bảng được tràn rộng tới đây |
| `--ds-side` | 330px | `.wb-shell__side`, chỉ để tính chỗ trống |
| `--ds-gutter` | 20px | lề ngang `.wb-container--pad` |
| `--ds-fs` | `clamp(14px, …, 15px)` | cỡ chữ thân bài = **gốc của cả thang `--ds-t-*`** |
| `--ds-t-*` | 9 bậc × `--ds-fs` | **thang chữ**: `hero h1 h2 h3 body sub code cap label` |
| `--ds-sp-*` | 7 bậc, 4→44px | **thang khoảng cách**, khai theo QUAN HỆ: `hair tight near text block sub sec` — [docs/design.md](docs/design.md) §0.6 |
| `--ds-ctl*` | 30 / 26 / 24px | cỡ nút vuông-tròn; `--ds-ctl` là chỗ `--wb-steps-size` nối vào — §0.7 |
| `--ds-aside-w` | 1/3 cửa sổ | bề rộng ngăn phụ, kéo được — cùng cơ chế `--ds-dock-w` |
| `--ds-zoom` | **1** | không zoom nữa — giữ token để luật `vh/vw` còn chỗ bám |
| `--ds-dock-w` | 1/4 cửa sổ | bề rộng dock `Notes`, kéo được; thân trang nhường đúng chỗ |
| `--ds-vh` / `--ds-vw` | `1vh\|1vw / zoom` | 1% cửa sổ **thật** |

**`--ds-measure` và `--ds-fs` là quyết định của chủ trang — muốn đổi thì HỎI.** Hai con số
đó khoá `ký tự/dòng ≈ --ds-measure ÷ (0,46 × --ds-fs)`, và cấu hình đang dùng cố ý nhận
**152 ký tự/dòng** ở cửa sổ 1440px để đổi lấy "cột rộng hết chỗ + chữ nhỏ". Bảng số đo, bảng
dial, và cách đo lại: **[docs/design.md](docs/design.md) §0.3**.

**Cỡ chữ trong cột bài phải trỏ vào MỘT bậc của `--ds-t-*`, không viết px/`em`/`ch` rời.**
Thang có ba tầng — `:root` khai 9 bậc → `#main` nối **cả 8** token chữ của kit vào chúng →
`#main .wb-*` kéo những component mà kit ghi px cứng (99 `.wb-alert`, 58 `.wb-help`, card,
steps, cap, btn, pager…) về thang. Thiếu tầng thứ ba là có **hai hệ chữ trong cùng một cột**.
Vì cả 8 token của kit đã nối vào thang, thứ bậc đúng ở **mọi** giá trị `--ds-fs`: đổi cỡ chữ
là đổi **một** token, không phải soát lại cả trang. Đang là **8 cỡ, trải 1,92×**; cùng một
loại nội dung thì cùng một bậc. Cách đếm lại: [docs/design.md](docs/design.md) §0.2.

**Không viết `vh`/`vw`/`dvh` trần trong trang này** — dùng `--ds-vh` / `--ds-vw`. `zoom`
không điều chỉnh đơn vị viewport, nên số trần bị co theo zoom (và đó là lý do `--ds-zoom`
bằng 1, còn token thì được giữ). Media query cũng so với `viewport / zoom`: trang có 5 ngưỡng
(bốn cái `560px` cho lớp vỏ trên điện thoại, một cái `1200px` cho việc nhường chỗ dock), với
zoom = 1 chúng là ngưỡng thật. `gate.test.mjs` in cả 5 ra mỗi lần chạy để không ai thêm cái
thứ sáu mà quên chia. Ba cái giá của `zoom`: [docs/design.md](docs/design.md) §0.4.

Suy ra: `--wb-container-max`, alias hai token khổ chữ của kit (`--wb-measure` và
`--wb-measure-tight` — thiếu cái thứ hai thì đoạn intro trang chủ kẹt ~586px), cả tám token
chữ của kit + các component kit ghi px cứng (xem thang `--ds-t-*` trên), bậc tiêu đề, cỡ
chữ bảng, và `--ds-bleed` = mức tràn mỗi bên của bảng, tính bằng `clamp()` trên
`100 * --ds-vw`.

Thứ duy nhất được nới để bù dòng dài: `line-height` của `p`/`li` = **1,8**.

Đừng đặt `max-width` cứng ở đâu nữa; `G-MEASURE` bắt. Đơn vị `ch` bị cấm ở đây — nó co
theo `font-size`, nên `h2` và `<p>` cùng `74ch` lại ra hai mép lệch nhau 200px. Và **đừng
đặt px cứng cho cỡ chữ trong `#main`**: trỏ vào một bậc `--ds-t-*`. `em` chỉ dành cho thứ
phụ thuộc ngữ cảnh (code inline trong `<th>` phải nhỏ như `<th>`). Px cứng chỉ đúng ở lớp
vỏ, ngoài `#main` — và ở đó thì **mọi ô trên thanh trên dùng `--ds-navctl`**
([docs/design.md](docs/design.md) §0.1).

Ba cái bẫy khi sửa phần tràn của bảng: kit đặt
`.wb-table-scroll { width: 100% }` nên phải ép `width: auto` (width cố định thì margin
âm chỉ đẩy khối lệch chứ không nới nó); rule tràn phải là con trực tiếp `>` **và** phải
đứng sau `.ds-prose .wb-table-scroll { margin: 0 0 16px }` (shorthand `margin` đặt sau
xoá sạch `margin-inline` đặt trước); drawer và popup phải `--ds-bleed: 0px` vì không có
chỗ trống hai bên để tràn vào.

---

## 11. Thuật ngữ và từ viết tắt

- Thuật ngữ **bắt buộc phải dùng**: định nghĩa **ngay lần xuất hiện đầu tiên, kèm một ví
  dụ**, rồi dùng nhất quán. Khái niệm quan trọng đến mức không thể không biết thì dạy ở
  bài sớm nhất (`s-intro` giữ bộ từ vựng tối thiểu), đừng rải rác.
- Thuật ngữ **không bắt buộc**: bỏ. Nhưng nếu người học sẽ gặp lại nó ở nơi khác, nêu tên
  chính thức **một lần** để họ tra được — đừng bắt họ học tên trước khi hiểu ý.
- **Không đổi cách gọi giữa chừng.** Cùng khái niệm, cùng một từ, từ đầu tới cuối.
- **Lớp vỏ: thanh trên VÀ chân trang nói tiếng ANH, phần còn lại nói tiếng VIỆT.** Thanh
  trên là vùng nhỏ nhất và quen mắt nhất của trang (`Notes` · `Light`/`Dark` · `0%`), nên
  tiếng Anh ở đó không bắt người mới dịch gì để dùng được trang; chân trang là dòng ký tên
  + link "← Back to home" ở cuối, cũng không phải chỗ dạy (chủ trang chốt 2026-08-05). Thanh
  bên, panel, `<title>`, nhãn ô tìm kiếm thì tiếng Việt — đó là chỗ điều hướng, không phải
  chỗ dạy. Ngoại lệ duy nhất ngoài thanh trên: **tên panel ghi chú là `Notes`**, còn mọi câu
  *nói về* nó dùng từ **ghi chú**. Ranh giới đầy đủ + cách tự kiểm:
  [docs/design.md](docs/design.md) §0.1.
- **`roadmap.html`: hero cũng là vùng tiếng Anh** (chủ trang chốt 2026-08-06) — vùng tiếng
  Anh của trang đó là **thanh trên + hero + chân trang**. Ô này **đã bị dịch ngược một lần**
  vì luật cũ chỉ kể tên hai vùng, nên phiên soát trang xếp hero vào tiếng Việt: gặp hero
  tiếng Anh thì đó là **đúng luật**, đừng "sửa". Sửa ở `tools/build-roadmap.mjs` rồi chạy
  lại nó, đừng sửa tay file sinh.
- Đổi một từ ở lớp vỏ thì **đổi luôn trong bài** — hai tên cho một khái niệm là đúng thứ
  gạch đầu dòng ngay trên cấm. `khối lượng` được nêu kèm tên tiếng Anh đúng một lần ở trang
  chủ, để người học tra được khi gặp ở nơi khác.
- Viết tắt và khái niệm khó: giải thích tại chỗ, hoặc `title=` để hover, hoặc chip popup
  `data-math`. Đừng để người đọc phải rời bài đi tra.
- `r-glossary` là bảng tra, **không** phải chỗ thay cho việc định nghĩa tại chỗ.

---

## 12. Đóng phiên

```bash
node tools/session.mjs --close
```

Lệnh đó in ra đúng bốn thứ, và bạn không phải tự nhớ cái nào: **những lệnh cần chạy**
(nó tự biết bạn đã sửa `tools/` hay HTML), **dòng nào đổi thuộc bài nào** (`git diff --stat`
chỉ nói "HTML +88/−39", một con số vô nghĩa cho file 12k dòng), **khung `HANDOFF.md` điền
trước**, và **câu commit** theo quy ước dưới.

Ba bước bắt buộc, đều là lệnh, không còn bước nào phải mở trình duyệt (`auditPlan()` đã
nằm trong cổng `G-PLAN`, xem §3):

```bash
node tools/gate.mjs --advice     # 1. cổng CHẶN phải qua; đọc phần nhắc mới sinh ra
node tools/gate.test.mjs         # 2. nếu bạn sửa tools/: test cổng phải xanh
node tools/gate.mjs --write      # 3. nếu mục lục đổi: sinh lại + git add TOC.md
```

### Ghi `HANDOFF.md` — hai mục, và mục thứ hai quan trọng hơn

Đã sửa gì, và **cố ý KHÔNG sửa gì, vì sao**. Mục thứ nhất `git log` nói được; mục thứ hai
thì không ai nói được ngoài bạn — nó là thứ giữ cho phiên sau không cân nhắc lại đúng thứ
bạn đã cân nhắc và bỏ. Cổng `G-HANDOFF` nhắc khi có đổi trang/bộ cổng mà `HANDOFF.md`
không đổi.

**Việc còn dở thì để trong mục `## ĐANG LÀM` ở ĐẦU `HANDOFF.md`**, không phải cuối:

- Đúng **một** mục `## ĐANG LÀM` trong file, và nó nằm trên mọi mục `## Phiên …`.
- `node tools/session.mjs` in nguyên văn mục đó khi mở phiên — đó là lý do nó phải ở đầu.
- **Xong việc thì đổi tiêu đề nó thành `## Phiên <ngày> (<chữ>)`**, đừng thêm một mục mới:
  hai mục cùng mô tả một việc là cách nhanh nhất làm `HANDOFF.md` hết đáng tin.
- Trong mục đó ghi cả **phạm vi đã được chủ trang duyệt** và **câu chưa quyết** — phiên sau
  cần biết cái gì đã chốt để không hỏi lại.

### Câu commit

Repo đã dùng quy ước này rất nhất quán từ đầu; ghi ra đây để không phải đoán:

```
<loại>(ds-roadmap): <việc, tiếng Việt, không dấu chấm cuối>
```

| loại | dùng khi |
|---|---|
| `feat` | thêm năng lực cho trang hoặc cho bộ công cụ |
| `fix` | sửa một lỗi thật (nội dung sai, layout hỏng, cổng bắt sai) |
| `docs` | chỉ đổi `.md` — kể cả `HANDOFF.md`, `CLAUDE.md`, `TOC.md` |
| `chore` | công cụ / hook, không đổi gì người đọc thấy |

Scope luôn là `ds-roadmap` (repo có nhiều project; `cashy` dùng scope riêng). Nếu một
commit chạm cả nội dung lẫn công cụ thì **tách hai commit** — đừng chọn một loại rồi thôi.

**Push là DEPLOY.** Nhánh `main` đẩy lên là GitHub Pages build lại. Hook `pre-push` chạy
cổng + audit (+ test nếu `tools/` đổi) rồi mới cho đi — mất ~20 giây và nó **chặn thật**.

**Cẩn thận:** file HTML này thỉnh thoảng có nhiều phiên làm việc song song.
`node tools/session.mjs` phát hiện việc đó ngay ở dòng đầu; nếu file đã đổi so với lúc bạn
đọc, đọc lại vùng sắp sửa trước khi Edit, và **đừng commit hộ phiên khác**.

---

## 13. Sổ học (`Notes` trên trang) — phản hồi của người học về chính trang này

Chủ trang **vừa viết trang này vừa học nó**. Phản hồi người-học → người-viết là bằng chứng
chất lượng nội dung đắt nhất trang có thể có, và nó bay hơi sau mỗi buổi học nếu không có
chỗ ghi. Chỗ ghi đó là [LEARNING-LOG.md](LEARNING-LOG.md).

**Agent ghi, chủ trang nói.** Không phải file gõ tay — nhật ký học gõ tay chết trong một
tuần. Ba đường vào:

```bash
node tools/learn.mjs --add <id> <loại> <nội dung>   # chủ trang nhắc tới một bài khi trò chuyện
node tools/learn.mjs --sync                         # TỰ tìm bản xuất mới nhất từ trang rồi trộn
node tools/learn.mjs                                # xem đang ở đâu
```

Sáu loại: `m1` `m2` `m3` (mức) · **`tac`** (chỗ đọc mà không hiểu) · `go` (đã gỡ) · `ghi`.

**Loại `tac` là loại đáng giá nhất trong cả cơ chế này.** Một dòng *"mục 3 của `d-eda`:
không hiểu datacard để làm gì"* thắng mọi heuristic của `G-VIZ`/`G-LAYER`/`G-DUMP`, vì nó
có một người đọc thật ở một vị trí cụ thể. Và **≥2 bài cùng tắc ở một khái niệm** là tín
hiệu mà `concepts.json` không thể tự có: khái niệm đó đang được dạy **muộn hơn chỗ cần
dùng**. Cổng `G-LEARN` báo đúng việc đó.

Hai luật của file:

1. Mục `## Sổ` là **nguồn** và **chỉ được thêm vào cuối**. Hạ mức cũng là *thêm* một dòng.
2. Khối `learn:summary` là **sản phẩm** — `learn.mjs --write` sinh lại toàn bộ, đừng sửa tay.

Trên trang, nút **Notes** (phím `n`) ghi trực tiếp vào bộ nhớ trình duyệt và xuất ra đúng
định dạng mục `## Sổ`, nên **tải về → `--sync` → khôi phục** là một vòng khép kín, kể cả
tiến độ đã tick. Bộ nhớ trình duyệt là bản làm việc; `LEARNING-LOG.md` là bản bền có lịch
sử git.

**Trang KHÔNG tự ghi được vào `LEARNING-LOG.md`** — nó là một file HTML tĩnh, không có
server, và thường được mở từ GitHub Pages nên còn khác cả origin. Nên đường đi bắt buộc là
*trang → file tải về → repo*, đúng hai bước, và cả hai đều hiện trên panel `Notes`. Việc duy
nhất bỏ được là bắt người dùng tự tìm file: `--sync` quét `~/Downloads` (rồi Desktop, thư
mục trang, gốc repo), lấy bản **mới nhất**, trộn vào. Trộn là idempotent nhờ khoá lọc trùng
nên chạy lại bao nhiêu lần cũng không sinh dòng thừa — không cần đánh dấu "file đã nạp".
`node tools/session.mjs` khi mở phiên **tự phát hiện** bản xuất còn dòng chưa nạp và in
đúng một lệnh cần chạy. Tên file (`learning-log-YYYY-MM-DD.md`) là hợp đồng giữa `a.download`
trong HTML và `PAT_EXPORT` trong `learn.mjs` — đổi một bên là đứt, xem `docs/editing.md`.
