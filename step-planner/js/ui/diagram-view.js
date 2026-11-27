// @ts-check
/* Sơ đồ System design như khung nhìn (PLAN-031): DOM của kéo và thu phóng. Toán thuần ở core/view-math.js.
 * - Ctrl / ⌘ + bánh xe (cả pinch của trackpad, tới như bánh xe có ctrlKey): thu phóng quanh con trỏ, luôn bắt.
 * - Bánh xe trơn, Shift + bánh xe: kéo khung, chỉ bắt khi chính khung có focus (đã bấm vào chỗ trống, hay Tab tới)
 *   hay đang giữ Space; còn lại trang cuộn như thường. Esc trả bánh xe cho trang. Như hộp cuộn: chỉ trục sơ đồ tràn khung,
 *   dừng ở mép sơ đồ; không dời được thì trang cuộn (wheelStep). Trục sơ đồ vừa khung luôn thấy trọn (clampPan).
 * - Giữ Space rồi kéo chuột, hay kéo bằng nút giữa: kéo khung. Kéo nút trái trơn không kéo khung (như Figma). Chạm: hai ngón thu phóng và kéo; một ngón kéo ngang, và kéo
 *   mọi hướng khi khung có focus (chưa thì một ngón dọc cuộn trang, CSS touch-action).
 * - Phím khi sơ đồ có focus: + / - thu phóng, 0 về khung ban đầu, mũi tên kéo, Esc trả bánh xe cho trang (focus về chính khung,
 *   không rơi về trang; bấm vào khung lần nữa thì bánh xe lại kéo khung).
 * - Space trên một nút, ô ngoài sơ đồ (Zoom in, Reset view…) là của nút ấy, kể cả khi con trỏ đang nằm trên sơ đồ.
 * - Kéo xong (kể cả nút trái trơn dời quá DRAG_SLOP) không tính là bấm: nút, đường nối dưới con trỏ không mở hộp.
 * Khung nhìn chỉ ở bộ nhớ của trang: vẽ lại sơ đồ giữ khung, tải lại trang về khung ban đầu.
 * Xuất: resetView, attach, focusFig, initDiagramView.
 * Dùng: core/view-math.js. */
import { DRAG_SLOP, HOME, PAN_STEP, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP, clampPan, clampZoom, panBy, pinch, wheelPan, wheelPx, wheelStep, wheelZoom, zoomAt, zoomPct } from '../core/view-math.js';
/** @typedef {import('../core/view-math.js').View} View */

/** @type {View} */
let view = { ...HOME };
/** @type {any} */ let fig = null;
/** @type {any} */ let ui = null;
/** @type {SVGSVGElement | null} */ let svgEl = null;
/** @type {SVGGElement | null} */ let cam = null;
let cw = 0, ch = 0;                       // cỡ sơ đồ ở tỉ lệ 1
let hover = false, spaceHeld = false, spaceUsed = false, suppress = false;
let released = false;                     // Esc: khung giữ focus mà bánh xe trả cho trang
/** @type {Map<number, {x: number, y: number}>} */
const pts = new Map();
/** Cử chỉ đang làm: kéo một điểm hay hai ngón; `moved` khi đã quá DRAG_SLOP. @type {any} */
let gest = null;
/** Nút trái trơn đang nhấn (không kéo khung): dời quá DRAG_SLOP thì nuốt cú bấm sau đó. @type {{id: number, x: number, y: number} | null} */
let press = null;
let onActivate = (/** @type {Element} */ _el) => {};

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const typing = (/** @type {any} */ el) => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
/* Bánh xe trơn kéo khung khi chính khung có focus (bấm vào chỗ trống của sơ đồ, hay Tab tới), không khi một nút có focus
 * (đóng hộp xong focus về nút: trang vẫn cuộn như thường). */
const active = () => spaceHeld || (!!fig && document.activeElement === fig && !released);
/** Thả bánh xe (Esc) hay bắt lại (bấm vào khung): viền đậm của khung chỉ khi bánh xe kéo khung. @param {boolean} v */
function release(v) {
  released = v;
  fig?.classList.toggle('is-free', v);
  hint();
}
/* Phần tử nhận Space của riêng nó (nút, ô, link, mục gập): Space ở đó không phải giữ để kéo sơ đồ. */
const CONTROL = 'button, input, select, textarea, a[href], summary, [contenteditable], [role="button"], [role="checkbox"], [role="radio"], [role="switch"], [role="option"], [role="tab"], [role="menuitem"]';
const box = () => (svgEl ? svgEl.getBoundingClientRect() : new DOMRect());

/** Đặt khung (kẹp tỉ lệ và độ dời), vẽ lại transform và số phần trăm. @param {View} v @param {boolean} [ease] */
function set(v, ease = false) {
  const r = box();
  view = clampPan({ x: v.x, y: v.y, k: clampZoom(v.k) }, cw, ch, r.width || cw, r.height || ch);
  paint(ease);
}

function paint(ease = false) {
  if (cam) {
    cam.classList.toggle('is-easing', ease && !reduced());
    cam.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.k})`;
  }
  if (ui) {
    const pct = zoomPct(view.k);
    ui.pct.textContent = pct;
    ui.pct.setAttribute('aria-label', `Zoom ${pct}. Reset to 100%`);
    ui.out.disabled = view.k <= ZOOM_MIN;
    ui.in.disabled = view.k >= ZOOM_MAX;
  }
}

/** Thu phóng quanh giữa khung. @param {number} k */
function zoomCenter(k) {
  const r = box();
  set(zoomAt(view, k, r.width / 2, r.height / 2), true);
}

/** Focus chính khung (không cuộn trang) mà bánh xe vẫn của trang: Esc trên nút của sơ đồ, đóng hộp mà nút mở hộp đã mất. */
export function focusFig() {
  if (!fig) return;
  if (document.activeElement !== fig) fig.focus({ preventScroll: true });
  release(true);
}

/** Về khung ban đầu (cỡ thật, góc trên trái); có chuyển động trừ khi người dùng giảm chuyển động. */
export function resetView(ease = true) {
  view = { ...HOME };
  paint(ease);
}

/** Sau mỗi lần vẽ sơ đồ: nhận <svg> mới (nhóm `.sd-cam` bên trong) và cỡ sơ đồ, đặt lại khung đang xem.
 * @param {SVGSVGElement | null} svg @param {number} w @param {number} h */
export function attach(svg, w, h) {
  svgEl = svg;
  cam = svg ? svg.querySelector('.sd-cam') : null;
  cw = w;
  ch = h;
  if (cam) set(view);
  if (ui) ui.bar.hidden = !svg;
}

function hint() {
  if (!ui) return;
  ui.hint.textContent = active() ? 'Scroll to pan · Ctrl + scroll to zoom · Esc to release' : 'Ctrl + scroll to zoom · click an empty spot, then scroll to pan';
}

/* ── Bánh xe ── */

function onWheel(/** @type {WheelEvent} */ e) {
  if (!cam) return;
  const r = box();
  const dx = wheelPx(e.deltaX, e.deltaMode, r.width), dy = wheelPx(e.deltaY, e.deltaMode, r.height);
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    set(wheelZoom(view, dy, e.clientX - r.left, e.clientY - r.top));
    return;
  }
  if (!active()) return;
  const [mx, my] = wheelPan(dx, dy, e.shiftKey);
  const next = wheelStep(view, mx, my, cw, ch, r.width || cw, r.height || ch);
  if (next === view) return;             // sơ đồ vừa khung hay đã tới mép: trang cuộn
  e.preventDefault();
  set(next);
}

/* ── Kéo: chuột (Space + nút trái, nút giữa), chạm, bút ── */

/** Bắt đầu lại cử chỉ từ các điểm đang chạm (đổi số ngón giữa chừng không làm khung nhảy). */
function regest() {
  const list = [...pts.values()];
  const moved = !!gest?.moved, mouse = !!gest?.mouse;
  if (!list.length) { gest = null; return; }
  if (list.length === 1) { gest = { mode: 'pan', v0: view, a: { ...list[0] }, moved, mouse }; return; }
  const [a, b] = list, r = box();
  gest = { mode: 'pinch', v0: view, m0: { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top }, d0: Math.hypot(a.x - b.x, a.y - b.y), moved, mouse };
}

function onDown(/** @type {PointerEvent} */ e) {
  if (!cam) return;
  const mouse = e.pointerType === 'mouse';
  if (!pts.size) suppress = false;       // cú bấm trước không tới (nút giữa không có click): đừng nuốt cú này
  if (mouse && !(e.button === 1 || (e.button === 0 && spaceHeld))) {
    press = e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY } : null;
    return;
  }
  if (mouse) {
    e.preventDefault();
    if (spaceHeld) spaceUsed = true;
    suppress = true;                      // Space + bấm không mở nút dưới con trỏ, kể cả khi không dời
  }
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  regest();
  if (mouse) startDrag(e);
}

/** @param {PointerEvent} e */
function startDrag(e) {
  if (!gest) return;
  gest.moved = true;
  gest.mouse = gest.mouse || e.pointerType === 'mouse';
  try { fig.setPointerCapture(e.pointerId); } catch { /* điểm đã nhả */ }
  fig.classList.add('is-panning');
}

function onMove(/** @type {PointerEvent} */ e) {
  if (press && press.id === e.pointerId && Math.hypot(e.clientX - press.x, e.clientY - press.y) >= DRAG_SLOP) {
    suppress = true;
    press = null;
  }
  const p = pts.get(e.pointerId);
  if (!p || !gest) return;
  p.x = e.clientX;
  p.y = e.clientY;
  if (gest.mode === 'pan') {
    const dx = p.x - gest.a.x, dy = p.y - gest.a.y;
    if (!gest.moved) {
      if (Math.hypot(dx, dy) < DRAG_SLOP) return;
      startDrag(e);
    }
    set(panBy(gest.v0, dx, dy));
    return;
  }
  const [a, b] = [...pts.values()], r = box();
  if (!gest.moved) startDrag(e);
  set(pinch(gest.v0, gest.m0, gest.d0, { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top }, Math.hypot(a.x - b.x, a.y - b.y)));
}

function onUp(/** @type {PointerEvent} */ e) {
  if (press?.id === e.pointerId) press = null;
  if (!pts.delete(e.pointerId)) return;
  if (gest?.moved) suppress = true;
  regest();
  if (!pts.size) fig.classList.remove('is-panning');
}

/* ── Phím ── */

function onKey(/** @type {KeyboardEvent} */ e) {
  if (e.altKey || e.ctrlKey || e.metaKey || !cam || typing(e.target)) return;
  const step = PAN_STEP;
  /** @type {Record<string, () => void>} */
  const acts = {
    '+': () => zoomCenter(view.k * ZOOM_STEP), '=': () => zoomCenter(view.k * ZOOM_STEP),
    '-': () => zoomCenter(view.k / ZOOM_STEP), _: () => zoomCenter(view.k / ZOOM_STEP),
    0: () => resetView(),
    ArrowLeft: () => set(panBy(view, step, 0), true), ArrowRight: () => set(panBy(view, -step, 0), true),
    ArrowUp: () => set(panBy(view, 0, step), true), ArrowDown: () => set(panBy(view, 0, -step), true),
    /* Nút, nhãn của sơ đồ có focus: về chính khung (không rơi về <body>), và trả bánh xe cho trang. */
    Escape: () => focusFig(),
  };
  const f = acts[e.key];
  if (!f) return;
  e.preventDefault();
  f();
}

/** Space: giữ để kéo khi con trỏ trên sơ đồ hay sơ đồ có focus (trừ khi đang gõ chữ, hay có hộp mở). Thả mà chưa kéo, trên
 * nút của sơ đồ có focus: bấm nút đó (như nút thường); nút ngoài sơ đồ không nhận Space ấy. */
function onSpace(/** @type {KeyboardEvent} */ e) {
  if (e.code !== 'Space' && e.key !== ' ') return;
  const el = /** @type {any} */ (document.activeElement);
  const mine = fig.contains(el);
  if (e.type === 'keydown') {
    if (spaceHeld) { e.preventDefault(); return; }
    if (!cam || typing(el) || document.querySelector('dialog[open]')) return;
    if (!mine && (!hover || (el && el !== document.body && el.matches(CONTROL)))) return;
    e.preventDefault();
    spaceHeld = true;
    spaceUsed = false;
    fig.classList.add('is-grab');
    hint();
    return;
  }
  if (!spaceHeld) return;
  e.preventDefault();
  spaceHeld = false;
  fig.classList.remove('is-grab');
  hint();
  if (!spaceUsed && mine && el !== fig) onActivate(el);
}

function dropSpace() {
  spaceHeld = false;
  fig?.classList.remove('is-grab', 'is-panning');
  pts.clear();
  gest = null;
}

/** Gắn sự kiện một lần. `activate`: việc của Space thả trên một nút của sơ đồ (Enter vẫn do design.js lo).
 * @param {{fig: HTMLElement, bar: HTMLElement, out: HTMLButtonElement, in: HTMLButtonElement, pct: HTMLButtonElement, reset: HTMLButtonElement, hint: HTMLElement, activate: (el: Element) => void}} o */
export function initDiagramView(o) {
  fig = o.fig;
  ui = o;
  onActivate = o.activate;
  fig.addEventListener('wheel', onWheel, { passive: false });
  fig.addEventListener('pointerdown', onDown);
  fig.addEventListener('pointermove', onMove);
  fig.addEventListener('pointerup', onUp);
  fig.addEventListener('pointercancel', onUp);
  /* Mất bắt của chính khung (không phải bắt ngầm của nút dưới ngón, nổi lên tới đây) thì coi như nhả. */
  fig.addEventListener('lostpointercapture', (/** @type {PointerEvent} */ e) => { if (e.target === fig && pts.has(e.pointerId)) onUp(e); });
  /* Nút giữa: chặn cuộn tự động của trình duyệt. */
  fig.addEventListener('mousedown', (/** @type {MouseEvent} */ e) => { if (e.button === 1) e.preventDefault(); });
  fig.addEventListener('auxclick', (/** @type {MouseEvent} */ e) => { if (e.button === 1) e.preventDefault(); });
  /* Kéo xong: nuốt cú bấm ngay sau, trước khi tới nút / đường nối (pha bắt, trên chính khung). */
  fig.addEventListener('click', (/** @type {MouseEvent} */ e) => {
    if (!suppress) return;
    suppress = false;
    e.stopPropagation();
    e.preventDefault();
  }, true);
  fig.addEventListener('pointerenter', () => { hover = true; });
  fig.addEventListener('pointerleave', () => { hover = false; });
  fig.addEventListener('keydown', onKey);
  fig.addEventListener('focus', hint);
  fig.addEventListener('blur', () => release(false));
  /* Bấm vào khung (kể cả khi đã có focus, nên không có sự kiện focus): bánh xe lại kéo khung. */
  fig.addEventListener('pointerdown', () => { if (released) release(false); });
  addEventListener('keydown', onSpace);
  addEventListener('keyup', onSpace);
  addEventListener('blur', dropSpace);
  o.out.addEventListener('click', () => zoomCenter(view.k / ZOOM_STEP));
  o.in.addEventListener('click', () => zoomCenter(view.k * ZOOM_STEP));
  o.pct.addEventListener('click', () => zoomCenter(1));
  o.reset.addEventListener('click', () => resetView());
  hint();
  paint();
}
