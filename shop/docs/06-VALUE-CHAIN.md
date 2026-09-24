# Chuỗi từ nguyên liệu tới khách quay lại

Tài liệu này trả lời một câu mới: **chị ấy dùng Excel cho mọi thứ từ lúc nhập nguyên liệu tới
lúc bán — có mắt xích nào trong đó đáng can thiệp không?** Nó dàn phẳng toàn bộ chuỗi thành 18
mắt xích, xếp mỗi mắt xích vào một trong bốn loại lời giải, rồi chỉ ra rằng chỗ đáng làm **không
nằm ở mắt xích nào cả** — nó nằm ở chỗ nối giữa chúng, và chỗ nối lớn nhất chính là giá vốn `V`
mà cả bộ tài liệu đang treo vào. §5 sửa một khẳng định sai đã nằm trong
[adr/0004](adr/0004-dont-rebuild-retail-software.md), [05](05-ARCHITECTURE.md) và cả bản đề xuất
mang đi gặp chị ấy. §6 là thứ mang theo tới buổi gặp. Đọc sau
[01](01-CONTEXT-AND-OPPORTUNITY.md) và [03](03-COMPETITORS-AND-INTEGRATIONS.md).
Người đọc: Đạt. Viết 24/09/2026, từ một bản brainstorm của Đạt về sổ mẻ sản xuất — chỗ đúng của
bản ấy được giữ, chỗ sai được sửa ở §8.

---

## 1. Dữ kiện mới, và nó đổi gì

| Dữ kiện | Nguồn | Mức chắc |
|---|---|---|
| Chị ấy dùng Excel cho nhiều việc, từ lúc nhập nguyên liệu tới lúc có sản phẩm tới lúc bán | Đạt, 24/09/2026 | [đoán — phải hỏi chị ấy] — file có những sheet nào, sheet nào còn cập nhật: **chưa ai xem** |

Bốn điều nó đổi:

1. **Câu B6 ở [04](04-NEGOTIATION.md) đã có một nửa câu trả lời.** Nửa còn lại — file có những
   sheet nào, sheet nào còn sống — chỉ biết được khi nhìn. §6 là danh sách nhìn gì.
2. **Bảng năng lực ở [05](05-ARCHITECTURE.md) ghi sai hai dòng.** "Biết còn bao nhiêu hàng" và
   "quản lý nguyên vật liệu" đều ghi *trong đầu chủ shop*; nếu dữ kiện này đúng thì cả hai nằm
   trong Excel. Đã sửa ở 05.
3. **Thói quen ghi chép đã có sẵn.** Mọi hệ thống ghi chép hỏng ở cùng một chỗ: bắt người ta
   ghi. Chị ấy ghi rồi — nghĩa là cái đang có là **dữ liệu**, không phải vấn đề. Không đề xuất
   công cụ nào trước khi đọc nó.
4. **Nó mở một lối vào mà năm dữ kiện kia không mở:** câu A1 ("giá vốn một cây bao nhiêu?")
   không còn phải trả lời bằng trí nhớ. Xem §3–§4.

Một cảnh báo ngay từ đầu: "dùng Excel từ nhập tới bán" có thể là ba sheet nối nhau bằng công
thức, cũng có thể là một sheet đơn hàng cộng một sheet nhập bỏ dở từ tháng 3. Hai trường hợp dẫn
tới hai kết luận khác nhau. **Mọi thứ dưới đây mang điều kiện "nếu file có…".**

---

## 2. Dàn phẳng: 18 mắt xích

Mỗi mắt xích xếp vào đúng một loại lời giải:

| Loại | Nghĩa | Số mắt xích |
|---|---|---|
| **Mua** | Phần mềm bán sẵn hoặc sàn đã làm. Khi đau thì mua, không xây — [adr/0004](adr/0004-dont-rebuild-retail-software.md). **Không** có nghĩa là phải mua ngay: Excel còn chạy được thì cứ để nó chạy | 8 |
| **Giấy** | Một quy ước hoặc một tờ giấy làm tốt hơn phần mềm | 5 |
| **Phân tích** | Dữ liệu đã có (hoặc sẽ có), chỉ thiếu người đọc | 3 |
| **Người** | Tay nghề, gu, thương hiệu — công nghệ không chạm tới | 2 |
| **Phần mềm riêng** | Chỗ mà viết mã là lời giải tốt nhất ở quy mô này | **0** |

Dòng cuối là kết luận quan trọng nhất của mục này. §5 giải thích vì sao nó từ 1 xuống 0.

| # | Mắt xích | Sinh ra số gì | Quyết định gì | Loại | Ghi chú |
|---|---|---|---|---|---|
| | **Nguyên liệu vào** | | | | |
| 1 | Đặt nguyên liệu: sáp, tinh dầu, bấc, ly, nắp, nhãn, hộp, thiệp | ngày, nhà cung cấp, số lượng, **đơn giá**, phí ship | mua gì, bao nhiêu, lúc nào — số lượng tối thiểu đổi lấy tiền mặt | Mua | Nguồn của mọi đơn giá trong giá vốn. Giá nhập cũ nằm lại trong phần tính giá vốn là lỗi hay gặp nhất |
| 2 | Nhận hàng | số thực nhận, **mã lô** trên bao sáp, chai tinh dầu | nhận hay trả | Giấy | Điểm bắt đầu của mọi truy vết. Không ghi lô ở đây thì về sau không truy được gì, sổ sách phía sau kỹ đến đâu cũng vậy |
| 3 | Kho nguyên liệu | tồn từng món | khi nào đặt lại | Mua | Trong Excel, tồn = nhập − dùng, mà "dùng" hay bị trừ tay hoặc quên trừ → lệch dần với kệ thật. Phiếu sản xuất của KiotViet tự trừ và cảnh báo khi thiếu [đã kiểm — §5] |
| | **Làm ra cây nến** | | | | |
| 4 | Công thức và thử mùi mới | công thức từng mùi, % hương, bấc theo cỡ ly, các lần thử | đổi công thức, thêm mùi | Người | Phần mềm chỉ lưu công thức **hiện hành** — không lưu *vì sao* đổi và *đã thử những gì*. Cây đốt thử là chi phí thật không nằm trong định mức nào |
| 5 | Lên lịch đổ | bao nhiêu cây mùi nào, ngày nào | đổ gì tuần này; chuẩn bị mùa cao điểm | Phân tích | Có độ trễ = thời gian ủ + thời gian giao nguyên liệu. Tháng 12 phải quyết từ tháng 10 — chỗ nối J3 |
| 6a | Đổ mẻ — phần định lượng | số cây đổ, nguyên liệu đã dùng | — | Mua | Đúng việc phiếu sản xuất của KiotViet làm [đã kiểm — §5] |
| 6b | Đổ mẻ — phần chất lượng | nhiệt độ lúc pha hương, lúc rót; chuyện bất thường giữa chừng | (tại chỗ) rót được chưa | Giấy | Hai số **đọc tức thời** — mười phút sau không còn ở đâu. Phần mềm chỉ có ô "ghi chú". Tờ giấy ở bàn đổ thắng mọi app — §5 |
| 7 | Nguội và ủ | ngày đổ → ngày bán được | cây nào được bán | Giấy | Phần mềm bán lẻ có *hạn sử dụng* (không bán **sau** ngày X), không có *không bán **trước** ngày X*. Cách rẻ nhất: ghi phiếu sản xuất vào **ngày ủ xong**, cây đang ủ để kệ riêng có ghi ngày — §7 |
| 8 | Kiểm lỗi và đốt thử | số cây lỗi, lỗi gì, ảnh; kết quả đốt thử | bán, huỷ, hay đổi bấc | Giấy | Tỉ lệ lỗi là đầu vào của giá vốn thật. Đốt thử trước hết là chuyện **an toàn**, sau mới là chất lượng — §8 |
| 9 | Hoàn thiện: nhãn, nắp, hộp | bao bì đã dùng | — | Mua | Đưa bao bì vào định mức. Bao bì hay bị quên khi tính giá vốn; hết hộp cũng là một kiểu bán hụt |
| | **Có hàng để bán** | | | | |
| 10 | Kho thành phẩm | tồn từng mùi | nhận đơn hay báo hết | Mua | Ba kênh chung một kệ → một kênh không được trừ là bán quá tồn. Đồng bộ nhiều kênh là lớp commodity ([03](03-COMPETITORS-AND-INTEGRATIONS.md) §1). `shop/` đã gặp đúng lớp lỗi này trong phạm vi một trang: 38 cây trên tồn 20 |
| 11 | Định giá | giá từng mùi, mức giảm hộp quà | giá bao nhiêu, giảm bao nhiêu, đẩy kênh nào | Phân tích | Cần giá vốn thật **và** phí từng kênh. Phí sàn đổi ba lần trong 2025–2026 ([01](01-CONTEXT-AND-OPPORTUNITY.md) §6). Hai mức giảm 8% và 14% đang là số dựng tạm ([TECH-DEBT](TECH-DEBT.md) 9b) |
| | **Bán và giao** | | | | |
| 12 | Nội dung và listing | ảnh, mô tả | — | Người | Mắt xích `shop/` đang đứng. 01–03 đã bàn, tài liệu này không nhắc lại |
| 13 | Nhận đơn | đơn: kênh, mùi, số cây, khách | — | Mua | Sàn lo đơn sàn. **Đơn Instagram chỉ tồn tại trong tin nhắn và trong Excel** — sheet đơn có cột kênh thì câu A4 trả lời được bằng số |
| 14 | Thu tiền và đối soát | tiền về, tiền sàn trả sau khi trừ phí, COD | đơn nào đã trả | Mua | Báo-có tự động ([03](03-COMPETITORS-AND-INTEGRATIONS.md) §4); sàn có báo cáo thanh toán. Đây cũng là chỗ **nhìn thấy phí sàn thật** (A6) |
| 15 | Gói và giao | mã vận đơn, hàng vỡ | gói thế nào — hàng thuỷ tinh | Mua | Vỡ khi giao là chi phí ẩn thứ hai của giá vốn: một cây mới cộng một lần ship |
| | **Sau khi bán** | | | | |
| 16 | Khiếu nại, đổi trả, đánh giá | khách báo gì, về cây nào | đền, đổi; có phải lỗi cả mẻ không | Giấy | Chỗ mắt xích bán gặp lại mắt xích làm. Không có **mã mẻ trên đáy ly** thì không có truy vết, sổ mẻ ghi kỹ đến đâu cũng vậy |
| 17 | Khách quay lại | ai mua gì, khi nào; thời gian cháy | nhắn ai, lúc nào | Phân tích | Đòn bẩy 3 ở [01](01-CONTEXT-AND-OPPORTUNITY.md) §4. Sheet đơn có số điện thoại thì tỉ lệ mua lại **đo được từ số cũ**, không phải chờ thử nghiệm |

**Đọc bảng theo cột Loại.** Tám mắt xích đã có người bán — đúng lớp commodity ở 03 §1. Hai mắt
xích là tay nghề. Năm mắt xích một tờ giấy hay một quy ước làm tốt hơn phần mềm. Không mắt xích
nào mà viết mã là lời giải tốt nhất. Lần phân tích trước nhìn nửa *bán* của chuỗi và thấy hẹp;
nhìn thêm nửa *làm* cũng không đổi được điều đó — **về phía phần mềm**.

Nhưng ba mắt xích loại Phân tích, cộng năm chỗ nối ở §3, là chỗ duy nhất trong cả chuỗi mà người
biết đọc số tạo ra được thứ chị ấy chưa có.

---

## 3. Giá trị nằm ở chỗ nối, không nằm ở mắt xích

Một mắt xích đứng riêng thì hoặc đã có người bán, hoặc là tay nghề. Câu hỏi có tiền đi kèm thì
cần số từ **nhiều** mắt xích cùng lúc — và đó đúng là loại việc Excel làm dở nhất: tra chéo giữa
các sheet bằng tay, chép số từ sheet này sang sheet kia, mà số chép lại thì không tự cập nhật.

| Chỗ nối | Trả lời câu gì | Vì sao Excel và phần mềm bán sẵn đều chưa đủ | File cần có gì |
|---|---|---|---|
| **J1 — Giá vốn thật** · mắt xích 1, 4, 6a, 8, 9, 15 | một cây **bán được** tốn bao nhiêu | Excel: giá nhập cũ nằm lại, không trừ cây lỗi, quên bao bì và cây thử. Phần mềm: giá vốn = tổng giá vốn nguyên liệu trong định mức [đã kiểm — §5], tức là con số của một cây **đạt** | sheet nhập có đơn giá, và số cây làm ra hoặc bán ra |
| **J2 — Lãi theo kênh** · J1, 11, 13, 14 | kênh nào thật sự có lời; hộp quà bán ở đâu thì còn lời | phí sàn không nằm trong file, và đổi ba lần trong hai năm; báo cáo lãi của phần mềm là giá bán trừ giá vốn | J1, cột kênh trong sheet đơn, phí thật của một đơn (A6) |
| **J3 — Mùa → lịch đổ → lịch nhập** · 13, 5, 7, 1 | tháng 12 mỗi mùi cần bao nhiêu cây, đổ từ ngày nào, đặt nguyên liệu ngày nào, cần bao nhiêu tiền mặt | lịch sử bán chưa được gom theo mùi theo tháng; phần mềm báo cáo quá khứ, không lập lịch ngược có độ trễ ủ | sheet đơn có ngày và mùi, qua ít nhất tháng 11–12/2025 |
| **J4 — Truy vết** · 16, 10, 6b, 2 | khách báo "không thơm" → mẻ nào → lô nào → còn bao nhiêu cây cùng lô ở ngoài | quan hệ nhiều–nhiều không nằm vừa một bảng phẳng; phần mềm có quản lý theo lô [đã kiểm], nối lô nguyên liệu với lô thành phẩm thì [chưa kiểm] | mã mẻ trên từng cây — **không làm hồi tố được**, chỉ bắt đầu được từ hôm nay |
| **J5 — Chu kỳ mua lại** · 13, 17, 4 | khách hết nến sau bao lâu; bao nhiêu người quay lại | nhận ra "cùng một khách" qua nhiều dòng khi tên gõ mỗi lần một kiểu; phần mềm có danh sách khách, không phân tích theo nhóm | sheet đơn có số điện thoại — chị ấy **tự lọc trùng**, không ai cần xem danh sách |

### Vì sao J1 đứng đầu

- `V` là biến quan trọng nhất cả bộ tài liệu ([01](01-CONTEXT-AND-OPPORTUNITY.md) §1), và là luật
  số 4 của lộ trình: **chưa có gì được xây khi chưa biết `V`** ([02](02-ROADMAP.md)).
- Nó quyết định dấu của đòn bẩy AOV — ở `V` = 200.000₫, bán hộp quà qua sàn **âm** (01 §4) —,
  hai mức giảm của hộp quà (TECH-DEBT 9b), và việc cấu trúc (c) ở [04](04-NEGOTIATION.md) §5 có
  tàn nhẫn với chị ấy hay không.
- Nó đứng trước cả J2 lẫn J3: lãi theo kênh là giá bán trừ `V` trừ phí; còn làm dư hay làm thiếu
  cho tháng 12 thì cả hai phía chi phí đều tính bằng `V` (§7).
- Và câu A1 hiện đang hỏi **trí nhớ**. Trí nhớ của người làm thủ công nhiều khả năng sẽ trả lời
  bằng tổng nguyên liệu của *một cây đạt* — chưa trừ cây lỗi, chưa tính cây thử, có khi chưa tính
  hộp. Nếu file có sheet nhập, câu này trả lời được **bằng số đã ghi**, và trả lời được hai lần,
  bằng hai cách khác nhau.

---

## 4. Giá vốn tính hai cách — và chỗ chênh chính là câu trả lời

**Cách 1 — từ công thức, từ dưới lên.** Cộng lượng từng thứ trong công thức một cây, nhân đơn giá:

> `V₁` = Σ (lượng trong công thức × đơn giá nhập)

Đây là con số chị ấy sẽ nói nếu được hỏi, và cũng là con số phần mềm in ra (§5).

**Cách 2 — từ tiền đã chi, từ trên xuống.** Lấy toàn bộ tiền nguyên liệu và bao bì trong một kỳ,
chia cho số cây **bán được** làm ra trong kỳ ấy:

> `V₂` = (tiền nhập trong kỳ + tồn đầu kỳ − tồn cuối kỳ) ÷ số cây bán được làm ra trong kỳ

**Chỗ chênh:** `g` = `V₂` ÷ `V₁` − 1.

`V₂` tự động gồm những thứ `V₁` bỏ sót, vì tiền đã chi thì không quên được: cây lỗi, cây đốt thử,
cây tặng hay gửi người review, sáp và tinh dầu hao khi rót, cây vỡ phải gửi lại. **`g` là số đo
của tất cả những thứ không ai ghi.** Nó không nói lỗ nằm ở đâu — nhưng nó nói có đáng đi tìm hay
không, và đó là câu phải trả lời trước.

### Vì sao chỗ chênh nhỏ trên giấy mà lớn trên tiền

Cây không bán được không cộng thêm theo đường thẳng: nếu một phần `L` số cây làm ra không bán
được thì giá vốn thật là `V₁` ÷ (1 − `L`).

Minh hoạ — **mọi con số đầu vào đều bịa để thấy độ nhạy**, không phải ước lượng: `V₁` = 150.000₫
(mức thấp nhất đã dùng ở [01](01-CONTEXT-AND-OPPORTUNITY.md) §4), 210 cây bán mỗi tháng
[đoán — 01 §2].

| `L` — phần cây làm ra không bán được | Giá vốn thật | Chênh mỗi cây | Chênh mỗi tháng, 210 cây |
|---|---|---|---|
| 5% | 157.895₫ | 7.895₫ | ≈ 1,66 triệu₫ |
| 10% | 166.667₫ | 16.667₫ | 3,5 triệu₫ |
| 20% | 187.500₫ | 37.500₫ | ≈ 7,9 triệu₫ |

Dòng giữa: 3,5 triệu₫ mỗi tháng trên doanh thu 63 triệu₫ [đoán — 01 §2] là **5,6% doanh thu** —
cỡ phí xử lý giao dịch 6% của Shopee, chỉ khác là nó không hiện ra trên màn hình nào.

### Ngưỡng — chọn TRƯỚC khi tính

Luật 3 của lộ trình: ngưỡng chọn sau là tự lừa mình. Ba mức dưới đây là **số thoả thuận, không
phải chuẩn ngành** — chốt bằng miệng trước khi mở file:

| `g` | Nghĩa là | Làm gì |
|---|---|---|
| dưới 5% | hao hụt không phải chuyện đáng lo | thêm đúng một cột "số cây lỗi" vào dòng sản xuất, rồi thôi. **Không** làm sổ mẻ phần chất lượng |
| 5–15% | có lỗ, chưa biết ở đâu | thêm cột "lỗi gì" trong hai tháng, xem lỗi dồn vào mùi nào, tháng nào, lô nào |
| từ 15% | lỗ đủ lớn để truy tới cùng | tờ giấy ba ô ở bàn đổ (§5) có lý do tồn tại |

**Chênh âm** cũng là thông tin, chỉ là về chuyện khác: có khoản nhập **không được ghi** — mua bằng
tiền túi, mua lẻ ngoài chợ — tức là file chưa đủ để tin cho các phép tính còn lại.

### Bốn chỗ phép tính này dễ sai

1. **Tồn đầu và cuối kỳ.** Không đếm kho thì chọn kỳ đủ dài — ba tháng trở lên — để lượng tồn nhỏ
   so với dòng nhập, và ghi rõ sai số. Đếm một lần ở cuối kỳ thì tốt hơn nhiều.
2. **Giá lên xuống.** Tính `V₁` bằng giá nhập **trung bình của chính kỳ ấy**, để chỗ chênh không lẫn
   với chuyện giá. Rồi tính lại bằng giá mới nhất để biết giá vốn *hôm nay*.
3. **Nguyên liệu dùng chung.** Sáp, bấc, ly dùng cho mọi mùi, nên `V₂` là **trung bình cả shop**;
   tách theo mùi chỉ tách được phần tinh dầu.
4. **Chưa có công và phí kênh.** `V` ở đây là nguyên liệu cộng bao bì. Công của chị ấy (A2) và phí
   từng kênh cộng ở J2, không trộn vào đây.

File không ghi số cây đổ theo mẻ thì mẫu số lấy bằng số cây bán trong kỳ cộng chênh tồn thành phẩm.

---

## 5. Sổ mẻ: nửa đã có người bán, nửa còn trống

### Một khẳng định sai, sửa ngày 24/09/2026

Ba chỗ trong bộ tài liệu — [adr/0004](adr/0004-dont-rebuild-retail-software.md), bảng năng lực ở
[05](05-ARCHITECTURE.md), và **mục "Nguyên vật liệu và mẻ sản xuất" của bản đề xuất mang đi gặp
chị ấy** (`../pitch/`) — cùng nói một câu: nguyên vật liệu và mẻ sản xuất là chỗ phần mềm riêng
thắng phần mềm bán sẵn, vì *"không phần mềm bán lẻ đại trà nào biết công thức của shop"*. Bản
brainstorm về sổ mẻ nói cùng ý: *"phần mềm bán hàng thương mại (300–500k/tháng) không làm sổ mẻ
sản xuất"*.

**Câu ấy sai.** KiotViet có tính năng *Hàng sản xuất*, trong đúng tầm giá đó
[đã kiểm: hướng dẫn sử dụng KiotViet, mục Hàng sản xuất, đọc 24/09/2026]:

- khai *"hàng thành phần"* — nguyên vật liệu và số lượng cho một thành phẩm, tức là công thức;
- *"Khi hoàn thành sản xuất, KiotViet sẽ tự động trừ tồn kho nguyên vật liệu và cộng tồn kho thành
  phẩm"*;
- *"Giá vốn của thành phẩm được hệ thống tự động tính toán dựa trên tổng giá vốn của các nguyên vật
  liệu"*;
- *"tự động tính và cảnh báo nếu không đủ nguyên vật liệu"*;
- phiếu sản xuất sửa được ghi chú và thời gian.

Cộng thêm tính năng *Lô – hạn sử dụng*: tồn kho và giá vốn theo từng lô, gợi ý xuất lô gần hết
hạn trước [đã kiểm: hướng dẫn sử dụng KiotViet, mục Lô – hạn sử dụng, đọc 24/09/2026]. Ba thứ
**chưa kiểm**: lô có áp cho hàng sản xuất không; có nối lô nguyên liệu với lô thành phẩm không;
và gói giá nào có hai tính năng trên.

Đây đúng là lớp lỗi [00](00-READ-THIS-FIRST.md) cảnh báo: một câu nói bằng giọng chắc chắn về một
thứ tra được trong mười phút. Nó nặng hơn bình thường vì hai lẽ: nó nằm trong bản đề xuất **chị
ấy sẽ đọc**, và người nói câu ấy **làm ở chính công ty bán phần mềm đó**
([04](04-NEGOTIATION.md) §0b).

### Vậy sổ mẻ còn trống phần nào

| Nửa | Gồm | Ai lo |
|---|---|---|
| **Định lượng** | công thức; mỗi mẻ trừ bao nhiêu nguyên liệu; còn đủ cho mấy mẻ; giá vốn theo công thức | **Mua** — phiếu sản xuất làm đúng việc này |
| **Chất lượng** | nhiệt độ lúc pha hương, lúc rót; chuyện bất thường giữa chừng; số cây lỗi và lỗi gì; ngày ủ xong; kết quả đốt thử; mẻ nào dùng lô tinh dầu nào | **Giấy** — phần mềm chỉ có một ô ghi chú |

Hệ quả: chỗ ngoại lệ duy nhất mà ADR 0004 dành cho phần mềm riêng co lại còn **nửa chất lượng** —
và ở 5–10 đơn/ngày, nửa đó là một tờ giấy cộng vài cột trong sheet, không phải một phần mềm. Đó
là lý do cột "Phần mềm riêng" ở §2 bằng 0.

Một việc phần mềm bán sẵn **không** làm thay được §4: giá vốn nó in ra là `V₁`. Cây hỏng, cây thử
không làm con số ấy đổi — chúng thành một khoản ghi giảm riêng nếu có người ghi, hoặc thành độ
lệch tồn kho nếu không. **Mua phần mềm làm `V₁` tự động; nó không làm `g` hiện ra.**

### Nửa chất lượng ghi gì — lấy từ bản brainstorm, gắn nhãn

Mọi con số trong bảng dưới đến từ tài liệu của nhà cung cấp nguyên liệu Mỹ, cho sáp đậu nành
[chưa kiểm — đồng thuận của người trong nghề, không phải nghiên cứu có đối chứng, và họ đang bán
hàng]. Dùng để biết **hỏi gì**, không dùng để bảo chị ấy phải làm gì.

| Bước | Số hay được nói | Lệch thì bị gì |
|---|---|---|
| Pha hương | khoảng 85°C; hương 6–10% khối lượng sáp | hương không kết dính: rỉ dầu, mùi yếu |
| Rót | khoảng 57°C | mặt rỗ, mặt đục, lõm quanh bấc |
| Nguội | 24 giờ ở 21–24°C, không gió lùa | nứt, mảng ướt dọc thành ly |
| Ủ | 1–2 tuần | mùi không toả — khách tưởng hàng dở |
| Đốt thử | vũng sáp chảy phủ kín mặt sau 2–3 giờ | sai cỡ bấc: đào hầm hoặc ra muội |

Chỉ hai dòng đầu là **số đọc tức thời**: nhiệt kế chỉ con số ấy đúng một lúc, mười phút sau nó
không còn ở đâu. Cộng thêm "có gì lạ không" thì ra ba ô — và đó là toàn bộ tờ giấy ở bàn đổ, khi
§4 cho thấy đáng làm. Phần còn lại (lô sáp, lô hương, loại bấc, loại ly, số cây) ghi sau khi dọn
xong cũng được.

Luận điểm mạnh nhất của bản brainstorm nằm ở đây và giữ nguyên: mẻ suôn sẻ thì ghi rất nhanh; mẻ
**có chuyện** thì kéo dài, mệt, và đúng hôm đó người ta bỏ qua sổ. Sau sáu tháng, dữ liệu thiếu
**lệch hẳn về phía mẻ hỏng** — thiếu không ngẫu nhiên — và tập dữ liệu trông sạch hơn thực tế, vô
dụng đúng cho việc cần nó nhất. Vì thế tờ giấy phải nằm **ở bàn đổ, đúng lúc nhiệt kế đang chỉ
số**. Phần mềm không giải quyết được bước đó.

---

## 6. Nhìn file Excel: tám thứ, trước khi đề xuất bất cứ gì

Cách xin, đúng khuôn nhóm E ở [04](04-NEGOTIATION.md): **cùng xem trên máy của chị ấy, không xin
file.** File này có thể chứa tên, số điện thoại, địa chỉ của mọi khách — dữ liệu cá nhân của người
thứ ba, cùng lý do với [TECH-DEBT](TECH-DEBT.md) mục 6 — và phép tính ở §4 không cần một dòng nào
trong số đó. Nếu sau đó cần mang về tính, xin **bản đã xoá cột thông tin khách**: sheet nhập,
sheet sản xuất, và số cây bán theo mùi theo tháng là đủ.

| # | Nhìn gì | Nó cho biết gì |
|---|---|---|
| 1 | Có mấy sheet, mỗi sheet ứng với mắt xích nào ở §2 | mắt xích **không** có sheet nào là đang nằm trong đầu chị ấy |
| 2 | Dòng cuối của mỗi sheet ghi ngày nào | sheet ngừng cập nhật thì hoặc hết đau, hoặc đau đến mức bỏ — hỏi là cái nào |
| 3 | Số giữa các sheet nối bằng công thức hay gõ lại | chỗ gõ lại là chỗ lệch |
| 4 | Đơn giá trong phần tính giá vốn là giá lần nhập nào | so với dòng nhập mới nhất: giá vốn đang cũ bao lâu |
| 5 | Có cột cây lỗi, cây hỏng không | không có thì giá vốn đang giả định mọi cây đều đạt |
| 6 | Tên mùi có viết thống nhất không | "Quế", "quế", "Cinnamon" là ba mùi với máy — mọi phép gom theo mùi phải dọn trước |
| 7 | Tồn trong file so với kệ thật — đếm **một** món | lệch bao nhiêu; lệch lớn thì mọi số tồn trong file phải đọc kèm dấu hỏi |
| 8 | Sheet đơn có cột kênh không, có số điện thoại không | có cột kênh thì **A4 trả lời bằng số**; có số điện thoại thì tỉ lệ mua lại (J5) đo được ngay |

Và một câu không cần nhìn: **có ai sửa file này ngoài chị không** (D4). Có người thứ hai là lúc
Excel bắt đầu đẻ ra bản `_final_v2`, và là một trong hai điều kiện mở việc số 7 ở §7.

**Câu mở**, lấy từ bản brainstorm và giữ nguyên tinh thần: đừng mở bằng *"em số hoá sổ sách cho
chị"* — với người làm thủ công, cuốn sổ là nghề của họ. Hỏi về cái file như hỏi về một thứ chị ấy
đã làm được: *"file này chị tự dựng à? Sheet nào chị mở nhiều nhất?"* Và **đừng sửa gì trong file
tại chỗ**, kể cả một công thức thấy rõ là sai — ghi lại, nói sau.

---

## 7. Việc đáng làm, xếp theo thứ tự

Cùng khuôn với [02](02-ROADMAP.md): mỗi việc có điều kiện mở là một sự kiện, không phải một ngày.

| # | Việc | Mở khi | Tốn gì | Trả lời được gì | Dừng khi |
|---|---|---|---|---|---|
| 1 | **Giá vốn hai cách** (§4) | được xem file, và file có sheet nhập | một–hai buổi tối của anh; chị ấy không phải đổi gì | A1 bằng số thay vì trí nhớ; `V` cho 01 §4 và TECH-DEBT 9b; có cần sổ mẻ phần chất lượng không | file không có sheet nhập → quay về hỏi A1 bằng lời như cũ |
| 2 | **Lãi theo kênh** (J2) | xong #1, và đã cùng xem một đơn thật trong Seller Centre (A6) | một buổi | kênh nào đang nuôi shop; hộp quà bán ở đâu thì còn lời | sheet đơn không có cột kênh |
| 3 | **Lịch ngược tháng 12** (J3) | file có đơn qua tháng 11–12/2025, **và** năm ngoái từng hết mùi giữa mùa (A10) | một buổi | mỗi mùi cần bao nhiêu cây, đổ từ ngày nào, đặt nguyên liệu ngày nào, cần bao nhiêu tiền mặt | năm ngoái không hết mùi nào — chị ấy đã biết cách lo mùa của mình |
| 4 | **Mã mẻ trên đáy ly** | ngay, không cần điều kiện | một con dấu ngày | chưa gì cả, cho tới ngày có khiếu nại; hôm ấy nó là cách duy nhất để truy | — |
| 5 | **Tờ giấy ba ô ở bàn đổ** (§5) | #1 cho `g` từ 15%; hoặc có một mẻ hỏng cả mẻ; hoặc thuê người phụ đổ nến | vài phút nhập mỗi tuần | lỗi đi theo cái gì: nhiệt độ, mùi, lô, mùa | hai tháng mà lỗi không đi theo biến nào ghi được |
| 6 | **Quy ước ủ**: ghi phiếu sản xuất vào ngày ủ xong, cây đang ủ để kệ riêng có ghi ngày | chị ấy có ủ, và đã từng bán cây chưa ủ đủ (B7) | 0₫ | chặn một lỗi rơi thẳng vào đánh giá của khách | chị ấy không ủ, hoặc chưa từng xảy ra |
| 7 | **Mua phần mềm cho nửa định lượng** | tồn trong file lệch kệ thật tới mức bán hụt một lần; hoặc có người thứ hai sửa file | 250.000–450.000₫/tháng cho shop cỡ này [đã kiểm — 03 §1] | tồn nguyên liệu tự trừ, cảnh báo thiếu, `V₁` tự tính | — và **nói rõ anh làm ở đâu** trước khi khuyên ([04](04-NEGOTIATION.md) §0b) |
| 8 | Data logger nhiệt độ, app đốt thử, phần mềm truy vết | **không mở ở quy mô này** | | | |

Dòng 8, mỗi cái chờ một sự kiện riêng: logger chờ #5 cho thấy lỗi bám theo nhiệt độ; app đốt thử
chờ một quy trình thử **đang chạy bằng giấy** mà vướng đúng ở chỗ hẹn giờ và chụp ảnh; phần mềm
truy vết chờ một lô nguyên liệu lỗi thật.

### Lịch ngược tháng 12, và vì sao nó gấp

Hôm nay là 24/09/2026. Minh hoạ với ba giả định, **cả ba đều phải hỏi chị ấy**: ủ 14 ngày [bản
brainstorm nói 1–2 tuần — chưa kiểm], số cây cần cho mùa đổ trải trong 3 tuần [đoán], nhà cung cấp
giao nguyên liệu trong 7 ngày [đoán].

| Mốc | Ngày | Vì sao |
|---|---|---|
| Đủ hàng để bán cho mùa quà cuối năm | 01/12 | |
| Mẻ cuối phải đổ | 17/11 | 01/12 trừ 14 ngày ủ |
| Mẻ đầu phải đổ, nguyên liệu phải về | 27/10 | trải 3 tuần trước mẻ cuối |
| **Đặt nguyên liệu** | **20/10** | trừ 7 ngày giao |

Nghĩa là với ba giả định ấy, **cửa sổ đặt nguyên liệu cho tháng 12 đóng vào khoảng 20/10 — chưa
tới bốn tuần nữa.** Và nó trùng đúng mốc "nội dung phải xong cuối tháng 10" của storefront ở
[01](01-CONTEXT-AND-OPPORTUNITY.md) §9: hai đường găng gặp nhau trong cùng một tháng, và cả hai đều
nằm trên thời gian của chị ấy. Nếu buổi gặp chỉ đủ cho một thứ giúp được chị ấy **ngay mùa
này**, thì lịch ngược tháng 12 giúp được nhiều hơn một trang bán hàng mở vào đúng tháng bận nhất —
với điều kiện ở dòng #3.

Hai phía chi phí — chỗ công thức newsvendor của bản brainstorm có ích thật, không phải để ra một
con số mà để thấy hai phía lệch nhau thế nào:

- **Thiếu một cây trong tháng 12** mất phần lời của cây ấy — giá bán trừ `V` trừ phí kênh — cộng
  khả năng mất luôn người khách.
- **Thừa một cây sau tháng 12** mất ít hơn nhiều: nến không hết hạn như thực phẩm, thừa thì bán
  tiếp sang đầu năm. Cái mất là tiền vốn nằm trên kệ vài tháng, cộng phần hương nhạt đi
  [chưa kiểm — hỏi chị ấy nến để bao lâu thì yếu mùi].

Thiếu đắt hơn thừa, nên lời giải nghiêng về **làm dư** — và trần thật của việc làm dư không phải
công thức, mà là **tiền mặt ứng trước** cùng **chỗ để ủ**. Cả hai phía đều tính bằng `V`, nên việc
này đứng sau #1.

Một cảnh báo về cỡ mẫu: mỗi mùi chỉ có **một** tháng 12 để nhìn — quá ít để dự báo riêng từng mùi.
Dự báo **tổng** trước (tỉ lệ tháng 12 so với tháng 11 của chính shop, đối chiếu với +37,23% của
ngành [đã kiểm: metric.vn]), rồi chia theo tỉ phần của từng mùi trong 3–6 tháng gần nhất — chỗ có
nhiều dữ liệu hơn.

### Khi nào nửa làm hàng mới thật sự lớn

Bốn sự kiện đổi thứ tự bảng trên. Mỗi cái đáng hỏi ở buổi gặp:

1. **Thuê người phụ đổ nến.** Tay nghề không truyền được bằng miệng; công thức và sổ mẻ từ "nên
   có" thành bắt buộc (D4).
2. **Đơn quà doanh nghiệp** — vài chục tới vài trăm cây một lần [đoán], dồn cuối năm
   ([01](01-CONTEXT-AND-OPPORTUNITY.md) §9 nêu quà cuối năm cho công ty như một khả năng). Lúc ấy cần
   lịch sản xuất, các mẻ phải đều nhau, và có thể cần hoá đơn.
3. **Một lô nguyên liệu lỗi** làm hỏng cả loạt. Truy vết (J4) đáng giá đúng ngày ấy — và chỉ khi mã
   mẻ đã được đóng từ trước (#4).
4. **Chị ấy muốn to (D1) và năng lực sản xuất là trần (B4).** Đó là bài toán xưởng — nồi to hơn,
   thêm khuôn, thêm người — không phải bài toán phần mềm.

---

## 8. Đọc lại bản brainstorm: chỗ đúng, chỗ phải sửa

**Đúng, và đã giữ:**

- Góc nhìn: shop này **làm** hàng chứ không chỉ bán hàng, và phần trước lúc rót là chỗ chưa ai
  chạm tới. Đó cũng là chỗ ngoại lệ ADR 0004 từng chỉ ra.
- Ba số đọc tức thời, và lập luận dữ liệu thiếu **không ngẫu nhiên** — lập luận mạnh nhất của cả
  bản. Từ đó: giấy ở bàn đổ thắng phần mềm.
- Giá vốn chia cho số cây **đạt**, không phải số cây đổ.
- Ba trạng thái tồn kho: đang ủ, bán được, đã bán.
- Toàn bộ mục cảnh báo cuối: số liệu là của nhà cung cấp Mỹ, cho sáp đậu nành; đừng phán "phải
  pha ở 85°C"; đừng mở lời bằng "số hoá sổ tay".

**Phải sửa:**

| # | Bản brainstorm nói | Sửa thành | Vì sao |
|---|---|---|---|
| 1 | "Phần mềm bán hàng 300–500k không làm sổ mẻ sản xuất" | Làm **nửa định lượng**; chỉ nửa chất lượng còn trống | §5 [đã kiểm: hướng dẫn KiotViet] |
| 2 | Mẻ 4–6 cây, "khoảng 4 tờ/tuần" | Không khớp số đơn: 4 mẻ × 4–6 cây = 16–24 cây/tuần ≈ 70–100 cây/tháng, trong khi 5–10 đơn/ngày × 1 cây ≈ 150–300 cây/tháng [đoán — 01 §2]. Hoặc mẻ lớn hơn nhiều, hoặc số mẻ gấp 2–4 lần | Cả gánh ghi chép lẫn giờ làm phụ thuộc con số này: 25–75 mẻ/tháng × 30–45 phút ≈ 12–56 giờ/tháng chỉ riêng đổ nến. Đó đúng là câu B4 — hỏi, đừng suy |
| 3 | Đốt thử theo ASTM F2417, như một giao thức chất lượng | ASTM F2417 là tiêu chuẩn **an toàn cháy** cho nến — giới hạn chiều cao ngọn lửa, độ nguyên vẹn của vật chứa, độ vững, bắt lửa thứ cấp [đã kiểm: tên và phạm vi, trang ASTM]; không phải giao thức đo độ toả hương. "Mốc giờ 2 và giờ 4, đo 6 biến" [chưa kiểm — văn bản tiêu chuẩn mất phí] | Lý do thứ nhất để đốt thử là **an toàn** — ngọn lửa quá cao, ly thuỷ tinh nứt ở cuối đời cây nến là rủi ro cho khách — rồi mới tới chất lượng |
| 4 | "Nhiệt độ phòng là biến ẩn; chênh lệch mùa lớn" | Đúng hơn ở nơi có mùa đông lạnh. Phòng không điều hoà ở Việt Nam nóng hơn khoảng 21–24°C kia [chưa kiểm] phần lớn thời gian trong năm — biến đáng nghi là **điều hoà bật hay tắt**, và độ ẩm mùa mưa | Shop ở đâu chưa ai xác nhận. Hỏi: chị làm nến ở phòng có điều hoà không |
| 5 | Xếp hạng: sổ mẻ giấy và đốt thử đứng đầu | Đo lỗ trước (§4), rồi mới quyết có cần sổ mẻ phần chất lượng | Sổ mẻ là một giả thuyết — "hao hụt lớn và không chẩn đoán được". Chỗ chênh giá vốn là phép thử rẻ của giả thuyết ấy, dùng dữ liệu **đã có**, không cần một thói quen mới. Đúng luật 5 của [02](02-ROADMAP.md): thử cái rẻ trước |
| 6 | "Invariant: không cho bán cây có ngày ủ xong > hôm nay" | Đúng là một bất biến, nhưng thi hành bằng **kệ riêng và ngày ghi phiếu**, không bằng phần mềm | Một ràng buộc vật lý không cần ai nhớ mở máy lúc gói hàng |

---

## 9. Kết luận trung thực: giá trị lớn đến đâu

- **Về phần mềm: cảm giác "hẹp" là đúng — và sau tài liệu này còn hẹp hơn.** Chỗ ngoại lệ duy nhất
  mà bộ tài liệu dành cho phần mềm riêng hoá ra đã có người bán, trong đúng tầm giá chị ấy trả
  được. 18 mắt xích, 0 chỗ mà viết mã là lời giải tốt nhất.
- **Về phân tích: có một việc có giá trị thật, rẻ, làm được ngay khi thấy file.** Giá vốn hai cách
  → lãi theo kênh → lịch tháng 12. Ba việc ấy chạm vào những quyết định có tiền thật đi kèm — giá,
  mức giảm hộp quà, kênh nào đáng đẩy, nhập bao nhiêu cho mùa cao điểm — và chúng dùng **số của chị
  ấy**, đúng thứ [01](01-CONTEXT-AND-OPPORTUNITY.md) §6 nói là thuyết phục hơn mọi con số mang tới.
- **Nhưng nó không phải một sản phẩm, và gần như không phải một nguồn tiền.** Nó là vài buổi tối
  một lần, rồi mỗi quý nhìn lại. Đặt cạnh câu hỏi ở [04](04-NEGOTIATION.md) §0b — *Đạt muốn gì từ
  việc này*: nếu là tiền, đây không phải chỗ. Nếu là học, một mối quan hệ làm ăn, hay một bài toán
  dữ liệu thật trên số thật, thì đây là **cửa vào tốt hơn storefront**: nó trả lời một câu chị ấy
  thật sự chưa biết, trước khi xin chị ấy đổi bất cứ thói quen nào.
- **Và mọi thứ ở trên treo vào một điều chưa ai thấy: trong file có gì.** Nếu nó chỉ là một sheet
  đơn hàng, J1 và J2 quay về hỏi bằng lời; J3, J5 và A4 vẫn làm được nếu sheet có ngày, mùi, số
  điện thoại, cột kênh. Nhìn file trước — §6.

---

Đọc tiếp: [04-NEGOTIATION.md](04-NEGOTIATION.md) · [02-ROADMAP.md](02-ROADMAP.md) ·
[adr/0004](adr/0004-dont-rebuild-retail-software.md) · quay lại [00-READ-THIS-FIRST.md](00-READ-THIS-FIRST.md)
