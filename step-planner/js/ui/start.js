// @ts-check
/* Màn đầu khi chưa có dự án: thẻ mẫu (tên, mô tả, loại đầu ra, số bước), nút Import.
   Xuất: BLANK_TPL, tplInfo, renderStart, initStart.
   Dùng: core/io.js, ui/dom.js, ui/import.js, ui/projects.js, ui/state.js. */
import { plural } from '../core/io.js';
import { $, h } from './dom.js';
import { openImport } from './import.js';
import { createFrom } from './projects.js';
import { templates } from './state.js';

export const BLANK_TPL = { id: 'blank', name: 'Blank', description: '', steps: [] };
/** Tên, mô tả, loại đầu ra và số bước / bước con của một mẫu (đếm từ templates.json). @param {any} t */
export function tplInfo(t) {
  const subs = t.steps.reduce((/** @type {number} */ n, /** @type {any} */ s) => n + (s.subs || []).length, 0);
  return h('span', {}, h('b', {}, t.name), t.description && h('small', {}, t.description),
    t.steps.length > 0 && h('span', { class: 'tpl-n' }, [t.output, plural(t.steps.length, 'step'), plural(subs, 'sub-step')].filter(Boolean).join(' · ')));
}
export function renderStart() {
  const list = templates.length ? templates : [BLANK_TPL];
  $('start-templates').replaceChildren(...list.map((t) => h('button', { type: 'button', class: 'tpl', 'data-tpl': t.id }, tplInfo(t))));
}

/** Gắn sự kiện, chạy một lần lúc khởi động (main.js gọi theo thứ tự). */
export function initStart() {
  $('start-templates').addEventListener('click', (/** @type {any} */ e) => {
    const b = e.target.closest('[data-tpl]');
    if (b) createFrom(b.dataset.tpl);
  });
  $('start-import').addEventListener('click', () => openImport());
}
