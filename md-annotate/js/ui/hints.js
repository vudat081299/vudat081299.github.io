/* Gợi ý nhận xét, phần trình duyệt: số đếm lưu ở localStorage, nạp gợi ý mặc định từ data/hints.json, hộp Hints.
   Logic đếm và xếp hạng ở core/hints.js.
   Xuất: initHints, loadDefaultHints, recordUse, renderHintsDlg, seedState, stats.
   Dùng: core/text.js, core/hints.js, ui/store.js, ui/dom.js. */
import { plural } from '../core/text.js';
import { countUse, hideHint, migrateHints, MIN_PCT, normStats, pct, pinHint, rankedHints, resetHints, seedHints } from '../core/hints.js';
import { KEY, store } from './store.js';
import { $, h, icon } from './dom.js';

export var stats = normStats(store.get(KEY.stats, null));
export var seedState = 'loading';
function saveStats() { store.set(KEY.stats, stats); }
/* Đếm một lần dùng nhận xét t và lưu. */
export function recordUse(t) { if (countUse(stats, t)) saveStats(); }

/* Nạp gợi ý mặc định (đổi chữ theo renamed, rồi gieo); lỗi mạng thì seedState = 'fail'. Trả promise để người gọi vẽ lại. */
export function loadDefaultHints() {
  return fetch('data/hints.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (d) {
      if (d && d.renamed && typeof d.renamed === 'object') migrateHints(stats, d.renamed);
      seedHints(stats, Array.isArray(d && d.hints) ? d.hints.filter(function (x) { return typeof x === 'string' && x.trim(); }) : []);
      saveStats();
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
        h('span', { class: 'ma-row__t' }, x.t),
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
