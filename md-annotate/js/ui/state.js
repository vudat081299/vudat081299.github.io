/* Phiên đang mở (S) và doc của file đang mở (D = docOf(S)): đọc / ghi localStorage, lưu (hẹn giờ 300ms), chuyển phiên,
   mở file khác trong cây. S và D chỉ gán lại ở đây: switchTo() / replaceDeleted() (phiên khác), putSession() (cùng phiên,
   cây đổi: chỉ ui/files.js gọi), openFileId() (file khác). Nơi khác đọc chữ, nhận xét, dấu đã đọc qua D; tuỳ chọn phiên ở S.
   docKey(): khoá "văn bản đang mở" (phiên + file) cho việc gắn với một văn bản (Undo, gợi ý đã đọc, chọn dòng).
   Mỗi file nhớ chỗ cuộn trong bộ nhớ của lần nạp trang. Mô hình phiên (tạo, chuẩn hoá, tên tự đặt) ở core/session.js.
   Xuất: D, docKey, flushSave, initState, loadIndex, loadSession, newSession, openFileId, putSession, replaceDeleted, S,
     saveClosed, saveNow, scheduleSave, switchTo.
   Dùng: core/session.js, ui/store.js, ui/dom.js, ui/render.js, ui/views.js, ui/popup.js, ui/picks.js, ui/history.js,
     ui/editor.js, ui/files.js. */
import { createSession, docOf, indexWith, isEmpty, normIndex, normSession, openFile, touchSession } from '../core/session.js';
import { KEY, prefs, store } from './store.js';
import { $, toast } from './dom.js';
import { renderAll } from './render.js';
import { lastRead, setView, view } from './views.js';
import { closePop } from './popup.js';
import { clearPicks } from './picks.js';
import { renderHistCount } from './history.js';
import { syncInputs } from './editor.js';
import { refreshTree } from './files.js';

export function newSession(text) { return createSession(text, prefs); }
export function loadSession(id) { return normSession(store.get(KEY.s(id), null), id); }
export function loadIndex() { return normIndex(store.get(KEY.index, [])); }

export var S = (function () {
  var cur = store.get(KEY.cur, null);
  return (cur && loadSession(cur)) || newSession('');
})();
export var D = docOf(S);
export function docKey() { return S.id + '/' + S.open; }

/* LƯU PHIÊN */
var saveTimer = null, warnedQuota = false;
export function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 300); }
/* Lưu ngay; trả false khi bộ nhớ đầy / bị chặn. quiet: không báo (nơi gọi tự báo, VD nạp folder rồi hoàn lại). */
export function saveNow(quiet) {
  clearTimeout(saveTimer); saveTimer = null;
  touchSession(S);
  var idx = indexWith(loadIndex(), S);
  var ok = store.set(KEY.s(S.id), S) && store.set(KEY.index, idx) && store.set(KEY.cur, S.id);
  if (!ok && !warnedQuota && quiet !== true) {
    warnedQuota = true;
    toast('Could not save to browser storage (full or blocked). Delete old sessions in History.');
  }
  if (document.activeElement !== $('s-name')) $('s-name').value = S.named ? S.name : '';
  $('s-name').placeholder = S.named ? '' : (S.name || 'Session name');
  renderHistCount();
  return ok;
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
  leaveDoc();
  S = next; D = docOf(S);
  store.set(KEY.cur, S.id);
  syncInputs();
  renderAll();
  setView(D.text ? (view === 'edit' ? lastRead : view) : 'edit');
  restoreScroll();
  renderHistCount();
  refreshTree();
}

/* FILE ĐANG MỞ. Chỗ cuộn (trang, ô Edit, hai khung) nhớ theo docKey, chỉ trong bộ nhớ. */
var scrolls = {};
function leaveDoc() {
  closePop(true);
  clearPicks();
  scrolls[docKey()] = { win: window.scrollY, ta: $('src-input').scrollTop, src: $('wrap-src').scrollTop, md: $('wrap-md').scrollTop };
}
function restoreScroll() {
  var p = scrolls[docKey()] || { win: 0, ta: 0, src: 0, md: 0 };
  $('src-input').scrollTop = p.ta; $('wrap-src').scrollTop = p.src; $('wrap-md').scrollTop = p.md;
  window.scrollTo(window.scrollX, p.win);
}
/* Vẽ file vừa mở (hay doc vừa thay): giữ chế độ xem; file trống thì Edit (thẻ bắt đầu). */
function enterDoc() {
  syncInputs();
  renderAll();
  setView(D.text ? (view === 'edit' ? 'edit' : lastRead) : 'edit');
  restoreScroll();
}
/* Thay S bằng next, cùng phiên (cây đổi; next dựng bằng core/session.js). Chỉ ui/files.js gọi. File mở đổi thì rời file
   cũ (đóng hộp nhận xét, thoát chọn dòng, nhớ chỗ cuộn) rồi vẽ file mới; doc của file mở bị thay (điền chữ) thì vẽ lại. */
export function putSession(next) {
  var moved = next.open !== S.open;
  if (moved) leaveDoc();
  var changed = moved || docOf(next) !== D;
  S = next; D = docOf(S);
  if (changed) enterDoc();
}
/* Mở file id của phiên (bấm ở cây): mở các folder chứa nó, lưu, vẽ, cây. */
export function openFileId(id) {
  if (id === S.open || !docOf(S, id)) return;
  putSession(openFile(S, id));
  scheduleSave();
  refreshTree();
}

export function initState() {
  window.addEventListener('pagehide', flushSave);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flushSave(); });
}
