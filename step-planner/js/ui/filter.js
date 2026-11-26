// @ts-check
/* Tìm và lọc trạng thái (mỗi tab một bộ lọc, không lưu); dòng "Next waits on" (nextWaitingOn) và nút lọc Actionable;
   bỏ lọc khi nhảy tới thẻ đang bị ẩn (unfilter).
   Xuất: resetFilters, clearFilter, renderNextWait, unfilter, initFilter.
   Dùng: core/board.js, core/model.js, ui/dom.js, ui/move.js, ui/render.js, ui/state.js. */
import { inGroup, nextWaitingOn } from '../core/board.js';
import { STATUS_LABEL } from '../core/model.js';
import { $, h, icon } from './dom.js';
import { flash } from './move.js';
import { render } from './render.js';
import { refocus, subSel, ui } from './state.js';

/* ── Lọc ── */

/** Bỏ chữ tìm và lọc trạng thái (chưa vẽ lại). */
export function resetFilters() {
  ui.q = '';
  $('q').value = '';
  ui.st = '';
  $('st-filter').value = '';
}
export function clearFilter() {
  resetFilters();
  render();
  $('q').focus();
}

/* "Next" đang chờ (nextWaitingOn): một dòng trên bảng nói chờ thẻ nào, lý do; bấm tên là tới thẻ; còn việc làm được ở chỗ
 * khác thì nút lọc "Actionable". "Next" vẫn không vượt qua chỗ chờ (PLAN-003). */
export function renderNextWait(/** @type {any} */ ws) {
  const box = $('next-wait');
  const wait = ws ? nextWaitingOn(ws) : [];
  box.hidden = !wait.length;
  if (!wait.length) { box.replaceChildren(); return; }
  const more = ws.steps.flatMap((/** @type {any} */ s) => s.subs).filter((/** @type {any} */ x) => inGroup('act', x.status)).length;
  /* Tên và lý do dài thì cắt "…" (đọc đủ trên thẻ). */
  const short = (/** @type {string} */ t) => (t.length > 60 ? t.slice(0, 59) + '…' : t);
  const why = (/** @type {any} */ x) => {
    const r = x.reason.split('\n')[0];
    return ` (${STATUS_LABEL[x.status]}${r ? ': ' + short(r) : ''})`;
  };
  const shown = wait.slice(0, 2);
  box.replaceChildren(icon('wait'), h('span', {}, h('b', {}, 'Next waits on '),
    ...shown.flatMap((x, k) => [k ? ', ' : '', h('button', { type: 'button', class: 'link', 'data-goto': x.id, title: 'Go to this card' }, short(x.title)), why(x)]),
    wait.length > shown.length ? ` and ${wait.length - shown.length} more` : '', '.'),
  more > 0 && ui.st !== 'act' && h('button', { type: 'button', class: 'btn small', 'data-act': 'show-act' },
    `Show what can be done now (${more})`));
}

/* Tới một thẻ đang bị ô tìm hay lọc trạng thái ẩn: bỏ cả hai, không lấy focus (Bàn giao đưa focus tới thẻ). */
export const unfilter = () => { resetFilters(); render(); };

/** Gắn sự kiện, chạy một lần lúc khởi động (main.js gọi theo thứ tự). */
export function initFilter() {
  $('q').addEventListener('input', (/** @type {any} */ e) => { ui.q = e.target.value; render(); });
  /* Lọc theo nhóm trạng thái: như tìm, tắt sắp xếp và thêm bước; số, "Next" vẫn tính trên cả dự án. */
  $('st-filter').addEventListener('change', (/** @type {any} */ e) => { ui.st = e.target.value; render(); });

  $('next-wait').addEventListener('click', (/** @type {any} */ e) => {
    const go = e.target.closest('[data-goto]');
    if (go) {
      const id = go.dataset.goto;
      if (!document.querySelector(`.card[data-sub="${id}"]`)) { resetFilters(); render(); }
      flash('sub', id, null);
      refocus(subSel(id, 'edit-sub'));
    } else if (e.target.closest('[data-act="show-act"]')) {
      ui.st = 'act';
      $('st-filter').value = 'act';
      render();
      refocus('#board .card[data-sub] [data-act="edit-sub"] || .st-filter .dd-btn');
    }
  });
}
