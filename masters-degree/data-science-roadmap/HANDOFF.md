# Handoff — data-science-roadmap.html

File là single-page app (~12k dòng, tự chứa) dựng trên web-builder CSS. Nội dung bài nằm
trong các `<template data-node="…">`, router hash dựng ra. `auditPlan()` (cuối `<script>`)
kiểm nhất quán TREE/WEEKS/DAYS/PAYOFF/competency/tổng giờ — phải trả `[]` (đã verify: OK,
84 bài · 14 ngày · 8 tuần · 106 giờ · fast 75).

## Phiên 2026-08-03 (b) — xử lý báo cáo review hợp nhất

Đã kiểm từng góp ý; chỉ sửa những chỗ phản ánh đúng. Tóm tắt theo mục review:

**§2 — Thêm lớp nhập môn DS 101.** Thêm 1 bài mới `s-intro` "★ Data Science là gì? — và
bộ từ vựng tối thiểu" (chèn giữa `s-how` và `s-pipeline`; r30/x10/d0, core). Bao: định nghĩa
DS bằng lời thường + gỡ hiểu nhầm "DS = train model"; bốn loại câu hỏi (mô tả/dự đoán/nhân
quả/quyết định); bảng phân biệt DS/Analytics/Thống kê/ML/AI/Data Eng/MLOps; bộ từ vựng lõi
(dataset, row, feature, target, model, algorithm, training, inference, parameter,
hyperparameter, loss, metric, threshold, baseline, train/val/test…) neo vào **một bảng đồ
chơi 6 giao dịch**; từ vựng cấu trúc (grain, schema, label delay, sample vs population,
bias); một vòng tư duy hoàn chỉnh trên bảng đồ chơi (FP/FN, score≠quyết định, ngưỡng đổi
hai lỗi ngược chiều); tự kiểm 4 câu. Đã wire: TREE, WEEKS tuần 1, PAYOFF (+ sửa "bài sau"
của `s-how`), PHASE_OUTCOME p0. Competency map theo phase nên tự khớp.

**§1 — zero/master.** Sửa card prerequisite trên home: "từ số 0 = zero Data Science, KHÔNG
phải zero lập trình"; điều kiện thật là **đọc được Python cơ bản**; bỏ lời hứa "người mới
lập trình chỉ cần nhân 1,3–1,5 lần". "Master" đã được nói trung thực trong s-intro + home.

**§6.1 — mâu thuẫn EDA/split.** Tách EDA thành **hai thì**: Thì 1 kiểm cấu trúc (trên toàn
bộ dữ liệu, trước khi chia); Thì 2 khám phá theo mô hình (chỉ trên train, sau khi chia).
Sửa `d-eda` (chia checklist + charts dùng `df_train`), `s-pipeline` bước 3, và thêm cầu nối
ở `d-split`.

**§9 — nút Chép.** `addCopyButtons()` gọi trong `enhance()` (phủ bài + home + popup toán +
ngăn phụ). Bọc mỗi `.ds-code` trong `.ds-codewrap`, chèn nút `.ds-copy` đặt tuyệt đối
(không đội layout, không cuộn ngang theo code). Lấy `textContent` TRƯỚC khi chèn nút → copy
sạch, giữ thụt lề, không dính chữ nút. Có trạng thái "Đã chép", dự phòng `execCommand`, hỗ
trợ bàn phím/`aria-label`. CSS dùng token thật (`--wb-surface`, `--wb-font`…). Giữ lời
khuyên "gõ lại" nhưng hoà với nút Chép (home card 4 + s-how).

**§14 — lỗi chuyên môn / câu tuyệt đối đã sửa:**
- 14.1 (`m-bayes`): bỏ "precision bị chặn trên bởi tỉ lệ dương"; nói đúng lý do chọn PR-AUC.
- 14.2 (`m-prob`): calibration_curve dùng `y_valid` (không phải test); nói rõ
  CalibratedClassifierCV fit trên validation, test chỉ báo cáo 1 lần cuối.
- 14.3 (`dl-llm`): fine-tune "có thể" thêm kiến thức nhưng không đáng tin — thay vì "không".
- 14.4 (`dl-cnn-rnn`): thêm phân biệt equivariance (convolution) vs invariance (pooling…).
- 14.5 (`dl-attn`): transformer song song ở **huấn luyện**; sinh văn bản vẫn tuần tự.
- 14.6 (mathdef `dot`): bỏ "toàn bộ ML là hình học" / "đều chỉ là tích vô hướng"; nêu
  activation/normalization/convolution/gating + cây không dùng tích vô hướng.
- 14.7 (mathdef `normal`): CLT bỏ "luôn", thêm điều kiện + "kết quả tiệm cận".
- 14.9 (`ml-map`): RF "ít overfit hơn cây đơn" (không phải "khó overfit" tuyệt đối).
- 14.10 (`ml-linear`): scale "gần như luôn cần khi có regularization" thay vì "BẮT BUỘC".
- 14.11 (`t-sklearn`, `f-pipeline`, `r-mistakes`): bỏ "không thể rò rỉ" / "mọi fit phải
  trong Pipeline"; nói Pipeline **chặn phần lớn** rò rỉ tiền xử lý, vẫn rò được.
- 14.12 (`m-bayes`): Naive Bayes = độc lập **có điều kiện khi biết lớp** (không phải độc lập
  hoàn toàn).
- 14.13 (`cmp-query` aside, `t-sql`): DuckDB "ngốn ít RAM hơn" (không phải "không dùng RAM");
  ngưỡng "~2 triệu dòng" nói rõ là kinh nghiệm tương đối, tuỳ cột/dtype/RAM.
- 14.15 (`s-families`): khung 10 bước chuyển giao, nhưng nội dung bước 1/3–5 đổi mạnh giữa
  bảng/chuỗi thời gian/NLP/ảnh.
- 14.16 (`r-mistakes`, glossary): accuracy "gây hiểu nhầm khi lệch"; ROC-AUC "che khuất lớp
  hiếm" thay vì "lạc quan quá mức".
- 14.17 (`th-stats`): giữ power analysis là **bắt buộc cho A/B test** (cross-ref q-causal).
- 14.19 (`ml-imb`, `r-mistakes`): resampling "5–10% thường là điểm khởi đầu, tuỳ dữ liệu" +
  nhắc calibration đổi.
- 14.20 (`pr-code`, `r-mistakes`): con số +0,10/+0,01 ghi rõ là ví dụ minh hoạ.

**§17 — glossary.** Thêm nhóm "Nền tảng" (Data Science, dataset, observation, grain, schema,
model, algorithm, training, parameter, baseline, metric, threshold, supervised/unsupervised,
population vs sample, correlation vs causation, structured/unstructured).

*Không phải lỗi thật, KHÔNG sửa:* 14.8 (tree "không giả định **phân phối**" — đã đúng phạm
vi), 14.14 (class→regress `q-regress` đã liệt kê rõ chỗ đổi), 14.18 (không có block/moving-
block bootstrap trong trang).

## Còn lại (chưa làm — nên tách phiên riêng)

1. **Rà soát trình bày từng bài bằng /explain-clearly + đẩy nhánh phụ vào popup** (việc lớn,
   ~84 `<template data-node>`): tìm đoạn lan man / so sánh công cụ / đào sâu đang nằm trên
   mạch chính → cân nhắc chuyển vào `data-aside`/`data-math`. Phiên này chỉ sửa điểm, chưa
   rà toàn bộ.
2. **§10 — rà thời lượng từng bài** (đọc/hiểu/thử code/deliverable/self-check). auditPlan chỉ
   kiểm *nhất quán* các con số, không kiểm chúng có *hợp lý* không. Đặc biệt: pr-code, pr-eval,
   pr-serve, các bài Deep Learning dài, s-intro mới.
3. **Bài `r-roadmapsh`**: đọc lại để chắc là **bản dịch thứ tự bài học** của roadmap.sh, không
   phải bài "so sánh hơn thua" (chủ đã nói: tham khảo để có thứ tự đủ bài, không phải so sánh).
4. **§5 — nhãn Foundation/Applied/Advanced**: hiện các chặng đã ngầm thể hiện 3 tầng; chưa
   thêm badge tường minh (cân nhắc có thật sự cần không trước khi làm).
5. **§9 nâng cao (optional)**: nút "Open in Colab" / notebook mẫu — chưa làm, không bắt buộc.

## Chạy preview (sandbox chặn preview_start đọc thẳng file repo — phải mirror)

- Mirror repo → scratchpad rồi serve: config `ds-preview` trong `.claude/launch.json` trỏ tới
  `…/80eba496…/scratchpad/serve-preview.py` (serve `…/scratchpad/preview`, cổng **8799**).
  Cấu trúc mirror phải giữ `web-builder/web-builder.css` để đường dẫn `../../web-builder/…`
  trong HTML resolve được. Mỗi lần sửa: `cp` file repo + css sang mirror rồi reload.
- Trang rất dài: screenshot khi cuộn sâu hay ra khung đen (giới hạn compositor của pane) —
  verify bằng DOM/JS, đừng tin mỗi ảnh đen là lỗi thật.
