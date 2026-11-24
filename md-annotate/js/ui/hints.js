/* Gợi ý nhận xét, phần trình duyệt: số đếm của phiên đang mở (S.hints, lưu cùng phiên; mỗi phiên một bộ, MDAN-088),
   nạp gợi ý mặc định và chữ của gợi ý ẩn Mod + 1 (removeHint) từ data/hints.json, gieo chúng vào số đếm của phiên khi
   đọc lần đầu (hintStats), hộp Hints, chữ của một gợi ý (hintSpan: gợi ý dài hiện 80 ký tự đầu; markOver: chữ tràn hộp;
   cả hai đuôi mờ dần, không "…"; MDAN-087). Logic đếm và xếp hạng ở core/hints.js. Khoá chung cũ stats:v1 bị xoá lúc nạp.
   Xuất: hintSpan, hintStats, initHints, loadDefaultHints, markOver, recordUse, removeHint, renderHintsDlg, seedState.
   Dùng: core/text.js, core/hints.js, ui/store.js, ui/dom.js, ui/state.js. */
import { plural } from '../core/text.js';
import { countUse, dropBuilt, hideHint, hintShown, migrateHints, MIN_PCT, pct, pinHint, rankedHints, resetHints, seedHints } from '../core/hints.js';
import { KEY, store } from './store.js';
import { $, getJSON, h, icon } from './dom.js';
import { S, scheduleSave } from './state.js';

export var seedState = 'loading';
export var removeHint = '';   // nhận xét Mod + 1 lưu (remove của data/hints.json); rỗng khi chưa nạp / nạp hỏng: phím không lưu gì
var defaults = null;          // { list, renamed } của data/hints.json khi đã nạp
var seeded = new WeakSet();   // số đếm đã gieo gợi ý mặc định trong lần nạp trang này
/* Số đếm gợi ý của phiên đang mở; gợi ý mặc định đã nạp thì gieo vào (một lần mỗi bộ; lưu theo lần lưu phiên kế). */
export function hintStats() {
  var st = S.hints;
  if (defaults && !seeded.has(st)) {
    seeded.add(st);
    migrateHints(st, defaults.renamed);
    seedHints(st, defaults.list);
    dropBuilt(st, removeHint);
  }
  return st;
}
/* Đếm một lần dùng nhận xét t vào phiên đang mở. */
export function recordUse(t) { if (countUse(hintStats(), t)) scheduleSave(); }
/* Chữ của gợi ý t trong span lớp cls: tối đa 80 ký tự đầu; đã cắt thì thêm is-cut (CSS cho đuôi mờ dần), title chữ trọn
   khi tip (chip đặt chữ trọn vào title của nút, cạnh số lần dùng). */
export function hintSpan(t, cls, tip) {
  var s = hintShown(t);
  return h('span', { class: cls + (s.cut ? ' is-cut' : ''), title: s.cut && tip ? t : null }, s.text);
}
/* Chữ gợi ý (sel) trong box tràn khỏi hộp của nó: is-over (CSS: đuôi mờ dần như is-cut). Đo ngay, và lại khi box đổi bề rộng
   (khung nhìn đổi, box từ ẩn thành hiện như hộp Hints vừa mở); cao đổi (vùng chip trượt) không đo lại. */
var watched = new WeakSet();
export function markOver(box, sel) {
  box.querySelectorAll(sel).forEach(function (t) { t.classList.toggle('is-over', t.scrollWidth > t.clientWidth); });
  if (watched.has(box) || typeof ResizeObserver === 'undefined') return;
  watched.add(box);
  var w = box.clientWidth;
  new ResizeObserver(function () { if (box.clientWidth !== w) { w = box.clientWidth; markOver(box, sel); } }).observe(box);
}

/* Nạp gợi ý mặc định (đổi chữ theo renamed rồi gieo, ở hintStats) và removeHint; lỗi mạng thì seedState = 'fail'. Trả
   promise để người gọi vẽ lại. */
export function loadDefaultHints() {
  return getJSON('data/hints.json')
    .then(function (d) {
      defaults = {
        renamed: d && d.renamed && typeof d.renamed === 'object' ? d.renamed : {},
        list: Array.isArray(d && d.hints) ? d.hints.filter(function (x) { return typeof x === 'string' && x.trim(); }) : []
      };
      removeHint = typeof (d && d.remove) === 'string' ? d.remove.trim() : '';
      seedState = 'ok';
    })
    .catch(function () { seedState = 'fail'; });
}

/* Hộp quản lý gợi ý */
export function renderHintsDlg() {
  var ol = $('hints-list');
  ol.replaceChildren();
  var stats = hintStats(), list = rankedHints(stats);
  if (!list.length) ol.append(h('li', { class: 'ma-sub' }, 'No hints yet.'));
  list.forEach(function (x) {
    ol.append(h('li', { class: 'ma-row' },
      h('span', { class: 'ma-row__main ma-row__main--static' },
        hintSpan(x.t, 'ma-row__t', true),
        h('span', { class: 'ma-row__m' }, plural(x.n, 'use') + (list.total >= MIN_PCT ? ' · ' + pct(x.p) : ''))),
      h('button', { class: 'ma-icbtn ma-icbtn--bare', type: 'button', 'aria-label': 'Remove hint ' + x.t, title: 'Remove hint',
        onclick: function () { hideHint(stats, x.key); scheduleSave(); renderHintsDlg(); } }, icon('x'))));
  });
  markOver(ol, '.ma-row__t');   // hộp đang đóng thì chưa đo được: mở ra là bề rộng đổi, markOver đo lại
  var note = $('hints-seed-note');
  note.hidden = seedState !== 'fail';
  note.textContent = 'The default hints (data/hints.json) could not load.';
}

export function initHints() {
  store.del(KEY.oldStats);   // số đếm chung của mọi phiên (trước MDAN-088): không chép sang phiên nào
  $('btn-hints').addEventListener('click', function () { renderHintsDlg(); $('dlg-hints').showModal(); });
  $('hint-add').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!pinHint(hintStats(), $('hint-add-in').value.trim())) return;
    scheduleSave(); $('hint-add-in').value = ''; renderHintsDlg();
  });
  $('hints-reset').addEventListener('click', function () {
    if (!window.confirm('Reset usage counts and restore every default hint in this session? Hints you added here will be removed.')) return;
    resetHints(hintStats());
    scheduleSave(); renderHintsDlg();
  });
}
