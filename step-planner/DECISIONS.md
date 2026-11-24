# Quyết định — step-planner

<!-- index:start -->
- PLAN-001 · Bảng đọc như bảng tính: mỗi bước một hàng, bước con chạy sang phải · `step-planner/`
- PLAN-002 · Dữ liệu chỉ ở trình duyệt, nhiều dự án, nhớ dự án mở cuối · `step-planner/`
- PLAN-003 · Tiến độ không tính bước bị bỏ qua; việc tiếp theo được tô · `step-planner/`
- PLAN-004 · Quay lại một bước có lý do · `step-planner/`
- PLAN-005 · Mỗi dự án có nhật ký quyết định · `step-planner/`
- PLAN-006 · Xoá có Hoàn tác; sắp xếp bằng kéo thả và bằng nút · `step-planner/`
- PLAN-007 · Markdown xuất ra đọc được và nhập lại được; nhập luôn tạo dự án mới · `step-planner/`
- PLAN-008 · Mẫu đồ án lấy đúng từ trang đồ án, người làm là vai · `step-planner/data/templates.json`
<!-- index:end -->

## PLAN-001 · Bảng đọc như bảng tính: mỗi bước một hàng, bước con chạy sang phải
24/11/2026 · `step-planner/`

Mỗi bước chính là một hàng, tên bước ở cột trái như cột A; bước con nằm cùng hàng, theo thứ tự sang phải, đánh số phân cấp 1.1, 1.2, 2.1. Cột tên bước đứng yên khi hàng bước con cuộn ngang; điện thoại thì tên bước nằm trên hàng bước con. Mỗi hàng có tiến độ riêng, thanh trên có tiến độ chung.

## PLAN-002 · Dữ liệu chỉ ở trình duyệt, nhiều dự án, nhớ dự án mở cuối
24/11/2026 · `step-planner/`

Không có máy chủ: mọi dự án lưu trong bộ nhớ trình duyệt dưới một khoá có số phiên bản. Bộ nhớ bị chặn hay hỏng thì trang vẫn chạy và báo rõ. Có nhiều dự án: tạo (trống hoặc từ mẫu), đổi tên, nhân bản, xoá (hỏi lại), chuyển; mở lại trang thì vào dự án mở cuối.

## PLAN-003 · Tiến độ không tính bước bị bỏ qua; việc tiếp theo được tô
24/11/2026 · `step-planner/`

Bước con có năm trạng thái: chưa làm, đang làm, xong, bị chặn, bỏ qua; bấm chip để đổi nhanh. Tiến độ = xong / (tổng − bỏ qua). Bước con đầu tiên chưa xong và không bị bỏ qua của mỗi bước là việc tiếp theo.

## PLAN-004 · Quay lại một bước có lý do
24/11/2026 · `step-planner/`

Việc dữ liệu lặp (CRISP-DM quay lại pha trước), nên một bước được đánh dấu "quay lại" kèm lý do và ngày, hiện thành nhãn trên bước tới khi bỏ đánh dấu.

## PLAN-005 · Mỗi dự án có nhật ký quyết định
24/11/2026 · `step-planner/`

Mỗi dự án giữ danh sách quyết định: ngày, quyết định, vì sao; thêm và xoá được (xoá có Hoàn tác).

## PLAN-006 · Xoá có Hoàn tác; sắp xếp bằng kéo thả và bằng nút
24/11/2026 · `step-planner/`

Xoá bước, bước con hay quyết định hiện thông báo có nút Hoàn tác, trả về đúng chỗ. Bước và bước con sắp xếp được bằng kéo thả trên máy tính và bằng nút lên / xuống, trái / phải cho bàn phím và điện thoại; bước con nhân bản được. Lọc theo người làm ("việc của tôi") và tìm theo chữ.

## PLAN-007 · Markdown xuất ra đọc được và nhập lại được; nhập luôn tạo dự án mới
24/11/2026 · `step-planner/`

Xuất Markdown cho người đọc, theo một khuôn cố định để nhập lại ra đúng cấu trúc; xuất JSON một dự án hoặc sao lưu tất cả; tải file hoặc chép. Nhập (file hay dán) hiện xem trước số bước, bước con và luôn tạo dự án mới, không ghi đè dự án đang có.

## PLAN-008 · Mẫu đồ án lấy đúng từ trang đồ án, người làm là vai
24/11/2026 · `step-planner/data/templates.json`

Có năm mẫu: dự án Data Science theo CRISP-DM, đồ án môn đang học, phân tích thống kê không học máy, tính năng app iOS / Flutter, và trống. Mẫu đồ án chỉ lấy các giai đoạn, vai, sản phẩm và tiêu chí xong của trang đồ án, không thêm nội dung; người làm ghi theo tên vai, không tên người thật.
