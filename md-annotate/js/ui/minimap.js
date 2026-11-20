/* Dải tiến độ (MDAN-016): một dải dọc mảnh sát mép phải mỗi khung đang hiện (Source, Preview; cả hai ở Split), ngay
   trái thanh cuộn. Mỗi đơn vị một đoạn theo vị trí / chiều cao của nó trong khung: đặc --accent đã đọc, rỗng viền đã đổi
   chữ (○), nhạt chưa đọc, viền đứt được gợi ý (ui/dwell.js). Trái dải là thanh cuộn tự vẽ: con trượt xám theo khung nhìn,
   chấm ở chỗ có nhận xét; ở Split nó thay thanh cuộn hệ thống của khung (css/reading.css ẩn thanh ấy), để không có hai thanh.
   Bề rộng, lề, khe, mép trái làm tròn theo điểm ảnh thật (devicePixelRatio), để hai khung vẽ cột rộng như nhau ở mọi mức thu phóng.
   Hai đầu dải cách mép khung có góc bo ít nhất bằng bán kính góc (cornerLimits). Bấm / kéo trên dải
   thì cuộn tới đó (cuộn do trang, không tính là đọc). Không có đơn vị thì ẩn.
   Dải là phần tử position: fixed ngoài #v-src / #v-md (text của khung không đổi), đặt theo khung bằng JS. Vẽ lại đoạn
   khi ui/review.js xếp làn (vẽ, đánh dấu, đổi cỡ); khi cuộn chỉ dời hộp khung nhìn (và khung, ở chế độ cuộn cửa sổ).
   Điện thoại (≤ 720px): ẩn — lề chỉ 12px, dải sẽ đè chữ, thanh đáy đã có ✓ N%. Màn cảm ứng: chỉ để xem, không nhận chạm
   (dải 14px không đạt --h-touch, lại nằm đúng chỗ ngón tay vuốt cuộn).
   Toán ở core/minimap.js.
   Xuất: drawMinimap, initMinimap.
   Dùng: core/minimap.js, ui/dom.js, ui/state.js, ui/views.js, ui/review.js, ui/dwell.js. */
import { mmDots, mmScroll, mmSegments, mmView } from '../core/minimap.js';
import { $, h, shown } from './dom.js';
import { S } from './state.js';
import { isSplit, view } from './views.js';
import { laneGeo, rvState } from './review.js';
import { noteJump, sugIdx } from './dwell.js';

var GAP = 8, MIN_H = 80, SEG_MIN = 2, VIEW_MIN = 12, DOT_GAP = 5;
var mqPhone = window.matchMedia('(max-width: 720px)');
var strips = {}, frames = { src: null, md: null };
function wrapOf(w) { return $(w === 'src' ? 'wrap-src' : 'wrap-md'); }
function rootOf(w) { return $(w === 'src' ? 'v-src' : 'v-md'); }
function barBottom() { var b = document.querySelector('.ma-bar'); return b ? Math.max(0, b.getBoundingClientRect().bottom) : 0; }
function dockTop() { var d = $('dock'); return d && shown(d) ? d.getBoundingClientRect().top : window.innerHeight; }
function snap(px) { var r = window.devicePixelRatio || 1; return Math.max(1, Math.round(px * r)) / r; }
function snapPos(px) { var r = window.devicePixelRatio || 1; return Math.round(px * r) / r; }
/* Bề rộng cột và lề từ token, làm tròn theo điểm ảnh thật; gán lên từng dải. */
function sizeStrips() {
  var cs = getComputedStyle(document.documentElement);
  ['--mm-w', '--mm-p', '--mm-gap'].forEach(function (k) {
    var v = snap(parseFloat(cs.getPropertyValue(k)) || 1) + 'px';
    strips.src.style.setProperty(k, v); strips.md.style.setProperty(k, v);
  });
}

/* Góc bo: khung và mọi khung chứa nó có góc bo thì đầu dải cách mép trên / dưới của khung ấy ít nhất bằng bán kính góc,
   để dải không chạm vào đường cong (khung văn bản bo --r-lg ở đáy). Trả { top, bot } theo toạ độ khung nhìn. */
function cornerLimits(el) {
  var top = -Infinity, bot = Infinity;
  for (var n = el; n && n !== document.body; n = n.parentElement) {
    var cs = getComputedStyle(n), rt = Math.max(parseFloat(cs.borderTopLeftRadius) || 0, parseFloat(cs.borderTopRightRadius) || 0);
    var rb = Math.max(parseFloat(cs.borderBottomLeftRadius) || 0, parseFloat(cs.borderBottomRightRadius) || 0);
    if (!rt && !rb) continue;
    var r = n.getBoundingClientRect();
    if (rt) top = Math.max(top, r.top + rt);
    if (rb) bot = Math.min(bot, r.bottom - rb);
  }
  return { top: top, bot: bot };
}
/* Khung của dải w trong khung nhìn: { left, top, H, total, split }, hoặc null khi không đặt được. */
function frameOf(w) {
  var wrap = wrapOf(w), wr = wrap.getBoundingClientRect(), split = isSplit(), cl = cornerLimits(wrap);
  var top = Math.max(wr.top + GAP, barBottom() + GAP, cl.top);
  var bot = Math.min(wr.bottom - GAP, dockTop() - GAP, window.innerHeight - GAP, cl.bot);
  if (bot - top < MIN_H) return null;
  var sbw = split ? wrap.offsetWidth - wrap.clientWidth : 0;
  return { left: wr.right - sbw - strips[w].getBoundingClientRect().width - 2, top: top, H: bot - top, total: wrap.scrollHeight, split: split, wr: wr };
}
/* Phần nội dung của khung đang thấy: { scroll, view } theo toạ độ nội dung. */
function seen(w, f) {
  var wrap = wrapOf(w);
  if (f.split) return { scroll: wrap.scrollTop, view: wrap.clientHeight };
  var wr = wrap.getBoundingClientRect(), a = Math.max(0, Math.min(f.total, barBottom() - wr.top)), b = Math.max(a, Math.min(f.total, window.innerHeight - wr.top));
  return { scroll: a, view: b - a };
}
function thumbOf(w) { return strips[w].querySelector('.ma-mm__view'); }
function placeView(w, f) {
  var s = seen(w, f), v = mmView(s.scroll, s.view, f.total, f.H, VIEW_MIN), box = thumbOf(w);
  box.style.top = v.y + 'px'; box.style.height = v.h + 'px';
}
function place(w, f) {
  var st = strips[w].style;
  st.left = snapPos(f.left) + 'px'; st.top = snapPos(f.top) + 'px'; st.height = snapPos(f.H) + 'px';
}

/* Vẽ lại cả hai dải: gọi sau mỗi lần xếp làn (ui/review.js layoutLanes). */
export function drawMinimap() {
  if (!strips.src) return;
  var r = rvState(), g = laneGeo(), sg = {};
  sugIdx(r).forEach(function (i) { sg[i] = true; });
  sizeStrips();
  ['src', 'md'].forEach(function (w) {
    var el = strips[w], gw = g[w] || [], wrap = wrapOf(w);
    var ok = view !== 'edit' && !!S.text && !mqPhone.matches && shown(rootOf(w)) && gw.length > 0;
    el.hidden = !ok;
    var f = ok ? frameOf(w) : null;
    frames[w] = f;
    if (!f) { el.hidden = true; return; }
    place(w, f);
    var items = gw.map(function (e) {
      var s = r.res.state[e.i];
      return { top: e.top, bottom: e.bottom, state: s !== 'done' && sg[e.i] ? 'sug' : s };
    });
    var segs = mmSegments(items, f.total, f.H, SEG_MIN, 1).map(function (s) {
      var n = h('i', { class: 'ma-mm__s is-' + s.state });
      n.style.cssText = 'top:' + s.y.toFixed(1) + 'px;height:' + s.h.toFixed(1) + 'px';
      return n;
    });
    /* Chấm nhận xét: đỉnh của <mark> đầu tiên mỗi nhận xét trong khung. */
    var off = f.wr.top - wrap.scrollTop, ys = [], seenId = {};
    rootOf(w).querySelectorAll('mark.ma-hl').forEach(function (m) {
      var id = m.dataset.ids;
      if (seenId[id]) return;
      seenId[id] = true;
      ys.push(m.getBoundingClientRect().top - off);
    });
    var dots = mmDots(ys, f.total, f.H, DOT_GAP).map(function (y) {
      var n = h('b', { class: 'ma-mm__dot' });
      n.style.top = y.toFixed(1) + 'px';
      return n;
    });
    var lane = el.querySelector('.ma-mm__in'), col = el.querySelector('.ma-mm__col');
    lane.replaceChildren.apply(lane, segs);
    col.replaceChildren.apply(col, [thumbOf(w)].concat(dots));
    placeView(w, f);
  });
}
/* Cuộn: chỉ dời hộp khung nhìn; chế độ cuộn cửa sổ thì khung của dải cũng đổi (đỉnh khung trượt dưới thanh trên), cao
   đổi thì vẽ lại. */
var raf = 0;
function onScroll() {
  if (raf) return;
  raf = requestAnimationFrame(function () {
    raf = 0;
    var redraw = false;
    ['src', 'md'].forEach(function (w) {
      var f = frames[w];
      if (!f || strips[w].hidden) return;
      if (!f.split) {
        var nf = frameOf(w);
        if (!nf || Math.abs(nf.H - f.H) > 0.5 || Math.abs(nf.left - f.left) > 0.5) { redraw = true; return; }
        frames[w] = f = nf; place(w, f);
      }
      placeView(w, f);
    });
    if (redraw) drawMinimap();
  });
}
/* Bấm / kéo: điểm ấy của nội dung vào giữa khung nhìn, ngay (không trượt), để kéo theo kịp con trỏ. Bấm trúng con trượt
   thì giữ chỗ nắm (grab): kéo như thanh cuộn thường, không giật. */
var grab = 0;
function scrollAt(w, clientY) {
  var f = frames[w];
  if (!f) return;
  noteJump();
  var s = seen(w, f), target = mmScroll(clientY - f.top, f.H, f.total, s.view);
  if (f.split) { wrapOf(w).scrollTop = target; return; }
  window.scrollTo(0, window.scrollY + f.wr.top + target - Math.max(0, barBottom()));
}
export function initMinimap() {
  ['src', 'md'].forEach(function (w) {
    var el = h('div', { class: 'ma-mm', 'data-w': w, 'aria-hidden': 'true', hidden: true, title: 'Review progress. Click or drag to scroll' },
      h('div', { class: 'ma-mm__col' }, h('div', { class: 'ma-mm__view' })), h('div', { class: 'ma-mm__in' }));
    strips[w] = el;
    document.body.append(el);
    el.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      e.preventDefault();   // không bắt đầu bôi đen, không lấy focus
      el.setPointerCapture(e.pointerId);
      el.classList.add('is-drag');
      var t = thumbOf(w).getBoundingClientRect();
      grab = e.clientY >= t.top && e.clientY <= t.bottom ? e.clientY - (t.top + t.height / 2) : 0;
      scrollAt(w, e.clientY - grab);
    });
    el.addEventListener('pointermove', function (e) { if (el.hasPointerCapture(e.pointerId)) scrollAt(w, e.clientY - grab); });
    function end(e) { if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId); el.classList.remove('is-drag'); }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    wrapOf(w).addEventListener('scroll', onScroll, { passive: true });
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  mqPhone.addEventListener('change', drawMinimap);
}
