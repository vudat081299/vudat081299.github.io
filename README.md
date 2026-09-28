# vudat081299.github.io

Trang cá nhân trên GitHub Pages. Không phải một app duy nhất: nó là **một trang chủ (`index.html`)
trỏ tới nhiều project nhỏ độc lập**, phần lớn là HTML tĩnh viết tay, cộng đúng một app có build
(Cashy).

Live: <https://vudat081299.github.io>

## Cấu trúc

Bản đồ mọi project, và bộ file mỗi project phải có, nằm ở [CLAUDE.md](CLAUDE.md). File ấy viết
cho agent AI nhưng người đọc cũng dùng được. `python3 tools/lint-structure.py` giữ cho bản đồ khớp
với thư mục thật, nên đây không phải bản đồ thứ hai để quên cập nhật.

Trong mỗi project (và ở gốc):

| File | Để làm gì |
|---|---|
| `CLAUDE.md` | luật đang áp dụng cho project |
| `DECISIONS.md` | quyết định của chủ trang — tra theo file: `python3 tools/decisions.py find <đường dẫn>` |
| `HANDOFF.md` | việc đang dở, việc chờ chủ trang, nợ đã biết |
| `HISTORY.md` | nhật ký: chuyện đã xảy ra, vì sao một luật tồn tại |
| `tools/check.sh` | mọi cổng kiểm của project trong một lệnh |

## Chạy ở máy

```bash
python3 -m http.server          # ở gốc repo, rồi mở http://localhost:8000
sh tools/install-hooks.sh       # cài cổng git (chạy nhiều lần vô hại)
sh <project>/tools/check.sh     # chạy mọi cổng của một project
```

Nhiều trang đọc dữ liệu bằng `fetch`, nên mở bằng `file://` là trang rỗng. Cashy là app Vite: xem
`cashy/README.md`.

## Quy ước

- **Mỗi project tự chứa tài sản của nó** — ảnh, CSS, JS nằm trong thư mục của project. Hai ngoại
  lệ: `web-builder/web-builder.css` (nhiều trang link thẳng vào nó, sửa nó là đổi cả loạt trang), và
  ảnh của `poem/` lấy từ `portfolio/` (xem `poem/CLAUDE.md`).
- **Không đưa artifact dev ra gốc**: mọi thứ ở gốc mặc định là công khai (xem Deploy).
- Vendor library dùng CDN, đừng commit bundle vào repo.

## Deploy

`.github/workflows/deploy.yml` chạy **sau khi** workflow "Cổng chất lượng" (`gates.yml`) xanh trên
`main` — cổng đỏ thì web giữ bản cũ:

1. `pnpm build` trong `cashy/` → `_site/cashy/`
2. `pnpm build:wb` trong `cashy/` → `_site/cashy-wb/` (gallery component)
3. rsync toàn bộ gốc repo vào `_site/`, trừ các `--exclude` ghi trong workflow
4. Đẩy `_site/` lên GitHub Pages

- Mọi thứ ở gốc **mặc định là công khai**. Danh sách `--exclude` có cổng giữ hai chiều
  (`tools/lint-collection.py`, `shop/tools/lint-shop.py`) — đừng dọn tay.
- Repo **public**: `--exclude` chỉ chặn `vudat081299.github.io/…`; file vẫn đọc được trên github.com
  và qua `raw.githubusercontent.com`.
- Cấu hình một lần: Settings → Pages → Source = "GitHub Actions". Môi trường `github-pages` có danh
  sách nhánh được deploy **riêng** (Settings → Environments → github-pages → Deployment branches and
  tags), tách khỏi thiết lập nhánh mặc định. Nhánh deploy không có trong danh sách ấy thì job deploy
  hỏng ngay với 0 bước.
