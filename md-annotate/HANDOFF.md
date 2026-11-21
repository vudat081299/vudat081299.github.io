# HANDOFF — việc dở của md-annotate/

Làm xong mục nào thì xoá mục ấy.

## CHƯA LÀM

- Sửa lớn md-annotate thì bật lại hai bài thử đang tạm dừng (MDAN-083): bỏ dấu `#` ở hai dòng `test-core.mjs` trong
  `tools/check.sh`, và chạy `tools/smoke.cjs` (cách chạy ở đầu file). Sửa luôn mục *Cổng* trong `CLAUDE.md`.
- Cây lớn: `localStorage` chứa khoảng 5 triệu ký tự cho cả trang; nạp folder vượt mức thì hoàn lại và báo. Chuyển lưu phiên
  sang IndexedDB (chỉ đổi `ui/state.js` / `ui/store.js`, MDAN-022) khi cần folder vài MB.
- Chế độ folder thật (File System Access, ghi ngược ra đĩa): lớp lưu mới, nghiệp vụ ở `core/` giữ nguyên.

## NỢ

- Văn bản ~10.000 dòng: mỗi lần đổi bề rộng vùng chữ vẫn mất ~0,3 s dàn lại chữ (layout + prepaint) và ~0,2 s xếp lại
  làn đã đọc (~7.700 nút); lần mở đầu ~0,8 s dàn chữ. Giảm tiếp cần `content-visibility: auto` cho khối Preview và nhóm
  dòng Source; vướng: làn, dải tiến độ, cuộn theo nhau đo toạ độ mọi khối, ép dàn lại hết (thử: khung hình 330 → 140 ms
  nhưng đo làn mất 2 s). Làm khi làn / bản đồ cuộn chỉ đo phần đang thấy.
- *Focus mode*, *Dim reviewed* đặt `opacity` lên từng dòng mờ: mỗi dòng mờ là một lớp vẽ, văn bản dài có thể cuộn giật
  lại khi bật. Chưa đo.
- Hai tab mở cùng một phiên: mỗi lần lưu ghi đè cả cây (`s:<id>`), việc của tab kia mất. Cần khoá theo tab hay gộp khi lưu.
- *All files*: lần vẽ đầu sau khi tải trang neo mọi file một lần (~400 ms ở 200 file); sau đó nhớ theo doc.
- Chưa thử trên iPhone thật (Chromium giả lập không làm được): `overflow: hidden` ở `html` chặn vuốt trang sau lớp mờ (iOS ≥ 16);
  nhấn giữ số dòng không bôi đen / không hiện kính lúp; `visualViewport` khi bàn phím mở (`--kb`); vùng an toàn khi thêm vào màn hình chính.
