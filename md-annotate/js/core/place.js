/* Chỗ đặt hộp nổi cạnh một đoạn, thuần (chỉ số): dưới đoạn; dưới không đủ mà trên đủ thì lên trên; rồi giữ trọn
   trong khung nhìn (hộp có thể che đoạn, còn hơn nút Save nằm ngoài màn hình khi trang khoá cuộn ở Split).
   Xuất: popPlace.
   Dùng: không module nào. */

/* rect: { top, bottom, left } của đoạn trong khung nhìn, hoặc null (giữa màn hình); pw, ph: cỡ hộp; vw, vh: cỡ khung
   nhìn. Trả { top, left } trong khung nhìn. */
export function popPlace(rect, pw, ph, vw, vh) {
  var top, left;
  if (rect) {
    top = rect.bottom + 10; left = rect.left;
    if (top + ph > vh - 12 && rect.top - ph - 10 > 12) top = rect.top - ph - 10;
  } else { top = vh / 2 - ph / 2; left = vw / 2 - pw / 2; }
  left = Math.max(16, Math.min(left, vw - pw - 16));
  top = Math.max(8, Math.min(top, vh - ph - 8));
  return { top: top, left: left };
}
