# Chấm từng đề tài — 39 đề tài lớp: rủi ro dữ liệu, độ khó, ràng buộc bó nhất

`as_of: 2026-08-09` · tiếp theo [`classmate-topics-review-2026-08-09.md`](classmate-topics-review-2026-08-09.md) · thang đo lấy từ [`thesis-topic-rubric.md`](thesis-topic-rubric.md) và từ chính schema của `thesis-topic-selector.html`

---

## 1. Cách chấm, và giới hạn của nó

Mỗi đề tài được gán bốn trường khai báo của page (`diff` 1–5 · `risk` · `compute` · `know`) cộng **ràng buộc bó nhất** theo mục 4 của rubric. Vì đầu vào chỉ là tên đề tài, các trường này là **suy luận từ lĩnh vực + phương pháp được nêu tên**, không phải đọc từ hồ sơ. Nhãn bằng chứng cho toàn bộ tài liệu: **`CHƯA KIỂM`.**

Mọi tên bộ dữ liệu trong tài liệu này là **gợi ý đường đi, không phải kết quả tra cứu**. Không bộ nào được mở trong lượt này, không con số nào được trích. Dùng chúng làm từ khoá để tra, đừng dùng làm dữ kiện.

Thang `diff` đọc theo **thang thực dùng** (rubric 1b): `3` là **sàn**, không phải "trung bình"; `4` là mức phổ biến; `5` là hiếm.

### 1a. Sáu kiểu rủi ro dữ liệu — trường `risk` của page gộp cả sáu vào một trục

Đây là phần đáng mang về sửa page. `risk: thap/tb/cao` không phân biệt được sáu thứ dưới đây, mà chúng hỏng theo sáu cách khác nhau và chữa bằng sáu cách khác nhau:

| Kiểu | Nghĩa | Chữa bằng | Ai trong list |
|---|---|---|---|
| **① Tồn tại** | Dữ liệu có thể đơn giản là không đủ | Không chữa được. Đếm trước, ngày 1 | #18 |
| **② Cửa vào** | Có, nhưng phải nộp đơn và chờ | Nộp đơn **hôm nay**; chi phí là lịch, không phải công | #1 #21 |
| **③ Pháp lý · đạo đức** | Lấy được nhưng không được dùng, hoặc không được công bố | Xác định **ai ký** trước khi viết một dòng code | #3 #4 #12 #20 #26 |
| **④ Nhãn** | Dữ liệu vô hạn, nhãn bằng không — hoặc nhãn là proxy của thứ khác | Đổi câu hỏi sang thứ không cần ground truth | #13 #17 #20 #25 #26 #35 |
| **⑤ Công** | Có, hợp pháp, nhưng phải tự tạo và tốn hàng tuần | Cắt phạm vi, hoặc tính nó vào lịch như một chương | #28 #29 #4 |
| **⑥ Giả (dữ liệu mô phỏng)** | Không có rủi ro truy cập — nhưng kết luận chỉ đúng trong mô hình đã giả định | Quét **tham số môi trường**, không chỉ tham số thuật toán | #5 #8 #11 #14 #23 #30 #32 |

Kiểu ⑥ là kiểu page không có tên gọi và cũng gần như không có ca nào. Tám đề tài trong lớp nằm ở đó, và cả tám sẽ được `risk: thap` nếu điền vào schema của page — **đúng nhưng gây hiểu nhầm**. Rủi ro của chúng không biến mất, nó chuyển từ `R1` sang `R5`.

---

## 2. Thẻ chấm — 39 đề tài

Ký hiệu: **RBBN** = ràng buộc bó nhất · ⚠ = chỗ hỏng đáng soi nhất

---

**#1 · Phân tầng nguy cơ bệnh đa gen (PRS)**
`diff 4` · `risk cao ②` · `compute tb` · `know cao`
Dữ liệu genotype **cấp cá thể** + kiểu hình bệnh. Cửa vào là quy trình duyệt biobank kèm phí, chờ tính bằng tháng. Dữ liệu chắc chắn tồn tại — rủi ro là **lịch**, không phải sự tồn tại. Phương án B rẻ: chỉ dùng trọng số PRS công bố + thống kê tổng hợp, nhưng khi đó "phân tầng" chỉ đánh giá được trên dữ liệu mô phỏng.
⚠ `know: cao` thật — cấu trúc quần thể, mất cân bằng liên kết, hiệu chuẩn theo tổ tiên. Sai một chỗ là mọi số vô nghĩa.
**RBBN: R1 ②.** Page có bản sắc hơn: **#105** (PRS chuyển sang người Việt được bao nhiêu).

**#2 · So sánh ARIMA · Prophet · LSTM (bán lẻ)**
`diff 3` · `risk thap` · `compute thap` · `know thap`
Đường dữ liệu sạch nhất list — bộ bán lẻ mở, tải là chạy. Không có rủi ro dữ liệu nào đáng nói.
⚠ Rủi ro nằm ở chỗ khác hẳn: **kết quả đã biết trước.** Các cuộc thi dự báo lớn đã cho thấy mô hình chuỗi thuần thường thua cây tăng cường gradient và thua cả baseline thống kê ở cấp SKU. Nếu ra đúng kết quả đã biết thì không còn gì để viết.
**RBBN: V2 + sàn 5d.** Cứu bằng một trục thứ hai: đo bằng chi phí tồn kho (→ page **#2**) hoặc quét theo mức rời rạc của nhu cầu (→ page **#3**).

**#3 · Trực quan hoá dữ liệu dân cư**
`diff 3` · `risk tb ③` · `compute thap` · `know thap`
Truy cập không phải vấn đề với người trong ngành. Vấn đề là **công bố**: dữ liệu dân cư gần như chắc chắn không cho đưa số liệu thô vào luận văn, nên phải viết trên số tổng hợp và hội đồng có thể không được xem dữ liệu.
⚠ Không có baseline, không có metric, không có giả thuyết sai được → `R5 = CHẶN` theo đúng chữ của rubric.
**RBBN: R5.** Cứu bằng cách biến thành câu hỏi đo được — *"cách biểu diễn nào làm người ra quyết định đọc đúng hơn?"* — có thí nghiệm với người dùng, có metric. Đó là khuôn page **#195**.

**#4 · Phân tích mức độ tập trung của lớp học · edge · lightweight DL · privacy-first**
`diff 4` · `risk cao ③⑤` · `compute tb` · `know tb`
Video khuôn mặt người học. Cần đồng ý của người học (và người giám hộ nếu vị thành niên) cộng một đơn vị đứng ra duyệt. `F35` rõ: không nêu được ai duyệt và chờ bao lâu thì `R1` không được xếp trên `CĂNG`.
⚠ Mâu thuẫn nội tại: đề tài hứa **quyền riêng tư**, mà chỉ chứng minh được điều đó trên dữ liệu tự thu — và dữ liệu tự thu chính là chỗ phải xin duyệt. Dùng bộ mở thì phần "privacy-first" mất đối tượng.
Cộng `F4`: mô hình + hệ thống biên + triển khai trong một luận văn.
**RBBN: R1 ③.**

**#5 · Robot kho: A*/RRT + ML dự đoán tránh tắc nghẽn**
`diff 4` · `risk thap ⑥` · `compute tb` · `know tb`
Mô phỏng, không có rủi ro truy cập.
⚠ Nhãn "tắc nghẽn" do **chính simulator sinh ra** → nguy cơ nhãn suy ra từ chính thứ đang dự đoán (có trong danh sách rò rỉ của `R5`). Phải định nghĩa tắc nghẽn độc lập với bộ điều khiển đang đánh giá.
⚠ Kết luận chỉ đúng cho layout kho đã mô phỏng. Không có bộ layout thứ hai thì không có tổng quát hoá.
**RBBN: R5.** Baseline bắt buộc: A*/RRT thuần + một luật ưu tiên đơn giản.

**#6 · Phân cụm công bằng trong xếp hạng tín dụng**
`diff 3` · `risk thap` · `compute thap` · `know tb`
Bộ tín dụng mở có sẵn thuộc tính nhạy cảm → đo công bằng được ngay. Một trong ba đề tài sạch dữ liệu nhất list.
⚠ Vấn đề khái niệm, không phải kỹ thuật: **phân cụm là bài toán không giám sát, xếp hạng tín dụng là bài toán có giám sát.** Phân cụm để làm gì trong quy trình chấm điểm — phân đoạn khách hàng trước khi chấm? Xây mô hình riêng mỗi cụm? Nếu không trả lời được thì đề tài chưa có đối tượng đo.
⚠ "Công bằng" có nhiều định nghĩa mâu thuẫn nhau về mặt toán học. Phải chọn một và biện minh, không được dùng chữ chung chung.
**RBBN: B3.**

**#7 · Label smoothing cho phân loại ảnh**
`diff 3` · `risk thap` · `compute tb` · `know thap`
Bộ ảnh chuẩn, mở. Rủi ro dữ liệu bằng không.
⚠ **Sàn tầm cỡ.** Đạt ít nhất 2/4 dấu hiệu 5d: một trục thực nghiệm duy nhất; `contrib` là một quan sát chứ không phải hiện vật dùng lại được. Label smoothing là một dòng code và tác động của nó đã được đo nhiều.
**RBBN: 5d.** Cứu, và cứu được thật: đổi thước đo. *Label smoothing đổi **hiệu chuẩn** bao nhiêu so với đổi độ chính xác bao nhiêu, và nó tương tác thế nào với mất cân bằng lớp / nhãn nhiễu.* Đó là `V2` dạng 2 và nó nâng đề tài lên một bậc bằng một câu.

**#8 · DRL + ALNS giải bài toán phân hoạch vùng hoạt động**
`diff 5` · `risk thap ⑥` · `compute tb–cao` · `know cao`
Instance chuẩn hoặc tự sinh — không có rủi ro truy cập.
⚠ **Phương sai RL.** Rubric `R3` quy tắc riêng: họ phương pháp phương sai lớn giữa seed cần ≥5 seed mỗi cấu hình, không đủ ngân sách thì `CHẶN`. Ở đây mỗi lần đánh giá phải chạy trọn một vòng ALNS — nhân lên rất nhanh.
⚠ **Baseline khó thắng.** ALNS với trọng số thích nghi đã rất mạnh. "DRL chọn toán tử" thường hơn vài phần trăm, và vài phần trăm đó nằm trong nhiễu nếu không có khoảng tin cậy.
**RBBN: R3.** `know: cao` thật — ALNS + RL + lý thuyết bài toán phân hoạch có ràng buộc cân bằng/liền khối.

**#9 · Khai thác cơ sở tri thức y sinh để phát triển mô hình dự đoán phân loại**
`diff 4` · `risk tb` · `compute tb` · `know cao`
Đồ thị tri thức y sinh nhìn chung mở, nhưng một số nguồn dược/thuật ngữ có license hạn chế dùng — phải đọc từng cái.
⚠ **Chưa phải một đề tài.** "Phân loại" cái gì? Không có đối tượng đo → không có baseline → không có metric. `B3` ở `THAT_BAI` theo đúng chữ của rubric: nếu không viết được câu *"đo X trên Y theo metric Z so với baseline W"* thì blocker này trượt, và nó chấm được ngay chứ không phải `CHUA_THU`.
**RBBN: B3.** Cùng #33 và #37, đây là một trong ba mục chưa thành hình.

**#10 · Một số phương pháp diễn giải mạng thần kinh đồ thị**
`diff 3` · `risk thap` · `compute thap–tb` · `know tb`
Có benchmark tổng hợp với **giải thích đúng đã biết trước** — nghĩa là đo được chặt mà không cần gán nhãn. Chạy trên laptop.
⚠ Mảng đã đông và đã có sẵn phê phán rằng chính các metric đánh giá giải thích không nhất quán với nhau. `B8` sẽ ra rất nhiều kết quả.
**RBBN: V2.** Nhưng chỗ đông đó chính là cơ hội: *"các phương pháp diễn giải có đồng ý với nhau không, và bất đồng đến từ đâu"* — khuôn page **#196**, và nó là `V2` dạng 1 (đo lại chặt hơn), dạng bền nhất.
**Đây là đề tài rủi ro vận hành thấp nhất list cùng #38.**

**#11 · Ứng dụng học tăng cường trong điều khiển tín hiệu giao thông**
`diff 4` · `risk thap ⑥` · `compute cao` · `know tb`
Mô phỏng giao thông mã nguồn mở + mạng lưới mẫu công khai.
⚠ Đúng ca page đã **loại** (#74): `compute: cao` + phương sai RL + ≥5 seed × nhiều kịch bản lưu lượng.
⚠ Baseline **max-pressure** không dùng học máy nhưng rất khó thắng, và mảng này đã rất đông.
**RBBN: R3**, sát nút **V2**.

**#12 · Công cụ trực quan hoá truy vết đối tượng (di biến động + căn cước)**
`diff 3` · `risk tb ③` · `compute thap` · `know thap`
Cùng nhóm ③ với #3. Rủi ro không nằm ở lấy được hay không mà ở **được viết ra bao nhiêu**.
⚠ Không baseline, không metric → `R5 = CHẶN`, giống #3.
⚠ Ghi như một trục chấm, không phải phán xét: công cụ truy vết người là đúng loại hiện vật mà rubric từng dùng để loại **#98** khỏi page (*"công cụ có thể bị dùng nhắm vào người thật"*). Trong khuôn khổ nghiệp vụ của cơ quan thì khác — nhưng nếu bạn cân nhắc khuôn tương tự, đó là chi phí phải tính vào.
**RBBN: R5.**

**#13 · Học sâu dự đoán tác dụng phụ của thuốc**
`diff 4` · `risk tb ④` · `compute tb` · `know tb–cao`
Nguồn tác dụng phụ mở, tải được.
⚠ **`F18` — nhãn thiếu bị dùng như nhãn âm.** Cơ sở dữ liệu tác dụng phụ chỉ ghi những gì **đã được báo cáo**. Thuốc không có nhãn "gây X" không có nghĩa là không gây X — thường chỉ có nghĩa là chưa ai nghiên cứu. Mọi mô hình coi ô trống là 0 đang học "thuốc này ít được nghiên cứu", không phải "thuốc này an toàn". Rubric xếp cái này thẳng vào `R5 = CHẶN`.
Và chính chỗ đó là cơ hội: xử lý đúng bằng học positive-unlabeled, rồi cho thấy thứ hạng mô hình đổi bao nhiêu.
**RBBN: R5.** Page **#55** hỏi đúng câu này ở góc dược cảnh giác.

**#14 · EA + học sâu sinh heuristic · phân bổ tài nguyên động trong SDN**
`diff 5` · `risk thap ⑥` · `compute tb` · `know cao`
Mô phỏng mạng + topology công khai.
⚠ **Ba nền nặng cùng lúc**: SDN, thuật toán tiến hoá, học sâu. Rubric `R2` xếp **hai** nền nặng cùng lúc đã là `CHẶN`.
⚠ Vòng lặp đánh giá: mỗi cá thể trong quần thể EA cần một lần chạy mô phỏng. Nhân với số thế hệ và số seed thì `compute: tb` khai báo là lạc quan.
**RBBN: R2**, sát nút R3.

**#15 · Test-Time Adaptation**
`diff 3` · `risk thap` · `compute tb` · `know tb`
Bộ benchmark nhiễu chuẩn hoá sẵn, mở, có baseline đã công bố để so. **Đường dữ liệu sạch nhất list.**
⚠ Mảng cực đông, và — quan trọng — **đã có phê phán rằng nhiều kết quả TTA không tái lập được khi đổi giao thức đánh giá** (kích thước lô, thứ tự mẫu, có reset trạng thái giữa các miền hay không).
**RBBN: V2**, và nó sửa được bằng cách chọn góc chứ không phải bằng tài nguyên: *"đo lại các phương pháp TTA dưới một giao thức thống nhất — thứ hạng còn giữ nguyên bao nhiêu?"* → `V2` dạng 1.
**Đề tài cân bằng nhất trong 39 cái**: dữ liệu sạch · compute vừa · nền vừa · có sẵn một góc đóng góp mạnh.

**#16 · Tích hợp đa omics · phân loại phân nhóm ung thư**
`diff 4` · `risk tb ②④` · `compute tb` · `know cao`
Dữ liệu tổng hợp mở; dữ liệu cấp bệnh nhân thô thì controlled access.
⚠ **Nhãn phân nhóm đến từ đâu?** Phân nhóm ung thư phần lớn do **chính một thuật toán phân cụm sinh ra** trong bài báo gốc. Huấn luyện mô hình dự đoán nhãn do phân cụm sinh ra là **vòng tròn** — bạn đang dự đoán đầu ra của một thuật toán khác, không phải một thực thể sinh học. Đây là rủi ro nặng nhất của đề tài và ít người nói ra.
⚠ Rò rỉ thực thể: cùng bệnh nhân nằm hai bên train/test qua nhiều lớp omics.
**RBBN: R5.** Page **#7** hỏi *"độ phức tạp có trả công không"* trên cùng nguồn — câu hỏi rẻ hơn và khó ra kết quả rỗng hơn.

**#17 · Phát hiện ví tiền mã hoá đồng sở hữu**
`diff 4` · `risk cao ④` · `compute tb–cao` · `know tb`
Dữ liệu on-chain **hoàn toàn mở, vô hạn, tải không giới hạn**. Truy cập bằng không rủi ro.
⚠ Và đúng vì thế nó là **ca sách giáo khoa của "dữ liệu vô hạn, nhãn bằng không"**. "Đồng sở hữu" không quan sát được. Ground truth thường lấy từ heuristic gộp địa chỉ, hoặc từ nhãn của dịch vụ phân tích thương mại. Huấn luyện trên nhãn heuristic → mô hình học lại chính heuristic đó (`F19`). Không có cách xác minh trên chuỗi.
**RBBN: R1 ④ → R5.** Cứu bằng cách đổi câu hỏi khỏi "phát hiện": *"các heuristic gộp địa chỉ hiện có đồng ý với nhau đến đâu, và bất đồng tập trung ở loại ví nào?"* — không cần ground truth, và ra một hiện vật dùng lại được (`V2` dạng 7).
**Đề tài mới nhất list** — không có sinh đôi trong page.

**#18 · Đa mô hình: ảnh học + mô bệnh học + gen học → đáp ứng liệu pháp ức chế**
`diff 5` · `risk cao ①` · `compute cao` · `know cao ×3`
⚠ Cần **cùng một bệnh nhân có đủ cả ba loại**. Ảnh học và mô bệnh học nằm ở hai kho khác nhau và **chỉ trùng một phần** danh sách bệnh nhân; dữ liệu đáp ứng liệu pháp ức chế phần lớn là dữ liệu thử nghiệm lâm sàng, không mở.
⚠ Rủi ro là **kiểu ①**: sau khi giao ba tập, cỡ mẫu có thể còn vài chục đến vài trăm. Ba modality + học sâu trên vài trăm mẫu là công thức của overfitting không cứu được bằng nỗ lực.
**RBBN: R1 ①.** Đây là đề tài **rủi ro cao nhất list**. Spike ngày 1 phải là một câu lệnh đếm: *bao nhiêu bệnh nhân có đủ ba loại?* Dưới ngưỡng thì đổi đề tài ngay, đừng đợi tháng thứ ba.

**#19 · Pipeline AutoML có khả năng mở rộng và tái hiện · big data**
`diff 3` · `risk thap` · `compute tb` · `know thap–tb`
Dữ liệu không phải ràng buộc — dùng gì cũng được.
⚠ **Đo cái gì?** "Mở rộng được" và "tái hiện được" là thuộc tính kỹ thuật, không phải giả thuyết kiểm định sai được. Không baseline (so với pipeline nào?), không metric.
**RBBN: R5/B3.** Cứu bằng cách chọn **một** thuộc tính và đo nó thật: *"cùng seed, cùng config, chạy lại trên cụm khác thì kết quả lệch bao nhiêu, và phần lệch đến từ đâu — thứ tự dữ liệu, phép cộng dấu phẩy động, hay lập lịch?"* Câu đó trả lời sai được, và nó là một luận văn.

**#20 · Hệ thống ngăn ngừa mất an ninh trật tự (căn cước + di biến động)**
`diff 4` · `risk cao ③④` · `compute tb` · `know thap`
⚠ Ngoài truy cập và công bố (kiểu ③), rủi ro nặng hơn là **nhãn**: "nguy cơ mất an ninh trật tự" được ghi nhận bởi chính lực lượng đang triển khai. Nơi tuần tra nhiều thì ghi nhận nhiều → mô hình học "chỗ nào đang được để mắt", rồi đề xuất để mắt thêm chỗ đó. Vòng lặp phản hồi này làm **mọi con số đánh giá lạc quan giả** — không phải một rủi ro trừu tượng, mà là một lỗi đo lường định lượng được.
**RBBN: R5 + B2.** Đo trung thực thì phải có một nguồn kết cục độc lập với nguồn sinh nhãn.

**#21 · RL + học ít mẫu + meta-learning · phân loại bệnh hiếm**
`diff 5` · `risk cao ①②` · `compute tb–cao` · `know cao`
⚠ **`F2` — ba họ phương pháp nối bằng "và"** → `B3 = THAT_BAI` theo đúng chữ của rubric (mục 3, `B3`: *"nếu phải dùng chữ 'và' nối ba bài toán thì blocker này ở `THAT_BAI`"*).
⚠ Và một mâu thuẫn dữ liệu ít ai để ý: học ít mẫu cần **một tập lớp nền lớn** để meta-huấn luyện. Bệnh hiếm theo định nghĩa không có cái đó. Dữ liệu lâm sàng bệnh hiếm gần như luôn controlled access.
**RBBN: B3**, rồi **R1**. Cứu: bỏ RL (nó không thuộc về đây), giữ few-shot/meta-learning, **chọn bộ dữ liệu trước khi chọn phương pháp**.

**#22 · Mô hình học sâu dự đoán tính chất phân tử**
`diff 3` · `risk thap` · `compute tb` · `know tb–cao`
Bộ chuẩn hoá, mở, tải là chạy.
⚠ **Kết quả đã biết trước ở mức đáng lo.** Mảng này đã có phê phán rằng mạng đồ thị không thắng vân tay phân tử + cây tăng cường một cách nhất quán khi hai bên được tune ngang tay, và rằng cách chia tập theo khung phân tử đảo hoàn toàn thứ hạng.
**RBBN: V2.** Page **#49** hỏi thẳng *"GNN có thật sự thắng fingerprint không"* trên cùng dữ liệu — cùng chi phí, có nội dung.

**#23 · EA + học chuyển giao · tấn công đối kháng vào hệ truyền thông tự mã hoá E2E**
`diff 4` · `risk thap ⑥` · `compute tb` · `know cao`
Kênh truyền tự sinh — **rủi ro dữ liệu thấp nhất list cùng #15**. Tái lập được 100%, không phụ thuộc ai, không chờ ai.
⚠ `R4`: nếu bộ môn không có ai làm truyền thông thì không ai đọc được phần vật lý — và phần vật lý là chỗ phản biện sẽ hỏi.
⚠ `V1` hẹp: ai dùng kết quả?
**RBBN: R2/R4.** **Đề tài gọn nhất về vận hành trong cả list** — đổi lại là phụ thuộc hoàn toàn vào việc có người đỡ đúng mảng.

**#24 · Học liên tục · phát hiện vật thể nhỏ và tương đồng**
`diff 4` · `risk thap` · `compute cao` · `know tb`
Bộ phát hiện vật thể mở, có sẵn bộ chuyên về vật thể nhỏ.
⚠ **Tốn GPU nhất list cùng #34.** Phát hiện vật thể × học liên tục = huấn luyện lại theo chuỗi nhiệm vụ × nhiều thứ tự nhiệm vụ × nhiều seed. Một chuỗi 10 nhiệm vụ không chạy nổi trên laptop + Colab free.
**RBBN: R3.** Thu hẹp có đường rõ: ít nhiệm vụ hơn, ảnh nhỏ hơn, backbone đóng băng — nhưng phải ghi vào `d.risk` trước, không phải phát hiện ra ở tuần thứ 10.

**#25 · Phân tích chu trình giao dịch phát hiện gian lận ngân hàng**
`diff 4` · `risk cao ③④` · `compute tb` · `know tb`
Hai đường rất khác nhau. **Nội bộ ngân hàng**: truy cập ổn, công bố khó. **Mở/tổng hợp**: có bộ giao dịch có nhãn và bộ tổng hợp — nhưng với dữ liệu tổng hợp thì "chu trình" là do chính bộ sinh tạo ra, phát hiện được không chứng minh điều gì về thế giới thật.
⚠ Nhãn gian lận **cực hiếm và trễ** — một vụ được xác nhận nhiều tháng sau khi xảy ra. Chia tập theo thời gian là bắt buộc; chia ngẫu nhiên là rò rỉ và sẽ cho điểm đẹp giả.
**RBBN: R1**, sát R5. Page **#25** (chọn ngưỡng theo lý thuyết quyết định) và **#42** (chặn lừa đảo khi đội điều tra chỉ xử lý được N vụ/ngày) là hai bản đã né được cả hai bẫy này.

**#26 · Khai thác dữ liệu dân cư đánh giá nguy cơ tội phạm trẻ vị thành niên**
`diff 4` · `risk cao ③④` · `compute thap` · `know tb`
⚠ Cùng vòng lặp phản hồi như #20, cộng đối tượng là nhóm được bảo vệ đặc biệt. Nhãn "nguy cơ" gần như chắc chắn là **proxy** (đã từng tiếp xúc với hệ thống) chứ không phải kết cục — và proxy đó tương quan với chính cường độ giám sát.
⚠ Chi phí sai âm và sai dương ở đây không đối xứng và không quy về một con số được, nên chọn ngưỡng không phải bài toán kỹ thuật.
**RBBN: B2 + R5.** Ghi chú: mục này **không có tên tiếng Anh** trong danh sách — có thể chưa chốt.

**#27 · Tăng cường LLM bằng lời nhắc sinh từ đồ thị tri thức**
`diff 4` · `risk tb` · `compute tb` · `know tb`
Đồ thị tri thức mở + bộ hỏi đáp có sẵn.
⚠ **Rò rỉ tiền huấn luyện** — mục trong danh sách rò rỉ của `R5`: *"tập test đã nằm trong corpus tiền huấn luyện của mô hình nền"*. Các bộ hỏi đáp trên đồ thị tri thức đều cũ và gần như chắc chắn nằm trong corpus của mọi LLM hiện tại. Không kiểm soát thì "KG giúp tăng X%" có thể chỉ là mô hình nhớ đáp án.
**RBBN: R5.** Cứu, và cứu rất mạnh: dựng tập câu hỏi **mới** — tiếng Việt, hoặc từ dữ liệu sau thời điểm cắt của mô hình. Khi đó vừa tránh rò rỉ vừa được `V2` dạng 5.

**#28 · Nghiên cứu hệ thống RAG trên miền dữ liệu tiếng Việt**
`diff 3` · `risk tb ⑤` · `compute tb` · `know thap`
Văn bản tiếng Việt có sẵn, nhưng **không có bộ đánh giá RAG tiếng Việt chuẩn** → phải tự dựng tập câu hỏi + đáp án tham chiếu. Đó là công gán nhãn thật, tính bằng tuần.
⚠ Chưa có câu hỏi. "Nghiên cứu hệ thống RAG" mô tả một việc, không mô tả một giả thuyết.
⚠ Ba bạn trong lớp cùng cụm KG/RAG/LLM (#27 #28 #29).
**RBBN: B3.** Page có ba bản đã có câu hỏi: **#32** (tầng truy hồi mới là chỗ hỏng) · **#43** (RAG biết nói "tôi không chắc") · **#91** (Pareto độ trễ–chi phí–chất lượng).

**#29 · Hệ thống hỏi đáp văn bản hành chính dựa trên đồ thị tri thức**
`diff 4` · `risk cao ⑤` · `compute tb` · `know thap`
Văn bản pháp quy công khai — nhưng **đồ thị tri thức phải tự dựng**, và đây là chi phí bị đánh giá thấp nhất trong cả list. Dựng KG cho văn bản hành chính là công **chuyên môn**, không phải công kỹ thuật: phải quyết định thực thể là gì, quan hệ là gì, và ai xác nhận là đúng.
⚠ `R3`: nếu hai tháng đầu dùng để dựng KG thì không còn thời gian cho phần thực nghiệm.
⚠ `R5`: baseline bắt buộc là **RAG không có KG**. Nếu KG không thắng RAG thuần thì toàn bộ chi phí dựng KG là vô nghĩa — và đó là kết quả rất có thể xảy ra.
**RBBN: R3.**

**#30 · GA dựa trên học tăng cường · chuyển giao tính toán trong MEC hỗ trợ UAV**
`diff 4` · `risk thap ⑥` · `compute tb` · `know cao`
Mô phỏng hoàn toàn.
⚠ Rủi ro kiểu ⑥ ở dạng thuần nhất: **mô hình mô phỏng là một tập giả thiết, không phải dữ liệu.** Kết luận chỉ đúng trong mô hình kênh, mô hình năng lượng UAV, và mô hình tải mà bạn chọn. Phải quét **tham số môi trường**, không chỉ tham số thuật toán — nếu không, đề tài chứng minh một điều về code của chính mình.
**RBBN: R2/R4** (nền truyền thông + MEC).

**#31 · Thu nhận và đánh giá chất lượng ảnh mống mắt**
`diff 3` · `risk tb ②③` · `compute thap` · `know tb`
Có bộ mống mắt mở (một số phải ký thoả thuận sử dụng), cộng dữ liệu nội bộ nếu trong ngành.
✔ **Điểm mạnh ít ai thấy: mảng này có chuẩn quốc tế về chất lượng ảnh mống mắt** — nghĩa là có sẵn định nghĩa metric và có sẵn baseline. Đo được chặt hơn nhiều so với vẻ ngoài của cái tên.
⚠ Nếu "thu nhận" nghĩa là dựng thiết bị thu ảnh thì đó là `F4` (nghiên cứu + hệ thống trong một luận văn). Nếu chỉ là đánh giá chất lượng thì rất gọn.
**RBBN: B3** — chốt "thu nhận" hay "đánh giá", đừng cả hai.

**#32 · Thuật toán tiến hoá · phân bổ tài nguyên trong massive MIMO**
`diff 4` · `risk thap ⑥` · `compute tb` · `know cao`
Mô phỏng.
⚠ `V2`: phân bổ tài nguyên bằng EA trong MIMO đã rất đông, và các phương pháp quy hoạch lồi/xấp xỉ là baseline mạnh — EA thường thua về **thời gian chạy**, mà thời gian chạy là thứ quan trọng trong bài toán này.
**RBBN: R2/R4.**

**#33 · Phân tích dữ liệu: kỹ thuật và ứng dụng trong lĩnh vực dầu khí**
`diff ?` · `risk ? ③` · `compute ?` · `know tb`
⚠ **Mơ hồ nhất list.** "Kỹ thuật và ứng dụng" không phải câu hỏi, không nêu dữ liệu, không nêu bài toán. Không chấm được `diff`/`compute`/`risk` vì không biết đề tài định làm gì.
**RBBN: B3 = THAT_BAI.** Chưa phải một đề tài — mới là một lĩnh vực.

**#34 · Cải thiện bộ tách từ âm thanh (speech tokenizer) cho nhận diện giọng nói**
`diff 4` · `risk thap` · `compute cao` · `know tb–cao`
Bộ tiếng nói mở, lớn, tải được.
⚠ **Tốn GPU nhất list cùng #24.** Huấn luyện bộ mã hoá rời rạc rồi **huấn luyện lại hệ nhận dạng** để đo tác động, nhân với số cấu hình. Không chạy được trên tầng miễn phí.
⚠ Nếu thu hẹp bằng cách đóng băng hệ nhận dạng và chỉ đo chất lượng tái tạo thì cụm "cho bài toán nhận diện giọng nói" trong tên đề tài mất nghĩa — thu hẹp ở đây **đổi câu hỏi**, không chỉ đổi quy mô.
**RBBN: R3.**

**#35 · Mô hình học sâu tiên tiến cho phân đoạn tín hiệu điện não**
`diff 4` · `risk tb ④` · `compute tb` · `know tb`
Có kho EEG mở lớn, một số cần đăng ký nhẹ.
⚠ **Rò rỉ theo bệnh nhân** — lỗi kinh điển của EEG và nó thổi điểm rất mạnh. Cùng một người nằm hai bên train/test là mục nằm thẳng trong danh sách rò rỉ của `R5`. Phải chia theo người, và phải nói rõ lý do.
⚠ **Trần hiệu năng là mức đồng thuận giữa hai chuyên gia**, không phải 100%. Nhãn phân đoạn EEG do người gán và hai người không đồng ý với nhau. Rất nhiều bài không báo cáo con số đó, nên "đạt 92%" không đọc được.
**RBBN: R5.** Và chính hai chỗ đó là đóng góp: làm đúng chia tập theo người + báo cáo trần đồng thuận thì tự nó là `V2` dạng 1.

**#36 · Dùng LLM sinh heuristic cho bài toán giao nhận động**
`diff 4` · `risk thap ⑥` · `compute tb` · `know tb–cao`
Instance chuẩn + mô phỏng. Chi phí API là chi phí thật và phải tính vào ngân sách.
⚠ `V2`: mảng mới nhưng **đã có công trình nền rất mạnh và rất được biết**. `B8` bắt buộc chạy trước khi cam kết — đây là ca `B8` rẻ nhất và cần nhất trong list.
⚠ `R5`: heuristic sinh ra có **tổng quát hoá** không? Page **#192** hỏi đúng câu đó. Không có bộ instance thứ hai thì kết luận vô giá trị.
**RBBN: V2.**

**#37 · Mô hình ngôn ngữ thị giác đa phương thức trong bệnh viện thông minh**
`diff 5` · `risk cao ③` · `compute cao` · `know cao`
⚠ "Bệnh viện thông minh" không phải bài toán. Cộng dữ liệu lâm sàng + ảnh y tế đều gated, cộng compute của mô hình thị giác–ngôn ngữ.
**RBBN: B3**, rồi R1, rồi R3 — ba trục cùng đỏ. Cùng #9 và #33, chưa thành hình.

**#38 · Ứng dụng phân tích dữ liệu trong tối ưu lịch giảng dạy và phân công phòng học**
`diff 3` · `risk thap ③(nhẹ)` · `compute thap` · `know tb`
✔ **Đường dữ liệu dễ nhất trong mọi đường nội bộ**: dữ liệu của chính trường mình, và phòng đào tạo là bên hưởng lợi trực tiếp nên có động cơ đưa. `B7` (vấn đề có thật) vượt gần như tự động — người sẽ dùng kết quả ngồi cùng toà nhà.
⚠ `V2`: xếp lịch đại học đã được nghiên cứu bốn thập kỷ, có benchmark quốc tế và có solver thương mại. Đóng góp **phải** nằm ở ràng buộc đặc thù của trường, không ở thuật toán. Nếu viết là "áp dụng thuật toán X" thì `V2 = YEU`.
**RBBN: V2.** **Rủi ro vận hành thấp nhất list cùng #10.**

**#39 · Tối ưu hoá hiệu quả suy luận trong các mô hình ngôn ngữ**
`diff 4` · `risk thap` · `compute tb–cao` · `know tb`
Bộ đánh giá suy luận mở + mô hình mở.
⚠ **Quá rộng.** "Hiệu quả suy luận" gồm ít nhất năm thứ khác nhau: cắt ngắn chuỗi suy luận, thoát sớm, giải mã suy đoán, định tuyến giữa mô hình, lượng tử hoá. Phải chọn một, không thì không có baseline.
⚠ Các bộ đánh giá toán/suy luận phổ biến đã nhiễm nặng vào tiền huấn luyện.
**RBBN: B3.** Page có ba lát cắt cụ thể của đúng đề tài này: **#46** (định tuyến rẻ/đắt có bảo đảm chất lượng) · **#91** (Pareto độ trễ–chi phí–chất lượng) · **#93** (tỉ lệ hoàn thành sụp theo số bước).

---

## 3. Phân bố — lớp (39) vs page (193)

Con số của page sinh bằng `node calibrate.js`; con số của lớp là kết quả chấm ở mục 2.

| `risk` (dữ liệu) | Lớp | Page |
|---|---|---|
| `thap` | 19 — 49% | 125 — **65%** |
| `tb` | 9 — 23% | 67 — 35% |
| `cao` | **10 — 26%** | **1 — 0,5%** |
| không xác định | 1 | 0 |

| `diff` | Lớp | Page |
|---|---|---|
| `3` (sàn) | 12 — 32% | 84 — 44% |
| `4` | 21 — 55% | 108 — 56% |
| `5` | **5 — 13%** | **1 — 0,5%** |

| `compute` | Lớp | Page |
|---|---|---|
| `thap` | 8 — 21% | 55 — 28% |
| `tb` | 23 — 59% | 131 — 68% |
| `cao` | **7 — 18%** | **7 — 3,6%** |

| `know` | Lớp | Page |
|---|---|---|
| `thap` | 8 — 21% | 40 — 21% |
| `tb` | 20 — 51% | 124 — 64% |
| `cao` | **11 — 28%** | 29 — 15% |

**Đọc bốn bảng này thành một câu:** đề tài của lớp **khó hơn và rủi ro hơn** đề tài trong page ở mọi trục — `risk: cao` gấp **52 lần**, `diff: 5` gấp **26 lần**, `compute: cao` gấp **5 lần**, `know: cao` gấp gần **2 lần**.

Nhưng đừng đọc đó là "lớp giỏi hơn" hay "page nhát hơn". Nó là hệ quả của **quy trình**, và quy trình giải thích trọn vẹn con số:

- Page đã qua **ba lượt loại** (14 đề tài bị gỡ, `risk: cao` từ 23 ca xuống còn 1). Danh sách lớp **chưa qua lượt nào** — nó là đầu vào thô, không phải đầu ra đã lọc.
- Nói cách khác: **bạn đang so một danh sách đã lọc với một danh sách chưa lọc.** Con số đúng để rút ra không phải "page an toàn hơn" mà là: **`risk: cao` và `diff: 5` vẫn được bộ môn duyệt.** Bộ lọc của bạn khắt khe hơn bộ lọc thật, đúng như kết luận của [`classmate-topics-review`](classmate-topics-review-2026-08-09.md) mục 4.1.

---

## 4. Ràng buộc bó nhất — phân bố, và đây là chỗ đáng ngạc nhiên nhất

| Ràng buộc bó nhất | Số đề tài | % |
|---|---|---|
| **R5** — thiết kế đo lường | **10** | **26%** |
| **B3** — chưa viết được thành câu hỏi | **8** | **21%** |
| **V2** — đóng góp | 6 | 15% |
| **R1** — dữ liệu | 5 | 13% |
| **R3** — thời gian / compute | 5 | 13% |
| **R2 / R4** — nền phải học / người đỡ | 4 | 10% |
| **5d** — quá nhỏ | 1 | 2% |

**Gần một nửa (47%) đề tài của lớp bị bó ở `R5` hoặc `B3` — hai chỗ sửa được bằng một cây bút.**

Không phải thiếu dữ liệu, không phải thiếu GPU, không phải thiếu thời gian. Là: chưa viết được câu hỏi, hoặc chưa nghĩ ra cách đo cho tử tế. Cả hai đều miễn phí để sửa và cả hai đều phải sửa **trước** khi tiêu một giờ nào.

Và đó là chỗ page mạnh nhất một cách có hệ thống: mọi đề tài trong page đều có `d.method` nêu baseline + metric + cách chia tập, và 81% tên đề tài đã là một câu hỏi. **Page giải sẵn đúng hai ràng buộc bó nhất của gần nửa lớp.**

Đối xứng của nó cũng đúng và phải nói ra: `R1` bó 13% đề tài lớp nhưng lại là trục page dựng cả tầng blocker `B1`/`B2` quanh nó. Page tối ưu quá tay cho một trục mà thực tế ít khi là chỗ chết — vì 21% lớp đã xoá nó bằng mô phỏng và 15–21% xoá nó bằng dữ liệu nội bộ.

---

## 5. Xếp hạng

**Năm đề tài an toàn nhất về vận hành** — dữ liệu sạch, compute vừa, không phụ thuộc ai:
`#15` Test-Time Adaptation · `#10` diễn giải GNN · `#38` lịch giảng dạy · `#23` tấn công autoencoder truyền thông · `#6` phân cụm công bằng

**Năm đề tài rủi ro cao nhất** — và mỗi cái hỏng theo một kiểu khác nhau:

| | Đề tài | Kiểu hỏng | Phép thử ngày 1 |
|---|---|---|---|
| 1 | `#18` đa mô hình y tế | ① cỡ mẫu sau khi giao ba tập | Đếm bệnh nhân có đủ ba loại |
| 2 | `#21` bệnh hiếm | `B3` ba phương pháp + ① ít mẫu | Viết một câu hỏi duy nhất; nếu cần "và" thì cắt |
| 3 | `#17` ví crypto đồng sở hữu | ④ nhãn không tồn tại | Nhãn của bạn đến từ đâu, và ai xác nhận? |
| 4 | `#4` phân tích lớp học | ③ duyệt đạo đức + mâu thuẫn nội tại | Ai ký? Chờ bao lâu? |
| 5 | `#29` QA hành chính bằng KG | ⑤ công dựng KG nuốt lịch | Dựng KG cho 20 văn bản, bấm giờ, nhân lên |

**Ba mục chưa phải đề tài** (`B3 = THAT_BAI`): `#9` khai thác tri thức y sinh · `#33` dữ liệu dầu khí · `#37` VLM bệnh viện thông minh. Cả ba đều nêu một lĩnh vực chứ không nêu một bài toán.

---

## 6. Đọc ngược về page — bốn việc

1. **Tách trường `risk` thành hai.** Sáu kiểu ở mục 1a không quy về một trục được. Tối thiểu: tách `risk_truy_cap` (①②③) khỏi `risk_nhan` (④). Ca `#17` cho thấy rõ vì sao — nó sẽ được `risk: thap` theo schema hiện tại trong khi nó là một trong những đề tài rủi ro nhất list.
2. **Đặt tên cho kiểu ⑥ và bổ sung đề tài dạng đó.** Page có ~3,6% đề tài dữ liệu mô phỏng, lớp có 21%. Đó là một nước đi hợp lệ mà page gần như bỏ trống, và nó xoá sạch trục `R1` — trục page sợ nhất.
3. **Rà lại ý nghĩa của 35 ca `CHẶN`.** Lớp có 26% `risk: cao` và 13% `diff: 5` được duyệt bình thường. Nhãn `CHẶN` của page nên đọc là "đắt", và mỗi ca cần một dòng *"đắt ở chỗ nào, và bản thu hẹp nào rẻ hơn"* thay vì bị gỡ khỏi danh sách.
4. **Giữ nguyên thế mạnh.** Đừng đổi khuôn câu-hỏi-làm-tên và đừng bỏ `d.method` có baseline + metric + chia tập. Đó chính là hai thứ bó chân 47% của lớp, và page đã giải sẵn.

---

## 7. Việc lượt này không làm

- **Không tra `B8` cho đề tài nào.** Mọi câu "mảng này đã đông" là `CHƯA KIỂM` — suy từ hiểu biết chung, không từ ba truy vấn + mười abstract như thủ tục 5b yêu cầu.
- **Không mở bộ dữ liệu nào.** Cả sáu kiểu rủi ro ở mục 1a là suy luận từ bản chất bài toán, không từ trang tải về hay điều khoản license.
- **Không chấm `V1`, `V3`, `R6`.** Cần `impact.*`, cần `d.spike` — tên đề tài không chứa.
- **`R4` chỉ đoán được cho cụm tối ưu/tiến hoá.** 8 đề tài cùng họ phương pháp là dấu vết một cụm giảng viên, nhưng đó là suy luận từ phân bố. Một câu hỏi ở bộ môn xác nhận hoặc bác bỏ nó trong 5 phút — và đó vẫn là việc đáng làm đầu tiên.
