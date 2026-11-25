/* Lề số dòng của khung Edit (#src-input), cho mọi loại file: lớp #ed-ln chồng lên ô chữ, mỗi dòng một <span class="ma-eln">
   chữ trong suốt, cùng font, đệm, bề rộng và cách xuống hàng với ô chữ, nên số (::before, counter) đứng đúng đầu dòng kể cả
   dòng dài xuống hàng. Lớp không nhận chuột; dời theo chỗ cuộn của ô chữ. Gõ chữ chỉ dựng lại các dòng đã đổi (lineDiff).
   Xuất: initEditLines, paintEditLines.
   Dùng: core/text.js, ui/dom.js. */
import { lineDiff } from '../core/text.js';
import { $, h } from './dom.js';

var ta, box, list, lines = [];

/* Dòng trong lớp: chữ y như ô chữ (trong suốt), số là ::before của CSS. */
function lineEl(t) { return h('span', { class: 'ma-eln' }, t); }
/* Lớp phủ đúng vùng đệm của ô chữ (trừ viền, trừ thanh cuộn): ô chữ đổi cỡ, hiện ra, thanh cuộn hiện / ẩn thì đo lại. */
function fit() {
  box.style.top = ta.offsetTop + ta.clientTop + 'px';
  box.style.left = ta.offsetLeft + ta.clientLeft + 'px';
  box.style.width = ta.clientWidth + 'px';
  box.style.height = ta.clientHeight + 'px';
}
function follow() { list.style.transform = 'translateY(' + -ta.scrollTop + 'px)'; }

export function paintEditLines() {
  if (!ta) return;
  var next = ta.value.split('\n'), d = lineDiff(lines, next), kids = list.children;
  for (var i = lines.length - d.tail - 1; i >= d.head; i--) kids[i].remove();
  var at = kids[d.head] || null, frag = document.createDocumentFragment();
  for (var k = d.head; k < next.length - d.tail; k++) frag.append(lineEl(next[k]));
  list.insertBefore(frag, at);
  lines = next;
  /* Lề rộng theo số chữ số của dòng cuối; văn bản trống: không lề, chữ gợi ý đứng như cũ. */
  var gw = Math.max(2, String(next.length).length) + 'ch';
  ta.style.setProperty('--ed-gw', gw); list.style.setProperty('--ed-gw', gw);
  $('pane-edit').classList.toggle('has-ln', ta.value !== '');
  fit(); follow();
}

export function initEditLines() {
  ta = $('src-input'); box = $('ed-ln'); list = $('ed-lines');
  ta.addEventListener('input', paintEditLines);
  ta.addEventListener('scroll', follow);
  new ResizeObserver(fit).observe(ta);
  paintEditLines();
}
