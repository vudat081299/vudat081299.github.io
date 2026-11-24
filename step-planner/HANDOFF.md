# HANDOFF — việc dở của step-planner/

Làm xong mục nào thì xoá mục ấy.

## NỢ

- Dự án lớn: mỗi thay đổi vẽ lại cả bảng. 15 bước × 20 bước con, mỗi thẻ ghi chú 30 dòng: một lần bấm chip mất
  ~0,3 s JS + dàn trang (~0,5 s tới khung hình kế); ghi chú ngắn ~0,1 s. Phần lớn là dàn chữ cho DOM mới, không phải đọc
  `scrollHeight` xen kẽ. Giảm cần vẽ lại theo hàng (chỉ hàng đổi) hoặc chỉ dựng phần ghi chú thấy được trên thẻ.
- Chưa thử trên điện thoại thật: bàn phím ảo che hộp sửa dạng sheet (`dvh` không co theo bàn phím trên iOS).
