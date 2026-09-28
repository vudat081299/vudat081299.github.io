# Quyết định — gốc repo

<!-- decisions: prefix=REPO; nhóm=trang chủ, nội dung, cấu trúc, quy trình, xuất bản -->

Quyết định chủ trang đã chốt cho trang chủ, và cho những gì vắt qua nhiều project. Quyết định riêng
của một project nằm trong DECISIONS.md của project ấy — danh sách ở cuối mục lục. Định dạng và cách
tra: docstring của `tools/decisions.py`.

<!-- index:start -->
**trang chủ**
- REPO-002 — Mô tả một mục trên trang chủ chỉ nói chủ đề · `data/collection.json`
- REPO-003 — Trang chủ tự chứa, không dựng trên bộ web-builder · `index.html`
- REPO-004 — Tools đứng đầu trang chủ · `data/collection.json` _(đã thay bằng REPO-005)_
- REPO-005 — Thứ tự 8 section của trang chủ · `data/collection.json`
- REPO-006 — Ba môn cao học xếp tuỳ ý · `data/collection.json`

**nội dung**
- REPO-008 — Trang sách: cắt mọi câu không mang kiến thức · `pages/*.html`, `cooking/*.html`

**cấu trúc**
- REPO-001 — Nội dung trước, UI sau · `repo`
- REPO-011 — Quyết định, việc dở và nhật ký nằm ở ba file khác nhau · `repo`
- REPO-012 — Mỗi project có bộ file bắt buộc, và luật dựng trang nằm trong repo · `repo`
- REPO-015 — Cổng được tìm tự động, không khai tên bằng tay · `.github/workflows/gates.yml`, `pages/tools/run-verify.py`, `**/tools/check.sh`

**quy trình**
- REPO-009 — Mỗi gạch đầu dòng một commit · `repo`
- REPO-010 — Số agent chạy song song khoảng 5–7 · `repo`
- REPO-013 — Luật và trạng thái của repo nằm trong repo; memory chỉ giữ thiết lập của từng máy · `repo`

**xuất bản**
- REPO-007 — Danh sách WITHHELD do chủ trang quyết, không ghi lý do · `tools/lint-collection.py`, `.github/workflows/deploy.yml`
- REPO-014 — Deploy chỉ chạy sau khi cổng xanh · `.github/workflows/deploy.yml`

**Các file quyết định trong repo** — tra theo file: `python3 tools/decisions.py find <đường dẫn>`

- `DECISIONS.md` — mã `REPO-…`
- `pages/DECISIONS.md` — mã `PAGES-…`
<!-- index:end -->

### REPO-001 — Nội dung trước, UI sau
- **Ngày:** 08/09/2026
- **Phạm vi:** repo
- **Nhóm:** cấu trúc
- **Trạng thái:** đang áp dụng
- **Quyết định:** Làm trang nào cũng theo thứ tự: nội dung ra file dữ liệu riêng (`data/*.json`,
  chữ thuần) → dựng UI đọc dữ liệu bằng vòng lặp → ghép, chạy cổng, ship. Khối lặp thì chữ ở data,
  khối độc nhất thì chữ ở HTML; trang văn xuôi độc nhất không tách. Cơ chế là `fetch` file `.json`
  rời, chấp nhận `file://` không chạy, không có build step.
- **Vì sao:** cả tập nằm cạnh nhau thì cái lệch tự lộ, và linter kiểm được cấu trúc.
- **Nguồn:** commit 4dd36eb; trang chủ và bốn trang công thức của cooking/ được chuyển sang lối này
  cùng đợt.

### REPO-002 — Mô tả một mục trên trang chủ chỉ nói chủ đề
- **Ngày:** 08/09/2026
- **Phạm vi:** data/collection.json
- **Nhóm:** trang chủ
- **Trạng thái:** đang áp dụng
- **Quyết định:** `desc` của một mục chỉ nói chủ đề của trang, không kể bộ phận hay tính năng của
  trang. Đếm nội dung thì giữ ("~79 lối ngụy biện"), đếm bộ phận trang thì cắt ("16 mô hình tương
  tác"); trang công cụ thì việc nó làm chính là chủ đề.
- **Vì sao:** người đọc quét danh sách để quyết định có mở trang không; và lỗi này lây — ai viết mục
  mới cũng bắt chước mục cũ, nên bộ mẫu phải đúng.
- **Đừng:** quay lại bản luật hẹp hơn ("bỏ chữ ấy đi câu có sai không") — chủ trang đã bác, vì nó chỉ
  bắt chữ thừa mà cho qua một mô tả đặc chữ nhưng kể sai việc.
- **Nguồn:** commit 91246d3 (rà cả danh mục, sửa mọi mục vi phạm).

### REPO-003 — Trang chủ tự chứa, không dựng trên bộ web-builder
- **Ngày:** 21/09/2026
- **Phạm vi:** index.html
- **Nhóm:** trang chủ
- **Trạng thái:** đang áp dụng
- **Quyết định:** Chủ trang yêu cầu thiết kế lại trang chủ mà không dùng bộ web-builder. `index.html`
  có `<style>` riêng, prefix `ix-`, không link `web-builder.css`, không mặt chữ icon.
- **Đừng:** "sửa giúp" bằng cách ráp lại vào bộ. Các trang khác vẫn dùng bộ web-builder — quyết định
  này chỉ áp cho trang chủ.
- **Nguồn:** commit 9aea319.

### REPO-004 — Tools đứng đầu trang chủ
- **Ngày:** 20/09/2026
- **Phạm vi:** data/collection.json
- **Nhóm:** trang chủ
- **Trạng thái:** đã thay bằng REPO-005
- **Quyết định:** Section `Tools` đứng đầu, vì coi trang chủ là bảng nhảy việc mở hằng ngày.
- **Nguồn:** CLAUDE.md gốc bản 21/09/2026 ("Bản 20/09 xếp Tools đầu…; chủ trang đổi ý ngày 21/09").

### REPO-005 — Thứ tự 8 section của trang chủ
- **Ngày:** 21/09/2026
- **Phạm vi:** data/collection.json
- **Nhóm:** trang chủ
- **Trạng thái:** đang áp dụng
- **Thay cho:** REPO-004
- **Quyết định:** `Everyday` · `Cooking` · `Book Summaries` · `Thinking & Communication` · `Tools` ·
  `Science` · `Data & AI` · `Master's Degree`.
- **Vì sao:** thứ tự section không suy ra được từ nội dung. Cách đọc được từ chính thứ tự ấy — đời
  thường trước, chuyên sâu sau, `Tools` ở bản lề — là cách đọc, không phải lý do chủ trang nói ra.
- **Đừng:** tự đổi. Muốn đổi thì hỏi chủ trang, rồi ghi một quyết định mới thay cho mục này.
- **Nguồn:** commit e785509 ("xếp lại thứ tự 8 section theo chốt mới của chủ trang").

### REPO-006 — Ba môn cao học xếp tuỳ ý
- **Ngày:** 21/09/2026
- **Phạm vi:** data/collection.json
- **Nhóm:** trang chủ
- **Trạng thái:** đang áp dụng
- **Quyết định:** Các môn trong section `Master's Degree` giữ nguyên thứ tự hiện có; không có luật xếp.
- **Vì sao:** repo không có tín hiệu học kỳ nào để xếp theo.
- **Nguồn:** CLAUDE.md gốc bản 21/09/2026 ("chủ trang chốt giữ nguyên").

### REPO-007 — Danh sách WITHHELD do chủ trang quyết, không ghi lý do
- **Ngày:** 21/09/2026
- **Phạm vi:** tools/lint-collection.py, .github/workflows/deploy.yml
- **Nhóm:** xuất bản
- **Trạng thái:** đang áp dụng
- **Quyết định:** Chủ trang cho gỡ một số trang khỏi danh mục và khỏi web; chúng nằm trong `WITHHELD`
  của `tools/lint-collection.py`, có `--exclude` tương ứng trong `deploy.yml`. Danh sách không ghi lý
  do từng trang.
- **Vì sao:** repo public — một dòng lý do nằm cạnh đường dẫn thì chính nó là tấm biển chỉ đường.
- **Đừng:** bỏ một dòng khỏi danh sách, đưa trang ấy lại lên trang chủ, hay tự suy lý do từ nội dung
  file. Muốn đổi thì hỏi chủ trang.
- **Nguồn:** commit d59473c, 3c97418 ("theo yêu cầu chủ trang").

### REPO-008 — Trang sách: cắt mọi câu không mang kiến thức
- **Ngày:** 07/09/2026
- **Phạm vi:** pages/*.html, cooking/*.html
- **Nhóm:** nội dung
- **Trạng thái:** đang áp dụng
- **Quyết định:** Mỗi trang trong `pages/` và `cooking/` đọc như một quyển sách bản web có tương tác —
  không phải blog, không phải trang marketing, không phải bản ghi cuộc trò chuyện đã sinh ra nó. Cắt
  credit công cụ dựng trang, câu đối thoại với người đặt hàng, câu tự khen trang, và filler / caption
  lặp. Chi tiết cách cắt ở `.claude/rules/book-pages.md`.
- **Vì sao:** chủ trang đọc thấy nhiều câu như thế mà không nhớ vị trí, nên yêu cầu rà cả loạt trang.
- **Nguồn:** yêu cầu của chủ trang ngày 07/09/2026; commit e8d4d8b là một lượt cắt trong đợt ấy.

### REPO-009 — Mỗi gạch đầu dòng một commit
- **Ngày:** 14/08/2026
- **Phạm vi:** repo
- **Nhóm:** quy trình
- **Trạng thái:** đang áp dụng
- **Quyết định:** Yêu cầu gồm nhiều gạch đầu dòng thì mỗi gạch là một commit riêng, không gộp; cổng xanh
  ở mọi commit; push một lần ở cuối. Gạch nào chỉ nói *cách làm* (ví dụ "chạy song song bằng
  subagent") thì không phải một commit.
- **Vì sao:** các gạch thường độc lập; gộp lại thì không revert hay review riêng được, và message không
  tả đúng được cái nào.
- **Nguồn:** lời chủ trang: "Mỗi gạch đầu dòng là 1 commit chứ không được commit chung tất cả nhé".

### REPO-010 — Số agent chạy song song khoảng 5–7
- **Ngày:** 24/09/2026
- **Phạm vi:** repo
- **Nhóm:** quy trình
- **Trạng thái:** đang áp dụng
- **Quyết định:** Tổng số agent cho một đợt việc mặc định khoảng 5–7, ước lượng trước khi sinh. Agent
  review sửa luôn phần của mình; bước tích hợp và soát cuối do phiên chính tự làm.
- **Vì sao:** mỗi agent tốn quota thật của chủ trang; chạy song song không làm tổng tiêu thụ ít đi.
- **Nguồn:** lời chủ trang: "nhiều agent quá sợ không đủ quota, ít hơn được không, khoảng 5,6,7 thôi".

### REPO-011 — Quyết định, việc dở và nhật ký nằm ở ba file khác nhau
- **Ngày:** 28/09/2026
- **Phạm vi:** repo
- **Nhóm:** cấu trúc
- **Trạng thái:** đang áp dụng
- **Quyết định:** Quyết định của chủ trang ra khỏi HANDOFF.md và CLAUDE.md, vào DECISIONS.md của từng
  project; HANDOFF.md chỉ còn việc dở; nhật ký phiên vào HISTORY.md. Mỗi quyết định ghi phạm vi (áp
  vào file nào) và nhóm, có mục lục sinh tự động; file ở gốc có thêm danh sách mọi file quyết định.
- **Vì sao:** quyết định nằm lẫn trong nhật ký thì không ai tìm lại được, và bị ghi trùng ở nhiều chỗ.
- **Nguồn:** yêu cầu của chủ trang trong phiên rà kiến trúc ngày 28/09/2026.

### REPO-012 — Mỗi project có bộ file bắt buộc, và luật dựng trang nằm trong repo
- **Ngày:** 28/09/2026
- **Phạm vi:** repo
- **Nhóm:** cấu trúc
- **Trạng thái:** đang áp dụng
- **Quyết định:** CLAUDE.md gốc có bản đồ mọi project và bảng file bắt buộc của một project (CLAUDE.md,
  DECISIONS.md, HANDOFF.md, HISTORY.md, tools/check.sh); luật dựng một trang mới nằm trong repo
  (`.claude/rules/`), không nằm trong skill cá nhân; `tools/lint-structure.py` kiểm phần đo được.
- **Vì sao:** thiếu một hợp đồng viết ra thì mỗi project tự nghĩ một lối, và ai viết project mới cũng
  chép lối của project gần nhất. Luật dựng trang từng nằm trong một skill cá nhân ngoài repo, nên máy
  khác không có.
- **Nguồn:** yêu cầu của chủ trang ngày 28/09/2026.

### REPO-013 — Luật và trạng thái của repo nằm trong repo; memory chỉ giữ thiết lập của từng máy
- **Ngày:** 28/09/2026
- **Phạm vi:** repo
- **Nhóm:** quy trình
- **Trạng thái:** đang áp dụng
- **Quyết định:** Chỉ ghi lại thứ còn giá trị về sau — đủ cả bốn điều: một phiên sau sẽ cần nó; nó
  không đọc được từ code hay git log; nó không riêng tư; và nó vẫn còn đúng (đã kiểm lại). Chuyện chỉ có
  nghĩa trong một cuộc trò chuyện thì không ghi ở đâu cả. Với những gì đạt, chủ trang phân loại:
  - luật, quyết định, việc dở của một project → commit vào CLAUDE.md / DECISIONS.md / HANDOFF.md của project ấy;
  - thói quen làm việc của chủ trang (không bí mật) → commit vào DECISIONS.md gốc;
  - mẹo làm việc chung → commit vào skill `agent-practices`;
  - mẹo kỹ thuật riêng của một trang → commit thành comment ngay trong code của trang ấy;
  - thiết lập chỉ đúng cho một máy (đường dẫn, cách cài công cụ) → giữ trong memory của máy ấy;
  - chuyện riêng tư → không lên repo public; ghi chú riêng tư của việc đã xong thì xoá.
  Phân loại một ghi chú mới mà không chắc thuộc nhóm nào thì **hỏi chủ trang**, kèm đủ bối cảnh để quyết.
- **Vì sao:** chủ trang làm việc trên nhiều máy; luật nằm trong memory của một máy thì máy kia không
  biết, và memory không ai kiểm nên trạng thái trong đó cũ dần.
- **Nguồn:** câu trả lời của chủ trang ngày 28/09/2026, từng nhóm một.

### REPO-014 — Deploy chỉ chạy sau khi cổng xanh
- **Ngày:** 28/09/2026
- **Phạm vi:** .github/workflows/deploy.yml
- **Nhóm:** xuất bản
- **Trạng thái:** đang áp dụng
- **Quyết định:** `deploy.yml` chạy sau khi workflow "Cổng chất lượng" (`gates.yml`) xong và xanh trên
  `main`, thay vì chạy song song với nó.
- **Vì sao:** chạy song song thì cổng đỏ lúc trang hỏng đã lên web rồi — lớp 4 chỉ báo, không chặn.
- **Nguồn:** chủ trang đồng ý ngày 28/09/2026.

### REPO-015 — Cổng được tìm tự động, không khai tên bằng tay
- **Ngày:** 28/09/2026
- **Phạm vi:** .github/workflows/gates.yml, pages/tools/run-verify.py, **/tools/check.sh
- **Nhóm:** cấu trúc
- **Trạng thái:** đang áp dụng
- **Quyết định:** Mỗi project có cổng thì có `tools/check.sh`; GitHub Actions chạy mọi `*/tools/check.sh`
  nó tìm thấy. Mỗi `pages/tools/verify-*.py` khai trang nó kiểm ở dòng `PAGES`; hook và CI tự tìm.
- **Vì sao:** thêm một cổng từng phải khai tên ở ba nơi (hook, gates.yml, CLAUDE.md), và đã có lần quên
  — hai cổng verify-* sống vài tuần chỉ trên máy người viết.
- **Nguồn:** chủ trang đồng ý ngày 28/09/2026.
