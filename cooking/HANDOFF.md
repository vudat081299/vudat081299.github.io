# HANDOFF — cooking/

## NỢ

- `food-fundamentals.html` tràn ngang: trang dùng class `mc-navhide` mà thiếu luật CSS cho nó — đo
  được 216px ở 320px, 146px ở 390px. Bản sửa có ở nhánh `origin/claude/cooking-pages-responsive-mobile-d2comt`
  (commit cae2774, chưa merge): áp lại phần CSS bằng tay (trang công thức nay đọc `data/*.json`), bỏ
  `flex: 0 1 auto` của bản ấy và chặn bề rộng bằng `max-width` như luật navbar trong
  `web-builder/CLAUDE.md`. Cùng nhánh: bảng thành thẻ trên màn hẹp; tên trang Vietnamese Home Cooking
  tràn 35px ở 320px.
- `food-fundamentals.html` ghi "hầm lâu 1–2 tiếng vẫn còn ~5% cồn" — lệch bảng lưu giữ cồn của USDA.
  Đối chiếu đúng bảng gốc trước khi sửa, đừng sửa theo trí nhớ.
- Dòng "trang chị em" ở chân năm trang lệch nhau, và không trang công thức nào trỏ tới
  `food-fundamentals.html`.
- Roast beef: "lấy thịt ra trước 2 tiếng" chưa có cảnh báo cho ngày nóng (trên 32 °C).
