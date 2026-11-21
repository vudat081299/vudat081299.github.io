/* Bôi đen → hộp nhận xét: chuột mở ngay khi thả, cảm ứng / bàn phím hiện nút nổi (ở đáy, đoạn chọn ở nửa dưới thì lên
   đỉnh: core/place.js fabSide); kéo bắt đầu ở vùng nền (lề trang hai bên, nền thẻ, panel nhận xét) là bôi đen văn bản;
   bấm đoạn đã nhận xét để sửa; Split tô đoạn tương ứng ở khung kia (ma-mirror). Lề số dòng ở ui/picks.js; đang chọn
   dòng thì bôi đen không mở hộp, không hiện nút nổi, không tô ma-mirror.
   Xuất: initSelection, onSelChange.
   Dùng: core/anchor.js, core/place.js, ui/dom.js, ui/anchor-dom.js, ui/state.js, ui/render.js, ui/views.js, ui/popup.js,
     ui/picks.js. */
import { locate } from '../core/anchor.js';
import { clampInto, edgeScroll, fabSide } from '../core/place.js';
import { $, barBottom, dockTop, hasHL, paintHL, shown } from './dom.js';
import { rangeAt, readSelection } from './anchor-dom.js';
import { D } from './state.js';
import { mdText } from './render.js';
import { isSplit, paneRoot, view } from './views.js';
import { closePop, openEdit, openNew, pop, popDirty } from './popup.js';
import { gutterLine, picking } from './picks.js';

var dragging = false, lastSel = null, lastSelAt = 0, selTimer = null;
export function onSelChange() {
  if (dragging) return;
  var info = pop.mode || picking ? null : readSelection();
  if (info) { lastSel = info; lastSelAt = Date.now(); }
  $('fab').hidden = !info;
  placeFab();
}
/* Nút nổi không che đoạn đang chọn: mặc định ở đáy; đoạn ở nửa dưới (hay chạm nút) thì ngay dưới thanh trên. */
function placeFab() {
  var f = $('fab'), sel = window.getSelection();
  f.classList.remove('is-top');
  if (f.hidden || !sel || !sel.rangeCount) return;
  var rs = sel.getRangeAt(0).getClientRects();
  if (!rs.length || fabSide(rs[0].top, rs[rs.length - 1].bottom, f.getBoundingClientRect().top, window.innerHeight) !== 'top') return;
  f.style.setProperty('--fab-top', Math.round(barBottom()) + 'px');
  f.classList.add('is-top');
}
/* Split: bôi đen một bên thì đoạn tương ứng bên kia được tô (CSS Highlight 'ma-mirror', không sửa DOM). Tìm đoạn
   bằng chính cách neo nhận xét (locate: nguyên văn, rồi chỉ chữ và số), nên chọn ở Source có cú pháp markdown vẫn
   khớp chữ đã dựng. Vùng chọn đã nới trọn từ. Hộp nhận xét mở thì tô 'ma-pending' thay thế. */
var mirrorRaf = 0;
function mirrorSel() {
  if (!hasHL || mirrorRaf || picking) return;
  mirrorRaf = requestAnimationFrame(function () {
    mirrorRaf = 0;
    if (picking) return;   // ma-mirror đang tô các dòng đã chọn (ui/picks.js)
    var info = !pop.mode && isSplit() ? readSelection() : null;
    var r = null;
    if (info) {
      var toSrc = info.origin === 'md';
      var pos = toSrc ? locate(info, D.text, true) : (mdText ? locate(info, mdText, false) : null);
      if (pos) r = rangeAt(toSrc ? $('v-src') : $('v-md'), pos[0], pos[1]);
    }
    paintHL('ma-mirror', r ? [r] : []);
  });
}

/* KÉO TỪ VÙNG NỀN (chuột, bút): kéo bắt đầu ở nền quanh văn bản (BG: lề trang trái / phải, nền thẻ #doc, đầu khung, cả
   panel nhận xét trừ nút và ô gõ chữ) bôi đen văn bản của khung đích như kéo trên chữ. Khung đích: một khung thì khung ấy;
   Split thì bên trái tâm vách là Source, bên phải là Preview. Mỗi điểm chuột kéo vào hộp chữ của khung (clampInto: ngoài
   trái là đầu dòng, ngoài phải là cuối dòng), lấy chỗ con trỏ chữ ở đó; vùng chọn từ điểm bấm (Shift: từ đầu vùng chọn cũ
   trong khung) tới điểm hiện tại. Kéo quá mép trên / dưới phần thấy thì khung cuộn (edgeScroll). Thả ra vào cùng luồng với
   kéo trên chữ (pointerup). */
/* Ba danh sách đi cùng nhau, sửa một thì xem hai cái kia: BG (nơi kéo từ nền được bắt đầu), SKIP (cú bấm chuột không thuộc
   việc bôi đen: nút, ô gõ chữ, hộp prompt, hộp thoại, thanh trên, cây, vách, thanh đáy, nút nổi, dải tiến độ) và luật
   user-select ở css/base.css (khung trang không bôi đen được, trừ ô gõ chữ và hộp prompt). */
var BG = 'html, body, .ma-grid, .ma-left, .ma-head, .ma-doc, .ma-doc__bar, .ma-views, .ma-view, .ma-view__head, .ma-panel, .ma-panel *';
var SKIP = 'button, input, textarea, select, label, a, summary, [contenteditable], .ma-out, .ma-pop, dialog, .ma-bar, .ma-tree, .ma-divider, #panel-grip, .ma-dock, #fab, .ma-mm';
var bg = null;   // { root, scroller, anchor, x, y, moved, raf }
function caretAt(x, y) {
  var p = document.caretPositionFromPoint ? document.caretPositionFromPoint(x, y) : null;
  if (p) return [p.offsetNode, p.offset];
  var r = document.caretRangeFromPoint ? document.caretRangeFromPoint(x, y) : null;
  return r ? [r.startContainer, r.startOffset] : null;
}
/* Hộp chữ của khung đích (hộp nội dung của root) cắt theo phần thấy: dưới thanh trên, trên thanh đáy, trong khung cuộn ở
   Split. vt / vb: mép phần thấy, quá đó thì cuộn. */
function textBox(g) {
  var r = g.root.getBoundingClientRect(), cs = getComputedStyle(g.root);
  var v = g.scroller ? g.scroller.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
  var vt = Math.max(v.top, barBottom()), vb = Math.min(v.bottom, dockTop());
  return { left: r.left + parseFloat(cs.paddingLeft), right: r.right - parseFloat(cs.paddingRight),
    top: Math.max(vt, r.top), bottom: Math.min(vb, r.bottom), vt: vt, vb: vb };
}
/* Làn đã đọc nằm trên chữ: điểm rơi trên nó thì tắt nó cho tới hết lần kéo (html.ma-bgdrag, css/review.css), để con trỏ
   chữ tìm được dòng. Chỉ khi ấy: đổi lớp ở html tính lại kiểu mọi nút làn (văn bản dài: 0,1–0,2 s), cú bấm nền thường
   không trả giá ấy. */
function bgCaret(g) {
  var p = clampInto(g.x, g.y, textBox(g)), hit = document.elementFromPoint(p.x, p.y);
  if (hit && hit.closest('.ma-lane')) document.documentElement.classList.add('ma-bgdrag');
  var c = caretAt(p.x, p.y);
  return c && g.root.contains(c[0]) ? c : null;
}
function bgExtend() {
  var c = bgCaret(bg);
  if (c) window.getSelection().setBaseAndExtent(bg.anchor[0], bg.anchor[1], c[0], c[1]);
}
function bgTick() {
  bg.raf = 0;
  var b = textBox(bg), dy = edgeScroll(bg.y, b.vt, b.vb);
  if (!dy) return;
  if (bg.scroller) bg.scroller.scrollTop += dy; else window.scrollBy(0, dy);
  bgExtend();
  bg.raf = requestAnimationFrame(bgTick);
}
function bgEnd() {
  if (bg) cancelAnimationFrame(bg.raf);
  bg = null;
  document.documentElement.classList.remove('ma-bgdrag');
}
function bgStart(e) {
  if (!e.target.matches(BG)) return;
  var split = isSplit(), root = null;
  if (split) { var d = $('divider').getBoundingClientRect(); root = paneRoot(e.clientX < d.left + d.width / 2 ? 'src' : 'md'); }
  else if (view === 'src' || view === 'view') root = paneRoot(view === 'src' ? 'src' : 'md');
  if (!root || !shown(root)) return;
  var g = { root: root, scroller: split ? root.parentNode : null, x: e.clientX, y: e.clientY, moved: false, raf: 0 };
  var c = bgCaret(g), sel = window.getSelection();
  if (!c) { bgEnd(); return; }
  g.anchor = e.shiftKey && sel.rangeCount && root.contains(sel.anchorNode) ? [sel.anchorNode, sel.anchorOffset] : c;
  bg = g;
  if (e.shiftKey) { g.moved = true; bgExtend(); } else sel.removeAllRanges();   // bấm nền bỏ vùng chọn cũ, như trình duyệt
}

function cancelDrag() { if (bg) bgEnd(); dragging = false; }

export function initSelection() {
  /* Chuột / bút: thả ra mà vùng chọn nằm trong văn bản thì mở hộp nhận xét, dù kéo bắt đầu ở đâu (nền: bgStart). Bỏ qua
     SKIP và bấm trên thanh cuộn (offsetX/Y vượt clientWidth/Height). */
  document.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    var t = e.target;
    if (!t || !t.closest || t.closest(SKIP)) return;
    if (t.nodeType === 1 && t !== document.documentElement && (e.offsetX > t.clientWidth || e.offsetY > t.clientHeight)) return;
    dragging = true;
    bgStart(e);
  }, true);
  /* Kéo từ nền: trình duyệt không tự bôi đen (nó sẽ chọn chữ của panel hay không chọn gì), không đổi focus; ô đang gõ
     ngoài hộp nhận xét thì rời như khi bấm nền. */
  document.addEventListener('mousedown', function (e) {
    if (!bg) return;
    e.preventDefault();
    var a = document.activeElement;
    if (a && a !== document.body && !$('pop').contains(a)) a.blur();
  }, true);
  document.addEventListener('pointermove', function (e) {
    if (!bg) return;
    if (!(e.buttons & 1)) { bgEnd(); return; }   // thả ở chỗ không nhận pointerup
    if (!bg.moved && Math.abs(e.clientX - bg.x) + Math.abs(e.clientY - bg.y) < 4) return;
    bg.moved = true; bg.x = e.clientX; bg.y = e.clientY;
    bgExtend();
    if (!bg.raf) bg.raf = requestAnimationFrame(bgTick);
  });
  ['v-src', 'v-md'].forEach(function (id) {
    var root = $(id);
    root.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse' && e.button === 0) dragging = true; });
    root.addEventListener('click', function (e) {
      if (gutterLine(e) || picking) return;   // lề số dòng: ui/picks.js
      var sel = window.getSelection();
      if (sel && !sel.isCollapsed) return;
      var m = e.target.closest && e.target.closest('mark.ma-hl');
      if (!m || !m.isConnected || !m.dataset.ids) return;
      if (pop.mode && popDirty()) return;
      openEdit(m.dataset.ids.split(' ')[0], m);
    });
  });
  document.addEventListener('pointerup', function () {
    if (bg) bgEnd();
    if (!dragging) return;
    dragging = false;
    if (picking) return;   // chọn nhiều dòng chỉ bằng lề số dòng
    setTimeout(function () {
      if (picking || (pop.mode && popDirty())) return;
      var info = readSelection();
      if (info) { if (pop.mode) closePop(true); openNew(info); }
    }, 0);
  });
  /* Kéo bị cắt ngang (Alt+Tab, hệ thống giành con trỏ): không còn pointerup; dừng cuộn sát mép, thôi kéo. */
  document.addEventListener('pointercancel', cancelDrag);
  window.addEventListener('blur', cancelDrag);
  document.addEventListener('selectionchange', function () {
    clearTimeout(selTimer); selTimer = setTimeout(onSelChange, 120);
    mirrorSel();
  });
  $('fab').addEventListener('pointerdown', function (e) { e.preventDefault(); });
  $('fab').addEventListener('mousedown', function (e) { e.preventDefault(); });
  $('fab').addEventListener('click', function () {
    var info = readSelection() || (Date.now() - lastSelAt < 2000 ? lastSel : null);
    $('fab').hidden = true;
    if (info && !picking) openNew(info);
  });
}
