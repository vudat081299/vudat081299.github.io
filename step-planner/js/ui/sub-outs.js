// @ts-check
/* Đầu ra bước chọn từ bước con (`subOuts`) trong hộp sửa bước: danh sách đã chọn (dấu "from <bước con>", nơi dùng, nút bỏ), danh
 * sách nổi chọn nhiều, nhóm theo bước con (ui/dropdown.js). Tham chiếu, không chép: tên, ref, hợp đồng, Final sửa ở bước con.
 * Bản nháp ở ô ẩn `subOuts` của form, lưu cùng Save như Inputs / Outputs (hỏi lại khi đóng mà chưa lưu).
 * Logic thuần: core/handoffs.js (chosenOuts; bước con rời bước thì commit bỏ lựa chọn). Chữ người dùng chỉ vào DOM qua text node.
 * Xuất: paintSubOuts, chosenDraft, initSubOuts.
 * Dùng: core/handoffs.js, ui/board.js, ui/dom.js, ui/dropdown.js, ui/hand.js, ui/state.js. */
import { handoffs, holderTitle } from '../core/handoffs.js';
import { labelsOf } from './board.js';
import { $, field, focusFirst, h, icon } from './dom.js';
import { consumeJustClosed, openList } from './dropdown.js';
import { outsNote } from './hand.js';
import { findWs, stepOf } from './state.js';

/** Hộp sửa bước đang mở: dự án, bước (rỗng khi thêm mới), id đầu ra bước con đã chọn theo thứ tự chọn. */
let draft = { wsId: '', stepId: '', ids: /** @type {string[]} */ ([]) };
const sec = () => $('step-hand');

/** Đầu ra của các bước con của bước đang sửa, theo thứ tự trên bảng (bản đã lưu: đầu ra bước con sửa ở hộp của bước con). */
function candidates() {
  const ws = findWs(draft.wsId);
  const step = ws && draft.stepId ? stepOf(ws, draft.stepId) : null;
  return step ? step.subs.flatMap((/** @type {any} */ sub) => sub.outs.map((/** @type {any} */ out) => ({ out, sub }))) : [];
}
/** Số đầu ra bước con đang chọn trong hộp (hand.js đọc cho dòng ghi chú của phần Outputs) và số có thể chọn. */
export function chosenDraft() {
  const cands = candidates();
  return { chosen: draft.ids.filter((id) => cands.some((c) => c.out.id === id)).length, offered: cands.length };
}

/** Mở hộp sửa bước: dựng phần "From sub-steps" từ bản đã lưu (null: bước mới, chưa có bước con). @param {any} ws @param {any} step */
export function paintSubOuts(ws, step) {
  draft = { wsId: ws.id, stepId: step ? step.id : '', ids: step ? [...step.subOuts] : [] };
  sync();
  paint();
}
function sync() {
  field($('step-form'), 'subOuts').value = JSON.stringify(draft.ids);
}

/** Nơi dùng của một đầu ra, một dòng. @param {Map<string, any[]>} used @param {any} o */
function usedLine(used, o) {
  const by = used.get(o.id) || [];
  return by.length ? `Used by ${by.map(holderTitle).join(', ')}` : o.final ? 'Final deliverable, not needed later' : 'Not used yet';
}

function paint() {
  const ws = findWs(draft.wsId);
  const cands = candidates();
  const used = ws ? handoffs(ws).usedBy : new Map();
  const rows = draft.ids.map((id) => cands.find((c) => c.out.id === id)).filter(Boolean).map(({ out: o, sub }) =>
    h('li', { class: 'sub-out', 'data-sub-out': o.id, title: `Edit its name, path, contract and Final in sub-step "${sub.title}"` },
      icon('out'),
      h('div', { class: 'sub-out-text' },
        h('p', { class: 'sub-out-name' }, h('b', {}, o.name),
          o.final && h('span', { class: 'final-tag', title: 'Final deliverable: no later step needs it' }, 'Final')),
        h('p', { class: 'sub-out-meta' }, h('span', { class: 'from-tag' }, 'from ', h('b', {}, sub.title)), o.ref && h('code', {}, o.ref)),
        h('small', {}, usedLine(used, o))),
      h('button', { type: 'button', class: 'icon-btn', 'data-sub-out-del': '', 'aria-label': `Remove "${o.name}" from this step's outputs (it stays on "${sub.title}")`,
        title: 'Remove from step outputs (stays on the sub-step)' }, icon('x'))));
  sec().querySelector('[data-sub-outs]').replaceChildren(...rows);
  /** @type {HTMLButtonElement} */ (sec().querySelector('[data-out-pick]')).disabled = !cands.length;
  outsNote('step');
}

/** Danh sách nổi dưới nút "From sub-steps": nhóm theo bước con (số thẻ · tên), mỗi đầu ra một mục; chọn / bỏ, danh sách vẫn mở.
 * @param {HTMLElement} btn */
function openPicker(btn) {
  const ws = findWs(draft.wsId);
  const lb = ws ? labelsOf(ws) : new Map();
  const items = candidates().map(({ out: o, sub }) => ({
    value: o.id, label: o.name, group: `${lb.get(sub.id) ?? '·'} · ${sub.title}`, selected: draft.ids.includes(o.id),
    hint: [o.ref, o.final && 'Final'].filter(Boolean).join(' · ') || undefined, tip: `${o.name}${o.ref ? ' · ' + o.ref : ''} (from "${sub.title}")`,
  }));
  openList(btn, items, (v) => {
    draft.ids = draft.ids.includes(v) ? draft.ids.filter((x) => x !== v) : [...draft.ids, v];
    sync();
    paint();
  }, { multi: true, label: 'Sub-step outputs to use as outputs of this step', className: 'dd-subouts' });
}

/** Gắn sự kiện, chạy một lần lúc khởi động (main.js gọi theo thứ tự). */
export function initSubOuts() {
  const s = sec();
  const btn = /** @type {HTMLElement} */ (s.querySelector('[data-out-pick]'));
  btn.addEventListener('click', () => { if (!consumeJustClosed(btn)) openPicker(btn); });
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openPicker(btn); }
  });
  s.addEventListener('click', (/** @type {any} */ e) => {
    const del = e.target.closest('[data-sub-out-del]');
    if (!del) return;
    const row = del.closest('[data-sub-out]');
    const next = row.nextElementSibling || row.previousElementSibling;
    draft.ids = draft.ids.filter((x) => x !== row.dataset.subOut);
    sync();
    paint();
    const again = next && s.querySelector(`[data-sub-out="${next.dataset.subOut}"] [data-sub-out-del]`);
    focusFirst(again, btn, s.querySelector('[data-out-add]'));
  });
}
