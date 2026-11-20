/* Tiện ích chữ, thuần (không DOM): số nhiều tiếng Anh, chuẩn hoá xuống dòng, số dòng của một vị trí, slug tên file.
   Xuất: importCheck, isTextFile, lineOf, lineStarts, MAX_IMPORT, normNewlines, oneLine, plural, slug.
   Dùng: không module nào. */

export function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }
export function oneLine(s) { return s.replace(/\s+/g, ' ').trim(); }
export function normNewlines(t) { return t.replace(/\r\n?/g, '\n'); }
/* File mở được: đuôi .md / .markdown / .txt, hoặc kiểu text/*, hoặc không rõ kiểu. */
export function isTextFile(name, type) { return /\.(md|markdown|txt)$/i.test(name) || !type || /^text\//.test(type); }
/* Nạp folder (MDAN-022): một file ở đường dẫn path (tính cả folder đã chọn ở đoạn đầu), kiểu type, cỡ size byte.
   'ignore': có đoạn ẩn ('.git', '.DS_Store') hay node_modules dưới folder đã chọn, bỏ không đếm; 'skip': không phải file
   chữ (isTextFile) hay lớn hơn MAX_IMPORT, bỏ và đếm vào số bỏ qua; '': nạp. */
export var MAX_IMPORT = 1024 * 1024;
export function importCheck(path, type, size) {
  var segs = String(path).split(/[\/\\]/).filter(Boolean), name = segs[segs.length - 1] || '';
  if (segs.some(function (x, i) { return (i > 0 || segs.length === 1) && (x[0] === '.' || x === 'node_modules'); })) return 'ignore';
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
