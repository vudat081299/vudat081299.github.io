// @ts-check
/* System design (PLAN-016), thuần: chuẩn hoá thiết kế, hồ sơ, xếp hạng phương án, "Apply path", kiến trúc gợi ý, luật
   phối hợp, kiểm danh mục.
   Danh mục (data/system-design.json): lối bắt đầu theo thứ bàn giao (`paths`), hồ sơ dự án (câu hỏi → lựa chọn) và các khâu
   theo đường đi của dữ liệu, mỗi khâu nhiều phương án có `fit` (khoá hồ sơ → các câu trả lời hợp).
   Dự án giữ `design = {path, profile, stages, edges, arch}`; không có gì thì null. `edges`: bàn giao trên đường nối hai khâu liền nhau
   của sơ đồ, khoá `khâu trước>khâu sau`. `arch`: kiến trúc người dùng chọn, nhóm → id kiến trúc; `archWhy`: nhóm → lý do một dòng
   của lựa chọn ấy (PLAN-042).
   Xuất: OWN_MAX, EDGE_MAX, VIA, normEdge, normDesign, emptyDesign, presetDesign, isPreset, isPresetStage, pathOf, effProfile,
     stageState, fitOf, rankOptions, notNeededBy, stageLists, applyPath, condTerm, archAdvice, archChosen, archState, archMissing,
     warnings, decidedCount, pickNames, catalogErrors.
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

/** Hợp đồng của một đường nối; trống thì null. @param {any} v */
export function normEdge(v) {
  if (!isObj(v)) return null;
  const e = {
    via: VIA.some((x) => x.id === v.via) ? v.via : '',
    what: line(v.what).slice(0, EDGE_MAX), where: line(v.where).slice(0, EDGE_MAX), promise: lines(v.promise), check: line(v.check).slice(0, EDGE_MAX),
  };
  return e.via || e.what || e.where || e.promise || e.check ? e : null;
}

/** Id phương án đã chọn; `skip`, `own` là khoá dành riêng của luật (khâu không cần, công cụ tự ghi), không là id phương án.
 * @param {any} v @returns {string[]} */
const idList = (v) => (Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === 'string' && ID.test(x) && x !== 'skip' && x !== 'own'))] : []);

/** Kiến trúc của danh mục theo nhóm, id; không có thì null. @param {any} cat @param {string} fam @param {string} id */
const archEntry = (cat, fam, id) => (Array.isArray(cat?.architectures) ? cat.architectures : [])
  .find((/** @type {any} */ f) => f.id === fam)?.entries.find((/** @type {any} */ e) => e.id === id) || null;

/**
 * Khoá và id chỉ là chữ thường, số, gạch nối (id lạ của danh mục cũ vẫn giữ: giao diện bỏ qua cái không còn).
 * Khâu "không cần" (`skip`) vẫn giữ phương án, chữ tự ghi (ẩn, bỏ qua ở mọi chỗ): tắt "không cần" là chúng về lại.
 * Khâu trống bị bỏ; dự án không còn gì thì null.
 * `cat` (tuỳ chọn): kiến trúc không có trong danh mục bị bỏ; kiến trúc có lối (nhóm app) thành `path` khi chưa có lối, không
 * giữ ở `arch` (lối là lựa chọn của nhóm ấy, không hai chỗ).
 * @param {any} o @param {any} [cat]
 * @returns {null | {path: string, profile: Record<string,string>, stages: Record<string,{pick:string[], skip:boolean, own:string, note:string}>, edges: Record<string,any>, arch: Record<string,string>}}
 */
export function normDesign(o, cat = null) {
  if (!isObj(o)) return null;
  let path = typeof o.path === 'string' && ID.test(o.path) ? o.path : '';
  /** @type {Record<string,string>} */
  const arch = {};
  /** @type {Record<string,string>} */
  const archWhy = {};
  if (isObj(o.archWhy)) {
    for (const [k, v] of Object.entries(o.archWhy)) {
      const t = line(v).slice(0, OWN_MAX);
      if (ID.test(k) && t && (!cat || (cat.architectures || []).some((/** @type {any} */ f) => f.id === k))) archWhy[k] = t;
    }
  }
  if (isObj(o.arch)) {
    for (const [k, v] of Object.entries(o.arch)) {
      if (!ID.test(k) || typeof v !== 'string' || !ID.test(v)) continue;
      if (!cat) { arch[k] = v; continue; }
      const e = archEntry(cat, k, v);
      if (e && e.path) path = path || e.path;
      else if (e) arch[k] = v;
    }
  }
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
  return path || Object.keys(profile).length || Object.keys(stages).length || Object.keys(edges).length || Object.keys(arch).length
    || Object.keys(archWhy).length ? { path, profile, stages, edges, arch, archWhy } : null;
}

/** Bản trống để sửa. @returns {{path: string, profile: Record<string,string>, stages: Record<string,any>, edges: Record<string,any>, arch: Record<string,string>, archWhy: Record<string,string>}} */
export const emptyDesign = () => ({ path: '', profile: {}, stages: {}, edges: {}, arch: {}, archWhy: {} });

/** Thiết kế đặt sẵn của một mẫu (`design` trong templates.json, PLAN-033): hồ sơ, lối, kiến trúc chọn sẵn, và khâu mà dự án
 * của mẫu đã quyết (`stages`, cùng khuôn với dự án); không bàn giao; không có thì null. @param {any} tpl */
export const presetDesign = (tpl) => (isObj(tpl) && isObj(tpl.design)
  ? normDesign({ path: tpl.design.path, profile: tpl.design.profile, arch: tpl.design.arch, archWhy: tpl.design.archWhy, stages: tpl.design.stages }) : null);

/** Hai bản đồ chữ → chữ giống nhau. @param {Record<string,string>} a @param {Record<string,string>} b */
const sameMap = (a, b) => Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([k, v]) => b[k] === v);

/** Hồ sơ, lối và kiến trúc chọn sẵn còn đúng như mẫu đặt (người dùng chưa đổi câu nào). @param {any} design @param {any} preset */
export function isPreset(design, preset) {
  if (!design || !preset) return false;
  return design.path === preset.path && sameMap(design.profile, preset.profile) && sameMap(design.arch || {}, preset.arch || {})
    && sameMap(design.archWhy || {}, preset.archWhy || {});
}

/** Khâu `sid` còn đúng như mẫu đặt (cùng phương án, Not needed, công cụ tự ghi); mẫu không đặt khâu ấy thì false.
 * @param {any} design @param {any} preset @param {string} sid */
export function isPresetStage(design, preset, sid) {
  const a = design?.stages[sid], b = preset?.stages[sid];
  return !!a && !!b && a.skip === b.skip && a.own === b.own && a.pick.length === b.pick.length && a.pick.every((x) => b.pick.includes(x));
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
 * Phương án của một khâu theo thứ tự gợi ý: hợp hồ sơ trước; rồi theo danh sách công cụ của kiến trúc (`lists` của `stageLists`:
 * có trong danh sách đứng trước đứng trên, xét lần lượt từng danh sách; danh sách đầu tiên chứa phương án là kiến trúc người
 * dùng chọn thì theo thứ tự kiến trúc ấy ghi); rồi phương án lối đã chọn gợi ý (`sug`, theo thứ tự lối ghi), khớp nhiều câu
 * hơn, dễ hơn, rồi thứ tự danh mục. Công cụ của kiến trúc người dùng chọn xét hồ sơ bỏ các câu kiến trúc ấy đứng trên
 * (`relax` của danh sách; `relaxed`: câu lệch đã bỏ qua). `arch`: id kiến trúc người dùng chọn có công cụ này.
 * `top`: phương án đứng đầu khi đã trả lời ít nhất một câu hồ sơ, chọn lối hay chọn kiến trúc, và nó hợp.
 * @param {any} stage @param {Record<string,string>} profile @param {any} [path]
 * @param {{id: string, tools: string[], chosen: boolean, relax: string[]}[]} [lists]
 */
export function rankOptions(stage, profile, path = null, lists = []) {
  const answered = Object.keys(profile).length > 0 || !!path || lists.some((l) => l.chosen);
  const sug = (path && path.suggest[stage.id]) || [];
  const rows = stage.options.map((/** @type {any} */ o, /** @type {number} */ i) => {
    const own = lists.find((l) => l.chosen && l.tools.includes(o.id));
    const full = fitOf(o, profile);
    const f = own && own.relax.length ? fitOf(o, Object.fromEntries(Object.entries(profile).filter(([k]) => !own.relax.includes(k)))) : full;
    const first = lists.find((l) => l.tools.includes(o.id));
    return { opt: o, i, sug: sug.includes(o.id), ...f, relaxed: full.miss.filter((k) => !f.miss.includes(k)), arch: own ? own.id : '',
      mask: lists.reduce((n, l) => n * 2 + (l.tools.includes(o.id) ? 0 : 1), 0),
      pos: first && first.chosen ? first.tools.indexOf(o.id) : 1e3 };
  });
  const at = (/** @type {any} */ r) => (r.sug ? sug.indexOf(r.opt.id) : sug.length);
  rows.sort((a, b) => (+b.ok - +a.ok) || (a.mask - b.mask) || (a.pos - b.pos) || (at(a) - at(b)) || (b.score - a.score)
    || ((a.opt.level || 2) - (b.opt.level || 2)) || (a.i - b.i));
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
 * Nhóm kiến trúc Apply path theo (PLAN-037), theo khâu, nhóm đứng trước được ưu tiên. Kho thô, kho phân tích: nhóm lưu trữ
 * (cỡ × loại dữ liệu × tự host × ngân sách) rồi nhóm xử lý; kho phân tích là lựa chọn chính của khâu, kho phục vụ của kiến trúc
 * stream (Cassandra, Redis) người dùng chọn thêm. Mọi khâu khác: nhóm xử lý (độ mới × độ trễ). Luật của các nhóm ấy gộp nhiều
 * câu hồ sơ, điều `fit` từng câu không diễn tả được. Mỗi nhóm dùng kiến trúc người dùng chọn, chưa chọn thì kiến trúc gợi ý.
 * Nhóm khác chỉ tính khi người dùng chọn kiến trúc của nó, xếp sau, theo thứ tự danh mục; nhóm app chọn qua lối không tính (lối
 * đã có `suggest`). Nhóm chia tầng (layers) không lái công cụ: cách chia tầng độc lập với nơi lưu, công cụ của nó chỉ là ví dụ
 * chỗ dựng các tầng; theo nó thì medallion đẩy MinIO vào mọi pipeline.
 */
const APPLY_BY_STAGE = { raw: ['storage', 'processing'], store: ['storage', 'processing'] };
const APPLY_DEFAULT = ['processing'];
const NO_TOOLS = ['layers'];
/** Câu hồ sơ mà kiến trúc người dùng chọn đứng trên, khi xét công cụ của chính kiến trúc ấy (PLAN-042): chọn lakehouse cho dữ
 * liệu nhỏ để học thì Iceberg vẫn "hợp". Câu ràng buộc (tự host, ngân sách, loại dữ liệu, số người dùng) vẫn xét. */
const ARCH_RELAX = { storage: ['size'], processing: ['size', 'fresh', 'latency'] };

/**
 * Danh sách công cụ của các kiến trúc lái khâu `sid` (thứ tự ở `APPLY_BY_STAGE`), danh sách rỗng bị bỏ.
 * `derived` = false: chỉ kiến trúc người dùng chọn (trang khâu); true: thêm kiến trúc gợi ý của nhóm chưa chọn (Apply path).
 * @param {any} cat @param {any} design @param {string} sid @param {boolean} [derived]
 * @returns {{family: string, id: string, name: string, tools: string[], chosen: boolean, relax: string[]}[]}
 */
export function stageLists(cat, design, sid, derived = true) {
  const st = archState(cat, design);
  const order = /** @type {Record<string, string[]>} */ (APPLY_BY_STAGE)[sid] || APPLY_DEFAULT;
  const fams = [...order, ...st.map((x) => x.family).filter((f) => !order.includes(f))];
  /** @type {any[]} */
  const out = [];
  for (const fid of fams) {
    const s = st.find((x) => x.family === fid);
    if (!s) continue;
    const chosen = !!s.chosen && !s.viaPath && !NO_TOOLS.includes(fid);
    const id = chosen ? s.chosen : derived && order.includes(fid) ? s.rec : '';
    const e = id ? archEntry(cat, fid, id) : null;
    const tools = (e && e.tools && e.tools[sid]) || [];
    if (tools.length) out.push({ family: fid, id, name: e.name, tools, chosen, relax: chosen ? /** @type {Record<string, string[]>} */ (ARCH_RELAX)[fid] || [] : [] });
  }
  return out;
}

/** Vài phương án cho một khâu (kiến trúc người dùng chọn cần nhiều công cụ ở khâu ấy, vd. lakehouse: object storage + table
 * format + catalog): bắt đầu từ phương án đầu; còn luật báo thì thêm phương án kế tiếp đầu tiên gỡ được một luật đang báo (luật
 * mới nó gây ra phải gỡ tiếp), tối đa ba. Phương án không gỡ được gì (object storage thứ hai) bị bỏ qua. Vẫn còn luật: null.
 * @param {any[]} rows @param {(ids: string[]) => string[]} firing id luật (trừ `caveat`) báo ở khâu khi chọn `ids` */
function completeSet(rows, firing) {
  const ids = rows.map((r) => r.opt.id);
  if (!ids.length) return null;
  const set = [ids[0]];
  let now = firing(set);
  for (let i = 1; i < ids.length && now.length && set.length < 3; i++) {
    const next = firing([...set, ids[i]]);
    if (now.some((x) => !next.includes(x))) { set.push(ids[i]); now = next; }
  }
  return now.length ? null : set;
}

/**
 * Áp lối vào thiết kế: chỉ khâu chưa quyết. Khâu lối bỏ (`skip`, trừ khi `when` của khâu nêu đúng câu trả lời của hồ sơ) hay
 * hồ sơ cho là không cần (`when`) thành "không cần"; khâu
 * lối cần (`need`) có gợi ý thì chọn phương án đứng đầu (hợp hồ sơ, ưu tiên gợi ý của lối). Khâu `maybe` để người dùng tự
 * quyết, trừ khi kiến trúc người dùng chọn có công cụ ở khâu ấy. Không đụng khâu đã quyết. Không tự gây luật báo: trong các
 * phương án hợp, chọn cái đầu tiên làm ít luật (trừ `caveat`) báo ở khâu ấy nhất. Không phương án nào hợp hồ sơ, hay bỏ khâu /
 * phương án lấy được mà vẫn làm luật báo: để khâu ấy cho người dùng quyết. Khâu nhiều lựa chọn có kiến trúc người dùng chọn:
 * phương án đầu chưa đủ (luật báo) thì thêm công cụ kế tiếp tới khi đủ (`completeSet`).
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
  /** Luật (trừ `caveat`) báo ở khâu `id` khi đặt nó thành `rec`. @param {string} id @param {any} rec */
  const firing = (id, rec) => warnings(cat, { ...d, stages: { ...d.stages, [id]: rec } }).filter((w) => !w.caveat && w.stages.includes(id)).map((w) => w.id);
  /** @param {string} id @param {any} rec */
  const clash = (id, rec) => firing(id, rec).length;
  for (const s of cat.stages) {
    if (stageState(d, s.id) !== 'open') continue;
    const need = path.stages[s.id];
    const lists = stageLists(cat, d, s.id);
    const chosen = lists.some((l) => l.chosen);
    const rec = d.stages[s.id] || { pick: [], skip: false, own: '', note: '' };
    /* Lối bỏ khâu mà `when` của khâu nêu đúng câu trả lời của hồ sơ (lối báo cáo, sản phẩm dùng LLM: khâu tìm kiếm): hồ sơ
     * nói cần, để người dùng quyết. */
    const wanted = Object.entries(isObj(s.when) ? s.when : {}).some(([k, v]) => !!prof[k] && Array.isArray(v) && v.includes(prof[k]));
    if ((need === 'skip' && !wanted) || notNeededBy(s, prof).length) {
      if (clash(s.id, { ...rec, skip: true })) continue;
      rec.skip = true;
      skipped.push(s.id);
    } else if ((need === 'need' && path.suggest[s.id]) || ((need !== 'skip' || wanted) && chosen)) {
      const rows = rankOptions(s, prof, path, lists).filter((x) => x.ok);
      const set = s.multi && chosen ? completeSet(rows, (ids) => firing(s.id, { ...rec, pick: ids })) : null;
      const ok = set ? [] : rows.map((x) => ({ x, n: clash(s.id, { ...rec, pick: [x.opt.id] }) }));
      /* Không phương án nào hợp hồ sơ (vd. người dùng công khai, ngân sách miễn phí, chỉ tự host), hay phương án hợp nhất vẫn
       * làm luật báo: để khâu cho người dùng quyết. */
      if (!set && !ok.length) continue;
      const best = set ? null : ok.reduce((a, b) => (b.n < a.n ? b : a));
      if (best && best.n) continue;
      rec.pick = set || [best.x.opt.id];
      filled.push(s.id);
    } else continue;
    d.stages[s.id] = rec;
  }
  return { next: normDesign(d), filled, skipped };
}

/**
 * Một điều kiện của luật (`checks`, luật gợi ý kiến trúc): khớp (true), không khớp (false) hay chưa biết (null). Khoá: `path`
 * (lối đã chọn), id khâu (phương án đã chọn, `skip` = khâu "không cần", `own` = có công cụ tự ghi; khâu chưa quyết: chưa biết),
 * id nhóm kiến trúc không trùng id khâu (kiến trúc người dùng chọn; chưa chọn: chưa biết; nhóm app trùng khâu App, dùng
 * `path`) hay id câu hồ sơ (câu trả lời, kể cả câu
 * lối giả định; chưa trả lời: chưa biết).
 * @param {any} cat @param {any} design @returns {(k: string, vals: string[]) => boolean | null}
 */
export function condTerm(cat, design) {
  const prof = effProfile(cat, design);
  const stageIds = new Set(cat.stages.map((/** @type {any} */ s) => s.id));
  const chosen = archChosen(cat, design);
  return (k, vals) => {
    if (k === 'path') return vals.includes(design?.path || '');
    if (!stageIds.has(k) && k in chosen) return chosen[k].id ? vals.includes(chosen[k].id) : null;
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
 * Kiến trúc người dùng chọn của mỗi nhóm (chỉ id còn trong danh mục): `arch` của thiết kế, hay kiến trúc mang lối đã chọn
 * (`viaPath`: nhóm app, lối là lựa chọn của nhóm ấy). Chưa chọn: id ''.
 * @param {any} cat @param {any} design @returns {Record<string, {id: string, viaPath: boolean}>}
 */
export function archChosen(cat, design) {
  /** @type {Record<string, {id: string, viaPath: boolean}>} */
  const out = {};
  for (const f of Array.isArray(cat.architectures) ? cat.architectures : []) {
    const v = design?.arch?.[f.id];
    const e = v ? f.entries.find((/** @type {any} */ x) => x.id === v && !x.path) : null;
    const p = !e && design?.path ? f.entries.find((/** @type {any} */ x) => x.path === design.path) : null;
    out[f.id] = { id: e ? e.id : p ? p.id : '', viaPath: !e && !!p };
  }
  return out;
}

/**
 * Kiến trúc của mỗi nhóm (PLAN-042): `chosen` (người dùng chọn, '' = chưa), `reason` (lý do người dùng ghi cho lựa chọn ấy),
 * `rec`, `why` (gợi ý của `archAdvice` và lý do của luật, vẫn tính khi đã chọn), `id`: kiến trúc dùng để lái công cụ — chọn rồi thì
 * cái đã chọn, chưa thì cái gợi ý.
 * @param {any} cat @param {any} design
 * @returns {{family: string, chosen: string, viaPath: boolean, reason: string, rec: string | null, why: string, id: string | null}[]}
 */
export function archState(cat, design) {
  const ch = archChosen(cat, design);
  return archAdvice(cat, design).map((a) => ({ family: a.family, chosen: ch[a.family].id, viaPath: ch[a.family].viaPath,
    reason: ch[a.family].id ? design?.archWhy?.[a.family] || '' : '', rec: a.id, why: a.why, id: ch[a.family].id || a.id }));
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
 * `own` = có công cụ tự ghi), id câu hồ sơ (câu trả lời, kể cả câu lối giả định), `path` hay id nhóm kiến trúc (kiến trúc người
 * dùng chọn). `caveat`: luật chỉ nhắc cách dùng.
 * `arch` (PLAN-042): luật hồ sơ ↔ công cụ mà kiến trúc người dùng chọn giải thích — mọi câu hồ sơ của `if` là câu kiến trúc ấy
 * đứng trên (`ARCH_RELAX`), mọi phương án khớp ở các khâu của `if` là công cụ của kiến trúc ấy (Kappa cho dữ liệu theo ngày:
 * Kafka). Luật ấy chỉ còn là lời nhắc (`caveat`), không phải cảnh báo; `arch` là id kiến trúc ấy.
 * @param {any} cat @param {any} design
 * @returns {{id: string, title: string, msg: string, caveat: boolean, arch: string, stages: string[]}[]}
 */
export function warnings(cat, design) {
  if (!design || !Array.isArray(cat.checks)) return [];
  const stageIds = new Set(cat.stages.map((/** @type {any} */ s) => s.id));
  const term = condTerm(cat, design);
  const chosen = Object.entries(archChosen(cat, design)).filter(([f, c]) => c.id && !c.viaPath && !NO_TOOLS.includes(f));
  /** Kiến trúc chọn giải thích luật `c` (id) hay ''. @param {any} c */
  const explains = (c) => {
    const keys = Object.keys(c.if);
    const prof = keys.filter((k) => !stageIds.has(k) && k !== 'path' && cat.profile.some((/** @type {any} */ q) => q.id === k));
    const st = keys.filter((k) => stageIds.has(k));
    if (!prof.length || !st.length || prof.length + st.length < keys.length) return '';
    const hit = chosen.find(([f, ch]) => {
      const relax = /** @type {Record<string, string[]>} */ (ARCH_RELAX)[f] || [];
      const tools = archEntry(cat, f, ch.id)?.tools || {};
      return prof.every((k) => relax.includes(k)) && st.every((k) => (design.stages[k]?.pick || [])
        .filter((/** @type {string} */ o) => c.if[k].includes(o)).every((/** @type {string} */ o) => (tools[k] || []).includes(o)));
    });
    return hit ? hit[1].id : '';
  };
  const out = [];
  for (const c of cat.checks) {
    const hit = Object.entries(c.if).every(([k, v]) => term(k, /** @type {string[]} */ (v)) === true)
      && Object.entries(c.unless || {}).every(([k, v]) => term(k, /** @type {string[]} */ (v)) === false);
    if (!hit) continue;
    const arch = explains(c);
    out.push({ id: c.id, title: c.title, msg: c.msg, caveat: c.caveat === true || !!arch, arch,
      stages: [...new Set([...Object.keys(c.if), ...Object.keys(c.unless || {})])].filter((k) => stageIds.has(k)) });
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
