/* Bấm thật trong Chromium: dán văn bản, bôi đen ở hai chế độ xem, nhận xét bằng gõ và bằng gợi ý, prompt,
 * neo lại khi sửa văn bản, tải lại trang, lịch sử phiên, theme, khổ điện thoại, cây file của phiên (docked / tấm trượt),
 * thanh trên ở điện thoại (menu More).
 * Chạy: python3 -m http.server 8347 (ở gốc repo), rồi
 *       node md-annotate/tools/smoke.cjs http://127.0.0.1:8347/md-annotate/
 * Thiếu playwright thì thoát mã 2 (BỎ QUA), như tools/smoke-index.js. */
'use strict';
const BASE = process.argv[2] || 'http://127.0.0.1:8347/md-annotate/';

let chromium, pw;
for (const name of ['playwright-core', 'playwright']) {
  try { pw = require(name); ({ chromium } = pw); break; } catch (e) { /* thử tên tiếp theo */ }
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
/* Nền #rrggbb phủ lần lượt các lớp 'rgba(r, g, b, a)' → #rrggbb (đáp án tính độc lập cho theme-color khi có lớp mờ). */
const mixHex = (bg, ...layers) => {
  let c = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16));
  for (const l of layers) { const v = l.match(/[\d.]+/g).map(Number); c = c.map((x, i) => v[i] * v[3] + x * (1 - v[3])); }
  return '#' + c.map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');
};
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
  /* Cây hiện sẵn ở mọi khổ > 720px (MDAN-061) làm hẹp #doc. Phần không thử cây: tắt cây sẵn (prefs.tree = false khi phiên chưa
     chọn), để số đo bề rộng như cũ. Phần thử cây mở context bằng treeContext (không vá). */
  const treeContext = browser.newContext.bind(browser);
  browser.newContext = async (o) => {
    const c = await treeContext(o);
    await c.addInitScript(() => {
      const get = Storage.prototype.getItem;
      Storage.prototype.getItem = function (k) {
        const v = get.call(this, k);
        if (k !== 'md-annotate:prefs:v1') return v;
        try { const x = JSON.parse(v || '{}'); if (!('tree' in x)) x.tree = false; return JSON.stringify(x); } catch (e) { return v; }
      };
    });
    return c;
  };
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
  const popSide = () => page.evaluate(() => { const p = document.getElementById('pop').getBoundingClientRect(), m = document.getElementById('wrap-md').getBoundingClientRect(); return { pop: Math.round(p.left), md: Math.round(m.left) }; });
  await dragSelect(page, '#v-src', 'Mục một của danh sách');
  const sideS = await popSide();
  await page.keyboard.press('Escape');
  await dragSelect(page, '#v-md', 'Mục một của danh sách\nMục hai');
  const pend = await page.evaluate(() => CSS.highlights.get('ma-pending').size);
  check('đoạn đang chọn được tô ở cả hai bên', pend === 2, String(pend));
  const sideM = await popSide();
  check('song song: hộp nhận xét ở khung vừa bôi đen', sideS.pop < sideS.md && sideM.pop >= sideM.md, JSON.stringify({ src: sideS, md: sideM }));
  await page.keyboard.type('Gộp hai mục');
  await page.keyboard.press('Enter');
  check('chọn ở bản dựng qua hai dòng: L9-10 theo nguồn', /\. L9-10 "Mục một của danh sách Mục hai" — Gộp hai mục/.test(await out(page)), JSON.stringify(await out(page)));
  await openOpts(page);
  await page.fill('#p-path', 'notes/');
  const o10 = await out(page);
  check('có folder, một file dán chưa có tên: vẫn L12, không tên tệp (MDAN-029)', /\. L9-10 "Mục một/.test(o10) && /\. L5 "liên kết/.test(o10) && !/notes\//.test(o10), JSON.stringify(o10));
  await page.uncheck('#line-nums');
  const o11 = await out(page);
  check('tắt số dòng: không vị trí, không câu dẫn', !/notes\/|L\d|file:line|Line numbers/.test(o11) && !(await page.isVisible('#p-path')), JSON.stringify(o11));
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForFunction(() => window.marked && window.DOMPurify);
  check('tắt số dòng và folder lưu theo phiên', !(await page.isChecked('#line-nums')) && (await page.inputValue('#p-path')) === 'notes/');
  await openOpts(page);
  await page.check('#line-nums');
  await page.click('#ptab-list');
  await page.setInputFiles('#file-in', { name: 'ghi-chu.md', mimeType: 'text/markdown', buffer: Buffer.from('# Ghi chú\n\nMột dòng.\n') });
  await page.waitForTimeout(200);
  check('mở file khi file đang mở có chữ: thêm vào cây cạnh nó và mở, không ghi ô Folder (MDAN-024)', (await page.inputValue('#p-path')) === 'notes/' && (await page.$$('#list .ma-item')).length === 0
    && (await page.$$eval('#tree-list .ma-trow', (ls) => ls.map((l) => l.querySelector('.ma-trow__name').textContent + (l.getAttribute('aria-selected') === 'true' ? '*' : '')).join())) === 'ghi-chu.md*,untitled.md');
  const openNamed = (nm) => page.evaluate(async (nm) => { const S = await import('./js/ui/state.js'); S.openFileId(S.S.nodes.find((n) => n.name === nm).id); }, nm);
  await openNamed('untitled.md'); await page.waitForTimeout(150);
  const o12 = await out(page);
  check('có folder, hai file: vị trí dạng folder/tệp:dòng', /\. notes\/untitled\.md:9-10 "Mục một/.test(o12) && /\. notes\/untitled\.md:5 "liên kết/.test(o12) && /tệp:dòng/.test(o12), JSON.stringify(o12));
  await openNamed('ghi-chu.md'); await page.waitForTimeout(150);
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
  await page.click('#dock-n'); await page.waitForTimeout(300);   // tấm trượt lên (.22s) rồi mới đo
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
  /* Safari (Mac, iOS) coi focus tự động của hộp thoại là :focus-visible; focusVisible: true giả lập điều đó. */
  const ringDlg = await page.evaluate(() => { const a = document.activeElement; a.blur(); a.focus({ focusVisible: true }); return [a.id, a.matches(':focus-visible'), getComputedStyle(a).outlineStyle]; });
  await page.keyboard.press('Tab');
  const ringTab = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  await page.keyboard.press('Shift+Tab');
  check('hộp Settings: nút tự focus không có vòng; bấm Tab mới có', ringDlg[1] && ringDlg[2] === 'none' && ringTab === 'solid', JSON.stringify([ringDlg, ringTab]));
  check('hộp Layout: một vùng cuộn, lớp và thẻ hộp không cuộn', await page.$eval('#dlg-layout', (d) => [d, d.querySelector('.ma-dlg__in')].every((x) => x.scrollHeight <= x.clientHeight)));
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
  const ml = await m.evaluate(() => { const d = document.getElementById('dlg-layout'), c = d.querySelector('.ma-dlg__in'); return { w: getComputedStyle(document.querySelector('.ma-set--wrap')).display, dlg: Math.max(d.scrollHeight - d.clientHeight, c.scrollHeight - c.clientHeight) }; });
  check('điện thoại: hộp Layout ẩn mục bề rộng, chỉ thân hộp cuộn', ml.w === 'none' && ml.dlg <= 0, JSON.stringify(ml));
  await m.tap('#dlg-layout [data-close]');
  /* Safari iOS coi focus do script đặt là :focus-visible; focusVisible: true giả lập điều đó trong Chromium. */
  const ringAt = (p) => p.evaluate(() => { const a = document.getElementById('btn-layout'); a.focus({ focusVisible: true }); return getComputedStyle(a).outlineStyle; });
  const mRingTouch = await ringAt(m);
  await m.keyboard.press('Tab'); await m.keyboard.press('Shift+Tab');
  const mRingKbd = await m.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  await m.tap('#v-md h1');
  check('điện thoại: chạm không để lại vòng focus; bàn phím thì có', mRingTouch === 'none' && mRingKbd === 'solid' && (await ringAt(m)) === 'none', JSON.stringify([mRingTouch, mRingKbd]));
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
  /* Kéo từ vùng nền (MDAN-064): ở Split, nền bên trái tâm vách bôi đen Source, bên phải (lề phải, cả panel nhận xét) bôi đen
     Preview; mỗi điểm bắt dòng gần nhất ở cùng độ cao; thả ra mở hộp nhận xét. Panel, thanh trên, cây không bôi đen được, trừ ô
     gõ chữ. Bấm nền panel (không kéo) bỏ vùng chọn cũ, không mở hộp. Kéo tới mép dưới thì khung cuộn theo. */
  {
    await sp.evaluate(() => {
      const where = (n) => { const e = n && (n.nodeType === 1 ? n : n.parentElement); return !e ? '-' : e.closest('#v-src') ? 'src' : e.closest('#v-md') ? 'md' : 'other'; };
      document.addEventListener('pointerup', () => { const s = getSelection(); window.__bgUp = { a: where(s.anchorNode), f: where(s.focusNode), n: s.toString().trim().length }; }, true);
      document.getElementById('wrap-src').scrollTop = 0; document.getElementById('wrap-md').scrollTop = 0;
    });
    await sp.waitForTimeout(150);
    const geo = await sp.evaluate(() => { const d = document.getElementById('doc').getBoundingClientRect(), pn = document.getElementById('panel').getBoundingClientRect();
      const w = document.getElementById('wrap-md').getBoundingClientRect();
      const ps = [...document.querySelectorAll('#v-md > p')].slice(0, 3).map((p) => { const r = p.getBoundingClientRect(); return r.top + r.height / 2; });
      return { left: d.left - 10, right: Math.round((d.right + innerWidth) / 2), panel: pn.left + pn.width / 2, y1: ps[0], y2: ps[2], bottom: w.bottom }; });
    const drag = async (x, y1, y2) => {
      await sp.mouse.move(x, y1); await sp.mouse.down(); await sp.mouse.move(x, y2, { steps: 6 }); await sp.mouse.up(); await sp.waitForTimeout(200);
      const r = { ...(await sp.evaluate(() => window.__bgUp)), pop: await sp.isVisible('#pop') };
      await sp.keyboard.press('Escape'); await sp.waitForTimeout(100); return r;
    };
    for (const [name, x, want] of [['nền trang bên trái', geo.left, 'src'], ['lề trang bên phải', geo.right, 'md'], ['nền panel nhận xét', geo.panel, 'md']]) {
      const r = await drag(x, geo.y1, geo.y2);
      check(`Split: kéo từ ${name} bôi đen ${want === 'src' ? 'Source' : 'Preview'}, mở hộp nhận xét`, r.a === want && r.f === want && r.n > 20 && r.pop, JSON.stringify(r));
    }
    const us = await sp.evaluate(() => Object.fromEntries([['bar', '.ma-bar'], ['panel', '#panel .ma-panel__body'], ['tab', '#panel .ma-seg button, #panel button'], ['tree', '#tree'], ['head', '#p-head'], ['path', '#p-path']]
      .map(([k, q]) => [k, getComputedStyle(document.querySelector(q)).userSelect])));
    check('thanh trên, panel, cây không bôi đen được; ô gõ chữ trong panel thì được', us.bar === 'none' && us.panel === 'none' && us.tab === 'none' && us.tree === 'none' && us.head === 'text' && us.path === 'text', JSON.stringify(us));
    await sp.evaluate(() => { const r = document.createRange(); r.selectNodeContents(document.querySelector('#v-md p')); getSelection().removeAllRanges(); getSelection().addRange(r); });
    await sp.mouse.click(geo.panel, geo.y2); await sp.waitForTimeout(200);
    const clk = { sel: await sp.evaluate(() => getSelection().toString()), pop: await sp.isVisible('#pop') };
    check('bấm nền panel (không kéo): bỏ vùng chọn cũ, không mở hộp nhận xét', clk.sel === '' && !clk.pop, JSON.stringify(clk));
    await sp.mouse.move(geo.panel, geo.y1); await sp.mouse.down(); await sp.mouse.move(geo.panel, geo.bottom + 40, { steps: 6 }); await sp.waitForTimeout(600); await sp.mouse.up(); await sp.waitForTimeout(200);
    const auto = { top: await sp.evaluate(() => document.getElementById('wrap-md').scrollTop), ...(await sp.evaluate(() => window.__bgUp)) };
    check('kéo từ nền quá mép dưới khung Preview: khung cuộn theo, vùng chọn dài ra', auto.top > 100 && auto.a === 'md' && auto.f === 'md' && auto.n > 200, JSON.stringify(auto));
    await sp.keyboard.press('Escape'); await sp.waitForTimeout(100);
    await sp.evaluate(() => { document.getElementById('wrap-md').scrollTop = 0; getSelection().removeAllRanges(); });
    await sp.keyboard.press('Control+a');
    const all = await sp.evaluate(() => getSelection().toString());
    check('Ctrl+A: chọn văn bản, không lấy chữ của thanh trên, panel', all.includes('Short paragraph number 3.') && !/Copy prompt|Comments|History/.test(all), all.length);
    await sp.evaluate(() => getSelection().removeAllRanges()); await sp.keyboard.press('Escape');
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
    // MDAN-019: Shift + bấm vào chế độ / thêm cả dải; kéo trên lề thêm hoặc bỏ cả dải.
    const sclick = async (n) => { await ml.keyboard.down('Shift'); await gclick(n); await ml.keyboard.up('Shift'); };
    await sclick(3);
    check('nhiều dòng: Shift + bấm lề ngoài chế độ thì vào chế độ với dòng ấy, không bôi đen', (await picks()) === '3' && (await ml.isVisible('#pop-head')) && await ml.evaluate(() => getSelection().isCollapsed), await picks());
    await sclick(9);
    check('nhiều dòng: Shift + bấm thêm cả dải từ dòng bấm gần nhất (bỏ dòng trống)', (await picks()) === '3,4,6,7,8,9' && (await sum()) === '6 lines · L3-4, L6-9', (await picks()) + ' | ' + (await sum()));
    await ml.keyboard.press('Escape');
    const gdrag = async (a, b, back) => {
      const ga = await gut(a), gb = await gut(b);
      await ml.mouse.move(ga.x, ga.y); await ml.mouse.down(); await ml.mouse.move(gb.x, gb.y, { steps: 6 });
      if (back) { const gc = await gut(back); await ml.mouse.move(gc.x, gc.y, { steps: 4 }); }
      await ml.mouse.up(); await ml.waitForTimeout(100);
    };
    await gdbl(3); await gdrag(6, 8);
    check('nhiều dòng: kéo trên lề từ dòng chưa chọn thì thêm cả dải, hộp cập nhật', (await picks()) === '3,6,7,8' && (await sum()) === '4 lines · L3, L6-8', (await picks()) + ' | ' + (await sum()));
    await gdrag(7, 8);
    check('nhiều dòng: kéo từ dòng đã chọn thì bỏ cả dải', (await picks()) === '3,6', await picks());
    await gdrag(4, 9, 6);
    check('nhiều dòng: kéo rồi lùi lại thì dải co theo', (await picks()) === '3,4,6', await picks());
    check('nhiều dòng: kéo trên lề không bôi đen chữ', await ml.evaluate(() => getSelection().isCollapsed));
    await ml.keyboard.press('Escape');
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
    // Settings: cùng công tắc với tab Review, độ sáng chỉnh được, áp ngay.
    await rv.click('#btn-layout');
    const rvSet0 = await rv.isChecked('#set-rvdim');
    await rv.$eval('#set-rvdimv', (el) => { el.value = 20; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await rv.waitForTimeout(350);   // opacity có transition .2s
    const op2 = await rv.evaluate(() => getComputedStyle([...document.querySelectorAll('#v-md > *')].find((e) => e.textContent.includes('Para A7 '))).opacity);
    await rv.uncheck('#set-rvdim');
    const offBoth = !(await rv.isChecked('#rv-dim')) && (await rv.textContent('#set-rvdimv-o')) === 'Off';
    await rv.check('#set-rvdim'); await rv.keyboard.press('Escape');
    check('Settings: Dim reviewed cùng công tắc với tab Review, độ sáng 20% áp ngay', rvSet0 && +op2 === 0.2 && offBoth && (await rv.isChecked('#rv-dim')), JSON.stringify([rvSet0, op2, offBoth]));
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
    const g = await gp.$eval('#dlg-layout', (d) => { const r = d.querySelector('.ma-dlg__in').getBoundingClientRect(), l = d.getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: innerWidth, h: innerHeight, layer: [l.left, l.top, l.width, l.height], bg: getComputedStyle(d).backgroundColor, bd: getComputedStyle(d, '::backdrop').backgroundColor }; });
    const tag = `${vw}×${vh} ${scheme}`;
    check(`Settings ${tag}: hộp giữa màn hình`, Math.abs(g.cx - g.w / 2) <= 2 && Math.abs(g.cy - g.h / 2) <= 2, JSON.stringify(g));
    check(`Settings ${tag}: nền sau mờ nhẹ, là chính lớp hộp thoại phủ trọn khung nhìn (không phải ::backdrop)`, /rgba\(\d+, \d+, \d+, 0\.[1-4]/.test(g.bg) && g.bd === 'rgba(0, 0, 0, 0)' && g.layer.join() === [0, 0, g.w, g.h].join(), JSON.stringify(g));
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
    const k = await kp.$eval('#dlg-keys', (d) => { const r = d.querySelector('.ma-dlg__in').getBoundingClientRect(), l = d.getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, layer: [l.left, l.top, l.width, l.height].join(), bg: getComputedStyle(d).backgroundColor, bd: getComputedStyle(d, '::backdrop').backgroundColor, kbd: d.querySelectorAll('kbd.ma-key').length, tc: document.getElementById('theme-color').content }; });
    check('Shortcuts: hộp giữa màn hình, nền sau mờ (lớp hộp thoại phủ trọn), phím là chip kbd', Math.abs(k.cx - 720) <= 2 && Math.abs(k.cy - 450) <= 2 && /rgba\(\d+, \d+, \d+, 0\.[1-9]/.test(k.bg) && k.bd === 'rgba(0, 0, 0, 0)' && k.layer === '0,0,1440,900' && k.kbd > 10, JSON.stringify(k));
    check('Shortcuts trên Settings: theme-color là nền trang dưới cả hai lớp mờ', k.tc === mixHex('#f5f6f3', 'rgba(11, 15, 12, 0.2)', 'rgba(11, 15, 12, 0.38)'), k.tc);
    await kp.keyboard.press('Escape');
    check('Shortcuts: Esc đóng hộp Shortcuts, Settings còn mở', !(await kp.$eval('#dlg-keys', (d) => d.open)) && (await kp.$eval('#dlg-layout', (d) => d.open)));
    check('Shortcuts: đóng thì theme-color về lớp mờ của Settings', (await kp.$eval('#theme-color', (x) => x.content)) === mixHex('#f5f6f3', 'rgba(11, 15, 12, 0.2)'));
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

  // ── lớp mờ là chính <dialog> phủ trọn khung nhìn, nền là --scrim: iOS 26 Safari tô vùng thanh trạng thái theo nền phần tử
  //    fixed ở mép, không theo ::backdrop. Thẻ là con; theme-color là nền trộn lớp mờ khi mở, trả lại khi đóng. ──
  for (const [vw, vh, scheme] of [[390, 844, 'light'], [390, 844, 'dark'], [1280, 800, 'light'], [1280, 800, 'dark']]) {
    const touch = vw < 700;
    const lctx = await browser.newContext({ viewport: { width: vw, height: vh }, colorScheme: scheme, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });
    const lp = await lctx.newPage(); watch(lp);
    await lp.goto(BASE); await lp.waitForFunction(() => window.marked && window.DOMPurify);
    await lp.click('#btn-sample'); await lp.waitForTimeout(150);
    await lp.evaluate(async () => {   // cây vài file, để #btn-tree mở tấm trượt ở máy hẹp
      const T = await import('./js/ui/tree.js'), nodes = [{ id: 'd', parent: null, kind: 'dir', name: 'docs' }];
      for (let i = 0; i < 6; i++) nodes.push({ id: 'f' + i, parent: i % 2 ? 'd' : null, kind: 'file', name: 'note-' + i + '.md' });
      const noop = () => '';
      T.renderTree({ nodes, open: 'f0', collapsed: [], counts: {}, title: 'Demo' }, { open: noop, toggle: noop, newFile: noop, newDir: noop, rename: noop, move: noop, remove: noop, importDir: noop, download: noop, collapseAll: noop });
    });
    const tag = `${vw}×${vh} ${scheme}`, bg = scheme === 'dark' ? '#090b0a' : '#f5f6f3';
    const tc = () => lp.$eval('#theme-color', (x) => x.content);
    check(`lớp mờ ${tag}: theme-color lúc đầu là nền trang, html có nền đặt rõ`, (await tc()) === bg && (await lp.evaluate(() => getComputedStyle(document.documentElement).backgroundColor === getComputedStyle(document.body).backgroundColor)), await tc());
    const bad = [];
    for (const [id, btn, place] of [['dlg-hist', 'btn-hist', 'sheet'], ['dlg-hints', 'btn-hints', 'sheet'], ['dlg-layout', 'btn-layout', 'center'], ['dlg-keys', 'btn-keys', 'center'], ['dlg-panel', 'dock-n', 'bottom'], ['dlg-tree', 'btn-tree', 'left']]) {
      if (vw > 1080 && (place === 'bottom' || place === 'left')) continue;
      await lp.evaluate((b) => document.getElementById(b).click(), btn); await lp.waitForTimeout(350);
      const g = await lp.evaluate((id) => {
        const d = document.getElementById(id), l = d.getBoundingClientRect(), card = d.querySelector(':scope > .ma-dlg__in, :scope > .ma-panel, :scope > .ma-tree'), c = card.getBoundingClientRect();
        const probe = document.createElement('i'); document.body.append(probe);
        probe.style.backgroundColor = d.classList.contains('ma-dlg--live') ? 'var(--scrim-live)' : 'var(--scrim)'; const want = getComputedStyle(probe).backgroundColor;
        probe.style.backgroundColor = 'var(--surface)'; const surface = getComputedStyle(probe).backgroundColor; probe.remove();
        return { open: d.open, layer: [l.left, l.top, l.width, l.height].join(), view: [0, 0, innerWidth, innerHeight].join(), bg: getComputedStyle(d).backgroundColor, want,
          bd: getComputedStyle(d, '::backdrop').backgroundColor, card: [c.left, c.top, c.right, c.bottom].map(Math.round), cardBg: getComputedStyle(card).backgroundColor, surface,
          tc: document.getElementById('theme-color').content };
      }, id);
      const [L, T, R, B] = g.card, cx = (L + R) / 2, cy = (T + B) / 2;
      const placed = { sheet: L === 0 && R === vw && B === vh, bottom: Math.abs(cx - vw / 2) <= 1 && B === vh, left: L === 0 && T === 0 && B === vh && R < vw,
        center: Math.abs(cx - vw / 2) <= 1 && Math.abs(cy - vh / 2) <= 1 }[vw > 720 && place === 'sheet' ? 'center' : place];
      if (!g.open || g.layer !== g.view || g.bg !== g.want || !/, 0\.\d+\)$/.test(g.bg) || g.bd !== 'rgba(0, 0, 0, 0)' || g.cardBg !== g.surface || !placed || g.tc !== mixHex(bg, g.want)) bad.push(id + ' ' + JSON.stringify(g));
      // bấm / chạm lớp ngoài thẻ: đóng (mọi hộp thoại, như khi lớp là ::backdrop)
      const pt = L > 8 || T > 8 ? [4, 4] : [vw - 4, 4];
      if (touch) await lp.touchscreen.tap(pt[0], pt[1]); else await lp.mouse.click(pt[0], pt[1]);
      await lp.waitForTimeout(150);
      const after = await lp.evaluate((id) => [document.getElementById(id).open, document.getElementById('theme-color').content], id);
      if (after[0] || after[1] !== bg) { bad.push(id + ' ngoài thẻ: ' + JSON.stringify(after)); if (after[0]) await lp.keyboard.press('Escape'); }
    }
    check(`lớp mờ ${tag}: mọi hộp thoại là lớp trọn khung nhìn nền --scrim, ::backdrop trong suốt, thẻ đúng chỗ, theme-color trộn rồi trả lại, chạm ngoài thẻ thì đóng`, !bad.length, bad.join(' | '));
    check(`lớp mờ ${tag}: không tràn ngang`, (await overflow(lp)) === 0);
    await lctx.close();
  }
  // ── end lớp mờ ──

  // ── tấm đáy của hộp nhận xét: nền mờ là lớp fixed #pop-scrim (không phải bóng), không chặn chạm; chọn nhiều dòng thì
  //    không có nền mờ, vẫn chạm được lề số các dòng khác (MDAN-026) ──
  for (const scheme of ['light', 'dark']) {
    const sctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const sp = await sctx2.newPage(); watch(sp);
    await sp.goto(BASE); await sp.waitForFunction(() => window.marked && window.DOMPurify);
    await sp.tap('#btn-sample'); await sp.waitForTimeout(150);
    const bg = scheme === 'dark' ? '#090b0a' : '#f5f6f3';
    const dim = () => sp.evaluate(() => {
      const sc = document.getElementById('pop-scrim'), pop = document.getElementById('pop'), r = sc.getBoundingClientRect(), cs = getComputedStyle(sc);
      const probe = document.createElement('i'); probe.style.backgroundColor = 'var(--scrim-live)'; document.body.append(probe);
      const want = getComputedStyle(probe).backgroundColor; probe.remove();
      return { shown: !!sc.getClientRects().length, rect: [r.left, r.top, r.width, r.height].join(), bg: cs.backgroundColor, want, pe: cs.pointerEvents, z: +cs.zIndex,
        popZ: +getComputedStyle(pop).zIndex, barZ: +getComputedStyle(document.querySelector('.ma-bar')).zIndex || 0, dockZ: +getComputedStyle(document.getElementById('dock')).zIndex,
        spread: Math.max(0, ...(getComputedStyle(pop).boxShadow.match(/-?[\d.]+px/g) || []).map(parseFloat)), sheet: pop.classList.contains('is-sheet') && !pop.hidden,
        tc: document.getElementById('theme-color').content };
    });
    await scriptSelect(sp, '#v-md', 'Try selecting this sentence');
    await sp.tap('#fab'); await sp.waitForTimeout(250);
    const d1 = await dim();
    check(`tấm đáy ${scheme}: nền mờ là lớp fixed trọn khung nhìn, nền --scrim-live, dưới tấm, trên thanh đáy; tấm không còn bóng phủ; theme-color trộn`,
      d1.sheet && d1.shown && d1.rect === '0,0,390,844' && d1.bg === d1.want && d1.pe === 'none' && d1.z === d1.popZ - 1 && d1.z > d1.dockZ && d1.z > d1.barZ && d1.spread < 100 && d1.tc === mixHex(bg, d1.want), JSON.stringify(d1));
    await sp.tap('#v-md h1'); await sp.waitForTimeout(150);
    const d2 = await dim();
    check(`tấm đáy ${scheme}: chạm ra ngoài (xuyên qua nền mờ) đóng tấm, nền mờ ẩn, theme-color trả lại`, !d2.sheet && !d2.shown && d2.tc === bg, JSON.stringify(d2));
    // Chọn nhiều dòng ở lề số (Source): tấm hiện, không có nền mờ; chạm lề dòng khác vẫn thêm / bỏ dòng.
    await sp.tap('.ma-tab[data-view="src"]'); await sp.waitForTimeout(150);
    const gut = (n) => sp.$eval(`#v-src .ma-ln:nth-child(${n})`, (el) => { el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left + 4, y: r.top + 8 }; });
    const picks = () => sp.$$eval('#v-src .ma-ln', (ls) => ls.map((l, i) => (l.classList.contains('is-pick') ? i + 1 : 0)).filter(Boolean).join());
    const g3 = await gut(3); await sp.mouse.dblclick(g3.x, g3.y); await sp.waitForTimeout(250);
    const d3 = await dim();
    check(`tấm đáy ${scheme}: chọn dòng mở tấm mà không có nền mờ, theme-color là nền trang`, d3.sheet && !d3.shown && d3.tc === bg && (await picks()) === '3' && await sp.isVisible('#pop-head'), JSON.stringify([d3, await picks()]));
    const g7 = await sp.$eval('#v-src .ma-ln:nth-child(7)', (el) => { const r = el.getBoundingClientRect(); return { x: r.left + 4, y: r.top + 8 }; });
    const hit = await sp.evaluate((g) => { const t = document.elementFromPoint(g.x, g.y); return [!!(t && t.closest('.ma-ln')), Math.round(document.getElementById('pop').getBoundingClientRect().top)]; }, g7);
    await sp.touchscreen.tap(g7.x, g7.y); await sp.waitForTimeout(200);
    const d4 = await dim();
    check(`tấm đáy ${scheme}: tấm đang mở, chạm lề số dòng khác vẫn thêm dòng, vẫn không có nền mờ`, hit[0] && g7.y < hit[1] && (await picks()) === '3,7' && d4.sheet && !d4.shown && (await sp.textContent('#pop-sum')).startsWith('2 lines'), JSON.stringify([hit, g7, await picks(), d4]));
    await sp.keyboard.press('Escape'); await sp.waitForTimeout(100);
    check(`tấm đáy ${scheme}: Esc thoát chọn dòng, tấm ẩn, không còn nền mờ`, !(await dim()).sheet && !(await dim()).shown && (await picks()) === '');
    await sctx2.close();
  }
  // ── end tấm đáy ──

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

    // Gợi ý: đọc P6 ở dải (đồng hồ giả 15 s), rồi tự cuộn qua thì hiện đĩa ✓ gợi ý; không tự đánh dấu.
    await mp.mouse.move(md.x, md.y);
    const u6 = await laneOf('Para P6 ');
    const done0 = await nDone();
    await putAt('Para P6 ', 0.32); await tick(600); await wheel(4);
    await mp.clock.runFor(15000);
    await wheel(120, 5); await tick(600);
    let sg = await sugs();
    await mp.click('#ptab-review'); await tick();
    check('gợi ý: đơn vị đọc đủ lâu rồi cuộn qua có đĩa ✓ gợi ý, không thành dấu', sg.includes(u6) && (await nDone()) === done0 && (await mp.$$eval(`.ma-lane__b[data-u="${u6}"].is-sug`, (b) => b.length)) === 2, JSON.stringify(sg) + ' u6=' + u6);
    check('gợi ý: tab Review có "Accept N suggested"', (await mp.isVisible('#rv-sug')) && (await mp.textContent('#rv-sug-ok')) === `Accept ${sg.length} suggested`, await mp.textContent('#rv-sug-ok'));
    // MDAN-052 (thay luật cũ "viền đứt"): gợi ý là đĩa xanh nhạt đặc có ✓, không viền đứt; đơn vị hiện tại là vạch, không ✓.
    check('gợi ý: đĩa ✓ xanh nhạt đặc, không viền đứt, khác đơn vị hiện tại (.is-cur)', await mp.$eval(`#wrap-md .ma-lane__b[data-u="${u6}"]`, (b) => { const a = getComputedStyle(b, '::after'); return a.backgroundColor !== 'rgb(255, 255, 255)' && a.borderStyle !== 'dashed' && a.backgroundImage.includes('svg'); }));
    check('gợi ý: dải tiến độ có đoạn được gợi ý', (await strip('md')).segs.some((x) => x.startsWith('sug')));
    await mp.click('#rv-sug-ok'); await tick();
    check('gợi ý: Accept đánh dấu mọi đơn vị được gợi ý', (await nDone()) === done0 + sg.length && !(await sugs()).length && !(await mp.isVisible('#rv-sug')), String(await nDone()));
    await mp.click('.ma-toast__btn'); await tick();
    check('gợi ý: Undo trả dấu và đĩa ✓ gợi ý', (await nDone()) === done0 && (await sugs()).length === sg.length);
    await mp.$eval(`#wrap-md .ma-lane__b[data-u="${u6}"]`, (b) => b.scrollIntoView({ block: 'center' })); await tick();
    await mp.click(`#wrap-md .ma-lane__b[data-u="${u6}"]`); await tick();
    check('gợi ý: bấm làn của nó thì chấp nhận (đánh dấu), đĩa ✓ gợi ý mất', (await nDone()) === done0 + 1 && !(await sugs()).includes(u6));
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

  // ── làm mờ: Focus mode và Dim reviewed gộp bằng min, dòng dưới chuột sáng (MDAN-045) ──
  {
    /* Đo độ sáng thấy được (tích opacity qua mọi tổ tiên) của từng mẫu ở mọi tổ hợp (1920px, cây là cột): khung {Source, Preview, Split} ×
       chọn section {pointer, band} × {đã đọc, chưa} × {trong section sáng, ngoài} × {đoạn, mục danh sách, bảng, code} ×
       {dòng dưới chuột, không}. Kỳ vọng: dòng dưới chuột (và phần ghép ở khung kia) = 1; còn lại = min(--dim nếu ngoài
       section, --rv-dim nếu đã đọc). Split: hai khung cho cùng một số. */
    const DIM = 0.3, RVD = 0.4;
    const xctx = await browser.newContext({ viewport: { width: 1920, height: 1300 }, colorScheme: 'light' });
    await xctx.addInitScript(() => { try { if (!sessionStorage.getItem('x')) { localStorage.setItem('md-annotate:prefs:v1', JSON.stringify({ view: 'split', focus: true, rvDim: true, tree: true })); sessionStorage.setItem('x', '1'); } } catch (e) {} });
    const mx = await xctx.newPage(); watch(mx);
    await mx.goto(BASE); await mx.waitForFunction(() => window.marked && window.DOMPurify);
    const sec = (X) => [`## Sec ${X}`, '', `Para ${X}1 reviewed text.`, '', `Para ${X}2 plain text.`, '', `- Item ${X}1 plain`, `- Item ${X}2 reviewed`, `- Item ${X}3 plain`, '',
      '| Col | Val |', '|---|---|', `| T${X}1 row1 | r |`, `| T${X}1 row2 | r |`, '', '| Col | Val |', '|---|---|', `| T${X}2 row1 | p |`, '',
      '```', `C${X}1 reviewed code`, '```', '', '```', `C${X}2 plain code`, '```', ''];
    const XDOC = ['# Doc', '', 'Intro line.', '', ...sec('A'), ...sec('B')].join('\n');
    await mx.evaluate((t) => { const ta = document.getElementById('src-input'); ta.focus(); ta.dispatchEvent(new Event('paste')); ta.value = t; ta.dispatchEvent(new Event('input')); }, XDOC);
    await mx.waitForTimeout(250);
    await mx.click('.ma-tab[data-view="split"]'); await mx.waitForTimeout(250);
    // Đơn vị: 0 # Doc, 1 Intro, 2 ## Sec A, 3–11 section A, 12 ## Sec B, 13–21 section B. Đã đọc: đoạn 1, mục 2, bảng 1, code 1.
    for (const u of [3, 6, 8, 10, 13, 16, 18, 20]) await mx.$eval(`#wrap-md .ma-lane__b[data-u="${u}"]`, (b) => b.click());
    await mx.waitForTimeout(400);
    // Mẫu: [khoá, section, đã đọc, loại, thẻ Preview, chữ]
    const PROBES = [];
    for (const X of ['A', 'B']) {
      PROBES.push([X + ':p+', X, true, 'p', 'p', `Para ${X}1`], [X + ':p-', X, false, 'p', 'p', `Para ${X}2`],
        [X + ':li+', X, true, 'li', 'li', `Item ${X}2`], [X + ':li-', X, false, 'li', 'li', `Item ${X}1`],
        [X + ':t+', X, true, 'table', 'td', `T${X}1 row1`], [X + ':t-', X, false, 'table', 'td', `T${X}2 row1`],
        [X + ':c+', X, true, 'code', 'pre code', `C${X}1`], [X + ':c-', X, false, 'code', 'pre code', `C${X}2`]);
    }
    const rvOk = await mx.evaluate((P) => P.every(([, , rev, , tag, txt]) => {
      const el = [...document.querySelectorAll('#v-md ' + tag)].find((e) => e.textContent.includes(txt));
      const unit = el.closest('li') || el.closest('#v-md > *');
      const ln = [...document.querySelectorAll('#v-src .ma-ln')].find((l) => l.textContent.includes(txt));
      return unit.classList.contains('is-rv') === rev && ln.classList.contains('is-rv') === rev;
    }), PROBES);
    check('làm mờ: đánh dấu đúng tám đơn vị đã đọc ở cả hai khung', rvOk);
    // Đo khi cây là cột fixed ở mép trái (MDAN-037), ngoài lưới: con trỏ và dải đọc phải không lệch vì nó.
    check('làm mờ: đo với cây là cột fixed bên trái, vẫn Split', await mx.evaluate(() => document.documentElement.classList.contains('ma-tree-on')
      && getComputedStyle(document.getElementById('tree')).position === 'fixed' && !!document.getElementById('v-src').getClientRects().length && !!document.getElementById('v-md').getClientRects().length));
    /* Đo mọi mẫu ở các khung đang hiện: { khoá: { src, md, srcSec, mdSec } }. */
    const measure = () => mx.evaluate((P) => {
      const eff = (el) => { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= +getComputedStyle(n).opacity; return Math.round(o * 1000) / 1000; };
      const vis = (id) => !!document.getElementById(id).getClientRects().length;
      const out = {};
      for (const [k, , , , tag, txt] of P) {
        const r = {};
        if (vis('v-md')) {
          const el = [...document.querySelectorAll('#v-md ' + tag)].find((e) => e.textContent.includes(txt)), host = el.closest('#v-md > *');
          r.md = eff(el); r.mdLit = document.getElementById('v-md').classList.contains('is-focusing') ? host.classList.contains('is-sec') : null;
        }
        if (vis('v-src')) {
          const ln = [...document.querySelectorAll('#v-src .ma-ln')].find((l) => l.textContent.includes(txt));
          r.src = eff(ln); r.srcLit = document.getElementById('v-src').classList.contains('is-focusing') ? ln.classList.contains('is-sec') : null;
        }
        out[k] = r;
      }
      return out;
    }, PROBES);
    /* Toạ độ giữa mẫu k ở khung w nếu nó hiện trọn (không bị khung cuộn cắt, không bị thanh trên che), không thì null. */
    const spot = (k, w) => mx.evaluate(([P, k, w]) => {
      const [, , , , tag, txt] = P.find((p) => p[0] === k);
      const el = w === 'md' ? [...document.querySelectorAll('#v-md ' + tag)].find((e) => e.textContent.includes(txt))
        : [...document.querySelectorAll('#v-src .ma-ln')].find((l) => l.textContent.includes(txt));
      const r = el.getBoundingClientRect(), x = w === 'src' ? r.left + Math.min(r.width / 2, 140) : r.left + r.width / 2, y = r.top + r.height / 2;
      const hit = document.elementFromPoint(x, y);
      return hit && (el.contains(hit) || hit.contains(el)) && y > 0 && y < innerHeight ? { x, y } : null;
    }, [PROBES, k, w]);
    const cells = {}, bad = [];
    const tally = (view, mode, lit, hov, m) => {
      for (const [k, X, rev, kind] of PROBES) {
        for (const w of ['src', 'md']) {
          if (m[k][w] == null) continue;
          const line = hov === k, inSec = lit == null || X === lit;
          const want = line ? 1 : Math.min(inSec ? 1 : DIM, rev ? RVD : 1);
          const key = `${view}|${mode}|${rev ? 'rev' : 'plain'}|${inSec ? 'in' : 'out'}|${kind}|${line ? 'line' : '-'}`;
          const ok = Math.abs(m[k][w] - want) < 0.006;
          cells[key] = cells[key] || { n: 0, bad: 0 };
          cells[key].n++; if (!ok) { cells[key].bad++; bad.push(`${view}/${mode} hover ${hov || '-'} lit ${lit} ${k}@${w}=${m[k][w]} want ${want}`); }
        }
        if (view === 'split' && m[k].src != null && m[k].md != null && Math.abs(m[k].src - m[k].md) >= 0.006) bad.push(`${view}/${mode} hover ${hov} ${k}: Source ${m[k].src} ≠ Preview ${m[k].md}`);
      }
    };
    const setBy = async (v) => {
      await mx.click('#btn-layout'); await mx.click(`label:has(input[name="focusby"][value="${v}"])`); await mx.keyboard.press('Escape');
      await mx.mouse.move(2, 2); await mx.waitForTimeout(350);
    };
    /* Section đang sáng: 'A', 'B', hay '-' (section khác). Split: hai khung phải cùng một section. */
    const litNow = () => mx.evaluate(() => {
      const md = document.getElementById('v-md').getClientRects().length ? [...document.querySelectorAll('#v-md > .is-sec')].map((e) => e.textContent) : null;
      const src = document.getElementById('v-src').getClientRects().length ? [...document.querySelectorAll('#v-src .ma-ln.is-sec')].map((l) => l.textContent) : null;
      const of = (ts) => (ts.join('\n').match(/Sec ([AB])/) || [])[1] || '-';
      return md && src && of(md) !== of(src) ? 'mismatch' : of(md || src);
    });
    const panesOf = (view) => (view === 'split' ? ['src', 'md'] : view === 'src' ? ['src'] : ['md']);
    for (const view of ['src', 'view', 'split']) {
      await mx.click(`.ma-tab[data-view="${view}"]`); await mx.mouse.move(2, 2); await mx.waitForTimeout(300);
      // Theo chuột: rê vào từng mẫu ở từng khung; section của nó sáng, nó là dòng dưới chuột.
      await setBy('pointer');
      for (const w of panesOf(view)) {
        for (const [k, X] of PROBES) {
          await mx.evaluate(([P, k, w]) => {
            const [, , , , tag, txt] = P.find((p) => p[0] === k);
            const el = w === 'md' ? [...document.querySelectorAll('#v-md ' + tag)].find((e) => e.textContent.includes(txt)) : [...document.querySelectorAll('#v-src .ma-ln')].find((l) => l.textContent.includes(txt));
            el.scrollIntoView({ block: 'center' });
          }, [PROBES, k, w]);
          await mx.waitForTimeout(80);
          const at = await spot(k, w);
          if (!at) { bad.push(`${view}/pointer: không rê được ${k}@${w}`); continue; }
          await mx.mouse.move(at.x, at.y); await mx.waitForTimeout(350);
          const m = await measure();
          const lits = Object.values(m).flatMap((r) => [r.srcLit, r.mdLit]);
          if (lits.some((v) => v === null)) bad.push(`${view}/pointer hover ${k}@${w}: khung không làm mờ`);
          tally(view, 'pointer', X, k, m);
        }
      }
      await mx.mouse.move(2, 2); await mx.waitForTimeout(350);
      // Dải đọc: cuộn tới chỗ section A sáng, rồi tới cuối (B sáng); rê vào mọi mẫu đang hiện, ở trong lẫn ngoài section.
      await setBy('band');
      for (const want of ['A', 'B']) {
        const max = await mx.evaluate((view) => { const sc = view === 'split' ? document.getElementById('wrap-md') : document.scrollingElement; return sc.scrollHeight - sc.clientHeight; }, view);
        for (let s = want === 'B' ? max : 0; s >= 0 && s <= max; s += want === 'A' ? 16 : max + 1) {
          await mx.evaluate(([view, s]) => { (view === 'split' ? document.getElementById('wrap-md') : document.scrollingElement).scrollTop = s; }, [view, s]);
          await mx.waitForTimeout(want === 'A' ? 60 : 300);
          if (want !== 'A' || (await litNow()) === 'A') break;
        }
        await mx.waitForTimeout(350);
        const lit0 = await litNow();
        const m0 = await measure();
        tally(view, 'band', lit0, null, m0);
        for (const w of panesOf(view)) {
          for (const [k] of PROBES) {
            const at = await spot(k, w);
            if (!at) continue;
            await mx.mouse.move(at.x, at.y); await mx.waitForTimeout(350);
            tally(view, 'band', lit0, k, await measure());
          }
        }
        await mx.mouse.move(2, 2); await mx.waitForTimeout(300);
      }
    }
    const lines = Object.entries(cells).map(([k, v]) => `${k}:${v.bad ? 'LỖI ' + v.bad + '/' : ''}${v.n}`);
    const need = [];
    for (const view of ['src', 'view', 'split']) for (const mode of ['pointer', 'band']) for (const rev of ['rev', 'plain']) for (const io of ['in', 'out'])
      for (const kind of ['p', 'li', 'table', 'code']) for (const ln of ['line', '-']) {
        if (mode === 'pointer' && io === 'out' && ln === 'line') continue;   // theo chuột: dòng dưới chuột luôn trong section sáng
        if (!cells[`${view}|${mode}|${rev}|${io}|${kind}|${ln}`]) need.push(`${view}|${mode}|${rev}|${io}|${kind}|${ln}`);
      }
    check('làm mờ: ma trận đủ ô (khung × cách chọn × đã đọc × trong / ngoài section × loại khối × dòng dưới chuột)', !need.length, need.join(' '));
    check('làm mờ: độ sáng thấy được = min(Focus, Dim reviewed), dòng dưới chuột = 1, hai khung Split như nhau', !bad.length, bad.slice(0, 12).join(' | ') + (bad.length > 12 ? ` … (+${bad.length - 12})` : ''));
    if (process.env.MATRIX) console.log(lines.join("\n"));   // MATRIX=1: in bảng ô của ma trận

    // Dòng trống giữa hai khối đã đọc (Source) mờ theo khối trên, không thành khe sáng.
    const gap = await mx.evaluate(() => { const ls = [...document.querySelectorAll('#v-src .ma-ln')], i = ls.findIndex((l) => l.textContent.startsWith('Para B1'));
      return [ls[i + 1].textContent.trim() === '' && ls[i + 1].classList.contains('is-rv'), ls[i + 3].textContent.trim() === '' && !ls[i + 3].classList.contains('is-rv')]; });
    check('làm mờ: dòng trống ngay dưới khối đã đọc mờ theo nó, dưới khối chưa đọc thì không', gap[0] && gap[1], JSON.stringify(gap));
    // Hộp nhận xét mở (theo chuột): con trỏ vào hộp, section và đoạn đang ghi vẫn sáng ở cả hai khung.
    await mx.click('.ma-tab[data-view="split"]'); await setBy('pointer');
    await dragSelect(mx, '#v-md', 'Para B1 reviewed');
    const popBox = await mx.$eval('#pop', (p) => { const r = p.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 12 }; });
    await mx.mouse.move(popBox.x, popBox.y, { steps: 4 }); await mx.waitForTimeout(350);
    const pm = await measure();
    check('hộp nhận xét mở: section B và đoạn đang ghi (đã đọc) vẫn sáng ở hai khung', (await mx.isVisible('#pop')) && pm['B:p+'].md === 1 && pm['B:p+'].src === 1 && pm['B:p-'].md === 1 && pm['A:p-'].md === DIM && pm['B:li+'].md === RVD, JSON.stringify([pm['B:p+'], pm['B:p-'], pm['A:p-'], pm['B:li+']]));
    await mx.keyboard.type('x'); await mx.keyboard.press('Enter'); await mx.waitForTimeout(250);
    // Highlight nhận xét mờ như chữ quanh nó: dải đọc ở đầu (trượt về mép: section A sáng), đoạn B1 (đã đọc, ngoài
    // section) = min(.3, .4).
    await setBy('band');
    await mx.evaluate(() => { document.getElementById('wrap-md').scrollTop = 1; document.getElementById('wrap-md').scrollTop = 0; });
    await mx.waitForTimeout(400);
    check('dải đọc ở đầu văn bản: section A sáng ở hai khung', (await litNow()) === 'A');
    const hl = await mx.evaluate(() => { const eff = (el) => { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= +getComputedStyle(n).opacity; return Math.round(o * 1000) / 1000; };
      const mk = (sel) => [...document.querySelectorAll(sel + ' mark.ma-hl')].find((m) => m.textContent.includes('B1'));
      const a = mk('#v-md'), b = mk('#v-src');
      return a && b ? [eff(a), eff(a.closest('p')), eff(b), eff(b.closest('.ma-ln'))] : null; });
    check('highlight nhận xét mờ như chữ của nó, hai khung như nhau', hl && hl.every((v) => v === DIM), JSON.stringify(hl));
    // Settings: kéo --dim, --rv-dim thì độ sáng đổi ngay, vẫn lấy số nhỏ hơn.
    await mx.click('#btn-layout');
    await mx.$eval('#set-dim', (el) => { el.value = 50; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await mx.$eval('#set-rvdimv', (el) => { el.value = 20; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await mx.waitForTimeout(350);
    const live = await measure();
    await mx.keyboard.press('Escape');
    const lv = ['A:p+', 'B:p-', 'B:li+', 'B:li-', 'A:t+', 'B:c-', 'A:c+'].map((k) => [live[k].md, live[k].src]);
    check('Settings: kéo Focus 50% và Dim reviewed 20% áp ngay, vẫn lấy số nhỏ hơn, hai khung như nhau',
      JSON.stringify(lv) === JSON.stringify([[0.2, 0.2], [0.5, 0.5], [0.2, 0.2], [0.5, 0.5], [0.2, 0.2], [0.5, 0.5], [0.2, 0.2]]), JSON.stringify(lv));
    // Split, danh sách lồng và trích khối: phần dưới chuột là phần sâu nhất ghép được hai bên (mục con; trích khối thì cả
    // khối), chữ trần của mục cha sáng ở cả hai khung (MDAN-010); mục đã đọc khác mờ như nhau ở hai khung.
    await mx.click('.ma-tab[data-view="edit"]');
    await mx.evaluate((t) => { const ta = document.getElementById('src-input'); ta.value = t; ta.dispatchEvent(new Event('input')); },
      ['# N', '', '- P1 parent', '  - C1 child', '  - C2 child', '- P2 parent', '', '> Quote line', '> - QL1', '> - QL2', ''].join('\n'));
    await mx.waitForTimeout(350);
    await mx.click('.ma-tab[data-view="split"]'); await mx.waitForTimeout(300);
    for (const u of [1, 3]) await mx.$eval(`#wrap-md .ma-lane__b[data-u="${u}"]`, (b) => b.click());
    await mx.waitForTimeout(350);
    const nestAll = () => mx.evaluate(() => {
      const eff = (el) => { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= +getComputedStyle(n).opacity; return Math.round(o * 1000) / 1000; };
      const out = {};
      for (const t of ['P1 parent', 'C1 child', 'C2 child', 'P2 parent', 'Quote line', 'QL1', 'QL2']) {
        const md = [...document.querySelectorAll('#v-md li, #v-md p')].find((x) => x.textContent.startsWith(t)), src = [...document.querySelectorAll('#v-src .ma-ln')].find((l) => l.textContent.includes(t));
        out[t] = [eff(md), eff(src)];
      }
      return out;
    });
    const hoverAt = async (w, t) => {
      const at = await mx.evaluate(([w, t]) => { const el = w === 'md' ? [...document.querySelectorAll('#v-md li, #v-md p')].find((x) => x.textContent.startsWith(t)) : [...document.querySelectorAll('#v-src .ma-ln')].find((l) => l.textContent.includes(t));
        const r = el.getBoundingClientRect(); return { x: r.left + (w === 'md' ? 40 : 140), y: r.top + 8 }; }, [w, t]);   // Source: qua lề số và làn
      await mx.mouse.move(at.x, at.y); await mx.waitForTimeout(350);
      return nestAll();
    };
    const nv = [await hoverAt('md', 'C1 child'), await hoverAt('src', 'C2 child'), await hoverAt('md', 'QL1')];
    const same = nv.every((o) => Object.values(o).every(([a, b]) => a === b));
    const rd = 0.2;   // Dim reviewed đang ở 20% (Settings ở trên)
    check('Split, danh sách lồng và trích khối: hai khung như nhau, mục con dưới chuột và chữ mục cha sáng, mục anh em đã đọc mờ, trích khối sáng cả khối',
      same && nv[0]['C1 child'][0] === 1 && nv[0]['P1 parent'][1] === 1 && nv[0]['C2 child'][0] === rd && nv[1]['C2 child'][0] === 1 && nv[1]['C1 child'][1] === rd
        && ['Quote line', 'QL1', 'QL2'].every((t) => nv[2][t][0] === 1) && nv[2]['C1 child'][0] === rd, JSON.stringify(nv));
    // Edit: không gì mờ.
    await mx.click('.ma-tab[data-view="edit"]'); await mx.waitForTimeout(300);
    check('Edit: ô soạn không mờ', (await mx.$eval('#src-input', (el) => { let o = 1; for (let n = el; n; n = n.parentElement) o *= +getComputedStyle(n).opacity; return o; })) === 1);
    await xctx.close();
  }
  // ── end làm mờ ──

  /* ---------- Cây file (ui/tree.js): vẽ bằng mô hình giả, actions ghi vào window.__tree.log ---------- */
  {
    /* Chạy trong trang. single: phiên một file; không thì 8 cấp folder, 40 file, một folder gập, tên dài. */
    const treeDemo = async (single) => {
      const T = await import('./js/ui/tree.js');
      const nodes = []; let n = 0; const id = () => 'n' + (++n);
      if (single) nodes.push({ id: id(), parent: null, kind: 'file', name: 'untitled.md' });
      else {
        let parent = null; const dirs = [];
        for (let d = 0; d < 8; d++) { const x = { id: id(), parent, kind: 'dir', name: d === 7 ? 'deepest-level-folder-with-a-very-long-name' : 'level-' + (d + 1) }; nodes.push(x); dirs.push(x); parent = x.id; }
        for (let i = 0; i < 40; i++) nodes.push({ id: id(), parent: dirs[i % 8].id, kind: 'file', name: (i % 8 === 7 ? 'a-really-long-file-name-that-should-ellipsize-' : 'note-') + i + '.md' });
        const col = { id: id(), parent: null, kind: 'dir', name: 'archive' }; nodes.push(col);
        nodes.push({ id: id(), parent: col.id, kind: 'file', name: 'old.md' });
        nodes.push({ id: id(), parent: null, kind: 'file', name: 'README.md' });
      }
      const open = nodes.find((x) => x.kind === 'file').id;
      const model = { nodes, open, collapsed: single ? [] : [nodes.find((x) => x.name === 'archive').id], counts: { [open]: { c: 3, rv: 42 } }, title: 'Demo folder' };
      const log = [], by = (i) => nodes.find((x) => x.id === i);
      const render = () => T.renderTree(model, actions);
      const actions = {
        open(i) { log.push(['open', i]); model.open = i; render(); },
        toggle(i) { log.push(['toggle', i]); const k = model.collapsed.indexOf(i); if (k < 0) model.collapsed.push(i); else model.collapsed.splice(k, 1); render(); },
        newFile(p) { log.push(['newFile', p]); }, newDir(p) { log.push(['newDir', p]); },
        rename(i, name) { log.push(['rename', i, name]); if (!name || /[/\\]/.test(name)) return 'Names cannot contain / or \\'; by(i).name = name; render(); return ''; },
        move(i, p) { log.push(['move', i, p]); by(i).parent = p; render(); return ''; },
        remove(i) { log.push(['remove', i]); }, importDir(x, p) { log.push(['importDir', p]); }, download(i) { log.push(['download', i]); },
        collapseAll() { log.push(['collapseAll']); model.collapsed = nodes.filter((x) => x.kind === 'dir').map((x) => x.id); render(); }
      };
      window.__tree = { model, log, by, render };
      render();
    };
    const tstate = (p) => p.evaluate(() => {
      const t = document.getElementById('tree'), r = t.getBoundingClientRect(), d = document.getElementById('doc').getBoundingClientRect(), b = document.getElementById('btn-tree');
      const m = document.querySelector('main').getBoundingClientRect();
      return { shown: !!t.getClientRects().length, w: Math.round(r.width), left: Math.round(r.left), docL: Math.round(d.left), docW: Math.round(d.width),
        gapL: m.left - (t.getClientRects().length ? r.right : 0), gapR: document.documentElement.clientWidth - m.right,
        split: !document.getElementById('tab-split').hidden, exp: b.getAttribute('aria-expanded'), lbl: b.title, btn: !b.hidden,
        pref: JSON.parse(localStorage.getItem('md-annotate:prefs:v1') || '{}').tree, rows: document.querySelectorAll('#tree-list .ma-trow').length };
    });
    const focusName = (p) => p.evaluate(() => document.activeElement?.closest?.('.ma-trow')?.querySelector('.ma-trow__name')?.textContent || document.activeElement?.tagName);
    /* Mô hình giả đặt id cố định n1, n2…: tìm hàng theo tên ban đầu. */
    let ids = {};
    const nameOf = (sel) => tp.$eval(sel, (li) => li.querySelector('.ma-trow__name').textContent);
    const row = (name) => `#tree-list .ma-trow[data-id="${ids[name]}"]`;

    // 2560: cột cây vừa cạnh Split, kéo mép tới 420px vẫn còn chỗ (docked / tấm trượt theo chỗ: khối "cây docked" cuối file).
    const tctx = await treeContext({ viewport: { width: 2560, height: 900 }, colorScheme: 'light' });
    const tp = await tctx.newPage(); watch(tp);
    await tp.goto(BASE); await tp.waitForFunction(() => window.marked && window.DOMPurify);
    await tp.click('#btn-sample'); await tp.waitForTimeout(150);
    const t0 = await tstate(tp);
    check('cây: phiên một file của trang — có nút, cột hiện sẵn (MDAN-061)', t0.shown && t0.btn && t0.exp === 'true', JSON.stringify(t0));
    // Phiên một file: cột hiện sẵn, một hàng đang chọn, Split còn (2560); nút ẩn rồi hiện lại, ghi prefs.tree.
    await tp.evaluate(treeDemo, true); await tp.waitForTimeout(150);
    let ts = await tstate(tp);
    const one = await tp.$$eval('#tree-list .ma-trow', (ls) => ls.map((l) => [l.getAttribute('aria-selected'), l.getAttribute('aria-level'), l.querySelector('.ma-trow__name').textContent]));
    check('cây: phiên một file — cột hiện, một hàng đang chọn, Split còn', ts.btn && ts.shown && ts.split && ts.rows === 1 && one[0][0] === 'true' && one[0][1] === '1' && one[0][2] === 'untitled.md'
      && ts.exp === 'true' && ts.lbl === 'Hide files', JSON.stringify([ts, one]));
    await tp.click('#btn-tree'); await tp.waitForTimeout(150);
    const tOff = await tstate(tp);
    await tp.click('#btn-tree'); await tp.waitForTimeout(150);
    ts = await tstate(tp);
    check('cây: phiên một file — nút ẩn cột (prefs.tree = false), bấm lại hiện (true)', !tOff.shown && tOff.pref === false && tOff.lbl === 'Show files' && ts.shown && ts.pref === true, JSON.stringify([tOff, ts]));
    const hint = () => tp.evaluate(() => { const x = document.getElementById('tree-hint'); return { on: !!x.getClientRects().length, t: x.querySelector('.ma-tree__hint-t').innerText.trim() }; });
    const h1 = await hint();
    check('cây: phiên một file — gợi ý "Drop files or a folder here" dưới danh sách (MDAN-060)', h1.on && h1.t === 'Drop files or a folder here', JSON.stringify(h1));

    // Cây sâu: 8 cấp, 40 file. Bật / tắt, Split hiện lại khi tắt, nhớ qua tải lại.
    await tp.evaluate(treeDemo, false); await tp.waitForTimeout(150);
    ids = await tp.evaluate(() => Object.fromEntries(window.__tree.model.nodes.map((x) => [x.name, x.id])));
    ts = await tstate(tp);
    check('cây: cột trái rộng 248px trước #doc, Split vẫn có', ts.shown && ts.w === 248 && ts.left < ts.docL && ts.split && ts.rows === 50, JSON.stringify(ts));
    check('cây: nhiều mục thì không có gợi ý', !(await hint()).on);
    /* Đầu cây một hàng (MDAN-060): khối chữ (FILES nhỏ trên tên phiên, cùng mép trái), rồi New file, New folder, ⋯ cùng một
       hàng cao --h + --s2; nút cao bằng hàng (--row-h), tâm ⋯ thẳng tâm ⋯ của hàng; Close ẩn khi là cột. */
    const head = await tp.evaluate(() => {
      const hd = document.querySelector('#tree .ma-tree__head').getBoundingClientRect();
      const [k, t, ...b] = ['.ma-tree__k', '#tree-title', '#tree-new-file', '#tree-new-dir', '#tree-more'].map((q) => document.querySelector(q).getBoundingClientRect());
      const li = document.querySelector('#tree-list .ma-trow'), bd = document.getElementById('tree-body'); li.classList.add('is-menu');
      const rm = li.querySelector('.ma-trow__more').getBoundingClientRect(); li.classList.remove('is-menu');
      return { h: hd.height, row: [k, t, ...b].every((r) => r.height > 0 && r.top >= hd.top && r.bottom <= hd.bottom), stack: k.bottom <= t.top + 0.5 && Math.abs(k.left - t.left) <= 0.5,
        order: b.every((r, i) => r.left >= (i ? b[i - 1].right : Math.max(k.right, t.right)) - 0.5), close: !!document.querySelector('#tree .ma-tree__close').getClientRects().length,
        btn: Math.round(b[0].width), moreDx: Math.abs((b[2].left + b[2].width / 2) - (rm.left + rm.width / 2) - (bd.offsetWidth - bd.clientWidth)) };   // trừ thanh cuộn dọc nếu nó chiếm chỗ
    });
    check('cây: đầu cây một hàng cao 48px: FILES trên tên, rồi New file, New folder, ⋯; nút 32px (--row-h), ⋯ thẳng ⋯ của hàng; không có Close', head.h === 48 && head.row && head.stack && head.order && !head.close && head.btn === 32 && head.moreDx <= 0.5, JSON.stringify(head));
    // Menu ⋯: bấm mở (Import folder…, Download .zip, Collapse all), Esc đóng và trả focus; ↓ trên nút mở và vào mục đầu.
    await tp.click('#tree-more'); await tp.waitForTimeout(80);
    const hm = await tp.evaluate(() => ({ open: document.getElementById('tree-head-menu').classList.contains('is-open'), exp: document.getElementById('tree-more').getAttribute('aria-expanded'),
      items: [...document.querySelectorAll('#tree-head-menu .ma-menu__i')].map((b) => b.textContent.trim()).join('|'), focus: document.activeElement.id }));
    await tp.keyboard.press('Escape'); await tp.waitForTimeout(50);
    const hm2 = await tp.evaluate(() => ({ open: document.getElementById('tree-head-menu').classList.contains('is-open'), focus: document.activeElement.id, exp: document.getElementById('tree-more').getAttribute('aria-expanded') }));
    await tp.keyboard.press('ArrowDown'); await tp.waitForTimeout(50);
    const hm3 = await tp.evaluate(() => document.activeElement.id);
    await tp.keyboard.press('Escape');
    check('cây: ⋯ mở menu Import folder… | Download .zip | Collapse all, focus mục đầu; Esc đóng, focus về ⋯; ↓ trên ⋯ mở lại', hm.open && hm.exp === 'true' && hm.items === 'Import folder…|Download .zip|Collapse all' && hm.focus === 'tree-import'
      && !hm2.open && hm2.focus === 'tree-more' && hm2.exp === 'false' && hm3 === 'tree-import', JSON.stringify([hm, hm2, hm3]));
    check('cây: 2560 không tràn ngang', (await overflow(tp)) === 0, String(await overflow(tp)));
    await tp.click('#btn-tree'); await tp.waitForTimeout(150);
    ts = await tstate(tp);
    check('cây: bấm nút ẩn cột, #doc rộng ra, Split còn, lưu prefs.tree', !ts.shown && ts.split && ts.pref === false && ts.exp === 'false', JSON.stringify(ts));
    await tp.reload(); await tp.waitForFunction(() => window.marked && window.DOMPurify);
    await tp.evaluate(treeDemo, false); await tp.waitForTimeout(150);
    ts = await tstate(tp);
    check('cây: tải lại vẫn ẩn', !ts.shown && ts.btn, JSON.stringify(ts));
    await tp.evaluate(() => document.activeElement && document.activeElement.blur());
    await tp.keyboard.press('Control+B'); await tp.waitForTimeout(150);
    ts = await tstate(tp);
    check('cây: Ctrl+B hiện lại, lưu prefs.tree', ts.shown && ts.pref === true, JSON.stringify(ts));
    await tp.focus('#s-name'); await tp.keyboard.press('Control+B'); await tp.waitForTimeout(100);
    check('cây: Ctrl+B trong ô nhập không đổi gì', (await tstate(tp)).shown);
    await tp.evaluate(() => document.activeElement.blur());

    // Mép kéo: chuột (180–420, lưu prefs.treeW), phím mũi tên.
    const gb = await tp.$eval('#tree-grip', (g) => { const r = g.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await tp.mouse.move(gb.x, gb.y); await tp.mouse.down(); await tp.mouse.move(gb.x + 100, gb.y, { steps: 5 }); await tp.mouse.up(); await tp.waitForTimeout(150);
    ts = await tstate(tp);
    const tw = await tp.evaluate(() => JSON.parse(localStorage.getItem('md-annotate:prefs:v1')).treeW);
    check('cây: kéo mép rộng thêm 100px, lưu prefs.treeW; cây vẫn ở mép trái, vùng làm việc căn giữa phần còn lại', ts.w === 348 && tw === 348 && ts.left === 0 && Math.abs(ts.gapL - ts.gapR) <= 1, JSON.stringify({ ...ts, tw }));
    await tp.mouse.move(gb.x + 100, gb.y); await tp.mouse.down(); await tp.mouse.move(gb.x + 600, gb.y, { steps: 5 }); await tp.mouse.up();
    check('cây: kéo quá thì dừng ở 420px', (await tstate(tp)).w === 420);
    await tp.focus('#tree-grip'); await tp.keyboard.press('ArrowLeft'); await tp.keyboard.press('ArrowLeft');
    check('cây: ← trên mép hẹp lại 16px mỗi lần', (await tstate(tp)).w === 388, String((await tstate(tp)).w));
    await tp.reload(); await tp.waitForFunction(() => window.marked && window.DOMPurify);
    await tp.evaluate(treeDemo, false); await tp.waitForTimeout(150);
    check('cây: tải lại giữ bề rộng', (await tstate(tp)).w === 388);
    for (let i = 0; i < 20; i++) await tp.focus('#tree-grip').then(() => tp.keyboard.press('ArrowLeft'));
    check('cây: hẹp nhất 180px', (await tstate(tp)).w === 180);

    // Hàng sâu (cấp 9): thụt nhưng tên còn thấy ≥ 8 ký tự, ở cả 180px và 248px; title là đường dẫn đầy đủ.
    const deep = () => tp.evaluate(() => {
      const li = [...document.querySelectorAll('#tree-list .ma-trow')].find((l) => l.getAttribute('aria-level') === '9');
      const nm = li.querySelector('.ma-trow__name'), r = nm.getBoundingClientRect(), top = document.querySelector('#tree-list .ma-trow .ma-trow__name').getBoundingClientRect();
      const c = document.createElement('canvas').getContext('2d'); c.font = getComputedStyle(nm).font;
      return { w: Math.round(r.width), need: Math.round(c.measureText('a-really').width), indent: Math.round(r.left - top.left), path: li.title };
    });
    let dp = await deep();
    check('cây: 180px, hàng cấp 9 còn thấy ≥ 8 ký tự tên', dp.w >= dp.need && dp.path.split('/').length === 9, JSON.stringify(dp));
    await tp.evaluate(() => { localStorage.setItem('md-annotate:prefs:v1', JSON.stringify({ ...JSON.parse(localStorage.getItem('md-annotate:prefs:v1')), treeW: 248 })); });
    await tp.reload(); await tp.waitForFunction(() => window.marked && window.DOMPurify);
    await tp.evaluate(treeDemo, false); await tp.waitForTimeout(150);
    dp = await deep();
    check('cây: 248px, hàng cấp 9 thụt vào mà vẫn thấy ≥ 8 ký tự tên', dp.w >= dp.need && dp.indent >= 60, JSON.stringify(dp));

    /* Cây 25 cấp (MDAN-060): thụt mỗi cấp bằng nhau (--tree-step), mỗi folder đang mở có đúng một vạch dưới tâm chevron (±0,5px,
       trùng điểm ảnh), dài đúng các hàng con cháu; tên hàng sâu nhất vẫn ≥ 96px; thân cây cuộn ngang, trang không; file mở ở
       cấp sâu nhất được cuộn ngang vào tầm nhìn. */
    const deep25 = await tp.evaluate(async () => {
      const T = await import('./js/ui/tree.js'), noop = () => '', nodes = [];
      let parent = null;
      for (let d = 0; d < 25; d++) { nodes.push({ id: 'z' + d, parent, kind: 'dir', name: d % 3 ? 'folder' : 'folder-' + d }); parent = 'z' + d; }
      nodes.push({ id: 'zf', parent, kind: 'file', name: 'deepest-note.md' }, { id: 'zr', parent: null, kind: 'file', name: 'top.md' });
      T.renderTree({ sid: 'deep25', nodes, open: 'zf', collapsed: [], counts: {}, title: 'Deep' },
        { open: noop, toggle: noop, newFile: noop, newDir: noop, rename: noop, move: noop, remove: noop, importDir: noop, download: noop, collapseAll: noop });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const rows = [...document.querySelectorAll('#tree-list .ma-trow')], by = Object.fromEntries(rows.map((r) => [r.dataset.id, r]));
      const chevX = (li) => { const s = li.querySelector('.ma-trow__chev').getBoundingClientRect(); return s.left + s.width / 2; };
      const steps = new Set(); for (let d = 1; d < 25; d++) steps.add(+(chevX(by['z' + d]) - chevX(by['z' + (d - 1)])).toFixed(2));
      let delta = 0, px = 0, span = 0, n = 0;
      for (const g of document.querySelectorAll('#tree-guides .ma-tree__g')) {
        const r = g.getBoundingClientRect(), li = by[g.dataset.for], i = rows.indexOf(li);
        delta = Math.max(delta, Math.abs(r.left + r.width / 2 - chevX(li)));
        px = Math.max(px, Math.abs(r.left * devicePixelRatio - Math.round(r.left * devicePixelRatio)), Math.abs(r.width - 1));
        let k = 0; while (rows[i + 1 + k] && +rows[i + 1 + k].getAttribute('aria-level') > +li.getAttribute('aria-level')) k++;
        span = Math.max(span, Math.abs(r.top - rows[i + 1].getBoundingClientRect().top), Math.abs(r.bottom - rows[i + k].getBoundingClientRect().bottom)); n++;
      }
      const b = document.getElementById('tree-body'), q = b.getBoundingClientRect(), nm = by.zf.querySelector('.ma-trow__name').getBoundingClientRect();
      const top = by.zr.getBoundingClientRect(), sel = getComputedStyle(by.zf, '::before');
      return { steps: [...steps], step: parseFloat(getComputedStyle(by.z0).getPropertyValue('--tree-step')), guides: n, delta, px, span, nameW: Math.round(nm.width),
        bodyX: b.scrollWidth - b.clientWidth, isX: b.classList.contains('is-x'), sl: b.scrollLeft, page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        seen: nm.left >= q.left - 0.5 && nm.left + 96 <= q.left + b.clientWidth + 0.5, topW: Math.round(top.width), bodyW: b.clientWidth, cardR: sel.right, ends: ends() };
      /* Đuôi ⋯ của mọi hàng: một cột, trong tầm nhìn của thân, ở cả hai đầu cuộn ngang (sticky). */
      function ends() {
        const edge = (sl) => { b.scrollLeft = sl; const xs = rows.map((r) => Math.round(r.querySelector('.ma-trow__end').getBoundingClientRect().right));
          return { one: new Set(xs).size === 1, inView: Math.max(...xs) <= q.left + b.clientWidth - parseFloat(getComputedStyle(b).paddingRight) + 0.5 }; };
        const keep = b.scrollLeft, out = [edge(0), edge(b.scrollWidth)]; b.scrollLeft = keep; return out;
      }
    });
    check('cây 25 cấp: thụt đều 12px mọi cấp, 25 vạch dưới tâm chevron (±0,5px, 1px trùng điểm ảnh), dài đúng các hàng con cháu',
      deep25.steps.length === 1 && deep25.steps[0] === deep25.step && deep25.step === 12 && deep25.guides === 25 && deep25.delta <= 0.5 && deep25.px === 0 && deep25.span <= 0.5, JSON.stringify(deep25));
    check('cây 25 cấp: tên sâu nhất ≥ 96px; thân cuộn ngang, trang không; file mở được cuộn ngang vào tầm nhìn', deep25.nameW >= 96 && deep25.bodyX > 0 && deep25.isX && deep25.sl > 0 && deep25.page === 0 && deep25.seen, JSON.stringify(deep25));
    check('cây 25 cấp: ⋯ mọi hàng một cột, dính mép phải thân khi cuộn ngang (không trôi giữa tấm, không bị cắt)', deep25.ends.every((e) => e.one && e.inView), JSON.stringify(deep25.ends));

    /* Cây nông (3 cấp, tên dài, 30 file: thanh cuộn dọc) ở 248px và 180px: thân không tràn ngang (cả 1px), tên dài cắt … ;
       ⋯ một cột cố định: cùng x, cùng cỡ, giữa hàng; chuột: ẩn ở hàng thường, hiện ở file mở và khi rê, huy hiệu vẫn hiện khi rê. */
    const shallow = async (w) => {
      await tp.evaluate((w) => document.documentElement.style.setProperty('--tree', w + 'px'), w);
      return tp.evaluate(async () => {
        const T = await import('./js/ui/tree.js'), noop = () => '';
        const nodes = [{ id: 'sd', parent: null, kind: 'dir', name: 'docs' }, { id: 'sg', parent: 'sd', kind: 'dir', name: 'guides' },
          { id: 'sf', parent: 'sg', kind: 'file', name: 'a-very-long-file-name-that-must-truncate-with-an-ellipsis.md' }];
        for (let i = 0; i < 30; i++) nodes.push({ id: 's' + i, parent: null, kind: 'file', name: 'file-' + i + (i % 4 ? '' : '-with-a-long-descriptive-name') + '.md' });
        T.renderTree({ sid: 'shallow', nodes, open: 'sf', collapsed: [], counts: { sf: { c: 12, rv: 40 }, s1: { c: 3 } }, title: 'Shallow' },
          { open: noop, toggle: noop, newFile: noop, newDir: noop, rename: noop, move: noop, remove: noop, importDir: noop, download: noop, collapseAll: noop });
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const b = document.getElementById('tree-body'), rows = [...document.querySelectorAll('#tree-list .ma-trow')];
        const mores = rows.map((r) => { const m = r.querySelector('.ma-trow__more').getBoundingClientRect(), q = r.getBoundingClientRect();
          return [+m.left.toFixed(1), m.width, +((m.top + m.height / 2) - (q.top + q.height / 2)).toFixed(1)]; });
        const sf = rows.find((r) => r.dataset.id === 'sf'), nm = sf.querySelector('.ma-trow__name');
        return { bodyX: b.scrollWidth - b.clientWidth, isX: b.classList.contains('is-x'), vbar: b.scrollHeight > b.clientHeight, xs: new Set(mores.map((m) => m[0])).size, ws: new Set(mores.map((m) => m[1])).size,
          dy: Math.max(...mores.map((m) => Math.abs(m[2]))), cut: nm.scrollWidth > nm.clientWidth && getComputedStyle(nm).textOverflow === 'ellipsis',
          selMore: getComputedStyle(sf.querySelector('.ma-trow__more')).opacity, idle: getComputedStyle(rows.find((r) => r.dataset.id === 's2').querySelector('.ma-trow__more')).opacity };
      });
    };
    for (const w of [248, 180]) {
      const sh = await shallow(w);
      check(`cây nông ${w}px: thân không tràn ngang, tên dài cắt …, ⋯ một cột cùng cỡ giữa hàng, hiện ở file mở, ẩn ở hàng thường`,
        sh.bodyX === 0 && !sh.isX && sh.vbar && sh.cut && sh.xs === 1 && sh.ws === 1 && sh.dy <= 0.5 && sh.selMore === '1' && sh.idle === '0', JSON.stringify(sh));
    }
    const hov = await tp.evaluate(() => { const r = [...document.querySelectorAll('#tree-list .ma-trow')].find((l) => l.dataset.id === 's1'); r.scrollIntoView({ block: 'center' }); const q = r.getBoundingClientRect(); return { x: q.left + 30, y: q.top + q.height / 2 }; });
    await tp.mouse.move(hov.x, hov.y); await tp.waitForTimeout(250);
    const hv = await tp.evaluate(() => { const r = [...document.querySelectorAll('#tree-list .ma-trow')].find((l) => l.dataset.id === 's1');
      const c = r.querySelector('.ma-trow__c'), m = r.querySelector('.ma-trow__more'); return { badge: getComputedStyle(c).visibility, cR: c.getBoundingClientRect().right, mL: m.getBoundingClientRect().left, more: getComputedStyle(m).opacity }; });
    check('cây nông: rê hàng có huy hiệu — ⋯ hiện, huy hiệu vẫn hiện, đứng trước ⋯', hv.more === '1' && hv.badge === 'visible' && hv.cR <= hv.mL, JSON.stringify(hv));
    await tp.mouse.move(600, 600);
    await tp.evaluate(() => document.documentElement.style.setProperty('--tree', '248px'));
    await tp.evaluate(treeDemo, false); await tp.waitForTimeout(150);

    // Bàn phím (mẫu tree WAI-ARIA) và vòng focus chỉ sau Tab (MDAN-020).
    await tp.click(row('archive'));
    const ring = await tp.$eval(row('archive'), (l) => getComputedStyle(l, '::before').outlineStyle);
    const tl = () => tp.evaluate(() => window.__tree.log.slice(-1)[0] || []);
    check('cây: bấm folder gập thì mở, không có vòng focus', (await tl())[0] === 'toggle' && ring === 'none' && (await tp.$eval(row('archive'), (l) => l.getAttribute('aria-expanded'))) === 'true', ring);
    await tp.keyboard.press('ArrowDown');
    check('cây: ↓ sang hàng con (old.md)', (await focusName(tp)) === 'old.md', await focusName(tp));
    const arrowRing = await tp.evaluate(() => [document.documentElement.classList.contains('ma-tabbing'), getComputedStyle(document.activeElement, '::before').outlineStyle]);
    check('cây: bấm hàng rồi ↓ — mũi tên là bàn phím, hàng có vòng focus (MDAN-020)', arrowRing[0] && arrowRing[1] === 'solid', JSON.stringify(arrowRing));
    await tp.keyboard.press('ArrowLeft');
    check('cây: ← ở file về folder cha', (await focusName(tp)) === 'archive', await focusName(tp));
    await tp.keyboard.press('ArrowLeft');
    check('cây: ← ở folder đang mở thì gập', (await tp.$eval(row('archive'), (l) => l.getAttribute('aria-expanded'))) === 'false' && (await focusName(tp)) === 'archive');
    await tp.keyboard.press('ArrowRight');
    check('cây: → ở folder gập thì mở', (await tp.$eval(row('archive'), (l) => l.getAttribute('aria-expanded'))) === 'true');
    await tp.keyboard.press('ArrowRight');
    check('cây: → ở folder đang mở thì vào con đầu', (await focusName(tp)) === 'old.md', await focusName(tp));
    await tp.keyboard.press('End');
    check('cây: End tới hàng cuối', (await focusName(tp)) === 'README.md', await focusName(tp));
    await tp.keyboard.press('Home');
    check('cây: Home tới hàng đầu', (await focusName(tp)) === 'archive', await focusName(tp));
    await tp.keyboard.press('r');
    check('cây: gõ chữ nhảy tới tên', (await focusName(tp)) === 'README.md', await focusName(tp));
    await tp.keyboard.press('Enter'); await tp.waitForTimeout(250);   // nền chuyển màu --dur
    const sel = await tp.$eval(row('README.md'), (l) => {
      const a = getComputedStyle(l, '::before'), r = l.getBoundingClientRect(), ic = l.querySelector('.ma-trow__ic').getBoundingClientRect();
      const L = r.left + parseFloat(a.left), R = r.right - parseFloat(a.right);
      l.classList.add('is-menu'); const mb = l.querySelector('.ma-trow__more').getBoundingClientRect(); l.classList.remove('is-menu');
      const bd = document.getElementById('tree-body'), vR = Math.min(R, bd.getBoundingClientRect().left + bd.clientWidth - parseFloat(getComputedStyle(bd).paddingRight));   // thẻ bị cắt ở mép thân khi cây cuộn ngang
      const moreIn = [mb.left - L, vR - mb.right, mb.top - (r.top + parseFloat(a.top)), r.bottom - parseFloat(a.bottom) - mb.bottom].map((v) => +v.toFixed(1));
      return { sel: l.getAttribute('aria-selected'), rowBg: getComputedStyle(l).backgroundColor, fill: a.backgroundColor, radius: parseFloat(a.borderTopLeftRadius),
        border: [a.borderTopWidth, a.borderRightWidth, a.borderBottomWidth, a.borderLeftWidth, a.borderTopStyle].join(' '), insetL: +(ic.left - L).toFixed(1), w: +(R - L).toFixed(1), rowW: r.width,
        bodyL: document.getElementById('tree-body').getBoundingClientRect().left, L, after: getComputedStyle(l, '::after').content, shadow: getComputedStyle(l).boxShadow, outline: [a.outlineStyle, a.boxShadow].join(' '), moreIn };
    });
    check('cây: Enter mở file, hàng thành thẻ chọn: bo, không viền, không vòng, nền nhạt, lùi vào trong (bắt đầu trước biểu tượng, không trọn hàng), hàng không tô, không vạch riêng, ⋯ gọn trong thẻ (lùi ≥ 2px mọi cạnh) (MDAN-060)',
      JSON.stringify(await tl()) === JSON.stringify(['open', ids['README.md']]) && sel.sel === 'true' && /rgba\(0, 0, 0, 0\)|transparent/.test(sel.rowBg) && !/, 0\)$|transparent/.test(sel.fill)
      && sel.radius >= 4 && sel.border === '0px 0px 0px 0px none' && / none$/.test(sel.outline) && sel.insetL > 0 && sel.insetL <= 12 && sel.w < sel.rowW - 8 && sel.L - sel.bodyL >= 8 && sel.after === 'none' && sel.shadow === 'none' && sel.moreIn.every((v) => v >= 2), JSON.stringify(sel));
    /* Tương phản trên hàng đang chọn (nền pha nhiều lớp): chữ ≥ 4,5:1, nền thẻ tách khỏi nền thân, cả hai theme. */
    const treeContrast = () => tp.evaluate(() => {
      const parse = (c) => { const m = c.match(/[\d.]+/g).map(Number); return c.startsWith('color(') ? [m[0] * 255, m[1] * 255, m[2] * 255, m.length > 3 ? m[3] : 1] : [m[0], m[1], m[2], m.length > 3 ? m[3] : 1]; };
      const over = (t, u) => [0, 1, 2].map((i) => t[i] * t[3] + u[i] * (1 - t[3])).concat(1);
      const bgOf = (el) => { const ch = []; for (let n = el; n; n = n.parentElement) ch.push(getComputedStyle(n).backgroundColor); let c = [255, 255, 255, 1]; ch.reverse().forEach((x) => { const v = parse(x); if (v[3] > 0) c = over(v, c); }); return c; };
      const lum = (c) => { const x = c.slice(0, 3).map((n) => { n /= 255; return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; }); return 0.2126 * x[0] + 0.7152 * x[1] + 0.0722 * x[2]; };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2); };
      const sel = document.querySelector('#tree-list .ma-trow[aria-selected="true"]'), out = {};
      /* Nền thẻ chọn (::before) trên nền thân; chữ trên nền thẻ; vạch thụt trên nền thân (trang trí, chỉ ghi số). */
      const cb = getComputedStyle(sel, '::before'), base = bgOf(sel), fill = over(parse(cb.backgroundColor), base);
      for (const [k, q] of [['name', '.ma-trow__name'], ['c', '.ma-trow__c'], ['rv', '.ma-trow__rv']]) { const el = sel.querySelector(q); if (el) { const bg = over(parse(getComputedStyle(el).backgroundColor), fill); out[k] = ratio(parse(getComputedStyle(el).color), bg); } }
      out.card = ratio(fill, base);
      const g = document.querySelector('#tree-guides .ma-tree__g');
      out.guide = g ? ratio(over(parse(getComputedStyle(g).backgroundColor), base), base) : 0;
      return out;
    });
    await tp.evaluate(() => { const m = window.__tree.model; m.counts[m.open] = { c: 3, rv: 42 }; window.__tree.render(); });
    for (const dark of [false, true]) {
      await tp.evaluate((d) => document.documentElement.classList.toggle('dark', d), dark); await tp.waitForTimeout(300);
      const tc = await treeContrast();
      check(`cây (${dark ? 'tối' : 'sáng'}): thẻ chọn — tên, huy hiệu ≥ 4,5:1, nền thẻ tách khỏi nền thân (≥ 1,12:1); vạch thụt thấy được (≥ 1,15:1)`, tc.name >= 4.5 && tc.c >= 4.5 && tc.rv >= 4.5 && tc.card >= 1.12 && tc.guide >= 1.15, JSON.stringify(tc));
    }
    await tp.evaluate(() => document.documentElement.classList.remove('dark'));
    const tabbed = await tp.evaluate(() => document.documentElement.classList.contains('ma-tabbing'));
    const tabIdx = await tp.$$eval('#tree-list .ma-trow', (ls) => ls.filter((l) => l.tabIndex === 0).length);
    check('cây: một hàng tabindex 0 (roving); đã dùng mũi tên thì hàng có vòng', tabIdx === 1 && tabbed && (await tp.$eval(row('README.md'), (l) => getComputedStyle(l, '::before').outlineStyle)) === 'solid');
    await tp.mouse.click(5, 5);
    check('cây: bấm chuột thì tắt vòng', !(await tp.evaluate(() => document.documentElement.classList.contains('ma-tabbing'))));

    await tp.focus('#tree-more'); await tp.keyboard.press('Tab');
    const kr = await tp.evaluate(() => [document.activeElement.classList.contains('ma-trow'), getComputedStyle(document.activeElement, '::before').outlineStyle]);
    check('cây: Tab vào cây tới hàng hiện tại, có vòng focus', kr[0] && kr[1] === 'solid' && (await focusName(tp)) === 'README.md', JSON.stringify(kr));
    // Đổi tên: F2, lỗi thì toast và vẫn sửa, Esc bỏ; bấm đúp; Enter lưu.
    const nameBox = (q) => tp.$eval(row('README.md'), (l, q) => { const e = l.querySelector(q), r = e.getBoundingClientRect(), cs = getComputedStyle(e);
      return { x: r.left, y: r.top, h: r.height, font: cs.font, ls: cs.letterSpacing, border: cs.borderTopWidth + cs.borderLeftWidth, outline: cs.outlineStyle, bg: cs.backgroundColor, shadow: cs.boxShadow, label: e.getAttribute('aria-label'), ring: getComputedStyle(l, '::before').outlineStyle }; }, q);
    const nb0 = await nameBox('.ma-trow__name');
    await tp.keyboard.press('F2');
    const nb1 = await nameBox('.ma-trow__ren');
    check('cây: ô đổi tên vô hình — cùng chỗ, cùng cao, cùng chữ với tên (±0,5px); không viền, không vòng (cả vòng Tab của hàng), không nền, không bóng; nhãn Rename …',
      Math.abs(nb1.x - nb0.x) <= 0.5 && Math.abs(nb1.y - nb0.y) <= 0.5 && Math.abs(nb1.h - nb0.h) <= 0.5 && nb1.font === nb0.font && nb1.ls === nb0.ls
      && nb1.border === '0px0px' && nb1.outline === 'none' && /rgba\(0, 0, 0, 0\)|transparent/.test(nb1.bg) && nb1.shadow === 'none' && nb1.ring === 'none' && nb1.label === 'Rename README.md', JSON.stringify([nb0, nb1]));
    const ren = () => tp.$eval('#tree-list', (ul) => { const i = ul.querySelector('.ma-trow__ren'); return i ? { v: i.value, f: document.activeElement === i, sel: i.value.slice(i.selectionStart, i.selectionEnd) } : null; });
    let rn = await ren();
    check('cây: F2 mở ô đổi tên, chọn phần tên trước đuôi', rn && rn.v === 'README.md' && rn.f && rn.sel === 'README', JSON.stringify(rn));
    const selBg = await tp.$eval('.ma-trow__ren', (i) => [getComputedStyle(i, '::selection').backgroundColor, getComputedStyle(document.body, '::selection').backgroundColor]);
    check('cây: vùng chọn khi đổi tên nhạt hơn vùng chọn chung (có alpha)', selBg[0] !== selBg[1] && /rgba?\(.*,\s*0?\.\d+\)|color\(srgb .* \/ 0?\.\d+\)/.test(selBg[0]), JSON.stringify(selBg));
    await tp.keyboard.type('a/b'); await tp.keyboard.press('Enter'); await tp.waitForTimeout(80);
    rn = await ren();
    check('cây: tên sai thì toast lỗi, vẫn đang sửa', rn && rn.f && (await tp.isVisible('#toast')) && /cannot/.test(await tp.textContent('#toast')), JSON.stringify(rn));
    await tp.keyboard.press('Escape');
    check('cây: Esc bỏ sửa, tên giữ, focus về hàng', !(await ren()) && (await focusName(tp)) === 'README.md');
    await tp.dblclick(row('old.md')); await tp.waitForTimeout(80);
    rn = await ren();
    check('cây: bấm đúp file mở ô đổi tên', rn && rn.v === 'old.md', JSON.stringify(rn));
    await tp.keyboard.press('Control+A'); await tp.keyboard.type('older.md'); await tp.keyboard.press('Enter'); await tp.waitForTimeout(80);
    check('cây: Enter lưu tên mới', !(await ren()) && (await nameOf(row('old.md'))) === 'older.md' && JSON.stringify(await tl()).includes('older.md'));
    const expOf = () => tp.$eval(row('archive'), (li) => li.getAttribute('aria-expanded'));
    const exp0 = await expOf();
    await tp.dblclick(row('archive')); await tp.waitForTimeout(120);
    rn = await ren();
    check('cây: bấm đúp folder mở ô đổi tên, folder giữ nguyên mở / gập', rn && rn.v === 'archive' && rn.f && (await expOf()) === exp0, JSON.stringify(rn) + ' ' + exp0 + '→' + (await expOf()));
    await tp.keyboard.press('Escape'); await tp.waitForTimeout(60);

    // Menu hàng: Move to… bỏ chính nó và hậu duệ; Top level gọi move(id, null).
    await tp.hover(row('level-3'));
    await tp.click(row('level-3') + ' >> .ma-trow__more'); await tp.waitForTimeout(80);
    const mi = () => tp.$$eval('#tree-menu .ma-menu__i', (bs) => bs.map((b) => b.textContent + (b.disabled ? '(x)' : '')));
    const m1 = await mi();
    check('cây: menu folder có New file here, Rename, Move to…, Delete; focus mục đầu', m1.join('|') === 'New file here|New folder here|Rename|Move to…|Download .zip|Delete' && (await tp.evaluate(() => document.activeElement.textContent)) === 'New file here', m1.join('|'));
    const cc = (await cornerClash(tp)).filter((x) => /tree|menu/.test(x));
    check('cây: thân cây và menu cuộn không chạm góc bo (MDAN-018)', !cc.length, cc.join(', '));
    await tp.click('#tree-menu >> text=Move to…'); await tp.waitForTimeout(50);
    const m2 = await mi();
    check('cây: Move to… liệt kê folder trừ chính nó và hậu duệ, folder hiện tại tắt', m2.join('|') === 'Back|Top level|archive|level-1|level-2(x)', m2.join('|'));
    await tp.click('#tree-menu >> text=Top level'); await tp.waitForTimeout(80);
    check('cây: chọn Top level gọi move(id, null), menu đóng', JSON.stringify(await tl()) === JSON.stringify(['move', await tp.evaluate(() => window.__tree.model.nodes.find((x) => x.name === 'level-3').id), null]) && !(await tp.isVisible('#tree-menu')));
    await tp.focus(row('old.md')); await tp.keyboard.press('Delete');
    check('cây: Delete gọi remove', (await tl())[0] === 'remove');
    await tp.focus(row('old.md')); await tp.keyboard.press('Shift+F10');
    const menuOpen = await tp.isVisible('#tree-menu');
    await tp.keyboard.press('Escape');
    check('cây: Shift+F10 mở menu, Esc đóng và trả focus', menuOpen && !(await tp.isVisible('#tree-menu')) && (await focusName(tp)) === 'older.md');

    // Collapse all, rồi kéo thả bằng chuột (mọi hàng trong khung, không cuộn): lên folder → move; lên hậu duệ → không gọi.
    await tp.click('#tree-more'); await tp.click('#tree-collapse');
    check('cây: Collapse all gọi collapseAll, chỉ còn hàng cấp 1', (await tl())[0] === 'collapseAll' && (await tp.$$eval('#tree-list .ma-trow', (ls) => ls.every((l) => l.getAttribute('aria-level') === '1'))));
    await tp.click(row('level-1') + ' .ma-trow__chev'); await tp.waitForTimeout(50);
    const nlog = () => tp.evaluate(() => window.__tree.log.length);
    await tp.dragAndDrop(row('README.md'), row('archive')); await tp.waitForTimeout(80);
    const mv = await tl();
    check('cây: kéo README.md thả lên archive gọi move', mv[0] === 'move' && mv[2] === (await tp.evaluate(() => window.__tree.model.nodes.find((x) => x.name === 'archive').id)), JSON.stringify(mv));
    const before = await nlog();
    await tp.dragAndDrop(row('level-1'), row('level-2')); await tp.waitForTimeout(80);
    check('cây: thả folder vào hậu duệ của nó thì không gọi move', (await nlog()) === before);
    // File từ máy thả lên một folder: importDir(…, folder); thả ở vùng trống: cấp trên cùng.
    const osDrop = (sel) => tp.evaluate((sel) => {
      const dt = new DataTransfer(); dt.items.add(new File(['# A'], 'a.md', { type: 'text/markdown' }));
      const el = document.querySelector(sel), r = el.getBoundingClientRect(), o = { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.left + 20, clientY: r.bottom - 4 };
      const over = el.dispatchEvent(new DragEvent('dragover', o));
      el.dispatchEvent(new DragEvent('drop', o));
      return { accepted: !over, last: window.__tree.log.slice(-1)[0] };
    }, sel);
    const od1 = await osDrop(row('archive')), od2 = await osDrop('#tree-list');
    check('cây: thả file từ máy lên folder / vùng trống gọi importDir đúng chỗ', od1.accepted && JSON.stringify(od1.last) === JSON.stringify(['importDir', ids.archive]) && JSON.stringify(od2.last) === JSON.stringify(['importDir', null]), JSON.stringify([od1, od2]));
    await tp.setViewportSize({ width: 1440, height: 900 }); await tp.waitForTimeout(150);
    check('cây: 1440 không tràn ngang', (await overflow(tp)) === 0, String(await overflow(tp)));
    await tctx.close();

    // Điện thoại 390: tấm trượt từ trái, chọn file thì đóng, cây về lưới.
    const tm = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const mp2 = await tm.newPage(); watch(mp2);
    await mp2.goto(BASE); await mp2.waitForFunction(() => window.marked && window.DOMPurify);
    await mp2.tap('#btn-sample'); await mp2.waitForTimeout(150);
    await mp2.evaluate(treeDemo, false); await mp2.waitForTimeout(150);
    check('cây 390: cột không hiện, nút có, không tràn ngang', !(await tstate(mp2)).shown && (await tstate(mp2)).btn && (await overflow(mp2)) === 0, String(await overflow(mp2)));
    await mp2.tap('#btn-tree'); await mp2.waitForTimeout(300);
    const sh = await mp2.evaluate(() => { const d = document.getElementById('dlg-tree'), r = document.getElementById('tree').getBoundingClientRect(), row = document.querySelector('#tree-list .ma-trow').getBoundingClientRect(), more = document.querySelector('#tree-list .ma-trow__more').getBoundingClientRect();
      return { open: d.open, inDlg: d.contains(document.getElementById('tree')), left: Math.round(r.left), w: Math.round(r.width), rowH: Math.round(row.height), more: Math.round(more.width), exp: document.getElementById('btn-tree').getAttribute('aria-expanded') }; });
    check('cây 390: nút mở tấm trượt từ mép trái, hàng ≥ 44px, ⋯ luôn hiện', sh.open && sh.inDlg && sh.left === 0 && sh.w <= 390 && sh.rowH >= 44 && sh.more >= 44 && sh.exp === 'true', JSON.stringify(sh));
    check('cây 390: tấm không tràn ngang', (await overflow(mp2)) === 0 && (await mp2.$eval('#dlg-tree', (d) => Math.max(d.scrollWidth - d.clientWidth, document.getElementById('tree').scrollWidth - document.getElementById('tree').clientWidth))) <= 0);
    await mp2.tap(row('README.md')); await mp2.waitForTimeout(300);
    const after = await mp2.evaluate(() => ({ open: document.getElementById('dlg-tree').open, home: document.getElementById('tree').parentNode === document.body, last: window.__tree.log.slice(-1)[0][0] }));
    check('cây 390: chạm file thì mở file, đóng tấm, cây về chỗ cũ (con của body)', !after.open && after.home && after.last === 'open', JSON.stringify(after));
    await tm.close();
  }

  /* ---------- Cây file nối vào phiên thật: phiên cũ nâng tại chỗ, file / folder mới, đổi tên, kéo chuyển, xoá + Undo,
     nhận xét tách theo file, prompt All files, nạp folder 7 tầng, .zip, Ctrl+B, tấm trượt ở điện thoại ---------- */
  {
    const fs = require('fs'), os = require('os'), path = require('path'), { spawnSync } = require('child_process');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-tree-'));
    const ready = (p) => p.waitForFunction(() => window.marked && window.DOMPurify);
    const paste = (p, t) => p.evaluate((t) => { const ta = document.getElementById('src-input'); ta.focus(); ta.dispatchEvent(new Event('paste')); ta.value = t; ta.dispatchEvent(new Event('input')); }, t);
    const rows = (p) => p.$$eval('#tree-list .ma-trow', (ls) => ls.map((l) => l.getAttribute('aria-level') + ':' + (l.querySelector('.ma-trow__name') || {}).textContent + (l.getAttribute('aria-selected') === 'true' ? '*' : '')));
    const rowOf = (name) => `#tree-list .ma-trow:has(> .ma-trow__name:text-is("${name}"))`;
    const comment = async (p, needle, text) => { await dragSelect(p, '#v-md', needle); await p.keyboard.type(text); await p.keyboard.press('Enter'); await p.waitForTimeout(150); };
    const marks = (p) => p.$$eval('#v-md mark.ma-hl', (ms) => ms.map((m) => m.textContent).join('|'));
    const treeOn = (p) => p.evaluate(() => !!document.getElementById('tree').getClientRects().length);
    const toastText = (p) => p.$eval('#toast', (t) => (t.hidden ? '' : t.textContent));

    // 1. Phiên cũ (chữ ở gốc, path là tên file): nâng tại chỗ thành một file; prompt y hệt từng byte như bản trước
    //    (chuỗi dưới đây chép từ bản trước khi có cây, cùng phiên này).
    const lc = await treeContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    const lp = await lc.newPage(); watch(lp);
    await lp.goto(BASE); await ready(lp);
    await lp.evaluate(async () => {
      const R = await import('./js/core/review.js'), B = await import('./js/core/blocks.js');
      const text = '# Cũ\n\nMột câu cũ.\n\nCâu hai còn đây.\n';
      const units = R.reviewUnits(text, B.lexSpans(text, (t) => window.marked.lexer(t, { gfm: true })));
      localStorage.setItem('md-annotate:s:leg1', JSON.stringify({ id: 'leg1', name: 'Phiên cũ', named: true, created: 1, updated: 2, header: '', footer: '', fmt: 'inline',
        includeDoc: false, lineNums: true, rvPrompt: true, path: 'notes/a.md', text,
        comments: [{ id: 'c1', quote: 'Một câu cũ.', comment: 'Viết gọn lại', origin: 'src', prefix: '', suffix: '', rel: 0.3, created: 1 }],
        reviews: [R.makeMark(units, 1)], rvPct: 33 }));
      localStorage.setItem('md-annotate:index:v1', JSON.stringify([{ id: 'leg1', name: 'Phiên cũ', created: 1, updated: 2, chars: text.length, count: 1, rv: 33 }]));
      localStorage.setItem('md-annotate:current', JSON.stringify('leg1'));
    });
    await lp.goto(BASE); await ready(lp); await lp.waitForTimeout(400);
    const OLD = 'Vị trí ghi dạng tệp:dòng, tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.\nĐã đọc kỹ: notes/a.md:3; chỗ nào không có nhận xét là ổn. Chưa đọc: notes/a.md:1, notes/a.md:5.\n\n1. notes/a.md:3 "Một câu cũ." — Viết gọn lại';
    check('phiên cũ: prompt y hệt từng byte sau khi nâng', (await out(lp)) === OLD, JSON.stringify(await out(lp)));
    await openOpts(lp); await lp.check('#inc-doc'); await lp.uncheck('#inc-doc'); await lp.waitForTimeout(500);   // một lần lưu
    const up = await lp.evaluate(() => { const s = JSON.parse(localStorage.getItem('md-annotate:s:leg1')); const d = s.docs && s.docs[s.open];
      return { nodes: s.nodes && s.nodes.map((n) => n.name), path: s.path, text: d && d.text, nc: d && d.comments.length, nrv: d && d.reviews.length, legacy: 'text' in s }; });
    check('phiên cũ: một file a.md, ô Folder là notes/, chữ, nhận xét, dấu đã đọc còn', up.nodes && up.nodes.join() === 'a.md' && up.path === 'notes/' && up.text === '# Cũ\n\nMột câu cũ.\n\nCâu hai còn đây.\n' && up.nc === 1 && up.nrv === 1
      && (await lp.inputValue('#p-path')) === 'notes/' && (await items(lp)).length === 1 && (await lp.textContent('#n-review')) === '33%', JSON.stringify([up, await lp.textContent('#n-review')]));
    check('phiên cũ: một file thì cây vẫn hiện sẵn (MDAN-061), nút có', (await treeOn(lp)) && (await lp.isVisible('#btn-tree')));
    await lc.close();

    // 2. Hai file: file mới, đổi tên, nhận xét tách theo file, chuyển file giữ chế độ xem, prompt All files.
    const fc = await treeContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', acceptDownloads: true });
    const fp = await fc.newPage(); watch(fp);
    await fp.goto(BASE); await ready(fp);
    await paste(fp, '# Tệp A\n\nCâu riêng của A.\n'); await fp.waitForTimeout(200);
    await fp.click('.ma-tab[data-view="view"]');
    await comment(fp, 'Câu riêng của A.', 'sửa A');
    await fp.evaluate(() => document.activeElement && document.activeElement.blur());
    const on0 = await treeOn(fp), r0 = (await rows(fp)).join();
    await fp.keyboard.press('Control+B'); await fp.waitForTimeout(150);
    const off = !(await treeOn(fp));
    await fp.keyboard.press('Control+B'); await fp.waitForTimeout(150);
    check('cây thật: cây một file hiện sẵn; Ctrl+B ẩn, lần nữa hiện', on0 && r0 === '1:untitled.md*' && off && (await treeOn(fp)), JSON.stringify([on0, r0, off]));
    await fp.click('#tree-new-file'); await fp.waitForTimeout(150);
    const ren = await fp.evaluate(() => { const i = document.querySelector('#tree-list .ma-trow__ren'); return i && document.activeElement === i ? i.value : null; });
    await fp.keyboard.press('Control+A'); await fp.keyboard.type('b.md'); await fp.keyboard.press('Enter'); await fp.waitForTimeout(150);
    check('cây thật: New file tạo untitled-2.md, mở nó, đổi tên tại chỗ thành b.md', ren === 'untitled-2.md' && (await rows(fp)).join() === '1:b.md*,1:untitled.md' && (await fp.inputValue('#src-input')) === '' && (await fp.isVisible('#start')), JSON.stringify([ren, await rows(fp)]));
    await paste(fp, '# Tệp B\n\nCâu riêng của B.\n'); await fp.waitForTimeout(200);
    await comment(fp, 'Câu riêng của B.', 'sửa B');
    check('cây thật: file B có nhận xét của nó', (await items(fp)).length === 1 && /sửa B/.test((await items(fp))[0]) && (await marks(fp)) === 'Câu riêng của B.', JSON.stringify([await items(fp), await marks(fp)]));
    await fp.click('.ma-tab[data-view="src"]');
    await fp.click(rowOf('untitled.md')); await fp.waitForTimeout(200);
    const swA = { items: await items(fp), mode: await fp.$eval('#views', (v) => v.dataset.mode), src: await fp.$eval('#v-src', (e) => e.textContent), cnt: await fp.$eval(rowOf('b.md'), (l) => l.getAttribute('aria-label')) };
    check('cây thật: sang file A — chỉ nhận xét của A, vẫn ở Source, cây đếm nhận xét của B', swA.items.length === 1 && /sửa A/.test(swA.items[0]) && swA.mode === 'src' && swA.src.startsWith('# Tệp A') && /1 comment/.test(swA.cnt), JSON.stringify(swA));
    await fp.click('.ma-tab[data-view="view"]'); await fp.click(rowOf('b.md')); await fp.waitForTimeout(200);
    check('cây thật: về file B — highlight của B, không của A', (await marks(fp)) === 'Câu riêng của B.' && (await items(fp)).length === 1, await marks(fp));
    await openOpts(fp);
    check('cây thật: hai file thì có ô All files', await fp.isVisible('#all-row'));
    const one = await out(fp);
    await fp.check('#p-all'); await fp.waitForTimeout(100);
    const all = await out(fp);
    check('cây thật: All files gom cả hai file, nhãn từng file, số chạy tiếp', !/untitled\.md/.test(one) && /## Tệp b\.md\n\n1\. b\.md:3 "Câu riêng của B\." — sửa B/.test(all) && /## Tệp untitled\.md\n\n2\. untitled\.md:3 "Câu riêng của A\." — sửa A/.test(all) && /all files/.test(await fp.textContent('#opts-sum')), JSON.stringify([one, all]));
    check('cây thật: Comments chỉ liệt kê file đang mở, chân panel đếm cả hai', (await items(fp)).length === 1 && /2 comments/.test(await fp.textContent('#foot-n')));

    // Folder mới, kéo b.md vào folder, nhãn prompt theo đường dẫn mới; xoá folder rồi Undo.
    await fp.click(rowOf('untitled.md')); await fp.waitForTimeout(150);
    await fp.click('#tree-new-dir'); await fp.waitForTimeout(150);
    await fp.keyboard.press('Control+A'); await fp.keyboard.type('docs'); await fp.keyboard.press('Enter'); await fp.waitForTimeout(150);
    await fp.dragAndDrop(rowOf('b.md'), rowOf('docs')); await fp.waitForTimeout(250);
    check('cây thật: kéo b.md thả lên docs — chuyển vào folder, prompt ghi docs/b.md', (await rows(fp)).join() === '1:docs,2:b.md,1:untitled.md*' && /## Tệp docs\/b\.md\n\n1\. docs\/b\.md:3/.test(await out(fp)) && /Moved b\.md to docs/.test(await toastText(fp)), JSON.stringify([await rows(fp), await toastText(fp)]));
    await fp.click(rowOf('b.md')); await fp.waitForTimeout(150);
    await fp.focus(rowOf('docs')); await fp.keyboard.press('Delete'); await fp.waitForTimeout(200);
    const del = { rows: await rows(fp), toast: await toastText(fp), items: await items(fp) };
    check('cây thật: xoá folder đang chứa file mở — không hỏi, mở file kế bên, toast có Undo', del.rows.join() === '1:untitled.md*' && del.toast.startsWith('Deleted folder docs (1 file).') && /sửa A/.test(del.items.join()) && await fp.isVisible('.ma-toast__btn'), JSON.stringify(del));
    await fp.click('.ma-toast__btn'); await fp.waitForTimeout(250);
    check('cây thật: Undo trả folder, file và nhận xét, mở lại file cũ', (await rows(fp)).join() === '1:docs,2:b.md*,1:untitled.md' && /sửa B/.test((await items(fp)).join()) && /docs\/b\.md:3 "Câu riêng của B\." — sửa B/.test(await out(fp)), JSON.stringify(await rows(fp)));
    await fp.click(rowOf('untitled.md')); await fp.waitForTimeout(150);
    await fp.fill('#p-path', 'repo/'); await fp.waitForTimeout(100);
    check('cây thật: ô Folder là tiền tố của mọi nhãn', /## Tệp repo\/docs\/b\.md/.test(await out(fp)) && /repo\/untitled\.md:3/.test(await out(fp)));
    await fp.fill('#p-path', '');

    // Mở file từ đĩa khi file đang mở có chữ: thêm cạnh nó (cùng folder) và mở; không ghi ô Folder.
    await fp.click(rowOf('b.md')); await fp.waitForTimeout(150);
    await fp.setInputFiles('#file-in', { name: 'c.md', mimeType: 'text/markdown', buffer: Buffer.from('# C\n\nCâu của C.\n') });
    await fp.waitForTimeout(300);
    check('cây thật: mở file từ đĩa thêm vào cùng folder với file đang mở', (await rows(fp)).join() === '1:docs,2:b.md,2:c.md*,1:untitled.md' && (await fp.inputValue('#p-path')) === '' && (await items(fp)).length === 0, JSON.stringify(await rows(fp)));

    // Tải: một file .md, folder .zip, cả phiên .zip (đọc bằng Python zipfile).
    const dl = async (fn) => { const [d] = await Promise.all([fp.waitForEvent('download'), fn()]); const f = path.join(tmp, d.suggestedFilename()); await d.saveAs(f); return f; };
    const fmd = await dl(async () => { await fp.click(rowOf('c.md'), { button: 'right' }); await fp.click('#tree-menu >> text=Download'); });
    check('cây thật: Download một file — tên và chữ của nó', path.basename(fmd) === 'c.md' && fs.readFileSync(fmd, 'utf8') === '# C\n\nCâu của C.\n');
    const zipCheck = (f) => { const r = spawnSync('python3', ['-I', '-c', 'import sys, json, zipfile\nz = zipfile.ZipFile(sys.argv[1])\nprint(json.dumps({"bad": z.testzip(), "names": z.namelist(), "b": z.read(z.namelist()[0]).decode()}))', f]); try { return JSON.parse(r.stdout.toString()); } catch (e) { return { err: r.stderr.toString() }; } };
    const fz = await dl(async () => { await fp.click(rowOf('docs'), { button: 'right' }); await fp.click('#tree-menu >> text=Download .zip'); });
    const zd = zipCheck(fz);
    check('cây thật: Download .zip của folder — zip hợp lệ, chỉ cây con', path.basename(fz) === 'docs.zip' && zd.bad === null && zd.names.join() === 'docs/b.md,docs/c.md' && zd.b === '# Tệp B\n\nCâu riêng của B.\n', JSON.stringify([path.basename(fz), zd]));
    const fa = await dl(async () => { await fp.click('#tree-more'); await fp.click('#tree-zip'); });
    const za = zipCheck(fa);
    check('cây thật: .zip cả phiên — tên theo tên phiên, đủ file', /^[a-z0-9-]+\.zip$/.test(path.basename(fa)) && za.bad === null && za.names.join() === 'docs/b.md,docs/c.md,untitled.md', JSON.stringify([path.basename(fa), za]));

    // History: hàng ghi số file; mở lại phiên vẽ lại cây.
    await fp.click('#btn-hist');
    check('cây thật: History ghi "3 files"', /3 files ·/.test(await fp.textContent('#hist-list .ma-row.is-cur')), await fp.textContent('#hist-list .ma-row.is-cur'));
    await fp.keyboard.press('Escape');
    await fp.keyboard.press('Control+B'); await fp.waitForTimeout(150);
    check('cây thật: Ctrl+B ẩn cây, nhớ prefs.tree', !(await treeOn(fp)) && (await fp.evaluate(() => JSON.parse(localStorage.getItem('md-annotate:prefs:v1')).tree)) === false);

    // 3. Nạp folder 7 tầng (ô chọn folder): bỏ mục ẩn, node_modules, ảnh, file > 1 MB; phiên trống thì folder là cả phiên.
    const root = path.join(tmp, 'proj');
    const put = (rel, data) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), data); };
    put('a/b/c/d/e/f/g/deep.md', '# Sâu\n\nCâu ở tầng bảy.\n'); put('readme.md', '# Proj\n'); put('notes.txt', 'plain\n');
    put('.git/config.md', 'x'); put('node_modules/m/readme.md', 'x'); put('logo.png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2, 3])); put('big.md', 'x'.repeat(1100000));
    await fp.click('#btn-new'); await fp.waitForTimeout(150);
    await fp.setInputFiles('#tree-dir-in', root); await fp.waitForTimeout(600);
    const imp = { rows: await rows(fp), toast: await toastText(fp), title: await fp.textContent('#tree-title'), on: await treeOn(fp) };
    check('nạp folder: phiên trống thành folder proj, 9 tầng, tên phiên, cây hiện', imp.rows.join() === '1:proj,2:a,3:b,4:c,5:d,6:e,7:f,8:g,9:deep.md,2:notes.txt,2:readme.md*' && imp.title === 'proj' && imp.on, JSON.stringify(imp));
    check('nạp folder: toast "Imported 3 files, skipped 2." (ẩn và node_modules bỏ không đếm)', imp.toast === 'Imported 3 files, skipped 2.', imp.toast);
    check('nạp folder: readme.md (nông nhất, README trước) mở ở chế độ đọc (MDAN-031)', (await fp.isVisible('#v-md h1')) && (await fp.textContent('#v-md h1')) === 'Proj' && imp.rows.includes('2:readme.md*'), JSON.stringify(imp.rows));
    check('nạp folder: cây hiện mà không ghi prefs.tree (MDAN-032)', imp.on && (await fp.evaluate(() => JSON.parse(localStorage.getItem('md-annotate:prefs:v1')).tree)) === false);
    await fp.setInputFiles('#tree-dir-in', path.join(root, 'a', 'b', 'c')); await fp.waitForTimeout(500);
    check('nạp folder lần hai: vào gốc cạnh proj, file mở giữ nguyên', (await rows(fp)).slice(0, 2).join() === '1:c,2:d' && (await rows(fp)).some((r) => r.endsWith('readme.md*')), JSON.stringify(await rows(fp)));
    await fp.reload(); await ready(fp); await fp.waitForTimeout(200);
    check('nạp folder: tải lại vẫn còn cây và file mở; cây theo prefs.tree (ẩn)', (await rows(fp)).filter((r) => r.endsWith('*')).join() === '2:readme.md*' && (await fp.textContent('#v-md h1')) === 'Proj' && !(await treeOn(fp)), JSON.stringify(await rows(fp)));
    check('cây thật: 1440 không tràn ngang', (await overflow(fp)) === 0);
    await fc.close();

    // 4. Điện thoại 390: tấm trượt trái với phiên thật, chạm file thì mở, đóng tấm.
    const mc = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const mp3 = await mc.newPage(); watch(mp3);
    await mp3.goto(BASE); await ready(mp3);
    await mp3.setInputFiles('#tree-dir-in', path.join(root, 'a', 'b', 'c', 'd', 'e')); await mp3.waitForTimeout(500);
    check('điện thoại: nạp folder, cây không chiếm cột, không tràn ngang', !(await treeOn(mp3)) && (await overflow(mp3)) === 0);
    await mp3.tap('#btn-tree'); await mp3.waitForTimeout(300);
    const msh = await mp3.evaluate(() => ({ open: document.getElementById('dlg-tree').open, n: document.querySelectorAll('#dlg-tree .ma-trow').length }));
    check('điện thoại: tấm trượt có cây thật', msh.open && msh.n === 4, JSON.stringify(msh));
    await mp3.evaluate(() => { const r = [...document.querySelectorAll('#tree-list .ma-trow')].find((l) => l.textContent.includes('deep.md')); r.scrollIntoView(); });
    await mp3.tap(rowOf('deep.md')); await mp3.waitForTimeout(300);
    check('điện thoại: chạm file thì mở nó, đóng tấm', !(await mp3.evaluate(() => document.getElementById('dlg-tree').open)) && /Câu ở tầng bảy/.test(await mp3.textContent('#v-md')));
    await mc.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  /* ---------- Cây docked hay tấm trượt (MDAN-061): cột trái ở mọi khổ trừ điện thoại, hiện sẵn, không tự ẩn khi chật;
     điện thoại (≤ 720px) thì tấm trượt trái, đóng sẵn. Split theo #doc thật: cột chiếm chỗ thì lùi về Preview. ---------- */
  {
    /* Phiên thật hai file; prefs: chế độ đọc, panel thu gọn; prefs.tree chưa chọn (mặc định hiện vì ≥ 2 mục). */
    const seed = ([view, rail, extra]) => {
      const text = '# Doc\n\n' + Array.from({ length: 30 }, (_, i) => 'Paragraph ' + i + ' with enough words to wrap across the preview line.').join('\n\n');
      const s = { id: 'dk1', name: 'Dock', named: true, created: 1, updated: 2, open: 'a', collapsed: [],
        nodes: [{ id: 'a', parent: null, kind: 'file', name: 'a.md' }, { id: 'b', parent: null, kind: 'file', name: 'b.md' }],
        docs: { a: { text, comments: [], reviews: [] }, b: { text: '# B\n\nSecond file.\n', comments: [], reviews: [] } } };
      localStorage.setItem('md-annotate:s:dk1', JSON.stringify(s));
      localStorage.setItem('md-annotate:index:v1', JSON.stringify([{ id: 'dk1', name: 'Dock', created: 1, updated: 2, chars: 10, count: 0 }]));
      localStorage.setItem('md-annotate:current', JSON.stringify('dk1'));
      localStorage.setItem('md-annotate:prefs:v1', JSON.stringify({ view, rail, ...(extra || {}) }));
    };
    const dst = (p) => p.evaluate(() => {
      const b = document.getElementById('btn-tree'), t = document.getElementById('tree'), d = document.getElementById('doc');
      return { dock: document.documentElement.classList.contains('ma-tree-on'), col: !!t.getClientRects().length && t.parentNode === document.body,
        doc: d.clientWidth, w: Math.round(t.getBoundingClientRect().width), mode: document.getElementById('views').dataset.mode, lbl: b.title, aria: b.getAttribute('aria-label'),
        exp: b.getAttribute('aria-expanded'), pop: b.getAttribute('aria-haspopup'), drawer: document.getElementById('dlg-tree').open,
        pref: JSON.parse(localStorage.getItem('md-annotate:prefs:v1') || '{}').tree };
    });
    /* Mở trang với phiên trên; init: script chạy trước mọi script của trang (đo chớp). */
    const at = async (w, view, rail, extra, init) => {
      const c = await treeContext({ viewport: { width: w, height: 900 }, colorScheme: 'light' });
      const p = await c.newPage(); watch(p);
      await p.goto(BASE); await p.evaluate(seed, [view, rail, extra]);
      if (init) await p.addInitScript(init);
      await p.goto(BASE); await p.waitForFunction(() => window.marked && window.DOMPurify); await p.waitForTimeout(250);
      return { c, p };
    };
    const docked = (s) => s.dock && s.col && s.lbl === 'Hide files' && s.aria === 'Hide files' && s.exp === 'true' && s.pop === null;
    const drawer = (s) => !s.dock && !s.col && s.lbl === 'Files' && s.aria === 'Files' && s.pop === 'dialog' && s.exp === String(s.drawer);

    let { c, p } = await at(2560, 'split', false);
    let s = await dst(p);
    check('cây docked: 2560 Split, panel mở — cột cạnh Split (#doc ≥ 849)', docked(s) && s.mode === 'split' && s.doc >= 849 && (await overflow(p)) === 0, JSON.stringify(s));
    // Settings: vùng làm việc 50% thì #doc hẹp: cây vẫn là cột (không tự ẩn), Split lùi về Preview; Auto thì Split về.
    const range = (v) => p.evaluate((v) => { const r = document.getElementById('set-wrap'); r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); }, v);
    await p.click('#btn-layout'); await range(50); await p.waitForTimeout(150);
    const s50 = await dst(p);
    await p.keyboard.press('Escape'); await p.evaluate(() => { const x = JSON.parse(localStorage.getItem('md-annotate:prefs:v1')); delete x.wrap; localStorage.setItem('md-annotate:prefs:v1', JSON.stringify(x)); });
    await p.reload(); await p.waitForFunction(() => window.marked && window.DOMPurify); await p.waitForTimeout(200);
    check('cây docked: Settings bề rộng 50% — vẫn là cột, Split lùi về Preview; Auto thì Split về', docked(s50) && s50.mode === 'view' && docked(await dst(p)) && (await dst(p)).mode === 'split', JSON.stringify(s50));
    await c.close();

    /* Đo chớp khi nạp (dùng ở dưới). */
    const spy = () => {
      window.__seen = false;
      new MutationObserver(() => { if (document.documentElement && document.documentElement.classList.contains('ma-tree-on')) window.__seen = true; })
        .observe(document, { attributes: true, attributeFilter: ['class'], subtree: true });
      document.addEventListener('DOMContentLoaded', () => { window.__dcl = document.documentElement.classList.contains('ma-tree-on'); });
    };
    /* Cột ở mép trái màn hình (MDAN-037): x = 0, từ đáy thanh trên tới đáy khung nhìn (≤ 1080px: tới đỉnh thanh đáy); vùng
       làm việc căn giữa phần còn lại, phần trong thanh trên thẳng hàng với nó, nền thanh trên trọn bề ngang; không đè panel,
       dải tiến độ; thanh trên nằm trên cây. */
    const geo = (p) => p.evaluate(() => {
      const R = (el) => el.getBoundingClientRect(), cw = document.documentElement.clientWidth, tree = document.getElementById('tree');
      const t = R(tree), m = R(document.querySelector('main')), bin = R(document.querySelector('.ma-bar__in')), bar = R(document.querySelector('.ma-bar'));
      const pn = document.getElementById('panel'), mm = [...document.querySelectorAll('.ma-mm')].filter((x) => x.getClientRects().length).map((x) => R(x).left);
      const dock = document.getElementById('dock'), dk = dock.getClientRects().length ? R(dock).top : null;
      const hit = document.elementFromPoint(t.left + t.width / 2, t.top + t.height / 2), top = document.elementFromPoint(t.left + 10, bar.top + 10);
      return { tl: t.left, tt: t.top, tb: t.bottom, tr: t.right, barB: bar.bottom, barL: bar.left, barW: bar.width, vh: innerHeight, cw,
        gapL: m.left - t.right, gapR: cw - m.right, binL: bin.left - m.left, binR: bin.right - m.right, panelL: pn.getClientRects().length ? R(pn).left : null,
        mm, dockT: dk, inTree: tree.contains(hit), barOver: !!top && !!top.closest('.ma-bar'), ov: document.documentElement.scrollWidth - cw };
    });
    const edgeOK = (g) => g.tl === 0 && Math.abs(g.tt - g.barB) <= 0.5 && (g.dockT == null ? g.tb === g.vh : g.tb <= g.dockT) && Math.abs(g.gapL - g.gapR) <= 1
      && Math.abs(g.binL) <= 1 && Math.abs(g.binR) <= 1 && g.barL === 0 && g.barW === g.cw && (g.panelL == null || g.panelL >= g.tr) && g.mm.every((x) => x >= g.tr)
      && g.inTree && g.barOver && g.ov === 0;

    for (const w of [1920, 2560]) {
      ({ c, p } = await at(w, 'split', false));
      s = await dst(p);
      const g = await geo(p);
      check(`cây docked ${w}: Split, panel mở — cột ở mép trái (x = 0), từ đáy thanh trên tới đáy khung nhìn; vùng làm việc căn giữa phần còn lại; thanh trên thẳng hàng; không đè panel, dải tiến độ`,
        docked(s) && s.mode === 'split' && s.doc === (w === 1920 ? 854 : 1192) && edgeOK(g), JSON.stringify({ s, g }));
      await p.click('.ma-tab[data-view="view"]'); await p.waitForTimeout(200);
      const gv = await geo(p);
      check(`cây docked ${w}: Preview (trang cuộn) — vẫn ở mép trái, trọn chiều cao, dải tiến độ không chạm cây`, edgeOK(gv) && gv.mm.length > 0, JSON.stringify(gv));
      await p.evaluate(() => window.scrollTo(0, 600)); await p.waitForTimeout(100);
      const gs = await geo(p);
      check(`cây docked ${w}: cuộn trang thì cây đứng yên dưới thanh trên`, gs.tt === gv.tt && gs.tb === gv.tb && gs.tl === 0, JSON.stringify(gs));
      await c.close();
    }

    // 1440 Split, panel mở: cây vẫn là cột ngay từ lúc nạp (trước DOMContentLoaded), #doc 766 không đủ Split nên hiện Preview,
    // prefs.view vẫn 'split'; tab Split ẩn.
    ({ c, p } = await at(1440, 'split', false, null, spy));
    s = await dst(p);
    check('cây docked: 1440 Split, panel mở — vẫn là cột (không tự ẩn), Preview thay Split, tab Split ẩn', docked(s) && s.mode === 'view' && s.doc === 766
      && (await p.isHidden('#tab-split')) && (await overflow(p)) === 0, JSON.stringify(s));
    check('cây docked: 1440 lúc nạp — đã docked trước DOMContentLoaded', (await p.evaluate(() => window.__dcl)) === true);
    // Ctrl+B ẩn cột (lưu prefs.tree = false): #doc rộng ra, Split về; lần nữa hiện lại, Split lùi.
    await p.evaluate(() => document.activeElement && document.activeElement.blur());
    await p.keyboard.press('Control+B'); await p.waitForTimeout(200);
    s = await dst(p);
    check('cây docked: Ctrl+B ẩn cột, lưu prefs.tree = false, Split về (#doc 854)', !s.dock && s.pref === false && s.lbl === 'Show files' && s.exp === 'false' && s.mode === 'split' && s.doc === 854, JSON.stringify(s));
    await p.click('#btn-tree'); await p.waitForTimeout(200);
    s = await dst(p);
    check('cây docked: nút Files hiện lại cột, prefs.tree = true, Split lùi về Preview', docked(s) && s.pref === true && s.mode === 'view', JSON.stringify(s));
    // Thu panel thành thanh dọc: #doc 1070 cạnh cây, Split về.
    await p.click('#btn-rail'); await p.waitForTimeout(200);
    s = await dst(p);
    check('cây docked: 1440 thanh dọc — cột cạnh Split (#doc 1070)', docked(s) && s.mode === 'split' && s.doc === 1070 && edgeOK(await geo(p)), JSON.stringify(s));
    await p.click('#btn-unrail'); await p.waitForTimeout(200);
    // Đổi cỡ cửa sổ ở mọi khổ trên 720px: vẫn là cột.
    for (const w of [1920, 1024, 800]) {
      await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(250);
      s = await dst(p);
      check(`cây docked: đổi cỡ cửa sổ ${w} — vẫn là cột, không tấm trượt`, docked(s) && !s.drawer && (await overflow(p)) === 0, JSON.stringify(s));
    }
    await c.close();

    // Phiên một file, prefs.tree chưa chọn: vẫn hiện sẵn.
    ({ c, p } = await at(1440, 'view', false));
    await p.evaluate(() => { const k = 'md-annotate:s:dk1', s = JSON.parse(localStorage.getItem(k)); s.nodes = s.nodes.slice(0, 1); delete s.docs.b; localStorage.setItem(k, JSON.stringify(s)); });
    await p.reload(); await p.waitForFunction(() => window.marked && window.DOMPurify); await p.waitForTimeout(250);
    s = await dst(p);
    check('cây docked: phiên một file, chưa chọn ẩn / hiện — cây hiện sẵn', docked(s) && s.pref === undefined, JSON.stringify(s));
    await c.close();

    ({ c, p } = await at(1440, 'view', false));
    s = await dst(p);
    check('cây docked: 1440 Preview — cột cạnh Preview, #doc 766', docked(s) && s.mode === 'view' && s.doc === 766 && edgeOK(await geo(p)), JSON.stringify(s));
    // Kéo mép cây: tới trần 420px, vùng làm việc vẫn căn giữa phần còn lại.
    let gb = await p.$eval('#tree-grip', (g) => { const r = g.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await p.mouse.move(gb.x, gb.y); await p.mouse.down(); await p.mouse.move(gb.x + 200, gb.y, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(150);
    s = await dst(p);
    check('cây docked: 1440 kéo mép rộng thêm 200px dừng ở 420px, #doc 594, vẫn ở mép trái, căn giữa', docked(s) && s.w === 420 && s.doc === 594 && edgeOK(await geo(p)), JSON.stringify(s));
    await c.close();

    // 1280 Preview: kéo mép không bị chặn bởi chỗ còn lại (tới 420px), cây vẫn là cột.
    ({ c, p } = await at(1280, 'view', false));
    s = await dst(p);
    check('cây docked: 1280 Preview — #doc 606', docked(s) && s.doc === 606 && edgeOK(await geo(p)), JSON.stringify(s));
    gb = await p.$eval('#tree-grip', (g) => { const r = g.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await p.mouse.move(gb.x, gb.y); await p.mouse.down(); await p.mouse.move(gb.x + 200, gb.y, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(150);
    s = await dst(p);
    check('cây docked: 1280 kéo mép rộng thêm 200px tới 420px, vẫn docked, không tràn ngang', docked(s) && s.w === 420 && (await overflow(p)) === 0, JSON.stringify(s));
    await c.close();

    // 1024 (panel ra khỏi lưới): cột ở mép trái, dừng trên thanh đáy.
    ({ c, p } = await at(1024, 'view', false));
    s = await dst(p);
    const g10 = await geo(p);
    check('cây docked: 1024 Preview — cột ở mép trái, dừng trên thanh đáy, không tràn ngang', docked(s) && s.doc === 726 && edgeOK(g10) && g10.dockT != null, JSON.stringify({ s, g10 }));
    await c.close();

    // Điện thoại 390: tấm trượt, đóng sẵn (cả khi prefs.tree = true), không tràn ngang.
    for (const extra of [null, { tree: true }]) {
      const pc = await treeContext({ viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true });
      const pp = await pc.newPage(); watch(pp);
      await pp.goto(BASE); await pp.evaluate(seed, ['view', false, extra]); await pp.goto(BASE); await pp.waitForFunction(() => window.marked && window.DOMPurify); await pp.waitForTimeout(250);
      const sp = await dst(pp);
      check(`cây 390${extra ? ' (prefs.tree = true)' : ''}: tấm trượt, đóng sẵn, không tràn ngang`, drawer(sp) && !sp.drawer && sp.exp === 'false' && (await overflow(pp)) === 0, JSON.stringify(sp));
      await pc.close();
    }
  }

  /* ---------- Nút Files và tấm trượt theo vùng an toàn (MDAN-060): nút luôn ở mép trái thanh trên (lề --pad + vùng an toàn trái),
     tên trang thẳng hàng vùng làm việc, hẹp thì đứng sau nút một khoảng gap; docked thì nút nằm trên cột cây, phần thanh trên
     trên cột cùng nền với cột; tấm trượt: đầu dưới vùng an toàn trên, hàng không dưới vùng an toàn trái, thân trên vùng an toàn dưới. ---------- */
  {
    const seed = () => {
      const N = [{ id: 'd', parent: null, kind: 'dir', name: 'docs' }, { id: 'g', parent: 'd', kind: 'dir', name: 'guides' }], docs = {};
      const f = (id, parent, name) => { N.push({ id, parent, kind: 'file', name }); docs[id] = { text: '# ' + name + '\n\n' + 'Words in a paragraph. '.repeat(30) + '\n', comments: [], reviews: [], real: true }; };
      f('a', 'g', 'deep-file-with-a-long-name.md'); f('b', 'd', 'overview.md'); f('c', null, 'README.md');
      localStorage.setItem('md-annotate:s:sa1', JSON.stringify({ id: 'sa1', name: 'Safe', named: true, created: 1, updated: 2, nodes: N, docs, open: 'a', collapsed: [] }));
      localStorage.setItem('md-annotate:current', JSON.stringify('sa1'));
      localStorage.setItem('md-annotate:prefs:v1', JSON.stringify({ view: 'view', rail: false }));
    };
    const open = async (vp, touch, inset) => {
      const c = await treeContext({ viewport: vp, hasTouch: !!touch, isMobile: !!touch, colorScheme: 'light' });
      const p = await c.newPage(); watch(p);
      let ok = true;
      if (inset) { const cdp = await c.newCDPSession(p); await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: inset }).catch(() => { ok = false; }); }
      await p.goto(BASE); await p.evaluate(seed); await p.goto(BASE); await p.waitForFunction(() => window.marked && window.DOMPurify); await p.waitForTimeout(250);
      if (inset) ok = ok && (await p.evaluate(() => { const x = document.createElement('i'); x.style.cssText = 'position:fixed;padding-top:env(safe-area-inset-top);padding-left:env(safe-area-inset-left)'; document.body.append(x); const v = parseFloat(getComputedStyle(x).paddingTop) + parseFloat(getComputedStyle(x).paddingLeft); x.remove(); return v > 0; }));
      return { c, p, ok };
    };
    const bar = (p) => p.evaluate(() => {
      const R = (q) => document.querySelector(q).getBoundingClientRect(), bin = document.querySelector('.ma-bar__in'), cs = getComputedStyle(bin);
      const tg = R('#btn-tree'), br = R('.ma-brand'), m = R('main'), t = document.getElementById('tree'), on = document.documentElement.classList.contains('ma-tree-on');
      const pad = parseFloat(cs.paddingRight), gap = parseFloat(cs.columnGap);
      const padTok = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pad'));   // lề phải còn gồm vùng an toàn phải (mobile.css)
      const inset = (() => { const x = document.createElement('i'); x.style.cssText = 'position:fixed;padding-left:env(safe-area-inset-left)'; document.body.append(x); const v = parseFloat(getComputedStyle(x).paddingLeft); x.remove(); return v; })();
      const want = Math.max(m.left + pad, tg.right + gap), tr = on ? t.getBoundingClientRect() : null;
      return { tgL: tg.left, pad, padTok, inset, brL: br.left, want, mL: m.left, gap, overlap: tg.right > br.left, on,
        above: tr ? tg.left >= tr.left && tg.right <= tr.right && tg.bottom <= tr.top : null,
        surf: on ? getComputedStyle(document.querySelector('.ma-bar'), '::before').backgroundColor === getComputedStyle(t).backgroundColor : null };
    });
    for (const w of [2560, 1920, 1440, 1280, 1024, 800, 721, 390, 320]) {
      const { c, p } = await open({ width: w, height: 800 }, w <= 720);
      const b = await bar(p);
      check(`nút Files ${w}: ở mép trái thanh trên (x = --pad), tên trang thẳng vùng làm việc hoặc sau nút một khoảng gap, không chồng`,
        Math.abs(b.tgL - b.pad - b.inset) <= 0.5 && Math.abs(b.brL - b.want) <= 0.5 && !b.overlap && (await overflow(p)) === 0, JSON.stringify(b));
      if (b.on) check(`nút Files ${w}: docked — nút nằm trên cột cây, phần thanh trên trên cột cùng nền với cây`, b.above && b.surf, JSON.stringify(b));
      await c.close();
    }
    // Nút không nhảy khi ẩn / hiện cột (1920): bấm ẩn, nút giữ chỗ.
    {
      const { c, p } = await open({ width: 1920, height: 800 });
      const b1 = await bar(p); await p.click('#btn-tree'); await p.waitForTimeout(150); const b2 = await bar(p);
      check('nút Files 1920: ẩn cột thì nút đứng yên, tên trang về thẳng vùng làm việc', b1.on && !b2.on && b1.tgL === b2.tgL && Math.abs(b2.brL - b2.want) <= 0.5, JSON.stringify([b1, b2]));
      await c.close();
    }
    // iPhone 15 Pro dọc, vùng an toàn trên 59 / dưới 34: đầu tấm dưới vùng an toàn, thân dừng trên vùng dưới, góc phải bo, đầu một hàng.
    {
      const { c, p, ok } = await open({ width: 393, height: 852 }, true, { top: 59, bottom: 34, left: 0, right: 0 });
      if (!ok) console.log('  BỎ QUA tấm trượt theo vùng an toàn: trình duyệt không giả lập được safe-area');
      else {
        await p.tap('#btn-tree'); await p.waitForTimeout(400);
        const d = await p.evaluate(() => {
          const t = document.getElementById('tree'), r = t.getBoundingClientRect(), hd = t.querySelector('.ma-tree__head').getBoundingClientRect(), bd = document.getElementById('tree-body').getBoundingClientRect();
          const cs = getComputedStyle(t), btns = [...t.querySelectorAll('.ma-tree__head .ma-icbtn')].filter((x) => x.getClientRects().length).map((x) => x.getBoundingClientRect());
          return { w: r.width, left: r.left, headTop: hd.top, headH: hd.height, bodyB: bd.bottom, vh: innerHeight, rr: cs.borderTopRightRadius, rb: cs.borderBottomRightRadius, rl: cs.borderTopLeftRadius,
            btns: btns.length, row: btns.every((x) => x.top >= hd.top && x.bottom <= hd.bottom && x.width >= 44), shadow: cs.boxShadow !== 'none', bl: cs.borderRightWidth };
        });
        check('tấm trượt iPhone (an toàn 59 / 34): rộng 320, sát trái; đầu dưới vùng an toàn trên; thân dừng trên vùng an toàn dưới; góc phải bo, có bóng, không viền một cạnh; đầu một hàng, 4 nút ≥ 44px',
          d.w === 320 && d.left === 0 && d.headTop >= 59 && d.bodyB <= d.vh - 34 && d.rr === '16px' && d.rb === '16px' && d.rl === '0px' && d.shadow && d.bl === '0px' && d.btns === 4 && d.row && d.headH <= 53, JSON.stringify(d));
        check('tấm trượt iPhone: thân cây không chạm góc bo (MDAN-018)', !(await cornerClash(p)).filter((x) => /tree/.test(x)).length, (await cornerClash(p)).join());
      }
      await c.close();
    }
    // Ngang 852×393, vùng an toàn trái / phải 59, dưới 21: hàng và đầu tấm không nằm dưới vùng an toàn trái; nút Files lùi theo nó.
    {
      const { c, p, ok } = await open({ width: 852, height: 393 }, true, { top: 0, bottom: 21, left: 59, right: 59 });
      if (!ok) console.log('  BỎ QUA tấm trượt ngang theo vùng an toàn: trình duyệt không giả lập được safe-area');
      else {
        const b = await bar(p);
        check('nút Files 852 ngang: x = --pad + vùng an toàn trái, tên trang sau nút', Math.abs(b.tgL - b.padTok - 59) <= 0.5 && Math.abs(b.brL - b.want) <= 0.5 && !b.overlap, JSON.stringify(b));
        await p.tap('#btn-tree'); await p.waitForTimeout(400);
        const d = await p.evaluate(() => {
          const t = document.getElementById('tree'), rows = [...t.querySelectorAll('.ma-trow')].map((x) => x.getBoundingClientRect().left);
          return { w: t.getBoundingClientRect().width, rowL: Math.min(...rows), headL: t.querySelector('.ma-tree__k').getBoundingClientRect().left, bodyB: document.getElementById('tree-body').getBoundingClientRect().bottom, vh: innerHeight };
        });
        check('tấm trượt ngang (an toàn trái 59): hàng, nhãn đầu không dưới vùng an toàn; rộng 320 + 59; thân trên vùng an toàn dưới', d.rowL >= 59 && d.headL >= 59 && d.w === 379 && d.bodyB <= d.vh - 21 && (await overflow(p)) === 0, JSON.stringify(d));
      }
      await c.close();
    }
  }

  /* ---------- Thanh trên ở điện thoại: Files, tên, History, Settings, More; New session, theme, Shortcuts trong menu More ---------- */
  for (const [w, scheme] of [[320, 'light'], [360, 'dark'], [390, 'light']]) {
    const hc = await browser.newContext({ viewport: { width: w, height: 760 }, colorScheme: scheme, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const hp = await hc.newPage(); watch(hp);
    await hp.goto(BASE); await hp.waitForFunction(() => window.marked && window.DOMPurify);
    await hp.tap('#btn-sample'); await hp.waitForTimeout(150);
    await hp.evaluate(async () => {   // cây vài file: nút Files hiện
      const T = await import('./js/ui/tree.js'), noop = () => '';
      T.renderTree({ nodes: [{ id: 'f1', parent: null, kind: 'file', name: 'a.md' }, { id: 'f2', parent: null, kind: 'file', name: 'b.md' }], open: 'f1', collapsed: [], counts: {}, title: 'Demo' },
        { open: noop, toggle: noop, newFile: noop, newDir: noop, rename: noop, move: noop, remove: noop, importDir: noop, download: noop, collapseAll: noop });
    });
    const bar = await hp.evaluate(() => {
      const ids = ['btn-tree', 'btn-hist', 'btn-layout', 'btn-more'], rs = ids.map((id) => document.getElementById(id).getBoundingClientRect());
      const brand = document.querySelector('.ma-brand').getBoundingClientRect();
      return { h: Math.round(document.querySelector('.ma-bar').getBoundingClientRect().height),
        order: [rs[0], brand, ...rs.slice(1)].every((r, i, a) => !i || r.left >= a[i - 1].right) && rs[0].left === 16,
        sizes: rs.every((r) => r.width >= 44 && r.height >= 44 && r.left >= 0 && r.right <= innerWidth),
        hidden: ['btn-new', 'theme'].every((id) => !document.getElementById(id).getClientRects().length),
        more: document.getElementById('btn-more').getAttribute('aria-haspopup') };
    });
    check(`thanh trên ${w}: Files sát lề trái, rồi tên, History, Settings, More; nút ≥ 44px, trong khung; New session và theme ẩn; cao 57px`,
      bar.h === 57 && bar.order && bar.sizes && bar.hidden && bar.more === 'menu' && (await overflow(hp)) === 0, JSON.stringify(bar));
    // Chạm: mở menu, mục ≥ 44px, trong khung nhìn, chưa có vòng focus; chạm ngoài thì đóng.
    await hp.tap('#btn-more'); await hp.waitForTimeout(150);
    const mn = await hp.evaluate(() => {
      const m = document.getElementById('bar-menu'), r = m.getBoundingClientRect(), its = [...m.querySelectorAll('.ma-menu__i')], ae = document.activeElement;
      const probe = document.createElement('i'); document.body.append(probe); probe.style.backgroundColor = 'var(--surface)'; const surface = getComputedStyle(probe).backgroundColor; probe.remove();
      return { open: m.classList.contains('is-open'), exp: document.getElementById('btn-more').getAttribute('aria-expanded'), inView: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
        items: its.map((i) => i.textContent.trim()), tall: its.every((i) => i.getBoundingClientRect().height >= 44), ring: getComputedStyle(ae).outlineStyle !== 'none' || document.documentElement.classList.contains('ma-tabbing'),
        bg: getComputedStyle(m).backgroundColor === surface };
    });
    const themeWord = scheme === 'dark' ? 'Light theme' : 'Dark theme';
    check(`thanh trên ${w}: chạm More mở menu (New session, ${themeWord}, Shortcuts), mục ≥ 44px, trong khung, nền --surface, không vòng focus`,
      mn.open && mn.exp === 'true' && mn.inView && mn.items.join() === `New session,${themeWord},Shortcuts` && mn.tall && !mn.ring && mn.bg, JSON.stringify(mn));
    await hp.touchscreen.tap(20, 600); await hp.waitForTimeout(150);
    check(`thanh trên ${w}: chạm ngoài thì đóng`, !(await hp.evaluate(() => document.getElementById('bar-menu').classList.contains('is-open'))) && (await hp.getAttribute('#btn-more', 'aria-expanded')) === 'false');
    // Mục theme đổi theme; Shortcuts mở hộp, đóng thì focus về More; New session mở phiên mới.
    await hp.tap('#btn-more'); await hp.waitForTimeout(100); await hp.tap('#bar-menu >> text=' + themeWord); await hp.waitForTimeout(150);
    check(`thanh trên ${w}: mục theme đổi theme, menu đóng`, (await hp.evaluate(() => document.documentElement.classList.contains('dark'))) === (scheme !== 'dark') && !(await hp.isVisible('#bar-menu')));
    await hp.tap('#btn-more'); await hp.waitForTimeout(100); await hp.tap('#bar-menu >> text=Shortcuts'); await hp.waitForTimeout(250);
    const ko = await hp.evaluate(() => document.getElementById('dlg-keys').open);
    await hp.keyboard.press('Escape'); await hp.waitForTimeout(150);
    check(`thanh trên ${w}: Shortcuts mở hộp phím tắt, đóng thì focus về More`, ko && (await hp.evaluate(() => document.activeElement.id)) === 'btn-more');
    await hp.tap('#btn-more'); await hp.waitForTimeout(100); await hp.tap('#bar-menu >> text=New session'); await hp.waitForTimeout(200);
    check(`thanh trên ${w}: New session mở phiên mới (khung Edit)`, (await hp.isVisible('#src-input')) && /New session/.test(await hp.textContent('#toast')));
    // Bàn phím: Enter mở và vào mục đầu; ↓ ↑ vòng, End, Home; Esc đóng, focus về nút; ↑ trên nút vào mục cuối; Tab đóng.
    const fo = () => hp.evaluate(() => (document.activeElement.textContent || '').trim() || document.activeElement.id);
    await hp.focus('#btn-more'); await hp.keyboard.press('Tab'); await hp.keyboard.press('Shift+Tab');
    await hp.keyboard.press('Enter'); await hp.waitForTimeout(80);
    const k1 = await fo(); await hp.keyboard.press('ArrowDown'); const k2 = await fo(); await hp.keyboard.press('End'); const k3 = await fo();
    await hp.keyboard.press('ArrowDown'); const k4 = await fo(); await hp.keyboard.press('ArrowUp'); const k5 = await fo(); await hp.keyboard.press('Home'); const k6 = await fo();
    const ring = await hp.evaluate(() => getComputedStyle(document.activeElement).outlineStyle !== 'none');
    await hp.keyboard.press('Escape'); await hp.waitForTimeout(80);
    const k7 = await fo(), shut = !(await hp.isVisible('#bar-menu'));
    await hp.keyboard.press('ArrowUp'); await hp.waitForTimeout(80); const k8 = await fo();
    await hp.keyboard.press('Tab'); await hp.waitForTimeout(80);
    const k9 = await fo(), shut2 = !(await hp.isVisible('#bar-menu'));
    const kw = scheme === 'dark' ? 'Dark theme' : 'Light theme';   // theme đã đổi ở trên
    check(`thanh trên ${w}: bàn phím — Enter vào mục đầu, ↓ ↑ End Home, vòng focus sau Tab, Esc / Tab đóng và trả focus, ↑ trên nút vào mục cuối`,
      k1 === 'New session' && k2 === kw && k3 === 'Shortcuts' && k4 === 'New session' && k5 === 'Shortcuts' && k6 === 'New session' && ring && k7 === 'btn-more' && shut && k8 === 'Shortcuts' && k9 === 'btn-more' && shut2,
      JSON.stringify([k1, k2, k3, k4, k5, k6, ring, k7, shut, k8, k9, shut2]));
    check(`thanh trên ${w}: không tràn ngang`, (await overflow(hp)) === 0);
    await hc.close();
  }
  {
    const dc = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const dp2 = await dc.newPage(); watch(dp2);
    await dp2.goto(BASE); await dp2.waitForFunction(() => window.marked && window.DOMPurify);
    check('thanh trên 1280: không có More, New session và theme hiện', !(await dp2.isVisible('#btn-more')) && (await dp2.isVisible('#btn-new')) && (await dp2.isVisible('#theme')));
    await dc.close();
  }

  /* ---------- Cây file: Undo chỉ trả lại mục ấy (MDAN-028), chặn rời file khi hộp nhận xét có chữ, phiên cũ path lạ,
     nạp folder không ghi prefs.tree, New folder trong folder gập, Move to… trong khung nhìn, All files 200 file, vạch kéo ---------- */
  {
    const fs = require('fs'), os = require('os'), path = require('path');
    const ready = (p) => p.waitForFunction(() => window.marked && window.DOMPurify);
    const mk = (id, files, extra) => {
      const nodes = [], docs = {};
      files.forEach((f) => { const kind = f.kind || 'file'; nodes.push({ id: f.id, parent: f.parent || null, kind, name: f.name }); if (kind === 'file') docs[f.id] = { text: f.text, comments: f.comments || [], reviews: [], real: true }; });
      return Object.assign({ id, name: '', named: false, created: 1, updated: 1, header: '', footer: '', fmt: 'inline', includeDoc: false, lineNums: true, path: '', rvPrompt: false, promptAll: false, nodes, docs, open: files.find((f) => (f.kind || 'file') === 'file').id, collapsed: [] }, extra || {});
    };
    const seed = async (ctx, sessions, cur, prefs) => {
      const p = await ctx.newPage(); watch(p);
      await p.goto(BASE); await ready(p);
      await p.evaluate(([ss, cur, prefs]) => { localStorage.clear(); for (const s of ss) localStorage.setItem('md-annotate:s:' + s.id, JSON.stringify(s)); localStorage.setItem('md-annotate:current', JSON.stringify(cur)); localStorage.setItem('md-annotate:prefs:v1', JSON.stringify(prefs)); }, [sessions, cur, prefs]);
      await p.goto(BASE); await ready(p); await p.waitForTimeout(300);
      return p;
    };
    const C = (id, quote, comment) => ({ id, quote, comment, prefix: '', suffix: '', origin: 'src', rel: 0 });
    const stored = (p, id) => p.evaluate((id) => JSON.parse(localStorage.getItem('md-annotate:s:' + id)), id);
    const rowSel = (id) => `#tree-list .ma-trow[data-id="${id}"]`;
    const menuDo = async (p, id, label) => { await p.click(rowSel(id), { button: 'right' }); await p.click(`#tree-menu .ma-menu__i:has-text("${label}")`); await p.waitForTimeout(150); };
    const toastText = (p) => p.$eval('#toast', (t) => (t.hidden ? '' : t.textContent));
    const names = (st) => st.nodes.map((n) => n.name).sort().join();
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });

    // Xoá b.md, rồi New file và gõ chữ; Undo: b.md quay lại, file mới và chữ còn, focus về hàng b.md.
    let p = await seed(ctx, [mk('U1', [{ id: 'fa', name: 'a.md', text: '# A\n\nalpha\n' }, { id: 'fb', name: 'b.md', text: '# B\n\nbeta\n', comments: [C('cb', 'beta', 'b')] }])], 'U1', { tree: true });
    await menuDo(p, 'fb', 'Delete');
    await p.click('#tree-new-file'); await p.waitForTimeout(150); await p.keyboard.press('Enter'); await p.waitForTimeout(100);
    await p.fill('#src-input', 'IMPORTANT NEW WORK'); await p.waitForTimeout(450);
    await p.click('#toast .ma-toast__btn'); await p.waitForTimeout(300);
    let st = await stored(p, 'U1');
    const u1 = { names: names(st), work: Object.values(st.docs).some((d) => d.text === 'IMPORTANT NEW WORK'), b: st.docs.fb && st.docs.fb.comments.length, ed: await p.inputValue('#src-input'), focus: await p.evaluate(() => document.activeElement.dataset.id) };
    check('Undo xoá: chỉ trả lại b.md, file mới và chữ gõ sau vẫn còn, focus về hàng b.md', u1.names === 'a.md,b.md,untitled.md' && u1.work && u1.b === 1 && u1.ed === 'IMPORTANT NEW WORK' && u1.focus === 'fb', JSON.stringify(u1));
    await p.close();

    // Xoá file cuối của phiên rồi mở phiên khác (phiên trống bị bỏ khi chuyển); Undo dựng lại phiên ấy.
    p = await seed(ctx, [mk('U2', [{ id: 'fo', name: 'only.md', text: '# Only\n\nprecious text\n', comments: [C('co', 'precious text', 'c')] }]), mk('U3', [{ id: 'fz', name: 'other.md', text: '# Other\n\nz\n' }])], 'U2', { tree: true });
    await menuDo(p, 'fo', 'Delete');
    await p.evaluate(async () => { const S = await import('./js/ui/state.js'); S.switchTo(S.loadSession('U3')); });
    await p.waitForTimeout(200);
    await p.click('#toast .ma-toast__btn'); await p.waitForTimeout(300);
    st = await stored(p, 'U2');
    const u2 = { names: st && names(st), c: st && st.docs.fo && st.docs.fo.comments.length, idx: await p.evaluate(() => JSON.parse(localStorage.getItem('md-annotate:index:v1')).map((e) => e.id).join()), cur: await p.evaluate(async () => (await import('./js/ui/state.js')).S.id) };
    check('Undo xoá sau khi đã chuyển phiên: phiên bị bỏ vì trống được dựng lại, vào History, phiên đang mở giữ nguyên', u2.names === 'only.md' && u2.c === 1 && /U2/.test(u2.idx) && u2.cur === 'U3', JSON.stringify(u2));
    await p.close();

    // Hộp nhận xét đang có chữ: bấm file khác, New file, phiên mới đều bị chặn, toast báo, bản nháp còn.
    p = await seed(ctx, [mk('U4', [{ id: 'fa', name: 'a.md', text: '# Alpha\n\nalpha paragraph with several words here\n' }, { id: 'fb', name: 'b.md', text: '# Beta\n\nbeta text\n' }])], 'U4', { tree: true });
    await dragSelect(p, '#v-md', 'paragraph with several');
    await p.keyboard.type('a half-typed draft');
    await p.click(rowSel('fb')); await p.waitForTimeout(200);
    const g1 = { open: await p.evaluate(async () => (await import('./js/ui/state.js')).S.open), toast: await toastText(p), pop: await p.isVisible('#pop'), draft: await p.inputValue('#pop-text') };
    await p.click('#tree-new-file'); await p.waitForTimeout(150);
    await p.click('#btn-new'); await p.waitForTimeout(150);
    const g2 = { files: await p.$$eval('#tree-list .ma-trow', (ls) => ls.length), sid: await p.evaluate(async () => (await import('./js/ui/state.js')).S.id), draft: await p.inputValue('#pop-text') };
    check('hộp nhận xét có chữ: đổi file, New file, phiên mới bị chặn, toast báo, bản nháp còn', g1.open === 'fa' && g1.toast === 'Save or cancel the comment first.' && g1.pop && g1.draft === 'a half-typed draft' && g2.files === 2 && g2.sid === 'U4' && g2.draft === 'a half-typed draft', JSON.stringify([g1, g2]));
    await p.click('#pop-cancel'); await p.waitForTimeout(100);
    await p.click(rowSel('fb')); await p.waitForTimeout(200);
    check('huỷ hộp rồi bấm file khác: đổi được', (await p.evaluate(async () => (await import('./js/ui/state.js')).S.open)) === 'fb');
    await p.close();

    // Phiên cũ có path 'docs/' (không tách được tên file): nhãn giữ y hệt bản một văn bản.
    p = await seed(ctx, [{ id: 'L2', name: '', named: false, created: 1, updated: 1, header: '', footer: '', fmt: 'inline', includeDoc: false, lineNums: true, rvPrompt: false, path: 'docs/',
      text: '# T\n\nhello world line\n\nsecond para here\n', comments: [{ id: 'c1', quote: 'hello world', comment: 'fix', prefix: '', suffix: '', origin: 'src', rel: 0.1 }], reviews: [] }], 'L2', {});
    check('phiên cũ path "docs/": prompt y hệt bản cũ ("docs/:3"), ô Folder giữ nguyên văn', (await out(p)) === 'Vị trí ghi dạng tệp:dòng, tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.\n\n1. docs/:3 "hello world" — fix' && (await p.inputValue('#p-path')) === 'docs/', JSON.stringify(await out(p)));
    await p.close();

    // Nạp folder (chưa chọn ẩn / hiện cây): cây hiện cho phiên ấy, prefs.tree không được ghi; phiên mới theo luật mặc định.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-imp-'));
    fs.mkdirSync(path.join(tmp, 'kit', 'sub'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'kit', 'README.md'), '# Kit\n'); fs.writeFileSync(path.join(tmp, 'kit', 'sub', 'a.md'), '# A\n');
    fs.writeFileSync(path.join(tmp, 'kit', 'app.ts'), 'let x = 1;\n'); fs.writeFileSync(path.join(tmp, 'kit', 'blob.dat'), Buffer.from([0, 1, 2, 3]));
    p = await seed(ctx, [], 'none', {});
    await p.setInputFiles('#tree-dir-in', path.join(tmp, 'kit')); await p.waitForTimeout(500);
    const im = { on: await p.evaluate(() => document.documentElement.classList.contains('ma-tree-on')), prefs: await p.evaluate(() => localStorage.getItem('md-annotate:prefs:v1')), toast: await toastText(p) };
    await p.click('#btn-new'); await p.waitForTimeout(200);
    im.after = await p.evaluate(() => document.documentElement.classList.contains('ma-tree-on'));
    check('nạp folder: cây đang tắt vẫn hiện cho phiên ấy, prefs.tree giữ false; phiên mới thì cây ẩn lại; .ts nạp, nhị phân bỏ', im.on && /"tree":false/.test(im.prefs || '') && !im.after && im.toast === 'Imported 3 files, skipped 1.', JSON.stringify(im));
    await p.close();
    fs.rmSync(tmp, { recursive: true, force: true });

    // New folder trong folder đang gập: folder ấy mở ra, ô đổi tên hiện và có focus.
    p = await seed(ctx, [mk('U5', [{ id: 'd', kind: 'dir', name: 'docs' }, { id: 'f1', parent: 'd', name: 'in.md', text: '# In\n' }, { id: 'f2', name: 'top.md', text: '# Top\n' }], { open: 'f2', collapsed: ['d'] })], 'U5', { tree: true });
    await menuDo(p, 'd', 'New folder here');
    const nf = await p.evaluate(() => { const i = document.querySelector('#tree-list .ma-trow__ren'); return { input: !!i && document.activeElement === i && i.value, exp: document.querySelector('#tree-list .ma-trow[data-id="d"]').getAttribute('aria-expanded') }; });
    check('New folder trong folder gập: folder mở ra, ô đổi tên có focus', nf.input === 'folder' && nf.exp === 'true', JSON.stringify(nf));
    await p.keyboard.press('Escape');
    await p.close();

    // Move to… ở hàng sát đáy khung nhìn: menu con cao hơn vẫn nằm trọn trong khung nhìn.
    const deep = []; let par = null;
    for (let i = 0; i < 12; i++) { deep.push({ id: 'd' + i, kind: 'dir', parent: par, name: 'level-' + i }); deep.push({ id: 'f' + i, parent: 'd' + i, name: 'f' + i + '.md', text: '# F' + i + '\n' }); par = 'd' + i; }
    const sc = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' });
    p = await seed(sc, [mk('U6', deep.concat([{ id: 'r', name: 'readme.md', text: '# R\n' }]), { open: 'r' })], 'U6', { tree: true });
    const last = await p.evaluate(() => { const b = document.getElementById('tree-body'); b.scrollTop = 1e6; const rs = [...document.querySelectorAll('#tree-list .ma-trow')]; const r = rs[rs.length - 1].getBoundingClientRect(); return { x: r.x + 20, y: r.bottom - 4 }; });
    await p.mouse.click(last.x, last.y, { button: 'right' }); await p.waitForTimeout(100);
    await p.click('#tree-menu .ma-menu__i[aria-haspopup]'); await p.waitForTimeout(100);
    const mr = await p.evaluate(() => { const r = document.getElementById('tree-menu').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, vh: innerHeight, focus: document.activeElement.textContent.trim() }; });
    check('Move to… sát đáy: menu con trọn khung nhìn', mr.top >= 0 && mr.bottom <= mr.vh && mr.focus === 'Back', JSON.stringify(mr));
    await p.keyboard.press('Escape'); await p.waitForTimeout(50);
    const back = await p.evaluate(() => [document.getElementById('tree-menu').classList.contains('is-open'), document.activeElement.textContent.trim()]);
    check('Esc ở Move to… lùi về menu chính, focus ở Move to…', back[0] && back[1] === 'Move to…', JSON.stringify(back));
    await p.close(); await sc.close();

    // All files với 200 file có nhận xét: gập / mở một folder vẫn nhanh (không neo lại 200 file, không vẽ lại prompt).
    const many = [{ id: 'dm', kind: 'dir', name: 'many' }];
    const body = 'Some text paragraph that is long enough to matter. '.repeat(200);
    for (let i = 0; i < 200; i++) many.push({ id: 'm' + i, parent: 'dm', name: 'file-' + i + '.md', text: '# F' + i + '\n\n' + body + '\n\nUnique sentence number ' + i + ' here.\n', comments: [C('c' + i, 'Unique sentence number ' + i, 'fix ' + i)] });
    many.push({ id: 'dz', kind: 'dir', name: 'zz-empty' });
    p = await seed(ctx, [mk('U7', many, { promptAll: true })], 'U7', { tree: true });
    const perf = await p.evaluate(async () => {
      const row = document.querySelector('#tree-list .ma-trow[data-id="dz"]'), t = [];
      for (let i = 0; i < 4; i++) { const t0 = performance.now(); row.click(); t.push(performance.now() - t0); await new Promise((r) => setTimeout(r, 50)); }
      const R = await import('./js/ui/render.js'), t0 = performance.now();
      R.renderAll();
      return { toggle: Math.max(...t), render: performance.now() - t0, n: document.getElementById('foot-n').textContent };
    });
    check('All files, 200 file: gập / mở folder < 60 ms, vẽ lại < 150 ms, đếm đủ 200 nhận xét', perf.toggle < 60 && perf.render < 150 && perf.n === '200 comments', JSON.stringify(perf));
    await p.close();

    // Vạch kéo của panel và cây (rê / kéo, focus): chỉ báo trạng thái ≥ 3:1, cả hai theme.
    p = await seed(ctx, [mk('U8', [{ id: 'fa', name: 'a.md', text: '# A\n' }, { id: 'fb', name: 'b.md', text: '# B\n' }])], 'U8', { tree: true });
    for (const dark of [false, true]) {
      await p.evaluate((d) => document.documentElement.classList.toggle('dark', d), dark); await p.waitForTimeout(250);
      const gc = await p.evaluate(() => {
        const parse = (c) => { const m = c.match(/[\d.]+/g).map(Number); return c.startsWith('color(') ? [m[0] * 255, m[1] * 255, m[2] * 255, m.length > 3 ? m[3] : 1] : [m[0], m[1], m[2], m.length > 3 ? m[3] : 1]; };
        const over = (t, u) => [0, 1, 2].map((i) => t[i] * t[3] + u[i] * (1 - t[3])).concat(1);
        const bgOf = (el) => { const ch = []; for (let n = el; n; n = n.parentElement) ch.push(getComputedStyle(n).backgroundColor); let c = [255, 255, 255, 1]; ch.reverse().forEach((x) => { const v = parse(x); if (v[3] > 0) c = over(v, c); }); return c; };
        const lum = (c) => { const x = c.slice(0, 3).map((n) => { n /= 255; return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; }); return 0.2126 * x[0] + 0.7152 * x[1] + 0.0722 * x[2]; };
        const ratio = (a, b) => { const x = lum(a), y = lum(b); return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2); };
        const out = {}, still = document.createElement('style');
        still.textContent = '*, *::before { transition: none !important; }';   // đọc màu cuối, không giữa chuyển động
        document.head.append(still);
        for (const id of ['panel-grip', 'tree-grip']) {
          const g = document.getElementById(id), bg = bgOf(g.parentElement);
          g.classList.add('is-drag');
          out[id + '-drag'] = ratio(over(parse(getComputedStyle(g, '::before').backgroundColor), bg), bg);
          g.classList.remove('is-drag'); document.documentElement.classList.add('ma-tabbing'); g.focus();
          out[id + '-focus'] = ratio(over(parse(getComputedStyle(g, '::before').backgroundColor), bg), bg);
          g.blur(); document.documentElement.classList.remove('ma-tabbing');
        }
        still.remove();
        return out;
      });
      check(`vạch kéo panel / cây (${dark ? 'tối' : 'sáng'}): rê / kéo và focus ≥ 3:1`, Object.values(gc).every((v) => v >= 3), JSON.stringify(gc));
    }
    await p.close();
    await ctx.close();
  }

  // ── mob:touch-layout ──
  /* ---------- Điện thoại / máy tính bảng, chạm thật (thiết bị của playwright, chạm qua CDP): khoá cuộn sau lớp mờ, toast
     không che, vùng an toàn, Settings ở màn cảm ứng, làn và lề số, tấm đáy, viên thuốc sau khi tự cuộn ---------- */
  {
    const devices = pw.devices;
    const dev = async (name, scheme = 'light', o = {}) => {
      const d = Object.assign({}, name ? devices[name] : {}, { deviceScaleFactor: 1, colorScheme: scheme });
      delete d.defaultBrowserType;
      if (o.viewport) Object.assign(d, { viewport: o.viewport, hasTouch: true, isMobile: true });
      if (o.reduced) d.reducedMotion = 'reduce';
      const c = await browser.newContext(d), p = await c.newPage(); watch(p);
      const cdp = await c.newCDPSession(p);
      if (o.safe) await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: o.safe });
      await p.goto(BASE); await p.waitForFunction(() => window.marked && window.DOMPurify);
      if (o.sample !== false) { await p.evaluate(() => document.getElementById('btn-sample').click()); await p.waitForTimeout(250); }
      return { c, p, cdp };
    };
    const tpt = (cdp, type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
    const swipe = async (p, cdp, x, y1, y2) => {
      await tpt(cdp, 'touchStart', [{ x, y: y1 }]);
      for (let i = 1; i <= 8; i++) { await tpt(cdp, 'touchMove', [{ x, y: y1 + (y2 - y1) * i / 8 }]); await p.waitForTimeout(16); }
      await tpt(cdp, 'touchEnd', []); await p.waitForTimeout(350);
    };
    const tapEl = async (p, sel) => { const b = await p.locator(sel).first().boundingBox(); await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await p.waitForTimeout(200); };
    const clickEl = async (p, sel) => { await p.$eval(sel, (e) => e.click()); await p.waitForTimeout(250); };
    /* Bôi đen như ngón tay: cuộn đoạn vào giữa khung nhìn rồi đặt vùng chọn. */
    const selectIn = async (p, needle) => {
      await p.evaluate((n) => { const w = document.createTreeWalker(document.getElementById('v-md'), NodeFilter.SHOW_TEXT); let t; while ((t = w.nextNode())) if (t.data.includes(n)) { t.parentElement.scrollIntoView({ block: 'center' }); break; } }, needle);
      await p.waitForTimeout(150); await scriptSelect(p, '#v-md', needle);
    };
    const box = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e || !e.getClientRects().length) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; }, sel);

    // Khoá cuộn: Settings, tấm panel, tấm nhận xét có nền mờ. Vuốt trên lớp mờ / trên thẻ không cuộn trang; đóng thì không nhảy.
    let { c, p, cdp } = await dev('iPhone 15 Pro');
    await p.evaluate(() => window.scrollTo(0, 220)); await p.waitForTimeout(100);
    for (const [open, where] of [['#btn-layout', 'Settings'], ['#dock-n', 'tấm panel']]) {
      await clickEl(p, open); await p.waitForTimeout(100);
      const y0 = await p.evaluate(() => scrollY);
      await swipe(p, cdp, 200, 40, 10); await swipe(p, cdp, 200, 500, 300);
      const y1 = await p.evaluate(() => [scrollY, document.documentElement.classList.contains('ma-lock')]);
      await p.keyboard.press('Escape'); await p.waitForTimeout(200);
      const y2 = await p.evaluate(() => [scrollY, document.documentElement.classList.contains('ma-lock')]);
      check(`chạm: ${where} mở thì trang sau lớp mờ không cuộn, đóng không nhảy`, y1[0] === y0 && y1[1] && y2[0] === y0 && !y2[1], JSON.stringify([y0, y1, y2]));
    }
    await selectIn(p, 'Try selecting this sentence'); await tapEl(p, '#fab'); await p.waitForTimeout(300);
    await p.fill('#pop-text', 'draft');   // có chữ: chạm ra ngoài không đóng tấm
    const s0 = await p.evaluate(() => scrollY);
    await swipe(p, cdp, 200, 60, 10);
    check('chạm: tấm nhận xét có nền mờ thì trang không cuộn sau nó', (await p.evaluate(() => scrollY)) === s0 && await p.isVisible('#pop') && await p.evaluate(() => document.documentElement.classList.contains('ma-lock')));
    // Toast trên tấm nhận xét (không che ô chữ, Save).
    await p.evaluate(async () => (await import('./js/ui/dom.js')).toast('A toast while the sheet is open'));
    await p.waitForTimeout(250);
    const tb = await box(p, '#toast'), pb = await box(p, '#pop');
    check('chạm: toast nằm trên tấm nhận xét, không che ô chữ / Save', tb && pb && tb.b <= pb.t + 1, JSON.stringify([tb, pb]));
    await p.fill('#pop-text', ''); await tapEl(p, '#pop-cancel');
    // Toast trên viên thuốc và nút nổi.
    await p.evaluate(async () => { (await import('./js/ui/review.js')).markUnits([1], true); });
    await p.evaluate(async () => (await import('./js/ui/dom.js')).toast('Another toast, long enough to span the width')); await p.waitForTimeout(250);
    const tb2 = await box(p, '#toast'), pill = await box(p, '#rv-pill');
    check('chạm: toast nằm trên viên thuốc', tb2 && pill && tb2.b <= pill.t + 1, JSON.stringify([tb2, pill]));
    await selectIn(p, 'Try selecting this sentence');
    await p.evaluate(async () => (await import('./js/ui/dom.js')).toast('Toast with the floating button')); await p.waitForTimeout(250);
    const tb3 = await box(p, '#toast'), fab = await box(p, '#fab');
    check('chạm: toast không che nút nổi', tb3 && fab && (tb3.b <= fab.t + 1 || tb3.t >= fab.b - 1), JSON.stringify([tb3, fab]));
    await p.evaluate(() => getSelection().removeAllRanges());
    // Lề số dừng trước làn; làn có vùng chạm ≥ 44px (lớp giả), không đổi bố cục.
    await clickEl(p, '.ma-tab[data-view="src"]'); await p.waitForTimeout(250);
    const lane = await p.evaluate(async () => {
      const P = await import('./js/ui/picks.js');
      const b = [...document.querySelectorAll('#wrap-src .ma-lane__b')].find((x) => x.getClientRects().length);
      b.scrollIntoView({ block: 'center' });
      const r = b.getBoundingClientRect(), y = r.top + Math.min(r.height / 2, 10), ln = document.elementsFromPoint(r.left + 1, y).find((e) => e.classList.contains('ma-ln'));
      const hits = [r.left - 13, r.right + 13].map((x) => document.elementFromPoint(x, y) === b);
      const ys = [r.top + r.height / 2 - 21, r.top + r.height / 2 + 21].map((yy) => { const e = document.elementFromPoint(r.left + r.width / 2, yy); return !!(e && e.classList.contains('ma-lane__b')); });
      return { w: r.width, hits, ys, onLane: !!(ln && P.gutterLine({ target: ln, clientX: r.left + 1 })), onNum: !!(ln && P.gutterLine({ target: ln, clientX: ln.getBoundingClientRect().left + 4 })) };
    });
    check('chạm: làn rộng 16px mà vùng chạm ≥ 44px; lề số dừng trước làn', lane.w === 16 && lane.hits.every(Boolean) && lane.ys.every(Boolean) && !lane.onLane && lane.onNum, JSON.stringify(lane));
    await c.close();

    // Vùng an toàn: nằm ngang, tai thỏ hai bên, thanh home; dọc có tai thỏ trên.
    ({ c, p, cdp } = await dev('iPhone 15 Pro landscape', 'light', { safe: { top: 0, bottom: 21, left: 59, right: 59 } }));
    await p.evaluate(async () => { (await import('./js/ui/review.js')).markUnits([1], true); }); await p.waitForTimeout(200);
    const sa = await p.evaluate(() => {
      const vw = innerWidth, r = (s) => document.querySelector(s).getBoundingClientRect();
      return { wrap: parseFloat(getComputedStyle(document.querySelector('main.ma-wrap')).paddingLeft), dockL: r('#dock-n').left, copyR: vw - r('#dock-copy').right,
        pillR: vw - r('#rv-pill').right, dockPad: parseFloat(getComputedStyle(document.getElementById('dock')).paddingBottom) };
    });
    check('vùng an toàn, nằm ngang: chữ, thanh đáy, viên thuốc tránh tai thỏ và thanh home', sa.wrap >= 59 && sa.dockL >= 59 && sa.copyR >= 59 && sa.pillR >= 59 && sa.dockPad >= 21, JSON.stringify(sa));
    await selectIn(p, 'Try selecting this sentence'); await tapEl(p, '#fab'); await p.waitForTimeout(250);
    const sp2 = await p.evaluate(() => { const cs = getComputedStyle(document.getElementById('pop')); return [parseFloat(cs.paddingLeft), parseFloat(cs.paddingRight), parseFloat(cs.paddingBottom)]; });
    check('vùng an toàn, nằm ngang: tấm nhận xét chừa hai bên và thanh home', sp2[0] >= 59 && sp2[1] >= 59 && sp2[2] >= 21 + 16, JSON.stringify(sp2));
    await c.close();
    ({ c, p, cdp } = await dev('iPhone 15 Pro', 'light', { safe: { top: 59, bottom: 34, left: 0, right: 0 } }));
    const st = await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.ma-bar')).paddingTop));
    await clickEl(p, '#btn-hist'); await p.waitForTimeout(300);
    const hb = await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#dlg-hist .ma-dlg__b')).borderBottomWidth));
    await p.keyboard.press('Escape'); await clickEl(p, '#dock-n'); await p.waitForTimeout(300);
    const fb = await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#dlg-panel .ma-panel__foot')).paddingBottom));
    check('vùng an toàn, dọc: thanh trên dưới tai thỏ; History, panel chừa thanh home', st >= 59 && hb >= 16 + 34 && fb >= 12 + 34, JSON.stringify([st, hb, fb]));
    // Mọi tấm đáy: tay nắm vẽ bằng nền (không bị overflow cắt), trượt lên khi mở.
    const sheets = await p.evaluate(() => { const el = document.querySelector('#dlg-panel .ma-panel'), cs = getComputedStyle(el); return [cs.backgroundImage.includes('gradient'), cs.animationName]; });
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    await clickEl(p, '#btn-hist'); await p.waitForTimeout(100);
    const hs = await p.evaluate(() => { const cs = getComputedStyle(document.querySelector('#dlg-hist .ma-dlg__in')); return [cs.backgroundImage.includes('gradient'), cs.animationName]; });
    await p.keyboard.press('Escape');
    await selectIn(p, 'Try selecting this sentence'); await tapEl(p, '#fab'); await p.waitForTimeout(100);
    const cs3 = await p.evaluate(() => { const cs = getComputedStyle(document.getElementById('pop')); return [cs.backgroundImage.includes('gradient'), cs.animationName]; });
    check('tấm đáy (panel, History, nhận xét): cùng tay nắm, cùng trượt lên', [sheets, hs, cs3].every((x) => x[0] && x[1] === 'ma-sheet-in'), JSON.stringify([sheets, hs, cs3]));
    await c.close();

    // Settings ở 320px, cảm ứng: không tràn ngang, hàng ≥ 44px, thanh trượt chừa dải để vuốt, không Sync scroll, Focus theo dải đọc.
    ({ c, p, cdp } = await dev(null, 'light', { viewport: { width: 320, height: 640 } }));
    await clickEl(p, '#btn-layout'); await p.waitForTimeout(250);
    const s320 = await p.evaluate(() => {
      const b = document.querySelector('#dlg-layout .ma-dlg__b'), vis = (e) => e.getClientRects().length;
      const hs = [...b.querySelectorAll('.ma-check, input[type=range], .ma-fmt span')].filter(vis).map((e) => Math.round(e.getBoundingClientRect().height));
      const rg = b.querySelector('#set-fs').getBoundingClientRect(), br = b.getBoundingClientRect();
      return { ox: b.scrollWidth - b.clientWidth, minH: Math.min(...hs), gutter: Math.round(br.right - rg.right), sync: !!vis(document.getElementById('set-sync')),
        ptr: document.querySelector('input[name=focusby][value=pointer]').disabled, note: !!vis(document.getElementById('set-focus-touch')) };
    });
    check('Settings 320px cảm ứng: không tràn ngang, hàng ≥ 44px, thanh trượt chừa dải vuốt, không Sync scroll, Follow pointer tắt kèm dòng giải thích',
      s320.ox === 0 && s320.minH >= 44 && s320.gutter >= 44 && !s320.sync && s320.ptr && s320.note, JSON.stringify(s320));
    await p.click('#set-focus'); await p.waitForTimeout(100);
    check('Settings cảm ứng: Focus bật thì theo dải đọc', await p.evaluate(async () => (await import('./js/ui/layout.js')).layoutVal('focusBy') === 'band' && document.querySelector('input[name=focusby][value=band]').checked));
    await c.close();
    // Thẻ bắt đầu ở điện thoại nhỏ: không có thanh đáy (nút chép chưa có gì để chép).
    ({ c, p, cdp } = await dev('iPhone SE', 'light', { sample: false }));
    check('thẻ bắt đầu ở điện thoại: không thanh đáy', !(await p.isVisible('#dock')) && await p.isVisible('#start'));
    await c.close();
    // Viên thuốc sau lần nhảy về đầu (cuộn từ cuối lên): người dùng tự vuốt xuống giữa đường nhảy thì viên thuốc đánh dấu
    // khối ở dải đọc, không phải khối vừa nhảy tới đã khuất (pin bỏ khi người dùng tự cuộn).
    ({ c, p, cdp } = await dev('iPhone 15 Pro', 'light', { reduced: true }));
    await p.evaluate(async () => { (await import('./js/ui/review.js')).setRvTouched(); window.scrollTo(0, 1e6); }); await p.waitForTimeout(200);
    await p.evaluate(async () => { (await import('./js/ui/review.js')).jumpUnit(0); }); await p.waitForTimeout(300);
    await swipe(p, cdp, 200, 560, 260); await p.waitForTimeout(300);
    const before = await p.evaluate(() => { const b = document.querySelector('#wrap-md .ma-lane__b.is-cur'); return b ? [b.dataset.u, Math.round(b.getBoundingClientRect().bottom), scrollY] : null; });
    await tapEl(p, '#rv-pill'); await p.waitForTimeout(300);
    const done = await p.evaluate((y) => { window.scrollTo(0, y); return [...document.querySelectorAll('#wrap-md .ma-lane__b.is-done')].map((b) => { const r = b.getBoundingClientRect(); return [b.dataset.u, Math.round(r.top), Math.round(r.bottom)]; }); }, before ? before[2] : 0);
    check('viên thuốc: sau khi tự cuộn, đánh dấu khối ở dải đọc, không phải khối vừa nhảy tới', before && before[2] > 100 && done.length === 1 && done[0][0] === before[0] && done[0][0] !== '0' && done[0][2] > 0 && done[0][1] < 659, JSON.stringify([before, done]));
    await c.close();
    // Dấu ✓ đã đọc ở theme sáng: viền của hình ≥ 3:1 trên nền thẻ.
    for (const scheme of ['light', 'dark']) {
      ({ c, p, cdp } = await dev(null, scheme, { viewport: { width: 1280, height: 800 } }));
      await p.click('.ma-tab[data-view="view"]');
      await p.evaluate(async () => { (await import('./js/ui/review.js')).markUnits([1], true); }); await p.waitForTimeout(200);
      const ring = await p.evaluate(() => {
        const b = document.querySelector('#wrap-md .ma-lane__b.is-done'), cs = getComputedStyle(b, '::after');
        const rgb = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number);
        const lum = (c) => { const x = c.map((n) => { n /= 255; return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; }); return 0.2126 * x[0] + 0.7152 * x[1] + 0.0722 * x[2]; };
        const a = lum(rgb(cs.borderTopColor)), s = lum(rgb(getComputedStyle(document.getElementById('doc')).backgroundColor));
        return +((Math.max(a, s) + 0.05) / (Math.min(a, s) + 0.05)).toFixed(2);
      });
      check(`dấu ✓ đã đọc (${scheme}): viền hình ≥ 3:1 trên nền`, ring >= 3, String(ring));
      await c.close();
    }
  }
  // ── end mob:touch-layout ──

  // ── mob:touch-sheet ──
  /* ---------- Tấm nhận xét ở điện thoại: cuộn để đoạn chọn nằm ngay trên tấm (lưu không cuộn), nút nổi tránh đoạn chọn,
     Return xuống dòng ở màn cảm ứng, bàn phím ảo không che tấm / toast ---------- */
  {
    const devices = pw.devices;
    for (const name of ['iPhone 15 Pro', 'iPhone SE', 'iPhone 15 Pro landscape']) {
      const d = Object.assign({}, devices[name], { deviceScaleFactor: 1 }); delete d.defaultBrowserType;
      const c = await browser.newContext(d), p = await c.newPage(); watch(p);
      await p.goto(BASE); await p.waitForFunction(() => window.marked && window.DOMPurify);
      await p.evaluate(() => document.getElementById('btn-sample').click()); await p.waitForTimeout(250);
      const res = [];
      for (const needle of ['Three steps', 'then type a comment', 'Copy prompt']) {
        await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(100);
        await scriptSelect(p, '#v-md', needle);
        const sel = await p.evaluate(() => { const r = getSelection().getRangeAt(0).getBoundingClientRect(); return [r.top, r.bottom]; });
        const fb = await p.$eval('#fab', (f) => { const r = f.getBoundingClientRect(); return [r.top, r.bottom]; });
        const b = await p.locator('#fab').boundingBox(); await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
        await p.waitForTimeout(700);
        const r = await p.evaluate(() => {
          const rg = [...CSS.highlights.get('ma-pending')][0].getBoundingClientRect(), pop = document.getElementById('pop');
          return { top: rg.top, bottom: rg.bottom, sheet: innerHeight - pop.offsetHeight, bar: Math.max(0, document.querySelector('.ma-bar').getBoundingClientRect().bottom), y: scrollY };
        });
        await p.fill('#pop-text', 'note');
        const sb = await p.locator('#pop-save').boundingBox(); await p.touchscreen.tap(sb.x + sb.width / 2, sb.y + sb.height / 2);
        await p.waitForTimeout(250);
        res.push({ needle, fabClear: fb[1] <= sel[0] || fb[0] >= sel[1], shown: r.bottom <= r.sheet && r.top >= r.bar - 1, saveKept: (await p.evaluate(() => scrollY)) === r.y });
      }
      check(`tấm nhận xét (${name}): đoạn chọn hiện ngay trên tấm, nút nổi không che đoạn, lưu không cuộn trang`, res.every((x) => x.fabClear && x.shown && x.saveKept), JSON.stringify(res));
      if (name === 'iPhone 15 Pro') {
        // Return xuống dòng ở màn cảm ứng; lưu bằng Save.
        await p.evaluate(() => window.scrollTo(0, 0)); await scriptSelect(p, '#v-md', 'Three steps');
        const b = await p.locator('#fab').boundingBox(); await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await p.waitForTimeout(300);
        await p.focus('#pop-text'); await p.keyboard.type('line one'); await p.keyboard.press('Enter'); await p.keyboard.type('line two');
        const ret = await p.evaluate(() => [document.getElementById('pop-text').value, !document.getElementById('pop').hidden, document.getElementById('pop-text').getAttribute('enterkeyhint')]);
        check('màn cảm ứng: Return trong ô nhận xét xuống dòng, không lưu; enterkeyhint=enter', ret[0] === 'line one\nline two' && ret[1] && ret[2] === 'enter', JSON.stringify(ret));
        // Bàn phím ảo kiểu iOS: khung nhìn không co, chỉ visualViewport co. Tấm và toast nằm trên bàn phím.
        const kb = await p.evaluate(async () => {
          const vv = window.visualViewport, h = innerHeight - 300;
          Object.defineProperty(vv, 'height', { configurable: true, get: () => h });
          vv.dispatchEvent(new Event('resize'));
          (await import('./js/ui/dom.js')).toast('Saved somewhere');
          await new Promise((r) => setTimeout(r, 250));
          const pop = document.getElementById('pop').getBoundingClientRect(), t = document.getElementById('toast').getBoundingClientRect();
          const out = { kb: getComputedStyle(document.documentElement).getPropertyValue('--kb').trim(), popBottom: Math.round(pop.bottom), popTop: Math.round(pop.top), toastBottom: Math.round(t.bottom), vvh: h };
          delete vv.height; vv.dispatchEvent(new Event('resize'));
          return out;
        });
        check('bàn phím ảo (visualViewport co): tấm nhận xét và toast nằm trên bàn phím, tấm trọn phần còn lại', kb.kb === '300px' && kb.popBottom <= kb.vvh + 1 && kb.popTop >= 0 && kb.toastBottom <= kb.popTop + 1, JSON.stringify(kb));
        const sb = await p.locator('#pop-save').boundingBox(); await p.touchscreen.tap(sb.x + sb.width / 2, sb.y + sb.height / 2); await p.waitForTimeout(200);
        check('màn cảm ứng: Save lưu nhận xét nhiều dòng', /line one\nline two|line one line two/.test(await p.$eval('#out', (e) => e.textContent)) || (await p.$$('#list .ma-item')).length > 0);
      }
      await c.close();
    }
  }
  // ── end mob:touch-sheet ──

  // ── mob:touch-picks ──
  /* ---------- Chọn dòng bằng chạm (MDAN-050): nhấn giữ số dòng vào chế độ, chạm thêm / bỏ, Done và Cancel thoát, đáy trang
     đủ chỗ cho dòng cuối, gợi ý ở hộp Shortcuts ---------- */
  {
    const devices = pw.devices;
    const mk = async (name) => {
      const d = Object.assign({}, devices[name], { deviceScaleFactor: 1 }); delete d.defaultBrowserType;
      const c = await browser.newContext(d), p = await c.newPage(); watch(p);
      await p.goto(BASE); await p.waitForFunction(() => window.marked && window.DOMPurify);
      await p.evaluate(() => document.getElementById('btn-sample').click()); await p.waitForTimeout(200);
      await p.$eval('.ma-tab[data-view="src"]', (e) => e.click()); await p.waitForTimeout(200);
      return { c, p, cdp: await c.newCDPSession(p) };
    };
    const tpt = (cdp, type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
    const hold = async (p, cdp, x, y, ms) => { await tpt(cdp, 'touchStart', [{ x, y }]); await p.waitForTimeout(ms); await tpt(cdp, 'touchEnd', []); await p.waitForTimeout(250); };
    const gut = (p, n) => p.evaluate((n) => { const el = document.querySelector(`#v-src .ma-ln:nth-child(${n})`); const r = el.getBoundingClientRect(); return { x: r.left + 6, y: r.top + 8 }; }, n);
    const st = (p) => p.evaluate(() => ({ picking: document.getElementById('v-src').classList.contains('is-picking'),
      picks: [...document.querySelectorAll('#v-src .ma-ln')].map((l, i) => (l.classList.contains('is-pick') ? i + 1 : 0)).filter(Boolean).join(),
      pop: !document.getElementById('pop').hidden, done: !!document.getElementById('pop-done').getClientRects().length, sel: getSelection().toString() }));
    /* Một dòng có chữ, khác `not`, đầu dòng nằm giữa thanh trên và đỉnh tấm (hay đáy khung nhìn). */
    const visLine = (p, not) => p.evaluate((not) => {
      const pop = document.getElementById('pop'), lim = pop.hidden ? innerHeight - 90 : pop.getBoundingClientRect().top;
      const ls = [...document.querySelectorAll('#v-src .ma-ln')];
      return ls.findIndex((l, i) => i + 1 !== not && l.textContent.trim() && l.getBoundingClientRect().top > 80 && l.getBoundingClientRect().top < lim - 24) + 1;
    }, not);
    let { c, p, cdp } = await mk('iPhone 15 Pro');
    check('chọn dòng bằng chạm: lề số không phóng to khi chạm hai lần (touch-action)', (await p.$eval('#v-src', (e) => getComputedStyle(e).touchAction)) === 'manipulation');
    let n = await visLine(p), g = await gut(p, n);
    await hold(p, cdp, g.x, g.y, 120);
    const s0 = await st(p);
    await tpt(cdp, 'touchStart', [{ x: g.x, y: g.y }]);
    for (let i = 1; i <= 6; i++) { await tpt(cdp, 'touchMove', [{ x: g.x, y: g.y - i * 15 }]); await p.waitForTimeout(40); }
    await p.waitForTimeout(500); await tpt(cdp, 'touchEnd', []); await p.waitForTimeout(250);
    const s1 = await st(p);
    check('chọn dòng bằng chạm: chạm ngắn hay vuốt từ lề số không vào chế độ', !s0.picking && !s1.picking && !s0.pop && !s1.pop, JSON.stringify([s0, s1]));
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(150);
    n = await visLine(p); g = await gut(p, n);
    await hold(p, cdp, g.x, g.y, 650);
    const s2 = await st(p);
    check('chọn dòng bằng chạm: nhấn giữ số dòng vào chế độ với dòng ấy, mở tấm có Done, không bôi đen', s2.picking && s2.picks === String(n) && s2.pop && s2.done && !s2.sel, JSON.stringify([n, s2]));
    const m = await visLine(p, n); g = await gut(p, m);
    await p.touchscreen.tap(g.x, g.y); await p.waitForTimeout(250);
    const s3 = await st(p);
    check('chọn dòng bằng chạm: chạm số dòng khác thì thêm', s3.picks.split(',').length === 2 && s3.pop, JSON.stringify([m, s3]));
    // Đáy trang đủ chỗ: cuộn hết xuống thì dòng cuối nằm trên tấm.
    await p.evaluate(() => window.scrollTo(0, 1e6)); await p.waitForTimeout(250);
    const lastV = await p.evaluate(() => { const ls = document.querySelectorAll('#v-src .ma-ln'); return [ls[ls.length - 1].getBoundingClientRect().bottom, document.getElementById('pop').getBoundingClientRect().top]; });
    check('chọn dòng bằng chạm: cuộn hết xuống thì dòng cuối nằm trên tấm', lastV[0] <= lastV[1], JSON.stringify(lastV));
    let b = await p.locator('#pop-cancel').boundingBox(); await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await p.waitForTimeout(250);
    const s4 = await st(p);
    check('chọn dòng bằng chạm: Cancel ở màn cảm ứng thoát chế độ', !s4.picking && !s4.picks && !s4.pop, JSON.stringify(s4));
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(150);
    n = await visLine(p); g = await gut(p, n); await hold(p, cdp, g.x, g.y, 650);
    b = await p.locator('#pop-done').boundingBox(); await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await p.waitForTimeout(250);
    const s5 = await st(p);
    check('chọn dòng bằng chạm: Done thoát chế độ, bỏ các dòng', !s5.picking && !s5.picks && !s5.pop && b.height >= 44, JSON.stringify([s5, b.height]));
    // Hộp Shortcuts: gợi ý nhấn giữ chỉ ở màn cảm ứng.
    await p.$eval('#btn-layout', (e) => e.click()); await p.$eval('#btn-keys', (e) => e.click()); await p.waitForTimeout(400);
    const hint = await p.evaluate(() => [!![...document.querySelectorAll('#dlg-keys .ma-only-touch')].find((e) => e.getClientRects().length && /long-press a line number/i.test(e.textContent)),
      [...document.querySelectorAll('#keys-list .ma-key')].some((k) => k.textContent === 'Long-press')]);
    check('hộp Shortcuts ở màn cảm ứng: có dòng "long-press a line number" và phím Long-press', hint[0] && hint[1], JSON.stringify(hint));
    await c.close();
    // Nằm ngang: tấm chọn dòng gọn, còn thấy lề số phía trên.
    ({ c, p, cdp } = await mk('iPhone 15 Pro landscape'));
    n = await p.evaluate(() => [...document.querySelectorAll('#v-src .ma-ln')].findIndex((l) => l.textContent.trim() && l.getBoundingClientRect().top > 70) + 1);
    await p.evaluate((n) => document.querySelector(`#v-src .ma-ln:nth-child(${n})`).scrollIntoView({ block: 'center' }), n); await p.waitForTimeout(150);
    g = await gut(p, n); await hold(p, cdp, g.x, g.y, 650); await p.waitForTimeout(300);
    const land = await p.evaluate(() => [Math.round(document.getElementById('pop').getBoundingClientRect().top), innerHeight, !!document.querySelector('#v-src .is-pick')]);
    check('chọn dòng bằng chạm, nằm ngang: tấm gọn, còn ≥ 40% khung nhìn cho lề số', land[2] && land[0] >= land[1] * 0.4, JSON.stringify(land));
    await c.close();
    // Máy tính: Cancel giữ dòng (MDAN-014); bấm dòng đã chọn chỉ mở lại hộp, không bỏ dòng. Không có gợi ý nhấn giữ.
    c = await browser.newContext({ viewport: { width: 1280, height: 900 } }); p = await c.newPage(); watch(p);
    await p.goto(BASE); await p.waitForFunction(() => window.marked && window.DOMPurify);
    await p.click('#btn-sample'); await p.click('.ma-tab[data-view="src"]'); await p.waitForTimeout(200);
    g = await gut(p, 3); await p.mouse.dblclick(g.x, g.y); await p.waitForTimeout(200);
    await p.click('#pop-cancel'); await p.waitForTimeout(100);
    const d1 = await st(p);
    g = await gut(p, 3); await p.mouse.click(g.x, g.y); await p.waitForTimeout(200);
    const d2 = await st(p);
    check('máy tính: Cancel giữ dòng; bấm dòng đã chọn mở lại hộp mà không bỏ dòng', d1.picking && d1.picks === '3' && !d1.pop && d2.picks === '3' && d2.pop && d2.done, JSON.stringify([d1, d2]));
    await p.click('#pop-done'); await p.waitForTimeout(100);
    check('máy tính: nút Done thoát chế độ chọn dòng', !(await st(p)).picking);
    await p.click('#btn-layout'); await p.click('#btn-keys'); await p.waitForTimeout(400);
    check('hộp Shortcuts ở máy tính: không có dòng gợi ý chỉ cho cảm ứng', await p.evaluate(() => [...document.querySelectorAll('#dlg-keys .ma-only-touch')].every((e) => !e.getClientRects().length)));
    await c.close();
  }
  // ── end mob:touch-picks ──

  // ── mob:touch-bar ──
  /* ---------- Thanh trên tự ẩn ở điện thoại (MDAN-051): cuộn xuống thì trượt lên khuất, cuộn lên một chút thì về; luôn hiện ở
     đầu trang và khi hộp thoại / menu mở; giảm chuyển động thì không trượt; máy tính không ẩn ---------- */
  {
    const devices = pw.devices;
    const barState = (p) => p.evaluate(() => { const b = document.querySelector('.ma-bar'), r = b.getBoundingClientRect(); return { away: b.classList.contains('is-away'), bottom: Math.round(r.bottom), y: Math.round(scrollY), tr: getComputedStyle(b).transitionDuration }; });
    for (const [name, reduced] of [['iPhone 15 Pro', false], ['iPhone 15 Pro landscape', false], ['Pixel 7', true]]) {
      const d = Object.assign({}, devices[name], { deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference' }); delete d.defaultBrowserType;
      const c = await browser.newContext(d), p = await c.newPage(); watch(p);
      const cdp = await c.newCDPSession(p);
      await p.goto(BASE); await p.waitForFunction(() => window.marked && window.DOMPurify);
      await p.evaluate(() => document.getElementById('btn-sample').click()); await p.waitForTimeout(250);
      const vh = await p.evaluate(() => innerHeight);
      const sw = async (y1, y2) => {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 150, y: y1 }] });
        for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 150, y: y1 + (y2 - y1) * i / 8 }] }); await p.waitForTimeout(16); }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(450);
      };
      const top = await barState(p);
      await sw(vh - 80, vh - 280);
      const down = await barState(p);
      await sw(vh / 2, vh / 2 + 50);
      const up = await barState(p);
      await sw(vh - 80, vh - 280);
      await p.$eval('#btn-layout', (e) => e.click()); await p.waitForTimeout(300);
      const dlg = await barState(p);
      await p.keyboard.press('Escape'); await p.waitForTimeout(100);
      await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
      const back = await barState(p);
      check(`thanh trên tự ẩn (${name}${reduced ? ', giảm chuyển động' : ''}): ở đầu trang hiện; cuộn xuống khuất; cuộn lên chút thì về; hộp thoại mở thì hiện; về đầu thì hiện`,
        !top.away && down.away && down.bottom <= 0 && down.y > 0 && !up.away && up.bottom > 0 && !dlg.away && !back.away && (reduced ? parseFloat(down.tr) === 0 : parseFloat(down.tr) > 0),
        JSON.stringify({ top, down, up, dlg, back }));
      await c.close();
    }
    const c = await browser.newContext({ viewport: { width: 1280, height: 800 } }), p = await c.newPage(); watch(p);
    await p.goto(BASE); await p.waitForFunction(() => window.marked && window.DOMPurify);
    await p.click('#btn-sample'); await p.waitForTimeout(200);
    await p.mouse.move(600, 500); await p.mouse.wheel(0, 400); await p.waitForTimeout(300);
    check('máy tính: thanh trên không tự ẩn', !(await barState(p)).away);
    await c.close();
  }
  // ── end mob:touch-bar ──

  // ── mob:touch-review ──
  /* ---------- Hai dấu tách bạch (MDAN-052): gợi ý = đĩa ✓ xanh nhạt đặc, không viền đứt; đơn vị hiện tại = vạch dọc mảnh
     cạnh khối, không ✓; cả hai ≥ 3:1, hai theme. Màn cảm ứng có gợi ý: viên thuốc "Accept N", chạm thì đánh dấu, có Undo ---------- */
  for (const scheme of ['light', 'dark']) {
    const d = Object.assign({}, pw.devices['iPhone 15 Pro'], { deviceScaleFactor: 1, colorScheme: scheme, reducedMotion: 'reduce' }); delete d.defaultBrowserType;
    const c = await browser.newContext(d), p = await c.newPage(); watch(p);
    const cdp = await c.newCDPSession(p);
    await p.clock.install();
    await p.goto(BASE); await p.waitForFunction(() => window.marked && window.DOMPurify);
    const paras = Array.from({ length: 16 }, (_, i) => `Para P${i + 1} ` + 'chữ đọc thử '.repeat(6).trim() + '.');
    await p.evaluate((t) => { const ta = document.getElementById('src-input'); ta.value = t; ta.dispatchEvent(new Event('input')); }, ['# Touch review', '', ...paras.flatMap((x) => [x, ''])].join('\n'));
    await p.clock.runFor(400);
    await p.$eval('.ma-tab[data-view="view"]', (e) => e.click()); await p.clock.runFor(300);
    const sw = async (y1, y2) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: y1 }] });
      for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y: y1 + (y2 - y1) * i / 6 }] }); await p.waitForTimeout(20); await p.clock.runFor(20); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(60); await p.clock.runFor(300);
    };
    // Đọc: vuốt từng nhịp, mỗi nhịp đứng 15 s (đồng hồ giả), rồi vuốt qua: các khối vừa đọc thành gợi ý.
    for (let k = 0; k < 4; k++) { await sw(520, 400); await p.clock.runFor(15000); }
    await sw(560, 300); await p.clock.runFor(600);
    const sg = await p.$$eval('#wrap-md .ma-lane__b.is-sug', (bs) => bs.map((b) => b.dataset.u));
    const pill = await p.evaluate(() => [!document.getElementById('rv-pill').hidden && !!document.getElementById('rv-pill').getClientRects().length, document.getElementById('rv-pill-t').textContent]);
    check(`cảm ứng (${scheme}): có gợi ý thì viên thuốc hiện "Accept N" (chưa có dấu nào)`, sg.length > 0 && pill[0] && pill[1] === 'Accept ' + sg.length, JSON.stringify([sg, pill]));
    // Kiểu hai dấu.
    const look = await p.evaluate(() => {
      const rgb = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number);
      const lum = (c) => { const x = c.map((n) => { n /= 255; return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; }); return 0.2126 * x[0] + 0.7152 * x[1] + 0.0722 * x[2]; };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2); };
      const surf = rgb(getComputedStyle(document.getElementById('doc')).backgroundColor);
      const dark = document.documentElement.classList.contains('dark'), hint = dark ? [0x8d, 0x98, 0x91] : [0x5b, 0x64, 0x5e];   // nét ✓ của --ic-check-hint
      const s = document.querySelector('#wrap-md .ma-lane__b.is-sug'), sa = getComputedStyle(s, '::after');
      const fill = rgb(sa.backgroundColor);
      document.documentElement.classList.add('ma-reviewing');   // vạch đơn vị hiện tại chỉ vẽ khi đã có dấu
      const cur = [...document.querySelectorAll('#wrap-md .ma-lane__b')].find((b) => !b.classList.contains('is-sug') && !b.classList.contains('is-head'));
      cur.classList.add('is-cur');
      const cs = getComputedStyle(cur), ca = getComputedStyle(cur, '::after'), bar = cs.boxShadow.match(/rgba?\([^)]*\)/);
      const out = { sugBorder: sa.borderTopStyle, sugImg: sa.backgroundImage.includes('svg'), sugFill: ratio(fill, surf) > 1.05, glyph: ratio(hint, fill),
        curImg: ca.backgroundImage, curBar: bar ? ratio(rgb(bar[0]), surf) : 0, curShadow: cs.boxShadow };
      cur.classList.remove('is-cur'); document.documentElement.classList.remove('ma-reviewing');
      return out;
    });
    check(`dấu gợi ý vs đơn vị hiện tại (${scheme}): gợi ý là đĩa đặc có ✓ (≥ 3:1), không viền đứt; hiện tại là vạch ≥ 3:1, không ✓`,
      look.sugBorder !== 'dashed' && look.sugImg && look.sugFill && look.glyph >= 3 && look.curImg === 'none' && look.curBar >= 3, JSON.stringify(look));
    const b = await p.locator('#rv-pill').boundingBox();
    await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await p.clock.runFor(300);
    const after = await p.evaluate(() => [[...document.querySelectorAll('#wrap-md .ma-lane__b.is-done')].map((x) => x.dataset.u), document.querySelectorAll('#wrap-md .ma-lane__b.is-sug').length,
      document.getElementById('rv-pill-t').textContent, !!document.querySelector('#toast:not([hidden]) .ma-toast__btn')]);
    check(`cảm ứng (${scheme}): chạm "Accept N" đánh dấu đúng các khối được gợi ý, viên thuốc về "✓ Done · next", toast có Undo`,
      after[0].join() === sg.join() && after[1] === 0 && after[2] === '✓ Done · next ↓' && after[3], JSON.stringify([sg, after]));
    await p.$eval('#toast .ma-toast__btn', (e) => e.click()); await p.clock.runFor(200);
    const undo = await p.evaluate(() => [document.querySelectorAll('#wrap-md .ma-lane__b.is-done').length, document.getElementById('rv-pill-t').textContent]);
    check(`cảm ứng (${scheme}): Undo trả lại cả gợi ý ("Accept N")`, undo[0] === 0 && undo[1] === 'Accept ' + sg.length, JSON.stringify(undo));
    // Tab Review ở màn cảm ứng nói về viên thuốc, không về X / J / K / làn.
    await p.$eval('#dock-n', (e) => e.click()); await p.$eval('#ptab-review', (e) => e.click()); await p.clock.runFor(300);
    const copy = await p.evaluate(() => [...document.querySelectorAll('#rv-body .ma-sub')].filter((e) => e.getClientRects().length).map((e) => e.textContent).join(' '));
    check(`tab Review ở màn cảm ứng (${scheme}): nói về viên thuốc và Accept N, không nói X / J / K / làn`, /Done · next/.test(copy) && /Accept N/.test(copy) && !/\bJ\b|\bK\b|lane/.test(copy), copy);
    await c.close();
  }
  // ── end mob:touch-review ──

  // ── hl: tô màu nạp khi cần (MDAN-066) ──
  {
    const hlRows = (p) => p.$$eval('#tree-list .ma-trow', (ls) => ls.map((l) => (l.querySelector('.ma-trow__name') || {}).textContent));
    const hlRow = (name) => `#tree-list .ma-trow:has(> .ma-trow__name:text-is("${name}"))`;
    const PY = 'def f(x):\n    return "hi"  # note\n';
    const MD = '# Code\n\nMở đầu có chữ.\n\n```python\n' + PY + '```\n\nCuối.\n';
    const RS = 'fn main() {\n    let n = 42; // số\n    println!("{}", n);\n}\n';
    const hc = await treeContext({ viewport: { width: 1920, height: 900 }, colorScheme: 'light' });
    const hp = await hc.newPage(); watch(hp);
    const hlReq = [];
    hp.on('request', (r) => { const m = /\/highlight\.js\/11\.9\.0\/(.+)$/.exec(r.url()); if (m) hlReq.push(m[1]); });
    await hp.goto(BASE); await hp.waitForFunction(() => window.marked && window.DOMPurify); await hp.waitForTimeout(300);
    check('tô màu nạp khi cần: mở trang không tải highlight.js', hlReq.length === 0, hlReq.join());
    const plain = await hp.evaluate((t) => {
      const ta = document.getElementById('src-input');
      ta.focus(); ta.dispatchEvent(new Event('paste')); ta.value = t; ta.dispatchEvent(new Event('input'));
      const c = document.querySelector('#v-md pre code');
      return { spans: c.querySelectorAll('span').length, h: c.getBoundingClientRect().height };
    }, MD);
    check('tô màu nạp khi cần: khối code hiện chữ trơn ngay', plain.spans === 0, JSON.stringify(plain));
    await hp.waitForSelector('#v-md pre code span.hljs-keyword');
    const up = await hp.$eval('#v-md pre code', (c) => ({ text: c.textContent, kw: c.querySelector('.hljs-keyword').textContent, cm: !!c.querySelector('.hljs-comment'), h: c.getBoundingClientRect().height }));
    check('tô màu nạp khi cần: khối ```python tải lõi + python, không gì khác', hlReq.join() === 'es/core.min.js,es/languages/python.min.js', hlReq.join());
    check('tô màu nạp khi cần: chữ trơn lên màu, chữ và chiều cao giữ nguyên', up.text === PY && up.kw === 'def' && up.cm && up.h === plain.h, JSON.stringify([up, plain.h]));
    const kwColor = () => hp.$eval('#v-md .hljs-keyword', (e) => getComputedStyle(e).color);
    const light = await kwColor();

    // Nhận xét trong khối đã tô: mark bọc trong span màu, màu còn nguyên.
    await hp.waitForTimeout(700);
    await dragSelect(hp, '#v-md', 'return "hi"');
    check('tô màu nạp khi cần: bôi đen trong khối đã tô mở hộp nhận xét', await hp.isVisible('#pop') && (await hp.textContent('#pop-q')) === 'return "hi"', await hp.textContent('#pop-q'));
    await hp.keyboard.type('Sửa chữ'); await hp.keyboard.press('Enter');
    const mk = await hp.$eval('#v-md pre code', (c) => ({ mark: [...c.querySelectorAll('mark')].map((m) => m.textContent).join('').replace(/\s/g, ''), kw: c.querySelectorAll('.hljs-keyword').length, text: c.textContent }));
    check('tô màu nạp khi cần: nhận xét trong code có highlight, khối vẫn tô màu, chữ không đổi', mk.mark === 'return"hi"' && mk.kw === 2 && mk.text === PY, JSON.stringify(mk));

    // Mở file .rs: chỉ lúc ấy mới tải rust; Source của file code tô bằng highlight.js, text đúng bằng nguồn.
    check('tô màu nạp khi cần: chưa mở file .rs thì chưa tải rust', !hlReq.some((u) => /rust/.test(u)));
    await hp.setInputFiles('#file-in', { name: 'main.rs', mimeType: 'text/plain', buffer: Buffer.from(RS) });
    await hp.click('.ma-tab[data-view="src"]');
    await hp.waitForSelector('#v-src .sx-punct');
    const rs = await hp.$eval('#v-src', (v) => ({ text: v.textContent, kw: [...v.querySelectorAll('.sx-punct')].map((e) => e.textContent), cm: [...v.querySelectorAll('.sx-comment')].map((e) => e.textContent), lines: v.querySelectorAll('.ma-ln').length }));
    check('tô màu nạp khi cần: mở main.rs thì tải rust (một lần)', hlReq.filter((u) => /rust/.test(u)).length === 1 && hlReq.length === 3, hlReq.join());
    check('tô màu nạp khi cần: Source của .rs có token màu, text đúng bằng nguồn', rs.text === RS && rs.kw.includes('fn') && rs.kw.includes('let') && rs.cm.join() === '// số' && rs.lines === 4, JSON.stringify(rs));

    // Về file markdown: Source tô bằng bộ tách markdown như cũ, khối code ở Preview còn màu; không tải lại gì.
    await hp.click(hlRow('untitled.md')); await hp.waitForTimeout(200);
    const back = await hp.evaluate(() => ({ head: !!document.querySelector('#v-src .sx-head'), md: document.querySelectorAll('#v-md pre code .hljs-keyword').length }));
    check('tô màu nạp khi cần: về file .md — Source tô markdown, Preview vẫn tô code, không tải lại', back.head && back.md === 2 && hlReq.length === 3, JSON.stringify([back, hlReq]));

    // Split và theme tối: cả hai khung tô, màu code theo theme.
    await hp.click('.ma-tab[data-view="split"]'); await hp.waitForTimeout(200);
    const sp = await hp.evaluate(() => ({ split: !document.getElementById('wrap-src').hidden && !document.getElementById('wrap-md').hidden && getComputedStyle(document.getElementById('wrap-src')).display !== 'none', src: !!document.querySelector('#v-src .sx-code'), md: !!document.querySelector('#v-md .hljs-keyword') }));
    check('tô màu nạp khi cần: Split — hai khung đều tô màu', sp.split && sp.src && sp.md, JSON.stringify(sp));
    await hp.click('#theme'); await hp.waitForTimeout(100);
    check('tô màu nạp khi cần: theme tối đổi màu code ở Preview', (await kwColor()) !== light, light);
    await hp.click('#theme');
    check('tô màu nạp khi cần: cây có hai file', (await hlRows(hp)).join() === 'main.rs,untitled.md', (await hlRows(hp)).join());
    await hc.close();

    // Điện thoại: khối code lên màu, không tràn ngang.
    const pc = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: 'dark' });
    const pp = await pc.newPage(); watch(pp);
    await pp.goto(BASE); await pp.waitForFunction(() => window.marked && window.DOMPurify);
    await pp.evaluate((t) => { const ta = document.getElementById('src-input'); ta.focus(); ta.dispatchEvent(new Event('paste')); ta.value = t; ta.dispatchEvent(new Event('input')); }, MD);
    await pp.waitForSelector('#v-md pre code span.hljs-keyword');
    check('tô màu nạp khi cần: điện thoại tô khối code, không tràn ngang', (await overflow(pp)) === 0);
    await pc.close();

    // Tải hỏng (mất mạng, sai integrity): chữ trơn, một cảnh báo, không lỗi script. Trang này không vào `errors`:
    // trình duyệt tự ghi lỗi mạng / integrity vào console.
    const fc = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const fpg = await fc.newPage();
    const warns = [], pageErr = [];
    fpg.on('console', (m) => { if (m.type() === 'warning' && /code colors/.test(m.text())) warns.push(m.text()); });
    fpg.on('pageerror', (e) => pageErr.push(String(e)));
    await fpg.route(/languages\/go\.min\.js$/, (r) => r.abort());
    await fpg.route(/languages\/rust\.min\.js$/, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: 'export default function () { return {}; }' }));
    await fpg.goto(BASE); await fpg.waitForFunction(() => window.marked && window.DOMPurify);
    await fpg.evaluate((t) => { const ta = document.getElementById('src-input'); ta.focus(); ta.dispatchEvent(new Event('paste')); ta.value = t; ta.dispatchEvent(new Event('input')); },
      '# Hỏng\n\n```go\nfunc main() {}\n```\n\n```rust\nfn main() {}\n```\n\n```python\nx = 1\n```\n');
    await fpg.waitForSelector('#v-md code.language-python .hljs-number'); await fpg.waitForTimeout(300);
    const fail = await fpg.evaluate(() => [...document.querySelectorAll('#v-md pre code')].map((c) => c.querySelectorAll('span').length + ':' + c.textContent.trim()));
    check('tô màu nạp khi cần: tải hỏng / sai integrity thì chữ trơn, ngôn ngữ khác vẫn tô', fail[0] === '0:func main() {}' && fail[1] === '0:fn main() {}' && /^[1-9]\d*:x = 1$/.test(fail[2]), JSON.stringify(fail));
    check('tô màu nạp khi cần: tải hỏng chỉ một cảnh báo, không lỗi script', warns.length === 1 && !pageErr.length, JSON.stringify([warns, pageErr]));
    await fc.close();
  }
  // ── end hl ──

  // ── modes: Preview / Split chỉ cho markdown (MDAN-067) ──
  {
    const mRow = (name) => `#tree-list .ma-trow:has(> .ma-trow__name:text-is("${name}"))`;
    const mc = await treeContext({ viewport: { width: 1920, height: 900 }, colorScheme: 'light' });
    const mp = await mc.newPage(); watch(mp);
    const state = () => mp.evaluate(() => ({
      tabs: [...document.querySelectorAll('.ma-tab')].filter((b) => !b.hidden && b.getClientRects().length).map((b) => b.dataset.view).join(),
      mode: document.getElementById('views').dataset.mode,
      pref: JSON.parse(localStorage.getItem('md-annotate:prefs:v1') || '{}').view
    }));
    await mp.goto(BASE); await mp.waitForFunction(() => window.marked && window.DOMPurify);
    await mp.evaluate((t) => { const ta = document.getElementById('src-input'); ta.focus(); ta.dispatchEvent(new Event('paste')); ta.value = t; ta.dispatchEvent(new Event('input')); }, DOC);
    await mp.click('.ma-tab[data-view="split"]'); await mp.waitForTimeout(150);
    const md = await state();
    check('chế độ xem: file .md có Edit, Source, Preview, Split', md.tabs === 'edit,src,view,split' && md.mode === 'split' && md.pref === 'split', JSON.stringify(md));

    await mp.setInputFiles('#file-in', { name: 'main.rs', mimeType: 'text/plain', buffer: Buffer.from('fn main() {\n    let n = 1;\n}\n') });
    await mp.waitForTimeout(200);
    const rs = await state();
    check('chế độ xem: file .rs ẩn Preview / Split, hiện Source, Split đã nhớ không bị ghi đè', rs.tabs === 'edit,src' && rs.mode === 'src' && rs.pref === 'split', JSON.stringify(rs));
    await mp.focus('.ma-tab[data-view="src"]'); await mp.keyboard.press('ArrowRight'); await mp.waitForTimeout(100);
    const kEdit = await state();
    await mp.keyboard.press('ArrowRight'); await mp.waitForTimeout(100);
    const kSrc = await state();
    check('chế độ xem: phím mũi tên ở hàng tab bỏ qua Preview / Split ẩn', kEdit.mode === 'edit' && kSrc.mode === 'src', JSON.stringify([kEdit, kSrc]));
    await mp.click('.ma-tab[data-view="src"]'); await mp.waitForTimeout(100);
    check('chế độ xem: bấm Source ở file .rs không ghi đè Split đã nhớ', (await state()).pref === 'split', JSON.stringify(await state()));

    // Hộp nhận xét mở ở file .rs: đổi cỡ cửa sổ không đóng nó (Split không "về lại" ở file không có Preview).
    await mp.waitForTimeout(700);
    await dragSelect(mp, '#v-src', 'let n = 1;');
    await mp.keyboard.type('Ghi chú');
    await mp.setViewportSize({ width: 1800, height: 900 }); await mp.waitForTimeout(300);
    check('chế độ xem: đổi cỡ cửa sổ ở file .rs không đóng hộp nhận xét', await mp.isVisible('#pop') && (await mp.inputValue('#pop-text')) === 'Ghi chú');
    await mp.keyboard.press('Escape'); await mp.waitForTimeout(100);
    if (await mp.isVisible('#pop')) { await mp.click('#pop-cancel').catch(() => {}); await mp.waitForTimeout(100); }

    await mp.click(mRow('untitled.md')); await mp.waitForTimeout(200);
    const back = await state();
    check('chế độ xem: về file .md thì Split trở lại', back.tabs === 'edit,src,view,split' && back.mode === 'split', JSON.stringify(back));

    // Tải lại khi file .rs đang mở: Source; sang .md: Split.
    await mp.click(mRow('main.rs')); await mp.waitForTimeout(200);
    await mp.reload(); await mp.waitForFunction(() => window.marked && window.DOMPurify); await mp.waitForTimeout(200);
    const re = await state();
    await mp.click(mRow('untitled.md')); await mp.waitForTimeout(200);
    const re2 = await state();
    check('chế độ xem: tải lại với file .rs mở — Source; sang .md — Split', re.mode === 'src' && re.tabs === 'edit,src' && re2.mode === 'split', JSON.stringify([re, re2]));
    await mc.close();
  }
  // ── end modes ──

  check('không lỗi console', !errors.length, errors.join(' | '));
  await browser.close();
  console.log(fails ? `md-annotate smoke: ${fails} LỖI` : 'md-annotate smoke: OK');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
