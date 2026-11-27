// @ts-check
/* Bảng, thuần: tiến độ, ô song song (slotsOf, fromSlots), chỗ và phép dời bước con (subPlace, takeSub, placeSub,
   shiftTarget), số nhãn (liveLabels), việc tiếp theo, vòng làm lại, nhóm lọc trạng thái, so khớp bỏ dấu (fold).
   Xuất: progress, overall, slotsOf, fromSlots, subPlace, takeSub, placeSub, shiftTarget, liveLabels, nextActionIds,
     redoCount, canReopen, projectNextIds, nextWaitingOn, STATUS_GROUPS, inGroup, fold.
   Dùng: core/model.js. */
import { outOfScope } from './model.js';

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
/** Thẻ làm được ngay: New, In progress (nhóm Actionable); Pending, Blocked là thẻ chờ (nhóm Waiting). */
const actionable = (/** @type {{status:string}} */ x) => x.status === 'todo' || x.status === 'doing';
/** Việc tiếp theo của một bước: các bước con làm được ngay của ô đầu tiên còn việc (còn mở: không xong, không bỏ qua,
 * không huỷ); thẻ chờ (Pending, Blocked) không bao giờ là "Next". Ô đầu còn việc chỉ có thẻ chờ: rỗng, "Next" không vượt qua chỗ đang chờ.
 * @param {{subs:{id:string,status:string,par?:boolean}[]}} step @returns {string[]} */
export function nextActionIds(step) {
  for (const sl of slotsOf(step.subs)) if (sl.some(open)) return sl.filter(actionable).map((x) => x.id);
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

/** "Next" đang chờ: ô đầu tiên còn việc (của bước đầu tiên còn việc) không có thẻ làm được ngay, chỉ thẻ Pending / Blocked.
 * Trả các thẻ ấy (để báo "Next waits on …"), không thì []. "Next" vẫn không vượt qua chỗ chờ. @param {any} ws @returns {any[]} */
export function nextWaitingOn(ws) {
  for (const s of ws.steps) {
    const sl = slotsOf(s.subs).find((x) => x.some(open));
    if (!sl) continue;
    const live = sl.filter(open);
    return live.some(actionable) ? [] : live;
  }
  return [];
}

/** Lọc thẻ theo nhóm trạng thái (thanh công cụ): '' là mọi trạng thái. */
export const STATUS_GROUPS = { '': null, act: ['todo', 'doing'], wait: ['pending', 'blocked'], done: ['done'], out: ['skip', 'cancel'] };
/** @param {string} group @param {string} status */
export const inGroup = (group, status) => !STATUS_GROUPS[group] || STATUS_GROUPS[group].includes(status);

/** So khớp không phân biệt hoa thường và dấu. */
export const fold = (/** @type {string} */ s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[đĐ]/g, 'd').toLowerCase();
