---
name: shop
description: Quy trình làm việc trong thư mục shop/ của repo này — storefront scentsitive.vn. Dùng skill này khi sửa bất cứ thứ gì trong shop/ (trang bán hàng, Tìm mùi, Hộp quà, thanh toán, dữ liệu, cổng, tài liệu, bản đề xuất). Nó nói thứ tự phải làm, cổng phải chạy, và những lớp lỗi đã từng xảy ra ở đây. KHÔNG dùng cho các project con khác trong repo (facts/, cashy/, pages/, cooking/, masters-degree/).
---

# Làm việc trong shop/

Skill này chỉ giữ **thứ tự các bước**. Luật nằm ở `shop/CLAUDE.md` — mỗi bước dưới đây trỏ tới
mục luật tương ứng, tên mục viết *nghiêng*. Đọc `shop/CLAUDE.md` một lượt trước khi sửa: đây là
thư mục mà sai một con số thì khách trả nhầm tiền.

## 1. Đầu phiên

```bash
python3 -m http.server 8000          # ở gốc repo; fetch cần HTTP, mở file:// là trang rỗng
python3 shop/tools/lint-shop.py -v   # cổng, chạy TRƯỚC để biết trạng thái xuất phát
cat shop/HANDOFF.md                  # việc dở, việc chờ chủ trang
```

Sắp sửa file nào thì tra điều đã chốt cho file ấy trước:
`python3 tools/decisions.py find shop/<file>`. Đảo một quyết định `SHOP-NNN` thì hỏi chủ repo.
Luật: *Phiên làm việc*, và đầu file (ba file đi kèm, "mọi tính năng là giả thuyết").

## 2. Dữ liệu trước

Nội dung ra `shop/data/shop.json` — chữ thuần, chưa thẻ nào. Số suy ra được thì không ghi vào
data. Luật: *Dữ liệu trước, UI sau*, *Tiền nằm ở quan hệ giữa các trường*.

## 3. Rồi mới dựng UI

UI *đọc* dữ liệu bằng vòng lặp. Sửa shell thì sửa một file rồi đồng bộ sang bốn file kia bằng
script. Luật: *Năm trang, một shell*, *Chỗ dễ sai*.

## 4. Chạy cổng

`python3 shop/tools/lint-shop.py -v`. Đụng trọng số Tìm mùi thì đọc dòng phân bố, đừng đoán. Tìm
ra một lớp lỗi mới thì viết phép kiểm, thử ngược, ghi lỗi gốc vào comment. Luật: *Cổng mới*,
*Tìm mùi*.

## 5. Mở trình duyệt thật, bấm, rồi ĐO

Không bỏ bước này — cổng tĩnh không bắt được hành vi. Đo bằng tay theo bảng, rồi chạy
`node shop/tools/smoke.js http://localhost:8000/shop/`. Luật: *Chạy thật rồi đo* (cả cách cài
Chromium cho `smoke.js`).

## 6. Cập nhật tài liệu

`HANDOFF.md` (việc dở) luôn luôn; `HISTORY.md` (nhật ký phiên) luôn luôn; `DECISIONS.md` khi
chủ repo vừa chốt một điều; `docs/TECH-DEBT.md` nếu để lại nợ; `docs/adr/` nếu vừa chọn một
hướng kỹ thuật mà người sau có thể hỏi "vì sao". Luật: *Phiên làm việc*, *Tài liệu*.

## 7. Xong

```bash
sh shop/tools/check.sh      # cổng tĩnh; commit chạm shop/ cũng tự chạy nó, CI chạy thêm smoke.js
```

Rồi commit. Repo có nhiều phiên chạy song song và cùng push thẳng lên `main` — trước mọi lệnh
viết lại lịch sử phải `git fetch origin main` và kiểm tra `HEAD` (mục *Git* ở `CLAUDE.md` gốc).

Ở mọi bước: đọc lại *Đừng làm* trước khi thêm một tính năng, một con số, hay một lời hứa với chủ shop.
