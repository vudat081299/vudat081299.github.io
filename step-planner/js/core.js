// @ts-check
/* Logic thuần của Step Planner: chuẩn hoá dữ liệu, tiến độ, Markdown và JSON vào / ra.
 * Không đụng DOM hay bộ nhớ trình duyệt; chạy được trong Node (tools/test-core.mjs). */

import { normDesign, DESIGN_HEADING, DESIGN_HEAD_RE, designMd, designReader } from './design-core.js';

/* Bảy trạng thái (PLAN-003), theo thứ tự: còn mở (mới, đang làm, chờ, bị chặn), xong, ngoài phạm vi (bỏ qua, huỷ).
 * Chờ: đợi bên ngoài, tự xong mà ta không phải làm gì. Bị chặn: vướng, phải ra tay gỡ. Bỏ qua: không cần với dự án này.
 * Huỷ: đã quyết không làm, giữ thẻ để nhớ vì sao. Tiến độ và "Tiếp theo" không tính bỏ qua, huỷ. */
export const STATUSES = ['todo', 'doing', 'pending', 'blocked', 'done', 'skip', 'cancel'];
export const STATUS_LABEL = { todo: 'New', doing: 'In progress', pending: 'Pending', blocked: 'Blocked', done: 'Done', skip: 'Skipped', cancel: 'Cancelled' };
const MARK = { todo: ' ', doing: '~', pending: '>', blocked: '!', done: 'x', skip: '-', cancel: '/' };
const FROM_MARK = { ' ': 'todo', '': 'todo', '~': 'doing', '>': 'pending', '!': 'blocked', x: 'done', X: 'done', '-': 'skip', '/': 'cancel' };
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
 * @param {any} sub @param {string} st */
export function setStatus(sub, st) {
  sub.status = STATUSES.includes(st) ? st : 'todo';
  if (!hasReason(sub.status)) sub.reason = '';
}

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
export const DOC_KINDS = ['link', 'md'];
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
    return url ? { id: idOr(o.id, 'd'), kind, title: oneLine(o.title) || url, url } : null;
  }
  return { id: idOr(o.id, 'd'), kind, title: oneLine(o.title) || 'Document', body: mdBody(o.body) };
}
const docsOf = (/** @type {any} */ a) => (Array.isArray(a) ? a.map(normDoc).filter(Boolean) : []);

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
    doneWhen: oneLine(x.doneWhen),
    notes: multiLine(x.notes),
    docs: docsOf(x.docs),
    par: x.par === true,
    redo: x.redo === true,
  };
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
  const steps = objs(x.steps).map(normStep);
  const ids = new Set(steps.map((s) => s.id));
  /* Quyết định chỉ gắn với bước còn trong dự án. */
  const log = objs(x.log).map(normLog).map((l) => (ids.has(l.stepId) ? l : { ...l, stepId: '' }));
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

/** Dự án mới từ một mẫu của data/templates.json. @param {any} tpl @param {string} [name] */
export function fromTemplate(tpl, name) {
  const t = isObj(tpl) ? tpl : {};
  const now = new Date().toISOString();
  return normWorkspace({
    name: oneLine(name) || t.name || 'Project',
    templateId: t.id || '',
    createdAt: now,
    updatedAt: now,
    steps: objs(t.steps).map((/** @type {any} */ s) => ({
      title: s.title, goal: s.goal, doneWhen: s.doneWhen, notes: s.notes,
      subs: objs(s.subs).map((/** @type {any} */ x) => ({ title: x.title, doneWhen: x.doneWhen, notes: x.notes })),
    })),
  });
}

/* ── Tiến độ ── */

/** Xong / (tổng − bỏ qua − huỷ). @param {{status:string}[]} subs */
export function progress(subs) {
  const total = subs.filter((s) => !outOfScope(s.status)).length;
  const done = subs.filter((s) => s.status === 'done').length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

/** @param {{steps:{subs:{status:string}[]}[]}} ws */
export const overall = (ws) => progress(ws.steps.flatMap((s) => s.subs));

/* ── Ô (slot) song song ──
 * Một bước là dãy ô có thứ tự; mỗi ô là một hay nhiều bước con chạy song song (xếp chồng trong một cột của hàng).
 * Dữ liệu vẫn là mảng phẳng `subs`: bước con có `par: true` nhập vào ô của bước con đứng ngay trước nó. */

/** @param {{par?:boolean}[]} subs @returns {any[][]} */
export function slotsOf(subs) {
  /** @type {any[][]} */
  const out = [];
  for (const x of subs) if (x.par && out.length) out[out.length - 1].push(x); else out.push([x]);
  return out;
}
/** Ô → mảng phẳng, đặt lại `par` (bỏ ô rỗng). @param {any[][]} slots */
export const fromSlots = (slots) => slots.filter((sl) => sl.length).flatMap((sl) => sl.map((x, k) => Object.assign(x, { par: k > 0 })));

/** @typedef {{stepId:string, slot:number, join:boolean, at:number}} Place
 * Chỗ của một bước con, tính trên các ô của bước khi đã nhấc nó ra: `join` false là một ô mới chen vào chỗ `slot`; true là
 * nhập vào ô `slot` ở vị trí `at` trong ô. Cùng một hệ toạ độ cho kéo thả, ô "Vị trí", phím tắt và Hoàn tác. */

/** @param {any} ws @param {string} subId @returns {Place|null} */
export function subPlace(ws, subId) {
  for (const step of ws.steps) {
    const slots = slotsOf(step.subs);
    for (const [i, sl] of slots.entries()) {
      const k = sl.findIndex((x) => x.id === subId);
      if (k >= 0) return sl.length > 1 ? { stepId: step.id, slot: i, join: true, at: k } : { stepId: step.id, slot: i, join: false, at: 0 };
    }
  }
  return null;
}
/** Nhấc bước con ra khỏi dự án (ô còn lại giữ nguyên, ô rỗng biến mất). @param {any} ws @param {string} subId */
export function takeSub(ws, subId) {
  for (const step of ws.steps) {
    const j = step.subs.findIndex((/** @type {any} */ x) => x.id === subId);
    if (j < 0) continue;
    const slots = slotsOf(step.subs).map((sl) => sl.filter((x) => x.id !== subId));
    const [sub] = step.subs.splice(j, 1);
    step.subs.splice(0, step.subs.length, ...fromSlots(slots));
    return sub;
  }
  return null;
}
/**
 * Đặt bước con vào chỗ `to` (nhấc khỏi chỗ cũ nếu đang ở trong dự án). Trả chỗ cũ (null nếu trước đó chưa có), hay
 * undefined khi bước đích không còn.
 * @param {any} ws @param {any} sub @param {Place} to
 */
export function placeSub(ws, sub, to) {
  const target = ws.steps.find((/** @type {any} */ s) => s.id === to.stepId);
  if (!target) return undefined;
  const from = subPlace(ws, sub.id);
  if (from) takeSub(ws, sub.id);
  const slots = slotsOf(target.subs);
  const i = Math.max(0, Math.min(Number.isFinite(to.slot) ? to.slot : slots.length, slots.length));
  if (to.join && slots[i]) slots[i].splice(Math.max(0, Math.min(Number.isFinite(to.at) ? to.at : slots[i].length, slots[i].length)), 0, sub);
  else slots.splice(i, 0, [sub]);
  target.subs.splice(0, target.subs.length, ...fromSlots(slots));
  return from;
}
/**
 * Alt + ← →: bước con đứng riêng một ô thì đổi chỗ với ô bên cạnh; đang ở ô song song thì tách ra thành ô riêng ngay trước
 * (←) hay ngay sau (→) ô ấy. Alt + ↑ ↓ (d = 'up' / 'down'): đổi thứ tự trong ô song song. Trả chỗ mới, hay null khi đã ở mép.
 * @param {any} ws @param {string} subId @param {'left'|'right'|'up'|'down'} d @returns {Place|null}
 */
export function shiftTarget(ws, subId, d) {
  const p = subPlace(ws, subId);
  if (!p) return null;
  const step = ws.steps.find((/** @type {any} */ s) => s.id === p.stepId);
  const n = slotsOf(step.subs).length; // số ô khi còn nó
  if (d === 'up' || d === 'down') {
    if (!p.join) return null;
    const size = slotsOf(step.subs)[p.slot].length - 1;
    const at = p.at + (d === 'up' ? -1 : 1);
    return at < 0 || at > size ? null : { ...p, at };
  }
  if (p.join) return { stepId: p.stepId, slot: p.slot + (d === 'right' ? 1 : 0), join: false, at: 0 };
  const slot = p.slot + (d === 'right' ? 1 : -1);
  return slot < 0 || slot > n - 1 ? null : { stepId: p.stepId, slot, join: false, at: 0 };
}

/** Số hiện của mọi bước ("2") và bước con: vị trí ô trong hàng ("3"), ô song song k bước con thì "3.1" … "3.k". @param {any} ws */
export function liveLabels(ws) {
  /** @type {Map<string, string>} */
  const m = new Map();
  ws.steps.forEach((/** @type {any} */ step, /** @type {number} */ i) => {
    m.set(step.id, String(i + 1));
    slotsOf(step.subs).forEach((sl, si) => sl.forEach((x, k) => m.set(x.id, sl.length > 1 ? `${si + 1}.${k + 1}` : String(si + 1))));
  });
  return m;
}

const open = (/** @type {{status:string}} */ x) => x.status !== 'done' && !outOfScope(x.status);
/** Việc tiếp theo của một bước: các bước con còn mở (không xong, không bỏ qua, không huỷ) của ô đầu tiên còn việc, trừ
 * thẻ chờ (không có việc để làm). Ô đầu còn việc chỉ có thẻ chờ: rỗng, "Next" không vượt qua chỗ đang chờ.
 * @param {{subs:{id:string,status:string,par?:boolean}[]}} step @returns {string[]} */
export function nextActionIds(step) {
  for (const sl of slotsOf(step.subs)) if (sl.some(open)) return sl.filter((x) => open(x) && x.status !== 'pending').map((x) => x.id);
  return [];
}

/** Việc phải làm lại của vòng đang mở: tổng số và số còn mở. @param {{subs:{status:string,redo?:boolean}[]}} step */
export function redoCount(step) {
  const all = step.subs.filter((x) => x.redo);
  return { total: all.length, left: all.filter(open).length };
}

/** Mở lại một bước chỉ có nghĩa khi nó có bước con đã xong để gửi lại làm (PLAN-004). @param {{subs:{status:string}[]}} step */
export const canReopen = (step) => step.subs.some((x) => x.status === 'done');

/** Việc tiếp theo của cả dự án: việc tiếp theo của bước đầu tiên còn việc. @param {any} ws @returns {string[]} */
export function projectNextIds(ws) {
  for (const s of ws.steps) if (s.subs.some(open)) return nextActionIds(s);
  return [];
}

/** So khớp không phân biệt hoa thường và dấu. */
export const fold = (/** @type {string} */ s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[đĐ]/g, 'd').toLowerCase();

/* ── Markdown ── (khuôn ghi đủ ở step-planner/CLAUDE.md, mục Markdown) */

/* Ký tự thoát `\x` đổi tạm sang vùng riêng của Unicode để các biểu thức bên dưới không thấy nó, rồi đổi lại. */
const PUA = 0xe000;
const protect = (/** @type {string} */ s) => s.replace(/\\([\s\S])/g, (_, c) => (c.charCodeAt(0) < 0x1900 ? String.fromCharCode(PUA + c.charCodeAt(0)) : c));
const restore = (/** @type {string} */ s) => s.replace(/[\ue000-\uf8ff]/g, (c) => String.fromCharCode(c.charCodeAt(0) - PUA));
/** Tách chuỗi đã protect theo ` · `. */
const splitDots = (/** @type {string} */ s) => s.split(' · ');

/** Tên trên dòng bước con: thoát `\`, `·`, `@` (Markdown viết tay có `@tên` thì token ấy bị bỏ), và chữ `hạn` / `due`
 * để không bị đọc là hạn. */
const escInline = (/** @type {string} */ s) => s.replace(/\\/g, '\\\\').replace(/·/g, '\\·').replace(/@/g, '\\@')
  .replace(/(^|[^\p{L}\p{N}])(hạn|due)/giu, (_, a, k) => a + '\\' + k);

/** Tách theo ` · ` chưa thoát, đồng thời bỏ thoát. @param {string} line */
export const splitInline = (line) => splitDots(protect(line)).map(restore);

/* Nhãn Markdown: xuất nhãn tiếng Anh (định dạng 3); nhập nhận cả nhãn tiếng Việt của định dạng 2, không phân biệt hoa
 * thường. */
const LABELS = {
  goal: ['Goal', 'Mục tiêu'], doneWhen: ['Done when', 'Xong khi'], reopened: ['Reopened', 'Quay lại'], iteration: ['Iteration', 'Vòng'],
  notes: ['Notes', 'Ghi chú'], docs: ['Docs', 'Tài liệu'], why: ['Why', 'Vì sao'],
  /* Lý do của bước con: xuất nhãn theo trạng thái (REASON_LABEL); nhập nhận nhãn nào cũng được nếu trạng thái có lý do. */
  reason: ['Cancelled because', 'Huỷ vì', 'Blocked by', 'Waiting on'],
  step: ['Step', 'Bước'],
};
const labelRe = (/** @type {string[]} */ names) => names.join('|');
const ANY_LABEL = labelRe(Object.values(LABELS).flat());
/** Khoá của một nhãn (`Goal` / `Mục tiêu` → goal). @param {string} name */
const labelKey = (name) => Object.keys(LABELS).find((k) => LABELS[k].some((n) => n.toLowerCase() === name.toLowerCase())) || '';
/** Dòng mở bằng nhãn `k` rồi `:`; trả phần sau nhãn. @param {string} line @param {keyof typeof LABELS} k */
const after = (line, k) => {
  const m = new RegExp(`^(?:${labelRe(LABELS[k])}):[ \\t]?(.*)$`, 'i').exec(line);
  return m ? m[1] : null;
};

/* Dòng ghi chú: dòng trống viết `\`; dòng có thể bị đọc nhầm (nhãn, đầu mục danh sách, tiêu đề, trích dẫn, `\`)
 * thêm `\` phía trước. */
const RISKY = new RegExp(`^(\\\\|#|>|\\s|([-*+]|\\d+[.)])(\\s|$)|\\*\\*|(${ANY_LABEL}):)`, 'i');
const escBlock = (/** @type {string} */ s) => (s === '' ? '\\' : RISKY.test(s) ? '\\' + s : s);
const unescBlock = (/** @type {string} */ s) => (s.startsWith('\\') ? s.slice(1) : s);
/** Khối dòng: mỗi dòng trừ dòng cuối có hai dấu cách cuối (xuống dòng khi xem trên GitHub, VS Code). */
const hardBreaks = (/** @type {string[]} */ lines) => lines.map((l, i) => (i < lines.length - 1 ? l + '  ' : l));

/* Tài liệu trong Markdown: nhãn `Tài liệu:` rồi mỗi tài liệu một mục thụt. Link: `- [tên](url)`. Văn bản: `- tên` rồi
 * khối rào thụt thêm hai bậc; rào dài hơn chuỗi ` dài nhất trong thân, nên thân chứa ``` hay dòng #, -, nhãn vẫn
 * nguyên. Trong tên: `\`, `[`, `]` thoát bằng `\`. */
const escDoc = (/** @type {string} */ s) => s.replace(/[\\[\]]/g, '\\$&');
const unescDoc = (/** @type {string} */ s) => s.replace(/\\([\\[\]])/g, '$1');
const DOC_LINK = /^\[((?:\\.|[^\]\\])*)\]\((?:<([^<>]*)>|(\S+))\)$/;
const DOC_ITEM = /^(\s*)[-*+][ \t]+(.*)$/;
const DOC_FENCE = /^(\s*)(`{3,}|~{3,})/;
/** Các dòng sau nhãn `Tài liệu:` (nhãn do người gọi ghi). @param {any[]} docs @param {string} ind thụt của nhãn */
function docLines(docs, ind) {
  const out = [];
  for (const d of docs) {
    if (d.kind === 'link') {
      out.push(`${ind}  - [${escDoc(d.title)}](${/[()]/.test(d.url) ? '<' + d.url + '>' : d.url})`);
      continue;
    }
    const longest = Math.max(0, ...(d.body.match(/`+/g) || []).map((r) => r.length));
    const fence = '`'.repeat(Math.max(3, longest + 1));
    const fi = ind + '    ';
    out.push(`${ind}  - ${escDoc(d.title)}`, fi + fence + 'markdown',
      ...(d.body ? d.body.split('\n').map((l) => (l ? fi + l : '')) : []), fi + fence);
  }
  return out;
}
/** Bỏ tối đa n dấu cách đầu dòng. @param {string} l @param {number} n */
const dedent = (l, n) => l.replace(new RegExp(`^ {0,${n}}`), '');
/** Dòng k mở một tài liệu: mục là link, hoặc mục mà dòng ngay sau là rào. Mục mở bằng ô việc (`[ ]`, `[x]`…) là
 * bước con, kể cả khi ghi chú của nó mở bằng rào (tên tài liệu xuất ra luôn thoát `[`).
 * @param {string[]} lines @param {number} k @param {number} min */
function docAt(lines, k, min) {
  const m = DOC_ITEM.exec(lines[k] || '');
  return !!m && m[1].length >= min && (DOC_LINK.test(m[2]) || (!/^\[.?\]/.test(m[2]) && DOC_FENCE.test(lines[k + 1] || '')));
}
/**
 * Đọc các tài liệu bắt đầu ở dòng i (ngay sau nhãn `Tài liệu:`), đẩy vào docs. Trả về dòng đầu tiên không thuộc chúng.
 * min: thụt tối thiểu của mục (bước con: 2, để mục không thụt vẫn là bước con).
 * @param {string[]} lines @param {number} i @param {any[]} docs @param {string[]} warnings @param {number} min
 */
function readDocs(lines, i, docs, warnings, min) {
  while (i < lines.length) {
    if (!lines[i].trim()) {
      let k = i;
      while (k < lines.length && !lines[k].trim()) k++;
      if (!docAt(lines, k, min)) return i;
      i = k;
    }
    if (!docAt(lines, i, min)) return i;
    const text = /** @type {RegExpExecArray} */ (DOC_ITEM.exec(lines[i]))[2].trim();
    const lk = DOC_LINK.exec(text);
    if (lk) {
      const title = unescDoc(lk[1]), url = lk[2] ?? lk[3];
      const d = normDoc({ kind: 'link', title, url });
      if (d) docs.push(d); else warnings.push(`Link is not http(s), skipped: ${title || url}`);
      i++;
      continue;
    }
    const f = /** @type {RegExpExecArray} */ (DOC_FENCE.exec(lines[i + 1]));
    const close = new RegExp(`^\\s*${f[2][0] === '`' ? '`' : '~'}{${f[2].length},}\\s*$`);
    const body = [];
    let k = i + 2;
    while (k < lines.length && !close.test(lines[k])) body.push(dedent(lines[k++], f[1].length));
    const title = unescDoc(text);
    if (k >= lines.length) warnings.push(`Document "${title}" has no closing fence; read to the end of the file.`);
    docs.push(normDoc({ kind: 'md', title, body: body.join('\n') }));
    i = k + 1;
  }
  return i;
}

/**
 * `labels` (tuỳ chọn): danh mục thiết kế (data/system-design.json), cho mục System design dễ đọc; nhập chỉ đọc id.
 * @param {any} ws @param {any} [labels]
 * @returns {string}
 */
export function toMarkdown(ws, labels = null) {
  const out = [`# ${ws.name}`, '', `> ${APP_NAME} · format ${MD_VERSION}`];
  if (ws.templateId) out.push('>', `> Template: ${ws.templateId}`);
  if (ws.notes) out.push('', ...hardBreaks(ws.notes.split('\n').map(escBlock)));
  ws.steps.forEach((/** @type {any} */ s, /** @type {number} */ i) => {
    out.push('', `## ${i + 1}. ${s.title}`);
    if (s.goal) out.push('', `Goal: ${s.goal}`);
    if (s.doneWhen) out.push('', `Done when: ${s.doneWhen}`);
    if (s.revisit) out.push('', `Reopened: ${s.revisit.date} · iteration ${s.revisit.round}` + (s.revisit.reason ? ` · ${s.revisit.reason}` : ''));
    else if (s.round > 1) out.push('', `Iteration: ${s.round}`);
    if (s.notes) out.push('', ...hardBreaks(['Notes:', ...s.notes.split('\n').map((l) => '  ' + escBlock(l))]));
    if (s.docs.length) out.push('', 'Docs:', ...docLines(s.docs, ''));
    if (s.subs.length) out.push('');
    for (const x of s.subs) {
      let line = `- [${MARK[x.status]}] ${escInline(x.title)}`;
      if (x.par) line += ' · parallel';
      if (x.redo) line += ' · redo';
      if (x.due) line += ` · due ${x.due}`;
      const more = [];
      if (x.doneWhen) more.push(`  Done when: ${x.doneWhen}`);
      if (hasReason(x.status) && x.reason) {
        const [first, ...rest] = x.reason.split('\n');
        more.push(`  ${REASON_LABEL[x.status]}: ${first}`, ...rest.map((l) => '    ' + escBlock(l)));
      }
      if (x.notes) more.push(...x.notes.split('\n').map((l) => '  ' + escBlock(l)));
      if (x.docs.length) more.push('  Docs:');
      out.push(...hardBreaks([line, ...more]), ...docLines(x.docs, '  '));
    }
  });
  if (ws.design) out.push('', `## ${DESIGN_HEADING}`, ...designMd(ws.design, labels, escBlock, hardBreaks));
  if (ws.log.length) {
    out.push('', `## ${LOG_HEADING}`, '');
    for (const l of ws.log) {
      const why = l.why ? l.why.split('\n') : [];
      const step = ws.steps.find((/** @type {any} */ s) => s.id === l.stepId);
      out.push(...hardBreaks([`- ${l.date} · ${l.decision}`, ...(step ? [`  Step: ${step.title}`] : []),
        ...why.map((w, k) => (k ? '  ' + escBlock(w) : `  Why: ${w}`))]));
    }
  }
  return out.join('\n') + '\n';
}

const ITEM = /^(?:[-*+]|\d+[.)])\s+(?:\[(.?)\]\s*)?(.*)$/;
const STEP_PREFIX = /^(?:(?:bước|step)\s*)?\d+(?:\s*[.):]\s*|\s+)/i;
const DATE_TOKEN = '(\\d{4}-\\d{1,2}-\\d{1,2}|\\d{1,2}\\/\\d{1,2}\\/\\d{4})';
const META_DUE = new RegExp(`^(?:hạn|due):?\\s+${DATE_TOKEN}$`, 'i');
const TITLE_DUE = new RegExp(`(^|[\\s(\\[,;])(?:hạn|due):?\\s+(\\d{1,4}[-\\/]\\d{1,2}[-\\/]\\d{1,4})`, 'gi');
const LOG_DATE = new RegExp(`^${DATE_TOKEN}\\s*(?:·|–|-|:)?\\s*(.*)$`);

/**
 * Chữ sau dấu ô của một bước con: tên và hạn. Viết tay thì `hạn` / `due` ở đâu trên dòng cũng được. Không có khái niệm
 * người làm: `@tên`, `` `@tên` `` (file cũ, Markdown viết tay) bị bỏ khỏi tên.
 * @param {string} raw @param {string[]} warnings
 */
function parseSubText(raw, warnings) {
  const parts = splitDots(protect(raw));
  let title = parts[0];
  let due = '';
  let par = false;
  let redo = false;
  for (const part of parts.slice(1)) {
    const t = part.trim();
    let m;
    if (/^`@[^`]+`$/.test(t) || /^@.+$/.test(t)) continue; // người làm của file cũ: bỏ
    if (/^(?:parallel|song song)$/i.test(restore(t))) { par = true; continue; }
    if (/^(?:redo|làm lại)$/i.test(restore(t))) { redo = true; continue; }
    if ((m = META_DUE.exec(restore(t))) && parseDate(m[1]) && !due) due = parseDate(m[1]);
    else {
      if (/^(?:hạn|due)\b/i.test(restore(t))) warnings.push(`Due date not readable, kept in the title: ${restore(t)}`);
      title += ' · ' + part;
    }
  }
  let changed = false;
  title = title.replace(/`@[^`]+`/g, () => { changed = true; return ' '; });
  title = title.replace(/(^|[\s(\[,;])@[^\s,;()[\]`]+/g, (_, pre) => { changed = true; return pre; });
  title = title.replace(TITLE_DUE, (all, pre, d) => {
    const v = parseDate(d);
    if (!v) { warnings.push(`Due date not readable: ${d}`); return all; }
    if (!due) due = v;
    changed = true;
    return pre;
  });
  if (changed) title = title.replace(/\(\s*(?:[,;]\s*)*\)/g, '').replace(/\s+/g, ' ').replace(/^[\s,;·:-]+|[\s,;·:-]+$/g, '');
  return { title: restore(title).trim(), due, par, redo };
}

/**
 * Đọc Markdown: khuôn do trang xuất, và cả Markdown viết tay (gạch đầu dòng thường, `+`, `1.`, `[]`, mục lồng, ngày
 * dd/mm/yyyy, chữ trước bước đầu). Dòng lạ không bị bỏ: thành ghi chú.
 * @param {string} text
 * @returns {{ workspace: any, warnings: string[] }}
 */
export function fromMarkdown(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  /** @type {string[]} */
  const warnings = [];
  /** @type {any} */
  const ws = { name: '', templateId: '', steps: [], log: [] };
  /** @type {any} */ let step = null;
  /** @type {any} */ let sub = null;
  /** @type {any} */ let entry = null;
  /** @type {any} */ let dr = null; // bộ đọc mục System design (design-core.js)
  let inLog = false;
  let inDesign = false;
  let started = false; // đã qua `## ` đầu tiên
  let block = /** @type {'' | 'step' | 'sub' | 'why'} */ ('');
  let blockFirst = false;
  let reasonCont = false; // đang ở các dòng thụt bốn nối tiếp nhãn lý do (`Cancelled because:`, `Huỷ vì:`…)
  const addNote = (/** @type {any} */ o, /** @type {string} */ key, /** @type {string} */ l) => {
    o[key] = o[key] === undefined || o[key] === null ? l : o[key] + '\n' + l;
  };
  const newSub = (/** @type {string} */ mark, /** @type {string} */ rest) => {
    if (!step) { step = { title: LOOSE_STEP, subs: [] }; ws.steps.push(step); }
    const p = parseSubText(rest, warnings);
    sub = { title: p.title, status: FROM_MARK[mark ?? ' '] || 'todo', due: p.due, par: p.par, redo: p.redo };
    if (mark != null && !(mark in FROM_MARK)) warnings.push(`Unknown mark [${mark}], read as New: ${p.title}`);
    step.subs.push(sub);
    block = 'sub'; blockFirst = true;
  };
  const newEntry = (/** @type {string} */ s) => {
    const d = LOG_DATE.exec(s);
    entry = d && parseDate(d[1]) ? { date: parseDate(d[1]), decision: d[2] } : { decision: s };
    ws.log.push(entry);
    block = 'why'; blockFirst = true;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (inDesign && !/^## /.test(raw)) { dr.line(raw); continue; }
    const ind = /^( {2}|\t)(.*)$/.exec(raw);
    if (ind && block === 'sub' && reasonCont && /^ {2}/.test(ind[2])) {
      sub.reason += '\n' + unescBlock(ind[2].slice(2));
      continue;
    }
    reasonCont = false;
    /* Nhãn lý do chỉ là lý do khi trạng thái có lý do; còn lại là một dòng ghi chú (không mất chữ). */
    if (ind && block === 'sub' && hasReason(sub.status) && after(ind[2], 'reason') !== null) {
      sub.reason = /** @type {string} */ (after(ind[2], 'reason'));
      reasonCont = true;
      blockFirst = false;
      continue;
    }
    if (ind && block === 'sub' && /^\s*$/.test(after(ind[2], 'docs') ?? 'x')) {
      sub.docs = sub.docs || [];
      i = readDocs(lines, i + 1, sub.docs, warnings, 2) - 1;
      blockFirst = false;
      continue;
    }
    if (ind && block) {
      const l = ind[2];
      const item = ITEM.exec(l.trimStart());
      if (block === 'sub' && item && !/^\s*\\/.test(l)) { newSub(item[1], item[2]); continue; }
      if (block === 'sub') {
        if (blockFirst && after(l, 'doneWhen') !== null) sub.doneWhen = /** @type {string} */ (after(l, 'doneWhen'));
        else addNote(sub, 'notes', unescBlock(l));
      } else if (block === 'step') addNote(step, 'notes', unescBlock(l));
      else if (block === 'why' && blockFirst && entry.why == null && entry.stepTitle == null && after(l, 'step') !== null) {
        entry.stepTitle = oneLine(after(l, 'step')); // `Step:` đứng ngay dưới dòng quyết định, trước `Why:`
        continue;
      } else if (block === 'why') addNote(entry, 'why', blockFirst && after(l, 'why') !== null ? /** @type {string} */ (after(l, 'why')) : unescBlock(l));
      blockFirst = false;
      continue;
    }
    if (block === 'sub' && raw.trim() === '') continue; // dòng trống giữa các bước con
    block = '';
    if (raw.trim() === '') continue;
    let m;
    if ((m = /^## (.+)$/.exec(raw))) {
      started = true; sub = null;
      const h = m[1].trim();
      if (/^(nhật ký( quyết định)?|decision log)$/i.test(h)) { inLog = true; inDesign = false; step = null; continue; }
      inLog = false;
      if (DESIGN_HEAD_RE.test(h)) {
        inDesign = true; step = null;
        if (!dr) { dr = designReader(warnings, unescBlock); ws.design = dr.design; }
        continue;
      }
      inDesign = false;
      step = { title: h.replace(STEP_PREFIX, '') || h, subs: [] };
      ws.steps.push(step);
      continue;
    }
    if (inLog) {
      const it = ITEM.exec(raw);
      newEntry(it ? it[2] : raw.trim());
      continue;
    }
    if (!started) {
      if ((m = /^# (.+)$/.exec(raw)) && !ws.name) { ws.name = m[1]; continue; }
      if ((m = /^>\s?(.*)$/.exec(raw))) {
        const kv = /^(?:Template|Mẫu):\s*(.*)$/i.exec(m[1]);
        if (kv) ws.templateId = kv[1]; // dòng `Người:` của file cũ: bỏ qua
        continue;
      }
      const it = ITEM.exec(raw);
      if (it) { newSub(it[1], it[2]); continue; }
      if (!ws.name && !ws.notes && !ws.steps.length) { ws.name = raw.replace(/^#+\s*/, ''); continue; }
      addNote(ws, 'notes', unescBlock(raw));
      continue;
    }
    if (!step) continue;
    const it = ITEM.exec(raw);
    if (it) { newSub(it[1], it[2]); continue; }
    sub = null;
    const mm = new RegExp(`^\\**(${ANY_LABEL}):\\**\\s?(.*)$`, 'i').exec(raw);
    const key = mm ? labelKey(mm[1]) : '';
    const meta = mm && ['goal', 'doneWhen', 'reopened', 'iteration', 'notes', 'docs'].includes(key) ? [mm[0], key, mm[2]] : null;
    if (meta && meta[1] === 'goal') step.goal = meta[2];
    else if (meta && meta[1] === 'doneWhen') step.doneWhen = meta[2];
    else if (meta && meta[1] === 'reopened') {
      /* `ngày · iteration N · lý do` (định dạng 2: `vòng N`); dòng cũ `ngày · lý do` (không vòng) vẫn đọc: vòng 2. */
      const d = /^(\S+)(?: · (?:iteration|vòng) (\d+)(?= · |$))?(?: · (.*))?$/i.exec(meta[2]);
      step.revisit = d && parseDate(d[1]) ? { date: parseDate(d[1]), round: d[2] ? +d[2] : 0, reason: d[3] || '' } : { reason: meta[2] };
    } else if (meta && meta[1] === 'iteration') {
      const n = /^\s*(\d+)\s*$/.exec(meta[2]);
      if (n) step.round = +n[1]; else addNote(step, 'notes', raw);
    } else if (meta && meta[1] === 'notes' && !meta[2].trim()) { block = 'step'; blockFirst = true; }
    else if (meta && meta[1] === 'docs' && !meta[2].trim()) {
      step.docs = step.docs || [];
      i = readDocs(lines, i + 1, step.docs, warnings, 0) - 1;
    }
    else addNote(step, 'notes', raw);
  }
  if (!ws.name && !ws.steps.length) throw new Error('No "# …" title, "## …" step or "- [ ] …" task found.');
  /* `Step: tên` của quyết định: gắn với bước đầu tiên cùng tên (bỏ dấu, không phân biệt hoa thường). */
  for (const l of ws.log) {
    if (l.stepTitle == null) continue;
    const s = ws.steps.find((/** @type {any} */ x) => fold(oneLine(x.title)) === fold(l.stepTitle));
    if (s) l.stepId = s.id = s.id || uid('t');
    else if (l.stepTitle) warnings.push(`Decision linked to a missing step, link dropped: ${l.stepTitle}`);
    delete l.stepTitle;
  }
  return { workspace: normWorkspace(ws), warnings };
}

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

/**
 * Đọc chữ dán vào hay file chọn: JSON (một dự án, bản sao lưu, hay mảng dự án) hoặc Markdown.
 * Luôn trả bản sao có id mới; ghi vào đâu là việc của trang.
 * @param {string} text
 * @returns {{ kind: 'json' | 'backup' | 'md', workspaces: any[], warnings: string[] }}
 */
export function parseImport(text) {
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
      out.push(freshCopy(w));
    });
    if (!out.length) throw new Error('No valid project in this JSON. ' + warnings.slice(0, 3).join(' '));
    return { kind, workspaces: out, warnings };
  }
  const { workspace, warnings } = fromMarkdown(t);
  return { kind: 'md', workspaces: [freshCopy(workspace)], warnings };
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

const docShape = (/** @type {any} */ d) => (d.kind === 'link' ? { kind: d.kind, title: d.title, url: d.url } : { kind: d.kind, title: d.title, body: d.body });
/** Phần so được khi kiểm Markdown đi rồi về: bỏ id và mốc thời gian. @param {any} ws */
export function shape(ws) {
  return {
    name: ws.name, templateId: ws.templateId, notes: ws.notes,
    steps: ws.steps.map((/** @type {any} */ s) => ({
      title: s.title, goal: s.goal, doneWhen: s.doneWhen, notes: s.notes, revisit: s.revisit, round: s.round, docs: s.docs.map(docShape),
      subs: s.subs.map((/** @type {any} */ x) => ({ title: x.title, status: x.status, reason: x.reason, due: x.due, doneWhen: x.doneWhen, notes: x.notes, par: x.par, redo: x.redo, docs: x.docs.map(docShape) })),
    })),
    log: ws.log.map((/** @type {any} */ l) => ({ date: l.date, decision: l.decision, why: l.why, step: ws.steps.findIndex((/** @type {any} */ s) => s.id === l.stepId) })),
    design: ws.design,
  };
}
