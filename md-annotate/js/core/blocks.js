/* Khối cấp cao của văn bản markdown, thuần: lexSpans(text, lex) → [{ a, b, heading, tag, items? }], a / b là dòng đầu /
   cuối (đếm từ 0), heading: khối mở section (token heading, hoặc khối HTML mở bằng <h1>…<h6>), tag: thẻ phần tử khối
   dựng ra ở Preview ('' nếu không đoán được), items: dòng đầu của từng mục cấp cao (chỉ danh sách ≥ 2 mục tìm đủ mục).
   lex là bộ tách token (marked.lexer, ui/markdown.js mdLex); nó ném lỗi thì không có khối. pairBlocks() ghép khối
   nguồn với khối cấp cao của Preview.
   Dùng cho cuộn theo nhau (ui/sync-scroll.js), Focus mode (ui/focus.js) và đánh dấu đã đọc (core/review.js).
   Xuất: lexSpans, pairBlocks.
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
  /* Dòng đầu của từng mục cấp cao trong danh sách [at, end): dòng đầu của raw mỗi mục, cùng thụt lề với mục đầu (dòng
     giống hệt của mục con thụt sâu hơn). Thiếu một mục thì null: cả danh sách là một khối. */
  function listItems(its, at, end) {
    var out = [], from = at, indent = at - starts[lineAt(at)];
    for (var k = 0; k < its.length; k++) {
      var first = (its[k].raw || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean)[0];
      var j = first ? findAtLineStart(first, from) : -1;
      while (j >= 0 && j < end && j - starts[lineAt(j)] !== indent) j = findAtLineStart(first, j + 1);
      if (j < 0 || j >= end) return null;
      out.push(lineAt(j));
      from = j + first.length;
    }
    return out;
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
    var sp = { a: lineAt(at), b: lineAt(Math.max(at, end - 1)), heading: heading, tag: blockTag(t) };
    if (t.type === 'list' && t.items && t.items.length > 1) {
      var items = listItems(t.items, at, end);
      if (items) sp.items = items;
    }
    spans.push(sp);
    pos = end;
  });
  return spans;
}

/* Thẻ phần tử cấp cao mà token dựng ra ở Preview. Khối HTML: thẻ mở đầu tiên, bỏ qua chú thích; chỉ là chú thích hay
   thẻ đóng thì ''. */
function blockTag(t) {
  switch (t.type) {
    case 'heading': return 'H' + t.depth;
    case 'paragraph': return 'P';
    case 'list': return t.ordered ? 'OL' : 'UL';
    case 'code': return 'PRE';
    case 'blockquote': return 'BLOCKQUOTE';
    case 'table': return 'TABLE';
    case 'hr': return 'HR';
    case 'html': var m = /^\s*(?:<!--[\s\S]*?-->\s*)*<([a-z][a-z0-9-]*)/i.exec(t.raw || ''); return m ? m[1].toUpperCase() : '';
    default: return '';
  }
}

/* Ghép khối nguồn (tag của lexSpans) với khối cấp cao của Preview (tagName), giữ thứ tự hai bên. Cùng số khối: khối i ↔
   khối i. Lệch số (khối HTML không dựng ra gì, dựng ra nhiều phần tử, hay <details> gộp nhiều khối): ghép theo dãy con
   chung dài nhất của hai dãy thẻ, khối không ghép được bỏ qua. Trả { md, src }: md[i] là khối Preview của khối nguồn
   i, src[j] là khối nguồn của khối Preview j; -1 nếu không ghép. */
var LCS_MAX = 4e6; // ô của bảng dãy con chung; lớn hơn thì chỉ ghép phần đầu và đuôi trùng nhau
export function pairBlocks(srcTags, mdTags) {
  var n = srcTags.length, m = mdTags.length, md = [], src = [], i, j;
  for (i = 0; i < n; i++) md.push(-1);
  for (j = 0; j < m; j++) src.push(-1);
  function pair(i, j) { md[i] = j; src[j] = i; }
  if (n === m) { for (i = 0; i < n; i++) pair(i, i); return { md: md, src: src }; }
  function same(i, j) { return srcTags[i] !== '' && srcTags[i] === mdTags[j]; }
  // Phần đầu và phần đuôi trùng nhau ghép thẳng; bảng chỉ dựng cho đoạn giữa.
  var lo = 0, hs = n, hm = m;
  while (lo < n && lo < m && same(lo, lo)) { pair(lo, lo); lo++; }
  while (hs > lo && hm > lo && same(hs - 1, hm - 1)) { hs--; hm--; pair(hs, hm); }
  var a = hs - lo, b = hm - lo, w = b + 1;
  if (!a || !b || a * b > LCS_MAX) return { md: md, src: src };
  // L[i * w + j]: độ dài dãy con chung dài nhất của srcTags[lo + i …] và mdTags[lo + j …].
  var L = new Uint16Array((a + 1) * w);
  for (i = a - 1; i >= 0; i--) {
    for (j = b - 1; j >= 0; j--) {
      L[i * w + j] = same(lo + i, lo + j) ? L[(i + 1) * w + j + 1] + 1 : Math.max(L[(i + 1) * w + j], L[i * w + j + 1]);
    }
  }
  for (i = 0, j = 0; i < a && j < b;) {
    if (same(lo + i, lo + j)) { pair(lo + i, lo + j); i++; j++; }
    else if (L[(i + 1) * w + j] >= L[i * w + j + 1]) i++;
    else j++;
  }
  return { md: md, src: src };
}
