// @ts-check
// Tuỳ chọn cá nhân trong localStorage. Đọc/ghi hỏng (chế độ riêng tư, bị chặn) thì dùng mặc định, không làm vỡ trang.

const KEY = 'class-schedule:prefs:v1';
const THEME_KEY = 'hub-theme'; // khoá theme chung cả site, giữ ngoài KEY

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
  return { ...loadLocal(), theme: loadTheme() };
}

/** @returns {Theme} */
function loadTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === 'light' || t === 'dark' ? t : null;
  } catch {
    return null;
  }
}

/** @returns {Prefs} */
function loadLocal() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const p = JSON.parse(raw);
    return {
      view: ['month', 'week', 'agenda'].includes(p.view) ? p.view : null,
      hidden: Array.isArray(p.hidden) ? p.hidden.filter((/** @type {unknown} */ x) => typeof x === 'string') : [],
      theme: null,
      showPast: p.showPast === true,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

/** @param {Prefs} prefs */
export function savePrefs(prefs) {
  const { theme, ...rest } = prefs;
  try {
    localStorage.setItem(KEY, JSON.stringify(rest));
    if (theme) localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* không lưu được thì thôi */
  }
}
