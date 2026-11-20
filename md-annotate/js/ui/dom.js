/* Tiện ích DOM: $(id), h() dựng phần tử, icon(), textNodes(), media query dùng chung, shown(), typing() (phím tắt
   một chữ), dragBar() (kéo vách), toast(), paintHL() (tô CSS Highlight), saveFile() (tải một Blob về máy),
   droppedItems() (mục thả từ máy), syncBar() (màu thanh trình duyệt khi có lớp mờ).
   trackKeyboard() (bàn phím ảo che bao nhiêu: --kb, --vvh).
   Xuất: $, dragBar, droppedItems, h, hasHL, icon, mqSheet, mqSide, mqTouch, paintHL, placeToast, reduceMotion, saveFile, shown,
     syncBar, textNodes, toast, trackKeyboard, typing.
   Dùng: core/color.js. */
import { barColor } from '../core/color.js';

export function $(id) { return document.getElementById(id); }
export function h(tag, props) {
  var n = document.createElement(tag);
  if (props) Object.keys(props).forEach(function (k) {
    var v = props[k];
    if (v == null || v === false) return;
    if (k === 'class') n.className = v;
    else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  });
  for (var i = 2; i < arguments.length; i++) {
    var c = arguments[i];
    if (c == null || c === false) continue;
    if (Array.isArray(c)) c.forEach(function (x) { if (x != null && x !== false) n.append(x); });
    else n.append(c);
  }
  return n;
}
var PATHS = {
  pencil: 'M4 20h4L19 9l-4-4L4 16v4z',
  x: 'M6 6l12 12M18 6 6 18',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  /* Cây file (ui/tree.js) */
  chev: 'M9 6l6 6-6 6',
  file: 'M14 3H6v18h12V7l-4-4zM14 3v4h4',
  folder: 'M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2h8.5A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z',
  'folder-open': 'M3 17.5v-11A1.5 1.5 0 0 1 4.5 5H9l2 2h7.5A1.5 1.5 0 0 1 20 8.5V10M3 17.5 5.6 11h16l-2.6 8H4.5A1.5 1.5 0 0 1 3 17.5z',
  'file-plus': 'M14 3H6v18h12V7l-4-4zM14 3v4h4M12 11v6M9 14h6',
  'folder-plus': 'M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2h8.5A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5zM12 10v6M9 13h6',
  'folder-in': 'M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2h8.5A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5zM12 10v6M9 13l3 3 3-3',
  download: 'M12 4v11m-4-4 4 4 4-4M5 20h14',
  collapse: 'M7 4l5 5 5-5M7 20l5-5 5 5',
  dots: 'M5 11a1 1 0 1 0 0 2 1 1 0 1 0 0-2zM12 11a1 1 0 1 0 0 2 1 1 0 1 0 0-2zM19 11a1 1 0 1 0 0 2 1 1 0 1 0 0-2z',
  back: 'M15 6l-6 6 6 6'
};
export function icon(name) {
  var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true');
  var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', PATHS[name]); s.appendChild(p);
  return s;
}
export function textNodes(root) {
  var out = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n;
  while ((n = w.nextNode())) out.push(n);
  return out;
}
export var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
export var mqPhone = window.matchMedia('(max-width: 720px)');   // điện thoại: cây là tấm trượt, mặc định ẩn
export var mqSheet = window.matchMedia('(max-width: 720px), (pointer: coarse)');
export var mqSide = window.matchMedia('(min-width: 1081px)');
export var mqTouch = window.matchMedia('(pointer: coarse)');   // màn cảm ứng (con trỏ chính là ngón tay)
export var hasHL = !!(window.CSS && CSS.highlights && window.Highlight);
/* Tô CSS Highlight `name` bằng các Range (rỗng: bỏ tô). Mỗi tên giữ một Highlight trong registry, chỉ thay range: Safari
   không vẽ lại khi xoá Highlight khỏi registry, vết tô còn trên chữ. Đừng gọi CSS.highlights.set / delete ở chỗ khác. */
export function paintHL(name, ranges) {
  if (!hasHL) return;
  var hl = CSS.highlights.get(name);
  if (!hl) { hl = new Highlight(); CSS.highlights.set(name, hl); }
  hl.clear();
  ranges.forEach(function (r) { hl.add(r); });
}
export function shown(el) { return !!(el && el.getClientRects().length); }
/* Phần tử nhận phím là chỗ gõ chữ (ô nhập chữ, textarea, select, contenteditable): phím tắt một chữ (X, J, K, ?) bỏ qua.
   Checkbox, radio, thanh trượt không phải chỗ gõ: vừa bấm "Dim reviewed" thì X vẫn chạy. */
var NOT_TEXT = /^(?:checkbox|radio|range|button|submit|reset|file|color|image)$/;
export function typing(t) {
  if (!t || !t.closest) return false;
  if (t.isContentEditable || t.closest('textarea, select')) return true;
  return t.tagName === 'INPUT' && !NOT_TEXT.test(t.type);
}

/* Kéo một vách (chuột / bút / chạm) theo trục ngang: onMove(clientX) khi kéo, onDone() khi thả. */
export function dragBar(el, onMove, onDone) {
  el.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add('is-drag');
    var move = function (ev) { onMove(ev.clientX); };
    var up = function () {
      el.classList.remove('is-drag');
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      onDone();
    };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  });
}

/* Toast: một thông báo ngắn, tuỳ chọn một nút (VD Undo). Có hộp thoại mở thì nằm trong hộp thoại. */
var toastTimer = null, toastWatch = null;
export function toast(msg, action) {
  var t = $('toast');
  var host = document.querySelector('dialog[open]') || document.body;
  if (t.parentNode !== host) host.append(t);
  t.replaceChildren(h('span', null, msg));
  if (action) t.append(h('button', { class: 'ma-toast__btn', type: 'button', onclick: function () { t.hidden = true; action.fn(); } }, action.label));
  t.hidden = false;
  placeToast();
  if (!toastWatch) {   // tấm nhận xét, nút nổi, viên thuốc hiện / ẩn khi toast còn: xếp lại
    toastWatch = new MutationObserver(placeToast);
    STACK.forEach(function (id) { toastWatch.observe($(id), { attributes: true, attributeFilter: ['hidden', 'class'] }); });
    window.addEventListener('resize', placeToast);
  }
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.hidden = true; }, action ? 6000 : 2800);
}
/* Toast không che tấm nhận xét (ô chữ, Save), nút nổi, viên thuốc: nằm trên cái cao nhất trong số chúng đang hiện và
   chồng ngang với nó. Trong hộp thoại thì để CSS đặt. */
var STACK = ['pop', 'fab', 'rv-pill'];
export function placeToast() {
  var t = $('toast');
  t.style.bottom = '';
  if (t.hidden || t.parentNode !== document.body) return;
  var tr = t.getBoundingClientRect(), vh = window.innerHeight, lift = 0;
  STACK.forEach(function (id) {
    var el = $(id);
    if (!shown(el) || (id === 'pop' && !el.classList.contains('is-sheet'))) return;
    var r = el.getBoundingClientRect();
    if (r.right > tr.left && r.left < tr.right && r.top < tr.bottom) lift = Math.max(lift, vh - r.top + 8);
  });
  if (lift) t.style.bottom = Math.round(lift) + 'px';
}

/* Bàn phím ảo: Chrome Android co khung nhìn (interactive-widget=resizes-content ở thẻ viewport), iOS Safari thì không, chỉ
   visualViewport co lại. --kb: phần khung nhìn bàn phím che (px), --vvh: chiều cao còn lại; mobile.css nâng tấm đáy, hộp thoại,
   toast lên trên bàn phím. Đang phóng to (scale ≠ 1) thì visualViewport co vì phóng to, không phải vì bàn phím: bỏ qua. */
export function trackKeyboard() {
  var vv = window.visualViewport;
  if (!vv) return;
  var set = function () {
    var kb = Math.abs(vv.scale - 1) < 0.01 ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) : 0;
    var st = document.documentElement.style;
    st.setProperty('--kb', kb + 'px');
    st.setProperty('--vvh', Math.round(vv.height) + 'px');
    placeToast();
  };
  vv.addEventListener('resize', set);
  vv.addEventListener('scroll', set);
  set();
}

/* Tải data (Blob) về máy với tên name: link tạm có download, bấm, thu hồi URL sau một giây. */
export function saveFile(data, name) {
  var url = URL.createObjectURL(data);
  var a = h('a', { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

/* Mục thả từ máy: FileSystemEntry (đọc được folder) khi trình duyệt có, không thì File. Gọi ngay trong sự kiện drop:
   dataTransfer hết hạn sau đó. */
export function droppedItems(dt) {
  var out = [];
  if (dt.items && dt.items.length && dt.items[0].webkitGetAsEntry) {
    for (var i = 0; i < dt.items.length; i++) {
      var en = dt.items[i].kind === 'file' ? dt.items[i].webkitGetAsEntry() : null;
      if (en) out.push(en);
    }
    if (out.length) return out;
  }
  return Array.prototype.slice.call(dt.files || []);
}

/* <meta name="theme-color"> (Chrome Android, Safari cũ tô thanh trạng thái theo nó): nền trang, phủ mọi lớp mờ đang hiện
   (hộp thoại mở, .ma-scrim không ẩn), trộn đục. Gọi mỗi khi một lớp mờ hiện / ẩn và khi đổi theme; một chỗ duy nhất ghi thẻ này
   sau script theme của index.html. */
export function syncBar() {
  var layers = [];
  document.querySelectorAll('dialog[open], .ma-scrim:not([hidden])').forEach(function (el) { layers.push(getComputedStyle(el).backgroundColor); });
  var c = barColor(getComputedStyle(document.documentElement).backgroundColor, layers);
  if (c) $('theme-color').setAttribute('content', c);
  lockScroll(layers.length > 0);
}
/* Có lớp mờ thì trang sau nó không cuộn (html.ma-lock, mobile.css); chỗ cuộn giữ nguyên nên đóng lớp không nhảy. Trang đang có
   thanh cuộn chiếm chỗ (máy tính) thì giữ rãnh của nó (ma-lock-g), để chữ không xô ngang. */
function lockScroll(on) {
  var de = document.documentElement;
  if (on === de.classList.contains('ma-lock')) return;
  if (on) de.classList.toggle('ma-lock-g', window.innerWidth > de.clientWidth);
  de.classList.toggle('ma-lock', on);
}
