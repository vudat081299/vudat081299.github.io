// @ts-check
/* System design (PLAN-016): mục trên trang (sơ đồ tự vẽ, nút) và hộp chọn từng khâu (#dlg-sd).
 * Danh mục: data/system-design.json. Logic thuần: core/design.js, core/design-plan.js. Chữ người dùng chỉ vào DOM qua text node.
 * Xuất: renderSection, initDesign, mdLabels.
 * Dùng: core/board.js, core/design-plan.js, core/design.js, core/io.js, core/model.js, ui/diagram-view.js, ui/dialogs.js,
 *   ui/dom.js, ui/state.js, ui/toast.js. */
import { fold as foldText } from '../core/board.js';
import { initDiagramView, attach as attachView, focusFig, resetView } from './diagram-view.js';
import { PLAN_STEP, applyPlan, bothDecided, diagramNodes, flowEdges, planDiff, snake, viaLabel } from '../core/design-plan.js';
import { EDGE_MAX, OWN_MAX, VIA, applyPath, archMissing, archState, catalogErrors, decidedCount, effProfile, emptyDesign, isPreset, normDesign, notNeededBy, pathOf, pickNames, presetDesign, rankOptions, stageLists, stageState, warnings } from '../core/design.js';
import { plural, slug } from '../core/io.js';
import { normStep, normSub } from '../core/model.js';
import { showDlg } from './dialogs.js';
import { $, h, icon } from './dom.js';
import { commit, cur, findWs, tplOf } from './state.js';
import { toast } from './toast.js';

const NS = 'http://www.w3.org/2000/svg';
const LANE_LABEL = { data: 'Data', model: 'Model', app: 'App', ops: 'Operations' };
const COST_LABEL = { free: 'Free', freemium: 'Free tier', paid: 'Paid' };
const LEVEL_LABEL = { 1: 'Beginner', 2: 'Some setup', 3: 'Advanced' };

/** @type {any} */ let cat = null;
let catError = '';
let at = 0;                       // trang của hộp: 0 = lối bắt đầu, 1 = hồ sơ dự án, 2 = kiến trúc, k ≥ 3 = khâu thứ k − 2
let paneAt = -1;                  // trang khung phải vẽ lần trước: khác `at` thì về đầu trang
/** Nút / nhãn của sơ đồ đã mở hộp (null: mở từ chỗ khác). @type {Element | null} */
let figOpener = null;
const moreOpen = new Set();       // khâu đang mở "Show other options"
/** Lần "Apply path" gần nhất (Hoàn tác là một dòng trong hộp: toast bị hộp modal che). @type {any} */
let applied = null;
const ARCH_PAGE = 2;
const FIRST_STAGE = 3;
const ARROW = 6;                  // px: đầu mũi tên của đường nối dài chừng này tính từ mũi (marker `sd-arrow`)
const TIP_GAP = 3;                // px: mũi tên dừng trước nút chừng này


/** @param {string} tag @param {Record<string, any>} [attrs] @param {...any} kids */
function svg(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null && v !== false) el.setAttribute(k, String(v));
  for (const kid of kids.flat()) if (kid != null && kid !== false && kid !== '') el.append(kid instanceof Node ? kid : String(kid));
  return el;
}

const ws = () => cur();
const design = () => ws()?.design || null;
const stageAt = (/** @type {number} */ k) => cat.stages[k - FIRST_STAGE];
/* Sau các khâu: trang xem lại (luật phối hợp). */
const EXTRA = ['handoffs', 'checks'];
const lastPage = () => cat.stages.length + FIRST_STAGE - 1 + EXTRA.length;
const extraAt = (/** @type {number} */ k) => EXTRA[k - FIRST_STAGE - cat.stages.length] || '';
const extraPage = (/** @type {string} */ kind) => cat.stages.length + FIRST_STAGE + EXTRA.indexOf(kind);
const stagePage = (/** @type {string} */ id) => cat.stages.findIndex((/** @type {any} */ s) => s.id === id) + FIRST_STAGE;

/** Sửa thiết kế của dự án đang mở rồi ghi; thiết kế trống thì về null; kiến trúc chọn không còn trong danh mục bị bỏ.
 * @param {(d: any) => void} fn */
function edit(fn) {
  const w = ws();
  if (!w) return;
  const d = w.design ? w.design : emptyDesign();
  fn(d);
  w.design = normDesign(d, cat);
  commit();
}

/** Luật đang báo, trừ luật hồ sơ ↔ công cụ mà kiến trúc người dùng chọn giải thích (chỉ là lời nhắc, PLAN-042). @param {any} d */
const hardWarnings = (d) => warnings(cat, d).filter((x) => !x.arch);

/** Tên một kiến trúc của danh mục theo id. @param {string} id */
const archName = (id) => (cat.architectures || []).flatMap((/** @type {any} */ f) => f.entries).find((/** @type {any} */ e) => e.id === id)?.name || id;

/** Trạng thái lưu của một khâu (bản sửa được). @param {any} d @param {string} id */
const stageRec = (d, id) => (d.stages[id] = d.stages[id] || { pick: [], skip: false, own: '', note: '' });

/** Khối gập của hộp: phần mở nằm trong một div (`.sd-fold`), vì nội dung của <details> không nhận gap của flex.
 * @param {Record<string, any>} attrs @param {any} summary @param {...any} kids */
const fold = (attrs, summary, ...kids) => h('details', attrs, summary, h('div', { class: 'sd-fold' }, ...kids));

/** Bàn giao của một đường nối (bản sửa được). @param {any} d @param {string} key */
const edgeRec = (d, key) => ((d.edges = d.edges || {})[key] = d.edges[key] || { via: '', what: '', where: '', promise: '', check: '' });

/* ── Mục trên trang ── */

export function renderSection() {
  const w = ws();
  if (!w) return;
  if (!cat) {
    $('sd-count').textContent = '';
    $('sd-open').disabled = true;
    $('sd-fig').replaceChildren(h('p', { class: 'sd-empty' }, catError || 'Loading the stage list…'));
    attachView(null, 0, 0);
    return;
  }
  const n = decidedCount(cat, w.design);
  $('sd-count').textContent = `${n.done}/${n.total}`;
  $('sd-open').disabled = false;
  $('sd-open-text').textContent = n.done ? 'Edit the design' : 'Design the system';
  const diff = planDiff(cat, w);
  $('sd-plan').hidden = !diff.length;
  $('sd-plan-text').textContent = diff.some((x) => x.sub) ? 'Update plan' : 'Add tasks to plan';
  const p = pathOf(cat, w.design);
  $('sd-path').hidden = !p;
  $('sd-path').textContent = p ? `Deliverable: ${p.label}` : '';
  renderArchLine(w.design);
  $('sd-svg').hidden = !n.done;
  drawDiagram();
  const warns = hardWarnings(w.design);
  $('sd-warns').hidden = !warns.length;
  $('sd-warns').replaceChildren(...warns.map((x) => h('li', { class: 'sd-warnbox' },
    h('button', { type: 'button', class: 'sd-link', 'data-warn': x.id, 'data-warn-stage': x.stages[0] || '' }, x.title), ' ', x.msg)));
}

/** Dòng kiến trúc trên trang: kiến trúc đã chọn (kể cả qua lối), rồi kiến trúc gợi ý của nhóm chưa chọn (bấm là mở trang
 * Architecture của hộp). @param {any} d */
function renderArchLine(d) {
  const el = $('sd-arch');
  const fams = Array.isArray(cat.architectures) ? cat.architectures : [];
  el.hidden = !fams.length;
  const st = archState(cat, d);
  const chosen = st.filter((a) => a.chosen).map((a) => archName(a.chosen));
  const recs = st.filter((a) => !a.chosen && a.rec).map((a) => archName(/** @type {string} */ (a.rec)));
  const text = chosen.length ? `: chosen ${chosen.join(' · ')}${recs.length ? `; recommended ${recs.join(' · ')}` : ''}`
    : recs.length ? `: ${recs.join(' · ')}` : ': answer the profile for a recommendation';
  el.replaceChildren(h('button', { type: 'button', class: 'sd-link', 'data-arch-open': '1' }, chosen.length || recs.length ? 'Architecture' : 'Architecture guide'), text);
}

/* ── Sơ đồ (SVG dựng bằng createElementNS; cỡ đọc từ token --sd-*) ── */

let measureCtx = /** @type {CanvasRenderingContext2D | null} */ (null);
/** Cắt chữ cho vừa bề rộng (đo bằng canvas theo đúng font). @param {string} text @param {number} max @param {string} font */
function fitText(text, max, font) {
  measureCtx = measureCtx || document.createElement('canvas').getContext('2d');
  if (!measureCtx) return text;
  measureCtx.font = font;
  if (measureCtx.measureText(text).width <= max) return text;
  let s = text;
  while (s.length > 1 && measureCtx.measureText(s + '…').width > max) s = s.slice(0, -1);
  return s.trimEnd() + '…';
}

const px = (/** @type {CSSStyleDeclaration} */ cs, /** @type {string} */ name, /** @type {number} */ dflt) => parseFloat(cs.getPropertyValue(name)) || dflt;
const MAX_NAMES = 3;
/** Bề rộng chữ theo font (canvas). @param {string} text @param {string} font */
function textW(text, font) {
  measureCtx = measureCtx || document.createElement('canvas').getContext('2d');
  if (!measureCtx) return text.length * 8;
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}

let viewWs = '';                  // dự án của khung nhìn đang xem: đổi dự án thì về khung ban đầu

function drawDiagram() {
  const fig = $('sd-fig');
  const { flow, ops } = diagramNodes(cat, design());
  const cs = getComputedStyle(fig);
  /* Lề trong khung nằm trong <svg> (--sd-fig-pad): sơ đồ phóng to, kéo đi chạm tới viền khung chứ không bị cắt giữa lề. */
  const fp = px(cs, '--sd-fig-pad', 16);
  const W = Math.max(fig.clientWidth - 2 * fp - 4, 240);
  const gx = px(cs, '--sd-gap-x', 40), gy = px(cs, '--sd-gap-y', 36), maxW = px(cs, '--sd-node-max', 260);
  const pad = px(cs, '--sd-pad', 12), head = px(cs, '--sd-head', 30), lh = px(cs, '--sd-line', 20);
  const gxHand = Math.max(gx, px(cs, '--sd-gap-hand', 128)), gyHand = Math.max(gy, px(cs, '--sd-gap-y-hand', 56));
  const edges = new Map(flowEdges(cat, design()).map((e) => [e.key, e]));
  /* Khoảng giữa cột c và c + 1: một đường nối ngang qua đó có hợp đồng thì nới tới --sd-gap-hand, để nhãn không chiếm cả đường.
   * Số cột: nhiều nhất (≤ 5) mà nút còn rộng ≥ --sd-node-fit; chỉ còn một cột thì thử hai cột với nút ≥ --sd-node-min.
   * Nút giãn ra lấp chỗ thừa, rộng nhất --sd-node-max. */
  const gapsFor = (/** @type {number} */ k) => {
    const g = Array(Math.max(0, k - 1)).fill(gx);
    for (let i = 1; i < flow.length; i++) {
      const a = snake(i - 1, k), b = snake(i, k);
      if (a.row === b.row && edges.get(`${flow[i - 1].id}>${flow[i].id}`)?.c) g[Math.min(a.col, b.col)] = gxHand;
    }
    return g;
  };
  const sum = (/** @type {number[]} */ a) => a.reduce((t, x) => t + x, 0);
  const fitNode = Math.min(maxW, px(cs, '--sd-node-fit', 180)), minNode = Math.min(fitNode, px(cs, '--sd-node-min', 140));
  let cols = 5, gaps = gapsFor(cols);
  while (cols > 1 && cols * fitNode + sum(gaps) > W) gaps = gapsFor(--cols);
  if (cols === 1 && flow.length > 1 && 2 * minNode + sum(gapsFor(2)) <= W) gaps = gapsFor(cols = 2);
  const nw = Math.min(maxW, (W - sum(gaps)) / cols);
  const colX = gaps.reduce((xs, g, c) => [...xs, xs[c] + nw + g], [0]);
  const nameFont = `600 ${cs.getPropertyValue('--fs-sm').trim() || '13px'} ${cs.getPropertyValue('--sans').trim()}`;
  const titleFont = `500 ${cs.getPropertyValue('--fs-xs').trim() || '12px'} ${cs.getPropertyValue('--mono').trim()}`;
  const lineCount = (/** @type {any} */ n) => (n.lane === 'end' ? 1 : Math.max(1, Math.min(n.names.length, MAX_NAMES + 1)));
  const nodeH = (/** @type {any} */ n) => head + lineCount(n) * lh + pad;

  /* Luồng: rắn bò; mỗi hàng cao bằng nút cao nhất của hàng. Đường nối dọc từ hàng r xuống hàng r + 1 có hợp đồng thì khoảng
   * hàng nới tới --sd-gap-y-hand: nhãn nằm trên nét mà không đè đầu mũi tên. */
  const rows = /** @type {number[]} */ ([]);
  flow.forEach((n, i) => { const r = snake(i, cols).row; rows[r] = Math.max(rows[r] || 0, nodeH(n)); });
  const rowGap = rows.map(() => gy);
  for (let i = 1; i < flow.length; i++) {
    const r = snake(i - 1, cols).row;
    if (r !== snake(i, cols).row && edges.get(`${flow[i - 1].id}>${flow[i].id}`)?.c) rowGap[r] = gyHand;
  }
  const rowY = rows.map((_, r) => rows.slice(0, r).reduce((a, b, k) => a + b + rowGap[k], 0));
  const pos = flow.map((n, i) => { const p = snake(i, cols); return { n, x: colX[p.col], y: rowY[p.row], h: rows[p.row], row: p.row }; });
  let y = rowY.length ? rowY[rowY.length - 1] + rows[rows.length - 1] : 0;

  const g = svg('g', { class: 'sd-flow' });
  const fonts = { name: nameFont, title: titleFont };
  for (const p of pos) g.append(nodeEl(p.n, p.x, p.y, nw, p.h, head, lh, pad, fonts));
  /* Đường nối vẽ sau nút. Đường có bàn giao là một nhóm: vùng rê rộng dọc đường, nét, rồi nhãn trên cùng (nhãn nền đặc che nét). */
  const links = svg('g', { class: 'sd-wires' });
  const dim = {
    bh: px(cs, '--sd-badge-h', 20), plus: px(cs, '--sd-plus', 16), fade: px(cs, '--sd-hand-fade', 16), cap: px(cs, '--sd-hand-cap', 0.5),
    font: `600 ${cs.getPropertyValue('--fs-xs').trim() || '12px'} ${cs.getPropertyValue('--sans').trim()}`,
  };
  for (let i = 1; i < pos.length; i++) {
    const a = pos[i - 1], b = pos[i];
    const same = a.row === b.row;
    const key = `${a.n.id}>${b.n.id}`;
    const d = same
      ? (b.x > a.x ? `M${a.x + nw} ${a.y + a.h / 2}H${b.x - TIP_GAP}` : `M${a.x} ${a.y + a.h / 2}H${b.x + nw + TIP_GAP}`)
      : `M${a.x + nw / 2} ${a.y + a.h}V${b.y - TIP_GAP}`;
    /* Nét liền khi cả hai đầu đã quyết, còn lại nét đứt; đầu mũi tên luôn liền. */
    const line = svg('path', { class: `sd-edge${bothDecided(a.n, b.n) ? '' : ' is-open'}`, d, 'data-pair': key, 'marker-end': 'url(#sd-arrow)' });
    const e = edges.get(key);
    if (!e) { links.append(line); continue; }
    /* Nhãn ở giữa khoảng trống giữa hai nút; dài nhất --sd-hand-cap lần chiều dài đường (đường dọc: lần bề rộng nút).
     * Đường dọc: giữa phần nét trước đầu mũi tên, nhãn không đè mũi tên. */
    const x0 = Math.min(a.x, b.x) + nw, x1 = Math.max(a.x, b.x);
    links.append(svg('g', { class: 'sd-wire', 'data-edge': key },
      svg('path', { class: 'sd-hit', d }), line,
      handEl(e, same ? (x0 + x1) / 2 : a.x + nw / 2, same ? a.y + a.h / 2 : (a.y + a.h + b.y - TIP_GAP - ARROW) / 2, (same ? x1 - x0 : nw) * dim.cap, dim, i)));
  }
  g.append(links);

  /* Vận hành: dải riêng dưới luồng, không mũi tên — chạy song song với mọi khâu. */
  const og = svg('g', { class: 'sd-ops' });
  if (ops.length) {
    y += gy;
    og.append(svg('text', { class: 'sd-band', x: 0, y: y + lh * 0.7 }, 'Operations · alongside every stage'));
    y += lh + pad;
    const oh = Math.max(...ops.map(nodeH));
    ops.forEach((n, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      og.append(nodeEl(n, colX[c], y + r * (oh + gy / 2), nw, oh, head, lh, pad, fonts));
    });
    y += Math.ceil(ops.length / cols) * (oh + gy / 2) - gy / 2;
  }
  const width = colX[cols - 1] + nw;
  const label = 'System diagram: ' + flow.map((n) => n.names.length ? `${n.title} (${n.names.join(', ')})` : n.title).join(' → ');
  /* Đầu mũi tên chữ V hở; đơn vị theo sơ đồ để nét bằng nét đường nối. Bản `-on`: đường đang rê. */
  const arrow = (/** @type {string} */ id, /** @type {string} */ cls) => svg('marker', { id, viewBox: '0 0 12 12', refX: 10, refY: 6, markerWidth: 12, markerHeight: 12, markerUnits: 'userSpaceOnUse', orient: 'auto-start-reverse' },
    svg('path', { class: cls, d: `M${10 - ARROW} 2L10 6L${10 - ARROW} 10` }));
  /* <svg> rộng bằng khung (1 đơn vị = 1 px); sơ đồ trong nhóm `.sd-cam`, diagram-view.js đặt transform kéo / thu phóng lên đó. */
  const vw = Math.max(W, width) + 4 + 2 * fp, cw = width + 4 + 2 * fp, chh = y + 4 + 2 * fp;
  const el = svg('svg', { class: 'sd-svg', viewBox: `0 0 ${vw} ${chh}`, width: vw, height: chh, role: 'img', 'aria-label': label, 'data-w': cw },
    svg('defs', {}, arrow('sd-arrow', 'sd-arrow'), arrow('sd-arrow-on', 'sd-arrow is-on')),
    svg('g', { class: 'sd-cam' }, svg('g', { transform: `translate(${fp + 2} ${fp + 2})` }, g, og)));
  fig.replaceChildren(el);
  if (ws().id !== viewWs) { viewWs = ws().id; resetView(false); }
  attachView(el, cw, chh);
}

/** Nhãn bàn giao trên đường nối, tâm (cx, cy), rộng nhất `cap`. Đường trống: dấu + chỉ cho chuột, hiện khi rê đường (bàn phím,
 * cảm ứng: trang Handoffs của hộp liệt kê mọi đường). Chữ dài hơn `cap` thì mờ dần ở đuôi (mask), đủ chữ ở tooltip.
 * @param {any} e @param {number} cx @param {number} cy @param {number} cap
 * @param {{bh: number, plus: number, fade: number, font: string}} dim @param {number} n số thứ tự, cho id của mask */
function handEl(e, cx, cy, cap, dim, n) {
  const name = `${e.from.title} → ${e.to.title}`;
  if (!e.c) {
    const r = dim.plus / 2, k = r / 2;
    return svg('g', { class: 'sd-hand is-empty', transform: `translate(${cx} ${cy})`, 'data-edge': e.key, 'aria-hidden': 'true' },
      svg('title', {}, `Describe the handoff ${name}`),
      svg('circle', { class: 'sd-hand-box', r }),
      svg('path', { class: 'sd-hand-plus', d: `M${-k} 0H${k}M0 ${-k}V${k}` }));
  }
  const bh = dim.bh, bp = bh / 3;
  const label = VIA.find((v) => v.id === e.c.via)?.short || 'Spec';
  const tw = textW(label, dim.font);
  const cut = tw + 2 * bp > cap;
  const w = Math.max(bh, cut ? cap : tw + 2 * bp);
  const what = [viaLabel(e.c.via), e.c.what].filter(Boolean).join(', ');
  const id = `sd-fade-${n}`;
  const f = Math.min(dim.fade, (w - 2 * bp) / 2);
  return svg('g', { class: `sd-hand${cut ? ' is-cut' : ''}`, transform: `translate(${cx - w / 2} ${cy - bh / 2})`, 'data-edge': e.key, tabindex: 0, role: 'button',
    'aria-label': `Handoff ${name}${what ? ': ' + what : ''}. Edit` },
  svg('title', {}, `Handoff ${name}: ${label}${what ? ` (${what})` : ''}`),
  svg('rect', { class: 'sd-hand-box', width: w, height: bh, rx: bh / 2 }),
  cut ? svg('defs', {},
    svg('linearGradient', { id: id + '-g', gradientUnits: 'userSpaceOnUse', x1: w - bp - f, y1: 0, x2: w - bp, y2: 0 },
      svg('stop', { offset: 0 }), svg('stop', { offset: 1, 'stop-opacity': 0 })),
    svg('mask', { id, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: w, height: bh, 'mask-type': 'alpha' },
      svg('rect', { width: w, height: bh, fill: `url(#${id}-g)` }))) : null,
  svg('text', { class: 'sd-hand-txt', x: cut ? bp : w / 2, y: bh / 2, 'text-anchor': cut ? 'start' : 'middle', 'dominant-baseline': 'central', mask: cut ? `url(#${id})` : null }, label));
}

/** @param {any} n @param {number} x @param {number} y @param {number} w @param {number} hh @param {number} head @param {number} lh @param {number} pad @param {{name: string, title: string}} font */
function nodeEl(n, x, y, w, hh, head, lh, pad, font) {
  const open = n.lane !== 'end';
  const grp = svg('g', {
    class: `sd-node lane-${n.lane}${n.open ? ' is-open' : ''}`, transform: `translate(${x} ${y})`,
    ...(open ? { 'data-stage': n.id, tabindex: 0, role: 'button', 'aria-label': `${n.title}: ${n.open ? 'not decided' : n.names.join(', ')}. Edit` } : {}),
  });
  grp.append(svg('rect', { class: 'sd-box', width: w, height: hh, rx: 10 }));
  grp.append(svg('rect', { class: 'sd-bar', width: 4, height: hh - 16, x: 0, y: 8, rx: 2 }));
  const max = w - 2 * pad - 4;
  /* Tiêu đề in hoa, giãn chữ: đo rộng hơn một chút cho chắc. */
  const title = n.lane === 'end' ? 'END' : n.title.toUpperCase();
  const shown = fitText(title, max * 0.95, font.title);
  grp.append(svg('text', { class: 'sd-title', x: pad + 4, y: head * 0.62 }, shown));
  /** @type {string[]} */
  let lines = n.lane === 'end' ? ['Users'] : n.open ? ['Not decided'] : n.names.slice(0, MAX_NAMES);
  if (!n.open && n.names.length > MAX_NAMES) lines = [...lines, `+${n.names.length - MAX_NAMES} more`];
  let cut = shown !== title || (!n.open && n.names.length > MAX_NAMES);
  lines.forEach((t, k) => {
    const s = fitText(t, max, font.name);
    cut = cut || s !== t;
    grp.append(svg('text', { class: n.open ? 'sd-name muted' : 'sd-name', x: pad + 4, y: head + k * lh + lh * 0.7 }, s));
  });
  /* Chữ bị cắt hay tên bị gộp "+n more": tooltip ghi đủ. */
  if (cut) grp.prepend(svg('title', {}, n.open || n.lane === 'end' ? n.title : `${n.title}: ${n.names.join(', ')}`));
  return grp;
}

/* text-transform của CSS không có thuộc tính SVG tương ứng: đổi thẳng chữ của file tải về. */
const TEXT_CASE = { uppercase: (/** @type {string} */ t) => t.toUpperCase(), lowercase: (/** @type {string} */ t) => t.toLowerCase(),
  capitalize: (/** @type {string} */ t) => t.replace(/(^|\s)(\S)/g, (_, sp, c) => sp + c.toUpperCase()) };
/** Tải sơ đồ: chép màu, nét, font (cả nghiêng), chữ hoa của CSS vào thuộc tính, chữ để file đứng một mình đúng theme đang xem;
 * rộng, cao, viewBox làm tròn tới px nguyên. */
function downloadSvg() {
  const src = $('sd-fig').querySelector('svg');
  if (!src) return;
  const out = /** @type {SVGSVGElement} */ (src.cloneNode(true));
  const a = [src, ...src.querySelectorAll('*')], b = [out, ...out.querySelectorAll('*')];
  const drop = b.filter((_, i) => a[i].matches('.sd-hit, .sd-hand.is-empty'));
  const camOut = b[a.findIndex((x) => x.matches('.sd-cam'))];
  const props = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'font-family', 'font-size', 'font-weight', 'font-style', 'letter-spacing', 'opacity'];
  a.forEach((el, i) => {
    const cs = getComputedStyle(el);
    for (const p of props) b[i].setAttribute(p, cs.getPropertyValue(p));
    const tc = TEXT_CASE[/** @type {'uppercase'} */ (cs.getPropertyValue('text-transform'))];
    if (tc) for (const t of b[i].childNodes) if (t.nodeType === Node.TEXT_NODE) t.nodeValue = tc(t.nodeValue || '');
    b[i].removeAttribute('class');
    b[i].removeAttribute('tabindex');
    b[i].removeAttribute('role');
  });
  for (const x of drop) x.remove();
  camOut?.removeAttribute('style');
  const cw = String(Math.round(Number(src.getAttribute('data-w') || src.getAttribute('width') || 0)));
  const chh = String(Math.round(Number(src.getAttribute('height') || 0)));
  out.setAttribute('width', cw);
  out.setAttribute('height', chh);
  out.setAttribute('viewBox', `0 0 ${cw} ${chh}`);
  out.removeAttribute('data-w');
  out.setAttribute('xmlns', NS);
  const vb = out.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 0, 0];
  out.insertBefore(svg('rect', { x: vb[0], y: vb[1], width: vb[2], height: vb[3], fill: getComputedStyle(document.body).backgroundColor }), out.firstChild);
  const blob = new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(out)], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = h('a', { href: url, download: slug(ws().name) + '-system.svg' });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ── Đưa việc sang bảng / giữ kế hoạch theo thiết kế: hộp xem trước #dlg-sdp liệt kê việc mới, việc đổi, việc không còn trong
 * thiết kế; người dùng chọn từng mục và bước nhận việc mới (mặc định "System build", chưa có thì tạo ở vị trí 2). Một Hoàn tác
 * trả hết. ── */

/** @type {null | {wsId: string, items: any[], key: string}} */
let planCtx = null;
const diffKey = (/** @type {any[]} */ items) => items.map((x) => `${x.kind}:${x.task?.src || ''}:${x.sub?.id || ''}`).join('|');

function openPlan() {
  const w = ws();
  if (!w || !cat) return;
  const items = planDiff(cat, w);
  planCtx = { wsId: w.id, items, key: diffKey(items) };
  const build = w.steps.find((/** @type {any} */ s) => foldText(s.title) === foldText(PLAN_STEP.title));
  const sel = $('sdp-step');
  sel.replaceChildren(...(build ? [] : [h('option', { value: '' }, `New step: ${PLAN_STEP.title} (step ${Math.min(1, w.steps.length) + 1})`)]),
    ...w.steps.map((/** @type {any} */ s, /** @type {number} */ k) => h('option', { value: s.id }, `${k + 1}. ${s.title}`)));
  sel.value = build ? build.id : '';
  const stepName = (/** @type {string} */ id) => w.steps.find((/** @type {any} */ s) => s.id === id)?.title || '';
  const radios = (/** @type {number} */ i, /** @type {string[][]} */ opts) => h('div', { class: 'sd-pills', role: 'radiogroup', 'aria-label': 'Action' },
    ...opts.map(([v, l], k) => h('label', { class: 'sd-pill' }, h('input', { type: 'radio', name: `sdp-${i}`, value: v, 'data-i': i, checked: k === 0 }), h('span', {}, l))));
  /** @param {any} it @param {number} i */
  const row = (it, i) => {
    if (it.kind === 'new') {
      return h('li', { class: 'sdp-item' }, h('label', { class: 'sdp-check' }, h('input', { type: 'checkbox', 'data-i': i, checked: true }),
        h('span', { class: 'sdp-txt' }, h('b', {}, it.task.title), it.task.doneWhen ? h('small', {}, `Done when: ${it.task.doneWhen}`) : null)));
    }
    if (it.kind === 'changed') {
      return h('li', { class: 'sdp-item' }, h('span', { class: 'sdp-txt' }, h('b', {}, it.task.title),
        h('small', {}, it.sub.title !== it.task.title ? `Was: ${it.sub.title} (in ${stepName(it.stepId)})` : `Done when, notes or links changed (in ${stepName(it.stepId)}).`),
        it.sub.status === 'done' ? h('small', { class: 'sd-warn' }, 'Done now: Update sets it back to New.') : null),
      radios(i, [['update', 'Update'], ['replace', 'Keep old and add new']]));
    }
    return h('li', { class: 'sdp-item' }, h('span', { class: 'sdp-txt' }, h('b', {}, it.sub.title), h('small', {}, `In ${stepName(it.stepId)}: ${it.why}.`)),
      radios(i, it.tagged ? [['cancel', 'Cancel'], ['keep', 'Keep']] : [['keep', 'Keep'], ['cancel', 'Cancel']]));
  };
  const groups = /** @type {const} */ ([['new', 'New', ''], ['changed', 'Changed', 'Update rewrites the title and Done when and adds new links; your notes and links stay. Keep old and add new cancels the old task.'],
    ['removed', 'No longer in the design', 'Cancel marks the task Cancelled with the reason; Keep leaves it as your own task.']]);
  const lists = groups.map(([kind, title, help]) => {
    const rows = items.map((it, i) => (it.kind === kind ? row(it, i) : null)).filter(Boolean);
    return rows.length ? h('section', { class: 'sdp-group' }, h('h3', { class: 'sd-h4' }, `${title} (${rows.length})`), help ? h('p', { class: 'sd-help' }, help) : null,
      h('ul', { class: 'sdp-list' }, ...rows)) : null;
  });
  const same = items.filter((x) => x.kind === 'same').length;
  const todo = items.some((x) => x.kind !== 'same');
  $('sdp-list').replaceChildren(...lists.filter(Boolean),
    ...(same ? [h('p', { class: 'sd-help', 'data-same': same }, `${plural(same, 'task')} already ${same === 1 ? 'matches' : 'match'} the design.`)] : []));
  const update = items.some((x) => x.sub);
  $('dlg-sdp-title').textContent = update ? 'Update plan' : 'Add tasks to plan';
  $('sdp-sub').textContent = todo ? 'Pick what to do with each task. One Undo reverts everything.' : 'Every task already matches the design.';
  $('sdp-step-field').hidden = !items.some((x) => x.kind === 'new' || x.kind === 'changed');
  $('sdp-go').disabled = !todo;
  showDlg($('dlg-sdp'));
  ($('sdp-list').querySelector('input') || $('dlg-sdp').querySelector('[data-close]')).focus({ preventScroll: true });
}

function applyPlanNow() {
  const ctx = planCtx;
  planCtx = null;
  $('dlg-sdp').close();
  const w = ctx && findWs(ctx.wsId);
  if (!w) return;
  /* Tab khác đổi dự án trong lúc hộp mở: bản so không còn đúng. */
  if (diffKey(planDiff(cat, w)) !== ctx.key) { toast('The plan changed meanwhile; open "Update plan" again.'); return; }
  const list = $('sdp-list');
  const choices = ctx.items.map((it, i) => (it.kind === 'new'
    ? (list.querySelector(`input[type="checkbox"][data-i="${i}"]`)?.checked ? 'add' : 'skip')
    : list.querySelector(`input[type="radio"][data-i="${i}"]:checked`)?.value || ''));
  let step = w.steps.find((/** @type {any} */ s) => s.id === $('sdp-step').value);
  let created = false;
  if (!step) {
    step = normStep({ ...PLAN_STEP, subs: [] });
    w.steps.splice(Math.min(1, w.steps.length), 0, step);
    created = true;
  }
  const r = applyPlan(ctx.items, choices, step);
  if (created && !step.subs.length) { w.steps = w.steps.filter((/** @type {any} */ s) => s !== step); created = false; }
  const n = r.counts;
  const parts = [n.added ? `${n.added} added` : '', n.updated ? `${n.updated} updated` : '', n.cancelled ? `${n.cancelled} cancelled` : '',
    n.kept ? `${n.kept} kept as your own` : ''].filter(Boolean);
  commit();
  if (!parts.length && !r.before.size) { toast('Nothing changed.'); return; }
  const wsId = w.id, stepId = step.id, added = new Set(r.added), before = r.before;
  toast(`Plan updated: ${parts.join(', ') || 'tasks linked to the design'}.${n.reset ? ` ${plural(n.reset, 'done task')} set back to New.` : ''}`, () => {
    const ww = findWs(wsId);
    if (!ww) return;
    for (const s of ww.steps) s.subs = s.subs.filter((/** @type {any} */ x) => !added.has(x.id)).map((/** @type {any} */ x) => (before.has(x.id) ? normSub(before.get(x.id)) : x));
    if (created) ww.steps = ww.steps.filter((/** @type {any} */ s) => s.id !== stepId || s.subs.length);
    commit('#sd-plan');
  }, '#sd-plan');
}

/* ── Hộp chọn: cột trái là hồ sơ + các khâu theo làn, phải là khâu đang xem; Back / Next ở chân ── */

/** @param {number} [k] @param {string} [edgeKey] mở trang Handoffs ở đúng đường nối này */
function openDesign(k = 0, edgeKey = '') {
  if (!cat) return;
  const a = document.activeElement;
  figOpener = a && a !== $('sd-fig') && $('sd-fig').contains(a) ? a : null;
  at = k;
  paneAt = -1;
  applied = null;
  if (edgeKey) moreOpen.add('edge:' + edgeKey);
  paint();
  showDlg($('dlg-sd'));
  /* Hộp đóng không có bố cục: chỗ cuộn của khung phải (giữ từ lần mở trước) và mục đang xem của cột trái chỉ đặt được sau khi mở. */
  $('sd-pane').scrollTop = 0;
  revealNav(true);
  const item = edgeKey && $('sd-pane').querySelector(`[data-edge-item="${edgeKey}"]`);
  if (item) {
    item.scrollIntoView({ block: 'start' });
    item.querySelector('input:checked, input')?.focus({ preventScroll: true });
  } else $('sd-pane').focus({ preventScroll: true });
}

function paint() {
  paintNav();
  paintPane();
  const last = lastPage();
  $('sd-prev').disabled = at === 0;
  $('sd-next-text').textContent = at === last ? 'Done' : 'Next';
  const ex = extraAt(at);
  $('sd-pos').textContent = at === 0 ? 'Deliverable' : at === 1 ? 'Project profile' : at === ARCH_PAGE ? 'Architecture'
    : ex === 'checks' ? 'Checks' : ex === 'handoffs' ? 'Handoffs' : `Stage ${at - FIRST_STAGE + 1} of ${cat.stages.length}`;
  paintSub();
}

/** Dòng dưới tên hộp: số khâu đã quyết, số cảnh báo. */
function paintSub() {
  const n = decidedCount(cat, design());
  const k = hardWarnings(design()).length;
  $('sd-sub').textContent = `${n.done} of ${n.total} stages decided${k ? ` · ${plural(k, 'warning')}` : ''}. Changes save as you go.`;
}

function paintNav() {
  const d = design();
  const warns = hardWarnings(d);
  const warned = new Set(warns.flatMap((x) => x.stages));
  /** @type {any[]} */
  const p = pathOf(cat, d);
  const items = [h('li', {}, navBtn(0, 'Deliverable', p ? 'done' : 'open', p ? p.label : '')),
    h('li', {}, navBtn(1, 'Project profile', Object.keys(d?.profile || {}).length ? 'done' : 'open', ''))];
  const adv = archState(cat, d);
  const recs = adv.filter((a) => a.rec !== null).length;
  const mine = adv.filter((a) => a.chosen && !a.viaPath).length;
  /* Architecture: chưa chọn nhóm nào thì là trang gợi ý — dấu trung tính "guide", không phải vòng "chưa quyết" của khâu. */
  items.push(h('li', {}, navBtn(ARCH_PAGE, 'Architecture', mine ? 'done' : 'guide',
    [mine ? `${mine} chosen` : '', adv.length ? `${recs} of ${adv.length} recommended` : ''].filter(Boolean).join(' · '))));
  let lane = '';
  cat.stages.forEach((/** @type {any} */ s, /** @type {number} */ i) => {
    if (s.lane !== lane) { lane = s.lane; items.push(h('li', { class: 'sd-nav-lane', 'aria-hidden': 'true' }, LANE_LABEL[/** @type {'data'} */ (lane)])); }
    const st = stageState(d, s.id);
    items.push(h('li', {}, navBtn(i + FIRST_STAGE, s.title, st, st === 'skip' ? 'Not needed' : pickNames(s, d?.stages[s.id]).join(', '), warned.has(s.id))));
  });
  items.push(h('li', { class: 'sd-nav-lane', 'aria-hidden': 'true' }, 'Review'));
  const fe = flowEdges(cat, d);
  const set = fe.filter((e) => e.c).length;
  items.push(h('li', {}, navBtn(extraPage('handoffs'), 'Handoffs', set ? 'done' : 'open', fe.length ? `${set} of ${fe.length} described` : '')));
  items.push(h('li', {}, navBtn(extraPage('checks'), 'Checks', warns.length ? 'open' : 'done', warns.length ? plural(warns.length, 'warning') : 'No conflicts', warns.length > 0)));
  $('sd-nav').replaceChildren(...items);
  revealNav(false);
}

/** Cuộn cột trái (máy rộng: <nav> cuộn dọc; hẹp: dải chip <ol> cuộn ngang) cho thấy mục đang xem; chỉ cuộn hai khung ấy,
 * không cuộn hộp hay trang. `center`: lúc mở hộp, đặt mục vào giữa; còn lại chỉ cuộn khi mục khuất.
 * @param {boolean} center */
function revealNav(center) {
  const b = $('sd-nav').querySelector('[aria-current]');
  if (!b) return;
  for (const sc of [$('sd-nav'), $('sd-nav').parentElement]) {
    const r = sc.getBoundingClientRect(), br = b.getBoundingClientRect();
    if (sc.scrollHeight > sc.clientHeight) {
      if (center) sc.scrollTop += br.top + br.height / 2 - (r.top + r.height / 2);
      else if (br.top < r.top) sc.scrollTop -= r.top - br.top;
      else if (br.bottom > r.bottom) sc.scrollTop += br.bottom - r.bottom;
    }
    if (sc.scrollWidth > sc.clientWidth) {
      if (center) sc.scrollLeft += br.left + br.width / 2 - (r.left + r.width / 2);
      else if (br.left < r.left) sc.scrollLeft -= r.left - br.left;
      else if (br.right > r.right) sc.scrollLeft += br.right - r.right;
    }
  }
}

/** @param {number} k @param {string} title @param {string} state @param {string} sub @param {boolean} [warn] */
function navBtn(k, title, state, sub, warn = false) {
  return h('button', { type: 'button', class: `sd-nav-btn is-${state}${warn ? ' has-warn' : ''}`, 'data-at': k, 'aria-current': k === at ? 'step' : null },
    h('span', { class: 'sd-dot', 'aria-hidden': 'true' }, state === 'done' ? icon('check') : state === 'guide' ? icon('info') : null),
    h('span', { class: 'sd-nav-txt' }, h('span', {}, title), sub ? h('small', {}, sub) : null,
      h('span', { class: 'sr' }, (state === 'done' ? ' (decided)' : state === 'skip' ? ' (not needed)' : state === 'guide' ? ' (guide)' : ' (open)')
        + (warn ? ', has a warning' : ''))));
}

function paintPane() {
  const ex = extraAt(at);
  $('sd-pane').replaceChildren(...(at === 0 ? pathPane() : at === 1 ? profilePane() : at === ARCH_PAGE ? archPane() : ex === 'checks' ? checksPane() : ex === 'handoffs' ? handoffsPane()
    : stagePane(stageAt(at))).filter(Boolean));
  /* Sang trang khác: về đầu trang. Vẽ lại cùng trang (bấm một lựa chọn): giữ chỗ cuộn (repaint giữ ô vừa bấm đứng yên). */
  if (paneAt !== at) $('sd-pane').scrollTop = 0;
  paneAt = at;
  $('sd-pane').closest('.dlg-body').scrollTop = 0;
}

/** Dòng "Preset from template" (PLAN-033): hồ sơ, lối còn đúng như mẫu của dự án đặt sẵn; đổi một câu là ẩn. */
function presetNote() {
  const w = ws();
  const t = w && w.templateId ? tplOf(w.templateId) : null;
  return t && isPreset(w.design, presetDesign(t))
    ? h('p', { class: 'sd-tip', 'data-preset': t.id }, `Preset from template "${t.name}" — change any answer.`) : null;
}

/* ── Lối bắt đầu: "What do you deliver?" — luồng tối thiểu, vì sao hợp, khi nào đổi lối, khâu cần / bỏ, mốc nghiệm thu ── */

function pathPane() {
  const d = design();
  const p = pathOf(cat, d);
  return [
    h('p', { class: 'dlg-kicker' }, 'Start here'),
    h('h3', { class: 'sd-h' }, 'What do you deliver?'),
    presetNote(),
    h('p', { class: 'sd-q' }, 'Chọn thứ cuối cùng bạn bàn giao. Lối cho thấy luồng tối thiểu, khâu nào cần, khâu nào bỏ được; gợi ý ở từng khâu ưu tiên công cụ của lối.'), // lang: vi — lời giải thích, nội dung
    h('fieldset', { class: 'sd-paths' }, h('legend', { class: 'sr' }, 'What do you deliver?'),
      ...[...cat.paths, { id: '', label: 'Not sure yet', summary: 'Đi thẳng qua hồ sơ và từng khâu.' }].map((/** @type {any} */ x) => h('label', { class: 'sd-path-card' }, // lang: vi — lời giải thích, nội dung
        h('input', { type: 'radio', name: 'sd-path', value: x.id, 'data-path': '1', checked: (d?.path || '') === x.id }),
        h('span', { class: 'sd-path-txt' }, h('b', {}, x.label), h('small', {}, x.summary))))),
    p ? pathDetail(p) : null,
  ];
}

/** @param {any} p */
function pathDetail(p) {
  const by = (/** @type {string} */ need) => cat.stages.filter((/** @type {any} */ s) => p.stages[s.id] === need).map((/** @type {any} */ s) => s.title).join(', ');
  const row = (/** @type {string} */ k, /** @type {string} */ v) => (v ? h('p', { class: 'sd-when' }, h('span', { class: 'sd-k' }, k), v) : null);
  const mine = applied && applied.wsId === ws()?.id ? applied : null;
  return h('section', { class: 'sd-path-det', 'aria-label': p.label },
    h('h4', { class: 'sd-h4' }, 'Minimal flow'),
    h('ol', { class: 'sd-flowlist' }, ...p.flow.map((/** @type {string} */ x) => h('li', {}, x))),
    row('Why it fits', p.why), row('Switch when', p.switch),
    row('Needed', by('need')), row('Optional', by('maybe')), row('Not needed', by('skip')),
    h('h4', { class: 'sd-h4' }, 'Acceptance checkpoints'),
    h('ul', { class: 'sd-accept' }, ...p.accept.map((/** @type {string} */ a) => h('li', {}, a))),
    h('div', { class: 'sd-apply' },
      h('button', { type: 'button', class: 'btn go', 'data-apply': p.id }, icon('check'), 'Apply path'),
      h('span', { class: 'sd-help' }, 'Fills undecided stages with the suggested tool and marks the stages this path or your profile skips as Not needed. Stages you already decided stay as they are.')),
    mine ? h('p', { class: 'sd-applied', role: 'status' }, mine.text, ' ',
      mine.prev ? h('button', { type: 'button', class: 'sd-link', 'data-unapply': '1' }, 'Undo') : null) : null);
}

/** Áp lối: chỉ khâu chưa quyết; Hoàn tác trả đúng các khâu vừa đổi. @param {string} id */
function applyPathNow(id) {
  const w = ws();
  if (!w) return;
  const before = w.design ? JSON.parse(JSON.stringify(w.design)) : null;
  const r = applyPath(cat, w.design, id);
  const ids = [...r.filled, ...r.skipped];
  /** @type {Record<string, any>} */
  const prev = {};
  for (const k of ids) prev[k] = before?.stages[k] || null;
  w.design = r.next;
  commit();
  applied = { wsId: w.id, prev: ids.length ? prev : null, text: ids.length
    ? `Filled ${plural(r.filled.length, 'stage')}; marked ${r.skipped.length} Not needed.` : 'Nothing to fill: every stage is already decided.' };
}

function undoApply() {
  const a = applied;
  applied = null;
  if (!a || !a.prev || ws()?.id !== a.wsId) return;
  edit((d) => { for (const [k, v] of Object.entries(a.prev)) { if (v) d.stages[k] = v; else delete d.stages[k]; } });
  applied = { wsId: a.wsId, prev: null, text: 'Undone.' };
}

function profilePane() {
  const d = design();
  const prof = d?.profile || {};
  const p = pathOf(cat, d);
  const q2 = (/** @type {any} */ q) => {
    const assumed = !prof[q.id] && p && p.implies[q.id] ? q.choices.find((/** @type {any} */ c) => c.id === p.implies[q.id]) : null;
    return h('fieldset', { class: 'sd-prof' },
      h('legend', {}, q.label),
      q.help ? h('p', { class: 'sd-help' }, q.help) : null,
      assumed ? h('p', { class: 'sd-help' }, `The ${p.label} path assumes: ${assumed.label}.`) : null,
      h('div', { class: 'sd-pills' },
        ...[...q.choices, { id: '', label: 'Not sure' }].map((/** @type {any} */ c) => h('label', { class: 'sd-pill' },
          h('input', { type: 'radio', name: 'sd-' + q.id, value: c.id, 'data-q': q.id, checked: (prof[q.id] || '') === c.id }),
          h('span', {}, c.label)))));
  };
  /* Câu lối không cần: gập lại, vẫn trả lời được (câu đã trả lời vẫn dùng để gợi ý). */
  const asked = p ? cat.profile.filter((/** @type {any} */ q) => p.ask.includes(q.id)) : cat.profile;
  const rest = p ? cat.profile.filter((/** @type {any} */ q) => !p.ask.includes(q.id)) : [];
  return [
    h('p', { class: 'dlg-kicker' }, 'Your project'),
    h('h3', { class: 'sd-h' }, 'Project profile'),
    presetNote(),
    h('p', { class: 'sd-q' }, 'Trả lời những câu bạn biết; câu nào chưa chắc thì để "Not sure". Gợi ý ở từng khâu đổi theo câu trả lời.'), // lang: vi — lời giải thích, nội dung
    ...asked.map(q2),
    rest.length ? fold({ class: 'sd-more', 'data-more': 'profile-rest', open: moreOpen.has('profile-rest') },
      h('summary', {}, icon('chev'), `${plural(rest.length, 'question')} the ${p.label} path doesn't need`),
      ...rest.map(q2)) : null,
  ];
}

/* ── Kiến trúc (PLAN-042): các nhóm (danh mục `architectures`); mỗi nhóm chọn một kiến trúc hay để "Not chosen" (theo gợi ý từ
 * hồ sơ, lối, khâu đã quyết — `archState`). Nhóm app: chọn kiến trúc mang lối là chọn lối. Mỗi kiến trúc gập: khi dùng, khi tránh,
 * luồng, công cụ theo khâu (bấm tới khâu), lối tương ứng, nguồn ── */

function archPane() {
  const d = design();
  const fams = Array.isArray(cat.architectures) ? cat.architectures : [];
  const st = archState(cat, d);
  return [
    h('p', { class: 'dlg-kicker' }, 'Shape of the system'),
    h('h3', { class: 'sd-h' }, 'Architecture'),
    presetNote(),
    h('p', { class: 'sd-note', 'data-guide': '1' }, icon('info'),
      h('span', {}, 'Choose one architecture per family, or keep "Not chosen" to follow the recommendation. A choice comes before the profile when Apply path and the stage pages rank tools; tools you already picked stay.')),
    h('p', { class: 'sd-q' }, 'Kiến trúc là hình dạng lớn của hệ thống, quyết trước khi chọn công cụ cho từng khâu. Mỗi nhóm dưới đây trả lời một câu hỏi bằng vài kiến trúc chuẩn; trang gợi ý một kiến trúc mỗi nhóm theo hồ sơ dự án, lối đã chọn và các khâu đã quyết. Chọn khác gợi ý được, vd. dựng lakehouse cho dữ liệu nhỏ để học quản trị dữ liệu.'), // lang: vi — lời giải thích, nội dung
    archTip(fams, st.map((a) => ({ id: a.rec })), d),
    ...fams.map((/** @type {any} */ f, /** @type {number} */ i) => archFamily(f, st[i], d)),
  ];
}

/** Nhóm chưa có gợi ý: nói đúng thứ còn thiếu (archMissing) kèm lối tới trang ấy — lối, hồ sơ; chỉ còn khâu thì các khâu.
 * @param {any[]} fams @param {{id: string | null}[]} adv @param {any} d */
function archTip(fams, adv, d) {
  const none = fams.filter((_, i) => adv[i].id === null);
  if (!none.length) return null;
  const m = archMissing(cat, d);
  const go = (/** @type {number} */ at, /** @type {string} */ t) => h('button', { type: 'button', class: 'sd-link', 'data-at': at }, t);
  const title = (/** @type {string} */ id) => cat.stages.find((/** @type {any} */ s) => s.id === id).title;
  /** @type {[string, string, any[]][]} [loại, việc, nút] */
  const asks = [];
  if (m.path) asks.push(['path', 'pick what you deliver', [go(0, 'Go to What do you deliver?')]]);
  const qs = m.profile.map((id) => cat.profile.find((/** @type {any} */ q) => q.id === id).label);
  if (qs.length) asks.push(['profile', `answer the project profile${qs.length <= 3 ? ` (${qs.join(' · ')})` : ''}`, [go(1, 'Go to profile')]]);
  if (!asks.length && m.stages.length) asks.push(['stages', `decide ${m.stages.map(title).join(' or ')}`, m.stages.map((id) => go(stagePage(id), title(id)))]);
  if (!asks.length) return null;
  const what = asks.map((a) => a[1]).join(' or ');
  const forWhom = none.length < fams.length ? ` for ${none.map((f) => f.label).join(', ')}` : '';
  return h('p', { class: 'sd-tip', 'data-missing': asks.map((a) => a[0]).join(' ') },
    `${what[0].toUpperCase()}${what.slice(1)} to get a recommendation${forWhom}. `,
    ...asks.flatMap((a) => a[2]).flatMap((b, k) => (k ? [' · ', b] : [b])));
}

/** Nhóm chưa có gợi ý: đúng những câu còn thiếu của riêng nhóm ấy (archMissing trên danh mục chỉ có nhóm này), mỗi câu một
 * nút tới trang của nó. @param {any} f @param {any} d */
function famNeeds(f, d) {
  const m = archMissing({ ...cat, architectures: [f] }, d);
  const go = (/** @type {string} */ id, /** @type {number} */ k, /** @type {string} */ t) => h('button', { type: 'button', class: 'sd-link', 'data-at': k, 'data-need': id }, t);
  const list = [
    ...(m.path ? [go('path', 0, 'What do you deliver?')] : []),
    ...m.profile.map((id) => go(id, 1, cat.profile.find((/** @type {any} */ q) => q.id === id).label)),
    ...m.stages.map((id) => go(id, stagePage(id), cat.stages.find((/** @type {any} */ s) => s.id === id).title)),
  ];
  return list.length ? h('p', { class: 'sd-need' }, h('span', { class: 'sd-k' }, 'Needs'), ...list.flatMap((b, k) => (k ? [' · ', b] : [b]))) : null;
}

/** @param {any} f @param {{chosen: string, viaPath: boolean, rec: string | null, why: string, id: string | null}} a @param {any} d */
function archFamily(f, a, d) {
  const rec = a.rec ? f.entries.find((/** @type {any} */ e) => e.id === a.rec) : null;
  const chosen = a.chosen ? f.entries.find((/** @type {any} */ e) => e.id === a.chosen) : null;
  /* Hồ sơ nói khác kiến trúc đã chọn: không chặn, chỉ nói (PLAN-042). */
  const differs = chosen && a.rec !== null && a.rec !== a.chosen;
  return h('section', { class: 'sd-fam', 'data-fam': f.id, 'aria-labelledby': `sd-fam-${f.id}` },
    h('h4', { class: 'sd-h4', id: `sd-fam-${f.id}` }, f.label),
    h('p', { class: 'sd-help' }, f.question),
    /* Nhóm đã chọn kiến trúc khác: dòng gợi ý thành nền trung tính, không còn dáng "nên chọn". */
    rec ? h('p', { class: `sd-rec${differs ? ' is-other' : ''}`, 'data-rec': rec.id }, h('span', { class: 'sd-k' }, 'Recommended'), h('b', {}, rec.name), '. ', a.why)
      : a.rec === '' ? h('p', { class: 'sd-rec is-none', 'data-rec': '' }, h('span', { class: 'sd-k' }, 'Not needed'), a.why) : famNeeds(f, d),
    h('fieldset', { class: 'sd-prof sd-arch-pick' },
      h('legend', {}, h('span', { class: 'sd-k' }, 'Your choice'), h('span', { class: 'sr' }, `: ${f.label}`)),
      h('div', { class: 'sd-pills' }, ...[{ id: '', name: 'Not chosen' }, ...f.entries].map((/** @type {any} */ e) => h('label', { class: 'sd-pill' },
        h('input', { type: 'radio', name: `sd-arch-${f.id}`, value: e.id, 'data-arch-pick': f.id, checked: (a.chosen || '') === e.id }),
        h('span', {}, e.name))))),
    chosen ? archWhyField(f, a) : null,
    differs ? h('p', { class: 'sd-note', 'data-arch-info': f.id }, icon('info'), h('span', {},
      a.rec ? `Your profile and stages point to ${rec.name}. ${chosen.name} stays your choice — fine when the goal is to learn or demonstrate it; Apply path and the stage pages follow it.`
        : `Your profile and stages say this family is not needed. ${chosen.name} stays your choice — fine when the goal is to learn or demonstrate it.`)) : null,
    h('div', { class: 'sd-archs' }, ...f.entries.map((/** @type {any} */ e) => archItem(e, a, d))),
    f.note ? h('p', { class: 'sd-help' }, f.note) : null,
    (f.sources || []).length ? archLinks(f.sources) : null);
}

/** Lý do một dòng của kiến trúc đã chọn (kiểu ADR), ngay dưới hàng chọn; ghi khi gõ. @param {any} f @param {{reason: string}} a */
const archWhyField = (f, a) => h('label', { class: 'field' }, h('span', {}, 'Why this choice (optional)'),
  h('input', { type: 'text', class: 'input', maxlength: OWN_MAX, value: a.reason, 'data-arch-why': f.id,
    placeholder: 'One line: why this architecture, e.g. to demonstrate data management' }));

/** @param {any[]} list */
const archLinks = (list) => h('ul', { class: 'sd-links' }, ...list.map((/** @type {any} */ l) =>
  h('li', {}, h('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer' }, icon('link'), l.title))));

/** @param {any} e @param {{chosen: string, viaPath: boolean, rec: string | null, id: string | null}} a trạng thái của nhóm @param {any} d */
function archItem(e, a, d) {
  const id = 'arch:' + e.id;
  const p = e.path ? cat.paths.find((/** @type {any} */ x) => x.id === e.path) : null;
  const mine = !!p && d?.path === p.id;
  const isRec = a.rec === e.id, isChosen = a.chosen === e.id;
  const row = (/** @type {string} */ k, /** @type {any[]} */ ...v) => h('p', { class: 'sd-when' }, h('span', { class: 'sd-k' }, k), ...v);
  const tools = Object.entries(e.tools || {}).map(([sid, ids]) => {
    const s = cat.stages.find((/** @type {any} */ x) => x.id === sid);
    if (!s) return null;
    const names = /** @type {string[]} */ (ids).map((oid) => s.options.find((/** @type {any} */ o) => o.id === oid)?.name).filter(Boolean);
    return h('li', {}, h('button', { type: 'button', class: 'sd-link', 'data-at': stagePage(sid) }, s.title), `: ${names.join(', ')}`);
  }).filter(Boolean);
  /* Viền xanh: kiến trúc đang dùng (đã chọn, chưa chọn thì cái gợi ý). Thẻ "Recommended" đặc khi nhóm chưa chọn gì. */
  return fold({ class: `sd-arch${a.id === e.id ? ' is-rec' : ''}`, 'data-more': id, 'data-arch': e.id, open: moreOpen.has(id) },
    h('summary', {}, icon('chev'), h('span', { class: 'sd-arch-name' },
      h('span', { class: 'sd-arch-head' }, h('b', {}, e.name),
        isChosen && !mine ? h('span', { class: 'sd-tag top' }, 'Chosen') : null,
        isRec ? h('span', { class: `sd-tag ${a.chosen ? 'fit' : 'top'}` }, 'Recommended') : null,
        mine ? h('span', { class: 'sd-tag top' }, 'Your deliverable') : null),
      h('small', {}, e.what))),
    row('Use when', e.use),
    row('Avoid when', e.avoid),
    h('div', { class: 'sd-when' }, h('span', { class: 'sd-k' }, 'Flow'),
      h('ol', { class: 'sd-chain' }, ...e.flow.map((/** @type {string} */ x) => h('li', {}, h('span', {}, x))))),
    tools.length ? h('div', { class: 'sd-when' }, h('span', { class: 'sd-k' }, 'Tools by stage'), h('ul', { class: 'sd-arch-tools' }, ...tools)) : null,
    p ? row('Deliverable', p.label, mine ? ' (chosen)' : ' — choosing this architecture sets it') : null,
    (e.sources || []).length ? archLinks(e.sources) : null);
}

/* ── Bàn giao: mỗi đường nối giữa hai khâu đã quyết liền nhau — đi qua gì, giao gì, bên sau đọc ở đâu, hứa gì, kiểm thế nào ── */

function handoffsPane() {
  const d = design();
  const edges = flowEdges(cat, d);
  const kept = Object.keys(d?.edges || {}).filter((k) => !edges.some((e) => e.key === k)).length;
  return [
    h('p', { class: 'dlg-kicker' }, 'Review'),
    h('h3', { class: 'sd-h' }, 'Handoffs'),
    h('p', { class: 'sd-q' }, 'Mỗi đường nối giữa hai khâu đã quyết là một chỗ bàn giao: bên trước đưa gì, bên sau đọc ở đâu và bằng cách nào, hai bên hứa gì, kiểm thế nào là đã nối được. Điền vài đường quan trọng là đủ.'), // lang: vi — lời giải thích, nội dung
    edges.length ? null : h('p', { class: 'sd-tip' }, 'Decide two neighbouring stages on the diagram to describe the handoff between them.'),
    ...edges.map(edgeItem),
    kept ? h('p', { class: 'sd-help' }, `${plural(kept, 'handoff')} kept for stages that are no longer decided or next to each other.`) : null,
  ];
}

/** Dòng tóm tắt của một bàn giao (đầu khối gập). @param {any} c hợp đồng, null khi chưa ghi */
const edgeSum = (c) => (c ? [viaLabel(c.via), c.what].filter(Boolean).join(' · ') || 'Described' : 'Not described yet');

/** Đang gõ hợp đồng: cập nhật đầu khối gập (tóm tắt, viền đã ghi) mà không vẽ lại hộp. @param {string} key */
function paintEdgeHead(key) {
  const item = $('sd-pane').querySelector(`[data-edge-item="${CSS.escape(key)}"]`);
  if (!item) return;
  const c = flowEdges(cat, design()).find((x) => x.key === key)?.c || null;
  item.classList.toggle('is-set', !!c);
  const small = item.querySelector(':scope > summary .sd-edge-name small');
  if (small) small.textContent = edgeSum(c);
}

/** @param {any} e */
function edgeItem(e) {
  const c = e.c || {};
  const id = 'edge:' + e.key;
  const sum = edgeSum(e.c);
  const field = (/** @type {string} */ label, /** @type {string} */ f, /** @type {string} */ ph) => h('label', { class: 'field' }, h('span', {}, label),
    f === 'promise'
      ? h('textarea', { rows: 3, 'data-ef': f, 'data-edge': e.key, placeholder: ph }, c[f] || '')
      : h('input', { type: 'text', class: 'input', maxlength: EDGE_MAX, value: c[f] || '', 'data-ef': f, 'data-edge': e.key, placeholder: ph }));
  return fold({ class: `sd-edge-item${e.c ? ' is-set' : ''}`, 'data-more': id, 'data-edge-item': e.key, open: moreOpen.has(id) },
    h('summary', {}, icon('chev'), h('span', { class: 'sd-edge-name' }, h('b', {}, `${e.from.title} → ${e.to.title}`), h('small', {}, sum))),
    h('fieldset', { class: 'sd-prof' }, h('legend', {}, 'Handed over as'),
      h('div', { class: 'sd-pills' }, ...[...VIA, { id: '', label: 'Not set' }].map((v) => h('label', { class: 'sd-pill' },
        h('input', { type: 'radio', name: `sd-via-${e.key}`, value: v.id, 'data-via': e.key, checked: (c.via || '') === v.id }), h('span', {}, v.label))))),
    field('What is handed over', 'what', 'e.g. matches.parquet: one row per match, key match_id'),
    field('Where and how the next stage reads it', 'where', 'e.g. data/clean/ in the repo; the backend opens it read-only'),
    field('Promises: columns, meaning, order, version', 'promise', 'e.g. required columns; home_win = 0 also counts draws; rows ordered by seq; snapshot date in the file name'),
    field('How to check the connection', 'check', 'e.g. the backend reads the sample file, filters one season and returns the expected match count'));
}

/* ── Xem lại: các luật phối hợp đang báo (danh mục `checks`), mỗi cái kèm lối tới khâu liên quan ── */

function checksPane() {
  const all = warnings(cat, design());
  const warns = all.filter((x) => !x.arch), notes = all.filter((x) => x.arch);
  const title = (/** @type {string} */ id) => cat.stages.find((/** @type {any} */ s) => s.id === id)?.title || id;
  return [
    h('p', { class: 'dlg-kicker' }, 'Review'),
    h('h3', { class: 'sd-h' }, 'Checks'),
    h('p', { class: 'sd-q' }, 'Những cặp lựa chọn hay vấp khi ghép với nhau. Trang chỉ báo khi các khâu liên quan đã quyết.'), // lang: vi — lời giải thích, nội dung
    warns.length ? h('ul', { class: 'sd-warns' }, ...warns.map((x) => h('li', { class: 'sd-warnbox' },
      h('b', {}, x.title), h('p', {}, x.msg),
      h('p', { class: 'sd-warn-go' }, ...x.stages.map((id) => h('button', { type: 'button', class: 'btn small', 'data-at': stagePage(id) }, title(id)))))))
      : h('p', { class: 'sd-tip' }, 'No conflicts found among the decided stages.'),
    notes.length ? h('h4', { class: 'sd-h4' }, 'Expected with your chosen architecture') : null,
    ...notes.map(archNote),
  ];
}

/** Luật hồ sơ ↔ công cụ mà kiến trúc người dùng chọn giải thích: lời nhắc, không phải cảnh báo (PLAN-042). @param {any} x */
const archNote = (x) => h('div', { class: 'sd-tip', role: 'note', 'data-arch-note': x.id },
  h('b', {}, x.title), ` — expected with ${archName(x.arch)}, which you chose. `, x.msg);

/** @param {any} s */
function stagePane(s) {
  const d = design();
  const prof = effProfile(cat, d);
  const p = pathOf(cat, d);
  const st = d?.stages[s.id] || { pick: [], skip: false, own: '', note: '' };
  const lists = stageLists(cat, d, s.id, false);
  const ranked = rankOptions(s, prof, p, lists);
  const picked = ranked.filter((r) => st.pick.includes(r.opt.id));
  const rest = ranked.filter((r) => !st.pick.includes(r.opt.id));
  const hasPick = picked.length > 0 || !!st.own;
  const answered = Object.keys(prof).length > 0 || !!p || lists.length > 0;
  const card = (/** @type {any} */ r) => optionCard(s, r, st.pick.includes(r.opt.id), answered, prof);
  const need = p ? p.stages[s.id] : '';
  /* Hồ sơ cho là khâu không cần (`when` của khâu): nói câu trả lời nào. */
  const notNeeded = notNeededBy(s, prof).map((k) => {
    const q = cat.profile.find((/** @type {any} */ x) => x.id === k);
    return `${q?.label || k} ${q?.choices.find((/** @type {any} */ c) => c.id === prof[k])?.label || prof[k]}`;
  });
  return [
    h('p', { class: 'dlg-kicker' }, `${LANE_LABEL[/** @type {'data'} */ (s.lane)]} · stage ${at - FIRST_STAGE + 1}`),
    h('h3', { class: 'sd-h' }, s.title),
    h('p', { class: 'sd-q' }, s.question),
    h('div', { class: 'sd-guide' }, ...s.guide.split('\n').map((/** @type {string} */ l) => h('p', {}, l))),
    !answered ? h('p', { class: 'sd-tip' }, 'Pick what you deliver or answer the project profile to get a recommendation. ',
      h('button', { type: 'button', class: 'sd-link', 'data-at': 0 }, 'Go to start')) : null,
    need === 'skip' ? h('p', { class: 'sd-tip' }, `The ${p.label} path doesn't need this stage.`)
      : notNeeded.length ? h('p', { class: 'sd-tip' }, `Usually not needed for your profile (${notNeeded.join(' · ')}).`)
        : need === 'maybe' ? h('p', { class: 'sd-tip' }, `Optional on the ${p.label} path.`) : null,
    ...warnings(cat, d).filter((x) => x.stages.includes(s.id)).map((x) => (x.arch ? archNote(x)
      : h('div', { class: 'sd-warnbox', role: 'note' }, h('b', {}, x.title), h('p', {}, x.msg)))),
    h('div', { class: 'sd-skip' },
      h('button', { type: 'button', class: 'btn small', 'aria-pressed': String(st.skip), 'data-skip': s.id }, 'Not needed'),
      s.skipWhen ? h('span', { class: 'sd-help' }, s.skipWhen) : null),
    st.skip ? null : h('div', { class: 'sd-opts', role: 'group', 'aria-label': s.multi ? 'Options (pick one or more)' : 'Options (pick one)' },
      ...(hasPick ? picked : ranked).map(card),
      hasPick && rest.length ? fold({ class: 'sd-more', 'data-more': s.id, open: moreOpen.has(s.id) },
        h('summary', {}, icon('chev'), `Show ${plural(rest.length, 'other option')}`),
        ...rest.map(card)) : null),
    st.skip ? null : h('label', { class: 'field' }, h('span', {}, 'Another tool (not in the list)'),
      h('input', { type: 'text', class: 'input', maxlength: OWN_MAX, value: st.own, 'data-own': s.id, placeholder: 'e.g. a tool your class or team already uses' })),
    h('label', { class: 'field' }, h('span', {}, 'Why this choice (optional)'),
      h('textarea', { rows: 3, 'data-note': s.id, placeholder: 'The reason, what you ruled out, what would make you switch' }, st.note)),
  ];
}

/** @param {any} s @param {any} r @param {boolean} on @param {boolean} answered @param {Record<string,string>} prof */
function optionCard(s, r, on, answered, prof) {
  const o = r.opt;
  const said = (/** @type {string} */ k) => {
    const q = cat.profile.find((/** @type {any} */ x) => x.id === k);
    const c = q?.choices.find((/** @type {any} */ x) => x.id === prof[k]);
    return q && c ? `${q.label}: ${c.label}` : k;
  };
  const miss = r.miss.map(said);
  return h('div', { class: `sd-opt${on ? ' is-on' : ''}${answered && r.ok ? ' is-fit' : ''}${answered && !r.ok ? ' is-miss' : ''}`, 'data-opt': o.id },
    h('label', { class: 'sd-opt-top' },
      h('input', { type: 'checkbox', 'data-pick': s.id, value: o.id, checked: on }),
      h('span', { class: 'sd-opt-name' }, h('b', {}, o.name), h('small', {}, o.kind)),
      h('span', { class: 'sd-tags' },
        r.top ? h('span', { class: 'sd-tag top' }, 'Recommended') : answered && r.ok ? h('span', { class: 'sd-tag fit' }, 'Fits') : null,
        r.sug && !r.top ? h('span', { class: 'sd-tag' }, 'On path') : null,
        r.arch ? h('span', { class: 'sd-tag', 'data-arch-tag': r.arch }, archName(r.arch)) : null,
        h('span', { class: 'sd-tag' }, COST_LABEL[/** @type {'free'} */ (o.cost)] || o.cost),
        h('span', { class: 'sd-tag' }, LEVEL_LABEL[/** @type {1} */ (o.level)] || ''))),
    h('p', { class: 'sd-sum' }, o.summary),
    h('p', { class: 'sd-when' }, h('span', { class: 'sd-k' }, 'Pick when'), o.pick),
    answered && !r.ok ? h('p', { class: 'sd-when sd-warn' }, h('span', { class: 'sd-k' }, 'Not a fit'), miss.join(' · ')) : null,
    r.relaxed.length ? h('p', { class: 'sd-when', 'data-relaxed': r.relaxed.join(' ') }, h('span', { class: 'sd-k' }, 'Profile says'),
      `${r.relaxed.map(said).join(' · ')} — kept: you chose ${archName(r.arch)}.`) : null,
    fold({ class: 'sd-det' },
      h('summary', {}, icon('chev'), 'Details, links, first commands'),
      o.avoid ? h('p', { class: 'sd-when' }, h('span', { class: 'sd-k' }, 'Avoid when'), o.avoid) : null,
      o.task ? h('p', { class: 'sd-when' }, h('span', { class: 'sd-k' }, 'Done when'), o.task) : null,
      (o.links || []).length ? h('ul', { class: 'sd-links' }, ...o.links.map((/** @type {any} */ l) =>
        h('li', {}, h('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer' }, icon('link'), l.title)))) : null,
      (o.setup || []).length ? h('pre', { class: 'sd-cmd' }, h('code', {}, o.setup.join('\n'))) : null));
}

/* ── Sự kiện ── */

/** Vẽ lại hộp, giữ focus ở ô vừa bấm (nút DOM được dựng lại) và giữ ô ấy đứng yên trên màn: cuộn khung phải bù phần nội dung
 * phía trên đổi cao; ô dời tới chỗ khuất thì cuộn vừa đủ thấy. @param {string} [sel] */
function repaint(sel) {
  const pane = $('sd-pane');
  const old = sel ? pane.querySelector(sel) : null;
  const y0 = old ? old.getBoundingClientRect().top : null;
  paint();
  const el = sel && $('dlg-sd').querySelector(sel);
  if (!el) return;
  if (y0 !== null && pane.contains(el)) pane.scrollTop += el.getBoundingClientRect().top - y0;
  el.focus({ preventScroll: true });
  const r = el.getBoundingClientRect(), p = pane.getBoundingClientRect();
  if (pane.contains(el) && (r.bottom < p.top || r.top > p.bottom)) el.scrollIntoView({ block: 'nearest' });
}

function go(/** @type {number} */ k) {
  at = Math.max(0, Math.min(lastPage(), k));
  paint();
  $('sd-pane').focus({ preventScroll: true });
}

function wire() {
  $('sd-open').addEventListener('click', () => openDesign(0));
  $('sd-svg').addEventListener('click', downloadSvg);
  $('sd-plan').addEventListener('click', openPlan);
  $('sdp-form').addEventListener('submit', (/** @type {any} */ e) => { e.preventDefault(); applyPlanNow(); });
  $('sd-prev').addEventListener('click', () => go(at - 1));
  $('sd-next').addEventListener('click', () => (at === lastPage() ? $('dlg-sd').close() : go(at + 1)));
  $('sd-nav').addEventListener('click', (/** @type {any} */ e) => {
    const b = e.target.closest('[data-at]');
    if (b) go(+b.dataset.at);
  });
  const fig = $('sd-fig');
  const openNode = (/** @type {any} */ e) => {
    const hand = e.target.closest && e.target.closest('[data-edge]');
    if (hand && cat) { openDesign(extraPage('handoffs'), hand.dataset.edge); return; }
    const n = e.target.closest && e.target.closest('[data-stage]');
    if (!n || !cat) return;
    openDesign(stagePage(n.dataset.stage));
  };
  fig.addEventListener('click', openNode);
  /* Đóng hộp mà nút sơ đồ mở hộp không còn (khâu vừa thành Not needed, đường nối mất): focus về khung, trang đứng yên.
   * Window, pha bắt: chạy trước restoreFocus của dialogs.js (document), vốn rơi về bảng và cuộn trang. Còn nút cùng chỗ thì để
   * restoreFocus tìm lại. Hộp đã mở lại (sự kiện close cũ tới muộn): giữ nút mở của lần mở mới. */
  addEventListener('close', (/** @type {Event} */ e) => {
    const o = figOpener;
    if (e.target !== $('dlg-sd') || !o || $('dlg-sd').open) return;
    figOpener = null;
    const a = document.activeElement;
    if (o.isConnected || (a && a !== document.body && !$('dlg-sd').contains(a))) return;
    const key = o.getAttribute('data-stage') ? `[data-stage="${CSS.escape(o.getAttribute('data-stage') || '')}"]` : `[data-edge="${CSS.escape(o.getAttribute('data-edge') || '')}"]`;
    if (!fig.querySelector(key)) focusFig();
  }, true);
  $('sd-arch').addEventListener('click', (/** @type {any} */ e) => { if (e.target.closest('[data-arch-open]') && cat) openDesign(ARCH_PAGE); });
  $('sd-warns').addEventListener('click', (/** @type {any} */ e) => {
    const b = e.target.closest('[data-warn-stage]');
    if (b && cat) openDesign(b.dataset.warnStage ? stagePage(b.dataset.warnStage) : extraPage('checks'));
  });
  /* Enter mở nút / nhãn có focus; Space do diagram-view.js lo (giữ Space là kéo, thả mà chưa kéo mới là bấm). */
  fig.addEventListener('keydown', (/** @type {KeyboardEvent} */ e) => { if (e.key === 'Enter') { e.preventDefault(); openNode(e); } });
  initDiagramView({ fig, bar: $('sd-zoom'), out: $('sd-zoom-out'), in: $('sd-zoom-in'), pct: $('sd-zoom-pct'), reset: $('sd-view-reset'), hint: $('sd-zoom-hint'),
    activate: (el) => openNode({ target: el }) });
  let lastW = 0;
  new ResizeObserver(() => {
    const w = fig.clientWidth;
    if (cat && ws() && w !== lastW) { lastW = w; drawDiagram(); }
  }).observe(fig);

  const pane = $('sd-pane');
  pane.addEventListener('click', (/** @type {any} */ e) => {
    const b = e.target.closest('[data-at]');
    if (b) { go(+b.dataset.at); return; }
    const ap = e.target.closest('[data-apply]');
    if (ap) { applyPathNow(ap.dataset.apply); repaint('[data-apply]'); return; }
    if (e.target.closest('[data-unapply]')) { undoApply(); repaint('[data-apply]'); return; }
    const sk = e.target.closest('[data-skip]');
    if (sk) {
      const id = sk.dataset.skip;
      edit((d) => { const r = stageRec(d, id); r.skip = !r.skip; });
      repaint(`[data-skip="${id}"]`);
    }
  });
  pane.addEventListener('toggle', (/** @type {any} */ e) => {
    const m = e.target.dataset?.more;
    if (m) { if (e.target.open) moreOpen.add(m); else moreOpen.delete(m); }
  }, true);
  pane.addEventListener('change', (/** @type {any} */ e) => {
    const t = e.target;
    if (t.dataset.via) {
      const k = t.dataset.via;
      edit((d) => { const r = edgeRec(d, k); r.via = t.value; });
      repaint(`input[data-via="${k}"][value="${t.value}"]`);
    } else if (t.dataset.path) {
      applied = null;
      edit((d) => { d.path = t.value; });
      repaint(`input[data-path][value="${t.value}"]`);
    } else if (t.dataset.archPick) {
      /* Nhóm app: kiến trúc mang lối là lối (một chỗ lưu); "Not chosen" bỏ cả lối. */
      const f = cat.architectures.find((/** @type {any} */ x) => x.id === t.dataset.archPick);
      const e = f.entries.find((/** @type {any} */ x) => x.id === t.value);
      const hasPath = f.entries.some((/** @type {any} */ x) => x.path);
      const path0 = design()?.path || '';
      edit((d) => {
        d.arch = d.arch || {};
        if (e?.path) { d.path = e.path; delete d.arch[f.id]; } else if (e) d.arch[f.id] = e.id;
        else {
          delete d.arch[f.id];
          if (d.archWhy) delete d.archWhy[f.id];
          if (hasPath && f.entries.some((/** @type {any} */ x) => x.path === d.path)) d.path = '';
        }
      });
      if ((design()?.path || '') !== path0) applied = null;
      repaint(`input[data-arch-pick="${f.id}"][value="${t.value}"]`);
    } else if (t.dataset.q) {
      const q = t.dataset.q;
      edit((d) => { if (t.value) d.profile[q] = t.value; else delete d.profile[q]; });
      repaint(`input[data-q="${q}"][value="${t.value}"]`);
    } else if (t.dataset.pick) {
      const id = t.dataset.pick, s = cat.stages.find((/** @type {any} */ x) => x.id === id);
      edit((d) => {
        const r = stageRec(d, id);
        if (!t.checked) r.pick = r.pick.filter((/** @type {string} */ x) => x !== t.value);
        else r.pick = s.multi ? [...r.pick, t.value] : [t.value];
      });
      if (t.checked && !s.multi) moreOpen.delete(id);
      repaint(`[data-opt="${t.value}"] input`);
    }
  });
  /* Chữ: ghi khi gõ (không vẽ lại hộp, kẻo mất con trỏ), chỉ cập nhật cột trái và mục trên trang. */
  pane.addEventListener('input', (/** @type {any} */ e) => {
    const t = e.target;
    if (t.dataset.archWhy) {
      edit((d) => { d.archWhy = { ...(d.archWhy || {}), [t.dataset.archWhy]: t.value }; });
      return;
    }
    if (t.dataset.ef) {
      edit((d) => { edgeRec(d, t.dataset.edge)[t.dataset.ef] = t.value; });
      paintNav();
      paintEdgeHead(t.dataset.edge);
      return;
    }
    const id = t.dataset.own || t.dataset.note;
    if (!id) return;
    edit((d) => { const r = stageRec(d, id); if (t.dataset.own) r.own = t.value; else r.note = t.value; });
    paintNav();
    paintSub();
  });
  /* Ô tự ghi: rời ô thì vẽ lại (phương án khác gập lại khi khâu đã có lựa chọn). */
  pane.addEventListener('focusout', (/** @type {any} */ e) => {
    if (e.target.dataset?.own && !pane.contains(e.relatedTarget)) paintPane();
  });
}

/* ── Khởi động: gắn sự kiện, rồi nạp danh mục ── */

export async function initDesign() {
  wire();
  try {
    const res = await fetch('data/system-design.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const c = await res.json();
    const err = catalogErrors(c);
    if (err.length) throw new Error(err[0]);
    cat = c;
  } catch (e) {
    catError = 'Could not load data/system-design.json, so the system design guide is unavailable (' + String(/** @type {any} */ (e).message || e) + ').';
  }
  if (ws()) renderSection();
}

/** Danh mục cho Markdown (tên khâu, phương án, lối dễ đọc; toMarkdown chỉ đọc); chưa nạp thì null. */
export function mdLabels() {
  return cat;
}
