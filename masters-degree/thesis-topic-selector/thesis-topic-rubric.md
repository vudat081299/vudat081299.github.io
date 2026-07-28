# Bộ tiêu chí verify đề tài — bản riêng cho `thesis-topic-selector`

Bộ này chấm các đề tài trong `thesis-topic-selector.html` (**90 đề tài, 16 lĩnh vực** — bản 7 của page: 100 đề tài trừ 13 bị loại bằng chính bộ này, cộng 4 đề tài `#101`–`#104` hợp nhất từ nhánh rà soát và trừ 1 đề tài bị gộp vì trùng; số `#N` của các đề tài còn lại giữ nguyên nên dãy số có lỗ). Nó **không phải** rubric thạc sĩ dùng chung — nó dùng đúng các trường dữ liệu và đúng các thang đo mà page đó đã có, để kết quả chấm cắm được trở lại vào page thay vì nằm rời trong một file điểm.

Tài liệu này chỉ định nghĩa tiêu chí. Nó không chứa kết quả chấm đề tài nào.

---

## 0. Vì sao không dùng rubric thang-100 chung

Bản chung phổ biến chấm 7 trục 0–5, nhân trọng số thập phân, cộng thành thang 100, rồi cắt verdict ở 80 / 65 / 50. Bốn vấn đề khiến nó không dùng được cho page này:

**a. Độ chính xác giả.** Chấm chủ quan 6 bậc rồi nhân `1.6` và `1.4` rồi cắt ngưỡng ở 64/65 — chênh một điểm không ai đo được nhưng lại đổi verdict. Hai người chấm cùng một đề tài lệch ±10 điểm là bình thường, tức lệch trọn một bậc verdict.

**b. Cộng dồn sai bản chất.** Luận văn chết theo kiểu **hội tụ**, không phải cộng dồn: không xin được dữ liệu thì đóng góp hay, phương pháp chặt, tác động cao đều vô nghĩa. Ràng buộc bó nhất quyết định kết quả. Rule chữa cháy kiểu "trục A hoặc C ≤ 1 thì trần verdict là MAJOR_REVISION" là miếng dán trên một mô hình sai, không phải mô hình đúng.

**c. Trục trùng nhau nên bị đếm hai lần.** "Dữ liệu" và "khả thi" chồng nhau nặng (không có dữ liệu thì đương nhiên không khả thi). "Phương pháp" và "đóng góp" cũng vậy. Cộng dồn hai trục tương quan là khuếch đại một yếu tố.

**d. Thiếu đúng trục mà page này coi là quyết định.** Page ghi ở mục "Trước khi cam kết": *có thầy hướng dẫn hiểu lĩnh vực đó là yếu tố quyết định lớn nhất, lớn hơn cả độ hay của đề tài.* Rubric chung không có trục này. Page cũng có trường `know` (gánh nặng kiến thức ngành, thấp/tb/cao) với khoảng cách thực tế 2 tuần so với 8 tuần — rubric chung gộp nó vào "learning curve" chung với compute.

Bộ dưới đây thay cộng dồn bằng **ràng buộc bó nhất**, thay điểm số bằng **mức + hiện vật**, và dùng đúng thang của page.

---

## 1. Trường dữ liệu của page (schema đầu vào)

Mỗi đề tài trong page là một object trong `TOPICS`. Chấm được hay không phụ thuộc các trường này có nội dung thật hay không.

| Trường | Thang / dạng | Vai trò khi chấm |
|---|---|---|
| `id` | chuỗi (`a01`…`z02`) | Khoá thật của đề tài — tiền tố theo lĩnh vực, **không** phải `t` + số thứ tự |
| `n` | 1–104, **có lỗ** | Số hiển thị `#N`. Mọi ghi chú trong page tham chiếu theo số này, nên nó **không được đánh lại** sau khi loại đề tài — 14 số đã biến mất (#26 #28 #51 #53 #57 #63 #69 #74 #77 #78 #84 #86 #89 #98) và đó là chủ ý. Bốn số `#101`–`#104` là phần hợp nhất từ nhánh rà soát, đánh số nối tiếp để không đụng #49–#52 |
| `dom` | id lĩnh vực | Một trong 16 `DOMAINS`. Cần cho lượt tổng ở mục 10 |
| `t` | chuỗi | Tên đề tài |
| `q` | chuỗi | **Câu hỏi nghiên cứu** — phải là câu hỏi có thể trả lời sai |
| `data` | chuỗi | Nguồn dữ liệu cụ thể (tên bộ, cách truy cập, license) |
| `contrib` | chuỗi | Đóng góp — thứ bàn giao lại cho người sau |
| `d.method` | chuỗi | Phương pháp, baseline, metric, cách chia tập |
| `d.why` | chuỗi | Vì sao không tầm thường |
| `d.risk` | chuỗi | Rủi ro chính và cách thu hẹp |
| `d.learn` | chuỗi | Nền phải học + số tuần |
| `d.spike` | chuỗi | **Spike 5 ngày** — phép thử giết đề tài sớm |
| `diff` | 1–5 | Độ khó |
| `risk` | `thap` / `tb` / `cao` | Rủi ro **dữ liệu** |
| `compute` | `thap` / `tb` / `cao` | Nhu cầu tính toán |
| `know` | `thap` / `tb` / `cao` | Gánh nặng kiến thức ngành |
| `mobile` | bool | Có tận dụng nền mobile không |
| `vn` | bool | Có góc Việt Nam không |
| `impact.s` | 1–5 | Điểm tác động |
| `impact.who` | chuỗi | Ai được lợi |
| `impact.pay` | chuỗi | Ai trả tiền (đường ra tiền) |
| `impact.out` | chuỗi | Bàn giao được cái gì |

**Neo nghĩa của `impact.s`** (lấy từ `IMP_WORD` trong page, không tự định nghĩa lại):
`5` = ra sản phẩm · `4` = ứng dụng rõ · `3` = học thuật · `2`–`1` = hẹp.

### 1a. `impact.*` KHÔNG nằm trong object đề tài — đọc trước khi xuất diff

Bốn trường `impact.*` sống trong một map riêng, `IMPACT`, khoá theo `id`, và chỉ được gắn vào đề tài lúc render:

```js
t.impact = IMPACT[t.id] || { s:3, who:"—", pay:"—", out:"—" };
```

Ba hệ quả bắt buộc nhớ:

1. **Sửa `impact.*` là sửa `IMPACT[id]`**, không phải sửa object trong `TOPICS`. Diff nhắm sai chỗ thì không áp được — xem `sua_truong.IMPACT` ở mục 8.
2. **Fallback `s:3` là cái bẫy.** Đề tài thiếu entry trong `IMPACT` không báo lỗi mà lặng lẽ thành "3 điểm, `who`/`pay`/`out` = —". Vì vậy `impact.s: 3` **không tự động** là một điểm đã được cân: phải kiểm `who`/`pay`/`out` có phải `—` hay không. Nếu là `—` thì đó là **thiếu dữ liệu**, verdict `THIEU_THONG_TIN`, không phải "đề tài học thuật".
3. Khi thêm đề tài mới, thêm entry `IMPACT` cùng lúc — nếu không, quy tắc thiếu trường bên dưới không bắt được.

**Quy tắc thiếu trường** (siết lại so với bản đầu — chỉ kiểm rỗng thì không bao giờ bật, xem 1b):

| Điều kiện | Verdict |
|---|---|
| `q`, `data`, hoặc `d.spike` rỗng, hoặc chỉ là chủ đề chung không có phép thử | `THIEU_THONG_TIN` |
| `IMPACT[id]` không tồn tại, hoặc `who`/`pay`/`out` là `—` | `THIEU_THONG_TIN` |
| `data` **nêu tên nguồn nhưng không có đường truy cập** (link/registry/thủ tục xin) hoặc **không nói license** | `THIEU_THONG_TIN` cho phần B2 — đây là ca hay bật nhất, đừng bỏ qua |
| Thiếu `d.why` | chấm được, ghi là thiếu, V2 không được xếp `TOT` |

Trong mọi ca trên: liệt kê đúng trường thiếu, **không tự bổ sung giả định để chấm cho đủ**.

### 1b. Thang khai báo vs thang thực dùng — đọc trước khi tin vào con số

Đo trên 90 đề tài hiện có, sau lượt loại và hợp nhất của bản 7 (ngày đo ghi trong `as_of` của lượt chấm):

| Trường | Khai báo | Giá trị thực xuất hiện | Hệ quả |
|---|---|---|---|
| `diff` | 1–5 | chỉ `3` (40) · `4` (49) · `5` (1) | Thực chất là thang **2 bậc rưỡi**: lượt loại đã lấy gần hết bậc 5 (còn đúng một đề tài). `diff: 3` là mức thấp nhất tồn tại, không phải "trung bình" |
| `impact.s` | 1–5 | chỉ `2` (1) · `3` (11) · `4` (40) · `5` (38) | Thực chất **4 bậc**, và `5` chiếm 38/90 — bậc trên vẫn bị dồn, lượt loại không chữa được điều đó |
| `risk` | 3 bậc | `thap` 50 · `tb` 39 · `cao` 1 | Bậc `cao` gần như đã bị lượt loại lấy hết — còn đúng #18 (dengue VN), và nó ở lại vì có phương án B rõ |
| `compute` | 3 bậc | `thap` 29 · `tb` 57 · `cao` 4 | Bốn cái `cao` còn lại đều có đường thu hẹp ghi rõ trong `d.risk` |
| `know` | 3 bậc | `thap` 31 · `tb` 52 · `cao` 7 | Bảy cái `cao` còn lại là loại "chỉ một ràng buộc nặng" — giữ lại có chủ ý, xem 1c |
| `mobile` | bool | `true` 10 | Ít, và lượt loại không chạm cái nào — dùng để xếp hạng (V3), không dùng để sàng |
| `vn` | bool | `true` 45 | Vẫn xấp xỉ nửa danh sách, nên một mình nó không phân biệt được gì |

Hai điều phải rút ra:

1. **Đừng đọc `diff: 3` là "dễ".** Trong thang thực dùng nó là sàn. Nếu bạn muốn so độ khó giữa hai đề tài thì `diff` một mình không phân giải được — phải đọc kèm `know` và `compute`.
2. **`impact.s: 5` bị lạm phát.** 38/90 đề tài ở bậc cao nhất nghĩa là bậc đó không còn phân biệt được gì. Khi chấm V1, xu hướng đúng là **hạ**, không phải giữ: yêu cầu `pay` chịu được phép thử cuộc gọi 30 phút, và hạ xuống 4 nếu không. Một thang mà gần một nửa mẫu nằm ở đỉnh là thang cần siết lại, không phải thang cần thêm bậc.

Đây chính là lý do bộ tiêu chí này không cộng dồn các trường của page thành một điểm: **các thang gốc chưa được hiệu chuẩn**, nên cộng chúng lại chỉ nhân thêm sai số.

**Điều thứ ba, quan trọng cho verdict `THIEU_THONG_TIN`:** cả 90 đề tài đều có `t`, `q`, `data`, `contrib`, `d.method`, `d.why`, `d.risk`, `d.learn`, `d.spike` **không rỗng**, và `d.learn` nào cũng có số tuần/ngày. Nếu chỉ kiểm "trường rỗng" thì `THIEU_THONG_TIN` là nhánh chết, không bao giờ bật. Nó chỉ có ích khi kiểm theo bảng ở 1a: **có tên nguồn nhưng không có đường truy cập / không nói license**, hoặc `IMPACT[id]` là fallback.

### 1c. Hình dạng phân bố phải trông thế nào — mốc để biết mình chấm lệch

Chấm máy móc chỉ ba trục R1 (từ `risk`), R2 (từ `know`), R3 (từ `compute`) và lấy mức xấu nhất, trên 90 đề tài:

| Kết quả | Số đề tài |
|---|---|
| Ba trục đều `ĐI ĐƯỢC` | 20 |
| Đúng một trục `CĂNG` | 59 |
| Có ít nhất một trục `CHẶN` | 11 |

(Trước lượt loại của bản 7, ba con số này là 19 · 58 · 23 trên 100 đề tài — tức lượt loại lấy đi 12 trong 23 ca `CHẶN` và gần như không chạm phần giữa; bốn đề tài hợp nhất thêm vào thì có ba cái xanh cả ba trục.)

Mười một ca `CHẶN` còn lại **không phải sót**: chúng là `know: cao` hoặc `compute: cao` đơn lẻ, có đường thu hẹp ghi rõ, nên theo quy tắc chấm-bằng-văn-xuôi ở mục 4 phần lớn hạ về `CĂNG`. Ánh xạ máy móc cố tình khắt khe hơn để bạn thấy chúng.

Dùng ba con số này làm mốc kiểm chính mình. Nếu lượt chấm của bạn cho ra 80 đề tài `CHAN`, bạn đang đọc "chưa kiểm" thành "đã fail" — xem mục 3. Nếu cho ra 60 đề tài `DI_DUOC`, bạn đang bỏ qua R4/R5/R6.

Và biết trước một điều: **`R4` chưa biết với cả 90 đề tài** (page không có trường nào cho nó). Cho tới khi bạn trả lời được câu hỏi thầy hướng dẫn, mọi đề tài mang sẵn một `CĂNG`, nên ô `DI_DUOC` rỗng **bằng thiết kế** — đó không phải rubric hỏng, đó là rubric đang nói bạn đi hỏi bộ môn.

---

## 2. Chuẩn bằng chứng — gắn vào MỌI phát biểu

Đây là phần quan trọng nhất và là phần rubric chung không có. Mỗi nhận định trong kết quả chấm phải mang một trong ba nhãn:

| Nhãn | Nghĩa | Ví dụ |
|---|---|---|
| `ĐÃ CHẠY` | Tự chạy, tự thấy, có số của mình | "Đã tải, đếm được 13.979.592 dòng" |
| `CÓ NGUỒN` | Có nguồn cụ thể tra được, chưa tự chạy | "Trang tải về ghi license CC-BY, kèm URL" |
| `CHƯA KIỂM` | Nghe hợp lý, chưa xác minh | "Bộ này *có lẽ* còn tải được" |

**Mặc định của mọi phát biểu là `CHƯA KIỂM`.** Muốn nâng lên phải có hiện vật.

Ba quy tắc đi kèm:

1. **Không bịa tên bộ dữ liệu, tên bài báo, hay con số SOTA.** Không chắc thì ghi `CHƯA KIỂM` kèm câu hỏi cần tra, không viết ra một cái tên nghe đúng.
2. **Không trích con số quy mô ngành** (tỉ lệ hàng huỷ, tỉ lệ thất thoát, tỉ lệ thất bại thử nghiệm) mà không có nguồn. Nếu số đó cần cho phần `impact.pay` thì đổi thành hướng dẫn *tự đi lấy số*.
3. **Verdict phải có ngày hiệu lực.** Tính khả dụng dữ liệu hết hạn: bộ bị gỡ, license đổi, hạn mức nền tảng thay đổi. Một verdict không có ngày là một verdict không biết mình đã cũ. Ghi kèm điều kiện tái kiểm ("kiểm lại nếu quá 6 tháng, hoặc khi nguồn chính đổi điều khoản").

---

## 3. Tầng BLOCKER — mỗi cái là một phép thử bị chặn thời gian

Không phải "gate" trừu tượng. Mỗi blocker có **một phép thử, một trần thời gian, một hiện vật quan sát được**. Không có hiện vật thì blocker chưa được vượt — dù nghe có lý đến đâu.

### 3a. Ba trạng thái, không phải hai — đọc trước khi chấm bất cứ thứ gì

Bản đầu của bộ này chỉ có `vượt` / `fail`, và "không có hiện vật thì chưa vượt". Ghép với luật "fail bất kỳ blocker → `CHAN`", nó biến **cả danh sách thành `CHAN`** khi chấm trên giấy — vì page không chứa hiện vật nào của B1, B2, B4, B6 (không ai tải dữ liệu, không ai đọc license, không ai chạy baseline, không ai có tên thầy hướng dẫn trong một object JSON). Như vậy rubric mất đúng chức năng nó tự nhận ở mục 11: **bộ lọc trước spike**.

Vì vậy mỗi blocker có **ba** trạng thái:

| Trạng thái | Nghĩa | Ảnh hưởng verdict |
|---|---|---|
| `VUOT` | Đã thử, có hiện vật | Không chặn |
| `CHUA_THU` | Chưa thử, và **không có bằng chứng nào cho thấy nó sẽ fail** | **Không** đẩy về `CHAN`. Đây là trạng thái *bình thường* của lượt chấm hồ sơ. Nó biến thành checklist ngày 1–5 của spike |
| `THAT_BAI` | Đã thử và fail, **hoặc** hồ sơ chứa bằng chứng dương rằng nó sẽ fail (không có đường hợp pháp; dữ liệu đã bị gỡ; nhãn cần chuyên gia mà không ai cam kết; câu hỏi không viết được thành một câu) | → `CHAN` |

Phân biệt hai cái sau là toàn bộ giá trị của mục này. `CHUA_THU` nghĩa là "đi thử đi". `THAT_BAI` nghĩa là "đừng tốn 5 ngày". Gộp chúng lại là tự bỏ cả danh sách.

Với lượt chấm hồ sơ (không chạy spike), trạng thái mặc định là:

- **B3, B5** — chấm được ngay từ `q` / `d.spike` / `contrib`. Không có lý do để để `CHUA_THU`.
- **B1, B2, B4, B6** — mặc định `CHUA_THU`, và chỉ nâng lên `THAT_BAI` khi **chính hồ sơ** nói ra điều đó (ví dụ `data` mô tả một nền tảng tư nhân cấm thu thập tự động, hay `d.risk` ghi "cần người đọc được Hán-Nôm" mà không có ai).

| ID | Blocker | Phép thử | Trần | Hiện vật phải có |
|---|---|---|---|---|
| **B1** | Dữ liệu nằm trên ổ cứng | Tải thật, đếm | 2 ngày | Số dòng / số mẫu / số file **thật**, không phải "tìm thấy link". Nếu là dữ liệu phải xin: tên người đã liên hệ và ngày liên hệ. |
| **B2** | Có đường hợp pháp | Đọc license và điều khoản của **từng** nguồn | 1 ngày | Kết luận thành văn cho từng nguồn: được dùng nghiên cứu / được công bố kết quả / được thu thập tự động hay không. Với dữ liệu người: cơ chế đồng ý và ẩn danh. |
| **B3** | Câu hỏi trả lời sai được | Viết được câu: *"Đo X trên Y, theo metric Z, so với baseline W"* | 1 giờ | Một câu duy nhất. Nếu phải dùng chữ "và" nối ba bài toán thì chưa vượt. |
| **B4** | Baseline tồn tại và chạy được | Chạy baseline ngu nhất, ghi số | 1 ngày | Một con số cụ thể trên tập test. Đây là thanh đo — không có nó thì "tốt hơn" không có nghĩa. |
| **B5** | Kết quả âm vẫn ra luận văn | Viết 3 câu: *nếu giả thuyết sai thì luận văn báo cáo gì* | 1 giờ | Ba câu đó. Nếu không viết được, đề tài là một cú cá cược, không phải một nghiên cứu. |
| **B6** | Có người đỡ được phần nền | Tìm một người trả lời được câu hỏi ngành khi bí | 1 tuần | Tên một người thật (thầy hướng dẫn, đồng nghiệp, người trong ngành đã nhận trao đổi). Với `know: cao`, blocker này **bắt buộc**; với `know: thap`, có thể miễn. |

**Blocker nào ở `THAT_BAI` → `CHAN`.** `CHUA_THU` thì không. Trong cả hai ca vẫn phải xuất phần đề xuất sửa: blocker nào chặn hoặc chưa thử, cần gì để mở, và có phiên bản thu hẹp nào không cần mở nó.

Lưu ý về B1 và B2: với các đề tài `risk: cao` trong page, spike ngày 1 thường **không phải viết code** mà là đọc điều khoản hoặc xác nhận đường dữ liệu. Đó là thiết kế đúng, không phải thiếu sót.

---

## 4. Tầng RÀNG BUỘC — 6 trục, lấy mức xấu nhất

Sáu trục, mỗi trục cho ra **một trong ba mức**. Verdict tầng này = **mức xấu nhất**, không cộng, không bình quân, không bù trừ.

Ba mức: `ĐI ĐƯỢC` · `CĂNG` · `CHẶN`

**Quy tắc chống vòng tròn — áp cho R1, R2, R3.** Ba trục này có trường khai báo tương ứng (`risk`, `know`, `diff`+`compute`). Đọc thẳng trường rồi trả lại nó thành mức là **chấm lại lời tự khai của người viết page** — mà mục 1b vừa nói chính các thang đó chưa được hiệu chuẩn. Thứ tự đúng là ngược lại:

1. **Chấm bằng văn xuôi trước** — `data` có nêu đường truy cập và license không; `d.learn` có nói học *cái gì* không; `d.risk` có đường xoay cụ thể không.
2. **Rồi mới đọc trường khai báo, như một claim cần kiểm.** Khớp thì ghi `bang_chung` là `CO_NGUON`. Lệch thì đó là `F27` (mâu thuẫn nội bộ) và phải xuất `sua_truong` cho trường đó.

Nói cách khác: trường khai báo là **giả thuyết của tác giả về độ khó**, không phải kết quả chấm.

### R1 — Dữ liệu (chấm `data` + `d.risk`; trường `risk` là claim cần kiểm)

| Mức | Điều kiện | Claim `risk` tương ứng |
|---|---|---|
| `ĐI ĐƯỢC` | Bộ mở, license rõ, có nhãn, tải là dùng; hoặc dữ liệu đã nắm trong tay | `thap` |
| `CĂNG` | Có nhưng cần công: gộp nguồn, làm sạch nặng, tự gán nhãn một phần, hoặc phải xin nhưng đã có kênh và **có phương án B** | `tb` |
| `CHẶN` | Chỉ có phương án mơ hồ; nhãn phải tự tạo khối lượng lớn mà chưa có ai xác nhận; phụ thuộc hoàn toàn một bên chưa cam kết; hoặc không có đường hợp pháp | `cao` |

Câu hỏi kiểm: *Ai đang giữ? Bao nhiêu mẫu mỗi lớp? Nhãn từ đâu và ai xác nhận? Được công bố kết quả không? Nguồn chính hỏng thì lấy gì thay?*

**Quy tắc riêng:** nếu `d.risk` ghi cảnh báo pháp lý mà `risk` vẫn là `thap` hoặc `tb` → đó là **mâu thuẫn nội bộ**, phải sửa trường `risk` lên `cao`.

### R2 — Nền phải học (chấm `d.learn`; trường `know` là claim cần kiểm)

| Mức | Điều kiện |
|---|---|
| `ĐI ĐƯỢC` | `know: thap` — nền học được trong ~1/8 thời lượng (≈2–3 tuần cho luận văn 6 tháng), và `d.learn` ghi rõ học gì |
| `CĂNG` | `know: tb` — ~4–5 tuần, một lĩnh vực mới nhưng có tài liệu vào cửa rõ ràng |
| `CHẶN` | `know: cao` **và** B6 ở `THAT_BAI` — 6–8 tuần nền chuyên ngành mà đã xác định là không có ai để hỏi, hoặc phần việc đòi một người rất khó tìm (ví dụ người đọc được Hán-Nôm để gán nhãn). Hoặc đề tài đòi **hai** nền nặng cùng lúc (ví dụ vừa nhân quả nâng cao vừa RL). **`know: cao` cộng B6 `CHUA_THU` chỉ là `CĂNG`** — chưa đi hỏi bộ môn không phải là đã bị từ chối |

**Quy tắc riêng:** `d.learn` chỉ ghi số tuần mà không ghi *học cái gì* thì trục này không được xếp trên `CĂNG` — con số tuần không có nội dung là con số không kiểm được.

### R3 — Thời gian và tính toán (chấm `d.method` + `d.risk`; `diff`/`compute` là claim cần kiểm)

| Mức | Điều kiện |
|---|---|
| `ĐI ĐƯỢC` | Chia được thành mốc theo tuần khớp deadline, còn ≥20% đệm để viết; `compute` ở mức `thap`/`tb` và chạy được trên laptop hoặc free tier |
| `CĂNG` | Một trong hai chỗ chật nhưng có đường xoay đã ghi rõ trong `d.risk` (giảm dữ liệu, mô hình nhỏ hơn, checkpoint có sẵn) |
| `CHẶN` | `compute: cao` mà không có GPU; hoặc `diff: 5` cộng `know: cao` cộng `compute: cao`; hoặc ước lượng vượt ~2× thời lượng; hoặc cần nhiều người |

**Quy tắc riêng cho phương sai:** nếu phương pháp thuộc họ có phương sai lớn giữa các seed (RL, mô hình sinh, few-shot LLM) thì ngân sách phải đủ **≥5 seed mỗi cấu hình**. Không đủ → `CHẶN`, vì kết luận sẽ không đứng được bất kể mô hình tốt đến đâu.

### R4 — Người đỡ (không có trong trường nào của page — phải hỏi thêm)

| Mức | Điều kiện |
|---|---|
| `ĐI ĐƯỢC` | Có thầy hướng dẫn đã làm mảng gần đó, hoặc đã có luận văn cùng mảng bảo vệ ở đơn vị trong 2–3 năm gần đây |
| `CĂNG` | Không có ai trong mảng nhưng có người đỡ được phần phương pháp, và phần domain thì `know` ở mức `thap` |
| `CHẶN` | `know: cao` mà không ai đỡ được domain; hoặc chưa từng có ai ở đơn vị làm mảng đó và bạn coi điều đó là "cơ hội trống" |

Page nói thẳng chỗ này: chưa từng có ai làm mảng đó ở đơn vị **không phải** khoảng trống nghiên cứu — đó là dấu hiệu không có ai đỡ.

### R5 — Thiết kế đo lường (đọc `d.method`)

Trục này chấm *cách đo*, không chấm *mô hình dùng gì*. Đề tài chọn model theo mốt mà đo tử tế vẫn tốt hơn đề tài chọn model đúng mà đo sai.

| Mức | Điều kiện |
|---|---|
| `ĐI ĐƯỢC` | Đủ **năm** thành phần: (1) baseline tầm thường được nêu tên và được tune ngang tay với mô hình đề xuất; (2) metric khớp bản chất bài toán; (3) cách chia tập chống rò rỉ **được nêu rõ và giải thích lý do**; (4) nhiều seed / khoảng tin cậy; (5) ablation hoặc phân rã nguồn cải thiện |
| `CĂNG` | Thiếu một thành phần, và thiếu chỗ đó không làm kết luận vô nghĩa |
| `CHẶN` | Không có baseline; hoặc metric sai bản chất (accuracy cho dữ liệu lệch lớp nặng, R² làm metric duy nhất, point-adjust F1 không kèm thước đo thô); hoặc chia random trên dữ liệu có nhóm/thời gian; hoặc kết luận từ một lần chia dữ liệu |

**Danh sách rò rỉ phải soi từng cái** (page này có nhiều đề tài dựng riêng quanh chúng, nên đây là trục nghiêm nhất):
- đặc trưng tương lai lọt vào tập train
- chuẩn hoá / chọn đặc trưng làm **trước** khi chia tập
- cùng thực thể nằm hai bên (cùng bệnh nhân, cùng người nói, cùng máy, cùng ngôi sao, cùng vùng hoạt động, cùng trận lũ, cùng cửa sổ trượt)
- homolog / scaffold / dòng vi khuẩn tương đồng giữa train và test
- tập test đã nằm trong corpus tiền huấn luyện của mô hình nền
- nhãn suy ra từ chính thứ đang dự đoán
- **nhãn thiếu bị coi là nhãn âm**
- đặc trưng chỉ định danh môi trường thu thập (thiết bị ghi âm, địa chỉ IP, nguồn phát tin, nền ảnh)

### R6 — Kết quả âm vẫn ra luận văn (đọc `d.spike` + `contrib`)

| Mức | Điều kiện |
|---|---|
| `ĐI ĐƯỢC` | Cả hai nhánh kết quả đều là luận văn tốt, và `contrib` không phụ thuộc việc mô hình phải thắng |
| `CĂNG` | Nhánh âm vẫn viết được nhưng mỏng hơn rõ rệt |
| `CHẶN` | Nếu mô hình không thắng baseline thì không còn gì để viết |

**Quy tắc riêng:** `d.spike` phải mô tả một phép thử **giết được đề tài trong 5 ngày**. Spike kiểu "cài thư viện, load dữ liệu, chạy thử" không giết được gì → trục này không được xếp trên `CĂNG`. Spike tốt luôn có dạng: *"nếu con số này ra thế kia thì đổi đề tài ngay"*.

---

## 5. Tầng GIÁ TRỊ — chỉ đọc sau khi tầng ràng buộc đã xanh

Hai trục này **không được bù cho tầng 4**. Đề tài tác động 5 mà `R1 = CHẶN` vẫn là `CHAN`. Thứ tự đọc là bắt buộc: ràng buộc trước, giá trị sau.

### V1 — Tác động (ánh xạ `impact.s` + `who`/`pay`/`out`)

Xác nhận `impact.s` có đúng như ba dòng mô tả không, thay vì tự chấm lại từ đầu:

| `impact.s` | Phải đứng được điều gì |
|---|---|
| `5` (ra sản phẩm) | `who` chỉ ra người cụ thể, không phải "xã hội"; `pay` chịu được một cuộc gọi 30 phút với người làm nghề đó; `out` là hiện vật cắm được vào chỗ nào đó |
| `4` (ứng dụng rõ) | Có người dùng kết quả nhưng đường ra tiền gián tiếp hoặc chậm |
| `3` (học thuật) | Giá trị là khoảng trống học thuật cụ thể; **`pay` được phép ghi "không có đường ra tiền rõ"** và đó là câu trả lời đúng, không phải thiếu sót |
| `2`–`1` (hẹp) | Chỉ một nhóm nhỏ quan tâm — hợp lệ, nhưng phải viết thẳng, không tô |

**Ba lỗi phải bắt ở trục này:**
- `impact.s: 5` mà `pay` chỉ nói chung chung về "tiềm năng thị trường" → hạ xuống 4 hoặc 3.
- `impact.s` cao được dùng để che một trục ràng buộc đỏ → không hợp lệ, tầng 5 không bù tầng 4.
- Điểm tác động bị nâng vì đề tài *nghe* thời sự (LLM, AI, vũ trụ) chứ vì `who`/`pay`/`out` đứng được → hạ.

Và ngược lại: **điểm tác động thấp không phải điểm xấu.** Một đề tài 3 điểm có thể là luận văn tốt hơn một đề tài 5 điểm; nó chỉ khó gây hứng thú cho doanh nghiệp ngồi dự bảo vệ hơn.

### V2 — Đóng góp (đọc `contrib` + `d.why`)

Ở bậc thạc sĩ, đóng góp **không cần là thuật toán mới**. Các dạng hợp lệ, xếp theo mức thường gặp trong page này:

1. **Đo lại một kết quả đã công bố dưới điều kiện đánh giá chặt hơn** (kiểm soát rò rỉ, chia tập đúng, baseline tune ngang tay) — dạng bền nhất, khó ra kết quả rỗng nhất
2. **Đổi thước đo sang thước đo quyết định** và chỉ ra chỗ thứ hạng đảo
3. **Đường cong đánh đổi** (bao nhiêu nhãn / bao nhiêu dữ liệu / bao nhiêu tiền thì đáng dùng phương pháp nào)
4. **Phân rã nguồn cải thiện** bằng ablation kiểu factorial
5. **Dữ liệu hoặc ngữ cảnh mới** (tiếng Việt, thị trường Việt Nam, vùng địa lý chưa ai đo)
6. **Ràng buộc thực tế mới** (chạy on-device, ít nhãn, chi phí thấp, không có dữ liệu gốc)
7. **Hạ tầng đánh giá tái dùng được** (bộ dữ liệu có nhãn, giao thức chia tập, chỉ số ô nhiễm)

| Mức | Điều kiện |
|---|---|
| Tốt | `contrib` thuộc rõ một dạng trên, và `d.why` nói được **khác gì công trình gần nhất** |
| Được | Có nét mới nhưng chưa nói rõ khác biệt với cái đã có |
| Yếu | Về cơ bản lặp lại; hoặc chỉ đổi dataset của một bài đã có mà không đổi câu hỏi |

**Bẫy riêng của page này:** page dùng lặp lại bốn khuôn mẫu (hoàng đế cởi trần · đổi thước đo · baseline tàn nhẫn · đo bằng chi phí quyết định) trên nhiều lĩnh vực. Khuôn mẫu lặp là **hợp lệ và rẻ** — nhưng phải kiểm hai chuyện: (a) khuôn đó đã có người áp vào **đúng** lĩnh vực này chưa; (b) trong danh sách có bao nhiêu đề tài khác dùng đúng khuôn đó — nếu nhiều, chọn một, và nói rõ vì sao chọn cái đó.

### V3 — Đòn bẩy nền sẵn có (đọc `mobile` + `vn`, đối chiếu "Nền học viên")

Page có hai trường `mobile` (10/90) và `vn` (45/90) mà **không trục nào ở trên tiêu thụ**, và mục 9 có slot "Nền học viên" cũng không được dùng vào đâu. Đó là bỏ sót: một đề tài khai thác đúng 7 năm kỹ sư mobile/backend của học viên đi nhanh hơn hẳn một đề tài buộc học viên bắt đầu từ số không, dù hai cái cùng mức `know`.

| Mức | Điều kiện |
|---|---|
| `Cao` | `mobile: true` **và** phần việc mobile/backend là phần lõi (on-device, đo điện/độ trễ, ETL nặng, dựng hạ tầng đo) — nền sẵn có cắt được vài tuần thật |
| `Vừa` | `vn: true` và góc Việt Nam đòi việc thu thập / xử lý dữ liệu tiếng Việt mà học viên làm được mà không cần ai đỡ |
| `Thấp` | Không dùng gì từ nền sẵn có; toàn bộ giá trị nằm ở phần domain phải học mới |

Ba quy tắc dùng V3:

1. **V3 chỉ để xếp hạng, không để sàng.** `V3 = Thấp` không bao giờ là lý do loại — rất nhiều luận văn tốt không dùng lại gì từ nghề cũ.
2. **`vn: true` một mình không phải đòn bẩy.** Nửa danh sách có nó; nó chỉ thành đòn bẩy khi *việc* tiếng Việt là việc học viên tự làm được.
3. **Đừng để V3 nâng V1.** "Tôi làm mobile nên tôi thấy nó có ích" không phải `impact.pay`.

---

## 6. Verdict — 5 nhãn, không có điểm số

Không có tổng điểm. Verdict suy ra bằng luật, đọc được ngược lại thành hành động.

| Verdict | Điều kiện | Hành động |
|---|---|---|
| `DI_DUOC` | Không blocker nào `THAT_BAI` · sáu trục ràng buộc đều `ĐI ĐƯỢC` · V1 và V2 khớp nội dung | Vào shortlist, chạy spike 5 ngày |
| `DI_DUOC_CO_DIEU_KIEN` | Không blocker nào `THAT_BAI` · nhiều nhất **hai** trục ở `CĂNG`, mỗi trục có đường xoay ghi rõ | Vào shortlist nhưng sửa các trường đã nêu trước khi chạy spike |
| `PHAI_SIET_LAI` | Không blocker nào `THAT_BAI` · từ ba trục `CĂNG` trở lên, hoặc `R5 = CHẶN` (đo sai nhưng lõi câu hỏi còn dùng được) | Có lõi. Viết lại `q`, `d.method`, hoặc thu hẹp phạm vi, rồi chấm lại |
| `CHAN` | Ít nhất một blocker ở `THAT_BAI`, hoặc một trục trong R1/R2/R3/R4/R6 ở `CHẶN` | Không chạy spike. Ghi rõ chặn ở đâu và cần gì để mở |
| `THIEU_THONG_TIN` | Theo bảng ở mục 1a — kể cả ca `data` có tên nguồn nhưng không có đường truy cập / không nói license, và ca `IMPACT[id]` là fallback | Hỏi lại đúng những trường đó. **Không tự điền giả định để chấm** |

Bốn quy tắc bắt buộc:

- **`CHUA_THU` không phải `CHAN`.** Blocker chưa thử là việc của spike, không phải bản án — xem 3a. Đây là quy tắc hay bị vi phạm nhất, và vi phạm nó thì cả danh sách ra `CHAN`.
- **`R5 = CHẶN` không tự động là `CHAN`.** Đo sai thường sửa được bằng cách viết lại `d.method`; dữ liệu không tồn tại thì không sửa được. Phân biệt hai loại này là điểm khác biệt chính so với rubric chung.
- **Trong lượt chấm hồ sơ, `DI_DUOC` rỗng là bình thường.** R4 chưa biết với mọi đề tài (mục 1c), nên trần thực tế của một lượt chấm trên giấy là `DI_DUOC_CO_DIEU_KIEN`. Đừng hạ tiêu chuẩn để lấp ô đó.
- **Không có "verdict biên".** Nếu bạn thấy đề tài nằm giữa hai nhãn, xuất nhãn xấu hơn kèm câu *"nằm giữa X và Y, nghiêng về X vì [trục nào]"*. Đừng làm mịn bằng cách bịa thêm bậc.

---

## 7. Red flag — gọi tên, đối chiếu từng cái

Nhóm theo trường của page để soi có hệ thống.

**Ở `t` và `q` (phạm vi)**
- `F1` Là chủ đề, không phải câu hỏi ("Ứng dụng AI trong y tế")
- `F2` Gộp ≥3 bài toán độc lập bằng chữ "và"
- `F3` Là một sản phẩm, không phải một câu hỏi ("Xây dựng hệ thống X")
- `F4` Hứa cả nghiên cứu mô hình + hệ thống end-to-end + triển khai

**Ở `data`**
- `F5` "Sẽ thu thập / sẽ xin được" mà chưa có mẫu thử nào
- `F6` Phụ thuộc một API có thể đóng hoặc chuyển sang trả phí
- `F7` Nhãn cần chuyên gia gán (bác sĩ, luật sư, người đọc được Hán-Nôm) mà chưa ai cam kết
- `F8` Dữ liệu quá nhỏ so với mô hình mà không nói tới transfer learning hoặc augmentation
- `F9` Nêu tên bộ dữ liệu mà **không kiểm license** — riêng với dữ liệu người và dữ liệu nền tảng, đây là red flag nặng
- `F10` Bộ dữ liệu **đã chết hoặc đã đổi điều khoản** từ lúc đề tài được viết. Bắt buộc kiểm lại, không tin trạng thái cũ

**Ở `d.method`**
- `F11` Không có baseline
- `F12` Metric sai bản chất: accuracy cho dữ liệu lệch lớp nặng, R² làm metric duy nhất, point-adjust F1 không kèm thước đo thô, RMSE cho bài toán mà quyết định chỉ cần một phân vị
- `F13` Chia random trên dữ liệu chuỗi thời gian hoặc dữ liệu có nhóm
- `F14` So sánh không công bằng: mô hình đề xuất tune kỹ, baseline để mặc định
- `F15` Kết luận từ chênh lệch nhỏ mà không có nhiều seed hoặc khoảng tin cậy
- `F16` Tuyên bố nhân quả từ dữ liệu quan sát mà không có thiết kế nhân quả
- `F17` Chọn kiến trúc phức tạp mà không có giả thuyết vì sao nó phù hợp
- `F18` **Nhãn thiếu bị dùng như nhãn âm** — hay gặp ở registry, log, và dữ liệu báo cáo tự phát
- `F19` Nhãn yếu (danh sách đã bị xử lý, sản phẩm giám sát toàn cầu, nhãn tự khai) được dùng như chân lý

**Ở `contrib` và `d.why`**
- `F20` Là bản tái hiện một tutorial phổ biến
- `F21` "So sánh các thuật toán trên dataset UCI" mà không có góc nhìn nào ngoài bảng số
- `F22` Chỉ đổi dataset của một bài đã có, không đổi câu hỏi
- `F23` **Trùng khuôn mẫu với đề tài khác trong cùng danh sách** mà không nói rõ khác gì

**Ở `d.risk` và `d.spike`**
- `F24` Không có nhánh kết quả âm — mô hình không thắng thì không còn gì để viết
- `F25` Spike không giết được đề tài (chỉ là "cài thư viện, load dữ liệu")
- `F26` Phụ thuộc một người hoặc một tổ chức duy nhất, không có phương án B
- `F27` `d.risk` mâu thuẫn với trường `risk`/`compute`/`know` — ví dụ mô tả rủi ro pháp lý nặng mà `risk: thap`
- `F28` Đòi tài nguyên vượt khả năng đã khai trong `compute`

**Ở `impact.*`**
- `F29` `impact.s: 5` mà `pay` chỉ là "tiềm năng thị trường"
- `F30` `who` là "xã hội" hoặc "mọi người" thay vì một nhóm cụ thể
- `F31` `out` là "một báo cáo" chứ không phải một hiện vật ai đó dùng được
- `F32` Con số quy mô trong `pay` không có nguồn

---

## 8. Đầu ra chuẩn — sửa thẳng vào trường của page

Không xuất JSON generic. Xuất **diff áp được vào page** cộng một bảng đọc được.

`sua_truong` chia hai nhánh vì page có **hai chỗ sửa thật**: object trong `TOPICS`, và entry trong `IMPACT` khoá theo `id` (mục 1a). Diff nhắm sai nhánh thì không áp được.

```json
{
  "id": "a07",
  "n": 7,
  "as_of": "YYYY-MM-DD",
  "verdict": "DI_DUOC | DI_DUOC_CO_DIEU_KIEN | PHAI_SIET_LAI | CHAN | THIEU_THONG_TIN",
  "rang_buoc_bo_nhat": "R1 | R2 | R3 | R4 | R5 | R6",

  "blockers": [
    { "id": "B1", "trang_thai": "VUOT",     "hien_vat": "…", "bang_chung": "DA_CHAY" },
    { "id": "B2", "trang_thai": "CHUA_THU", "hien_vat": "chưa đọc license của nguồn thứ 2 — việc của ngày 1 spike", "bang_chung": "CHUA_KIEM" },
    { "id": "B6", "trang_thai": "THAT_BAI", "hien_vat": "hồ sơ ghi cần người đọc được Hán-Nôm, chưa ai cam kết", "bang_chung": "CO_NGUON" }
  ],

  "rang_buoc": {
    "R1_du_lieu":   { "muc": "DI_DUOC", "ly_do": "…", "bang_chung": "CO_NGUON" },
    "R2_nen_hoc":   { "muc": "CANG",    "ly_do": "…", "bang_chung": "CHUA_KIEM" },
    "R3_thoi_gian": { "muc": "DI_DUOC", "ly_do": "…", "bang_chung": "CO_NGUON" },
    "R4_nguoi_do":  { "muc": "CANG",    "ly_do": "…", "bang_chung": "CHUA_KIEM" },
    "R5_do_luong":  { "muc": "DI_DUOC", "ly_do": "…", "bang_chung": "CO_NGUON" },
    "R6_ket_qua_am":{ "muc": "DI_DUOC", "ly_do": "…", "bang_chung": "CO_NGUON" }
  },

  "gia_tri": {
    "V1_tac_dong": { "impact_s_hien_tai": 4, "impact_s_de_xuat": 4, "ly_do": "…" },
    "V2_dong_gop": { "muc": "TOT | DUOC | YEU", "dang": "do-lai-chat-hon", "khac_gi_gan_nhat": "…" },
    "V3_don_bay":  { "muc": "CAO | VUA | THAP", "ly_do": "mobile:true, phần lõi là đo độ trễ on-device" }
  },

  "red_flags": ["F13", "F27"],

  "sua_truong": {
    "TOPICS": {
      "risk":     { "tu": "thap", "sang": "tb",  "vi_sao": "d.risk mô tả phải xin quyền — mâu thuẫn nội bộ" },
      "know":     null,
      "q":        "phiên bản câu hỏi đã siết lại, nếu nên siết",
      "d.method": "thêm baseline …; đổi sang chia tập theo …; báo cáo … thay cho …",
      "d.spike":  "phiên bản spike giết được đề tài trong 5 ngày, nếu bản hiện tại không giết được"
    },
    "IMPACT": {
      "s":   { "tu": 5, "sang": 4, "vi_sao": "pay chỉ nói tiềm năng thị trường, không chịu được cuộc gọi 30 phút" },
      "who": null,
      "pay": null,
      "out": null
    }
  },

  "thieu_thong_tin": ["Chưa nêu license của nguồn thứ 2"],
  "viec_cua_spike": ["B1: tải và đếm", "B2: đọc license nguồn thứ 2", "B4: chạy baseline seasonal naive"],
  "cau_hoi_can_hoi_lai": ["…"],

  "rui_ro_hang_dau": [
    { "rui_ro": "…", "kha_nang": "cao|tb|thap", "hau_qua": "cao|tb|thap", "cach_giam": "…" }
  ],

  "neu_gia_thuyet_sai": "Luận văn vẫn báo cáo được gì — 1–2 câu, cụ thể",
  "trung_voi_de_tai_khac": ["#67", "#96"],
  "dieu_kien_tai_kiem": "Kiểm lại nếu quá 6 tháng, hoặc khi nguồn chính đổi điều khoản"
}
```

Sau JSON, thêm **3–5 câu tiếng Việt** cho người đọc, và câu đầu tiên phải nói **ràng buộc bó nhất là gì** — đó là thứ quyết định, phần còn lại là chi tiết.

---

## 9. Prompt để chạy

```text
Bạn là hội đồng phản biện luận văn thạc sĩ Data Science. Đánh giá đề tài dưới đây theo
BỘ TIÊU CHÍ được cung cấp. Không chấm theo cảm tính, không chấm theo mức nghe-có-vẻ-hay.

QUY TẮC BẮT BUỘC

1. Chạy tầng BLOCKER (mục 3) TRƯỚC, và gán một trong BA trạng thái: VUOT / CHUA_THU /
   THAT_BAI (mục 3a). Chỉ THAT_BAI → verdict CHAN. CHUA_THU là trạng thái bình thường của
   lượt chấm hồ sơ và đi vào viec_cua_spike — KHÔNG được biến nó thành CHAN. Nếu bạn thấy
   gần như mọi đề tài ra CHAN, bạn đang vi phạm đúng quy tắc này.

2. Kiểm thiếu trường theo bảng ở mục 1a — gồm cả ca `data` nêu tên nguồn mà không có đường
   truy cập hoặc không nói license, và ca `IMPACT[id]` rơi vào fallback (who/pay/out = "—").
   KHÔNG tự bổ sung giả định để chấm cho đủ.

3. Tầng ràng buộc (mục 4) lấy MỨC XẤU NHẤT, không cộng dồn, không bình quân. Nêu rõ
   rang_buoc_bo_nhat. Với R1/R2/R3: chấm bằng VĂN XUÔI trước, rồi mới đối chiếu trường khai
   báo (`risk`/`know`/`diff`/`compute`) như một claim cần kiểm — lệch là F27. Trục giá trị
   (mục 5) KHÔNG được bù cho tầng ràng buộc.

4. Mọi phát biểu phải mang nhãn bằng chứng: DA_CHAY / CO_NGUON / CHUA_KIEM. Mặc định là
   CHUA_KIEM. KHÔNG bịa tên dataset, tên bài báo, hay con số SOTA — không chắc thì ghi
   CHUA_KIEM kèm câu cần tra. KHÔNG trích con số quy mô ngành không nguồn.

5. Kiểm tính khả dụng dữ liệu theo hiện tại, không theo lúc đề tài được viết. Bộ dữ liệu
   bị gỡ, license đổi, hạn mức nền tảng thay đổi — đều là F10. Ghi as_of và
   dieu_kien_tai_kiem.

6. Soi mâu thuẫn nội bộ giữa các trường: d.risk mô tả rủi ro nặng mà trường risk thấp;
   d.learn ghi 8 tuần mà know là thap; d.method nói cần GPU mà compute là thap. Mỗi mâu
   thuẫn là F27 và phải xuất sửa trường tương ứng.

7. Nghiêm nhất ở R1 (dữ liệu) và R5 (thiết kế đo lường). Phần lớn luận văn thất bại vì
   hai chỗ này, không vì thiếu ý tưởng hay. Với R5, soi từng mục trong danh sách rò rỉ.

8. Luôn xuất phiên bản đã siết lại của các trường nếu đề tài có lõi dùng được. Verdict
   PHAI_SIET_LAI mà không kèm bản siết lại là output không hoàn chỉnh.

9. Chấm V3 (mục 5) bằng `mobile`/`vn` đối chiếu "Nền học viên" bên dưới. V3 chỉ để xếp
   hạng, KHÔNG để sàng, và KHÔNG được nâng V1.

10. Trả về đúng JSON theo mục 8, với sua_truong chia hai nhánh TOPICS / IMPACT. Sau JSON,
   thêm 3–5 câu tiếng Việt, câu đầu nói ràng buộc bó nhất.

RÀNG BUỘC CỦA CHƯƠNG TRÌNH
- Thời lượng và nhân lực: {vd. 6 tháng, 1 người}
- Tài nguyên: {vd. laptop + Colab free, không GPU riêng}
- Nền học viên: {vd. mạnh probability/statistics, lập trình tốt, 7 năm kỹ sư mobile/backend,
  chưa quen deep learning}
- Yêu cầu của trường: {vd. cho phép applied thesis / bắt buộc có đóng góp mới}
- Người đỡ domain: {liệt kê mảng nào có thầy hướng dẫn, mảng nào không — BẮT BUỘC cho R4.
  Bỏ trống thì R4 = CĂNG với mọi đề tài và trần verdict là DI_DUOC_CO_DIEU_KIEN}

BỘ TIÊU CHÍ
{dán mục 1–8 của tài liệu này}

ĐỀ TÀI CẦN ĐÁNH GIÁ
{dán object đề tài trong TOPICS, đủ các trường: id, n, dom, t, q, data, contrib, d.*, diff,
 risk, compute, know, mobile, vn — CỘNG entry IMPACT[id] tương ứng (s, who, pay, out).
 Nếu không có entry IMPACT[id], nói rõ là không có; đừng suy ra s = 3}

CHỈ MỤC CẢ DANH SÁCH (bắt buộc — không có nó thì không chấm được trùng lặp)
{dán bảng gọn của TẤT CẢ đề tài: n · dom · t · contrib rút một dòng.
 Cần cho F23, cho V2 "bao nhiêu đề tài khác dùng đúng khuôn này", và cho trường
 trung_voi_de_tai_khac ở mục 8. Nếu prompt chỉ có MỘT object, hai chỗ đó phải ghi
 "không chấm được — thiếu chỉ mục", KHÔNG được đoán}
```

---

## 10. Lượt tổng trên cả danh sách

Chấm lẻ xong vẫn chưa chọn được, vì đề tài "tốt nhất" chưa chắc là đề tài nên làm.

1. **Chỉ giữ `DI_DUOC` và `DI_DUOC_CO_DIEU_KIEN`.** `PHAI_SIET_LAI` đi vào một danh sách chờ riêng, không trộn vào bảng chọn — trộn vào là tự lừa mình.

2. **Gộp cặp trùng khuôn mẫu.** Với danh sách dùng lặp bốn khuôn mẫu, nhiều đề tài chỉ khác lĩnh vực. Gộp và chọn một, dựa trên: lĩnh vực nào có người đỡ (R4), và lĩnh vực nào có `know` thấp hơn.

3. **Sàng theo ràng buộc, xếp theo giá trị — đúng thứ tự đó.** Bảng chọn cuối chỉ gồm đề tài đã xanh tầng ràng buộc, rồi trong đó mới xếp theo `impact.s` và V2. Không bao giờ xếp trước rồi sàng sau.

4. **Ma trận 2 chiều — nhân, không cộng.**
   - trục X = tính đi được = **min**(R1, R2, R3, R4, R5, R6) quy về 3 bậc
   - trục Y = giá trị = `impact.s` kết hợp V2
   - **V3 chỉ dùng để phá thế ngang bằng** giữa hai đề tài cùng ô — không phải chiều thứ ba

   Ô cần là **X cao và Y cao**. Đừng cộng X với Y thành một điểm — cộng là quay lại đúng lỗi của rubric chung.

5. **Ghép cặp dự phòng.** Mỗi đề tài trong shortlist cần một đề tài **cùng phương pháp, `risk` thấp hơn** làm phương án rơi. Với page này việc đó dễ vì các khuôn mẫu lặp lại — đó là lợi thế của một danh sách rộng.

6. **Kiểm đa dạng loại bài toán**, không phải đa dạng lĩnh vực. Ba đề tài ở ba lĩnh vực khác nhau mà cùng là bài "chứng minh benchmark bị rò rỉ" thì shortlist của bạn chỉ có **một** đề tài với ba lớp sơn.

7. **Xếp thang rủi ro.** Chia shortlist thành `an toàn` / `vừa` / `tham vọng` và chọn theo mức chấp nhận rủi ro của chính bạn — không theo điểm cao nhất.

---

## 11. Giới hạn của bộ tiêu chí này

Ghi ra để không ai dùng nó quá tay:

- **Nó chấm hồ sơ, không chấm thực tế.** Một đề tài đạt `DI_DUOC` trên giấy vẫn có thể chết ở ngày 3 của spike. Spike là trọng tài, rubric chỉ là bộ lọc trước spike.
- **Bốn blocker không thể vượt bằng cách đọc page.** B1 (tải và đếm), B2 (đọc license), B4 (chạy baseline), B6 (tên một người thật) đòi hiện vật mà một object JSON không chứa. Lượt chấm hồ sơ chỉ trả lời được: *có bằng chứng dương nào cho thấy nó sẽ fail không*. Không có → `CHUA_THU`, và đó là kết quả đúng, không phải kết quả thiếu.
- **Trục R4 (người đỡ) không có trong dữ liệu page** — bắt buộc hỏi thêm. Bỏ trống R4 rồi chấm là bỏ mất đúng trục mà page gọi là quyết định nhất.
- **V2 (đóng góp) không kiểm được mà không tra cứu.** Không có bước tìm công trình gần nhất thì V2 chỉ đến mức `DUOC`, không được xếp `TOT`. Ghi rõ là chưa tra thay vì đoán.
- **Ba mức mỗi trục là có chủ ý.** Chia mịn hơn (5 hay 7 bậc) sẽ tạo cảm giác chính xác mà hai người chấm không tái lập được. Nếu bạn thấy cần bậc thứ tư, cái bạn cần là thêm hiện vật, không phải thêm bậc.
- **Bộ này chưa được thử trên đủ số đề tài để biết nó sai chỗ nào.** Chấm 5 đề tài mà bạn đã hiểu rõ trước, so kết quả rubric với trực giác của bạn, và sửa chỗ lệch — sửa rubric, không sửa trực giác cho khớp rubric.
