# Đối chiếu: 39 đề tài lớp đã đăng ký vs 193 đề tài trong page

`as_of: 2026-08-09` · đầu vào: danh sách tên đề tài chính thức do học viên cùng lớp đăng ký (39 mục) · đối chiếu với `thesis-topic-selector.html` bản 11 (193 đề tài, 27 lĩnh vực) theo [`thesis-topic-rubric.md`](thesis-topic-rubric.md)

Tài liệu này **không** chấm để loại đề tài của ai. Nó dùng danh sách đã-được-duyệt làm **mốc hiệu chuẩn**: trả lời câu "thế nào là đủ, là phù hợp" bằng bằng chứng thay vì bằng cảm giác.

---

## 1. Ràng buộc đọc — chấm được gì từ một cái tên

Rubric chấm 20 trường (`q`, `data`, `contrib`, `d.method`, `d.risk`, `d.learn`, `d.spike`, `src`, `impact.*`…). Danh sách lớp chỉ có **một trường: `t`**.

Áp đúng chữ của mục 1a thì **cả 39 đề tài ra `THIEU_THONG_TIN`** — thiếu `q`, thiếu `data`, thiếu `d.spike`. Verdict đó đúng luật nhưng vô dụng, vì nó không phải lỗi của người đăng ký: **tên đề tài chính thức là một hiện vật hành chính, không phải hồ sơ nghiên cứu.** Câu hỏi sắc nằm trong chương 1, không nằm trên bìa.

Nên lượt này chỉ chấm **bốn thứ mà một cái tên thật sự tiết lộ**, và ghi rõ phần còn lại là không chấm được:

| Chấm được | Không chấm được |
|---|---|
| **Dạng đề** (`B3`): tên là câu hỏi, một bài toán có baseline, một chủ đề, hay một sản phẩm | `R5` — thiết kế đo lường. Không có `d.method` |
| **Đường dữ liệu** (`R1`): mở · mô phỏng · nội bộ · phải tự gán nhãn | `R6` — nhánh kết quả âm. Không có `d.spike` |
| **Nền phải học** (`R2`) và **compute** (`R3`) suy từ lĩnh vực + phương pháp nêu tên | `V2` — đóng góp. Cần `B8`, mà `B8` cần biết câu hỏi |
| **Tầm cỡ** (5d): quá nhỏ · vừa · quá to | `V1` — tác động. Không có `impact.*` |

**Nhãn bằng chứng.** Cột "đường dữ liệu" bên dưới là **`CHƯA KIỂM` toàn bộ** — nó là giả thuyết về nguồn dữ liệu khả dĩ, suy từ lĩnh vực, không phải kết quả tra cứu. Không tên bộ dữ liệu nào trong tài liệu này được tra trong lượt này. Đừng trích chúng như dữ kiện.

---

## 2. Bảng chấm 39 đề tài

Dạng đề: `BÀI TOÁN` = có đối tượng đo và baseline suy ra được · `CHỦ ĐỀ` = `F1` · `SẢN PHẨM` = `F3` · `GỘP` = `F2` (≥3 bài toán nối bằng "và")

| # | Đề tài (rút gọn) | Dạng | Đường dữ liệu | Nền | Compute | Tầm | Sinh đôi trong page |
|---|---|---|---|---|---|---|---|
| 1 | Phân tầng nguy cơ đa gen (PRS) | BÀI TOÁN | phải xin (biobank) | cao | tb | vừa | **#105** |
| 2 | So sánh ARIMA · Prophet · LSTM bán lẻ | BÀI TOÁN · `F21` | mở | thấp | thấp | **nhỏ** | #1 #2 #3 |
| 3 | Trực quan hoá dữ liệu dân cư | **SẢN PHẨM** | **nội bộ** | thấp | thấp | **nhỏ** | #195 (xa) |
| 4 | Phân tích tập trung lớp học · edge · lightweight DL | **SẢN PHẨM + GỘP** | tự gán + dữ liệu người | tb | tb | to | #33 #35 |
| 5 | Robot kho: A*/RRT + ML tránh tắc nghẽn | BÀI TOÁN | **mô phỏng** | tb | tb | vừa | #192 #197 |
| 6 | Phân cụm công bằng · xếp hạng tín dụng | BÀI TOÁN | mở | tb | thấp | vừa | #24 #41 |
| 7 | Label smoothing cho phân loại ảnh | BÀI TOÁN | mở | thấp | tb | **nhỏ** | — |
| 8 | DRL + ALNS · phân hoạch vùng hoạt động | BÀI TOÁN | **mô phỏng** | cao | tb–cao | to | #192 |
| 9 | Khai thác CSDL tri thức y sinh → phân loại | **CHỦ ĐỀ** | mở (chưa nêu) | cao | tb | ? | #52 #113 |
| 10 | Diễn giải mạng thần kinh đồ thị | BÀI TOÁN | mở | tb | thấp–tb | vừa | #196 (khuôn) |
| 11 | RL điều khiển tín hiệu giao thông | BÀI TOÁN | **mô phỏng** | tb | **cao** | vừa–to | **#74 — đã bị loại khỏi page** |
| 12 | Công cụ truy vết đối tượng (di biến động + căn cước) | **SẢN PHẨM** | **nội bộ** | thấp | thấp | vừa | — |
| 13 | Học sâu dự đoán tác dụng phụ thuốc | BÀI TOÁN | mở | tb–cao | tb | vừa | **#55** |
| 14 | EA + DL sinh heuristic · phân bổ tài nguyên SDN | BÀI TOÁN | **mô phỏng** | cao | tb | to | #118 #204 |
| 15 | Test-Time Adaptation | BÀI TOÁN (tên hơi rộng) | mở | tb | tb | vừa | #126 |
| 16 | Đa omics · phân loại phân nhóm ung thư | BÀI TOÁN | mở (TCGA) | cao | tb | vừa | **#7 — gần trùng** |
| 17 | Phát hiện ví crypto đồng sở hữu | BÀI TOÁN | mở (on-chain) | tb | tb–cao | vừa | — |
| 18 | Đa mô hình: ảnh + mô bệnh học + gen → đáp ứng thuốc | BÀI TOÁN · GỘP | phải xin (ghép cặp) | **cao ×3** | cao | **quá to** | #114 #116 |
| 19 | Pipeline AutoML mở rộng + tái hiện · big data | **SẢN PHẨM** | bất kỳ | thấp–tb | tb | vừa | — |
| 20 | Hệ thống ngăn ngừa mất ANTT (căn cước + di biến động) | **SẢN PHẨM** | **nội bộ** | thấp | tb | to | — |
| 21 | RL + few-shot + meta-learning · bệnh hiếm | **GỘP `F2`** | phải xin, hiếm | cao | tb–cao | **quá to** | — |
| 22 | Học sâu dự đoán tính chất phân tử | BÀI TOÁN | mở | tb–cao | tb | vừa | **#49 — gần trùng**, #189 |
| 23 | EA + transfer · tấn công đối kháng autoencoder E2E | BÀI TOÁN | **mô phỏng** | cao | tb | vừa | — |
| 24 | Học liên tục · phát hiện vật thể nhỏ và tương đồng | BÀI TOÁN | mở | tb | **cao** | vừa–to | #124 |
| 25 | Phân tích chu trình giao dịch · gian lận ngân hàng | BÀI TOÁN | **nội bộ** hoặc mở | tb | tb | vừa | #25 #42 |
| 26 | Dữ liệu dân cư → nguy cơ tội phạm trẻ vị thành niên | BÀI TOÁN | **nội bộ** | tb | thấp | vừa | — |
| 27 | Tăng cường LLM bằng prompt sinh từ đồ thị tri thức | BÀI TOÁN | mở | tb | tb | vừa | #177 |
| 28 | RAG trên miền dữ liệu tiếng Việt | **CHỦ ĐỀ** | mở + tự dựng | thấp | tb | vừa | **#32 #43 #91** |
| 29 | Hỏi đáp văn bản hành chính dựa trên KG | **SẢN PHẨM** | mở + tự dựng KG (đắt) | thấp | tb | to | #32 #43 |
| 30 | RL-based GA · offloading trong UAV-MEC | BÀI TOÁN | **mô phỏng** | cao | tb | vừa | — |
| 31 | Thu nhận + đánh giá chất lượng ảnh mống mắt | BÀI TOÁN | nội bộ + mở | tb | thấp | vừa | — |
| 32 | EA · phân bổ tài nguyên massive MIMO | BÀI TOÁN | **mô phỏng** | cao | tb | vừa | — |
| 33 | Phân tích dữ liệu · ngành dầu khí | **CHỦ ĐỀ** (mơ hồ nhất) | **nội bộ** | tb | tb | ? | — |
| 34 | Cải thiện speech tokenizer cho ASR | BÀI TOÁN | mở | tb–cao | **cao** | vừa–to | #85 #102 (khác góc) |
| 35 | Học sâu phân đoạn tín hiệu điện não | BÀI TOÁN | mở | tb | tb | vừa | #178 #181 |
| 36 | LLM sinh heuristic · giao nhận động | BÀI TOÁN | **mô phỏng** | tb–cao | tb | vừa | **#192 — gần trùng** |
| 37 | VLM đa phương thức · bệnh viện thông minh | **CHỦ ĐỀ** | lâm sàng, phải xin | cao | cao | **quá to** | — |
| 38 | Tối ưu lịch giảng dạy + phân công phòng học | BÀI TOÁN | nội bộ (trường mình) | tb | thấp | vừa | **#147** |
| 39 | Tối ưu hiệu quả suy luận trong LLM | BÀI TOÁN (hơi rộng) | mở | tb | tb–cao | vừa | #46 #91 #93 |

---

## 3. Hình dạng — đếm được gì

| Chiều | Lớp (39) | Page (193) |
|---|---|---|
| Tên đề tài **là câu hỏi** (có dấu `?`) | **0** — 0% | **157** — 81% |
| Dạng `SẢN PHẨM` (`F3`) | 6 — 15% | ~0 |
| Dạng `CHỦ ĐỀ` (`F1`) | 3–5 — 8–13% | 0 |
| Dữ liệu là **mô phỏng / tự sinh** | **8 — 21%** | ~7 — **3,6%** |
| Dữ liệu **nội bộ / phải là người trong cuộc** | 6–8 — 15–21% | 0 |
| Nền ngành nặng (`know: cao`) | ~11 — **28%** | 29 — **15%** |
| Compute cao | 5 — **13%** | 7 — **3,6%** |
| Cụm tối ưu tổ hợp · tiến hoá · metaheuristic | **8 — 21%** | 3 (`or`) — **1,6%** |
| Đề tài dạng "benchmark này có đang nói dối không" | **0** | phần lớn danh sách |

Chín dòng này là toàn bộ nội dung của tài liệu. Phần dưới chỉ giải thích chúng.

---

## 4. Bảy phát hiện, xếp theo mức đổi quyết định

### 4.1 Sàn thật của bộ môn thấp hơn hẳn sàn của rubric — có bằng chứng, không phải cảm giác

Hai đề tài đã được duyệt mà rubric này sẽ đánh trượt thẳng:

- **#2 (So sánh ARIMA · Prophet · LSTM)** là đúng nguyên văn `F21` — *"so sánh các thuật toán trên dataset mà không có góc nhìn nào ngoài bảng số"* → `V2 = YEU` → trần verdict `PHAI_SIET_LAI`, và mục 10.1 loại `PHAI_SIET_LAI` khỏi bảng chọn.
- **#7 (Label smoothing cho phân loại ảnh)** đạt ít nhất 2/4 dấu hiệu của phép thử sàn 5d: một trục thực nghiệm duy nhất, `contrib` là một quan sát chứ không phải hiện vật → `QUA_NHO`.

Cả hai vẫn nằm trong danh sách đăng ký chính thức. **Rubric này không sai — nó chấm theo chuẩn "đủ để đăng bài", còn bộ môn chấm theo chuẩn "đủ để bảo vệ".** Hai chuẩn đó cách nhau một bậc.

Hệ quả trực tiếp: 14 đề tài đã bị loại khỏi page và 35 ca `CHẶN` còn lại **không phải là "không làm được luận văn"**. Chúng có nghĩa là "không làm được đến mức publishable trong 6 tháng". Đọc lại chúng bằng đúng nghĩa đó.

### 4.2 Ca đối chứng sạch nhất: #74

Lượt chấm 28/07 loại **#74 — Đèn tín hiệu bằng RL** với lý do `diff: 5` + `compute: cao` + `risk: cao` + ràng buộc ≥5 seed mỗi cấu hình, kèm câu trong hồ sơ *"nếu không có ngân sách đó thì đừng nhận"*.

Một bạn trong lớp vừa đăng ký **đúng đề tài đó** (#11 trong bảng trên).

Hai cách đọc, cả hai đều dùng được:
1. Ràng buộc ≥5 seed là ràng buộc **của một bài báo**, không phải của một luận văn. Bỏ nó thì đề tài về mức `CĂNG`.
2. Hoặc bạn đó sẽ có 6 tháng vất vả và hội đồng vẫn cho qua.

Dù là cách nào: **`CHẶN` trong rubric này nên đọc là "chỗ đắt", không phải "cửa đóng".**

### 4.3 21% của lớp đã xoá trục dữ liệu ra khỏi cuộc chơi — page gần như không có nước đi đó

Tám đề tài (#5 #8 #11 #14 #23 #30 #32 #36) chạy trên **dữ liệu tự sinh**: SUMO/CityFlow, bộ instance chuẩn của bài toán tổ hợp, mô phỏng kênh truyền, mô phỏng kho hàng. Với chúng, `R1` = `ĐI ĐƯỢC` **theo cấu tạo** — không license, không xin phép, không chờ duyệt, không hỏng vì một API đổi điều khoản.

Page có ~7/193 đề tài dạng đó (#27, #29, #82, #92, #162, #193 và vài cái nữa) = 3,6%.

`R1` là trục mà rubric tự gọi là nghiêm nhất (mục 9 quy tắc 11), và toàn bộ tầng blocker `B1`/`B2` được dựng quanh nó. Tám người trong lớp đơn giản là **không chơi trục đó**. Đây là một chiến lược hợp lệ mà page bỏ sót gần hoàn toàn.

### 4.4 Điểm mù mà chính rubric đã dự báo, giờ đo được

Mục 10.8 cảnh báo: *"nếu 4/5 đề tài shortlist cùng một `src: ai:<model>`, bạn đang chọn trong không gian ý tưởng của một model, và điểm mù của model đó là điểm mù của bạn."* Page có 103/193 đề tài `src: ai:claude-opus-5`.

Danh sách lớp — do ~39 người thật viết ra, phần lớn có thầy hướng dẫn đứng sau — đo được đúng điểm mù đó:

- **Lớp: 21% là tối ưu tổ hợp / thuật toán tiến hoá / metaheuristic.** Page: **1,6%** (`or` có đúng 3 đề tài).
- **Lớp: 0% là đề tài dạng "benchmark này có đang nói dối không".** Page: đó là khuôn chủ đạo.

Hai danh sách mù ngược nhau. Page mạnh ở phê phán đo lường và yếu ở thiết kế thuật toán; lớp thì ngược lại.

Chiều ngược lại của phát hiện này quan trọng ngang: **cụm 8 đề tài metaheuristic/EA/RL-cho-tối-ưu là dấu vết của một cụm giảng viên.** Tám người không tự nhiên cùng chọn một họ phương pháp. `R4` — trục mà page tự gọi là quyết định nhất và là trục duy nhất page không tự trả lời được — vừa được trả lời một phần, miễn phí: **bộ môn có người đỡ mảng tối ưu/tiến hoá, và page gần như không có gì để chọn ở đó.**

### 4.5 Đường dữ liệu độc quyền là tài sản, và 6–8 người trong lớp đang tiêu nó

Năm đề tài (#3 #12 #20 #26 #31) chạy trên **CSDL quốc gia về dân cư / căn cước / di biến động cư trú**. Thêm #25 (dữ liệu giao dịch ngân hàng) và #33 (dầu khí). Không ai ngoài cuộc lấy được những dữ liệu này.

Đọc theo rubric: với người ngoài, `R1` = `CHẶN` và `B2` = `THAT_BAI` (không có đường hợp pháp). Với người trong cuộc, `R1` = `ĐI ĐƯỢC` và **`B8` được miễn gần như hoàn toàn** — không ai scoop được bạn trên dữ liệu không ai có. `B7` (vấn đề có thật) cũng gần như tự động vượt: cơ quan chính là người sẽ dùng kết quả.

Đây là lý do vì sao mấy đề tài đó **được duyệt dù dạng đề yếu** (4/5 là `SẢN PHẨM`, `F3`). Đường dữ liệu mua được rất nhiều thứ.

**Đối chiếu với bạn:** bạn đang làm ở một công ty POS bán lẻ. Đó là cùng một loại tài sản — dữ liệu giao dịch bán lẻ SME ở quy mô mà không nhóm nghiên cứu nào có. Page có sẵn một cụm đề tài cắm thẳng vào đó: **#39** (sổ sách tự động cho hộ kinh doanh), **#40** (giảm hàng huỷ hàng tươi), **#103** (trích xuất chứng từ tiếng Việt), **#191** (tồn kho khi lead time bất định), **#2** (xếp hạng mô hình bằng chi phí tồn kho), **#45** (định giá có khoảng tin cậy).

Cảnh báo đúng mức: đây là `B2` = `CHUA_THU`, **không phải** `VUOT`. Dữ liệu công ty cần một người trong công ty ký. Đó là một câu hỏi phải hỏi, không phải một giả định được dùng.

### 4.6 Tên đề tài đăng ký và câu hỏi nghiên cứu là hai hiện vật khác nhau

**0/39** tên đề tài của lớp là câu hỏi. **157/193** (81%) tên trong page là câu hỏi có dấu `?`.

Đây không phải chuyện ai viết hay hơn. Danh mục đăng ký chỉ nhận **cụm danh từ**: *"Nghiên cứu ứng dụng X vào bài toán Y"*, *"Một số phương pháp cho Z"*. Đó là dạng chuẩn của một dòng trên bìa luận văn và của một dòng trong danh mục phòng đào tạo.

Hệ quả thực hành, và nó rẻ: **khi đăng ký, hãy dẹt tên đề tài xuống cụm danh từ; giữ câu hỏi sắc làm lõi chương 1.** Hai ví dụ dịch xuôi:

| Trong page | Tên đăng ký tương ứng |
|---|---|
| #1 — *"Foundation model chuỗi thời gian trên bán lẻ — sau khi kiểm soát rò rỉ dữ liệu thì còn lại gì?"* | *"Đánh giá mô hình nền chuỗi thời gian cho dự báo nhu cầu bán lẻ dưới điều kiện kiểm soát nhiễm dữ liệu"* |
| #40 — *"Giảm hàng huỷ cho bán lẻ hàng tươi: đặt hàng theo hạn sử dụng, đo bằng kilogram bị đổ đi"* | *"Mô hình đặt hàng cho hàng tươi có hạn sử dụng dựa trên dự báo nhu cầu xác suất"* |

Đừng đăng ký một cái tên có dấu hỏi rồi ngạc nhiên vì nó lệch khỏi mọi dòng khác trong danh mục.

### 4.7 Cỡ chuẩn của một luận văn ở đây — đọc từ 39 mẫu

Ba khuôn chiếm gần hết danh sách lớp:

1. **Một họ phương pháp × một bài toán.** (#7 label smoothing × phân loại ảnh · #15 TTA · #10 diễn giải GNN · #24 học liên tục × vật thể nhỏ). Đây là khuôn phổ biến nhất và là khuôn **nhỏ nhất** được duyệt.
2. **Ghép hai phương pháp đã biết để giải một bài toán tối ưu.** (#5 A*/RRT + ML · #8 DRL + ALNS · #14 EA + DL · #30 RL + GA · #36 LLM + heuristic). Khuôn thứ hai, và là khuôn của cụm giảng viên tối ưu.
3. **Một hệ thống dựng trên dữ liệu chỉ mình có.** (#3 #12 #19 #20 #29).

Không khuôn nào trong ba cái có **ba trục thực nghiệm**. Page thì mặc định ba trục — đọc lại `d.method` của #1: *"Ba trục thực nghiệm: (1)… (2)… (3)…"*.

**Đề tài trong page nhìn chung to hơn cái đang được duyệt, không phải nhỏ hơn.** Nếu bạn lấy một đề tài trong page và cắt còn hai trục, nó vẫn lớn hơn trung vị của lớp.

---

## 5. Hệ quả cho việc chọn của bạn

**a. Ngừng dùng rubric để loại, bắt đầu dùng nó để siết.** Rubric làm tốt việc nó sinh ra để làm — chỉ ra chỗ đắt. Nhưng nhãn `CHẶN` của nó đang được đọc thành "cấm", trong khi bằng chứng từ lớp cho thấy nó nghĩa là "đắt hơn một luận văn cần". `#74` là ca kiểm chứng.

**b. Hai trục thật sự quyết định, theo bằng chứng của lớp, là `R1` và `R4` — không phải `V2`.** Không ai trong 39 người chọn đề tài vì đóng góp của nó sắc. Họ chọn theo: *dữ liệu nào tôi lấy được* (nội bộ hoặc mô phỏng) và *thầy nào đỡ được*. Cả hai đều là câu hỏi bạn chưa trả lời.

**c. Ba nước đi cụ thể, xếp theo giá trị trên mỗi giờ bỏ ra:**

| | Việc | Vì sao | Chi phí |
|---|---|---|---|
| 1 | **Hỏi bộ môn ai đỡ mảng tối ưu tổ hợp / tiến hoá.** 8/39 đăng ký ở đó — cụm đó có người | Mở trục `R4`, trục duy nhất page không tự trả lời được | 1 buổi |
| 2 | **Hỏi trong công ty: có đường hợp pháp dùng dữ liệu giao dịch cho luận văn không, ai ký, ẩn danh thế nào** | Nếu có → mở cả cụm #39 #40 #103 #191 #2 #45 và `B8` gần như tự vượt | 1 tuần chờ |
| 3 | **Đánh dấu 24 đề tài trong page đã có sinh đôi ở lớp** (cột cuối bảng mục 2) | Không phải để tránh — để biết khi bảo vệ sẽ đứng cạnh ai, và bản của bạn sắc hơn ở chỗ nào | 1 giờ |

**d. Nếu `R4` mở ra ở mảng tối ưu, page đang thiếu hàng ở đúng đó.** Chỉ có #118 (học chọn biến phân nhánh MILP), #191 (tồn kho lead time bất định), #192 (siêu heuristic giao–nhận). Cái thứ ba trùng gần hết với #36 của lớp. Nếu đó là hướng có người đỡ, cần bổ sung đề tài vào page ở nhánh `or`/metaheuristic — hiện tại chọn ở đó là chọn trong 3 món.

**e. Chỗ khác biệt bền nhất của bạn so với cả lớp:** 0/39 đề tài lớp thuộc khuôn "phê phán đo lường". Nếu chọn khuôn đó, `V2` của bạn mạnh hơn cả lớp theo mặc định — nhưng `R4` yếu hơn, vì không có tiền lệ trong bộ môn. Đó là một đánh đổi thật, và mục 4 của rubric nói lấy **mức xấu nhất**, không phải mức trung bình. Đừng chọn khuôn đó trước khi trả lời xong việc (1).

---

## 6. Việc còn lại — không làm được từ danh sách tên

1. **Không tra `B8` cho đề tài nào.** Mọi nhận định "gần trùng với #N" ở cột cuối là đối chiếu **tên**, không phải đối chiếu câu hỏi. Hai đề tài cùng tên có thể hỏi hai câu khác hẳn.
2. **Không biết ai hướng dẫn đề tài nào.** Cụm 8 đề tài tối ưu là suy luận từ phân bố, `CHƯA KIỂM`. Một câu hỏi ở bộ môn xác nhận hoặc bác bỏ nó trong 5 phút.
3. **Không kiểm bộ dữ liệu nào.** Cột "đường dữ liệu" là giả thuyết.
4. **Không chấm được `R5`.** Nếu muốn biết đề tài của lớp đo có chặt không — thứ mà rubric coi là nghiêm nhất — phải xem đề cương, không xem tên.
5. **Kiểm lại khi có danh mục đề tài kèm tên giảng viên hướng dẫn.** Đó là hiện vật mở khoá `R4` cho cả 193 đề tài trong page, không chỉ cho 39 đề tài này.
