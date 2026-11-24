# Quyết định — step-planner

<!-- index:start -->
- PLAN-001 · Dự án là các bước có thứ tự, mỗi bước có bước con có thứ tự · `step-planner/`
- PLAN-002 · Dữ liệu chỉ ở trình duyệt, nhiều dự án, nhớ dự án mở cuối · `step-planner/`
- PLAN-003 · Sáu trạng thái; tiến độ không tính bỏ qua và huỷ; việc tiếp theo được tô · `step-planner/`
- PLAN-004 · Quay lại một bước có lý do, đếm vòng, đặt lại việc · `step-planner/`
- PLAN-005 · Mỗi dự án có nhật ký quyết định · `step-planner/`
- PLAN-006 · Xoá hoàn tác được; sắp xếp lại được; tìm theo chữ · `step-planner/`
- PLAN-007 · Markdown xuất ra đọc được và nhập lại được; nhập không ghi đè ngầm · `step-planner/`
- PLAN-008 · Mẫu đồ án lấy đúng từ trang đồ án · `step-planner/data/templates.json`
- PLAN-009 · Mẫu Data Science theo chuẩn CRISP-DM 1.0, áp được cho mọi dự án · `step-planner/data/templates.json`
- PLAN-010 · Không có khái niệm người làm · `step-planner/`
- PLAN-011 · Bước và bước con có tài liệu: link hoặc văn bản Markdown · `step-planner/`
- PLAN-012 · Giao diện tiếng Anh; Markdown xuất nhãn tiếng Anh, file cũ vẫn nhập · `step-planner/`
<!-- index:end -->

## PLAN-001 · Dự án là các bước có thứ tự, mỗi bước có bước con có thứ tự
24/11/2026 · `step-planner/`

Một dự án là danh sách bước chính có thứ tự; mỗi bước chứa bước con có thứ tự, đánh số phân cấp 1.1, 1.2, 2.1, đọc như một bảng: bước là hàng, bước con theo thứ tự trong hàng. Mỗi bước có tiến độ riêng, dự án có tiến độ chung. Công cụ tên là Data Science Step Planner: ưu tiên dự án dữ liệu nhưng dùng được cho dự án bất kỳ.

## PLAN-002 · Dữ liệu chỉ ở trình duyệt, nhiều dự án, nhớ dự án mở cuối
24/11/2026 · `step-planner/`

Không có máy chủ: mọi dự án lưu trong bộ nhớ trình duyệt dưới một khoá có số phiên bản. Bộ nhớ bị chặn hay hỏng thì trang vẫn chạy và báo rõ. Có nhiều dự án: tạo (trống hoặc từ mẫu), đổi tên, nhân bản, xoá (hỏi lại), chuyển; mở lại trang thì vào dự án mở cuối.

## PLAN-003 · Sáu trạng thái; tiến độ không tính bỏ qua và huỷ; việc tiếp theo được tô
24/11/2026 · `step-planner/`

Bước con có sáu trạng thái: mới (New), đang làm, xong, bị chặn, bỏ qua, huỷ. Bấm chip đi ba trạng thái cơ bản mới → đang làm → xong; đã xong hay ở trạng thái khác thì bấm chip mở danh sách để chọn bất kỳ trạng thái nào. Bỏ qua là việc không cần với dự án này. Huỷ là việc đã quyết không làm nhưng giữ thẻ trên bảng để theo dõi, kèm lý do huỷ (chọn huỷ thì luôn được hỏi lý do). Tiến độ = xong / (tổng − bỏ qua − huỷ). Bước con đầu tiên chưa xong, không bỏ qua, không huỷ của mỗi bước là việc tiếp theo.

## PLAN-004 · Quay lại một bước có lý do, đếm vòng, đặt lại việc
24/11/2026 · `step-planner/`

Việc dữ liệu lặp (CRISP-DM quay lại pha trước), nên một bước được đánh dấu "cần làm lại" kèm lý do và ngày, hiện thành băng trên bước tới khi bỏ đánh dấu. Mỗi lần đánh dấu mở một vòng mới (lần đầu là vòng 2, lần sau tăng tiếp, kể cả sau khi đã bỏ đánh dấu). Khi đánh dấu, người dùng chọn bước con nào đưa về "Chưa làm" (mặc định không cái nào); nhật ký quyết định tự ghi một dòng "Làm lại: tên bước (vòng N)" với lý do. Cả thao tác hoàn tác được một lần.

## PLAN-005 · Mỗi dự án có nhật ký quyết định
24/11/2026 · `step-planner/`

Mỗi dự án giữ danh sách quyết định: ngày, quyết định, vì sao; thêm và xoá được (xoá có Hoàn tác).

## PLAN-006 · Xoá hoàn tác được; sắp xếp lại được; tìm theo chữ
24/11/2026 · `step-planner/`

Xoá bước, bước con hay quyết định đều hoàn tác được, trả về đúng chỗ; xoá một bước còn bước con thì hỏi lại trước. Bước và bước con sắp xếp lại được, kể cả chỉ dùng bàn phím, và bước con chuyển được sang bước khác; bước con nhân bản được. Tìm theo chữ, không phân biệt hoa thường và dấu.

## PLAN-007 · Markdown xuất ra đọc được và nhập lại được; nhập không ghi đè ngầm
24/11/2026 · `step-planner/`

Xuất Markdown cho người đọc, theo một khuôn cố định để nhập lại ra đúng cấu trúc; Markdown viết tay cũng nhập được. Xuất JSON một dự án hoặc sao lưu tất cả; tải file hoặc chép. Nhập (file hay dán) hiện xem trước số bước, bước con và mọi cảnh báo; mặc định tạo dự án mới, hoặc chọn thay dự án đang mở (hoàn tác được). Không bao giờ ghi đè mà không hỏi.

## PLAN-008 · Mẫu đồ án lấy đúng từ trang đồ án
24/11/2026 · `step-planner/data/templates.json`

Có năm mẫu: dự án Data Science theo CRISP-DM, đồ án môn đang học, phân tích thống kê không học máy, tính năng app iOS / Flutter, và trống. Mẫu đồ án chỉ lấy các giai đoạn, việc, sản phẩm và tiêu chí xong của trang đồ án, không thêm nội dung, không tên người thật.

## PLAN-009 · Mẫu Data Science theo chuẩn CRISP-DM 1.0, áp được cho mọi dự án
24/11/2026 · `step-planner/data/templates.json`

Mẫu Data Science theo chuẩn CRISP-DM 1.0: bước là sáu pha, bước con là các việc chung (generic task) của từng pha, tiêu chí xong là sản phẩm đầu ra chuẩn của việc ấy. Mẫu đủ tổng quát để áp cho mọi dự án dữ liệu, không gắn vào bài toán nào. Chỗ CRISP-DM 1.0 đã cũ (tái lập, giám sát mô hình, model card, nghiệm thu) bổ sung từ CRISP-ML(Q), TDSP và Model Cards, có ghi nguồn. Riêng việc chia train / validation / test dời lên ngay sau ghép dữ liệu để tránh rò rỉ.

## PLAN-010 · Không có khái niệm người làm
24/11/2026 · `step-planner/`

Công cụ không quản lý thành viên hay người làm: không danh sách thành viên, không giao bước con cho ai, không lọc "việc của tôi", mẫu không ghi người làm. File và dữ liệu cũ có thông tin người vẫn nhập và mở được; thông tin người bị bỏ.

## PLAN-011 · Bước và bước con có tài liệu: link hoặc văn bản Markdown
24/11/2026 · `step-planner/`

Mỗi bước có tài liệu riêng cho cả bước, mỗi bước con có tài liệu riêng. Một tài liệu là một link (chỉ http(s), mở tab mới) hoặc một văn bản Markdown viết ngay trong công cụ, đọc được ở dạng đã dựng. Thêm, sửa, xoá được; xoá có Hoàn tác. Tìm kiếm khớp cả tên tài liệu. Tài liệu đi theo khi xuất / nhập Markdown và JSON; file cũ không có tài liệu vẫn nhập được.

## PLAN-012 · Giao diện tiếng Anh; Markdown xuất nhãn tiếng Anh, file cũ vẫn nhập
24/11/2026 · `step-planner/`

Mọi chữ trên giao diện là tiếng Anh: nút, trạng thái, thông báo, cảnh báo khi nhập. Trạng thái "chưa làm" tên là New. Markdown xuất ra dùng nhãn tiếng Anh (định dạng 3); file định dạng cũ có nhãn tiếng Việt và mọi kiểu viết tay đã nhận trước đây vẫn nhập được. Nội dung người dùng và nội dung mẫu giữ nguyên ngôn ngữ của nó.
