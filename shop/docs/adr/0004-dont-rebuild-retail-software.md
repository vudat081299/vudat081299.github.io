# ADR 0004 — Không tự xây phần mềm quản lý bán hàng

**Ngày:** 20/09/2026 · **Trạng thái:** đang áp dụng · **Sửa:** 24/09/2026 — xem mục cuối

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

Phần mềm riêng chỉ thắng ở chỗ workflow **thật sự đặc thù**. Với shop nến, ứng viên duy nhất
còn lại là **nửa chất lượng của sổ mẻ**: nhiệt độ lúc pha hương và lúc rót, mẻ nào hỏng mấy cây
và vì sao, cây nào ủ đủ ngày, mẻ nào dùng lô tinh dầu nào. Nửa **định lượng** — bán một cây thì
trừ bao nhiêu gam sáp, bao nhiêu ml tinh dầu, còn đủ cho mấy mẻ — **đã có người bán**, xem mục
sửa ở cuối.

Và ngay cả nửa chất lượng, ở 5–10 đơn/ngày, là một tờ giấy ở bàn đổ cộng vài cột trong sheet,
không phải một phần mềm ([06](../06-VALUE-CHAIN.md) §5). Chỉ nghĩ tới phần mềm khi chủ shop đã
**hết sáp giữa lúc đang có đơn** ít nhất một lần, hoặc sổ giấy đã chạy và vướng ở một chỗ cụ thể.
Chưa xảy ra thì đó vẫn là một câu chuyện hay chứ chưa phải một vấn đề.

## Xét lại khi

- Chủ shop đã dùng phần mềm có sẵn và chỉ ra được cụ thể chỗ nó không làm được, kèm thiệt hại
  đo được bằng tiền hoặc bằng giờ.
- Hoặc nửa chất lượng của sổ mẻ trở thành nút thắt thật.

Nghe mô tả rồi tưởng tượng ra nút thắt thì **không** tính.

## Sửa ngày 24/09/2026 — "không phần mềm bán lẻ nào biết công thức" là SAI

Bản viết ngày 20/09 ghi: *"Không phần mềm bán lẻ đại trà nào biết công thức của shop."* Câu ấy
được chép sang bảng năng lực ở [05](../05-ARCHITECTURE.md) và sang **bản đề xuất mang đi gặp chủ
shop**.

KiotViet — cái tên đầu tiên trong bảng giá ở trên — có tính năng *Hàng sản xuất*: khai nguyên
vật liệu và số lượng cho một thành phẩm; khi hoàn thành phiếu sản xuất thì *"tự động trừ tồn kho
nguyên vật liệu và cộng tồn kho thành phẩm"*; giá vốn thành phẩm tính từ tổng giá vốn nguyên vật
liệu; báo khi không đủ nguyên liệu [đã kiểm: hướng dẫn sử dụng KiotViet, đọc 24/09/2026]. Tức là
làm đúng thứ đoạn ngoại lệ bảo không ai làm.

Điều rút ra: **một ngoại lệ cho phép tự xây phải được kiểm kỹ bằng đúng mức với quy tắc nó phá.**
Quy tắc "đừng xây" dựa trên bảng giá chính thức đã kiểm; còn câu ngoại lệ không mang nhãn nguồn
nào — câu duy nhất trong ADR này như thế.
