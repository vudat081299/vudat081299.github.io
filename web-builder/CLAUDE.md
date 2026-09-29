# `web-builder/` — design system `wb-*` và trang tài liệu của nó

- `web-builder.css`: cả bộ kit trong một file — token `--wb-*`, component `wb-*`, nền tối bằng class `.dark`
  trên `<html>`. Phiên bản: `var(--wb-version)`.
- Trang tài liệu: `index.html` + `app.js` + `docs.css`. `#/<id>` nạp `pages/<id>.html`; mảng `SECTIONS` đầu
  `app.js` giữ mọi id. Mỗi component có một trang demo (chỉ markup). `templates/` là trang mẫu đầy đủ.
- `PENDING-FIXES.md`: sổ nợ của kit, kèm cách kiểm lại sau mỗi lần đồng bộ.
- Thư mục này chép từ repo nguồn của kit: tài liệu nhắc `SKILL.md`, `serve.py`, `references/`,
  `validate-sync`, `/wb-change` — không thứ nào có ở đây, đừng đi tìm.
- Mở: cần HTTP (`app.js` dùng `fetch`) — `python3 -m http.server` ở gốc, rồi `/web-builder/#/<id>`.
- Không có cổng. Sửa `web-builder.css` là sửa mọi trang link nó, mà cổng của các trang chỉ đọc HTML: trước
  khi commit, mở vài trang đại diện ở 320 / 390 / 1280, sáng và tối (`PENDING-FIXES.md`, mục *Kiểm lại*).

## Phụ thuộc

- Kit `@import` font icon Material Symbols từ Google Fonts.
- Trang trong `pages/`, `cooking/`, `facts/`, `masters-degree/` link `../web-builder/web-builder.css`; liệt kê:
  `git grep -l web-builder/web-builder.css -- '*.html'`. Trang chủ cố ý không dùng kit.
- Hai bản chép không đồng bộ theo: `cashy/src/styles/web-builder.css` cố ý lệch, đừng sync;
  `json-analysis/web-builder.css` là bản cũ (`PENDING-FIXES.md`, mục B).

## Dựng giao diện bằng `wb-*`

- Chép markup từ trang demo `pages/<id>.html` của đúng component, đừng tự ráp class theo mô tả.
- `.wb-navbar__actions` chỉ chứa nút icon (slot ấy không gập). Nút có chữ đặt cuối `__menu`, sau một
  `__spacer`, để khi hẹp nó vào ☰.
- Tên dài trên navbar đẩy `__actions` ra khỏi màn điện thoại (`.wb-navbar__brand` là `flex: none`). Sửa ở
  trang: bọc chữ trong `<span>`, và trong `@media (max-width: 480px)` cho span
  `max-width: calc(100vw - <phần còn lại của thanh>)`, `overflow: hidden`, `white-space: nowrap`,
  `text-overflow: ellipsis`. Đừng dùng `flex: 0 1 auto`: chữ bị cắt sớm dù thanh còn chỗ.
