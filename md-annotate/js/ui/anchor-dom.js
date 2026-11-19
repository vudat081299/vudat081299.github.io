/* Neo ↔ DOM: đọc vùng chọn của trình duyệt trong #v-src / #v-md thành đoạn trích (readSelection, phần chữ ở
   core/anchor.js quoteFrom), và dựng Range từ vị trí chữ (rangeAt).
   Xuất: rangeAt, readSelection.
   Dùng: core/anchor.js, ui/dom.js, ui/render.js. */
import { quoteFrom } from '../core/anchor.js';
import { $, shown, textNodes } from './dom.js';
import { mdText } from './render.js';

function pointOffset(nodes, starts, total, container, offset) {
  if (container.nodeType === 3) {
    var k = nodes.indexOf(container);
    if (k >= 0) return starts[k] + offset;
  }
  var ref = container.childNodes ? container.childNodes[offset] : null;
  for (var i = 0; i < nodes.length; i++) {
    var t = nodes[i];
    if (ref) {
      if (ref === t || ref.contains(t) || (ref.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING)) return starts[i];
    } else if (!container.contains(t) && (container.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING)) return starts[i];
  }
  return total;
}
export function readSelection() {
  var sel = window.getSelection();
  if (!sel || !sel.rangeCount || sel.isCollapsed) return null;
  var r = sel.getRangeAt(0);
  var roots = [['src', $('v-src')], ['md', $('v-md')]];
  for (var j = 0; j < roots.length; j++) {
    var which = roots[j][0], root = roots[j][1];
    if (!shown(root) || !r.intersectsNode(root)) continue;
    if (which === 'md' && !mdText) continue;
    var all = document.createRange(); all.selectNodeContents(root);
    var c = r.cloneRange(), clipped = false;
    if (c.compareBoundaryPoints(Range.START_TO_START, all) < 0) { c.setStart(all.startContainer, all.startOffset); clipped = true; }
    if (c.compareBoundaryPoints(Range.END_TO_END, all) > 0) { c.setEnd(all.endContainer, all.endOffset); clipped = true; }
    var nodes = textNodes(root), pos = 0;
    var starts = nodes.map(function (n) { var s = pos; pos += n.data.length; return s; });
    var full = nodes.map(function (n) { return n.data; }).join('');
    var s = pointOffset(nodes, starts, full.length, c.startContainer, c.startOffset);
    var e = pointOffset(nodes, starts, full.length, c.endContainer, c.endOffset);
    return quoteFrom(full, s, e, which, which === 'src' ? '' : (clipped ? c.toString() : sel.toString()));
  }
  return null;
}
export function rangeAt(root, s, e) {
  var nodes = textNodes(root), pos = 0, r = document.createRange(), started = false;
  for (var i = 0; i < nodes.length; i++) {
    var L = nodes[i].data.length;
    if (!started && s < pos + L) { r.setStart(nodes[i], s - pos); started = true; }
    if (started && e <= pos + L) { r.setEnd(nodes[i], e - pos); return r; }
    pos += L;
  }
  return null;
}
