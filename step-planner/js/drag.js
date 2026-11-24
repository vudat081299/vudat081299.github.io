// @ts-check
/* Kéo thả bằng pointer events (chuột, chạm, bút) cho thẻ bước con và cho cả bước.
 *
 * - Chuột: nhấn trên thẻ (trừ nút, link) hay trên đầu bước rồi kéo quá vài px. Chạm: giữ thẻ một lúc rồi kéo; bước kéo bằng
 *   tay nắm `.step-grip`.
 * - Trong lúc kéo: bóng của thẻ đi theo ngón / con trỏ; chỗ thả là một ô viền đứt "Drop here" cỡ thẻ đang kéo, chen ngay vào
 *   hàng nên các thẻ khác trượt sang (FLIP; tắt khi prefers-reduced-motion). Không vẽ lại cả bảng; chỉ dời ô viền đứt.
 * - Vùng thả của thẻ: nửa trái / phải một ô = chen một ô mới trước / sau nó; phần dưới thẻ (hay giữa một ô song song) = nhập
 *   ô ấy, chạy song song. Chỗ ô viền đứt là chỗ sẽ thả.
 * - Esc huỷ; gần mép hàng thẻ thì hàng tự cuộn ngang, gần mép khung nhìn thì trang tự cuộn dọc.
 * Kết quả trả về qua onSub(id, Place) / onStep(id, index); bảng vẽ lại sau khi thả hay huỷ (onEnd). */

/** @typedef {{stepId:string, slot:number, join:boolean, at:number}} Place */

const MOVE_PX = 6;      // chuột: kéo quá chừng này mới tính là kéo
const PRESS_MS = 380;   // chạm: giữ chừng này thì bắt đầu kéo
const SLOP_PX = 8;      // chạm: ngón trôi quá chừng này trước khi đủ giờ thì là cuộn, không kéo
const EDGE_PX = 48;     // gần mép chừng này thì tự cuộn
const MAX_SPEED = 18;   // px mỗi khung hình

/**
 * @param {HTMLElement} board
 * @param {{ enabled: () => boolean, placeOf: (subId:string) => Place|null, onSub: (id:string, to:Place) => void,
 *   onStep: (id:string, index:number) => void, onEnd: () => void }} api
 */
export function initDrag(board, api) {
  /** @type {any} */
  let st = null;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dur = () => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--dur').trim();
    const n = parseFloat(v) || 0.16;
    return v.endsWith('ms') ? n : n * 1000;
  };
  const NOT_HANDLE = 'button:not([data-act="edit-sub"]):not([data-act="edit-step"]), a, summary, input, textarea, select, .more, details';

  board.addEventListener('pointerdown', (e) => {
    if (st || !api.enabled() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const t = /** @type {HTMLElement} */ (e.target);
    const grip = t.closest('.step-grip');
    const card = !grip && t.closest('.card[data-sub]');
    const head = !grip && !card && t.closest('.step-head');
    if (!grip && t.closest(NOT_HANDLE)) return;
    let kind = '', el = /** @type {HTMLElement|null} */ (null);
    if (card) { kind = 'sub'; el = /** @type {HTMLElement} */ (card); }
    else if (grip || (head && e.pointerType === 'mouse')) { kind = 'step'; el = /** @type {HTMLElement} */ (t.closest('.step[data-step]')); }
    if (!el) return;
    st = { kind, el, id: kind === 'sub' ? el.dataset.sub : el.dataset.step, pointerId: e.pointerId, type: e.pointerType,
      x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, active: false, timer: 0, raf: 0, target: null };
    /* Chạm trên thẻ: phải giữ yên một lúc (không thì là cuộn). Chuột, bút, tay nắm của bước: kéo ngay khi trôi đủ xa. */
    if (kind === 'sub' && e.pointerType === 'touch') st.timer = window.setTimeout(() => { if (st && !st.active) start(); }, PRESS_MS);
  });

  window.addEventListener('pointermove', (e) => {
    if (!st || e.pointerId !== st.pointerId) return;
    st.x = e.clientX; st.y = e.clientY;
    const far = Math.hypot(st.x - st.x0, st.y - st.y0);
    if (!st.active) {
      if (st.kind === 'sub' && st.type === 'touch') { if (far > SLOP_PX) reset(); return; }
      if (far > MOVE_PX) start(); else return;
    }
    e.preventDefault();
    update();
  }, { passive: false });
  /* Đang kéo bằng ngón: chặn cuộn trang của trình duyệt (touchmove phải là non-passive). */
  window.addEventListener('touchmove', (e) => { if (st && st.active) e.preventDefault(); }, { passive: false });
  board.addEventListener('contextmenu', (e) => { if (st) e.preventDefault(); });
  window.addEventListener('pointerup', (e) => {
    if (!st || e.pointerId !== st.pointerId) return;
    if (!st.active) { reset(); return; }
    /* Click sinh ra ngay sau khi thả (trên thẻ, tên thẻ) không được mở hộp sửa. */
    const eat = (/** @type {Event} */ ev) => { ev.stopPropagation(); ev.preventDefault(); };
    window.addEventListener('click', eat, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', eat, { capture: true }), 0);
    drop();
  });
  window.addEventListener('pointercancel', (e) => { if (st && e.pointerId === st.pointerId) cancel(); });
  window.addEventListener('blur', () => { if (st) cancel(); });
  document.addEventListener('keydown', (e) => {
    if (st && st.active && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); }
  }, true);

  function reset() {
    if (!st) return;
    clearTimeout(st.timer);
    cancelAnimationFrame(st.raf);
    st = null;
  }

  /* ── Bắt đầu: bóng, ô viền đứt ở đúng chỗ cũ, giấu thẻ gốc ── */
  function start() {
    const el = st.el;
    st.active = true;
    clearTimeout(st.timer);
    getSelection()?.removeAllRanges();
    document.body.classList.add('dragging-any');
    try { board.setPointerCapture(st.pointerId); } catch (e) { /* ngón đã nhấc */ }
    if (st.type === 'touch' && navigator.vibrate) navigator.vibrate(10);
    const src = st.kind === 'sub' ? el : /** @type {HTMLElement} */ (el.querySelector('.step-head'));
    const r = src.getBoundingClientRect();
    st.offX = st.x0 - r.left; st.offY = st.y0 - r.top;
    const ghost = /** @type {HTMLElement} */ (src.cloneNode(true));
    ghost.classList.add('drag-ghost');
    ghost.classList.remove('moved', 'swapped', 'open');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.style.width = r.width + 'px';
    if (st.kind === 'sub') ghost.style.height = r.height + 'px';
    document.body.append(ghost);
    st.ghost = ghost;
    st.ph = document.createElement('div');
    st.ph.className = st.kind === 'sub' ? 'drop-ph' : 'step-ph';
    const label = document.createElement('span');
    label.textContent = st.kind === 'sub' ? 'Drop here' : 'Drop the step here';
    st.ph.append(label);
    if (st.kind === 'sub') {
      st.ph.style.height = r.height + 'px';
      const slot = /** @type {HTMLElement} */ (el.closest('.slot'));
      st.srcSlot = slot.querySelectorAll('.card[data-sub]').length === 1 ? slot : null;
      (st.srcSlot || el).classList.add('drag-src');
      st.target = null;
      paint(api.placeOf(st.id), false);
    } else {
      el.classList.add('drag-src');
      el.before(st.ph);
      st.target = steps().indexOf(st.ph);
    }
    moveGhost();
    loop();
  }

  function moveGhost() {
    st.ghost.style.transform = `translate(${st.x - st.offX}px, ${st.y - st.offY}px)`;
  }

  /** Bóng theo con trỏ, tính lại chỗ thả (mỗi lần con trỏ đi và mỗi khung hình đang tự cuộn). */
  function update() {
    moveGhost();
    if (st.kind === 'sub') {
      const t = subTarget();
      if (t) paint(t, true);
    } else {
      const i = stepTarget();
      if (i !== null && i !== st.target) paintStep(i);
    }
  }
  /* Mỗi khung hình: tự cuộn gần mép rồi tính lại chỗ thả. */
  function loop() {
    if (!st || !st.active) return;
    const bar = document.querySelector('.bar');
    const top = (bar ? bar.getBoundingClientRect().bottom : 0) + EDGE_PX;
    const speed = (/** @type {number} */ d) => Math.ceil(Math.min(1, Math.max(0, d) / EDGE_PX) * MAX_SPEED);
    const y0 = scrollY;
    if (st.y < top) window.scrollBy(0, -speed(top - st.y));
    else if (st.y > innerHeight - EDGE_PX) window.scrollBy(0, speed(st.y - (innerHeight - EDGE_PX)));
    let moved = scrollY !== y0;
    if (st.kind === 'sub') {
      const sc = rowAt(st.y)?.querySelector('.cards-scroll');
      if (sc) {
        const r = sc.getBoundingClientRect(), x0 = sc.scrollLeft;
        if (st.x < r.left + EDGE_PX) sc.scrollLeft -= speed(r.left + EDGE_PX - st.x);
        else if (st.x > r.right - EDGE_PX) sc.scrollLeft += speed(st.x - (r.right - EDGE_PX));
        moved = moved || sc.scrollLeft !== x0;
      }
    }
    /* Con trỏ đứng yên thì không tính lại: ô viền đứt vừa chen vào làm thẻ dưới con trỏ đổi, tính lại sẽ nhảy qua lại. */
    if (moved) update();
    st.raf = requestAnimationFrame(loop);
  }

  const inside = (/** @type {DOMRect} */ r, /** @type {number} */ x, /** @type {number} */ y) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  const steps = () => /** @type {HTMLElement[]} */ ([...board.querySelectorAll(':scope > .step:not(.drag-src), :scope > .step-ph')]);
  /** Hàng (bước) dưới con trỏ theo chiều dọc. @param {number} y */
  const rowAt = (y) => /** @type {HTMLElement|undefined} */ ([...board.querySelectorAll(':scope > .step')].find((s) => {
    const r = s.getBoundingClientRect();
    return y >= r.top && y <= r.bottom;
  }));
  /** Các ô thật của một hàng (bỏ ô viền đứt, ô chỉ chứa thẻ đang kéo) và thẻ thật của từng ô. @param {HTMLElement} row */
  function slotsOf(row) {
    return [...row.querySelectorAll('.cards > .slot:not(.ph-slot):not(.drag-src)')].map((li) => ({
      li, cards: /** @type {HTMLElement[]} */ ([...li.querySelectorAll('.card[data-sub]:not(.drag-src)')]),
    })).filter((s) => s.cards.length);
  }

  /** Chỗ thả bước con dưới con trỏ, hoặc null = giữ chỗ cũ (đang ở trên ô viền đứt, hay ở khe giữa hai hàng). */
  function subTarget() {
    const { x, y } = st;
    if (st.ph.isConnected && inside(st.ph.getBoundingClientRect(), x, y)) return null;
    const row = rowAt(y);
    if (!row) return null;
    const stepId = /** @type {string} */ (row.dataset.step);
    const slots = slotsOf(row);
    const gap = 12;
    for (let i = 0; i < slots.length; i++) {
      const rs = slots[i].cards.map((c) => c.getBoundingClientRect());
      const left = Math.min(...rs.map((r) => r.left)), right = Math.max(...rs.map((r) => r.right));
      if (x > right + gap / 2) continue;
      const rel = (x - left) / (right - left);
      const mid = rel >= 0.2 && rel <= 0.8;
      if (slots[i].cards.length > 1 && mid) {
        const at = rs.filter((r) => r.top + r.height / 2 < y).length;
        return { stepId, slot: i, join: true, at };
      }
      if (slots[i].cards.length === 1 && mid && y > rs[0].top + rs[0].height * 0.6) return { stepId, slot: i, join: true, at: 1 };
      return { stepId, slot: rel < 0.5 ? i : i + 1, join: false, at: 0 };
    }
    return { stepId, slot: slots.length, join: false, at: 0 };
  }

  /** Chỉ số chỗ thả của bước (trong danh sách bước không có bước đang kéo), hoặc null = giữ chỗ cũ. */
  function stepTarget() {
    const { y } = st;
    if (inside(st.ph.getBoundingClientRect(), st.x, y)) return null;
    const rows = steps().filter((s) => s !== st.ph);
    const i = rows.findIndex((s) => { const r = s.getBoundingClientRect(); return y < r.top + r.height / 2; });
    return i < 0 ? rows.length : i;
  }

  /** Dời phần tử, rồi cho các thẻ / hàng khác trượt từ chỗ cũ tới chỗ mới (FLIP). @param {HTMLElement[]} els @param {() => void} mutate */
  function flip(els, mutate, animate = true) {
    const before = new Map(els.map((el) => [el, el.getBoundingClientRect()]));
    mutate();
    if (!animate || reduced()) return;
    const ms = dur();
    for (const [el, a] of before) {
      if (!el.isConnected) continue;
      const b = el.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: ms, easing: 'cubic-bezier(.2, .7, .2, 1)' });
    }
  }

  /** Đặt ô viền đứt vào chỗ `t` (nếu khác chỗ đang có). @param {Place|null} t @param {boolean} animate */
  function paint(t, animate) {
    if (!t || (st.target && JSON.stringify(t) === JSON.stringify(st.target))) return;
    const row = /** @type {HTMLElement|null} */ (board.querySelector(`.step[data-step="${t.stepId}"]`));
    if (!row) return;
    st.target = t;
    const rows = new Set([row, st.ph.closest('.step')].filter(Boolean));
    const cards = [...rows].flatMap((r) => /** @type {HTMLElement[]} */ ([...r.querySelectorAll('.card[data-sub]:not(.drag-src)')]));
    flip(cards, () => {
      const oldSlot = st.ph.closest('.ph-slot');
      st.ph.remove();
      if (oldSlot) oldSlot.remove();
      const slots = slotsOf(row);
      const ol = /** @type {HTMLElement} */ (row.querySelector('.cards'));
      if (t.join && slots[t.slot]) {
        const s = slots[t.slot];
        const ref = s.cards[t.at];
        if (ref) ref.before(st.ph); else s.cards[s.cards.length - 1].after(st.ph);
      } else {
        const li = document.createElement('li');
        li.className = 'slot ph-slot';
        li.append(st.ph);
        const ref = slots[t.slot];
        if (ref) ref.li.before(li); else ol.append(li);
      }
      st.ph.classList.toggle('join', !!t.join);
      /** @type {HTMLElement} */ (st.ph.firstChild).textContent = t.join ? 'Drop here: run in parallel' : 'Drop here';
      /* Ô nào đang có ≥ 2 thẻ (tính cả ô viền đứt) thì mang dáng ô song song. */
      for (const li of board.querySelectorAll('.cards > .slot')) {
        const n = li.querySelectorAll('.card[data-sub]:not(.drag-src), .drop-ph').length;
        li.classList.toggle('par', n > 1);
      }
    }, animate);
  }

  /** @param {number} i */
  function paintStep(i) {
    st.target = i;
    flip(/** @type {HTMLElement[]} */ ([...board.querySelectorAll(':scope > .step:not(.drag-src)')]), () => {
      const rows = steps().filter((s) => s !== st.ph);
      if (rows[i]) rows[i].before(st.ph); else (rows.length ? rows[rows.length - 1].after(st.ph) : board.append(st.ph));
    });
  }

  /* ── Kết thúc ── */
  function finish() {
    const s = st;
    st = null;
    cancelAnimationFrame(s.raf);
    s.ghost?.remove();
    document.body.classList.remove('dragging-any');
    return s;
  }
  function drop() {
    const s = st;
    cancelAnimationFrame(s.raf);
    const done = () => {
      finish();
      if (s.kind === 'sub' && s.target) api.onSub(s.id, s.target);
      else if (s.kind === 'step' && s.target !== null) api.onStep(s.id, s.target);
      else api.onEnd();
    };
    if (reduced() || !s.ph.isConnected) { done(); return; }
    /* Bóng bay vào ô viền đứt rồi mới vẽ lại. */
    const r = s.ph.getBoundingClientRect();
    const a = s.ghost.animate([{ transform: s.ghost.style.transform }, { transform: `translate(${r.left}px, ${r.top}px)` }],
      { duration: dur(), easing: 'cubic-bezier(.2, .7, .2, 1)', fill: 'forwards' });
    st = { ...s, active: false }; // chặn pointerdown mới trong lúc bay
    a.finished.then(done, done);
  }
  function cancel() {
    if (!st) return;
    if (!st.active) { reset(); return; }
    finish();
    api.onEnd();
  }
}
