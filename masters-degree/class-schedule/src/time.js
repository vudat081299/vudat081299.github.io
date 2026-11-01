// @ts-check
// Ngày giờ theo Asia/Ho_Chi_Minh, bất kể máy người xem đặt múi giờ nào.
// Ngày lịch là chuỗi "YYYY-MM-DD" (DateKey); thời điểm tuyệt đối là mili giây epoch.

export const TIME_ZONE = 'Asia/Ho_Chi_Minh';
const OFFSET_HOURS = 7; // Việt Nam không có giờ mùa hè.
const DAY_MS = 86400000;

/** @typedef {string} DateKey  "YYYY-MM-DD" */

const WEEKDAY_LONG = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/** @param {number} n */
const pad = (n) => String(n).padStart(2, '0');

/** @param {DateKey} key @returns {{y:number,m:number,d:number}} */
export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
}

/** @param {number} y @param {number} m 1–12 @param {number} d @returns {DateKey} */
export function makeKey(y, m, d) {
  const t = new Date(Date.UTC(y, m - 1, d));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** @param {DateKey} key */
function keyToUtcMs(key) {
  const { y, m, d } = parseKey(key);
  return Date.UTC(y, m - 1, d);
}

/** @param {DateKey} key @param {number} days @returns {DateKey} */
export function addDays(key, days) {
  const { y, m, d } = parseKey(key);
  return makeKey(y, m, d + days);
}

/** @param {DateKey} key @param {number} months @returns {DateKey} ngày 1 của tháng đích */
export function addMonths(key, months) {
  const { y, m } = parseKey(key);
  return makeKey(y, m + months, 1);
}

/** @param {DateKey} a @param {DateKey} b @returns {number} b − a, tính bằng ngày */
export function diffDays(a, b) {
  return Math.round((keyToUtcMs(b) - keyToUtcMs(a)) / DAY_MS);
}

/** @param {DateKey} key @returns {number} 0 = Chủ Nhật … 6 = Thứ Bảy */
export function weekday(key) {
  return new Date(keyToUtcMs(key)).getUTCDay();
}

/** Thứ Hai của tuần chứa `key` (tuần bắt đầu từ Thứ Hai). @param {DateKey} key */
export function startOfWeek(key) {
  return addDays(key, -((weekday(key) + 6) % 7));
}

/** @param {DateKey} key */
export function startOfMonth(key) {
  const { y, m } = parseKey(key);
  return makeKey(y, m, 1);
}

/** @param {DateKey} key */
export function daysInMonth(key) {
  const { y, m } = parseKey(key);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Thời điểm tuyệt đối của một giờ "HH:MM" giờ Việt Nam trong ngày `key`. @param {DateKey} key @param {string} hhmm */
export function instant(key, hhmm) {
  const { y, m, d } = parseKey(key);
  const [h, min] = hhmm.split(':').map(Number);
  return Date.UTC(y, m - 1, d, h - OFFSET_HOURS, min);
}

/** @param {string} hhmm @returns {number} phút tính từ 00:00 */
export function minutesOf(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Ngày và phút hiện tại theo giờ Việt Nam. @param {number} [ms] */
export function vnNow(ms = Date.now()) {
  const t = new Date(ms + OFFSET_HOURS * 3600000);
  return {
    ms,
    key: `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`,
    minutes: t.getUTCHours() * 60 + t.getUTCMinutes(),
  };
}

/** @param {DateKey} key @returns {string} DD/MM/YYYY */
export function fmtDate(key) {
  const { y, m, d } = parseKey(key);
  return `${pad(d)}/${pad(m)}/${y}`;
}

/** @param {DateKey} key @returns {string} DD/MM */
export function fmtDayMonth(key) {
  const { m, d } = parseKey(key);
  return `${pad(d)}/${pad(m)}`;
}

/** @param {DateKey} key */
export function weekdayLong(key) {
  return WEEKDAY_LONG[weekday(key)];
}

/** @param {number} wd 0–6 */
export function weekdayName(wd) {
  return WEEKDAY_LONG[wd];
}

/** @param {DateKey} key */
export function weekdayShort(key) {
  return WEEKDAY_SHORT[weekday(key)];
}

/** Nhãn cột cho tuần bắt đầu từ Thứ Hai. */
export const WEEK_HEADERS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/** @param {DateKey} key @returns {string} "Tháng 11, 2026" */
export function fmtMonthTitle(key) {
  const { y, m } = parseKey(key);
  return `Tháng ${m}, ${y}`;
}

/** @param {DateKey} weekStart @param {boolean} [compact] "16–22/11/2026" khi cùng tháng */
export function fmtWeekRange(weekStart, compact = false) {
  const end = addDays(weekStart, 6);
  if (compact && weekStart.slice(0, 7) === end.slice(0, 7)) return `${parseKey(weekStart).d}–${fmtDate(end)}`;
  return `${fmtDayMonth(weekStart)} – ${fmtDate(end)}`;
}

/**
 * Khoảng thời gian còn lại, hai đơn vị lớn nhất: "3 ngày 4 giờ", "2 giờ 15 phút", "8 phút".
 * @param {number} ms
 */
export function fmtDuration(ms) {
  const totalMin = Math.max(0, Math.ceil(ms / 60000));
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days > 0) return hours > 0 ? `${days} ngày ${hours} giờ` : `${days} ngày`;
  if (hours > 0) return mins > 0 ? `${hours} giờ ${mins} phút` : `${hours} giờ`;
  return totalMin <= 1 ? 'dưới 1 phút' : `${mins} phút`;
}

/**
 * Cách nói tương đối của một ngày so với hôm nay.
 * @param {DateKey} key @param {DateKey} today
 */
export function relativeDay(key, today) {
  const n = diffDays(today, key);
  if (n === 0) return 'Hôm nay';
  if (n === 1) return 'Ngày mai';
  if (n === -1) return 'Hôm qua';
  if (n > 1) return `${n} ngày nữa`;
  return `${-n} ngày trước`;
}
