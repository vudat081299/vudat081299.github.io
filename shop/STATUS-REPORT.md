# scentsitive.vn — báo cáo hiện trạng

**Ngày:** 21/09/2026 · **Thư mục:** `shop/` · **Cổng:** `sh shop/tools/check.sh`

> **Xưng hô:** file này viết ở ngôi "tôi → chủ shop", nhưng **chủ shop chưa đọc nó và chưa
> đồng ý gì cả** — chưa ai gặp ai. Nó là bản kiểm kê nội bộ, không phải báo cáo tiến độ
> cho một việc đã được đặt. Bản trước xưng "chủ shop" và viết "link Instagram chủ shop gửi", đọc lên
> như thể đã có một quan hệ làm việc đang chạy.

Trang chạy được ngay bây giờ, nhưng **chưa bán được thật**. Lý do nằm ở mục
[Đang chờ nội dung từ chủ shop](#4-đang-chờ-nội-dung-từ-chủ-shop) — chủ yếu là nội dung 5 mùi hương và thông tin
thanh toán. Mọi chỗ chưa có đều là placeholder có đánh dấu, không phải chỗ bỏ trống im lặng.

Chạy thử:

```bash
python3 -m http.server 8000
```

rồi mở `http://localhost:8000/shop/`.

---

## 1. Đã có gì

| Trang | File | Trạng thái |
|---|---|---|
| Landing | `shop/index.html` | Xong. Hero có nến cháy, 5 ô mùi dẫn thẳng sang trang mùi hương, nút "Giỏ hàng", khối giá trị, hỏi đáp. |
| Xem hàng theo mùi | `shop/products.html` | Xong. Mỗi mùi một section chiếm màn hình, có thanh mùi dính bên trái, màu cả trang đổi theo mùi đang đọc. |
| Tìm mùi | `shop/scent-finder.html` | Xong. Năm câu hỏi → một mùi kèm tỉ lệ khớp và lý do. Chấm bằng trọng số trong data; cổng duyệt cả 320 tổ hợp. |
| Hộp quà | `shop/gift.html` | Xong. Chọn cỡ hộp, mùi từng ngăn, thiệp, cách gói — hộp vẽ lại ngay và giá hiện đủ từ bước một. |
| Thanh toán | `shop/checkout.html` | Khung xong. Đơn hàng, form nhận hàng, 3 cách thanh toán — nhưng **chỉ 1 trong 3 cách chạy thật** (xem §3). |
| Giỏ hàng | ngăn kéo ở cả 5 trang | Xong. Lưu ở `localStorage` (rơi xuống `sessionStorage` nếu bị chặn), dùng chung giữa 5 trang. |
| Bản đề xuất | `shop/pitch/index.html` | Xong. Trang mang đi gặp chủ shop — không phải trang cửa hàng. |
| Xem phễu | `shop/measure/index.html` | Xong. Trang nội bộ, đọc sự kiện đã ghi trong máy. |

Cấu trúc file:

```
shop/
  index.html          landing
  products.html       5 mùi hương
  checkout.html       giỏ + thanh toán
  assets/shop.css     hệ thiết kế dùng chung (một file cho cả 3 trang)
  assets/shop.js      giỏ hàng, nạp dữ liệu, vẽ sản phẩm — dùng chung
  data/shop.json      TOÀN BỘ nội dung. Sửa nội dung thì sửa file này.
  tools/lint-shop.py  cổng chất lượng
  tools/hooks/pre-commit
```

**Nội dung nằm ở `data/shop.json`, không nằm trong HTML.** Thêm một mùi hương = thêm một mục
vào `scents` rồi thêm một sản phẩm trỏ vào nó. Không phải sửa dòng code nào — thanh mùi, màu
trang, section mới, và ô ở trang chủ tự mọc theo.

### Về phần nhìn và chuyển động

- **Ngọn nến cháy thật** ở hero: ba lớp lửa chu kỳ 2,3s / 1,7s / 3,1s. Ba số không chia hết cho
  nhau nên mắt không bao giờ bắt được điểm lặp. Kèm khói, quầng sáng thở, bụi sáng bay lên, và
  một vệt sáng ấm đuổi theo con trỏ.
- **Mỗi mùi một bộ màu.** Trang mùi hương đổi màu *toàn trang* khi chủ shop cuộn sang mùi khác —
  không phải đổi một cái nhãn, mà là nền, quầng sáng và số thứ tự cùng chuyển dần. Làm được là
  nhờ khai biến màu bằng `@property`; trình duyệt cũ không hỗ trợ thì màu vẫn đúng, chỉ đổi tức thì.
- **Chưa có ảnh chụp** nên mỗi sản phẩm tự vẽ bằng SVG từ ba màu của mùi. Đổi lại: cả cửa hàng
  trông như một bộ và không bao giờ có ô ảnh vỡ. Khi có ảnh thật thì thay đúng hàm `artHTML` trong
  `assets/shop.js`.
- Sáng/tối đều dựng đủ, lần đầu vào theo cài đặt hệ thống. Có `prefers-reduced-motion`: ai tắt
  chuyển động thì tắt sạch animation, nội dung vẫn còn nguyên.

---

## 2. Bug đã tìm ra và đã sửa

Ba lỗi đầu tìm bằng cách chạy thật rồi đo, không phải bằng đọc code.

| # | Lỗi | Bằng chứng | Đã sửa thế nào |
|---|---|---|---|
| 1 | Bấm "thêm vào giỏ" khi đã hết tồn kho vẫn báo thành công | Bấm 9 lần vào món còn 6 → giỏ dừng ở 6 nhưng toast báo "Đã thêm" cả 9 lần | Tính số **thực sự** thêm được; hết hàng thì nói "tạm hết", chạm trần thì nói "chỉ còn N cái". Đo lại: 30 lần bấm vào món tồn 20 → toast nói "Chỉ còn 20 cái". |
| 2 | Dòng số lượng 0 vẫn hiện thành một món trong giỏ | Giỏ có `{q:0}` → giỏ vẽ 2 dòng nhưng tổng tiền chỉ tính 1 | Lọc `q > 0` ngay khi nạp và ở mọi lần vẽ, đồng thời ghi lại localStorage cho sạch. Đo lại: 1 dòng, tổng 225.000 ₫ đúng. |
| 3 | Ngăn kéo giỏ hàng mất toàn bộ kiểu, nằm chình ình cuối trang | `getComputedStyle(drawer).visibility === "visible"` khi chưa mở | Quy tắc `.drawer { }` bị một lần dọn CSS bằng regex nuốt mất trong khi `.drawer.is-open` còn lại. Khôi phục. |
| 4 | Lưới "Về chúng tôi" không có kiểu | Cổng CSS mới báo thiếu `.vals`/`.val` | Cùng nguyên nhân với #3 — khôi phục. |
| 5 | Thanh điều hướng chữ trắng trên nền giấy ở 2 trang mới | Ảnh chụp trang thanh toán: nav gần như vô hình | Nav mặc định chữ mực; chỉ trang chủ — nơi nav đè lên hero tối — mới thêm `.nav--over`. |
| 6 | Nhãn trên ly nến của cả 5 sản phẩm đều là chữ "N" | 5 sản phẩm đều tên "Nến thơm 0x" | Nhãn lấy **số thứ tự mùi** (01–05) thay vì chữ cái đầu của tên. |
| 7 | Nút giỏ hàng bị xếp hai hàng, ba nút cùng lớp thì đẹp | `#cartBtn` 2 con → 50×38 nhồi hai hàng; `#themeBtn`/`#burger`/`#cartClose` 1 con → 38×38 đẹp | `.iconbtn` viết bằng `display:grid; place-items:center` — grid mặc định xếp theo HÀNG nên chỉ đúng với một con. Chuyển sang `inline-flex`. Đo lại: hai con cùng hàng, nút giãn 50→74px, badge hai chữ số vẫn một hàng ở 77px. |
| 8 | Dải cảnh báo đè lên thanh nav khi chưa cuộn | Dải 0–56px (hai dòng ở màn 1000px), nav `fixed` 0–79px | Dải cuộn đi như thông báo thường; JS **đo** chiều cao thật của nó rồi hạ `--nav-top`, trừ dần theo `scrollY` để nav trượt lên. Chiều cao dải đổi theo bề rộng màn nên không có số nào hardcode được. |

Lỗi #3 và #4 là cùng một lớp lỗi và nó **im lặng** — trang vẫn chạy, chỉ là xấu. Nên tôi làm
thêm một cổng cho nó (xem §5).

---

## 3. Thanh toán — cái nào chạy, cái nào chưa

Trang này là web tĩnh trên GitHub Pages: **không có máy chủ**. Điều đó quyết định cách nào
làm được.

| Cách | Trạng thái | Cần gì để bật |
|---|---|---|
| **Trả khi nhận hàng (COD)** | ✅ Chạy thật ngay | Không cần gì. Trang soạn sẵn nội dung đơn kèm mã đơn, khách bấm "Sao chép" rồi gửi cho shop. |
| **Chuyển khoản VietQR** | ⏸ Chờ số tài khoản | Tên ngân hàng, **mã BIN 6 số** (Vietcombank = 970436, Techcombank = 970407…), số tài khoản, tên chủ tài khoản viết in hoa không dấu. Điền vào `payment.methods[bank].bank` rồi đặt `ready: true`. Mã QR tự sinh kèm đúng số tiền và mã đơn. |
| **Apple Pay** | ⏸ Chờ hạ tầng | Bốn thứ, và một trong số đó vượt khỏi GitHub Pages — xem dưới. |

### Apple Pay cần gì

1. **Một cổng thanh toán có hỗ trợ Apple Pay** — Stripe, Adyen, hoặc cổng trong nước. Apple
   không nhận tiền hộ; nó chỉ là cái ví.
2. **Apple Merchant ID + chứng chỉ merchant identity** (đăng ký trong Apple Developer).
3. **Xác thực tên miền `scentsitive.vn` với Apple** — đặt một file tại
   `/.well-known/apple-developer-merchantid-domain-association`. Việc này GitHub Pages làm được.
4. **Một endpoint máy chủ để tạo phiên thanh toán.** ⚠️ **Đây là chỗ GitHub Pages không làm được.**
   Cần thêm một hàm serverless (Cloudflare Workers, Vercel, Netlify Functions — bản miễn phí đủ dùng).

Hiện tại trang **không giả vờ** có Apple Pay: nút bị khoá, kèm danh sách đúng 4 việc trên, và
một dòng cho biết máy đang xem **có** Apple Pay hay không. Tôi không đặt ô nhập thẻ nào, và cũng
không nên đặt — trang tĩnh không được nhận số thẻ.

**Gợi ý thứ tự làm:** bật VietQR trước (chỉ cần số tài khoản, 5 phút, không mất phí cổng), dùng
COD song song, rồi mới tính Apple Pay khi đơn đủ nhiều để bõ công dựng serverless.

---

## 4. Đang chờ nội dung từ chủ shop

Xếp theo mức chặn. Cứ gửi cho tôi, tôi điền vào `data/shop.json` và hạ cờ placeholder.

### Chặn nhất — 5 mùi hương (10 trong 28 mục placeholder chờ cái này)

Không có cách nào đọc nội dung 5 mùi ở dạng máy đọc được: Instagram trả HTTP 403 cho mọi truy
cập không đăng nhập, kể cả link có `stkn`. Nên chỗ này chờ **chủ shop chép ra**. Với **mỗi** mùi:

- **Tên mùi** (ví dụ "Đêm Hà Nội")
- **Một câu mô tả ngắn** — dòng hiện dưới tên ở ô sản phẩm
- **Đoạn cảm giác** — 2–4 câu, thứ chủ shop đã viết trong bài post
- **Ba tầng hương**: nốt đầu / nốt giữa / nốt cuối (mỗi tầng 2–3 nốt)
- **Lúc nào hợp nhất** — ví dụ "tối muộn, phòng đã tắt bớt đèn"
- **Màu đại diện** nếu chủ shop có ý — không có thì tôi giữ bộ màu đang dựng sẵn

Trong data tôi đã đánh sẵn 5 "chỗ" theo phổ hương để chủ shop dễ xếp: **01 ấm/gỗ · 02 tươi/cam quýt ·
03 hoa · 04 ngọt/vani · 05 sạch/khoáng**. Nếu 5 mùi thật của chủ shop không rơi vào 5 chỗ này thì cứ
nói, tôi đổi bộ màu theo mùi thật.

### Chặn việc bán

- **Giá thật từng sản phẩm** — hiện để tạm 100.000 ₫ cho cả 5.
- **Khối lượng, thời gian cháy, loại sáp, loại bấc** — đang là "(chỗ để trống)".
- **Tồn kho** — đang để tạm 20 cho mỗi món.
- **Số tài khoản ngân hàng** (xem §3) — để bật VietQR.
- **Số điện thoại, email, địa chỉ, link Instagram thật** — đang là `0900 000 000`,
  `hello@scentsitive.vn`, "Thay bằng địa chỉ thật…".
- **Phí giao và ngưỡng miễn phí thật** — đang để 25.000 ₫ và 500.000 ₫. Cổng bắt hai chỗ
  (số cho giỏ hàng, chữ cho đoạn Giao hàng) phải khớp nhau, nên đổi thì đổi cả hai.
- **Chính sách đổi trả thật**.

### Nên có, chưa chặn

- **Ảnh chụp thật** của nến. Hiện dùng hình vẽ SVG — đẹp và đồng bộ, nhưng ảnh thật bán tốt hơn.
- **Đánh giá của khách.** Tôi **cố tình không** bịa đánh giá: đánh giá giả trên một shop bán thật
  là lừa người mua. Khi có khách thật, gửi tôi nội dung + tên + thành phố, tôi thêm mục
  `reviews` và một section vào trang chủ.
- **Tên miền `scentsitive.vn`** trỏ vào GitHub Pages (cần file `CNAME` + bản ghi DNS).

---

## 5. Cổng chất lượng

`shop/tools/lint-shop.py` chạy tự động trước mỗi commit chạm `shop/`. Nó kiểm:

**Dữ liệu** — giá phải là số nguyên dương; giá gạch phải lớn hơn giá bán; `scent` của sản phẩm
phải trỏ vào mùi có thật; mùi không có sản phẩm nào thì section sẽ không có nút mua; mã màu phải
đúng `#rrggbb`; `labels.ship_fee`/`free_ship` phải khớp con số viết trong đoạn `shipping`; cách
thanh toán `ready: false` **bắt buộc** phải liệt kê thứ còn thiếu; bank `ready: true` thì BIN phải
6 chữ số và số tài khoản 6–20 chữ số.

**Trang** — id trùng, anchor gãy, asset thiếu, thẻ lệch.

**Bốn thứ riêng của shop này, mỗi thứ sinh ra từ một lỗi có thật:**

1. **Nội dung không được rò từ data lên HTML.** So theo text node, ngưỡng 0,40 — số đo được chứ
   không bịa (trùng hợp lệ cao nhất 28%, một mục cố tình chép vào đo được 44%). Nó đã bắt được một
   ca thật trong lần này: chữ "Sáp thực vật" nằm cả ở hero lẫn ở data.
2. **Năm trang phải dùng chung một shell.** Nav, menu và chân trang phải giống hệt nhau ở cả năm
   trang; chỉ `is-active` và `nav--over` được phép khác. Sửa menu một trang rồi quên hai trang kia
   là cách hỏng phổ biến nhất của web tĩnh nhiều trang, và nó im lặng.
3. **CSS không được mất quy tắc gốc.** 40 thành phần khối phải có quy tắc `.<tên> { }`, và không
   selector gốc nào được khai hai lần. Cổng này sinh ra ngay trong phiên: nó tìm ra bug #4 mà mắt
   tôi đã bỏ sót.
4. **Lớp căn giữa bằng grid không được nhận quá một con.** Cổng lấy ra mọi lớp khai
   `display:grid` + `place-items:center` mà không khai hướng cột, rồi đếm số con của từng phần tử
   mang lớp đó trong HTML tĩnh. Sinh ra từ bug #7. Luật đầu tôi định dùng — "rule nào vừa grid vừa
   `gap` mà không khai cột" — đã **đo trước khi nhận** và bị bác: khớp 3 rule, cả 3 đều đúng, 0 lỗi
   thật.

Mỗi cổng đều đã thử ngược — cố tình phá rồi xem nó có kêu không.

**Mức XEM** (cảnh báo, không chặn commit): số mục còn mang cờ `placeholder`. Hiện **24**.
Khi hạ hết cờ, dải cảnh báo màu cam trên đầu trang cũng tự tắt.

---

## 6. Việc còn nợ, tôi tự nhận

- **Chưa nối tên miền** `scentsitive.vn`. Trang đang chạy dưới đường dẫn `/shop/` của
  GitHub Pages.
- **Form nhận hàng chưa gửi đi đâu.** Nó chỉ chảy vào nội dung đơn để sao chép. Muốn nó thành
  form thật thì cần cùng cái serverless của §3, hoặc một dịch vụ form (Formspree, Basin).
- **Chưa có trang cảm ơn sau khi đặt** — vì chưa có bước "đặt" thật.
- **Mã VietQR gọi ảnh từ `img.vietqr.io`** (dịch vụ ngoài). Tôi chỉ đẩy số tiền và **mã đơn**
  lên URL đó, không đẩy tên/số điện thoại/địa chỉ của khách. Nếu chủ shop không muốn phụ thuộc bên
  ngoài, tôi sinh QR ngay trong trình duyệt được, nhưng tốn thêm code.
- **Chưa đo hiệu năng** (Lighthouse) và **chưa kiểm với trình đọc màn hình**.
- **Chưa có ảnh OG** cho lúc chia sẻ link lên Facebook/Zalo.
- **`shop.css` / `shop.js` chưa có version trong đường dẫn.** GitHub Pages đặt `max-age=600`
  cho asset, nên sau mỗi lần deploy khách đã vào trước đó có thể còn dùng bản cũ khoảng 10 phút.
  Chấp nhận được với tần suất sửa hiện tại; muốn hết hẳn thì phải thêm một bước build gắn hash
  vào tên file.
