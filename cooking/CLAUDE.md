# `cooking/` — trang bếp

Bốn trang công thức (Việt, Hàn, Âu mặn, bánh Âu) dùng chung một khung lọc / modal, cộng một trang
kiến thức nền `food-fundamentals.html` (explainer tĩnh: sơ đồ thịt/bò, nhiệt độ, kỹ thuật, rượu).
Luật chung cho mọi trang sách — giọng viết, giao diện, theme — nằm ở `.claude/rules/book-pages.md`,
được nạp khi bạn đọc một trang ở đây.

## Dữ liệu trước, giao diện sau

- Công thức là khối **lặp**, nên nằm ở `cooking/data/<trang>.json`, không nằm trong HTML (REPO-001).
  Thêm hay sửa một công thức là sửa file JSON; trang đọc nó bằng `fetch`.
- `fetch` cần HTTP: mở bằng `file://` là trang rỗng. Xem thử bằng `python3 -m http.server` ở gốc repo.
- Chỉ trường có hậu tố `_html` được `innerHTML`; còn lại là chữ thuần.
- `food-fundamentals.html` cố ý **không** tách data: nó là văn xuôi độc nhất, không có khối lặp.

## Cổng

`python3 cooking/tools/lint-cooking.py [file…] [-v]` — cùng bộ kiểm HTML với `pages/` (id trùng,
anchor gãy, asset thiếu, thẻ lệch, svg không tên, cây tiêu đề, aria-label), cộng kiểm mọi
`cooking/data/*.json`, cộng dòng "trang chị em" ở chân trang: mỗi trang phải trỏ tới **mọi** trang
còn lại trong thư mục. Phép ấy luôn chạy trên cả thư mục, vì thêm trang mới là làm sai trang cũ.
Hook pre-commit truyền tên file đang commit làm tham số, nên cổng phải chạy
đúng dù nhận `.json`, `.html`, cả hai, hay không tham số nào.

Thêm trang mới thì làm như `pages/CLAUDE.md` mục *Thêm một trang*: một mục trong
`data/collection.json`, không thì cổng trang chủ đỏ.
