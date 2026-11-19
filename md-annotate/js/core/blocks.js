/* Khối cấp cao của văn bản markdown theo dòng nguồn, thuần: lexSpans(text, lex) → [{ a, b, heading }], a / b là dòng
   đầu / cuối (đếm từ 0). lex là bộ tách token (marked.lexer, ui/markdown.js mdLex); nó ném lỗi thì không có khối.
   Dùng cho cuộn theo nhau (ui/sync-scroll.js) và đánh số section (ui/focus.js).
   Xuất: lexSpans.
   Dùng: core/text.js. */

import { lineStarts } from './text.js';

/* Neo từng khối vào văn bản gốc, không cộng dồn độ dài raw: marked bỏ khối định nghĩa link (`[id]: url`), dán nó vào
   raw của đoạn văn ngay trên, và đổi tab đầu dòng thành dấu cách, nên cộng dồn thì lệch dòng từ đó trở xuống.
   Dòng đầu / cuối của khối tìm theo nội dung đã cắt khoảng trắng hai đầu, đứng đầu dòng, sau chỗ khối trước kết thúc. */
export function lexSpans(text, lex) {
  var toks = [];
  try { toks = lex(text); } catch (e) { toks = []; }
  var starts = lineStarts(text), pos = 0, spans = [];
  function lineAt(i) {
    var lo = 0, hi = starts.length - 1;
    while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (starts[mid] <= i) lo = mid; else hi = mid - 1; }
    return lo;
  }
  /* Vị trí đầu tiên từ `from` mà s đứng đầu dòng (trước nó chỉ có khoảng trắng); -1 nếu không có. */
  function findAtLineStart(s, from) {
    for (var i = text.indexOf(s, from); i >= 0; i = text.indexOf(s, i + 1)) {
      if (/^[ \t]*$/.test(text.slice(starts[lineAt(i)], i))) return i;
    }
    return -1;
  }
  toks.forEach(function (t) {
    if (t.type === 'space' || t.type === 'def') return;
    var lines = (t.raw || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!lines.length) return;
    var at = findAtLineStart(lines[0], pos);
    if (at < 0) return; // không tìm thấy: bỏ khối, đừng đoán vị trí
    var last = lines[lines.length - 1], end = at + lines[0].length;
    if (lines.length > 1) { var j = findAtLineStart(last, end); if (j >= 0) end = j + last.length; }
    spans.push({ a: lineAt(at), b: lineAt(Math.max(at, end - 1)), heading: t.type === 'heading' });
    pos = end;
  });
  return spans;
}
