// @ts-check
/* Màn đầu khi chưa có dự án: thẻ mẫu (tên, mô tả, loại đầu ra, số bước) chia hai nhóm có đầu mục (PLAN-039), nút Import.
   Xuất: BLANK_TPL, GROUP_LABEL, tplInfo, renderStart, initStart.
   Dùng: core/io.js, core/model.js, ui/dom.js, ui/import.js, ui/projects.js, ui/state.js. */
import { plural } from '../core/io.js';
import { tplGroups } from '../core/model.js';
import { $, h } from './dom.js';
import { openImport } from './import.js';
import { createFrom } from './projects.js';
import { templates } from './state.js';

export const BLANK_TPL = { id: 'blank', name: 'Blank', description: '', steps: [] };
/** Đầu mục của mỗi nhóm mẫu (core/model.js `TPL_GROUPS`); màn đầu và hộp Dự án cùng dùng. */
/** @type {Record<string, string>} */
export const GROUP_LABEL = { general: 'General templates', specific: 'Specific projects' };
/** Tên, mô tả, loại đầu ra và số bước / bước con của một mẫu (đếm từ templates.json). @param {any} t */
export function tplInfo(t) {
  const subs = t.steps.reduce((/** @type {number} */ n, /** @type {any} */ s) => n + (s.subs || []).length, 0);
  return h('span', {}, h('b', {}, t.name), t.description && h('small', {}, t.description),
    t.steps.length > 0 && h('span', { class: 'tpl-n' }, t.output ? t.output + ' · ' : '',
      h('span', {}, plural(t.steps.length, 'step')), ' · ', h('span', {}, plural(subs, 'sub-step'))));
}
/** Mỗi nhóm: đầu mục rồi danh sách nút; Tab đi qua nút theo thứ tự nhóm. */
export function renderStart() {
  const list = templates.length ? templates : [BLANK_TPL];
  $('start-templates').replaceChildren(...tplGroups(list).map((g) => h('section', { class: 'tpl-group', 'aria-labelledby': `start-g-${g.key}` },
    h('h3', { class: 'tpl-group-h', id: `start-g-${g.key}` }, GROUP_LABEL[g.key]),
    h('ul', { class: 'tpl-list', role: 'list' }, // role: Safari bỏ nghĩa danh sách khi list-style: none
      g.items.map((t) => h('li', {}, h('button', { type: 'button', class: 'tpl', 'data-tpl': t.id }, tplInfo(t))))))));
}

/** Gắn sự kiện, chạy một lần lúc khởi động (main.js gọi theo thứ tự). */
export function initStart() {
  $('start-templates').addEventListener('click', (/** @type {any} */ e) => {
    const b = e.target.closest('[data-tpl]');
    if (b) createFrom(b.dataset.tpl);
  });
  $('start-import').addEventListener('click', () => openImport());
}
