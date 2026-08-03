# Handoff — data-science-roadmap.html

File là single-page app (~12,6k dòng, tự chứa) dựng trên web-builder CSS. Nội dung bài nằm
trong các `<template data-node="…">`, router hash dựng ra.

**Đọc [CLAUDE.md](CLAUDE.md) trước.** Đừng mở cả file HTML để tìm hiểu — dùng `TOC.md`
và `node tools/gate.mjs --show <id>`.

Hai lớp kiểm tự động:
- `node tools/gate.mjs` — cổng cấu trúc, chạy tự động sau mỗi Edit (Claude Code hook) và
  ở `pre-commit`.
- `auditPlan()` trong Console — cổng cần DOM thật. Phải trả `[]`.

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

## CHƯA LÀM — và vì sao

### Quyết định giáo trình, không phải lỗi: cần chủ trang chọn

Bốn việc dưới đây phiên (a) ghi là "cân nhắc". Chúng **đổi hình dạng giáo trình**, nên theo
đúng tinh thần CLAUDE.md §6 (thêm/xoá bài phải soi lại triết lý) chúng là quyết định của
chủ trang, không phải của agent. Khuyến nghị kèm theo:

| việc | khuyến nghị | lý do |
|---|---|---|
| Dời chặng 7 xuống sau chặng 8 | **nên làm** | 975 phút, lớn nhất trang, 0 bài trong fast track, mà nó nằm chắn giữa DL và hai chặng mà trang tồn tại vì chúng |
| `t-stack` → chặng 10 (tra cứu) | **nên làm** | nó là sổ tra (r60/x0/d0), không phải bài học; đặt ở chặng 1 làm tuần 1 dài ra vô ích |
| Cắt `f-store` | **không nên** | sau khi sửa tiêu đề thì nội dung thật của nó là *một câu trả lời cho hội đồng* + point-in-time correctness. Giữ, nó đang là `skim` 30′ |
| `q-analytics` off-goal | **giữ** | nó là bài duy nhất vạch ranh giới analytics / predictive / causal, và đó là câu hội đồng hay hỏi |

### Còn nợ thật

- **Hai hệ số liệu song song.** `ml-metrics`/`th-defense` dùng bộ số minh hoạ (PR-AUC
  0,281 → 0,412, recall 31% → 64%, 1.240 → 598 triệu). `pr-eval` dùng số **chạy thật trên
  bộ mô phỏng** (PR-AUC 0,0485, recall hiệu dụng 21,8%, 411 → 350 triệu). Cả hai đều đúng
  trong ngữ cảnh của nó, nhưng người đọc đi từ bài này sang bài kia sẽ tưởng mình sai ở
  đâu. Đã thêm một câu ở `th-defense` nói rõ bảng đó là minh hoạ — **chưa** rà toàn trang.
  Đây là việc đáng làm nhất còn lại.
- **Ngày 9 của fast track đúng 3,5 giờ**, tức đúng ngưỡng dưới của `auditPlan()`. Cắt bất
  kỳ thời lượng nào trong ba bài của ngày đó sẽ làm `auditPlan()` trượt. Đó là cổng làm
  đúng việc, nhưng biết trước thì đỡ mất thời gian.
- **6 khuyến nghị `G-FWD` còn lại là trạng thái ổn định đã soát**, không phải việc chưa
  làm. Chúng là các bài bản đồ/tra cứu (`s-*`, `t-stack`, `t-ai`) và vài bài FE nêu tên
  khái niệm để định vị. Đưa hết vào `allowEarly` sẽ biến `concepts.json` thành con dấu
  cao su; để nguyên thì cổng còn là bảng theo dõi đọc được. **Đừng "sửa" bằng cách nhồi
  allowEarly.**
- Rà thời lượng từng bài (`auditPlan` chỉ kiểm *nhất quán*, không kiểm *hợp lý*) — đặc
  biệt `pr-code`, các bài DL dài, `s-intro`.
- `r-roadmapsh`: chắc lại là **bản dịch thứ tự bài học** của roadmap.sh, không phải bài so
  sánh hơn thua.
- Nhãn Foundation/Applied/Advanced: cân nhắc có thật cần không trước khi làm.
- `th-defense` cũng là timeline (T−3/T−2/T−1) — cân nhắc chuyển sang `wb-steps` cho nhất
  quán với lịch 14 ngày.
- `f-cyclic` "Cách 4 · SplineTransformer", `ml-loss` zoo optimizer, `dl-train` bảng gỡ lỗi:
  vẫn trên mạch chính. Mỗi cái 6–15 dòng, `G-LAYER` không bắt (tiêu đề không tự tố giác).
  Ưu tiên thấp — nhưng `f-cyclic` Cách 4 đáng dời nhất vì bài đã nói dùng Cách 2/3.

---

## Chạy preview (sandbox chặn đọc thẳng file repo — phải mirror)

Server `ds-review` (port 8805) serve từ `scratchpad/preview/`, **không** từ repo. Mỗi lần
sửa: `cp data-science-roadmap.html <scratchpad>/preview/masters-degree/data-science-roadmap/`
rồi reload kèm `?v=n` (không đổi query thì trình duyệt trả bản cache và bạn sẽ đo bản cũ —
đã mất thời gian vì đúng chuyện này).

Chạy `auditPlan()` ở Console. Khi lặp qua nhiều bài bằng `location.hash`, **nhớ bỏ qua
`await` nếu hash không đổi** — set lại đúng hash hiện tại thì `hashchange` không bắn và
script treo.

Trang rất dài: screenshot khi cuộn sâu hay ra khung đen (giới hạn compositor của pane) —
verify bằng DOM/JS, đừng tin mỗi ảnh đen là lỗi thật.

**Nhiều phiên có thể sửa file này cùng lúc.** Trước khi Edit: `git log --oneline -3` và
`git status`; file đổi so với lúc bạn đọc thì đọc lại vùng sắp sửa.
