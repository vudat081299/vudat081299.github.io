# Scentsitive — storefront nến thơm thủ công

Trang bán hàng tĩnh: không build, không phụ thuộc, không backend. Năm trang HTML dùng chung một shell;
mọi chữ và số của các khối lặp nằm ở `data/shop.json`, không viết trong HTML.

Live: <https://vudat081299.github.io/shop/>

**Đây chưa phải một shop đang bán.** Chưa gặp chủ shop lần nào; nội dung trong `data/shop.json` là nội
dung dựng tạm để trang có hình hài. Chừng nào còn mục mang cờ `placeholder`, trang tự hiện một dải cảnh
báo ở đầu. Đừng đọc giá, mùi hương hay lời chứng ở đây như dữ kiện về một doanh nghiệp có thật.

## Cây thư mục

```
shop/
  index.html · products.html · scent-finder.html · gift.html · checkout.html   năm trang cửa hàng
  assets/            shop.css, shop.js — style, shell, giỏ, Tìm mùi, hộp quà, lớp đo
  data/shop.json     nguồn của mọi chữ và số trên năm trang
  pitch/             bản đề xuất mang đi gặp chủ shop — không dùng shell chung
  measure/           phễu đo, đọc localStorage của chính máy đang mở
  tools/             lint-shop.py (cổng tĩnh), smoke.js (bấm thật trong Chromium), check.sh
  docs/              tài liệu định hướng, ADR, sổ nợ; docs/index.html là bản đọc
```

## Chạy tại máy

Trang đọc `data/shop.json` bằng `fetch`, nên phải qua HTTP (mở bằng `file://` là trang rỗng):

```bash
python3 -m http.server 8000                                  # ở gốc repo, rồi mở http://localhost:8000/shop/
sh shop/tools/check.sh                                       # cổng tĩnh
node shop/tools/smoke.js http://localhost:8000/shop/         # bấm thật; cần Node ≥ 20 và playwright-core
```

CI chạy cả hai mỗi lần push lên `main`; deploy chờ CI xanh.

## Đọc thêm

- [CLAUDE.md](CLAUDE.md): luật viết mã và những lớp lỗi đã gặp.
- [HANDOFF.md](HANDOFF.md): việc còn dở. [DECISIONS.md](DECISIONS.md): điều đã chốt. [HISTORY.md](HISTORY.md): nhật ký.
- [docs/00-READ-THIS-FIRST.md](docs/00-READ-THIS-FIRST.md): vì sao dựng thứ này.
- Mọi thứ trong `shop/`, kể cả `docs/` và file này, lên web công khai (SHOP-007).
