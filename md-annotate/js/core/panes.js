/* Kích thước khung xem, thuần: Split có đủ chỗ không; hai khung Split cao bao nhiêu, có vừa khung nhìn không. Đo DOM và
   đặt --pane-h / html.ma-fit ở ui/views.js.
   Xuất: paneHeight, splitFits.
   Dùng: không module nào. */

var PANE_MIN = 420;   // bề rộng tối thiểu của mỗi khung ở Split
var DIVIDER = 9;      // bề rộng vách giữa: cột 9px của .ma-views[data-mode="split"] (css/views.css)
var PANE_FLOOR = 320; // chiều cao tối thiểu của khung; thấp hơn thì trang cuộn
var BOTTOM_GAP = 17;  // khoảng chừa dưới đáy khung
/* #doc rộng docWidth có đủ cho hai khung ≥ 420px và vách giữa không. */
export function splitFits(docWidth) { return docWidth >= 2 * PANE_MIN + DIVIDER; }

/* Khung nhìn cao viewH, đỉnh khung ở top (tính trong trang), reserve: phần dưới đáy dành cho thứ khác (thanh đáy).
   Trả { h, fit }: h là chiều cao khung (≥ 320); fit khi khung vừa khung nhìn, trang khỏi cuộn. */
export function paneHeight(viewH, top, reserve) {
  var ph = Math.floor(viewH - top - BOTTOM_GAP - reserve);
  return { h: Math.max(PANE_FLOOR, ph), fit: ph >= PANE_FLOOR };
}
