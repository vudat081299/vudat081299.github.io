---
paths:
  - "index.html"
  - "data/**"
  - "tools/lint-collection.py"
  - "tools/smoke-index.js"
---

# Trang chủ — `index.html` + `data/collection.json`

Trang chủ là danh mục của cả site, và là project duy nhất không có thư mục riêng (GitHub Pages
bắt `index.html` nằm ở gốc). Vì thế luật của nó ở file này: Claude Code chỉ nạp file này khi đọc
tới một trong các đường dẫn ở phần `paths` phía trên. Quyết định của chủ trang về trang chủ nằm ở
`DECISIONS.md` gốc (nhóm "trang chủ"), việc dở ở `HANDOFF.md` gốc.

## Cấu trúc

- `index.html` **tự chứa**: một `<style>` riêng, prefix `ix-`, không `<link>` tới
  `web-builder.css`, không mặt chữ icon (REPO-003). Đừng "sửa giúp" bằng cách ráp lại vào bộ
  web-builder. Thư mục `web-builder/` vẫn là một mục trong danh mục và các trang khác vẫn dùng bộ
  ấy — quyết định này chỉ áp cho trang chủ.
- Mọi chữ **lặp** (section, mục, dòng môn học) nằm ở `data/collection.json`; chữ **độc nhất**
  (tiêu đề trang) ở lại HTML (REPO-001). Rail bên trái và chân trang dựng từ chính mảng
  `sections` — không có danh sách thứ hai để quên cập nhật.
- Trang đọc data bằng `fetch`, nên mở bằng `file://` là trang rỗng; đường lỗi của trang chỉ người
  dùng chạy `python3 -m http.server`.
- Chỉ trường có hậu tố `_html` được `innerHTML`, còn lại `textContent`/escape. Số suy ra được
  (số trang của một môn…) thì tính từ dữ liệu, đừng ghi tay.

## Cổng — `sh tools/smoke-index.js`

1. `python3 tools/lint-collection.py`: trường bắt buộc, phím tắt trùng, href chết, trang
   `pages/`/`cooking/` không có mục (mồ côi), và hai danh sách `WITHHELD` / `UNLISTED` ở dưới.
2. `node tools/smoke-index.js <url>`: mở trình duyệt thật và đo — tràn ngang ở nhiều bề rộng, mép
   trái của gạch section / mô tả / hàng có thẳng nhau không, tương phản chữ ở cả hai nền, lọc tìm
   kiếm, bàn phím (`/`, `Esc`, phím từng mục), mọi href mở được, và trang có lặng lẽ quay về
   `wb-*` không. Lint mù hoàn toàn với các lỗi này; chúng chỉ lộ khi đo trong trình duyệt.

## Viết mô tả (`desc`) của một mục, và của section

Mô tả **chỉ nói chủ đề** của trang, không kể bộ phận hay tính năng của trang (REPO-002):

| Cắt | Giữ |
|---|---|
| tính năng & bộ phận: `Interactive`, `Searchable`, `filter by`, `pop-ups`, `side drawer`, `tracked progress`, `(Anh/Việt)` | chủ đề: `từ hạt nhân tới hoá hữu cơ`, `pandas, SQL & Colab` |
| **đếm bộ phận trang**: `4 acts`, `16 mô hình tương tác`, `7 phần` | **đếm nội dung**: `~79 lối ngụy biện`, `50 nguyên tắc` |
| — | trang **công cụ** (Loto, Cashy, JSON Analysis, Web Builder): việc nó làm chính là chủ đề |

- `desc` của section nói **cái gì gom nhóm ấy lại**, không nói trang có bộ phận gì, không tả trang
  được vẽ thế nào.
- Luật này cũng nằm ở trường `note` trong `collection.json` — ngay chỗ người viết mục tiếp theo
  đang gõ. Ai viết mục mới cũng bắt chước các mục cũ, nên bộ mẫu quan trọng hơn luật: giữ các
  mục hiện có đúng luật.
- Mục cắt xong không còn chủ đề nào thì đọc tiêu đề thật của trang rồi viết, đừng bịa.
- Không có ngưỡng độ dài và lint không kiểm độ dài: câu có sát việc của cái ô hay không là việc
  của người viết; mọi ngưỡng chung đo ra đều là số bịa.

## Xếp mục

- **Một section = một trục.** `Tools` là thứ bạn *dùng*; các section khác là chủ đề bạn *đọc*.
  Đừng dựng lại một ô `Pages` chứa mọi thứ: trang không biết xếp đâu là dấu hiệu thiếu một
  section, không phải cớ để có một cái thùng.
- **Thứ tự trong một section:**
  1. section là lộ trình học (`Data & AI`, `Science`, `Thinking`, `Cooking`, `Master's`): cửa vào
     trước, kho tra cứu / đào sâu cuối — trang tự nhận "cho người mới" mở màn, kho tra cứu như
     `Fact` hay `Food Fundamentals` chốt hậu;
  2. section là cái kệ (`Tools`, `Everyday`, `Books`): cái hay với tay tới nhất trước;
  3. cùng một mức, không phân được đâu là cửa vào: cái gần việc chủ trang nhất trước.
- **Thứ tự các section** là quyết định của chủ trang, không suy ra được từ nội dung (REPO-005).
  Muốn đổi thì hỏi chủ trang, rồi ghi quyết định mới thay cho REPO-005.
- Cố ý không có luật, đừng đi tìm: ba môn cao học xếp tuỳ ý (REPO-006); `Cryptography` nằm trong
  `Science` dù là toán rời rạc — đổi thì phải đổi tên section.
- Luật thứ tự **không có cổng máy kiểm**, và đó là chủ ý: "cửa vào" không đo được bằng regex, cổng
  bịa ra cho nó sẽ đánh trượt nội dung thật.

## Phím tắt

- `key` là trường **tuỳ chọn**; keyspace `0-9a-z` có hạn. Mục không có `key` thì không vẽ chip
  phím (không vẽ chip rỗng) và mở bằng chuột hoặc ô tìm kiếm — `/` nhảy vào ô, `↵` mở kết quả đầu.
  Lint chỉ kiểm định dạng và trùng lặp **khi** có `key`.
- Đừng ép hai mục dùng chung một phím, và đừng xáo phím của mục cũ để lấp chỗ: phím tắt là thứ
  người dùng học thuộc, đổi nó là phá trí nhớ cơ bắp.
- Hết phím thì mục mới bỏ trường `key` — `python3 tools/lint-collection.py` in số phím đang dùng.

## Trang không niêm yết: `WITHHELD` và `UNLISTED` (trong `tools/lint-collection.py`)

Gỡ khỏi danh mục **không** phải gỡ khỏi web: `rsync` trong `deploy.yml` chép cả cây, nên trang bỏ
link vẫn mở được ở URL trực tiếp. Vì vậy có hai danh sách, mỗi danh sách một nghĩa:

| | Không link từ trang chủ | Không lên web | Cổng đòi `deploy.yml` |
|---|---|---|---|
| `WITHHELD` | ✓ | ✓ | CÓ `--exclude` cho nó |
| `UNLISTED` | ✓ | — (vẫn công khai, Google index được) | KHÔNG có `--exclude` |

- Cả hai: miễn kiểm trang mồ côi, và **cấm** quay lại `collection.json`.
- Một đường dẫn chỉ được nằm ở đúng một danh sách; cổng kiểm cả điều đó.
- `WITHHELD` cố ý không ghi lý do từng trang — repo public, một dòng lý do nằm cạnh đường dẫn thì
  chính nó là tấm biển chỉ đường. Các dòng trong đó theo quyết định của chủ trang; muốn bỏ một
  dòng thì **hỏi chủ trang**, đừng tự suy từ nội dung file (REPO-007).
- Đừng "dọn" bằng cách thêm `--exclude` cho một trang chỉ vì trang chủ không còn link tới nó —
  xem nó thuộc danh sách nào trước.
- Giới hạn cổng không bịt được: repo public, nên `--exclude` chỉ chặn `vudat081299.github.io/…`;
  file vẫn đọc được trên github.com. Lịch sử git vẫn giữ nội dung cũ — muốn xoá thật phải viết lại
  lịch sử, việc ấy phải hỏi chủ repo.

## Font

Xin font thì xin đúng thứ dùng: dải trọng lượng thừa nặng gấp đôi mà không hiện gì thêm. Nhưng
đừng ghim trục `opsz` của Fraunces cho rẻ — bản khắc cho cỡ chữ rất lớn làm tiêu đề section mảnh
như sợi tóc.
