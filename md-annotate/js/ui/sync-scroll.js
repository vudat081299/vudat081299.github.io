/* Cuộn theo nhau ở Split (MDAN-006, prefs.sync): bản đồ khối nguồn ↔ khối Preview, nội suy Hermite đơn điệu.
   setByPage() cho biết sự kiện cuộn là do trang tự đặt (focus.js dùng để không đổi khung đo dải đọc).
   Toán ở core/sync-math.js; file này đo DOM và đặt scrollTop.
   Xuất: initSyncScroll, invalidateSync, setByPage.
   Dùng: core/blocks.js, core/sync-math.js, ui/dom.js, ui/state.js, ui/markdown.js, ui/layout.js. */
import { lexSpans } from '../core/blocks.js';
import { followTop, syncCurves } from '../core/sync-math.js';
import { $ } from './dom.js';
import { S } from './state.js';
import { mdLex } from './markdown.js';
import { layoutVal } from './layout.js';

/* Cuộn theo nhau ở Song song (prefs.sync, mặc định bật): cuộn một khung thì khung kia cuộn sao cho cùng một đoạn
   nằm ở cùng một chỗ. Điểm tham chiếu là giữa khung; sát đầu / cuối thì trượt dần về mép, để hai khung cùng chạm
   đầu và cùng chạm cuối. Bản đồ: mỗi khối cấp cao của marked.lexer ↔ phần tử con của #v-md (cùng thứ tự), cặp
   (đỉnh dòng nguồn, đỉnh khối) và (đáy, đáy); giữa các mốc nội suy tuyến tính. Lệch số khối thì theo tỉ lệ. */
var syncMap = null, syncExpect = new Map();
function paneY(pane, el, bottom) {
  var r = el.getBoundingClientRect();
  return (bottom ? r.bottom : r.top) - pane.getBoundingClientRect().top + pane.scrollTop;
}
function syncKey() {
  var ws = $('wrap-src'), wm = $('wrap-md');
  return ws.scrollHeight + ':' + wm.scrollHeight + ':' + ws.clientWidth + ':' + wm.clientWidth + ':' + S.text.length;
}
function buildSyncMap() {
  var ws = $('wrap-src'), wm = $('wrap-md');
  var lines = $('v-src').querySelectorAll('.ma-ln');
  var blocks = Array.prototype.filter.call($('v-md').children, function (el) { return el.nodeType === 1; });
  var spans = lexSpans(S.text, mdLex);
  var pts = [[0, 0]];
  if (spans.length === blocks.length && lines.length) {
    spans.forEach(function (sp, i) {
      var a = lines[Math.min(sp.a, lines.length - 1)];
      // Chỉ lấy đỉnh khối: đỉnh + đáy xen kẽ làm tốc độ đổi liên tục giữa thân khối và khoảng trống.
      pts.push([paneY(ws, a), paneY(wm, blocks[i])]);
    });
  }
  pts.push([ws.scrollHeight, wm.scrollHeight]);
  var c = syncCurves(pts);
  syncMap = { key: syncKey(), fwd: c.fwd, back: c.back };
}
/* Khung nào đổi vị trí khác với vị trí trang vừa đặt là khung người dùng đang cuộn: nó dẫn, khung kia theo ngay
   trong cùng khung hình. Sự kiện cuộn do trang đặt thì bỏ qua, nên không có vòng lặp qua lại. */
export function setByPage(el) { var exp = syncExpect.get(el); return exp != null && Math.abs(el.scrollTop - exp) < 1; }
function syncFrom(src) {
  var ws = $('wrap-src'), wm = $('wrap-md');
  var other = src === ws ? wm : ws;
  if (!syncMap || syncMap.key !== syncKey()) buildSyncMap();
  var t = followTop(src === ws ? syncMap.fwd : syncMap.back, src.clientHeight, src.scrollHeight, src.scrollTop,
    other.clientHeight, other.scrollHeight);
  if (Math.abs(other.scrollTop - t) < 0.5) return;
  other.scrollTop = t;
  syncExpect.set(other, other.scrollTop);
}
export function invalidateSync() { syncMap = null; }

/* Phải đăng ký trước sự kiện cuộn của dải đọc (initFocus): setByPage() đọc syncExpect trước khi nó bị xoá. */
export function initSyncScroll() {
  ['wrap-src', 'wrap-md'].forEach(function (id) {
    var el = $(id);
    el.addEventListener('scroll', function () {
      if (setByPage(el)) return;
      syncExpect.delete(el);
      if ($('views').dataset.mode !== 'split' || layoutVal('sync') === false) return;
      syncFrom(el);
    }, { passive: true });
  });
}
