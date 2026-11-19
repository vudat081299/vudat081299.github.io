/* Cắt chữ thành từng đoạn theo mép highlight (và mép token, đầu dòng ở Source), thuần: UI chỉ việc dựng DOM từ kết
   quả. Mỗi đoạn có `cover`: các nhận xét phủ trọn đoạn ấy (rỗng thì không bọc <mark>).
   Xuất: lineCount, sourceLines, textRuns.
   Dùng: core/text.js. */
import { lineOf, lineStarts } from './text.js';

function segPoints(ranges, a, b) {
  var pts = [a, b];
  ranges.forEach(function (r) {
    if (r.s > a && r.s < b) pts.push(r.s);
    if (r.e > a && r.e < b) pts.push(r.e);
  });
  pts.sort(function (x, y) { return x - y; });
  return pts.filter(function (x, i) { return i === 0 || x !== pts[i - 1]; });
}

/* Một nút chữ của Preview, bắt đầu ở vị trí base: [{ t, cover, end }]. */
export function textRuns(text, base, ranges) {
  var out = [];
  var pts = segPoints(ranges, base, base + text.length);
  for (var i = 0; i < pts.length - 1; i++) {
    var a = pts[i], b = pts[i + 1], t = text.slice(a - base, b - base);
    var cover = ranges.filter(function (r) { return r.s <= a && r.e >= b; });
    out.push({ t: t, cover: cover, end: b });
  }
  return out;
}

/* Số dòng của văn bản như lề số dòng của Source đếm: ký tự xuống dòng cuối cùng không mở dòng mới. */
export function lineCount(text) {
  return text ? lineStarts(text).length - (text.charCodeAt(text.length - 1) === 10 ? 1 : 0) : 0;
}

/* Khung Source: { digits: số chữ số của số dòng lớn nhất, lines: [{ runs: [{ t, cls, cover, end }], ids }] }.
   Mỗi dòng chứa cả ký tự xuống dòng của nó; ids: nhận xét chạm dòng ấy (vạch ở lề số). */
export function sourceLines(text, toks, ranges) {
  var starts = lineStarts(text);
  var pts = [0, text.length];
  toks.forEach(function (t) { pts.push(t.s, t.e); });
  ranges.forEach(function (r) { pts.push(r.s, r.e); });
  starts.forEach(function (x) { if (x < text.length) pts.push(x); });
  pts.sort(function (x, y) { return x - y; });
  var ti = 0, li = -1, line = null, lines = [];
  for (var i = 0; i < pts.length - 1; i++) {
    var a = pts[i], b = pts[i + 1];
    if (a >= b) continue;
    while (li + 1 < starts.length && starts[li + 1] <= a) {
      li++; line = { runs: [], ids: [] }; lines.push(line);
    }
    while (ti < toks.length && toks[ti].e <= a) ti++;
    var tok = ti < toks.length && toks[ti].s <= a && toks[ti].e >= b ? toks[ti] : null;
    var cover = ranges.filter(function (r) { return r.s <= a && r.e >= b; });
    line.runs.push({ t: text.slice(a, b), cls: tok ? tok.c : null, cover: cover, end: b });
  }
  ranges.forEach(function (r) {
    var l0 = lineOf(text, r.s) - 1, l1 = lineOf(text, Math.max(r.s, r.e - 1)) - 1;
    for (var k = l0; k <= l1; k++) if (lines[k]) lines[k].ids.push(r.id);
  });
  return { digits: String(lineCount(text)).length, lines: lines };
}
