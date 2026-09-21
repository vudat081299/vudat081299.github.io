# Lộ trình

Tài liệu này chia việc thành sáu chặng, và **mỗi chặng chỉ mở khi một sự kiện kinh doanh có
thật xảy ra** — không mở theo lịch. Mỗi chặng có: nỗi đau khởi phát, giả thuyết, chỉ số chứng
minh hoặc giết nó, công sức ước lượng, và một **điều kiện dừng** viết sẵn. Có hai mục quan
trọng không kém phần chặng: danh sách thứ **sẽ không xây**, và chỗ mà câu trả lời đúng là
**bảo chị ấy đi mua SaaS**. Trước tất cả những thứ đó là mục "MVP thật sự là gì" — đọc mục ấy
trước, vì nó quyết định chặng nào mới đáng mở. Đọc sau
[01-CONTEXT-AND-OPPORTUNITY.md](01-CONTEXT-AND-OPPORTUNITY.md), và **đặc biệt là sau §5 của tài liệu đó**:
sáu thử nghiệm không cần code ở đó đứng trước mọi chặng trong tài liệu này.
Người đọc: Đạt, để biết làm gì tiếp; và một phần của nó — chặng 0, chặng 1, mục "sẽ không xây"
— là thứ có thể đưa cho chị ấy xem.

---

## Luật của lộ trình này

1. **Không có ngày tháng nào là điều kiện mở chặng.** Điều kiện là sự kiện: chị ấy bán hụt
   hàng, chị ấy mất hơn một tiếng mỗi ngày cho việc hành chính, có đủ 100 đơn trực tiếp để đo.
   "Tháng thứ ba" không phải điều kiện.
2. **Mỗi tính năng phải có một nỗi đau đứng trước nó.** Không có nỗi đau thì không xây, kể cả
   khi xây rất nhanh.
3. **Ngưỡng giết phải chọn TRƯỚC khi chạy.** Chọn sau là tự lừa mình. Các ngưỡng trong tài liệu
   này là **số thoả thuận, không phải chuẩn ngành** — không có chuẩn ngành cho việc này. Chọn
   xong thì tôn trọng.
4. **Chưa có gì được xây khi chưa biết giá vốn `V`.** Xem [01](01-CONTEXT-AND-OPPORTUNITY.md) §2.
5. **Thử cái không cần code trước.** Nếu một giả định kiểm được bằng một tin nhắn, một listing
   mới hay một đoạn chữ dán sẵn, thì kiểm bằng cách đó — [01](01-CONTEXT-AND-OPPORTUNITY.md) §5. Chỉ
   viết code cho giả định nào đã sống sót qua kiểu kiểm rẻ hơn.
6. **MVP là thử nghiệm rẻ nhất cho giả định rủi ro nhất**, không phải bản thu nhỏ của tầm nhìn
   lớn. Xem mục ngay dưới.

---

## MVP thật sự là gì

Cái bẫy phổ biến nhất: coi MVP là **bản nhỏ của thứ cuối cùng mình muốn xây**. Theo cách đó thì
MVP của một cửa hàng là một cửa hàng ít tính năng hơn, và ta chỉ xây chậm hơn chứ không học được
gì nhanh hơn.

Định nghĩa dùng được: **MVP là thử nghiệm rẻ nhất kiểm được giả định rủi ro nhất.** Đổi giả định
thì đổi luôn MVP — và bốn giả định dưới đây dẫn tới bốn MVP hoàn toàn khác nhau.

| Nếu giả định rủi ro nhất là… | Thì MVP đúng là… | Và những thứ này **không thuộc** MVP |
|---|---|---|
| **Khách không chọn được mùi, và điều đó chặn mua hàng** | Một đoạn trả lời mẫu dán vào tin nhắn ([01](01-CONTEXT-AND-OPPORTUNITY.md) §5, thử nghiệm 4). Nếu nó không đủ thì mới tới **Tìm mùi** — một trang, không giỏ hàng, không thanh toán | Landing page, giỏ hàng, checkout, hộp quà |
| **Khách không đủ tin một shop lạ để chuyển khoản trước** | Một trang campaign cho **một** mùi, nội dung thật và ảnh thật, đo chuyển đổi trên đúng một luồng | 5 mùi, quiz, hộp quà, tồn kho |
| **AOV thấp vì không ai nghĩ tới việc mua nhiều cây** | Hai listing bộ quà **ngay trên Shopee/TikTok** ([01](01-CONTEXT-AND-OPPORTUNITY.md) §5, thử nghiệm 2). **Không cần web** | Toàn bộ `shop/` |
| **Khách mua rồi không quay lại, nên chị ấy phải mua khách mới mãi** | Một danh sách khách cũ và một tin nhắn nhắn tay ([01](01-CONTEXT-AND-OPPORTUNITY.md) §5, thử nghiệm 1) | CRM, email marketing, tài khoản khách hàng |

Hai điều rút ra, và cả hai đều khó chịu:

1. **Ba trong bốn MVP ở trên không cần đến `shop/`.** Cái đã dựng chỉ là MVP đúng cho đúng một
   giả định trong bốn.
2. **Chưa ai biết giả định nào là rủi ro nhất.** Nó phụ thuộc vào các con số ở
   [01](01-CONTEXT-AND-OPPORTUNITY.md) §1 mà ta chưa có. Nghĩa là **buổi gặp đầu tiên chính là việc
   chọn MVP**, và đó là lý do [04-NEGOTIATION.md](04-NEGOTIATION.md) dành phần lớn dung lượng cho việc
   hỏi chứ không phải việc chào hàng.

---

## Chặng 0 — cái đang có, ngay hôm nay

Không phải kế hoạch. Đây là thứ chạy được ở `shop/` lúc này, và nó **đã xong trước khi gặp chị
ấy**, miễn phí. Chi tiết đầy đủ ở [STATUS-REPORT.md](../STATUS-REPORT.md).

| Có gì | File | Trạng thái |
|---|---|---|
| Landing page | `shop/index.html` | Xong. Hero nến cháy, 5 ô mùi, khối giá trị, hỏi đáp |
| Trang 5 mùi | `shop/products.html` | Xong. Mỗi mùi một section, màu cả trang đổi theo mùi |
| Giỏ hàng | ngăn kéo dùng chung | Xong, lưu ở `localStorage` |
| Thanh toán | `shop/checkout.html` | Khung xong. COD chạy thật; VietQR chờ số tài khoản; Apple Pay khoá |
| Tìm mùi (quiz) | `shop/scent-finder.html` | Xong. 5 câu, tính điểm theo trọng số trên 5 mùi |
| Dựng hộp quà | `shop/gift.html` | Xong. 3 cỡ hộp, chọn mùi, thiệp, lời nhắn |
| Nội dung | `shop/data/shop.json` | **24 mục còn cờ placeholder** — chờ chị ấy |
| Cổng chất lượng | `shop/tools/lint-shop.py` | Chạy trước mỗi commit chạm `shop/` |

### Mỗi thứ đã dựng đang kiểm giả định nào — và bỏ nó khi nào

**Cả ba thứ dưới đây đều là giả thuyết chưa được xác nhận, kể cả khi chúng đã chạy được.** Chạy
được là một sự thật về code, không phải một sự thật về khách hàng. Mục này viết ra để sau này
không ai nhầm hai thứ đó với nhau, và để mỗi thứ có một đường ra.

| Đã dựng | Giả định nó đang kiểm | Đo bằng gì | Bỏ khi nào |
|---|---|---|---|
| **Landing page** (`index.html`) | Một trang thương hiệu tạo đủ tin để một người lạ chuyển khoản trước, việc mà một listing sàn làm chưa tốt | Tỉ lệ người vào trang mà đặt hàng; và số người hỏi "shop có thật không" | Sau 4 tuần có link trong bio + 8 bài đăng, dưới 10 đơn trực tiếp — xem chặng 1 |
| **Tìm mùi** (`scent-finder.html`) | Khách không biết chọn mùi nào, và **việc đó đang chặn mua hàng** | Số tin nhắn hỏi chọn mùi mỗi ngày, trước/sau; tỉ lệ người làm xong quiz rồi thêm vào giỏ | Nếu sau 4 tuần tỉ lệ tin nhắn hỏi chọn mùi **không giảm**. Và bỏ sớm hơn nữa nếu thử nghiệm 4 ở [01](01-CONTEXT-AND-OPPORTUNITY.md) §5 cho thấy **một đoạn chữ dán sẵn đã đủ** |
| **Hộp quà** (`gift.html`) | Khách mua nến 300k để tặng, và họ sẽ mua nhiều cây hơn nếu có hộp + thiệp | Tỉ lệ đơn từ 2 cây trở lên; AOV | Sau 100 đơn trực tiếp mà tỉ lệ đơn nhiều cây không đổi. Và **kiểm giả định này trên sàn trước** (thử nghiệm 2, [01](01-CONTEXT-AND-OPPORTUNITY.md) §5) — nếu bộ quà không bán được ngay cả trên sàn thì `gift.html` không cứu được |
| **Giỏ + checkout VietQR/COD** | Khách chịu chuyển khoản trước cho một shop nhỏ, thay vì chỉ COD | Tỉ lệ chọn VietQR so với COD | Nếu gần như 100% chọn COD thì VietQR không sai, chỉ là không phải chỗ đáng đầu tư thêm |

Điểm phải nhìn thẳng: **hai trong bốn dòng trên kiểm được rẻ hơn mà không cần code**, và lẽ ra
nên kiểm theo cách đó trước. Cái đã xây rồi thì không hoàn lại được, nhưng nó đổi nghĩa của
`shop/`: nó không phải sản phẩm đã chọn, nó là **một mũi thăm dò** dùng để mở cuộc nói chuyện và
moi ra số — xem [01](01-CONTEXT-AND-OPPORTUNITY.md) §7.

**Điểm mạnh thật của chặng 0:** nó không phải slide. Chị ấy mở điện thoại ra là dùng được, và
nó đã có sẵn chỗ cho đúng 5 mùi của chị ấy. Đó là một **công cụ mở cuộc nói chuyện** tốt —
nhưng nó **không chứng minh** giải pháp đúng, và không chứng minh anh hiểu việc làm ăn của chị
ấy. Xem [04-NEGOTIATION.md](04-NEGOTIATION.md) §1.

**Điểm yếu thật, phải nói ra:** nội dung là nội dung mẫu, VietQR chưa bật, không có máy chủ nên
đơn hàng **không được lưu ở đâu cả** — nó chỉ được soạn thành chữ để khách sao chép gửi cho shop.
Hạ tầng của chặng 0 là GitHub Pages, tức web tĩnh, và mọi thứ từ chặng 2 trở đi đều đụng vào giới
hạn đó. Xem [05-ARCHITECTURE.md](05-ARCHITECTURE.md).

---

## Chặng 1 — biến nó thành trang thật

**Nỗi đau đang GIẢ ĐỊNH** (phải xác nhận ở buổi gặp, xem [04](04-NEGOTIATION.md) §2)**:** chị ấy không sở hữu kênh nào. Mỗi đơn qua sàn nộp một khoản phí (21% trên TikTok
ở mức mặc định — [01](01-CONTEXT-AND-OPPORTUNITY.md) §2), và chị ấy không có bản ghi khách hàng của
chính mình. Cái link trong bio Instagram đang trỏ vào một listing trông giống 743 shop khác
[đã kiểm: metric.vn — 744 shop cùng ngành].

**Giả thuyết:** một trang thương hiệu thật, dán vào bio Instagram, chuyển đổi tệp người theo dõi
sẵn có **tốt hơn** một listing sàn — và với những khách đó, phí sàn về 0.

**Điều kiện mở, và nó có thể chặn cả chặng này:** phải biết **tỉ lệ đơn đến từ Instagram**. Nếu
gần như mọi đơn đến từ khám phá trên TikTok thì trang riêng chỉ chèn thêm ma sát vào một đường
mua vốn đã ngắn, và chặng này **không nên mở** — việc đúng khi đó là làm listing và quy trình
trả tin nhắn tốt hơn. Lập luận đầy đủ ở [01](01-CONTEXT-AND-OPPORTUNITY.md) §7. Đây là một kết cục
có thật, và nó được quyết ở buổi gặp đầu tiên chứ không ở đây.

**Việc phải làm:**

| Việc | Ai làm | Ghi chú |
|---|---|---|
| Nội dung 5 mùi (tên, mô tả, 3 tầng hương, lúc hợp) | **chị ấy** | đường găng — 24 placeholder chờ cái này |
| Giá thật, khối lượng, thời gian cháy, tồn kho | **chị ấy** | |
| Ảnh chụp thật | **chị ấy** | hiện đang vẽ SVG — dùng tạm được, ảnh thật bán tốt hơn |
| Số tài khoản + mã BIN để bật VietQR | **chị ấy** | 5 phút, không mất phí cổng |
| Điền vào `shop.json`, hạ cờ placeholder | anh | |
| Tên miền + DNS + CNAME | chia | tên miền phải đứng tên **chị ấy** — xem [04](04-NEGOTIATION.md) |
| Thông báo theo NĐ 248/2026 — **thủ tục vẫn còn**, phải được xác nhận trước khi vận hành | **chị ấy, sau khi hỏi luật sư** | xem [03](03-COMPETITORS-AND-INTEGRATIONS.md) §5. Nộp ở đâu thì **chưa kiểm được** — đừng chỉ chị ấy sang `online.gov.vn` rồi để chị ấy tưởng đã nộp xong. **Phạt rơi vào chị ấy** |

**Công sức:** nhỏ về phía anh — một hai cuối tuần, phần lớn là điền dữ liệu. Đường găng là nội
dung, và nó nằm ở chị ấy.

**Chỉ số:** số đơn đến qua link trực tiếp trong 30 ngày. Chi phí mỗi đơn ≈ 0 (hosting GitHub
Pages miễn phí; chỉ có tên miền).

**Điều kiện giết:** sau 4 tuần có link trong bio và ít nhất 8 bài đăng trỏ về trang, nếu số đơn
trực tiếp dưới **10** — dừng xây, đi nhìn lượng truy cập. Vấn đề khi đó không phải trang, mà là
không có ai tới, hoặc tới rồi không tin. Hai cái đó không chữa bằng code.
*(Con số 10 là thoả thuận giữa hai người, không phải chuẩn — chốt nó bằng miệng trước khi bắt đầu.)*

---

## Chặng 2 — đóng vòng lặp thanh toán và đơn hàng

**Điều kiện mở:** chặng 1 qua được ngưỡng, **và** chị ấy nói ra rằng việc chép tay đơn đang mệt.
Không mở vì "trang cần có backend".

**Nỗi đau đang GIẢ ĐỊNH** (phải xác nhận ở buổi gặp, xem [04](04-NEGOTIATION.md) §2)**:** đơn đến dưới dạng một đoạn chữ khách tự sao chép rồi nhắn. Chị ấy phải chép lại.
Tiền về thì kiểm bằng mắt trong app ngân hàng. Mã VietQR **chỉ hiển thị số tiền — nó không báo
cho máy chủ biết tiền đã về** [đã kiểm: cơ chế Napas247]. Toàn bộ chặng này tồn tại để đóng
đúng cái vòng lặp đó.

**Giả thuyết:** xác nhận thanh toán tự động cộng một bản ghi đơn hàng xoá được bước chép tay và
xoá được câu hỏi "khách này trả tiền chưa".

**Việc phải làm:** một hàm serverless (Cloudflare Workers / Vercel / Netlify — bản miễn phí đủ),
một chỗ lưu đơn, và một webhook. **Đây là chặng đầu tiên phá vỡ ràng buộc "trang tĩnh trên
GitHub Pages"** — kiến trúc ở [05-ARCHITECTURE.md](05-ARCHITECTURE.md).

Chi phí chạy thật:

| Khoản | Giá | Nguồn |
|---|---|---|
| SePay gói FREE | 0₫, 50 giao dịch/tháng, **có** webhook + API | [đã kiểm: bảng giá SePay] |
| SePay STARTUP | từ 120.000₫/tháng, ~180 giao dịch | [đã kiểm: bảng giá SePay] |
| SePay SHOP | 99.000₫/tháng (70k trả năm), không giới hạn giao dịch **nhưng KHÔNG CÓ API** | [đã kiểm] — **cái bẫy, đừng mua nhầm** |
| Serverless | 0₫ ở bản miễn phí | [chưa kiểm] ở mức lưu lượng thật |

Ở 5–10 đơn/ngày ≈ 150–300 giao dịch/tháng — **vượt gói free ngay**, rơi vào STARTUP ~120k. Ở
đầu trên (300 giao dịch) là đã vượt cả mức ~180 của STARTUP; giá bậc trên đó **[chưa kiểm]**.

**Chỉ số:** thời gian từ lúc khách đặt tới lúc đơn được xác nhận; số đơn sai/mất mỗi tuần.

**Điều kiện giết:** đo trước khi xây. Nếu xử lý tay vẫn dưới **10 phút/ngày** ở mức đơn hiện
tại — không xây. Giữ tay, và quay lại chặng 3. Một hệ thống tiết kiệm 10 phút/ngày không bù nổi
120k/tháng cộng một backend phải nuôi.

---

## Chặng 3 — nâng giá trị mỗi đơn

**Điều kiện mở:** có đủ đơn trực tiếp để đo — ít nhất **100 đơn** làm nền, nếu không thì mọi
phần trăm đọc được đều là nhiễu.

**Nỗi đau đang GIẢ ĐỊNH** (phải xác nhận ở buổi gặp, xem [04](04-NEGOTIATION.md) §2)**:** mỗi đơn một cây nến. Ở 300.000₫ thì nến là **quà**, và quà thì mua theo hộp.

**Giả thuyết:** hộp quà + thiệp viết tay nâng AOV mà không cần thêm một lượt truy cập nào.

**Đặc điểm của chặng này: gần như không phải xây.** Trình dựng hộp quà đã có ở `shop/gift.html`
từ chặng 0. Chặng 3 chủ yếu là **đo nó**, cộng hai việc thuộc về chị ấy: bao bì thật và ảnh thật.

**Việc phải quyết trước khi chạy:** hai mức giảm 8% và 14% đang nằm trong `shop/data/shop.json`
là số dựng tạm. Với giá vốn `V` chưa biết, một hộp ba cây giảm 14% có thể đang bán lỗ. **Quyết
lại sau khi biết `V`** — xem phép tính độ nhạy ở [01](01-CONTEXT-AND-OPPORTUNITY.md) §4.

**Chỉ số:** AOV của đơn trực tiếp trước/sau; tỉ lệ đơn có từ 2 cây trở lên.

**Điều kiện giết:** sau **100 đơn trực tiếp**, nếu tỉ lệ đơn nhiều cây không nhúc nhích — thôi
trang trí việc tặng quà, quay về đòn bẩy chuyển đổi.

**Một cảnh báo về kỳ vọng:** mọi con số đang lưu hành về hiệu quả của bundling và quiz
("+40% chuyển đổi", "+25% AOV", "McKinsey nói bundling tăng AOV 20–35%") đều **do chính công ty
bán phần mềm quiz/bundling phát ra, không có nhóm đối chứng**. Câu "McKinsey 2025" đã được truy
ngược: **không có ấn phẩm McKinsey nào đứng sau**. Không được mang những con số đó vào đây hay
vào buổi gặp. Cách nói đúng: đây là thông lệ phổ biến của ngành và là điểm khác một listing
Shopee — **không phải một ROI đã lượng hoá**.

---

## Chặng 4 — khách quay lại

**Điều kiện mở:** đã có một danh sách khách trực tiếp đủ lớn để nhắn lại có nghĩa. Bao nhiêu là
đủ thì phụ thuộc chặng 1–3 ra bao nhiêu đơn.

**Nỗi đau đang GIẢ ĐỊNH** (phải xác nhận ở buổi gặp, xem [04](04-NEGOTIATION.md) §2)**:** nến cháy hết rồi thì khách mua ở đâu? Hiện tại: chỗ nào tình cờ thấy trước. Chị ấy
không biết ai đã mua gì, nên không nhắc được ai.

**Giả thuyết:** nến là hàng tiêu hao có **đồng hồ mua lại nằm sẵn trong sản phẩm** — trường
"thời gian cháy" đã có chỗ trong dữ liệu sản phẩm. Một lời nhắc đúng lúc đáng giá hơn một quảng
cáo tìm khách mới.

**Chỉ số:** tỉ lệ mua lại ở mốc 90 ngày; phần doanh thu đến từ khách cũ.

**Điều kiện giết:** sau **hai chu kỳ nhắc**, nếu tỉ lệ mua lần hai không khác gì nhóm không được
nhắc — dừng.

**Hai chỗ phải cẩn thận:**

- Thu thập và nhắn tin cho khách là **xử lý dữ liệu cá nhân**. Quy định cụ thể cho việc gửi tin
  nhắn tiếp thị qua Zalo/email ở VN: **[chưa kiểm]**. Phải hỏi cùng lúc với câu hỏi luật ở
  [03](03-COMPETITORS-AND-INTEGRATIONS.md) §5.
- Sàn có cho lấy thông tin liên lạc của khách đến mức nào: **[chưa kiểm]** — mở Seller Centre xem.

---

## Chặng 5 — vận hành, và chỉ đến đây mới nói tới

**Điều kiện mở — phải là một trong hai sự kiện có thật:**

1. Chị ấy **bán hụt hàng một lần thật** (khách đặt món đã hết), hoặc
2. Chị ấy mất **hơn một tiếng mỗi ngày** cho việc hành chính đơn hàng.

Không mở vì "đã sang tháng thứ sáu".

**Giả thuyết của chặng này không phải là anh nên xây.** Giả thuyết là: đến thời điểm đó, câu trả
lời đúng là **mua**. Xem §7 ngay dưới.

**Chỉ số:** số giờ/tuần cho việc hành chính; số lần bán hụt.

---

## 6. Những thứ sẽ KHÔNG xây, và vì sao

Mục này quan trọng ngang phần chặng. Nó là thứ giữ cho dự án không phình ra thành một bản sao
tệ hơn của phần mềm đã có sẵn.

| Không xây | Vì sao |
|---|---|
| **POS / ERP đầy đủ** | Đã được giải quyết trọn vẹn ở mức 250.000–750.000₫/tháng [đã kiểm — xem [03](03-COMPETITORS-AND-INTEGRATIONS.md)]. Xây lại là **phá huỷ giá trị**: tốn hàng trăm giờ để ra một thứ tệ hơn cái mua được trong một buổi chiều. |
| **Nhiều kho / nhiều chi nhánh** | Một người làm thủ công có một chỗ để hàng. |
| **CRM chung chung** | CRM không có việc gì làm khi chưa có tệp khách. Chặng 4 cần một danh sách khách, không cần một CRM. |
| **Kế toán, hoá đơn điện tử** | Ngành riêng, có quy định riêng, và làm sai thì **chị ấy chịu phạt**. Mua, hoặc thuê dịch vụ. |
| **Đồng bộ sàn** (Shopee/TikTok/Lazada) | **Chưa biết có đủ điều kiện mở API không.** Tài liệu Odoo nói nhiều vùng đòi số đơn tối thiểu hoặc một hạng người bán [đã kiểm: tài liệu Odoo] — shop 5–10 đơn/ngày **có thể không đủ điều kiện**. Xây một thứ có thể không được phép chạy là cách hỏng đắt nhất. Xác minh trước, xem [03](03-COMPETITORS-AND-INTEGRATIONS.md) §3. |
| **App di động** | Một website chạy tốt trên điện thoại làm đúng việc đó, không cần ai cài gì. |
| **Tích điểm / thẻ thành viên** | Cần lưu lượng mà chị ấy chưa có. Ở 210 đơn/tháng thì nhớ mặt khách còn nhanh hơn. |
| **Chatbot / AI tư vấn** | Chỉ đáng bàn **sau khi** biết mỗi ngày có bao nhiêu tin nhắn hỏi chọn mùi. Nếu quiz tĩnh đã cắt được phần lớn thì không cần; nếu quiz không cắt được gì thì chatbot cũng không. Hai đằng đều chờ **cùng một con số** — và con số ấy chưa ai đo. |
| **Hộp đăng ký định kỳ (subscription)** | Cần tỉ lệ mua lại đã chứng minh. Đó là kết quả của chặng 4, không phải đầu vào. |
| **Đa ngôn ngữ** | Không có bằng chứng nào về khách nước ngoài. |
| **Đánh giá của khách — khi chưa có khách thật** | Repo đã có luật này rồi: **không bịa đánh giá**. Đánh giá giả trên một shop bán thật là lừa người mua. Có khách thật thì thêm thật. |
| **Apple Pay** | Cần một cổng thanh toán, chứng chỉ Apple, xác thực tên miền, và một endpoint máy chủ [đã kiểm: [STATUS-REPORT.md](../STATUS-REPORT.md) §3]. Bốn thứ cho một cách trả tiền mà VietQR đã làm được, miễn phí. |
| **SEO như một chặng riêng** | Không hứa thứ tự xếp hạng. Viết nội dung tử tế rồi đo, thế thôi. |

---

## 7. Chỗ mà câu trả lời đúng là "chị đi mua đi"

**Nói thẳng chuyện này ra là thứ làm cho phần còn lại đáng tin.** Ai bán hàng cũng nói cái mình
bán là cần thiết; người nói "chỗ này chị đừng mua của em" thì hiếm, và được nhớ.

| Nếu chị ấy cần | Câu trả lời đúng | Giá |
|---|---|---|
| Quản lý tồn kho, đơn, POS — **ngay hôm nay** | KiotViet hoặc Nhanh.vn POS | 250.000–350.000₫/tháng [đã kiểm] |
| Website **cộng** đồng bộ sàn **cộng** POS, một chỗ | Nhanh.vn: POS Pro 350k + Website 200k + Ecom 100k ≈ **450.000₫/tháng**, hoặc gói Omnichannel 750k | [đã kiểm: bảng giá Nhanh.vn] |
| Một website bán hàng chuẩn, có API để nối thêm | Haravan Omni Pro 680.000₫/tháng (API chỉ có từ gói này trở lên) | [đã kiểm: bảng giá Haravan] |
| Một landing page để chạy quảng cáo, đổi nhanh, tự sửa | LadiPage — có bản Starter **miễn phí**, Core 280.000₫/tháng | [đã kiểm: bảng giá LadiPage, hiệu lực 07/07/2026] |
| Website + POS trong một gói có sẵn | Sapo ADVANCED 600.000₫/tháng (kèm website) | [đã kiểm: bảng giá Sapo] |

Nếu chị ấy cần **bất kỳ dòng nào ở trên, và cần nó trong tuần này** — anh không thắng được. Không
thắng về giá, không thắng về thời gian, không thắng về việc có người trực hỗ trợ. Nói ra.

**Chỗ anh làm được mà họ không làm:** cái storefront cụ thể của thương hiệu này, bộ quiz gắn với
đúng **5 mùi của chị ấy** (không phải một app quiz đóng gói — xem
[03](03-COMPETITORS-AND-INTEGRATIONS.md) §2), trình dựng hộp quà, và việc trang không trông giống một
listing sàn. Cách nói gọn nhất: **SaaS bán cho chị cái đường ống; em làm cái căn phòng.**

Và hai thứ này không loại trừ nhau. Nếu chị ấy mua Haravan Omni Pro thì vẫn có API từ gói đó
trở lên [đã kiểm] — anh vẫn có thể là người làm cho mặt tiền của chị ấy tử tế. Đó có thể là kết
cục tốt nhất cho cả hai, và nó đáng được nêu ra ở buổi gặp như một phương án thật chứ không phải
một lời nói cho lịch sự.

---

## 8. Bảng tóm tắt điều kiện mở chặng

| Chặng | Mở khi sự kiện này xảy ra | Giết khi |
|---|---|---|
| 1 — trang thật | chị ấy đưa nội dung 5 mùi và số tài khoản | <10 đơn trực tiếp sau 4 tuần có link + 8 bài đăng |
| 2 — đóng vòng thanh toán | chị ấy nói việc chép tay đơn đang mệt | xử lý tay vẫn dưới 10 phút/ngày |
| 3 — AOV | đã có ≥100 đơn trực tiếp để làm nền đo | 100 đơn sau đó, tỉ lệ đơn nhiều cây không đổi |
| 4 — mua lại | đã có danh sách khách trực tiếp đủ lớn | 2 chu kỳ nhắc, tỉ lệ mua lần hai không đổi |
| 5 — vận hành | bán hụt hàng **một lần thật**, hoặc >1 giờ/ngày hành chính | — (chặng này là **mua**, không phải xây) |

---

Đọc tiếp: [03-COMPETITORS-AND-INTEGRATIONS.md](03-COMPETITORS-AND-INTEGRATIONS.md) · [04-NEGOTIATION.md](04-NEGOTIATION.md) ·
kiến trúc ở [05-ARCHITECTURE.md](05-ARCHITECTURE.md) · nợ kỹ thuật ở [TECH-DEBT.md](TECH-DEBT.md) ·
quay lại [00-READ-THIS-FIRST.md](00-READ-THIS-FIRST.md)
