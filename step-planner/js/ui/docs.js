// @ts-check
/* Tài liệu của bước, bước con (PLAN-011): danh sách trong hộp sửa (mở, Evidence, xoá có Hoàn tác ngay trong hộp), hộp
   nhỏ #dlg-doc (thêm link hay văn bản, sửa link).
   Xuất: docOwner, docWhere, clearDocUndo, renderDocsEdit, refreshDocLists, docFocus, deleteDoc, openDocNew, initDocs.
   Dùng: core/model.js, ui/board.js, ui/dialogs.js, ui/dom.js, ui/md-dialog.js, ui/projects.js, ui/state.js,
     ui/step-dialog.js, ui/sub-dialog.js, ui/toast.js. */
import { normDoc, oneLine, safeUrl } from '../core/model.js';
import { labelsOf } from './board.js';
import { closeSaved, openDlg } from './dialogs.js';
import { $, field, h, icon } from './dom.js';
import { openMd } from './md-dialog.js';
import { switchTo } from './projects.js';
import { commit, curId, findWs, refocus, stepOf, stepSel } from './state.js';
import { stepCtx } from './step-dialog.js';
import { subCtx } from './sub-dialog.js';
import { hideToast, toast } from './toast.js';

/* ── Tài liệu của bước và bước con: link hoặc văn bản Markdown ──
 * Thêm, sửa, xoá trong hộp sửa bước / bước con (lưu ngay, không chờ nút Lưu của hộp ấy). Xoá có Hoàn tác: trong hộp
 * đang mở là một hàng "Đã xoá · Hoàn tác" (toast nằm dưới hộp thoại nên không bấm được), sau khi đóng hộp vẫn có toast. */

/** @typedef {{wsId:string, stepId:string, subId:string|null, docId:string|null}} DocCtx */
/** Bước hay bước con chứa tài liệu. @param {DocCtx} ctx */
export function docOwner(ctx) {
  const ws = findWs(ctx.wsId);
  /* Bước con tìm theo id ở mọi bước: tab khác có thể đã dời nó trong lúc hộp sửa đang mở. */
  if (ctx.subId) return ws?.steps.flatMap((/** @type {any} */ s) => s.subs).find((/** @type {any} */ x) => x.id === ctx.subId) || null;
  return stepOf(ws, ctx.stepId);
}
/** "Bước 2 · tên" hay "Bước con 2.3 · tên". @param {DocCtx} ctx */
export function docWhere(ctx) {
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
/** Mở hộp sửa khác: bỏ hàng "Deleted · Undo" của lần trước. */
export function clearDocUndo() {
  docUndo = null;
}

/** Danh sách tài liệu trong hộp sửa bước / bước con. @param {'sub'|'step'} where */
export function renderDocsEdit(where) {
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
    h('button', { type: 'button', class: 'proof-btn', 'data-doc-act': 'proof', 'aria-pressed': String(d.proof),
      title: d.proof ? 'Evidence for Done when. Click to unmark' : 'Mark as evidence for Done when (a run, report, test, commit)' }, icon('proof'), h('span', {}, 'Evidence')),
    h('button', { type: 'button', class: 'icon-btn', 'data-doc-act': 'del', 'aria-label': `Delete doc ${d.title}`, title: 'Delete doc' }, icon('trash')))) : [];
  if (docUndo && docUndo.where === where) {
    rows.push(h('li', { class: 'doc-row undo' }, h('span', {}, `Deleted "${docUndo.title}".`),
      h('button', { type: 'button', class: 'btn small', 'data-doc-act': 'undo' }, 'Undo')));
  }
  list.replaceChildren(...rows);
}
export function refreshDocLists() {
  if ($('dlg-sub').open) renderDocsEdit('sub');
  if ($('dlg-step').open) renderDocsEdit('step');
}
const openHost = () => (/** @type {'sub'|'step'|''} */ ($('dlg-sub').open ? 'sub' : $('dlg-step').open ? 'step' : ''));
/** Chỗ focus sau khi lưu tài liệu: hàng trong hộp sửa đang mở, hoặc tài liệu ở cột bước. @param {DocCtx} ctx @param {string} id */
export const docFocus = (ctx, id) => (openHost()
  ? `#${openHost()}-docs [data-doc="${id}"] [data-doc-act="open"] || #${openHost()}-docs [data-doc-add]`
  : `.step[data-step="${ctx.stepId}"] [data-doc="${id}"] || ${stepSel(ctx.stepId, 'edit-step')}`);

/** Xoá một tài liệu; Hoàn tác trả về đúng chỗ. @param {DocCtx} ctx */
export function deleteDoc(ctx) {
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

/** @param {DocCtx} ctx */
export function openDocNew(ctx) {
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

/** Gắn sự kiện, chạy một lần lúc khởi động (main.js gọi theo thứ tự). */
export function initDocs() {
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
      if (b.dataset.docAct === 'proof') {
        doc.proof = !doc.proof;
        commit();
        refreshDocLists();
        refocus(`#${where}-docs [data-doc="${id}"] [data-doc-act="proof"]`);
        return;
      }
      if (b.dataset.docAct === 'del') deleteDoc(c);
      else if (doc.kind === 'link') openLinkEdit(c, doc);
      else openMd(c);
    });
    $('dlg-' + where).addEventListener('close', () => { if (docUndo && docUndo.where === where) docUndo = null; });
  }

  $('doc-kind').addEventListener('change', paintDocKind);

  $('doc-form').addEventListener('submit', (/** @type {any} */ e) => {
    e.preventDefault();
    const f = $('doc-form');
    const ctx = docCtx;
    if (!ctx) return;
    const title = oneLine(field(f, 'title').value);
    if (docKind() === 'md' && !ctx.docId) {
      closeSaved($('dlg-doc'));
      openMd(ctx, title);
      return;
    }
    const url = safeUrl(field(f, 'url').value);
    if (!url) { field(f, 'url').setCustomValidity('The link must start with http:// or https://'); field(f, 'url').reportValidity(); return; }
    const owner = docOwner(ctx);
    closeSaved($('dlg-doc'));
    if (!owner) { toast('Not saved: the step was deleted elsewhere.'); return; }
    const old = ctx.docId ? owner.docs.find((/** @type {any} */ d) => d.id === ctx.docId) : null;
    const doc = normDoc({ id: old ? old.id : '', kind: 'link', title, url, proof: !!old?.proof });
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
}
