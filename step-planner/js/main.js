// @ts-check
/* Giao diện Step Planner: nạp mẫu, vẽ bảng, sự kiện, hộp thoại. Logic thuần ở core.js, bộ nhớ ở store.js.
 * Chữ người dùng chỉ vào DOM qua textContent (hàm h), không bao giờ qua HTML. */
import * as C from './core.js';
import * as S from './store.js';

/** @param {string} id @returns {any} */
const $ = (id) => document.getElementById(id);

/** Dựng phần tử; con là chuỗi thì thành text node. @param {string} tag @param {Record<string, any>} [attrs] @param {...any} kids */
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false && kid !== '') el.append(kid instanceof Node ? kid : String(kid));
  return el;
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
/** @param {keyof typeof ICONS} name @param {string} label @param {string} act @param {boolean} [disabled] */
const iconBtn = (name, label, act, disabled = false) =>
  h('button', { type: 'button', class: 'icon-btn', 'data-act': act, 'aria-label': label, title: label, disabled }, icon(name));

/* ── Trạng thái ── */

const storageOK = S.available();
const loaded = S.load();
/** @type {{version:number, workspaces:any[], lastId:string, me:Record<string,string>}} */
let state = loaded.state;
/** @type {any[]} */
let templates = [];
const ui = { q: '', owner: '' };
/** @type {{kind:'sub'|'step', id:string} | null} */
let drag = null;
const banners = new Map();

const cur = () => state.workspaces.find((w) => w.id === state.lastId) || null;
const findWs = (/** @type {string} */ id) => state.workspaces.find((w) => w.id === id) || null;
const fmtDate = (/** @type {string} */ d) => (d ? d.split('-').reverse().join('/') : '');

function setBanner(/** @type {string} */ key, /** @type {string} */ msg) {
  if (msg) banners.set(key, msg); else banners.delete(key);
  const b = $('banner');
  b.replaceChildren(...[...banners.values()].map((m) => h('p', {}, m)));
  b.hidden = !banners.size;
}

function persist() {
  if (!storageOK) return;
  setBanner('save', S.save(state) ? '' : 'Không ghi được vào bộ nhớ trình duyệt (đầy hoặc bị chặn). Thay đổi mới chưa được lưu — xuất JSON để giữ.');
}

/** Ghi lại, vẽ lại, rồi đưa focus về phần tử vừa thao tác. @param {string} [focusSel] */
function commit(focusSel) {
  const ws = cur();
  if (ws) ws.updatedAt = new Date().toISOString();
  persist();
  render();
  if (focusSel) refocus(focusSel);
}
function refocus(/** @type {string} */ sel) {
  for (const s of sel.split('||')) {
    const el = document.querySelector(s.trim());
    if (el && !el.disabled) { el.focus(); return; }
  }
}
const subSel = (/** @type {string} */ id, /** @type {string} */ act) => `.card[data-sub="${id}"] [data-act="${act}"]`;
const stepSel = (/** @type {string} */ id, /** @type {string} */ act) => `.step[data-step="${id}"] .step-head [data-act="${act}"]`;

/* ── Toast có Hoàn tác ── */

/** @type {null | (() => void)} */
let toastUndo = null;
let toastTimer = 0;
function toast(/** @type {string} */ text, /** @type {null | (() => void)} */ undo = null) {
  $('toast-text').textContent = text;
  $('toast-undo').hidden = !undo;
  toastUndo = undo;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { $('toast').hidden = true; toastUndo = null; }, undo ? 9000 : 3500);
}
$('toast-undo').addEventListener('click', () => {
  const u = toastUndo;
  $('toast').hidden = true;
  toastUndo = null;
  if (u) u();
});

/* ── Vẽ ── */

function render() {
  const ws = cur();
  $('app').hidden = !ws;
  $('start').hidden = !!ws;
  $('ws-name').textContent = ws ? ws.name : 'Step Planner';
  document.title = ws ? `${ws.name} — Step Planner` : 'Step Planner — kế hoạch từng bước';
  $('overall').hidden = !ws;
  if (!ws) { renderStart(); return; }
  const o = C.overall(ws);
  $('overall-text').textContent = `${o.done}/${o.total} xong · ${o.pct}%`;
  $('overall-bar').style.width = o.pct + '%';
  renderOwnerFilter(ws);
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
    h('option', { value: '@me' }, me ? `Việc của tôi (${me})` : 'Việc của tôi (chọn "Tôi là" ở Người)'),
    ...names.map((n) => h('option', { value: n }, n)),
    h('option', { value: '@none' }, 'Chưa giao'),
  );
  sel.value = ui.owner;
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
  const rows = [];
  let shown = 0;
  ws.steps.forEach((/** @type {any} */ step, /** @type {number} */ i) => {
    const stepHit = !!q && C.fold([step.title, step.goal, step.doneWhen, step.notes, step.revisit?.reason].join(' ')).includes(q);
    const visible = step.subs.filter((/** @type {any} */ x) => ownerOk(x)
      && (!q || stepHit || C.fold([x.title, x.owner, x.doneWhen, x.notes].join(' ')).includes(q)));
    if (filtering && !visible.length && !(stepHit && !ui.owner)) return;
    shown += visible.length;
    const prog = C.progress(step.subs);
    const nextId = C.nextActionId(step);
    const last = step.subs.length - 1;
    const head = h('div', { class: 'step-head', draggable: filtering ? null : 'true' },
      h('div', { class: 'step-top' },
        h('span', { class: 'step-num', 'aria-hidden': 'true' }, String(i + 1)),
        h('h2', { class: 'step-title', id: 'st-' + step.id },
          h('button', { type: 'button', class: 'link', 'data-act': 'edit-step', 'aria-label': `Bước ${i + 1}: ${step.title}. Sửa` }, step.title))),
      step.revisit && h('button', { type: 'button', class: 'badge', 'data-act': 'revisit', title: step.revisit.date ? 'Đánh dấu ngày ' + fmtDate(step.revisit.date) : null },
        'Quay lại' + (step.revisit.reason ? ': ' + step.revisit.reason : '')),
      step.goal && h('p', { class: 'step-goal' }, step.goal),
      step.doneWhen && h('p', { class: 'step-done' }, h('span', { class: 'lbl' }, 'Xong khi '), step.doneWhen),
      h('div', { class: 'prog' },
        h('span', {}, `${prog.done}/${prog.total}`, h('span', { class: 'sr' }, ' bước con xong')),
        h('span', { class: 'bar', 'aria-hidden': 'true' }, barFill(prog.pct))),
      h('div', { class: 'acts' },
        !filtering && iconBtn('up', 'Đưa bước lên', 'step-up', i === 0),
        !filtering && iconBtn('down', 'Đưa bước xuống', 'step-down', i === ws.steps.length - 1),
        iconBtn('revisit', 'Quay lại bước này', 'revisit'),
        iconBtn('trash', 'Xoá bước', 'del-step')));
    const cards = visible.map((/** @type {any} */ x) => {
      const j = step.subs.indexOf(x);
      const label = C.STATUS_LABEL[x.status];
      const overdue = x.due && x.due < todayStr && x.status !== 'done' && x.status !== 'skip';
      return h('li', { class: `card st-${x.status}${x.id === nextId ? ' next' : ''}`, 'data-sub': x.id, draggable: filtering ? null : 'true' },
        h('div', { class: 'card-top' },
          h('span', { class: 'num' }, `${i + 1}.${j + 1}`),
          x.id === nextId && h('span', { class: 'next-tag' }, 'Tiếp theo'),
          h('button', { type: 'button', class: `chip st-${x.status}`, 'data-act': 'cycle', 'aria-label': `Trạng thái: ${label}. Bấm để đổi` }, label)),
        h('h3', { class: 'card-title' }, h('button', { type: 'button', class: 'link', 'data-act': 'edit-sub' }, x.title)),
        (x.owner || x.due) && h('p', { class: 'meta' },
          x.owner && h('span', { class: 'owner' }, '@' + x.owner),
          x.due && h('span', { class: 'due' + (overdue ? ' overdue' : '') }, 'hạn ' + fmtDate(x.due) + (overdue ? ' (trễ)' : ''))),
        x.doneWhen && h('p', { class: 'card-done' }, h('span', { class: 'lbl' }, 'Xong khi '), x.doneWhen),
        x.notes && h('p', { class: 'card-notes' }, x.notes),
        h('div', { class: 'acts' },
          !filtering && iconBtn('left', 'Sang trái', 'sub-left', j === 0),
          !filtering && iconBtn('right', 'Sang phải', 'sub-right', j === last),
          iconBtn('copy', 'Nhân bản', 'sub-dup'),
          iconBtn('trash', 'Xoá', 'sub-del')));
    });
    cards.push(h('li', { class: 'card add' }, h('button', { type: 'button', class: 'add-sub', 'data-act': 'add-sub' }, '+ Bước con')));
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
}

function barFill(/** @type {number} */ pct) {
  const i = h('i');
  i.style.width = pct + '%';
  return i;
}

function renderLog(/** @type {any} */ ws) {
  if (!$('log-date').value) $('log-date').value = C.today();
  $('log-list').replaceChildren(...[...ws.log].reverse().map((l) => h('li', { class: 'log-item', 'data-log': l.id },
    h('span', { class: 'log-date' }, fmtDate(l.date)),
    h('span', { class: 'log-decision' }, l.decision),
    iconBtn('trash', 'Xoá quyết định', 'del-log'),
    l.why && h('p', { class: 'log-why' }, l.why))));
}

function renderStart() {
  const box = $('start-templates');
  const list = templates.length ? templates : [{ id: 'blank', name: 'Trống', description: '', steps: [] }];
  box.replaceChildren(...list.map((t) => h('button', { type: 'button', class: 'tpl', 'data-tpl': t.id },
    h('span', {}, h('b', {}, t.name), t.description && h('small', {}, t.description)))));
}

/* ── Dự án ── */

/** @param {any} ws */
function addWorkspace(ws) {
  state.workspaces.push(ws);
  state.lastId = ws.id;
  ui.q = ''; ui.owner = '';
  $('q').value = '';
}
function createFrom(/** @type {string} */ tplId, /** @type {string} */ name = '') {
  const tpl = templates.find((t) => t.id === tplId) || { id: 'blank', name: 'Dự án mới', steps: [] };
  addWorkspace(C.fromTemplate(tpl, name));
  commit('#board');
}
function switchTo(/** @type {string} */ id) {
  state.lastId = id;
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
      h('button', { type: 'button', class: 'ws-open', 'data-act': 'ws-open', 'aria-current': w.id === state.lastId ? 'true' : null },
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
  const w = findWs(li.dataset.ws);
  if (!w) return;
  const act = b.dataset.act;
  if (act === 'ws-open') { $('dlg-ws').close(); switchTo(w.id); return; }
  if (act === 'ws-rename') {
    const name = await ask({ title: 'Đổi tên dự án', label: 'Tên', value: w.name, ok: 'Đổi tên' });
    if (name && C.oneLine(name)) { w.name = C.oneLine(name); w.updatedAt = new Date().toISOString(); persist(); render(); }
  } else if (act === 'ws-dup') {
    const c = C.freshCopy(w);
    c.name = w.name + ' (bản sao)';
    state.workspaces.splice(state.workspaces.indexOf(w) + 1, 0, c);
    persist(); render();
  } else if (act === 'ws-del') {
    const ok = await ask({ title: 'Xoá dự án?', text: `"${w.name}" sẽ bị xoá khỏi trình duyệt này, không hoàn tác được. Xuất JSON trước nếu cần giữ.`, ok: 'Xoá', danger: true });
    if (ok === null) return;
    state.workspaces = state.workspaces.filter((x) => x !== w);
    if (state.lastId === w.id) state.lastId = state.workspaces[0]?.id || '';
    persist(); render();
    if (!state.workspaces.length) { $('dlg-ws').close(); return; }
  }
  renderWsList();
  refocus(`[data-ws="${w.id}"] [data-act="${act}"] || #ws-list button`);
});
$('ws-new').addEventListener('submit', (/** @type {any} */ e) => {
  e.preventDefault();
  const tpl = /** @type {any} */ (document.querySelector('#ws-new-templates input:checked'))?.value || 'blank';
  $('dlg-ws').close();
  createFrom(tpl, $('ws-new-name').value);
});

/* ── Hộp hỏi lại / nhập một dòng ── */

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
  if (o.label) { $('ask-input').focus(); $('ask-input').select(); }
  return new Promise((resolve) => {
    dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok' ? $('ask-input').value : null), { once: true });
  });
}

/* ── Hành động trên bảng ── */

/** @param {any} ws @param {string} stepId */
const stepOf = (ws, stepId) => ws.steps.find((/** @type {any} */ s) => s.id === stepId);

$('board').addEventListener('click', (/** @type {any} */ e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const ws = cur();
  if (!ws) return;
  const act = b.dataset.act;
  if (act === 'clear-filter') { clearFilter(); return; }
  const row = b.closest('[data-step]');
  const step = row && stepOf(ws, row.dataset.step);
  if (!step) return;
  const i = ws.steps.indexOf(step);
  const card = b.closest('[data-sub]');
  const sub = card && step.subs.find((/** @type {any} */ x) => x.id === card.dataset.sub);
  const j = sub ? step.subs.indexOf(sub) : -1;
  switch (act) {
    case 'edit-step': openStep(step); break;
    case 'revisit': openRevisit(step); break;
    case 'step-up': case 'step-down': {
      const k = act === 'step-up' ? i - 1 : i + 1;
      if (k < 0 || k >= ws.steps.length) return;
      ws.steps.splice(i, 1); ws.steps.splice(k, 0, step);
      commit(`${stepSel(step.id, act)} || ${stepSel(step.id, 'edit-step')}`);
      break;
    }
    case 'del-step': deleteStep(ws, step); break;
    case 'add-sub': openSub(step, null); break;
    case 'cycle': sub.status = C.nextStatus(sub.status); commit(subSel(sub.id, 'cycle')); break;
    case 'edit-sub': openSub(step, sub); break;
    case 'sub-left': case 'sub-right': {
      const k = act === 'sub-left' ? j - 1 : j + 1;
      if (k < 0 || k >= step.subs.length) return;
      step.subs.splice(j, 1); step.subs.splice(k, 0, sub);
      commit(`${subSel(sub.id, act)} || ${subSel(sub.id, 'edit-sub')}`);
      break;
    }
    case 'sub-dup': duplicateSub(step, sub); break;
    case 'sub-del': deleteSub(ws, step, sub); break;
  }
});

function duplicateSub(/** @type {any} */ step, /** @type {any} */ sub) {
  const c = C.normSub({ ...sub, id: '', title: sub.title + ' (bản sao)' });
  step.subs.splice(step.subs.indexOf(sub) + 1, 0, c);
  commit(subSel(c.id, 'edit-sub'));
}

function deleteSub(/** @type {any} */ ws, /** @type {any} */ step, /** @type {any} */ sub) {
  const j = step.subs.indexOf(sub);
  step.subs.splice(j, 1);
  commit(`${subSel(step.subs[Math.min(j, step.subs.length - 1)]?.id, 'sub-del')} || .step[data-step="${step.id}"] [data-act="add-sub"]`);
  toast(`Đã xoá "${sub.title}".`, () => {
    const s = stepOf(ws, step.id);
    if (!s) { toast('Không hoàn tác được: bước chứa nó đã bị xoá.'); return; }
    s.subs.splice(Math.min(j, s.subs.length), 0, sub);
    if (cur() !== ws) switchTo(ws.id);
    commit(subSel(sub.id, 'edit-sub'));
  });
}

function deleteStep(/** @type {any} */ ws, /** @type {any} */ step) {
  const i = ws.steps.indexOf(step);
  ws.steps.splice(i, 1);
  const near = ws.steps[Math.min(i, ws.steps.length - 1)];
  commit(near ? stepSel(near.id, 'edit-step') : '#add-step');
  toast(`Đã xoá bước "${step.title}" (${step.subs.length} bước con).`, () => {
    if (!state.workspaces.includes(ws)) { toast('Không hoàn tác được: dự án đã bị xoá.'); return; }
    ws.steps.splice(Math.min(i, ws.steps.length), 0, step);
    if (cur() !== ws) switchTo(ws.id);
    commit(stepSel(step.id, 'edit-step'));
  });
}

/* ── Hộp bước con ── */

/** @type {{wsId:string, stepId:string, subId:string|null}|null} */
let subCtx = null;
const field = (/** @type {any} */ form, /** @type {string} */ name) => form.elements.namedItem(name);

function openSub(/** @type {any} */ step, /** @type {any} */ sub) {
  const ws = cur();
  const f = $('sub-form');
  subCtx = { wsId: ws.id, stepId: step.id, subId: sub ? sub.id : null };
  $('dlg-sub-title').textContent = sub ? 'Sửa bước con' : 'Thêm bước con';
  field(f, 'status').replaceChildren(...C.STATUSES.map((s) => h('option', { value: s }, C.STATUS_LABEL[s])));
  field(f, 'step').replaceChildren(...ws.steps.map((/** @type {any} */ s, /** @type {number} */ i) => h('option', { value: s.id }, `${i + 1}. ${s.title}`)));
  const x = sub || C.normSub({ title: '' });
  field(f, 'title').value = sub ? x.title : '';
  field(f, 'status').value = x.status;
  field(f, 'owner').value = x.owner;
  field(f, 'due').value = x.due;
  field(f, 'doneWhen').value = x.doneWhen;
  field(f, 'notes').value = x.notes;
  field(f, 'step').value = step.id;
  $('sub-del').hidden = !sub;
  $('sub-dup').hidden = !sub;
  $('dlg-sub').showModal();
}
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
  $('dlg-sub').close();
  if (!ws || !step || (subCtx.subId && !sub)) { toast('Không lưu được: bước đã bị xoá ở nơi khác.'); return; }
  const data = C.normSub({
    id: sub ? sub.id : '',
    title: field(f, 'title').value, status: field(f, 'status').value, owner: field(f, 'owner').value,
    due: field(f, 'due').value, doneWhen: field(f, 'doneWhen').value, notes: field(f, 'notes').value,
  });
  const target = stepOf(ws, field(f, 'step').value) || step;
  if (sub) {
    Object.assign(sub, data);
    if (target !== step) { step.subs.splice(step.subs.indexOf(sub), 1); target.subs.push(sub); }
  } else target.subs.push(data);
  commit(subSel(data.id, 'edit-sub'));
});
$('sub-dup').addEventListener('click', () => {
  const { step, sub } = subFromCtx();
  $('dlg-sub').close();
  if (step && sub) duplicateSub(step, sub);
});
$('sub-del').addEventListener('click', () => {
  const { ws, step, sub } = subFromCtx();
  $('dlg-sub').close();
  if (ws && step && sub) deleteSub(ws, step, sub);
});

/* ── Hộp bước ── */

/** @type {{wsId:string, stepId:string|null}|null} */
let stepCtx = null;
function openStep(/** @type {any} */ step) {
  const f = $('step-form');
  stepCtx = { wsId: cur().id, stepId: step ? step.id : null };
  $('dlg-step-title').textContent = step ? 'Sửa bước' : 'Thêm bước';
  field(f, 'title').value = step ? step.title : '';
  field(f, 'goal').value = step ? step.goal : '';
  field(f, 'doneWhen').value = step ? step.doneWhen : '';
  field(f, 'notes').value = step ? step.notes : '';
  $('step-del').hidden = !step;
  $('dlg-step').showModal();
}
$('add-step').addEventListener('click', () => openStep(null));
$('step-form').addEventListener('submit', (/** @type {any} */ e) => {
  e.preventDefault();
  const f = $('step-form');
  const ws = stepCtx && findWs(stepCtx.wsId);
  $('dlg-step').close();
  if (!ws) return;
  const vals = { title: field(f, 'title').value, goal: field(f, 'goal').value, doneWhen: field(f, 'doneWhen').value, notes: field(f, 'notes').value };
  let step = stepCtx.stepId ? stepOf(ws, stepCtx.stepId) : null;
  if (stepCtx.stepId && !step) { toast('Không lưu được: bước đã bị xoá ở nơi khác.'); return; }
  if (step) {
    const n = C.normStep({ ...step, ...vals });
    Object.assign(step, { title: n.title, goal: n.goal, doneWhen: n.doneWhen, notes: n.notes });
  } else {
    step = C.normStep(vals);
    ws.steps.push(step);
  }
  commit(stepSel(step.id, 'edit-step'));
});
$('step-del').addEventListener('click', () => {
  const ws = stepCtx && findWs(stepCtx.wsId);
  const step = ws && stepCtx.stepId && stepOf(ws, stepCtx.stepId);
  $('dlg-step').close();
  if (step) deleteStep(ws, step);
});

/* ── Quay lại bước này ── */

let revisitCtx = { wsId: '', stepId: '' };
function openRevisit(/** @type {any} */ step) {
  revisitCtx = { wsId: cur().id, stepId: step.id };
  $('revisit-step').textContent = step.title;
  field($('revisit-form'), 'reason').value = step.revisit ? step.revisit.reason : '';
  $('revisit-clear').hidden = !step.revisit;
  $('dlg-revisit').showModal();
}
function revisitStep() {
  const ws = findWs(revisitCtx.wsId);
  return ws ? stepOf(ws, revisitCtx.stepId) : null;
}
$('revisit-form').addEventListener('submit', (/** @type {any} */ e) => {
  e.preventDefault();
  const step = revisitStep();
  $('dlg-revisit').close();
  if (!step) return;
  step.revisit = { reason: C.oneLine(field($('revisit-form'), 'reason').value), date: C.today() };
  commit(stepSel(step.id, 'revisit'));
});
$('revisit-clear').addEventListener('click', () => {
  const step = revisitStep();
  $('dlg-revisit').close();
  if (!step) return;
  step.revisit = null;
  commit(stepSel(step.id, 'revisit'));
});

/* ── Người ── */

function openPeople(focusMe = false) {
  const ws = cur();
  const f = $('people-form');
  field(f, 'people').value = ws.people.join('\n');
  const me = state.me[ws.id] || '';
  const names = ownersOf(ws);
  field(f, 'me').replaceChildren(h('option', { value: '' }, '(chưa chọn)'), ...names.map((n) => h('option', { value: n }, n)));
  field(f, 'me').value = names.includes(me) ? me : '';
  $('dlg-people').showModal();
  if (focusMe) field(f, 'me').focus();
}
$('people-btn').addEventListener('click', () => openPeople());
$('people-form').addEventListener('submit', (/** @type {any} */ e) => {
  e.preventDefault();
  const ws = cur();
  const f = $('people-form');
  $('dlg-people').close();
  ws.people = C.normWorkspace({ people: field(f, 'people').value.split('\n') }).people;
  const me = field(f, 'me').value;
  if (me) state.me[ws.id] = me; else delete state.me[ws.id];
  commit('#people-btn');
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
$('log-list').addEventListener('click', (/** @type {any} */ e) => {
  const b = e.target.closest('[data-act="del-log"]');
  const ws = cur();
  if (!b || !ws) return;
  const id = b.closest('[data-log]').dataset.log;
  const k = ws.log.findIndex((/** @type {any} */ l) => l.id === id);
  if (k < 0) return;
  const [entry] = ws.log.splice(k, 1);
  commit('#log-decision');
  toast(`Đã xoá quyết định "${entry.decision}".`, () => {
    ws.log.splice(Math.min(k, ws.log.length), 0, entry);
    if (cur() !== ws) switchTo(ws.id);
    commit('#log-decision');
  });
});

/* ── Xuất ── */

function exportText() {
  const kind = /** @type {any} */ (document.querySelector('input[name="export-kind"]:checked')).value;
  const ws = cur();
  if (kind === 'md') return { text: C.toMarkdown(ws), file: C.slug(ws.name) + '.md', type: 'text/markdown' };
  if (kind === 'json') return { text: C.toJSON(ws), file: C.slug(ws.name) + '.json', type: 'application/json' };
  return { text: C.toBackup(state.workspaces), file: `step-planner-sao-luu-${C.today()}.json`, type: 'application/json' };
}
function openExport() {
  $('export-text').value = exportText().text;
  $('export-status').textContent = '';
  $('dlg-export').showModal();
}
$('export-btn').addEventListener('click', openExport);
$('export-kind').addEventListener('change', () => { $('export-text').value = exportText().text; $('export-status').textContent = ''; });
$('export-download').addEventListener('click', () => {
  const { text, file, type } = exportText();
  const url = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
  const a = h('a', { href: url, download: file });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('export-status').textContent = 'Đã tải ' + file;
});
$('export-copy').addEventListener('click', async () => {
  const text = exportText().text;
  try {
    await navigator.clipboard.writeText(text);
    $('export-status').textContent = 'Đã chép.';
  } catch (e) {
    $('export-text').select();
    const ok = document.execCommand && document.execCommand('copy');
    $('export-status').textContent = ok ? 'Đã chép.' : 'Không chép được — chọn chữ rồi chép tay.';
  }
});

/* ── Nhập ── */

/** @type {any} */
let importParsed = null;
function openImport() {
  $('import-file').value = '';
  $('import-text').value = '';
  previewImport();
  $('dlg-import').showModal();
}
function previewImport() {
  const p = $('import-preview');
  const text = $('import-text').value;
  importParsed = null;
  p.classList.remove('bad');
  if (!text.trim()) { p.textContent = 'Chưa có nội dung.'; $('import-go').disabled = true; return; }
  try {
    importParsed = C.parseImport(text);
    const c = C.counts(importParsed.workspaces);
    const kind = { md: 'Markdown', json: 'JSON một dự án', backup: 'JSON sao lưu' }[importParsed.kind];
    p.textContent = `${kind}: ${c.workspaces} dự án · ${c.steps} bước · ${c.subs} bước con · ${c.log} quyết định`
      + (importParsed.warnings.length ? ` · ${importParsed.warnings.length} dòng không đọc được: ${importParsed.warnings.slice(0, 3).join(' | ')}` : '');
    $('import-go').disabled = false;
  } catch (e) {
    p.textContent = 'Không đọc được: ' + /** @type {Error} */ (e).message;
    p.classList.add('bad');
    $('import-go').disabled = true;
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
  const names = new Set(state.workspaces.map((w) => w.name));
  for (const w of importParsed.workspaces) {
    if (names.has(w.name)) w.name += ' (nhập)';
    state.workspaces.push(w);
  }
  state.lastId = importParsed.workspaces[0].id;
  const n = importParsed.workspaces.length;
  $('dlg-import').close();
  ui.q = ''; ui.owner = ''; $('q').value = '';
  commit('#board');
  toast(`Đã nhập ${n} dự án mới.`);
});

/* ── Kéo thả (máy tính) — bàn phím và điện thoại dùng nút mũi tên ── */

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

/* ── Hộp thoại: nút đóng chung ── */

document.addEventListener('click', (/** @type {any} */ e) => {
  const b = e.target.closest && e.target.closest('[data-close]');
  if (b) b.closest('dialog').close();
});

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

/* ── Tab khác sửa cùng dữ liệu ── */

window.addEventListener('storage', (e) => {
  if (e.key !== S.KEY) return;
  const keep = state.lastId;
  state = S.load().state;
  if (!findWs(state.lastId)) state.lastId = findWs(keep) ? keep : state.workspaces[0]?.id || '';
  render();
});

/* ── Khởi động ── */

async function boot() {
  paintThemeBtn();
  if (!storageOK) setBanner('storage', 'Trình duyệt chặn bộ nhớ: thay đổi chỉ giữ tới khi đóng trang. Xuất JSON để giữ.');
  else if (loaded.problem === 'corrupt') setBanner('storage', `Dữ liệu đã lưu bị hỏng, không đọc được. Bản cũ giữ ở khoá ${S.KEY}.corrupt; trang bắt đầu trống.`);
  try {
    const res = await fetch('data/templates.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    templates = (await res.json()).templates || [];
  } catch (e) {
    setBanner('fetch', 'Không tải được data/templates.json nên chưa có mẫu. Trang đọc mẫu bằng fetch, phải mở qua HTTP: '
      + 'chạy python3 -m http.server ở gốc repo rồi mở http://localhost:8000/step-planner/.');
  }
  if (!findWs(state.lastId)) state.lastId = state.workspaces[0]?.id || '';
  render();
}
boot();
