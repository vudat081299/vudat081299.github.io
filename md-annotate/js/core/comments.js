/* Nhận xét của một phiên, thuần: thêm, sửa, cắt / trả lại (Undo), neo lại vào nguồn và bản dựng, xếp theo vị trí
   trong nguồn và đánh số, dải highlight cho hai khung, cảnh báo trùng / chồng đoạn.
   Nhận xét nhiều dòng có `parts` (≥ 2 đoạn trích, mỗi dải dòng liền một đoạn); quote / prefix / suffix / origin / rel
   ở ngoài bằng parts[0]. Đọc đoạn trích luôn qua partsOf(c).
   d (kết quả anchorAll) = { anchors, orphans, ordered, numbers }:
     anchors: id → { src, md, parts: [{ src, md }] } (src / md: [a, b] | null; ở ngoài là của phần đầu tìm thấy);
     orphans: id → true khi mọi phần mất neo; ordered: theo thứ tự trong văn bản; numbers: id → số trong prompt.
   Xuất: addComment, anchorAll, cutComment, editComment, findComment, markRanges, overlapWarning, partsOf,
     restoreComment.
   Dùng: core/anchor.js, core/session.js, core/hints.js. */
import { locate } from './anchor.js';
import { uid } from './session.js';
import { normKey } from './hints.js';

/* Các đoạn trích của nhận xét: parts, hoặc chính nó (nhận xét một đoạn). */
export function partsOf(c) { return c.parts && c.parts.length ? c.parts : [c]; }
function selector(p) { return { quote: p.quote, prefix: p.prefix, suffix: p.suffix, origin: p.origin, rel: p.rel }; }
export function findComment(s, id) { for (var i = 0; i < s.comments.length; i++) if (s.comments[i].id === id) return s.comments[i]; return null; }
/* info: đoạn trích từ quoteFrom (origin, quote, prefix, suffix, rel), hoặc từ pickInfo (thêm parts). Chỉ lưu parts
   khi có từ hai đoạn: một đoạn là nhận xét thường. Trả id mới. */
export function addComment(s, info, t) {
  var id = uid();
  var c = {
    id: id, quote: info.quote, comment: t, origin: info.origin,
    prefix: info.prefix, suffix: info.suffix, rel: info.rel, created: Date.now()
  };
  if (info.parts && info.parts.length > 1) c.parts = info.parts.map(selector);
  s.comments.push(c);
  return id;
}
/* Trả true khi chữ nhận xét thật sự đổi. */
export function editComment(s, id, t) {
  var c = findComment(s, id);
  if (c && c.comment !== t) { c.comment = t; return true; }
  return false;
}
/* Cắt nhận xét khỏi phiên; trả { i, c } để restoreComment() trả lại đúng chỗ, hoặc null. */
export function cutComment(s, id) {
  var i = -1;
  s.comments.forEach(function (c, k) { if (c.id === id) i = k; });
  if (i < 0) return null;
  return { i: i, c: s.comments.splice(i, 1)[0] };
}
export function restoreComment(s, cut) { s.comments.splice(Math.min(cut.i, s.comments.length), 0, cut.c); }

/* Neo lại mọi nhận xét trong nguồn (text) và chữ của bản dựng (mdText, rỗng khi chưa dựng được). */
export function anchorAll(comments, text, mdText) {
  var anchors = {}, orphans = {}, numbers = {};
  comments.forEach(function (c) {
    /* Mỗi phần neo riêng; phần không tìm thấy bị bỏ, nhận xét chỉ mất neo khi mọi phần mất. */
    var ps = partsOf(c).map(function (p) { return { src: locate(p, text, true), md: mdText ? locate(p, mdText, false) : null }; });
    var first = ps.filter(function (p) { return p.src || p.md; })[0];
    anchors[c.id] = { src: first ? first.src : null, md: first ? first.md : null, parts: ps };
    if (!first) orphans[c.id] = true;
  });
  var ratio = mdText ? text.length / mdText.length : 1;
  function key(c) {
    var a = anchors[c.id];
    if (a.src) return a.src[0];
    if (a.md) return a.md[0] * ratio;
    return Infinity;
  }
  var ordered = comments.slice().sort(function (a, b) { return key(a) - key(b) || a.created - b.created; });
  var n = 0;
  ordered.forEach(function (c) { if (!orphans[c.id]) numbers[c.id] = ++n; });
  return { anchors: anchors, orphans: orphans, ordered: ordered, numbers: numbers };
}
/* Dải highlight cho khung Source (src) và Preview (md): [{ s, e, id, n }] theo thứ tự trong văn bản. Mỗi phần tìm
   thấy một dải; số thứ tự (n) chỉ ở phần đầu của mỗi khung, phần sau n = 0. */
export function markRanges(d) {
  var src = [], md = [];
  d.ordered.forEach(function (c) {
    var a = d.anchors[c.id], ns = d.numbers[c.id], nm = ns;
    a.parts.forEach(function (p) {
      if (p.src) { src.push({ s: p.src[0], e: p.src[1], id: c.id, n: ns }); ns = 0; }
      if (p.md) { md.push({ s: p.md[0], e: p.md[1], id: c.id, n: nm }); nm = 0; }
    });
  });
  return { src: src, md: md };
}
/* Đoạn mới trùng hoặc chồng nhận xét nào: câu cảnh báo, hoặc ''. picks: [{ pos, quote }], mỗi phần một mục (pos: vị
   trí trong nguồn [a, b] hoặc null). Trùng: mọi đoạn trích giống hệt (MDAN-011); chồng: một phần chạm một phần. */
export function overlapWarning(d, picks) {
  var same = [], over = [];
  var nq = picks.map(function (p) { return normKey(p.quote); }).join('\n');
  d.ordered.forEach(function (c) {
    var a = d.anchors[c.id];
    if (partsOf(c).map(function (p) { return normKey(p.quote); }).join('\n') === nq) same.push(d.numbers[c.id] || '!');
    else if (a && a.parts.some(function (x) {
      return x.src && picks.some(function (p) { return p.pos && x.src[0] < p.pos[1] && p.pos[0] < x.src[1]; });
    })) over.push(d.numbers[c.id]);
  });
  if (same.length) return 'Same passage as comment #' + same.join(', #') + '. Saving adds a separate item.';
  if (over.length) return 'Overlaps comment #' + over.join(', #') + '.';
  return '';
}
