# `cooking/` — trang bếp

- Bốn trang công thức (Việt, Hàn, Âu mặn, bánh Âu) dùng chung một khung lọc và modal.
  `food-fundamentals.html` là trang kiến thức nền, văn xuôi tĩnh.
- Luật chung cho trang (giọng, giao diện, theme): `.claude/rules/book-pages.md`.
- Công thức nằm ở `cooking/data/<trang>.json` (REPO-001); sửa công thức là sửa file JSON.
  `food-fundamentals.html` không tách data vì không có khối lặp.
- Trang đọc JSON bằng `fetch`, nên cần HTTP: `python3 -m http.server` ở gốc repo.
- Trong JSON, chỉ trường có tên kết thúc bằng `_html` được đưa vào `innerHTML`.
- Thêm trang: như `pages/CLAUDE.md`, mục *Thêm một trang*.

## Cổng: `sh cooking/tools/check.sh`

`cooking/tools/lint-cooking.py` chạy bộ kiểm HTML chung (`tools/htmlcheck.py`), kiểm mọi
`cooking/data/*.json`, và kiểm dòng "trang chị em" ở chân mỗi trang trỏ tới đủ mọi trang còn lại.
