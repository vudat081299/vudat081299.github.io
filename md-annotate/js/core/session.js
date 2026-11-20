/* Mô hình phiên, thuần (dữ liệu thường, không DOM, không localStorage): một phiên là một cây folder + file text.
   Tạo phiên, chuẩn hoá phiên đọc từ bộ nhớ (nâng phiên cũ một văn bản thành một file), thêm / xoá / đổi tên / chuyển nút
   mà docs luôn khớp nodes, nhãn file trong prompt, tên tự đặt, danh sách phiên (index), file để tải .zip.
   Đọc / ghi bộ nhớ ở ui/state.js.
   Phiên: { id, name, named, created, updated, header, footer, fmt, includeDoc, lineNums, path, rvPrompt, promptAll,
     nodes: [{ id, parent, kind, name }] (core/tree.js), docs: { fileId: doc }, open: fileId, collapsed: [dirId] }.
   doc: { text, comments, reviews, rvPct?, real } — comments / reviews như trước (core/comments.js, core/review.js);
     real: tên file là thật (mở / nạp từ đĩa, người dùng đổi tên), file dán chữ tên tự đặt untitled.md thì false.
   path: tiền tố thư mục trên đĩa (VD 'docs/'), ghép trước đường dẫn trong cây ở nhãn prompt (fileLabel).
   Bất biến (normSession giữ): ≥ 1 file; open là một file trong nodes; mỗi file đúng một docs[id], không doc thừa.
   Hàm đổi cây (addFile, addDir, addPaths, importPaths, openFromDisk, removeNodes, renameIn, moveIn, openFile, reveal,
   toggleDir, collapseAll, restoreTree) không sửa phiên đầu vào:
   trả phiên mới (chép nông; nodes, docs, collapsed là mảng / object mới; doc không đổi thì dùng chung).
   Xuất: addDir, addFile, addPaths, autoName, collapseAll, createSession, dirOf, docOf, fileCount, fileLabel, importPaths,
     indexWith, indexWithout, isEmpty, moveIn, normIndex, normSession, openFile, openFromDisk, removeNodes, renameIn,
     renameIndex, renameSession, restoreTree, reveal, textTitle, toggleDir, touchSession, treeFiles, uid, UNTITLED, zipOf.
   Dùng: core/tree.js, core/zip.js. */
import { addNode, afterRemove, filesInOrder, fromPaths, kids, moveNode, nameError, pathOf, removeNode, renameNode,
  subtree, uniqueName, visibleRows } from './tree.js';
import { zipFiles } from './zip.js';

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
    nodes: [{ id: f, parent: null, kind: 'file', name: UNTITLED }], docs: docs, open: f, collapsed: []
  };
}

/* Phiên đọc từ bộ nhớ (s có thể hỏng): sửa tại chỗ cho đúng khuôn, hoặc null nếu không dùng được.
   Phiên cũ (text là chuỗi, không có nodes) nâng tại chỗ thành một file: tên là phần sau '/' (hoặc '\') cuối của path cũ,
   real: true, phần trước thành tiền tố path; path cũ không có tên dùng được thì untitled.md, real: false. Nhờ vậy nhãn
   prompt (fileLabel) đúng bằng path cũ và prompt y hệt từng byte. */
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
  s.created = +s.created || Date.now(); s.updated = +s.updated || s.created;
  return s;
}
function upgrade(s) {
  var p = typeof s.path === 'string' ? s.path.trim() : '';
  var k = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\')), name = p.slice(k + 1);
  var real = !!name && !nameError([], null, name, null);
  var f = uid(), doc = { text: s.text, comments: s.comments, reviews: s.reviews, real: real };
  if ('rvPct' in s) doc.rvPct = s.rvPct;
  s.path = p.slice(0, k + 1);
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
    var bad = nameError([], null, n.name, null);
    var name = bad ? (n.kind === 'file' ? UNTITLED : 'folder') : n.name;
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
/* Nhãn file trong prompt khi bật số dòng: tiền tố + đường dẫn trong cây khi phiên có ≥ 2 file, hoặc file real, hoặc tiền
   tố khác rỗng; không thì '' (prompt ghi L12 như cũ). */
export function fileLabel(s, fileId) {
  var d = docOf(s, fileId), pre = prefixOf(s);
  if (!d) return '';
  return fileCount(s) > 1 || d.real || pre ? pre + pathOf(s.nodes, fileId) : '';
}
/* Tên gợi ý từ chữ: tiêu đề markdown đầu tiên, không thì dòng có chữ đầu tiên; '' khi không có. */
export function textTitle(t) {
  var m = t.match(/^[ \t]*#{1,6}[ \t]+(.+)$/m) || t.match(/^[ \t]*(\S.*)$/m);
  var line = m ? m[1] : '';
  return line.replace(/\]\([^)]*\)/g, '').replace(/[*_`#>\[\]|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
}
/* Tên tự đặt: gốc chỉ có một folder thì tên folder; không thì từ chữ của file đang mở, rồi file đầu tiên có chữ. */
export function autoName(s) {
  var top = kids(s.nodes, null);
  if (top.length === 1 && top[0].kind === 'dir') return top[0].name;
  var t = textTitle(docOf(s).text);
  if (t) return t;
  var ids = filesInOrder(s.nodes);
  for (var i = 0; i < ids.length; i++) { t = textTitle(s.docs[ids[i]].text); if (t) return t; }
  return 'Untitled session';
}
/* Phiên trống: một file, không folder, chữ rỗng, không nhận xét. */
export function isEmpty(s) {
  var d = docOf(s);
  return s.nodes.length === 1 && !d.text.trim() && !d.comments.length;
}
/* Folder chứa nút id (null = gốc, hay id không có). */
export function dirOf(s, id) {
  var n = s.nodes.filter(function (x) { return x.id === id; })[0];
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

/* ── đổi cây (trả phiên mới) ── */

function withTree(s, nodes, docs, extra) {
  var o = Object.assign({}, s, { nodes: nodes, docs: docs || s.docs, collapsed: s.collapsed.slice() });
  return extra ? Object.assign(o, extra) : o;
}
/* Thêm file dưới parentId (null = gốc); tên trùng anh em tự đổi (untitled-2.md…), tên hỏng là lỗi. Không đổi file mở.
   Trả { s, id, error }; lỗi thì s là phiên đầu vào, id ''. */
export function addFile(s, parentId, name, text, real) {
  var id = uid(), r = addNode(s.nodes, { id: id, parent: parentId, kind: 'file', name: uniqueName(s.nodes, parentId, name) });
  if (r.error) return { s: s, id: '', error: r.error };
  var docs = Object.assign({}, s.docs);
  docs[id] = emptyDoc(text, real);
  return { s: withTree(s, r.nodes, docs), id: id, error: '' };
}
/* Thêm folder; tên trùng tự đổi. Trả { s, id, error }. */
export function addDir(s, parentId, name) {
  var id = uid(), r = addNode(s.nodes, { id: id, parent: parentId, kind: 'dir', name: uniqueName(s.nodes, parentId, name) });
  if (r.error) return { s: s, id: '', error: r.error };
  return { s: withTree(s, r.nodes), id: id, error: '' };
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
   được: cây nạp thay nội dung phiên (bỏ file trống), mở file đầu tiên theo thứ tự hiển thị. Không thì nạp dưới parentId,
   mở folder ấy ra (bỏ khỏi collapsed), file đang mở giữ nguyên. Trả { s, ids, files: số file đã nạp }. */
export function importPaths(s, parentId, items) {
  var count = function (ids) { return Object.keys(ids).length; };
  if (isEmpty(s)) {
    var b = addPaths(withTree(s, [], {}, { collapsed: [] }), null, items);
    if (count(b.ids)) return { s: openFile(b.s, filesInOrder(b.s.nodes)[0]), ids: b.ids, files: count(b.ids) };
  }
  var r = addPaths(s, parentId, items);
  return { s: parentId == null ? r.s : reveal(r.s, parentId, true), ids: r.ids, files: count(r.ids) };
}
/* Mở một file từ đĩa (MDAN-024). File đang mở trống (không chữ, không nhận xét): điền chữ, đặt tên theo file (tránh trùng
   anh em), real: true; phiên trống thì phiên cũng mang tên file (bỏ đuôi). Không thì thêm file cạnh file đang mở (cùng
   folder) và mở nó. Tên không dùng được thì untitled.md. Trả { s, id, added }. */
export function openFromDisk(s, name, text) {
  var d = docOf(s), parent = dirOf(s, s.open), ok = !nameError([], null, name, null);
  if (d.text.trim() || d.comments.length) {
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
   thì thêm untitled.md rỗng ở gốc (phiên luôn có ≥ 1 file). Trả { s, removed: id[] }. */
export function removeNodes(s, ids) {
  var nodes = s.nodes, removed = [];
  (ids || []).forEach(function (id) { var r = removeNode(nodes, id); nodes = r.nodes; removed = removed.concat(r.removed); });
  if (!removed.length) return { s: s, removed: [] };
  var gone = new Set(removed), docs = {};
  nodes.forEach(function (n) { if (n.kind === 'file') docs[n.id] = s.docs[n.id]; });
  var open = afterRemove(s.nodes, removed, s.open);
  if (open === null) {
    open = uid();
    nodes = nodes.concat([{ id: open, parent: null, kind: 'file', name: uniqueName(nodes, null, UNTITLED) }]);
    docs[open] = emptyDoc('', false);
  }
  var o = withTree(s, nodes, docs, { open: open });
  o.collapsed = o.collapsed.filter(function (d) { return !gone.has(d); });
  return { s: o, removed: removed };
}
/* Đổi tên một nút; tên trùng hay hỏng là lỗi. File đổi tên thành real: true. Trả { s, error }. */
export function renameIn(s, id, name) {
  var r = renameNode(s.nodes, id, name);
  if (r.error) return { s: s, error: r.error };
  var docs = s.docs;
  if (docs[id] && !docs[id].real) { docs = Object.assign({}, docs); docs[id] = Object.assign({}, docs[id], { real: true }); }
  return { s: withTree(s, r.nodes, docs), error: '' };
}
/* Chuyển nút vào folder parentId (null = gốc). Trả { s, error }. */
export function moveIn(s, id, parentId) {
  var r = moveNode(s.nodes, id, parentId);
  return r.error ? { s: s, error: r.error } : { s: withTree(s, r.nodes), error: '' };
}
/* Mở file id: mọi folder chứa nó được mở ra (bỏ khỏi collapsed). id không phải file thì trả phiên đầu vào. */
export function openFile(s, id) {
  if (!docOf(s, id)) return s;
  return Object.assign(reveal(s, id), { open: id });
}
/* Mở ra (bỏ khỏi collapsed) mọi folder chứa nút id; self: cả chính nó nếu là folder. */
export function reveal(s, id, self) {
  var up = new Set(), n = s.nodes.filter(function (x) { return x.id === id; })[0];
  if (self && n && n.kind === 'dir') up.add(n.id);
  while (n && n.parent != null && !up.has(n.parent)) {
    up.add(n.parent);
    n = s.nodes.filter(function (x) { return x.id === n.parent; })[0];
  }
  var o = withTree(s, s.nodes);
  o.collapsed = o.collapsed.filter(function (d) { return !up.has(d); });
  return o;
}
/* Gập mọi folder. */
export function collapseAll(s) {
  return withTree(s, s.nodes, s.docs, { collapsed: s.nodes.filter(function (n) { return n.kind === 'dir'; }).map(function (n) { return n.id; }) });
}
/* Hoàn tác một lần đổi cây (Undo của xoá / chuyển): cây, file mở, folder gập lấy từ ảnh chụp snap; tuỳ chọn và tên lấy
   từ phiên hiện tại cur; doc của file còn trong cur lấy từ cur (chữ, nhận xét sửa sau ảnh chụp không mất), file đã xoá
   lấy từ snap. */
export function restoreTree(cur, snap) {
  var docs = {};
  snap.nodes.forEach(function (n) { if (n.kind === 'file') docs[n.id] = docOf(cur, n.id) || snap.docs[n.id]; });
  return Object.assign({}, cur, { nodes: snap.nodes.slice(), docs: docs, open: snap.open, collapsed: snap.collapsed.slice() });
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
  if (!s.named) s.name = isEmpty(s) ? '' : autoName(s);
  s.updated = Date.now();
}
/* Danh sách phiên sau khi lưu s: s lên đầu; phiên trống không vào danh sách.
   Mục: files (số file), chars (tổng ký tự), count (tổng nhận xét); rv: % đã đọc (làm tròn xuống) khi có file có rvPct,
   bình quân theo độ dài chữ của các file ấy. */
export function indexWith(idx, s) {
  idx = indexWithout(idx, s.id);
  if (!isEmpty(s)) {
    var files = filesInOrder(s.nodes), chars = 0, count = 0, rvSum = 0, rvLen = 0, rvN = 0, rvPlain = 0;
    files.forEach(function (id) {
      var d = s.docs[id];
      chars += d.text.length; count += d.comments.length;
      if (Number.isFinite(d.rvPct)) { rvN++; rvPlain += d.rvPct; rvSum += d.rvPct * d.text.length; rvLen += d.text.length; }
    });
    var e = { id: s.id, name: s.name, created: s.created, updated: s.updated, files: files.length, chars: chars, count: count };
    /* % đã đọc, ui/review.js tính lúc vẽ; hộp History hiện. Mọi file có rvPct đều rỗng thì bình quân thường. */
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
