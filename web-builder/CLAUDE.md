# `web-builder/` — design system `wb-*` và trang tài liệu của nó

- **`web-builder.css`** — cả bộ kit trong một file: token `--wb-*`, component `wb-*`, nền tối bằng
  class `.dark` trên `<html>`. Phiên bản đọc được lúc chạy: `var(--wb-version)`.
- **Trang tài liệu** = `index.html` + `app.js` + `docs.css`. Router theo hash: `#/<id>` nạp
  `pages/<id>.html`; mảng `SECTIONS` đầu `app.js` giữ mọi id, mỗi id đúng một file cùng tên
  (`buttons`, `navbar`, `sidenav`…). Nhóm *Components* có một trang demo cho mỗi component — chỉ
  markup, không shell, không script. `templates/` là trang mẫu đầy đủ.
- **`PENDING-FIXES.md`** — sổ nợ của kit, kèm cách kiểm lại sau mỗi lần đồng bộ. Nợ ghi ở đó.

Thư mục này chép từ repo nguồn của skill web-builder, nên tài liệu nhắc tới `SKILL.md`, `serve.py`,
`references/`, `validate-sync`, `/wb-change` — không thứ nào có trong repo này, đừng đi tìm.

**Mở:** cần HTTP vì `app.js` dùng `fetch` — `python3 -m http.server` ở gốc, `/web-builder/#/<id>`.

**Cổng: không có.** Mà sửa `web-builder.css` là sửa cùng lúc mọi trang link nó, trong khi cổng của
các thư mục ấy chỉ đọc HTML, không thấy CSS đổi. Trước khi commit, mở vài trang đại diện ở 320 /
390 / 1280, sáng lẫn tối, theo mục *Kiểm lại sau mỗi lần đồng bộ kit* của `PENDING-FIXES.md`.

## Phụ thuộc

- **Nó dùng:** font icon Material Symbols, `@import` từ Google Fonts ngay trong kit.
- **Dùng nó:** trang trong `pages/`, `cooking/`, `facts/`, `masters-degree/` link thẳng
  `../web-builder/web-builder.css`; liệt kê: `git grep -l web-builder/web-builder.css -- '*.html'`.
  Trang chủ `index.html` cố ý không dùng kit, nhưng có một mục trỏ tới `web-builder/`.
- **Hai bản chép không đồng bộ theo:** `cashy/src/styles/web-builder.css` là bản của Cashy, cố ý
  lệch — đừng sync; `json-analysis/web-builder.css` là bản cũ (`PENDING-FIXES.md` mục B).

## Luật khi dựng giao diện bằng `wb-*`

- **`.wb-navbar__actions` chỉ chứa nút icon** — slot ấy không bao giờ gập. Nút có chữ đặt cuối
  `__menu`, sau một `__spacer` lồng trong, để khi thanh hẹp nó chui vào ☰.
- **Tên dài trên navbar:** `.wb-navbar__brand` là `flex: none`, tên dài đẩy `__actions` ra khỏi màn
  điện thoại. Sửa ở trang, không sửa kit: bọc chữ trong `<span>`; trong `@media (max-width: 480px)`
  cho span `max-width: calc(100vw - <phần còn lại của thanh>)`, `overflow: hidden`, `white-space:
  nowrap`, `text-overflow: ellipsis`. Đừng cho brand co bằng `flex: 0 1 auto` — thanh còn chỗ trống
  mà chữ vẫn bị cắt sớm.
