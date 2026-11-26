// @ts-check
/* Vẽ cả trang theo dự án đang mở (render): đầu dự án, tiến độ chung, chú giải trạng thái, mẹo, ghi chú dự án, nút Log,
   dòng "Next waits on", bảng, System design, nhật ký; chưa có dự án thì màn đầu. Mọi thay đổi đi qua commit() rồi tới đây.
   Xuất: render.
   Dùng: core/board.js, core/io.js, core/model.js, ui/board.js, ui/design.js, ui/dom.js, ui/export.js, ui/filter.js,
     ui/log.js, ui/move.js, ui/start.js, ui/state.js, ui/store.js. */
import * as S from './store.js';
import { mdLabels, renderSection as renderDesign } from './design.js';
import { overall } from '../core/board.js';
import { plural } from '../core/io.js';
import { STATUSES, STATUS_LABEL } from '../core/model.js';
import { renderBoard } from './board.js';
import { $, h, withLinks } from './dom.js';
import { renderNudge } from './export.js';
import { renderNextWait } from './filter.js';
import { renderLog } from './log.js';
import { dragCtl } from './move.js';
import { renderStart } from './start.js';
import { cur } from './state.js';

/* ── Vẽ ── */

/** Vẽ đầu dự án, bảng (theo hàng, xem renderBoard), nhật ký. @param {{full?:boolean}} [opt] */
export function render(opt = {}) {
  dragCtl?.abort();
  const ws = cur();
  $('app').hidden = !ws;
  $('start').hidden = !!ws;
  $('ws-name').textContent = ws ? ws.name : 'No project';
  document.title = ws ? `${ws.name} — Data Science Step Planner` : 'Data Science Step Planner';
  $('overall').hidden = !ws;
  renderNudge();
  if (!ws) { renderStart(); return; }
  const o = overall(ws);
  $('overall-text').textContent = `${o.done}/${o.total} done · ${o.pct}%`;
  $('overall-bar').style.width = o.pct + '%';
  renderLegend(ws);
  $('hint').hidden = S.hintHidden();
  renderWsNotes(ws);
  $('log-btn-text').textContent = `Log (${ws.log.length})`;
  renderNextWait(ws);
  renderBoard(ws, opt);
  const key = designKey(ws);
  if (key !== lastDesign) { lastDesign = key; renderDesign(); }
  renderLog(ws, opt);
}

/* Mục System design dựng lại sơ đồ SVG, planDiff, luật báo: chỉ khi thứ nó đọc đổi — dự án, thiết kế, danh mục đã nạp, bề
 * rộng khung, theme, font đã tải xong chưa, và phần của các bước mà planDiff đọc (tên bước; mỗi bước con: sd, tên, Done when, có huỷ / bỏ qua không).
 * Đổi trạng thái thường (New, In progress, Done…), lọc, tìm, Compact thì không vẽ lại. Đổi cỡ, nạp danh mục: ui/design.js tự vẽ. */
let lastDesign = '';
/** @param {any} ws */
function designKey(ws) {
  const steps = ws.steps.map((/** @type {any} */ s) => [s.title, s.subs.map((/** @type {any} */ x) => [x.sd || '', x.title, x.doneWhen,
    x.status === 'cancel' || x.status === 'skip'])]);
  return JSON.stringify([ws.id, ws.design, !!mdLabels(), $('sd-fig').clientWidth, document.documentElement.dataset.theme || '',
    document.fonts?.status || '', steps]);
}

/** Chú giải bảy trạng thái (chip mẫu + chữ + số bước con), cũng là tiến độ chi tiết của dự án. @param {any} ws */
function renderLegend(ws) {
  const n = Object.fromEntries(STATUSES.map((st) => [st, 0]));
  for (const s of ws.steps) for (const x of s.subs) n[x.status]++;
  $('legend').replaceChildren(...STATUSES.map((st) => h('li', {},
    h('span', { class: `chip st-${st}` }, STATUS_LABEL[st]), h('b', {}, String(n[st])))));
}

function renderWsNotes(/** @type {any} */ ws) {
  $('ws-notes-text').replaceChildren(...withLinks(ws.notes));
  $('ws-notes-text').hidden = !ws.notes;
  $('ws-notes-hint').textContent = ws.notes ? `(${plural(ws.notes.split('\n').length, 'line')})` : '(empty)';
}
