# Đề tài học viên cùng lớp đăng ký — danh sách gốc + đánh giá

`as_of: 2026-08-09` · 39 đề tài · nguồn: danh sách tên đề tài chính thức lớp đăng ký

Đây là **danh sách gốc để tra**, kèm một lượt đánh giá nhanh. Hai file phân tích sâu hơn:
- [`classmate-topics-review-2026-08-09.md`](classmate-topics-review-2026-08-09.md) — đối chiếu với 193 đề tài trong page, hiệu chuẩn "thế nào là đủ"
- [`classmate-topics-scorecard-2026-08-09.md`](classmate-topics-scorecard-2026-08-09.md) — chấm từng đề tài theo `thesis-topic-rubric.md`

**Nhãn bằng chứng cho toàn bộ phần đánh giá: `CHƯA KIỂM`.** Đánh giá suy từ **tên đề tài** — không có câu hỏi nghiên cứu, không có nguồn dữ liệu, không có phương pháp của từng đề tài. Không bộ dữ liệu nào được mở, không công trình nào được tra. Đây là giả thuyết để đi hỏi, không phải kết luận.

---

## 1. Đánh giá — ba câu, ba câu trả lời

**Dữ liệu dễ hay khó lấy?** → **Dễ. Áp đảo.** 25/39 (64%) chọn đề tài mà **chính họ** lấy dữ liệu dễ. Chỉ 3 người nhận đề tài dữ liệu thật sự khó.

**Đóng góp nhiều không?** → **Không.** 8/39 gần như không có. ~20 ở mức vừa. ~11 có tiềm năng khá trở lên. Không ai tối ưu cho đóng góp.

**Dễ làm không?** → **Không.** Chỉ 4 đề tài dễ làm. 12 khó, 6 rất khó.

> **Họ tối ưu cho "chắc chắn có dữ liệu", chấp nhận việc khó làm, và bỏ qua đóng góp.**

### Ba đường lấy dữ liệu dễ mà họ dùng

| Đường | Số người | Cách |
|---|---|---|
| **Tự sinh (mô phỏng)** | 8 | Robot kho · đèn giao thông · SDN · MIMO · UAV-MEC · autoencoder · territory · giao nhận. Không xin ai, không chờ ai |
| **Dữ liệu ngành đang giữ** | 6–7 | Dân cư/căn cước ×4 · ngân hàng · dầu khí · lịch trường mình |
| **Benchmark mở chuẩn hoá** | ~11 | CIFAR · COCO · TCGA · LibriSpeech · M5 — tải là chạy |

Chỉ **3 người** nhận đề tài mà dữ liệu có thể đơn giản là không đủ: #18, #21, #37 — và cả ba là những đề tài tham vọng nhất list.

### Cái tam giác — không ai có cả ba

- **Dữ liệu dễ + làm dễ → đóng góp gần bằng 0.** #2 #3 #7 #12 #19. Nhóm "chắc chắn tốt nghiệp".
- **Dữ liệu dễ + đóng góp khá → làm rất khó.** #8 #14 #23 #30 #34. Toàn nhóm mô phỏng/tối ưu: dữ liệu miễn phí, trả bằng RL nhiều seed, ba nền phải học, hoặc GPU.
- **Làm dễ + đóng góp khá → dữ liệu khó.** Gần như không có ai. Gần nhất là #17: dữ liệu vô hạn nhưng nhãn không tồn tại.

**Ô hiếm nhất — dữ liệu dễ + làm vừa + đóng góp khá:** chỉ **#15**, **#13**, **#6**, **#35**. Bốn cái, 10% của lớp.

### Có phải nghiên cứu không?

| | Số đề tài | |
|---|---|---|
| **Là nghiên cứu thật** | **~27 / 39** | Đáp án chưa biết trước, có baseline để so, kết quả có thể ra ngược |
| **Là công cụ / hệ thống** | ~9 | Xây một thứ dùng được. Không có giả thuyết nào sai được |
| **Chưa rõ** | 3 | #9 #33 #37 — mới nêu lĩnh vực |

Nhóm **không phải nghiên cứu**: #3 #12 #19 #20 #29 #28 #38 #26, và #2 sát biên. **Cả 9 cái đều được duyệt** — đó mới là dữ kiện đáng chú ý.

**Khuôn chung của 27 đề tài nghiên cứu:** lấy một họ phương pháp đã có → áp vào một bài toán cụ thể → so với baseline → báo cáo thắng ở đâu, thua ở đâu. Không cái nào đề xuất thuật toán mới. Đóng góp nhỏ **không** có nghĩa là không nghiên cứu — nó là nghiên cứu ở đúng bậc thạc sĩ.

**Sáu cái nặng nghiên cứu nhất:** #8 · #14 · #34 · #23 · #36 · #17. Năm trong sáu nằm trong cụm tối ưu/tiến hoá — cụm vừa đông nhất vừa nặng nhất. Không ai tự chọn đề tài nặng vậy mà không có người đỡ.

---

## 2. Bảng chấm nhanh

| # | Đề tài | Lấy dữ liệu | Làm | Đóng góp | Vì sao họ chọn |
|---|---|---|---|---|---|
| 1 | PRS phân tầng nguy cơ | **Khó** — xin biobank, chờ hàng tháng | Khó | Vừa | Hướng thầy tin sinh |
| 2 | So sánh ARIMA/Prophet/LSTM | **Dễ** — Kaggle, tải là chạy | **Dễ** | **Ít** | Chắc chắn xong |
| 3 | Trực quan dân cư | **Dễ với họ** / bất khả với người ngoài | **Dễ** | **Ít** | Có dữ liệu độc quyền |
| 4 | Lớp học · edge · riêng tư | **Khó** — tự quay + xin duyệt | Khó | Vừa | Nghe thời sự |
| 5 | Robot kho A*/RRT + ML | **Dễ** — mô phỏng | Vừa | Vừa | Mô phỏng nên khỏi lo dữ liệu |
| 6 | Phân cụm công bằng tín dụng | **Dễ** — bộ mở | Vừa | **Khá** | Bài toán gọn, đo được |
| 7 | Label smoothing | **Dễ** — CIFAR | **Dễ** | **Ít** | Chắc chắn xong |
| 8 | DRL + ALNS territory | **Dễ** — tự sinh | **Rất khó** | **Khá** | Cụm thầy tối ưu |
| 9 | KG y sinh → phân loại | Vừa | Khó | **?** | Hướng thầy, chưa chốt |
| 10 | Diễn giải GNN | **Dễ** — benchmark có sẵn đáp án | Vừa | Vừa | Rẻ, chạy laptop |
| 11 | RL đèn giao thông | **Dễ** — mô phỏng | Khó — tốn GPU | Vừa | Mô phỏng + nghe hay |
| 12 | Truy vết đối tượng | **Dễ với họ** / bất khả ngoài | **Dễ** | **Ít** | Dữ liệu độc quyền |
| 13 | Tác dụng phụ thuốc | **Dễ** — bộ mở | Vừa | **Khá** | Dữ liệu mở + y sinh |
| 14 | EA + DL cho SDN | **Dễ** — mô phỏng | **Rất khó** — 3 nền | **Khá** | Cụm thầy tối ưu |
| 15 | Test-Time Adaptation | **Dễ nhất list** | Vừa | **Khá** | Benchmark chuẩn sẵn |
| 16 | Đa omics ung thư | Vừa — TCGA | Khó | Vừa | Dữ liệu mở + tin sinh |
| 17 | Ví crypto đồng sở hữu | **Dễ lấy nhưng không có nhãn** → thực chất khó | Vừa | **Cao** — mới | Dữ liệu vô hạn + đề tài mới |
| 18 | Đa mô hình y tế 3 lớp | **Rất khó** — cỡ mẫu có thể không đủ | **Rất khó** | Cao nếu làm được | Tham vọng |
| 19 | Pipeline AutoML | **Dễ** — dùng gì cũng được | Vừa | **Ít** | Hợp nghề kỹ sư |
| 20 | Ngăn ngừa mất ANTT | **Dễ với họ** / bất khả ngoài | Vừa | Vừa | Dữ liệu độc quyền |
| 21 | RL + few-shot + meta · bệnh hiếm | **Rất khó** | **Rất khó** | Vừa | Nghe hay, chưa siết |
| 22 | Tính chất phân tử | **Dễ** — bộ chuẩn hoá | Vừa | **Ít** — kết quả đã biết | Dữ liệu mở |
| 23 | Tấn công autoencoder | **Dễ** — tự sinh kênh | Khó — nền truyền thông | **Khá** | Thầy mảng truyền thông |
| 24 | Continual detection | **Dễ** — COCO | Khó — tốn GPU | Vừa | Mảng chuẩn |
| 25 | Chu trình giao dịch gian lận | Vừa–Khó — tuỳ ngân hàng hay bộ mở | Vừa | Vừa | Có thể làm ngân hàng |
| 26 | Nguy cơ tội phạm vị thành niên | **Dễ với họ** / bất khả ngoài | Vừa | Vừa | Dữ liệu độc quyền |
| 27 | KG prompting LLM | **Dễ** | Vừa | Vừa | LLM đang nóng |
| 28 | RAG tiếng Việt | Vừa — phải tự dựng bộ đánh giá | Vừa | **Ít** | LLM nóng + góc tiếng Việt |
| 29 | QA hành chính bằng KG | **Khó** — phải tự dựng KG | Khó | Vừa | LLM nóng + ứng dụng rõ |
| 30 | RL + GA cho UAV-MEC | **Dễ** — mô phỏng | Khó | **Khá** | Cụm thầy tối ưu |
| 31 | Chất lượng ảnh mống mắt | Vừa | Vừa | Vừa | Dữ liệu ngành + có chuẩn đo |
| 32 | EA cho massive MIMO | **Dễ** — mô phỏng | Khó | Vừa | Cụm thầy tối ưu |
| 33 | Dữ liệu dầu khí | **?** — chưa nói dùng gì | ? | ? | Có thể làm trong ngành |
| 34 | Speech tokenizer | **Dễ** — LibriSpeech | **Rất khó** — tốn GPU nhất | **Khá** | Mảng nghiên cứu thật |
| 35 | Phân đoạn EEG | Vừa | Vừa | **Khá** | Dữ liệu mở + y sinh |
| 36 | LLM sinh heuristic giao nhận | **Dễ** | Vừa–Khó | Vừa | Cụm thầy tối ưu + LLM nóng |
| 37 | VLM bệnh viện thông minh | **Rất khó** | **Rất khó** | ? | Nghe thời sự |
| 38 | Lịch giảng dạy | **Dễ** — của chính trường | Vừa | **Ít** | Dữ liệu trong tầm tay |
| 39 | Hiệu quả suy luận LLM | **Dễ** | Vừa–Khó | **Khá** | LLM nóng |

---

## 3. Câu chưa trả lời — và nó quyết định nhiều nhất

Rubric có ô **"Yêu cầu của trường"** (*cho phép luận văn ứng dụng, hay bắt buộc có đóng góp mới*). Ô đó **chưa được điền** trong cả hai lượt chấm, dù chính rubric ghi nó là bắt buộc và verdict phải tiêu thụ nó.

- **Nếu trường cho phép luận văn ứng dụng** → 9 đề tài công cụ của lớp là hợp lệ, và cụm #39/#40/#103 (dữ liệu POS công ty) trong page cũng hợp lệ. Đang tự bắt mình khó hơn cần.
- **Nếu trường bắt buộc đóng góp mới** → 9 cái đó sẽ vất vả ở hội đồng, và phải chọn từ nhóm 27.

Page hiện là **100% khuôn nghiên cứu** — 193/193, không có cái nào là công cụ.

**Ba câu hỏi mang đi hỏi bộ môn, xếp theo giá trị:**
1. Luận văn dạng **xây hệ thống** có được không, hay bắt buộc có đóng góp phương pháp?
2. **Ai đỡ mảng tối ưu tổ hợp / tiến hoá?** — 8/39 lớp đăng ký ở đó, page chỉ có 3 đề tài
3. Có danh mục đề tài **kèm tên giảng viên hướng dẫn** không?

---

## 4. Danh sách gốc — 39 đề tài

Chép nguyên văn, giữ cả tên tiếng Anh khi có. Đánh số theo thứ tự trong danh sách gốc — dùng số này để tra ngược lên hai bảng trên.

| # | Tên tiếng Việt | Tên tiếng Anh |
|---|---|---|
| 1 | Mô hình phân tầng nguy cơ bệnh đa gen dựa trên Polygenic Risk Scores | A Polygenic Risk Stratification Model Based on Polygenic Risk Scores |
| 2 | So sánh ARIMA, Prophet và LSTM trong dự báo nhu cầu tiêu dùng ngành bán lẻ | Comparison of ARIMA, Prophet, and LSTM in Forecasting Retail Consumer Demand |
| 3 | Trực quan hoá dữ liệu dân cư phục vụ mục tiêu thống kê dân số | Visualizing population data to support population statistics objectives |
| 4 | Hệ thống Phân tích Mức độ Tập trung của Lớp học Đảm bảo Quyền riêng tư sử dụng Điện toán Biên và Mô hình Học sâu Hạng nhẹ | Privacy-First Classroom Engagement Analysis System via Edge Computing and Lightweight Deep Learning Models |
| 5 | Tối ưu hóa Lập kế hoạch Quỹ đạo của Robot Kho hàng (Warehouse Robot) bằng cách kết hợp Thuật toán Tìm kiếm (A*/RRT) và Học máy để Dự đoán và Tránh tắc nghẽn (Congestion Avoidance) | Optimizing Warehouse Robot Path Planning by Combining Search Algorithms (A*/RRT) and Machine Learning for Congestion Prediction and Avoidance |
| 6 | Phân cụm công bằng trong bài toán xếp hạng tín dụng | Fair clustering methods for credit scoring problems |
| 7 | Nghiên cứu ứng dụng kỹ thuật Label smoothing vào bài toán phân loại ảnh | A Study on the Application of Label Smoothing Techniques in Image Classification |
| 8 | Nghiên cứu tích hợp học sâu tăng cường và ALNS giải quyết bài toán phân hoạch vùng hoạt động | Research on integrating Deep Reinforcement Learning with Adaptive Large Neighborhood Search (ALNS) to solve the territory problem |
| 9 | Khai thác cơ sở tri thức y sinh để phát triển mô hình dự đoán phân loại | Exploiting the Biomedical Knowledge to Develop Predictive Models for Classification |
| 10 | Một số phương pháp diễn giải mô hình mạng thần kinh đồ thị | Methods on explaining Graph Neural Networks |
| 11 | Ứng dụng học tăng cường trong điều khiển tín hiệu giao thông | Adaptive Traffic Signal Control Using Reinforcement Learning |
| 12 | Công cụ trực quan hoá truy vết đối tượng dựa trên dữ liệu di biến động cư trú và dữ liệu căn cước | Exploiting visualization tools based on mobility and identity data to track people's movements |
| 13 | Nghiên cứu ứng dụng học sâu trong dự đoán tác dụng phụ của thuốc | Research on the application of deep learning in predicting drug side effects |
| 14 | Thiết kế heuristic tự động dựa trên thuật toán tiến hóa và phương pháp học sâu giải bài toán phân bổ tài nguyên động trong mạng định nghĩa phần mềm | Automated Heuristic Design for Dynamic Resource Allocation in Software-Defined Networks Using Evolutionary Algorithms and Deep Learning |
| 15 | Một số phương pháp cho bài toán điều chỉnh model trong thời gian thử nghiệm của mô hình | Test-Time Adaptation |
| 16 | Tích hợp dữ liệu đa omics để phân loại phân nhóm ung thư | Multi-omics integration for Cancer Subtyping |
| 17 | Phát hiện ví tiền mã hóa đồng sở hữu trên các mạng blockchain | Detecting co-owned crypto wallets on blockchain networks |
| 18 | Nghiên cứu tích hợp đa mô hình giữa hình ảnh học, mô bệnh học và gen học trong dự đoán đáp ứng với liệu pháp ức chế trong y tế | Multimodal Integration of Radiology, Pathology, and Genomics for Predicting Response to Inhibitor Therapies in Healthcare |
| 19 | Thiết kế Pipeline Học Máy Tự Động có Khả năng Mở Rộng và Tái Hiện trong Môi trường Dữ liệu Lớn | Designing a Scalable and Reproducible Data Pipeline for Automated Machine Learning in Big Data Environments |
| 20 | Phát triển hệ thống ngăn ngừa mất an ninh trật tự sử dụng dữ liệu căn cước và di biến động cư trú | Developing a support system based on mobility and identity data for preventing threats to public security |
| 21 | Nghiên cứu các phương pháp học tăng cường, học ít mẫu và meta-learning cho bài toán phân loại bệnh hiếm gặp trong lĩnh vực y học | A Study on Reinforcement Learning, Few-Shot Learning, and Meta-Learning Approaches for Rare Disease Classification in Medical Diagnosis |
| 22 | Mô hình học sâu giải bài toán dự đoán tính chất phân tử | Molecular Property Prediction Using Deep Learning Models |
| 23 | Thuật toán tiến hoá và phương pháp học chuyển giao giải bài toán tấn công đối kháng vào hệ thống truyền thông tự mã hoá đầu cuối | Evolutionary algorithms and transfer learning technique for physical adversarial attack on end-to-end autoencoder communication systems |
| 24 | Học liên tục trong bài toán phát hiện vật thể cho các vật thể nhỏ và tương đồng | Continual object detection for small and similar objects |
| 25 | Nghiên cứu ứng dụng phân tích chu trình giao dịch phát hiện gian lận trong lĩnh vực tài chính ngân hàng | Research and developing cycle analysis methods based on transaction data to detect fraud in the banking and finance sector |
| 26 | Khai thác dữ liệu dân cư trong việc đánh giá nguy cơ tội phạm của trẻ vị thành niên | *(không có trong danh sách gốc)* |
| 27 | Tăng cường mô hình ngôn ngữ lớn bằng lời nhắc sinh từ đồ thị tri thức | Enhancing Large Language Models via Knowledge Graph-based Prompting |
| 28 | Nghiên cứu hệ thống Retrieval-Augmented Generation (RAG) trên miền dữ liệu tiếng Việt | Research on Retrieval-Augmented Generation (RAG) systems in the Vietnamese data domain |
| 29 | Hệ thống hỏi đáp thông minh cho văn bản hành chính dựa trên đồ thị tri thức | A Knowledge Graph–Based Intelligent Question Answering System for Administrative Documents |
| 30 | Thuật toán di truyền dựa trên học tăng cường cho bài toán tối ưu chuyển giao tính toán trong hệ thống MEC hỗ trợ bởi UAV | Reinforcement Learning-based Genetic Algorithm for Computation Offloading Optimization in UAV-assisted MEC Systems |
| 31 | Nghiên cứu phương pháp thu nhận và đánh giá chất lượng ảnh mống mắt ứng dụng trong xây dựng cơ sở dữ liệu dân cư | A study on methods for iris image acquisition and quality assessment applied to the development of a citizen database |
| 32 | Thuật toán tiến hóa giải bài toán phân bổ tài nguyên trong hệ thống truyền thông nhiều đầu vào nhiều đầu ra lớn | Evolutionary algorithms for resource allocation in massive MIMO |
| 33 | Phân tích dữ liệu: kỹ thuật và ứng dụng trong lĩnh vực dầu khí | Application of Data Analytics in the Petroleum Industry |
| 34 | Cải thiện bộ tách từ âm thanh cho bài toán nhận diện giọng nói | Improving Speech Tokenizer for Speech Recognition |
| 35 | Các mô hình học sâu tiên tiến cho bài toán phân đoạn tín hiệu điện não đồ | Advanced deep learning models for the segmentation of electroencephalographic signals |
| 36 | Sử dụng mô hình ngôn ngữ lớn để sinh heuristic cho bài toán giao nhận động | A Large Language Model Approach to adaptively generate heuristic in Dynamic Pickup and Delivery Problems |
| 37 | Nghiên cứu về mô hình ngôn ngữ thị giác đa phương thức trong bệnh viện thông minh | Research on Multimodal Vision Language Model in Smart Hospital |
| 38 | Ứng dụng phân tích dữ liệu trong tối ưu hóa lịch giảng dạy và phân công phòng học | Application of Data Analysis in Optimizing Teaching Schedules and Classroom Allocation |
| 39 | Tối ưu hóa hiệu quả suy luận trong các mô hình ngôn ngữ | Optimizing Reasoning Efficiency in Language Models |
