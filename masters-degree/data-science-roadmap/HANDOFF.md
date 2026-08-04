# Handoff — data-science-roadmap.html

File là single-page app (~13,9k dòng, tự chứa) dựng trên web-builder CSS. Nội dung bài nằm
trong các `<template data-node="…">`, router hash dựng ra.

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

### Quyết định giáo trình — đã xử

Hai việc "nên làm" **đã làm ở Phiên (m2)** (dời chặng 7 xuống sau chặng 8; `t-stack`→`r-stack`
sang chặng 10). Hai việc còn lại là quyết định **giữ nguyên** — đừng revisit:

| việc | quyết định | vì sao |
|---|---|---|
| Cắt `f-store` | **giữ, không cắt** | nội dung thật của nó là *một câu trả lời cho hội đồng* + point-in-time correctness; đang `skim` 30′ |
| `q-analytics` off-goal | **giữ** | bài duy nhất vạch ranh giới analytics / predictive / causal — câu hội đồng hay hỏi |

### Còn nợ thật

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
- Nhãn Foundation/Applied/Advanced: cân nhắc có thật cần không trước khi làm.
- `th-defense` cũng là timeline (T−3/T−2/T−1) — cân nhắc chuyển sang `wb-steps` cho nhất
  quán với lịch 14 ngày. **Hoãn ở phiên (m)**: cần xem căn chỉnh bằng mắt, mà preview đang
  serve bản cũ (xem memory `preview-sandbox-mirror`).
- `ml-loss` zoo optimizer, `dl-train` bảng gỡ lỗi: vẫn trên mạch chính. Mỗi cái 6–15 dòng,
  `G-LAYER` không bắt (tiêu đề không tự tố giác). Ưu tiên thấp. (`f-cyclic` "Cách 4 ·
  SplineTransformer" đã dời vào popup `cyclicspline` ở phiên (m).)

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
