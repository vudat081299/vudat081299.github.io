# HANDOFF — data-management-visualization

Chỉ việc còn dở. Xong việc nào thì xoá nó khỏi đây.

## CHỜ CHỦ TRANG

Câu hỏi của trang đồ án `sports-monitoring-project.html`, mục `#can-xac-nhan` (ba phần: tin nhắn gửi giảng viên,
thư gửi football-data.co.uk, việc nhóm tự chốt). Có câu trả lời thì sửa trang (và `data/sports-monitoring-project.json`
nếu chạm dữ liệu), rồi xoá câu ấy ở trang và ở đây.

### Gửi giảng viên (tin nhắn `#gvMsg`, tám câu)

1. Đề bài đầy đủ, tiêu chí chấm; đề có trong danh sách không; được tự chọn môn thể thao không.
2. Hạn nộp, thời lượng thuyết trình, độ dài báo cáo, ngôn ngữ. Hạn nộp quyết định nút số tuần mặc định của lịch;
   thời lượng quyết định số phút trong `slides`.
3. "Demo" là app chạy trực tiếp, notebook hay video. Trang đang đề xuất app Streamlit (pha P7).
4. Có cần phần quản lý dữ liệu (đường ống, lineage) không; "Data Lineage & Provenance" có phải yêu cầu của giảng
   viên không; có bắt buộc HDFS, Spark hay NiFi không. Bắt buộc thì thêm bước vào P2 và ô vào `flow`.
5. Tỉ trọng điểm giữa phương pháp và quản lý dữ liệu cùng trực quan hoá. Bẫy 6 của trang trỏ câu này.
6. Có chấp nhận football-data.co.uk không (điều khoản: chỉ cho cá nhân, chỉ để dự đoán), repo có được công khai
   không. Không chấp nhận thì đổi "Chốt" ở `#top-3` sang B (hoặc C) theo cây chọn; song song, nhóm email
   football-data.co.uk (pha P0).
7. Có bắt buộc một bộ dữ liệu cho cả bốn phương pháp không; có cần dữ liệu Việt Nam không. Chưa kiểm nguồn
   V.League; C chỉ có đội tuyển quốc gia.
8. Chấm theo từng người hay cả nhóm. Theo từng người thì ghi rõ chương của từng vai trong `report`.

### Nhóm tự chốt

- A (Premier League) hay B (F1). C chỉ là phần mở rộng. Trang đang chốt A; theo cây chọn ở `#top-3` (hết tuần 1 chưa
  ai trả lời thì làm tiếp A trong repo riêng tư, chuẩn bị sẵn B). Đổi sang B thì sửa câu "Chốt", `plan_a`, `flow`,
  các pha P1–P2 và `#ke-hoach`.
- Công cụ mặc định Python; ai chưa dùng Streamlit thì xem trước ở P0.
- Ai nhận vai nào; còn bao nhiêu tuần.
