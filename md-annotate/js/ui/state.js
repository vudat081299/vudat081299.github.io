/* Phiên đang mở (S): đọc / ghi localStorage, lưu (hẹn giờ 300ms), chuyển phiên. S chỉ gán lại qua switchTo() /
   replaceDeleted(). Mô hình phiên (tạo, chuẩn hoá, tên tự đặt) ở core/session.js.
   Xuất: flushSave, initState, loadIndex, loadSession, newSession, replaceDeleted, S, saveClosed, saveNow,
     scheduleSave, switchTo.
   Dùng: core/session.js, ui/store.js, ui/dom.js, ui/render.js, ui/views.js, ui/popup.js, ui/history.js,
     ui/editor.js. */
import { createSession, indexWith, isEmpty, normIndex, normSession, touchSession } from '../core/session.js';
import { KEY, prefs, store } from './store.js';
import { $, toast } from './dom.js';
import { renderAll } from './render.js';
import { lastRead, setView, view } from './views.js';
import { closePop } from './popup.js';
import { renderHistCount } from './history.js';
import { syncInputs } from './editor.js';

export function newSession(text) { return createSession(text, prefs); }
export function loadSession(id) { return normSession(store.get(KEY.s(id), null), id); }
export function loadIndex() { return normIndex(store.get(KEY.index, [])); }

export var S = (function () {
  var cur = store.get(KEY.cur, null);
  return (cur && loadSession(cur)) || newSession('');
})();

/* LƯU PHIÊN */
var saveTimer = null, warnedQuota = false;
export function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 300); }
export function saveNow() {
  clearTimeout(saveTimer); saveTimer = null;
  touchSession(S);
  var idx = indexWith(loadIndex(), S);
  var ok = store.set(KEY.s(S.id), S) && store.set(KEY.index, idx) && store.set(KEY.cur, S.id);
  if (!ok && !warnedQuota) {
    warnedQuota = true;
    toast('Could not save to browser storage (full or blocked). Delete old sessions in History.');
  }
  if (document.activeElement !== $('s-name')) $('s-name').value = S.named ? S.name : '';
  $('s-name').placeholder = S.named ? '' : (S.name || 'Session name');
  renderHistCount();
}
export function flushSave() { if (saveTimer) saveNow(); }
/* Ghi một phiên không mở (VD Undo xoá nhận xét sau khi đã chuyển phiên): lưu, đưa lên đầu index. */
export function saveClosed(s) {
  touchSession(s);
  if (store.set(KEY.s(s.id), s)) store.set(KEY.index, indexWith(loadIndex(), s));
  renderHistCount();
}
/* Mở phiên next thay phiên đang mở; phiên đang mở được lưu trước, trống thì xoá khỏi bộ nhớ. */
export function switchTo(next) {
  flushSave();
  if (isEmpty(S) && next.id !== S.id) store.del(KEY.s(S.id));
  show(next);
}
/* Phiên đang mở vừa bị xoá khỏi bộ nhớ (hộp History): bỏ lần lưu đang hẹn, để không ghi lại nó, rồi mở next. */
export function replaceDeleted(next) {
  clearTimeout(saveTimer); saveTimer = null;
  show(next);
}
function show(next) {
  S = next;
  store.set(KEY.cur, S.id);
  closePop(true);
  syncInputs();
  renderAll();
  setView(S.text ? (view === 'edit' ? lastRead : view) : 'edit');
  renderHistCount();
}

export function initState() {
  window.addEventListener('pagehide', flushSave);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flushSave(); });
}
