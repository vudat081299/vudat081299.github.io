// @ts-check
/* Mô hình dữ liệu, thuần (không DOM, không bộ nhớ trình duyệt; chạy được trong Node): bảy trạng thái, ngày, id,
   chuẩn hoá (normSub, normStep, normWorkspace), gộp khi lưu hộp sửa (EDIT_FIELDS, mergeEdit), bản sao id mới (freshCopy),
   tên không trùng, tạo dự án từ mẫu (fromTemplate).
   Xuất: STATUSES, STATUS_LABEL, MARK, FROM_MARK, STATUS_HINT, REASON_LABEL, hasReason, outOfScope, nextStatus, setStatus,
     needsEvidence, FORMAT, VERSION, MD_VERSION, APP_NAME, LOG_HEADING, LOOSE_STEP, uid, today, parseDate, isObj, oneLine,
     multiLine, safeUrl, normDoc, normOut, SD_KEPT, normSub, normStep, normLog, normWorkspace, EDIT_FIELDS, pick,
     mergeEdit, freshCopy, uniqueName, fromTemplate.
   Dùng: core/design.js, core/handoffs.js. */
import { normDesign, presetDesign } from './design.js';
import { holders } from './handoffs.js';

/* Bảy trạng thái (PLAN-003), theo thứ tự: còn mở (mới, đang làm, chờ, bị chặn), xong, ngoài phạm vi (bỏ qua, huỷ).
 * Chờ: đợi bên ngoài, tự xong mà ta không phải làm gì. Bị chặn: vướng, phải ra tay gỡ. Bỏ qua: không cần với dự án này.
 * Huỷ: đã quyết không làm, giữ thẻ để nhớ vì sao. Tiến độ và "Tiếp theo" không tính bỏ qua, huỷ. */
export const STATUSES = ['todo', 'doing', 'pending', 'blocked', 'done', 'skip', 'cancel'];
export const STATUS_LABEL = { todo: 'New', doing: 'In progress', pending: 'Pending', blocked: 'Blocked', done: 'Done', skip: 'Skipped', cancel: 'Cancelled' };
export const MARK = { todo: ' ', doing: '~', pending: '>', blocked: '!', done: 'x', skip: '-', cancel: '/' };
export const FROM_MARK = { ' ': 'todo', '': 'todo', '~': 'doing', '>': 'pending', '!': 'blocked', x: 'done', X: 'done', '-': 'skip', '/': 'cancel' };
/** Một dòng giải thích của mỗi trạng thái, hiện trong danh sách chọn. */
export const STATUS_HINT = {
  todo: 'Not started yet', doing: 'Being worked on now',
  pending: 'Waiting on others (approval, data access, a long run); nothing to do now',
  blocked: 'Stuck on a problem; needs action to unblock', done: 'Finished: meets its Done when',
  skip: 'Not needed for this project, left out of progress', cancel: 'Decided not to do it; keep the card and say why',
};
/** Trạng thái có lý do (`reason`, nhiều dòng) và nhãn của lý do: trên thẻ, trong hộp sửa, trong Markdown. */
export const REASON_LABEL = { pending: 'Waiting on', blocked: 'Blocked by', cancel: 'Cancelled because' };
export const hasReason = (/** @type {string} */ s) => Object.hasOwn(REASON_LABEL, s);
/* Bấm chip: New → In progress → Done. Trạng thái khác: bấm mở danh sách mọi trạng thái ('' ở đây). */
const NEXT = { todo: 'doing', doing: 'done' };
/** Trạng thái không tính vào tiến độ và việc tiếp theo. @param {string} s */
export const outOfScope = (s) => s === 'skip' || s === 'cancel';
export const nextStatus = (/** @type {string} */ s) => NEXT[s] || '';
/** Đổi trạng thái một bước con: sang trạng thái không có lý do thì bỏ lý do; giữa Pending, Blocked, Cancelled thì giữ.
 * Vừa sang Done: `doneAt` là hôm nay (`day`); rời Done: bỏ `doneAt`.
 * @param {any} sub @param {string} st @param {string} [day] */
export function setStatus(sub, st, day = today()) {
  const was = sub.status;
  sub.status = STATUSES.includes(st) ? st : 'todo';
  if (!hasReason(sub.status)) sub.reason = '';
  if (sub.status !== 'done') sub.doneAt = '';
  else if (was !== 'done') sub.doneAt = day;
}
/** Bước con xong mà chưa có tài liệu bằng chứng (`proof`) cho "Done when" của nó: trang gợi ý thêm (không chặn). @param {any} sub */
export const needsEvidence = (sub) => sub.status === 'done' && !!sub.doneWhen && !sub.docs.some((/** @type {any} */ d) => d.proof);

export const FORMAT = 'step-planner';
export const VERSION = 3;
export const MD_VERSION = 3;
export const APP_NAME = 'Data Science Step Planner';
export const LOG_HEADING = 'Decision log';
export const LOOSE_STEP = 'General';

let seq = 0;
export function uid(prefix = 'x') {
  return prefix + Date.now().toString(36) + (seq++).toString(36) + Math.random().toString(36).slice(2, 6);
}

const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
/** Ngày hôm nay theo giờ máy, dạng YYYY-MM-DD. */
export function today(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Ngày hợp lệ → YYYY-MM-DD, không thì ''. Nhận YYYY-MM-DD, YYYY-M-D, DD/MM/YYYY, D/M/YYYY; ngày phải có thật. */
export function parseDate(/** @type {any} */ s) {
  const t = String(s ?? '').trim();
  let r, y, m, d;
  if ((r = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t))) [y, m, d] = [+r[1], +r[2], +r[3]];
  else if ((r = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t))) [d, m, y] = [+r[1], +r[2], +r[3]];
  else return '';
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (y < 1000 || dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return '';
  return `${y}-${pad(m)}-${pad(d)}`;
}

/* ── Chuẩn hoá ── */

export const isObj = (/** @type {any} */ o) => !!o && typeof o === 'object' && !Array.isArray(o);
export const oneLine = (/** @type {any} */ s) => (typeof s === 'string' || typeof s === 'number' ? String(s) : '').replace(/\s+/g, ' ').trim();
export const multiLine = (/** @type {any} */ s) => (typeof s === 'string' ? s : '').replace(/\r\n?/g, '\n').split('\n')
  .map((l) => l.replace(/\s+$/, '')).join('\n').replace(/^\n+|\n+$/g, '');
const isoOr = (/** @type {any} */ s) => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(s) && !isNaN(Date.parse(s)) ? s : new Date().toISOString());
const objs = (/** @type {any} */ a) => (Array.isArray(a) ? a.filter(isObj) : []);
const idOr = (/** @type {any} */ id, /** @type {string} */ p) => (typeof id === 'string' && id ? id : uid(p));

/* Tài liệu của bước / bước con: link (chỉ http(s)) hoặc văn bản Markdown. */
/** URL http(s) một dòng, không khoảng trắng; `<` `>` mã hoá để ghi được trong Markdown. Khác thì ''. @param {any} u */
export function safeUrl(u) {
  const s = oneLine(u).replace(/</g, '%3C').replace(/>/g, '%3E');
  return /^https?:\/\/[^\s]+$/i.test(s) ? s : '';
}
/** Thân văn bản Markdown: giữ nguyên từng dòng (kể cả dấu cách cuối dòng), bỏ dòng trống đầu và khoảng trắng cuối. */
const mdBody = (/** @type {any} */ s) => (typeof s === 'string' ? s : '').replace(/\r\n?/g, '\n').replace(/^(?:[ \t]*\n)+/, '').replace(/\s+$/, '');
/** Một tài liệu, hoặc null nếu hỏng (không phải object, link không phải http(s)). @param {any} o */
export function normDoc(o) {
  if (!isObj(o)) return null;
  const kind = o.kind === 'link' || (o.kind !== 'md' && typeof o.url === 'string' && o.url) ? 'link' : 'md';
  if (kind === 'link') {
    const url = safeUrl(o.url);
    return url ? { id: idOr(o.id, 'd'), kind, title: oneLine(o.title) || url, url, proof: o.proof === true } : null;
  }
  return { id: idOr(o.id, 'd'), kind, title: oneLine(o.title) || 'Document', body: mdBody(o.body), proof: o.proof === true };
}
const docsOf = (/** @type {any} */ a) => (Array.isArray(a) ? a.map(normDoc).filter(Boolean) : []);

/* Bàn giao (handoff): đầu ra khai ở bước / bước con tạo ra nó, `{id, name, ref, note}` (tên bắt buộc; ref: đường dẫn file
 * hay link; note: hợp đồng — schema, khoá, cam kết, cách kiểm). Đầu vào `ins` là id đầu ra ở chỗ khác trong dự án. */
/** Một đầu ra, hoặc null nếu không có tên. @param {any} o */
export function normOut(o) {
  if (!isObj(o) || !oneLine(o.name)) return null;
  return { id: idOr(o.id, 'o'), name: oneLine(o.name), ref: oneLine(o.ref), note: oneLine(o.note) };
}
const outsOf = (/** @type {any} */ a) => (Array.isArray(a) ? a.map(normOut).filter(Boolean) : []);
/** Đầu vào: chuỗi id, bỏ trùng, bỏ id đầu ra của chính nó. Id không còn trỏ tới đầu ra nào (bên giao đã xoá) vẫn giữ: bảng báo
 * lỗi, người dùng gỡ trong hộp sửa. @param {any} a @param {any[]} outs */
const insOf = (a, outs) => {
  const own = new Set(outs.map((o) => o.id));
  return [...new Set((Array.isArray(a) ? a : []).filter((s) => typeof s === 'string' && s && !own.has(s)))];
};

/** Dấu `sd` của bước con: việc sinh từ System design (`stage:khâu@chữ ký`, `edge:a>b@chữ ký`), hay `SD_KEPT` — người dùng
 * chọn Keep khi việc không còn trong thiết kế: thành việc của người dùng, không đối chiếu lại (core/design-plan.js). */
export const SD_KEPT = 'kept';
const SD_OK = /^(?:(?:stage|edge):[a-z0-9>-]{1,81}@[a-z0-9]{1,13}|kept)$/;

/** @param {any} o */
export function normSub(o) {
  const x = isObj(o) ? o : {};
  const status = STATUSES.includes(x.status) ? x.status : 'todo';
  return {
    id: idOr(x.id, 's'),
    title: oneLine(x.title) || 'Sub-step',
    status,
    reason: hasReason(status) ? multiLine(typeof x.reason === 'string' ? x.reason : x.cancelReason) : '', // cancelReason: dữ liệu cũ
    due: parseDate(x.due),
    doneAt: status === 'done' ? parseDate(x.doneAt) : '', // ngày sang Done (setStatus); dữ liệu cũ: rỗng, không bịa ngày
    doneWhen: oneLine(x.doneWhen),
    notes: multiLine(x.notes),
    docs: docsOf(x.docs),
    par: x.par === true,
    redo: x.redo === true,
    ...handOf(x),
    ...(typeof x.sd === 'string' && SD_OK.test(x.sd) ? { sd: x.sd } : {}), // test() ép mảng ['stage:a@b'] thành chuỗi: kiểm kiểu trước
  };
}
/** outs, ins của một bước / bước con. @param {any} x */
function handOf(x) {
  const outs = outsOf(x.outs);
  return { outs, ins: insOf(x.ins, outs) };
}

/** Số nguyên dương, không thì 0. @param {any} v */
const posInt = (v) => (Number.isInteger(v) && v > 0 && v < 10000 ? v : 0);

/* Vòng (iteration): step.round là vòng gần nhất của bước (1 = chưa mở lại lần nào). "Reopen" mở vòng round + 1, ghi cả vào
 * revisit.round, và các bước con được gửi lại làm có `redo: true` (đếm "còn mấy việc phải làm lại"). Đóng vòng: revisit về
 * null, mọi `redo` về false, step.round giữ để lần sau tăng tiếp. */
/** @param {any} o */
export function normStep(o) {
  const x = isObj(o) ? o : {};
  const r = x.revisit;
  const rv = isObj(r) ? { reason: oneLine(r.reason), date: parseDate(r.date) || today(), round: Math.max(2, posInt(r.round), posInt(x.round)) } : null;
  const subs = objs(x.subs).map(normSub);
  if (subs[0]) subs[0].par = false; // bước con đầu không có ô trước để nhập vào
  if (!rv) for (const y of subs) y.redo = false; // dấu "Redo" chỉ có nghĩa trong vòng đang mở
  return {
    id: idOr(x.id, 't'),
    title: oneLine(x.title) || 'Step',
    goal: oneLine(x.goal),
    doneWhen: oneLine(x.doneWhen),
    notes: multiLine(x.notes),
    revisit: rv,
    round: rv ? rv.round : Math.max(1, posInt(x.round)),
    docs: docsOf(x.docs),
    ...handOf(x),
    subs,
  };
}

/** @param {any} o */
export function normLog(o) {
  const x = isObj(o) ? o : {};
  return {
    id: idOr(x.id, 'l'),
    date: parseDate(x.date) || today(),
    decision: oneLine(x.decision) || '(empty)',
    why: multiLine(x.why),
    stepId: oneLine(x.stepId),
  };
}

/** @param {any} o */
export function normWorkspace(o) {
  const x = isObj(o) ? o : {};
  const raw = objs(x.steps);
  const steps = raw.map(normStep);
  const ids = new Set(steps.map((s) => s.id));
  /* Quyết định chỉ gắn với bước còn trong dự án. */
  const log = objs(x.log).map(normLog).map((l) => (ids.has(l.stepId) ? l : { ...l, stepId: '' }));
  /* Id đầu ra duy nhất trong dự án (trùng thì cái sau lấy id mới). Đầu vào mất nguồn vẫn giữ (insOf). Chủ có đầu ra vừa đổi id
   * thì đọc lại đầu vào từ bản gốc: đầu vào cùng id cũ (insOf đã bỏ vì tưởng là của chính nó) trỏ tới đầu ra giữ id ấy. */
  const rawOf = new Map();
  steps.forEach((s, i) => { rawOf.set(s, raw[i]); objs(raw[i].subs).forEach((r, j) => rawOf.set(s.subs[j], r)); });
  const outIds = new Set();
  for (const { h } of holders({ steps })) {
    let renamed = false;
    for (const o of h.outs) { if (outIds.has(o.id)) { o.id = uid('o'); renamed = true; } outIds.add(o.id); }
    if (renamed) h.ins = insOf(rawOf.get(h).ins, h.outs);
  }
  return {
    id: idOr(x.id, 'w'),
    name: oneLine(x.name) || 'Project',
    templateId: oneLine(x.templateId),
    createdAt: isoOr(x.createdAt),
    updatedAt: isoOr(x.updatedAt),
    notes: multiLine(x.notes),
    steps,
    log,
    design: normDesign(x.design),
  };
}

/* ── Sửa cùng lúc ở hai tab ──
 * Hộp sửa chụp các trường của mục lúc mở; lúc Lưu chỉ ghi trường người dùng đã đổi lên bản mới nhất (tab khác có thể đã
 * ghi). Hai bên cùng đổi một trường sang hai giá trị khác nhau là xung đột: trang hỏi giữ bên nào. */
/** Trường mà hộp sửa của từng loại mục ghi. */
export const EDIT_FIELDS = {
  sub: ['title', 'status', 'reason', 'due', 'doneWhen', 'notes', 'outs', 'ins'],
  step: ['title', 'goal', 'doneWhen', 'notes', 'outs', 'ins'],
  log: ['date', 'decision', 'why', 'stepId'],
};
/** Bản sao các trường `keys` của o. @param {any} o @param {string[]} keys @returns {Record<string, any>} */
export const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, JSON.parse(JSON.stringify(o[k] ?? null))]));
/**
 * Gộp: trường mình đổi (so với `snap`) lấy của mình, còn lại lấy `latest`. Cả hai cùng đổi một trường sang hai giá trị
 * khác nhau: tên trường vào `conflicts`, `merged` tạm giữ của mình.
 * @param {Record<string, any>} snap lúc mở hộp @param {Record<string, any>} mine trong hộp lúc Lưu @param {Record<string, any>} latest đang lưu
 * @returns {{merged: Record<string, any>, conflicts: string[]}}
 */
export function mergeEdit(snap, mine, latest) {
  const same = (/** @type {any} */ a, /** @type {any} */ b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  /** @type {Record<string, any>} */
  const merged = {};
  const conflicts = [];
  for (const k of Object.keys(mine)) {
    const m = !same(snap[k], mine[k]), t = !same(snap[k], latest[k]);
    merged[k] = m ? mine[k] : latest[k];
    if (m && t && !same(mine[k], latest[k])) conflicts.push(k);
  }
  return { merged, conflicts };
}

/** Bản sao sâu với id mới cho mọi thứ — dùng khi nhân bản và khi nhập. @param {any} ws */
export function freshCopy(ws) {
  const c = normWorkspace(JSON.parse(JSON.stringify(normWorkspace(ws))));
  const now = new Date().toISOString();
  c.id = uid('w');
  c.createdAt = now;
  c.updatedAt = now;
  const stepIds = new Map();
  for (const s of c.steps) {
    stepIds.set(s.id, uid('t'));
    s.id = stepIds.get(s.id);
    for (const d of s.docs) d.id = uid('d');
    for (const x of s.subs) {
      x.id = uid('s');
      for (const d of x.docs) d.id = uid('d');
    }
  }
  const outIds = new Map();
  for (const { h } of holders(c)) for (const o of h.outs) { outIds.set(o.id, uid('o')); o.id = outIds.get(o.id); }
  /* Đầu vào mất nguồn cũng lấy id mới (vẫn không trỏ tới đâu), cùng id cũ thì cùng id mới. */
  const fresh = (/** @type {string} */ id) => { if (!outIds.has(id)) outIds.set(id, uid('o')); return outIds.get(id); };
  for (const { h } of holders(c)) h.ins = h.ins.map(fresh);
  for (const l of c.log) {
    l.id = uid('l');
    l.stepId = stepIds.get(l.stepId) || '';
  }
  return c;
}

/** Tên chưa trùng: tên, rồi "tên (imported)", "tên (imported 2)"… @param {string} name @param {Iterable<string>} taken */
export function uniqueName(name, taken, tag = 'imported') {
  const set = new Set(taken);
  if (!set.has(name)) return name;
  for (let i = 1; ; i++) {
    const n = `${name} (${tag}${i > 1 ? ' ' + i : ''})`;
    if (!set.has(n)) return n;
  }
}

/** Dự án mới từ một mẫu của data/templates.json. Đầu ra của mẫu có `key` (duy nhất trong mẫu), đầu vào là danh sách key:
 * key thành id mới; key lạ bị bỏ. @param {any} tpl @param {string} [name] */
export function fromTemplate(tpl, name) {
  const t = isObj(tpl) ? tpl : {};
  const now = new Date().toISOString();
  /** @type {Map<string, string>} */
  const keys = new Map();
  const outs = (/** @type {any} */ o) => objs(o.outs).map((/** @type {any} */ y) => {
    const id = uid('o');
    if (typeof y.key === 'string' && y.key && !keys.has(y.key)) keys.set(y.key, id);
    return { id, name: y.name, ref: y.ref, note: y.note };
  });
  const steps = objs(t.steps).map((/** @type {any} */ s) => ({
    title: s.title, goal: s.goal, doneWhen: s.doneWhen, notes: s.notes, outs: outs(s), insKeys: s.ins,
    subs: objs(s.subs).map((/** @type {any} */ x) => ({ title: x.title, doneWhen: x.doneWhen, notes: x.notes, outs: outs(x), insKeys: x.ins })),
  }));
  const ins = (/** @type {any} */ k) => (Array.isArray(k) ? k : []).map((key) => keys.get(key)).filter(Boolean);
  for (const s of steps) {
    Object.assign(s, { ins: ins(s.insKeys) });
    for (const x of s.subs) Object.assign(x, { ins: ins(x.insKeys) });
  }
  return normWorkspace({ name: oneLine(name) || t.name || 'Project', templateId: t.id || '', createdAt: now, updatedAt: now, steps,
    design: presetDesign(t) }); // hồ sơ, lối mẫu đặt sẵn (PLAN-033); chỉ lúc tạo
}
