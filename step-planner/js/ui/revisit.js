// @ts-check
/* Mở lại một bước (PLAN-004, #dlg-revisit): lý do, chọn bước con đã xong để làm lại, "Also check" (nơi dùng đầu ra),
   ghi nhật ký; sửa lý do; đóng vòng; mỗi việc một Hoàn tác.
   Xuất: openRevisit, closeIteration, initRevisit.
   Dùng: core/board.js, core/io.js, core/model.js, ui/board.js, ui/dialogs.js, ui/dom.js, ui/hand.js, ui/projects.js,
     ui/state.js, ui/toast.js. */
import { canReopen } from '../core/board.js';
import { plural } from '../core/io.js';
import { STATUS_LABEL, normLog, oneLine, setStatus, today } from '../core/model.js';
import { labelsOf, numTag } from './board.js';
import { closeSaved, openDlg } from './dialogs.js';
import { $, field, h } from './dom.js';
import { alsoCheck } from './hand.js';
import { switchTo } from './projects.js';
import { commit, cur, curId, findWs, stepOf, stepSel } from './state.js';
import { toast } from './toast.js';

/* ── Quay lại bước này ── */

let revisitCtx = { wsId: '', stepId: '' };
/** Hộp "Reopen step": mở lại thì có lý do (bắt buộc) và danh sách bước con đã xong để gửi lại làm; đang mở lại thì chỉ sửa
 * lý do hay đóng vòng. Chưa có bước con nào xong thì không mở lại (nút cũng không hiện). @param {any} step */
export function openRevisit(step) {
  if (!step.revisit && !canReopen(step)) return;
  const ws = cur();
  revisitCtx = { wsId: ws.id, stepId: step.id };
  const labels = labelsOf(ws);
  $('revisit-step').textContent = `Step ${labels.get(step.id) ?? ''} · ${step.title}`;
  $('dlg-revisit-title').textContent = step.revisit ? `Iteration ${step.revisit.round}` : 'Reopen step';
  $('revisit-help').hidden = !!step.revisit;
  field($('revisit-form'), 'reason').value = step.revisit ? step.revisit.reason : '';
  const done = step.subs.filter((/** @type {any} */ x) => x.status === 'done');
  $('revisit-subs').hidden = !!step.revisit;
  $('revisit-round').textContent = `This starts iteration ${(step.round || 1) + 1}. Picked sub-steps go back to ${STATUS_LABEL.todo} with a Redo mark.`;
  $('revisit-all-done').hidden = done.length < 2;
  $('revisit-list').replaceChildren(...done.map((/** @type {any} */ x) => h('li', {},
    h('label', { class: 'reset-item' },
      h('input', { type: 'checkbox', name: 'reset', value: x.id }),
      numTag('num', labels.get(x.id)), h('span', { class: 'reset-title' }, x.title),
      h('span', { class: `chip st-${x.status}` }, STATUS_LABEL[x.status])))));
  $('revisit-clear').hidden = !step.revisit;
  paintAlsoCheck();
  /** @type {any} */ ($('revisit-form').querySelector('button[type="submit"]')).textContent = step.revisit ? 'Save reason' : 'Reopen step';
  openDlg($('dlg-revisit'), field($('revisit-form'), 'reason'));
}
const revisitStep = () => stepOf(findWs(revisitCtx.wsId), revisitCtx.stepId);
const revisitPicked = () => [...$('revisit-list').querySelectorAll('input[name="reset"]:checked')].map((/** @type {any} */ cb) => cb.value);
/* Đầu ra của bước, của bước con được chọn làm lại đang được nơi khác dùng: "Also check" liệt kê nơi ấy, ghi vào nhật ký. */
function paintAlsoCheck() {
  const step = revisitStep();
  const names = step && !step.revisit ? alsoCheck(findWs(revisitCtx.wsId), step, revisitPicked()) : [];
  $('revisit-also').hidden = !names.length;
  $('revisit-also-text').textContent = names.join(', ');
}

/** Trạng thái, dấu Redo của các bước con, để Hoàn tác. @param {any} step */
const subMarks = (step) => new Map(step.subs.map((/** @type {any} */ x) => [x.id, { status: x.status, redo: x.redo, doneAt: x.doneAt }]));
/** @param {any} step @param {Map<string, {status:string, redo:boolean, doneAt:string}>} marks */
const restoreMarks = (step, marks) => { for (const x of step.subs) if (marks.has(x.id)) Object.assign(x, marks.get(x.id)); };

/** Đóng vòng: bỏ băng và mọi dấu Redo (vòng giữ để lần mở lại sau tăng tiếp); Hoàn tác được. @param {string} wsId @param {string} stepId */
export function closeIteration(wsId, stepId) {
  const step = stepOf(findWs(wsId), stepId);
  if (!step || !step.revisit) return;
  const before = { revisit: step.revisit, marks: subMarks(step) };
  step.revisit = null;
  for (const x of step.subs) x.redo = false;
  commit(stepSel(step.id, 'edit-step'));
  toast(`Iteration ${before.revisit.round} closed.`, () => {
    const s = stepOf(findWs(wsId), stepId);
    if (!s) { toast('Cannot undo: the step was deleted.'); return; }
    s.revisit = before.revisit;
    s.round = Math.max(s.round, before.revisit.round);
    restoreMarks(s, before.marks);
    if (curId !== wsId) switchTo(wsId);
    commit(`.step[data-step="${stepId}"] .badge`);
  }, stepSel(step.id, 'edit-step'), false);
}

/** Gắn sự kiện, chạy một lần lúc khởi động (main.js gọi theo thứ tự). */
export function initRevisit() {
  $('revisit-list').addEventListener('change', paintAlsoCheck);
  $('revisit-all-done').addEventListener('click', () => {
    for (const cb of /** @type {any} */ ($('revisit-list').querySelectorAll('input[name="reset"]'))) cb.checked = true;
    paintAlsoCheck();
  });

  /* Mở lại: vòng mới, bước con đã chọn về New và mang dấu Redo, ghi một dòng nhật ký; một Hoàn tác trả hết. */
  $('revisit-form').addEventListener('submit', (/** @type {any} */ e) => {
    e.preventDefault();
    const { wsId, stepId } = revisitCtx;
    const ws = findWs(wsId);
    const step = revisitStep();
    const reason = oneLine(field($('revisit-form'), 'reason').value);
    const picked = revisitPicked();
    closeSaved($('dlg-revisit'));
    if (!ws || !step) return;
    const focusSel = `.step[data-step="${step.id}"] .badge || ${stepSel(step.id, 'edit-step')}`;
    if (step.revisit) { step.revisit.reason = reason; commit(focusSel); return; }
    const before = { round: step.round, marks: subMarks(step) };
    const round = (step.round || 1) + 1;
    step.round = round;
    step.revisit = { reason, date: today(), round };
    let n = 0;
    for (const x of step.subs) {
      x.redo = false;
      if (!picked.includes(x.id)) continue;
      setStatus(x, 'todo');
      x.redo = true;
      n++;
    }
    const also = alsoCheck(ws, step, picked);
    const why = [reason, also.length ? `Also check: ${also.join(', ')}` : ''].filter(Boolean).join('\n');
    const entry = normLog({ date: today(), decision: `Reopened: ${step.title} (iteration ${round})`, why, stepId: step.id });
    ws.log.push(entry);
    commit(focusSel);
    toast(`Step reopened · iteration ${round}${n ? ` · ${plural(n, 'sub-step')} to redo` : ''} · logged.`, () => {
      const w = findWs(wsId);
      const s = stepOf(w, stepId);
      if (!w) { toast('Cannot undo: the project was deleted.'); return; }
      if (s) {
        s.revisit = null;
        s.round = before.round;
        restoreMarks(s, before.marks);
      }
      w.log = w.log.filter((/** @type {any} */ l) => l.id !== entry.id);
      if (curId !== wsId) switchTo(wsId);
      commit(s ? stepSel(stepId, 'edit-step') : '#board');
    }, focusSel, false);
  });

  $('revisit-clear').addEventListener('click', () => {
    const step = revisitStep();
    closeSaved($('dlg-revisit'));
    if (step) closeIteration(revisitCtx.wsId, step.id);
  });
}
