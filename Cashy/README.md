# Cashy — bản web (prototype v1)

Web app quản lý & thống kê chi tiêu cá nhân, dựng từ spec trong [`docs/`](docs/).
Mục tiêu: validate luồng & UX trên web trước, sau đó mới làm bản iOS native.

## Chạy thử

`index.html` là **một file duy nhất, không phụ thuộc ngoài** (không cần build, không CDN, không mạng).

- Cách nhanh nhất: mở thẳng `Cashy/index.html` bằng trình duyệt (double-click cũng chạy).
- Hoặc serve tĩnh: `python3 -m http.server` rồi mở `/Cashy/`.
- Trên GitHub Pages: truy cập `…github.io/Cashy/`.

## Đã có gì (bám theo `docs/cashy-v1-spec.md`)

- **Tài khoản local**: nhập tên là tạo được, lưu trong `localStorage` (nhiều tài khoản / đổi qua lại được). Chưa có auth thật — đúng phạm vi prototype.
- **Giao dịch**: thêm/sửa/xóa; chọn loại thu/chi; số tiền VND (định dạng `1.000.000 đ`); **gắn nhiều danh mục** (M:N); quick-entry để trống danh mục → tự gán **"Chưa phân loại" (Pending)**.
- **Danh mục**: cây cha–con (unlimited depth), icon + màu, xóa cascade, không xóa được danh mục hệ thống.
- **Tổng quan**: số dư, thu/chi/chênh lệch theo kỳ (+ so với kỳ trước), biểu đồ thu-chi theo thời gian, donut chi tiêu theo danh mục.
- **Bộ lọc mạnh** (UC-14): tìm kiếm, lọc theo kỳ / loại / danh mục, toggle **Roll-up vs Strict**, sắp xếp.
- **Dữ liệu**: xuất JSON (khôi phục được) + CSV (Excel, multi-category ngăn bằng `|`), nhập JSON, xóa tài khoản.
- **Giao diện**: sáng / tối / theo hệ thống. Phong cách tối giản kiểu Notion, tabular numbers cho số tiền.

## Khác biệt so với bản iOS (có chủ đích)

- Tiền lưu dạng **số nguyên VND** (chính xác tuyệt đối, tránh float) thay cho `Decimal` của Swift.
- Persistence bằng `localStorage` thay cho SwiftData; auth/PIN/FaceID/biometrics chưa làm (prototype).
- Code gộp 1 file, chia section theo tầng Store / Domain / UI cho dễ đọc; chưa tách module.

## Chưa làm (đề xuất vòng sau)

Auth thật, Budget (v1.1), nhập CSV, chọn đa tiền tệ, cảnh báo hạn mức.
