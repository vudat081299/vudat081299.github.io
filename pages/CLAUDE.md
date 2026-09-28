# `pages/` — bộ sưu tập trang dạy học

Mỗi trang ở đây là một file HTML tự chứa. Luật chung cho **mọi** trang sách — giọng viết, giao
diện, theme, cách rà — nằm ở `.claude/rules/book-pages.md`, được nạp cùng lúc với file này khi bạn
đọc một trang. File này chỉ ghi thứ riêng của `pages/`: cổng, cách thêm trang, và chỗ tra quyết
định.

## Trước khi sửa một trang

```bash
python3 tools/decisions.py find pages/<trang>.html   # chủ trang đã chốt gì cho trang này
python3 tools/toc.py pages/<trang>.html              # bản đồ mục — đừng Read cả file
```

Việc đang dở và việc chờ chủ trang: `pages/HANDOFF.md`. Quyết định riêng từng trang:
`pages/DECISIONS.md` (mục lục theo tên trang). Quyết định áp cho cả `pages/` lẫn `cooking/` nằm ở
`DECISIONS.md` gốc.

## Thêm một trang

1. Tạo `pages/<tên-tiếng-anh>.html` theo `.claude/rules/book-pages.md`.
2. Thêm một mục vào `data/collection.json` — luật viết mục ở `.claude/rules/home.md`. Không muốn
   trang có mặt trên trang chủ thì khai nó vào `UNLISTED` (vẫn lên web) hoặc `WITHHELD` (không lên
   web) trong `tools/lint-collection.py` — thiếu cả ba thì cổng trang chủ đỏ.
3. Trang nói những con số tính lại được thì thêm một cổng kiến thức `pages/tools/verify-<tên>.py`
   (mục dưới).
4. Chủ trang chốt gì riêng cho trang ấy thì ghi vào `pages/DECISIONS.md`, Phạm vi = đường dẫn trang.

## Cổng

**`python3 pages/tools/lint-pages.py [trang…] [-v]`** — cổng tĩnh chung (chi tiết những gì nó kiểm
ở `.claude/rules/book-pages.md`). Ba phép kiểm svg / cây tiêu đề / aria-label chạy theo kiểu **bánh
cóc**: bảng `DEBT` trong script ghi đúng số đang nợ của từng trang. Trang không có tên trong bảng
thì phải bằng 0; trang có tên thì chỉ được giữ nguyên hoặc giảm — tăng là lỗi. Dọn xong một trang
thì **xoá dòng của nó**, đừng nới số lên. Nợ nằm trong repo, và không trang sạch nào tụt lại được.

**`pages/tools/verify-*.py`** — cổng **kiến thức**, mỗi trang nói số cụ thể một cổng. `lint-pages`
kiểm được thẻ lệch nhưng không biết `0,0546875` có phải P(X≥8 | n=10, p=0,5) hay không; trang tự
nhận với người đọc rằng mọi con số đều kiểm được bằng máy thì phải có một script tính lại thật.

- **Mỗi trang một cổng**, đừng nới một cổng ra thành cổng chung: mỗi trang có bộ số riêng. Hai trang
  anh em được dùng chung một file để khỏi chép hàm trợ giúp, nhưng mỗi trang giữ bộ phép kiểm viết
  tay riêng.
- Đầu mỗi cổng khai trang nó kiểm: `PAGES = ['pages/<trang>.html', …]`. Hook pre-commit và GitHub
  Actions **tự tìm** mọi `verify-*.py` — hook chỉ chạy cổng có trang (hoặc chính file cổng) nằm
  trong commit, CI chạy tất cả. Thêm cổng mới là xong, không phải khai tên ở đâu khác.
- Docstring đầu file nói cổng kiểm gì và vì sao. Đọc nó trước khi sửa một trang có cổng; sửa xong
  thì chạy lại.
- Cổng tốt kiểm cả **luật**, không chỉ con số: một dòng JS then chốt đổi thứ tự là trang vẫn hiện
  số đẹp mà kết luận sai. Viết xong cổng thì **thử ngược** — sửa lệch một con số, dời dòng then
  chốt — và thấy nó đỏ thật.
- Số phép kiểm do cổng tự in khi chạy; đừng chép con số ấy vào tài liệu.
