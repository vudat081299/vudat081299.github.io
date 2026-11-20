/* Cây folder + file của phiên: cột trái ở máy rộng (≥ 1081px), tấm trượt trái #dlg-tree ở máy ≤ 1080px. Chỉ vẽ và
   nghe sự kiện: không đọc, không ghi phiên. Nơi gọi đưa dữ liệu và các hàm việc qua renderTree(model, actions); mọi
   thay đổi cây đi qua actions, rồi nơi gọi vẽ lại bằng renderTree. Hàng giữ phần tử qua các lần vẽ (khoá theo id).
   model:   { nodes, open, collapsed, counts: { fileId: { c, rv } }, title }
   actions: open(id), toggle(dirId), newFile(parentId), newDir(parentId), rename(id, name) → lỗi | '', move(id, parentId)
            → lỗi | '', remove(id), importDir(FileList | entry[], parentId), download(id | null), collapseAll().
   Ẩn / hiện: prefs.tree (chưa chọn: hiện khi phiên có ≥ 2 mục), html.ma-tree-on, nút #btn-tree, Ctrl/⌘ + B. Bề rộng:
   --tree, kéo #tree-grip 180–420, prefs.treeW. Bàn phím theo mẫu tree của WAI-ARIA; kéo thả bằng chuột.
   Xuất: editName, initTree, renderTree, setTreeShown, treeShown.
   Dùng: core/tree.js, ui/store.js, ui/dom.js, ui/views.js. */
import { subtree, visibleRows } from '../core/tree.js';
import { prefs, savePrefs } from './store.js';
import { $, dragBar, h, icon, mqSide, toast, typing } from './dom.js';
import { refreshSplit } from './views.js';

var W_MIN = 180, W_MAX = 420, W_DEF = 248;
var model = null, act = {};
var rows = [], at = {}, byId = {};   // hàng đang hiện; id → chỉ số trong rows; id → node
var els = {};                        // id → <li>, giữ qua các lần vẽ (focus, bấm đúp, kéo không mất)
var cur = null;                      // hàng giữ tabindex 0 (roving tabindex)
var editing = null;                  // { id, input, orig } khi đang đổi tên
var lastOpen = null, wasOn = null, treeW = W_DEF;
var menu = null, menuFor = null;
var dragId = null, dropAt, hoverDir = null, hoverTimer = 0;
var seek = '', seekTimer = 0;
var fine = window.matchMedia('(pointer: fine)');

function call(name) {
  var f = act[name];
  return typeof f === 'function' ? f.apply(null, Array.prototype.slice.call(arguments, 1)) || '' : '';
}
function parentOf(id) { var n = byId[id]; return n && n.parent != null ? n.parent : null; }

/* ẨN / HIỆN */
function wantShown() { return typeof prefs.tree === 'boolean' ? prefs.tree : !!(model && model.nodes.length > 1); }
export function treeShown() { return !!model && wantShown(); }
function syncBtn() {
  var b = $('btn-tree');
  b.hidden = !model;
  var open = mqSide.matches ? treeShown() : $('dlg-tree').open;
  var lbl = open ? 'Hide files' : 'Show files';
  b.setAttribute('aria-expanded', String(open)); b.setAttribute('aria-label', lbl); b.title = lbl;
}
function applyShown() {
  var on = treeShown();
  syncBtn();
  if (on === wasOn) return;
  wasOn = on;
  if (!on && mqSide.matches && $('tree').contains(document.activeElement)) $('btn-tree').focus();
  document.documentElement.classList.toggle('ma-tree-on', on);
  refreshSplit();   // #doc đổi bề rộng: Split hiện / ẩn ngay (ResizeObserver của ui/views.js cũng gọi, trễ một khung)
}
export function setTreeShown(on) { prefs.tree = !!on; savePrefs(); applyShown(); }
function toggle() {
  if (!model) return;
  if (mqSide.matches) { setTreeShown(!treeShown()); return; }
  if ($('dlg-tree').open) $('dlg-tree').close(); else openSheet();
}

/* TẤM TRƯỢT (≤ 1080px): cây vào #dlg-tree khi mở, đóng thì về chỗ cũ trong lưới. */
var home = null, homeNext = null;
function openSheet() {
  closeMenu(false);
  $('dlg-tree').append($('tree'));
  $('dlg-tree').showModal();
  syncBtn();
  var li = els[cur];
  if (li && li.isConnected) { li.focus({ preventScroll: true }); reveal(li); }
}
function closeSheet() { if ($('dlg-tree').open) $('dlg-tree').close(); }

/* BỀ RỘNG */
function applyW(w) {
  w = Math.max(W_MIN, Math.min(W_MAX, Math.round(w)));
  document.documentElement.style.setProperty('--tree', w + 'px');
  $('tree-grip').setAttribute('aria-valuenow', String(w));
  return w;
}

/* VẼ */
function label(n) {
  var c = model.counts && model.counts[n.id], s = n.name;
  if (n.kind === 'dir') return s + ', folder';
  if (c && c.c) s += ', ' + c.c + (c.c === 1 ? ' comment' : ' comments');
  if (c && typeof c.rv === 'number' && c.rv > 0) s += ', ' + c.rv + '% reviewed';
  return s;
}
/* Dựng ruột hàng; giống lần trước thì giữ nguyên (lần bấm thứ hai của bấm đúp phải trúng cùng phần tử). */
function fill(li, r) {
  var n = r.node, dir = n.kind === 'dir', c = !dir && model.counts && model.counts[n.id];
  var shut = dir && li.getAttribute('aria-expanded') === 'false';
  var sig = JSON.stringify([n.kind, n.name, shut, c && c.c, c && c.rv]);
  if (li._sig === sig && li.firstChild) return;
  li._sig = sig;
  var meta = h('span', { class: 'ma-trow__meta' },
    c && c.c ? h('span', { class: 'ma-trow__c' }, String(c.c)) : null,
    c && typeof c.rv === 'number' && c.rv > 0 ? h('span', { class: 'ma-trow__rv' }, c.rv + '%') : null);
  var parts = [
    h('span', { class: 'ma-trow__chev', 'aria-hidden': 'true' }, dir ? icon('chev') : null),
    h('span', { class: 'ma-trow__ic', 'aria-hidden': 'true' }, icon(dir ? (shut ? 'folder' : 'folder-open') : 'file')),
    h('span', { class: 'ma-trow__name' }, n.name)];
  if (meta.childNodes.length) parts.push(meta);
  parts.push(h('button', { class: 'ma-icbtn ma-icbtn--bare ma-trow__more', type: 'button', tabindex: '-1', 'aria-haspopup': 'menu',
    'aria-label': 'Actions for ' + n.name, title: 'More actions' }, icon('dots')));
  li.replaceChildren.apply(li, parts);
}
function rowEl(r, pos, size, path) {
  var n = r.node, li = els[n.id];
  if (!li) { li = h('li', { class: 'ma-trow', role: 'treeitem' }); li.dataset.id = n.id; els[n.id] = li; }
  li.setAttribute('aria-level', String(r.depth + 1));
  li.setAttribute('aria-posinset', String(pos)); li.setAttribute('aria-setsize', String(size));
  li.style.setProperty('--depth', String(r.depth));
  if (n.kind === 'dir') {
    li.setAttribute('aria-expanded', String((model.collapsed || []).indexOf(n.id) < 0));
    li.removeAttribute('aria-selected');
  } else {
    li.removeAttribute('aria-expanded');
    li.setAttribute('aria-selected', String(n.id === model.open));
  }
  li.dataset.kind = n.kind;
  li.title = path;
  li.setAttribute('aria-label', label(n));
  li.draggable = fine.matches;
  if (!(editing && editing.id === n.id)) fill(li, r);
  return li;
}
/* Đặt các <li> theo thứ tự `want`, chỉ chèn / bỏ chỗ khác: hàng không đổi chỗ giữ nguyên phần tử và focus. */
function reconcile(list, want) {
  var ref = list.firstChild;
  want.forEach(function (li) {
    if (li === ref) ref = ref.nextSibling;
    else list.insertBefore(li, ref);
  });
  while (ref) { var nx = ref.nextSibling; list.removeChild(ref); ref = nx; }
}
/* Cuộn thân cây vừa đủ để thấy hàng (không cuộn trang). */
function reveal(li) {
  var b = $('tree-body'), r = li.getBoundingClientRect(), q = b.getBoundingClientRect();
  if (r.top < q.top) b.scrollTop -= q.top - r.top + 4;
  else if (r.bottom > q.top + b.clientHeight) b.scrollTop += r.bottom - (q.top + b.clientHeight) + 4;
}

export function renderTree(m, actions) {
  var ae = document.activeElement;
  var hadFocus = !!(ae && ae.classList && ae.classList.contains('ma-trow') && $('tree').contains(ae));
  model = m; act = actions || {};
  byId = {};
  m.nodes.forEach(function (n) { byId[n.id] = n; });
  rows = visibleRows(m.nodes, m.collapsed || []);
  at = {};
  /* Vị trí trong nhóm anh em (aria-posinset / setsize): anh em của một hàng đang hiện thì cũng hiện cả. */
  var sibs = {}, stack = [];
  rows.forEach(function (r, i) {
    at[r.node.id] = i;
    var p = r.node.parent == null ? '' : r.node.parent;
    (sibs[p] = sibs[p] || []).push(r.node.id);
  });
  var want = rows.map(function (r) {
    var p = r.node.parent == null ? '' : r.node.parent, g = sibs[p];
    stack.length = r.depth; stack.push(r.node.name);
    return rowEl(r, g.indexOf(r.node.id) + 1, g.length, stack.join('/'));
  });
  Object.keys(els).forEach(function (id) { if (!(id in byId)) delete els[id]; });
  if (editing && !(editing.id in at)) editing = null;
  reconcile($('tree-list'), want);
  $('tree-title').replaceChildren(h('span', { title: m.title || 'Files' }, m.title || 'Files'));

  if (cur == null || !(cur in at)) cur = m.open in at ? m.open : (rows[0] ? rows[0].node.id : null);
  rows.forEach(function (r) { els[r.node.id].tabIndex = r.node.id === cur ? 0 : -1; });
  if (hadFocus && cur != null && !editing) els[cur].focus({ preventScroll: true });
  if (m.open !== lastOpen) {
    lastOpen = m.open;
    if (m.open in at) { if (!hadFocus) setCur(m.open, false); reveal(els[m.open]); }
  }
  if (menuFor && !(menuFor in at)) closeMenu(false);
  applyShown();
}
function setCur(id, focus) {
  if (!(id in at)) return;
  if (cur != null && els[cur]) els[cur].tabIndex = -1;
  cur = id; els[id].tabIndex = 0;
  if (focus) { els[id].focus({ preventScroll: true }); reveal(els[id]); }
}

/* Bấm hàng / Enter: file thì mở (đóng tấm trượt), folder thì gập / mở. */
function activate(id) {
  var n = byId[id];
  if (!n) return;
  setCur(id, true);
  if (n.kind === 'dir') { call('toggle', id); return; }
  call('open', id);
  closeSheet();
}

/* ĐỔI TÊN tại chỗ: Enter lưu (lỗi thì toast, vẫn sửa), Esc bỏ, rời ô thì lưu (lỗi thì toast, bỏ). */
export function editName(id) {
  var li = els[id], n = byId[id];
  if (!li || !li.isConnected || !n) return;
  closeMenu(false);
  if (editing) endEdit(false);
  setCur(id, false);
  var inp = h('input', { class: 'ma-input ma-trow__ren', type: 'text', value: n.name, spellcheck: 'false', autocomplete: 'off',
    'aria-label': 'New name for ' + n.name });
  editing = { id: id, input: inp, orig: n.name };
  var name = li.querySelector('.ma-trow__name');
  li.querySelectorAll('.ma-trow__meta, .ma-trow__more').forEach(function (x) { x.remove(); });
  li.draggable = false;
  name.replaceWith(inp);
  li._sig = '';
  inp.addEventListener('keydown', function (e) {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); commit(true); }
    else if (e.key === 'Escape') { e.preventDefault(); endEdit(true); }
  });
  inp.addEventListener('blur', function () { if (editing && editing.input === inp) commit(false); });
  ['click', 'dblclick', 'pointerdown'].forEach(function (t) { inp.addEventListener(t, function (e) { e.stopPropagation(); }); });
  inp.focus();
  var dot = n.kind === 'file' ? n.name.lastIndexOf('.') : -1;
  inp.setSelectionRange(0, dot > 0 ? dot : n.name.length);
}
function commit(keep) {
  var ed = editing;
  if (!ed || !ed.input.isConnected) { editing = null; return; }
  var v = ed.input.value.trim();
  if (v === ed.orig) { endEdit(keep); return; }
  var err = call('rename', ed.id, v);
  if (err) {
    toast(err);
    if (keep) { ed.input.focus(); ed.input.select(); return; }
  }
  endEdit(keep);
}
function endEdit(refocus) {
  var ed = editing;
  editing = null;
  if (!ed) return;
  var li = els[ed.id];
  if (!li || !(ed.id in at)) return;
  li.draggable = fine.matches;
  fill(li, rows[at[ed.id]]);
  if (refocus) setCur(ed.id, true);
}

/* MENU HÀNG (⋯, chuột phải, Shift+F10 / phím Menu): popover ở lớp trên cùng. */
function item(ic, text, fn, opts) {
  opts = opts || {};
  return h('button', { class: 'ma-menu__i' + (opts.danger ? ' ma-menu__i--danger' : ''), type: 'button', role: 'menuitem', tabindex: '-1',
    disabled: !!opts.disabled, 'data-depth': opts.depth != null ? String(opts.depth) : null,
    style: opts.depth != null ? '--depth:' + opts.depth : null,
    onclick: function () { closeMenu(!opts.keepFocus); fn(); } }, ic ? icon(ic) : null, h('span', null, text));
}
function mainItems(id) {
  var n = byId[id], out = [];
  if (n.kind === 'dir') {
    out.push(item('file-plus', 'New file here', function () { call('newFile', id); }),
      item('folder-plus', 'New folder here', function () { call('newDir', id); }),
      h('div', { class: 'ma-menu__sep', role: 'separator' }));
  }
  out.push(item('pencil', 'Rename', function () { editName(id); }, { keepFocus: true }),
    h('button', { class: 'ma-menu__i', type: 'button', role: 'menuitem', tabindex: '-1', 'aria-haspopup': 'menu',
      onclick: function () { fillMenu(moveItems(id)); } }, icon('folder'), h('span', null, 'Move to…')),
    item('download', n.kind === 'dir' ? 'Download .zip' : 'Download', function () { call('download', id); }),
    h('div', { class: 'ma-menu__sep', role: 'separator' }),
    item('trash', 'Delete', function () { call('remove', id); }, { danger: true }));
  return out;
}
function moveItems(id) {
  var n = byId[id], skip = {};
  subtree(model.nodes, id).forEach(function (x) { skip[x] = true; });
  var here = n.parent == null ? null : n.parent;
  var out = [
    h('button', { class: 'ma-menu__i', type: 'button', role: 'menuitem', tabindex: '-1',
      onclick: function () { fillMenu(mainItems(id)); } }, icon('back'), h('span', null, 'Back')),
    h('div', { class: 'ma-menu__h', role: 'presentation' }, 'Move ' + n.name + ' to'),
    item(null, 'Top level', function () { moved(id, null); }, { disabled: here === null, depth: 0 })
  ];
  visibleRows(model.nodes, []).forEach(function (r) {
    if (r.node.kind !== 'dir' || skip[r.node.id]) return;
    out.push(item('folder', r.node.name, function () { moved(id, r.node.id); }, { disabled: here === r.node.id, depth: r.depth + 1 }));
  });
  return out;
}
function moved(id, to) { var err = call('move', id, to); if (err) toast(err); }
function menuItems() { return Array.prototype.filter.call(menu.querySelectorAll('.ma-menu__i'), function (b) { return !b.disabled; }); }
function fillMenu(items) {
  menu.replaceChildren.apply(menu, items);
  var first = menuItems()[0];
  if (first) first.focus();
}
function openMenu(id, x, y) {
  closeMenu(false);
  var li = els[id];
  if (!li || !byId[id]) return;
  setCur(id, false);
  menuFor = id; li.classList.add('is-menu');
  menu.replaceChildren.apply(menu, mainItems(id));
  menu.classList.add('is-open');
  if (menu.showPopover) { try { menu.showPopover(); } catch (e) {} }
  if (x == null) {
    var b = li.querySelector('.ma-trow__more'), r = (b || li).getBoundingClientRect();
    x = r.right; y = r.bottom + 2;
    place(x, y, true, r.top - 2);
  } else place(x, y, false, y);
  var first = menuItems()[0];
  if (first) first.focus();
}
/* Đặt menu trong khung nhìn: dưới điểm neo (căn phải theo nút ⋯), thiếu chỗ thì lên trên. */
function place(x, y, alignRight, above) {
  var w = menu.offsetWidth, hh = menu.offsetHeight, pad = 8;
  var left = alignRight ? x - w : x;
  left = Math.max(pad, Math.min(window.innerWidth - w - pad, left));
  var top = y + hh + pad > window.innerHeight && above - hh >= pad ? above - hh : Math.min(y, window.innerHeight - hh - pad);
  menu.style.left = left + 'px'; menu.style.top = Math.max(pad, top) + 'px';
}
function closeMenu(refocus) {
  if (!menu || !menu.classList.contains('is-open')) return;
  menu.classList.remove('is-open');
  if (menu.hidePopover) { try { menu.hidePopover(); } catch (e) {} }
  var id = menuFor;
  menuFor = null;
  if (els[id]) els[id].classList.remove('is-menu');
  if (refocus && id in at) setCur(id, true);
}
function menuKey(e) {
  var its = menuItems(), i = its.indexOf(document.activeElement), k = e.key;
  if (k === 'ArrowDown' || k === 'ArrowUp') { if (its.length) its[(i + (k === 'ArrowDown' ? 1 : -1) + its.length) % its.length].focus(); }
  else if (k === 'Home') { if (its[0]) its[0].focus(); }
  else if (k === 'End') { if (its.length) its[its.length - 1].focus(); }
  else if (k === 'Escape') closeMenu(true);
  else if (k === 'Tab') closeMenu(true);
  else return;
  e.preventDefault(); e.stopPropagation();
}

/* BÀN PHÍM của cây (WAI-ARIA tree): ↑ ↓ Home End, → mở / vào con, ← gập / lên cha, Enter / Space, F2, Delete,
   Shift+F10 / phím Menu, gõ chữ nhảy tới tên. Phím đã xử lý không lan ra phím tắt của trang (X, J, K, ?). */
function treeKey(e) {
  if (editing) return;
  var li = e.target.closest && e.target.closest('.ma-trow');
  if (!li || !(li.dataset.id in at)) return;
  var id = li.dataset.id, i = at[id], r = rows[i], n = r.node, k = e.key;
  var del = k === 'Delete' || (e.metaKey && k === 'Backspace');
  if ((e.ctrlKey || e.metaKey || e.altKey) && !del) return;
  var go = function (j) { if (rows[j]) setCur(rows[j].node.id, true); };
  if (k === 'ArrowDown') go(i + 1);
  else if (k === 'ArrowUp') go(i - 1);
  else if (k === 'Home') go(0);
  else if (k === 'End') go(rows.length - 1);
  else if (k === 'ArrowRight') {
    if (n.kind === 'dir' && li.getAttribute('aria-expanded') === 'false') call('toggle', id);
    else if (n.kind === 'dir' && rows[i + 1] && rows[i + 1].depth > r.depth) go(i + 1);
  } else if (k === 'ArrowLeft') {
    if (n.kind === 'dir' && li.getAttribute('aria-expanded') === 'true') call('toggle', id);
    else if (n.parent != null && n.parent in at) go(at[n.parent]);
  } else if (k === 'Enter' || k === ' ') activate(id);
  else if (k === 'F2') editName(id);
  else if (del) call('remove', id);
  else if (k === 'ContextMenu' || (k === 'F10' && e.shiftKey)) openMenu(id);
  else if (k.length === 1 && k !== ' ') {
    clearTimeout(seekTimer); seekTimer = setTimeout(function () { seek = ''; }, 600);
    seek += k.toLowerCase();
    for (var s = 0; s < rows.length; s++) {
      var j = (i + (seek.length === 1 ? 1 : 0) + s) % rows.length;
      if (rows[j].node.name.toLowerCase().indexOf(seek) === 0) { go(j); break; }
    }
  } else return;
  e.preventDefault(); e.stopPropagation();
}

/* KÉO THẢ (chuột): hàng lên folder (thả lên file = vào folder chứa nó; vùng trống = cấp trên cùng); file / folder
   từ máy vào cây thì nạp (importDir). Folder đang gập: giữ trên nó 700ms thì mở. */
function hasFiles(dt) { return !!dt && Array.prototype.indexOf.call(dt.types || [], 'Files') >= 0; }
function targetOf(e) {
  var li = e.target.closest && e.target.closest('.ma-trow');
  if (!li || !(li.dataset.id in byId)) return null;
  return byId[li.dataset.id].kind === 'dir' ? li.dataset.id : parentOf(li.dataset.id);
}
function canMove(id, to) {
  if (!(id in byId) || to === parentOf(id)) return false;
  return to == null || subtree(model.nodes, id).indexOf(to) < 0;
}
function showDrop(to) {
  if (dropAt === to) return;
  clearDrop();
  dropAt = to;
  if (to === null) $('tree-body').classList.add('is-drop');
  else if (els[to]) els[to].classList.add('is-drop');
}
function clearDrop() {
  if (dropAt === null) $('tree-body').classList.remove('is-drop');
  else if (dropAt != null && els[dropAt]) els[dropAt].classList.remove('is-drop');
  dropAt = undefined;
  clearTimeout(hoverTimer); hoverDir = null;
}
function dropped(dt) {
  var out = [];
  if (dt.items && dt.items.length && dt.items[0].webkitGetAsEntry) {
    for (var i = 0; i < dt.items.length; i++) {
      var en = dt.items[i].kind === 'file' ? dt.items[i].webkitGetAsEntry() : null;
      if (en) out.push(en);
    }
    if (out.length) return out;
  }
  return dt.files;
}
function initDrag() {
  var list = $('tree-list'), body = $('tree-body');
  list.addEventListener('dragstart', function (e) {
    var li = e.target.closest && e.target.closest('.ma-trow');
    if (!li || editing || !model) { e.preventDefault(); return; }
    closeMenu(false);
    dragId = li.dataset.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-ma-node', dragId);
    li.classList.add('is-dragging');
  });
  list.addEventListener('dragend', function () {
    if (dragId && els[dragId]) els[dragId].classList.remove('is-dragging');
    dragId = null; clearDrop();
  });
  body.addEventListener('dragover', function (e) {
    if (!model || (!dragId && !hasFiles(e.dataTransfer))) return;
    e.preventDefault();
    var to = targetOf(e), ok = dragId ? canMove(dragId, to) : true;
    e.dataTransfer.dropEffect = ok ? (dragId ? 'move' : 'copy') : 'none';
    if (ok) showDrop(to); else clearDrop();
    var li = e.target.closest && e.target.closest('.ma-trow'), d = li && li.dataset.id;
    if (d && d !== hoverDir && byId[d] && byId[d].kind === 'dir' && li.getAttribute('aria-expanded') === 'false') {
      clearTimeout(hoverTimer); hoverDir = d;
      hoverTimer = setTimeout(function () { if (hoverDir === d) call('toggle', d); }, 700);
    } else if (d !== hoverDir) { clearTimeout(hoverTimer); hoverDir = null; }
  });
  body.addEventListener('dragleave', function (e) { if (!body.contains(e.relatedTarget)) clearDrop(); });
  body.addEventListener('drop', function (e) {
    if (!model || (!dragId && !hasFiles(e.dataTransfer))) return;
    e.preventDefault();
    var to = targetOf(e), id = dragId;
    clearDrop();
    if (id) { if (canMove(id, to)) moved(id, to); return; }
    call('importDir', dropped(e.dataTransfer), to);
  });
}

/* Folder đích của New file / New folder ở đầu cây: folder đang chọn, hoặc folder chứa file đang chọn. */
function targetDir() {
  var n = byId[cur];
  return !n ? null : n.kind === 'dir' ? n.id : parentOf(n.id);
}

export function initTree() {
  /* Nút đầu cây: biểu tượng dựng bằng icon(). */
  [['tree-new-file', 'file-plus'], ['tree-new-dir', 'folder-plus'], ['tree-import', 'folder-in'], ['tree-zip', 'download'], ['tree-collapse', 'collapse']]
    .forEach(function (p) { $(p[0]).replaceChildren(icon(p[1])); });
  $('tree-new-file').addEventListener('click', function () { call('newFile', targetDir()); });
  $('tree-new-dir').addEventListener('click', function () { call('newDir', targetDir()); });
  $('tree-import').addEventListener('click', function () { $('tree-dir-in').click(); });
  $('tree-dir-in').addEventListener('change', function (e) {
    if (e.target.files && e.target.files.length) call('importDir', e.target.files, null);
    e.target.value = '';
  });
  $('tree-zip').addEventListener('click', function () { call('download', null); });
  $('tree-collapse').addEventListener('click', function () { call('collapseAll'); });

  /* Bề rộng: kéo mép phải hoặc ← → trên mép (như #panel-grip). */
  var g = $('tree-grip');
  g.setAttribute('aria-valuemin', String(W_MIN)); g.setAttribute('aria-valuemax', String(W_MAX));
  treeW = applyW(typeof prefs.treeW === 'number' ? prefs.treeW : W_DEF);
  var grab = 0;   // chỗ bấm cách mép phải cây bao nhiêu: kéo không làm cây nhảy
  g.addEventListener('pointerdown', function (e) { grab = $('tree').getBoundingClientRect().right - e.clientX; });
  dragBar(g, function (x) { treeW = applyW(x + grab - $('tree').getBoundingClientRect().left); },
    function () { prefs.treeW = treeW; savePrefs(); });
  g.addEventListener('keydown', function (e) {
    var d = e.key === 'ArrowRight' ? 16 : e.key === 'ArrowLeft' ? -16 : 0;
    if (!d) return;
    e.preventDefault(); treeW = applyW(treeW + d); prefs.treeW = treeW; savePrefs();
  });

  /* Hàng: bấm mở / gập, bấm đúp (file) đổi tên, ⋯ và chuột phải mở menu. */
  var list = $('tree-list');
  list.addEventListener('click', function (e) {
    var li = e.target.closest('.ma-trow');
    if (!li || !(li.dataset.id in at) || (editing && editing.id === li.dataset.id)) return;
    if (e.target.closest('.ma-trow__more')) { if (menuFor === li.dataset.id) closeMenu(true); else openMenu(li.dataset.id); return; }
    /* Bấm đúp file: đổi tên. Đếm bằng e.detail, không dùng dblclick: lần bấm đầu mở file, nơi gọi có thể vẽ lại hàng. */
    if (e.detail === 2 && byId[li.dataset.id].kind === 'file') { editName(li.dataset.id); return; }
    activate(li.dataset.id);
  });
  list.addEventListener('contextmenu', function (e) {
    var li = e.target.closest('.ma-trow');
    if (!li || editing) return;
    e.preventDefault();
    openMenu(li.dataset.id, e.clientX, e.clientY);
  });
  list.addEventListener('keydown', treeKey);
  /* Focus vào cây (Tab) đi tới hàng giữ tabindex 0; bấm vào hàng thì hàng ấy thành hàng hiện tại. */
  list.addEventListener('focusin', function (e) {
    var li = e.target.closest && e.target.closest('.ma-trow');
    if (li && li.dataset.id in at && li.dataset.id !== cur) setCur(li.dataset.id, false);
  });

  menu = h('div', { class: 'ma-menu', id: 'tree-menu', role: 'menu', 'aria-label': 'File actions' });
  if (menu.showPopover) menu.setAttribute('popover', 'manual');
  $('tree').append(menu);
  menu.addEventListener('keydown', menuKey);
  document.addEventListener('pointerdown', function (e) {
    if (menu.classList.contains('is-open') && !menu.contains(e.target) && !(e.target.closest && e.target.closest('.ma-trow__more'))) closeMenu(false);
  }, true);
  $('tree-body').addEventListener('scroll', function () { closeMenu(false); });
  window.addEventListener('resize', function () { closeMenu(false); });
  initDrag();

  /* Nút thanh trên, Ctrl/⌘ + B (ngoài ô nhập; không khi hộp thoại khác đang mở). */
  $('btn-tree').addEventListener('click', toggle);
  document.addEventListener('keydown', function (e) {
    if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.code !== 'KeyB' || !model || typing(e.target)) return;
    var d = document.querySelector('dialog[open]');
    if (d && d !== $('dlg-tree')) return;
    e.preventDefault();
    toggle();
  });

  /* Tấm trượt: đóng thì cây về chỗ cũ; máy rộng lại thì đóng tấm. */
  home = $('tree').parentNode; homeNext = $('tree').nextSibling;
  $('dlg-tree').addEventListener('close', function () {
    closeMenu(false);
    home.insertBefore($('tree'), homeNext);
    syncBtn();
  });
  mqSide.addEventListener('change', function (e) {
    if (e.matches && $('dlg-tree').open) $('dlg-tree').close();
    syncBtn();
  });
}
