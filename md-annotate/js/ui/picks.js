/* Nhận xét nhiều dòng: lề số dòng của #v-src (Source, khung Source ở Split) là cách duy nhất chọn dòng. Bấm đúp hoặc
   Shift + bấm vào lề thì vào chế độ chọn dòng; trong chế độ, bấm một lần thì thêm / bỏ dòng (không cần liền nhau),
   Shift + bấm thêm cả dải từ dòng bấm gần nhất, kéo trên lề thêm (bắt đầu ở dòng chưa chọn) hoặc bỏ (bắt đầu ở dòng
   đã chọn) cả dải kéo qua (MDAN-019); bỏ dòng cuối,
   Esc, Save, sang Edit / Preview, mở phiên khác, văn bản đổi thì thoát. Ngoài chế độ, bấm lề mở nhận xét của dòng.
   Dòng đã chọn: .is-pick; ở Split chữ tương ứng ở Preview tô 'ma-mirror' (chỉ để nhìn). Nút kéo hộp (#pop-grip).
   Logic (dải dòng, nhãn, đoạn trích) ở core/picks.js.
   Xuất: clearPicks, gutterLine, initPicks, picking, repaintPicks.
   Dùng: core/anchor.js, core/picks.js, ui/dom.js, ui/anchor-dom.js, ui/state.js, ui/marks.js, ui/render.js,
     ui/views.js, ui/popup.js. */
import { locate } from '../core/anchor.js';
import { pickable, pickInfo } from '../core/picks.js';
import { $, hasHL, paintHL } from './dom.js';
import { rangeAt } from './anchor-dom.js';
import { D, docKey } from './state.js';
import { marksOf } from './marks.js';
import { mdText } from './render.js';
import { isSplit } from './views.js';
import { closePop, openEdit, openNew, pending, pop, popDirty, updateNew } from './popup.js';

export var picking = false;     // đang ở chế độ chọn dòng
var picked = [];                // số dòng đã chọn (đếm từ 1)
var pickText = null, pickSid = null;   // văn bản và phiên lúc chọn: đổi thì bỏ hết
var anchor = 0;                 // dòng bấm gần nhất: đầu dải của Shift + bấm
var drag = null, eatClick = false;   // kéo trên lề: { start, add, base, last, moved, id }; kéo xong thì bỏ cú click theo sau

/* Dòng .ma-ln của #v-src khi sự kiện chuột rơi vào lề số dòng (phần đệm trái của dòng), không thì null. */
export function gutterLine(e) {
  var ln = e.target && e.target.closest && e.target.closest('.ma-ln');
  if (!ln || ln.parentNode !== $('v-src')) return null;
  return e.clientX < ln.getBoundingClientRect().left + parseFloat(getComputedStyle(ln).paddingLeft) - 4 ? ln : null;
}
function lineNo(ln) { return Array.prototype.indexOf.call($('v-src').children, ln) + 1; }

/* Tô dòng đã chọn, và ở Split tô chữ tương ứng ở Preview (tìm bằng locate, như neo nhận xét). */
function paint() {
  var root = $('v-src');
  root.classList.toggle('is-picking', picking);
  root.querySelectorAll('.ma-ln.is-pick').forEach(function (el) { el.classList.remove('is-pick'); });
  picked.forEach(function (n) { var el = root.children[n - 1]; if (el) el.classList.add('is-pick'); });
  if (!hasHL) return;
  var rs = [], info = picking && isSplit() && mdText ? pickInfo(D.text, picked) : null;
  if (info) info.parts.forEach(function (p) {
    var pos = locate(p, mdText, false), r = pos && rangeAt($('v-md'), pos[0], pos[1]);
    if (r) rs.push(r);
  });
  if (rs.length || picking) paintHL('ma-mirror', rs);
}
/* Mở hộp cho các dòng đã chọn, hoặc cập nhật hộp đang mở (giữ chỗ, giữ chữ). ln: dòng vừa bấm, chỗ đặt hộp mới. */
function showPicks(ln) {
  var info = pickInfo(D.text, picked);
  if (!info) { clearPicks(); return; }
  if (pop.mode === 'new' && pending && pending.lines) updateNew(info);
  else if (!(pop.mode && popDirty())) openNew(info, placeFor(ln));
}
/* Chỗ mặc định: dưới dòng vừa bấm, mép trái lùi qua lề số (cộng --s6), để hộp không che lề của các dòng bên dưới. */
function placeFor(ln) {
  var r = ln.getBoundingClientRect(), cs = getComputedStyle(ln);
  var shift = parseFloat(cs.paddingLeft) + parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s6')) || 0;
  return { top: r.top, bottom: r.bottom, left: r.left + shift };
}
function toggle(n, ln) {
  var i = picked.indexOf(n);
  if (i >= 0) picked.splice(i, 1); else picked.push(n);
  anchor = n;
  if (!picked.length) { clearPicks(); return; }
  paint();
  showPicks(ln);
}
function enter(n, ln) {
  try { window.getSelection().removeAllRanges(); } catch (err) {}
  picking = true; picked = [n]; anchor = n; pickText = D.text; pickSid = docKey();
  paint();
  showPicks(ln);
}
/* Các dòng chọn được trong [a, b] (thứ tự bất kỳ). */
function span(a, b) {
  var out = [];
  for (var k = Math.min(a, b); k <= Math.max(a, b); k++) if (pickable(D.text, k)) out.push(k);
  return out;
}
/* Shift + bấm: thêm cả dải từ dòng bấm gần nhất tới dòng n. */
function extend(n, ln) {
  span(anchor || n, n).forEach(function (k) { if (picked.indexOf(k) < 0) picked.push(k); });
  anchor = n;
  paint();
  showPicks(ln);
}
/* Dòng .ma-ln của #v-src ngang toạ độ y (kéo ra ngoài khung thì lấy dòng ở mép). */
function lineAtY(y) {
  var root = $('v-src'), kids = root.children, lo = 0, hi = kids.length - 1;
  if (hi < 0) return null;
  while (lo < hi) {   // dòng đầu tiên có đáy dưới y
    var mid = (lo + hi) >> 1;
    if (kids[mid].getBoundingClientRect().bottom <= y) lo = mid + 1; else hi = mid;
  }
  return kids[lo];
}
/* Kéo: từ dòng bắt đầu tới dòng dưới con trỏ, đặt mọi dòng chọn được về cùng trạng thái (thêm hoặc bỏ), tính lại từ ảnh
   chụp lúc bắt đầu, nên kéo ngược lại thì dải co về. */
function dragTo(y) {
  var ln = lineAtY(y);
  if (!ln) return;
  var n = lineNo(ln);
  if (n === drag.last) return;
  drag.last = n; drag.moved = drag.moved || n !== drag.start;
  var set = {};
  drag.base.forEach(function (k) { set[k] = true; });
  span(drag.start, n).forEach(function (k) { if (drag.add) set[k] = true; else delete set[k]; });
  picked = Object.keys(set).map(Number);
  anchor = n;
  paint();
}
/* Thoát chế độ chọn dòng: bỏ mọi dòng đã chọn, đóng hộp nếu hộp đang cho các dòng ấy. */
export function clearPicks() {
  if (!picking) return;
  picking = false; picked = [];
  paint();
  paintHL('ma-mirror', []);
  if (pop.mode === 'new' && pending && pending.lines) closePop(true);
}
/* Sau khi #v-src / #v-md vẽ lại hay đổi chế độ xem: tô lại; văn bản hay phiên đã đổi thì thoát. */
export function repaintPicks() {
  if (!picking) return;
  if (D.text !== pickText || docKey() !== pickSid) clearPicks();
  else paint();
}

/* Kéo hộp bằng nút #pop-grip (chuột, chạm, bút; phím mũi tên). Chỗ mới không nhớ: lần mở sau hộp về chỗ mặc định. */
function moveTo(x, y) {
  var el = $('pop'), vw = document.documentElement.clientWidth, vh = window.innerHeight;
  if (el.classList.contains('is-sheet')) return;   // cửa sổ hẹp lại giữa lúc kéo: tấm trượt đứng yên
  x = Math.max(8, Math.min(x, vw - el.offsetWidth - 8));
  y = Math.max(8, Math.min(y, vh - el.offsetHeight - 8));
  el.style.left = Math.round(x + window.scrollX) + 'px';
  el.style.top = Math.round(y + window.scrollY) + 'px';
}
function initGrip() {
  var g = $('pop-grip'), el = $('pop'), id = null, dx = 0, dy = 0;
  g.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 || el.classList.contains('is-sheet')) return;
    e.preventDefault();
    var r = el.getBoundingClientRect();
    dx = e.clientX - r.left; dy = e.clientY - r.top; id = e.pointerId;
    g.setPointerCapture(id);
    el.classList.add('is-moving');
  });
  g.addEventListener('pointermove', function (e) { if (e.pointerId === id) moveTo(e.clientX - dx, e.clientY - dy); });
  var end = function (e) { if (e.pointerId !== id) return; id = null; el.classList.remove('is-moving'); };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) { g.addEventListener(t, end); });
  g.addEventListener('keydown', function (e) {
    var k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!k || el.classList.contains('is-sheet')) return;
    e.preventDefault();
    var r = el.getBoundingClientRect(), step = e.shiftKey ? 64 : 16;
    moveTo(r.left + k[0] * step, r.top + k[1] * step);
  });
}

export function initPicks() {
  var root = $('v-src');
  /* Bấm đúp vào lề không bôi đen chữ; trong chế độ, bấm lề không đổi vùng chọn và không lấy focus khỏi ô nhận xét. */
  root.addEventListener('mousedown', function (e) {
    if (e.button === 0 && (picking || e.detail > 1 || e.shiftKey) && gutterLine(e)) e.preventDefault();
  });
  /* Kéo trên lề (chỉ trong chế độ, chuột / bút): dòng bắt đầu chưa chọn thì thêm, đã chọn thì bỏ cả dải kéo qua. */
  root.addEventListener('pointerdown', function (e) {
    eatClick = false;   // cú kéo trước không sinh click (thả ngoài khung): đừng nuốt cú bấm này
    if (!picking || e.button !== 0 || e.shiftKey || e.pointerType === 'touch') return;
    var ln = gutterLine(e), n = ln && lineNo(ln);
    if (!ln || !pickable(D.text, n)) return;
    drag = { start: n, add: picked.indexOf(n) < 0, base: picked.slice(), last: n, moved: false, id: e.pointerId, ln: ln };
  });
  document.addEventListener('pointermove', function (e) {
    if (drag && e.pointerId === drag.id) dragTo(e.clientY);
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag;
    drag = null;
    if (!d.moved) return;   // không rời dòng đầu: cú click theo sau thêm / bỏ dòng ấy như thường
    eatClick = e.type === 'pointerup';
    if (!picked.length) { clearPicks(); return; }
    showPicks(lineAtY(e.clientY) || d.ln);
  }
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);
  root.addEventListener('click', function (e) {
    if (eatClick) { eatClick = false; if (gutterLine(e) || picking) return; }
    var ln = gutterLine(e);
    if (!ln || e.detail > 1) return;   // lần bấm thứ hai của cú bấm đúp: để dblclick lo
    var n = lineNo(ln);
    if (e.shiftKey) {   // Shift + bấm: vào chế độ, hoặc thêm cả dải từ dòng bấm gần nhất
      if (!pickable(D.text, n) || (!picking && pop.mode && popDirty())) return;
      if (picking) extend(n, ln); else enter(n, ln);
      return;
    }
    if (picking) {
      if (pickable(D.text, n)) toggle(n, ln);
      return;
    }
    /* Ngoài chế độ: mở nhận xét đầu tiên của dòng ấy. */
    if (ln.dataset.c && !(pop.mode && popDirty())) {
      var cid = ln.dataset.c.split(' ')[0], ms = marksOf(cid);
      openEdit(cid, ms.length ? ms[ms.length - 1] : ln);
    }
  });
  root.addEventListener('dblclick', function (e) {
    var ln = gutterLine(e);
    if (!ln || picking || (pop.mode && popDirty())) return;
    var n = lineNo(ln);
    if (!pickable(D.text, n)) return;
    enter(n, ln);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && picking && !document.querySelector('dialog[open]')) clearPicks();
  });
  initGrip();
}
