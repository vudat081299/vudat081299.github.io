# HANDOFF — cooking/

## NỢ

- `european-savoury.html`, `european-baking.html`: mỗi hàng trong mục "Ráp bữa" là
  `<div class="mc-combo__row" data-open>` nhận click qua delegate, không `tabindex`, không `role` —
  không mở được công thức bằng bàn phím. Đổi sang `<button>` (reset border/background/font/
  text-align, vòng focus `--wb-ring`), rồi kiểm lại bằng Chrome: mọi hàng nhận focus, `Enter` mở modal.

## CHỜ CHỦ TRANG

- Carbonara chưa có câu dặn trứng sống (sốt chỉ chín bằng hơi nóng dư của mì), trong khi bốn món
  trứng sống khác của hai trang Âu đều có (Caesar salad, Caesar dressing, aioli ở Âu mặn; tiramisù,
  mousse ở Bánh Âu). Thêm cho đồng bộ, hay giữ nguyên?
