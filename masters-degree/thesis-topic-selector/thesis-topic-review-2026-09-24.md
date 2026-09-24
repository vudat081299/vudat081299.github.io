# Lượt chấm bản 12 — 8 ứng viên, chấm theo `thesis-topic-rubric.md` TRƯỚC khi thêm

`as_of: 2026-09-24` · đầu vào: 8 ứng viên cho hai lỗ đo được của page · đầu ra: `thesis-topic-selector.html` bản 12 (**199 đề tài** = 193 + 6) · tiêu chí ở [`thesis-topic-rubric.md`](thesis-topic-rubric.md)

Đây là **kết quả chấm**, không phải tiêu chí. Nó tồn tại vì luật: mỗi đề tài mới phải qua rubric *trước* khi vào bảng chọn. Bản 11 đo được cái giá của việc không làm vậy — 9/11 đề tài bản 8 đã có người làm.

---

## 1. Vì sao hai lỗ này

| Lỗ | Bằng chứng nó là lỗ thật | Nhãn |
|---|---|---|
| **Tối ưu tổ hợp · tiến hoá** | Lớp: 8/39 đề tài (21%). Page: 3/193 (1,6%). Nguồn: [`classmate-topics-review-2026-08-09.md`](classmate-topics-review-2026-08-09.md) mục 3 | `CÓ NGUỒN` |
| | HUST có người làm ở đây — xem mục 4 | `CÓ NGUỒN` |
| **Dữ liệu bán lẻ có tồn kho** | M5 không có tồn kho: *M5 Competitors Guide* liệt kê đúng ba file `calendar.csv`, `sell_prices.csv`, `sales_train.csv` (tải từ repo `Mcompetitions/M5-methods`, đọc bằng `pdftotext`) | `ĐÃ CHẠY` |
| | Học viên làm ở một công ty phần mềm bán hàng — tài sản dữ liệu mà review 08/09 mục 4.5 đã chỉ ra | `CÓ NGUỒN` |

Phần **ràng buộc chương trình** dùng cho lượt này:
- **Thời lượng:** 9–12 tháng (theo page), 1 người.
- **Tài nguyên:** laptop + free tier.
- **Nền học viên:** 7 năm kỹ sư mobile/backend, đã có đường ống dự báo trên M5 từ Research Proposal Project.
- **Yêu cầu của trường:** **chưa biết** → `yeu_cau_truong.da_ap = false` cho mọi ứng viên.
- **Người đỡ:** chưa hỏi bộ môn → `R4 = CĂNG` chưa xác minh, **không tiêu ngân sách** (rubric 6a).

---

## 2. Bảng tổng

| Ứng viên | Vào page | B8 bản đầu | B8 bản siết | Ràng buộc bó nhất | `CĂNG` có căn cứ | V1 | V2 | Verdict |
|---|---|---|---|---|---|---|---|---|
| A1 · LLM thiết kế heuristic | **#208** | `VUOT` hẹp (mất nhánh lấy mẫu LLM) | `VUOT` | R2 | R2 | 3 | `TOT` | `DI_DUOC_CO_DIEU_KIEN` |
| A2 · đường thật Hà Nội | **#209** | **`THAT_BAI`** (RRNCO) | `VUOT` | R2 | R2 | 4 | `TOT` | `DI_DUOC_CO_DIEU_KIEN` |
| A4 · tiến hoá đa nhiệm | **#210** | `VUOT` vừa (tiền đề sai) | `VUOT` | R2 | R2 | 3 | `TOT` | `DI_DUOC_CO_DIEU_KIEN` |
| A9 · điều phối động | **#211** | `VUOT` (một phần đã có đáp án) | `VUOT` | R3 | R2 · R3 | 4 | `TOT` | `DI_DUOC_CO_DIEU_KIEN` |
| A6 · mô hình hoá tối ưu tiếng Việt | **#212** | `VUOT` mỏng (`F22`) | `VUOT` | R1 | R1 | 4 | `TOT` | `DI_DUOC_CO_DIEU_KIEN` |
| B1 · cờ hết hàng | **#213** | **`THAT_BAI`** (FreshRetailNet ×2, Montoya 2019) | `VUOT` *nếu* có phiếu kiểm kho | R1 | R1 · R2 | 4 | `TOT` | `DI_DUOC_CO_DIEU_KIEN` |
| A5 · khởi động từ lời giải hôm qua | **không** | `VUOT` | `VUOT` | R1 (tiền đề dữ liệu) | — | 3 | `DUOC` | xem 3.7 |
| B2 · ghép tên sản phẩm tiếng Việt | **không** | **`THAT_BAI`** (JointBERT) | `VUOT` | **R1 `CHẶN`** | — | 4 | `TOT` | `CHAN` — chờ mở khoá |

**3/8 bản nháp trượt B8**, thêm 2 bản chỉ qua ở dạng hẹp. Không cái nào lên `DI_DUOC`: `B7` chưa ai làm, `R4` chưa ai hỏi.

---

## 3. Chấm từng ứng viên

Quy ước trạng thái mặc định cho lượt chấm hồ sơ (rubric 3a):
- `B1`, `B2`, `B4`, `B6`, `B7` = `CHUA_THU`, trừ khi ghi khác;
- `B3`, `B5` chấm được ngay;
- `B8` đã chạy thật cho cả 8 ứng viên.

### 3.1 A1 → #208 · LLM thiết kế heuristic so với GP và irace ở cùng số lần đánh giá

**Câu `B3`.** Đo thứ hạng của ba họ thiết kế heuristic tự động (LLM · GP · irace):
- trên xếp thùng, TSP và CVRP, ở cùng N lần đánh giá;
- trong phân bố và ngoài phân bố;
- theo khoảng cách tới lời giải tốt nhất và Kendall τ;
- so với Best Fit và NN + 2-opt.

**B8.**
- **Truy vấn:** `large language model | automatic heuristic design` · `evolutionary search | heuristic design | language model` · `online bin packing | language model | heuristic`. Thêm cho bản siết: `genetic programming | language model | hyper-heuristic` · `algorithm configuration | large language model | heuristic` · `bin packing | genetic programming | language model` (0 kết quả).
- **Hai bài gần nhất:**
  - Zhang và cs., PPSN 2024, arXiv 2407.10873 — benchmark 4 phương pháp × 4 bài × 9 LLM × 5 lần chạy. GP chỉ được bàn về mặt khái niệm (phần mở đầu và phụ lục A.1), không được chạy làm đối thủ. Toàn văn không có chữ „generaliz…” hay „irace”.
  - Sim, Renau & Hart, EvoApplications 2025, arXiv 2501.11411 — abstract: phần lớn heuristic LLM *„do not generalise well … in contrast to existing simple heuristics”*.
- **Câu delta:** Zhang đo LLM với lấy mẫu LLM trên tập huấn luyện; Sim đo khả năng tổng quát hoá so với luật cố định. Đề tài này đặt LLM cạnh các cách thiết kế tự động *không dùng LLM* ở cùng ngân sách, và lấy độ bền thứ hạng làm thước đo chính.
- **Cảnh báo:** Luo và cs. (arXiv 2609.03754, lập lịch dự án) thấy LLM *„outperform GP-designed rules obtained under comparable search effort”* — nên đừng coi kết quả là biết trước. Mảng này đông: hàng chục bài phương pháp trong 2024–2026, RAISE (arXiv 2606.31801) ra tháng 6/2026.

**Ràng buộc.**
- **R1 `ĐI ĐƯỢC`:** OR-Library, FunSearch (Apache-2.0 / CC BY 4.0), CVRPLIB (dùng cho nghiên cứu), EoH MIT, ReEvo MIT, LLM4AD BSD-2.
- **R2 `CĂNG`** có căn cứ: khoảng 5 tuần nền.
- **R3 `ĐI ĐƯỢC`:** CPU cộng API; ≥5 seed.
- **R5 `ĐI ĐƯỢC`:** đủ 5 thành phần.
  - *Rò rỉ phải soi:* heuristic cho bộ chuẩn nổi tiếng có thể nằm sẵn trong corpus tiền huấn luyện của LLM. Instance ngoài phân bố và instance tự sinh là đối chứng.
- **R6 `ĐI ĐƯỢC`.**

**Giá trị.**
- **V1 = 3:** `B7` được miễn, công trình bị đổi cách đọc là Zhang 2024.
- **V2 `TOT`:** dạng 1, đo lại dưới điều kiện chặt hơn.
- **V3 Thấp.**

**Sàn tầm cỡ (5d):** không `QUA_NHO` — 3 bài × 3 họ × 4 tầng test.

**Cờ.**
- `F23` với #192 (siêu heuristic học được) → chọn một.
- Sinh đôi ở lớp: #14, #36.

### 3.2 A2 → #209 · tính chất nào của đường thật làm đảo thứ hạng bộ giải

**Bản đầu `THAT_BAI`.**
- RRNCO (Son và cs., arXiv 2503.16159). Abstract: *„asymmetric distance and duration matrices from 100 diverse cities”*. Hà Nội có trong danh sách thành phố của bài (đã grep bản HTML).
- Boyacı, Dang & Letchford, *Computers & Operations Research* 129 (DOI 10.1016/j.cor.2020.105197) — *„Vehicle routing on road networks: How good is Euclidean approximation?”*.
- Vì vậy bản đầu chỉ còn là góc Việt Nam — tức đổi dataset (`F22`).

**Câu `B3` bản siết.**
- Cố định tập điểm, đổi ma trận theo bốn bậc: Euclid → khoảng cách đường đối xứng hoá → khoảng cách bất đối xứng → thời gian bất đối xứng.
- Nhân với mức cụm của khách.
- Đo Kendall τ của thứ hạng HGS / PyVRP / ALNS / OR-Tools / POMO ở cùng thời gian tường, so với bậc Euclid.

**Cơ chế kiểm được — đã đọc code, `ĐÃ CHẠY`.** Trong `vidalt/HGS-CVRP/Program/LocalSearch.cpp`:
- SWAP* chỉ bật khi `params.areCoordinatesProvided`;
- SWAP* chỉ chạy trên cặp tuyến có `CircleSector::overlap(routeU->sector, routeV->sector)`.

Nghĩa là HGS dùng toạ độ làm đại diện cho chi phí. Khi thời gian đi lệch hình học, đây là chỗ đầu tiên để nghi.

**Truy vấn B8 bản siết:** `vehicle routing | road network | Euclidean distance` · `neural | vehicle routing | asymmetric | distance matrix`. Chỉ ra Boyacı và RADAR (arXiv 2603.03388). Cả hai không tách nguyên nhân.

**Hai sửa sai trong lúc chấm.**
1. **OSRM không có hồ sơ xe máy có sẵn.** Thư mục `profiles/` có `car.lua`, `bicycle.lua`, `foot.lua`; các tên `motorcycle.lua`, `motorbike.lua`, `scooter.lua` đều trả HTTP 404. Hồ sơ xe máy phải tự viết — ghi thành một phần bàn giao.
2. **PyVRP 0.13.0 (15/01/2026) đổi thuật toán.** Release notes: *„a complete overhaul … from hybrid genetic search to iterated local search”*. Phần HGS dùng HGS-CVRP, hoặc ghim PyVRP ≤ 0.12.

**Ràng buộc và giá trị.**
- R1 `ĐI ĐƯỢC` (OSM ODbL 1.0, OSRM BSD-2, RRNCO MIT).
- R2 `CĂNG` có căn cứ.
- R3, R5, R6 `ĐI ĐƯỢC`.
- V1 = 4 · V2 `TOT` · V3 Vừa (Hà Nội, xe máy).

### 3.3 A4 → #210 · đường liều–đáp ứng của tiến hoá đa nhiệm

**B8 `VUOT` ở mức vừa.**
- Gupta & Ong, IEEE SSCI 2016 (DOI 10.1109/ssci.2016.7850038) hỏi đúng câu „chuyển giao gen hay đa dạng quần thể”, nhưng trên Sudoku. Abstract: *„Sudoku puzzles as case studies”*.
- Hashimoto và cs., GECCO Companion 2018 (DOI 10.1145/3205651.3208228) phân tích MFEA như mô hình đảo.
- G-MFEA, AT-MFEA và LDA-MFEA đã *nói bằng lời* rằng MFEA dựa vào điểm tối ưu gần nhau.

**Tiền đề của bản nháp sai.** Điểm tối ưu trùng nhau là yếu tố **thiết kế** của CEC17-MTSO: bộ này có ba mức giao — hoàn toàn / một phần / không giao — nhân ba mức tương đồng. Cái bị trộn thật là mỗi mức dùng một cặp hàm khác nhau. Dời điểm tối ưu trên cùng cặp hàm tách được hai thứ đó.

**Câu `B3`.**
- Giữ cặp hàm, dời hoặc xoay điểm tối ưu một khoảng d.
- Đo lợi thế của MFEA / MFEA-II / G-MFEA / AT-MFEA / LDA-MFEA so với L-SHADE / jSO / CMA-ES, ở cùng số lần đánh giá mỗi bài.
- Kiểm tương quan giữa RMP học được và lợi thế thực đo.

**Truy vấn bản siết:** `multitasking | optima | distance` · `evolutionary multitasking | task similarity | correlation`. Không ra nghiên cứu liều–đáp ứng nào.

**Ràng buộc và giá trị.**
- R1 `ĐI ĐƯỢC`: mô phỏng. MToP không có file license (chỉ cho dùng nghiên cứu); `mfea-ii` MIT, đã lưu trữ.
- R2 `CĂNG` có căn cứ.
- R3, R5, R6 `ĐI ĐƯỢC` (≥20 lần chạy mỗi cấu hình).
- V1 = 3 · V2 `TOT` — hứa *phép đo*, không hứa phát hiện · V3 Thấp.

**Rủi ro riêng:** đây là phép đo một phương pháp mà nhóm hướng dẫn có thể đang dùng. Đặt khung là „khi nào chuyển giao đáng”.

### 3.4 A9 → #211 · điều phối động: chính sách học sẵn và mô phỏng trực tuyến ở cùng ngân sách CPU

**B8 `VUOT`.** Một phần câu hỏi của bản nháp đã có đáp án. Ba con số đã đối chiếu với toàn văn, mức `CÓ NGUỒN`:
- Baty và cs., *Transportation Science* 2024 (DOI 10.1287/trsc.2023.0107): *„outperforms greedy policies by 13.18% and even monte-carlo policies, which were granted a longer runtime, by 1.57%”*.
- Lan và cs., *Transportation Science* 2024 (DOI 10.1287/trsc.2023.0111): *„differences … are mainly due to differences in the dynamic aspect”* — đây là một câu nói, không phải một phép đo. Và *„120-second time limit … has a 0.8% gap over the best result”*.
- Kool và cs., PMLR 2023 (báo cáo cuộc thi): *„a strong correlation between each team's performance on the static and the dynamic variant”*.

**Câu `B3`.** Trên tập con các cấu hình chung kết, ở cùng CPU-giây mỗi đợt, tìm vùng của mặt phẳng (ngân sách × mức động) mà ML-CO thua ICD, và đo xem bộ giải tĩnh dời biên giới đó bao nhiêu.

**Truy vấn bản siết:** `dispatch waves | vehicle routing` · `dynamic vehicle routing | lookahead | learning`.

**Dữ liệu.**
- Repo `ortec/euro-neurips-vrp-2022-quickstart`. File LICENSE: *„The data (/instances directory) is licensed under the Creative Commons Attribution-NonCommercial 4.0 …”* kèm MIT cho code. Repo có thư mục `results` và `environment.py`.
- tumBAIS MIT · leonlan/dynamic-dispatch-waves MIT (đã lưu trữ) · HGS-CVRP MIT.

**Ràng buộc và giá trị.**
- R1 `ĐI ĐƯỢC`.
- R2 `CĂNG` và **R3 `CĂNG`**, cả hai có căn cứ: factorial đầy đủ là hàng nghìn giờ CPU. Đường thu hẹp đã ghi trong `d.risk`.
- R5, R6 `ĐI ĐƯỢC`.
- V1 = 4 · V2 `TOT` · V3 Thấp.

**Ngân sách:** đúng 2 `CĂNG` có căn cứ — sát trần của `DI_DUOC_CO_DIEU_KIEN`.

### 3.5 A6 → #212 · LLM mô hình hoá tối ưu từ đề tiếng Việt: câu chữ hay cách viết số

**Bản đầu mỏng (`F22`).** Mọi phần của nó đã có người làm:
- Xiao và cs. (arXiv 2508.10047) làm sạch các bộ chuẩn vì *„a surprisingly high error rate”*.
- OptArgus (arXiv 2605.11738) và TriVAL (arXiv 2605.23966) đã có phân loại lỗi.
- Đã có bản dịch tiếng Bồ Đào Nha `cabralski/IndustryOR-PTBR` (Hugging Face, `language:pt`, `license:cc-by-nc-4.0`).

**Câu `B3` bản siết.**
- Factorial ba trục: câu chữ {Anh, Việt} × cách viết số {kiểu Anh, kiểu Việt} × nguồn {dịch, viết gốc tiếng Việt}.
- Chấm theo khớp mục tiêu và tương đương cấu trúc.
- Kiểm McNemar giữa các ô.
- Can thiệp: chuẩn hoá số trước khi đưa vào LLM.

**B8 bản siết.**
- **Truy vấn:** `optimization modeling | multilingual` · `number format | language model`.
- **Gần nhất:** Han và cs. (arXiv 2604.01639). Abstract: *„name substitution and number format paraphrasing … answer-flip rates (28.8%–45.1%), with number paraphrasing consistently more disruptive”*. Nhưng đó là toán đố GSM8K tiếng Anh, trên 3 mô hình 7–8B.

**Dữ liệu.** NL4Opt MIT · MAMO CC-BY-SA-4.0 · IndustryOR CC-BY-NC-4.0 · OptMATH Apache-2.0 — tra bằng GitHub API và HF API.

**Ràng buộc và giá trị.**
- **R1 `CĂNG`** có căn cứ: tự dịch và tự viết 100–200 bài.
- R2 `ĐI ĐƯỢC`.
- R3 `ĐI ĐƯỢC`.
- R5 `ĐI ĐƯỢC`. *Rò rỉ:* các bộ chuẩn tiếng Anh có thể đã nằm trong corpus tiền huấn luyện; bộ bài viết gốc tiếng Việt là đối chứng sạch.
- R6 `ĐI ĐƯỢC`.
- V1 = 4 · V2 `TOT` · V3 Vừa.

### 3.6 B1 → #213 · cờ „hết hàng” từ sổ tồn kho có đáng tin không

**Bản đầu `THAT_BAI`.** Ba bài đã trả lời đúng câu hỏi đó:
- Montoya & Gonzalez, MSOM 2019 (DOI 10.1287/msom.2018.0732) — HMM trên dữ liệu POS, đối chiếu kiểm kệ bằng mắt, 14 sản phẩm × 10 cửa hàng. Abstract: phát hiện 63,48%, báo động giả 15,52%.
- Azar, *Inventions* 2026 (DOI 10.3390/inventions11050089) — sửa censoring trên FreshRetailNet-50K rồi tối ưu tồn kho.
- Yin, Zheng & Kong, *Sustainability* 2026 (DOI 10.3390/su18157642) — cùng hướng, cũng trên FreshRetailNet-50K.

**Câu `B3` bản siết.**
- Đo tỉ lệ sai hai chiều của cờ „tồn ≤ 0” so với phiếu kiểm kho.
- Đo lợi ích của ba đường ống — bỏ qua censoring / tin cờ / mô hình có nhiễu cờ — theo chi phí thiếu + tồn trong mô phỏng đặt hàng.

**B8 bản siết.**
- **Truy vấn:** `inventory record inaccuracy | censored` · `inventory record inaccuracy | stockout`.
- **Gần nhất:** Mersereau, MSOM 2015 (DOI 10.1287/msom.2015.0520). Abstract nói các bài trước *„assume that inventory levels are known and hence that stockouts are observed”*, rồi chứng minh độ lệch xuống bằng phân tích. Không có dữ liệu thực địa.

**Dữ liệu.**
- **Chính:** dữ liệu của công ty — `CHUA_KIEM`. Ngày 1 phải xác nhận hai điều: có phiếu kiểm kho kèm mốc thời gian không, và hệ thống có cho bán khi tồn ≤ 0 không.
- **Phương án B:** FreshRetailNet-50K (`license:cc-by-4.0`; dataset card ghi 50.000 chuỗi 90 ngày theo giờ, 898 cửa hàng, 18 thành phố) và FreshRetailNet-LT (`cc-by-4.0`). Không có lần đếm thật, nên phương án B chỉ trả lời được bản hẹp: độ bền của các phương pháp sửa censoring khi cờ bị nhiễu nhân tạo.

**Ràng buộc.**
- **R1 `CĂNG`** có căn cứ: phải xin, có kênh, có phương án B mỏng. `B2 = CHUA_THU` — một người trong công ty phải ký.
- **R2 `CĂNG`** có căn cứ, khoảng 4 tuần. Bản đầu của `d.learn` ghi khoảng 3 tuần trong khi `know: tb` — đó là `F27`, đã sửa.
- R3 `ĐI ĐƯỢC`.
- R5 `ĐI ĐƯỢC`: chia theo cửa hàng, bootstrap theo cửa hàng.
- R6 `ĐI ĐƯỢC`: cả khi cờ gần như luôn đúng, con số tỉ lệ sai đo trên dữ liệu thật vẫn là đóng góp. Bản đầu của `d.spike` viết nhánh âm mỏng hơn thực tế, đã sửa.

**Giá trị.**
- V1 = 4.
- V2 `TOT`: dạng 5 (dữ liệu mới) cộng dạng 7 (hạ tầng đo).
- V3 Vừa. Riêng lợi thế người trong cuộc nằm ở `R1`, không ở `V3` — rubric cấm để `V3` nâng `V1`.

### 3.7 A5 · khởi động bộ giải từ lời giải hôm qua — **không thêm**

**B8 `VUOT`, độ đông thấp.**
- Morabit, Desaulniers & Lodi, *Networks* 2023 (DOI 10.1002/net.22200) chỉ xét trường hợp khách không đổi.
- Feng và cs., IEEE T-ITS 2020 (DOI 10.1109/tits.2020.3018903) chuyển tri thức giữa các cặp bộ chuẩn.

**Nhưng tiền đề sai khi đo trên dữ liệu thật.**
- Amazon Last Mile 2021 (CC BY-NC 4.0) có mã điểm dừng theo từng tuyến và toạ độ đã làm nhiễu.
- Lượt tra đo được trung vị khoảng 12% điểm dừng lặp lại trong vùng chung ở Amazon, và khoảng 6,6% ở LaDe. Con số này do agent đo trên một mẫu nhỏ — `CHƯA KIỂM` bằng tay.

Đường cong „lợi ích theo mức đổi khách” vì thế chỉ dựng được bằng đổi khách nhân tạo.

**Bản siết.** Khởi động ở tầng vùng giao hàng, nơi mức lặp lại cao hơn (khoảng 51% cặp tài xế–vùng ở LaDe, cũng `CHƯA KIỂM` bằng tay). B8 qua, nhưng `V1` = 3 và phần giá trị thật nằm ở *phát hiện dữ liệu* — một quan sát, không phải một luận văn.

**Không đưa vào bảng chọn.** Rubric cho phép `DI_DUOC_CO_DIEU_KIEN` trên giấy, nhưng đây là ứng viên yếu nhất về giá trị, và rubric mục 10 nói xếp theo giá trị sau khi sàng. Nếu muốn làm, gộp nó thành một chương của #209 (dữ liệu thật và bộ chuẩn).

### 3.8 B2 · ghép tên sản phẩm tiếng Việt về danh mục chung — **`CHAN`, chờ mở khoá**

**Bản đầu `THAT_BAI`.**
- Peeters & Bizer, PVLDB 14 (2021), DOI 10.14778/3467861.3467878 (JointBERT): huấn luyện trên mô tả có GTIN để ghép phần không có — đúng thiết kế của bản nháp.
- Peeters, Steiner & Bizer (arXiv 2310.11244) đã so LLM zero-shot với mô hình tinh chỉnh trên dữ liệu sản phẩm.

**Bản siết — `B8 VUOT`.** Nhãn mã vạch *thiếu không ngẫu nhiên*: hàng đóng gói có EAN-13, hàng rời / tươi / tự làm thì không. Câu hỏi: P@1 và khối lượng soát tay đo trên hàng có mã vạch lệch bao nhiêu so với hàng không có mã, và một mẫu kiểm có trọng số nhỏ có sửa được độ lệch đó không.
- **Truy vấn:** `entity matching | domain adaptation` · `entity resolution | evaluation | sampling`.
- Binette và cs. (arXiv 2210.01230) và OASIS (PVLDB 2017, DOI 10.14778/3137628.3137642) sửa thiên lệch *do cách người chấm lấy mẫu*, không phải do mặt hàng nào có nhãn.

**`R1 = CHẶN`.**
- Không bộ công khai nào có tên hàng do cửa hàng tự gõ kèm mã vạch.
- Open Food Facts (ODbL) chỉ có một tên cho mỗi sản phẩm.
- WDC Products là tiếng Anh và không ghi license dữ liệu.

Vì vậy không có phương án B.

**Mở khoá bằng hai câu hỏi trong công ty:** có danh mục hàng của từng cửa hàng không, và bao nhiêu phần trăm mặt hàng có mã vạch. Có hai con số đó thì chấm lại.

---

## 4. Bằng chứng `R4` ở HUST — tra OpenAlex ngày 24/09/2026

Truy vấn: `authorships.institutions.id:I94518387` (Hanoi University of Science and Technology) kết hợp `title_and_abstract.search`.

| Mảng | Kết quả | Ví dụ đã tra từng DOI |
|---|---|---|
| LLM thiết kế heuristic | ≥ 4 bài 2025–2026 | HSEvo, AAAI 2025 (10.1609/aaai.v39i25.34898) · Pareto-Grid-Guided LLM, AAAI 2026 (10.1609/aaai.v40i43.41024) · MOTIF, AAAI 2026 (10.1609/aaai.v40i43.41028) · QDEvo, GECCO 2026 Companion (10.1145/3795101.3805343) |
| Tiến hoá đa nhiệm | 27 bài có cụm „multifactorial evolutionary” từ 2019 | Applied Soft Computing 2021 (10.1016/j.asoc.2021.107253) · Knowledge-Based Systems 2024 (10.1016/j.knosys.2024.111870) |
| Giao–nhận hàng | 11 bài có cụm „pickup and delivery” từ 2019 | GECCO 2025 về giao–nhận động (10.1145/3712256.3726467) |
| ALNS | 6 bài | Computers & Industrial Engineering 2022 (10.1016/j.cie.2022.108597) |
| Dự báo bán lẻ / tồn kho | gần như không có — kết quả chủ yếu là dự báo điện | — |
| Ghép thực thể / sản phẩm | 1 bài (chuẩn hoá địa chỉ tiếng Việt, 2019) | — |

**Hệ quả:** #208 – #212 có bằng chứng `R4` gián tiếp mạnh. #213 thì yếu — mảng dự báo bán lẻ ở HUST mỏng, nên người đỡ phần domain có thể phải là người trong công ty. Đây là `CÓ NGUỒN` về *người làm mảng*, không phải *người nhận hướng dẫn*. Câu đó chỉ bộ môn trả lời được.

---

## 5. Đã kiểm gì, bằng gì

| Thứ | Cách kiểm | Kết quả |
|---|---|---|
| Mọi DOI trích trong 6 đề tài và file này | `api.openalex.org/works/doi:…`, đối chiếu tiêu đề và tác giả | 100% khớp |
| Mọi mã arXiv | OpenAlex DOI `10.48550/arxiv.*` (arXiv API bị giới hạn tốc độ hôm đó) | 21/22 khớp (1909.07893 không có trên OpenAlex, tra được qua arXiv API); 2505.19053 không tra được nên không được dùng ở đâu |
| Con số trích | Grep toàn văn đã tải (Baty, Lan, Kool, Zhang) hoặc abstract (Han, Montoya, Mersereau, RRNCO, Sim, Luo, Xiao) | Khớp |
| License | GitHub API (`license.spdx_id`), file LICENSE thô, Hugging Face API (`tags: license:*`) | Như ghi trong từng đề tài |
| M5 không có tồn kho | Tải *M5 Competitors Guide* từ repo chính thức, `pdftotext` | Đúng ba file |
| OSRM không có hồ sơ xe máy | HTTP status của từng tên file trong `profiles/` | Chỉ car / bicycle / foot |
| PyVRP đổi thuật toán | Release notes v0.13.0 qua GitHub API | Đúng |
| HGS cắt tỉa SWAP* theo hình quạt | Đọc `LocalSearch.cpp` | Đúng |

---

## 6. Giới hạn của lượt này

- **`B8` là tra theo abstract**, trần một ngày cho mỗi ứng viên. Nó không loại trừ được baseline nằm trong phụ lục của các bài phương pháp. Với #208 thì rủi ro này cao nhất — tra lại trước khi nộp đề cương.
- **Độ đông của mảng là ước lượng** từ kết quả tìm kiếm, không phải đếm có hệ thống.
- **`B7` chưa làm cho đề tài nào.** Điểm `V1` = 4 của #209, #211, #212 và #213 đều chưa qua cuộc gọi 30 phút.
- **`R4` chưa hỏi.** Mục 4 chỉ nói *ai làm mảng này*, không nói *ai nhận bạn*.
- **Kiểm lại** nếu quá 6 tháng, hoặc ngay trước khi đăng ký đề tài.
