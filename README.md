# vudat081299.github.io

Trang cá nhân trên GitHub Pages: một trang chủ (`index.html`) trỏ tới nhiều project nhỏ độc lập, phần lớn
là HTML tĩnh viết tay, cộng một app có build (Cashy).

Live: <https://vudat081299.github.io>

## Cấu trúc

Bản đồ mọi project và bộ file của một project ở [CLAUDE.md](CLAUDE.md). Trong mỗi project:

| File | Để làm gì |
|---|---|
| `CLAUDE.md` | luật đang áp dụng |
| `DECISIONS.md` | quyết định của chủ trang (`python3 tools/decisions.py find <file>`) |
| `HANDOFF.md` | việc dở |
| `HISTORY.md` | nhật ký |
| `tools/check.sh` | cổng của project |

## Chạy ở máy

```bash
python3 -m http.server          # ở gốc repo, rồi mở http://localhost:8000
sh tools/install-hooks.sh       # bật hook commit, một lần cho mỗi bản clone
sh <project>/tools/check.sh     # chạy cổng của một project
```

Trang đọc dữ liệu bằng `fetch` nên cần HTTP. Cashy là app Vite: xem `cashy/README.md`.

## Quy ước

- Mỗi project giữ tài sản của nó trong thư mục của nó. Ngoại lệ: `web-builder/web-builder.css` (nhiều trang
  link vào) và ảnh của `poem/` lấy từ `portfolio/`.
- Thư viện ngoài dùng CDN, không commit bundle.

## Deploy

`.github/workflows/deploy.yml` chạy sau khi "Cổng chất lượng" xanh trên `main`:

1. build Cashy vào `_site/cashy/` và thư viện component vào `_site/cashy-wb/`;
2. chép cả gốc repo vào `_site/`, trừ các `--exclude` trong workflow;
3. đẩy `_site/` lên GitHub Pages.

- Mọi thứ ở gốc mặc định công khai. Danh sách `--exclude` có cổng giữ; đừng sửa tay.
- Repo public: `--exclude` chỉ chặn trên site, file vẫn đọc được trên github.com.
- Cấu hình một lần: Settings → Pages → Source = "GitHub Actions". Môi trường `github-pages` có danh sách
  nhánh được deploy riêng (Settings → Environments); thiếu nhánh trong đó thì job deploy hỏng với 0 bước.
