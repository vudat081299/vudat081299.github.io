/* Neo đoạn trích, thuần (chỉ chuỗi): tìm lại đoạn trích trong một văn bản (locate), và dựng đoạn trích + ngữ cảnh
   từ chữ của một khung và vị trí vùng chọn (quoteFrom). Phần đọc DOM ở ui/anchor-dom.js.
   Xuất: locate, quoteFrom.
   Dùng: không module nào. */

/* NEO ĐOẠN TRÍCH — kiểu TextQuoteSelector (W3C Web Annotation):
   lưu đoạn trích + ngữ cảnh trước/sau, tìm lại bằng chữ trong từng chế độ xem.
   Tầng 1: khớp nguyên văn, gộp khoảng trắng. Tầng 2: chỉ chữ và số, chữ thường,
   bỏ cú pháp markdown có chữ (đích link, thẻ HTML, số thứ tự danh sách) — để
   đoạn chọn ở bản dựng tìm được trong nguồn và ngược lại. */
var WS = /\s/;
var ALNUM = /[\p{L}\p{N}]/u;
var WORD = /[\p{L}\p{N}\p{M}]/u;   // chữ Việt có dấu là \p{L}; dấu rời (NFD) là \p{M}
var SYNTAX = /\]\([^)\n]*\)|<\/?[A-Za-z][^>\n]*>|&#?[0-9A-Za-z]+;|^[ \t]*(?:`{3,}|~{3,})[^\n]*$|^[ \t]*\[[^\]\n]+\]:[^\n]*$|^[ \t]*\d{1,9}[.)](?=[ \t])|^[ \t]*[-*+][ \t]+\[[ xX]\]/gm;

function normWs(str) {
  var out = [], map = [], ws = false;
  for (var i = 0; i < str.length; i++) {
    var c = str[i];
    if (WS.test(c)) { if (!ws && out.length) { out.push(' '); map.push(i); } ws = true; }
    else { out.push(c); map.push(i); ws = false; }
  }
  return { s: out.join(''), map: map };
}
function skel(str, drop) {
  var mask = null, m;
  if (drop) {
    mask = new Uint8Array(str.length);
    SYNTAX.lastIndex = 0;
    while ((m = SYNTAX.exec(str))) {
      mask.fill(1, m.index, m.index + m[0].length);
      if (!m[0].length) SYNTAX.lastIndex++;
    }
  }
  var out = [], map = [];
  for (var i = 0; i < str.length; i++) {
    if (mask && mask[i]) continue;
    var c = str[i];
    if (!ALNUM.test(c)) continue;
    var l = c.toLowerCase();
    for (var j = 0; j < l.length; j++) { out.push(l[j]); map.push(i); }
  }
  return { s: out.join(''), map: map };
}
var preps = [];
function prep(text, drop) {
  for (var i = 0; i < preps.length; i++) if (preps[i].drop === drop && preps[i].text === text) return preps[i];
  var p = { text: text, drop: drop, n: normWs(text), k: skel(text, drop) };
  preps.unshift(p); if (preps.length > 4) preps.pop();
  return p;
}
function findAll(hay, needle) {
  var out = [];
  if (!needle) return out;
  var i = hay.indexOf(needle);
  while (i !== -1 && out.length < 500) { out.push(i); i = hay.indexOf(needle, i + 1); }
  return out;
}
function commonSuffix(a, b) { var n = 0; while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++; return n; }
function commonPrefix(a, b) { var n = 0; while (n < a.length && n < b.length && a[n] === b[n]) n++; return n; }
function pick(hits, len, hay, pre, suf, rel) {
  if (hits.length === 1) return hits[0];
  var best = hits[0], bs = -Infinity;
  hits.forEach(function (i) {
    var sc = commonSuffix(pre, hay.slice(Math.max(0, i - pre.length), i)) +
             commonPrefix(suf, hay.slice(i + len, i + len + suf.length)) -
             Math.abs(i / Math.max(1, hay.length) - (rel || 0));
    if (sc > bs) { bs = sc; best = i; }
  });
  return best;
}
/* Trả [đầu, cuối) trong `text`, hoặc null. srcDomain: text là nguồn markdown. */
export function locate(c, text, srcDomain) {
  if (!text || !c.quote) return null;
  var P = prep(text, srcDomain);
  var q = normWs(c.quote).s.trim(), hits, i;
  if (q) {
    hits = findAll(P.n.s, q);
    if (hits.length) {
      i = pick(hits, q.length, P.n.s, normWs(c.prefix || '').s, normWs(c.suffix || '').s, c.rel);
      return [P.n.map[i], P.n.map[i + q.length - 1] + 1];
    }
  }
  var qd = c.origin === 'src';
  var k = skel(c.quote, qd).s;
  if (!k) return null;
  hits = findAll(P.k.s, k);
  if (!hits.length) return null;
  i = pick(hits, k.length, P.k.s, skel(c.prefix || '', qd).s, skel(c.suffix || '', qd).s, c.rel);
  return [P.k.map[i], P.k.map[i + k.length - 1] + 1];
}


/* Vùng chọn → đoạn trích. full: chữ của khung; [s, e): vùng chọn trong full (đã cắt theo khung); which: 'src' |
   'md'; selText: chữ trình duyệt trả cho vùng chọn (chỉ dùng khi which = 'md'). Trả null khi chỉ có khoảng trắng. */
export function quoteFrom(full, s, e, which, selText) {
  while (s < e && WS.test(full[s])) s++;
  while (e > s && WS.test(full[e - 1])) e--;
  if (e <= s) return null;
  /* Kéo chuột hay bắt đầu, kết thúc giữa từ: nới ra tới mép từ. */
  var s0 = s, e0 = e;
  while (s > 0 && WORD.test(full[s - 1]) && WORD.test(full[s])) s--;
  while (e < full.length && WORD.test(full[e]) && WORD.test(full[e - 1])) e++;
  var quote;
  if (which === 'src') quote = full.slice(s, e);
  else {
    var mid = selText.trim().replace(/\n{3,}/g, '\n\n');
    quote = mid ? full.slice(s, s0) + mid + full.slice(e0, e) : full.slice(s, e);
  }
  return {
    origin: which, quote: quote, s: s, e: e,
    prefix: full.slice(Math.max(0, s - 48), s), suffix: full.slice(e, e + 48),
    rel: s / Math.max(1, full.length)
  };
}
