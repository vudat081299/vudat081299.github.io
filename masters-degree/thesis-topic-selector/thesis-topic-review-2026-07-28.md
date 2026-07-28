# Lượt chấm 100 đề tài theo `thesis-topic-rubric.md`

`as_of: 2026-07-28` · đầu vào: `thesis-topic-selector.html` bản 6 (100 đề tài) · đầu ra: bản 7 (87 đề tài)

Đây là **kết quả chấm**, không phải tiêu chí. Tiêu chí ở [`thesis-topic-rubric.md`](thesis-topic-rubric.md).

---

## 1. Ràng buộc chấm — nói trước để đọc kết quả cho đúng

Lượt này là **chấm hồ sơ**, không phải chạy spike. Vì vậy:

- **B1 / B2 / B4 / B6 mặc định `CHUA_THU`** với mọi đề tài — không ai tải dữ liệu, đọc license, chạy baseline, hay tìm được thầy hướng dẫn trong một lượt đọc. Chúng chỉ bị nâng lên `THAT_BAI` khi **chính hồ sơ đề tài** chứa bằng chứng dương rằng chúng sẽ fail.
- **R4 (người đỡ) không chấm được** — page không có trường nào cho nó, và tôi không có danh sách giảng viên bộ môn. Nên **không đề tài nào đạt `DI_DUOC`**; trần của lượt này là `DI_DUOC_CO_DIEU_KIEN`. Đó là kết quả đúng theo mục 1c của rubric, không phải kết quả thiếu.
- **V2 (đóng góp) trần ở mức `DUOC`** với hầu hết đề tài, vì không có bước tra công trình gần nhất cho từng cái.

---

## 2. Đã tra nguồn — 5 trích dẫn nặng nhất

Rubric mục 2 cấm bịa tên bài, tên dataset, con số. Năm chỗ load-bearing nhất đã được tra:

| Đề tài | Claim | Kết quả | Nhãn |
|---|---|---|---|
| #1 | arXiv 2510.13654 là position paper về rò rỉ trong đánh giá TSFM | **Đúng** — *Rethinking Evaluation in the Era of Time Series Foundation Models: (Un)known Information Leakage Challenges*, Meyer / Kaltenpoth / Zalipski / Müller. Hai cơ chế rò rỉ đúng như page mô tả | `CÓ NGUỒN` |
| #2 | arXiv 2603.16815 *Beyond Accuracy*, newsvendor trên M5, có multi-echelon | **Đúng** — tồn tại, nộp 17/03/2026, abstract xác nhận M5 + newsvendor một và hai bậc | `CÓ NGUỒN` |
| #13 | Hai bài medRxiv 2026: slope nội bộ 0,982 · intercept 0,001 · intercept ngoại bộ −0,678; bài thứ hai slope tụt 1,007 → 0,417 | **Đúng** — cả hai bài tồn tại, các số khớp (CI của −0,678 là −0,712…−0,649) | `CÓ NGUỒN` |
| #37 | Gervet 2020: DKT có AUC cao nhất ở 4/9 dataset; logistic dẫn ở dataset cỡ vừa | **Đúng** — và Mandalapu 2021 *Do we need to go Deep?* cũng tồn tại | `CÓ NGUỒN` |
| #20 | Earth Engine: từ 27/04/2026 có hạn mức EECU-giờ; Community 150, Contributor 1.000; không phải ngưỡng cắt cứng | **Đúng từng chi tiết**, kể cả phần "restricted mode chứ không chặn" | `CÓ NGUỒN` |

**Một số liệu sai đã tìm ra — #36.** Page ghi ma trận lớn của KuaiRec có "~1,15 triệu tương tác". Số đúng là **12.530.806** (mật độ ~16,3%); ma trận nhỏ 1.411 × 3.327 với ~4,7 triệu tương tác và mật độ ~99,6% thì page ghi đúng. Đây là lỗi do bản 4 tạo ra *trong lúc sửa* một lỗi khác.

**Xử lý:** sửa số, **không** loại đề tài. Lõi của #36 là "có tập test ngẫu nhiên hoá nên đo được thiên lệch phơi nhiễm" — nó không dựa vào con số đó. Loại một đề tài mạnh vì một con số phụ là áp dụng rubric quá tay.

**Phần còn lại vẫn là `CHƯA KIỂM`.** Page tự khai ở bản 5 và bản 6 rằng không con số hiệu năng nào ở #49–#100 được trích từ bài báo cụ thể. Lượt này không đổi điều đó — nó chỉ xác nhận rằng lượt rà soát dữ kiện của bản 4 (cho #1–#48) đứng vững.

---

## 3. Đã loại — 13 đề tài

### 3a. Nhóm A — blocker B1/B2 ở `THAT_BAI`: không có đường dữ liệu hợp pháp hoặc khả dụng

Điểm chung: **chính hồ sơ đề tài** đã viết ra bằng chứng dương rằng đường dữ liệu có thể không tồn tại — không phải tôi suy đoán.

| # | Đề tài | Ràng buộc bó nhất | Bằng chứng trong hồ sơ |
|---|---|---|---|
| 26 | Nowcasting vĩ mô VN | R1 `CHẶN` + R2 `CHẶN` | `data`: GSO công bố hạn chế, giá sàn TMĐT phải scrape. `d.risk`: "có thể là rào cản không vượt được". `d.spike`: dưới 100 quan sát tháng thì dừng |
| 63 | Kỹ năng nào đang mất giá | R1 `CHẶN` (pháp lý) | `d.risk`: điều khoản nền tảng tuyển dụng không cho thu thập tự động, "nếu không có đường hợp pháp thì đổi đề tài". Cộng: lương thường bị ẩn nên phần hedonic yếu |
| 69 | Trích xuất bệnh án tiếng Việt | R1 `CHẶN` (pháp lý/đạo đức) | `d.risk`: rủi ro cao là pháp lý chứ không kỹ thuật; không có bộ chuẩn tiếng Việt công khai; 4–6 tuần chỉ để gán nhãn. Page tự đề xuất #88 làm đường thay |
| 84 | Dịch máy ngôn ngữ dân tộc thiểu số | R1 `CHẶN` + B6 `THAT_BAI` | `data`: "phải kiểm license từng nguồn"; `q` tự nói các ngôn ngữ này "gần như không có dữ liệu số hoá". Cần người nói bản ngữ để đánh giá mà chưa có ai |
| 98 | Tài khoản phối hợp trên nền tảng | R1 `CHẶN` (pháp lý + đạo đức) | `d.risk`: "thu thập dữ liệu nền tảng thường vi phạm điều khoản — không có nguồn hợp lệ thì đổi đề tài"; công cụ có thể bị dùng nhắm vào người thật. Page tự đề xuất #94 / #97 thay thế |

### 3b. Nhóm B — hai ràng buộc nặng chồng nhau

Quy tắc áp dụng: **`know: cao` một mình KHÔNG loại** (đó là việc đi hỏi bộ môn — B6 `CHUA_THU`, xem mục 3c). Chỉ loại khi gánh nặng domain còn chồng thêm `compute: cao`, hoặc `diff: 5`, hoặc một phần việc đòi đúng một người rất khó tìm.

| # | Đề tài | Chồng gì lên gì |
|---|---|---|
| 51 | Retrosynthesis — "top-1 accuracy đo cái gì" | hoá hữu cơ `cao` + `compute: cao` (transformer chuỗi). Hồ sơ: "Đừng nhận đề tài này nếu không có thầy hiểu hoá hữu cơ" |
| 53 | Vật liệu pin và xúc tác | hoá lý/DFT `cao` + `compute: cao` + dữ liệu rất lớn. Cần hiểu ngưỡng chemical accuracy, nếu không thì mọi con số MAE báo cáo là vô nghĩa |
| 57 | Nguy cơ va chạm trên quỹ đạo | `diff: 5` + 8 tuần cơ học quỹ đạo (cao nhất page) + **nhãn "đã va chạm" gần như không tồn tại**, phải dùng proxy |
| 78 | Mô hình thay thế mô phỏng vật lý | `diff: 5` + PDE/phương pháp số + `compute: cao` để sinh dữ liệu. Hồ sơ: "chỉ nhận nếu có nền toán ứng dụng" |
| 74 | Đèn tín hiệu bằng RL | `diff: 5` + `compute: cao` + `risk: cao`, và điều kiện ≥5 seed mỗi cấu hình. Hồ sơ: "nếu không có ngân sách đó thì đừng nhận" |
| 28 | Target trial emulation | `diff: 5` + nhân quả nâng cao (8 tuần) + phụ thuộc credential PhysioNet (trễ 2–4 tuần). Hồ sơ: "KHÔNG nên chọn nếu không có thầy hướng dẫn mạnh về dịch tễ/nhân quả" |
| 86 | OCR Hán-Nôm | B6 `THAT_BAI` thực chất: phần gán nhãn **bắt buộc** có người đọc được Hán-Nôm, không thay thế được bằng nỗ lực hay tiền. Cộng 5–6 tuần gán nhãn |

### 3c. Nhóm C — quá nhỏ cho một luận văn

**#89 — Tiếng Việt tốn thêm bao nhiêu token.** Chính `d.risk` của nó ghi "rủi ro thật là đề tài quá nhỏ… đây là cảnh báo thật, không phải khiêm tốn", và `d.spike` nói kết quả chính ra trong một buổi sáng. Rubric mục 6 không có nhãn cho "đúng nhưng không đủ tầm", nên xử lý theo đúng đề xuất của chính hồ sơ: **nó là một chương của #46**, không phải một luận văn.

---

## 4. KHÔNG loại, và vì sao — phần này quan trọng bằng phần trên

**a. Trùng khuôn mẫu (F23) không phải lý do xoá khỏi thực đơn.** Page có nhiều cụm dùng cùng một khuôn: #16/#67/#87/#96 đều là bài shortcut/rò rỉ; #2/#21/#25/#42/#62/#65/#70/#71 đều là "đo bằng chi phí quyết định"; #9/#50 là cặp song sinh (rò rỉ homolog / rò rỉ scaffold); #6/#17/#49/#79 đều là đường cong hiệu quả nhãn. Rubric mục 10 xử lý trùng lặp ở **lượt chọn shortlist** — gộp cặp rồi chọn một dựa trên R4 và `know` — chứ không xoá khỏi danh sách. Xoá sớm là tự lấy mất phương án rơi: khuôn lặp chính là lý do mỗi đề tài trong shortlist có một đề tài dự phòng cùng phương pháp mà `risk` thấp hơn.

**b. `know: cao` đơn lẻ ở lại.** Bảy đề tài: #9 (tin sinh), #12 (PLM), #14 (sepsis), #61 (kinh tế), #66 (khí hậu), #81 (kinh tế lượng), #83 (OPE). Tất cả đều mang câu "cần người để hỏi" — nhưng đó là **B6 `CHUA_THU`**, tức việc đi hỏi bộ môn, không phải bản án. Loại chúng bây giờ là đúng lỗi mà bản 5 của page đã tự thú: loại một lĩnh vực bằng một bộ lọc không viết ra.

**c. `compute: cao` có đường thu hẹp ghi rõ thì ở lại.** #12 (ESM-2 150M), #16 (backbone pretrained, ảnh giảm phân giải), #48 (một nhiệm vụ nhị phân), #60 (dùng bộ đã hiệu chỉnh trên Earth Engine). Theo mục R3, "một chỗ chật nhưng có đường xoay đã ghi rõ trong `d.risk`" là `CĂNG`, không phải `CHẶN`.

**d. #18 (dengue VN) ở lại dù `risk: cao`.** Nó là ca duy nhất còn lại ở bậc `cao`, và nó ở lại vì có **phương án B thành văn** (dữ liệu dengue mở của Brazil/Thái Lan) cộng một spike ngày 1–2 chỉ để trả lời đúng câu hỏi dữ liệu. Theo R1 đó là `CĂNG`, không phải `CHẶN`.

**e. #58 (hành tinh ngoài hệ, `impact.s: 2`) ở lại.** Rubric mục 5 nói thẳng điểm tác động thấp không phải điểm xấu. Hồ sơ của nó đã tự khai điều này thay vì tô, nên nó là một mục hợp lệ cho người ưu tiên "làm được chắc".

---

## 5. Hình dạng danh sách sau lượt loại

Chấm máy móc ba trục R1 (`risk`) · R2 (`know`) · R3 (`compute`), lấy mức xấu nhất:

| | Trước (100) | Sau (87) |
|---|---|---|
| Ba trục `ĐI ĐƯỢC` | 19 | **18** |
| Đúng một trục `CĂNG` | 58 | **58** |
| Có trục `CHẶN` | 23 | **11** |

Lượt loại lấy đi 12 trong 23 ca `CHẶN` và gần như không chạm phần giữa — đúng thứ nó nên làm. Mười một ca `CHẶN` còn lại là `know`/`compute` cao đơn lẻ, phần lớn hạ về `CĂNG` khi chấm bằng văn xuôi theo mục 4 của rubric.

**18 đề tài xanh cả ba trục** — chỗ nên mang đi hỏi bộ môn trước:
`#1 #4 #25 #27 #29 #30 #31 #33 #36 #37 #39 #46 #67 #77 #79 #91 #92 #95`

Trong đó 16 cái có `impact.s ≥ 4`. Ba cái rẻ nhất còn lại trong page: **#77** (point-adjust, kết quả chính trong một ngày), **#82** (A/B peeking, mô phỏng), **#92** (đo điện huấn luyện, tự sinh dữ liệu).

---

## 6. Việc còn lại — không làm được từ hồ sơ

1. **Trả lời R4.** Xem danh sách giảng viên bộ môn và luận văn đã bảo vệ 2–3 năm gần đây, rồi chấm lại. Đây là trục page tự gọi là quyết định nhất, và là thứ duy nhất mở được ô `DI_DUOC`.
2. **Đăng ký PhysioNet hôm nay** nếu còn quan tâm #13/#15/#16/#17 — trễ 2–4 tuần, đăng ký không ràng buộc gì.
3. **Tra công trình gần nhất** cho 3–5 đề tài đầu shortlist, để V2 lên được mức `TOT`. Ba chỗ page tự cảnh báo cạnh tranh sát: #2 (đã có bài rất gần), #77 (mảng đã có phê phán), #96 (đã có người làm gần).
4. **Kiểm lại lượt này nếu quá 6 tháng** (`dieu_kien_tai_kiem`), hoặc ngay khi một nguồn dữ liệu chính đổi điều khoản. Tính khả dụng dữ liệu hết hạn; verdict cũng vậy.
