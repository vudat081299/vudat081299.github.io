// @ts-check
/* Hộp thoại: mở (showDlg, openDlg: thân về đầu, focus ô đầu trừ màn cảm ứng), đóng thì hỏi lại khi chữ chưa lưu
   (tryClose, closeSaved), vòng focus ẩn sau khi đóng bằng phím, hộp hỏi #dlg-ask (ask, thay alert / confirm / prompt), gộp khi
   Lưu mà tab khác đã ghi (mergeSaved, askRecreate); mọi <select> có nghĩa dùng danh sách tự dựng (ui/dropdown.js).
   Xuất: focusField, showDlg, openDlg, tryClose, closeSaved, ask, mergeSaved, askRecreate, initDialogs.
   Dùng: core/io.js, core/model.js, ui/dom.js, ui/dropdown.js, ui/state.js. */
import { plural } from '../core/io.js';
import { STATUS_LABEL, mergeEdit, oneLine } from '../core/model.js';
import { $, autosize, field, fmtDate, h } from './dom.js';
import { enhanceSelect } from './dropdown.js';
import { stepOf } from './state.js';

/* ── Hộp thoại: mở, focus ô đầu, hỏi lại khi đóng mà chữ chưa lưu ── */

const snapshot = (/** @type {any} */ form) => JSON.stringify([...form.elements].filter((e) => e.name).map((e) => (e.type === 'radio' || e.type === 'checkbox' ? e.checked : e.value)));
/** @type {WeakMap<any, string>} */
const snaps = new WeakMap();
const GUARDED = ['dlg-sub', 'dlg-step', 'dlg-revisit', 'dlg-log', 'dlg-notes', 'dlg-doc', 'dlg-md'];

/* Màn cảm ứng: mở hộp không tự focus ô chữ (bàn phím ảo bật lên che hộp). showModal focus phần tử đầu tiên: mọi hộp
 * trừ #dlg-ask mở đầu bằng nút ×; #dlg-ask trên màn cảm ứng đặt autofocus vào nút OK. */
const coarse = matchMedia('(pointer: coarse)');
const NO_KEYBOARD = ['radio', 'checkbox', 'button', 'submit', 'reset', 'file', 'date', 'range', 'color'];
/** @param {any} el @param {boolean} [select] */
export function focusField(el, select = false) {
  if (!el) return;
  const typing = el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !NO_KEYBOARD.includes(el.type));
  if (typing && coarse.matches) return;
  el.focus();
  if (select && typing && el.select) el.select();
}
/* Đóng hộp (Esc, Close, Save, Enter): focus về nút mở hay chỗ vừa sửa. Phím vừa bấm khiến trình duyệt vẽ vòng
 * focus-visible quanh chỗ ấy; lớp quiet-focus ẩn vòng tới lần bấm Tab / mũi tên kế tiếp, chuột hay chạm cũng gỡ lớp.
 * Đặt lớp ngay lúc bắt đầu đóng (Esc, submit, nút Close, closeSaved, tryClose), không chờ sự kiện close: sự kiện ấy tới
 * sau, có thể sau cả lần bấm Tab kế tiếp. */
const NAV_KEYS = ['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'];
const quietFocus = () => document.documentElement.classList.add('quiet-focus');

/** Hộp dùng lại cho mục khác: thân về đầu, không giữ chỗ cuộn của lần mở trước. @param {any} dlg */
export function showDlg(dlg) {
  dlg.showModal(); // hộp đóng không cuộn được: đặt lại sau khi mở
  for (const b of dlg.querySelectorAll('.dlg-body')) b.scrollTop = 0;
}
/** @param {any} dlg @param {any} [focusEl] */
export function openDlg(dlg, focusEl) {
  showDlg(dlg);
  dlg.querySelectorAll('textarea.grow-title').forEach(autosize);
  const form = dlg.querySelector('form');
  if (form && GUARDED.includes(dlg.id)) snaps.set(dlg, snapshot(form));
  focusField(focusEl, true);
}
/** Đóng hộp; chữ đã sửa mà chưa lưu thì hỏi lại. @param {any} dlg */
export async function tryClose(dlg) {
  const form = dlg.querySelector('form');
  if (form && snaps.has(dlg) && snapshot(form) !== snaps.get(dlg)) {
    const ok = await ask({ title: 'Discard changes?', text: 'Unsaved edits in this dialog will be lost.', ok: 'Discard', danger: true });
    if (ok === null) return false;
  }
  snaps.delete(dlg);
  quietFocus();
  dlg.close();
  return true;
}
/** Lưu xong: đóng hộp không hỏi. @param {any} dlg */
export function closeSaved(dlg) {
  snaps.delete(dlg);
  quietFocus();
  dlg.close();
}

/** Hỏi lại trong #dlg-ask. Trả chữ trong ô (không có ô: ''), ASK_ALT khi bấm nút thứ hai (`alt`), null khi đóng.
 * list: mỗi mục [nhãn, của mình, của tab kia] (xung đột giữa hai tab).
 * @param {{title:string, text?:string, label?:string, value?:string, ok:string, alt?:string, danger?:boolean, list?:string[][]}} o
 * @returns {Promise<string|null>} */
export function ask(o) {
  const dlg = $('dlg-ask');
  $('dlg-ask-title').textContent = o.title;
  $('ask-text').textContent = o.text || '';
  $('ask-text').hidden = !o.text;
  $('ask-field').hidden = !o.label;
  $('ask-label').textContent = o.label || '';
  $('ask-input').value = o.value || '';
  $('ask-input').required = !!o.label;
  $('ask-list').replaceChildren(...(o.list || []).map(([k, mine, theirs]) => h('li', {}, h('b', {}, k),
    h('p', {}, h('span', { class: 'lbl' }, 'Yours: '), mine), h('p', {}, h('span', { class: 'lbl' }, 'Other tab: '), theirs))));
  $('ask-list').hidden = !o.list?.length;
  $('ask-alt').textContent = o.alt || '';
  $('ask-alt').hidden = !o.alt;
  $('ask-ok').textContent = o.ok;
  $('ask-ok').className = 'btn ' + (o.danger ? 'danger' : 'go');
  dlg.returnValue = '';
  $('ask-ok').autofocus = coarse.matches;
  dlg.showModal();
  if (o.label) focusField($('ask-input'), true); else $('ask-ok').focus();
  return new Promise((resolve) => {
    dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok' ? $('ask-input').value : dlg.returnValue === 'alt' ? ASK_ALT : null), { once: true });
  });
}
const ASK_ALT = '\u0000alt';

/* ── Lưu hộp sửa khi tab khác đã ghi (mergeEdit): chỉ trường mình đổi đè lên bản mới nhất; cùng trường thì hỏi ── */

const FIELD_LABEL = { title: 'Title', status: 'Status', reason: 'Reason', due: 'Due', doneWhen: 'Done when', notes: 'Notes', goal: 'Goal',
  date: 'Date', decision: 'Decision', why: 'Why', stepId: 'Step', outs: 'Outputs', ins: 'Inputs' };
/** Giá trị một trường để so trong hộp hỏi. @param {any} ws @param {string} k @param {any} v */
function fieldText(ws, k, v) {
  const t = k === 'outs' ? (v || []).map((/** @type {any} */ o) => o.name).join(', ') : k === 'ins' ? plural((v || []).length, 'input') : k === 'status' ? STATUS_LABEL[v] : k === 'stepId' ? stepOf(ws, v)?.title || '' : k === 'due' || k === 'date' ? fmtDate(v) : String(v ?? '');
  const one = oneLine(t);
  return !one ? '(empty)' : one.length > 80 ? one.slice(0, 79) + '…' : one;
}
/**
 * Trường cần ghi khi Lưu: gộp `mine` lên `latest()` theo `snap`; trùng trường thì hỏi (Close: không lưu, hộp sửa vẫn mở).
 * Hỏi xong thì gộp lại với bản mới nhất lúc ấy. Trả null khi người dùng đóng hộp hỏi, hay khi mục mất trong lúc hỏi.
 * @param {any} ws @param {Record<string, any>} snap @param {Record<string, any>} mine @param {() => Record<string, any>|null} latest
 */
export async function mergeSaved(ws, snap, mine, latest) {
  const now = latest();
  if (!now) return null;
  const first = mergeEdit(snap, mine, now);
  if (!first.conflicts.length) return first.merged;
  const r = await ask({ title: 'Changed in another tab', text: 'Another tab saved these fields after you opened this dialog. Keep which version?',
    list: first.conflicts.map((k) => [FIELD_LABEL[k] || k, fieldText(ws, k, mine[k]), fieldText(ws, k, now[k])]), ok: 'Keep mine', alt: "Keep the other tab's" });
  if (r === null) return null;
  const again = latest();
  if (!again) return null;
  const { merged, conflicts } = mergeEdit(snap, mine, again);
  if (r === ASK_ALT) for (const k of conflicts) merged[k] = again[k];
  return merged;
}
/** Mục đã bị xoá ở tab khác: tạo lại (true), bỏ chữ đã sửa (false), hay đóng hộp hỏi (null: hộp sửa vẫn mở). @param {string} what */
export async function askRecreate(what) {
  const r = await ask({ title: 'Deleted in another tab', text: `${what} was deleted in another tab while you were editing it.`, ok: 'Re-create', alt: 'Discard my edits' });
  return r === null ? null : r !== ASK_ALT;
}

/** Gắn sự kiện, chạy một lần lúc khởi động (main.js gọi theo thứ tự). */
export function initDialogs() {
  document.querySelectorAll('textarea.grow-title').forEach((ta) => {
    ta.addEventListener('input', () => autosize(ta));
    ta.addEventListener('keydown', (/** @type {any} */ e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ta.form.requestSubmit(); }
    });
  });

  document.addEventListener('cancel', (/** @type {any} */ e) => { if (e.target instanceof HTMLDialogElement) quietFocus(); }, true);
  document.addEventListener('submit', (/** @type {any} */ e) => { if (e.target.closest('dialog')) quietFocus(); }, true);
  window.addEventListener('keydown', (e) => { if (NAV_KEYS.includes(e.key)) document.documentElement.classList.remove('quiet-focus'); }, true);
  window.addEventListener('pointerdown', () => document.documentElement.classList.remove('quiet-focus'), true);

  for (const id of GUARDED) {
    $(id).addEventListener('cancel', (/** @type {any} */ e) => { e.preventDefault(); tryClose($(id)); });
  }
  document.addEventListener('click', (/** @type {any} */ e) => {
    const b = e.target.closest && e.target.closest('[data-close]');
    if (!b) return;
    const dlg = b.closest('dialog');
    quietFocus();
    if (GUARDED.includes(dlg.id)) tryClose(dlg); else dlg.close();
  });

  /* Mọi <select> có nghĩa dùng danh sách chọn tự dựng; ô vị trí của bước chỉ là số nên giữ <select> gốc. */
  field($('step-form'), 'pos').dataset.native = '';
  document.querySelectorAll('select').forEach((s) => enhanceSelect(/** @type {HTMLSelectElement} */ (s)));
}
