/* Lọc cây file theo mẫu tên (ô lọc của cây, MDAN-068), thuần: mẫu là RegExp không phân biệt hoa thường, so với tên file
   (NFC); mẫu không phải RegExp hợp lệ thì tìm chuỗi con (literal), không ném. Giữ file khớp và mọi folder tổ tiên của nó;
   core/tree.js visibleRows(nodes, collapsed, keep) dựng hàng từ đó.
   Xuất: findFiles.
   Dùng: không module nào. */

/* q rỗng (hay chỉ dấu cách): null. Không thì { keep: Set id của file khớp và folder tổ tiên, files: số file khớp, literal }. */
export function findFiles(nodes, q) {
  q = String(q || '').normalize('NFC');
  if (!q.trim()) return null;
  var re = null, low = q.toLowerCase();
  try { re = new RegExp(q, 'i'); } catch (e) { /* không hợp lệ: chuỗi con */ }
  var hit = re ? function (s) { return re.test(s); } : function (s) { return s.toLowerCase().indexOf(low) >= 0; };
  var by = new Map(nodes.map(function (n) { return [n.id, n]; })), keep = new Set(), files = 0;
  nodes.forEach(function (n) {
    if (n.kind !== 'file' || !hit(n.name.normalize('NFC'))) return;
    files++;
    for (var x = n; x && !keep.has(x.id); x = x.parent == null ? null : by.get(x.parent)) keep.add(x.id);
  });
  return { keep: keep, files: files, literal: !re };
}
