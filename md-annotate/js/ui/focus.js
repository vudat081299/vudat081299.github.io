/* Focus mode: mờ mọi thứ ngoài một section; chọn section theo chuột (pointer) hoặc dải đọc 25–50% (band). Dòng dưới
   chuột luôn sáng (.is-line), cả khi đã đọc (Dim reviewed); cách gộp hai lớp mờ ở css/focus.css (MDAN-045).
   Xuất: initFocus, refreshBand, refreshFocus.
   Dùng: core/sections.js, ui/dom.js, ui/state.js, ui/views.js, ui/sync-scroll.js, ui/layout.js. */
import { bandBounds, bandPick, lineSections, numberSections, partAt, partCount, partLines, spanAt, subItems } from '../core/sections.js';
import { $, shown } from './dom.js';
import { openType } from './state.js';
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
/* Focus mode chỉ ở file markdown (MDAN-073): file khác không có section. */
function focusOn() { return document.documentElement.classList.contains('ma-focus') && openType().md; }
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
    if (!focusOn()) {   // vừa tắt, hay vừa sang file không phải markdown: bỏ lớp của section đang sáng
      if (litSec['v-src'] != null || litSec['v-md'] != null) refreshFocus();
      return;
    }
    // Theo chuột: khung vẽ lại mất .is-sec; đặt lại section đang sáng, không thì cả khung mờ tới lần rê kế tiếp. Cuộn
    // khi chuột đứng yên: section và dòng theo chữ dưới chuột (trừ khi hộp nhận xét mở: giữ section đang ghi).
    if (layoutVal('focusBy') !== 'band') {
      ['v-src', 'v-md'].forEach(function (id) { if (litSec[id] != null) applySec($(id), litSec[id]); });
      if ($('pop') && !$('pop').hidden) return;
      var pt = ptr && document.elementFromPoint(ptr.x, ptr.y), pr = pt && pt.closest('#v-src, #v-md');
      if (pr) pointAt(pr, pt);
      return;
    }
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

/* Dòng dưới chuột (cả hai cách chọn section). Source: một .ma-ln. Preview: mục danh sách, hàng bảng, mục định nghĩa,
   hoặc cả khối cấp cao. Khối cấp cao chứa nó (host) sáng; trong host, anh em của nó và của mỗi tổ tiên tới host mờ
   (.ma-dimx), vì opacity của con không vượt được cha.
   Split: hai khung sáng cùng một phần, phần sâu nhất ghép được cả hai bên (pairAt): khối (blockPairs, như cuộn theo
   nhau), mục / hàng (core partAt, partLines), mục con (core subItems). Source sáng mọi dòng của phần ấy, không chỉ dòng
   dưới chuột, để hai khung cho cùng một độ sáng (MDAN-045). */
var lineAt = null, lineSplit = false; // phần tử dưới chuột đang sáng, để rê trong cùng một dòng không gắn lại lớp
function clearLines() {
  lineAt = null;
  ['v-src', 'v-md'].forEach(function (id) {
    $(id).querySelectorAll('.is-line, .ma-dimx').forEach(function (x) { x.classList.remove('is-line', 'ma-dimx'); });
  });
}
/* Phần ở Preview của khối cấp cao: mục của danh sách, hàng của bảng; khối khác: []. */
function mdParts(host) {
  if (host.tagName === 'UL' || host.tagName === 'OL') return Array.prototype.filter.call(host.children, function (x) { return x.tagName === 'LI'; });
  return host.tagName === 'TABLE' ? Array.prototype.slice.call(host.rows) : [];
}
function blankLine(k) { var l = $('v-src').children[k]; return !l || !/\S/.test(l.textContent); }
function lightMdUnit(u) {
  var root = $('v-md'), host = u;
  while (host.parentElement !== root) host = host.parentElement;
  host.classList.add('is-line');
  for (var n = u; n !== host; n = n.parentElement) {
    Array.prototype.forEach.call(n.parentElement.children, function (x) { if (x !== n) x.classList.add('ma-dimx'); });
  }
}
function lightSrcLines(a, b) {
  var lines = $('v-src').children;
  for (var i = a; i <= b && i < lines.length; i++) lines[i].classList.add('is-line');
}
/* Mục con cháu (<li>) của mục danh sách `part` ở Preview ghép với dòng của chúng ở Source (core subItems, dòng ab của
   mục); null nếu không có con hay số mục hai bên lệch. */
function nestedPairs(part, ab) {
  var lis = part.tagName === 'LI' ? part.querySelectorAll('li') : [];
  if (!lis.length) return null;
  var lines = $('v-src').children, texts = [];
  for (var k = ab[0]; k <= ab[1]; k++) texts[k] = lines[k] ? lines[k].textContent.replace(/\n$/, '') : '';
  var subs = subItems(texts, ab[0], ab[1]);
  return subs.length === lis.length ? { lis: lis, subs: subs } : null;
}
function ownText(li) { return Array.prototype.some.call(li.childNodes, function (n) { return n.nodeType === 3 && /\S/.test(n.data); }); }
/* Phần ghép của khối nguồn sp (khối Preview host): pi là mục / hàng chứa chỗ dưới chuột (-1: không biết), hit(li, [a, b])
   cho biết mục con li (dòng a–b) chứa nó. Trả { el, a, b, own }: phần tử Preview, dòng nguồn của nó, và dòng chữ riêng của
   các mục tổ tiên có chữ trần (Preview để chữ ấy sáng, MDAN-010; Source sáng theo). */
function pairPart(sp, host, pi, hit) {
  var parts = mdParts(host);
  if (pi < 0 || parts.length !== partCount(sp)) return { el: host, a: sp.a, b: sp.b, own: [] };
  var ab = partLines(sp, pi, blankLine), np = nestedPairs(parts[pi], ab), hits = [];
  if (np) np.subs.forEach(function (r, s) { if (hit(np.lis[s], r)) hits.push(s); });   // thứ tự cây: chứa sau cùng là sâu nhất
  if (!hits.length) return { el: parts[pi], a: ab[0], b: ab[1], own: [] };
  var last = hits.pop(), own = [];
  [{ el: parts[pi], a: ab[0] }].concat(hits.map(function (s) { return { el: np.lis[s], a: np.subs[s][0] }; })).forEach(function (x) {
    var f = np.subs.filter(function (r) { return r[0] > x.a; })[0];
    if (ownText(x.el)) own.push([x.a, f ? f[0] - 1 : x.a]);
  });
  return { el: np.lis[last], a: np.subs[last][0], b: np.subs[last][1], own: own };
}
/* Phần ghép của chỗ dưới chuột (u: .ma-ln hay phần tử Preview), hoặc null nếu khối của nó không ghép với khung kia. */
function pairAt(root, u) {
  var bp = blockPairs();
  if (root.id === 'v-src') {
    var idx = Array.prototype.indexOf.call(root.children, u), k = spanAt(bp.spans, idx);
    if (k < 0 || bp.toMd[k] < 0) return null;
    return pairPart(bp.spans[k], bp.blocks[bp.toMd[k]], partAt(bp.spans[k], idx), function (li, r) { return idx >= r[0] && idx <= r[1]; });
  }
  var top = u, pi = -1;
  while (top.parentElement !== root) top = top.parentElement;
  var j = bp.blocks.indexOf(top), k2 = j >= 0 ? bp.toSrc[j] : -1;
  if (k2 < 0) return null;
  mdParts(top).forEach(function (x, i) { if (x.contains(u)) pi = i; });
  return pairPart(bp.spans[k2], top, pi, function (li) { return li.contains(u); });
}
function lineAtPointer(root, t) {
  var u = null, split = isSplit();
  if (t && t.closest && root.contains(t)) u = root.id === 'v-src' ? t.closest('.ma-ln') : t.closest('li, tr, dt, dd') || t.closest('#v-md > *');
  if (u && (u === root || !root.contains(u))) u = null;
  if (u && u === lineAt && split === lineSplit && u.isConnected) return;
  clearLines();
  if (!u) return;
  lineAt = u; lineSplit = split;
  var p = split ? pairAt(root, u) : null;
  if (!p) { if (root.id === 'v-src') u.classList.add('is-line'); else lightMdUnit(u); return; }
  lightMdUnit(p.el);
  lightSrcLines(p.a, p.b);
  p.own.forEach(function (r) { lightSrcLines(r[0], r[1]); });
}
/* Theo chuột: section của khối dưới chuột sáng ở cả hai khung (Split), rồi dòng dưới chuột. */
function pointAt(root, t) {
  var el = t && t.closest && t.closest(root.id === 'v-src' ? '.ma-ln' : '#v-md > *');
  if (!el || !root.contains(el)) return;
  ensureSec(root);
  if (!el.dataset.sec) markSections(root);
  focusBoth(root, el.dataset.sec);
  lineAtPointer(root, t);
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
        if (layoutVal('focusBy') === 'band') lineAtPointer(root, lastT); else pointAt(root, lastT);
      });
    });
    root.addEventListener('pointerleave', function () {
      var by = layoutVal('focusBy');
      if (by === 'pointer' && $('pop') && !$('pop').hidden) return; // đang ghi nhận xét: giữ section và dòng sáng
      ptr = null; clearLines();
      if (by !== 'pointer') return;
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
    if (!$('v-src').matches(':hover') && !$('v-md').matches(':hover')) { ptr = null; clearLines(); clearFocus($('v-src')); clearFocus($('v-md')); }
  }).observe($('pop'), { attributes: true, attributeFilter: ['hidden'] });
}
