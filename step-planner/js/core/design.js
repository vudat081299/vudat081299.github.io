// @ts-check
/* System design (PLAN-016), thuần: chuẩn hoá thiết kế, hồ sơ, xếp hạng phương án, "Apply path", kiến trúc gợi ý, luật
   phối hợp, kiểm danh mục.
   Danh mục (data/system-design.json): lối bắt đầu theo thứ bàn giao (`paths`), hồ sơ dự án (câu hỏi → lựa chọn) và các khâu
   theo đường đi của dữ liệu, mỗi khâu nhiều phương án có `fit` (khoá hồ sơ → các câu trả lời hợp).
   Dự án giữ `design = {path, profile, stages, edges}`; không có gì thì null. `edges`: bàn giao trên đường nối hai khâu liền nhau
   của sơ đồ, khoá `khâu trước>khâu sau`.
   Xuất: OWN_MAX, EDGE_MAX, VIA, EDGE_FIELDS, normEdge, normDesign, emptyDesign, presetDesign, isPreset, pathOf, effProfile,
     stageState, fitOf, rankOptions, notNeededBy, applyPath, condTerm, archAdvice, archMissing, warnings, decidedCount, pickNames,
     catalogErrors.
   Dùng: không. */

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

/** Thiết kế đặt sẵn của một mẫu (`design` trong templates.json, PLAN-033): chỉ hồ sơ và lối, không phương án; không có thì null.
 * @param {any} tpl */
export const presetDesign = (tpl) => (isObj(tpl) && isObj(tpl.design) ? normDesign({ path: tpl.design.path, profile: tpl.design.profile }) : null);

/** Hồ sơ và lối còn đúng như mẫu đặt sẵn (người dùng chưa đổi câu nào). @param {any} design @param {any} preset */
export function isPreset(design, preset) {
  if (!design || !preset) return false;
  const a = Object.entries(design.profile), b = preset.profile;
  return design.path === preset.path && a.length === Object.keys(b).length && a.every(([k, v]) => b[k] === v);
}

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
 * Phương án của một khâu theo thứ tự gợi ý: hợp hồ sơ trước, rồi phương án lối đã chọn gợi ý (`sug`, theo thứ tự lối ghi),
 * khớp nhiều câu hơn, dễ hơn, rồi thứ tự danh mục. `top`: phương án đứng đầu khi đã trả lời ít nhất một câu hồ sơ hay chọn lối, và nó hợp.
 * @param {any} stage @param {Record<string,string>} profile @param {any} [path]
 */
export function rankOptions(stage, profile, path = null) {
  const answered = Object.keys(profile).length > 0 || !!path;
  const sug = (path && path.suggest[stage.id]) || [];
  const rows = stage.options.map((/** @type {any} */ o, /** @type {number} */ i) => ({ opt: o, i, sug: sug.includes(o.id), ...fitOf(o, profile) }));
  const at = (/** @type {any} */ r) => (r.sug ? sug.indexOf(r.opt.id) : sug.length);
  rows.sort((a, b) => (+b.ok - +a.ok) || (at(a) - at(b)) || (b.score - a.score) || ((a.opt.level || 2) - (b.opt.level || 2)) || (a.i - b.i));
  return rows.map((r, k) => ({ ...r, top: answered && k === 0 && r.ok }));
}

/**
 * Khâu chỉ cần khi hồ sơ khớp (`when` của khâu: câu hồ sơ → các câu trả lời). Trả các câu đã trả lời mà không khớp
 * (rỗng: khâu cần, hoặc chưa biết vì câu chưa trả lời). @param {any} stage @param {Record<string,string>} profile
 * @returns {string[]}
 */
export function notNeededBy(stage, profile) {
  const when = isObj(stage.when) ? stage.when : {};
  return Object.entries(when).filter(([k, v]) => profile[k] && Array.isArray(v) && !v.includes(profile[k])).map(([k]) => k);
}

/**
 * Áp lối vào thiết kế: chỉ khâu chưa quyết. Khâu lối bỏ (`skip`) hay hồ sơ cho là không cần (`when`) thành "không cần"; khâu
 * lối cần (`need`) có gợi ý thì chọn phương án đứng đầu (hợp hồ sơ, ưu tiên gợi ý của lối). Khâu `maybe` để người dùng tự
 * quyết. Không đụng khâu đã quyết. Không tự gây luật báo: trong các phương án hợp, chọn cái đầu tiên làm ít luật (trừ `caveat`)
 * báo ở khâu ấy nhất. Bỏ khâu hay phương án lấy được mà vẫn làm luật báo thì để khâu ấy cho người dùng quyết.
 * @param {any} cat @param {any} design @param {string} pathId
 * @returns {{next: any, filled: string[], skipped: string[]}}
 */
export function applyPath(cat, design, pathId) {
  const d = normDesign(design) || emptyDesign();
  d.path = pathId;
  const path = pathOf(cat, d);
  /** @type {string[]} */ const filled = [];
  /** @type {string[]} */ const skipped = [];
  if (!path) return { next: normDesign(d), filled, skipped };
  const prof = effProfile(cat, d);
  /** Số luật (trừ `caveat`) báo ở khâu `id` khi đặt nó thành `rec`. @param {string} id @param {any} rec */
  const clash = (id, rec) => warnings(cat, { ...d, stages: { ...d.stages, [id]: rec } }).filter((w) => !w.caveat && w.stages.includes(id)).length;
  for (const s of cat.stages) {
    if (stageState(d, s.id) !== 'open') continue;
    const need = path.stages[s.id];
    const rec = d.stages[s.id] || { pick: [], skip: false, own: '', note: '' };
    if (need === 'skip' || notNeededBy(s, prof).length) {
      if (clash(s.id, { ...rec, skip: true })) continue;
      rec.skip = true;
      skipped.push(s.id);
    } else if (need === 'need' && path.suggest[s.id]) {
      const r = rankOptions(s, prof, path);
      const ok = r.filter((x) => x.ok).map((x) => ({ x, n: clash(s.id, { ...rec, pick: [x.opt.id] }) }));
      const best = ok.length ? ok.reduce((a, b) => (b.n < a.n ? b : a)).x : (r.find((x) => x.sug) || r[0]);
      /* Phương án lấy được vẫn làm luật báo (vd. người dùng công khai, ngân sách miễn phí, chỉ tự host: không công cụ hợp nào né được):
       * để khâu cho người dùng quyết. */
      if (clash(s.id, { ...rec, pick: [best.opt.id] })) continue;
      rec.pick = [best.opt.id];
      filled.push(s.id);
    } else continue;
    d.stages[s.id] = rec;
  }
  return { next: normDesign(d), filled, skipped };
}

/**
 * Một điều kiện của luật (`checks`, luật gợi ý kiến trúc): khớp (true), không khớp (false) hay chưa biết (null). Khoá: `path`
 * (lối đã chọn), id khâu (phương án đã chọn, `skip` = khâu "không cần", `own` = có công cụ tự ghi; khâu chưa quyết: chưa biết)
 * hay id câu hồ sơ (câu trả lời, kể cả câu lối giả định; chưa trả lời: chưa biết).
 * @param {any} cat @param {any} design @returns {(k: string, vals: string[]) => boolean | null}
 */
export function condTerm(cat, design) {
  const prof = effProfile(cat, design);
  const stageIds = new Set(cat.stages.map((/** @type {any} */ s) => s.id));
  return (k, vals) => {
    if (k === 'path') return vals.includes(design?.path || '');
    if (!stageIds.has(k)) return prof[k] ? vals.includes(prof[k]) : null;
    const state = stageState(design, k);
    if (state === 'open') return null;
    if (state === 'skip') return vals.includes('skip');
    const st = design.stages[k];
    return st.pick.some((/** @type {string} */ id) => vals.includes(id)) || (!!st.own && vals.includes('own'));
  };
}

/**
 * Gợi ý kiến trúc (danh mục `architectures`): mỗi nhóm lấy luật đầu tiên mà mọi điều kiện `if` khớp. `id`: kiến trúc gợi ý,
 * '' = nhóm không cần (vd. không phục vụ dự đoán), null = chưa đủ câu trả lời. `why`: lý do một dòng của luật.
 * @param {any} cat @param {any} design
 * @returns {{family: string, id: string | null, why: string}[]}
 */
export function archAdvice(cat, design) {
  const term = condTerm(cat, design);
  return (Array.isArray(cat.architectures) ? cat.architectures : []).map((/** @type {any} */ f) => {
    const r = (f.rules || []).find((/** @type {any} */ x) => Object.entries(x.if).every(([k, v]) => term(k, /** @type {string[]} */ (v)) === true));
    return { family: f.id, id: r ? r.arch : null, why: r ? r.why : '' };
  });
}

/**
 * Thứ còn thiếu để mọi nhóm kiến trúc chưa có gợi ý (`archAdvice` null) có gợi ý: khoá chưa biết của các luật chưa bị loại
 * (không điều kiện nào sai). `path`: chưa chọn lối; `profile`: id câu hồ sơ chưa trả lời; `stages`: id khâu chưa quyết.
 * @param {any} cat @param {any} design @returns {{path: boolean, profile: string[], stages: string[]}}
 */
export function archMissing(cat, design) {
  const term = condTerm(cat, design);
  const adv = archAdvice(cat, design);
  const miss = new Set();
  (Array.isArray(cat.architectures) ? cat.architectures : []).forEach((/** @type {any} */ f, /** @type {number} */ i) => {
    if (adv[i].id !== null) return;
    for (const r of f.rules || []) {
      const t = Object.entries(r.if).map(([k, v]) => [k, k === 'path' && !design?.path ? null : term(k, /** @type {string[]} */ (v))]);
      if (t.some(([, x]) => x === false)) continue;
      for (const [k, x] of t) if (x === null) miss.add(k);
    }
  });
  return { path: miss.has('path'), profile: cat.profile.map((/** @type {any} */ q) => q.id).filter((/** @type {string} */ id) => miss.has(id)),
    stages: cat.stages.map((/** @type {any} */ s) => s.id).filter((/** @type {string} */ id) => miss.has(id)) };
}

/**
 * Luật phối hợp của danh mục (`checks`): báo khi mọi điều kiện `if` khớp, và mọi khâu trong `unless` đã quyết mà không khớp
 * (khâu chưa quyết: chưa biết, chưa báo). Khoá điều kiện: id khâu (giá trị là id phương án đã chọn, `skip` = khâu "không cần",
 * `own` = có công cụ tự ghi), id câu hồ sơ (câu trả lời, kể cả câu lối giả định) hay `path`. `caveat`: luật chỉ nhắc cách dùng.
 * @param {any} cat @param {any} design
 * @returns {{id: string, title: string, msg: string, caveat: boolean, stages: string[]}[]}
 */
export function warnings(cat, design) {
  if (!design || !Array.isArray(cat.checks)) return [];
  const stageIds = new Set(cat.stages.map((/** @type {any} */ s) => s.id));
  const term = condTerm(cat, design);
  const out = [];
  for (const c of cat.checks) {
    const hit = Object.entries(c.if).every(([k, v]) => term(k, /** @type {string[]} */ (v)) === true)
      && Object.entries(c.unless || {}).every(([k, v]) => term(k, /** @type {string[]} */ (v)) === false);
    if (hit) out.push({ id: c.id, title: c.title, msg: c.msg, caveat: c.caveat === true, stages: [...new Set([...Object.keys(c.if), ...Object.keys(c.unless || {})])].filter((k) => stageIds.has(k)) });
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
    for (const [k, v] of Object.entries(isObj(s.when) ? s.when : {})) {
      const ok = answers.get(k);
      if (!ok || !Array.isArray(v) || v.some((a) => !ok.has(a))) err.push(`${s.id}: when ${k}`);
    }
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
