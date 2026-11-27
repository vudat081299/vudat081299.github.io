// @ts-check
/* Hộp sửa bước (#dlg-step): tên, mục tiêu, Done when, ghi chú, vị trí; Lưu như hộp bước con; Delete, Reopen.
   Xuất: stepCtx, openStep, initStepDialog.
   Dùng: core/board.js, core/model.js, ui/actions.js, ui/dialogs.js, ui/docs.js, ui/dom.js, ui/hand.js, ui/move.js,
     ui/revisit.js, ui/state.js, ui/sub-outs.js, ui/toast.js. */
import { canReopen } from '../core/board.js';
import { EDIT_FIELDS, normStep, pick } from '../core/model.js';
import { deleteStep } from './actions.js';
import { askRecreate, closeSaved, mergeSaved, openDlg, tryClose } from './dialogs.js';
import { clearDocUndo, renderDocsEdit } from './docs.js';
import { $, field, focusFirst, h, quote } from './dom.js';
import { focusEdit, newlyHeld, paintEdit, readEdit, repaintPlace } from './hand.js';
import { HELD_TAIL, beginMove, endMove, heldNow, keepHeld } from './move.js';
import { openRevisit } from './revisit.js';
import { commit, cur, curId, findWs, stepOf, stepSel } from './state.js';
import { paintSubOuts } from './sub-outs.js';
import { toast, toastUndo } from './toast.js';

/* ── Hộp bước ── */

/** orig: bản sao bước lúc mở hộp (so khi Lưu, tạo lại khi tab khác đã xoá nó); pos0: ô Vị trí lúc mở.
 * @type {{wsId:string, stepId:string|null, orig?:any, pos0?:string}|null} */
export let stepCtx = null;

function fillPos(/** @type {any} */ sel, /** @type {number} */ n, /** @type {number} */ value) {
  sel.replaceChildren(...Array.from({ length: n }, (_, i) => h('option', { value: String(i) }, String(i + 1))));
  sel.value = String(Math.max(0, Math.min(value, n - 1)));
}

/** @param {any} step null: thêm bước mới @param {number} [at] bước mới: chỗ chèn đặt sẵn (mặc định cuối)
 * @param {{toHand?:'ins'|'outs'}} [opt] toHand: mở ở phần Inputs / Outputs */
export function openStep(step, at, opt = {}) {
  const f = $('step-form');
  const ws = cur();
  stepCtx = { wsId: ws.id, stepId: step ? step.id : null, orig: step ? JSON.parse(JSON.stringify(step)) : null };
  $('dlg-step-title').textContent = step ? 'Edit step' : 'Add step';
  field(f, 'title').value = step ? step.title : '';
  field(f, 'goal').value = step ? step.goal : '';
  field(f, 'doneWhen').value = step ? step.doneWhen : '';
  field(f, 'notes').value = step ? step.notes : '';
  const n = ws.steps.length + (step ? 0 : 1);
  fillPos(field(f, 'pos'), n, step ? ws.steps.indexOf(step) : at ?? n - 1);
  stepCtx.pos0 = field(f, 'pos').value;
  $('step-del').hidden = !step;
  $('step-revisit').hidden = !step || (!step.revisit && !canReopen(step));
  clearDocUndo();
  renderDocsEdit('step');
  paintSubOuts(ws, step);
  paintEdit('step', ws, step, step ? [step, ...step.subs] : [], stepDraftPlace);
  openDlg($('dlg-step'), opt.toHand ? null : field(f, 'title'));
  if (opt.toHand) focusEdit('step', opt.toHand);
}

/** Chỗ đang chọn ở ô Vị trí của hộp bước (chỉ số khi đã nhấc bước ra), null khi chưa đổi so với lúc mở. */
function stepDraftPlace() {
  const v = field($('step-form'), 'pos').value;
  return stepCtx && stepCtx.stepId && v === stepCtx.pos0 ? null : Number(v) || 0;
}

/** Gắn sự kiện, chạy một lần lúc khởi động (main.js gọi theo thứ tự). */
export function initStepDialog() {
  $('add-step').addEventListener('click', () => openStep(null));
  field($('step-form'), 'pos').addEventListener('change', () => repaintPlace('step'));

  /* Lưu: như hộp bước con, chỉ trường đã đổi đè lên bản đang lưu; ô Vị trí không đổi thì bước đứng nguyên chỗ hiện tại. */
  $('step-form').addEventListener('submit', async (/** @type {any} */ e) => {
    e.preventDefault();
    const f = $('step-form');
    const ctx = /** @type {any} */ (stepCtx);
    const F = EDIT_FIELDS.step;
    const now = () => (ctx.stepId ? stepOf(findWs(ctx.wsId), ctx.stepId) : null);
    /* subs: đầu ra chọn từ bước con chỉ giữ khi còn là đầu ra của bước con của bước (normStep). */
    const mine = pick(normStep({ title: field(f, 'title').value, goal: field(f, 'goal').value, doneWhen: field(f, 'doneWhen').value, notes: field(f, 'notes').value,
      ...readEdit(f), subs: (now() || ctx.orig || {}).subs }), F);
    const held0 = heldNow(ctx.wsId);
    let ws = findWs(ctx.wsId);
    let step = now();
    /** @type {any} */ let fresh = null;
    if (ws && ctx.stepId && !step) {
      const again = await askRecreate(`Step "${ctx.orig.title}"`);
      if (again === null) return;
      if (!again) { closeSaved($('dlg-step')); return; }
      ws = findWs(ctx.wsId);
      step = now();
      if (!step) fresh = normStep({ ...ctx.orig, ...mine });
    }
    if (ws && step) {
      const merged = await mergeSaved(ws, pick(ctx.orig, F), mine, () => { const s = now(); return s ? pick(s, F) : null; });
      if (!merged) return;
      ws = findWs(ctx.wsId);
      step = now();
      if (step) Object.assign(step, pick(normStep({ ...step, ...merged }), F));
    }
    closeSaved($('dlg-step'));
    if (!ws || (ctx.stepId && !step && !fresh)) { toast('Not saved: the step was deleted elsewhere.'); return; }
    const m = step && curId === ws.id ? keepHeld(beginMove('step', step.id), held0) : null;
    const i = step ? ws.steps.indexOf(step) : -1;
    const posVal = field(f, 'pos').value;
    if (step) ws.steps.splice(i, 1);
    else step = fresh || normStep(mine);
    const k = Math.min(step && i >= 0 && posVal === ctx.pos0 ? i : Number(posVal) || 0, ws.steps.length);
    ws.steps.splice(k, 0, step);
    const focusSel = `${stepSel(step.id, 'edit-step')} || #q`;
    if (m && k !== i) endMove(m, (k > i ? ws.steps[k - 1] : ws.steps[k + 1])?.id, focusSel);
    else {
      commit(focusSel);
      const heldMsg = newlyHeld(ws, held0, HELD_TAIL);
      if (heldMsg) toast(`${i >= 0 ? 'Saved' : 'Added'} step ${quote(step.title)}${heldMsg}`, null, focusSel);
    }
  });
  /* Xoá: deleteStep hỏi lại (bước còn bước con) trên hộp sửa đang mở; Close thì hộp vẫn mở với chữ đang gõ. Xoá xong mới đóng
   * hộp, rồi focus Hoàn tác của toast (lúc toast hiện, hộp modal còn mở nên chưa focus được). */
  $('step-del').addEventListener('click', async () => {
    const ctx = stepCtx;
    if (!ctx || !ctx.stepId) return;
    await deleteStep(ctx.wsId, ctx.stepId);
    if (stepOf(findWs(ctx.wsId), ctx.stepId) || stepCtx !== ctx) return;
    closeSaved($('dlg-step'));
    if (toastUndo) focusFirst($('toast-undo'));
  });
  $('step-revisit').addEventListener('click', async () => {
    const ctx = stepCtx;
    if (!ctx || !ctx.stepId || !(await tryClose($('dlg-step')))) return;
    const step = stepOf(findWs(ctx.wsId), ctx.stepId);
    if (step) openRevisit(step);
  });
}
