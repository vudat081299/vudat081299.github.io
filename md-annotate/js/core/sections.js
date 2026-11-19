/* Section của Focus mode, thuần: đánh số section (mỗi tiêu đề cấp cao mở một section mới) và chọn khối chạm dải đọc.
   Đọc / ghi DOM ở ui/focus.js.
   Xuất: bandBounds, bandPick, lineSections, numberSections, spanAt.
   Dùng: không module nào. */

/* flags[i]: khối i mở section mới. Trả số section ('0', '1', …) của từng khối. */
export function numberSections(flags) {
  var sec = 0;
  return flags.map(function (f) { if (f) sec++; return String(sec); });
}
/* Khung Source: n dòng; dòng đầu của khối tiêu đề (spans của core/blocks.js) mở section mới. */
export function lineSections(spans, n) {
  var heads = {}, flags = [];
  spans.forEach(function (sp) { if (sp.heading) heads[sp.a] = true; });
  for (var i = 0; i < n; i++) flags.push(!!heads[i]);
  return numberSections(flags);
}
/* Dải đọc: 25–50% chiều cao vùng nhìn [top, min(viewH, bottom)]. Trả [mốc trên, mốc dưới]. */
export function bandBounds(top, bottom, viewH) {
  var vh = Math.max(1, Math.min(viewH, bottom) - top);
  return [top + vh * 0.25, top + vh * 0.5];
}
/* Khối "chạm dải" trong n khối xếp dọc theo thứ tự: khối đầu tiên có đáy dưới b1 và đỉnh trên b2; không có thì khối
   ngay trên dải. bottomAt(i) / topAt(i) đọc vị trí khối i (tìm nhị phân nên chỉ đọc vài khối). Trả chỉ số; n > 0. */
export function bandPick(n, bottomAt, topAt, b1, b2) {
  var lo = 0, hi = n - 1, first = n;
  while (lo <= hi) { var mid = (lo + hi) >> 1; if (bottomAt(mid) > b1) { first = mid; hi = mid - 1; } else lo = mid + 1; }
  return first < n && topAt(first) < b2 ? first : Math.max(0, Math.min(n - 1, first - 1));
}
/* Chỉ số khối (spans của core/blocks.js, xếp theo dòng) chứa dòng `line` (đếm từ 0); -1 nếu dòng nằm giữa hai khối. */
export function spanAt(spans, line) {
  var lo = 0, hi = spans.length - 1;
  while (lo <= hi) {
    var mid = (lo + hi) >> 1;
    if (line < spans[mid].a) hi = mid - 1; else if (line > spans[mid].b) lo = mid + 1; else return mid;
  }
  return -1;
}
