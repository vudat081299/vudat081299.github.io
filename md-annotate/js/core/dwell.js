/* Gợi ý đã đọc theo thời gian đọc (MDAN-016), thuần: thời gian cần cho một đơn vị, khoá của đơn vị, cộng dồn thời gian
   đơn vị chạm dải đọc, phát hiện đơn vị rời dải đi lên (người đọc đã đi qua nó), dọn gợi ý.
   Gợi ý không bao giờ là dấu: ui/dwell.js chỉ vẽ dấu ✓ mờ; người dùng chấp nhận thì mới thành dấu (core/review.js).
   Khoá đơn vị = băm chữ + '.' + thứ tự trong các đơn vị cùng chữ: chữ đổi thì khoá đổi, gợi ý cũ tự rơi.
   Xuất: DWELL_MIN, DWELL_MAX, dwellNeed, dwellReady, dwellStep, sugKeys, sugList, unitWords.
   Dùng: core/text.js. */
import { lineStarts } from './text.js';

export var DWELL_MIN = 4000, DWELL_MAX = 60000;
var WPM = 230, SHARE = 0.4;   // đọc lướt: khoảng 40% số từ ở tốc độ đọc trung bình

/* Thời gian (ms) một đơn vị `words` từ phải chạm dải đọc trước khi được gợi ý: 40% số từ ÷ 230 từ/phút, kẹp 4–60 s. */
export function dwellNeed(words) {
  var ms = Math.round((Math.max(0, words || 0) * SHARE / WPM) * 60000);
  return Math.min(DWELL_MAX, Math.max(DWELL_MIN, ms));
}
export function dwellReady(ms, words) { return (ms || 0) >= dwellNeed(words); }

/* Số từ (chữ hay số liền nhau) của từng đơn vị (core/review.js reviewUnits) trong text. */
export function unitWords(text, units) {
  var st = lineStarts(text);
  return units.map(function (u) {
    var end = u.b + 1 < st.length ? st[u.b + 1] : text.length;
    return (text.slice(st[u.a], end).match(/[\p{L}\p{N}]+/gu) || []).length;
  });
}
/* Khoá của từng đơn vị: băm chữ (u.h) và thứ tự trong các đơn vị trùng chữ. */
export function sugKeys(units) {
  var seen = {};
  return units.map(function (u) { seen[u.h] = (seen[u.h] || 0) + 1; return u.h + '.' + (seen[u.h] - 1); });
}

/* Một bước đo. tr = { ms: { khoá: ms }, inb: [khoá đang chạm dải] } (bước đầu: {}). items: [{ k, top, bottom, w }]
   (toạ độ nội dung của khung, w: số từ); band: [mốc trên, mốc dưới] cùng toạ độ; dt: ms từ bước trước.
   opt.count: thời gian vừa qua là đọc thật (tab hiện, cửa sổ có focus, không rảnh tay, không cuộn do trang); dt cộng
   cho các đơn vị chạm dải ở bước trước. opt.emit: cuộn vừa rồi do người dùng; tắt thì đơn vị rời dải không được gợi ý.
   Trả { tr, ready }: ready là khoá các đơn vị vừa rời dải đi lên (đáy trên mốc trên) và đã đủ thời gian. */
export function dwellStep(tr, items, band, dt, opt) {
  var ms = Object.assign({}, (tr && tr.ms) || {}), prev = (tr && tr.inb) || [], inb = [], byK = {}, ready = [];
  if (opt && opt.count && dt > 0) prev.forEach(function (k) { ms[k] = (ms[k] || 0) + dt; });
  items.forEach(function (it) {
    byK[it.k] = it;
    if (it.bottom > band[0] && it.top < band[1]) inb.push(it.k);
  });
  if (opt && opt.emit) prev.forEach(function (k) {
    var it = byK[k];
    if (it && inb.indexOf(k) < 0 && it.bottom <= band[0] && dwellReady(ms[k], it.w)) ready.push(k);
  });
  return { tr: { ms: ms, inb: inb }, ready: ready };
}

/* Chỉ số các đơn vị đang được gợi ý: khoá có trong sug (đối tượng khoá → true), đơn vị chưa đọc ('todo' hay
   'changed'), không phải tiêu đề (units[i].head: tiêu đề đánh dấu cả section). Đơn vị đã đọc không hiện gợi ý; khoá
   không còn trong văn bản (chữ đổi) thì bỏ qua. */
export function sugList(sug, keys, state, units) {
  var out = [];
  keys.forEach(function (k, i) { if (sug[k] && state[i] !== 'done' && !(units && units[i].head)) out.push(i); });
  return out;
}
