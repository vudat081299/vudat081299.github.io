/* Tiện ích chữ, thuần (không DOM): số nhiều tiếng Anh, chuẩn hoá xuống dòng, số dòng của một vị trí, slug tên file,
   luật file chữ khi mở / nạp từ đĩa, nhãn phím tắt (keyCombo).
   Xuất: hasNul, importCheck, isTextFile, keyCombo, lineOf, lineStarts, MAX_IMPORT, normNewlines, oneLine, plural, skipEntry, slug.
   Dùng: core/file-type.js. */
import { langOf } from './file-type.js';

/* Nhãn một tổ hợp phím, mọi nhãn phím tắt của trang qua đây (ui/dom.js shortcut): keys như ['mod', 'shift', 'C'];
   'mod' là ⌘ ở Mac, Ctrl nơi khác. Mac viết liền bằng ký hiệu Apple (⌘⇧C), nơi khác bằng chữ nối '+' (Ctrl+Shift+C). */
var MAC_KEYS = { mod: '⌘', shift: '⇧', alt: '⌥', ctrl: '⌃' };
var PC_KEYS = { mod: 'Ctrl', shift: 'Shift', alt: 'Alt', ctrl: 'Ctrl' };
export function keyCombo(keys, mac) {
  var names = mac ? MAC_KEYS : PC_KEYS;
  return keys.map(function (k) { return names[k] || k; }).join(mac ? '' : '+');
}
export function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }
export function oneLine(s) { return s.replace(/\s+/g, ' ').trim(); }
export function normNewlines(t) { return t.replace(/\r\n?/g, '\n'); }
/* File chữ (mở một file, nạp folder; MDAN-030): đuôi hay tên của một ngôn ngữ trong sổ (langOf: md, py, Makefile…), đuôi
   chữ khác (TEXT_EXT), tên chữ quen thuộc không đuôi (LICENSE…), hoặc kiểu text/*. Kiểu do trình duyệt đoán theo đuôi
   (.ts thành video/mp2t) nên đuôi đi trước. */
var TEXT_EXT = new Set('txt text rst adoc asciidoc org log csv tsv properties env sass vue svelte astro m jl fish tf hcl'.split(' '));
var TEXT_NAME = /^(?:containerfile|license|licence|readme|changelog|authors|contributors|notice|copying|todo|procfile|gemfile|rakefile|jenkinsfile|vagrantfile|brewfile|codeowners)$/i;
export function isTextFile(name, type) {
  var n = String(name), dot = n.lastIndexOf('.'), ext = n.slice(dot + 1).toLowerCase();
  if (dot > 0 ? TEXT_EXT.has(ext) || langOf(ext) : TEXT_NAME.test(n) || langOf(n)) return true;
  return /^text\//.test(type || '');
}
/* Chữ đọc được có ký tự NUL trong 8 KB đầu: file nhị phân, không mở / nạp. */
export function hasNul(text) { return text.slice(0, 8192).indexOf('\u0000') >= 0; }
/* Mục bỏ hẳn khi nạp folder (không đọc, không đếm): tên ẩn ('.git', '.DS_Store'), folder node_modules. Dùng cả lúc
   duyệt folder thả vào (không mở folder bị bỏ) lẫn importCheck. */
export function skipEntry(name, isDir) { return name[0] === '.' || (isDir && name === 'node_modules'); }
/* Nạp folder (MDAN-022): một file ở đường dẫn path (tính cả folder đã chọn ở đoạn đầu), kiểu type, cỡ size byte.
   'ignore': có đoạn bị bỏ (skipEntry) dưới folder đã chọn, hay chính file ấy khi nó đứng một mình; 'skip': không phải
   file chữ (isTextFile) hay lớn hơn MAX_IMPORT, bỏ và đếm vào số bỏ qua; '': nạp (còn phải qua hasNul sau khi đọc). */
export var MAX_IMPORT = 1024 * 1024;
export function importCheck(path, type, size) {
  var segs = String(path).split(/[\/\\]/).filter(Boolean), name = segs[segs.length - 1] || '';
  if (segs.some(function (x, i) { return (i > 0 || segs.length === 1) && skipEntry(x, i < segs.length - 1); })) return 'ignore';
  return isTextFile(name, type) && size <= MAX_IMPORT ? '' : 'skip';
}

/* Số dòng (đếm từ 1) của vị trí i trong nguồn; mảng đầu dòng nhớ theo văn bản. */
var lineCache = { text: null, starts: null };
export function lineOf(text, i) {
  if (lineCache.text !== text) {
    var st = [0];
    for (var k = 0; k < text.length; k++) if (text.charCodeAt(k) === 10) st.push(k + 1);
    lineCache = { text: text, starts: st };
  }
  var a = lineCache.starts, lo = 0, hi = a.length - 1;
  while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (a[mid] <= i) lo = mid; else hi = mid - 1; }
  return lo + 1;
}
/* Vị trí đầu mỗi dòng của văn bản (dòng 1 ở chỉ số 0). Mảng dùng chung với lineOf: đừng sửa. */
export function lineStarts(text) {
  lineOf(text, 0);
  return lineCache.starts;
}

export function slug(s) {
  return (s || 'session').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'session';
}
