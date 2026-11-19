/* Đánh dấu đã đọc (MDAN-013), thuần: đơn vị đọc từ văn bản + khối (lexSpans), dấu đã đọc lưu ở phiên (s.reviews), neo
   lại dấu sau khi văn bản đổi, trạng thái từng đơn vị, tiến độ, section, đơn vị chưa đọc kế tiếp, dải dòng cho prompt.
   Đơn vị: mỗi khối cấp cao; danh sách ≥ 2 mục thì mỗi mục cấp cao một đơn vị (mục con thuộc mục cha). Khối không có
   chữ, số hay emoji (kẻ ngang) không là đơn vị. Dòng đếm từ 0 (a, b).
   Dấu (mark) = { h, p, n, q, r }: h băm chữ chuẩn hoá của đơn vị, p / n băm đơn vị liền trước / sau, q 80 ký tự đầu
   (so gần giống, hiện khi mất), r vị trí tương đối. Không lưu số dòng: văn bản đổi thì số dòng sai.
   Trạng thái: 'done' (dấu khớp đúng chữ, ở đâu cũng được), 'changed' (chữ đã đổi, tìm lại nhờ hàng xóm / chữ gần
   giống; tính là chưa đọc), 'todo'. Dấu không tìm lại được là mất (lost), giữ tới khi người dùng bỏ.
   Xuất: dropLost, hashStr, makeMark, nextOpen, normUnit, progress, resolveMarks, reviewRanges, reviewSections,
     reviewUnits, setMarks, unitAt, unitsIn.
   Dùng: core/text.js. */
import { lineStarts } from './text.js';

/* Chữ chuẩn hoá của một đơn vị: bỏ dấu mục danh sách ở dòng đầu (đánh số lại không phải sửa chữ), gộp khoảng trắng. */
export function normUnit(s) {
  return s.replace(/^\s*(?:[-*+]|\d{1,9}[.)])[ \t]+/, '').replace(/\s+/g, ' ').trim();
}
/* Băm 53 bit (cyrb53), chuỗi base36. */
export function hashStr(str) {
  var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (var i = 0; i < str.length; i++) {
    var ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/* Đơn vị đọc theo thứ tự trong văn bản: [{ a, b, block, item, head, depth, sec, h, q }]. block: chỉ số khối trong
   spans; item: chỉ số mục trong danh sách (-1: cả khối); head: khối tiêu đề; depth: cấp tiêu đề (0 nếu không đoán
   được); sec: số section (0 trước tiêu đề đầu, như core/sections.js). */
export function reviewUnits(text, spans) {
  var st = lineStarts(text), nl = st.length, units = [], sec = 0;
  function lineEnd(i) { return i + 1 < nl ? st[i + 1] - 1 : text.length; }
  function blank(i) { return !/\S/.test(text.slice(st[i], lineEnd(i))); }
  spans.forEach(function (sp, k) {
    if (sp.heading) sec++;
    var rs = [];
    if (sp.items && sp.items.length > 1) {
      sp.items.forEach(function (a, j) {
        var b = j + 1 < sp.items.length ? sp.items[j + 1] - 1 : sp.b;
        while (b > a && blank(b)) b--;
        rs.push([a, b, j]);
      });
    } else rs.push([sp.a, sp.b, -1]);
    rs.forEach(function (r) {
      var norm = normUnit(text.slice(st[r[0]], lineEnd(r[1])));
      if (!/[\p{L}\p{N}\p{So}]/u.test(norm)) return;   // \p{So}: emoji, ✓ (tiêu đề chỉ có emoji vẫn là đơn vị)
      units.push({
        a: r[0], b: r[1], block: k, item: r[2], head: !!sp.heading,
        depth: sp.heading && /^H[1-6]$/.test(sp.tag) ? +sp.tag[1] : 0, sec: sec, h: hashStr(norm), q: norm.slice(0, 80)
      });
    });
  });
  return units;
}

function rel(i, n) { return n > 1 ? i / (n - 1) : 0; }
/* Dấu cho đơn vị i của units (lúc người dùng đánh dấu). */
export function makeMark(units, i) {
  var n = units.length;
  return { h: units[i].h, p: i > 0 ? units[i - 1].h : '', n: i + 1 < n ? units[i + 1].h : '', q: units[i].q, r: rel(i, n) };
}
var wordsMemo = {}, wordsN = 0;
function words(q) {
  if (!wordsMemo[q]) {
    if (++wordsN > 4000) { wordsMemo = {}; wordsN = 1; }
    var set = {};
    (q.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).forEach(function (w) { set[w] = true; });
    wordsMemo[q] = set;
  }
  return wordsMemo[q];
}
/* Gần giống: tỉ lệ từ chung trên mọi từ (Jaccard) của hai đoạn đầu. */
function similar(a, b) {
  var A = words(a), B = words(b), inter = 0, uni = 0, w;
  for (w in A) { uni++; if (B[w]) inter++; }
  for (w in B) if (!A[w]) uni++;
  return uni ? inter / uni : 0;
}
var WINDOW = 150;   // dấu đã đổi chữ chỉ tìm trong ±150 đơn vị quanh chỗ cũ, để văn bản dài vẫn nhanh

/* Neo lại dấu vào units. Trả { state, owner, lost }: state[i] của đơn vị i; owner[i] chỉ số dấu của nó (-1: không);
   lost: chỉ số các dấu không tìm lại được.
   Lượt 1: dấu khớp đúng chữ (h) — chữ trùng nhiều chỗ thì chọn chỗ có hàng xóm khớp, rồi gần r nhất.
   Lượt 2: dấu còn lại tìm đơn vị chưa có dấu: hai hàng xóm khớp, hoặc một hàng xóm khớp và chữ gần giống ≥ 0,5,
   hoặc chữ gần giống ≥ 0,7. Một hàng xóm khớp mà chữ khác hẳn (khối bị xoá, khối sau dồn lên) thì không lấy. */
export function resolveMarks(units, marks) {
  var n = units.length, state = [], owner = [], lost = [], byH = {}, pend = [];
  units.forEach(function (u, i) { state.push('todo'); owner.push(-1); (byH[u.h] = byH[u.h] || []).push(i); });
  function ctx(m, i) {
    return (m.p && i > 0 && units[i - 1].h === m.p ? 1 : 0) + (m.n && i + 1 < n && units[i + 1].h === m.n ? 1 : 0);
  }
  marks.forEach(function (m, k) {
    var best = -1, bs = -Infinity;
    (byH[m.h] || []).forEach(function (i) {
      if (owner[i] >= 0) return;
      var s = ctx(m, i) * 10 - Math.abs(rel(i, n) - m.r);
      if (s > bs) { bs = s; best = i; }
    });
    if (best >= 0) { owner[best] = k; state[best] = 'done'; } else pend.push(k);
  });
  pend.forEach(function (k) {
    var m = marks[k], best = -1, bs = -Infinity, mid = Math.round(m.r * (n - 1));
    for (var i = Math.max(0, mid - WINDOW); i < Math.min(n, mid + WINDOW + 1); i++) {
      if (owner[i] >= 0) continue;
      var c = ctx(m, i), sim = similar(m.q, units[i].q);
      if (!(c === 2 || (c === 1 && sim >= 0.5) || sim >= 0.7)) continue;
      var s = c * 2 + sim * 2 - Math.abs(rel(i, n) - m.r);
      if (s > bs) { bs = s; best = i; }
    }
    if (best >= 0) { owner[best] = k; state[best] = 'changed'; } else lost.push(k);
  });
  return { state: state, owner: owner, lost: lost };
}

/* Dấu mới sau khi đánh dấu (on) hay bỏ dấu (!on) các đơn vị idxs. Đơn vị 'changed' đánh dấu lại thì thành 'done'
   (băm chữ mới). Dấu 'done' khác được làm mới hàng xóm và vị trí; dấu 'changed' và dấu mất giữ nguyên. */
export function setMarks(units, marks, res, idxs, on) {
  var drop = {}, unitOf = {}, seen = {}, out = [];
  idxs.forEach(function (i) { if (res.owner[i] >= 0) drop[res.owner[i]] = true; });
  res.owner.forEach(function (k, i) { if (k >= 0) unitOf[k] = i; });
  marks.forEach(function (m, k) {
    if (drop[k]) return;
    var i = unitOf[k];
    out.push(i != null && res.state[i] === 'done' ? makeMark(units, i) : m);
  });
  if (on) idxs.forEach(function (i) { if (!seen[i]) { seen[i] = true; out.push(makeMark(units, i)); } });
  return out;
}
/* Bỏ các dấu mất. */
export function dropLost(marks, res) {
  var lost = {};
  res.lost.forEach(function (k) { lost[k] = true; });
  return marks.filter(function (m, k) { return !lost[k]; });
}

/* Tiến độ: pct tính theo số dòng của đơn vị (khối dài nặng hơn tiêu đề), làm tròn xuống: 100 chỉ khi đọc hết. */
export function progress(units, state) {
  var tot = 0, dn = 0, nd = 0, nc = 0;
  units.forEach(function (u, i) {
    var w = u.b - u.a + 1;
    tot += w;
    if (state[i] === 'done') { dn += w; nd++; } else if (state[i] === 'changed') nc++;
  });
  return { done: nd, changed: nc, total: units.length, pct: tot ? Math.floor(dn * 100 / tot) : 0 };
}
/* Đơn vị chưa đọc (todo hoặc changed) kế tiếp từ from theo dir (1 / -1), vòng qua đầu / cuối:
   { i, wrapped }, hoặc null khi đã đọc hết. from = -1 (dir 1) hay n (dir -1) là bắt đầu từ mép. */
export function nextOpen(state, from, dir) {
  var n = state.length;
  for (var k = 1; k <= n; k++) {
    var i = from + dir * k, wrapped = i < 0 || i >= n;
    i = ((i % n) + n) % n;
    if (state[i] !== 'done') return { i: i, wrapped: wrapped };
  }
  return null;
}
/* Chỉ số đơn vị chứa dòng `line`; -1 nếu dòng nằm ngoài mọi đơn vị. */
export function unitAt(units, line) {
  var lo = 0, hi = units.length - 1;
  while (lo <= hi) {
    var mid = (lo + hi) >> 1;
    if (line < units[mid].a) hi = mid - 1; else if (line > units[mid].b) lo = mid + 1; else return mid;
  }
  return -1;
}
/* Chỉ số các đơn vị chạm dải dòng [la, lb] (bôi đen hay chọn dòng: nới ra trọn khối). */
export function unitsIn(units, la, lb) {
  var out = [];
  units.forEach(function (u, i) { if (u.a <= lb && u.b >= la) out.push(i); });
  return out;
}

/* Tiêu đề section: chữ của khối tiêu đề, bỏ dấu #, vạch gạch setext và thẻ HTML. */
function headTitle(q) {
  if (!/^\s*[#<]/.test(q)) q = q.replace(/\s+(?:=+|-+)\s*$/, '');   // tiêu đề setext: bỏ dòng gạch === / ---
  return q.replace(/<[^>]*>/g, ' ').replace(/^#{1,6}\s*/, '').replace(/\s+#+\s*$/, '').replace(/\s+/g, ' ').trim();
}
/* Section cho dàn ý: [{ sec, first, last, a, b, title, depth, done, changed, total, comments, state }]. first / last:
   đơn vị đầu / cuối; a / b: dòng đầu / cuối; title rỗng cho phần trước tiêu đề đầu; comments: số dòng trong cLines
   (dòng đầu của nhận xét, đếm từ 0) rơi vào section; state: 'done' | 'changed' (có đơn vị đổi chữ) | 'part' | 'todo'. */
export function reviewSections(units, state, cLines) {
  var secs = [], cur = null;
  units.forEach(function (u, i) {
    if (!cur || u.sec !== cur.sec) {
      cur = { sec: u.sec, first: i, last: i, a: u.a, b: u.b, title: u.head ? headTitle(u.q) : '', depth: u.head ? u.depth : 0,
        done: 0, changed: 0, total: 0, comments: 0 };
      secs.push(cur);
    }
    cur.last = i; cur.b = u.b; cur.total++;
    if (state[i] === 'done') cur.done++; else if (state[i] === 'changed') cur.changed++;
  });
  (cLines || []).forEach(function (l) {
    for (var k = secs.length - 1; k >= 0; k--) if (secs[k].a <= l || k === 0) { secs[k].comments++; break; }
  });
  secs.forEach(function (s) {
    s.state = s.done === s.total ? 'done' : s.changed ? 'changed' : s.done ? 'part' : 'todo';
  });
  return secs;
}
/* Dải dòng đã đọc / chưa đọc cho prompt, đếm từ 1: { done: [[a, b]], todo: [[a, b]] }. Đơn vị liền nhau cùng loại gộp
   một dải (gồm cả dòng trống giữa chúng); 'changed' tính là chưa đọc. */
export function reviewRanges(units, state) {
  var out = { done: [], todo: [] }, last = null;
  units.forEach(function (u, i) {
    var k = state[i] === 'done' ? 'done' : 'todo';
    if (last && last.k === k) last.r[1] = u.b + 1;
    else { last = { k: k, r: [u.a + 1, u.b + 1] }; out[k].push(last.r); }
  });
  return out;
}
