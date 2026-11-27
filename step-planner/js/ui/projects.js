// @ts-check
/* Dự án: tạo từ mẫu, mở, đổi tên, nhân bản, xoá; hộp #dlg-ws hai tab (Open, New project).
   Xuất: afterOpen, createFrom, switchTo, initProjects.
   Dùng: core/board.js, core/io.js, core/model.js, ui/dialogs.js, ui/dom.js, ui/filter.js, ui/render.js, ui/start.js,
     ui/state.js, ui/toast.js. */
import { fold, overall } from '../core/board.js';
import { plural } from '../core/io.js';
import { freshCopy, fromTemplate, oneLine, tplGroups, uniqueName } from '../core/model.js';
import { ask, showDlg } from './dialogs.js';
import { $, barFill, fmtDate, h, icon } from './dom.js';
import { resetFilters } from './filter.js';
import { render } from './render.js';
import { BLANK_TPL, GROUP_LABEL, tplInfo } from './start.js';
import { commit, curId, findWs, persist, refocus, setCur, state, templates } from './state.js';
import { hideToast } from './toast.js';

/* ── Dự án ── */

/** @param {any} ws */
function addWorkspace(ws) {
  state.workspaces.push(ws);
  setCur(ws.id);
  resetFilters();
}
export function afterOpen() {
  window.scrollTo(0, 0);
  refocus('#ws-btn', { preventScroll: true });
}
export function createFrom(/** @type {string} */ tplId, /** @type {string} */ name = '') {
  const tpl = templates.find((t) => t.id === tplId) || { id: 'blank', name: 'Untitled project', steps: [] };
  addWorkspace(fromTemplate(tpl, name));
  commit();
  afterOpen();
}
export function switchTo(/** @type {string} */ id) {
  setCur(id);
  resetFilters();
  persist();
  render({ full: true });
}

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

function openWs() {
  renderWsList();
  const fs = $('ws-new-templates');
  // Hai nhóm như màn đầu (PLAN-039), mỗi nhóm một fieldset; mọi radio cùng tên nên ↑ ↓ đi xuyên nhóm. Chọn sẵn mẫu đầu tiên.
  const groups = tplGroups(templates.length ? templates : [BLANK_TPL]);
  fs.replaceChildren(h('legend', {}, 'Template'), ...groups.map((g, gi) => h('fieldset', { class: 'tpl-list tpl-pick' },
    h('legend', { class: 'tpl-group-h' }, GROUP_LABEL[g.key]),
    g.items.map((t, i) => h('label', { class: 'tpl', title: t.description || null },
      h('input', { type: 'radio', name: 'tpl', value: t.id, checked: gi === 0 && i === 0 }), tplInfo(t),
      h('span', { class: 'tpl-check', 'aria-hidden': 'true' }, icon('check')))))));
  $('ws-new-name').value = '';
  setWsTab(state.workspaces.length ? 'open' : 'new');
  showDlg($('dlg-ws'));
}
function renderWsList() {
  $('ws-count').textContent = String(state.workspaces.length);
  $('ws-list').replaceChildren(...state.workspaces.map((w) => {
    const o = overall(w);
    const tpl = templates.find((t) => t.id === w.templateId);
    const now = w.id === curId;
    const meta = [tpl && tpl.steps.length && fold(tpl.name) !== fold(w.name) ? tpl.name : '', plural(w.steps.length, 'step'), `edited ${fmtDate(w.updatedAt.slice(0, 10))}`];
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

/** Gắn sự kiện, chạy một lần lúc khởi động (main.js gọi theo thứ tự). */
export function initProjects() {
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
      if (w2 && name && oneLine(name)) { w2.name = oneLine(name); w2.updatedAt = new Date().toISOString(); persist(); render(); }
    } else if (act === 'ws-dup') {
      const w = findWs(id);
      if (!w) return;
      const c = freshCopy(w);
      c.name = uniqueName(w.name, state.workspaces.map((x) => x.name), 'copy');
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
}
