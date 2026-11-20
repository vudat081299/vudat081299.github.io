/* Thanh trên ở điện thoại (≤ 720px): nút More (#btn-more) mở menu #bar-menu gồm các nút ẩn trên thanh (.ma-bar__opt:
   New session, theme) và Shortcuts. Mỗi mục bấm nút thật của nó (data-for): việc vẫn chỉ ở một chỗ. Menu theo mẫu menu
   button của WAI-ARIA: Enter / Space / ↓ mở và vào mục đầu, ↑ vào mục cuối; ↑ ↓ Home End trong menu; Esc, Tab, chạm ngoài
   thì đóng (Esc, Tab trả focus về nút). Mở bằng chạm / chuột thì focus ở khung menu, chưa tô mục nào. Mũi tên, Home, End
   bật vòng focus như Tab (MDAN-020).
   Thanh trên tự ẩn (MDAN-051) ở điện thoại dọc (≤ 720px) và nằm ngang thấp (cao ≤ 500px, cảm ứng): cuộn xuống quá AWAY_PX thì
   trượt lên khuất (.is-away), cuộn lên quá BACK_PX thì về; luôn hiện ở đầu trang, khi menu hay hộp thoại mở, khi focus ở trong nó.
   Xuất: initBar.
   Dùng: ui/dom.js. */
import { $ } from './dom.js';

var mqPhone = window.matchMedia('(max-width: 720px)');
var mqAway = window.matchMedia('(max-width: 720px), (max-height: 500px) and (pointer: coarse)');
var menu, btn, bar;
var AWAY_PX = 8, BACK_PX = 24, lastY = 0, run = 0;   // run: quãng cuộn liên tục cùng chiều (dương: xuống)

function items() { return Array.prototype.slice.call(menu.querySelectorAll('.ma-menu__i')); }
function isOpen() { return menu.classList.contains('is-open'); }
function place() {
  var r = btn.getBoundingClientRect(), w = menu.offsetWidth, pad = 8;
  menu.style.left = Math.max(pad, Math.min(window.innerWidth - w - pad, r.right - w)) + 'px';
  menu.style.top = Math.round(r.bottom + 4) + 'px';
}
/* at: 'first' | 'last' | null (focus ở khung menu). */
function open(at) {
  $('bar-theme').textContent = document.documentElement.classList.contains('dark') ? 'Light theme' : 'Dark theme';
  menu.classList.add('is-open');
  if (menu.showPopover) { try { menu.showPopover(); } catch (e) {} }
  btn.setAttribute('aria-expanded', 'true');
  place();
  var its = items();
  (at === 'first' ? its[0] : at === 'last' ? its[its.length - 1] : menu).focus();
}
function close(refocus) {
  if (!isOpen()) return;
  menu.classList.remove('is-open');
  if (menu.hidePopover) { try { menu.hidePopover(); } catch (e) {} }
  btn.setAttribute('aria-expanded', 'false');
  if (refocus) btn.focus();
}
function kbd() { document.documentElement.classList.add('ma-tabbing'); }
function menuKey(e) {
  var its = items(), i = its.indexOf(document.activeElement), k = e.key;
  if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Home' || k === 'End') kbd();
  if (k === 'ArrowDown') its[(i + 1) % its.length].focus();
  else if (k === 'ArrowUp') its[i < 0 ? its.length - 1 : (i - 1 + its.length) % its.length].focus();
  else if (k === 'Home') its[0].focus();
  else if (k === 'End') its[its.length - 1].focus();
  else if (k === 'Escape' || k === 'Tab') close(true);
  else return;
  e.preventDefault(); e.stopPropagation();
}

function setAway(on) { bar.classList.toggle('is-away', on); }
function mustShow() {
  return !mqAway.matches || window.scrollY <= bar.offsetHeight || isOpen() || !!document.querySelector('dialog[open]') || bar.contains(document.activeElement);
}
function onScroll() {
  var y = window.scrollY, dy = y - lastY;
  lastY = y;
  if (mustShow()) { run = 0; setAway(false); return; }
  run = (dy > 0) === (run > 0) ? run + dy : dy;
  if (run > AWAY_PX) setAway(true);
  else if (run < -BACK_PX) setAway(false);
}

export function initBar() {
  menu = $('bar-menu'); btn = $('btn-more'); bar = document.querySelector('.ma-bar');
  lastY = window.scrollY;
  window.addEventListener('scroll', onScroll, { passive: true });
  bar.addEventListener('focusin', function () { setAway(false); });
  mqAway.addEventListener('change', function () { if (mustShow()) setAway(false); });
  document.querySelectorAll('dialog').forEach(function (d) {
    new MutationObserver(function () { if (d.open) setAway(false); }).observe(d, { attributes: true, attributeFilter: ['open'] });
  });
  if (menu.showPopover) menu.setAttribute('popover', 'manual');
  btn.addEventListener('click', function (e) {
    if (isOpen()) close(false);
    else open(e.detail === 0 ? 'first' : null);   // detail 0: Enter / Space trên nút
  });
  btn.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault(); kbd();
    open(e.key === 'ArrowDown' ? 'first' : 'last');
  });
  menu.addEventListener('keydown', menuKey);
  items().forEach(function (it) {
    it.addEventListener('click', function () {
      close(true);   // trước khi bấm: hộp thoại mở từ mục trả focus về #btn-more khi đóng
      $(it.dataset.for).click();
    });
  });
  document.addEventListener('pointerdown', function (e) {
    if (isOpen() && !menu.contains(e.target) && !btn.contains(e.target)) close(false);
  }, true);
  window.addEventListener('scroll', function () { close(false); }, { passive: true });
  window.addEventListener('resize', function () { if (isOpen()) { if (mqPhone.matches) place(); else close(false); } });
}
