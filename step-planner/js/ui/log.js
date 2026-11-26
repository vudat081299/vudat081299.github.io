// @ts-check
/* Nhật ký quyết định (PLAN-005): dòng thời gian theo tháng, mới nhất trước; ô ghi gập; bấm mục là sửa (#dlg-log, gộp khi
   tab khác đã ghi); chip bước nhảy tới bước; xoá có Hoàn tác; nhãn "Iteration N" của bước đã đóng vòng.
   Xuất: lastReopened, iterTag, renderLog, initLog.
   Dùng: core/io.js, core/model.js, ui/board.js, ui/dialogs.js, ui/dom.js, ui/filter.js, ui/move.js, ui/projects.js,
     ui/render.js, ui/state.js, ui/toast.js. */
import { plural } from '../core/io.js';
import { EDIT_FIELDS, normLog, pick, today } from '../core/model.js';
import { labelsOf } from './board.js';
import { askRecreate, closeSaved, mergeSaved, openDlg } from './dialogs.js';
import { $, MONTHS, autosize, field, fmtDate, h, icon, iconBtn, withLinks } from './dom.js';
import { resetFilters } from './filter.js';
import { flash } from './move.js';
import { switchTo } from './projects.js';
import { render } from './render.js';
import { commit, cur, curId, findWs, refocus, stepOf, stepSel } from './state.js';
import { toast } from './toast.js';

/* ── Nhật ký quyết định: dòng thời gian theo tháng, mới nhất trước; cùng ngày thì ghi sau đứng trước ── */
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** Dòng do "Reopen" tự ghi. */
const AUTO_LOG = /^Reopened: .+ \(iteration \d+\)$/;
/** Ngày của dòng nhật ký tự ghi mới nhất khi mở lại bước này ('' nếu không còn). @param {any} ws @param {any} step @returns {string} */
export const lastReopened = (ws, step) => ws.log.filter((/** @type {any} */ l) => l.stepId === step.id && AUTO_LOG.test(l.decision))
  .map((/** @type {any} */ l) => l.date).sort().at(-1) || '';
/** Bước đã mở lại rồi đóng vòng (không còn băng): nhãn "Iteration N" ở đầu bước, chú thích số lần mở lại, ngày mở lại cuối.
 * @param {any} step @param {string} last */
export function iterTag(step, last) {
  const title = `Reopened ${plural(step.round - 1, 'time')}, every iteration closed${last ? ` · last reopened ${fmtDate(last)}` : ''}`;
  return h('p', { class: 'step-iter', title }, icon('redo'), `Iteration ${step.round}`);
}
/** Quyết định đang mở hết lý do ("Show more"); vẽ lại vẫn giữ. */
const logOpen = new Set();
/** Option "No step" + mọi bước (kèm số đang hiện) cho ô Step của nhật ký. @param {any} ws */
const stepOptions = (ws) => {
  const labels = labelsOf(ws);
  return [h('option', { value: '' }, 'No step'),
    ...ws.steps.map((/** @type {any} */ s) => h('option', { value: s.id }, (labels.has(s.id) ? `${labels.get(s.id)}. ` : '') + s.title))];
};
/** Đổ option bước vào một <select>, giữ giá trị nếu bước còn. @param {any} sel @param {any} ws @param {string} value */
function fillStepSelect(sel, ws, value) {
  sel.replaceChildren(...stepOptions(ws));
  sel.value = ws.steps.some((/** @type {any} */ s) => s.id === value) ? value : '';
}

/** Khoá của lần vẽ nhật ký gần nhất: không đổi thì giữ nguyên danh sách (khỏi dựng lại, khỏi đo "Show more"). */
let logKey = '';
/** @param {any} ws @param {{full?:boolean}} [opt] */
export function renderLog(ws, opt = {}) {
  if (!$('log-date').value) $('log-date').value = today();
  const labels0 = labelsOf(ws);
  const key = JSON.stringify([ws.id, ws.log, ws.steps.map((/** @type {any} */ s) => [s.id, s.title, labels0.get(s.id) ?? null]), [...logOpen]]);
  if (!opt.full && key === logKey) return;
  logKey = key;
  fillStepSelect($('log-step'), ws, $('log-step').value);
  $('log-count').textContent = ws.log.length ? String(ws.log.length) : '';
  const sorted = ws.log.map((/** @type {any} */ l, /** @type {number} */ i) => ({ l, i }))
    .sort((/** @type {any} */ a, /** @type {any} */ b) => (a.l.date === b.l.date ? b.i - a.i : a.l.date < b.l.date ? 1 : -1))
    .map((/** @type {any} */ x) => x.l);
  if (!sorted.length) { $('log-list').replaceChildren(logEmpty()); return; }
  const labels = labelsOf(ws);
  /** @type {Map<string, any[]>} */
  const months = new Map();
  for (const l of sorted) {
    const k = l.date.slice(0, 7);
    if (!months.has(k)) months.set(k, []);
    /** @type {any[]} */ (months.get(k)).push(l);
  }
  const item = (/** @type {any} */ l) => {
    const step = stepOf(ws, l.stepId);
    const auto = AUTO_LOG.test(l.decision);
    const open = logOpen.has(l.id);
    return h('li', { class: `log-item${auto ? ' auto' : ''}${open ? ' open' : ''}`, 'data-log': l.id },
      h('span', { class: 'log-dot', 'aria-hidden': 'true' }, auto && icon('redo')),
      h('div', { class: 'log-body' },
        h('p', { class: 'log-meta' },
          h('time', { class: 'log-date', datetime: l.date }, `${+l.date.slice(8, 10)} ${MONTHS[+l.date.slice(5, 7) - 1]}`),
          auto && h('span', { class: 'log-auto' }, 'Auto-logged'),
          step && h('button', { type: 'button', class: 'log-step', 'data-act': 'goto-step', title: 'Go to this step on the board' },
            labels.has(step.id) && h('span', { class: 'log-step-n' }, labels.get(step.id)), h('span', { class: 'log-step-t' }, step.title))),
        h('h4', { class: 'log-title' }, h('button', { type: 'button', class: 'link log-decision', 'data-act': 'edit-log', title: 'Edit decision' }, l.decision)),
        l.why && h('p', { class: 'log-why', id: `why-${l.id}` }, withLinks(l.why)),
        l.why && h('button', { type: 'button', class: 'link log-more', 'data-act': 'more-log', 'aria-expanded': String(open), 'aria-controls': `why-${l.id}`, hidden: true },
          open ? 'Show less' : 'Show more')),
      h('div', { class: 'log-acts' },
        iconBtn('edit', 'Edit decision', 'edit-log'),
        iconBtn('trash', 'Delete decision', 'del-log')));
  };
  $('log-list').replaceChildren(...[...months].map(([k, list]) => h('section', { class: 'log-group', 'aria-labelledby': `log-m-${k}` },
    h('h3', { class: 'log-month', id: `log-m-${k}` }, `${MONTH_NAMES[+k.slice(5, 7) - 1]} ${k.slice(0, 4)}`,
      h('span', { class: 'log-month-n' }, plural(list.length, 'decision'))),
    h('ol', { class: 'log-entries' }, ...list.map(item)))));
  measureLog();
}
/* "Show more" chỉ hiện khi lý do bị cắt (hay đang mở hết); đo lại khi font tải xong và khi đổi cỡ. Đọc hết rồi mới ghi (một lần
 * dàn trang). Lúc vẽ thì đo ngay (refocus vào nút ngay sau đó cần nút đã hiện); đổi cỡ, font về: một lần mỗi khung hình. */
function measureLog() {
  const m = [...$('log-list').querySelectorAll('.log-why')].filter((p) => p.nextElementSibling)
    .map((p) => /** @type {[HTMLElement, boolean]} */ ([p.nextElementSibling, p.closest('.log-item').classList.contains('open') || p.scrollHeight > p.clientHeight + 1]));
  for (const [more, show] of m) more.hidden = !show;
}
let logFrame = 0;
const measureLogSoon = () => { if (!logFrame) logFrame = requestAnimationFrame(() => { logFrame = 0; measureLog(); }); };

/** Nhật ký trống: nói nên ghi gì, kèm một ví dụ. */
function logEmpty() {
  return h('div', { class: 'log-empty' },
    h('p', { class: 'log-empty-h' }, 'No decisions yet'),
    h('p', { class: 'log-empty-t' }, 'Record the choices someone will ask about later: the target metric, how the data is split, a feature you dropped. One line for what, one for why.'),
    h('figure', { class: 'log-example' },
      h('figcaption', {}, 'Example'),
      h('p', { class: 'log-example-d' }, 'Use PR-AUC, not accuracy, as the main metric'),
      h('p', { class: 'log-example-w' }, 'Only 4% of customers churn, so a model that predicts nobody churns is already 96% accurate.')));
}

/* ── Nhật ký quyết định ── */

/* Ô ghi gập thành một nút tới khi dùng; Esc hay Close gập lại, giữ chữ đang viết. */
function openCompose() {
  $('log-compose').hidden = false;
  $('log-compose-open').hidden = true;
  autosize($('log-decision'));
  $('log-decision').focus();
}
function closeCompose(back = true) {
  $('log-compose').hidden = true;
  $('log-compose-open').hidden = false;
  if (back) $('log-compose-open').focus();
}

/** orig: bản sao quyết định lúc mở hộp sửa (so khi Lưu, tạo lại khi tab khác đã xoá nó). @type {{wsId:string, id:string, orig?:any}} */
let logCtx = { wsId: '', id: '' };

function deleteLog(/** @type {string} */ wsId, /** @type {string} */ id) {
  const ws = findWs(wsId);
  const k = ws ? ws.log.findIndex((/** @type {any} */ l) => l.id === id) : -1;
  if (k < 0) return;
  const [entry] = ws.log.splice(k, 1);
  commit();
  toast(`Deleted decision "${entry.decision}".`, () => {
    const w = findWs(wsId);
    if (!w) { toast('Cannot undo: the project was deleted.'); return; }
    if (!w.log.some((/** @type {any} */ l) => l.id === entry.id)) w.log.splice(Math.min(k, w.log.length), 0, entry);
    if (curId !== wsId) switchTo(wsId);
    commit(`[data-log="${entry.id}"] [data-act="edit-log"]`);
  }, '#log-compose-open');
}

/** Gắn sự kiện, chạy một lần lúc khởi động (main.js gọi theo thứ tự). */
export function initLog() {
  document.fonts?.ready.then(measureLogSoon);
  window.addEventListener('resize', measureLogSoon);

  $('log-compose-open').addEventListener('click', openCompose);
  $('log-compose-close').addEventListener('click', () => closeCompose());
  $('log-form').addEventListener('keydown', (/** @type {any} */ e) => {
    if (e.key === 'Escape' && !$('log-compose').hidden) { e.preventDefault(); closeCompose(); }
  });
  $('log-form').addEventListener('submit', (/** @type {any} */ e) => {
    e.preventDefault();
    const ws = cur();
    if (!ws) return;
    const entry = normLog({ date: $('log-date').value, decision: $('log-decision').value, why: $('log-why').value, stepId: $('log-step').value });
    ws.log.push(entry);
    $('log-decision').value = '';
    $('log-why').value = '';
    $('log-step').value = '';
    $('log-date').value = today();
    closeCompose(false);
    commit(`[data-log="${entry.id}"] [data-act="edit-log"]`, { preventScroll: true });
    flash('log', entry.id, null);
  });

  /* Bấm vào một quyết định (ngoài nút, link, chữ đang bôi) là mở hộp sửa, như thẻ bước con. */
  $('log-list').addEventListener('click', (/** @type {any} */ e) => {
    const li = e.target.closest('.log-item[data-log]');
    const ws = cur();
    if (!li || !ws || e.target.closest('a') || (!e.target.closest('[data-act]') && String(getSelection()))) return;
    const act = e.target.closest('[data-act]')?.dataset.act || 'edit-log';
    const id = li.dataset.log;
    const entry = ws.log.find((/** @type {any} */ l) => l.id === id);
    if (!entry) return;
    if (act === 'del-log') deleteLog(ws.id, id);
    else if (act === 'more-log') {
      if (logOpen.has(id)) logOpen.delete(id); else logOpen.add(id);
      render();
      refocus(`[data-log="${id}"] [data-act="more-log"]`, { preventScroll: true });
    } else if (act === 'goto-step') {
      /* Bước đang bị lọc ẩn thì bỏ lọc trước. */
      if (!document.querySelector(`.step[data-step="${entry.stepId}"]`)) { resetFilters(); render(); }
      flash('step', entry.stepId, null);
      refocus(stepSel(entry.stepId, 'edit-step'), { preventScroll: true });
    } else {
      logCtx = { wsId: ws.id, id, orig: { ...entry } };
      const f = $('log-edit-form');
      field(f, 'date').value = entry.date;
      field(f, 'decision').value = entry.decision;
      field(f, 'why').value = entry.why;
      fillStepSelect(field(f, 'step'), ws, entry.stepId);
      openDlg($('dlg-log'), field(f, 'decision'));
    }
  });
  /* Lưu: như hộp bước con, chỉ trường đã đổi đè lên bản đang lưu; tab khác đã xoá thì hỏi tạo lại. */
  $('log-edit-form').addEventListener('submit', async (/** @type {any} */ e) => {
    e.preventDefault();
    const f = $('log-edit-form');
    const ctx = logCtx;
    const F = EDIT_FIELDS.log;
    const mine = pick(normLog({ date: field(f, 'date').value, decision: field(f, 'decision').value, why: field(f, 'why').value, stepId: field(f, 'step').value }), F);
    const now = () => findWs(ctx.wsId)?.log.find((/** @type {any} */ l) => l.id === ctx.id);
    let entry = now();
    if (findWs(ctx.wsId) && !entry) {
      const again = await askRecreate(`Decision "${ctx.orig.decision}"`);
      if (again === null) return;
      if (!again) { closeSaved($('dlg-log')); return; }
      entry = now();
      if (!entry) {
        const ws = /** @type {any} */ (findWs(ctx.wsId));
        entry = normLog({ ...ctx.orig, ...mine });
        if (ws && !stepOf(ws, entry.stepId)) entry.stepId = '';
        ws?.log.push(entry);
      }
    } else if (entry) {
      const merged = await mergeSaved(findWs(ctx.wsId), pick(ctx.orig, F), mine, () => { const l = now(); return l ? pick(l, F) : null; });
      if (!merged) return;
      entry = now();
      if (entry) Object.assign(entry, pick(normLog({ ...entry, ...merged }), F));
    }
    closeSaved($('dlg-log'));
    if (!entry || !findWs(ctx.wsId)) { toast('Not saved: the decision was deleted elsewhere.'); return; }
    commit(`[data-log="${entry.id}"] [data-act="edit-log"]`);
  });
  $('log-edit-del').addEventListener('click', () => {
    closeSaved($('dlg-log'));
    deleteLog(logCtx.wsId, logCtx.id);
  });
}
