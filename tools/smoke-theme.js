/* Mọi trang lên web theo theme hệ điều hành ở lần mở đầu (REPO-024).
 *
 * Mở từng trang hai lần với bộ nhớ trống: máy sáng thì nền phải sáng, máy tối thì nền phải tối.
 * Danh sách trang lấy từ `git ls-files '*.html'`, nên trang mới tự vào cổng.
 *
 * Bỏ qua:
 *   · `stuff/`: gác xép, không lên web.
 *   · file không có `<html`: mảnh nội dung nạp vào trang khác (`web-builder/pages/`).
 *   · trang chuyển hướng (`http-equiv="refresh"`).
 *   · `cashy/index.html`, `cashy/wb.html`: nguồn Vite, chỉ chạy sau khi build.
 *
 * Chạy:  node tools/smoke-theme.js [gốc-url]
 * Mặc định gốc là http://127.0.0.1:8347/ (chạy `python3 -m http.server 8347` ở gốc repo).
 * Thiếu playwright thì thoát mã 2 (BỎ QUA), như tools/smoke-index.js.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BASE = (process.argv[2] || 'http://127.0.0.1:8347/').replace(/\/?$/, '/');
const ROOT = path.dirname(__dirname);
const SKIP = new Set(['cashy/index.html', 'cashy/wb.html']);

let chromium;
for (const name of ['playwright-core', 'playwright']) {
  try { ({ chromium } = require(name)); break; } catch (e) { /* thử tên tiếp theo */ }
}
if (!chromium) {
  console.log('BỎ QUA: chưa có playwright.');
  process.exit(2);
}

const pages = execFileSync('git', ['-C', ROOT, 'ls-files', '*.html'], { encoding: 'utf8' })
  .split('\n').filter(Boolean)
  .filter((p) => !p.startsWith('stuff/') && !SKIP.has(p))
  .filter((p) => {
    const src = fs.readFileSync(path.join(ROOT, p), 'utf8');
    return /<html[\s>]/i.test(src) && !/http-equiv=["']?refresh/i.test(src);
  });

/* Độ sáng 0–1 của nền trang: nền đặc của `body`, rồi của `html`; cả hai trong suốt thì lấy nền của phần tử
 * ở tâm khung nhìn (đi ngược lên cha); không có gì thì là canvas của trình duyệt. */
function pageLuma() {
  const solid = (el) => {
    const c = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
    return c && (c.length < 4 || +c[3] > 0.5) ? c.slice(0, 3).map(Number) : null;
  };
  let rgb = solid(document.body) || solid(document.documentElement);
  for (let el = document.elementFromPoint(innerWidth / 2, innerHeight / 2); el && !rgb; el = el.parentElement) rgb = solid(el);
  if (!rgb) rgb = getComputedStyle(document.documentElement).colorScheme.includes('dark') ? [18, 18, 18] : [255, 255, 255];
  return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
}

(async () => {
  const browser = await chromium.launch();
  const bad = [];
  for (const p of pages) {
    const seen = {};
    for (const scheme of ['light', 'dark']) {
      const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 1000, height: 700 } });
      const page = await ctx.newPage();
      try {
        const res = await page.goto(BASE + p, { waitUntil: 'load', timeout: 20000 });
        if (!res || res.status() >= 400) throw new Error('HTTP ' + (res && res.status()));
        await page.waitForTimeout(300);
        seen[scheme] = await page.evaluate(pageLuma);
      } catch (e) {
        seen[scheme] = e.message.split('\n')[0];
      }
      await ctx.close();
    }
    const ok = typeof seen.light === 'number' && typeof seen.dark === 'number' && seen.light > 0.5 && seen.dark < 0.5;
    if (!ok) bad.push(`${p}  sáng=${fmt(seen.light)}  tối=${fmt(seen.dark)}`);
  }
  await browser.close();
  if (bad.length) {
    console.log(`theme: ${bad.length}/${pages.length} trang không theo theme hệ điều hành (cần nền sáng > 0.5, nền tối < 0.5):`);
    bad.forEach((b) => console.log('  ' + b));
    process.exit(1);
  }
  console.log(`theme: OK (${pages.length} trang theo theme hệ điều hành).`);
})();

function fmt(x) { return typeof x === 'number' ? x.toFixed(2) : x; }
