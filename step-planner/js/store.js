// @ts-check
/* Bộ nhớ trình duyệt. Mọi lần đọc / ghi bọc try/catch: chặn bộ nhớ (chế độ riêng tư, chính sách) thì trang
 * vẫn chạy trong bộ nhớ tạm và báo bằng banner. */
import { normWorkspace } from './core.js';

export const KEY = 'stepPlanner.v2';
/* Khoá của khuôn cũ: đọc một lần khi KEY chưa có, rồi chuẩn hoá sang khuôn mới. Khoá cũ giữ nguyên (bản dự phòng);
 * trang không ghi vào nó nữa. */
export const OLD_KEYS = ['stepPlanner.v1'];
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
  const empty = { version: 2, workspaces: [], lastId: '', lastBackup: '', dirtySince: '' };
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
    for (const k of OLD_KEYS) if (raw === null) raw = localStorage.getItem(k);
  } catch (e) {
    return { state: empty, problem: 'blocked' };
  }
  if (!raw) return { state: empty, problem: '' };
  try {
    const d = JSON.parse(raw);
    if (!d || !Array.isArray(d.workspaces)) throw new Error('khuôn lạ');
    return {
      state: {
        version: 2,
        workspaces: d.workspaces.map(normWorkspace),
        lastId: typeof d.lastId === 'string' ? d.lastId : '',
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

/* Chế độ Gọn (ẩn "Xong khi" và ghi chú trên bảng): nhớ ở máy này. Bộ nhớ bị chặn thì chỉ nhớ trong phiên. */
const COMPACT_KEY = 'stepPlanner.compact';
/** @type {boolean | null} */
let compactMem = null;
export function compactOn() {
  if (compactMem !== null) return compactMem;
  try { return localStorage.getItem(COMPACT_KEY) === '1'; } catch (e) { return false; }
}
/** @param {boolean} on */
export function setCompact(on) {
  compactMem = on;
  try { localStorage.setItem(COMPACT_KEY, on ? '1' : '0'); } catch (e) { /* chỉ nhớ trong phiên */ }
}

/* Mẹo "bấm thẻ để sửa…": người dùng tắt thì nhớ ở máy này. Bộ nhớ bị chặn thì tắt trong phiên. */
const HINT_KEY = 'stepPlanner.hintOff';
let hintOff = false;
export function hintHidden() {
  if (hintOff) return true;
  try { return localStorage.getItem(HINT_KEY) === '1'; } catch (e) { return false; }
}
export function hideHint() {
  hintOff = true;
  try { localStorage.setItem(HINT_KEY, '1'); } catch (e) { /* chỉ nhớ trong phiên */ }
}
