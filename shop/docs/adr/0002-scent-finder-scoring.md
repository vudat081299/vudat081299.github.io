# ADR 0002 — Tìm mùi chấm điểm bằng trọng số, phân xử bằng câu ký ức

**Ngày:** 20/09/2026 · **Trạng thái:** đang áp dụng

## Bối cảnh

Trang Tìm mùi phải ánh xạ câu trả lời của khách sang một trong năm mùi. Hai lối làm: so tag
(mỗi mùi có sẵn `mood`, đối chiếu chữ), hoặc cộng trọng số khai tường minh trong data.

## Quyết định

Trọng số tường minh: mỗi đáp án mang `w`, một map từ khoá mùi sang số nguyên dương. Hoà ở đỉnh
thì phân xử bằng trọng số của câu **ký ức** (`q-kyuc`), vẫn hoà thì theo thứ tự trong `scents`.

## Vì sao không so tag

Tag là chữ, chữ thì mờ, và "ấm" khớp với mấy mùi cùng lúc. Trọng số **cộng được** và quan trọng
hơn: **kiểm được bằng máy**. Cổng duyệt toàn bộ 320 tổ hợp đáp án và chặn commit nếu có mùi
không bao giờ thắng, hoặc một mùi thắng quá nửa. Với so tag thì không có gì để duyệt.

## Con số đã đo trước khi chọn

Bốn phương án trọng số được chạy thử trên cả 320 tổ hợp:

| Phương án | Hoà ở đỉnh | Phân bố mùi thắng (thấp nhất → cao nhất) |
|---|---|---|
| Ban đầu | 15,9% | 9,7% → 28,8% |
| Câu ký ức nặng 4 | 15,0% | 12,8% → 25,6% |
| Nâng trần mùi ngọt | 18,4% | 12,8% → 28,4% |
| **Cả hai (đã chọn)** | **15,0%** | **15,9% → 25,0%** |

Sau khi thêm phép phân xử bằng câu ký ức: phân bố còn **17,2% → 23,8%**, và chỉ **2,2%** số tổ
hợp rơi xuống tới mức phải dùng thứ tự trong `scents`.

Vì sao phải nâng mùi ngọt: ở bản đầu nó chỉ thắng 9,7% số tổ hợp, trong khi mùi ngọt bán chạy
ngoài đời. Một bộ câu hỏi ít giới thiệu đúng thứ dễ bán là một bộ câu hỏi sai.

## Đánh đổi chấp nhận

- **Trọng số là do người viết đặt, không phải học từ dữ liệu.** Không có gì bảo đảm nó khớp
  khẩu vị khách thật. Đây là giả định, không phải sự thật.
- 2,2% số tổ hợp vẫn thiên vị mùi đứng đầu danh sách. Đã đo, đã ghi ra, chấp nhận.

## Xét lại khi

- Có nội dung thật của năm mùi → trọng số phải chỉnh theo mùi thật, rồi **chạy lại cổng và đọc
  dòng phân bố**, đừng đoán.
- Có đủ lượt làm quiz thật và biết khách thật sự mua gì sau đó → lúc ấy mới nên nói tới việc
  học trọng số từ dữ liệu. Chưa có dữ liệu thì đừng bàn.
- Số mùi vượt khoảng 12 → số tổ hợp phình, cân nhắc lấy mẫu thay vì duyệt hết (cổng đã có
  ngưỡng 200.000 tổ hợp thì bỏ qua).
