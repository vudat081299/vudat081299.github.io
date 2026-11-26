// @ts-check
/* Toast có Hoàn tác: một toast một lúc; Ctrl/Cmd + Z bấm Hoàn tác khi không gõ chữ, không có hộp mở và nút của toast không
   làm việc khác; ẩn thì focus về chỗ đã định (`back`).
   Xuất: toastUndo, toast, hideToast, initToast.
   Dùng: ui/dom.js, ui/state.js. */
import { $ } from './dom.js';
import { refocus } from './state.js';

/* ── Toast có Hoàn tác (Ctrl/Cmd + Z khi không gõ chữ) ── */

/** @type {null | (() => void)} */
export let toastUndo = null;
let toastTimer = 0;
let toastBack = '';
/** Nút của toast không phải Hoàn tác (vd. "Add evidence"): Ctrl/Cmd + Z không bấm nó. */
let toastAction = false;
/* Xoá: focus nhảy vào Hoàn tác. Dời chỗ (focusUndo = false): focus ở lại thẻ vừa dời, Ctrl/Cmd + Z vẫn hoàn tác.
 * label: chữ của nút khi nó làm việc khác Hoàn tác. */
export function toast(/** @type {string} */ text, /** @type {null | (() => void)} */ undo = null, back = '', focusUndo = true, label = '') {
  $('toast-text').textContent = text;
  $('toast-undo').hidden = !undo;
  $('toast-undo').textContent = label || 'Undo';
  if (label) $('toast-undo').removeAttribute('aria-keyshortcuts'); else $('toast-undo').setAttribute('aria-keyshortcuts', 'Control+Z Meta+Z');
  toastAction = !!label;
  toastUndo = undo;
  toastBack = back;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(hideToast, undo ? 15000 : 4000);
  if (undo && focusUndo) $('toast-undo').focus();
}
export function hideToast(refocusAfter = true) {
  const had = document.activeElement === $('toast-undo');
  clearTimeout(toastTimer);
  $('toast').hidden = true;
  toastUndo = null;
  if (had && refocusAfter) refocus(toastBack || '#board');
}
function runUndo() {
  const u = toastUndo;
  hideToast(false);
  if (u) u();
}

const typing = (/** @type {any} */ el) => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

/** Gắn sự kiện, chạy một lần lúc khởi động (main.js gọi theo thứ tự). */
export function initToast() {
  $('toast-undo').addEventListener('click', runUndo);

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'z'
      && toastUndo && !toastAction && !typing(e.target) && !document.querySelector('dialog[open]')) {
      e.preventDefault();
      runUndo();
    }
  });
}
