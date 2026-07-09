# Thí nghiệm backtest chiến lược lô tô (XSMB)

> Tài liệu kiểu *paper* mô tả mô hình thí nghiệm trong tab **🧪 Thí nghiệm** của `loto.html`: câu hỏi nghiên cứu, dữ liệu, phương pháp, độ đo, kết quả kỳ vọng và hạn chế. Mục tiêu để một người (hoặc một AI) khác đọc là tái lập và phản biện được. Phần mô tả trang chính xem [`loto-summary.md`](./loto-summary.md).

---

## Tóm tắt (Abstract)

Chúng tôi đặt câu hỏi: **có chiến lược chọn số nào, dựa trên lịch sử XSMB, đem lại lợi thế so với chơi ngẫu nhiên không?** Để trả lời, trang dựng một khung **backtest walk-forward** (kiểm thử tiến theo thời gian, không nhìn trước tương lai) trên ~20 năm kết quả XSMB nhúng sẵn. Với mỗi ngày mục tiêu *t* trong khoảng kiểm thử, mô hình chỉ dùng dữ liệu **trước** *t* để chấm điểm 100 số (00–99), chọn *n* số điểm cao nhất, mô phỏng người chơi đánh lô *n* số đó, rồi đối chiếu với kết quả thật của *t*. Lặp trên toàn khoảng và tổng hợp **ROI, tỉ lệ lỗ, tỉ lệ trúng, tỉ lệ ngày có lãi**. Một **đường đối chứng ngẫu nhiên** (chọn *n* số bất kỳ) được chạy song song.

Kết quả tái lập đúng lý thuyết: (i) **ROI trung bình của mọi chiến lược đều âm** và hội tụ về **lợi thế nhà cái** (≈ −6% với cấu hình lô 23/80); (ii) **không** chiến lược nào vượt đường ngẫu nhiên ngoài khoảng nhiễu; (iii) **tỉ lệ lỗ** thay đổi theo *n* nhưng đó là hệ quả thuần của **cơ chế trả thưởng**, không phải năng lực dự đoán; (iv) việc dò nhiều cấu hình (*n* × chiến lược) luôn làm lộ ra vài ô ROI dương **do may rủi** — minh hoạ trực quan cái bẫy *data snooping*. Thí nghiệm vì vậy củng cố thông điệp của trang: xổ số là trò chơi công bằng, kỳ vọng âm; công cụ để **hiểu**, không phải để **thắng**.

---

## 1. Giới thiệu & câu hỏi nghiên cứu

Tab Thống kê đã cho thấy ba bằng chứng định lượng rằng XSMB hành xử ngẫu nhiên & công bằng: kiểm định **χ²** không bác bỏ tính đồng đều, các kỳ quay **độc lập** (hôm nay không dự đoán hôm sau), và **kỳ vọng âm** (lợi thế nhà cái). Tuy nhiên người chơi thường tin rằng "đọc cầu" từ lịch sử (lô gan, nóng/lạnh, cầu theo ngày…) tạo ra lợi thế. Thí nghiệm này kiểm tra niềm tin đó một cách **định lượng và có thể tái lập**.

**Giả thuyết H₀ (vô hiệu):** mọi chiến lược chọn số dựa trên lịch sử có hiệu năng (ROI) **không khác** chọn ngẫu nhiên; kỳ vọng dài hạn bằng lợi thế nhà cái.

**Giả thuyết H₁ (đối):** tồn tại ít nhất một chiến lược cho ROI dương bền vững, hoặc vượt trội đường ngẫu nhiên ngoài khoảng nhiễu.

Khung backtest dưới đây nhằm **bác bỏ hay không bác bỏ** H₀ trên dữ liệu thật.

---

## 2. Dữ liệu

- **Nguồn:** toàn bộ lịch sử XSMB nhúng sẵn trong `loto.html` (kho mở `khiemdoan/vietnam-lottery-xsmb-analysis`), ~7.470 ngày (2005-10-01 → nay). Có thể thay bằng dữ liệu người dùng (CSV/JSON) — thí nghiệm tự đọc lại `DATA` hiện hành.
- **Đơn vị ngày:** mỗi ngày là `{ ymd, counts: Int16Array(100), special }`, trong đó `counts[k]` = số lần số *k* (00–99) "về" trong 27 lô của ngày đó; `special` = số đề (2 số cuối giải ĐB).
- **Toàn bộ input của thí nghiệm chính là dữ liệu & thống kê của tab Thống kê** — không có nguồn ngoài nào khác. Mọi tần suất đều suy ra từ `counts`.

**Tiền xử lý (precompute), dựng 1 lần và cache theo chữ ký dữ liệu:**

- **Tổng tích lũy (prefix sums)** `PREFIX[i][k] = Σ_{j<i} counts[j][k]`, cho phép tính **tần suất cửa sổ** `[a,b)` trong O(1): `freq[k] = PREFIX[b][k] − PREFIX[a][k]`.
- **Chỉ mục mùa vụ** `SEAS["MM-DD"] = [danh sách index các ngày cùng ngày-tháng]`, phục vụ chiến lược "cùng ngày các năm".

---

## 3. Phương pháp (Methodology)

### 3.1 Giao thức backtest walk-forward (không nhìn trước)

Cho khoảng kiểm thử [*t₀, t₁*]. Với **mỗi** ngày mục tiêu *t* (index `ti`) trong khoảng:

1. **Chỉ** dùng dữ liệu có `ymd < ymd(t)` (đối với mùa vụ: cả `year < year(t)`). Không một bit nào của ngày *t* hay tương lai lọt vào bước chấm điểm ⇒ **không rò rỉ tương lai (no lookahead / no leakage)**.
2. Chấm điểm 100 số → xếp hạng → chọn *n* số.
3. Mở kết quả thật của *t* để tính lãi/lỗ.
4. Ghi nhận hiệu năng cho **mọi** *n* = 1…N_max trong **một lượt** (xem 3.3).

Đây là chuẩn mực đánh giá mô hình chuỗi thời gian: huấn luyện trên quá khứ, kiểm thử trên "tương lai" (đối với thời điểm ra quyết định).

### 3.2 Mô hình chấm điểm (scoring)

Mỗi chiến lược ánh xạ lịch sử trước *t* thành một vector điểm `score[0..99]`. Số nào điểm cao ⇒ mô hình "tin" dễ về hơn. Các chiến lược:

| Khoá | Tên | Điểm `score[k]` |
|------|-----|------------------|
| `L30` | 30 ngày | tần suất *k* trong 30 ngày ngay trước *t* |
| `L60` | 60 ngày | tần suất *k* trong 60 ngày trước *t* |
| `L100`| 100 ngày | tần suất *k* trong 100 ngày trước *t* |
| `SEA` | Cùng ngày các năm | tổng `counts[k]` của tất cả các ngày **cùng MM-DD**, **năm < năm(t)** |
| `L60S`| 60 ngày + mùa vụ | trộn 50/50 hai phân phối đã chuẩn hoá: `0.5·p_recency + 0.5·p_seasonal` |
| `RND` | Ngẫu nhiên (đối chứng) | hoán vị ngẫu nhiên có seed của 00–99 (không dùng lịch sử) |

- **Trực giác:** đây đều là biến thể của "đánh theo số **nóng**" (chọn số hay về). Phép trộn `L60S` cho mùa vụ một tiếng nói thật sự bằng cách chuẩn hoá mỗi nguồn về phân phối xác suất trước khi cộng (nếu không, recency với ~1.620 lô sẽ át mùa vụ với ~500 lô).
- **Vì sao có `RND`:** đối chứng cốt lõi. Nếu các chiến lược "thông minh" không tách khỏi `RND`, ta **không bác bỏ H₀**.

> Ghi chú thiết kế: ta cố tình **không** thêm chiến lược "đánh số gan/lạnh" làm mặc định, vì mục tiêu là kiểm định đúng phát biểu của người dùng ("đánh *n* số xác suất cao nhất"). Người đọc muốn kiểm tra phe "gan" chỉ cần đảo dấu xếp hạng — kết quả đối xứng và vẫn hội tụ về lợi thế nhà cái.

### 3.3 Quy tắc chọn số (selection)

Xếp hạng các số theo `score` giảm dần, **phá hoà** theo số nhỏ trước (đảm bảo *tất định*). Với mỗi *n*, "vé cược" = *n* số đầu bảng. Nhờ tính lồng nhau (top-(n+1) = top-n ∪ {số kế tiếp}), ta tính hiệu năng cho **mọi** *n* = 1…N_max chỉ bằng **một** lần duyệt tích luỹ trên bảng xếp hạng — rẻ về tính toán. Mặc định **N_max = 40**.

### 3.4 Mô hình cá cược & kinh tế (betting model)

Dùng đúng mô hình "lô bạch thủ" của tab Thống kê (ô EV), tham số chỉnh được:

- Đánh **1 điểm** cho mỗi số trong *n* số ⇒ **chi phí** = `n × cost` (mặc định `cost = 23`).
- Mỗi lần một số về (một **"nháy"**) được trả `pay` (mặc định `pay = 80`, đổi được — vd "1 ăn 99" ⇒ `pay = 99`). Một số có thể về **nhiều nháy/ngày** và **mỗi nháy ăn riêng, không giới hạn**.
- **Hoàn trả (gross)** ngày *t* = `(Σ_{k∈vé} counts_t[k]) × pay`, trong đó `counts_t[k]` chính là **số nháy** của số *k* trong 27 lô ngày *t*.
- **Lãi/lỗ (net)** = hoàn trả − chi phí.

Ở đây `counts_t[k]` đúng là số nháy: parser đếm `counts[x]++` cho từng giải trong 27 lô, nên số nào ra 2 lần ⇒ `counts = 2`, ra 3 lần ⇒ `counts = 3`. Engine cộng dồn `nhay += counts_t[k]` rồi nhân `pay`, **đúng luật lô thực tế** (ăn theo số lần về).

**Ví dụ** — đánh 1 con (vd số 01), `cost = 23`:

| Số đã đánh ra mấy nháy | Hoàn trả gross (ăn 80) | Lãi/lỗ net | (ăn 99) gross | net |
|---|---|---|---|---|
| 0 | 0 | **−23** | 0 | **−23** |
| 1 | 80 | +57 | 99 | +76 |
| 2 | 80×2 = 160 | **+137** | 99×2 = 198 | **+175** |
| 3 | 80×3 = 240 | **+217** | 99×3 = 297 | **+274** |

> **Ba con số dễ nhầm khi đọc UI:** (1) *Hoàn trả gross* = tổng nháy × pay (đúng kiểu "ăn 80×2"); (2) *ROI / Tổng lãi-lỗ* trong bảng & chart là **net** = gross − tiền cược (đo có lãi thật hay không); (3) *Tỉ lệ trúng* đếm theo **con trúng** (mỗi con về tính 1, **không** nhân nháy) — nó đo độ chính xác dự đoán; phần nháy chỉ tác động tới tiền.

Vì `E[counts_t[k]] = 27/100 = 0.27` cho **mọi** *k* (do độc lập & đồng đều), kỳ vọng lãi mỗi điểm là `0.27·pay − cost`, độc lập với việc chọn số nào:

```
EV_mỗi_điểm = 0.27 × pay − cost          (với 23/80 ⇒ 21.6 − 23 = −1.4)
ROI_kỳ_vọng = (0.27 × pay − cost) / cost  (với 23/80 ⇒ −6.1%)
```

Đây là **trần lý thuyết** mà mọi chiến lược phải hội tụ về — vẽ thành đường tham chiếu "nhà cái" trên biểu đồ ROI.

### 3.5 Độ đo (metrics)

Với mỗi (chiến lược, *n*), tổng hợp trên tập ngày hợp lệ:

- **ROI** = `Σ lãi/lỗ ÷ Σ chi phí` (%). *Độ đo trung tâm về kinh tế.*
- **Tỉ lệ lỗ** = % số ngày có lãi/lỗ < 0. *"Tần suất thua" mà người chơi cảm nhận.*
- **Tỉ lệ ngày có lãi** = % số ngày lãi/lỗ > 0.
- **Tỉ lệ trúng** = trung bình `(số con trúng ÷ n)` mỗi ngày (%). *Kỳ vọng ≈ tỉ lệ về nền ≈ 24%.*
- **Tổng lãi/lỗ** tích luỹ (đơn vị "k" / "tr").

### 3.6 Tập ngày hợp lệ & so sánh công bằng

Một chiến lược **không hợp lệ** ở ngày *t* nếu thiếu lịch sử (vd `L100` cần `ti ≥ 100`; `SEA`/`L60S` cần có năm trước cùng MM-DD). Để so sánh **công bằng**, mọi biểu đồ và bảng dùng **giao** các ngày mà **tất cả** chiến lược được chọn đều hợp lệ ("ngày hợp lệ chung"). Chiến lược không có ngày hợp lệ nào (vd dữ liệu mẫu chỉ 1 năm ⇒ không có mùa vụ) bị **loại** kèm thông báo, thay vì làm hỏng phép so sánh.

---

## 4. Thiết lập, điều khiển & đầu ra (cách dùng tab)

### 4.1 Tham số mặc định

| Tham số | Mặc định | Ghi chú |
|---------|----------|---------|
| Khoảng kiểm thử | 365 ngày gần nhất | nút nhanh 180N / 1 năm / 2 năm / 5 năm; hoặc chọn Từ–Đến |
| Chiến lược | cả 6 | bật/tắt từng cái |
| `cost`, `pay` | 23, 80 | đồng bộ mô hình EV của tab Thống kê |
| N_max | 40 | trục *n* của biểu đồ 1 & biên thanh trượt biểu đồ 2 |
| Đối chứng | `RND` | seed tất định theo `ti` (xem Phụ lục C) |

### 4.2 Điều khiển (inputs trên giao diện)

- **Kiểm thử từ … đến …** + nút nhanh **180N / 1 năm / 2 năm / 5 năm** — chọn khoảng các ngày *t* để backtest.
- **Giá 1 điểm** (`cost`) và **Ăn / nháy** (`pay`) — tham số kinh tế; đổi để thử kèo khác (vd 1 ăn 99).
- **Chiến lược** — 6 ô bật/tắt (30/60/100 ngày, cùng ngày các năm, 60 ngày + mùa vụ, ngẫu nhiên). Tắt bớt để biểu đồ gọn hoặc để nới "tập ngày hợp lệ chung" (xem 3.6).
- **▶ Chạy thí nghiệm** — chạy lại toàn bộ. Thí nghiệm **cũng tự chạy** khi: mở tab lần đầu, đổi bất kỳ điều khiển nào ở trên, hoặc đổi nguồn dữ liệu rồi quay lại tab.
- **Dòng trạng thái** (ngay dưới thanh điều khiển): *"Đã chạy trên N ngày · M ngày hợp lệ chung · K chiến lược · cược cost/điểm, ăn pay/nháy"*, kèm cảnh báo nếu có chiến lược bị **loại do thiếu dữ liệu**.

### 4.3 Đầu ra (outputs)

**Bốn thẻ KPI** (tổng hợp nhanh):

| Thẻ | Ý nghĩa |
|-----|---------|
| **n ít lỗ nhất** | giá trị *n* cho **tỉ lệ lỗ thấp nhất** (xét các chiến lược ≠ ngẫu nhiên), kèm tên chiến lược & % ngày vẫn lỗ |
| **ROI cao nhất (1 cấu hình)** | ROI lớn nhất trong **mọi** ô (chiến lược × *n*) — cố tình phơi bày **nhiễu do dò nhiều cấu hình**, không phải lợi thế thật |
| **Lợi thế nhà cái (lý thuyết)** | `ROI_trần = (0.27·pay − cost)/cost` — mốc mọi chiến lược hội tụ về |
| **Tốt nhất vs ngẫu nhiên** | chênh **ROI trung bình** (lấy trung bình theo mọi *n*) giữa chiến lược tốt nhất (≠ RND) và `RND` — kỳ vọng ≈ 0, nằm trong khoảng nhiễu |

**Biểu đồ 1 — "Chọn *n* tối ưu":** trục ngang *n* = 1…N_max, mỗi đường một chiến lược. Công tắc **độ đo: Tỉ lệ lỗ / ROI / Tỉ lệ trúng** (đơn vị %). Ở chế độ **ROI** có **đường tham chiếu đứt nét "nhà cái −X%"**; điểm tối ưu mỗi đường được **khoanh tròn** (min tỉ lệ lỗ / max ROI / max tỉ lệ trúng tuỳ độ đo).

**Biểu đồ 2 — "So sánh giữa các ngày":** **thanh trượt *n*** (1…N_max) cố định số con đánh; vẽ **lãi/lỗ tích luỹ** theo từng ngày kiểm thử (trục ngang: ngày, cũ→mới; trục dọc: tiền k/tr; có đường 0) cho mỗi chiến lược **trên cùng tập ngày hợp lệ chung**. Đường đi xuống ⇒ càng chơi càng lỗ.

**Bảng tổng hợp** (tại đúng *n* của thanh trượt) — mỗi dòng một chiến lược, cột: **Ngày** (số ngày hợp lệ) · **ROI** · **Tỉ lệ lỗ** · **Ngày có lãi** · **Tỉ lệ trúng** · **Tổng lãi/lỗ**. ROI/Tổng lãi-lỗ âm tô đỏ, dương tô xanh.

**Khối "Kết luận thí nghiệm"** — đoạn văn **tự sinh theo số liệu lần chạy**: ROI trung bình mọi chiến lược ≈ lợi thế nhà cái; chênh so với ngẫu nhiên nằm trong nhiễu; phân tích *n* (tỉ lệ lỗ thấp nhất ở *n** nhưng do payout, không do dự đoán); cảnh báo *data snooping* (nếu có ô ROI dương); và kết luận chung.

---

## 5. Kết quả & diễn giải (kỳ vọng trên dữ liệu thật)

### 5.1 ROI hội tụ về lợi thế nhà cái
Khi *n* nhỏ, ROI dao động mạnh (phương sai lớn vì ít số, ít nháy); khi *n* tăng, mọi đường — kể cả `RND` — **co về** đường tham chiếu ≈ −6.1%. Đây là **luật số lớn** tác động lên một trò chơi kỳ vọng âm: càng nhiều cược, kết quả càng bám kỳ vọng.

### 5.2 Tỉ lệ lỗ phụ thuộc *n* — nhưng vì *payout*, không phải dự đoán
Tỉ lệ lỗ thường thấp nhất ở *n* nhỏ (quanh **n = 3** với 23/80) rồi tăng dần. Lý do hoàn toàn **cơ học**: một nháy trả 80, trong khi tổng cược là `23×n`. Khi `23×n < 80` (tức `n ≤ 3`), **chỉ một** nháy cũng đủ có lãi ⇒ dễ "ngày có lãi"; khi *n* lớn, cần nhiều nháy hơn để hoà, nên gần như chắc chắn âm nhẹ. Vậy chọn *n* chỉ **đổi hình dạng rủi ro** (thắng-nhỏ-thường-xuyên ↔ thua-đều-đặn-ít), **không đổi kết cục dài hạn** (ROI vẫn ≈ −6%). Đây là một kết quả tinh tế và đúng: "tối ưu *n*" có nghĩa với *tần suất lỗ*, nhưng vô nghĩa với *kỳ vọng*.

### 5.3 Không chiến lược nào vượt ngẫu nhiên
Tỉ lệ trúng của mọi chiến lược ≈ **tỉ lệ về nền ~24%** (= xác suất một số bất kỳ về trong ngày). Các "chiến lược thông minh" không nâng được tỉ lệ trúng trên mức nền — đúng vì các kỳ **độc lập**. Khoảng cách ROI giữa chiến lược tốt nhất và `RND` nằm gọn trong **khoảng nhiễu** ⇒ **không bác bỏ H₀**.

### 5.4 Bẫy "dò quá khứ" (data snooping / multiple testing)
Vì ta dò **N_max × số_chiến_lược** ô (vd 40×5 = 200), kiểu gì cũng có **vài ô ROI dương** thuần do may rủi — KPI "ROI cao nhất (1 cấu hình)" cố tình phơi bày điều này. Đổi khoảng kiểm thử hoặc chạy lại, ô "thắng" **nhảy chỗ khác**: đó là dấu hiệu kinh điển của overfitting, và là lý do các "hệ thống thắng số" backtest đẹp đẽ luôn sụp khi ra tương lai. Việc trình bày *cả* ô thắng giả này (kèm cảnh báo) là một lựa chọn sư phạm có chủ đích.

---

## 6. Thảo luận

Ba quan sát của thí nghiệm là hệ quả trực tiếp của ba tính chất ở tab Thống kê:

- **Độc lập** ⇒ điểm số từ lịch sử không mang thông tin về *t* ⇒ (5.3).
- **Đồng đều (χ²)** ⇒ `E[counts_t[k]] = 0.27 ∀k` ⇒ ROI kỳ vọng bằng nhau cho mọi vé ⇒ (5.1).
- **Kỳ vọng âm (EV)** ⇒ trần ROI < 0 ⇒ không "tối ưu hoá" nào kéo lên dương được ⇒ (5.2, 5.4).

Thí nghiệm vì thế **không** đưa tri thức mới về cách thắng; nó **chuyển** ba định lý tĩnh thành một **mô phỏng động, trực quan** để người xem *thấy* tiền rời túi theo thời gian dù chọn số kiểu gì.

---

## 7. Hạn chế (limitations)

1. **Mẫu mùa vụ nhỏ:** "cùng ngày các năm" chỉ có ~15–20 điểm dữ liệu/ngày ⇒ ước lượng nhiễu; chủ ý giữ trung thành với phát biểu, đổi lại phương sai cao.
2. **Mô hình cá cược đơn giản hoá:** bỏ qua phí/hoa hồng biến thiên theo nhà cái, giới hạn cược, làm tròn; chỉ xét "lô bạch thủ", chưa xét đề/xiên/3 càng.
3. **Một đường ngẫu nhiên/ngày:** `RND` lấy 1 hoán vị có seed mỗi ngày (đủ đại diện khi tổng hợp trên hàng trăm ngày), không phải trung bình Monte-Carlo nhiều lần.
4. **Khoảng kiểm thử hữu hạn:** ROI lẻ ở *n* nhỏ có phương sai lớn; muốn kết luận chắc, nên dùng khoảng dài (2–5 năm) để các đường co sát trần lý thuyết hơn.
5. **Phá hoà tất định** có thể thiên vị nhẹ số nhỏ khi nhiều số đồng điểm (hay gặp ở mùa vụ thưa) — ảnh hưởng không đáng kể tới ROI tổng hợp.

---

## 8. Kết luận

Trên ~20 năm XSMB thật, khung backtest walk-forward **không tìm thấy** chiến lược chọn số nào thắng được nhà cái: ROI trung bình của mọi chiến lược đều âm và hội tụ về lợi thế nhà cái, không cái nào vượt ngẫu nhiên ngoài khoảng nhiễu, và mọi "ô thắng" lẻ đều là tạo tác của việc dò nhiều cấu hình. **Không bác bỏ H₀.** Phù hợp với toàn bộ tinh thần của trang: xổ số công bằng & kỳ vọng âm — công cụ này để **hiểu** trò chơi, không phải để **thắng** nó.

---

## Phụ lục A — Công thức

Cho ngày *t*, vé *V* gồm *n* số, kết quả thật `counts_t`:

```
nháy(V,t)   = Σ_{k∈V} counts_t[k]
hoàn trả     = nháy(V,t) × pay
lãi/lỗ(V,t)  = nháy(V,t) × pay − n × cost
trúng(V,t)   = |{ k∈V : counts_t[k] > 0 }|

ROI(chiến lược, n)   = Σ_t lãi/lỗ ÷ Σ_t (n × cost)
TỉLệLỗ(chiến lược,n) = |{ t : lãi/lỗ(V_t,t) < 0 }| ÷ |T|
TỉLệTrúng(...,n)     = mean_t ( trúng(V_t,t) / n )

EV_mỗi_điểm = 0.27 × pay − cost
ROI_trần    = (0.27 × pay − cost) / cost
```

## Phụ lục B — Mã giả (pseudocode)

```text
buildIndex():                       # 1 lần, cache theo (len, ngày đầu, ngày cuối)
  PREFIX[i][k] = Σ_{j<i} counts[j][k]
  SEAS["MM-DD"] += i

ranking(strategy, ti):              # KHÔNG nhìn dữ liệu ≥ ti
  L30/L60/L100: freq = PREFIX[ti] − PREFIX[ti−L];     order = argsort↓(freq)
  SEA:          freq = Σ counts[j], j cùng MM-DD và năm<năm(ti); order = argsort↓
  L60S:         order = argsort↓( 0.5·norm(recency60) + 0.5·norm(seasonal) )
  RND:          order = shuffle(0..99) với seed = hash(ti)

runExperiment(t0,t1,cost,pay,strats):
  for ti in [t0..t1]:
    for s in strats:
      ord = ranking(s, ti); if !ok: mark invalid; continue
      nhay=0; hits=0
      for m in 0..N_max−1:                 # tính MỌI n trong một lượt
        k = ord[m]; nhay += counts[ti][k]; if counts[ti][k]>0: hits++
        profit[s][ti][m] = nhay·pay − (m+1)·cost
        hits[s][ti][m]   = hits
  aggregate over "ngày hợp lệ chung" → ROI, TỉLệLỗ, TỉLệTrúng, …
```

## Phụ lục C — Tái lập (reproducibility)

- **Tất định:** không dùng `Date.now()`/đồng hồ trong tính toán; đường ngẫu nhiên `RND` seed bằng hàm băm của chỉ số ngày `ti` (`mulberry32(ti·2654435761)`), nên **cùng dữ liệu + cùng tham số ⇒ cùng kết quả** ở mọi lần chạy, mọi máy.
- **Một nguồn sự thật:** thí nghiệm đọc trực tiếp `DATA` đang dùng ở tab Thống kê; đổi nguồn dữ liệu (Cập nhật / nạp CSV-JSON) rồi mở lại tab Thí nghiệm sẽ tự chạy lại trên dữ liệu mới (phát hiện qua "chữ ký dữ liệu").
- **Vị trí mã:** toàn bộ engine nằm trong khối IIFE cuối `loto.html` (các hàm `buildIndex`, `winFreq`, `seasonFreq`, `ranking`, `runExperiment`, `aggregate`, `chartLines`, `render*`). Không phụ thuộc thư viện ngoài.
