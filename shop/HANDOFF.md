# Bàn giao — phiên 20/09/2026, rà lại 21/09/2026, thêm 24/09/2026

Đọc file này trước, rồi tới [shop/CLAUDE.md](CLAUDE.md) và
[docs/05-ARCHITECTURE.md](docs/05-ARCHITECTURE.md). Mục lục đầy đủ:
[docs/00-READ-THIS-FIRST.md](docs/00-READ-THIS-FIRST.md).

## Phiên 24/09/2026 — dàn phẳng chuỗi nguyên liệu → khách quay lại

Đạt hỏi: chị ấy dùng Excel từ lúc nhập nguyên liệu tới lúc bán — có mắt xích nào can thiệp được
không? Kèm một bản brainstorm về sổ mẻ sản xuất. Kết quả nằm ở
[docs/06-VALUE-CHAIN.md](docs/06-VALUE-CHAIN.md) và Phần VI của trang đọc `docs/index.html`.

**Kết luận một dòng:** 18 mắt xích, 0 chỗ mà viết mã là lời giải tốt nhất; giá trị nằm ở **chỗ
nối** giữa các mắt xích, và chỗ nối lớn nhất là giá vốn `V` — nếu file có sheet nhập thì `V` tính
được từ số đã ghi, và tính được hai cách mà chỗ chênh chính là hao hụt không ai ghi (06 §4).

**Một khẳng định sai, đã sửa ở bốn chỗ.** ADR 0004, bảng năng lực ở 05, trang đọc, và **bản đề
xuất mang đi gặp chủ shop** cùng nói *"không phần mềm bán lẻ đại trà nào biết công thức của
shop"*. Sai: KiotViet có *Hàng sản xuất* — định mức, phiếu sản xuất tự trừ nguyên liệu và cộng
thành phẩm, giá vốn tính từ nguyên liệu, báo khi thiếu *[đã kiểm: hướng dẫn KiotViet, 24/09]*. Chỗ
ngoại lệ của ADR 0004 co lại còn nửa *chất lượng* của sổ mẻ. Bản brainstorm cũng mắc đúng câu ấy.

Thêm ba câu vào kịch bản buổi gặp ở 04: **A10** (tháng 12 năm ngoái có hết mùi không), **B7** (làm
xong bao lâu mới bán được), **E4** (xin xem file Excel — cùng xem, không xin file, vì nó chứa
thông tin khách). Tổng thành 24 câu và bốn lời xin.

**Đã đo trong trình duyệt**, vì `pitch/` và `docs/` nằm ngoài tầm của cổng: Phần VI không tràn
ngang ở 320, 390, 1280px; mục lục tự thêm Phần VI với 9 mục; cột xếp chồng đúng tỉ lệ 8:5:3:2.
Phép đo tràn đã thử ngược — ép công thức V₂ về `nowrap` như một thẻ `<code>` thì trang tràn 511px.
Đó cũng là lý do công thức nằm trong khối `.fx` chứ không trong `<code>`.

**Chưa làm, cố ý:** chưa ai xem file Excel, nên §7 của 06 toàn là điều kiện "nếu file có…".
Mọi con số minh hoạ ở 06 §4 và lịch ngược tháng 12 đều là số bịa để thấy độ nhạy, có nhãn.

## Tên file tài liệu đổi sang tiếng Anh — 21/09/2026

13 file markdown trong `shop/` đổi tên theo yêu cầu chủ repo. **Nội dung vẫn tiếng Việt** —
chỉ cái tên đổi. Ai còn nhớ đường dẫn cũ thì tra bảng này:

| Cũ | Mới |
|---|---|
| `BAO-CAO-HIEN-TRANG.md` | `STATUS-REPORT.md` |
| `docs/00-DOC-CAI-NAY-TRUOC.md` | `docs/00-READ-THIS-FIRST.md` |
| `docs/01-BOI-CANH-VA-CO-HOI.md` | `docs/01-CONTEXT-AND-OPPORTUNITY.md` |
| `docs/02-LO-TRINH.md` | `docs/02-ROADMAP.md` |
| `docs/03-DOI-THU-VA-TICH-HOP.md` | `docs/03-COMPETITORS-AND-INTEGRATIONS.md` |
| `docs/04-DAM-PHAN.md` | `docs/04-NEGOTIATION.md` |
| `docs/05-KIEN-TRUC.md` | `docs/05-ARCHITECTURE.md` |
| `docs/NO-KY-THUAT.md` | `docs/TECH-DEBT.md` |
| `docs/adr/0001-trang-tinh.md` | `docs/adr/0001-static-site.md` |
| `docs/adr/0002-cham-diem-tim-mui.md` | `docs/adr/0002-scent-finder-scoring.md` |
| `docs/adr/0003-hop-qua-trong-gio.md` | `docs/adr/0003-gift-box-in-cart.md` |
| `docs/adr/0004-khong-xay-lai-phan-mem-ban-hang.md` | `docs/adr/0004-dont-rebuild-retail-software.md` |
| `docs/adr/0005-an-icon-cho-toi-khi-font-ve.md` | `docs/adr/0005-hide-icons-until-font-loads.md` |

196 chỗ trỏ tới tên cũ đã sửa theo — không chỉ liên kết markdown mà cả comment trong
`tools/lint-shop.py`, `assets/shop.js`, `.github/workflows/deploy.yml` và
`.claude/skills/shop/SKILL.md`.

Chỗ dựa để biết không sót cái nào là cổng `check_docs` (liên kết markdown phải trỏ tới file có
thật). **Đã thử ngược:** để đúng một link trỏ về tên cũ thì cổng in `liên kết gãy` và đỏ.

Hai cổng dễ tưởng là bị ảnh hưởng nhưng **không**: `check_publish` so `--exclude 'shop/docs'` và
`--exclude 'shop/*.md'` trong `deploy.yml` — cả hai là glob theo thư mục và đuôi file, nên đổi
tên không mở ra lỗ nào. Đã kiểm lại sau khi đổi: cổng vẫn xanh.
(`check_publish` đã **đảo chiều** cùng ngày — xem mục *"Việc đó đã quyết"* bên dưới.)

---

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
bấm (**16 phép đo**). Tầng hai mới là tầng bắt được hành vi — đã đo nhiều lần: tái tạo bất kỳ
lỗi cũ nào thì lint in **OK** còn smoke in **LỖI**.

---

## Vòng rà 21/09/2026 — tìm ra 15 lỗi, trong đó 6 lỗi tiền

Đọc [docs/TECH-DEBT.md](docs/TECH-DEBT.md) để có danh sách đầy đủ. Bốn cái đáng nhớ nhất:

1. **Tồn kho không có nguồn sự thật duy nhất.** Gói 6 hộp ba cùng mùi 01 rồi bấm thêm nến 01 ở
   trang Mùi hương → giỏ giữ **38 cây trên tồn 20**. `addToCart` và `giftStock` kẹp theo hai con
   số khác nhau. Nay có `remaining(k, skipId)`, mọi chỗ gọi nó.
2. **Ba lỗi chỉ hiện ra khi môi trường hỏng** — font bị chặn thì cả trang lộ chữ `storefront`;
   localStorage bị chặn thì giỏ bốc hơi không một lời nào. Môi trường tốt thì chúng xanh mãi
   mãi, nên cổng phải **dựng lại** tình huống hỏng. Nay `smoke.js` tự chặn tên miền font và tự
   chặn localStorage rồi đo.
3. **Cửa hàng mẫu bán 100.000 ₫ trong khi bản đề xuất lập luận trên 300.000 ₫** — mà `docs/00`
   lại dặn mở bản đề xuất trước rồi bấm sang cửa hàng.
4. **Bảng đòn bẩy AOV trong `docs/01` ra dấu ngược** vì quên trừ phí sàn trên phần doanh thu
   tăng thêm: ở giá vốn 200.000 ₫ con số thật là **−47.840 ₫**, bản cũ ghi +2.704.000 ₫.

**Một bài học về chính cách thử ngược:** phá riêng `addToCart` thì cổng tồn kho không kêu, vì
lớp kẹp ở `renderCart` che mất. Phải phá `remaining()` — thứ cả ba lớp cùng dùng — nó mới kêu
đúng "38 cây / tồn 20". Thử ngược một lớp phòng thủ khi có nhiều lớp thì đo ra sự im lặng của
lớp khác, không phải sự hỏng của cổng.

## Việc đó đã quyết — 21/09/2026: bộ tài liệu LÊN web

Mục này trước tên là *"Một việc CHƯA làm, đang chờ Đạt quyết"*. Đã quyết, và chọn chiều ngược
với mặc định cũ.

Đạt chọn **công khai**: hai dòng `--exclude` đã gỡ khỏi `deploy.yml`, nên `shop/docs/` và mọi
`shop/*.md` giờ đọc được ở `vudat081299.github.io/shop/…`. Lý do anh đưa ra: phần lớn bộ này là
kế hoạch, không phải bí mật.

Anh đã được nói rõ cái gì đang lên trước khi quyết: `04-NEGOTIATION.md` có mục §7 *"Dấu hiệu nên
rút"*, và `01-CONTEXT-AND-OPPORTUNITY.md` tự mở đầu bằng *"Không đưa tài liệu này cho chị ấy"*.
Hai câu ấy vẫn nguyên trong file, và giờ chúng ở trên web.

**Hệ quả, nói thẳng:** nếu chị ấy tìm ra đường dẫn thì đọc được cả thế bài. Trước đây việc đó cần
biết URL repo trên github.com; giờ chỉ cần biết `vudat081299.github.io/shop/`. Ai thấy việc này
sai thì **hỏi Đạt**, đừng tự thêm lại dòng loại trừ — có cổng chặn đúng chiều đó.

Phiên AI thì nạp `.claude/skills/shop/` trước khi sửa; nó là quy trình trên viết dài ra.

- Cửa hàng: `http://localhost:8000/shop/`
- Tìm mùi: `/shop/scent-finder.html`
- Hộp quà: `/shop/gift.html`
- **Bản đề xuất mang đi gặp chủ shop: `/shop/pitch/`**
- Phễu (nội bộ): `/shop/measure/`

**Cái gì lên public.** Từ 21/09/2026: **mọi thứ trong `shop/`**, kể cả `docs/` và các file
`.md`. Hai dòng loại trừ đã gỡ khỏi `deploy.yml`, và `check_publish` trong `lint-shop.py` đảo
chiều — nó làm đỏ nếu hai dòng ấy **quay lại**, đúng khuôn `UNLISTED` của cổng danh mục.
`shop/pitch/` vẫn công khai như trước.

## Phiên này đã thêm gì

| Thứ | Ở đâu |
|---|---|
| Trang **Tìm mùi** — 5 câu hỏi, chấm bằng trọng số, kết quả có nói lý do | `scent-finder.html` |
| Trang **Hộp quà** — chọn hộp/mùi/thiệp/cách gói, xem trước trực tiếp, thêm vào giỏ như một món ghép | `gift.html` |
| **Bản đề xuất** có máy tính phí sàn để chủ shop tự kéo số của mình | `pitch/index.html` |
| Dữ liệu `quiz` + `gift` | `data/shop.json` |
| Mọi phép kiểm đều đã thử ngược — đó là luật, không phải con số | `tools/lint-shop.py`, `tools/smoke.js` |
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
          5 trang, 17 tài liệu).
```

Số trên đọc từ lần chạy 24/09/2026. Tầng 2 (`smoke.js`) lần ấy **BỎ QUA** — máy thiếu
`playwright-core` cả ở Node mặc định (fnm v16) lẫn Node của Homebrew. Không ảnh hưởng tới phiên
ấy vì nó không chạm trang nào smoke đo; phiên sau sửa trang cửa hàng thì phải cài rồi chạy lại.

Ba mục mức XEM, đều cố ý:
1. phân bố mùi thắng của Tìm mùi (17,2% → 23,8%);
2. 2,2% tổ hợp hoà mà câu phân xử không gỡ được;
3. còn 28 mục mang cờ `placeholder`.

## Việc tiếp theo, theo thứ tự

1. **Đọc [docs/04-NEGOTIATION.md](docs/04-NEGOTIATION.md) trước buổi gặp.** Mục tiêu buổi gặp đầu là
   *khám phá*, không phải trình diễn. Nếu hôm đó nói nhiều hơn nghe thì buổi gặp hỏng.
2. **Hỏi cho được giá vốn một cây nến.** Thiếu nó thì mọi phép tính chỉ nói về doanh thu. Từ
   24/09: cách tốt hơn hỏi là **xin xem file Excel** (câu E4) rồi tính hai cách
   ([docs/06-VALUE-CHAIN.md](docs/06-VALUE-CHAIN.md) §4) — câu trả lời từ trí nhớ nhiều khả năng
   thiếu phần cây lỗi, cây thử, bao bì.
3. Xin nội dung 5 mùi → điền vào `data/shop.json` → hạ **10** cờ `placeholder`
   (`scents` 5 + `products` 5). 18 cờ còn lại là chính sách ship, thanh toán và cam kết
   thương hiệu — phải hỏi riêng, đừng tưởng xin xong 5 mùi là hết cờ.
4. Xin số tài khoản → bật VietQR (5 phút, không mất phí cổng).
5. Mở `https://banhang.shopee.vn/edu/article/8450` và `/8451` **bằng trình duyệt** để biết shop
   có đủ điều kiện dùng API Shopee không. Máy không đọc được hai trang đó.
6. Hỏi luật sư về nghĩa vụ thông báo website sau 01/07/2026 — xem sổ nợ mục 5.

## Bốn thứ đừng làm

- **Đừng xây phần mềm quản lý bán hàng.** [adr/0004](docs/adr/0004-dont-rebuild-retail-software.md).
- **Đừng nói "không phần mềm bán lẻ nào biết công thức nến"** — KiotViet biết
  ([docs/06-VALUE-CHAIN.md](docs/06-VALUE-CHAIN.md) §5). Câu ấy từng nằm trong bản đề xuất.
- **Đừng hứa đồng bộ Shopee** trước khi xác minh xong điều kiện ở việc số 5.
- **Đừng tin con số "quiz tăng chuyển đổi 40%"** hay bất kỳ số uplift nào đang lưu hành —
  tất cả đều do chính công ty bán phần mềm quiz công bố, không có nhóm đối chứng. Đã truy
  câu "McKinsey: bundling tăng AOV 20–35%": **không có ấn phẩm McKinsey nào đứng sau.**

## Cái lớp đo dùng để làm gì

Mọi tiêu chí "bỏ tính năng này khi nào" trong [docs/02-ROADMAP.md](docs/02-ROADMAP.md) cần một
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
