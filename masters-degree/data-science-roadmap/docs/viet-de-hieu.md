# Viết sao cho người đọc hiểu

`tools/gate.mjs` kiểm được **cấu trúc**: mục lục còn khớp không, link có hỏng không, có
bài nào bắt người học làm việc dựa trên thứ chưa được dạy không.

Nó **không** kiểm được điều duy nhất thật sự quan trọng: *đọc xong bài này, người ta có
hiểu không.*

File này là danh sách tám câu bạn phải tự soi, vì máy không soi hộ được. Nền lý thuyết:
skill `explain-clearly`.

**Khi nào soi:** khi viết một bài mới, khi viết lại một bài, hoặc khi chủ trang yêu cầu
review. **Đừng** soi cả 84 bài mỗi lần sửa một dấu phẩy — làm vậy là cách chắc chắn để
không ai soi gì cả.

Mỗi mục dưới đây có ba phần: **hỏi gì** · **đạt trông thế nào** · **trượt trông thế nào**.
Trượt thì sửa. Cố ý không sửa thì ghi lý do vào `HANDOFF.md`.

---

## 1 · Đúng và đáng tin

**Hỏi:** mỗi câu trong bài có kiểm chứng được không, và nó thuộc loại nào?

Trang chia phát biểu làm ba loại, và **phải phân biệt bằng chữ**. Lý do: người đọc không
tự đánh giá được rủi ro nếu không biết câu nào là sự thật ổn định, câu nào là con số sẽ
thay đổi, câu nào chỉ là ý kiến của người viết.

| loại | ví dụ | phải làm gì |
|---|---|---|
| sự thật ổn định | "PR-AUC nhạy với lớp dương hiếm hơn ROC-AUC" | nêu thẳng |
| hạn mức của nhà cung cấp | "bậc miễn phí Colab cấp GPU tuỳ lúc" | **ghi ngày kiểm** |
| ý kiến của người viết | "với 2 tuần thì LightGBM là lựa chọn đúng" | nói rõ đây là phán đoán |

**Trượt:** câu tuyệt đối. `luôn`, `không bao giờ`, `mọi`, `chắc chắn`, `không thể` — gần
như mỗi lần xuất hiện là một lần nói quá. Hai ví dụ đã phải sửa trong trang này: *"Pipeline
thì không thể rò rỉ"* (sai — Pipeline chặn *phần lớn* rò rỉ tiền xử lý, không phải tất cả)
và *"CLT luôn đúng"* (sai — nó có điều kiện, và là kết quả tiệm cận).

**Đạt:** con số nào cũng có nguồn, hoặc được gọi thẳng là ví dụ minh hoạ. Một con số chỉ
để minh hoạ thì phải **ghi rõ nó là minh hoạ** — nếu không, người học sẽ tưởng đó là kết
quả họ phải đạt được. Trang này dùng hai cụm từ cố định cho việc đó: **"số minh hoạ"** và
**"số chạy thật trên bộ mô phỏng"**. Dùng đúng hai cụm đó, đừng nghĩ ra cách gọi mới.

---

## 2 · Cụ thể trước, trừu tượng sau

**Hỏi:** bài mở đầu bằng cái gì?

Thứ tự bắt buộc, không đảo. Tên viết tắt là **ADEPT**, năm bước:

1. **A**nalogy — một phép ví von, nối vào thứ người học đã biết
2. **D**iagram — một hình, cho thấy hình dạng và quan hệ
3. **E**xample — một ca cụ thể, **có số thật, tính được**
4. **P**lain language — nói lại bằng lời thường
5. **T**echnical — công thức, ký hiệu, định nghĩa hình thức. **Cuối cùng.**

Trên trang này bước 5 thường **nằm trong popup**, không nằm trong bài. Đó là cách trang
thực thi luật "công thức đi sau".

**Trượt:** bài mở bằng *"X được định nghĩa là…"*. Đó là thói quen của sách giáo khoa, và
cũng là lý do sách giáo khoa khó đọc: ký hiệu chỉ có nghĩa khi trong đầu đã có thứ để gắn
nó vào.

**Đạt:** đoạn đầu tiên nói **vấn đề mà khái niệm này sinh ra để giải**. Không có bối cảnh
vấn đề thì mọi công thức đều tuỳ tiện. Xem `dl-attn` làm mẫu: nó mở bằng câu *"Con mèo
không băng qua đường vì nó quá mệt"* — một câu tiếng Việt bình thường — rồi mới tới
attention.

**Nối lại ở cuối:** tầng trừu tượng cuối phải **chỉ rõ nó ứng với cái gì** ở ví dụ cụ thể
ban đầu. Không nối lại thì người học có hai thứ rời rạc trong đầu, chứ không phải một khái
niệm.

---

## 3 · Gỡ hiểu nhầm trước khi xây

**Hỏi:** điều **sai** mà người ta hay tin sẵn về chuyện này là gì?

Người học hiếm khi tới với cái đầu trống. Nếu không gỡ mô hình sai ra trước, lời giải thích
đúng sẽ **đắp chồng lên nó** và bị bóp méo theo. Người đọc gật đầu nhưng hiểu lệch — và đó
là kiểu thất bại khó phát hiện nhất, vì không ai phàn nàn.

Bốn bước, không bỏ bước nào:

1. gọi tên hiểu nhầm
2. **nói tại sao nó nghe có lý** ← bỏ bước này thì người đọc thấy bị coi thường, và âm thầm
   giữ lại niềm tin cũ
3. chỉ ra chỗ nó sai
4. đưa mô hình đúng

**Đạt:** `m-bayes` — *"99% chính xác vẫn có thể vô dụng"*, chứng minh bằng số chứ không
bằng cảm giác. `s-intro` — gỡ thẳng *"Data Science = train model"*.

**Trượt:** bài dạy đúng nhưng không nhắc tới cái sai. Với những khái niệm có mô hình sai
phổ biến rất mạnh — p-value, tương quan/nhân quả, accuracy, "AI tự học" — bỏ bước này là
trượt.

---

## 4 · Ví von phải nói cả chỗ nó hỏng

**Hỏi:** mỗi phép ví von trong bài đã nói **nó hỏng ở đâu** chưa?

Đây là luật **bắt buộc**, không phải khuyến nghị. Một phép ví von không nói giới hạn sinh
ra hiểu nhầm còn khó gỡ hơn cả việc không giải thích gì.

Ba yêu cầu:

- Thứ đem ra ví von phải nằm trong **kinh nghiệm sống thật** của người đọc, không phải một
  chủ đề khó khác. Giải thích gradient bằng "giống như tối ưu lồi" là ví von vòng tròn.
- Chỉ rõ **cái gì ứng với cái gì**. Đừng thả một hình ảnh đẹp rồi bỏ đó.
- Nói chỗ nó hỏng. Câu mẫu: *"Mạng nơ-ron giống bộ não — nhưng chỉ giống ở chỗ có đơn vị
  nối nhau qua trọng số. Nó không có chất dẫn truyền, không học liên tục, và một 'neuron'
  ở đây chỉ là một phép nhân cộng."*

Không tìm được ví von tốt thì **dùng ví dụ cụ thể có số** thay thế. Ví dụ cụ thể luôn an
toàn hơn một ví von tồi.

---

## 5 · Một ý mới mỗi lúc

**Hỏi:** có câu nào giới thiệu **hai** khái niệm lạ cùng lúc không?

Bộ nhớ làm việc của người giữ được khoảng bốn mảnh. Ba hệ quả cụ thể:

- Dạy A cho vững, dạy B cho vững, **rồi** mới nói A tương tác với B thế nào.
- **Cắt mọi thứ không phục vụ ý chính.** Hình trang trí, ngoại lệ hiếm, tên riêng không cần
  thiết, lịch sử phát triển — chúng đang cạnh tranh chỗ trong đầu với ý chính.
- **Ngoại lệ đi sau, không đi cùng.** Nói cái đúng-95% trước, đánh dấu "có ngoại lệ, nói
  sau", rồi quay lại. Trên trang này ngoại lệ thường đi vào popup.

**Trượt:** *"Dùng `StratifiedKFold` với `scoring='average_precision'` để tránh optimistic
bias do class imbalance"* — bốn khái niệm lạ trong một câu.

---

## 6 · Mỗi bài phải cho ra một kết quả kiểm được

**Hỏi:** xong bài này người học **cầm được cái gì**?

`PAYOFF[id][0]` phải là một **sản phẩm hoặc năng lực kiểm được**, không phải một chủ đề.
Câu đó hiện thành dòng mục tiêu ở đầu bài, nên viết dở là người đọc thấy ngay.

| trượt | đạt |
|---|---|
| "Hiểu về feature engineering" | "Mã hoá sin/cos, gõ được ở cả bốn mức từ notebook tới Pipeline" |
| "Nắm được cách đánh giá mô hình" | "Một cặp ngưỡng có lý do bằng tiền, và khoảng tin cậy đúng loại" |

Bài quan trọng phải có `ACCEPT[id]` — tiêu chí đạt dạng *file phải có / lệnh phải chạy /
test phải pass / tự giải thích được*. Đó là ranh giới giữa "đã đọc" và "làm được", và là lý
do trang này khác một danh sách link.

**Bốn loại bài, đừng trộn vào nhau:**

| loại | để làm gì |
|---|---|
| giải thích | để hiểu một khái niệm |
| hướng dẫn | để làm được việc X |
| dắt tay | để học lần đầu, đi từng bước |
| tra cứu | bảng, danh sách, sổ tay |

Trộn bốn loại này là nguyên nhân số một khiến một bài trở nên vô dụng. Trang có bài tra cứu
thật (`s-lookup`, `t-stack`, `r-glossary`) — chúng **được phép** chỉ là bảng và chip. Đừng
"sửa" chúng thành bài giảng.

---

## 7 · Đường đi chính phải sạch

Luật chọn popup hay ngăn phải nằm ở **CLAUDE.md §7**. Ở đây chỉ thêm phần cần mắt người.

**Hỏi:** che hết chip nhánh phụ đi, phần còn lại có đọc được thành một đường liền không?

- Còn liền → chia tầng đúng.
- Bị hụt, thiếu mắt xích → đã rút quá nhiều vào popup, bài bị rỗng.
- Đọc thấy lan man, đi vòng → còn nhánh phụ nằm trên đường đi chính.

**Hỏi ngược:** một người **bỏ qua toàn bộ chip** có làm được deliverable của bài không? Nếu
không, có thứ bắt buộc đang bị chôn trong popup — kéo nó ra.

`G-LAYER` bắt hộ những tiêu đề mục tự tố giác (kiểu *"Thứ bạn có thể bỏ qua"*). Nó **không**
bắt được một đoạn văn lan man giữa bài — đó là việc của mắt.

---

## 8 · Đừng đọc lại bảng thành câu

**Hỏi:** đoạn này đang **nói một ý**, hay đang **đọc lại một bảng số**?

Đây là lỗi khó tự thấy nhất khi viết, vì nó *cảm giác* như đang đầy đủ và cẩn thận. Ví dụ
thật đã phải sửa trong trang này — mô tả của hình lịch 14 ngày:

> ✗ "Số giờ mỗi ngày: ngày 1 5.8 giờ, ngày 2 5.3 giờ, ngày 3 5.9 giờ, … ngày 14 5.8 giờ.
> Tổng 75.8 giờ."

Đúng dữ liệu, vô dụng: mắt đã thấy 14 con số đó trên cột, cái lịch ngay dưới in lại lần thứ
ba, và dãy số chôn mất điều duy nhất mà cái hình muốn nói.

> ✓ "14 ngày, tổng 75,8 giờ, trung bình 5,4 giờ/ngày. Nhẹ nhất ngày 8 (4,8 giờ), nặng nhất
> ngày 13 (6,3 giờ) — chênh nhau chưa tới 1,5 giờ, nên **không có ngày nào rảnh để dồn việc
> sang: trượt một ngày là trượt cả chuỗi.**"

Bốn luật:

- **Mô tả hình nói hình dạng, hai đầu mút, và kết luận.** Đừng liệt kê từng giá trị. Đọc
  mô tả mà không nhìn hình phải hiểu được *hình này chứng minh điều gì*.
- Số liệu thô, nếu cần cho trình đọc màn hình, để trong `<desc>` của SVG. Đó đúng là chỗ
  của nó, và nó không chiếm chỗ trên trang.
- **Ba lần là quá nhiều.** Một con số đã có trên hình và trong bảng thì đừng viết nó lần
  thứ ba thành câu.
- Dữ liệu thì dùng `<table>`. Câu văn chỉ để nói *ý* của dữ liệu.

`G-DUMP` bắt hộ hai dấu vết: mô tả hình sinh bằng `map(...).join(...)` trên cả một mảng dữ
liệu, và đoạn văn có nhiều chữ số kèm nhiều cụm số ngăn bằng phẩy. Nó **không** bắt được
một đoạn văn lan man không có số — đó vẫn là việc của mắt, xem mục 5 và 7.

---

## Danh sách tự kiểm — chạy hết trước khi nói xong

- [ ] Đoạn đầu đã là **câu trả lời hoặc vấn đề**, chưa phải lời dẫn nhập?
- [ ] Người đọc **dừng sau đoạn đầu** vẫn có được điều họ cần?
- [ ] Mọi thuật ngữ đều **được giới thiệu trước khi dùng** (CLAUDE.md §11)?
- [ ] Có **ít nhất một thứ cụ thể** — con số, ví dụ, tình huống?
- [ ] Ví von nào cũng đã nêu **chỗ nó hỏng**?
- [ ] Đã nói **vấn đề nó giải quyết**, không chỉ nó là gì?
- [ ] Không câu nào chứa **hai ý mới cùng lúc**?
- [ ] **Cắt được 20% chữ** mà không mất ý nào không? Cắt được thì cắt.
- [ ] Đã gỡ **hiểu nhầm phổ biến** trước khi xây?
- [ ] Đơn giản nhưng **không rỗng** — mỗi đoạn có một câu kiểm chứng được?
- [ ] Người đọc tự **suy được sang tình huống mới** mà bài chưa nói?
- [ ] `PAYOFF[id][0]` là **kết quả cầm được**, không phải chủ đề?

---

## Lỗi hay gặp, và cách sửa

| lỗi | biểu hiện | sửa |
|---|---|---|
| định nghĩa đi trước | mở bằng "X là…" | đảo lại: vấn đề hoặc ví von trước |
| giải thích vòng tròn | giải thích A bằng B, mà hiểu B lại cần A | tìm điểm neo **ngoài** chủ đề |
| kể hết mọi thứ mình biết | bài dài, không có trọng tâm | chọn 3 ý trụ, phần còn lại vào popup |
| ví von thả trôi | ví von hay, không nói giới hạn | thêm câu "chỗ này khác ở…" |
| đúng nhưng vô dụng | chính xác tuyệt đối, đầy ngoại lệ | nói cái đúng-95% trước |
| dễ đọc nhưng rỗng | đọc dễ chịu, xong không nắm được gì | ép mỗi đoạn có một câu kiểm được |
| đắp lên mô hình sai | người đọc gật đầu nhưng hiểu lệch | gỡ hiểu nhầm trước (mục 3) |
| hứa quá | "master sau 2 tuần" | dùng nhãn `SCOPE`, nói thẳng phạm vi |
