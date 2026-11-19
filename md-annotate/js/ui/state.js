/* Phiên đang mở (S): đọc / ghi localStorage, lưu (hẹn giờ 300ms), chuyển phiên. S chỉ gán lại qua setS() /
   switchTo(). Mô hình phiên (tạo, chuẩn hoá, tên tự đặt) ở core/session.js.
   Xuất: cancelSave, flushSave, initState, loadIndex, loadSession, newSession, S, saveClosed, saveNow, scheduleSave,
     setS, switchTo.
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

/* Gán lại phiên đang mở từ module khác (ESM không cho gán vào biến import). */
export function setS(next) { S = next; }

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
/* Huỷ lần lưu đang hẹn (VD vừa xoá phiên đang mở: đừng ghi lại nó). */
export function cancelSave() { clearTimeout(saveTimer); saveTimer = null; }
export function switchTo(next) {
  flushSave();
  if (isEmpty(S) && next.id !== S.id) store.del(KEY.s(S.id));
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
