/* Hộp nhận xét: mở cho đoạn mới (openNew) hoặc để sửa (openEdit), tô đoạn đang chọn (ma-pending),
   gợi ý dạng chip, lưu, đóng.
   Xuất: closePop, initPopup, openEdit, openNew, paintPending, pending, pop, popDirty, renderPopHints.
   Dùng: core/text.js, core/anchor.js, core/hints.js, core/comments.js, core/place.js, ui/dom.js, ui/anchor-dom.js,
     ui/state.js, ui/hints.js, ui/marks.js, ui/render.js, ui/list.js, ui/views.js, ui/selection.js. */
import { plural } from '../core/text.js';
import { locate } from '../core/anchor.js';
import { chipHints, pct } from '../core/hints.js';
import { addComment, editComment, findComment, overlapWarning } from '../core/comments.js';
import { popPlace } from '../core/place.js';
import { $, h, hasHL, mqSheet, shown, toast } from './dom.js';
import { rangeAt } from './anchor-dom.js';
import { S, scheduleSave } from './state.js';
import { recordUse, seedState, stats } from './hints.js';
import { markActive } from './marks.js';
import { anchors, mdText, numbers, ordered, orphans, renderAll } from './render.js';
import { flashItem, removeComment } from './list.js';
import { view } from './views.js';
import { onSelChange } from './selection.js';

export var pop = { mode: null, id: null, orig: '' };
var popExpanded = false;
export var pending = null;   // đoạn đang chọn (kết quả quoteFrom) khi hộp mở cho nhận xét mới
/* Vị trí của đoạn đang chọn trong nguồn (src) và chữ bản dựng (md): [a, b] hoặc null. Khung chọn thì lấy đúng vị trí
   đã chọn; khung kia tìm bằng locate, như neo nhận xét. */
function pendingPos() {
  return {
    src: pending.origin === 'src' ? [pending.s, pending.e] : locate(pending, S.text, true),
    md: pending.origin === 'md' ? [pending.s, pending.e] : (mdText ? locate(pending, mdText, false) : null)
  };
}
/* Tô đoạn đang chọn ở khung nào đang hiện (CSS Highlight 'ma-pending', không sửa DOM); trả các Range đã tô. */
export function paintPending() {
  var rs = [];
  if (pending) {
    var pos = pendingPos();
    if (pos.src && shown($('v-src'))) { var a = rangeAt($('v-src'), pos.src[0], pos.src[1]); if (a) rs.push(a); }
    if (pos.md && shown($('v-md'))) { var b = rangeAt($('v-md'), pos.md[0], pos.md[1]); if (b) rs.push(b); }
  }
  if (hasHL) {
    if (rs.length) CSS.highlights.set('ma-pending', new Highlight(...rs));
    else CSS.highlights.delete('ma-pending');
  }
  return rs;
}
export function openNew(info) {
  if (view === 'edit') return;
  pending = info; pop.mode = 'new'; pop.id = null; pop.orig = '';
  var rs = paintPending();
  try { window.getSelection().removeAllRanges(); } catch (e) {}
  $('pop-q').textContent = info.quote;
  var warn = overlapWarning({ ordered: ordered, anchors: anchors, numbers: numbers }, pendingPos().src, info.quote);
  $('pop-warn').hidden = !warn; $('pop-warn').textContent = warn || '';
  $('pop-del').hidden = true;
  $('pop-text').value = '';
  popExpanded = false;
  showPop(rs.length ? lastRect(rs[0]) : null);
}
export function openEdit(id, anchorEl) {
  var c = findComment(S, id);
  if (!c) return;
  if (pop.mode === 'new') clearPending();
  if (pop.id) markActive(pop.id, false);
  pop.mode = 'edit'; pop.id = id; pop.orig = c.comment;
  markActive(id, true);
  $('pop-q').textContent = c.quote;
  $('pop-warn').hidden = !orphans[id];
  $('pop-warn').textContent = orphans[id] ? 'This quote is no longer in the text.' : '';
  $('pop-del').hidden = false;
  $('pop-text').value = c.comment;
  popExpanded = false;
  showPop(lastRect(anchorEl));
}
/* Khung chữ cuối của một phần tử hay Range (đoạn chọn qua nhiều dòng thì hộp đặt dưới dòng cuối). */
function lastRect(target) {
  if (!target) return null;
  var rects = target.getClientRects();
  return rects.length ? rects[rects.length - 1] : target.getBoundingClientRect();
}
function showPop(rect) {
  var el = $('pop');
  var sheet = mqSheet.matches;
  el.classList.toggle('is-sheet', sheet);
  el.hidden = false;
  $('fab').hidden = true;
  var q = $('pop-q');
  q.classList.toggle('is-long', q.scrollHeight > q.clientHeight + 1);
  renderPopHints();
  if (!sheet) {
    el.style.top = '0px'; el.style.left = '0px';
    var at = popPlace(rect, el.offsetWidth, el.offsetHeight, document.documentElement.clientWidth, window.innerHeight);
    el.style.top = Math.round(at.top + window.scrollY) + 'px';
    el.style.left = Math.round(at.left + window.scrollX) + 'px';
    $('pop-text').focus({ preventScroll: true });
  } else {
    el.style.top = ''; el.style.left = '';
  }
}
function clearPending() {
  pending = null;
  if (hasHL) CSS.highlights.delete('ma-pending');
}
export function closePop(silent) {
  if (!pop.mode) return;
  if (pop.id) markActive(pop.id, false);
  clearPending();
  pop.mode = null; pop.id = null; pop.orig = '';
  $('pop').hidden = true;
  if (!silent) onSelChange();
}
export function popDirty() {
  var v = $('pop-text').value.trim();
  return pop.mode === 'new' ? !!v : v !== pop.orig.trim();
}
function savePop(textOverride) {
  var t = (textOverride != null ? textOverride : $('pop-text').value).trim();
  if (!t) { $('pop-text').focus(); toast('Type a comment or pick a hint.'); return; }
  var id;
  if (pop.mode === 'new' && pending) {
    id = addComment(S, pending, t);
    recordUse(t);
  } else if (pop.mode === 'edit') {
    id = pop.id;
    if (editComment(S, id, t)) recordUse(t);
  }
  closePop(true);
  scheduleSave();
  renderAll();
  if (id) flashItem(id);
}
export function renderPopHints() {
  var box = $('pop-chips');
  var ch = chipHints(stats, $('pop-text').value, popExpanded);
  var q = ch.q, list = ch.list, more = ch.more, showPct = ch.showPct;
  box.replaceChildren();
  list.forEach(function (x) {
    box.append(h('button', {
      class: 'ma-chip', type: 'button', title: 'Used ' + plural(x.n, 'time'),
      onclick: function () { savePop(x.t); }
    }, h('span', { class: 'ma-chip__t' }, x.t), showPct ? h('span', { class: 'ma-chip__p' }, pct(x.p)) : null));
  });
  if (more) {
    box.append(h('button', {
      class: 'ma-chip ma-chip--more', type: 'button', 'aria-label': 'Show ' + more + ' more hints',
      onclick: function () {
        popExpanded = true; renderPopHints();
        if (!$('pop').classList.contains('is-sheet')) $('pop-text').focus({ preventScroll: true });
      }
    }, '+' + more));
  }
  if (!list.length && !q && seedState === 'fail') {
    box.append(h('span', { class: 'ma-sub' }, 'No hints yet: the default hints could not load.'));
  }
  box.hidden = !box.childNodes.length;
  if (!$('pop').hidden && !$('pop').classList.contains('is-sheet')) {
    /* giữ hộp trong khung nhìn khi số gợi ý đổi */
    var r = $('pop').getBoundingClientRect();
    if (r.bottom > window.innerHeight - 8 && r.top > 80) $('pop').style.top = Math.round(window.scrollY + Math.max(8, window.innerHeight - r.height - 8)) + 'px';
  }
}

export function initPopup() {
  $('pop-save').addEventListener('click', function () { savePop(); });
  $('pop-cancel').addEventListener('click', function () { closePop(); });
  $('pop-del').addEventListener('click', function () { var id = pop.id; closePop(true); removeComment(id); });
  $('pop-text').addEventListener('input', renderPopHints);
  $('pop-text').addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
    if (e.shiftKey && !(e.ctrlKey || e.metaKey)) return;
    e.preventDefault(); savePop();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && pop.mode && !document.querySelector('dialog[open]')) { e.preventDefault(); closePop(); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!pop.mode) return;
    if ($('pop').contains(e.target) || $('fab').contains(e.target)) return;
    if (popDirty()) return;
    closePop(true);
  }, true);
  window.addEventListener('resize', function () {
    if (pop.mode && !$('pop').classList.contains('is-sheet') && mqSheet.matches) $('pop').classList.add('is-sheet');
  });
}
