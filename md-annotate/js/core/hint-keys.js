/* Phím tắt chọn gợi ý trong hộp nhận xét (MDAN-084), thuần: phím (KeyboardEvent.code, không theo bố cục bàn phím) →
   hạng 1–10, phím nào phải bấm hai lần (C, V: lần đầu vẫn chép / dán như thường), các lần bấm của một hạng (hintPresses,
   nhãn thì core/text.js keyCombo), luật lần bấm thứ hai. Gợi ý sau hạng 10 không có phím. Phím của gợi ý ẩn "bỏ đoạn này"
   (REMOVE_KEY): không phải hạng nào, không chip.
   Xuất: HINT_KEYS, hintPresses, hintRank, isDouble, isModKey, REMOVE_KEY, TAP_MS, tapStep.
   Dùng: không module nào. */

var KEYS = ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'];   // hạng 1..10
var CHARS = 'ZXCVBNM,./';
var DOUBLE = { KeyC: true, KeyV: true };
export var HINT_KEYS = KEYS.length;   // số gợi ý đầu có phím
export var TAP_MS = 400;              // lần bấm thứ hai của C / V phải tới trong ngần này (ms)
export var REMOVE_KEY = 'Digit1';     // Mod + 1: lưu nhận xét "bỏ đoạn này" (remove của data/hints.json), bấm một lần

/* Hạng của phím (1..10); 0: không phải phím chọn gợi ý. */
export function hintRank(code) { return KEYS.indexOf(code) + 1; }
export function isDouble(code) { return DOUBLE[code] === true; }
/* e.key của phím bổ trợ: bấm nó không ngắt hai lần bấm C / V. */
export function isModKey(key) { return /^(?:Meta|Control|Shift|Alt|AltGraph|CapsLock|OS|Fn|Super|Hyper)$/.test(key); }
/* Các lần bấm chọn gợi ý hạng rank, mỗi lần một tổ hợp cho keyCombo: [['mod', 'Z']], bấm hai lần [['mod', 'C'], ['mod', 'C']];
   hạng không có phím: []. */
export function hintPresses(rank) {
  var code = KEYS[rank - 1];
  if (!code) return [];
  var one = ['mod', CHARS[rank - 1]];
  return isDouble(code) ? [one, one] : [one];
}
/* Một lần bấm phím không phải bổ trợ lúc now (ms). code: e.code khi chỉ giữ Mod, '' khi khác (phím khác ngắt chuỗi).
   prev: lần bấm C / V trước { code, t } hay null. Trả { hit, prev }: hit khi đây là lần thứ hai của cùng phím trong TAP_MS,
   không phím nào xen giữa; prev là thứ cần nhớ cho lần sau (lần thứ hai đã dùng thì null: bấm ba lần không chọn hai lần). */
export function tapStep(prev, code, now) {
  if (!isDouble(code)) return { hit: false, prev: null };
  if (prev && prev.code === code && now >= prev.t && now - prev.t <= TAP_MS) return { hit: true, prev: null };
  return { hit: false, prev: { code: code, t: now } };
}
