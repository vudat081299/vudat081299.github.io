/* Màu, thuần (không DOM): đọc chuỗi màu đã tính của trình duyệt, trộn các lớp có alpha lên một nền đục thành mã #rrggbb.
   Dùng cho <meta name="theme-color"> khi có lớp mờ (ui/dom.js, syncBar).
   Xuất: barColor, parseColor.
   Dùng: không module nào. */

/* 'rgb(1, 2, 3)', 'rgba(1, 2, 3, .5)', 'rgb(1 2 3 / 50%)', 'color(srgb .1 .2 .3 / .5)', '#abc', '#aabbcc' →
   { r, g, b, a } (r, g, b 0–255, a 0–1); không đọc được thì null. */
export function parseColor(s) {
  s = String(s || '').trim().toLowerCase();
  var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(s);
  if (m) {
    var x = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
    return { r: parseInt(x.slice(0, 2), 16), g: parseInt(x.slice(2, 4), 16), b: parseInt(x.slice(4, 6), 16), a: 1 };
  }
  m = /^(rgba?|color)\((.*)\)$/.exec(s);
  if (!m) return null;
  var body = m[2], srgb = m[1] === 'color';
  if (srgb) { if (!/^srgb\s/.test(body)) return null; body = body.slice(4); }
  var parts = body.split(/[\s,\/]+/).filter(Boolean);
  if (parts.length !== 3 && parts.length !== 4) return null;
  var num = function (p, scale) { return /%$/.test(p) ? parseFloat(p) / 100 * scale : parseFloat(p) * (srgb && scale === 255 ? 255 : 1); };
  var c = { r: num(parts[0], 255), g: num(parts[1], 255), b: num(parts[2], 255), a: parts.length === 4 ? num(parts[3], 1) : 1 };
  return [c.r, c.g, c.b, c.a].some(isNaN) ? null : c;
}

function hex2(v) { return ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2); }

/* Nền bg (coi là đục) phủ lần lượt các lớp layers (chuỗi màu, có alpha) → '#rrggbb'. Lớp không đọc được thì bỏ qua;
   nền không đọc được thì null. */
export function barColor(bg, layers) {
  var c = parseColor(bg);
  if (!c) return null;
  (layers || []).forEach(function (s) {
    var l = parseColor(s);
    if (!l || !(l.a > 0)) return;
    c = { r: l.r * l.a + c.r * (1 - l.a), g: l.g * l.a + c.g * (1 - l.a), b: l.b * l.a + c.b * (1 - l.a) };
  });
  return '#' + hex2(c.r) + hex2(c.g) + hex2(c.b);
}
