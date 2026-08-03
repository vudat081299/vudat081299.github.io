# Handoff — data-science-roadmap.html

File là single-page app (~12k dòng, tự chứa) dựng trên web-builder CSS. Nội dung bài nằm
trong các `<template data-node="…">`, router hash dựng ra.

**Đọc [CLAUDE.md](CLAUDE.md) trước.** Đừng mở cả file HTML để tìm hiểu — dùng `TOC.md`
và `node tools/gate.mjs --show <id>`.

Hai lớp kiểm tự động:
- `node tools/gate.mjs` — cổng cấu trúc, chạy tự động sau mỗi Edit (Claude Code hook) và
  ở `pre-commit`.
- `auditPlan()` trong Console — cổng cần DOM thật. Phải trả `[]`.

---

## Phiên 2026-08-04 — dựng bộ cổng + tài liệu, và sửa bố cục

### ĐÃ XONG

**Hạ tầng cổng (mới).**
- `tools/gate.mjs` — 8 cổng CHẶN + 5 cổng khuyến nghị. Chạy 0,25 s. Sinh `TOC.md`, và có
  `--show`/`--where <id>` để mở đúng một bài mà không nạp cả file.
- `TOC.md` — **sinh tự động**, đừng sửa tay. Mang chữ ký cấu trúc; `G-TOC-STRUCT` chỉ nổ
  khi cấu trúc giáo trình đổi, không nổ vì số dòng xê dịch (`G-TOC-STALE`, tự làm mới).
- `tools/concepts.json` — khái niệm nào dạy ở bài nào, đầu vào cổng `G-FWD`.
- `tools/waivers.json` — nợ đã biết, in lại mỗi lần chạy. **Đang có 2 waiver, xem dưới.**
- `tools/hooks/post-edit.sh` — cổng chạy **ngay sau mỗi Edit/Write** vào file HTML, trượt
  thì đẩy lỗi lại cho agent trong cùng lượt (Claude Code `PostToolUse`).
- `tools/hooks/pre-commit` — chặn commit.
- `tools/install-hooks.sh` cài cả hai. **Phải có script vì `.git/hooks/` và `.claude/` đều
  bị git bỏ qua** (`.claude/` trong `.gitignore`) — hook không tự theo repo về máy mới.
  Nguồn sự thật là `tools/hooks/pre-commit` + `tools/hooks/claude-settings.json` (được
  theo dõi). Đã cài trên máy này; máy khác chạy một lần. Chạy lại không sinh hook trùng.
  Claude Code chỉ nạp lại settings khi mở `/hooks` hoặc khởi động lại phiên.
- Đã thử cả hai chiều: tự tạo vi phạm (TOC lệch cấu trúc, ref hỏng, `<details>`, lệch thứ
  tự template, số dòng cũ) → cổng nổ đúng; hoàn lại → im.

**Tài liệu (mới).** `CLAUDE.md` (luật + đường vào), `docs/content-gates.md` (rubric 8 cổng
cần phán đoán, dựa trên skill `explain-clearly`), `docs/authoring.md` (công thức thêm bài /
nhánh phụ / hình, và mọi chỗ phải wire). Mỗi file một lý do để đổi — bảng ở CLAUDE.md §2.

**Bố cục / bug đã sửa.**
- **Khổ chữ:** trước có BỐN mép phải (chữ 74ch=746px, h2 cùng 74ch nhưng font 19px nên
  thành 959px, `.ds-prose` 1040px, pager 1080px). Nay đúng HAI: `--ds-measure` 720px cho
  chữ chảy, hết cột 900px cho bảng/code/card/pager. Cột `#main` hẹp lại còn 940px để hai
  mép chỉ cách 180px. **Đừng nới `--ds-measure`** — đo thật thì 720px đã ≈105 ký tự/dòng.
- Sidebar 300 → 330px; lá TOC thụt 26px (mép tên bài lệch 20px so với tên chặng).
- Bấm hàng CHẶNG giờ mở/thu gọn thay vì nhảy vào bài đầu chặng; nhãn chặng thành
  `<button>`, `aria-expanded` khớp trên cả chevron lẫn nhãn.
- **Dải mục tiêu đầu bài** (`.ds-obj`) đọc từ `PAYOFF[id][0]` — đầu bài giờ trả lời đủ
  bốn câu: nói về gì · kết quả · ưu tiên · độ cần thiết. Không viết tay lần hai.
- Sửa tràn ngang trên điện thoại (lỗi có sẵn): một `.wb-btn` nhãn dài 60 ký tự với
  `white-space:nowrap` rộng 467px đẩy cả trang cuộn ngang → `.ds-btn--wrap`.
- Hình 14 ngày: nhãn `ngày`/`giờ` chuyển ra đầu hàng ở lề trái (trước đây "ngày · số giờ"
  nằm dưới hai hàng số và thẳng cột ngày 1, đọc như nhãn của riêng cột đầu); hàng nút
  1–14 được tách 14px khỏi đáy SVG (trước dính sát, trông như hàng số thứ ba).
- Lịch 14 ngày: `.ds-day` phẳng → **`wb-steps`** (đường nối dọc = chuỗi phụ thuộc).
  `.ds-day*` CSS vẫn phải giữ — `th-defense` dùng cho lịch T−3/T−2/T−1.
- Mô tả hình 14 ngày: bỏ liệt kê cả 14 giá trị, nói hình dạng + hai đầu mút + kết luận;
  số liệu thô chuyển vào `<desc>` của SVG. Thêm cổng `G-DUMP` và rubric C8 để chặn lặp lại.

---

## CHƯA XONG — việc nội dung, cần phiên riêng

Hai đợt review đã chạy trong phiên này và **kết quả CHƯA được áp dụng**. Đây là phần
việc lớn còn lại, không phải phần đã làm.

### 1. Hai waiver = một lỗi giáo trình thật, chưa sửa

`ml-metrics` (bài thứ 43) dạy PR-AUC, nhưng:
- tiêu chí đạt của `ml-linear` (thứ 37) đã bắt người học "in PR-AUC validation";
- deliverable tuần 3 cũng đòi PR-AUC, mà `ml-metrics` ở tuần 4;
- 12 bài nhắc PR-AUC trước khi nó được dạy, sớm nhất là `s-pipeline` (thứ 3).

`auditPlan()` không bắt được vì `ml-metrics` không nằm trong `WEEKS[3].needs`.

**Cách sửa:** dời `ml-metrics` lên ngay sau `ml-linear` (cả `TREE` lẫn thứ tự
`<template>`), thêm vào tuần 3 (`ids` + `needs`), rút hai bước đầu của `ml-imb` thành một
câu trỏ về. Xong thì xoá 2 dòng trong `waivers.json` và rút gọn `allowEarly` của PR-AUC.

### 2. Review mục lục — findings chưa áp dụng

- **`pr-data` sai chỗ (chặng 8 / tuần 7)** nhưng nó là bài định nghĩa dataset + `datacard`
  + schema, mà tuần 2–4 đã làm việc trên dữ liệu đó. `d-eda` acceptance tham chiếu
  `datacard`; `PORTFOLIO` đã xếp `pr-data` trước `d-eda`; `DAYS` xếp ngày 6, `WEEKS`
  không. → tách nửa "chọn bộ nào / tải / datacard / schema" lên đầu chặng 3.
  (Đang được tha tạm trong `concepts.json` → `datacard.allowEarly`.)
- **Thiếu baseline theo luật.** `th-defense` đưa mẫu trả lời "luật hiện tại bắt 31%, mô
  hình bắt 64%" nhưng cả trang không có chỗ nào tạo ra con số đó. → thêm mục + acceptance
  vào `pr-eval` (3–5 luật, chấm trên cùng test set, cùng `paired_ci`).
- **Thiếu artifact công bằng nhóm.** `th-defense` và `th-write` đều giả định đã đo FPR
  theo nhóm; không bài nào tạo ra nó. → một mục + một acceptance trong `pr-eval`.
- **Chặng 7 (975 phút, lớn nhất trang, 0 bài trong fast track)** nằm giữa chặng ML/DL và
  hai chặng mà trang tồn tại vì chúng. → cân nhắc dời chặng 7 xuống sau chặng 8.
- **`m-infer` (100′) và `th-stats` (85′) dạy trùng**, `pr-eval` viết code lần thứ ba.
  → `m-infer` chỉ khái niệm; `th-stats` chỉ protocol nhiều seed + cách báo cáo.
- **`m-bayes` nên là `core`** (nó chứng minh vì sao accuracy vô dụng ở prevalence thấp —
  tiền đề của `ml-imb` và một acceptance của `ml-metrics`). **`pr-cost` nên là `core`**
  (trang tự gọi nó là bài có tỉ lệ giá trị/công sức cao nhất).
- Nhỏ hơn: `t-stack` giống sổ tra cứu hơn bài học → chặng 10; `f-store` (skim) gần như
  chỉ nói "chưa cần" → cắt, giữ đoạn point-in-time; `q-analytics` off-goal.

*Đã kiểm và KHÔNG phải lỗi:* thứ tự `<template>` khớp `TREE` 100%; calibration được xử lý
đủ (`m-prob`, `ml-imb`, `pr-eval`); không có nhánh phụ mồ côi; không có `<details>` nào.

### 3. Review phân tầng mạch chính — findings chưa áp dụng

25 chỗ nhánh phụ còn nằm trên mạch chính. Nặng nhất:
- `pr-eval` ~7099–7389: **4 file test đầy đủ inline (~290 dòng = 35% bài)**. Giữ 2 test
  được gọi tên + output `pytest -q`; ~22 test body còn lại vào popup.
- `pr-data`: bảng so 4 bộ dữ liệu + lý do loại ULB → popup; đoạn PaySim (bài tự nói "đáng
  trả lời riêng") → popup.
- `pr-serve`: app Streamlit (~28 dòng, một UI thứ hai) → popup / gộp `cmp-serve`;
  "ba cách lấy lịch sử" → đây là ca drawer thật sự hợp.
- `t-colab`: catalogue 10 khả năng trong khi bài tự nói chỉ 3 cái quan trọng → popup;
  bảng quyết định Colab/Codespaces/local trùng hẳn drawer `cmp-run` đã link 18 dòng sau.
- `ml-trees` "XGBoost hay LightGBM?" trùng drawer `cmp-gbdt`; `m-infer` mục "Thứ bạn có
  thể bỏ qua"; `f-store` mục "Vì sao bạn chưa cần"; `f-cyclic` Cách 4 + caveat trùng popup
  `sincos`; `ml-loss` zoo optimizer; `dl-train` bảng gỡ lỗi; `th-defense` 24 câu hỏi
  (~57 dòng — drawer hợp ở đây).

`node tools/gate.mjs --advice` đang chỉ đúng 8 trong số này (các tiêu đề mục tự tố giác +
4 bài dài nhất). Phần còn lại phải đọc bằng mắt.

### 4. `s-plan14` trình bày còn khó hiểu

Chủ trang nói cả trang này khó hiểu, không chỉ hai chỗ đã sửa. Chưa rà lại toàn bài bằng
`docs/content-gates.md`.

### 5. Còn nợ từ các phiên trước

- Rà thời lượng từng bài (`auditPlan` chỉ kiểm *nhất quán*, không kiểm *hợp lý*) — đặc
  biệt `pr-code`, `pr-eval`, `pr-serve`, các bài DL dài, `s-intro`.
- `r-roadmapsh`: chắc lại là **bản dịch thứ tự bài học** của roadmap.sh, không phải bài so
  sánh hơn thua.
- Nhãn Foundation/Applied/Advanced: cân nhắc có thật cần không trước khi làm.
- `th-defense` cũng là timeline (T−3/T−2/T−1) — cân nhắc chuyển sang `wb-steps` cho nhất
  quán với lịch 14 ngày.

---

## Chạy preview (sandbox chặn đọc thẳng file repo — phải mirror)

Mirror repo → scratchpad rồi serve. Cấu trúc mirror phải giữ `web-builder/web-builder.css`
để `../../web-builder/…` resolve được. Mỗi lần sửa: copy lại rồi reload.

Trang rất dài: screenshot khi cuộn sâu hay ra khung đen (giới hạn compositor của pane) —
verify bằng DOM/JS, đừng tin mỗi ảnh đen là lỗi thật.

**Nhiều phiên có thể sửa file này cùng lúc.** Trước khi Edit: `git log --oneline -3` và
`git status`; file đổi so với lúc bạn đọc thì đọc lại vùng sắp sửa.
