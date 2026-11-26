/* Thiết kế hệ thống của một dự án (PLAN-016) — logic thuần, không DOM, chạy được trong Node.
 * Danh mục (data/system-design.json): lối bắt đầu theo thứ bàn giao (`paths`), hồ sơ dự án (câu hỏi → lựa chọn) và các khâu
 * theo đường đi của dữ liệu, mỗi khâu nhiều phương án có `fit` (khoá hồ sơ → các câu trả lời hợp).
 * Dự án giữ `design = {path, profile, stages, edges}`; không có gì thì null. `edges`: bàn giao trên đường nối hai khâu liền nhau
 * của sơ đồ, khoá `khâu trước>khâu sau`. */

const ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const isObj = (/** @type {any} */ v) => !!v && typeof v === 'object' && !Array.isArray(v);
const line = (/** @type {any} */ s) => (typeof s === 'string' ? s : '').replace(/\s+/g, ' ').trim();
const lines = (/** @type {any} */ s) => (typeof s === 'string' ? s : '').replace(/\r\n?/g, '\n').split('\n')
  .map((l) => l.replace(/\s+$/, '')).join('\n').replace(/^\n+|\n+$/g, '');
export const OWN_MAX = 120;
export const EDGE_MAX = 300;
const EDGE_KEY = /^([a-z0-9][a-z0-9-]{0,39})>([a-z0-9][a-z0-9-]{0,39})$/;
/** Cách bàn giao giữa hai khâu; `short`: chữ trên nhãn của đường nối trong sơ đồ. */
export const VIA = [
  { id: 'file', label: 'File', short: 'File' },
  { id: 'sql', label: 'SQL table', short: 'SQL' },
  { id: 'api', label: 'HTTP API', short: 'API' },
  { id: 'call', label: 'Function call', short: 'Call' },
  { id: 'results', label: 'Precomputed results', short: 'Results' },
];
export const EDGE_FIELDS = ['via', 'what', 'where', 'promise', 'check'];

/** Hợp đồng của một đường nối; trống thì null. @param {any} v */
export function normEdge(v) {
  if (!isObj(v)) return null;
  const e = {
    via: VIA.some((x) => x.id === v.via) ? v.via : '',
    what: line(v.what).slice(0, EDGE_MAX), where: line(v.where).slice(0, EDGE_MAX), promise: lines(v.promise), check: line(v.check).slice(0, EDGE_MAX),
  };
  return e.via || e.what || e.where || e.promise || e.check ? e : null;
}

/** @param {any} v @returns {string[]} */
const idList = (v) => (Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === 'string' && ID.test(x)))] : []);

/**
 * Khoá và id chỉ là chữ thường, số, gạch nối (id lạ của danh mục cũ vẫn giữ: giao diện bỏ qua cái không còn).
 * Khâu "không cần" (`skip`) vẫn giữ phương án, chữ tự ghi (ẩn, bỏ qua ở mọi chỗ): tắt "không cần" là chúng về lại.
 * Khâu trống bị bỏ; dự án không còn gì thì null.
 * @param {any} o
 * @returns {null | {path: string, profile: Record<string,string>, stages: Record<string,{pick:string[], skip:boolean, own:string, note:string}>}}
 */
export function normDesign(o) {
  if (!isObj(o)) return null;
  const path = typeof o.path === 'string' && ID.test(o.path) ? o.path : '';
  /** @type {Record<string,string>} */
  const profile = {};
  if (isObj(o.profile)) for (const [k, v] of Object.entries(o.profile)) if (ID.test(k) && typeof v === 'string' && ID.test(v)) profile[k] = v;
  /** @type {Record<string,any>} */
  const stages = {};
  if (isObj(o.stages)) {
    for (const [k, v] of Object.entries(o.stages)) {
      if (!ID.test(k) || !isObj(v)) continue;
      const skip = v.skip === true;
      const st = { pick: idList(v.pick), skip, own: line(v.own).slice(0, OWN_MAX), note: lines(v.note) };
      if (st.pick.length || st.skip || st.own || st.note) stages[k] = st;
    }
  }
  /* Bàn giao giữ cả khi hai khâu chưa cùng quyết (sơ đồ, việc chỉ dùng đường nối đang có). */
  /** @type {Record<string,any>} */
  const edges = {};
  if (isObj(o.edges)) for (const [k, v] of Object.entries(o.edges)) { const e = EDGE_KEY.test(k) ? normEdge(v) : null; if (e) edges[k] = e; }
  return path || Object.keys(profile).length || Object.keys(stages).length || Object.keys(edges).length ? { path, profile, stages, edges } : null;
}

/** Bản trống để sửa. @returns {{path: string, profile: Record<string,string>, stages: Record<string,any>, edges: Record<string,any>}} */
export const emptyDesign = () => ({ path: '', profile: {}, stages: {}, edges: {} });

/** Lối đã chọn (còn trong danh mục) hay null. @param {any} cat @param {any} design */
export const pathOf = (cat, design) => (design && design.path && (cat.paths || []).find((/** @type {any} */ p) => p.id === design.path)) || null;

/** Hồ sơ dùng để gợi ý: câu người dùng đã trả lời; câu chưa trả lời lấy theo lối (`implies`). @param {any} cat @param {any} design */
export function effProfile(cat, design) {
  const p = pathOf(cat, design);
  return { ...(p ? p.implies : {}), ...(design ? design.profile : {}) };
}

/** Trạng thái một khâu: 'done' (đã chọn hay tự ghi), 'skip' (không cần), 'open'. @param {any} design @param {string} id */
export function stageState(design, id) {
  const st = design && design.stages[id];
  if (!st) return 'open';
  if (st.skip) return 'skip';
  return st.pick.length || st.own ? 'done' : 'open';
}

/**
 * Phương án hợp hồ sơ không: mọi câu hồ sơ đã trả lời mà `fit` có nhắc tới đều phải khớp. `miss`: các khoá lệch.
 * @param {any} opt @param {Record<string,string>} profile
 * @returns {{ok: boolean, score: number, miss: string[]}}
 */
export function fitOf(opt, profile) {
  const fit = isObj(opt.fit) ? opt.fit : {};
  let score = 0;
  /** @type {string[]} */
  const miss = [];
  for (const [k, allowed] of Object.entries(fit)) {
    const ans = profile[k];
    if (!ans || !Array.isArray(allowed)) continue;
    if (allowed.includes(ans)) score++; else miss.push(k);
  }
  return { ok: miss.length === 0, score, miss };
}

/**
 * Phương án của một khâu theo thứ tự gợi ý: hợp hồ sơ trước, rồi phương án lối đã chọn gợi ý (`sug`), khớp nhiều câu hơn,
 * dễ hơn, rồi thứ tự danh mục. `top`: phương án đứng đầu khi đã trả lời ít nhất một câu hồ sơ hay chọn lối, và nó hợp.
 * @param {any} stage @param {Record<string,string>} profile @param {any} [path]
 */
export function rankOptions(stage, profile, path = null) {
  const answered = Object.keys(profile).length > 0 || !!path;
  const sug = (path && path.suggest[stage.id]) || [];
  const rows = stage.options.map((/** @type {any} */ o, /** @type {number} */ i) => ({ opt: o, i, sug: sug.includes(o.id), ...fitOf(o, profile) }));
  rows.sort((a, b) => (+b.ok - +a.ok) || (+b.sug - +a.sug) || (b.score - a.score) || ((a.opt.level || 2) - (b.opt.level || 2)) || (a.i - b.i));
  return rows.map((r, k) => ({ ...r, top: answered && k === 0 && r.ok }));
}

/**
 * Áp lối vào thiết kế: chỉ khâu chưa quyết. Khâu lối bỏ (`skip`) thành "không cần"; khâu lối cần (`need`) có gợi ý thì chọn
 * phương án đứng đầu (hợp hồ sơ, ưu tiên gợi ý của lối). Khâu `maybe` để người dùng tự quyết. Không đụng khâu đã quyết.
 * @param {any} cat @param {any} design @param {string} pathId
 * @returns {{next: any, filled: string[], skipped: string[]}}
 */
export function applyPath(cat, design, pathId) {
  const d = design ? JSON.parse(JSON.stringify(design)) : emptyDesign();
  d.path = pathId;
  const path = pathOf(cat, d);
  /** @type {string[]} */ const filled = [];
  /** @type {string[]} */ const skipped = [];
  if (!path) return { next: normDesign(d), filled, skipped };
  const prof = effProfile(cat, d);
  for (const s of cat.stages) {
    if (stageState(d, s.id) !== 'open') continue;
    const need = path.stages[s.id];
    const rec = d.stages[s.id] || { pick: [], skip: false, own: '', note: '' };
    if (need === 'skip') {
      rec.skip = true;
      skipped.push(s.id);
    } else if (need === 'need' && path.suggest[s.id]) {
      const r = rankOptions(s, prof, path);
      const best = r[0].ok ? r[0] : (r.find((x) => x.sug) || r[0]);
      rec.pick = [best.opt.id];
      filled.push(s.id);
    } else continue;
    d.stages[s.id] = rec;
  }
  return { next: normDesign(d), filled, skipped };
}

/**
 * Luật phối hợp của danh mục (`checks`): báo khi mọi điều kiện `if` khớp, và mọi khâu trong `unless` đã quyết mà không khớp
 * (khâu chưa quyết: chưa biết, chưa báo). Khoá điều kiện: id khâu (giá trị là id phương án đã chọn, `skip` = khâu "không cần",
 * `own` = có công cụ tự ghi), id câu hồ sơ (câu trả lời, kể cả câu lối giả định) hay `path`.
 * @param {any} cat @param {any} design
 * @returns {{id: string, title: string, msg: string, stages: string[]}[]}
 */
export function warnings(cat, design) {
  if (!design || !Array.isArray(cat.checks)) return [];
  const prof = effProfile(cat, design);
  const stageIds = new Set(cat.stages.map((/** @type {any} */ s) => s.id));
  /** Khớp (true), không khớp (false) hay chưa biết (null). @param {string} k @param {string[]} vals */
  const term = (k, vals) => {
    if (k === 'path') return vals.includes(design.path);
    if (!stageIds.has(k)) return prof[k] ? vals.includes(prof[k]) : null;
    const st = design.stages[k];
    const state = stageState(design, k);
    if (state === 'open') return null;
    if (state === 'skip') return vals.includes('skip');
    return st.pick.some((/** @type {string} */ id) => vals.includes(id)) || (!!st.own && vals.includes('own'));
  };
  const out = [];
  for (const c of cat.checks) {
    const hit = Object.entries(c.if).every(([k, v]) => term(k, /** @type {string[]} */ (v)) === true)
      && Object.entries(c.unless || {}).every(([k, v]) => term(k, /** @type {string[]} */ (v)) === false);
    if (hit) out.push({ id: c.id, title: c.title, msg: c.msg, stages: [...new Set([...Object.keys(c.if), ...Object.keys(c.unless || {})])].filter((k) => stageIds.has(k)) });
  }
  return out;
}

/** Số khâu đã quyết (chọn, tự ghi hay không cần) trên tổng số khâu. @param {any} catalog @param {any} design */
export function decidedCount(catalog, design) {
  const ids = catalog.stages.map((/** @type {any} */ s) => s.id);
  return { done: ids.filter((id) => stageState(design, id) !== 'open').length, total: ids.length };
}

/** Tên hiện của một khâu đã chọn: tên các phương án còn trong danh mục, rồi chữ tự ghi. @param {any} stage @param {any} st */
export function pickNames(stage, st) {
  if (!st || st.skip) return [];
  const names = st.pick.map((/** @type {string} */ id) => stage.options.find((/** @type {any} */ o) => o.id === id)?.name).filter(Boolean);
  if (st.own) names.push(st.own);
  return names;
}

/* ── Sơ đồ: khâu theo đường đi của dữ liệu xếp kiểu rắn bò (hàng chẵn trái → phải, hàng lẻ phải → trái), nên hai khâu
 * liền nhau luôn kề ngang hoặc thẳng dọc — mũi tên không bao giờ cắt nhau ở mọi số cột. ── */

/** Ô (hàng, cột) của nút thứ i khi xếp `cols` cột kiểu rắn bò. @param {number} i @param {number} cols */
export function snake(i, cols) {
  const row = Math.floor(i / cols);
  const c = i % cols;
  return { row, col: row % 2 ? cols - 1 - c : c };
}

/**
 * Các nút của sơ đồ: luồng (data, model, app theo thứ tự danh mục, bỏ khâu "không cần", cuối là người dùng) và vận hành
 * (lane ops). Khâu chưa quyết vẫn hiện, đánh dấu `open`.
 * @param {any} catalog @param {any} design
 */
export function diagramNodes(catalog, design) {
  /** @type {any[]} */
  const flow = [];
  /** @type {any[]} */
  const ops = [];
  for (const s of catalog.stages) {
    const state = stageState(design, s.id);
    if (state === 'skip') continue;
    const node = { id: s.id, title: s.title, lane: s.lane, names: pickNames(s, design && design.stages[s.id]), open: state === 'open' };
    (s.lane === 'ops' ? ops : flow).push(node);
  }
  if (flow.length) flow.push({ id: 'users', title: 'Users', lane: 'end', names: [], open: false });
  return { flow, ops };
}

/**
 * Đường nối có thể ghi bàn giao: hai khâu liền nhau trên luồng của sơ đồ (bỏ khâu "không cần"), cả hai đã quyết.
 * @param {any} catalog @param {any} design
 * @returns {{key: string, from: any, to: any, c: any}[]}
 */
export function flowEdges(catalog, design) {
  const flow = diagramNodes(catalog, design).flow.filter((n) => n.lane !== 'end');
  const out = [];
  for (let i = 1; i < flow.length; i++) {
    const a = flow[i - 1], b = flow[i];
    if (a.open || b.open) continue;
    const key = `${a.id}>${b.id}`;
    out.push({ key, from: a, to: b, c: (design && design.edges[key]) || null });
  }
  return out;
}

/** Chữ "đi qua" của một bàn giao. @param {string} id */
export const viaLabel = (id) => VIA.find((x) => x.id === id)?.label || '';

/* ── Việc cho bảng: một bước "System build", mỗi khâu đã quyết một bước con (tên khâu: phương án), "Done when" là việc của
 * phương án (công cụ tự ghi: việc chung của khâu), ghi chú là lệnh bắt đầu, tài liệu là link chính thức. ── */

export const PLAN_STEP = {
  title: 'System build',
  goal: 'Dựng hệ thống theo khung đã chọn ở System design.',
  doneWhen: 'Mọi khâu đã chọn chạy nối tiếp nhau, từ nguồn dữ liệu tới người dùng.',
  notes: 'Dựng một đường chạy thông sớm: dữ liệu thật, mô hình đơn giản nhất, giao diện thô, deploy được. Rồi mới làm tốt từng khâu.\n'
    + 'Nguồn: Google, Rules of Machine Learning, rule #4: https://developers.google.com/machine-learning/guides/rules-of-ml',
};

/** @param {any} catalog @param {any} design */
export function planTasks(catalog, design) {
  /** @type {any[]} */
  const out = [];
  if (!design) return out;
  for (const s of catalog.stages) {
    const st = design.stages[s.id];
    if (!st || st.skip) continue;
    const opts = st.pick.map((/** @type {string} */ id) => s.options.find((/** @type {any} */ o) => o.id === id)).filter(Boolean);
    const names = pickNames(s, st);
    if (!names.length) continue;
    const setup = opts.flatMap((/** @type {any} */ o) => o.setup || []);
    const notes = [setup.length ? 'Lệnh bắt đầu:' : '', ...setup.map((/** @type {string} */ c) => '  ' + c), st.note].filter(Boolean).join('\n');
    out.push({
      title: `${s.title}: ${names.join(' + ')}`,
      doneWhen: [...opts.map((/** @type {any} */ o) => o.task), st.own ? s.task : ''].filter(Boolean).join(' '),
      notes,
      docs: opts.flatMap((/** @type {any} */ o) => (o.links || []).map((/** @type {any} */ l) => ({ kind: 'link', title: `${o.name} · ${l.title}`, url: l.url }))),
    });
  }
  /* Mỗi đường nối đã ghi bàn giao một việc tích hợp: Done when là phép kiểm, ghi chú là hợp đồng. */
  for (const e of flowEdges(catalog, design)) {
    if (!e.c) continue;
    out.push({
      title: `Handoff: ${e.from.title} → ${e.to.title}`,
      doneWhen: e.c.check || `${e.to.title} đọc được đầu ra của ${e.from.title} theo hợp đồng bàn giao, trên dữ liệu mẫu.`,
      notes: [e.c.via ? `Via: ${viaLabel(e.c.via)}` : '', e.c.what ? `What: ${e.c.what}` : '', e.c.where ? `Where: ${e.c.where}` : '',
        e.c.promise ? `Promise: ${e.c.promise}` : ''].filter(Boolean).join('\n'),
      docs: [],
    });
  }
  return out;
}

/* ── Markdown: mục "## System design" (core.js gọi designMd, designReader). `Path: tên [path: id]` (dòng thụt dưới nó: luồng
 * và mốc nghiệm thu của lối, chép từ danh mục cho người và AI đọc, nhập bỏ qua). Mỗi khâu một dòng: chữ đọc được, cuối dòng
 * là `[khâu: id, id]` (hay `[khâu: skip]`; lựa chọn ẩn của khâu "không cần" không ghi) — trang chỉ đọc phần trong ngoặc.
 * Dòng thụt: `Own: …` rồi ghi chú. `Handoffs:` rồi mỗi đường nối một mục `- A → B [handoff: a > b]`, dòng thụt `Via:`, `What:`,
 * `Where:`, `Promise:` (dòng tiếp thụt bốn), `Check:`. `Warnings:` (luật phối hợp đang báo, cho người và AI đọc) nhập bỏ qua. ── */

export const DESIGN_HEADING = 'System design';
export const DESIGN_HEAD_RE = /^(?:system design|thiết kế hệ thống)$/i;
const TAIL = /\[([a-z0-9][a-z0-9-]{0,39}):\s*([a-z0-9-]*(?:\s*,\s*[a-z0-9-]+)*)\s*\]\s*$/;

/** @param {Record<string,string>} profile */
export const profileLine = (profile) => 'Profile: ' + Object.entries(profile).map(([k, v]) => `${k} ${v}`).join(' · ');

/** Đọc `Profile: size small · fresh once`. @param {string} rest */
export function readProfile(rest) {
  /** @type {Record<string,string>} */
  const p = {};
  for (const part of rest.split('·')) {
    const m = /^\s*([a-z0-9][a-z0-9-]*)\s*[:=]?\s+([a-z0-9][a-z0-9-]*)\s*$/i.exec(part);
    if (m) p[m[1].toLowerCase()] = m[2].toLowerCase();
  }
  return p;
}

/**
 * Dòng khâu. `labels` (tuỳ chọn, từ danh mục) cho chữ đọc được trước ngoặc.
 * @param {string} id @param {any} st @param {{stage?: string, names?: string[]}} [labels]
 */
export function stageLine(id, st, labels = {}) {
  const tag = `[${id}: ${st.skip ? 'skip' : st.pick.join(', ')}]`;
  const human = st.skip ? 'not needed' : (labels.names || []).filter(Boolean).join(' + ');
  const head = labels.stage ? `${labels.stage}: ${human || '—'}` : human;
  return `- ${head ? head + ' ' : ''}${tag}`;
}

/** Dòng gạch đầu dòng của mục System design → {id, pick, skip} hay null. @param {string} text */
export function readStageLine(text) {
  const m = TAIL.exec(text);
  if (!m) return null;
  const vals = m[2].split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  const skip = vals.length === 1 && vals[0] === 'skip';
  return { id: m[1].toLowerCase(), pick: skip ? [] : vals, skip };
}

/* ── Kiểm danh mục (lint.py kiểm khuôn; hàm này cho test và cho trang báo lỗi rõ) ── */

/** @param {any} cat @returns {string[]} lỗi */
export function catalogErrors(cat) {
  const err = [];
  if (!isObj(cat) || !Array.isArray(cat.paths) || !Array.isArray(cat.profile) || !Array.isArray(cat.stages)) return ['catalog needs paths[], profile[] and stages[]'];
  const answers = new Map(cat.profile.map((/** @type {any} */ q) => [q.id, new Set((q.choices || []).map((/** @type {any} */ c) => c.id))]));
  const seen = new Set();
  for (const s of cat.stages) {
    if (!ID.test(s.id) || seen.has(s.id)) err.push(`stage id: ${s.id}`);
    seen.add(s.id);
    if (!['data', 'model', 'app', 'ops'].includes(s.lane)) err.push(`${s.id}: lane ${s.lane}`);
    const ids = new Set();
    for (const o of s.options || []) {
      if (!ID.test(o.id) || ids.has(o.id) || o.id === 'skip' || o.id === 'own') err.push(`${s.id}: option id ${o.id}`);
      ids.add(o.id);
      for (const [k, v] of Object.entries(o.fit || {})) {
        const ok = answers.get(k);
        if (!ok) err.push(`${s.id}/${o.id}: fit key ${k}`);
        else for (const a of /** @type {any[]} */ (v)) if (!ok.has(a)) err.push(`${s.id}/${o.id}: fit ${k}=${a}`);
      }
    }
  }
  return err;
}

/**
 * Các dòng sau tiêu đề `## System design`. `cat`: danh mục (chữ đọc được) hay null (chỉ id).
 * @param {any} d @param {any} cat @param {(s: string) => string} esc @param {(l: string[]) => string[]} hard
 * @returns {string[]}
 */
export function designMd(d, cat, esc, hard) {
  const out = [];
  if (d.path) {
    const p = cat ? pathOf(cat, d) : null;
    out.push('', ...hard([`Path: ${p ? p.label + ' ' : ''}[path: ${d.path}]`,
      ...(p ? [...p.flow.map((/** @type {string} */ f, /** @type {number} */ i) => `  Flow ${i + 1}: ${f}`), ...p.accept.map((/** @type {string} */ a) => `  Accept: ${a}`)] : [])]));
  }
  if (Object.keys(d.profile).length) out.push('', profileLine(d.profile));
  const ids = Object.keys(d.stages);
  if (ids.length) out.push('');
  for (const id of ids) {
    const st = d.stages[id];
    const more = [];
    if (st.own && !st.skip) more.push(`  Own: ${st.own}`);
    /* Ghi chú mở bằng `Own:` thì thoát, kẻo đọc lại thành chữ tự ghi. */
    if (st.note) more.push(...st.note.split('\n').map((/** @type {string} */ l) => '  ' + (/^own:/i.test(l) ? '\\' + l : esc(l))));
    const s = cat && cat.stages.find((/** @type {any} */ x) => x.id === id);
    out.push(...hard([stageLine(id, st, s ? { stage: s.title, names: pickNames(s, st) } : {}), ...more]));
  }
  const keys = Object.keys(d.edges || {});
  if (keys.length) {
    const order = (/** @type {string} */ k) => (cat ? cat.stages.findIndex((/** @type {any} */ x) => x.id === k.split('>')[0]) : 0);
    out.push('', 'Handoffs:');
    for (const k of keys.sort((a, b) => order(a) - order(b))) {
      const e = d.edges[k];
      const [a, b] = k.split('>');
      const t = (/** @type {string} */ id) => (cat && cat.stages.find((/** @type {any} */ x) => x.id === id)?.title) || id;
      const pr = e.promise ? e.promise.split('\n') : [];
      out.push(...hard([`- ${cat ? `${t(a)} → ${t(b)} ` : ''}[handoff: ${a} > ${b}]`, ...(e.via ? [`  Via: ${e.via}`] : []),
        ...(e.what ? [`  What: ${e.what}`] : []), ...(e.where ? [`  Where: ${e.where}`] : []),
        ...pr.map((/** @type {string} */ l, /** @type {number} */ i) => (i ? '    ' + esc(l) : `  Promise: ${esc(l)}`)), ...(e.check ? [`  Check: ${e.check}`] : [])]));
    }
  }
  const warns = cat ? warnings(cat, d) : [];
  if (warns.length) out.push('', 'Warnings:', ...hard(warns.map((w) => `- ${w.title}: ${w.msg}`)));
  return out;
}

/**
 * Bộ đọc mục System design của Markdown: core.js đưa từng dòng (trừ tiêu đề `## `) vào `line`; kết quả ở `design`.
 * @param {string[]} warnings @param {(s: string) => string} unesc
 */
export function designReader(warnings, unesc) {
  /** @type {any} */
  const design = { path: '', profile: {}, stages: {}, edges: {} };
  let block = /** @type {'' | 'path' | 'stage' | 'edge' | 'warn'} */ ('');
  let list = /** @type {'' | 'handoffs' | 'warnings'} */ ('');
  let first = false;
  let inPromise = false;
  /** @type {any} */ let dst = null;
  /** @type {any} */ let edge = null;
  const unread = (/** @type {string} */ raw) => warnings.push(`Line in System design not read: ${raw.trim()}`);
  /** @param {string} raw */
  const line = (raw) => {
    const ind = /^( {2}|\t)(.*)$/.exec(raw);
    if (ind && block) {
      const l = ind[2];
      if (block === 'edge') {
        const m = /^(via|what|where|promise|check):\s?(.*)$/i.exec(l);
        if (inPromise && /^ {2}/.test(l)) edge.promise += '\n' + unesc(l.slice(2));
        else if (m) {
          const k = m[1].toLowerCase();
          inPromise = k === 'promise';
          if (k === 'via') edge.via = (VIA.find((x) => x.id === m[2].trim().toLowerCase() || x.label.toLowerCase() === m[2].trim().toLowerCase()) || { id: '' }).id;
          else edge[k] = k === 'promise' ? unesc(m[2]) : m[2];
        } else unread(raw);
        return;
      }
      if (block === 'stage') {
        const own = /^Own:\s?(.*)$/i.exec(l);
        if (first && own) dst.own = own[1].slice(0, OWN_MAX);
        else dst.note = dst.note == null ? unesc(l) : dst.note + '\n' + unesc(l);
      } // block 'path': luồng, mốc nghiệm thu chép từ danh mục — bỏ qua
      first = false;
      return;
    }
    block = '';
    inPromise = false;
    if (!raw.trim()) return;
    if (/^Handoffs:\s*$/i.test(raw)) { list = 'handoffs'; return; }
    if (/^Warnings:\s*$/i.test(raw)) { list = 'warnings'; return; }
    if (list === 'warnings' && /^[-*+]\s/.test(raw)) { block = 'warn'; return; } // chép từ danh mục: bỏ qua
    const hm = /^[-*+]\s+.*\[handoff:\s*([a-z0-9-]+)\s*>\s*([a-z0-9-]+)\s*\]\s*$/i.exec(raw);
    if (hm) {
      edge = design.edges[`${hm[1].toLowerCase()}>${hm[2].toLowerCase()}`] = { via: '', what: '', where: '', promise: '', check: '' };
      block = 'edge';
      return;
    }
    list = '';
    const pm = /^Profile:\s*(.*)$/i.exec(raw);
    const pa = /^Path:\s*(.*)$/i.exec(raw);
    const item = /^(?:[-*+]|\d+[.)])\s+(.*)$/.exec(raw);
    const sl = item ? readStageLine(item[1]) : null;
    if (pa) {
      const m = /\[path:\s*([a-z0-9-]+)\s*\]\s*$/i.exec(pa[1]) || /^([a-z0-9-]+)$/i.exec(pa[1].trim());
      if (m) design.path = m[1].toLowerCase(); else unread(raw);
      block = 'path';
    } else if (pm) Object.assign(design.profile, readProfile(pm[1]));
    else if (sl) {
      dst = design.stages[sl.id] = { pick: sl.pick, skip: sl.skip, own: '', note: null };
      block = 'stage'; first = true;
    } else unread(raw);
  };
  return { design, line };
}
