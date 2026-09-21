# Đối thủ và tích hợp

Tài liệu này trả lời thẳng hai nỗi lo: **"có phải KiotViet đã giải quyết rồi không?"** và
**"tích hợp sàn / vận chuyển / thanh toán có chậm và khó không?"**. Câu trả lời ngắn: phần
commodity thì **đúng, đã giải quyết rồi, đi mua đi**; phần khác biệt thì chưa. Còn tích hợp thì
tách làm ba, và ba cái khó khác nhau rất xa — vận chuyển là dễ nhất trong cả dự án, thanh toán
dễ hơn tưởng, sàn mới là chỗ nỗi lo có cơ sở. Cuối tài liệu có mục
[§6 — những thứ tôi chưa kiểm chứng được](#6-những-thứ-tôi-chưa-kiểm-chứng-được), kèm URL và
số điện thoại để tự đóng từng câu một. §7 tách ba loại "kiến trúc" hay bị gộp làm một, và chỉ
ra loại nào chủ shop thật sự trả tiền cho. Người đọc: Đạt. Mục §5 (pháp lý) và §2 thì nên đưa
cho chị ấy đọc.

---

## 1. Có phải KiotViet đã giải quyết rồi không?

Tách làm hai lớp. Trộn hai lớp này là nguồn gốc của nỗi lo.

**Lớp commodity — đã giải quyết, và rẻ.** Tồn kho, đơn hàng, POS, đồng bộ kênh, in vận đơn, báo
cáo doanh thu. Có ít nhất năm công ty VN bán thứ này ở mức **170.000–999.000₫/tháng** tuỳ gói; khoảng thực tế cho một shop cỡ này là **250.000–450.000₫**, có người
trực hỗ trợ, có app, chạy được ngay hôm nay. **Không được cạnh tranh ở đây.** Xây lại lớp này
là bỏ hàng trăm giờ để ra một sản phẩm tệ hơn thứ mua được trong một buổi chiều — đó là phá huỷ
giá trị, không phải tạo giá trị.

**Lớp khác biệt — chưa giải quyết.** Ba thứ:

1. **Một storefront thương hiệu không trông giống listing sàn.** Có 744 shop cùng bán nến thơm
   quà trên ba sàn [đã kiểm: metric.vn 2025]. Trên Shopee, listing của chị ấy được sắp bởi thuật
   toán của Shopee, cạnh 743 listing khác, trong khung giao diện của Shopee. Không có cái nút
   nào trong KiotViet đổi được điều đó.
2. **Bài toán chọn mùi.** Khách **không ngửi được qua màn hình**. Đây là đặc thù của ngành hàng
   này, không phải của phần mềm bán hàng nói chung, nên không nhà cung cấp POS nào giải. Nó hiện
   ra dưới hai dạng đo được: tỉ lệ khách bỏ giữa chừng, và số giờ chị ấy ngồi trả tin nhắn
   ([01](01-BOI-CANH-VA-CO-HOI.md) §3).
3. **Quà tặng.** Nến 300.000₫ là quà. Quà thì mua theo hộp, có thiệp, và dồn vào cuối năm —
   tháng 12/2025 cao hơn tháng 11 **37,23%** [đã kiểm: metric.vn].

Nói cách khác: câu hỏi đúng không phải "KiotViet có làm được không" mà là **"chị ấy đang thua ở
lớp nào"**. Nếu thua ở lớp commodity thì đi mua. Nếu thua ở lớp khác biệt thì mua gì cũng không
chữa được.

### Còn cái quiz thì sao — có phải lợi thế không?

Không, và phải trung thực chỗ này. Otherland, Jo Malone London (kể cả AI Scent Advisor và
Fragrance Finder trên Tmall), Boy Smells, Scentbird, Yankee Candle đều có quiz chọn mùi. Nhiều
brand nến nhỏ dùng **chung một app quiz của Shopify** — thấy rõ vì trùng đường dẫn
`/tools/perfect-product-finder/`. Nghĩa là mẫu này là **phần mềm đóng gói, không phải kỹ thuật
độc quyền**.

Và quan trọng hơn: **không có một nghiên cứu độc lập nào chứng minh quiz chọn mùi làm tăng
chuyển đổi.** Mọi con số đang lưu hành ("+40% chuyển đổi", "+25% AOV", "bundling tăng AOV 20–35%
theo McKinsey") đều xuất phát từ chính công ty bán phần mềm quiz/bundling, không có nhóm đối
chứng. Câu "McKinsey 2025" đã truy ngược: **không có ấn phẩm McKinsey nào đứng sau**. Không được
nói những con số này ở buổi gặp.

Cái thật sự khác biệt hẹp hơn nhiều, và đúng như thế thì mới nói được: quiz gắn với **đúng 5 mùi
của chị ấy**, viết bằng giọng của chị ấy, trọng số do chị ấy quyết — chứ không phải một app cắm
vào. Cộng với việc nó **cắt bớt số tin nhắn phải trả**, thứ đo được bằng đồng hồ chứ không bằng
lời hứa.

Chuẩn chuyển đổi duy nhất dùng được, để tham chiếu: Littledata, 2.800 cửa hàng Shopify, 2023 —
trung bình 1,4%, top 20% trên 3,2%, top 10% trên 4,7% [đã kiểm: Littledata 2023]. **Không có số
riêng cho nến, không có số riêng cho Việt Nam.**

---

## 2. Bảng so sánh

Giá đọc từ trang giá chính thức, 09/2026 [đã kiểm], trừ dòng cuối.

| Sản phẩm | Giá | Cho gì | KHÔNG cho gì |
|---|---|---|---|
| **KiotViet** bán lẻ | 270k Hỗ trợ (1 chi nhánh, ≤3 tài khoản) · 330k Chuyên nghiệp · 490k Cao cấp | POS + tồn kho + đơn hàng, mạnh nhất ở bán lẻ tại quầy | Gói bán lẻ có kèm website bán hàng cho khách không: **[chưa kiểm]**. Không có storefront thương hiệu riêng. |
| **Sapo** | StartUp 170k · PRO 249k · OMNI 449k · **ADVANCED 600k (kèm website)** · GROWTH 999k · Web Standard (chỉ website) 499k. Phí khởi tạo 1–3 triệu một lần, miễn khi mua nhiều năm | Bán hàng đa kênh + website trong gói ADVANCED | Giao diện theo khuôn mẫu. Phí khởi tạo là chi phí đầu vào thật. |
| **Haravan** | Standard 300k · **Omni Pro 680k (website chuyên nghiệp + API)** · Omni Advanced 800k · Grow 1,5tr · Scale 3tr | Website bán hàng chuẩn. **API chỉ có từ Omni Pro trở lên** | Muốn nối gì thì phải lên gói 680k trở lên |
| **Nhanh.vn** — **đối thủ gần nhất** | POS Basic 250k · POS Pro 350k · **Omnichannel 750k (gồm 1 website đồng bộ + 5 kênh)**. Add-on: Website 200k · Vpage 100k · **Ecom (đồng bộ TikTok/Shopee/Lazada/Tiki) 100k** | **~450k/tháng mua được POS Pro + website + đồng bộ sàn. CÓ SẴN HÔM NAY.** | Vẫn là giao diện của Nhanh.vn. Điều kiện để phần đồng bộ sàn chạy được: **[chưa kiểm]** — xem §3 |
| **LadiPage** | Core 280k · Grow 450k · Max 600k (hiệu lực 07/07/2026). **Có bản Starter miễn phí** | Landing page, tự kéo thả, đổi rất nhanh — tốt nhất để chạy quảng cáo | Không phải cửa hàng. Không tồn kho, không đơn hàng. |
| **Shopify** | Basic **$25/tháng** (trả tháng) hoặc **$19** (trả năm) — hiển thị giá USD cho khách VN | Hệ sinh thái app lớn nhất, gồm cả app quiz chọn mùi | **Shopify Payments có dùng được ở VN không: [chưa kiểm]** — nếu không thì cộng thêm phí cổng bên thứ ba. Giá USD nghĩa là chịu biến động tỉ giá. |
| **Tự xây** (`shop/`) | Hosting GitHub Pages 0₫ · tên miền .vn [chưa kiểm giá] · SePay ~120k/tháng từ chặng 2 · serverless 0₫ bản free | Storefront đúng thương hiệu, quiz gắn với 5 mùi thật, trình dựng hộp quà, **kiểm soát hoàn toàn** | **Không có người trực hỗ trợ. Và nếu anh biến mất thì không ai sửa được trang.** Đây là nhược điểm thật, không phải nhược điểm cho có — phải nói ở buổi gặp. |

**Mốc giá trong đầu chủ shop:** agency làm landing page một lần — phổ biến **2–6 triệu₫**; cơ bản
500k–3tr; custom UI/UX 3–7tr; sâu hơn 8tr+. Đây là **bảng giá agency công bố, tức giá chào, không
phải giá giao dịch thật** [đã kiểm: bảng giá agency công bố]. Dùng nó ở
[04-DAM-PHAN.md](04-DAM-PHAN.md) §3.

**Bảng giá trên đã gồm VAT chưa: [chưa kiểm] cho cả năm nhà cung cấp.** Đừng đọc con số 450k lên
như thể đó là con số cuối cùng chị ấy trả.

---

## 3. Tích hợp sàn — đây là chỗ nỗi lo có cơ sở

Nỗi lo "tích hợp sàn chậm và khó" là **đúng**, và không nên trấn an.

| Sàn | Cần gì để bắt đầu | Mất bao lâu | Mức chắc của thông tin này |
|---|---|---|---|
| **Shopee** | Tài khoản người bán, **và có thể cần thêm một điều kiện về hạng hoặc số đơn** | Không biết | **Thấp.** Nguồn duy nhất là tài liệu chính thức của **Odoo** (bên thứ ba), nói quyền truy cập phụ thuộc vùng và "nhiều vùng yêu cầu số đơn tối thiểu trong một khoảng thời gian, hoặc một hạng người bán (Mall, Preferred, Managed)". **Ngưỡng cụ thể của VN: không xác minh được.** |
| **TikTok Shop** | Có đường riêng: loại **"seller in-house developer"** — chỉ truy cập dữ liệu shop của chính mình. Đường ISV (làm app công khai) thì phải nộp **giấy phép kinh doanh của công ty** | Rà soát pháp lý **bắt buộc** với đối tác Mỹ/Anh, **"tuỳ trường hợp"** với nước khác, **có thể 3+ tuần** | **Trung bình** về việc đường in-house tồn tại. **Thấp** về VN: VN thuộc nhóm nào **không rõ**; cá nhân chỉ có CCCD đăng ký được hay không **không xác minh được**. |
| **Lazada** | Có hạng mục **"Seller In-house APP"** | **1–3 ngày làm việc** duyệt hồ sơ | **Thấp.** Toàn bộ thông tin này đến từ tài liệu của **một SDK bên thứ ba**, không phải từ Lazada. |

### Ba kết luận

1. **Shop 5–10 đơn/ngày có thể không đủ điều kiện mở API Shopee.** Đây là lý do
   [02-LO-TRINH.md](02-LO-TRINH.md) §6 xếp đồng bộ sàn vào danh sách không xây: xây một thứ có
   thể không được phép chạy là cách hỏng đắt nhất trong dự án.
2. **Lazada dễ nhất lại ít đáng nhất.** Lazada chiếm **0,7%** doanh thu ngành nến thơm quà trên
   ba sàn [đã kiểm: metric.vn 2025]. Duyệt trong 1–3 ngày, nhưng để lấy 0,7%. Đừng để cái dễ dẫn
   dắt thứ tự công việc.
3. **Việc này anh KHÔNG tự làm được — sửa lại 21/09/2026.** Bản trước ghi "tự đăng ký thử một
   buổi chiều, rẻ hơn mọi suy đoán" và giao cho anh. Nhưng đường in-house developer đòi một
   **tài khoản TikTok Shop đã kích hoạt** để liên kết, và anh không có shop nến. Muốn thử thì
   phải mượn tài khoản của chị ấy — đúng thứ [04](04-DAM-PHAN.md) §7 đặt làm lằn ranh đỏ ở
   chiều ngược lại.

   Việc của anh ở buổi gặp không phải là "em thử rồi", mà là **hỏi chị ấy có sẵn lòng bỏ ra 15
   phút trong Seller Centre để thử không**. Bài học chung: cột "ai đóng, bằng cách nào" trong
   bảng câu hỏi mở phải được **thử lại một lần**, chứ không phải viết ra rồi tin. Đây là dòng
   duy nhất trong bảng ấy giao cho anh một việc anh không có quyền làm.

---

## 4. Vận chuyển và thanh toán — dễ hơn nỗi lo rất nhiều

### Vận chuyển: dễ nhất trong cả dự án

| Đơn vị | Cần gì để bắt đầu | Mất bao lâu | Mức chắc |
|---|---|---|---|
| **GHN** | Tự phục vụ. Đăng ký `sso.ghn.vn` → đăng nhập `khachhang.ghn.vn` → mục "Chủ cửa hàng" → copy **Token API, Client_ID, Shop_ID**. Có môi trường thử `5sao.ghn.dev` | **Gọi được API trong ngày** | **Cao** — đọc thẳng từ tài liệu. Lưu ý: "không thấy tài liệu nào đòi hợp đồng" là **không thấy**, không phải "chắc chắn không có" |
| **GHTK** | Tự phục vụ. `khachhang.giaohangtietkiem.vn` → cấu hình API → tạo token có tên, hạn dùng, phạm vi quyền. Có staging | **Trong ngày** | **Cao** |
| **Viettel Post** | **Phải ký hợp đồng trước.** Liên hệ kinh doanh: **0862 235 888**, **b2b@viettelpost.com.vn** | Không biết | Trung bình |
| **J&T** | **Phải ký hợp đồng trước.** Liên hệ bộ phận kinh doanh | Không biết | Trung bình |
| **BEST Express** | **Không tìm thấy API công khai** | — | — |

Hai đơn vị đầu tự làm được trong một ngày, không cần gặp ai, có môi trường thử. Nếu có chỗ nào
trong dự án này đáng bớt lo thì là chỗ này.

**Một câu phải hỏi chị ấy:** chị ấy có thể **đã có giá ship ưu đãi** qua Shopee/TikTok rẻ hơn
giá tự ký. Nếu vậy thì tự nối API vận chuyển là làm cho đắt hơn. Hỏi trước khi làm.

### Thanh toán: tin tốt nhất của cả bộ nghiên cứu

| Giải pháp | Cần gì để bắt đầu | Giá | Mức chắc |
|---|---|---|---|
| **VietQR / Napas247** | **Cá nhân, hộ gia đình, tổ chức** có tài khoản VND ở ngân hàng tham gia Napas247 đều tạo được mã. Chỉ cần **mã BIN + số tài khoản**. `api.vietqr.io/v2/banks` trả về ~55 ngân hàng kèm mã BIN | 0₫ | **Cao.** Đã dựng sẵn ở `shop/checkout.html`, chỉ chờ số tài khoản |
| **SePay** | **"Hỗ trợ kết nối cả tài khoản ngân hàng cá nhân và doanh nghiệp"** (trích nguyên văn FAQ chính thức). Đồng bộ 0–5 giây | FREE 0₫ / 50 giao dịch/tháng, **có** webhook + API · STARTUP **từ 120.000₫/tháng** (~180 giao dịch) · SHOP 99.000₫/tháng (70k trả năm) không giới hạn giao dịch **nhưng KHÔNG CÓ API** | **Cao** về tính năng. Giá bậc trên 180 giao dịch: **[chưa kiểm]** |
| **payOS** (do Casso làm) | **Cá nhân không có mã số thuế xác thực được bằng CCCD** (trích dẫn chính thức) | Có gói miễn phí từ 23/01/2026, nhưng **gắn với việc mở tài khoản KienLongBank qua eKYC**, và cơ chế là gói 1000 giao dịch **đăng ký lại được** | Trung bình. Viết là "miễn phí theo hạn mức đăng ký lại được", **không** viết "miễn phí không giới hạn" |
| **Casso** | Không nói ở đâu là cá nhân có dùng được không | **Không xem được** — bảng giá tải bằng JS, chỉ hiện sau khi chọn gói. Chỉ bán theo năm, **không hoàn tiền** | Thấp |
| **VNPAY** | **Bắt buộc giấy phép kinh doanh** | Biểu phí (0,88% / 1,1% + 1.650₫…) chỉ lấy được từ **đại lý** của VNPAY, **không phải từ VNPAY** — phải xác nhận lại | Thấp về giá |
| **OnePay** | **Bắt buộc giấy phép kinh doanh** — nói thẳng chỉ phục vụ công ty có đăng ký kinh doanh hoặc tổ chức | — | Cao về điều kiện |
| **MoMo, ZaloPay, Payoo** | — | **Phí và điều kiện không xác minh được đầy đủ** | Thấp |

**Điểm kiến trúc quan trọng nhất trong cả tài liệu này:** mã VietQR **chỉ hiển thị số tiền** —
nó **không báo cho máy chủ biết tiền đã về**. Toàn bộ SePay / payOS / Casso tồn tại để đóng đúng
cái vòng lặp đó. Đó là lý do chặng 2 ở [02-LO-TRINH.md](02-LO-TRINH.md) cần một máy chủ, còn
chặng 0–1 thì không. Chi tiết ở [05-KIEN-TRUC.md](05-KIEN-TRUC.md).

**Kết luận dùng được:** nếu chị ấy **chưa có đăng ký kinh doanh** thì VNPAY và OnePay đều đóng
cửa, nhưng **VietQR + SePay (hoặc payOS) vẫn mở** — và đó là con đường đủ dùng. Lớp trông có vẻ
đáng sợ nhất hoá ra giải được trong một ngày với khoảng 120.000₫/tháng. Ở 5–10 đơn/ngày ≈ 150–300
giao dịch/tháng thì **vượt gói free ngay**, rơi vào STARTUP.

Một cái bẫy phải nhớ: gói SePay **SHOP 99.000₫** rẻ hơn STARTUP **120.000₫** nhưng **không có
API**. Mua nhầm là mua một thứ không dùng được cho việc này.

---

## 5. Pháp lý — và tiền phạt rơi vào CHỊ ẤY

> **Đọc kỹ mục này. Nếu làm sai, người bị phạt là chị ấy, không phải anh.** Website sẽ đứng tên
> chị ấy, bán sản phẩm của chị ấy, nhận tiền vào tài khoản của chị ấy. Anh phải nói câu này ra
> **bằng miệng ở buổi gặp và bằng chữ trong bất kỳ thứ gì ký**, trước khi chị ấy trả một đồng nào.

Tình hình hiện tại:

- **Luật Thương mại điện tử số 122/2025/QH15** thông qua **10/12/2025**, hiệu lực **01/07/2026**,
  cùng **Nghị định 248/2026/NĐ-CP** [đã kiểm].
- Theo chế độ cũ (NĐ 52/2013 sửa bởi 85/2021): website có chức năng đặt hàng online **phải thông
  báo với Bộ Công Thương tại `online.gov.vn` trước khi bán**; không thông báo phạt **10–20
  triệu₫** [đã kiểm].
- **Đã tra lại 21/09/2026, và câu "hai nguồn mâu thuẫn" trước đây là SAI — thủ tục KHÔNG bị bỏ.**
  NĐ 248/2026 thay thế hoàn toàn NĐ 52/2013 và NĐ 85/2021 từ 01/07/2026, nhưng đổi **tên gọi**
  chứ không bỏ nghĩa vụ: loại trang như thế này nay gọi là *"nền tảng thương mại điện tử kinh
  doanh trực tiếp có chức năng đặt hàng trực tuyến"*, và chủ quản **phải được xác nhận thông báo
  TRƯỚC KHI vận hành**; đổi thông tin thì phải sửa đổi thông báo trong 20 ngày làm việc
  *[đã kiểm: luatvietnam.vn về NĐ 248/2026; baochinhphu.vn 07/2026]*. Tìm thấy trong ~15 phút
  tra cứu — nói "không ai biết" về một thứ tra được là tự hạ uy tín ở đúng mục dùng để xây uy tín.
- **Chưa kiểm được, và đừng đoán:** cơ quan nào nhận hồ sơ và nộp qua cổng nào. Chế độ cũ là Bộ
  Công Thương qua `online.gov.vn`; có nguồn nói đã chuyển sang UBND cấp tỉnh qua Cổng Dịch vụ
  công Quốc gia, nhưng cũng có bài hướng dẫn 2026 vẫn ghi Bộ Công Thương. **Hai nguồn này mâu
  thuẫn thật** — khác với câu ở trên, vốn chỉ là chưa tra. Mức phạt 10–20 triệu₫ là mức của chế
  độ cũ (NĐ 98/2020); mức dưới chế độ mới **[chưa kiểm]**, đừng đọc con số đó lên như hiện hành.
- Nghĩa vụ với người bán cá nhân theo luật mới [nguồn thứ cấp — chưa kiểm]: cung cấp dữ liệu định
  danh điện tử; hiển thị đúng tên và địa chỉ đã đăng ký; **dùng chính tài khoản ngân hàng cá nhân
  của mình**.

**Kết luận: PHẢI HỎI LUẬT SƯ trước khi mở bán** — nhưng nay là hỏi **một câu hẹp**, không phải
hỏi mù: *"Trang bán hàng của một cá nhân chưa đăng ký kinh doanh có phải làm thủ tục thông báo
theo NĐ 248/2026 không, nộp ở đâu, và mức phạt hiện hành là bao nhiêu?"* Một câu hẹp thì luật sư
trả lời trong mười phút; một câu mù thì thành một buổi tư vấn tính tiền.

**Phạt rơi vào chị ấy, không rơi vào anh.** Đó là lý do mục này không được đoán.

Ba điều nên làm với phát hiện này:

1. **Nói ra ở buổi gặp, sớm, không đợi bị hỏi.** Không ai bán landing page mà nhắc chuyện phạt
   10–20 triệu. Nói ra là cách nhanh nhất chứng minh anh đứng về phía chị ấy chứ không phải đứng
   bán hàng. Xem [04-DAM-PHAN.md](04-DAM-PHAN.md).
2. **Đừng tự trả lời câu hỏi luật.** Anh không phải luật sư và câu này hai nguồn còn cãi nhau.
   Nói "em không biết, và đây là chỗ nên hỏi luật sư" là câu trả lời đúng.
3. **Không nhận trách nhiệm tuân thủ pháp lý trong bất kỳ thoả thuận nào.** Ghi rõ: việc thông
   báo/đăng ký với cơ quan nhà nước và nghĩa vụ thuế thuộc về chủ shop.

Liên quan: sàn đang khấu trừ **VAT 1–5%** và **TNCN 0,5–5%** từ 01/07/2025 [nguồn ngành — chưa đối chiếu trang chính thức].
Đó là **thuế của chị ấy**, sàn chỉ giữ hộ tại nguồn. Bán trực tiếp **không xoá** nghĩa vụ đó, nó
chỉ chuyển việc kê khai sang cho chị ấy tự làm — tức là thêm việc. Nói rõ chỗ này, vì nếu để chị
ấy tự hiểu nhầm rằng bán trực tiếp là "khỏi thuế" thì đó là một hiểu nhầm anh gây ra.

---

## 6. Những thứ tôi chưa kiểm chứng được

Mỗi dòng có cách đóng cụ thể. Xếp theo mức ảnh hưởng.

| # | Câu chưa trả lời được | Đóng bằng cách nào | Ai đóng |
|---|---|---|---|
| 1 | Thủ tục thông báo `online.gov.vn` còn hay đã bỏ sau 01/07/2026? Hai nguồn mâu thuẫn | **Hỏi luật sư.** Tham chiếu: Luật 122/2025/QH15, NĐ 248/2026/NĐ-CP, NĐ 52/2013 sửa bởi 85/2021 | chị ấy (anh nêu vấn đề) |
| 2 | Phí cố định theo ngành hàng của Shopee là bao nhiêu? Ba nguồn cho ba khoảng khác nhau | **Mở Seller Centre, chọn một đơn đã hoàn tất, xem dòng khấu trừ. Hai phút.** | chị ấy, ngay tại buổi gặp |
| 3 | Mức hoa hồng TikTok Shop thật của ngành nến? (dải 2–16%, mặc định 14%) | Xem trong back office TikTok Shop của chị ấy | chị ấy, ngay tại buổi gặp |
| 4 | Shop 5–10 đơn/ngày có đủ điều kiện mở API Shopee ở VN không? | `https://banhang.shopee.vn/edu/article/8450` và `https://banhang.shopee.vn/edu/article/8451` — **là trang JS, không đọc được bằng máy, PHẢI MỞ BẰNG TRÌNH DUYỆT** | anh, 15 phút |
| 5 | Cá nhân VN chỉ có CCCD đăng ký được "seller in-house developer" của TikTok Shop không? | Thử trong Seller Centre — **chỉ mở được từ shop đã kích hoạt**, nên anh không tự làm được | **chị ấy, sau buổi gặp** |
| 6 | VN thuộc nhóm nào trong quy trình rà soát pháp lý của TikTok (bắt buộc / tuỳ trường hợp)? | Như trên, hỏi trong quá trình đăng ký | anh |
| 7 | Thông tin Lazada "Seller In-house APP, duyệt 1–3 ngày" có đúng không? Nguồn hiện tại là một SDK bên thứ ba | Lazada Open Platform, trang chính thức | anh — **ưu tiên thấp, Lazada chỉ 0,7% doanh thu** |
| 8 | Shopify Payments có dùng được ở VN không? | Trang Shopify Payments, chọn quốc gia VN | anh, 10 phút |
| 9 | Gói bán lẻ của KiotViet có kèm website bán hàng cho khách không? | Trang giá KiotViet / gọi tư vấn | anh, 15 phút |
| 10 | SePay đếm "giao dịch" thế nào — chỉ tiền vào, hay cả tiền ra? Giá bậc trên 180 giao dịch? | Hỏi hỗ trợ SePay | anh |
| 11 | Giá SaaS trong §2 đã gồm VAT chưa? | Hỏi từng nhà cung cấp | anh, trước khi đọc giá lên cho chị ấy |
| 12 | Biểu phí chính thức của VNPAY (hiện chỉ có từ đại lý) | VNPAY trực tiếp | **ưu tiên thấp** — cần giấy phép kinh doanh, có thể không dùng tới |
| 13 | Giá bảng của Casso, và cá nhân có dùng được không | Casso — bảng giá tải bằng JS, phải mở trình duyệt và chọn gói | ưu tiên thấp |
| 14 | Tên miền `.vn` giá bao nhiêu, cá nhân đăng ký được không | Nhà đăng ký tên miền VN | anh, 10 phút |
| 15 | Quy định gửi tin nhắn tiếp thị (Zalo/email) ở VN | Hỏi cùng lúc với câu #1 | chị ấy |
| 16 | GHN/GHTK thật sự không cần hợp đồng, hay chỉ là tài liệu không nhắc? | Đăng ký thử, hoặc hỏi hỗ trợ | anh, cùng buổi với #5 |
| 17 | Chị ấy đã có sẵn tài khoản SaaS / website nào chưa? | **Hỏi chị ấy** | buổi gặp — xem [04](04-DAM-PHAN.md) |

**Bốn dòng đầu là đủ cho buổi gặp đầu tiên.** #2 và #3 chị ấy đóng được ngay tại chỗ trong hai
phút, và việc cùng nhau mở màn hình ra xem có giá trị gấp nhiều lần việc anh đọc con số lên.
#4 và #5 nên làm **trước** buổi gặp nếu kịp — nói "em thử rồi, kết quả là…" khác hẳn "em nghĩ là…".

---

## 7. Ba loại "kiến trúc", và loại nào chủ shop trả tiền cho

Ba thứ hay bị gộp làm một khi nói chuyện với dân kỹ thuật. Tách ra thì rõ ngay cái nào đáng đưa
vào một bản chào.

| Loại | Nó trả lời câu gì | Chị ấy có quan tâm không |
|---|---|---|
| **Kiến trúc sản phẩm** | Business này cần **năng lực** gì: chọn mùi, đóng gói quà, giữ khách cũ, nhận tiền, biết còn bao nhiêu hàng | **Có.** Đây là thứ duy nhất chị ấy thật sự mua |
| **Kiến trúc phần mềm** | Hệ thống tổ chức ra sao: tĩnh hay có máy chủ, dữ liệu để đâu, webhook nối vào đâu | **Gián tiếp.** Chị ấy quan tâm hệ quả — chi phí hàng tháng, sửa nhanh hay chậm — chứ không quan tâm sơ đồ |
| **Quy trình phát triển** | Bàn giao, ADR, cổng chất lượng, cách điều khiển công cụ AI, ghi nhớ ngữ cảnh | **Không.** |

**Loại thứ ba không làm sản phẩm giá trị hơn với chị ấy.** Nó làm cho **chi phí sửa về sau** rẻ
hơn và làm cho sai sót ít đi — đó là lý do repo này có cổng `lint-shop.py` và có
[NO-KY-THUAT.md](NO-KY-THUAT.md). Nhưng nó là **công cụ của người làm**, không phải giá trị của
người mua. Mang nó vào buổi gặp là tiêu thời gian của chị ấy để nói về công việc nội bộ của mình.

Cách dùng đúng: nói về **loại một** ở buổi gặp; nói **hệ quả** của loại hai khi bị hỏi giá và
tốc độ; giữ loại ba trong repo. Cụ thể: tài liệu này và ba tài liệu kia làm việc của loại một;
[05-KIEN-TRUC.md](05-KIEN-TRUC.md) đi qua cả ba tầng và nói rõ tầng nào đang trống;
[NO-KY-THUAT.md](NO-KY-THUAT.md) thuần loại ba — nó là sổ nợ, không phải thứ mang đi chào hàng.

Một hệ quả thực tế: **đừng tính tiền cho loại ba.** Nếu bảng chào ghi "thiết lập quy trình kiểm
thử tự động — 2 triệu", chị ấy đang trả tiền để công việc của anh dễ hơn. Chi phí đó nằm trong
giá của thứ giao được, không đứng thành một dòng riêng.

---

Đọc tiếp: [04-DAM-PHAN.md](04-DAM-PHAN.md) · quay lại [01-BOI-CANH-VA-CO-HOI.md](01-BOI-CANH-VA-CO-HOI.md) ·
[02-LO-TRINH.md](02-LO-TRINH.md) · kiến trúc ở [05-KIEN-TRUC.md](05-KIEN-TRUC.md) ·
mục lục ở [00-DOC-CAI-NAY-TRUOC.md](00-DOC-CAI-NAY-TRUOC.md)
