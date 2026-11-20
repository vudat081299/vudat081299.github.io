/* Cây folder + file của phiên: cột fixed sát mép trái màn hình (docked), trên điện thoại thì tấm trượt trái #dlg-tree.
   Docked: trang dời sang phải --tree, vùng làm việc căn giữa phần còn lại (css/tree.css, MDAN-037).
   Chỉ vẽ và nghe sự kiện: không đọc, không ghi phiên. Nơi gọi đưa dữ liệu và các hàm việc qua renderTree(model, actions); mọi
   thay đổi cây đi qua actions, rồi nơi gọi vẽ lại bằng renderTree. Hàng giữ phần tử qua các lần vẽ (khoá theo id).
   model:   { sid, nodes, open, collapsed, counts: { fileId: { c, rv } }, title } (sid: id phiên)
   actions: open(id), toggle(dirId), newFile(parentId), newDir(parentId), rename(id, name) → lỗi | '', move(id, parentId)
            → lỗi | '', remove(id), importDir(FileList | entry[], parentId), download(id | null), collapseAll().
   Docked hay tấm trượt: chỉ theo khổ màn (MDAN-061): điện thoại (mqHandset: ≤ 720px, hay màn cảm ứng thấp ≤ 500px khi xoay ngang) là tấm trượt, đóng sẵn; mọi khổ khác là cột, không
   tự ẩn khi chật (vùng làm việc hẹp lại, người dùng tự ẩn hay kéo hẹp cây). prefs.tree (chưa chọn: hiện; chỉ nút và
   Ctrl/⌘ + B ghi) là "muốn thấy cây": docked thì nút #btn-tree / Ctrl/⌘ + B đổi nó (html.ma-tree-on);
   tấm trượt thì chỉ mở tấm. revealTree(): hiện cho phiên đang vẽ, không ghi prefs (MDAN-032); đổi phiên thì thôi. Bề rộng:
   --tree, kéo #tree-grip 180–420, prefs.treeW. Bàn phím theo mẫu tree của WAI-ARIA (mũi
   tên, Home, End bật vòng focus như Tab, MDAN-020); kéo thả bằng chuột, chỗ thả được theo core canMove. Hàng bị xoá: hàng
   hiện tại thành hàng vào chỗ nó. Đầu cây một hàng (MDAN-060): New file, New folder, ⋯ (#tree-head-menu: Import folder,
   Download .zip, Collapse all, theo mẫu menu button), dưới là ô lọc file (ui/tree-find.js: đang lọc thì chỉ hiện file khớp và
   folder tổ tiên, folder nào cũng mở, bấm folder không gập); phiên ≤ 1 mục thì #tree.is-sparse hiện gợi ý thả / nạp folder. Thụt
   đều mọi cấp: vạch thụt là phần tử riêng (#tree-guides), cây sâu thì thân cuộn ngang (--dmax, .is-x); đổi tên là ô nhập trong suốt
   đúng chỗ tên.
   Xuất: editName, focusRow, initTree, renderTree, revealTree.
   Dùng: core/tree.js, core/text.js, ui/store.js, ui/dom.js, ui/views.js, ui/tree-find.js. */
import { canMove, moveTargets, visibleRows } from '../core/tree.js';
import { plural } from '../core/text.js';
import { prefs, savePrefs } from './store.js';
import { $, dragBar, droppedItems, h, icon, mqHandset, toast, typing } from './dom.js';
import { refreshSplit } from './views.js';
import { findInTree, focusFind, initTreeFind } from './tree-find.js';

var W_MIN = 180, W_MAX = 420, W_DEF = 248;
var model = null, act = {};
var rows = [], at = {}, byId = {};   // hàng đang hiện; id → chỉ số trong rows; id → node
var found = null;                    // kết quả lọc (core/tree-find.js findFiles) hay null khi không lọc
var els = {};                        // id → <li>, giữ qua các lần vẽ (focus, bấm đúp, kéo không mất)
var cur = null;                      // hàng giữ tabindex 0 (roving tabindex)
var editing = null;                  // { id, input, orig } khi đang đổi tên
var lastOpen = null, wasOn = null, docked = false, treeW = W_DEF, curAt = 0;   // curAt: chỉ số của hàng hiện tại ở lần vẽ trước
var shownFor = null;                 // id phiên mà revealTree() hiện cây cho
var hmenu = null;                    // menu ⋯ của đầu cây
var menu = null, menuFor = null, menuSub = false, menuAt = null;   // menuSub: đang ở Move to…; menuAt: chỗ neo của place()
var dragId = null, dropAt, hoverDir = null, hoverTimer = 0;
var seek = '', seekTimer = 0;
var fine = window.matchMedia('(pointer: fine)');

function call(name) {
  var f = act[name];
  return typeof f === 'function' ? f.apply(null, Array.prototype.slice.call(arguments, 1)) || '' : '';
}
function parentOf(id) { var n = byId[id]; return n && n.parent != null ? n.parent : null; }

/* ẨN / HIỆN. docked: cây được là cột trái (chưa chắc đang hiện); không thì nút mở tấm trượt. */
function wantShown() {
  if (model && shownFor === model.sid) return true;
  return typeof prefs.tree === 'boolean' ? prefs.tree : true;
}
function treeShown() { return !!model && docked && wantShown(); }
function syncBtn() {
  var b = $('btn-tree');
  b.hidden = !model;
  var open = docked ? treeShown() : $('dlg-tree').open, lbl = docked ? (open ? 'Hide files' : 'Show files') : 'Files';
  if (docked) b.removeAttribute('aria-haspopup'); else b.setAttribute('aria-haspopup', 'dialog');
  b.setAttribute('aria-expanded', String(open)); b.setAttribute('aria-label', lbl); b.title = lbl;
}
function applyShown() {
  docked = !mqHandset.matches;
  if (docked && $('dlg-tree').open) { $('dlg-tree').close(); goHome(); }   // rời khổ điện thoại: tấm đóng, cây về cột ngay (sự kiện close đến sau)
  var on = treeShown();
  syncBtn();
  if (on === wasOn) return;
  wasOn = on;
  if (!on && $('tree').parentNode === home && $('tree').contains(document.activeElement)) $('btn-tree').focus();
  document.documentElement.classList.toggle('ma-tree-on', on);
  refreshSplit();   // #doc đổi bề rộng: Split hiện / ẩn ngay
}
/* Người dùng bật / tắt khi docked (nút, Ctrl/⌘ + B): ghi prefs.tree. */
function setTreeShown(on) { prefs.tree = !!on; shownFor = null; savePrefs(); applyShown(); }
/* Hiện cây cho phiên đang vẽ (nạp folder xong), không ghi lựa chọn: phiên khác theo prefs.tree như cũ. Tấm trượt: không tự mở. */
export function revealTree() { if (model) { shownFor = model.sid; applyShown(); } }
/* Focus hàng id khi cây đang hiện (cột hay tấm trượt), VD sau Undo: focus không rơi về body. */
export function focusRow(id) {
  if (!(id in at) || !(docked ? treeShown() : $('dlg-tree').open)) return;
  setCur(id, true);
}
function toggle() {
  if (!model) return;
  if (docked) { setTreeShown(!treeShown()); return; }
  if ($('dlg-tree').open) $('dlg-tree').close(); else openSheet();
}

/* TẤM TRƯỢT (điện thoại): cây vào #dlg-tree khi mở, đóng thì về chỗ cũ (con của body). */
var home = null, homeNext = null;
function openSheet() {
  closeMenu(false); closeHead(false);
  $('dlg-tree').append($('tree'));
  $('dlg-tree').showModal();
  syncBtn();
  var li = els[cur];
  if (li && li.isConnected) { li.focus({ preventScroll: true }); reveal(li); }
}
function closeSheet() { if ($('dlg-tree').open) $('dlg-tree').close(); }
function goHome() { if ($('tree').parentNode !== home) home.insertBefore($('tree'), homeNext); }

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
  /* Đuôi: huy hiệu rồi ⋯ (css/tree.css: chuột thì ⋯ đè chỗ huy hiệu khi rê). */
  var end = h('span', { class: 'ma-trow__end' }, meta.childNodes.length ? meta : null,
    h('button', { class: 'ma-icbtn ma-icbtn--bare ma-trow__more', type: 'button', tabindex: '-1', 'aria-haspopup': 'menu',
      'aria-label': 'Actions for ' + n.name, title: 'More actions' }, icon('dots')));
  li.replaceChildren(
    h('span', { class: 'ma-trow__chev', 'aria-hidden': 'true' }, dir ? icon('chev') : null),
    h('span', { class: 'ma-trow__ic', 'aria-hidden': 'true' }, icon(dir ? (shut ? 'folder' : 'folder-open') : 'file')),
    h('span', { class: 'ma-trow__name' }, n.name), end);
}
function rowEl(r, pos, size, path) {
  var n = r.node, li = els[n.id];
  if (!li) { li = h('li', { class: 'ma-trow', role: 'treeitem' }); li.dataset.id = n.id; els[n.id] = li; }
  li.setAttribute('aria-level', String(r.depth + 1));
  li.setAttribute('aria-posinset', String(pos)); li.setAttribute('aria-setsize', String(size));
  li.style.setProperty('--depth', String(r.depth));
  if (n.kind === 'dir') {
    li.setAttribute('aria-expanded', String(!!found || (model.collapsed || []).indexOf(n.id) < 0));
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
/* Cuộn thân cây vừa đủ để thấy hàng (không cuộn trang): dọc cả hàng; ngang (cây sâu rộng hơn thân) từ ô chevron về phía mép
   phải hàng, ô chevron luôn trong tầm nhìn. */
function reveal(li) {
  var b = $('tree-body'), r = li.getBoundingClientRect(), q = b.getBoundingClientRect();
  if (r.top < q.top) b.scrollTop -= q.top - r.top + 4;
  else if (r.bottom > q.top + b.clientHeight) b.scrollTop += r.bottom - (q.top + b.clientHeight) + 4;
  var ch = li.querySelector('.ma-trow__chev');
  if (!ch || b.scrollWidth <= b.clientWidth) return;
  var off = b.scrollLeft - q.left - b.clientLeft;   // đổi toạ độ màn hình sang toạ độ trong vùng cuộn
  var x0 = Math.max(0, ch.getBoundingClientRect().left + off - 12), x1 = r.right + off;
  if (x0 < b.scrollLeft) b.scrollLeft = x0;
  else if (x1 > b.scrollLeft + b.clientWidth) b.scrollLeft = Math.min(x0, x1 - b.clientWidth);
}
/* VẠCH THỤT: một vạch cho mỗi folder đang hiện con, dài đúng các hàng con cháu (vị trí, độ dài: css/tree.css theo --d, --i,
   --n). --dmax (cấp sâu nhất đang hiện) cho khối hàng bề rộng tối thiểu: thụt không bị nén, thân cuộn ngang. */
function paintGuides() {
  var out = [], dmax = 0;
  rows.forEach(function (r, i) {
    if (r.depth > dmax) dmax = r.depth;
    var n = 0;
    while (rows[i + 1 + n] && rows[i + 1 + n].depth > r.depth) n++;
    if (!n) return;
    var g = h('div', { class: 'ma-tree__g', style: '--d:' + r.depth + ';--i:' + (i + 1) + ';--n:' + n });
    g.dataset.for = r.node.id;
    out.push(g);
  });
  $('tree-guides').replaceChildren.apply($('tree-guides'), out);
  $('tree-rows').style.setProperty('--dmax', String(dmax));
  syncX();
}
/* Thân tràn ngang (cây sâu) thì đuôi dính mép phải có nền che phần tên cuộn dưới nó (css/tree.css .is-x); không tràn thì
   đuôi không vẽ gì ngoài nút. Gọi khi vẽ cây và khi thân đổi cỡ (kéo mép, thanh cuộn dọc hiện / ẩn). */
function syncX() { var b = $('tree-body'); b.classList.toggle('is-x', b.scrollWidth > b.clientWidth); }
/* Vạch đậm: folder đang mở là hàng hiện tại thì vạch của nó, không thì vạch của folder chứa hàng hiện tại (như VS Code). */
function markGuide() {
  var i = at[cur], on = null;
  if (i != null) on = rows[i + 1] && rows[i + 1].depth > rows[i].depth ? cur : parentOf(cur);
  Array.prototype.forEach.call($('tree-guides').children, function (g) { g.classList.toggle('is-on', on != null && g.dataset.for === String(on)); });
}

export function renderTree(m, actions) {
  var ae = document.activeElement;
  var hadFocus = !!(ae && ae.classList && ae.classList.contains('ma-trow') && $('tree').contains(ae));
  var same = !!model && model.sid === m.sid;
  if (!same) shownFor = null;
  model = m; act = actions || {};
  byId = {};
  m.nodes.forEach(function (n) { byId[n.id] = n; });
  found = findInTree(m.nodes, same);
  rows = visibleRows(m.nodes, m.collapsed || [], found && found.keep);
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
  var nf = m.nodes.filter(function (n) { return n.kind === 'file'; }).length;
  /* Phiên trống chưa có tên: không lặp chữ "Files" dưới nhãn FILES. */
  $('tree-title').textContent = m.title || 'Untitled session';
  $('tree-title').title = (m.title || 'Untitled session') + ' · ' + plural(nf, 'file');
  $('tree').classList.toggle('is-sparse', m.nodes.length <= 1);

  /* Hàng hiện tại vừa mất (xoá, gập folder chứa nó): hàng vào chỗ nó; chưa có thì file mở. */
  if (same && cur != null && !(cur in at) && rows.length) cur = rows[Math.min(curAt, rows.length - 1)].node.id;
  if (cur == null || !(cur in at)) cur = m.open in at ? m.open : (rows[0] ? rows[0].node.id : null);
  curAt = cur in at ? at[cur] : 0;
  rows.forEach(function (r) { els[r.node.id].tabIndex = r.node.id === cur ? 0 : -1; });
  paintGuides(); markGuide();
  if (hadFocus && cur != null && !editing) els[cur].focus({ preventScroll: true });
  var shownOpen = null;
  if (m.open !== lastOpen) {
    lastOpen = m.open;
    if (m.open in at) { if (!hadFocus) setCur(m.open, false); shownOpen = els[m.open]; }
  }
  if (menuFor && !(menuFor in at)) closeMenu(false);
  applyShown();
  /* Cuộn tới file mở sau khi cây đã hiện (ẩn thì thân rộng 0, không đo được). */
  if (shownOpen) reveal(shownOpen);
}
function setCur(id, focus) {
  if (!(id in at)) return;
  if (cur != null && els[cur]) els[cur].tabIndex = -1;
  cur = id; curAt = at[id]; els[id].tabIndex = 0;
  markGuide();
  if (focus) { els[id].focus({ preventScroll: true }); reveal(els[id]); }
}

/* Bấm hàng / Enter: file thì mở (đóng tấm trượt), folder thì gập / mở. */
function activate(id) {
  var n = byId[id];
  if (!n) return;
  setCur(id, true);
  if (n.kind === 'dir') { if (!found) call('toggle', id); return; }
  call('open', id);
  closeSheet();
}

/* ĐỔI TÊN ngay trên tên: ô nhập trong suốt thay chỗ tên, cùng chữ, cùng vị trí (css/tree.css). Enter lưu (lỗi thì toast,
   vẫn sửa), Esc bỏ, rời ô thì lưu (lỗi thì toast, bỏ). */
export function editName(id) {
  var li = els[id], n = byId[id];
  if (!li || !li.isConnected || !n) return;
  closeMenu(false);
  if (editing) endEdit(false);
  setCur(id, false);
  var inp = h('input', { class: 'ma-input ma-trow__ren', type: 'text', value: n.name, spellcheck: 'false', autocomplete: 'off',
    'aria-label': 'Rename ' + n.name });
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
  inp.focus({ preventScroll: true });
  reveal(li);
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
      onclick: function () { menuSub = true; fillMenu(moveItems(id)); } }, icon('folder'), h('span', null, 'Move to…')),
    item('download', n.kind === 'dir' ? 'Download .zip' : 'Download', function () { call('download', id); }),
    h('div', { class: 'ma-menu__sep', role: 'separator' }),
    item('trash', 'Delete', function () { call('remove', id); }, { danger: true }));
  return out;
}
/* Move to…: chỗ đến và chỗ nào được (folder hiện tại, trùng tên thì tắt) từ core moveTargets. */
function moveItems(id) {
  var out = [
    h('button', { class: 'ma-menu__i', type: 'button', role: 'menuitem', tabindex: '-1',
      onclick: function () { backMenu(id); } }, icon('back'), h('span', null, 'Back')),
    h('div', { class: 'ma-menu__h', role: 'presentation' }, 'Move ' + byId[id].name + ' to')
  ];
  moveTargets(model.nodes, id).forEach(function (t) {
    out.push(item(t.id == null ? null : 'folder', t.id == null ? 'Top level' : t.name, function () { moved(id, t.id); },
      { disabled: !t.ok, depth: t.depth }));
  });
  return out;
}
/* Từ Move to… về menu chính, focus ở Move to…. */
function backMenu(id) {
  menuSub = false;
  fillMenu(mainItems(id));
  var b = menu.querySelector('[aria-haspopup]');
  if (b) b.focus();
}
function moved(id, to) { var err = call('move', id, to); if (err) toast(err); }
function menuItems(m) { return Array.prototype.filter.call((m || menu).querySelectorAll('.ma-menu__i'), function (b) { return !b.disabled; }); }
/* Thay ruột menu (menu chính ↔ Move to…) rồi đặt lại trong khung nhìn: menu con cao hơn. */
function fillMenu(items) {
  menu.replaceChildren.apply(menu, items);
  if (menuAt) place.apply(null, menuAt);
  var first = menuItems()[0];
  if (first) first.focus();
}
function openMenu(id, x, y) {
  closeMenu(false); closeHead(false);
  var li = els[id];
  if (!li || !byId[id]) return;
  setCur(id, false);
  menuFor = id; menuSub = false; li.classList.add('is-menu');
  menu.replaceChildren.apply(menu, mainItems(id));
  menu.classList.add('is-open');
  if (menu.showPopover) { try { menu.showPopover(); } catch (e) {} }
  if (x == null) {
    var b = li.querySelector('.ma-trow__more'), r = (b || li).getBoundingClientRect();
    menuAt = [r.right, r.bottom + 2, true, r.top - 2];
  } else menuAt = [x, y, false, y];
  place.apply(null, menuAt);
  var first = menuItems()[0];
  if (first) first.focus();
}
/* Đặt menu trong khung nhìn: dưới điểm neo (căn phải theo nút ⋯), thiếu chỗ thì lên trên. */
function place(x, y, alignRight, above) { placeAt(menu, x, y, alignRight, above); }
function placeAt(menu, x, y, alignRight, above) {
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
  menuFor = null; menuSub = false; menuAt = null;
  if (els[id]) els[id].classList.remove('is-menu');
  if (refocus && id in at) setCur(id, true);
}
/* Phím mũi tên, Home, End là dùng bàn phím: bật vòng focus như Tab (MDAN-020). */
function kbd() { document.documentElement.classList.add('ma-tabbing'); }
function menuKey(e) {
  var its = menuItems(), i = its.indexOf(document.activeElement), k = e.key;
  if (k === 'ArrowDown' || k === 'ArrowUp') { kbd(); if (its.length) its[(i + (k === 'ArrowDown' ? 1 : -1) + its.length) % its.length].focus(); }
  else if (k === 'Home') { kbd(); if (its[0]) its[0].focus(); }
  else if (k === 'End') { kbd(); if (its.length) its[its.length - 1].focus(); }
  else if (k === 'Escape' && menuSub) backMenu(menuFor);   // Move to…: Esc lùi một cấp
  else if (k === 'Escape') closeMenu(true);
  else if (k === 'Tab') closeMenu(true);
  else return;
  e.preventDefault(); e.stopPropagation();
}

/* MENU ⋯ ĐẦU CÂY (mẫu menu button WAI-ARIA): bấm / Enter / Space / ↓ mở và vào mục đầu, ↑ vào mục cuối; Esc, Tab đóng,
   focus về nút. Mục là nút thật trong #tree-head-menu (#tree-import, #tree-zip, #tree-collapse). */
function headOpen() { return !!hmenu && hmenu.classList.contains('is-open'); }
function openHead(last) {
  closeMenu(false);
  hmenu.classList.add('is-open');
  if (hmenu.showPopover) { try { hmenu.showPopover(); } catch (e) {} }
  $('tree-more').setAttribute('aria-expanded', 'true');
  var r = $('tree-more').getBoundingClientRect();
  placeAt(hmenu, r.right, r.bottom + 2, true, r.top - 2);
  var its = menuItems(hmenu);
  if (its.length) its[last ? its.length - 1 : 0].focus();
}
function closeHead(refocus) {
  if (!headOpen()) return;
  hmenu.classList.remove('is-open');
  if (hmenu.hidePopover) { try { hmenu.hidePopover(); } catch (e) {} }
  $('tree-more').setAttribute('aria-expanded', 'false');
  if (refocus) $('tree-more').focus();
}
function headKey(e) {
  var its = menuItems(hmenu), i = its.indexOf(document.activeElement), k = e.key;
  if (k === 'ArrowDown' || k === 'ArrowUp') { kbd(); if (its.length) its[(i + (k === 'ArrowDown' ? 1 : -1) + its.length) % its.length].focus(); }
  else if (k === 'Home') { kbd(); if (its[0]) its[0].focus(); }
  else if (k === 'End') { kbd(); if (its.length) its[its.length - 1].focus(); }
  else if (k === 'Escape' || k === 'Tab') closeHead(true);
  else return;
  e.preventDefault(); e.stopPropagation();
}
function initHead() {
  hmenu = $('tree-head-menu');
  if (hmenu.showPopover) hmenu.setAttribute('popover', 'manual');
  $('tree-more').replaceChildren(icon('dots'));
  [['tree-import', 'folder-in'], ['tree-zip', 'download'], ['tree-collapse', 'collapse']]
    .forEach(function (p) { $(p[0]).prepend(icon(p[1])); });
  $('tree-more').addEventListener('click', function () { if (headOpen()) closeHead(true); else openHead(false); });
  $('tree-more').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault(); e.stopPropagation(); kbd(); openHead(e.key === 'ArrowUp');
  });
  hmenu.addEventListener('keydown', headKey);
  $('tree-import').addEventListener('click', function () { closeHead(false); $('tree-dir-in').click(); });
  $('tree-zip').addEventListener('click', function () { closeHead(true); call('download', null); });
  $('tree-collapse').addEventListener('click', function () { closeHead(true); call('collapseAll'); });
  $('tree-hint-import').addEventListener('click', function () { $('tree-dir-in').click(); });
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
  if (/^(?:Arrow(?:Up|Down|Left|Right)|Home|End)$/.test(k)) kbd();
  if (k === 'ArrowDown') go(i + 1);
  else if (k === 'ArrowUp') go(i - 1);
  else if (k === 'Home') go(0);
  else if (k === 'End') go(rows.length - 1);
  else if (k === 'ArrowRight') {
    if (n.kind === 'dir' && li.getAttribute('aria-expanded') === 'false') call('toggle', id);
    else if (n.kind === 'dir' && rows[i + 1] && rows[i + 1].depth > r.depth) go(i + 1);
  } else if (k === 'ArrowLeft') {
    if (n.kind === 'dir' && li.getAttribute('aria-expanded') === 'true' && !found) call('toggle', id);
    else if (n.parent != null && n.parent in at) go(at[n.parent]);
  } else if (k === 'Enter' || k === ' ') activate(id);
  else if (k === 'F2') editName(id);
  else if (del) call('remove', id);
  else if (k === 'ContextMenu' || (k === 'F10' && e.shiftKey)) openMenu(id);
  else if (k === '/') { if (!focusFind()) return; }
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
    var to = targetOf(e), ok = dragId ? canMove(model.nodes, dragId, to) : true;
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
    if (id) { if (canMove(model.nodes, id, to)) moved(id, to); return; }
    call('importDir', droppedItems(e.dataTransfer), to);
  });
}

/* Folder đích của New file / New folder ở đầu cây: folder đang chọn, hoặc folder chứa file đang chọn. */
function targetDir() {
  var n = byId[cur];
  return !n ? null : n.kind === 'dir' ? n.id : parentOf(n.id);
}

export function initTree() {
  /* Nút đầu cây: biểu tượng dựng bằng icon(); menu ⋯. */
  [['tree-new-file', 'file-plus'], ['tree-new-dir', 'folder-plus']].forEach(function (p) { $(p[0]).replaceChildren(icon(p[1])); });
  $('tree-new-file').addEventListener('click', function () { call('newFile', targetDir()); });
  $('tree-new-dir').addEventListener('click', function () { call('newDir', targetDir()); });
  initHead();
  initTreeFind(function () { if (model) renderTree(model, act); }, function () { if (rows.length) { kbd(); setCur(rows[0].node.id, true); } });
  if (window.ResizeObserver) new ResizeObserver(syncX).observe($('tree-body'));
  $('tree-dir-in').addEventListener('change', function (e) {
    if (e.target.files && e.target.files.length) call('importDir', e.target.files, null);
    e.target.value = '';
  });

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

  /* Hàng: bấm mở / gập, bấm đúp đổi tên (file và folder), ⋯ và chuột phải mở menu. */
  var list = $('tree-list');
  list.addEventListener('click', function (e) {
    var li = e.target.closest('.ma-trow');
    if (!li || !(li.dataset.id in at) || (editing && editing.id === li.dataset.id)) return;
    if (e.target.closest('.ma-trow__more')) { if (menuFor === li.dataset.id) closeMenu(true); else openMenu(li.dataset.id); return; }
    /* Bấm đúp (file hay folder): đổi tên. Đếm bằng e.detail, không dùng dblclick: lần bấm đầu đã mở file / gập folder
       và nơi gọi có thể vẽ lại hàng. Folder: lần bấm thứ hai trả folder về như trước lần bấm đầu rồi mới đổi tên. */
    var id = li.dataset.id;
    if (e.detail === 2) {
      if (byId[id].kind === 'dir') activate(id);
      editName(id); return;
    }
    if (e.detail > 2) return;
    activate(id);
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
    if (headOpen() && !hmenu.contains(e.target) && !(e.target.closest && e.target.closest('#tree-more'))) closeHead(false);
  }, true);
  $('tree-body').addEventListener('scroll', function () { closeMenu(false); closeHead(false); });
  window.addEventListener('resize', function () { closeMenu(false); closeHead(false); });
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

  /* Tấm trượt: đóng thì cây về chỗ cũ. Qua lại khổ điện thoại: xét lại docked. */
  home = $('tree').parentNode; homeNext = $('tree').nextSibling;
  $('dlg-tree').addEventListener('close', function () {
    closeMenu(false); closeHead(false);
    goHome();
    syncBtn();
  });
  mqHandset.addEventListener('change', applyShown);
}
