# Bàn giao — phiên 20/09/2026

Đọc file này trước, rồi tới [shop/CLAUDE.md](CLAUDE.md) và
[docs/05-KIEN-TRUC.md](docs/05-KIEN-TRUC.md). Mục lục đầy đủ:
[docs/00-DOC-CAI-NAY-TRUOC.md](docs/00-DOC-CAI-NAY-TRUOC.md).

## Quy trình — ba lệnh, không phải ba trang hướng dẫn

```bash
sh facts/tools/install-hooks.sh     # 1. đầu phiên: dựng lại hook. Chạy nhiều lần vô hại.
python3 -m http.server 8000         # 2. fetch cần HTTP; mở file:// là trang rỗng
sh shop/tools/check.sh              # 3. cuối phiên: "đã xong chưa"
```

Giữa bước 2 và 3 thì cứ sửa — **cổng tự chạy**, không phải nhớ:

| Khi nào | Cái gì chạy | Nó bắt gì |
|---|---|---|
| Ngay sau mỗi lần Edit/Write | `shop/tools/hooks/post-edit.sh` | cú pháp, dữ liệu, shell, liên kết |
| Lúc `git commit` | `shop/tools/hooks/pre-commit` | như trên, **kể cả** thay đổi viết bằng script |
| Lúc `git push` | `pre-push` | trạng thái cuối, kể cả sau `--no-verify` |
| Lúc lên `main` / mở PR | `.github/workflows/gates.yml` | cổng của **mọi** project, cộng chạy thật trong trình duyệt |

`check.sh` là lệnh duy nhất cần nhớ. Nó chạy hai tầng: cổng lint, rồi mở trình duyệt thật và
bấm. Tầng hai mới là tầng bắt được hành vi — đã đo: tái tạo lỗi cũ thì lint in **OK** còn
smoke in **2/12 LỖI**.

Phiên AI thì nạp `.claude/skills/shop/` trước khi sửa; nó là quy trình trên viết dài ra.

- Cửa hàng: `http://localhost:8000/shop/`
- Tìm mùi: `/shop/scent-finder.html`
- Hộp quà: `/shop/gift.html`
- **Bản đề xuất mang đi gặp chủ shop: `/shop/pitch/`**
- Phễu (nội bộ): `/shop/measure/`

## Phiên này đã thêm gì

| Thứ | Ở đâu |
|---|---|
| Trang **Tìm mùi** — 5 câu hỏi, chấm bằng trọng số, kết quả có nói lý do | `scent-finder.html` |
| Trang **Hộp quà** — chọn hộp/mùi/thiệp/cách gói, xem trước trực tiếp, thêm vào giỏ như một món ghép | `gift.html` |
| **Bản đề xuất** có máy tính phí sàn để chủ shop tự kéo số của mình | `pitch/index.html` |
| Dữ liệu `quiz` + `gift` | `data/shop.json` |
| 11 phép kiểm mới, đều đã thử ngược | `tools/lint-shop.py` |
| Luật dự án, kiến trúc, 5 ADR, sổ nợ | `CLAUDE.md`, `docs/` |
| **Lớp đo** — 12 sự kiện + trang phễu | `assets/shop.js`, `measure/` |
| **Chạy thật trong trình duyệt** — 12 phép đo hành vi | `tools/smoke.js`, `tools/check.sh` |
| **Cổng lớp 1** cho shop (trước chỉ có lớp 2) | `tools/hooks/post-edit.sh`, `.claude/settings.json` |
| **Cổng lớp 4** — CI chạy cổng của mọi project | `.github/workflows/gates.yml` |
| **Skill riêng cho repo** | `.claude/skills/shop/` |

Shell của **cả 5 trang** đã được sinh lại từ một nguồn — đừng sửa tay từng file.

## Trạng thái cổng

```
shop: OK (5 mùi hương, 5 sản phẩm, 5 câu hỏi Tìm mùi, 3 cỡ hộp quà, 3 cách thanh toán,
          5 trang, 15 tài liệu).
smoke: OK (12 phép đo).
```

Ba mục mức XEM, đều cố ý:
1. phân bố mùi thắng của Tìm mùi (17,2% → 23,8%);
2. 2,2% tổ hợp hoà mà câu phân xử không gỡ được;
3. còn 24 mục mang cờ `placeholder`.

## Việc tiếp theo, theo thứ tự

1. **Đọc [docs/04-DAM-PHAN.md](docs/04-DAM-PHAN.md) trước buổi gặp.** Mục tiêu buổi gặp đầu là
   *khám phá*, không phải trình diễn. Nếu hôm đó nói nhiều hơn nghe thì buổi gặp hỏng.
2. **Hỏi cho được giá vốn một cây nến.** Thiếu nó thì mọi phép tính chỉ nói về doanh thu.
3. Xin nội dung 5 mùi → điền vào `data/shop.json` → hạ 24 cờ `placeholder`.
4. Xin số tài khoản → bật VietQR (5 phút, không mất phí cổng).
5. Mở `https://banhang.shopee.vn/edu/article/8450` và `/8451` **bằng trình duyệt** để biết shop
   có đủ điều kiện dùng API Shopee không. Máy không đọc được hai trang đó.
6. Hỏi luật sư về nghĩa vụ thông báo website sau 01/07/2026 — xem sổ nợ mục 5.

## Ba thứ đừng làm

- **Đừng xây phần mềm quản lý bán hàng.** [adr/0004](docs/adr/0004-khong-xay-lai-phan-mem-ban-hang.md).
- **Đừng hứa đồng bộ Shopee** trước khi xác minh xong điều kiện ở việc số 5.
- **Đừng tin con số "quiz tăng chuyển đổi 40%"** hay bất kỳ số uplift nào đang lưu hành —
  tất cả đều do chính công ty bán phần mềm quiz công bố, không có nhóm đối chứng. Đã truy
  câu "McKinsey: bundling tăng AOV 20–35%": **không có ấn phẩm McKinsey nào đứng sau.**

## Cái lớp đo dùng để làm gì

Mọi tiêu chí "bỏ tính năng này khi nào" trong [docs/02-LO-TRINH.md](docs/02-LO-TRINH.md) cần một
con số. Trước phiên này trang không đếm gì cả, nên những tiêu chí ấy chỉ là chữ. Giờ `/shop/measure/`
dựng được phễu: mở trang → bấm bắt đầu → từng câu → ra kết quả → thêm vào giỏ, kèm tỉ lệ rụng ở
mỗi bậc.

**Nhưng số đó là của máy đang mở, không phải của khách.** `localStorage` nằm ở từng trình duyệt;
shop không thấy gì. Muốn gộp số thật thì đổi `SINK` trong `assets/shop.js` thành một URL và dựng
một hàm serverless nhận — nợ #10b trong sổ.

## Điều quan trọng nhất phải nhớ

Ba trang đã dựng đều là **giả thuyết viết thành phần mềm**, không phải giải pháp đã được xác
nhận. Rủi ro lớn nhất bây giờ không phải xây sai kỹ thuật — mà là **xây nhầm thứ**. Bất định về
business đang lớn hơn bất định về công nghệ rất nhiều.

Trước khi viết thêm một dòng mã nào, đọc mục *"Bốn việc đáng thử trước khi nghĩ tới website"*
trong `pitch/index.html`. Nếu một trong bốn việc ấy ăn, nó vừa rẻ hơn vừa trả lời câu hỏi nhanh
hơn bất cứ phần mềm nào.
