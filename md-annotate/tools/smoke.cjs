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
/* Mở tab Prompt của panel và phần Tuỳ chọn. */
async function openOpts(page) {
  await page.click('#ptab-prompt');
  if (!(await page.$eval('#opts', (d) => d.open))) await page.click('#opts summary');
}
const inView = (page, sel) => page.$eval(sel, (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.top >= 0 && r.bottom <= innerHeight; });
const out = (page) => page.$eval('#out', (el) => el.textContent);
const items = (page) => page.$$eval('#list .ma-item', (els) => els.map((e) => e.textContent));
const accentCheck = (page) => page.evaluate(() => {
  const lum = (c) => { const x = c.match(/[\d.]+/g).slice(0, 3).map((n) => { n /= 255; return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; }); return 0.2126 * x[0] + 0.7152 * x[1] + 0.0722 * x[2]; };
  const b = document.getElementById('btn-copy'), cs = getComputedStyle(b);
  const bg = lum(cs.backgroundColor), fg = lum(cs.color);
  return { bgLum: +bg.toFixed(2), ratio: +((Math.max(bg, fg) + 0.05) / (Math.min(bg, fg) + 0.05)).toFixed(2) };
});
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

  // 0. Link ở bản dựng không chuyển trang; kéo bắt đầu trên link vẫn là bôi đen.
  const lk = await page.evaluate(() => ({ a: document.querySelectorAll('#v-md a').length, span: (document.querySelector('#v-md .ma-a') || {}).textContent, title: (document.querySelector('#v-md .ma-a') || {}).title }));
  check('link ở bản dựng thành chữ, không còn <a>', lk.a === 0 && lk.span === 'liên kết tới ví dụ' && lk.title === 'https://example.com/path', JSON.stringify(lk));
  await page.click('#v-md .ma-a');
  check('bấm link không rời trang', page.url() === BASE || page.url().startsWith(BASE), page.url());
  await dragSelect(page, '#v-md', 'liên kết tới ví dụ');
  check('kéo trên link mở hộp nhận xét', await page.isVisible('#pop') && (await page.textContent('#pop-q')) === 'liên kết tới ví dụ', await page.textContent('#pop-q'));
  await page.keyboard.press('Escape');
  await page.evaluate(() => getSelection().removeAllRanges());

  // 1. Bôi đen ở bản dựng, gõ nhận xét.
  // Kéo từ giữa chữ "chữ" tới giữa chữ "thúc": đoạn trích phải nới ra trọn từ.
  await dragSelect(page, '#v-md', 'ữ đậm ở đây và kết thú');
  check('bôi đen bằng chuột mở hộp nhận xét', await page.isVisible('#pop'));
  check('vùng chọn nới ra trọn từ (chữ Việt)', (await page.textContent('#pop-q')) === 'chữ đậm ở đây và kết thúc', await page.textContent('#pop-q'));
  const chips = await page.$$eval('#pop-chips .ma-chip', (els) => els.map((e) => e.textContent));
  check('hộp có 5 gợi ý, chưa có % khi chưa dùng, chip +4', chips.length === 6 && chips[5] === '+4' && chips.every((c) => !/%/.test(c)), chips.join(' | '));
  check('gợi ý mặc định từ data/hints.json', chips[0] === 'Unclear or wrong — rewrite');
  await page.click('#pop-chips .ma-chip--more');
  check('chip +N mở hết gợi ý', (await page.$$('#pop-chips .ma-chip')).length === 9 && !(await page.$('#pop-chips .ma-chip--more')));
  await page.keyboard.type('Câu này sai');
  await page.keyboard.press('Enter');
  check('Enter lưu nhận xét', (await items(page)).length === 1 && !(await page.isVisible('#pop')));
  check('prompt kiểu gọn, có số dòng và câu dẫn', (await out(page)) === `Line numbers (L) refer to the text I pasted; if they don't match, locate the passage by its quote.\n\n1. L5 "chữ đậm ở đây và kết thúc" — Câu này sai`, JSON.stringify(await out(page)));
  check('mục trong danh sách hiện số dòng', (await page.textContent('#list .ma-item__loc')) === 'L5');

  // 2. Bôi đen ở nguồn (đoạn đứng trước), bấm gợi ý.
  await page.click('.ma-tab[data-view="src"]');
  check('nguồn có highlight của đoạn chọn ở bản dựng', await page.$eval('#v-src', (el) => [...el.querySelectorAll('mark')].map((m) => m.textContent).join('')) === 'chữ đậm ở đây** và kết thúc');
  await dragSelect(page, '#v-src', 'liên kết tới ví dụ](https://example.com/path) ở giữa');
  await page.click('#pop-chips .ma-chip:has-text("Verify this is factually accurate")');
  const o2 = await out(page);
  check('gợi ý lưu ngay, xếp theo thứ tự văn bản', o2.includes('\n\n1. L3 "liên kết tới ví dụ](https://example.com/path) ở giữa" — Verify this is factually accurate\n2. L5 "chữ đậm'), JSON.stringify(o2));
  // 2b. Tô màu nguồn: text vẫn đúng bằng nguồn, có token, highlight vẫn nằm đúng chỗ, tương phản, nút tắt.
  const syn = await page.evaluate(() => {
    const v = document.getElementById('v-src');
    const lum = (c) => { const x = c.match(/[\d.]+/g).slice(0, 3).map((n) => { n /= 255; return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; }); return 0.2126 * x[0] + 0.7152 * x[1] + 0.0722 * x[2]; };
    const bg = lum(getComputedStyle(document.getElementById('doc')).backgroundColor);
    const low = [...v.querySelectorAll('span')].map((sp) => { const l = lum(getComputedStyle(sp).color); return [sp.className, (Math.max(l, bg) + 0.05) / (Math.min(l, bg) + 0.05)]; }).filter((x) => x[1] < 4.5);
    const pick = (c) => [...v.querySelectorAll('.' + c)].map((e) => e.textContent);
    return { same: v.textContent === document.getElementById('src-input').value, url: pick('sx-url'), link: pick('sx-link'), strong: pick('sx-strong'), punct: pick('sx-punct'), head: pick('sx-head'), low,
      markInsideColor: !!v.querySelector('mark .sx-url') };
  });
  check('tô màu: text của khung đúng bằng nguồn', syn.same);
  const gut = await page.evaluate(() => {
    const v = document.getElementById('v-src'), ls = [...v.querySelectorAll('.ma-ln')];
    const src = document.getElementById('src-input').value;
    const bef = getComputedStyle(ls[0], '::before');
    return { n: ls.length, lines: src.replace(/\n$/, '').split('\n').length, content: bef.content, top: bef.top,
      marked: ls.map((l, i) => l.classList.contains('has-c') ? i + 1 : 0).filter(Boolean).join() };
  });
  check('lề số dòng: một khối mỗi dòng, số là counter ngoài text', gut.n === gut.lines && /counter\(ln\)/.test(gut.content) && gut.top === '0px', JSON.stringify(gut));
  check('lề số dòng: dòng có nhận xét được đánh dấu (3, 5)', gut.marked === '3,5', gut.marked);
  const g3 = await page.$eval('#v-src .ma-ln:nth-child(3)', (el) => { const r = el.getBoundingClientRect(); return { x: r.left + 4, y: r.top + 8 }; });
  await page.mouse.click(g3.x, g3.y);
  check('bấm lề dòng 3 mở nhận xét của dòng ấy', await page.isVisible('#pop-del') && (await page.inputValue('#pop-text')) === 'Verify this is factually accurate');
  await page.keyboard.press('Escape');
  check('tô màu: link xanh, URL, đậm, đầu mục, số danh sách', syn.url.includes('https://example.com/path') && syn.link.includes('liên kết tới ví dụ') && syn.strong.includes('chữ đậm ở đây') && syn.head.includes(' Bài thử') && syn.punct.includes('#') && syn.punct.includes('1.'), JSON.stringify(syn));
  check('tô màu: highlight bọc ngoài token màu', syn.markInsideColor);
  check('tô màu: mọi token ≥ 4,5:1 trên nền (sáng)', !syn.low.length, JSON.stringify(syn.low));
  await page.uncheck('#syn');
  check('tắt tô màu: không còn span, text vẫn đúng', await page.evaluate(() => !document.querySelector('#v-src span[class*="sx-"]') && document.getElementById('v-src').textContent === document.getElementById('src-input').value));
  await page.check('#syn');
  check('bật lại tô màu', await page.evaluate(() => !!document.querySelector('#v-src .sx-url')));
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
  check('cảnh báo trùng đoạn', /Same passage as comment #3/.test(await page.textContent('#pop-warn')));
  const chips2 = await page.$$eval('#pop-chips .ma-chip .ma-chip__t', (els) => els.map((e) => e.textContent));
  check('nhận xét gõ hai lần thành gợi ý đứng đầu', chips2[0] === 'Câu này sai', chips2.join(' | '));
  await page.keyboard.type('detail');
  const chips3 = await page.$$eval('#pop-chips .ma-chip .ma-chip__t', (els) => els.map((e) => e.textContent));
  check('gõ thì lọc gợi ý', chips3.length >= 1 && chips3.every((t) => /detail/i.test(t)), chips3.join(' | '));
  await page.keyboard.press('Escape');
  check('Esc đóng hộp', !(await page.isVisible('#pop')));

  // 4. Sửa từ danh sách, xoá rồi hoàn tác.
  await page.click('#list .ma-item:nth-child(2) [aria-label="Edit comment"]');
  await page.fill('#pop-text', 'Câu này sai, viết lại');
  await page.click('#pop-save');
  check('sửa nhận xét', /2\. L5 "chữ đậm ở đây và kết thúc" — Câu này sai, viết lại/.test(await out(page)));
  await page.click('#list .ma-item:nth-child(3) [aria-label="Delete comment"]');
  check('xoá nhận xét', (await items(page)).length === 2);
  await page.click('.ma-toast__btn');
  check('hoàn tác xoá', (await items(page)).length === 3);
  await page.click('#list .ma-item:nth-child(1) .ma-item__main');
  await page.waitForTimeout(100);
  check('bấm mục thì nháy highlight', (await page.$$('#v-md mark.is-flash')).length > 0);
  await page.click('#v-md mark[data-n="1"]');
  check('bấm highlight mở hộp sửa', await page.isVisible('#pop-del') && (await page.inputValue('#pop-text')) === 'Verify this is factually accurate');
  await page.keyboard.press('Escape');

  // 5. Kiểu khối, lời dẫn, kèm toàn văn, chép.
  await openOpts(page);
  check('tab Prompt hiện prompt, tóm tắt tuỳ chọn', await page.isVisible('#out') && /compact · line numbers/.test(await page.textContent('#opts-sum')), await page.textContent('#opts-sum'));
  await page.click('.ma-fmt label:nth-child(2)');
  check('prompt kiểu khối, số dòng ở tiêu đề mục', /\n\n### 1 · L3\n> liên kết/.test(await out(page)), JSON.stringify(await out(page)));
  await page.click('#btn-headtpl');
  check('lời dẫn đầu, câu số dòng nối ngay sau', /^Revise the markdown text according to each comment below[^\n]*\nLine numbers \(L\) refer to the text I pasted; if they don't match, locate the passage by its quote\.\n\n/.test(await out(page)));
  await page.check('#inc-doc');
  check('kèm toàn văn trong khối rào', /Original text:\n```markdown\n# Bài thử[\s\S]*\n```$/.test(await out(page)));
  const acc = await accentCheck(page);
  check('nút chính xanh sáng, chữ tối ≥ 4,5:1 (sáng)', acc.bgLum > 0.3 && acc.ratio >= 4.5, JSON.stringify(acc));
  await page.click('#btn-copy');
  await page.waitForTimeout(150);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check('nút chép đưa đúng prompt vào clipboard', clip === (await out(page)));
  check('chép xong nút đổi thành "Copied ✓"', /Copied ✓/.test(await page.textContent('#btn-copy')));
  await page.waitForTimeout(1700);
  check('một lúc sau nút về như cũ', /Copy prompt/.test(await page.textContent('#btn-copy')));
  await page.evaluate(() => navigator.clipboard.writeText('trống'));
  await page.click('#v-md h1');
  await page.keyboard.press('Control+Shift+KeyC');
  await page.waitForTimeout(150);
  check('Ctrl+Shift+C chép prompt', (await page.evaluate(() => navigator.clipboard.readText())) === (await out(page)));
  await page.uncheck('#inc-doc');
  await page.click('.ma-fmt label:nth-child(1)');
  await page.click('#ptab-list');

  // 6. Sửa văn bản: neo lại và đánh dấu mất neo.
  await page.click('.ma-tab[data-view="edit"]');
  await page.fill('#src-input', 'Thêm một dòng ở đầu.\n\n' + DOC.replace('chữ đậm ở đây', 'chữ nghiêng ở đây'));
  await page.waitForTimeout(400);
  check('nhận xét mất neo được báo', /1 comment has lost its quote/.test(await page.textContent('#edit-note')));
  const o6 = await out(page);
  check('nhận xét mất neo không vào prompt', !/chữ đậm/.test(o6) && /1\. L5 "liên kết/.test(o6) && /2\. L12 "Câu lặp lại/.test(o6), JSON.stringify(o6));
  check('mục mất neo có dấu !', (await page.$$eval('#list .ma-item.is-orphan .ma-item__n', (e) => e.map((x) => x.textContent))).join() === '!');

  // 7. Tải lại trang: phiên còn nguyên.
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForFunction(() => window.marked && window.DOMPurify);
  check('tải lại: văn bản và nhận xét còn', (await items(page)).length === 3 && (await page.inputValue('#src-input')).startsWith('Thêm một dòng'));
  check('tải lại: lời dẫn còn', (await out(page)).startsWith('Revise the markdown text'));
  await page.click('.ma-tab[data-view="src"]');
  await page.uncheck('#syn');
  await page.reload();
  await page.waitForFunction(() => window.marked && window.DOMPurify);
  check('tắt tô màu được nhớ qua tải lại', !(await page.isChecked('#syn')) && !(await page.$('#v-src span[class*="sx-"]')));
  await page.check('#syn');
  await page.click('.ma-tab[data-view="view"]');

  // 8. Lịch sử: phiên mới, mở lại, đổi tên, xoá.
  await page.click('#btn-new');
  await page.fill('#src-input', '# Phiên hai\n\nNội dung khác.');
  await page.waitForTimeout(400);
  await page.click('#btn-hist');
  let rows = await page.$$eval('#hist-list .ma-row', (els) => els.map((e) => e.textContent));
  check('lịch sử có hai phiên', rows.length === 2, rows.join(' | '));
  await page.click('#hist-list .ma-row:nth-child(2) [aria-label="Rename"]');
  await page.fill('#hist-list input', 'Bài thử đổi tên');
  await page.keyboard.press('Enter');
  check('đổi tên phiên', /Bài thử đổi tên/.test(await page.textContent('#hist-list')));
  await page.click('#hist-list .ma-row:nth-child(2) .ma-row__main');
  check('mở lại phiên cũ', (await items(page)).length === 3 && (await page.inputValue('#s-name')) === 'Bài thử đổi tên');
  await page.click('#btn-hist');
  page.once('dialog', (d) => d.accept());
  await page.click('#hist-list .ma-row:has-text("Phiên hai") [aria-label="Delete session"]');
  rows = await page.$$eval('#hist-list .ma-row', (els) => els.map((e) => e.textContent));
  check('xoá phiên', rows.length === 1 && /Bài thử đổi tên/.test(rows[0]));
  await page.keyboard.press('Escape');

  // 9. Gợi ý: bỏ một gợi ý.
  await page.click('#btn-hints');
  const before = await page.$$eval('#hints-list .ma-row', (e) => e.length);
  await page.click('#hints-list .ma-row:has-text("Remove this") button');
  check('bỏ gợi ý', (await page.$$eval('#hints-list .ma-row', (e) => e.length)) === before - 1 && !/Remove this/.test(await page.textContent('#hints-list')));
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
  await openOpts(page);
  await page.fill('#p-path', 'notes/a.md');
  const o10 = await out(page);
  check('có tệp: vị trí dạng tệp:dòng', /\. notes\/a\.md:9-10 "Mục một/.test(o10) && /\. notes\/a\.md:5 "liên kết/.test(o10) && /file:line/.test(o10), JSON.stringify(o10));
  await page.uncheck('#line-nums');
  const o11 = await out(page);
  check('tắt số dòng: không vị trí, không câu dẫn', !/notes\/a\.md|L\d|file:line|Line numbers/.test(o11) && !(await page.isVisible('#p-path')), JSON.stringify(o11));
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForFunction(() => window.marked && window.DOMPurify);
  check('tắt số dòng và tệp lưu theo phiên', !(await page.isChecked('#line-nums')) && (await page.inputValue('#p-path')) === 'notes/a.md');
  await openOpts(page);
  await page.check('#line-nums');
  await page.click('#ptab-list');
  await page.setInputFiles('#file-in', { name: 'ghi-chu.md', mimeType: 'text/markdown', buffer: Buffer.from('# Ghi chú\n\nMột dòng.\n') });
  await page.waitForTimeout(200);
  check('mở file: phiên mới, tệp điền sẵn tên file', (await page.inputValue('#p-path')) === 'ghi-chu.md' && (await page.$$('#list .ma-item')).length === 0);
  await page.click('#btn-hints');
  check('đủ 5 lần dùng thì gợi ý hiện %', /%/.test(await page.textContent('#hints-list')));
  await page.keyboard.press('Escape');

  // 10b. Văn bản dài, hơn 30 nhận xét: nút chép luôn trong khung nhìn, không cần cuộn (máy rộng và 1024px).
  await page.click('#btn-new');
  const LONG = Array.from({ length: 120 }, (_, i) => `Đoạn số ${i + 1} của một văn bản dài dùng để thử cột phải.`).join('\n\n');
  await page.evaluate((t) => { const ta = document.getElementById('src-input'); ta.focus(); ta.dispatchEvent(new Event('paste')); ta.value = t; ta.dispatchEvent(new Event('input')); }, LONG);
  await page.waitForTimeout(150);
  await page.click('.ma-tab[data-view="view"]');
  for (let i = 1; i <= 32; i++) {
    await dragSelect(page, '#v-md', `Đoạn số ${i * 3} của`);
    await page.click('#pop-chips .ma-chip >> nth=0');
  }
  check('văn bản dài: 32 nhận xét', (await items(page)).length === 32);
  await page.evaluate(() => window.scrollTo(0, 0));
  check('32 nhận xét, chưa cuộn: nút chép trong khung nhìn', await inView(page, '#btn-copy'));
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(100);
  const side = await page.evaluate(() => {
    const s = document.querySelector('.ma-panel').getBoundingClientRect();
    const b = document.getElementById('panel-body');
    return { top: s.top, bottom: s.bottom, vh: innerHeight, scrollY, bodyScroll: b.scrollHeight > b.clientHeight };
  });
  check('cuộn tới cuối: panel dính dưới thanh trên, trọn trong khung nhìn', side.scrollY > 1000 && side.top >= 60 && side.top <= 90 && side.bottom <= side.vh, JSON.stringify(side));
  check('cuộn tới cuối: nút chép trong khung nhìn', await inView(page, '#btn-copy'));
  check('thân panel là chỗ cuộn của danh sách dài', side.bodyScroll);
  await page.click('#ptab-prompt');
  check('tab Prompt dài: nút chép vẫn trong khung nhìn', await inView(page, '#btn-copy'));
  await page.click('#ptab-list');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0));
  check('1440×900: nút chép trong khung nhìn', await inView(page, '#btn-copy'));
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.evaluate(() => window.scrollTo(0, 0));
  check('1024×768: nút chép ở thanh đáy, trong khung nhìn', await inView(page, '#dock-copy') && !(await page.isVisible('#btn-copy')));
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  check('1024×768, cuộn tới cuối: nút chép vẫn trong khung nhìn', await inView(page, '#dock-copy'));
  check('1024×768: không tràn ngang', (await overflow(page)) === 0);
  await page.click('#dock-n');
  check('1024×768: bấm số nhận xét mở panel trong tấm trượt, nút chép thấy', await page.isVisible('#dlg-panel #list') && (await page.$$('#dlg-panel #list .ma-item')).length === 32 && await inView(page, '#dlg-panel #btn-copy'));
  await page.click('#dlg-panel [data-close]');
  await page.waitForTimeout(50);
  check('đóng tấm: panel về cột phải', !(await page.isVisible('#dlg-panel')) && await page.evaluate(() => document.getElementById('panel').parentNode.classList.contains('ma-grid')));
  await page.setViewportSize({ width: 1280, height: 900 });

  // 10c. Bố cục rộng: vùng làm việc ~70% ở giữa, Song song hai khung cao trọn khung nhìn, vách giữa và mép panel kéo được, thu gọn panel.
  const geo = () => page.evaluate(() => {
    const d = document.getElementById('doc').getBoundingClientRect(), pn = document.getElementById('panel').getBoundingClientRect();
    const a = document.getElementById('wrap-src'), m = document.getElementById('wrap-md');
    return { docL: Math.round(d.left), panelR: Math.round(innerWidth - pn.right), panelW: Math.round(pn.width),
      mode: document.getElementById('views').dataset.mode, a: Math.round(a.getBoundingClientRect().width), b: Math.round(m.getBoundingClientRect().width),
      page: document.documentElement.scrollHeight - innerHeight, srcScroll: a.scrollHeight > a.clientHeight, mdScroll: m.scrollHeight > m.clientHeight };
  });
  for (const w of [1280, 1920, 2560]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.click('.ma-tab[data-view="split"]');
    const g = await geo();
    const side = Math.round((w - Math.min(w, Math.max(0.7 * w, 1280))) / 2) + 24;
    check(`${w}px: Song song, mỗi khung ≥ 420px, vùng làm việc ~70% ở giữa`, g.mode === 'split' && g.a >= 420 && g.b >= 420 && Math.abs(g.docL - side) <= 1 && Math.abs(g.panelR - side) <= 1, JSON.stringify({ ...g, side }));
  }
  // Kéo panel rộng thêm vẫn phải còn Song song: thử ở màn đủ rộng.
  await page.setViewportSize({ width: 2560, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0));
  let g = await geo();
  check('Song song: hai khung cuộn riêng, trang không cuộn', g.page <= 0 && g.srcScroll && g.mdScroll, JSON.stringify(g));
  const dv = await page.$eval('#divider', (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 200 }; });
  await page.mouse.move(dv.x, dv.y); await page.mouse.down(); await page.mouse.move(dv.x + 120, dv.y, { steps: 5 }); await page.mouse.up();
  const L2 = await geo();
  check('kéo vách giữa: khung nguồn rộng thêm', L2.a - g.a > 100, `${g.a} → ${L2.a}`);
  const gp = await page.$eval('#panel-grip', (el) => { const r = el.getBoundingClientRect(); return { x: r.left + 3, y: r.top + 300 }; });
  await page.mouse.move(gp.x, gp.y); await page.mouse.down(); await page.mouse.move(gp.x - 80, gp.y, { steps: 5 }); await page.mouse.up();
  const L3 = await geo();
  check('kéo mép panel: panel rộng thêm', L3.panelW - L2.panelW >= 70, `${L2.panelW} → ${L3.panelW}`);
  await page.reload(); await page.waitForFunction(() => window.marked && window.DOMPurify); await page.waitForTimeout(150);
  const L4 = await geo();
  check('tải lại: nhớ tỉ lệ hai khung và bề rộng panel', Math.abs(L4.a - L3.a) <= 2 && Math.abs(L4.panelW - L3.panelW) <= 1, JSON.stringify([L3, L4]));
  await page.click('#btn-rail');
  const L5 = await geo();
  check('thu gọn panel: thanh dọc 56px, văn bản rộng ra', L5.panelW === 56 && L5.a > L4.a, JSON.stringify(L5));
  check('thu gọn: nút chép vẫn thấy', await inView(page, '#rail-copy'));
  await page.evaluate(() => navigator.clipboard.writeText('trống'));
  await page.click('#rail-copy'); await page.waitForTimeout(150);
  check('thu gọn: nút chép ở thanh dọc chép prompt', (await page.evaluate(() => navigator.clipboard.readText())) === (await out(page)));
  await page.reload(); await page.waitForFunction(() => window.marked && window.DOMPurify);
  check('tải lại: panel vẫn thu gọn', (await geo()).panelW === 56);
  await page.click('#btn-unrail');
  check('mở lại panel', (await geo()).panelW === L4.panelW && await inView(page, '#btn-copy'));
  // 10d. Hộp Layout: bề rộng vùng làm việc, khổ chữ Preview, cỡ chữ; áp ngay, nhớ sau tải lại, đặt lại được.
  await page.setViewportSize({ width: 1920, height: 900 });
  const wrapW = () => page.$eval('main.ma-wrap', (el) => Math.round(el.getBoundingClientRect().width));
  check('Layout mặc định: vùng làm việc 70% ở 1920', Math.abs((await wrapW()) - 1344) <= 1, String(await wrapW()));
  await page.click('#btn-layout');
  check('hộp Layout: một vùng cuộn, khung hộp không cuộn', await page.$eval('#dlg-layout', (d) => d.scrollHeight <= d.clientHeight));
  check('nút Layout mở hộp', await page.isVisible('#dlg-layout'));
  const setRange = (sel, v) => page.$eval(sel, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
  await setRange('#set-wrap', 50);
  check('kéo bề rộng 50% áp ngay', Math.abs((await wrapW()) - 960) <= 1 && (await page.textContent('#set-wrap-o')) === '50%', String(await wrapW()));
  await setRange('#set-wrap', 100);
  check('bề rộng 100% tràn khung nhìn', (await wrapW()) === 1920, String(await wrapW()));
  await page.check('#set-measure-on');
  await setRange('#set-measure', 60);
  await setRange('#set-fs', 18);
  const md = await page.$eval('#v-md', (el) => { const cs = getComputedStyle(el); return { max: cs.maxWidth, fs: cs.fontSize }; });
  check('giới hạn khổ chữ 60ch và cỡ chữ 18px', md.max === '60ch' || (parseFloat(md.max) > 400 && parseFloat(md.max) < 800), JSON.stringify(md));
  check('cỡ chữ Preview 18px', md.fs === '18px', md.fs);
  await page.check('#set-focus');
  await setRange('#set-dim', 20);
  await page.keyboard.press('Escape');
  await page.click('.ma-tab[data-view="view"]');
  const fp = await page.$$eval('#v-md p', (ps) => ps.length);
  if (fp >= 2) {
    await page.hover('#v-md p >> nth=0');
    await page.waitForTimeout(300);
    const op = await page.$$eval('#v-md p', (ps) => ps.slice(0, 2).map((p) => getComputedStyle(p).opacity));
    check('Focus mode: đoạn dưới con trỏ rõ, đoạn khác mờ 20%', op[0] === '1' && op[1] === '0.2', op.join(','));
  }
  await page.click('.ma-tab[data-view="src"]');
  await page.hover('#v-src .ma-ln >> nth=2'); await page.waitForTimeout(300);
  const ol = await page.$$eval('#v-src .ma-ln', (ls) => ls.slice(0, 6).map((l) => getComputedStyle(l).opacity));
  check('Focus mode ở Source: dòng trỏ ± 1 rõ, dòng xa mờ', ol[1] === '1' && ol[2] === '1' && ol[3] === '1' && ol[0] === '0.2' && ol[5] === '0.2', ol.join(','));
  await page.mouse.move(5, 5); await page.waitForTimeout(300);
  check('Focus mode: con trỏ ra ngoài khung thì không mờ', (await page.$eval('#v-src .ma-ln', (l) => getComputedStyle(l).opacity)) === '1');
  await page.reload(); await page.waitForFunction(() => window.marked && window.DOMPurify); await page.waitForTimeout(100);
  check('tải lại: nhớ bề rộng 100%', (await wrapW()) === 1920);
  check('tải lại: nhớ Focus mode', await page.evaluate(() => document.documentElement.classList.contains('ma-focus')));
  await page.click('#btn-layout'); await page.click('#set-reset');
  check('Reset về mặc định', Math.abs((await wrapW()) - 1344) <= 1 && (await page.textContent('#set-measure-o')) === 'Fill pane' && (await page.textContent('#set-fs-o')) === '16px' && !(await page.evaluate(() => document.documentElement.classList.contains('ma-focus'))));
  await page.keyboard.press('Escape');
  await page.evaluate(() => { localStorage.removeItem('md-annotate:prefs:v1'); });
  await page.setViewportSize({ width: 1280, height: 900 });

  // 11. Theme: nút đổi thắng sau khi bấm.
  await page.click('#theme');
  check('nút theme đổi sang tối', await page.evaluate(() => document.documentElement.classList.contains('dark') && localStorage.getItem('hub-theme') === 'dark'));
  await page.click('#theme');
  await page.evaluate(() => localStorage.removeItem('hub-theme'));
  check('máy rộng không tràn ngang', (await overflow(page)) === 0);
  await ctx.close();

  /* ---------- Chuyển gợi ý tiếng Việt cũ sang tiếng Anh, giữ số đếm và phiên ---------- */
  const vctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const vp = await vctx.newPage(); watch(vp);
  await vp.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('md-annotate:stats:v1', JSON.stringify({ items: {
      'viết gọn lại': { t: 'Viết gọn lại', n: 7, last: 5, o: 2, seed: true },
      'xoá đoạn này': { t: 'Xoá đoạn này', n: 1, last: 1, o: 5, seed: true, hidden: true },
      'ý riêng của tôi': { t: 'Ý riêng của tôi', n: 3, last: 9, o: 1e6 } } }));
    localStorage.setItem('md-annotate:s:old1', JSON.stringify({ id: 'old1', name: 'Phiên cũ', named: true, created: 1, updated: 2, text: '# Cũ\n\nMột câu cũ.', comments: [{ id: 'c1', quote: 'Một câu cũ.', comment: 'Viết gọn lại', origin: 'src', prefix: '', suffix: '', rel: 0.5, created: 1 }], header: '', footer: '', fmt: 'inline', includeDoc: false }));
    localStorage.setItem('md-annotate:index:v1', JSON.stringify([{ id: 'old1', name: 'Phiên cũ', created: 1, updated: 2, chars: 18, count: 1 }]));
    localStorage.setItem('md-annotate:current', JSON.stringify('old1'));
  });
  await vp.goto(BASE);
  await vp.waitForFunction(() => window.marked && window.DOMPurify);
  await vp.waitForTimeout(300);
  const mig = await vp.evaluate(() => JSON.parse(localStorage.getItem('md-annotate:stats:v1')).items);
  check('chuyển gợi ý: số đếm sang khoá tiếng Anh, giữ ẩn, giữ gợi ý tự gõ',
    mig['make it shorter'] && mig['make it shorter'].n === 7 && !mig['viết gọn lại'] && mig['remove this'] && mig['remove this'].hidden && mig['ý riêng của tôi'].n === 3, JSON.stringify(mig));
  check('phiên cũ còn nguyên, nhận xét giữ đúng chữ đã gõ', (await out(vp)).includes('"Một câu cũ." — Viết gọn lại'), JSON.stringify(await out(vp)));
  check('trang có lang="en"', (await vp.getAttribute('html', 'lang')) === 'en');
  await vctx.close();

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
  await dpage.click('#btn-sample');
  await dpage.click('.ma-tab[data-view="src"]');
  const dlow = await dpage.evaluate(() => {
    const lum = (c) => { const x = c.match(/[\d.]+/g).slice(0, 3).map((n) => { n /= 255; return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; }); return 0.2126 * x[0] + 0.7152 * x[1] + 0.0722 * x[2]; };
    const bg = lum(getComputedStyle(document.getElementById('doc')).backgroundColor);
    const sp = [...document.querySelectorAll('#v-src span')];
    return { n: sp.length, low: sp.map((e) => { const l = lum(getComputedStyle(e).color); return [e.className, (Math.max(l, bg) + 0.05) / (Math.min(l, bg) + 0.05)]; }).filter((x) => x[1] < 4.5) };
  });
  check('tô màu: mọi token ≥ 4,5:1 trên nền (tối)', dlow.n > 10 && !dlow.low.length, JSON.stringify(dlow));
  const dacc = await accentCheck(dpage);
  check('nút chính xanh sáng, chữ tối ≥ 4,5:1 (tối)', dacc.bgLum > 0.3 && dacc.ratio >= 4.5, JSON.stringify(dacc));
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
  await m.tap('#btn-layout'); await m.waitForTimeout(200);
  const ml = await m.evaluate(() => { const d = document.getElementById('dlg-layout'); return { w: getComputedStyle(document.querySelector('.ma-set--wrap')).display, dlg: d.scrollHeight - d.clientHeight }; });
  check('điện thoại: hộp Layout ẩn mục bề rộng, chỉ thân hộp cuộn', ml.w === 'none' && ml.dlg <= 0, JSON.stringify(ml));
  await m.tap('#dlg-layout [data-close]');
  await scriptSelect(m, '#v-md', 'Try selecting this sentence');
  check('điện thoại: vùng chọn hiện nút nổi', await m.isVisible('#fab'));
  await m.tap('#fab');
  check('điện thoại: hộp nhận xét là tấm đáy', await m.isVisible('#pop') && await m.evaluate(() => document.getElementById('pop').classList.contains('is-sheet')));
  const sy = await m.evaluate(() => scrollY);
  await m.tap('#pop-chips .ma-chip:has-text("Make it shorter")');
  check('điện thoại: lưu nhận xét không kéo trang', Math.abs((await m.evaluate(() => scrollY)) - sy) < 2);
  check('điện thoại: chạm gợi ý thì lưu', /1\. L\d+ "Try selecting this sentence" — Make it shorter/.test(await out(m)), JSON.stringify(await out(m)));
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
  check('điện thoại: chạm số nhận xét mở panel trong tấm trượt', await m.isVisible('#dlg-panel') && (await m.$$('#dlg-panel #list .ma-item')).length === 1);
  await m.tap('#dlg-panel #ptab-prompt');
  check('điện thoại: tab Prompt trong tấm, có nút chép', await m.isVisible('#dlg-panel #out') && await inView(m, '#dlg-panel #btn-copy'));
  await m.tap('#dlg-panel #ptab-list');
  check('điện thoại: tấm danh sách không tràn ngang', (await overflow(m)) === 0);
  await m.tap('#dlg-panel #list .ma-item__main');
  await m.waitForTimeout(100);
  check('điện thoại: chạm mục thì đóng tấm và nháy đoạn', !(await m.isVisible('#dlg-panel')) && (await m.$$('#v-md mark.is-flash')).length > 0);
  await m.tap('#dock-n');
  await m.tap('#dlg-panel #list [aria-label="Edit comment"]');
  check('điện thoại: sửa từ tấm danh sách mở hộp sửa', !(await m.isVisible('#dlg-panel')) && await m.isVisible('#pop-del'));
  await m.tap('#pop-cancel');
  await m.tap('#dock-n');
  await m.tap('#dlg-panel #list [aria-label="Delete comment"]');
  check('điện thoại: xoá trong tấm, hoàn tác hiện trên tấm', await m.isVisible('#dlg-panel #toast .ma-toast__btn'));
  await m.tap('#dlg-panel #toast .ma-toast__btn');
  check('điện thoại: hoàn tác trả lại nhận xét', (await m.$$('#dlg-panel #list .ma-item')).length === 1);
  await m.tap('#dlg-panel [data-close]');
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
