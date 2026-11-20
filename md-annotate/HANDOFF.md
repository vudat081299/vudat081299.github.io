# HANDOFF — việc dở của md-annotate/

Làm xong mục nào thì xoá mục ấy.

## CHƯA LÀM

- Cây lớn: `localStorage` chứa khoảng 5 triệu ký tự cho cả trang; nạp folder vượt mức thì hoàn lại và báo. Chuyển lưu phiên
  sang IndexedDB (chỉ đổi `ui/state.js` / `ui/store.js`, MDAN-022) khi cần folder vài MB.
- Chế độ folder thật (File System Access, ghi ngược ra đĩa): lớp lưu mới, nghiệp vụ ở `core/` giữ nguyên.

## NỢ

- Gợi ý đã đọc (MDAN-016) và chỗ cuộn mỗi file chỉ ở bộ nhớ: đổi file là mất gợi ý của file trước.
- Tên phiên tự đặt đọc tiêu đề của file đang mở khi gốc cây không phải một folder duy nhất (`autoName`): đổi file thì tên đổi theo.
