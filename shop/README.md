# Scentsitive — storefront nến thơm thủ công

Trang bán hàng tĩnh: không build, không phụ thuộc, không backend. Năm trang HTML dùng chung
một shell, và **toàn bộ chữ lẫn số nằm ở `data/shop.json`** chứ không viết trong HTML.

Live: <https://vudat081299.github.io/shop/>

> **Sắp sửa gì trong đây?** Đọc [CLAUDE.md](CLAUDE.md) trước — luật viết mã và những lớp lỗi
> đã trả giá một lần. Phiên trước để lại gì thì xem [HANDOFF.md](HANDOFF.md). Muốn biết *vì
> sao* dựng thứ này thì vào [docs/00-READ-THIS-FIRST.md](docs/00-READ-THIS-FIRST.md).
> File này chỉ nói kiến trúc.

## Đọc cái này trước khi tin bất cứ con số nào trên trang

**Đây chưa phải một shop đang bán.** Chủ shop chưa được gặp lần nào; mọi thứ trong
`data/shop.json` là nội dung máy dựng để trang có hình hài. Tính tới `updated: 2026-09-17`
còn **28 mục mang cờ `placeholder`**, và chừng nào chưa hạ hết thì trang tự hiện một dải
cảnh báo cam ở đầu. Đừng đọc giá, mùi hương hay lời chứng ở đây như dữ kiện về một doanh
nghiệp có thật.

## Cây thư mục

```
shop/
  index.html          trang chủ
  products.html       Mùi hương
  scent-finder.html   Tìm mùi — quiz 5 câu, chấm bằng trọng số trong data
  gift.html           Hộp quà — tự gói, giá suy ra từ giá sản phẩm
  checkout.html       Giỏ + thanh toán
  assets/
    shop.css          1.101 dòng — toàn bộ style, prefix .ms
    shop.js           1.588 dòng — shell, giỏ, quiz, hộp quà, lớp đo
  data/
    shop.json         NGUỒN SỰ THẬT của mọi chữ và số trên năm trang
  measure/index.html  phễu đo — đọc localStorage của chính máy đang mở, không phải của khách
  pitch/index.html    bản đề xuất gửi chủ shop; trang DUY NHẤT ở đây viết cho người ngoài
  tools/
    lint-shop.py      882 dòng — cổng tầng 1 (dữ liệu, shell, tương phản, liên kết)
    smoke.js          290 dòng — cổng tầng 2, mở Chromium thật rồi bấm và đo
    check.sh          chạy cả hai tầng; đây là lệnh "đã xong chưa"
    hooks/            post-edit.sh (sau mỗi Edit/Write) + pre-commit
  docs/
    index.html        TRANG ĐỌC — gộp toàn bộ tri thức của bộ dưới đây, không có code
    00…05, TECH-DEBT  8 tài liệu định hướng — đây mới là NGUỒN
    adr/              5 quyết định + điều kiện xét lại từng cái
```

`pitch/` và `measure/` nằm trong thư mục con nên **không dùng shell chung và không dùng lớp
`.ms`**. Cổng shell không quét tới hai file đó — sửa thì phải tự mở xem.

## Chạy tại máy

Trang đọc `data/shop.json` bằng `fetch`, nên **phải qua HTTP** — mở bằng `file://` là trang rỗng:

```bash
python3 -m http.server 8000
```

Rồi mở <http://localhost:8000/shop/>.

## Cổng

```bash
sh shop/tools/check.sh
```

Hai tầng, và **tầng hai mới là tầng bắt được hành vi**:

| Tầng | Chạy gì | Bắt gì |
|---|---|---|
| 1 | `lint-shop.py` | giá âm, giá gạch ngược, `ship_fee` ≥ `free_ship`, chữ khối lặp lọt vào HTML, phân bố quiz lệch, tương phản dưới AA, liên kết markdown gãy, `deploy.yml` **mọc lại** `--exclude` cho `shop/docs` |
| 2 | `smoke.js` | giỏ, tồn kho, hộp quà, quiz — bấm thật trong Chromium, kể cả khi chặn font và chặn localStorage |

Tầng 2 cần Chromium. Thiếu thì nó **thoát mã 2 và nói rõ là đã bỏ qua**, *không* làm cổng đỏ —
nên đọc dòng cuối chứ đừng chỉ nhìn chữ `XONG`. Cài:

```bash
npm i -g playwright-core playwright && npx playwright install chromium
```

## Ba luật không thương lượng

1. **Chữ của khối LẶP ở data, chữ ĐỘC NHẤT ở HTML.** Cổng đo bằng cách so text node với chuỗi
   trong data, ngưỡng 0,40. Chỉ trường có hậu tố `_html` mới được `innerHTML`.
2. **Số suy ra được thì không ghi trong data.** Giá hộp quà tính từ giá sản phẩm; tồn kho hộp
   tính từ món khan nhất. Giỏ chỉ lưu *cấu hình* hộp quà, **không lưu giá** — giá tính lại mỗi
   lần đọc. Đây là thư mục mà sai một con số thì khách trả nhầm tiền.
3. **Năm trang dùng chung một shell, và shell được SINH RA.** Đừng sửa tay năm file — sửa một
   file rồi chép shell sang bốn file kia bằng script, gắn lại `is-active` và `nav--over` sau.

## Cái gì lên web, cái gì không

`.github/workflows/deploy.yml` rsync cả cây thư mục, nên **mặc định là công khai** — và từ
21/09/2026 thì **mọi thứ trong `shop/` đều công khai**, kể cả `docs/` và file này.

Trước đó `docs/` và `shop/*.md` bị loại trừ; chủ repo đã gỡ hai dòng ấy vì anh muốn đọc bộ tài
liệu trên web và coi nó là kế hoạch chứ không phải bí mật. `check_publish` trong `lint-shop.py`
**không biến mất theo, nó đảo chiều**: giờ nó làm đỏ build nếu `--exclude 'shop/docs'` hoặc
`--exclude 'shop/*.md'` **quay lại**. Cùng khuôn với `UNLISTED` ở `tools/lint-collection.py` —
khai rằng một thứ phải sống ở URL trực tiếp thì không ai giấu lại nó trong im lặng được.

**Hệ quả phải biết trước khi viết thêm vào `docs/`:** `04-NEGOTIATION.md` có mục §7 *"Dấu hiệu
nên rút"* và `01-CONTEXT-AND-OPPORTUNITY.md` mở đầu bằng *"Không đưa tài liệu này cho chị ấy"* —
cả hai giờ ở trên web. Viết gì vào đây thì viết như thể chủ shop sẽ đọc. Muốn đảo lại thì hỏi
chủ repo, đừng tự thêm dòng loại trừ.
