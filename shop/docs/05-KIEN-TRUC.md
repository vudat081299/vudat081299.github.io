# Kiến trúc

Tài liệu này dành cho Đạt và cho mọi phiên AI làm việc trong `shop/`. Nó trả lời ba câu khác
nhau mà người ta hay gộp làm một — và việc gộp ấy là một sai lầm có thật, đã được chỉ ra trong
[bản phê bình ghi ở cuối trang này](#phụ-lục-bản-phê-bình-đã-nhận-và-đã-sửa-theo).

| Tầng | Trả lời câu gì | Ai được lợi | Trạng thái |
|---|---|---|---|
| 1. Kiến trúc **sản phẩm** | Business cần những năng lực gì, chúng nối vào nhau ra sao | Chủ shop | Cố ý còn gần như trống |
| 2. Kiến trúc **phần mềm** | Mã nguồn tổ chức thế nào | Người viết mã | Đã có, cố ý nhỏ |
| 3. **Quy trình** phát triển | Làm sao để sửa về sau không đắt, và làm sao kiểm soát AI | Chỉ người viết mã | Đã có, cố ý dừng ở đây |

**Tầng 3 không tạo ra một đồng doanh thu nào cho shop.** Nó chỉ làm cho chi phí sửa về sau rẻ
đi. Nhầm tầng 3 với "làm sản phẩm tốt" là cách dễ nhất để có một quy trình phát triển rất chỉn
chu cho một sản phẩm chưa ai chứng minh là cần tồn tại.

---

## Tầng 1 — Kiến trúc sản phẩm

### Năng lực mà một shop bán nến cần, và ai đang lo

| Năng lực | Ai lo hiện tại | Có nên tự xây không |
|---|---|---|
| Kéo người lạ tới | TikTok, Instagram | Không. Đây là việc marketing, không phải việc phần mềm. |
| Cho khách chọn được món | Sàn + nhắn tin tay | **Có thể** — đây là chỗ Tìm mùi đang thử. Chưa xác nhận. |
| Nhận tiền | Sàn, COD, chuyển khoản | Một phần. VietQR + báo-có tự động là đủ cho quy mô này. |
| Giao hàng | Sàn, hoặc đặt tay | Chưa. Nối GHN/GHTK khi việc nhập tay thành gánh nặng. |
| Biết còn bao nhiêu hàng | Trong đầu chủ shop | Chưa. Xây khi bán hụt lần đầu, không xây trước. |
| Giữ khách quay lại | Gần như chưa ai lo | **Chỗ trống lớn nhất, và nó không cần phần mềm để thử.** |
| Quản lý nguyên vật liệu | Trong đầu chủ shop | Xa. Nhưng đây là chỗ phần mềm riêng thắng phần mềm bán sẵn. |

Bảng này quan trọng hơn mọi sơ đồ lớp trong tài liệu. Đọc nó theo cột cuối: **phần lớn câu trả
lời là "không" hoặc "chưa"**. Xem [02-LO-TRINH.md](02-LO-TRINH.md) để biết điều gì mở khoá từng bước.

### Thứ đã dựng, và giả định nó đang đặt cược

Không cái nào trong ba cái dưới đây đã được xác nhận. Chúng là **giả thuyết viết thành phần mềm**.

| Đã dựng | Giả định | Sai thì biết bằng cách nào |
|---|---|---|
| Landing + trang mùi hương | Có chỗ riêng thì khách tin hơn, chốt dễ hơn | Không ai vào, hoặc vào rồi quay lại sàn để mua |
| Tìm mùi | "Mùi nào thơm nhất" là nút thắt thật, và nó chặn mua hàng | Số tin nhắn hỏi chọn mùi không giảm sau vài tuần |
| Hộp quà | Khách mua làm quà và trả nhiều hơn cho hộp gói sẵn | **Thử được trên Shopee trước, không cần web** — không ai mua SKU hộp đôi |

Dòng cuối đáng chú ý: **cách rẻ nhất để kiểm giả định hộp quà là tạo một SKU trên sàn, không
phải dựng một trang.** Việc đã dựng trang rồi không làm điều đó sai đi.

---

## Tầng 2 — Kiến trúc phần mềm

### Hình dạng: trang tĩnh, dữ liệu tách khỏi giao diện

```
shop/
  *.html            5 trang, chung một shell được SINH RA
  assets/shop.css   một hệ thiết kế, token ở :root
  assets/shop.js    một IIFE, không build, không phụ thuộc ngoài
  data/shop.json    TOÀN BỘ nội dung lặp — sửa nội dung là sửa ở đây
  tools/            cổng chất lượng + hook
  pitch/            bản đề xuất mang đi gặp chủ shop (không phải trang cửa hàng)
  docs/             tài liệu định hướng + ADR + sổ nợ
```

Ba quy tắc, mỗi cái có một cổng đo được — chi tiết ở [../CLAUDE.md](../CLAUDE.md):

1. **Chữ của khối lặp ở data, chữ độc nhất ở HTML.** Cổng so text node, ngưỡng 0,40.
2. **Số suy ra được thì không ghi.** Giá hộp quà tính từ giá sản phẩm; tồn kho hộp tính từ món
   khan nhất; tỉ lệ khớp tính từ trọng số.
3. **Năm trang dùng chung một shell.** Cổng so từng ký tự.

### Vì sao tĩnh, và khi nào thì bỏ

Chọn trang tĩnh trên GitHub Pages không phải vì nó "hiện đại" — xem
[adr/0001-trang-tinh.md](adr/0001-trang-tinh.md). Tóm tắt: chi phí lưu trữ bằng không, không có
bước build nào để hỏng, và một đường link gửi được ngay cho chủ shop mà không cần ai deploy.

**Điều kiện bỏ trang tĩnh** — chạm một trong bốn thì đổi, chưa chạm thì đừng:

- cần giữ bí mật (khoá API của sàn, khoá cổng thanh toán) → phải có máy chủ;
- cần nhận webhook (báo-có chuyển khoản) → phải có một endpoint;
- cần trạng thái chung nhiều người cùng thấy (tồn kho thật) → phải có cơ sở dữ liệu;
- nội dung nhiều tới mức sửa JSON bằng tay thành khổ → cần chỗ nhập liệu.

Ba cái đầu giải được bằng **một hàm serverless**, không cần viết lại cả trang.

### Shell sinh ra thế nào

Năm trang phải có nav/menu/chân trang giống hệt nhau. Không có build step nào ghép hộ, nên
**đừng sửa tay năm file** — lấy shell từ một file rồi ghi đè vào cả năm, gắn lại `is-active` và
`nav--over` sau. Script làm việc đó nằm trong lịch sử git của phiên 20/09/2026; cổng
`check_shell()` sẽ chặn commit nếu năm trang lệch nhau.

### Giỏ hàng chứa hai loại món

Món thường là `{id, q}`. Hộp quà là `{id, q, g}` với `g` là **cấu hình, không phải giá**.
`byId()` nhận ra tiền tố `gift-` và dựng tạm một "sản phẩm" từ cấu hình đó, nên mọi thứ phía
sau — tính tiền, vẽ dòng, soạn nội dung đơn — chạy y như với món thường và không cần biết hộp
quà tồn tại. Xem [adr/0003-hop-qua-trong-gio.md](adr/0003-hop-qua-trong-gio.md).

---

## Tầng 3 — Quy trình phát triển

Đây là tầng Đạt hỏi nhiều nhất. Nói thẳng trước: **nó không làm sản phẩm giá trị hơn với chủ
shop.** Lý do duy nhất nó tồn tại là AI viết mã rất nhanh và sai cũng rất nhanh, nên cần một
thứ chặn lại mà không phải là sự chú ý của con người.

Nguyên tắc để nó không phình: **mỗi phần dưới đây phải chỉ ra được một lỗi THẬT nó đã bắt.**
Phần nào chưa bắt được gì thì chưa cần tồn tại.

### Ba lớp cổng

| Lớp | Chạy khi | Bắt được gì |
|---|---|---|
| `PostToolUse` | sau mỗi Edit/Write | sửa bằng công cụ sửa file |
| `pre-commit` | `git commit` | mọi thay đổi, kể cả viết bằng script |
| `pre-push` | `git push` | trạng thái cuối, kể cả sau `--no-verify` |

Lớp 1 có lỗ: thay đổi viết bằng `python3 - <<EOF` không đi qua tool Edit nên nó không thấy.
Lớp 2 bịt lỗ đó. **Phiên 20/09/2026 sửa gần như toàn bộ bằng heredoc Python, nên lớp 2 là lớp
duy nhất thật sự làm việc.** Đó là bằng chứng nó cần tồn tại.

### Cổng phải thử ngược

Viết cổng xong thì **cố tình phá rồi xem nó có kêu không**. Cổng không thử ngược là cổng chưa
biết có chạy hay không. Mười phép kiểm mới thêm ngày 20/09/2026 đều đã thử ngược từng cái.

Có giá trị nhất là loại cổng **tính ra thứ mắt người không tự thấy**: cổng Tìm mùi duyệt toàn
bộ 320 tổ hợp đáp án để chắc rằng không mùi nào không bao giờ thắng. Không ai ngồi thử 320 tổ
hợp bằng tay, và lỗi ấy hoàn toàn im lặng — trang vẫn chạy, vẫn ra một mùi, chỉ là cửa hàng có
một mùi không bao giờ được giới thiệu cho ai.

### Sổ nợ, ADR, bàn giao

- **[NO-KY-THUAT.md](NO-KY-THUAT.md)** — nợ kỹ thuật ghi ra giấy. Nợ không ghi là nợ sẽ quên.
- **[adr/](adr/)** — mỗi quyết định một file: bối cảnh, chọn gì, đánh đổi, **điều kiện xét lại**.
  Điều kiện xét lại là phần quan trọng nhất; thiếu nó thì ADR chỉ là một lời biện hộ.
- **[../HANDOFF.md](../HANDOFF.md)** — trạng thái cuối mỗi phiên: đã làm, đang dở, việc tiếp theo.

### Làm việc với AI trong thư mục này

Đầu phiên, đưa cho agent đúng bốn thứ: `shop/CLAUDE.md`, file này, `HANDOFF.md`, và lệnh chạy
cổng. Đừng dán cả repo.

Ba thói quen đã trả giá để có:

1. **Bắt agent chạy thật rồi đo, đừng để nó đọc code rồi kết luận.** Ba lỗi nặng nhất của thư
   mục này đều tìm ra bằng cách mở trình duyệt, bấm, rồi đọc `localStorage` — không lỗi nào lộ
   ra khi đọc code.
2. **Đừng neo tìm-thay vào một dòng có thể xuất hiện ở hai hàm.** Phiên 20/09/2026 neo vào
   `if ($('#coLines')) renderCheckout();` — dòng ấy kết thúc cả `renderCart()` lẫn `boot()`.
   Móc nhầm hàm khiến hộp quà bị trả về mặc định sau mỗi lần giỏ đổi, và cổng lint **không**
   bắt được vì cú pháp vẫn đúng. Cái bắt được là chạy thật.
3. **Số nào cũng phải đo, đừng để agent bịa một ngưỡng.** Ngưỡng 0,40 của cổng rò nội dung là
   số đo được. Trọng số Tìm mùi cũng vậy: bốn phương án đã được chạy thử và so phân bố trước
   khi chọn — xem [adr/0002-cham-diem-tim-mui.md](adr/0002-cham-diem-tim-mui.md).

### Chỗ dừng lại

Quy trình này **đã đủ** cho quy mô hiện tại. Chưa cần: CI trên GitHub Actions, bộ test tự động,
TypeScript, bước build, hệ quản trị nội dung. Mỗi thứ ấy chỉ nên thêm khi có một lỗi thật mà ba
lớp cổng hiện tại không bắt được — và lúc đó thì lỗi ấy chính là lý do để thêm.

---

## Phụ lục: bản phê bình đã nhận và đã sửa theo

Ngày 20/09/2026, hướng tiếp cận ban đầu bị phê bình ở chín điểm. Ghi lại vì chúng đúng, và vì
người đọc sau cần biết tài liệu này đã bị uốn theo cái gì.

Điểm nặng nhất, và cách đã sửa:

| Phê bình | Sửa thế nào |
|---|---|
| Nghĩ từ "tôi xây được phần mềm" rồi đi tìm chỗ dùng, thay vì từ "business bị chặn ở đâu" | Bảng năng lực ở tầng 1 để cột "có nên tự xây" trả lời "không/chưa" ở phần lớn dòng |
| Coi demo đẹp là bằng chứng hiểu business | Trang đề xuất đổi tiêu đề phần một thành "cái cớ để nói chuyện, không phải bản đề xuất"; mỗi tính năng ghi rõ "đang đoán rằng…" |
| Đồng nhất product với software product | Thêm hẳn một phần "bốn việc đáng thử trước khi nghĩ tới website" — nhắn lại khách cũ, bán bộ quà ngay trên sàn, câu trả lời mẫu, sửa listing |
| Landing page có thể **thêm** ma sát trong social commerce | Thêm phần "lập luận ngược", dùng chính số liệu Shopee 77,3% / TikTok 22,0% để chống lại đề xuất của mình |
| Trộn ba loại kiến trúc | Chính bảng ở đầu tài liệu này |
| MVP đang là "bản nhỏ của tầm nhìn lớn" | Mỗi thứ đã dựng gắn một giả định và một cách biết mình sai |
| Nhảy tới 500 đơn/ngày | Lộ trình bỏ hết mốc thời gian, chỉ còn điều kiện mở |

Một chỗ phản biện lại: phê bình cho rằng đầu tư vào tầng 3 quá sớm là lãng phí khi sản phẩm
chưa chứng minh được. **Đúng về hướng, nhưng giá phải đo.** Tầng 3 ở đây tốn khoảng 200 dòng
Python, và ngay trong phiên dựng nó đã chặn hai lỗi thật trước khi lên public: hộp quà bị reset
sau mỗi lần giỏ đổi, và trần tồn kho hộp quà không được tôn trọng (bấm 8 lần vào hộp chỉ gói
được 6 thì cả 8 lần đều báo thành công). Hai lỗi ấy rơi vào tiền của khách. Với giá đó thì nó
không phải tối ưu sớm — nó là bảo hiểm rẻ. Kết luận đúng không phải "bỏ tầng 3" mà là
**"đừng cho nó phình thêm"**, và đó là mục *Chỗ dừng lại* ở trên.
