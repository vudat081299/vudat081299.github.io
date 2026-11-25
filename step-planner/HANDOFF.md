# HANDOFF — việc dở của step-planner/

Làm xong mục nào thì xoá mục ấy.

## NỢ

- Dự án lớn (15 × 20, ghi chú 30 dòng), CPU chậm 4×: khung hình kéo thả lúc ô viền đứt đổi chỗ còn ~50–80 ms (vẽ và xếp lớp
  cả trang). `content-visibility: auto` trên `.cards-scroll` giảm nửa số khung hình chậm, nhưng hàng khuất thì phải đo thẻ cắt
  khi hàng hiện ra (`markCutCards` đang ép dàn trang cả hàng khuất). Tắt Compact, xoá ô tìm vẫn dàn lại cả bảng.
- Chưa thử trên điện thoại thật: bàn phím ảo che hộp sửa dạng sheet (`dvh` không co theo bàn phím trên iOS).
- Chưa thử trên điện thoại thật: giữ thẻ rồi kéo (chặn cuộn bằng `touchmove` non-passive), tự cuộn khi kéo gần mép.
