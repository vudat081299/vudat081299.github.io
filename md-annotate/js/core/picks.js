/* Nhận xét nhiều dòng, thuần: dòng chọn được không, dải dòng liền (runs), nhãn "3 lines · L12, L15-16", đoạn trích
   của các dòng đã chọn (pickInfo). Chọn dòng, tô dòng, mở hộp ở ui/picks.js. Dòng đếm từ 1.
   Xuất: lineRuns, pickable, pickInfo, pickSummary.
   Dùng: core/text.js, core/prompt.js. */
import { lineStarts, plural } from './text.js';
import { rangeLabel } from './prompt.js';

/* [đầu, cuối) của dòng n, không gồm ký tự xuống dòng; null khi ngoài văn bản. */
function lineSpan(text, n) {
  var st = lineStarts(text);
  if (n < 1 || n > st.length) return null;
  return [st[n - 1], n < st.length ? st[n] - 1 : text.length];
}
/* Dòng trống (chỉ khoảng trắng) không chọn được: không có chữ để neo. */
export function pickable(text, n) {
  var r = lineSpan(text, n);
  return !!r && /\S/.test(text.slice(r[0], r[1]));
}
/* Số dòng (thứ tự bất kỳ, có thể trùng) → dải dòng liền [[a, b]], tăng dần. */
export function lineRuns(lines) {
  var ls = lines.slice().sort(function (x, y) { return x - y; }), runs = [];
  ls.forEach(function (n) {
    var r = runs[runs.length - 1];
    if (r && n <= r[1] + 1) r[1] = Math.max(r[1], n); else runs.push([n, n]);
  });
  return runs;
}
/* "3 lines · L12, L15-16" cho hộp nhận xét. */
export function pickSummary(lines) {
  var runs = lineRuns(lines), n = 0;
  runs.forEach(function (r) { n += r[1] - r[0] + 1; });
  return plural(n, 'line') + ' · ' + runs.map(function (r) { return rangeLabel(r[0], r[1], ''); }).join(', ');
}
/* Đoạn trích của các dòng đã chọn: mỗi dải dòng liền một phần { quote, prefix, suffix, origin: 'src', rel, s, e }
   (quote: trọn các dòng ấy nối bằng \n; prefix / suffix 48 ký tự như quoteFrom; s, e: vị trí trong nguồn, không lưu).
   Trả { lines, parts } cùng các trường của parts[0] như kết quả quoteFrom, để addComment và hộp nhận xét dùng chung;
   null khi không còn dòng nào chọn được. */
export function pickInfo(text, lines) {
  var ok = lines.filter(function (n) { return pickable(text, n); });
  var parts = lineRuns(ok).map(function (r) {
    var a = lineSpan(text, r[0])[0], b = lineSpan(text, r[1])[1];
    return {
      origin: 'src', quote: text.slice(a, b), s: a, e: b,
      prefix: text.slice(Math.max(0, a - 48), a), suffix: text.slice(b, b + 48),
      rel: a / Math.max(1, text.length)
    };
  });
  if (!parts.length) return null;
  var p = parts[0];
  return {
    lines: ok.sort(function (x, y) { return x - y; }), parts: parts,
    origin: p.origin, quote: p.quote, prefix: p.prefix, suffix: p.suffix, rel: p.rel, s: p.s, e: p.e
  };
}
