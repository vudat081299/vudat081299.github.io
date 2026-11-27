// @ts-check
/* Dựng một hàng của bảng (stepRow): vạch "Add step", mũi tên bàn giao, đầu bước (số, tên, mục tiêu, Done when, ghi chú,
   chip In / Out, tiến độ, nút), băng Reopened, dải tài liệu, hàng thẻ theo ô; chip trạng thái, dấu bằng chứng, chip tài liệu.
   Xuất: stepRow.
   Dùng: core/board.js, core/io.js, core/model.js, ui/board.js, ui/clamp.js, ui/dom.js, ui/hand.js, ui/log.js. */
import { canReopen, progress, redoCount, slotsOf } from '../core/board.js';
import { plural } from '../core/io.js';
import { REASON_LABEL, STATUS_LABEL, nextStatus, outOfScope } from '../core/model.js';
import { numTag } from './board.js';
import { cardNotes } from './clamp.js';
import { barFill, fmtDate, h, icon, iconBtn, withLinks } from './dom.js';
import { gapItem, ioDots, rowMarker, tags } from './hand.js';
import { iterTag } from './log.js';
/** @typedef {import('../core/handoffs.js').IoStatus} IoStatus */

/** Dựng một hàng (bước). Thứ tự DOM là thứ tự đọc ở một cột và vòng Tab: vạch "Add step", mũi tên bàn giao, đầu bước,
 * băng Reopened, dải tài liệu, hàng thẻ theo ô. Màn rộng xếp chỗ bằng dòng, cột lưới (`css/board.css`), không đổi DOM.
 * @param {any} step @param {number} i @param {any[]} visible
 * @param {{filtering:boolean, todayStr:string, nextIds:Set<string>, labels:Map<string,string>, keep:{notes:Set<string>, open:Set<string>}, reopenedOn:Map<string,string>, hand:any, io:Map<string, IoStatus>}} ctx */
export function stepRow(step, i, visible, ctx) {
  const { filtering, todayStr, nextIds, labels, keep, reopenedOn, hand, io } = ctx;
  const stepTags = tags(step).filter(Boolean);
  const prog = progress(step.subs);
  const done = prog.total > 0 && prog.done === prog.total;
  const head = h('div', { class: 'step-head', id: 'sh-' + step.id },
    h('div', { class: 'step-top' },
      !filtering && h('span', { class: 'step-grip', title: 'Drag to move the step (keyboard: Alt + ↑ ↓ on its name)', 'aria-hidden': 'true' }, icon('grip')),
      numTag('step-num', labels.get(step.id)),
      h('h2', { class: 'step-title', id: 'st-' + step.id },
        h('button', { type: 'button', class: 'link', 'data-act': 'edit-step', 'aria-label': `Step ${labels.get(step.id) ?? '(added this session)'}: ${step.title}. Edit`, 'aria-keyshortcuts': 'Alt+ArrowUp Alt+ArrowDown' },
          h('span', { class: 'clamp' }, step.title))),
      ioDots(io.get(step.id))),
    reopenedOn.has(step.id) && iterTag(step, reopenedOn.get(step.id)),
    step.goal && h('p', { class: 'step-goal clamp' }, step.goal),
    step.doneWhen && h('p', { class: 'step-done clamp' }, h('span', { class: 'lbl' }, 'Done when '), step.doneWhen),
    step.notes && h('details', { class: 'step-notes', open: keep.notes.has(step.id) }, h('summary', {}, icon('chev'), 'Notes'), h('p', { class: 'notes-text clamp' }, withLinks(step.notes))),
    stepTags.length > 0 && h('div', { class: 'hand-tags' }, stepTags),
    h('div', { class: 'prog' },
      h('span', {}, `${prog.done}/${prog.total}`, h('span', { class: 'sr' }, ' sub-steps done')),
      h('span', { class: 'bar-prog', 'aria-hidden': 'true' }, barFill(prog.pct))),
    h('div', { class: 'acts' },
      h('button', { type: 'button', class: 'btn small', 'data-act': 'add-sub' }, icon('plus'), 'Sub-step'),
      /* Nút phụ chỉ biểu tượng (tên ở aria-label, title): cả hàng nằm gọn một dòng trong cột tên bước. */
      !step.revisit && canReopen(step) && iconBtn('redo', 'Reopen step: a later step showed this one must be redone', 'revisit'),
      !step.docs.length && iconBtn('clip', 'Add a doc: a link or a Markdown note for the whole step', 'add-doc'),
      iconBtn('trash', 'Delete step', 'del-step')));
  /* Băng "Reopened": vòng, ngày, lý do (bấm để sửa), còn mấy việc phải làm lại; làm lại xong hết thì mời đóng vòng. */
  const redo = redoCount(step);
  const band = step.revisit && h('div', { class: 'revisit-band' + (redo.total && !redo.left ? ' all-redone' : '') },
    icon('redo'),
    h('button', { type: 'button', class: 'badge', 'data-act': 'revisit', title: 'Edit the reason' }, h('span', { class: 'clamp' },
      h('b', {}, 'Reopened'),
      ' · Iteration ' + step.revisit.round,
      step.revisit.date ? ' · ' + fmtDate(step.revisit.date) : '',
      step.revisit.reason ? ' · ' + step.revisit.reason : '')),
    redo.total > 0 && h('span', { class: 'redo-left' }, redo.left ? `${redo.left} of ${plural(redo.total, 'redo task')} left` : `All ${plural(redo.total, 'redo task')} done`),
    h('button', { type: 'button', class: 'btn small' + (redo.total && !redo.left ? ' go' : ''), 'data-act': 'revisit-clear',
      title: 'Finish this iteration: remove the band and the Redo marks' }, 'Close iteration'));
  const card = (/** @type {any} */ x) => {
    const overdue = x.due && x.due < todayStr && x.status !== 'done' && !outOfScope(x.status);
    const isNext = nextIds.has(x.id);
    const doneOn = x.status === 'done' && x.doneAt;
    return h('div', { class: `card st-${x.status}${isNext ? ' next' : ''}`, 'data-sub': x.id },
      h('div', { class: 'card-top' },
        numTag('num', labels.get(x.id)),
        isNext && h('span', { class: 'next-tag' }, 'Next'),
        x.redo && x.status !== 'done' && !outOfScope(x.status) && h('span', { class: 'redo-tag', title: `Sent back to redo in iteration ${step.revisit?.round}` }, icon('redo'), 'Redo'),
        x.docs.length > 0 && h('button', { type: 'button', class: 'doc-tag', 'data-act': 'sub-docs', tabindex: '-1',
          'aria-label': `${plural(x.docs.length, 'doc')}. Open the list`, title: x.docs.map((/** @type {any} */ d) => d.title).join('\n') },
        icon('clip'), String(x.docs.length)),
        proofTag(x),
        ioDots(io.get(x.id)),
        statusChip(x)),
      h('div', { class: 'card-body' },
        h('h3', { class: 'card-title' }, h('button', { type: 'button', class: 'link', 'data-act': 'edit-sub', 'aria-keyshortcuts': 'Alt+ArrowLeft Alt+ArrowRight Alt+ArrowUp Alt+ArrowDown' }, h('span', { class: 'clamp' }, x.title))),
        (x.due || doneOn) && h('p', { class: 'meta' },
          x.due && h('span', { class: 'due' + (overdue ? ' overdue' : '') }, 'due ' + fmtDate(x.due) + (overdue ? ' (overdue)' : '')),
          doneOn && h('span', { class: 'done-at', title: `Marked Done on ${fmtDate(x.doneAt)}` }, 'done ' + fmtDate(x.doneAt))),
        x.reason && h('p', { class: 'card-reason clamp' }, h('span', { class: 'lbl' }, REASON_LABEL[x.status] + ' '), withLinks(x.reason)),
        x.doneWhen && h('p', { class: 'card-done clamp' }, h('span', { class: 'lbl' }, 'Done when '), x.doneWhen),
        x.notes && cardNotes(x.notes, keep.open.has(x.id))),
      h('div', { class: 'acts' },
        iconBtn('parallel', 'Add a parallel sub-step (runs alongside this one)', 'add-par'),
        iconBtn('copy', 'Duplicate', 'sub-dup'),
        iconBtn('trash', 'Delete', 'sub-del')));
  };
  /* Mỗi ô một cột của hàng; ô song song xếp chồng các thẻ của nó. */
  const shownIds = new Set(visible.map((/** @type {any} */ x) => x.id));
  /* Giữa ô k và ô k + 1 có bàn giao: một nút chung (ẩn khi đang lọc). */
  const gaps = filtering ? null : hand.gaps.get(step.id);
  const slots = slotsOf(step.subs).flatMap((sl, si) => {
    const vis = sl.filter((x) => shownIds.has(x.id));
    const pairs = gaps?.get(si) || [];
    return [vis.length > 0 && h('li', { class: 'slot' + (sl.length > 1 ? ' par' : ''), 'data-slot': String(si),
      'aria-label': sl.length > 1 ? `${sl.length} parallel sub-steps` : null }, vis.map(card)), pairs.length > 0 && gapItem(si, pairs)];
  });
  const rowPairs = filtering ? [] : hand.rows.get(i) || [];
  /* Tài liệu của cả bước: dải chip ngay sau băng Reopened (hay ở chỗ ấy khi không có băng), trước hàng thẻ. */
  const docs = step.docs.length > 0 && h('div', { class: 'step-docs' },
    h('ul', { class: 'doc-chips', 'aria-label': `Docs of step ${i + 1}` }, step.docs.map(docChip)),
    h('button', { type: 'button', class: 'doc-chip add aux', 'data-act': 'add-doc', tabindex: '-1', 'aria-label': 'Add a doc to this step', title: 'Add a link or a Markdown note for the whole step' }, icon('plus'), 'Doc'));
  /* Vạch chia phía trên bước: rê chuột vào thì hiện nút "Add step" chèn bước mới vào chỗ này (nút nổi, không đẩy bố cục). */
  const gap = !filtering && h('div', { class: 'gap-add' },
    h('button', { type: 'button', class: 'gap-add-btn', 'data-act': 'insert-step', 'data-at': String(i), tabindex: '-1',
      'aria-label': `Add a step before step ${i + 1}`, title: `Add a step here (before step ${i + 1})` }, icon('plus'), h('span', {}, 'Add step')));
  return h('section', { class: 'step' + (step.revisit ? ' revisit' : '') + (done ? ' is-done' : ''), 'data-step': step.id, 'aria-labelledby': 'st-' + step.id },
    gap,
    rowPairs.length > 0 && rowMarker(rowPairs),
    head,
    band,
    docs,
    h('div', { class: 'cards-scroll' }, h('ol', { class: 'cards', 'aria-label': `Sub-steps of step ${labels.get(step.id) ?? step.title}` }, slots)));
}

/** Chip trạng thái: New, In progress bấm là sang trạng thái kế; Done và các trạng thái khác bấm là mở danh sách.
 * Shift + bấm hoặc Alt + ↓ luôn mở danh sách. @param {any} x */
function statusChip(x) {
  const label = STATUS_LABEL[x.status];
  const nx = nextStatus(x.status);
  const how = nx ? `Click: ${STATUS_LABEL[nx]}. Shift-click or Alt+Down: all statuses` : 'Click: choose a status';
  return h('button', { type: 'button', class: `chip st-${x.status}`, 'data-act': 'status', 'aria-haspopup': nx ? null : 'listbox',
    'aria-expanded': nx ? null : 'false', 'aria-keyshortcuts': 'Alt+ArrowDown', 'aria-label': `Status: ${label}. ${how}`, title: how }, label);
}

/** Dấu bằng chứng trên thẻ xong có tài liệu `proof` (mốc nghiệm thu có đầu ra kiểm được). @param {any} x */
function proofTag(x) {
  const proof = x.status === 'done' ? x.docs.filter((/** @type {any} */ d) => d.proof) : [];
  if (!proof.length) return null;
  const t = `Evidence: ${proof.map((/** @type {any} */ d) => d.title).join(', ')}`;
  return h('span', { class: 'proof-tag', role: 'img', 'aria-label': t, title: t }, icon('proof'));
}

/** Một tài liệu của bước (chip): link mở tab mới, văn bản mở hộp đọc. @param {any} d */
function docChip(d) {
  return h('li', {}, d.kind === 'link'
    ? h('a', { class: 'doc-chip', href: d.url, target: '_blank', rel: 'noopener noreferrer', title: `${d.title}\n${d.url}`, 'data-doc': d.id }, icon('link'), h('span', {}, d.title))
    : h('button', { type: 'button', class: 'doc-chip', 'data-act': 'open-doc', 'data-doc': d.id, title: d.title }, icon('doc'), h('span', {}, d.title)));
}
