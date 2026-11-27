// @ts-check
/* Trang Architecture của System design, phần giải thích để chọn: dòng "các nhóm ghép với nhau" (`archNote` của danh mục), câu
 * hỏi chọn của mỗi nhóm (`guide`: câu trả lời trỏ tới kiến trúc, bấm là mở kiến trúc ấy), và trong mỗi kiến trúc: sơ đồ luồng
 * (`diagram`, SVG dựng bằng createElementNS) với chú giải, luồng chữ làm chú thích của hình, ví dụ (`example`).
 * Sơ đồ vẽ khi khung có bề rộng (ResizeObserver: thẻ gập thì chưa vẽ, mở ra hay đổi cỡ thì vẽ lại theo bề rộng mới);
 * toán xếp hình ở core/arch-diagram.js, cỡ đọc từ token --ad-*.
 * Xuất: archExplain, initArchDiagram.
 * Dùng: core/arch-diagram.js, ui/dom.js. */
import { KINDS, layoutDiagram } from '../core/arch-diagram.js';
import { $, h } from './dom.js';

const NS = 'http://www.w3.org/2000/svg';
const KIND_LABEL = { src: 'Source', run: 'Processing', store: 'Stored data', use: 'Output, users' };

/** @param {string} tag @param {Record<string, any>} [attrs] @param {...any} kids */
function svg(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null && v !== false) el.setAttribute(k, String(v));
  for (const kid of kids.flat()) if (kid != null && kid !== false && kid !== '') el.append(kid instanceof Node ? kid : String(kid));
  return el;
}

/** Trong một kiến trúc: luồng (sơ đồ + chú giải + chữ làm chú thích) rồi ví dụ. Không có sơ đồ thì chỉ luồng chữ.
 * @param {any} e */
export function archExplain(e) {
  const chain = h('ol', { class: 'sd-chain' }, ...e.flow.map((/** @type {string} */ x) => h('li', {}, h('span', {}, x))));
  let body = chain;
  if (e.diagram) {
    const capId = `ad-cap-${e.id}`;
    const canvas = h('div', { class: 'ad-canvas' });
    figs.set(canvas, { d: e.diagram, id: e.id, name: e.name, cap: capId, w: 0 });
    ro?.observe(canvas);
    body = h('figure', { class: 'ad-fig', 'data-ad': e.id }, canvas, legend(e.diagram), h('figcaption', { id: capId }, chain));
  }
  return [
    h('div', { class: 'sd-when' }, h('span', { class: 'sd-k' }, 'Flow'), body),
    e.example ? h('p', { class: 'sd-when' }, h('span', { class: 'sd-k' }, 'Example'), e.example) : null,
  ];
}

/** Chú giải: loại hộp có mặt, đường nét đứt, vùng nhóm. @param {any} d */
function legend(d) {
  const kinds = KINDS.filter((k) => d.nodes.some((/** @type {any} */ n) => n.kind === k));
  return h('ul', { class: 'ad-legend' },
    ...kinds.map((k) => h('li', { class: `kind-${k}` }, KIND_LABEL[/** @type {'src'} */ (k)])),
    d.edges.some((/** @type {any} */ x) => x.dashed) ? h('li', { class: 'is-dashed' }, 'Runs only when needed') : null,
    d.group ? h('li', { class: 'is-group' }, d.group.label) : null);
}

/* ── Vẽ theo bề rộng khung ── */

/** @type {WeakMap<Element, {d: any, id: string, name: string, cap: string, w: number}>} */
const figs = new WeakMap();
const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver((list) => {
  for (const x of list) {
    if (!x.target.isConnected) { ro?.unobserve(x.target); continue; }
    draw(x.target, Math.floor(x.contentRect.width));
  }
});

/** @type {CanvasRenderingContext2D | null} */
let measureCtx = null;
/** @param {string} text @param {string} font */
function textW(text, font) {
  measureCtx = measureCtx || document.createElement('canvas').getContext('2d');
  if (!measureCtx) return text.length * 7;
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}
const px = (/** @type {CSSStyleDeclaration} */ cs, /** @type {string} */ name) => parseFloat(cs.getPropertyValue(name)) || 0;

/** @param {Element} canvas @param {number} W bề rộng khung (0: thẻ đang gập) */
function draw(canvas, W) {
  const f = figs.get(canvas);
  if (!f || W <= 0 || W === f.w) return;
  f.w = W;
  const cs = getComputedStyle(canvas);
  const font = (/** @type {string} */ weight) => `${weight} ${cs.getPropertyValue('--fs-xs').trim()} ${cs.getPropertyValue('--sans').trim()}`;
  const fonts = { label: font('600'), note: font('400') };
  const dim = {
    flow: px(cs, '--ad-gap-flow'), cross: px(cs, '--ad-gap-cross'), minBox: px(cs, '--ad-box-min'), maxBox: px(cs, '--ad-box-max'),
    pad: px(cs, '--ad-pad'), bar: px(cs, '--ad-bar'), lh: px(cs, '--ad-line'), gap: px(cs, '--ad-note-gap'),
    gpad: px(cs, '--ad-group-pad'), tip: px(cs, '--ad-tip'),
  };
  const L = layoutDiagram(f.d, W, dim, (s, k) => textW(s, fonts[k]));
  if (!L) return;
  const r = px(cs, '--ad-r'), arrow = px(cs, '--ad-arrow');
  const mid = `ad-arrow-${f.id}`;
  const el = svg('svg', { class: `ad-svg is-${L.dir}`, viewBox: `0 0 ${L.width} ${L.height}`, width: L.width, height: L.height,
    role: 'img', 'aria-label': `${f.name}: data flow diagram`, 'aria-describedby': f.cap },
  /* Đầu mũi tên chữ V hở như sơ đồ System design; cỡ theo px của sơ đồ. */
  svg('defs', {}, svg('marker', { id: mid, viewBox: '0 0 12 12', refX: 10, refY: 6, markerWidth: 12, markerHeight: 12, markerUnits: 'userSpaceOnUse', orient: 'auto-start-reverse' },
    svg('path', { class: 'ad-arrow', d: `M${10 - arrow} 2L10 6L${10 - arrow} 10` }))),
  L.group ? svg('rect', { class: 'ad-group', x: L.group.x, y: L.group.y, width: L.group.w, height: L.group.h, rx: r }) : null,
  ...L.edges.map((x) => svg('path', { class: `ad-edge${x.dashed ? ' is-dashed' : ''}`, d: x.d, 'marker-end': `url(#${mid})` })),
  ...L.boxes.map((b) => {
    const lines = [...b.label.map((t) => ['ad-label', t]), ...b.note.map((t) => ['ad-note', t])];
    return svg('g', { class: `ad-node kind-${b.kind}`, transform: `translate(${b.x} ${b.y})` },
      svg('rect', { class: 'ad-box', width: b.w, height: b.h, rx: r }),
      svg('rect', { class: 'ad-bar', x: 0, y: dim.pad, width: dim.bar, height: Math.max(0, b.h - 2 * dim.pad), rx: dim.bar / 2 }),
      ...lines.map(([cls, t], k) => svg('text', { class: cls, x: dim.bar + dim.pad,
        y: dim.pad + k * dim.lh + (k >= b.label.length && b.note.length ? dim.gap : 0) + dim.lh * 0.72 }, t)));
  }));
  canvas.replaceChildren(el);
  /* Font của trang tải muộn hơn lần đo đầu: đo lại một lần khi font xong. */
  if (document.fonts && document.fonts.status !== 'loaded') {
    document.fonts.ready.then(() => { if (canvas.isConnected) { f.w = 0; draw(canvas, Math.floor(canvas.getBoundingClientRect().width)); } });
  }
}

/* ── Bấm tên kiến trúc trong câu hỏi chọn: mở thẻ ấy, cuộn tới, focus đầu thẻ ── */

export function initArchDiagram() {
  $('sd-pane').addEventListener('click', (/** @type {any} */ e) => {
    const b = e.target.closest('[data-arch-go]');
    if (!b) return;
    const card = /** @type {HTMLDetailsElement | null} */ (b.closest('.sd-fam')?.querySelector(`[data-arch="${b.dataset.archGo}"]`));
    if (!card) return;
    card.open = true;
    const sum = card.querySelector('summary');
    sum?.focus({ preventScroll: true });
    card.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
}
