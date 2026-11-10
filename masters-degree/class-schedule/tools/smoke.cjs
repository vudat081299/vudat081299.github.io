/* Bấm thật trong Chromium: điều hướng, lọc, panel, giảng viên theo ngày, tràn ngang, lỗi console.
 * Chạy: python3 -m http.server 8347 (ở gốc repo), rồi
 *       node masters-degree/class-schedule/tools/smoke.cjs http://127.0.0.1:8347/masters-degree/class-schedule/
 * Thiếu playwright thì thoát mã 2 (BỎ QUA), như tools/smoke-index.js. */
'use strict';
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://127.0.0.1:8347/masters-degree/class-schedule/';

let chromium;
for (const name of ['playwright-core', 'playwright']) {
  try { ({ chromium } = require(name)); break; } catch (e) { /* thử tên tiếp theo */ }
}
if (!chromium) { console.log('BỎ QUA: chưa có playwright.'); process.exit(2); }

function findChrome() {
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers',
    path.join(process.env.HOME || '', '.cache/ms-playwright')].filter(Boolean);
  for (const root of roots) {
    let dirs = [];
    try { dirs = fs.readdirSync(root); } catch (e) { continue; }
    for (const d of dirs.filter((x) => /^chromium(_headless_shell)?-/.test(x))) {
      for (const rel of ['chrome-linux/chrome', 'chrome-linux64/chrome', 'chrome-linux/headless_shell', 'chrome-linux64/headless_shell']) {
        const p = path.join(root, d, rel);
        if (fs.existsSync(p)) return p;
      }
    }
  }
  return undefined;
}

let fails = 0;
const check = (name, ok, detail = '') => {
  if (!ok) fails++;
  console.log(`${ok ? '  ok  ' : '  LỖI'} ${name}${detail ? '  — ' + detail : ''}`);
};

(async () => {
  let browser;
  try { browser = await chromium.launch(); } catch (e) { browser = await chromium.launch({ executablePath: findChrome() }); }
  const errors = [];
  const open = async (w, h, now, extra = {}) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, timezoneId: 'America/Los_Angeles', ...extra });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`${BASE}?now=${now}`);
    await page.waitForSelector('.now');
    return { ctx, page };
  };
  const text = (page, sel) => page.$eval(sel, (el) => el.textContent.trim());

  // Máy rộng, giữa buổi học (máy đặt múi giờ Los Angeles: trang vẫn phải theo giờ Việt Nam).
  const { ctx, page } = await open(1280, 900, '2026-11-18T18:15');
  const nowText = await text(page, '.now');
  check('đang học: Khởi nghiệp số, Bùi Quốc Trung', /Đang diễn ra/.test(nowText) && /Khởi nghiệp số/.test(nowText) && /Bùi Quốc Trung/.test(nowText));
  check('tiến độ 6/32', /6\/32 buổi/.test(await text(page, '.progress')));
  await page.click('.course-row[data-course="it4043e"]');
  await page.waitForSelector('.panel-root.is-open .panel');
  check('dòng môn mở panel môn, không có buổi', /Lưu trữ và xử lý dữ liệu lớn/.test(await text(page, '#panel-title')) && !(await page.$('.p-session')));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(350);
  await page.click('[data-view="month"]');
  check('xem tháng 11', (await text(page, '#cal-title')) === 'Tháng 11, 2026');
  await page.click('[data-action="next"]');
  check('nút › sang tháng 12', (await text(page, '#cal-title')) === 'Tháng 12, 2026');
  await page.click('[data-action="today"]');
  check('nút Hôm nay về tháng 11', (await text(page, '#cal-title')) === 'Tháng 11, 2026');
  const before = await page.$$eval('.ev', (x) => x.length);
  await page.click('.chip[data-id="it5425e"]');
  const after = await page.$$eval('.ev', (x) => x.length);
  check('chip ẩn một môn', after < before && (await page.getAttribute('.chip[data-id="it5425e"]', 'aria-pressed')) === 'false', `${before} → ${after}`);
  await page.reload(); await page.waitForSelector('.now');
  check('bộ lọc còn sau khi tải lại', (await page.getAttribute('.chip[data-id="it5425e"]', 'aria-pressed')) === 'false');
  await page.click('.chip[data-id="it5425e"]');
  await page.click('.ev[data-session="it5305e@2026-11-11"]');
  await page.waitForSelector('.panel-root.is-open .panel');
  check('buổi 11/11 do Vũ Văn Thiệu dạy', /Vũ Văn Thiệu/.test(await text(page, '.p-session')));
  await page.click('.p-date[data-session="it5305e@2026-11-04"]');
  check('đổi buổi trong panel: 04/11 do Bùi Quốc Trung dạy', /Bùi Quốc Trung/.test(await text(page, '.p-session')));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(350);
  check('Esc đóng panel', !(await page.$('.panel')));
  await page.click('.day-num[data-day="2026-11-25"]');
  check('bấm số ngày mở tuần', (await text(page, '#cal-title')) === '23/11 – 29/11/2026');
  check('tuần 23/11 có 3 buổi trên lưới giờ', (await page.$$eval('.wev', (x) => x.length)) === 3);
  await page.click('[data-view="agenda"]');
  await page.click('[data-action="toggle-past"]');
  check('danh sách: hiện buổi đã qua', (await page.getAttribute('[data-action="toggle-past"]', 'aria-expanded')) === 'true' && !!(await page.$('.ag-day.is-before')));
  await page.fill('#search', 'thieu');
  check('tìm "thieu" ra 6 buổi', (await page.$$eval('.ag-day .srow', (x) => x.length)) === 6);
  check('máy rộng không tràn ngang', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await ctx.close();

  // Điện thoại, trước học kỳ.
  const m = await open(375, 812, '2026-11-01T10:00', { isMobile: true, hasTouch: true });
  check('điện thoại mở sẵn Danh sách', (await m.page.getAttribute('[data-view="agenda"]', 'aria-pressed')) === 'true');
  const mNow = await text(m.page, '.now');
  check('hôm nay không có buổi học, buổi tới là Khởi nghiệp số', /Không có buổi học/.test(mNow) && /Buổi tiếp theo/.test(mNow) && /Khởi nghiệp số/.test(mNow));
  check('điện thoại: buổi tiếp theo nằm trong màn hình đầu', await m.page.evaluate(() => document.querySelector('.now-title').getBoundingClientRect().bottom <= innerHeight));
  await m.page.click('[data-view="month"]');
  await m.page.click('.day[data-day="2026-11-07"]');
  check('điện thoại: chạm ngày 07/11 hiện buổi Dữ liệu lớn', /Dữ liệu lớn/.test(await text(m.page, '.daylist')) && (await m.page.$$eval('.ev', (x) => x.filter((e) => e.offsetParent).length)) === 0);
  await m.page.click('[data-view="agenda"]');
  check('điện thoại không tràn ngang', await m.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await m.ctx.close();

  check('không có lỗi console', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(fails ? `class-schedule smoke: ${fails} lỗi` : 'class-schedule smoke: OK');
  process.exit(fails ? 1 : 0);
})();
