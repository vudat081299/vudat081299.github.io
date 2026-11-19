/* Bấm thật trong Chromium: dán văn bản, bôi đen ở hai chế độ xem, nhận xét bằng gõ và bằng gợi ý, prompt,
 * neo lại khi sửa văn bản, tải lại trang, lịch sử phiên, theme, khổ điện thoại.
 * Chạy: python3 -m http.server 8347 (ở gốc repo), rồi
 *       node md-annotate/tools/smoke.cjs http://127.0.0.1:8347/md-annotate/
 * Thiếu playwright thì thoát mã 2 (BỎ QUA), như tools/smoke-index.js. */
'use strict';
const BASE = process.argv[2] || 'http://127.0.0.1:8347/md-annotate/';

let chromium;
for (const name of ['playwright-core', 'playwright']) {
  try { ({ chromium } = require(name)); break; } catch (e) { /* thử tên tiếp theo */ }
}
if (!chromium) { console.log('BỎ QUA: chưa có playwright.'); process.exit(2); }

let fails = 0;
const check = (name, ok, detail = '') => {
  if (!ok) fails++;
  console.log(`${ok ? '  ok  ' : '  LỖI'} ${name}${detail ? '  — ' + detail : ''}`);
};

const DOC = [
  '# Bài thử',
  '',
  'Đoạn đầu có một [liên kết tới ví dụ](https://example.com/path) ở giữa câu.',
  '',
  'Đoạn thứ hai có **chữ đậm ở đây** và kết thúc bằng dấu chấm.',
  '',
  '1. Mục một của danh sách',
  '2. Mục hai của danh sách',
  '',
  'Câu lặp lại. Câu lặp lại.',
  ''
].join('\n');

/* Kéo chuột thật qua đoạn `needle` trong `rootSel`. */
async function dragSelect(page, rootSel, needle, nth = 0) {
  const box = await page.evaluate(([sel, needle, nth]) => {
    const root = document.querySelector(sel);
    const nodes = []; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) nodes.push(n);
    const full = nodes.map((x) => x.data).join('');
    let i = -1; for (let k = 0; k <= nth; k++) i = full.indexOf(needle, i + 1);
    if (i < 0) return null;
    // Đầu vùng: nút chứa ký tự đầu (so sánh chặt), để không rơi vào nút xuống dòng của khối trước.
    const at = (off, start) => { let p = 0; for (const t of nodes) { if (start ? off < p + t.data.length : off <= p + t.data.length) return [t, off - p]; p += t.data.length; } };
    const r = document.createRange();
    r.setStart(...at(i, true)); r.setEnd(...at(i + needle.length, false));
    r.startContainer.parentElement.scrollIntoView({ block: 'center' });
    const rs = r.getClientRects(); const a = rs[0], b = rs[rs.length - 1];
    return { x1: a.left + 1, y1: a.top + a.height / 2, x2: b.right - 1, y2: b.top + b.height / 2 };
  }, [rootSel, needle, nth]);
  if (!box) throw new Error('không thấy: ' + needle);
  await page.mouse.move(box.x1, box.y1);
  await page.mouse.down();
  await page.mouse.move(box.x2, box.y2, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(120);
}
/* Đặt vùng chọn bằng script (như bàn tay trên điện thoại). */
async function scriptSelect(page, rootSel, needle) {
  await page.evaluate(([sel, needle]) => {
    const root = document.querySelector(sel);
    const nodes = []; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) nodes.push(n);
    const full = nodes.map((x) => x.data).join('');
    const i = full.indexOf(needle);
    const at = (off) => { let p = 0; for (const t of nodes) { if (off <= p + t.data.length) return [t, off - p]; p += t.data.length; } };
    const r = document.createRange();
    r.setStart(...at(i)); r.setEnd(...at(i + needle.length));
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  }, [rootSel, needle]);
  await page.waitForTimeout(250);
}
const out = (page) => page.$eval('#out', (el) => el.textContent);
const items = (page) => page.$$eval('#list .ma-item', (els) => els.map((e) => e.textContent));
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const watch = (page) => {
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
  };

  /* ---------- Máy rộng ---------- */
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(BASE).origin });
  const page = await ctx.newPage(); watch(page);
  const res = await page.goto(BASE);
  check('HTTP 200', res.status() === 200, String(res.status()));
  await page.waitForFunction(() => window.marked && window.DOMPurify);
  check('trang trống mở tab Soạn', await page.isVisible('#src-input'));
  const docTop = await page.$eval('#doc', (el) => el.getBoundingClientRect().top);
  check('đầu trang gọn: văn bản bắt đầu ≤ 130px', docTop <= 130, Math.round(docTop) + 'px');
  check('nền sáng theo hệ điều hành', !(await page.evaluate(() => document.documentElement.classList.contains('dark'))));

  await page.evaluate((t) => {
    const ta = document.getElementById('src-input');
    ta.focus(); ta.dispatchEvent(new Event('paste')); ta.value = t; ta.dispatchEvent(new Event('input'));
  }, DOC);
  await page.waitForTimeout(100);
  check('dán vào ô trống thì sang tab Hiển thị', await page.isVisible('#v-md h1'));

  // 1. Bôi đen ở bản dựng, gõ nhận xét.
  // Kéo từ giữa chữ "chữ" tới giữa chữ "thúc": đoạn trích phải nới ra trọn từ.
  await dragSelect(page, '#v-md', 'ữ đậm ở đây và kết thú');
  check('bôi đen bằng chuột mở hộp nhận xét', await page.isVisible('#pop'));
  check('vùng chọn nới ra trọn từ (chữ Việt)', (await page.textContent('#pop-q')) === 'chữ đậm ở đây và kết thúc', await page.textContent('#pop-q'));
  const chips = await page.$$eval('#pop-chips .ma-chip', (els) => els.map((e) => e.textContent));
  check('hộp có 5 gợi ý, chưa có % khi chưa dùng, chip +3', chips.length === 6 && chips[5] === '+3' && chips.every((c) => !/%/.test(c)), chips.join(' | '));
  check('gợi ý mặc định từ data/hints.json', chips[0] === 'Sai, nói chưa rõ ràng');
  await page.click('#pop-chips .ma-chip--more');
  check('chip +N mở hết gợi ý', (await page.$$('#pop-chips .ma-chip')).length === 8 && !(await page.$('#pop-chips .ma-chip--more')));
  await page.keyboard.type('Câu này sai');
  await page.keyboard.press('Enter');
  check('Enter lưu nhận xét', (await items(page)).length === 1 && !(await page.isVisible('#pop')));
  check('prompt kiểu gọn, có số dòng và câu dẫn', (await out(page)) === 'Số dòng (L) tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.\n\n1. L5 "chữ đậm ở đây và kết thúc" — Câu này sai', JSON.stringify(await out(page)));
  check('mục trong danh sách hiện số dòng', (await page.textContent('#list .ma-item__loc')) === 'L5');

  // 2. Bôi đen ở nguồn (đoạn đứng trước), bấm gợi ý.
  await page.click('.ma-tab[data-view="src"]');
  check('nguồn có highlight của đoạn chọn ở bản dựng', await page.$eval('#v-src', (el) => [...el.querySelectorAll('mark')].map((m) => m.textContent).join('')) === 'chữ đậm ở đây** và kết thúc');
  await dragSelect(page, '#v-src', 'liên kết tới ví dụ](https://example.com/path) ở giữa');
  await page.click('#pop-chips .ma-chip:has-text("Cần kiểm tra lại tính xác thực")');
  const o2 = await out(page);
  check('gợi ý lưu ngay, xếp theo thứ tự văn bản', o2.includes('\n\n1. L3 "liên kết tới ví dụ](https://example.com/path) ở giữa" — Cần kiểm tra lại tính xác thực\n2. L5 "chữ đậm'), JSON.stringify(o2));
  await page.click('.ma-tab[data-view="view"]');
  const mdMarks = await page.$$eval('#v-md mark', (els) => els.map((m) => m.textContent).join('|'));
  check('bản dựng có highlight của đoạn chọn ở nguồn', /liên kết tới ví dụ/.test(mdMarks) && /ở giữa/.test(mdMarks), mdMarks);
  check('số thứ tự gắn cuối highlight', (await page.$$eval('#v-md mark[data-n]', (els) => els.map((m) => m.dataset.n))).join() === '1,2');

  // 3. Danh sách: đoạn lặp, cảnh báo trùng, thống kê gợi ý.
  await dragSelect(page, '#v-md', 'Câu lặp lại.', 1);
  await page.keyboard.type('Câu này sai');
  await page.keyboard.press('Control+Enter');
  const o3 = await out(page);
  check('đoạn lặp: neo đúng lần xuất hiện thứ hai', await page.evaluate(() => {
    const p = [...document.querySelectorAll('#v-md p')].pop();
    return p.firstChild.nodeType === 3 && p.firstChild.data === 'Câu lặp lại. ' && !!p.querySelector('mark');
  }));
  check('Ctrl+Enter lưu', /3\. L10 "Câu lặp lại\." — Câu này sai$/.test(o3), JSON.stringify(o3));
  await dragSelect(page, '#v-md', 'Câu lặp lại.', 1);
  check('cảnh báo trùng đoạn', /Trùng đoạn với nhận xét #3/.test(await page.textContent('#pop-warn')));
  const chips2 = await page.$$eval('#pop-chips .ma-chip .ma-chip__t', (els) => els.map((e) => e.textContent));
  check('nhận xét gõ hai lần thành gợi ý đứng đầu', chips2[0] === 'Câu này sai', chips2.join(' | '));
  await page.keyboard.type('cần');
  const chips3 = await page.$$eval('#pop-chips .ma-chip .ma-chip__t', (els) => els.map((e) => e.textContent));
  check('gõ thì lọc gợi ý', chips3.length >= 1 && chips3.every((t) => /cần/i.test(t)), chips3.join(' | '));
  await page.keyboard.press('Escape');
  check('Esc đóng hộp', !(await page.isVisible('#pop')));

  // 4. Sửa từ danh sách, xoá rồi hoàn tác.
  await page.click('#list .ma-item:nth-child(2) [aria-label="Sửa nhận xét"]');
  await page.fill('#pop-text', 'Câu này sai, viết lại');
  await page.click('#pop-save');
  check('sửa nhận xét', /2\. L5 "chữ đậm ở đây và kết thúc" — Câu này sai, viết lại/.test(await out(page)));
  await page.click('#list .ma-item:nth-child(3) [aria-label="Xoá nhận xét"]');
  check('xoá nhận xét', (await items(page)).length === 2);
  await page.click('.ma-toast__btn');
  check('hoàn tác xoá', (await items(page)).length === 3);
  await page.click('#list .ma-item:nth-child(1) .ma-item__main');
  await page.waitForTimeout(100);
  check('bấm mục thì nháy highlight', (await page.$$('#v-md mark.is-flash')).length > 0);
  await page.click('#v-md mark[data-n="1"]');
  check('bấm highlight mở hộp sửa', await page.isVisible('#pop-del') && (await page.inputValue('#pop-text')) === 'Cần kiểm tra lại tính xác thực');
  await page.keyboard.press('Escape');

  // 5. Kiểu khối, lời dẫn, kèm toàn văn, chép.
  await page.click('.ma-fmt label:nth-child(2)');
  const grow = await page.$eval('#out', (el) => ({ h: el.offsetHeight, sh: el.scrollHeight, max: innerHeight * 0.4 }));
  check('khung prompt cao theo nội dung tới 40vh', grow.h > 120 && grow.h >= Math.min(grow.sh, grow.max) - 1, JSON.stringify(grow));
  check('prompt kiểu khối, số dòng ở tiêu đề mục', /\n\n### 1 · L3\n> liên kết/.test(await out(page)), JSON.stringify(await out(page)));
  await page.click('#wrapbox summary');
  await page.click('#btn-headtpl');
  check('lời dẫn đầu, câu số dòng nối ngay sau', /^Sửa văn bản markdown theo từng nhận xét[^\n]*\nSố dòng \(L\) tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.\n\n/.test(await out(page)));
  await page.check('#inc-doc');
  check('kèm toàn văn trong khối rào', /Văn bản gốc:\n```markdown\n# Bài thử[\s\S]*\n```$/.test(await out(page)));
  await page.click('#btn-copy');
  await page.waitForTimeout(150);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check('nút chép đưa đúng prompt vào clipboard', clip === (await out(page)));
  await page.uncheck('#inc-doc');
  await page.click('.ma-fmt label:nth-child(1)');

  // 6. Sửa văn bản: neo lại và đánh dấu mất neo.
  await page.click('.ma-tab[data-view="edit"]');
  await page.fill('#src-input', 'Thêm một dòng ở đầu.\n\n' + DOC.replace('chữ đậm ở đây', 'chữ nghiêng ở đây'));
  await page.waitForTimeout(400);
  check('nhận xét mất neo được báo', /1 nhận xét không còn tìm thấy/.test(await page.textContent('#edit-note')));
  const o6 = await out(page);
  check('nhận xét mất neo không vào prompt', !/chữ đậm/.test(o6) && /1\. L5 "liên kết/.test(o6) && /2\. L12 "Câu lặp lại/.test(o6), JSON.stringify(o6));
  check('mục mất neo có dấu !', (await page.$$eval('#list .ma-item.is-orphan .ma-item__n', (e) => e.map((x) => x.textContent))).join() === '!');

  // 7. Tải lại trang: phiên còn nguyên.
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForFunction(() => window.marked && window.DOMPurify);
  check('tải lại: văn bản và nhận xét còn', (await items(page)).length === 3 && (await page.inputValue('#src-input')).startsWith('Thêm một dòng'));
  check('tải lại: lời dẫn còn', (await out(page)).startsWith('Sửa văn bản markdown'));

  // 8. Lịch sử: phiên mới, mở lại, đổi tên, xoá.
  await page.click('#btn-new');
  await page.fill('#src-input', '# Phiên hai\n\nNội dung khác.');
  await page.waitForTimeout(400);
  await page.click('#btn-hist');
  let rows = await page.$$eval('#hist-list .ma-row', (els) => els.map((e) => e.textContent));
  check('lịch sử có hai phiên', rows.length === 2, rows.join(' | '));
  await page.click('#hist-list .ma-row:nth-child(2) [aria-label="Đổi tên"]');
  await page.fill('#hist-list input', 'Bài thử đổi tên');
  await page.keyboard.press('Enter');
  check('đổi tên phiên', /Bài thử đổi tên/.test(await page.textContent('#hist-list')));
  await page.click('#hist-list .ma-row:nth-child(2) .ma-row__main');
  check('mở lại phiên cũ', (await items(page)).length === 3 && (await page.inputValue('#s-name')) === 'Bài thử đổi tên');
  await page.click('#btn-hist');
  page.once('dialog', (d) => d.accept());
  await page.click('#hist-list .ma-row:has-text("Phiên hai") [aria-label="Xoá phiên"]');
  rows = await page.$$eval('#hist-list .ma-row', (els) => els.map((e) => e.textContent));
  check('xoá phiên', rows.length === 1 && /Bài thử đổi tên/.test(rows[0]));
  await page.keyboard.press('Escape');

  // 9. Gợi ý: bỏ một gợi ý.
  await page.click('#btn-hints');
  const before = await page.$$eval('#hints-list .ma-row', (e) => e.length);
  await page.click('#hints-list .ma-row:has-text("Xoá đoạn này") button');
  check('bỏ gợi ý', (await page.$$eval('#hints-list .ma-row', (e) => e.length)) === before - 1 && !/Xoá đoạn này/.test(await page.textContent('#hints-list')));
  check('dưới 5 lần dùng thì chưa hiện %', !/%/.test(await page.textContent('#hints-list')));
  await page.keyboard.press('Escape');

  // 10. Song song.
  await page.click('.ma-tab[data-view="split"]');
  check('song song hiện cả hai', await page.isVisible('#v-src') && await page.isVisible('#v-md'));
  await dragSelect(page, '#v-md', 'Mục một của danh sách\nMục hai');
  const pend = await page.evaluate(() => CSS.highlights.get('ma-pending').size);
  check('đoạn đang chọn được tô ở cả hai bên', pend === 2, String(pend));
  await page.keyboard.type('Gộp hai mục');
  await page.keyboard.press('Enter');
  check('chọn ở bản dựng qua hai dòng: L9-10 theo nguồn', /\. L9-10 "Mục một của danh sách Mục hai" — Gộp hai mục/.test(await out(page)), JSON.stringify(await out(page)));
  await page.fill('#p-path', 'notes/a.md');
  const o10 = await out(page);
  check('có tệp: vị trí dạng tệp:dòng', /\. notes\/a\.md:9-10 "Mục một/.test(o10) && /\. notes\/a\.md:5 "liên kết/.test(o10) && /tệp:dòng/.test(o10), JSON.stringify(o10));
  await page.uncheck('#line-nums');
  const o11 = await out(page);
  check('tắt số dòng: không vị trí, không câu dẫn', !/notes\/a\.md|L\d|tệp:dòng|Số dòng/.test(o11) && !(await page.isVisible('#p-path')), JSON.stringify(o11));
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForFunction(() => window.marked && window.DOMPurify);
  check('tắt số dòng và tệp lưu theo phiên', !(await page.isChecked('#line-nums')) && (await page.inputValue('#p-path')) === 'notes/a.md');
  await page.check('#line-nums');
  await page.setInputFiles('#file-in', { name: 'ghi-chu.md', mimeType: 'text/markdown', buffer: Buffer.from('# Ghi chú\n\nMột dòng.\n') });
  await page.waitForTimeout(200);
  check('mở file: phiên mới, tệp điền sẵn tên file', (await page.inputValue('#p-path')) === 'ghi-chu.md' && (await page.$$('#list .ma-item')).length === 0);
  await page.click('#btn-hints');
  check('đủ 5 lần dùng thì gợi ý hiện %', /%/.test(await page.textContent('#hints-list')));
  await page.keyboard.press('Escape');

  // 10b. Văn bản dài: cột phải dính, danh sách cuộn bên trong, nút chép luôn thấy.
  await page.click('#btn-new');
  const LONG = Array.from({ length: 120 }, (_, i) => `Đoạn số ${i + 1} của một văn bản dài dùng để thử cột phải.`).join('\n\n');
  await page.evaluate((t) => { const ta = document.getElementById('src-input'); ta.focus(); ta.dispatchEvent(new Event('paste')); ta.value = t; ta.dispatchEvent(new Event('input')); }, LONG);
  await page.waitForTimeout(150);
  for (let i = 1; i <= 12; i++) {
    await dragSelect(page, '#v-md', `Đoạn số ${i * 9} của`);
    await page.click('#pop-chips .ma-chip >> nth=0');
  }
  check('văn bản dài: 12 nhận xét', (await items(page)).length === 12);
  const bigOut = await page.$eval('#out', (el) => ({ h: el.offsetHeight, sh: el.scrollHeight, max: innerHeight * 0.4 }));
  check('khung prompt dừng ở 40vh rồi cuộn', bigOut.h <= bigOut.max + 1 && bigOut.sh > bigOut.h, JSON.stringify(bigOut));
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(100);
  const side = await page.evaluate(() => {
    const s = document.querySelector('.ma-side').getBoundingClientRect();
    const c = document.getElementById('btn-copy').getBoundingClientRect();
    const l = document.getElementById('list');
    return { top: s.top, bottom: s.bottom, copyBottom: c.bottom, vh: innerHeight, scrollY, listScroll: l.scrollHeight > l.clientHeight };
  });
  check('cuộn tới cuối: cột phải dính dưới thanh trên', side.scrollY > 1000 && side.top >= 60 && side.top <= 90 && side.bottom <= side.vh, JSON.stringify(side));
  check('cuộn tới cuối: nút chép còn trong khung nhìn', side.copyBottom <= side.vh, JSON.stringify(side));
  check('danh sách dài cuộn bên trong cột', side.listScroll);

  // 11. Theme: nút đổi thắng sau khi bấm.
  await page.click('#theme');
  check('nút theme đổi sang tối', await page.evaluate(() => document.documentElement.classList.contains('dark') && localStorage.getItem('hub-theme') === 'dark'));
  await page.click('#theme');
  await page.evaluate(() => localStorage.removeItem('hub-theme'));
  check('máy rộng không tràn ngang', (await overflow(page)) === 0);
  await ctx.close();

  /* ---------- Tối theo hệ điều hành ---------- */
  const dctx = await browser.newContext({ viewport: { width: 1000, height: 700 }, colorScheme: 'dark' });
  const dpage = await dctx.newPage(); watch(dpage);
  await dpage.goto(BASE);
  check('máy tối thì trang tối', await dpage.evaluate(() => document.documentElement.classList.contains('dark')));
  const tab = await dpage.evaluate(() => {
    const lum = (c) => { const v = c.match(/[\d.]+/g).slice(0, 3).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
    const t = document.querySelector('.ma-tab[aria-selected="true"]');
    const a = lum(getComputedStyle(t).backgroundColor), b = lum(getComputedStyle(t.parentElement).backgroundColor);
    return { ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), ring: getComputedStyle(t).boxShadow };
  });
  check('tối: tab đang chọn sáng hơn nền nhóm tab và có viền xanh', tab.ratio >= 1.2 && /inset/.test(tab.ring), JSON.stringify(tab));
  await dctx.close();

  /* ---------- Điện thoại ---------- */
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const m = await mctx.newPage(); watch(m);
  await m.goto(BASE);
  await m.waitForFunction(() => window.marked && window.DOMPurify);
  check('điện thoại: tab Soạn không tràn ngang', (await overflow(m)) === 0);
  await m.click('#btn-sample');
  await m.waitForTimeout(150);
  const mTop = await m.$eval('#doc', (el) => el.getBoundingClientRect().top);
  check('điện thoại: văn bản bắt đầu ≤ 110px', mTop <= 110, Math.round(mTop) + 'px');
  check('điện thoại: tab Hiển thị không tràn ngang', (await overflow(m)) === 0);
  check('điện thoại: không có tab Song song', !(await m.isVisible('#tab-split')));
  await scriptSelect(m, '#v-md', 'Thử bôi đen câu này');
  check('điện thoại: vùng chọn hiện nút nổi', await m.isVisible('#fab'));
  await m.tap('#fab');
  check('điện thoại: hộp nhận xét là tấm đáy', await m.isVisible('#pop') && await m.evaluate(() => document.getElementById('pop').classList.contains('is-sheet')));
  await m.tap('#pop-chips .ma-chip:has-text("Viết gọn lại")');
  check('điện thoại: lưu nhận xét không kéo trang xuống danh sách', await m.evaluate(() => document.getElementById('list').getBoundingClientRect().top > innerHeight));
  check('điện thoại: chạm gợi ý thì lưu', /1\. L\d+ "Thử bôi đen câu này" — Viết gọn lại/.test(await out(m)), JSON.stringify(await out(m)));
  const small = await m.evaluate(() => {
    const bad = [];
    document.querySelectorAll('button, a, .ma-tab, summary, .ma-check, .ma-fmt span').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || el.closest('[hidden]') || el.closest('dialog:not([open])')) return;
      if (el.classList.contains('ma-link') || el.closest('.ma-md')) return;
      if (r.height < 44 || r.width < 44) bad.push((el.id || el.className || el.tagName) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    });
    return bad;
  });
  check('điện thoại: vùng chạm ≥ 44px', !small.length, small.join(', '));
  await m.tap('#dock-n');
  check('điện thoại: chạm số nhận xét mở tấm danh sách', await m.isVisible('#dlg-list') && (await m.$$('#sheet-list .ma-item')).length === 1);
  check('điện thoại: tấm danh sách không tràn ngang', (await overflow(m)) === 0);
  await m.tap('#sheet-list .ma-item__main');
  await m.waitForTimeout(100);
  check('điện thoại: chạm mục thì đóng tấm và nháy đoạn', !(await m.isVisible('#dlg-list')) && (await m.$$('#v-md mark.is-flash')).length > 0);
  await m.tap('#dock-n');
  await m.tap('#sheet-list [aria-label="Sửa nhận xét"]');
  check('điện thoại: sửa từ tấm danh sách mở hộp sửa', !(await m.isVisible('#dlg-list')) && await m.isVisible('#pop-del'));
  await m.tap('#pop-cancel');
  await m.tap('#dock-n');
  await m.tap('#sheet-list [aria-label="Xoá nhận xét"]');
  check('điện thoại: xoá trong tấm, hoàn tác hiện trên tấm', await m.isVisible('#dlg-list #toast .ma-toast__btn'));
  await m.tap('#dlg-list #toast .ma-toast__btn');
  check('điện thoại: hoàn tác trả lại nhận xét', (await m.$$('#sheet-list .ma-item')).length === 1);
  await m.tap('#dlg-list [data-close]');
  for (const v of ['src', 'view', 'edit']) {
    await m.tap(`.ma-tab[data-view="${v}"]`);
    check(`điện thoại: tab ${v} không tràn ngang`, (await overflow(m)) === 0);
  }
  await m.click('#btn-hist');
  check('điện thoại: lịch sử không tràn ngang', (await overflow(m)) === 0 && await m.isVisible('#dlg-hist'));
  await mctx.close();

  check('không lỗi console', !errors.length, errors.join(' | '));
  await browser.close();
  console.log(fails ? `md-annotate smoke: ${fails} LỖI` : 'md-annotate smoke: OK');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
