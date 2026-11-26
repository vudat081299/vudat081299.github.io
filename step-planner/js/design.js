// @ts-check
/* System design (PLAN-016): mục trên trang (sơ đồ tự vẽ, nút) và hộp chọn từng khâu (#dlg-sd).
 * Danh mục: data/system-design.json. Logic thuần: design-core.js. Chữ người dùng chỉ vào DOM qua text node. */
import * as D from './design-core.js';
import * as C from './core.js';

const NS = 'http://www.w3.org/2000/svg';
const LANE_LABEL = { data: 'Data', model: 'Model', app: 'App', ops: 'Operations' };
const COST_LABEL = { free: 'Free', freemium: 'Free tier', paid: 'Paid' };
const LEVEL_LABEL = { 1: 'Beginner', 2: 'Some setup', 3: 'Advanced' };

/** @type {any} */ let cat = null;
let catError = '';
/** @type {any} */ let deps = null;
let at = 0;                       // trang của hộp: 0 = lối bắt đầu, 1 = hồ sơ dự án, 2 = kiến trúc, k ≥ 3 = khâu thứ k − 2
const moreOpen = new Set();       // khâu đang mở "Show other options"
/** Lần "Apply path" gần nhất (Hoàn tác là một dòng trong hộp: toast bị hộp modal che). @type {any} */
let applied = null;
const ARCH_PAGE = 2;
const FIRST_STAGE = 3;

const $ = (/** @type {string} */ id) => /** @type {any} */ (document.getElementById(id));

/** @param {string} tag @param {Record<string, any>} [attrs] @param {...any} kids */
function svg(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null && v !== false) el.setAttribute(k, String(v));
  for (const kid of kids.flat()) if (kid != null && kid !== false && kid !== '') el.append(kid instanceof Node ? kid : String(kid));
  return el;
}

const ws = () => deps.cur();
const design = () => ws()?.design || null;
const stageAt = (/** @type {number} */ k) => cat.stages[k - FIRST_STAGE];
/* Sau các khâu: trang xem lại (luật phối hợp). */
const EXTRA = ['handoffs', 'checks'];
const lastPage = () => cat.stages.length + FIRST_STAGE - 1 + EXTRA.length;
const extraAt = (/** @type {number} */ k) => EXTRA[k - FIRST_STAGE - cat.stages.length] || '';
const extraPage = (/** @type {string} */ kind) => cat.stages.length + FIRST_STAGE + EXTRA.indexOf(kind);
const stagePage = (/** @type {string} */ id) => cat.stages.findIndex((/** @type {any} */ s) => s.id === id) + FIRST_STAGE;

/** Sửa thiết kế của dự án đang mở rồi ghi; thiết kế trống thì về null. @param {(d: any) => void} fn */
function edit(fn) {
  const w = ws();
  if (!w) return;
  const d = w.design ? w.design : D.emptyDesign();
  fn(d);
  w.design = D.normDesign(d);
  deps.commit();
}

/** Trạng thái lưu của một khâu (bản sửa được). @param {any} d @param {string} id */
const stageRec = (d, id) => (d.stages[id] = d.stages[id] || { pick: [], skip: false, own: '', note: '' });

/** Khối gập của hộp: phần mở nằm trong một div (`.sd-fold`), vì nội dung của <details> không nhận gap của flex.
 * @param {Record<string, any>} attrs @param {any} summary @param {...any} kids */
const fold = (attrs, summary, ...kids) => deps.h('details', attrs, summary, deps.h('div', { class: 'sd-fold' }, ...kids));

/** Bàn giao của một đường nối (bản sửa được). @param {any} d @param {string} key */
const edgeRec = (d, key) => ((d.edges = d.edges || {})[key] = d.edges[key] || { via: '', what: '', where: '', promise: '', check: '' });

/* ── Mục trên trang ── */

export function renderSection() {
  const w = ws();
  if (!w) return;
  if (!cat) {
    $('sd-count').textContent = '';
    $('sd-open').disabled = true;
    $('sd-fig').replaceChildren(deps.h('p', { class: 'sd-empty' }, catError || 'Loading the stage list…'));
    return;
  }
  const n = D.decidedCount(cat, w.design);
  $('sd-count').textContent = `${n.done}/${n.total}`;
  $('sd-open').disabled = false;
  $('sd-open-text').textContent = n.done ? 'Edit the design' : 'Design the system';
  const diff = D.planDiff(cat, w);
  $('sd-plan').hidden = !diff.length;
  $('sd-plan-text').textContent = diff.some((x) => x.sub) ? 'Update plan' : 'Add tasks to plan';
  const p = D.pathOf(cat, w.design);
  $('sd-path').hidden = !p;
  $('sd-path').textContent = p ? `Deliverable: ${p.label}` : '';
  renderArchLine(w.design);
  $('sd-svg').hidden = !n.done;
  drawDiagram();
  const warns = D.warnings(cat, w.design);
  $('sd-warns').hidden = !warns.length;
  $('sd-warns').replaceChildren(...warns.map((x) => deps.h('li', { class: 'sd-warnbox' },
    deps.h('button', { type: 'button', class: 'sd-link', 'data-warn-stage': x.stages[0] || '' }, x.title), ' ', x.msg)));
}

/** Dòng kiến trúc trên trang: tên các kiến trúc gợi ý (bấm là mở trang Architecture của hộp). @param {any} d */
function renderArchLine(d) {
  const el = $('sd-arch');
  const fams = Array.isArray(cat.architectures) ? cat.architectures : [];
  el.hidden = !fams.length;
  const names = D.archAdvice(cat, d).map((a, i) => fams[i].entries.find((/** @type {any} */ e) => e.id === a.id)?.name).filter(Boolean);
  el.replaceChildren(deps.h('button', { type: 'button', class: 'sd-link', 'data-arch-open': '1' }, names.length ? 'Architecture' : 'Architecture guide'),
    names.length ? `: ${names.join(' · ')}` : ': answer the profile for a recommendation');
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

function drawDiagram() {
  const fig = $('sd-fig');
  const { flow, ops } = D.diagramNodes(cat, design());
  const cs = getComputedStyle(fig);
  const W = Math.max(fig.clientWidth - px(cs, 'padding-left', 0) - px(cs, 'padding-right', 0) - 4, 240);
  const gx = px(cs, '--sd-gap-x', 40), gy = px(cs, '--sd-gap-y', 36), maxW = px(cs, '--sd-node-max', 220);
  const pad = px(cs, '--sd-pad', 12), head = px(cs, '--sd-head', 30), lh = px(cs, '--sd-line', 20);
  const gxHand = Math.max(gx, px(cs, '--sd-gap-hand', 128));
  const edges = new Map(D.flowEdges(cat, design()).map((e) => [e.key, e]));
  /* Khoảng giữa cột c và c + 1: một đường nối ngang qua đó có hợp đồng thì nới tới --sd-gap-hand, để nhãn không chiếm cả đường.
   * Số cột: nhiều nhất (≤ 5) mà nút còn rộng ≥ min(--sd-node-max, 180). */
  const gapsFor = (/** @type {number} */ k) => {
    const g = Array(Math.max(0, k - 1)).fill(gx);
    for (let i = 1; i < flow.length; i++) {
      const a = D.snake(i - 1, k), b = D.snake(i, k);
      if (a.row === b.row && edges.get(`${flow[i - 1].id}>${flow[i].id}`)?.c) g[Math.min(a.col, b.col)] = gxHand;
    }
    return g;
  };
  const sum = (/** @type {number[]} */ a) => a.reduce((t, x) => t + x, 0);
  const minNode = Math.min(maxW, 180);
  let cols = 5, gaps = gapsFor(cols);
  while (cols > 1 && cols * minNode + sum(gaps) > W) gaps = gapsFor(--cols);
  const nw = Math.min(maxW, (W - sum(gaps)) / cols);
  const colX = gaps.reduce((xs, g, c) => [...xs, xs[c] + nw + g], [0]);
  const nameFont = `600 ${cs.getPropertyValue('--fs-sm').trim() || '13px'} ${cs.getPropertyValue('--sans').trim()}`;
  const titleFont = `500 ${cs.getPropertyValue('--fs-xs').trim() || '12px'} ${cs.getPropertyValue('--mono').trim()}`;
  const lineCount = (/** @type {any} */ n) => (n.lane === 'end' ? 1 : Math.max(1, Math.min(n.names.length, MAX_NAMES + 1)));
  const nodeH = (/** @type {any} */ n) => head + lineCount(n) * lh + pad;

  /* Luồng: rắn bò; mỗi hàng cao bằng nút cao nhất của hàng. */
  const rows = /** @type {number[]} */ ([]);
  flow.forEach((n, i) => { const r = D.snake(i, cols).row; rows[r] = Math.max(rows[r] || 0, nodeH(n)); });
  const rowY = rows.map((_, r) => rows.slice(0, r).reduce((a, b) => a + b + gy, 0));
  const pos = flow.map((n, i) => { const p = D.snake(i, cols); return { n, x: colX[p.col], y: rowY[p.row], h: rows[p.row], row: p.row }; });
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
      ? (b.x > a.x ? `M${a.x + nw} ${a.y + a.h / 2}H${b.x - 3}` : `M${a.x} ${a.y + a.h / 2}H${b.x + nw + 3}`)
      : `M${a.x + nw / 2} ${a.y + a.h}V${b.y - 3}`;
    /* Nét liền khi cả hai đầu đã quyết, còn lại nét đứt; đầu mũi tên luôn liền. */
    const line = svg('path', { class: `sd-edge${D.bothDecided(a.n, b.n) ? '' : ' is-open'}`, d, 'data-pair': key, 'marker-end': 'url(#sd-arrow)' });
    const e = edges.get(key);
    if (!e) { links.append(line); continue; }
    /* Nhãn ở giữa khoảng trống giữa hai nút; dài nhất --sd-hand-cap lần chiều dài đường (đường dọc: lần bề rộng nút). */
    const x0 = Math.min(a.x, b.x) + nw, x1 = Math.max(a.x, b.x);
    links.append(svg('g', { class: 'sd-wire', 'data-edge': key },
      svg('path', { class: 'sd-hit', d }), line,
      handEl(e, same ? (x0 + x1) / 2 : a.x + nw / 2, same ? a.y + a.h / 2 : a.y + a.h + gy / 2, (same ? x1 - x0 : nw) * dim.cap, dim, i)));
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
    svg('path', { class: cls, d: 'M4 2L10 6L4 10' }));
  const el = svg('svg', { class: 'sd-svg', viewBox: `-2 -2 ${width + 4} ${y + 4}`, width: width + 4, height: y + 4, role: 'img', 'aria-label': label },
    svg('defs', {}, arrow('sd-arrow', 'sd-arrow'), arrow('sd-arrow-on', 'sd-arrow is-on')),
    g, og);
  fig.replaceChildren(el);
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
  const label = D.VIA.find((v) => v.id === e.c.via)?.short || 'Spec';
  const tw = textW(label, dim.font);
  const cut = tw + 2 * bp > cap;
  const w = Math.max(bh, cut ? cap : tw + 2 * bp);
  const what = [D.viaLabel(e.c.via), e.c.what].filter(Boolean).join(', ');
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
  grp.append(svg('text', { class: 'sd-title', x: pad + 4, y: head * 0.62 }, fitText(n.lane === 'end' ? 'END' : n.title.toUpperCase(), max * 0.95, font.title)));
  /** @type {string[]} */
  let lines = n.lane === 'end' ? ['Users'] : n.open ? ['Not decided'] : n.names.slice(0, MAX_NAMES);
  if (!n.open && n.names.length > MAX_NAMES) lines = [...lines, `+${n.names.length - MAX_NAMES} more`];
  lines.forEach((t, k) => grp.append(svg('text', { class: n.open ? 'sd-name muted' : 'sd-name', x: pad + 4, y: head + k * lh + lh * 0.7 }, fitText(t, max, font.name))));
  return grp;
}

/** Tải sơ đồ: chép màu, nét, font đã tính vào thuộc tính để file đứng một mình đúng theme đang xem. */
function downloadSvg() {
  const src = $('sd-fig').querySelector('svg');
  if (!src) return;
  const out = /** @type {SVGSVGElement} */ (src.cloneNode(true));
  const a = [src, ...src.querySelectorAll('*')], b = [out, ...out.querySelectorAll('*')];
  const drop = b.filter((_, i) => a[i].matches('.sd-hit, .sd-hand.is-empty'));
  const props = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'font-family', 'font-size', 'font-weight', 'letter-spacing', 'opacity'];
  a.forEach((el, i) => {
    const cs = getComputedStyle(el);
    for (const p of props) b[i].setAttribute(p, cs.getPropertyValue(p));
    b[i].removeAttribute('class');
    b[i].removeAttribute('tabindex');
    b[i].removeAttribute('role');
  });
  for (const x of drop) x.remove();
  out.setAttribute('xmlns', NS);
  const vb = out.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 0, 0];
  out.insertBefore(svg('rect', { x: vb[0], y: vb[1], width: vb[2], height: vb[3], fill: getComputedStyle(document.body).backgroundColor }), out.firstChild);
  const blob = new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(out)], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = deps.h('a', { href: url, download: C.slug(ws().name) + '-system.svg' });
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
  const h = deps.h;
  const items = D.planDiff(cat, w);
  planCtx = { wsId: w.id, items, key: diffKey(items) };
  const build = w.steps.find((/** @type {any} */ s) => C.fold(s.title) === C.fold(D.PLAN_STEP.title));
  const sel = $('sdp-step');
  sel.replaceChildren(...(build ? [] : [h('option', { value: '' }, `New step: ${D.PLAN_STEP.title} (step ${Math.min(1, w.steps.length) + 1})`)]),
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
  $('sdp-list').replaceChildren(...lists.filter(Boolean), same ? h('p', { class: 'sd-help' }, `${C.plural(same, 'task')} already match the design.`) : null);
  const update = items.some((x) => x.sub);
  $('dlg-sdp-title').textContent = update ? 'Update plan' : 'Add tasks to plan';
  $('sdp-sub').textContent = todo ? 'Pick what to do with each task. One Undo reverts everything.' : 'Every task already matches the design.';
  $('sdp-step-field').hidden = !items.some((x) => x.kind === 'new' || x.kind === 'changed');
  $('sdp-go').disabled = !todo;
  deps.showDlg($('dlg-sdp'));
  ($('sdp-list').querySelector('input') || $('dlg-sdp').querySelector('[data-close]')).focus({ preventScroll: true });
}

function applyPlanNow() {
  const ctx = planCtx;
  planCtx = null;
  $('dlg-sdp').close();
  const w = ctx && deps.findWs(ctx.wsId);
  if (!w) return;
  /* Tab khác đổi dự án trong lúc hộp mở: bản so không còn đúng. */
  if (diffKey(D.planDiff(cat, w)) !== ctx.key) { deps.toast('The plan changed meanwhile; open "Update plan" again.'); return; }
  const list = $('sdp-list');
  const choices = ctx.items.map((it, i) => (it.kind === 'new'
    ? (list.querySelector(`input[type="checkbox"][data-i="${i}"]`)?.checked ? 'add' : 'skip')
    : list.querySelector(`input[type="radio"][data-i="${i}"]:checked`)?.value || ''));
  let step = w.steps.find((/** @type {any} */ s) => s.id === $('sdp-step').value);
  let created = false;
  if (!step) {
    step = C.normStep({ ...D.PLAN_STEP, subs: [] });
    w.steps.splice(Math.min(1, w.steps.length), 0, step);
    created = true;
  }
  const r = D.applyPlan(ctx.items, choices, step, C);
  if (created && !step.subs.length) { w.steps = w.steps.filter((/** @type {any} */ s) => s !== step); created = false; }
  const n = r.counts;
  const parts = [n.added ? `${n.added} added` : '', n.updated ? `${n.updated} updated` : '', n.cancelled ? `${n.cancelled} cancelled` : ''].filter(Boolean);
  deps.commit();
  if (!parts.length && !r.before.size) { deps.toast('Nothing changed.'); return; }
  const wsId = w.id, stepId = step.id, added = new Set(r.added), before = r.before;
  deps.toast(`Plan updated: ${parts.join(', ') || 'tasks linked to the design'}.${n.reset ? ` ${C.plural(n.reset, 'done task')} set back to New.` : ''}`, () => {
    const ww = deps.findWs(wsId);
    if (!ww) return;
    for (const s of ww.steps) s.subs = s.subs.filter((/** @type {any} */ x) => !added.has(x.id)).map((/** @type {any} */ x) => (before.has(x.id) ? C.normSub(before.get(x.id)) : x));
    if (created) ww.steps = ww.steps.filter((/** @type {any} */ s) => s.id !== stepId || s.subs.length);
    deps.commit('#sd-plan');
  }, '#sd-plan');
}

/* ── Hộp chọn: cột trái là hồ sơ + các khâu theo làn, phải là khâu đang xem; Back / Next ở chân ── */

/** @param {number} [k] @param {string} [edgeKey] mở trang Handoffs ở đúng đường nối này */
function openDesign(k = 0, edgeKey = '') {
  if (!cat) return;
  at = k;
  applied = null;
  if (edgeKey) moreOpen.add('edge:' + edgeKey);
  paint();
  deps.showDlg($('dlg-sd'));
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
  const n = D.decidedCount(cat, design());
  const k = D.warnings(cat, design()).length;
  $('sd-sub').textContent = `${n.done} of ${n.total} stages decided${k ? ` · ${C.plural(k, 'warning')}` : ''}. Changes save as you go.`;
}

function paintNav() {
  const d = design();
  const warns = D.warnings(cat, d);
  const warned = new Set(warns.flatMap((x) => x.stages));
  const h = deps.h;
  /** @type {any[]} */
  const p = D.pathOf(cat, d);
  const items = [h('li', {}, navBtn(0, 'Deliverable', p ? 'done' : 'open', p ? p.label : '')),
    h('li', {}, navBtn(1, 'Project profile', Object.keys(d?.profile || {}).length ? 'done' : 'open', ''))];
  const adv = D.archAdvice(cat, d);
  const recs = adv.filter((a) => a.id !== null).length;
  items.push(h('li', {}, navBtn(ARCH_PAGE, 'Architecture', adv.length && recs === adv.length ? 'done' : 'open', adv.length ? `${recs} of ${adv.length} recommended` : '')));
  let lane = '';
  cat.stages.forEach((/** @type {any} */ s, /** @type {number} */ i) => {
    if (s.lane !== lane) { lane = s.lane; items.push(h('li', { class: 'sd-nav-lane', 'aria-hidden': 'true' }, LANE_LABEL[/** @type {'data'} */ (lane)])); }
    const st = D.stageState(d, s.id);
    items.push(h('li', {}, navBtn(i + FIRST_STAGE, s.title, st, st === 'skip' ? 'Not needed' : D.pickNames(s, d?.stages[s.id]).join(', '), warned.has(s.id))));
  });
  items.push(h('li', { class: 'sd-nav-lane', 'aria-hidden': 'true' }, 'Review'));
  const fe = D.flowEdges(cat, d);
  const set = fe.filter((e) => e.c).length;
  items.push(h('li', {}, navBtn(extraPage('handoffs'), 'Handoffs', set ? 'done' : 'open', fe.length ? `${set} of ${fe.length} described` : '')));
  items.push(h('li', {}, navBtn(extraPage('checks'), 'Checks', warns.length ? 'open' : 'done', warns.length ? C.plural(warns.length, 'warning') : 'No conflicts', warns.length > 0)));
  $('sd-nav').replaceChildren(...items);
  $('sd-nav').querySelector('[aria-current]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/** @param {number} k @param {string} title @param {string} state @param {string} sub @param {boolean} [warn] */
function navBtn(k, title, state, sub, warn = false) {
  const h = deps.h;
  return h('button', { type: 'button', class: `sd-nav-btn is-${state}${warn ? ' has-warn' : ''}`, 'data-at': k, 'aria-current': k === at ? 'step' : null },
    h('span', { class: 'sd-dot', 'aria-hidden': 'true' }, state === 'done' ? deps.icon('check') : null),
    h('span', { class: 'sd-nav-txt' }, h('span', {}, title), sub ? h('small', {}, sub) : null,
      h('span', { class: 'sr' }, (state === 'done' ? ' (decided)' : state === 'skip' ? ' (not needed)' : ' (open)') + (warn ? ', has a warning' : ''))));
}

function paintPane() {
  const ex = extraAt(at);
  $('sd-pane').replaceChildren(...(at === 0 ? pathPane() : at === 1 ? profilePane() : at === ARCH_PAGE ? archPane() : ex === 'checks' ? checksPane() : ex === 'handoffs' ? handoffsPane()
    : stagePane(stageAt(at))).filter(Boolean));
  $('sd-pane').scrollTop = 0;
  $('sd-pane').closest('.dlg-body').scrollTop = 0;
}

/* ── Lối bắt đầu: "What do you deliver?" — luồng tối thiểu, vì sao hợp, khi nào đổi lối, khâu cần / bỏ, mốc nghiệm thu ── */

function pathPane() {
  const h = deps.h;
  const d = design();
  const p = D.pathOf(cat, d);
  return [
    h('p', { class: 'dlg-kicker' }, 'Start here'),
    h('h3', { class: 'sd-h' }, 'What do you deliver?'),
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
  const h = deps.h;
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
      h('button', { type: 'button', class: 'btn go', 'data-apply': p.id }, deps.icon('check'), 'Apply path'),
      h('span', { class: 'sd-help' }, 'Fills undecided stages with the suggested tool and marks the stages this path or your profile skips as Not needed. Stages you already decided stay as they are.')),
    mine ? h('p', { class: 'sd-applied', role: 'status' }, mine.text, ' ',
      mine.prev ? h('button', { type: 'button', class: 'sd-link', 'data-unapply': '1' }, 'Undo') : null) : null);
}

/** Áp lối: chỉ khâu chưa quyết; Hoàn tác trả đúng các khâu vừa đổi. @param {string} id */
function applyPathNow(id) {
  const w = ws();
  if (!w) return;
  const before = w.design ? JSON.parse(JSON.stringify(w.design)) : null;
  const r = D.applyPath(cat, w.design, id);
  const ids = [...r.filled, ...r.skipped];
  /** @type {Record<string, any>} */
  const prev = {};
  for (const k of ids) prev[k] = before?.stages[k] || null;
  w.design = r.next;
  deps.commit();
  applied = { wsId: w.id, prev: ids.length ? prev : null, text: ids.length
    ? `Filled ${C.plural(r.filled.length, 'stage')}; marked ${r.skipped.length} Not needed.` : 'Nothing to fill: every stage is already decided.' };
}

function undoApply() {
  const a = applied;
  applied = null;
  if (!a || !a.prev || ws()?.id !== a.wsId) return;
  edit((d) => { for (const [k, v] of Object.entries(a.prev)) { if (v) d.stages[k] = v; else delete d.stages[k]; } });
  applied = { wsId: a.wsId, prev: null, text: 'Undone.' };
}

function profilePane() {
  const h = deps.h;
  const d = design();
  const prof = d?.profile || {};
  const p = D.pathOf(cat, d);
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
    h('p', { class: 'sd-q' }, 'Trả lời những câu bạn biết; câu nào chưa chắc thì để "Not sure". Gợi ý ở từng khâu đổi theo câu trả lời.'), // lang: vi — lời giải thích, nội dung
    ...asked.map(q2),
    rest.length ? fold({ class: 'sd-more', 'data-more': 'profile-rest', open: moreOpen.has('profile-rest') },
      h('summary', {}, deps.icon('chev'), `${C.plural(rest.length, 'question')} the ${p.label} path doesn't need`),
      ...rest.map(q2)) : null,
  ];
}

/* ── Kiến trúc: các nhóm (danh mục `architectures`), mỗi nhóm một kiến trúc gợi ý từ hồ sơ, lối, khâu đã quyết (`archAdvice`);
 * mỗi kiến trúc gập: khi dùng, khi tránh, luồng, công cụ theo khâu (bấm tới khâu), lối tương ứng, nguồn ── */

function archPane() {
  const h = deps.h;
  const d = design();
  const fams = Array.isArray(cat.architectures) ? cat.architectures : [];
  const adv = D.archAdvice(cat, d);
  return [
    h('p', { class: 'dlg-kicker' }, 'Your project'),
    h('h3', { class: 'sd-h' }, 'Architecture'),
    h('p', { class: 'sd-q' }, 'Kiến trúc là hình dạng lớn của hệ thống, quyết trước khi chọn công cụ cho từng khâu. Mỗi nhóm dưới đây trả lời một câu hỏi bằng vài kiến trúc chuẩn; trang gợi ý một kiến trúc mỗi nhóm theo hồ sơ dự án, lối đã chọn và các khâu đã quyết.'), // lang: vi — lời giải thích, nội dung
    adv.every((a) => a.id === null) ? h('p', { class: 'sd-tip' }, 'Answer the project profile to get a recommendation. ',
      h('button', { type: 'button', class: 'sd-link', 'data-at': 1 }, 'Go to profile')) : null,
    ...fams.map((/** @type {any} */ f, /** @type {number} */ i) => archFamily(f, adv[i], d)),
  ];
}

/** @param {any} f @param {{id: string | null, why: string}} a @param {any} d */
function archFamily(f, a, d) {
  const h = deps.h;
  const rec = a.id ? f.entries.find((/** @type {any} */ e) => e.id === a.id) : null;
  return h('section', { class: 'sd-fam', 'data-fam': f.id, 'aria-labelledby': `sd-fam-${f.id}` },
    h('h4', { class: 'sd-h4', id: `sd-fam-${f.id}` }, f.label),
    h('p', { class: 'sd-help' }, f.question),
    rec ? h('p', { class: 'sd-rec', 'data-rec': rec.id }, h('span', { class: 'sd-k' }, 'Recommended'), h('b', {}, rec.name), '. ', a.why)
      : a.id === '' ? h('p', { class: 'sd-rec is-none', 'data-rec': '' }, h('span', { class: 'sd-k' }, 'Not needed'), a.why) : null,
    h('div', { class: 'sd-archs' }, ...f.entries.map((/** @type {any} */ e) => archItem(e, e.id === a.id, d))),
    f.note ? h('p', { class: 'sd-help' }, f.note) : null,
    (f.sources || []).length ? archLinks(f.sources) : null);
}

/** @param {any[]} list */
const archLinks = (list) => deps.h('ul', { class: 'sd-links' }, ...list.map((/** @type {any} */ l) =>
  deps.h('li', {}, deps.h('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer' }, deps.icon('link'), l.title))));

/** @param {any} e @param {boolean} on kiến trúc được gợi ý @param {any} d */
function archItem(e, on, d) {
  const h = deps.h;
  const id = 'arch:' + e.id;
  const p = e.path ? cat.paths.find((/** @type {any} */ x) => x.id === e.path) : null;
  const mine = !!p && d?.path === p.id;
  const row = (/** @type {string} */ k, /** @type {any[]} */ ...v) => h('p', { class: 'sd-when' }, h('span', { class: 'sd-k' }, k), ...v);
  const tools = Object.entries(e.tools || {}).map(([sid, ids]) => {
    const s = cat.stages.find((/** @type {any} */ x) => x.id === sid);
    if (!s) return null;
    const names = /** @type {string[]} */ (ids).map((oid) => s.options.find((/** @type {any} */ o) => o.id === oid)?.name).filter(Boolean);
    return h('li', {}, h('button', { type: 'button', class: 'sd-link', 'data-at': stagePage(sid) }, s.title), `: ${names.join(', ')}`);
  }).filter(Boolean);
  return fold({ class: `sd-arch${on ? ' is-rec' : ''}`, 'data-more': id, 'data-arch': e.id, open: moreOpen.has(id) },
    h('summary', {}, deps.icon('chev'), h('span', { class: 'sd-arch-name' },
      h('span', { class: 'sd-arch-head' }, h('b', {}, e.name),
        on ? h('span', { class: 'sd-tag top' }, 'Recommended') : null, mine ? h('span', { class: 'sd-tag' }, 'Your deliverable') : null),
      h('small', {}, e.what))),
    row('Use when', e.use),
    row('Avoid when', e.avoid),
    h('div', { class: 'sd-when' }, h('span', { class: 'sd-k' }, 'Flow'),
      h('ol', { class: 'sd-chain' }, ...e.flow.map((/** @type {string} */ x) => h('li', {}, h('span', {}, x))))),
    tools.length ? h('div', { class: 'sd-when' }, h('span', { class: 'sd-k' }, 'Tools by stage'), h('ul', { class: 'sd-arch-tools' }, ...tools)) : null,
    p ? row('Deliverable', p.label, mine ? ' (chosen)' : ' ',
      mine ? null : h('button', { type: 'button', class: 'sd-link', 'data-arch-path': p.id }, 'Use this deliverable')) : null,
    (e.sources || []).length ? archLinks(e.sources) : null);
}

/* ── Bàn giao: mỗi đường nối giữa hai khâu đã quyết liền nhau — đi qua gì, giao gì, bên sau đọc ở đâu, hứa gì, kiểm thế nào ── */

function handoffsPane() {
  const h = deps.h;
  const d = design();
  const edges = D.flowEdges(cat, d);
  const kept = Object.keys(d?.edges || {}).filter((k) => !edges.some((e) => e.key === k)).length;
  return [
    h('p', { class: 'dlg-kicker' }, 'Review'),
    h('h3', { class: 'sd-h' }, 'Handoffs'),
    h('p', { class: 'sd-q' }, 'Mỗi đường nối giữa hai khâu đã quyết là một chỗ bàn giao: bên trước đưa gì, bên sau đọc ở đâu và bằng cách nào, hai bên hứa gì, kiểm thế nào là đã nối được. Điền vài đường quan trọng là đủ.'), // lang: vi — lời giải thích, nội dung
    edges.length ? null : h('p', { class: 'sd-tip' }, 'Decide two neighbouring stages on the diagram to describe the handoff between them.'),
    ...edges.map(edgeItem),
    kept ? h('p', { class: 'sd-help' }, `${C.plural(kept, 'handoff')} kept for stages that are no longer decided or next to each other.`) : null,
  ];
}

/** @param {any} e */
function edgeItem(e) {
  const h = deps.h;
  const c = e.c || {};
  const id = 'edge:' + e.key;
  const sum = e.c ? [D.viaLabel(c.via), c.what].filter(Boolean).join(' · ') || 'Described' : 'Not described yet';
  const field = (/** @type {string} */ label, /** @type {string} */ f, /** @type {string} */ ph) => h('label', { class: 'field' }, h('span', {}, label),
    f === 'promise'
      ? h('textarea', { rows: 3, 'data-ef': f, 'data-edge': e.key, placeholder: ph }, c[f] || '')
      : h('input', { type: 'text', class: 'input', maxlength: D.EDGE_MAX, value: c[f] || '', 'data-ef': f, 'data-edge': e.key, placeholder: ph }));
  return fold({ class: `sd-edge-item${e.c ? ' is-set' : ''}`, 'data-more': id, 'data-edge-item': e.key, open: moreOpen.has(id) },
    h('summary', {}, deps.icon('chev'), h('span', { class: 'sd-edge-name' }, h('b', {}, `${e.from.title} → ${e.to.title}`), h('small', {}, sum))),
    h('fieldset', { class: 'sd-prof' }, h('legend', {}, 'Handed over as'),
      h('div', { class: 'sd-pills' }, ...[...D.VIA, { id: '', label: 'Not set' }].map((v) => h('label', { class: 'sd-pill' },
        h('input', { type: 'radio', name: `sd-via-${e.key}`, value: v.id, 'data-via': e.key, checked: (c.via || '') === v.id }), h('span', {}, v.label))))),
    field('What is handed over', 'what', 'e.g. matches.parquet: one row per match, key match_id'),
    field('Where and how the next stage reads it', 'where', 'e.g. data/clean/ in the repo; the backend opens it read-only'),
    field('Promises: columns, meaning, order, version', 'promise', 'e.g. required columns; home_win = 0 also counts draws; rows ordered by seq; snapshot date in the file name'),
    field('How to check the connection', 'check', 'e.g. the backend reads the sample file, filters one season and returns the expected match count'));
}

/* ── Xem lại: các luật phối hợp đang báo (danh mục `checks`), mỗi cái kèm lối tới khâu liên quan ── */

function checksPane() {
  const h = deps.h;
  const warns = D.warnings(cat, design());
  const title = (/** @type {string} */ id) => cat.stages.find((/** @type {any} */ s) => s.id === id)?.title || id;
  return [
    h('p', { class: 'dlg-kicker' }, 'Review'),
    h('h3', { class: 'sd-h' }, 'Checks'),
    h('p', { class: 'sd-q' }, 'Những cặp lựa chọn hay vấp khi ghép với nhau. Trang chỉ báo khi các khâu liên quan đã quyết.'), // lang: vi — lời giải thích, nội dung
    warns.length ? h('ul', { class: 'sd-warns' }, ...warns.map((x) => h('li', { class: 'sd-warnbox' },
      h('b', {}, x.title), h('p', {}, x.msg),
      h('p', { class: 'sd-warn-go' }, ...x.stages.map((id) => h('button', { type: 'button', class: 'btn small', 'data-at': stagePage(id) }, title(id)))))))
      : h('p', { class: 'sd-tip' }, 'No conflicts found among the decided stages.'),
  ];
}

/** @param {any} s */
function stagePane(s) {
  const h = deps.h;
  const d = design();
  const prof = D.effProfile(cat, d);
  const p = D.pathOf(cat, d);
  const st = d?.stages[s.id] || { pick: [], skip: false, own: '', note: '' };
  const ranked = D.rankOptions(s, prof, p);
  const picked = ranked.filter((r) => st.pick.includes(r.opt.id));
  const rest = ranked.filter((r) => !st.pick.includes(r.opt.id));
  const hasPick = picked.length > 0 || !!st.own;
  const answered = Object.keys(prof).length > 0 || !!p;
  const card = (/** @type {any} */ r) => optionCard(s, r, st.pick.includes(r.opt.id), answered, prof);
  const need = p ? p.stages[s.id] : '';
  /* Hồ sơ cho là khâu không cần (`when` của khâu): nói câu trả lời nào. */
  const notNeeded = D.notNeededBy(s, prof).map((k) => {
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
    ...D.warnings(cat, d).filter((x) => x.stages.includes(s.id)).map((x) => h('div', { class: 'sd-warnbox', role: 'note' }, h('b', {}, x.title), h('p', {}, x.msg))),
    h('div', { class: 'sd-skip' },
      h('button', { type: 'button', class: 'btn small', 'aria-pressed': String(st.skip), 'data-skip': s.id }, 'Not needed'),
      s.skipWhen ? h('span', { class: 'sd-help' }, s.skipWhen) : null),
    st.skip ? null : h('div', { class: 'sd-opts', role: 'group', 'aria-label': s.multi ? 'Options (pick one or more)' : 'Options (pick one)' },
      ...(hasPick ? picked : ranked).map(card),
      hasPick && rest.length ? fold({ class: 'sd-more', 'data-more': s.id, open: moreOpen.has(s.id) },
        h('summary', {}, deps.icon('chev'), `Show ${C.plural(rest.length, 'other option')}`),
        ...rest.map(card)) : null),
    st.skip ? null : h('label', { class: 'field' }, h('span', {}, 'Another tool (not in the list)'),
      h('input', { type: 'text', class: 'input', maxlength: D.OWN_MAX, value: st.own, 'data-own': s.id, placeholder: 'e.g. a tool your class or team already uses' })),
    h('label', { class: 'field' }, h('span', {}, 'Why this choice (optional)'),
      h('textarea', { rows: 3, 'data-note': s.id, placeholder: 'The reason, what you ruled out, what would make you switch' }, st.note)),
  ];
}

/** @param {any} s @param {any} r @param {boolean} on @param {boolean} answered @param {Record<string,string>} prof */
function optionCard(s, r, on, answered, prof) {
  const h = deps.h;
  const o = r.opt;
  const miss = r.miss.map((/** @type {string} */ k) => {
    const q = cat.profile.find((/** @type {any} */ x) => x.id === k);
    const c = q?.choices.find((/** @type {any} */ x) => x.id === prof[k]);
    return q && c ? `${q.label}: ${c.label}` : k;
  });
  return h('div', { class: `sd-opt${on ? ' is-on' : ''}${answered && r.ok ? ' is-fit' : ''}${answered && !r.ok ? ' is-miss' : ''}`, 'data-opt': o.id },
    h('label', { class: 'sd-opt-top' },
      h('input', { type: 'checkbox', 'data-pick': s.id, value: o.id, checked: on }),
      h('span', { class: 'sd-opt-name' }, h('b', {}, o.name), h('small', {}, o.kind)),
      h('span', { class: 'sd-tags' },
        r.top ? h('span', { class: 'sd-tag top' }, 'Recommended') : answered && r.ok ? h('span', { class: 'sd-tag fit' }, 'Fits') : null,
        r.sug && !r.top ? h('span', { class: 'sd-tag' }, 'On path') : null,
        h('span', { class: 'sd-tag' }, COST_LABEL[/** @type {'free'} */ (o.cost)] || o.cost),
        h('span', { class: 'sd-tag' }, LEVEL_LABEL[/** @type {1} */ (o.level)] || ''))),
    h('p', { class: 'sd-sum' }, o.summary),
    h('p', { class: 'sd-when' }, h('span', { class: 'sd-k' }, 'Pick when'), o.pick),
    answered && !r.ok ? h('p', { class: 'sd-when sd-warn' }, h('span', { class: 'sd-k' }, 'Not a fit'), miss.join(' · ')) : null,
    fold({ class: 'sd-det' },
      h('summary', {}, deps.icon('chev'), 'Details, links, first commands'),
      o.avoid ? h('p', { class: 'sd-when' }, h('span', { class: 'sd-k' }, 'Avoid when'), o.avoid) : null,
      o.task ? h('p', { class: 'sd-when' }, h('span', { class: 'sd-k' }, 'Done when'), o.task) : null,
      (o.links || []).length ? h('ul', { class: 'sd-links' }, ...o.links.map((/** @type {any} */ l) =>
        h('li', {}, h('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer' }, deps.icon('link'), l.title)))) : null,
      (o.setup || []).length ? h('pre', { class: 'sd-cmd' }, h('code', {}, o.setup.join('\n'))) : null));
}

/* ── Sự kiện ── */

/** Vẽ lại hộp, giữ focus ở ô vừa bấm (nút DOM được dựng lại). @param {string} [sel] */
function repaint(sel) {
  paint();
  const el = sel && $('dlg-sd').querySelector(sel);
  if (el) el.focus({ preventScroll: false });
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
  $('sd-arch').addEventListener('click', (/** @type {any} */ e) => { if (e.target.closest('[data-arch-open]') && cat) openDesign(ARCH_PAGE); });
  $('sd-warns').addEventListener('click', (/** @type {any} */ e) => {
    const b = e.target.closest('[data-warn-stage]');
    if (b && cat) openDesign(b.dataset.warnStage ? stagePage(b.dataset.warnStage) : extraPage('checks'));
  });
  fig.addEventListener('keydown', (/** @type {KeyboardEvent} */ e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openNode(e); } });
  let lastW = 0;
  new ResizeObserver(() => {
    const w = fig.clientWidth;
    if (cat && ws() && w !== lastW) { lastW = w; drawDiagram(); }
  }).observe(fig);

  const pane = $('sd-pane');
  pane.addEventListener('click', (/** @type {any} */ e) => {
    const b = e.target.closest('[data-at]');
    if (b) { go(+b.dataset.at); return; }
    const ar = e.target.closest('[data-arch-path]');
    if (ar) {
      const arch = ar.closest('[data-arch]').dataset.arch;
      applied = null;
      edit((d) => { d.path = ar.dataset.archPath; });
      repaint(`[data-arch="${arch}"] > summary`);
      return;
    }
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
    if (t.dataset.ef) {
      edit((d) => { edgeRec(d, t.dataset.edge)[t.dataset.ef] = t.value; });
      paintNav();
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

/* ── Khởi động: main.js trao các hàm dùng chung, rồi nạp danh mục ── */

/** @param {any} d */
export async function initDesign(d) {
  deps = d;
  wire();
  try {
    const res = await fetch('data/system-design.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const c = await res.json();
    const err = D.catalogErrors(c);
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
