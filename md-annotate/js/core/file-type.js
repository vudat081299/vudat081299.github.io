/* Tra sổ core/langs.js, thuần: tên ngôn ngữ → id của highlight.js, tên file → loại file (MDAN-066).
   Xuất: fileType, langOf.
   Dùng: core/langs.js. */
import { LANGS } from './langs.js';

var NAMES = new Map();   // id hay tên khác (chữ thường) → id
Object.keys(LANGS).forEach(function (id) {
  NAMES.set(id, id);
  LANGS[id][0].split(' ').forEach(function (n) { if (n) NAMES.set(n, id); });
});

/* Tên ngôn ngữ (khối rào ```js, đuôi file, tên file không đuôi) → id trong LANGS, hoặc null. */
export function langOf(name) { return NAMES.get(String(name).toLowerCase()) || null; }

/* Loại file theo tên: { kind, lang }. 'markdown': đuôi của markdown (md, markdown…), hay không đuôi mà tên không phải
   ngôn ngữ (như tải về: README, LICENSE); 'code': đuôi hay tên của một ngôn ngữ trong LANGS (lang là id); còn lại
   (txt, csv, log…) 'plain'. */
export function fileType(name) {
  var n = String(name).toLowerCase(), dot = n.lastIndexOf('.');
  var lang = langOf(dot >= 0 ? n.slice(dot + 1) : n);
  if (lang === 'markdown' || (!lang && dot < 0)) return { kind: 'markdown', lang: null };
  return lang ? { kind: 'code', lang: lang } : { kind: 'plain', lang: null };
}
