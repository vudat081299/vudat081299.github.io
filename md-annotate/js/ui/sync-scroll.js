/* Cuộn theo nhau ở Split (MDAN-006, prefs.sync): bản đồ khối nguồn ↔ khối Preview, nội suy Hermite đơn điệu.
   blockPairs() ghép khối nguồn với khối Preview (dùng chung với focus.js); setByPage() cho biết sự kiện cuộn là do
   trang tự đặt (focus.js dùng để không đổi khung đo dải đọc). Toán ở core/sync-math.js, ghép ở core/blocks.js; file
   này đo DOM và đặt scrollTop.
   Xuất: blockPairs, initSyncScroll, invalidateSync, setByPage.
   Dùng: core/blocks.js, core/sync-math.js, ui/dom.js, ui/state.js, ui/markdown.js, ui/layout.js, ui/views.js. */
import { lexSpans, pairBlocks } from '../core/blocks.js';
import { followTop, syncCurves } from '../core/sync-math.js';
import { $ } from './dom.js';
import { D } from './state.js';
import { mdLex } from './markdown.js';
import { layoutVal } from './layout.js';
import { isSplit } from './views.js';

/* Khối nguồn (lexSpans) và khối cấp cao của Preview, ghép bằng pairBlocks: { spans, blocks, toMd, toSrc }. Nhớ theo
   văn bản và lần vẽ Preview (renderAll thay mọi con của #v-md). */
var pairMemo = { text: null, first: undefined, val: null };
export function blockPairs() {
  var first = $('v-md').firstElementChild;
  if (pairMemo.text !== D.text || pairMemo.first !== first) {
    var spans = lexSpans(D.text, mdLex), blocks = Array.prototype.slice.call($('v-md').children);
    var p = pairBlocks(spans.map(function (sp) { return sp.tag; }), blocks.map(function (el) { return el.tagName; }));
    pairMemo = { text: D.text, first: first, val: { spans: spans, blocks: blocks, toMd: p.md, toSrc: p.src } };
  }
  return pairMemo.val;
}

/* Cuộn một khung thì khung kia cuộn sao cho cùng một đoạn nằm ở cùng một chỗ. Điểm tham chiếu là giữa khung; sát
   đầu / cuối thì trượt dần về mép, để hai khung cùng chạm đầu và cùng chạm cuối. Bản đồ: mỗi cặp khối của
   blockPairs() cho một mốc (đỉnh dòng nguồn, đỉnh khối Preview); giữa các mốc nội suy. Không cặp nào thì theo tỉ lệ. */
var syncMap = null, syncExpect = new Map();
function paneY(pane, el, bottom) {
  var r = el.getBoundingClientRect();
  return (bottom ? r.bottom : r.top) - pane.getBoundingClientRect().top + pane.scrollTop;
}
function syncKey() {
  var ws = $('wrap-src'), wm = $('wrap-md');
  return ws.scrollHeight + ':' + wm.scrollHeight + ':' + ws.clientWidth + ':' + wm.clientWidth + ':' + D.text.length;
}
function buildSyncMap() {
  var ws = $('wrap-src'), wm = $('wrap-md');
  var lines = $('v-src').querySelectorAll('.ma-ln'), bp = blockPairs();
  var pts = [[0, 0]];
  if (lines.length) {
    bp.spans.forEach(function (sp, i) {
      if (bp.toMd[i] < 0) return;
      var a = lines[Math.min(sp.a, lines.length - 1)];
      // Chỉ lấy đỉnh khối: đỉnh + đáy xen kẽ làm tốc độ đổi liên tục giữa thân khối và khoảng trống.
      pts.push([paneY(ws, a), paneY(wm, bp.blocks[bp.toMd[i]])]);
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

/* Đăng ký trước sự kiện cuộn của dải đọc (initFocus): người dùng cuộn thì syncExpect cũ của khung bị bỏ trước khi
   focus.js hỏi setByPage(). */
export function initSyncScroll() {
  ['wrap-src', 'wrap-md'].forEach(function (id) {
    var el = $(id);
    el.addEventListener('scroll', function () {
      if (setByPage(el)) return;
      syncExpect.delete(el);
      if (!isSplit() || layoutVal('sync') === false) return;
      syncFrom(el);
    }, { passive: true });
  });
}
