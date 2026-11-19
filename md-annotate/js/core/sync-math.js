/* Toán của cuộn theo nhau ở Split, thuần: đường cong ánh xạ vị trí khung nguồn ↔ khung Preview (nội suy Hermite
   đơn điệu) và vị trí khung theo. Đo DOM ở ui/sync-scroll.js.
   Xuất: followTop, syncCurves.
   Dùng: không module nào. */

/* Nội suy Hermite đơn điệu (Fritsch–Carlson): tốc độ khung theo đổi mượt qua ranh giới khối, không gãy khúc. */
function monoCurve(xs, ys) {
  var n = xs.length, d = [], m = new Array(n), k;
  for (k = 0; k < n - 1; k++) d.push((ys[k + 1] - ys[k]) / (xs[k + 1] - xs[k]));
  if (n < 2) return { xs: xs, ys: ys, m: [1] };
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (k = 1; k < n - 1; k++) m[k] = d[k - 1] * d[k] <= 0 ? 0 : (d[k - 1] + d[k]) / 2;
  for (k = 0; k < n - 1; k++) {
    if (d[k] === 0) { m[k] = m[k + 1] = 0; continue; }
    var a = m[k] / d[k], b = m[k + 1] / d[k], h = a * a + b * b;
    if (h > 9) { var t = 3 / Math.sqrt(h); m[k] = t * a * d[k]; m[k + 1] = t * b * d[k]; }
  }
  return { xs: xs, ys: ys, m: m };
}
function evalCurve(c, x) {
  var xs = c.xs, n = xs.length;
  if (n < 2) return x;
  if (x <= xs[0]) return c.ys[0] + (x - xs[0]) * c.m[0];
  if (x >= xs[n - 1]) return c.ys[n - 1] + (x - xs[n - 1]) * c.m[n - 1];
  var lo = 0, hi = n - 1;
  while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (xs[mid] <= x) lo = mid; else hi = mid; }
  var h = xs[hi] - xs[lo], t = (x - xs[lo]) / h, t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * c.ys[lo] + (t3 - 2 * t2 + t) * h * c.m[lo] + (-2 * t3 + 3 * t2) * c.ys[hi] + (t3 - t2) * h * c.m[hi];
}
/* pts: các cặp [y khung nguồn, y khung Preview], từ [0, 0] tới [cao nguồn, cao Preview]. Trả hai đường cong. */
export function syncCurves(pts) {
  // Giữ điểm tăng ngặt ở cả hai trục, để đường cong đi được hai chiều.
  var clean = [pts[0]];
  pts.slice(1).forEach(function (p) { var q = clean[clean.length - 1]; if (p[0] > q[0] + 0.5 && p[1] > q[1] + 0.5) clean.push(p); });
  var xs = clean.map(function (p) { return p[0]; }), ys = clean.map(function (p) { return p[1]; });
  return { fwd: monoCurve(xs, ys), back: monoCurve(ys, xs) };
}
/* Khung dẫn cao h, tổng cao sh, đang ở top; khung theo cao oh, tổng cao osh. Điểm tham chiếu ở giữa khung, sát đầu /
   cuối thì trượt về mép. Trả scrollTop của khung theo. */
export function followTop(curve, h, sh, top, oh, osh) {
  var max = sh - h;
  var off = h / 2 - Math.max(0, h / 2 - top) + Math.max(0, h / 2 - (max - top));
  var y = evalCurve(curve, top + off);
  var omax = osh - oh;
  return Math.max(0, Math.min(omax, y - off * oh / h));
}
