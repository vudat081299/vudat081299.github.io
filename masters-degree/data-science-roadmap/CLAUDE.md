# Trang dạy Data Science

Mục tiêu: đưa người đọc được Python cơ bản từ số 0 tới chỗ tự làm một product AI thật và viết được luận văn về nó.
Trang hứa một quỹ đạo: lộ trình, giải thích, tiêu chí đạt; năng lực đến từ artifact người học làm ra.
Chỗ nào trang chỉ tạo nhận biết thì nói thẳng bằng nhãn `SCOPE`. Hứa quá là lỗi nội dung.

## 0a. Bắt đầu

- Mở phiên: `node tools/session.mjs` (phiên khác đang làm dở, nền local cũ, việc dở, cổng xanh hay đỏ).
- `docs/editing.md`: đổi cái này phải đổi gì nữa, gõ ở đâu. `docs/writing.md`: viết cho người đọc hiểu.
- `docs/design.md`: trông thế nào, nằm ở đâu. `docs/gates.md`: cổng canh gì, kêu thì sửa sao, thoát cửa.
- Tài liệu chỉ ghi luật và con số đang dùng (DS-033). Quyết định: `DECISIONS.md`; nhật ký: `HISTORY.md`; việc dở: `HANDOFF.md`.
- Token, component hay hàm dùng chung mới hoặc dùng lại thì ghi vào design.md hoặc file này (DS-034).

| định làm | đọc | xong khi |
|---|---|---|
| sửa chữ một bài | `gate.mjs --show <id>`, writing.md | cổng chặn qua, `--advice` không có nhắc mới |
| thêm, xoá, dời bài hay chặng | §6, editing.md việc 1–3 | `gate.mjs --write`, đọc lại `G-NEXT`; giữ `id` chặng |
| thêm hình, bảng, code | §10, design.md | `node tools/viz-check.mjs` sạch; không cuộn ngang ở 1440, 1100, 375px |
| đổi giao diện, lớp vỏ, cỡ chữ, cột | design.md, §7, §10, §11 (cột: hỏi chủ trang) | xem cả sáng lẫn tối; đếm lại bằng script trong design.md |
| sửa lịch 8 tuần, 14 ngày | §8, editing.md (bảng khối dữ liệu) | `G-PLAN` qua |
| sửa trang Roadmap học nhanh | §2, gates.md (`G-ROADMAP*`) | `node tools/build-roadmap.mjs` |
| thêm, sửa câu hỏi | editing.md việc 7 | các cổng `G-QUIZ*` im |
| thêm, sửa một cổng | gates.md | `node tools/gate.test.mjs` xanh |
| chủ trang chốt, hoặc nhắc tới việc học | §12, §13 | mục `DS-NNN`; `learn.mjs --check` im |
| đóng phiên | §12 | `node tools/session.mjs --close`; `HISTORY.md` có mục của phiên |

## 0. Đừng đọc cả file HTML

`data-science-roadmap.html` hơn 1 MB. Đọc `TOC.md` (mỗi bài một dòng, kèm dải dòng), rồi
`node tools/gate.mjs --show <id>` hoặc `--where <id>`.

## 1. Mô hình

- Một file HTML tự chứa, không build, không server; bài nằm trong `<template data-node="id">`, router theo hash.
- `TREE` là mục lục nguồn: id, tiêu đề, `r` đọc, `x` thực hành, `d` deliverable, `p` ưu tiên. Mọi con số giờ tính từ `r`, `x`, `d`.
- `PAYOFF[id]` = `[bạn có gì, nó dẫn đi đâu]`, hiện ở dải mục tiêu đầu bài và hộp kết bài.
- `ACCEPT[id]` là tiêu chí đạt, ranh giới giữa "đã đọc" và "làm được".
- `auditPlan()` kiểm lịch mỗi lần tải trang; `tools/plan.mjs` là bản node của nó (`G-PLAN`).

## 2. Nguồn và sản phẩm

- `data-science-roadmap.html` là nguồn của bài học và layout. Trong repo nó chỉ cần `../../web-builder/web-builder.css`
  và `data/quiz.json` (thiếu file sau thì mất quiz, trang vẫn chạy).
- `data/quiz.json` là nguồn câu hỏi; cả hai trang fetch nó lúc chạy.
- `TOC.md` và `roadmap.html` là sản phẩm của `node tools/gate.mjs --write`. Lệch thì HTML đúng.
- `tools/build-roadmap.mjs` dựng `roadmap.html` từ trang chính (trích cả CSS/JS) và `tools/roadmap-summaries.json`.
- `tools/read-html.mjs` là luật đọc HTML duy nhất. `tools/concepts.json` cho `G-FWD`; `tools/waivers.json`: lỗi hoãn.

Bốn luật:

1. HTML không phụ thuộc `tools/` hay `docs/`: xoá hai thư mục đó thì trang vẫn chạy.
2. Đừng sửa tay `TOC.md` hay `roadmap.html`. Comment nhắc trang chính trong `roadmap.html` là ghi nguồn build, giữ lại.
3. Mỗi mẩu nội dung đúng một nguồn; cần bản tra cứu thì sinh ra. HTML đang tiến tới chỉ còn design và layout
   (DS-004): đừng tự tách bài học, nhưng nội dung mới đặt ngay ở `data/` — trang fetch tương đối, vẫn chạy khi
   fetch hỏng, và `read-html.mjs` có hàm đọc file đó.
4. `LEARNING-LOG.md` là dữ liệu, không phải nội dung trang (§13).

Định thêm một mục vào file này thì xem trước nó có thuộc một file trong `docs/` không.

## 3. Chạy cổng

```bash
node tools/gate.mjs [--advice]      # mọi cổng; --write sinh lại TOC.md và roadmap.html; --gates liệt kê
node tools/gate.test.mjs            # test của bộ cổng
node tools/audit.mjs                # riêng lịch học
node tools/build-roadmap.mjs        # riêng roadmap.html; --stamp đóng dấu lại tóm tắt
node tools/learn.mjs                # sổ học; --add, --sync, --write, --check
node tools/viz-check.mjs            # hình có đọc được không; cần Chrome
sh tools/check.sh                   # cổng lúc commit và ở CI
```

- `tools/check.sh` tự chạy khi commit có file của thư mục này và ở CI mỗi lần push; deploy chờ CI (REPO-017).
- `viz-check.mjs` không nằm trong `check.sh` vì cần Chrome: chạy nó khi thêm hoặc sửa hình.
- Cổng không thấy layout: sửa giao diện thì mở trang bằng mắt (design.md §8).

## 4. Cổng tự động

Phải khớp `GATES` trong `gate.mjs` (`G-DOC` đối chiếu). Chi tiết và cách sửa: `docs/gates.md`.

- Chặn: `G-SYNTAX` script chính phân tích được · `G-TOC-STRUCT` cấu trúc `TOC.md` khớp HTML · `G-ORDER` thứ tự
  `<template>` khớp `TREE` · `G-NODE` mỗi bài một template · `G-REF` mọi `data-aside`/`data-math`/`data-goto`/`#/id`
  giải được · `G-ORPHAN` nhánh phụ nào cũng có bài mở · `G-PAYOFF` bài nào cũng có `PAYOFF` · `G-NO-DETAILS` không
  `<details>` · `G-FWD` tiêu chí đạt không đòi thứ chưa dạy · `G-PLAN` lịch nhất quán · `G-QUIZ` câu hỏi đủ trường,
  `a` trỏ lựa chọn có thật · `G-QUIZ-ESC` chữ quiz không bị trình duyệt ăn mất.
- Nhắc (hai cổng đầu chặn khi `--ci`): `G-TOC-STALE`, `G-ROADMAP` sản phẩm cũ · `G-ROADMAP-SUM` tóm tắt cũ hơn bài ·
  `G-ROADMAP-4` bước core thiếu một trong bốn vật · `G-LAYER` mục tự khai là phụ, bài quá 200 dòng · `G-DUMP` đọc
  lại bảng số · `G-ABS` ngưỡng `%` viết như quy luật · `G-VIZ` bài chưa có gì để nhìn · `G-MEASURE` `max-width`
  cứng · `G-SPACING` `margin` dọc px trần · `G-FWD` ở thân bài · `G-NEXT` bài sau đổi · `G-DOC` cổng chưa có tên
  ở đây · `G-HANDOFF` đổi trang mà không ghi `HISTORY.md`/`HANDOFF.md` · `G-LEARN` sổ học · `G-QUIZ-COV` ít câu
  hơn số mục · `G-QUIZ-POS` gọi lựa chọn theo vị trí · `G-QUIZ-GUESS` đáp án lộ vì độ dài · `G-QUIZ-TIE` chênh dưới 3 ký tự.
- Chú thích trong template literal của JS không dùng backtick: một backtick làm `SyntaxError` cả `<script>`.
  Gọi tên class bằng chữ trần, hoặc đưa chú thích ra comment JS phía trên hàm.
- Phần nhắc phải gần 0; dài ra là nội dung trôi hoặc cổng bắt sai — sửa một trong hai.
- Cổng bắt sai một chỗ cố ý: thoát cửa kèm lý do. Lỗi chặn thật chưa sửa được: `waivers.json` (gates.md).

## 5. Cổng cần phán đoán

Máy không kiểm được bài có làm người đọc hiểu không. Tự soi tám mục của `docs/writing.md`: đúng và đáng tin;
cụ thể trước, trừu tượng sau (ADEPT); gỡ hiểu nhầm trước khi xây; ví von nói chỗ nó hỏng; một ý mới mỗi lúc;
mỗi bài có kết quả kiểm được; mạch chính sạch (§7); không đọc lại bảng thành câu.

## 6. Kỷ luật mục lục

- `TREE` là thứ agent nhìn để quyết định mà không đọc chi tiết: nó phải đúng và khớp `TOC.md`.
- Chỉ soi lại mục lục khi thêm, xoá, dời hay đổi vai một bài; `G-TOC-STRUCT` chỉ nổ khi đó.
- Thêm một bài thì trả lời trước bốn câu:
  1. Nó thuộc chặng nào, và vì sao không phải chặng liền trước hay liền sau?
  2. Đặt ở đâu trong chặng để thứ tự vẫn là bao quát → chi tiết, dễ → khó?
  3. Nó có làm bài nào phía trước thành dư không? Có thì gộp, hoặc hạ bài kia xuống `skim`.
  4. Nó có dùng khái niệm chưa được dạy ở vị trí đó không (§8)?
- Xoá một bài: nói rõ mất gì; sửa mọi chỗ trỏ tới nó (`PAYOFF` "bài sau…", `WEEKS`, `DAYS`, `COMPS`, `PORTFOLIO`).
- Xong: `node tools/gate.mjs --write`, commit `TOC.md` cùng HTML.

## 7. Mạch chính và mạch phụ

- Chính là thứ không biết thì không đi tiếp được: hiện đầy đủ trên trang.
- Phụ là thứ bỏ qua vẫn học được bài: popup `data-mathdef` là mặc định; ngăn phải `data-aside` chỉ khi phải đọc
  song song với mạch chính, như bảng so sánh công cụ `cmp-*`.
- Cách thử: xoá khối khỏi mạch chính, người học vẫn làm được `ACCEPT` thì khối là phụ.
- Ba tầng đọc là lớp phủ; `Notes` là tầng thứ tư, dock không phủ (design.md §0.5). Thêm tầng thứ năm thì ghi lý do.
- Không `<details>` hay gập tại chỗ cho kiến thức (`G-NO-DETAILS`).
- Mục thuộc mạch chính mà tiêu đề trông như nhánh phụ: `<!-- gate:main -->` ngay trước tiêu đề, kèm lý do.
- Rút quá nhiều vào popup thì mạch chính rỗng, cũng là lỗi; trừ bài tra cứu `s-lookup`, `r-stack`.
- Dấu hiệu một khối ở sai tầng: design.md §1.

## 8. Thứ tự và phụ thuộc

- Trình tự: bao quát → chi tiết, dễ → khó, nhỏ → to, cụ thể → trừu tượng.
- Không dùng khái niệm trước khi dạy nó. Trong `ACCEPT` hay deliverable tuần: lỗi chặn (`G-FWD`). Trong thân bài:
  nhắc; được nếu bài định nghĩa một câu tại chỗ rồi trỏ tới bài dạy đầy đủ. Chỉ nêu tên để định vị ("sẽ học ở
  chặng 5"): được, khai vào `allowEarly` ở `tools/concepts.json`.
- `concepts.json` chỉ giữ khái niệm mà dùng sớm là sai thật; danh sách vô hại biến cổng thành tiếng ồn.
- `auditPlan()` chỉ kiểm phụ thuộc đã khai (`WEEKS.needs`); phụ thuộc nằm trong chữ là việc của `G-FWD`.

## 9. Đầu mỗi bài trả lời bốn câu

- Nói về gì: `<h1>` và đoạn đầu. Xong có gì: dải `.ds-obj` từ `PAYOFF[id][0]`. Ưu tiên: chip `Bắt buộc`,
  `Nên biết`, `Định vị là đủ` (`TREE.p`). Cần đến đâu: chip `14 ngày`, thời lượng, nhãn `SCOPE`.
- `PAYOFF[id][0]` là kết quả cầm được, không phải chủ đề: "Mã hoá sin/cos, gõ được ở cả bốn mức từ notebook tới
  Pipeline", không phải "Hiểu về feature engineering".
- Câu đó lặp lại ở hộp kết bài là chủ ý: đầu bài là lời hứa, cuối bài là biên nhận.

## 10. Hình và khổ chữ

- Visualize thứ visualize được, nhưng không thêm hình trang trí. `G-VIZ` chỉ liệt kê.
- Hình chỉ rõ cái gì ánh xạ sang cái gì, có `.ds-viz__alt` chứa mọi thông tin của SVG; kéo được thì tốt hơn tĩnh.
- Cả trang một mép phải (DS-013): cột nội dung bằng khổ chữ; chỉ bảng được tràn tới `--ds-wide`.
- Mọi con số ở một khối `:root`. Nới trang là sửa `--ds-measure` và `--ds-fs` cùng lúc, và hỏi chủ trang trước
  (DS-014). Token và số đo: design.md §0.3.
- Cỡ chữ trong `#main` trỏ vào một bậc `--ds-t-*`, không px, `em`, `ch` rời; `em` chỉ cho thứ phụ thuộc ngữ cảnh
  như code inline (design.md §0.2).
- Không `vh`, `vw`, `dvh` trần; dùng `--ds-vh`, `--ds-vw` (design.md §0.4; `gate.test.mjs` canh).
- Không `max-width` cứng (`G-MEASURE`). Chỉ được nới `line-height` của `p`, `li` (= 1,8) để bù dòng dài.
- Px cứng chỉ ở lớp vỏ, ngoài `#main`; mọi ô trên thanh trên cao `--ds-navctl` (design.md §0.1).
- Sửa phần tràn của bảng: đọc ba cái bẫy ở design.md §2 trước.

## 11. Thuật ngữ và ngôn ngữ

- Thuật ngữ bắt buộc: định nghĩa ngay lần đầu, kèm ví dụ, rồi dùng nhất quán; khái niệm lõi dạy sớm nhất
  (`s-intro` giữ bộ từ vựng tối thiểu).
- Thuật ngữ không bắt buộc: bỏ; người học sẽ gặp lại thì nêu tên chính thức một lần để tra được.
- Không đổi cách gọi giữa chừng. Đổi một từ ở lớp vỏ thì đổi luôn trong bài.
- Thanh trên và chân trang nói tiếng Anh; thanh bên, panel, `<title>`, ô tìm kiếm nói tiếng Việt (DS-016).
  Tên panel ghi chú là `Notes`, câu nói về nó dùng từ "ghi chú" (design.md §0.1).
- `roadmap.html`: vùng tiếng Anh là thanh trên, hero, chân trang (DS-017); sửa ở `tools/build-roadmap.mjs`.
- `khối lượng` nêu kèm tên tiếng Anh đúng một lần, ở trang chủ.
- Viết tắt và khái niệm khó: giải thích tại chỗ, bằng `title=`, hoặc chip `data-math`; `r-glossary` không thay việc đó.

## 12. Đóng phiên

- `node tools/session.mjs --close` in lệnh cần chạy, dòng đổi thuộc bài nào, khung `HISTORY.md` và câu commit.
- Trước commit: `node tools/gate.mjs --advice`; sửa `tools/` thì `node tools/gate.test.mjs`; mục lục đổi thì `--write`.
- `HISTORY.md`: mỗi phiên một mục mới trên đầu — đã sửa gì, cố ý không sửa gì và vì sao. Không sửa mục cũ.
- `HANDOFF.md`: chỉ việc dở, đủ bốn mục (trống thì "Không có."), mỗi việc một `###` tự nói nó là gì; xong thì xoá.
  Việc đang làm ghi cả phạm vi chủ trang đã duyệt và câu chưa quyết.
- `DECISIONS.md`: chỉ điều chủ trang chốt hoặc xác nhận; không chắc thì đừng ghi. Khuôn và cách thay một quyết
  định: đầu `tools/decisions.py` ở gốc repo.
- Commit: `<loại>(ds-roadmap): <việc, tiếng Việt, không chấm cuối>`; loại `feat`, `fix`, `docs` (chỉ `.md`),
  `chore` (công cụ). Chạm cả nội dung lẫn công cụ thì tách hai commit.
- Push `main` là deploy; CI chạy lại mọi cổng, đỏ thì web giữ bản cũ (REPO-014).
- Hay có phiên song song: file đổi so với lúc đọc thì đọc lại vùng sắp sửa; đừng commit hộ phiên khác.

## 13. Sổ học (`Notes`)

- `LEARNING-LOG.md` giữ phản hồi của chủ trang, người vừa viết vừa học trang này. Agent ghi, chủ trang nói.
- `node tools/learn.mjs --add <id> <loại> <nội dung>` khi chủ trang nhắc tới một bài; `--sync` trộn bản xuất từ trang.
- Sáu loại: `m1`, `m2`, `m3` (mức), `tac` (đọc mà không hiểu), `go` (đã gỡ), `ghi`.
- `tac` đáng giá nhất: ≥2 bài tắc cùng một khái niệm là khái niệm đó dạy muộn hơn chỗ cần dùng (`G-LEARN`).
- Hình có đọc được không thì agent tự kiểm (`viz-check.mjs`). Có dạy được không chỉ biết qua dòng `tac`; đừng hỏi
  chủ trang về hình của bài chưa học (DS-035).
- Mục `## Sổ` là nguồn, chỉ thêm vào cuối, kể cả khi hạ mức. Khối `learn:summary` do `learn.mjs --write` sinh.
- Nút `Notes` (phím `n`) ghi vào bộ nhớ trình duyệt và xuất đúng khuôn `## Sổ`; trang không tự ghi vào repo.
- `--sync` lấy bản xuất mới nhất ở `~/Downloads`, Desktop, thư mục trang, gốc repo; chạy lại không sinh dòng
  thừa. `session.mjs` báo khi còn bản xuất chưa nạp.
- Tên file `learning-log-YYYY-MM-DD.md` là hợp đồng giữa `a.download` trong HTML và `PAT_EXPORT` của `learn.mjs`
  (`gate.test.mjs` canh).
