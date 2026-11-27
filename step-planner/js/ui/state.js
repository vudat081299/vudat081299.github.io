// @ts-check
/* Trạng thái dùng chung của trang và việc ghi: mọi dự án (`state`), dự án tab này mở (`curId`), mẫu (`templates`), bộ lọc
   (`ui`), banner; ghi bộ nhớ ở lượt việc kế (persist), ghi rồi vẽ lại (commit), đưa focus về (refocus); tab khác ghi thì đọc lại.
   Biến dùng chung là `export let`: nơi khác chỉ đọc, gán lại qua hàm của module này (setCur, loadData; `ui` sửa từng trường).
   Xuất: state, curId, templates, ui, findWs, cur, tplOf, stepOf, setCur, persist, commit, refocus, subSel, stepSel,
     loadData, initState.
   Dùng: core/handoffs.js, ui/docs.js, ui/dom.js, ui/render.js, ui/store.js. */
import * as S from './store.js';
import { pruneSubOuts } from '../core/handoffs.js';
import { refreshDocLists } from './docs.js';
import { $, h } from './dom.js';
import { render } from './render.js';

/* ── Trạng thái ── */

let storageOK = false;
/** @type {any} */
let loaded = null;
/** @type {{version:number, workspaces:any[], lastId:string, lastBackup:string, dirtySince:string}} */
export let state;
/** Dự án tab này đang mở (mỗi tab một dự án). */
export let curId = '';
/** @type {any[]} */
export let templates = [];
/** q: chữ tìm; st: nhóm trạng thái đang lọc (STATUS_GROUPS, '' = mọi trạng thái). Mỗi tab một bộ lọc, không lưu. */
export const ui = { q: '', st: '' };

const banners = new Map();

export const findWs = (/** @type {string} */ id) => state.workspaces.find((w) => w.id === id) || null;
export const cur = () => findWs(curId);
/** Mẫu theo id (System design: dòng "Preset from template"). @param {string} id */
export const tplOf = (id) => templates.find((t) => t.id === id) || null;

/** @param {any} ws @param {string} stepId */
export const stepOf = (ws, stepId) => (ws ? ws.steps.find((/** @type {any} */ s) => s.id === stepId) : null);

export function setCur(/** @type {string} */ id) {
  curId = id;
  state.lastId = id;
  S.setTabProject(id);
}

function setBanner(/** @type {string} */ key, /** @type {string} */ msg) {
  if (msg) banners.set(key, msg); else banners.delete(key);
  const b = $('banner');
  b.replaceChildren(...[...banners.values()].map((m) => h('p', {}, m)));
  b.hidden = !banners.size;
}

/* Ghi bộ nhớ ở lượt việc kế (mọi thay đổi của một lần bấm gộp một lần ghi). Không chờ khung hình: tab nền bị hãm khung
 * hình, tab kia ghi trước thì thay đổi của tab này mất. Rời trang, ẩn tab: ghi ngay. */
let savePending = false;
export function persist() {
  if (!storageOK || savePending) return;
  savePending = true;
  setTimeout(flushSave, 0);
}
function flushSave() {
  if (!savePending) return;
  savePending = false;
  setBanner('save', S.save(state) ? '' : 'Could not write to browser storage (full or blocked). New changes are not saved — back up as JSON to keep them.');
}

/** Ghi lại, vẽ lại, rồi đưa focus về phần tử vừa thao tác. Bước thôi chọn đầu ra không còn ở bước con của nó (bước con dời đi,
 * bị xoá, đầu ra bị xoá: pruneSubOuts); Hoàn tác của thao tác ấy gắn lại. @param {string} [focusSel] @param {{preventScroll?:boolean}} [opt] */
export function commit(focusSel, opt = {}) {
  const ws = cur();
  const now = new Date().toISOString();
  if (ws) { ws.updatedAt = now; pruneSubOuts(ws); }
  if (!state.dirtySince) state.dirtySince = now;
  persist();
  render();
  if (focusSel) refocus(focusSel, opt);
}
/** Thử từng bộ chọn (cách nhau bằng `||`); không trúng thì về bảng — focus không bao giờ rơi về body. */
export function refocus(/** @type {string} */ sel, opt = {}) {
  for (const s of sel.split('||')) {
    const el = s.trim() && document.querySelector(s.trim());
    if (el && !el.disabled && el.offsetParent !== null) { el.focus(opt); return; }
  }
  const board = $('app').hidden ? $('start') : $('board');
  board.setAttribute('tabindex', '-1');
  board.focus(opt);
}
export const subSel = (/** @type {string} */ id, /** @type {string} */ act) => `.card[data-sub="${id}"] [data-act="${act}"]`;
export const stepSel = (/** @type {string} */ id, /** @type {string} */ act) => `.step[data-step="${id}"] .step-head [data-act="${act}"]`;

/** Khởi động phần dữ liệu (sau initState): báo bộ nhớ bị chặn / hỏng, nạp mẫu, chọn dự án của tab, khoá cũ thì ghi ngay. */
export async function loadData() {
  S.askPersist();
  if (!storageOK) setBanner('storage', 'This browser blocks storage: changes last only until you close the page. Back up as JSON to keep them.');
  else if (loaded.problem === 'corrupt') setBanner('storage', `Saved data is corrupt and could not be read. The old copy is kept under the key ${S.KEY}.corrupt; starting empty.`);
  try {
    const res = await fetch('data/templates.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    templates = (await res.json()).templates || [];
  } catch (e) {
    setBanner('fetch', 'Could not load data/templates.json, so there are no templates. The page reads them with fetch and must be '
      + 'opened over HTTP: run python3 -m http.server at the repo root, then open http://localhost:8000/step-planner/.');
  }
  const tab = S.tabProject();
  curId = findWs(tab) ? tab : findWs(state.lastId) ? state.lastId : state.workspaces[0]?.id || '';
  if (curId) S.setTabProject(curId);
  if (loaded.migrated) { persist(); flushSave(); } // khoá cũ: ghi ngay sang khoá mới
}

/** Đọc bộ nhớ, gắn sự kiện ghi khi rời trang và đọc lại khi tab khác ghi. Chạy trước mọi init… khác. */
export function initState() {
  storageOK = S.available();
  loaded = S.load();
  state = loaded.state;
  window.addEventListener('pagehide', flushSave);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flushSave(); });

  /* ── Tab khác sửa cùng dữ liệu: đọc lại, giữ dự án của tab này ── */

  window.addEventListener('storage', (e) => {
    if (e.key !== S.KEY) return;
    savePending = false; // tab kia ghi sau: bản của nó thắng, như khi hai tab ghi ngay
    state = S.load().state;
    if (!findWs(curId)) setCur(findWs(state.lastId) ? state.lastId : state.workspaces[0]?.id || '');
    render();
    refreshDocLists(); // hộp sửa đang mở: tài liệu theo bản mới; chữ đang sửa giữ nguyên, Lưu gộp (mergeSaved)
  });
}
