# ADR 0004 — Không tự xây phần mềm quản lý bán hàng

**Ngày:** 20/09/2026 · **Trạng thái:** đang áp dụng

## Bối cảnh

Ý tưởng ban đầu có nhắc tới order management, inventory, customer, payment, shipping, dashboard —
tức là một hệ thống gần giống KiotViet nhưng "chỉ đúng nghiệp vụ của brand này".

## Quyết định

Không xây. Khi shop cần những năng lực đó, khuyên chủ shop **mua phần mềm có sẵn**.

## Vì sao

Giá thị trường đã kiểm ngày 20/09/2026 từ bảng giá chính thức:

| Phần mềm | Giá |
|---|---|
| KiotViet | 270.000 – 490.000 ₫/tháng |
| Nhanh.vn POS Pro | 350.000 ₫/tháng (+200k website, +100k đồng bộ sàn) |
| Sapo | từ 170.000 ₫/tháng, gói có website 600.000 ₫ |
| Haravan | từ 300.000 ₫/tháng, có API từ gói 680.000 ₫ |

Với khoảng **450.000 ₫/tháng**, Nhanh.vn cho POS + website + đồng bộ sàn, **có sẵn hôm nay**.
Tự xây lại nghĩa là bỏ hàng trăm giờ để có một bản kém hoàn thiện hơn của thứ mua được với giá
bằng một phần nhỏ. Phần lớn nghiệp vụ bán lẻ là hàng hoá phổ thông — đó chính là lý do những
phần mềm ấy tồn tại và sống được.

## Chỗ ngoại lệ, và điều kiện của nó

Phần mềm riêng chỉ thắng ở chỗ workflow **thật sự đặc thù**. Với shop nến, ứng viên rõ nhất là
**nguyên vật liệu và mẻ sản xuất**: bán một cây nến thì trừ bao nhiêu gam sáp, bao nhiêu ml tinh
dầu, còn đủ cho mấy mẻ nữa. Không phần mềm bán lẻ đại trà nào biết công thức của shop.

Nhưng **chỉ xây khi chủ shop đã hết sáp giữa lúc đang có đơn ít nhất một lần.** Chưa xảy ra thì
đó vẫn là một câu chuyện hay chứ chưa phải một vấn đề.

## Xét lại khi

- Chủ shop đã dùng phần mềm có sẵn và chỉ ra được cụ thể chỗ nó không làm được, kèm thiệt hại
  đo được bằng tiền hoặc bằng giờ.
- Hoặc phần đặc thù (công thức, mẻ sản xuất) trở thành nút thắt thật.

Nghe mô tả rồi tưởng tượng ra nút thắt thì **không** tính.
