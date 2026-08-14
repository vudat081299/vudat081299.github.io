# TOC — data-science-roadmap.html

<!-- toc-signature: 865be663-84b11c -->

> **SINH TỰ ĐỘNG — đừng sửa tay.** Nguồn sự thật là `data-science-roadmap.html`.
> Sinh lại: `node tools/gate.mjs --write`. Gate chặn commit nếu file này lệch HTML.

File này tồn tại để **đọc thay cho việc mở cả file HTML**. Muốn xem một bài:
`node tools/gate.mjs --show <id>` (hoặc `--where <id>` để lấy dải dòng rồi đọc đúng đoạn).

**Tổng:** 84 bài · 11 chặng · 8 tuần · 14 ngày fast track · 106.6 giờ (fast 75.3 giờ)

Cột: **ưu tiên** bắt buộc/nên biết/định vị · **r/x/d** phút đọc/thực hành/deliverable ·
**F** có trong fast track 14 ngày · **T** tuần trong lộ trình 8 tuần · **A** có tiêu chí đạt ·
**dòng** dải dòng trong HTML.

## 0 · Bắt đầu từ đây

**Xong chặng làm được gì.** Hiểu Data Science là gì (và khác gì Analytics/Thống kê/ML/AI), nắm bộ từ vựng lõi, có hai tấm bản đồ để định vị mọi thứ học về sau — và ra khỏi chặng với một trang đề bài của chính bạn: dự đoán gì, tại thời điểm nào, sai thì tốn bao nhiêu tiền.

| id | bài | ưu tiên | r/x/d | F | T | A | dòng |
|---|---|---|---|---|---|---|---|
| `s-how` | Trang này dùng thế nào | bắt buộc | 15/0/0 | ✓ | 1 |  | 3022–3125 |
| `s-intro` | ★ Data Science là gì? — và bộ từ vựng tối thiểu | bắt buộc | 30/10/0 | ✓ | 1 |  | 3126–3245 |
| `s-pipeline` | Một product AI thật gồm 10 bước | bắt buộc | 35/0/0 | ✓ | 1 |  | 3246–3301 |
| `s-families` | ★ Bản đồ các họ bài toán Data Science | bắt buộc | 35/10/0 | ✓ | 1 |  | 3302–3347 |
| `s-lookup` | Tra ngược: “vấn đề này thuộc bước nào?” | bắt buộc | 20/0/0 | ✓ | 1 |  | 3348–3402 |
| `s-plan8w` | ★ Lộ trình chuẩn 6–8 tuần | bắt buộc | 20/0/5 | ✓ | 1 |  | 3403–3454 |
| `s-plan14` | Fast track 14 ngày (bản rút gọn) | bắt buộc | 15/0/5 | ✓ | 1 |  | 3455–3510 |
| `d-framing` | Đóng khung bài toán — bước hay bị bỏ | bắt buộc | 30/0/30 | ✓ | 1 | 3 | 3511–3553 |

- **`s-how`** — Cách đọc trang này: hai lộ trình, ba nhãn ưu tiên, toán nằm trong popup, thông tin phụ nằm trong ngăn bên phải.
  - dẫn tới: Bài sau bắt đầu từ con số 0: Data Science là gì, và bộ từ vựng mà mọi bài sau đều dùng.
  - mở nhánh phụ: `expvar`, `cmp-run`
- **`s-intro`** — Định nghĩa Data Science bằng lời thường, bản đồ phân biệt DS / Analytics / Thống kê / ML / AI / Data Engineering, và một bộ từ vựng lõi được giải thích trên một bảng dữ liệu đồ chơi.
  - dẫn tới: Có ngôn ngữ chung rồi, bài sau dựng cái khung 10 bước để bạn treo mọi thứ còn lại lên.
  - mở nhánh phụ: `bayes`
- **`s-pipeline`** — Khung 10 bước — từ nay mọi kỹ thuật bạn học đều có một địa chỉ để treo vào.
  - dẫn tới: Khung đó giống nhau cho mọi dự án; bài sau là trục thứ hai: mỗi dự án thuộc họ bài toán nào.
- **`s-families`** — Bản đồ 9 họ bài toán, và bộ 8 câu hỏi định vị một dự án lạ trong khoảng 10 phút.
  - dẫn tới: Bài sau đi từ hướng ngược lại: có một triệu chứng cụ thể thì tra ra bước nào.
- **`s-lookup`** — Bảng tra ngược: có triệu chứng cụ thể → ra ngay bước nào, bài nào, công cụ nào.
  - dẫn tới: Bài sau xếp tất cả vào một lịch 6–8 tuần có deliverable từng tuần.
  - mở nhánh phụ: `sincos`, `logtransform`, `gdupdate`, `cmp-run`, `cmp-storage`, `cmp-query`, `cmp-eda`, `cmp-dataframe`, `cmp-gbdt`, `cmp-tune`, `cmp-track`, `cmp-explain`, `cmp-serve`, `cmp-figure`, `cmp-write`
- **`s-plan8w`** — Lộ trình chuẩn 8 tuần, mỗi tuần một sản phẩm kiểm chứng được, kèm sơ đồ phụ thuộc giữa các chặng.
  - dẫn tới: Bài sau là bản rút gọn của chính lộ trình đó, cho người chỉ có hai tuần.
- **`s-plan14`** — Fast track 14 ngày, và danh sách rõ ràng những phần nó chỉ giới thiệu chứ chưa dạy hết.
  - dẫn tới: Hết phần dẫn nhập lộ trình. Bài cuối chặng là việc đầu tiên bạn làm bằng đầu chứ không bằng máy: viết ra đề bài của chính mình.
- **`d-framing`** — Một trang đề bài: dự đoán gì, tại thời điểm nào, sai thì tốn bao nhiêu tiền.
  - dẫn tới: Có tờ đề bài rồi, chặng sau mới dựng chỗ làm việc và học gõ — công cụ để phục vụ đề bài đó, không phải ngược lại.

## 1 · Công cụ — biết gõ trước khi biết nghĩ

**Xong chặng làm được gì.** Dựng được chỗ làm việc (chạy được cả trên máy yếu) và gõ thành thạo pandas, SQL, numpy, scikit-learn — đủ để thao tác dữ liệu thật, không chỉ đọc về chúng.

| id | bài | ưu tiên | r/x/d | F | T | A | dòng |
|---|---|---|---|---|---|---|---|
| `t-env` | ★ Chỗ làm việc: cloud-first, local là dự phòng | bắt buộc | 25/35/30 | ✓ | 1 |  | 3558–3644 |
| `t-online` | ★ Làm cả dự án trên trình duyệt (máy yếu) | bắt buộc | 25/20/20 | ✓ | 1 |  | 3645–3758 |
| `t-colab` | Google Colab — làm được gì, khi nào dùng | bắt buộc | 20/25/0 | ✓ | 6 |  | 3759–3880 |
| `t-ai` | ★ Làm việc với AI coding assistant | bắt buộc | 30/30/15 | ✓ | 1 |  | 3881–3984 |
| `t-pandas` | pandas — 15 thao tác chiếm 90% việc | bắt buộc | 50/100/20 | ✓ | 1 |  | 3985–4081 |
| `t-sql` | SQL — lấy dữ liệu ra khỏi cơ sở dữ liệu | bắt buộc | 25/35/15 | ✓ | 1 |  | 4082–4207 |
| `t-numpy` | numpy — vector hoá & mảng | bắt buộc | 25/35/10 | ✓ | 1 |  | 4208–4254 |
| `t-sklearn` | scikit-learn — 4 khái niệm là đủ | bắt buộc | 45/75/20 | ✓ | 1 |  | 4255–4314 |

- **`t-env`** — Chỗ làm việc cloud-first: GitHub là bản thật, Colab/Codespaces là chỗ chạy, cấu trúc thư mục dự án đã dựng.
  - dẫn tới: Bài sau ráp các mảnh đó thành một đường đi liền mạch cho cả 10 bước.
  - mở nhánh phụ: `cmp-run`, `cmp-storage`
- **`t-online`** — Một đường đi 100% trình duyệt: viết code, chạy, huấn luyện, triển khai, viết luận văn — không cần máy khoẻ.
  - dẫn tới: Bài sau đi sâu vào mắt xích trung tâm của đường đi đó.
  - mở nhánh phụ: `cmp-serve`, `cmp-run`, `cmp-storage`, `cmp-write`
- **`t-colab`** — Colab dùng đúng cách: repo là gốc, Colab chỉ là chỗ chạy; và biết GPU đáng bật lúc nào.
  - dẫn tới: Bài sau là người đồng hành thứ hai của bạn trên đường đi này — và cách không để nó làm hỏng repo.
  - mở nhánh phụ: `colab10`, `cmp-run`, `cmp-storage`
- **`t-ai`** — Quy trình giao việc cho AI theo module nhỏ, cách review diff, bộ test tối thiểu, và ranh giới dữ liệu không được đưa vào prompt.
  - dẫn tới: Bài sau là thứ bạn (và AI) sẽ gõ nhiều nhất trong cả dự án.
  - mở nhánh phụ: `cmp-write`
- **`t-pandas`** — Năm nhóm thao tác pandas đủ cho toàn bộ dự án, và bài tập đã làm xong.
  - dẫn tới: pandas cần có dữ liệu để chạm vào — bài sau là cách lấy nó ra khỏi cơ sở dữ liệu.
  - mở nhánh phụ: `cmp-dataframe`
- **`t-sql`** — Sáu mệnh đề SQL, và window function tính feature đúng mốc thời gian mà không rò rỉ.
  - dẫn tới: Bài sau là lớp nền bên dưới pandas — nơi phần lớn thông báo lỗi sinh ra.
  - mở nhánh phụ: `cmp-query`
- **`t-numpy`** — Shape, broadcasting, seed — ba thứ quyết định bạn đọc được lỗi hay ngồi đoán.
  - dẫn tới: Bài sau ráp chúng vào bộ khung mà mọi mô hình bạn dùng đều tuân theo.
  - mở nhánh phụ: `dot`, `matmul`
- **`t-sklearn`** — Bốn khái niệm sklearn: estimator, transformer, Pipeline, ColumnTransformer.
  - dẫn tới: Đủ công cụ để chạm dữ liệu thật. Chặng sau đi hết vòng đời của nó: lấy về, chốt schema, chia tập, và không tự lừa mình.
  - mở nhánh phụ: `standardize`, `x-pipeline-bugs`, `x-sklearn-imports`, `cmp-gbdt`

## 2 · Vòng đời dữ liệu

**Xong chặng làm được gì.** Đi hết vòng đời của dữ liệu trước khi mô hình hoá: lấy về và chốt schema, nhận ra rò rỉ, kiểm cấu trúc, chia tập hợp lệ, rồi mới khám phá và làm sạch. Thứ tự đó là cố ý, và ranh giới nằm ở bước chia: trước khi chia bạn chỉ được nhìn CẤU TRÚC (dòng là gì, có thời gian không, có trùng không) và chỉ được sửa những thứ tuyệt đối; mọi cái nhìn hay phép sửa HỌC TỪ DỮ LIỆU đều phải đợi sau khi chia và chỉ trên train.

| id | bài | ưu tiên | r/x/d | F | T | A | dòng |
|---|---|---|---|---|---|---|---|
| `d-data` | Lấy dữ liệu về: chọn bộ, chốt schema, viết adapter | bắt buộc | 25/20/30 | ✓ | 2 | 3 | 4319–4636 |
| `d-leak` | Data leakage — lỗi giết chết luận văn | bắt buộc | 45/25/20 | ✓ | 2 | 2 | 4637–4706 |
| `d-eda` | EDA — nhìn dữ liệu đúng cách | bắt buộc | 35/50/45 | ✓ | 2 | 3 | 4707–4798 |
| `d-split` | Chia tập: random, theo thời gian, theo nhóm | bắt buộc | 35/25/30 | ✓ | 2 | 3 | 4798–4860 |
| `d-clean` | Thiếu, lệch, ngoại lai — xử lý ra sao | bắt buộc | 30/25/20 | ✓ | 2 |  | 4862–4942 |

- **`d-data`** — Bộ dữ liệu đã tải và kiểm tra, một schema tám cột chốt cứng, adapter đưa mọi nguồn về schema đó, và một datacard.
  - dẫn tới: Có dữ liệu đúng hình dạng rồi. Bài sau là lỗi lặng lẽ nhất — và phải học TRƯỚC khi chia tập, vì nó quyết định chia thế nào mới hợp lệ.
  - mở nhánh phụ: `paysim`, `cmp-data`, `cmp-storage`
- **`d-leak`** — Sáu kiểu rò rỉ, và quy trình kiểm tra chạy trước khi tin bất kỳ con số nào.
  - dẫn tới: Biết cái gì làm hỏng rồi, bài sau mới dám nhìn dữ liệu — và nói rõ nhìn được cái gì trước khi chia, cái gì phải đợi sau.
- **`d-eda`** — Danh sách 10 điểm kiểm tra chạy được cho mọi bộ dữ liệu mới, và bốn biểu đồ đáng vẽ — tách làm hai thì, ngăn bởi bước chia tập.
  - dẫn tới: Thì 1 vừa cho bạn biết dữ liệu có thứ tự thời gian không, có nhóm lặp không — đúng những thứ quyết định cách chia. Bài sau chia tập, rồi bạn quay lại đây làm Thì 2.
  - mở nhánh phụ: `cmp-eda`
- **`d-split`** — Tập train/valid/test chia theo thời gian, và bốn dòng assert kiểm tra sau khi chia.
  - dẫn tới: Có tập hợp lệ rồi: quay lại EDA Thì 2 trên train, rồi sang bài sau để làm sạch — và bài đó tách rõ phép sửa nào chạy trước khi chia, phép nào phải học từ train.
  - mở nhánh phụ: `x-split-other`
- **`d-clean`** — Cách xử lý thiếu, ngoại lai, trùng lặp — tất cả nằm trong code, không thao tác tay.
  - dẫn tới: Dữ liệu đã sạch và đã chia. Chặng sau là phần toán tối thiểu để bạn đọc hiểu những con số sắp hiện ra — học ở đây vì từ chặng kế tiếp trở đi bài nào cũng cần.
  - mở nhánh phụ: `expvar`, `cmp-dataframe`

## 3 · Toán tối thiểu (không hơn)

**Xong chặng làm được gì.** Đọc được công thức trong các bài sau mà không hoảng: vector & ma trận, đạo hàm/gradient, xác suất và Bayes. Học ở đây, ngay trước bài đầu tiên thật sự cần tới chúng — phần thống kê suy diễn tách riêng và nằm ở chặng 5, cạnh chỗ bạn phải chứng minh một chênh lệch là thật.

| id | bài | ưu tiên | r/x/d | F | T | A | dòng |
|---|---|---|---|---|---|---|---|
| `m-vector` | Vector & ma trận — dữ liệu trong máy | bắt buộc | 55/20/10 | ✓ | 2 |  | 4947–4994 |
| `m-deriv` | Đạo hàm & gradient — “học” nghĩa là gì | bắt buộc | 55/20/10 | ✓ | 2 |  | 4995–5027 |
| `m-prob` | Xác suất: phân phối, kỳ vọng, phương sai | bắt buộc | 55/20/10 | ✓ | 2 |  | 5028–5075 |
| `m-bayes` | Bayes & likelihood | bắt buộc | 45/15/0 |  | 2 | 2 | 5076–5103 |

- **`m-vector`** — Ba ý hình học: một dòng là một điểm, khoảng cách phụ thuộc đơn vị, ma trận là cả bảng.
  - dẫn tới: Bài sau dùng đúng hình học đó để trả lời "máy học bằng cách nào".
  - mở nhánh phụ: `dot`, `standardize`, `matmul`, `x-la-skip`
- **`m-deriv`** — Câu trả lời cho câu hỏi ít ai nói thẳng: độ dốc, gradient, và bước đi ngược dốc.
  - dẫn tới: Bài sau chuyển sang ngôn ngữ mà đầu ra của mô hình được viết bằng.
  - mở nhánh phụ: `deriv`, `gdupdate`, `x-tree-gradient`
- **`m-prob`** — Đọc được một cột dữ liệu, và đọc đúng con số 0–1 mà mô hình trả ra.
  - dẫn tới: Bài sau giải thích vì sao 99% chính xác vẫn có thể hoàn toàn vô dụng.
  - mở nhánh phụ: `expvar`, `normal`, `logtransform`
- **`m-bayes`** — Lý do một mô hình rất chính xác vẫn báo động sai gần hết — bằng số, không bằng cảm giác.
  - dẫn tới: Hết phần toán. Chặng sau là bước quyết định điểm số nhiều hơn cả việc chọn mô hình: biến dữ liệu thô thành feature.
  - mở nhánh phụ: `bayes`

## 4 · Feature engineering

**Xong chặng làm được gì.** Biến dữ liệu thô thành các feature mà mô hình hiểu được, và ráp tất cả vào một Pipeline tái lập được — bước quyết định chất lượng nhiều hơn cả việc chọn mô hình.

| id | bài | ưu tiên | r/x/d | F | T | A | dòng |
|---|---|---|---|---|---|---|---|
| `f-what` | FE khi làm thật là gõ cái gì, ở đâu | bắt buộc | 30/5/10 | ✓ | 3 |  | 5108–5167 |
| `f-numeric` | Biến số: scale, log, clip, binning | bắt buộc | 25/15/20 | ✓ | 3 |  | 5168–5224 |
| `f-cat` | Biến hạng mục: one-hot, target, hashing | bắt buộc | 35/20/20 | ✓ | 3 |  | 5225–5296 |
| `f-cyclic` | ★ Biến chu kỳ: 23h và 0h liền nhau | bắt buộc | 30/15/30 | ✓ | 3 |  | 5297–5402 |
| `f-time` | Biến theo thời gian: lag, rolling, velocity | bắt buộc | 35/15/40 | ✓ | 3 |  | 5403–5489 |
| `f-text` | Chữ & embedding: TF-IDF → vector | nên biết | 40/20/0 |  | 3 |  | 5490–5524 |
| `f-pipeline` | ★ Ráp tất cả: Pipeline + ColumnTransformer | bắt buộc | 30/20/40 | ✓ | 3 | 3 | 5525–5625 |
| `f-select` | Chọn feature & đo tầm quan trọng | nên biết | 30/15/0 |  | 3 |  | 5626–5669 |
| `f-store` | Feature store — khi nào thực sự cần | định vị | 30/0/0 |  | 3 |  | 5670–5692 |

- **`f-what`** — Định nghĩa feature engineering gắn với thao tác thật, và nhịp một buổi làm việc.
  - dẫn tới: Bài sau vào loại cột đơn giản nhất: cột số.
- **`f-numeric`** — Bốn phép biến đổi cột số, và nhóm feature tỉ lệ thường bị bỏ quên.
  - dẫn tới: Bài sau là loại cột khó hơn: cột chữ có hữu hạn giá trị.
  - mở nhánh phụ: `standardize`, `logtransform`
- **`f-cat`** — Năm cách mã hoá cột phân loại, và bảng chọn nhanh theo số giá trị khác nhau.
  - dẫn tới: Bài sau là loại cột mà cả năm cách trên đều làm sai.
- **`f-cyclic`** — Mã hoá sin/cos, gõ được ở cả bốn mức từ notebook tới Pipeline.
  - dẫn tới: Bài sau là nhóm feature mạnh nhất cho bài gian lận — và dễ rò rỉ nhất.
  - mở nhánh phụ: `sincos`, `cyclicspline`, `x-cyclic-more`
- **`f-time`** — Feature theo thời gian: khoảng cách, velocity, so với thói quen — tính không rò rỉ.
  - dẫn tới: Bài sau xử lý cột chữ tự do, nếu dữ liệu của bạn có.
- **`f-text`** — Ba mức xử lý cột chữ, chọn theo số giờ bạn còn lại.
  - dẫn tới: Bài sau ráp toàn bộ feature đã học vào một đối tượng duy nhất.
- **`f-pipeline`** — src/pipeline.py chạy được: một đối tượng làm hết từ dữ liệu thô tới dự đoán.
  - dẫn tới: Có Pipeline rồi, bài sau mới cắt bớt feature một cách có bằng chứng.
  - mở nhánh phụ: `x-pipeline-bugs`
- **`f-select`** — Ba cách chọn feature xếp theo độ tin cậy, và cách viết phần này vào luận văn.
  - dẫn tới: Bài sau giải thích thuật ngữ Feature Store bạn sẽ gặp khắp nơi — và vì sao chưa cần.
- **`f-store`** — Biết Feature Store giải quyết gì, và khái niệm point-in-time correctness để nói đúng.
  - dẫn tới: Chặng sau chọn mô hình để đổ đống feature này vào.

## 5 · Machine learning

**Xong chặng làm được gì.** Chọn và huấn luyện mô hình phù hợp, xử lý dữ liệu lệch, đo bằng đúng metric (PR-AUC, ngưỡng quy ra tiền) thay vì accuracy gây hiểu nhầm — và chứng minh được chênh lệch giữa hai mô hình là thật chứ không phải may rủi của một lần chia tập.

| id | bài | ưu tiên | r/x/d | F | T | A | dòng |
|---|---|---|---|---|---|---|---|
| `ml-map` | Bản đồ mô hình: bài nào dùng gì | bắt buộc | 45/0/0 | ✓ | 3 |  | 5697–5743 |
| `ml-linear` | Hồi quy tuyến tính & logistic | bắt buộc | 35/20/20 | ✓ | 3 | 3 | 5744–5803 |
| `ml-metrics` | ★ Đo lường: PR-AUC, ngưỡng, và tiền | bắt buộc | 35/20/35 | ✓ | 3 | 3 | 5804–5909 |
| `ml-loss` | Hàm mất mát + gradient descent | bắt buộc | 55/25/10 | ✓ | 4 |  | 5910–5956 |
| `ml-trees` | Cây → Random Forest → Boosting | bắt buộc | 45/35/25 | ✓ | 4 |  | 5957–6033 |
| `ml-overfit` | Overfitting, bias–variance, regularization | bắt buộc | 40/20/15 | ✓ | 4 |  | 6034–6079 |
| `ml-cv` | Cross-validation cho đúng | bắt buộc | 30/10/20 | ✓ | 4 |  | 6080–6131 |
| `m-infer` | Thống kê suy diễn — thứ luận văn cần | bắt buộc | 60/30/10 | ✓ | 4 |  | 6132–6187 |
| `ml-imb` | ★ Dữ liệu lệch: 0,17% gian lận thì làm gì | bắt buộc | 30/15/30 | ✓ | 4 |  | 6188–6265 |
| `ml-tune` | Tuning: grid, random, Optuna | nên biết | 25/20/0 |  | 4 |  | 6266–6321 |
| `ml-shap` | Giải thích mô hình: SHAP | nên biết | 30/15/15 |  | 4 |  | 6322–6366 |
| `ml-unsup` | Không nhãn: cụm & phát hiện bất thường | nên biết | 45/15/0 |  | 4 |  | 6367–6401 |

- **`ml-map`** — Bản đồ năm mô hình, và quy trình chọn theo đúng thứ tự.
  - dẫn tới: Bài sau là baseline không thể thiếu.
  - mở nhánh phụ: `x-memorize`
- **`ml-linear`** — Baseline hồi quy logistic chạy được, và cách đọc hệ số để viết vào luận văn.
  - dẫn tới: Bạn vừa có mô hình đầu tiên nhưng chưa có cách đọc nó — bài sau là chỉ số dùng để đọc.
  - mở nhánh phụ: `mse`, `sigmoid`
- **`ml-metrics`** — PR-AUC làm chỉ số chính, và một ngưỡng chọn theo chi phí chứ không theo cảm tính.
  - dẫn tới: Đã biết đo đúng, bài sau nói mô hình thực sự được huấn luyện bằng cách nào.
  - mở nhánh phụ: `auc`
- **`ml-loss`** — Hàm mất mát ráp với gradient descent, và biết phân biệt nó với chỉ số đánh giá.
  - dẫn tới: Bài sau là gia đình mô hình bạn sẽ dùng làm mô hình chính.
  - mở nhánh phụ: `mse`, `logloss`, `softmax`, `gdupdate`, `optzoo`, `x-tree-learn`
- **`ml-trees`** — LightGBM với cấu hình khởi đầu, ba siêu tham số quan trọng, và early stopping.
  - dẫn tới: Bài sau là kẻ thù của mọi mô hình mạnh.
  - mở nhánh phụ: `entropy`, `cmp-gbdt`
- **`ml-overfit`** — Chẩn đoán overfit bằng hình, và bảy cách chống xếp theo hiệu quả.
  - dẫn tới: Bài sau là cách đo cho chắc, thay vì tin vào một lần chia may rủi.
  - mở nhánh phụ: `reg`
- **`ml-cv`** — Cross-validation đúng loại cho dữ liệu thời gian, và cách đọc độ lệch chuẩn.
  - dẫn tới: Bài sau trả lời đúng câu mà độ lệch chuẩn giữa các fold vừa đặt ra: chênh lệch thế nào mới gọi là thật.
- **`m-infer`** — Bootstrap, McNemar, và cách nói về p-value mà không bị bắt lỗi.
  - dẫn tới: Biết cách chứng minh một chênh lệch rồi, bài sau là vấn đề trung tâm của bài toán gian lận: 0,17% nhãn dương.
  - mở nhánh phụ: `ci`, `mcnemar`, `pvalue`
- **`ml-imb`** — Thứ tự ưu tiên xử lý mất cân bằng, và bảng thí nghiệm mẫu đưa thẳng vào luận văn.
  - dẫn tới: Bài sau là cách tìm siêu tham số mà không tự lừa mình.
- **`ml-tune`** — Optuna dùng được ngay, và bốn quy tắc để kết quả tuning không phải ảo.
  - dẫn tới: Bài sau trả lời câu hội đồng gần như chắc chắn hỏi.
  - mở nhánh phụ: `cmp-tune`
- **`ml-shap`** — Hai loại hình SHAP cho luận văn, và ba giới hạn bạn phải tự nêu trước khi bị hỏi.
  - dẫn tới: Bài sau là phương án khi nhãn quá ít hoặc đến quá trễ.
  - mở nhánh phụ: `cmp-explain`
- **`ml-unsup`** — Phân cụm và phát hiện bất thường, cùng cách kết hợp với mô hình có giám sát.
  - dẫn tới: Hết phần ML cổ điển — và đủ để làm ra sản phẩm. Chặng sau quay về dự án gian lận, đóng gói toàn bộ thành một thứ chạy được: repo, model, API, giám sát.

## 6 · Làm ra product thật (fraud detection)

**Xong chặng làm được gì.** Đóng gói toàn bộ thành một dịch vụ chạy được: từ repo tới model đã lưu, ra API (FastAPI) + Docker, kèm giám sát drift và kế hoạch retrain.

| id | bài | ưu tiên | r/x/d | F | T | A | dòng |
|---|---|---|---|---|---|---|---|
| `pr-arch` | Kiến trúc hệ thống chống gian lận | bắt buộc | 30/5/25 | ✓ | 5 |  | 6406–6475 |
| `pr-code` | ★ Code end-to-end: repo tới model đã lưu | bắt buộc | 40/50/60 | ✓ | 5 | 3 | 6476–7094 |
| `pr-eval` | ★ Đánh giá, chọn ngưỡng, và bốn test | bắt buộc | 45/40/50 | ✓ | 5 | 7 | 7095–7779 |
| `pr-serve` | Đóng gói: FastAPI + Docker | bắt buộc | 35/40/45 | ✓ | 5 | 3 | 7780–8175 |
| `pr-monitor` | Giám sát: drift, feedback, retrain | bắt buộc | 35/20/25 | ✓ | 5 | 2 | 8176–8249 |
| `pr-mlops` | MLOps tối thiểu: MLflow, DVC, CI | nên biết | 30/25/20 |  | 5 |  | 8250–8303 |
| `pr-cost` | Quy ra tiền: ngưỡng theo chi phí | bắt buộc | 25/10/15 |  | 5 | 3 | 8304–8349 |

- **`pr-arch`** — Bản vẽ đường đi của một giao dịch, và năm quyết định thiết kế phải nêu trong luận văn.
  - dẫn tới: Có bản vẽ rồi, bài sau viết toàn bộ mã nguồn hiện thực nó.
- **`pr-code`** — Repo chạy được: config, features, history, pipeline, train — và một file .joblib có thật trong models/.
  - dẫn tới: Có model rồi, bài sau mới trả lời được câu "nó tốt tới đâu, và chặn từ ngưỡng nào".
  - mở nhánh phụ: `cmp-gbdt`, `x-pipeline-bugs`
- **`pr-eval`** — Ngưỡng theo chi phí, khoảng tin cậy đúng loại, baseline theo luật để so, bảng chênh lệch theo nhóm, và bốn test chặn lỗi im lặng.
  - dẫn tới: Bài sau biến file .joblib đó thành một dịch vụ mà hệ thống khác gọi được.
  - mở nhánh phụ: `testsuite`, `ci`, `auc`, `cmp-tune`
- **`pr-serve`** — API FastAPI, Dockerfile, và bản demo Streamlit dùng cho buổi bảo vệ.
  - dẫn tới: Bài sau là chương rất ít luận văn viết được cho ra hồn.
  - mở nhánh phụ: `streamlit`, `cmp-serve`
- **`pr-monitor`** — Đo drift bằng PSI, bảng theo dõi tối thiểu, và chiến lược huấn luyện lại.
  - dẫn tới: Bài sau là phần MLOps nhỏ nhất mà vẫn đủ để repo nộp được.
  - mở nhánh phụ: `cmp-track`
- **`pr-mlops`** — MLflow, chốt phiên bản thư viện, CI tối thiểu, và bảng kiểm repo trước khi nộp.
  - dẫn tới: Bài sau quy mọi thứ ra tiền — bài có tỉ lệ giá trị trên công sức cao nhất trang.
  - mở nhánh phụ: `x-mlops-skip`, `cmp-track`
- **`pr-cost`** — Ma trận chi phí, và phân tích độ nhạy biến điểm yếu thành điểm mạnh.
  - dẫn tới: Sản phẩm xong, và nó chạy bằng LightGBM chứ không cần mạng nơ-ron nào. Chặng sau mới là deep learning — học vì nó mở ra chữ, ảnh và attention, không phải vì sản phẩm vừa rồi thiếu nó.

## 7 · Deep learning & Transformer

**Xong chặng làm được gì.** Hiểu mạng nơ-ron và attention/Transformer từ số 0 — đủ để biết chúng làm gì, khi nào nên dùng, và khi nào dữ liệu bảng không cần tới chúng. Chặng này đứng SAU sản phẩm là có chủ ý: sản phẩm bạn vừa làm không cần một dòng mạng nơ-ron nào.

| id | bài | ưu tiên | r/x/d | F | T | A | dòng |
|---|---|---|---|---|---|---|---|
| `dl-nn` | Từ logistic regression → mạng nơ-ron | bắt buộc | 50/15/10 | ✓ | 6 |  | 8354–8407 |
| `dl-backprop` | Backpropagation — thực chất là gì | bắt buộc | 60/15/0 | ✓ | 6 |  | 8408–8444 |
| `dl-train` | Huấn luyện: epoch, batch, lr, early stop | bắt buộc | 50/15/10 | ✓ | 6 |  | 8445–8502 |
| `dl-embed` | Embedding — biến ID thành vector | bắt buộc | 40/10/10 | ✓ | 6 |  | 8503–8545 |
| `dl-cnn-rnn` | CNN & RNN/LSTM — định vị và khi nào còn dùng | nên biết | 55/5/0 |  | 6 |  | 8546–8581 |
| `dl-attn` | ★ Attention — giải từ số 0 | bắt buộc | 90/20/10 | ✓ | 6 |  | 8582–8628 |
| `dl-tf` | ★ Transformer — ráp thành kiến trúc | bắt buộc | 70/10/10 | ✓ | 6 |  | 8629–8681 |
| `dl-llm` | LLM, fine-tune, RAG — dùng sao cho đúng | nên biết | 65/10/0 |  | 6 |  | 8682–8723 |
| `dl-tab` | Deep learning cho dữ liệu bảng: nên không? | nên biết | 40/5/0 |  | 6 |  | 8724–8759 |

- **`dl-nn`** — Mạng nơ-ron nhìn ra là hồi quy logistic xếp chồng, và vòng lặp huấn luyện đầy đủ.
  - dẫn tới: Bài sau là cách mạng đó tự sửa mình.
  - mở nhánh phụ: `softmax`, `chain`, `gdupdate`
- **`dl-backprop`** — Backpropagation gọn trong quy tắc dây chuyền, và hai bệnh sinh ra trực tiếp từ nó.
  - dẫn tới: Bài sau là bộ nút bạn thật sự vặn khi huấn luyện.
  - mở nhánh phụ: `chain`
- **`dl-train`** — Bảng chẩn đoán đường cong loss, và quy trình gỡ lỗi khi mạng không học.
  - dẫn tới: Bài sau là ý tưởng nền cho mọi thứ hiện đại.
  - mở nhánh phụ: `gdupdate`, `reg`
- **`dl-embed`** — Embedding: học một vector ngắn cho mỗi thực thể, và chỗ dùng trong bài của bạn.
  - dẫn tới: Bài sau điểm danh hai kiến trúc cũ để bạn đọc paper không thấy lạ.
- **`dl-cnn-rnn`** — Định vị được CNN và RNN/LSTM: giải quyết gì, vì sao bị thay ở tác vụ dẫn đầu, và chỗ chúng vẫn là baseline hợp lệ.
  - dẫn tới: Bài sau là khái niệm đã thay thế chúng — và là khái niệm bạn nói mình chưa biết.
- **`dl-attn`** — Attention từ số 0: bốn bước, multi-head, và cái giá bình phương độ dài.
  - dẫn tới: Bài sau ráp attention thành một kiến trúc hoàn chỉnh.
  - mở nhánh phụ: `dot`, `softmax`, `attention`, `x-attn-kinds`
- **`dl-tf`** — Một khối Transformer đầy đủ, và positional encoding nối thẳng lại với bài sin/cos.
  - dẫn tới: Bài sau là thứ được xây trên kiến trúc đó.
  - mở nhánh phụ: `posenc`, `x-tf-variants`
- **`dl-llm`** — Nói chuyện về LLM cho đúng, và bốn cách dùng xếp từ rẻ tới đắt.
  - dẫn tới: Bài sau trả lời thẳng: dữ liệu bảng thì có nên dùng deep learning không.
  - mở nhánh phụ: `dot`, `x-llm-vocab`
- **`dl-tab`** — Câu trả lời có bằng chứng cho "deep learning trên dữ liệu bảng", và cách dùng khôn nhất khi thời gian có hạn.
  - dẫn tới: Hết phần kỹ thuật chung. Chặng sau rời khỏi bài toán gian lận để xem tám họ bài toán khác đổi những gì.
  - mở nhánh phụ: `x-tab-dl-zoo`

## 8 · Các họ bài toán khác — chuyển giao kiến thức

**Xong chặng làm được gì.** Chuyển kiến thức sang các họ bài toán khác — dự báo chuỗi thời gian, hồi quy, NLP, nhân quả — và làm thật hai mini-project để chứng minh khả năng chuyển giao.

| id | bài | ưu tiên | r/x/d | F | T | A | dòng |
|---|---|---|---|---|---|---|---|
| `q-regress` | Hồi quy: dự đoán một con số | bắt buộc | 45/20/10 |  | 7 |  | 8768–8835 |
| `q-forecast` | ★ Chuỗi thời gian & forecasting | bắt buộc | 70/50/30 |  | 7 |  | 8836–8949 |
| `q-multi` | Multiclass & multilabel | nên biết | 40/15/5 |  | 7 |  | 8950–8995 |
| `q-nlp` | NLP: TF-IDF → embedding → Transformer | nên biết | 50/30/10 |  | 7 |  | 8996–9052 |
| `q-cv` | Computer vision — định vị & mini-lab | nên biết | 35/25/0 |  | 7 |  | 9053–9106 |
| `q-rec` | Gợi ý & xếp hạng (recommendation) | nên biết | 45/25/5 |  | 7 |  | 9107–9156 |
| `q-causal` | ★ A/B testing & tư duy nhân quả | bắt buộc | 55/25/10 |  | 7 |  | 9157–9233 |
| `q-analytics` | Analytics: SQL, KPI, cohort, funnel | nên biết | 45/25/5 |  | 7 |  | 9234–9290 |
| `q-mini` | ★ Mini-project chuyển giao — làm thật 2/6 | bắt buộc | 45/15/240 |  | 7 | 3 | 9291–9377 |

- **`q-regress`** — Bộ chỉ số cho biến liên tục (MAE/RMSE/MAPE/R²) chọn theo bài toán, và cách báo cáo khoảng dự đoán thay vì một con số trần trụi.
  - dẫn tới: Bài sau là họ bài toán mà mọi thứ bạn biết về chia tập đều phải viết lại.
  - mở nhánh phụ: `logtransform`
- **`q-forecast`** — Một module forecasting đủ dùng: baseline naive, backtesting walk-forward, lag/rolling, ETS/ARIMA/Prophet/boosting/LSTM đặt đúng vai, và metric MASE.
  - dẫn tới: Bài sau quay lại phân loại nhưng với nhiều hơn hai lớp.
- **`q-multi`** — Cách mở rộng từ 2 lớp lên N lớp và multilabel, và ba kiểu trung bình hoá chỉ số mà chọn sai là báo cáo sai.
  - dẫn tới: Bài sau là loại dữ liệu đầu vào không phải bảng: chữ.
  - mở nhánh phụ: `softmax`
- **`q-nlp`** — Ba mức xử lý văn bản với baseline TF-IDF làm mốc bắt buộc, và cách đánh giá NLP thay vì chỉ khoe tên mô hình.
  - dẫn tới: Bài sau là loại đầu vào thứ hai không phải bảng: ảnh.
- **`q-cv`** — Định vị được classification / detection / segmentation, và một mini-lab transfer learning chạy trong Colab.
  - dẫn tới: Bài sau là họ bài toán mà "độ chính xác" gần như không có ý nghĩa gì.
- **`q-rec`** — Baseline popularity, collaborative filtering, content-based, và metric xếp hạng đọc đúng cách.
  - dẫn tới: Bài sau là ranh giới mà mọi mô hình dự đoán đều không vượt qua được.
- **`q-causal`** — Phân biệt tương quan với nhân quả, thiết kế một A/B test đọc được, và biết khi nào mô hình dự đoán không trả lời được câu hỏi đang hỏi.
  - dẫn tới: Bài sau là phần công việc chiếm nhiều thời gian nhất của một data team thật.
  - mở nhánh phụ: `pvalue`, `ci`
- **`q-analytics`** — SQL phân tích, cohort, funnel, segmentation, và ranh giới ba nghề: analytics, predictive, causal.
  - dẫn tới: Bài cuối chặng: sáu dự án nhỏ để kiểm chứng bạn thật sự chuyển giao được.
- **`q-mini`** — Hai mini-project chuyển giao làm tới cùng (mỗi cái một notebook + bảng "giữ gì / đổi gì"), và bốn đề phác thảo để tra sau.
  - dẫn tới: Chặng sau là phần viết: biến toàn bộ những gì đã làm thành một luận văn, bắt đầu từ chọn đề tài.

## 9 · Luận văn / paper thạc sĩ

**Xong chặng làm được gì.** Dựng được khung một nghiên cứu: tìm khoảng trống có “delta”, đọc và tái lập một paper, thiết kế thí nghiệm, viết theo IMRaD, và chuẩn bị bảo vệ.

| id | bài | ưu tiên | r/x/d | F | T | A | dòng |
|---|---|---|---|---|---|---|---|
| `th-topic` | Đề tài phải có “delta” — tìm khoảng trống | bắt buộc | 30/5/40 | ✓ | 8 | 2 | 9382–9440 |
| `th-read` | Đọc paper 3 lượt | bắt buộc | 25/35/30 | ✓ | 8 | 3 | 9441–9490 |
| `th-repro` | Tái lập một paper — bước bắt buộc | bắt buộc | 25/30/30 | ✓ | 8 | 2 | 9491–9550 |
| `th-design` | Thiết kế thí nghiệm: baseline, ablation | bắt buộc | 35/20/35 | ✓ | 8 | 2 | 9551–9612 |
| `th-stats` | Kết quả có ý nghĩa thống kê không | bắt buộc | 30/25/30 | ✓ | 8 | 2 | 9613–9674 |
| `th-write` | Viết: IMRaD và câu nào nằm ở đâu | bắt buộc | 40/5/45 | ✓ | 8 | 3 | 9675–9744 |
| `th-tools` | Công cụ: Overleaf, Zotero, W&B | nên biết | 25/20/10 |  | 8 |  | 9745–9794 |
| `th-defense` | ★ Bảo vệ: slide, demo, 24 câu hội đồng hỏi | bắt buộc | 30/5/45 | ✓ | 8 | 3 | 9795–9900 |

- **`th-topic`** — Một trang đề cương: khoảng trống, câu hỏi nghiên cứu, và cách bạn sẽ chứng minh.
  - dẫn tới: Bài sau là cách đọc 15–30 paper mà vẫn kịp deadline.
- **`th-read`** — Reading-note skeleton + lượt 1–2 cho một paper; lượt 3 được lập lịch riêng vì cần 4–5 giờ/paper.
  - dẫn tới: Bài sau dùng notes đó để chọn đúng kết quả cần tái lập và ghi reproduction report.
- **`th-repro`** — Quy trình tái lập, cách xử lý khi không tái lập được, và cách làm công trình của bạn tái lập được.
  - dẫn tới: Bài sau thiết kế phần thực nghiệm — nơi luận văn được chấm điểm thật.
- **`th-design`** — Ba tầng thí nghiệm: baseline, ablation, độ nhạy — cùng bảng theo dõi.
  - dẫn tới: Bài sau chứng minh chênh lệch giữa các dòng trong bảng đó là thật.
- **`th-stats`** — Nhiều seed, khoảng tin cậy, kiểm định ghép cặp, và mẫu đoạn viết sẵn.
  - dẫn tới: Bài sau là bộ khung để đổ tất cả những thứ này vào.
  - mở nhánh phụ: `ci`, `mcnemar`, `pvalue`
- **`th-write`** — Bộ khung IMRaD mở rộng, và công thức viết cho từng chương.
  - dẫn tới: Bài sau là công cụ tiết kiệm hàng chục giờ ở giai đoạn viết.
  - mở nhánh phụ: `cmp-figure`
- **`th-tools`** — Overleaf, Zotero, MLflow, và bảng kiểm cuối cùng trước khi nộp.
  - dẫn tới: Bài sau là 45 phút quyết định tất cả.
  - mở nhánh phụ: `cmp-write`, `cmp-figure`
- **`th-defense`** — Defense-plan skeleton: outline slide, demo/video dự phòng, lịch rehearsal, bộ câu hỏi và rubric.
  - dẫn tới: Hết đường đi trong page; slide thật, rehearsal và mentor review tiếp tục theo lịch T−3/T−1 trước ngày bảo vệ.
  - mở nhánh phụ: `qbank`

## 10 · Tra cứu

**Xong chặng làm được gì.** Có một sổ tay để tra khi bí: 20 lỗi người mới hay mắc, từ điển thuật ngữ, bản dịch từ roadmap.sh sang giáo trình này, và danh sách sách/khoá/dataset đáng dùng.

| id | bài | ưu tiên | r/x/d | F | T | A | dòng |
|---|---|---|---|---|---|---|---|
| `r-stack` | ★ Mỗi bước dùng tool gì, và gõ gì | bắt buộc | 60/0/0 |  | 8 |  | 9905–10055 |
| `r-roadmapsh` | roadmap.sh dịch ra: giữ gì, bỏ gì | nên biết | 45/0/0 |  | 8 |  | 10056–10142 |
| `r-mistakes` | 20 lỗi người mới hay mắc | bắt buộc | 30/0/0 | ✓ | 8 |  | 10143–10189 |
| `r-glossary` | Từ điển thuật ngữ | nên biết | 45/0/0 |  | 8 |  | 10190–10266 |
| `r-books` | Sách / khoá / dataset đáng dùng | nên biết | 30/0/0 |  | 8 |  | 10267–10310 |

- **`r-stack`** — Sổ tay theo bước: mở gì, gõ gì, xong có gì trong tay, bẫy nằm ở đâu.
  - dẫn tới: Bài sau dịch roadmap.sh sang giáo trình này: ô nào giữ, ô nào để sau, ô nào bỏ.
  - mở nhánh phụ: `cmp-run`, `cmp-query`, `cmp-storage`, `cmp-eda`, `cmp-dataframe`, `cmp-gbdt`, `cmp-tune`, `cmp-track`, `cmp-explain`, `cmp-serve`, `cmp-write`, `cmp-figure`, `x-notneeded`
- **`r-roadmapsh`** — roadmap.sh dịch xong: ô nào giữ, ô nào để sau, ô nào bỏ — và tám khái niệm nó không có.
  - dẫn tới: Bài sau là 20 lỗi ngốn nhiều thời gian nhất của người mới.
- **`r-mistakes`** — 20 lỗi phổ biến — đọc một lượt hôm nay, quay lại khi bí.
  - dẫn tới: Bài sau là từ điển tra nhanh, xếp theo nhóm khái niệm liên quan.
- **`r-glossary`** — Từ điển tra nhanh, xếp theo nhóm chứ không theo bảng chữ cái.
  - dẫn tới: Bài cuối là danh sách nguồn ngắn có chủ ý.
- **`r-books`** — Danh sách nguồn tối thiểu: một cuốn sách, vài paper, chỗ tìm dữ liệu.
  - dẫn tới: Hết lộ trình. Mở lại Lộ trình chuẩn 6–8 tuần (hoặc Fast track 14 ngày) và bắt đầu tuần 1.

---

## Nhánh phụ — popup toán (`data-mathdef`)

| khoá | tiêu đề | dòng | bài nào mở |
|---|---|---|---|
| `dot` | Vector và tích vô hướng — “giống nhau” đo bằng gì | 1650–1667 | `t-numpy`, `m-vector`, `dl-attn`, `dl-llm` |
| `matmul` | Ma trận — vì sao mọi lỗi đều là lỗi shape | 1668–1679 | `t-numpy`, `m-vector` |
| `deriv` | Đạo hàm & gradient — “học” thực chất là gì | 1680–1693 | `m-deriv` |
| `chain` | Quy tắc dây chuyền — cỗ máy đằng sau backpropagation | 1694–1704 | `dl-nn`, `dl-backprop` |
| `gdupdate` | Công thức cập nhật — dòng lệnh mà máy chạy hàng triệu lần | 1705–1720 | `s-lookup`, `m-deriv`, `ml-loss`, `dl-nn`, `dl-train` |
| `optzoo` | Momentum · Adam · AdamW — ba cái tên, một cái bạn dùng | 1721–1732 | `ml-loss` |
| `expvar` | Kỳ vọng, phương sai, độ lệch chuẩn | 1733–1749 | `s-how`, `d-clean`, `m-prob` |
| `normal` | Phân phối chuẩn và z-score | 1750–1762 | `m-prob` |
| `bayes` | Định lý Bayes — vì sao 99% chính xác vẫn có thể vô dụng | 1763–1778 | `s-intro`, `m-bayes` |
| `sigmoid` | Sigmoid & log-odds — biến điểm số thành xác suất | 1779–1792 | `ml-linear` |
| `logloss` | Cross-entropy (log loss) — sai số cho bài toán phân loại | 1793–1808 | `ml-loss` |
| `mse` | MSE, RMSE, MAE — sai số cho bài toán dự đoán số | 1809–1822 | `ml-linear`, `ml-loss` |
| `entropy` | Entropy & Gini — cây quyết định chọn câu hỏi thế nào | 1823–1836 | `ml-trees` |
| `reg` | Regularization L1/L2 — buộc mô hình khiêm tốn lại | 1837–1851 | `ml-overfit`, `dl-train` |
| `sincos` | Mã hoá chu kỳ bằng sin/cos — toán đằng sau nó | 1852–1876 | `s-lookup`, `f-cyclic` |
| `cyclicspline` | Periodic spline — mã hoá chu kỳ tổng quát hơn sin/cos | 1877–1884 | `f-cyclic` |
| `softmax` | Softmax — biến điểm số thành phân phối xác suất | 1885–1897 | `ml-loss`, `dl-nn`, `dl-attn`, `q-multi` |
| `attention` | Scaled dot-product attention — công thức đầy đủ | 1898–1920 | `dl-attn` |
| `posenc` | Positional encoding — công thức sin/cos trong Transformer gốc | 1921–1938 | `dl-tf` |
| `pvalue` | p-value — điều nó nói và điều nó KHÔNG nói | 1939–1960 | `m-infer`, `q-causal`, `th-stats` |
| `ci` | Khoảng tin cậy & bootstrap — cách báo cáo kết quả cho tử tế | 1961–1992 | `m-infer`, `pr-eval`, `q-causal`, `th-stats` |
| `auc` | ROC-AUC và PR-AUC — hai đường cong, hai câu chuyện | 1993–2009 | `ml-metrics`, `pr-eval` |
| `standardize` | Standardize hay Min-Max — chọn cái nào | 2010–2024 | `t-sklearn`, `m-vector`, `f-numeric` |
| `logtransform` | Vì sao lấy log của số tiền | 2025–2040 | `s-lookup`, `m-prob`, `f-numeric`, `q-regress` |
| `mcnemar` | McNemar — so hai mô hình trên cùng tập test | 2041–2059 | `m-infer`, `th-stats` |
| `colab10` | Mười khả năng của Colab — gõ gì, dùng cho việc gì | 2059–2076 | `t-colab` |
| `streamlit` | app.py — bản demo Streamlit 20 dòng | 2077–2108 | `pr-serve` |
| `paysim` | PaySim và đồ án cũ — rò rỉ nhãn, và cách biến nó thành ví dụ đối chứng | 2109–2126 | `d-data` |
| `testsuite` | Bộ test đầy đủ — 4 file, 27 test | 2127–2417 | `pr-eval` |

## Nhánh phụ — ngăn bên phải (`data-aside`)

| khoá | tiêu đề | dòng | bài nào mở |
|---|---|---|---|
| `cmp-run` | Chỗ viết và chạy code — và chỗ mượn GPU | 2427–2457 | `s-how`, `s-lookup`, `t-env`, `t-online`, `t-colab`, `r-stack` |
| `cmp-storage` | Để vài trăm MB dữ liệu ở đâu | 2458–2473 | `s-lookup`, `t-env`, `t-online`, `t-colab`, `d-data`, `r-stack` |
| `cmp-query` | Lấy dữ liệu ra: pandas, DuckDB, SQLite hay máy chủ thật | 2474–2488 | `s-lookup`, `t-sql`, `r-stack` |
| `cmp-eda` | Nhìn dữ liệu: tự viết hay để công cụ sinh báo cáo | 2489–2503 | `s-lookup`, `d-eda`, `r-stack` |
| `cmp-dataframe` | Xử lý bảng: pandas, polars hay đẩy sang SQL | 2504–2518 | `s-lookup`, `t-pandas`, `d-clean`, `r-stack` |
| `qbank` | 24 câu hội đồng hay hỏi | 2519–2580 | `th-defense` |
| `cmp-data` | Bốn bộ dữ liệu gian lận — chọn bộ nào làm chính | 2581–2598 | `d-data` |
| `cmp-gbdt` | Boosting: LightGBM, XGBoost, CatBoost hay sklearn | 2599–2613 | `s-lookup`, `t-sklearn`, `ml-trees`, `pr-code`, `r-stack` |
| `cmp-tune` | Tinh chỉnh siêu tham số: grid, random hay Optuna | 2614–2627 | `s-lookup`, `ml-tune`, `pr-eval`, `r-stack` |
| `cmp-track` | Ghi lại thí nghiệm: file CSV, MLflow hay W&amp;B | 2628–2643 | `s-lookup`, `pr-monitor`, `pr-mlops`, `r-stack` |
| `cmp-explain` | Giải thích mô hình: SHAP, permutation, LIME | 2644–2660 | `s-lookup`, `ml-shap`, `r-stack` |
| `cmp-serve` | Đóng gói và chạy thật: khung nào, đặt ở đâu | 2661–2703 | `s-lookup`, `t-online`, `pr-serve`, `r-stack` |
| `cmp-figure` | Hình cho luận văn: biểu đồ và sơ đồ kiến trúc | 2704–2728 | `s-lookup`, `th-write`, `th-tools`, `r-stack` |
| `cmp-write` | Viết luận văn: soạn thảo và quản lý trích dẫn | 2729–2752 | `s-lookup`, `t-online`, `t-ai`, `th-tools`, `r-stack` |
| `x-notneeded` | Những thứ chưa cần cho dự án này — và mốc để quay lại | 2756–2771 | `r-stack` |
| `x-la-skip` | Đại số tuyến tính: phần bỏ qua được | 2772–2777 | `m-vector` |
| `x-tree-gradient` | Cây quyết định và XGBoost có dùng gradient không? | 2778–2788 | `m-deriv` |
| `x-memorize` | Mô hình có phải “học thuộc” không? | 2789–2794 | `ml-map` |
| `x-tree-learn` | Cây và boosting thì “học” thế nào | 2795–2800 | `ml-loss` |
| `x-tf-variants` | Ba biến thể Transformer, và paper gốc | 2801–2813 | `dl-tf` |
| `x-tab-dl-zoo` | Các kiến trúc deep learning cho dữ liệu bảng | 2814–2825 | `dl-tab` |
| `x-attn-kinds` | Ba loại attention bạn sẽ gặp tên | 2826–2835 | `dl-attn` |
| `x-llm-vocab` | Từ vựng LLM để không bị hớ | 2836–2848 | `dl-llm` |
| `x-mlops-skip` | MLOps: những thứ chưa cần ở quy mô này | 2849–2861 | `pr-mlops` |
| `x-cyclic-more` | Còn cột nào có tính chu kỳ nữa | 2862–2874 | `f-cyclic` |
| `x-pipeline-bugs` | Hai lỗi Pipeline hay gặp và cách sửa | 2875–2894 | `t-sklearn`, `f-pipeline`, `pr-code` |
| `x-sklearn-imports` | Bản đồ import: cần gì thì lấy từ đâu | 2895–2907 | `t-sklearn` |
| `x-split-other` | Hai cách chia khác: phân tầng và theo nhóm | 2908–2920 | `d-split` |

## Lịch 8 tuần

| tuần | deliverable | mốc | bài |
|---|---|---|---|
| 1 | <code>docs/problem-statement.md</code> (dự đoán gì · tại thời điểm nào · sai tốn bao nhiêu) — <b>viết trước khi mở notebook</b>; repo GitHub (<code>data/</code> trong <code>.gitignore</code>); một notebook Colab clone repo và đọc được một CSV; <code>requirements.txt</code> đã ghim phiên bản. |  | `s-how` `s-intro` `s-pipeline` `s-families` `s-lookup` `s-plan8w` `s-plan14` `d-framing` `t-env` `t-online` `t-ai` `t-pandas` `t-sql` `t-numpy` `t-sklearn` |
| 2 | Datacard + <code>src/adapter.py</code> đưa nguồn thô về schema tám cột; danh sách cột nghi rò rỉ kèm lý do; <code>src/split.py</code> kèm <code>assert_split_ok</code>; <code>notebooks/01-eda.ipynb</code> + 4 hình trong <code>reports/figures/</code> (chạy trên train, sau khi đã chia) |  | `d-data` `d-leak` `d-eda` `d-split` `d-clean` `m-vector` `m-deriv` `m-prob` `m-bayes` |
| 3 | <code>src/features.py</code> + <code>src/history.py</code>; <code>src/pipeline.py</code> (Pipeline + ColumnTransformer) với một test một dòng; <code>notebooks/02-baseline.ipynb</code> chạy hết và in PR-AUC validation từ logistic; một ngưỡng chọn theo chi phí kèm ma trận chi phí FP/FN; bảng thí nghiệm có dòng 1. <i>(<code>python -m src.train</code> chỉ được yêu cầu ở tuần 5, sau bài pr-code.)</i> | Mốc 1 | `f-what` `f-numeric` `f-cat` `f-cyclic` `f-time` `f-text` `f-pipeline` `f-select` `f-store` `ml-map` `ml-linear` `ml-metrics` |
| 4 | Bảng so sánh baseline vs mô hình chính (LightGBM) trên cùng validation: PR-AUC + trung bình±độ lệch chuẩn của 5 seed; một khoảng tin cậy ghép cặp cho chênh lệch giữa hai mô hình; một hình SHAP; ngưỡng chọn lại theo chi phí cho mô hình chính. <i>(Cluster bootstrap trên dữ liệu giao dịch thật làm ở tuần 5, khi đã có tập test của sản phẩm.)</i> |  | `ml-loss` `ml-trees` `ml-overfit` `ml-cv` `m-infer` `ml-imb` `ml-tune` `ml-shap` `ml-unsup` |
| 5 | <code>python -m src.train</code> bản đầy đủ + <code>models/fraud-*.joblib</code> + metadata + ngưỡng; <code>src/evaluate.py</code> (cluster bootstrap CI + <code>paired_ci</code>); <code>src/rules.py</code> + bảng ba dòng không-làm-gì/luật/mô hình trên cùng tập test; bảng FPR theo nhóm; API FastAPI + <code>Dockerfile</code>; hàm PSI; CI chạy <code>pytest</code> |  | `pr-arch` `pr-code` `pr-eval` `pr-serve` `pr-monitor` `pr-mlops` `pr-cost` |
| 6 | Một notebook train một mạng nhỏ tới hội tụ, có vẽ đường cong loss; ba câu tự giải thích attention bằng lời của bạn |  | `t-colab` `dl-nn` `dl-backprop` `dl-train` `dl-embed` `dl-cnn-rnn` `dl-attn` `dl-tf` `dl-llm` `dl-tab` |
| 7 | Hai mini-project làm thật (mỗi cái một notebook + bảng “giữ gì / đổi gì” so với fraud); bốn đề còn lại chỉ cần bảng giữ/đổi ở mức phác thảo | Mốc 2 | `q-regress` `q-forecast` `q-multi` `q-nlp` `q-cv` `q-rec` `q-causal` `q-analytics` `q-mini` |
| 8 | <code>research-question.md</code>; reading-note skeleton + lượt 1–2 cho một paper; <b>reproduction report skeleton</b>; bảng ablation + registry thí nghiệm; kiểm định ghép cặp; <b>thesis skeleton</b> (mapping artifact→chương); defense-plan skeleton. <i>(Lượt đọc 3, viết luận văn hoàn chỉnh, tái lập một paper thật, làm slide/rehearsal và bảo vệ nằm NGOÀI 8 tuần — cần nhiều tuần/tháng và phản hồi mentor.)</i> | Mốc 3 | `th-topic` `th-read` `th-repro` `th-design` `th-stats` `th-write` `th-tools` `th-defense` `r-stack` `r-roadmapsh` `r-mistakes` `r-glossary` `r-books` |

## Nhóm năng lực

| # | nhóm | bằng chứng | bài |
|---|---|---|---|
| 1 | Định vị một bài toán mới | docs/problem-statement.md + định vị bằng 8 câu hỏi | `s-families` `s-lookup` `d-framing` |
| 2 | Xây dựng dữ liệu đáng tin | EDA notebook + data/README (datacard) + danh sách rò rỉ | `d-data` `d-eda` `d-clean` `d-leak` |
| 3 | Pipeline tái lập | pipeline.py + python -m src.train + split asserts + seed/pin | `d-split` `f-pipeline` `pr-code` `pr-mlops` |
| 4 | Đánh giá mô hình đúng | evaluate.py (cluster + paired bootstrap) + kiểm định ghép cặp | `ml-cv` `ml-metrics` `pr-eval` `th-stats` |
| 5 | Chuyển xác suất thành quyết định | ngưỡng theo chi phí + ma trận chi phí + phân tích độ nhạy | `ml-metrics` `pr-eval` `pr-cost` |
| 6 | Đưa mô hình thành product nhỏ | FastAPI + Dockerfile + PSI — mức DEMO bảo vệ, không phải vận hành 24/7 | `pr-arch` `pr-serve` `pr-monitor` |
| 7 | Nghiên cứu ứng dụng | proposal + reproduction report skeleton + registry — KHUNG, không phải một nghiên cứu hoàn chỉnh | `th-topic` `th-read` `th-repro` `th-design` |
| 8 | Viết và bảo vệ | IMRaD skeleton + defense checklist + rehearsal — luận văn & bảo vệ THẬT cần nhiều tuần/tháng + mentor | `th-write` `th-tools` `th-defense` |
| 9 | Chuyển giao sang domain khác | 2 mini-project chuyển giao + bảng "giữ gì / đổi gì" | `s-families` `q-forecast` `q-mini` |
