# HANDOFF — việc dở của md-annotate/

Làm xong mục nào thì xoá mục ấy.

## CHƯA LÀM

- Cây lớn: `localStorage` chứa khoảng 5 triệu ký tự cho cả trang; nạp folder vượt mức thì hoàn lại và báo. Chuyển lưu phiên
  sang IndexedDB (chỉ đổi `ui/state.js` / `ui/store.js`, MDAN-022) khi cần folder vài MB.
- Chế độ folder thật (File System Access, ghi ngược ra đĩa): lớp lưu mới, nghiệp vụ ở `core/` giữ nguyên.

## NỢ

- Gợi ý đã đọc (MDAN-016) và chỗ cuộn mỗi file chỉ ở bộ nhớ: đổi file là mất gợi ý của file trước.
- Hai tab mở cùng một phiên: mỗi lần lưu ghi đè cả cây (`s:<id>`), việc của tab kia mất. Cần khoá theo tab hay gộp khi lưu.
- *All files*: lần vẽ đầu sau khi tải trang neo mọi file một lần (~400 ms ở 200 file); sau đó nhớ theo doc.
