# Repo này — luật chung

Repo có nhiều project con độc lập. File này chỉ ghi thứ áp cho mọi project. Luật riêng của một project
nằm ở CLAUDE.md trong thư mục của nó; Claude Code tự nạp file ấy khi bạn đọc một file trong thư mục đó.

## Bản đồ project

| Đường dẫn | Loại | Là gì |
|---|---|---|
| `index.html` | trang chủ | danh mục mọi trang, đọc từ `data/collection.json`; luật ở `.claude/rules/home.md` |
| `pages/` | bộ sưu tập | trang dạy học và tóm tắt sách, mỗi trang một file HTML |
| `cooking/` | bộ sưu tập | công thức nấu ăn và kiến thức bếp |
| `facts/` | project | thư viện fact có kiểm chứng |
| `shop/` | project | cửa hàng nến thơm |
| `cashy/` | project | app chi tiêu Vite + React, thứ duy nhất cần build |
| `masters-degree/data-science-roadmap/` | project | trang dạy Data Science |
| `masters-degree/thesis-topic-selector/` | project | bảng chấm và xếp hạng đề tài luận văn |
| `masters-degree/business-analytics/` | project | môn Business Analytics và đồ án |
| `masters-degree/system-analysis-design/` | project | đồ án Phân tích thiết kế hệ thống |
| `masters-degree/research-proposal-project/` | project | đề cương nghiên cứu, từ đồ án tới luận văn |
| `web-builder/` | project | design system `wb-*`; nhiều trang link thẳng vào `web-builder.css` |
| `json-analysis/` | project | công cụ xem, sửa, so JSON |
| `loto/` | project | thống kê và heatmap xổ số |
| `read-excel-file-to-table/` | project | đọc file Excel ra bảng |
| `poem/` | project | thơ Việt, engine Truyện Kiều |
| `portfolio/` | project | portfolio và component thử nghiệm |
| `stuff/` | gác xép | đồ cũ, không lên web, không link từ đâu |

Thư mục mới thì thêm một dòng ở đây; `tools/lint-structure.py` đỏ nếu thiếu.

## File của một project

- `CLAUDE.md` (bắt buộc): luật đang áp dụng. Tối đa 200 dòng, không ngày tháng, không nhật ký.
- `DECISIONS.md`: quyết định chủ trang đã chốt, mỗi mục ba dòng — khuôn ở đầu `tools/decisions.py`.
- `HANDOFF.md`: việc dở, chỉ bốn mục `ĐANG LÀM`, `CHƯA LÀM`, `NỢ`, `CHỜ CHỦ TRANG`. Hết việc thì xoá file.
- `HISTORY.md` (tuỳ chọn): nhật ký phiên, mới nhất trên đầu.
- `tools/check.sh` (nếu có cổng): mọi cổng của project, một lệnh.

Trang chủ không có thư mục riêng (GitHub Pages cần `index.html` ở gốc): luật ở `.claude/rules/home.md`,
quyết định và việc dở ở `DECISIONS.md` / `HANDOFF.md` gốc. Luật chung cho trang của `pages/` và `cooking/`:
`.claude/rules/book-pages.md`. Thêm một trang: làm theo `pages/CLAUDE.md`, mục *Thêm một trang*.

## Viết tài liệu (REPO-018)

- Mỗi dòng một ý. Câu ngắn, nói thẳng việc phải làm hoặc không được làm.
- Chỉ ghi luật đang áp dụng, lệnh chạy và đường dẫn. Không kể lịch sử, không "bản trước sai".
- "Vì sao" tối đa một câu, và chỉ khi thiếu nó người đọc sẽ làm sai.
- Không ví von, không in đậm cả câu. Điều cổng đã kiểm hay file khác đã ghi thì trỏ tới, đừng chép lại.

## Làm việc với chủ trang

- Chuyện kiến thức, số liệu, công thức: tự tra nguồn gốc và làm cho đúng, đừng hỏi. Chỉ hỏi điều chỉ chủ
  trang biết.
- Việc phát sinh ngoài mục đích của phiên: ghi vào HANDOFF, báo quy mô trước khi làm.
- Repo public và được deploy nguyên cây: không ghi tên người thật, nơi làm việc, tiền bạc, hay lý do một
  trang bị ẩn — kể cả trong commit message.
- Chủ trang chốt điều gì mới: ghi vào `DECISIONS.md` của project. Trước khi sửa một file:
  `python3 tools/decisions.py find <file>`.
- Memory của Claude Code chỉ nằm trên một máy: chỉ dùng cho thiết lập của máy ấy (REPO-013).
- Mẹo làm việc (nhiều agent, sửa hàng loạt, dẫn nguồn, đo trong trình duyệt): skill `agent-practices`.
- `.claude/settings.json`, `.claude/skills/`, `.claude/rules/` nằm trong git; phần còn lại của `.claude/` là
  cục bộ.

## Nội dung trước, UI sau (REPO-001)

- Khối lặp: chữ ở `data/*.json`, UI đọc bằng vòng lặp. Khối độc nhất: chữ ở HTML.
- `fetch` cần HTTP: trang đọc data phải báo rõ khi mở bằng `file://` (chạy `python3 -m http.server`).
- Chỉ trường có tên kết thúc bằng `_html` được đưa vào `innerHTML`.
- Số suy ra được thì tính, đừng ghi tay.

## Cổng (REPO-017)

- Cổng của một project là `<project>/tools/check.sh`; cổng của gốc là `tools/check.sh`.
- Commit: `tools/hooks/pre-commit` chạy cổng gốc và cổng của mọi project có file trong commit. Bật một lần
  cho mỗi bản clone: `sh tools/install-hooks.sh` (phiên Claude Code tự chạy lúc bắt đầu).
- Push lên `main`: CI chạy mọi cổng; deploy chỉ chạy khi CI xanh (REPO-014).
- Cổng không bấm nút. Trang có JS thì đo thêm trong trình duyệt thật: `tools/smoke-index.js`,
  `shop/tools/smoke.js` (CI chạy cả hai).
- Cổng mới: viết script trong `<project>/tools/`, gọi nó từ `tools/check.sh` của project. Không khai tên ở
  đâu khác.
- `--no-verify` chỉ dùng khi thật cần, và sửa ngay sau đó.

## Git

Nhiều phiên cùng push thẳng lên `main`; `HEAD` có thể bị phiên khác vượt bất cứ lúc nào.

- Pull trước khi làm. Làm trong worktree thì mọi lệnh trỏ vào worktree (`git -C "$WT" …`); checkout chính
  thường đang giữ việc dở của chủ trang.
- Trước `commit --amend`, `rebase`, `reset --hard`: chạy `git fetch origin main -q && git log --oneline -3`.
  `HEAD` không còn là commit của bạn thì dừng.
- Đã push thì đừng amend. Force-push lên `main` luôn phải hỏi chủ trang, và dùng `--force-with-lease`.
- Yêu cầu nhiều gạch đầu dòng: mỗi gạch một commit, cổng xanh ở mọi commit, push một lần cuối (REPO-009).
- File HTML dài: đừng đọc cả file. `grep -n '<h2\|<section id' <file>` rồi đọc từng đoạn.
