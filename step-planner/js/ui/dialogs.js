// @ts-check
/* Hộp thoại: mở (showDlg, openDlg: thân về đầu, focus ô đầu trừ màn cảm ứng), đóng thì hỏi lại khi chữ chưa lưu
   (tryClose, closeSaved), hộp hỏi #dlg-ask (ask, thay alert / confirm / prompt; Enter trong ô là OK, câu hỏi xoá / bỏ
   chữ focus nút an toàn), gộp khi Lưu mà tab khác đã ghi (mergeSaved, askRecreate); đóng mà nút mở đã bị vẽ lại thì focus
   nút mới (openerSel); ô bắt buộc chỉ có khoảng trắng thì báo ngay trên ô (markBlank); ô chữ tự cao (textarea.grow-title:
   tên, Enter là Lưu; .grow-line: ô một dòng khác, Enter không làm gì; .grow: nhiều dòng, có trần); hộp sửa chỉ Lưu bằng
   Enter ở ô tên; focus vào ô khuất trong thân hộp thì cuộn tới; mọi <select>
   có nghĩa dùng danh sách tự dựng (ui/dropdown.js); vòng focus chỉ cho bàn phím, ở mọi phần tử của trang (lớp quiet-focus).
   Xuất: focusField, showDlg, openDlg, tryClose, closeSaved, ask, mergeSaved, askRecreate, initDialogs.
   Dùng: core/io.js, core/model.js, ui/dom.js, ui/dropdown.js, ui/state.js. */
import { plural } from '../core/io.js';
import { STATUS_LABEL, mergeEdit, oneLine } from '../core/model.js';
import { $, autosize, canFocus, field, fmtDate, h } from './dom.js';
import { enhanceSelect } from './dropdown.js';
import { refocus, stepOf } from './state.js';

/* ── Hộp thoại: mở, focus ô đầu, hỏi lại khi đóng mà chữ chưa lưu ── */

/* Khung chữ của hộp: <form>, hay .dlg-form khi hộp không gửi form (Import: ô theo id). */
const formOf = (/** @type {any} */ dlg) => dlg.querySelector('form') || dlg.querySelector('.dlg-form');
const snapshot = (/** @type {any} */ form) => JSON.stringify([...(form.elements || form.querySelectorAll('input, textarea, select'))]
  .filter((e) => e.name || e.id).map((e) => (e.type === 'radio' || e.type === 'checkbox' ? e.checked : e.value)));
/** @type {WeakMap<any, string>} */
const snaps = new WeakMap();
const GUARDED = ['dlg-sub', 'dlg-step', 'dlg-revisit', 'dlg-log', 'dlg-notes', 'dlg-doc', 'dlg-md', 'dlg-import'];

/* Màn cảm ứng: mở hộp không tự focus ô chữ (bàn phím ảo bật lên che hộp). showModal focus phần tử đầu tiên: mọi hộp
 * trừ #dlg-ask mở đầu bằng nút ×; #dlg-ask trên màn cảm ứng đặt autofocus vào nút OK. */
const coarse = matchMedia('(pointer: coarse)');
const NO_KEYBOARD = ['radio', 'checkbox', 'button', 'submit', 'reset', 'file', 'date', 'range', 'color'];
/** @param {any} el @param {boolean} [select] */
export function focusField(el, select = false) {
  if (!canFocus(el)) return;
  const typing = el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !NO_KEYBOARD.includes(el.type));
  if (typing && coarse.matches) return;
  el.focus();
  if (select && typing && el.select) el.select();
}
/* Vòng focus chỉ cho người dùng bàn phím, ở mọi phần tử. Đóng hộp, danh sách bằng Esc hay Enter thì focus về nút mở, và
 * trình duyệt coi lần focus ấy là từ bàn phím (vẽ vòng) dù hộp mở bằng chuột. Nên trang tự nhớ cách dùng: chuột, chạm bật
 * lớp quiet-focus trên <html>; Tab, phím điều hướng, phím tắt (Alt / Ctrl / Cmd + phím) gỡ lớp, trừ khi đang gõ trong ô chữ
 * (mũi tên, Ctrl + A ở đó là của ô chữ); Esc, Enter, Space, gõ chữ giữ nguyên. Lớp chỉ ẩn vòng: mọi luật CSS vẽ vòng
 * (outline, nét SVG, quầng) mở bằng `:where(:root:not(.quiet-focus))` (lint.py kiểm). */
const NAV_KEYS = ['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'];
const MOD_KEYS = ['Alt', 'AltGraph', 'Control', 'Meta', 'Shift', 'CapsLock'];
const NOT_TEXT = ['radio', 'checkbox', 'button', 'submit', 'reset', 'file', 'range', 'color', 'image'];
const inText = (/** @type {any} */ t) => !!t && (t.isContentEditable || t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && !NOT_TEXT.includes(t.type)));
/** Phím này là đi bằng bàn phím (vòng hiện lại). @param {KeyboardEvent} e */
const keyNav = (e) => e.key === 'Tab' || (!inText(e.target) && (NAV_KEYS.includes(e.key) || ((e.altKey || e.ctrlKey || e.metaKey) && !MOD_KEYS.includes(e.key))));

/* Nút mở hộp: bảng vẽ lại trong lúc hộp mở (thêm, xoá tài liệu, Evidence) thay nút ấy bằng nút mới, và trình duyệt trả focus
 * về nút cũ đã rời trang: focus rơi về body. Lúc mở nhớ bộ chọn của nút mở; đóng mà focus ở body thì tìm lại theo bộ chọn. */
const KEYS = ['data-act', 'data-sub', 'data-step', 'data-doc', 'data-doc-act', 'data-doc-add', 'data-log', 'data-ws', 'data-edge',
  'data-k', 'data-in', 'data-out', 'data-gap', 'data-at', 'data-tpl', 'data-goto', 'data-stage', 'data-warn', 'data-arch-open'];
/** @type {WeakMap<any, string>} */
const openers = new WeakMap();
/** Bộ chọn tìm lại phần tử sau khi vẽ lại: khoá của nó và của các tổ tiên có khoá tới tổ tiên có id; rồi chỉ tổ tiên gần nhất.
 * Phần tử không có id hay khoá riêng: ''. @param {any} el */
function openerSel(el) {
  const own = (/** @type {any} */ e) => (e.id ? '#' + CSS.escape(e.id) : KEYS.filter((k) => e.hasAttribute(k)).map((k) => `[${k}="${CSS.escape(e.getAttribute(k))}"]`).join(''));
  if (!el || el === document.body || !own(el)) return '';
  const parts = [];
  for (let e = el; e && e !== document.body; e = e.parentElement) {
    const o = own(e);
    if (o) parts.unshift(o);
    if (e.id) break;
  }
  return parts.length > 2 ? `${parts.join(' ')} || ${parts.slice(-2).join(' ')}` : parts.join(' ');
}
/** @param {any} dlg */
function showModalFrom(dlg) {
  openers.set(dlg, openerSel(document.activeElement));
  dlg.showModal();
}
/** Đóng hộp mà focus còn trong hộp ấy (trình duyệt không trả được, sẽ rơi về body) hay đã ở body: về nút mở, hay nút cùng chỗ
 * sau khi vẽ lại; hộp dưới còn mở thì ở trong hộp ấy. Sự kiện close tới ở lượt việc sau close(): hộp đã mở lại thì sự kiện
 * ấy cũ, bỏ qua, kẻo nó lấy mất nút mở của lần mở mới. @param {any} dlg */
function restoreFocus(dlg) {
  if (dlg.open) return;
  const sel = openers.get(dlg) || '';
  openers.delete(dlg);
  const a = document.activeElement;
  if (a && a !== document.body && !dlg.contains(a)) return;
  const under = [...document.querySelectorAll('dialog[open]')].at(-1);
  if (!under) { refocus(sel); return; }
  const el = sel.split('||').map((x) => x.trim() && under.querySelector(x.trim())).find(canFocus)
    || [...under.querySelectorAll('button')].find(canFocus);
  if (el) el.focus();
}

/** Hộp dùng lại cho mục khác: thân về đầu, không giữ chỗ cuộn của lần mở trước. @param {any} dlg */
export function showDlg(dlg) {
  showModalFrom(dlg); // hộp đóng không cuộn được: đặt lại sau khi mở
  for (const b of dlg.querySelectorAll('.dlg-body')) b.scrollTop = 0;
}
/** @param {any} dlg @param {any} [focusEl] */
export function openDlg(dlg, focusEl) {
  showDlg(dlg);
  dlg.querySelectorAll('textarea.grow-title, textarea.grow-line, textarea.grow').forEach(autosize);
  const form = formOf(dlg);
  if (form && GUARDED.includes(dlg.id)) snaps.set(dlg, snapshot(form));
  focusField(focusEl, true);
}
/** Đóng hộp; chữ đã sửa mà chưa lưu thì hỏi lại. @param {any} dlg */
export async function tryClose(dlg) {
  const form = formOf(dlg);
  if (form && snaps.has(dlg) && snapshot(form) !== snaps.get(dlg)) {
    const ok = await ask({ title: 'Discard changes?', text: 'Unsaved edits in this dialog will be lost.', ok: 'Discard', danger: true });
    if (ok === null) return false;
  }
  snaps.delete(dlg);
  dlg.close();
  return true;
}
/** Lưu xong: đóng hộp không hỏi. @param {any} dlg */
export function closeSaved(dlg) {
  snaps.delete(dlg);
  dlg.close();
}

/** Hỏi lại trong #dlg-ask. Trả chữ trong ô (không có ô: ''), ASK_ALT khi bấm nút thứ hai (`alt`), null khi đóng.
 * list: mỗi mục [nhãn, của mình, của tab kia] (xung đột giữa hai tab). danger (xoá, bỏ chữ): focus Close, để Enter hay
 * Esc rồi Enter không làm mất gì; còn lại focus OK, hay ô chữ khi có ô.
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
  markBlank($('ask-input'));
  $('ask-list').replaceChildren(...(o.list || []).map(([k, mine, theirs]) => h('li', {}, h('b', {}, k),
    h('p', {}, h('span', { class: 'lbl' }, 'Yours: '), mine), h('p', {}, h('span', { class: 'lbl' }, 'Other tab: '), theirs))));
  $('ask-list').hidden = !o.list?.length;
  $('ask-alt').textContent = o.alt || '';
  $('ask-alt').hidden = !o.alt;
  $('ask-ok').textContent = o.ok;
  $('ask-ok').className = 'btn ' + (o.danger ? 'danger' : 'go');
  dlg.returnValue = '';
  const safe = dlg.querySelector('.dlg-foot [data-close]');
  const first = o.danger ? safe : $('ask-ok');
  $('ask-ok').autofocus = coarse.matches && first === $('ask-ok');
  safe.autofocus = coarse.matches && first === safe;
  showModalFrom(dlg);
  if (o.label) focusField($('ask-input'), true); else first.focus();
  return new Promise((resolve) => {
    dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok' ? $('ask-input').value : dlg.returnValue === 'alt' ? ASK_ALT : null), { once: true });
  });
}
const ASK_ALT = '\u0000alt';

/* Ô bắt buộc chỉ có khoảng trắng: `required` của trình duyệt cho qua, rồi chuẩn hoá thay bằng tên mặc định hay bỏ mục.
 * Đặt lỗi riêng trên ô để Lưu dừng ở đó và trình duyệt hiện câu báo. */
const BLANK_MSG = 'Type some text, not only spaces.';
/** @param {any} el */
function markBlank(el) {
  if (!el || !('setCustomValidity' in el) || !(el.tagName === 'TEXTAREA' || el.type === 'text')) return;
  if (el.required && el.value && !el.value.trim()) el.setCustomValidity(BLANK_MSG);
  else if (el.validationMessage === BLANK_MSG) el.setCustomValidity(''); // ô thôi bắt buộc (#ask-input không có nhãn) cũng gỡ
}
/** Trước mỗi lần gửi form: kiểm lại mọi ô bắt buộc (ô vừa dựng lại không có sự kiện input). @param {any} form */
const markBlanks = (form) => form && form.querySelectorAll && form.querySelectorAll('[required]').forEach(markBlank);

/* ── Lưu hộp sửa khi tab khác đã ghi (mergeEdit): chỉ trường mình đổi đè lên bản mới nhất; cùng trường thì hỏi ── */

const FIELD_LABEL = { title: 'Title', status: 'Status', reason: 'Reason', due: 'Due', doneWhen: 'Done when', notes: 'Notes', goal: 'Goal',
  date: 'Date', decision: 'Decision', why: 'Why', stepId: 'Step', outs: 'Outputs', ins: 'Inputs', subOuts: 'Outputs from sub-steps' };
/** Giá trị một trường để so trong hộp hỏi. @param {any} ws @param {string} k @param {any} v */
function fieldText(ws, k, v) {
  const t = k === 'outs' ? (v || []).map((/** @type {any} */ o) => o.name).join(', ') : k === 'ins' ? plural((v || []).length, 'input') : k === 'subOuts' ? plural((v || []).length, 'output') : k === 'status' ? STATUS_LABEL[v] : k === 'stepId' ? stepOf(ws, v)?.title || '' : k === 'due' || k === 'date' ? fmtDate(v) : String(v ?? '');
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
  /* Ô tên tự cao: Enter là Lưu; chuẩn hoá gộp dòng khi lưu (cả .grow-line). */
  document.querySelectorAll('textarea.grow-title').forEach((ta) => {
    ta.addEventListener('input', () => autosize(ta));
    ta.addEventListener('keydown', (/** @type {any} */ e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ta.form.requestSubmit(); }
    });
  });
  document.querySelectorAll('textarea.grow, textarea.grow-line').forEach((ta) => ta.addEventListener('input', () => autosize(ta)));
  /* Hộp sửa bước, bước con: Enter chỉ Lưu ở ô tên. Ở ô khác (Goal, Done when, Due, trạng thái, Inputs / Outputs) Enter
   * không gửi form; ô nhiều dòng (ghi chú, lý do) vẫn xuống dòng. */
  for (const f of [$('sub-form'), $('step-form')]) {
    f.addEventListener('keydown', (/** @type {any} */ e) => {
      const t = e.target;
      if (e.key === 'Enter' && (t.classList.contains('grow-line') || (t.tagName === 'INPUT' && !['button', 'submit', 'reset'].includes(t.type)))) e.preventDefault();
    });
  }

  /* Ô bắt buộc chỉ có khoảng trắng: báo khi gõ, và kiểm lại ngay trước khi gửi (Enter, bấm nút gửi). */
  document.addEventListener('input', (e) => markBlank(e.target), true);
  document.addEventListener('keydown', (/** @type {any} */ e) => { if (e.key === 'Enter' && e.target.form) markBlanks(e.target.form); }, true);
  document.addEventListener('click', (/** @type {any} */ e) => {
    const b = e.target.closest && e.target.closest('button[type="submit"]');
    if (b && b.form) markBlanks(b.form);
  }, true);

  /* Hộp hỏi: Enter trong ô là OK. Gửi ngầm dùng nút gửi đầu tiên của form, là nút thứ hai (#ask-alt) dù nó đang ẩn. */
  $('ask-input').addEventListener('keydown', (/** @type {any} */ e) => {
    if (e.key !== 'Enter' || e.isComposing) return;
    e.preventDefault();
    $('ask-form').requestSubmit($('ask-ok'));
  });

  /* Focus vào ô khuất trong thân hộp (Tab vòng lại về ô tên đã chọn sẵn chữ): Chromium không cuộn tới; cuộn thân hộp. */
  document.addEventListener('focusin', (/** @type {any} */ e) => {
    const t = e.target, body = t.closest && t.closest('.dlg-body');
    if (!body || t === body) return;
    const r = t.getBoundingClientRect(), b = body.getBoundingClientRect();
    if (r.top < b.top || r.bottom > b.bottom) t.scrollIntoView({ block: 'nearest' });
  });

  document.addEventListener('close', (/** @type {any} */ e) => { if (e.target instanceof HTMLDialogElement) restoreFocus(e.target); }, true);
  window.addEventListener('keydown', (e) => { if (keyNav(e)) document.documentElement.classList.remove('quiet-focus'); }, true);
  window.addEventListener('pointerdown', () => document.documentElement.classList.add('quiet-focus'), true);

  for (const id of GUARDED) {
    $(id).addEventListener('cancel', (/** @type {any} */ e) => { e.preventDefault(); tryClose($(id)); });
  }
  document.addEventListener('click', (/** @type {any} */ e) => {
    const b = e.target.closest && e.target.closest('[data-close]');
    if (!b) return;
    const dlg = b.closest('dialog');
    if (GUARDED.includes(dlg.id)) tryClose(dlg); else dlg.close();
  });

  /* Mọi <select> có nghĩa dùng danh sách chọn tự dựng; ô vị trí của bước chỉ là số nên giữ <select> gốc. */
  field($('step-form'), 'pos').dataset.native = '';
  document.querySelectorAll('select').forEach((s) => enhanceSelect(/** @type {HTMLSelectElement} */ (s)));
}
