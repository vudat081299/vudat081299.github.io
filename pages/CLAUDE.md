# `pages/` — trang dạy học và tóm tắt sách

Mỗi trang là một file HTML tự chứa. Luật chung cho trang (giọng, giao diện, theme) ở
`.claude/rules/book-pages.md`, tự được nạp khi bạn đọc một trang.

## Trước khi sửa một trang

- `python3 tools/decisions.py find pages/<trang>.html` — chủ trang đã chốt gì cho trang này.
- Việc dở: `pages/HANDOFF.md`. Quyết định riêng từng trang: `pages/DECISIONS.md`.
- File dài: `grep -n '<h2\|<section id' pages/<trang>.html` rồi đọc từng đoạn.

## Thêm một trang

1. Tạo `pages/<tên-tiếng-anh>.html` theo `.claude/rules/book-pages.md`.
2. Thêm một mục vào `data/collection.json` (luật viết mục: `.claude/rules/home.md`). Không muốn có trên
   trang chủ thì khai vào `UNLISTED` (vẫn lên web) hoặc `WITHHELD` (không lên web) trong
   `tools/lint-collection.py`.
3. Trang nói những con số tính lại được thì thêm cổng kiến thức `pages/tools/verify-<tên>.py`.

## Cổng: `sh pages/tools/check.sh`

- `pages/tools/lint-pages.py`: lỗi HTML khách quan (danh sách ở `book-pages.md`, mục *Cổng tĩnh*).
- `pages/tools/verify-*.py`: cổng kiến thức, tính lại từng con số của một trang. `check.sh` tự chạy mọi
  file `verify-*.py`.
- Mỗi trang một cổng kiến thức. Hai trang anh em được chung một file, nhưng mỗi trang giữ bộ phép kiểm riêng.
- Cổng kiến thức kiểm cả luật (dòng JS then chốt), không chỉ con số. Viết xong thì thử ngược: sửa lệch một
  số phải thấy đỏ.
- Docstring đầu mỗi cổng nói nó kiểm gì; đọc trước khi sửa một trang có cổng.
