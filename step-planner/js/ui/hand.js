// @ts-check
/* Bàn giao (handoff) trên bảng: chip "In n" / "Out n" (cột tên bước), dải mũi tên trên bước nhận, ô mũi tên trước ô nhận, hộp danh
 * sách (#dlg-hand) có lối nhảy tới bên giao / bên nhận, phần Inputs / Outputs trong hộp sửa, hộp chọn đầu ra (#dlg-pick).
 * Logic thuần: core/handoffs.js. Chữ người dùng chỉ vào DOM qua text node.
 * Xuất: initHand, tags, ioDots, rowMarker, gapItem, fadeGapNames, boardAct, jump, readEdit, paintEdit, focusEdit,
 *   repaintPlace, alsoCheck, newlyHeld.
 * Dùng: core/handoffs.js, core/io.js, core/model.js, ui/board.js, ui/dialogs.js, ui/dom.js, ui/filter.js, ui/move.js,
 *   ui/state.js, ui/step-dialog.js, ui/sub-dialog.js, ui/toast.js. */
import { consumersOf, handoffs, handoffsAt, heldInfoAt, heldKey, holderTitle, outIndex } from '../core/handoffs.js';
import { plural } from '../core/io.js';
import { safeUrl, uid } from '../core/model.js';
import { labelsOf } from './board.js';
import { focusField, showDlg } from './dialogs.js';
import { $, focusFirst, h, icon, quote } from './dom.js';
import { unfilter } from './filter.js';
import { flashMs } from './move.js';
import { cur, findWs } from './state.js';
import { openStep } from './step-dialog.js';
import { openSub } from './sub-dialog.js';
import { toast } from './toast.js';
/** @typedef {import('../core/handoffs.js').Holder} Holder */
/** @typedef {import('../core/handoffs.js').InWhy} InWhy */
/** @typedef {import('../core/handoffs.js').OutWhy} OutWhy */
/** @typedef {import('../core/handoffs.js').IoStatus} IoStatus */
/** @typedef {import('../core/handoffs.js').Pair} Pair */

/** Tên trong ngoặc kép, đủ chữ: nhãn và danh sách bàn giao nêu đủ tên (`quote` của ui/dom.js cắt ở 40 ký tự, cho toast).
 * @param {string} t */
const quoteFull = (t) => `"${t}"`;

/** Gắn sự kiện của hộp danh sách, phần Inputs / Outputs của hai hộp sửa, hộp chọn đầu ra; chạy một lần lúc khởi động. */
export function initHand() {
  wireList();
  for (const where of /** @type {('sub'|'step')[]} */ (['sub', 'step'])) wireEdit(where);
  wirePick();
}

/* ── Trên bảng ── */

/** Chip "In n" / "Out n" của một bước (thẻ bước con không có chip: xem trong hộp sửa). Ngoài vòng Tab như nút phụ khác: bàn phím xem trong hộp sửa.
 * n đếm mọi đầu vào, kể cả đầu vào treo và đầu vào mất nguồn (danh sách của chip nêu chúng). @param {any} x */
export function tags(x) {
  const insN = x.ins.length;
  const tag = (/** @type {string} */ act, /** @type {string} */ ic, /** @type {string} */ text, /** @type {string} */ label) =>
    h('button', { type: 'button', class: 'hand-tag', 'data-act': act, tabindex: '-1', 'aria-label': label, title: label }, icon(ic), text);
  return [
    insN > 0 && tag('hand-in', 'in', `In ${insN}`, `${plural(insN, 'input')}: where each comes from`),
    x.outs.length > 0 && tag('hand-out', 'out', `Out ${x.outs.length}`, `${plural(x.outs.length, 'output')}: path, contract, who uses it`),
  ];
}
/** Câu của một đầu vào lỗi; của bước con (chấm đầu bước) thì mở bằng tên bước con. @param {InWhy} w */
const inLine = (w) => (w.at ? `${quoteFull(w.at)}: ` : '') + (w.kind === 'missing' ? 'an input whose output was deleted'
  : `${quoteFull(w.name)} on hold: ${quoteFull(w.from)} ${w.par ? 'runs in parallel with' : 'now comes after'} ${w.at ? 'it' : 'this'}`);
/** "A, B, which now come before it": nơi dùng treo, theo lý do (đứng trước / cùng ô song song). @param {string[]} names @param {boolean} par */
const heldBy = (names, par) => `${names.map(quoteFull).join(', ')}, which ${par ? (names.length > 1 ? 'run' : 'runs') + ' in parallel with'
  : 'now ' + (names.length > 1 ? 'come' : 'comes') + ' before'} it`;
/** Câu của một đầu ra lỗi: không ai dùng, hay có nơi dùng treo (chỉ những nơi ấy, hay thêm nơi dùng khác còn nối); của bước con
 * (chấm đầu bước) thì mở bằng tên bước con. @param {OutWhy} w */
function outLine(w) {
  const at = w.at ? `${quoteFull(w.at)}: ` : '';
  if (w.kind === 'unused') return `${at}${quoteFull(w.name)} is not used by any later step`;
  const before = w.to.filter((t) => !w.par.includes(t));
  const parts = [before.length && heldBy(before, false), w.par.length && heldBy(w.par, true)].filter(Boolean);
  return `${at}${quoteFull(w.name)} is ${w.live ? '' : 'only '}used by ${parts.join(', and ')} (on hold)`;
}
const cap = (/** @type {string} */ t) => t.charAt(0).toUpperCase() + t.slice(1);
/** Chữ của chấm đầu ra: ổn kèm các đầu ra cuối chưa ai dùng; lỗi thì nêu từng đầu ra lỗi (của bước: cả của bước con). @param {IoStatus} s */
function outText(s) {
  if (s.out === 'none') return 'Output: none';
  if (s.out === 'ok') return `Output: OK${s.finals.length ? `. Final: ${s.finals.map(quoteFull).join(', ')}` : ''}`;
  return `Output: broken. ${s.outWhy.map(outLine).join('; ')}`;
}
/** Nhãn đọc được của hai chấm (tên, title): trạng thái và vì sao, không dựa vào màu. @param {IoStatus} s */
function ioLabels(s) {
  const input = s.in === 'none' ? 'Input: none'
    : s.in === 'ok' ? 'Input: OK' : `Input: broken. ${cap(s.inWhy.map(inLine).join('; '))}`;
  return { input, output: outText(s) };
}
/** Hai chấm đầu vào → đầu ra của một bước / bước con (trái: đầu vào, phải: đầu ra, mũi tên trang trí ở giữa). Không có cả
 * hai: không vẽ gì. @param {IoStatus|undefined} s */
export function ioDots(s) {
  if (!s || (s.in === 'none' && s.out === 'none')) return null;
  const { input, output } = ioLabels(s);
  const dot = (/** @type {string} */ side, /** @type {string} */ st, /** @type {string} */ label) =>
    h('span', { class: `io-dot ${side} ${st}`, role: 'img', 'aria-label': label, title: label });
  return h('span', { class: 'io', 'data-io-in': s.in, 'data-io-out': s.out, title: `${input}\n${output}` },
    dot('in', s.in, input), h('span', { class: 'io-arrow', 'aria-hidden': 'true' }), dot('out', s.out, output));
}
/** Tên các đầu ra được chuyển, không trùng, theo thứ tự cặp. @param {Pair[]} pairs */
const outNames = (pairs) => [...new Set(pairs.flatMap((p) => p.outs.map((/** @type {any} */ o) => o.name)))];
/** Nút thông tin nằm giữa mũi tên: tên đầu ra đầu tiên, "+n" nếu còn; tên đủ ở aria-label, title.
 * @param {string} act @param {Pair[]} pairs @param {string} lead @param {Record<string, string>} [extra] */
function infoBtn(act, pairs, lead, extra = {}) {
  const names = outNames(pairs);
  const label = `${lead}: ${names.join(', ')}. Show details`;
  return h('button', { type: 'button', class: 'hand-btn', 'data-act': act, tabindex: '-1', 'aria-label': label, title: label, ...extra },
    icon('info'), h('span', { class: 'hand-btn-name' }, names[0] || ''), names.length > 1 && h('span', { class: 'hand-btn-more' }, `+${names.length - 1}`));
}
/** Dải trên bước này: mũi tên nét đứt từ bước trên xuống, nút thông tin ở giữa (cặp từ mọi bước trước vào bước này).
 * @param {Pair[]} pairs */
export function rowMarker(pairs) {
  return h('div', { class: 'hand-row' }, infoBtn('hand-row', pairs, 'Handoff into this step'));
}
/** Ô trống rộng bằng một thẻ trước ô k + 1: mũi tên nét đứt trái sang phải, nút thông tin ở giữa. @param {number} k @param {Pair[]} pairs */
export function gapItem(k, pairs) {
  return h('li', { class: 'hand-gap' }, infoBtn('hand-gap', pairs, 'Handoff into the next column', { 'data-gap': String(k) }));
}

/** Tên trên nút giữa hai ô dài hơn chỗ của nó thì mờ dần ở đuôi (lớp .cut); CSS không tự biết chữ có tràn hay không.
 * Đọc hết rồi mới ghi; nút đang ẩn (đang kéo) giữ nguyên. Gọi sau mỗi lần vẽ bảng, khi đổi cỡ cửa sổ, khi font tải xong.
 * @param {ParentNode} [root] */
export function fadeGapNames(root = /** @type {ParentNode | ParentNode[]} */ (document)) {
  const m = (Array.isArray(root) ? root : [root]).flatMap((r) => [...r.querySelectorAll('.hand-gap .hand-btn-name')]).filter((el) => el.clientWidth > 0).map((el) => /** @type {[Element, boolean]} */ ([el, el.scrollWidth > el.clientWidth]));
  for (const [el, cut] of m) el.classList.toggle('cut', cut);
}

/** Bấm trên bảng: trả true nếu là việc của bàn giao. @param {string} act @param {any} b @param {any} step @param {any} sub */
export function boardAct(act, b, step, sub) {
  const ws = cur();
  if (!ws || !step) return false;
  const hd = { h: sub || step, step, sub: sub || null, i: ws.steps.indexOf(step) };
  if (act === 'hand-in') showIns(ws, hd);
  else if (act === 'hand-out') showOuts(ws, hd);
  else if (act === 'hand-row') {
    const pairs = handoffs(ws).rows.get(hd.i) || [];
    const near = pairs.every((p) => p.from.i === hd.i - 1);
    showPairs(ws, pairs, near ? 'From the step above' : 'From earlier steps', `Into step ${quoteFull(step.title)}`);
  } else if (act === 'hand-gap') {
    const k = Number(b.dataset.gap);
    showPairs(ws, handoffs(ws).gaps.get(step.id)?.get(k) || [], 'From earlier columns', `Step ${quoteFull(step.title)} · into column ${k + 2}`);
  } else return false;
  return true;
}

/* ── Hộp danh sách (#dlg-hand) ── */

/** Tên hiện thay cho đầu vào mất nguồn (bên giao đã xoá), ở hộp danh sách và hộp sửa. */
const GONE = 'Deleted output';
const goneText = 'Its output was deleted. Remove this input, or undo the delete.';
const selfText = 'This output is made inside this step, so it is not an input of the step. Remove it here.';

/** Nút nhảy → các bên cần tô; `scroll` false là không cuộn (dòng của danh sách cặp).
 * @type {WeakMap<Element, {targets: {stepId:string, subId:string|null}[], scroll: boolean}>} */
const jumps = new WeakMap();
/** @type {null | {wsId:string, stepId:string, subId:string|null, which:'ins'|'outs'}} */
let listCtx = null;

/** "Tên" và dòng ngữ cảnh của một bên (bước con: bước chứa nó; bước: "Whole step"). @param {any} ws @param {Holder} hd */
function who(ws, hd) {
  const lb = labelsOf(ws);
  const n = lb.get(hd.step.id) ?? '·';
  return hd.sub
    ? { title: hd.sub.title, ctx: `Step ${n} · ${hd.step.title}` + (lb.has(hd.sub.id) ? ` · card ${lb.get(hd.sub.id)}` : '') }
    : { title: hd.step.title, ctx: `Step ${n} · whole step` };
}
const target = (/** @type {Holder} */ hd) => ({ stepId: hd.step.id, subId: hd.sub ? hd.sub.id : null });
/** Nút nhảy tới một bên (hay một cặp: bên đầu là chỗ focus). @param {Element} el @param {Holder[]} hds @param {boolean} [scroll] */
function jumpBtn(el, hds, scroll = true) {
  jumps.set(el, { targets: hds.map(target), scroll });
  return el;
}
/** Đường dẫn / link và hợp đồng của một đầu ra. Link chỉ khi http(s); đường dẫn file là chữ mono. @param {any} o */
function outDetail(o) {
  const url = safeUrl(o.ref);
  return [
    o.ref && h('p', { class: 'hand-ref' }, url
      ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, icon('link'), h('span', {}, o.ref))
      : h('code', {}, o.ref)),
    o.note && h('p', { class: 'hand-note' }, h('span', { class: 'lbl' }, 'Contract '), o.note),
  ];
}
/** Dòng tên của một đầu ra trong danh sách; đầu ra cuối có nhãn "Final". @param {any} o @param {string} [ic] */
const outName = (o, ic = 'out') => h('p', { class: 'hand-name' }, icon(ic), h('b', {}, o.name),
  o.final && h('span', { class: 'final-tag', title: 'Final deliverable: no later step needs it' }, 'Final'));
/** Nút một bên: tên đậm, ngữ cảnh mờ. @param {any} ws @param {Holder} hd @param {string} [pre] */
function whoBtn(ws, hd, pre = '', held = false) {
  const w = who(ws, hd);
  return jumpBtn(h('button', { type: 'button', class: 'hand-who' + (held ? ' held' : ''), title: 'Go to it on the board' },
    h('b', {}, pre && h('span', { class: 'lbl' }, pre), w.title), h('small', {}, w.ctx + (held ? ' · on hold' : ''))), [hd]);
}
/** Câu giải thích một đầu vào treo. @param {string} from tên bên giao @param {boolean} [par] treo vì cùng ô song song */
const heldText = (from, par = false) => (par
  ? `On hold: ${quoteFull(from)} runs in parallel with this, so it cannot hand this over in time. Put one after the other, or remove the input.`
  : `On hold: ${quoteFull(from)} now comes after this, so it cannot hand this over yet. Move one of them, or remove the input.`);
/** @param {string} kicker @param {string} title @param {string} where @param {any[]} items @param {typeof listCtx} ctx */
function openList(kicker, title, where, items, ctx) {
  listCtx = ctx;
  $('hand-kicker').textContent = kicker;
  $('dlg-hand-title').textContent = title;
  $('hand-where').textContent = where;
  $('hand-list').replaceChildren(...items);
  $('hand-edit').hidden = !ctx;
  if (ctx) $('hand-edit').textContent = ctx.subId ? 'Edit sub-step' : 'Edit step';
  showDlg($('dlg-hand'));
}
const ctxOf = (/** @type {any} */ ws, /** @type {Holder} */ hd, /** @type {'ins'|'outs'} */ which) => ({ wsId: ws.id, stepId: hd.step.id, subId: hd.sub ? hd.sub.id : null, which });
/** Đầu vào của một bên: mỗi đầu vào, đường dẫn, hợp đồng, bên giao (nhảy tới). @param {any} ws @param {Holder} hd */
function showIns(ws, hd) {
  const { idx, heldKeys, parKeys } = handoffs(ws);
  const items = hd.h.ins.map((/** @type {string} */ id) => idx.get(id)).map((/** @type {any} */ src) => {
    if (!src) return h('li', { class: 'hand-item' }, h('p', { class: 'hand-name' }, icon('in'), h('b', {}, GONE)), h('p', { class: 'hand-gone' }, goneText));
    const held = heldKeys.has(heldKey(hd.h.id, src.out.id));
    return h('li', { class: 'hand-item' },
      outName(src.out, 'in'), outDetail(src.out), whoBtn(ws, src, 'From ', held),
      held && h('p', { class: 'hand-held' }, heldText(holderTitle(src), parKeys.has(heldKey(hd.h.id, src.out.id)))));
  });
  const w = who(ws, hd);
  openList('Inputs', `Inputs of ${quoteFull(w.title)}`, w.ctx, items, ctxOf(ws, hd, 'ins'));
}
/** Đầu ra của một bên: đường dẫn (link mở tab mới), hợp đồng, nơi dùng (nhảy tới). @param {any} ws @param {Holder} hd */
function showOuts(ws, hd) {
  const { usedBy: used, heldKeys } = handoffs(ws);
  const items = hd.h.outs.map((/** @type {any} */ o) => {
    const by = used.get(o.id) || [];
    return h('li', { class: 'hand-item' },
      outName(o), outDetail(o),
      h('div', { class: 'hand-used' }, h('span', { class: 'lbl' }, by.length ? 'Used by' : o.final ? 'Final deliverable, not needed later' : 'Not used yet'),
        by.map((x) => whoBtn(ws, x, '', heldKeys.has(heldKey(x.h.id, o.id))))));
  });
  const w = who(ws, hd);
  openList('Outputs', `Outputs of ${quoteFull(w.title)}`, w.ctx, items, ctxOf(ws, hd, 'outs'));
}
/** Các cặp bên giao → bên nhận (vạch giữa hai hàng, nút giữa hai ô): chọn một dòng là tô cả hai. @param {any} ws @param {Pair[]} pairs @param {string} title @param {string} where */
function showPairs(ws, pairs, title, where) {
  const items = pairs.map((p) => {
    const a = who(ws, p.from), b = who(ws, p.to);
    return h('li', { class: 'hand-item' },
      jumpBtn(h('button', { type: 'button', class: 'hand-pair', title: 'Show both on the board' },
        h('span', { class: 'hand-end' }, h('b', {}, a.title), h('small', {}, a.ctx)),
        h('span', { class: 'hand-arrow', 'aria-label': 'to' }, icon('hand-right')),
        h('span', { class: 'hand-end' }, h('b', {}, b.title), h('small', {}, b.ctx))), [p.to, p.from], false),
      h('ul', { class: 'hand-outs' }, p.outs.map((o) => h('li', {}, outName(o), outDetail(o)))));
  });
  openList('Handoff', `${title} · ${plural(pairs.length, 'link')}`, where, items, null);
}

let hiTimer = 0;
/** Tô các bên một lúc (--flash-dur). @param {HTMLElement[]} els */
function hilite(els) {
  clearTimeout(hiTimer);
  document.querySelectorAll('.hand-hi').forEach((e) => e.classList.remove('hand-hi'));
  for (const e of els) e.classList.add('hand-hi');
  hiTimer = window.setTimeout(() => els.forEach((e) => e.classList.remove('hand-hi')), flashMs());
}
/** Một bên nằm ngoài chỗ nhìn thấy (khung nhìn dưới thanh trên, và khung cuộn ngang của hàng thẻ) thì ở hướng nào; trong
 * tầm nhìn (dù chỉ một phần) thì ''. @param {HTMLElement} el */
function offSide(el) {
  const r = el.getBoundingClientRect();
  const top = document.querySelector('.bar')?.getBoundingClientRect().bottom ?? 0;
  let left = 0, right = document.documentElement.clientWidth;
  const sc = el.closest('.cards-scroll');
  if (sc) { const b = sc.getBoundingClientRect(); left = Math.max(left, b.left); right = Math.min(right, b.right); }
  return r.bottom <= top ? 'above' : r.top >= window.innerHeight ? 'below' : r.right <= left ? 'to the left' : r.left >= right ? 'to the right' : '';
}
/** Tên của một bên trên bảng (tên bước con, hay tên bước). @param {{stepId:string, subId:string|null}} t */
function targetTitle(t) {
  const step = cur()?.steps.find((/** @type {any} */ s) => s.id === t.stepId);
  const sub = t.subId ? step?.subs.find((/** @type {any} */ x) => x.id === t.subId) : null;
  return (t.subId ? sub?.title : step?.title) || '';
}
const actSel = (/** @type {{subId:string|null}} */ t) => (t.subId ? '[data-act="edit-sub"]' : '[data-act="edit-step"]');
/** Tới bên giao / bên nhận trên bảng: bỏ lọc nếu nó đang bị ẩn, cuộn tới, focus tên bên đầu, tô cả hai một lúc.
 * `scroll` false (dòng của danh sách cặp, hai bên đang ở trên bảng): không cuộn trang lẫn hàng thẻ, chỉ tô và focus; bên nào
 * nằm ngoài tầm nhìn thì toast nói nó ở hướng nào, nút "Show" mới cuộn tới (không bao giờ tự cuộn).
 * @param {{stepId:string, subId:string|null}[]} targets @param {{scroll?: boolean}} [opt] */
export function jump(targets, { scroll = true } = {}) {
  const sel = (/** @type {{stepId:string, subId:string|null}} */ t) => (t.subId ? `.card[data-sub="${t.subId}"]` : `.step[data-step="${t.stepId}"] > .step-head`);
  const find = () => targets.map((t) => /** @type {HTMLElement|null} */ (document.querySelector(sel(t))));
  let els = find();
  if (els.some((e) => !e)) { unfilter(); els = find(); }
  const found = /** @type {HTMLElement[]} */ (els.filter(Boolean));
  if (!found.length) return;
  if (scroll) {
    for (const e of found.slice(1)) e.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    found[0].scrollIntoView({ block: 'center', inline: 'nearest' });
  }
  hilite(found);
  found[0].querySelector(actSel(targets[0]))?.focus({ preventScroll: true });
  if (scroll) return;
  const off = targets.map((t, k) => ({ t, el: els[k], side: els[k] ? offSide(/** @type {HTMLElement} */ (els[k])) : '' })).filter((o) => o.side);
  if (!off.length) return;
  const text = (off.length > 1 && off[0].side === off[1].side ? `${off.map((o) => quoteFull(targetTitle(o.t))).join(' and ')} are ${off[0].side}`
    : off.map((o) => `${quoteFull(targetTitle(o.t))} is ${o.side}`).join(' and ')) + ', off screen';
  const first = off[0];
  toast(text, () => {
    const el = /** @type {HTMLElement|null} */ (document.querySelector(sel(first.t)));
    if (!el) return;
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    hilite([el]);
    el.querySelector(actSel(first.t))?.focus({ preventScroll: true });
  }, '', false, 'Show');
}

function wireList() {
  $('hand-list').addEventListener('click', (/** @type {any} */ e) => {
    const b = e.target.closest('button');
    const j = b && jumps.get(b);
    if (!j) return;
    $('dlg-hand').close();
    jump(j.targets, { scroll: j.scroll });
  });
  $('hand-edit').addEventListener('click', () => {
    const c = listCtx;
    $('dlg-hand').close();
    const ws = c && findWs(c.wsId);
    const step = ws && ws.steps.find((/** @type {any} */ s) => s.id === c.stepId);
    if (!step) return;
    const sub = c.subId ? step.subs.find((/** @type {any} */ x) => x.id === c.subId) : null;
    if (c.subId && !sub) return;
    if (sub) openSub(step, sub, { toHand: c.which }); else openStep(step, undefined, { toHand: c.which });
  });
}

/* ── Phần Inputs / Outputs trong hộp sửa: bản nháp lưu cùng nút Save (ô ẩn `ins`, `outs` mang JSON, nên hỏi lại khi đóng
 * mà chưa lưu như các ô khác) ── */

/** id: bước / bước con đang sửa (rỗng khi thêm mới). place: chỗ đang chọn trong hộp (ô Bước / Vị trí), null = giữ chỗ cũ
 * (heldAt). @type {Record<'sub'|'step', {wsId:string, id:string, own:Set<string>, ins:string[], outs:any[], place:() => any}>} */
const draft = { sub: { wsId: '', id: '', own: new Set(), ins: [], outs: [], place: () => null }, step: { wsId: '', id: '', own: new Set(), ins: [], outs: [], place: () => null } };
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
 * được chọn làm đầu vào (chính nó; bước: cả các bước con của nó). `place`: chỗ đang chọn trong hộp (xem `draft`); đầu vào treo
 * tính theo chỗ ấy, không theo chỗ đã lưu.
 * @param {'sub'|'step'} where @param {any} ws @param {any} holder @param {any[]} owners @param {() => any} place
 */
export function paintEdit(where, ws, holder, owners, place) {
  draft[where] = {
    place,
    wsId: ws.id,
    id: holder ? holder.id : '',
    own: new Set(owners.flatMap((o) => o.outs.map((/** @type {any} */ x) => x.id))),
    ins: holder ? [...holder.ins] : [], // kể cả đầu vào mất nguồn: hiện chip "Deleted output" để gỡ
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
  (head.disabled ? s.querySelector('[data-out-add]') : head).focus({ preventScroll: true });
}

/** Ô Bước / Vị trí của hộp đổi: tính lại dấu "on hold" của đầu vào, của nơi dùng đầu ra. @param {'sub'|'step'} where */
export function repaintPlace(where) {
  paintIns(where);
  paintOuts(where);
}
/** Các đầu ra trong `ids` sẽ treo nếu mục đang sửa đứng ở chỗ đang chọn (par: treo vì cùng ô song song).
 * @param {'sub'|'step'} where @param {any} ws @param {string[]} ids */
const heldInfoNow = (where, ws, ids) => (ws ? heldInfoAt(ws, where, draft[where].id, ids, draft[where].place()) : { held: new Set(), par: new Set() });

/** Ứng viên làm đầu vào: mọi đầu ra trong dự án trừ của chính nó, theo thứ tự trên bảng. @param {'sub'|'step'} where */
function candidates(where) {
  const ws = findWs(draft[where].wsId);
  return ws ? [...outIndex(ws).values()].filter((x) => !draft[where].own.has(x.out.id)) : [];
}

/** @param {'sub'|'step'} where */
function paintIns(where) {
  const ws = findWs(draft[where].wsId);
  const idx = ws ? outIndex(ws) : new Map();
  const { held, par } = heldInfoNow(where, ws, draft[where].ins);
  const s = sec(where);
  const items = draft[where].ins.map((id) => [id, idx.get(id)]).map(([id, src]) => {
    if (!src) return h('li', { class: 'in-chip gone', 'data-in': id, title: goneText },
      icon('in'), h('span', { class: 'in-text' }, h('b', {}, GONE), h('small', {}, 'its source no longer exists')),
      h('button', { type: 'button', class: 'icon-btn', 'data-in-del': '', 'aria-label': `Remove input (${GONE.toLowerCase()})`, title: 'Remove input' }, icon('x')));
    /* Đầu ra của chính nó hay của bước con của nó (bước con được dời vào bước sau khi đã nối): không chọn được, chỉ gỡ. */
    if (draft[where].own.has(id)) return h('li', { class: 'in-chip gone', 'data-in': id, title: selfText },
      icon('in'), h('span', { class: 'in-text' }, h('b', {}, src.out.name), h('small', {}, `from ${holderTitle(src)} · inside this step, not an input`)),
      h('button', { type: 'button', class: 'icon-btn', 'data-in-del': '', 'aria-label': `Remove input ${src.out.name}`, title: 'Remove input' }, icon('x')));
    const on = held.has(src.out.id), p = par.has(src.out.id);
    return h('li', { class: 'in-chip' + (on ? ' held' : ''), 'data-in': src.out.id, title: on ? heldText(holderTitle(src), p) : null },
    icon('in'), h('span', { class: 'in-text' }, h('b', {}, src.out.name),
      h('small', {}, `from ${holderTitle(src)}` + (p ? ' · on hold: it runs in parallel with this' : on ? ' · on hold: it now comes after this' : ''))),
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
  const ws = findWs(draft[where].wsId);
  const used = ws ? handoffs(ws).usedBy : new Map();
  const at = ws ? handoffsAt(ws, where, draft[where].id, draft[where].place()) : null;
  const heldKeys = at ? at.heldKeys : new Set(), parKeys = at ? at.parKeys : new Set();
  /** @param {any} x @param {string} id */
  const onHold = (x, id) => { const k = heldKey(x.h.id, id); return parKeys.has(k) ? ' (on hold: runs in parallel with this)' : heldKeys.has(k) ? ' (on hold: it comes before this)' : ''; };
  const s = sec(where);
  const rows = draft[where].outs.map((o, k) => {
    const by = used.get(o.id) || [];
    const fld = (/** @type {string} */ key, /** @type {string} */ label, /** @type {Record<string, any>} */ attrs) =>
      h('label', { class: 'field' }, h('span', {}, label), h('input', { type: 'text', 'data-k': key, ...attrs }));
    const row = h('li', { class: 'out-row', 'data-out': o.id },
      h('div', { class: 'out-fields' },
        fld('name', 'Output name', { required: true, maxlength: '200', placeholder: 'E.g. matches.parquet, clean table, API' }),
        fld('ref', 'Path or link', { maxlength: '2000', placeholder: 'data/clean/matches.parquet or https://…' }),
        fld('note', 'Contract', { maxlength: '400', placeholder: 'Columns, keys, what both sides rely on, how to check' }),
        h('label', { class: 'out-final' }, h('input', { type: 'checkbox', 'data-k': 'final' }),
          h('span', {}, 'Final deliverable', h('small', {}, 'No later step needs it, so unused is OK')))),
      h('button', { type: 'button', class: 'icon-btn', 'data-out-del': '', 'aria-label': `Remove output ${o.name || k + 1}`, title: 'Remove output' }, icon('trash')),
      by.length > 0 && h('p', { class: 'out-used' }, h('span', { class: 'lbl' }, 'Used by '), by.map((x) => holderTitle(x) + onHold(x, o.id)).join(', ')));
    for (const key of ['name', 'ref', 'note']) /** @type {any} */ (row.querySelector(`[data-k="${key}"]`)).value = o[key];
    /** @type {any} */ (row.querySelector('[data-k="final"]')).checked = !!o.final;
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
    o[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    sync(where);
  });
  s.addEventListener('click', (/** @type {any} */ e) => {
    const t = e.target;
    if (t.closest('[data-out-add]')) {
      draft[where].outs.push({ id: uid('o'), name: '', ref: '', note: '', final: false });
      sync(where);
      paintOuts(where);
      focusField(s.querySelector('.out-row:last-child [data-k="name"]'));
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
      focusFirst(s.querySelector('[data-in-pick]'), s.querySelector('[data-in-del]'), s.querySelector('[data-out-add]'));
    } else if (t.closest('[data-in-pick]')) openPick(where);
  });
}

/* ── Hộp chọn đầu ra (#dlg-pick): nhóm theo bước, mỗi đầu ra một ô chọn; chọn nhiều ── */

/** @type {'sub'|'step'} */
let pickFor = 'sub';
/** @param {'sub'|'step'} where */
function openPick(where) {
  pickFor = where;
  const ws = findWs(draft[where].wsId);
  const chosen = new Set(draft[where].ins);
  const byStep = new Map();
  const cands = candidates(where);
  const later = heldInfoNow(where, ws, cands.map((c) => c.out.id));
  for (const c of cands) {
    if (!byStep.has(c.step)) byStep.set(c.step, []);
    byStep.get(c.step).push(c);
  }
  const lb = ws ? labelsOf(ws) : new Map();
  const groups = [...byStep].map(([step, list]) => h('fieldset', { class: 'pick-group' },
    h('legend', {}, `Step ${lb.get(step.id) ?? '·'} · ${step.title}`),
    h('ul', { class: 'reset-list' }, list.map((/** @type {any} */ c) => h('li', {},
      h('label', { class: 'reset-item' },
        h('input', { type: 'checkbox', name: 'pick', value: c.out.id, checked: chosen.has(c.out.id) }),
        h('span', { class: 'reset-title' }, h('b', {}, c.out.name),
          h('small', {}, (c.sub ? c.sub.title : 'Whole step') + (later.par.has(c.out.id) ? ' (runs in parallel — will be on hold)'
            : later.held.has(c.out.id) ? ' (comes after this — will be on hold)' : '')))))))));
  $('pick-groups').replaceChildren(...(groups.length ? groups : [h('p', { class: 'muted' }, 'No outputs declared yet.')]));
  $('pick-ok').disabled = !groups.length;
  showDlg($('dlg-pick'));
}
function wirePick() {
  $('pick-form').addEventListener('submit', (/** @type {any} */ e) => {
    e.preventDefault();
    const picked = new Set([...$('pick-groups').querySelectorAll('input[name="pick"]:checked')].map((/** @type {any} */ c) => c.value));
    const where = pickFor;
    /* Giữ thứ tự đã có (đầu vào mất nguồn không có ô chọn: giữ), thêm cái mới theo thứ tự trên bảng. */
    const offered = new Set(candidates(where).map((c) => c.out.id));
    const keep = draft[where].ins.filter((id) => picked.has(id) || !offered.has(id));
    draft[where].ins = [...keep, ...candidates(where).map((c) => c.out.id).filter((id) => picked.has(id) && !keep.includes(id))];
    $('dlg-pick').close();
    sync(where);
    paintIns(where);
    focusFirst(sec(where).querySelector('[data-in-pick]'), sec(where).querySelector('[data-out-add]'));
  });
}

/* ── Mở lại bước: đầu ra của phần làm lại đang được nơi khác dùng ── */

/** Tên các bên nhận đầu ra của bước và các bước con được chọn làm lại. @param {any} ws @param {any} step @param {string[]} picked */
export function alsoCheck(ws, step, picked) {
  const owners = [step, ...step.subs.filter((/** @type {any} */ x) => picked.includes(x.id))];
  return consumersOf(ws, owners).map((hd) => (hd.sub ? `${quoteFull(hd.sub.title)} in ${quoteFull(hd.step.title)}` : `step ${quoteFull(hd.step.title)}`));
}

/* ── Sắp xếp lại: đầu vào vừa bị treo ── */

/** Câu báo kèm toast dời, toast Lưu của hộp sửa: các liên kết vừa treo (không có trong `before`). Tên cắt như mọi toast;
 * cái vừa dời (`self`) gọi là "it", không lặp lại tên.
 * @param {any} ws @param {Set<string>} before @param {string} [tail] @param {string} [self] */
export function newlyHeld(ws, before, tail = 'Links kept; move back to reconnect.', self = '') {
  const { held, parKeys } = handoffs(ws);
  const fresh = held.filter((l) => !before.has(heldKey(l.to.h.id, l.out.id)));
  if (!fresh.length) return '';
  const l = fresh[0];
  const rel = parKeys.has(heldKey(l.to.h.id, l.out.id)) ? 'runs in parallel with' : 'now comes before';
  const name = (/** @type {any} */ hd) => (hd.h.id === self ? 'it' : quote(holderTitle(hd)));
  return ` · Input on hold: ${name(l.to)} ${rel} ${name(l.from)}`
    + (fresh.length > 1 ? ` (+${fresh.length - 1} more)` : '') + '. ' + tail;
}
