/* Bảng phím tắt (data/shortcuts.json), thuần: chuẩn hoá dữ liệu đọc được, bỏ nhóm / hàng hỏng.
   Một hàng: keys là danh sách cách bấm thay thế nhau, mỗi cách là danh sách phím bấm cùng lúc ("Shift" + "X").
   Xuất: normShortcuts.
   Dùng: không module nào. */

function str(x) { return typeof x === 'string' && x.trim() ? x.trim() : ''; }
function combo(c) {
  if (!Array.isArray(c)) return null;
  var ks = c.map(str);
  return ks.length && ks.every(Boolean) ? ks : null;
}
/* d: JSON của data/shortcuts.json. Trả [{ title, note, rows: [{ keys: [[phím…]…], action }] }]; nhóm không còn hàng thì bỏ. */
export function normShortcuts(d) {
  var groups = d && Array.isArray(d.groups) ? d.groups : [];
  return groups.map(function (g) {
    var rows = (g && Array.isArray(g.rows) ? g.rows : []).map(function (r) {
      var keys = r && Array.isArray(r.keys) ? r.keys.map(combo) : [];
      var action = str(r && r.action);
      return keys.length && keys.every(Boolean) && action ? { keys: keys, action: action } : null;
    }).filter(Boolean);
    return { title: str(g && g.title), note: str(g && g.note), rows: rows };
  }).filter(function (g) { return g.title && g.rows.length; });
}
