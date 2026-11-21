/* Tra sổ core/langs.js, thuần: tên ngôn ngữ → id của highlight.js, tên file → loại file (MDAN-066), chế độ xem và tab
   panel có được với loại ấy (MDAN-067, MDAN-081).
   Xuất: fileType, langOf, paneFor, viewFor.
   Dùng: core/langs.js. */
import { LANGS } from './langs.js';

var NAMES = new Map();   // id hay tên khác (chữ thường) → id
Object.keys(LANGS).forEach(function (id) {
  NAMES.set(id, id);
  LANGS[id][0].split(' ').forEach(function (n) { if (n) NAMES.set(n, id); });
});

/* Tên ngôn ngữ (khối rào ```js, đuôi file, tên file không đuôi) → id trong LANGS, hoặc null. */
export function langOf(name) { return NAMES.get(String(name).toLowerCase()) || null; }

/* Loại file theo tên: { kind, lang, md }. 'markdown': đuôi của markdown (md, markdown…), hay không đuôi mà tên không
   phải ngôn ngữ (như tải về: README, LICENSE); 'code': đuôi hay tên của một ngôn ngữ trong LANGS (lang là id); còn lại
   (txt, csv, log…) 'plain'. md: có phần riêng của markdown — Preview, Split, Focus mode, đánh dấu đã đọc (MDAN-067,
   MDAN-073), tab Review (MDAN-081); file khác chỉ có Source, không chạy bộ tách markdown. */
export function fileType(name) {
  var n = String(name).toLowerCase(), dot = n.lastIndexOf('.');
  var lang = langOf(dot >= 0 ? n.slice(dot + 1) : n);
  var kind = lang === 'markdown' || (!lang && dot < 0) ? 'markdown' : lang ? 'code' : 'plain';
  return { kind: kind, lang: kind === 'code' ? lang : null, md: kind === 'markdown' };
}

/* Chế độ xem hiện được khi muốn want ('edit' | 'src' | 'view' | 'split') với loại file t: không có Preview thì Preview
   và Split về Source. Đủ chỗ cho Split hay không là việc của ui/views.js. */
export function viewFor(t, want) { return !t.md && (want === 'view' || want === 'split') ? 'src' : want; }

/* Tab panel hiện được khi muốn want ('list' | 'prompt' | 'review') với loại file t: không có đánh dấu đã đọc thì Review
   về Comments. */
export function paneFor(t, want) { return !t.md && want === 'review' ? 'list' : want; }
