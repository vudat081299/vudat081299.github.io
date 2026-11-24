// @ts-check
/* Bộ nhớ trình duyệt. Mọi lần đọc / ghi bọc try/catch: chặn bộ nhớ (chế độ riêng tư, chính sách) thì trang
 * vẫn chạy trong bộ nhớ tạm và báo bằng banner. */
import { normWorkspace } from './core.js';

export const KEY = 'stepPlanner.v1';
const TAB_KEY = 'stepPlanner.tab';

/** @returns {boolean} */
export function available() {
  try {
    localStorage.setItem(KEY + '.probe', '1');
    localStorage.removeItem(KEY + '.probe');
    return true;
  } catch (e) {
    return false;
  }
}

const isoOrEmpty = (/** @type {any} */ s) => (typeof s === 'string' && !isNaN(Date.parse(s)) ? s : '');

/** @returns {{ state: any, problem: string }} */
export function load() {
  const empty = { version: 1, workspaces: [], lastId: '', me: {}, lastBackup: '', dirtySince: '' };
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch (e) {
    return { state: empty, problem: 'blocked' };
  }
  if (!raw) return { state: empty, problem: '' };
  try {
    const d = JSON.parse(raw);
    if (!d || !Array.isArray(d.workspaces)) throw new Error('khuôn lạ');
    return {
      state: {
        version: 1,
        workspaces: d.workspaces.map(normWorkspace),
        lastId: typeof d.lastId === 'string' ? d.lastId : '',
        me: d.me && typeof d.me === 'object' && !Array.isArray(d.me) ? d.me : {},
        lastBackup: isoOrEmpty(d.lastBackup),
        dirtySince: isoOrEmpty(d.dirtySince),
      },
      problem: '',
    };
  } catch (e) {
    try { localStorage.setItem(KEY + '.corrupt', raw); } catch (e2) { /* giữ được thì tốt */ }
    return { state: empty, problem: 'corrupt' };
  }
}

/** @param {any} state @returns {boolean} */
export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    return false;
  }
}

/** Dự án tab này đang mở: mỗi tab một dự án, không kéo nhau khi tab khác đổi. */
export function tabProject() {
  try { return sessionStorage.getItem(TAB_KEY) || ''; } catch (e) { return ''; }
}
/** @param {string} id */
export function setTabProject(id) {
  try { sessionStorage.setItem(TAB_KEY, id); } catch (e) { /* chỉ giữ trong bộ nhớ */ }
}

/** Xin trình duyệt đừng tự xoá dữ liệu (Safari xoá dữ liệu do script ghi sau 7 ngày không mở trang). */
export function askPersist() {
  try {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  } catch (e) { /* không có thì thôi */ }
}

const THEME_KEY = 'hub-theme';
/** @param {string} t */
export function saveTheme(t) {
  try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* theme chỉ giữ trong phiên */ }
}
