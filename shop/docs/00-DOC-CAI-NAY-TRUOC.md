# Đọc cái này trước

Bộ tài liệu cho dự án `shop/` — một storefront dựng cho shop nến thơm thủ công, và cả một bộ
lập luận về việc **có nên dựng nó hay không**.

Viết ngày 20/09/2026. Người đọc chính là Đạt; người đọc thứ hai là mọi phiên AI làm việc ở đây.

---

## Đọc theo việc bạn đang cần làm

| Bạn đang… | Đọc |
|---|---|
| Chuẩn bị đi gặp chủ shop | [04-DAM-PHAN.md](04-DAM-PHAN.md), rồi mở `../pitch/` trên điện thoại |
| Muốn biết có nên làm việc này không | [01-BOI-CANH-VA-CO-HOI.md](01-BOI-CANH-VA-CO-HOI.md) |
| Lo rằng KiotViet đã giải quyết rồi | [03-DOI-THU-VA-TICH-HOP.md](03-DOI-THU-VA-TICH-HOP.md) |
| Lo tích hợp sàn/vận chuyển/thanh toán khó | [03-DOI-THU-VA-TICH-HOP.md](03-DOI-THU-VA-TICH-HOP.md), mục tích hợp |
| Muốn biết làm gì trước | [02-LO-TRINH.md](02-LO-TRINH.md) |
| Sắp viết mã trong `shop/` | [../CLAUDE.md](../CLAUDE.md), rồi [05-KIEN-TRUC.md](05-KIEN-TRUC.md) |
| Vừa mở một phiên mới | [../HANDOFF.md](../HANDOFF.md) |
| Muốn biết vì sao chọn thế này | [adr/](adr/) |
| Muốn biết còn nợ gì | [NO-KY-THUAT.md](NO-KY-THUAT.md) |

---

## Bốn điều toàn bộ bộ tài liệu này xoay quanh

**1. Chúng ta biết rất ít.** Toàn bộ dữ kiện về shop gồm đúng năm thứ: khoảng 5–10 đơn/ngày,
năm mùi hương, giá quanh 300.000 ₫, làm thủ công, bán trên Instagram / TikTok / Shopee. Chưa ai
gặp chủ shop. Mọi đề xuất trong đây là **giả thuyết**, và chỗ nào là giả thuyết thì có ghi.

**2. Rủi ro lớn nhất là xây nhầm, không phải xây sai.** Kiến trúc đẹp, mã sạch, cổng chặt và
khả năng lên 500 đơn/ngày đều gần như vô nghĩa nếu thứ được xây không chạm vào nút thắt thật.
Bất định về business đang lớn hơn bất định về công nghệ rất nhiều.

**3. Phần lớn nghiệp vụ bán hàng là hàng hoá phổ thông.** KiotViet 270–490 nghìn/tháng,
Nhanh.vn 450 nghìn/tháng cho cả POS lẫn website lẫn đồng bộ sàn *[đã kiểm: bảng giá chính thức,
09/2026]*. Tự xây lại những thứ đó là lấy tiền của người khác để dựng một bản kém hơn. Xem
[adr/0004](adr/0004-khong-xay-lai-phan-mem-ban-hang.md).

**4. Con số duy nhất cầm chắc là phí sàn.** Shopee thu 6% phí xử lý giao dịch cộng 3.000 ₫/đơn
cộng phí cố định theo ngành *[nguồn ngành — xem cảnh báo ở 01 §2]*; tổng chi phí nền tảng của
TikTok Shop được ghi nhận khoảng 23–24% doanh thu *[nguồn thứ cấp — chưa kiểm, xem 01 §2]*.
Con số cộng được từ các khoản kiểm được là **21%**. Hai nhãn này trước đây ghi *[đã kiểm]* —
sai, và sai ngay phía trên chính cái bảng định nghĩa nhãn ở cuối file này. Mọi con số về "website đẹp thì chuyển đổi cao hơn" hay "quiz tăng
chuyển đổi 40%" thì **không** cầm chắc — đã truy, tất cả đều do chính công ty bán phần mềm ấy
công bố, không có nhóm đối chứng.

---

## Quy ước ghi nguồn

Mọi con số trong bộ tài liệu này mang một dấu:

| Dấu | Nghĩa |
|---|---|
| *[đã kiểm: nguồn]* | đã mở đúng trang ấy và đọc được con số |
| *[chưa kiểm]* | có thấy ở đâu đó nhưng chưa xác minh — **không nói ra trong đàm phán** |
| *[đoán — phải hỏi chị ấy]* | không biết, và đây là chỗ cần hỏi |

Dấu này quan trọng hơn bản thân con số. Một con số sai nói ra bằng giọng chắc chắn trong buổi
đàm phán còn tệ hơn một chỗ để trống.

---

## Thứ đã dựng được

Năm trang chạy thật trong `shop/`, cộng một bản đề xuất ở `shop/pitch/`. Xem
[../HANDOFF.md](../HANDOFF.md) để biết cách chạy.

Nhắc lại cho rõ, vì đây là chỗ dễ tự lừa mình nhất: **ba tính năng đã dựng đều là giả thuyết
viết thành phần mềm.** Việc chúng chạy được không chứng minh là chúng cần thiết. Bảng "đang
đoán rằng" ở [05-KIEN-TRUC.md](05-KIEN-TRUC.md) ghi rõ mỗi cái đang đặt cược vào điều gì và
làm sao biết mình sai.
