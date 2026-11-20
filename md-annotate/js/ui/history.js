/* Hộp History: danh sách phiên đã lưu, mở, đổi tên, xoá; số phiên trên nút.
   Xuất: initHistory, renderHistCount.
   Dùng: core/text.js, core/session.js, ui/store.js, ui/dom.js, ui/state.js, ui/editor.js, ui/files.js. */
import { plural } from '../core/text.js';
import { indexWithout, renameIndex, renameSession } from '../core/session.js';
import { KEY, store } from './store.js';
import { $, h, icon, toast } from './dom.js';
import { flushSave, loadIndex, loadSession, newSession, replaceDeleted, S, saveNow, switchTo } from './state.js';
import { syncInputs } from './editor.js';
import { refreshTree } from './files.js';

var dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export function renderHistCount() {
  var n = loadIndex().length;
  $('hist-n').textContent = n ? String(n) : '';
}
function renderHist() {
  var ol = $('hist-list');
  ol.replaceChildren();
  var idx = loadIndex();
  if (!idx.length) ol.append(h('li', { class: 'ma-sub' }, 'No sessions yet. Sessions with text appear here automatically.'));
  idx.forEach(function (e) {
    var cur = e.id === S.id;
    var meta = dateFmt.format(new Date(e.updated)) + ' · ' + (e.files > 1 ? plural(e.files, 'file') + ' · ' : '') + plural(e.count || 0, 'comment') + ' · ' + (e.chars || 0).toLocaleString('en') + ' chars' + (e.rv != null ? ' · ' + e.rv + '% reviewed' : '') + (cur ? ' · open' : '');
    var main = h('button', {
      class: 'ma-row__main', type: 'button', title: cur ? 'Current session' : 'Open this session',
      onclick: function () {
        if (!cur) { var s = loadSession(e.id); if (s) switchTo(s); else toast('Could not read this session.'); }
        $('dlg-hist').close();
      }
    }, h('span', { class: 'ma-row__t' }, e.name || 'Untitled session'), h('span', { class: 'ma-row__m' }, meta));
    var row = h('li', { class: 'ma-row' + (cur ? ' is-cur' : '') }, main,
      h('button', { class: 'ma-icbtn ma-icbtn--bare', type: 'button', 'aria-label': 'Rename', title: 'Rename',
        onclick: function () { renameRow(row, main, e); } }, icon('pencil')),
      h('button', { class: 'ma-icbtn ma-icbtn--bare', type: 'button', 'aria-label': 'Delete session', title: 'Delete',
        onclick: function () { deleteSession(e); } }, icon('trash')));
    ol.append(row);
  });
  $('hist-usage').textContent = 'Using about ' + Math.max(1, Math.round(store.bytes() / 1024)) + ' KB.';
}
function renameRow(row, main, e) {
  var input = h('input', { class: 'ma-input', type: 'text', value: e.name || '', 'aria-label': 'New session name' });
  var done = false;
  function commit(save) {
    if (done) return; done = true;
    var name = input.value.trim();
    if (save && name !== e.name) setSessionName(e.id, name);
    renderHist();
  }
  input.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') { ev.preventDefault(); commit(true); }
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); commit(false); }
  });
  input.addEventListener('blur', function () { commit(true); });
  row.replaceChild(input, main);
  input.focus(); input.select();
}
function setSessionName(id, name) {
  if (id === S.id) {
    renameSession(S, name);
    saveNow(); syncInputs(); refreshTree();
    return;
  }
  var s = loadSession(id);
  if (!s) return;
  renameSession(s, name);
  store.set(KEY.s(id), s);
  store.set(KEY.index, renameIndex(loadIndex(), id, s.name));
}
function deleteSession(e) {
  if (!window.confirm('Delete session "' + (e.name || 'untitled') + '" and all its comments?')) return;
  store.del(KEY.s(e.id));
  store.set(KEY.index, indexWithout(loadIndex(), e.id));
  if (e.id === S.id) {
    var rest = loadIndex(), next = rest.length ? loadSession(rest[0].id) : null;
    replaceDeleted(next || newSession(''));
  }
  renderHist(); renderHistCount();
}

export function initHistory() {
  $('btn-hist').addEventListener('click', function () { flushSave(); renderHist(); $('dlg-hist').showModal(); });
}
