# `json-analysis/` — xem, sửa, tìm và so sánh JSON

- Một trang, `index.html`: *Analyze* (dán JSON, kể cả JSON hỏng, xem cấu trúc, tìm) và *Compare* (so hai bản).
- CSS và JS inline trong `index.html`. Mở thẳng file là chạy; mạng chỉ cần cho font icon.
- Không có cổng. Sửa xong thì mở mọi chế độ, sáng và tối, khổ điện thoại và khổ rộng.
- Trang link bản `web-builder.css` cũ nằm ngay trong thư mục này, không phải `../web-builder/`: sửa kit chung
  không đổi gì ở đây. Việc chuyển sang kit chung: `../web-builder/PENDING-FIXES.md`, mục B.
- Theme riêng: khoá `jt-theme`, mặc định sáng, không theo `hub-theme` của site. Khoá khác: `ja-mode`,
  `jt-hist-hidden`.
- Trang chủ trỏ tới `json-analysis/`; đổi tên thì `tools/lint-collection.py` đỏ.
