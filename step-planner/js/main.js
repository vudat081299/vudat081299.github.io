// @ts-check
/* Giao diện Data Science Step Planner: nạp mẫu, vẽ bảng, sự kiện, hộp thoại. Logic thuần ở core.js, bộ nhớ ở store.js.
 * Chữ người dùng chỉ vào DOM qua textContent (hàm h), không bao giờ qua HTML. */
import * as C from './core.js';
import * as S from './store.js';

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

const ICONS = {
  up: 'M12 19V5M5 12l7-7 7 7',
  down: 'M12 5v14M19 12l-7 7-7-7',
  left: 'M19 12H5M12 19l-7-7 7-7',
  right: 'M5 12h14M12 5l7 7-7 7',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  revisit: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
};
/** @param {keyof typeof ICONS} name */
function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', ICONS[name]);
  svg.append(p);
  return svg;
}
/* Nút phụ (dời, nhân bản, xoá) không nằm trong vòng Tab: bàn phím làm cùng việc ấy trong hộp sửa và bằng Alt + mũi tên. */
/** @param {keyof typeof ICONS} name @param {string} label @param {string} act @param {boolean} [disabled] */
const iconBtn = (name, label, act, disabled = false) =>
  h('button', { type: 'button', class: 'icon-btn', 'data-act': act, 'aria-label': label, title: label, disabled, tabindex: '-1' }, icon(name));

/* ── Trạng thái ── */

const storageOK = S.available();
const loaded = S.load();
/** @type {{version:number, workspaces:any[], lastId:string, me:Record<string,string>, lastBackup:string, dirtySince:string}} */
let state = loaded.state;
/** Dự án tab này đang mở (mỗi tab một dự án). */
let curId = '';
/** @type {any[]} */
let templates = [];
const ui = { q: '', owner: '' };
/** @type {{kind:'sub'|'step', id:string} | null} */
let drag = null;
const banners = new Map();

const findWs = (/** @type {string} */ id) => state.workspaces.find((w) => w.id === id) || null;
const cur = () => findWs(curId);
const fmtDate = (/** @type {string} */ d) => (d ? d.split('-').reverse().join('/') : '');
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

function persist() {
  if (!storageOK) return;
  setBanner('save', S.save(state) ? '' : 'Không ghi được vào bộ nhớ trình duyệt (đầy hoặc bị chặn). Thay đổi mới chưa được lưu — sao lưu JSON để giữ.');
}

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
function toast(/** @type {string} */ text, /** @type {null | (() => void)} */ undo = null, back = '') {
  $('toast-text').textContent = text;
  $('toast-undo').hidden = !undo;
  toastUndo = undo;
  toastBack = back;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(hideToast, undo ? 15000 : 4000);
  if (undo) $('toast-undo').focus();
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

function render() {
  const ws = cur();
  $('app').hidden = !ws;
  $('start').hidden = !!ws;
  $('ws-name').textContent = ws ? ws.name : 'Chưa có dự án';
  document.title = ws ? `${ws.name} — Data Science Step Planner` : 'Data Science Step Planner';
  $('overall').hidden = !ws;
  renderNudge();
  if (!ws) { renderStart(); return; }
  const o = C.overall(ws);
  $('overall-text').textContent = `${o.done}/${o.total} xong · ${o.pct}%`;
  $('overall-bar').style.width = o.pct + '%';
  renderOwnerFilter(ws);
  renderWsNotes(ws);
  renderBoard(ws);
  renderLog(ws);
  $('people-list').replaceChildren(...ownersOf(ws).map((p) => h('option', { value: p })));
}

/** Người trong `people`, rồi người được giao việc mà chưa có trong danh sách. @param {any} ws */
function ownersOf(ws) {
  const out = [...ws.people];
  for (const s of ws.steps) for (const x of s.subs) if (x.owner && !out.includes(x.owner)) out.push(x.owner);
  return out;
}

function renderOwnerFilter(/** @type {any} */ ws) {
  const me = state.me[ws.id] || '';
  const names = ownersOf(ws);
  if (ui.owner && !['@me', '@none'].includes(ui.owner) && !names.includes(ui.owner)) ui.owner = '';
  const sel = $('owner-filter');
  sel.replaceChildren(
    h('option', { value: '' }, 'Mọi người'),
    h('option', { value: '@me' }, me ? `Việc của tôi (${me})` : 'Việc của tôi (chọn "Tôi là" ở Thành viên)'),
    ...names.map((n) => h('option', { value: n }, n)),
    h('option', { value: '@none' }, 'Chưa giao'),
  );
  sel.value = ui.owner;
}

function renderWsNotes(/** @type {any} */ ws) {
  $('ws-notes-text').replaceChildren(...withLinks(ws.notes));
  $('ws-notes-text').hidden = !ws.notes;
  $('ws-notes-hint').textContent = ws.notes ? `(${ws.notes.split('\n').length} dòng)` : '(trống)';
}

/** Nhắc sao lưu: có thay đổi chưa sao lưu từ ≥ 3 ngày. */
function renderNudge() {
  const b = $('backup-nudge');
  const since = state.dirtySince ? Date.now() - Date.parse(state.dirtySince) : 0;
  b.hidden = !state.workspaces.length || since < BACKUP_NUDGE_DAYS * DAY;
  b.textContent = state.lastBackup
    ? `Chưa sao lưu ${Math.floor((Date.now() - Date.parse(state.lastBackup)) / DAY)} ngày`
    : 'Chưa sao lưu lần nào';
  b.title = 'Tải bản sao lưu JSON của mọi dự án';
  $('backup-when').textContent = state.lastBackup ? `Lần cuối: ${fmtDate(state.lastBackup.slice(0, 10))}` : 'Chưa sao lưu lần nào.';
}

function renderBoard(/** @type {any} */ ws) {
  const board = $('board');
  const me = state.me[ws.id] || '';
  const q = C.fold(ui.q.trim());
  const filtering = !!(q || ui.owner);
  board.classList.toggle('filtering', filtering);
  const ownerOk = (/** @type {any} */ x) => !ui.owner
    || (ui.owner === '@none' ? !x.owner : ui.owner === '@me' ? !!me && x.owner === me : x.owner === ui.owner);
  const todayStr = C.today();
  const nextId = C.projectNextId(ws);
  const rows = [];
  let shown = 0;
  ws.steps.forEach((/** @type {any} */ step, /** @type {number} */ i) => {
    const stepHit = !!q && C.fold([step.title, step.goal, step.doneWhen, step.notes, step.revisit?.reason].join(' ')).includes(q);
    const visible = step.subs.filter((/** @type {any} */ x) => ownerOk(x)
      && (!q || stepHit || C.fold([x.title, x.owner, x.doneWhen, x.notes].join(' ')).includes(q)));
    if (filtering && !visible.length && !(stepHit && !ui.owner)) return;
    shown += visible.length;
    const prog = C.progress(step.subs);
    const last = step.subs.length - 1;
    const head = h('div', { class: 'step-head', draggable: filtering ? null : 'true' },
      h('div', { class: 'step-top' },
        h('span', { class: 'step-num', 'aria-hidden': 'true' }, String(i + 1)),
        h('h2', { class: 'step-title', id: 'st-' + step.id },
          h('button', { type: 'button', class: 'link', 'data-act': 'edit-step', 'aria-label': `Bước ${i + 1}: ${step.title}. Sửa`, 'aria-keyshortcuts': 'Alt+ArrowUp Alt+ArrowDown' }, step.title))),
      step.revisit && h('button', { type: 'button', class: 'badge', 'data-act': 'revisit', title: step.revisit.date ? 'Đánh dấu ngày ' + fmtDate(step.revisit.date) : null },
        'Quay lại' + (step.revisit.reason ? ': ' + step.revisit.reason : '')),
      step.goal && h('p', { class: 'step-goal' }, step.goal),
      step.doneWhen && h('p', { class: 'step-done' }, h('span', { class: 'lbl' }, 'Xong khi '), step.doneWhen),
      step.notes && h('details', { class: 'step-notes' }, h('summary', {}, 'Ghi chú'), h('p', { class: 'notes-text' }, withLinks(step.notes))),
      h('div', { class: 'prog' },
        h('span', {}, `${prog.done}/${prog.total}`, h('span', { class: 'sr' }, ' bước con xong')),
        h('span', { class: 'bar', 'aria-hidden': 'true' }, barFill(prog.pct))),
      h('div', { class: 'acts' },
        h('button', { type: 'button', class: 'btn small', 'data-act': 'add-sub' }, '+ Bước con'),
        !filtering && iconBtn('up', 'Đưa bước lên', 'step-up', i === 0),
        !filtering && iconBtn('down', 'Đưa bước xuống', 'step-down', i === ws.steps.length - 1),
        iconBtn('revisit', 'Quay lại bước này', 'revisit'),
        iconBtn('trash', 'Xoá bước', 'del-step')));
    const cards = visible.map((/** @type {any} */ x) => {
      const j = step.subs.indexOf(x);
      const label = C.STATUS_LABEL[x.status];
      const overdue = x.due && x.due < todayStr && x.status !== 'done' && x.status !== 'skip';
      const isNext = x.id === nextId;
      return h('li', { class: `card st-${x.status}${isNext ? ' next' : ''}`, 'data-sub': x.id, draggable: filtering ? null : 'true' },
        h('div', { class: 'card-top' },
          h('span', { class: 'num' }, `${i + 1}.${j + 1}`),
          isNext && h('span', { class: 'next-tag' }, 'Tiếp theo'),
          h('button', { type: 'button', class: `chip st-${x.status}`, 'data-act': 'cycle', 'aria-label': `Trạng thái: ${label}. Bấm để đổi` }, label)),
        h('h3', { class: 'card-title' }, h('button', { type: 'button', class: 'link', 'data-act': 'edit-sub', 'aria-keyshortcuts': 'Alt+ArrowLeft Alt+ArrowRight' }, x.title)),
        (x.owner || x.due) && h('p', { class: 'meta' },
          x.owner && h('span', { class: 'owner' }, '@' + x.owner),
          x.due && h('span', { class: 'due' + (overdue ? ' overdue' : '') }, 'hạn ' + fmtDate(x.due) + (overdue ? ' (trễ)' : ''))),
        x.doneWhen && h('p', { class: 'card-done' }, h('span', { class: 'lbl' }, 'Xong khi '), x.doneWhen),
        x.notes && h('p', { class: 'card-notes' }, withLinks(x.notes)),
        h('div', { class: 'acts' },
          !filtering && iconBtn('left', 'Sang trái', 'sub-left', j === 0),
          !filtering && iconBtn('right', 'Sang phải', 'sub-right', j === last),
          iconBtn('copy', 'Nhân bản', 'sub-dup'),
          iconBtn('trash', 'Xoá', 'sub-del')));
    });
    cards.push(h('li', { class: 'card add' }, h('button', { type: 'button', class: 'add-sub', 'data-act': 'add-sub', tabindex: '-1' }, '+ Bước con')));
    rows.push(h('section', { class: 'step' + (step.revisit ? ' revisit' : ''), 'data-step': step.id, 'aria-labelledby': 'st-' + step.id },
      head,
      h('div', { class: 'cards-scroll' }, h('ol', { class: 'cards', 'aria-label': `Bước con của bước ${i + 1}` }, cards))));
  });
  if (!ws.steps.length) rows.push(h('p', { class: 'empty' }, 'Chưa có bước nào. Bấm "+ Thêm bước".'));
  else if (!rows.length) rows.push(h('p', { class: 'empty' }, 'Không có bước con nào khớp. ',
    h('button', { type: 'button', class: 'btn', 'data-act': 'clear-filter' }, 'Bỏ lọc')));
  board.replaceChildren(...rows);
  $('filter-note').textContent = filtering ? `${shown} bước con khớp · sắp xếp tắt khi lọc` : '';
  $('add-step').hidden = filtering;
  markCutNotes();
  updateScrollCues();
}

/** Ghi chú thẻ bị cắt ở ba dòng: thêm nút "Xem thêm". */
function markCutNotes() {
  for (const p of /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.card-notes'))) {
    if (p.scrollHeight > p.clientHeight + 1) {
      p.classList.add('cut');
      p.after(h('button', { type: 'button', class: 'more', 'data-act': 'more-notes', 'aria-expanded': 'false' }, 'Xem thêm'));
    }
  }
}

/** Hàng thẻ còn chỗ cuộn thì mờ dần ở mép ấy. */
function updateScrollCues(/** @type {any} */ only = null) {
  const list = only ? [only] : document.querySelectorAll('.cards-scroll');
  for (const sc of /** @type {any} */ (list)) {
    sc.classList.toggle('more-right', sc.scrollLeft + sc.clientWidth < sc.scrollWidth - 2);
    sc.classList.toggle('more-left', sc.scrollLeft > 2);
  }
}
$('board').addEventListener('scroll', (/** @type {any} */ e) => { if (e.target.classList?.contains('cards-scroll')) updateScrollCues(e.target); }, true);
window.addEventListener('resize', () => updateScrollCues());

function barFill(/** @type {number} */ pct) {
  const i = h('i');
  i.style.width = pct + '%';
  return i;
}

/** Nhật ký: mới nhất trước theo ngày; cùng ngày thì ghi sau đứng trước. */
function renderLog(/** @type {any} */ ws) {
  if (!$('log-date').value) $('log-date').value = C.today();
  const sorted = ws.log.map((/** @type {any} */ l, /** @type {number} */ i) => ({ l, i }))
    .sort((/** @type {any} */ a, /** @type {any} */ b) => (a.l.date === b.l.date ? b.i - a.i : a.l.date < b.l.date ? 1 : -1))
    .map((/** @type {any} */ x) => x.l);
  $('log-list').replaceChildren(...sorted.map((/** @type {any} */ l) => h('li', { class: 'log-item', 'data-log': l.id },
    h('span', { class: 'log-date' }, fmtDate(l.date)),
    h('button', { type: 'button', class: 'link log-decision', 'data-act': 'edit-log' }, l.decision),
    h('button', { type: 'button', class: 'icon-btn', 'data-act': 'del-log', 'aria-label': 'Xoá quyết định', title: 'Xoá quyết định' }, icon('trash')),
    l.why && h('p', { class: 'log-why' }, withLinks(l.why)))));
}

function renderStart() {
  const box = $('start-templates');
  const list = templates.length ? templates : [{ id: 'blank', name: 'Trống', description: '', steps: [] }];
  box.replaceChildren(...list.map((t) => h('button', { type: 'button', class: 'tpl', 'data-tpl': t.id },
    h('span', {}, h('b', {}, t.name), t.description && h('small', {}, t.description)))));
}

/* ── Hộp thoại: mở, focus ô đầu, hỏi lại khi đóng mà chữ chưa lưu ── */

const field = (/** @type {any} */ form, /** @type {string} */ name) => form.elements.namedItem(name);
const snapshot = (/** @type {any} */ form) => JSON.stringify([...form.elements].filter((e) => e.name).map((e) => (e.type === 'radio' || e.type === 'checkbox' ? e.checked : e.value)));
/** @type {WeakMap<any, string>} */
const snaps = new WeakMap();
const GUARDED = ['dlg-sub', 'dlg-step', 'dlg-revisit', 'dlg-people', 'dlg-log', 'dlg-notes'];

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

/** @param {any} dlg @param {any} [focusEl] */
function openDlg(dlg, focusEl) {
  dlg.showModal();
  dlg.querySelectorAll('textarea.grow-title').forEach(autosize);
  const form = dlg.querySelector('form');
  if (form && GUARDED.includes(dlg.id)) snaps.set(dlg, snapshot(form));
  if (focusEl) { focusEl.focus(); if (focusEl.select && focusEl.tagName !== 'SELECT') focusEl.select(); }
}
/** Đóng hộp; chữ đã sửa mà chưa lưu thì hỏi lại. @param {any} dlg */
async function tryClose(dlg) {
  const form = dlg.querySelector('form');
  if (form && snaps.has(dlg) && snapshot(form) !== snaps.get(dlg)) {
    const ok = await ask({ title: 'Bỏ thay đổi?', text: 'Chữ vừa sửa trong hộp này chưa lưu sẽ mất.', ok: 'Bỏ thay đổi', danger: true });
    if (ok === null) return false;
  }
  snaps.delete(dlg);
  dlg.close();
  return true;
}
/** Lưu xong: đóng hộp không hỏi. @param {any} dlg */
function closeSaved(dlg) {
  snaps.delete(dlg);
  dlg.close();
}
for (const id of GUARDED) {
  $(id).addEventListener('cancel', (/** @type {any} */ e) => { e.preventDefault(); tryClose($(id)); });
}
document.addEventListener('click', (/** @type {any} */ e) => {
  const b = e.target.closest && e.target.closest('[data-close]');
  if (!b) return;
  const dlg = b.closest('dialog');
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
  $('ask-ok').className = 'btn ' + (o.danger ? 'danger' : 'primary');
  dlg.returnValue = '';
  dlg.showModal();
  if (o.label) { $('ask-input').focus(); $('ask-input').select(); } else $('ask-ok').focus();
  return new Promise((resolve) => {
    dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok' ? $('ask-input').value : null), { once: true });
  });
}

/* ── Dự án ── */

/** @param {any} ws */
function addWorkspace(ws) {
  state.workspaces.push(ws);
  setCur(ws.id);
  ui.q = ''; ui.owner = '';
  $('q').value = '';
}
function afterOpen() {
  window.scrollTo(0, 0);
  refocus('#ws-btn', { preventScroll: true });
}
function createFrom(/** @type {string} */ tplId, /** @type {string} */ name = '') {
  const tpl = templates.find((t) => t.id === tplId) || { id: 'blank', name: 'Dự án mới', steps: [] };
  addWorkspace(C.fromTemplate(tpl, name));
  commit();
  afterOpen();
}
function switchTo(/** @type {string} */ id) {
  setCur(id);
  ui.q = ''; ui.owner = '';
  $('q').value = '';
  persist();
  render();
}

$('start-templates').addEventListener('click', (/** @type {any} */ e) => {
  const b = e.target.closest('[data-tpl]');
  if (b) createFrom(b.dataset.tpl);
});
$('start-import').addEventListener('click', () => openImport());

function openWs() {
  renderWsList();
  const fs = $('ws-new-templates');
  fs.replaceChildren(h('legend', {}, 'Mẫu'), ...(templates.length ? templates : [{ id: 'blank', name: 'Trống', description: '' }]).map((t, i) =>
    h('label', { class: 'tpl' }, h('input', { type: 'radio', name: 'tpl', value: t.id, checked: i === 0 }),
      h('span', {}, h('b', {}, t.name), t.description && h('small', {}, t.description)))));
  $('ws-new-name').value = '';
  $('dlg-ws').showModal();
}
function renderWsList() {
  $('ws-list').replaceChildren(...state.workspaces.map((w) => {
    const o = C.overall(w);
    return h('li', { class: 'ws-item', 'data-ws': w.id },
      h('button', { type: 'button', class: 'ws-open', 'data-act': 'ws-open', 'aria-current': w.id === curId ? 'true' : null },
        h('b', {}, w.name), h('small', {}, `${w.steps.length} bước · ${o.done}/${o.total} xong · sửa ${fmtDate(w.updatedAt.slice(0, 10))}`)),
      h('button', { type: 'button', class: 'btn', 'data-act': 'ws-rename' }, 'Đổi tên'),
      h('button', { type: 'button', class: 'btn', 'data-act': 'ws-dup' }, 'Nhân bản'),
      h('button', { type: 'button', class: 'btn danger', 'data-act': 'ws-del' }, 'Xoá'));
  }));
  if (!state.workspaces.length) $('ws-list').append(h('li', { class: 'muted' }, 'Chưa có dự án.'));
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
    const name = w && await ask({ title: 'Đổi tên dự án', label: 'Tên', value: w.name, ok: 'Đổi tên' });
    const w2 = findWs(id);
    if (w2 && name && C.oneLine(name)) { w2.name = C.oneLine(name); w2.updatedAt = new Date().toISOString(); persist(); render(); }
  } else if (act === 'ws-dup') {
    const w = findWs(id);
    if (!w) return;
    const c = C.freshCopy(w);
    c.name = C.uniqueName(w.name, state.workspaces.map((x) => x.name), 'bản sao');
    state.workspaces.splice(state.workspaces.indexOf(w) + 1, 0, c);
    persist(); render();
  } else if (act === 'ws-del') {
    const w = findWs(id);
    const ok = w && await ask({ title: 'Xoá dự án?', text: `"${w.name}" sẽ bị xoá khỏi trình duyệt này, không hoàn tác được. Sao lưu JSON trước nếu cần giữ.`, ok: 'Xoá', danger: true });
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
  if (act === 'more-notes') {
    const p = b.previousElementSibling;
    const open = p.classList.toggle('open');
    b.textContent = open ? 'Thu gọn' : 'Xem thêm';
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
    case 'revisit': openRevisit(step); break;
    case 'step-up': moveStep(ws, step, -1, act); break;
    case 'step-down': moveStep(ws, step, 1, act); break;
    case 'del-step': deleteStep(ws.id, step.id); break;
    case 'add-sub': openSub(step, null); break;
    case 'cycle': sub.status = C.nextStatus(sub.status); commit(subSel(sub.id, 'cycle')); break;
    case 'edit-sub': openSub(step, sub); break;
    case 'sub-left': moveSub(step, sub, -1, act); break;
    case 'sub-right': moveSub(step, sub, 1, act); break;
    case 'sub-dup': duplicateSub(step, sub); break;
    case 'sub-del': deleteSub(ws.id, step.id, sub.id); break;
  }
});

/* Alt + mũi tên trên tên bước / tên bước con: dời bằng bàn phím. */
$('board').addEventListener('keydown', (/** @type {any} */ e) => {
  if (!e.altKey || e.ctrlKey || e.metaKey || $('board').classList.contains('filtering')) return;
  const ws = cur();
  const act = e.target.dataset && e.target.dataset.act;
  const row = e.target.closest('[data-step]');
  const step = row && stepOf(ws, row.dataset.step);
  if (!step) return;
  if (act === 'edit-step' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    e.preventDefault();
    moveStep(ws, step, e.key === 'ArrowUp' ? -1 : 1, 'edit-step');
  } else if (act === 'edit-sub' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    e.preventDefault();
    const sub = step.subs.find((/** @type {any} */ x) => x.id === e.target.closest('[data-sub]').dataset.sub);
    moveSub(step, sub, e.key === 'ArrowLeft' ? -1 : 1, 'edit-sub');
  }
});

function moveStep(/** @type {any} */ ws, /** @type {any} */ step, /** @type {number} */ d, /** @type {string} */ act) {
  const i = ws.steps.indexOf(step);
  const k = i + d;
  if (k < 0 || k >= ws.steps.length) return;
  ws.steps.splice(i, 1); ws.steps.splice(k, 0, step);
  commit(`${stepSel(step.id, act)} || ${stepSel(step.id, 'edit-step')}`);
}
function moveSub(/** @type {any} */ step, /** @type {any} */ sub, /** @type {number} */ d, /** @type {string} */ act) {
  const j = step.subs.indexOf(sub);
  const k = j + d;
  if (k < 0 || k >= step.subs.length) return;
  step.subs.splice(j, 1); step.subs.splice(k, 0, sub);
  commit(`${subSel(sub.id, act)} || ${subSel(sub.id, 'edit-sub')}`);
}

function duplicateSub(/** @type {any} */ step, /** @type {any} */ sub) {
  const c = C.normSub({ ...sub, id: '', title: sub.title + ' (bản sao)' });
  step.subs.splice(step.subs.indexOf(sub) + 1, 0, c);
  commit(subSel(c.id, 'edit-sub'));
}

/* Hoàn tác tìm lại dự án và bước theo id: tab khác có thể đã thay cả `state` trong lúc chờ. */
function deleteSub(/** @type {string} */ wsId, /** @type {string} */ stepId, /** @type {string} */ subId) {
  const step = stepOf(findWs(wsId), stepId);
  const j = step ? step.subs.findIndex((/** @type {any} */ x) => x.id === subId) : -1;
  if (j < 0) return;
  const [sub] = step.subs.splice(j, 1);
  commit();
  const back = `${subSel(step.subs[Math.min(j, step.subs.length - 1)]?.id, 'edit-sub')} || ${stepSel(stepId, 'add-sub')}`;
  toast(`Đã xoá "${sub.title}".`, () => {
    const w = findWs(wsId);
    const s = stepOf(w, stepId);
    if (!w) { toast('Không hoàn tác được: dự án đã bị xoá.'); return; }
    if (!s) { toast('Không hoàn tác được: bước chứa nó đã bị xoá.'); return; }
    if (!s.subs.some((/** @type {any} */ x) => x.id === sub.id)) s.subs.splice(Math.min(j, s.subs.length), 0, sub);
    if (curId !== wsId) switchTo(wsId);
    commit(subSel(sub.id, 'edit-sub'));
  }, back);
}

async function deleteStep(/** @type {string} */ wsId, /** @type {string} */ stepId) {
  let step = stepOf(findWs(wsId), stepId);
  if (!step) return;
  if (step.subs.length) {
    const ok = await ask({ title: 'Xoá bước?', text: `"${step.title}" và ${step.subs.length} bước con của nó sẽ bị xoá (hoàn tác được ngay sau đó).`, ok: 'Xoá bước', danger: true });
    if (ok === null) return;
  }
  const ws = findWs(wsId);
  step = stepOf(ws, stepId);
  if (!step) return;
  const i = ws.steps.indexOf(step);
  ws.steps.splice(i, 1);
  commit();
  const near = ws.steps[Math.min(i, ws.steps.length - 1)];
  toast(`Đã xoá bước "${step.title}" (${step.subs.length} bước con).`, () => {
    const w = findWs(wsId);
    if (!w) { toast('Không hoàn tác được: dự án đã bị xoá.'); return; }
    if (!stepOf(w, step.id)) w.steps.splice(Math.min(i, w.steps.length), 0, step);
    if (curId !== wsId) switchTo(wsId);
    commit(stepSel(step.id, 'edit-step'));
  }, near ? stepSel(near.id, 'edit-step') : '#add-step');
}

/* ── Hộp bước con ── */

/** @type {{wsId:string, stepId:string, subId:string|null}|null} */
let subCtx = null;

function fillPos(/** @type {any} */ sel, /** @type {number} */ n, /** @type {number} */ value) {
  sel.replaceChildren(...Array.from({ length: n }, (_, i) => h('option', { value: String(i) }, String(i + 1))));
  sel.value = String(Math.max(0, Math.min(value, n - 1)));
}
function subPosOptions(keep = true) {
  const f = $('sub-form');
  const ws = cur();
  const target = stepOf(ws, field(f, 'step').value);
  if (!target || !subCtx) return;
  const same = target.id === subCtx.stepId && subCtx.subId;
  const n = target.subs.length + (same ? 0 : 1);
  const idx = same ? target.subs.findIndex((/** @type {any} */ x) => x.id === subCtx.subId) : n - 1;
  fillPos(field(f, 'pos'), n, keep ? idx : n - 1);
}

function openSub(/** @type {any} */ step, /** @type {any} */ sub) {
  const ws = cur();
  const f = $('sub-form');
  subCtx = { wsId: ws.id, stepId: step.id, subId: sub ? sub.id : null };
  $('dlg-sub-title').textContent = sub ? 'Sửa bước con' : 'Thêm bước con';
  field(f, 'status').replaceChildren(...C.STATUSES.map((s) => h('option', { value: s }, C.STATUS_LABEL[s])));
  field(f, 'step').replaceChildren(...ws.steps.map((/** @type {any} */ s, /** @type {number} */ i) => h('option', { value: s.id }, `${i + 1}. ${s.title}`)));
  const me = state.me[ws.id] || '';
  const filterOwner = ui.owner === '@me' ? me : ui.owner === '@none' ? '' : ui.owner;
  const x = sub || C.normSub({ title: '', owner: filterOwner });
  field(f, 'title').value = sub ? x.title : '';
  field(f, 'status').value = x.status;
  field(f, 'owner').value = x.owner;
  field(f, 'due').value = x.due;
  field(f, 'doneWhen').value = x.doneWhen;
  field(f, 'notes').value = x.notes;
  field(f, 'step').value = step.id;
  subPosOptions();
  $('sub-del').hidden = !sub;
  $('sub-dup').hidden = !sub;
  openDlg($('dlg-sub'), field(f, 'title'));
}
field($('sub-form'), 'step').addEventListener('change', () => subPosOptions(false));
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
  if (!ws || !step || (subCtx.subId && !sub)) { toast('Không lưu được: bước đã bị xoá ở nơi khác.'); return; }
  const data = C.normSub({
    id: sub ? sub.id : '',
    title: field(f, 'title').value, status: field(f, 'status').value, owner: field(f, 'owner').value,
    due: field(f, 'due').value, doneWhen: field(f, 'doneWhen').value, notes: field(f, 'notes').value,
  });
  const target = stepOf(ws, field(f, 'step').value) || step;
  const pos = Number(field(f, 'pos').value) || 0;
  let item = data;
  if (sub) { Object.assign(sub, data); item = sub; step.subs.splice(step.subs.indexOf(sub), 1); }
  target.subs.splice(Math.min(pos, target.subs.length), 0, item);
  if (curId !== ws.id) switchTo(ws.id);
  commit(`${subSel(item.id, 'edit-sub')} || ${stepSel(target.id, 'add-sub')} || #q`);
  if (!document.querySelector(`.card[data-sub="${item.id}"]`)) toast(sub ? 'Đã lưu — đang bị bộ lọc ẩn.' : 'Đã thêm — đang bị bộ lọc ẩn.');
});
$('sub-dup').addEventListener('click', () => {
  const { step, sub } = subFromCtx();
  closeSaved($('dlg-sub'));
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
function openStep(/** @type {any} */ step) {
  const f = $('step-form');
  const ws = cur();
  stepCtx = { wsId: ws.id, stepId: step ? step.id : null };
  $('dlg-step-title').textContent = step ? 'Sửa bước' : 'Thêm bước';
  field(f, 'title').value = step ? step.title : '';
  field(f, 'goal').value = step ? step.goal : '';
  field(f, 'doneWhen').value = step ? step.doneWhen : '';
  field(f, 'notes').value = step ? step.notes : '';
  const n = ws.steps.length + (step ? 0 : 1);
  fillPos(field(f, 'pos'), n, step ? ws.steps.indexOf(step) : n - 1);
  $('step-del').hidden = !step;
  $('step-revisit').hidden = !step;
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
  if (stepCtx.stepId && !step) { toast('Không lưu được: bước đã bị xoá ở nơi khác.'); return; }
  if (step) {
    const n = C.normStep({ ...step, ...vals });
    Object.assign(step, { title: n.title, goal: n.goal, doneWhen: n.doneWhen, notes: n.notes });
    ws.steps.splice(ws.steps.indexOf(step), 1);
  } else step = C.normStep(vals);
  ws.steps.splice(Math.min(Number(field(f, 'pos').value) || 0, ws.steps.length), 0, step);
  commit(`${stepSel(step.id, 'edit-step')} || #q`);
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

/* ── Quay lại bước này ── */

let revisitCtx = { wsId: '', stepId: '' };
function openRevisit(/** @type {any} */ step) {
  revisitCtx = { wsId: cur().id, stepId: step.id };
  $('revisit-step').textContent = step.title;
  field($('revisit-form'), 'reason').value = step.revisit ? step.revisit.reason : '';
  $('revisit-clear').hidden = !step.revisit;
  openDlg($('dlg-revisit'), field($('revisit-form'), 'reason'));
}
const revisitStep = () => stepOf(findWs(revisitCtx.wsId), revisitCtx.stepId);
$('revisit-form').addEventListener('submit', (/** @type {any} */ e) => {
  e.preventDefault();
  const step = revisitStep();
  closeSaved($('dlg-revisit'));
  if (!step) return;
  step.revisit = { reason: C.oneLine(field($('revisit-form'), 'reason').value), date: C.today() };
  commit(`${stepSel(step.id, 'revisit')} || ${stepSel(step.id, 'edit-step')}`);
});
$('revisit-clear').addEventListener('click', () => {
  const step = revisitStep();
  closeSaved($('dlg-revisit'));
  if (!step) return;
  step.revisit = null;
  commit(stepSel(step.id, 'edit-step'));
});

/* ── Thành viên ── */

function openPeople(focusMe = false) {
  const ws = cur();
  const f = $('people-form');
  field(f, 'people').value = ws.people.join('\n');
  const me = state.me[ws.id] || '';
  const names = ownersOf(ws);
  field(f, 'me').replaceChildren(h('option', { value: '' }, '(chưa chọn)'), ...names.map((n) => h('option', { value: n }, n)));
  field(f, 'me').value = names.includes(me) ? me : '';
  openDlg($('dlg-people'), focusMe ? field(f, 'me') : field(f, 'people'));
}
$('people-btn').addEventListener('click', () => openPeople());
$('people-form').addEventListener('submit', (/** @type {any} */ e) => {
  e.preventDefault();
  const ws = cur();
  const f = $('people-form');
  closeSaved($('dlg-people'));
  if (!ws) return;
  /* Đổi tên theo vị trí dòng: dòng thứ i đổi chữ thì mọi bước con của người cũ chuyển sang tên mới. */
  const lines = field(f, 'people').value.split('\n').map(C.oneLine);
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  let me = field(f, 'me').value;
  let renamed = 0;
  if (lines.length === ws.people.length) {
    ws.people.forEach((/** @type {string} */ old, /** @type {number} */ i) => {
      const nu = lines[i];
      if (!nu || nu === old) return;
      renamed += C.renameOwner(ws, old, nu);
      if (me === old) me = nu;
    });
  }
  ws.people = C.normWorkspace({ people: lines }).people;
  if (me) state.me[ws.id] = me; else delete state.me[ws.id];
  commit('#people-btn');
  if (renamed) toast(`Đã đổi tên người làm trên ${renamed} bước con.`);
});

/* ── Lọc ── */

function clearFilter() {
  ui.q = ''; ui.owner = '';
  $('q').value = '';
  render();
  $('q').focus();
}
$('q').addEventListener('input', (/** @type {any} */ e) => { ui.q = e.target.value; render(); });
$('owner-filter').addEventListener('change', (/** @type {any} */ e) => {
  ui.owner = e.target.value;
  const ws = cur();
  if (ui.owner === '@me' && ws && !state.me[ws.id]) { ui.owner = ''; render(); openPeople(true); return; }
  render();
});

/* ── Nhật ký quyết định ── */

$('log-form').addEventListener('submit', (/** @type {any} */ e) => {
  e.preventDefault();
  const ws = cur();
  if (!ws) return;
  ws.log.push(C.normLog({ date: $('log-date').value, decision: $('log-decision').value, why: $('log-why').value }));
  $('log-decision').value = '';
  $('log-why').value = '';
  commit('#log-decision');
});
let logCtx = { wsId: '', id: '' };
$('log-list').addEventListener('click', (/** @type {any} */ e) => {
  const b = e.target.closest('[data-act]');
  const ws = cur();
  if (!b || !ws) return;
  const id = b.closest('[data-log]').dataset.log;
  const entry = ws.log.find((/** @type {any} */ l) => l.id === id);
  if (!entry) return;
  if (b.dataset.act === 'del-log') deleteLog(ws.id, id);
  else {
    logCtx = { wsId: ws.id, id };
    const f = $('log-edit-form');
    field(f, 'date').value = entry.date;
    field(f, 'decision').value = entry.decision;
    field(f, 'why').value = entry.why;
    openDlg($('dlg-log'), field(f, 'decision'));
  }
});
$('log-edit-form').addEventListener('submit', (/** @type {any} */ e) => {
  e.preventDefault();
  const f = $('log-edit-form');
  closeSaved($('dlg-log'));
  const entry = findWs(logCtx.wsId)?.log.find((/** @type {any} */ l) => l.id === logCtx.id);
  if (!entry) { toast('Không lưu được: quyết định đã bị xoá ở nơi khác.'); return; }
  Object.assign(entry, C.normLog({ id: entry.id, date: field(f, 'date').value, decision: field(f, 'decision').value, why: field(f, 'why').value }));
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
  toast(`Đã xoá quyết định "${entry.decision}".`, () => {
    const w = findWs(wsId);
    if (!w) { toast('Không hoàn tác được: dự án đã bị xoá.'); return; }
    if (!w.log.some((/** @type {any} */ l) => l.id === entry.id)) w.log.splice(Math.min(k, w.log.length), 0, entry);
    if (curId !== wsId) switchTo(wsId);
    commit(`[data-log="${entry.id}"] [data-act="edit-log"]`);
  }, '#log-decision');
}

/* ── Xuất và sao lưu ── */

const exportKind = () => /** @type {any} */ (document.querySelector('input[name="export-kind"]:checked')).value;
function exportText(kind = exportKind()) {
  const ws = cur();
  if (kind === 'md') return { text: C.toMarkdown(ws), file: C.slug(ws.name) + '.md', type: 'text/markdown' };
  if (kind === 'json') return { text: C.toJSON(ws), file: C.slug(ws.name) + '.json', type: 'application/json' };
  return { text: C.toBackup(state.workspaces), file: `step-planner-sao-luu-${C.today()}.json`, type: 'application/json' };
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
  $('dlg-export').showModal();
}
$('export-btn').addEventListener('click', openExport);
$('backup-nudge').addEventListener('click', () => {
  const file = backupAll();
  toast('Đã tải bản sao lưu ' + file);
  refocus('#export-btn');
});
$('backup-all').addEventListener('click', () => { $('export-status').textContent = 'Đã tải ' + backupAll(); });
$('export-kind').addEventListener('change', () => { $('export-text').value = exportText().text; $('export-status').textContent = ''; });
$('export-download').addEventListener('click', () => {
  const x = exportText();
  download(x);
  if (exportKind() === 'backup') markBackup();
  $('export-status').textContent = 'Đã tải ' + x.file;
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
  $('export-status').textContent = ok ? 'Đã chép.' : 'Không chép được — chọn chữ rồi chép tay.';
});

/* ── Nhập ── */

/** @type {any} */
let importParsed = null;
function openImport() {
  $('import-file').value = '';
  $('import-text').value = '';
  /** @type {any} */ (document.querySelector('input[name="import-mode"][value="new"]')).checked = true;
  previewImport();
  $('dlg-import').showModal();
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
  if (!text.trim()) { p.replaceChildren('Chưa có nội dung.'); $('import-go').disabled = true; setReplace(false); return; }
  try {
    importParsed = C.parseImport(text);
    const c = C.counts(importParsed.workspaces);
    const kind = { md: 'Markdown', json: 'JSON một dự án', backup: 'JSON sao lưu' }[importParsed.kind];
    const w = importParsed.warnings;
    p.replaceChildren(h('p', {}, `${kind}: ${c.workspaces} dự án · ${c.steps} bước · ${c.subs} bước con · ${c.log} quyết định`
      + (w.length ? ` · ${w.length} cảnh báo:` : '')),
    w.length ? h('ul', { class: 'warn-list' }, w.map((x) => h('li', {}, x))) : '');
    $('import-go').disabled = false;
    setReplace(!!cur() && importParsed.workspaces.length === 1);
  } catch (e) {
    p.replaceChildren('Không đọc được: ' + /** @type {Error} */ (e).message);
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
  ui.q = ''; ui.owner = ''; $('q').value = '';
  const ws = cur();
  if (mode === 'replace' && ws && parsed.workspaces.length === 1) {
    const before = JSON.parse(JSON.stringify(ws));
    const nu = parsed.workspaces[0];
    Object.assign(ws, { ...nu, id: ws.id, createdAt: ws.createdAt });
    commit();
    afterOpen();
    toast(`Đã thay nội dung "${before.name}".`, () => {
      const i = state.workspaces.findIndex((x) => x.id === before.id);
      if (i < 0) { toast('Không hoàn tác được: dự án đã bị xoá.'); return; }
      state.workspaces[i] = before;
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
  toast(`Đã nhập ${parsed.workspaces.length} dự án mới.`);
});

/* ── Kéo thả (máy tính) — bàn phím dùng Alt + mũi tên hoặc ô Vị trí trong hộp sửa ── */

const clearDrop = () => document.querySelectorAll('.drop-before, .drop-after, .drop-end, .dragging')
  .forEach((el) => el.classList.remove('drop-before', 'drop-after', 'drop-end', 'dragging'));

/** Chỗ thả bước con: thẻ đứng ngay sau điểm thả, hoặc null là cuối hàng. @param {any} ol @param {number} x */
function subDropBefore(ol, x) {
  const cards = [...ol.querySelectorAll('.card[data-sub]:not(.dragging)')];
  return cards.find((c) => { const r = c.getBoundingClientRect(); return x < r.left + r.width / 2; }) || null;
}
/** @param {any} row @param {number} y */
const stepDropAfter = (row, y) => { const r = row.getBoundingClientRect(); return y > r.top + r.height / 2; };

$('board').addEventListener('dragstart', (/** @type {any} */ e) => {
  const card = e.target.closest && e.target.closest('.card[data-sub]');
  const head = !card && e.target.closest && e.target.closest('.step-head');
  if (card) { drag = { kind: 'sub', id: card.dataset.sub }; card.classList.add('dragging'); }
  else if (head) { drag = { kind: 'step', id: head.closest('[data-step]').dataset.step }; head.closest('.step').classList.add('dragging'); }
  else return;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', drag.id);
});
$('board').addEventListener('dragover', (/** @type {any} */ e) => {
  if (!drag) return;
  document.querySelectorAll('.drop-before, .drop-after, .drop-end').forEach((el) => el.classList.remove('drop-before', 'drop-after', 'drop-end'));
  if (drag.kind === 'sub') {
    const ol = e.target.closest('.step') && e.target.closest('.step').querySelector('.cards');
    if (!ol) return;
    e.preventDefault();
    const before = subDropBefore(ol, e.clientX);
    if (before) before.classList.add('drop-before'); else ol.classList.add('drop-end');
  } else {
    const row = e.target.closest('.step');
    if (!row) return;
    e.preventDefault();
    row.classList.add(stepDropAfter(row, e.clientY) ? 'drop-after' : 'drop-before');
  }
});
$('board').addEventListener('drop', (/** @type {any} */ e) => {
  const ws = cur();
  const d = drag;
  const row = e.target.closest('.step');
  if (!ws || !d || !row) return;
  e.preventDefault();
  const target = stepOf(ws, row.dataset.step);
  if (d.kind === 'sub') {
    const from = ws.steps.find((/** @type {any} */ s) => s.subs.some((/** @type {any} */ x) => x.id === d.id));
    if (!from || !target) return;
    const before = subDropBefore(row.querySelector('.cards'), e.clientX);
    const sub = from.subs.find((/** @type {any} */ x) => x.id === d.id);
    from.subs.splice(from.subs.indexOf(sub), 1);
    const k = before ? target.subs.findIndex((/** @type {any} */ x) => x.id === before.dataset.sub) : -1;
    target.subs.splice(k < 0 ? target.subs.length : k, 0, sub);
    drag = null;
    commit(subSel(sub.id, 'edit-sub'));
  } else {
    const step = stepOf(ws, d.id);
    if (!step || step === target) return;
    const after = stepDropAfter(row, e.clientY);
    ws.steps.splice(ws.steps.indexOf(step), 1);
    ws.steps.splice(ws.steps.indexOf(target) + (after ? 1 : 0), 0, step);
    drag = null;
    commit(stepSel(step.id, 'edit-step'));
  }
});
$('board').addEventListener('dragend', () => { drag = null; clearDrop(); });

/* ── Theme (REPO-024): theo hệ điều hành tới khi người dùng bấm ── */

const darkMq = matchMedia('(prefers-color-scheme: dark)');
const effectiveTheme = () => document.documentElement.dataset.theme || (darkMq.matches ? 'dark' : 'light');
function paintThemeBtn() {
  $('theme-btn').setAttribute('aria-label', effectiveTheme() === 'dark' ? 'Đổi sang giao diện sáng' : 'Đổi sang giao diện tối');
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
  state = S.load().state;
  if (!findWs(curId)) setCur(findWs(state.lastId) ? state.lastId : state.workspaces[0]?.id || '');
  render();
});

/* ── Khởi động ── */

async function boot() {
  paintThemeBtn();
  S.askPersist();
  if (!storageOK) setBanner('storage', 'Trình duyệt chặn bộ nhớ: thay đổi chỉ giữ tới khi đóng trang. Sao lưu JSON để giữ.');
  else if (loaded.problem === 'corrupt') setBanner('storage', `Dữ liệu đã lưu bị hỏng, không đọc được. Bản cũ giữ ở khoá ${S.KEY}.corrupt; trang bắt đầu trống.`);
  try {
    const res = await fetch('data/templates.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    templates = (await res.json()).templates || [];
  } catch (e) {
    setBanner('fetch', 'Không tải được data/templates.json nên chưa có mẫu. Trang đọc mẫu bằng fetch, phải mở qua HTTP: '
      + 'chạy python3 -m http.server ở gốc repo rồi mở http://localhost:8000/step-planner/.');
  }
  const tab = S.tabProject();
  curId = findWs(tab) ? tab : findWs(state.lastId) ? state.lastId : state.workspaces[0]?.id || '';
  if (curId) S.setTabProject(curId);
  render();
}
boot();
