/* Hộp Help (#dlg-keys): hai phần, mỗi phần một bảng hàng { cách bấm / mẫu, nghĩa } đọc từ data/ (REPO-001) lần mở đầu và
   vẽ bằng cùng một vòng lặp, cách bấm là chip <kbd class="ma-key">, mẫu để gõ (nhóm "code") là <code>: phím tắt và cú bấm
   mới (data/shortcuts.json), tìm file ở cây (data/search-help.json, mẫu của ô lọc). Mở bằng nút #btn-keys ở hộp Settings, hoặc phím ? khi không gõ trong ô
   nhập và không có hộp thoại nào mở. Logic chuẩn hoá dữ liệu ở core/shortcuts.js.
   Xuất: initHelp.
   Dùng: core/shortcuts.js, ui/dom.js. */
import { normShortcuts } from '../core/shortcuts.js';
import { $, h, typing } from './dom.js';

var PARTS = [['keys-list', 'data/shortcuts.json'], ['find-help-list', 'data/search-help.json']];   // [chỗ vẽ, dữ liệu]
var loaded = {};   // id chỗ vẽ → promise nạp: nạp một lần, lỗi thì lần mở sau thử lại

function chips(keys, code) {
  var out = [];
  keys.forEach(function (c, i) {
    if (i) out.push(h('span', { class: 'ma-keys__or' }, ' / '));
    var one = h('span', { class: 'ma-keys__c' });   // một cách bấm không xuống dòng giữa chừng
    c.forEach(function (k, j) {
      if (j) one.append(h('span', { class: 'ma-keys__or' }, ' + '));
      one.append(code ? h('code', null, k) : h('kbd', { class: 'ma-key' }, k));
    });
    out.push(one);
  });
  return out;
}
function render(box, groups) {
  box.replaceChildren();
  groups.forEach(function (g) {
    var dl = h('dl', { class: 'ma-keys__l' });
    g.rows.forEach(function (r) { dl.append(h('dt', null, chips(r.keys, g.code)), h('dd', null, r.action)); });
    box.append(h('section', { class: 'ma-keys' },
      h('h4', { class: 'ma-keys__h' }, g.title),
      g.note ? h('p', { class: 'ma-sub' }, g.note) : null,
      dl));
  });
  if (!groups.length) box.append(h('p', { class: 'ma-sub' }, 'Nothing listed.'));
}
function load(id, url) {
  if (loaded[id]) return;
  var box = $(id);
  box.replaceChildren(h('p', { class: 'ma-sub' }, 'Loading…'));
  loaded[id] = fetch(url, { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (d) { render(box, normShortcuts(d)); })
    .catch(function () {
      loaded[id] = null;
      box.replaceChildren(h('p', { class: 'ma-sub' }, 'This part could not load. Check the connection and open Help again.'));
    });
}
function openHelp() {
  PARTS.forEach(function (p) { load(p[0], p[1]); });
  if (!$('dlg-keys').open) $('dlg-keys').showModal();
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
