/* Kiểm nhanh bằng trình duyệt thật cho shop/.
 *
 * Vì sao cần, khi đã có lint: cổng lint bắt được cú pháp và dữ liệu, KHÔNG bắt được hành vi.
 * Hai lỗi nặng nhất của thư mục này — hộp quà bị trả về mặc định sau mỗi lần giỏ đổi, và
 * trần tồn kho hộp quà không được tôn trọng — đều đi qua lint sạch sẽ. Cái bắt được chúng là
 * mở trình duyệt, bấm, rồi đọc localStorage.
 *
 * Chạy:  node shop/tools/smoke.js [base-url]
 * Mặc định base-url là http://localhost:8000/shop/
 *
 * Cần playwright-core và một bản Chromium. Không có thì thoát với mã 2 (BỎ QUA), không phải
 * mã 1 — thiếu công cụ không đồng nghĩa với trang hỏng.
 */
'use strict';

const BASE = (process.argv[2] || 'http://localhost:8000/shop/').replace(/\/?$/, '/');

/* Nạp playwright-core: thử cách thường trước, rồi mới tới thư mục global của npm.
 *
 * Phải có nhánh thứ hai, và đây là lý do: `require()` KHÔNG tìm trong `npm root -g`.
 * Bản đầu của file này chỉ có nhánh một rồi in ra lời khuyên "cài bằng npm i -g
 * playwright-core rồi chạy lại" — làm đúng y như thế thì lần chạy sau vẫn ra đúng thông báo
 * ấy, vì gói nằm ở /opt/node22/lib/node_modules chứ không nằm trên đường tìm của script.
 * Đo được ngày 21/09/2026. Bài học: lời khuyên in ra từ một cổng cũng là một lời hứa —
 * phải thử làm theo nó một lần rồi mới được viết ra. */
let chromium = (function () {
  try { return require('playwright-core').chromium; } catch (e) {}
  try {
    var path = require('path');
    var root = require('child_process')
      .execSync('npm root -g', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (root) return require(path.join(root, 'playwright-core')).chromium;
  } catch (e) {}
  return null;
})();
if (!chromium) {
  console.log('BỎ QUA: chưa có playwright-core. Cài bằng `npm i -g playwright-core` rồi chạy lại.');
  process.exit(2);
}

/* Tìm Chromium: biến môi trường trước, rồi các chỗ Playwright hay đặt.
 *
 * Phải nhận CẢ hai dạng. `playwright install chromium` ở bản mới chỉ tải
 * `chromium_headless_shell-<rev>/chrome-linux/headless_shell` chứ không tải bản đầy đủ —
 * đo được trên CI ngày 20/09/2026: bản đầu của hàm này chỉ nhận thư mục tên `chromium-<rev>`
 * với file tên `chrome`, nên nó báo "không tìm thấy" giữa lúc trình duyệt nằm ngay đó.
 * Ta chạy headless nên headless_shell dùng tốt; chỉ ưu tiên bản đầy đủ nếu có mặt. */
function findChrome() {
  const fs = require('fs'), path = require('path');
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;

  /* Ba hệ điều hành ba chỗ khác nhau, và macOS KHÔNG phải ~/.cache — Playwright đặt ở
   * ~/Library/Caches/ms-playwright. Thiếu dòng ấy thì trên máy Mac cổng luôn báo "không tìm
   * thấy trình duyệt" dù vừa cài xong, mà máy Linux trên CI vẫn xanh nên không ai thấy. */
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers',
                 path.join(process.env.HOME || '', '.cache/ms-playwright'),
                 path.join(process.env.HOME || '', 'Library/Caches/ms-playwright'),
                 path.join(process.env.LOCALAPPDATA || '', 'ms-playwright')].filter(Boolean);
  const rels = ['chrome-linux/chrome', 'chrome-linux64/chrome',
                'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
                'chrome-linux/headless_shell', 'chrome-linux64/headless_shell',
                'chrome-mac/headless_shell'];
  const hits = [];
  for (const root of roots) {
    let dirs = [];
    try { dirs = fs.readdirSync(root); } catch (e) { continue; }
    for (const d of dirs) {
      if (!/^chromium(_headless_shell)?-/.test(d)) continue;
      for (const rel of rels) {
        const p = path.join(root, d, rel);
        if (fs.existsSync(p)) hits.push(p);
      }
    }
  }
  if (!hits.length) return null;
  /* bản đầy đủ trước, headless shell sau */
  return hits.find(p => !p.includes('headless_shell')) || hits[0];
}

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? '  ok  ' : '  LỖI'} ${name}${detail ? '  — ' + detail : ''}`);
}

(async () => {
  const exe = findChrome();
  if (!exe) {
    console.log('BỎ QUA: không tìm thấy Chromium của Playwright.');
    console.log('  Đã tìm ở: PLAYWRIGHT_BROWSERS_PATH, /opt/pw-browsers, ~/.cache/ms-playwright');
    console.log('  Cài bằng: npx playwright install chromium');
    process.exit(2);
  }
  console.log('trình duyệt: ' + exe);

  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const jsErrors = [];
  ctx.on('page', p => {
    p.on('pageerror', e => jsErrors.push(`${p.url().split('/').pop() || 'index'}: ${e.message}`));
  });

  try {
    /* 1. Năm trang nạp được, không lỗi JS, không tràn ngang, không kẹt ở màn báo lỗi dữ liệu. */
    for (const name of ['index.html', 'products.html', 'scent-finder.html', 'gift.html', 'checkout.html']) {
      const pg = await ctx.newPage();
      await pg.goto(BASE + name, { waitUntil: 'networkidle' });
      await pg.waitForTimeout(500);
      const st = await pg.evaluate(() => ({
        dataErr: !!document.querySelector('#dataError')?.textContent.trim(),
        h: document.body.scrollHeight,
        overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      }));
      check(`nạp ${name}`, !st.dataErr && st.h > 500 && !st.overflow,
            st.dataErr ? 'không đọc được data/shop.json' : st.overflow ? 'tràn ngang' : '');
      await pg.close();
    }

    /* 2. Tìm mùi: đi hết một lượt phải ra kết quả có mùi và có phần trăm. */
    const q = await ctx.newPage();
    await q.goto(BASE + 'scent-finder.html', { waitUntil: 'networkidle' });
    await q.waitForTimeout(400);
    await q.click('#sfStart'); await q.waitForTimeout(250);
    for (const n of [1, 3, 3, 1, 1]) { await q.keyboard.press(String(n)); await q.waitForTimeout(280); }
    await q.waitForTimeout(400);
    const res = await q.evaluate(() => ({
      on: document.querySelector('#sfR')?.classList.contains('is-on'),
      name: document.querySelector('.sfname')?.textContent,
      pct: document.querySelector('.sfmatch__pct')?.textContent,
      why: document.querySelectorAll('.sfwhy li').length,
    }));
    check('Tìm mùi ra kết quả', !!(res.on && res.name && /^\d+%$/.test(res.pct || '')), `${res.name} ${res.pct}`);
    check('kết quả có nói lý do', res.why > 0, `${res.why} dòng`);

    /* 3. Hộp quà: TRẦN TỒN KHO phải được tôn trọng, và toast phải nói thật.
          Đây là phép đo sinh ra từ một lỗi có thật — bấm 8 lần vào hộp chỉ gói được 6 mà
          cả 8 lần đều báo "đã thêm". */
    const g = await ctx.newPage();
    await g.goto(BASE + 'gift.html', { waitUntil: 'networkidle' });
    await g.waitForTimeout(500);
    await g.evaluate(() => localStorage.removeItem('scentsitive-cart'));
    await g.reload({ waitUntil: 'networkidle' }); await g.waitForTimeout(500);
    await g.click('[data-box="b3"]'); await g.waitForTimeout(250);
    for (const i of [0, 1, 2]) { await g.click(`[data-slot="${i}"][data-scent="s1"]`); await g.waitForTimeout(160); }
    const cap = await g.evaluate(() => {
      const m = document.body.innerHTML.match(/Còn (\d+)/);
      return m ? +m[1] : null;
    });
    let lastToast = '';
    for (let i = 0; i < 9; i++) {
      await g.click('#gbAdd'); await g.waitForTimeout(170);
      lastToast = await g.evaluate(() => document.querySelector('#toastText')?.textContent || '');
    }
    const qty = await g.evaluate(() => (JSON.parse(localStorage.getItem('scentsitive-cart') || '[]')[0] || {}).q);
    const blocked = /Chỉ gói được/.test(lastToast);
    check('hộp quà tôn trọng trần tồn kho', qty <= 7 && blocked, `số lượng dừng ở ${qty}, toast cuối: "${lastToast}"`);
    check('giỏ giữ đúng một dòng hộp quà', await g.evaluate(() =>
      JSON.parse(localStorage.getItem('scentsitive-cart') || '[]').length) === 1);

    /* 4. Cấu hình hộp phải sống sót qua việc giỏ vẽ lại. */
    await g.click('#cartBtn'); await g.waitForTimeout(400);
    const cfg = await g.evaluate(() => {
      const c = JSON.parse(localStorage.getItem('scentsitive-cart') || '[]')[0];
      return c && c.g ? c.g.scents.length : 0;
    });
    check('cấu hình hộp không bị mất khi giỏ vẽ lại', cfg === 3, `${cfg} ngăn`);

    /* 5. Đo đạc có bắn không. */
    const evs = await g.evaluate(() => {
      const l = JSON.parse(localStorage.getItem('scentsitive-events') || '[]');
      return [...new Set(l.map(r => r.e))];
    });
    check('lớp đo có ghi sự kiện', evs.length >= 3, evs.join(', '));

    /* 6. Tồn kho là MỘT con số, dù bán qua hai đường.
     *
     * Lỗi gốc, đo 21/09/2026: `addToCart` kẹp theo `p.stock`, `giftStock` kẹp theo
     * `pr.stock`, hai bên không biết nhau. Gói 6 hộp ba cùng mùi 01 (18 cây) rồi bấm
     * thêm nến 01 ở trang Mùi hương — giỏ nhận thêm 20 cây nữa, tổng 38 trên tồn 20.
     * Cả hai lần chặn đều "đúng" so với con số chúng đọc; cái sai là hai con số.
     *
     * Đây là phép đo đầu tiên của bộ này SO HAI CON SỐ PHẢI KHỚP NHAU, thay vì hỏi một
     * trường có đúng kiểu không. Sáu lỗi tiền nặng nhất ở đây đều lọt cả bốn lớp cổng
     * vì không lớp nào làm việc ấy. */
    const sp = await ctx.newPage();
    await sp.goto(BASE + 'gift.html', { waitUntil: 'networkidle' });
    await sp.waitForTimeout(700);
    const declared = await sp.evaluate(async () => {
      const d = await (await fetch('data/shop.json')).json();
      return d.products.filter(p => p.scent === 's1').map(p => p.stock)[0];
    });
    await sp.click('[data-box="b3"]'); await sp.waitForTimeout(300);
    for (const i of [0, 1, 2]) {
      const el = await sp.$(`[data-slot="${i}"][data-scent="s1"]`);
      if (el) { await el.click(); await sp.waitForTimeout(200); }
    }
    for (let i = 0; i < 12; i++) {
      const btn = await sp.$('#gbAdd');
      if (!btn || !(await btn.isEnabled())) break;
      await btn.click(); await sp.waitForTimeout(70);
    }
    await sp.goto(BASE + 'products.html', { waitUntil: 'networkidle' });
    await sp.waitForTimeout(700);
    for (let i = 0; i < 30; i++) {
      const btn = await sp.$('[data-add="nen-01"]');
      if (!btn || !(await btn.isEnabled())) break;
      await btn.click(); await sp.waitForTimeout(60);
    }
    const held = await sp.evaluate(() =>
      JSON.parse(localStorage.getItem('scentsitive-cart') || '[]').reduce((n, c) =>
        n + (c.g ? c.q * (c.g.scents || []).filter(k => k === 's1').length
                 : (c.id === 'nen-01' ? c.q : 0)), 0));
    check('hộp quà và nến lẻ cùng mùi không bán quá tồn', held <= declared,
          held + ' cây mùi 01 trong giỏ / tồn khai báo ' + declared);

    /* 7. Chọn "Không cần thiệp" thì lời nhắn phải mất theo — đơn gửi shop là kênh duy
     * nhất, nên một đơn vừa nói "không cần thiệp" vừa mang lời nhắn là đơn không thi
     * hành được. Ô nhập bị ẩn chứ G.msg vẫn còn; ẩn không phải là xoá. */
    await sp.goto(BASE + 'gift.html', { waitUntil: 'networkidle' });
    await sp.evaluate(() => localStorage.removeItem('scentsitive-cart'));
    await sp.reload({ waitUntil: 'networkidle' }); await sp.waitForTimeout(800);
    const cds = await sp.$$('[data-card]');
    if (cds[1]) { await cds[1].click(); await sp.waitForTimeout(350); }
    const box = await sp.$('#gbMsg');
    if (box) { await box.fill('loi nhan thu'); await sp.waitForTimeout(300); }
    const first = await sp.$('[data-card]');
    if (first) { await first.click(); await sp.waitForTimeout(350); }
    await sp.click('#gbAdd'); await sp.waitForTimeout(250);
    const line = await sp.evaluate(() =>
      (JSON.parse(localStorage.getItem('scentsitive-cart') || '[]')[0] || {}).g || {});
    check('bỏ thiệp thì lời nhắn mất theo', !line.msg,
          'thiệp: ' + line.card + ' · lời nhắn: ' + JSON.stringify(line.msg || ''));
    await sp.close();

    /* 8. Font icon bị chặn thì KHÔNG được lộ chữ ligature.
     *
     * Lỗi gốc, đo ngày 21/09/2026: chặn fonts.googleapis.com rồi chụp lại, hero đọc thành
     * "storefront Xem 5 mùi hương" và nút giỏ đọc thành "dark_modeshopping_bag". Nguyên nhân:
     * document.fonts.load() resolve với mảng RỖNG khi tải hỏng chứ không reject, nên nhánh
     * `.then(ok, ok)` vẫn gắn class `icons`. Đây là lớp lỗi chỉ lộ ra khi mạng hỏng — mạng
     * tốt thì mãi mãi xanh — nên phải dựng lại tình huống ấy chứ không đợi nó tự xảy ra.
     * Mong đợi: không có class `icons`, mọi .ms vẫn visibility:hidden, chữ không đọc được. */
    const fp = await ctx.newPage();
    await fp.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await fp.goto(BASE + 'index.html', { waitUntil: 'domcontentloaded' });
    await fp.waitForTimeout(1200);
    const fs_ = await fp.evaluate(() => ({
      hasIcons: document.documentElement.classList.contains('icons'),
      leaked: [...document.querySelectorAll('.ms')]
        .filter(e => getComputedStyle(e).visibility !== 'hidden')
        .map(e => e.textContent.trim()).slice(0, 3),
    }));
    check('font hỏng thì không lộ chữ icon', !fs_.hasIcons && fs_.leaked.length === 0,
          fs_.leaked.length ? 'đang lộ: ' + fs_.leaked.join(', ') : 'icon ẩn, đúng như ADR 0005');
    await fp.close();

    check('không có lỗi JS trên trang nào', jsErrors.length === 0, jsErrors.slice(0, 2).join(' | '));
  } finally {
    await browser.close();
  }

  const bad = checks.filter(c => !c.ok);
  console.log(bad.length ? `\nsmoke: ${bad.length}/${checks.length} LỖI.` : `\nsmoke: OK (${checks.length} phép đo).`);
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error('smoke: hỏng —', e.message); process.exit(1); });
