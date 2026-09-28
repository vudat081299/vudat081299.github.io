# `json-analysis/` — xem, sửa, tìm và so sánh JSON

Một trang, **`index.html`**: chế độ *Analyze* (dán JSON, kể cả JSON hỏng, xem cấu trúc, tìm trong
đó) và chế độ *Compare* (đặt hai bản JSON A/B cạnh nhau, chỉ ra chỗ khác). CSS riêng và JS nằm
inline trong `index.html`; file còn lại trong thư mục là bộ kit `web-builder.css` của riêng nó.

## Mở

Mở thẳng `index.html` là chạy: trang không `fetch` gì, mọi xử lý nằm trong trình duyệt. Mạng chỉ
cần cho font icon Material Symbols mà `web-builder.css` nạp từ Google Fonts.

## Cổng

**Không có.** Không hook, không CI nào kiểm `json-analysis/`. Sửa xong thì tự mở trang ra xem, ở
mọi chế độ, cả sáng lẫn tối, cả khổ điện thoại lẫn khổ rộng.

## Phụ thuộc

- **Kit riêng, cũ.** Trang link `web-builder.css` nằm ngay trong thư mục này — một bản chép cũ
  của kit, không có `--wb-version` — chứ không link `../web-builder/web-builder.css`. Hệ quả hai
  chiều: sửa kit chung **không** đổi gì ở đây, và các lỗi kit chung đã sửa thì ở đây vẫn còn. Việc
  trỏ trang sang kit chung đang nằm trong sổ nợ của kit:
  [../web-builder/PENDING-FIXES.md](../web-builder/PENDING-FIXES.md) mục B. Trỏ sang thì phải mở
  lại mọi chế độ mà xem, vì CSS riêng của trang được viết trên bản kit cũ.
- **Theme riêng.** Khoá `localStorage` là `jt-theme`, mặc định sáng, không theo hệ điều hành — khác
  khoá `hub-theme` mà các trang trong `pages/` và `cooking/` dùng chung, nên chọn nền tối ở trang
  khác không mang sang đây. Khoá khác của trang: `ja-mode` (chế độ đang mở), `jt-hist-hidden`.
- **Dùng nó:** trang chủ có một mục trỏ tới `json-analysis/` trong `data/collection.json` — đổi tên
  thư mục hay bỏ `index.html` thì `tools/lint-collection.py` đỏ vì href chết.
