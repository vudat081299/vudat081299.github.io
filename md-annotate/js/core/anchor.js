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
/* Mọi chỗ khớp, không giới hạn số: đoạn trích ngắn ("an", "và") khớp hàng nghìn lần trong văn bản dài, và chỗ đúng
   có thể nằm sau cùng. */
function findAll(hay, needle) {
  var out = [];
  for (var i = hay.indexOf(needle); i !== -1; i = hay.indexOf(needle, i + 1)) out.push(i);
  return out;
}
/* Số ký tự cuối của pre trùng với các ký tự ngay trước vị trí i của hay. */
function tailMatch(pre, hay, i) { var n = 0; while (n < pre.length && n < i && pre[pre.length - 1 - n] === hay[i - 1 - n]) n++; return n; }
/* Số ký tự đầu của suf trùng với các ký tự từ vị trí j của hay. */
function headMatch(suf, hay, j) { var n = 0; while (n < suf.length && j + n < hay.length && suf[n] === hay[j + n]) n++; return n; }
/* Chỗ của needle trong hay: { i, sure }, i = -1 nếu không có. Nhiều chỗ khớp: chỗ khớp pre / suf dài nhất, rồi gần
   rel nhất. sure: chỉ một chỗ khớp, hoặc đúng một chỗ còn nguyên pre + needle + suf (chỗ ấy thắng, khỏi so từng chỗ). */
function find(hay, needle, pre, suf, rel) {
  if (!needle) return { i: -1, sure: false };
  var whole = pre + needle + suf, k = hay.indexOf(whole);
  if (k !== -1 && hay.indexOf(whole, k + 1) === -1) return { i: k + pre.length, sure: true };
  var hits = findAll(hay, needle);
  if (hits.length < 2) return { i: hits.length ? hits[0] : -1, sure: hits.length === 1 };
  var best = -1, bs = -Infinity;
  hits.forEach(function (i) {
    var sc = tailMatch(pre, hay, i) + headMatch(suf, hay, i + needle.length) - Math.abs(i / Math.max(1, hay.length) - (rel || 0));
    if (sc > bs) { bs = sc; best = i; }
  });
  return { i: best, sure: false };
}
/* Ngữ cảnh đã gộp khoảng trắng, nối được vào trích dẫn đã trim: normWs bỏ khoảng trắng đầu chuỗi và trim bỏ khoảng
   trắng hai đầu trích dẫn, còn trong văn bản chỗ nối là một dấu cách. Thiếu dấu cách ấy thì suffix bắt đầu bằng xuống
   dòng (VD trích trọn dòng) không bao giờ khớp. */
function joinPre(c) {
  var pre = normWs(c.prefix || '').s;
  return pre && pre[pre.length - 1] !== ' ' && WS.test(c.quote.charAt(0)) ? pre + ' ' : pre;
}
function joinSuf(c) {
  var suf = normWs(c.suffix || '').s;
  return suf && (WS.test((c.suffix || '').charAt(0)) || WS.test(c.quote.charAt(c.quote.length - 1))) ? ' ' + suf : suf;
}
/* Trả [đầu, cuối) trong `text`, hoặc null. srcDomain: text là nguồn markdown.
   Đoạn trích lấy ở khung kia (chọn ở Preview, tìm trong nguồn, hay ngược lại) mà khớp nguyên văn nhiều chỗ thì đừng
   tin tầng 1: ngữ cảnh hai khung khác cú pháp (`**`, `|`, `[`) nên so ký tự thô chọn nhầm. Sang tầng 2, nơi ngữ
   cảnh cũng chỉ còn chữ và số; tầng 2 không ra thì mới dùng kết quả tầng 1. */
export function locate(c, text, srcDomain) {
  if (!text || !c.quote) return null;
  var P = prep(text, srcDomain);
  var cross = (c.origin === 'src') !== !!srcDomain;
  /* Tầng 1: nguyên văn, gộp khoảng trắng. */
  var q = normWs(c.quote).s.trim();
  var r1 = find(P.n.s, q, joinPre(c), joinSuf(c), c.rel);
  var t1 = r1.i >= 0 ? [P.n.map[r1.i], P.n.map[r1.i + q.length - 1] + 1] : null;
  if (t1 && (r1.sure || !cross)) return t1;
  /* Tầng 2: chỉ chữ và số; bỏ cú pháp markdown ở trích dẫn khi nó lấy từ nguồn. */
  var qd = c.origin === 'src';
  var k = skel(c.quote, qd).s;
  var r2 = find(P.k.s, k, skel(c.prefix || '', qd).s, skel(c.suffix || '', qd).s, c.rel);
  return r2.i >= 0 ? [P.k.map[r2.i], P.k.map[r2.i + k.length - 1] + 1] : t1;
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
