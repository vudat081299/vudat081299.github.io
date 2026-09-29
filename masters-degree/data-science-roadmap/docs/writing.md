# Viết sao cho người đọc hiểu

Cổng kiểm được cấu trúc, không kiểm được điều quan trọng nhất: đọc xong bài, người ta có hiểu không. File này
là tám câu phải tự soi.

- Soi khi viết một bài mới, viết lại một bài, hoặc khi chủ trang yêu cầu review; đừng soi cả trang mỗi lần sửa một dấu phẩy.
- Mỗi mục có ba phần: hỏi gì, đạt trông thế nào, trượt trông thế nào. Trượt thì sửa; cố ý không sửa thì ghi
  lý do vào mục của phiên ở [HISTORY.md](../HISTORY.md).

## 1 · Đúng và đáng tin

Hỏi: mỗi câu có kiểm chứng được không, và nó thuộc loại nào? Ba loại phát biểu phải phân biệt bằng chữ:

| loại | ví dụ | phải làm gì |
|---|---|---|
| sự thật ổn định | "PR-AUC nhạy với lớp dương hiếm hơn ROC-AUC" | nêu thẳng |
| hạn mức của nhà cung cấp | "bậc miễn phí Colab cấp GPU tuỳ lúc" | ghi ngày kiểm |
| ý kiến của người viết | "với 2 tuần thì LightGBM là lựa chọn đúng" | nói rõ đây là phán đoán |

- Trượt: câu tuyệt đối (`luôn`, `không bao giờ`, `mọi`, `chắc chắn`, `không thể`). "Pipeline thì không thể
  rò rỉ" sai: Pipeline chặn phần lớn rò rỉ tiền xử lý, không phải tất cả. "CLT luôn đúng" sai: nó có điều
  kiện, và là kết quả tiệm cận.
- Đạt: con số nào cũng có nguồn, hoặc được gọi thẳng là minh hoạ. Dùng đúng hai cụm "số minh hoạ" và "số
  chạy thật trên bộ mô phỏng", không nghĩ ra cách gọi mới.

## 2 · Cụ thể trước, trừu tượng sau

Hỏi: bài mở đầu bằng cái gì? Thứ tự ADEPT, không đảo:

1. Analogy: ví von nối vào thứ người học đã biết.
2. Diagram: hình cho thấy hình dạng và quan hệ.
3. Example: một ca cụ thể, có số thật, tính được.
4. Plain language: nói lại bằng lời thường.
5. Technical: công thức, ký hiệu, định nghĩa hình thức; thường nằm trong popup.

- Trượt: mở bằng "X được định nghĩa là…".
- Đạt: đoạn đầu nói vấn đề mà khái niệm sinh ra để giải. Mẫu: `dl-attn` mở bằng một câu tiếng Việt bình
  thường ("Con mèo không băng qua đường vì nó quá mệt") rồi mới tới attention.
- Tầng trừu tượng cuối phải chỉ rõ nó ứng với cái gì ở ví dụ ban đầu.

## 3 · Gỡ hiểu nhầm trước khi xây

Hỏi: điều sai mà người ta hay tin sẵn về chuyện này là gì? Không gỡ thì lời giải thích đúng đắp lên mô hình
sai, và người đọc gật đầu mà hiểu lệch. Bốn bước, không bỏ bước nào:

1. gọi tên hiểu nhầm;
2. nói vì sao nó nghe có lý — bỏ bước này thì người đọc thấy bị coi thường và giữ niềm tin cũ;
3. chỉ chỗ nó sai;
4. đưa mô hình đúng.

- Đạt: `m-bayes` chứng minh bằng số rằng "99% chính xác vẫn có thể vô dụng"; `s-intro` gỡ "Data Science = train model".
- Trượt: dạy đúng mà không nhắc cái sai, ở khái niệm có hiểu nhầm phổ biến mạnh (p-value, tương quan và nhân
  quả, accuracy, "AI tự học").

## 4 · Ví von phải nói chỗ nó hỏng

Bắt buộc, không phải khuyến nghị.

- Thứ đem ra ví von nằm trong kinh nghiệm sống thật của người đọc, không phải một chủ đề khó khác (gradient
  "giống tối ưu lồi" là ví von vòng tròn).
- Chỉ rõ cái gì ứng với cái gì.
- Nói chỗ nó hỏng. Mẫu: "Mạng nơ-ron giống bộ não — nhưng chỉ ở chỗ có đơn vị nối nhau qua trọng số. Nó không
  có chất dẫn truyền, không học liên tục, và một 'neuron' ở đây chỉ là một phép nhân cộng."
- Không tìm được ví von tốt thì dùng ví dụ cụ thể có số.

## 5 · Một ý mới mỗi lúc

Hỏi: có câu nào đưa ra hai khái niệm lạ cùng lúc không?

- Dạy A cho vững, dạy B cho vững, rồi mới nói A và B tương tác thế nào.
- Cắt mọi thứ không phục vụ ý chính: hình trang trí, ngoại lệ hiếm, tên riêng không cần, lịch sử phát triển.
- Ngoại lệ đi sau, không đi cùng: nói cái đúng-95% trước, đánh dấu "có ngoại lệ", rồi quay lại (thường trong popup).
- Trượt: "Dùng `StratifiedKFold` với `scoring='average_precision'` để tránh optimistic bias do class
  imbalance" — bốn khái niệm lạ trong một câu.

## 6 · Mỗi bài cho ra một kết quả kiểm được

Hỏi: xong bài người học cầm được cái gì? `PAYOFF[id][0]` là sản phẩm hoặc năng lực kiểm được, không phải chủ đề.

| trượt | đạt |
|---|---|
| "Hiểu về feature engineering" | "Mã hoá sin/cos, gõ được ở cả bốn mức từ notebook tới Pipeline" |
| "Nắm được cách đánh giá mô hình" | "Một cặp ngưỡng có lý do bằng tiền, và khoảng tin cậy đúng loại" |

- Bài quan trọng có `ACCEPT[id]`: file phải có, lệnh phải chạy, test phải pass, tự giải thích được.
- Bốn loại bài, đừng trộn: giải thích (hiểu một khái niệm), hướng dẫn (làm được việc X), dắt tay (học lần
  đầu, từng bước), tra cứu (bảng, danh sách, sổ tay).
- Bài tra cứu (`s-lookup`, `r-stack`, `r-glossary`) được phép chỉ là bảng và chip; đừng biến chúng thành bài giảng.

## 7 · Mạch chính phải sạch

Luật chọn popup hay ngăn phải: CLAUDE.md §7. Phần cần mắt người:

- Che hết chip nhánh phụ đi: phần còn lại đọc thành một đường liền là đúng; hụt mắt xích là rút quá nhiều
  vào popup; lan man là còn nhánh phụ trên mạch chính.
- Người bỏ qua toàn bộ chip vẫn phải làm được deliverable của bài; không thì kéo thứ bắt buộc ra khỏi popup.
- `G-LAYER` bắt tiêu đề tự khai là nhánh phụ; đoạn văn lan man giữa bài là việc của mắt.

## 8 · Đừng đọc lại bảng thành câu

Hỏi: đoạn này nói một ý, hay đọc lại một bảng số?

> ✗ "Số giờ mỗi ngày: ngày 1 5.8 giờ, ngày 2 5.3 giờ, ngày 3 5.9 giờ, … ngày 14 5.8 giờ. Tổng 75.8 giờ."
>
> ✓ "14 ngày, tổng 75,8 giờ, trung bình 5,4 giờ/ngày. Nhẹ nhất ngày 8 (4,8 giờ), nặng nhất ngày 13 (6,3
> giờ) — chênh chưa tới 1,5 giờ, nên không có ngày nào rảnh để dồn việc sang: trượt một ngày là trượt cả chuỗi."

- Mô tả hình nói hình dạng, hai đầu mút và kết luận; đọc mô tả mà không nhìn hình phải hiểu hình chứng minh gì.
- Số thô, nếu cần cho trình đọc màn hình, để trong `<desc>` của SVG.
- Một con số đã có trên hình và trong bảng thì đừng viết lần thứ ba thành câu.
- Dữ liệu dùng `<table>`; câu văn chỉ để nói ý của dữ liệu.
- `G-DUMP` bắt hai dấu vết (mô tả sinh bằng `map(...).join(...)`, đoạn văn dày cụm số); đoạn lan man không có số là việc của mắt.

## Tự kiểm trước khi nói xong

- [ ] Đoạn đầu là câu trả lời hoặc vấn đề, chưa phải lời dẫn nhập; dừng sau đoạn đầu vẫn có điều cần biết.
- [ ] Mọi thuật ngữ được giới thiệu trước khi dùng (CLAUDE.md §11).
- [ ] Có ít nhất một thứ cụ thể: con số, ví dụ, tình huống.
- [ ] Ví von nào cũng nêu chỗ nó hỏng; đã nói vấn đề nó giải quyết, không chỉ nó là gì.
- [ ] Không câu nào chứa hai ý mới cùng lúc; cắt được 20% chữ mà không mất ý thì cắt.
- [ ] Đã gỡ hiểu nhầm phổ biến trước khi xây.
- [ ] Đơn giản nhưng không rỗng: mỗi đoạn có một câu kiểm chứng được.
- [ ] Người đọc tự suy được sang tình huống mới mà bài chưa nói.
- [ ] `PAYOFF[id][0]` là kết quả cầm được, không phải chủ đề.

## Lỗi hay gặp

| lỗi | biểu hiện | sửa |
|---|---|---|
| định nghĩa đi trước | mở bằng "X là…" | đảo lại: vấn đề hoặc ví von trước |
| giải thích vòng tròn | giải thích A bằng B, mà hiểu B lại cần A | tìm điểm neo ngoài chủ đề |
| kể hết mọi thứ mình biết | bài dài, không có trọng tâm | chọn 3 ý trụ, phần còn lại vào popup |
| ví von thả trôi | ví von hay, không nói giới hạn | thêm câu "chỗ này khác ở…" |
| đúng nhưng vô dụng | chính xác tuyệt đối, đầy ngoại lệ | nói cái đúng-95% trước |
| dễ đọc nhưng rỗng | đọc dễ chịu, xong không nắm được gì | ép mỗi đoạn có một câu kiểm được |
| đắp lên mô hình sai | người đọc gật đầu nhưng hiểu lệch | gỡ hiểu nhầm trước (mục 3) |
| hứa quá | "master sau 2 tuần" | dùng nhãn `SCOPE`, nói thẳng phạm vi |
