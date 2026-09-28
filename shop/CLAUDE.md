# shop/ — luật của dự án này

Đây là **scentsitive.vn**, một storefront cho shop nến thơm thủ công. Khác mọi thư mục khác
trong repo: đây là nơi **sai một con số thì khách trả nhầm tiền**. Mọi luật dưới đây sinh ra từ
đó chứ không từ sở thích.

Đọc thêm: [docs/00-READ-THIS-FIRST.md](docs/00-READ-THIS-FIRST.md) — mục lục toàn bộ tài liệu.
Ba file đi kèm, mỗi file một việc:

- [DECISIONS.md](DECISIONS.md) — điều đã chốt, mã `SHOP-NNN`. Luật nào dưới đây sinh ra từ một
  quyết định thì trích mã của nó.
- [HANDOFF.md](HANDOFF.md) — việc dở và việc chờ chủ trang.
- [HISTORY.md](HISTORY.md) — nhật ký từng phiên.

**Mọi tính năng đã dựng là giả thuyết viết thành phần mềm, chưa phải giải pháp đã được xác
nhận** — chưa ai gặp chủ shop. Rủi ro lớn nhất là xây nhầm thứ, không phải xây sai kỹ thuật.
Trước khi viết thêm một dòng mã, đọc mục *"Bốn việc đáng thử trước khi nghĩ tới website"* trong
`pitch/index.html`: một trong bốn việc ấy ăn thì nó vừa rẻ hơn vừa trả lời nhanh hơn mọi phần mềm.

---

## Việc đầu tiên của mọi phiên

```bash
sh tools/install-hooks.sh                # từ gốc repo, dựng lại bộ điều phối hook
python3 -m http.server 8000              # fetch cần HTTP, mở file:// là trang rỗng
cat shop/HANDOFF.md                      # việc dở, việc chờ chủ trang
```

Rồi mở `http://localhost:8000/shop/`.

## Việc cuối của mọi phiên

```bash
sh shop/tools/check.sh
```

Một lệnh, hai tầng: cổng lint (cú pháp, dữ liệu, shell, liên kết) rồi **chạy thật trong trình
duyệt** (hành vi). Tầng hai mới là tầng bắt được hai lỗi nặng nhất từng xảy ra ở đây — cả hai
đều đi qua tầng một sạch sẽ. Xanh hết thì cập nhật `HANDOFF.md` (việc dở) và `HISTORY.md` (nhật
ký phiên) rồi commit; chủ repo vừa chốt điều gì thì ghi vào `DECISIONS.md`.

Giữa hai việc ấy thì cứ sửa — cổng tự chạy:

| Khi nào | Cái gì chạy | Nó bắt gì |
|---|---|---|
| Ngay sau mỗi Edit/Write trong `shop/` | `tools/hooks/post-edit.sh` | cổng lint — cú pháp, dữ liệu, shell, liên kết |
| Lúc `git commit` chạm `shop/` | `tools/hooks/pre-commit` | như trên, **kể cả** thay đổi viết bằng script |
| Lúc lên `main` / mở PR | `.github/workflows/gates.yml` | cổng lint **và** chạy thật trong trình duyệt |

`shop/` không có `pre-push`: commit nào đi qua bằng `--no-verify` thì chỉ còn CI bắt lại.

Có skill riêng cho thư mục này ở `.claude/skills/shop/` — phiên AI nào cũng nên nạp nó trước
khi sửa. Skill chỉ giữ thứ tự các bước; luật nằm ở file này.

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

**Giỏ hàng chỉ lưu cấu hình hộp quà, không lưu giá** (SHOP-003). Giá tính lại mỗi lần đọc, nên
đổi giá nến thì cái hộp đang nằm trong giỏ của khách cũng đổi theo.

### 3. Năm trang dùng chung một shell, và shell được SINH RA chứ không gõ lại

Nav, menu điện thoại, chân trang phải giống hệt nhau ở cả năm trang. Chỉ `is-active` và
`nav--over` được phép khác. Cổng so từng ký tự, và đòi cả năm trang nạp đủ `assets/shop.css` +
`assets/shop.js`.

Sửa shell thì **đừng sửa tay năm file**. Sửa một file rồi chạy lại script đồng bộ (xem
[docs/05-ARCHITECTURE.md](docs/05-ARCHITECTURE.md) mục *Shell sinh ra thế nào*).

### 4. Cổng mới phải nằm trong repo, không nằm trong đầu ai

Tìm ra một lớp lỗi mới → viết một phép kiểm chạy được vào `tools/lint-shop.py` → **thử ngược**
(cố tình phá, xem nó có kêu không) → ghi lại lỗi gốc trong comment của phép kiểm ấy.

Mọi cổng trong file đó đều đã thử ngược. Giữ nguyên tập quán này.

**Tài liệu không được hứa nhiều hơn cổng làm.** Mô tả một phép kiểm — ở file này, README hay
CLAUDE.md gốc — thì đọc code của nó trước; thêm hay bỏ một phép kiểm thì sửa mô tả cùng lúc.
Một phép kiểm được hứa mà không tồn tại là một cổng chết không ai biết.

---

## Tiền nằm ở quan hệ giữa các trường

Kiểm từng trường một chưa đủ: hoán đổi phí ship với ngưỡng miễn phí ship thì cả hai con số vẫn
nằm trong đoạn văn Giao hàng, từng phép kiểm riêng vẫn xanh, còn đơn 300.000 ₫ phải trả 500.000 ₫
tiền ship. `lint-shop.py` chặn commit khi:

- giá không phải số nguyên dương; giá gạch (`compare`) không lớn hơn giá bán; tồn kho âm;
- `labels.ship_fee` hay `labels.free_ship` không phải số nguyên dương, hoặc con số ấy không có
  trong đoạn văn `shipping` — giỏ hàng và đoạn Giao hàng phải nói cùng một giá;
- `ship_fee` ≥ `free_ship`;
- ngưỡng miễn phí ship quy ra ngoài **2–4 cây** nến rẻ nhất — dưới 2 thì đơn nào cũng được miễn
  và thanh "mua thêm bao nhiêu nữa" không bao giờ hiện, trên 4 thì không ai với tới;
- một mục băng chữ trang chủ (`marquee`) không khai `placeholder` — đó là lời khẳng định về sản
  phẩm của người khác, nên phải nói rõ đã xác nhận hay đang đoán;
- một cách thanh toán `ready: false` mà không liệt kê `need`; tài khoản ngân hàng `ready: true`
  mà thiếu trường, BIN không đủ 6 chữ số, hoặc số tài khoản ngoài 6–20 chữ số.

Tuyên bố an toàn sản phẩm (*"bấc cotton không lõi chì"*) chỉ chủ shop xác nhận được, không phải
người dựng trang — chưa xác nhận thì gỡ khỏi trang, đừng chỉ gắn cờ. Lằn ranh cùng loại ở
`docs/04-NEGOTIATION.md`: không ghi *"100% thiên nhiên"* khi không đúng.

---

## Thứ tự làm việc: dữ liệu trước, UI sau

1. Nội dung ra `data/shop.json` — chữ thuần, chưa có thẻ nào.
2. Rồi mới dựng UI, và UI *đọc* dữ liệu bằng vòng lặp.
3. Ghép, chạy cổng, chụp màn hình bằng trình duyệt thật, rồi mới ship.

Bước 3 không phải thủ tục. **Ba lỗi nặng nhất của thư mục này đều tìm ra bằng cách chạy thật
rồi đo, không phải bằng đọc code** — xem `STATUS-REPORT.md` mục 2 và
[docs/TECH-DEBT.md](docs/TECH-DEBT.md).

### Chạy thật: ba phép đo tối thiểu sau khi sửa

Cổng lint bắt được cú pháp và dữ liệu, **không** bắt được hành vi.

| Sửa gì | Đo thế nào |
|---|---|
| Giỏ hàng / tồn kho | Bấm **quá** số tồn rồi đọc toast. Toast phải nói sự thật, không được báo "đã thêm" khi bị chặn. |
| Hộp quà | Gói một hộp, thêm vào giỏ, rồi đọc `localStorage.getItem('scentsitive-cart')` — cấu hình phải còn nguyên. |
| Tìm mùi | Làm hết một lượt, xem `/shop/measure/` có bắn đủ sự kiện không. |

Lỗi chỉ lộ khi môi trường hỏng (font bị chặn, `localStorage` bị chặn) thì môi trường tốt xanh
mãi — phải **dựng lại** tình huống hỏng rồi đo, như `smoke.js` tự chặn tên miền font và
`localStorage`.

`smoke.js` tự dò Chromium: `CHROME_PATH`, `PLAYWRIGHT_BROWSERS_PATH`, `/opt/pw-browsers`, rồi cache
của Playwright trên cả ba hệ điều hành. Máy chưa có thì:

```bash
npm i -g playwright-core playwright && npx playwright install chromium
```

Trong container agent (`/opt/pw-browsers` đã có sẵn) thì **đừng** chạy `playwright install` —
trình duyệt nằm đó rồi. Thiếu công cụ thì tầng 2 thoát mã 2 và nói rõ là đã bỏ qua; nó **không**
làm cổng đỏ, nên đọc kỹ dòng cuối chứ đừng chỉ nhìn chữ *XONG*.

---

## Trang nào làm gì

| Trang | Việc của nó | Cổng có soi không |
|---|---|---|
| `index.html` | landing, dẫn thẳng sang mua (SHOP-006) | có |
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
một hệ thống. Các sự kiện hiện có đủ để dựng phễu Tìm mùi và biết khách rụng ở câu mấy — mà đó
đúng là con số mọi tiêu chí "bỏ tính năng này khi nào" trong `docs/02-ROADMAP.md` cần tới.

Dữ liệu nằm trong `localStorage` của **từng máy khách**; shop không thấy gì, hai máy không cộng
lại được. Số ở `/shop/measure/` là của máy đang mở, không phải của khách. Muốn gộp số thật thì
đổi `SINK` thành một URL — một dòng, đúng một chỗ — và dựng một hàm serverless nhận nó. Đừng bật
`SINK` khi chưa có trang nói rõ trang thu thập gì.

---

## Tìm mùi: chấm điểm bằng trọng số, và cổng duyệt hết tổ hợp

Mỗi đáp án mang một bộ trọng số trên khoá mùi (SHOP-002). Sửa một con số là lệch cả kết quả,
**và lệch không kêu** — trang vẫn chạy, vẫn ra một mùi, chỉ là mùi ấy sai.

Nên cổng duyệt **toàn bộ** tổ hợp đáp án và chặn commit nếu:

- có mùi **không bao giờ thắng** → cửa hàng có một mùi mà trang này không bao giờ giới thiệu;
- có mùi **thắng quá nửa** số tổ hợp → bộ câu hỏi chỉ là cái phễu đổ về một mùi;
- có đáp án **mọi trọng số bằng 0** → bấm vào nó không đổi gì;
- `tiebreak` không trỏ vào một câu có chấm điểm.

Mức XEM in ra phân bố hiện tại và số tổ hợp hoà mà câu phân xử cũng không gỡ được.
**Sửa trọng số thì chạy lại cổng và đọc dòng phân bố** — đừng đoán.

---

## Tài liệu trong `docs/`

- **Viết như thể chủ shop sẽ đọc.** Mọi thứ trong `shop/`, kể cả `docs/` và `*.md`, lên web
  công khai (SHOP-007). Đừng tự thêm `--exclude` vào `deploy.yml` — `check_publish` sẽ đỏ, và
  muốn giấu lại thì hỏi chủ repo.
- **Tên file tiếng Anh, nội dung tiếng Việt** (SHOP-008). Đổi tên thì sửa mọi chỗ trỏ tới —
  `check_docs` bắt liên kết markdown gãy, không bắt tên file nhắc bằng chữ trong comment.
- **Mọi con số mang nhãn nguồn**: *[đã kiểm: nguồn]* chỉ khi đã mở đúng trang ấy và đọc được
  con số; *[chưa kiểm]*; *[đoán — phải hỏi chị ấy]*. Quy ước đầy đủ ở cuối `docs/00`.
- **`docs/index.html` là bản đọc, không phải nguồn.** Chỗ nào lệch file markdown thì markdown
  đúng — sửa ở đó trước, rồi mới sửa trang.
- Để lại nợ thì ghi vào `docs/TECH-DEBT.md`, kèm cột *cắn khi nào*. Quyết định kỹ thuật mà người
  sau có thể hỏi "vì sao" thì viết một ADR trong `docs/adr/`, có điều kiện xét lại.

---

## Đừng làm những việc này

- **Đừng xây phần mềm quản lý bán hàng, kho hay đơn** (SHOP-004) — mua sẵn rẻ hơn nhiều lần.
- **Đừng nói "không phần mềm bán lẻ nào biết công thức nến"** — sai: phần mềm bán hàng đại trà đã
  có tính năng sản xuất trừ nguyên liệu theo định mức ([docs/06-VALUE-CHAIN.md](docs/06-VALUE-CHAIN.md)
  §5, ADR 0004 mục sửa).
- **Đừng hứa đồng bộ Shopee** trước khi xác minh shop có đủ điều kiện dùng API — Shopee giới hạn
  quyền dùng API theo hạng người bán.
- **Đừng bịa số uplift, và đừng tin số đang lưu hành.** Mọi con số kiểu "quiz tăng chuyển đổi
  40%" đều do chính công ty bán phần mềm quiz công bố, không có nhóm đối chứng; câu "McKinsey:
  bundling tăng AOV 20–35%" đã truy ngược và không có ấn phẩm nào đứng sau.
- **Đừng bịa đánh giá của khách.** Đánh giá giả trên một shop bán thật là lừa người mua.
- **Đừng đặt ô nhập số thẻ.** Trang tĩnh không được nhận số thẻ; cách nào chưa chạy được thì
  nút khoá kèm danh sách việc còn thiếu, không giả vờ có.
- **Đừng thêm CI, test tự động, TypeScript hay bước build chỉ vì thấy nên có.** Thêm khi có một
  lỗi thật mà các lớp cổng hiện có không bắt được — xem mục *Chỗ dừng lại* trong
  [docs/05-ARCHITECTURE.md](docs/05-ARCHITECTURE.md).

---

## Chỗ dễ sai, đã trả giá một lần

- **Đừng dùng `display:grid; place-items:center` cho phần tử có hơn một con.** Grid mặc định xếp
  theo hàng. Có cổng riêng cho việc này, sinh ra từ nút giỏ hàng bị xếp hai hàng.
- **Đừng neo tìm-thay vào một dòng xuất hiện ở hai hàm.** `renderCart()` và `boot()` cùng kết
  thúc bằng `if ($('#coLines')) renderCheckout();`. Một lần neo nhầm khiến hộp quà bị trả về
  mặc định sau mỗi lần giỏ đổi. Neo vào cả khối, và chạy thật để xác nhận.
- **Toast phải nói sự thật.** Không báo "đã thêm" khi tồn kho chặn. Đã có hai lỗi cùng loại
  (một ở sản phẩm, một ở hộp quà) — kiểm tra bằng cách bấm quá số tồn rồi đọc toast.
- **Thử ngược một lớp phòng thủ khi có nhiều lớp thì phá cái mà cả mấy lớp cùng dùng.** Phá riêng
  `addToCart` thì cổng tồn kho không kêu, vì lớp kẹp ở `renderCart` che mất; phá `remaining()` —
  thứ cả ba lớp cùng gọi — nó mới kêu.
- **Đừng thêm liên kết markdown tới file chưa tồn tại.** Markdown gãy thì im lặng — trên GitHub
  nó vẫn hiện như một liên kết thường. Có cổng (`check_docs`).
- **Đừng đặt đường dẫn có dấu sao kiểu `thư-mục-*/file` trong block comment JS.** Chuỗi `*/`
  đóng comment sớm và node báo SyntaxError ở một dòng cách đó rất xa.
- **Lời khuyên một cổng in ra cũng là một lời hứa — phải thử làm theo nó một lần.** `smoke.js`
  từng bảo "cài bằng `npm i -g playwright-core` rồi chạy lại"; làm đúng thế thì lần sau vẫn ra
  đúng câu ấy, vì `require()` không tìm trong `npm root -g`. Cổng sai kiểu này nguy hơn cổng đỏ:
  nó **im lặng bỏ qua** và người đọc tưởng đã kiểm.
- **`git commit --amend` chỉ khi chưa push, và phải `git fetch origin main` trước.** Repo này
  có nhiều phiên chạy song song — xem `CLAUDE.md` ở gốc.
