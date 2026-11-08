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
  return page.evaluate(() => document.fonts.check('600 16px "Space Grotesk"')
    && document.fonts.check('400 15px "Be Vietnam Pro"')
    && document.fonts.check('500 12px "JetBrains Mono"'));
}

/* Tương phản: chữ so với nền THẬT của nó — trộn màu nền có alpha của mọi tổ tiên, từ tổ tiên
 * đục gần nhất trở xuống. So với nền của body thì sai ở chữ nằm trên mặt nổi (khu đầu, bảng ẩn).
 * Chạy trong trang, nên viết thành chuỗi hàm để truyền vào evaluate. */
const CONTRAST_JS = `
  const num = s => {
    if (/^color\\(srgb/.test(s)) {
      const m = s.match(/[\\d.]+/g).map(Number);
      return { r: m[0] * 255, g: m[1] * 255, b: m[2] * 255, a: m[3] == null ? 1 : m[3] };
    }
    const m = (s.match(/[\\d.]+/g) || []).map(Number);
    return { r: m[0], g: m[1], b: m[2], a: m[3] == null ? 1 : m[3] };
  };
  const over = (c, base) => ({ r: c.r * c.a + base.r * (1 - c.a), g: c.g * c.a + base.g * (1 - c.a),
                               b: c.b * c.a + base.b * (1 - c.a), a: 1 });
  /* Nền vẽ bằng ::before nằm sau chữ (absolute, z-index -1) — chip mục lục, nền hàng khi rê —
   * cũng là nền của chữ; alpha nhân với opacity của nó. */
  const under = e => {
    const b = getComputedStyle(e, '::before');
    if (b.content === 'none' || b.position !== 'absolute' || b.zIndex !== '-1') return null;
    const c = num(b.backgroundColor);
    c.a *= +b.opacity;
    return c.a > 0 ? c : null;
  };
  const bgOf = el => {
    const stack = [];
    for (let e = el; e; e = e.parentElement) {
      const u = under(e);
      if (u) { stack.push(u); if (u.a >= 1) break; }
      const c = num(getComputedStyle(e).backgroundColor);
      if (c.a > 0) { stack.push(c); if (c.a >= 1) break; }
    }
    let out = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = stack.length - 1; i >= 0; i--) out = over(stack[i], out);
    return out;
  };
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
    return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const ratio = (a, z) => { const [x, y] = [lum(a), lum(z)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
  const of = el => { const bg = bgOf(el); return ratio(over(num(getComputedStyle(el).color), bg), bg); };
`;

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
  const SECTIONS = data.zones.flatMap(z => z.sections);
  const LABELS = SECTIONS.map(s => s.label);
  const ZONES = data.zones.map(z => z.label);
  const N = SECTIONS.reduce((n, s) => n + (s.kind === 'tiles' ? s.items.length
    : s.items.reduce((m, i) => m + i.files.length, 0)), 0);
  const GROUPS = data.hold && data.hold.groups ? data.hold.groups : [];
  /* Số hàng mong đợi khi tìm, đếm thẳng từ data (tên, mô tả, tags), bỏ dấu như trang. */
  const fold = t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const ROWS = SECTIONS.flatMap(s => s.kind === 'tiles'
    ? s.items.map(i => [i.name, i.desc, i.tags || ''].join(' '))
    : s.items.flatMap(i => i.files.map(f => [f.title, f.sub, f.tags || ''].join(' '))));
  const hits = q => ROWS.filter(r => fold(r).includes(fold(q))).length;
  const DATA_TAGS = { cuped: hits('cuped'), hoahoc: hits('hoá học') };
  const H = GROUPS.flatMap(g => g.items);
  const eq = (a, x) => JSON.stringify(a) === JSON.stringify(x);

  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const jsErrors = [];

  async function open(width, opts = {}) {
    const ctx = await browser.newContext({
      viewport: { width, height: opts.height || 900 },
      colorScheme: opts.scheme || 'light',
      reducedMotion: opts.motion || 'no-preference',
    });
    const p = await ctx.newPage();
    p.on('pageerror', e => jsErrors.push(e.message));
    await p.goto(URL_, { waitUntil: 'networkidle' });
    p.__fonts = await ready(p);
    return p;
  }
  const chord = async q => {
    await q.keyboard.down('Shift'); await q.keyboard.down('Slash');
    await q.keyboard.up('Slash'); await q.keyboard.up('Shift');
  };

  /* ---- 1. tràn ngang — trang, và bảng ẩn khi mở ------------------------- */
  let fontsOk = true;
  for (const w of [1440, 1280, 1100, 1000, 900, 768, 640, 480, 390, 360, 320]) {
    const p = await open(w);
    fontsOk = fontsOk && p.__fonts;
    const o = await p.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (!p.__fonts) {
      skip(`không tràn ngang @${w}px`, 'mặt chữ web chưa nạp được (mạng?) — số đo sẽ sai');
    } else if (!H.length) {
      check(`không tràn ngang @${w}px`, o === 0, `lệch ${o}px`);
    } else {
      await chord(p);
      const h = await p.evaluate(() => {
        const b = document.getElementById('hold');
        const r = b.getBoundingClientRect();
        return { inner: b.scrollWidth - b.clientWidth,
                 out: Math.max(0, -r.left, r.right - window.innerWidth) };
      });
      check(`không tràn ngang @${w}px (trang · bảng ẩn)`, o === 0 && h.inner === 0 && h.out < 1,
        `trang ${o}px · trong bảng ${h.inner}px · bảng thò ${h.out.toFixed(1)}px`);
    }
    await p.context().close();
  }

  const p = await open(1280);

  /* ---- 2. trang vẽ đúng những gì có trong data --------------------------- */
  {
    const r = await p.evaluate(() => ({
      secs:  [...document.querySelectorAll('.ix-sec__t')].map(h => h.textContent.trim()),
      zones: [...document.querySelectorAll('[data-zone] .ix-zone__t')].map(h => h.textContent.trim()),
      zoneOf: [...document.querySelectorAll('[data-section]')].map(s => s.closest('[data-zone]').id),
      toc:   [...document.querySelectorAll('[data-toc] .ix-toc__l')].map(h => h.textContent.trim()),
      tocZ:  [...document.querySelectorAll('[data-toc-zone]')]
               .map(g => [...g.querySelectorAll('[data-toc]')].map(a => a.dataset.toc)),
      foot:  [...document.querySelectorAll('#foot-links a')].map(h => h.textContent.trim()),
      items: document.querySelectorAll('[data-item]').length,
      keys:  [...document.querySelectorAll('[data-item]')].map(a => a.dataset.key).filter(Boolean),
      blank: [...document.querySelectorAll('.ix-key')]
               .filter(k => !k.textContent.trim() && !k.classList.contains('ix-key--none')).length,
    }));
    check('số hàng khớp collection.json', r.items === N, `${r.items} / ${N}`);
    check('thứ tự section khớp data', eq(r.secs, LABELS), r.secs.join(' · '));
    check('khu khớp data: thứ tự khu, section nào thuộc khu nào',
      eq(r.zones, ZONES) && eq(r.zoneOf, data.zones.flatMap(z => z.sections.map(() => z.id)))
        && eq(r.tocZ, data.zones.map(z => z.sections.map(s => s.id))), r.zones.join(' · '));
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

  /* ---- 4. mép trái thẳng hàng — ở MỌI section ------------------------------ */
  {
    const bad = await p.evaluate(() => [...document.querySelectorAll('[data-section]')].filter(s => {
      const L = sel => Math.round(s.querySelector(sel).getBoundingClientRect().left);
      return !(L('.ix-sec__head') === L('.ix-sec__desc') && L('.ix-sec__desc') === L('.ix-row'));
    }).map(s => s.id));
    check('gạch section / mô tả / hàng đầu cùng một mép trái', bad.length === 0,
      bad.length ? 'lệch ở ' + bad.join(', ') : `${LABELS.length} section`);
  }

  /* ---- 5. lọc tìm kiếm ---------------------------------------------------- */
  {
    const state = () => p.evaluate(() => ({
      items: document.querySelectorAll('[data-item]:not([hidden])').length,
      emptySecs: [...document.querySelectorAll('[data-section]')]
        .filter(s => !s.hidden && !s.querySelector('[data-item]:not([hidden])')).length,
      emptySubj: [...document.querySelectorAll('[data-subject]')]
        .filter(s => !s.hidden && !s.querySelector('[data-item]:not([hidden])')).length,
      emptyZones: [...document.querySelectorAll('[data-zone]')]
        .filter(z => !z.hidden && !z.querySelector('[data-item]:not([hidden])')).length,
      emptyTocZ: [...document.querySelectorAll('[data-toc-zone]')]
        .filter(g => !g.hidden && !g.querySelector('[data-toc]:not([hidden])')).length,
      zones: [...document.querySelectorAll('[data-zone]')].filter(z => !z.hidden).length,
      toc: [...document.querySelectorAll('[data-toc]')].filter(a => !a.hidden).length,
      tocBox: !document.getElementById('toc').hidden,
      empty: !document.getElementById('empty').hidden,
    }));
    const type = async v => { await p.fill('#q', v); await p.waitForTimeout(60); };

    await type('json'); let s = await state();
    check('lọc: không trơ lại khu/section/nhóm rỗng',
      s.items === 1 && s.emptySecs === 0 && s.emptyZones === 0 && s.emptyTocZ === 0
        && s.toc === 1 && s.zones === 1,
      `"json" → ${s.items} hàng, ${s.toc} mục lục, ${s.zones} khu`);

    await type('thesis'); s = await state();
    check('lọc: nhóm môn rỗng tự ẩn', s.emptySubj === 0 && s.emptySecs === 0 && s.emptyZones === 0,
      `"thesis" → ${s.items} hàng`);

    await type('cuped'); s = await state();
    const tagsN = DATA_TAGS;
    check('lọc: khớp từ khoá ẩn `tags`', s.items >= 1 && s.items === tagsN.cuped, `"cuped" → ${s.items} hàng`);
    await type('hoa hoc'); s = await state();
    check('lọc: không phân biệt dấu', s.items === tagsN.hoahoc, `"hoa hoc" → ${s.items} hàng`);

    await type('zzzz'); s = await state();
    const foot = await p.evaluate(() => {
      const f = document.querySelector('.ix-foot').getBoundingClientRect();
      return f.bottom >= window.innerHeight - 2;
    });
    check('không kết quả: hiện ô báo, ẩn mục lục và mọi khu, chân trang chạm đáy',
      s.items === 0 && s.empty && !s.tocBox && s.zones === 0 && foot);

    await p.click('#clear'); s = await state();
    check('nút Clear trả lại đủ hàng', s.items === N && !s.empty && s.zones === ZONES.length);
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

  /* ---- 6b. danh sách ẩn: ⇧? bật/tắt, bấm ra ngoài thì ẩn, gõ ? vào ô tìm kiếm thì hiện --- */
  if (H.length) {
    const vis = () => p.evaluate(() => !document.getElementById('hold').hidden);
    const rows = () => p.evaluate(() =>
      [...document.querySelectorAll('#hold a')].map(a => a.getAttribute('href')));
    await p.evaluate(() => document.activeElement.blur());

    check('danh sách ẩn: mặc định không hiện', !(await vis()));

    await chord(p);
    const hrefs = await rows();
    check('⇧? rồi thả: bảng vẫn hiện, đủ mục trong data.hold, đúng thứ tự',
      (await vis()) && eq(hrefs, H.map(i => i.href)), hrefs.join(', '));
    const g = await p.evaluate(() => [...document.querySelectorAll('#hold .ix-hold__g')].map(x => ({
      label: x.querySelector('.ix-hold__gl').textContent.trim(),
      n: x.querySelectorAll('a').length,
    })));
    check('bảng ẩn chia nhóm đúng data.hold.groups',
      eq(g, GROUPS.map(x => ({ label: x.label, n: x.items.length }))), g.map(x => `${x.label} (${x.n})`).join(' · '));
    check('⇧?: ô tìm kiếm không giành focus',
      await p.evaluate(() => document.activeElement.id !== 'q'));
    const leak = await p.evaluate(() => ({
      items: document.querySelectorAll('[data-item]').length,
      inHold: document.querySelectorAll('#hold [data-item], #hold [data-key]').length,
      toc: document.querySelectorAll('[data-toc]').length,
      foot: document.querySelectorAll('#foot-links a').length,
      count: document.getElementById('count').textContent,
    }));
    check('bảng ẩn không lọt vào ô đếm, mục lục, chân trang, phím tắt',
      leak.items === N && leak.inHold === 0 && leak.toc === LABELS.length && leak.foot === LABELS.length
        && leak.count.startsWith(N + ' pages'), `${leak.items} hàng · ${leak.count}`);
    await p.evaluate(() => window.dispatchEvent(new Event('blur')));
    check('mất focus cửa sổ: bảng vẫn hiện', await vis());
    const box = await p.evaluate(() => {
      const r = document.getElementById('hold').getBoundingClientRect();
      return { x: r.left + 8, y: r.top + 8 };
    });
    await p.mouse.click(box.x, box.y);
    check('bấm trong bảng: bảng vẫn hiện', await vis());

    await chord(p);
    check('⇧? lần nữa: bảng ẩn', !(await vis()));

    await chord(p);
    await p.mouse.click(5, 5);
    check('bấm ra ngoài: bảng ẩn', !(await vis()));

    await chord(p);
    await p.keyboard.press('Escape');
    check('Esc: bảng ẩn', !(await vis()));

    await chord(p);
    await p.click('#hold-x');
    check('nút đóng: bảng ẩn', !(await vis()));

    await p.focus('#q');
    await p.keyboard.type('?');
    const typed = await p.evaluate(() => ({
      value: document.getElementById('q').value,
      focus: document.activeElement.id,
      items: document.querySelectorAll('[data-item]:not([hidden])').length,
    }));
    check('gõ ? vào ô tìm kiếm: bảng hiện, ô được xoá, nhả focus, không lọc mất hàng',
      (await vis()) && typed.value === '' && typed.focus !== 'q' && typed.items === N, JSON.stringify(typed));
    await p.mouse.click(5, 5);

    await p.fill('#q', 'what?');
    check('gõ chữ có dấu ? ở giữa: không mở bảng', !(await vis()));
    await p.fill('#q', '');
    await p.evaluate(() => document.getElementById('q').dispatchEvent(new Event('input')));

    const broken = [];
    for (const h of H.map(i => i.href)) {
      const res = await p.request.get(new URL(h, URL_).toString());
      if (!res.ok()) broken.push(`${h} → ${res.status()}`);
    }
    check('mọi href của danh sách ẩn mở được', broken.length === 0, broken.join(', ') || `${H.length} link`);
  }

  /* ---- 6c. điện thoại: vùng chạm, thanh chip dính, bottom sheet ------------- */
  {
    const m = await open(390, { height: 844, motion: 'reduce' });
    const small = await m.evaluate(() =>
      [...document.querySelectorAll('[data-toc], #jump-q, #theme, [data-item], #foot-links a, .ix-brand')]
        .filter(e => e.offsetParent !== null)
        .filter(e => { const r = e.getBoundingClientRect(); return r.height < 44 || r.width < 44; })
        .map(e => (e.textContent.trim() || e.id).slice(0, 24)));
    check('điện thoại: vùng chạm ≥ 44×44px (chip, hàng, nút, chân trang)', small.length === 0,
      small.length ? small.join(', ') : 'đủ');

    await m.evaluate(() => window.scrollTo({ top: document.getElementById('books').offsetTop, behavior: 'instant' }));
    await m.waitForTimeout(150);
    const st = await m.evaluate(() => {
      const t = document.getElementById('toc');
      return { top: t.getBoundingClientRect().top, pos: getComputedStyle(t).position,
               own: t.scrollWidth > t.clientWidth && getComputedStyle(t).overflowX === 'auto' };
    });
    check('điện thoại: thanh chip section dính trên cùng, tự cuộn ngang trong chính nó',
      st.pos === 'sticky' && Math.abs(st.top) <= 1 && st.own, JSON.stringify(st));

    await m.click('[data-toc="cooking"]');
    await m.waitForTimeout(250);
    const jump = await m.evaluate(() => ({
      sec: document.getElementById('cooking').getBoundingClientRect().top,
      bar: document.getElementById('toc').getBoundingClientRect().bottom,
    }));
    check('điện thoại: bấm chip thì section hiện ngay dưới thanh chip, không bị che',
      jump.sec >= jump.bar - 1 && jump.sec <= jump.bar + 40, `section ${jump.sec.toFixed(0)} · thanh ${jump.bar.toFixed(0)}`);

    if (H.length) {
      await m.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await m.focus('#q');
      await m.keyboard.type('?');
      const sh = await m.evaluate(() => {
        const h = document.getElementById('hold');
        const r = h.getBoundingClientRect();
        const x = document.getElementById('hold-x').getBoundingClientRect();
        const body = document.getElementById('hold-rows');
        return { vis: !h.hidden, top: r.top, bottom: r.bottom, left: r.left, right: r.right,
                 vw: document.documentElement.clientWidth, vh: window.innerHeight,
                 x: Math.min(x.width, x.height), scroll: body.scrollHeight > body.clientHeight,
                 kb: document.activeElement.tagName };
      });
      check('điện thoại: bảng ẩn là bottom sheet — sát đáy, đủ ngang, cao ≤ 66% khung nhìn',
        sh.vis && Math.abs(sh.bottom - sh.vh) <= 1 && sh.left <= 0.5 && sh.right >= sh.vw - 0.5
          && sh.bottom - sh.top <= sh.vh * 0.66 + 1,
        `cao ${(sh.bottom - sh.top).toFixed(0)}/${sh.vh}, ngang ${sh.left.toFixed(0)}–${sh.right.toFixed(0)}/${sh.vw}`);
      check('điện thoại: sheet có nút đóng ≥ 44px, bàn phím đã đóng', sh.x >= 44 && sh.kb !== 'INPUT');

      const y0 = await m.evaluate(() => window.scrollY);
      await m.mouse.move(195, 60);
      await m.mouse.wheel(0, 700);
      await m.waitForTimeout(150);
      const y1 = await m.evaluate(() => window.scrollY);
      await m.mouse.move(195, 844 - 120);
      await m.mouse.wheel(0, 400);
      await m.waitForTimeout(150);
      const inner = await m.evaluate(() => ({ y: window.scrollY, s: document.getElementById('hold-rows').scrollTop }));
      check('điện thoại: mở sheet thì trang phía sau không cuộn; sheet tự cuộn bên trong',
        y1 === y0 && inner.y === y0 && (!sh.scroll || inner.s > 0),
        `trang ${y0}→${y1}→${inner.y} · sheet cuộn ${inner.s}px`);

      await m.mouse.click(195, 40);
      const after = await m.evaluate(() => ({
        vis: !document.getElementById('hold').hidden,
        lock: getComputedStyle(document.documentElement).overflowY,
      }));
      check('điện thoại: chạm ra ngoài sheet thì sheet đóng và trang cuộn lại được',
        !after.vis && after.lock !== 'hidden', JSON.stringify(after));

      await m.focus('#q');
      await m.keyboard.type('?');
      await m.click('#hold-x');
      check('điện thoại: nút đóng của sheet đóng sheet', await m.evaluate(() => document.getElementById('hold').hidden));
    }
    await m.context().close();
  }

  /* ---- 7. tương phản chữ ở cả hai nền, máy tính và điện thoại -------------- */
  const SEL = ['.ix-row__t', '.ix-row__d', '.ix-sec__desc', '.ix-sec__n', '.ix-sec__c', '.ix-key',
               '.ix-subj__t', '.ix-subj__m', '.ix-zone__t', '.ix-zone__d', '.ix-lede', '.ix-eyebrow',
               '.ix-toc__l', '.ix-toc__n', '.ix-toc__c', '.ix-toc__zl', '.ix-hint', '.ix-count', '#q',
               '.ix-foot__zl', '#foot-links a', '.ix-hold__t', '.ix-hold__gl', '.ix-hold .ix-row__t',
               '.ix-hold .ix-row__d', '.ix-hold__hint', '.ix-brand b', '.ix-brand span'];
  for (const [w, scheme] of [[1280, 'light'], [1280, 'dark'], [390, 'light'], [390, 'dark']]) {
    const q = await open(w, { scheme, height: w < 500 ? 844 : 900 });
    if (H.length) {
      if (w < 500) { await q.focus('#q'); await q.keyboard.type('?'); } else await chord(q);
    }
    await q.evaluate(() => window.scrollTo({ top: document.getElementById('books').offsetTop, behavior: 'instant' }));
    await q.waitForTimeout(400);
    const r = await q.evaluate(`(() => { ${CONTRAST_JS}
      const SEL = ${JSON.stringify(SEL)};
      const out = {}, absent = [];
      for (const sel of SEL) {
        const all = document.querySelectorAll(sel);
        if (!all.length) { absent.push(sel); continue; }
        /* Chỉ đo chữ đang được vẽ ở bề rộng này (display:none ở máy hẹp thì bỏ). */
        const els = [...all].filter(e => e.getClientRects().length
          && getComputedStyle(e).visibility !== 'hidden' && e.textContent.trim());
        if (els.length) out[sel] = +Math.min(...els.map(of)).toFixed(2);
      }
      /* Chip phím khi rê chuột: chữ --on-green trên nền --green. */
      const cs = getComputedStyle(document.documentElement);
      const probe = document.body.appendChild(document.createElement('i'));
      probe.style.color = cs.getPropertyValue('--on-green');
      const on = num(getComputedStyle(probe).color);
      probe.style.color = cs.getPropertyValue('--green');
      const gr = num(getComputedStyle(probe).color);
      probe.remove();
      out['chip phím khi rê (--on-green / --green)'] = +ratio(on, gr).toFixed(2);
      return { out, absent };
    })()`);
    const missing = r.absent;
    const worst = Object.entries(r.out).sort((a, z) => a[1] - z[1])[0];
    check(`tương phản chữ ≥ 4,5:1 (nền ${scheme === 'light' ? 'sáng' : 'tối'} @${w}px)`,
      worst[1] >= 4.5 && missing.length === 0,
      `thấp nhất ${worst[1]}:1 ở ${worst[0]}` + (missing.length ? ` · không đo được: ${missing.join(', ')}` : ''));
    await q.context().close();
  }

  /* ---- 8. nền tảng a11y --------------------------------------------------- */
  {
    const r = await p.evaluate(() => {
      const hs = [...document.querySelectorAll('h1,h2,h3')].map(h => +h.tagName[1]);
      let skips = 0; for (let i = 1; i < hs.length; i++) if (hs[i] - hs[i - 1] > 1) skips++;
      const navs = [...document.querySelectorAll('nav')].map(n => n.getAttribute('aria-label'));
      return {
        h1: document.querySelectorAll('h1').length, skips,
        unlabelled: [...document.querySelectorAll('button')]
          .filter(b => !b.getAttribute('aria-label') && !b.textContent.trim()).length,
        realLinks: [...document.querySelectorAll('[data-item], #hold a')].every(a => a.tagName === 'A' && a.getAttribute('href')),
        divClick: document.querySelectorAll('div[onclick],span[onclick]').length,
        navLabels: navs.every(Boolean) && new Set(navs).size === navs.length,
        inputLabel: !!document.getElementById('q').getAttribute('aria-label'),
        holdLabel: !!document.getElementById('hold').getAttribute('aria-labelledby'),
        motion: [...document.styleSheets].some(s => {
          let rules = [];
          try { rules = [...s.cssRules]; } catch (e) { /* stylesheet khác origin (font) */ }
          return rules.some(r => r.media && /prefers-reduced-motion/.test(r.media.mediaText));
        }),
      };
    });
    check('a11y nền tảng', r.h1 === 1 && r.skips === 0 && r.unlabelled === 0 && r.realLinks
      && r.divClick === 0 && r.navLabels && r.inputLabel && r.holdLabel && r.motion,
      `1×h1=${r.h1 === 1}, nhảy bậc=${r.skips}, nút không nhãn=${r.unlabelled}, mọi mục là <a href>=${r.realLinks}, ` +
      `nav có nhãn riêng=${r.navLabels}, có prefers-reduced-motion=${r.motion}`);
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
