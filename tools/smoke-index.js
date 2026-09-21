/* Kiểm nhanh bằng trình duyệt thật cho trang chủ (index.html).
 *
 * Vì sao cần, khi đã có lint-collection.py: cổng lint đọc `data/collection.json` — nó không
 * biết trang VẼ RA thành cái gì. Từ 21/09/2026 trang chủ không còn dựng trên bộ web-builder
 * nữa (xem CLAUDE.md), nên cũng mất luôn bộ cổng G1–G9 của skill ấy. Những lớp lỗi dưới đây
 * đều đã xảy ra thật trên chính trang này và đều đi qua lint sạch sẽ:
 *
 *   · tràn ngang ở máy hẹp — `minmax(380px, 1fr)` không co xuống dưới 380px, và một slot
 *     `flex: none` trong thanh nav thì không bao giờ gập. Chỉ đo mới thấy.
 *   · gạch của hàng thò ra ngoài gạch của section 8px, vì một `margin-left` âm kéo theo cả
 *     `border-bottom`.
 *   · shorthand `padding: 9px 0 11px` trong media query xoá mất lề ngang của khung, làm chữ
 *     chạm sát mép màn ở 390px.
 *   · chữ xám quá nhạt: 2,79:1 — dưới ngưỡng AA 4,5:1.
 *   · lọc tìm kiếm còn trơ lại tiêu đề của section không còn mục nào.
 *
 * Chạy:  node tools/smoke-index.js [url]
 * Mặc định url là http://localhost:8000/index.html
 *
 * Cần playwright (hoặc playwright-core) và một bản Chromium — y như shop/tools/smoke.js.
 * Không có thì thoát với mã 2 (BỎ QUA), không phải mã 1: thiếu công cụ không đồng nghĩa với
 * trang hỏng.
 */
'use strict';

const path = require('path');
const URL_ = process.argv[2] || 'http://localhost:8000/index.html';
const ROOT = path.dirname(__dirname);

/* Thử CẢ HAI tên gói. shop/tools/smoke.js chỉ thử `playwright-core`, và trên máy này
 * playwright-core nằm LỒNG trong `playwright` (npm i -g playwright) nên require thẳng nó
 * trượt — cổng sẽ BỎ QUA mãi mãi. Một cổng bỏ qua mãi mãi là một cổng đã chết. */
let chromium;
for (const name of ['playwright-core', 'playwright']) {
  try { ({ chromium } = require(name)); break; } catch (e) { /* thử tên tiếp theo */ }
}
if (!chromium) {
  console.log('BỎ QUA: chưa có playwright. Cài bằng `npm i -g playwright` rồi chạy lại.');
  console.log('  (đã cài toàn cục nhưng vẫn trượt? đặt NODE_PATH="$(npm root -g)")');
  process.exit(2);
}

/* Giống hệt shop/tools/smoke.js — cùng một repo thì cùng một cách tìm trình duyệt.
 * Phải nhận CẢ bản đầy đủ (`chrome`) lẫn headless shell: `playwright install chromium` bản
 * mới chỉ tải headless_shell, và ta chạy headless nên nó dùng tốt. */
function findChrome() {
  const fs = require('fs');
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers',
                 path.join(process.env.HOME || '', '.cache/ms-playwright'),
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
  return hits.find(p => !p.includes('headless_shell')) || hits[0];
}

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok });
  console.log(`${ok ? '  ok  ' : '  LỖI'} ${name}${detail ? '  — ' + detail : ''}`);
}
function skip(name, why) {
  console.log(`  bỏ  ${name}  — ${why}`);
}

/* Mọi phép đo đều chờ hai thứ trước đã: nội dung đã nạp xong từ collection.json, và mặt chữ
 * đã là mặt chữ THẬT. Đo lúc đang dùng font dự phòng thì ra số sai — đã từng đọc nhầm thành
 * "tràn ngang 99px" vì đúng lý do này. */
async function ready(page) {
  await page.waitForFunction(() => document.querySelectorAll('[data-item]').length > 0,
    null, { timeout: 20000 });
  await page.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: 20000 });
  return page.evaluate(() => document.fonts.check('600 16px Fraunces')
    && document.fonts.check('400 15px "Be Vietnam Pro"'));
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
  console.log('trang      : ' + URL_ + '\n');

  const data = JSON.parse(require('fs').readFileSync(path.join(ROOT, 'data/collection.json'), 'utf8'));
  const LABELS = data.sections.map(s => s.label);
  const N = data.sections.reduce((n, s) => n + (s.kind === 'tiles' ? s.items.length
    : s.items.reduce((m, i) => m + i.files.length, 0)), 0);

  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const jsErrors = [];

  async function open(width, opts = {}) {
    const ctx = await browser.newContext({
      viewport: { width, height: opts.height || 900 },
      colorScheme: opts.scheme || 'light',
    });
    const p = await ctx.newPage();
    p.on('pageerror', e => jsErrors.push(e.message));
    await p.goto(URL_, { waitUntil: 'networkidle' });
    p.__fonts = await ready(p);
    return p;
  }

  /* ---- 1. tràn ngang ---------------------------------------------------- */
  let fontsOk = true;
  for (const w of [1440, 1280, 1100, 1000, 900, 768, 640, 480, 390, 360, 320]) {
    const p = await open(w);
    fontsOk = fontsOk && p.__fonts;
    const o = await p.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (p.__fonts) check(`không tràn ngang @${w}px`, o === 0, `lệch ${o}px`);
    else skip(`không tràn ngang @${w}px`, 'mặt chữ web chưa nạp được (mạng?) — số đo sẽ sai');
    await p.context().close();
  }

  const p = await open(1280);

  /* ---- 2. trang vẽ đúng những gì có trong data --------------------------- */
  {
    const r = await p.evaluate(() => ({
      secs:  [...document.querySelectorAll('.ix-sec__head h2')].map(h => h.textContent.trim()),
      toc:   [...document.querySelectorAll('[data-toc] .ix-toc__l')].map(h => h.textContent.trim()),
      foot:  [...document.querySelectorAll('#foot-links a')].map(h => h.textContent.trim()),
      items: document.querySelectorAll('[data-item]').length,
      keys:  [...document.querySelectorAll('[data-item]')].map(a => a.dataset.key).filter(Boolean),
      blank: [...document.querySelectorAll('.ix-key')]
               .filter(k => !k.textContent.trim() && !k.classList.contains('ix-key--none')).length,
    }));
    const eq = (a, x) => JSON.stringify(a) === JSON.stringify(x);
    check('số hàng khớp collection.json', r.items === N, `${r.items} / ${N}`);
    check('thứ tự section khớp data', eq(r.secs, LABELS), r.secs.join(' · '));
    check('mục lục + chân trang cùng một thứ tự', eq(r.toc, LABELS) && eq(r.foot, LABELS));
    check('phím tắt không trùng, không có chip rỗng',
      new Set(r.keys).size === r.keys.length && r.blank === 0, `${r.keys.length} phím`);
  }

  /* ---- 3. link sống ------------------------------------------------------ */
  {
    const hrefs = await p.evaluate(() =>
      [...document.querySelectorAll('[data-item]')].map(a => a.getAttribute('href')));
    const broken = [];
    for (const h of hrefs) {
      const res = await p.request.get(new URL(h, URL_).toString());
      if (!res.ok()) broken.push(`${h} → ${res.status()}`);
    }
    check('mọi href mở được', broken.length === 0,
      `${hrefs.length} link, hỏng: ${broken.length ? broken.join(', ') : 'không'}`);
  }

  /* ---- 4. mép trái thẳng hàng -------------------------------------------- */
  {
    const r = await p.evaluate(() => {
      const L = s => Math.round(document.querySelector(s).getBoundingClientRect().left);
      return { head: L('.ix-sec__head'), desc: L('.ix-sec__desc'), row: L('.ix-row') };
    });
    check('gạch section / mô tả / hàng cùng một mép trái',
      r.head === r.desc && r.desc === r.row, `${r.head} · ${r.desc} · ${r.row}`);
  }

  /* ---- 5. lọc tìm kiếm ---------------------------------------------------- */
  {
    const state = () => p.evaluate(() => ({
      items: document.querySelectorAll('[data-item]:not([hidden])').length,
      emptySecs: [...document.querySelectorAll('[data-section]')]
        .filter(s => !s.hidden && !s.querySelector('[data-item]:not([hidden])')).length,
      emptySubj: [...document.querySelectorAll('[data-subject]')]
        .filter(s => !s.hidden && !s.querySelector('[data-item]:not([hidden])')).length,
      toc: [...document.querySelectorAll('[data-toc]')].filter(a => !a.hidden).length,
      tocBox: !document.getElementById('toc').hidden,
      empty: !document.getElementById('empty').hidden,
    }));
    const type = async v => { await p.fill('#q', v); await p.waitForTimeout(60); };

    await type('loto'); let s = await state();
    check('lọc: không trơ lại section/nhóm rỗng',
      s.items === 1 && s.emptySecs === 0 && s.toc === 1, `"loto" → ${s.items} hàng, ${s.toc} mục lục`);

    await type('thesis'); s = await state();
    check('lọc: nhóm môn rỗng tự ẩn', s.emptySubj === 0 && s.emptySecs === 0, `"thesis" → ${s.items} hàng`);

    await type('zzzz'); s = await state();
    const foot = await p.evaluate(() => {
      const f = document.querySelector('.ix-foot').getBoundingClientRect();
      return f.bottom >= window.innerHeight - 2;
    });
    check('không kết quả: hiện ô báo, ẩn mục lục, chân trang chạm đáy',
      s.items === 0 && s.empty && !s.tocBox && foot);

    await p.click('#clear'); s = await state();
    check('nút Clear trả lại đủ hàng', s.items === N && !s.empty);
  }

  /* ---- 6. bàn phím -------------------------------------------------------- */
  {
    await p.evaluate(() => document.activeElement.blur());
    await p.keyboard.press('/');
    check('phím "/" nhảy vào ô tìm kiếm', await p.evaluate(() => document.activeElement.id === 'q'));
    await p.keyboard.press('Escape');
    const r = await p.evaluate(() => ({ f: document.activeElement.id, v: document.getElementById('q').value }));
    check('phím Esc xoá ô và nhả focus', r.f !== 'q' && r.v === '');

    const first = await p.evaluate(() => {
      const a = document.querySelector('[data-item][data-key]:not([data-key=""])');
      return { key: a.dataset.key, href: a.getAttribute('href') };
    });
    let went = true;
    try {
      await Promise.all([
        p.waitForURL('**/' + first.href.replace(/^\.?\//, ''), { timeout: 5000 }),
        p.keyboard.press(first.key),
      ]);
    } catch (e) { went = false; }
    check(`phím "${first.key}" mở thẳng trang của nó`, went, first.href);
    await p.goto(URL_, { waitUntil: 'networkidle' });
    await ready(p);
  }

  /* ---- 7. tương phản chữ ở cả hai nền ------------------------------------- */
  for (const scheme of ['light', 'dark']) {
    const q = scheme === 'light' ? p : await open(1280, { scheme });
    const r = await q.evaluate(() => {
      const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
      const lum = ([r2, g, b2]) => { const f = c => { c /= 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
        return .2126 * f(r2) + .7152 * f(g) + .0722 * f(b2); };
      const ratio = (a, z) => { const [x, y] = [lum(a), lum(z)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
      const bg = rgb(getComputedStyle(document.body).backgroundColor);
      const out = {};
      for (const sel of ['.ix-row__t', '.ix-row__d', '.ix-sec__desc', '.ix-lede',
                         '.ix-toc__l', '.ix-hint', '.ix-count', '.ix-eyebrow', '.ix-subj__m']) {
        const el = document.querySelector(sel);
        if (el) out[sel] = +ratio(rgb(getComputedStyle(el).color), bg).toFixed(2);
      }
      return out;
    });
    const worst = Object.entries(r).sort((a, z) => a[1] - z[1])[0];
    check(`tương phản chữ ≥ 4,5:1 (nền ${scheme === 'light' ? 'sáng' : 'tối'})`,
      worst[1] >= 4.5, `thấp nhất ${worst[1]}:1 ở ${worst[0]}`);
    if (q !== p) await q.context().close();
  }

  /* ---- 8. nền tảng a11y --------------------------------------------------- */
  {
    const r = await p.evaluate(() => {
      const hs = [...document.querySelectorAll('h1,h2,h3')].map(h => +h.tagName[1]);
      let skips = 0; for (let i = 1; i < hs.length; i++) if (hs[i] - hs[i - 1] > 1) skips++;
      return {
        h1: document.querySelectorAll('h1').length, skips,
        unlabelled: [...document.querySelectorAll('button')]
          .filter(b => !b.getAttribute('aria-label') && !b.textContent.trim()).length,
        realLinks: [...document.querySelectorAll('[data-item]')].every(a => a.tagName === 'A' && a.getAttribute('href')),
        divClick: document.querySelectorAll('div[onclick],span[onclick]').length,
        navLabels: [...document.querySelectorAll('nav')].every(n => n.getAttribute('aria-label')),
        inputLabel: !!document.getElementById('q').getAttribute('aria-label'),
      };
    });
    check('a11y nền tảng', r.h1 === 1 && r.skips === 0 && r.unlabelled === 0 && r.realLinks
      && r.divClick === 0 && r.navLabels && r.inputLabel,
      `1×h1=${r.h1 === 1}, nhảy bậc=${r.skips}, nút không nhãn=${r.unlabelled}, mọi mục là <a href>=${r.realLinks}`);
  }

  /* ---- 9. không lặng lẽ quay về bộ web-builder ---------------------------- */
  {
    const raw = require('fs').readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const body = raw.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const wb = (body.match(/\bwb-[a-z0-9_-]+/g) || []);
    const css = (body.match(/web-builder[^"']*\.css/g) || []);
    check('trang chủ vẫn tự chứa, không nối lại vào web-builder',
      wb.length === 0 && css.length === 0, `class wb-*: ${wb.length}, link css: ${css.length}`);
  }

  check('không có lỗi JS trên console', jsErrors.length === 0, jsErrors.join(' | ') || 'sạch');

  await browser.close();
  const bad = checks.filter(c => !c.ok).length;
  console.log(`\n${bad ? `index: ${bad} LỖI` : `index: ${checks.length} phép kiểm, tất cả ok`}`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('smoke-index đổ: ' + (e && e.message)); process.exit(1); });
