/* Sổ ngôn ngữ của highlight.js (js/core/langs.js): in dòng cho ngôn ngữ mới, hoặc kiểm integrity cả sổ. Cần mạng, không
 * nằm trong cổng.
 * Chạy:  node md-annotate/tools/hl-lang.mjs python dart:pubspec   dòng của từng id; sau ':' là tên thêm (đuôi file)
 *        node md-annotate/tools/hl-lang.mjs --check              tải lõi và mọi ngôn ngữ trong sổ, so integrity
 * Dòng in ra có tên = alias của highlight.js + tên thêm; ngôn ngữ nhúng (subLanguage) in ở chú thích, chép vào cột thứ ba
 * khi phần nhúng là nội dung chính (VD xml: css javascript). */
import { createHash } from 'node:crypto';
import { HLJS, CORE_SRI, LANGS } from '../js/core/langs.js';

const sri = (buf) => 'sha384-' + createHash('sha384').update(buf).digest('base64');
async function get(path) {
  const r = await fetch(HLJS + path);
  if (!r.ok) throw new Error(path + ': HTTP ' + r.status);
  return Buffer.from(await r.arrayBuffer());
}
const load = async (buf) => (await import('data:text/javascript;base64,' + buf.toString('base64'))).default;

/* Tên ngôn ngữ nhúng của một định nghĩa (đi hết cây mode). */
function subLanguages(lang) {
  const out = new Set(), seen = new Set();
  (function walk(m) {
    if (!m || typeof m !== 'object' || seen.has(m)) return;
    seen.add(m);
    if (m.subLanguage) [].concat(m.subLanguage).forEach((s) => out.add(s));
    for (const k of ['contains', 'variants', 'starts']) [].concat(m[k] || []).forEach(walk);
  })(lang);
  return [...out];
}

if (process.argv[2] === '--check') {
  let bad = 0;
  const check = async (path, want) => {
    const got = sri(await get(path));
    if (got !== want) { bad++; console.log('  LỖI ' + path + '  — ' + got); }
  };
  await check('core.min.js', CORE_SRI);
  for (const id of Object.keys(LANGS)) await check('languages/' + id + '.min.js', LANGS[id][1]);
  console.log(bad ? bad + ' file sai integrity' : 'ok: lõi + ' + Object.keys(LANGS).length + ' ngôn ngữ');
  process.exit(bad ? 1 : 0);
}

const hljs = await load(await get('core.min.js'));
for (const arg of process.argv.slice(2)) {
  const [id, extra = ''] = arg.split(':');
  const buf = await get('languages/' + id + '.min.js');
  const def = (await load(buf))(hljs);
  const names = [...new Set([...(def.aliases || []), ...extra.split(',').filter(Boolean)])].join(' ');
  const subs = subLanguages(def).filter((s) => s !== id);
  console.log(`  ${/^[\w]+$/.test(id) ? id : "'" + id + "'"}: ['${names}', '${sri(buf)}'],${subs.length ? '  // nhúng: ' + subs.join(' ') : ''}`);
}
