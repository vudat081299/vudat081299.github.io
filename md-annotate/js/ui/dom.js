/* Tiện ích DOM: $(id), h() dựng phần tử, icon(), textNodes(), media query dùng chung, shown(), typing() (phím tắt
   một chữ), dragBar() (kéo vách), toast(), paintHL() (tô CSS Highlight).
   Xuất: $, dragBar, h, hasHL, icon, mqSheet, mqSide, paintHL, reduceMotion, shown, textNodes, toast, typing.
   Dùng: không module nào. */

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
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3'
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
export var mqSheet = window.matchMedia('(max-width: 720px), (pointer: coarse)');
export var mqSide = window.matchMedia('(min-width: 1081px)');
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
var toastTimer = null;
export function toast(msg, action) {
  var t = $('toast');
  var host = document.querySelector('dialog[open]') || document.body;
  if (t.parentNode !== host) host.append(t);
  t.replaceChildren(h('span', null, msg));
  if (action) t.append(h('button', { class: 'ma-toast__btn', type: 'button', onclick: function () { t.hidden = true; action.fn(); } }, action.label));
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.hidden = true; }, action ? 6000 : 2800);
}
