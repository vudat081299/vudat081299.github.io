/* Ô lọc file của cây (#tree-find, MDAN-068): chỉ hiện khi phiên ≥ 2 file; gõ là lọc ngay (logic ở core/tree-find.js), mẫu
   không hợp lệ thì aria-invalid (tìm như chữ thường), không khớp gì thì #tree.is-none. Esc xoá mẫu; ↓ / Enter vào hàng đầu.
   Đổi phiên thì xoá mẫu; thêm file / folder hay nạp folder cũng xoá (clearFind), để mục mới không bị lọc mất. Trạng thái
   gập / mở của cây không đổi: xoá mẫu là về như cũ.
   Xuất: clearFind, findInTree, focusFind, initTreeFind.
   Dùng: core/tree-find.js, ui/dom.js. */
import { findFiles } from '../core/tree-find.js';
import { $ } from './dom.js';

/* Gọi khi vẽ cây (ui/tree.js renderTree): same = cùng phiên với lần vẽ trước. Trả kết quả findFiles hay null. */
export function findInTree(nodes, same) {
  var q = $('tree-q'), many = nodes.filter(function (n) { return n.kind === 'file'; }).length > 1;
  $('tree-find').hidden = !many;
  if (!many || !same) q.value = '';
  var found = findFiles(nodes, q.value);
  q.setAttribute('aria-invalid', String(!!found && found.literal));
  $('tree').classList.toggle('is-none', !!found && !found.files);
  return found;
}
/* Phím / ở hàng của cây: vào ô lọc khi nó đang hiện. */
export function focusFind() {
  if ($('tree-find').hidden) return false;
  $('tree-q').focus(); $('tree-q').select();
  return true;
}
/* Xoá mẫu và vẽ lại cây (không lọc thì thôi). */
var changed = function () {};
export function clearFind() {
  if (!$('tree-q').value) return;
  $('tree-q').value = '';
  changed();
}
/* redraw(): vẽ lại cây; toRows(): đưa focus vào hàng đầu. */
export function initTreeFind(redraw, toRows) {
  var q = $('tree-q');
  changed = redraw;
  q.addEventListener('input', changed);
  q.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && q.value) clearFind();
    else if (e.key === 'ArrowDown' || e.key === 'Enter') toRows();
    else return;
    e.preventDefault(); e.stopPropagation();
  });
}
