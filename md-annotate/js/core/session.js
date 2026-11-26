/* Mô hình phiên, thuần (dữ liệu thường, không DOM, không localStorage): một phiên là một cây folder + file text.
   Tạo phiên, chuẩn hoá phiên đọc từ bộ nhớ (nâng phiên cũ một văn bản thành một file), thêm / xoá / đổi tên / chuyển nút
   mà docs luôn khớp nodes, Undo của xoá / chuyển, nhãn file trong prompt, tên tự đặt, danh sách phiên (index), tên và
   kiểu file tải về, file để tải .zip. Đọc / ghi bộ nhớ ở ui/state.js.
   Phiên: { id, name, named, created, updated, header, footer, fmt, includeDoc, lineNums, path, rvPrompt, promptAll,
     nodes: [{ id, parent, kind, name }] (core/tree.js), docs: { fileId: doc }, open: fileId, collapsed: [dirId],
     hints: số đếm gợi ý của riêng phiên (core/hints.js, MDAN-088) }.
   doc: { text, comments, reviews, rvPct?, real, legacy? } — comments / reviews như trước (core/comments.js, core/review.js);
     real: tên file là thật (mở / nạp từ đĩa, người dùng đổi tên), file dán chữ tên tự đặt untitled.md thì false;
     legacy: file nâng từ phiên cũ mà path cũ không tách được thành tên file (VD 'docs/', '.'): nhãn là path nguyên văn.
   path: tiền tố thư mục trên đĩa (VD 'docs/'), ghép trước đường dẫn trong cây ở nhãn prompt (fileLabel).
   Bất biến (normSession giữ): ≥ 1 file; open là một file trong nodes; mỗi file đúng một docs[id], không doc thừa.
   Hàm đổi cây (addFile, addDir, addPaths, importPaths, openFromDisk, removeNodes, renameIn, moveIn, openFile, reveal,
   toggleDir, collapseAll, applyUndo) không sửa phiên đầu vào:
   trả phiên mới (chép nông; nodes, docs, collapsed là mảng / object mới; doc không đổi thì dùng chung).
   Xuất: addDir, addFile, addPaths, applyUndo, autoName, collapseAll, createSession, dirOf, docOf, downloadOf, fileCount,
     fileLabel, importPaths, indexWith, indexWithout, isEmpty, moveIn, normIndex, normSession, openFile, openFromDisk,
     removeNodes, renameIn, renameIndex, renameSession, reveal, sessionTitle, textTitle, toggleDir, touchSession, treeFiles,
     uid, UNTITLED, zipOf.
   Dùng: core/tree.js, core/text.js, core/file-type.js, core/zip.js, core/hints.js. */
import { addNode, afterRemove, byId, filesInOrder, firstFile, fromPaths, kids, moveMany, nameError, pathOf, removeNode, renameNode,
  subtree, uniqueName, visibleRows } from './tree.js';
import { slug } from './text.js';
import { fileType } from './file-type.js';
import { zipFiles } from './zip.js';
import { normStats, statsFromDocs } from './hints.js';

export var UNTITLED = 'untitled.md';

export function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function emptyDoc(text, real) { return { text: text || '', comments: [], reviews: [], real: !!real }; }

/* Phiên mới, một file untitled.md (real: false) chứa text; lời dẫn và kiểu prompt lấy từ tuỳ chọn người dùng (prefs). */
export function createSession(text, prefs) {
  var t = Date.now(), f = uid(), docs = {};
  prefs = prefs || {};
  docs[f] = emptyDoc(text, false);
  return {
    id: uid(), name: '', named: false, created: t, updated: t,
    header: typeof prefs.header === 'string' ? prefs.header : '',
    footer: typeof prefs.footer === 'string' ? prefs.footer : '',
    fmt: prefs.fmt === 'block' ? 'block' : 'inline', includeDoc: false,
    lineNums: true, path: '', rvPrompt: false, promptAll: false,
    nodes: [{ id: f, parent: null, kind: 'file', name: UNTITLED }], docs: docs, open: f, collapsed: [], hints: { items: {} }
  };
}

/* Phiên đọc từ bộ nhớ (s có thể hỏng): sửa tại chỗ cho đúng khuôn, hoặc null nếu không dùng được.
   Phiên cũ (text là chuỗi, không có nodes) nâng tại chỗ thành một file: tên là phần sau '/' (hoặc '\') cuối của path cũ,
   real: true, phần trước thành tiền tố path; path cũ không có tên dùng được ('docs/', '.', quá dài) thì untitled.md,
   real: false, legacy: true và path giữ nguyên văn. Nhờ vậy nhãn prompt (fileLabel) đúng bằng path cũ và prompt y hệt
   từng byte. Phiên chưa có hints (lưu trước MDAN-088) dựng số đếm từ nhận xét của chính nó (statsFromDocs). */
export function normSession(s, id) {
  if (!s || typeof s !== 'object') return null;
  if (!Array.isArray(s.nodes)) {
    if (typeof s.text !== 'string') return null;
    upgrade(s);
  }
  s.id = id;
  ['name', 'header', 'footer', 'path'].forEach(function (k) { if (typeof s[k] !== 'string') s[k] = ''; });
  s.named = !!s.named;
  s.fmt = s.fmt === 'block' ? 'block' : 'inline';
  s.includeDoc = !!s.includeDoc;
  s.lineNums = s.lineNums !== false;
  s.rvPrompt = s.rvPrompt === true;
  s.promptAll = s.promptAll === true;
  normTree(s);
  s.hints = s.hints && typeof s.hints === 'object' ? normStats(s.hints) : statsFromDocs(s.docs);
  s.created = +s.created || Date.now(); s.updated = +s.updated || s.created;
  return s;
}
function upgrade(s) {
  var p = typeof s.path === 'string' ? s.path.trim() : '';
  var k = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\')), name = p.slice(k + 1);
  var real = !!name && !nameError([], null, name, null);
  var f = uid(), doc = { text: s.text, comments: s.comments, reviews: s.reviews, real: real };
  if ('rvPct' in s) doc.rvPct = s.rvPct;
  if (!real && p) doc.legacy = true;
  s.path = real ? p.slice(0, k + 1) : p;
  s.nodes = [{ id: f, parent: null, kind: 'file', name: real ? name : UNTITLED }];
  s.docs = {}; s.docs[f] = doc;
  s.open = f; s.collapsed = [];
  delete s.text; delete s.comments; delete s.reviews; delete s.rvPct;
}
/* Cây và docs: bỏ nút hỏng, file không có doc dùng được; cha mất / không phải folder / vòng thì về gốc; tên hỏng hay
   trùng anh em thì đổi; doc thừa bỏ; không còn file thì thêm untitled.md rỗng; open, collapsed về giá trị hợp lệ. */
function normTree(s) {
  var docs = s.docs && typeof s.docs === 'object' && !Array.isArray(s.docs) ? s.docs : {};
  var seen = new Set(), nodes = [], out = {};
  s.nodes.forEach(function (n) {
    if (!n || typeof n !== 'object' || typeof n.id !== 'string' || !n.id || n.id === '__proto__' || seen.has(n.id)) return;
    if (n.kind !== 'dir' && n.kind !== 'file') return;
    if (n.kind === 'file' && !(out[n.id] = normDoc(Object.prototype.hasOwnProperty.call(docs, n.id) ? docs[n.id] : null))) {
      delete out[n.id];
      return;
    }
    seen.add(n.id);
    nodes.push({ id: n.id, parent: typeof n.parent === 'string' ? n.parent : null, kind: n.kind,
      name: typeof n.name === 'string' ? n.name : '' });
  });
  var kind = new Map(nodes.map(function (n) { return [n.id, n.kind]; }));
  nodes.forEach(function (n) { if (n.parent !== null && (n.parent === n.id || kind.get(n.parent) !== 'dir')) n.parent = null; });
  /* Vòng cha – con: nút không tới được từ gốc; cắt nút đầu tiên của phần còn lại về gốc, lặp tới khi tới được hết. */
  for (;;) {
    var reach = new Set(visibleRows(nodes, []).map(function (r) { return r.node.id; }));
    var lost = nodes.filter(function (n) { return !reach.has(n.id); });
    if (!lost.length) break;
    lost[0].parent = null;
  }
  /* Tên: hỏng thì đặt lại, trùng anh em thì nút sau đổi tên (theo thứ tự lưu). */
  var taken = new Map();
  nodes.forEach(function (n) {
    var sib = taken.get(n.parent) || [];
    var nm = n.name.trim(), bad = nameError([], null, nm, null);
    var name = bad ? (n.kind === 'file' ? UNTITLED : 'folder') : nm;
    n.name = uniqueName(sib, null, name);
    sib.push({ id: n.id, parent: null, kind: n.kind, name: n.name });
    taken.set(n.parent, sib);
  });
  var files = filesInOrder(nodes);
  if (!files.length) {
    var f = uid();
    nodes.push({ id: f, parent: null, kind: 'file', name: uniqueName(nodes, null, UNTITLED) });
    out[f] = emptyDoc('', false);
    files = [f];
  }
  s.nodes = nodes; s.docs = out;
  if (files.indexOf(s.open) < 0) s.open = files[0];
  var dirs = new Set(nodes.filter(function (n) { return n.kind === 'dir'; }).map(function (n) { return n.id; }));
  s.collapsed = Array.isArray(s.collapsed) ? s.collapsed.filter(function (d, i, a) { return dirs.has(d) && a.indexOf(d) === i; }) : [];
}
/* Một doc đọc từ bộ nhớ: sửa tại chỗ (luật nhận xét, parts, dấu đã đọc như trước), hoặc null khi text không phải chuỗi. */
function normDoc(d) {
  if (!d || typeof d !== 'object' || typeof d.text !== 'string') return null;
  d.comments = Array.isArray(d.comments) ? d.comments.filter(function (c) {
    return c && typeof c.quote === 'string' && typeof c.comment === 'string';
  }) : [];
  d.comments.forEach(function (c) {
    if (!c.id) c.id = uid();
    normSelector(c);
    /* parts (nhận xét nhiều dòng) là trường thêm, không đổi khoá: hỏng hoặc dưới hai phần thì bỏ, còn quote ở ngoài. */
    if ('parts' in c) {
      var ps = Array.isArray(c.parts) ? c.parts.filter(function (p) { return p && typeof p.quote === 'string' && p.quote; }) : [];
      if (ps.length > 1) c.parts = ps.map(normSelector); else delete c.parts;
    }
  });
  /* reviews (dấu đã đọc, core/review.js): thiếu hay hỏng thì mặc định. */
  d.reviews = Array.isArray(d.reviews) ? d.reviews.filter(function (m) { return m && typeof m.h === 'string' && m.h; })
    .map(function (m) {
      return { h: m.h, p: typeof m.p === 'string' ? m.p : '', n: typeof m.n === 'string' ? m.n : '',
        q: typeof m.q === 'string' ? m.q : '', r: Number.isFinite(m.r) ? Math.max(0, Math.min(1, m.r)) : 0 };
    }) : [];
  if (!Number.isFinite(d.rvPct)) delete d.rvPct;
  d.real = d.real === true;
  if (d.legacy !== true || d.real) delete d.legacy;
  return d;
}
/* Ngữ cảnh neo của một đoạn trích (nhận xét hay một phần) sửa tại chỗ cho đúng kiểu: rel không phải số thì locate
   không chọn được chỗ nào khi trích dẫn khớp nhiều chỗ. */
function normSelector(p) {
  if (typeof p.prefix !== 'string') p.prefix = '';
  if (typeof p.suffix !== 'string') p.suffix = '';
  if (p.origin !== 'md') p.origin = 'src';
  p.rel = Number.isFinite(p.rel) ? Math.max(0, Math.min(1, p.rel)) : 0;
  return p;
}
/* Danh sách phiên đọc từ bộ nhớ: bỏ mục hỏng; giờ sửa luôn là số (hộp History định dạng nó thành ngày). */
export function normIndex(a) {
  return Array.isArray(a) ? a.filter(function (e) { return e && typeof e === 'object' && e.id; })
    .map(function (e) { e.updated = +e.updated || 0; return e; }) : [];
}

/* ── đọc ── */

/* doc của một file (mặc định file đang mở), hoặc null. */
export function docOf(s, id) {
  var k = id === undefined ? s.open : id;
  return Object.prototype.hasOwnProperty.call(s.docs, k) ? s.docs[k] : null;
}
export function fileCount(s) { return s.nodes.filter(function (n) { return n.kind === 'file'; }).length; }
/* Tiền tố path ghép trước đường dẫn trong cây: thiếu '/' cuối thì thêm. */
function prefixOf(s) {
  var p = s.path.trim();
  return p && !/[\/\\]$/.test(p) ? p + '/' : p;
}
/* Nhãn file trong prompt khi bật số dòng (MDAN-029): tiền tố + đường dẫn trong cây khi phiên có ≥ 2 file hoặc file có tên
   thật (real); phiên một file chưa có tên thật thì '' (prompt ghi L12), dù ô Folder có chữ — trừ file nâng từ phiên cũ
   (legacy): nhãn là ô Folder nguyên văn, như bản một văn bản. */
export function fileLabel(s, fileId) {
  var d = docOf(s, fileId);
  if (!d) return '';
  var many = fileCount(s) > 1;
  if (!many && !d.real) return d.legacy ? s.path.trim() : '';
  return prefixOf(s) + pathOf(s.nodes, fileId);
}
/* Tên gợi ý từ chữ: tiêu đề markdown đầu tiên, không thì dòng có chữ đầu tiên; '' khi không có. */
export function textTitle(t) {
  var m = t.match(/^[ \t]*#{1,6}[ \t]+(.+)$/m) || t.match(/^[ \t]*(\S.*)$/m);
  var line = m ? m[1] : '';
  return line.replace(/\]\([^)]*\)/g, '').replace(/[*_`#>\[\]|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
}
/* Tên tự đặt (MDAN-027), không theo file đang mở: gốc chỉ có một folder thì tên folder; không thì tên lấy từ chữ của file
   đầu tiên theo thứ tự cây có chữ; không có thì 'Untitled session'. */
export function autoName(s) {
  var top = kids(s.nodes, null);
  if (top.length === 1 && top[0].kind === 'dir') return top[0].name;
  var ids = filesInOrder(s.nodes);
  for (var i = 0; i < ids.length; i++) { var t = textTitle(s.docs[ids[i]].text); if (t) return t; }
  return 'Untitled session';
}
/* Tên phiên đang dùng: tên người dùng đặt, không thì tên tự đặt; phiên trống thì ''. */
export function sessionTitle(s) { return s.named ? s.name : isEmpty(s) ? '' : autoName(s); }
/* Phiên trống: một file, không folder, chữ rỗng, không nhận xét. */
export function isEmpty(s) {
  var d = docOf(s);
  return s.nodes.length === 1 && !d.text.trim() && !d.comments.length;
}
/* Folder chứa nút id (null = gốc, hay id không có). */
export function dirOf(s, id) {
  var n = byId(s.nodes, id);
  return n && n.parent != null ? n.parent : null;
}
/* Mọi file theo thứ tự hiển thị, đường dẫn trong cây (không tiền tố); folder rỗng thành 'a/b/' để .zip giữ nó.
   rootId (folder): chỉ cây con của nó, đường dẫn tính từ folder cha của nó ('notes/a.md'). */
export function treeFiles(s, rootId) {
  var out = [], keep = rootId == null ? null : new Set(subtree(s.nodes, rootId));
  var up = rootId == null || dirOf(s, rootId) === null ? '' : pathOf(s.nodes, dirOf(s, rootId)) + '/';
  var rel = function (id) { return pathOf(s.nodes, id).slice(up.length); };
  var mine = function (id) { return !keep || keep.has(id); };
  filesInOrder(s.nodes).forEach(function (id) { if (mine(id)) out.push({ path: rel(id), text: s.docs[id].text }); });
  s.nodes.forEach(function (n) {
    if (n.kind === 'dir' && mine(n.id) && subtree(s.nodes, n.id).length === 1) out.push({ path: rel(n.id) + '/', text: '' });
  });
  return out;
}
/* Cả cây (hoặc cây con của folder rootId) thành file .zip (Uint8Array), date là giờ ghi vào các mục. */
export function zipOf(s, date, rootId) { return zipFiles(treeFiles(s, rootId), date); }
/* Tải một nút (id) hay cả phiên (null): { name, type, zip }. File: kiểu text/markdown khi là markdown (core/file-type.js
   fileType: .md, .mdx, không đuôi mà không phải tên ngôn ngữ), không thì text/plain; tên của nó, markdown thiếu đuôi thì
   thêm .md (Makefile giữ nguyên). Folder: <tên>.zip; cả phiên: <slug tên phiên>.zip (zip: true, nội dung là zipOf). */
export function downloadOf(s, id) {
  var n = id == null ? null : byId(s.nodes, id);
  if (n && n.kind === 'file') {
    var md = fileType(n.name).kind === 'markdown', ext = /\.[^.]+$/.test(n.name);
    return { name: md && !ext ? n.name + '.md' : n.name, type: (md ? 'text/markdown' : 'text/plain') + ';charset=utf-8', zip: false };
  }
  return { name: (n ? n.name : slug(s.name || autoName(s))) + '.zip', type: 'application/zip', zip: true };
}

/* ── đổi cây (trả phiên mới) ── */

function withTree(s, nodes, docs, extra) {
  var o = Object.assign({}, s, { nodes: nodes, docs: docs || s.docs, collapsed: s.collapsed.slice() });
  return extra ? Object.assign(o, extra) : o;
}
/* Thêm file dưới parentId (null = gốc); tên trùng anh em tự đổi (untitled-2.md…), tên hỏng là lỗi. Không đổi file mở;
   các folder chứa nó mở ra (thấy được hàng mới). Trả { s, id, error }; lỗi thì s là phiên đầu vào, id ''. */
export function addFile(s, parentId, name, text, real) {
  var id = uid(), r = addNode(s.nodes, { id: id, parent: parentId, kind: 'file', name: uniqueName(s.nodes, parentId, name) });
  if (r.error) return { s: s, id: '', error: r.error };
  var docs = Object.assign({}, s.docs);
  docs[id] = emptyDoc(text, real);
  return { s: reveal(withTree(s, r.nodes, docs), id), id: id, error: '' };
}
/* Thêm folder; tên trùng tự đổi; các folder chứa nó mở ra. Trả { s, id, error }. */
export function addDir(s, parentId, name) {
  var id = uid(), r = addNode(s.nodes, { id: id, parent: parentId, kind: 'dir', name: uniqueName(s.nodes, parentId, name) });
  if (r.error) return { s: s, id: '', error: r.error };
  return { s: reveal(withTree(s, r.nodes), id), id: id, error: '' };
}
/* Nạp nhiều file theo đường dẫn ([{ path, text }], tính từ parentId; path kết thúc '/' là folder rỗng): folder trung gian,
   gộp folder đã có (tree.js fromPaths); file mới real: true. Trả { s, ids: { path: fileId } }. */
export function addPaths(s, parentId, files) {
  var r = fromPaths(s.nodes, parentId, files.map(function (f) { return f.path; }), uid);
  var docs = Object.assign({}, s.docs);
  files.forEach(function (f) { if (r.ids[f.path]) docs[r.ids[f.path]] = emptyDoc(f.text, true); });
  return { s: withTree(s, r.nodes, docs), ids: r.ids };
}
/* Nạp folder từ đĩa (bản sao, MDAN-022). items: [{ path, text }] như addPaths. Phiên trống (isEmpty) và có file nạp
   được: cây nạp thay nội dung phiên (bỏ file trống), mở file đầu (firstFile, MDAN-031). Không thì nạp dưới parentId
   (folder không còn trong cây thì gốc), mở folder ấy ra (bỏ khỏi collapsed), file đang mở giữ nguyên.
   Trả { s, ids, files: số file đã nạp, skipped: số file có trong items mà đường dẫn không dùng được }. */
export function importPaths(s, parentId, items) {
  var count = function (ids) { return Object.keys(ids).length; };
  var want = items.filter(function (it) { return !/[\/\\]$/.test(it.path); }).length;
  var out = function (o, ids) { return { s: o, ids: ids, files: count(ids), skipped: want - count(ids) }; };
  if (isEmpty(s)) {
    var b = addPaths(withTree(s, [], {}, { collapsed: [] }), null, items);
    if (count(b.ids)) return out(openFile(b.s, firstFile(b.s.nodes)), b.ids);
  }
  if (parentId != null && !s.nodes.some(function (n) { return n.id === parentId && n.kind === 'dir'; })) parentId = null;
  var r = addPaths(s, parentId, items);
  return out(parentId == null ? r.s : reveal(r.s, parentId, true), r.ids);
}
/* Mở một file từ đĩa (MDAN-024). File đang mở trống (không chữ, không nhận xét) và chưa có tên thật (real): điền chữ, đặt
   tên theo file (tránh trùng anh em), real: true; phiên trống thì phiên cũng mang tên file (bỏ đuôi). Không thì thêm file
   cạnh file đang mở (cùng folder) và mở nó. Tên bỏ dấu cách đầu / cuối; không dùng được thì untitled.md. Trả { s, id, added }. */
export function openFromDisk(s, name, text) {
  name = String(name).trim();
  var d = docOf(s), parent = dirOf(s, s.open), ok = !nameError([], null, name, null);
  if (d.text.trim() || d.comments.length || d.real) {
    var a = addFile(s, parent, ok ? name : UNTITLED, text, true);
    return { s: openFile(a.s, a.id), id: a.id, added: true };
  }
  var others = s.nodes.filter(function (n) { return n.id !== s.open; });
  var r = ok ? renameIn(s, s.open, uniqueName(others, parent, name)) : { error: 'bad name' };
  var o = r.error ? withTree(s, s.nodes) : r.s;
  o.docs = Object.assign({}, o.docs);
  o.docs[s.open] = emptyDoc(text, true);
  if (isEmpty(s) && ok) { o.name = name.replace(/\.[^.]+$/, '') || name; o.named = true; }
  return { s: o, id: s.open, added: false };
}
/* Xoá các nút (và hậu duệ); doc của file bị xoá bỏ theo; file mở bị xoá thì mở file kế bên (afterRemove). Xoá hết file
   thì thêm untitled.md rỗng ở gốc (phiên luôn có ≥ 1 file). Trả { s, removed: id[], undo } (undo: cho applyUndo; null khi
   không xoá gì). */
export function removeNodes(s, ids) {
  var nodes = s.nodes, removed = [];
  (ids || []).forEach(function (id) { var r = removeNode(nodes, id); nodes = r.nodes; removed = removed.concat(r.removed); });
  if (!removed.length) return { s: s, removed: [], undo: null };
  var gone = new Set(removed), docs = {}, back = {};
  nodes.forEach(function (n) { if (n.kind === 'file') docs[n.id] = s.docs[n.id]; });
  var open = afterRemove(s.nodes, removed, s.open), added = null;
  if (open === null) {
    open = added = uid();
    nodes = nodes.concat([{ id: open, parent: null, kind: 'file', name: uniqueName(nodes, null, UNTITLED) }]);
    docs[open] = emptyDoc('', false);
  }
  var o = withTree(s, nodes, docs, { open: open });
  o.collapsed = o.collapsed.filter(function (d) { return !gone.has(d); });
  removed.forEach(function (id) { if (s.docs[id]) back[id] = s.docs[id]; });
  var byId = new Map(s.nodes.map(function (n) { return [n.id, n]; }));
  var undo = { kind: 'remove', nodes: removed.map(function (id) { return byId.get(id); }), docs: back, open: gone.has(s.open) ? s.open : null,
    collapsed: s.collapsed.filter(function (d) { return gone.has(d); }), added: added };
  return { s: o, removed: removed, undo: undo };
}
/* Đổi tên một nút; tên trùng hay hỏng là lỗi. File đổi tên thành real: true. Trả { s, error }. */
export function renameIn(s, id, name) {
  var r = renameNode(s.nodes, id, name);
  if (r.error) return { s: s, error: r.error };
  var docs = s.docs;
  if (docs[id] && !docs[id].real) { docs = Object.assign({}, docs); docs[id] = Object.assign({}, docs[id], { real: true }); }
  return { s: withTree(s, r.nodes, docs), error: '' };
}
/* Chuyển các nút ids (một id hay mảng; core moveMany) vào folder parentId (null = gốc). Trả { s, error, moved: id[], undo }
   (undo: cho applyUndo; null khi không chuyển gì). */
export function moveIn(s, ids, parentId) {
  var r = moveMany(s.nodes, ids, parentId);
  if (r.error || !r.moved.length) return { s: s, error: r.error, moved: [], undo: null };
  var items = r.moved.map(function (id) { return { id: id, parent: dirOf(s, id) }; });
  return { s: withTree(s, r.nodes), error: '', moved: r.moved, undo: { kind: 'move', items: items } };
}
/* Mở file id: mọi folder chứa nó được mở ra (bỏ khỏi collapsed). id không phải file thì trả phiên đầu vào. */
export function openFile(s, id) {
  if (!docOf(s, id)) return s;
  return Object.assign(reveal(s, id), { open: id });
}
/* Mở ra (bỏ khỏi collapsed) mọi folder chứa nút id; self: cả chính nó nếu là folder. */
export function reveal(s, id, self) {
  var up = new Set(), n = byId(s.nodes, id);
  if (self && n && n.kind === 'dir') up.add(n.id);
  while (n && n.parent != null && !up.has(n.parent)) {
    up.add(n.parent);
    n = byId(s.nodes, n.parent);
  }
  var o = withTree(s, s.nodes);
  o.collapsed = o.collapsed.filter(function (d) { return !up.has(d); });
  return o;
}
/* Gập mọi folder. */
export function collapseAll(s) {
  return withTree(s, s.nodes, s.docs, { collapsed: s.nodes.filter(function (n) { return n.kind === 'dir'; }).map(function (n) { return n.id; }) });
}
/* Undo của xoá / chuyển (MDAN-028) trên phiên HIỆN TẠI cur: chỉ trả lại đúng mục ấy, mọi việc làm sau (file mới, tên
   mới, chữ) giữ nguyên. u là undo của removeNodes / moveIn (chuyển nhiều nút: trả lại từng nút). Trả { s, id: nút được trả lại ('' khi không làm gì) }.
   Xoá: chèn lại các nút đã xoá cùng doc của chúng; folder cha không còn thì về gốc; tên trùng anh em thì đổi (uniqueName);
   folder gập như trước; file mở bị xoá thì mở lại nó; file untitled.md mà lần xoá thêm vào (xoá hết file) còn trống thì bỏ.
   Chuyển: nút về folder cũ (không còn, hay giờ là hậu duệ của nó, thì gốc); tên trùng thì đổi. Nút không còn thì thôi.
   Folder chứa nút được trả lại mở ra. */
export function applyUndo(cur, u) {
  if (!u) return { s: cur, id: '' };
  var has = function (nodes, id) { return nodes.some(function (n) { return n.id === id; }); };
  if (u.kind === 'move') {
    var o = cur, first = '';
    u.items.forEach(function (it) {
      if (!has(o.nodes, it.id)) return;
      var p = it.parent != null && o.nodes.some(function (n) { return n.id === it.parent && n.kind === 'dir'; }) &&
        subtree(o.nodes, it.id).indexOf(it.parent) < 0 ? it.parent : null;
      if (dirOf(o, it.id) !== p) {
        var me = byId(o.nodes, it.id);
        var nm = uniqueName(o.nodes.filter(function (n) { return n.id !== it.id; }), p, me.name);
        o = withTree(o, o.nodes.map(function (n) { return n.id === it.id ? { id: n.id, parent: p, kind: n.kind, name: nm } : n; }));
      }
      o = reveal(o, it.id);
      if (!first) first = it.id;
    });
    return first ? { s: o, id: first } : { s: cur, id: '' };
  }
  var nodes = cur.nodes.slice(), docs = Object.assign({}, cur.docs), top = '';
  var drop = u.added && cur.docs[u.added] && !cur.docs[u.added].real && !cur.docs[u.added].text.trim() && !cur.docs[u.added].comments.length;
  if (drop) { nodes = nodes.filter(function (n) { return n.id !== u.added; }); delete docs[u.added]; }
  u.nodes.forEach(function (n) {
    if (has(nodes, n.id) || (n.kind === 'file' && !u.docs[n.id])) return;
    var p = n.parent != null && nodes.some(function (x) { return x.id === n.parent && x.kind === 'dir'; }) ? n.parent : null;
    nodes.push({ id: n.id, parent: p, kind: n.kind, name: uniqueName(nodes, p, n.name) });
    if (n.kind === 'file') docs[n.id] = u.docs[n.id];
    if (!top) top = n.id;
  });
  if (!top) return { s: cur, id: '' };
  var o = withTree(cur, nodes, docs);
  o.collapsed = o.collapsed.concat(u.collapsed.filter(function (d) { return o.collapsed.indexOf(d) < 0; }));
  if (u.open && docs[u.open]) o.open = u.open;
  else if (!docs[o.open]) o.open = filesInOrder(nodes)[0];
  o = reveal(o, top);
  if (o.open !== cur.open) o = reveal(o, o.open);
  return { s: o, id: top };
}
/* Gập / mở folder id. */
export function toggleDir(s, id) {
  var o = withTree(s, s.nodes), i = o.collapsed.indexOf(id);
  if (i >= 0) o.collapsed.splice(i, 1);
  else if (s.nodes.some(function (n) { return n.id === id && n.kind === 'dir'; })) o.collapsed.push(id);
  return o;
}

/* ── tên, index ── */

/* Trước khi lưu: tên tự đặt (nếu người dùng chưa đặt) và giờ sửa. */
export function touchSession(s) {
  if (!s.named) s.name = sessionTitle(s);
  s.updated = Date.now();
}
/* Danh sách phiên sau khi lưu s: s lên đầu; phiên trống không vào danh sách.
   Mục: files (số file), chars (tổng ký tự), count (tổng nhận xét); rv: % đã đọc (làm tròn xuống) khi có file có rvPct,
   bình quân theo độ dài chữ của mọi file có chữ (file chưa có rvPct tính 0%). */
export function indexWith(idx, s) {
  idx = indexWithout(idx, s.id);
  if (!isEmpty(s)) {
    var files = filesInOrder(s.nodes), chars = 0, count = 0, rvSum = 0, rvLen = 0, rvN = 0, rvPlain = 0;
    files.forEach(function (id) {
      var d = s.docs[id];
      chars += d.text.length; count += d.comments.length;
      var pct = Number.isFinite(d.rvPct) ? d.rvPct : 0;
      if (Number.isFinite(d.rvPct)) { rvN++; rvPlain += d.rvPct; }
      rvSum += pct * d.text.length; rvLen += d.text.length;
    });
    var e = { id: s.id, name: s.name, created: s.created, updated: s.updated, files: files.length, chars: chars, count: count };
    /* % đã đọc, ui/review.js tính lúc vẽ; hộp History hiện. Mọi file đều rỗng thì bình quân thường của các rvPct. */
    if (rvN) e.rv = Math.floor((rvLen ? rvSum / rvLen : rvPlain / rvN) + 1e-9);
    idx.unshift(e);
  }
  return idx;
}
export function indexWithout(idx, id) { return idx.filter(function (e) { return e.id !== id; }); }
/* Đổi tên một phiên; tên rỗng thì về tên tự đặt. */
export function renameSession(s, name) {
  s.named = !!name; s.name = name || autoName(s);
}
export function renameIndex(idx, id, name) {
  return idx.map(function (e) { if (e.id === id) e.name = name; return e; });
}
