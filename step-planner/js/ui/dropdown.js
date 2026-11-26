// @ts-check
/* Danh sách chọn tự dựng (mẫu listbox): một nút mở một danh sách nổi. Dùng cho mọi <select> có nghĩa (enhanceSelect: <select>
 * vẫn ở trong DOM, vẫn giữ value, vẫn phát `change`) và cho menu trạng thái của chip (openList).
 * Danh sách nằm trong lớp trên cùng (popover) nên không đẩy bố cục, nổi được cả trên hộp thoại modal. Chữ chỉ qua text node.
 * Xuất: closeList, openList, consumeJustClosed, enhanceSelect, initDropdown.
 * Dùng: core/board.js, ui/dom.js. */
import { fold } from '../core/board.js';
import { h, icon } from './dom.js';

/** @typedef {{value:string, label:string, hint?:string, dot?:string, selected?:boolean, disabled?:boolean}} Item */

let seq = 0;
/** @type {null | {pop:HTMLElement, anchor:HTMLElement, items:Item[], active:number, onPick:(v:string)=>void, onClose:()=>void}} */
let cur = null;
let typed = '';
let typedAt = 0;

/** Đóng danh sách đang mở. @param {boolean} [refocus] trả focus về nút mở */
export function closeList(refocus = false) {
  if (!cur) return;
  const c = cur;
  cur = null;
  try { if (c.pop.matches(':popover-open')) c.pop.hidePopover(); } catch (e) { /* trình duyệt không có popover */ }
  c.pop.remove();
  c.anchor.setAttribute('aria-expanded', 'false');
  if (refocus) c.anchor.focus({ preventScroll: true });
  c.onClose();
}

/** Đặt danh sách ngay dưới nút (gần đáy khung nhìn thì lật lên trên), không ra ngoài khung nhìn. */
function place() {
  if (!cur) return;
  const { pop, anchor } = cur;
  const r = anchor.getBoundingClientRect();
  const gap = 4, edge = 8;
  pop.style.minWidth = Math.round(r.width) + 'px';
  pop.style.maxHeight = '';
  const ph = pop.offsetHeight, pw = pop.offsetWidth;
  const below = innerHeight - r.bottom - gap - edge, above = r.top - gap - edge;
  const up = ph > below && above > below;
  const room = Math.max(up ? above : below, 120);
  pop.style.maxHeight = Math.floor(room) + 'px';
  const ht = Math.min(ph, room);
  pop.style.top = Math.round(up ? r.top - gap - ht : r.bottom + gap) + 'px';
  pop.style.left = Math.round(Math.max(edge, Math.min(r.left, innerWidth - pw - edge))) + 'px';
  pop.dataset.side = up ? 'up' : 'down';
}

/** Nút mở còn thấy được: trong khung nhìn và trong mọi khung cuộn / cắt chứa nó. @param {HTMLElement} a */
function anchorShown(a) {
  const r = a.getBoundingClientRect();
  if (!a.isConnected || !r.width || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) return false;
  for (let p = a.parentElement; p && p !== document.body; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (!/auto|scroll|hidden|clip/.test(cs.overflowX + cs.overflowY)) continue;
    const q = p.getBoundingClientRect();
    if (r.right <= q.left || r.left >= q.right || r.bottom <= q.top || r.top >= q.bottom) return false;
  }
  return true;
}

/** @param {number} i */
function setActive(i) {
  if (!cur) return;
  const opts = /** @type {HTMLElement[]} */ ([...cur.pop.querySelectorAll('[role="option"]')]);
  if (!opts[i]) return;
  cur.active = i;
  opts.forEach((o, k) => o.classList.toggle('active', k === i));
  cur.pop.setAttribute('aria-activedescendant', opts[i].id);
  opts[i].scrollIntoView({ block: 'nearest' });
}
/** Mục bật kế tiếp theo hướng d, không vòng. @param {number} from @param {number} d */
function step(from, d) {
  if (!cur) return from;
  for (let i = from + d; i >= 0 && i < cur.items.length; i += d) if (!cur.items[i].disabled) return i;
  return from;
}
/** @param {number} i */
function pick(i) {
  if (!cur || !cur.items[i] || cur.items[i].disabled) return;
  const { onPick } = cur;
  const v = cur.items[i].value;
  closeList(true);
  onPick(v);
}

/**
 * Mở danh sách dưới `anchor`. Focus vào danh sách (aria-activedescendant); Esc / bấm ra ngoài đóng, Enter / bấm chọn.
 * @param {HTMLElement} anchor @param {Item[]} items @param {(v:string)=>void} onPick
 * @param {{label?:string, onClose?:()=>void, className?:string}} [opts]
 */
export function openList(anchor, items, onPick, opts = {}) {
  closeList();
  const id = 'dd' + (++seq);
  const pop = h('div', { class: 'dd-pop' + (opts.className ? ' ' + opts.className : ''), role: 'listbox', tabindex: '-1', id,
    'aria-label': opts.label || anchor.getAttribute('aria-label') || anchor.textContent?.trim() || '' });
  items.forEach((it, i) => {
    const o = h('div', { class: 'dd-opt', role: 'option', id: `${id}-${i}`, 'aria-selected': String(!!it.selected), 'data-value': it.value },
      it.dot ? h('span', { class: `st-dot st-${it.dot}`, 'aria-hidden': 'true' }) : '',
      h('span', { class: 'dd-text' }, h('span', { class: 'dd-label' }, it.label), it.hint ? h('span', { class: 'dd-hint' }, it.hint) : ''));
    if (it.selected) o.append(icon('check'));
    if (it.disabled) o.setAttribute('aria-disabled', 'true');
    pop.append(o);
  });
  (anchor.closest('dialog') || document.body).append(pop);
  if (typeof pop.showPopover === 'function') {
    pop.setAttribute('popover', 'manual');
    pop.showPopover();
  }
  cur = { pop, anchor, items, active: -1, onPick, onClose: opts.onClose || (() => {}) };
  anchor.setAttribute('aria-expanded', 'true');
  anchor.setAttribute('aria-controls', id);
  place();
  const sel = items.findIndex((it) => it.selected && !it.disabled);
  setActive(sel >= 0 ? sel : step(-1, 1));
  pop.focus({ preventScroll: true });

  pop.addEventListener('keydown', onKey);
  pop.addEventListener('pointermove', (e) => {
    const o = /** @type {HTMLElement} */ (e.target).closest?.('[role="option"]');
    if (o && cur) setActive([...pop.children].indexOf(o));
  });
  pop.addEventListener('click', (e) => {
    const o = /** @type {HTMLElement} */ (e.target).closest?.('[role="option"]');
    if (o) pick([...pop.children].indexOf(o));
  });
}

/** @param {KeyboardEvent} e */
function onKey(e) {
  if (!cur) return;
  const n = cur.items.length;
  const k = e.key;
  if (k === 'ArrowDown' || k === 'ArrowUp') setActive(step(cur.active, k === 'ArrowDown' ? 1 : -1));
  else if (k === 'Home') setActive(step(-1, 1));
  else if (k === 'End') setActive(step(n, -1));
  else if (k === 'Enter' || k === ' ') pick(cur.active);
  else if (k === 'Escape') closeList(true);
  else if (k === 'Tab') { closeList(true); return; }
  else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    /* Gõ chữ: nhảy tới mục mở đầu bằng chữ ấy (gõ liền trong nửa giây thì nối chữ). */
    const now = Date.now();
    typed = (now - typedAt < 500 ? typed : '') + fold(k);
    typedAt = now;
    const start = typed.length > 1 ? cur.active : cur.active + 1;
    for (let d = 0; d < n; d++) {
      const i = (start + d) % n;
      if (!cur.items[i].disabled && fold(cur.items[i].label).startsWith(typed)) { setActive(i); break; }
    }
  } else return;
  e.preventDefault();
  e.stopPropagation(); // Esc không đóng luôn hộp thoại chứa nó
}

/** Gắn sự kiện, chạy một lần lúc khởi động (main.js gọi trước mọi init khác). */
export function initDropdown() {
  /* Bấm ra ngoài: đóng (bấm lại đúng nút mở thì chỉ đóng, không mở lại). Đổi cỡ: đóng. */
  document.addEventListener('pointerdown', (e) => {
    if (!cur) return;
    const t = /** @type {Node} */ (e.target);
    if (cur.pop.contains(t)) return;
    if (cur.anchor.contains(t)) cur.anchor.dataset.ddJustClosed = '1';
    closeList();
  }, true);
  /* Cuộn (trang, hàng thẻ, thân hộp thoại): nút mở còn thấy thì danh sách đi theo nó, khuất hẳn thì đóng. Hàng thẻ vừa vuốt còn
     trôi khi ngón chạm chip: cuộn ấy không được đóng danh sách vừa mở. */
  document.addEventListener('scroll', (e) => {
    if (!cur || cur.pop.contains(/** @type {Node} */ (e.target))) return;
    if (anchorShown(cur.anchor)) place(); else closeList();
  }, true);
  window.addEventListener('resize', () => closeList());
  document.addEventListener('focusin', (e) => {
    if (cur && !cur.pop.contains(/** @type {Node} */ (e.target)) && e.target !== cur.anchor) closeList();
  });
}

/** Nút mở vừa bị bấm khi danh sách của nó đang mở (pointerdown đã đóng): click này không mở lại. @param {HTMLElement} anchor */
export function consumeJustClosed(anchor) {
  if (!anchor.dataset.ddJustClosed) return false;
  delete anchor.dataset.ddJustClosed;
  return true;
}

/**
 * Thay giao diện của một <select> bằng nút + danh sách tự dựng. <select> vẫn là nguồn giá trị: ẩn khỏi mắt và khỏi vòng
 * Tab, gán `value` hay thay option thì nút tự cập nhật; chọn một mục thì đặt value và phát `change` như chọn thật.
 * Option có `data-hint` (dòng giải thích) và `data-dot` (chấm trạng thái) thì danh sách hiện thêm. Bỏ qua: `data-native`.
 * @param {HTMLSelectElement} sel
 */
export function enhanceSelect(sel) {
  if (sel.dataset.native !== undefined || sel.dataset.enhanced) return;
  sel.dataset.enhanced = '1';
  const val = h('span', { class: 'dd-val' });
  const btn = h('button', { type: 'button', class: 'dd-btn', 'aria-haspopup': 'listbox', 'aria-expanded': 'false' }, val, icon('chev'));
  sel.before(btn);
  sel.classList.add('dd-native');
  sel.tabIndex = -1;
  sel.setAttribute('aria-hidden', 'true');
  const refresh = () => {
    const o = sel.selectedOptions[0];
    val.textContent = o ? o.textContent || '' : '';
    /** @type {HTMLButtonElement} */ (btn).disabled = sel.disabled;
    const dot = o?.dataset.dot;
    if (dot) val.prepend(h('span', { class: `st-dot st-${dot}`, 'aria-hidden': 'true' }));
  };
  /* Gán value / selectedIndex bằng JS không phát sự kiện: bọc setter của chính phần tử này. */
  const proto = HTMLSelectElement.prototype;
  for (const prop of ['value', 'selectedIndex']) {
    const d = /** @type {PropertyDescriptor} */ (Object.getOwnPropertyDescriptor(proto, prop));
    Object.defineProperty(sel, prop, { configurable: true, get() { return d.get?.call(this); }, set(v) { d.set?.call(this, v); refresh(); } });
  }
  new MutationObserver(refresh).observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'selected'] });
  sel.addEventListener('change', refresh);
  const open = () => openList(btn, [...sel.options].map((o) => ({
    value: o.value, label: o.textContent || '', hint: o.dataset.hint, dot: o.dataset.dot, selected: o.selected, disabled: o.disabled,
  })), (v) => {
    if (sel.value === v) return;
    sel.value = v;
    sel.dispatchEvent(new Event('input', { bubbles: true }));
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }, { label: sel.closest('label')?.querySelector('span')?.textContent || sel.name });
  btn.addEventListener('click', () => {
    if (consumeJustClosed(btn)) return;
    open();
  });
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(); }
  });
  refresh();
}
