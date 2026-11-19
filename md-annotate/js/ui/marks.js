/* Đoạn đã nhận xét: bọc chữ trong <mark class="ma-hl" data-ids> (Preview), tìm, tô active / hover.
   Xuất: hoverMarks, lastRect, markActive, markEl, marksOf, paintMd.
   Dùng: core/runs.js, ui/dom.js. */
import { textRuns } from '../core/runs.js';
import { $, h, shown } from './dom.js';

export function markEl(text, cover, end) {
  var m = h('mark', { class: 'ma-hl' + (cover.length > 1 ? ' is-multi' : '') }, text);
  m.dataset.ids = cover.map(function (r) { return r.id; }).join(' ');
  var ns = cover.filter(function (r) { return r.e === end; }).map(function (r) { return r.n; });
  if (ns.length) m.dataset.n = ns.join(',');
  return m;
}
function pieces(text, base, ranges) {
  var frag = document.createDocumentFragment();
  textRuns(text, base, ranges).forEach(function (r) {
    frag.append(r.cover.length ? markEl(r.t, r.cover, r.end) : document.createTextNode(r.t));
  });
  return frag;
}
export function paintMd(root, nodes, ranges) {
  if (!ranges.length) return;
  var pos = 0, starts = nodes.map(function (n) { var s = pos; pos += n.data.length; return s; });
  for (var i = nodes.length - 1; i >= 0; i--) {
    var n = nodes[i], ns = starts[i], ne = ns + n.data.length;
    if (ns === ne || !/\S/.test(n.data)) continue;
    var rs = ranges.filter(function (r) { return r.s < ne && r.e > ns; });
    if (!rs.length) continue;
    n.parentNode.replaceChild(pieces(n.data, ns, rs), n);
  }
}
export function markActive(id, on) {
  document.querySelectorAll('mark.ma-hl').forEach(function (m) {
    var has = (' ' + (m.dataset.ids || '') + ' ').indexOf(' ' + id + ' ') >= 0;
    m.classList.toggle('is-active', on && has);
  });
  document.querySelectorAll('#list .ma-item').forEach(function (li) {
    li.classList.toggle('is-active', on && li.dataset.id === id);
  });
}
export function marksOf(id) {
  var roots = [];
  if (shown($('v-md'))) roots.push($('v-md'));
  if (shown($('v-src'))) roots.push($('v-src'));
  var out = [];
  roots.forEach(function (r) {
    r.querySelectorAll('mark.ma-hl').forEach(function (m) {
      if ((' ' + (m.dataset.ids || '') + ' ').indexOf(' ' + id + ' ') >= 0) out.push(m);
    });
  });
  return out;
}
export function lastRect(target) {
  if (!target) return null;
  var rects = target.getClientRects();
  return rects.length ? rects[rects.length - 1] : target.getBoundingClientRect();
}
export function hoverMarks(id, on) {
  marksOf(id).forEach(function (m) { m.classList.toggle('is-hover', on); });
}
