/* Khối cấp cao của văn bản markdown theo dòng nguồn, thuần: lexSpans(text, lex) → [{ a, b, heading }], a / b là dòng
   đầu / cuối (đếm từ 0), heading: khối mở section (token heading, hoặc khối HTML mở bằng <h1>…<h6>).
   lex là bộ tách token (marked.lexer, ui/markdown.js mdLex); nó ném lỗi thì không có khối.
   Dùng cho cuộn theo nhau (ui/sync-scroll.js) và đánh số section (ui/focus.js).
   Xuất: lexSpans.
   Dùng: core/text.js. */

import { lineStarts } from './text.js';

/* Neo từng khối vào văn bản gốc, không cộng dồn độ dài raw: marked bỏ khối định nghĩa link (`[id]: url`), dán nó vào
   raw của đoạn văn ngay trên, và đổi tab đầu dòng thành dấu cách, nên cộng dồn thì lệch dòng từ đó trở xuống.
   Mỗi dòng của khối tìm theo nội dung đã cắt khoảng trắng hai đầu, đứng đầu dòng: dòng đầu sau chỗ khối trước kết thúc,
   các dòng sau lần lượt, ngay sau dòng trước. */
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
    // Đi lần lượt từng dòng, mỗi dòng chỉ cách dòng trước bằng khoảng trắng: tìm thẳng dòng cuối thì dừng ở lần đầu
    // nó xuất hiện (rào ``` mở của khối code trong mục danh sách). Dòng không thấy thì khối dừng ở dòng trước.
    var end = at + lines[0].length;
    for (var k = 1; k < lines.length; k++) {
      var j = findAtLineStart(lines[k], end);
      if (j < 0 || !/^\s*$/.test(text.slice(end, j))) break;
      end = j + lines[k].length;
    }
    // Khối HTML mở bằng <h1>…<h6> là tiêu đề cấp cao ở Preview, nên cũng mở section ở Source.
    var heading = t.type === 'heading' || (t.type === 'html' && /^<h[1-6][\s>/]/i.test(lines[0]));
    spans.push({ a: lineAt(at), b: lineAt(Math.max(at, end - 1)), heading: heading });
    pos = end;
  });
  return spans;
}
