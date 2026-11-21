/* Ô lọc file của cây (#tree-find, MDAN-068): chỉ hiện khi phiên ≥ 2 file; gõ xong FIND_WAIT ms thì lọc (logic ở
   core/tree-find.js; chờ để mẫu RegExp gõ dở không chạy trên mọi tên sau mỗi phím), mẫu không hợp lệ thì aria-invalid (tìm
   như chữ thường), không khớp gì thì #tree.is-none. Esc xoá mẫu; ↓ / Enter vào hàng đầu (lọc ngay nếu còn chờ). Phím
   trong lúc gõ bằng bộ gõ (IME, tiếng Việt) là của bộ gõ.
   Đổi phiên thì xoá mẫu; thêm file / folder hay nạp folder cũng xoá (clearFind), để mục mới không bị lọc mất. Trạng thái
   gập / mở của cây không đổi: xoá mẫu là về như cũ.
   Xuất: clearFind, findInTree, focusFind, initTreeFind.
   Dùng: core/tree-find.js, ui/dom.js. */
import { findFiles } from '../core/tree-find.js';
import { $ } from './dom.js';

var FIND_WAIT = 150;   // ms sau phím cuối

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
/* Vẽ lại cây theo mẫu (redraw của initTreeFind); timer: lần vẽ đang chờ sau phím cuối. */
var changed = function () {}, timer = 0;
function now() { clearTimeout(timer); timer = 0; changed(); }
/* Xoá mẫu và vẽ lại cây (không lọc thì thôi). */
export function clearFind() {
  if (!$('tree-q').value) return;
  $('tree-q').value = '';
  now();
}
/* redraw(): vẽ lại cây; toRows(): đưa focus vào hàng đầu. */
export function initTreeFind(redraw, toRows) {
  var q = $('tree-q');
  changed = redraw;
  q.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(now, FIND_WAIT); });
  q.addEventListener('keydown', function (e) {
    if (e.isComposing || e.keyCode === 229) return;   // Enter / Esc chốt hay bỏ chữ của bộ gõ
    if (e.key === 'Escape' && q.value) clearFind();
    else if (e.key === 'ArrowDown' || e.key === 'Enter') { if (timer) now(); toRows(); }
    else return;
    e.preventDefault(); e.stopPropagation();
  });
}
