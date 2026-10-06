# Quyết định — gốc repo

Quyết định chủ trang đã chốt cho trang chủ và cho những gì vắt qua nhiều project.
Tra theo file: `python3 tools/decisions.py find <file>`.

<!-- index:start -->
- REPO-001 · Nội dung trước, UI sau · `repo`
- REPO-002 · Mô tả trên trang chủ chỉ nói chủ đề · `data/collection.json`
- REPO-003 · Trang chủ tự chứa, không dùng bộ web-builder · `index.html`
- REPO-005 · Thứ tự 8 section của trang chủ · `data/collection.json`
- REPO-006 · Các môn cao học giữ thứ tự hiện có · `data/collection.json`
- REPO-007 · Danh sách WITHHELD do chủ trang quyết, không ghi lý do · `tools/lint-collection.py`, `.github/workflows/deploy.yml`
- REPO-008 · Trang sách: cắt câu không mang kiến thức · `pages/*.html`, `cooking/*.html`
- REPO-009 · Mỗi gạch đầu dòng một commit · `repo`
- REPO-010 · Mặc định khoảng 5–7 agent một đợt · `repo`
- REPO-011 · Quyết định, việc dở, nhật ký: ba file riêng · `repo`
- REPO-012 · Mỗi project có bộ file bắt buộc · `repo`
- REPO-013 · Luật ở trong repo, memory chỉ giữ thiết lập máy · `repo`
- REPO-014 · Deploy chỉ chạy sau khi CI xanh · `.github/workflows/deploy.yml`
- REPO-016 · Tiêu đề tab và tên trang trên thanh trên cùng bằng tiếng Anh · `pages/*.html`, `cooking/*.html`, `masters-degree/**/*.html`
- REPO-017 · Hai lớp cổng: commit và CI · `tools/hooks/pre-commit`, `**/tools/check.sh`, `.github/workflows/gates.yml`
- REPO-018 · Tài liệu .md viết ngắn và thẳng · `repo`
- REPO-019 · Không chặn force-push ở GitHub · `repo`
- REPO-020 · Trang chủ có một danh sách ẩn, hiện khi giữ `.` và `?` · `data/collection.json`, `index.html`

Sổ của từng project: [`cashy/DECISIONS.md`](cashy/DECISIONS.md), [`facts/DECISIONS.md`](facts/DECISIONS.md), [`masters-degree/data-science-roadmap/DECISIONS.md`](masters-degree/data-science-roadmap/DECISIONS.md), [`masters-degree/thesis-topic-selector/DECISIONS.md`](masters-degree/thesis-topic-selector/DECISIONS.md), [`pages/DECISIONS.md`](pages/DECISIONS.md), [`shop/DECISIONS.md`](shop/DECISIONS.md).
<!-- index:end -->

## REPO-001 · Nội dung trước, UI sau
08/09/2026 · `repo`

Khối lặp: chữ ở `data/*.json`, UI đọc bằng vòng lặp. Khối độc nhất: chữ ở HTML. Trang văn xuôi không tách.

## REPO-002 · Mô tả trên trang chủ chỉ nói chủ đề
08/09/2026 · `data/collection.json`

`desc` nói trang dạy gì, không kể trang có bộ phận hay tính năng gì. Đếm nội dung thì được ("~79 lối
ngụy biện"), đếm bộ phận trang thì không ("16 mô hình tương tác"). Trang công cụ: việc nó làm là chủ đề.

## REPO-003 · Trang chủ tự chứa, không dùng bộ web-builder
21/09/2026 · `index.html`

`index.html` có `<style>` riêng (prefix `ix-`), không link `web-builder.css`. Đừng ráp lại vào bộ.

## REPO-005 · Thứ tự 8 section của trang chủ
21/09/2026 · `data/collection.json`

`Everyday` · `Cooking` · `Book Summaries` · `Thinking & Communication` · `Tools` · `Science` · `Data & AI` ·
`Master's Degree`. Đừng tự đổi.

## REPO-006 · Các môn cao học giữ thứ tự hiện có
21/09/2026 · `data/collection.json`

Không có luật xếp, vì repo không có tín hiệu học kỳ.

## REPO-007 · Danh sách WITHHELD do chủ trang quyết, không ghi lý do
21/09/2026 · `tools/lint-collection.py`, `.github/workflows/deploy.yml`

Trang trong `WITHHELD` không có trên trang chủ và không lên web (`--exclude` trong `deploy.yml`). Không ghi
lý do, vì repo public. Đừng thêm hay bỏ dòng nào mà không hỏi chủ trang.

## REPO-008 · Trang sách: cắt câu không mang kiến thức
07/09/2026 · `pages/*.html`, `cooking/*.html`

Trang đọc như sách: cắt credit công cụ, câu nói với người đặt trang, câu tự khen trang, câu độn.
Chi tiết: `.claude/rules/book-pages.md`.

## REPO-009 · Mỗi gạch đầu dòng một commit
14/08/2026 · `repo`

Yêu cầu nhiều gạch thì mỗi gạch một commit, cổng xanh ở mọi commit, push một lần cuối.

## REPO-010 · Mặc định khoảng 5–7 agent một đợt
24/09/2026 · `repo`

Ước lượng trước khi sinh agent; chủ trang nói số khác thì theo số ấy. Phiên chính tự làm bước ghép và soát cuối.

## REPO-011 · Quyết định, việc dở, nhật ký: ba file riêng
28/09/2026 · `repo`

Quyết định ở `DECISIONS.md`, việc dở ở `HANDOFF.md`, nhật ký ở `HISTORY.md`. Mỗi quyết định ghi phạm vi.

## REPO-012 · Mỗi project có bộ file bắt buộc
28/09/2026 · `repo`

Bản đồ project và bảng file bắt buộc ở CLAUDE.md gốc; luật dựng trang ở `.claude/rules/`.
`tools/lint-structure.py` kiểm.

## REPO-013 · Luật ở trong repo, memory chỉ giữ thiết lập máy
28/09/2026 · `repo`

Luật, quyết định, việc dở, mẹo làm việc: commit vào repo. Memory chỉ giữ thiết lập riêng của một máy.
Chuyện riêng tư không lên repo. Không chắc ghi vào đâu thì hỏi chủ trang.

## REPO-014 · Deploy chỉ chạy sau khi CI xanh
28/09/2026 · `.github/workflows/deploy.yml`

Deploy chạy sau khi "Cổng chất lượng" xanh trên một lần push vào `main`, và chỉ khi commit ấy còn là đầu `main`.

## REPO-016 · Tiêu đề tab và tên trang trên thanh trên cùng bằng tiếng Anh
03/08/2026 · `pages/*.html`, `cooking/*.html`, `masters-degree/**/*.html`

Link điều hướng và thân trang giữ tiếng Việt. Ngoại lệ: `shop/` (cửa hàng cho khách Việt), `<title>` của data-science-roadmap
(DS-016), `web-builder/templates/` (bản chép từ kit gốc, đồng bộ sẽ ghi đè). Nguồn: 7db789b.

## REPO-017 · Hai lớp cổng: commit và CI
29/09/2026 · `tools/hooks/pre-commit`, `**/tools/check.sh`, `.github/workflows/gates.yml` · thay cho REPO-015

Cổng của mỗi project là `tools/check.sh`. Commit chạy cổng gốc và cổng của project bị chạm; CI chạy tất cả.
Không có hook sau mỗi lần sửa file, không có pre-push. Vì: bộ bốn lớp phức tạp quá mức, và CI đã chặn deploy.

## REPO-018 · Tài liệu .md viết ngắn và thẳng
29/09/2026 · `repo`

Mỗi dòng một ý, chỉ ghi luật đang áp dụng, không kể lịch sử. Cách viết: CLAUDE.md gốc, mục *Viết tài liệu*.

## REPO-019 · Không chặn force-push ở GitHub
29/09/2026 · `repo`

Chủ trang để `main` cho phép force-push. Agent vẫn phải hỏi trước khi force-push (CLAUDE.md gốc, mục Git).

## REPO-020 · Trang chủ có một danh sách ẩn, hiện khi giữ `.` và `?`
03/10/2026 · `data/collection.json`, `index.html`

Khoá `hold` trong `collection.json` là danh sách chỉ hiện khi giữ cùng lúc hai phím `.` và `?`, thả ra là mất. Trang trong đó vẫn
deploy; đây là giấu link, không phải bảo mật. Trong đó: Wealth Roadmap, Hidden Curriculum (PAGES-005), Scooter
Maintenance, Fact, Cashy, Loto, scentsitive.vn, Web Builder. Sáu mục sau chuyển hẳn từ `sections` sang
(03/10/2026): mất phím tắt, không còn ở chỗ cũ.
