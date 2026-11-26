// @ts-check
/* Khung nhìn của sơ đồ System design (PLAN-031): toán thuần cho kéo và thu phóng, không DOM, chạy được trong Node.
 * Một khung nhìn là {x, y, k}: điểm (u, v) của sơ đồ hiện ở (u·k + x, v·k + y) trong khung (px, gốc ở góc trên trái).
 * DOM (bánh xe, kéo, chạm, phím, cụm nút): diagram-view.js. */

export const ZOOM_MIN = 0.25;          // thu nhỏ nhất
export const ZOOM_MAX = 3;             // phóng to nhất
export const ZOOM_STEP = 1.25;         // một lần bấm nút, phím + / -
export const WHEEL_ZOOM = 0.0025;      // mỗi px deltaY của Ctrl / ⌘ + bánh xe (pinch trên trackpad tới như thế)
export const PAN_STEP = 48;            // một lần bấm phím mũi tên, px
export const LINE_PX = 16;             // bánh xe tính theo dòng (deltaMode 1): một dòng chừng này px
export const KEEP = 48;                // kéo xa nhất: còn ít nhất chừng này px của sơ đồ trong khung
export const DRAG_SLOP = 4;            // px: dời ít hơn thì vẫn là bấm, không là kéo

/** Khung ban đầu: cỡ thật, góc trên trái. */
export const HOME = Object.freeze({ x: 0, y: 0, k: 1 });

/** @typedef {{x: number, y: number, k: number}} View */

/** @param {number} v @param {number} lo @param {number} hi */
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** @param {number} k */
export const clampZoom = (k) => clamp(Number.isFinite(k) ? k : 1, ZOOM_MIN, ZOOM_MAX);

/** @param {View} v */
export const isHome = (v) => v.x === HOME.x && v.y === HOME.y && v.k === HOME.k;

/** Thu phóng tới k quanh điểm (px, py) của khung: điểm của sơ đồ dưới đó đứng yên. @param {View} v @param {number} k @param {number} px @param {number} py @returns {View} */
export function zoomAt(v, k, px, py) {
  const k2 = clampZoom(k);
  const r = k2 / v.k;
  return { x: px - (px - v.x) * r, y: py - (py - v.y) * r, k: k2 };
}

/** Một lần Ctrl / ⌘ + bánh xe: deltaY âm là phóng to. @param {View} v @param {number} dy px @param {number} px @param {number} py */
export const wheelZoom = (v, dy, px, py) => zoomAt(v, v.k * Math.exp(-dy * WHEEL_ZOOM), px, py);

/** @param {View} v @param {number} dx @param {number} dy @returns {View} */
export const panBy = (v, dx, dy) => ({ x: v.x + dx, y: v.y + dy, k: v.k });

/** Đổi delta của bánh xe ra px. @param {number} d @param {number} mode deltaMode: 0 px, 1 dòng, 2 trang @param {number} page px của một trang */
export const wheelPx = (d, mode, page) => (mode === 1 ? d * LINE_PX : mode === 2 ? d * page : d);

/** Bánh xe trơn: cuộn dọc và ngang; Shift + bánh xe (chuột chỉ có deltaY) cuộn ngang. Trả độ dời của khung.
 * @param {number} dx @param {number} dy @param {boolean} shift @returns {[number, number]} */
export const wheelPan = (dx, dy, shift) => (shift && !dx ? [-dy, 0] : [-dx, -dy]);

/** Giữ sơ đồ (cw × ch ở k = 1) không trôi hẳn ra ngoài khung vw × vh: còn ít nhất KEEP px (hay cả sơ đồ, nếu nhỏ hơn).
 * @param {View} v @param {number} cw @param {number} ch @param {number} vw @param {number} vh @returns {View} */
export function clampPan(v, cw, ch, vw, vh) {
  const w = cw * v.k, h = ch * v.k;
  const kx = Math.min(KEEP, w, vw), ky = Math.min(KEEP, h, vh);
  return { x: clamp(v.x, kx - w, vw - kx), y: clamp(v.y, ky - h, vh - ky), k: v.k };
}

/** Vừa khung: sơ đồ cw × ch nằm giữa khung vw × vh, không phóng quá maxK. @returns {View} */
export function fit(/** @type {number} */ cw, /** @type {number} */ ch, /** @type {number} */ vw, /** @type {number} */ vh, maxK = 1) {
  if (!(cw > 0 && ch > 0 && vw > 0 && vh > 0)) return { ...HOME };
  const k = clampZoom(Math.min(vw / cw, vh / ch, maxK));
  return { x: (vw - cw * k) / 2, y: (vh - ch * k) / 2, k };
}

/** Hai ngón: từ khung lúc đặt ngón (v0), trung điểm và khoảng cách lúc đầu (m0, d0) và bây giờ (m, d).
 * Điểm của sơ đồ dưới trung điểm đầu đi theo trung điểm bây giờ; tỉ lệ theo khoảng cách hai ngón.
 * @param {View} v0 @param {{x: number, y: number}} m0 @param {number} d0 @param {{x: number, y: number}} m @param {number} d @returns {View} */
export function pinch(v0, m0, d0, m, d) {
  const k = clampZoom(v0.k * (d0 > 0 ? d / d0 : 1));
  const u = (m0.x - v0.x) / v0.k, w = (m0.y - v0.y) / v0.k;
  return { x: m.x - u * k, y: m.y - w * k, k };
}

/** Khung giữa a và b, t ∈ [0, 1] (về khung ban đầu có chuyển động). @param {View} a @param {View} b @param {number} t @returns {View} */
export function lerpView(a, b, t) {
  const s = clamp(t, 0, 1);
  return { x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s, k: a.k + (b.k - a.k) * s };
}

/** Phần trăm hiện trên nút. @param {number} k */
export const zoomPct = (k) => `${Math.round(k * 100)}%`;
