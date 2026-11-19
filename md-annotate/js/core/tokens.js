/* Tách token markdown cho khung Source, thuần (chỉ chuỗi): theo dòng (khối rào, đầu mục, kẻ ngang, trích khối, dấu
   danh sách) rồi trong dòng (mã, link, URL, đậm, nghiêng…). Màu kiểu VS Code (MDAN-001); vẽ ở ui/source-view.js.
   tokens(text) → [{ s, e, c }]: không chồng nhau, theo thứ tự; khung chỉ bọc chữ trong <span>, nên text vẫn đúng
   bằng nguồn.
   Xuất: tokens.
   Dùng: không module nào. */

var INLINE = [
  ['code', /(`+)([^`\n]|[^`\n][^\n]*?[^`\n])(\1)(?!`)/g, ['sx-code', 'sx-code', 'sx-code']],
  ['link', /(!?\[)([^\]\n]*)(\]\()([^)\s]*)((?:\s+"[^"\n]*")?)(\))/g, ['sx-punct', 'sx-link', 'sx-punct', 'sx-url', 'sx-string', 'sx-punct']],
  ['ref', /(!?\[)([^\]\n]+)(\]\[)([^\]\n]*)(\])/g, ['sx-punct', 'sx-link', 'sx-punct', 'sx-url', 'sx-punct']],
  ['auto', /(<(?:https?:\/\/|mailto:)[^>\s]+>)/g, ['sx-url']],
  ['tag', /(<!--.*?-->|<\/?[A-Za-z][\w-]*(?:\s[^<>\n]*)?\/?>)/g, ['sx-tag']],
  ['url', /(\bhttps?:\/\/[^\s<>()\[\]"']*[^\s<>()\[\]"'.,;:!?])/g, ['sx-url']],
  ['strong', /(\*\*|__)(?=\S)([^\n]*?\S)(\1)/g, ['sx-punct', 'sx-strong', 'sx-punct']],
  ['em', /(\*|_)(?=[^\s*_])([^\n]*?[^\s*_]|[^\s*_])(\1)(?![\w*])/g, ['sx-punct', 'sx-em', 'sx-punct']],
  ['strike', /(~~)(?=\S)([^\n]*?\S)(~~)/g, ['sx-punct', 'sx-strike', 'sx-punct']],
  ['string', /("[^"\n]{1,200}"|“[^”\n]{1,200}”)/g, ['sx-string']]
];
var PIPE = ['pipe', /(\|)/g, ['sx-punct']];
/* Chỗ khớp đầu tiên của luật r từ vị trí `from` trở đi, hoặc null. */
function nextMatch(rule, line, from) {
  var rx = rule[1], m;
  rx.lastIndex = from;
  m = rx.exec(line);
  /* _nhấn_ không bắt đầu giữa từ (snake_case) */
  while (m && rule[0] === 'em' && m[1] === '_' && m.index > 0 && /[\p{L}\p{N}]/u.test(line[m.index - 1])) {
    rx.lastIndex = m.index + 1; m = rx.exec(line);
  }
  return m;
}
function inlineToks(line, off, base, out, table) {
  var rules = table ? INLINE.concat([PIPE]) : INLINE, pos = 0;
  /* Nhớ chỗ khớp kế tiếp của từng luật: chỗ khớp ở vị trí i không phụ thuộc nơi bắt đầu tìm, nên còn đúng tới khi
     pos vượt qua nó; luật không còn khớp (null) thì thôi tìm. Tìm lại mỗi vòng làm dòng dài nhiều token chậm bậc ba. */
  var next = rules.map(function () { return undefined; });
  while (pos < line.length) {
    var best = null, rule = null;
    for (var r = 0; r < rules.length; r++) {
      if (next[r] === undefined || (next[r] && next[r].index < pos)) next[r] = nextMatch(rules[r], line, pos);
      var m = next[r];
      if (m && m[0].length && (!best || m.index < best.index)) { best = m; rule = rules[r]; }
    }
    if (!best) break;
    if (best.index > pos && base) out.push({ s: off + pos, e: off + best.index, c: base });
    var at = off + best.index;
    for (var g = 1; g < best.length; g++) {
      var part = best[g] || '';
      if (part) out.push({ s: at, e: at + part.length, c: rule[2][g - 1] });
      at += part.length;
    }
    pos = best.index + best[0].length;
  }
  if (pos < line.length && base) out.push({ s: off + pos, e: off + line.length, c: base });
}
var tokCache = { text: null, toks: null };
export function tokens(text) {
  if (tokCache.text === text) return tokCache.toks;
  var out = [], lines = text.split('\n'), off = 0, fence = null;
  function push(c, a, b) { if (b > a) out.push({ s: a, e: b, c: c }); }
  lines.forEach(function (line) {
    var L = line.length, m;
    if (fence) {
      m = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length) { push('sx-fence', off, off + L); fence = null; }
      else push('sx-code', off, off + L);
    } else if ((m = line.match(/^( {0,3})(`{3,}|~{3,})(.*)$/)) && !(m[2][0] === '`' && m[3].indexOf('`') >= 0)) {
      fence = m[2];
      var a = off + m[1].length;
      push('sx-fence', a, a + m[2].length);
      push('sx-info', a + m[2].length, off + L);
    } else if ((m = line.match(/^( {0,3})(#{1,6})(?=[ \t]|$)/))) {
      push('sx-punct', off + m[1].length, off + m[0].length);
      inlineToks(line.slice(m[0].length), off + m[0].length, 'sx-head', out, false);
    } else if (/^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/.test(line) ||
               /^[ \t]*\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)+\|?[ \t]*$/.test(line)) {
      push('sx-punct', off, off + L);            // đường kẻ ngang, dòng phân cách bảng
    } else {
      var p = 0, base = null;
      if ((m = line.match(/^(?: {0,3}>[ ]?)+/))) { push('sx-quote', off, off + m[0].length); p = m[0].length; base = 'sx-qtext'; }
      var rest = line.slice(p);
      if ((m = rest.match(/^([ \t]*)([-*+]|\d{1,9}[.)])([ \t]+)(\[[ xX]\])?/))) {
        var b = off + p + m[1].length;
        push('sx-punct', b, b + m[2].length);
        if (m[4]) push('sx-punct', b + m[2].length + m[3].length, b + m[2].length + m[3].length + m[4].length);
        p += m[0].length;
      }
      var table = /^[ \t]*\|/.test(line) || / \| /.test(line);
      inlineToks(line.slice(p), off + p, base, out, table);
    }
    off += L + 1;
  });
  tokCache = { text: text, toks: out };
  return out;
}

