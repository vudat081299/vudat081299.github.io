// @ts-check
// Tuỳ chọn cá nhân trong localStorage. Đọc/ghi hỏng (chế độ riêng tư, bị chặn) thì dùng mặc định, không làm vỡ trang.

const KEY = 'class-schedule:prefs:v1';

/** @typedef {'month'|'week'|'agenda'} View */
/** @typedef {'light'|'dark'|null} Theme  null = theo hệ thống */

/**
 * @typedef {Object} Prefs
 * @property {View|null} view     null = chọn theo khổ màn hình
 * @property {string[]} hidden    id các môn đang ẩn
 * @property {Theme} theme
 * @property {boolean} showPast   danh sách có hiện buổi đã qua không
 */

/** @type {Prefs} */
const DEFAULTS = { view: null, hidden: [], theme: null, showPast: false };

/** @returns {Prefs} */
export function loadPrefs() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const p = JSON.parse(raw);
    return {
      view: ['month', 'week', 'agenda'].includes(p.view) ? p.view : null,
      hidden: Array.isArray(p.hidden) ? p.hidden.filter((/** @type {unknown} */ x) => typeof x === 'string') : [],
      theme: p.theme === 'light' || p.theme === 'dark' ? p.theme : null,
      showPast: p.showPast === true,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

/** @param {Prefs} prefs */
export function savePrefs(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* không lưu được thì thôi */
  }
}
