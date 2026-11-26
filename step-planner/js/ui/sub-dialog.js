// @ts-check
/* Hộp sửa bước con (#dlg-sub): ô Bước / Vị trí (ô riêng hay song song), trạng thái và lý do; Lưu chỉ ghi trường đã đổi
   (EDIT_FIELDS) lên bản mới nhất, dời khi đổi chỗ; Duplicate, Delete.
   Xuất: subCtx, openSub, initSubDialog.
   Dùng: core/board.js, core/model.js, ui/actions.js, ui/board.js, ui/dialogs.js, ui/docs.js, ui/dom.js, ui/hand.js,
     ui/move.js, ui/projects.js, ui/state.js, ui/toast.js. */
import { placeSub, slotsOf, subPlace } from '../core/board.js';
import { EDIT_FIELDS, REASON_LABEL, STATUS_HINT, hasReason, normSub, pick, setStatus } from '../core/model.js';
import { deleteSub, duplicateSub, evidenceHint } from './actions.js';
import { labelsOf } from './board.js';
import { askRecreate, closeSaved, focusField, mergeSaved, openDlg, tryClose } from './dialogs.js';
import { clearDocUndo, docWhere, renderDocsEdit } from './docs.js';
import { $, field, h, quote } from './dom.js';
import { focusEdit, newlyHeld, paintEdit, readEdit, repaintPlace } from './hand.js';
import { HELD_TAIL, heldNow, moveSubTo } from './move.js';
import { switchTo } from './projects.js';
import { commit, cur, curId, findWs, stepOf, stepSel, subSel } from './state.js';
import { toast } from './toast.js';

/* ── Hộp bước con ── */

/** pos: chỗ đặt sẵn cho bước con mới ("j:2" = song song với ô 2); pos0: giá trị ô Vị trí lúc mở hộp; orig: bản sao bước con
 * lúc mở hộp (so khi Lưu, tạo lại khi tab khác đã xoá nó).
 * @type {{wsId:string, stepId:string, subId:string|null, pos?:string, pos0?:string, orig?:any}|null} */
export let subCtx = null;

/** Ô "Vị trí" của bước con: "Position N" (một ô riêng chen vào chỗ N) và "Parallel with N" (nhập vào ô N), tính trên hàng
 * của bước đích khi đã nhấc bước con này ra; giá trị `n:i` / `j:i` (xem Place của core/board.js). */
function subPosOptions(keep = true) {
  const f = $('sub-form');
  const ws = cur();
  const target = stepOf(ws, field(f, 'step').value);
  if (!target || !subCtx) return;
  const self = subCtx.subId;
  const slots = slotsOf(target.subs.filter((/** @type {any} */ x) => x.id !== self));
  const opts = [];
  for (let i = 0; i <= slots.length; i++) {
    const hint = i < slots.length ? `Before ${quote(slots[i][0].title)}` : slots.length ? `After ${quote(slots[i - 1].at(-1).title)}` : 'First in this step';
    opts.push(h('option', { value: `n:${i}`, 'data-hint': hint }, `Position ${i + 1}`));
    if (i < slots.length) opts.push(h('option', { value: `j:${i}`, 'data-hint': `Runs alongside ${slots[i].map((x) => quote(x.title)).join(', ')}` }, `Parallel with ${i + 1}`));
  }
  field(f, 'pos').replaceChildren(...opts);
  const p = self && target.id === subCtx.stepId ? subPlace(ws, self) : null;
  field(f, 'pos').value = p ? `${p.join ? 'j' : 'n'}:${p.slot}` : keep && subCtx.pos ? subCtx.pos : `n:${slots.length}`;
}

/** @param {any} step @param {any} sub @param {{toDocs?:boolean, status?:string, pos?:string, toHand?:'ins'|'outs'}} [opt] status: đặt sẵn trạng thái
 * (Cancelled: focus ô lý do); pos: chỗ đặt sẵn của bước con mới; toHand: mở ở phần Inputs / Outputs */
export function openSub(step, sub, opt = {}) {
  const ws = cur();
  const f = $('sub-form');
  subCtx = { wsId: ws.id, stepId: step.id, subId: sub ? sub.id : null, pos: opt.pos, orig: sub ? JSON.parse(JSON.stringify(sub)) : null };
  $('dlg-sub-title').textContent = sub ? 'Edit sub-step' : 'Add sub-step';
  $('sub-where').textContent = docWhere({ wsId: ws.id, stepId: step.id, subId: null, docId: null });
  const labels = labelsOf(ws);
  field(f, 'step').replaceChildren(...ws.steps.map((/** @type {any} */ s) => h('option', { value: s.id }, (labels.has(s.id) ? `${labels.get(s.id)}. ` : '') + s.title)));
  const x = sub || normSub({ title: '' });
  field(f, 'title').value = sub ? x.title : '';
  field(f, 'status').value = opt.status || x.status;
  field(f, 'due').value = x.due;
  field(f, 'doneWhen').value = x.doneWhen;
  field(f, 'notes').value = x.notes;
  field(f, 'reason').value = x.reason;
  paintReason();
  field(f, 'step').value = step.id;
  subPosOptions();
  subCtx.pos0 = field(f, 'pos').value;
  $('sub-del').hidden = !sub;
  $('sub-dup').hidden = !sub;
  clearDocUndo();
  renderDocsEdit('sub');
  paintEdit('sub', ws, sub, sub ? [sub] : [], subDraftPlace);
  openDlg($('dlg-sub'), opt.toDocs || opt.toHand ? null : opt.status === 'cancel' ? field(f, 'reason') : field(f, 'title'));
  if (opt.toHand) focusEdit('sub', opt.toHand);
  if (opt.toDocs) {
    $('sub-docs').scrollIntoView({ block: 'nearest' });
    /** @type {any} */ ($('sub-docs').querySelector('.doc-list button, [data-doc-add]')).focus();
  }
}

/** Chỗ đang chọn ở ô Bước / Vị trí của hộp bước con (Place), null khi chưa đổi so với lúc mở (Lưu cũng không dời). */
function subDraftPlace() {
  const f = $('sub-form');
  const stepId = field(f, 'step').value, pos = String(field(f, 'pos').value || 'n:999');
  if (!subCtx || (subCtx.subId && stepId === subCtx.stepId && pos === subCtx.pos0)) return null;
  return { stepId, slot: Number(pos.slice(2)) || 0, join: pos[0] === 'j', at: Infinity };
}
/* Pending, Blocked, Cancelled thì hiện ô lý do, nhãn theo trạng thái (giữ chữ đã gõ khi đổi qua lại; lưu với trạng thái
 * không có lý do thì bỏ). */
function paintReason() {
  const st = field($('sub-form'), 'status').value;
  const ta = field($('sub-form'), 'reason');
  $('sub-reason').hidden = !hasReason(st);
  if (!hasReason(st)) return;
  $('sub-reason-label').textContent = REASON_LABEL[st];
  ta.placeholder = ta.dataset['ph' + st[0].toUpperCase() + st.slice(1)] || '';
}

/** Bước con của hộp đang mở và bước chứa nó (tìm theo id ở mọi bước: tab khác có thể đã dời nó). */
function subFromCtx() {
  const ws = subCtx && findWs(subCtx.wsId);
  if (!ws || !subCtx.subId) return { ws, step: ws && stepOf(ws, subCtx.stepId), sub: null };
  for (const st of ws.steps) {
    const sub = st.subs.find((/** @type {any} */ x) => x.id === subCtx.subId);
    if (sub) return { ws, step: st, sub };
  }
  return { ws, step: null, sub: null };
}

/** Gắn sự kiện, chạy một lần lúc khởi động (main.js gọi theo thứ tự). */
export function initSubDialog() {
  field($('sub-form'), 'step').addEventListener('change', () => { subPosOptions(false); repaintPlace('sub'); });
  field($('sub-form'), 'pos').addEventListener('change', () => repaintPlace('sub'));

  /* Bảy viên trạng thái nằm sẵn trong HTML; chữ giải thích của mỗi viên lấy từ core/model.js. */
  for (const r of /** @type {any} */ ($('sub-status').querySelectorAll('input[name="status"]'))) r.closest('label').title = STATUS_HINT[r.value];
  $('sub-status').addEventListener('change', () => {
    paintReason();
    /* Chỉ Cancelled đưa focus vào ô lý do: lý do của Pending, Blocked không bắt buộc, và mũi tên trong nhóm viên phải đi tiếp. */
    if (field($('sub-form'), 'status').value === 'cancel') focusField(field($('sub-form'), 'reason'));
  });

  /* Lưu: chỉ trường đã đổi so với lúc mở hộp đè lên bản đang lưu (tab khác có thể đã ghi); ô song song do chỗ đặt quyết định;
   * dấu Redo do vòng của bước quyết định (moveSubTo bỏ dấu khi sang bước khác). */
  $('sub-form').addEventListener('submit', async (/** @type {any} */ e) => {
    e.preventDefault();
    const f = $('sub-form');
    const ctx = /** @type {any} */ (subCtx);
    const F = EDIT_FIELDS.sub;
    const mine = pick(normSub({ title: field(f, 'title').value, status: field(f, 'status').value, due: field(f, 'due').value,
      doneWhen: field(f, 'doneWhen').value, notes: field(f, 'notes').value, reason: field(f, 'reason').value, ...readEdit(f) }), F);
    const held0 = heldNow(ctx.wsId);
    let { ws, step, sub } = subFromCtx();
    /** @type {any} */ let item = null;
    if (ws && ctx.subId && !sub) {
      const again = await askRecreate(`"${ctx.orig.title}"`);
      if (again === null) return;
      if (!again) { closeSaved($('dlg-sub')); return; }
      ({ ws, step, sub } = subFromCtx());
      if (!sub) {
        item = normSub({ ...ctx.orig, ...mine, status: ctx.orig.status, redo: false });
        setStatus(item, mine.status);
        item.reason = mine.reason;
      }
    }
    if (ws && sub) {
      const merged = await mergeSaved(ws, pick(ctx.orig, F), mine, () => pick(subFromCtx().sub || {}, F));
      if (!merged) return;
      ({ ws, step, sub } = subFromCtx());
      if (sub) {
        const n = normSub({ ...sub, ...merged });
        setStatus(sub, n.status); // doneAt theo lần đổi trạng thái
        Object.assign(sub, pick(n, F));
      }
    }
    const target = ws && (stepOf(ws, field(f, 'step').value) || step || stepOf(ws, ctx.stepId));
    closeSaved($('dlg-sub'));
    if (!ws || !target || (ctx.subId && !sub && !item)) { toast('Not saved: the step was deleted elsewhere.'); return; }
    if (!ctx.subId) {
      item = normSub({ ...mine, status: 'todo', redo: false });
      setStatus(item, mine.status);
      item.reason = mine.reason;
    }
    const pos = String(field(f, 'pos').value || 'n:999');
    const to = { stepId: target.id, slot: Number(pos.slice(2)) || 0, join: pos[0] === 'j', at: Infinity };
    if (sub) item = sub;
    if (curId !== ws.id) switchTo(ws.id);
    const focusSel = `${subSel(item.id, 'edit-sub')} || ${stepSel(target.id, 'add-sub')} || #q`;
    const moved = !!sub && (target.id !== ctx.stepId || pos !== ctx.pos0);
    if (moved) moveSubTo(ws, sub, to, focusSel, held0);
    else {
      if (!sub) placeSub(ws, item, to);
      commit(focusSel);
    }
    const heldMsg = moved ? '' : newlyHeld(ws, held0, HELD_TAIL);
    if (!document.querySelector(`.card[data-sub="${item.id}"]`)) toast((sub ? 'Saved — hidden by the filter.' : 'Added — hidden by the filter.') + heldMsg);
    else if (heldMsg) toast(`${sub ? 'Saved' : 'Added'} ${quote(item.title)}${heldMsg}`, null, focusSel);
    else if (item.status === 'done' && ctx.orig?.status !== 'done') evidenceHint(target, item);
  });
  /* Nhân bản bản đã lưu; chữ đang sửa chưa lưu thì hỏi lại như Đóng. */
  $('sub-dup').addEventListener('click', async () => {
    if (!(await tryClose($('dlg-sub')))) return;
    const { step, sub } = subFromCtx();
    if (step && sub) duplicateSub(step, sub);
  });
  $('sub-del').addEventListener('click', () => {
    const { ws, step, sub } = subFromCtx();
    closeSaved($('dlg-sub'));
    if (ws && step && sub) deleteSub(ws.id, step.id, sub.id);
  });
}
