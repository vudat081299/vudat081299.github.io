// @ts-check
/* Dời bước, bước con (moveStepTo, moveSubTo): lưu, vẽ, tô cái vừa dời và cái bị đổi chỗ (flash), toast "Moved …" có Hoàn
   tác (dời liền nhiều lần: về chỗ đầu), báo đầu vào vừa treo; nối kéo thả của ui/drag.js vào bảng.
   Xuất: dragCtl, moveStep, moveSubTo, HELD_TAIL, heldNow, keepHeld, beginMove, endMove, flashMs, flash, initMove.
   Dùng: core/board.js, core/handoffs.js, ui/clamp.js, ui/dom.js, ui/drag.js, ui/hand.js, ui/projects.js, ui/render.js,
     ui/state.js, ui/toast.js. */
import { placeSub, slotsOf, subPlace } from '../core/board.js';
import { handoffs, pruneSubOuts, subOutsBackup } from '../core/handoffs.js';
import { updateScrollCues } from './clamp.js';
import { $, quote } from './dom.js';
import { initDrag } from './drag.js';
import { newlyHeld } from './hand.js';
import { switchTo } from './projects.js';
import { render } from './render.js';
import { commit, cur, curId, findWs, stepOf, stepSel, subSel, ui } from './state.js';
import { hideToast, toast, toastUndo } from './toast.js';
/** @typedef {import('../core/board.js').Place} Place */

/** Kéo thả (ui/drag.js); render() dọn lần kéo dở trước khi vẽ lại bảng. @type {{abort: () => void}|null} */
export let dragCtl = null;

export function moveStep(/** @type {any} */ ws, /** @type {any} */ step, /** @type {number} */ d, /** @type {string} */ act) {
  const k = ws.steps.indexOf(step) + d;
  if (k >= 0 && k < ws.steps.length) moveStepTo(ws, step, k, `${stepSel(step.id, act)} || ${stepSel(step.id, 'edit-step')}`);
}
/** Đặt bước vào chỉ số k (tính khi đã nhấc nó ra). @param {any} ws @param {any} step @param {number} k */
function moveStepTo(ws, step, k, focusSel = stepSel(step.id, 'edit-step')) {
  const i = ws.steps.indexOf(step);
  const m = beginMove('step', step.id);
  ws.steps.splice(i, 1);
  ws.steps.splice(Math.max(0, Math.min(k, ws.steps.length)), 0, step);
  const j = ws.steps.indexOf(step);
  endMove(m, (j > i ? ws.steps[j - 1] : ws.steps[j + 1])?.id, focusSel);
}
/** Đặt bước con vào chỗ `to` (Place): lưu, vẽ, tô, toast có Hoàn tác. @param {any} ws @param {any} sub @param {Place} to */
export function moveSubTo(ws, sub, to, focusSel = subSel(sub.id, 'edit-sub'), held0 = null) {
  const m = keepHeld(beginMove('sub', sub.id), held0);
  const before = ws.steps.find((/** @type {any} */ s) => s.subs.includes(sub));
  const j = before ? before.subs.indexOf(sub) : -1;
  if (placeSub(ws, sub, to) === undefined) return;
  const target = stepOf(ws, to.stepId);
  if (target !== before) sub.redo = false; // dấu Redo chỉ có nghĩa trong vòng của bước đã gửi nó lại
  const k = target.subs.indexOf(sub);
  /* Cái bị đổi chỗ: dời tới trong cùng hàng thì cái nó vừa vượt qua (đứng ngay trước); còn lại cái bị đẩy lùi (ngay sau). */
  const swap = before === target && k > j ? target.subs[k - 1] : target.subs[k + 1] || target.subs[k - 1];
  endMove(m, swap?.id, focusSel);
}

/* ── Vừa dời: tô thẻ / hàng vừa di chuyển và cái bị đổi chỗ với nó, toast "Moved "tên" after "tên"" có Hoàn tác.
 * Toast tả chỗ mới bằng tên hàng xóm, không bằng số (số giữ nguyên tới khi tải lại). Dời liền nhiều lần cùng một thứ
 * (toast của nó còn hiện) thì Hoàn tác trả về chỗ trước lần dời đầu. ── */

/** redo: dấu Redo của bước con lúc bắt đầu dời (sang bước khác thì mất dấu; Hoàn tác trả lại).
 * held: đầu vào đã treo lúc bắt đầu dời (toast chỉ báo cái vừa treo). chosen: gắn lại lựa chọn của bước với đầu ra của bước con
 * (sang bước khác thì bước cũ thôi chọn; Hoàn tác trả lại).
 * @type {null | {kind:'sub'|'step', id:string, wsId:string, from:any, fromStepId:string, redo:boolean, undo:null|(() => void), held:Set<string>, chosen:(w: any) => void}} */
let lastMove = null;
let flashTimer = 0;

/** Chỗ hiện tại: bước con → Place, bước → chỉ số. @param {any} ws @param {'sub'|'step'} kind @param {string} id */
const placeNow = (ws, kind, id) => (kind === 'step' ? ws.steps.findIndex((/** @type {any} */ s) => s.id === id) : subPlace(ws, id));
/** Câu tả chỗ mới cho toast. @param {any} ws @param {'sub'|'step'} kind @param {string} id @param {string} fromStepId */
function movedText(ws, kind, id, fromStepId) {
  if (kind === 'step') {
    const i = ws.steps.findIndex((/** @type {any} */ s) => s.id === id);
    return `Moved step ${quote(ws.steps[i].title)} ` + (i === 0 ? 'to the top' : `below ${quote(ws.steps[i - 1].title)}`);
  }
  const p = subPlace(ws, id);
  const step = stepOf(ws, p.stepId);
  const sub = step.subs.find((/** @type {any} */ x) => x.id === id);
  const slots = slotsOf(step.subs.filter((/** @type {any} */ x) => x !== sub));
  const where = p.join ? `in parallel with ${quote(slots[p.slot].find((x) => x !== sub).title)}`
    : p.slot === 0 ? 'the start of the row' : `after ${quote(slots[p.slot - 1].at(-1).title)}`;
  if (p.stepId !== fromStepId) return `Moved ${quote(sub.title)} to step ${quote(step.title)}, ${where}`;
  return `Moved ${quote(sub.title)} ` + (p.join ? `to run ${where}` : p.slot === 0 ? `to ${where}` : where);
}
/** Toast của hộp sửa khi Lưu làm treo một đầu vào mà không dời gì. */
export const HELD_TAIL = 'Link kept; move the input after its source to connect.';
/** heldKeys của dự án lúc này (trước khi Lưu hộp sửa). @param {string} wsId */
export const heldNow = (wsId) => { const w = findWs(wsId); return w ? handoffs(w).heldKeys : new Set(); };
/** Lưu hộp sửa rồi dời: toast báo cả đầu vào vừa treo vì đầu vào mới chọn (bỏ khỏi `m.held` cái chưa treo lúc mở Lưu).
 * @param {any} m @param {Set<string>|null} held0 */
export function keepHeld(m, held0) {
  if (m && held0) m.held = new Set([...m.held].filter((k) => held0.has(k)));
  return m;
}
/** Gọi trước khi đổi chỗ. @param {'sub'|'step'} kind @param {string} id */
export function beginMove(kind, id) {
  const ws = cur();
  if (lastMove && lastMove.kind === kind && lastMove.id === id && lastMove.wsId === ws.id
    && !$('toast').hidden && toastUndo && toastUndo === lastMove.undo) return lastMove;
  const from = placeNow(ws, kind, id);
  const sub = kind === 'sub' && from ? stepOf(ws, from.stepId).subs.find((/** @type {any} */ x) => x.id === id) : null;
  lastMove = { kind, id, wsId: ws.id, from, fromStepId: kind === 'sub' ? from?.stepId : id, redo: !!sub?.redo, undo: null, held: handoffs(ws).heldKeys,
    chosen: subOutsBackup(ws, sub ? [sub] : []) };
  return lastMove;
}
/** Gọi sau khi đổi chỗ: lưu, vẽ, giữ focus, tô, báo (kể cả bước vừa thôi chọn đầu ra của bước con dời đi).
 * @param {any} m @param {string|null|undefined} swapId @param {string} focusSel */
export function endMove(m, swapId, focusSel) {
  const w0 = findWs(m.wsId);
  const lost = w0 ? pruneSubOuts(w0) : [];
  commit(focusSel);
  const ws = findWs(m.wsId);
  const now = ws && placeNow(ws, m.kind, m.id);
  if (now == null || now === -1) return;
  flash(m.kind, m.id, swapId);
  if (JSON.stringify(now) === JSON.stringify(m.from)) {
    if (toastUndo && toastUndo === m.undo) hideToast(false);
    lastMove = null;
    return;
  }
  m.undo = () => undoMove(m);
  const dropped = lost.length ? ` · No longer an output of step ${quote(lost[0].step.title)}` + (lost.length > 1 ? ` (+${lost.length - 1} more)` : '') : '';
  toast(movedText(ws, m.kind, m.id, m.fromStepId) + dropped + newlyHeld(ws, m.held, undefined, m.id), m.undo, focusSel, false);
}
function undoMove(/** @type {any} */ m) {
  lastMove = null;
  const w = findWs(m.wsId);
  if (!w) { toast('Cannot undo: the project was deleted.'); return; }
  if (m.kind === 'step') {
    const step = stepOf(w, m.id);
    if (!step) { toast('Cannot undo: the step was deleted.'); return; }
    w.steps.splice(w.steps.indexOf(step), 1);
    w.steps.splice(Math.min(m.from, w.steps.length), 0, step);
  } else {
    const from = w.steps.find((/** @type {any} */ s) => s.subs.some((/** @type {any} */ x) => x.id === m.id));
    if (!from) { toast('Cannot undo: the sub-step was deleted.'); return; }
    if (!stepOf(w, m.from.stepId)) { toast('Cannot undo: its step was deleted.'); return; }
    const sub = from.subs.find((/** @type {any} */ x) => x.id === m.id);
    placeSub(w, sub, m.from);
    if (m.redo && stepOf(w, m.from.stepId).revisit) sub.redo = true;
    m.chosen(w);
  }
  if (curId !== m.wsId) switchTo(m.wsId);
  commit(m.kind === 'step' ? stepSel(m.id, 'edit-step') : subSel(m.id, 'edit-sub'));
  flash(m.kind, m.id, null);
}
/** Thời gian tô, đọc từ token --flash-dur (CSS là nguồn duy nhất). */
export function flashMs() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--flash-dur').trim();
  const n = parseFloat(v);
  return !n ? 2600 : v.endsWith('ms') ? n : n * 1000;
}
/** Tô cái vừa dời (thẻ, hàng), quyết định vừa ghi, hay bước vừa nhảy tới. @param {'sub'|'step'|'log'} kind @param {string} id @param {string|null|undefined} swapId */
export function flash(kind, id, swapId) {
  clearTimeout(flashTimer);
  document.querySelectorAll('.moved, .swapped').forEach((el) => el.classList.remove('moved', 'swapped'));
  const sel = (/** @type {string} */ x) => (kind === 'sub' ? `.card[data-sub="${x}"]` : kind === 'log' ? `.log-item[data-log="${x}"]` : `.step[data-step="${x}"]`);
  const el = document.querySelector(sel(id));
  if (!el) return;
  const sw = swapId ? document.querySelector(sel(swapId)) : null;
  el.classList.add('moved');
  if (sw) sw.classList.add('swapped');
  /* Thẻ vừa dời trong tầm nhìn: cuộn hàng ngang (và trang, nếu cần) vừa đủ. */
  (kind === 'step' ? el.querySelector('.step-head') || el : el).scrollIntoView({ block: 'nearest', inline: 'nearest' });
  updateScrollCues();
  flashTimer = window.setTimeout(() => {
    el.classList.remove('moved');
    if (sw) sw.classList.remove('swapped');
  }, flashMs());
}

/** Gắn sự kiện, chạy một lần lúc khởi động (main.js gọi theo thứ tự). */
export function initMove() {
  /* ── Kéo thả (ui/drag.js): chuột, chạm (giữ rồi kéo), bút. Bàn phím: Alt + mũi tên, ô Vị trí trong hộp sửa ── */

  dragCtl = initDrag($('board'), {
    enabled: () => !!cur() && !ui.q.trim() && !ui.st,
    placeOf: (id) => subPlace(cur(), id),
    onSub: (id, to) => {
      const ws = cur();
      const sub = ws && ws.steps.flatMap((/** @type {any} */ s) => s.subs).find((/** @type {any} */ x) => x.id === id);
      if (sub) moveSubTo(ws, sub, to); else render();
    },
    onStep: (id, k) => {
      const ws = cur();
      const step = stepOf(ws, id);
      if (step) moveStepTo(ws, step, k); else render();
    },
    onEnd: () => render(),
  });
}
