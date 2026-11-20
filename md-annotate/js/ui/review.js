/* Đánh dấu đã đọc (MDAN-013): làn dấu cạnh từng đơn vị ở Source (bên phải vạch nhận xét) và Preview (lề trái), phím
   X / Shift+X / J / K, nút ✓ Reviewed của hộp nhận xét, viên thuốc "✓ Done · next ↓" ở máy hẹp / cảm ứng, làm mờ đơn vị
   đã đọc (.is-rv, html.ma-rvdim). Đơn vị, neo dấu, tiến độ ở core/review.js; tab Review ở ui/review-panel.js.
   Làn là lớp phủ .ma-lane trong #wrap-src / #wrap-md (ngoài #v-src / #v-md: text của khung không đổi). Vẽ lại sau mỗi
   renderAll() (applyReview) và khi khung đổi cỡ (ResizeObserver); đánh dấu (setReviews) chỉ tô lại nút có sẵn.
   Dải tiến độ (ui/minimap.js) và gợi ý theo thời gian đọc (ui/dwell.js, MDAN-016) vẽ lại sau mỗi lần xếp hay tô lại làn;
   chúng đọc toạ độ làn (laneGeo) và dải đọc (readingBand) ở đây. Lớp và tooltip của nút làn (cả .is-sug) chỉ dựng ở đây.
   Một chỗ hỏi (rvState: đơn vị, dấu đã neo, section), một chỗ ghi (setReviews: D.reviews, lưu, vẽ lại, Undo); luật ở
   core/review.js. Tab Review (ui/review-panel.js) và gợi ý (ui/dwell.js) ghi dấu qua setReviews. Dấu là của file đang
   mở (D); reviewDocOf(doc): dải dòng đã đọc của một file không mở, cho prompt All files.
   Xuất: applyReview, initReview, jumpUnit, laneGeo, markUnits, readingBand, repaintLanes, reviewDoc, reviewDocOf, rvState,
     setReviews, setRvTouched, stepOpen, toggleSection.
   Dùng: core/anchor.js, core/text.js, core/sections.js, core/review.js, core/blocks.js, core/session.js, core/prompt.js,
     ui/dom.js, ui/state.js, ui/sync-scroll.js, ui/views.js, ui/layout.js, ui/popup.js, ui/picks.js, ui/prompt.js,
     ui/review-panel.js, ui/dwell.js, ui/minimap.js, ui/markdown.js, ui/files.js. */
import { locate } from '../core/anchor.js';
import { lineOf, plural } from '../core/text.js';
import { bandBounds, bandPick, bandScroll } from '../core/sections.js';
import { allDone, linesWord, markWord, nextOpen, progress, resolveMarks, reviewRanges, reviewSections, reviewUnits, setMarks, unitsIn,
  unitsOfLines, withSug } from '../core/review.js';
import { lexSpans } from '../core/blocks.js';
import { docOf } from '../core/session.js';
import { wantsReview } from '../core/prompt.js';
import { $, h, mqSheet, mqSide, reduceMotion, shown, toast, typing } from './dom.js';
import { D, docKey, S, saveClosed, scheduleSave, sessionFor } from './state.js';
import { mdLex } from './markdown.js';
import { refreshTree } from './files.js';
import { blockPairs, setByPage } from './sync-scroll.js';
import { isSplit, view } from './views.js';
import { layoutVal } from './layout.js';
import { closePop, pending, pop, popDirty, renderPopHints } from './popup.js';
import { clearPicks } from './picks.js';
import { renderPrompt } from './prompt.js';
import { renderReviewPanel } from './review-panel.js';
import { noteJump, noteLayout, sugIdx, syncSug } from './dwell.js';
import { drawMinimap } from './minimap.js';

/* Đơn vị và dấu đã neo của văn bản đang mở: { units, res, secs }. Nhớ theo văn bản, mảng dấu và khối nguồn. */
var memo = { text: null, marks: null, spans: null };
export function rvState() {
  var spans = blockPairs().spans, marks = D.reviews || (D.reviews = []);
  if (memo.text !== D.text || memo.marks !== marks || memo.spans !== spans) {
    /* Chỉ dấu đổi: giữ mảng units cũ (làn đang vẽ cho nó thì chỉ tô lại, restyleLanes). */
    var units = memo.text === D.text && memo.spans === spans ? memo.units : reviewUnits(D.text, spans), res = resolveMarks(units, marks);
    memo = { text: D.text, marks: marks, spans: spans, units: units, res: res, secs: reviewSections(units, res.state, []) };
  }
  return memo;
}
/* Dải dòng cho prompt (core/prompt.js d.review), hoặc null khi tắt. */
export function reviewDoc() {
  if (!wantsReview(S)) return null;
  var r = rvState();
  return reviewRanges(r.units, r.res.state);
}
/* Như reviewDoc cho một file không mở: đơn vị từ marked.lexer như khi nó mở; nhớ theo doc, chữ và mảng dấu. */
var offRv = new WeakMap();
export function reviewDocOf(doc) {
  if (!wantsReview(S) || !doc.reviews.length) return null;
  var m = offRv.get(doc);
  if (m && m.text === doc.text && m.marks === doc.reviews) return m.val;
  var val = null;
  try {
    var units = reviewUnits(doc.text, lexSpans(doc.text, mdLex));
    val = reviewRanges(units, resolveMarks(units, doc.reviews).state);
  } catch (e) { val = null; }   // marked chưa nạp
  offRv.set(doc, { text: doc.text, marks: doc.reviews, val: val });
  return val;
}

/* GHI DẤU: chỗ duy nhất gán D.reviews. Lưu, vẽ lại, prompt, cây. undoMsg: toast có Undo (trang không có chồng hoàn tác
   chung); onUndo: việc thêm khi hoàn tác trong cùng file (trả gợi ý). Đã sang file hay phiên khác thì Undo trả dấu về
   doc của nó, bỏ % đã lưu (sai sau khi trả; tính lại khi mở). */
export function setReviews(next, undoMsg, onUndo) {
  var before = D.reviews, key = docKey(), sid = S.id, fid = S.open, base = S;
  D.reviews = next;
  commit();
  if (undoMsg) toast(undoMsg, { label: 'Undo', fn: function () {
    if (docKey() === key) { D.reviews = before; if (onUndo) onUndo(); commit(); return; }
    var s = sessionFor(sid, base), d = s && docOf(s, fid);
    if (!d) return;
    d.reviews = before; delete d.rvPct;
    if (s === S) { scheduleSave(); refreshTree(); } else saveClosed(s);
  } });
}
function commit() { scheduleSave(); applyReview(true); if (wantsReview(S)) renderPrompt(); refreshTree(); }
/* Đánh dấu (on) / bỏ dấu các đơn vị idxs. undo: có toast Undo (thao tác nhiều đơn vị). */
export function markUnits(idxs, on, undo) {
  if (!idxs.length) return;
  var r = rvState();
  setReviews(setMarks(r.units, D.reviews, r.res, idxs, on), undo ? markWord(r.units, idxs, on) : null);
}
/* Bật / tắt cả section: chưa đọc hết thì đánh dấu hết. Trả đơn vị cuối khi vừa đánh dấu, -1 khi vừa bỏ. */
export function toggleSection(sec) {
  var r = rvState(), idx = [];
  r.units.forEach(function (u, i) { if (u.sec === sec) idx.push(i); });
  var on = !allDone(r.res.state, idx);
  markUnits(idx, on, idx.length > 1);
  return on ? idx[idx.length - 1] : -1;
}

/* LÀN DẤU. geo.src / geo.md: [{ i, top, bottom }] theo thứ tự, toạ độ trong nội dung của #wrap-* (không đổi khi cuộn). */
var lanes = {}, geo = { src: [], md: [] }, anchor = null;   // anchor: { i, units } của lần bấm làn trước (Shift + bấm)
function wrapOf(w) { return $(w === 'src' ? 'wrap-src' : 'wrap-md'); }
function rootOf(w) { return $(w === 'src' ? 'v-src' : 'v-md'); }
/* Phần tử Preview của đơn vị i: khối cấp cao, hoặc mục <li> thứ item khi số mục hai bên khớp. */
function mdEl(r, i) {
  var u = r.units[i], bp = blockPairs(), j = bp.toMd[u.block], el = j >= 0 ? bp.blocks[j] : null;
  if (!el || !el.isConnected || u.item < 0) return el && el.isConnected ? el : null;
  var lis = Array.prototype.filter.call(el.children, function (x) { return x.tagName === 'LI'; });
  return lis.length === bp.spans[u.block].items.length ? lis[u.item] : null;
}
var SUG_TIP = 'Looks read: it sat in the reading band long enough. Click or press X to mark it reviewed';
function tip(r, i, shown) {
  var u = r.units[i], s = r.res.state[i], lines = linesWord(r.units, [i]);
  if (u.head) {
    var sc = r.secs.filter(function (x) { return x.sec === u.sec; })[0];
    return 'Section: ' + sc.done + ' of ' + plural(sc.total, 'block') + ' reviewed. Click to ' + (sc.state === 'done' ? 'unmark all' : 'mark all') + ' (Shift+X)';
  }
  if (shown[i] === 'sug') return SUG_TIP;
  if (s === 'done') return 'Reviewed ' + lines + '. Click to unmark (X)';
  if (s === 'changed') return 'Text changed since you reviewed it. Click to confirm ' + lines + ' (X)';
  return 'Mark ' + lines + ' reviewed (X). Shift+click marks a range';
}
/* Lớp của nút làn đơn vị i (không gồm .is-cur / .is-flash). k: kiểu vẽ (laneKit). */
function laneClass(r, i, k) {
  var u = r.units[i];
  return 'ma-lane__b is-' + r.res.state[i] + (k.shown[i] === 'sug' ? ' is-sug' : '') + (u.head ? ' is-head sec-' + k.secOf[u.sec] : '');
}
/* Dữ liệu chung để dựng lớp / tooltip mọi nút làn: trạng thái hiển thị (gợi ý: core/review.js withSug), section. */
function laneKit(r) {
  var o = {};
  r.secs.forEach(function (sc) { o[sc.sec] = sc.state; });
  return { secOf: o, shown: withSug(r.res.state, sugIdx(r)) };
}
/* Tâm dòng đầu của phần tử, tính từ đỉnh nó (px): đệm trên + viền trên + nửa chiều cao dòng. Bảng: theo ô đầu. Kiểu tính
   một lần mỗi thẻ (cache) — văn bản dài có hàng nghìn khối. */
function lineH(cs) { var l = parseFloat(cs.lineHeight); return isNaN(l) ? parseFloat(cs.fontSize) * 1.25 : l; }
function firstLineC(el, cache) {
  if (el.tagName === 'TABLE') {
    var c = el.querySelector('th, td');
    if (!c) return 9;
    var cs = getComputedStyle(c);
    return c.getBoundingClientRect().top - el.getBoundingClientRect().top + parseFloat(cs.paddingTop) + lineH(cs) / 2;
  }
  var k = el.tagName + '.' + el.className;
  if (!(k in cache)) { var st = getComputedStyle(el); cache[k] = parseFloat(st.paddingTop) + parseFloat(st.borderTopWidth) + lineH(st) / 2; }
  return cache[k];
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
  var kit = laneKit(r), frag = document.createDocumentFragment(), cache = {};
  r.units.forEach(function (u, i) {
    var top, bottom, c;
    if (w === 'src') {
      var a = root.children[u.a], b = root.children[u.b];
      if (!a || !b) return;
      top = a.getBoundingClientRect().top; bottom = b.getBoundingClientRect().bottom;
      c = firstLineC(a, cache);
    } else {
      var el = mdEl(r, i);
      if (!el) return;
      var rc = el.getBoundingClientRect(); top = rc.top; bottom = rc.bottom;
      c = firstLineC(el, cache);
    }
    top -= off; bottom -= off;
    out.push({ i: i, top: top, bottom: bottom });
    var btn = h('button', { type: 'button', tabindex: '-1', 'data-u': String(i), title: tip(r, i, kit.shown), class: laneClass(r, i, kit) });
    btn.style.cssText = 'left:' + Math.round(x) + 'px;top:' + Math.round(top) + 'px;height:' + Math.max(16, Math.round(bottom - top)) + 'px;--c:' + Math.round(c) + 'px';
    frag.append(btn);
  });
  box.append(frag);
}
var laying = false, painting = false;   // chặn vòng: currentUnit() → ensureGeo() → layoutLanes() → paintCur()
var laneUnits = null;                    // units mà làn đang vẽ
function layoutLanes() {
  var r = rvState(); laying = true; fillLane('src', r); fillLane('md', r); laying = false; laneUnits = r.units; paintCur();
  noteLayout(); drawMinimap();
}
/* Chỉ dấu hay gợi ý đổi (đơn vị, chỗ không đổi): đổi lớp và tooltip của nút có sẵn, không đo lại, không dựng lại. */
function restyleLanes(r) {
  var kit = laneKit(r);
  ['src', 'md'].forEach(function (w) {
    Array.prototype.forEach.call(lanes[w].children, function (b) {
      var i = +b.dataset.u, want = laneClass(r, i, kit), t = tip(r, i, kit.shown);
      ['is-cur', 'is-flash'].forEach(function (c) { if (b.classList.contains(c)) want += ' ' + c; });
      if (b.className !== want) b.className = want;
      if (b.title !== t) b.title = t;
    });
  });
  paintCur(); drawMinimap();
}
/* Gợi ý đổi (ui/dwell.js): tô lại làn và dải tiến độ. */
export function repaintLanes() { if (laneUnits === rvState().units) restyleLanes(rvState()); }
/* Toạ độ làn đã xếp: { src, md }, mỗi khung [{ i, top, bottom }] theo toạ độ nội dung của #wrap-*. Chỉ đọc. */
export function laneGeo() { return geo; }
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
  if (e.shiftKey && anchor && anchor.units === r.units && anchor.i !== i) {   // văn bản đổi: mốc cũ không còn nghĩa
    var idx = [], lo = Math.min(anchor.i, i), hi = Math.max(anchor.i, i), on = st[i] !== 'done';
    for (var k = lo; k <= hi; k++) idx.push(k);
    markUnits(idx, on, true);
  } else if (r.units[i].head) toggleSection(r.units[i].sec);
  else markUnits([i], st[i] !== 'done');
  anchor = { i: i, units: rvState().units };
}

/* Làm mờ đơn vị đã đọc: lớp .is-rv trên dòng Source và phần tử Preview; CSS chỉ làm mờ khi html.ma-rvdim. Chỉ chạm
   phần tử đổi trạng thái: gỡ hết rồi gắn lại thì trình duyệt tính lại kiểu của mọi dòng (văn bản dài: hàng trăm ms). */
function paintDone(r) {
  var lines = $('v-src').children, on = new Uint8Array(lines.length), md = new Set();
  r.units.forEach(function (u, i) {
    if (r.res.state[i] !== 'done') return;
    for (var k = u.a; k <= u.b && k < lines.length; k++) on[k] = 1;
    var el = mdEl(r, i);
    if (el) md.add(el);
  });
  for (var k = 0; k < lines.length; k++) lines[k].classList.toggle('is-rv', !!on[k]);
  document.querySelectorAll('#v-md .is-rv').forEach(function (el) { if (!md.has(el)) el.classList.remove('is-rv'); });
  md.forEach(function (el) { el.classList.toggle('is-rv', true); });
}

/* VẼ: gọi cuối renderAll() và sau mỗi lần đánh dấu (marksOnly: văn bản và khung không đổi, làn chỉ tô lại). */
var lostSeen = { sid: null, n: 0 };
export function applyReview(marksOnly) {
  var r = rvState(), p = progress(r.units, r.res.state), nl = r.res.lost.length, de = document.documentElement;
  /* Không có đơn vị mà văn bản có chữ: chưa tách được khối (thiếu mạng, Preview không dựng): dấu chưa neo được, không
     phải mất. Giữ % đã lưu, không báo mất. */
  var blind = !r.units.length && /\S/.test(D.text || '');
  if (!D.reviews.length) delete D.rvPct; else if (!blind) D.rvPct = p.pct;
  if (de.classList.contains('ma-reviewing') !== D.reviews.length > 0) marksOnly = false;   // điện thoại: lề trái Preview đổi
  de.classList.toggle('ma-reviewing', D.reviews.length > 0);
  /* Dấu mất vì văn bản đổi: báo một lần, lúc mất, như nhận xét mất neo; danh sách ở tab Review. Mở phiên đã có dấu mất
     thì không báo lại (đã báo lúc mất; toast mới sẽ che toast Undo của thao tác vừa làm). */
  if (!blind) {
    if (lostSeen.sid === docKey() && nl > lostSeen.n) {
      var k = nl - lostSeen.n;
      toast(plural(k, 'reviewed block') + (k === 1 ? ' was' : ' were') + ' edited away. See the Review tab.');
    }
    lostSeen = { sid: docKey(), n: nl };
  }
  paintDone(r);
  if (marksOnly && laneUnits === r.units) restyleLanes(r); else layoutLanes();
  renderReviewPanel(r, p, blind);
  syncPill(r, p);
  syncPopRv();
  syncSug(r);
}

/* ĐƠN VỊ HIỆN TẠI: dưới con trỏ khi Focus mode theo chuột, không thì đơn vị chạm dải đọc 25–50% (core/sections.js) của
   khung người dùng cuộn gần nhất (Split; chưa cuộn thì Preview). Khung không cuộn được (văn bản ngắn): đơn vị đầu, như
   khi cuộn hết lên (dải trượt về mép trên); dải giữa khung thì X đầu tiên trúng khối giữa văn bản. */
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
  var sc = isSplit() ? wrapOf(w) : document.scrollingElement;
  if (pin) {
    var t = sc.scrollTop;
    if (pin.sc === sc && pin.units === rvState().units && t >= Math.min(pin.from, pin.to) - 2 && t <= Math.max(pin.from, pin.to) + 2) return pin.i;
    pin = null;
  }
  if (sc.scrollHeight - sc.clientHeight < 1) return g[0].i;
  var b = readingBand(w);
  return g[bandPick(g.length, function (j) { return g[j].bottom; }, function (j) { return g[j].top; }, b.b1, b.b2)].i;
}
/* Dải đọc 25–50% (core/sections.js) của khung w (mặc định: khung đang dùng), theo toạ độ nội dung của #wrap-* như laneGeo:
   { w, b1, b2 }, hoặc null khi không khung nào hiện. */
export function readingBand(w) {
  w = w || activePane();
  if (!w) return null;
  var wrap = wrapOf(w), split = isSplit(), sc = split ? wrap : document.scrollingElement;
  var vr = split ? wrap.getBoundingClientRect() : { top: Math.max(0, rootOf(w).getBoundingClientRect().top), bottom: window.innerHeight };
  var band = bandBounds(vr.top, vr.bottom, window.innerHeight, sc.scrollTop, sc.scrollHeight - sc.clientHeight);
  var off = wrap.getBoundingClientRect().top - wrap.scrollTop;
  return { w: w, b1: band[0] - off, b2: band[1] - off };
}
/* Đơn vị vừa nhảy tới (jumpUnit) là đơn vị hiện tại khi khung còn ở trên đường cuộn tới nó (from → to): cuộn mượt chưa
   xong, hay không cuộn được (văn bản ngắn, sát mép), X / J kế tiếp vẫn tính từ nó. Người dùng cuộn ra ngoài thì bỏ. */
var pin = null;
/* Cuộn đơn vị i vào dải đọc của khung đang dùng; khung kia theo nhờ cuộn theo nhau. Đỉnh đặt ngay trên mốc trên của
   dải (bandScroll): đặt thấp hơn thì đuôi đơn vị trước còn trong dải và thắng (bandPick), X kế tiếp sẽ trúng nó. Mốc
   trượt về mép khi gần đầu / cuối (bandBounds), nên tính theo chính vị trí cuộn đích. */
var BAND_UP = 6;
export function jumpUnit(i) {
  var w = activePane(), g = ensureGeo(w), e = g.filter(function (x) { return x.i === i; })[0];
  if (!e && w) { var o = w === 'src' ? 'md' : 'src'; if (shown(rootOf(o))) { e = ensureGeo(o).filter(function (x) { return x.i === i; })[0]; if (e) w = o; } }
  if (!e) return;
  noteJump();   // cuộn do trang: đơn vị đi qua dải lúc này không tính là đã đọc (ui/dwell.js)
  var wrap = wrapOf(w), how = reduceMotion.matches ? 'auto' : 'smooth', vh = window.innerHeight, wr = wrap.getBoundingClientRect();
  if (isSplit()) {
    var maxS = wrap.scrollHeight - wrap.clientHeight, ts = bandScroll(function (s) {
      return wr.top + e.top - s - bandBounds(wr.top, wr.bottom, vh, s, maxS)[0];
    }, maxS, BAND_UP);
    pin = { i: i, sc: wrap, from: wrap.scrollTop, to: ts, units: rvState().units };
    wrap.scrollTo({ behavior: how, top: ts });
  } else {
    var de = document.scrollingElement, maxW = de.scrollHeight - de.clientHeight, y0 = window.scrollY;
    var unitY = wr.top + y0 + e.top, rootY = rootOf(w).getBoundingClientRect().top + y0;
    var tw = bandScroll(function (s) {
      return unitY - s - bandBounds(Math.max(0, rootY - s), vh, vh, s, maxW)[0];
    }, maxW, BAND_UP);
    pin = { i: i, sc: de, from: de.scrollTop, to: tw, units: rvState().units };
    window.scrollTo({ behavior: how, top: tw });
  }
  document.querySelectorAll('.ma-lane__b[data-u="' + i + '"]').forEach(function (b) {
    b.classList.remove('is-flash'); void b.offsetWidth; b.classList.add('is-flash');
    setTimeout(function () { b.classList.remove('is-flash'); }, 1200);
  });
  scheduleCur();   // không cuộn được thì không có sự kiện cuộn: .is-cur vẫn phải sang đơn vị mới
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
  var r = rvState();
  if (pending.lines) return unitsOfLines(r.units, pending.lines);
  var pos = pending.origin === 'src' ? [pending.s, pending.e] : locate(pending, D.text, true);
  if (!pos) return [];
  return unitsIn(r.units, lineOf(D.text, pos[0]) - 1, lineOf(D.text, Math.max(pos[0], pos[1] - 1)) - 1);
}
function syncPopRv() {
  var b = $('pop-rv'), idx = popUnits(), h0 = $('pop').offsetHeight;
  b.hidden = !idx.length;
  if (idx.length) {
    var r = rvState(), all = allDone(r.res.state, idx), lbl = linesWord(r.units, idx);
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
  var on = !allDone(rvState().res.state, idx), lines = pending && pending.lines;
  markUnits(idx, on, idx.length > 1);
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
  var want = (!mqSide.matches || mqSheet.matches) && view !== 'edit' && !!D.text && r.units.length > 0 && (D.reviews.length > 0 || touched);
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
  /* X, Shift+X, J, K: bỏ qua khi đang gõ, khi hộp thoại hay hộp nhận xét mở, khi có phím bổ trợ khác Shift. */
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing || e.repeat) return;
    var k = (e.key || '').toLowerCase();
    if ((k !== 'x' && k !== 'j' && k !== 'k') || (e.shiftKey && k !== 'x')) return;
    if (typing(e.target)) return;
    if (document.querySelector('dialog[open]') || !$('pop').hidden) return;
    if (view === 'edit' || !D.text) return;
    e.preventDefault();
    if (k === 'x') markCurrent(e.shiftKey); else stepOpen(k === 'j' ? 1 : -1);
  });
}
