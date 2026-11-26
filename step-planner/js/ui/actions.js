// @ts-check
/* Thao tác trên bảng: bấm (sửa, thêm, trạng thái, tài liệu, Reopen, xoá…), Alt + mũi tên (dời), danh sách trạng thái của
   chip, gợi ý bằng chứng khi vừa xong, nhân bản bước con, xoá bước con / bước có Hoàn tác.
   Xuất: evidenceHint, duplicateSub, deleteSub, deleteStep, initActions.
   Dùng: core/board.js, core/handoffs.js, core/io.js, core/model.js, ui/clamp.js, ui/dialogs.js, ui/docs.js, ui/dom.js,
     ui/dropdown.js, ui/filter.js, ui/hand.js, ui/md-dialog.js, ui/move.js, ui/projects.js, ui/revisit.js, ui/state.js,
     ui/step-dialog.js, ui/sub-dialog.js, ui/toast.js. */
import { placeSub, shiftTarget, subPlace, takeSub } from '../core/board.js';
import { insBackup } from '../core/handoffs.js';
import { plural } from '../core/io.js';
import { STATUSES, STATUS_HINT, STATUS_LABEL, needsEvidence, nextStatus, normSub, setStatus } from '../core/model.js';
import { boxKey, markCut, unclip } from './clamp.js';
import { ask } from './dialogs.js';
import { openDocNew } from './docs.js';
import { $, quote } from './dom.js';
import { consumeJustClosed, openList } from './dropdown.js';
import { clearFilter } from './filter.js';
import { boardAct } from './hand.js';
import { openMd } from './md-dialog.js';
import { moveStep, moveSubTo } from './move.js';
import { switchTo } from './projects.js';
import { closeIteration, openRevisit } from './revisit.js';
import { commit, cur, curId, findWs, stepOf, stepSel, subSel } from './state.js';
import { openStep } from './step-dialog.js';
import { openSub } from './sub-dialog.js';
import { toast } from './toast.js';
/** @typedef {import('../core/board.js').Place} Place */

/* ── Hành động trên bảng ── */

/** Vừa xong mà "Done when" chưa có tài liệu bằng chứng: toast gợi ý, nút mở hộp sửa ở phần tài liệu. Không chặn.
 * @param {any} step @param {any} sub */
export function evidenceHint(step, sub) {
  if (!needsEvidence(sub)) return;
  const ids = { wsId: curId, stepId: step.id, subId: sub.id };
  toast(`Done. Add evidence for ${quote(sub.title)}? (a run, report, commit link)`, () => {
    const ws = findWs(ids.wsId);
    const st = ws && ws.steps.find((/** @type {any} */ s) => s.subs.some((/** @type {any} */ x) => x.id === ids.subId));
    const x = st && st.subs.find((/** @type {any} */ y) => y.id === ids.subId);
    if (!x) return;
    if (curId !== ids.wsId) switchTo(ids.wsId);
    openSub(st, x, { toDocs: true });
  }, subSel(sub.id, 'status'), false, 'Add evidence');
}

/** Danh sách mọi trạng thái, mở dưới chip. Chọn Cancelled: mở hộp sửa ở ô lý do (lưu mới huỷ); Pending, Blocked đặt ngay
 * (lý do không bắt buộc, sửa trong hộp). @param {any} chip @param {any} step @param {any} sub */
function openStatusMenu(chip, step, sub) {
  const ids = { wsId: cur().id, stepId: step.id, subId: sub.id };
  openList(chip, STATUSES.map((st) => ({ value: st, label: STATUS_LABEL[st], hint: STATUS_HINT[st], dot: st, selected: st === sub.status })), (v) => {
    const s = stepOf(findWs(ids.wsId), ids.stepId);
    const x = s && s.subs.find((/** @type {any} */ y) => y.id === ids.subId);
    if (!x) return;
    if (v === 'cancel') { openSub(s, x, { status: 'cancel' }); return; }
    if (v === x.status) return;
    setStatus(x, v);
    commit(subSel(x.id, 'status'));
    evidenceHint(s, x);
  }, { label: `Status of "${sub.title}"`, className: 'dd-status' });
}

export function duplicateSub(/** @type {any} */ step, /** @type {any} */ sub) {
  const c = normSub({ ...sub, id: '', title: sub.title + ' (copy)', docs: sub.docs.map((/** @type {any} */ d) => ({ ...d, id: '' })),
    outs: sub.outs.map((/** @type {any} */ o) => ({ ...o, id: '' })), sd: '' }); // bản sao giữ đầu vào; đầu ra mang id mới, nơi dùng vẫn trỏ bản gốc; không mang dấu việc sinh từ System design
  /* Bản sao đứng ngay sau bản gốc: trong cùng ô song song nếu bản gốc ở ô song song, không thì một ô mới. */
  const p = subPlace(cur(), sub.id);
  if (!p) return;
  placeSub(cur(), c, p.join ? { ...p, at: p.at + 1 } : { ...p, slot: p.slot + 1 });
  commit(subSel(c.id, 'edit-sub'));
}

/* Hoàn tác tìm lại dự án và bước theo id: tab khác có thể đã thay cả `state` trong lúc chờ. */
export function deleteSub(/** @type {string} */ wsId, /** @type {string} */ stepId, /** @type {string} */ subId) {
  const ws = findWs(wsId);
  const step = stepOf(ws, stepId);
  const j = step ? step.subs.findIndex((/** @type {any} */ x) => x.id === subId) : -1;
  if (j < 0) return;
  const place = /** @type {Place} */ (subPlace(ws, subId));
  const relink = insBackup(ws, [step.subs[j]]);
  const sub = takeSub(ws, subId);
  commit();
  const back = `${subSel(step.subs[Math.min(j, step.subs.length - 1)]?.id, 'edit-sub')} || ${stepSel(stepId, 'add-sub')}`;
  toast(`Deleted "${sub.title}".`, () => {
    const w = findWs(wsId);
    const s = stepOf(w, stepId);
    if (!w) { toast('Cannot undo: the project was deleted.'); return; }
    if (!s) { toast('Cannot undo: its step was deleted.'); return; }
    if (!s.subs.some((/** @type {any} */ x) => x.id === sub.id)) placeSub(w, sub, place);
    relink(w);
    if (curId !== wsId) switchTo(wsId);
    commit(subSel(sub.id, 'edit-sub'));
  }, back);
}

export async function deleteStep(/** @type {string} */ wsId, /** @type {string} */ stepId) {
  let step = stepOf(findWs(wsId), stepId);
  if (!step) return;
  if (step.subs.length) {
    const ok = await ask({ title: 'Delete step?', text: `"${step.title}" and its ${plural(step.subs.length, 'sub-step')} will be deleted (you can undo right after).`, ok: 'Delete step', danger: true });
    if (ok === null) return;
  }
  const ws = findWs(wsId);
  step = stepOf(ws, stepId);
  if (!step) return;
  const i = ws.steps.indexOf(step);
  const relink = insBackup(ws, [step, ...step.subs]);
  ws.steps.splice(i, 1);
  commit();
  const near = ws.steps[Math.min(i, ws.steps.length - 1)];
  toast(`Deleted step "${step.title}" (${plural(step.subs.length, 'sub-step')}).`, () => {
    const w = findWs(wsId);
    if (!w) { toast('Cannot undo: the project was deleted.'); return; }
    if (!stepOf(w, step.id)) w.steps.splice(Math.min(i, w.steps.length), 0, step);
    relink(w);
    if (curId !== wsId) switchTo(wsId);
    commit(stepSel(step.id, 'edit-step'));
  }, near ? stepSel(near.id, 'edit-step') : '#add-step');
}

/** Gắn sự kiện, chạy một lần lúc khởi động (main.js gọi theo thứ tự). */
export function initActions() {
  $('board').addEventListener('click', (/** @type {any} */ e) => {
    const ws = cur();
    if (!ws) return;
    let b = e.target.closest('[data-act], a, summary');
    if (b && !b.dataset.act) return; // link, mở / đóng ghi chú
    const cardEl = e.target.closest('.card[data-sub]');
    if (!b && cardEl) b = cardEl.querySelector('[data-act="edit-sub"]'); // bấm vào thẻ = sửa
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'clear-filter') { clearFilter(); return; }
    if (act === 'insert-step') { openStep(null, Number(b.dataset.at) || 0); return; }
    if (act === 'more') {
      const box = b.closest('.card, .step-head');
      const open = !box.classList.contains('open');
      if (open && box.classList.contains('card')) unclip(box);
      markCut([box], new Set(open ? [boxKey(box)] : []));
      return;
    }
    const row = b.closest('[data-step]');
    const step = row && stepOf(ws, row.dataset.step);
    if (!step) return;
    const card = b.closest('[data-sub]');
    const sub = card && step.subs.find((/** @type {any} */ x) => x.id === card.dataset.sub);
    if (boardAct(act, b, step, sub)) return;
    switch (act) {
      case 'edit-step': openStep(step); break;
      case 'add-doc': openDocNew({ wsId: ws.id, stepId: step.id, subId: null, docId: null }); break;
      case 'open-doc': openMd({ wsId: ws.id, stepId: step.id, subId: null, docId: b.dataset.doc }); break;
      case 'sub-docs': openSub(step, sub, { toDocs: true }); break;
      case 'revisit': openRevisit(step); break;
      case 'revisit-clear': closeIteration(ws.id, step.id); break;
      case 'del-step': deleteStep(ws.id, step.id); break;
      case 'add-sub': openSub(step, null); break;
      case 'add-par': { const p = subPlace(ws, sub.id); openSub(step, null, { pos: `j:${p ? p.slot : 0}` }); break; }
      case 'status': {
        if (consumeJustClosed(b)) break;
        const nx = nextStatus(sub.status);
        if (nx && !e.shiftKey) { setStatus(sub, nx); commit(subSel(sub.id, 'status')); evidenceHint(step, sub); } else openStatusMenu(b, step, sub);
        break;
      }
      case 'edit-sub': openSub(step, sub); break;
      case 'sub-dup': duplicateSub(step, sub); break;
      case 'sub-del': deleteSub(ws.id, step.id, sub.id); break;
    }
  });

  /* Alt + mũi tên trên tên bước / tên bước con: dời bằng bàn phím. Alt + ↓ trên chip: mở danh sách trạng thái. */
  $('board').addEventListener('keydown', (/** @type {any} */ e) => {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    const ws = cur();
    const act = e.target.dataset && e.target.dataset.act;
    const row = e.target.closest('[data-step]');
    const step = row && stepOf(ws, row.dataset.step);
    if (!step) return;
    if (act === 'status' && e.key === 'ArrowDown') {
      e.preventDefault();
      const sub = step.subs.find((/** @type {any} */ x) => x.id === e.target.closest('[data-sub]').dataset.sub);
      if (sub) openStatusMenu(e.target, step, sub);
      return;
    }
    if ($('board').classList.contains('filtering')) return;
    if (act === 'edit-step' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      moveStep(ws, step, e.key === 'ArrowUp' ? -1 : 1, 'edit-step');
    } else if (act === 'edit-sub' && /^Arrow(Left|Right|Up|Down)$/.test(e.key)) {
      e.preventDefault();
      const sub = step.subs.find((/** @type {any} */ x) => x.id === e.target.closest('[data-sub]').dataset.sub);
      const to = sub && shiftTarget(ws, sub.id, /** @type {any} */ (e.key.slice(5).toLowerCase()));
      if (to) moveSubTo(ws, sub, to);
    }
  });
}
