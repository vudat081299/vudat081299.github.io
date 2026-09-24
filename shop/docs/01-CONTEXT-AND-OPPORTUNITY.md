# Bối cảnh và cơ hội

Tài liệu này trả lời một câu: **ở quy mô hiện tại của shop, tiền đang kẹt ở đâu?** Nó dựng
một mô hình kinh tế đơn vị từ năm dữ kiện ta có, đánh dấu rõ chỗ nào là biết chỗ nào là đoán,
rồi chỉ ra ba đòn bẩy đáng kéo và mỗi đòn bẩy đáng bao nhiêu tiền. Hai mục quan trọng nhất
là §5 — **những việc đáng thử mà không cần viết một dòng mã nào** — và §7, lập luận ngược cho
thấy một trang riêng có thể là sai lầm. Đọc trước khi đọc
[02-ROADMAP.md](02-ROADMAP.md), vì lộ trình chỉ có nghĩa khi đã đồng ý với chẩn đoán ở đây.
Người đọc: Đạt, trước buổi gặp đầu tiên. Không đưa tài liệu này cho chị ấy — nó nói thẳng
những chỗ đang đoán về việc làm ăn của chị ấy, và đọc lên sẽ giống như bị phán xét.

---

## 1. Ta biết gì, và đang đoán gì

Đây là toàn bộ dữ kiện về việc làm ăn. Năm dòng. Anh **chưa từng gặp chị ấy**.

| Dữ kiện | Nguồn | Mức chắc |
|---|---|---|
| ~5–10 đơn/ngày | bạn của bạn kể lại | [đoán — phải hỏi chị ấy] — "khoảng" là khoảng của người thứ ba |
| ~300.000₫/sản phẩm | như trên | [đoán — phải hỏi chị ấy] — đây là **giá một sản phẩm**, không phải giá trị một đơn |
| 5 mùi | như trên | [đoán — phải hỏi chị ấy] |
| Làm thủ công | như trên | [đoán — phải hỏi chị ấy] |
| Bán trên Instagram, TikTok, Shopee | như trên | [đoán — phải hỏi chị ấy] — không biết kênh nào ra bao nhiêu đơn |

*Thêm 24/09/2026:* một dữ kiện về **công cụ**, không phải về việc làm ăn — chị ấy dùng Excel từ
lúc nhập nguyên liệu tới lúc bán [đoán — phải hỏi chị ấy: file có những sheet nào thì chưa ai
xem]. Nó không đổi năm dòng trên, nhưng mở một đường khác tới biến quan trọng nhất ngay dưới đây:
nếu file có sheet nhập thì giá vốn tính được từ số đã ghi — xem [06](06-VALUE-CHAIN.md).

Những thứ **không biết** và mỗi thứ đều đủ sức lật ngược kết luận của tài liệu này:

- **Giá vốn một cây nến.** Không biết. Đây là biến quan trọng nhất trong cả tài liệu và nó
  đứng đầu danh sách câu hỏi ở [04-NEGOTIATION.md](04-NEGOTIATION.md).
- **Giá trị trung bình một đơn (AOV).** Một đơn là một cây hay hai cây? Không biết.
- **Tỉ lệ đơn theo kênh.** Nếu 90% đơn đến từ Instagram thì lập luận về phí sàn ở §5 yếu đi rất nhiều.
- **Tiền quảng cáo.** Không biết có chạy ads không.
- **Tỉ lệ hoàn/huỷ.** COD hoàn đơn là mất tiền ship hai chiều.
- **Năng lực sản xuất.** Một mẻ nến làm được bao nhiêu cây, mất bao lâu. Con số này quyết định
  trần thật của việc mở rộng, và nó có thể thấp hơn 50 đơn/ngày rất nhiều.
- **Chị ấy có muốn to không.** Xem §10.

> **Một cảnh báo về hướng suy nghĩ, đặt ngay đây vì nó chi phối cả bốn tài liệu.**
> Câu hỏi tự nhiên với một người viết phần mềm là "mình xây được gì cho shop này". Đó là câu
> hỏi **sai thứ tự**. Câu đúng là "**business này đang bị chặn bởi cái gì**", và phần mềm chỉ là
> một trong nhiều câu trả lời có thể — thường không phải câu rẻ nhất, và gần như không bao giờ
> là câu nhanh nhất.
>
> Mọi thứ đã dựng trong `shop/` — landing page, Tìm mùi, Hộp quà — đều là **giả thuyết**, không
> phải bằng chứng. Chúng chạy được. Chạy được không chứng minh chúng đúng. Với năm dữ kiện thì
> chưa có gì chứng minh được cái gì cả.
>
> Rủi ro lớn nhất bây giờ **không phải xây sai kỹ thuật, mà là xây nhầm thứ**. Bất định về
> business đang lớn hơn bất định về công nghệ rất nhiều, và anh đang mạnh ở đúng cái vế bất định
> nhỏ hơn.

Quy ước dùng trong cả bốn tài liệu: `[đã kiểm: nguồn]` là con số đọc thẳng từ trang nguồn;
`[chưa kiểm]` là chưa xác minh được; `[đoán — phải hỏi chị ấy]` là giả định dựng để tính, không
phải sự thật. Con số nào không có dấu là con số tính ra từ các con số có dấu ở ngay trên nó.

---

## 2. Mô hình kinh tế đơn vị của shop

Mọi số dưới đây dựng trên đúng bốn giả định, liệt kê hết ra để ai cũng sửa được:

| Đầu vào | Giá trị dùng để tính | Nhãn |
|---|---|---|
| Số đơn/ngày | 5 · 7 · 10 (7 là điểm giữa) | [đoán — phải hỏi chị ấy] |
| Giá bán một cây | 300.000₫ | [đoán — phải hỏi chị ấy] |
| Số cây một đơn | 1 | [đoán — phải hỏi chị ấy] |
| Số ngày bán/tháng | 30 | [đoán] |
| **Giá vốn một cây** | **không biết — để là biến `V`** | [đoán — phải hỏi chị ấy] |

**Doanh thu gộp mỗi tháng:**

| Đơn/ngày | Phép tính | Doanh thu/tháng |
|---|---|---|
| 5 | 5 × 300.000 × 30 | 45.000.000₫ |
| 7 | 7 × 300.000 × 30 | 63.000.000₫ |
| 10 | 10 × 300.000 × 30 | 90.000.000₫ |

Đây là **doanh thu**, không phải tiền chị ấy cầm về. Tiền cầm về = doanh thu − phí sàn − giá
vốn `V` × số cây − tiền ship chị chịu − quảng cáo − thuế − công của chính chị. Ta không biết
`V`, nên ta **không biết** chị ấy thực sự kiếm được bao nhiêu. Tuyệt đối không được nói với chị
ấy một con số lợi nhuận nào.

### Sàn giữ lại bao nhiêu trên một cây 300.000₫

**TikTok Shop** — ba khoản, cộng được:

| Khoản | Mức | Trên 300.000₫ |
|---|---|---|
| Hoa hồng nền tảng | mặc định 14,00%, dải 2,00–16,00% tuỳ ngành, hiệu lực 03/07/2026 [đã kiểm: TikTok Seller University] | 42.000₫ |
| Phí giao dịch | 6%, từ 09/05/2026 [đã kiểm: TikTok Seller University] | 18.000₫ |
| Phí xử lý đơn | 3.000₫/đơn giao thành công, từ 27/10/2025 [đã kiểm: TikTok Seller University] | 3.000₫ |
| **Cộng** | | **63.000₫ = 21,0%** |

Một nguồn thứ cấp (VietTimes 05/2026) tính tổng chi phí nền tảng ≈ 23–24% doanh thu, tức
69.000–72.000₫ trên cây 300k [nguồn thứ cấp — chưa kiểm]. Chênh so với 63.000₫ ở trên là hợp lý
nếu tính thêm các khoản chương trình, voucher, freeship. **Dùng con số 63.000₫ khi nói chuyện,
vì nó cộng được từ ba khoản kiểm được.** Lưu ý mức hoa hồng thật của ngành nến là **không biết**
— dải là 2–16%, mặc định 14%, và chỉ có Seller Centre của chị ấy mới nói đúng.

**Shopee** — cộng được một phần, phần còn lại thì không:

| Khoản | Mức | Trên 300.000₫ |
|---|---|---|
| Phí xử lý giao dịch | 6% từ 01/05/2026 (trước là 4,91%), áp cho **mọi** hình thức gồm cả COD, đã gồm VAT [nguồn ngành — chưa đối chiếu trang chính thức] | 18.000₫ |
| Phí hạ tầng | 3.000₫/đơn, từ 01/07/2025 [nguồn ngành — chưa đối chiếu trang chính thức] | 3.000₫ |
| Phí cố định theo ngành hàng | **không trích được** — ba nguồn cho ba khoảng khác nhau (1,5–17% / 8,8–11,7% / 1,21–8,1%) | ? |
| **Cộng phần biết được** | | **≥ 21.000₫ = 7,0%** |

Ngoài ra sàn khấu trừ thuế VAT 1–5% và TNCN 0,5–5% từ 01/07/2025 [nguồn ngành — chưa đối chiếu trang chính thức].

**Ba nguồn mâu thuẫn nhau về phí cố định thì không được chọn một nguồn mà tin.** Cách đúng là
bảo chị ấy mở Seller Centre lên xem — mất hai phút, xem §6.

---

## 3. Nút thắt không nằm ở vận hành

Ở 5–10 đơn/ngày, một người làm thủ công xử lý đơn bằng tay là **hoàn toàn khả thi**. Bảy đơn một
ngày là bảy lần chép địa chỉ. Không có phần mềm nào tiết kiệm đủ thời gian để bõ công dựng nó,
và mọi hệ vận hành dựng ở quy mô này đều là hệ vận hành cho một lượng đơn chưa tồn tại.

Đơn giản hơn: nếu chị ấy có một phần mềm quản lý đơn hoàn hảo, miễn phí, cài xong trong một
buổi chiều — thì tháng sau chị ấy vẫn bán **5–10 đơn/ngày**. Không thêm một đơn nào. Đó là định
nghĩa của "không phải nút thắt".

Nút thắt là **nhu cầu, chuyển đổi, và giá trị mỗi đơn**.

### Một chỗ phải nói ngược lại luận điểm trên

Có đúng một thứ trông giống vận hành nhưng thật ra là vấn đề chuyển đổi: **thời gian trả tin
nhắn**. Nếu mỗi ngày chị ấy mất hai ba tiếng trả "mùi này thơm thế nào chị ơi", thì đó không
phải chi phí vận hành — đó là **bài toán chọn mùi đang hiện ra dưới dạng lao động**, vì khách
không ngửi được qua màn hình nên phải hỏi người bán.

Cái này đáng làm, và nó đáng làm vì hai lý do cùng lúc: giảm giờ trả tin nhắn, và tăng tỉ lệ
người quyết định mua mà không cần hỏi. Đó là lý do câu hỏi "một ngày chị trả bao nhiêu tin
nhắn, phần lớn hỏi gì" nằm ở nhóm ưu tiên cao nhất trong [04-NEGOTIATION.md](04-NEGOTIATION.md).

Và một chỗ nữa: **năng lực sản xuất là một trần vận hành có thật**, chỉ là nó chưa chạm tới.
Nến làm thủ công có nhịp mẻ. Nếu một mẻ ra 20 cây và mất một ngày rưỡi, thì 50 đơn/ngày không
phải bài toán phần mềm mà là bài toán xưởng, thuê người, và có thể là bài toán "còn là handmade
nữa không". Phải hỏi.

---

## 4. Ba đòn bẩy, và mỗi cái đáng bao nhiêu

### Đòn bẩy 1 — chuyển đổi

Chuẩn duy nhất dùng được: Littledata, 2.800 cửa hàng Shopify, 2023 — **trung bình 1,4%**, top 20%
trên **3,2%**, top 10% trên **4,7%**, mobile **1,2%**, desktop **1,9%** [đã kiểm: Littledata 2023].
**Không có số riêng cho nến và không có số riêng cho Việt Nam.** Đây là cửa hàng Shopify, phần
lớn phương Tây, và có thể không chuyển sang được bối cảnh mua sắm qua mạng xã hội ở VN.

Không biết lượt truy cập của chị ấy, nên chỉ tính ngược được:

| Nếu chuyển đổi là | Để có 7 đơn/ngày cần | Phép tính |
|---|---|---|
| 1,2% (mobile, trung bình) | 583 lượt/ngày | 7 ÷ 0,012 |
| 1,4% (trung bình chung) | 500 lượt/ngày | 7 ÷ 0,014 |
| 3,2% (ngưỡng top 20%) | 219 lượt/ngày | 7 ÷ 0,032 |

Đây là câu hỏi quyết định phải hỏi chị ấy: **một ngày có bao nhiêu người xem?** Con số đó có
sẵn trong Seller Centre và trong TikTok analytics.

- Nếu là 500+ lượt/ngày mà chỉ 7 đơn → chuyển đổi đang quanh mức **trung bình** của bộ Littledata,
  **trang có thể là đòn bẩy**. Đẩy từ 1,4% lên 2,8% là gấp đôi số đơn mà không cần thêm một người
  xem nào.

  Một lưu ý phải nói ra, vì nó đổi cách đọc cả bảng trên: Littledata công bố **trung bình**, không
  công bố trung vị — bản trước của tài liệu này ghi nhầm thành "trung vị" ở bốn chỗ. Phân phối tỉ
  lệ chuyển đổi lệch phải mạnh (vài cửa hàng rất cao kéo đuôi dài), nên **trung bình nằm cao hơn
  trung vị**. Nghĩa là 1,4% có lẽ đã cao hơn cửa hàng điển hình, và cột "cần bao nhiêu lượt xem"
  ở trên là **ước lượng dè dặt** chứ không phải mốc trung tâm. Không kết luận được shop của chị ấy
  đang trên hay dưới mức điển hình — nguồn không cho phép nói câu đó.
- Nếu là 80 lượt/ngày → chuyển đổi đã rất cao rồi, vấn đề là **không ai biết đến shop**. Không
  trang nào chữa được cái đó, và xây trang là làm sai việc.

Không đo lượt truy cập thì không được kéo đòn bẩy này.

### Đòn bẩy 2 — giá trị mỗi đơn (AOV)

Đây là đòn bẩy rẻ nhất ở quy mô này, vì nó **không cần thêm một lượt truy cập nào** — nhưng chỉ rẻ trên **kênh trực tiếp**; bán qua sàn thì sàn ăn 21% của phần tăng, xem bảng ngay dưới.

Minh hoạ, dùng đúng hộp quà đang có sẵn trong `shop/data/shop.json` (Hộp đôi, giảm 8%):

| | Phép tính | Kết quả |
|---|---|---|
| Hiện tại | 210 đơn × 300.000 | 63.000.000₫/tháng |
| Nếu 1/4 số đơn thành hộp đôi | 52 × (2 × 300.000 × 0,92) = 52 × 552.000 | 28.704.000₫ |
| | 158 đơn lẻ × 300.000 | 47.400.000₫ |
| | cộng | **76.104.000₫/tháng** |
| **Chênh** | | **+13.104.000₫/tháng (+20,8%)** |

Nhưng con số đó là **doanh thu, không phải lời**. Nó đòi làm thêm 52 cây nến mỗi tháng:

…và nếu 52 hộp ấy vẫn bán **qua sàn** thì sàn ăn tiếp ~21% của phần doanh thu tăng thêm:
13.104.000 × 21% = **2.751.840₫/tháng**.

| Nếu giá vốn `V` là | Chi phí 52 cây thêm | Phí sàn trên phần tăng | Còn lại, **chưa tính công** |
|---|---|---|---|
| 150.000₫ | 7.800.000₫ | 2.751.840₫ | +2.552.160₫/tháng |
| 200.000₫ | 10.400.000₫ | 2.751.840₫ | **−47.840₫/tháng** |
| 250.000₫ | 13.000.000₫ | 2.751.840₫ | **−2.647.840₫/tháng** |

**Đọc kỹ dòng giữa: nó ÂM.** Bản trước của bảng này chỉ trừ giá vốn, không trừ phí sàn, nên cùng
mức `V = 200.000₫` nó ghi *+2.704.000₫* — dương, và dùng con số ấy để kết luận AOV là đòn bẩy rẻ
nhất. Đó đúng là lớp lỗi mà sổ nợ ghi là "đã sửa ở bản đề xuất" (cộng tiền thật với doanh thu
chưa trừ giá vốn), chỉ là nó còn sống ở đây — và đây mới là tài liệu Đạt dùng để tự thuyết phục
mình.

Ba mức giá vốn trên là **số bịa để cho thấy độ nhạy**, không phải ước lượng: `V` thật thì chỉ chị
ấy biết, và đó là câu hỏi A2. Nhưng hình dạng của bảng thì không phụ thuộc vào `V`: bán hộp quà
**qua sàn** thì lời bị bóp từ hai đầu — giảm giá 8% cho khách, rồi sàn ăn 21% của phần còn lại.
Đòn bẩy AOV chỉ thật sự rẻ **trên kênh trực tiếp**, nơi không có 21% kia. Mà kênh trực tiếp lại
đúng là thứ chưa tồn tại. Hai điều này phải đọc cùng nhau, đừng đọc riêng.

**Kết luận dùng được ngay:** hai con số giảm giá 8% và 14% đang nằm trong `shop/data/shop.json`
là **số dựng tạm**, và phải quyết lại sau khi biết `V`. Ghi vào [TECH-DEBT.md](TECH-DEBT.md).

### Đòn bẩy 3 — mua lại

Không có số nào. Nến là hàng tiêu hao — nó cháy hết, và đó là một cái **đồng hồ mua lại có sẵn
trong bản chất sản phẩm**. Nến ly hay được nói là cháy khoảng 30–50 giờ [chưa kiểm — con số thật
phụ thuộc khối lượng sáp và loại bấc, **phải hỏi chị ấy**]; trường "thời gian cháy" đã có chỗ
trong dữ liệu sản phẩm nhưng đang để trống. Biết con số đó là biết nên nhắn lại khách sau bao
lâu — và đó là thứ duy nhất cần để chạy thử nghiệm 1 ở §5.

Minh hoạ thuần tuý, mọi tỉ lệ đều bịa [minh hoạ — không có số thật]: 210 đơn/tháng, nếu 1/10
khách quay lại trong 90 ngày thì được thêm 21 đơn; nếu 1/5 thì được 42. Chênh ≈ 21 đơn ≈
6.300.000₫ trong một cửa sổ 90 ngày ≈ 2.100.000₫/tháng.

Điểm quan trọng không phải con số, mà là điều kiện: **muốn khách quay lại thì phải biết khách
là ai.** Sàn cho người bán lấy thông tin liên lạc của khách đến đâu — [chưa kiểm], phải mở
Seller Centre ra xem. Kênh trực tiếp thì theo định nghĩa là chị ấy có bản ghi đơn hàng của chính
mình. Đây là lý do chiến lược để sở hữu kênh, và nó là lý do **chậm nhất** trong ba đòn bẩy.

### Thứ tự kéo

1. **AOV** — rẻ nhất **nếu bán qua kênh trực tiếp**, không cần thêm traffic, cơ chế đã dựng sẵn trong repo. Bán qua sàn thì sàn ăn 21% của phần tăng và ở giá vốn cao nó có thể **âm**.
2. **Chuyển đổi** — mạnh nhất, nhưng phải đo lượt truy cập trước, nếu không là bắn vào bóng tối.
3. **Mua lại** — chậm nhất nhưng cộng dồn, và là lý do thật để sở hữu kênh trực tiếp.

---

## 5. Những việc đáng thử mà không cần viết một dòng mã nào

Mục này đứng **trước** mọi đề xuất phần mềm trong cả bốn tài liệu, và đứng trước là cố ý.

> **Luật:** nếu một thay đổi không cần code mà làm tăng doanh số nhiều hơn một website, thì nó
> **có giá trị hơn** website. Không phải "cũng tốt" — hơn. Rẻ hơn, nhanh hơn, và bỏ đi cũng
> không tiếc.

Sáu thử nghiệm dưới đây đều chạy được **trên kênh chị ấy đang có**, không cần một dòng mã, và
mỗi cái kiểm đúng một giả định mà một phần mềm nào đó trong `shop/` đang ngầm giả định là đúng.

| # | Thử cái gì | Kiểm giả định nào | Đo bằng gì | Chi phí |
|---|---|---|---|---|
| 1 | **Nhắn lại khách cũ.** Lấy danh sách khách mua cách đây 2–3 tháng, nhắn tay từng người | Đòn bẩy 3 (mua lại) có thật không. Đây cũng là **lý do thật để sở hữu kênh trực tiếp** — nếu không ai quay lại thì lý do đó rỗng | Bao nhiêu người mua lại trên tổng số nhắn | Một buổi tối của chị ấy |
| 2 | **Bán bộ quà ngay trên Shopee/TikTok.** Tạo listing "hộp 2 cây" và "hộp 3 cây" trên kênh sẵn có | Toàn bộ giả thuyết quà tặng mà `shop/gift.html` được xây dựa trên — **kiểm mà không cần `gift.html`** | AOV; tỉ lệ đơn từ 2 cây trở lên | Ảnh + dựng listing, một buổi |
| 3 | **Viết lại mô tả và thay ảnh trên listing đang có** | Chuyển đổi trên sàn có cải thiện được bằng nội dung không | Tỉ lệ chuyển đổi của listing — **cả Shopee và TikTok đều báo con số này** | Một buổi chiều |
| 4 | **Một câu trả lời mẫu cho câu hỏi chọn mùi**, lưu sẵn để dán, hoặc ghim một bài so sánh 5 mùi | Đúng giả định mà **Tìm mùi** được xây dựa trên: khách không chọn được mùi, và việc đó chặn mua hàng | Số phút trả tin nhắn mỗi ngày, trước/sau; số người mua ngay sau câu trả lời đó | 30 phút |
| 5 | **Thử tăng giá** một mùi từ 300k lên 330k trong hai tuần | Giá hiện tại có phải mức tối ưu không | Số đơn của mùi đó trước/sau | 0₫ |
| 6 | **Thử bán kèm bằng tay**: lúc khách chốt đơn, đề nghị thêm cây thứ hai với giá ưu đãi, nhắn trực tiếp | Đòn bẩy 2 (AOV) — kiểm trước khi xây bất cứ cơ chế bundling nào | Tỉ lệ khách nhận lời | 0₫ |

**Thử nghiệm 4 là cái nên chạy trước tiên**, vì nó kiểm giả định của thứ đã tốn nhiều công nhất
trong `shop/`. Nếu một đoạn chữ dán sẵn đã giải quyết được phần lớn câu hỏi chọn mùi, thì bộ
quiz chưa chứng minh được nó thêm được gì — và điều đó cần biết **trước** khi ai trả tiền cho nó.

**Một cảnh báo về thống kê, phải nói ra:** ở 5–10 đơn/ngày, hai tuần chỉ có khoảng 70–140 đơn.
Với cỡ mẫu đó, các thử nghiệm trên **chỉ phát hiện được hiệu ứng lớn**, không phát hiện được
hiệu ứng nhỏ, và chúng bị nhiễu bởi mùa vụ (§9) cùng nhịp đăng bài. Đừng đọc chênh lệch 10% như
một kết quả. Ở giai đoạn này chỉ có hiệu ứng lớn mới đáng quan tâm, nên hạn chế đó chấp nhận được
— miễn là biết mình đang chấp nhận nó.

**Vì sao sáu cái này hơn phần mềm, ở đúng thời điểm này:**

1. **Rẻ hơn** — tổng chi phí gần bằng 0, so với hàng chục giờ cho một tính năng.
2. **Trả lời nhanh hơn.** Kết quả có trong 2–4 tuần, không phải sau khi xây xong.
3. **Chúng sinh ra đúng những con số làm cho một quyết định phần mềm có căn cứ.** Muốn biết
   trang riêng có đáng không thì phải biết khách cũ có quay lại không, hộp quà có ai mua không,
   và một câu trả lời hay có bán được hàng không. Sáu thử nghiệm trên trả lời cả ba.
4. **Chúng là kết quả của chị ấy, không phải của anh.** Con số chị ấy tự tạo ra thì chị ấy tin.

Và nếu **không cái nào ăn**, đó cũng là thông tin — thông tin quan trọng nhất có thể có. Nó cảnh
báo rằng nhu cầu, chứ không phải công cụ, mới là chỗ đang tắc, và rằng một phần mềm cũng sẽ
không ăn.

---

## 6. Phí sàn: lập luận mạnh nhất, và chị ấy tự kiểm được trong hai phút

Ở 7 đơn/ngày = 210 đơn/tháng, nếu toàn bộ đi qua TikTok Shop ở mức mặc định:

> 210 × 63.000₫ = **13.230.000₫/tháng về sàn**, bằng **21% doanh thu**, trước khi tính một đồng
> quảng cáo nào.

Đây là con số có sức nặng vì ba lý do:

1. **Nó cộng được từ ba khoản kiểm được**, không phải một con số ai đó nói.
2. **Nó mới** — cả ba mức đều đổi trong 2025–2026 (6% giao dịch từ 09/05/2026, hoa hồng hiệu lực
   03/07/2026, 3.000₫/đơn từ 27/10/2025). Rất có thể chị ấy chưa tính lại từ lần tăng gần nhất.
3. **Chị ấy tự kiểm được ngay tại chỗ.** Mở Seller Centre, chọn một đơn đã hoàn tất, xem dòng
   khấu trừ. Hai phút. Không cần tin lời ai.

**Đề nghị cách làm ở buổi gặp:** đừng nói con số. Bảo chị ấy mở điện thoại ra và cùng xem một
đơn thật. Con số của chính chị ấy thuyết phục hơn mọi con số anh mang tới, và nếu nó khác con số
ở trên thì anh vừa học được điều quan trọng nhất trong cả buổi.

### Ba chỗ phải trung thực, nếu không lập luận này sẽ vỡ khi bị hỏi lại

- **Phí sàn một phần là tiền mua nhu cầu.** 14% hoa hồng TikTok trả cho cái feed đẩy khách tới.
  Khách đó không tự nhiên xuất hiện trên website của chị ấy. Khoản tiết kiệm chỉ có thật với
  **khách chị ấy đã sở hữu** — người theo dõi Instagram, khách cũ mua lại — chứ không có thật
  với khách khám phá mới. Nói câu này ra trước khi bị hỏi.
- **Thuế thì không thoát được.** Khoản VAT 1–5% và TNCN 0,5–5% sàn khấu trừ là **thuế của chị
  ấy**, sàn chỉ giữ hộ tại nguồn. Bán trực tiếp không xoá được nghĩa vụ đó — nó chỉ chuyển việc
  kê khai sang cho chị ấy tự làm, và đó là thêm việc chứ không phải bớt tiền.
- **Kênh trực tiếp không miễn phí.** Xem chi phí thật ở [03-COMPETITORS-AND-INTEGRATIONS.md](03-COMPETITORS-AND-INTEGRATIONS.md)
  — riêng SePay đã khoảng 120.000₫/tháng, chưa kể tên miền và công của anh.

---

## 7. Lập luận ngược: vì sao một trang riêng có thể là sai lầm

Mục này không viết để bác bỏ cho có. Nó là phản biện mạnh nhất với toàn bộ hướng đi, và nếu nó
đúng thì §6 ở trên là một cái bẫy.

**Khách đang ở trên sàn.** Trong ngành nến thơm quà năm 2025, Shopee chiếm **77,3%** và TikTok
**22,0%** doanh thu [đã kiểm: metric.vn — chi tiết ở §8]. Tức là **99,3%** doanh thu của thị
trường đo được này xảy ra **bên trong hai cái app**.

Trong social commerce, đường mua hàng ngắn đến mức gần như không có ma sát:

> xem video → bấm giỏ → địa chỉ đã lưu sẵn → phương thức thanh toán đã lưu sẵn → xong.

Một landing page riêng chèn thêm vào đúng đường đó:

> rời app → mở trình duyệt → một trang lạ, thương hiệu chưa từng nghe → nhập lại địa chỉ →
> phương thức thanh toán chưa lưu → quét QR → chuyển sang app ngân hàng → quay lại.

**Mỗi mũi tên là một chỗ mất khách.** Nghĩa là giả định mặc định phải là **trang riêng làm TĂNG
ma sát**, cho tới khi chứng minh được điều ngược lại — chứ không phải ngược lại.

Hệ quả trực tiếp cho §6: **21% tiết kiệm trên một đơn không xảy ra thì bằng 0.** Lập luận phí
sàn chỉ đáng đúng bằng tỉ lệ chuyển đổi thật của kênh trực tiếp. Không được cộng khoản tiết kiệm
trước khi có đơn.

### Vậy khi nào trang riêng mới đáng?

Chỉ khi nó phục vụ **một hành vi cụ thể mà kênh hiện tại làm chưa tốt**, và hành vi đó **đo được**.
Bốn ứng viên, mỗi cái kèm thứ sẽ chứng minh nó:

| Hành vi | Sàn làm chưa tốt ở chỗ nào | Bằng chứng cần có trước khi tin |
|---|---|---|
| **Chọn mùi** | Listing sàn không có chỗ đặt 5 mùi cạnh nhau và giải thích | Số tin nhắn hỏi chọn mùi mỗi ngày. Nếu chị ấy trả 20 tin/ngày về chuyện này thì đây là lỗ hổng thật. Thử nghiệm 4 ở §5 đo được nó |
| **Quà tặng** | Sàn bán một SKU; không bán một hộp có thiệp viết tay và lời nhắn | Có khách hỏi mua làm quà không, có hỏi gói/thiệp không. **Thử nghiệm 2 ở §5 kiểm được mà không cần trang** |
| **Khách cũ** | Sàn cho người bán nhắn lại khách cũ tới mức nào: [chưa kiểm] | Thử nghiệm 1 ở §5 |
| **Người theo dõi Instagram** | **Instagram không có giỏ hàng.** Hiện tại khách phải nhắn tin, chờ trả lời, rồi chuyển khoản tay | Bao nhiêu phần trăm đơn đến từ Instagram, và tệp đó bao nhiêu người |

**Dòng cuối là dòng quan trọng nhất, và nó lật ngược lập luận ma sát.** Với tệp Instagram, một
trang bán hàng là **ÍT ma sát hơn** chứ không nhiều hơn — vì con đường hiện tại của họ đang là
nhắn tin và chờ. Đó có thể là lý do mạnh nhất để có trang riêng, và nó phụ thuộc hoàn toàn vào
một con số ta **không biết**: tỉ lệ đơn đến từ Instagram.

### Kết luận trung thực

- Nếu **95% đơn đến từ khám phá trên TikTok**, thì trang riêng nhiều khả năng là sai, và việc
  đúng là làm listing và quy trình trả tin nhắn của chị ấy tốt hơn. Đây là một kết cục có thật
  của buổi gặp đầu tiên, và anh phải sẵn sàng nói ra nó tại chỗ.
- Nếu **một phần đáng kể đơn đến từ Instagram**, trang riêng có lý do rõ ràng, và lý do đó là
  giảm ma sát chứ không phải tiết kiệm phí.

**Điều này định nghĩa lại `shop/` đang là cái gì:** nó không phải sản phẩm, nó là **một mũi
thăm dò**. Việc của nó là được đưa ra cho chị ấy xem, gây phản ứng, và moi ra các con số ở §1.
Nếu các con số nói đừng phát hành, thì nó vẫn đã làm xong việc của nó.

---

## 8. Thị trường: crowded, và chị ấy đang đứng đúng vùng giá

Số liệu metric.vn, ngành "nến thơm quà", ba sàn Shopee + TikTok + Lazada, 01/01–31/12/2025
[đã kiểm: metric.vn]:

| Chỉ số | Giá trị | Ý nghĩa |
|---|---|---|
| Số SKU | 2.449 | |
| Số shop đang bán | 744 | ≈ 3,3 SKU/shop (2.449 ÷ 744) |
| Khoảng giá bán chạy nhất | 200.000–500.000₫ | 300k của chị ấy nằm **đúng giữa** vùng ngọt |
| Tháng cao điểm | 12/2025, +37,23% so với 11/2025 | xem §7 |
| Thị phần doanh thu | Shopee 77,3% · TikTok 22,0% · Lazada 0,7% | |
| Thương hiệu dẫn đầu | heny garden, le cadeau, kilig charm, chillme, cohome | 5 cái tên để đi xem người ta làm gì |

**Cảnh báo về bộ số này:** nó chỉ là ngành "nến thơm quà" trên ba sàn, không phải toàn thị
trường nến thơm, và **không tính Instagram, Facebook, hay bán trực tiếp** — tức là bỏ qua đúng
cái kênh có thể đang nuôi shop của chị ấy. Dữ liệu là của 2025, đã một năm. Con số doanh thu
tuyệt đối nằm sau paywall, **không có**.

Ba kết luận rút ra được:

1. **Chị ấy không thiếu sản phẩm.** 5 mùi so với trung bình 3,3 SKU/shop là trên mức thường.
   Mục tiêu "mở rộng dải sản phẩm" của anh đáng hoãn lại: thêm SKU vào một shop chưa đủ người
   xem là thêm việc, không phải thêm doanh thu. Bán hết 5 mùi trước đã.
2. **Lazada không đáng tích hợp.** 0,7% doanh thu. Nó lại là sàn dễ nối API nhất
   (xem [03](03-COMPETITORS-AND-INTEGRATIONS.md)) — dễ nhất lại ít đáng nhất. Đừng để cái dễ dẫn dắt việc.
3. **744 shop cùng bán** nghĩa là khác biệt không phải điều xa xỉ. Một listing Shopee của chị ấy
   trông giống 743 listing khác. Nhưng cách rẻ nhất để khác đi là **sửa chính cái listing ấy**
   (thử nghiệm 3, §5), không phải dựng một chỗ mới — §7 vừa nói mặc định phải là *trang riêng
   làm tăng ma sát cho tới khi chứng minh được ngược lại*. Storefront riêng chỉ hơn ở những
   hành vi sàn **không cho làm**: bộ chọn mùi, hộp quà ghép, nhắn lại khách theo chu kỳ nến
   cháy. Đó mới là lý do tồn tại của nó — không phải con số 744.

---

## 9. Mùa vụ: tháng 12, và hôm nay là 20/09

Tháng 12/2025 cao hơn tháng 11 **37,23%** [đã kiểm: metric.vn]. Không biết nguyên nhân chính xác
là quà Giáng sinh, quà cuối năm cho công ty, hay cái gì khác — và Tết 2026 rơi vào tháng 2 nên
đỉnh tháng 12 không phải Tết. Phải hỏi chị ấy tháng nào của **chính chị ấy** bán nhiều nhất năm
ngoái; số của chị ấy đáng tin hơn số của sàn.

Cái này quyết định lịch, và phép tính rất ngắn:

| Mốc | Ngày | Còn |
|---|---|---|
| Hôm nay | 20/09/2026 | |
| Nội dung phải xong | cuối 10/2026 | ~6 tuần |
| Tháng chạy thử thật | 11/2026 | |
| Đỉnh mùa | 12/2026 | ~10 tuần |

**Ý nghĩa:** một kênh bán mới mở vào tháng 12 với checkout chưa ai chạy thật là mở đúng lúc sai
nhất. Cần một tháng 11 để đơn thật chạy qua và lỗi thật lộ ra. Mà nội dung — tên 5 mùi, mô tả,
ảnh, số tài khoản — **nằm trên đường găng của chị ấy chứ không phải của anh**. Trang hiện tại có
28 mục còn cờ placeholder và tất cả đều chờ chị ấy.

Nghĩa là buổi gặp đầu tiên nên diễn ra **sớm**, và mục tiêu số một của nó là lấy được nội dung
5 mùi, chứ không phải chốt giá. Đúng như kết luận của [04-NEGOTIATION.md](04-NEGOTIATION.md).

Mặt trái, nói luôn cho công bằng: nếu tháng 12 đúng là đỉnh thì tháng 12 cũng là tháng chị ấy
bận nhất và **ít sẵn sàng thử cái mới nhất**. Đẩy nhau chạy nước rút vào tháng 11 có thể phản
tác dụng. Nếu đến giữa tháng 10 nội dung chưa xong, phương án đúng là **nhắm tháng 12 làm tháng
quan sát** và mở bán thật sau Tết — nói trước điều này thay vì để nó tự xảy ra rồi đổ lỗi.

---

## 10. Cái gì sẽ chứng minh là tôi sai

Tám đường, xếp theo mức nguy hiểm.

1. **Chị ấy không muốn to.** Mục tiêu 50 → 100 → 200 → 500 đơn/ngày là mục tiêu **của anh**.
   Rất nhiều người làm handmade cố tình giữ shop nhỏ, vì to lên nghĩa là thuê người, thuê xưởng,
   và thôi tự tay làm — tức là mất đúng thứ khiến họ bắt đầu. 500 đơn/ngày nến thủ công là một
   nhà máy. Nếu chị ấy muốn dừng ở 15 đơn/ngày và giữ cuối tuần, thì gần như mọi thứ trong bốn
   tài liệu này phải viết lại. **Hỏi ngay ở buổi một.**
2. **Vận hành đúng là nút thắt.** Nếu chị ấy đang ở 10 đơn/ngày, làm một mình, và ngày nào cũng
   chép tay đơn từ ba kênh vào một quyển sổ — thì câu trả lời đúng là bảo chị ấy mua Nhanh.vn,
   không phải xây gì cả. Xem mục "khi nào nên khuyên mua SaaS" ở [02-ROADMAP.md](02-ROADMAP.md).
3. **Biên lợi nhuận mỏng.** Nếu giá vốn `V` chiếm phần lớn giá bán, thì 13 triệu/tháng phí sàn
   vẫn là 13 triệu, nhưng phần tăng AOV ở §4 teo lại gần bằng không, và chị ấy không có tiền
   mặt để trả cho bất cứ ai. Không biết `V` là không biết gì cả.
4. **Đơn đến từ khám phá, không từ người theo dõi.** Nếu gần như mọi đơn đến từ feed TikTok
   chứ không phải từ tệp khách của chị ấy, thì một website không có nguồn khách và sẽ chuyển
   đổi bằng không. Website chỉ đáng xây khi đã có tệp khách sở hữu được.
5. **Chị ấy đã có sẵn một website bỏ không.** Nếu đã mua Haravan hay Sapo rồi không dùng, thì
   vấn đề chưa bao giờ là phần mềm. Xây thêm một cái nữa là lặp lại sai lầm đắt hơn.
6. **Rào pháp lý chặn.** Nếu Luật TMĐT 122/2025 khiến một người bán cá nhân mở website bán hàng
   gặp rủi ro thật, mọi thứ dừng cho tới khi có luật sư trả lời. Xem
   [03-COMPETITORS-AND-INTEGRATIONS.md](03-COMPETITORS-AND-INTEGRATIONS.md) §5. **Tiền phạt rơi vào chị ấy.**
7. **Cả hướng đi sai vì trang riêng thêm ma sát chứ không bớt.** Đây là phản biện mạnh nhất và
   nó có mục riêng ở §7. Nếu gần như mọi đơn đến từ khám phá trên TikTok thì một trang riêng
   không có nguồn khách và chỉ chèn thêm bước vào một đường mua vốn đã ngắn.
8. **Chuẩn Littledata không chuyển sang được.** 2.800 cửa hàng Shopify phương Tây năm 2023
   không hứa gì về một shop nến ở TP.HCM bán qua Instagram năm 2026. Mọi phép tính ngược ở §4
   đổ theo nếu chuẩn này sai.

Điểm chung của tám đường trên: **bảy trong tám được giải quyết bằng cách hỏi chị ấy hoặc chạy
một thử nghiệm ở §5, chứ không bằng cách viết thêm code.** Đó là lý do [04-NEGOTIATION.md](04-NEGOTIATION.md) dài hơn
[02-ROADMAP.md](02-ROADMAP.md).

---

Đọc tiếp: [02-ROADMAP.md](02-ROADMAP.md) · [03-COMPETITORS-AND-INTEGRATIONS.md](03-COMPETITORS-AND-INTEGRATIONS.md) ·
[04-NEGOTIATION.md](04-NEGOTIATION.md) · quay lại [00-READ-THIS-FIRST.md](00-READ-THIS-FIRST.md)
