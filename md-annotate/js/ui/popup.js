/* Hộp nhận xét: mở cho đoạn mới (openNew) hoặc để sửa (openEdit), tô đoạn đang chọn (ma-pending),
   gợi ý dạng chip, lưu, đóng. Đoạn mới có thể là các dòng chọn ở lề số (pending.lines, ui/picks.js): hộp có thêm
   hàng đầu (số dòng, nhãn, nút kéo), cập nhật tại chỗ khi chọn thêm / bỏ dòng (updateNew), và không đóng khi bấm
   ra ngoài (MDAN-014). Tấm đáy (máy hẹp / cảm ứng) có nền mờ #pop-scrim, trừ khi chọn nhiều dòng (MDAN-026); mở tấm thì
   trang cuộn để đoạn nằm ngay trên tấm (revealAbove), đáy trang có thêm chỗ bằng tấm (html.ma-sheet-sp), bỏ đi khi đóng mà
   không làm trang nhảy. Lưu không cuộn trang. Màn cảm ứng: Return trong ô chữ xuống dòng, lưu bằng nút Save.
   Phím chọn gợi ý (MDAN-084, core/hint-keys.js): Mod (⌘ ở Mac, Ctrl nơi khác) + Z X C·C V·V B N M , . / chọn gợi ý 1–10;
   Mod + 1 lưu gợi ý ẩn "bỏ đoạn này" (removeHint của ui/hints.js; không chip, không đếm). Giữ Mod thì #pop có lớp
   is-keys (chữ phím trên 10 chip đầu, hintBadge); hộp mở thì Ctrl/⌘ + B không ẩn / hiện cây. Vùng chip luôn có mọi gợi ý (lọc theo chữ
   đang gõ); hộp nổi cuộn dọc khi quá trần (css/popup.css), tấm đáy cuộn ngang một hàng.
   Xuất: closePop, initPopup, openEdit, openNew, paintPending, pending, pop, popDirty, renderPopHints, updateNew.
   Dùng: core/text.js, core/anchor.js, core/hints.js, core/hint-keys.js, core/comments.js, core/place.js, core/picks.js, ui/dom.js,
     ui/anchor-dom.js, ui/state.js, ui/hints.js, ui/marks.js, ui/render.js, ui/list.js, ui/views.js,
     ui/selection.js, ui/picks.js, ui/dwell.js. */
import { plural } from '../core/text.js';
import { locate } from '../core/anchor.js';
import { chipHints, pct } from '../core/hints.js';
import { hintBadge, hintPresses, hintRank, isDouble, isModKey, REMOVE_KEY, tapStep } from '../core/hint-keys.js';
import { addComment, editComment, findComment, overlapWarning, partsOf } from '../core/comments.js';
import { popPlace, sheetReveal } from '../core/place.js';
import { pickSummary } from '../core/picks.js';
import { $, barBottom, h, isMac, mqSheet, mqTouch, paintHL, shortcut, shown, syncBar, toast } from './dom.js';
import { rangeAt } from './anchor-dom.js';
import { D, scheduleSave } from './state.js';
import { recordUse, removeHint, seedState, stats } from './hints.js';
import { markActive } from './marks.js';
import { anchors, mdText, numbers, ordered, orphans, renderAll } from './render.js';
import { flashItem, removeComment } from './list.js';
import { isSplit, paneRoot, view } from './views.js';
import { onSelChange } from './selection.js';
import { cancelPicks, clearPicks, gutterLine, picking } from './picks.js';
import { noteJump } from './dwell.js';

export var pop = { mode: null, id: null, orig: '' };
var held = false;   // đang giữ Mod: #pop.is-keys (MDAN-084)
var tap = null;     // lần bấm Mod + C / V trước: { code, t, hint } (hint: gợi ý ở hạng ấy lúc bấm, trước khi ⌘V dán chữ lọc lại)
export var pending = null;   // đoạn đang chọn (kết quả quoteFrom, hoặc pickInfo khi chọn dòng) khi hộp mở cho nhận xét mới
/* Vị trí của đoạn đang chọn trong nguồn (src) và chữ bản dựng (md): [a, b] hoặc null. Khung chọn thì lấy đúng vị trí
   đã chọn; khung kia tìm bằng locate, như neo nhận xét. */
function pendingPos() {
  return {
    src: pending.origin === 'src' ? [pending.s, pending.e] : locate(pending, D.text, true),
    md: pending.origin === 'md' ? [pending.s, pending.e] : (mdText ? locate(pending, mdText, false) : null)
  };
}
/* Tô đoạn đang chọn ở khung nào đang hiện (CSS Highlight 'ma-pending', không sửa DOM); trả các Range đã tô. */
export function paintPending() {
  var rs = [];
  if (pending && !pending.lines) {   // dòng đã chọn: ui/picks.js tô cả dòng
    var pos = pendingPos();
    if (pos.src && shown($('v-src'))) { var a = rangeAt($('v-src'), pos.src[0], pos.src[1]); if (a) rs.push(a); }
    if (pos.md && shown($('v-md'))) { var b = rangeAt($('v-md'), pos.md[0], pos.md[1]); if (b) rs.push(b); }
  }
  paintHL('ma-pending', rs);
  return rs;
}
/* rect: chỗ đặt hộp (dòng vừa bấm ở lề số); không có thì dưới đoạn đang chọn. */
export function openNew(info, rect) {
  if (view === 'edit') return;
  if (pop.mode === 'edit') closePop(true);
  pending = info; pop.mode = 'new'; pop.id = null; pop.orig = '';
  var rs = paintPending();
  try { window.getSelection().removeAllRanges(); } catch (e) {}
  fillNew();
  $('pop-del').hidden = true;
  $('pop-text').value = '';
  var own = rs.length ? ownRange(rs) : null;
  showPop(rect || (own ? lastRect(own) : null), rect ? null : spanRect(own));
}
/* Khung bao cả đoạn (đỉnh dòng đầu, đáy dòng cuối) và nút nằm trong nó, cho tấm đáy (revealAbove). */
function spanRect(target) {
  if (!target) return null;
  var rs = target.getClientRects(), b = target.getBoundingClientRect();
  return { top: rs.length ? rs[0].top : b.top, bottom: rs.length ? rs[rs.length - 1].bottom : b.bottom,
    node: target.startContainer ? target.startContainer.parentNode : target };
}
/* Ở Split đoạn được tô ở cả hai khung: hộp đặt cạnh khung người dùng đã bôi đen (pending.origin). */
function ownRange(rs) {
  var pane = paneRoot(pending.origin);
  return rs.filter(function (r) { return pane.contains(r.startContainer); })[0] || rs[0];
}
/* Chọn thêm / bỏ dòng khi hộp đang mở: đổi nội dung, giữ chỗ (kể cả chỗ đã kéo tới) và chữ đang gõ. */
export function updateNew(info) {
  pending = info;
  fillNew();
  markLong();
  renderPopHints();
  syncScrim();
  if ($('pop').classList.contains('is-sheet') && !$('pop').hidden) sheetSpace();
}
function fillNew() {
  var multi = !!pending.lines;
  setHead(multi ? pickSummary(pending.lines) : '');
  $('pop').setAttribute('aria-label', multi ? 'Comment on the picked lines' : 'Comment on the selected passage');
  $('pop-q').classList.toggle('is-lines', multi);
  $('pop-q').textContent = multi ? pending.parts.map(function (p) { return p.quote; }).join('\n') : pending.quote;
  var picks = multi ? pending.parts.map(function (p) { return { pos: [p.s, p.e], quote: p.quote }; })
    : [{ pos: pendingPos().src, quote: pending.quote }];
  var warn = overlapWarning({ ordered: ordered, anchors: anchors, numbers: numbers }, picks);
  $('pop-warn').hidden = !warn; $('pop-warn').textContent = warn || '';
}
/* Hàng đầu (số dòng, nhãn, nút kéo) chỉ khi chọn nhiều dòng; sum rỗng thì ẩn. */
function setHead(sum) {
  $('pop-head').hidden = !sum;
  $('pop-sum').textContent = sum;
}
function markLong() {
  var q = $('pop-q');
  q.classList.toggle('is-long', q.scrollHeight > q.clientHeight + 1);
}
export function openEdit(id, anchorEl) {
  var c = findComment(D, id);
  if (!c) return;
  if (pop.mode === 'new') clearPending();
  if (pop.id) markActive(pop.id, false);
  pop.mode = 'edit'; pop.id = id; pop.orig = c.comment;
  markActive(id, true);
  setHead('');
  $('pop').setAttribute('aria-label', 'Edit comment');
  $('pop-q').classList.toggle('is-lines', partsOf(c).length > 1);
  $('pop-q').textContent = partsOf(c).map(function (p) { return p.quote; }).join('\n');
  $('pop-warn').hidden = !orphans[id];
  $('pop-warn').textContent = orphans[id] ? 'This quote is no longer in the text.' : '';
  $('pop-del').hidden = false;
  $('pop-text').value = c.comment;
  showPop(lastRect(anchorEl), spanRect(anchorEl));
}
/* Khung chữ cuối của một phần tử hay Range (đoạn chọn qua nhiều dòng thì hộp đặt dưới dòng cuối). */
function lastRect(target) {
  if (!target) return null;
  var rects = target.getClientRects();
  return rects.length ? rects[rects.length - 1] : target.getBoundingClientRect();
}
/* rect: chỗ đặt hộp nổi; span: { top, bottom, node } đoạn mà tấm đáy không được che (mặc định rect). */
function showPop(rect, span) {
  var el = $('pop');
  var sheet = mqSheet.matches;
  el.classList.toggle('is-sheet', sheet);
  el.hidden = false;
  $('fab').hidden = true;
  $('pop-grip').hidden = sheet;   // tấm trượt đáy đứng yên
  markLong();
  $('pop-chips').hidden = true;   // vẽ mới: vùng chip không trượt từ cao của lần mở trước
  renderPopHints();
  if (!sheet) {
    el.style.top = '0px'; el.style.left = '0px';
    var at = popPlace(rect, el.offsetWidth, el.offsetHeight, document.documentElement.clientWidth, window.innerHeight);
    el.style.top = Math.round(at.top + window.scrollY) + 'px';
    el.style.left = Math.round(at.left + window.scrollX) + 'px';
    $('pop-text').focus({ preventScroll: true });
  } else {
    el.style.top = ''; el.style.left = '';
    sheetSpace();
    revealAbove(span || rect);
  }
  syncScrim();
}

/* TẤM ĐÁY: đáy trang có thêm chỗ bằng chiều cao tấm (--sheet-h), để cả dòng cuối văn bản cuộn lên được trên tấm. */
function sheetSpace() {
  var de = document.documentElement;
  de.style.setProperty('--sheet-h', Math.ceil($('pop').offsetHeight + 8) + 'px');
  de.classList.add('ma-sheet-sp');
}
/* Đóng tấm: bỏ chỗ thêm chỉ khi bỏ không làm trang nhảy (đang cuộn trong phần thêm thì chờ người dùng cuộn lên). */
function dropSpace() {
  var de = document.documentElement;
  if (!de.classList.contains('ma-sheet-sp') || (pop.mode && $('pop').classList.contains('is-sheet'))) return;
  de.classList.remove('ma-sheet-sp');
  if (window.scrollY > document.scrollingElement.scrollHeight - window.innerHeight + 1) de.classList.add('ma-sheet-sp');
}
/* Cuộn để đoạn đang nhận xét nằm ngay trên đỉnh tấm (core/place.js sheetReveal): khung Split chứa đoạn thì cuộn khung,
   không thì cuộn trang. Cuộn do trang: không tính là đã đọc (ui/dwell.js). */
function revealAbove(span) {
  if (!span) return;
  var kb = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--kb')) || 0;
  var sheetTop = window.innerHeight - kb - $('pop').offsetHeight;   // không đọc getBoundingClientRect: tấm đang trượt lên
  var pane = span.node && span.node.closest && isSplit() ? span.node.closest('.ma-view') : null;
  var head = pane ? pane.getBoundingClientRect().top : barBottom();
  var d = Math.round(sheetReveal(span.top, span.bottom, sheetTop, head, 12));
  if (!d) return;
  noteJump();
  (pane || window).scrollBy(0, d);   // ngay, không cuộn mượt: tấm đang trượt lên, và lưu ngay sau đó không được thấy trang còn trôi
}
/* Nền mờ sau tấm đáy: chỉ khi tấm hiện và không ở chế độ chọn dòng (vẫn bấm lề số các dòng khác, MDAN-026). */
function syncScrim() {
  var on = !$('pop').hidden && $('pop').classList.contains('is-sheet') && !(pop.mode === 'new' && pending && pending.lines);
  if ($('pop-scrim').hidden !== on) return;
  $('pop-scrim').hidden = !on;
  syncBar();
}
function clearPending() {
  pending = null;
  paintHL('ma-pending', []);
}
export function closePop(silent) {
  if (!pop.mode) return;
  if (pop.id) markActive(pop.id, false);
  clearPending();
  pop.mode = null; pop.id = null; pop.orig = '';
  endHold(); tap = null;
  $('pop').hidden = true;
  syncScrim();
  dropSpace();
  if (!silent) onSelChange();
}
export function popDirty() {
  var v = $('pop-text').value.trim();
  return pop.mode === 'new' ? !!v : v !== pop.orig.trim();
}
/* uncounted: không đếm vào số đếm gợi ý (gợi ý ẩn Mod + 1 không bao giờ thành chip). */
function savePop(textOverride, uncounted) {
  var t = (textOverride != null ? textOverride : $('pop-text').value).trim();
  if (!t) { $('pop-text').focus(); toast('Type a comment or pick a hint.'); return; }
  var id, lines = pop.mode === 'new' && pending && pending.lines;
  if (pop.mode === 'new' && pending) {
    id = addComment(D, pending, t);
    if (!uncounted) recordUse(t);
  } else if (pop.mode === 'edit') {
    id = pop.id;
    if (editComment(D, id, t) && !uncounted) recordUse(t);
  }
  closePop(true);
  if (lines) clearPicks();   // lưu xong thì thoát chế độ chọn dòng
  scheduleSave();
  renderAll();
  if (id) flashItem(id);
}
function hintChip(x, i, showPct) {
  var k = hintPresses(i + 1).map(shortcut).join(' '), badge = hintBadge(i + 1);
  /* 10 chip đầu luôn có chữ phím (.ma-chip__k: Z, CC…), mọi trạng thái; CSS chỉ cho thấy khi #pop.is-keys. */
  return h('button', {
    class: 'ma-chip', type: 'button', title: 'Used ' + plural(x.n, 'time') + (k ? ' · ' + k : ''),
    onclick: function () { savePop(x.t); }
  }, badge ? h('span', { class: 'ma-chip__k', 'aria-hidden': 'true' }, badge) : null,
  h('span', { class: 'ma-chip__t' }, x.t), showPct ? h('span', { class: 'ma-chip__p' }, pct(x.p)) : null);
}
/* Vẽ lại mọi chip theo chữ đang gõ; vùng chip về đầu (hạng 1). */
export function renderPopHints() {
  var box = $('pop-chips'), h0 = box.hidden ? 0 : box.offsetHeight;
  var ch = chipHints(stats, $('pop-text').value);
  box.replaceChildren();
  ch.list.forEach(function (x, i) { box.append(hintChip(x, i, ch.showPct)); });
  if (!ch.list.length && !ch.q && seedState === 'fail') {
    box.append(h('span', { class: 'ma-sub' }, 'No hints yet: the default hints could not load.'));
  }
  box.hidden = !box.childNodes.length;
  box.scrollTop = 0; box.scrollLeft = 0;
  var el = $('pop');
  if (el.hidden || el.classList.contains('is-sheet')) return;
  /* giữ hộp trong khung nhìn khi số gợi ý đổi: đo cao cuối (chưa trượt), rồi mới cho chip trượt từ cao cũ */
  var popH = el.offsetHeight, top = el.getBoundingClientRect().top;
  easeHeight(box, h0);
  if (top + popH > window.innerHeight - 8 && top > 80) el.style.top = Math.round(window.scrollY + Math.max(8, window.innerHeight - popH - 8)) + 'px';
}
/* Cao #pop-chips đổi theo nội dung (gõ chữ lọc gợi ý; auto → auto) thì CSS không có điểm đầu để trượt: đặt cao cũ h0
   trong một lần tính kiểu rồi bỏ, CSS (css/popup.css) trượt từ đó tới cao mới. */
function easeHeight(box, h0) {
  if (!h0 || box.hidden || h0 === box.offsetHeight) return;
  box.style.transition = 'none'; box.style.height = h0 + 'px';
  void box.offsetHeight;
  box.style.transition = ''; box.style.height = '';
}

/* PHÍM CHỌN GỢI Ý (MDAN-084): chỉ khi hộp hiện và không hộp thoại nào mở. */
function modKey() { return isMac ? 'Meta' : 'Control'; }   // e.key của Mod
function keysLive() { return !!pop.mode && !$('pop').hidden && !document.querySelector('dialog[open]'); }
/* Giữ Mod: #pop.is-keys, chữ phím trên 10 chip đầu hiện dần; thả thì mờ đi. Chỉ đổi lớp, không vẽ lại chip. Tấm đáy thì không. */
function startHold() {
  if (held || !keysLive() || $('pop').classList.contains('is-sheet')) return;
  held = true;
  $('pop').classList.add('is-keys');
}
function endHold() {
  if (!held) return;
  held = false;
  $('pop').classList.remove('is-keys');
}
/* Gợi ý ở hạng rank theo chữ đang gõ (cùng thứ tự với chip, kể cả chip đã cuộn khuất); không có thì null. */
function hintAt(rank) { return chipHints(stats, $('pop-text').value).list[rank - 1] || null; }
/* Pha bắt của window: chạy trước mọi nghe keydown khác. Phím đã dùng thì không tới ai nữa. */
function hintKey(e) {
  if (e.isComposing || e.repeat) return;
  if (!keysLive()) { tap = null; return; }
  if (isModKey(e.key)) {
    if (e.key === modKey() && !e.shiftKey && !e.altKey) startHold(); else endHold();
    return;
  }
  /* Ctrl/⌘ + B (như ui/tree.js nhận) khi hộp mở: không ẩn / hiện cây, kể cả khi không có gợi ý 5 hay lưu xong hộp đã đóng. */
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.code === 'KeyB') e.stopPropagation();
  var mod = (isMac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey) && !e.shiftKey && !e.altKey;
  var rank = mod ? hintRank(e.code) : 0, last = tap, step = tapStep(tap, mod ? e.code : '', e.timeStamp);
  tap = step.prev;
  if (mod && e.code === REMOVE_KEY) {   // gợi ý ẩn: luôn chặn phím khi hộp mở; chưa nạp được chữ thì không lưu gì
    e.preventDefault(); e.stopPropagation();
    if (removeHint) savePop(removeHint, true);
    return;
  }
  if (!rank) return;
  var x = hintAt(rank), ta = $('pop-text');
  if (isDouble(e.code)) {   // lần đầu chép / dán như thường; lần thứ hai chọn gợi ý đã thấy lúc bấm lần đầu
    if (tap) tap.hint = x;
    if (!step.hit || !last.hint) return;
    x = last.hint;
  } else if (!x || (e.code === 'KeyX' && ta.selectionStart !== ta.selectionEnd)) return;   // có chữ đang chọn: ⌘X cắt
  e.preventDefault(); e.stopPropagation();
  savePop(x.t);
}

export function initPopup() {
  $('pop-save').addEventListener('click', function () { savePop(); });
  $('pop-cancel').addEventListener('click', function () {
    var lines = pop.mode === 'new' && pending && pending.lines;
    closePop();
    if (lines) cancelPicks();
  });
  $('pop-del').addEventListener('click', function () { var id = pop.id; closePop(true); removeComment(id); });
  $('pop-text').addEventListener('input', renderPopHints);
  /* Enter lưu, Shift + Enter xuống dòng; màn cảm ứng: Return xuống dòng (bàn phím ảo không có Shift + Return), lưu bằng
     nút Save, hay Ctrl / ⌘ + Return ở bàn phím rời. */
  var enterHint = function () { $('pop-text').setAttribute('enterkeyhint', mqTouch.matches ? 'enter' : 'done'); };
  enterHint(); mqTouch.addEventListener('change', enterHint);
  $('pop-text').addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
    var mod = e.ctrlKey || e.metaKey;
    if ((e.shiftKey || mqTouch.matches) && !mod) return;
    e.preventDefault(); savePop();
  });
  window.addEventListener('scroll', dropSpace, { passive: true });
  window.addEventListener('keydown', hintKey, true);
  window.addEventListener('keyup', function (e) { if (e.key === modKey()) endHold(); }, true);
  window.addEventListener('blur', function () { endHold(); tap = null; });
  document.addEventListener('visibilitychange', function () { endHold(); tap = null; });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && pop.mode && !document.querySelector('dialog[open]')) { e.preventDefault(); closePop(); }
  });
  /* Bấm ra ngoài đóng hộp đoạn chữ / hộp sửa (chưa gõ gì). Hộp của các dòng đã chọn thì ở lại (MDAN-014): chỉ Esc,
     Save, Cancel đóng; bấm ngoài vẫn tới đích như thường. */
  document.addEventListener('pointerdown', function (e) {
    if (!pop.mode || (pop.mode === 'new' && pending && pending.lines)) return;
    if ($('pop').contains(e.target) || $('fab').contains(e.target)) return;
    if (picking && gutterLine(e)) return;   // chọn thêm / bỏ dòng: hộp ở lại, cập nhật tại chỗ
    if (popDirty()) return;
    closePop(true);
  }, true);
  window.addEventListener('resize', function () {
    if (pop.mode && !$('pop').classList.contains('is-sheet') && mqSheet.matches) {
      endHold();
      $('pop').classList.add('is-sheet'); $('pop').style.top = ''; $('pop').style.left = ''; $('pop-grip').hidden = true;
      syncScrim();
    }
  });
}
