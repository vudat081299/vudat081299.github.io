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
  const b = document.getElementById('btn-copy'), was = b.disabled;
  b.disabled = false;   // màu của nút chính khi bật; nút tắt thì xám
  const cs = getComputedStyle(b), bg = lum(cs.backgroundColor), fg = lum(cs.color);
  b.disabled = was;
  return { bgLum: +bg.toFixed(2), ratio: +((Math.max(bg, fg) + 0.05) / (Math.min(bg, fg) + 0.05)).toFixed(2) };
});
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
/* MDAN-018: mọi vùng cuộn đang hiện (dọc, hoặc ngang khi đang tràn): thanh cuộn không chạy vào góc bo của chính nó hay
   khung chứa nó (khoảng từ mép tới vùng thanh cuộn ≥ bán kính góc ấy). Trả danh sách chỗ vi phạm. */
const cornerClash = (page) => page.evaluate(() => {
  const out = [], px = (v) => parseFloat(v) || 0;
  const visible = (el, r) => { for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) { const c = getComputedStyle(n); if (/(auto|scroll|hidden|clip)/.test(c.overflowY + c.overflowX)) { const q = n.getBoundingClientRect(); if (r.bottom <= q.top + 1 || r.top >= q.bottom - 1) return false; } } return true; };
  document.querySelectorAll('*').forEach((el) => {
    const cs = getComputedStyle(el);
    if (/none/.test(cs.scrollbarWidth) || !el.getClientRects().length) return;
    const sy = /(auto|scroll)/.test(cs.overflowY), sx = /(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth;
    const r = el.getBoundingClientRect();
    if ((!sy && !sx) || r.height < 20 || r.width < 20 || !visible(el, r)) return;
    const name = el.id ? '#' + el.id : el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : '');
    const tTop = r.top + px(cs.borderTopWidth), tBot = r.bottom - px(cs.borderBottomWidth), tL = r.left + px(cs.borderLeftWidth), tR = r.right - px(cs.borderRightWidth);
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const c = n === el ? cs : getComputedStyle(n), q = n.getBoundingClientRect();
      const tr = px(c.borderTopRightRadius), br = px(c.borderBottomRightRadius), bl = px(c.borderBottomLeftRadius);
      if (sy && q.right - tR <= Math.max(tr, br) && ((tr && tTop - q.top < tr - 0.5) || (br && q.bottom - tBot < br - 0.5))) out.push(name + ' (dọc)');
      if (sx && q.bottom - tBot <= Math.max(bl, br) && ((bl && tL - q.left < bl - 0.5) || (br && q.right - tR < br - 0.5))) out.push(name + ' (ngang)');
    }
  });
  return [...new Set(out)];
});

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
  await page.waitForTimeout(700);   // quá ngưỡng bấm đúp: kéo ngay sau cú bấm trên thành chọn theo từ
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
  check('gợi ý mặc định từ data/hints.json', chips[0] === 'Sai, nói chưa rõ ràng');
  await page.click('#pop-chips .ma-chip--more');
  check('chip +N mở hết gợi ý', (await page.$$('#pop-chips .ma-chip')).length === 9 && !(await page.$('#pop-chips .ma-chip--more')));
  await page.keyboard.type('Câu này sai');
  await page.keyboard.press('Enter');
  check('Enter lưu nhận xét', (await items(page)).length === 1 && !(await page.isVisible('#pop')));
  check('prompt kiểu gọn, có số dòng và câu dẫn', (await out(page)) === `Số dòng (L) tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.\n\n1. L5 "chữ đậm ở đây và kết thúc" — Câu này sai`, JSON.stringify(await out(page)));
  check('mục trong danh sách hiện số dòng', (await page.textContent('#list .ma-item__loc')) === 'L5');

  // 2. Bôi đen ở nguồn (đoạn đứng trước), bấm gợi ý.
  await page.click('.ma-tab[data-view="src"]');
  check('nguồn có highlight của đoạn chọn ở bản dựng', await page.$eval('#v-src', (el) => [...el.querySelectorAll('mark')].map((m) => m.textContent).join('')) === 'chữ đậm ở đây** và kết thúc');
  await dragSelect(page, '#v-src', 'liên kết tới ví dụ](https://example.com/path) ở giữa');
  await page.click('#pop-chips .ma-chip:has-text("Cần kiểm tra lại tính xác thực")');
  const o2 = await out(page);
  check('gợi ý lưu ngay, xếp theo thứ tự văn bản', o2.includes('\n\n1. L3 "liên kết tới ví dụ](https://example.com/path) ở giữa" — Cần kiểm tra lại tính xác thực\n2. L5 "chữ đậm'), JSON.stringify(o2));
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
  check('bấm lề dòng 3 mở nhận xét của dòng ấy', await page.isVisible('#pop-del') && (await page.inputValue('#pop-text')) === 'Cần kiểm tra lại tính xác thực');
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
  await page.keyboard.type('kỹ hơn');
  const chips3 = await page.$$eval('#pop-chips .ma-chip .ma-chip__t', (els) => els.map((e) => e.textContent));
  check('gõ thì lọc gợi ý', chips3.length >= 1 && chips3.every((t) => /kỹ hơn/i.test(t)), chips3.join(' | '));
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
  check('bấm highlight mở hộp sửa', await page.isVisible('#pop-del') && (await page.inputValue('#pop-text')) === 'Cần kiểm tra lại tính xác thực');
  await page.keyboard.press('Escape');

  // 5. Kiểu khối, lời dẫn, kèm toàn văn, chép.
  await openOpts(page);
  check('tab Prompt hiện prompt, tóm tắt tuỳ chọn', await page.isVisible('#out') && /compact · line numbers/.test(await page.textContent('#opts-sum')), await page.textContent('#opts-sum'));
  await page.click('.ma-fmt label:nth-child(2)');
  check('prompt kiểu khối, số dòng ở tiêu đề mục', /\n\n### 1 · L3\n> liên kết/.test(await out(page)), JSON.stringify(await out(page)));
  await page.click('#btn-headtpl');
  check('lời dẫn đầu, câu số dòng nối ngay sau', /^Sửa văn bản markdown theo từng nhận xét dưới đây[^\n]*\nSố dòng \(L\) tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn\.\n\n/.test(await out(page)));
  await page.check('#inc-doc');
  check('kèm toàn văn trong khối rào', /Văn bản gốc:\n```markdown\n# Bài thử[\s\S]*\n```$/.test(await out(page)));
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
  check('tải lại: lời dẫn còn', (await out(page)).startsWith('Sửa văn bản markdown'));
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
  await openOpts(page);
  await page.fill('#p-path', 'notes/a.md');
  const o10 = await out(page);
  check('có tệp: vị trí dạng tệp:dòng', /\. notes\/a\.md:9-10 "Mục một/.test(o10) && /\. notes\/a\.md:5 "liên kết/.test(o10) && /tệp:dòng/.test(o10), JSON.stringify(o10));
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
  // Đang Song song mà cửa sổ hẹp lại: lùi về Preview, vẫn nhớ split; rộng lại thì về Song song.
  const vw = () => page.evaluate(() => ({ mode: document.getElementById('views').dataset.mode, src: !document.getElementById('wrap-src').hidden,
    tab: document.querySelector('.ma-tab[aria-selected="true"]')?.dataset.view, pref: JSON.parse(localStorage.getItem('md-annotate:prefs:v1') || '{}').view }));
  await page.setViewportSize({ width: 600, height: 900 }); await page.waitForTimeout(150);
  let nv = await vw();
  check('Song song, cửa sổ hẹp lại: lùi về Preview, vẫn nhớ split', nv.mode === 'view' && !nv.src && nv.tab === 'view' && nv.pref === 'split', JSON.stringify(nv));
  await page.setViewportSize({ width: 1280, height: 900 }); await page.waitForTimeout(150);
  nv = await vw();
  check('rộng lại: về Song song', nv.mode === 'split' && nv.src && nv.tab === 'split', JSON.stringify(nv));
  // Kéo panel rộng thêm vẫn phải còn Song song: thử ở màn đủ rộng.
  await page.setViewportSize({ width: 2560, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0));
  let g = await geo();
  check('Song song: hai khung cuộn riêng, trang không cuộn', g.page <= 0 && g.srcScroll && g.mdScroll, JSON.stringify(g));
  check('Song song vừa khung nhìn: khoá cuộn trang (ma-fit)', await page.evaluate(() => document.documentElement.classList.contains('ma-fit') && getComputedStyle(document.documentElement).overflowY === 'hidden'));
  await page.click('.ma-tab[data-view="view"]');
  check('rời Song song: bỏ khoá, trang cuộn được', await page.evaluate(() => !document.documentElement.classList.contains('ma-fit') && document.documentElement.scrollHeight > innerHeight));
  await page.click('.ma-tab[data-view="split"]');
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
  await page.click('#ptab-prompt');
  await page.click('#btn-rail');
  check('thu gọn khi đang ở tab Prompt: thân panel ẩn hết', await page.$eval('#panel-body', (el) => getComputedStyle(el).display === 'none'));
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

  /* ---------- Chuyển gợi ý tiếng Anh (bản trước) về tiếng Việt, giữ số đếm và phiên ---------- */
  const vctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const vp = await vctx.newPage(); watch(vp);
  await vp.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('md-annotate:stats:v1', JSON.stringify({ items: {
      'make it shorter': { t: 'Make it shorter', n: 7, last: 5, o: 2, seed: true },
      'remove this': { t: 'Remove this', n: 1, last: 1, o: 5, seed: true, hidden: true },
      'ý riêng của tôi': { t: 'Ý riêng của tôi', n: 3, last: 9, o: 1e6 } } }));
    localStorage.setItem('md-annotate:s:old1', JSON.stringify({ id: 'old1', name: 'Phiên cũ', named: true, created: 1, updated: 2, text: '# Cũ\n\nMột câu cũ.', comments: [{ id: 'c1', quote: 'Một câu cũ.', comment: 'Viết gọn lại', origin: 'src', prefix: '', suffix: '', rel: 0.5, created: 1 }], header: '', footer: '', fmt: 'inline', includeDoc: false }));
    localStorage.setItem('md-annotate:index:v1', JSON.stringify([{ id: 'old1', name: 'Phiên cũ', created: 1, updated: 2, chars: 18, count: 1 }]));
    localStorage.setItem('md-annotate:current', JSON.stringify('old1'));
  });
  await vp.goto(BASE);
  await vp.waitForFunction(() => window.marked && window.DOMPurify);
  await vp.waitForTimeout(300);
  const mig = await vp.evaluate(() => JSON.parse(localStorage.getItem('md-annotate:stats:v1')).items);
  check('chuyển gợi ý: số đếm từ khoá tiếng Anh về tiếng Việt, giữ ẩn, giữ gợi ý tự gõ',
    mig['viết gọn lại'] && mig['viết gọn lại'].n === 7 && !mig['make it shorter'] && mig['xoá đoạn này'] && mig['xoá đoạn này'].hidden && mig['ý riêng của tôi'].n === 3, JSON.stringify(mig));
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
    const t = document.querySelector('.ma-ptab[aria-selected="true"]');
    const a = lum(getComputedStyle(t).backgroundColor), b = lum(getComputedStyle(t.parentElement).backgroundColor);
    const v = document.querySelector('.ma-tab[aria-selected="true"]'), u = lum(getComputedStyle(v, '::after').backgroundColor), d = lum(getComputedStyle(document.getElementById('doc')).backgroundColor);
    return { ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), ring: getComputedStyle(t).boxShadow, line: (Math.max(u, d) + 0.05) / (Math.min(u, d) + 0.05) };
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
  check('tối: tab panel đang chọn sáng hơn nền nhóm tab và có viền xanh; tab chế độ xem có vạch ≥ 3:1', tab.ratio >= 1.2 && /inset/.test(tab.ring) && tab.line >= 3, JSON.stringify(tab));
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
  await m.tap('#fab'); await m.tap('#v-md h1'); await m.waitForTimeout(100);
  check('điện thoại: chạm ra ngoài tấm đáy thì hết tô đoạn đang chọn', !(await m.isVisible('#pop')) && await m.evaluate(() => !CSS.highlights.get('ma-pending').size && getSelection().isCollapsed));
  await scriptSelect(m, '#v-md', 'Try selecting this sentence');
  check('điện thoại: vùng chọn hiện nút nổi', await m.isVisible('#fab'));
  await m.tap('#fab');
  check('điện thoại: hộp nhận xét là tấm đáy', await m.isVisible('#pop') && await m.evaluate(() => document.getElementById('pop').classList.contains('is-sheet')));
  const fsz = await m.evaluate(() => ['pop-text', 's-name', 'hint-add-in', 'p-path', 'src-input'].map((id) => [id, parseFloat(getComputedStyle(document.getElementById(id)).fontSize)]).filter((x) => x[1] < 16));
  check('điện thoại: ô chữ ≥ 16px (Safari iOS không phóng to khi focus)', !fsz.length, JSON.stringify(fsz));
  const sy = await m.evaluate(() => scrollY);
  await m.tap('#pop-chips .ma-chip:has-text("Viết gọn lại")');
  check('điện thoại: lưu nhận xét không kéo trang', Math.abs((await m.evaluate(() => scrollY)) - sy) < 2);
  check('điện thoại: chạm gợi ý thì lưu', /1\. L\d+ "Try selecting this sentence" — Viết gọn lại/.test(await out(m)), JSON.stringify(await out(m)));
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
  await m.tap('#dlg-panel #opts summary'); await m.waitForTimeout(150);
  const mclash = await cornerClash(m);
  check('điện thoại: tấm panel, Options: thanh cuộn không chạy vào góc bo (MDAN-018)', !mclash.length, mclash.join(', '));
  await m.tap('#dlg-panel #opts summary');
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

  /* ---------- Focus mode theo section ---------- */
  const fctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await fctx.addInitScript(() => { try { if (!sessionStorage.getItem('f')) { localStorage.setItem('md-annotate:prefs:v1', JSON.stringify({ focus: true, dim: 20 })); sessionStorage.setItem('f', '1'); } } catch (e) {} });
  const f = await fctx.newPage(); watch(f);
  await f.goto(BASE); await f.waitForFunction(() => window.marked && window.DOMPurify);
  const FDOC = ['# Title', '', 'Intro paragraph.', '', '## Alpha', '', 'Alpha one.', '', 'Alpha two.', '', '```', '# not a heading', '```', '', '## Beta', '', 'Beta one.', ''].join('\n');
  await f.evaluate((t) => { const ta = document.getElementById('src-input'); ta.focus(); ta.dispatchEvent(new Event('paste')); ta.value = t; ta.dispatchEvent(new Event('input')); }, FDOC);
  await f.waitForTimeout(150);
  await f.click('.ma-tab[data-view="view"]');
  await f.hover('#v-md p:has-text("Alpha two")'); await f.waitForTimeout(350);
  const fo = await f.$$eval('#v-md > *', (els) => els.map((e) => e.tagName + ':' + e.textContent.trim().slice(0, 10) + '=' + getComputedStyle(e).opacity));
  const op = (pre) => (fo.find((x) => x.includes(pre)) || '').split('=')[1];
  check('Focus Preview: cả section Alpha sáng (tiêu đề, hai đoạn, code)', op('H2:Alpha') === '1' && op('P:Alpha one') === '1' && op('P:Alpha two') === '1' && op('PRE:') === '1', fo.join(' | '));
  check('Focus Preview: section khác mờ 20%', op('P:Intro') === '0.2' && op('H2:Beta') === '0.2' && op('P:Beta one') === '0.2', fo.join(' | '));
  await f.click('.ma-tab[data-view="src"]');
  await f.hover('#v-src .ma-ln >> nth=6'); await f.waitForTimeout(350);
  const so = await f.$$eval('#v-src .ma-ln', (ls) => ls.map((l) => getComputedStyle(l).opacity));
  check('Focus Source: dòng 5–14 (## Alpha tới trước ## Beta, kể cả "#" trong khối rào) sáng, ngoài mờ', so.slice(4, 14).every((o) => o === '1') && so[2] === '0.2' && so[14] === '0.2' && so[16] === '0.2', so.join(','));
  await f.mouse.move(5, 5); await f.waitForTimeout(350);
  check('Focus: con trỏ ra ngoài khung thì hết mờ', (await f.$$eval('#v-src .ma-ln', (ls) => ls.every((l) => getComputedStyle(l).opacity === '1'))));
  await fctx.close();

  /* ---------- Cuộn theo nhau ở Song song: cùng một đoạn ở giữa hai khung ---------- */
  const sctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await sctx.addInitScript(() => { try { if (!sessionStorage.getItem('s')) { localStorage.setItem('md-annotate:prefs:v1', JSON.stringify({ view: 'split' })); sessionStorage.setItem('s', '1'); } } catch (e) {} });
  const sp = await sctx.newPage(); watch(sp);
  await sp.goto(BASE); await sp.waitForFunction(() => window.marked && window.DOMPurify);
  const parts = [];
  for (let i = 1; i <= 24; i++) {
    parts.push(`## Section ${i}`, '', 'Short paragraph number ' + i + '.', '');
    if (i % 3 === 0) parts.push('```js', 'const a = ' + i + ';', 'const b = a * 2;', 'console.log(a, b);', '```', '');
    if (i % 4 === 0) parts.push('- one', '- two', '- three', '');
    if (i % 5 === 0) parts.push('| a | b |', '|---|---|', '| 1 | 2 |', '| 3 | 4 |', '');
  }
  await sp.evaluate((t) => { const ta = document.getElementById('src-input'); ta.focus(); ta.dispatchEvent(new Event('paste')); ta.value = t; ta.dispatchEvent(new Event('input')); }, parts.join('\n'));
  await sp.waitForTimeout(200);
  await sp.click('.ma-tab[data-view="split"]'); await sp.waitForTimeout(200);
  const centerOf = (pane, sel) => sp.evaluate(([pane, sel]) => {
    const p = document.getElementById(pane), r = p.getBoundingClientRect(); const el = [...p.querySelectorAll(sel.q)].find((e) => e.textContent.includes(sel.t));
    const e = el.getBoundingClientRect(); return Math.round((e.top + e.height / 2) - (r.top + r.height / 2));
  }, [pane, sel]);
  // Đặt dòng "## Section 14" của nguồn vào giữa khung nguồn.
  await sp.evaluate(() => { const w = document.getElementById('wrap-src'); const ln = [...w.querySelectorAll('.ma-ln')].find((l) => l.textContent.startsWith('## Section 14'));
    w.scrollTop = ln.offsetTop - w.clientHeight / 2 + ln.offsetHeight / 2 + (ln.getBoundingClientRect().top - w.getBoundingClientRect().top + w.scrollTop - ln.offsetTop); });
  await sp.waitForTimeout(300);
  const dMd = await centerOf('wrap-md', { q: 'h2', t: 'Section 14' });
  check('cuộn nguồn: tiêu đề Section 14 ở giữa khung Preview (±40px)', Math.abs(dMd) <= 40, dMd + 'px');
  await sp.evaluate(() => { const w = document.getElementById('wrap-md'); const h = [...w.querySelectorAll('h2')].find((e) => e.textContent === 'Section 7');
    w.scrollTop += h.getBoundingClientRect().top + h.offsetHeight / 2 - (w.getBoundingClientRect().top + w.clientHeight / 2); });
  await sp.waitForTimeout(300);
  const dSrc = await centerOf('wrap-src', { q: '.ma-ln', t: '## Section 7' });
  check('cuộn Preview: dòng ## Section 7 ở giữa khung nguồn (±40px)', Math.abs(dSrc) <= 40, dSrc + 'px');
  await sp.evaluate(() => { document.getElementById('wrap-src').scrollTop = 0; }); await sp.waitForTimeout(300);
  check('cuộn nguồn về đầu: Preview cũng về đầu', (await sp.$eval('#wrap-md', (w) => w.scrollTop)) === 0);
  await sp.evaluate(() => { const w = document.getElementById('wrap-src'); w.scrollTop = w.scrollHeight; }); await sp.waitForTimeout(300);
  check('cuộn nguồn tới cuối: Preview cũng tới cuối', await sp.$eval('#wrap-md', (w) => w.scrollHeight - w.clientHeight - w.scrollTop <= 2));
  // Bôi đen ở Source: đoạn tương ứng bên Preview được tô (ma-mirror), chưa mở hộp.
  await scriptSelect(sp, '#v-src', 'Short paragraph number 3.');
  await sp.waitForTimeout(150);
  const mir = await sp.evaluate(() => { const h = CSS.highlights.get('ma-mirror'); if (!h || !h.size) return null; const r = [...h][0]; return { t: r.toString(), inMd: document.getElementById('v-md').contains(r.startContainer) }; });
  check('Split: bôi đen ở Source thì Preview tô đúng đoạn', mir && mir.inMd && mir.t === 'Short paragraph number 3.', JSON.stringify(mir));
  await scriptSelect(sp, '#v-md', 'Short paragraph number 4');
  await sp.waitForTimeout(150);
  const mir2 = await sp.evaluate(() => { const h = CSS.highlights.get('ma-mirror'); if (!h || !h.size) return null; const r = [...h][0]; return { t: r.toString(), inSrc: document.getElementById('v-src').contains(r.startContainer) }; });
  check('Split: bôi đen ở Preview thì Source tô đúng đoạn', mir2 && mir2.inSrc && mir2.t.startsWith('Short paragraph number 4'), JSON.stringify(mir2));
  await sp.evaluate(() => getSelection().removeAllRanges()); await sp.waitForTimeout(150);
  check('bỏ chọn thì hết tô phản chiếu', await sp.evaluate(() => !(CSS.highlights.get('ma-mirror') || {}).size));
  // Focus theo chuột ở Split: section cùng số bên kia cũng sáng.
  await sp.click('#btn-layout'); await sp.check('#set-focus'); await sp.keyboard.press('Escape');
  await sp.evaluate(() => { document.getElementById('wrap-src').scrollTop = 0; }); await sp.waitForTimeout(150);
  await sp.hover('#v-src .ma-ln:has-text("Short paragraph number 2.")'); await sp.waitForTimeout(350);
  const fm = await sp.evaluate(() => { const hs = [...document.querySelectorAll('#v-md > h2')]; const o = (t) => getComputedStyle(hs.find((h) => h.textContent === t)).opacity; return [o('Section 2'), o('Section 3')]; });
  check('Focus theo chuột ở Split: Preview sáng section 2, mờ section 3', fm[0] === '1' && fm[1] !== '1', fm.join(','));
  // Dải đọc 25–50%: cuộn Source, section trong dải sáng ở cả hai bên.
  await sp.click('#btn-layout'); await sp.click('label:has(input[name="focusby"][value="band"])'); await sp.keyboard.press('Escape');
  await sp.mouse.move(5, 5);
  await sp.evaluate(() => { const w = document.getElementById('wrap-src'); const ln = [...w.querySelectorAll('.ma-ln')].find((l) => l.textContent.startsWith('## Section 10'));
    w.scrollTop += ln.getBoundingClientRect().top - (w.getBoundingClientRect().top + w.clientHeight * 0.24); });
  await sp.waitForTimeout(400);
  const band = await sp.evaluate(() => ({ src: [...document.querySelectorAll('#v-src .ma-ln.is-sec')].map((l) => l.textContent).find((t) => t.startsWith('##')),
    md: [...document.querySelectorAll('#v-md > .is-sec')].map((e) => e.textContent).find((t) => /^Section/.test(t)) }));
  check('Dải đọc: section 10 sáng ở Source và Preview', band.src && band.src.startsWith('## Section 10') && band.md === 'Section 10', JSON.stringify(band));
  // Cuộn Preview bằng bánh xe: dải đo trên Preview (khung dẫn), không trên Source vừa bị kéo theo.
  const mdBox = await sp.evaluate(() => { const r = document.getElementById('wrap-md').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await sp.mouse.move(mdBox.x, mdBox.y);
  for (let i = 0; i < 12; i++) { await sp.mouse.wheel(0, 90); await sp.waitForTimeout(40); }
  await sp.waitForTimeout(400);
  const lead = await sp.evaluate(() => { const w = document.getElementById('wrap-md').getBoundingClientRect(), b1 = w.top + w.height * 0.25, b2 = w.top + w.height * 0.5;
    const bl = [...document.querySelectorAll('#v-md > *')]; let i = bl.findIndex((e) => e.getBoundingClientRect().bottom > b1);
    if (i < 0 || bl[i].getBoundingClientRect().top >= b2) i = Math.max(0, (i < 0 ? bl.length : i) - 1);
    const lit = document.querySelector('#v-md > .is-sec'); return { want: bl[i].dataset.sec, got: lit && lit.dataset.sec }; });
  check('Dải đọc ở Split đo trên khung đang cuộn (Preview)', lead.want != null && lead.want === lead.got, JSON.stringify(lead));
  // Dải đọc: dòng dưới chuột sáng dù ngoài section; ở Split khung kia sáng khối tương ứng.
  const outP = await sp.evaluate(() => { const w = document.getElementById('wrap-md').getBoundingClientRect();
    const p = [...document.querySelectorAll('#v-md > p:not(.is-sec)')].find((e) => { const r = e.getBoundingClientRect(); return r.top > w.top + w.height * 0.6 && r.bottom < w.bottom; });
    return p && p.textContent; });
  await sp.hover(`#v-md > p:has-text("${outP}")`); await sp.waitForTimeout(250);
  const ln = await sp.evaluate((t) => { const p = [...document.querySelectorAll('#v-md > p')].find((e) => e.textContent === t);
    return { op: getComputedStyle(p).opacity, src: [...document.querySelectorAll('#v-src .ma-ln.is-line')].map((l) => l.textContent.trim()) }; }, outP);
  check('Dải đọc: đoạn dưới chuột (ngoài section) sáng, Source sáng dòng tương ứng', ln.op === '1' && ln.src.length === 1 && ln.src[0] === outP, JSON.stringify({ outP, ln }));
  const li = await sp.evaluate(() => { const w = document.getElementById('wrap-md').getBoundingClientRect();
    const ul = [...document.querySelectorAll('#v-md > ul:not(.is-sec)')].find((e) => { const r = e.getBoundingClientRect(); return r.top > w.top && r.bottom < w.bottom; });
    if (!ul) return null; const r = ul.children[1].getBoundingClientRect(); return { x: r.left + 20, y: r.top + r.height / 2 }; });
  if (li) {
    await sp.mouse.move(li.x, li.y); await sp.waitForTimeout(250);
    const lo = await sp.evaluate(() => { const ul = document.querySelector('#v-md > ul.is-line'); if (!ul) return null; const o = (e) => getComputedStyle(e).opacity;
      return [o(ul), o(ul.children[0]), o(ul.children[1])]; });
    check('Dải đọc: mục danh sách dưới chuột sáng, mục khác mờ', lo && lo[0] === '1' && lo[1] !== '1' && lo[2] === '1', JSON.stringify(lo));
  } else check('Dải đọc: có danh sách ngoài section để thử', false);
  await sp.mouse.move(5, 5); await sp.waitForTimeout(200);
  check('Dải đọc: chuột rời khung thì hết sáng theo dòng', await sp.evaluate(() => !document.querySelector('.is-line, .ma-dimx')));
  await sp.click('#btn-layout'); await sp.click('#set-reset'); await sp.keyboard.press('Escape');

  // Kéo bắt đầu ở lề phải của khung Preview, rồi ở nền trang bên trái khung: đều mở hộp nhận xét.
  await sp.evaluate(() => { document.getElementById('wrap-md').scrollTop = 0; }); await sp.waitForTimeout(150);
  for (const [name, side] of [['lề phải khung Preview', 'right'], ['nền trang bên trái khung', 'left']]) {
    // Lề phải: giữa mép chữ và dải tiến độ (phần lề dải không chiếm).
    const g = await sp.evaluate((side) => { const d = document.getElementById('doc').getBoundingClientRect(), m = document.querySelector('.ma-mm[data-w="md"]');
      const t = document.getElementById('v-md').getBoundingClientRect().right, ml = m.hidden ? document.getElementById('wrap-md').getBoundingClientRect().right : m.getBoundingClientRect().left;
      const ps = [...document.querySelectorAll('#v-md > p')].slice(0, 3).map((p) => p.getBoundingClientRect().top + 8);
      return { x: side === 'right' ? (t + ml) / 2 : d.left - 8, y1: ps[0], y2: ps[2] }; }, side);
    await sp.mouse.move(g.x, g.y1); await sp.mouse.down(); await sp.mouse.move(g.x, g.y2, { steps: 6 }); await sp.mouse.up(); await sp.waitForTimeout(200);
    check(`kéo từ ${name} mở hộp nhận xét`, await sp.isVisible('#pop'));
    await sp.keyboard.press('Escape'); await sp.waitForTimeout(100);
  }
  // Văn bản có định nghĩa link `[id]: url` (marked bỏ khối ấy): section ở Source vẫn khớp Preview, không lệch dòng.
  const demo = require('fs').readFileSync(require('path').join(__dirname, 'fixtures/markdown-it-demo.md'), 'utf8');
  await sp.click('.ma-tab[data-view="edit"]');
  await sp.evaluate((t) => { const ta = document.getElementById('src-input'); ta.value = t; ta.dispatchEvent(new Event('input')); }, demo);
  await sp.waitForTimeout(200);
  await sp.click('.ma-tab[data-view="split"]'); await sp.waitForTimeout(200);
  await sp.click('#btn-layout'); await sp.check('#set-focus'); await sp.keyboard.press('Escape');
  await sp.evaluate(() => [...document.querySelectorAll('#v-md > p')].find((e) => e.textContent.startsWith('The killer feature')).scrollIntoView({ block: 'center' }));
  await sp.waitForTimeout(200);
  await sp.hover('#v-md > p:has-text("The killer feature")'); await sp.waitForTimeout(350);
  const lit = await sp.evaluate(() => [...document.querySelectorAll('#v-src .ma-ln.is-sec')].map((l) => l.textContent.replace(/\n$/, '')).filter((t) => t.trim()));
  check('Focus ở Split, văn bản có [id]: url: Source sáng đúng section Plugins',
    lit[0] === '## Plugins' && lit.some((t) => t.startsWith('[syntax plugins]')) && !lit.some((t) => t.startsWith('[id]:')) && lit.length === 3, JSON.stringify(lit));
  await sp.click('#btn-layout'); await sp.click('#set-reset'); await sp.keyboard.press('Escape');
  await sp.evaluate(() => { document.getElementById('src-input').value += '\n\n```\n' + 'x'.repeat(400) + '\n```\n'; document.getElementById('src-input').dispatchEvent(new Event('input')); });
  await sp.waitForTimeout(400);
  await openOpts(sp); await sp.click('#btn-layout'); await sp.click('#btn-keys'); await sp.waitForTimeout(200);
  const clash = await cornerClash(sp);
  check('vùng cuộn (khung, khối code dài, Options, hộp thoại): thanh cuộn không chạy vào góc bo (MDAN-018)', !clash.length, clash.join(', '));
  await sp.keyboard.press('Escape'); await sp.keyboard.press('Escape');
  await sctx.close();

  // ── review: data path ──
  {
    const dctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' });
    await dctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(BASE).origin });
    const dp = await dctx.newPage(); watch(dp);
    await dp.goto(BASE); await dp.waitForFunction(() => window.marked && window.DOMPurify);
    const setText = (t) => dp.evaluate((t) => { const ta = document.getElementById('src-input'); ta.value = t; ta.dispatchEvent(new Event('input')); }, t);
    const clip = () => dp.evaluate(() => navigator.clipboard.readText());
    await setText('# Doc A\n\nalpha line\n\nTarget sentence here.\n'); await dp.waitForTimeout(400);
    await dp.click('.ma-tab[data-view="src"]');
    await dragSelect(dp, '#v-src', 'Target sentence');
    await dp.keyboard.type('fix'); await dp.keyboard.press('Enter');
    check('dữ liệu: nhận xét ở dòng 5', /1\. L5 "Target sentence" — fix$/.test(await out(dp)), JSON.stringify(await out(dp)));
    // Gõ ở Edit rồi chép ngay (trước lần vẽ lại sau 250ms): số dòng theo văn bản vừa gõ.
    await dp.click('.ma-tab[data-view="edit"]'); await dp.click('#src-input');
    await dp.keyboard.press('Control+Home'); await dp.keyboard.press('Enter'); await dp.keyboard.press('Enter');
    await dp.keyboard.press('Control+Shift+KeyC'); await dp.waitForTimeout(60);
    const fast = await clip();
    check('dữ liệu: chép ngay sau khi gõ, số dòng theo văn bản mới (L7)', /1\. L7 "Target sentence" — fix$/.test(fast), JSON.stringify(fast));
    await dp.waitForTimeout(400);
    check('dữ liệu: prompt sau lần vẽ lại cũng L7', /1\. L7 "Target sentence" — fix$/.test(await out(dp)));
    // Xoá nhận xét, chuyển sang phiên khác, rồi bấm Undo: nhận xét về phiên của nó, không vào phiên đang mở.
    await dp.click('#btn-new'); await setText('Other doc\n'); await dp.waitForTimeout(400);
    await dp.click('#btn-hist'); await dp.click('#hist-list .ma-row:has-text("Doc A") .ma-row__main'); await dp.waitForTimeout(200);
    await dp.click('#list .ma-item [aria-label="Delete comment"]');
    check('dữ liệu: xoá nhận xét hiện Undo', await dp.isVisible('.ma-toast__btn'));
    await dp.click('#btn-hist'); await dp.click('#hist-list .ma-row:has-text("Other doc") .ma-row__main'); await dp.waitForTimeout(200);
    await dp.click('.ma-toast__btn'); await dp.waitForTimeout(400);
    check('dữ liệu: Undo sau khi chuyển phiên không thêm nhận xét vào phiên đang mở', (await items(dp)).length === 0, (await items(dp)).join(' | '));
    await dp.click('#btn-hist'); await dp.click('#hist-list .ma-row:has-text("Doc A") .ma-row__main'); await dp.waitForTimeout(200);
    check('dữ liệu: Undo trả nhận xét về phiên của nó', (await items(dp)).length === 1 && /fix/.test((await items(dp))[0] || ''), (await items(dp)).join(' | '));
    // History: đổi tên phiên đang mở, xoá tên thì về tên tự đặt; xoá phiên đang mở thì mở phiên kế, không ghi lại phiên đã xoá.
    const renameCur = async (name) => {
      await dp.click('#btn-hist'); await dp.click('#hist-list .ma-row.is-cur [aria-label="Rename"]');
      await dp.fill('#hist-list input', name); await dp.keyboard.press('Enter'); await dp.keyboard.press('Escape');
    };
    await renameCur('Tên riêng');
    check('dữ liệu: đổi tên phiên đang mở', (await dp.inputValue('#s-name')) === 'Tên riêng');
    await renameCur('');
    check('dữ liệu: xoá tên thì về tên tự đặt', (await dp.inputValue('#s-name')) === '' && (await dp.getAttribute('#s-name', 'placeholder')) === 'Doc A');
    const delId = await dp.evaluate(() => JSON.parse(localStorage.getItem('md-annotate:current')));
    await dp.click('#btn-hist');
    dp.once('dialog', (d) => d.accept());
    await dp.click('#hist-list .ma-row.is-cur [aria-label="Delete session"]'); await dp.keyboard.press('Escape');
    await dp.waitForTimeout(500);
    const after = await dp.evaluate((id) => ({ text: document.getElementById('src-input').value, gone: localStorage.getItem('md-annotate:s:' + id) === null,
      idx: JSON.parse(localStorage.getItem('md-annotate:index:v1')).map((e) => e.name) }), delId);
    check('dữ liệu: xoá phiên đang mở thì mở phiên kế, phiên đã xoá không quay lại', after.text === 'Other doc\n' && after.gone && after.idx.join() === 'Other doc', JSON.stringify(after));
    await dctx.close();
  }
  // ── end review: data path ──
  // ── review: render & select ──
  {
    const rctx = await browser.newContext({ viewport: { width: 1280, height: 560 }, colorScheme: 'light' });
    const rp = await rctx.newPage(); watch(rp);
    await rp.goto(BASE); await rp.waitForFunction(() => window.marked && window.DOMPurify);
    const fill = async (t) => {
      await rp.evaluate((t) => { const ta = document.getElementById('src-input'); ta.dispatchEvent(new Event('paste')); ta.value = t; ta.dispatchEvent(new Event('input')); }, t);
      await rp.waitForTimeout(350);
    };
    // Markdown dán vào không được thoát khỏi khung Preview: <style> đè CSS cả trang, id trùng id giao diện, lớp phủ cố định,
    // form gửi đi (rời trang), <dialog open> (trang tưởng có hộp thoại mở).
    await fill('# T\n\nText.\n\n<style>.ma-panel{display:none}</style>\n\n<div id="list">x</div>\n\n<p style="position:fixed;inset:0;z-index:9999">cover</p>\n\n<form action="https://example.com/"><button>go</button></form>\n\n<dialog open>d</dialog>\n');
    const esc = await rp.evaluate(() => ({
      panel: getComputedStyle(document.getElementById('panel')).display,
      list: !!document.getElementById('list').closest('#v-md'),
      style: !!document.querySelector('#v-md style, #v-md [style]'),
      form: !!document.querySelector('#v-md form'),
      dialog: !!document.querySelector('dialog[open]')
    }));
    check('Preview: markdown không đè CSS, id, lớp phủ, form, hộp thoại của trang', esc.panel !== 'none' && !esc.list && !esc.style && !esc.form && !esc.dialog, JSON.stringify(esc));

    // Khung nhìn thấp (560px), bôi đen dòng giữa màn hình: dưới và trên đều không đủ chỗ cho hộp, hộp vẫn trọn trong
    // khung nhìn (nút Save thấy được).
    await rp.click('.ma-tab[data-view="edit"]');
    await fill(Array.from({ length: 60 }, (_, i) => `Paragraph number ${i + 1} with some words.`).join('\n\n') + '\n');
    await rp.click('.ma-tab[data-view="view"]'); await rp.waitForTimeout(150);
    const mb = await rp.evaluate(() => {
      const p = document.querySelectorAll('#v-md p')[20];
      p.scrollIntoView({ block: 'center' });
      const r = p.getBoundingClientRect();
      return { x1: r.left + 2, x2: r.left + 120, y: r.top + r.height / 2 };
    });
    await rp.mouse.move(mb.x1, mb.y); await rp.mouse.down(); await rp.mouse.move(mb.x2, mb.y, { steps: 5 }); await rp.mouse.up();
    await rp.waitForTimeout(200);
    const pr = await rp.evaluate(() => { const r = document.getElementById('pop').getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight }; });
    check('hộp nhận xét ở khung nhìn thấp: trọn trong khung nhìn', await rp.isVisible('#pop') && pr.top >= 0 && pr.bottom <= pr.vh && await inView(rp, '#pop-save'), JSON.stringify(pr));
    await rp.keyboard.press('Escape');

    // Thanh trên đếm dòng như lề số dòng của Source (văn bản kết thúc bằng xuống dòng: 60 đoạn = 119 dòng).
    const lc = await rp.evaluate(() => ({ meta: document.getElementById('doc-meta').textContent, gutter: document.querySelectorAll('#v-src .ma-ln').length }));
    check('số dòng ở thanh trên bằng số dòng ở lề Source', new RegExp('· ' + lc.gutter + ' lines$').test(lc.meta), JSON.stringify(lc));
    await rctx.close();
  }
  // ── end review: render & select ──
  // ── review: layout & scroll ──
  const rctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await rctx.addInitScript(() => { try { if (!sessionStorage.getItem('r')) { localStorage.setItem('md-annotate:prefs:v1', JSON.stringify({ view: 'split', focus: true })); sessionStorage.setItem('r', '1'); } } catch (e) {} });
  const rv = await rctx.newPage(); watch(rv);
  await rv.goto(BASE); await rv.waitForFunction(() => window.marked && window.DOMPurify);
  const rvLoad = async (t) => {
    await rv.click('.ma-tab[data-view="edit"]');
    await rv.evaluate((t) => { const ta = document.getElementById('src-input'); ta.value = t; ta.dispatchEvent(new Event('input')); }, t);
    await rv.waitForTimeout(350);
    await rv.click('.ma-tab[data-view="split"]'); await rv.waitForTimeout(200);
  };
  const litSrc = () => rv.evaluate(() => [...document.querySelectorAll('#v-src .ma-ln.is-sec')].map((l) => l.textContent.trim()).filter(Boolean));
  // Tiêu đề viết bằng HTML (<h1 align="center">, hay gặp ở README) mở section ở cả hai khung: số section khớp.
  await rvLoad('<h1 align="center">Title</h1>\n\nIntro para.\n\n## Two\n\nTwo para.\n');
  await rv.hover('#v-md > p:has-text("Two para.")'); await rv.waitForTimeout(300);
  const lh = await litSrc();
  check('Focus ở Split, tiêu đề HTML: Source sáng đúng section của Preview', lh.join('|') === '## Two|Two para.', JSON.stringify(lh));
  // Focus theo chuột, chuột đứng yên, trang vẽ lại (lưu nhận xét, đổi Syntax colors): section vẫn sáng, Source không mờ hết.
  await rv.hover('#v-src .ma-ln:has-text("Two para.")'); await rv.waitForTimeout(300);
  await rv.evaluate(() => { const s = document.getElementById('syn'); s.checked = !s.checked; s.dispatchEvent(new Event('change')); });
  await rv.waitForTimeout(300);
  const rr = await rv.evaluate(() => [...document.querySelectorAll('#v-src .ma-ln')].filter((l) => getComputedStyle(l).opacity === '1').map((l) => l.textContent.trim()).filter(Boolean));
  check('Focus theo chuột: vẽ lại khi chuột đứng yên, section vẫn sáng', rr.join('|') === '## Two|Two para.', JSON.stringify(rr));
  await rv.evaluate(() => { const s = document.getElementById('syn'); s.checked = !s.checked; s.dispatchEvent(new Event('change')); });
  await rv.mouse.move(5, 5);
  // Chú thích HTML (<!-- toc -->) không dựng ra phần tử nào: số khối hai bên lệch, nhưng các khối khác vẫn ghép được,
  // nên dải đọc vẫn sáng dòng tương ứng ở khung kia và cuộn theo nhau vẫn theo khối (không về tỉ lệ).
  const tall = ['# Doc', '', '<!-- toc -->', ''];
  for (let i = 1; i <= 12; i++) tall.push('## Part ' + i, '', 'Line of part ' + i + '.', '', '![](data:image/gif;base64,R0lGODlhAQABAAAAACw=)', '');
  await rvLoad(tall.join('\n'));
  await rv.evaluate(() => [...document.querySelectorAll('#v-md img')].forEach((im) => { im.style.height = '260px'; im.style.display = 'block'; }));
  await rv.click('#btn-layout'); await rv.click('label:has(input[name="focusby"][value="band"])'); await rv.keyboard.press('Escape');
  await rv.hover('#v-md > p:has-text("Line of part 1.")'); await rv.waitForTimeout(300);
  const lm = await rv.evaluate(() => [...document.querySelectorAll('#v-src .ma-ln.is-line')].map((l) => l.textContent.trim()));
  check('lệch số khối (chú thích HTML): dải đọc vẫn sáng dòng tương ứng ở Source', lm.join('|') === 'Line of part 1.', JSON.stringify(lm));
  await rv.mouse.move(5, 5);
  await rv.evaluate(() => { const w = document.getElementById('wrap-src'); const ln = [...w.querySelectorAll('.ma-ln')].find((l) => l.textContent.startsWith('## Part 8'));
    w.scrollTop += ln.getBoundingClientRect().top + ln.offsetHeight / 2 - (w.getBoundingClientRect().top + w.clientHeight / 2); });
  await rv.waitForTimeout(300);
  const dP = await rv.evaluate(() => { const w = document.getElementById('wrap-md').getBoundingClientRect(); const h = [...document.querySelectorAll('#v-md > h2')].find((e) => e.textContent === 'Part 8').getBoundingClientRect();
    return Math.round(h.top + h.height / 2 - (w.top + w.height / 2)); });
  check('lệch số khối (chú thích HTML): cuộn Source, tiêu đề Part 8 ở giữa khung Preview (±40px)', Math.abs(dP) <= 40, dP + 'px');
  // Dải đọc ở sát đầu / cuối: section đầu (ngắn) và section cuối (ngắn) cũng chọn được, ở Split và ở Preview.
  const edge = ['# Title', '', 'Short intro.', ''];
  for (let i = 1; i <= 16; i++) { edge.push('## Sec ' + i, ''); for (let k = 0; k < 4; k++) edge.push('Paragraph ' + i + '.' + k + ' ' + 'lorem ipsum '.repeat(10), ''); }
  edge.push('## Last', '', 'Final short line.', '');
  await rvLoad(edge.join('\n'));
  const litMd = () => rv.evaluate(() => { const h = [...document.querySelectorAll('#v-md > .is-sec')].find((e) => /^H[1-6]$/.test(e.tagName)); return h ? h.textContent : null; });
  for (const mode of ['split', 'view']) {
    await rv.click(`.ma-tab[data-view="${mode}"]`); await rv.waitForTimeout(150);
    const sc = mode === 'split' ? 'document.getElementById("wrap-md")' : 'document.scrollingElement';
    await rv.evaluate(`${sc}.scrollTop = 1; ${sc}.scrollTop = 0`); await rv.waitForTimeout(250);
    const top = await litMd();
    await rv.evaluate(`${sc}.scrollTop = 1e7`); await rv.waitForTimeout(250);
    const end = await litMd();
    check(`dải đọc (${mode}): cuộn tới đầu sáng section đầu, tới cuối sáng section cuối`, top === 'Title' && end === 'Last', JSON.stringify({ top, end }));
  }
  await rv.click('.ma-tab[data-view="split"]');
  await rv.click('#btn-layout'); await rv.click('#set-reset'); await rv.keyboard.press('Escape');
  // Panel thu gọn (prefs.rail) rồi thu hẹp cửa sổ ≤ 1080px: panel đã ẩn khỏi lưới, văn bản không mất cột 56px.
  await rv.click('#btn-rail');
  for (const w of [1024, 390]) {
    await rv.setViewportSize({ width: w, height: 800 }); await rv.waitForTimeout(200);
    const gc = await rv.evaluate(() => getComputedStyle(document.querySelector('.ma-grid')).gridTemplateColumns);
    check(`${w}px, panel thu gọn: lưới một cột`, gc.trim().split(/\s+/).length === 1, gc);
  }
  await rv.setViewportSize({ width: 1440, height: 900 }); await rv.click('#btn-unrail');
  await rctx.close();
  // ── end review: layout & scroll ──

  // ── nhận xét nhiều dòng: chọn bằng lề số dòng ──
  {
    const mctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' });
    const ml = await mctx2.newPage(); watch(ml);
    await ml.goto(BASE); await ml.waitForFunction(() => window.marked && window.DOMPurify);
    const ML = ['# Multi', '', 'Alpha line one.', 'Beta line two.', '', '- [ ] same item', 'Gamma middle.', '- [ ] same item', 'Delta end.',
      '```js', 'const x = 1;', '```', 'Long ' + 'word '.repeat(240), ''].join('\r\n');   // CRLF: ô nhập đổi thành \n
    await ml.evaluate((t) => { const ta = document.getElementById('src-input'); ta.focus(); ta.dispatchEvent(new Event('paste')); ta.value = t; ta.dispatchEvent(new Event('input')); }, ML);
    await ml.waitForTimeout(150);
    await ml.click('.ma-tab[data-view="src"]'); await ml.waitForTimeout(100);
    const gut = (n) => ml.$eval(`#v-src .ma-ln:nth-child(${n})`, (el) => { el.scrollIntoView({ block: 'nearest' }); const r = el.getBoundingClientRect(); return { x: r.left + 4, y: r.top + 8 }; });
    const gclick = async (n) => { const g = await gut(n); await ml.mouse.click(g.x, g.y); await ml.waitForTimeout(80); };
    const gdbl = async (n) => { const g = await gut(n); await ml.mouse.dblclick(g.x, g.y); await ml.waitForTimeout(150); };
    const picks = () => ml.$$eval('#v-src .ma-ln', (ls) => ls.map((l, i) => (l.classList.contains('is-pick') ? i + 1 : 0)).filter(Boolean).join());
    const sum = () => ml.textContent('#pop-sum');
    const popBox = () => ml.$eval('#pop', (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) }; });

    await gdbl(3);
    check('nhiều dòng: bấm đúp lề vào chế độ, chọn dòng ấy, mở hộp', (await picks()) === '3' && (await ml.isVisible('#pop')) && (await sum()) === '1 line · L3', (await picks()) + ' | ' + (await sum()));
    check('nhiều dòng: bấm đúp không bôi đen chữ', await ml.evaluate(() => getSelection().isCollapsed || !getSelection().toString()));
    check('nhiều dòng: hộp có nút kéo', await ml.isVisible('#pop-grip'));
    await gclick(8); await gclick(4); await gclick(5);
    check('nhiều dòng: bấm một lần thêm dòng không liền, dòng trống không chọn được', (await picks()) === '3,4,8' && (await sum()) === '3 lines · L3-4, L8', (await picks()) + ' | ' + (await sum()));
    check('nhiều dòng: hộp hiện chữ các dòng', (await ml.textContent('#pop-q')) === 'Alpha line one.\nBeta line two.\n- [ ] same item', JSON.stringify(await ml.textContent('#pop-q')));
    const b0 = await popBox();
    await ml.fill('#pop-text', 'đang gõ');
    await gclick(9);
    check('nhiều dòng: hộp đang mở cập nhật tại chỗ, giữ chữ đang gõ', (await sum()) === '4 lines · L3-4, L8-9' && (await ml.inputValue('#pop-text')) === 'đang gõ' && JSON.stringify(await popBox()).startsWith(JSON.stringify({ x: b0.x, y: b0.y }).slice(0, -1)), JSON.stringify([await sum(), b0, await popBox()]));
    await dragSelect(ml, '#v-src', 'Gamma middle');
    check('nhiều dòng: bôi đen chữ trong chế độ không mở hộp đoạn chữ', (await ml.isVisible('#pop-head')) && (await ml.textContent('#pop-q')).startsWith('Alpha') && !(await ml.isVisible('#fab')));
    await ml.fill('#pop-text', '');
    await dragSelect(ml, '#v-src', 'Delta end');
    check('nhiều dòng: bôi đen (hộp chưa gõ) không đóng hộp (MDAN-014), dòng đã chọn còn', (await ml.isVisible('#pop')) && (await picks()) === '3,4,8,9' && !(await ml.isVisible('#fab')), await picks());
    await ml.evaluate(() => getSelection().removeAllRanges());
    await gclick(9);
    check('nhiều dòng: bấm lề mở lại hộp', (await ml.isVisible('#pop')) && (await sum()) === '3 lines · L3-4, L8');
    await ml.click('#pop-cancel');
    check('nhiều dòng: Cancel đóng hộp, giữ dòng đã chọn', !(await ml.isVisible('#pop')) && (await picks()) === '3,4,8');
    await gclick(9);
    const def = await popBox();
    const gb = await ml.$eval('#pop-grip', (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await ml.mouse.move(gb.x, gb.y); await ml.mouse.down(); await ml.mouse.move(gb.x + 240, gb.y - 160, { steps: 8 }); await ml.mouse.up();
    const moved = await popBox();
    check('nhiều dòng: kéo nút kéo thì hộp đi theo', Math.abs(moved.x - (def.x + 240)) <= 2 && Math.abs(moved.y - (def.y - 160)) <= 2, JSON.stringify({ def, moved }));
    await ml.mouse.move(gb.x + 240, gb.y - 160); await ml.mouse.down(); await ml.mouse.move(-500, -500, { steps: 4 }); await ml.mouse.up();
    const clamp = await popBox();
    check('nhiều dòng: kéo quá mép thì hộp vẫn trọn khung nhìn', clamp.x >= 0 && clamp.y >= 0, JSON.stringify(clamp));
    await ml.focus('#pop-grip'); await ml.keyboard.press('ArrowRight');
    check('nhiều dòng: phím mũi tên trên nút kéo dời hộp', (await popBox()).x === clamp.x + 16, JSON.stringify(await popBox()));
    await ml.click('#pop-cancel'); await gclick(9); await gclick(9);
    const back = await popBox();
    check('nhiều dòng: mở lại thì hộp về chỗ mặc định', Math.abs(back.x - def.x) <= 1 && Math.abs(back.y - def.y) <= 1, JSON.stringify({ def, back }));
    await ml.keyboard.press('Escape');
    check('nhiều dòng: Esc đóng hộp, bỏ mọi dòng đã chọn', !(await ml.isVisible('#pop')) && (await picks()) === '' && !(await ml.$eval('#v-src', (el) => el.classList.contains('is-picking'))));
    await dragSelect(ml, '#v-src', 'Delta end');
    check('bôi đen ngoài chế độ: hộp đoạn chữ như cũ, không có nút kéo', (await ml.isVisible('#pop')) && !(await ml.isVisible('#pop-grip')) && !(await ml.isVisible('#pop-head')) && (await ml.textContent('#pop-q')) === 'Delta end', JSON.stringify([await ml.isVisible('#pop'), await ml.isVisible('#pop-grip'), await ml.textContent('#pop-q')]));
    await ml.keyboard.press('Escape'); await ml.evaluate(() => getSelection().removeAllRanges());
    // Lưu: một nhận xét, hai phần; dòng 8 (không phải dòng 6 giống hệt) được tô.
    await gdbl(3); await gclick(4); await gclick(8);
    await ml.keyboard.type('Gộp hai chỗ'); await ml.keyboard.press('Enter');
    const want = 'Số dòng (L) tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.\n\n1. L3-4 "Alpha line one. Beta line two."; L8 "- [ ] same item" — Gộp hai chỗ';
    check('nhiều dòng: Save tạo một nhận xét hai phần, prompt đúng', (await items(ml)).length === 1 && (await out(ml)) === want, JSON.stringify(await out(ml)));
    check('nhiều dòng: Save thoát chế độ', (await picks()) === '' && !(await ml.isVisible('#pop')));
    const hl = await ml.evaluate(() => ({ lines: [...document.querySelectorAll('#v-src .ma-ln')].map((l, i) => (l.classList.contains('has-c') ? i + 1 : 0)).filter(Boolean).join(),
      badges: document.querySelectorAll('#v-src mark[data-n]').length, loc: document.querySelector('#list .ma-item__loc').textContent, qs: document.querySelectorAll('#list .ma-item__q').length }));
    check('nhiều dòng: tô mọi phần (dòng 8, không phải dòng 6), một số thứ tự, thẻ có nhãn từng phần', hl.lines === '3,4,8' && hl.badges === 1 && hl.loc === 'L3-4, L8' && hl.qs === 2, JSON.stringify(hl));
    await ml.hover('#list .ma-item');
    check('nhiều dòng: rê thẻ tô mọi phần', (await ml.$$eval('#v-src mark.is-hover', (ms) => ms.length)) >= 2);
    await ml.mouse.move(5, 5);
    // Dòng đã có nhận xét: bấm một lần mở nhận xét như cũ, bấm đúp vào chế độ chọn dòng.
    await gdbl(3);
    check('nhiều dòng: bấm đúp lề dòng đã nhận xét vẫn vào chế độ (hộp mới, không phải hộp sửa)', (await picks()) === '3' && (await ml.isVisible('#pop-head')) && !(await ml.isVisible('#pop-del')));
    await ml.keyboard.press('Escape');
    // Dòng rào code và dòng rất dài.
    await gdbl(13);
    check('nhiều dòng: dòng rất dài, trích dẫn mờ dần sau 2 dòng', await ml.$eval('#pop-q', (el) => el.classList.contains('is-long')));
    await ml.keyboard.press('Escape');
    await gdbl(10); await gclick(11);
    await ml.keyboard.type('Rào code'); await ml.keyboard.press('Enter');
    check('nhiều dòng: chọn dòng rào code', (await out(ml)).endsWith('\n2. L10-11 "```js const x = 1;" — Rào code'), JSON.stringify(await out(ml)));
    // Split: chữ của các dòng đã chọn tô ở Preview (ma-mirror); Split ↔ Source giữ dòng; Preview thoát.
    await ml.click('.ma-tab[data-view="split"]'); await ml.waitForTimeout(150);
    await gdbl(7); await gclick(9);
    const mir = () => ml.evaluate(() => { const h = CSS.highlights.get('ma-mirror'); return h ? [...h].map((r) => r.toString()).join('|') : ''; });
    check('Split: các dòng đã chọn tô ở Preview', (await mir()) === 'Gamma middle.|Delta end.', await mir());
    await ml.click('.ma-tab[data-view="src"]'); await ml.waitForTimeout(100);
    check('Split → Source: giữ dòng đã chọn, bỏ tô Preview', (await picks()) === '7,9' && (await mir()) === '');
    await ml.click('.ma-tab[data-view="split"]'); await ml.waitForTimeout(100);
    check('Source → Split: tô lại ở Preview', (await picks()) === '7,9' && (await mir()) === 'Gamma middle.|Delta end.', await mir());
    await ml.click('.ma-tab[data-view="view"]'); await ml.waitForTimeout(100);
    await ml.click('.ma-tab[data-view="split"]'); await ml.waitForTimeout(100);
    check('sang Preview thì thoát chế độ', (await picks()) === '' && (await mir()) === '');
    await gdbl(7);
    await ml.click('.ma-tab[data-view="edit"]'); await ml.click('.ma-tab[data-view="split"]'); await ml.waitForTimeout(100);
    check('sang Edit thì thoát chế độ', (await picks()) === '');
    await ml.dblclick('#v-md p');
    check('Preview không có chọn dòng', (await picks()) === '' && !(await ml.isVisible('#pop-head')));
    await ml.keyboard.press('Escape');
    // Tải lại: nhận xét nhiều phần còn nguyên.
    await ml.reload(); await ml.waitForFunction(() => window.marked && window.DOMPurify); await ml.waitForTimeout(200);
    check('tải lại: nhận xét nhiều phần còn, prompt như trước', (await out(ml)).startsWith(want) && (await ml.textContent('#list .ma-item__loc')) === 'L3-4, L8');
    await mctx2.close();
  }
  // ── end nhận xét nhiều dòng ──

  // ── đánh dấu đã đọc (MDAN-013) ──
  {
    const rctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' });
    await rctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(BASE).origin });
    const rv = await rctx.newPage(); watch(rv);
    await rv.goto(BASE); await rv.waitForFunction(() => window.marked && window.DOMPurify);
    const paras = Array.from({ length: 12 }, (_, i) => `Para A${i + 1} ` + 'chữ '.repeat(40).trim() + '.');
    const RV = ['# Review doc', '', 'Intro para one.', '', '## Part A', '', ...paras.flatMap((x) => [x, '']), '## Part B', '', '- item one', '- item two', '  - nested two', '- item three', '', 'Last para here.', ''].join('\n');
    const setText = (t) => rv.evaluate((t) => { const ta = document.getElementById('src-input'); ta.value = t; ta.dispatchEvent(new Event('input')); }, t);
    await rv.evaluate((t) => { const ta = document.getElementById('src-input'); ta.focus(); ta.dispatchEvent(new Event('paste')); ta.value = t; ta.dispatchEvent(new Event('input')); }, RV);
    await rv.waitForTimeout(200);
    await rv.click('.ma-tab[data-view="split"]'); await rv.waitForTimeout(250);
    // Đơn vị của chữ `n` ở Preview (khối hay mục), tìm làn cùng đỉnh; trạng thái của đơn vị ở hai khung.
    const unitOf = (n) => rv.evaluate((n) => {
      const el = [...document.querySelectorAll('#v-md > *, #v-md li')].filter((e) => e.textContent.includes(n)).pop();
      const t = el.getBoundingClientRect().top;
      const b = [...document.querySelectorAll('#wrap-md .ma-lane__b')].find((x) => Math.abs(x.getBoundingClientRect().top - t) < 2);
      return b ? +b.dataset.u : -1;
    }, n);
    const st = (u) => rv.$$eval(`.ma-lane__b[data-u="${u}"]`, (bs) => bs.map((b) => (b.className.match(/is-(done|changed|todo)/) || [])[1]).join(','));
    const nDone = () => rv.$$eval('#wrap-md .ma-lane__b.is-done', (bs) => bs.length);
    // Đỉnh của chữ `n` ở Preview, theo % chiều cao khung Preview (dải đọc là 25–50%).
    const bandPos = (n) => rv.evaluate((n) => {
      const w = document.getElementById('wrap-md'), wr = w.getBoundingClientRect();
      const el = [...document.querySelectorAll('#v-md > *')].find((e) => e.textContent.includes(n));
      return Math.round((el.getBoundingClientRect().top - wr.top) / wr.height * 100);
    }, n);
    // Đơn vị X sẽ đánh dấu (làn có .is-cur). Cuộn Preview như người dùng cho tới khi đơn vị của chữ `n` là đơn vị ấy.
    const cur = () => rv.evaluate(() => { const b = document.querySelector('#wrap-md .ma-lane__b.is-cur'); return b ? +b.dataset.u : -1; });
    const scrollCur = async (n) => {
      const u = await unitOf(n);
      const est = await rv.evaluate((n) => { const w = document.getElementById('wrap-md'); const el = [...document.querySelectorAll('#v-md > *')].find((e) => e.textContent.includes(n)); return el.getBoundingClientRect().top - w.getBoundingClientRect().top + w.scrollTop - w.clientHeight * 0.3; }, n);
      for (let y = Math.max(0, Math.round(est) - 300); y < est + 300; y += 8) {
        await rv.$eval('#wrap-md', (w, y) => { w.scrollTop = y; }, y); await rv.waitForTimeout(40);
        if ((await cur()) === u) return true;
      }
      return false;
    };
    const nl = await rv.$$eval('#wrap-src .ma-lane__b', (b) => b.length), nm = await rv.$$eval('#wrap-md .ma-lane__b', (b) => b.length);
    check('đã đọc: làn ở cả hai khung, mỗi mục danh sách một đơn vị (3 tiêu đề, 14 đoạn, 3 mục)', nl === 20 && nm === 20, nl + ' / ' + nm);
    const it2 = await unitOf('item two');
    const it2h = await rv.$eval(`#wrap-src .ma-lane__b[data-u="${it2}"]`, (b) => b.getBoundingClientRect().height);
    check('đã đọc: mục con thuộc mục cha (làn Source của "item two" cao hai dòng)', it2h > 30, String(it2h));
    check('đã đọc: text của #v-src vẫn đúng bằng nguồn', (await rv.$eval('#v-src', (e) => e.textContent)) === (await rv.inputValue('#src-input')));
    // X: đánh dấu đơn vị ở dải đọc, rồi cuộn đơn vị chưa đọc kế tiếp vào dải.
    const a3 = await unitOf('Para A3 ');
    check('dải đọc: làn của đơn vị X sẽ đánh dấu có .is-cur', await scrollCur('Para A3 '));
    await rv.keyboard.press('x'); await rv.waitForTimeout(700);
    check('X: đánh dấu đơn vị ở dải đọc, ở cả hai khung', (await st(a3)) === 'done,done' && (await nDone()) === 1, await st(a3));
    const p4 = await bandPos('Para A4 ');
    check('X: đơn vị chưa đọc kế tiếp vào dải đọc, X kế tiếp sẽ trúng nó', (await cur()) === a3 + 1 && p4 >= 10 && p4 <= 50, (await cur()) + ' ' + p4 + '%');
    await rv.keyboard.press('x'); await rv.waitForTimeout(700);
    check('X lần nữa: đánh dấu đơn vị vừa tới', (await st(await unitOf('Para A4 '))) === 'done,done');
    await rv.keyboard.press('k'); await rv.waitForTimeout(700);
    check('K: tới đơn vị chưa đọc trước đó (bỏ qua đơn vị đã đọc)', (await cur()) === a3 - 1, String(await cur()));
    await rv.keyboard.press('j'); await rv.waitForTimeout(700);
    check('J: tới đơn vị chưa đọc kế tiếp', (await cur()) === a3 + 2, String(await cur()));
    await rv.keyboard.press('x'); await rv.waitForTimeout(700);
    check('X: J rồi X đánh dấu đơn vị vừa tới', (await nDone()) === 3);
    await scrollCur('Para A3 ');
    const y3 = await rv.$eval('#wrap-md', (w) => w.scrollTop);
    await rv.keyboard.press('x'); await rv.waitForTimeout(400);
    check('X trên đơn vị đã đọc thì bỏ dấu, không cuộn đi', (await st(a3)) === 'todo,todo' && (await nDone()) === 2 && (await rv.$eval('#wrap-md', (w) => w.scrollTop)) === y3);
    // Shift+X: cả section Part A (tiêu đề + 12 đoạn).
    await rv.keyboard.press('Shift+X'); await rv.waitForTimeout(700);
    const hA = await unitOf('Part A');
    check('Shift+X: cả section đã đọc, nút section ✓', (await nDone()) === 13 && /sec-done/.test(await rv.$eval(`#wrap-md .ma-lane__b[data-u="${hA}"]`, (b) => b.className)), String(await nDone()));
    check('Shift+X: toast có Undo', /Marked 13 blocks/.test(await rv.textContent('#toast')) && await rv.isVisible('.ma-toast__btn'));
    await rv.click('.ma-toast__btn'); await rv.waitForTimeout(150);
    check('Undo: trả lại dấu trước đó', (await nDone()) === 2, String(await nDone()));
    // Nút section ở làn của tiêu đề: đánh dấu cả section.
    await rv.$eval(`#wrap-md .ma-lane__b[data-u="${hA}"]`, (b) => b.scrollIntoView({ block: 'center' })); await rv.waitForTimeout(150);
    await rv.click(`#wrap-md .ma-lane__b[data-u="${hA}"]`);
    check('bấm nút section (làn tiêu đề): cả section đã đọc', (await nDone()) === 13 && /sec-done/.test(await rv.$eval(`#wrap-src .ma-lane__b[data-u="${hA}"]`, (b) => b.className)), String(await nDone()));
    // Phím bị bỏ qua: đang gõ, có Ctrl, hộp thoại mở.
    const before = await nDone();
    await rv.keyboard.press('Control+x'); await rv.click('#btn-layout'); await rv.keyboard.press('x'); await rv.keyboard.press('Escape');
    await rv.click('#ptab-prompt'); await rv.click('#opts summary'); await rv.focus('#p-head'); await rv.keyboard.press('x');
    check('phím: bỏ qua khi có Ctrl, hộp thoại mở, đang gõ', (await nDone()) === before && (await rv.inputValue('#p-head')).endsWith('x'), (await nDone()) + ' / ' + before);
    await rv.fill('#p-head', ''); await rv.click('#opts summary');
    // Bấm làn ở Preview; Shift + bấm đánh dấu cả dải.
    const i1 = await unitOf('item one'), i3 = await unitOf('item three');
    await rv.$eval(`#wrap-md .ma-lane__b[data-u="${i1}"]`, (b) => b.scrollIntoView({ block: 'center' })); await rv.waitForTimeout(150);
    await rv.click(`#wrap-md .ma-lane__b[data-u="${i1}"]`);
    check('bấm làn: đánh dấu một đơn vị', (await st(i1)) === 'done,done');
    await rv.click(`#wrap-md .ma-lane__b[data-u="${i3}"]`, { modifiers: ['Shift'] });
    check('Shift + bấm làn: đánh dấu cả dải', (await st(i1 + 1)) === 'done,done' && (await st(i3)) === 'done,done');
    await rv.click(`#wrap-md .ma-lane__b[data-u="${i3}"]`);
    check('bấm làn đã đọc: bỏ dấu, không mở hộp nhận xét', (await st(i3)) === 'todo,todo' && !(await rv.isVisible('#pop')));
    // Bôi đen → hộp nhận xét có ✓ Reviewed, nói dòng nào, nới ra trọn khối.
    await dragSelect(rv, '#v-md', 'here');
    check('hộp nhận xét: nút ✓ Reviewed nói dòng nào', (await rv.isVisible('#pop-rv')) && (await rv.textContent('#pop-rv')) === '✓ ReviewedL' + (RV.split('\n').indexOf('Last para here.') + 1), await rv.textContent('#pop-rv'));
    await rv.click('#pop-rv');
    check('✓ Reviewed: đánh dấu trọn khối, đóng hộp', (await st(await unitOf('Last para'))) === 'done,done' && !(await rv.isVisible('#pop')));
    // Nhận xét không đánh dấu đã đọc.
    const nb = await nDone();
    await dragSelect(rv, '#v-md', 'Intro para');
    await rv.keyboard.type('Sửa'); await rv.keyboard.press('Enter'); await rv.waitForTimeout(150);
    check('thêm nhận xét không đánh dấu đã đọc', (await nDone()) === nb && (await st(await unitOf('Intro para'))) === 'todo,todo');
    // Chọn nhiều dòng ở lề số: hộp có ✓ Reviewed, bấm thì đánh dấu và thoát chế độ.
    const gut = (n) => rv.$eval(`#v-src .ma-ln:nth-child(${n})`, (el) => { el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left + 4, y: r.top + 8 }; });
    const lnI1 = RV.split('\n').indexOf('- item one') + 1;
    await rv.click(`#wrap-md .ma-lane__b[data-u="${i1}"]`); await rv.click(`#wrap-md .ma-lane__b[data-u="${i1 + 1}"]`);   // bỏ dấu hai mục đầu
    let g = await gut(lnI1); await rv.mouse.dblclick(g.x, g.y); await rv.waitForTimeout(150);
    g = await gut(lnI1 + 2); await rv.mouse.click(g.x, g.y); await rv.waitForTimeout(120);
    check('nhiều dòng: hộp có ✓ Reviewed với dòng của các khối', (await rv.isVisible('#pop-rv')) && (await rv.textContent('#pop-rv-l')) === 'L' + lnI1 + '–' + (lnI1 + 2), await rv.textContent('#pop-rv-l'));
    await rv.click('#pop-rv');
    check('nhiều dòng: ✓ Reviewed đánh dấu, thoát chế độ', (await st(i1)) === 'done,done' && (await st(i1 + 1)) === 'done,done' && !(await rv.$$('#v-src .is-pick')).length && !(await rv.isVisible('#pop')));
    // Làn ở Source không phải lề số: bấm làn không mở nhận xét / chế độ chọn dòng.
    const sl = await rv.$(`#wrap-src .ma-lane__b[data-u="${i3}"]`);
    await sl.scrollIntoViewIfNeeded(); await sl.dblclick(); await rv.waitForTimeout(150);
    check('làn Source: bấm đúp không vào chế độ chọn dòng', !(await rv.$$('#v-src .is-pick')).length && !(await rv.isVisible('#pop')) && (await st(i3)) === 'todo,todo');
    // Tab Review: tiến độ, dàn ý, nhảy tới section.
    await rv.click('#ptab-review');
    const outline = await rv.$$eval('#rv-secs .ma-rvs', (ls) => ls.map((l) => l.className.replace('ma-rvs ', '') + ':' + l.textContent));
    check('tab Review: dàn ý ba section, trạng thái, số nhận xét', outline.length === 3 && /is-todo:Review doc0\/2 · 1 comment/.test(outline[0]) && /is-done:Part A13\/13/.test(outline[1]) && /is-part:Part B/.test(outline[2]), JSON.stringify(outline));
    check('tab Review: % và thanh tiến độ', /^\d+%$/.test(await rv.textContent('#rv-pct')) && (await rv.textContent('#rv-pct')) === (await rv.getAttribute('#rv-bar', 'aria-valuenow')) + '%');
    await rv.$eval('#wrap-md', (w) => { w.scrollTop = 0; }); await rv.waitForTimeout(150);
    await rv.click('#rv-secs .ma-rvs:nth-child(3) .ma-rvs__main'); await rv.waitForTimeout(900);
    check('dàn ý: bấm section thì tới khối chưa đọc đầu tiên của nó', (await cur()) === hA + 13, (await cur()) + ' ' + (await bandPos('Part B')) + '%');
    // Dim reviewed: chỉ mờ, không gập.
    const hBefore = await rv.$eval('#v-md', (e) => e.scrollHeight);
    await rv.check('#rv-dim'); await rv.waitForTimeout(350);
    const op = await rv.evaluate(() => [...document.querySelectorAll('#v-md > *')].find((e) => e.textContent.includes('Para A7 ')).ownerDocument.defaultView.getComputedStyle([...document.querySelectorAll('#v-md > *')].find((e) => e.textContent.includes('Para A7 '))).opacity);
    check('Dim reviewed: khối đã đọc mờ, chiều cao không đổi', +op < 0.5 && (await rv.$eval('#v-md', (e) => e.scrollHeight)) === hBefore, op);
    await rv.uncheck('#rv-dim');
    // Prompt: tắt thì không có dòng đã đọc; bật thì có, tóm tắt Options có "reviewed".
    await openOpts(rv);
    check('prompt: mặc định không có dòng đã đọc', !/Đã đọc kỹ/.test(await out(rv)));
    await rv.check('#rv-prompt');
    check('prompt: bật thì có dòng đã đọc / chưa đọc', /\nĐã đọc kỹ: L\d+-\d+.*; chỗ nào không có nhận xét là ổn\. Chưa đọc: L/.test(await out(rv)) && /reviewed/.test(await rv.textContent('#opts-sum')), await out(rv));
    // Sửa chữ một khối đã đọc: changed (○), bấm xác nhận lại. Xoá một khối đã đọc: báo mất. Chuyển chỗ: vẫn ✓.
    const t1 = (await rv.inputValue('#src-input')).replace('Para A7 chữ', 'Para A7 đã sửa chữ');
    await rv.click('.ma-tab[data-view="edit"]'); await setText(t1); await rv.waitForTimeout(400); await rv.click('.ma-tab[data-view="split"]'); await rv.waitForTimeout(250);
    const a7 = await unitOf('Para A7 ');
    check('sửa chữ khối đã đọc: changed ở cả hai khung', (await st(a7)) === 'changed,changed', await st(a7));
    await rv.click('#ptab-review');
    const ol2 = (await rv.$$eval('#rv-secs .ma-rvs', (ls) => ls.map((l) => l.className.replace('ma-rvs ', '') + ':' + l.textContent))).join('|');
    check('tab Review: đếm khối đổi chữ', /1 edited since/.test(await rv.textContent('#rv-sub')) && /is-changed:Part A/.test(ol2), ol2);
    await rv.$eval(`#wrap-md .ma-lane__b[data-u="${a7}"]`, (b) => b.scrollIntoView({ block: 'center' })); await rv.waitForTimeout(100);
    await rv.click(`#wrap-md .ma-lane__b[data-u="${a7}"]`);
    check('bấm làn khối changed: xác nhận lại thành done', (await st(a7)) === 'done,done');
    const lastLine = 'Last para here.';
    const t2 = (await rv.inputValue('#src-input')).replace('\n\n' + lastLine, '').replace('Para A9 ', 'Gone soon ').split('\n').filter((l) => !l.startsWith('Gone soon')).join('\n');
    await rv.click('.ma-tab[data-view="edit"]'); await setText(lastLine + '\n\n' + t2); await rv.waitForTimeout(400);
    check('xoá khối đã đọc: báo mất (toast)', /edited away/.test(await rv.textContent('#toast')), await rv.textContent('#toast'));
    await rv.click('.ma-tab[data-view="split"]'); await rv.waitForTimeout(250);
    check('chuyển khối đã đọc lên đầu: vẫn ✓', (await st(await unitOf('Last para'))) === 'done,done');
    check('tab Review: hiện dấu mất, Dismiss bỏ', (await rv.isVisible('#rv-lost')) && /1 reviewed block is no longer/.test(await rv.textContent('#rv-lost')));
    await rv.click('#rv-lost-x');
    check('Dismiss: hết dấu mất', !(await rv.isVisible('#rv-lost')));
    // Tải lại: dấu còn; History hiện %.
    const lanesNow = () => rv.$$eval('#wrap-md .ma-lane__b', (bs) => bs.map((b) => b.className.replace(/ is-(flash|cur)/g, '')).join('|'));
    const snap = await lanesNow();
    await rv.waitForTimeout(400);
    await rv.reload(); await rv.waitForFunction(() => window.marked && window.DOMPurify); await rv.waitForTimeout(300);
    check('tải lại: dấu còn nguyên', (await lanesNow()) === snap);
    await rv.click('#btn-hist');
    check('History: hiện % đã đọc', /\d+% reviewed/.test(await rv.textContent('#hist-list')));
    await rv.keyboard.press('Escape');
    // Thanh dọc hiện %.
    await rv.click('#btn-rail');
    check('thanh dọc: hiện %', (await rv.isVisible('#rail-rv')) && /^\d+%$/.test(await rv.textContent('#rail-rv')));
    await rv.click('#rail-rv');
    check('thanh dọc: bấm % mở tab Review', (await rv.isVisible('#pane-review')) && (await rv.getAttribute('#ptab-review', 'aria-selected')) === 'true');
    // Điện thoại: viên thuốc ✓ Done · next ↓, thanh đáy có %, không tràn ngang.
    await rv.setViewportSize({ width: 390, height: 844 }); await rv.waitForTimeout(300);
    await rv.click('.ma-tab[data-view="view"]'); await rv.waitForTimeout(300);
    check('điện thoại: viên thuốc hiện, cao ≥ 44px', (await rv.isVisible('#rv-pill')) && (await rv.$eval('#rv-pill', (b) => b.getBoundingClientRect().height)) >= 44);
    check('điện thoại: thanh đáy có %, nút chép trọn trong khung', (await rv.isVisible('#dock-rv')) && /^✓ \d+%$/.test(await rv.textContent('#dock-rv')) && (await rv.$eval('#dock-copy', (b) => b.getBoundingClientRect().right)) <= 390);
    const intro = await unitOf('Intro para');
    const introY = await rv.evaluate(() => [...document.querySelectorAll('#v-md > *')].find((e) => e.textContent.includes('Intro para')).getBoundingClientRect().top + window.scrollY - innerHeight * 0.4);
    for (let y = Math.max(0, Math.round(introY)); y < introY + 400 && (await cur()) !== intro; y += 8) { await rv.evaluate((y) => window.scrollTo(0, y), y); await rv.waitForTimeout(40); }
    check('điện thoại: đơn vị ở dải đọc có .is-cur', (await cur()) === intro, String(await cur()));
    await rv.click('#rv-pill'); await rv.waitForTimeout(700);
    check('điện thoại: viên thuốc đánh dấu đơn vị ở dải đọc', (await st(intro)) === 'done', await st(intro));
    check('điện thoại: không tràn ngang', (await overflow(rv)) === 0, String(await overflow(rv)));
    await rctx.close();
  }
  // ── end đánh dấu đã đọc ──

  // ── hộp của các dòng đã chọn không đóng khi bấm ra ngoài (MDAN-014) ──
  {
    const sctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' });
    const st = await sctx.newPage(); watch(st);
    await st.goto(BASE); await st.waitForFunction(() => window.marked && window.DOMPurify);
    const SL = ['# Sticky', '', 'Alpha line one.', 'Beta line two.', '', 'Gamma middle.', 'Delta end.', ''].concat(Array.from({ length: 60 }, (_, i) => 'Filler line ' + (i + 1) + '.')).join('\n');
    await st.evaluate((t) => { const ta = document.getElementById('src-input'); ta.focus(); ta.dispatchEvent(new Event('paste')); ta.value = t; ta.dispatchEvent(new Event('input')); }, SL);
    await st.waitForTimeout(150);
    await st.click('.ma-tab[data-view="src"]'); await st.waitForTimeout(100);
    const gut = (n) => st.$eval(`#v-src .ma-ln:nth-child(${n})`, (el) => { el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left + 4, y: r.top + 8 }; });
    const gclick = async (n) => { const g = await gut(n); await st.mouse.click(g.x, g.y); await st.waitForTimeout(80); };
    const picks = () => st.$$eval('#v-src .ma-ln', (ls) => ls.map((l, i) => (l.classList.contains('is-pick') ? i + 1 : 0)).filter(Boolean).join());
    const g3 = await gut(3); await st.mouse.dblclick(g3.x, g3.y); await st.waitForTimeout(150);
    await gclick(4);
    await st.fill('#pop-text', 'giữ chữ');
    const txt = await st.$eval('#v-src .ma-ln:nth-child(7)', (el) => { const r = el.getBoundingClientRect(); return { x: r.right - 40, y: r.top + 8 }; });
    await st.mouse.click(txt.x, txt.y); await st.waitForTimeout(80);
    await st.click('#ptab-prompt'); await st.waitForTimeout(80);
    await st.click('#ptab-list'); await st.waitForTimeout(80);
    await st.mouse.click(4, 450); await st.waitForTimeout(80);
    await st.mouse.wheel(0, 300); await st.waitForTimeout(150);
    check('nhiều dòng: bấm chữ, panel, nền, cuộn — hộp vẫn hiện, giữ dòng và chữ đang gõ', (await st.isVisible('#pop')) && (await picks()) === '3,4' && (await st.inputValue('#pop-text')) === 'giữ chữ', JSON.stringify([await st.isVisible('#pop'), await picks()]));
    check('nhiều dòng: bấm tab panel khi hộp mở vẫn đổi tab', await st.$eval('#ptab-list', (el) => el.getAttribute('aria-selected') === 'true'));
    await st.click('#pop-cancel');
    check('nhiều dòng: Cancel chỉ ẩn hộp, giữ các dòng', !(await st.isVisible('#pop')) && (await picks()) === '3,4');
    await gclick(6);
    check('nhiều dòng: sau Cancel bấm số dòng thì hộp hiện lại với các dòng hiện có', (await st.isVisible('#pop')) && (await st.textContent('#pop-sum')) === '3 lines · L3-4, L6', await st.textContent('#pop-sum'));
    await st.mouse.click(4, 450); await st.waitForTimeout(80);
    check('nhiều dòng: hộp mở lại cũng không đóng khi bấm ngoài', await st.isVisible('#pop'));
    await st.keyboard.press('Escape');
    check('nhiều dòng: Esc ẩn hộp và bỏ các dòng', !(await st.isVisible('#pop')) && (await picks()) === '');
    await dragSelect(st, '#v-src', 'Delta end');
    check('bôi đen: hộp đoạn chữ mở', await st.isVisible('#pop'));
    await st.mouse.click(4, 450); await st.waitForTimeout(80);
    check('bôi đen: bấm ra ngoài vẫn đóng hộp đoạn chữ', !(await st.isVisible('#pop')));
    await sctx.close();
  }
  // ── end hộp dòng không đóng ──

  // ── hộp Settings giữa màn hình, nền sau mờ (MDAN-015) ──
  for (const [vw, vh, scheme] of [[1440, 900, 'light'], [1440, 900, 'dark'], [390, 844, 'light']]) {
    const gctx = await browser.newContext({ viewport: { width: vw, height: vh }, colorScheme: scheme, hasTouch: vw < 700, isMobile: vw < 700 });
    const gp = await gctx.newPage(); watch(gp);
    await gp.goto(BASE); await gp.waitForFunction(() => window.marked && window.DOMPurify);
    await gp.click('#btn-sample'); await gp.waitForTimeout(150);
    await gp.click('#btn-layout'); await gp.waitForTimeout(250);
    const g = await gp.$eval('#dlg-layout', (d) => { const r = d.getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: innerWidth, h: innerHeight, bd: getComputedStyle(d, '::backdrop').backgroundColor }; });
    const tag = `${vw}×${vh} ${scheme}`;
    check(`Settings ${tag}: hộp giữa màn hình`, Math.abs(g.cx - g.w / 2) <= 2 && Math.abs(g.cy - g.h / 2) <= 2, JSON.stringify(g));
    check(`Settings ${tag}: nền sau mờ`, /rgba\(\d+, \d+, \d+, 0\.[1-9]/.test(g.bd), g.bd);
    await gp.mouse.click(4, Math.round(vh / 2)); await gp.waitForTimeout(100);
    check(`Settings ${tag}: bấm nền mờ thì đóng`, !(await gp.$eval('#dlg-layout', (d) => d.open)));
    await gp.click('#btn-layout'); await gp.waitForTimeout(100); await gp.keyboard.press('Escape');
    check(`Settings ${tag}: Esc đóng`, !(await gp.$eval('#dlg-layout', (d) => d.open)));
    await gctx.close();
  }
  // ── end hộp Settings ──

  // ── hộp Shortcuts: mở từ Settings, hàng vẽ từ data/shortcuts.json (MDAN-015) ──
  {
    const kctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    const kp = await kctx.newPage(); watch(kp);
    await kp.goto(BASE); await kp.waitForFunction(() => window.marked && window.DOMPurify);
    await kp.click('#btn-sample'); await kp.waitForTimeout(150);
    await kp.click('#btn-layout'); await kp.click('#btn-keys');
    await kp.waitForSelector('#keys-list dl'); await kp.waitForTimeout(250);
    const want = await kp.evaluate(() => fetch('data/shortcuts.json').then((r) => r.json()).then((d) => d.groups.map((g) => g.title + ':' + g.rows.map((r) => r.keys.map((c) => c.join('+')).join('/') + '=' + r.action).join('|')).join('#')));
    const got = await kp.$$eval('#keys-list .ma-keys', (ss) => ss.map((s) => s.querySelector('.ma-keys__h').textContent + ':' + [...s.querySelectorAll('dt')].map((dt) => [...dt.querySelectorAll('.ma-keys__c')].map((c) => [...c.querySelectorAll('kbd')].map((k) => k.textContent).join('+')).join('/') + '=' + dt.nextElementSibling.textContent).join('|')).join('#'));
    check('Shortcuts: nút trong Settings mở hộp, mọi hàng của data/shortcuts.json hiện đúng', got === want && got.length > 0, got.slice(0, 120));
    const k = await kp.$eval('#dlg-keys', (d) => { const r = d.getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, bd: getComputedStyle(d, '::backdrop').backgroundColor, kbd: d.querySelectorAll('kbd.ma-key').length }; });
    check('Shortcuts: hộp giữa màn hình, nền sau mờ, phím là chip kbd', Math.abs(k.cx - 720) <= 2 && Math.abs(k.cy - 450) <= 2 && /rgba\(\d+, \d+, \d+, 0\.[1-9]/.test(k.bd) && k.kbd > 10, JSON.stringify(k));
    await kp.keyboard.press('Escape');
    check('Shortcuts: Esc đóng hộp Shortcuts, Settings còn mở', !(await kp.$eval('#dlg-keys', (d) => d.open)) && (await kp.$eval('#dlg-layout', (d) => d.open)));
    await kp.keyboard.press('Escape');
    await kp.keyboard.press('Shift+Slash'); await kp.waitForTimeout(100);
    check('Shortcuts: phím ? mở hộp', await kp.$eval('#dlg-keys', (d) => d.open));
    await kp.keyboard.press('Escape');
    await kp.click('.ma-tab[data-view="edit"]'); await kp.focus('#src-input');
    const before = await kp.inputValue('#src-input');
    await kp.keyboard.press('End'); await kp.keyboard.type('?');
    check('Shortcuts: gõ ? trong ô nhập không mở hộp', !(await kp.$eval('#dlg-keys', (d) => d.open)) && (await kp.inputValue('#src-input')).length === before.length + 1);
    await kctx.close();
  }
  // ── end hộp Shortcuts ──

  // ── đã đọc: J / K / X tiến lên được cả khi trang không cuộn được, cả khi bấm nhanh lúc đang cuộn mượt ──
  {
    const actx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' });
    const ap = await actx.newPage(); watch(ap);
    await ap.goto(BASE); await ap.waitForFunction(() => window.marked && window.DOMPurify);
    const put = (t) => ap.evaluate((t) => { const ta = document.getElementById('src-input'); ta.focus(); ta.dispatchEvent(new Event('paste')); ta.value = t; ta.dispatchEvent(new Event('input')); }, t);
    const lanes = (w) => ap.$$eval(`#wrap-${w} .ma-lane__b`, (bs) => bs.map((b) => (b.classList.contains('is-cur') ? '*' : '') + b.className.match(/is-(done|todo|changed)/)[1][0]).join(''));
    await put(['# Short', '', 'One para.', '', 'Two para.', '', 'Three para.', ''].join('\n')); await ap.waitForTimeout(250);
    for (const v of ['src', 'split']) {
      await ap.click(`.ma-tab[data-view="${v}"]`); await ap.waitForTimeout(250); await ap.mouse.click(3, 880);
      const w = v === 'src' ? 'src' : 'md', c0 = await lanes(w);
      await ap.keyboard.press('j'); await ap.waitForTimeout(150);
      const c1 = await lanes(w);
      await ap.keyboard.press('j'); await ap.waitForTimeout(150);
      const c2 = await lanes(w);
      check(`đã đọc ${v}: văn bản ngắn (không cuộn được), J vẫn tới đơn vị kế tiếp`, c0 !== c1 && c1 !== c2 && c0 !== c2, [c0, c1, c2].join(' → '));
      for (let i = 0; i < 3; i++) { await ap.keyboard.press('x'); await ap.waitForTimeout(150); }
      const done = (await lanes(w)).replace(/\*/g, '');
      check(`đã đọc ${v}: văn bản ngắn, X ba lần đánh dấu ba đơn vị (không bật / tắt một đơn vị)`, done.split('d').length - 1 === 3, await lanes(w));
      await ap.$eval('#rv-clear', (b) => b.click()); await ap.waitForTimeout(150);
    }
    const long = [];
    for (let s = 0; s < 10; s++) { long.push('## S' + s, ''); for (let k = 0; k < 6; k++) long.push('Para ' + s + '.' + k + ' ' + 'word '.repeat(30), ''); }
    await ap.click('.ma-tab[data-view="edit"]'); await put(long.join('\n')); await ap.waitForTimeout(250);
    await ap.click('.ma-tab[data-view="view"]'); await ap.waitForTimeout(250); await ap.mouse.click(3, 880);
    for (let i = 0; i < 6; i++) { await ap.keyboard.press('x'); await ap.waitForTimeout(60); }
    await ap.waitForTimeout(1200);
    check('đã đọc: X bấm nhanh lúc trang đang cuộn mượt đánh dấu sáu đơn vị đầu liền nhau', (await lanes('md')).replace(/\*/g, '').startsWith('ddddddt'), await lanes('md'));
    // Văn bản ~5.000 dòng ở Split: X (đã có dấu) không dựng lại làn, không tính lại kiểu mọi dòng.
    const big = [];
    for (let s = 0; s < 160; s++) {
      big.push('## Section ' + s, '');
      for (let k = 0; k < 8; k++) big.push('Paragraph ' + s + '.' + k + ' some words here to read and review carefully.', '');
      big.push('- item a ' + s, '- item b ' + s, '  - nested', '- item c ' + s, '', '```js', 'const x = ' + s + ';', '```', '', '| a | b |', '|---|---|', '| ' + s + ' | y |', '');
    }
    await ap.click('.ma-tab[data-view="edit"]'); await put(big.join('\n')); await ap.waitForTimeout(800);
    await ap.click('.ma-tab[data-view="split"]'); await ap.waitForTimeout(800); await ap.mouse.click(3, 880);
    const ms = await ap.evaluate(async () => {
      const out = [];
      for (let i = 0; i < 5; i++) {
        const t0 = performance.now();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true }));
        out.push(performance.now() - t0);
        await new Promise((r) => setTimeout(r, 250));
      }
      return out.slice(1).sort((a, b) => a - b).map(Math.round);   // lần đầu bật html.ma-reviewing: vẽ lại cả làn
    });
    check('đã đọc: văn bản 5.000 dòng, X ở Split dưới 100ms (trung vị)', ms[1] < 100 && (await ap.$$eval('#wrap-md .ma-lane__b.is-done', (b) => b.length)) === 5, JSON.stringify(ms));
    // Clear all marks, chuyển phiên, rồi Undo: dấu về phiên của nó (như Undo của X), không mất lặng lẽ.
    await ap.click('#btn-new'); await put('Doc R\n\nPara one.\n\nPara two.\n'); await ap.waitForTimeout(300);
    await ap.click('.ma-tab[data-view="split"]'); await ap.waitForTimeout(250); await ap.mouse.click(3, 880);
    await ap.keyboard.press('x'); await ap.waitForTimeout(150);
    await ap.$eval('#rv-clear', (b) => b.click()); await ap.waitForTimeout(100);
    await ap.click('#btn-hist'); await ap.click('#hist-list .ma-row:has-text("Section 0") .ma-row__main'); await ap.waitForTimeout(300);
    await ap.click('.ma-toast__btn'); await ap.waitForTimeout(300);
    await ap.click('#btn-hist'); await ap.click('#hist-list .ma-row:has-text("Doc R") .ma-row__main'); await ap.waitForTimeout(300);
    await ap.click('.ma-tab[data-view="split"]'); await ap.waitForTimeout(250);
    check('đã đọc: Clear all marks rồi chuyển phiên, Undo trả dấu về phiên của nó', (await ap.$$eval('#wrap-md .ma-lane__b.is-done', (b) => b.length)) === 1, await lanes('md'));
    // Vừa bấm ô đánh dấu (Dim reviewed): focus ở checkbox, không phải đang gõ; X và ? vẫn chạy.
    await ap.click('#ptab-review'); await ap.click('#rv-dim'); await ap.keyboard.press('x'); await ap.waitForTimeout(150);
    const nx = await ap.$$eval('#wrap-md .ma-lane__b.is-done', (b) => b.length);
    await ap.keyboard.press('Shift+Slash'); await ap.waitForTimeout(100);
    check('đã đọc: focus ở checkbox thì X (bỏ dấu đơn vị hiện tại) và ? vẫn chạy', nx === 0 && (await ap.$eval('#dlg-keys', (d) => d.open)), JSON.stringify([nx, await lanes('md')]));
    await ap.keyboard.press('Escape');
    await actx.close();
  }
  // ── end J / K / X tiến lên ──

  // ── dải tiến độ và gợi ý theo thời gian đọc (MDAN-016) ──
  {
    const mctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', reducedMotion: 'reduce' });
    const mp = await mctx.newPage(); watch(mp);
    await mp.clock.install();   // đồng hồ giả: runFor() đẩy thời gian đọc mà không phải chờ thật
    await mp.goto(BASE); await mp.waitForFunction(() => window.marked && window.DOMPurify);
    const paras = Array.from({ length: 24 }, (_, i) => `Para P${i + 1} ` + 'chữ đọc thử '.repeat(8 + (i % 3) * 4).trim() + '.');
    const MD = ['# Dwell doc', '', ...paras.flatMap((x) => [x, '']), '## Tail', '', 'Last para here.', ''].join('\n');
    const tick = async (ms = 120) => { await mp.waitForTimeout(60); await mp.clock.runFor(ms); };
    await mp.evaluate((t) => { const ta = document.getElementById('src-input'); ta.focus(); ta.dispatchEvent(new Event('paste')); ta.value = t; ta.dispatchEvent(new Event('input')); }, MD);
    await tick(400);
    await mp.click('.ma-tab[data-view="split"]'); await tick(300);
    await mp.click('#ptab-review'); await tick();
    const laneOf = (n) => mp.evaluate((n) => {
      const el = [...document.querySelectorAll('#v-md > *')].find((e) => e.textContent.startsWith(n));
      const t = el.getBoundingClientRect().top;
      const b = [...document.querySelectorAll('#wrap-md .ma-lane__b')].find((x) => Math.abs(x.getBoundingClientRect().top - t) < 2);
      return b ? +b.dataset.u : -1;
    }, n);
    const sugs = () => mp.$$eval('#wrap-md .ma-lane__b.is-sug', (bs) => bs.map((b) => +b.dataset.u));
    const nDone = () => mp.$$eval('#wrap-md .ma-lane__b.is-done', (bs) => bs.length);
    // Đặt đỉnh đoạn `n` ở `frac` chiều cao khung Preview (cuộn do script, không phải người dùng).
    const putAt = (n, frac) => mp.evaluate(([n, frac]) => {
      const w = document.getElementById('wrap-md'), el = [...document.querySelectorAll('#v-md > *')].find((e) => e.textContent.startsWith(n));
      w.scrollTop = el.getBoundingClientRect().top - w.getBoundingClientRect().top + w.scrollTop - w.clientHeight * frac;
    }, [n, frac]);
    const md = await mp.$eval('#wrap-md', (w) => { const r = w.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await mp.mouse.move(md.x, md.y);
    const wheel = async (dy, steps = 1) => { await mp.mouse.move(md.x, md.y); for (let k = 0; k < steps; k++) { await mp.mouse.wheel(0, dy); await tick(80); } };

    // Dải: cạnh phải mỗi khung ở Split, trái thanh cuộn, không đè chữ / làn, có hộp khung nhìn.
    const strip = (w) => mp.evaluate((w) => {
      const m = document.querySelector(`.ma-mm[data-w="${w}"]`), p = document.getElementById(w === 'src' ? 'wrap-src' : 'wrap-md');
      const r = m.getBoundingClientRect(), pr = p.getBoundingClientRect(), root = document.getElementById(w === 'src' ? 'v-src' : 'v-md').getBoundingClientRect();
      const lanes = [...p.querySelectorAll('.ma-lane__b')].map((b) => b.getBoundingClientRect().right);
      return { shown: !m.hidden && r.width > 0, left: r.left, right: r.right, top: r.top, bottom: r.bottom, h: r.height, sbLeft: pr.left + p.clientLeft + p.clientWidth, paneTop: pr.top, paneBottom: pr.bottom,
        textRight: root.right, laneRight: Math.max(...lanes), segs: [...m.querySelectorAll('.ma-mm__s')].map((s) => s.className.replace('ma-mm__s is-', '') + '@' + Math.round(parseFloat(s.style.top))),
        view: !!m.querySelector('.ma-mm__view').offsetHeight, dots: m.querySelectorAll('.ma-mm__dot').length };
    }, w);
    for (const w of ['src', 'md']) {
      const s = await strip(w);
      check(`dải tiến độ (${w}): hiện ở Split, sát mép phải, trái thanh cuộn, không đè chữ hay làn`, s.shown && s.right <= s.sbLeft + 0.5 && s.sbLeft - s.right <= 8 && s.left >= s.textRight - 1 && s.left > s.laneRight && s.top >= s.paneTop && s.bottom <= s.paneBottom, JSON.stringify(s));
      check(`dải tiến độ (${w}): chưa đọc gì thì mọi đoạn nhạt, có hộp khung nhìn`, s.segs.length > 0 && s.segs.every((x) => x.startsWith('todo')) && s.view, s.segs.slice(0, 4).join(' '));
      const geo = await mp.evaluate((w) => {
        const m = document.querySelector(`.ma-mm[data-w="${w}"]`), c = m.querySelector('.ma-mm__col').getBoundingClientRect(), l = m.querySelector('.ma-mm__in').getBoundingClientRect();
        const d = document.getElementById('doc'), dr = d.getBoundingClientRect(), rad = parseFloat(getComputedStyle(d).borderBottomRightRadius);
        return { col: [c.top, c.bottom, c.width], lane: [l.top, l.bottom, l.width], gap: l.left - c.right, toCorner: dr.bottom - l.bottom, rad };
      }, w);
      check(`dải tiến độ (${w}): thanh cuộn và dải cùng cao, cùng rộng 6px, cách nhau ≥ 4px, đáy cách góc bo của khung ≥ bán kính`,
        geo.col[0] === geo.lane[0] && geo.col[1] === geo.lane[1] && geo.col[2] === 6 && geo.lane[2] === 6 && geo.gap >= 4 && geo.toCorner >= geo.rad, JSON.stringify(geo));
    }
    // Trạng thái đoạn: đã đọc đặc, đổi chữ rỗng, chấm ở nhận xét; vị trí theo đơn vị trong khung.
    const u3 = await laneOf('Para P3 '), u10 = await laneOf('Para P10 ');
    for (const u of [u3, u10]) {
      await mp.$eval(`#wrap-md .ma-lane__b[data-u="${u}"]`, (b) => b.scrollIntoView({ block: 'center' })); await tick();
      await mp.click(`#wrap-md .ma-lane__b[data-u="${u}"]`); await tick();
    }
    const want10 = await mp.evaluate((u) => {
      const w = document.getElementById('wrap-md'), b = document.querySelector(`#wrap-md .ma-lane__b[data-u="${u}"]`), m = document.querySelector('.ma-mm[data-w="md"]');
      return Math.round((b.getBoundingClientRect().top - w.getBoundingClientRect().top + w.scrollTop) / w.scrollHeight * m.getBoundingClientRect().height);
    }, u10);
    let s = await strip('md');
    check('dải tiến độ: đoạn đã đọc đặc, đúng chỗ của đơn vị trong khung (±3px)', s.segs.filter((x) => x.startsWith('done')).length === 2 && s.segs.some((x) => x.startsWith('done@') && Math.abs(+x.split('@')[1] - want10) <= 3), want10 + ' ' + s.segs.join(' '));
    await mp.evaluate(() => { const ta = document.getElementById('src-input'); ta.value = ta.value.replace('Para P3 chữ', 'Para P3 sửa chữ'); ta.dispatchEvent(new Event('input')); });
    await tick(500);
    await mp.evaluate(() => {
      const el = [...document.querySelectorAll('#v-md > p')].find((e) => e.textContent.startsWith('Para P12 ')); el.scrollIntoView({ block: 'center' });
    }); await tick();
    await dragSelect(mp, '#v-md', 'Para P12 chữ'); await tick();
    await mp.fill('#pop-text', 'Xem lại'); await mp.keyboard.press('Enter'); await tick(300);
    s = await strip('md');
    check('dải tiến độ: đơn vị đổi chữ là đoạn rỗng (○), có chấm nhận xét ở cả hai khung', s.segs.some((x) => x.startsWith('changed')) && s.dots === 1 && (await strip('src')).dots === 1, s.segs.join(' ') + ' dots ' + s.dots);
    // Bấm dải: cuộn khung tới đó, không bôi đen, không mở hộp nhận xét.
    await mp.evaluate(() => getSelection().removeAllRanges());
    const before = await mp.$eval('#wrap-md', (w) => w.scrollTop);
    await mp.mouse.click((s.left + s.right) / 2, s.top + s.h * 0.8); await tick(200);
    const after = await mp.evaluate(() => { const w = document.getElementById('wrap-md'); return { top: w.scrollTop, want: Math.max(0, Math.min(w.scrollHeight - w.clientHeight, 0.8 * w.scrollHeight - w.clientHeight / 2)), sel: String(getSelection()), pop: !document.getElementById('pop').hidden }; });
    check('dải tiến độ: bấm thì cuộn khung tới chỗ ấy (giữa khung nhìn), không bôi đen, không mở hộp', after.top !== before && Math.abs(after.top - after.want) <= 4 && !after.sel && !after.pop, JSON.stringify(after));
    const vb = await mp.$eval('.ma-mm[data-w="md"] .ma-mm__view', (v) => Math.round(parseFloat(v.style.top)));
    await mp.mouse.move((s.left + s.right) / 2, s.top + s.h * 0.8); await mp.mouse.down(); await mp.mouse.move((s.left + s.right) / 2, s.top + s.h * 0.3, { steps: 4 }); await mp.mouse.up(); await tick(200);
    check('dải tiến độ: kéo thì cuộn theo, hộp khung nhìn dời theo', (await mp.$eval('.ma-mm[data-w="md"] .ma-mm__view', (v) => Math.round(parseFloat(v.style.top)))) < vb - 50);
    check('dải tiến độ: Split 1440 không tràn ngang', (await overflow(mp)) === 0, String(await overflow(mp)));
    {   // Bấm lặp lại một chỗ, thu phóng 150% (toạ độ lẻ điểm ảnh): cuộn đứng yên ở Split, Preview, Source.
      const zc = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 }), zp = await zc.newPage(); watch(zp);
      await zp.goto(BASE); await zp.waitForFunction(() => window.marked && window.DOMPurify);
      await zp.evaluate((t) => { const ta = document.getElementById('src-input'); ta.focus(); ta.dispatchEvent(new Event('paste')); ta.value = t; ta.dispatchEvent(new Event('input')); },
        Array.from({ length: 60 }, (_, i) => `## Section ${i}\n\nParagraph ${i} with some words to read and review here.\n`).join('\n'));
      await zp.waitForTimeout(400);
      const drift = {};
      for (const mode of ['split', 'view', 'src']) {
        await zp.evaluate((m) => document.querySelector(`.ma-tab[data-view="${m}"]`).click(), mode); await zp.waitForTimeout(250);
        const w = mode === 'src' ? 'src' : 'md', pos = () => zp.evaluate((w) => document.querySelector('.ma-views').dataset.mode === 'split' ? document.getElementById(w === 'src' ? 'wrap-src' : 'wrap-md').scrollTop : scrollY, w);
        const r = await zp.$eval(`.ma-mm[data-w="${w}"]`, (m) => m.getBoundingClientRect().toJSON()), seq = [];
        for (let i = 0; i < 8; i++) { await zp.mouse.click(r.left + r.width / 2, r.top + r.height * 0.75); await zp.waitForTimeout(60); seq.push(Math.round(await pos())); }
        drift[mode] = seq.slice(2);   // cú đầu trên rãnh cuộn tới; ở chế độ cuộn cửa sổ đỉnh dải còn trượt một nhịp
      }
      check('dải tiến độ: bấm lặp lại một chỗ (thu phóng 150%) thì không trôi', Object.values(drift).every((q) => q.every((v) => v === q[0])), JSON.stringify(drift));
      await zc.close();
    }

    // Gợi ý: đọc P6 ở dải (đồng hồ giả 15 s), rồi tự cuộn qua thì hiện ✓ viền đứt; không tự đánh dấu.
    await mp.mouse.move(md.x, md.y);
    const u6 = await laneOf('Para P6 ');
    const done0 = await nDone();
    await putAt('Para P6 ', 0.32); await tick(600); await wheel(4);
    await mp.clock.runFor(15000);
    await wheel(120, 5); await tick(600);
    let sg = await sugs();
    await mp.click('#ptab-review'); await tick();
    check('gợi ý: đơn vị đọc đủ lâu rồi cuộn qua có ✓ viền đứt, không thành dấu', sg.includes(u6) && (await nDone()) === done0 && (await mp.$$eval(`.ma-lane__b[data-u="${u6}"].is-sug`, (b) => b.length)) === 2, JSON.stringify(sg) + ' u6=' + u6);
    check('gợi ý: tab Review có "Accept N suggested"', (await mp.isVisible('#rv-sug')) && (await mp.textContent('#rv-sug-ok')) === `Accept ${sg.length} suggested`, await mp.textContent('#rv-sug-ok'));
    check('gợi ý: ✓ viền đứt khác đơn vị hiện tại (.is-cur)', await mp.$eval(`#wrap-md .ma-lane__b[data-u="${u6}"]`, (b) => getComputedStyle(b, '::after').backgroundColor !== 'rgb(255, 255, 255)' && getComputedStyle(b, '::after').borderStyle === 'dashed'));
    check('gợi ý: dải tiến độ có đoạn được gợi ý', (await strip('md')).segs.some((x) => x.startsWith('sug')));
    await mp.click('#rv-sug-ok'); await tick();
    check('gợi ý: Accept đánh dấu mọi đơn vị được gợi ý', (await nDone()) === done0 + sg.length && !(await sugs()).length && !(await mp.isVisible('#rv-sug')), String(await nDone()));
    await mp.click('.ma-toast__btn'); await tick();
    check('gợi ý: Undo trả dấu và ✓ viền đứt', (await nDone()) === done0 && (await sugs()).length === sg.length);
    await mp.$eval(`#wrap-md .ma-lane__b[data-u="${u6}"]`, (b) => b.scrollIntoView({ block: 'center' })); await tick();
    await mp.click(`#wrap-md .ma-lane__b[data-u="${u6}"]`); await tick();
    check('gợi ý: bấm làn của nó thì chấp nhận (đánh dấu), ✓ viền đứt mất', (await nDone()) === done0 + 1 && !(await sugs()).includes(u6));
    await mp.click('#rv-sug-x'); await tick();
    check('gợi ý: Dismiss bỏ các gợi ý còn lại', !(await sugs()).length && !(await mp.isVisible('#rv-sug')));

    // Cuộn do script (không có thao tác người dùng): không gợi ý.
    const u15 = await laneOf('Para P15 ');
    await putAt('Para P15 ', 0.32); await tick(600); await wheel(4);
    await mp.clock.runFor(15000);
    await mp.$eval('#wrap-md', (w) => { w.scrollTop += 700; }); await tick(600);
    check('gợi ý: cuộn do trang đặt (không bánh xe / phím / chạm) không gợi ý', !(await sugs()).includes(u15), JSON.stringify(await sugs()));
    // J ngay sau khi lăn bánh xe: đơn vị hiện tại rời dải vì J (cuộn do trang) nên không được gợi ý.
    const curU = () => mp.evaluate(() => { const b = document.querySelector('#wrap-md .ma-lane__b.is-cur'); return b ? +b.dataset.u : -1; });
    await putAt('Para P18 ', 0.3); await tick(600); await wheel(4);
    await mp.clock.runFor(15000);
    await wheel(2);
    const cj = await curU();
    await mp.keyboard.press('j'); await tick(700);
    const jb = await mp.evaluate((u) => { const w = document.getElementById('wrap-md'), b = document.querySelector(`#wrap-md .ma-lane__b[data-u="${u}"]`); return b.getBoundingClientRect().bottom - w.getBoundingClientRect().top < w.clientHeight * 0.25; }, cj);
    check('gợi ý: J đưa đơn vị ra khỏi dải nhưng không gợi ý nó', cj >= 0 && jb && (await curU()) !== cj && !(await sugs()).includes(cj), JSON.stringify({ cj, jb, s: await sugs() }));
    // Tab ẩn: thời gian không đếm.
    const u11 = await laneOf('Para P11 ');   // giữa văn bản: dải đọc không trượt về mép
    await putAt('Para P11 ', 0.32); await tick(600); await wheel(4);
    await mp.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    await mp.clock.runFor(15000);
    await mp.evaluate(() => { delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); });
    await wheel(120, 5); await tick(600);
    check('gợi ý: thời gian lúc tab ẩn không tính', (await mp.evaluate(() => document.visibilityState)) === 'visible' && !(await sugs()).includes(u11), JSON.stringify(await sugs()));
    // Chữ của đơn vị đổi thì gợi ý của nó mất; tắt "Suggest from reading time" thì không gợi ý.
    const u8 = await laneOf('Para P8 ');
    await putAt('Para P8 ', 0.32); await tick(600); await wheel(4);
    await mp.clock.runFor(15000);
    await wheel(120, 5); await tick(600);
    const had8 = (await sugs()).includes(u8);
    await mp.evaluate(() => { const ta = document.getElementById('src-input'); ta.value = ta.value.replace('Para P8 chữ', 'Para P8 đổi chữ'); ta.dispatchEvent(new Event('input')); });
    await tick(500);
    check('gợi ý: chữ của đơn vị đổi thì gợi ý của nó mất', had8 && !(await sugs()).includes(await laneOf('Para P8 ')), String(had8));
    await mp.click('#rv-suggest'); await tick();
    await putAt('Para P9 ', 0.32); await tick(600); await wheel(4);
    await mp.clock.runFor(15000);
    await wheel(120, 5); await tick(600);
    check('gợi ý: tắt "Suggest from reading time" thì không gợi ý, tuỳ chọn được nhớ', !(await sugs()).length && (await mp.evaluate(() => JSON.parse(localStorage.getItem('md-annotate:prefs:v1')).rvSuggest)) === false);
    await mp.click('#rv-suggest'); await tick();

    // Preview một mình (cuộn cửa sổ): dải dính trong khung nhìn, dưới thanh trên; bấm cuộn cửa sổ.
    await mp.click('.ma-tab[data-view="view"]'); await tick(300);
    await mp.evaluate(() => window.scrollTo(0, 600)); await tick(300);
    const pv = await mp.evaluate(() => {
      const m = document.querySelector('.ma-mm[data-w="md"]'), r = m.getBoundingClientRect(), p = document.getElementById('wrap-md').getBoundingClientRect(), bar = document.querySelector('.ma-bar').getBoundingClientRect();
      return { shown: !m.hidden, src: !document.querySelector('.ma-mm[data-w="src"]').hidden, top: r.top, bottom: r.bottom, right: r.right, pr: p.right, bar: bar.bottom, ih: innerHeight, textRight: document.getElementById('v-md').getBoundingClientRect().right, left: r.left };
    });
    check('Preview: dải trong khung nhìn, dưới thanh trên, mép phải khung, không đè chữ', pv.shown && !pv.src && pv.top >= pv.bar && pv.bottom <= pv.ih && pv.right <= pv.pr && pv.left >= pv.textRight - 1, JSON.stringify(pv));
    await mp.mouse.click((pv.left + pv.right) / 2, pv.top + (pv.bottom - pv.top) * 0.9); await tick(200);
    check('Preview: bấm dải cuộn cửa sổ', (await mp.evaluate(() => window.scrollY)) > 1200, String(await mp.evaluate(() => window.scrollY)));
    check('Preview 1440: không tràn ngang', (await overflow(mp)) === 0);
    // Điện thoại: dải ẩn (lề hẹp; thanh đáy có ✓ N%), không tràn ngang.
    await mp.setViewportSize({ width: 390, height: 844 }); await tick(400);
    check('390px: dải ẩn, không tràn ngang', (await mp.$$eval('.ma-mm', (ms) => ms.every((m) => m.hidden || !m.getBoundingClientRect().width))) && (await overflow(mp)) === 0, String(await overflow(mp)));
    await mctx.close();
  }
  // ── end dải tiến độ và gợi ý ──

  check('không lỗi console', !errors.length, errors.join(' | '));
  await browser.close();
  console.log(fails ? `md-annotate smoke: ${fails} LỖI` : 'md-annotate smoke: OK');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
