// @ts-check
/* System design, thuần: nút và đường nối của sơ đồ, việc cho bảng (planTasks), so kế hoạch với bảng (planDiff) và áp
   lựa chọn (applyPlan).
   Xuất: snake, diagramNodes, bothDecided, flowEdges, viaLabel, PLAN_STEP, planTasks, SD_RE, planDiff, applyPlan.
   Dùng: core/board.js, core/design.js, core/model.js. */
import { fold } from './board.js';
import { VIA, pickNames, stageState } from './design.js';
import { normDoc, normSub, setStatus } from './model.js';

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

/** Đường nối hai nút của sơ đồ đã chốt: cả hai đầu đã quyết (Users luôn đã quyết). @param {any} a @param {any} b */
export const bothDecided = (a, b) => !a.open && !b.open;

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
    if (!bothDecided(a, b)) continue;
    const key = `${a.id}>${b.id}`;
    out.push({ key, from: a, to: b, c: (design && design.edges[key]) || null });
  }
  return out;
}

/** Chữ "đi qua" của một bàn giao. @param {string} id */
export const viaLabel = (id) => VIA.find((x) => x.id === id)?.label || '';

/* ── Việc cho bảng: một bước "System build", mỗi khâu đã quyết một bước con (tên khâu: phương án), "Done when" là việc của
 * phương án (công cụ tự ghi: việc chung của khâu), ghi chú là lệnh bắt đầu, tài liệu là link chính thức. Mỗi việc mang
 * `src` (`stage:khâu` / `edge:a>b`) và `sig` (chữ ký nội dung); bước con sinh ra giữ `sd = src@sig` để lần sau đối chiếu. ── */

export const PLAN_STEP = {
  title: 'System build',
  goal: 'Dựng hệ thống theo khung đã chọn ở System design.', // lang: vi — nội dung việc sinh ra
  doneWhen: 'Mọi khâu đã chọn chạy nối tiếp nhau, từ nguồn dữ liệu tới người dùng.', // lang: vi — nội dung việc sinh ra
  notes: 'Dựng một đường chạy thông sớm: dữ liệu thật, mô hình đơn giản nhất, giao diện thô, deploy được. Rồi mới làm tốt từng khâu.\n' // lang: vi — nội dung việc sinh ra
    + 'Đổi thiết kế thì bấm "Update plan" ở mục System design: việc sinh ra đi theo thiết kế, ghi chú và tài liệu của bạn giữ nguyên.\n' // lang: vi — nội dung việc sinh ra
    + 'Nguồn: Google, Rules of Machine Learning, rule #4: https://developers.google.com/machine-learning/guides/rules-of-ml', // lang: vi — nội dung việc sinh ra
};

/** Chữ ký ngắn của nội dung một việc sinh ra (djb2, cơ số 36). @param {any} t */
function sigOf(t) {
  const s = [t.title, t.doneWhen, t.notes, ...t.docs.map((/** @type {any} */ d) => d.url)].join('\n');
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

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
    const notes = [setup.length ? 'Lệnh bắt đầu:' : '', ...setup.map((/** @type {string} */ c) => '  ' + c), st.note].filter(Boolean).join('\n'); // lang: vi — nội dung việc sinh ra
    out.push({
      src: `stage:${s.id}`, prefix: `${s.title}:`,
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
      src: `edge:${e.key}`, prefix: `Handoff: ${e.from.title} → ${e.to.title}`,
      title: `Handoff: ${e.from.title} → ${e.to.title}`,
      doneWhen: e.c.check || `${e.to.title} đọc được đầu ra của ${e.from.title} theo hợp đồng bàn giao, trên dữ liệu mẫu.`, // lang: vi — nội dung việc sinh ra
      notes: [e.c.via ? `Via: ${viaLabel(e.c.via)}` : '', e.c.what ? `What: ${e.c.what}` : '', e.c.where ? `Where: ${e.c.where}` : '',
        e.c.promise ? `Promise: ${e.c.promise}` : ''].filter(Boolean).join('\n'),
      docs: [],
    });
  }
  for (const t of out) t.sig = sigOf(t);
  return out;
}

/* ── Giữ kế hoạch theo thiết kế: so việc sinh từ thiết kế với bước con đã sinh trước (theo `sd`; bước con cũ không có `sd`
 * thì theo tên trong bước "System build": đúng tên, rồi mở bằng `Tên khâu:`). ── */

export const SD_RE = /^(stage|edge):([a-z0-9>-]{1,81})@([a-z0-9]{1,13})$/;
/** Tên so không dấu, không hoa thường, bỏ khoảng trắng hai đầu. @param {string} s */
const foldT = (s) => fold(s).trim();
const closed = (/** @type {any} */ x) => x.status === 'cancel' || x.status === 'skip';

/** Vì sao một nguồn không còn sinh việc. @param {any} cat @param {any} design @param {string} src @param {any[]} tasks */
function whyGone(cat, design, src, tasks) {
  const [kind, id] = [src.slice(0, src.indexOf(':')), src.slice(src.indexOf(':') + 1)];
  if (kind === 'edge') return `the handoff ${id.split('>').map((x) => cat.stages.find((/** @type {any} */ s) => s.id === x)?.title || x).join(' → ')} is no longer in the design`;
  const s = cat.stages.find((/** @type {any} */ x) => x.id === id);
  const now = tasks.find((t) => t.src === src);
  if (now) return `replaced by "${now.title}"`;
  const st = stageState(design, id);
  return `${s ? s.title : id} is ${st === 'skip' ? 'Not needed' : 'not decided'}`;
}

/**
 * Bản so: mỗi việc sinh từ thiết kế là `new` (chưa có), `same` (khớp), `changed` (thiết kế đổi từ lần sinh trước); bước con đã
 * sinh mà thiết kế không còn là `removed` (bỏ qua bước con đã huỷ / bỏ qua). `tagged`: khớp bằng `sd` (không thì bằng tên).
 * @param {any} cat @param {any} ws
 * @returns {{kind: 'new'|'same'|'changed'|'removed', task: any, sub: any, stepId: string, tagged: boolean, why: string}[]}
 */
export function planDiff(cat, ws) {
  const tasks = planTasks(cat, ws.design);
  /** @type {Map<string, {sub: any, step: any}>} */
  const bySrc = new Map();
  for (const step of ws.steps) {
    for (const sub of step.subs) {
      const m = typeof sub.sd === 'string' ? SD_RE.exec(sub.sd) : null;
      if (!m) continue;
      const src = `${m[1]}:${m[2]}`, prev = bySrc.get(src);
      if (!prev || (closed(prev.sub) && !closed(sub))) bySrc.set(src, { sub, step });
    }
  }
  const build = ws.steps.find((/** @type {any} */ s) => foldT(s.title) === foldT(PLAN_STEP.title));
  const loose = build ? build.subs.filter((/** @type {any} */ x) => !x.sd) : [];
  const used = new Set();
  /** @type {any[]} */
  const items = [];
  for (const t of tasks) {
    let r = bySrc.get(t.src) || null;
    const tagged = !!r;
    if (!r) {
      const free = loose.filter((/** @type {any} */ x) => !used.has(x));
      const x = free.find((/** @type {any} */ y) => foldT(y.title) === foldT(t.title)) || free.find((/** @type {any} */ y) => foldT(y.title).startsWith(foldT(t.prefix)));
      if (x) r = { sub: x, step: build };
    }
    if (r) used.add(r.sub);
    const same = r && (tagged ? SD_RE.exec(r.sub.sd)?.[3] === t.sig : r.sub.title === t.title && r.sub.doneWhen === t.doneWhen);
    items.push({ kind: !r ? 'new' : same ? 'same' : 'changed', task: t, sub: r ? r.sub : null, stepId: r ? r.step.id : '', tagged, why: '' });
  }
  const live = new Set(tasks.map((t) => t.src));
  for (const [src, r] of bySrc) {
    if (!live.has(src) && !closed(r.sub)) items.push({ kind: 'removed', task: null, sub: r.sub, stepId: r.step.id, tagged: true, why: whyGone(cat, ws.design, src, tasks) });
  }
  for (const x of loose) {
    if (used.has(x) || closed(x)) continue;
    const s = cat.stages.find((/** @type {any} */ y) => foldT(x.title).startsWith(foldT(y.title + ':')));
    if (s) items.push({ kind: 'removed', task: null, sub: x, stepId: build.id, tagged: false, why: whyGone(cat, ws.design, `stage:${s.id}`, tasks) });
  }
  return items;
}

/**
 * Áp bản so vào dự án (sửa tại chỗ). `choices[i]`: new → 'add' | 'skip'; changed → 'update' | 'replace' | 'leave';
 * removed → 'cancel' | 'keep'. Update: thay tên, Done when, thêm tài liệu và dòng ghi chú mới (giữ của người dùng); bước con
 * Done về New. Replace: bước con cũ huỷ (lý do "Replaced in system design: …"), thêm việc mới. Cancel / Keep: bỏ dấu `sd`.
 * Việc khớp theo tên (chưa có `sd`) được gắn `sd`.
 * @param {any[]} items @param {string[]} choices @param {any} target bước nhận việc mới
 * @returns {{before: Map<string, any>, added: string[], counts: {added: number, updated: number, cancelled: number, reset: number}}}
 */
export function applyPlan(items, choices, target) {
  const before = new Map();
  /** @type {string[]} */ const added = [];
  const counts = { added: 0, updated: 0, cancelled: 0, reset: 0 };
  const keep = (/** @type {any} */ x) => { if (!before.has(x.id)) before.set(x.id, JSON.parse(JSON.stringify(x))); };
  const tag = (/** @type {any} */ t) => `${t.src}@${t.sig}`;
  const add = (/** @type {any} */ t) => {
    const x = normSub({ title: t.title, doneWhen: t.doneWhen, notes: t.notes, docs: t.docs, sd: tag(t) });
    target.subs.push(x);
    added.push(x.id);
    counts.added++;
  };
  items.forEach((it, i) => {
    const ch = choices[i];
    const x = it.sub;
    if (it.kind === 'new') { if (ch === 'add') add(it.task); return; }
    if (it.kind === 'same') { if (!it.tagged) { keep(x); x.sd = tag(it.task); } return; }
    if (it.kind === 'changed' && ch === 'update') {
      keep(x);
      x.title = it.task.title;
      x.doneWhen = it.task.doneWhen;
      const urls = new Set(x.docs.map((/** @type {any} */ d) => d.url));
      x.docs.push(...it.task.docs.filter((/** @type {any} */ d) => !urls.has(d.url)).map((/** @type {any} */ d) => normDoc(d)).filter(Boolean));
      const have = new Set(x.notes.split('\n'));
      const more = it.task.notes.split('\n').filter((/** @type {string} */ l) => l && !have.has(l));
      if (more.length) x.notes = [x.notes, ...more].filter(Boolean).join('\n');
      if (x.status === 'done') { setStatus(x, 'todo'); counts.reset++; }
      x.sd = tag(it.task);
      counts.updated++;
    } else if ((it.kind === 'changed' && ch === 'replace') || (it.kind === 'removed' && ch === 'cancel')) {
      keep(x);
      setStatus(x, 'cancel');
      x.reason = it.kind === 'changed' ? `Replaced in system design: ${it.task.title}` : `No longer in system design: ${it.why}`;
      delete x.sd;
      counts.cancelled++;
      if (it.kind === 'changed') add(it.task);
    } else if (it.kind === 'removed' && ch === 'keep' && x.sd) {
      keep(x);
      delete x.sd;
    }
  });
  return { before, added, counts };
}
