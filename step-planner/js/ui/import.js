// @ts-check
/* Nhập (#dlg-import): dán chữ hay chọn file .md / .json, xem trước số mục và cảnh báo, thêm dự án mới hay thay nội dung
   dự án đang mở (có Hoàn tác).
   Xuất: openImport, initImport.
   Dùng: core/io.js, core/model.js, ui/board.js, ui/dialogs.js, ui/dom.js, ui/filter.js, ui/projects.js, ui/state.js,
     ui/toast.js. */
import { counts, parseImport, plural } from '../core/io.js';
import { uniqueName } from '../core/model.js';
import { resetBoard } from './board.js';
import { showDlg } from './dialogs.js';
import { $, h } from './dom.js';
import { resetFilters } from './filter.js';
import { afterOpen, switchTo } from './projects.js';
import { commit, cur, curId, setCur, state } from './state.js';
import { toast } from './toast.js';

/* ── Nhập ── */

/** @type {any} */
let importParsed = null;
export function openImport() {
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
    importParsed = parseImport(text);
    const c = counts(importParsed.workspaces);
    const kind = { md: 'Markdown', json: 'JSON (one project)', backup: 'JSON backup' }[importParsed.kind];
    const w = importParsed.warnings;
    p.replaceChildren(h('p', {}, `${kind}: ${plural(c.workspaces, 'project')} · ${plural(c.steps, 'step')} · ${plural(c.subs, 'sub-step')} · ${plural(c.log, 'decision')}`
      + (c.docs ? ` · ${plural(c.docs, 'doc')}` : '')
      + (w.length ? ` · ${plural(w.length, 'warning')}:` : '')),
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

/** Gắn sự kiện, chạy một lần lúc khởi động (main.js gọi theo thứ tự). */
export function initImport() {
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
    resetFilters();
    const ws = cur();
    if (mode === 'replace' && ws && parsed.workspaces.length === 1) {
      const before = JSON.parse(JSON.stringify(ws));
      const nu = parsed.workspaces[0];
      Object.assign(ws, { ...nu, id: ws.id, createdAt: ws.createdAt });
      resetBoard(ws.id);
      commit();
      afterOpen();
      toast(`Replaced the content of "${before.name}".`, () => {
        const i = state.workspaces.findIndex((x) => x.id === before.id);
        if (i < 0) { toast('Cannot undo: the project was deleted.'); return; }
        state.workspaces[i] = before;
        resetBoard(before.id);
        if (curId !== before.id) switchTo(before.id);
        commit();
        afterOpen();
      }, '#ws-btn');
      return;
    }
    for (const w of parsed.workspaces) {
      w.name = uniqueName(w.name, state.workspaces.map((x) => x.name));
      state.workspaces.push(w);
    }
    setCur(parsed.workspaces[0].id);
    commit();
    afterOpen();
    toast(`Imported ${plural(parsed.workspaces.length, 'new project')}.`);
  });
}
