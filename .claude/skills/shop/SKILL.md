---
name: shop
description: Quy trình làm việc trong thư mục shop/ của repo này — storefront scentsitive.vn. Dùng skill này khi sửa bất cứ thứ gì trong shop/ (trang bán hàng, Tìm mùi, Hộp quà, thanh toán, dữ liệu, cổng, tài liệu, bản đề xuất). Nó nói thứ tự phải làm, cổng phải chạy, và những lớp lỗi đã từng xảy ra ở đây. KHÔNG dùng cho các project con khác trong repo (facts/, cashy/, pages/, cooking/, masters-degree/).
---

# Làm việc trong shop/

`shop/` là storefront của một shop nến thơm thủ công. Khác mọi thư mục khác trong repo:
**đây là nơi sai một con số thì khách trả nhầm tiền.** Mọi luật dưới đây sinh ra từ đó.

## Trước khi sửa bất cứ thứ gì

```bash
sh facts/tools/install-hooks.sh      # dựng lại bộ điều phối hook, chạy nhiều lần vô hại
python3 -m http.server 8000          # fetch cần HTTP; mở file:// là trang rỗng
python3 shop/tools/lint-shop.py -v   # cổng, chạy TRƯỚC để biết trạng thái xuất phát
cat shop/HANDOFF.md                  # phiên trước để lại gì
```

## Thứ tự bắt buộc: dữ liệu → giao diện → cổng → chạy thật

1. **Nội dung ra `shop/data/shop.json`** — chữ thuần, chưa thẻ nào.
2. **Rồi mới dựng UI**, và UI *đọc* dữ liệu bằng vòng lặp.
3. **Chạy cổng.**
4. **Mở trình duyệt thật, bấm, rồi ĐO.** Không bỏ bước này (xem *Chạy thật* bên dưới).
5. **Cập nhật tài liệu** — `HANDOFF.md` luôn luôn; `docs/NO-KY-THUAT.md` nếu để lại nợ;
   `docs/adr/` nếu vừa quyết một thứ mà người sau có thể muốn hỏi "vì sao".

## Bốn luật không thương lượng

1. **Chữ của khối LẶP ở data, chữ ĐỘC NHẤT ở HTML.** Cổng đo bằng cách so text node với
   chuỗi trong data, ngưỡng 0,40 — số đo được, không phải số bịa.
   Chỉ trường có hậu tố `_html` mới được `innerHTML`; còn lại escape.
2. **Số suy ra được thì không ghi trong data.** Giá hộp quà tính từ giá sản phẩm; tồn kho hộp
   tính từ món khan nhất; tỉ lệ khớp Tìm mùi tính từ trọng số. Giỏ hàng chỉ lưu *cấu hình*
   hộp quà, **không lưu giá** — giá tính lại mỗi lần đọc.
3. **Năm trang dùng chung một shell, và shell được SINH RA.** Nav, menu, chân trang phải giống
   hệt nhau; chỉ `is-active` và `nav--over` được khác. **Đừng sửa tay năm file** — sửa một file
   rồi chép shell sang bốn file kia bằng script, gắn lại hai lớp đó sau.
4. **Cổng mới phải nằm trong repo.** Tìm ra một lớp lỗi → viết phép kiểm vào
   `shop/tools/lint-shop.py` → **thử ngược** (cố tình phá, xem nó có kêu không) → ghi lỗi gốc
   vào comment của phép kiểm ấy.

## Chạy thật, đừng đọc code rồi kết luận

Mọi lỗi nặng của thư mục này đều tìm ra bằng cách mở trình duyệt và đo, không lỗi nào lộ ra khi
đọc code. Cổng lint bắt được cú pháp và dữ liệu, **không** bắt được hành vi.

Ba phép đo tối thiểu sau khi sửa:

| Sửa gì | Đo thế nào |
|---|---|
| Giỏ hàng / tồn kho | Bấm **quá** số tồn rồi đọc toast. Toast phải nói sự thật, không được báo "đã thêm" khi bị chặn. |
| Hộp quà | Gói một hộp, thêm vào giỏ, rồi đọc `localStorage.getItem('scentsitive-cart')` — cấu hình phải còn nguyên. |
| Tìm mùi | Làm hết một lượt, xem `/shop/measure/` có bắn đủ sự kiện không. |

Playwright có sẵn ở `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
Đừng chạy `playwright install`.

## Tìm mùi: đụng vào trọng số thì phải đọc lại phân bố

Đáp án chấm bằng trọng số trong `data/shop.json`. Sửa một con số là lệch cả kết quả, **và lệch
không kêu** — trang vẫn chạy, vẫn ra một mùi, chỉ là mùi ấy sai.

Cổng duyệt toàn bộ tổ hợp đáp án và **chặn commit** nếu có mùi không bao giờ thắng, có mùi
thắng quá nửa, có đáp án mọi trọng số bằng 0, hoặc `tiebreak` trỏ vào câu không chấm điểm.
Mức XEM in ra phân bố hiện tại — **đọc nó, đừng đoán**. Xem `docs/adr/0002`.

## Đo đạc

`track(ev, props)` trong `assets/shop.js`. Thêm sự kiện = thêm một lời gọi, **đừng thêm một hệ
thống**. Dữ liệu nằm trong `localStorage` của từng máy; shop không thấy gì. Muốn gộp số thật
thì đổi `SINK` thành một URL — một dòng, đúng một chỗ.

Xem phễu ở `/shop/measure/`.

## Chỗ dễ sai, đã trả giá một lần

- **Đừng dùng `display:grid; place-items:center` cho phần tử có hơn một con.** Grid mặc định
  xếp theo hàng. Có cổng riêng, sinh ra từ nút giỏ hàng bị xếp hai hàng.
- **Đừng neo tìm-thay vào một dòng xuất hiện ở hai hàm.** `renderCart()` và `boot()` cùng kết
  thúc bằng `if ($('#coLines')) renderCheckout();`. Một lần neo nhầm khiến hộp quà bị trả về
  mặc định sau mỗi lần giỏ đổi — cổng **không** bắt được vì cú pháp vẫn đúng.
- **Đừng thêm liên kết markdown tới file chưa tồn tại.** Có cổng; markdown gãy thì im lặng.
- **`pitch/` và `measure/` không dùng shell và không dùng lớp `.ms`.** Chúng nằm trong thư mục
  con nên cổng shell không quét tới — sửa thì phải tự mở xem.

## Đừng làm những việc này

- **Đừng xây phần mềm quản lý bán hàng / kho / đơn.** Mua sẵn rẻ hơn nhiều lần — `docs/adr/0004`.
- **Đừng hứa đồng bộ Shopee** trước khi xác minh shop có đủ điều kiện dùng API.
- **Đừng bịa số uplift.** Mọi con số kiểu "quiz tăng chuyển đổi 40%" đều do chính công ty bán
  phần mềm quiz công bố. Câu "McKinsey: bundling tăng AOV 20–35%" đã truy ngược: không có ấn
  phẩm nào đứng sau.
- **Đừng bịa đánh giá của khách.**
- **Đừng thêm CI, test tự động, TypeScript hay bước build** chỉ vì thấy nên có. Thêm khi có một
  lỗi thật mà ba lớp cổng hiện tại không bắt được — xem mục *Chỗ dừng lại* trong `docs/05-KIEN-TRUC.md`.

## Xong một việc thì làm gì

```bash
sh shop/tools/check.sh      # cổng + kiểm nhanh; đây là "đã xong chưa"
```

Rồi cập nhật `shop/HANDOFF.md`, commit. Repo có nhiều phiên chạy song song và cùng push thẳng
lên `main` — **trước mọi lệnh viết lại lịch sử phải `git fetch origin main` và kiểm tra `HEAD`**
(xem `CLAUDE.md` ở gốc repo).
