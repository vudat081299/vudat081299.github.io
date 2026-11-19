/* Gợi ý đã đọc theo thời gian đọc (MDAN-016): đo thời gian mỗi đơn vị chạm dải đọc (cùng luật dải của Focus band, chạy
   cả khi Focus tắt), đơn vị rời dải đi lên sau đủ thời gian thành "gợi ý": dấu ✓ viền đứt trên làn (.is-sug) và nút
   "Accept N suggested" ở tab Review. Không bao giờ tự đánh dấu: chấp nhận bằng X, bấm làn (ui/review.js) hay nút.
   Chỉ đếm khi tab hiện, cửa sổ có focus, người dùng không rảnh tay quá 60 s; cuộn do trang (J / K / X, dải tiến độ, cuộn
   theo nhau, setByPage) không tính là đọc; đơn vị chỉ được gợi ý khi rời dải lúc người dùng tự cuộn (bánh xe, chạm,
   phím cuộn, kéo thanh cuộn). Gợi ý và thời gian chỉ ở bộ nhớ của phiên đang mở, không lưu.
   Toán ở core/dwell.js; toạ độ làn và dải đọc ở ui/review.js.
   Xuất: initDwell, noteJump, paintSug, sugIdx, syncSug.
   Dùng: core/dwell.js, core/review.js, core/text.js, ui/dom.js, ui/store.js, ui/state.js, ui/views.js, ui/review.js,
     ui/minimap.js. */
import { dwellStep, sugKeys, sugList, unitWords } from '../core/dwell.js';
import { setMarks } from '../core/review.js';
import { plural } from '../core/text.js';
import { $, toast } from './dom.js';
import { prefs, savePrefs } from './store.js';
import { S } from './state.js';
import { view } from './views.js';
import { commitReviews, laneGeo, readingBand, rvState } from './review.js';
import { drawMinimap } from './minimap.js';

var TICK = 500, USER_MS = 400, FLING_MS = 1500, IDLE_MS = 60000, QUIET_MS = 220;
var sid = null, tr = {}, sug = {}, memo = { units: null };
var last = 0, userUntil = -Infinity, scrollUser = false, inputAt = 0, jumping = false, jumpT = 0, rebase = true, geoVer = 0, seenVer = -1, lastW = null, sbDrag = false;

function now() { return performance.now(); }
function enabled() { return prefs.rvSuggest !== false; }
function keysOf(r) {
  if (memo.units !== r.units) memo = { units: r.units, keys: sugKeys(r.units), words: unitWords(S.text, r.units) };
  return memo;
}
function sameSession() { if (sid !== S.id) { sid = S.id; tr = {}; sug = {}; rebase = true; } }
/* Chỉ số các đơn vị đang được gợi ý (chưa đọc), cho làn và dải tiến độ. */
export function sugIdx(r) {
  sameSession();
  if (!enabled()) return [];
  r = r || rvState();
  return sugList(sug, keysOf(r).keys, r.res.state);
}

/* Cuộn do trang (J / K / X, dải tiến độ): thời gian và đơn vị rời dải lúc này không tính; hết khi cuộn lặng QUIET_MS. */
export function noteJump() {
  jumping = true;
  clearTimeout(jumpT);
  jumpT = setTimeout(endJump, QUIET_MS + 200);
}
function endJump() { jumping = false; rebase = true; }

/* Một bước đo: cộng thời gian cho đơn vị chạm dải ở bước trước, tìm đơn vị vừa rời dải đi lên. */
function sample() {
  var t = now(), dt = Math.min(1000, Math.max(0, t - last));
  last = t;
  sameSession();
  if (!enabled() || view === 'edit' || !S.text) { tr = {}; rebase = true; return; }
  var b = readingBand();
  if (!b) { tr = {}; rebase = true; return; }
  var r = rvState(), g = laneGeo()[b.w];
  if (!g || !g.length) return;
  if (b.w !== lastW) { lastW = b.w; rebase = true; }
  var km = keysOf(r), items = g.map(function (e) { return { k: km.keys[e.i], top: e.top, bottom: e.bottom, w: km.words[e.i] }; });
  var live = document.visibilityState === 'visible' && document.hasFocus() && t - inputAt < IDLE_MS;
  var clean = !jumping && !rebase && seenVer === geoVer;
  var res = dwellStep(tr, items, [b.b1, b.b2], dt, { count: live && !jumping, emit: clean && scrollUser });
  tr = res.tr; rebase = false; seenVer = geoVer;
  var add = 0, idxOf = {};
  km.keys.forEach(function (k, i) { idxOf[k] = i; });
  res.ready.forEach(function (k) { if (!sug[k] && r.res.state[idxOf[k]] !== 'done') { sug[k] = true; add++; } });
  if (add) { paintLanes(r); syncPanel(r); drawMinimap(); }
}
var sampleRaf = 0;
function scheduleSample() { if (!sampleRaf) sampleRaf = requestAnimationFrame(function () { sampleRaf = 0; sample(); }); }

/* Dấu ✓ viền đứt trên làn của đơn vị được gợi ý; giữ tooltip gốc để trả lại khi gợi ý mất. */
var SUG_TIP = 'Looks read: it sat in the reading band long enough. Click or press X to mark it reviewed';
function paintLanes(r) {
  var on = {};
  sugIdx(r).forEach(function (i) { on[i] = true; });
  document.querySelectorAll('.ma-lane__b').forEach(function (b) {
    var s = !!on[+b.dataset.u] && !b.classList.contains('is-head');
    if (s === b.classList.contains('is-sug')) return;
    if (b.dataset.t0 == null) b.dataset.t0 = b.title;
    b.classList.toggle('is-sug', s);
    b.title = s ? SUG_TIP : b.dataset.t0;
  });
}
/* Gọi sau mỗi lần ui/review.js xếp lại làn: toạ độ vừa đổi, đơn vị "rời dải" vì vẽ lại không phải vì đọc. */
export function paintSug() { geoVer++; paintLanes(); }

function syncPanel(r) {
  var n = sugIdx(r).length;
  $('rv-suggest').checked = enabled();
  $('rv-sug').hidden = !n;
  if (n) {
    $('rv-sug-t').textContent = plural(n, 'block') + (n === 1 ? ' looks' : ' look') + ' read.';
    $('rv-sug-ok').textContent = 'Accept ' + n + ' suggested';
  }
}
/* Sau mỗi applyReview(): bỏ gợi ý của đơn vị đã đọc hay không còn trong văn bản, vẽ lại phần của tab Review. */
export function syncSug(r) {
  sameSession();
  var km = keysOf(r), live = {};
  km.keys.forEach(function (k, i) { if (r.res.state[i] !== 'done') live[k] = true; });
  Object.keys(sug).forEach(function (k) { if (!live[k]) delete sug[k]; });
  paintLanes(r);
  syncPanel(r);
}

function acceptAll() {
  var r = rvState(), km = keysOf(r), idx = sugIdx(r);
  if (!idx.length) return;
  var before = S.reviews, sb = Object.assign({}, sug), id = S.id;
  idx.forEach(function (i) { delete sug[km.keys[i]]; });
  S.reviews = setMarks(r.units, S.reviews, r.res, idx, true);
  commitReviews();
  toast('Marked ' + plural(idx.length, 'suggested block') + ' reviewed.', { label: 'Undo', fn: function () {
    if (S.id === id) { S.reviews = before; sug = sb; commitReviews(); }
  } });
}
/* Bỏ các gợi ý đang hiện và thời gian đã đếm của chúng (không thì đi qua lần nữa là gợi ý lại ngay). */
function dismissAll() {
  var r = rvState(), km = keysOf(r), ms = Object.assign({}, tr.ms || {});
  sugIdx(r).forEach(function (i) { delete sug[km.keys[i]]; delete ms[km.keys[i]]; });
  tr = { ms: ms, inb: tr.inb || [] };
  paintLanes(r); syncPanel(r); drawMinimap();
}

var SCROLL_KEYS = { ArrowDown: 1, ArrowUp: 1, PageDown: 1, PageUp: 1, ' ': 1, Home: 1, End: 1 };
export function initDwell() {
  var t0 = now();
  last = t0; inputAt = t0;
  function input() { inputAt = now(); }
  /* Thao tác cuộn của người dùng mở một cửa sổ ngắn: cuộn trong cửa sổ ấy là của người dùng. Chạm thì dài hơn (cuộn
     quán tính sau khi nhấc tay). */
  function userScroll(e) { inputAt = now(); userUntil = Math.max(userUntil, inputAt + (e && e.type.slice(0, 5) === 'touch' ? FLING_MS : USER_MS)); }
  document.addEventListener('wheel', userScroll, { passive: true, capture: true });
  document.addEventListener('touchmove', userScroll, { passive: true, capture: true });
  document.addEventListener('touchend', userScroll, { passive: true, capture: true });
  document.addEventListener('keydown', function (e) { if (SCROLL_KEYS[e.key]) userScroll(); else input(); }, true);
  document.addEventListener('pointermove', input, { passive: true });
  /* Kéo thanh cuộn: pointerdown trúng chính khung cuộn (thanh cuộn thuộc về nó), không trúng chữ bên trong. */
  document.addEventListener('pointerdown', function (e) {
    input();
    sbDrag = e.target === document.documentElement || (e.target.classList && e.target.classList.contains('ma-view'));
  }, true);
  document.addEventListener('pointerup', function () { sbDrag = false; }, true);
  function onScroll() {
    if (sbDrag) userScroll();
    scrollUser = !jumping && now() <= userUntil;
    if (jumping) { clearTimeout(jumpT); jumpT = setTimeout(endJump, QUIET_MS); }
    scheduleSample();
  }
  $('wrap-src').addEventListener('scroll', onScroll, { passive: true });
  $('wrap-md').addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('blur', function () { rebase = true; });
  document.addEventListener('visibilitychange', function () { last = now(); rebase = true; });
  setInterval(sample, TICK);
  $('rv-suggest').checked = enabled();
  $('rv-suggest').addEventListener('change', function (e) {
    prefs.rvSuggest = e.target.checked; savePrefs();
    tr = {}; sug = {}; rebase = true;
    var r = rvState();
    paintLanes(r); syncPanel(r); drawMinimap();
  });
  $('rv-sug-ok').addEventListener('click', acceptAll);
  $('rv-sug-x').addEventListener('click', dismissAll);
}
