# Repo này — luật chung cho mọi agent

Đây là một repo chứa **nhiều project con độc lập**, mỗi project có luật riêng trong
`CLAUDE.md` của chính nó. File này chỉ nói về thứ vắt ngang tất cả: **cổng chất lượng và
cách chúng chạy tự động**.

| Project | Luật riêng | Cổng | Lớp đang nối |
|---|---|---|---|
| `facts/` | [facts/CLAUDE.md](facts/CLAUDE.md) | `facts/tools/factlint.py check` + `verify` | 1, 2, 3, 4 |
| `masters-degree/data-science-roadmap/` | CLAUDE.md trong thư mục đó | `node tools/gate.mjs` | 1, 2, 3, 4 |
| `cashy/` | [cashy/CLAUDE.md](cashy/CLAUDE.md) | `node scripts/check-layers.mjs` + `oxlint` | 2, 4 |
| `index.html` (trang chủ) | file này, mục *Thứ tự làm một trang* | `python3 tools/lint-collection.py` (kiểm cả trang mồ côi trong `pages/`, `cooking/`) | 2, 4 |
| `pages/` | — | `python3 pages/tools/lint-pages.py` + `verify-math-for-ml.py` | 2, 4 |
| `cooking/` | — | `python3 cooking/tools/lint-cooking.py` | 2, 4 |
| `shop/` | [shop/CLAUDE.md](shop/CLAUDE.md) | `sh shop/tools/check.sh` | 1, 2, 3, 4 + chạy thật |
| các project khác | xem thư mục | — | 4 |

Lớp 4 phủ **mọi** project vì `.github/workflows/gates.yml` chạy tất cả các cổng trên, không
chỉ cổng của project vừa sửa. Riêng `shop/` có thêm một tầng mà cổng lint không có: `check.sh`
mở trình duyệt thật và bấm (`shop/tools/smoke.js`) — xem mục dưới.

`pages/` và `cooking/` không có CLAUDE.md riêng: mỗi trang là một tài liệu HTML tự
chứa, không có luật nội dung chung để viết ra. Cổng của chúng chỉ kiểm thứ đúng/sai khách quan —
id trùng, anchor gãy, asset thiếu, thẻ lệch.

`shop/` thì **có** (từ 20/09/2026), vì nó không còn là một trang tự chứa: năm trang dùng chung
một shell, toàn bộ nội dung nằm ở `data/shop.json`, và giá tiền được suy ra chứ không ghi tay —
ba thứ ấy là luật, và luật thì phải viết ra. Kèm theo là `shop/docs/`: lộ trình, ADR, sổ nợ, và
một bộ tài liệu định hướng kinh doanh cho việc đàm phán với chủ shop.

Ngoại lệ duy nhất trong `pages/`: `verify-math-for-ml.py` là cổng **kiến thức**, chỉ chạy khi
commit chạm `mathematics-for-machine-learning.html`. Trang ấy nói ~90 con số cụ thể (định thức,
trị riêng, tỉ lệ PCA, dãy Newton, xác suất nhị thức, phân vị t, p-value) và tự nhận với người
đọc là mọi con số tính được đều kiểm được bằng máy — nên phải có một script tính lại thật, chứ
không phải một lời hứa. `lint-pages.py` kiểm được thẻ lệch nhưng không biết `0,0546875` có phải
là P(X≥8 | n=10, p=0,5) hay không. Trang nào sau này cũng nói số cụ thể thì làm thêm một cổng
cùng kiểu, đừng nới cổng này ra thành cổng chung: mỗi trang có bộ số riêng. `shop/` cũng có một cổng riêng cùng kiểu vì cùng lý do: đó là một storefront, nơi sai một con
số thì khách trả nhầm tiền. `lint-shop.py` soi thẳng vào `shop/data/shop.json` — giá phải là số
nguyên dương, giá gạch phải lớn hơn giá bán, `cat` phải trỏ vào danh mục có thật, tag của bộ chọn
mùi phải khớp `mood` của ít nhất một sản phẩm, và `labels.ship_fee`/`free_ship` phải khớp con số
viết trong đoạn văn `shipping`. Nó còn kiểm chiều ngược lại: chữ của khối lặp KHÔNG được nằm trong
`index.html` (so theo text node, ngưỡng 0,40 — số đo được, xem comment trong file).

`cooking/` gồm bốn trang công thức (Việt, Hàn,
Âu mặn, Bánh Âu) dùng chung một khung filter/modal, cộng một trang kiến thức nền
(`food-fundamentals` — explainer tĩnh, sơ đồ SVG thịt/bò, nhiệt độ, kỹ thuật, rượu); tách
khỏi `pages/` để gom một chỗ, nên có cổng cùng bộ kiểm nhưng riêng thư mục.

Cổng `cashy/` cần Node ≥ 20 (oxlint cần ≥ 22). Node mặc định trên máy có thể là bản cũ do
fnm/nvm ghim, nên hook tự dò Homebrew thay vì tin vào `PATH` — nếu không nó sẽ "im lặng
pass" mà chẳng kiểm gì.

---

## Việc đầu tiên khi bắt đầu một phiên

```bash
sh facts/tools/install-hooks.sh
```

Chạy được nhiều lần, không hại gì. Nó dựng lại `.git/hooks/pre-commit` và `pre-push` thành
**bộ điều phối**. Bỏ bước này thì lớp cổng thứ hai không tồn tại trên máy bạn.

## Ba lớp cổng, và vì sao cần cả ba

| Lớp | Chạy khi | Bắt được gì | Đi theo repo |
|---|---|---|---|
| 1. `PostToolUse` | ngay sau mỗi Edit/Write | sửa bằng công cụ sửa file | có — `.claude/settings.json` |
| 2. `pre-commit` | lúc `git commit` | **mọi** thay đổi, kể cả viết bằng script | có — `*/tools/hooks/pre-commit` |
| 3. `pre-push` | lúc `git push` | trạng thái cuối của thứ sắp lên public | có |
| 4. GitHub Actions | lúc push lên `main` và mọi PR | thứ ba lớp trên bỏ sót vì chúng chạy trên **máy** người sửa | có — `.github/workflows/gates.yml` |

Lớp 1 phản hồi nhanh nhất nhưng **có lỗ**: thay đổi viết bằng `python3 - <<EOF` hay `sed`
không đi qua tool Edit/Write nên nó không thấy. Lớp 2 bịt lỗ đó. Lớp 3 bịt trường hợp
`--no-verify`, commit merge, và commit cũ được cherry-pick vào. Lớp 4 bịt cái mà cả ba lớp
kia không bịt được: chúng sống trên **máy** người sửa, nên chúng biến mất khi ai đó quên chạy
`install-hooks.sh`, khi commit tạo từ giao diện web của GitHub, hoặc khi một phiên agent chạy
ở môi trường khác. Lớp 4 chạy cổng của **mọi** project con chứ không chỉ project vừa sửa —
repo này có nhiều phiên chạy song song, và một thay đổi ở đây làm hỏng chỗ kia là chuyện đã xảy ra.

**Một thứ cả bốn lớp đều không bắt được: hành vi.** Cổng lint đọc cú pháp và dữ liệu; nó không
bấm nút. Hai lỗi nặng nhất từng xảy ra ở `shop/` đều đi qua lint sạch sẽ và chỉ lộ ra khi mở
trình duyệt thật rồi đo — nên `shop/` có thêm `tools/smoke.js`, và `check.sh` chạy cả hai tầng.
Project nào có logic chạy trong trình duyệt thì nên làm cùng kiểu.

## Quy tắc bất di bất dịch

1. **Cổng mới phải nằm trong repo, không nằm trong đầu ai.** Viết ra một script chạy được,
   đặt trong `<project>/tools/`, rồi nối vào một trong ba lớp trên.
2. **`.claude/settings.json` và `.claude/skills/` được theo dõi bởi git** (xem `.gitignore`).
   Thêm hook mới hay skill mới thì commit, đừng chỉ sửa trên máy mình — nếu không thì quy trình
   chỉ chạy trên đúng một máy. Phần còn lại của `.claude/` vẫn là cục bộ.
   Hiện có một skill: `.claude/skills/shop/` — quy trình làm việc trong `shop/`.
3. **Bộ điều phối gọi mọi `*/tools/hooks/pre-commit`** trong repo, và mỗi hook con tự lọc
   theo đường dẫn của nó. Thêm project mới thì chỉ cần đặt file đúng chỗ, không phải sửa
   bộ điều phối.
4. **Đừng cài hook bằng symlink trỏ vào một project.** Repo này có nhiều project; symlink
   làm project cài sau xoá mất cổng của project cài trước. Đó là lý do bộ điều phối tồn tại.
5. **Chạy `install-hooks.sh` của project con sẽ phá bộ điều phối** (nó đặt lại symlink).
   Chạy lại `facts/tools/install-hooks.sh` là xong.

## Bỏ qua cổng

`git commit --no-verify` và `git push --no-verify` vẫn dùng được, và đôi khi đúng là cần.
Nhưng bỏ qua rồi thì phải sửa ngay sau đó — cổng bị tắt lâu là cổng đã chết.

---

## Thứ tự làm một trang: nội dung trước, UI sau

**Tách file không làm câu sau tốt hơn — nói rõ để không ai trông đợi sai.** Đã đo trên chính
trang này: **12 trong 31 mô tả** đã nói về bộ máy của trang ("4 acts", "11 interactive models",
"Searchable", "decision tool"). `(Anh/Việt)` không phải ngoại lệ, nó **khớp giọng láng giềng** —
và trong file data láng giềng nằm sát nhau hơn nên áp lực bắt chước còn tăng.

Cái tách file mua được là **cả tập đọc được cùng lúc** (một màn hình, thay vì phải viết script
mới dump nổi 31 mô tả ra khỏi HTML) và **linter kiểm được cấu trúc**. Cần, nhưng chưa đủ: thứ
giữ chất lượng là **bộ mẫu nhất quán**, vì ai viết mục thứ 32 cũng bắt chước mục 1–31.

Ba bước, đúng thứ tự:

1. **Nội dung ra file dữ liệu riêng** (`data/*.json`), chữ thuần, chưa có thẻ nào. Viết ở đây
   thì 31 mô tả nằm cạnh nhau và cái lệch tự lộ — đó là toàn bộ lý do tách file.
2. **Rồi mới dựng UI**, và UI *đọc* dữ liệu bằng vòng lặp / query theo key.
3. **Ghép, chạy cổng, ship.**

**Luật chia chỗ — đếm được, không tranh luận được:** khối **lặp** → chữ ở data; khối **độc
nhất** → chữ ở HTML. `index.html` là ví dụ đã làm: 8 section + 31 ô + 6 dòng môn học đều lặp nên nằm ở
`data/collection.json`; tiêu đề trang chỉ có một nên ở lại HTML. Rail bên trái và ba cột
chân trang cũng dựng từ chính mảng `sections` ấy — không có danh sách mục thứ hai để quên
cập nhật. Trang văn xuôi độc nhất
(`pages/chemistry.html`, `how-money-works`…) **không** tách — chữ ở đó không lặp, JSON hoá chỉ
thêm một lớp indirection.

Ba thứ phải nhớ khi làm:

- **`fetch` cần HTTP.** Mở bằng `file://` là trang rỗng, nên mỗi trang đọc data phải có đường
  lỗi tử tế chỉ người dùng chạy `python3 -m http.server` (xem `index.html` và `facts/app.js`).
- **Chỉ trường có hậu tố `_html` được `innerHTML`**, còn lại `textContent` / escape. Mặc định
  data là chữ thuần.
- **Số liệu suy ra được thì đừng ghi trong data** — `subj__count` ("3 pages") tính từ
  `files.length`, không ai phải sửa tay khi thêm một dòng.

**Luật nội dung đã chốt cho `index.html` (08/09/2026):** mô tả **chỉ nói chủ đề của trang**,
không kể bộ phận hay tính năng của trang. Ba đường biên, đo được:

| Cắt | Giữ |
|---|---|
| tính năng & bộ phận: `Interactive`, `Searchable`, `filter by`, `pop-ups`, `side drawer`, `tracked progress`, `(Anh/Việt)` | chủ đề: `từ hạt nhân tới hoá hữu cơ`, `pandas, SQL & Colab` |
| **đếm bộ phận trang**: `4 acts`, `16 mô hình tương tác`, `7 phần` | **đếm nội dung**: `~79 lối ngụy biện`, `50 nguyên tắc` |
| — | trang **công cụ** (Loto, Cashy, JSON Analysis, Web Builder): việc nó làm chính là chủ đề |

Luật này cũng nằm ở trường `note` trong `data/collection.json` — ngay chỗ người viết mục tiếp
theo đang gõ, vì **ai viết mục thứ 32 cũng bắt chước mục 1–31**. Đó là lý do bộ mẫu quan trọng
hơn luật: đã rà cả 31 mô tả và sửa 12 cái vi phạm, để cái được bắt chước là cái đúng.

**Mở rộng 20/09/2026 — luật áp cho cả `desc` của section, và một luật sắp xếp.** `desc` của
section trước đây tự do hơn mục con nên vi phạm chính luật ấy ở ba chỗ: `lọc theo nguyên liệu,
loại món, độ khó` (Cooking), `each with interactive models` (Science), `Each subject is a card —
its rows are the pages inside that subject's folder` (Master's) — câu cuối còn tả cách trang
được vẽ. `desc` nói **cái gì gom nhóm ấy lại**, không nói trang có bộ phận gì.

Luật sắp xếp: **một section = một trục duy nhất.** `Tools` là thứ bạn *dùng*; bảy section còn
lại là chủ đề bạn *đọc*. Bản trước trộn hai trục — một ô `Pages` 12 mục chứa lẫn công cụ
(Loto, Cashy, JSON) với giáo trình (Debate, Psychology, English), cạnh những section chia theo
chủ đề. **Đừng dựng lại một ô `Pages` chứa mọi thứ:** trang nào không biết xếp đâu là dấu hiệu
thiếu một section, không phải cớ để có một cái thùng.

**Luật thứ tự (21/09/2026) — viết ra vì thiếu nó là thiếu thứ để bắt chước.** Bản 20/09 đã gom
nhóm đúng nhưng **không** nói gì về thứ tự, nên thứ tự trong section lệch nhau ngay trong cùng
một trang: `Cooking` xếp đúng (món hay nấu trước, `Food Fundamentals` — kho tra cứu — chốt hậu)
trong khi `Data & AI` xếp ngược chiều học và `Thinking` để kho tra cứu dẫn đầu. Bốn dòng:

1. Section là **lộ trình học** (`Data & AI`, `Science`, `Thinking`, `Cooking`, `Master's`):
   **cửa vào trước, kho tra cứu / đào sâu cuối.** `Machine Learning 101` tự mô tả *"cho người
   mới, không cần biết toán cấp ba"* → nó mở màn `Data & AI`, không phải ba khoá toán của
   Serrano. `Fact` và `Food Fundamentals` là kho tra cứu → chốt hậu section của chúng.
2. Section là **cái kệ** (`Tools`, `Everyday`, `Books`): **cái hay với tay tới nhất trước.**
3. Cùng một mức, không phân được đâu là cửa vào (`Science`): **cái gần việc chủ trang nhất
   trước** — vì vậy `Cryptography` đứng trước `Chemistry` / `Relativity`.
4. **Thứ tự 8 section phục vụ chủ trang, không phải khách.** Đây là bảng nhảy việc mở hằng
   ngày nên `Tools` đứng đầu; nếu trang đổi vai thành portfolio thì đảo lại thứ tự này *trước*,
   đừng vá từng mục.

Hai chỗ **cố ý** không có luật, đừng đi tìm: **ba môn cao học xếp tuỳ ý** (repo không có tín
hiệu học kỳ nào, cả bốn thư mục commit cùng ngày 08/09; chủ trang chốt giữ nguyên 21/09/2026),
và **`Cryptography` nằm trong `Science`** dù nó là toán rời rạc/CS chứ không phải khoa học tự
nhiên — đã cân nhắc và giữ, vì đổi thì phải đổi tên section.

Luật này **không có cổng máy kiểm**, và đó là chủ ý: "cửa vào" không đo được bằng regex, y như
độ dài mô tả ở dưới. Cổng bịa ra cho nó sẽ đánh trượt nội dung thật.

**Phím tắt: keyspace đã hết, và đã phải xử lý thật.** 36 ô phím (`0-9` + `a-z`) dùng hết ngày
20/09/2026; đúng hôm ấy `pages/wealth-roadmap.html` là mục thứ 37. Cách xử lý đã chốt: **`key`
là trường tuỳ chọn.** Mục không có `key` thì không vẽ chip phím (không vẽ chip rỗng), và mở bằng
chuột hoặc ô tìm kiếm — `/` nhảy vào ô, `↵` mở kết quả đầu. Linter chỉ kiểm định dạng và trùng
lặp **khi** có `key`. **Đừng ép hai mục dùng chung một phím** để giữ cho đủ bộ.

Cổng `tools/lint-collection.py` kiểm trường bắt buộc, phím tắt trùng, href chết. Từ 20/09/2026 nó kiểm thêm
một chiều nữa: mọi `.html` trong `pages/` và `cooking/` phải có một mục trỏ tới, vì
`family-insurance-benefits.html` và `jazz-piano-theory.html` đã viết xong mà nằm ngoài danh mục
nhiều tháng — trang vẫn mở được bằng URL trực tiếp nên không gì tự lộ ra. Muốn cố ý không niêm
yết thì ghi vào `ALLOW_UNLISTED` kèm lý do, đừng xoá cổng.

Nó **không** kiểm độ dài mô tả: đã đo lại 20/09/2026, 37 mô tả đang chạy dài 24→193 ký tự
(trung vị 78), mọi ngưỡng chung đều là số bịa. Câu có sát việc của cái ô hay không là việc của
người viết.

---

## Git: repo này có nhiều phiên chạy song song

Nhiều phiên agent cùng làm việc trên các project con khác nhau và **cùng push thẳng lên
`main`**. `HEAD` cục bộ của bạn có thể bị một phiên khác vượt mặt bất cứ lúc nào, kể cả
giữa hai lệnh của cùng một lượt làm việc.

**Trước mọi lệnh viết lại lịch sử — `commit --amend`, `rebase`, `reset --hard` — phải chạy:**

```bash
git fetch origin main -q && git log --oneline -3 && git rev-list --left-right --count origin/main...HEAD
```

Nếu `HEAD` không còn là commit bạn vừa tạo thì **dừng lại**. `--amend` không amend "commit
của tôi", nó amend "commit đang là HEAD" — và nếu phiên khác vừa commit lên trên, bạn sẽ
ghi đè message của họ mà không có cảnh báo nào.

Sự cố có thật ngày 09/08/2026: một lượt `--amend` nhằm sửa số liệu trong message của
`cf8df60` đã rơi trúng `943af04` của phiên khác. Phát hiện được trước khi push, gỡ bằng
`git reset --soft 943af04`. Nếu đã push kèm `--force` thì đó là mất dữ liệu thật.

Ba quy tắc rút ra:

1. **Đã push rồi thì đừng amend.** Sửa message bằng một commit mới nói rõ chỗ sai, hoặc hỏi
   chủ repo trước khi rebase và force-push.
2. **Force-push lên `main` luôn phải hỏi**, kể cả khi commit đó là của chính bạn — bạn không
   biết phiên khác đang ở đâu.
3. **`--force-with-lease` thay cho `--force`**, luôn luôn. Nó từ chối khi remote đã đổi.
