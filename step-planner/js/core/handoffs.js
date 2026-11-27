// @ts-check
/* Bàn giao (outs / ins), thuần: ai giữ đầu ra, đầu vào (holders, outIndex), cặp bên giao → bên nhận theo hàng và ô,
   đầu vào treo (handoffs), trạng thái đầu vào / đầu ra (ioStatus), nơi dùng (consumersOf, insBackup), "on hold" theo chỗ chưa
   lưu của hộp sửa (heldInfoAt, handoffsAt).
   Xuất: holders, outIndex, holderTitle, heldKey, handoffs, ioStatus, insBackup, consumersOf, heldInfoAt,
     handoffsAt.
   Dùng: core/board.js. */
import { placeSub, slotsOf } from './board.js';

/* ── Bàn giao: ai tạo, ai dùng ── */

/** @typedef {{h:any, step:any, sub:any, i:number}} Holder bước (sub null) hay bước con giữ đầu ra / đầu vào; i: chỉ số bước */
/** Mọi chủ của đầu ra, đầu vào theo thứ tự trên bảng: bước rồi các bước con của nó. @param {{steps:any[]}} ws @returns {Holder[]} */
export function holders(ws) {
  /** @type {Holder[]} */
  const out = [];
  ws.steps.forEach((step, i) => {
    out.push({ h: step, step, sub: null, i });
    for (const sub of step.subs) out.push({ h: sub, step, sub, i });
  });
  return out;
}
/** id đầu ra → {out, chủ của nó}. @param {{steps:any[]}} ws @returns {Map<string, {out:any} & Holder>} */
export function outIndex(ws) {
  const m = new Map();
  for (const hd of holders(ws)) for (const out of hd.h.outs || []) m.set(out.id, { out, ...hd });
  return m;
}
/** Tên chủ: tên bước con, hay tên bước. @param {Holder} hd */
export const holderTitle = (hd) => (hd.sub ? hd.sub.title : hd.step.title);

/** @typedef {{from:Holder, to:Holder, outs:any[]}} Pair một cặp bên giao → bên nhận, kèm các đầu ra được chuyển */
/** Khoá của một đầu vào treo: id bên nhận và id đầu ra. @param {string} toId @param {string} outId */
export const heldKey = (toId, outId) => toId + '>' + outId;

/**
 * Mọi bàn giao đã khai và cách bảng hiện chúng. links: mỗi (đầu ra, bên nhận) một mục. usedBy: id đầu ra → bên nhận.
 * rows: chỉ số bước j → các cặp từ các bước trước sang bước j (mũi tên trên hàng j). gaps: id bước → (k → các cặp từ các ô
 * trước sang ô k + 1 của cùng hàng). Cặp gộp các đầu ra cùng bên giao, cùng bên nhận. held: liên kết treo (bên nhận đứng
 * trước bên giao, hay cùng ô song song với nó); heldKeys: `heldKey` của chúng; parKeys: phần của heldKeys treo vì cùng ô.
 * @param {{steps:any[]}} ws
 */
export function handoffs(ws) {
  const idx = outIndex(ws);
  /** @type {{out:any, from:Holder, to:Holder}[]} */
  const links = [];
  /** @type {Map<string, Holder[]>} */
  const usedBy = new Map();
  const slotOf = new Map();
  for (const step of ws.steps) slotsOf(step.subs).forEach((sl, k) => sl.forEach((x) => slotOf.set(x.id, k)));
  for (const to of holders(ws)) {
    for (const id of to.h.ins || []) {
      const src = idx.get(id);
      if (!src) continue;
      const { out, ...from } = src;
      links.push({ out, from, to });
      if (!usedBy.has(id)) usedBy.set(id, []);
      /** @type {Holder[]} */ (usedBy.get(id)).push(to);
    }
  }
  /** @param {typeof links} list @returns {Pair[]} */
  const pairs = (list) => {
    const m = new Map();
    for (const l of list) {
      const k = l.from.h.id + '>' + l.to.h.id;
      if (!m.has(k)) m.set(k, { from: l.from, to: l.to, outs: [] });
      m.get(k).outs.push(l.out);
    }
    return [...m.values()];
  };
  /** @type {Map<number, Pair[]>} */
  const rows = new Map();
  /** @type {Map<string, Map<number, Pair[]>>} */
  const gaps = new Map();
  /* Vạch trên hàng j: mọi cặp từ hàng trước j vào hàng j. Nút trước ô k + 1: mọi cặp từ ô trước nó, cùng hàng, vào ô ấy.
   * Cặp chảy ngược (hàng sau → hàng trước, ô sau → ô trước, cùng ô) không có vạch, chỉ thấy trong hộp sửa. */
  for (const p of pairs(links)) {
    if (p.to.i > p.from.i) {
      if (!rows.has(p.to.i)) rows.set(p.to.i, []);
      /** @type {Pair[]} */ (rows.get(p.to.i)).push(p);
    } else if (p.to.i === p.from.i && p.from.sub && p.to.sub && slotOf.get(p.to.sub.id) > slotOf.get(p.from.sub.id)) {
      const id = p.to.step.id, k = slotOf.get(p.to.sub.id) - 1;
      if (!gaps.has(id)) gaps.set(id, new Map());
      const g = /** @type {Map<number, Pair[]>} */ (gaps.get(id));
      if (!g.has(k)) g.set(k, []);
      /** @type {Pair[]} */ (g.get(k)).push(p);
    }
  }
  /* Treo: bên nhận đứng trước bên giao (hàng trước, hay ô trước cùng hàng) sau khi sắp xếp lại, hay cùng ô song song với nó
   * (hai việc chạy cùng lúc, bên nhận không chờ được đầu ra). Liên kết vẫn nằm trong dữ liệu; dời về đúng thứ tự thì tự nối lại. */
  /** @param {typeof links[number]} l */
  const sameSlot = (l) => l.to.i === l.from.i && !!l.from.sub && !!l.to.sub && slotOf.get(l.to.sub.id) === slotOf.get(l.from.sub.id);
  const held = links.filter((l) => l.to.i < l.from.i
    || (l.to.i === l.from.i && l.from.sub && l.to.sub && slotOf.get(l.to.sub.id) <= slotOf.get(l.from.sub.id)));
  const key = (/** @type {typeof links[number]} */ l) => heldKey(l.to.h.id, l.out.id);
  return { idx, links, usedBy, rows, gaps, held, heldKeys: new Set(held.map(key)), parKeys: new Set(held.filter(sameSlot).map(key)) };
}

/**
 * @typedef {{kind:'held'|'missing', id:string, name:string, from:string, at:string, par:boolean}} InWhy đầu vào lỗi: treo (nguồn
 * giờ đứng sau, hay cùng ô song song: par), hay trỏ tới đầu ra không còn (name, from rỗng); at: tên bước con giữ đầu vào ấy khi
 * xét cho bước, rỗng là của chính chủ
 * @typedef {{kind:'unused'|'held', id:string, name:string, to:string[], par:string[], live:number}} OutWhy đầu ra lỗi: không ai
 * dùng, hay có nơi dùng đang treo (to: tên các nơi ấy; par: những nơi trong to cùng ô song song; live: số nơi dùng còn nối,
 * 0 = chỉ có nơi dùng treo)
 * @typedef {{in:'ok'|'bad'|'none', out:'ok'|'bad'|'none', inWhy:InWhy[], outWhy:OutWhy[], finals:string[]}} IoStatus finals: tên
 * các đầu ra cuối (`final`) chưa ai dùng
 */
/**
 * Trạng thái đầu vào / đầu ra của mỗi bước, bước con (id → IoStatus). Đầu vào của bước con: 'bad' nếu có một đầu vào treo hay trỏ
 * tới đầu ra không còn; không có đầu vào: 'none'. Đầu vào của bước gộp đầu vào của nó và mọi bước con: 'bad' nếu một đầu vào trong
 * số ấy lỗi (kể cả đầu vào nhận từ chính bước, từ bước con cùng bước); 'none' nếu không đầu vào nào nhận từ ngoài bước và không cái
 * nào lỗi; còn lại 'ok'. inWhy của bước ghi tên bước con giữ đầu vào lỗi (at).
 * Đầu ra cuối (`final`) không ai dùng là ổn (sản phẩm cuối, không cần nơi nhận); có nơi dùng thì xét như đầu ra khác.
 * Đầu ra của bước con: 'bad' nếu một đầu ra không có nơi nhận đang nối (không ai dùng mà không là đầu ra cuối, hay chỉ nơi dùng
 * treo) hoặc có nơi dùng treo. Đầu ra của bước gộp đầu ra của nó và mọi bước con: 'bad' khi không đầu ra nào ổn (có nơi nhận
 * đang nối, hay là đầu ra cuối không ai dùng), hoặc một đầu ra có nơi dùng treo. Không có đầu ra: 'none'. outWhy nêu mọi đầu ra
 * không ai dùng (trừ đầu ra cuối) và mọi đầu ra có nơi dùng treo, kể cả khi nó còn nơi dùng khác đang nối.
 * @param {{steps:any[]}} ws @param {ReturnType<typeof handoffs>} [hand] @returns {Map<string, IoStatus>}
 */
export function ioStatus(ws, hand = handoffs(ws)) {
  const { idx, links, heldKeys, parKeys } = hand;
  /** @typedef {{live:number, held:string[], par:string[]}} Use */
  /** @type {Map<string, Use>} id đầu ra → số nơi nhận đang nối, tên nơi nhận treo, tên nơi nhận treo vì cùng ô */
  const use = new Map();
  for (const l of links) {
    if (!use.has(l.out.id)) use.set(l.out.id, { live: 0, held: [], par: [] });
    const u = /** @type {Use} */ (use.get(l.out.id));
    const k = heldKey(l.to.h.id, l.out.id);
    if (heldKeys.has(k)) u.held.push(holderTitle(l.to));
    else u.live++;
    if (parKeys.has(k)) u.par.push(holderTitle(l.to));
  }
  /** @param {any[]} outs @returns {OutWhy[]} */
  const outWhy = (outs) => outs.flatMap((o) => {
    const u = use.get(o.id);
    if ((u && !u.held.length) || (!u && o.final)) return [];
    return [{ kind: u ? 'held' : 'unused', id: o.id, name: o.name, to: u ? u.held : [], par: u ? u.par : [], live: u ? u.live : 0 }];
  });
  /** @param {any} x @param {string} [at] @returns {InWhy[]} */
  const inWhy = (x, at = '') => (x.ins || []).flatMap((/** @type {string} */ id) => {
    const src = idx.get(id);
    if (!src) return [{ kind: 'missing', id, name: '', from: '', at, par: false }];
    const k = heldKey(x.id, id);
    return heldKeys.has(k) ? [{ kind: 'held', id, name: src.out.name, from: holderTitle(src), at, par: parKeys.has(k) }] : [];
  });
  /** @type {Map<string, IoStatus>} */
  const m = new Map();
  /** Đầu ra ổn khi tính gộp cho bước: có nơi nhận đang nối, hay là đầu ra cuối chưa ai dùng. @param {any} o */
  const fine = (o) => !!use.get(o.id)?.live || (o.final && !use.has(o.id));
  /** @param {any} x @param {number} ins số đầu vào xét @param {InWhy[]} iw @param {any[]} outs @param {boolean} all bước: đầu ra
   * 'bad' khi không đầu ra nào ổn (`fine`) hay một đầu ra có nơi dùng treo; bước con: khi một đầu ra lỗi */
  const put = (x, ins, iw, outs, all) => {
    const ow = outWhy(outs);
    const bad = all ? !outs.some(fine) || ow.some((w) => w.kind === 'held') : ow.length > 0;
    m.set(x.id, {
      in: iw.length ? 'bad' : ins ? 'ok' : 'none',
      out: !outs.length ? 'none' : bad ? 'bad' : 'ok',
      inWhy: iw, outWhy: ow, finals: outs.filter((o) => o.final && !use.has(o.id)).map((o) => o.name),
    });
  };
  for (const step of ws.steps) {
    /* Bước hay bước con nhận từ chính bước hay bước con cùng bước: việc bên trong, không làm bước "có đầu vào"; lỗi thì vẫn
     * báo. (Bước nhận đầu ra của bước con của nó chỉ có khi dời bước con ấy vào bước: hộp sửa ghi "inside this step".) */
    const outside = [step, ...step.subs].flatMap((/** @type {any} */ s) => s.ins || []).filter((/** @type {string} */ id) => idx.get(id)?.step !== step).length;
    const iw = [...inWhy(step), ...step.subs.flatMap((/** @type {any} */ s) => inWhy(s, s.title))];
    put(step, outside, iw, [...(step.outs || []), ...step.subs.flatMap((/** @type {any} */ s) => s.outs || [])], true);
    for (const sub of step.subs) put(sub, (sub.ins || []).length, inWhy(sub), sub.outs || [], false);
  }
  return m;
}

/**
 * Trước khi xoá các chủ này: chụp đầu vào của nơi khác đang trỏ tới đầu ra của chúng. Xoá không gỡ đầu vào ấy (mất nguồn, bảng
 * báo lỗi); hàm trả về gắn lại chúng khi Hoàn tác, kể cả khi người dùng đã gỡ hay tab khác đã ghi đè dự án.
 * @param {any} ws @param {any[]} owners @returns {(w: any) => void}
 */
export function insBackup(ws, owners) {
  const ids = new Set(owners.flatMap((o) => (o.outs || []).map((/** @type {any} */ x) => x.id)));
  const saved = holders(ws).filter((hd) => !owners.includes(hd.h) && hd.h.ins.some((/** @type {string} */ id) => ids.has(id)))
    .map((hd) => /** @type {[string, string[]]} */ ([hd.h.id, [...hd.h.ins]]));
  /* Gắn lại theo thứ tự cũ; đầu vào khác đã gỡ trong lúc chờ thì thôi, đầu vào mới thêm thì giữ ở cuối. */
  return (w) => {
    const byId = new Map(holders(w).map((hd) => [hd.h.id, hd.h]));
    for (const [id, old] of saved) {
      const h = byId.get(id);
      if (h) h.ins = [...old.filter((x) => ids.has(x) || h.ins.includes(x)), ...h.ins.filter((/** @type {string} */ x) => !old.includes(x))];
    }
  };
}

/** Bên nhận các đầu ra của những chủ này (trừ chính chúng), không lặp, theo thứ tự trên bảng. @param {any} ws @param {any[]} owners */
export function consumersOf(ws, owners) {
  const own = new Set(owners);
  const ids = new Set(owners.flatMap((o) => (o.outs || []).map((/** @type {any} */ x) => x.id)));
  return holders(ws).filter((hd) => !own.has(hd.h) && (hd.h.ins || []).some((/** @type {string} */ id) => ids.has(id)));
}

/* Hộp sửa, trước khi Lưu: liên kết nào sẽ treo nếu mục đang sửa đứng ở chỗ đang chọn trong hộp (ô Bước / Vị trí). Tính trên
 * bản sao. kind 'sub': `place` là Place (tính khi đã nhấc nó ra); kind 'step': chỉ số khi đã nhấc ra. `place` null: giữ chỗ
 * hiện tại. `id` rỗng: mục mới (cần `place`). */
/** Bản sao các bước với mục đang sửa ở chỗ `place`, hay null. @param {{steps:any[]}} ws @param {'sub'|'step'} kind @param {string} id @param {any} place */
function placedCopy(ws, kind, id, place) {
  const c = { steps: JSON.parse(JSON.stringify(ws.steps)) };
  const DRAFT = '\u0000draft';
  /** @type {any} */ let h = null;
  if (kind === 'sub') {
    h = (id && c.steps.flatMap((/** @type {any} */ st) => st.subs).find((/** @type {any} */ x) => x.id === id)) || { id: DRAFT, outs: [], ins: [], par: false };
    if (h.id === DRAFT && !place) return null;
    if (place && placeSub(c, h, { ...place, at: Number.isFinite(place.at) ? place.at : Infinity }) === undefined) return null;
  } else {
    h = (id && c.steps.find((/** @type {any} */ st) => st.id === id)) || { id: DRAFT, outs: [], ins: [], subs: [] };
    if (place != null || h.id === DRAFT) {
      const i = c.steps.indexOf(h);
      if (i >= 0) c.steps.splice(i, 1);
      c.steps.splice(Math.max(0, Math.min(Number(place) || 0, c.steps.length)), 0, h);
    }
  }
  return { c, h };
}
/** Các đầu ra trong `outIds` sẽ là đầu vào treo của mục đang sửa (`held`), và phần treo vì cùng ô song song với bên giao (`par`).
 * @param {{steps:any[]}} ws @param {'sub'|'step'} kind @param {string} id @param {string[]} outIds @param {any} place
 * @returns {{held:Set<string>, par:Set<string>}} */
export function heldInfoAt(ws, kind, id, outIds, place) {
  const p = placedCopy(ws, kind, id, place);
  if (!p) return { held: new Set(), par: new Set() };
  p.h.ins = [...outIds];
  const hand = handoffs(p.c);
  const mine = hand.held.filter((l) => l.to.h === p.h);
  return { held: new Set(mine.map((l) => l.out.id)), par: new Set(mine.filter((l) => hand.parKeys.has(heldKey(l.to.h.id, l.out.id))).map((l) => l.out.id)) };
}
/** `handoffs` của cả dự án khi mục đang sửa đứng ở chỗ `place`, hay null. @param {{steps:any[]}} ws @param {'sub'|'step'} kind
 * @param {string} id @param {any} place */
export function handoffsAt(ws, kind, id, place) {
  const p = placedCopy(ws, kind, id, place);
  return p ? handoffs(p.c) : null;
}
