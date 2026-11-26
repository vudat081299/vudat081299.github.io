// @ts-check
/* Bàn giao (handoff) trên bảng: chip "In n" / "Out n" (cột tên bước), dải mũi tên trên bước nhận, ô mũi tên trước ô nhận, hộp danh
 * sách (#dlg-hand) có lối nhảy tới bên giao / bên nhận, phần Inputs / Outputs trong hộp sửa, hộp chọn đầu ra (#dlg-pick).
 * Logic thuần: core.js (handoffs, outIndex, consumersOf, insBackup). Chữ người dùng chỉ vào DOM qua text node. */
import * as C from './core.js';

/** @type {any} */ let deps = null;
const $ = (/** @type {string} */ id) => /** @type {any} */ (document.getElementById(id));
const quote = (/** @type {string} */ t) => `"${t}"`;

/** Hàm chung của main.js: h, icon, cur, findWs, labelsOf, openSub, openStep, unfilter, flashMs, focusField, showDlg. @param {any} d */
export function initHand(d) {
  deps = d;
  wireList();
  for (const where of /** @type {('sub'|'step')[]} */ (['sub', 'step'])) wireEdit(where);
  wirePick();
}

/* ── Trên bảng ── */

/** Số đầu vào còn trỏ tới một đầu ra (đầu vào treo, sau khi xoá bên giao, không đếm). @param {any} x @param {Map<string, any>} idx */
export const insCount = (x, idx) => x.ins.filter((/** @type {string} */ id) => idx.has(id)).length;

/** Chip "In n" / "Out n" của một bước (thẻ bước con không có chip: xem trong hộp sửa). Ngoài vòng Tab như nút phụ khác: bàn phím xem trong hộp sửa.
 * @param {any} x @param {number} insN */
export function tags(x, insN) {
  const { h, icon } = deps;
  const tag = (/** @type {string} */ act, /** @type {string} */ ic, /** @type {string} */ text, /** @type {string} */ label) =>
    h('button', { type: 'button', class: 'hand-tag', 'data-act': act, tabindex: '-1', 'aria-label': label, title: label }, icon(ic), text);
  return [
    insN > 0 && tag('hand-in', 'in', `In ${insN}`, `${C.plural(insN, 'input')}: where each comes from`),
    x.outs.length > 0 && tag('hand-out', 'out', `Out ${x.outs.length}`, `${C.plural(x.outs.length, 'output')}: path, contract, who uses it`),
  ];
}
/** Tên các đầu ra được chuyển, không trùng, theo thứ tự cặp. @param {C.Pair[]} pairs */
const outNames = (pairs) => [...new Set(pairs.flatMap((p) => p.outs.map((/** @type {any} */ o) => o.name)))];
/** Nút thông tin nằm giữa mũi tên: tên đầu ra đầu tiên, "+n" nếu còn; tên đủ ở aria-label, title.
 * @param {string} act @param {C.Pair[]} pairs @param {string} lead @param {Record<string, string>} [extra] */
function infoBtn(act, pairs, lead, extra = {}) {
  const { h, icon } = deps;
  const names = outNames(pairs);
  const label = `${lead}: ${names.join(', ')}. Show details`;
  return h('button', { type: 'button', class: 'hand-btn', 'data-act': act, tabindex: '-1', 'aria-label': label, title: label, ...extra },
    icon('info'), h('span', { class: 'hand-btn-name' }, names[0] || ''), names.length > 1 && h('span', { class: 'hand-btn-more' }, `+${names.length - 1}`));
}
/** Dải trên bước này: mũi tên nét đứt từ bước trên xuống, nút thông tin ở giữa (cặp từ mọi bước trước vào bước này).
 * @param {C.Pair[]} pairs */
export function rowMarker(pairs) {
  return deps.h('div', { class: 'hand-row' }, infoBtn('hand-row', pairs, 'Handoff into this step'));
}
/** Ô trống rộng bằng một thẻ trước ô k + 1: mũi tên nét đứt trái sang phải, nút thông tin ở giữa. @param {number} k @param {C.Pair[]} pairs */
export function gapItem(k, pairs) {
  return deps.h('li', { class: 'hand-gap' }, infoBtn('hand-gap', pairs, 'Handoff into the next column', { 'data-gap': String(k) }));
}

/** Tên trên nút giữa hai ô dài hơn chỗ của nó thì mờ dần ở đuôi (lớp .cut); CSS không tự biết chữ có tràn hay không.
 * Đọc hết rồi mới ghi; nút đang ẩn (đang kéo) giữ nguyên. Gọi sau mỗi lần vẽ bảng, khi đổi cỡ cửa sổ, khi font tải xong.
 * @param {ParentNode} [root] */
export function fadeGapNames(root = document) {
  const m = [...root.querySelectorAll('.hand-gap .hand-btn-name')].filter((el) => el.clientWidth > 0).map((el) => /** @type {[Element, boolean]} */ ([el, el.scrollWidth > el.clientWidth]));
  for (const [el, cut] of m) el.classList.toggle('cut', cut);
}

/** Bấm trên bảng: trả true nếu là việc của bàn giao. @param {string} act @param {any} b @param {any} step @param {any} sub */
export function boardAct(act, b, step, sub) {
  const ws = deps.cur();
  if (!ws || !step) return false;
  const hd = { h: sub || step, step, sub: sub || null, i: ws.steps.indexOf(step) };
  if (act === 'hand-in') showIns(ws, hd);
  else if (act === 'hand-out') showOuts(ws, hd);
  else if (act === 'hand-row') {
    const pairs = C.handoffs(ws).rows.get(hd.i) || [];
    const near = pairs.every((p) => p.from.i === hd.i - 1);
    showPairs(ws, pairs, near ? 'From the step above' : 'From earlier steps', `Into step ${quote(step.title)}`);
  } else if (act === 'hand-gap') {
    const k = Number(b.dataset.gap);
    showPairs(ws, C.handoffs(ws).gaps.get(step.id)?.get(k) || [], 'From earlier columns', `Step ${quote(step.title)} · into column ${k + 2}`);
  } else return false;
  return true;
}

/* ── Hộp danh sách (#dlg-hand) ── */

/** @type {WeakMap<Element, {targets: {stepId:string, subId:string|null}[]}>} */
const jumps = new WeakMap();
/** @type {null | {wsId:string, stepId:string, subId:string|null, which:'ins'|'outs'}} */
let listCtx = null;

/** "Tên" và dòng ngữ cảnh của một bên (bước con: bước chứa nó; bước: "Whole step"). @param {any} ws @param {C.Holder} hd */
function who(ws, hd) {
  const lb = deps.labelsOf(ws);
  const n = lb.get(hd.step.id) ?? '·';
  return hd.sub
    ? { title: hd.sub.title, ctx: `Step ${n} · ${hd.step.title}` + (lb.has(hd.sub.id) ? ` · card ${lb.get(hd.sub.id)}` : '') }
    : { title: hd.step.title, ctx: `Step ${n} · whole step` };
}
const target = (/** @type {C.Holder} */ hd) => ({ stepId: hd.step.id, subId: hd.sub ? hd.sub.id : null });
/** Nút nhảy tới một bên (hay một cặp: bên đầu là chỗ focus). @param {Element} el @param {C.Holder[]} hds */
function jumpBtn(el, hds) {
  jumps.set(el, { targets: hds.map(target) });
  return el;
}
/** Đường dẫn / link và hợp đồng của một đầu ra. Link chỉ khi http(s); đường dẫn file là chữ mono. @param {any} o */
function outDetail(o) {
  const { h, icon } = deps;
  const url = C.safeUrl(o.ref);
  return [
    o.ref && h('p', { class: 'hand-ref' }, url
      ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, icon('link'), h('span', {}, o.ref))
      : h('code', {}, o.ref)),
    o.note && h('p', { class: 'hand-note' }, h('span', { class: 'lbl' }, 'Contract '), o.note),
  ];
}
/** Nút một bên: tên đậm, ngữ cảnh mờ. @param {any} ws @param {C.Holder} hd @param {string} [pre] */
function whoBtn(ws, hd, pre = '', held = false) {
  const { h } = deps;
  const w = who(ws, hd);
  return jumpBtn(h('button', { type: 'button', class: 'hand-who' + (held ? ' held' : ''), title: 'Go to it on the board' },
    h('b', {}, pre && h('span', { class: 'lbl' }, pre), w.title), h('small', {}, w.ctx + (held ? ' · on hold' : ''))), [hd]);
}
/** Câu giải thích một đầu vào treo. @param {string} from tên bên giao */
const heldText = (from) => `On hold: ${quote(from)} now comes after this, so it cannot hand this over yet. Move one of them, or remove the input.`;
/** @param {string} kicker @param {string} title @param {string} where @param {any[]} items @param {typeof listCtx} ctx */
function openList(kicker, title, where, items, ctx) {
  listCtx = ctx;
  $('hand-kicker').textContent = kicker;
  $('dlg-hand-title').textContent = title;
  $('hand-where').textContent = where;
  $('hand-list').replaceChildren(...items);
  $('hand-edit').hidden = !ctx;
  if (ctx) $('hand-edit').textContent = ctx.subId ? 'Edit sub-step' : 'Edit step';
  deps.showDlg($('dlg-hand'));
}
const ctxOf = (/** @type {any} */ ws, /** @type {C.Holder} */ hd, /** @type {'ins'|'outs'} */ which) => ({ wsId: ws.id, stepId: hd.step.id, subId: hd.sub ? hd.sub.id : null, which });
/** Đầu vào của một bên: mỗi đầu vào, đường dẫn, hợp đồng, bên giao (nhảy tới). @param {any} ws @param {C.Holder} hd */
function showIns(ws, hd) {
  const { h, icon } = deps;
  const { idx, heldKeys } = C.handoffs(ws);
  const items = hd.h.ins.map((/** @type {string} */ id) => idx.get(id)).filter(Boolean).map((/** @type {any} */ src) => {
    const held = heldKeys.has(C.heldKey(hd.h.id, src.out.id));
    return h('li', { class: 'hand-item' },
      h('p', { class: 'hand-name' }, icon('in'), h('b', {}, src.out.name)), outDetail(src.out), whoBtn(ws, src, 'From ', held),
      held && h('p', { class: 'hand-held' }, heldText(C.holderTitle(src))));
  });
  const w = who(ws, hd);
  openList('Inputs', `Inputs of ${quote(w.title)}`, w.ctx, items, ctxOf(ws, hd, 'ins'));
}
/** Đầu ra của một bên: đường dẫn (link mở tab mới), hợp đồng, nơi dùng (nhảy tới). @param {any} ws @param {C.Holder} hd */
function showOuts(ws, hd) {
  const { h, icon } = deps;
  const { usedBy: used, heldKeys } = C.handoffs(ws);
  const items = hd.h.outs.map((/** @type {any} */ o) => {
    const by = used.get(o.id) || [];
    return h('li', { class: 'hand-item' },
      h('p', { class: 'hand-name' }, icon('out'), h('b', {}, o.name)), outDetail(o),
      h('div', { class: 'hand-used' }, h('span', { class: 'lbl' }, by.length ? 'Used by' : 'Not used yet'),
        by.map((x) => whoBtn(ws, x, '', heldKeys.has(C.heldKey(x.h.id, o.id))))));
  });
  const w = who(ws, hd);
  openList('Outputs', `Outputs of ${quote(w.title)}`, w.ctx, items, ctxOf(ws, hd, 'outs'));
}
/** Các cặp bên giao → bên nhận (vạch giữa hai hàng, nút giữa hai ô): chọn một dòng là tô cả hai. @param {any} ws @param {C.Pair[]} pairs @param {string} title @param {string} where */
function showPairs(ws, pairs, title, where) {
  const { h, icon } = deps;
  const items = pairs.map((p) => {
    const a = who(ws, p.from), b = who(ws, p.to);
    return h('li', { class: 'hand-item' },
      jumpBtn(h('button', { type: 'button', class: 'hand-pair', title: 'Show both on the board' },
        h('span', { class: 'hand-end' }, h('b', {}, a.title), h('small', {}, a.ctx)),
        h('span', { class: 'hand-arrow', 'aria-label': 'to' }, icon('hand-right')),
        h('span', { class: 'hand-end' }, h('b', {}, b.title), h('small', {}, b.ctx))), [p.to, p.from]),
      h('ul', { class: 'hand-outs' }, p.outs.map((o) => h('li', {}, h('p', { class: 'hand-name' }, icon('out'), h('b', {}, o.name)), outDetail(o)))));
  });
  openList('Handoff', `${title} · ${C.plural(pairs.length, 'link')}`, where, items, null);
}

let hiTimer = 0;
/** Tới bên giao / bên nhận trên bảng: bỏ lọc nếu nó đang bị ẩn, cuộn tới, focus tên bên đầu, tô cả hai một lúc.
 * @param {{stepId:string, subId:string|null}[]} targets */
export function jump(targets) {
  const sel = (/** @type {{stepId:string, subId:string|null}} */ t) => (t.subId ? `.card[data-sub="${t.subId}"]` : `.step[data-step="${t.stepId}"] > .step-head`);
  const find = () => targets.map((t) => /** @type {HTMLElement|null} */ (document.querySelector(sel(t))));
  let els = find();
  if (els.some((e) => !e)) { deps.unfilter(); els = find(); }
  const found = /** @type {HTMLElement[]} */ (els.filter(Boolean));
  if (!found.length) return;
  clearTimeout(hiTimer);
  document.querySelectorAll('.hand-hi').forEach((e) => e.classList.remove('hand-hi'));
  for (const e of found.slice(1)) e.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  found[0].scrollIntoView({ block: 'center', inline: 'nearest' });
  for (const e of found) e.classList.add('hand-hi');
  found[0].querySelector(targets[0].subId ? '[data-act="edit-sub"]' : '[data-act="edit-step"]')?.focus({ preventScroll: true });
  hiTimer = window.setTimeout(() => found.forEach((e) => e.classList.remove('hand-hi')), deps.flashMs());
}

function wireList() {
  $('hand-list').addEventListener('click', (/** @type {any} */ e) => {
    const b = e.target.closest('button');
    const j = b && jumps.get(b);
    if (!j) return;
    $('dlg-hand').close();
    jump(j.targets);
  });
  $('hand-edit').addEventListener('click', () => {
    const c = listCtx;
    $('dlg-hand').close();
    const ws = c && deps.findWs(c.wsId);
    const step = ws && ws.steps.find((/** @type {any} */ s) => s.id === c.stepId);
    if (!step) return;
    const sub = c.subId ? step.subs.find((/** @type {any} */ x) => x.id === c.subId) : null;
    if (c.subId && !sub) return;
    if (sub) deps.openSub(step, sub, { toHand: c.which }); else deps.openStep(step, undefined, { toHand: c.which });
  });
}

/* ── Phần Inputs / Outputs trong hộp sửa: bản nháp lưu cùng nút Save (ô ẩn `ins`, `outs` mang JSON, nên hỏi lại khi đóng
 * mà chưa lưu như các ô khác) ── */

/** id: bước / bước con đang sửa (rỗng khi thêm mới). @type {Record<'sub'|'step', {wsId:string, id:string, own:Set<string>, ins:string[], outs:any[]}>} */
const draft = { sub: { wsId: '', id: '', own: new Set(), ins: [], outs: [] }, step: { wsId: '', id: '', own: new Set(), ins: [], outs: [] } };
const sec = (/** @type {'sub'|'step'} */ where) => $(where + '-hand');
const form = (/** @type {'sub'|'step'} */ where) => $(where + '-form');

/** Ghi bản nháp vào ô ẩn của form. @param {'sub'|'step'} where */
function sync(where) {
  const f = form(where);
  f.elements.namedItem('ins').value = JSON.stringify(draft[where].ins);
  f.elements.namedItem('outs').value = JSON.stringify(draft[where].outs);
}
/** Đầu vào, đầu ra trong form (chuỗi JSON của ô ẩn → mảng). @param {any} f @returns {{ins:string[], outs:any[]}} */
export function readEdit(f) {
  const get = (/** @type {string} */ n) => { try { const v = JSON.parse(f.elements.namedItem(n).value || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  return { ins: get('ins'), outs: get('outs') };
}

/**
 * Mở hộp sửa: dựng phần Inputs / Outputs từ bản đã lưu (null: thêm mới). `owners`: bước / bước con mà đầu ra của nó không
 * được chọn làm đầu vào (chính nó; bước: cả các bước con của nó).
 * @param {'sub'|'step'} where @param {any} ws @param {any} holder @param {any[]} owners
 */
export function paintEdit(where, ws, holder, owners) {
  const idx = C.outIndex(ws);
  draft[where] = {
    wsId: ws.id,
    id: holder ? holder.id : '',
    own: new Set(owners.flatMap((o) => o.outs.map((/** @type {any} */ x) => x.id))),
    ins: holder ? holder.ins.filter((/** @type {string} */ id) => idx.has(id)) : [],
    outs: holder ? holder.outs.map((/** @type {any} */ o) => ({ ...o })) : [],
  };
  sync(where);
  paintIns(where);
  paintOuts(where);
}
/** Mở hộp sửa ở phần Inputs hay Outputs. @param {'sub'|'step'} where @param {'ins'|'outs'} which */
export function focusEdit(where, which) {
  const s = sec(where);
  const head = s.querySelector(which === 'ins' ? '[data-in-pick]' : '[data-out-add]');
  head.closest('.docs-edit-head').scrollIntoView({ block: 'start' });
  head.focus({ preventScroll: true });
}

/** Ứng viên làm đầu vào: mọi đầu ra trong dự án trừ của chính nó, theo thứ tự trên bảng. @param {'sub'|'step'} where */
function candidates(where) {
  const ws = deps.findWs(draft[where].wsId);
  return ws ? [...C.outIndex(ws).values()].filter((x) => !draft[where].own.has(x.out.id)) : [];
}

/** @param {'sub'|'step'} where */
function paintIns(where) {
  const { h, icon } = deps;
  const ws = deps.findWs(draft[where].wsId);
  const { idx, heldKeys } = ws ? C.handoffs(ws) : { idx: new Map(), heldKeys: new Set() };
  const s = sec(where);
  const items = draft[where].ins.map((id) => idx.get(id)).filter(Boolean).map((src) => {
    const held = heldKeys.has(C.heldKey(draft[where].id, src.out.id));
    return h('li', { class: 'in-chip' + (held ? ' held' : ''), 'data-in': src.out.id, title: held ? heldText(C.holderTitle(src)) : null },
    icon('in'), h('span', { class: 'in-text' }, h('b', {}, src.out.name),
      h('small', {}, `from ${C.holderTitle(src)}` + (held ? ' · on hold: it now comes after this' : ''))),
    h('button', { type: 'button', class: 'icon-btn', 'data-in-del': '', 'aria-label': `Remove input ${src.out.name}`, title: 'Remove input' }, icon('x')));
  });
  s.querySelector('[data-ins]').replaceChildren(...items);
  const none = !candidates(where).length;
  s.querySelector('[data-in-pick]').disabled = none;
  s.querySelector('[data-ins-note]').textContent = items.length ? ''
    : none ? 'No outputs to use yet: declare one under Outputs where it is made.'
      : 'None. Pick outputs that other steps or sub-steps declare.';
}
/** @param {'sub'|'step'} where */
function paintOuts(where) {
  const { h, icon } = deps;
  const ws = deps.findWs(draft[where].wsId);
  const { usedBy: used, heldKeys } = ws ? C.handoffs(ws) : { usedBy: new Map(), heldKeys: new Set() };
  const s = sec(where);
  const rows = draft[where].outs.map((o, k) => {
    const by = used.get(o.id) || [];
    const fld = (/** @type {string} */ key, /** @type {string} */ label, /** @type {Record<string, any>} */ attrs) =>
      h('label', { class: 'field' }, h('span', {}, label), h('input', { type: 'text', 'data-k': key, ...attrs }));
    const row = h('li', { class: 'out-row', 'data-out': o.id },
      h('div', { class: 'out-fields' },
        fld('name', 'Output name', { required: true, maxlength: '200', placeholder: 'E.g. matches.parquet, clean table, API' }),
        fld('ref', 'Path or link', { maxlength: '2000', placeholder: 'data/clean/matches.parquet or https://…' }),
        fld('note', 'Contract', { maxlength: '400', placeholder: 'Columns, keys, what both sides rely on, how to check' })),
      h('button', { type: 'button', class: 'icon-btn', 'data-out-del': '', 'aria-label': `Remove output ${o.name || k + 1}`, title: 'Remove output' }, icon('trash')),
      by.length > 0 && h('p', { class: 'out-used' }, h('span', { class: 'lbl' }, 'Used by '), by.map((x) => C.holderTitle(x) + (heldKeys.has(C.heldKey(x.h.id, o.id)) ? ' (on hold: it comes before this)' : '')).join(', ')));
    for (const key of ['name', 'ref', 'note']) /** @type {any} */ (row.querySelector(`[data-k="${key}"]`)).value = o[key];
    return row;
  });
  s.querySelector('[data-outs]').replaceChildren(...rows);
  s.querySelector('[data-outs-note]').textContent = rows.length ? ''
    : 'None. Name what this produces (file, table, model, API); add the path or link once it exists.';
}

/** @param {'sub'|'step'} where */
function wireEdit(where) {
  const s = sec(where);
  s.addEventListener('input', (/** @type {any} */ e) => {
    const k = e.target.dataset.k;
    const row = e.target.closest('[data-out]');
    const o = row && draft[where].outs.find((x) => x.id === row.dataset.out);
    if (!k || !o) return;
    o[k] = e.target.value;
    sync(where);
  });
  s.addEventListener('click', (/** @type {any} */ e) => {
    const t = e.target;
    if (t.closest('[data-out-add]')) {
      draft[where].outs.push({ id: C.uid('o'), name: '', ref: '', note: '' });
      sync(where);
      paintOuts(where);
      deps.focusField(s.querySelector('.out-row:last-child [data-k="name"]'));
    } else if (t.closest('[data-out-del]')) {
      const id = t.closest('[data-out]').dataset.out;
      draft[where].outs = draft[where].outs.filter((o) => o.id !== id);
      sync(where);
      paintOuts(where);
      s.querySelector('[data-out-add]').focus();
    } else if (t.closest('[data-in-del]')) {
      const id = t.closest('[data-in]').dataset.in;
      draft[where].ins = draft[where].ins.filter((x) => x !== id);
      sync(where);
      paintIns(where);
      s.querySelector('[data-in-pick]').focus();
    } else if (t.closest('[data-in-pick]')) openPick(where);
  });
}

/* ── Hộp chọn đầu ra (#dlg-pick): nhóm theo bước, mỗi đầu ra một ô chọn; chọn nhiều ── */

/** @type {'sub'|'step'} */
let pickFor = 'sub';
/** @param {'sub'|'step'} where */
function openPick(where) {
  const { h } = deps;
  pickFor = where;
  const ws = deps.findWs(draft[where].wsId);
  const chosen = new Set(draft[where].ins);
  const byStep = new Map();
  for (const c of candidates(where)) {
    if (!byStep.has(c.step)) byStep.set(c.step, []);
    byStep.get(c.step).push(c);
  }
  const lb = ws ? deps.labelsOf(ws) : new Map();
  const groups = [...byStep].map(([step, list]) => h('fieldset', { class: 'pick-group' },
    h('legend', {}, `Step ${lb.get(step.id) ?? '·'} · ${step.title}`),
    h('ul', { class: 'reset-list' }, list.map((/** @type {any} */ c) => h('li', {},
      h('label', { class: 'reset-item' },
        h('input', { type: 'checkbox', name: 'pick', value: c.out.id, checked: chosen.has(c.out.id) }),
        h('span', { class: 'reset-title' }, h('b', {}, c.out.name), h('small', {}, c.sub ? `${c.sub.title}` : 'Whole step'))))))));
  $('pick-groups').replaceChildren(...(groups.length ? groups : [h('p', { class: 'muted' }, 'No outputs declared yet.')]));
  $('pick-ok').disabled = !groups.length;
  deps.showDlg($('dlg-pick'));
}
function wirePick() {
  $('pick-form').addEventListener('submit', (/** @type {any} */ e) => {
    e.preventDefault();
    const picked = new Set([...$('pick-groups').querySelectorAll('input[name="pick"]:checked')].map((/** @type {any} */ c) => c.value));
    const where = pickFor;
    /* Giữ thứ tự đã có, thêm cái mới theo thứ tự trên bảng. */
    const keep = draft[where].ins.filter((id) => picked.has(id));
    draft[where].ins = [...keep, ...candidates(where).map((c) => c.out.id).filter((id) => picked.has(id) && !keep.includes(id))];
    $('dlg-pick').close();
    sync(where);
    paintIns(where);
    sec(where).querySelector('[data-in-pick]').focus();
  });
}

/* ── Mở lại bước: đầu ra của phần làm lại đang được nơi khác dùng ── */

/** Tên các bên nhận đầu ra của bước và các bước con được chọn làm lại. @param {any} ws @param {any} step @param {string[]} picked */
export function alsoCheck(ws, step, picked) {
  const owners = [step, ...step.subs.filter((/** @type {any} */ x) => picked.includes(x.id))];
  return C.consumersOf(ws, owners).map((hd) => (hd.sub ? `${quote(hd.sub.title)} in ${quote(hd.step.title)}` : `step ${quote(hd.step.title)}`));
}

/* ── Sắp xếp lại: đầu vào vừa bị treo ── */

/** Câu báo kèm toast dời: các liên kết vừa treo (không có trong `before`). @param {any} ws @param {Set<string>} before */
export function newlyHeld(ws, before) {
  const fresh = C.handoffs(ws).held.filter((l) => !before.has(C.heldKey(l.to.h.id, l.out.id)));
  if (!fresh.length) return '';
  const l = fresh[0];
  return ` · Input on hold: ${quote(C.holderTitle(l.to))} now comes before ${quote(C.holderTitle(l.from))}`
    + (fresh.length > 1 ? ` (+${fresh.length - 1} more)` : '') + '. Links kept; move back to reconnect.';
}
