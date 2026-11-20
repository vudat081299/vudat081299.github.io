/* Kích thước khung xem, thuần: Split có đủ chỗ không; hai khung Split cao bao nhiêu, có vừa khung nhìn không; cây file
   là cột ở mép trái màn hình (docked) hay tấm trượt, vùng làm việc và #doc rộng bao nhiêu khi cây docked. Đo DOM và đặt
   --pane-h / html.ma-fit ở ui/views.js, html.ma-tree-on ở ui/tree.js.
   Xuất: docRoom, paneHeight, READ_MIN, splitFits, treeDocks, treeRoom, viewNeed, wrapWidth.
   Dùng: không module nào. */

var PANE_MIN = 420;   // bề rộng tối thiểu của mỗi khung ở Split
var DIVIDER = 9;      // bề rộng vách giữa
var PANE_FLOOR = 320; // chiều cao tối thiểu của khung; thấp hơn thì trang cuộn
var BOTTOM_GAP = 17;  // khoảng chừa dưới đáy khung
/* #doc hẹp nhất để đọc một khung (Preview, Source, Edit) khi cây nằm cạnh: ~65 ký tự mỗi dòng ở Preview 16px. */
export var READ_MIN = 580;

/* #doc rộng docWidth có đủ cho hai khung ≥ 420px và vách giữa không. */
export function splitFits(docWidth) { return docWidth >= 2 * PANE_MIN + DIVIDER; }

/* Khung nhìn cao viewH, đỉnh khung ở top (tính trong trang), reserve: phần dưới đáy dành cho thứ khác (thanh đáy).
   Trả { h, fit }: h là chiều cao khung (≥ 320); fit khi khung vừa khung nhìn, trang khỏi cuộn. */
export function paneHeight(viewH, top, reserve) {
  var ph = Math.floor(viewH - top - BOTTOM_GAP - reserve);
  return { h: Math.max(PANE_FLOOR, ph), fit: ph >= PANE_FLOOR };
}

/* #doc cần rộng bao nhiêu cho chế độ người dùng chọn để đọc (v: 'split' | 'view' | 'src' | 'edit'). */
export function viewNeed(v) { return v === 'split' ? 2 * PANE_MIN + DIVIDER : READ_MIN; }

/* Cây docked là cột fixed sát mép trái màn hình; vùng làm việc căn giữa phần còn lại (MDAN-005, MDAN-037). Số đo g:
   client: bề rộng trang (trừ thanh cuộn), vw: 100vw, frac / floor: luật bề rộng .ma-wrap (--wrap-f, --wrap-min),
   chrome: phần vùng làm việc không phải #doc (lề, khe lưới, panel), không đổi theo cây; need: viewNeed(chế độ đọc).
   Vùng làm việc khi cây rộng tree (0: không docked), như width của .ma-wrap ở css/base.css. */
export function wrapWidth(g, tree) { return Math.min(g.client - tree, Math.max(g.frac * (g.vw - tree), g.floor)); }
/* #doc rộng bao nhiêu khi cây rộng tree. */
export function docRoom(g, tree) { return wrapWidth(g, tree) - g.chrome; }
/* Cây docked khi #doc vẫn đủ need sau khi nhường cây; không thì cây là tấm trượt trái. */
export function treeDocks(g, tree) { return docRoom(g, tree) >= g.need; }
/* Cây rộng nhất mà vẫn docked (kéo mép cây dừng ở đây): không quá chỗ còn lại, và (khi sàn floor chưa đủ) không để
   phần frac của khung nhìn còn lại hụt need. */
export function treeRoom(g) {
  var byClient = g.client - g.chrome - g.need;
  var byFrac = g.floor - g.chrome >= g.need ? Infinity : g.vw - (g.need + g.chrome) / g.frac;
  return Math.floor(Math.min(byClient, byFrac));
}
