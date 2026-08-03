# Cổng nội dung — tám thứ máy không kiểm được

`tools/gate.mjs` kiểm được **cấu trúc**: mục lục còn khớp không, tham chiếu có hỏng
không, có ai bị bắt làm việc dựa trên thứ chưa được dạy không. Nó **không** kiểm được
điều duy nhất thật sự quan trọng: *đọc xong bài này, người học có hiểu không.*

File này là rubric cho phần đó. Nền lý thuyết: skill `explain-clearly`
(ADEPT, tải nhận thức, gỡ hiểu nhầm, Diátaxis).

**Khi nào chạy rubric này:** khi viết một bài mới, khi viết lại một bài, hoặc khi chủ
trang yêu cầu review. **Không** chạy nó cho mỗi lần sửa một câu — soi 84 bài mỗi lần
đổi một dấu phẩy là cách chắc chắn để không ai soi gì cả.

Mỗi cổng dưới đây có: **hỏi gì** · **đạt trông thế nào** · **trượt trông thế nào**.
Trượt thì sửa, hoặc ghi lý do vào `HANDOFF.md` nếu cố ý không sửa.

---

## C1 · Đúng và đáng tin

**Hỏi:** mỗi tuyên bố trong bài có kiểm chứng được không, và nó thuộc loại nào?

Trang phân ba loại phát biểu, và **phải phân biệt bằng chữ**, vì người đọc không đánh
giá được rủi ro nếu không biết câu nào là sự thật ổn định, câu nào là hạn mức sẽ đổi,
câu nào là ý kiến của người viết:

| loại | ví dụ | yêu cầu |
|---|---|---|
| sự thật ổn định | "PR-AUC nhạy với lớp dương hiếm hơn ROC-AUC" | nêu thẳng |
| hạn mức / sản phẩm | "bậc miễn phí Colab cấp GPU tuỳ lúc" | **ghi ngày kiểm** |
| phán đoán của người viết | "với 2 tuần thì LightGBM là lựa chọn đúng" | nói rõ là phán đoán |

**Trượt:** câu tuyệt đối. `luôn`, `không bao giờ`, `mọi`, `chắc chắn`, `không thể` —
gần như mỗi lần xuất hiện là một lần nói quá. Ví dụ đã từng phải sửa trong trang này:
"Pipeline thì không thể rò rỉ" (sai — Pipeline chặn *phần lớn* rò rỉ tiền xử lý),
"CLT luôn đúng" (sai — có điều kiện, và là kết quả tiệm cận).

**Đạt:** con số có nguồn hoặc được gọi thẳng là ví dụ minh hoạ. Nếu một con số chỉ để
minh hoạ ("+0,01 PR-AUC") thì phải **ghi rõ nó là minh hoạ**, đừng để người học tưởng
đó là kết quả kỳ vọng.

---

## C2 · Trình tự ADEPT — cụ thể trước, trừu tượng sau

**Hỏi:** bài mở đầu bằng cái gì?

Thứ tự bắt buộc, không đảo:

1. **A**nalogy — nối vào thứ người học đã biết
2. **D**iagram — hình, cho thấy hình dạng và quan hệ
3. **E**xample — một ca cụ thể, **có số thật, tính được**
4. **P**lain language — diễn đạt lại bằng lời thường
5. **T**echnical — công thức, ký hiệu, định nghĩa hình thức, **cuối cùng**

Trên trang này bước 5 thường **nằm trong popup** `data-mathdef`, không nằm trên mạch
chính. Đó là cách trang thực thi "công thức đi sau".

**Trượt:** bài mở bằng "X được định nghĩa là…". Đó là thói quen sách giáo khoa và là
lý do sách giáo khoa khó đọc — ký hiệu chỉ có nghĩa khi đã có thứ để gắn nó vào.

**Đạt:** đoạn đầu tiên là **vấn đề mà khái niệm này sinh ra để giải**. Không có bối
cảnh vấn đề thì mọi công thức đều tuỳ tiện. Xem `dl-attn` làm mẫu: nó mở bằng câu
"Con mèo không băng qua đường vì *nó* quá mệt" — một câu tiếng Việt bình thường — rồi
mới tới attention.

**Concreteness fading:** tầng trừu tượng cuối phải **ánh xạ tường minh** về tầng cụ
thể đầu. Nếu không nối lại, người học có hai thứ rời rạc trong đầu chứ không phải một
khái niệm.

---

## C3 · Gỡ hiểu nhầm trước khi xây

**Hỏi:** điều **sai** mà người ta hay tin sẵn về chuyện này là gì?

Người học hiếm khi tới với cái đầu trống. Nếu không gỡ mô hình sai ra trước, lời giải
thích đúng sẽ **đắp chồng lên nó** và bị bóp méo theo — người đọc gật đầu nhưng hiểu
lệch, và đó là kiểu thất bại khó phát hiện nhất.

Trình tự bốn bước, không bỏ bước nào:

1. gọi tên hiểu nhầm
2. **nói tại sao nó nghe có lý** ← bỏ bước này thì người đọc thấy bị coi thường và âm
   thầm giữ lại niềm tin cũ
3. chỉ ra chỗ nó sai
4. đưa mô hình đúng

**Đạt:** `m-bayes` — "99% chính xác vẫn có thể vô dụng", chứng minh bằng số chứ không
bằng cảm giác. `s-intro` — gỡ thẳng "DS = train model".

**Trượt:** bài dạy đúng nhưng không nhắc tới cái sai. Với các khái niệm có mô hình sai
phổ biến mạnh (p-value, correlation/causation, accuracy, "AI tự học"), bỏ C3 là trượt.

---

## C4 · Ví von phải có ranh giới

**Hỏi:** mỗi phép ví von trong bài đã nói **nó hỏng ở đâu** chưa?

Đây là quy tắc **bắt buộc**, không phải khuyến nghị. Một ví von không có ranh giới sinh
ra hiểu nhầm khó gỡ hơn cả việc không giải thích gì.

Ba yêu cầu:

- Nguồn ví von nằm trong **kinh nghiệm sống thật** của người đọc, không phải một chủ đề
  khó khác. (Giải thích gradient bằng "giống như tối ưu lồi" là ví von vòng tròn.)
- Chỉ rõ **cái gì ánh xạ sang cái gì** — đừng thả một hình ảnh đẹp rồi bỏ đó.
- Nói chỗ nó hỏng. Ví dụ mẫu: "Mạng nơ-ron giống bộ não — nhưng chỉ giống ở chỗ có đơn
  vị nối nhau qua trọng số; nó không có chất dẫn truyền, không học liên tục, và một
  'neuron' ở đây chỉ là một phép nhân cộng."

Không tìm được ví von tốt thì **dùng ví dụ cụ thể có số** thay thế. Ví dụ cụ thể luôn
an toàn hơn ví von tồi.

---

## C5 · Một ý mới mỗi lúc

**Hỏi:** có câu nào giới thiệu **hai** khái niệm lạ cùng lúc không?

Bộ nhớ làm việc giữ được khoảng bốn mảnh. Hệ quả cụ thể:

- Dạy A cho vững, dạy B cho vững, **rồi** mới nói A tương tác với B thế nào.
- **Cắt tải rác:** mọi thứ không phục vụ ý chính đang cạnh tranh bộ nhớ với ý chính —
  hình trang trí, ngoại lệ hiếm, tên riêng không cần thiết, lịch sử phát triển.
- **Ngoại lệ đi sau, không đi cùng.** Nói cái đúng-95% trước, đánh dấu "có ngoại lệ,
  nói sau", rồi quay lại. Trên trang này ngoại lệ thường đi vào popup.

**Trượt:** "Dùng `StratifiedKFold` với `scoring='average_precision'` để tránh
optimistic bias do class imbalance" — bốn khái niệm lạ, một câu.

---

## C6 · Mỗi bài có kết quả kiểm được

**Hỏi:** xong bài này người học **cầm được cái gì**?

`PAYOFF[id][0]` phải là một **artifact hoặc năng lực kiểm được**, không phải một chủ
đề. Nó được render thành dải mục tiêu ở đầu bài, nên viết dở là người đọc thấy ngay.

| trượt | đạt |
|---|---|
| "Hiểu về feature engineering" | "Mã hoá sin/cos, gõ được ở cả bốn mức từ notebook tới Pipeline" |
| "Nắm được cách đánh giá mô hình" | "Một cặp ngưỡng có lý do bằng tiền, và khoảng tin cậy đúng loại" |

Bài quan trọng phải có `ACCEPT[id]` — tiêu chí đạt dạng *file phải có / lệnh phải chạy
/ test phải pass / tự giải thích được*. Đó là ranh giới giữa "đã đọc" và "làm được", và
là lý do trang này khác một danh sách link.

**Diátaxis — đừng trộn bốn loại:** bài *giải thích* (hiểu), bài *hướng dẫn* (làm được
việc X), bài *dắt tay* (học lần đầu), bài *tra cứu* (bảng, danh sách). Trộn chúng là
nguyên nhân số một khiến một bài trở nên vô dụng. Trang này có bài tra cứu thật
(`s-lookup`, `t-stack`, `r-glossary`) — chúng **được phép** là bảng và chip, đừng
"sửa" chúng thành bài giảng.

---

## C7 · Mạch chính sạch

Quy tắc và cách chọn popup vs drawer: **CLAUDE.md §7**. Rubric ở đây chỉ thêm phần cần
mắt người:

**Hỏi:** xoá hết chip nhánh phụ đi, mạch chính còn đọc được thành một đường liền không?

- Còn liền → phân tầng đúng.
- Bị hụt, thiếu mắt xích → đã rút quá nhiều vào popup, mạch chính bị rỗng.
- Đọc thấy lan man, đi vòng → còn nhánh phụ nằm trên mạch chính.

**Hỏi ngược:** một người đọc **bỏ qua toàn bộ chip** có làm được deliverable của bài
không? Nếu không, có thứ bắt buộc đang bị chôn trong popup — kéo nó ra.

`G-LAYER` bắt hộ các tiêu đề mục tự tố giác. Nó **không** bắt được một đoạn văn lan man
giữa bài — đó là việc của mắt.

---

## C8 · Không đổ dữ liệu

**Hỏi:** đoạn này đang **nói một ý**, hay đang **đọc lại một bảng thành câu**?

Đây là lỗi khó tự thấy nhất khi viết, vì nó *cảm giác* như đang đầy đủ và cẩn thận.
Ví dụ thật đã phải sửa trong trang này — mô tả của hình 14 ngày:

> ✗ "Số giờ mỗi ngày: ngày 1 5.8 giờ, ngày 2 5.3 giờ, ngày 3 5.9 giờ, … ngày 14 5.8
> giờ. Tổng 75.8 giờ."

Đúng dữ liệu, vô dụng: mắt đã thấy 14 con số đó trên cột, lịch ngay dưới in lại lần
thứ ba, và dãy số chôn mất điều duy nhất cái hình muốn nói.

> ✓ "14 ngày, tổng 75,8 giờ, trung bình 5,4 giờ/ngày. Nhẹ nhất ngày 8 (4,8 giờ), nặng
> nhất ngày 13 (6,3 giờ) — chênh nhau chưa tới 1,5 giờ, nên **không có ngày nào rảnh
> để dồn việc sang: trượt một ngày là trượt cả chuỗi.**"

Quy tắc:

- **Mô tả hình nói HÌNH DẠNG + hai đầu mút + kết luận**, không liệt kê từng giá trị.
  Đọc mô tả mà không nhìn hình phải hiểu được *hình này chứng minh điều gì*.
- Số liệu thô, nếu cần cho trình đọc màn hình, để trong `<desc>` của SVG — đó đúng là
  chỗ của nó, và nó không chiếm chỗ trên trang.
- **Ba lần là quá nhiều.** Nếu một con số đã có trên hình và trong bảng thì đừng viết
  nó lần thứ ba thành câu.
- Dữ liệu thì dùng `<table>`. Câu văn chỉ để nói *ý* của dữ liệu.

`G-DUMP` bắt hộ hai dấu vết: mô tả hình sinh bằng `map(...).join(...)` trên cả một
mảng dữ liệu, và đoạn văn có mật độ chữ số cao kèm nhiều cụm số ngăn bằng phẩy. Nó
**không** bắt được một đoạn văn lan man không có số — đó vẫn là việc của mắt (C5, C7).

## Tự kiểm cuối — chạy hết trước khi nói xong

- [ ] Đoạn đầu đã là **câu trả lời / vấn đề**, chưa phải dẫn nhập?
- [ ] Người đọc **dừng sau đoạn đầu** vẫn có được điều họ cần?
- [ ] Mọi thuật ngữ đều **được giới thiệu trước khi dùng** (CLAUDE.md §11)?
- [ ] Có **ít nhất một thứ cụ thể** — con số, ví dụ, tình huống?
- [ ] Ví von nào cũng đã nêu **chỗ nó hỏng**?
- [ ] Đã nói **vấn đề nó giải quyết**, không chỉ nó là gì?
- [ ] Không câu nào chứa **hai ý mới cùng lúc**?
- [ ] **Cắt được 20% chữ** mà không mất ý nào không? Nếu được thì cắt.
- [ ] Đã gỡ **hiểu nhầm phổ biến** trước khi xây?
- [ ] Đơn giản nhưng **không rỗng** — mỗi đoạn có một tuyên bố kiểm chứng được?
- [ ] Người đọc tự **suy được sang tình huống mới** chưa nói trong bài?
- [ ] `PAYOFF[id][0]` là **kết quả cầm được**, không phải chủ đề?

---

## Lỗi hay gặp, và cách sửa

| lỗi | biểu hiện | sửa |
|---|---|---|
| định nghĩa đi trước | mở bằng "X là…" | đảo lại: vấn đề / ví von trước |
| vòng tròn | giải thích A bằng B, mà B cần A | tìm điểm neo **ngoài** chủ đề |
| đổ dữ liệu | kể hết mọi thứ mình biết | chọn 3 trụ, bỏ phần còn lại vào popup |
| ví von thả trôi | ví von hay, không nói giới hạn | thêm câu "chỗ này khác ở…" |
| đúng nhưng vô dụng | chính xác tuyệt đối, đầy ngoại lệ | nói cái đúng-95% trước |
| mơ hồ giả thân thiện | đọc dễ chịu, xong không nắm được gì | ép mỗi đoạn một tuyên bố kiểm được |
| đắp lên mô hình sai | người đọc gật đầu nhưng hiểu lệch | gỡ hiểu nhầm trước (C3) |
| hứa quá | "master sau 2 tuần" | dùng nhãn `SCOPE`, nói thẳng phạm vi |
