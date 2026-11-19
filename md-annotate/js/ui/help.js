/* Hộp Shortcuts (#dlg-keys): bảng phím tắt và cú bấm mới, đọc từ data/shortcuts.json (REPO-001) lần mở đầu, vẽ bằng
   vòng lặp, phím là chip <kbd class="ma-key">. Mở bằng nút #btn-keys ở hộp Settings, hoặc phím ? khi không gõ trong ô
   nhập và không có hộp thoại nào mở. Logic chuẩn hoá dữ liệu ở core/shortcuts.js.
   Xuất: initHelp.
   Dùng: core/shortcuts.js, ui/dom.js. */
import { normShortcuts } from '../core/shortcuts.js';
import { $, h } from './dom.js';

var loaded = null;   // promise nạp dữ liệu: nạp một lần, lỗi thì lần mở sau thử lại

function chips(keys) {
  var out = [];
  keys.forEach(function (c, i) {
    if (i) out.push(h('span', { class: 'ma-keys__or' }, ' / '));
    var one = h('span', { class: 'ma-keys__c' });   // một cách bấm không xuống dòng giữa chừng
    c.forEach(function (k, j) {
      if (j) one.append(h('span', { class: 'ma-keys__or' }, ' + '));
      one.append(h('kbd', { class: 'ma-key' }, k));
    });
    out.push(one);
  });
  return out;
}
function render(groups) {
  var box = $('keys-list');
  box.replaceChildren();
  groups.forEach(function (g) {
    var dl = h('dl', { class: 'ma-keys__l' });
    g.rows.forEach(function (r) { dl.append(h('dt', null, chips(r.keys)), h('dd', null, r.action)); });
    box.append(h('section', { class: 'ma-keys' },
      h('h3', { class: 'ma-keys__h' }, g.title),
      g.note ? h('p', { class: 'ma-sub' }, g.note) : null,
      dl));
  });
  if (!groups.length) box.append(h('p', { class: 'ma-sub' }, 'No shortcuts listed.'));
}
function load() {
  if (!loaded) {
    $('keys-list').replaceChildren(h('p', { class: 'ma-sub' }, 'Loading…'));
    loaded = fetch('data/shortcuts.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) { render(normShortcuts(d)); })
      .catch(function () {
        loaded = null;
        $('keys-list').replaceChildren(h('p', { class: 'ma-sub' }, 'The list could not load. Check the connection and open it again.'));
      });
  }
}
function openHelp() {
  load();
  if (!$('dlg-keys').open) $('dlg-keys').showModal();
}
function typing(t) {
  return !!(t && t.closest && t.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])'));
}

export function initHelp() {
  $('btn-keys').addEventListener('click', openHelp);
  document.addEventListener('keydown', function (e) {
    if (e.key !== '?' || e.ctrlKey || e.metaKey || e.altKey || e.isComposing || typing(e.target)) return;
    if (document.querySelector('dialog[open]')) return;
    e.preventDefault();
    openHelp();
  });
}
