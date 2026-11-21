/* Chỗ đặt hộp nổi cạnh một đoạn, thuần (chỉ số): dưới đoạn; dưới không đủ mà trên đủ thì lên trên; rồi giữ trọn
   trong khung nhìn (hộp có thể che đoạn, còn hơn nút Save nằm ngoài màn hình khi trang khoá cuộn ở Split).
   Tấm đáy (điện thoại, cảm ứng) thì không đặt chỗ mà cuộn trang để đoạn nằm ngay trên tấm (sheetReveal); nút nổi
   Comment on selection ở phía không có đoạn chọn (fabSide). Kéo từ vùng nền: điểm chuột kéo vào hộp chữ (clampInto), cuộn
   khi kéo quá mép (edgeScroll). Cây file cuộn ngang bao nhiêu để thấy đầu tên một hàng (nameReveal).
   Xuất: clampInto, edgeScroll, fabSide, nameReveal, popPlace, sheetReveal.
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
/* Cây file cuộn ngang bao nhiêu (px, dương là sang phải) để thấy đầu tên một hàng. chev, name, end: mép trái ô chevron, tên,
   đuôi ⋯ (dính mép phải) tính từ mép trái chỗ thấy được của thân; nameW: bề rộng chữ của tên; edge: khe ở mép trái; seen: phần
   tên ít nhất phải thấy trước đuôi. Đầu tên đã thấy thì 0; không thì ô chevron về mép trái nếu tên vẫn đủ chỗ, không nữa thì
   đầu tên. */
export function nameReveal(chev, name, end, nameW, edge, seen) {
  var room = end - edge - Math.min(nameW, seen);   // đầu tên không được quá chỗ này
  if (name - edge >= 0 && name - edge <= room) return 0;
  return name - chev <= room ? chev - edge : name - edge;
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
/* Kéo từ vùng nền (ui/selection.js): đưa điểm (x, y) vào trong hộp chữ box { left, right, top, bottom } (lùi 1px khỏi mép)
   để bắt dòng gần nhất: trái hộp là đầu dòng, phải hộp là cuối dòng, trên / dưới hộp là dòng đầu / cuối đang thấy. */
export function clampInto(x, y, box) {
  return { x: Math.min(Math.max(x, box.left + 1), box.right - 1), y: Math.min(Math.max(y, box.top + 1), box.bottom - 1) };
}
/* Kéo tới gần mép trên / dưới vùng thấy [top, bottom] (trong dải 16px) hay quá mép: cuộn bao nhiêu px mỗi khung hình (âm là
   lên), theo khoảng vào dải, tối đa 24. Dải trong mép: con trỏ không ra được ngoài cửa sổ (toàn màn hình) vẫn cuộn được. */
var EDGE = 16;
export function edgeScroll(y, top, bottom) {
  var d = y < top + EDGE ? y - top - EDGE : y > bottom - EDGE ? y - bottom + EDGE : 0;
  return Math.max(-24, Math.min(24, Math.trunc(d / 2)));
}
