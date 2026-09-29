# Cổng — canh gì, kêu thì sửa sao

Tên và mức của mọi cổng: CLAUDE.md §4, hoặc `node tools/gate.mjs --gates`. File này ghi phần mà thông báo
của cổng không nói hết: cổng đo gì, sửa thế nào cho đúng, thoát cửa ở đâu.

## Chạy ở đâu

- `tools/check.sh` chạy `gate.mjs --ci`, chặn commit sửa HTML mà `TOC.md` / `roadmap.html` sinh lại chưa
  add, và chạy `gate.test.mjs` khi `tools/` đổi (ở CI luôn chạy). Hook commit ở gốc repo và CI gọi nó (REPO-017).
- `--ci` nâng `G-TOC-STALE` và `G-ROADMAP` thành chặn: bản commit phải mang sản phẩm khớp nguồn.
- Trong hook, git đặt `GIT_DIR` mà không đặt `GIT_WORK_TREE`, nên thư mục đang đứng bị coi là gốc repo:
  lệnh git trong cổng chạy từ gốc (`git -C`), và `gate.test.mjs` bỏ hết biến `GIT_*` trước khi dựng repo tạm.
- `viz-check.mjs` cần Chrome nên không nằm trong `check.sh`; chạy tay khi thêm hoặc sửa hình. Không có
  Chrome thì nó in một dòng rồi thoát 0.

## Mục lục và tham chiếu

- `G-TOC-STRUCT` so chữ ký cấu trúc (bài, tên, chặng, ưu tiên, thời lượng, tuần, tiêu chí đạt), không so số
  dòng; số dòng cũ chỉ là `G-TOC-STALE`. Nổ thì trả lời bốn câu ở CLAUDE.md §6 rồi mới `gate.mjs --write`.
- `G-ORDER`, `G-NODE`, `G-REF`, `G-ORPHAN`, `G-PAYOFF`: thông báo chỉ đúng chỗ sai.
- `G-NEXT` biết bài sau đã đổi nhưng không đọc được câu: đọc lại `PAYOFF[id][1]` của những bài nó nêu tên.

## Trang và nội dung

- `G-SYNTAX`: nội dung động nằm trong template literal (`renderHome`, `renderPlan14`, `renderNotes`…); một
  backtick trong đó, kể cả trong comment HTML, làm `SyntaxError` cả `<script>` và trang chỉ còn cái vỏ.
  Cách tránh: CLAUDE.md §4.
- `G-PLAN` là bản node của `auditPlan()` (`tools/plan.mjs`); chạy riêng: `node tools/audit.mjs`.
- `G-FWD` đọc `tools/concepts.json`: chặn ở tiêu chí đạt và deliverable tuần, chỉ nhắc ở thân bài (CLAUDE.md §8).
- `G-LAYER` bắt tiêu đề tự khai là nhánh phụ ("có thể bỏ qua", "đọc thêm") và bài dài quá 200 dòng.
- `G-DUMP` bắt mô tả hình sinh bằng `map(...).join(...)` trên cả mảng dữ liệu, và đoạn văn dày cụm số ngăn
  bằng phẩy. Nó không bắt đoạn lan man không có số (writing.md mục 8).
- `G-ABS` chỉ bắt một hình dạng câu: ngưỡng `%` đi với mệnh lệnh, không có từ hạ giọng gần đó
  (`cột thiếu > 60% → bỏ cột`). Quét cả từ tuyệt đối (`luôn`, `duy nhất`) thì gần hết là dương tính giả.
- `G-VIZ` chỉ liệt kê bài chưa có hình, bảng hay code; không chặn.
- `G-MEASURE` bắt `max-width` cứng. `G-SPACING` bắt `margin` dọc px trần trong `<style>`; padding và nhích
  quang học ≤5px không tính (design.md §0.6).

## Quiz (`data/quiz.json`)

- `G-QUIZ` kiểm đủ trường, `a` trỏ ô có thật, id có trong `TREE`. Câu hỏi đúng và hay là việc đọc của người.
- `G-QUIZ-ESC` chặn ba dạng làm mất chữ khi render bằng `innerHTML`: `<` trần ngay trước chữ cái (trình
  duyệt mở thẻ và ăn chữ tới `>` kế tiếp), `&` trần thành một entity khác, thẻ hở hay đóng lệch.
  `>` trần và `< 0,05` render đúng nên không bị bắt; đừng chuẩn hoá escape cả file.
- `G-QUIZ-COV` so số câu với số mục `h2`/`h3` của mạch chính (DS-010); chỉ nhắc, vì không mục nào cũng đáng một câu.
- `G-QUIZ-GUESS` đo phân phối hạng độ dài của đáp án đúng trên cả bộ (DS-011): mỗi hạng 1–4 nên quanh 25%,
  cổng kêu khi một hạng vượt 40% và in cả bốn hạng. Ràng buộc từng câu thì lối tắt chỉ dịch sang hạng kế bên.
  - Sửa: nới hoặc rút distractor để mỗi cái mang lý lẽ sai của riêng nó. Đừng cắt đáp án cho ngắn — phần
    bị cắt thường là lý lẽ, thuộc về `why`.
  - Câu có đáp án rất ngắn (dưới ~40 ký tự) không thể đứng hạng 1: ngoại lệ đã biết.
- `G-QUIZ-TIE`: distractor chênh đáp án dưới 3 ký tự làm nhiễu thước của `G-QUIZ-GUESS`, vì hạng nhảy khi
  chênh 1 ký tự. Độ dài đếm sau khi bỏ thẻ. Sửa bằng cách rút hẳn hoặc nới hẳn distractor, không đổi hạng
  của đáp án.
- `G-QUIZ-POS`: giải thích gọi lựa chọn bằng nội dung (`Phương án "…" sai ở chỗ…`), không bằng vị trí
  ("đáp án cuối"): rải lại vị trí đáp án là câu theo vị trí thành sai.

## Roadmap (`roadmap.html`)

- `G-ROADMAP`: file trên đĩa khác bản sinh lại; sửa bằng `node tools/build-roadmap.mjs` rồi add. Bộ sinh
  ném lỗi khi không trích được CSS/JS từ trang chính (đổi tên class, dời khối).
- `G-ROADMAP-SUM`: mỗi bài có vân tay nội dung, đóng dấu bằng `node tools/build-roadmap.mjs --stamp`. Cổng
  kêu thì đọc lại tóm tắt của đúng những bài đó, sửa nếu lệch, rồi mới đóng dấu; đóng dấu mà không đọc là
  làm cổng vô dụng.
- `G-ROADMAP-4` canh hợp đồng tự chứa (DS-002): mỗi bước `core` có `tldr` (mental model một câu), một hình
  (`viz` hoặc khối `data-viz`), `example` (chạy được hoặc có số) và `check` (self-check có đáp án). Bước
  `good`/`skim` mặc định ẩn nên không đòi.
  - `example` và `check` là dữ liệu trong `tools/roadmap-summaries.json`, gõ lại được trong một phút.
  - Mỗi dòng `example.code` ≤ 76 ký tự (ngăn 47% ở cửa sổ 1440 vừa ~78 ký tự mono; bề rộng ngăn đang chờ
    chủ trang). `out` có ít nhất một chữ số.

## Quy trình

- `G-DOC`: mọi tên trong `GATES` phải có trong CLAUDE.md.
- `G-HANDOFF`: đổi trang hoặc `tools/` mà cả `HISTORY.md` lẫn `HANDOFF.md` đều không đổi; một trong hai đổi
  là đủ, `DECISIONS.md` không tính. Lúc commit nó xét file đang commit; lúc chạy tay, cây làm việc.
- `G-LEARN`: luật ở `tools/learn.mjs`; không có `LEARNING-LOG.md` thì im.

## viz-check.mjs

- Tiêm script vào bản sao của trang, chạy Chrome headless, thử mọi trạng thái điều khiển của mọi mount
  hình: mỗi lựa chọn phân đoạn × min, giữa, max của mỗi thanh trượt.
- Kiểm năm thứ: mount có render; hai nhãn đè nhau; nhãn tràn ngoài `viewBox`; `.ds-viz__alt` có chữ; nhãn
  dài hơn `<rect>` chứa nó (`chu-tran-hop`, khoảng hở < 0,5 đơn vị `viewBox`).
- `chu-tran-hop` chỉ soi `<rect>`: nhãn đặt lên đúng thứ nó gọi tên (`"0"` trên đường 0) là direct
  labelling, không phải lỗi.
- Khi sửa nó:
  - đọc nét của `<rect>` bằng `getAttribute`: `getComputedStyle(rect).stroke` trả `none` khi nét viết bằng
    presentation attribute có `var()`;
  - đo khoảng hở, đừng co hộp chữ rồi hỏi viền có xuyên qua không — nhãn vừa khít chỉ chạm viền;
  - toạ độ nhãn là `svg.getScreenCTM().inverse().multiply(text.getScreenCTM())`: `getBBox()` trần tố oan
    nhãn xoay 90°, `getCTM()` trả pixel viewport chứ không phải đơn vị `viewBox`;
  - bỏ chữ có `opacity: 0` (có hình vẽ mỗi số hai lần để đổi màu), và đừng đòi mọi mount có `<svg>` (có
    hình dựng bằng HTML).

## Thoát cửa

Mỗi thoát cửa kèm lý do nói vì sao cổng bắt sai ở chỗ đó, không phải "đã xem rồi".

| cách | viết ở đâu | dùng khi |
|---|---|---|
| `<!-- gate:main -->` | ngay trước `<h2>`/`<h3>` | tiêu đề trông như nhánh phụ nhưng mục nằm trên mạch chính |
| `<!-- gate:long: lý do -->` | trong `<template>` của bài | bài dài hơn 200 dòng đã soát, và dài là đúng |
| `<!-- gate:abs: lý do -->` | trong `<template>` của bài | con số thật sự là ràng buộc cứng (hạn mức, quy định) |
| `/* gate:sp: lý do */` | dòng đó hoặc ngay trên, trong `<style>` | `margin` dọc buộc phải là px trần |
| `allowEarly` + `allowWhy` | `tools/concepts.json` | nhắc khái niệm trước bài dạy nó chỉ để định vị |
| `tools/waivers.json` | `match`, `since`, `why`, `fix` | lỗi chặn thật, cách sửa là quyết định giáo trình cần phiên riêng |

- Năm cách đầu đóng một phát hiện vĩnh viễn. Waiver là nợ: nó in lại mỗi lần chạy, và kêu khi không còn
  khớp lỗi nào.
- Đừng dùng waiver thay cho thoát cửa, và đừng dùng thoát cửa để làm im một lỗi thật.

## Thêm một cổng

1. Chặn hay nhắc? Chặn chỉ khi lỗi chắc chắn sai và cổng chắc chắn bắt đúng; nghi ngờ thì cho nhắc.
2. Ở trạng thái bình thường nó có im không? Vừa sinh ra đã kêu hàng chục lần thì thu hẹp, hoặc gộp theo nhóm như `G-FWD`.
3. Có cách nói "chỗ này cố ý" không? Cổng đoán bằng dấu hiệu nào cũng cần một thoát cửa.

- Rồi thêm dòng vào `GATES` trong `gate.mjs`, thêm tên vào CLAUDE.md §4, thêm một ca NỔ vào
  `tools/gate.test.mjs`, và chạy `node tools/gate.test.mjs`.
- Test chạy hai chiều: vi phạm thì cổng phải kêu đúng tên, hết vi phạm thì phải im. Nó in ra cổng nào chưa có ca NỔ.
