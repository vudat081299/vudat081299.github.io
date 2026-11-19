/* Focus mode: mờ mọi thứ ngoài một section; chọn section theo chuột (pointer) hoặc dải đọc 25–50% (band). Ở dải đọc,
   dòng dưới chuột cũng sáng (.is-line).
   Xuất: initFocus, refreshBand, refreshFocus.
   Dùng: core/sections.js, ui/dom.js, ui/views.js, ui/sync-scroll.js, ui/layout.js. */
import { bandBounds, bandPick, lineSections, numberSections, spanAt } from '../core/sections.js';
import { $, shown } from './dom.js';
import { isSplit } from './views.js';
import { blockPairs, setByPage } from './sync-scroll.js';
import { layoutVal } from './layout.js';

/* Focus mode theo section. Section mới bắt đầu ở mỗi tiêu đề cấp cao: h1–h6 là con trực tiếp của #v-md ở Preview;
   ở Source là dòng đầu của token `heading` cấp cao của marked.lexer (cùng cách đếm, nên số section hai bên khớp).
   Hai cách chọn section (prefs.focusBy): 'pointer' theo chuột; 'band' là section đầu tiên chạm dải 25–50% chiều
   cao vùng nhìn của khung, cập nhật khi cuộn. Ở Split, section cùng số ở khung kia cũng sáng.
   Đánh số lười: khung vẽ lại thì phần tử mới chưa có data-sec, lần dùng kế tiếp đánh lại. */
var mqHover = window.matchMedia('(hover: hover)');
function secBlocks(root) {
  return root.id === 'v-src' ? Array.prototype.slice.call(root.querySelectorAll('.ma-ln'))
    : Array.prototype.filter.call(root.children, function (el) { return el.nodeType === 1; });
}
function markSections(root) {
  var blocks = secBlocks(root);
  var secs = root.id === 'v-src'
    ? lineSections(blockPairs().spans, blocks.length)
    : numberSections(blocks.map(function (el) { return /^H[1-6]$/.test(el.tagName); }));
  blocks.forEach(function (el, i) { el.dataset.sec = secs[i]; });
}
function ensureSec(root) {
  var blocks = secBlocks(root);
  if (blocks.length && (!blocks[0].dataset.sec || !blocks[blocks.length - 1].dataset.sec)) markSections(root);
  return blocks;
}
var litSec = { 'v-src': null, 'v-md': null }; // section đang sáng của mỗi khung (null: không làm mờ)
function applySec(root, sec) {
  if (!shown(root)) return;
  var blocks = ensureSec(root);
  if (litSec[root.id] === sec && root.classList.contains('is-focusing') && root.querySelector('.is-sec')) return;
  root.querySelectorAll('.is-sec').forEach(function (x) { x.classList.remove('is-sec'); });
  blocks.forEach(function (x) { if (x.dataset.sec === sec) x.classList.add('is-sec'); });
  litSec[root.id] = sec;
  root.classList.add('is-focusing');
}
function clearFocus(root) {
  root.classList.remove('is-focusing');
  root.querySelectorAll('.is-sec').forEach(function (el) { el.classList.remove('is-sec'); });
  litSec[root.id] = null;
}
function otherRoot(root) { return root.id === 'v-src' ? $('v-md') : $('v-src'); }
function focusOn() { return document.documentElement.classList.contains('ma-focus'); }
function focusBoth(root, sec) {
  applySec(root, sec);
  var o = otherRoot(root);
  if (isSplit()) applySec(o, sec); else clearFocus(o);
}
/* Dải đọc: vùng nhìn là khung cuộn ở Split, là cửa sổ ở chế độ khác. Khối xếp dọc theo thứ tự nên tìm nhị phân. */
function bandSec(root) {
  var blocks = ensureSec(root);
  if (!blocks.length) return null;
  var pane = root.closest('.ma-view');
  var sc = isSplit() ? pane : document.scrollingElement;
  var vr = isSplit() ? pane.getBoundingClientRect() : { top: Math.max(0, root.getBoundingClientRect().top), bottom: window.innerHeight };
  var band = bandBounds(vr.top, vr.bottom, window.innerHeight, sc.scrollTop, sc.scrollHeight - sc.clientHeight);
  var i = bandPick(blocks.length,
    function (k) { return blocks[k].getBoundingClientRect().bottom; },
    function (k) { return blocks[k].getBoundingClientRect().top; }, band[0], band[1]);
  return blocks[i].dataset.sec;
}
var bandRaf = 0, bandFrom = null, ptr = null; // ptr: vị trí chuột cuối trong một khung, cho dòng ở dải đọc
export function refreshBand(from) {
  if (from) bandFrom = from;
  if (bandRaf) return;
  bandRaf = requestAnimationFrame(function () {
    bandRaf = 0;
    if (!focusOn()) return;
    // Theo chuột: khung vẽ lại mất .is-sec; đặt lại section đang sáng, không thì cả khung mờ tới lần rê kế tiếp.
    if (layoutVal('focusBy') !== 'band') { ['v-src', 'v-md'].forEach(function (id) { if (litSec[id] != null) applySec($(id), litSec[id]); }); return; }
    var root = bandFrom && shown(bandFrom) ? bandFrom : (shown($('v-md')) ? $('v-md') : $('v-src'));
    if (!shown(root)) return;
    var sec = bandSec(root);
    if (sec != null) focusBoth(root, sec);
    // Cuộn bằng bánh xe: chuột đứng yên, chữ chạy dưới nó; tìm lại dòng dưới chuột.
    var t = ptr && document.elementFromPoint(ptr.x, ptr.y), r = t && t.closest('#v-src, #v-md');
    if (r) lineAtPointer(r, t); else clearLines();
  });
}
export function refreshFocus() {
  ['v-src', 'v-md'].forEach(function (id) { clearFocus($(id)); });
  clearLines();
  if (focusOn() && layoutVal('focusBy') === 'band') refreshBand();
}

/* Dòng dưới chuột ở dải đọc. Source: một .ma-ln. Preview: mục danh sách, hàng bảng, mục định nghĩa, hoặc cả khối cấp
   cao. Khối cấp cao chứa nó (host) sáng; trong host, anh em của nó và của mỗi tổ tiên tới host mờ (.ma-dimx), vì
   opacity của con không vượt được cha. Ở Split, khung kia sáng khối ghép với nó (blockPairs, như cuộn theo nhau). */
function clearLines() {
  ['v-src', 'v-md'].forEach(function (id) {
    $(id).querySelectorAll('.is-line, .ma-dimx').forEach(function (x) { x.classList.remove('is-line', 'ma-dimx'); });
  });
}
function lightMdUnit(u) {
  var root = $('v-md'), host = u;
  while (host.parentElement !== root) host = host.parentElement;
  host.classList.add('is-line');
  for (var n = u; n !== host; n = n.parentElement) {
    Array.prototype.forEach.call(n.parentElement.children, function (x) { if (x !== n) x.classList.add('ma-dimx'); });
  }
}
function lightSrcLines(a, b) {
  var lines = $('v-src').querySelectorAll('.ma-ln');
  for (var i = a; i <= b && i < lines.length; i++) lines[i].classList.add('is-line');
}
function lineAtPointer(root, t) {
  clearLines();
  if (!t || !t.closest || !root.contains(t)) return;
  var bp = blockPairs(), split = isSplit();
  if (root.id === 'v-src') {
    var ln = t.closest('.ma-ln');
    if (!ln) return;
    ln.classList.add('is-line');
    var idx = Array.prototype.indexOf.call(root.querySelectorAll('.ma-ln'), ln), k = spanAt(bp.spans, idx);
    if (split && k >= 0 && bp.toMd[k] >= 0) lightMdUnit(bp.blocks[bp.toMd[k]]);
  } else {
    var u = t.closest('li, tr, dt, dd') || t.closest('#v-md > *');
    if (!u || !root.contains(u) || u === root) return;
    lightMdUnit(u);
    var host = u; while (host.parentElement !== root) host = host.parentElement;
    var j = bp.blocks.indexOf(host), k2 = j >= 0 ? bp.toSrc[j] : -1;
    if (split && k2 >= 0) lightSrcLines(bp.spans[k2].a, bp.spans[k2].b);
  }
}

/* Sự kiện cuộn của dải đọc phải đăng ký sau initSyncScroll (xem setByPage). */
export function initFocus() {
  ['v-src', 'v-md'].forEach(function (id) {
    var root = $(id), raf = 0, lastT = null;
    root.addEventListener('pointermove', function (e) {
      if (!focusOn() || !mqHover.matches || e.pointerType === 'touch') return;
      lastT = e.target; ptr = { x: e.clientX, y: e.clientY };
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        if (layoutVal('focusBy') === 'band') { lineAtPointer(root, lastT); return; }
        var el = lastT && lastT.closest && lastT.closest(id === 'v-src' ? '.ma-ln' : '#v-md > *');
        if (!el || !root.contains(el)) return;
        ensureSec(root);
        if (!el.dataset.sec) markSections(root);
        focusBoth(root, el.dataset.sec);
      });
    });
    root.addEventListener('pointerleave', function () {
      if (layoutVal('focusBy') === 'band') { ptr = null; clearLines(); return; }
      if (layoutVal('focusBy') !== 'pointer') return;
      if ($('pop') && !$('pop').hidden) return; // đang ghi nhận xét: giữ section sáng
      var o = otherRoot(root);
      if (o.matches(':hover')) return;
      clearFocus(root); clearFocus(o);
    });
  });
  /* Dải đọc đo trên khung người dùng đang cuộn; khung đi theo (do trang đặt) không giành quyền đo. */
  [['wrap-src', 'v-src'], ['wrap-md', 'v-md']].forEach(function (p) {
    var w = $(p[0]);
    w.addEventListener('scroll', function () { refreshBand(setByPage(w) ? null : $(p[1])); }, { passive: true });
  });
  window.addEventListener('scroll', function () { refreshBand(); }, { passive: true });
  window.addEventListener('resize', function () { refreshBand(); });
  // Đóng hộp nhận xét khi con trỏ đã ra ngoài khung: bỏ làm mờ (chế độ theo chuột).
  new MutationObserver(function () {
    if (!$('pop').hidden || layoutVal('focusBy') !== 'pointer') return;
    if (!$('v-src').matches(':hover') && !$('v-md').matches(':hover')) { clearFocus($('v-src')); clearFocus($('v-md')); }
  }).observe($('pop'), { attributes: true, attributeFilter: ['hidden'] });
}
