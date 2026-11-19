/* Section của Focus mode, thuần: đánh số section (mỗi tiêu đề cấp cao mở một section mới) và chọn khối chạm dải đọc.
   Đọc / ghi DOM ở ui/focus.js.
   Xuất: bandBounds, bandPick, bandScroll, lineSections, numberSections, spanAt.
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
/* Dải đọc: 25–50% chiều cao vùng nhìn [top, min(viewH, bottom)]. Biết vị trí cuộn (scrolled trên tổng max) thì hai
   mốc trượt về mép trong nửa vùng nhìn sát đầu / cuối: cuộn hết lên thì cả hai ở mép trên, hết xuống thì ở mép dưới,
   không thì section đầu / cuối ngắn không bao giờ thắng. Mốc (tính trong văn bản) không lùi khi cuộn tới.
   Trả [mốc trên, mốc dưới]. */
export function bandBounds(top, bottom, viewH, scrolled, max) {
  var vh = Math.max(1, Math.min(viewH, bottom) - top), r = vh / 2;
  function mark(p) {
    if (!(max > 0)) return top + vh * p;
    return top + vh * (p * Math.min(1, scrolled / r) + (1 - p) * Math.max(0, 1 - (max - scrolled) / r));
  }
  return [mark(0.25), mark(0.5)];
}
/* Khối "chạm dải" trong n khối xếp dọc theo thứ tự: khối đầu tiên có đáy dưới b1 và đỉnh trên b2; không có thì khối
   ngay trên dải. bottomAt(i) / topAt(i) đọc vị trí khối i (tìm nhị phân nên chỉ đọc vài khối). Trả chỉ số; n > 0. */
export function bandPick(n, bottomAt, topAt, b1, b2) {
  var lo = 0, hi = n - 1, first = n;
  while (lo <= hi) { var mid = (lo + hi) >> 1; if (bottomAt(mid) > b1) { first = mid; hi = mid - 1; } else lo = mid + 1; }
  return first < n && topAt(first) < b2 ? first : Math.max(0, Math.min(n - 1, first - 1));
}
/* Vị trí cuộn s ∈ [0, max] để đỉnh một khối nằm ngay trên mốc trên của dải (cách `up` px): khối trước đã ra khỏi dải
   nên bandPick chọn đúng khối ấy (ui/review.js, phím J / K / X). gap(s): đỉnh khối trừ mốc trên khi cuộn tới s
   (mốc trượt theo s, bandBounds); gap giảm khi s tăng nên tìm nhị phân. Không đạt được thì về mép 0 / max. */
export function bandScroll(gap, max, up) {
  var f = function (s) { return gap(s) + up; };
  if (!(max > 0) || f(0) <= 0) return 0;
  if (f(max) >= 0) return max;
  var lo = 0, hi = max;
  for (var k = 0; k < 50 && hi - lo > 0.25; k++) { var mid = (lo + hi) / 2; if (f(mid) > 0) lo = mid; else hi = mid; }
  return hi;
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
