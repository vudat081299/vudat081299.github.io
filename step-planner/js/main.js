// @ts-check
/* Giao diện Data Science Step Planner: nạp mẫu, vẽ bảng, sự kiện, hộp thoại. Logic thuần ở core.js, bộ nhớ ở store.js.
 * Chữ người dùng chỉ vào DOM qua textContent (hàm h), không bao giờ qua HTML. */
import * as C from './core.js';
import * as S from './store.js';
import { renderMd, renderSrc } from './md.js';
import { enhanceSelect, openList, consumeJustClosed } from './dropdown.js';
import { initDrag } from './drag.js';
import { initDesign, renderSection as renderDesign, mdLabels } from './design.js';

/** @param {string} id @returns {any} */
const $ = (id) => document.getElementById(id);
const DAY = 86400000;
const BACKUP_NUDGE_DAYS = 3;

/** Dựng phần tử; con là chuỗi thì thành text node. @param {string} tag @param {Record<string, any>} [attrs] @param {...any} kids */
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false && kid !== '') el.append(kid instanceof Node ? kid : String(kid));
  return el;
}

/** Chữ có link http(s) thành text + thẻ a; mọi phần vẫn qua textContent. @param {string} text */
function withLinks(text) {
  return text.split(/(https?:\/\/[^\s<>"]+)/).map((part, i) => (i % 2
    ? h('a', { href: part, target: '_blank', rel: 'noopener noreferrer' }, part)
    : part));
}

/* Biểu tượng: một bộ duy nhất, là các <symbol id="i-…"> trong index.html; nét và cỡ do CSS (svg.i) đặt. */
/** @param {string} name */
function icon(name) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'i');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(NS, 'use');
  use.setAttribute('href', '#i-' + name);
  svg.append(use);
  return svg;
}
/* Nút phụ (dời, nhân bản, xoá) không nằm trong vòng Tab: bàn phím làm cùng việc ấy trong hộp sửa và bằng Alt + mũi tên. */
/** @param {string} name @param {string} label @param {string} act @param {boolean} [disabled] */
const iconBtn = (name, label, act, disabled = false) =>
  h('button', { type: 'button', class: 'icon-btn aux', 'data-act': act, 'aria-label': label, title: label, disabled, tabindex: '-1' }, icon(name));

/* ── Trạng thái ── */

const storageOK = S.available();
const loaded = S.load();
/** @type {{version:number, workspaces:any[], lastId:string, lastBackup:string, dirtySince:string}} */
let state = loaded.state;
/** Dự án tab này đang mở (mỗi tab một dự án). */
let curId = '';
/** @type {any[]} */
let templates = [];
const ui = { q: '' };
/** Kéo thả (js/drag.js); render() dọn lần kéo dở trước khi vẽ lại bảng. @type {{abort: () => void}|null} */
let dragCtl = null;
const banners = new Map();

const findWs = (/** @type {string} */ id) => state.workspaces.find((w) => w.id === id) || null;
const cur = () => findWs(curId);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** YYYY-MM-DD → "24 Nov 2026" (không phụ thuộc locale của máy). */
const fmtDate = (/** @type {string} */ d) => (d ? `${+d.slice(8, 10)} ${MONTHS[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}` : '');
/** @param {any} ws @param {string} stepId */
const stepOf = (ws, stepId) => (ws ? ws.steps.find((/** @type {any} */ s) => s.id === stepId) : null);

function setCur(/** @type {string} */ id) {
  curId = id;
  state.lastId = id;
  S.setTabProject(id);
}

function setBanner(/** @type {string} */ key, /** @type {string} */ msg) {
  if (msg) banners.set(key, msg); else banners.delete(key);
  const b = $('banner');
  b.replaceChildren(...[...banners.values()].map((m) => h('p', {}, m)));
  b.hidden = !banners.size;
}

/* Ghi bộ nhớ ở lượt việc kế (mọi thay đổi của một lần bấm gộp một lần ghi). Không chờ khung hình: tab nền bị hãm khung
 * hình, tab kia ghi trước thì thay đổi của tab này mất. Rời trang, ẩn tab: ghi ngay. */
let savePending = false;
function persist() {
  if (!storageOK || savePending) return;
  savePending = true;
  setTimeout(flushSave, 0);
}
function flushSave() {
  if (!savePending) return;
  savePending = false;
  setBanner('save', S.save(state) ? '' : 'Could not write to browser storage (full or blocked). New changes are not saved — back up as JSON to keep them.');
}
window.addEventListener('pagehide', flushSave);
document.addEventListener('visibilitychange', () => { if (document.hidden) flushSave(); });

/** Ghi lại, vẽ lại, rồi đưa focus về phần tử vừa thao tác. @param {string} [focusSel] @param {{preventScroll?:boolean}} [opt] */
function commit(focusSel, opt = {}) {
  const ws = cur();
  const now = new Date().toISOString();
  if (ws) ws.updatedAt = now;
  if (!state.dirtySince) state.dirtySince = now;
  persist();
  render();
  if (focusSel) refocus(focusSel, opt);
}
/** Thử từng bộ chọn (cách nhau bằng `||`); không trúng thì về bảng — focus không bao giờ rơi về body. */
function refocus(/** @type {string} */ sel, opt = {}) {
  for (const s of sel.split('||')) {
    const el = s.trim() && document.querySelector(s.trim());
    if (el && !el.disabled && el.offsetParent !== null) { el.focus(opt); return; }
  }
  const board = $('app').hidden ? $('start') : $('board');
  board.setAttribute('tabindex', '-1');
  board.focus(opt);
}
const subSel = (/** @type {string} */ id, /** @type {string} */ act) => `.card[data-sub="${id}"] [data-act="${act}"]`;
const stepSel = (/** @type {string} */ id, /** @type {string} */ act) => `.step[data-step="${id}"] .step-head [data-act="${act}"]`;

/* ── Toast có Hoàn tác (Ctrl/Cmd + Z khi không gõ chữ) ── */

/** @type {null | (() => void)} */
let toastUndo = null;
let toastTimer = 0;
let toastBack = '';
/* Xoá: focus nhảy vào Hoàn tác. Dời chỗ (focusUndo = false): focus ở lại thẻ vừa dời, Ctrl/Cmd + Z vẫn hoàn tác. */
function toast(/** @type {string} */ text, /** @type {null | (() => void)} */ undo = null, back = '', focusUndo = true) {
  $('toast-text').textContent = text;
  $('toast-undo').hidden = !undo;
  toastUndo = undo;
  toastBack = back;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(hideToast, undo ? 15000 : 4000);
  if (undo && focusUndo) $('toast-undo').focus();
}
function hideToast(refocusAfter = true) {
  const had = document.activeElement === $('toast-undo');
  clearTimeout(toastTimer);
  $('toast').hidden = true;
  toastUndo = null;
  if (had && refocusAfter) refocus(toastBack || '#board');
}
function runUndo() {
  const u = toastUndo;
  hideToast(false);
  if (u) u();
}
$('toast-undo').addEventListener('click', runUndo);
const typing = (/** @type {any} */ el) => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'z'
    && toastUndo && !typing(e.target) && !document.querySelector('dialog[open]')) {
    e.preventDefault();
    runUndo();
  }
});

/* ── Vẽ ── */

/** Vẽ đầu dự án, bảng (theo hàng, xem renderBoard), nhật ký. @param {{full?:boolean}} [opt] */
function render(opt = {}) {
  dragCtl?.abort();
  const ws = cur();
  $('app').hidden = !ws;
  $('start').hidden = !!ws;
  $('ws-name').textContent = ws ? ws.name : 'No project';
  document.title = ws ? `${ws.name} — Data Science Step Planner` : 'Data Science Step Planner';
  $('overall').hidden = !ws;
  renderNudge();
  if (!ws) { renderStart(); return; }
  const o = C.overall(ws);
  $('overall-text').textContent = `${o.done}/${o.total} done · ${o.pct}%`;
  $('overall-bar').style.width = o.pct + '%';
  renderLegend(ws);
  $('hint').hidden = S.hintHidden();
  renderWsNotes(ws);
  $('log-btn-text').textContent = `Log (${ws.log.length})`;
  renderBoard(ws, opt);
  renderDesign();
  renderLog(ws, opt);
}

/** Chú giải bảy trạng thái (chip mẫu + chữ + số bước con), cũng là tiến độ chi tiết của dự án. @param {any} ws */
function renderLegend(ws) {
  const n = Object.fromEntries(C.STATUSES.map((st) => [st, 0]));
  for (const s of ws.steps) for (const x of s.subs) n[x.status]++;
  $('legend').replaceChildren(...C.STATUSES.map((st) => h('li', {},
    h('span', { class: `chip st-${st}` }, C.STATUS_LABEL[st]), h('b', {}, String(n[st])))));
}

function renderWsNotes(/** @type {any} */ ws) {
  $('ws-notes-text').replaceChildren(...withLinks(ws.notes));
  $('ws-notes-text').hidden = !ws.notes;
  $('ws-notes-hint').textContent = ws.notes ? `(${C.plural(ws.notes.split('\n').length, 'line')})` : '(empty)';
}

/** Nhắc sao lưu: có thay đổi chưa sao lưu từ ≥ 3 ngày. */
function renderNudge() {
  const b = $('backup-nudge');
  const since = state.dirtySince ? Date.now() - Date.parse(state.dirtySince) : 0;
  b.hidden = !state.workspaces.length || since < BACKUP_NUDGE_DAYS * DAY;
  b.textContent = state.lastBackup
    ? `Not backed up for ${C.plural(Math.floor((Date.now() - Date.parse(state.lastBackup)) / DAY), 'day')}`
    : 'Never backed up';
  b.title = 'Download a JSON backup of every project';
  $('backup-when').textContent = state.lastBackup ? `Last backup: ${fmtDate(state.lastBackup.slice(0, 10))}` : 'Never backed up.';
}

/* Bảng vẽ theo hàng: mỗi hàng (bước) mang một khoá tóm mọi thứ nó hiện (dữ liệu bước, số, thẻ "Next", lọc, hôm nay). Khoá
 * không đổi thì giữ nguyên nút DOM của hàng (ghi chú đang mở, thẻ đã "Show more", chỗ cuộn ngang, focus đi theo nút); đổi
 * thì dựng lại riêng hàng ấy. Thứ có thể đổi mà không đổi khoá (vị trí hàng, Compact) được vá riêng. */
/** @type {WeakMap<Element, string>} */
const rowKeys = new WeakMap();
let boardWsId = '';

/** @param {any} ws @param {{full?:boolean}} [opt] full: bỏ mọi hàng cũ, dựng lại cả bảng */
function renderBoard(ws, opt = {}) {
  const board = $('board');
  const q = C.fold(ui.q.trim());
  const filtering = !!q;
  const todayStr = C.today();
  const nextIds = new Set(C.projectNextIds(ws));
  const labels = labelsOf(ws);
  const compact = S.compactOn();
  const reuse = !opt.full && boardWsId === ws.id;
  boardWsId = ws.id;
  /** @type {Map<string, HTMLElement>} */
  const old = new Map();
  for (const row of /** @type {NodeListOf<HTMLElement>} */ (board.querySelectorAll(':scope > .step[data-step]'))) old.set(/** @type {string} */ (row.dataset.step), row);
  const docTitles = (/** @type {any[]} */ docs) => docs.map((d) => d.title).join(' ');
  /* 1. Dữ liệu: hàng nào hiện, khoá của nó, dùng lại được hàng cũ không. Chưa đọc, chưa ghi DOM. */
  const plan = [];
  /** Ngày mở lại cuối của bước đã đóng vòng (chú thích nhãn "Iteration N"); nằm trong khoá hàng vì nó đọc nhật ký. */
  const reopenedOn = new Map();
  let shown = 0;
  ws.steps.forEach((/** @type {any} */ step, /** @type {number} */ i) => {
    const stepHit = !!q && foldOf(step, () => [step.title, step.goal, step.doneWhen, step.notes, step.revisit?.reason, docTitles(step.docs)]).includes(q);
    const visible = step.subs.filter((/** @type {any} */ x) => !q || stepHit || foldOf(x, () => [x.title, x.doneWhen, x.notes, x.reason, docTitles(x.docs)]).includes(q));
    if (filtering && !visible.length && !stepHit) return;
    shown += visible.length;
    if (!step.revisit && step.round > 1) reopenedOn.set(step.id, lastReopened(ws, step));
    const key = JSON.stringify([step, filtering ? visible.map((/** @type {any} */ x) => x.id) : null,
      labels.get(step.id) ?? null, step.subs.map((/** @type {any} */ x) => [labels.get(x.id) ?? null, nextIds.has(x.id)]), todayStr,
      reopenedOn.get(step.id) ?? null]);
    const prev = old.get(step.id);
    plan.push({ step, i, visible, key, row: reuse && prev && rowKeys.get(prev) === key ? prev : null, prev });
  });
  /* 2. Đọc trạng thái người dùng đang xem của các hàng sắp dựng lại hay sắp dời chỗ (dời nút DOM làm mất chỗ cuộn ngang). */
  const kids = [...board.children];
  const moved = movedNodes(kids, plan.map((p) => p.row));
  const keep = { notes: new Set(), open: new Set(), left: new Map() };
  for (const p of plan) {
    if (p.row && !moved.has(p.row)) continue;
    const src = p.row || p.prev;
    if (!src) continue;
    if (!p.row && src.querySelector('.step-notes')?.open) keep.notes.add(p.step.id);
    if (!p.row) for (const c of /** @type {NodeListOf<HTMLElement>} */ (src.querySelectorAll('.card.open[data-sub]'))) keep.open.add(/** @type {string} */ (c.dataset.sub));
    const sc = src.querySelector('.cards-scroll');
    if (sc && sc.scrollLeft) keep.left.set(p.step.id, sc.scrollLeft);
  }
  /* 3. Ghi: dựng hàng mới, xếp lại con của bảng (chỉ dời các hàng lệch chỗ), vá phần theo vị trí. */
  board.classList.toggle('filtering', filtering);
  const compactChanged = board.classList.contains('compact') !== compact;
  board.classList.toggle('compact', compact);
  $('compact-btn').setAttribute('aria-pressed', String(compact));
  const ctx = { filtering, todayStr, nextIds, labels, keep, reopenedOn };
  /** @type {HTMLElement[]} */
  const fresh = [];
  const nodes = plan.map((p) => {
    if (p.row) return p.row;
    const row = stepRow(p.step, p.i, p.visible, ctx);
    rowKeys.set(row, p.key);
    fresh.push(row);
    return row;
  });
  if (!ws.steps.length) nodes.push(h('p', { class: 'empty' }, 'No steps yet. Click "Add step" below.'));
  else if (!plan.length) nodes.push(h('p', { class: 'empty' }, 'No sub-step matches. ',
    h('button', { type: 'button', class: 'btn', 'data-act': 'clear-filter' }, 'Clear search')));
  placeChildren(board, nodes, moved);
  for (const p of plan) if (p.row) patchRowIndex(p.row, p.i);
  $('renumber-btn').hidden = !labelsStale(ws);
  $('filter-note').textContent = filtering ? `${C.plural(shown, 'sub-step')} match · reordering is off while searching` : '';
  $('add-step').hidden = filtering;
  /* 4. Đo: thẻ của hàng mới (Compact vừa đổi: mọi thẻ) — một lần dàn trang cho cả lượt. */
  const cards = (/** @type {Element[]} */ rows) => rows.flatMap((r) => /** @type {HTMLElement[]} */ ([...r.querySelectorAll('.card[data-sub]')]));
  if (compactChanged) markCutCards(cards(nodes), new Set([...keep.open, ...cards(nodes).filter((c) => c.classList.contains('open')).map((c) => /** @type {string} */ (c.dataset.sub))]));
  else markCutCards(cards(fresh), keep.open);
  const scrolls = [];
  for (const [id, left] of keep.left) {
    const sc = board.querySelector(`.step[data-step="${id}"] .cards-scroll`);
    if (sc) { sc.scrollLeft = left; scrolls.push(sc); }
  }
  updateScrollCues([...fresh.map((r) => r.querySelector('.cards-scroll')), ...scrolls]);
}

/** Chữ đã bỏ dấu để tìm, nhớ theo đối tượng; nguồn đổi thì tính lại. @type {WeakMap<object, {src:string, folded:string}>} */
const folds = new WeakMap();
/** @param {object} o @param {() => any[]} parts */
function foldOf(o, parts) {
  const src = parts().join(' ');
  const c = folds.get(o);
  if (c && c.src === src) return c.folded;
  const folded = C.fold(src);
  folds.set(o, { src, folded });
  return folded;
}

/** Các nút cũ phải dời chỗ để con của `parent` theo đúng thứ tự `want`: mọi nút cũ trừ dãy con tăng dài nhất (giữ đứng
 * yên). Dời một nút DOM làm trình duyệt dàn lại cả nút ấy, nên dời càng ít càng tốt. @param {Element[]} kids @param {(Element|null)[]} want */
function movedNodes(kids, want) {
  const pos = new Map(kids.map((c, i) => [c, i]));
  const seq = want.filter((n) => n && pos.has(n)).map((n) => /** @type {Element} */ (n));
  const len = seq.map(() => 1), prev = seq.map(() => -1);
  for (let i = 0; i < seq.length; i++) {
    for (let j = 0; j < i; j++) {
      if (/** @type {number} */ (pos.get(seq[j])) < /** @type {number} */ (pos.get(seq[i])) && len[j] + 1 > len[i]) { len[i] = len[j] + 1; prev[i] = j; }
    }
  }
  const stay = new Set();
  let k = len.indexOf(Math.max(0, ...len));
  while (k >= 0) { stay.add(seq[k]); k = prev[k]; }
  return new Set(seq.filter((n) => !stay.has(n)));
}
/** Con của `parent` thành đúng `nodes`: bỏ nút thừa, chèn nút mới và nút trong `moved`, các nút khác đứng yên.
 * @param {Element} parent @param {Element[]} nodes @param {Set<Element>} moved */
function placeChildren(parent, nodes, moved) {
  const want = new Set(nodes);
  for (const c of [...parent.children]) if (!want.has(c)) c.remove();
  let next = null;
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (n.parentNode !== parent || moved.has(n)) parent.insertBefore(n, next);
    next = n;
  }
}
/** Phần của hàng phụ thuộc chỉ số của bước (vạch chia "Add step", nhãn dải tài liệu): vá khi hàng dùng lại đổi chỗ.
 * @param {HTMLElement} row @param {number} i */
function patchRowIndex(row, i) {
  const set = (/** @type {Element|null} */ el, /** @type {string} */ k, /** @type {string} */ v) => { if (el && el.getAttribute(k) !== v) el.setAttribute(k, v); };
  const gap = row.querySelector(':scope > .gap-add');
  if (gap && gap.classList.contains('first') !== (i === 0)) gap.classList.toggle('first', i === 0);
  const btn = gap && gap.querySelector('.gap-add-btn');
  set(btn, 'data-at', String(i));
  set(btn, 'aria-label', `Add a step before step ${i + 1}`);
  set(btn, 'title', `Add a step here (before step ${i + 1})`);
  set(row.querySelector(':scope > .step-docs .doc-chips'), 'aria-label', `Docs of step ${i + 1}`);
}

/** Dựng một hàng (bước): đầu bước, băng Reopened, dải tài liệu, hàng thẻ theo ô.
 * @param {any} step @param {number} i @param {any[]} visible
 * @param {{filtering:boolean, todayStr:string, nextIds:Set<string>, labels:Map<string,string>, keep:{notes:Set<string>, open:Set<string>}, reopenedOn:Map<string,string>}} ctx */
function stepRow(step, i, visible, ctx) {
  const { filtering, todayStr, nextIds, labels, keep, reopenedOn } = ctx;
  const prog = C.progress(step.subs);
  const done = prog.total > 0 && prog.done === prog.total;
  const head = h('div', { class: 'step-head' },
    h('div', { class: 'step-top' },
      !filtering && h('span', { class: 'step-grip', title: 'Drag to move the step (keyboard: Alt + ↑ ↓ on its name)', 'aria-hidden': 'true' }, icon('grip')),
      numTag('step-num', labels.get(step.id)),
      h('h2', { class: 'step-title', id: 'st-' + step.id },
        h('button', { type: 'button', class: 'link', 'data-act': 'edit-step', 'aria-label': `Step ${labels.get(step.id) ?? '(added this session)'}: ${step.title}. Edit`, 'aria-keyshortcuts': 'Alt+ArrowUp Alt+ArrowDown' }, step.title))),
    reopenedOn.has(step.id) && iterTag(step, reopenedOn.get(step.id)),
    step.goal && h('p', { class: 'step-goal' }, step.goal),
    step.doneWhen && h('p', { class: 'step-done' }, h('span', { class: 'lbl' }, 'Done when '), step.doneWhen),
    step.notes && h('details', { class: 'step-notes', open: keep.notes.has(step.id) }, h('summary', {}, icon('chev'), 'Notes'), h('p', { class: 'notes-text' }, withLinks(step.notes))),
    h('div', { class: 'prog' },
      h('span', {}, `${prog.done}/${prog.total}`, h('span', { class: 'sr' }, ' sub-steps done')),
      h('span', { class: 'bar-prog', 'aria-hidden': 'true' }, barFill(prog.pct))),
    h('div', { class: 'acts' },
      h('button', { type: 'button', class: 'btn small', 'data-act': 'add-sub' }, icon('plus'), 'Sub-step'),
      /* Nút phụ chỉ biểu tượng (tên ở aria-label, title): cả hàng nằm gọn một dòng trong cột tên bước. */
      !step.revisit && C.canReopen(step) && iconBtn('redo', 'Reopen step: a later step showed this one must be redone', 'revisit'),
      !step.docs.length && iconBtn('clip', 'Add a doc: a link or a Markdown note for the whole step', 'add-doc'),
      iconBtn('trash', 'Delete step', 'del-step')));
  /* Băng "Reopened": vòng, ngày, lý do (bấm để sửa), còn mấy việc phải làm lại; làm lại xong hết thì mời đóng vòng. */
  const redo = C.redoCount(step);
  const band = step.revisit && h('div', { class: 'revisit-band' + (redo.total && !redo.left ? ' all-redone' : '') },
    icon('redo'),
    h('button', { type: 'button', class: 'badge', 'data-act': 'revisit', title: 'Edit the reason' },
      h('b', {}, 'Reopened'),
      ' · Iteration ' + step.revisit.round,
      step.revisit.date ? ' · ' + fmtDate(step.revisit.date) : '',
      step.revisit.reason ? ' · ' + step.revisit.reason : ''),
    redo.total > 0 && h('span', { class: 'redo-left' }, redo.left ? `${redo.left} of ${C.plural(redo.total, 'redo task')} left` : `All ${C.plural(redo.total, 'redo task')} done`),
    h('button', { type: 'button', class: 'btn small' + (redo.total && !redo.left ? ' go' : ''), 'data-act': 'revisit-clear',
      title: 'Finish this iteration: remove the band and the Redo marks' }, 'Close iteration'));
  const card = (/** @type {any} */ x) => {
    const overdue = x.due && x.due < todayStr && x.status !== 'done' && !C.outOfScope(x.status);
    const isNext = nextIds.has(x.id);
    return h('div', { class: `card st-${x.status}${isNext ? ' next' : ''}`, 'data-sub': x.id },
      h('div', { class: 'card-top' },
        numTag('num', labels.get(x.id)),
        isNext && h('span', { class: 'next-tag' }, 'Next'),
        x.redo && x.status !== 'done' && !C.outOfScope(x.status) && h('span', { class: 'redo-tag', title: `Sent back to redo in iteration ${step.revisit?.round}` }, icon('redo'), 'Redo'),
        x.docs.length > 0 && h('button', { type: 'button', class: 'doc-tag', 'data-act': 'sub-docs', tabindex: '-1',
          'aria-label': `${C.plural(x.docs.length, 'doc')}. Open the list`, title: x.docs.map((/** @type {any} */ d) => d.title).join('\n') },
        icon('clip'), String(x.docs.length)),
        statusChip(x)),
      h('div', { class: 'card-body' },
        h('h3', { class: 'card-title' }, h('button', { type: 'button', class: 'link', 'data-act': 'edit-sub', 'aria-keyshortcuts': 'Alt+ArrowLeft Alt+ArrowRight Alt+ArrowUp Alt+ArrowDown' }, x.title)),
        x.due && h('p', { class: 'meta' },
          h('span', { class: 'due' + (overdue ? ' overdue' : '') }, 'due ' + fmtDate(x.due) + (overdue ? ' (overdue)' : ''))),
        x.reason && h('p', { class: 'card-reason' }, h('span', { class: 'lbl' }, C.REASON_LABEL[x.status] + ' '), withLinks(x.reason)),
        x.doneWhen && h('p', { class: 'card-done' }, h('span', { class: 'lbl' }, 'Done when '), x.doneWhen),
        x.notes && cardNotes(x.notes, keep.open.has(x.id))),
      h('div', { class: 'acts' },
        iconBtn('parallel', 'Add a parallel sub-step (runs alongside this one)', 'add-par'),
        iconBtn('copy', 'Duplicate', 'sub-dup'),
        iconBtn('trash', 'Delete', 'sub-del')));
  };
  /* Mỗi ô một cột của hàng; ô song song xếp chồng các thẻ của nó. */
  const shownIds = new Set(visible.map((/** @type {any} */ x) => x.id));
  const slots = C.slotsOf(step.subs).map((sl, si) => {
    const vis = sl.filter((x) => shownIds.has(x.id));
    return vis.length > 0 && h('li', { class: 'slot' + (sl.length > 1 ? ' par' : ''), 'data-slot': String(si),
      'aria-label': sl.length > 1 ? `${sl.length} parallel sub-steps` : null }, vis.map(card));
  });
  /* Tài liệu của cả bước: dải chip ngay dưới băng Reopened (hay ở chỗ ấy khi không có băng), trên hàng thẻ. */
  const docs = step.docs.length > 0 && h('div', { class: 'step-docs' },
    h('ul', { class: 'doc-chips', 'aria-label': `Docs of step ${i + 1}` }, step.docs.map(docChip)),
    h('button', { type: 'button', class: 'doc-chip add aux', 'data-act': 'add-doc', tabindex: '-1', 'aria-label': 'Add a doc to this step', title: 'Add a link or a Markdown note for the whole step' }, icon('plus'), 'Doc'));
  /* Vạch chia phía trên bước: rê chuột vào thì hiện nút "Add step" chèn bước mới vào chỗ này (nút nổi, không đẩy bố cục). */
  const gap = !filtering && h('div', { class: 'gap-add' + (i === 0 ? ' first' : '') },
    h('button', { type: 'button', class: 'gap-add-btn', 'data-act': 'insert-step', 'data-at': String(i), tabindex: '-1',
      'aria-label': `Add a step before step ${i + 1}`, title: `Add a step here (before step ${i + 1})` }, icon('plus'), h('span', {}, 'Add step')));
  return h('section', { class: 'step' + (step.revisit ? ' revisit' : '') + (done ? ' is-done' : ''), 'data-step': step.id, 'aria-labelledby': 'st-' + step.id },
    gap,
    band,
    docs,
    head,
    h('div', { class: 'cards-scroll' }, h('ol', { class: 'cards', 'aria-label': `Sub-steps of step ${labels.get(step.id) ?? step.title}` }, slots)));
}

/* ── Số đứng yên trong phiên: chụp số của mọi bước, bước con khi dự án hiện lần đầu trong lần mở trang này (và sau khi nhập
 * thay nội dung). Dời chỗ không đổi số, nên hàng đọc được "1 3 2" và người dùng thấy vừa đổi chỗ những gì; tải lại trang
 * hay bấm "Renumber" mới đánh số lại. Cái thêm trong phiên chưa có số: hiện dấu chấm "added this session". ── */
/** @type {Map<string, Map<string, string>>} */
const frozen = new Map();
/** @param {any} ws @returns {Map<string, string>} */
function labelsOf(ws) {
  let m = frozen.get(ws.id);
  if (!m) { m = C.liveLabels(ws); frozen.set(ws.id, m); }
  return m;
}
/** Số đang hiện khác số thật (đã dời, thêm, xoá)? @param {any} ws */
function labelsStale(ws) {
  const m = labelsOf(ws);
  const live = C.liveLabels(ws);
  return [...live].some(([id, l]) => m.get(id) !== l);
}
/** @param {string} cls @param {string|undefined} label */
const numTag = (cls, label) => (label != null
  ? h('span', { class: cls, 'aria-hidden': cls === 'step-num' ? 'true' : null }, label)
  : h('span', { class: cls + ' fresh', title: 'Added this session. Renumber (or reload) to number it' }, h('span', { class: 'sr' }, 'added this session')));
$('renumber-btn').addEventListener('click', () => {
  const ws = cur();
  if (!ws) return;
  frozen.delete(ws.id);
  render();
  toast('Numbers updated to the current order.');
  refocus('.step .step-title .link');
});

/** Chip trạng thái: New, In progress bấm là sang trạng thái kế; Done và các trạng thái khác bấm là mở danh sách.
 * Shift + bấm hoặc Alt + ↓ luôn mở danh sách. @param {any} x */
function statusChip(x) {
  const label = C.STATUS_LABEL[x.status];
  const nx = C.nextStatus(x.status);
  const how = nx ? `Click: ${C.STATUS_LABEL[nx]}. Shift-click or Alt+Down: all statuses` : 'Click: choose a status';
  return h('button', { type: 'button', class: `chip st-${x.status}`, 'data-act': 'status', 'aria-haspopup': nx ? null : 'listbox',
    'aria-expanded': nx ? null : 'false', 'aria-keyshortcuts': 'Alt+ArrowDown', 'aria-label': `Status: ${label}. ${how}`, title: how }, label);
}

/** Thẻ chạm --card-max thì thân bị cắt: mờ dần ở đáy và thêm nút "Xem thêm" (mở cả thẻ). Nút ngoài vòng Tab:
 * bàn phím đọc trọn trong hộp sửa. */
/** Một tài liệu của bước (chip): link mở tab mới, văn bản mở hộp đọc. @param {any} d */
function docChip(d) {
  return h('li', {}, d.kind === 'link'
    ? h('a', { class: 'doc-chip', href: d.url, target: '_blank', rel: 'noopener noreferrer', title: `${d.title}\n${d.url}`, 'data-doc': d.id }, icon('link'), h('span', {}, d.title))
    : h('button', { type: 'button', class: 'doc-chip', 'data-act': 'open-doc', 'data-doc': d.id, title: d.title }, icon('doc'), h('span', {}, d.title)));
}

/* Ghi chú dài trên thẻ chưa mở: chỉ dựng phần đầu (dàn chữ là phần tốn nhất khi vẽ). Phần đầu đủ dài để tràn xa quá chỗ
 * cắt, nên thẻ trông y như khi dựng đủ; không tràn đủ xa thì dựng đủ rồi đo lại. "Show more" dựng đủ. */
const NOTE_LINES = 16;
const NOTE_CHARS = 1600;
const CLIP_SLACK = 64; // px: phần đầu phải tràn quá chỗ cắt chừng này, dòng cuối (có thể bị cắt giữa chừng) mới chắc khuất
/** @param {string} notes @param {boolean} full */
function cardNotes(notes, full) {
  const head = full ? notes : notes.split('\n', NOTE_LINES).join('\n').slice(0, NOTE_CHARS);
  return h('p', { class: 'card-notes', 'data-clip': head !== notes }, withLinks(head));
}
/** Thẻ đang hiện phần đầu ghi chú: dựng đủ. @param {Element} card */
function unclip(card) {
  const p = card.querySelector('.card-notes[data-clip]');
  if (!p) return;
  const id = /** @type {HTMLElement} */ (card).dataset.sub;
  const x = cur()?.steps.flatMap((/** @type {any} */ s) => s.subs).find((/** @type {any} */ y) => y.id === id);
  p.removeAttribute('data-clip');
  if (x) p.replaceChildren(...withLinks(x.notes));
}

/** Đo các thẻ: đọc hết rồi mới ghi, nên cả lượt chỉ một lần dàn trang. Thẻ đã đo thì gỡ dấu cũ, đo lại.
 * @param {HTMLElement[]} cards @param {Set<string>} [keepOpen] thẻ đang mở trước lần vẽ này */
function markCutCards(cards, keepOpen = new Set()) {
  for (const card of cards) {
    if (!card.classList.contains('cut')) continue;
    card.classList.remove('cut', 'open');
    card.querySelector(':scope > .more')?.remove();
  }
  const bodies = cards.map((card) => /** @type {HTMLElement} */ (card.querySelector('.card-body')));
  let over = bodies.map((b) => b.scrollHeight - b.clientHeight);
  /* Ghi chú chỉ có phần đầu mà tràn chưa đủ xa (Compact ẩn ghi chú thì không tính): dựng đủ, đo lại riêng các thẻ ấy. */
  const compact = $('board').classList.contains('compact');
  const short = compact ? [] : cards.filter((c, k) => over[k] < CLIP_SLACK && c.querySelector('.card-notes[data-clip]'));
  if (short.length) {
    short.forEach(unclip);
    over = bodies.map((b, k) => (short.includes(cards[k]) ? b.scrollHeight - b.clientHeight : over[k]));
  }
  const cut = cards.filter((_, k) => over[k] > 1);
  for (const card of cut) {
    card.classList.add('cut');
    const open = keepOpen.has(/** @type {string} */ (card.dataset.sub));
    if (open) card.classList.add('open');
    card.querySelector(':scope > .card-body')?.after(h('button', { type: 'button', class: 'more', 'data-act': 'more', 'aria-expanded': String(open), tabindex: '-1' }, open ? 'Show less' : 'Show more'));
  }
}

/** Hàng thẻ còn chỗ cuộn thì mờ dần ở mép ấy. Đọc hết rồi mới ghi. @param {Iterable<any>} [list] mặc định mọi hàng */
function updateScrollCues(list = document.querySelectorAll('.cards-scroll')) {
  const m = [...list].filter(Boolean).map((sc) => [sc, sc.scrollLeft + sc.clientWidth < sc.scrollWidth - 2, sc.scrollLeft > 2]);
  for (const [sc, right, left] of m) {
    sc.classList.toggle('more-right', right);
    sc.classList.toggle('more-left', left);
  }
}
$('board').addEventListener('scroll', (/** @type {any} */ e) => { if (e.target.classList?.contains('cards-scroll')) updateScrollCues([e.target]); }, true);
window.addEventListener('resize', () => updateScrollCues());
/* Hàng dùng lại không được đo lại: font tải xong sau lần vẽ đầu (chữ dàn lại) thì đo lại mọi thẻ, giữ thẻ đang mở. */
document.fonts?.addEventListener('loadingdone', () => {
  const cards = /** @type {HTMLElement[]} */ ([...$('board').querySelectorAll('.card[data-sub]')]);
  markCutCards(cards, new Set(cards.filter((c) => c.classList.contains('open')).map((c) => /** @type {string} */ (c.dataset.sub))));
});

function barFill(/** @type {number} */ pct) {
  const i = h('i');
  i.style.width = pct + '%';
  return i;
}

/* ── Nhật ký quyết định: dòng thời gian theo tháng, mới nhất trước; cùng ngày thì ghi sau đứng trước ── */
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** Dòng do "Reopen" tự ghi. */
const AUTO_LOG = /^Reopened: .+ \(iteration \d+\)$/;
/** Ngày của dòng nhật ký tự ghi mới nhất khi mở lại bước này ('' nếu không còn). @param {any} ws @param {any} step @returns {string} */
const lastReopened = (ws, step) => ws.log.filter((/** @type {any} */ l) => l.stepId === step.id && AUTO_LOG.test(l.decision))
  .map((/** @type {any} */ l) => l.date).sort().at(-1) || '';
/** Bước đã mở lại rồi đóng vòng (không còn băng): nhãn "Iteration N" ở đầu bước, chú thích số lần mở lại, ngày mở lại cuối.
 * @param {any} step @param {string} last */
function iterTag(step, last) {
  const title = `Reopened ${C.plural(step.round - 1, 'time')}, every iteration closed${last ? ` · last reopened ${fmtDate(last)}` : ''}`;
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
function renderLog(ws, opt = {}) {
  if (!$('log-date').value) $('log-date').value = C.today();
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
      h('span', { class: 'log-month-n' }, C.plural(list.length, 'decision'))),
    h('ol', { class: 'log-entries' }, ...list.map(item)))));
  measureLog();
}
/* "Show more" chỉ hiện khi lý do bị cắt (hay đang mở hết); đo lại khi font tải xong và khi đổi cỡ. */
function measureLog() {
  for (const p of $('log-list').querySelectorAll('.log-why')) {
    const more = p.nextElementSibling;
    if (more) more.hidden = !(p.closest('.log-item').classList.contains('open') || p.scrollHeight > p.clientHeight + 1);
  }
}
document.fonts?.ready.then(measureLog);
window.addEventListener('resize', measureLog);
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

const BLANK_TPL = { id: 'blank', name: 'Blank', description: '', steps: [] };
/** Tên, mô tả và số bước / bước con của một mẫu (đếm từ templates.json). @param {any} t */
function tplInfo(t) {
  const subs = t.steps.reduce((/** @type {number} */ n, /** @type {any} */ s) => n + (s.subs || []).length, 0);
  return h('span', {}, h('b', {}, t.name), t.description && h('small', {}, t.description),
    t.steps.length > 0 && h('span', { class: 'tpl-n' }, `${C.plural(t.steps.length, 'step')} · ${C.plural(subs, 'sub-step')}`));
}
function renderStart() {
  const list = templates.length ? templates : [BLANK_TPL];
  $('start-templates').replaceChildren(...list.map((t) => h('button', { type: 'button', class: 'tpl', 'data-tpl': t.id }, tplInfo(t))));
}

/* ── Hộp thoại: mở, focus ô đầu, hỏi lại khi đóng mà chữ chưa lưu ── */

const field = (/** @type {any} */ form, /** @type {string} */ name) => form.elements.namedItem(name);
const snapshot = (/** @type {any} */ form) => JSON.stringify([...form.elements].filter((e) => e.name).map((e) => (e.type === 'radio' || e.type === 'checkbox' ? e.checked : e.value)));
/** @type {WeakMap<any, string>} */
const snaps = new WeakMap();
const GUARDED = ['dlg-sub', 'dlg-step', 'dlg-revisit', 'dlg-log', 'dlg-notes', 'dlg-doc', 'dlg-md'];

function autosize(/** @type {any} */ el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 2 + 'px';
}
document.querySelectorAll('textarea.grow-title').forEach((ta) => {
  ta.addEventListener('input', () => autosize(ta));
  ta.addEventListener('keydown', (/** @type {any} */ e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ta.form.requestSubmit(); }
  });
});

/* Màn cảm ứng: mở hộp không tự focus ô chữ (bàn phím ảo bật lên che hộp). showModal focus phần tử đầu tiên: mọi hộp
 * trừ #dlg-ask mở đầu bằng nút ×; #dlg-ask trên màn cảm ứng đặt autofocus vào nút OK. */
const coarse = matchMedia('(pointer: coarse)');
const NO_KEYBOARD = ['radio', 'checkbox', 'button', 'submit', 'reset', 'file', 'date', 'range', 'color'];
/** @param {any} el @param {boolean} [select] */
function focusField(el, select = false) {
  if (!el) return;
  const typing = el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !NO_KEYBOARD.includes(el.type));
  if (typing && coarse.matches) return;
  el.focus();
  if (select && typing && el.select) el.select();
}
/* Đóng hộp (Esc, Close, Save, Enter): focus về nút mở hay chỗ vừa sửa. Phím vừa bấm khiến trình duyệt vẽ vòng
 * focus-visible quanh chỗ ấy; lớp quiet-focus ẩn vòng tới lần bấm Tab / mũi tên kế tiếp, chuột hay chạm cũng gỡ lớp.
 * Đặt lớp ngay lúc bắt đầu đóng (Esc, submit, nút Close, closeSaved, tryClose), không chờ sự kiện close: sự kiện ấy tới
 * sau, có thể sau cả lần bấm Tab kế tiếp. */
const NAV_KEYS = ['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'];
const quietFocus = () => document.documentElement.classList.add('quiet-focus');
document.addEventListener('cancel', (/** @type {any} */ e) => { if (e.target instanceof HTMLDialogElement) quietFocus(); }, true);
document.addEventListener('submit', (/** @type {any} */ e) => { if (e.target.closest('dialog')) quietFocus(); }, true);
window.addEventListener('keydown', (e) => { if (NAV_KEYS.includes(e.key)) document.documentElement.classList.remove('quiet-focus'); }, true);
window.addEventListener('pointerdown', () => document.documentElement.classList.remove('quiet-focus'), true);

/** Hộp dùng lại cho mục khác: thân về đầu, không giữ chỗ cuộn của lần mở trước. @param {any} dlg */
function showDlg(dlg) {
  dlg.showModal(); // hộp đóng không cuộn được: đặt lại sau khi mở
  for (const b of dlg.querySelectorAll('.dlg-body')) b.scrollTop = 0;
}
/** @param {any} dlg @param {any} [focusEl] */
function openDlg(dlg, focusEl) {
  showDlg(dlg);
  dlg.querySelectorAll('textarea.grow-title').forEach(autosize);
  const form = dlg.querySelector('form');
  if (form && GUARDED.includes(dlg.id)) snaps.set(dlg, snapshot(form));
  focusField(focusEl, true);
}
/** Đóng hộp; chữ đã sửa mà chưa lưu thì hỏi lại. @param {any} dlg */
async function tryClose(dlg) {
  const form = dlg.querySelector('form');
  if (form && snaps.has(dlg) && snapshot(form) !== snaps.get(dlg)) {
    const ok = await ask({ title: 'Discard changes?', text: 'Unsaved edits in this dialog will be lost.', ok: 'Discard', danger: true });
    if (ok === null) return false;
  }
  snaps.delete(dlg);
  quietFocus();
  dlg.close();
  return true;
}
/** Lưu xong: đóng hộp không hỏi. @param {any} dlg */
function closeSaved(dlg) {
  snaps.delete(dlg);
  quietFocus();
  dlg.close();
}
for (const id of GUARDED) {
  $(id).addEventListener('cancel', (/** @type {any} */ e) => { e.preventDefault(); tryClose($(id)); });
}
document.addEventListener('click', (/** @type {any} */ e) => {
  const b = e.target.closest && e.target.closest('[data-close]');
  if (!b) return;
  const dlg = b.closest('dialog');
  quietFocus();
  if (GUARDED.includes(dlg.id)) tryClose(dlg); else dlg.close();
});

/** @param {{title:string, text?:string, label?:string, value?:string, ok:string, danger?:boolean}} o @returns {Promise<string|null>} */
function ask(o) {
  const dlg = $('dlg-ask');
  $('dlg-ask-title').textContent = o.title;
  $('ask-text').textContent = o.text || '';
  $('ask-text').hidden = !o.text;
  $('ask-field').hidden = !o.label;
  $('ask-label').textContent = o.label || '';
  $('ask-input').value = o.value || '';
  $('ask-input').required = !!o.label;
  $('ask-ok').textContent = o.ok;
  $('ask-ok').className = 'btn ' + (o.danger ? 'danger' : 'go');
  dlg.returnValue = '';
  $('ask-ok').autofocus = coarse.matches;
  dlg.showModal();
  if (o.label) focusField($('ask-input'), true); else $('ask-ok').focus();
  return new Promise((resolve) => {
    dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok' ? $('ask-input').value : null), { once: true });
  });
}

/* Mọi <select> có nghĩa dùng danh sách chọn tự dựng; ô vị trí của bước chỉ là số nên giữ <select> gốc. */
field($('step-form'), 'pos').dataset.native = '';
document.querySelectorAll('select').forEach((s) => enhanceSelect(/** @type {HTMLSelectElement} */ (s)));

/* ── Dự án ── */

/** @param {any} ws */
function addWorkspace(ws) {
  state.workspaces.push(ws);
  setCur(ws.id);
  ui.q = '';
  $('q').value = '';
}
function afterOpen() {
  window.scrollTo(0, 0);
  refocus('#ws-btn', { preventScroll: true });
}
function createFrom(/** @type {string} */ tplId, /** @type {string} */ name = '') {
  const tpl = templates.find((t) => t.id === tplId) || { id: 'blank', name: 'Untitled project', steps: [] };
  addWorkspace(C.fromTemplate(tpl, name));
  commit();
  afterOpen();
}
function switchTo(/** @type {string} */ id) {
  setCur(id);
  ui.q = '';
  $('q').value = '';
  persist();
  render({ full: true });
}

$('start-templates').addEventListener('click', (/** @type {any} */ e) => {
  const b = e.target.closest('[data-tpl]');
  if (b) createFrom(b.dataset.tpl);
});
$('start-import').addEventListener('click', () => openImport());

/* Hộp Dự án: hai tab — Open (danh sách dự án) và New project (tên + thẻ mẫu). Nút Create chỉ hiện ở tab New. */
/** @param {'open'|'new'} tab */
function setWsTab(tab) {
  for (const t of /** @type {any} */ ($('dlg-ws').querySelectorAll('[data-ws-tab]'))) {
    const on = t.dataset.wsTab === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
  }
  $('ws-pane-open').hidden = tab !== 'open';
  $('ws-pane-new').hidden = tab !== 'new';
  $('ws-pane-' + tab).scrollTop = 0; // hộp dùng lại: lần trước cuộn tới đâu thì lần này vẫn mở từ đầu
  $('ws-create').hidden = tab !== 'new';
}
$('dlg-ws').querySelector('.tabs').addEventListener('click', (/** @type {any} */ e) => {
  const t = e.target.closest('[data-ws-tab]');
  if (t) setWsTab(t.dataset.wsTab);
});
$('dlg-ws').querySelector('.tabs').addEventListener('keydown', (/** @type {any} */ e) => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const next = e.target.dataset.wsTab === 'open' ? 'new' : 'open';
  setWsTab(next);
  $('ws-tab-' + next).focus();
});
function openWs() {
  renderWsList();
  const fs = $('ws-new-templates');
  fs.replaceChildren(h('legend', {}, 'Template'), ...(templates.length ? templates : [BLANK_TPL]).map((t, i) =>
    h('label', { class: 'tpl', title: t.description || null }, h('input', { type: 'radio', name: 'tpl', value: t.id, checked: i === 0 }), tplInfo(t),
      h('span', { class: 'tpl-check', 'aria-hidden': 'true' }, icon('check')))));
  $('ws-new-name').value = '';
  setWsTab(state.workspaces.length ? 'open' : 'new');
  showDlg($('dlg-ws'));
}
function renderWsList() {
  $('ws-count').textContent = String(state.workspaces.length);
  $('ws-list').replaceChildren(...state.workspaces.map((w) => {
    const o = C.overall(w);
    const tpl = templates.find((t) => t.id === w.templateId);
    const now = w.id === curId;
    const meta = [tpl && tpl.steps.length && C.fold(tpl.name) !== C.fold(w.name) ? tpl.name : '', C.plural(w.steps.length, 'step'), `edited ${fmtDate(w.updatedAt.slice(0, 10))}`];
    return h('li', { class: 'ws-item' + (now ? ' now' : ''), 'data-ws': w.id },
      h('button', { type: 'button', class: 'ws-open', 'data-act': 'ws-open', 'aria-current': now ? 'true' : null },
        h('span', { class: 'ws-top' }, h('b', { class: 'ws-title' }, w.name), now && h('span', { class: 'ws-now' }, 'Open now')),
        h('span', { class: 'ws-meta' }, meta.filter(Boolean).join(' · ')),
        h('span', { class: 'ws-prog' }, h('span', { class: 'bar-prog', 'aria-hidden': 'true' }, barFill(o.pct)),
          h('small', {}, o.total ? `${o.done}/${o.total} done · ${o.pct}%` : 'No sub-steps yet'))),
      h('span', { class: 'ws-acts' },
        h('button', { type: 'button', class: 'icon-btn', 'data-act': 'ws-rename', 'aria-label': `Rename ${w.name}`, title: 'Rename' }, icon('pencil')),
        h('button', { type: 'button', class: 'icon-btn', 'data-act': 'ws-dup', 'aria-label': `Duplicate ${w.name}`, title: 'Duplicate' }, icon('copy')),
        h('button', { type: 'button', class: 'icon-btn del', 'data-act': 'ws-del', 'aria-label': `Delete ${w.name}`, title: 'Delete' }, icon('trash'))));
  }));
  if (!state.workspaces.length) $('ws-list').append(h('li', { class: 'ws-empty' }, 'No projects yet. Start one under New project.'));
}
$('ws-btn').addEventListener('click', openWs);
$('ws-list').addEventListener('click', async (/** @type {any} */ e) => {
  const b = e.target.closest('[data-act]');
  const li = e.target.closest('[data-ws]');
  if (!b || !li) return;
  const id = li.dataset.ws;
  const act = b.dataset.act;
  if (act === 'ws-open') { $('dlg-ws').close(); switchTo(id); afterOpen(); return; }
  if (act === 'ws-rename') {
    const w = findWs(id);
    const name = w && await ask({ title: 'Rename project', label: 'Name', value: w.name, ok: 'Rename' });
    const w2 = findWs(id);
    if (w2 && name && C.oneLine(name)) { w2.name = C.oneLine(name); w2.updatedAt = new Date().toISOString(); persist(); render(); }
  } else if (act === 'ws-dup') {
    const w = findWs(id);
    if (!w) return;
    const c = C.freshCopy(w);
    c.name = C.uniqueName(w.name, state.workspaces.map((x) => x.name), 'copy');
    state.workspaces.splice(state.workspaces.indexOf(w) + 1, 0, c);
    persist(); render();
  } else if (act === 'ws-del') {
    const w = findWs(id);
    const ok = w && await ask({ title: 'Delete project?', text: `"${w.name}" will be deleted from this browser and cannot be undone. Back up as JSON first if you need it.`, ok: 'Delete', danger: true });
    if (ok === null) return;
    state.workspaces = state.workspaces.filter((x) => x.id !== id);
    hideToast(false);
    if (curId === id) setCur(state.workspaces[0]?.id || '');
    persist(); render();
    if (!state.workspaces.length) { $('dlg-ws').close(); refocus('#start .tpl'); return; }
  }
  renderWsList();
  refocus(`[data-ws="${id}"] [data-act="${act}"] || #ws-list button`);
});
$('ws-new').addEventListener('submit', (/** @type {any} */ e) => {
  e.preventDefault();
  const tpl = /** @type {any} */ (document.querySelector('#ws-new-templates input:checked'))?.value || 'blank';
  $('dlg-ws').close();
  createFrom(tpl, $('ws-new-name').value);
});

/* ── Mẹo cho người mới: tắt một lần, nhớ ở máy này ── */

$('hint-off').addEventListener('click', () => {
  S.hideHint();
  $('hint').hidden = true;
  refocus('#q');
});

/* ── Chế độ Gọn (ẩn "Xong khi" và ghi chú trên bảng) và nút tới nhật ký ── */

$('compact-btn').addEventListener('click', () => {
  S.setCompact(!S.compactOn());
  render();
});
$('sd-btn').addEventListener('click', () => {
  const sd = $('sd');
  sd.scrollIntoView({ block: 'start' });
  sd.focus({ preventScroll: true });
});
$('log-btn').addEventListener('click', () => {
  const log = $('log');
  log.scrollIntoView({ block: 'start' });
  log.focus({ preventScroll: true });
});

/* ── Ghi chú dự án ── */

$('ws-notes-edit').addEventListener('click', () => {
  const ws = cur();
  if (!ws) return;
  field($('notes-form'), 'notes').value = ws.notes;
  openDlg($('dlg-notes'), field($('notes-form'), 'notes'));
});
$('notes-form').addEventListener('submit', (/** @type {any} */ e) => {
  e.preventDefault();
  const ws = cur();
  closeSaved($('dlg-notes'));
  if (!ws) return;
  ws.notes = C.multiLine(field($('notes-form'), 'notes').value);
  commit('#ws-notes-edit');
});

/* ── Hành động trên bảng ── */

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
    unclip(b.closest('.card'));
    const open = b.closest('.card').classList.toggle('open');
    b.textContent = open ? 'Show less' : 'Show more';
    b.setAttribute('aria-expanded', String(open));
    return;
  }
  const row = b.closest('[data-step]');
  const step = row && stepOf(ws, row.dataset.step);
  if (!step) return;
  const card = b.closest('[data-sub]');
  const sub = card && step.subs.find((/** @type {any} */ x) => x.id === card.dataset.sub);
  switch (act) {
    case 'edit-step': openStep(step); break;
    case 'add-doc': openDocNew({ wsId: ws.id, stepId: step.id, subId: null, docId: null }); break;
    case 'open-doc': openMd({ wsId: ws.id, stepId: step.id, subId: null, docId: b.dataset.doc }); break;
    case 'sub-docs': openSub(step, sub, { toDocs: true }); break;
    case 'revisit': openRevisit(step); break;
    case 'revisit-clear': closeIteration(ws.id, step.id); break;
    case 'del-step': deleteStep(ws.id, step.id); break;
    case 'add-sub': openSub(step, null); break;
    case 'add-par': { const p = C.subPlace(ws, sub.id); openSub(step, null, { pos: `j:${p ? p.slot : 0}` }); break; }
    case 'status': {
      if (consumeJustClosed(b)) break;
      const nx = C.nextStatus(sub.status);
      if (nx && !e.shiftKey) { C.setStatus(sub, nx); commit(subSel(sub.id, 'status')); } else openStatusMenu(b, step, sub);
      break;
    }
    case 'edit-sub': openSub(step, sub); break;
    case 'sub-dup': duplicateSub(step, sub); break;
    case 'sub-del': deleteSub(ws.id, step.id, sub.id); break;
  }
});

/** Danh sách mọi trạng thái, mở dưới chip. Chọn Cancelled: mở hộp sửa ở ô lý do (lưu mới huỷ); Pending, Blocked đặt ngay
 * (lý do không bắt buộc, sửa trong hộp). @param {any} chip @param {any} step @param {any} sub */
function openStatusMenu(chip, step, sub) {
  const ids = { wsId: cur().id, stepId: step.id, subId: sub.id };
  openList(chip, C.STATUSES.map((st) => ({ value: st, label: C.STATUS_LABEL[st], hint: C.STATUS_HINT[st], dot: st, selected: st === sub.status })), (v) => {
    const s = stepOf(findWs(ids.wsId), ids.stepId);
    const x = s && s.subs.find((/** @type {any} */ y) => y.id === ids.subId);
    if (!x) return;
    if (v === 'cancel') { openSub(s, x, { status: 'cancel' }); return; }
    if (v === x.status) return;
    C.setStatus(x, v);
    commit(subSel(x.id, 'status'));
  }, { label: `Status of "${sub.title}"`, className: 'dd-status' });
}

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
    const to = sub && C.shiftTarget(ws, sub.id, /** @type {any} */ (e.key.slice(5).toLowerCase()));
    if (to) moveSubTo(ws, sub, to);
  }
});

function moveStep(/** @type {any} */ ws, /** @type {any} */ step, /** @type {number} */ d, /** @type {string} */ act) {
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
/** Đặt bước con vào chỗ `to` (C.Place): lưu, vẽ, tô, toast có Hoàn tác. @param {any} ws @param {any} sub @param {C.Place} to */
function moveSubTo(ws, sub, to, focusSel = subSel(sub.id, 'edit-sub')) {
  const m = beginMove('sub', sub.id);
  const before = ws.steps.find((/** @type {any} */ s) => s.subs.includes(sub));
  const j = before ? before.subs.indexOf(sub) : -1;
  if (C.placeSub(ws, sub, to) === undefined) return;
  const target = stepOf(ws, to.stepId);
  const k = target.subs.indexOf(sub);
  /* Cái bị đổi chỗ: dời tới trong cùng hàng thì cái nó vừa vượt qua (đứng ngay trước); còn lại cái bị đẩy lùi (ngay sau). */
  const swap = before === target && k > j ? target.subs[k - 1] : target.subs[k + 1] || target.subs[k - 1];
  endMove(m, swap?.id, focusSel);
}

/* ── Vừa dời: tô thẻ / hàng vừa di chuyển và cái bị đổi chỗ với nó, toast "Moved "tên" after "tên"" có Hoàn tác.
 * Toast tả chỗ mới bằng tên hàng xóm, không bằng số (số giữ nguyên tới khi tải lại). Dời liền nhiều lần cùng một thứ
 * (toast của nó còn hiện) thì Hoàn tác trả về chỗ trước lần dời đầu. ── */

/** @type {null | {kind:'sub'|'step', id:string, wsId:string, from:any, fromStepId:string, undo:null|(() => void)}} */
let lastMove = null;
let flashTimer = 0;

const quote = (/** @type {string} */ t) => `"${t.length > 40 ? t.slice(0, 39) + '…' : t}"`;
/** Chỗ hiện tại: bước con → C.Place, bước → chỉ số. @param {any} ws @param {'sub'|'step'} kind @param {string} id */
const placeNow = (ws, kind, id) => (kind === 'step' ? ws.steps.findIndex((/** @type {any} */ s) => s.id === id) : C.subPlace(ws, id));
/** Câu tả chỗ mới cho toast. @param {any} ws @param {'sub'|'step'} kind @param {string} id @param {string} fromStepId */
function movedText(ws, kind, id, fromStepId) {
  if (kind === 'step') {
    const i = ws.steps.findIndex((/** @type {any} */ s) => s.id === id);
    return `Moved step ${quote(ws.steps[i].title)} ` + (i === 0 ? 'to the top' : `below ${quote(ws.steps[i - 1].title)}`);
  }
  const p = C.subPlace(ws, id);
  const step = stepOf(ws, p.stepId);
  const sub = step.subs.find((/** @type {any} */ x) => x.id === id);
  const slots = C.slotsOf(step.subs.filter((/** @type {any} */ x) => x !== sub));
  const where = p.join ? `in parallel with ${quote(slots[p.slot].find((x) => x !== sub).title)}`
    : p.slot === 0 ? 'the start of the row' : `after ${quote(slots[p.slot - 1].at(-1).title)}`;
  if (p.stepId !== fromStepId) return `Moved ${quote(sub.title)} to step ${quote(step.title)}, ${where}`;
  return `Moved ${quote(sub.title)} ` + (p.join ? `to run ${where}` : p.slot === 0 ? `to ${where}` : where);
}
/** Gọi trước khi đổi chỗ. @param {'sub'|'step'} kind @param {string} id */
function beginMove(kind, id) {
  const ws = cur();
  if (lastMove && lastMove.kind === kind && lastMove.id === id && lastMove.wsId === ws.id
    && !$('toast').hidden && toastUndo && toastUndo === lastMove.undo) return lastMove;
  const from = placeNow(ws, kind, id);
  lastMove = { kind, id, wsId: ws.id, from, fromStepId: kind === 'sub' ? from?.stepId : id, undo: null };
  return lastMove;
}
/** Gọi sau khi đổi chỗ: lưu, vẽ, giữ focus, tô, báo. @param {any} m @param {string|null|undefined} swapId @param {string} focusSel */
function endMove(m, swapId, focusSel) {
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
  toast(movedText(ws, m.kind, m.id, m.fromStepId), m.undo, focusSel, false);
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
    C.placeSub(w, from.subs.find((/** @type {any} */ x) => x.id === m.id), m.from);
  }
  if (curId !== m.wsId) switchTo(m.wsId);
  commit(m.kind === 'step' ? stepSel(m.id, 'edit-step') : subSel(m.id, 'edit-sub'));
  flash(m.kind, m.id, null);
}
/** Thời gian tô, đọc từ token --flash-dur (CSS là nguồn duy nhất). */
function flashMs() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--flash-dur').trim();
  const n = parseFloat(v);
  return !n ? 2600 : v.endsWith('ms') ? n : n * 1000;
}
/** Tô cái vừa dời (thẻ, hàng), quyết định vừa ghi, hay bước vừa nhảy tới. @param {'sub'|'step'|'log'} kind @param {string} id @param {string|null|undefined} swapId */
function flash(kind, id, swapId) {
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

function duplicateSub(/** @type {any} */ step, /** @type {any} */ sub) {
  const c = C.normSub({ ...sub, id: '', title: sub.title + ' (copy)', docs: sub.docs.map((/** @type {any} */ d) => ({ ...d, id: '' })) });
  /* Bản sao đứng ngay sau bản gốc: trong cùng ô song song nếu bản gốc ở ô song song, không thì một ô mới. */
  const p = C.subPlace(cur(), sub.id);
  if (!p) return;
  C.placeSub(cur(), c, p.join ? { ...p, at: p.at + 1 } : { ...p, slot: p.slot + 1 });
  commit(subSel(c.id, 'edit-sub'));
}

/* Hoàn tác tìm lại dự án và bước theo id: tab khác có thể đã thay cả `state` trong lúc chờ. */
function deleteSub(/** @type {string} */ wsId, /** @type {string} */ stepId, /** @type {string} */ subId) {
  const ws = findWs(wsId);
  const step = stepOf(ws, stepId);
  const j = step ? step.subs.findIndex((/** @type {any} */ x) => x.id === subId) : -1;
  if (j < 0) return;
  const place = /** @type {C.Place} */ (C.subPlace(ws, subId));
  const sub = C.takeSub(ws, subId);
  commit();
  const back = `${subSel(step.subs[Math.min(j, step.subs.length - 1)]?.id, 'edit-sub')} || ${stepSel(stepId, 'add-sub')}`;
  toast(`Deleted "${sub.title}".`, () => {
    const w = findWs(wsId);
    const s = stepOf(w, stepId);
    if (!w) { toast('Cannot undo: the project was deleted.'); return; }
    if (!s) { toast('Cannot undo: its step was deleted.'); return; }
    if (!s.subs.some((/** @type {any} */ x) => x.id === sub.id)) C.placeSub(w, sub, place);
    if (curId !== wsId) switchTo(wsId);
    commit(subSel(sub.id, 'edit-sub'));
  }, back);
}

async function deleteStep(/** @type {string} */ wsId, /** @type {string} */ stepId) {
  let step = stepOf(findWs(wsId), stepId);
  if (!step) return;
  if (step.subs.length) {
    const ok = await ask({ title: 'Delete step?', text: `"${step.title}" and its ${C.plural(step.subs.length, 'sub-step')} will be deleted (you can undo right after).`, ok: 'Delete step', danger: true });
    if (ok === null) return;
  }
  const ws = findWs(wsId);
  step = stepOf(ws, stepId);
  if (!step) return;
  const i = ws.steps.indexOf(step);
  ws.steps.splice(i, 1);
  commit();
  const near = ws.steps[Math.min(i, ws.steps.length - 1)];
  toast(`Deleted step "${step.title}" (${C.plural(step.subs.length, 'sub-step')}).`, () => {
    const w = findWs(wsId);
    if (!w) { toast('Cannot undo: the project was deleted.'); return; }
    if (!stepOf(w, step.id)) w.steps.splice(Math.min(i, w.steps.length), 0, step);
    if (curId !== wsId) switchTo(wsId);
    commit(stepSel(step.id, 'edit-step'));
  }, near ? stepSel(near.id, 'edit-step') : '#add-step');
}

/* ── Hộp bước con ── */

/** pos: chỗ đặt sẵn cho bước con mới ("j:2" = song song với ô 2); pos0: giá trị ô Vị trí lúc mở hộp.
 * @type {{wsId:string, stepId:string, subId:string|null, pos?:string, pos0?:string}|null} */
let subCtx = null;

function fillPos(/** @type {any} */ sel, /** @type {number} */ n, /** @type {number} */ value) {
  sel.replaceChildren(...Array.from({ length: n }, (_, i) => h('option', { value: String(i) }, String(i + 1))));
  sel.value = String(Math.max(0, Math.min(value, n - 1)));
}
/** Ô "Vị trí" của bước con: "Position N" (một ô riêng chen vào chỗ N) và "Parallel with N" (nhập vào ô N), tính trên hàng
 * của bước đích khi đã nhấc bước con này ra; giá trị `n:i` / `j:i` (xem C.Place). */
function subPosOptions(keep = true) {
  const f = $('sub-form');
  const ws = cur();
  const target = stepOf(ws, field(f, 'step').value);
  if (!target || !subCtx) return;
  const self = subCtx.subId;
  const slots = C.slotsOf(target.subs.filter((/** @type {any} */ x) => x.id !== self));
  const opts = [];
  for (let i = 0; i <= slots.length; i++) {
    const hint = i < slots.length ? `Before ${quote(slots[i][0].title)}` : slots.length ? `After ${quote(slots[i - 1].at(-1).title)}` : 'First in this step';
    opts.push(h('option', { value: `n:${i}`, 'data-hint': hint }, `Position ${i + 1}`));
    if (i < slots.length) opts.push(h('option', { value: `j:${i}`, 'data-hint': `Runs alongside ${slots[i].map((x) => quote(x.title)).join(', ')}` }, `Parallel with ${i + 1}`));
  }
  field(f, 'pos').replaceChildren(...opts);
  const p = self && target.id === subCtx.stepId ? C.subPlace(ws, self) : null;
  field(f, 'pos').value = p ? `${p.join ? 'j' : 'n'}:${p.slot}` : keep && subCtx.pos ? subCtx.pos : `n:${slots.length}`;
}

/** @param {any} step @param {any} sub @param {{toDocs?:boolean, status?:string, pos?:string}} [opt] status: đặt sẵn trạng thái
 * (Cancelled: focus ô lý do); pos: chỗ đặt sẵn của bước con mới */
function openSub(step, sub, opt = {}) {
  const ws = cur();
  const f = $('sub-form');
  subCtx = { wsId: ws.id, stepId: step.id, subId: sub ? sub.id : null, pos: opt.pos };
  $('dlg-sub-title').textContent = sub ? 'Edit sub-step' : 'Add sub-step';
  $('sub-where').textContent = docWhere({ wsId: ws.id, stepId: step.id, subId: null, docId: null });
  const labels = labelsOf(ws);
  field(f, 'step').replaceChildren(...ws.steps.map((/** @type {any} */ s) => h('option', { value: s.id }, (labels.has(s.id) ? `${labels.get(s.id)}. ` : '') + s.title)));
  const x = sub || C.normSub({ title: '' });
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
  docUndo = null;
  renderDocsEdit('sub');
  openDlg($('dlg-sub'), opt.toDocs ? null : opt.status === 'cancel' ? field(f, 'reason') : field(f, 'title'));
  if (opt.toDocs) {
    $('sub-docs').scrollIntoView({ block: 'nearest' });
    /** @type {any} */ ($('sub-docs').querySelector('.doc-list button, [data-doc-add]')).focus();
  }
}
field($('sub-form'), 'step').addEventListener('change', () => subPosOptions(false));
/* Pending, Blocked, Cancelled thì hiện ô lý do, nhãn theo trạng thái (giữ chữ đã gõ khi đổi qua lại; lưu với trạng thái
 * không có lý do thì bỏ). */
function paintReason() {
  const st = field($('sub-form'), 'status').value;
  const ta = field($('sub-form'), 'reason');
  $('sub-reason').hidden = !C.hasReason(st);
  if (!C.hasReason(st)) return;
  $('sub-reason-label').textContent = C.REASON_LABEL[st];
  ta.placeholder = ta.dataset['ph' + st[0].toUpperCase() + st.slice(1)] || '';
}
/* Bảy viên trạng thái nằm sẵn trong HTML; chữ giải thích của mỗi viên lấy từ core.js. */
for (const r of /** @type {any} */ ($('sub-status').querySelectorAll('input[name="status"]'))) r.closest('label').title = C.STATUS_HINT[r.value];
$('sub-status').addEventListener('change', () => {
  paintReason();
  /* Chỉ Cancelled đưa focus vào ô lý do: lý do của Pending, Blocked không bắt buộc, và mũi tên trong nhóm viên phải đi tiếp. */
  if (field($('sub-form'), 'status').value === 'cancel') focusField(field($('sub-form'), 'reason'));
});
function subFromCtx() {
  const ws = subCtx && findWs(subCtx.wsId);
  const step = ws && stepOf(ws, subCtx.stepId);
  const sub = step && subCtx.subId ? step.subs.find((/** @type {any} */ x) => x.id === subCtx.subId) : null;
  return { ws, step, sub };
}
$('sub-form').addEventListener('submit', (/** @type {any} */ e) => {
  e.preventDefault();
  const f = $('sub-form');
  const { ws, step, sub } = subFromCtx();
  closeSaved($('dlg-sub'));
  if (!ws || !step || (subCtx.subId && !sub)) { toast('Not saved: the step was deleted elsewhere.'); return; }
  const data = C.normSub({
    id: sub ? sub.id : '', docs: sub ? sub.docs : [],
    title: field(f, 'title').value, status: field(f, 'status').value,
    due: field(f, 'due').value, doneWhen: field(f, 'doneWhen').value, notes: field(f, 'notes').value, reason: field(f, 'reason').value,
  });
  const target = stepOf(ws, field(f, 'step').value) || step;
  const pos = String(field(f, 'pos').value || 'n:999');
  const to = { stepId: target.id, slot: Number(pos.slice(2)) || 0, join: pos[0] === 'j', at: Infinity };
  const { par, ...rest } = data; // ô song song do chỗ đặt quyết định, không do hộp sửa
  const item = sub ? Object.assign(sub, rest) : data;
  if (curId !== ws.id) switchTo(ws.id);
  const focusSel = `${subSel(item.id, 'edit-sub')} || ${stepSel(target.id, 'add-sub')} || #q`;
  if (sub && (target !== step || pos !== subCtx.pos0)) moveSubTo(ws, sub, to, focusSel);
  else {
    if (!sub) C.placeSub(ws, item, to);
    commit(focusSel);
  }
  if (!document.querySelector(`.card[data-sub="${item.id}"]`)) toast(sub ? 'Saved — hidden by the search filter.' : 'Added — hidden by the search filter.');
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

/* ── Hộp bước ── */

/** @type {{wsId:string, stepId:string|null}|null} */
let stepCtx = null;
/** @param {any} step null: thêm bước mới @param {number} [at] bước mới: chỗ chèn đặt sẵn (mặc định cuối) */
function openStep(step, at) {
  const f = $('step-form');
  const ws = cur();
  stepCtx = { wsId: ws.id, stepId: step ? step.id : null };
  $('dlg-step-title').textContent = step ? 'Edit step' : 'Add step';
  field(f, 'title').value = step ? step.title : '';
  field(f, 'goal').value = step ? step.goal : '';
  field(f, 'doneWhen').value = step ? step.doneWhen : '';
  field(f, 'notes').value = step ? step.notes : '';
  const n = ws.steps.length + (step ? 0 : 1);
  fillPos(field(f, 'pos'), n, step ? ws.steps.indexOf(step) : at ?? n - 1);
  $('step-del').hidden = !step;
  $('step-revisit').hidden = !step || (!step.revisit && !C.canReopen(step));
  docUndo = null;
  renderDocsEdit('step');
  openDlg($('dlg-step'), field(f, 'title'));
}
$('add-step').addEventListener('click', () => openStep(null));
$('step-form').addEventListener('submit', (/** @type {any} */ e) => {
  e.preventDefault();
  const f = $('step-form');
  const ws = stepCtx && findWs(stepCtx.wsId);
  closeSaved($('dlg-step'));
  if (!ws) return;
  const vals = { title: field(f, 'title').value, goal: field(f, 'goal').value, doneWhen: field(f, 'doneWhen').value, notes: field(f, 'notes').value };
  let step = stepCtx.stepId ? stepOf(ws, stepCtx.stepId) : null;
  if (stepCtx.stepId && !step) { toast('Not saved: the step was deleted elsewhere.'); return; }
  const m = step && curId === ws.id ? beginMove('step', step.id) : null;
  const i = step ? ws.steps.indexOf(step) : -1;
  if (step) {
    const n = C.normStep({ ...step, ...vals });
    Object.assign(step, { title: n.title, goal: n.goal, doneWhen: n.doneWhen, notes: n.notes });
    ws.steps.splice(i, 1);
  } else step = C.normStep(vals);
  const k = Math.min(Number(field(f, 'pos').value) || 0, ws.steps.length);
  ws.steps.splice(k, 0, step);
  const focusSel = `${stepSel(step.id, 'edit-step')} || #q`;
  if (m && k !== i) endMove(m, (k > i ? ws.steps[k - 1] : ws.steps[k + 1])?.id, focusSel);
  else commit(focusSel);
});
$('step-del').addEventListener('click', () => {
  const ctx = stepCtx;
  closeSaved($('dlg-step'));
  if (ctx && ctx.stepId) deleteStep(ctx.wsId, ctx.stepId);
});
$('step-revisit').addEventListener('click', async () => {
  const ctx = stepCtx;
  if (!ctx || !ctx.stepId || !(await tryClose($('dlg-step')))) return;
  const step = stepOf(findWs(ctx.wsId), ctx.stepId);
  if (step) openRevisit(step);
});

/* ── Tài liệu của bước và bước con: link hoặc văn bản Markdown ──
 * Thêm, sửa, xoá trong hộp sửa bước / bước con (lưu ngay, không chờ nút Lưu của hộp ấy). Xoá có Hoàn tác: trong hộp
 * đang mở là một hàng "Đã xoá · Hoàn tác" (toast nằm dưới hộp thoại nên không bấm được), sau khi đóng hộp vẫn có toast. */

/** @typedef {{wsId:string, stepId:string, subId:string|null, docId:string|null}} DocCtx */
/** Bước hay bước con chứa tài liệu. @param {DocCtx} ctx */
function docOwner(ctx) {
  const step = stepOf(findWs(ctx.wsId), ctx.stepId);
  if (!step) return null;
  return ctx.subId ? step.subs.find((/** @type {any} */ x) => x.id === ctx.subId) || null : step;
}
/** "Bước 2 · tên" hay "Bước con 2.3 · tên". @param {DocCtx} ctx */
function docWhere(ctx) {
  const ws = findWs(ctx.wsId);
  const i = ws ? ws.steps.findIndex((/** @type {any} */ s) => s.id === ctx.stepId) : -1;
  if (i < 0) return '';
  const step = ws.steps[i];
  const labels = labelsOf(ws);
  if (!ctx.subId) return `Step ${labels.get(step.id) ?? ''} · ${step.title}`;
  const sub = step.subs.find((/** @type {any} */ x) => x.id === ctx.subId);
  return sub ? `Step ${labels.get(step.id) ?? ''} · sub-step ${labels.get(sub.id) ?? '(added)'} · ${sub.title}` : '';
}
/** Hộp sửa đang mở ('sub' / 'step') và ngữ cảnh tài liệu của nó. */
function hostCtx(/** @type {'sub'|'step'} */ where) {
  if (where === 'sub') return subCtx && subCtx.subId ? { wsId: subCtx.wsId, stepId: subCtx.stepId, subId: subCtx.subId, docId: null } : null;
  return stepCtx && stepCtx.stepId ? { wsId: stepCtx.wsId, stepId: stepCtx.stepId, subId: null, docId: null } : null;
}
/** @type {null | {where:'sub'|'step', title:string, run:() => void}} */
let docUndo = null;

/** Danh sách tài liệu trong hộp sửa bước / bước con. @param {'sub'|'step'} where */
function renderDocsEdit(where) {
  const sec = $(where + '-docs');
  const ctx = hostCtx(where);
  const owner = ctx && docOwner(ctx);
  const list = /** @type {any} */ (sec.querySelector('[data-doc-list]'));
  /** @type {any} */ (sec.querySelector('[data-doc-add]')).hidden = !owner;
  const note = /** @type {any} */ (sec.querySelector('[data-doc-note]'));
  note.textContent = !owner ? (where === 'sub' ? 'Save the sub-step first, then add docs.' : 'Save the step first, then add docs.')
    : owner.docs.length ? 'Adding, editing and deleting docs saves right away.' : 'None yet. A link (brief, data card, repo…) or a Markdown note.';
  const rows = owner ? owner.docs.map((/** @type {any} */ d) => h('li', { class: 'doc-row', 'data-doc': d.id },
    h('button', { type: 'button', class: 'doc-link', 'data-doc-act': 'open' }, icon(d.kind === 'link' ? 'link' : 'doc'), h('span', {}, d.title),
      d.kind === 'link' && h('small', {}, d.url.replace(/^https?:\/\/(www\.)?/i, '').split(/[/?#]/)[0])),
    h('button', { type: 'button', class: 'icon-btn', 'data-doc-act': 'del', 'aria-label': `Delete doc ${d.title}`, title: 'Delete doc' }, icon('trash')))) : [];
  if (docUndo && docUndo.where === where) {
    rows.push(h('li', { class: 'doc-row undo' }, h('span', {}, `Deleted "${docUndo.title}".`),
      h('button', { type: 'button', class: 'btn small', 'data-doc-act': 'undo' }, 'Undo')));
  }
  list.replaceChildren(...rows);
}
function refreshDocLists() {
  if ($('dlg-sub').open) renderDocsEdit('sub');
  if ($('dlg-step').open) renderDocsEdit('step');
}
const openHost = () => (/** @type {'sub'|'step'|''} */ ($('dlg-sub').open ? 'sub' : $('dlg-step').open ? 'step' : ''));
/** Chỗ focus sau khi lưu tài liệu: hàng trong hộp sửa đang mở, hoặc tài liệu ở cột bước. @param {DocCtx} ctx @param {string} id */
const docFocus = (ctx, id) => (openHost()
  ? `#${openHost()}-docs [data-doc="${id}"] [data-doc-act="open"] || #${openHost()}-docs [data-doc-add]`
  : `.step[data-step="${ctx.stepId}"] [data-doc="${id}"] || ${stepSel(ctx.stepId, 'edit-step')}`);

for (const where of /** @type {('sub'|'step')[]} */ (['sub', 'step'])) {
  $(where + '-docs').addEventListener('click', (/** @type {any} */ e) => {
    const ctx = hostCtx(where);
    if (!ctx) return;
    if (e.target.closest('[data-doc-add]')) { openDocNew(ctx); return; }
    const b = e.target.closest('[data-doc-act]');
    if (!b) return;
    if (b.dataset.docAct === 'undo') { if (docUndo) docUndo.run(); return; }
    const id = b.closest('[data-doc]').dataset.doc;
    const owner = docOwner(ctx);
    const doc = owner && owner.docs.find((/** @type {any} */ d) => d.id === id);
    if (!doc) return;
    const c = { ...ctx, docId: id };
    if (b.dataset.docAct === 'del') deleteDoc(c);
    else if (doc.kind === 'link') openLinkEdit(c, doc);
    else openMd(c);
  });
  $('dlg-' + where).addEventListener('close', () => { if (docUndo && docUndo.where === where) docUndo = null; });
}

/** Xoá một tài liệu; Hoàn tác trả về đúng chỗ. @param {DocCtx} ctx */
function deleteDoc(ctx) {
  const owner = docOwner(ctx);
  const k = owner ? owner.docs.findIndex((/** @type {any} */ d) => d.id === ctx.docId) : -1;
  if (k < 0) return;
  const [doc] = owner.docs.splice(k, 1);
  const host = openHost();
  const undo = () => {
    docUndo = null;
    hideToast(false);
    if (!findWs(ctx.wsId)) { toast('Cannot undo: the project was deleted.'); return; }
    const o = docOwner(ctx);
    if (!o) { toast('Cannot undo: its step was deleted.'); return; }
    if (!o.docs.some((/** @type {any} */ d) => d.id === doc.id)) o.docs.splice(Math.min(k, o.docs.length), 0, doc);
    if (curId !== ctx.wsId) switchTo(ctx.wsId);
    commit();
    refreshDocLists();
    refocus(docFocus(ctx, doc.id));
  };
  commit();
  if (host) {
    docUndo = { where: host, title: doc.title, run: undo };
    refreshDocLists();
    refocus(`#${host}-docs [data-doc-act="undo"]`);
    toast(`Deleted doc "${doc.title}".`, undo, docFocus(ctx, ''), false);
  } else toast(`Deleted doc "${doc.title}".`, undo, `${stepSel(ctx.stepId, 'edit-step')}`);
}

/* Hộp nhỏ: thêm tài liệu (chọn Link hay Văn bản), sửa link. */
/** @type {DocCtx|null} */
let docCtx = null;
const docKind = () => /** @type {any} */ ($('doc-form').querySelector('input[name="kind"]:checked')).value;
function paintDocKind() {
  const link = docKind() === 'link';
  $('doc-url-field').hidden = !link;
  field($('doc-form'), 'url').disabled = !link;
  $('doc-save').textContent = link || docCtx?.docId ? 'Save' : 'Next: write the note';
}
$('doc-kind').addEventListener('change', paintDocKind);
/** @param {DocCtx} ctx */
function openDocNew(ctx) {
  const f = $('doc-form');
  docCtx = { ...ctx, docId: null };
  $('dlg-doc-title').textContent = 'Add doc';
  $('doc-where').textContent = docWhere(ctx);
  $('doc-kind').hidden = false;
  /** @type {any} */ (f.querySelector('input[name="kind"][value="link"]')).checked = true;
  field(f, 'title').value = '';
  field(f, 'url').value = '';
  $('doc-open').hidden = true;
  $('doc-del').hidden = true;
  paintDocKind();
  openDlg($('dlg-doc'), field(f, 'title'));
}
/** @param {DocCtx} ctx @param {any} doc */
function openLinkEdit(ctx, doc) {
  const f = $('doc-form');
  docCtx = ctx;
  $('dlg-doc-title').textContent = 'Edit link';
  $('doc-where').textContent = docWhere(ctx);
  $('doc-kind').hidden = true;
  /** @type {any} */ (f.querySelector('input[name="kind"][value="link"]')).checked = true;
  field(f, 'title').value = doc.title;
  field(f, 'url').value = doc.url;
  $('doc-open').href = doc.url;
  $('doc-open').hidden = false;
  $('doc-del').hidden = false;
  paintDocKind();
  openDlg($('dlg-doc'), field(f, 'title'));
}
$('doc-form').addEventListener('submit', (/** @type {any} */ e) => {
  e.preventDefault();
  const f = $('doc-form');
  const ctx = docCtx;
  if (!ctx) return;
  const title = C.oneLine(field(f, 'title').value);
  if (docKind() === 'md' && !ctx.docId) {
    closeSaved($('dlg-doc'));
    openMd(ctx, title);
    return;
  }
  const url = C.safeUrl(field(f, 'url').value);
  if (!url) { field(f, 'url').setCustomValidity('The link must start with http:// or https://'); field(f, 'url').reportValidity(); return; }
  const owner = docOwner(ctx);
  closeSaved($('dlg-doc'));
  if (!owner) { toast('Not saved: the step was deleted elsewhere.'); return; }
  const old = ctx.docId ? owner.docs.find((/** @type {any} */ d) => d.id === ctx.docId) : null;
  const doc = C.normDoc({ id: old ? old.id : '', kind: 'link', title, url });
  if (old) Object.assign(old, doc); else owner.docs.push(doc);
  commit();
  refreshDocLists();
  refocus(docFocus(ctx, doc.id));
});
field($('doc-form'), 'url').addEventListener('input', (/** @type {any} */ e) => e.target.setCustomValidity(''));
$('doc-del').addEventListener('click', () => {
  const ctx = docCtx;
  closeSaved($('dlg-doc'));
  if (ctx && ctx.docId) deleteDoc(ctx);
});

/* Hộp lớn: văn bản Markdown, hai chế độ như md-annotate — Edit (ô chữ), Preview (bản dựng). */
/** @type {DocCtx|null} */
let mdCtx = null;
function paintMdView() {
  const body = field($('md-form'), 'body').value;
  $('md-view').replaceChildren(body.trim() ? renderMd(body) : h('p', { class: 'muted' }, 'Nothing here yet. Choose "Edit" to write.'));
}
/* Edit: bản tô màu nằm dưới ô chữ trong suốt; vẽ lại ngay mỗi lần gõ (chữ mới không hiện tới khi vẽ). Lề số rộng theo số chữ số. */
function paintMdSrc() {
  const body = field($('md-form'), 'body').value;
  $('md-hl').replaceChildren(renderSrc(body));
  $('md-ed').style.setProperty('--gw', Math.max(2, String(body.split('\n').length).length) + 'ch');
}
field($('md-form'), 'body').addEventListener('input', paintMdSrc);
/** @param {'edit'|'view'} mode */
function setMdMode(mode) {
  $('md-panes').dataset.mode = mode;
  for (const t of /** @type {any} */ ($('dlg-md').querySelectorAll('.tab'))) {
    const on = t.dataset.mode === mode;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
  }
  if (mode === 'view') paintMdView();
}
$('dlg-md').querySelector('.tabs').addEventListener('click', (/** @type {any} */ e) => {
  const t = e.target.closest('.tab');
  if (!t) return;
  setMdMode(t.dataset.mode);
  if (t.dataset.mode === 'edit') field($('md-form'), 'body').focus();
});
$('dlg-md').querySelector('.tabs').addEventListener('keydown', (/** @type {any} */ e) => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const tabs = [...$('dlg-md').querySelectorAll('.tab')];
  const k = (tabs.indexOf(e.target) + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  setMdMode(tabs[k].dataset.mode);
  tabs[k].focus();
});
/** @param {DocCtx} ctx @param {string} [newTitle] */
function openMd(ctx, newTitle = '') {
  const owner = docOwner(ctx);
  const doc = owner && ctx.docId ? owner.docs.find((/** @type {any} */ d) => d.id === ctx.docId) : null;
  if (!owner || (ctx.docId && !doc)) { toast('Cannot open: the doc was deleted elsewhere.'); return; }
  const f = $('md-form');
  mdCtx = ctx;
  field(f, 'title').value = doc ? doc.title : newTitle;
  field(f, 'body').value = doc ? doc.body : '';
  paintMdSrc();
  $('md-where').textContent = docWhere(ctx);
  $('md-del').hidden = !doc;
  const mode = doc && doc.body ? 'view' : 'edit';
  setMdMode(mode);
  openDlg($('dlg-md'));
  $('md-view').scrollTop = 0;
  $('md-src').scrollTop = 0;
  focusField(mode === 'edit' ? (doc || newTitle ? field(f, 'body') : field(f, 'title')) : $('md-view'));
}
$('md-form').addEventListener('submit', (/** @type {any} */ e) => {
  e.preventDefault();
  const f = $('md-form');
  const ctx = mdCtx;
  if (!ctx) return;
  const owner = docOwner(ctx);
  closeSaved($('dlg-md'));
  if (!owner) { toast('Not saved: the step was deleted elsewhere.'); return; }
  const old = ctx.docId ? owner.docs.find((/** @type {any} */ d) => d.id === ctx.docId) : null;
  const doc = C.normDoc({ id: old ? old.id : '', kind: 'md', title: field(f, 'title').value, body: field(f, 'body').value });
  if (old) Object.assign(old, doc); else owner.docs.push(doc);
  commit();
  refreshDocLists();
  refocus(docFocus(ctx, doc.id));
});
$('md-del').addEventListener('click', () => {
  const ctx = mdCtx;
  closeSaved($('dlg-md'));
  if (ctx && ctx.docId) deleteDoc(ctx);
});

/* ── Quay lại bước này ── */

let revisitCtx = { wsId: '', stepId: '' };
/** Hộp "Reopen step": mở lại thì có lý do (bắt buộc) và danh sách bước con đã xong để gửi lại làm; đang mở lại thì chỉ sửa
 * lý do hay đóng vòng. Chưa có bước con nào xong thì không mở lại (nút cũng không hiện). @param {any} step */
function openRevisit(step) {
  if (!step.revisit && !C.canReopen(step)) return;
  const ws = cur();
  revisitCtx = { wsId: ws.id, stepId: step.id };
  const labels = labelsOf(ws);
  $('revisit-step').textContent = `Step ${labels.get(step.id) ?? ''} · ${step.title}`;
  $('dlg-revisit-title').textContent = step.revisit ? `Iteration ${step.revisit.round}` : 'Reopen step';
  $('revisit-help').hidden = !!step.revisit;
  field($('revisit-form'), 'reason').value = step.revisit ? step.revisit.reason : '';
  const done = step.subs.filter((/** @type {any} */ x) => x.status === 'done');
  $('revisit-subs').hidden = !!step.revisit;
  $('revisit-round').textContent = `This starts iteration ${(step.round || 1) + 1}. Picked sub-steps go back to ${C.STATUS_LABEL.todo} with a Redo mark.`;
  $('revisit-all-done').hidden = done.length < 2;
  $('revisit-list').replaceChildren(...done.map((/** @type {any} */ x) => h('li', {},
    h('label', { class: 'reset-item' },
      h('input', { type: 'checkbox', name: 'reset', value: x.id }),
      numTag('num', labels.get(x.id)), h('span', { class: 'reset-title' }, x.title),
      h('span', { class: `chip st-${x.status}` }, C.STATUS_LABEL[x.status])))));
  $('revisit-clear').hidden = !step.revisit;
  /** @type {any} */ ($('revisit-form').querySelector('button[type="submit"]')).textContent = step.revisit ? 'Save reason' : 'Reopen step';
  openDlg($('dlg-revisit'), field($('revisit-form'), 'reason'));
}
const revisitStep = () => stepOf(findWs(revisitCtx.wsId), revisitCtx.stepId);
$('revisit-all-done').addEventListener('click', () => {
  for (const cb of /** @type {any} */ ($('revisit-list').querySelectorAll('input[name="reset"]'))) cb.checked = true;
});
/** Trạng thái, dấu Redo của các bước con, để Hoàn tác. @param {any} step */
const subMarks = (step) => new Map(step.subs.map((/** @type {any} */ x) => [x.id, { status: x.status, redo: x.redo }]));
/** @param {any} step @param {Map<string, {status:string, redo:boolean}>} marks */
const restoreMarks = (step, marks) => { for (const x of step.subs) if (marks.has(x.id)) Object.assign(x, marks.get(x.id)); };
/* Mở lại: vòng mới, bước con đã chọn về New và mang dấu Redo, ghi một dòng nhật ký; một Hoàn tác trả hết. */
$('revisit-form').addEventListener('submit', (/** @type {any} */ e) => {
  e.preventDefault();
  const { wsId, stepId } = revisitCtx;
  const ws = findWs(wsId);
  const step = revisitStep();
  const reason = C.oneLine(field($('revisit-form'), 'reason').value);
  const picked = [...$('revisit-list').querySelectorAll('input[name="reset"]:checked')].map((/** @type {any} */ cb) => cb.value);
  closeSaved($('dlg-revisit'));
  if (!ws || !step) return;
  const focusSel = `.step[data-step="${step.id}"] .badge || ${stepSel(step.id, 'edit-step')}`;
  if (step.revisit) { step.revisit.reason = reason; commit(focusSel); return; }
  const before = { round: step.round, marks: subMarks(step) };
  const round = (step.round || 1) + 1;
  step.round = round;
  step.revisit = { reason, date: C.today(), round };
  let n = 0;
  for (const x of step.subs) {
    x.redo = false;
    if (!picked.includes(x.id)) continue;
    C.setStatus(x, 'todo');
    x.redo = true;
    n++;
  }
  const entry = C.normLog({ date: C.today(), decision: `Reopened: ${step.title} (iteration ${round})`, why: reason, stepId: step.id });
  ws.log.push(entry);
  commit(focusSel);
  toast(`Step reopened · iteration ${round}${n ? ` · ${C.plural(n, 'sub-step')} to redo` : ''} · logged.`, () => {
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
/** Đóng vòng: bỏ băng và mọi dấu Redo (vòng giữ để lần mở lại sau tăng tiếp); Hoàn tác được. @param {string} wsId @param {string} stepId */
function closeIteration(wsId, stepId) {
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
$('revisit-clear').addEventListener('click', () => {
  const step = revisitStep();
  closeSaved($('dlg-revisit'));
  if (step) closeIteration(revisitCtx.wsId, step.id);
});

/* ── Lọc ── */

function clearFilter() {
  ui.q = '';
  $('q').value = '';
  render();
  $('q').focus();
}
$('q').addEventListener('input', (/** @type {any} */ e) => { ui.q = e.target.value; render(); });

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
$('log-compose-open').addEventListener('click', openCompose);
$('log-compose-close').addEventListener('click', () => closeCompose());
$('log-form').addEventListener('keydown', (/** @type {any} */ e) => {
  if (e.key === 'Escape' && !$('log-compose').hidden) { e.preventDefault(); closeCompose(); }
});
$('log-form').addEventListener('submit', (/** @type {any} */ e) => {
  e.preventDefault();
  const ws = cur();
  if (!ws) return;
  const entry = C.normLog({ date: $('log-date').value, decision: $('log-decision').value, why: $('log-why').value, stepId: $('log-step').value });
  ws.log.push(entry);
  $('log-decision').value = '';
  $('log-why').value = '';
  $('log-step').value = '';
  $('log-date').value = C.today();
  closeCompose(false);
  commit(`[data-log="${entry.id}"] [data-act="edit-log"]`, { preventScroll: true });
  flash('log', entry.id, null);
});
let logCtx = { wsId: '', id: '' };
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
    if (!document.querySelector(`.step[data-step="${entry.stepId}"]`)) { ui.q = ''; $('q').value = ''; render(); }
    flash('step', entry.stepId, null);
    refocus(stepSel(entry.stepId, 'edit-step'), { preventScroll: true });
  } else {
    logCtx = { wsId: ws.id, id };
    const f = $('log-edit-form');
    field(f, 'date').value = entry.date;
    field(f, 'decision').value = entry.decision;
    field(f, 'why').value = entry.why;
    fillStepSelect(field(f, 'step'), ws, entry.stepId);
    openDlg($('dlg-log'), field(f, 'decision'));
  }
});
$('log-edit-form').addEventListener('submit', (/** @type {any} */ e) => {
  e.preventDefault();
  const f = $('log-edit-form');
  closeSaved($('dlg-log'));
  const entry = findWs(logCtx.wsId)?.log.find((/** @type {any} */ l) => l.id === logCtx.id);
  if (!entry) { toast('Not saved: the decision was deleted elsewhere.'); return; }
  Object.assign(entry, C.normLog({ id: entry.id, date: field(f, 'date').value, decision: field(f, 'decision').value, why: field(f, 'why').value, stepId: field(f, 'step').value }));
  commit(`[data-log="${entry.id}"] [data-act="edit-log"]`);
});
$('log-edit-del').addEventListener('click', () => {
  closeSaved($('dlg-log'));
  deleteLog(logCtx.wsId, logCtx.id);
});
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

/* ── Xuất và sao lưu ── */

const exportKind = () => /** @type {any} */ (document.querySelector('input[name="export-kind"]:checked')).value;
function exportText(kind = exportKind()) {
  const ws = cur();
  if (kind === 'md') return { text: C.toMarkdown(ws, mdLabels()), file: C.slug(ws.name) + '.md', type: 'text/markdown' };
  if (kind === 'json') return { text: C.toJSON(ws), file: C.slug(ws.name) + '.json', type: 'application/json' };
  return { text: C.toBackup(state.workspaces), file: `step-planner-backup-${C.today()}.json`, type: 'application/json' };
}
function download(/** @type {{text:string, file:string, type:string}} */ x) {
  const url = URL.createObjectURL(new Blob([x.text], { type: x.type + ';charset=utf-8' }));
  const a = h('a', { href: url, download: x.file });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** Đã có bản sao lưu mọi dự án: ghi mốc, tắt lời nhắc. */
function markBackup() {
  state.lastBackup = new Date().toISOString();
  state.dirtySince = '';
  persist();
  renderNudge();
}
function backupAll() {
  const x = exportText('backup');
  download(x);
  markBackup();
  return x.file;
}
function openExport() {
  $('export-text').value = exportText().text;
  $('export-status').textContent = '';
  renderNudge();
  showDlg($('dlg-export'));
}
$('export-btn').addEventListener('click', openExport);
$('backup-nudge').addEventListener('click', () => {
  const file = backupAll();
  toast('Downloaded backup ' + file);
  refocus('#export-btn');
});
$('backup-all').addEventListener('click', () => { $('export-status').textContent = 'Downloaded ' + backupAll(); });
$('export-kind').addEventListener('change', () => { $('export-text').value = exportText().text; $('export-status').textContent = ''; });
$('export-download').addEventListener('click', () => {
  const x = exportText();
  download(x);
  if (exportKind() === 'backup') markBackup();
  $('export-status').textContent = 'Downloaded ' + x.file;
});
$('export-copy').addEventListener('click', async () => {
  const text = exportText().text;
  let ok = false;
  try {
    await navigator.clipboard.writeText(text);
    ok = true;
  } catch (e) {
    $('export-text').select();
    ok = !!(document.execCommand && document.execCommand('copy'));
  }
  if (ok && exportKind() === 'backup') markBackup();
  $('export-status').textContent = ok ? 'Copied.' : 'Could not copy — select the text and copy it by hand.';
});

/* ── Nhập ── */

/** @type {any} */
let importParsed = null;
function openImport() {
  $('import-file').value = '';
  $('import-text').value = '';
  /** @type {any} */ (document.querySelector('input[name="import-mode"][value="new"]')).checked = true;
  previewImport();
  showDlg($('dlg-import'));
}
function previewImport() {
  const p = $('import-preview');
  const text = $('import-text').value;
  importParsed = null;
  p.classList.remove('bad');
  const replace = /** @type {any} */ (document.querySelector('input[name="import-mode"][value="replace"]'));
  const setReplace = (/** @type {boolean} */ on) => {
    replace.disabled = !on;
    if (!on) /** @type {any} */ (document.querySelector('input[name="import-mode"][value="new"]')).checked = true;
  };
  if (!text.trim()) { p.replaceChildren('Nothing to import yet.'); $('import-go').disabled = true; setReplace(false); return; }
  try {
    importParsed = C.parseImport(text);
    const c = C.counts(importParsed.workspaces);
    const kind = { md: 'Markdown', json: 'JSON (one project)', backup: 'JSON backup' }[importParsed.kind];
    const w = importParsed.warnings;
    p.replaceChildren(h('p', {}, `${kind}: ${C.plural(c.workspaces, 'project')} · ${C.plural(c.steps, 'step')} · ${C.plural(c.subs, 'sub-step')} · ${C.plural(c.log, 'decision')}`
      + (c.docs ? ` · ${C.plural(c.docs, 'doc')}` : '')
      + (w.length ? ` · ${C.plural(w.length, 'warning')}:` : '')),
    w.length ? h('ul', { class: 'warn-list' }, w.map((x) => h('li', {}, x))) : '');
    $('import-go').disabled = false;
    setReplace(!!cur() && importParsed.workspaces.length === 1);
  } catch (e) {
    p.replaceChildren('Cannot read: ' + /** @type {Error} */ (e).message);
    p.classList.add('bad');
    $('import-go').disabled = true;
    setReplace(false);
  }
}
$('import-btn').addEventListener('click', openImport);
$('import-text').addEventListener('input', previewImport);
$('import-file').addEventListener('change', async (/** @type {any} */ e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    $('import-text').value = await file.text();
  } catch (err) {
    $('import-text').value = '';
  }
  previewImport();
});
$('import-go').addEventListener('click', () => {
  if (!importParsed) return;
  const mode = /** @type {any} */ (document.querySelector('input[name="import-mode"]:checked')).value;
  const parsed = importParsed;
  $('dlg-import').close();
  ui.q = ''; $('q').value = '';
  const ws = cur();
  if (mode === 'replace' && ws && parsed.workspaces.length === 1) {
    const before = JSON.parse(JSON.stringify(ws));
    const nu = parsed.workspaces[0];
    Object.assign(ws, { ...nu, id: ws.id, createdAt: ws.createdAt });
    frozen.delete(ws.id);
    boardWsId = '';
    commit();
    afterOpen();
    toast(`Replaced the content of "${before.name}".`, () => {
      const i = state.workspaces.findIndex((x) => x.id === before.id);
      if (i < 0) { toast('Cannot undo: the project was deleted.'); return; }
      state.workspaces[i] = before;
      frozen.delete(before.id);
      boardWsId = '';
      if (curId !== before.id) switchTo(before.id);
      commit();
      afterOpen();
    }, '#ws-btn');
    return;
  }
  for (const w of parsed.workspaces) {
    w.name = C.uniqueName(w.name, state.workspaces.map((x) => x.name));
    state.workspaces.push(w);
  }
  setCur(parsed.workspaces[0].id);
  commit();
  afterOpen();
  toast(`Imported ${C.plural(parsed.workspaces.length, 'new project')}.`);
});

/* ── Kéo thả (js/drag.js): chuột, chạm (giữ rồi kéo), bút. Bàn phím: Alt + mũi tên, ô Vị trí trong hộp sửa ── */

dragCtl = initDrag($('board'), {
  enabled: () => !!cur() && !ui.q.trim(),
  placeOf: (id) => C.subPlace(cur(), id),
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

/* ── Theme (REPO-024): theo hệ điều hành tới khi người dùng bấm ── */

const darkMq = matchMedia('(prefers-color-scheme: dark)');
const effectiveTheme = () => document.documentElement.dataset.theme || (darkMq.matches ? 'dark' : 'light');
function paintThemeBtn() {
  $('theme-btn').setAttribute('aria-label', effectiveTheme() === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme');
}
$('theme-btn').addEventListener('click', () => {
  const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  S.saveTheme(next);
  paintThemeBtn();
});
darkMq.addEventListener('change', paintThemeBtn);

/* ── Tab khác sửa cùng dữ liệu: đọc lại, giữ dự án của tab này ── */

window.addEventListener('storage', (e) => {
  if (e.key !== S.KEY) return;
  savePending = false; // tab kia ghi sau: bản của nó thắng, như khi hai tab ghi ngay
  state = S.load().state;
  if (!findWs(curId)) setCur(findWs(state.lastId) ? state.lastId : state.workspaces[0]?.id || '');
  render();
});

/* ── Khởi động ── */

async function boot() {
  paintThemeBtn();
  S.askPersist();
  if (!storageOK) setBanner('storage', 'This browser blocks storage: changes last only until you close the page. Back up as JSON to keep them.');
  else if (loaded.problem === 'corrupt') setBanner('storage', `Saved data is corrupt and could not be read. The old copy is kept under the key ${S.KEY}.corrupt; starting empty.`);
  try {
    const res = await fetch('data/templates.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    templates = (await res.json()).templates || [];
  } catch (e) {
    setBanner('fetch', 'Could not load data/templates.json, so there are no templates. The page reads them with fetch and must be '
      + 'opened over HTTP: run python3 -m http.server at the repo root, then open http://localhost:8000/step-planner/.');
  }
  const tab = S.tabProject();
  curId = findWs(tab) ? tab : findWs(state.lastId) ? state.lastId : state.workspaces[0]?.id || '';
  if (curId) S.setTabProject(curId);
  if (loaded.migrated) { persist(); flushSave(); } // khoá cũ: ghi ngay sang khoá mới
  render();
}
initDesign({ cur, findWs, commit, toast, h, icon, showDlg });
boot();
