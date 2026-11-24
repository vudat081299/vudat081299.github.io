/* Bấm thật trong Chromium: tạo từ mọi mẫu, thêm / sửa / xoá, hoàn tác, sắp xếp bằng nút và kéo thả, lọc, quay lại,
 * nhật ký, lưu qua lần tải lại, Markdown và JSON đi rồi về, bộ nhớ bị chặn, tràn ngang ở 390px, lỗi console.
 * Chạy: python3 -m http.server 8347 (ở gốc repo), rồi
 *       node step-planner/tools/smoke.cjs http://127.0.0.1:8347/step-planner/
 * Thiếu playwright thì thoát mã 2 (BỎ QUA), như tools/smoke-index.js. */
'use strict';
const fs = require('fs');
const BASE = (process.argv[2] || 'http://127.0.0.1:8347/step-planner/').replace(/\/?$/, '/');

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

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const open = async (w, h, opts = {}) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, acceptDownloads: true, ...opts });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('dialog', (d) => { errors.push('hộp alert/confirm của trình duyệt: ' + d.message()); d.dismiss(); });
    const res = await page.goto(BASE);
    if (!res || res.status() !== 200) throw new Error('HTTP ' + (res && res.status()));
    return { ctx, page };
  };
  const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('stepPlanner.v1') || 'null'));
  const cur = async (page) => { const s = await stored(page); return s.workspaces.find((w) => w.id === s.lastId); };
  const shape = (page, ws) => page.evaluate(async (w) => (await import(new URL('js/core.js', location.href).href)).shape(w), ws);
  const subSel = (id, act) => `.card[data-sub="${id}"] [data-act="${act}"]`;
  const hOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  /* ── Máy rộng ── */
  const { ctx, page } = await open(1280, 900, { permissions: ['clipboard-read', 'clipboard-write'] });
  await page.waitForSelector('#start:not([hidden]) .tpl');
  const tplIds = await page.$$eval('#start .tpl', (bs) => bs.map((b) => b.dataset.tpl));
  check('màn đầu: đủ năm mẫu', tplIds.length === 5, tplIds.join(','));

  // Tạo từ từng mẫu: số bước và bước con khớp templates.json.
  const tplData = await page.evaluate(async () => (await (await fetch('data/templates.json')).json()).templates);
  await page.click('#start .tpl[data-tpl="crisp-dm"]');
  for (const id of tplIds.filter((x) => x !== 'crisp-dm')) {
    await page.click('#ws-btn');
    await page.check(`#ws-new-templates input[value="${id}"]`);
    await page.click('#ws-new button[type="submit"]');
  }
  const s0 = await stored(page);
  const okTpl = tplData.every((t) => {
    const w = s0.workspaces.find((x) => x.templateId === t.id);
    return w && w.steps.length === t.steps.length
      && w.steps.every((st, i) => st.subs.length === t.steps[i].subs.length && st.title === t.steps[i].title);
  });
  check('tạo từ mỗi mẫu: đúng bước và bước con', s0.workspaces.length === 5 && okTpl);
  check('dự án trống: báo chưa có bước', /Chưa có bước nào/.test(await page.textContent('#board')));
  // Số bước / bước con của CRISP-DM đọc từ templates.json, không ghi tay (mẫu đổi thì smoke theo).
  const crisp = tplData.find((t) => t.id === 'crisp-dm');
  const nSteps = crisp.steps.length, n1 = crisp.steps[0].subs.length, n2 = crisp.steps[1].subs.length;

  // Thẻ cao theo nội dung trong khoảng min–max (dự án trống): không bị kéo cao bằng thẻ cao nhất hàng;
  // thẻ dài chạm max thì cắt, có "Xem thêm", bấm thì mở hết.
  await page.click('#add-step');
  await page.fill('#step-form [name="title"]', 'Hàng thử');
  await page.click('#step-form button[type="submit"]');
  for (const [title, notes] of [['Ngắn', ''], ['Dài', Array.from({ length: 40 }, (_, i) => 'dòng ghi chú ' + i).join('\n')]]) {
    await page.click('.step-head [data-act="add-sub"]');
    await page.fill('#sub-form [name="title"]', title);
    await page.fill('#sub-form [name="notes"]', notes);
    await page.click('#sub-form button[type="submit"]');
  }
  const ch = await page.evaluate(() => {
    const [a, b] = document.querySelectorAll('.card[data-sub]');
    const cs = getComputedStyle(b);
    return { a: a.getBoundingClientRect().height, b: b.getBoundingClientRect().height, min: parseFloat(cs.minHeight),
      max: parseFloat(cs.maxHeight), cut: b.classList.contains('cut') && !a.classList.contains('cut'), more: !!b.querySelector('.more') };
  });
  check('thẻ cao theo nội dung, không kéo cao theo thẻ cao nhất hàng', ch.max > ch.min && ch.a >= ch.min - 1 && ch.a < ch.b - 40,
    JSON.stringify(ch));
  check('thẻ dài dừng ở max-height, cắt và có "Xem thêm"', Math.abs(ch.b - ch.max) < 1 && ch.cut && ch.more, JSON.stringify(ch));
  await page.click('.card .more');
  check('"Xem thêm" mở cả thẻ', await page.evaluate((max) => document.querySelectorAll('.card[data-sub]')[1].getBoundingClientRect().height > max + 40, ch.max));

  // Về CRISP-DM.
  await page.click('#ws-btn');
  await page.click('.ws-item:first-child [data-act="ws-open"]');
  check('đổi dự án: tên trên thanh trên', /CRISP-DM/.test(await page.textContent('#ws-name')));
  const nRows = await page.$$eval('.step', (r) => r.length);
  check('mỗi bước một hàng', nRows === nSteps);
  const geo = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.step')];
    const firstCards = rows.map((r) => r.querySelector('.card[data-sub]').getBoundingClientRect().left);
    const heads = rows.map((r) => r.querySelector('.step-head').getBoundingClientRect());
    const c = rows[0].querySelectorAll('.card[data-sub]');
    return {
      sameLeft: firstCards.every((x) => Math.abs(x - firstCards[0]) < 1),
      cardsRight: c[1].getBoundingClientRect().left > c[0].getBoundingClientRect().right,
      sameRowTop: Math.abs(c[1].getBoundingClientRect().top - c[0].getBoundingClientRect().top) < 1,
      headLeft: heads[0].right <= rows[0].querySelector('.card').getBoundingClientRect().left,
      nums: [...rows[1].querySelectorAll('.card .num')].map((n) => n.textContent).slice(0, 2).join(','),
      next: rows[0].querySelector('.card.next .num')?.textContent,
    };
  });
  check('bước con chạy sang phải cùng hàng, thẳng cột giữa các hàng', geo.sameLeft && geo.cardsRight && geo.sameRowTop && geo.headLeft);
  check('đánh số 2.1, 2.2', geo.nums === '2.1,2.2', geo.nums);
  check('việc tiếp theo là 1.1', geo.next === '1.1');

  // Chip trạng thái: bấm hai lần → xong; việc tiếp theo dời sang 1.2; tiến độ.
  const chip = '.step:nth-child(1) .card[data-sub]:nth-child(1) [data-act="cycle"]';
  await page.click(chip);
  check('chip: chưa làm → đang làm', (await page.textContent(chip)).trim() === 'Đang làm');
  await page.click(chip);
  check(`chip: → xong, tiến độ 1/${n1}`, (await page.textContent(chip)).trim() === 'Xong'
    && (await page.textContent('.step:nth-child(1) .prog')).includes(`1/${n1}`));
  check('việc tiếp theo dời sang 1.2', (await page.textContent('.step:nth-child(1) .card.next .num')) === '1.2');
  check('chip giữ focus sau khi bấm', await page.evaluate(() => document.activeElement?.dataset.act === 'cycle'));

  // Thêm bước con có đủ trường.
  await page.click('.step:nth-child(1) [data-act="add-sub"]');
  await page.fill('#sub-form [name="title"]', 'Thử <img src=x onerror=alert(1)> · chấm');
  await page.selectOption('#sub-form [name="status"]', 'blocked');
  await page.fill('#sub-form [name="owner"]', 'Vai A');
  await page.fill('#sub-form [name="due"]', '2026-12-01');
  await page.fill('#sub-form [name="doneWhen"]', 'Có kết quả');
  await page.fill('#sub-form [name="notes"]', 'dòng 1\n\ndòng 3');
  await page.click('#sub-form button[type="submit"]');
  let ws = await cur(page);
  const added = ws.steps[0].subs[n1];
  check('thêm bước con: lưu đủ trường', added && added.status === 'blocked' && added.owner === 'Vai A' && added.due === '2026-12-01'
    && added.notes === 'dòng 1\n\ndòng 3' && added.doneWhen === 'Có kết quả');
  check('chữ người dùng không thành HTML', (await page.$$('.card img')).length === 0
    && /<img src=x/.test(await page.textContent(`.step:nth-child(1) .card[data-sub]:nth-child(${n1 + 1}) .card-title`)));

  // Sửa: chuyển sang bước 2.
  await page.click(`.step:nth-child(1) .card[data-sub]:nth-child(${n1 + 1}) [data-act="edit-sub"]`);
  await page.selectOption('#sub-form [name="step"]', ws.steps[1].id);
  await page.click('#sub-form button[type="submit"]');
  ws = await cur(page);
  check('sửa: chuyển bước con sang bước khác', ws.steps[0].subs.length === n1 && ws.steps[1].subs.at(-1).id === added.id);

  // Nhân bản, rồi xoá + hoàn tác.
  await page.click(`.card[data-sub="${added.id}"] [data-act="sub-dup"]`);
  ws = await cur(page);
  check('nhân bản bước con', ws.steps[1].subs.length === n2 + 2 && /bản sao/.test(ws.steps[1].subs[n2 + 1].title));
  const dupId = ws.steps[1].subs[n2 + 1].id;
  await page.click(`.card[data-sub="${dupId}"] [data-act="sub-del"]`);
  check('xoá: toast có Hoàn tác, focus ở nút Hoàn tác', await page.isVisible('#toast-undo') && (await cur(page)).steps[1].subs.length === n2 + 1
    && await page.evaluate(() => document.activeElement.id === 'toast-undo'));
  await page.click('#toast-undo');
  ws = await cur(page);
  check('hoàn tác xoá bước con: về đúng chỗ', ws.steps[1].subs.length === n2 + 2 && ws.steps[1].subs[n2 + 1].id === dupId);

  // Sắp xếp bằng nút.
  const order = async () => (await cur(page)).steps[1].subs.map((x) => x.id);
  const before = await order();
  await page.click(`.card[data-sub="${before[1]}"] [data-act="sub-left"]`);
  const afterLeft = await order();
  check('nút sang trái', afterLeft[0] === before[1] && afterLeft[1] === before[0]);
  check('focus ở lại nút vừa bấm', await page.evaluate(() => document.activeElement?.dataset.act === 'sub-left' || document.activeElement?.dataset.act === 'edit-sub'));
  const marks = () => page.evaluate(() => ({
    moved: [...document.querySelectorAll('.moved')].map((e) => e.dataset.sub || e.dataset.step),
    swapped: [...document.querySelectorAll('.swapped')].map((e) => e.dataset.sub || e.dataset.step),
    toast: document.getElementById('toast').hidden ? '' : document.getElementById('toast-text').textContent,
  }));
  let mk = await marks();
  check('dời bằng nút: thẻ vừa dời tô nổi, thẻ bị đổi chỗ tô nhẹ, toast "Đã dời 2.2 → 2.1"',
    mk.moved.join() === before[1] && mk.swapped.join() === before[0] && /^Đã dời 2\.2 → 2\.1 · /.test(mk.toast), JSON.stringify(mk));
  await page.focus(subSel(before[1], 'edit-sub'));
  await page.keyboard.press('Alt+ArrowRight');
  await page.keyboard.press('Alt+ArrowRight');
  mk = await marks();
  check('Alt + →: tô thẻ vừa dời, toast nói chỗ cũ → chỗ mới, focus giữ trên thẻ',
    (await order())[2] === before[1] && mk.moved.join() === before[1] && mk.swapped.join() === before[2] && /^Đã dời 2\.2 → 2\.3 · /.test(mk.toast)
    && await page.evaluate((id) => document.activeElement?.closest('.card')?.dataset.sub === id, before[1]), JSON.stringify(mk));
  await page.keyboard.press('Control+z');
  check('hoàn tác dời (Ctrl+Z): về chỗ cũ', JSON.stringify(await order()) === JSON.stringify(before));
  await page.waitForFunction(() => !document.querySelector('.moved, .swapped'), null, { timeout: 6000 }).catch(() => {});
  check('đánh dấu vừa dời tự tắt sau vài giây', !(await page.$('.moved, .swapped')));
  await page.click(`.card[data-sub="${before[1]}"] [data-act="sub-left"]`);
  await page.keyboard.press('Tab');
  const stepsBefore = (await cur(page)).steps.map((s) => s.id);
  await page.click(`.step[data-step="${stepsBefore[1]}"] [data-act="step-up"]`);
  const stepsAfter = (await cur(page)).steps.map((s) => s.id);
  check('nút đưa bước lên', stepsAfter[0] === stepsBefore[1] && stepsAfter[1] === stepsBefore[0]);
  mk = await marks();
  check('dời bước: hàng vừa dời tô nổi, hàng bị đổi chỗ tô nhẹ, toast "Đã dời bước 2 → 1"',
    mk.moved.join() === stepsBefore[1] && mk.swapped.join() === stepsBefore[0] && /^Đã dời bước 2 → 1 · /.test(mk.toast), JSON.stringify(mk));
  await page.click(`.step[data-step="${stepsBefore[1]}"] [data-act="step-down"]`);

  // Kéo thả: bước con cuối của hàng 1 lên đầu hàng 1; bước 3 lên trên bước 1. Khung cao để nguồn và đích cùng
  // trong tầm nhìn (kéo HTML5 của Playwright không cuộn trang giữa chừng); hàng của mẫu dài thì 900px không đủ.
  await page.setViewportSize({ width: 1280, height: 2400 });
  const r1 = (await cur(page)).steps[0].subs.map((x) => x.id);
  await page.dragAndDrop(`.card[data-sub="${r1[2]}"]`, `.card[data-sub="${r1[0]}"]`, { targetPosition: { x: 5, y: 20 } });
  const r1b = (await cur(page)).steps[0].subs.map((x) => x.id);
  check('kéo thả bước con trong hàng', r1b[0] === r1[2] && r1b.length === n1, r1b.indexOf(r1[2]) + '');
  const st = (await cur(page)).steps.map((s) => s.id);
  await page.dragAndDrop(`.step[data-step="${st[2]}"] .step-head`, `.step[data-step="${st[0]}"] .step-head`, { targetPosition: { x: 10, y: 5 } });
  const st2 = (await cur(page)).steps.map((s) => s.id);
  check('kéo thả bước', st2[0] === st[2] && st2[1] === st[0], st2.indexOf(st[2]) + '');
  const r2 = (await cur(page)).steps[2].subs.map((x) => x.id);
  await page.dragAndDrop(`.card[data-sub="${r2[0]}"]`, `.step[data-step="${st2[0]}"] .card.add`);
  const mkd = await marks();
  check('kéo thả bước con sang bước khác', (await cur(page)).steps[0].subs.at(-1).id === r2[0]);
  check('kéo thả: thẻ vừa thả tô nổi, toast "Đã dời 3.1 → 1.N"', mkd.moved.join() === r2[0]
    && new RegExp(`^Đã dời 3\\.1 → 1\\.${(await cur(page)).steps[0].subs.length} · `).test(mkd.toast), JSON.stringify(mkd));
  await page.setViewportSize({ width: 1280, height: 900 });

  // Thêm, sửa, xoá bước + hoàn tác.
  await page.click('#add-step');
  await page.fill('#step-form [name="title"]', 'Bước mới');
  await page.fill('#step-form [name="goal"]', 'Mục tiêu mới');
  await page.click('#step-form button[type="submit"]');
  ws = await cur(page);
  check('thêm bước', ws.steps.length === nSteps + 1 && ws.steps[nSteps].title === 'Bước mới' && ws.steps[nSteps].goal === 'Mục tiêu mới');
  await page.click(`.step[data-step="${ws.steps[nSteps].id}"] [data-act="edit-step"]`);
  await page.fill('#step-form [name="title"]', 'Bước đổi tên');
  await page.click('#step-form button[type="submit"]');
  check('sửa bước', (await cur(page)).steps[nSteps].title === 'Bước đổi tên');
  const s2id = ws.steps[1].id;
  await page.click(`.step[data-step="${s2id}"] [data-act="del-step"]`);
  check('xoá bước có bước con: hỏi lại trước', await page.isVisible('#dlg-ask') && (await cur(page)).steps.length === nSteps + 1);
  await page.click('#ask-ok');
  await page.waitForFunction((n) => JSON.parse(localStorage.getItem('stepPlanner.v1')).workspaces[0].steps.length === n, nSteps, { timeout: 3000 }).catch(() => {});
  check('xoá bước', (await cur(page)).steps.length === nSteps);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(50);
  check('hoàn tác xoá bước bằng Ctrl+Z', (await cur(page)).steps[1].id === s2id);

  // Cần làm lại bước này (step.revisit): nút có chữ, hộp có câu giải thích, băng "Đang làm lại · ngày · lý do", bỏ đánh dấu.
  const revBtn = `.step[data-step="${s2id}"] .acts [data-act="revisit"]`;
  check('cần làm lại: nút có chữ', (await page.textContent(revBtn)).trim() === 'Cần làm lại');
  await page.click(revBtn);
  check('cần làm lại: hộp có giải thích và ví dụ', /Ví dụ/.test(await page.textContent('#dlg-revisit'))
    && !!(await page.getAttribute('#revisit-form [name="reason"]', 'placeholder')));
  await page.fill('#revisit-form [name="reason"]', 'EDA lộ cột thiếu');
  await page.click('#revisit-form button[type="submit"]');
  const band = `.step[data-step="${s2id}"] .revisit-band`;
  check('cần làm lại: băng "Đang làm lại · ngày · lý do", nút bỏ đánh dấu',
    /^Đang làm lại · \d\d\/\d\d\/\d{4} · EDA lộ cột thiếu$/.test((await page.textContent(`${band} .badge`)).trim())
    && /Xong, bỏ đánh dấu/.test(await page.textContent(band))
    && (await cur(page)).steps[1].revisit.reason === 'EDA lộ cột thiếu');
  await page.click(`${band} [data-act="revisit-clear"]`);
  check('cần làm lại: "Xong, bỏ đánh dấu" xoá đánh dấu và băng', (await cur(page)).steps[1].revisit === null && !(await page.$(band)));
  await page.click(revBtn);
  await page.fill('#revisit-form [name="reason"]', 'EDA lộ cột thiếu');
  await page.click('#revisit-form button[type="submit"]');

  // Người, lọc việc của tôi, tìm kiếm.
  await page.click('#people-btn');
  await page.fill('#people-form [name="people"]', 'Vai A\nVai B');
  await page.click('#people-form button[type="submit"]');
  await page.click('#people-btn');
  await page.selectOption('#people-form [name="me"]', 'Vai A');
  await page.click('#people-form button[type="submit"]');
  await page.selectOption('#owner-filter', '@me');
  const mine = await page.$$eval('.card[data-sub]', (c) => c.length);
  check('lọc "Việc của tôi"', mine === 2, String(mine));
  check('lọc: tắt sắp xếp', (await page.$$('[data-act="sub-left"], [data-act="step-up"]')).length === 0);
  await page.selectOption('#owner-filter', '');
  await page.fill('#q', 'kiem chat');
  check('tìm không dấu: một bước con', (await page.$$eval('.card[data-sub]', (c) => c.length)) === 1);
  await page.fill('#q', 'hieu nghiep vu');
  check('tìm không dấu theo tên bước: cả hàng hiện', (await page.$$eval('.step', (r) => r.length)) === 1);
  await page.fill('#q', '');

  // Nhật ký quyết định.
  await page.fill('#log-decision', 'Bỏ cột thiếu > 40%');
  await page.fill('#log-why', 'Không điền được\nđáng tin');
  await page.click('#log-form button[type="submit"]');
  await page.fill('#log-decision', 'Quyết định hai');
  await page.click('#log-form button[type="submit"]');
  check('nhật ký: thêm hai mục', (await cur(page)).log.length === 2 && (await page.$$('.log-item')).length === 2);
  await page.click('.log-item:first-child [data-act="del-log"]');
  check('nhật ký: xoá', (await cur(page)).log.length === 1);
  await page.click('#toast-undo');
  check('nhật ký: hoàn tác', (await cur(page)).log.length === 2);
  check('nhật ký: mới nhất trước', (await page.textContent('.log-item:first-child .log-decision')).trim() === 'Quyết định hai');
  await page.click('.log-item:first-child [data-act="edit-log"]');
  await page.fill('#log-edit-form [name="decision"]', 'Quyết định hai (sửa)');
  await page.fill('#log-edit-form [name="date"]', '2020-01-01');
  await page.click('#log-edit-form button[type="submit"]');
  check('nhật ký: sửa được, xếp lại theo ngày', (await cur(page)).log.some((l) => l.decision === 'Quyết định hai (sửa)' && l.date === '2020-01-01')
    && /sửa/.test(await page.textContent('.log-item:last-child .log-decision')));

  // Mẹo cho người mới: tắt được, nhớ qua lần tải lại.
  check('mẹo người mới hiện lúc đầu', await page.isVisible('#hint'));
  await page.click('#hint-off');
  check('tắt mẹo: ẩn ngay', !(await page.isVisible('#hint')));

  // Tải lại: còn nguyên, mở đúng dự án.
  const beforeReload = await cur(page);
  await page.reload();
  await page.waitForSelector('#app:not([hidden]) .step');
  check('tắt mẹo: vẫn ẩn sau khi tải lại', !(await page.isVisible('#hint')));
  const afterReload = await cur(page);
  check('tải lại: giữ dữ liệu và dự án đang mở', JSON.stringify(beforeReload) === JSON.stringify(afterReload)
    && /CRISP-DM/.test(await page.textContent('#ws-name')));

  // Xuất Markdown: tải file + chép; nhập lại → dự án mới cùng cấu trúc.
  await page.click('#export-btn');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#export-download')]);
  const md = fs.readFileSync(await dl.path(), 'utf8');
  check('xuất Markdown: tải file .md', /\.md$/.test(dl.suggestedFilename()) && md.startsWith('# Dự án Data Science'));
  check('Markdown có dấu trạng thái, owner, hạn', /- \[x\] /.test(md) && /- \[!\] .* · `@Vai A` · hạn 2026-12-01/.test(md) && /## Nhật ký quyết định/.test(md));
  check('Markdown giữ dòng "Quay lại:" của bước cần làm lại', /\nQuay lại: \d{4}-\d\d-\d\d · EDA lộ cột thiếu\n/.test(md));
  await page.click('#export-copy');
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check('chép Markdown vào clipboard', clip === md);
  await page.click('#dlg-export [data-close]');
  const nBefore = (await stored(page)).workspaces.length;
  const want = `Markdown: 1 dự án · ${afterReload.steps.length} bước · ${afterReload.steps.reduce((n, x) => n + x.subs.length, 0)} bước con · 2 quyết định`;
  await page.click('#import-btn');
  await page.fill('#import-text', md);
  check('nhập: xem trước có số đếm', (await page.textContent('#import-preview')) === want,
    await page.textContent('#import-preview'));
  await page.click('#import-go');
  let s = await stored(page);
  const imported = s.workspaces.find((w) => w.id === s.lastId);
  const a = await shape(page, afterReload), b = await shape(page, imported);
  check('Markdown đi rồi về: dự án mới, cùng cấu trúc', s.workspaces.length === nBefore + 1 && imported.id !== afterReload.id
    && imported.name === afterReload.name + ' (nhập)'
    && JSON.stringify({ ...a, name: '' }) === JSON.stringify({ ...b, name: '' }));

  // JSON một dự án qua file; sao lưu tất cả qua dán.
  await page.click('#export-btn');
  await page.check('input[name="export-kind"][value="json"]');
  const [dlj] = await Promise.all([page.waitForEvent('download'), page.click('#export-download')]);
  const jsonPath = await dlj.path();
  await page.click('#dlg-export [data-close]');
  await page.click('#import-btn');
  await page.setInputFiles('#import-file', { name: 'p.json', mimeType: 'application/json', buffer: fs.readFileSync(jsonPath) });
  await page.waitForFunction(() => /JSON một dự án/.test(document.getElementById('import-preview').textContent));
  await page.click('#import-go');
  s = await stored(page);
  const j = s.workspaces.find((w) => w.id === s.lastId);
  check('JSON đi rồi về: cùng cấu trúc', JSON.stringify({ ...(await shape(page, j)), name: '' }) === JSON.stringify({ ...b, name: '' }));
  await page.click('#export-btn');
  await page.check('input[name="export-kind"][value="backup"]');
  const backup = await page.inputValue('#export-text');
  await page.click('#dlg-export [data-close]');
  const nb = s.workspaces.length;
  await page.click('#import-btn');
  await page.fill('#import-text', backup);
  await page.click('#import-go');
  check('nhập sao lưu: thêm đủ dự án, không ghi đè', (await stored(page)).workspaces.length === nb * 2);
  await page.click('#import-btn');
  await page.fill('#import-text', '{"x":1}');
  check('nhập chữ lạ: báo lỗi, nút tắt', /Không đọc được/.test(await page.textContent('#import-preview')) && await page.isDisabled('#import-go'));
  await page.click('#dlg-import [data-close]');

  // Đổi tên, nhân bản, xoá dự án.
  await page.click('#ws-btn');
  await page.click('.ws-item:first-child [data-act="ws-rename"]');
  await page.fill('#ask-input', 'Tên mới');
  await page.click('#ask-ok');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('stepPlanner.v1')).workspaces[0].name === 'Tên mới', null, { timeout: 3000 }).catch(() => {});
  check('đổi tên dự án', (await stored(page)).workspaces[0].name === 'Tên mới');
  const nw = (await stored(page)).workspaces.length;
  await page.click('.ws-item:first-child [data-act="ws-dup"]');
  check('nhân bản dự án', (await stored(page)).workspaces.length === nw + 1);
  await page.click('.ws-item:nth-child(2) [data-act="ws-del"]');
  await page.click('#ask-ok');
  await page.waitForFunction((n) => JSON.parse(localStorage.getItem('stepPlanner.v1')).workspaces.length === n, nw, { timeout: 3000 }).catch(() => {});
  check('xoá dự án sau khi hỏi lại', (await stored(page)).workspaces.length === nw);
  await page.click('#dlg-ws [data-close]');

  // Hộp sửa: Esc / Huỷ khi đã gõ chữ thì hỏi lại; không âm thầm bỏ chữ.
  await page.click('#ws-btn');
  await page.click('.ws-item:first-child [data-act="ws-open"]');
  const firstSub = (await cur(page)).steps[0].subs[0];
  await page.click(subSel(firstSub.id, 'edit-sub'));
  check('hộp sửa: focus ở ô tên', await page.evaluate(() => document.activeElement.name === 'title'));
  await page.fill('#sub-form [name="notes"]', 'chữ đang gõ');
  await page.keyboard.press('Escape');
  check('Esc khi có chữ chưa lưu: hỏi lại', await page.isVisible('#dlg-ask') && await page.isVisible('#dlg-sub'));
  await page.click('#dlg-ask [data-close]');
  check('chọn ở lại: chữ còn nguyên', await page.isVisible('#dlg-sub') && (await page.inputValue('#sub-form [name="notes"]')) === 'chữ đang gõ');
  await page.click('#dlg-sub .row-end [data-close]');
  await page.click('#ask-ok');
  await page.waitForTimeout(100);
  check('chọn bỏ: hộp đóng, không lưu', !(await page.isVisible('#dlg-sub')) && (await cur(page)).steps[0].subs[0].notes === firstSub.notes);
  await page.click(subSel(firstSub.id, 'edit-sub'));
  await page.keyboard.press('Escape');
  check('Esc khi chưa sửa gì: đóng ngay', !(await page.isVisible('#dlg-sub')) && !(await page.isVisible('#dlg-ask')));

  // Thêm bước con khi đang lọc người làm: điền sẵn người ấy; bị lọc ẩn thì báo, focus không rơi về body.
  await page.click('#people-btn');
  await page.selectOption('#people-form [name="me"]', 'Vai A');
  await page.click('#people-form button[type="submit"]');
  await page.selectOption('#owner-filter', 'Vai A');
  await page.click('.step:first-child .step-head [data-act="add-sub"]');
  check('lọc người: ô người làm điền sẵn', (await page.inputValue('#sub-form [name="owner"]')) === 'Vai A');
  await page.fill('#sub-form [name="title"]', 'Việc của A');
  await page.click('#sub-form button[type="submit"]');
  check('lọc người: thẻ mới hiện', /Việc của A/.test(await page.textContent('#board')));
  await page.fill('#q', 'việc của a');
  await page.click('.step:first-child .step-head [data-act="add-sub"]');
  await page.fill('#sub-form [name="title"]', 'Không khớp tìm');
  await page.click('#sub-form button[type="submit"]');
  check('thêm mà bộ lọc ẩn: báo, focus không về body', /đang bị bộ lọc ẩn/.test(await page.textContent('#toast-text'))
    && await page.evaluate(() => document.activeElement !== document.body));
  await page.fill('#q', '');
  await page.selectOption('#owner-filter', '');

  // Đổi tên trong Thành viên: mọi bước con của người ấy đổi theo, "Tôi là" cũng theo.
  await page.click('#people-btn');
  await page.fill('#people-form [name="people"]', 'Vai A2\nVai B');
  await page.click('#people-form button[type="submit"]');
  ws = await cur(page);
  const owners = ws.steps.flatMap((x) => x.subs.map((y) => y.owner));
  check('đổi tên thành viên: bước con đổi theo', owners.includes('Vai A2') && !owners.includes('Vai A')
    && (await stored(page)).me[ws.id] === 'Vai A2');

  // Nhập "Thay dự án đang mở", rồi hoàn tác.
  const beforeReplace = await cur(page);
  await page.click('#import-btn');
  await page.fill('#import-text', '# Thay thế\n\n## 1. Một\n- [ ] a\n');
  await page.check('input[name="import-mode"][value="replace"]');
  await page.click('#import-go');
  const replaced = await cur(page);
  check('nhập thay dự án đang mở: cùng id, nội dung mới', replaced.id === beforeReplace.id && replaced.name === 'Thay thế' && replaced.steps.length === 1);
  await page.click('#toast-undo');
  check('hoàn tác thay thế: về bản cũ', JSON.stringify(await shape(page, await cur(page))) === JSON.stringify(await shape(page, beforeReplace)));

  // JSON sai khuôn trong trang: cảnh báo tiếng Việt, không lỗi JS.
  await page.click('#import-btn');
  await page.fill('#import-text', '{"steps":[null,{"title":"t","subs":[5]}]}');
  check('JSON sai khuôn: liệt kê cảnh báo', /bỏ qua 1 bước, 1 bước con/.test(await page.textContent('#import-preview')));
  await page.fill('#import-text', '[1,2]');
  check('JSON không có dự án: nút nhập tắt', await page.isDisabled('#import-go'));
  await page.click('#dlg-import [data-close]');

  // Nhắc sao lưu: thay đổi cũ hơn 3 ngày.
  await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('stepPlanner.v1'));
    st.dirtySince = new Date(Date.now() - 5 * 86400000).toISOString();
    st.lastBackup = '';
    localStorage.setItem('stepPlanner.v1', JSON.stringify(st));
  });
  await page.reload();
  await page.waitForSelector('#app:not([hidden])');
  check('nhắc sao lưu: "Chưa sao lưu lần nào"', await page.isVisible('#backup-nudge') && /Chưa sao lưu lần nào/.test(await page.textContent('#backup-nudge')));
  const [bdl] = await Promise.all([page.waitForEvent('download'), page.click('#backup-nudge')]);
  check('bấm nhắc: tải bản sao lưu, nhắc tắt', /sao-luu.*\.json$/.test(bdl.suggestedFilename()) && !(await page.isVisible('#backup-nudge'))
    && !!(await stored(page)).lastBackup);

  // Theme: nút thắng hệ điều hành và được nhớ.
  await page.click('#theme-btn');
  const t1 = await page.evaluate(() => [document.documentElement.dataset.theme, localStorage.getItem('hub-theme')]);
  check('nút theme đặt và nhớ lựa chọn', t1[0] === t1[1] && !!t1[0]);
  await ctx.close();

  /* ── Hai tab cùng dữ liệu ── */
  const tc = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const A = await tc.newPage();
  A.on('pageerror', (e) => errors.push('A ' + e));
  await A.goto(BASE);
  await A.click('#start .tpl[data-tpl="crisp-dm"]');
  await A.click('#ws-btn');
  await A.check('#ws-new-templates input[value="stats-report"]');
  await A.click('#ws-new button[type="submit"]');
  const [w1, w2] = (await stored(A)).workspaces;
  const B = await tc.newPage();
  B.on('pageerror', (e) => errors.push('B ' + e));
  await B.goto(BASE);
  await B.waitForSelector('.step');
  await B.click('#ws-btn');
  await B.click(`[data-ws="${w1.id}"] [data-act="ws-open"]`);
  await B.click('.card[data-sub] >> nth=0 >> [data-act="cycle"]');
  await A.waitForTimeout(200);
  check('hai tab: tab kia đổi dự án và sửa, tab này vẫn ở dự án của nó', (await A.textContent('#ws-name')) === w2.name
    && (await B.textContent('#ws-name')) === w1.name);
  const w2sub = w2.steps[0].subs[0];
  await A.click(subSel(w2sub.id, 'sub-del'));
  await B.click('.card[data-sub] >> nth=1 >> [data-act="cycle"]');
  await A.waitForTimeout(200);
  await A.click('#toast-undo');
  await A.waitForTimeout(100);
  const aStore = (await stored(A)).workspaces;
  check('hai tab: hoàn tác sau khi tab kia ghi vẫn trả bước con về', aStore.find((w) => w.id === w2.id).steps[0].subs[0].id === w2sub.id
    && aStore.find((w) => w.id === w1.id).steps[0].subs[1].status === 'doing'
    && (await A.$$(`.card[data-sub="${w2sub.id}"]`)).length === 1);
  const w2step = w2.steps[1];
  await A.click(`.step[data-step="${w2step.id}"] [data-act="del-step"]`);
  await A.click('#ask-ok');
  await B.click('.card[data-sub] >> nth=2 >> [data-act="cycle"]');
  await A.waitForTimeout(200);
  await A.click('#toast-undo');
  await A.waitForTimeout(100);
  check('hai tab: hoàn tác xoá bước sau khi tab kia ghi', (await stored(A)).workspaces.find((w) => w.id === w2.id).steps[1].id === w2step.id
    && !/đã bị xoá/.test(await A.textContent('#toast-text')));
  await B.close();
  await A.click(subSel(w2sub.id, 'sub-del'));
  await A.click('#ws-btn');
  await A.click(`[data-ws="${w2.id}"] [data-act="ws-del"]`);
  await A.click('#ask-ok');
  await A.waitForTimeout(100);
  check('xoá dự án: toast Hoàn tác của nó biến mất', !(await A.isVisible('#toast')));
  await A.keyboard.press('Escape');
  const sA = await stored(A);
  check('xoá dự án: tab mở dự án còn lại, lastId hợp lệ', sA.workspaces.some((w) => w.id === sA.lastId) && (await A.textContent('#ws-name')) === w1.name);
  await tc.close();

  /* ── Điện thoại 390px ── */
  const m = await open(390, 844, { isMobile: true, hasTouch: true });
  await m.page.click('#start .tpl[data-tpl="it5425-sports"]');
  await m.page.waitForSelector('.step');
  const mob = await m.page.evaluate(() => {
    const row = document.querySelector('.step');
    const head = row.querySelector('.step-head').getBoundingClientRect();
    const sc = row.querySelector('.cards-scroll');
    const card = row.querySelector('.card[data-sub]');
    return { stacked: head.bottom <= sc.getBoundingClientRect().top + 1, scrolls: sc.scrollWidth > sc.clientWidth, left: head.left,
      whole: sc.clientHeight >= card.offsetHeight };
  });
  check('390px: không tràn ngang trang', (await hOverflow(m.page)) === 0, String(await hOverflow(m.page)));
  check('390px: tên bước nằm trên hàng bước con, hàng cuộn ngang bên trong', mob.stacked && mob.scrolls && mob.whole);
  check('390px: lề 16px', Math.round(mob.left) === 16, String(mob.left));
  const small = await m.page.evaluate(() => {
    const bad = [];
    const els = document.querySelectorAll('.step:first-child .card[data-sub]:first-child button:not([data-act="edit-sub"]),'
      + ' .step:first-child .step-head button, .tools button, #theme-btn, #hint-off, #ws-btn, .ws-notes summary');
    for (const el of els) {
      if (el.offsetParent === null) continue;
      el.scrollIntoView({ block: 'center', inline: 'center' });
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const at = (x, y) => { const t = document.elementFromPoint(x, y); return !!t && (t === el || el.contains(t)); };
      const tall = r.height >= 44 || (at(cx, cy - 21.5) && at(cx, cy + 21.5));
      const wide = r.width >= 44 || (at(cx - 21.5, cy) && at(cx + 21.5, cy));
      if (!tall || !wide) bad.push(`${el.dataset.act || el.id || el.className} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    window.scrollTo(0, 0);
    return bad;
  });
  check('390px: vùng bấm ≥ 44px (chip, nút thẻ, nút bước, công cụ)', small.length === 0, small.join(', '));
  const topH = await m.page.evaluate(() => [document.querySelector('.top-name').getBoundingClientRect().height,
    document.querySelector('.ws-name').getBoundingClientRect().height]);
  check('390px: tên dự án một dòng, cắt bớt', topH[1] < 40 && topH[0] < 70, topH.join(','));
  check('mẫu đồ án: ghi chú bước gập, có link trang đồ án', (await m.page.$$('.step-notes')).length === 10
    && (await m.page.$$eval('.step-notes a', (a) => a.filter((x) => /sports-monitoring-project\.html#lt-lich$/.test(x.href)).length)) === 10);
  check('mẫu đồ án: người làm là vai', /@Dữ liệu & lineage/.test(await m.page.textContent('.step:nth-child(2)')));
  for (const d of ['#dlg-sub', '#dlg-export']) {
    if (d === '#dlg-sub') await m.page.click('.step:nth-child(1) [data-act="edit-sub"]');
    else await m.page.click('#export-btn');
    check(`390px: ${d} không tràn`, (await hOverflow(m.page)) === 0
      && (await m.page.$eval(d, (el) => el.getBoundingClientRect().right <= innerWidth)));
    await m.page.keyboard.press('Escape');
  }
  await m.ctx.close();

  /* ── Bộ nhớ bị chặn ── */
  const blocked = await browser.newContext();
  await blocked.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
  });
  const bp = await blocked.newPage();
  const bErr = [];
  bp.on('pageerror', (e) => bErr.push(String(e)));
  await bp.goto(BASE);
  await bp.waitForSelector('#start:not([hidden]) .tpl');
  await bp.click('#start .tpl[data-tpl="crisp-dm"]');
  check('bộ nhớ bị chặn: banner, vẫn dùng được', /chặn bộ nhớ/.test(await bp.textContent('#banner')) && await bp.isVisible('#banner')
    && (await bp.$$('.step')).length === nSteps && !bErr.length, bErr.join(' | '));
  await blocked.close();

  /* ── Dữ liệu lưu bị hỏng ── */
  const bad = await browser.newContext();
  await bad.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('stepPlanner.v1', '{hỏng'); } });
  const badp = await bad.newPage();
  await badp.goto(BASE);
  await badp.waitForSelector('#start:not([hidden])');
  check('dữ liệu hỏng: báo và giữ bản cũ', /bị hỏng/.test(await badp.textContent('#banner'))
    && (await badp.evaluate(() => localStorage.getItem('stepPlanner.v1.corrupt'))) === '{hỏng');
  await bad.close();

  await browser.close();
  check('không lỗi console', errors.length === 0, errors.slice(0, 3).join(' | '));
  if (fails) { console.log(`smoke: ${fails} LỖI`); process.exit(1); }
  console.log('smoke: OK');
})().catch((e) => { console.log('smoke: LỖI', e); process.exit(1); });
