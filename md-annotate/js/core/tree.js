/* TẠM — bản thật do agent core viết */
/* Cây folder + file của phiên, thuần (chỉ phần ui/tree.js gọi): kids, visibleRows, pathOf, subtree.
   Xuất: kids, pathOf, subtree, visibleRows.
   Dùng: không module nào. */

function cmp(a, b) {
  if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1;
  return a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' });
}
export function kids(nodes, parentId) {
  var p = parentId == null ? null : parentId;
  return nodes.filter(function (n) { return (n.parent == null ? null : n.parent) === p; }).sort(cmp);
}
export function visibleRows(nodes, collapsed) {
  var shut = {}, out = [];
  (collapsed || []).forEach(function (id) { shut[id] = true; });
  (function walk(pid, depth) {
    kids(nodes, pid).forEach(function (n) {
      out.push({ node: n, depth: depth });
      if (n.kind === 'dir' && !shut[n.id]) walk(n.id, depth + 1);
    });
  })(null, 0);
  return out;
}
export function pathOf(nodes, id) {
  var by = {}, parts = [];
  nodes.forEach(function (n) { by[n.id] = n; });
  for (var n = by[id]; n; n = n.parent == null ? null : by[n.parent]) parts.unshift(n.name);
  return parts.join('/');
}
export function subtree(nodes, id) {
  var out = [id];
  for (var i = 0; i < out.length; i++) {
    nodes.forEach(function (n) { if (n.parent === out[i]) out.push(n.id); });
  }
  return out;
}
