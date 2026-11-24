/* Gợi ý nhận xét, phần trình duyệt: số đếm lưu ở localStorage, nạp gợi ý mặc định và chữ của gợi ý ẩn Mod + 1 (removeHint)
   từ data/hints.json, hộp Hints, chữ của một gợi ý (hintSpan: gợi ý dài hiện 80 ký tự đầu, đuôi mờ dần; MDAN-087).
   Logic đếm và xếp hạng ở core/hints.js.
   Xuất: hintSpan, initHints, loadDefaultHints, recordUse, removeHint, renderHintsDlg, seedState, stats.
   Dùng: core/text.js, core/hints.js, ui/store.js, ui/dom.js. */
import { plural } from '../core/text.js';
import { countUse, hideHint, hintShown, migrateHints, MIN_PCT, normStats, pct, pinHint, rankedHints, resetHints, seedHints } from '../core/hints.js';
import { KEY, store } from './store.js';
import { $, getJSON, h, icon } from './dom.js';

export var stats = normStats(store.get(KEY.stats, null));
export var seedState = 'loading';
export var removeHint = '';   // nhận xét Mod + 1 lưu (remove của data/hints.json); rỗng khi chưa nạp / nạp hỏng: phím không lưu gì
function saveStats() { store.set(KEY.stats, stats); }
/* Đếm một lần dùng nhận xét t và lưu. */
export function recordUse(t) { if (countUse(stats, t)) saveStats(); }
/* Chữ của gợi ý t trong span lớp cls: tối đa 80 ký tự đầu; đã cắt thì thêm is-cut (CSS cho đuôi mờ dần), title chữ trọn
   khi tip (chip đặt chữ trọn vào title của nút, cạnh số lần dùng). */
export function hintSpan(t, cls, tip) {
  var s = hintShown(t);
  return h('span', { class: cls + (s.cut ? ' is-cut' : ''), title: s.cut && tip ? t : null }, s.text);
}

/* Nạp gợi ý mặc định (đổi chữ theo renamed, rồi gieo) và removeHint; lỗi mạng thì seedState = 'fail'. Trả promise để người gọi vẽ lại. */
export function loadDefaultHints() {
  return getJSON('data/hints.json')
    .then(function (d) {
      if (d && d.renamed && typeof d.renamed === 'object') migrateHints(stats, d.renamed);
      seedHints(stats, Array.isArray(d && d.hints) ? d.hints.filter(function (x) { return typeof x === 'string' && x.trim(); }) : []);
      saveStats();
      removeHint = typeof (d && d.remove) === 'string' ? d.remove.trim() : '';
      seedState = 'ok';
    })
    .catch(function () { seedState = 'fail'; });
}

/* Hộp quản lý gợi ý */
export function renderHintsDlg() {
  var ol = $('hints-list');
  ol.replaceChildren();
  var list = rankedHints(stats);
  if (!list.length) ol.append(h('li', { class: 'ma-sub' }, 'No hints yet.'));
  list.forEach(function (x) {
    ol.append(h('li', { class: 'ma-row' },
      h('span', { class: 'ma-row__main ma-row__main--static' },
        hintSpan(x.t, 'ma-row__t', true),
        h('span', { class: 'ma-row__m' }, plural(x.n, 'use') + (list.total >= MIN_PCT ? ' · ' + pct(x.p) : ''))),
      h('button', { class: 'ma-icbtn ma-icbtn--bare', type: 'button', 'aria-label': 'Remove hint ' + x.t, title: 'Remove hint',
        onclick: function () { hideHint(stats, x.key); saveStats(); renderHintsDlg(); } }, icon('x'))));
  });
  var note = $('hints-seed-note');
  note.hidden = seedState !== 'fail';
  note.textContent = 'The default hints (data/hints.json) could not load.';
}

export function initHints() {
  $('btn-hints').addEventListener('click', function () { renderHintsDlg(); $('dlg-hints').showModal(); });
  $('hint-add').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!pinHint(stats, $('hint-add-in').value.trim())) return;
    saveStats(); $('hint-add-in').value = ''; renderHintsDlg();
  });
  $('hints-reset').addEventListener('click', function () {
    if (!window.confirm('Reset usage counts and restore every default hint? Hints you added will be removed.')) return;
    resetHints(stats);
    saveStats(); renderHintsDlg();
  });
}
