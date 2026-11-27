// @ts-check
/* Sơ đồ luồng của một kiến trúc (danh mục `architectures[].entries[].diagram`), thuần: kiểm dữ liệu, xếp lưới, toạ độ.
 * Lưới: tầng (layer) theo đường đi của dữ liệu, làn (row) cắt ngang. Tầng tính từ đường nối: đường dài nhất từ gốc, rồi mỗi
 * nút không phải đích đẩy tới sát nút sau gần nhất của nó; nên mọi đường nối đi đúng một tầng (diagramErrors bắt chỗ sai).
 * Làn: `row` của nút (bội của 0,5), không ghi thì là thứ tự của nút trong tầng ấy.
 * Ngang (tầng là cột) khi mỗi hộp còn rộng ≥ minBox; hẹp hơn thì dọc (tầng là hàng, làn là cột). Đường nối gấp khúc ở giữa
 * khoảng trống giữa hai tầng, nên không bao giờ đi qua hộp.
 * Xuất: KINDS, MAX_LAYERS, MAX_LANES, diagramGrid, diagramErrors, wrapText, layoutDiagram.
 * Dùng: không. */

export const KINDS = ['src', 'run', 'store', 'use'];
export const MAX_LAYERS = 5;      // ngang ở khung hẹp nhất của máy tính (hộp thoại 666px) vẫn đọc được
export const MAX_LANES = 3;       // dọc ở 390px: ba cột hộp

/** @typedef {{id: string, label: string, note?: string, kind: string, row?: number}} DNode */
/** @typedef {{from: string, to: string, dashed?: boolean}} DEdge */
/** @typedef {{nodes: DNode[], edges: DEdge[], group?: {label: string, nodes: string[]}}} Diagram */

/** Tầng và làn của mọi nút; null khi đồ thị không xếp được (id lạ, có vòng). @param {Diagram} d */
export function diagramGrid(d) {
  const ids = d.nodes.map((n) => n.id);
  if (new Set(ids).size !== ids.length || d.edges.some((e) => !ids.includes(e.from) || !ids.includes(e.to))) return null;
  const succ = new Map(ids.map((id) => [id, /** @type {string[]} */ ([])]));
  const pred = new Map(ids.map((id) => [id, /** @type {string[]} */ ([])]));
  for (const e of d.edges) { succ.get(e.from)?.push(e.to); pred.get(e.to)?.push(e.from); }
  /* Thứ tự tô-pô (Kahn); còn sót nút là có vòng. */
  const deg = new Map(ids.map((id) => [id, pred.get(id)?.length || 0]));
  const order = ids.filter((id) => !deg.get(id));
  for (let i = 0; i < order.length; i++) {
    for (const s of succ.get(order[i]) || []) {
      deg.set(s, (deg.get(s) || 0) - 1);
      if (!deg.get(s)) order.push(s);
    }
  }
  if (order.length !== ids.length) return null;
  const layer = new Map(ids.map((id) => [id, 0]));
  for (const id of order) for (const s of succ.get(id) || []) layer.set(s, Math.max(layer.get(s) || 0, (layer.get(id) || 0) + 1));
  for (const id of [...order].reverse()) {
    const ss = succ.get(id) || [];
    if (ss.length) layer.set(id, Math.min(...ss.map((s) => layer.get(s) || 0)) - 1);
  }
  const used = new Map();
  const nodes = d.nodes.map((n) => {
    const l = layer.get(n.id) || 0;
    const k = used.get(l) || 0;
    used.set(l, k + 1);
    return { ...n, layer: l, row: typeof n.row === 'number' ? n.row : k };
  });
  const layers = Math.max(0, ...nodes.map((n) => n.layer)) + 1;
  const lanes = Math.max(0, ...nodes.map((n) => n.row)) + 1;
  return { nodes, edges: d.edges, group: d.group || null, layers, lanes };
}

/** Lỗi của một sơ đồ (rỗng = dùng được). @param {any} d */
export function diagramErrors(d) {
  /** @type {string[]} */
  const out = [];
  if (!d || !Array.isArray(d.nodes) || !Array.isArray(d.edges)) return ['diagram needs nodes[] and edges[]'];
  if (d.nodes.length < 2 || !d.edges.length) out.push('diagram needs at least two nodes and one edge');
  const ids = d.nodes.map((/** @type {any} */ n) => n?.id);
  if (new Set(ids).size !== ids.length) out.push('duplicate node id');
  for (const n of d.nodes) {
    if (!n || typeof n.id !== 'string' || !n.id || typeof n.label !== 'string' || !n.label.trim()) out.push(`node ${n?.id}: needs id, label`);
    else if (!KINDS.includes(n.kind)) out.push(`node ${n.id}: kind is one of ${KINDS.join(', ')}`);
    if (n && 'row' in n && !(typeof n.row === 'number' && n.row >= 0 && Number.isInteger(n.row * 2))) out.push(`node ${n.id}: row is a multiple of 0.5, >= 0`);
  }
  const pairs = new Set();
  for (const e of d.edges) {
    if (!ids.includes(e?.from) || !ids.includes(e?.to)) out.push(`edge ${e?.from} > ${e?.to}: unknown id`);
    if (e?.from === e?.to) out.push(`edge ${e?.from} > ${e?.to}: loops to itself`);
    const k = `${e?.from}>${e?.to}`;
    if (pairs.has(k)) out.push(`edge ${k} repeated`);
    pairs.add(k);
  }
  /* Liền một khối: mọi nút tới được từ nút đầu khi bỏ chiều đường nối. */
  const seen = new Set([ids[0]]);
  for (let grew = true; grew;) {
    grew = false;
    for (const e of d.edges) {
      if (seen.has(e?.from) !== seen.has(e?.to)) { seen.add(e.from); seen.add(e.to); grew = true; }
    }
  }
  const lone = ids.filter((id) => !seen.has(id));
  if (lone.length) out.push(`nodes not connected to the diagram: ${lone.join(', ')}`);
  if (out.length) return out;
  const g = diagramGrid(d);
  if (!g) return ['edges form a cycle'];
  const at = new Map(g.nodes.map((n) => [n.id, n]));
  for (const e of d.edges) {
    const a = at.get(e.from), b = at.get(e.to);
    if (a && b && b.layer !== a.layer + 1) out.push(`edge ${e.from} > ${e.to} spans ${b.layer - a.layer} layers (must be one)`);
  }
  if (g.layers > MAX_LAYERS) out.push(`${g.layers} layers, at most ${MAX_LAYERS}`);
  if (g.lanes > MAX_LANES) out.push(`${g.lanes} lanes, at most ${MAX_LANES}`);
  for (const a of g.nodes) {
    for (const b of g.nodes) {
      if (a.id < b.id && a.layer === b.layer && Math.abs(a.row - b.row) < 1) out.push(`nodes ${a.id}, ${b.id} overlap (same layer, rows < 1 apart)`);
    }
  }
  if (g.group) {
    const gn = g.group.nodes;
    if (!Array.isArray(gn) || !gn.length || gn.some((id) => !at.has(id)) || new Set(gn).size !== gn.length) out.push('group.nodes must name existing nodes, once each');
    else {
      const ms = gn.map((id) => at.get(id));
      const l0 = Math.min(...ms.map((n) => n.layer)), l1 = Math.max(...ms.map((n) => n.layer));
      const r0 = Math.min(...ms.map((n) => n.row)), r1 = Math.max(...ms.map((n) => n.row));
      const inside = g.nodes.filter((n) => !gn.includes(n.id) && n.layer >= l0 && n.layer <= l1 && n.row > r0 - 1 && n.row < r1 + 1);
      if (inside.length) out.push(`nodes outside the group sit inside its box: ${inside.map((n) => n.id).join(', ')}`);
    }
  }
  return out;
}

/** Ngắt chữ thành dòng vừa `max` px; từ dài hơn một dòng thì cắt theo ký tự.
 * @param {string} text @param {number} max @param {(s: string) => number} measure */
export function wrapText(text, max, measure) {
  /** @type {string[]} */
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (measure(next) <= max) { line = next; continue; }
    if (line) lines.push(line);
    line = '';
    let w = word;
    while (measure(w) > max && w.length > 1) {
      let k = w.length - 1;
      while (k > 1 && measure(w.slice(0, k)) > max) k--;
      lines.push(w.slice(0, k));
      w = w.slice(k);
    }
    line = w;
  }
  if (line) lines.push(line);
  return lines;
}

/** Toạ độ của sơ đồ trong bề rộng W.
 * dim: flow (khoảng giữa hai tầng, có mũi tên), cross (khoảng giữa hai làn), minBox / maxBox (bề rộng hộp), pad (lề trong hộp),
 * bar (vạch màu bên trái hộp, gồm khoảng sau nó), lh (cao một dòng), gap (giữa tên và ghi chú), gpad (lề của khung nhóm), tip
 * (mũi tên dừng trước hộp chừng này).
 * @param {Diagram} d @param {number} W
 * @param {{flow: number, cross: number, minBox: number, maxBox: number, pad: number, bar: number, lh: number, gap: number, gpad: number, tip: number}} dim
 * @param {(s: string, kind: 'label' | 'note') => number} measure */
export function layoutDiagram(d, W, dim, measure) {
  const g = diagramGrid(d);
  if (!g) return null;
  const m = dim.gpad + 1;
  const maxRow = g.lanes - 1;
  const fitH = (W - 2 * m - (g.layers - 1) * dim.flow) / g.layers;
  const dir = fitH >= dim.minBox ? 'h' : 'v';
  const bw = Math.floor(Math.min(dim.maxBox, dir === 'h' ? fitH : (W - 2 * m - maxRow * dim.cross) / (maxRow + 1)));
  const tw = bw - 2 * dim.pad - dim.bar;
  const boxes = g.nodes.map((n) => {
    const label = wrapText(n.label, tw, (s) => measure(s, 'label'));
    const note = n.note ? wrapText(n.note, tw, (s) => measure(s, 'note')) : [];
    const h = 2 * dim.pad + (label.length + note.length) * dim.lh + (note.length ? dim.gap : 0);
    return { id: n.id, kind: n.kind, layer: n.layer, row: n.row, label, note, x: 0, y: 0, w: bw, h };
  });
  let width = 0, height = 0;
  /** @type {number[]} */
  let turnV = [];
  if (dir === 'h') {
    const rh = Math.max(...boxes.map((b) => b.h));
    for (const b of boxes) {
      b.x = m + b.layer * (bw + dim.flow);
      b.y = m + b.row * (rh + dim.cross) + (rh - b.h) / 2;
    }
    width = 2 * m + g.layers * bw + (g.layers - 1) * dim.flow;
    height = 2 * m + maxRow * (rh + dim.cross) + rh;
  } else {
    const lh = Array.from({ length: g.layers }, (_, l) => Math.max(0, ...boxes.filter((b) => b.layer === l).map((b) => b.h)));
    const tops = lh.map((_, l) => m + lh.slice(0, l).reduce((s, x) => s + x, 0) + l * dim.flow);
    for (const b of boxes) {
      b.x = m + b.row * (bw + dim.cross);
      b.y = tops[b.layer] + (lh[b.layer] - b.h) / 2;
    }
    width = 2 * m + maxRow * (bw + dim.cross) + bw;
    height = tops[g.layers - 1] + lh[g.layers - 1] + m;
    turnV = tops.map((t, l) => t + lh[l] + dim.flow / 2);
  }
  const at = new Map(boxes.map((b) => [b.id, b]));
  const edges = g.edges.map((e) => {
    const a = /** @type {any} */ (at.get(e.from)), b = /** @type {any} */ (at.get(e.to));
    let path;
    if (dir === 'h') {
      const x0 = a.x + a.w, y0 = a.y + a.h / 2, x1 = b.x - dim.tip, y1 = b.y + b.h / 2, mx = x0 + dim.flow / 2;
      path = Math.abs(y0 - y1) < 0.5 ? `M${x0} ${y0}H${x1}` : `M${x0} ${y0}H${mx}V${y1}H${x1}`;
    } else {
      const x0 = a.x + a.w / 2, y0 = a.y + a.h, x1 = b.x + b.w / 2, y1 = b.y - dim.tip;
      /* Gấp ở giữa khoảng trống giữa hai tầng (hộp thấp nằm giữa tầng cao hơn nó). */
      path = Math.abs(x0 - x1) < 0.5 ? `M${x0} ${y0}V${y1}` : `M${x0} ${y0}V${turnV[a.layer]}H${x1}V${y1}`;
    }
    return { from: e.from, to: e.to, dashed: !!e.dashed, d: path };
  });
  let group = null;
  if (g.group) {
    const ms = g.group.nodes.map((id) => at.get(id)).filter(Boolean);
    const x0 = Math.min(...ms.map((b) => /** @type {any} */ (b).x)) - dim.gpad, y0 = Math.min(...ms.map((b) => /** @type {any} */ (b).y)) - dim.gpad;
    const x1 = Math.max(...ms.map((b) => /** @type {any} */ (b).x + /** @type {any} */ (b).w)) + dim.gpad;
    const y1 = Math.max(...ms.map((b) => /** @type {any} */ (b).y + /** @type {any} */ (b).h)) + dim.gpad;
    group = { label: g.group.label, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  return { dir, width, height, boxes, edges, group };
}
