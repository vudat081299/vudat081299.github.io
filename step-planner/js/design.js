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
let at = 0;                       // trang của hộp: 0 = lối bắt đầu, 1 = hồ sơ dự án, k ≥ 2 = khâu thứ k − 1
const moreOpen = new Set();       // khâu đang mở "Show other options"
/** Lần "Apply path" gần nhất (Hoàn tác là một dòng trong hộp: toast bị hộp modal che). @type {any} */
let applied = null;
const FIRST_STAGE = 2;

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
  $('sd-plan').hidden = !D.planTasks(cat, w.design).length;
  const p = D.pathOf(cat, w.design);
  $('sd-path').hidden = !p;
  $('sd-path').textContent = p ? `Deliverable: ${p.label}` : '';
  $('sd-svg').hidden = !n.done;
  drawDiagram();
  const warns = D.warnings(cat, w.design);
  $('sd-warns').hidden = !warns.length;
  $('sd-warns').replaceChildren(...warns.map((x) => deps.h('li', { class: 'sd-warnbox' },
    deps.h('button', { type: 'button', class: 'sd-link', 'data-warn-stage': x.stages[0] || '' }, x.title), ' ', x.msg)));
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
  const cols = Math.max(1, Math.min(5, Math.floor((W + gx) / (Math.min(maxW, 180) + gx))));
  const nw = Math.min(maxW, (W - (cols - 1) * gx) / cols);
  const nameFont = `600 ${cs.getPropertyValue('--fs-sm').trim() || '13px'} ${cs.getPropertyValue('--sans').trim()}`;
  const titleFont = `500 ${cs.getPropertyValue('--fs-xs').trim() || '12px'} ${cs.getPropertyValue('--mono').trim()}`;
  const lineCount = (/** @type {any} */ n) => (n.lane === 'end' ? 1 : Math.max(1, Math.min(n.names.length, MAX_NAMES + 1)));
  const nodeH = (/** @type {any} */ n) => head + lineCount(n) * lh + pad;

  /* Luồng: rắn bò; mỗi hàng cao bằng nút cao nhất của hàng. */
  const rows = /** @type {number[]} */ ([]);
  flow.forEach((n, i) => { const r = D.snake(i, cols).row; rows[r] = Math.max(rows[r] || 0, nodeH(n)); });
  const rowY = rows.map((_, r) => rows.slice(0, r).reduce((a, b) => a + b + gy, 0));
  const pos = flow.map((n, i) => { const p = D.snake(i, cols); return { n, x: p.col * (nw + gx), y: rowY[p.row], h: rows[p.row], row: p.row }; });
  let y = rowY.length ? rowY[rowY.length - 1] + rows[rows.length - 1] : 0;

  const g = svg('g', { class: 'sd-flow' });
  const hands = svg('g', { class: 'sd-hands' });
  const edges = new Map(D.flowEdges(cat, design()).map((e) => [e.key, e]));
  const badgeFont = `600 ${cs.getPropertyValue('--fs-xs').trim() || '12px'} ${cs.getPropertyValue('--sans').trim()}`;
  const bh = px(cs, '--sd-badge-h', 20);
  for (let i = 1; i < pos.length; i++) {
    const a = pos[i - 1], b = pos[i];
    const same = a.row === b.row;
    const d = same
      ? (b.x > a.x ? `M${a.x + nw} ${a.y + a.h / 2}H${b.x - 3}` : `M${a.x} ${a.y + a.h / 2}H${b.x + nw + 3}`)
      : `M${a.x + nw / 2} ${a.y + a.h}V${b.y - 3}`;
    g.append(svg('path', { class: 'sd-edge', d, 'marker-end': 'url(#sd-arrow)' }));
    /* Bàn giao: đường đã ghi có nhãn bấm được (Tab tới được); đường trống có dấu + khi rê chuột (bàn phím: trang Handoffs). */
    const e = edges.get(`${a.n.id}>${b.n.id}`);
    if (e) hands.append(handEl(e, same ? Math.min(a.x, b.x) + nw + gx / 2 : a.x + nw / 2, same ? a.y + a.h / 2 : a.y + a.h + gy / 2,
      same ? gx - 6 : nw, bh, badgeFont));
  }
  const fonts = { name: nameFont, title: titleFont };
  for (const p of pos) g.append(nodeEl(p.n, p.x, p.y, nw, p.h, head, lh, pad, fonts));
  g.append(hands);

  /* Vận hành: dải riêng dưới luồng, không mũi tên — chạy song song với mọi khâu. */
  const og = svg('g', { class: 'sd-ops' });
  if (ops.length) {
    y += gy;
    og.append(svg('text', { class: 'sd-band', x: 0, y: y + lh * 0.7 }, 'Operations · alongside every stage'));
    y += lh + pad;
    const oh = Math.max(...ops.map(nodeH));
    ops.forEach((n, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      og.append(nodeEl(n, c * (nw + gx), y + r * (oh + gy / 2), nw, oh, head, lh, pad, fonts));
    });
    y += Math.ceil(ops.length / cols) * (oh + gy / 2) - gy / 2;
  }
  const width = cols * nw + (cols - 1) * gx;
  const label = 'System diagram: ' + flow.map((n) => n.names.length ? `${n.title} (${n.names.join(', ')})` : n.title).join(' → ');
  const el = svg('svg', { class: 'sd-svg', viewBox: `-2 -2 ${width + 4} ${y + 4}`, width: width + 4, height: y + 4, role: 'img', 'aria-label': label },
    svg('defs', {}, svg('marker', { id: 'sd-arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' },
      svg('path', { class: 'sd-arrow', d: 'M0 0L10 5L0 10z' }))),
    g, og);
  fig.replaceChildren(el);
}

/** Nhãn bàn giao trên đường nối, tâm (cx, cy). @param {any} e @param {number} cx @param {number} cy @param {number} maxW @param {number} bh @param {string} font */
function handEl(e, cx, cy, maxW, bh, font) {
  const name = `${e.from.title} → ${e.to.title}`;
  if (!e.c) {
    const r = bh / 2;
    return svg('g', { class: 'sd-hand is-empty', transform: `translate(${cx} ${cy})`, 'data-edge': e.key, 'aria-hidden': 'true' },
      svg('title', {}, `Describe the handoff ${name}`),
      svg('circle', { class: 'sd-hand-box', r }),
      svg('path', { class: 'sd-hand-plus', d: `M${-r / 2} 0H${r / 2}M0 ${-r / 2}V${r / 2}` }));
  }
  const bp = bh / 3;
  const label = fitText(D.VIA.find((v) => v.id === e.c.via)?.short || 'Spec', maxW - 2 * bp, font);
  const w = Math.min(maxW, textW(label, font) + 2 * bp);
  const what = [D.viaLabel(e.c.via), e.c.what].filter(Boolean).join(', ');
  return svg('g', { class: 'sd-hand', transform: `translate(${cx - w / 2} ${cy - bh / 2})`, 'data-edge': e.key, tabindex: 0, role: 'button',
    'aria-label': `Handoff ${name}${what ? ': ' + what : ''}. Edit` },
  svg('title', {}, `Handoff ${name}${what ? ': ' + what : ''}`),
  svg('rect', { class: 'sd-hand-box', width: w, height: bh, rx: bh / 2 }),
  svg('text', { class: 'sd-hand-txt', x: w / 2, y: bh / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, label));
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
  const props = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'font-family', 'font-size', 'font-weight', 'letter-spacing', 'opacity'];
  a.forEach((el, i) => {
    const cs = getComputedStyle(el);
    for (const p of props) b[i].setAttribute(p, cs.getPropertyValue(p));
    b[i].removeAttribute('class');
    b[i].removeAttribute('tabindex');
    b[i].removeAttribute('role');
  });
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

/* ── Đưa việc sang bảng: bước "System build" (đặt sau bước đầu tiên: dựng đường chạy thông sớm), mỗi khâu một bước con;
 * bước con trùng tên đã có thì bỏ qua. Hoàn tác gỡ đúng những gì vừa thêm. ── */

function addToPlan() {
  const w = ws();
  const tasks = D.planTasks(cat, w.design);
  let step = w.steps.find((/** @type {any} */ s) => C.fold(s.title) === C.fold(D.PLAN_STEP.title));
  const created = !step;
  if (!step) {
    step = C.normStep({ ...D.PLAN_STEP, subs: [] });
    w.steps.splice(Math.min(1, w.steps.length), 0, step);
  }
  const have = new Set(step.subs.map((/** @type {any} */ x) => C.fold(x.title)));
  const added = tasks.filter((t) => !have.has(C.fold(t.title))).map((t) => C.normSub(t));
  step.subs.push(...added);
  const stepId = step.id, wsId = w.id, ids = new Set(added.map((x) => x.id));
  const where = `"${D.PLAN_STEP.title}" (step ${w.steps.indexOf(step) + 1})`;
  deps.commit();
  if (!added.length) { deps.toast(`Every task is already in ${where}.`); return; }
  deps.toast(`Added ${C.plural(added.length, 'task')} to ${where}.`, () => {
    const ww = deps.findWs(wsId);
    const s = ww && ww.steps.find((/** @type {any} */ x) => x.id === stepId);
    if (!s) return;
    s.subs = s.subs.filter((/** @type {any} */ x) => !ids.has(x.id));
    if (created && !s.subs.length) ww.steps = ww.steps.filter((/** @type {any} */ x) => x !== s);
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
  $('sd-pos').textContent = at === 0 ? 'Deliverable' : at === 1 ? 'Project profile' : ex === 'checks' ? 'Checks' : ex === 'handoffs' ? 'Handoffs'
    : `Stage ${at - 1} of ${cat.stages.length}`;
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
  $('sd-pane').replaceChildren(...(at === 0 ? pathPane() : at === 1 ? profilePane() : ex === 'checks' ? checksPane() : ex === 'handoffs' ? handoffsPane()
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
    h('p', { class: 'sd-q' }, 'Chọn thứ cuối cùng bạn bàn giao. Lối cho thấy luồng tối thiểu, khâu nào cần, khâu nào bỏ được; gợi ý ở từng khâu ưu tiên công cụ của lối.'),
    h('fieldset', { class: 'sd-paths' }, h('legend', { class: 'sr' }, 'What do you deliver?'),
      ...[...cat.paths, { id: '', label: 'Not sure yet', summary: 'Đi thẳng qua hồ sơ và từng khâu.' }].map((/** @type {any} */ x) => h('label', { class: 'sd-path-card' },
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
      h('span', { class: 'sd-help' }, 'Fills undecided stages with the suggested tool and marks the stages this path skips as Not needed. Stages you already decided stay as they are.')),
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
    h('p', { class: 'sd-q' }, 'Trả lời những câu bạn biết; câu nào chưa chắc thì để "Not sure". Gợi ý ở từng khâu đổi theo câu trả lời.'),
    ...asked.map(q2),
    rest.length ? h('details', { class: 'sd-more', 'data-more': 'profile-rest', open: moreOpen.has('profile-rest') },
      h('summary', {}, deps.icon('chev'), `${C.plural(rest.length, 'question')} the ${p.label} path doesn't need`),
      ...rest.map(q2)) : null,
  ];
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
    h('p', { class: 'sd-q' }, 'Mỗi đường nối giữa hai khâu đã quyết là một chỗ bàn giao: bên trước đưa gì, bên sau đọc ở đâu và bằng cách nào, hai bên hứa gì, kiểm thế nào là đã nối được. Điền vài đường quan trọng là đủ.'),
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
  return h('details', { class: `sd-edge-item${e.c ? ' is-set' : ''}`, 'data-more': id, 'data-edge-item': e.key, open: moreOpen.has(id) },
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
    h('p', { class: 'sd-q' }, 'Những cặp lựa chọn hay vấp khi ghép với nhau. Trang chỉ báo khi các khâu liên quan đã quyết.'),
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
  return [
    h('p', { class: 'dlg-kicker' }, `${LANE_LABEL[/** @type {'data'} */ (s.lane)]} · stage ${at - 1}`),
    h('h3', { class: 'sd-h' }, s.title),
    h('p', { class: 'sd-q' }, s.question),
    h('div', { class: 'sd-guide' }, ...s.guide.split('\n').map((/** @type {string} */ l) => h('p', {}, l))),
    !answered ? h('p', { class: 'sd-tip' }, 'Pick what you deliver or answer the project profile to get a recommendation. ',
      h('button', { type: 'button', class: 'sd-link', 'data-at': 0 }, 'Go to start')) : null,
    need === 'skip' ? h('p', { class: 'sd-tip' }, `The ${p.label} path doesn't need this stage.`)
      : need === 'maybe' ? h('p', { class: 'sd-tip' }, `Optional on the ${p.label} path.`) : null,
    ...D.warnings(cat, d).filter((x) => x.stages.includes(s.id)).map((x) => h('div', { class: 'sd-warnbox', role: 'note' }, h('b', {}, x.title), h('p', {}, x.msg))),
    h('div', { class: 'sd-skip' },
      h('button', { type: 'button', class: 'btn small', 'aria-pressed': String(st.skip), 'data-skip': s.id }, 'Not needed'),
      s.skipWhen ? h('span', { class: 'sd-help' }, s.skipWhen) : null),
    st.skip ? null : h('div', { class: 'sd-opts', role: 'group', 'aria-label': s.multi ? 'Options (pick one or more)' : 'Options (pick one)' },
      ...(hasPick ? picked : ranked).map(card),
      hasPick && rest.length ? h('details', { class: 'sd-more', 'data-more': s.id, open: moreOpen.has(s.id) },
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
    h('details', { class: 'sd-det' },
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
  $('sd-plan').addEventListener('click', addToPlan);
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
