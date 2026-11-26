// @ts-check
/* Hộp văn bản Markdown (#dlg-md): tab Edit (ô chữ trên bản tô màu có số dòng) và Preview (bản dựng); Lưu, Delete.
   Xuất: openMd, initMdDialog.
   Dùng: core/model.js, ui/dialogs.js, ui/docs.js, ui/dom.js, ui/md-view.js, ui/state.js, ui/toast.js. */
import { normDoc } from '../core/model.js';
import { closeSaved, focusField, openDlg } from './dialogs.js';
import { deleteDoc, docFocus, docOwner, docWhere, refreshDocLists } from './docs.js';
import { $, field, h } from './dom.js';
import { renderMd, renderSrc } from './md-view.js';
import { commit, refocus } from './state.js';
import { toast } from './toast.js';

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

/** @param {DocCtx} ctx @param {string} [newTitle] */
export function openMd(ctx, newTitle = '') {
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

/** Gắn sự kiện, chạy một lần lúc khởi động (main.js gọi theo thứ tự). */
export function initMdDialog() {
  field($('md-form'), 'body').addEventListener('input', paintMdSrc);

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

  $('md-form').addEventListener('submit', (/** @type {any} */ e) => {
    e.preventDefault();
    const f = $('md-form');
    const ctx = mdCtx;
    if (!ctx) return;
    const owner = docOwner(ctx);
    closeSaved($('dlg-md'));
    if (!owner) { toast('Not saved: the step was deleted elsewhere.'); return; }
    const old = ctx.docId ? owner.docs.find((/** @type {any} */ d) => d.id === ctx.docId) : null;
    const doc = normDoc({ id: old ? old.id : '', kind: 'md', title: field(f, 'title').value, body: field(f, 'body').value, proof: !!old?.proof });
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
}
