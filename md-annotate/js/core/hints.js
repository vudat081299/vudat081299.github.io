/* Gợi ý nhận xét, thuần: số đếm (stats = { items: khoá chuẩn hoá → { t, n, last, o, seed?, pin?, hidden? }, built? }), xếp
   hạng, tỉ lệ, gợi ý mặc định, gợi ý cho hộp nhận xét, chữ hiện của gợi ý dài. Hàm nhận stats và sửa tại chỗ. Mỗi phiên
   một stats (s.hints, MDAN-088): core/session.js giữ, ui/hints.js đọc stats của phiên đang mở. Gợi ý không giới hạn độ
   dài (MDAN-087).
   Xuất: chipHints, countUse, dropBuilt, HINT_SHOW, hideHint, hintShown, migrateHints, MIN_PCT, normKey, normStats, pct,
     pinHint, rankedHints, resetHints, seedHints, statsFromDocs.
   Dùng: không module nào. */

export var HINT_SHOW = 80;      // gợi ý dài hơn chỉ hiện chừng này ký tự đầu, đuôi mờ dần (MDAN-087)
export var MIN_PCT = 5;          // chưa đủ số lần dùng thì tỉ lệ chỉ là nhiễu: không hiện
var POP_CHIPS = 5;               // số gợi ý của hộp gọn, còn lại gom vào chip "+N"

/* stats đọc từ bộ nhớ (có thể hỏng hoặc chưa có): trả stats dùng được. */
export function normStats(stats) {
  var items = stats && stats.items;
  if (!items || typeof items !== 'object' || Array.isArray(items)) return { items: {} };
  Object.keys(items).forEach(function (k) { if (!items[k] || typeof items[k] !== 'object') delete items[k]; });
  return stats;
}
export function normKey(t) {
  return String(t).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim().replace(/[.!…]+$/, '').trim();
}
/* Gợi ý mặc định đổi chữ (renamed: chữ cũ → chữ mới): dồn số đếm của khoá cũ sang khoá mới, giữ trạng thái ẩn. Chỉ
   khoá từng là gợi ý mặc định (seed); nhận xét tự gõ trùng chữ cũ giữ nguyên. */
export function migrateHints(stats, renamed) {
  Object.keys(renamed || {}).forEach(function (oldT) {
    var ko = normKey(oldT), kn = normKey(renamed[oldT]), old = stats.items[ko];
    if (!old || !old.seed || ko === kn) return;
    var it = stats.items[kn] || (stats.items[kn] = { t: renamed[oldT], n: 0, last: 0, o: 1e6 });
    it.n = (+it.n || 0) + (+old.n || 0);
    it.last = Math.max(+it.last || 0, +old.last || 0);
    if (old.hidden) it.hidden = true;
    if (old.pin) it.pin = true;
    delete stats.items[ko];
  });
}
export function seedHints(stats, list) {
  list.forEach(function (t, i) {
    var k = normKey(t);
    if (!k) return;
    var it = stats.items[k];
    if (!it) stats.items[k] = { t: t, n: 0, last: 0, o: i, seed: true };
    else { it.seed = true; it.o = i; }
  });
}
/* Đếm một lần dùng. Trả false khi không đếm (rỗng). Giữ tối đa 300 khoá. */
export function countUse(stats, t) {
  t = t.trim();
  var k = normKey(t);
  if (!k) return false;
  var it = stats.items[k] || (stats.items[k] = { t: t, n: 0, last: 0, o: 1e6 });
  it.n = (+it.n || 0) + 1; it.last = Date.now(); it.t = t; delete it.hidden;
  var keys = Object.keys(stats.items);
  if (keys.length > 300) {
    keys.filter(function (x) { var v = stats.items[x]; return !v.seed && !v.pin && v.n <= 1; })
        .sort(function (a, b) { return stats.items[a].last - stats.items[b].last; })
        .slice(0, keys.length - 300)
        .forEach(function (x) { delete stats.items[x]; });
  }
  return true;
}
/* Người dùng tự thêm gợi ý (t đã trim). Trả false khi t rỗng. */
export function pinHint(stats, t) {
  var k = normKey(t);
  if (!k) return false;
  var it = stats.items[k] || (stats.items[k] = { t: t, n: 0, last: 0, o: 1e6 });
  it.pin = true; it.t = t; delete it.hidden;
  return true;
}
/* Bỏ gợi ý là ẩn, không xoá số đếm. */
export function hideHint(stats, key) { var it = stats.items[key]; if (it) it.hidden = true; }
/* Về mặc định: gợi ý mặc định về 0 lần và hiện lại; mọi khoá khác bị xoá. */
export function resetHints(stats) {
  Object.keys(stats.items).forEach(function (k) {
    var v = stats.items[k];
    if (v.seed) { v.n = 0; v.last = 0; delete v.hidden; delete v.pin; } else delete stats.items[k];
  });
}
export function rankedHints(stats) {
  var arr = Object.keys(stats.items).map(function (k) {
    var v = stats.items[k];
    return { key: k, t: String(v.t || k), n: +v.n || 0, last: +v.last || 0, o: v.o == null ? 1e6 : +v.o, v: v };
  }).filter(function (x) {
    return !x.v.hidden && (x.v.seed || x.v.pin || x.n >= 1);
  });
  var N = arr.reduce(function (s, x) { return s + x.n; }, 0), K = arr.length;
  arr.forEach(function (x) { x.p = (x.n + 1) / (N + K); });
  arr.sort(function (a, b) { return b.n - a.n || b.last - a.last || a.o - b.o; });
  /* Số lần dùng mọi nhận xét đã đếm, kể cả chưa thành gợi ý: ngưỡng để hiện tỉ lệ. */
  arr.total = Object.keys(stats.items).reduce(function (t, k) { return t + (+stats.items[k].n || 0); }, 0);
  return arr;
}
/* Chữ hiện của gợi ý t: tối đa HINT_SHOW ký tự đầu (đếm theo điểm mã, không cắt đôi emoji); cut khi đã cắt. Chọn gợi ý
   vẫn dùng t trọn. */
export function hintShown(t) {
  var cs = Array.from(String(t));
  return cs.length > HINT_SHOW ? { text: cs.slice(0, HINT_SHOW).join(''), cut: true } : { text: String(t), cut: false };
}
export function pct(p) { var v = p * 100; return (v < 1 ? '<1' : Math.round(v)) + '%'; }
/* Gợi ý cho hộp nhận xét khi đang gõ text: lọc theo chữ đã gõ (khớp đúng chữ đã gõ thì bỏ). size: 'few' (mặc định)
   POP_CHIPS gợi ý đầu, more là số còn lại (chip "+N"); 'all' (giữ Mod hay đã bấm "+N", MDAN-084) mọi gợi ý, more 0.
   Cùng một thứ tự: 'all' chỉ thêm chip ở cuối, hạng của mỗi gợi ý không đổi. */
export function chipHints(stats, text, size) {
  var q = normKey(text);
  var all = rankedHints(stats), showPct = all.total >= MIN_PCT;
  var list = q ? all.filter(function (x) { return x.key.indexOf(q) >= 0 && x.key !== q; }) : all;
  var cap = size === 'all' ? list.length : POP_CHIPS;
  return { q: q, list: list.slice(0, cap), more: Math.max(0, list.length - cap), showPct: showPct };
}
/* Số đếm của một phiên lưu trước khi gợi ý tách theo phiên (MDAN-088): đếm chữ mọi nhận xét đã lưu trong docs
   (fileId → doc), mỗi nhận xét một lần, theo giờ tạo; lần dùng gần nhất là giờ tạo. built: chữ nhận xét Mod + 1 có thể
   đã bị đếm, dropBuilt bỏ nó khi biết chữ ấy. */
export function statsFromDocs(docs) {
  var stats = { items: {}, built: true }, all = [];
  Object.keys(docs || {}).forEach(function (id) { (docs[id].comments || []).forEach(function (c) { all.push(c); }); });
  all.sort(function (a, b) { return (+a.created || 0) - (+b.created || 0); });
  all.forEach(function (c) {
    if (typeof c.comment === 'string' && countUse(stats, c.comment)) stats.items[normKey(c.comment)].last = +c.created || 0;
  });
  return stats;
}
/* Số đếm dựng từ nhận xét (built): bỏ khoá của chữ t (nhận xét Mod + 1, không bao giờ đếm), một lần. */
export function dropBuilt(stats, t) {
  if (!stats.built || !normKey(t || '')) return;
  var it = stats.items[normKey(t)];
  if (it && !it.seed && !it.pin) delete stats.items[normKey(t)];
  delete stats.built;
}
