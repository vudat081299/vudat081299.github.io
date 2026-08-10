# vudat081299.github.io

Trang cá nhân trên GitHub Pages. Không phải một app duy nhất — nó là **một cái hub
(`index.html`) trỏ tới nhiều dự án nhỏ độc lập**, phần lớn là HTML tĩnh viết tay,
cộng đúng một app có build (Cashy).

Live: <https://vudat081299.github.io>

## Cây thư mục

| Đường dẫn | Là gì |
|---|---|
| `index.html` | **Hub** — trang chủ, liệt kê mọi thứ đáng vào. Có tìm kiếm + phím tắt. Style bằng `web-builder/web-builder.css` |
| `pages/` | Các trang nội dung dài, một file HTML tự chứa mỗi trang (how-money-works, finance-econ-rulebook, structured-speaking, vietnamese-home-cooking, scooter-maintenance-guide, jazz-piano-theory). Trước 2026-08-02 chúng nằm ở root, nên URL cũ dạng `/<tên>.html` giờ **404** — vào từ hub |
| `cashy/` | App quản lý chi tiêu — **React 19 + TS + Vite**, thứ duy nhất trong repo cần build. Có `CLAUDE.md` + `docs/` riêng, đọc từ đó |
| `web-builder/` | Design system `wb-*` (CSS thuần, token-based, có dark mode) + trang docs component. **Hub và các trang trong `pages/` đều dùng CSS này** |
| `facts/` | Thư viện fact có kiểm chứng (HTML + `data/` JSON) |
| `json-analysis/` | Công cụ xem/sửa/so sánh JSON |
| `loto/`, `read-excel-file-to-table/` | Công cụ nhỏ, một trang |
| `masters-degree/` | Tài liệu môn cao học, chia theo môn. **`data-science-roadmap/` là trang dạy Data Science 84 bài — một file HTML 0,9 MB, và nó có `CLAUDE.md` + `TOC.md` + bộ cổng kiểm `tools/gate.mjs` riêng. ĐỌC `CLAUDE.md` TRƯỚC; đừng mở file HTML để tìm hiểu (tốn ~250k token), dùng `TOC.md` và `node tools/gate.mjs --show <id>`** |
| `poem/` | 7 bài thơ Việt. Tự chứa hoàn toàn: `main.js` (engine Truyện Kiều) + `style.css` + `assets/` nằm ngay trong thư mục |
| `portfolio/` | Portfolio + vài component thí nghiệm (GlassCard, ClockComponent, Universe…) |
| `stuff/` | **Gác xép.** Template Bootstrap gốc chưa sửa và thí nghiệm cũ (`app/`, `swift-docs-factory/`, `archive/`, `SRE.html`). Giữ trong git nhưng **không publish** — không link tới từ đâu cả |

## Quy ước

- **Mỗi dự án tự chứa tài sản của nó.** Không có thư mục `assets/` dùng chung ở root
  (đã bỏ 2026-08-02) — ảnh/CSS/JS của ai nằm trong thư mục của người đó. Ngoại lệ duy
  nhất được phép dùng chung là `web-builder/web-builder.css`.
- **Trang mới:** nếu là một trang HTML nội dung → bỏ vào `pages/`, link
  `../web-builder/web-builder.css`, rồi thêm một ô vào `index.html`. Nếu là công cụ
  nhiều file → thư mục riêng ở root có `index.html`.
- **Không đưa artifact dev ra root.** Spec/plan/BDD của Cashy nằm ở
  `cashy/docs/` + `cashy/features/` (nằm ở root là bị publish công khai).
- Vendor library thì dùng CDN, đừng commit bundle vào repo.

## Deploy

`.github/workflows/deploy.yml`, chạy mỗi lần push lên `main`:

1. `pnpm build` trong `cashy/` → `_site/cashy/`
2. `pnpm build:wb` trong `cashy/` → `_site/cashy-wb/` (gallery component)
3. rsync toàn bộ root vào `_site/`, **trừ** `.git`, `.github`, `.claude`, `cashy`,
   `stuff`, `.DS_Store`
4. Đẩy `_site/` lên GitHub Pages

Nghĩa là: mọi thứ ở root **mặc định là công khai**. Muốn giữ riêng thì để trong
`stuff/`, `cashy/`, hoặc thêm `--exclude` vào workflow.

## Nợ kỹ thuật đã biết

Link tương đối gãy sẵn, chưa sửa vì nằm ngoài phạm vi dọn cấu trúc:

- `read-excel-file-to-table/index.html` gọi `./Upload.js` và `./text.js` — **hai file
  không tồn tại**. Công cụ này đang được link từ hub, nên nhiều khả năng đang hỏng.
- `portfolio/GlassCard/index.html` thiếu `assets/img/img1..3.jpg`;
  `portfolio/ClockComponent/index.html` trỏ `../index.html` (thật ra là
  `index-portfolio.html`); `portfolio/TextInputCSS/index.html` thiếu `./script.js`.
- `web-builder/pages/layout.html` thiếu `bien-lai.jpg`; vài `href="…"` trong trang docs
  là placeholder cố ý. Xem thêm `web-builder/PENDING-FIXES.md`.
- Mọi thứ trong `stuff/` gãy tứ tung — đúng bản chất của nó, không cần sửa.
