/* Nhận xét của một phiên, thuần: thêm, sửa, cắt / trả lại (Undo), neo lại vào nguồn và bản dựng, xếp theo vị trí
   trong nguồn và đánh số, dải highlight cho hai khung, cảnh báo trùng / chồng đoạn.
   d (kết quả anchorAll) = { anchors, orphans, ordered, numbers }:
     anchors: id → { src: [a, b] | null, md: [a, b] | null }; orphans: id → true khi mất neo;
     ordered: nhận xét theo thứ tự trong văn bản; numbers: id → số thứ tự trong prompt.
   Xuất: addComment, anchorAll, cutComment, editComment, findComment, markRanges, overlapWarning, restoreComment.
   Dùng: core/anchor.js, core/session.js, core/hints.js. */
import { locate } from './anchor.js';
import { uid } from './session.js';
import { normKey } from './hints.js';

export function findComment(s, id) { for (var i = 0; i < s.comments.length; i++) if (s.comments[i].id === id) return s.comments[i]; return null; }
/* info: đoạn trích từ quoteFrom (origin, quote, prefix, suffix, rel). Trả id mới. */
export function addComment(s, info, t) {
  var id = uid();
  s.comments.push({
    id: id, quote: info.quote, comment: t, origin: info.origin,
    prefix: info.prefix, suffix: info.suffix, rel: info.rel, created: Date.now()
  });
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
    var a = { src: locate(c, text, true), md: mdText ? locate(c, mdText, false) : null };
    anchors[c.id] = a;
    if (!a.src && !a.md) orphans[c.id] = true;
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
/* Dải highlight cho khung Source (src) và Preview (md): [{ s, e, id, n }] theo thứ tự trong văn bản. */
export function markRanges(d) {
  var src = [], md = [];
  d.ordered.forEach(function (c) {
    var a = d.anchors[c.id], num = d.numbers[c.id];
    if (a.src) src.push({ s: a.src[0], e: a.src[1], id: c.id, n: num });
    if (a.md) md.push({ s: a.md[0], e: a.md[1], id: c.id, n: num });
  });
  return { src: src, md: md };
}
/* Đoạn mới (quote, vị trí trong nguồn srcPos) trùng hoặc chồng nhận xét nào: câu cảnh báo, hoặc ''. */
export function overlapWarning(d, srcPos, quote) {
  var same = [], over = [];
  var nq = normKey(quote);
  d.ordered.forEach(function (c) {
    var a = d.anchors[c.id];
    if (normKey(c.quote) === nq) same.push(d.numbers[c.id] || '!');
    else if (srcPos && a && a.src && a.src[0] < srcPos[1] && srcPos[0] < a.src[1]) over.push(d.numbers[c.id]);
  });
  if (same.length) return 'Same passage as comment #' + same.join(', #') + '. Saving adds a separate item.';
  if (over.length) return 'Overlaps comment #' + over.join(', #') + '.';
  return '';
}
