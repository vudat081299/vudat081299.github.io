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
 * Kết quả trả về qua onSub(id, Place) / onStep(id, index); bảng vẽ lại sau khi thả hay huỷ (onEnd).
 * - Một lần kéo qua ba pha: `press` (đã nhấn, chưa kéo), `drag`, `fly` (đã thả, bóng bay vào chỗ). Chỉ một bóng tồn tại.
 * - Mỗi khung hình làm việc một lần (loop): pointermove chỉ ghi toạ độ. Toạ độ hàng, ô, thẻ đo một lần rồi nhớ (theo toạ độ
 *   trang và toạ độ trong hàng cuộn, nên cuộn không làm cũ); đo lại khi ô viền đứt đổi chỗ, ngay sau khi dàn trang, trước
 *   khi FLIP chạy. Tấm phủ trong suốt giữ con trỏ "grabbing" (không đổi kiểu cả bảng); chặn mousemove để không bôi chữ.
 *   Mọi đường kết thúc (thả, Esc, pointercancel, mất pointer capture, rời cửa sổ, nút đã nhả mà pointerup bị nuốt, abort)
 *   qua cleanup: gỡ bóng, ô viền đứt, lớp drag-src, dừng mọi animation của lần kéo ấy. */

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
      x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, phase: 'press', timer: 0, raf: 0, target: null, anims: [] };
    /* Chạm trên thẻ: phải giữ yên một lúc (không thì là cuộn). Chuột, bút, tay nắm của bước: kéo ngay khi trôi đủ xa. */
    if (kind === 'sub' && e.pointerType === 'touch') st.timer = window.setTimeout(() => { if (st && st.phase === 'press') start(); }, PRESS_MS);
  });

  window.addEventListener('pointermove', (e) => {
    if (!st || st.phase === 'fly' || e.pointerId !== st.pointerId) return;
    /* Không còn nút nào nhấn (nhả ngoài cửa sổ, pointerup bị nuốt): kết thúc như khi nhả, không kéo tiếp. */
    if (e.buttons === 0) { if (st.phase === 'drag') endAt(e); else reset(); return; }
    st.x = e.clientX; st.y = e.clientY;
    if (st.phase === 'press') {
      const far = Math.hypot(st.x - st.x0, st.y - st.y0);
      if (st.kind === 'sub' && st.type === 'touch') { if (far > SLOP_PX) reset(); return; }
      if (far > MOVE_PX) start(); else return;
    }
    e.preventDefault();
    st.dirty = true; // khung hình kế dời bóng, tính lại chỗ thả
  }, { passive: false });
  /* Đang kéo bằng chuột: chặn mousemove để trình duyệt không kéo dài vùng bôi chữ (thay cho user-select trên body, vốn bắt
     tính lại kiểu của cả bảng). */
  window.addEventListener('mousemove', (e) => { if (st && st.phase !== 'press') e.preventDefault(); }, { capture: true, passive: false });
  /* Đang kéo bằng ngón: chặn cuộn trang của trình duyệt (touchmove phải là non-passive). */
  window.addEventListener('touchmove', (e) => { if (st && st.phase !== 'press') e.preventDefault(); }, { passive: false });
  board.addEventListener('contextmenu', (e) => { if (st) e.preventDefault(); });
  window.addEventListener('pointerup', (e) => {
    if (!st || st.phase === 'fly' || e.pointerId !== st.pointerId) return;
    if (st.phase === 'press') { reset(); return; }
    endAt(e);
  });
  window.addEventListener('pointercancel', (e) => { if (st && e.pointerId === st.pointerId) cancel(); });
  board.addEventListener('lostpointercapture', (e) => { if (st && st.phase === 'drag' && e.pointerId === st.pointerId) cancel(); });
  window.addEventListener('blur', () => cancel());
  /* Đang kéo: Esc huỷ; phím khác (Ctrl+Z, Alt + mũi tên…) bị chặn để bảng không đổi dưới tay. */
  document.addEventListener('keydown', (e) => {
    if (!st || st.phase === 'press') return;
    e.preventDefault(); e.stopPropagation();
    if (e.key === 'Escape') cancel();
  }, true);

  /** Nhả: click sinh ra ngay sau đó (trên thẻ, tên thẻ) không được mở hộp sửa. @param {PointerEvent} e */
  function endAt(e) {
    st.x = e.clientX; st.y = e.clientY;
    update(); // chỗ thả theo đúng điểm nhả, không chờ khung hình
    const eat = (/** @type {Event} */ ev) => { ev.stopPropagation(); ev.preventDefault(); };
    window.addEventListener('click', eat, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', eat, { capture: true }), 0);
    drop();
  }

  /** Mới nhấn, chưa kéo: quên lần nhấn. */
  function reset() {
    if (!st) return;
    clearTimeout(st.timer);
    st = null;
  }

  /* ── Bắt đầu: bóng, ô viền đứt ở đúng chỗ cũ, giấu thẻ gốc ── */
  function start() {
    const el = st.el;
    st.phase = 'drag';
    clearTimeout(st.timer);
    getSelection()?.removeAllRanges();
    document.body.classList.add('dragging-any');
    st.cover = document.createElement('div');
    st.cover.className = 'drag-cover';
    document.body.append(st.cover);
    try { board.setPointerCapture(st.pointerId); } catch (e) { /* ngón đã nhấc */ }
    if (st.type === 'touch' && navigator.vibrate) navigator.vibrate(10);
    const src = st.kind === 'sub' ? el : /** @type {HTMLElement} */ (el.querySelector('.step-head'));
    const r = src.getBoundingClientRect();
    st.offX = st.x0 - r.left; st.offY = st.y0 - r.top;
    /* Chỉ một bóng: bóng sót (nếu có) bị gỡ trước. Bản sao bỏ id và khoá dữ liệu (không truy vấn nào của main.js chạm tới
       nó), bỏ nút "Show more" (bóng chỉ để nhìn). */
    for (const g of document.querySelectorAll('.drag-ghost')) g.remove();
    const ghost = /** @type {HTMLElement} */ (src.cloneNode(true));
    for (const n of [ghost, ...ghost.querySelectorAll('[id], [data-sub], [data-step]')]) {
      n.removeAttribute('id'); n.removeAttribute('data-sub'); n.removeAttribute('data-step');
    }
    for (const n of ghost.querySelectorAll('.more')) n.remove();
    ghost.classList.add('drag-ghost');
    ghost.classList.remove('moved', 'swapped', 'open', 'drag-src');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.inert = true;
    ghost.style.width = r.width + 'px';
    if (st.kind === 'sub') ghost.style.height = r.height + 'px';
    document.body.append(ghost);
    st.rows = null; st.slots = new Map(); st.touched = new Set(); st.mids = null; st.sy = NaN;
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
    st.ghost.style.transform = `translate3d(${st.x - st.offX}px, ${st.y - st.offY}px, 0)`;
  }

  /** Tính lại chỗ thả (con trỏ vừa đi, hay đang tự cuộn) rồi dời bóng: đọc toạ độ trước, ghi sau. */
  function update() {
    if (st.kind === 'sub') {
      const t = subTarget();
      if (t) paint(t, true);
    } else {
      const i = stepTarget();
      if (i !== null && i !== st.target) paintStep(i);
    }
    moveGhost();
  }
  const speed = (/** @type {number} */ d) => Math.ceil(Math.min(1, Math.max(0, d) / EDGE_PX) * MAX_SPEED);
  /* Mỗi khung hình: tự cuộn gần mép, rồi tính lại chỗ thả nếu con trỏ đã đi hay trang / hàng đã cuộn. */
  function loop() {
    if (!st || st.phase !== 'drag') return;
    if (st.sy !== scrollY) {
      const bar = document.querySelector('.bar');
      st.top = (bar ? bar.getBoundingClientRect().bottom : 0) + EDGE_PX; // thanh trên dính đầu trang: chỉ đổi khi trang cuộn
      st.sy = scrollY;
    }
    const y0 = scrollY;
    if (st.y < st.top) window.scrollBy(0, -speed(st.top - st.y));
    else if (st.y > innerHeight - EDGE_PX) window.scrollBy(0, speed(st.y - (innerHeight - EDGE_PX)));
    let moved = scrollY !== y0;
    if (st.kind === 'sub') {
      const g = rowAt(st.y);
      if (g && g.sc) {
        const sc = g.sc, x0 = sc.scrollLeft;
        if (st.x < g.left + EDGE_PX) sc.scrollLeft -= speed(g.left + EDGE_PX - st.x);
        else if (st.x > g.right - EDGE_PX) sc.scrollLeft += speed(st.x - (g.right - EDGE_PX));
        moved = moved || sc.scrollLeft !== x0;
      }
    }
    /* Con trỏ đứng yên thì không tính lại: ô viền đứt vừa chen vào làm thẻ dưới con trỏ đổi, tính lại sẽ nhảy qua lại. */
    if (moved || st.dirty) update();
    st.dirty = false;
    const sel = getSelection();
    if (sel && sel.rangeCount && !sel.isCollapsed) sel.removeAllRanges(); // trình duyệt vẫn kéo dài vùng bôi dù đã chặn mousemove
    st.raf = requestAnimationFrame(loop);
  }

  /** Hộp theo toạ độ đã nhớ: x trong hàng cuộn (cộng scrollLeft của nó), y theo trang (cộng scrollY).
   * @typedef {{l:number, r:number, t:number, b:number}} Box */
  /** @param {Element} el @param {Element|null} sc @returns {Box} */
  const boxOf = (el, sc) => {
    const r = el.getBoundingClientRect(), dx = sc ? sc.scrollLeft : 0;
    return { l: r.left + dx, r: r.right + dx, t: r.top + scrollY, b: r.bottom + scrollY };
  };
  /** @param {Box} b @param {Element|null} sc @param {number} x @param {number} y */
  const inBox = (b, sc, x, y) => {
    const px = x + (sc ? sc.scrollLeft : 0), py = y + scrollY;
    return px >= b.l && px <= b.r && py >= b.t && py <= b.b;
  };
  const steps = () => /** @type {HTMLElement[]} */ ([...board.querySelectorAll(':scope > .step:not(.drag-src), :scope > .step-ph')]);
  /** Mọi hàng: đỉnh, đáy theo trang; hàng thẻ cuộn và mép trái / phải của nó (trang không cuộn ngang). Đo một lần, nhớ tới
   * khi ô viền đứt đổi chỗ. */
  function rowsGeo() {
    if (!st.rows) {
      st.rows = [...board.querySelectorAll(':scope > .step')].map((el) => {
        const r = el.getBoundingClientRect();
        const sc = el.querySelector('.cards-scroll');
        const sr = sc ? sc.getBoundingClientRect() : r;
        return { el: /** @type {HTMLElement} */ (el), t: r.top + scrollY, b: r.bottom + scrollY, sc, left: sr.left, right: sr.right };
      });
    }
    return st.rows;
  }
  /** Hàng (bước) dưới con trỏ theo chiều dọc. @param {number} y */
  const rowAt = (y) => rowsGeo().find((g) => y + scrollY >= g.t && y + scrollY <= g.b);
  /** Các ô thật của một hàng (bỏ ô viền đứt, ô chỉ chứa thẻ đang kéo) và thẻ thật của từng ô. @param {HTMLElement} row */
  function slotsOf(row) {
    return [...row.querySelectorAll('.cards > .slot:not(.ph-slot):not(.drag-src)')].map((li) => ({
      li, cards: /** @type {HTMLElement[]} */ ([...li.querySelectorAll('.card[data-sub]:not(.drag-src)')]),
    })).filter((s) => s.cards.length);
  }
  /** Ô của hàng kèm hộp của từng thẻ, đo một lần. @param {HTMLElement} row */
  function slotGeo(row) {
    let g = st.slots.get(row);
    if (!g) {
      const sc = row.querySelector('.cards-scroll');
      g = { sc, slots: slotsOf(row).map((s) => ({ ...s, boxes: s.cards.map((c) => boxOf(c, sc)) })) };
      st.slots.set(row, g);
    }
    return g;
  }

  /** Chỗ thả bước con dưới con trỏ, hoặc null = giữ chỗ cũ (đang ở trên ô viền đứt, hay ở khe giữa hai hàng). */
  function subTarget() {
    const { x, y } = st;
    if (st.ph.isConnected && st.phBox && inBox(st.phBox, st.phSc, x, y)) return null;
    const g = rowAt(y);
    if (!g) return null;
    const row = g.el;
    const stepId = /** @type {string} */ (row.dataset.step);
    const { sc, slots } = slotGeo(row);
    const dx = sc ? sc.scrollLeft : 0, sy = scrollY;
    const gap = 12;
    for (let i = 0; i < slots.length; i++) {
      const rs = slots[i].boxes.map((b) => ({ left: b.l - dx, right: b.r - dx, top: b.t - sy, height: b.b - b.t }));
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
    if (!st.mids) measureSteps();
    if (inBox(st.phBox, null, st.x, y)) return null;
    const py = y + scrollY;
    const i = st.mids.findIndex((/** @type {number} */ m) => py < m);
    return i < 0 ? st.mids.length : i;
  }
  /** Giữa của từng bước (không tính bước đang kéo) và hộp chỗ thả, theo trang. */
  function measureSteps() {
    st.mids = steps().filter((s) => s !== st.ph).map((s) => { const b = boxOf(s, null); return (b.t + b.b) / 2; });
    st.phBox = boxOf(st.ph, null);
  }

  /** Dời phần tử, rồi cho các thẻ / hàng khác trượt từ chỗ cũ tới chỗ mới (FLIP). Đọc chỗ cũ, ghi (mutate), dừng lượt trượt
   * cũ của chính các phần tử ấy, rồi `laid` đo bố cục mới khi chưa có transform nào, cuối cùng mới chạy lượt trượt mới.
   * @param {HTMLElement[]} els @param {() => void} mutate @param {() => void} laid */
  function flip(els, mutate, laid, animate = true) {
    animate = animate && !reduced();
    const before = animate ? els.map((el) => el.getBoundingClientRect()) : [];
    mutate();
    const mine = new Set(els);
    st.anims = st.anims.filter((/** @type {Animation} */ a) => {
      if (a.playState !== 'running') return false;
      if (!mine.has(/** @type {any} */ (a.effect)?.target)) return true;
      a.cancel();
      return false;
    });
    laid();
    if (!animate) return;
    st.ms ??= dur();
    const after = els.map((el) => (el.isConnected ? el.getBoundingClientRect() : null)); // đọc hết rồi mới chạy lượt trượt
    els.forEach((el, k) => {
      const a = before[k], b = after[k];
      if (!b) return;
      const dx = a.left - b.left, dy = a.top - b.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      st.anims.push(el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: st.ms, easing: 'cubic-bezier(.2, .7, .2, 1)' }));
    });
  }

  /** Đặt ô viền đứt vào chỗ `t` (nếu khác chỗ đang có). @param {Place|null} t @param {boolean} animate */
  function paint(t, animate) {
    if (!t || (st.target && JSON.stringify(t) === JSON.stringify(st.target))) return;
    const row = /** @type {HTMLElement|null} */ (board.querySelector(`.step[data-step="${t.stepId}"]`));
    if (!row) return;
    st.target = t;
    const rows = /** @type {Set<HTMLElement>} */ (new Set([row, st.ph.closest('.step')].filter(Boolean)));
    for (const r of rows) st.touched.add(r);
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
      /* Ô nào đang có ≥ 2 thẻ (tính cả ô viền đứt) thì mang dáng ô song song. Chỉ hai hàng vừa đổi. */
      for (const r of rows) {
        for (const li of r.querySelectorAll('.cards > .slot')) {
          const n = li.querySelectorAll('.card[data-sub]:not(.drag-src), .drop-ph').length;
          li.classList.toggle('par', n > 1);
        }
      }
    }, () => {
      /* Bố cục mới, chưa trượt: đo lại hàng (cao có thể đổi), ô và thẻ của hai hàng vừa đổi, hộp ô viền đứt. */
      st.rows = null;
      st.slots = new Map();
      for (const r of rows) slotGeo(r);
      st.phSc = st.ph.closest('.cards-scroll');
      st.phBox = boxOf(st.ph, st.phSc);
    }, animate);
  }

  /** @param {number} i */
  function paintStep(i) {
    st.target = i;
    flip(/** @type {HTMLElement[]} */ ([...board.querySelectorAll(':scope > .step:not(.drag-src)')]), () => {
      const rows = steps().filter((s) => s !== st.ph);
      if (rows[i]) rows[i].before(st.ph); else (rows.length ? rows[rows.length - 1].after(st.ph) : board.append(st.ph));
    }, measureSteps);
  }

  /* ── Kết thúc: mọi đường qua cleanup(s), s là đúng lần kéo ấy, nên lần kéo cũ không đụng được lần kéo mới ── */
  /** @param {any} s */
  function cleanup(s) {
    if (st === s) st = null;
    clearTimeout(s.timer);
    clearTimeout(s.flyTimer);
    cancelAnimationFrame(s.raf);
    for (const a of s.anims) a.cancel();
    s.ghost?.remove();
    s.cover?.remove();
    s.ph?.closest('.ph-slot')?.remove();
    s.ph?.remove();
    for (const n of board.querySelectorAll('.drag-src')) n.classList.remove('drag-src');
    /* Bảng chỉ vẽ lại hàng đổi dữ liệu: trả dáng ô song song mà paint() đã đổi về đúng số thẻ thật của từng ô. */
    for (const r of s.touched || []) {
      for (const li of r.querySelectorAll('.cards > .slot')) li.classList.toggle('par', li.querySelectorAll('.card[data-sub]').length > 1);
    }
    document.body.classList.remove('dragging-any');
  }
  function drop() {
    const s = st;
    s.phase = 'fly'; // trong lúc bay: bỏ qua pointerdown, pointermove, pointerup
    cancelAnimationFrame(s.raf);
    let once = false;
    const done = () => {
      if (once) return;
      once = true;
      cleanup(s);
      if (s.kind === 'sub' && s.target) api.onSub(s.id, s.target);
      else if (s.kind === 'step' && s.target !== null) api.onStep(s.id, s.target);
      else api.onEnd();
    };
    if (reduced() || !s.ph.isConnected) { done(); return; }
    /* Bóng bay vào ô viền đứt rồi mới vẽ lại. Hẹn giờ dự phòng: tab ẩn thì animation có thể không chạy tới cuối. */
    const r = s.ph.getBoundingClientRect();
    const a = s.ghost.animate([{ transform: s.ghost.style.transform }, { transform: `translate(${r.left}px, ${r.top}px)` }],
      { duration: dur(), easing: 'cubic-bezier(.2, .7, .2, 1)', fill: 'forwards' });
    s.anims.push(a);
    a.finished.then(done, done);
    s.flyTimer = window.setTimeout(done, dur() + 250);
  }
  /** Huỷ: mới nhấn thì quên lần nhấn; đang kéo thì trả mọi thứ về rồi vẽ lại; đang bay thì để nó tự xong. */
  function cancel() {
    if (!st) return;
    if (st.phase === 'press') { reset(); return; }
    if (st.phase === 'fly') return;
    cleanup(st);
    api.onEnd();
  }

  return {
    /** Bảng sắp vẽ lại từ chỗ khác (tab khác ghi đè dữ liệu…): dọn lần kéo, không gọi onEnd / onSub. */
    abort() {
      if (!st) return;
      if (st.phase === 'press') reset(); else cleanup(st);
    },
  };
}
