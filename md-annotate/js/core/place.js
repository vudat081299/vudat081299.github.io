/* Chỗ đặt hộp nổi cạnh một đoạn, thuần (chỉ số): dưới đoạn; dưới không đủ mà trên đủ thì lên trên; rồi giữ trọn
   trong khung nhìn (hộp có thể che đoạn, còn hơn nút Save nằm ngoài màn hình khi trang khoá cuộn ở Split).
   Tấm đáy (điện thoại, cảm ứng) thì không đặt chỗ mà cuộn trang để đoạn nằm ngay trên tấm (sheetReveal); nút nổi
   Comment on selection ở phía không có đoạn chọn (fabSide).
   Xuất: fabSide, popPlace, sheetReveal.
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
/* Cuộn bao nhiêu (px, dương là xuống) để đoạn [top, bottom] (toạ độ khung nhìn) nằm ngay trên đỉnh tấm đáy sheetTop, cách gap,
   và không dưới thanh trên (đáy head). Đã nằm gọn thì 0. Đoạn cao hơn chỗ trống: ưu tiên đáy (chữ chọn cuối nằm sát tấm). */
export function sheetReveal(top, bottom, sheetTop, head, gap) {
  var room = sheetTop - gap;
  if (bottom > room) return bottom - room;
  if (top < head + gap) return Math.max(top - head - gap, bottom - room);
  return 0;
}
/* Nút nổi ở đáy khung nhìn (đỉnh fabTop) hay lên trên: lên trên khi đoạn chọn [top, bottom] ở nửa dưới khung nhìn cao vh,
   hoặc chạm dải của nút. Trả 'top' | 'bottom'. */
export function fabSide(top, bottom, fabTop, vh) {
  return (top + bottom) / 2 > vh / 2 || bottom > fabTop - 8 ? 'top' : 'bottom';
}
