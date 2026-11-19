/* Bôi đen → hộp nhận xét: chuột mở ngay khi thả (kể cả kéo từ vùng nền), cảm ứng / bàn phím hiện nút nổi;
   bấm đoạn đã nhận xét để sửa; Split tô đoạn tương ứng ở khung kia (ma-mirror). Lề số dòng ở ui/picks.js; đang chọn
   dòng thì bôi đen không mở hộp, không hiện nút nổi, không tô ma-mirror.
   Xuất: initSelection, onSelChange.
   Dùng: core/anchor.js, ui/dom.js, ui/anchor-dom.js, ui/state.js, ui/render.js, ui/views.js, ui/popup.js,
     ui/picks.js. */
import { locate } from '../core/anchor.js';
import { $, hasHL } from './dom.js';
import { rangeAt, readSelection } from './anchor-dom.js';
import { S } from './state.js';
import { mdText } from './render.js';
import { isSplit } from './views.js';
import { closePop, openEdit, openNew, pop, popDirty } from './popup.js';
import { gutterLine, picking } from './picks.js';

var dragging = false, lastSel = null, lastSelAt = 0, selTimer = null;
export function onSelChange() {
  if (dragging) return;
  var info = pop.mode || picking ? null : readSelection();
  if (info) { lastSel = info; lastSelAt = Date.now(); }
  $('fab').hidden = !info;
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
      var pos = toSrc ? locate(info, S.text, true) : (mdText ? locate(info, mdText, false) : null);
      if (pos) r = rangeAt(toSrc ? $('v-src') : $('v-md'), pos[0], pos[1]);
    }
    if (r) CSS.highlights.set('ma-mirror', new Highlight(r)); else CSS.highlights.delete('ma-mirror');
  });
}

export function initSelection() {
  /* Kéo bắt đầu ở vùng nền (lề trái / phải của khung, nền trang quanh khung) cũng là bôi đen: thả ra mà vùng chọn
     nằm trong văn bản thì mở hộp nhận xét như kéo trên chữ. Bỏ qua nút, ô nhập, panel, hộp thoại, vách kéo, và bấm
     trên thanh cuộn (offsetX/Y vượt clientWidth/Height). */
  document.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    var t = e.target;
    if (!t || !t.closest || t.closest('button, input, textarea, select, label, a, summary, [contenteditable], .ma-panel, .ma-pop, dialog, .ma-bar, .ma-divider, #panel-grip, .ma-dock, #fab')) return;
    if (t.nodeType === 1 && t !== document.documentElement && (e.offsetX > t.clientWidth || e.offsetY > t.clientHeight)) return;
    dragging = true;
  }, true);
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
  document.addEventListener('pointerup', function (e) {
    if (!dragging) return;
    dragging = false;
    if (picking) return;   // chọn nhiều dòng chỉ bằng lề số dòng
    setTimeout(function () {
      if (picking || (pop.mode && popDirty())) return;
      var info = readSelection();
      if (info) { if (pop.mode) closePop(true); openNew(info); }
    }, 0);
  });
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
