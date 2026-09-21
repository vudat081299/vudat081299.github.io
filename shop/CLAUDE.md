# shop/ — luật của dự án này

Đây là **scentsitive.vn**, một storefront cho shop nến thơm thủ công. Khác mọi thư mục khác
trong repo: đây là nơi **sai một con số thì khách trả nhầm tiền**. Mọi luật dưới đây sinh ra từ
đó chứ không từ sở thích.

Đọc thêm: [docs/00-READ-THIS-FIRST.md](docs/00-READ-THIS-FIRST.md) — mục lục toàn bộ tài liệu.

---

## Việc đầu tiên của mọi phiên

```bash
sh facts/tools/install-hooks.sh          # từ gốc repo, dựng lại bộ điều phối hook
python3 -m http.server 8000              # fetch cần HTTP, mở file:// là trang rỗng
cat shop/HANDOFF.md                      # phiên trước để lại gì
```

Rồi mở `http://localhost:8000/shop/`.

## Việc cuối của mọi phiên

```bash
sh shop/tools/check.sh
```

Một lệnh, hai tầng: cổng lint (cú pháp, dữ liệu, shell, liên kết) rồi **chạy thật trong trình
duyệt** (hành vi). Tầng hai mới là tầng bắt được hai lỗi nặng nhất từng xảy ra ở đây — cả hai
đều đi qua tầng một sạch sẽ. Xanh hết thì cập nhật `HANDOFF.md` rồi commit.

Có skill riêng cho thư mục này ở `.claude/skills/shop/` — phiên AI nào cũng nên nạp nó trước
khi sửa.

---

## Bốn luật không thương lượng

### 1. Chữ của khối lặp nằm ở `data/shop.json`, không nằm trong HTML

Mùi hương, sản phẩm, câu hỏi Tìm mùi, hộp quà, giá trị, hỏi đáp, cách thanh toán — tất cả ở
data. Chữ độc nhất (tiêu đề hero, tên section) ở lại HTML.

Cổng **đo** luật này: nó so từng text node của HTML với từng chuỗi trong data, ngưỡng 0,40.
Ngưỡng ấy là số đo được, không phải số bịa — xem comment trong `tools/lint-shop.py`.

**Chỉ trường có hậu tố `_html` mới được `innerHTML`.** Mặc định data là chữ thuần, UI tự escape.

### 2. Số suy ra được thì không ghi trong data

Giá hộp quà tính từ giá sản phẩm thật, không ghi tay. Tồn kho hộp quà tính từ tồn kho món khan
nhất. Tỉ lệ khớp của Tìm mùi tính từ trọng số. Ghi tay một con số suy ra được là tạo ra hai
nguồn sự thật, và chúng sẽ lệch nhau.

**Giỏ hàng chỉ lưu cấu hình hộp quà, không lưu giá.** Giá tính lại mỗi lần đọc, nên đổi giá nến
thì cái hộp đang nằm trong giỏ của khách cũng đổi theo.

### 3. Năm trang dùng chung một shell, và shell được SINH RA chứ không gõ lại

Nav, menu điện thoại, chân trang phải giống hệt nhau ở cả năm trang. Chỉ `is-active` và
`nav--over` được phép khác. Cổng so từng ký tự.

Sửa shell thì **đừng sửa tay năm file**. Sửa một file rồi chạy lại script đồng bộ (xem
[docs/05-ARCHITECTURE.md](docs/05-ARCHITECTURE.md) mục *Shell sinh ra thế nào*).

### 4. Cổng mới phải nằm trong repo, không nằm trong đầu ai

Tìm ra một lớp lỗi mới → viết một phép kiểm chạy được vào `tools/lint-shop.py` → **thử ngược**
(cố tình phá, xem nó có kêu không) → ghi lại lỗi gốc trong comment của phép kiểm ấy.

Mọi cổng trong file đó đều đã thử ngược. Giữ nguyên tập quán này.

---

## Thứ tự làm việc: dữ liệu trước, UI sau

1. Nội dung ra `data/shop.json` — chữ thuần, chưa có thẻ nào.
2. Rồi mới dựng UI, và UI *đọc* dữ liệu bằng vòng lặp.
3. Ghép, chạy cổng, chụp màn hình bằng trình duyệt thật, rồi mới ship.

Bước 3 không phải thủ tục. **Ba lỗi nặng nhất của thư mục này đều tìm ra bằng cách chạy thật
rồi đo, không phải bằng đọc code** — xem `STATUS-REPORT.md` mục 2 và
[docs/TECH-DEBT.md](docs/TECH-DEBT.md).

---

## Trang nào làm gì

| Trang | Việc của nó | Cổng có soi không |
|---|---|---|
| `index.html` | landing, dẫn vào ba hướng | có |
| `products.html` | năm mùi, màu trang đổi theo mùi đang đọc | có |
| `scent-finder.html` | năm câu hỏi → một mùi, kèm lý do | có |
| `gift.html` | hộp quà, xem trước trực tiếp | có |
| `checkout.html` | giỏ, VietQR, COD | có |
| `pitch/index.html` | **bản đề xuất mang đi gặp chủ shop, không phải trang cửa hàng** | không — nó không dùng shell |
| `measure/index.html` | đọc phễu từ các sự kiện đã ghi trong máy — trang nội bộ | không — cùng lý do |

`pitch/` và `measure/` nằm trong thư mục con nên `SHOP.glob('*.html')` không quét tới. Cố ý:
chúng mượn token màu của `assets/shop.css` để cùng một họ, nhưng không có nav, không có giỏ
hàng, và **không dùng lớp `.ms`** — một trang đem đi thuyết trình không được phụ thuộc vào việc
font icon của Google có về kịp hay không. Đổi lại: **không cổng nào soi hai trang đó**, sửa thì
phải tự mở xem.

---

## Đo đạc

`track(ev, props)` trong `assets/shop.js`. Thêm một sự kiện là thêm **một lời gọi**, đừng thêm
một hệ thống. Hiện có 12 sự kiện, đủ để dựng phễu Tìm mùi và biết khách rụng ở câu mấy — mà đó
đúng là con số mọi tiêu chí "bỏ tính năng này khi nào" trong `docs/02-ROADMAP.md` cần tới.

Dữ liệu nằm trong `localStorage` của **từng máy khách**; shop không thấy gì, hai máy không cộng
lại được. Muốn gộp số thật thì đổi `SINK` thành một URL — một dòng, đúng một chỗ — và dựng một
hàm serverless nhận nó. Đừng bật `SINK` khi chưa có trang nói rõ trang thu thập gì.

Xem phễu ở `/shop/measure/`.

---

## Tìm mùi: chấm điểm bằng trọng số, và cổng duyệt hết tổ hợp

Mỗi đáp án mang một bộ trọng số trên khoá mùi. Sửa một con số là lệch cả kết quả, **và lệch
không kêu** — trang vẫn chạy, vẫn ra một mùi, chỉ là mùi ấy sai.

Nên cổng duyệt **toàn bộ** tổ hợp đáp án (hiện là 320) và chặn commit nếu:

- có mùi **không bao giờ thắng** → cửa hàng có một mùi mà trang này không bao giờ giới thiệu;
- có mùi **thắng quá nửa** số tổ hợp → bộ câu hỏi chỉ là cái phễu đổ về một mùi;
- có đáp án **mọi trọng số bằng 0** → bấm vào nó không đổi gì;
- `tiebreak` không trỏ vào một câu có chấm điểm.

Mức XEM in ra phân bố hiện tại và số tổ hợp hoà mà câu phân xử cũng không gỡ được.
**Sửa trọng số thì chạy lại cổng và đọc dòng phân bố** — đừng đoán.

---

## Chỗ dễ sai, đã trả giá một lần

- **Đừng dùng `display:grid; place-items:center` cho phần tử có hơn một con.** Grid mặc định xếp
  theo hàng. Có cổng riêng cho việc này, sinh ra từ nút giỏ hàng bị xếp hai hàng.
- **Đừng neo tìm-thay vào một dòng xuất hiện ở hai hàm.** `renderCart()` và `boot()` cùng kết
  thúc bằng `if ($('#coLines')) renderCheckout();`. Một lần neo nhầm khiến hộp quà bị trả về
  mặc định sau mỗi lần giỏ đổi. Neo vào cả khối, và chạy thật để xác nhận.
- **Toast phải nói sự thật.** Không báo "đã thêm" khi tồn kho chặn. Đã có hai lỗi cùng loại
  (một ở sản phẩm, một ở hộp quà) — kiểm tra bằng cách bấm quá số tồn rồi đọc toast.
- **`git commit --amend` chỉ khi chưa push, và phải `git fetch origin main` trước.** Repo này
  có nhiều phiên chạy song song — xem `CLAUDE.md` ở gốc.
