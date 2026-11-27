// @ts-check
/* JSON vào / ra, thuần: xuất một dự án, sao lưu mọi dự án, đọc chữ nhập (JSON hay Markdown, parseImport), đếm cho
   phần xem trước, plural, slug tên file, shape (phần so được khi kiểm đi rồi về, cho test).
   Xuất: toJSON, toBackup, parseImport, counts, plural, slug, shape.
   Dùng: core/board.js, core/design.js, core/markdown.js, core/model.js. */
import { fold } from './board.js';
import { normDesign } from './design.js';
import { fromMarkdown } from './markdown.js';
import { FORMAT, VERSION, freshCopy, isObj, normDoc, oneLine } from './model.js';

/* ── JSON ── */

/** @param {any} ws */
export const toJSON = (ws) => JSON.stringify({ format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), workspace: ws }, null, 2) + '\n';
/** @param {any[]} all */
export const toBackup = (all) => JSON.stringify({ format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), workspaces: all }, null, 2) + '\n';

/** Đếm mục không đúng khuôn sẽ bị bỏ khi chuẩn hoá. @param {any} w @param {string[]} warnings */
function skipped(w, warnings) {
  const bad = (/** @type {any} */ a) => (Array.isArray(a) ? a.filter((x) => !isObj(x)).length : 0);
  const steps = Array.isArray(w.steps) ? w.steps : [];
  const n = { steps: bad(steps), subs: 0, log: bad(w.log), docs: 0 };
  const badDocs = (/** @type {any} */ a) => (Array.isArray(a) ? a.filter((d) => !normDoc(d)).length : 0);
  for (const s of steps) {
    if (!isObj(s)) continue;
    n.subs += bad(s.subs);
    n.docs += badDocs(s.docs);
    for (const x of Array.isArray(s.subs) ? s.subs : []) if (isObj(x)) n.docs += badDocs(x.docs);
  }
  const parts = [];
  if (n.steps) parts.push(plural(n.steps, 'step'));
  if (n.subs) parts.push(plural(n.subs, 'sub-step'));
  if (n.log) parts.push(plural(n.log, 'decision'));
  if (n.docs) parts.push(plural(n.docs, 'document') + ' (link not http(s))');
  if (parts.length) warnings.push(`"${oneLine(w.name) || 'Project'}": skipped ${parts.join(', ')} that did not fit the format.`);
}

/** Kiến trúc chọn không có trong danh mục (PLAN-042): bỏ, kèm cảnh báo. @param {any} w @param {any} cat @param {string[]} warnings */
function pruneArch(w, cat, warnings) {
  if (!cat || !w.design) return w;
  const d = normDesign(w.design, cat);
  const gone = Object.entries(w.design.arch || {}).filter(([k, v]) => d?.arch?.[k] !== v && !cat.architectures?.some((/** @type {any} */ f) => f.id === k
    && f.entries.some((/** @type {any} */ e) => e.id === v && e.path)));
  if (gone.length) warnings.push(`"${w.name}": skipped unknown architecture ${gone.map(([k, v]) => `${k} ${v}`).join(', ')}.`);
  return { ...w, design: d };
}

/**
 * Đọc chữ dán vào hay file chọn: JSON (một dự án, bản sao lưu, hay mảng dự án) hoặc Markdown.
 * Luôn trả bản sao có id mới; ghi vào đâu là việc của trang. `cat` (danh mục System design, tuỳ chọn): kiến trúc chọn lạ bị bỏ.
 * @param {string} text @param {any} [cat]
 * @returns {{ kind: 'json' | 'backup' | 'md', workspaces: any[], warnings: string[] }}
 */
export function parseImport(text, cat = null) {
  const t = String(text || '').trim();
  if (!t) throw new Error('Nothing to import yet.');
  /* Mảng JSON mở bằng `[` rồi một giá trị; `[chữ](…)` hay `[ ] việc` của Markdown viết tay thì không. */
  if (t[0] === '{' || /^\[\s*(?:[[{"\d-]|\]\s*$|true\b|false\b|null\b)/.test(t)) {
    let data;
    try { data = JSON.parse(t); } catch (e) { throw new Error('Broken JSON: ' + /** @type {Error} */ (e).message); }
    /** @type {any[]} */ let items;
    let kind = /** @type {'json' | 'backup'} */ ('json');
    if (Array.isArray(data)) { items = data; kind = 'backup'; }
    else if (isObj(data) && Array.isArray(data.workspaces)) { items = data.workspaces; kind = 'backup'; }
    else if (isObj(data) && isObj(data.workspace)) items = [data.workspace];
    else if (isObj(data) && Array.isArray(data.steps)) items = [data];
    else throw new Error('This JSON is not a Step Planner project (no `workspace`, `workspaces` or `steps`).');
    /** @type {string[]} */
    const warnings = [];
    const out = [];
    items.forEach((w, i) => {
      if (!isObj(w) || !Array.isArray(w.steps)) { warnings.push(`Skipped item ${i + 1}: not a project (no steps list).`); return; }
      skipped(w, warnings);
      out.push(pruneArch(freshCopy(w), cat, warnings));
    });
    if (!out.length) throw new Error('No valid project in this JSON. ' + warnings.slice(0, 3).join(' '));
    return { kind, workspaces: out, warnings };
  }
  const { workspace, warnings } = fromMarkdown(t);
  return { kind: 'md', workspaces: [pruneArch(freshCopy(workspace), cat, warnings)], warnings };
}

/** Đếm cho phần xem trước khi nhập. @param {any[]} wss */
export function counts(wss) {
  let steps = 0, subs = 0, log = 0, docs = 0;
  for (const w of wss) {
    steps += w.steps.length;
    for (const s of w.steps) {
      subs += s.subs.length;
      docs += s.docs.length + s.subs.reduce((/** @type {number} */ n, /** @type {any} */ x) => n + x.docs.length, 0);
    }
    log += w.log.length;
  }
  return { workspaces: wss.length, steps, subs, log, docs };
}

/** "1 step", "2 steps". @param {number} n @param {string} word */
export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Tên file an toàn từ tên dự án. */
export function slug(/** @type {string} */ s) {
  return fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'project';
}

const docShape = (/** @type {any} */ d) => (d.kind === 'link' ? { kind: d.kind, title: d.title, url: d.url, proof: d.proof } : { kind: d.kind, title: d.title, body: d.body, proof: d.proof });
/** Phần so được khi kiểm Markdown đi rồi về: bỏ id và mốc thời gian; đầu vào thành chỗ của đầu ra ("bước.bước con.đầu ra"). @param {any} ws */
export function shape(ws) {
  /** @type {Map<string, string>} */
  const at = new Map();
  ws.steps.forEach((/** @type {any} */ s, /** @type {number} */ i) => {
    s.outs.forEach((/** @type {any} */ o, /** @type {number} */ k) => at.set(o.id, `${i}.-.${k}`));
    s.subs.forEach((/** @type {any} */ x, /** @type {number} */ j) => x.outs.forEach((/** @type {any} */ o, /** @type {number} */ k) => at.set(o.id, `${i}.${j}.${k}`)));
  });
  const hand = (/** @type {any} */ h) => ({ outs: h.outs.map((/** @type {any} */ o) => ({ name: o.name, ref: o.ref, note: o.note, final: o.final })), ins: h.ins.map((/** @type {string} */ id) => at.get(id) || '?') });
  return {
    name: ws.name, templateId: ws.templateId, notes: ws.notes,
    steps: ws.steps.map((/** @type {any} */ s) => ({
      title: s.title, goal: s.goal, doneWhen: s.doneWhen, notes: s.notes, revisit: s.revisit, round: s.round, docs: s.docs.map(docShape), ...hand(s),
      subs: s.subs.map((/** @type {any} */ x) => ({ title: x.title, status: x.status, reason: x.reason, due: x.due, doneAt: x.doneAt, doneWhen: x.doneWhen, notes: x.notes, par: x.par, redo: x.redo, docs: x.docs.map(docShape), ...hand(x) })),
    })),
    log: ws.log.map((/** @type {any} */ l) => ({ date: l.date, decision: l.decision, why: l.why, step: ws.steps.findIndex((/** @type {any} */ s) => s.id === l.stepId) })),
    design: ws.design,
  };
}
