/* Đánh dấu đã đọc (MDAN-013), thuần: đơn vị đọc từ văn bản + khối (lexSpans), dấu đã đọc lưu ở phiên (s.reviews), neo
   lại dấu sau khi văn bản đổi, trạng thái từng đơn vị, tiến độ, section, đơn vị chưa đọc kế tiếp, dải dòng cho prompt.
   Đơn vị: mỗi khối cấp cao; danh sách ≥ 2 mục thì mỗi mục cấp cao một đơn vị (mục con thuộc mục cha). Khối không có
   chữ, số hay emoji (kẻ ngang) và khối chỉ có chú thích HTML (Preview không dựng ra gì) không là đơn vị. Dòng đếm từ 0.
   Dấu (mark) = { h, p, n, q, r }: h băm chữ chuẩn hoá của đơn vị, p / n băm đơn vị liền trước / sau, q 80 ký tự đầu
   (so gần giống, hiện khi mất), r vị trí tương đối. Không lưu số dòng: văn bản đổi thì số dòng sai.
   Section mở ở mỗi tiêu đề h1–h6 (cấp 1–6), và ở nhãn (MDAN-093): đoạn một dòng toàn chữ đậm (cấp 7), dòng ngắn kết thúc
   bằng ':' ngay trước một danh sách (cấp 8). Văn bản không có tiêu đề vẫn có dàn ý theo nhãn.
   Trạng thái: 'done' (dấu khớp đúng chữ, ở đâu cũng được), 'changed' (chữ đã đổi, tìm lại nhờ hàng xóm / chữ gần
   giống; tính là chưa đọc), 'todo'. Dấu không tìm lại được là mất (lost), giữ tới khi người dùng bỏ.
   Xuất: allDone, dropLost, firstOpen, hashStr, labelDepth, linesWord, makeMark, markWord, nextOpen, normUnit, progress,
     resolveMarks, reviewRanges, reviewSections, reviewUnits, rvLines, setMarks, unitAt, unitRuns, unitsIn, unitsOfLines, withSug.
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

/* Nhãn (MDAN-093): cấp 7 nếu khối k là đoạn một dòng chỉ gồm chữ đậm (**…** hay __…__, ':' trong hay ngoài dấu đậm),
   cấp 8 nếu là đoạn một dòng ngắn (≤ LABEL_MAX ký tự) không đậm kết thúc bằng ':' mà khối ngay sau là danh sách; không
   thì 0. Tiêu đề h1–h6 đứng trên nhãn. */
var LABEL_MAX = 60, BOLD_MAX = 160;
export function labelDepth(text, spans, k) {
  var sp = spans[k];
  if (!sp || sp.heading || sp.tag !== 'P' || sp.a !== sp.b) return 0;
  var st = lineStarts(text), end = sp.a + 1 < st.length ? st[sp.a + 1] - 1 : text.length;
  var line = text.slice(st[sp.a], end).trim();
  var m = /^(\*\*|__)(?=\S)([\s\S]+?)(?<=\S)\1\s*:?$/.exec(line);
  if (m && line.length <= BOLD_MAX && m[2].indexOf(m[1]) < 0) return 7;
  var next = spans[k + 1];
  if (line.length <= LABEL_MAX && /[^:]:$/.test(line) && !/[*_`]/.test(line) && next && (next.tag === 'UL' || next.tag === 'OL')) return 8;
  return 0;
}

/* Đơn vị đọc theo thứ tự trong văn bản: [{ a, b, block, item, head, depth, sec, h, q }]. block: chỉ số khối trong
   spans; item: chỉ số mục trong danh sách (-1: cả khối); head: khối tiêu đề hay nhãn (labelDepth); depth: cấp tiêu đề
   1–6, nhãn 7–8 (0 nếu không đoán được); sec: số section (0 trước tiêu đề / nhãn đầu). */
export function reviewUnits(text, spans) {
  var st = lineStarts(text), nl = st.length, units = [], sec = 0;
  function lineEnd(i) { return i + 1 < nl ? st[i + 1] - 1 : text.length; }
  function blank(i) { return !/\S/.test(text.slice(st[i], lineEnd(i))); }
  spans.forEach(function (sp, k) {
    var lab = labelDepth(text, spans, k), head = !!sp.heading || lab > 0;
    if (head) sec++;
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
      if (/^(?:<!--[\s\S]*?-->\s*)+$/.test(norm)) return;
      units.push({
        a: r[0], b: r[1], block: k, item: r[2], head: head,
        depth: lab || (sp.heading && /^H[1-6]$/.test(sp.tag) ? +sp.tag[1] : 0), sec: sec, h: hashStr(norm), q: norm.slice(0, 80)
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
/* Tập từ (chữ thường) của một đoạn đầu: Set. */
function words(q) {
  return new Set(q.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []);
}
/* Gần giống: tỉ lệ từ chung trên mọi từ (Jaccard). Hai tập lệch cỡ quá `floor` thì không thể đạt: trả 0, khỏi đếm. */
function similar(A, B, floor) {
  var a = A.size, b = B.size;
  if (!a || !b || Math.min(a, b) < floor * Math.max(a, b)) return 0;
  var S = a <= b ? A : B, L = a <= b ? B : A, inter = 0;
  S.forEach(function (w) { if (L.has(w)) inter++; });
  return inter / (a + b - inter);
}
var WINDOW = 150;   // dấu đã đổi chữ chỉ tìm trong ±150 đơn vị quanh chỗ cũ, để văn bản dài vẫn nhanh

/* Neo lại dấu vào units. Trả { state, owner, lost }: state[i] của đơn vị i; owner[i] chỉ số dấu của nó (-1: không);
   lost: chỉ số các dấu không tìm lại được. Hàng xóm "khớp": đơn vị liền trước / sau có đúng băm p / n của dấu; ở mép
   văn bản, không có hàng xóm khớp với p / n rỗng (dấu của khối đầu / cuối).
   Lượt 1, chọn cặp (dấu, đơn vị) điểm cao nhất trước, không theo thứ tự dấu (chữ trùng: kết quả không tuỳ thứ tự bấm):
     khớp đúng chữ (h): 10 + 4 × số hàng xóm khớp; sửa tại chỗ (chữ khác, cả hai hàng xóm khớp): 12 + 2 × độ giống.
     Khối sửa tại chỗ thắng một bản trùng chữ nằm chỗ khác, thua bản trùng chữ có hàng xóm khớp. Trừ độ lệch vị trí r.
   Lượt 2: dấu còn lại tìm đơn vị trống trong ±150 đơn vị: một hàng xóm khớp và chữ gần giống ≥ 0,5, hoặc chữ gần giống
   ≥ 0,7. Đơn vị có chữ của chính hàng xóm cũ (khối bị xoá, hàng xóm dồn lên) không bao giờ nhận dấu. */
export function resolveMarks(units, marks) {
  var n = units.length, state = [], owner = [], taken = [], lost = [], byH = {}, pairs = [], uw = [];
  units.forEach(function (u, i) { state.push('todo'); owner.push(-1); (byH[u.h] = byH[u.h] || []).push(i); });
  function hAt(i) { return i >= 0 && i < n ? units[i].h : ''; }
  function ctx(m, i) { return (hAt(i - 1) === (m.p || '') ? 1 : 0) + (hAt(i + 1) === (m.n || '') ? 1 : 0); }
  function wordsAt(i) { return uw[i] || (uw[i] = words(units[i].q)); }
  function slid(m, i) { return (m.p && units[i].h === m.p) || (m.n && units[i].h === m.n); }
  marks.forEach(function (m, k) {
    var mw = null;
    (byH[m.h] || []).forEach(function (i) { pairs.push([10 + 4 * ctx(m, i) - Math.abs(rel(i, n) - m.r), k, i, 'done']); });
    var at = m.p ? (byH[m.p] || []).map(function (i) { return i + 1; }) : [0];
    at.forEach(function (i) {
      if (i >= n || units[i].h === m.h || slid(m, i) || ctx(m, i) < 2) return;
      mw = mw || words(m.q);
      pairs.push([12 + 2 * similar(mw, wordsAt(i), 0) - Math.abs(rel(i, n) - m.r), k, i, 'changed']);
    });
  });
  pairs.sort(function (x, y) { return y[0] - x[0] || x[1] - y[1] || x[2] - y[2]; });
  pairs.forEach(function (c) {
    if (taken[c[1]] || owner[c[2]] >= 0) return;
    taken[c[1]] = true; owner[c[2]] = c[1]; state[c[2]] = c[3];
  });
  marks.forEach(function (m, k) {
    if (taken[k]) return;
    var best = -1, bs = -Infinity, mid = Math.round(m.r * (n - 1)), mw = words(m.q);
    for (var i = Math.max(0, mid - WINDOW); i < Math.min(n, mid + WINDOW + 1); i++) {
      if (owner[i] >= 0 || slid(m, i)) continue;
      var c = ctx(m, i), sim = similar(mw, wordsAt(i), c ? 0.5 : 0.7);
      if (!((c && sim >= 0.5) || sim >= 0.7)) continue;
      var sc = c * 2 + sim * 2 - Math.abs(rel(i, n) - m.r);
      if (sc > bs) { bs = sc; best = i; }
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
/* Mọi đơn vị trong idx đã đọc (thao tác trên chúng là bỏ dấu); idx rỗng: false. */
export function allDone(state, idx) {
  return idx.length > 0 && idx.every(function (i) { return state[i] === 'done'; });
}
/* Thao tác đánh dấu / bỏ dấu trên idx: 'Marked 3 blocks (L4–9) reviewed.' / 'Unmarked 1 block (L4).' cho toast. */
export function markWord(units, idx, on) {
  var n = idx.length;
  return (on ? 'Marked ' : 'Unmarked ') + n + ' block' + (n === 1 ? '' : 's') + ' (' + linesWord(units, idx) + ')' + (on ? ' reviewed.' : '.');
}
/* Nhãn dòng của các đơn vị idx (tăng dần): 'L12–18, L30'. */
export function linesWord(units, idx) {
  return unitRuns(units, idx).map(function (r) { return 'L' + (r[0] + 1) + (r[1] > r[0] ? '–' + (r[1] + 1) : ''); }).join(', ');
}
/* Dải dòng [a, b] (đếm từ 0) của các đơn vị idx (tăng dần); đơn vị liền nhau gộp một dải. */
export function unitRuns(units, idx) {
  var runs = [], lastI = -2;
  idx.forEach(function (i) {
    var u = units[i];
    if (runs.length && lastI === i - 1) runs[runs.length - 1][1] = u.b; else runs.push([u.a, u.b]);
    lastI = i;
  });
  return runs;
}
/* Đơn vị (tăng dần, không lặp) chứa các dòng `lines` (đếm từ 1, như dòng đã chọn ở lề số). */
export function unitsOfLines(units, lines) {
  var out = [];
  lines.forEach(function (n) { var k = unitAt(units, n - 1); if (k >= 0 && out.indexOf(k) < 0) out.push(k); });
  return out.sort(function (a, b) { return a - b; });
}
/* Dòng Source làm mờ khi Dim reviewed: dòng của đơn vị đã đọc, và dòng trống theo dòng ngay trên nó (cả dải trống liền
   nhau), để vùng đã đọc không có khe sáng. blank[k]: dòng k trống. Trả Uint8Array, 1 là mờ. */
export function rvLines(units, state, blank) {
  var n = blank.length, on = new Uint8Array(n);
  units.forEach(function (u, i) {
    if (state[i] === 'done') for (var k = u.a; k <= u.b && k < n; k++) on[k] = 1;
  });
  for (var k = 1; k < n; k++) if (!on[k] && blank[k] && on[k - 1]) on[k] = 1;
  return on;
}
/* Trạng thái hiển thị của từng đơn vị (làn, dải tiến độ): state, trừ đơn vị chưa đọc được gợi ý (sugIdx) thì 'sug'. */
export function withSug(state, sugIdx) {
  var out = state.slice();
  sugIdx.forEach(function (i) { if (out[i] !== 'done') out[i] = 'sug'; });
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
/* Đơn vị chưa đọc đầu tiên trong [a, b]; đọc hết thì a (nút tên section ở tab Review: tới chỗ chưa đọc của nó). */
export function firstOpen(state, a, b) {
  for (var i = a; i <= b; i++) if (state[i] !== 'done') return i;
  return a;
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

/* Tiêu đề section: chữ của khối tiêu đề, bỏ dấu #, vạch gạch setext và thẻ HTML; nhãn (cấp 7–8): bỏ dấu đậm và ':' cuối. */
function headTitle(q, depth) {
  if (depth > 6) return q.replace(/^(\*\*|__)/, '').replace(/(\*\*|__)?\s*:?\s*(\*\*|__)?\s*:?$/, '').trim();
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
      cur = { sec: u.sec, first: i, last: i, a: u.a, b: u.b, title: u.head ? headTitle(u.q, u.depth) : '', depth: u.head ? u.depth : 0,
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
/* Dải dòng đã đọc cho prompt, đếm từ 1: [[a, b]]. Đơn vị đã đọc liền nhau gộp một dải (gồm cả dòng trống giữa chúng);
   'changed' tính là chưa đọc. */
export function reviewRanges(units, state) {
  var out = [];
  units.forEach(function (u, i) {
    if (state[i] !== 'done') return;
    if (i && state[i - 1] === 'done') out[out.length - 1][1] = u.b + 1;
    else out.push([u.a + 1, u.b + 1]);
  });
  return out;
}
