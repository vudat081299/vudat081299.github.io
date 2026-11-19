/* Đánh dấu đã đọc (MDAN-013): làn dấu cạnh từng đơn vị ở Source (bên phải vạch nhận xét) và Preview (lề trái), phím
   X / Shift+X / J / K, nút ✓ Reviewed của hộp nhận xét, viên thuốc "✓ Done · next ↓" ở máy hẹp / cảm ứng, làm mờ đơn vị
   đã đọc (.is-rv, html.ma-rvdim). Đơn vị, neo dấu, tiến độ ở core/review.js; tab Review ở ui/review-panel.js.
   Làn là lớp phủ .ma-lane trong #wrap-src / #wrap-md (ngoài #v-src / #v-md: text của khung không đổi). Vẽ lại sau mỗi
   renderAll() (applyReview) và khi khung đổi cỡ (ResizeObserver).
   Xuất: applyReview, commitReviews, initReview, jumpUnit, markUnits, reviewDoc, rvState, setRvTouched, stepOpen, toggleSection.
   Dùng: core/anchor.js, core/text.js, core/sections.js, core/review.js, ui/dom.js, ui/store.js, ui/state.js,
     ui/sync-scroll.js, ui/views.js, ui/layout.js, ui/popup.js, ui/picks.js, ui/prompt.js, ui/review-panel.js. */
import { locate } from '../core/anchor.js';
import { lineOf, plural } from '../core/text.js';
import { bandBounds, bandPick, bandScroll } from '../core/sections.js';
import { nextOpen, progress, resolveMarks, reviewRanges, reviewSections, reviewUnits, setMarks, unitAt, unitsIn } from '../core/review.js';
import { $, h, mqSheet, mqSide, reduceMotion, shown, toast } from './dom.js';
import { prefs } from './store.js';
import { loadSession, S, saveClosed, scheduleSave } from './state.js';
import { blockPairs, setByPage } from './sync-scroll.js';
import { isSplit, view } from './views.js';
import { layoutVal } from './layout.js';
import { closePop, pending, pop, popDirty, renderPopHints } from './popup.js';
import { clearPicks } from './picks.js';
import { renderPrompt } from './prompt.js';
import { renderReviewPanel } from './review-panel.js';

/* Đơn vị và dấu đã neo của văn bản đang mở: { units, res, secs }. Nhớ theo văn bản, mảng dấu và khối nguồn. */
var memo = { text: null, marks: null, spans: null };
export function rvState() {
  var spans = blockPairs().spans, marks = S.reviews || (S.reviews = []);
  if (memo.text !== S.text || memo.marks !== marks || memo.spans !== spans) {
    var units = reviewUnits(S.text, spans), res = resolveMarks(units, marks);
    memo = { text: S.text, marks: marks, spans: spans, units: units, res: res, secs: reviewSections(units, res.state, []) };
  }
  return memo;
}
/* Dải dòng cho prompt (core/prompt.js d.review), hoặc null khi tắt. */
export function reviewDoc() {
  if (!S.rvPrompt) return null;
  var r = rvState();
  return reviewRanges(r.units, r.res.state);
}

/* ĐÁNH DẤU. Thao tác nhiều đơn vị có Undo trên toast (trang không có chồng hoàn tác chung). */
export function commitReviews() { scheduleSave(); applyReview(); if (S.rvPrompt) renderPrompt(); }
export function markUnits(idxs, on, undoMsg) {
  if (!idxs.length) return;
  var r = rvState(), before = S.reviews, sid = S.id;
  S.reviews = setMarks(r.units, S.reviews, r.res, idxs, on);
  commitReviews();
  if (undoMsg) toast(undoMsg, { label: 'Undo', fn: function () {
    if (S.id === sid) { S.reviews = before; commitReviews(); return; }
    var s = loadSession(sid);   // đã chuyển phiên: trả dấu về phiên của nó
    if (s) { s.reviews = before; saveClosed(s); }
  } });
}
export function toggleSection(sec) {
  var r = rvState(), idx = [];
  r.units.forEach(function (u, i) { if (u.sec === sec) idx.push(i); });
  var on = !idx.every(function (i) { return r.res.state[i] === 'done'; });
  markUnits(idx, on, idx.length > 1 ? (on ? 'Marked ' : 'Unmarked ') + plural(idx.length, 'block') + (on ? ' reviewed.' : '.') : null);
  return on ? idx[idx.length - 1] : -1;
}
/* Nhãn dòng cho các đơn vị idx (tăng dần): "L12–18, L30". */
function linesLabel(units, idx) {
  var runs = [];
  idx.forEach(function (i) {
    var u = units[i], last = runs[runs.length - 1];
    if (last && last.i === i - 1) { last.b = u.b; last.i = i; } else runs.push({ a: u.a, b: u.b, i: i });
  });
  return runs.map(function (x) { return 'L' + (x.a + 1) + (x.b > x.a ? '–' + (x.b + 1) : ''); }).join(', ');
}

/* LÀN DẤU. geo.src / geo.md: [{ i, top, bottom }] theo thứ tự, toạ độ trong nội dung của #wrap-* (không đổi khi cuộn). */
var lanes = {}, geo = { src: [], md: [] }, anchorU = null;
function wrapOf(w) { return $(w === 'src' ? 'wrap-src' : 'wrap-md'); }
function rootOf(w) { return $(w === 'src' ? 'v-src' : 'v-md'); }
/* Phần tử Preview của đơn vị i: khối cấp cao, hoặc mục <li> thứ item khi số mục hai bên khớp. */
function mdEl(r, i) {
  var u = r.units[i], bp = blockPairs(), j = bp.toMd[u.block], el = j >= 0 ? bp.blocks[j] : null;
  if (!el || !el.isConnected || u.item < 0) return el && el.isConnected ? el : null;
  var lis = Array.prototype.filter.call(el.children, function (x) { return x.tagName === 'LI'; });
  return lis.length === bp.spans[u.block].items.length ? lis[u.item] : null;
}
function tip(r, i) {
  var u = r.units[i], s = r.res.state[i], lines = linesLabel(r.units, [i]);
  if (u.head) {
    var sc = r.secs.filter(function (x) { return x.sec === u.sec; })[0];
    return 'Section: ' + sc.done + ' of ' + plural(sc.total, 'block') + ' reviewed. Click to ' + (sc.state === 'done' ? 'unmark all' : 'mark all') + ' (Shift+X)';
  }
  if (s === 'done') return 'Reviewed ' + lines + '. Click to unmark (X)';
  if (s === 'changed') return 'Text changed since you reviewed it. Click to confirm ' + lines + ' (X)';
  return 'Mark ' + lines + ' reviewed (X). Shift+click marks a range';
}
function fillLane(w, r) {
  var box = lanes[w], wrap = wrapOf(w), root = rootOf(w), out = [];
  box.replaceChildren();
  geo[w] = out;
  if (!shown(root) || !r.units.length) return;
  var wr = wrap.getBoundingClientRect(), off = wr.top - wrap.scrollTop, x;
  var laneW = parseFloat(getComputedStyle(box).getPropertyValue('--lane-w')) || 16;
  if (w === 'src') {
    var l0 = root.firstElementChild;
    if (!l0) return;
    x = l0.getBoundingClientRect().left - wr.left + parseFloat(getComputedStyle(l0).paddingLeft) - laneW - 6;
  } else x = Math.max(0, root.getBoundingClientRect().left - wr.left - laneW - 6);
  var secOf = {};
  r.secs.forEach(function (sc) { secOf[sc.sec] = sc.state; });
  var frag = document.createDocumentFragment();
  r.units.forEach(function (u, i) {
    var top, bottom;
    if (w === 'src') {
      var a = root.children[u.a], b = root.children[u.b];
      if (!a || !b) return;
      top = a.getBoundingClientRect().top; bottom = b.getBoundingClientRect().bottom;
    } else {
      var el = mdEl(r, i);
      if (!el) return;
      var rc = el.getBoundingClientRect(); top = rc.top; bottom = rc.bottom;
    }
    top -= off; bottom -= off;
    out.push({ i: i, top: top, bottom: bottom });
    var btn = h('button', {
      type: 'button', tabindex: '-1', 'data-u': String(i), title: tip(r, i),
      class: 'ma-lane__b is-' + r.res.state[i] + (u.head ? ' is-head sec-' + secOf[u.sec] : '')
    });
    btn.style.cssText = 'left:' + Math.round(x) + 'px;top:' + Math.round(top) + 'px;height:' + Math.max(16, Math.round(bottom - top)) + 'px';
    frag.append(btn);
  });
  box.append(frag);
}
var laying = false, painting = false;   // chặn vòng: currentUnit() → ensureGeo() → layoutLanes() → paintCur()
function layoutLanes() { var r = rvState(); laying = true; fillLane('src', r); fillLane('md', r); laying = false; paintCur(); }
/* Đơn vị X sẽ đánh dấu (dải đọc, hay dưới con trỏ): làn của nó có .is-cur ở cả hai khung. */
var curRaf = 0;
function paintCur() {
  painting = true;
  var c = currentUnit();
  painting = false;
  document.querySelectorAll('.ma-lane__b.is-cur').forEach(function (b) { if (+b.dataset.u !== c) b.classList.remove('is-cur'); });
  if (c >= 0) document.querySelectorAll('.ma-lane__b[data-u="' + c + '"]').forEach(function (b) { b.classList.add('is-cur'); });
}
function scheduleCur() { if (!curRaf) curRaf = requestAnimationFrame(function () { curRaf = 0; paintCur(); }); }
var layoutRaf = 0;
function scheduleLayout() {
  if (layoutRaf) return;
  layoutRaf = requestAnimationFrame(function () { layoutRaf = 0; layoutLanes(); syncPill(); });
}
function onLaneClick(e) {
  var b = e.target.closest && e.target.closest('.ma-lane__b');
  if (!b) return;
  var i = +b.dataset.u, r = rvState(), st = r.res.state;
  if (i >= r.units.length) return;
  if (e.shiftKey && anchorU != null && anchorU < r.units.length && anchorU !== i) {
    var idx = [], lo = Math.min(anchorU, i), hi = Math.max(anchorU, i), on = st[i] !== 'done';
    for (var k = lo; k <= hi; k++) idx.push(k);
    markUnits(idx, on, (on ? 'Marked ' : 'Unmarked ') + plural(idx.length, 'block') + ' (' + linesLabel(r.units, idx) + ').');
  } else if (r.units[i].head) toggleSection(r.units[i].sec);
  else markUnits([i], st[i] !== 'done');
  anchorU = i;
}

/* Làm mờ đơn vị đã đọc: lớp .is-rv trên dòng Source và phần tử Preview; CSS chỉ làm mờ khi html.ma-rvdim. */
function paintDone(r) {
  document.querySelectorAll('#v-src .is-rv, #v-md .is-rv').forEach(function (el) { el.classList.remove('is-rv'); });
  var lines = $('v-src').children;
  r.units.forEach(function (u, i) {
    if (r.res.state[i] !== 'done') return;
    for (var k = u.a; k <= u.b && k < lines.length; k++) lines[k].classList.add('is-rv');
    var el = mdEl(r, i);
    if (el) el.classList.add('is-rv');
  });
}

/* VẼ: gọi cuối renderAll() và sau mỗi lần đánh dấu. */
var lostSeen = { sid: null, n: 0 };
export function applyReview() {
  var r = rvState(), p = progress(r.units, r.res.state), nl = r.res.lost.length;
  if (S.reviews.length) S.rvPct = p.pct; else delete S.rvPct;
  document.documentElement.classList.toggle('ma-reviewing', S.reviews.length > 0);
  /* Dấu mất vì văn bản đổi: báo một lần, như nhận xét mất neo; danh sách ở tab Review. */
  if (lostSeen.sid === S.id && nl > lostSeen.n) {
    var k = nl - lostSeen.n;
    toast(plural(k, 'reviewed block') + (k === 1 ? ' was' : ' were') + ' edited away. See the Review tab.');
  }
  lostSeen = { sid: S.id, n: nl };
  paintDone(r);
  layoutLanes();
  renderReviewPanel(r, p);
  syncPill(r, p);
  syncPopRv();
}

/* ĐƠN VỊ HIỆN TẠI: dưới con trỏ khi Focus mode theo chuột, không thì đơn vị chạm dải đọc 25–50% (core/sections.js) của
   khung người dùng cuộn gần nhất (Split; chưa cuộn thì Preview). */
var active = null, ptr = null;
function activePane() {
  var s = shown($('v-src')), m = shown($('v-md'));
  if (s && m) return active || 'md';
  return m ? 'md' : s ? 'src' : null;
}
function ensureGeo(w) { if (w && !geo[w].length && !laying && !painting) layoutLanes(); return w ? geo[w] : []; }
function currentUnit() {
  var w = activePane(), g = ensureGeo(w);
  if (!g.length) return -1;
  if (layoutVal('focus') && layoutVal('focusBy') === 'pointer' && ptr && ptr.w && geo[ptr.w].length) {
    var gp = geo[ptr.w], o = wrapOf(ptr.w).getBoundingClientRect().top - wrapOf(ptr.w).scrollTop, y = ptr.y - o;
    for (var k = 0; k < gp.length; k++) if (gp[k].bottom > y) return gp[k].i;
    return gp[gp.length - 1].i;
  }
  var wrap = wrapOf(w), split = isSplit(), sc = split ? wrap : document.scrollingElement;
  var vr = split ? wrap.getBoundingClientRect() : { top: Math.max(0, rootOf(w).getBoundingClientRect().top), bottom: window.innerHeight };
  var band = bandBounds(vr.top, vr.bottom, window.innerHeight, sc.scrollTop, sc.scrollHeight - sc.clientHeight);
  var off = wrap.getBoundingClientRect().top - wrap.scrollTop;
  return g[bandPick(g.length, function (j) { return g[j].bottom + off; }, function (j) { return g[j].top + off; }, band[0], band[1])].i;
}
/* Cuộn đơn vị i vào dải đọc của khung đang dùng; khung kia theo nhờ cuộn theo nhau. Đỉnh đặt ngay trên mốc trên của
   dải (bandScroll): đặt thấp hơn thì đuôi đơn vị trước còn trong dải và thắng (bandPick), X kế tiếp sẽ trúng nó. Mốc
   trượt về mép khi gần đầu / cuối (bandBounds), nên tính theo chính vị trí cuộn đích. */
var BAND_UP = 6;
export function jumpUnit(i) {
  var w = activePane(), g = ensureGeo(w), e = g.filter(function (x) { return x.i === i; })[0];
  if (!e && w) { var o = w === 'src' ? 'md' : 'src'; if (shown(rootOf(o))) { e = ensureGeo(o).filter(function (x) { return x.i === i; })[0]; if (e) w = o; } }
  if (!e) return;
  var wrap = wrapOf(w), how = reduceMotion.matches ? 'auto' : 'smooth', vh = window.innerHeight, wr = wrap.getBoundingClientRect();
  if (isSplit()) {
    var maxS = wrap.scrollHeight - wrap.clientHeight;
    wrap.scrollTo({ behavior: how, top: bandScroll(function (s) {
      return wr.top + e.top - s - bandBounds(wr.top, wr.bottom, vh, s, maxS)[0];
    }, maxS, BAND_UP) });
  } else {
    var de = document.scrollingElement, maxW = de.scrollHeight - de.clientHeight, y0 = window.scrollY;
    var unitY = wr.top + y0 + e.top, rootY = rootOf(w).getBoundingClientRect().top + y0;
    window.scrollTo({ behavior: how, top: bandScroll(function (s) {
      return unitY - s - bandBounds(Math.max(0, rootY - s), vh, vh, s, maxW)[0];
    }, maxW, BAND_UP) });
  }
  document.querySelectorAll('.ma-lane__b[data-u="' + i + '"]').forEach(function (b) {
    b.classList.remove('is-flash'); void b.offsetWidth; b.classList.add('is-flash');
    setTimeout(function () { b.classList.remove('is-flash'); }, 1200);
  });
}
/* J / K, nút Next unreviewed: đơn vị chưa đọc kế tiếp (dir 1) / trước (dir -1) từ đơn vị hiện tại. */
export function stepOpen(dir, from) {
  var r = rvState(), cur = from != null ? from : currentUnit();
  if (!r.units.length) return;
  var nx = nextOpen(r.res.state, cur < 0 ? (dir > 0 ? -1 : r.units.length) : cur, dir);
  if (!nx) { toast('Every block is reviewed.'); return; }
  if (nx.wrapped) toast(dir > 0 ? 'Back to the first unreviewed block from the top.' : 'Back to the last unreviewed block from the bottom.');
  jumpUnit(nx.i);
}
/* X: đánh dấu / bỏ dấu đơn vị hiện tại, đánh dấu xong thì tới đơn vị chưa đọc kế tiếp. Shift+X: cả section. */
function markCurrent(section) {
  var cur = currentUnit(), r = rvState();
  if (cur < 0) return;
  if (section) { var last = toggleSection(r.units[cur].sec); if (last >= 0) stepOpen(1, last); return; }
  var on = r.res.state[cur] !== 'done';
  markUnits([cur], on);
  if (on) stepOpen(1, cur);
}

/* NÚT ✓ REVIEWED CỦA HỘP NHẬN XÉT: đơn vị chạm đoạn bôi đen (nới ra trọn khối) hoặc các dòng đã chọn ở lề số. Hộp
   không biết tới nút này: MutationObserver theo dõi lúc hộp mở / đổi nội dung (như focus.js). */
function popUnits() {
  if (pop.mode !== 'new' || !pending || $('pop').hidden) return [];
  var r = rvState(), out = [];
  if (pending.lines) {
    pending.lines.forEach(function (n) { var k = unitAt(r.units, n - 1); if (k >= 0 && out.indexOf(k) < 0) out.push(k); });
    return out.sort(function (a, b) { return a - b; });
  }
  var pos = pending.origin === 'src' ? [pending.s, pending.e] : locate(pending, S.text, true);
  if (!pos) return [];
  return unitsIn(r.units, lineOf(S.text, pos[0]) - 1, lineOf(S.text, Math.max(pos[0], pos[1] - 1)) - 1);
}
function syncPopRv() {
  var b = $('pop-rv'), idx = popUnits(), h0 = $('pop').offsetHeight;
  b.hidden = !idx.length;
  if (idx.length) {
    var r = rvState(), all = idx.every(function (i) { return r.res.state[i] === 'done'; }), lbl = linesLabel(r.units, idx);
    $('pop-rv-t').textContent = all ? 'Unmark' : '✓ Reviewed';
    $('pop-rv-l').textContent = lbl;
    b.title = (all ? 'Unmarks ' : 'Marks ') + lbl + (all ? '' : ' reviewed') + ' (whole blocks)';
  }
  /* Nút hiện sau khi hộp đã đặt chỗ (MutationObserver chạy sau): hộp cao thêm thì kéo lại vào khung nhìn. */
  if (!$('pop').hidden && $('pop').offsetHeight !== h0) renderPopHints();
}
function popReviewed() {
  var idx = popUnits();
  if (!idx.length) return;
  var r = rvState(), on = !idx.every(function (i) { return r.res.state[i] === 'done'; }), lines = pending && pending.lines;
  markUnits(idx, on, idx.length > 1 ? (on ? 'Marked ' : 'Unmarked ') + linesLabel(r.units, idx) + (on ? ' reviewed.' : '.') : null);
  if (popDirty()) { syncPopRv(); return; }   // đang gõ nhận xét: giữ hộp
  closePop(true);
  if (lines) clearPicks();
  try { window.getSelection().removeAllRanges(); } catch (e) {}
}

/* VIÊN THUỐC ở máy hẹp / cảm ứng: khi phiên đã có dấu, hoặc đã mở tab Review. */
var touched = false;
export function setRvTouched() { touched = true; syncPill(); }
function syncPill(r, p) {
  r = r || rvState(); p = p || progress(r.units, r.res.state);
  var want = (!mqSide.matches || mqSheet.matches) && view !== 'edit' && !!S.text && r.units.length > 0 && (S.reviews.length > 0 || touched);
  $('rv-pill').hidden = !want;
  if (want) $('rv-pill-t').textContent = p.pct === 100 ? 'All reviewed ✓' : '✓ Done · next ↓';
}

export function initReview() {
  [['wrap-src', 'src'], ['wrap-md', 'md']].forEach(function (p) {
    var w = $(p[0]), box = h('div', { class: 'ma-lane', 'aria-hidden': 'true' });
    lanes[p[1]] = box;
    w.append(box);
    box.addEventListener('click', onLaneClick);
    box.addEventListener('mousedown', function (e) { if (e.shiftKey) e.preventDefault(); });   // Shift+bấm không bôi đen
    /* Sau initSyncScroll: cuộn do trang đặt (khung theo) không đổi khung đang dùng. */
    w.addEventListener('scroll', function () { if (!setByPage(w)) active = p[1]; }, { passive: true });
    w.addEventListener('scroll', scheduleCur, { passive: true });
    w.addEventListener('pointermove', function (e) { ptr = { w: p[1], y: e.clientY }; if (layoutVal('focusBy') === 'pointer') scheduleCur(); });
    w.addEventListener('pointerleave', function () { ptr = null; scheduleCur(); });
  });
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(scheduleLayout);
    ro.observe($('v-src')); ro.observe($('v-md'));
  }
  window.addEventListener('resize', scheduleLayout);
  window.addEventListener('scroll', scheduleCur, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleLayout);
  new MutationObserver(syncPopRv).observe($('pop'), { attributes: true, attributeFilter: ['hidden'] });
  new MutationObserver(syncPopRv).observe($('pop-q'), { childList: true, characterData: true, subtree: true });
  $('pop-rv').addEventListener('click', popReviewed);
  /* Viên thuốc chỉ đánh dấu, không bỏ dấu: đơn vị ở dải đọc đã đọc thì chỉ tới đơn vị chưa đọc kế tiếp. */
  $('rv-pill').addEventListener('click', function () {
    var r = rvState(), cur = currentUnit();
    if (cur >= 0 && r.res.state[cur] === 'done') stepOpen(1, cur); else markCurrent(false);
  });
  document.documentElement.classList.toggle('ma-rvdim', !!prefs.rvDim);
  /* X, Shift+X, J, K: bỏ qua khi đang gõ, khi hộp thoại hay hộp nhận xét mở, khi có phím bổ trợ khác Shift. */
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing || e.repeat) return;
    var k = (e.key || '').toLowerCase();
    if ((k !== 'x' && k !== 'j' && k !== 'k') || (e.shiftKey && k !== 'x')) return;
    var t = e.target;
    if (t && (t.isContentEditable || (t.closest && t.closest('input, textarea, select')))) return;
    if (document.querySelector('dialog[open]') || !$('pop').hidden) return;
    if (view === 'edit' || !S.text) return;
    e.preventDefault();
    if (k === 'x') markCurrent(e.shiftKey); else stepOpen(k === 'j' ? 1 : -1);
  });
}
