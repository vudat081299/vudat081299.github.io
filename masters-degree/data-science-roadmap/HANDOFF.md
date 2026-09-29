# HANDOFF — data-science-roadmap

Chỉ việc còn dở. Xong việc nào thì xoá nó khỏi đây và kể lại ở [HISTORY.md](HISTORY.md).

## ĐANG LÀM

Không có.

## CHƯA LÀM

Không có.

## NỢ

### Hộp "Nộp được" của lịch 14 ngày vỡ chữ ở màn 375px khi `out` chứa `<code>`

Lỗi có từ trước, chưa ai đo lại (thấy khi sửa `s-plan14`, HISTORY.md phiên 2026-08-12 (r)). Chỗ
bắt đầu: `.wb-steps__note` trong `renderPlan14()`; ngày nào `d.out` không có `<code>` thì hiện
bình thường. Sửa xong kiểm ở 375px, cả sáng lẫn tối.

## CHỜ CHỦ TRANG

### Ngăn của roadmap mặc định 1/3 cửa sổ (DS-026) hay 47% như code đang chạy

DS-026 chốt 1/3, kéo được; code đang chạy 47%, vì ở cửa sổ 1440px 1/3 chỉ vừa
~52 ký tự mono mỗi dòng nên mọi snippet trong ngăn cuộn ngang, 47% vừa ~78 — khớp trần 76 ký
tự/dòng của `example.code`. Cần chủ trang chọn: giữ 47% (thì ghi một quyết định mới thay DS-026),
hay về 1/3 (thì phải hạ trần độ dài dòng code, hoặc chấp nhận cuộn ngang). Con số nằm ở
`--rm-drawer-w` trong `tools/build-roadmap.mjs`.

### Quiz của bài dài có chia thành nhiều cụm không

`pr-code` và `pr-eval` có trên hai chục câu, và cái tên "Kiểm tra nhanh" không còn đúng với
chúng. Chia theo mục hay theo mức là quyết định giáo trình, và nó đổi cả cách đọc điểm — chưa ai
hỏi chủ trang. Đừng giảm số câu để né câu hỏi này (DS-010).

### Mục lục bên trái lộ lớp phía sau khi kéo mạnh quá đầu (Chrome/Mac) — chưa xác nhận đã hết

Đã sửa theo chẩn đoán từ ảnh chụp của chủ trang (tách vai sticky và vai cuộn của `#sidenav`,
commit d39cdfe), nhưng agent chưa tự tái hiện được đúng thao tác đó. Chủ trang thử lại mà vẫn còn
thì cần mô tả cụ thể: còn thấy thẻ nổi bo góc không, hay lỗi đổi dạng khác.
