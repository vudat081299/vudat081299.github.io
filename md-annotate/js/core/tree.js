/* Cây folder + file của một phiên, thuần (không DOM): cây phẳng, mỗi nút { id, parent: null | id, kind: 'dir' | 'file', name },
   parent trỏ lên, sâu bao nhiêu cũng được. Xếp hiển thị, đường dẫn, kiểm tên, thêm / đổi tên / chuyển / xoá nút, nạp
   danh sách đường dẫn (nạp folder từ đĩa), chọn file mở sau khi xoá, folder đích được của một lần chuyển, file mở đầu.
   Không hàm nào sửa mảng hay nút đầu vào; hàm đổi cây trả mảng mới. error là câu tiếng Anh cho toast, '' khi được.
   Thứ tự hiển thị: folder trước, rồi file; trong mỗi nhóm so tên tự nhiên (numeric, không phân biệt hoa thường, dấu).
   Tên: không rỗng, không dấu cách ở đầu / cuối, không chứa / hay \, không phải . / .., tối đa 255 ký tự, không trùng anh em
   (không phân biệt hoa thường, NFC).
   Nút có cha mất hay vòng cha – con không tới được từ gốc: các hàm duyệt bỏ qua, không treo (session.js sửa lúc đọc).
   Xuất: addNode, afterRemove, canMove, filesInOrder, firstFile, fromPaths, kids, MAX_NAME, moveNode, moveTargets, nameError,
     nameKey, pathOf, removeNode, renameNode, subtree, uniqueName, visibleRows.
   Dùng: không module nào. */

export var MAX_NAME = 255;

/* Khoá so trùng tên: NFC (tên từ macOS là NFD) rồi chữ thường. */
export function nameKey(name) { return String(name).normalize('NFC').toLowerCase(); }

function parentOf(n) { return n.parent == null ? null : n.parent; }
function byId(nodes, id) { for (var i = 0; i < nodes.length; i++) if (nodes[i].id === id) return nodes[i]; return null; }
function order(a, b) {
  if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1;
  return a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' }) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
}
/* Map cha → con đã xếp, dựng một lần cho mỗi lần duyệt (khoá gốc là null). */
function childMap(nodes) {
  var m = new Map();
  nodes.forEach(function (n) {
    var p = parentOf(n);
    if (!m.has(p)) m.set(p, []);
    m.get(p).push(n);
  });
  m.forEach(function (a) { a.sort(order); });
  return m;
}
/* Duyệt sâu từ gốc theo thứ tự hiển thị; skip(n) đúng thì không vào con của n. Nút đã gặp không gặp lại (vòng). */
function walk(nodes, skip, visit) {
  var m = childMap(nodes), seen = new Set();
  (function go(p, depth) {
    (m.get(p) || []).forEach(function (n) {
      if (seen.has(n.id)) return;
      seen.add(n.id);
      visit(n, depth);
      if (n.kind === 'dir' && !(skip && skip(n))) go(n.id, depth + 1);
    });
  })(null, 0);
}

/* Con của parentId (null = gốc), đã xếp. */
export function kids(nodes, parentId) {
  var p = parentId == null ? null : parentId;
  return nodes.filter(function (n) { return parentOf(n) === p; }).sort(order);
}
/* Hàng của sidebar: [{ node, depth }], bỏ con của folder đang gập. */
/* keep (Set id, của core/tree-find.js findFiles): chỉ các nút ấy, folder nào cũng mở. */
export function visibleRows(nodes, collapsed, keep) {
  var shut = new Set(collapsed || []), rows = [];
  walk(nodes, function (n) { return keep ? !keep.has(n.id) : shut.has(n.id); },
    function (n, depth) { if (!keep || keep.has(n.id)) rows.push({ node: n, depth: depth }); });
  return rows;
}
/* Đường dẫn trong cây 'a/b/c.md'; id không có thì ''. */
export function pathOf(nodes, id) {
  var names = [], seen = new Set(), n = byId(nodes, id);
  while (n && !seen.has(n.id)) {
    seen.add(n.id);
    names.unshift(n.name);
    n = parentOf(n) === null ? null : byId(nodes, n.parent);
  }
  return names.join('/');
}
/* Mọi file theo thứ tự hiển thị, không xét folder gập. */
export function filesInOrder(nodes) {
  var ids = [];
  walk(nodes, null, function (n) { if (n.kind === 'file') ids.push(n.id); });
  return ids;
}
/* id và mọi hậu duệ của nó (id không có thì []). */
export function subtree(nodes, id) {
  if (!byId(nodes, id)) return [];
  var m = childMap(nodes), out = [id], seen = new Set(out);
  for (var i = 0; i < out.length; i++) {
    (m.get(out[i]) || []).forEach(function (n) { if (!seen.has(n.id)) { seen.add(n.id); out.push(n.id); } });
  }
  return out;
}
/* Lý do tên không dùng được dưới parentId, hoặc ''. selfId: nút đang đổi tên, không tính là trùng với chính nó. */
export function nameError(nodes, parentId, name, selfId) {
  if (typeof name !== 'string' || !name.trim()) return 'Name cannot be empty.';
  if (name !== name.trim()) return 'Name cannot start or end with a space.';
  if (/[\/\\]/.test(name)) return 'Name cannot contain / or \\.';
  if (name === '.' || name === '..') return 'Name cannot be . or ..';
  if (name.length > MAX_NAME) return 'Name is longer than ' + MAX_NAME + ' characters.';
  var p = parentId == null ? null : parentId, k = nameKey(name);
  var clash = nodes.filter(function (n) { return parentOf(n) === p && n.id !== selfId && nameKey(n.name) === k; })[0];
  return clash ? 'A ' + (clash.kind === 'dir' ? 'folder' : 'file') + ' named "' + clash.name + '" already exists here.' : '';
}
/* Tên không trùng anh em: 'untitled.md' → 'untitled-2.md', 'untitled-3.md'…; folder 'notes' → 'notes-2'. */
export function uniqueName(nodes, parentId, name) {
  var p = parentId == null ? null : parentId, taken = new Set();
  nodes.forEach(function (n) { if (parentOf(n) === p) taken.add(nameKey(n.name)); });
  return freeName(taken, name);
}
function freeName(taken, name) {
  if (!taken.has(nameKey(name))) return name;
  var dot = name.lastIndexOf('.'), base = dot > 0 ? name.slice(0, dot) : name, ext = dot > 0 ? name.slice(dot) : '';
  for (var k = 2; ; k++) {
    var tail = '-' + k + ext, cand = base.slice(0, Math.max(1, MAX_NAME - tail.length)) + tail;
    if (!taken.has(nameKey(cand))) return cand;
  }
}
/* Cha hợp lệ: null (gốc) hoặc một folder có trong cây. */
function parentError(nodes, parentId) {
  if (parentId == null) return '';
  var p = byId(nodes, parentId);
  return p && p.kind === 'dir' ? '' : 'Parent folder not found.';
}
/* Thêm một nút (chép { id, parent, kind, name }); tên trùng là lỗi, muốn tự đổi thì qua uniqueName trước. */
export function addNode(nodes, node) {
  if (!node || typeof node.id !== 'string' || !node.id) return { nodes: nodes, error: 'Missing id.' };
  if (byId(nodes, node.id)) return { nodes: nodes, error: 'Duplicate id.' };
  if (node.kind !== 'dir' && node.kind !== 'file') return { nodes: nodes, error: 'Unknown node kind.' };
  var p = node.parent == null ? null : node.parent;
  var err = parentError(nodes, p) || nameError(nodes, p, node.name, null);
  if (err) return { nodes: nodes, error: err };
  return { nodes: nodes.concat([{ id: node.id, parent: p, kind: node.kind, name: node.name }]), error: '' };
}
export function renameNode(nodes, id, name) {
  var n = byId(nodes, id);
  if (!n) return { nodes: nodes, error: 'Item not found.' };
  var err = nameError(nodes, parentOf(n), name, id);
  if (err) return { nodes: nodes, error: err };
  return { nodes: nodes.map(function (x) { return x.id === id ? { id: x.id, parent: parentOf(x), kind: x.kind, name: name } : x; }), error: '' };
}
/* Chuyển nút vào parentId (null = gốc). Cấm vào chính nó hay hậu duệ của nó; tên trùng ở chỗ mới là lỗi. */
export function moveNode(nodes, id, parentId) {
  var n = byId(nodes, id), p = parentId == null ? null : parentId;
  if (!n) return { nodes: nodes, error: 'Item not found.' };
  if (p !== null && subtree(nodes, id).indexOf(p) >= 0) return { nodes: nodes, error: 'Cannot move a folder into itself.' };
  var err = parentError(nodes, p);
  if (err) return { nodes: nodes, error: err };
  if (parentOf(n) === p) return { nodes: nodes, error: '' };
  if (nameError(nodes, p, n.name, id)) return { nodes: nodes, error: 'A file or folder named "' + n.name + '" already exists in that folder.' };
  return { nodes: nodes.map(function (x) { return x.id === id ? { id: x.id, parent: p, kind: x.kind, name: x.name } : x; }), error: '' };
}
/* Chuyển id vào to (null = gốc) được không: nút có, to khác folder đang chứa nó, moveNode không lỗi (vòng, trùng tên).
   Cùng luật cho chỗ thả khi kéo và danh sách Move to…. */
export function canMove(nodes, id, to) {
  var n = byId(nodes, id), p = to == null ? null : to;
  return !!n && parentOf(n) !== p && !moveNode(nodes, id, p).error;
}
/* Chỗ chuyển id tới, cho menu Move to…: gốc rồi mọi folder theo thứ tự hiển thị trừ chính nó và hậu duệ.
   [{ id: null | dirId, name, depth (gốc 0), ok: canMove }]. */
export function moveTargets(nodes, id) {
  var skip = new Set(subtree(nodes, id)), out = [{ id: null, name: '', depth: 0, ok: canMove(nodes, id, null) }];
  walk(nodes, function (n) { return skip.has(n.id); }, function (n, depth) {
    if (n.kind === 'dir' && !skip.has(n.id)) out.push({ id: n.id, name: n.name, depth: depth + 1, ok: canMove(nodes, id, n.id) });
  });
  return out;
}
/* Xoá nút và mọi hậu duệ. */
export function removeNode(nodes, id) {
  var gone = subtree(nodes, id), set = new Set(gone);
  return { nodes: nodes.filter(function (n) { return !set.has(n.id); }), removed: gone };
}
/* Nạp danh sách đường dẫn ('a/b/c.md', tính từ parentId) thành file: dựng folder trung gian, gộp vào folder đã có cùng
   tên (không phân biệt hoa thường); file trùng tên một nút đã có thì đổi tên bằng uniqueName. mkId(kind) cho id mới.
   Đường dẫn kết thúc bằng '/' ('a/empty/') chỉ dựng folder (folder rỗng nạp từ đĩa), không có trong ids.
   Đoạn rỗng và '.' bị bỏ ('a//b', './a'); mỗi đoạn bỏ dấu cách đầu / cuối; đường dẫn có đoạn không dùng được ('..', chỉ
   dấu cách, quá dài) bị bỏ, không có trong ids.
   Trả { nodes, ids: { path: fileId } } (khoá là đường dẫn đúng như đưa vào). */
export function fromPaths(nodes, parentId, paths, mkId) {
  var out = nodes.slice(), ids = {}, root = parentId == null ? null : parentId;
  if (parentError(nodes, root)) return { nodes: nodes, ids: ids };
  /* cha → (khoá tên → nút), dựng một lần, cập nhật khi thêm. */
  var sib = new Map();
  var at = function (p) { if (!sib.has(p)) sib.set(p, new Map()); return sib.get(p); };
  out.forEach(function (n) { at(parentOf(n)).set(nameKey(n.name), n); });
  (paths || []).forEach(function (path) {
    if (typeof path !== 'string') return;
    var segs = path.split(/[\/\\]/).filter(function (x) { return x && x !== '.'; }).map(function (x) { return x.trim(); });
    var dirOnly = /[\/\\]$/.test(path);
    if (!segs.length || segs.some(function (x) { return nameError([], null, x, null); })) return;
    var p = root;
    for (var i = 0; i < segs.length - (dirOnly ? 0 : 1); i++) {
      var have = at(p).get(nameKey(segs[i]));
      if (!have || have.kind !== 'dir') {
        var nm = have ? freeName(new Set(at(p).keys()), segs[i]) : segs[i];
        have = { id: mkId('dir'), parent: p, kind: 'dir', name: nm };
        out.push(have); at(p).set(nameKey(nm), have);
        /* Folder trùng tên một file: các đường dẫn sau cùng tên folder phải về folder vừa dựng, không về file. */
        if (nm !== segs[i]) at(p).set(nameKey(segs[i]), have);
      }
      p = have.id;
    }
    if (dirOnly) return;
    var name = freeName(new Set(at(p).keys()), segs[segs.length - 1]);
    var f = { id: mkId('file'), parent: p, kind: 'file', name: name };
    out.push(f); at(p).set(nameKey(name), f);
    ids[path] = f.id;
  });
  return { nodes: out, ids: ids };
}
/* File nên mở sau khi xoá removedIds. nodes là cây TRƯỚC khi xoá. File đang mở còn thì giữ; không thì file kế sau nó theo
   thứ tự hiển thị, hết thì file kế trước; không còn file nào thì null. */
export function afterRemove(nodes, removedIds, openId) {
  var gone = new Set(removedIds || []), files = filesInOrder(nodes);
  var left = files.filter(function (id) { return !gone.has(id); });
  if (!left.length) return null;
  var i = files.indexOf(openId);
  if (i < 0) return left[0];
  if (!gone.has(openId)) return openId;
  for (var k = i + 1; k < files.length; k++) if (!gone.has(files[k])) return files[k];
  for (k = i - 1; k >= 0; k--) if (!gone.has(files[k])) return files[k];
  return left[0];
}
/* File mở đầu khi cả phiên là một folder vừa nạp (MDAN-031): file nông nhất; cùng độ sâu thì README.* trước, rồi
   index.*, rồi file đầu theo thứ tự hiển thị. Không có file thì null. */
export function firstFile(nodes) {
  var best = null, rank = function (n) { return /^readme(\.|$)/i.test(n.name) ? 0 : /^index(\.|$)/i.test(n.name) ? 1 : 2; };
  walk(nodes, null, function (n, depth) {
    if (n.kind !== 'file') return;
    if (!best || depth < best.depth || (depth === best.depth && rank(n) < best.rank)) best = { id: n.id, depth: depth, rank: rank(n) };
  });
  return best ? best.id : null;
}
