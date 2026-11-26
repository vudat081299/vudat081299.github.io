// @ts-check
/* Bảng vẽ theo hàng (renderBoard): mỗi hàng một khoá tóm mọi thứ nó hiện; khoá không đổi thì giữ nút DOM, đổi thì dựng
   lại riêng hàng ấy; dời ít nút nhất (giữ dãy con tăng dài nhất). Số đứng yên trong phiên (PLAN-014): labelsOf, numTag,
   nút Renumber; nhập thay nội dung thì chụp số lại (resetBoard).
   Xuất: renderBoard, resetBoard, labelsOf, numTag, initBoard.
   Dùng: core/board.js, core/handoffs.js, core/io.js, core/model.js, ui/clamp.js, ui/dom.js, ui/hand.js, ui/log.js,
     ui/render.js, ui/state.js, ui/step-row.js, ui/store.js, ui/toast.js. */
import * as S from './store.js';
import { fold, inGroup, liveLabels, projectNextIds } from '../core/board.js';
import { handoffs, ioStatus } from '../core/handoffs.js';
import { plural } from '../core/io.js';
import { today } from '../core/model.js';
import { boxKey, cutBoxes, markCut, openKeys, updateScrollCues } from './clamp.js';
import { $, h } from './dom.js';
import { fadeGapNames } from './hand.js';
import { lastReopened } from './log.js';
import { render } from './render.js';
import { cur, refocus, ui } from './state.js';
import { stepRow } from './step-row.js';
import { toast } from './toast.js';

/* Bảng vẽ theo hàng: mỗi hàng (bước) mang một khoá tóm mọi thứ nó hiện (dữ liệu bước, số, thẻ "Next", lọc, hôm nay). Khoá
 * không đổi thì giữ nguyên nút DOM của hàng (ghi chú đang mở, thẻ đã "Show more", chỗ cuộn ngang, focus đi theo nút); đổi
 * thì dựng lại riêng hàng ấy. Thứ có thể đổi mà không đổi khoá (vị trí hàng, Compact) được vá riêng. */
/** @type {WeakMap<Element, string>} */
const rowKeys = new WeakMap();
let boardWsId = '';

/** @param {any} ws @param {{full?:boolean}} [opt] full: bỏ mọi hàng cũ, dựng lại cả bảng */
export function renderBoard(ws, opt = {}) {
  const board = $('board');
  const q = fold(ui.q.trim());
  const st = ui.st;
  const filtering = !!q || !!st;
  const todayStr = today();
  const nextIds = new Set(projectNextIds(ws));
  const labels = labelsOf(ws);
  const compact = S.compactOn();
  const reuse = !opt.full && boardWsId === ws.id;
  boardWsId = ws.id;
  /** @type {Map<string, HTMLElement>} */
  const old = new Map();
  for (const row of /** @type {NodeListOf<HTMLElement>} */ (board.querySelectorAll(':scope > .step[data-step]'))) old.set(/** @type {string} */ (row.dataset.step), row);
  const docTitles = (/** @type {any[]} */ docs) => docs.map((d) => d.title).join(' ');
  const outText = (/** @type {any[]} */ outs) => outs.map((o) => `${o.name} ${o.ref}`).join(' ');
  /* Bàn giao: chip "In n" đếm đầu vào còn trỏ tới đầu ra (đọc cả hàng khác), vạch trên hàng đếm cặp từ hàng trên: vào khoá. */
  const hand = handoffs(ws);
  /* Hai chấm đầu vào / đầu ra đọc liên kết ở hàng khác (treo, không ai dùng): trạng thái của bước và các bước con vào khoá. */
  const io = ioStatus(ws, hand);
  /* 1. Dữ liệu: hàng nào hiện, khoá của nó, dùng lại được hàng cũ không. Chưa đọc, chưa ghi DOM. */
  const plan = [];
  /** Ngày mở lại cuối của bước đã đóng vòng (chú thích nhãn "Iteration N"); nằm trong khoá hàng vì nó đọc nhật ký. */
  const reopenedOn = new Map();
  let shown = 0;
  ws.steps.forEach((/** @type {any} */ step, /** @type {number} */ i) => {
    const stepHit = !!q && foldOf(step, () => [step.title, step.goal, step.doneWhen, step.notes, step.revisit?.reason, docTitles(step.docs), outText(step.outs)]).includes(q);
    const visible = step.subs.filter((/** @type {any} */ x) => inGroup(st, x.status)
      && (!q || stepHit || foldOf(x, () => [x.title, x.doneWhen, x.notes, x.reason, docTitles(x.docs), outText(x.outs)]).includes(q)));
    if (filtering && !visible.length && !(stepHit && !st)) return;
    shown += visible.length;
    if (!step.revisit && step.round > 1) reopenedOn.set(step.id, lastReopened(ws, step));
    const key = JSON.stringify([step, filtering ? visible.map((/** @type {any} */ x) => x.id) : null,
      labels.get(step.id) ?? null, step.subs.map((/** @type {any} */ x) => [labels.get(x.id) ?? null, nextIds.has(x.id)]), todayStr,
      reopenedOn.get(step.id) ?? null, handSig(hand.rows.get(i)), [...(hand.gaps.get(step.id) || [])].map(([k, ps]) => [k, handSig(ps)]),
      [step, ...step.subs].map((/** @type {any} */ x) => io.get(x.id))]);
    const prev = old.get(step.id);
    plan.push({ step, i, visible, key, row: reuse && prev && rowKeys.get(prev) === key ? prev : null, prev });
  });
  /* 2. Đọc trạng thái người dùng đang xem của các hàng sắp dựng lại hay sắp dời chỗ (dời nút DOM làm mất chỗ cuộn ngang). */
  const kids = [...board.children];
  const moved = movedNodes(kids, plan.map((p) => p.row));
  const keep = { notes: new Set(), open: new Set(), left: new Map() };
  for (const p of plan) {
    if (p.row && !moved.has(p.row)) continue;
    const src = p.row || p.prev;
    if (!src) continue;
    if (!p.row && src.querySelector('.step-notes')?.open) keep.notes.add(p.step.id);
    if (!p.row) for (const c of /** @type {NodeListOf<HTMLElement>} */ (src.querySelectorAll('.card.open[data-sub], .step-head.open'))) keep.open.add(boxKey(c));
    const sc = src.querySelector('.cards-scroll');
    if (sc && sc.scrollLeft) keep.left.set(p.step.id, sc.scrollLeft);
  }
  /* 3. Ghi: dựng hàng mới, xếp lại con của bảng (chỉ dời các hàng lệch chỗ), vá phần theo vị trí. */
  board.classList.toggle('filtering', filtering);
  const compactChanged = board.classList.contains('compact') !== compact;
  board.classList.toggle('compact', compact);
  $('compact-btn').setAttribute('aria-pressed', String(compact));
  const ctx = { filtering, todayStr, nextIds, labels, keep, reopenedOn, hand, io };
  /** @type {HTMLElement[]} */
  const fresh = [];
  const nodes = plan.map((p) => {
    if (p.row) return p.row;
    const row = stepRow(p.step, p.i, p.visible, ctx);
    rowKeys.set(row, p.key);
    fresh.push(row);
    return row;
  });
  if (!ws.steps.length) nodes.push(h('p', { class: 'empty' }, 'No steps yet. Click "Add step" below.'));
  else if (!plan.length) nodes.push(h('p', { class: 'empty' }, 'No sub-step matches. ',
    h('button', { type: 'button', class: 'btn', 'data-act': 'clear-filter' }, st ? 'Clear filters' : 'Clear search')));
  placeChildren(board, nodes, moved);
  for (const p of plan) if (p.row) patchRowIndex(p.row, p.i);
  $('renumber-btn').hidden = !labelsStale(ws);
  $('filter-note').textContent = filtering ? `${plural(shown, 'sub-step')} match · reordering is off while ${q ? 'searching' : 'filtering'}` : '';
  $('add-step').hidden = filtering;
  /* 4. Đo: thẻ của hàng mới (Compact vừa đổi: mọi thẻ) — một lần dàn trang cho cả lượt. */
  if (compactChanged) markCut(cutBoxes(nodes), new Set([...keep.open, ...openKeys(cutBoxes(nodes))]));
  else markCut(cutBoxes(fresh), keep.open);
  const scrolls = [];
  for (const [id, left] of keep.left) {
    const sc = board.querySelector(`.step[data-step="${id}"] .cards-scroll`);
    if (sc) { sc.scrollLeft = left; scrolls.push(sc); }
  }
  updateScrollCues([...fresh.map((r) => r.querySelector('.cards-scroll')), ...scrolls]);
  fadeGapNames(compactChanged ? nodes : fresh);
}

/** Chữ đã bỏ dấu để tìm, nhớ theo đối tượng; nguồn đổi thì tính lại. @type {WeakMap<object, {src:string, folded:string}>} */
const folds = new WeakMap();
/** @param {object} o @param {() => any[]} parts */
function foldOf(o, parts) {
  const src = parts().join(' ');
  const c = folds.get(o);
  if (c && c.src === src) return c.folded;
  const folded = fold(src);
  folds.set(o, { src, folded });
  return folded;
}

/** Các nút cũ phải dời chỗ để con của `parent` theo đúng thứ tự `want`: mọi nút cũ trừ dãy con tăng dài nhất (giữ đứng
 * yên). Dời một nút DOM làm trình duyệt dàn lại cả nút ấy, nên dời càng ít càng tốt. @param {Element[]} kids @param {(Element|null)[]} want */
function movedNodes(kids, want) {
  const pos = new Map(kids.map((c, i) => [c, i]));
  const seq = want.filter((n) => n && pos.has(n)).map((n) => /** @type {Element} */ (n));
  const len = seq.map(() => 1), prev = seq.map(() => -1);
  for (let i = 0; i < seq.length; i++) {
    for (let j = 0; j < i; j++) {
      if (/** @type {number} */ (pos.get(seq[j])) < /** @type {number} */ (pos.get(seq[i])) && len[j] + 1 > len[i]) { len[i] = len[j] + 1; prev[i] = j; }
    }
  }
  const stay = new Set();
  let k = len.indexOf(Math.max(0, ...len));
  while (k >= 0) { stay.add(seq[k]); k = prev[k]; }
  return new Set(seq.filter((n) => !stay.has(n)));
}
/** Con của `parent` thành đúng `nodes`: bỏ nút thừa, chèn nút mới và nút trong `moved`, các nút khác đứng yên.
 * @param {Element} parent @param {Element[]} nodes @param {Set<Element>} moved */
function placeChildren(parent, nodes, moved) {
  const want = new Set(nodes);
  for (const c of [...parent.children]) if (!want.has(c)) c.remove();
  let next = null;
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (n.parentNode !== parent || moved.has(n)) parent.insertBefore(n, next);
    next = n;
  }
}
/** Phần của hàng phụ thuộc chỉ số của bước (vạch chia "Add step", nhãn dải tài liệu): vá khi hàng dùng lại đổi chỗ.
 * @param {HTMLElement} row @param {number} i */
function patchRowIndex(row, i) {
  const set = (/** @type {Element|null} */ el, /** @type {string} */ k, /** @type {string} */ v) => { if (el && el.getAttribute(k) !== v) el.setAttribute(k, v); };
  const btn = row.querySelector(':scope > .gap-add > .gap-add-btn');
  set(btn, 'data-at', String(i));
  set(btn, 'aria-label', `Add a step before step ${i + 1}`);
  set(btn, 'title', `Add a step here (before step ${i + 1})`);
  set(row.querySelector(':scope > .step-docs .doc-chips'), 'aria-label', `Docs of step ${i + 1}`);
}

/** Dấu của vạch / nút bàn giao trong khoá hàng: bên giao, bên nhận, tên đầu ra (tên đổi ở hàng khác cũng vẽ lại). @param {any[]} [pairs] */
const handSig = (pairs) => (pairs || []).map((p) => [p.from.h.id, p.to.h.id, p.outs.map((/** @type {any} */ o) => o.name)]);

/* ── Số đứng yên trong phiên: chụp số của mọi bước, bước con khi dự án hiện lần đầu trong lần mở trang này (và sau khi nhập
 * thay nội dung). Dời chỗ không đổi số, nên hàng đọc được "1 3 2" và người dùng thấy vừa đổi chỗ những gì; tải lại trang
 * hay bấm "Renumber" mới đánh số lại. Cái thêm trong phiên chưa có số: hiện dấu chấm "added this session". ── */
/** @type {Map<string, Map<string, string>>} */
const frozen = new Map();
/** Nhập thay nội dung dự án: chụp số lại, lần vẽ sau dựng lại cả bảng. @param {string} wsId */
export function resetBoard(wsId) {
  frozen.delete(wsId);
  boardWsId = '';
}
/** @param {any} ws @returns {Map<string, string>} */
export function labelsOf(ws) {
  let m = frozen.get(ws.id);
  if (!m) { m = liveLabels(ws); frozen.set(ws.id, m); }
  return m;
}
/** Số đang hiện khác số thật (đã dời, thêm, xoá)? @param {any} ws */
function labelsStale(ws) {
  const m = labelsOf(ws);
  const live = liveLabels(ws);
  return [...live].some(([id, l]) => m.get(id) !== l);
}
/** @param {string} cls @param {string|undefined} label */
export const numTag = (cls, label) => (label != null
  ? h('span', { class: cls, 'aria-hidden': cls === 'step-num' ? 'true' : null }, label)
  : h('span', { class: cls + ' fresh', title: 'Added this session. Renumber (or reload) to number it' }, h('span', { class: 'sr' }, 'added this session')));

/** Gắn sự kiện, chạy một lần lúc khởi động (main.js gọi theo thứ tự). */
export function initBoard() {
  $('renumber-btn').addEventListener('click', () => {
    const ws = cur();
    if (!ws) return;
    frozen.delete(ws.id);
    render();
    toast('Numbers updated to the current order.');
    refocus('.step .step-title .link');
  });
}
