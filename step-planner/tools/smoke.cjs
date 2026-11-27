/* Bấm thật trong Chromium: tạo từ mọi mẫu, thêm / sửa / xoá, hoàn tác, sắp xếp bằng nút và kéo thả, lọc, quay lại,
 * nhật ký, bàn giao, lưu qua lần tải lại, Markdown và JSON đi rồi về, bộ nhớ bị chặn, tràn ngang ở 390px, lỗi console.
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
  /* Mỗi phần chạy riêng: một lỗi ném ra (selector không thấy, phần tử thiếu) báo LỖI cho phần ấy, đóng các context nó mở,
   * rồi phần sau vẫn chạy; mã thoát vẫn khác 0. Chạy riêng các phần có tên chứa một đoạn chữ: SMOKE_ONLY="Bàn giao" node … */
  const section = async (name, fn) => {
    if (process.env.SMOKE_ONLY && !name.includes(process.env.SMOKE_ONLY)) return;
    const before = new Set(browser.contexts());
    try { await fn(); } catch (e) { check(`phần "${name}" dừng giữa chừng`, false, String(e && e.message || e).split('\n')[0]); }
    for (const c of browser.contexts()) if (!before.has(c)) await c.close().catch(() => { /* đã đóng giữa chừng */ });
  };
  /* Chờ một điều kiện trong trang; hết giờ thì báo LỖI có tên (không ném: phần còn lại vẫn chạy). */
  const waitTo = (page, what, fn, arg, timeout = 3000) => page.waitForFunction(fn, arg, { timeout })
    .then(() => true, () => { check(`chờ ${what}`, false, `hết ${timeout} ms`); return false; });
  /* Hai tab: đếm sự kiện `storage` của khoá dữ liệu (cài trước script của trang). `synced` làm việc ở tab này rồi chờ tab kia
   * nhận bản ghi; trang xử lý sự kiện đồng bộ nên nhận là đã vẽ lại. */
  const countStorage = () => addEventListener('storage', (e) => { if (e.key === 'stepPlanner.v2') window.__seen = (window.__seen || 0) + 1; });
  const synced = async (to, act) => {
    const n = await to.evaluate(() => window.__seen || 0);
    await act();
    await waitTo(to, 'tab kia nhận bản ghi mới (sự kiện storage)', (k) => (window.__seen || 0) > k, n);
  };
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
  /* Trang ghi bộ nhớ ở lượt việc kế: chờ một khung hình và một lượt rồi mới đọc. */
  const afterSave = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))));
  const stored = async (page) => { await afterSave(page); return page.evaluate(() => JSON.parse(localStorage.getItem('stepPlanner.v2') || 'null')); };
  const cur = async (page) => { const s = await stored(page); return s.workspaces.find((w) => w.id === s.lastId); };
  const shape = (page, ws) => page.evaluate(async (w) => (await import(new URL('js/core/io.js', location.href).href)).shape(w), ws);
  const subSel = (id, act) => `.card[data-sub="${id}"] [data-act="${act}"]`;
  /* Đổi trạng thái qua danh sách: Shift + bấm chip luôn mở danh sách. */
  const setSt = async (page, subId, st) => {
    await page.click(`.card[data-sub="${subId}"] [data-act="status"]`, { modifiers: ['Shift'] });
    await page.click(`.dd-pop [role="option"][data-value="${st}"]`);
  };
  /* Hộp dài: chỉ thân cuộn. Thử cuộn chính hộp, cuộn thân tới đáy, focus phần tử cuối: hộp vẫn ở 0, đầu, chân sát mép. */
  const stickyHead = (page, sel) => page.$eval(sel, (dl) => {
    dl.getAnimations().forEach((x) => x.finish());
    const form = dl.querySelector('.dlg-form'), body = dl.querySelector('.dlg-body');
    dl.scrollTop = 9999; form.scrollTop = 9999; body.scrollTop = body.scrollHeight;
    dl.querySelector('.dlg-foot > :last-child').scrollIntoView();
    [...body.querySelectorAll('input:not([type="radio"]), textarea, button')].at(-1)?.focus();
    const r = dl.getBoundingClientRect(), hd = dl.querySelector('.dlg-head').getBoundingClientRect(), ft = dl.querySelector('.dlg-foot').getBoundingClientRect();
    return { dlg: dl.scrollTop, form: form.scrollTop, body: body.scrollTop, head: Math.round(hd.top - r.top), foot: Math.round(r.bottom - ft.bottom),
      pageLocked: getComputedStyle(document.documentElement).overflowY === 'hidden' };
  });
  const sticky = (m) => m.dlg === 0 && m.form === 0 && m.body > 0 && m.head <= 1 && m.foot <= 1 && m.pageLocked;
  const hOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  /* ── Máy rộng ── */
  await section('Máy rộng', async () => { // thân giữ thụt lề cũ cho dễ gộp
  const { ctx, page } = await open(1280, 900, { permissions: ['clipboard-read', 'clipboard-write'] });
  await page.waitForSelector('#start:not([hidden]) .tpl');
  const tplIds = await page.$$eval('#start .tpl', (bs) => bs.map((b) => b.dataset.tpl));
  const jsonTpls = await page.evaluate(async () => (await (await fetch('data/templates.json')).json()).templates);
  const nTpl = jsonTpls.length;
  // Hai nhóm (PLAN-039): mẫu chung (không `group`) trước, dự án cụ thể sau; mỗi nhóm giữ thứ tự của templates.json.
  const genIds = jsonTpls.filter((t) => !t.group).map((t) => t.id), specIds = jsonTpls.filter((t) => t.group === 'specific').map((t) => t.id);
  check('màn đầu: đủ mẫu, mẫu chung trước rồi dự án cụ thể, mỗi nhóm đúng thứ tự templates.json',
    tplIds.join() === [...genIds, ...specIds].join() && nTpl >= 5 && specIds.length > 0, tplIds.join(','));
  const groups = await page.$$eval('#start-templates > section', (ss) => ss.map((sc) => ({
    h: sc.querySelector(':scope > h3')?.textContent, labelled: document.getElementById(sc.getAttribute('aria-labelledby'))?.parentElement === sc,
    ids: [...sc.querySelectorAll(':scope > ul > li > button.tpl')].map((b) => b.dataset.tpl), loose: sc.querySelectorAll('.tpl').length })));
  check('màn đầu: hai phần có đầu mục (General templates, Specific projects), mỗi thẻ một mục danh sách; it5425-sports ở phần hai',
    groups.length === 2 && groups[0].h === 'General templates' && groups[1].h === 'Specific projects' && groups.every((g) => g.labelled && g.ids.length === g.loose)
    && groups[0].ids.join() === genIds.join() && groups[1].ids.join() === specIds.join() && groups[1].ids.includes('it5425-sports')
    && groups[0].ids.includes('blank'), JSON.stringify(groups));
  // Bàn phím: Tab đi qua mọi thẻ mẫu theo thứ tự nhóm, từ phần một sang phần hai.
  await page.focus('#start .tpl');
  const tabbed = [await page.evaluate(() => document.activeElement.dataset.tpl)];
  for (let i = 1; i < nTpl; i++) { await page.keyboard.press('Tab'); tabbed.push(await page.evaluate(() => document.activeElement.dataset.tpl)); }
  check('màn đầu: Tab tới mọi thẻ mẫu của cả hai phần, đúng thứ tự', tabbed.join() === [...genIds, ...specIds].join(), tabbed.join(','));
  // Nút đóng hộp không lưu ghi "Close": "Cancelled" là tên một trạng thái.
  const closeBtns = await page.$$eval('dialog button', (bs) => bs.filter((b) => b.textContent.trim() && (b.hasAttribute('data-close') || /^Cancel/.test(b.textContent.trim())))
    .map((b) => b.textContent.trim()));
  check('hộp thoại: nút đóng ghi "Close", không ghi "Cancel"', closeBtns.length >= 8 && closeBtns.every((t) => t === 'Close'), [...new Set(closeBtns)].join(','));
  // Mọi hộp cùng khung: đầu, thân, chân; nút chính ở mép phải chân hộp.
  const frames = await page.$$eval('dialog', (ds) => ds.filter((d) => !d.querySelector(':scope > .dlg-form > .dlg-head') || !d.querySelector(':scope > .dlg-form > .dlg-foot')
    || d.querySelector('.dlg-foot > :last-child:not(.go)')).map((d) => d.id));
  check('hộp thoại: đủ đầu và chân, nút chính đứng cuối chân', frames.length === 0, frames.join(','));

  // Tạo từ từng mẫu: số bước và bước con khớp templates.json.
  const tplData = await page.evaluate(async () => (await (await fetch('data/templates.json')).json()).templates);
  await page.click('#start .tpl[data-tpl="crisp-dm"]');
  for (const id of jsonTpls.map((t) => t.id).filter((x) => x !== 'crisp-dm')) { // thứ tự file: mẫu trống tạo sau cùng, là dự án đang mở
    await page.click('#ws-btn');
    await page.click('#ws-tab-new');
    await page.check(`#ws-new-templates input[value="${id}"]`);
    await page.click('#ws-new button[type="submit"]');
  }
  const s0 = await stored(page);
  const okTpl = tplData.every((t) => {
    const w = s0.workspaces.find((x) => x.templateId === t.id);
    return w && w.steps.length === t.steps.length
      && w.steps.every((st, i) => st.subs.length === t.steps[i].subs.length && st.title === t.steps[i].title);
  });
  check('tạo từ mỗi mẫu: đúng bước và bước con', s0.workspaces.length === nTpl && okTpl);
  check('dự án trống: báo chưa có bước', /No steps yet/.test(await page.textContent('#board')));
  // Hộp Dự án: tab Open mặc định, dòng dự án đang mở được đánh dấu, nút Create chỉ ở tab New; thẻ mẫu có dấu chọn.
  await page.click('#ws-btn');
  const wsd = await page.evaluate(() => ({
    open: document.getElementById('ws-tab-open').getAttribute('aria-selected'), rows: document.querySelectorAll('#ws-list .ws-item').length,
    count: document.getElementById('ws-count').textContent, now: document.querySelectorAll('#ws-list .ws-item.now [aria-current="true"]').length,
    create: document.getElementById('ws-create').hidden, acts: [...document.querySelectorAll('#ws-list .ws-item:first-child .ws-acts button')].map((b) => b.title).join(),
    // Dự án mang đúng tên mẫu: dòng phụ không lặp lại tên ấy.
    dupName: [...document.querySelectorAll('#ws-list .ws-item')].filter((li) => li.querySelector('.ws-meta').textContent.startsWith(li.querySelector('.ws-title').textContent + ' ·')).length,
  }));
  await page.click('#ws-tab-new');
  // Hộp dùng lại: mở lại tab thì thân về đầu (khung thấp để thân cuộn được).
  await page.setViewportSize({ width: 1280, height: 560 });
  const scrolled = await page.evaluate(() => { const p = document.getElementById('ws-pane-new'); p.scrollTop = 999; return p.scrollTop; });
  await page.click('#ws-tab-open');
  await page.click('#ws-tab-new');
  const wsn = await page.evaluate((sc) => ({ top: sc > 0 ? document.getElementById('ws-pane-new').scrollTop : -1, create: document.getElementById('ws-create').hidden, list: document.getElementById('ws-pane-open').hidden,
    checked: document.querySelectorAll('#ws-new-templates .tpl:has(input:checked)').length, cards: document.querySelectorAll('#ws-new-templates .tpl').length }), scrolled);
  await page.setViewportSize({ width: 1280, height: 900 });
  const wsg = await page.$$eval('#ws-new-templates > fieldset', (fs) => fs.map((f) => ({ h: f.querySelector(':scope > legend')?.textContent,
    ids: [...f.querySelectorAll('input[name="tpl"]')].map((x) => x.value) })));
  await page.focus(`#ws-new-templates input[value="${genIds.at(-1)}"]`);
  await page.keyboard.press('ArrowDown');
  const crossed = await page.evaluate(() => [document.activeElement.value, document.querySelector('#ws-new-templates input:checked')?.value]);
  check('hộp Dự án: mẫu chia hai nhóm như màn đầu; ↓ từ mẫu chung cuối sang dự án cụ thể đầu',
    wsg.length === 2 && wsg[0].h === 'General templates' && wsg[1].h === 'Specific projects' && wsg[0].ids.join() === genIds.join()
    && wsg[1].ids.join() === specIds.join() && crossed.every((v) => v === specIds[0]), JSON.stringify({ wsg, crossed }));
  check('hộp Dự án: tab Open, dòng đang mở đánh dấu, hành động gọn; tab New có Create và thẻ mẫu',
    wsd.open === 'true' && wsd.rows === nTpl && wsd.count === String(nTpl) && wsd.now === 1 && wsd.create && wsd.acts === 'Rename,Duplicate,Delete' && wsd.dupName === 0
    && !wsn.create && wsn.list && wsn.checked === 1 && wsn.top === 0 && wsn.cards === nTpl, JSON.stringify({ wsd, wsn }));
  await page.keyboard.press('Escape');
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
  check('ghi chú 40 dòng: thẻ vẫn dưới max-height (ghi chú dừng ở --lines-text dòng), cắt và có "Show more"', ch.b < ch.max && ch.cut && ch.more, JSON.stringify(ch));
  const notesLines = () => page.$eval('.card.cut .card-notes', (p) => [p.hasAttribute('data-clip'), p.textContent.split('\n').length]);
  const nl0 = await notesLines();
  await page.click('.card .more');
  const nl1 = await notesLines();
  check('thẻ bị cắt chỉ dựng phần đầu ghi chú; "Show more" dựng đủ 40 dòng', nl0[0] && nl0[1] < 40 && !nl1[0] && nl1[1] === 40, `${nl0} → ${nl1}`);
  // Không còn thẻ "+ Sub-step" cuối hàng: thêm bước con bằng nút ở cột tên bước.
  check('không có thẻ thêm cuối hàng', !(await page.$('.card.add, .add-sub')) && !!(await page.$('.step-head [data-act="add-sub"]')));
  // Vạch chia trên bước: rê chuột thì hiện "Add step" nổi, không xê dịch gì; bấm thì hộp thêm bước đặt sẵn vị trí.
  const boxes = () => page.evaluate(() => [...document.querySelectorAll('.step, .step-head, .card[data-sub], #add-step, .log')]
    .map((e) => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round).join(','); }).join('|'));
  const box0 = await boxes();
  const gapOp0 = await page.$eval('.step .gap-add-btn', (b) => getComputedStyle(b).opacity);
  await page.hover('.step .gap-add');
  await page.waitForTimeout(250);
  const gapOp1 = await page.$eval('.step .gap-add-btn', (b) => getComputedStyle(b).opacity);
  check('vạch chia: rê chuột hiện nút Add step, bố cục không xê dịch', gapOp0 === '0' && gapOp1 === '1' && (await boxes()) === box0, `${gapOp0}→${gapOp1}`);
  await page.click('.step .gap-add-btn');
  check('vạch chia: hộp thêm bước đặt sẵn vị trí 1', await page.isVisible('#dlg-step') && (await page.inputValue('#step-form [name="pos"]')) === '0');
  await page.fill('#step-form [name="title"]', 'Chèn trên');
  await page.click('#step-form button[type="submit"]');
  check('vạch chia: bước mới chèn đúng chỗ', (await cur(page)).steps.map((x) => x.title).join() === 'Chèn trên,Hàng thử');
  check('"Xem thêm" mở cả thẻ', await page.evaluate((max) => document.querySelectorAll('.card[data-sub]')[1].getBoundingClientRect().height > max + 40, ch.max));

  // Về CRISP-DM.
  await page.click('#ws-btn');
  await page.click('.ws-item:first-child [data-act="ws-open"]');
  check('đổi dự án: tên trên thanh trên', /CRISP-DM/.test(await page.textContent('#ws-name')));

  // Vẽ lại sau một thay đổi giữ nguyên chỗ người dùng đang xem: ghi chú bước đang mở, thẻ đã "Xem thêm", hàng đã cuộn ngang.
  await page.click('.step:nth-child(1) .step-notes summary');
  await page.click('.step:nth-child(1) .slot:nth-child(2) > .card .more');
  const keepBefore = await page.evaluate(() => { const sc = document.querySelector('.step:nth-child(1) .cards-scroll'); sc.scrollLeft = sc.scrollWidth; return sc.scrollLeft; });
  await page.click('.step:nth-child(1) .slot:nth-child(4) > .card [data-act="status"]');
  const keep = await page.evaluate(() => {
    const row = document.querySelector('.step:nth-child(1)');
    const c2 = row.querySelector('.slot:nth-child(2) > .card');
    return { notes: row.querySelector('.step-notes').open, open: c2.classList.contains('open'), more: c2.querySelector('.more')?.textContent,
      expanded: c2.querySelector('.more')?.getAttribute('aria-expanded'), left: row.querySelector('.cards-scroll').scrollLeft };
  });
  check('vẽ lại giữ ghi chú bước đang mở, thẻ đã "Xem thêm", chỗ cuộn ngang của hàng', keep.notes && keep.open && keep.more === 'Show less'
    && keep.expanded === 'true' && keepBefore > 0 && Math.abs(keep.left - keepBefore) < 2, `${keepBefore} ${JSON.stringify(keep)}`);
  await setSt(page, await page.getAttribute('.step:nth-child(1) .slot:nth-child(4) > .card', 'data-sub'), 'todo');
  await page.click('.step:nth-child(1) .slot:nth-child(2) > .card .more');
  await page.click('.step:nth-child(1) .step-notes summary');
  await page.evaluate(() => { document.querySelector('.step:nth-child(1) .cards-scroll').scrollLeft = 0; });
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
  const scr = await page.evaluate(async () => {
    const sc = document.querySelector('.step .cards-scroll'), st = getComputedStyle(document.querySelector('.step'));
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    sc.scrollBy(400, 0);
    const moved = sc.scrollLeft > 0;
    await frame();
    sc.scrollLeft = 0;
    await frame();
    return { bar: sc.offsetHeight - sc.clientHeight, more: sc.scrollWidth > sc.clientWidth, moved, cue: sc.classList.contains('more-right'),
      pad: [parseFloat(st.paddingTop), parseFloat(st.paddingBottom)] };
  });
  check('hàng thẻ: không hiện thanh cuộn, vẫn cuộn được, mép báo còn thẻ; bước có lề dưới rộng hơn lề trên', scr.bar === 0 && scr.more && scr.moved && scr.cue
    && scr.pad[1] > scr.pad[0], JSON.stringify(scr));
  check('đánh số theo vị trí trong hàng: 1, 2', geo.nums === '1,2', geo.nums);
  check('việc tiếp theo là thẻ 1', geo.next === '1');

  // Chip trạng thái: bấm hai lần → xong; việc tiếp theo dời sang 1.2; tiến độ. Bấm khi Done: mở danh sách.
  const chip = '.step:nth-child(1) .slot:nth-child(1) > .card [data-act="status"]';
  await page.click(chip);
  check('chip: New → In progress', (await page.textContent(chip)).trim() === 'In progress');
  const chipLook = (sel) => page.$eval(sel, (el) => { const c = getComputedStyle(el); return [c.color, c.backgroundColor, c.borderColor].join('|'); });
  const doingLook = await chipLook(chip), todoLook = await chipLook('.step:nth-child(1) .slot:nth-child(2) > .card [data-act="status"]');
  check('chip Đang làm có màu riêng (chữ, nền, viền khác Chưa làm)', doingLook.split('|').every((v, k) => v !== todoLook.split('|')[k]), `${doingLook} / ${todoLook}`);
  await page.click(chip);
  check(`chip: → xong, tiến độ 1/${n1}`, (await page.textContent(chip)).trim() === 'Done'
    && (await page.textContent('.step:nth-child(1) .prog')).includes(`1/${n1}`));
  check('việc tiếp theo dời sang thẻ 2', (await page.textContent('.step:nth-child(1) .card.next .num')) === '2');
  check('chip giữ focus sau khi bấm', await page.evaluate(() => document.activeElement?.dataset.act === 'status'));
  const layout0 = await page.evaluate(() => document.querySelector('.step').getBoundingClientRect().height);
  await page.click(chip);
  const menu = await page.evaluate(() => {
    const pop = document.querySelector('.dd-pop');
    const chipEl = document.querySelector('.step:nth-child(1) .slot:nth-child(1) > .card [data-act="status"]');
    return pop && { opts: [...pop.querySelectorAll('[role="option"] .dd-label')].map((o) => o.textContent),
      sel: pop.querySelector('[aria-selected="true"]')?.dataset.value, hints: pop.querySelectorAll('.dd-hint').length, dots: pop.querySelectorAll('.st-dot').length,
      focus: document.activeElement === pop, expanded: chipEl.getAttribute('aria-expanded'),
      below: pop.getBoundingClientRect().top >= chipEl.getBoundingClientRect().bottom - 1 || pop.getBoundingClientRect().bottom <= chipEl.getBoundingClientRect().top + 1,
      rowH: document.querySelector('.step').getBoundingClientRect().height };
  });
  check('chip Done: bấm mở danh sách bảy trạng thái (chấm, dòng gợi ý, đánh dấu hiện tại), không đẩy bố cục', !!menu
    && menu.opts.join() === 'New,In progress,Pending,Blocked,Done,Skipped,Cancelled' && menu.sel === 'done' && menu.hints === 7 && menu.dots === 7 && menu.focus && menu.expanded === 'true' && menu.below && menu.rowH === layout0, JSON.stringify(menu));
  await page.keyboard.press('Escape');
  check('danh sách trạng thái: Esc đóng, focus về chip, không đổi gì', !(await page.$('.dd-pop')) && (await page.textContent(chip)).trim() === 'Done'
    && await page.evaluate(() => document.activeElement?.dataset.act === 'status'));
  await page.keyboard.press('Alt+ArrowDown');
  check('Alt + ↓ trên chip: mở danh sách', !!(await page.$('.dd-pop')));
  await page.keyboard.press('Escape');

  // Huỷ: chỉ chọn trong hộp sửa, có ô "Vì sao huỷ"; thẻ hiện lý do, tên gạch; không tính vào tiến độ; "Tiếp theo" bỏ qua;
  // chú giải có Huỷ; bấm chip Huỷ → Chưa làm.
  const c12 = '.step:nth-child(1) .slot:nth-child(2) > .card';
  await page.click(`${c12} [data-act="edit-sub"]`);
  const stLabels = await page.$$eval('#sub-status label', (ls) => ls.map((l) => `${l.querySelector('input').value}:${l.textContent.trim()}`));
  check('hộp sửa: bảy trạng thái dạng viên, có Pending, Cancelled; ô lý do ẩn khi trạng thái không có lý do',
    stLabels.join() === 'todo:New,doing:In progress,pending:Pending,blocked:Blocked,done:Done,skip:Skipped,cancel:Cancelled' && !(await page.isVisible('#sub-reason')), stLabels.join());
  await page.focus('#sub-form [name="status"]:checked');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  const pendPick = await page.evaluate(() => ({ st: document.querySelector('#sub-form [name="status"]:checked').value, focus: document.activeElement?.value,
    label: document.querySelector('#sub-reason-label').textContent, ph: document.querySelector('#sub-form [name="reason"]').placeholder }));
  check('hộp sửa: chọn Pending bằng mũi tên hiện ô "Waiting on", focus vẫn ở viên', await page.isVisible('#sub-reason') && pendPick.st === 'pending'
    && pendPick.focus === 'pending' && pendPick.label === 'Waiting on' && !!pendPick.ph, JSON.stringify(pendPick));
  await page.keyboard.press('ArrowRight');
  check('hộp sửa: Blocked đổi nhãn thành "Blocked by"', (await page.textContent('#sub-reason-label')) === 'Blocked by');
  await page.keyboard.press('ArrowRight');
  check('hộp sửa: Done ẩn ô lý do', !(await page.isVisible('#sub-reason')));
  // Danh sách chọn tự dựng thay <select> (ô Step): mở bằng bấm, chọn bằng phím mũi tên + Enter, <select> đổi theo.
  const step0 = await page.inputValue('#sub-form [name="step"]');
  await page.click('#sub-form .f-step .dd-btn');
  const ddOpen = await page.evaluate(() => ({ pop: !!document.querySelector('.dd-pop'), native: getComputedStyle(document.querySelector('#sub-form [name="step"]')).opacity }));
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  const step1 = await page.inputValue('#sub-form [name="step"]');
  await page.click('#sub-form .f-step .dd-btn');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  check('danh sách chọn tự dựng trong hộp: mở, mũi tên + Enter chọn, <select> đổi theo', ddOpen.pop && ddOpen.native === '0' && step1 !== step0
    && (await page.inputValue('#sub-form [name="step"]')) === step0, JSON.stringify({ ...ddOpen, step0, step1 }));
  await page.check('#sub-form [name="status"][value="cancel"]', { force: true });
  check('chọn Cancelled: hiện ô lý do, focus vào đó', await page.isVisible('#sub-reason') && await page.evaluate(() => document.activeElement?.name === 'reason')
    && (await page.textContent('#sub-reason-label')) === 'Cancelled because');
  await page.fill('#sub-form [name="reason"]', 'Đã có số liệu từ nguồn khác\nkhông cần làm lại');
  await page.fill('#sub-form [name="due"]', '2020-01-02');
  await page.click('#sub-form button[type="submit"]');
  // Thẻ huỷ: hạn đã qua không báo trễ.
  const cxl = await page.evaluate((sel) => {
    const c = document.querySelector(sel);
    return { due: c.querySelector('.due')?.textContent, overdue: !!c.querySelector('.overdue') };
  }, c12);
  check('Huỷ: hạn đã qua không báo trễ', cxl.due === 'due 2 Jan 2020' && !cxl.overdue, JSON.stringify(cxl));
  const cx = await page.evaluate((sel) => {
    const c = document.querySelector(sel);
    return { chip: c.querySelector('.chip').textContent, reason: c.querySelector('.card-reason')?.textContent, line: getComputedStyle(c.querySelector('.card-title .link')).textDecorationLine,
      prog: document.querySelector('.step:nth-child(1) .prog').textContent, next: document.querySelector('.card.next .num')?.textContent,
      legend: [...document.querySelectorAll('#legend li')].map((li) => li.textContent).join(',') };
  }, c12);
  check('Huỷ: chip, lý do trên thẻ, tên gạch ngang', cx.chip === 'Cancelled' && /^Cancelled because Đã có số liệu từ nguồn khác\nkhông cần làm lại$/.test(cx.reason) && cx.line === 'line-through', JSON.stringify(cx));
  check(`Huỷ: tiến độ 1/${n1 - 1}, "Tiếp theo" sang 1.3, chú giải có Huỷ 1`, cx.prog.startsWith(`1/${n1 - 1}`) && cx.next === '3' && cx.legend.includes('Cancelled1'), JSON.stringify(cx));
  check('Huỷ: lưu lý do', (await cur(page)).steps[0].subs[1].reason === 'Đã có số liệu từ nguồn khác\nkhông cần làm lại');
  await page.click(`${c12} [data-act="status"]`);
  check('bấm chip Cancelled: mở danh sách', !!(await page.$('.dd-pop')));
  await page.click('.dd-pop [role="option"][data-value="todo"]');
  check('chọn New từ danh sách: lý do huỷ bỏ', (await page.textContent(`${c12} .chip`)).trim() === 'New' && (await cur(page)).steps[0].subs[1].reason === '');
  check('về Chưa làm: hạn đã qua báo trễ', !!(await page.$(`${c12} .due.overdue`)));
  await page.click(`${c12} [data-act="edit-sub"]`);
  await page.fill('#sub-form [name="due"]', '');
  await page.click('#sub-form button[type="submit"]');
  // Chọn Cancelled từ danh sách của chip: mở hộp sửa ở ô lý do; Lưu mới huỷ, Esc thì không đổi gì.
  const c12id = await page.getAttribute(c12, 'data-sub');
  await setSt(page, c12id, 'cancel');
  check('danh sách chip → Cancelled: hộp sửa mở, trạng thái đặt sẵn, focus ở ô lý do, chưa huỷ', await page.isVisible('#dlg-sub')
    && (await page.$eval('#sub-form [name="status"]:checked', (r) => r.value)) === 'cancel' && await page.evaluate(() => document.activeElement?.name === 'reason')
    && (await cur(page)).steps[0].subs[1].status === 'todo');
  await page.keyboard.press('Escape');
  check('Esc: không huỷ', !(await page.isVisible('#dlg-sub')) && (await cur(page)).steps[0].subs[1].status === 'todo');

  // Chờ (Pending): chọn từ danh sách là đặt ngay, không mở hộp; còn mở trong tiến độ, không là "Next", hạn qua vẫn báo trễ;
  // ghi chú "Waiting on" trên thẻ; bấm chip Pending mở danh sách; sang Blocked giữ ghi chú, sang New thì bỏ.
  const prog0 = await page.textContent('.step:nth-child(1) .prog');
  await setSt(page, c12id, 'pending');
  check('danh sách chip → Pending: đặt ngay, không mở hộp', !(await page.isVisible('#dlg-sub')) && (await cur(page)).steps[0].subs[1].status === 'pending'
    && (await page.textContent(`${c12} .chip`)).trim() === 'Pending');
  await page.click(`${c12} [data-act="edit-sub"]`);
  check('hộp sửa thẻ chờ: ô "Waiting on" hiện, focus ở tên', await page.isVisible('#sub-reason') && (await page.textContent('#sub-reason-label')) === 'Waiting on'
    && await page.evaluate(() => document.activeElement?.name === 'title'));
  await page.fill('#sub-form [name="reason"]', 'Chủ dữ liệu duyệt quyền truy cập');
  await page.fill('#sub-form [name="due"]', '2020-01-02');
  await page.click('#sub-form button[type="submit"]');
  const px = await page.evaluate((sel) => {
    const c = document.querySelector(sel);
    return { reason: c.querySelector('.card-reason')?.textContent, overdue: !!c.querySelector('.due.overdue'), next: c.classList.contains('next'),
      nextNum: document.querySelector('.step:nth-child(1) .card.next .num')?.textContent, anyNext: document.querySelectorAll('.card.next').length, prog: document.querySelector('.step:nth-child(1) .prog').textContent,
      legend: [...document.querySelectorAll('#legend li')].map((li) => li.textContent).join(','), dot: getComputedStyle(c.querySelector('.chip'), '::before').backgroundImage };
  }, c12);
  check('Pending: ghi chú "Waiting on" trên thẻ, hạn qua báo trễ, không là Next, ô chờ giữ Next lại (không thẻ nào Next), tiến độ không đổi, chú giải Pending1, chấm có hình riêng',
    px.reason === 'Waiting on Chủ dữ liệu duyệt quyền truy cập' && px.overdue && !px.next && px.nextNum === undefined && px.anyNext === 0 && px.prog === prog0
    && px.legend.startsWith('New') && px.legend.includes('Pending1') && /radial-gradient/.test(px.dot), JSON.stringify(px));
  await page.fill('#q', 'duyet quyen');
  check('tìm: khớp cả ghi chú Waiting on', (await page.$$('.card[data-sub]')).length === 1 && !!(await page.$(`.card[data-sub="${c12id}"] .card-reason`)));
  await page.fill('#q', '');
  await page.click('#compact-btn');
  const reasonCompact = await page.isVisible(`${c12} .card-reason`);
  await page.click('#compact-btn');
  check('Gọn: ẩn ghi chú Waiting on, tắt Gọn thì hiện lại', !reasonCompact && await page.isVisible(`${c12} .card-reason`));
  await page.click(`${c12} [data-act="status"]`);
  check('bấm chip Pending: mở danh sách', !!(await page.$('.dd-pop')) && (await page.getAttribute('.dd-pop [aria-selected="true"]', 'data-value')) === 'pending');
  await page.click('.dd-pop [role="option"][data-value="blocked"]');
  check('Pending → Blocked: giữ ghi chú, nhãn "Blocked by"; Blocked không là Next, ô vẫn giữ Next lại', (await cur(page)).steps[0].subs[1].reason === 'Chủ dữ liệu duyệt quyền truy cập'
    && (await page.textContent(`${c12} .card-reason`)) === 'Blocked by Chủ dữ liệu duyệt quyền truy cập' && !(await page.$('.card.next')));
  await setSt(page, c12id, 'todo');
  check('Blocked → New: bỏ ghi chú', (await cur(page)).steps[0].subs[1].reason === '' && !(await page.$(`${c12} .card-reason`)));
  await page.click(`${c12} [data-act="edit-sub"]`);
  await page.fill('#sub-form [name="due"]', '');
  await page.click('#sub-form button[type="submit"]');

  // Thêm bước con có đủ trường.
  await page.click('.step:nth-child(1) [data-act="add-sub"]');
  await page.fill('#sub-form [name="title"]', 'Thử <img src=x onerror=alert(1)> · chấm');
  await page.check('#sub-form [name="status"][value="blocked"]', { force: true });
  await page.fill('#sub-form [name="due"]', '2026-12-01');
  await page.fill('#sub-form [name="doneWhen"]', 'Có kết quả');
  await page.fill('#sub-form [name="notes"]', 'dòng 1\n\ndòng 3');
  await page.click('#sub-form button[type="submit"]');
  let ws = await cur(page);
  const added = ws.steps[0].subs[n1];
  check('thêm bước con: lưu đủ trường', added && added.status === 'blocked' && added.due === '2026-12-01' && !('owner' in added)
    && added.notes === 'dòng 1\n\ndòng 3' && added.doneWhen === 'Có kết quả');
  check('chữ người dùng không thành HTML', (await page.$$('.card img')).length === 0
    && /<img src=x/.test(await page.textContent(`.step:nth-child(1) .slot:nth-child(${n1 + 1}) > .card .card-title`)));

  // Sửa: chuyển sang bước 2.
  await page.click(`.step:nth-child(1) .slot:nth-child(${n1 + 1}) > .card [data-act="edit-sub"]`);
  await page.selectOption('#sub-form [name="step"]', ws.steps[1].id);
  await page.click('#sub-form button[type="submit"]');
  ws = await cur(page);
  check('sửa: chuyển bước con sang bước khác', ws.steps[0].subs.length === n1 && ws.steps[1].subs.at(-1).id === added.id);

  // Nhân bản, rồi xoá + hoàn tác.
  await page.click(`.card[data-sub="${added.id}"] [data-act="sub-dup"]`);
  ws = await cur(page);
  check('nhân bản bước con', ws.steps[1].subs.length === n2 + 2 && /\(copy\)/.test(ws.steps[1].subs[n2 + 1].title));
  const dupId = ws.steps[1].subs[n2 + 1].id;
  await page.click(`.card[data-sub="${dupId}"] [data-act="sub-del"]`);
  check('xoá: toast có Hoàn tác, focus ở nút Hoàn tác', await page.isVisible('#toast-undo') && (await cur(page)).steps[1].subs.length === n2 + 1
    && await page.evaluate(() => document.activeElement.id === 'toast-undo'));
  await page.click('#toast-undo');
  ws = await cur(page);
  check('hoàn tác xoá bước con: về đúng chỗ', ws.steps[1].subs.length === n2 + 2 && ws.steps[1].subs[n2 + 1].id === dupId);

  // Sắp xếp bằng bàn phím (Alt + mũi tên trên tên thẻ). Thêm, xoá ở trên làm số lệch: Renumber trước cho sạch.
  check('đã thêm / xoá trong phiên: nút Renumber hiện', await page.isVisible('#renumber-btn'));
  await page.click('#renumber-btn');
  const order = async () => (await cur(page)).steps[1].subs.map((x) => x.id);
  const before = await order();
  const titleOf = async (id) => (await cur(page)).steps.flatMap((x) => x.subs).find((x) => x.id === id).title;
  await page.focus(subSel(before[1], 'edit-sub'));
  await page.keyboard.press('Alt+ArrowLeft');
  const afterLeft = await order();
  check('Alt + ←: sang trái một ô', afterLeft[0] === before[1] && afterLeft[1] === before[0]);
  check('focus ở lại thẻ vừa dời', await page.evaluate((id) => document.activeElement?.closest('.card')?.dataset.sub === id, before[1]));
  // Số đứng yên trong phiên: thẻ vừa dời giữ số cũ (hàng đọc "2 1 3"), nút Renumber hiện.
  const rowNums = () => page.evaluate((id) => [...document.querySelector(`.step[data-step="${id}"]`).querySelectorAll('.card .num')].slice(0, 3)
    .map((n) => n.textContent || 'dot').join(','), ws.steps[1].id);
  check('số đứng yên sau khi dời: hàng đọc 2,1,3; nút Renumber hiện', (await rowNums()) === '2,1,3' && await page.isVisible('#renumber-btn'), await rowNums());
  const marks = () => page.evaluate(() => ({
    moved: [...document.querySelectorAll('.moved')].map((e) => e.dataset.sub || e.dataset.step),
    swapped: [...document.querySelectorAll('.swapped')].map((e) => e.dataset.sub || e.dataset.step),
    toast: document.getElementById('toast').hidden ? '' : document.getElementById('toast-text').textContent,
  }));
  let mk = await marks();
  check('dời: thẻ vừa dời tô nổi, thẻ bị đổi chỗ tô nhẹ, toast tả chỗ mới bằng tên (không bằng số)',
    mk.moved.join() === before[1] && mk.swapped.join() === before[0] && mk.toast.startsWith(`Moved "${(await titleOf(before[1])).slice(0, 20)}`)
    && / to the start of the row$/.test(mk.toast), JSON.stringify(mk));
  const flashRing = await page.evaluate(() => {
    const el = document.querySelector('.card.moved');
    const kf = el ? el.getAnimations().flatMap((a) => a.effect.getKeyframes()) : [];
    return { n: kf.length, out: kf.filter((k) => k.offset === 0).map((k) => k.boxShadow || '').filter((s) => s && !s.split(/,(?![^(]*\))/)[0].includes('inset')) };
  });
  check('dời: vòng tô của thẻ nằm trong viền (inset), hàng cuộn ngang không cắt mất', flashRing.n > 0 && flashRing.out.length === 0, JSON.stringify(flashRing));
  await page.keyboard.press('Alt+ArrowRight');
  await page.keyboard.press('Alt+ArrowRight');
  mk = await marks();
  check('Alt + →: tô thẻ vừa dời, toast "after …", focus giữ trên thẻ',
    (await order())[2] === before[1] && mk.moved.join() === before[1] && mk.swapped.join() === before[2]
    && mk.toast.includes(` after "${(await titleOf(before[2])).slice(0, 20)}`)
    && await page.evaluate((id) => document.activeElement?.closest('.card')?.dataset.sub === id, before[1]), JSON.stringify(mk));
  check('số đứng yên: sau hai lần Alt + → hàng đọc 1,3,2', (await rowNums()) === '1,3,2', await rowNums());
  await page.keyboard.press('Control+z');
  check('hoàn tác dời (Ctrl+Z): về chỗ cũ, số khớp lại, Renumber ẩn', JSON.stringify(await order()) === JSON.stringify(before)
    && (await rowNums()) === '1,2,3' && !(await page.isVisible('#renumber-btn')));
  await waitTo(page, 'dấu tô thẻ vừa dời tắt', () => !document.querySelector('.moved, .swapped'), null, 6000);
  check('đánh dấu vừa dời tự tắt sau vài giây', !(await page.$('.moved, .swapped')));

  // Bước con song song: "Add parallel" trên thẻ đặt sẵn "Parallel with N"; ô xếp chồng, số "N.1", "N.2"; Alt + ↑ ↓ đổi thứ
  // tự trong ô; Alt + → tách ra ô riêng; ô Vị trí của hộp sửa có "Parallel with N".
  await page.click(`.card[data-sub="${before[2]}"] [data-act="add-par"]`, { force: true });
  check('Add parallel: hộp thêm đặt sẵn "Parallel with 3"', (await page.inputValue('#sub-form [name="pos"]')) === 'j:2'
    && /Parallel with 3/.test(await page.textContent('#sub-form .f-pos .dd-btn')), await page.inputValue('#sub-form [name="pos"]'));
  await page.fill('#sub-form [name="title"]', 'Song song A');
  await page.click('#sub-form button[type="submit"]');
  let ws2 = (await cur(page)).steps[1];
  const parId = ws2.subs.find((x) => x.title === 'Song song A').id;
  const stack = await page.evaluate((id) => {
    const c = document.querySelector(`.card[data-sub="${id}"]`), slot = c.closest('.slot');
    const cs = [...slot.querySelectorAll('.card')];
    return { n: cs.length, par: slot.classList.contains('par'), nums: cs.map((x) => (x.querySelector('.num.fresh') ? '' : x.querySelector('.num').textContent)).join(','),
      under: cs[1].getBoundingClientRect().top > cs[0].getBoundingClientRect().bottom - 1, sameX: Math.abs(cs[1].getBoundingClientRect().left - cs[0].getBoundingClientRect().left) < 1,
      nextSlot: slot.nextElementSibling?.querySelector('.num')?.textContent };
  }, parId);
  check('ô song song: hai thẻ xếp chồng một cột; thẻ cũ giữ số 3, thẻ mới chưa có số (chấm); ô sau vẫn là 4', stack.n === 2 && stack.par
    && stack.nums === '3,' && stack.under && stack.sameX && stack.nextSlot === '4' && ws2.subs[3].id === parId && ws2.subs[3].par === true
    && !!(await page.$(`.card[data-sub="${parId}"] .num.fresh`)), JSON.stringify(stack));
  await page.click('#renumber-btn');
  const renum = await page.evaluate((id) => [...document.querySelector(`.card[data-sub="${id}"]`).closest('.slot').querySelectorAll('.num')].map((n) => n.textContent).join(','), parId);
  check('Renumber: đánh số lại theo thứ tự hiện tại (3.1, 3.2), nút ẩn', renum === '3.1,3.2' && !(await page.isVisible('#renumber-btn')), renum);
  await page.focus(subSel(parId, 'edit-sub'));
  await page.keyboard.press('Alt+ArrowUp');
  check('Alt + ↑: lên đầu ô song song', (await cur(page)).steps[1].subs[2].id === parId && (await cur(page)).steps[1].subs[3].par === true
    && / to run in parallel with "/.test((await marks()).toast), (await marks()).toast);
  await page.keyboard.press('Alt+ArrowRight');
  ws2 = (await cur(page)).steps[1];
  check('Alt + →: tách khỏi ô song song thành ô riêng ngay sau', ws2.subs.every((x) => !x.par) && ws2.subs[3].id === parId, ws2.subs.map((x) => x.par).join());
  await page.click(subSel(parId, 'edit-sub'));
  const posOpts = await page.$$eval('#sub-form [name="pos"] option', (o) => o.map((x) => x.value + '=' + x.textContent));
  check('ô Vị trí: Position N và Parallel with N', posOpts.includes('n:0=Position 1') && posOpts.includes('j:0=Parallel with 1')
    && posOpts.at(-1).startsWith('n:'), posOpts.slice(0, 4).join(' | '));
  await page.selectOption('#sub-form [name="pos"]', 'j:1');
  await page.click('#sub-form button[type="submit"]');
  ws2 = (await cur(page)).steps[1];
  check('ô Vị trí "Parallel with 2": nhập vào ô 2', ws2.subs[2].id === parId && ws2.subs[2].par === true, ws2.subs.map((x) => x.par).join());
  await page.keyboard.press('Control+z');
  ws2 = (await cur(page)).steps[1];
  check('hoàn tác (dời liền nhiều lần): về chỗ trước lần dời đầu, ô song song như lúc thêm', ws2.subs[3].id === parId && ws2.subs[3].par === true,
    ws2.subs.map((x) => x.par).join());
  await page.click(subSel(parId, 'sub-del'), { force: true });

  const stepsBefore = (await cur(page)).steps.map((s) => s.id);
  check('bước không còn nút lên / xuống, có tay nắm kéo', !(await page.$('[data-act="step-up"], [data-act="step-down"]')) && !!(await page.$('.step .step-grip')));
  await page.focus(`.step[data-step="${stepsBefore[1]}"] [data-act="edit-step"]`);
  await page.keyboard.press('Alt+ArrowUp');
  const stepsAfter = (await cur(page)).steps.map((s) => s.id);
  check('Alt + ↑ trên tên bước: đưa bước lên', stepsAfter[0] === stepsBefore[1] && stepsAfter[1] === stepsBefore[0]);
  mk = await marks();
  check('dời bước: hàng vừa dời tô nổi, hàng bị đổi chỗ tô nhẹ, toast "Moved step … to the top"',
    mk.moved.join() === stepsBefore[1] && mk.swapped.join() === stepsBefore[0] && /^Moved step ".*" to the top( · Input on hold: .*)?$/.test(mk.toast), JSON.stringify(mk));
  await page.keyboard.press('Alt+ArrowDown');
  check('Alt + ↓: về chỗ cũ', (await cur(page)).steps.map((s) => s.id).join() === stepsBefore.join());

  // Kéo thả bằng chuột (pointer events). Khung cao để nguồn và đích cùng trong tầm nhìn.
  await page.setViewportSize({ width: 1280, height: 2400 });
  await page.evaluate(() => document.querySelectorAll('.cards-scroll').forEach((sc) => { sc.scrollLeft = 0; }));
  /* Nhấn trên `from`, kéo từng bước tới điểm `to` (hàm trả {x, y}), chạy `mid` khi chưa thả, rồi thả (hay Esc). */
  const dragTo = async (from, to, { mid = null, esc = false, hold = 0 } = {}) => {
    const a = await page.locator(from).boundingBox();
    await page.mouse.move(a.x + 24, a.y + 24);
    await page.mouse.down();
    await page.mouse.move(a.x + 34, a.y + 30, { steps: 2 });
    const p = await to();
    await page.mouse.move(p.x, p.y, { steps: 8 });
    if (hold) await page.waitForTimeout(hold);
    const seen = mid ? await mid() : null;
    if (esc) await page.keyboard.press('Escape');
    await page.mouse.up();
    await page.waitForFunction(() => !document.querySelector('.drag-ghost') && !document.body.classList.contains('dragging-any'), null, { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(60);
    return seen;
  };
  const box = (sel) => page.locator(sel).boundingBox();
  const cardSel = (id) => `.card[data-sub="${id}"]`;
  const ids0 = async () => (await cur(page)).steps[0].subs.map((x) => x.id);
  const pars0 = async () => (await cur(page)).steps[0].subs.map((x) => (x.par ? 'p' : '-')).join('');
  const r1 = await ids0();
  // 1. Trong hàng: thẻ 3 lên đầu. Lúc chưa thả: ô viền đứt "Drop here" ở ô đầu, thẻ gốc ẩn, bảng không bị vẽ lại.
  await page.evaluate((id) => { window.__keep = document.querySelector(`.card[data-sub="${id}"]`); }, r1[1]);
  const mid1 = await dragTo(cardSel(r1[2]), async () => { const b = await box(cardSel(r1[0])); return { x: b.x + 12, y: b.y + 30 }; }, {
    mid: () => page.evaluate((ids) => {
      const ph = document.querySelector('.drop-ph');
      const first = ph?.closest('.cards')?.firstElementChild;
      return { ph: !!ph, text: ph?.textContent, first: !!first && first.contains(ph), dashed: ph && getComputedStyle(ph).borderStyle,
        hidden: !!document.querySelector(`.card[data-sub="${ids[2]}"]`)?.closest('.drag-src'), same: window.__keep === document.querySelector(`.card[data-sub="${ids[1]}"]`),
        ghost: !!document.querySelector('.drag-ghost'), w: ph && Math.round(ph.getBoundingClientRect().width), cw: Math.round(document.querySelector(`.card[data-sub="${ids[1]}"]`).getBoundingClientRect().width),
        cover: getComputedStyle(document.querySelector('.drag-cover') || document.body).cursor, noSel: getSelection().isCollapsed };
    }, r1),
  });
  check('kéo thẻ: chưa thả đã thấy ô viền đứt "Drop here" ở chỗ sẽ thả, cỡ thẻ; thẻ gốc ẩn; bảng không vẽ lại giữa chừng',
    mid1.ph && mid1.text === 'Drop here' && mid1.first && mid1.dashed === 'dashed' && mid1.hidden && mid1.same && mid1.ghost && mid1.w === mid1.cw, JSON.stringify(mid1));
  check('kéo thẻ: con trỏ "grabbing" (tấm phủ), không bôi chữ', mid1.cover === 'grabbing' && mid1.noSel, JSON.stringify(mid1));
  const r1b = await ids0();
  check('kéo thả bước con trong hàng', r1b[0] === r1[2] && r1b.length === n1, r1b.indexOf(r1[2]) + '');
  check('kéo thả: không mở hộp sửa sau khi thả', !(await page.isVisible('#dlg-sub')));
  // 2. Thả vào phần dưới một thẻ: nhập ô của nó, chạy song song.
  const mid2 = await dragTo(cardSel(r1[3]), async () => { const b = await box(cardSel(r1[0])); return { x: b.x + b.width / 2, y: b.y + b.height - 8 }; }, {
    mid: () => page.evaluate(() => { const ph = document.querySelector('.drop-ph'); return { join: ph?.classList.contains('join'), text: ph?.textContent, par: !!ph?.closest('.slot.par') }; }),
  });
  let r1c = await ids0();
  check('kéo vào phần dưới thẻ: ô viền đứt báo chạy song song, thả thì nhập ô ấy', mid2.join && /parallel/.test(mid2.text) && mid2.par
    && r1c[2] === r1[3] && r1c[1] === r1[0] && (await pars0()).startsWith('--p'), JSON.stringify(mid2) + (await pars0()));
  // 3. Kéo ra khỏi ô song song: thả vào nửa trái thẻ đầu hàng → ô riêng ở đầu.
  await dragTo(cardSel(r1[3]), async () => { const b = await box(cardSel(r1[2])); return { x: b.x + 12, y: b.y + 30 }; });
  r1c = await ids0();
  check('kéo ra khỏi ô song song: thành ô riêng', r1c[0] === r1[3] && !(await pars0()).includes('p'), (await pars0()));
  const parBad = await page.evaluate(() => [...document.querySelectorAll('.cards > .slot')].filter((li) => li.classList.contains('par') !== (li.querySelectorAll('.card[data-sub]').length > 1)).length);
  check('sau khi kéo: dáng ô song song đúng số thẻ của từng ô (hàng không vẽ lại cũng vậy)', parBad === 0, String(parBad));
  // 4. Esc huỷ: không đổi gì, ô viền đứt biến mất, thẻ gốc hiện lại.
  const before4 = await ids0();
  await dragTo(cardSel(r1[0]), async () => { const b = await box(cardSel(before4[0])); return { x: b.x + 12, y: b.y + 30 }; }, { esc: true });
  check('Esc khi đang kéo: huỷ, không đổi gì', (await ids0()).join() === before4.join() && !(await page.$('.drop-ph, .drag-src, .drag-ghost')));
  // 4b. Bóng không trôi khỏi con trỏ: điểm nắm cách góc bóng như lúc đầu, cả ở góc phải dưới khung nhìn.
  {
    const a = await box(cardSel(before4[0]));
    const gx = 24, gy = 24;
    const off = (x, y) => page.evaluate(([x, y]) => {
      const g = document.querySelector('.drag-ghost'), r = g.getBoundingClientRect(), cs = getComputedStyle(g);
      return { dx: x - r.left, dy: y - r.top, scale: parseFloat(cs.scale), tilt: parseFloat(cs.rotate), h: g.offsetHeight, w: g.offsetWidth };
    }, [x, y]);
    await page.mouse.move(a.x + gx, a.y + gy); await page.mouse.down();
    await page.mouse.move(a.x + gx + 10, a.y + gy + 6, { steps: 2 }); await page.waitForTimeout(60);
    const near = await off(a.x + gx + 10, a.y + gy + 6);
    const vp = page.viewportSize(), fx = vp.width - 150, fy = vp.height - 120;
    await page.mouse.move(fx, fy, { steps: 8 }); await page.waitForTimeout(120);
    const far = await off(fx, fy);
    await page.keyboard.press('Escape'); await page.mouse.up();
    await page.waitForFunction(() => !document.querySelector('.drag-ghost') && !document.body.classList.contains('dragging-any'), null, { timeout: 3000 }).catch(() => {});
    /* Thu nhỏ, nghiêng quanh điểm nắm: góc hộp bao chỉ lệch (1 − scale)·nắm + cạnh·sin(nghiêng), không đổi theo chỗ con trỏ. */
    const tol = (k) => (1 - near.scale) * 24 + k * Math.sin(Math.abs(near.tilt) * Math.PI / 180) + 1.5;
    check('kéo: bóng không trôi khỏi con trỏ (góc phải dưới), điểm nắm ≈ chỗ nắm trên thẻ',
      Math.abs(far.dx - near.dx) <= 1 && Math.abs(far.dy - near.dy) <= 1 && Math.abs(far.dx - gx) <= tol(near.h) && Math.abs(far.dy - gy) <= tol(near.w),
      JSON.stringify({ near, far }));
  }
  // 5. Tự cuộn ngang: giữ gần mép phải hàng thẻ thì hàng cuộn.
  const sc0 = await page.evaluate(() => document.querySelector('.step .cards-scroll').scrollLeft);
  await dragTo(cardSel(before4[1]), async () => { const b = await box('.step:first-child .cards-scroll'); return { x: b.x + b.width - 10, y: b.y + 40 }; }, {
    hold: 600, esc: true, mid: () => page.evaluate(() => document.querySelector('.step .cards-scroll').scrollLeft),
  }).then((v) => check('kéo gần mép phải hàng: hàng tự cuộn ngang', v > sc0 + 20, `${sc0} → ${v}`));
  await page.evaluate(() => document.querySelectorAll('.cards-scroll').forEach((sc) => { sc.scrollLeft = 0; }));
  // 6. Kéo cả bước bằng tay nắm: lúc chưa thả có chỗ thả "Drop the step here".
  const st = (await cur(page)).steps.map((s) => s.id);
  const mid6 = await dragTo(`.step[data-step="${st[2]}"] .step-grip`, async () => { const b = await box(`.step[data-step="${st[0]}"]`); return { x: b.x + 40, y: b.y + 10 }; }, {
    mid: () => page.evaluate(() => ({ ph: document.querySelector('.step-ph')?.textContent, first: document.querySelector('#board').firstElementChild?.classList.contains('step-ph') })),
  });
  const st2 = (await cur(page)).steps.map((s) => s.id);
  check('kéo thả bước: chỗ thả hiện trước khi thả, bước lên đầu', mid6.ph === 'Drop the step here' && mid6.first && st2[0] === st[2] && st2[1] === st[0],
    JSON.stringify(mid6) + st2.indexOf(st[2]));
  // 7. Sang bước khác: thẻ đầu của hàng 3 về cuối hàng 1.
  const r2 = (await cur(page)).steps[2].subs.map((x) => x.id);
  await page.evaluate((id) => { const sc = document.querySelector(`.step[data-step="${id}"] .cards-scroll`); sc.scrollLeft = sc.scrollWidth; }, st2[0]);
  const lastSel = `.step[data-step="${st2[0]}"] .slot:last-child > .card`;
  // Thả ở mép phải hàng đích: hàng tự cuộn tới cuối, ô viền đứt về sau thẻ cuối.
  await dragTo(cardSel(r2[0]), async () => {
    const b = await box(lastSel), r = await box(`.step[data-step="${st2[0]}"] .cards-scroll`);
    return { x: r.x + r.width - 16, y: b.y + 30 };
  }, { hold: 1200 });
  const mkd = await marks();
  check('kéo thả bước con sang bước khác', (await cur(page)).steps[0].subs.at(-1).id === r2[0], JSON.stringify((await cur(page)).steps.slice(0, 3).map((x) => x.subs.map((y) => y.id.slice(-4) + (y.par ? 'p' : '')))) + ' ' + r2[0].slice(-4));
  check('kéo thả: thẻ vừa thả tô nổi, toast "Moved … to step …, after …"', mkd.moved.join() === r2[0]
    && /^Moved ".*" to step ".*", after ".*"( · Input on hold: .*)?$/.test(mkd.toast), JSON.stringify(mkd));
  // 8. Bóng ma: lúc kéo đúng một bóng (không "Show more", không data-sub); mọi đường kết thúc (thả rồi chuột đi tiếp ngay,
  // Esc, pointercancel, bảng vẽ lại giữa chừng) để lại không bóng, không ô viền đứt, không thẻ còn transform; kéo liền
  // nhiều lần không dồn bóng. Thả về đúng chỗ cũ nên thứ tự không đổi.
  const leftovers = () => page.evaluate(() => ({
    ghosts: document.querySelectorAll('.drag-ghost').length,
    rest: document.querySelectorAll('.drop-ph, .step-ph, .ph-slot, .drag-src, .drag-cover').length + (document.body.classList.contains('dragging-any') ? 1 : 0),
    tf: [...document.querySelectorAll('#board .card, #board .step')].filter((n) => n.style.transform || getComputedStyle(n).transform !== 'none').length,
  }));
  const settle = () => page.waitForFunction(() => !document.querySelector('.drag-ghost') && !document.body.classList.contains('dragging-any'), null, { timeout: 3000 }).catch(() => {});
  const cutId = await page.evaluate(() => document.querySelector('#board .card.cut[data-sub]')?.dataset.sub);
  const order8 = JSON.stringify((await cur(page)).steps.map((s) => [s.id, s.subs.map((x) => x.id + (x.par ? 'p' : ''))]));
  /** Nhấn trên `sel`, trôi 20px (vẫn trong ô viền đứt ở chỗ cũ), đếm bóng; rồi kết thúc bằng `end`. */
  const ghostRun = async (sel, end) => {
    await page.locator(sel).scrollIntoViewIfNeeded();
    const a = await box(sel);
    const x = a.x + Math.min(24, a.width / 2), y = a.y + Math.min(24, a.height / 2);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 10, y + 2, { steps: 2 });
    await page.mouse.move(x + 20, y + 4, { steps: 2 });
    const during = await page.evaluate(() => [...document.querySelectorAll('.drag-ghost')].map((g) => ({
      more: g.querySelectorAll('.more').length, keyed: g.querySelectorAll('[data-sub], [data-step], [id]').length + (g.dataset.sub || g.dataset.step || g.id ? 1 : 0) })));
    if (end === 'drop') { await page.mouse.up(); await page.mouse.move(x + 320, y + 140, { steps: 6 }); }
    if (end === 'esc') { await page.keyboard.press('Escape'); await page.mouse.up(); }
    if (end === 'cancel') { await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, pointerType: 'mouse', bubbles: true }))); await page.mouse.up(); }
    if (end === 'render') { await page.evaluate(() => window.dispatchEvent(new StorageEvent('storage', { key: 'stepPlanner.v2' }))); await page.mouse.up(); }
    const after = await page.evaluate(() => document.querySelectorAll('.drag-ghost').length);
    await settle();
    await page.waitForTimeout(60);
    return { during, after, left: await leftovers() };
  };
  const g8 = [];
  for (const [sel, end] of [[cardSel(cutId), 'drop'], [cardSel(cutId), 'drop'], [cardSel(cutId), 'drop'], [cardSel(cutId), 'esc'],
    [cardSel(cutId), 'cancel'], [cardSel(cutId), 'render'], [`.step[data-step="${st2[1]}"] .step-grip`, 'drop'],
    [`.step[data-step="${st2[1]}"] .step-grip`, 'drop'], [`.step[data-step="${st2[1]}"] .step-grip`, 'esc'],
    [`.step[data-step="${st2[1]}"] .step-grip`, 'cancel']]) g8.push({ end, ...(await ghostRun(sel, end)) });
  check('kéo: đúng một bóng, bóng không có "Show more" hay id / khoá dữ liệu', !!cutId && g8.every((g) => g.during.length === 1 && g.during[0].more === 0 && g.during[0].keyed === 0), JSON.stringify(g8.map((g) => g.during)));
  check('thả (chuột đi tiếp ngay), Esc, pointercancel, vẽ lại giữa chừng; thẻ và bước: không bóng sót, không dồn, không transform còn lại',
    g8.every((g) => g.after <= 1 && g.left.ghosts === 0 && g.left.rest === 0 && g.left.tf === 0), JSON.stringify(g8.map((g) => [g.end, g.after, g.left])));
  check('thả về chỗ cũ: thứ tự không đổi', JSON.stringify((await cur(page)).steps.map((s) => [s.id, s.subs.map((x) => x.id + (x.par ? 'p' : ''))])) === order8);
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
  await waitTo(page, 'bộ nhớ ghi bước đã xoá', (n) => JSON.parse(localStorage.getItem('stepPlanner.v2')).workspaces[0].steps.length === n, nSteps);
  check('xoá bước', (await cur(page)).steps.length === nSteps);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(50);
  check('hoàn tác xoá bước bằng Ctrl+Z', (await cur(page)).steps[1].id === s2id);

  // Reopen (step.revisit, sub.redo): hộp giải thích một dòng, lý do bắt buộc, danh sách bước con đã xong để gửi lại làm;
  // thẻ gửi lại mang dấu Redo tới khi xong lại; băng "Reopened · Iteration N · ngày · lý do" và "k of n redo tasks left";
  // làm lại xong hết thì "Close iteration" thành nút chính; nhật ký tự ghi; Hoàn tác; vòng tăng tiếp.
  const revBtn = `.step[data-step="${s2id}"] .acts [data-act="revisit"]`;
  const r0 = (await cur(page)).steps[1];
  // Chưa có bước con xong thì không có gì để gửi lại: không có Reopen, ở đầu bước lẫn trong hộp sửa bước.
  const nd = (await cur(page)).steps.find((s) => s.subs.length && s.subs.every((x) => x.status !== 'done'));
  await page.click(`.step[data-step="${nd.id}"] [data-act="edit-step"]`);
  const noReopen = !(await page.$(`.step[data-step="${nd.id}"] [data-act="revisit"]`)) && !(await page.isVisible('#step-revisit'));
  await page.keyboard.press('Escape');
  await page.click(`.step[data-step="${s2id}"] [data-act="edit-step"]`);
  const dlgReopen = await page.isVisible('#step-revisit');
  await page.keyboard.press('Escape');
  check('Reopen: chỉ có khi bước có bước con Done (đầu bước và hộp sửa bước)', noReopen && dlgReopen && !!(await page.$(revBtn)),
    `${r0.subs.map((x) => x.status)} ${noReopen} ${dlgReopen}`);
  const [doneId, doneId2] = [r0.subs[0].id, r0.subs[1].id];
  for (const id of [doneId, doneId2]) {
    for (let k = 0; k < 3 && (await cur(page)).steps[1].subs.find((x) => x.id === id).status !== 'done'; k++) await page.click(subSel(id, 'status'));
  }
  const statuses0 = (await cur(page)).steps[1].subs.map((x) => x.status).join();
  const nDone = (await cur(page)).steps[1].subs.filter((x) => x.status === 'done').length;
  const nLogR = (await cur(page)).log.length;
  await page.click(revBtn);
  check('Reopen: hộp có một câu khi nào dùng (ví dụ), ô lý do bắt buộc', /e\.g\./.test(await page.textContent('#revisit-help'))
    && await page.isVisible('#revisit-help') && (await page.getAttribute('#revisit-form [name="reason"]', 'required')) !== null);
  const rl = await page.evaluate(() => ({
    n: document.querySelectorAll('#revisit-list input[name="reset"]').length,
    checked: document.querySelectorAll('#revisit-list input:checked').length, round: document.getElementById('revisit-round').textContent,
  }));
  check('Reopen: danh sách chỉ bước con đã xong, mặc định không chọn, báo iteration 2', rl.n === nDone && rl.checked === 0
    && /iteration 2/.test(rl.round), JSON.stringify(rl));
  await page.click('#revisit-form button[type="submit"]');
  check('Reopen: chưa ghi lý do thì không mở lại', await page.isVisible('#dlg-revisit') && (await cur(page)).steps[1].revisit === null);
  await page.click('#revisit-all-done');
  const picked = await page.$$eval('#revisit-list input:checked', (c) => c.map((x) => x.value));
  check('"Select all": chọn mọi bước con đã xong', picked.length === nDone && picked.includes(doneId) && picked.includes(doneId2), picked.join());
  await page.fill('#revisit-form [name="reason"]', 'EDA lộ cột thiếu');
  await page.click('#revisit-form button[type="submit"]');
  let rs = await cur(page);
  const autoLog = rs.log.at(-1);
  const sentBack = rs.steps[1].subs.filter((x) => picked.includes(x.id));
  check('Reopen: bước con đã chọn về New và mang dấu redo, iteration 2, nhật ký tự ghi',
    sentBack.every((x) => x.status === 'todo' && x.redo) && rs.steps[1].revisit.round === 2 && rs.steps[1].round === 2
    && rs.log.length === nLogR + 1 && autoLog.decision === `Reopened: ${r0.title} (iteration 2)` && autoLog.why.split('\nAlso check: ')[0] === 'EDA lộ cột thiếu'
    && /Reopened: /.test(await page.textContent('#log-list')), JSON.stringify(autoLog));
  check('Reopen: dòng nhật ký tự ghi gắn với bước, có dấu riêng và chip bước', autoLog.stepId === s2id
    && (await page.textContent(`.log-item.auto[data-log="${autoLog.id}"] .log-step`)).includes(r0.title)
    && !!(await page.$(`.log-item.auto[data-log="${autoLog.id}"] .log-dot svg`)));
  const band = `.step[data-step="${s2id}"] .revisit-band`;
  check('Reopen: thẻ gửi lại có dấu "Redo"; băng đếm việc phải làm lại', (await page.textContent(`.card[data-sub="${doneId}"] .redo-tag`)).trim() === 'Redo'
    && (await page.textContent(`${band} .redo-left`)) === `${nDone} of ${nDone} redo tasks left`, await page.textContent(`${band} .redo-left`));
  check('Reopen: toast có Hoàn tác, focus không bị lấy', await page.isVisible('#toast-undo')
    && await page.evaluate(() => document.activeElement?.id !== 'toast-undo'));
  await page.keyboard.press('Control+z');
  rs = await cur(page);
  check('hoàn tác Reopen: trạng thái, dấu redo, nhật ký, băng, vòng đều về như cũ', rs.steps[1].revisit === null && rs.steps[1].round === 1
    && rs.steps[1].subs.map((x) => x.status).join() === statuses0 && rs.steps[1].subs.every((x) => !x.redo) && rs.log.length === nLogR
    && !/Reopened: /.test(await page.textContent('#log-list')) && !(await page.$('.redo-tag')));
  await page.click(revBtn);
  await page.click('#revisit-all-done');
  await page.fill('#revisit-form [name="reason"]', 'EDA lộ cột thiếu');
  await page.click('#revisit-form button[type="submit"]');
  check('Reopen: băng "Reopened · Iteration 2 · ngày · lý do", nút Close iteration',
    /^Reopened · Iteration 2 · \d{1,2} \w{3} \d{4} · EDA lộ cột thiếu$/.test((await page.textContent(`${band} .badge`)).trim())
    && /Close iteration/.test(await page.textContent(band)) && (await cur(page)).steps[1].revisit.reason === 'EDA lộ cột thiếu');
  for (let k = 0; k < 2; k++) await page.click(subSel(doneId, 'status'));
  check('làm lại xong một việc: dấu Redo mất, băng "1 of 2 left"', !(await page.$(`.card[data-sub="${doneId}"] .redo-tag`))
    && (await page.textContent(`${band} .redo-left`)) === `${nDone - 1} of ${nDone} redo tasks left`);
  for (const id of picked.filter((x) => x !== doneId)) for (let k = 0; k < 2; k++) await page.click(subSel(id, 'status'));
  check('làm lại xong hết: băng "All … done", Close iteration là nút chính', /^All \d+ redo tasks done$/.test(await page.textContent(`${band} .redo-left`))
    && (await page.getAttribute(`${band} [data-act="revisit-clear"]`, 'class')).includes('go'), `${nDone} ${await page.textContent(`${band} .redo-left`)}`);
  await page.click(`${band} [data-act="revisit-clear"]`);
  rs = await cur(page);
  check('Close iteration: bỏ băng và dấu redo, toast có Hoàn tác', rs.steps[1].revisit === null && rs.steps[1].subs.every((x) => !x.redo) && !(await page.$(band))
    && /^Iteration 2 closed/.test(await page.textContent('#toast-text')));
  const iterTag = `.step[data-step="${s2id}"] .step-head .step-iter`;
  check('Close iteration: đầu bước hiện nhãn "Iteration 2" (hàng vẽ lại), có chú thích ngày mở lại', (await page.textContent(iterTag)) === 'Iteration 2'
    && /^Reopened 1 time.* · last reopened \d{1,2} \w{3} \d{4}$/.test(await page.getAttribute(iterTag, 'title')));
  await page.keyboard.press('Control+z');
  check('hoàn tác Close iteration: nhãn "Iteration" mất, băng hiện lại (không lặp)', !(await page.$(iterTag)) && !!(await page.$(band)));
  check('hoàn tác Close iteration: băng và dấu redo trở lại', (await cur(page)).steps[1].revisit?.round === 2 && (await cur(page)).steps[1].subs.filter((x) => x.redo).length === nDone);
  await page.click(`${band} [data-act="revisit-clear"]`);
  await page.click(revBtn);
  check('mở lại sau khi đóng vòng: báo iteration 3', /iteration 3/.test(await page.textContent('#revisit-round')));
  await page.fill('#revisit-form [name="reason"]', 'EDA lộ cột thiếu');
  await page.click('#revisit-form button[type="submit"]');
  check('mở lại: băng "Iteration 3", nhật ký "(iteration 3)", không chọn gì thì không có dấu Redo', /^Reopened · Iteration 3 · /.test((await page.textContent(`${band} .badge`)).trim())
    && (await cur(page)).log.at(-1).decision.endsWith('(iteration 3)') && !(await page.$(`${band} .redo-left`)));
  await page.click(`${band} .badge`);
  check('sửa lý do khi đang mở lại: không có danh sách, tiêu đề là vòng', !(await page.isVisible('#revisit-subs'))
    && (await page.textContent('#dlg-revisit-title')) === 'Iteration 3');
  await page.keyboard.press('Escape');

  // Tài liệu của bước: link (chỉ http(s), mở tab mới) và văn bản Markdown (Sửa / Xem / Chia đôi, không thành HTML).
  const docStep = `.step[data-step="${s2id}"]`;
  await page.click(`${docStep} [data-act="add-doc"]`, { force: true });
  check('tài liệu: hộp thêm có chọn Link / Văn bản', await page.isVisible('#dlg-doc') && await page.isVisible('#doc-kind'));
  await page.fill('#doc-form [name="title"]', 'Lạ');
  await page.fill('#doc-form [name="url"]', 'javascript:alert(1)');
  await page.click('#doc-save');
  check('tài liệu: link không phải http(s) bị chặn', await page.isVisible('#dlg-doc') && (await cur(page)).steps[1].docs.length === 0);
  await page.fill('#doc-form [name="title"]', 'Data card');
  await page.fill('#doc-form [name="url"]', 'https://example.com/card');
  await page.click('#doc-save');
  const linkA = await page.$eval(`${docStep} .step-docs a`, (a) => [a.textContent, a.getAttribute('href'), a.target, a.rel]);
  check('tài liệu: link ở cột bước, mở tab mới, noopener noreferrer',
    linkA.join('|') === 'Data card|https://example.com/card|_blank|noopener noreferrer' && !(await page.isVisible('#dlg-doc')), linkA.join('|'));
  const strip = await page.evaluate((sel) => {
    const row = document.querySelector(sel), st = row.querySelector('.step-docs'), band = row.querySelector('.revisit-band');
    const r = st.getBoundingClientRect(), hd = row.querySelector('.step-head').getBoundingClientRect(), sc = row.querySelector('.cards-scroll').getBoundingClientRect();
    return { afterBand: !!band && band.nextElementSibling === st, above: r.bottom <= Math.min(hd.top, sc.top) + 1, wide: r.left <= hd.left + 1 && r.right >= sc.left,
      inHead: !!row.querySelector('.step-head .step-docs') };
  }, docStep);
  check('tài liệu của bước: dải chip ngay dưới băng Reopened, trên cột tên và hàng thẻ, rộng cả hàng', strip.afterBand && strip.above && strip.wide && !strip.inHead,
    JSON.stringify(strip));
  await page.click(`${docStep} [data-act="add-doc"]`, { force: true });
  await page.check('#doc-form input[name="kind"][value="md"]', { force: true });
  check('tài liệu: chọn Văn bản thì ẩn ô link', !(await page.isVisible('#doc-url-field')));
  await page.fill('#doc-form [name="title"]', 'Ghi chép EDA');
  await page.click('#doc-save');
  const mdState = () => page.evaluate(() => ({
    open: document.getElementById('dlg-md').open, mode: document.getElementById('md-panes').dataset.mode,
    sel: [...document.querySelectorAll('#dlg-md .tab[aria-selected="true"]')].map((t) => t.dataset.mode).join(),
    src: getComputedStyle(document.querySelector('.md-src')).display !== 'none', view: getComputedStyle(document.getElementById('md-view')).display !== 'none',
    w: document.getElementById('dlg-md').getBoundingClientRect().width,
    hint: getComputedStyle(document.querySelector('#dlg-md .md-hint')).visibility === 'visible',
  }));
  let ms = await mdState();
  check('tài liệu văn bản mới: hộp lớn mở ở chế độ Sửa', ms.open && ms.mode === 'edit' && ms.sel === 'edit' && ms.src && !ms.view && ms.w > 1000, JSON.stringify(ms));
  await page.fill('#md-form [name="body"]', '# Cột thiếu\n\n**age** thiếu <img src=x onerror=alert(1)>\n\n- a\n  - b\n\n[xấu](javascript:alert(1)) [tốt](https://ok.example)\n\n````\n```\nlồng\n```\n````');
  // Edit: bản tô màu dưới ô chữ trong suốt; chữ khớp từng dòng, cao bằng nhau (cùng chỗ xuống hàng), có số dòng, có màu.
  const hlEd = await page.evaluate(() => {
    const ta = document.querySelector('#md-form .md-ta'), hl = document.getElementById('md-hl'), lns = [...hl.children];
    const tok = hl.querySelector('.sx-head'), num = getComputedStyle(lns[1], '::before');
    return { same: lns.map((l) => l.textContent).join('\n') === ta.value, n: lns.length, h: [ta.scrollHeight, ta.clientHeight, hl.offsetHeight],
      clear: getComputedStyle(ta).webkitTextFillColor, tok: !!tok && getComputedStyle(tok).color !== getComputedStyle(hl).color,
      num: num.content, numSel: num.userSelect, taL: ta.getBoundingClientRect().left + parseFloat(getComputedStyle(ta).paddingLeft),
      hlL: lns[1].getBoundingClientRect().left };
  });
  check('Edit: bản tô màu khớp ô chữ từng dòng, cùng cao, có số dòng và màu cú pháp, ô chữ trong suốt',
    hlEd.same && hlEd.n === 14 && hlEd.h[0] === hlEd.h[1] && Math.abs(hlEd.h[1] - hlEd.h[2]) < 1 && /rgba\(0, 0, 0, 0\)|transparent/.test(hlEd.clear)
    && hlEd.tok && hlEd.num === 'counter(ln)' && hlEd.numSel === 'none' && Math.abs(hlEd.taL - hlEd.hlL) < 1, JSON.stringify(hlEd));
  await page.click('#md-form button[type="submit"]');
  let st1 = (await cur(page)).steps[1];
  check('tài liệu văn bản: lưu', st1.docs.length === 2 && st1.docs[1].kind === 'md' && st1.docs[1].title === 'Ghi chép EDA' && /lồng/.test(st1.docs[1].body));
  await page.click(`${docStep} [data-act="open-doc"]`);
  ms = await mdState();
  const view = await page.evaluate(() => {
    const v = document.getElementById('md-view');
    return { h1: v.querySelector('h1')?.textContent, strong: v.querySelector('strong')?.textContent, img: v.querySelectorAll('img').length,
      nested: !!v.querySelector('ul li ul li'), links: [...v.querySelectorAll('a')].map((a) => a.href + ' ' + a.target + ' ' + a.rel), pre: v.querySelector('pre')?.textContent };
  });
  check('tài liệu văn bản: mở từ cột bước ở chế độ Xem, không hiện dòng nhắc cú pháp', ms.mode === 'view' && ms.sel === 'view' && ms.view && !ms.src && !ms.hint, JSON.stringify(ms));
  check('tài liệu văn bản: dựng Markdown, chữ HTML không thành thẻ, link chỉ http(s) mở tab mới',
    view.h1 === 'Cột thiếu' && view.strong === 'age' && view.img === 0 && view.nested && view.pre === '```\nlồng\n```'
    && view.links.join() === 'https://ok.example/ _blank noopener noreferrer', JSON.stringify(view));
  check('tài liệu văn bản: đúng hai tab Edit / Preview', (await page.$$eval('#dlg-md .tab', (ts) => ts.map((t) => t.textContent.trim()))).join() === 'Edit,Preview');
  await page.click('#dlg-md .tab[data-mode="edit"]');
  ms = await mdState();
  check('tài liệu văn bản: tab Edit hiện ô chữ, dòng nhắc cú pháp, ẩn bản xem', ms.mode === 'edit' && ms.sel === 'edit' && ms.src && !ms.view && ms.hint, JSON.stringify(ms));
  await page.fill('#md-form [name="body"]', 'chữ chưa lưu');
  await page.keyboard.press('Escape');
  check('tài liệu văn bản: đóng khi chưa lưu thì hỏi lại', await page.isVisible('#dlg-ask') && (await mdState()).open);
  await page.click('#dlg-ask [data-close]');
  await page.click('#dlg-md .dlg-foot [data-close]');
  await page.click('#ask-ok');
  await waitTo(page, 'hộp văn bản đóng', () => !document.getElementById('dlg-md').open);
  check('tài liệu văn bản: chọn bỏ thì không lưu', !(await mdState()).open && /lồng/.test((await cur(page)).steps[1].docs[1].body));
  // Đóng bằng Esc: focus về tài liệu ở cột bước, không vẽ vòng focus; bấm Tab thì vòng hiện lại.
  await page.click(`${docStep} [data-act="open-doc"]`);
  await page.keyboard.press('Escape');
  const ring = () => page.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a);
    return { el: a.dataset.act || a.id || a.tagName, fv: a.matches(':focus-visible'), quiet: document.documentElement.classList.contains('quiet-focus'), oc: cs.outlineColor, w: cs.outlineStyle === 'none' ? 0 : parseFloat(cs.outlineWidth) }; });
  const rg1 = await ring();
  check('Esc đóng tài liệu: focus về tài liệu, không có vòng focus', !(await mdState()).open && rg1.el === 'open-doc' && rg1.w === 0, JSON.stringify(rg1));
  await page.keyboard.press('Tab');
  const rg2 = await ring();
  check('sau Esc, bấm Tab: vòng focus hiện lại', rg2.fv && rg2.w > 0, JSON.stringify(rg2));
  // Vòng focus của tên thẻ nằm trọn trong vùng cắt của thân thẻ (overflow: hidden), ở mọi thẻ có tên vừa thân.
  const ringClip = await page.evaluate(() => {
    const bad = [];
    let n = 0;
    for (const c of document.querySelectorAll('#board .card[data-sub]')) {
      const t = /** @type {HTMLElement} */ (c.querySelector('.card-title [data-act="edit-sub"]')), body = c.querySelector('.card-body');
      t.focus({ focusVisible: true });
      const cs = getComputedStyle(t);
      if (!t.matches(':focus-visible') || cs.outlineStyle === 'none') { bad.push('no ring ' + c.dataset.sub); continue; }
      const o = parseFloat(cs.outlineWidth) + parseFloat(cs.outlineOffset), r = t.getBoundingClientRect(), b = body.getBoundingClientRect();
      if (r.height + 2 * o > b.height) continue; // tên cao hơn cả thân (thẻ bị cắt): không đo
      n++;
      if (r.left - o < b.left - 0.5 || r.right + o > b.right + 0.5 || r.top - o < b.top - 0.5 || r.bottom + o > b.bottom + 0.5)
        bad.push(`${c.dataset.sub}: ring ${[r.left - o, r.top - o, r.right + o, r.bottom + o].map(Math.round)} body ${[b.left, b.top, b.right, b.bottom].map(Math.round)}`);
    }
    /** @type {HTMLElement} */ (document.activeElement).blur();
    return { n, bad };
  });
  check('focus tên thẻ: vòng focus nằm trọn trong vùng cắt của thân thẻ', ringClip.n > 3 && ringClip.bad.length === 0, JSON.stringify(ringClip));

  // Tài liệu của bước con: nhãn kẹp trên thẻ, sửa trong hộp bước con; xoá có Hoàn tác ngay trong hộp.
  const dsub = (await cur(page)).steps[1].subs[0];
  check('thẻ chưa có tài liệu: không có nhãn kẹp', !(await page.$(`.card[data-sub="${dsub.id}"] .doc-tag`)));
  const h0 = await page.$eval(`.card[data-sub="${dsub.id}"]`, (c) => c.getBoundingClientRect().height);
  await page.click(subSel(dsub.id, 'edit-sub'));
  await page.click('#sub-docs [data-doc-add]');
  await page.fill('#doc-form [name="title"]', 'Repo');
  await page.fill('#doc-form [name="url"]', 'https://git.example/repo');
  await page.click('#doc-save');
  await page.click('#sub-docs [data-doc-add]');
  await page.fill('#doc-form [name="title"]', 'Notebook');
  await page.fill('#doc-form [name="url"]', 'https://git.example/nb');
  await page.click('#doc-save');
  check('hộp bước con: danh sách tài liệu cập nhật ngay', (await page.$$('#sub-docs .doc-row')).length === 2 && await page.isVisible('#dlg-sub'));
  await page.click('#sub-docs .doc-row:first-child [data-doc-act="del"]');
  check('xoá tài liệu trong hộp: hàng "Đã xoá · Hoàn tác", focus vào Hoàn tác', (await cur(page)).steps[1].subs[0].docs.length === 1
    && await page.evaluate(() => document.activeElement?.dataset.docAct === 'undo'));
  await page.click('#sub-docs [data-doc-act="undo"]');
  check('hoàn tác xoá tài liệu: về đúng chỗ', (await cur(page)).steps[1].subs[0].docs.map((d) => d.title).join() === 'Repo,Notebook'
    && (await page.$$('#sub-docs .doc-row:not(.undo)')).length === 2);
  await page.click('#dlg-sub .dlg-foot [data-close]');
  const tag = `.card[data-sub="${dsub.id}"] .doc-tag`;
  const h1c = await page.$eval(`.card[data-sub="${dsub.id}"]`, (c) => c.getBoundingClientRect().height);
  check('thẻ có tài liệu: nhãn kẹp + số, thẻ không cao thêm đáng kể', (await page.textContent(tag)).trim() === '2'
    && !!(await page.$(`${tag} use[href="#i-clip"]`)) && Math.abs(h1c - h0) < 1, `${h0} → ${h1c}`);
  await page.click(tag);
  check('bấm nhãn kẹp: mở hộp bước con ở phần tài liệu', await page.isVisible('#dlg-sub')
    && await page.evaluate(() => !!document.activeElement?.closest('#sub-docs')));
  await page.keyboard.press('Escape');
  await page.fill('#q', 'notebook');
  check('tìm khớp tên tài liệu', (await page.$$eval('.card[data-sub]', (c) => c.map((x) => x.dataset.sub))).includes(dsub.id));
  await page.fill('#q', '');

  // Không có khái niệm người làm: không bộ lọc người, không nút Thành viên, ô tìm không nhắc người.
  check('không có người làm: không bộ lọc người, không Thành viên, không ô người làm',
    !(await page.$('#owner-filter, #people-btn, #dlg-people, #sub-form [name="owner"]'))
    && !/người/i.test(await page.getAttribute('#q', 'placeholder')) && !/Thành viên|Người làm|Việc của tôi/.test(await page.textContent('body')));
  // Tìm kiếm.
  await page.fill('#q', 'VERIFY data quality');
  check('tìm không phân biệt hoa thường: một bước con', (await page.$$eval('.card[data-sub]', (c) => c.length)) === 1);
  check('lọc: tắt sắp xếp (không tay nắm kéo bước)', (await page.$$('.step-grip')).length === 0);
  await page.fill('#q', 'BUSINESS understanding');
  check('tìm theo tên bước: cả hàng hiện', (await page.$$eval('.step', (r) => r.length)) === 1);
  // Nút xoá chữ của ô tìm: không dùng dấu × xanh của trình duyệt (getComputedStyle không đọc được phần giả này: đọc luật CSS).
  const cancelX = await page.evaluate(() => [...document.styleSheets].flatMap((ss) => { try { return [...ss.cssRules]; } catch (e) { return []; } })
    .some((r) => r.selectorText && /search-cancel-button/.test(r.selectorText) && /none/.test(r.style.getPropertyValue('appearance'))));
  check('ô tìm: nút xoá chữ theo bộ biểu tượng, không phải dấu × xanh mặc định', cancelX);
  await page.fill('#q', '');

  // Nhật ký quyết định: ô ghi gập thành một nút tới khi dùng; mở ra: Decision (focus), Why, ngày (mặc định hôm nay), bước
  // (danh sách tự dựng). Ghi xong thì gập, focus ở mục mới; Esc gập mà giữ chữ; Enter trong Decision là ghi.
  check('nhật ký: ô ghi gập, chỉ hiện một nút', await page.isVisible('#log-compose-open') && !(await page.isVisible('#log-compose')));
  await page.click('#log-compose-open');
  const comp = await page.evaluate(() => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { focus: document.activeElement?.id, date: document.getElementById('log-date').value === today,
      dd: !!document.querySelector('#log-form .f-step .dd-btn'), open: document.getElementById('log-compose-open').hidden };
  });
  check('nhật ký: mở ô ghi thì focus Decision, ngày hôm nay, bước là danh sách tự dựng', comp.focus === 'log-decision' && comp.date && comp.dd && comp.open,
    JSON.stringify(comp));
  const logStep = (await cur(page)).steps[2];
  await page.fill('#log-decision', 'Bỏ cột thiếu > 40%');
  await page.fill('#log-why', 'Không điền được\nđáng tin\n' + 'lý do rất dài '.repeat(40));
  await page.click('#log-form .f-step .dd-btn');
  await page.click(`.dd-pop [role="option"][data-value="${logStep.id}"]`);
  await page.click('#log-form button[type="submit"]');
  const e1 = (await cur(page)).log.at(-1);
  check('nhật ký: ghi xong thì gập, mục mới gắn bước, focus ở mục mới', e1.decision === 'Bỏ cột thiếu > 40%' && e1.stepId === logStep.id
    && !(await page.isVisible('#log-compose')) && await page.evaluate((id) => document.activeElement === document.querySelector(`[data-log="${id}"] .log-decision`), e1.id)
    && (await page.textContent(`[data-log="${e1.id}"] .log-step`)).includes(logStep.title) && (await page.inputValue('#log-decision')) === '');
  const why1 = `[data-log="${e1.id}"] .log-why`;
  const clamp0 = await page.$eval(why1, (p) => [p.clientHeight, p.scrollHeight]);
  await page.click(`[data-log="${e1.id}"] [data-act="more-log"]`);
  const clamp1 = await page.$eval(why1, (p) => p.clientHeight);
  check('nhật ký: lý do dài bị cắt, "Show more" mở hết, giữ qua lần vẽ lại', clamp0[1] > clamp0[0] + 20 && clamp1 >= clamp0[1] - 1
    && (await page.getAttribute(`[data-log="${e1.id}"] [data-act="more-log"]`, 'aria-expanded')) === 'true', JSON.stringify([clamp0, clamp1]));
  await page.click('#log-compose-open');
  await page.fill('#log-decision', 'Quyết định hai');
  await page.keyboard.press('Escape');
  check('nhật ký: Esc gập ô ghi, focus về nút', !(await page.isVisible('#log-compose')) && await page.evaluate(() => document.activeElement?.id === 'log-compose-open'));
  await page.click('#log-compose-open');
  check('nhật ký: mở lại còn chữ đang viết', (await page.inputValue('#log-decision')) === 'Quyết định hai');
  await page.keyboard.press('Enter');
  const nL = (await cur(page)).log.length;
  check('nhật ký: Enter ghi; thêm hai mục', nL === nLogR + 4 && (await page.$$('.log-item')).length === nL && (await cur(page)).log.at(-1).stepId === '');
  const firstDecision = () => page.$eval('.log-item .log-decision', (b) => b.textContent.trim());
  await page.click('.log-item [data-act="del-log"]');
  check('nhật ký: xoá', (await cur(page)).log.length === nL - 1);
  await page.click('#toast-undo');
  check('nhật ký: hoàn tác', (await cur(page)).log.length === nL);
  check('nhật ký: mới nhất trước, nhóm theo tháng', (await firstDecision()) === 'Quyết định hai'
    && /^[A-Z][a-z]+ \d{4}/.test(await page.textContent('.log-group .log-month')));
  // Chip bước: bấm thì tới bước ấy trên bảng (focus tên bước).
  await page.click(`[data-log="${e1.id}"] .log-step`);
  check('nhật ký: bấm chip bước thì tới bước trên bảng', await page.evaluate((id) => document.activeElement === document.querySelector(`.step[data-step="${id}"] [data-act="edit-step"]`), logStep.id));
  // Bấm vào mục (ngoài nút) là mở hộp sửa; hộp có ô Step.
  await page.click('.log-item:not(.auto) .log-why');
  check('nhật ký: bấm vào mục là mở hộp sửa', await page.isVisible('#dlg-log'));
  await page.keyboard.press('Escape');
  await page.click('.log-item [data-act="edit-log"]');
  await page.fill('#log-edit-form [name="decision"]', 'Quyết định hai (sửa)');
  await page.fill('#log-edit-form [name="date"]', '2020-01-01');
  await page.click('#log-edit-form .dd-btn');
  await page.click(`.dd-pop [role="option"][data-value="${logStep.id}"]`);
  await page.click('#log-edit-form button[type="submit"]');
  check('nhật ký: sửa được (cả bước), xếp lại theo ngày', (await cur(page)).log.some((l) => l.decision === 'Quyết định hai (sửa)' && l.date === '2020-01-01' && l.stepId === logStep.id)
    && /sửa/.test(await page.$$eval('.log-item .log-decision', (bs) => bs.at(-1).textContent)) && /2020/.test(await page.$$eval('.log-month', (hs) => hs.at(-1).textContent)));

  // Mẹo cho người mới: tắt được, nhớ qua lần tải lại.
  check('mẹo người mới hiện lúc đầu', await page.isVisible('#hint'));
  await page.click('#hint-off');
  check('tắt mẹo: ẩn ngay', !(await page.isVisible('#hint')));

  // Chế độ Gọn: ẩn "Xong khi" và ghi chú trên thẻ và cột bước, giữ số, tên, chip, nhãn tài liệu; nhớ qua lần tải lại.
  const shown = (sel) => page.$$eval(sel, (els) => els.filter((e) => e.offsetParent !== null).length);
  const full = [await shown('.card-done'), await shown('.step-done'), await shown('.step-notes')];
  await page.click('#compact-btn');
  check('Gọn: ẩn Xong khi và ghi chú, còn số, tên, chip, nhãn tài liệu', full.every((n) => n > 0)
    && (await shown('.card-done, .card-notes, .step-done, .step-notes')) === 0 && (await page.getAttribute('#compact-btn', 'aria-pressed')) === 'true'
    && (await shown('.card .num')) > 0 && (await shown('.card-title')) > 0 && (await shown('.card .chip')) > 0 && (await shown('.doc-tag')) > 0, full.join());
  // Nút "Nhật ký (N)": đúng số, bấm thì cuộn tới khung nhật ký và focus vào đó.
  const nLogNow = (await cur(page)).log.length;
  check('nút Nhật ký có số mục', (await page.textContent('#log-btn')).trim() === `Log (${nLogNow})`);
  await page.click('#log-btn');
  check('nút Nhật ký: cuộn tới nhật ký, focus ở đó', await page.evaluate(() => document.activeElement?.id === 'log'
    && document.getElementById('log').getBoundingClientRect().top < innerHeight / 2 && document.getElementById('log').getBoundingClientRect().top >= 0));

  // Tải lại: còn nguyên, mở đúng dự án.
  const beforeReload = await cur(page);
  await page.reload();
  await page.waitForSelector('#app:not([hidden]) .step');
  check('tắt mẹo: vẫn ẩn sau khi tải lại', !(await page.isVisible('#hint')));
  check('tải lại: đánh số lại theo thứ tự hiện tại, không còn chấm, Renumber ẩn', !(await page.isVisible('#renumber-btn')) && !(await page.$('.num.fresh, .step-num.fresh')));
  check('Gọn: vẫn bật sau khi tải lại', (await page.getAttribute('#compact-btn', 'aria-pressed')) === 'true' && (await shown('.card-done')) === 0);
  await page.click('#compact-btn');
  check('tắt Gọn: Xong khi hiện lại', (await page.getAttribute('#compact-btn', 'aria-pressed')) === 'false' && (await shown('.card-done')) > 0);
  const afterReload = await cur(page);
  check('tải lại: giữ dữ liệu và dự án đang mở', JSON.stringify(beforeReload) === JSON.stringify(afterReload)
    && /CRISP-DM/.test(await page.textContent('#ws-name')));

  // Xuất Markdown: tải file + chép; nhập lại → dự án mới cùng cấu trúc.
  await page.click('#export-btn');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#export-download')]);
  const md = fs.readFileSync(await dl.path(), 'utf8');
  check('xuất Markdown: tải file .md', /\.md$/.test(dl.suggestedFilename()) && md.startsWith('# Dự án Data Science (CRISP-DM)'));
  check('Markdown có dấu trạng thái, hạn, không người làm', /- \[x\] /.test(md) && /- \[!\] .* · due 2026-12-01/.test(md) && !/`@|Người:/.test(md) && /## Decision log/.test(md));
  check('Markdown có tài liệu: nhãn, link, rào văn bản', /\nDocs:\n {2}- \[Data card\]\(https:\/\/example\.com\/card\)\n {2}- Ghi chép EDA\n {4}`{5}markdown\n/.test(md)
    && / {2}Docs:\n {4}- \[Repo\]\(https:\/\/git\.example\/repo\)/.test(md));
  check('Markdown giữ dòng "Quay lại:" của bước cần làm lại', /\nReopened: \d{4}-\d\d-\d\d · iteration 3 · EDA lộ cột thiếu\n/.test(md));
  await page.click('#export-copy');
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check('chép Markdown vào clipboard', clip === md);
  await page.click('#dlg-export [data-close]');
  const nBefore = (await stored(page)).workspaces.length;
  const nDocs = afterReload.steps.reduce((n, x) => n + x.docs.length + x.subs.reduce((k, y) => k + y.docs.length, 0), 0);
  const want = `Markdown: 1 project · ${afterReload.steps.length} steps · ${afterReload.steps.reduce((n, x) => n + x.subs.length, 0)} sub-steps · ${afterReload.log.length} decisions · ${nDocs} docs`;
  await page.click('#import-btn');
  await page.fill('#import-text', md);
  check('nhập: xem trước có số đếm', (await page.textContent('#import-preview')) === want,
    await page.textContent('#import-preview'));
  await page.click('#import-go');
  let s = await stored(page);
  const imported = s.workspaces.find((w) => w.id === s.lastId);
  const a = await shape(page, afterReload), b = await shape(page, imported);
  check('Markdown đi rồi về: dự án mới, cùng cấu trúc', s.workspaces.length === nBefore + 1 && imported.id !== afterReload.id
    && imported.name === afterReload.name + ' (imported)'
    && JSON.stringify({ ...a, name: '' }) === JSON.stringify({ ...b, name: '' }));

  // JSON một dự án qua file; sao lưu tất cả qua dán.
  await page.click('#export-btn');
  await page.check('input[name="export-kind"][value="json"]');
  const [dlj] = await Promise.all([page.waitForEvent('download'), page.click('#export-download')]);
  const jsonPath = await dlj.path();
  await page.click('#dlg-export [data-close]');
  await page.click('#import-btn');
  await page.setInputFiles('#import-file', { name: 'p.json', mimeType: 'application/json', buffer: fs.readFileSync(jsonPath) });
  await page.waitForFunction(() => /JSON \(one project\)/.test(document.getElementById('import-preview').textContent));
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
  // Dán bằng một lần đặt value + sự kiện input: fill() gõ từng khối, chậm với ~100 KB khi máy bận.
  await page.$eval('#import-text', (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, backup);
  await page.click('#import-go');
  check('nhập sao lưu: thêm đủ dự án, không ghi đè', (await stored(page)).workspaces.length === nb * 2);
  await page.click('#import-btn');
  await page.fill('#import-text', '{"x":1}');
  check('nhập chữ lạ: báo lỗi, nút tắt', /Cannot read/.test(await page.textContent('#import-preview')) && await page.isDisabled('#import-go'));
  await page.click('#dlg-import [data-close]');
  await page.click('#ask-ok'); // chữ đã dán: hỏi "Discard changes?"

  // Đổi tên, nhân bản, xoá dự án.
  await page.click('#ws-btn');
  await page.click('.ws-item:first-child [data-act="ws-rename"]');
  await page.fill('#ask-input', 'Tên mới');
  await page.click('#ask-ok');
  await waitTo(page, 'bộ nhớ ghi tên dự án mới', () => JSON.parse(localStorage.getItem('stepPlanner.v2')).workspaces[0].name === 'Tên mới');
  check('đổi tên dự án', (await stored(page)).workspaces[0].name === 'Tên mới');
  const nw = (await stored(page)).workspaces.length;
  await page.click('.ws-item:first-child [data-act="ws-dup"]');
  check('nhân bản dự án', (await stored(page)).workspaces.length === nw + 1);
  await page.click('.ws-item:nth-child(2) [data-act="ws-del"]');
  await page.click('#ask-ok');
  await waitTo(page, 'bộ nhớ ghi dự án nhân bản', (n) => JSON.parse(localStorage.getItem('stepPlanner.v2')).workspaces.length === n, nw);
  check('xoá dự án sau khi hỏi lại', (await stored(page)).workspaces.length === nw);
  await page.click('#dlg-ws [data-close]');

  // Hộp sửa: Esc / Huỷ khi đã gõ chữ thì hỏi lại; không âm thầm bỏ chữ.
  await page.click('#ws-btn');
  await page.click('.ws-item:first-child [data-act="ws-open"]');
  const firstSub = (await cur(page)).steps[0].subs[0];
  await page.click(subSel(firstSub.id, 'edit-sub'));
  check('hộp sửa: focus ở ô tên', await page.evaluate(() => document.activeElement.name === 'title'));
  await page.setViewportSize({ width: 1280, height: 560 });
  const stk = await stickyHead(page, '#dlg-sub');
  check('hộp dài: chỉ thân cuộn, đầu và chân đứng yên, trang sau không cuộn', sticky(stk), JSON.stringify(stk));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.fill('#sub-form [name="notes"]', 'chữ đang gõ');
  await page.keyboard.press('Escape');
  check('Esc khi có chữ chưa lưu: hỏi lại', await page.isVisible('#dlg-ask') && await page.isVisible('#dlg-sub'));
  await page.click('#dlg-ask [data-close]');
  check('chọn ở lại: chữ còn nguyên', await page.isVisible('#dlg-sub') && (await page.inputValue('#sub-form [name="notes"]')) === 'chữ đang gõ');
  await page.click('#dlg-sub .dlg-foot [data-close]');
  await page.click('#ask-ok');
  await page.waitForTimeout(100);
  check('chọn bỏ: hộp đóng, không lưu', !(await page.isVisible('#dlg-sub')) && (await cur(page)).steps[0].subs[0].notes === firstSub.notes);
  await page.click(subSel(firstSub.id, 'edit-sub'));
  await page.keyboard.press('Escape');
  check('Esc khi chưa sửa gì: đóng ngay', !(await page.isVisible('#dlg-sub')) && !(await page.isVisible('#dlg-ask')));
  // "Nhân bản" trong hộp khi chữ đã sửa: hỏi lại như Đóng, không lặng lẽ bỏ chữ đang gõ.
  const nSub0 = (await cur(page)).steps[0].subs.length;
  await page.click(subSel(firstSub.id, 'edit-sub'));
  await page.fill('#sub-form [name="notes"]', 'chữ chưa lưu');
  await page.click('#sub-dup');
  check('Nhân bản khi chữ chưa lưu: hỏi lại, chưa nhân bản', await page.isVisible('#dlg-ask') && await page.isVisible('#dlg-sub')
    && (await cur(page)).steps[0].subs.length === nSub0);
  await page.click('#ask-form [data-close]');
  check('chọn ở lại: chữ còn, chưa nhân bản', (await page.inputValue('#sub-form [name="notes"]')) === 'chữ chưa lưu'
    && (await cur(page)).steps[0].subs.length === nSub0);
  await page.click('#sub-dup');
  await page.click('#ask-ok');
  await waitTo(page, 'bộ nhớ ghi bản nhân bản', (n) => { const d = JSON.parse(localStorage.getItem('stepPlanner.v2')); return d.workspaces.find((w) => w.id === d.lastId).steps[0].subs.length === n + 1; }, nSub0);
  check('chọn bỏ: nhân bản bản đã lưu', (await cur(page)).steps[0].subs.length === nSub0 + 1
    && (await cur(page)).steps[0].subs[1].notes === firstSub.notes);
  await page.click(subSel((await cur(page)).steps[0].subs[1].id, 'sub-del'));

  // Thêm bước con khi đang tìm: thẻ mới khớp thì hiện; bị lọc ẩn thì báo, focus không rơi về body.
  await page.click('.step:first-child .step-head [data-act="add-sub"]');
  await page.fill('#sub-form [name="title"]', 'Việc của A');
  await page.click('#sub-form button[type="submit"]');
  await page.fill('#q', 'việc của a');
  check('đang tìm: thẻ khớp hiện', /Việc của A/.test(await page.textContent('#board')));
  await page.click('.step:first-child .step-head [data-act="add-sub"]');
  await page.fill('#sub-form [name="title"]', 'Không khớp tìm');
  await page.click('#sub-form button[type="submit"]');
  check('thêm mà bộ lọc ẩn: báo, focus không về body', /hidden by the filter/.test(await page.textContent('#toast-text'))
    && await page.evaluate(() => document.activeElement !== document.body));
  await page.fill('#q', '');

  // Nhập Markdown cũ có người làm (dòng Người:, `@X`, @X): chạy được, bỏ thông tin người, tên thẻ không còn rác.
  await page.click('#import-btn');
  await page.fill('#import-text', '# Cũ\n\n> Data Science Step Planner · định dạng 1\n>\n> Người: `@An` · `@Bình`\n\n## 1. Một\n\n'
    + '- [x] Việc cũ · `@An` · hạn 2026-01-02\n- [ ] Viết tay @Bình hạn 03/01/2026\n');
  check('nhập file cũ có người: xem trước không cảnh báo', /^Markdown: 1 project · 1 step · 2 sub-steps · 0 decisions$/.test(await page.textContent('#import-preview')),
    await page.textContent('#import-preview'));
  await page.click('#import-go');
  const oldMd = await cur(page);
  check('nhập file cũ có người: bỏ người, tên sạch', oldMd.steps[0].subs.map((x) => x.title).join('|') === 'Việc cũ|Viết tay'
    && oldMd.steps[0].subs.every((x) => !('owner' in x)) && !('people' in oldMd)
    && !/@/.test(await page.textContent('#board')), JSON.stringify(oldMd.steps[0].subs));
  await page.click('#ws-btn');
  await page.click(`[data-ws="${oldMd.id}"] [data-act="ws-del"]`);
  await page.click('#ask-ok');
  await page.waitForTimeout(100);
  await page.click('.ws-item:first-child [data-act="ws-open"]');

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
  check('JSON sai khuôn: liệt kê cảnh báo', /skipped 1 step, 1 sub-step/.test(await page.textContent('#import-preview')));
  await page.fill('#import-text', '[1,2]');
  check('JSON không có dự án: nút nhập tắt', await page.isDisabled('#import-go'));
  await page.click('#dlg-import [data-close]');
  await page.click('#ask-ok'); // chữ đã dán: hỏi "Discard changes?"

  // Nhắc sao lưu: thay đổi cũ hơn 3 ngày.
  await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('stepPlanner.v2'));
    st.dirtySince = new Date(Date.now() - 5 * 86400000).toISOString();
    st.lastBackup = '';
    localStorage.setItem('stepPlanner.v2', JSON.stringify(st));
  });
  await page.reload();
  await page.waitForSelector('#app:not([hidden])');
  check('nhắc sao lưu: "Chưa sao lưu lần nào"', await page.isVisible('#backup-nudge') && /Never backed up/.test(await page.textContent('#backup-nudge')));
  const [bdl] = await Promise.all([page.waitForEvent('download'), page.click('#backup-nudge')]);
  check('bấm nhắc: tải bản sao lưu, nhắc tắt', /backup.*\.json$/.test(bdl.suggestedFilename()) && !(await page.isVisible('#backup-nudge'))
    && !!(await stored(page)).lastBackup);

  // Theme: nút thắng hệ điều hành và được nhớ.
  await page.click('#theme-btn');
  const t1 = await page.evaluate(() => [document.documentElement.dataset.theme, localStorage.getItem('hub-theme')]);
  check('nút theme đặt và nhớ lựa chọn', t1[0] === t1[1] && !!t1[0]);
  await ctx.close();
  });

  /* ── Hai tab cùng dữ liệu ── */
  await section('Hai tab cùng dữ liệu', async () => { // thân giữ thụt lề cũ cho dễ gộp
  const tc = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await tc.addInitScript(countStorage);
  const A = await tc.newPage();
  A.on('pageerror', (e) => errors.push('A ' + e));
  await A.goto(BASE);
  await A.click('#start .tpl[data-tpl="crisp-dm"]');
  await A.click('#ws-btn');
  await A.click('#ws-tab-new');
  await A.check('#ws-new-templates input[value="stats-report"]');
  await A.click('#ws-new button[type="submit"]');
  const [w1, w2] = (await stored(A)).workspaces;
  const B = await tc.newPage();
  B.on('pageerror', (e) => errors.push('B ' + e));
  await B.goto(BASE);
  await B.waitForSelector('.step');
  await B.click('#ws-btn');
  await B.click(`[data-ws="${w1.id}"] [data-act="ws-open"]`);
  await synced(A, () => B.click('.card[data-sub] >> nth=0 >> [data-act="status"]'));
  check('hai tab: tab kia đổi dự án và sửa, tab này vẫn ở dự án của nó', (await A.textContent('#ws-name')) === w2.name
    && (await B.textContent('#ws-name')) === w1.name);
  const w2sub = w2.steps[0].subs[0];
  await A.click(subSel(w2sub.id, 'sub-del'));
  await synced(A, () => B.click('.card[data-sub] >> nth=1 >> [data-act="status"]'));
  await A.click('#toast-undo');
  const aStore = (await stored(A)).workspaces;
  check('hai tab: hoàn tác sau khi tab kia ghi vẫn trả bước con về', aStore.find((w) => w.id === w2.id).steps[0].subs[0].id === w2sub.id
    && aStore.find((w) => w.id === w1.id).steps[0].subs[1].status === 'doing'
    && (await A.$$(`.card[data-sub="${w2sub.id}"]`)).length === 1);
  const w2step = w2.steps[1];
  await A.click(`.step[data-step="${w2step.id}"] [data-act="del-step"]`);
  await A.click('#ask-ok');
  await synced(A, () => B.click('.card[data-sub] >> nth=2 >> [data-act="status"]'));
  await A.click('#toast-undo');
  check('hai tab: hoàn tác xoá bước sau khi tab kia ghi', (await stored(A)).workspaces.find((w) => w.id === w2.id).steps[1].id === w2step.id
    && !/was deleted/.test(await A.textContent('#toast-text')));
  await B.close();
  await A.click(subSel(w2sub.id, 'sub-del'));
  await A.click('#ws-btn');
  await A.click(`[data-ws="${w2.id}"] [data-act="ws-del"]`);
  await A.click('#ask-ok');
  check('xoá dự án: toast Hoàn tác của nó biến mất', await A.locator('#toast').waitFor({ state: 'hidden', timeout: 2000 }).then(() => true, () => false));
  await A.keyboard.press('Escape');
  const sA = await stored(A);
  check('xoá dự án: tab mở dự án còn lại, lastId hợp lệ', sA.workspaces.some((w) => w.id === sA.lastId) && (await A.textContent('#ws-name')) === w1.name);
  await tc.close();
  });

  /* ── Bắt đầu kéo khi có mũi tên bàn giao (ô trước thẻ, dải trên bước), cả khi giảm chuyển động: bóng giữ đúng điểm nắm,
   * ô viền đứt ở hàng của con trỏ (dải trên chính bước nguồn thu lại cũng vậy), Esc trả về đúng chỗ; mũi tên thu lại có trượt
   * (FLIP) khi không giảm chuyển động ── */
  for (const motion of ['reduce', 'no-preference']) {
    const filler = [1, 2, 3].map((k) => ({ id: 'f' + k, title: 'Filler ' + k, subs: [{ id: 'fs' + k, title: 'Task ' + k }] }));
    const seed = { id: 'wg', name: 'Gap', steps: [...filler,
      { id: 'r1', title: 'Producer', subs: [{ id: 'gA', title: 'Make table', outs: [{ id: 'oA', name: 'table' }] }, { id: 'gB', title: 'Use table', ins: ['oA'] },
        { id: 'gC', title: 'Third' }] },
      { id: 'r2', title: 'Consumer', ins: ['oA'], subs: [{ id: 'gD', title: 'Report' }, { id: 'gE', title: 'Review' }] },
      ...[4, 5].map((k) => ({ id: 'f' + k, title: 'Filler ' + k, subs: [{ id: 'fs' + k, title: 'Task ' + k }] }))], log: [] };
    const gc = await browser.newContext({ viewport: { width: 1280, height: 700 }, deviceScaleFactor: 1, reducedMotion: motion });
    await gc.addInitScript((d) => { if (!localStorage.getItem('stepPlanner.v2')) localStorage.setItem('stepPlanner.v2', JSON.stringify({ version: 2, workspaces: [d], lastId: d.id })); }, seed);
    const gp = await gc.newPage();
    gp.on('pageerror', (e) => errors.push(String(e)));
    await gp.goto(BASE);
    await gp.waitForSelector('.card[data-sub="gB"]');
    const tag = `kéo khi có mũi tên (${motion})`;
    const arrows = await gp.evaluate(() => [!!document.querySelector('.step[data-step="r1"] .hand-gap'), !!document.querySelector('.step[data-step="r2"] .hand-row')]);
    /* Đưa `sel` về y = 420 trong khung nhìn (trang còn chỗ cuộn lên), nhấn ở `grab`, trôi một chút; đo; Esc; đo lại. */
    const run = async (sel, handle, grab) => {
      await gp.evaluate((s) => window.scrollBy(0, document.querySelector(s).getBoundingClientRect().top - 420), sel);
      await gp.waitForTimeout(50);
      const r = await gp.locator(sel).boundingBox(), hb = await gp.locator(handle).boundingBox();
      const px = hb.x + grab(hb).x, py = hb.y + grab(hb).y;
      await gp.mouse.move(px, py); await gp.mouse.down();
      await gp.mouse.move(px + 8, py + 6, { steps: 2 });
      await gp.waitForFunction(() => document.body.classList.contains('dragging-any'));
      await gp.waitForTimeout(30);
      const m = await gp.evaluate(() => {
        const g = /** @type {HTMLElement} */ (document.querySelector('.drag-ghost')), ph = document.querySelector('.drop-ph, .step-ph');
        const [tx, ty] = (g.style.translate || '').split(' ').map(parseFloat);
        return { tx, ty, ph: ph && ph.getBoundingClientRect().top, slid: document.querySelector('.card[data-sub="gC"]').getAnimations().length };
      });
      await gp.keyboard.press('Escape'); await gp.mouse.up();
      await gp.waitForFunction(() => !document.body.classList.contains('dragging-any'));
      await gp.waitForTimeout(motion === 'reduce' ? 30 : 300);
      const back = (await gp.locator(sel).boundingBox()).y;
      return { off: [px + 8 - m.tx - (px - r.x), py + 6 - m.ty - (py - r.y)].map((v) => Math.round(v * 10) / 10), ph: m.ph - r.y, back: back - r.y, slid: m.slid };
    };
    const card = await run('.card[data-sub="gB"]', '.card[data-sub="gB"]', () => ({ x: 20, y: 20 }));
    const step = await run('.step[data-step="r2"] .step-head', '.step[data-step="r2"] .step-grip', (b) => ({ x: b.width / 2, y: b.height / 2 }));
    const near = (v, d) => Math.abs(v) <= d;
    check(`${tag}: thẻ sau ô mũi tên — bóng giữ điểm nắm, ô viền đứt cùng hàng, Esc về chỗ cũ`, arrows[0] && near(card.off[0], 1) && near(card.off[1], 1)
      && near(card.ph, 2) && near(card.back, 1), JSON.stringify(card));
    check(`${tag}: bước dưới dải mũi tên — bóng giữ điểm nắm, chỗ thả ở hàng con trỏ, Esc về chỗ cũ`, arrows[1] && near(step.off[0], 1) && near(step.off[1], 1)
      && near(step.ph, 12) && near(step.back, 1), JSON.stringify(step));
    if (motion === 'reduce') check(`${tag}: mũi tên thu lại không trượt`, card.slid === 0, String(card.slid));
    else check(`${tag}: mũi tên thu lại thì thẻ sau nó trượt khít vào (FLIP)`, card.slid > 0, String(card.slid));
    await gc.close();
  }

  /* ── 320px: chip bước tên dài trong nhật ký không làm trang cuộn ngang ── */
  {
    const n = await open(320, 700);
    await n.page.click('#start .tpl[data-tpl="big-data-ds"]');
    await n.page.click('#log-compose-open');
    await n.page.fill('#log-decision', 'Quyết định thử');
    const long = await n.page.evaluate(() => {
      const s = /** @type {HTMLSelectElement} */ (document.getElementById('log-step'));
      const o = [...s.options].filter((x) => x.value).sort((a, b) => b.text.length - a.text.length)[0];
      s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true }));
      /** @type {HTMLFormElement} */ (document.getElementById('log-form')).requestSubmit();
      return o.text;
    });
    await n.page.waitForSelector('.log-item .log-step');
    const chip = await n.page.$eval('.log-item .log-step', (e) => { const r = e.getBoundingClientRect(), m = e.parentElement.getBoundingClientRect(); return { r: r.right, mr: m.right, vw: innerWidth }; });
    const ov = await hOverflow(n.page);
    check('320px: nhật ký có chip bước tên dài, chip nằm trong hàng, trang không cuộn ngang', ov <= 0 && chip.r <= chip.mr + 0.5 && long.length > 40,
      `${ov} ${JSON.stringify(chip)} ${long}`);
    await n.ctx.close();
  }

  /* ── Điện thoại 390px ── */
  await section('Điện thoại 390px', async () => { // thân giữ thụt lề cũ cho dễ gộp
  const m = await open(390, 844, { isMobile: true, hasTouch: true });
  await m.page.waitForSelector('#start:not([hidden]) .tpl');
  const startM = await m.page.$$eval('#start-templates > section', (ss) => ss.map((sc) => {
    const h = sc.querySelector('h3').getBoundingClientRect(), b = [...sc.querySelectorAll('.tpl')].map((x) => x.getBoundingClientRect());
    return { h: h.height > 0, one: b.every((r) => Math.abs(r.left - b[0].left) < 1 && Math.abs(r.width - b[0].width) < 1),
      inside: b.every((r) => r.left >= 16 - 1 && r.right <= innerWidth - 16 + 1) };
  }));
  check('390px màn đầu: hai phần mẫu, mỗi phần một cột trong lề 16px, không tràn ngang', startM.length === 2 && startM.every((x) => x.h && x.one && x.inside)
    && (await hOverflow(m.page)) === 0, JSON.stringify(startM));
  await m.page.click('#start .tpl[data-tpl="it5425-sports"]');
  await m.page.waitForSelector('.step');
  const mob = await m.page.evaluate(() => {
    const row = document.querySelector('.step');
    const head = row.querySelector('.step-head').getBoundingClientRect();
    const sc = row.querySelector('.cards-scroll');
    const card = row.querySelector('.card[data-sub]');
    return { stacked: head.bottom <= sc.getBoundingClientRect().top + 1, scrolls: sc.scrollWidth > sc.clientWidth, left: row.getBoundingClientRect().left,
      whole: sc.clientHeight >= card.offsetHeight };
  });
  // Chạm: giữ thẻ rồi kéo (pointer events kiểu touch); vuốt nhanh thì là cuộn, không kéo.
  const touch = await m.page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const ev = (type, x, y, target = document) => target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7,
      pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
    const cards = [...document.querySelectorAll('.step:first-child .card[data-sub]')];
    const [a, b] = cards;
    const ids = cards.map((c) => c.dataset.sub);
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    ev('pointerdown', rb.left + 20, rb.top + 20, b);
    ev('pointermove', rb.left + 60, rb.top + 24);
    await wait(500);
    const swipe = document.body.classList.contains('dragging-any');
    ev('pointerup', rb.left + 60, rb.top + 24);
    ev('pointerdown', rb.left + 20, rb.top + 20, b);
    await wait(500);
    const started = document.body.classList.contains('dragging-any');
    ev('pointermove', ra.left + 10, ra.top + 30);
    await frame();
    const ph = !!document.querySelector('.cards > .slot:first-child .drop-ph');
    ev('pointerup', ra.left + 10, ra.top + 30);
    return { swipe, started, ph, ids };
  });
  await m.page.waitForFunction(() => !document.querySelector('.drag-ghost'), null, { timeout: 3000 }).catch(() => {});
  await m.page.waitForTimeout(60);
  const tIds = (await cur(m.page)).steps[0].subs.map((x) => x.id);
  check('chạm: vuốt nhanh không kéo; giữ rồi kéo thì có ô viền đứt, thả là dời', !touch.swipe && touch.started && touch.ph
    && tIds[0] === touch.ids[1] && tIds[1] === touch.ids[0], JSON.stringify(touch));
  await m.page.keyboard.press('Control+z');
  await m.page.click('.step:first-child [data-act="add-doc"]');
  await m.page.check('#doc-form input[name="kind"][value="md"]', { force: true });
  await m.page.fill('#doc-form [name="title"]', 'Ghi chép');
  await m.page.click('#doc-save');
  await m.page.fill('#md-form [name="body"]', '# Tiêu đề\n\n' + 'dòng dài '.repeat(60) + '\n\n| a | b | c | d | e | f |\n|---|---|---|---|---|---|\n| ' + 'x'.repeat(80) + ' | 2 | 3 | 4 | 5 | 6 |');
  const mdWrap = await m.page.evaluate(() => { const ta = document.querySelector('#md-form .md-ta'), hl = document.getElementById('md-hl');
    return [ta.scrollHeight, ta.clientHeight, hl.offsetHeight, hl.children[2].getBoundingClientRect().height / parseFloat(getComputedStyle(hl).lineHeight)]; });
  check('390px Edit: dòng dài xuống hàng ở bản tô y như ô chữ (cùng cao), vẫn một số dòng', mdWrap[0] === mdWrap[1] && Math.abs(mdWrap[1] - mdWrap[2]) < 1 && mdWrap[3] > 3, mdWrap.join(','));
  await m.page.click('#dlg-md .tab[data-mode="view"]');
  const mdM = await m.page.evaluate(() => { const r = document.getElementById('dlg-md').getBoundingClientRect(); return [r.left, r.top, r.width, r.height, innerWidth, innerHeight]; });
  check('390px: hộp văn bản toàn màn, không tràn', mdM[0] === 0 && mdM[1] === 0 && mdM[2] === mdM[4] && Math.abs(mdM[3] - mdM[5]) < 2
    && (await hOverflow(m.page)) === 0, mdM.join(','));
  await m.page.click('#md-form button[type="submit"]');
  await m.page.click('.step:first-child .slot:first-child > .card [data-act="edit-sub"]');
  await m.page.click('#sub-docs [data-doc-add]');
  await m.page.fill('#doc-form [name="url"]', 'https://example.com/x');
  await m.page.click('#doc-save');
  await m.page.click('#sub-form button[type="submit"]');
  await m.page.click('#log-compose-open');
  await m.page.fill('#log-decision', 'Chọn mùa giải 2023/24');
  await m.page.fill('#log-why', 'Đủ dữ liệu\n' + 'lý do dài '.repeat(40));
  await m.page.click('#log-form .f-step .dd-btn');
  await m.page.click('.dd-pop [role="option"]:nth-child(2)');
  await m.page.click('#log-form button[type="submit"]');
  check('390px: nhật ký có chip bước, nút xoá hiện sẵn (cảm ứng)', !!(await m.page.$('.log-item .log-step'))
    && await m.page.$eval('.log-item [data-act="del-log"]', (b) => getComputedStyle(b.parentElement).opacity === '1' && b.offsetParent !== null));
  check('390px: không tràn ngang trang', (await hOverflow(m.page)) === 0, String(await hOverflow(m.page)));
  check('390px: tên bước nằm trên hàng bước con, hàng cuộn ngang bên trong', mob.stacked && mob.scrolls && mob.whole);
  check('390px: lề trang 16px (vạch chia của bước)', Math.round(mob.left) === 16, String(mob.left));
  // Danh sách trạng thái mở trên chip của hàng thẻ đang cuộn: cuộn tới (hàng vừa vuốt còn trôi, hay trình duyệt cuộn chip vào tầm
  // nhìn khi bấm) không đóng nó, nó đi theo chip; chip khuất hẳn thì đóng.
  const follow = await m.page.evaluate(async () => {
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const sc = document.querySelector('.step .cards-scroll');
    sc.scrollIntoView({ block: 'center' });
    const chip = sc.querySelectorAll('.card[data-sub] [data-act="status"]')[1];
    sc.scrollLeft = chip.getBoundingClientRect().right - sc.getBoundingClientRect().right + 20;
    await frame();
    chip.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true }));
    sc.scrollLeft += 60;
    await frame();
    const pop = document.querySelector('.dd-pop');
    const gap = pop && Math.round(pop.getBoundingClientRect().top - chip.getBoundingClientRect().bottom);
    sc.scrollLeft = 0;
    await frame();
    return { open: !!pop, gap, closed: !document.querySelector('.dd-pop') };
  });
  check('390px: danh sách trạng thái không đóng khi hàng thẻ cuộn, đi theo chip; chip khuất thì đóng', follow.open && follow.gap >= 0 && follow.gap <= 8
    && follow.closed, JSON.stringify(follow));
  const brand = await m.page.evaluate(() => {
    const t = document.querySelector('.brand-txt');
    return { text: t.textContent, fits: t.scrollWidth <= t.clientWidth && t.getBoundingClientRect().right <= document.getElementById('theme-btn').getBoundingClientRect().left,
      ellipsis: getComputedStyle(t).textOverflow };
  });
  check('390px: thanh trên ghi tên đầy đủ, không cắt "…"', brand.text === 'vudat081299 / Data Science Step Planner' && brand.fits
    && brand.ellipsis !== 'ellipsis', JSON.stringify(brand));
  const small = await m.page.evaluate(() => {
    const bad = [];
    const els = document.querySelectorAll('.step:first-child .slot:first-child > .card button:not([data-act="edit-sub"]),'
      + ' .step:first-child .step-head button, .tools button, #theme-btn, #hint-off, #ws-btn, .ws-notes summary, .step:first-child .doc-tag,'
      + ' .step:first-child .step-notes summary, #log-compose-open, .log-item button:not([data-act="edit-log"])');
    for (const el of els) {
      if (el.offsetParent === null) continue;
      el.scrollIntoView({ block: 'center', inline: 'center' });
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const at = (x, y) => { const t = document.elementFromPoint(x, y); return !!t && (t === el || el.contains(t)); };
      const tall = r.height >= 44 || (at(cx, cy - 21.5) && at(cx, cy + 21.5));
      const wide = r.width >= 44 || (at(cx - 21.5, cy) && at(cx + 21.5, cy));
      if (!tall || !wide) bad.push(`${el.dataset.act || el.id || el.className || el.parentElement.className + ' > ' + el.tagName} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    window.scrollTo(0, 0);
    return bad;
  });
  check('390px: vùng bấm ≥ 44px (chip, nút thẻ, nút bước, công cụ)', small.length === 0, small.join(', '));
  const topH = await m.page.evaluate(() => [document.querySelector('.top-name').getBoundingClientRect().height,
    document.querySelector('.ws-name').getBoundingClientRect().height]);
  check('390px: tên dự án một dòng, cắt bớt', topH[1] < 40 && topH[0] < 70, topH.join(','));
  const chevs = await m.page.$$eval('.ws-notes summary, .step-notes summary', (ss) => ss.map((x) => `${getComputedStyle(x).display}:${x.querySelectorAll('svg.i use[href="#i-chev"]').length}`));
  check('ghi chú dự án và ghi chú bước: cùng biểu tượng chevron, không dấu tam giác của trình duyệt', chevs.every((x) => /^(inline-)?flex:1$/.test(x)), [...new Set(chevs)].join(','));
  { // Mẫu it5425-sports: mỗi bước có ghi chú gập, mỗi ghi chú có ít nhất một link nguồn (https).
    const nSteps = (await cur(m.page)).steps.length;
    const notes = await m.page.$$eval('.step-notes', (ns) => ns.map((n) => [n.tagName, [...n.querySelectorAll('a')].filter((x) => x.href.startsWith('https://')).length]));
    check('mẫu it5425-sports: ghi chú bước gập, mỗi bước có link nguồn', nSteps > 0 && notes.length === nSteps
      && notes.every(([tag, n]) => tag === 'DETAILS' && n > 0), JSON.stringify(notes));
  }
  for (const d of ['#dlg-sub', '#dlg-export']) {
    if (d === '#dlg-sub') await m.page.click('.step:nth-child(1) [data-act="edit-sub"]');
    else await m.page.click('#export-btn');
    check(`390px: ${d} không tràn`, (await hOverflow(m.page)) === 0
      && (await m.page.$eval(d, (el) => el.getBoundingClientRect().right <= innerWidth)));
    const sheet = await m.page.$eval(d, (el) => {
      el.getAnimations().forEach((x) => x.finish());
      const foot = el.querySelector('.dlg-foot').getBoundingClientRect();
      const body = el.querySelector('.dlg-body');
      const a = document.activeElement;
      return { bottom: Math.round(el.getBoundingClientRect().bottom), footBottom: Math.round(foot.bottom), vh: innerHeight,
        typing: a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && a.type === 'text'), scrolls: body.scrollHeight > body.clientHeight };
    });
    check(`390px: ${d} là tấm đáy, chân hộp dính đáy, không tự focus ô chữ`, sheet.bottom === sheet.vh && sheet.vh - sheet.footBottom <= 1 && !sheet.typing, JSON.stringify(sheet));
    if (d === '#dlg-sub') { const st = await stickyHead(m.page, d); check('390px: tấm đáy dài, chỉ thân cuộn, đầu và chân đứng yên', sticky(st), JSON.stringify(st)); }
    await m.page.keyboard.press('Escape');
  }
  // Tấm đáy thấp, thân cuộn: phần tử con của thân không bị co lại (chữ "Nothing to import yet." từng đè lên viền ô).
  await m.page.setViewportSize({ width: 390, height: 664 });
  // Hộp dùng lại cho thẻ khác: thân về đầu, không mở ra ở chỗ cuộn của lần trước (cảm ứng không focus ô đầu để kéo về).
  await m.page.click('.step:nth-child(1) [data-act="edit-sub"]');
  const dsc0 = await m.page.$eval('#dlg-sub .dlg-body', (b) => { b.scrollTop = 9999; return b.scrollTop; });
  await m.page.keyboard.press('Escape');
  await m.page.click('.step:nth-child(2) [data-act="edit-sub"]');
  const dsc1 = await m.page.$eval('#dlg-sub .dlg-body', (b) => b.scrollTop);
  check('390px: mở lại hộp sửa cho thẻ khác thì thân ở đầu', dsc0 > 0 && dsc1 === 0, `${dsc0} → ${dsc1}`);
  await m.page.keyboard.press('Escape');
  await m.page.click('#import-btn');
  const squeezed = await m.page.$eval('#dlg-import', (dl) => [...dl.querySelectorAll('.dlg-body > :not([hidden])')]
    .filter((el) => el.tagName !== 'TEXTAREA' && el.scrollHeight > el.clientHeight + 1).map((el) => `${el.className || el.tagName} ${el.clientHeight}<${el.scrollHeight}`));
  check('390px: hộp Import, phần tử trong thân không bị co lại', squeezed.length === 0, squeezed.join(', '));
  await m.page.keyboard.press('Escape');
  await m.ctx.close();
  });

  /* ── Vẽ lại theo hàng: một thay đổi chỉ dựng lại hàng đổi; hàng khác giữ nguyên nút DOM (thẻ đã "Show more" vẫn mở),
   * "Next", chú giải, tiến độ vẫn đúng dù đổi sang bước khác; Hoàn tác, Compact, tìm không làm hỏng điều ấy ── */
  await section('Vẽ lại theo hàng', async () => { // thân giữ thụt lề cũ cho dễ gộp
  const longN = Array.from({ length: 40 }, (_, i) => 'dòng ' + i).join('\n');
  const part = { version: 2, lastId: 'wp', workspaces: [{ id: 'wp', name: 'Theo hàng', log: [], steps: [
    { id: 'p1', title: 'Một', subs: [{ id: 'a1', title: 'A1', status: 'doing' }, { id: 'a2', title: 'A2', status: 'done' }] },
    { id: 'p2', title: 'Hai', subs: [{ id: 'b1', title: 'B1', status: 'done' }, { id: 'b2', title: 'B2', status: 'skip', notes: longN }] },
    { id: 'p3', title: 'Ba', subs: [{ id: 'c1', title: 'C1', status: 'todo' }, { id: 'c2', title: 'C2', status: 'todo' }] }] }] };
  const pc = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await pc.addInitScript((d) => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('stepPlanner.v2', d); } }, JSON.stringify(part));
  const pp = await pc.newPage();
  pp.on('pageerror', (e) => errors.push('theo hàng: ' + e));
  await pp.goto(BASE);
  await pp.waitForSelector('#app:not([hidden]) .card[data-sub]');
  await pp.click('.card[data-sub="b2"] .more');
  const mark = () => pp.evaluate(() => { for (const r of document.querySelectorAll('.step')) r.__keep = r.dataset.step; });
  const rowState = () => pp.evaluate(() => ({
    same: [...document.querySelectorAll('.step')].filter((r) => r.__keep === r.dataset.step).map((r) => r.dataset.step).join(','),
    open: document.querySelector('.card[data-sub="b2"]')?.classList.contains('open') && document.querySelector('.card[data-sub="b2"] .more')?.textContent === 'Show less',
    next: [...document.querySelectorAll('.card.next')].map((c) => c.dataset.sub).join(','),
    legend: [...document.querySelectorAll('#legend li')].map((li) => li.textContent).join(','),
    overall: document.querySelector('#overall-text').textContent,
    chip: document.querySelector('.card[data-sub="a1"] .chip')?.textContent,
  }));
  await mark();
  await pp.click('.card[data-sub="a1"] [data-act="status"]');
  const pr1 = await rowState();
  check('vẽ theo hàng: bấm chip ở bước 1 chỉ dựng lại hàng đổi, hàng 2 giữ nút và thẻ đã mở', pr1.same === 'p2' && pr1.open && pr1.chip === 'Done', JSON.stringify(pr1));
  check('vẽ theo hàng: "Next" sang bước 3, chú giải và tiến độ đúng', pr1.next === 'c1' && pr1.legend === 'New2,In progress0,Pending0,Blocked0,Done3,Skipped1,Cancelled0'
    && pr1.overall === '3/5 done · 60%', JSON.stringify(pr1));
  check('vẽ theo hàng: bộ nhớ đã ghi', (await stored(pp)).workspaces[0].steps[0].subs[0].status === 'done');
  await mark();
  await pp.click('.card[data-sub="c1"] [data-act="sub-del"]');
  await pp.click('#toast-undo');
  const pr2 = await rowState();
  check('vẽ theo hàng: xoá rồi hoàn tác ở bước 3, hàng 1 và 2 giữ nguyên, "Next" về c1', pr2.same === 'p1,p2' && pr2.open && pr2.next === 'c1'
    && (await pp.$$('.step[data-step="p3"] .card[data-sub]')).length === 2, JSON.stringify(pr2));
  await pp.fill('#q', 'dòng 3');
  await mark();
  await pp.fill('#q', 'dòng 39');
  const pr3 = await rowState();
  check('vẽ theo hàng: tìm thêm chữ mà kết quả không đổi thì không dựng lại', pr3.same === 'p2' && (await pp.$$('.card[data-sub]')).length === 1, JSON.stringify(pr3));
  await pp.fill('#q', '');
  await mark();
  await pp.click('#compact-btn');
  await pp.click('#compact-btn');
  const pr4 = await rowState();
  check('vẽ theo hàng: Compact bật / tắt không dựng lại hàng, thẻ dài vẫn cắt, có "Show more"', pr4.same === 'p1,p2,p3'
    && await pp.$eval('.card[data-sub="b2"]', (c) => c.classList.contains('cut') && !!c.querySelector('.more')), JSON.stringify(pr4));
  // Thẻ cao hơn (token đổi) mà phần đầu ghi chú không tràn đủ xa: dựng đủ, không cắt.
  await pp.addStyleTag({ content: ':root { --card-max: 4000px; --lines-text: 999; }' });
  await setSt(pp, 'b1', 'todo');
  const tall = await pp.$eval('.card[data-sub="b2"]', (c) => [c.classList.contains('cut'), !!c.querySelector('.card-notes[data-clip]'), c.querySelector('.card-notes').textContent.split('\n').length]);
  check('thẻ đủ chỗ: ghi chú dựng đủ, không cắt', !tall[0] && !tall[1] && tall[2] === 40, String(tall));
  await pc.close();
  });

  /* ── Chữ dài trên bảng: tên, lý do, Done when, ghi chú dừng ở --lines-* dòng, mờ dần khi tràn; "Show more" chỉ khi bị cắt ── */
  await section('Chữ dài trên bảng', async () => {
    const lines = (n, first = '') => Array.from({ length: n }, (_, i) => (i === 0 && first) || 'dòng ghi chú số ' + i).join('\n');
    const longT = 'Tên rất dài '.repeat(30).trim();
    const data = { version: 2, lastId: 'wl', workspaces: [{ id: 'wl', name: 'Chữ dài', log: [], steps: [
      { id: 'l1', title: longT, goal: 'Mục tiêu dài '.repeat(30).trim(), notes: lines(30, 'Xem https://example.com/step-top') + '\nhttps://example.com/step-hidden', subs: [
        { id: 'c1', title: 'Ngắn', status: 'todo', notes: 'một dòng' },
        { id: 'c2', title: 'Ghi chú dài', status: 'todo', notes: lines(9, 'Mở https://example.com/top') + '\nhttps://example.com/hidden' },
        { id: 'c3', title: longT, status: 'blocked', reason: lines(10), doneWhen: 'Xong khi '.repeat(40).trim(), notes: lines(20) },
        { id: 'c4', title: 'Link vắt qua chỗ cắt', status: 'todo', notes: 'Mở https://example.com/' + 'vat'.repeat(150) }] },
      { id: 'l2', title: 'Bước ngắn', goal: 'Một dòng', notes: 'ngắn', round: 2, revisit: { reason: 'Lý do mở lại dài '.repeat(60).trim(), date: '2026-01-02', round: 2 },
        subs: [{ id: 'd1', title: 'D1', status: 'done' }] }] }] };
    const lc = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await lc.addInitScript((d) => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('stepPlanner.v2', d); } }, JSON.stringify(data));
    await lc.route('https://example.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/plain', body: 'ok' }));
    const lp = await lc.newPage();
    lp.on('pageerror', (e) => errors.push('chữ dài: ' + e));
    await lp.goto(BASE);
    await lp.waitForSelector('#app:not([hidden]) .card[data-sub]');
    await lp.evaluate(() => document.fonts.ready);
    /** Trạng thái một khối chữ: cao, số dòng tối đa theo token, bị cắt / mờ, nút "Show more" của thẻ hay đầu bước. */
    const st = (sel) => lp.$eval(sel, (el) => {
      const cs = getComputedStyle(el), box = el.closest('.card, .step-head'), more = box?.querySelector(':scope > .more');
      const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      return { h: el.getBoundingClientRect().height, rows: (el.getBoundingClientRect().height - pad) / parseFloat(cs.lineHeight), clip: el.classList.contains('clip'),
        mask: cs.maskImage !== 'none', over: el.scrollHeight > el.clientHeight + 1, more: more?.textContent ?? null, expanded: more?.getAttribute('aria-expanded') ?? null,
        tab: more ? more.tabIndex : null, open: !!box?.classList.contains('open'), lines: getComputedStyle(el).getPropertyValue('--lines').trim() };
    });
    const tok = (name) => lp.evaluate((n) => +getComputedStyle(document.documentElement).getPropertyValue(n), name);
    const [lt, ltitle, lnotes] = [await tok('--lines-text'), await tok('--lines-title'), await tok('--lines-notes')];
    const c1 = await st('.card[data-sub="c1"] .card-notes');
    check('chữ dài: ghi chú ngắn không cắt, không mờ, không "Show more"', !c1.clip && !c1.mask && c1.more === null, JSON.stringify(c1));
    const c2 = await st('.card[data-sub="c2"] .card-notes');
    check(`chữ dài: ghi chú 10 dòng dừng ở ${lt} dòng, mờ ở đáy, thẻ có "Show more" (ngoài vòng Tab)`, Math.abs(c2.rows - lt) < 0.1 && c2.clip && c2.mask
      && c2.more === 'Show more' && c2.expanded === 'false' && c2.tab === -1, JSON.stringify(c2));
    const links = () => lp.$$eval('.card[data-sub="c2"] .card-notes a', (as) => as.map((a) => [a.textContent, a.tabIndex]));
    const l0 = await links();
    check('chữ dài: link phần còn thấy vẫn trong vòng Tab, link phần bị che ra khỏi vòng Tab', JSON.stringify(l0)
      === JSON.stringify([['https://example.com/top', 0], ['https://example.com/hidden', -1]]), JSON.stringify(l0));
    /* Link vắt qua chỗ cắt (thấy nửa trên): cũng ra khỏi vòng Tab, vòng focus không bị cắt. */
    const cross = await lp.$eval('.card[data-sub="c4"] .card-notes', (p) => {
      const a = p.querySelector('a'), r = a.getBoundingClientRect();
      const bottom = p.getBoundingClientRect().top + p.clientHeight - parseFloat(getComputedStyle(p).paddingBottom);
      return { crosses: r.top < bottom - 1 && r.bottom > bottom + 1, tab: a.tabIndex };
    });
    check('chữ dài: link vắt qua chỗ cắt (lấp một phần) ra khỏi vòng Tab', cross.crosses && cross.tab === -1, JSON.stringify(cross));
    const [pop] = await Promise.all([lc.waitForEvent('page'), lp.click('.card[data-sub="c2"] .card-notes a')]);
    await pop.waitForLoadState();
    check('chữ dài: bấm link trong ghi chú bị cắt mở tab mới, không mở hộp sửa', pop.url() === 'https://example.com/top' && !(await lp.isVisible('#dlg-sub')), pop.url());
    await pop.close();
    await lp.click('.card[data-sub="c2"] .more');
    const c2o = await st('.card[data-sub="c2"] .card-notes');
    const l1 = await links();
    check('chữ dài: "Show more" mở hết ghi chú, bỏ mờ, link khuất vào lại vòng Tab', c2o.open && !c2o.over && !c2o.mask && c2o.rows > 9.5
      && c2o.more === 'Show less' && c2o.expanded === 'true' && l1.every((x) => x[1] === 0), JSON.stringify([c2o, l1]));
    // Vẽ lại hàng (đổi trạng thái thẻ khác cùng hàng): thẻ đã mở vẫn mở.
    await lp.click('.card[data-sub="c1"] [data-act="status"]');
    const c2k = await st('.card[data-sub="c2"] .card-notes');
    check('chữ dài: vẽ lại hàng giữ thẻ đã mở', c2k.open && c2k.more === 'Show less' && !c2k.mask, JSON.stringify(c2k));
    await lp.click('.card[data-sub="c2"] .more');
    const c2c = await st('.card[data-sub="c2"] .card-notes');
    check('chữ dài: "Show less" cắt lại, link khuất ra lại khỏi vòng Tab', !c2c.open && c2c.clip && Math.abs(c2c.rows - lt) < 0.1 && c2c.more === 'Show more'
      && JSON.stringify(await links()) === JSON.stringify(l0), JSON.stringify(c2c));
    // Thẻ dài đủ thứ: mỗi khối dừng ở số dòng của nó, thẻ vẫn dừng ở --card-max (thân mờ ở đáy).
    const c3 = await lp.$eval('.card[data-sub="c3"]', (c) => ({ h: c.getBoundingClientRect().height, max: parseFloat(getComputedStyle(c).maxHeight),
      body: c.querySelector('.card-body').classList.contains('clip'), clips: [...c.querySelectorAll('.clamp')].map((e) => e.classList.contains('clip')).join() }));
    const c3t = await st('.card[data-sub="c3"] .card-title .clamp');
    check(`chữ dài: thẻ dài mọi trường — tên dừng ở ${ltitle} dòng, lý do, Done when, ghi chú cắt, thẻ dừng ở --card-max`, c3.clips === 'true,true,true,true'
      && Math.abs(c3t.rows - ltitle) < 0.1 && Math.abs(c3.h - c3.max) < 1 && c3.body, JSON.stringify([c3, c3t]));
    // Đầu bước: tên, mục tiêu dài thì cắt; nút "Show more" trong vòng Tab, Enter mở / đóng; ghi chú mở ra mới đo.
    const h0 = await st('.step[data-step="l1"] .step-title .clamp');
    const g0 = await st('.step[data-step="l1"] .step-goal');
    const hid = await lp.$eval('.step[data-step="l1"] .step-head', (hd) => [hd.id, hd.querySelector(':scope > .more')?.getAttribute('aria-controls'),
      hd.querySelector(':scope > .more')?.previousElementSibling.className]);
    check(`chữ dài: đầu bước — tên dừng ở ${ltitle} dòng, mục tiêu ở ${lt} dòng, "Show more" ngay dưới khối cắt cuối, trong vòng Tab, aria-controls`,
      h0.clip && Math.abs(h0.rows - ltitle) < 0.1 && g0.clip && Math.abs(g0.rows - lt) < 0.1 && h0.more === 'Show more' && h0.tab === 0
      && hid[1] === hid[0] && /step-goal/.test(hid[2]), JSON.stringify([h0, g0, hid]));
    check('chữ dài: bước chữ ngắn không có "Show more"', !(await lp.$('.step[data-step="l2"] .step-head > .more')), '');
    const band = await st('.step[data-step="l2"] .revisit-band .badge .clamp');
    check(`chữ dài: lý do mở lại dài dừng ở ${lt} dòng, mờ, không nút (bấm là mở hộp sửa)`, band.clip && band.mask && Math.abs(band.rows - lt) < 0.1
      && !(await lp.$('.revisit-band .more')), JSON.stringify(band));
    await lp.click('.step[data-step="l1"] .step-notes summary');
    // Sự kiện toggle của <details> đến sau lần bấm (một lượt việc sau): chờ đo xong.
    await waitTo(lp, 'đo ghi chú bước vừa mở', () => document.querySelector('.step[data-step="l1"] .notes-text.clip'));
    const n0 = await st('.step[data-step="l1"] .notes-text');
    const nAt = await lp.$eval('.step[data-step="l1"] .step-head > .more', (b) => b.previousElementSibling.className);
    const nl = await lp.$$eval('.step[data-step="l1"] .notes-text a', (as) => as.map((a) => a.tabIndex).join());
    check(`chữ dài: mở ghi chú bước — dừng ở ${lnotes} dòng, mờ, "Show more" dời xuống dưới ghi chú, link khuất ngoài vòng Tab`, n0.clip && Math.abs(n0.rows - lnotes) < 0.1
      && n0.mask && nAt === 'step-notes' && nl === '0,-1', JSON.stringify([n0, nAt, nl]));
    await lp.focus('.step[data-step="l1"] .step-head > .more');
    await lp.keyboard.press('Enter');
    const h1 = await st('.step[data-step="l1"] .notes-text');
    const focused = await lp.evaluate(() => document.activeElement?.classList.contains('more'));
    check('chữ dài: Enter trên "Show more" của bước mở hết tên, mục tiêu, ghi chú; focus giữ ở nút', h1.open && !h1.over && !h1.mask && h1.expanded === 'true'
      && h1.more === 'Show less' && focused && !(await st('.step[data-step="l1"] .step-title .clamp')).over, JSON.stringify(h1));
    await lp.keyboard.press('Enter');
    const h2 = await st('.step[data-step="l1"] .notes-text');
    check('chữ dài: Enter lần nữa cắt lại', !h2.open && h2.clip && h2.expanded === 'false', JSON.stringify(h2));
    // 320px: không tràn ngang, đầu bước vẫn cắt. Đổi cỡ phải đo lại thật: một luật chỉ áp ở màn hẹp làm mục tiêu ngắn của l2 tràn
    // (không có sự kiện nào khác ngoài resize), về màn rộng thì hết tràn.
    await lp.addStyleTag({ content: '@media (max-width: 400px) { .step[data-step="l2"] .step-goal { max-width: 2ch; word-break: break-all; } }' });
    const l2cut0 = await lp.$eval('.step[data-step="l2"] .step-goal', (el) => el.classList.contains('clip'));
    await lp.setViewportSize({ width: 320, height: 700 });
    const l2cut1 = await waitTo(lp, 'đo lại khi đổi cỡ (khối mới tràn)', () => document.querySelector('.step[data-step="l2"] .step-goal.clip'));
    await waitTo(lp, 'đo lại khi đổi cỡ', () => document.querySelector('.step[data-step="l1"] .step-title .clamp.clip'));
    const w320 = await st('.step[data-step="l1"] .step-title .clamp');
    check('chữ dài: 320px không tràn ngang, tên bước vẫn dừng ở số dòng của nó', (await hOverflow(lp)) <= 0 && Math.abs(w320.rows - ltitle) < 0.1 && w320.clip,
      `${await hOverflow(lp)} ${JSON.stringify(w320)}`);
    await lp.setViewportSize({ width: 1280, height: 900 });
    const l2cut2 = await waitTo(lp, 'đo lại khi đổi cỡ (khối hết tràn)', () => !document.querySelector('.step[data-step="l2"] .step-goal.clip'));
    check('chữ dài: đổi cỡ cửa sổ đo lại — khối vừa tràn thì cắt, hết tràn thì bỏ cắt', !l2cut0 && l2cut1 && l2cut2, JSON.stringify({ l2cut0, l2cut1, l2cut2 }));
    await lc.close();
  });

  /* ── Bộ nhớ bị chặn ── */
  await section('Bộ nhớ bị chặn', async () => { // thân giữ thụt lề cũ cho dễ gộp
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
  check('bộ nhớ bị chặn: banner, vẫn dùng được', /blocks storage/.test(await bp.textContent('#banner')) && await bp.isVisible('#banner')
    && (await bp.$$('.step')).length === (await bp.evaluate(async () => (await (await fetch('data/templates.json')).json()).templates.find((t) => t.id === 'crisp-dm').steps.length))
    && !bErr.length, bErr.join(' | '));
  await blocked.close();
  });

  /* ── Bố cục bước: bước đang mở lại có tài liệu, bước đã đóng vòng, bước chưa có bước con xong ── */
  await section('Bố cục bước', async () => { // thân giữ thụt lề cũ cho dễ gộp
  const lay = { version: 2, lastId: 'wl', workspaces: [{ id: 'wl', name: 'Bố cục', steps: [
    { id: 'tl1', title: 'Đang mở lại', round: 2, revisit: { reason: 'Thiếu cột', date: '2026-11-20', round: 2 },
      docs: [{ id: 'dl1', kind: 'link', title: 'Từ điển dữ liệu', url: 'https://a.example' }], outs: [{ id: 'ol1', name: 'cot.csv' }],
      subs: [{ id: 'sl1', title: 'Một', status: 'done' }, { id: 'sl2', title: 'Hai', status: 'todo', redo: true }] },
    { id: 'tl2', title: 'Đã đóng vòng', round: 3, ins: ['ol1'], subs: [{ id: 'sl3', title: 'Ba', status: 'done' }, { id: 'sl4', title: 'Bốn', status: 'todo' }] },
    { id: 'tl3', title: 'Chưa xong gì', subs: [{ id: 'sl5', title: 'Năm', status: 'doing' }, { id: 'sl6', title: 'Sáu', status: 'todo', par: true }] }],
  log: [{ id: 'll1', date: '2026-11-10', decision: 'Reopened: Đã đóng vòng (iteration 2)', why: 'a', stepId: 'tl2' },
    { id: 'll2', date: '2026-11-18', decision: 'Reopened: Đã đóng vòng (iteration 3)', why: 'b', stepId: 'tl2' }] }] };
  for (const [w, hgt] of [[1440, 900], [1280, 800], [768, 1024], [390, 844]]) {
    const lc = await browser.newContext({ viewport: { width: w, height: hgt }, hasTouch: w < 500, isMobile: w < 500 });
    await lc.addInitScript((d) => { if (!localStorage.getItem('stepPlanner.v2')) localStorage.setItem('stepPlanner.v2', d); }, JSON.stringify(lay));
    const lp = await lc.newPage();
    lp.on('pageerror', (e) => errors.push(String(e)));
    await lp.goto(BASE);
    await lp.waitForSelector('#app:not([hidden]) .card[data-sub]');
    const foot = await lp.evaluate(() => {
      const f = document.querySelector('.site-foot'); const app = document.getElementById('app').getBoundingClientRect();
      const a = [...f.querySelectorAll('a')];
      return { below: f.getBoundingClientRect().top >= app.bottom, shown: f.offsetHeight > 0, kb: document.querySelector('.foot-kb').offsetHeight > 0,
        home: a.some((x) => x.getAttribute('href') === '../'), ext: a.filter((x) => x.target === '_blank').every((x) => /noopener/.test(x.rel) && x.href.startsWith('https://')) };
    });
    check(`chân trang ${w}px: dưới bảng, có link trang chủ, link ngoài noopener; cột phím tắt ${w < 500 ? 'ẩn ở cảm ứng' : 'hiện'}`,
      foot.shown && foot.below && foot.home && foot.ext && foot.kb === !(w < 500), JSON.stringify(foot));
    const inset = await lp.evaluate(() => {
      const s = document.querySelector('.step[data-step="tl1"]'); const r = s.getBoundingClientRect();
      const kids = [...s.children].filter((c) => getComputedStyle(c).position !== 'absolute' && c.offsetWidth);
      const board = document.getElementById('board').getBoundingClientRect();
      return { full: Math.abs(r.left - board.left) < 1 && Math.abs(r.width - board.width) < 1, line: getComputedStyle(s).borderTopWidth !== '0px',
        pad: Math.round(Math.min(...kids.map((c) => c.getBoundingClientRect().left)) - r.left) };
    });
    check(`hàng bước ${w}px: vạch chia rộng hết bảng, mọi nội dung lùi vào trong (nền tô "vừa dời" thừa một khoảng bên trái)`,
      inset.full && inset.line && inset.pad > 0, JSON.stringify(inset));
    const ord = await lp.evaluate(() => {
      const row = document.querySelector('.step[data-step="tl1"]');
      const r = (s) => row.querySelector(s).getBoundingClientRect();
      const r2 = (s) => document.querySelector('.step[data-step="tl2"] > ' + s).getBoundingClientRect();
      return { head: r('.step-head'), band: r('.revisit-band'), docs: r('.step-docs'), cards: r('.cards-scroll'), mark2: r2('.hand-row'), head2: r2('.step-head'),
        dom: [...row.children].map((c) => c.className.split(' ')[0]).join(' '),
        order: [...document.querySelectorAll('.step > *')].filter((c) => getComputedStyle(c).order !== '0').length };
    });
    // DOM (vòng Tab): đầu bước trước băng, tài liệu, thẻ. Một cột theo DOM: tên bước trên cùng. Màn rộng: băng, tài liệu thành
    // dòng ngang trên cùng, rồi cột tên cạnh hàng thẻ, đặt bằng dòng lưới (không CSS order). Mũi tên bàn giao luôn trên đầu bước.
    const box = (v) => [Math.round(v.left), Math.round(v.top), Math.round(v.right), Math.round(v.bottom)];
    check(`${w}px: bước đọc liền một khối (${w < 500 ? 'đầu bước, băng, tài liệu, thẻ' : 'băng, tài liệu, rồi cột tên và hàng thẻ'}), DOM đầu bước trước, không CSS order`,
      ord.dom === 'gap-add step-head revisit-band step-docs cards-scroll' && ord.order === 0 && ord.mark2.bottom <= ord.head2.top + 1
      && (w < 500
        ? ord.head.bottom <= ord.band.top + 1 && ord.band.bottom <= ord.docs.top + 1 && ord.docs.bottom <= ord.cards.top + 1
        : ord.band.bottom <= ord.docs.top + 1 && ord.docs.bottom <= Math.min(ord.head.top, ord.cards.top) + 1 && ord.head.right <= ord.cards.left
          && Math.abs(ord.band.width - ord.docs.width) < 1 && ord.band.width >= ord.head.width + ord.cards.width),
    JSON.stringify({ dom: ord.dom, order: ord.order, ...Object.fromEntries(['head', 'band', 'docs', 'cards', 'mark2', 'head2'].map((k) => [k, box(ord[k])])) }));
    // Vòng Tab thật (phím Tab) đi qua các khối theo thứ tự mắt đọc ở mọi khổ: một cột là thứ tự DOM; màn rộng `reading-flow`
    // theo dòng lưới (băng, tài liệu ở dòng trên đầu bước).
    await lp.evaluate(() => {
      const row = document.querySelector('.step[data-step="tl1"]');
      const tabbable = [...document.querySelectorAll('a[href], button, summary, input, select, textarea, [tabindex]')]
        .filter((e) => e.tabIndex >= 0 && e.getClientRects().length && !row.contains(e) && (e.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING));
      tabbable.at(-1).focus();
    });
    const tabSeq = [];
    for (let k = 0; k < 40; k++) {
      await lp.keyboard.press('Tab');
      const blk = await lp.evaluate(() => {
        const a = document.activeElement;
        if (!a?.closest('.step[data-step="tl1"]')) return null;
        return ['.revisit-band', '.step-docs', '.step-head', '.cards-scroll'].find((b) => a.closest(b)) || '?';
      });
      if (!blk) { if (tabSeq.length) break; continue; }
      if (tabSeq.at(-1) !== blk) tabSeq.push(blk);
    }
    check(`${w}px: vòng Tab trong một bước theo thứ tự đọc`, tabSeq.join(' ') === (w < 500
      ? '.step-head .revisit-band .step-docs .cards-scroll' : '.revisit-band .step-docs .step-head .cards-scroll'), tabSeq.join(' '));
    // Hàng nút của đầu bước (Sub-step, Reopen, Doc, xoá) nằm một dòng; nút phụ chỉ biểu tượng, có aria-label và title.
    const acts = await lp.$eval('.step[data-step="tl2"] .step-head .acts', (a) => {
      const bs = [...a.children];
      return { acts: bs.map((b) => b.dataset.act).join(), rows: new Set(bs.map((b) => Math.round(b.getBoundingClientRect().top))).size,
        named: bs.filter((b) => b.classList.contains('icon-btn')).every((b) => b.getAttribute('aria-label') && b.title && !b.textContent.trim()),
        fits: bs.every((b) => b.getBoundingClientRect().right <= a.getBoundingClientRect().right + 0.5) };
    });
    check(`${w}px: nút của đầu bước một dòng, nút phụ chỉ biểu tượng có tên`, acts.acts === 'add-sub,revisit,add-doc,del-step' && acts.rows === 1
      && acts.named && acts.fits, JSON.stringify(acts));
    // Thanh trên dính có nền đặc ở cả hai theme: nút xanh cuộn dưới nó không loang thành quầng.
    const bars = [];
    for (const scheme of ['light', 'dark']) {
      await lp.emulateMedia({ colorScheme: scheme });
      bars.push(await lp.evaluate(() => {
        window.scrollTo(0, document.getElementById('export-btn').getBoundingClientRect().top + scrollY - 20);
        const cs = getComputedStyle(document.querySelector('.bar'));
        const solid = !/rgba\(.*,\s*0?\.\d+\)$|transparent/.test(cs.backgroundColor) && cs.backgroundColor === getComputedStyle(document.body).backgroundColor;
        const fx = (cs.backdropFilter || 'none') + (cs.webkitBackdropFilter || 'none');
        window.scrollTo(0, 0);
        return { bg: cs.backgroundColor, solid, fx };
      }));
    }
    await lp.emulateMedia({ colorScheme: 'light' });
    check(`${w}px: thanh trên dính có nền đặc, không làm mờ nội dung dưới (sáng, tối)`, bars.every((b) => b.solid && b.fx === 'nonenone')
      && bars[0].bg !== bars[1].bg, JSON.stringify(bars));
    // Vòng đã đóng: nhãn "Iteration N" ở đầu bước, chú thích số lần mở lại và ngày mở lại cuối; bước đang mở lại (có băng),
    // bước chưa mở lại thì không có nhãn.
    const iter = await lp.evaluate(() => [...document.querySelectorAll('.step[data-step]')].map((r) => {
      const t = r.querySelector('.step-head .step-iter');
      return t ? `${r.dataset.step}:${t.textContent}:${t.title}` : `${r.dataset.step}:-`;
    }));
    check(`${w}px: vòng đã đóng có nhãn "Iteration N" (chú thích lần mở lại, ngày cuối), không lặp băng`, iter[0] === 'tl1:-' && iter[2] === 'tl3:-'
      && /^tl2:Iteration 3:Reopened 2 times.* · last reopened 18 Nov 2026$/.test(iter[1]), iter.join(' | '));
    // Gọn: thẻ co theo nội dung (thấp hơn hẳn), hàng sát hơn; ô song song không chồng lên nhau; nút thẻ không giữ chỗ.
    const sizes = () => lp.evaluate(() => {
      const hs = [...document.querySelectorAll('.card[data-sub]')].map((c) => c.getBoundingClientRect());
      const par = [...document.querySelectorAll('.slot.par .card[data-sub]')].map((c) => c.getBoundingClientRect());
      return { card: Math.max(...hs.map((r) => r.height)), row: document.querySelector('.step[data-step="tl3"]').getBoundingClientRect().height,
        stacked: par.length === 2 && par[1].top >= par[0].bottom, s5: document.querySelector('.card[data-sub="sl5"]').getBoundingClientRect().height };
    });
    const full = await sizes();
    await lp.click('#compact-btn');
    const comp = await sizes();
    await lp.hover('.card[data-sub="sl5"] .card-title');
    await lp.waitForTimeout(250);
    const hov = await lp.$eval('.card[data-sub="sl5"]', (c) => {
      const a = c.querySelector('.acts'), r = c.getBoundingClientRect(), ra = a.getBoundingClientRect();
      return { h: r.height, shown: a.offsetParent !== null && getComputedStyle(a).opacity === '1', inside: ra.bottom <= r.bottom && ra.right <= r.right };
    });
    check(`${w}px: Gọn: thẻ thấp hẳn, hàng sát hơn, ô song song không chồng; nút thẻ ${w < 500 ? 'ẩn (cảm ứng)' : 'nổi trong thẻ khi rê, không đổi cao'}`,
      comp.card <= full.card * 0.8 && comp.row < full.row && comp.stacked
      && (w < 500 ? !hov.shown : hov.shown && hov.inside && Math.abs(hov.h - comp.s5) < 1), JSON.stringify({ full, comp, hov }));
    await lc.close();
  }
  });

  /* ── Nền chung của ô song song: hàng cuộn ngang cắt cả chiều dọc, nên nền (tràn ra quanh thẻ) phải nằm trọn trong vùng
   * cắt của hàng — trên, dưới, trái khi là cột đầu, phải khi là cột cuối — lúc chưa cuộn và lúc cuộn tới cuối; thẻ vẫn
   * thẳng cột với hàng không có ô song song (đầu hàng, cuối hàng), trang không cuộn ngang. ── */
  await section('Nền chung của ô song song', async () => { // thân giữ thụt lề cũ cho dễ gộp
  const pS = (id, x = {}) => ({ id, title: id.toUpperCase(), status: 'todo', ...x });
  const parSeed = { version: 2, lastId: 'wq', workspaces: [{ id: 'wq', name: 'Song song', steps: [
    { id: 'tq1', title: 'Ô song song ở đầu và cuối', subs: [pS('q1'), pS('q2', { par: true }), pS('q3', { outs: [{ id: 'oq', name: 'bang.csv' }] }),
      pS('q4', { ins: ['oq'] }), pS('q5'), pS('q6'), pS('q7'), pS('q8', { par: true })] },
    { id: 'tq2', title: 'Không song song', subs: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'].map((id) => pS(id)) },
    { id: 'tq3', title: 'Ô song song ở giữa', subs: [pS('u1'), pS('u2'), pS('u3', { par: true })] }], log: [] }] };
  for (const [w, hgt] of [[1280, 1200], [390, 1400]]) {
    const qc = await browser.newContext({ viewport: { width: w, height: hgt }, hasTouch: w < 500, isMobile: w < 500 });
    await qc.addInitScript((d) => { if (!localStorage.getItem('stepPlanner.v2')) localStorage.setItem('stepPlanner.v2', d); }, JSON.stringify(parSeed));
    const qp = await qc.newPage();
    qp.on('pageerror', (e) => errors.push(String(e)));
    await qp.goto(BASE);
    await qp.waitForSelector('#app:not([hidden]) .card[data-sub]');
    for (const dens of ['thường', 'Gọn']) {
      if (dens === 'Gọn') await qp.click('#compact-btn');
      for (const pos of ['chưa cuộn', 'cuộn tới cuối']) {
        const q = await qp.evaluate((end) => {
          document.querySelectorAll('.cards-scroll').forEach((sc) => { sc.scrollLeft = end ? sc.scrollWidth : 0; });
          const out = [];
          for (const sl of document.querySelectorAll('.cards > .slot.par')) {
            const sc = sl.closest('.cards-scroll'), r = sc.getBoundingClientRect(), s = sl.getBoundingClientRect();
            const l = r.left + sc.clientLeft, t = r.top + sc.clientTop, rr = l + sc.clientWidth, b = t + sc.clientHeight;
            if (s.right <= l || s.left >= rr) continue; // ô đã cuộn khuất
            const slots = [...sl.parentElement.querySelectorAll(':scope > .slot')];
            const e = { top: s.top - t, bottom: b - s.bottom };
            if (slots[0] === sl && sc.scrollLeft < 1) e.left = s.left - l;
            if (slots.at(-1) === sl && sc.scrollLeft + sc.clientWidth >= sc.scrollWidth - 1) e.right = rr - s.right;
            out.push(`${sl.querySelector('.card').dataset.sub}:${Object.entries(e).map(([k, v]) => k + '=' + v.toFixed(1)).join(',')}`);
          }
          const R = (id) => document.querySelector(`.card[data-sub="${id}"]`).getBoundingClientRect();
          const T = (id) => document.querySelector(`.step[data-step="${id}"]`).getBoundingClientRect().top;
          const align = end ? [R('q8').right, R('r7').right] : [R('q1').left, R('r1').left];
          return { out, inside: out.every((x) => x.split(':')[1].split(',').every((kv) => +kv.split('=')[1] >= -0.5)),
            edge: out.some((x) => end ? /^q7:.*right=/.test(x) : /^q1:.*left=/.test(x)),
            align: align.map((v) => +v.toFixed(1)), top: [R('q1').top - T('tq1'), R('r1').top - T('tq2')].map((v) => +v.toFixed(1)),
            gap: !!document.querySelector('.step[data-step="tq1"] .hand-gap'),
            over: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        }, pos !== 'chưa cuộn');
        check(`${w}px, ${dens}, ${pos}: nền ô song song không bị hàng cuộn cắt mép; thẻ thẳng cột với hàng không song song`,
          q.inside && q.edge && Math.abs(q.align[0] - q.align[1]) < 0.5 && Math.abs(q.top[0] - q.top[1]) < 0.5 && q.gap && q.over <= 0,
          JSON.stringify(q));
      }
    }
    await qc.close();
  }
  });

  /* ── Hàng đầu thẻ chật (số, "Tiếp theo", nhãn kẹp, chip dài): không chữ nào bị bẻ dòng, không tràn thẻ ── */
  await section('Hàng đầu thẻ chật', async () => { // thân giữ thụt lề cũ cho dễ gộp
  const crowd = { version: 2, lastId: 'wc', workspaces: [{ id: 'wc', name: 'Chật', steps: [{ id: 'tc', title: 'B', subs: [
    { id: 'sc1', title: 'Một', status: 'doing', docs: [{ id: 'dc1', kind: 'link', title: 'L', url: 'https://a.example' }] },
    { id: 'sc2', title: 'Hai', status: 'blocked', docs: [{ id: 'dc2', kind: 'md', title: 'M', body: 'x' }] }] }], log: [] }] };
  for (const [w, hgt] of [[1280, 900], [390, 844]]) {
    const cc = await browser.newContext({ viewport: { width: w, height: hgt }, hasTouch: w < 500 });
    await cc.addInitScript((d) => { if (!localStorage.getItem('stepPlanner.v2')) localStorage.setItem('stepPlanner.v2', d); }, JSON.stringify(crowd));
    const cp = await cc.newPage();
    await cp.goto(BASE);
    await cp.waitForSelector('#app:not([hidden]) .card[data-sub]');
    const bad = await cp.evaluate(() => [...document.querySelectorAll('.card[data-sub] .card-top > *')].filter((el) => {
      const lh = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.2;
      const card = el.closest('.card').getBoundingClientRect(), r = el.getBoundingClientRect();
      const textLines = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => { const rg = document.createRange(); rg.selectNodeContents(n); return rg.getClientRects().length; });
      return textLines.some((k) => k > 1) || r.right > card.right + 0.5 || r.left < card.left - 0.5 || r.height > Math.max(lh * 1.6, 48);
    }).map((el) => `${el.className} "${el.textContent.trim()}"`));
    check(`${w}px: hàng đầu thẻ chật không bẻ chữ, không tràn thẻ`, bad.length === 0, bad.join(', '));
    await cc.close();
  }
  });

  /* ── Vạch chia "Add step": nút của vạch đầu bảng thẳng hàng với nút của vạch sau (cùng tâm ngang, cùng độ lệch so với
   * giữa viền trên của bước, cùng cỡ), ở máy rộng hai theme, Compact, và màn cảm ứng 320px ── */
  await section('Vạch chia thêm bước', async () => {
  const gws = { version: 2, lastId: 'wg', workspaces: [{ id: 'wg', name: 'Vạch', steps: [
    { id: 'tg1', title: 'Một', subs: [{ id: 'sg1', title: 'a', status: 'todo' }] },
    { id: 'tg2', title: 'Hai', subs: [{ id: 'sg2', title: 'b', status: 'todo' }] }], log: [] }] };
  for (const [w, touch, scheme, compact] of [[1280, false, 'light', false], [1280, false, 'dark', true], [320, true, 'light', false]]) {
    const gc = await browser.newContext({ viewport: { width: w, height: 800 }, hasTouch: touch, isMobile: touch, colorScheme: scheme });
    await gc.addInitScript(([d, c]) => {
      if (!localStorage.getItem('stepPlanner.v2')) { localStorage.setItem('stepPlanner.v2', d); localStorage.setItem('stepPlanner.compact', c ? '1' : '0'); }
    }, [JSON.stringify(gws), compact]);
    const gp = await gc.newPage();
    gp.on('pageerror', (e) => errors.push(String(e)));
    await gp.goto(BASE);
    await gp.waitForSelector('#app:not([hidden]) .card[data-sub]');
    const m = await gp.evaluate(() => [...document.querySelectorAll('#board > .step')].slice(0, 2).map((s) => {
      const b = s.querySelector(':scope > .gap-add .gap-add-btn').getBoundingClientRect(), g = s.querySelector(':scope > .gap-add').getBoundingClientRect();
      const line = s.getBoundingClientRect().top + parseFloat(getComputedStyle(s).borderTopWidth) / 2;
      return { cx: b.left + b.width / 2, dx: b.left + b.width / 2 - (g.left + g.width / 2), dy: b.top + b.height / 2 - line, w: b.width, h: b.height };
    }));
    const compactOn = await gp.$eval('#board', (bd) => bd.classList.contains('compact'));
    const [a, b] = m;
    const near = (x, y) => Math.abs(x - y) <= 1;
    check(`vạch chia ${w}px ${scheme}${compactOn ? ' Compact' : ''}${touch ? ' cảm ứng' : ''}: nút "Add step" của vạch đầu bảng thẳng hàng vạch thứ hai, tâm trên vạch, giữa vạch theo chiều ngang`,
      m.length === 2 && compactOn === compact && near(a.cx, b.cx) && near(a.dy, b.dy) && near(a.w, b.w) && near(a.h, b.h) && Math.abs(a.dy) <= 1 && Math.abs(a.dx) <= 1,
      JSON.stringify(m.map((x) => Object.fromEntries(Object.entries(x).map(([k, v]) => [k, Math.round(v * 10) / 10])))));
    await gc.close();
  }
  });

  /* ── Bộ nhớ khoá cũ (v1, có người làm): đọc, chuẩn hoá bỏ người, ghi sang khoá mới, giữ khoá cũ ── */
  await section('Bộ nhớ khoá cũ', async () => { // thân giữ thụt lề cũ cho dễ gộp
  const oldCtx = await browser.newContext();
  const v1 = { version: 1, lastId: 'w1', me: { w1: 'An' }, lastBackup: '', dirtySince: '', workspaces: [{ id: 'w1', name: 'Dự án cũ',
    people: ['An', 'Bình'], steps: [{ id: 't1', title: 'Bước cũ', subs: [{ id: 's1', title: 'Việc cũ', status: 'doing', owner: 'An' }] }], log: [] }] };
  await oldCtx.addInitScript((d) => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('stepPlanner.v1', d); } }, JSON.stringify(v1));
  const op = await oldCtx.newPage();
  const oErr = [];
  op.on('pageerror', (e) => oErr.push(String(e)));
  await op.goto(BASE);
  await op.waitForSelector('#app:not([hidden]) .card[data-sub]');
  const ov0 = await op.evaluate(() => JSON.parse(localStorage.getItem('stepPlanner.v2')));
  check('khoá cũ: mở trang là ghi ngay sang khoá mới, chưa cần sửa gì', !!ov0 && ov0.workspaces[0]?.id === 'w1' && ov0.lastId === 'w1'
    && !('owner' in ov0.workspaces[0].steps[0].subs[0]), JSON.stringify(ov0)?.slice(0, 120));
  await op.click('.card[data-sub] [data-act="status"]');
  await afterSave(op);
  const ov = await op.evaluate(() => [JSON.parse(localStorage.getItem('stepPlanner.v2')), localStorage.getItem('stepPlanner.v1')]);
  check('khoá cũ có người làm: mở được, chuyển sang khoá mới không còn người, khoá cũ giữ nguyên',
    !oErr.length && (await op.textContent('#ws-name')) === 'Dự án cũ' && ov[0].workspaces[0].steps[0].subs[0].status === 'done'
    && !('me' in ov[0]) && !('people' in ov[0].workspaces[0]) && !('owner' in ov[0].workspaces[0].steps[0].subs[0])
    && ov[1] === JSON.stringify(v1), oErr.join(' | '));
  await oldCtx.close();
  });

  /* ── System design (PLAN-016): hồ sơ đổi gợi ý, chọn lưu ngay, "không cần" bỏ khỏi sơ đồ, sơ đồ không tràn, việc sang
   * bảng (Hoàn tác gỡ), Markdown xuất có mục và nhập lại giữ nguyên, 390px không tràn ngang ── */
  await section('System design', async () => { // thân giữ thụt lề cũ cho dễ gộp
  for (const [w, hh] of [[1280, 900], [390, 844]]) {
    const { ctx: sx, page: sp } = await open(w, hh);
    const tag = `system design ${w}px`;
    await sp.click('#start .tpl[data-tpl="crisp-dm"]');
    await sp.waitForSelector('#sd-fig svg');
    const cat = await sp.evaluate(async () => (await fetch('data/system-design.json')).json());
    const n0 = await sp.$$eval('#sd-fig .sd-node', (ns) => ns.length);
    check(`${tag}: sơ đồ trống vẽ mọi khâu (chưa quyết) và Users`, n0 === cat.stages.length + 1
      && (await sp.$$eval('#sd-fig .sd-node.is-open', (ns) => ns.length)) === cat.stages.length);
    await sp.click('#sd-btn');
    await sp.click('#sd-open');
    await sp.waitForSelector('#dlg-sd[open] .sd-paths');
    const before = await sp.$$eval('#sd-nav .sd-nav-btn', (b) => b.length);
    check(`${tag}: hộp mở ở lối bắt đầu, có hồ sơ, kiến trúc, mọi khâu và hai trang xem lại`, before === cat.stages.length + 5
      && (await sp.$$eval('#sd-pane input[data-path]', (r) => r.length)) === cat.paths.length + 1);
    await sp.click('#sd-nav [data-at="1"]');
    await sp.click('input[data-q="size"][value="large"]', { force: true });
    /* Khâu chỉ cần khi hồ sơ khớp (`when`): trả lời ngoài `when` thì khâu nói vì sao thường không cần. */
    const gated = cat.stages.find((x) => Object.keys(x.when || {}).length);
    const [gq, gok] = Object.entries(gated.when)[0];
    const goff = cat.profile.find((x) => x.id === gq).choices.find((c) => !gok.includes(c.id)).id;
    await sp.click(`input[data-q="${gq}"][value="${goff}"]`, { force: true });
    await sp.click(`#sd-nav [data-at="${cat.stages.indexOf(gated) + 3}"]`);
    check(`${tag}: hồ sơ không cần khâu ${gated.id} thì khâu nói vì sao`, /Usually not needed for your profile/.test(await sp.textContent('#sd-pane')));
    await sp.click('#sd-nav [data-at="6"]');
    const proc = cat.stages[3];
    const top = await sp.$eval('#sd-pane .sd-opt:has(.sd-tag.top)', (e) => e.dataset.opt).catch(() => '');
    const want = proc.options.find((o) => !o.fit || !o.fit.size || o.fit.size.includes('large'));
    check(`${tag}: dữ liệu lớn thì gợi ý ở ${proc.id} hợp cỡ lớn`, !!top && proc.options.find((o) => o.id === top).fit?.size?.includes('large') !== false && !!want, top);
    await sp.click(`#sd-pane [data-opt="${top}"] input`);
    let ws = await cur(sp);
    check(`${tag}: chọn thì lưu ngay`, ws.design?.stages[proc.id]?.pick[0] === top && ws.design.profile.size === 'large');
    check(`${tag}: đã chọn thì phương án khác gập lại`, await sp.$eval('#sd-pane .sd-more', (d) => !d.open && d.querySelectorAll('.sd-opt').length > 0));
    check(`${tag}: focus ở lại ô vừa chọn`, await sp.evaluate((id) => document.activeElement?.closest('.sd-opt')?.dataset.opt === id, top));
    await sp.click(`#sd-pane [data-skip="${proc.id}"]`);
    await sp.click(`#sd-pane [data-skip="${proc.id}"]`);
    ws = await cur(sp);
    check(`${tag}: bật rồi tắt "Not needed" giữ lựa chọn cũ`, ws.design.stages[proc.id].pick[0] === top && !ws.design.stages[proc.id].skip
      && !!(await sp.$(`#sd-pane [data-opt="${top}"].is-on`)));
    await sp.click('#sd-next');
    const ing = cat.stages[4].id;
    await sp.click(`#sd-pane [data-skip="${ing}"]`);
    await sp.fill('#sd-pane [data-note]', 'Own: lý do\n- không phải việc');
    ws = await cur(sp);
    check(`${tag}: "Not needed" và ghi chú lưu`, ws.design.stages[ing].skip && /không phải việc/.test(ws.design.stages[ing].note));
    /* Lối bắt đầu: chọn lối thì thấy luồng tối thiểu; Apply path chỉ điền khâu chưa quyết; Hoàn tác trong hộp trả lại. */
    await sp.click('#sd-nav [data-at="0"]');
    await sp.click('#sd-pane input[data-path][value="report"]', { force: true });
    check(`${tag}: chọn lối thì hiện luồng tối thiểu và mốc nghiệm thu`, (await sp.$$eval('#sd-pane .sd-flowlist li', (l) => l.length)) > 1
      && (await sp.$$eval('#sd-pane .sd-accept li', (l) => l.length)) > 0);
    await sp.click('#sd-pane [data-apply]');
    ws = await cur(sp);
    check(`${tag}: Apply path — khâu lối bỏ thành Not needed, khâu cần được chọn, khâu đã quyết giữ nguyên`, ws.design.path === 'report'
      && ws.design.stages.serve?.skip && ws.design.stages.app?.pick[0] === 'notebook-report' && ws.design.stages[proc.id].pick[0] === top
      && ws.design.stages[ing].skip && /Filled/.test(await sp.textContent('#sd-pane .sd-applied')));
    if (w === 390) check(`${tag}: hộp lối bắt đầu không tràn ngang`, await sp.$eval('#dlg-sd', (d) => d.scrollWidth <= d.clientWidth + 1));
    await sp.click('#sd-pane [data-unapply]');
    ws = await cur(sp);
    check(`${tag}: Hoàn tác Apply path trả các khâu vừa điền`, !ws.design.stages.serve && !ws.design.stages.app && ws.design.stages[proc.id].pick[0] === top
      && ws.design.path === 'report');
    await sp.click('#sd-pane input[data-path][value=""]', { force: true });
    /* Luật phối hợp: API + GitHub Pages báo ở khâu, ở cột trái, ở trang Checks và dưới sơ đồ; bỏ chọn thì hết. */
    const pg = (id) => cat.stages.findIndex((x) => x.id === id) + 3;
    await sp.click(`#sd-nav [data-at="${pg('serve')}"]`);
    await sp.click('#sd-pane [data-opt="fastapi"] input');
    await sp.click(`#sd-nav [data-at="${pg('host')}"]`);
    await sp.click('#sd-pane [data-opt="github-pages"] input');
    check(`${tag}: luật phối hợp báo ở khâu, cột trái, dưới sơ đồ`, /API on a static host/.test(await sp.textContent('#sd-pane'))
      && (await sp.$$eval('#sd-nav .has-warn', (b) => b.length)) >= 3 && (await sp.$$eval('#sd-warns li', (l) => l.length)) === 1
      && /warning/.test(await sp.textContent('#sd-sub')));
    await sp.click(`#sd-nav [data-at="${cat.stages.length + 4}"]`);
    check(`${tag}: trang Checks liệt kê cảnh báo, có nút tới khâu`, (await sp.$$eval('#sd-pane .sd-warnbox', (l) => l.length)) === 1
      && (await sp.$$eval('#sd-pane .sd-warnbox [data-at]', (b) => b.length)) === 2);
    if (w === 390) check(`${tag}: trang Checks không tràn ngang`, await sp.$eval('#dlg-sd', (d) => d.scrollWidth <= d.clientWidth + 1));
    await sp.click(`#sd-pane .sd-warnbox [data-at="${pg('serve')}"]`);
    await sp.click('#sd-pane [data-opt="fastapi"] input');
    await sp.click(`#sd-nav [data-at="${pg('host')}"]`);
    await sp.click('#sd-pane [data-opt="github-pages"] input');
    ws = await cur(sp);
    check(`${tag}: bỏ chọn thì hết cảnh báo`, !(await sp.$$eval('#sd-warns li', (l) => l.length)) && !ws.design.stages.serve && !ws.design.stages.host);
    if (w === 390) check(`${tag}: hộp không tràn ngang`, await sp.$eval('#dlg-sd', (d) => d.scrollWidth <= d.clientWidth + 1));
    await sp.keyboard.press('Escape');
    check(`${tag}: sơ đồ bỏ khâu không cần, khâu đã chọn có tên`, !(await sp.$(`#sd-fig [data-stage="${ing}"]`))
      && /\S/.test(await sp.$eval(`#sd-fig [data-stage="${proc.id}"]`, (g) => g.textContent)) && !(await sp.$(`#sd-fig [data-stage="${proc.id}"].is-open`)));
    check(`${tag}: sơ đồ nằm trong khung, trang không tràn ngang`, await sp.$eval('#sd-fig', (f) => f.scrollWidth <= f.clientWidth + 1) && (await hOverflow(sp)) <= 0);
    const steps0 = (await cur(sp)).steps.length;
    await sp.click('#sd-plan');
    await sp.waitForSelector('#dlg-sdp[open] .sdp-item');
    check(`${tag}: Add tasks to plan mở bản xem trước, mặc định bước mới System build`, (await sp.textContent('#dlg-sdp-title')) === 'Add tasks to plan'
      && (await sp.$eval('#sdp-step', (s) => s.value)) === '' && (await sp.$$eval('#sdp-list .sdp-item', (l) => l.length)) === 1);
    if (w === 390) check(`${tag}: hộp Update plan không tràn ngang`, await sp.$eval('#dlg-sdp', (d) => d.scrollWidth <= d.clientWidth + 1));
    await sp.click('#sdp-go');
    ws = await cur(sp);
    const build = ws.steps[1];
    check(`${tag}: Add tasks to plan thêm bước System build ở vị trí 2, có link, có dấu nguồn`, ws.steps.length === steps0 + 1 && build.title === 'System build'
      && build.subs.length === 1 && build.subs[0].docs.length > 0 && build.subs[0].title.startsWith(proc.title) && /^stage:/.test(build.subs[0].sd));
    check(`${tag}: đã có việc sinh ra thì nút thành Update plan`, (await sp.textContent('#sd-plan')).trim() === 'Update plan');
    await sp.click('#sd-plan');
    await sp.waitForSelector('#dlg-sdp[open]');
    check(`${tag}: bấm lại: mọi việc đã khớp, Apply tắt`, await sp.$eval('#sdp-go', (b) => b.disabled) && /already match/.test(await sp.textContent('#dlg-sdp')));
    await sp.keyboard.press('Escape');
    check(`${tag}: không thêm trùng`, (await cur(sp)).steps[1].subs.length === 1);
    if (w === 1280) {
      const [dl] = await Promise.all([sp.waitForEvent('download'), sp.click('#sd-svg')]);
      const body = fs.readFileSync(await dl.path(), 'utf8');
      check(`${tag}: tải SVG đứng một mình (màu chép vào thuộc tính)`, /^<\?xml/.test(body) && /<svg[^>]+xmlns=/.test(body) && !/class=/.test(body) && /fill="rgb/.test(body));
      const md = await sp.evaluate(async () => {
        const C = await import(new URL('js/core/markdown.js', location.href).href);
        const s = JSON.parse(localStorage.getItem('stepPlanner.v2'));
        return C.toMarkdown(s.workspaces.find((x) => x.id === s.lastId));
      });
      await sp.click('#export-btn');
      const shown = await sp.$eval('#export-text', (e) => e.value);
      check(`${tag}: Markdown xuất có mục System design kèm tên đọc được`, /## System design/.test(md) && md.includes(`[${proc.id}: ${top}]`)
        && shown.includes(`- ${proc.title}: `) && shown.includes(`[${proc.id}: ${top}]`));
      await sp.keyboard.press('Escape');
      const rt = await sp.evaluate(async () => {
        const C = Object.assign({}, ...(await Promise.all(['markdown', 'io', 'model'].map((m) => import(new URL(`js/core/${m}.js`, location.href).href))))); // toMarkdown, fromMarkdown, shape, normWorkspace
        const s = JSON.parse(localStorage.getItem('stepPlanner.v2'));
        const w0 = s.workspaces.find((x) => x.id === s.lastId);
        return JSON.stringify(C.shape(C.fromMarkdown(C.toMarkdown(w0)).workspace)) === JSON.stringify(C.shape(C.normWorkspace(w0)));
      });
      check(`${tag}: Markdown đi rồi về giữ nguyên thiết kế`, rt);
    }
    /* Bàn giao (khâu ngay sau Processing đã là Not needed, nên Processing nối thẳng Analytical store): hai khâu liền nhau đã
     * quyết thì đường nối có dấu +; bấm là mở đúng mục ở trang Handoffs; điền xong thì đường có nhãn bấm được bằng bàn phím;
     * việc tích hợp sang bảng; Markdown có mục Handoffs. */
    await sp.click(`#sd-fig [data-stage="${proc.id}"]`);
    await sp.click(`#sd-nav [data-at="${pg('raw')}"]`);
    await sp.click('#sd-pane .sd-opt input');
    await sp.click(`#sd-nav [data-at="${pg('store')}"]`);
    await sp.click('#sd-pane .sd-opt input');
    await sp.keyboard.press('Escape');
    check(`${tag}: đường nối giữa hai khâu đã quyết có dấu + (ẩn với bàn phím)`, (await sp.$$eval('#sd-fig .sd-hand.is-empty', (l) => l.length)) === 2
      && (await sp.$$eval('#sd-fig .sd-hand.is-empty[tabindex]', (l) => l.length)) === 0);
    /* Nét đường nối: liền khi cả hai đầu đã quyết (Users luôn đã quyết), còn lại đứt; đầu mũi tên chữ V hở, luôn liền. */
    const lines = await sp.$$eval('#sd-fig .sd-edge', (es) => es.map((e) => {
      const open = (id) => !!document.querySelector(`#sd-fig [data-stage="${id}"].is-open`);
      const [a, b] = e.dataset.pair.split('>');
      return { pair: e.dataset.pair, dashed: getComputedStyle(e).strokeDasharray !== 'none', open: open(a) || open(b), head: e.getAttribute('marker-end') };
    }));
    check(`${tag}: đường nối nét liền khi cả hai khâu đã quyết, nét đứt khi còn khâu chưa quyết`, lines.length > 2
      && lines.every((l) => l.dashed === l.open) && lines.filter((l) => !l.dashed).map((l) => l.pair).join() === 'raw>process,process>store'
      && lines.some((l) => l.dashed), lines.filter((l) => l.dashed !== l.open).map((l) => l.pair).join());
    check(`${tag}: mọi đường nối có đầu mũi tên chữ V hở, nét liền`, lines.every((l) => l.head === 'url(#sd-arrow)')
      && await sp.$eval('#sd-fig #sd-arrow path', (p) => { const c = getComputedStyle(p); return c.fill === 'none' && c.stroke !== 'none' && c.strokeDasharray === 'none'; }));
    await sp.click('#sd-fig .sd-hand.is-empty[data-edge="raw>process"]', { force: true });
    await sp.waitForSelector('#dlg-sd[open] [data-edge-item="raw>process"][open]');
    check(`${tag}: bấm dấu + mở trang Handoffs ở đúng đường, focus vào ô đầu`, await sp.evaluate(() => !!document.activeElement?.closest('[data-edge-item="raw>process"]')));
    await sp.click('#sd-pane input[data-via="raw>process"][value="file"]', { force: true });
    await sp.fill('#sd-pane [data-edge="raw>process"][data-ef="what"]', 'raw/*.csv, một file mỗi mùa');
    await sp.fill('#sd-pane [data-edge="raw>process"][data-ef="check"]', 'Script làm sạch đọc đủ mọi file mùa và đếm đúng số dòng');
    ws = await cur(sp);
    check(`${tag}: bàn giao lưu ngay`, ws.design.edges['raw>process']?.via === 'file' && /đếm đúng/.test(ws.design.edges['raw>process'].check));
    if (w === 390) check(`${tag}: trang Handoffs không tràn ngang`, await sp.$eval('#dlg-sd', (d) => d.scrollWidth <= d.clientWidth + 1));
    await sp.keyboard.press('Escape');
    check(`${tag}: đường đã ghi có nhãn đọc được, Tab tới được`, (await sp.textContent('#sd-fig .sd-hand[data-edge="raw>process"]')).includes('File')
      && (await sp.$eval('#sd-fig .sd-hand[data-edge="raw>process"]', (g) => g.getAttribute('tabindex') === '0' && /Handoff/.test(g.getAttribute('aria-label')))));
    check(`${tag}: sơ đồ có nhãn vẫn nằm trong khung`, await sp.$eval('#sd-fig', (f) => f.scrollWidth <= f.clientWidth + 1) && (await hOverflow(sp)) <= 0);
    await sp.focus('#sd-fig .sd-hand[data-edge="raw>process"]');
    await sp.keyboard.press('Enter');
    await sp.waitForSelector('#dlg-sd[open] [data-edge-item="raw>process"][open]');
    await sp.keyboard.press('Escape');
    if (w === 1280) {
      const md2 = await sp.evaluate(async () => {
        const C = await import(new URL('js/core/markdown.js', location.href).href);
        const s = JSON.parse(localStorage.getItem('stepPlanner.v2'));
        return C.toMarkdown(s.workspaces.find((x) => x.id === s.lastId));
      });
      check(`${tag}: Markdown có mục Handoffs`, md2.includes('[handoff: raw > process]') && md2.includes('  Check: Script làm sạch'));
    }
    /* Đổi phương án sau khi đã sinh việc (review: pandas → DuckDB để lại hai việc): Update plan sửa đúng việc cũ; Hoàn tác trả hết. */
    const oldTitle = (await cur(sp)).steps[1].subs[0].title;
    await sp.click(`#sd-fig [data-stage="${proc.id}"]`);
    await sp.click('#sd-pane .sd-more > summary');
    const other = await sp.$eval('#sd-pane .sd-more .sd-opt', (e) => e.dataset.opt);
    await sp.click(`#sd-pane [data-opt="${other}"] input`);
    await sp.keyboard.press('Escape');
    await sp.click('#sd-plan');
    await sp.waitForSelector('#dlg-sdp[open] .sdp-item');
    const groups = await sp.$$eval('#sdp-list .sdp-group h3', (l) => l.map((x) => x.textContent));
    check(`${tag}: Update plan: việc mới (khâu, bàn giao) và việc đổi`, groups.some((t) => /^New \(3\)/.test(t)) && groups.some((t) => /^Changed \(1\)/.test(t)), groups.join());
    await sp.click('#sdp-go');
    ws = await cur(sp);
    const procSubs = ws.steps[1].subs.filter((x) => x.title.startsWith(proc.title));
    check(`${tag}: Update sửa việc cũ, không để hai việc cùng khâu; việc bàn giao có Done when là phép kiểm`, procSubs.length === 1 && procSubs[0].title !== oldTitle
      && ws.steps[1].subs.some((x) => x.title === 'Handoff: Raw storage → Processing & cleaning' && /đếm đúng/.test(x.doneWhen)) && /Plan updated/.test(await sp.textContent('#toast-text')));
    await sp.click('#toast-undo');
    ws = await cur(sp);
    check(`${tag}: Hoàn tác trả việc cũ, gỡ việc mới`, ws.steps[1].subs.length === 1 && ws.steps[1].subs[0].title === oldTitle);
    await sx.close();
  }
  });

  /* ── System design, big data: luật mới báo khi bấm thật (MLlib cho dữ liệu nhỏ; cần trả lời ngay mà xử lý theo lô), hết khi đổi ── */
  await section('System design, big data', async () => {
    const { ctx: bx, page: bp } = await open(1280, 900);
    await bp.click('#start .tpl[data-tpl="crisp-dm"]');
    await bp.waitForSelector('#sd-fig svg');
    await bp.click('#sd-open');
    await bp.waitForSelector('#dlg-sd[open] .sd-paths');
    const navTo = (title) => bp.click(`#sd-nav .sd-nav-btn:has-text("${title}")`);
    await navTo('Project profile');
    for (const [q, a] of [['size', 'small'], ['fresh', 'stream'], ['latency', 'online']]) await bp.click(`input[data-q="${q}"][value="${a}"]`, { force: true });
    await navTo('Training environment');
    await bp.click('#sd-pane [data-opt="spark-mllib"] input');
    check('big data: Spark MLlib với dữ liệu vừa bộ nhớ thì báo', /Spark MLlib for data that fits in memory/.test(await bp.textContent('#sd-pane')));
    await navTo('Processing & cleaning');
    await bp.click('#sd-pane [data-opt="pandas"] input');
    check('big data: dữ liệu liên tục, cần trả lời ngay, xử lý bằng pandas thì báo; dưới sơ đồ có cả hai luật',
      /Answers in a second, processing in batches/.test(await bp.textContent('#sd-pane'))
      && /Spark MLlib for data/.test(await bp.textContent('#sd-warns')) && /Answers in a second/.test(await bp.textContent('#sd-warns')));
    await bp.click('#sd-pane .sd-more > summary');
    await bp.click('#sd-pane [data-opt="python-consumer"] input');
    check('big data: đổi sang consumer Python thì luật stream thôi báo', !/Answers in a second/.test(await bp.textContent('#sd-warns')));
    await bx.close();
  });

  /* ── System design, mẫu đặt sẵn (PLAN-033): tạo từ lakehouse-oss thì hồ sơ, lối của mẫu đã chọn sẵn, có dòng nói là của mẫu;
   * đổi một câu thì dòng ấy ẩn; tạo từ mẫu trống thì hồ sơ trống, không có dòng ── */
  await section('System design, mẫu đặt sẵn', async () => {
    const { ctx: px, page: pp } = await open(1280, 900);
    const tpl = (await pp.evaluate(async () => (await (await fetch('data/templates.json')).json()).templates)).find((t) => t.id === 'lakehouse-oss');
    await pp.click('#start .tpl[data-tpl="lakehouse-oss"]');
    await pp.waitForSelector('#sd-fig svg');
    let ws = await cur(pp);
    check('mẫu đặt sẵn: dự án lakehouse-oss lưu hồ sơ, lối của mẫu, chưa chọn phương án',
      JSON.stringify(ws.design) === JSON.stringify({ path: tpl.design.path, profile: tpl.design.profile, stages: {}, edges: {}, arch: tpl.design.arch || {} }), JSON.stringify(ws.design));
    await pp.click('#sd-open');
    await pp.waitForSelector('#dlg-sd[open] .sd-paths');
    const note = async () => (await pp.$('#sd-pane [data-preset="lakehouse-oss"]')) && pp.textContent('#sd-pane [data-preset]');
    check('mẫu đặt sẵn: trang lối đã chọn lối của mẫu, có dòng nêu tên mẫu',
      await pp.$eval(`#sd-pane input[data-path][value="${tpl.design.path}"]`, (r) => r.checked) && (await note() || '').includes(tpl.name));
    await pp.click('#sd-nav [data-at="1"]');
    const checked = await pp.$$eval('#sd-pane input[data-q]:checked', (rs) => Object.fromEntries(rs.filter((r) => r.value).map((r) => [r.dataset.q, r.value])));
    check('mẫu đặt sẵn: trang hồ sơ chọn sẵn đúng câu trả lời của mẫu, có dòng Preset from template',
      JSON.stringify(checked, Object.keys(tpl.design.profile)) === JSON.stringify(tpl.design.profile, Object.keys(tpl.design.profile))
      && Object.keys(checked).length === Object.keys(tpl.design.profile).length && /^Preset from template/.test(await note() || ''), JSON.stringify(checked));
    await pp.click('#sd-pane input[data-q="users"][value="me"]', { force: true });
    ws = await cur(pp);
    check('mẫu đặt sẵn: đổi một câu thì lưu, dòng Preset from template ẩn', ws.design.profile.users === 'me' && !(await pp.$('#sd-pane [data-preset]')));
    await pp.keyboard.press('Escape');
    await pp.click('#ws-btn');
    await pp.click('#ws-tab-new');
    await pp.check('#ws-new-templates input[value="blank"]');
    await pp.click('#ws-new button[type="submit"]');
    await pp.waitForSelector('#sd-fig svg');
    ws = await cur(pp);
    await pp.click('#sd-open');
    await pp.waitForSelector('#dlg-sd[open] .sd-paths');
    await pp.click('#sd-nav [data-at="1"]');
    check('mẫu đặt sẵn: tạo từ mẫu trống thì hồ sơ trống, không có dòng Preset from template', ws.templateId === 'blank' && ws.design === null
      && !(await pp.$$eval('#sd-pane input[data-q]:checked', (rs) => rs.filter((r) => r.value).length)) && !(await pp.$('#sd-pane [data-preset]')));
    await pp.keyboard.press('Escape');
    /* Mẫu đặt sẵn hồ sơ mà chưa có lối: trang Architecture đòi chọn lối (thứ thật sự thiếu), nút dẫn tới "What do you deliver?". */
    const noPath = (await pp.evaluate(async () => (await (await fetch('data/templates.json')).json()).templates))
      .find((t) => t.design && !t.design.path && Object.keys(t.design.profile || {}).length);
    if (noPath) {
      await pp.click('#ws-btn');
      await pp.click('#ws-tab-new');
      await pp.check(`#ws-new-templates input[value="${noPath.id}"]`);
      await pp.click('#ws-new button[type="submit"]');
      await pp.waitForSelector('#sd-arch [data-arch-open]');
      await pp.click('#sd-arch [data-arch-open]');
      await pp.waitForSelector('#dlg-sd[open] .sd-fam');
      const tip = await pp.$eval('#sd-pane', (p) => { const t = p.querySelector('.sd-tip[data-missing]'); return t && { miss: t.dataset.missing, text: t.textContent }; });
      await pp.click('#sd-pane .sd-tip [data-at="0"]');
      check(`mẫu ${noPath.id} (hồ sơ đặt sẵn, chưa có lối): Architecture đòi chọn lối, nút tới "What do you deliver?"`,
        !!tip && /\bpath\b/.test(tip.miss) && /^Pick what you deliver/.test(tip.text) && !!(await pp.$('#sd-pane .sd-paths')), JSON.stringify(tip));
    }
    await px.close();
  });

  /* ── System design, kiến trúc: trang Architecture vẽ mọi nhóm, mọi kiến trúc; gợi ý đổi theo hồ sơ; công cụ dẫn tới khâu;
   * chọn kiến trúc mang lối ở nhóm app là đặt lối; dòng kiến trúc trên trang; 390px không tràn ngang ── */
  await section('System design, kiến trúc', async () => { // thân giữ thụt lề cũ cho dễ gộp
  for (const [w, hh] of [[1280, 900], [390, 844]]) {
    const { ctx: ax, page: ap } = await open(w, hh);
    const tag = `kiến trúc ${w}px`;
    await ap.click('#start .tpl[data-tpl="crisp-dm"]');
    await ap.waitForSelector('#sd-fig svg');
    const cat = await ap.evaluate(async () => (await fetch('data/system-design.json')).json());
    check(`${tag}: trên trang có lối vào trang Architecture`, /Architecture guide/.test(await ap.textContent('#sd-arch')));
    await ap.click('#sd-arch [data-arch-open]');
    await ap.waitForSelector('#dlg-sd[open] .sd-fam');
    const navTo = (title) => ap.click(`#sd-nav .sd-nav-btn:has-text("${title}")`);
    const recs = () => ap.$$eval('#sd-pane .sd-fam', (fs) => Object.fromEntries(fs.map((f) => [f.dataset.fam, f.querySelector('.sd-rec')?.dataset.rec ?? null])));
    const fams = await ap.$$eval('#sd-pane .sd-fam', (fs) => fs.map((f) => [f.dataset.fam, f.querySelectorAll('.sd-arch').length]));
    check(`${tag}: mọi nhóm, mọi kiến trúc hiện; chưa trả lời thì chưa gợi ý, có lối tới "What do you deliver?" và hồ sơ`,
      JSON.stringify(fams) === JSON.stringify(cat.architectures.map((f) => [f.id, f.entries.length]))
      && Object.values(await recs()).every((x) => x === null) && !!(await ap.$('#sd-pane .sd-tip[data-missing~="path"] [data-at="0"]'))
      && !!(await ap.$('#sd-pane .sd-tip [data-at="1"]')), JSON.stringify(fams));
    await navTo('Project profile');
    for (const [q, a] of [['size', 'small'], ['fresh', 'batch']]) await ap.click(`input[data-q="${q}"][value="${a}"]`, { force: true });
    await navTo('Architecture');
    let r = await recs();
    check(`${tag}: dữ liệu nhỏ theo ngày — file + một DB, batch ETL`, r.storage === 'files-db' && r.processing === 'batch-etl', JSON.stringify(r));
    await navTo('Project profile');
    for (const [q, a] of [['fresh', 'stream'], ['latency', 'online']]) await ap.click(`input[data-q="${q}"][value="${a}"]`, { force: true });
    await navTo('Architecture');
    r = await recs();
    check(`${tag}: dữ liệu liên tục, cần trả lời ngay — gợi ý nhóm xử lý thành stream, kiến trúc ấy viền xanh; chưa quyết Training thì nhóm model chưa gợi ý`,
      r.processing === 'streaming' && r.ml === null
      && !!(await ap.$(`#sd-pane .sd-arch.is-rec[data-arch="${r.processing}"]`)), JSON.stringify(r));
    await ap.click(`#sd-pane [data-arch="${r.processing}"] > summary`);
    const open1 = await ap.$eval(`#sd-pane [data-arch="${r.processing}"]`, (d) => d.open && d.querySelectorAll('.sd-chain li').length > 1 && d.querySelectorAll('.sd-links a').length > 0);
    check(`${tag}: mở kiến trúc thấy luồng, công cụ theo khâu, nguồn`, open1);
    if (w === 390) check(`${tag}: trang Architecture không tràn ngang`, await ap.$eval('#dlg-sd', (d) => d.scrollWidth <= d.clientWidth + 1)
      && await ap.$eval('#sd-pane', (p) => p.scrollWidth <= p.clientWidth + 1));
    await ap.click('#sd-pane input[data-arch-pick="app"][value="monolith"]', { force: true });
    const ws = await cur(ap);
    check(`${tag}: chọn Single app ở nhóm app đặt lối, kiến trúc mang dấu Your deliverable; mẹo không còn đòi chọn lối`, ws.design.path === 'demo'
      && !Object.keys(ws.design.arch || {}).length
      && /Your deliverable/.test(await ap.textContent('#sd-pane [data-arch="monolith"] > summary')) && (await recs()).app === 'monolith'
      && !(await ap.$('#sd-pane .sd-tip[data-missing~="path"]')));
    const stage = cat.architectures.find((f) => f.id === 'processing').entries.find((e) => e.id === r.processing);
    const sid = Object.keys(stage.tools)[0];
    await ap.click(`#sd-pane [data-arch="${r.processing}"] .sd-arch-tools [data-at]`);
    check(`${tag}: bấm khâu trong Tools by stage tới đúng trang khâu`, (await ap.textContent('#sd-pane .sd-h')) === cat.stages.find((x) => x.id === sid).title);
    await ap.keyboard.press('Escape');
    const line = await ap.textContent('#sd-arch');
    check(`${tag}: dòng kiến trúc trên trang nêu các kiến trúc gợi ý`, /^Architecture: /.test(line) && line.includes(stage.name), line);
    await ax.close();
  }
  });

  /* ── System design, chọn kiến trúc (PLAN-042): chọn / bỏ bằng chuột và phím, focus ở lại, vòng focus chỉ cho phím; lưu qua tải
   * lại; Apply path theo kiến trúc chọn. ── */
  await section('System design, chọn kiến trúc', async () => {
    const { ctx: cx, page: cp } = await open(1280, 900);
    await cp.click('#start .tpl[data-tpl="crisp-dm"]');
    await cp.waitForSelector('#sd-fig svg');
    await cp.click('#sd-arch [data-arch-open]');
    await cp.waitForSelector('#dlg-sd[open] .sd-fam');
    const pickSel = (f, v) => `#sd-pane input[data-arch-pick="${f}"][value="${v}"]`;
    const ring = (sel) => cp.$eval(sel, (i) => ({ active: document.activeElement === i, quiet: document.documentElement.classList.contains('quiet-focus'),
      outline: getComputedStyle(i.nextElementSibling).outlineStyle }));
    await cp.click(pickSel('storage', 'lakehouse'), { force: true });
    let ws = await cur(cp);
    const r1 = await ring(pickSel('storage', 'lakehouse'));
    check('chọn kiến trúc: bấm chuột lưu ngay, thẻ mang dấu Chosen, focus ở lại ô vừa chọn, không vòng focus (chuột)',
      ws.design.arch.storage === 'lakehouse' && r1.active && r1.quiet && r1.outline === 'none'
      && /Chosen/.test(await cp.textContent('#sd-pane [data-arch="lakehouse"] > summary'))
      && !!(await cp.$('#sd-pane .sd-arch.is-rec[data-arch="lakehouse"]')), JSON.stringify({ arch: ws.design.arch, r1 }));
    await cp.keyboard.press('ArrowRight');
    ws = await cur(cp);
    const r2 = await ring(pickSel('storage', ''));
    check('chọn kiến trúc: phím mũi tên trong nhóm đổi lựa chọn (Lakehouse → Not chosen là bỏ chọn), focus theo, có vòng focus (phím)',
      !(ws.design?.arch || {}).storage && r2.active && !r2.quiet && r2.outline !== 'none', JSON.stringify({ arch: ws.design?.arch, r2 }));
    await cp.keyboard.press('ArrowLeft');
    ws = await cur(cp);
    check('chọn kiến trúc: ← từ Not chosen chọn lại kiến trúc cuối (Lakehouse)', ws.design.arch.storage === 'lakehouse' && (await ring(pickSel('storage', 'lakehouse'))).active);
    await cp.click(pickSel('processing', 'kappa'), { force: true });
    await cp.click('#sd-nav [data-at="0"]');
    await cp.click('#sd-pane input[data-path][value="pipeline"]', { force: true });
    await cp.click('#sd-pane [data-apply]');
    ws = await cur(cp);
    const picks = (sid) => (ws.design.stages[sid]?.pick || []);
    check('chọn kiến trúc: Apply path theo kiến trúc chọn — lakehouse: object storage + Iceberg + catalog; Kappa: Kafka, công cụ stream',
      picks('raw').includes('iceberg') && picks('raw').includes('polaris') && picks('ingest').includes('kafka')
      && ['spark-streaming', 'flink'].some((x) => picks('process').includes(x)), JSON.stringify(ws.design.stages));
    await cp.keyboard.press('Escape');
    const line = await cp.textContent('#sd-arch');
    check('chọn kiến trúc: dòng kiến trúc trên trang nêu kiến trúc đã chọn', /^Architecture: chosen Lakehouse · Kappa architecture/.test(line), line);
    await cp.reload();
    await cp.waitForSelector('#sd-fig svg');
    await cp.click('#sd-arch [data-arch-open]');
    await cp.waitForSelector('#dlg-sd[open] .sd-fam');
    check('chọn kiến trúc: tải lại vẫn giữ lựa chọn, mục Architecture ghi số đã chọn',
      await cp.$eval(pickSel('storage', 'lakehouse'), (i) => i.checked) && await cp.$eval(pickSel('processing', 'kappa'), (i) => i.checked)
      && /2 chosen/.test(await cp.textContent('#sd-nav [data-at="2"]')));
    /* Kiến trúc chọn giải thích luật hồ sơ ↔ công cụ (Kappa cho dữ liệu không liên tục): trang Checks ghi lời nhắc, không đếm là cảnh báo. */
    await cp.click('#sd-nav [data-at="1"]');
    await cp.click('#sd-pane input[data-q="fresh"][value="batch"]', { force: true });
    await cp.click('#sd-nav li:last-child .sd-nav-btn');
    const notes = await cp.$$eval('#sd-pane [data-arch-note]', (n) => n.map((x) => x.dataset.archNote));
    const kTitle = (await cp.evaluate(async () => (await (await fetch('data/system-design.json')).json()).checks)).find((c) => c.id === 'kafka-for-batch-data').title;
    const hard = await cp.$$eval('#sd-pane .sd-warnbox b', (b) => b.map((x) => x.textContent));
    const sub = await cp.textContent('#sd-sub');
    check('chọn kiến trúc: luật hồ sơ ↔ công cụ mà kiến trúc chọn giải thích là lời nhắc (Checks), không vào số cảnh báo',
      notes.includes('kafka-for-batch-data') && !hard.includes(kTitle) && (hard.length ? sub.includes(`${hard.length} warning`) : !sub.includes('warning')),
    JSON.stringify({ notes, hard, sub }));
    await cx.close();

  });

  /* ── Sơ đồ System design như khung nhìn: nhịp dọc của hộp (Handoffs, "Show other options"), nhãn bàn giao trên đường nối,
   * kéo, thu phóng, về khung ban đầu. Thiết kế gieo thẳng vào bộ nhớ rồi tải lại. ── */
  await section('System diagram view', async () => {
    const pk = (id) => ({ pick: [id], skip: false, own: '', note: '' });
    const no = { pick: [], skip: true, own: '', note: '' };
    const seedDesign = (page) => page.evaluate((d) => {
      const s = JSON.parse(localStorage.getItem('stepPlanner.v2'));
      s.workspaces.find((x) => x.id === s.lastId).design = d;
      localStorage.setItem('stepPlanner.v2', JSON.stringify(s));
    }, { path: '', profile: {}, stages: { source: pk('kaggle-datasets'), ingest: pk('notebook-script'), raw: pk('project-folder'), process: pk('pandas'),
      validate: pk('pandera'), store: pk('parquet-duckdb'), label: no, train: pk('local'), track: pk('mlflow'), search: no, serve: pk('fastapi'), app: pk('streamlit') },
    edges: { 'source>ingest': { via: 'results', what: 'scores.csv', where: '', promise: '', check: '' }, 'raw>process': { via: 'file', what: 'raw/*.csv', where: '', promise: '', check: '' } } });
    const { ctx: vx, page: vp } = await open(1280, 900);
    await vp.click('#start .tpl[data-tpl="crisp-dm"]');
    await vp.waitForSelector('#sd-fig svg');
    await seedDesign(vp);
    await vp.reload();
    await vp.waitForSelector('#sd-fig .sd-hand');
    const s4 = await vp.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s4')));
    const s3 = await vp.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s3')));
    /* Hộp Handoffs: đáy mỗi ô cách nhãn ô sau ít nhất --s4; nhãn đứng trên ô của nó. */
    await vp.click('#sd-fig .sd-hand[data-edge="raw>process"]');
    await vp.waitForSelector('#dlg-sd[open] [data-edge-item="raw>process"][open]');
    const rhythm = await vp.$$eval('[data-edge-item="raw>process"] .field', (fs) => fs.map((f) => {
      const lab = f.querySelector('span').getBoundingClientRect(), box = f.querySelector('input, textarea').getBoundingClientRect();
      return { labTop: lab.top, labBottom: lab.bottom, boxTop: box.top, boxBottom: box.bottom };
    }));
    const gaps = rhythm.slice(1).map((r, i) => Math.round(r.labTop - rhythm[i].boxBottom));
    check('Handoffs: đáy ô cách nhãn ô sau ≥ --s4, nhãn đứng trên ô', rhythm.length === 4 && gaps.every((g) => g >= s4) && rhythm.every((r) => r.boxTop >= r.labBottom), gaps.join());
    await vp.keyboard.press('Escape');
    /* "Show other options" mở ra: các phương án cách nhau như danh sách chính (--s3). */
    await vp.click('#sd-fig [data-stage="process"]');
    await vp.click('#sd-pane .sd-more > summary');
    const more = await vp.$$eval('#sd-pane .sd-more .sd-opt', (os) => os.slice(1).map((o, i) => Math.round(o.getBoundingClientRect().top - os[i].getBoundingClientRect().bottom)));
    check('"Show other options": các phương án cách nhau --s3 như danh sách chính', more.length > 1 && more.every((g) => g === s3), more.join());
    await vp.keyboard.press('Escape');
    /* Dấu + của đường trống: ẩn, rê lên đường (không phải lên dấu) thì hiện; không ở vòng Tab (bàn phím: trang Handoffs). */
    const along = (key, t) => vp.$eval(`#sd-fig .sd-wire[data-edge="${key}"] .sd-hit`, (p, k) => {
      const pt = p.getPointAtLength(p.getTotalLength() * k), m = p.getScreenCTM();
      return { x: pt.x * m.a + pt.y * m.c + m.e, y: pt.x * m.b + pt.y * m.d + m.f };
    }, t);
    const plusOp = (key) => vp.$eval(`#sd-fig .sd-hand.is-empty[data-edge="${key}"]`, (g) => getComputedStyle(g).opacity);
    const emptyKey = await vp.$eval('#sd-fig .sd-hand.is-empty', (g) => g.dataset.edge);
    await vp.mouse.move(5, 5);
    const op0 = await plusOp(emptyKey);
    let at = await along(emptyKey, 0.2);
    await vp.mouse.move(at.x, at.y);
    const shown = await waitTo(vp, 'dấu + hiện khi rê đường', (k) => getComputedStyle(document.querySelector(`#sd-fig .sd-hand.is-empty[data-edge="${k}"]`)).opacity === '1', emptyKey);
    check('Dấu + của đường trống ẩn, rê lên đường thì hiện, không nhận Tab', op0 === '0' && shown
      && await vp.$$eval('#sd-fig .sd-hand.is-empty', (l) => l.every((g) => !g.hasAttribute('tabindex') && g.getAttribute('aria-hidden') === 'true')), op0);
    /* Rê đường có hợp đồng: nhãn vẫn ở trên nét (điểm giữa nhãn thuộc nhãn), nền nhãn đặc, nét đổi màu. */
    const capKey = 'source>ingest';
    at = await along(capKey, 0.1);
    await vp.mouse.move(at.x, at.y);
    await waitTo(vp, 'nét đường đang rê đổi màu', (k) => {
      const w = document.querySelector(`#sd-fig .sd-wire[data-edge="${k}"]`);
      return getComputedStyle(w.querySelector('.sd-edge')).stroke === getComputedStyle(w.querySelector('.sd-hand-box')).stroke;
    }, capKey);
    const top = await vp.$eval(`#sd-fig .sd-hand[data-edge="${capKey}"]`, (g) => {
      const r = g.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      const fill = getComputedStyle(g.querySelector('.sd-hand-box')).fill;
      return { above: !!hit && g.contains(hit), last: g.parentNode.lastElementChild === g, fill };
    });
    check('Rê đường có hợp đồng: nhãn ở trên nét, nền đặc', top.above && top.last && /^rgb\(/.test(top.fill), JSON.stringify(top));
    await vp.mouse.move(5, 5);
    /* Nhãn rộng nhất nửa chiều dài đường; chữ dài hơn thì mờ ở đuôi (mask), đủ chữ trong tooltip. Ép nhãn tràn bằng token. */
    const halves = await vp.$$eval('#sd-fig .sd-wire', (ws) => ws.filter((w) => w.querySelector('.sd-hand:not(.is-empty)')).map((w) => {
      const b = w.querySelector('.sd-edge').getBBox(), cap = w.querySelector('.sd-hand-box').getBBox();
      return b.width > b.height ? cap.width <= (b.width + 3) / 2 + 0.5 : true;
    }));
    check('Nhãn bàn giao không rộng quá nửa đường nối ngang', halves.length === 2 && halves.every(Boolean), halves.join());
    /* Nhãn bàn giao không đè đầu mũi tên, kể cả trên đường dọc ngắn giữa hai hàng. */
    const clear = await vp.$$eval('#sd-fig .sd-wire', (ws) => {
      const arrow = document.querySelector('#sd-arrow path').getBBox().width;
      return ws.filter((w) => w.querySelector('.sd-hand:not(.is-empty)')).map((w) => {
        const e = w.querySelector('.sd-edge'), L = e.getTotalLength(), p0 = e.getPointAtLength(0), p1 = e.getPointAtLength(L);
        const er = e.getBoundingClientRect(), br = w.querySelector('.sd-hand-box').getBoundingClientRect();
        const vertical = Math.abs(p1.x - p0.x) < 1;
        const gap = vertical ? er.bottom - br.bottom : p1.x > p0.x ? er.right - br.right : br.left - er.left;
        return { key: w.dataset.edge, vertical, gap: Math.round(gap), arrow };
      });
    });
    check('Nhãn bàn giao không đè đầu mũi tên (cả đường dọc giữa hai hàng)', clear.some((c) => c.vertical) && clear.every((c) => c.gap >= c.arrow + 4), JSON.stringify(clear));
    await vp.$eval('#sd-fig', (f) => f.style.setProperty('--sd-hand-cap', '.22'));
    await vp.setViewportSize({ width: 1279, height: 900 });
    await vp.waitForSelector('#sd-fig .sd-hand.is-cut');
    const cut = await vp.$eval(`#sd-fig .sd-hand.is-cut[data-edge="${capKey}"]`, (g) => {
      const t = g.querySelector('text'), box = g.querySelector('.sd-hand-box').getBBox();
      const mask = t.getAttribute('mask') && document.querySelector(t.getAttribute('mask').slice(4, -1));
      return { masked: !!mask, overflow: t.getComputedTextLength() > box.width, title: g.querySelector('title').textContent };
    });
    check('Nhãn dài bị chặn và mờ ở đuôi, tooltip đủ chữ', cut.masked && cut.overflow && /: Results \(Precomputed results/.test(cut.title), JSON.stringify(cut));
    await vp.$eval('#sd-fig', (f) => f.style.removeProperty('--sd-hand-cap'));
    await vp.setViewportSize({ width: 1280, height: 900 });
    await vp.waitForFunction(() => !document.querySelector('#sd-fig .sd-hand.is-cut'));

    /* Khung nhìn: đọc {x, y, k} từ transform của nhóm `.sd-cam`; điểm của sơ đồ dưới một điểm màn hình. */
    const camView = (page) => page.$eval('#sd-fig .sd-cam', (g) => {
      const t = getComputedStyle(g).transform;
      const m = t === 'none' ? [1, 0, 0, 1, 0, 0] : t.slice(t.indexOf('(') + 1, -1).split(',').map(Number);
      return { k: m[0], x: m[4], y: m[5] };
    });
    const svgAt = (page, fx, fy) => page.$eval('#sd-fig svg', (s, [a, b]) => { const r = s.getBoundingClientRect(); return { x: r.left + r.width * a, y: r.top + r.height * b, left: r.left, top: r.top }; }, [fx, fy]);
    const isHome = (v) => Math.abs(v.k - 1) < 1e-6 && Math.abs(v.x) < 0.5 && Math.abs(v.y) < 0.5;
    const settled = (page) => page.waitForFunction(() => !document.querySelector('#sd-fig .sd-cam.is-easing') || document.querySelector('#sd-fig .sd-cam').getAnimations().every((a) => a.playState !== 'running'));
    const dlgOpen = (page) => page.$eval('#dlg-sd', (d) => d.open);
    await vp.mouse.move(5, 5);
    await vp.$eval('#sd', (s) => s.scrollIntoView({ block: 'start' }));
    check('Khung nhìn: mở trang ở cỡ thật, góc trên trái; cụm nút hiện 100%', isHome(await camView(vp)) && (await vp.textContent('#sd-zoom-pct')).trim() === '100%'
      && !(await vp.$eval('#sd-zoom', (z) => z.hidden)));
    /* Ctrl + bánh xe (pinch của trackpad tới như thế): phóng quanh con trỏ, trang không cuộn. */
    const P = await svgAt(vp, 0.4, 0.3);
    let v = await camView(vp);
    const u0 = { x: (P.x - P.left - v.x) / v.k, y: (P.y - P.top - v.y) / v.k };
    const sy0 = await vp.evaluate(() => scrollY);
    await vp.mouse.move(P.x, P.y);
    await vp.keyboard.down('Control');
    await vp.mouse.wheel(0, -240);
    await vp.keyboard.up('Control');
    await waitTo(vp, 'Ctrl + bánh xe đổi tỉ lệ', () => !/^matrix\(1, 0, 0, 1, 0, 0\)$|^none$/.test(getComputedStyle(document.querySelector('#sd-fig .sd-cam')).transform));
    v = await camView(vp);
    const u1 = { x: (P.x - P.left - v.x) / v.k, y: (P.y - P.top - v.y) / v.k };
    check('Ctrl + bánh xe: phóng to quanh con trỏ (điểm dưới con trỏ đứng yên), trang không cuộn', v.k > 1.2 && Math.abs(u1.x - u0.x) < 0.5 && Math.abs(u1.y - u0.y) < 0.5
      && (await vp.evaluate(() => scrollY)) === sy0 && /^\d+%$/.test(await vp.textContent('#sd-zoom-pct')) && (await vp.textContent('#sd-zoom-pct')).trim() !== '100%', JSON.stringify({ v, u0, u1 }));
    /* Bánh xe trơn: sơ đồ chưa có focus thì trang cuộn, khung đứng yên; bấm vào sơ đồ rồi thì bánh xe kéo khung, trang đứng yên. */
    let v1 = await camView(vp);
    await vp.mouse.wheel(0, 120);
    await waitTo(vp, 'trang cuộn bằng bánh xe trơn', (y0) => scrollY !== y0, sy0);
    const sy1 = await vp.evaluate(() => scrollY);
    check('Bánh xe trơn khi sơ đồ chưa có focus: trang cuộn, khung đứng yên', sy1 !== sy0 && JSON.stringify(await camView(vp)) === JSON.stringify(v1));
    await vp.click('#sd-view-reset');
    await settled(vp);
    check('Reset view: về cỡ thật, góc trên trái', isHome(await camView(vp)) && (await vp.textContent('#sd-zoom-pct')).trim() === '100%', JSON.stringify(await camView(vp)));
    const pad = await vp.$eval('#sd-fig', (f) => { const r = f.getBoundingClientRect(); return { x: r.left + 4, y: r.bottom - 4 }; });
    await vp.mouse.click(pad.x, pad.y);
    check('Bấm vào sơ đồ: khung có focus, không mở hộp', await vp.evaluate(() => document.activeElement?.id === 'sd-fig') && !(await dlgOpen(vp)));
    /* Cỡ thật, sơ đồ vừa khung: bánh xe không dời khung (sơ đồ không bị đẩy đi), trang cuộn. */
    const Q = await svgAt(vp, 0.5, 0.4);
    await vp.mouse.move(Q.x, Q.y);
    const fits = await vp.$eval('#sd-fig svg', (s) => { const r = s.getBoundingClientRect(); return +s.getAttribute('data-w') <= r.width + 0.5 && +s.getAttribute('height') <= r.height + 0.5; });
    await vp.mouse.wheel(40, 120);
    await waitTo(vp, 'trang cuộn khi sơ đồ vừa khung', (y0) => scrollY !== y0, sy1);
    check('Bánh xe trơn, sơ đồ có focus nhưng vừa khung: khung đứng yên, trang cuộn', fits && isHome(await camView(vp)) && (await vp.evaluate(() => scrollY)) !== sy1,
      JSON.stringify(await camView(vp)));
    /* Phóng to (phím +, khung giữ focus): sơ đồ tràn khung, bánh xe kéo khung, trang đứng yên. */
    await vp.keyboard.press('+');
    await vp.keyboard.press('+');
    await settled(vp);
    const sy2 = await vp.evaluate(() => scrollY);
    v1 = await camView(vp);
    await vp.mouse.wheel(30, 90);
    await vp.mouse.wheel(0, 0);
    v = await camView(vp);
    check('Bánh xe trơn khi sơ đồ có focus và tràn khung: kéo khung dọc và ngang, trang đứng yên', v1.k > 1.5 && Math.abs(v.y - (v1.y - 90)) < 1 && Math.abs(v.x - (v1.x - 30)) < 1 && v.k === v1.k
      && (await vp.evaluate(() => scrollY)) === sy2, JSON.stringify({ v, v1 }));
    await vp.keyboard.down('Shift');
    await vp.mouse.wheel(0, 50);
    await vp.keyboard.up('Shift');
    const vs = await camView(vp);
    check('Shift + bánh xe: kéo ngang', Math.abs(vs.x - (v.x - 50)) < 1 && Math.abs(vs.y - v.y) < 1, JSON.stringify({ vs, v }));
    /* Kéo tới mép trên của sơ đồ thì dừng ở mép (trang đứng yên); bánh xe tiếp: khung đứng yên, trang cuộn. */
    await vp.mouse.wheel(0, -5000);
    const ve = await camView(vp);
    const sy3 = await vp.evaluate(() => scrollY);
    await vp.mouse.wheel(0, -60);
    await waitTo(vp, 'trang cuộn khi sơ đồ đã tới mép', (y0) => scrollY !== y0, sy3);
    check('Bánh xe tới mép sơ đồ: dừng ở mép, không đẩy sơ đồ đi; tiếp thì trang cuộn', Math.abs(ve.y) < 0.5 && sy3 === sy2
      && JSON.stringify(await camView(vp)) === JSON.stringify(ve) && (await vp.evaluate(() => scrollY)) < sy3, JSON.stringify({ ve, sy2, sy3 }));
    v = await camView(vp);
    /* Space + kéo, bắt đầu trên một nút: khung dời đúng bằng đường kéo, nút không mở hộp; con trỏ bàn tay. */
    await vp.$eval('#sd-fig', (f) => f.scrollIntoView({ block: 'center' }));
    const node = await vp.$eval('#sd-fig [data-stage="validate"]', (g) => { const r = g.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    const v2 = await camView(vp);
    await vp.mouse.move(node.x, node.y);
    await vp.keyboard.down('Space');
    const grab = await vp.$eval('#sd-fig', (f) => f.classList.contains('is-grab') && getComputedStyle(f.querySelector('.sd-node')).cursor === 'grab');
    await vp.mouse.down();
    await vp.mouse.move(node.x + 30, node.y + 20, { steps: 3 });
    await vp.mouse.move(node.x + 60, node.y + 40, { steps: 3 });
    const grabbing = await vp.$eval('#sd-fig', (f) => getComputedStyle(f).cursor === 'grabbing');
    await vp.mouse.up();
    await vp.keyboard.up('Space');
    v = await camView(vp);
    check('Space + kéo: khung dời theo chuột, con trỏ bàn tay / nắm', Math.abs(v.x - (v2.x + 60)) < 1 && Math.abs(v.y - (v2.y + 40)) < 1 && grab && grabbing, JSON.stringify({ v, v2, grab, grabbing }));
    check('Kéo bắt đầu trên một nút không mở hộp', !(await dlgOpen(vp)));
    /* Nút giữa: kéo khung, không mở hộp. */
    await vp.mouse.move(node.x, node.y);
    await vp.mouse.down({ button: 'middle' });
    await vp.mouse.move(node.x - 40, node.y - 10, { steps: 4 });
    await vp.mouse.up({ button: 'middle' });
    const v3 = await camView(vp);
    check('Kéo bằng nút giữa: khung dời, không mở hộp', Math.abs(v3.x - (v.x - 40)) < 1 && Math.abs(v3.y - (v.y - 10)) < 1 && !(await dlgOpen(vp)), JSON.stringify({ v3, v }));
    /* Nút trái trơn kéo trên một nút: không kéo khung (cần Space), không mở hộp khi thả. */
    const n2 = await vp.$eval('#sd-fig [data-stage="validate"]', (g) => { const r = g.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await vp.mouse.move(n2.x, n2.y);
    await vp.mouse.down();
    await vp.mouse.move(n2.x + 12, n2.y + 4, { steps: 3 });
    await vp.mouse.up();
    check('Kéo nút trái trơn trên nút: khung đứng yên, không mở hộp', JSON.stringify(await camView(vp)) === JSON.stringify(v3) && !(await dlgOpen(vp)));
    /* Giữ Space, sơ đồ không có focus (con trỏ trên sơ đồ): bánh xe trơn kéo khung, trang đứng yên. */
    const prevFocus = await vp.evaluateHandle(() => document.activeElement);
    await vp.evaluate(() => /** @type {any} */ (document.activeElement)?.blur());
    await vp.mouse.move(node.x, node.y);
    const syS = await vp.evaluate(() => scrollY);
    await vp.keyboard.down('Space');
    await vp.mouse.wheel(0, 70);
    await vp.mouse.wheel(0, 0);
    await vp.keyboard.up('Space');
    const vS = await camView(vp);
    check('Giữ Space + bánh xe trơn (sơ đồ không có focus): kéo khung, trang đứng yên', Math.abs(vS.y - (v3.y - 70)) < 1 && Math.abs(vS.x - v3.x) < 1
      && (await vp.evaluate(() => scrollY)) === syS && !(await dlgOpen(vp)), JSON.stringify({ vS, v3 }));
    await prevFocus.evaluate((e) => e.focus({ preventScroll: true }));
    /* Bấm thường (không kéo) trên nút vẫn mở hộp. */
    await vp.keyboard.press('0');
    await vp.click('#sd-zoom-in');
    await settled(vp);
    const v4 = await camView(vp);
    await vp.click('#sd-fig [data-stage="store"]');
    check('Bấm thường trên nút vẫn mở hộp', await dlgOpen(vp));
    /* Vẽ lại sơ đồ (đổi lựa chọn trong hộp) giữ khung đang xem. */
    await vp.$eval('#sd-fig svg', (s) => { s.__old = true; });
    await vp.click('#sd-pane .sd-opt.is-on input');
    await vp.keyboard.press('Escape');
    await vp.waitForFunction(() => !document.querySelector('#dlg-sd').open);
    check('Vẽ lại sơ đồ giữ khung đang xem', !(await vp.$eval('#sd-fig svg', (s) => !!s.__old)) && JSON.stringify(await camView(vp)) === JSON.stringify(v4),
      JSON.stringify(await camView(vp)));
    /* Phím khi sơ đồ có focus: + phóng, - thu, mũi tên kéo, 0 về khung ban đầu. */
    await vp.click('#sd-view-reset');
    await settled(vp);
    check('Reset view sau khi phóng: về khung ban đầu', isHome(await camView(vp)));
    await vp.focus('#sd-fig');
    await vp.keyboard.press('+');
    await settled(vp);
    const kz = (await camView(vp)).k;
    await vp.keyboard.press('ArrowRight');
    await settled(vp);
    const ka = await camView(vp);
    await vp.keyboard.press('-');
    await settled(vp);
    const km = (await camView(vp)).k;
    await vp.keyboard.press('0');
    await settled(vp);
    check('Phím: + phóng, mũi tên kéo, - thu, 0 về khung ban đầu', kz > 1 && ka.x < 0 && Math.abs(km - 1) < 1e-6 && isHome(await camView(vp)), JSON.stringify({ kz, ka, km }));
    /* Cụm nút: phóng to, bấm phần trăm về 100%, thu nhỏ. */
    await vp.click('#sd-zoom-in');
    await vp.click('#sd-zoom-in');
    await settled(vp);
    const kb = (await camView(vp)).k;
    await vp.click('#sd-zoom-pct');
    await settled(vp);
    const kp = (await camView(vp)).k;
    await vp.click('#sd-zoom-out');
    await settled(vp);
    check('Cụm nút: Zoom in, bấm phần trăm về 100%, Zoom out', kb > 1.5 && Math.abs(kp - 1) < 1e-6 && (await camView(vp)).k < 1
      && /Zoom \d+%/.test(await vp.getAttribute('#sd-zoom-pct', 'aria-label')), JSON.stringify({ kb, kp }));
    /* Tải lại trang: luôn về khung ban đầu (không lưu khung nhìn). */
    await vp.click('#sd-zoom-in');
    await vp.click('#sd-zoom-in');
    await vp.focus('#sd-fig');
    await vp.keyboard.press('ArrowDown');
    await settled(vp);
    check('Trước khi tải lại khung đã đổi', !isHome(await camView(vp)));
    await vp.reload();
    await vp.waitForSelector('#sd-fig .sd-cam');
    check('Tải lại trang: về cỡ thật, góc trên trái, 100%', isHome(await camView(vp)) && (await vp.textContent('#sd-zoom-pct')).trim() === '100%'
      && !Object.keys(await vp.evaluate(() => ({ ...localStorage }))).some((k) => /view|zoom/i.test(k)));
    /* Tải SVG: không mang transform của khung nhìn. */
    await vp.click('#sd-zoom-in');
    const [dl] = await Promise.all([vp.waitForEvent('download'), vp.click('#sd-svg')]);
    const body = fs.readFileSync(await dl.path(), 'utf8');
    check('Tải SVG đang phóng: không mang transform của khung nhìn', !/scale\(/.test(body) && /viewBox="0 0 /.test(body));
    /* Tải SVG giữ chữ nghiêng ("Not decided"), chữ hoa của CSS (dải Operations); rộng, cao, viewBox là số nguyên. */
    const svgOut = await vp.evaluate((src) => {
      const d = new DOMParser().parseFromString(src, 'image/svg+xml').documentElement;
      const texts = [...d.querySelectorAll('text')];
      const nd = texts.filter((t) => /^not decided$/i.test(t.textContent.trim()));
      const band = texts.filter((t) => /^operations/i.test(t.textContent.trim()));
      return { nd: nd.length, italic: nd.every((t) => t.getAttribute('font-style') === 'italic'), band: band.map((t) => t.textContent),
        sizes: [d.getAttribute('width'), d.getAttribute('height'), ...d.getAttribute('viewBox').split(' ')] };
    }, body);
    check('Tải SVG: giữ chữ nghiêng, chữ hoa của CSS; cỡ là số nguyên', svgOut.nd > 0 && svgOut.italic && svgOut.band.length === 1
      && svgOut.band.every((t) => t === t.toUpperCase()) && svgOut.sizes.every((x) => /^\d+$/.test(x)), JSON.stringify(svgOut));
    await vx.close();
    /* 320px, theme tối: cụm nút nằm trong khung, trang không cuộn ngang, phóng được. */
    const { ctx: nx2, page: np } = await open(320, 700, { colorScheme: 'dark' });
    await np.click('#start .tpl[data-tpl="crisp-dm"]');
    await np.waitForSelector('#sd-fig svg');
    await seedDesign(np);
    await np.reload();
    await np.waitForSelector('#sd-fig .sd-cam');
    await np.click('#sd-zoom-in');
    await settled(np);
    const narrow = await np.evaluate(() => {
      const z = document.querySelector('#sd-zoom').getBoundingClientRect();
      const bg = getComputedStyle(document.querySelector('#sd-fig')).backgroundColor.match(/\d+/g).slice(0, 3).map(Number);
      return { right: z.right, vw: innerWidth, dark: Math.max(...bg) < 64 };
    });
    check('320px, theme tối: cụm nút trong khung, trang không cuộn ngang, phóng được', narrow.right <= narrow.vw && (await hOverflow(np)) <= 0
      && (await camView(np)).k > 1 && narrow.dark, JSON.stringify(narrow));
    /* Cỡ sơ đồ là tổng số lẻ (vd. 762.9999… ở vài bề rộng khung): giả cỡ lẻ trên trang, file tải về vẫn là số nguyên. */
    await np.$eval('#sd-fig svg', (s) => { s.setAttribute('data-w', String(+s.getAttribute('data-w') - 1e-4)); s.setAttribute('height', String(+s.getAttribute('height') + 0.3)); });
    const [dl2] = await Promise.all([np.waitForEvent('download'), np.click('#sd-svg')]);
    const head2 = fs.readFileSync(await dl2.path(), 'utf8').match(/<svg[^>]*>/)[0];
    const sizes2 = ['width', 'height', 'viewBox'].map((k) => (head2.match(new RegExp(` ${k}="([^"]*)"`)) || [])[1]);
    check('tải SVG khi sơ đồ rộng lẻ px: rộng, cao, viewBox là số nguyên', sizes2.every((x) => x && x.split(' ').every((n) => /^\d+$/.test(n))),
      `${sizes2.join(' | ')} (trên trang: ${await np.$eval('#sd-fig svg', (s) => s.getAttribute('data-w'))})`);
    await nx2.close();
    /* Cảm ứng: không có dấu + (không rê được); nhãn có hợp đồng vẫn bấm được. */
    const { ctx: tx, page: tp } = await open(390, 844, { hasTouch: true, isMobile: true });
    await tp.click('#start .tpl[data-tpl="crisp-dm"]');
    await tp.waitForSelector('#sd-fig svg');
    await seedDesign(tp);
    await tp.reload();
    await tp.waitForSelector('#sd-fig .sd-hand');
    check('Cảm ứng: đường trống không có dấu +, nhãn có hợp đồng vẫn hiện', await tp.$$eval('#sd-fig .sd-hand', (l) => l.every((g) =>
      (getComputedStyle(g).display === 'none') === g.classList.contains('is-empty'))));
    /* Chạm thật (CDP): một ngón kéo ngang dời khung, không mở nút dưới ngón; hai ngón xa nhau thì phóng; chạm nhẹ vẫn mở nút. */
    const cdp = await tx.newCDPSession(tp);
    const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], id) => ({ x, y, id })) });
    await tp.click('#sd-zoom-in');
    await tp.click('#sd-zoom-in');
    await settled(tp);
    await tp.$eval('#sd-fig [data-stage="process"]', (g) => g.scrollIntoView({ block: 'center' }));
    const tn = await tp.$eval('#sd-fig [data-stage="process"]', (g) => { const r = g.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    const tv0 = await camView(tp);
    await touch('touchStart', [[tn.x, tn.y]]);
    for (let i = 1; i <= 6; i++) await touch('touchMove', [[tn.x - 10 * i, tn.y]]);
    await touch('touchEnd', []);
    const tv1 = await camView(tp);
    check('Chạm (đã phóng, sơ đồ tràn khung): một ngón kéo ngang dời khung, không mở nút dưới ngón', Math.abs(tv1.x - (tv0.x - 60)) < 1 && !(await dlgOpen(tp)), JSON.stringify({ tv0, tv1 }));
    const c = await svgAt(tp, 0.5, 0.2);
    await touch('touchStart', [[c.x - 20, c.y], [c.x + 20, c.y]]);
    for (let i = 1; i <= 5; i++) await touch('touchMove', [[c.x - 20 - 8 * i, c.y], [c.x + 20 + 8 * i, c.y]]);
    await touch('touchEnd', []);
    const tv2 = await camView(tp);
    check('Chạm: hai ngón xa nhau thì phóng to', tv2.k > 1.8 && !(await dlgOpen(tp)), JSON.stringify(tv2));
    await tp.click('#sd-view-reset');
    await settled(tp);
    await tp.tap('#sd-fig [data-stage="process"]');
    check('Chạm nhẹ trên nút vẫn mở hộp', await dlgOpen(tp));
    await tx.close();
  });

  /* ── Dấu Redo qua hộp sửa: chỉ sửa Notes thì giữ dấu và số "k of n"; chuyển sang bước khác thì bỏ dấu, Hoàn tác trả lại ── */
  await section('Dấu Redo qua hộp sửa', async () => {
    const seed = { version: 2, lastId: 'wr', workspaces: [{ id: 'wr', name: 'Redo', steps: [
      { id: 'tr1', title: 'Mở lại', round: 2, revisit: { reason: 'r', date: '2026-11-20', round: 2 },
        subs: [{ id: 'sr1', title: 'Một', status: 'done' }, { id: 'sr2', title: 'Hai', status: 'todo', redo: true }, { id: 'sr3', title: 'Ba', status: 'todo', redo: true }] },
      { id: 'tr2', title: 'Khác', subs: [{ id: 'sr4', title: 'Bốn', status: 'todo' }] }], log: [] }] };
    const rc = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await rc.addInitScript((d) => { if (!localStorage.getItem('stepPlanner.v2')) localStorage.setItem('stepPlanner.v2', d); }, JSON.stringify(seed));
    const rp = await rc.newPage();
    rp.on('pageerror', (e) => errors.push(String(e)));
    await rp.goto(BASE);
    await rp.waitForSelector('#app:not([hidden]) .card[data-sub]');
    const left = () => rp.textContent('.step[data-step="tr1"] .redo-left');
    const left0 = await left();
    await rp.click(subSel('sr2', 'edit-sub'));
    await rp.fill('#sub-form [name="notes"]', 'chỉ sửa ghi chú');
    await rp.click('#sub-form button[type="submit"]');
    const sr2 = (await cur(rp)).steps[0].subs[1];
    check('Redo: chỉ sửa Notes rồi Save thì giữ dấu, số việc làm lại không đổi', left0 === '2 of 2 redo tasks left' && (await left()) === left0
      && sr2.redo && sr2.notes === 'chỉ sửa ghi chú' && !!(await rp.$('.card[data-sub="sr2"] .redo-tag')), `${left0} → ${await left()}`);
    await rp.click(subSel('sr3', 'edit-sub'));
    await rp.selectOption('#sub-form [name="step"]', 'tr2');
    await rp.click('#sub-form button[type="submit"]');
    let rw = await cur(rp);
    const moved = rw.steps[1].subs.find((x) => x.id === 'sr3');
    check('Redo: chuyển sang bước khác qua hộp sửa thì bỏ dấu (Redo chỉ có nghĩa ở bước đã mở lại)', !!moved && !moved.redo
      && (await left()) === '1 of 1 redo task left' && !(await rp.$('.card[data-sub="sr3"] .redo-tag')), await left());
    await rp.click('#toast-undo');
    rw = await cur(rp);
    check('Redo: Hoàn tác việc chuyển bước trả cả dấu', rw.steps[0].subs.find((x) => x.id === 'sr3')?.redo === true && (await left()) === '2 of 2 redo tasks left');
    await rc.close();
  });

  /* ── Hai tab sửa cùng một mục: Lưu chỉ ghi trường đã đổi; cùng trường thì hỏi; mục đã bị xoá thì hỏi tạo lại ── */
  await section('Hai tab sửa cùng một mục', async () => {
    const seed = { version: 2, lastId: 'wm', workspaces: [{ id: 'wm', name: 'Gộp', steps: [
      { id: 'tm1', title: 'Một', goal: 'g', subs: [{ id: 'sm1', title: 'Việc', status: 'todo', doneWhen: 'gốc' }, { id: 'sm2', title: 'Việc hai', status: 'todo' }] }],
    log: [{ id: 'lm1', date: '2026-11-01', decision: 'Chọn A', why: 'vì' }] }] };
    const mc = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await mc.addInitScript(countStorage);
    await mc.addInitScript((d) => { if (!localStorage.getItem('stepPlanner.v2')) localStorage.setItem('stepPlanner.v2', d); }, JSON.stringify(seed));
    const [A, B] = [await mc.newPage(), await mc.newPage()];
    for (const [n, pg] of [['A', A], ['B', B]]) { pg.on('pageerror', (e) => errors.push(n + ' ' + e)); await pg.goto(BASE); await pg.waitForSelector('.card[data-sub="sm1"]'); }
    const sm = async (id) => (await cur(A)).steps.flatMap((x) => x.subs).find((x) => x.id === id);
    // 1. A sửa Notes (chưa lưu), B đổi Done when và lưu, A lưu: giữ cả hai, không hỏi.
    await A.click(subSel('sm1', 'edit-sub'));
    await A.fill('#sub-form [name="notes"]', 'ghi chú của A');
    await B.click(subSel('sm1', 'edit-sub'));
    await B.fill('#sub-form [name="doneWhen"]', 'của B');
    await synced(A, () => B.click('#sub-form button[type="submit"]'));
    await synced(B, () => A.click('#sub-form button[type="submit"]'));
    let x = await sm('sm1');
    check('hai tab: trường khác nhau thì giữ cả hai (Done when của tab kia không bị trả về)', x.doneWhen === 'của B' && x.notes === 'ghi chú của A'
      && !(await A.isVisible('#dlg-ask')) && !(await A.isVisible('#dlg-sub')), JSON.stringify(x));
    // 2. Cùng trường: A thấy hộp hỏi liệt kê trường, Close thì hộp sửa vẫn mở; Keep the other tab's thì giữ của B, trường khác của A vẫn ghi.
    await A.click(subSel('sm1', 'edit-sub'));
    await A.fill('#sub-form [name="doneWhen"]', 'của A');
    await A.fill('#sub-form [name="title"]', 'Việc (A)');
    await B.click(subSel('sm1', 'edit-sub'));
    await B.fill('#sub-form [name="doneWhen"]', 'của B lần hai');
    await synced(A, () => B.click('#sub-form button[type="submit"]'));
    await A.click('#sub-form button[type="submit"]');
    await A.waitForSelector('#dlg-ask[open]');
    const askTxt = await A.textContent('#ask-list');
    await A.click('#dlg-ask [data-close]');
    const stillOpen = await A.isVisible('#dlg-sub') && (await A.inputValue('#sub-form [name="doneWhen"]')) === 'của A';
    await A.click('#sub-form button[type="submit"]');
    await synced(B, () => A.click('#ask-alt'));
    x = await sm('sm1');
    check('hai tab: cùng trường thì hỏi (Yours / Other tab), Close giữ hộp sửa, chọn tab kia thì giữ của nó, trường khác của mình vẫn ghi',
      /Done when/.test(askTxt) && /Yours: của A/.test(askTxt) && /Other tab: của B lần hai/.test(askTxt) && !/Title/.test(askTxt) && stillOpen
      && x.doneWhen === 'của B lần hai' && x.title === 'Việc (A)', `${askTxt} ${JSON.stringify(x)}`);
    // Keep mine.
    await A.click(subSel('sm1', 'edit-sub'));
    await A.fill('#sub-form [name="doneWhen"]', 'A thắng');
    await B.click(subSel('sm1', 'edit-sub'));
    await B.fill('#sub-form [name="doneWhen"]', 'B thua');
    await synced(A, () => B.click('#sub-form button[type="submit"]'));
    await A.click('#sub-form button[type="submit"]');
    await synced(B, () => A.click('#ask-ok'));
    check('hai tab: "Keep mine" ghi của mình, tab kia đọc lại thấy', (await sm('sm1')).doneWhen === 'A thắng'
      && /A thắng/.test(await B.textContent('.card[data-sub="sm1"]')));
    // 3. Tab kia xoá bước con trong lúc sửa: hỏi; Re-create trả nó về với chữ đã sửa.
    await A.click(subSel('sm2', 'edit-sub'));
    await A.fill('#sub-form [name="notes"]', 'đang viết');
    await synced(A, () => B.click(subSel('sm2', 'sub-del')));
    await A.click('#sub-form button[type="submit"]');
    await A.waitForSelector('#dlg-ask[open]');
    const delTitle = await A.textContent('#dlg-ask-title');
    await synced(B, () => A.click('#ask-ok'));
    x = await sm('sm2');
    check('hai tab: bước con bị xoá ở tab kia thì hỏi, Re-create trả về với chữ đã sửa', /Deleted in another tab/.test(delTitle) && x?.notes === 'đang viết'
      && !!(await A.$('.card[data-sub="sm2"]')), delTitle);
    // 4. Hộp bước: A đổi Goal, B đổi Notes của bước: giữ cả hai.
    await A.click('.step[data-step="tm1"] [data-act="edit-step"]');
    await A.fill('#step-form [name="goal"]', 'mục tiêu A');
    await B.click('.step[data-step="tm1"] [data-act="edit-step"]');
    await B.fill('#step-form [name="notes"]', 'ghi chú B');
    await synced(A, () => B.click('#step-form button[type="submit"]'));
    await synced(B, () => A.click('#step-form button[type="submit"]'));
    const st = (await cur(A)).steps[0];
    check('hai tab: hộp bước gộp trường khác nhau', st.goal === 'mục tiêu A' && st.notes === 'ghi chú B' && !(await A.isVisible('#dlg-ask')), JSON.stringify(st).slice(0, 160));
    // 5. Hộp quyết định: A sửa Why, B sửa Decision: giữ cả hai.
    await A.click('.log-item[data-log="lm1"] [data-act="edit-log"]');
    await A.fill('#log-edit-form [name="why"]', 'lý do A');
    await B.click('.log-item[data-log="lm1"] [data-act="edit-log"]');
    await B.fill('#log-edit-form [name="decision"]', 'Chọn B');
    await synced(A, () => B.click('#log-edit-form button[type="submit"]'));
    await A.click('#log-edit-form button[type="submit"]');
    const lg = (await cur(A)).log[0];
    check('hai tab: hộp quyết định gộp trường khác nhau', lg.decision === 'Chọn B' && lg.why === 'lý do A', JSON.stringify(lg));
    await mc.close();
  });

  /* ── "Next" đang chờ và lọc trạng thái: dòng "Next waits on …" khi ô đầu chỉ có thẻ chờ; lọc Actionable / Waiting, cùng với tìm ── */
  await section('"Next" đang chờ và lọc trạng thái', async () => { // thân giữ thụt lề cũ cho dễ gộp
  for (const [w, hh] of [[1280, 900], [390, 844]]) {
    const seed = { version: 2, lastId: 'wn', workspaces: [{ id: 'wn', name: 'Chờ', steps: [
      { id: 'tn1', title: 'Dữ liệu', subs: [{ id: 'sn0', title: 'Đã xong', status: 'done' }, { id: 'sn1', title: 'Chờ quyền truy cập', status: 'pending', reason: 'IT cấp quyền\ndòng hai' },
        { id: 'sn2', title: 'Làm sạch', status: 'todo' }] },
      { id: 'tn2', title: 'Báo cáo', subs: [{ id: 'sn3', title: 'Dàn ý báo cáo', status: 'todo' }, { id: 'sn4', title: 'Bị chặn', status: 'blocked' }] }], log: [] }] };
    const nc = await browser.newContext({ viewport: { width: w, height: hh }, isMobile: w < 500, hasTouch: w < 500 });
    await nc.addInitScript((d) => { if (!localStorage.getItem('stepPlanner.v2')) localStorage.setItem('stepPlanner.v2', d); }, JSON.stringify(seed));
    const np = await nc.newPage();
    np.on('pageerror', (e) => errors.push(String(e)));
    await np.goto(BASE);
    await np.waitForSelector('.card[data-sub="sn1"]');
    const tag = `Next chờ ${w}px`;
    const nw = await np.textContent('#next-wait');
    check(`${tag}: không thẻ nào "Next", dòng báo chờ thẻ nào và lý do (dòng đầu), có nút xem việc làm được`, !(await np.$('.card.next'))
      && await np.isVisible('#next-wait') && /^Next waits on Chờ quyền truy cập \(Pending: IT cấp quyền\)\./.test(nw.trim()) && /Show what can be done now \(2\)/.test(nw), nw);
    await np.click('#next-wait [data-act="show-act"]');
    const shownIds = () => np.$$eval('.card[data-sub]', (cs) => cs.map((c) => c.dataset.sub).join());
    check(`${tag}: "Show what can be done now" lọc Actionable: chỉ New / In progress, tắt sắp xếp và thêm bước`, (await shownIds()) === 'sn2,sn3'
      && (await np.textContent('.st-filter .dd-btn')).trim() === 'Actionable' && /reordering is off while filtering/.test(await np.textContent('#filter-note'))
      && !(await np.isVisible('#add-step')) && !(await np.$('.step-grip')) && !(await np.isVisible('#next-wait [data-act="show-act"]')), await shownIds());
    // Không nút lọc (đang lọc Actionable): dòng kết thúc bằng dấu chấm, không có chữ "false" của điều kiện rỗng.
    check(`${tag}: lọc Actionable: dòng "Next waits on" không in "false" / "null"`, /\.$/.test((await np.textContent('#next-wait')).trim()), await np.textContent('#next-wait'));
    await np.click('.st-filter .dd-btn');
    await np.click('.dd-pop [role="option"][data-value="wait"]');
    check(`${tag}: lọc Waiting: Pending và Blocked`, (await shownIds()) === 'sn1,sn4', await shownIds());
    await np.fill('#q', 'chặn');
    check(`${tag}: lọc cùng với tìm: giao của hai`, (await shownIds()) === 'sn4', await shownIds());
    await np.fill('#q', 'làm sạch');
    check(`${tag}: không thẻ nào khớp: nút "Clear filters" bỏ cả hai`, /No sub-step matches/.test(await np.textContent('#board')) && (await np.textContent('#board [data-act="clear-filter"]')) === 'Clear filters');
    await np.click('#board [data-act="clear-filter"]');
    check(`${tag}: bỏ lọc: mọi thẻ, ô tìm trống, lọc về All statuses`, (await shownIds()) === 'sn0,sn1,sn2,sn3,sn4' && (await np.inputValue('#q')) === ''
      && (await np.textContent('.st-filter .dd-btn')).trim() === 'All statuses');
    await np.click('.st-filter .dd-btn');
    await np.click('.dd-pop [role="option"][data-value="done"]');
    await np.click('#next-wait [data-goto="sn1"]');
    check(`${tag}: bấm tên thẻ đang chờ: bỏ lọc nếu nó bị ẩn, focus vào thẻ`, await np.evaluate(() => document.activeElement?.closest('.card')?.dataset.sub) === 'sn1'
      && (await shownIds()).split(',').length === 5);
    check(`${tag}: trang không tràn ngang`, (await hOverflow(np)) <= 0);
    await nc.close();
  }
  });

  /* ── Bằng chứng nghiệm thu: xong mà "Done when" chưa có bằng chứng thì toast gợi ý (không chặn); tài liệu đánh dấu Evidence;
   * thẻ xong có dấu bằng chứng và ngày xong; rời Done thì bỏ ngày ── */
  await section('Bằng chứng nghiệm thu', async () => {
    const seed = { version: 2, lastId: 'we', workspaces: [{ id: 'we', name: 'Bằng chứng', steps: [{ id: 'te1', title: 'Mô hình', subs: [
      { id: 'se1', title: 'Huấn luyện', status: 'doing', doneWhen: 'AUC ≥ 0,8 trên tập kiểm định', docs: [{ id: 'de1', kind: 'link', title: 'Lần chạy 12', url: 'https://runs.example/12' }] },
      { id: 'se2', title: 'Không tiêu chí', status: 'doing' }] }], log: [] }] };
    const ec = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ec.addInitScript((d) => { if (!localStorage.getItem('stepPlanner.v2')) localStorage.setItem('stepPlanner.v2', d); }, JSON.stringify(seed));
    const ep = await ec.newPage();
    ep.on('pageerror', (e) => errors.push(String(e)));
    await ep.goto(BASE);
    await ep.waitForSelector('.card[data-sub="se1"]');
    const today = await ep.evaluate(async () => (await import(new URL('js/core/model.js', location.href).href)).today());
    const se = async (id) => (await cur(ep)).steps[0].subs.find((x) => x.id === id);
    await ep.click(subSel('se2', 'status'));
    check('bằng chứng: xong mà không có Done when thì không gợi ý', !(await ep.isVisible('#toast')) && (await se('se2')).doneAt === today);
    await ep.click(subSel('se1', 'status'));
    const t1 = { text: await ep.textContent('#toast-text'), btn: await ep.textContent('#toast-undo'), x: await se('se1') };
    await ep.keyboard.press('Control+z');
    check('bằng chứng: xong mà Done when chưa có bằng chứng thì toast "Add evidence", không chặn; ghi ngày xong; Ctrl+Z không bấm nút ấy',
      /Add evidence for "Huấn luyện"/.test(t1.text) && t1.btn === 'Add evidence' && t1.x.status === 'done' && t1.x.doneAt === today
      && (await se('se1')).status === 'done' && !(await ep.$('.card[data-sub="se1"] .proof-tag')), JSON.stringify(t1).slice(0, 200));
    await ep.click('#toast-undo');
    check('bằng chứng: nút của toast mở hộp sửa ở phần tài liệu', await ep.isVisible('#dlg-sub') && await ep.evaluate(() => !!document.activeElement?.closest('#sub-docs')));
    await ep.click('#sub-docs [data-doc="de1"] [data-doc-act="proof"]');
    const pressed = await ep.getAttribute('#sub-docs [data-doc="de1"] [data-doc-act="proof"]', 'aria-pressed');
    // Sửa link đã đánh dấu: vẫn là bằng chứng.
    await ep.click('#sub-docs [data-doc="de1"] [data-doc-act="open"]');
    await ep.fill('#doc-form [name="title"]', 'Lần chạy 12 (AUC 0,83)');
    await ep.click('#doc-form button[type="submit"]');
    await ep.keyboard.press('Escape');
    const d1 = (await se('se1')).docs[0];
    const tag = await ep.getAttribute('.card[data-sub="se1"] .proof-tag', 'aria-label');
    const doneTxt = await ep.textContent('.card[data-sub="se1"] .done-at');
    check('bằng chứng: bật Evidence lưu ngay, sửa link vẫn giữ; thẻ xong có dấu bằng chứng (aria-label) và ngày xong',
      pressed === 'true' && d1.proof === true && d1.title === 'Lần chạy 12 (AUC 0,83)' && tag === 'Evidence: Lần chạy 12 (AUC 0,83)'
      && /^done \d{1,2} \w{3} \d{4}$/.test(doneTxt), `${pressed} ${tag} ${doneTxt}`);
    const md = await ep.evaluate(async () => {
      const C = await import(new URL('js/core/markdown.js', location.href).href);
      const s = JSON.parse(localStorage.getItem('stepPlanner.v2'));
      return C.toMarkdown(s.workspaces[0]);
    });
    check('bằng chứng: Markdown xuất "· done YYYY-MM-DD" và "[Evidence: …](…)"', md.includes(`- [x] Huấn luyện · done ${today}`) && md.includes('- [Evidence: Lần chạy 12 (AUC 0,83)](https://runs.example/12)'), md.slice(0, 300));
    await setSt(ep, 'se1', 'doing');
    check('bằng chứng: rời Done thì bỏ ngày xong và dấu bằng chứng (tài liệu vẫn là bằng chứng)', (await se('se1')).doneAt === ''
      && !(await ep.$('.card[data-sub="se1"] .proof-tag')) && !(await ep.$('.card[data-sub="se1"] .done-at')) && (await se('se1')).docs[0].proof);
    await ec.close();
  });

  /* ── Bàn giao: khai đầu ra trên thẻ A (bước 1), dùng ở bước 2 và ở thẻ song song; vạch giữa hai hàng, nút giữa hai ô, chip,
   * danh sách và lối nhảy (bỏ lọc nếu cần), tìm theo tên đầu ra, kéo bước giữ liên kết, xoá + Hoàn tác, mở lại có "Also
   * check", Markdown và JSON đi rồi về, 390px ── */
  await section('Bàn giao', async () => {
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const seed = { id: 'wh', name: 'Handoff', steps: [
      { id: 'h1', title: 'Clean data', outs: [{ id: 'oS', name: 'clean schema' }],
        subs: [{ id: 'hA', title: 'Build snapshot', status: 'done' }, { id: 'hB', title: 'Profile columns' }, { id: 'hC', title: 'Quality report', par: true }] },
      { id: 'h2', title: 'Backend', subs: [{ id: 'hD', title: 'Read snapshot in API' }, { id: 'hE', title: 'Season endpoint' }] },
      { id: 'h3', title: 'Report', ins: ['oS'], subs: [{ id: 'hF', title: 'Write up' }] },
    ], log: [] };
    const seedInit = (d) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('stepPlanner.v2', JSON.stringify({ version: 2, workspaces: [d], lastId: d.id })); } };
    const hc = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1, permissions: ['clipboard-read', 'clipboard-write'] });
    await hc.addInitScript(seedInit, seed);
    const hp = await hc.newPage();
    hp.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    hp.on('pageerror', (e) => errors.push(String(e)));
    await hp.goto(BASE);
    await hp.waitForSelector('.card[data-sub="hA"]');
    const subOf = (w, id) => w.steps.flatMap((s) => s.subs).find((x) => x.id === id);

    // Khai đầu ra: thêm, tên trống thì Save không qua; đóng khi chưa lưu thì hỏi lại; lưu cùng nút Save.
    await hp.click('.card[data-sub="hA"] [data-act="edit-sub"]');
    await hp.click('#sub-hand [data-out-add]');
    await hp.fill('#sub-hand .out-row:last-child [data-k="name"]', 'matches.parquet');
    await hp.fill('#sub-hand .out-row:last-child [data-k="ref"]', 'data/clean/matches.parquet');
    await hp.fill('#sub-hand .out-row:last-child [data-k="note"]', 'one row per match, key match_id');
    await hp.click('#sub-hand [data-out-add]');
    await hp.click('#sub-form button[type="submit"]');
    const blocked = await hp.evaluate(() => document.getElementById('dlg-sub').open && document.activeElement?.dataset.k === 'name');
    await hp.click('#sub-hand .out-row:last-child [data-out-del]');
    await hp.keyboard.press('Escape');
    const asked = await hp.evaluate(() => document.getElementById('dlg-ask').open);
    await hp.click('#dlg-ask [data-close]');
    await hp.click('#sub-form button[type="submit"]');
    let w = await cur(hp);
    const outId = subOf(w, 'hA').outs[0]?.id;
    check('bàn giao: đầu ra khai trong hộp sửa, tên bắt buộc, đóng chưa lưu thì hỏi, lưu cùng Save', blocked && asked && /^o/.test(outId || '')
      && same(subOf(w, 'hA').outs.map(({ name, ref, note }) => ({ name, ref, note })), [{ name: 'matches.parquet', ref: 'data/clean/matches.parquet', note: 'one row per match, key match_id' }]),
      JSON.stringify({ blocked, asked, outs: subOf(w, 'hA').outs }));

    // Dùng đầu ra ấy ở bước 2 (D) và ở thẻ song song của ô kế bên (C).
    const useOut = async (id) => {
      await hp.click(`.card[data-sub="${id}"] [data-act="edit-sub"]`);
      await hp.click('#sub-hand [data-in-pick]');
      await hp.check(`#pick-groups input[value="${outId}"]`);
      await hp.click('#pick-ok');
      const chip = await hp.textContent('#sub-hand [data-ins]');
      await hp.click('#sub-form button[type="submit"]');
      return chip;
    };
    const chipD = await useOut('hD');
    await useOut('hC');
    w = await cur(hp);
    check('bàn giao: chọn đầu ra có sẵn làm đầu vào (chip ghi tên và bên giao)', /matches\.parquet/.test(chipD) && /from Build snapshot/.test(chipD)
      && same(subOf(w, 'hD').ins, [outId]) && same(subOf(w, 'hC').ins, [outId]));
    const marks = () => hp.evaluate(() => ({
      row: [...document.querySelectorAll('[data-act="hand-row"]')].map((b) => b.closest('[data-step]').dataset.step + ':' + b.textContent),
      gap: [...document.querySelectorAll('[data-act="hand-gap"]')].map((b) => b.closest('[data-step]').dataset.step + ':' + b.dataset.gap + ':' + b.textContent),
      tags: [...document.querySelectorAll('.hand-tag')].map((b) => (b.closest('[data-sub]') ? 'card ' : '') + b.closest('[data-step]').dataset.step + ':' + b.textContent),
      gapW: [...document.querySelectorAll('.hand-gap')].map((g) => Math.round(g.getBoundingClientRect().width - document.querySelector('.slot:not(.par)').getBoundingClientRect().width)),
    }));
    const m1 = await marks();
    check('bàn giao: mũi tên trên bước nhận (cả từ bước xa hơn), ô mũi tên rộng bằng thẻ trước ô nhận, nút ghi tên đầu ra; thẻ không có chip In / Out',
      same(m1.row, ['h2:matches.parquet', 'h3:clean schema']) && same(m1.gap, ['h1:0:matches.parquet']) && same(m1.gapW, [0])
      && same(m1.tags, ['h1:Out 1', 'h3:In 1']), JSON.stringify(m1));

    // Nút giữa hai ô: danh sách cặp; chọn dòng thì đóng hộp, tô cả hai thẻ, focus bên nhận, không cuộn trang lẫn hàng thẻ.
    // Khung nhìn hẹp, thẻ nhận lấn ra ngoài mép dưới trang và mép phải hàng thẻ: cách cũ (cuộn tới) phải cuộn cả hai.
    // off: thẻ nhận lấn ra ngoài mép dưới khung nhìn, mép phải hàng thẻ bao nhiêu px; tên thẻ (chỗ focus) nằm hẳn ngoài mép phải
    // hàng thẻ: focus mà không preventScroll là hàng thẻ cuộn.
    const scrollPos = () => hp.evaluate(() => {
      const c = document.querySelector('.card[data-sub="hC"]').getBoundingClientRect();
      const t = document.querySelector('.card[data-sub="hC"] [data-act="edit-sub"]').getBoundingClientRect();
      const row = document.querySelector('.card[data-sub="hC"]').closest('.cards-scroll');
      const rr = row.getBoundingClientRect();
      return { x: scrollX, y: scrollY, row: row.scrollLeft, off: [Math.round(c.bottom - innerHeight), Math.round(c.right - rr.right), Math.round(t.left - rr.right)] };
    });
    await hp.setViewportSize({ width: 760, height: 600 });
    await hp.evaluate(() => {
      const c = document.querySelector('.card[data-sub="hC"]');
      window.scrollBy(0, c.getBoundingClientRect().bottom - innerHeight - 12);
      const row = c.closest('.cards-scroll');
      row.scrollLeft += c.querySelector('[data-act="edit-sub"]').getBoundingClientRect().left - row.getBoundingClientRect().right - 8;
      const g = document.querySelector('[data-act="hand-gap"]'); // bấm qua DOM: hp.click tự cuộn nút vào khung nhìn
      g.focus({ preventScroll: true });
      g.click();
    });
    const pairTxt = await hp.textContent('#hand-list');
    const pos0 = await scrollPos();
    await hp.click('#hand-list .hand-pair');
    await hp.waitForTimeout(300);
    const hi = await hp.evaluate(() => ({ hi: [...document.querySelectorAll('.hand-hi')].map((e) => e.dataset.sub).sort(),
      focus: document.activeElement.closest('.card')?.dataset.sub, open: document.getElementById('dlg-hand').open }));
    const pos1 = await scrollPos();
    await hp.setViewportSize({ width: 1280, height: 1000 });
    check('bàn giao: nút giữa hai ô — cặp A → C, chọn dòng tô cả hai, focus bên nhận, không cuộn', /Build snapshot.*Quality report.*matches\.parquet/.test(pairTxt)
      && same(hi.hi, ['hA', 'hC']) && hi.focus === 'hC' && !hi.open && pos0.off.every((d) => d > 0) && same(pos1, pos0), JSON.stringify({ hi, pos0, pos1 }) + pairTxt);
    // Mũi tên trên bước 2: đường dẫn (không phải link thì chữ mono), hợp đồng, hai bên.
    await hp.click('.step[data-step="h2"] [data-act="hand-row"]');
    const inInfo = await hp.evaluate(() => ({ t: document.getElementById('hand-list').textContent, links: document.querySelectorAll('#hand-list a').length,
      code: document.querySelector('#hand-list code')?.textContent, title: document.getElementById('dlg-hand-title').textContent, edit: document.getElementById('hand-edit').hidden }));
    await hp.keyboard.press('Escape');
    check('bàn giao: mũi tên trên bước — đường dẫn, hợp đồng, bên giao → bên nhận', inInfo.links === 0 && inInfo.code === 'data/clean/matches.parquet'
      && /Contract one row per match/.test(inInfo.t) && /Build snapshot.*Read snapshot in API/.test(inInfo.t) && /From the step above/.test(inInfo.title) && inInfo.edit, JSON.stringify(inInfo));
    // Chip In của bước: "Edit step" mở hộp sửa ở phần Inputs.
    await hp.click('.step[data-step="h3"] [data-act="hand-in"]');
    const inTxt = await hp.textContent('#hand-list');
    await hp.click('#hand-edit');
    const toHand = await hp.evaluate(() => document.getElementById('dlg-step').open && document.activeElement?.hasAttribute('data-in-pick'));
    await hp.keyboard.press('Escape');
    check('bàn giao: chip In của bước — bên giao; "Edit step" mở hộp sửa ở phần Inputs', /clean schema.*From Clean data/.test(inTxt) && toHand, inTxt);
    // Tìm theo tên đầu ra; nhảy tới nơi dùng đang bị lọc ẩn thì bỏ lọc.
    await hp.fill('#q', 'matches.parquet');
    const found = await hp.$$eval('.card[data-sub]', (cs) => cs.map((c) => c.dataset.sub));
    await hp.click('.step[data-step="h1"] [data-act="hand-out"]');
    const usedTxt = await hp.textContent('#hand-list .hand-used');
    await hp.locator('#hand-list .hand-who', { hasText: 'Report' }).click();
    const jumped = await hp.evaluate(() => ({ q: document.getElementById('q').value, act: document.activeElement.dataset.act, step: document.activeElement.closest('[data-step]')?.dataset.step }));
    check('bàn giao: tìm khớp tên đầu ra; chip Out liệt kê nơi dùng, nhảy tới bước bị lọc thì bỏ lọc', same(found, ['hA']) && /Used by.*Report/.test(usedTxt)
      && jumped.q === '' && jumped.act === 'edit-step' && jumped.step === 'h3', JSON.stringify({ found, usedTxt, jumped }));
    // Nơi dùng bị lọc trạng thái ẩn (Done: bước Report không còn thẻ nào): nhảy tới thì bỏ cả lọc trạng thái.
    await hp.click('.st-filter .dd-btn');
    await hp.click('.dd-pop [role="option"][data-value="done"]');
    const hiddenH3 = !(await hp.$('.step[data-step="h3"]'));
    await hp.click('.step[data-step="h1"] [data-act="hand-out"]');
    await hp.locator('#hand-list .hand-who', { hasText: 'Report' }).click();
    const jumpedSt = await hp.evaluate(() => ({ st: document.querySelector('.st-filter .dd-btn').textContent.trim(), act: document.activeElement.dataset.act,
      step: document.activeElement.closest('[data-step]')?.dataset.step }));
    check('bàn giao: nhảy tới nơi dùng bị lọc trạng thái ẩn thì bỏ lọc trạng thái (All statuses), focus vào nó', hiddenH3
      && jumpedSt.st === 'All statuses' && jumpedSt.act === 'edit-step' && jumpedSt.step === 'h3', JSON.stringify({ hiddenH3, jumpedSt }));

    // Đang kéo thẻ: mũi tên thu hẳn lại, các ô trong hàng khít nhau (không có khoảng trống rộng bằng thẻ); Esc huỷ, mũi tên về.
    await hp.locator('.card[data-sub="hA"]').scrollIntoViewIfNeeded();
    await hp.evaluate(() => window.scrollBy(0, -200));
    const ca = await hp.locator('.card[data-sub="hA"]').boundingBox();
    await hp.mouse.move(ca.x + 24, ca.y + 24);
    await hp.mouse.down();
    await hp.mouse.move(ca.x + 44, ca.y + 34, { steps: 4 });
    await hp.waitForFunction(() => document.body.classList.contains('dragging-any'));
    await waitTo(hp, 'hoạt ảnh lúc bắt đầu kéo chạy xong', () => document.getAnimations().every((a) => a.playState !== 'running'));
    const mid = await hp.evaluate(() => {
      const lis = [...document.querySelectorAll('.step[data-step="h1"] .cards > li')].filter((li) => getComputedStyle(li).display !== 'none' && !li.classList.contains('drag-src'));
      const rs = lis.map((li) => li.getBoundingClientRect());
      return { arrows: [...document.querySelectorAll('.hand-row, .hand-gap')].filter((e) => getComputedStyle(e).display !== 'none').length,
        maxGap: Math.max(...rs.slice(1).map((r, k) => Math.round(r.left - rs[k].right))) };
    });
    await hp.keyboard.press('Escape');
    await hp.mouse.up();
    await hp.waitForFunction(() => !document.body.classList.contains('dragging-any'));
    const afterEsc = await marks();
    check('bàn giao: đang kéo thẻ thì mũi tên thu lại, ô khít nhau; Esc thì mũi tên về', mid.arrows === 0 && mid.maxGap <= 16 && same(afterEsc, m1), JSON.stringify({ mid, afterEsc }));
    // Thẻ của bước có dải mũi tên ngay trên nó: dải thu lại mà ô viền đứt vẫn ở hàng con trỏ (trang cuộn bù); Esc về đúng chỗ.
    await hp.evaluate(() => window.scrollBy(0, document.querySelector('.card[data-sub="hF"]').getBoundingClientRect().top - 500));
    const cf = await hp.locator('.card[data-sub="hF"]').boundingBox();
    const ownRow = await hp.evaluate(() => !!document.querySelector('.step[data-step="h3"] .hand-row') && scrollY > 200);
    await hp.mouse.move(cf.x + 24, cf.y + 24);
    await hp.mouse.down();
    await hp.mouse.move(cf.x + 34, cf.y + 30, { steps: 3 });
    await hp.waitForFunction(() => document.body.classList.contains('dragging-any'));
    const phRow = await hp.evaluate(() => document.querySelector('.drop-ph').getBoundingClientRect().top);
    await hp.keyboard.press('Escape');
    await hp.mouse.up();
    await hp.waitForFunction(() => !document.body.classList.contains('dragging-any'));
    const cfBack = (await hp.locator('.card[data-sub="hF"]').boundingBox()).y;
    check('bàn giao: kéo thẻ dưới dải mũi tên — ô viền đứt ở hàng con trỏ (lệch ≤ 3px), Esc thẻ về đúng chỗ', ownRow
      && Math.abs(phRow - cf.y) <= 3 && Math.abs(cfBack - cf.y) <= 1, JSON.stringify({ ownRow, card: cf.y, phRow, cfBack }));

    // Kéo bước 2 lên đầu: liên kết theo id giữ nguyên, vạch tính lại (bên nhận nằm trên bên giao: không còn vạch); Hoàn tác về chỗ cũ.
    const g = await hp.locator('.step[data-step="h2"] .step-grip').boundingBox();
    const t = await hp.locator('.step[data-step="h1"]').boundingBox();
    await hp.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
    await hp.mouse.down();
    await hp.mouse.move(g.x + 10, g.y + 6, { steps: 2 });
    await hp.mouse.move(t.x + 40, t.y + 10, { steps: 8 });
    await hp.mouse.up();
    await hp.waitForFunction(() => !document.body.classList.contains('dragging-any'));
    w = await cur(hp);
    const m2 = await marks();
    const heldToast = await hp.textContent('#toast-text');
    await hp.click('.card[data-sub="hD"] [data-act="edit-sub"]');
    const heldChip = await hp.evaluate(() => { const c = document.querySelector('#sub-hand .in-chip'); return { held: c?.classList.contains('held'), t: c?.textContent }; });
    await hp.keyboard.press('Escape');
    check('bàn giao: xếp bên nhận lên trước bên giao — toast báo đầu vào treo, hộp sửa đánh dấu, liên kết vẫn giữ',
      /Input on hold: "Read snapshot in API" now comes before "Build snapshot"/.test(heldToast) && heldChip.held && /on hold/.test(heldChip.t),
      JSON.stringify({ heldToast, heldChip }));
    check('bàn giao: kéo đổi chỗ bước giữ liên kết, vạch tính lại', same(w.steps.map((s) => s.id), ['h2', 'h1', 'h3']) && same(subOf(w, 'hD').ins, [outId])
      && same(m2.row, ['h3:clean schema']) && same(m2.gap, ['h1:0:matches.parquet']), JSON.stringify(m2));
    await hp.keyboard.press('Control+z');
    await hp.waitForFunction(() => document.querySelector('#board > .step')?.dataset.step === 'h1');

    // Xoá bên giao: chip, vạch, nút biến mất; Hoàn tác trả cả liên kết.
    await hp.click('.card[data-sub="hA"] [data-act="edit-sub"]');
    await hp.click('#sub-del');
    const m3 = await marks();
    await hp.click('#toast-undo');
    const m4 = await marks();
    w = await cur(hp);
    check('bàn giao: xoá bên giao thì mũi tên của nó biến mất; Hoàn tác trả lại', same(m3, { row: ['h3:clean schema'], gap: [], tags: m1.tags, gapW: [] }) && same(m4, m1)
      && same(subOf(w, 'hD').ins, [outId]) && same(subOf(w, 'hC').ins, [outId]), JSON.stringify({ m3, m4 }));

    // Mở lại bước 1, chọn làm lại A: "Also check" liệt kê nơi dùng đầu ra của A, ghi vào nhật ký; Hoàn tác.
    await hp.click('.step[data-step="h1"] .step-head [data-act="revisit"]');
    const also0 = await hp.textContent('#revisit-also-text');
    await hp.check('#revisit-list input[value="hA"]');
    const also1 = await hp.textContent('#revisit-also-text');
    await hp.fill('#revisit-form [name="reason"]', 'schema changed');
    await hp.click('#revisit-form button[type="submit"]');
    w = await cur(hp);
    const why = w.log.at(-1)?.why || '';
    check('bàn giao: mở lại — "Also check" theo đầu ra của bước và bước con chọn làm lại, ghi vào nhật ký', also0 === 'step "Report"'
      && also1 === '"Quality report" in "Clean data", "Read snapshot in API" in "Backend", step "Report"'
      && why === `schema changed\nAlso check: ${also1}`, JSON.stringify({ also0, also1, why }));
    await hp.click('#toast-undo');

    // Markdown và JSON đi rồi về: đầu vào vẫn trỏ đúng đầu ra.
    await hp.click('#export-btn');
    const md = await hp.inputValue('#export-text');
    await hp.check('input[name="export-kind"][value="json"]');
    const json = await hp.inputValue('#export-text');
    await hp.click('#dlg-export [data-close]');
    const before = await shape(hp, await cur(hp));
    const back = [];
    for (const text of [md, json]) {
      await hp.click('#import-btn');
      await hp.$eval('#import-text', (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, text);
      await hp.click('#import-go');
      back.push(await shape(hp, await cur(hp)));
    }
    check('bàn giao: Markdown có Outputs / Inputs; Markdown và JSON đi rồi về giữ liên kết', /\n {2}Outputs:\n {4}- matches\.parquet · data\/clean\/matches\.parquet {2}\n {6}one row per match, key match_id\n/.test(md)
      && /\n {2}Inputs:\n {4}- matches\.parquet ← Build snapshot\n/.test(md) && back.every((b) => same({ ...b, name: '' }, { ...before, name: '' })) && same(before.steps[1].subs[0].ins, ['0.0.0']),
      md.split('\n').filter((l) => /Outputs|Inputs|←/.test(l)).join(' / '));
    await hc.close();

    // 390px: không tràn ngang, nút bàn giao đủ vùng bấm, danh sách ghi đủ tên.
    const mc = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const linked = JSON.parse(JSON.stringify(seed));
    linked.steps[0].subs[0].outs = [{ id: 'oX', name: 'matches.parquet with a rather long name for phones', ref: 'https://example.com/snapshots/matches' }];
    linked.steps[0].subs[2].ins = ['oX'];
    linked.steps[1].subs[0].ins = ['oX'];
    await mc.addInitScript(seedInit, linked);
    const mp = await mc.newPage();
    mp.on('pageerror', (e) => errors.push(String(e)));
    await mp.goto(BASE);
    await mp.waitForSelector('[data-act="hand-row"]');
    const hits = await mp.evaluate(() => [...document.querySelectorAll('[data-act="hand-row"], [data-act="hand-gap"], .hand-tag')].map((el) => {
      el.scrollIntoView({ block: 'center', inline: 'center' });
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const at = (x, y) => { const t = document.elementFromPoint(x, y); return !!t && (t === el || el.contains(t)); };
      const ok = (r.height >= 44 || (at(cx, cy - 21.5) && at(cx, cy + 21.5))) && (r.width >= 44 || (at(cx - 21.5, cy) && at(cx + 21.5, cy)));
      return ok ? '' : `${el.dataset.act} ${Math.round(r.width)}x${Math.round(r.height)}`;
    }).filter(Boolean));
    await mp.evaluate(() => window.scrollTo(0, 0));
    const ov0 = await hOverflow(mp);
    await mp.click('[data-act="hand-row"]');
    const sheet = await mp.$eval('#dlg-hand', (d) => ({ right: d.getBoundingClientRect().right <= innerWidth, cut: [...d.querySelectorAll('.hand-item *')].filter((e) => e.scrollWidth > e.clientWidth + 1).length,
      t: d.querySelector('#hand-list').textContent, link: d.querySelector('#hand-list a')?.target }));
    check('bàn giao 390px: không tràn ngang, nút ≥ 44px, danh sách ghi đủ bên giao, đầu ra, bên nhận; link mở tab mới', ov0 === 0 && hits.length === 0
      && sheet.right && sheet.cut === 0 && /Build snapshot.*Read snapshot in API.*matches\.parquet with a rather long name for phones/.test(sheet.t) && sheet.link === '_blank',
      JSON.stringify({ ov0, hits, sheet }));
    await mc.close();

    // Nút giữa hai ô: dài tối đa nửa nét đứt, nằm giữa; tên dài mờ dần ở đuôi, icon và "+n" hiện đủ; tên ngắn không mờ; cả Compact.
    const longName = 'matches_with_odds_and_lineups_2019_2024.parquet';
    const faded = JSON.parse(JSON.stringify(seed));
    faded.steps[0].subs = [
      { id: 'fA', title: 'Build snapshot', outs: [{ id: 'oL', name: longName }, { id: 'oL2', name: 'teams.csv' }] },
      { id: 'fB', title: 'Profile columns', ins: ['oL', 'oL2'], outs: [{ id: 'oT', name: 'x.csv' }] },
      { id: 'fC', title: 'Quality report', ins: ['oT'] },
    ];
    const fc = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
    await fc.addInitScript(seedInit, faded);
    const fp = await fc.newPage();
    fp.on('pageerror', (e) => errors.push(String(e)));
    await fp.goto(BASE);
    await fp.waitForSelector('[data-act="hand-gap"]');
    await fp.evaluate(() => document.fonts.ready);
    const gapFit = () => fp.evaluate(() => [...document.querySelectorAll('.hand-gap')].map((g) => {
      const b = g.querySelector('.hand-btn'), n = b.querySelector('.hand-btn-name'), more = b.querySelector('.hand-btn-more'), ic = b.querySelector('svg');
      const br = b.getBoundingClientRect(), gr = g.getBoundingClientRect(), mask = (el) => getComputedStyle(el).getPropertyValue('mask-image');
      const inside = (el) => { const r = el.getBoundingClientRect(); return r.left >= br.left && r.right <= br.right && r.width > 0; };
      return { name: n.textContent, w: Math.round(gr.width - document.querySelector('.slot:not(.par)').getBoundingClientRect().width), label: b.title.includes(n.textContent), half: br.width <= parseFloat(getComputedStyle(g, '::before').width) / 2 + 1,
        mid: Math.abs(br.left + br.width / 2 - (gr.left + gr.width / 2)) <= 1, fade: n.classList.contains('cut') && mask(n) !== 'none',
        icon: inside(ic), more: !more || (inside(more) && more.scrollWidth <= more.clientWidth && mask(more) === 'none') };
    }));
    const fitOk = (r) => r.length === 2 && r.every((x) => x.w === 0 && x.label && x.half && x.mid && x.icon && x.more)
      && r[0].name === longName && r[0].fade && r[1].name === 'x.csv' && !r[1].fade;
    const fit0 = await gapFit();
    await fp.click('#compact-btn');
    await fp.waitForSelector('.board.compact');
    const fit1 = await gapFit();
    check('bàn giao: ô mũi tên giữ rộng bằng thẻ; nút giữa hai ô dài tối đa nửa nét đứt, ở giữa; tên dài mờ ở đuôi, icon và "+n" đủ; tên ngắn không mờ (thường, Compact)',
      fitOk(fit0) && fitOk(fit1), JSON.stringify({ fit0, fit1 }));
    await fc.close();

    // Hai chấm đầu vào → đầu ra: mỗi trạng thái trên thẻ và đầu bước; kéo / dời tạo liên kết treo thì chấm đổi ngay; xoá bên giao
    // thì đầu vào thành lỗi, Hoàn tác trả lại; không có cả hai thì không có chấm; chấm nằm trước chip, cùng hàng (thường, Compact, 390px).
    const ioSeed = { id: 'wi', name: 'IO', steps: [
      { id: 'g1', title: 'Collect', subs: [{ id: 'gA', title: 'Fetch', outs: [{ id: 'oF', name: 'raw.csv' }] }, { id: 'gI', title: 'Check raw', ins: ['oF'] },
        { id: 'gN', title: 'Neither' }, { id: 'gB', title: 'Spec', outs: [{ id: 'oU', name: 'unused.md' }] }] },
      { id: 'g2', title: 'Model', ins: ['oF'], subs: [{ id: 'gC', title: 'Train', ins: ['oF'], outs: [{ id: 'oM', name: 'model.pkl' }] }, { id: 'gD', title: 'Late input', ins: ['oL'] }] },
      { id: 'g3', title: 'Ship', subs: [{ id: 'gE', title: 'Late producer', outs: [{ id: 'oL', name: 'late.json' }] }, { id: 'gF', title: 'Deploy', ins: ['oM'] }] },
      { id: 'g4', title: 'Orphan', subs: [{ id: 'gG', title: 'Dead end', outs: [{ id: 'oZ', name: 'z.bin' }, { id: 'oZ2', name: 'z2.bin' }] }] },
    ], log: [] };
    const ic = await browser.newContext({ viewport: { width: 1600, height: 1400 }, deviceScaleFactor: 1 });
    await ic.addInitScript(seedInit, ioSeed);
    const ip = await ic.newPage();
    ip.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    ip.on('pageerror', (e) => errors.push(String(e)));
    await ip.goto(BASE);
    await ip.waitForSelector('.card[data-sub="gA"]');
    /* Trạng thái đọc từ chấm thấy được: chấm trái là `.io-dot.in`, chấm phải là `.io-dot.out` (theo vị trí trên màn hình), lớp
     * ok / bad / none của từng chấm; lệch với data-io-in / data-io-out của khối thì ghi rõ chỗ lệch. */
    const ioOf = () => ip.evaluate(() => {
      const o = {};
      const st = (d) => ['ok', 'bad', 'none'].filter((c) => d.classList.contains(c)).join('+') || '?';
      const read = (el, k) => {
        const io = el.querySelector(':scope > .io');
        if (!io) { o[k] = '-'; return; }
        const [l, r, ...rest] = [...io.querySelectorAll('.io-dot')].sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
        const data = `${io.dataset.ioIn}/${io.dataset.ioOut}`;
        if (rest.length || !r || !l.classList.contains('in') || !r.classList.contains('out') || l.getBoundingClientRect().right > r.getBoundingClientRect().left) o[k] = `${data}: sides`;
        else o[k] = `${st(l)}/${st(r)}` === data ? data : `${data}: dots ${st(l)}/${st(r)}`;
      };
      for (const c of document.querySelectorAll('.card[data-sub]')) read(c.querySelector('.card-top'), c.dataset.sub);
      for (const s of document.querySelectorAll('.step[data-step]')) read(s.querySelector('.step-top'), s.dataset.step);
      return o;
    });
    const labelOf = (sel) => ip.$eval(sel, (el) => ({ a: el.getAttribute('aria-label'), t: el.title, role: el.getAttribute('role') }));
    const io0 = await ioOf();
    const want0 = { gA: 'none/ok', gI: 'ok/none', gN: '-', gB: 'none/bad', gC: 'ok/ok', gD: 'bad/none', gE: 'none/bad', gF: 'ok/none', gG: 'none/bad',
      g1: 'none/ok', g2: 'bad/ok', g3: 'ok/bad', g4: 'none/bad' };
    const dIn = await labelOf('.card[data-sub="gD"] .io-dot.in');
    const eOut = await labelOf('.card[data-sub="gE"] .io-dot.out');
    const bOut = await labelOf('.card[data-sub="gB"] .io-dot.out');
    const aIn = await labelOf('.card[data-sub="gA"] .io-dot.in');
    const s2In = await labelOf('.step[data-step="g2"] .step-top .io-dot.in');
    const arrowHidden = await ip.$eval('.card[data-sub="gA"] .io-arrow', (el) => el.getAttribute('aria-hidden') === 'true');
    check('đầu vào / đầu ra: mỗi trạng thái trên thẻ và đầu bước (ổn, lỗi, không có), không có cả hai thì không có chấm', same(io0, want0), JSON.stringify(io0));
    /* Ba trạng thái trông khác nhau (không chỉ khác lớp): ổn chấm tròn đặc, lỗi hình thoi đặc, không có vòng rỗng nét mảnh. */
    const looks = await ip.evaluate(() => {
      const by = {};
      for (const d of document.querySelectorAll('.io-dot')) {
        const c = getComputedStyle(d), k = ['ok', 'bad', 'none'].find((x) => d.classList.contains(x));
        (by[k] ||= new Set()).add(JSON.stringify({ bg: c.backgroundColor, r: c.borderRadius, t: c.transform, bw: c.borderTopWidth, bc: c.borderTopColor }));
      }
      return Object.fromEntries(Object.entries(by).map(([k, v]) => [k, [...v].map((x) => JSON.parse(x))]));
    });
    const one = (k) => looks[k]?.length === 1 ? looks[k][0] : null;
    const [lOk, lBad, lNone] = [one('ok'), one('bad'), one('none')];
    const clear = (c) => /^rgba\(0, 0, 0, 0\)$|^transparent$/.test(c);
    check('đầu vào / đầu ra: ổn chấm tròn đặc, lỗi hình thoi đặc khác màu, không có vòng rỗng mảnh hơn; mỗi trạng thái một dáng',
      !!(lOk && lBad && lNone) && !clear(lOk.bg) && lOk.t === 'none' && parseFloat(lOk.r) > 0 && !clear(lBad.bg) && lBad.bg !== lOk.bg && lBad.t !== 'none'
      && parseFloat(lBad.r) === 0 && clear(lNone.bg) && lNone.t === 'none' && parseFloat(lNone.bw) < parseFloat(lOk.bw), JSON.stringify(looks));
    const s4Out = await labelOf('.step[data-step="g4"] .step-top .io-dot.out');
    const gGOut = await labelOf('.card[data-sub="gG"] .io-dot.out');
    check('đầu vào / đầu ra: chấm đầu ra của bước nói "không đầu ra nào của bước được dùng", của thẻ thì nêu từng đầu ra',
      s4Out.a === 'Output: broken. None of the step\'s outputs is used: "z.bin" is not used by any later step; "z2.bin" is not used by any later step'
      && gGOut.a === 'Output: broken. "z.bin" is not used by any later step; "z2.bin" is not used by any later step', JSON.stringify({ s4Out, gGOut }));
    check('đầu vào / đầu ra: chấm có nhãn đọc được, nói vì sao; mũi tên chỉ để trang trí',
      dIn.role === 'img' && dIn.a === dIn.t && /^Input: broken\. "late\.json" on hold: "Late producer" now comes after this$/.test(dIn.a)
      && /^Output: broken\. "late\.json" is only used by "Late input", which now comes before it \(on hold\)$/.test(eOut.a)
      && bOut.a === 'Output: broken. "unused.md" is not used by any later step' && aIn.a === 'Input: none' && arrowHidden
      && s2In.a === 'Input: broken. "Late input": "late.json" on hold: "Late producer" now comes after it',
      JSON.stringify({ dIn, eOut, bOut, aIn, s2In }));
    /* Chấm nằm bên trái chip trạng thái, cùng hàng; đầu bước: cùng hàng với số bước. */
    const place = () => ip.evaluate(() => [...document.querySelectorAll('.card[data-sub]')].filter((c) => c.querySelector('.io')).map((c) => {
      const io = c.querySelector('.io').getBoundingClientRect(), chip = c.querySelector('.chip').getBoundingClientRect(), card = c.getBoundingClientRect();
      return io.right <= chip.left && Math.abs((io.top + io.bottom) / 2 - (chip.top + chip.bottom) / 2) <= 2 && io.left >= card.left && chip.right <= card.right ? '' : c.dataset.sub;
    }).concat([...document.querySelectorAll('.step-top')].filter((t) => t.querySelector('.io')).map((t) => {
      const io = t.querySelector('.io').getBoundingClientRect(), num = t.querySelector('.step-num').getBoundingClientRect();
      return Math.abs((io.top + io.bottom) / 2 - (num.top + num.bottom) / 2) <= 2 && io.right <= t.getBoundingClientRect().right ? '' : t.closest('.step').dataset.step;
    })).filter(Boolean));
    const pl0 = await place();
    await ip.click('#compact-btn');
    await ip.waitForSelector('.board.compact');
    const pl1 = await place();
    await ip.click('#compact-btn');
    check('đầu vào / đầu ra: chấm trước chip, cùng hàng; đầu bước cùng hàng số bước (thường, Compact)', !pl0.length && !pl1.length, JSON.stringify({ pl0, pl1 }));

    // Kéo "Check raw" lên trước "Fetch" (cùng hàng): đầu vào của nó treo; "Fetch" còn nơi dùng khác mà vẫn lỗi, nêu nơi treo.
    const fa = await ip.locator('.card[data-sub="gI"]').boundingBox();
    const fb = await ip.locator('.card[data-sub="gA"]').boundingBox();
    await ip.mouse.move(fa.x + 24, fa.y + 24);
    await ip.mouse.down();
    await ip.mouse.move(fa.x + 34, fa.y + 30, { steps: 2 });
    await ip.mouse.move(fb.x + 20, fb.y + 20, { steps: 8 });
    await ip.mouse.up();
    await ip.waitForFunction(() => !document.querySelector('.drag-ghost') && !document.body.classList.contains('dragging-any'));
    const io1 = await ioOf();
    const order1 = (await cur(ip)).steps[0].subs.map((x) => x.id);
    const aOut1 = await labelOf('.card[data-sub="gA"] .io-dot.out');
    check('đầu vào / đầu ra: kéo bên nhận lên trước bên giao — đầu vào của nó lỗi ngay; bên giao còn nơi dùng khác vẫn lỗi, nêu nơi treo',
      order1[0] === 'gI' && io1.gI === 'bad/none' && io1.gA === 'none/bad' && io1.g1 === 'bad/bad'
      && aOut1.a === 'Output: broken. "raw.csv" is used by "Check raw", which now comes before it (on hold)', JSON.stringify({ order1, io1, aOut1 }));
    await ip.keyboard.press('Control+z');
    await ip.waitForFunction(() => document.querySelector('.card[data-sub="gI"] .io')?.dataset.ioIn === 'ok');

    // Dời bước "Ship" lên trên "Model" (Alt + ↑): "Deploy" giờ đứng trước "Train" → cả hai lỗi; "Late input" nối lại → cả hai ổn.
    await ip.focus('.step[data-step="g3"] [data-act="edit-step"]');
    await ip.keyboard.press('Alt+ArrowUp');
    const io2 = await ioOf();
    check('đầu vào / đầu ra: dời bước — đầu vào của bên nhận và đầu ra (nơi dùng duy nhất) của bên giao lỗi ngay; liên kết nối lại thì ổn',
      io2.gF === 'bad/none' && io2.gC === 'ok/bad' && io2.gD === 'ok/none' && io2.gE === 'none/ok' && io2.g2 === 'ok/bad' && io2.g3 === 'bad/ok', JSON.stringify(io2));
    await ip.keyboard.press('Control+z');
    await ip.waitForFunction(() => document.querySelector('#board > .step:nth-child(2)')?.dataset.step === 'g2');

    // Xoá "Fetch": đầu vào của nơi dùng trỏ tới đầu ra không còn → lỗi; Hoàn tác trả lại.
    await ip.click('.card[data-sub="gA"] [data-act="edit-sub"]');
    await ip.click('#sub-del');
    const io3 = await ioOf();
    const gone = await labelOf('.card[data-sub="gC"] .io-dot.in');
    await ip.click('#toast-undo');
    const io4 = await ioOf();
    check('đầu vào / đầu ra: xoá bên giao thì đầu vào nơi dùng lỗi ngay ("output was deleted"); Hoàn tác trả lại',
      io3.gI === 'bad/none' && io3.gC === 'bad/ok' && io3.g2 === 'bad/ok' && /output was deleted/.test(gone.a) && same(io4, want0), JSON.stringify({ io3, io4, gone }));
    // Xoá "Fetch", tải lại: đầu vào mất nguồn vẫn còn, vẫn lỗi; chip In của bước đếm nó; hộp sửa hiện chip "Deleted output", gỡ rồi Save.
    await ip.click('.card[data-sub="gA"] [data-act="edit-sub"]');
    await ip.click('#sub-del');
    await ip.reload();
    await ip.waitForSelector('.card[data-sub="gI"]');
    const io5 = await ioOf();
    const inTag = await ip.textContent('.step[data-step="g2"] [data-act="hand-in"]');
    await ip.click('.step[data-step="g2"] [data-act="hand-in"]');
    const goneList = await ip.textContent('#hand-list');
    await ip.keyboard.press('Escape');
    await ip.click('.card[data-sub="gI"] [data-act="edit-sub"]');
    const goneChip = await ip.evaluate(() => [...document.querySelectorAll('#sub-hand .in-chip')].map((c) => (c.classList.contains('gone') ? 'gone:' : '') + c.textContent));
    await ip.click('#sub-hand .in-chip.gone [data-in-del]');
    await ip.click('#sub-form button[type="submit"]');
    const io6 = await ioOf();
    const gIins = (await cur(ip)).steps[0].subs.find((x) => x.id === 'gI').ins;
    check('đầu vào / đầu ra: đầu vào mất nguồn giữ qua lần tải lại, chip In đếm nó, danh sách và hộp sửa ghi "Deleted output", gỡ được',
      io5.gI === 'bad/none' && io5.gC === 'bad/ok' && io5.g2 === 'bad/ok' && /In 1/.test(inTag) && /Deleted output.*output was deleted/.test(goneList)
      && same(goneChip, ['gone:Deleted outputits source no longer exists']) && io6.gI === '-' && same(gIins, []), JSON.stringify({ io5, inTag, goneList, goneChip, io6, gIins }));
    await ic.close();

    // 390px: không tràn ngang, chấm nằm trong thẻ và đầu bước.
    const ic2 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await ic2.addInitScript(seedInit, ioSeed);
    const ip2 = await ic2.newPage();
    ip2.on('pageerror', (e) => errors.push(String(e)));
    await ip2.goto(BASE);
    await ip2.waitForSelector('.card[data-sub="gA"] .io');
    const narrow = await ip2.evaluate(() => [...document.querySelectorAll('.card[data-sub] .io, .step-top .io')].filter((io) => {
      const r = io.getBoundingClientRect(), box = io.closest('.card, .step-top').getBoundingClientRect();
      return r.left < box.left || r.right > box.right;
    }).length);
    check('đầu vào / đầu ra 390px: không tràn ngang, chấm nằm trong thẻ và đầu bước', (await hOverflow(ip2)) === 0 && narrow === 0, String(narrow));
    await ic2.close();

    // Cùng ô song song: bên nhận chạy cùng lúc với bên giao → treo; chấm hai bên lỗi, chữ nói "runs in parallel"; hộp sửa, hộp chọn cũng vậy.
    const parCtx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
    await parCtx.addInitScript(seedInit, { id: 'wp', name: 'Par', steps: [{ id: 'q1', title: 'Prep', subs: [
      { id: 'qP', title: 'Cut', outs: [{ id: 'oq', name: 'cut.csv' }] }, { id: 'qQ', title: 'Use', par: true, ins: ['oq'] }] }], log: [] });
    const qp = await parCtx.newPage();
    qp.on('pageerror', (e) => errors.push('song song: ' + e));
    await qp.goto(BASE);
    await qp.waitForSelector('.card[data-sub="qQ"] .io');
    const par0 = await qp.evaluate(() => {
      const io = (sel) => { const el = document.querySelector(sel); return el ? `${el.dataset.ioIn}/${el.dataset.ioOut}` : '-'; };
      const lb = (sel) => document.querySelector(sel)?.getAttribute('aria-label');
      return { q: io('.card[data-sub="qQ"] .io'), p: io('.card[data-sub="qP"] .io'), s: io('.step[data-step="q1"] .step-top .io'),
        qIn: lb('.card[data-sub="qQ"] .io-dot.in'), pOut: lb('.card[data-sub="qP"] .io-dot.out'), gap: !!document.querySelector('.step[data-step="q1"] .hand-gap') };
    });
    await qp.click('.card[data-sub="qQ"] [data-act="edit-sub"]');
    const parChip = await qp.textContent('#sub-hand .in-chip');
    await qp.click('#sub-hand [data-in-pick]');
    const parPick = await qp.textContent('#pick-groups');
    check('cùng ô song song: liên kết treo — chấm hai bên và đầu bước lỗi, nói "runs in parallel"; hộp sửa, hộp chọn đầu ra ghi như vậy; không mũi tên',
      par0.q === 'bad/none' && par0.p === 'none/bad' && par0.s === 'bad/bad' && !par0.gap
      && par0.qIn === 'Input: broken. "cut.csv" on hold: "Cut" runs in parallel with this'
      && par0.pOut === 'Output: broken. "cut.csv" is only used by "Use", which runs in parallel with it (on hold)'
      && /on hold: it runs in parallel with this/.test(parChip) && /Cut \(runs in parallel — will be on hold\)/.test(parPick), JSON.stringify({ par0, parChip, parPick }));
    await parCtx.close();

    // Danh sách cặp: bên giao ở xa (nhiều hàng phía trên, nhiều ô bên trái) — không tự cuộn; toast nói nó ở đâu, "Show" mới cuộn tới.
    const farSteps = [{ id: 'f0', title: 'Producer step', subs: [{ id: 'fp', title: 'Make table', outs: [{ id: 'fo1', name: 'clean.parquet' }] }] }];
    for (let i = 1; i < 8; i++) farSteps.push({ id: 'f' + i, title: 'Filler ' + i, subs: [0, 1, 2].map((k) => ({ id: `ff${i}_${k}`, title: `Task ${i}.${k} with a long title`, notes: 'line\nline\nline' })) });
    farSteps.push({ id: 'f8', title: 'Consumer step', subs: [{ id: 'fc', title: 'Use table', ins: ['fo1'] },
      ...Array.from({ length: 14 }, (_, k) => ({ id: 'fw' + k, title: 'Wide ' + k, ...(k === 0 ? { outs: [{ id: 'fo2', name: 'features.parquet' }] } : {}),
        ...(k === 12 ? { outs: [{ id: 'fo3', name: 'near.parquet' }] } : {}), ...(k === 13 ? { ins: ['fo2', 'fo3'] } : {}) }))] });
    const fc2 = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    await fc2.addInitScript(seedInit, { id: 'wf', name: 'Far', steps: farSteps, log: [] });
    const fp2 = await fc2.newPage();
    fp2.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    fp2.on('pageerror', (e) => errors.push(String(e)));
    await fp2.goto(BASE);
    await fp2.waitForSelector('.card[data-sub="fc"]');
    const vis = (id) => fp2.evaluate((i) => { const c = document.querySelector(`.card[data-sub="${i}"]`), r = c.getBoundingClientRect(), s = c.closest('.cards-scroll').getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight && r.right > s.left && r.left < s.right; }, id);
    const tst = () => fp2.evaluate(() => ({ on: !document.getElementById('toast').hidden, text: document.getElementById('toast-text').textContent,
      btn: document.getElementById('toast-undo').textContent, y: Math.round(scrollY), focus: document.activeElement?.closest('[data-sub]')?.dataset.sub }));
    await fp2.click('.step[data-step="f8"] [data-act="hand-row"]');
    await fp2.click('#dlg-hand .hand-pair');
    const r0 = await tst();
    const rv0 = await vis('fp');
    await fp2.keyboard.press('Control+z'); // nút toast không phải Hoàn tác: Ctrl + Z không bấm nó
    const r1 = await tst();
    await fp2.click('#toast-undo');
    await fp2.waitForFunction(() => { const r = document.querySelector('.card[data-sub="fp"]').getBoundingClientRect(); return r.top > 0 && r.bottom < innerHeight; });
    const r2 = await tst();
    check('bàn giao: danh sách cặp — bên giao ở hàng xa phía trên: không tự cuộn, toast "… is above, off screen", "Show" cuộn tới và focus nó',
      !rv0 && r0.on && r0.text === '"Make table" is above, off screen' && r0.btn === 'Show' && r0.focus === 'fc' && same(r1, r0)
      && !r2.on && r2.y < r0.y && r2.focus === 'fp', JSON.stringify({ r0, r1, r2 }));
    await fp2.evaluate(() => { document.querySelector('.card[data-sub="fc"]').scrollIntoView({ block: 'center' }); const sc = document.querySelector('.step[data-step="f8"] .cards-scroll'); sc.scrollLeft = sc.scrollWidth; });
    await fp2.evaluate(() => document.querySelector('.step[data-step="f8"] [data-act="hand-gap"]').click());
    await fp2.click('#dlg-hand .hand-pair');
    const g0 = await tst();
    const gv0 = await vis('fw0');
    await fp2.click('#toast-undo');
    await fp2.waitForFunction(() => { const c = document.querySelector('.card[data-sub="fw0"]').getBoundingClientRect(), s = c && document.querySelector('.step[data-step="f8"] .cards-scroll').getBoundingClientRect(); return c.left >= s.left - 1 && c.right <= s.right + 1; });
    check('bàn giao: danh sách cặp — bên giao ở ô xa bên trái hàng: toast "… is to the left, off screen", "Show" cuộn hàng tới nó',
      !gv0 && g0.text === '"Wide 0" is to the left, off screen' && g0.focus === 'fw13' && (await vis('fw0')), JSON.stringify({ g0 }));
    // Hai bên đều trong tầm nhìn (ô liền trước): không toast.
    await fp2.evaluate(() => { document.getElementById('toast').hidden = true; const sc = document.querySelector('.step[data-step="f8"] .cards-scroll'); sc.scrollLeft = sc.scrollWidth; });
    await fp2.evaluate(() => document.querySelector('.step[data-step="f8"] [data-act="hand-gap"]').click());
    await fp2.locator('#dlg-hand .hand-pair', { hasText: 'Wide 12' }).click();
    const n0 = await tst();
    check('bàn giao: danh sách cặp — hai bên trong tầm nhìn thì không có toast', !n0.on, JSON.stringify(n0));
    await fc2.close();

    // Hộp sửa: dấu "on hold" tính theo ô Bước / Vị trí đang chọn (chưa Lưu); hộp chọn ghi đầu ra đứng sau; Lưu tạo treo thì toast báo.
    const pc = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
    await pc.addInitScript(seedInit, { id: 'wp', name: 'Pick', log: [], steps: [
      { id: 'p1', title: 'First', subs: [{ id: 'pa', title: 'Consumer A' }] },
      { id: 'p2', title: 'Second', subs: [{ id: 'pb', title: 'Producer B', outs: [{ id: 'pob', name: 'model.pkl' }] }, { id: 'pc', title: 'Consumer C', ins: ['pob'] }] },
      { id: 'p3', title: 'Third', subs: [{ id: 'pd', title: 'Consumer D' }] }] });
    const pp = await pc.newPage();
    pp.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    pp.on('pageerror', (e) => errors.push(String(e)));
    await pp.goto(BASE);
    await pp.waitForSelector('.card[data-sub="pa"]');
    const setSel = (sel, v) => pp.evaluate(([q, val]) => { const e = document.querySelector(q); e.value = val; e.dispatchEvent(new Event('change', { bubbles: true })); }, [sel, v]);
    const chipHeld = () => pp.evaluate(() => [...document.querySelectorAll('#sub-hand .in-chip, #step-hand .in-chip')].filter((c) => c.offsetParent).map((c) => (c.classList.contains('held') ? 'held:' : '') + c.querySelector('b').textContent));
    await pp.click('.card[data-sub="pa"] [data-act="edit-sub"]');
    await pp.click('#sub-hand [data-in-pick]');
    const pickTxt = await pp.textContent('#pick-groups');
    await pp.check('#pick-groups input[value="pob"]');
    await pp.click('#pick-ok');
    const c0 = await chipHeld();
    await setSel('#sub-form [name="step"]', 'p3');
    const c1 = await chipHeld();
    await setSel('#sub-form [name="step"]', 'p1');
    const c2 = await chipHeld();
    await pp.click('#sub-form button[type="submit"]');
    const t0 = await pp.textContent('#toast-text');
    const dotA = await pp.evaluate(() => document.querySelector('.card[data-sub="pa"] .io')?.dataset.ioIn);
    check('hộp sửa: hộp chọn ghi đầu ra đứng sau; dấu "on hold" theo ô Bước đang chọn; Lưu tạo treo thì toast báo',
      /model\.pkl\s*Producer B \(comes after this — will be on hold\)/.test(pickTxt) && same(c0, ['held:model.pkl']) && same(c1, ['model.pkl']) && same(c2, ['held:model.pkl'])
      && /^Saved "Consumer A" · Input on hold: "Consumer A" now comes before "Producer B"\./.test(t0) && dotA === 'bad', JSON.stringify({ pickTxt, c0, c1, c2, t0, dotA }));
    // Đổi Bước sang sau bên giao rồi Lưu: dời, liên kết nối, toast dời không báo treo.
    await pp.click('.card[data-sub="pa"] [data-act="edit-sub"]');
    await setSel('#sub-form [name="step"]', 'p3');
    const c3 = await chipHeld();
    await pp.click('#sub-form button[type="submit"]');
    const t1 = await pp.textContent('#toast-text');
    const dotA2 = await pp.evaluate(() => document.querySelector('.card[data-sub="pa"] .io')?.dataset.ioIn);
    check('hộp sửa: đổi Bước tới sau bên giao — chip hết "on hold" trước khi Lưu, Lưu thì dời và nối lại',
      same(c3, ['model.pkl']) && /^Moved "Consumer A" to step "Third"/.test(t1) && !/on hold/.test(t1) && dotA2 === 'ok', JSON.stringify({ c3, t1, dotA2 }));
    // Hộp bước: Vị trí đổi thì dấu đổi theo; dời bước nhận xuống cuối khi Lưu thì không báo treo.
    await pp.click('.step[data-step="p1"] [data-act="edit-step"]');
    await pp.click('#step-hand [data-in-pick]');
    await pp.check('#pick-groups input[value="pob"]');
    await pp.click('#pick-ok');
    const s0 = await chipHeld();
    await setSel('#step-form [name="pos"]', '2');
    const s1 = await chipHeld();
    await pp.click('#step-form button[type="submit"]');
    const t2 = await pp.textContent('#toast-text');
    const st = (await cur(pp)).steps.map((x) => x.id);
    check('hộp bước: dấu "on hold" theo ô Vị trí đang chọn; Lưu ở chỗ sau bên giao thì không treo',
      same(s0, ['held:model.pkl']) && same(s1, ['model.pkl']) && same(st, ['p2', 'p3', 'p1']) && !/on hold/.test(t2), JSON.stringify({ s0, s1, st, t2 }));
    await pc.close();
  });

  /* ── Hàng không dựng lại vẫn đúng: khoá hàng đọc trạng thái chấm và tên đầu ra; đang tìm thì ẩn mũi tên; danh sách ghi "on hold";
   * tên dài vừa thêm mờ ngay, không nhờ sự kiện font; Architecture chưa đủ gợi ý thì chưa xong. Font Google bị chặn trong các
   * context này nên không lần tải font nào sửa hộ lần vẽ. ── */
  await section('Hàng không dựng lại, font tải muộn, nav Architecture', async () => {
    const LONG = 'matches_with_odds_and_lineups_2019_2024.parquet';
    const noFonts = (c) => c.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (r) => r.abort());
    const seedWs = (d) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('stepPlanner.v2', JSON.stringify({ version: 2, workspaces: [d], lastId: d.id })); } };
    /* Hàng 1 (Make) nhận late.json của hàng 2: treo. P giao model.pkl cho C (hàng 2) và feat.csv cho Q (cùng hàng). */
    const seed = { id: 'wk', name: 'Keys', steps: [
      { id: 'k1', title: 'Make', ins: ['oz'], subs: [
        { id: 'kP', title: 'Produce', outs: [{ id: 'op', name: 'model.pkl' }, { id: 'ox', name: 'feat.csv' }] },
        { id: 'kQ', title: 'Use features', ins: ['ox'] },
        { id: 'kR', title: 'Long output', outs: [{ id: 'or', name: LONG }] },
        { id: 'kT', title: 'Take long' }] },
      { id: 'k2', title: 'Use', outs: [{ id: 'oz', name: 'late.json' }], subs: [{ id: 'kC', title: 'Consume model', ins: ['op'] }] },
    ], log: [] };
    const kc = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
    await noFonts(kc);
    await kc.addInitScript(seedWs, seed);
    const kp = await kc.newPage();
    kp.on('pageerror', (e) => errors.push('khoá hàng: ' + e));
    await kp.goto(BASE);
    await kp.waitForSelector('.card[data-sub="kC"]');
    const arrows = () => kp.evaluate(() => ({ n: document.querySelectorAll('.hand-row, .hand-gap').length,
      row: document.querySelector('.step[data-step="k2"] [data-act="hand-row"]')?.textContent || '',
      gap: [...document.querySelectorAll('[data-act="hand-gap"]')].map((b) => b.textContent) }));

    // Đang tìm, khớp cả bên giao (P: tên đầu ra) và bên nhận (C): không mũi tên nào; xoá chữ tìm thì về.
    const a0 = await arrows();
    await kp.fill('#q', 'model');
    await waitTo(kp, 'bảng vào chế độ tìm', () => document.getElementById('board').classList.contains('filtering'));
    const a1 = await arrows();
    const hits = await kp.$$eval('.card[data-sub]', (cs) => cs.map((c) => c.dataset.sub).sort());
    await kp.fill('#q', '');
    await waitTo(kp, 'bảng thôi chế độ tìm', () => !document.getElementById('board').classList.contains('filtering'));
    const a2 = await arrows();
    check('khoá hàng: đang tìm (khớp cả bên giao lẫn bên nhận) thì không mũi tên; xoá chữ tìm thì mũi tên về',
      a0.n === 2 && a0.row === 'model.pkl' && a1.n === 0 && hits.join() === 'kC,kP' && JSON.stringify(a2) === JSON.stringify(a0), JSON.stringify({ a0, a1, hits, a2 }));

    // Liên kết treo: danh sách Out của bên giao và In của bên nhận ghi "on hold".
    const heldIn = async (sel) => {
      await kp.click(sel);
      const r = await kp.$$eval('#hand-list .hand-who', (bs) => bs.map((b) => (b.classList.contains('held') ? 'held:' : '') + b.textContent));
      await kp.keyboard.press('Escape');
      return r;
    };
    const outList = await heldIn('.step[data-step="k2"] [data-act="hand-out"]');
    const inList = await heldIn('.step[data-step="k1"] [data-act="hand-in"]');
    check('khoá hàng: danh sách Out / In của liên kết treo đánh dấu "on hold"', outList.length === 1 && /^held:.*on hold/.test(outList[0])
      && inList.length === 1 && /^held:.*on hold/.test(inList[0]), JSON.stringify({ outList, inList }));

    // Đổi tên đầu ra ở hàng 1: mũi tên trên hàng 2 (hàng ấy không đổi gì khác) và nút giữa hai ô ghi tên mới.
    await kp.click('.card[data-sub="kP"] [data-act="edit-sub"]');
    await kp.locator('#sub-hand .out-row [data-k="name"]').nth(0).fill('model-v2.pkl');
    await kp.locator('#sub-hand .out-row [data-k="name"]').nth(1).fill('feat-v2.csv');
    await kp.click('#sub-form button[type="submit"]');
    const a3 = await arrows();
    check('khoá hàng: đổi tên đầu ra thì mũi tên trên hàng nhận và nút giữa hai ô ghi tên mới', a3.row === 'model-v2.pkl' && a3.gap.join() === 'feat-v2.csv', JSON.stringify(a3));

    // Tên dài vừa thêm (sau khi font đã xong, không còn sự kiện font nào): mờ ở đuôi ngay sau lần vẽ.
    await kp.evaluate(() => document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => r()))));
    await kp.click('.card[data-sub="kT"] [data-act="edit-sub"]');
    await kp.click('#sub-hand [data-in-pick]');
    await kp.check('#pick-groups input[value="or"]');
    await kp.click('#pick-ok');
    await kp.click('#sub-form button[type="submit"]');
    const longGap = await kp.evaluate((name) => [...document.querySelectorAll('.hand-gap .hand-btn-name')].filter((n) => n.textContent === name)
      .map((n) => ({ cut: n.classList.contains('cut'), over: n.scrollWidth > n.clientWidth })), LONG);
    check('khoá hàng: tên đầu ra dài vừa nối mờ ở đuôi ngay (không chờ font)', longGap.length === 1 && longGap[0].cut && longGap[0].over, JSON.stringify(longGap));

    // Xoá nơi dùng duy nhất của model.pkl (hàng 2): chấm đầu ra của P (hàng 1, không đổi gì khác) thành lỗi ngay.
    const pOut0 = await kp.$eval('.card[data-sub="kP"] .io', (e) => e.dataset.ioOut);
    await kp.click('.card[data-sub="kC"] [data-act="edit-sub"]');
    await kp.click('#sub-del');
    await waitTo(kp, 'thẻ đã xoá rời bảng', () => !document.querySelector('.card[data-sub="kC"]'));
    const pOut1 = await kp.$eval('.card[data-sub="kP"] .io', (e) => e.dataset.ioOut);
    check('khoá hàng: xoá nơi dùng duy nhất ở hàng khác thì chấm đầu ra của bên giao lỗi ngay', pOut0 === 'ok' && pOut1 === 'bad', `${pOut0} → ${pOut1}`);
    await kc.close();

    // Font tải muộn: tên vừa chỗ với font dự phòng; font về (to gấp bốn) thì tên tràn và phải mờ — chỉ lần đo lại khi font
    // tải xong làm việc này. Font "về" là @font-face trỏ font hệ thống, size-adjust 400%.
    const lc = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
    await noFonts(lc);
    await lc.addInitScript(seedWs, { id: 'wl', name: 'Late font', steps: [{ id: 'l1', title: 'A', subs: [
      { id: 'lA', title: 'Give', notes: 'một hai ba', outs: [{ id: 'oa', name: 'teams.csv' }] }, { id: 'lB', title: 'Take', ins: ['oa'] }] }], log: [] });
    const lp = await lc.newPage();
    lp.on('pageerror', (e) => errors.push('font muộn: ' + e));
    await lp.goto(BASE);
    await lp.waitForSelector('.hand-gap .hand-btn-name');
    const fit0 = await lp.$eval('.hand-gap .hand-btn-name', (n) => n.classList.contains('cut') || n.scrollWidth > n.clientWidth);
    const note0 = await lp.$eval('.card[data-sub="lA"] .card-notes', (n) => n.classList.contains('clip'));
    await lp.addStyleTag({ content: "@font-face { font-family: 'Be Vietnam Pro'; src: local('DejaVu Sans'), local('Liberation Sans'), local('FreeSans'), local('Arial'), local('Helvetica'); size-adjust: 400%; }" });
    const loaded = await lp.evaluate(() => document.fonts.ready.then(() => [...document.fonts].some((f) => f.family.replace(/"/g, '') === 'Be Vietnam Pro' && f.status === 'loaded')));
    const cut1 = await lp.waitForFunction(() => document.querySelector('.hand-gap .hand-btn-name.cut'), null, { timeout: 2000 }).then(() => true, () => false);
    check('font tải muộn: tên vừa chỗ thì không mờ; font về làm tên tràn thì đo lại và mờ', !fit0 && loaded && cut1, JSON.stringify({ fit0, loaded, cut1 }));
    const note1 = await lp.waitForFunction(() => document.querySelector('.card[data-sub="lA"] .card-notes.clip'), null, { timeout: 2000 }).then(() => true, () => false);
    check('font tải muộn: ghi chú vừa chỗ thì không cắt; font về làm ghi chú tràn thì đo lại và cắt', !note0 && note1, JSON.stringify({ note0, note1 }));
    await lc.close();

    // Architecture: mới chọn thứ bàn giao thì chỉ nhóm app có gợi ý ("k of n recommended", k < n); mục là trang gợi ý, dấu "guide".
    const { ctx: nx, page: np } = await open(1280, 900);
    await np.click('#start .tpl[data-tpl="crisp-dm"]');
    await np.click('#sd-btn');
    await np.click('#sd-open');
    await np.waitForSelector('#dlg-sd[open] .sd-paths');
    await np.click('#sd-pane input[data-path][value="demo"]', { force: true });
    await waitTo(np, 'nav ghi lối đã chọn', () => document.querySelector('#sd-nav [data-at="0"]')?.classList.contains('is-done'));
    const nav = await np.$eval('#sd-nav [data-at="2"]', (b) => ({ cls: b.className, t: b.textContent }));
    const [, k, n] = nav.t.match(/(\d+) of (\d+) recommended/) || [];
    check('Architecture: mục gợi ý mang dấu "guide", không phải "chưa quyết" hay "xong"; đếm k of n recommended',
      /\bis-guide\b/.test(nav.cls) && !/\bis-(open|done)\b/.test(nav.cls) && /\(guide\)/.test(nav.t) && !/\(open\)/.test(nav.t) && +k >= 1 && +k < +n, JSON.stringify(nav));
    await nx.close();
  });

  /* ── Bước nhận đầu ra của bước con của chính nó (bước con dời vào sau khi đã nối): chấm đầu vào của bước "none"; hộp sửa bước
   * hiện chip "inside this step" để gỡ, hộp chọn không đưa ra đầu ra ấy. ── */
  await section('Đầu vào trong chính bước', async () => {
    const seed = { version: 2, lastId: 'wi', workspaces: [{ id: 'wi', name: 'Trong bước', steps: [
      { id: 'i1', title: 'Prep', subs: [{ id: 'iz', title: 'Other', outs: [{ id: 'oz', name: 'other' }] }] },
      { id: 'i2', title: 'Use', ins: ['oi'], subs: [{ id: 'ix', title: 'Make table', outs: [{ id: 'oi', name: 'table' }] }, { id: 'iy', title: 'Read' }] }], log: [] }] };
    const ic = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ic.addInitScript((d) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('stepPlanner.v2', d); } }, JSON.stringify(seed));
    const ip = await ic.newPage();
    ip.on('pageerror', (e) => errors.push(String(e)));
    await ip.goto(BASE);
    await ip.waitForSelector('.card[data-sub="ix"]');
    const dotIn = await ip.$eval('.step[data-step="i2"] .step-top .io', (el) => el.dataset.ioIn);
    await ip.click('.step[data-step="i2"] [data-act="edit-step"]');
    const chip = await ip.$eval('#step-hand [data-ins] .in-chip', (el) => ({ cls: el.className, t: el.textContent, title: el.title }));
    await ip.click('#step-hand [data-in-pick]');
    const offered = await ip.$$eval('#pick-groups input[name="pick"]', (cs) => cs.map((c) => c.value));
    await ip.keyboard.press('Escape');
    await ip.click('#step-hand .in-chip [data-in-del]');
    await ip.click('#step-form button[type="submit"]');
    const w = await cur(ip);
    check('đầu vào trong chính bước: chấm đầu vào của bước none; hộp sửa ghi "inside this step" (chip lỗi), hộp chọn không đưa ra; gỡ được',
      dotIn === 'none' && /\bgone\b/.test(chip.cls) && /inside this step/.test(chip.t) && /not an input/.test(chip.title) && !offered.includes('oi')
      && JSON.stringify(w.steps[1].ins) === '[]', JSON.stringify({ dotIn, chip, offered, ins: w.steps[1].ins }));
    await ic.close();
  });

  /* ── Đầu ra cuối (Final): bật trong hộp sửa bằng phím (Enter không gửi hộp), Lưu thì chấm đỏ của đầu ra không ai dùng thành
     ổn, bỏ thì đỏ lại; danh sách đầu ra có nhãn "Final". Dự án mới từ mẫu không có chấm đầu ra đỏ (trừ ngoại lệ ghi ở test-core). ── */
  await section('Đầu ra cuối', async () => {
    const seeded = async (w, hh, data) => { // `seeded` chung khai ở cuối file, sau phần này
      const ctx = await browser.newContext({ viewport: { width: w, height: hh } });
      if (data) await ctx.addInitScript((d) => { if (!localStorage.getItem('stepPlanner.v2')) localStorage.setItem('stepPlanner.v2', d); }, JSON.stringify(data));
      const page = await ctx.newPage();
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(BASE);
      return { ctx, page };
    };
    const seed = { version: 2, lastId: 'wf', workspaces: [{ id: 'wf', name: 'Cuối', steps: [
      { id: 'f1', title: 'Build', subs: [{ id: 'fa', title: 'Make', outs: [{ id: 'oa', name: 'table' }] }, { id: 'fb', title: 'Use', ins: ['oa'] }] },
      { id: 'f2', title: 'Ship', outs: [{ id: 'os', name: 'slides', final: true }], subs: [{ id: 'fx', title: 'Write report', outs: [{ id: 'ox', name: 'report' }] }] }], log: [] }] };
    const { ctx, page } = await seeded(1280, 900, seed);
    await page.waitForSelector('.card[data-sub="fx"]');
    const dot = (sel) => page.$eval(sel, (el) => el.dataset.ioOut);
    const d0 = { sub: await dot('.card[data-sub="fx"] .io'), step: await dot('.step[data-step="f2"] .step-top .io') };
    await page.click(subSel('fx', 'edit-sub'));
    await page.focus('#sub-hand .out-row [data-k="final"]');
    await page.keyboard.press('Enter');
    const stillOpen = await page.$eval('#dlg-sub', (d) => d.open);
    await page.keyboard.press('Space');
    const ticked = await page.$eval('#sub-hand .out-row [data-k="final"]', (c) => c.checked);
    await page.click('#sub-form button[type="submit"]');
    await waitTo(page, 'chấm đầu ra ổn sau khi bật Final', () => document.querySelector('.card[data-sub="fx"] .io')?.dataset.ioOut === 'ok');
    const w1 = await cur(page);
    const d1 = { sub: await dot('.card[data-sub="fx"] .io'), title: await page.$eval('.card[data-sub="fx"] .io-dot.out', (e) => e.title) };
    check('đầu ra cuối: Enter trên ô Final không gửi hộp; Space bật; Lưu thì chấm đầu ra không ai dùng từ đỏ thành ổn, nêu "Final"',
      d0.sub === 'bad' && d0.step === 'ok' && stillOpen && ticked && d1.sub === 'ok' && /Final: "report"/.test(d1.title) && w1.steps[1].subs[0].outs[0].final === true,
      JSON.stringify({ d0, stillOpen, ticked, d1 }));
    await page.click(subSel('fx', 'edit-sub'));
    await page.click('#sub-hand .out-row [data-k="final"]');
    await page.click('#sub-form button[type="submit"]');
    await waitTo(page, 'chấm đầu ra đỏ lại sau khi bỏ Final', () => document.querySelector('.card[data-sub="fx"] .io')?.dataset.ioOut === 'bad');
    const w2 = await cur(page);
    check('đầu ra cuối: bỏ Final, Lưu thì chấm đỏ lại', (await dot('.card[data-sub="fx"] .io')) === 'bad' && w2.steps[1].subs[0].outs[0].final === false);
    await page.click('.step[data-step="f2"] [data-act="hand-out"]');
    const list = await page.$eval('#hand-list', (l) => ({ tag: l.querySelectorAll('.final-tag').length, t: l.textContent }));
    await page.keyboard.press('Escape');
    check('đầu ra cuối: danh sách đầu ra có nhãn "Final", không ghi "Not used yet"', list.tag === 1 && /Final deliverable/.test(list.t) && !/Not used yet/.test(list.t), JSON.stringify(list));
    await ctx.close();
    /* Mỗi mẫu: dự án mới không có chấm đầu ra đỏ. */
    const fresh = await seeded(1280, 900, null);
    const tp = fresh.page;
    await tp.waitForSelector('#start:not([hidden]) .tpl[data-tpl="crisp-dm"]');
    const tpls = await tp.evaluate(async () => (await (await fetch('data/templates.json')).json()).templates);
    await tp.click('#start .tpl[data-tpl="crisp-dm"]');
    const reds = {};
    for (const t of tpls) {
      if (t.id !== 'crisp-dm') {
        await tp.click('#ws-btn');
        await tp.click('#ws-tab-new');
        await tp.check(`#ws-new-templates input[value="${t.id}"]`);
        await tp.click('#ws-new button[type="submit"]');
      }
      await waitTo(tp, `bảng của mẫu ${t.id}`, (n) => document.querySelectorAll('#board .step').length === n && !document.querySelector('dialog[open]'), t.steps.length);
      reds[t.id] = await tp.$$eval('#board .io-dot.out.bad', (ds) => ds.length);
    }
    check('đầu ra cuối: dự án mới từ mỗi mẫu không có chấm đầu ra đỏ', tpls.every((t) => !reds[t.id]), JSON.stringify(reds));
    await fresh.ctx.close();
  });

  /* ── Vòng focus chỉ cho bàn phím: mở bằng chuột rồi Esc thì focus về nút mở, không vòng; tới bằng Tab, Enter / Alt + ↓ mở
     rồi Esc thì có vòng, màu token --ring; cả hai theme. Nút sơ đồ, nhãn bàn giao: vòng là nét khung, so với nút cùng loại. ── */
  await section('Vòng focus chỉ cho bàn phím', async () => {
    const pk = (id) => ({ pick: [id], skip: false, own: '', note: '' });
    const rws = { id: 'wr', name: 'Ring', log: [], steps: [{ id: 'r1', title: 'One', subs: [{ id: 'ra', title: 'Alpha' }, { id: 'rb', title: 'Beta' }] }],
      design: { path: '', profile: {}, stages: { source: pk('kaggle-datasets'), ingest: pk('notebook-script'), raw: pk('project-folder'), process: pk('pandas') },
        edges: { 'source>ingest': { via: 'file', what: 'a.csv' }, 'raw>process': { via: 'file', what: 'b.csv' } } } };
    const items = [
      ['nút sơ đồ', '#sd-fig .sd-node[data-stage="process"]', '#dlg-sd', 'Enter'],
      ['nhãn bàn giao', '#sd-fig .sd-hand[data-edge="raw>process"]', '#dlg-sd', 'Enter'],
      ['tên thẻ', '.card[data-sub="rb"] [data-act="edit-sub"]', '#dlg-sub', 'Enter'],
      ['tên bước', '.step[data-step="r1"] .step-head [data-act="edit-step"]', '#dlg-step', 'Enter'],
      ['danh sách trạng thái', '.card[data-sub="rb"] [data-act="status"]', '.dd-pop', 'Alt+ArrowDown'],
    ];
    /* Vòng của phần tử đang focus: outline, hay nét khung SVG khác nút cùng loại không focus. Trả màu vòng ('' = không vòng). */
    const ringOf = (page) => page.evaluate(() => {
      document.getAnimations().forEach((x) => x.finish());
      const a = document.activeElement, cs = getComputedStyle(a);
      const p = document.createElement('i');
      p.style.color = 'var(--ring)';
      document.body.append(p);
      const tok = getComputedStyle(p).color;
      p.remove();
      const box = a.querySelector(':scope > .sd-box, :scope > .sd-hand-box');
      let col = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 ? cs.outlineColor : '';
      if (box) {
        const kind = a.matches('.sd-node') ? '.sd-node[data-stage]' : '.sd-hand:not(.is-empty)';
        const twin = [...document.querySelectorAll('#sd-fig ' + kind)].find((x) => x !== a).querySelector(':scope > .sd-box, :scope > .sd-hand-box');
        const b = getComputedStyle(box), t = getComputedStyle(twin);
        if (b.stroke !== t.stroke || b.strokeWidth !== t.strokeWidth) col = b.stroke;
      }
      return { col, tok };
    });
    for (const scheme of ['light', 'dark']) {
      const rc = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: scheme, reducedMotion: 'reduce' });
      await rc.addInitScript((d) => { if (!localStorage.getItem('stepPlanner.v2')) localStorage.setItem('stepPlanner.v2', JSON.stringify({ version: 2, workspaces: [d], lastId: d.id })); }, rws);
      const rp = await rc.newPage();
      rp.on('pageerror', (e) => errors.push('vòng focus: ' + e));
      await rp.goto(BASE);
      await rp.waitForSelector('#sd-fig .sd-hand[data-edge="raw>process"]');
      for (const [name, sel, open, key] of items) {
        const closeBack = async () => {
          await rp.waitForSelector(open + (open.startsWith('#') ? '[open]' : ''));
          await rp.keyboard.press('Escape');
          await waitTo(rp, `${name}: focus về nút mở`, (q) => document.activeElement === document.querySelector(q), sel);
          await rp.mouse.move(1, 1); // luật :hover không che vòng
          return ringOf(rp);
        };
        await rp.click(sel, key === 'Alt+ArrowDown' ? { modifiers: ['Shift'] } : {});
        const mouse = await closeBack();
        await rp.focus(sel);
        await rp.keyboard.press('Shift+Tab');
        await rp.keyboard.press('Tab');
        await rp.keyboard.press(key);
        const kb = await closeBack();
        check(`${scheme}, ${name}: chuột → Esc không vòng; Tab, ${key} → Esc có vòng màu --ring`, !mouse.col && kb.col === kb.tok, JSON.stringify({ mouse, kb }));
      }
      await rc.close();
    }
  });

  /* ── Đóng hộp về nút mở: thêm, xoá tài liệu, Evidence vẽ lại hàng và thay nút mở; đóng hộp vẫn về nút mở (nút mới) ── */
  await section('Đóng hộp về nút mở', async () => {
    const { ctx: fx, page: fp } = await open(1280, 900);
    await fp.click('#start .tpl[data-tpl="stats-report"]');
    await fp.waitForSelector('.card[data-sub]');
    const sub = await fp.$eval('.card[data-sub]', (x) => x.dataset.sub);
    const step = await fp.$eval('.step[data-step]', (x) => x.dataset.step);
    /* Sự kiện close tới sau khi thuộc tính open đã gỡ: chờ focus về chỗ, không đọc ngay. */
    const at = (sel) => fp.waitForFunction((q) => document.activeElement === document.querySelector(q), sel, { timeout: 2000 }).then(() => true, () => false);
    const addLink = async (where, title) => {
      await fp.click(`#dlg-${where} [data-doc-add]`);
      await fp.fill('#dlg-doc input[name="title"]', title);
      await fp.fill('#dlg-doc input[name="url"]', 'https://example.com/' + title);
      await fp.click('#doc-save');
      await fp.waitForSelector('#dlg-doc:not([open])', { state: 'attached' });
    };
    const r = {};
    await fp.focus(subSel(sub, 'edit-sub'));
    await fp.keyboard.press('Enter');
    await fp.waitForSelector('#dlg-sub[open]');
    await addLink('sub', 'a');
    await fp.keyboard.press('Escape');
    await fp.waitForSelector('#dlg-sub:not([open])', { state: 'attached' });
    r.subEsc = await at(subSel(sub, 'edit-sub'));
    await fp.focus(subSel(sub, 'edit-sub'));
    await fp.keyboard.press('Enter');
    await fp.click('#dlg-sub [data-doc-act="proof"]');
    await fp.click('#dlg-sub .dlg-foot [data-close]');
    await fp.waitForSelector('#dlg-sub:not([open])', { state: 'attached' });
    r.subProof = await at(subSel(sub, 'edit-sub'));
    const head = `.step[data-step="${step}"] .step-head [data-act="edit-step"]`;
    await fp.focus(head);
    await fp.keyboard.press('Enter');
    await fp.waitForSelector('#dlg-step[open]');
    await addLink('step', 'b');
    await fp.click('#dlg-step [data-doc-act="del"]');
    await fp.keyboard.press('Escape');
    await fp.waitForSelector('#dlg-step:not([open])', { state: 'attached' });
    r.stepEsc = await at(head);
    check('đóng hộp sửa sau khi thêm / xoá tài liệu, Evidence: focus về nút mở mới, không về body', r.subEsc && r.subProof && r.stepEsc, JSON.stringify(r));
    await fx.close();
  });

  /* ── System design, hộp và sơ đồ: khâu chưa quyết bấm được cả lòng nút; đóng hộp sau khi sửa thì focus về nút đã vẽ lại
   * (khâu, nhãn bàn giao, link cảnh báo), trang không cuộn; cột trái thấy mục đang xem; bấm lựa chọn không kéo khung phải về đầu;
   * tóm tắt bàn giao đổi khi gõ; Esc trên nút sơ đồ về khung; Space trên nút zoom khi chuột trên sơ đồ; Architecture là trang gợi ý. ── */
  await section('System design: hộp và sơ đồ', async () => {
    const { ctx: dx, page: dp } = await open(1280, 900);
    await dp.click('#start .tpl[data-tpl="crisp-dm"]');
    await dp.waitForSelector('#sd-fig svg');
    const cat = await dp.evaluate(async () => (await fetch('data/system-design.json')).json());
    const pageOf = (id) => cat.stages.findIndex((s) => s.id === id) + 3;
    const last = cat.stages.at(-1).id;
    /* Sự kiện close (trả focus) tới ở lượt việc sau khi `open` tắt: chờ tới khi focus đã ra khỏi hộp, không ở body. */
    const shut = (page) => waitTo(page, 'hộp System design đóng, focus đã về trang', () => {
      const d = document.getElementById('dlg-sd'), a = document.activeElement;
      return !d.open && !!a && a !== document.body && !d.contains(a);
    });
    const focusIs = (page, sel) => page.waitForFunction((q) => document.activeElement === document.querySelector(q), sel, { timeout: 2000 }).then(() => true, () => false);
    /* Lòng nút chưa quyết (nền trong suốt, không phải `none`) nhận chuột. */
    const probe = (n) => {
      n.scrollIntoView({ block: 'center' });
      const r = n.querySelector('.sd-box').getBoundingClientRect();
      const ok = [[0.5, 0.5], [0.85, 0.5], [0.5, 0.85]].every(([fx, fy]) => document.elementFromPoint(r.x + r.width * fx, r.y + r.height * fy)?.closest('[data-stage]') === n);
      return { id: n.dataset.stage, x: r.x + r.width * 0.85, y: r.y + r.height / 2, ok };
    };
    const hitB = await dp.$eval('#sd-fig .sd-node.is-open[data-stage]', probe);
    await dp.mouse.click(hitB.x, hitB.y);
    const openB = await waitTo(dp, 'hộp mở khi bấm lòng nút chưa quyết', () => document.getElementById('dlg-sd').open);
    check('sơ đồ: khâu chưa quyết nhận chuột ở cả lòng nút, không chỉ chữ và viền', hitB.ok && openB
      && (await dp.textContent('#sd-pane .sd-h')) === cat.stages.find((s) => s.id === hitB.id).title, JSON.stringify(hitB));

    /* Bấm lựa chọn ở giữa trang dài: khung phải không về đầu, ô vừa bấm đứng yên và giữ focus. */
    const keep = async (what, nav, sel, pick) => {
      await dp.click(`#sd-nav [data-at="${nav}"]`);
      const b = await dp.evaluate(([s, p]) => {
        const el = [...document.querySelectorAll('#sd-pane ' + s)].filter((x) => x.getClientRects().length).at(p);
        el.scrollIntoView({ block: 'center' });
        return { sel: el.matches('[data-opt]') ? `[data-opt="${el.dataset.opt}"] input` : `input[data-q="${el.dataset.q}"][value="${el.value}"]`,
          top: Math.round(el.getBoundingClientRect().top), st: document.getElementById('sd-pane').scrollTop };
      }, [sel, pick]);
      const r = await dp.$eval(`#sd-pane ${b.sel}`, (i) => { const x = (i.closest('.sd-pill') || i).getBoundingClientRect(); return { x: x.x + x.width / 2, y: x.y + x.height / 2 }; });
      await dp.mouse.click(r.x, r.y);
      const a = await dp.$eval(`#sd-pane ${b.sel}`, (i) => ({ top: Math.round(((i.closest('.sd-opt') || i).getBoundingClientRect()).top), st: document.getElementById('sd-pane').scrollTop,
        on: i.checked, focus: document.activeElement === i }));
      check(`hộp: ${what} không kéo khung phải về đầu; ô vừa bấm đứng yên, giữ focus`, b.st > 0 && a.st > 0 && Math.abs(a.top - b.top) <= 2 && a.on && a.focus, JSON.stringify({ b, a }));
    };
    await keep('chọn phương án cuối của khâu', pageOf('process'), '.sd-opt', -1);
    await keep('chọn câu trả lời hồ sơ ở cuối trang', 1, 'input[data-q]:not(:checked)', -2);

    /* Mở ở khâu cuối từ nút sơ đồ bằng bàn phím: cột trái cho thấy mục ấy; sửa rồi Esc: focus về nút mới, trang đứng yên. */
    await dp.keyboard.press('Escape');
    await shut(dp);
    const node = `#sd-fig [data-stage="${last}"]`;
    await dp.$eval(node, (n) => n.scrollIntoView({ block: 'center' }));
    await dp.focus(node);
    const y0 = await dp.evaluate(() => scrollY);
    await dp.keyboard.press('Enter');
    await dp.waitForSelector('#dlg-sd[open]');
    const navIn = (page, scroller) => page.$eval('#sd-nav [aria-current]', (b, s) => {
      const r = b.getBoundingClientRect(), n = b.closest(s).getBoundingClientRect();
      return { item: b.dataset.at, ok: r.top >= n.top - 1 && r.bottom <= n.bottom + 1 && r.left >= n.left - 1 && r.right <= n.right + 1 };
    }, scroller);
    const navD = await navIn(dp, 'nav');
    check('hộp mở ở khâu cuối (máy rộng): mục đang xem của cột trái nằm trong tầm nhìn', navD.ok && +navD.item === pageOf(last), JSON.stringify(navD));
    const gOld = await dp.$(node);
    await dp.click('#sd-pane textarea[data-note]');
    await dp.keyboard.type('x');
    await dp.keyboard.press('Escape');
    await shut(dp);
    const backNode = await focusIs(dp, node);
    check('sửa trong hộp rồi Esc: focus về nút sơ đồ vừa vẽ lại (cùng khâu), trang không cuộn', backNode && !(await gOld.evaluate((g) => g.isConnected))
      && Math.abs((await dp.evaluate(() => scrollY)) - y0) <= 1, JSON.stringify({ backNode, y0, y1: await dp.evaluate(() => scrollY) }));
    /* Khâu thành Not needed thì nút rời sơ đồ: đóng hộp thì focus về khung sơ đồ, không về bảng, trang không cuộn. */
    await dp.keyboard.press('Enter');
    await dp.waitForSelector('#dlg-sd[open]');
    await dp.click('#sd-pane [data-skip]');
    await dp.keyboard.press('Escape');
    await shut(dp);
    const gone = await dp.evaluate((q) => ({ id: document.activeElement.id, node: !!document.querySelector(q), y: scrollY }), node);
    check('khâu vừa thành Not needed (nút rời sơ đồ): đóng hộp thì focus về khung sơ đồ, trang không cuộn', gone.id === 'sd-fig' && !gone.node
      && Math.abs(gone.y - y0) <= 1, JSON.stringify({ ...gone, y0 }));
    await dp.$eval('#sd-fig [data-stage]', (n) => n.scrollIntoView({ block: 'center' }));
    await dp.focus('#sd-fig [data-stage]');

    /* Esc trên nút sơ đồ: focus về chính khung (không rơi về body), bánh xe trả cho trang. */
    await dp.keyboard.press('Escape');
    const escH = await dp.evaluate(() => ({ id: document.activeElement.id, hint: document.getElementById('sd-zoom-hint').textContent }));
    const fb = await dp.$eval('#sd-fig', (f) => { const r = f.getBoundingClientRect(); return { x: r.left + r.width / 2, y: (Math.max(r.top, 0) + Math.min(r.bottom, innerHeight)) / 2 }; });
    await dp.mouse.move(fb.x, fb.y);
    const sy = await dp.evaluate(() => scrollY);
    await dp.mouse.wheel(0, -200);
    const wheeled = await waitTo(dp, 'trang cuộn khi bánh xe đã trả về', (s) => scrollY < s, sy);
    check('Esc trên nút sơ đồ: focus về khung #sd-fig, bánh xe cuộn trang', escH.id === 'sd-fig' && !/release/.test(escH.hint) && wheeled, JSON.stringify(escH));

    /* Space trên nút Zoom in khi chuột nằm trên sơ đồ: nút nhận Space, sơ đồ không giành. */
    const fc = await dp.$eval('#sd-fig', (f) => { f.scrollIntoView({ block: 'center' }); const r = f.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await dp.mouse.move(fc.x, fc.y);
    await dp.focus('#sd-zoom-in');
    const pct0 = await dp.textContent('#sd-zoom-pct');
    await dp.keyboard.press('Space');
    const zoomed = await waitTo(dp, 'Space trên Zoom in thu phóng', (p) => document.getElementById('sd-zoom-pct').textContent !== p, pct0);
    check('Space trên nút Zoom in khi chuột trên sơ đồ: nút được bấm, không thành giữ để kéo', zoomed && !(await dp.$('#sd-fig.is-grab')), pct0);
    await dp.click('#sd-view-reset');

    await dx.close();

    /* Dự án mới, áp lối "Frontend + backend API": có luật báo; link cảnh báo trên trang, đóng sau khi sửa thì về link mới. */
    const { ctx: wx, page: wp } = await open(1280, 900);
    await wp.click('#start .tpl[data-tpl="crisp-dm"]');
    await wp.waitForSelector('#sd-fig svg');
    await wp.click('#sd-open');
    await wp.click('#sd-pane input[data-path][value="api"]', { force: true });
    await wp.click('#sd-pane [data-apply]');
    await wp.keyboard.press('Escape');
    await shut(wp);
    const warn = await wp.$eval('#sd-warns [data-warn]', (b) => `#sd-warns [data-warn="${b.dataset.warn}"]`).catch(() => '');
    if (!warn) check('lối api có cảnh báo trên trang', false);
    else {
      const wOld = await wp.$(warn);
      await wp.focus(warn);
      await wp.keyboard.press('Enter');
      await wp.waitForSelector('#dlg-sd[open]');
      await wp.click('#sd-pane textarea[data-note]');
      await wp.keyboard.type('x');
      await wp.keyboard.press('Escape');
      await shut(wp);
      check('sửa rồi đóng hộp mở từ link cảnh báo: focus về link vừa vẽ lại', (await focusIs(wp, warn)) && !(await wOld.evaluate((b) => b.isConnected)));
    }

    /* Handoffs: gõ hợp đồng thì đầu khối (tóm tắt, viền đã ghi) đổi ngay; nhãn trên sơ đồ mở lại hộp, đóng thì về nhãn mới. */
    await wp.click('#sd-open');
    await wp.click(`#sd-nav [data-at="${cat.stages.length + 3}"]`);
    const key = await wp.$eval('#sd-pane [data-edge-item]', (d) => d.dataset.edgeItem);
    const item = `#sd-pane [data-edge-item="${key}"]`;
    await wp.click(`${item} > summary`);
    const g0 = await wp.$eval(item, (d) => ({ sum: d.querySelector('summary small').textContent, set: d.classList.contains('is-set') }));
    await wp.fill(`${item} input[data-ef="what"]`, 'clean.parquet');
    const g1 = await wp.$eval(item, (d) => ({ sum: d.querySelector('summary small').textContent, set: d.classList.contains('is-set') }));
    check('Handoffs: gõ "What is handed over" thì đầu khối đổi ngay (tóm tắt, viền đã ghi)', g0.sum === 'Not described yet' && !g0.set
      && g1.sum.includes('clean.parquet') && g1.set, JSON.stringify({ g0, g1 }));
    await wp.keyboard.press('Escape');
    await shut(wp);
    const cap = `#sd-fig .sd-hand[data-edge="${key}"]`;
    const cOld = await wp.$(cap);
    await wp.$eval(cap, (g) => g.scrollIntoView({ block: 'center' }));
    await wp.focus(cap);
    await wp.keyboard.press('Enter');
    await wp.waitForSelector('#dlg-sd[open]');
    await wp.fill(`${item} input[data-ef="where"]`, 'data/clean/');
    await wp.keyboard.press('Escape');
    await shut(wp);
    check('sửa rồi đóng hộp mở từ nhãn bàn giao: focus về nhãn vừa vẽ lại', (await focusIs(wp, cap)) && !(await cOld.evaluate((g) => g.isConnected)));
    await wx.close();

    /* Một dự án mới: Architecture là trang gợi ý; "Add tasks to plan" không in "null", đếm số ít / nhiều đúng; Cancel không xanh. */
    const { ctx: ax, page: ap } = await open(1280, 900);
    await ap.click('#start .tpl[data-tpl="crisp-dm"]');
    await ap.waitForSelector('#sd-fig svg');
    await ap.click('#sd-arch [data-arch-open]');
    await ap.waitForSelector('#dlg-sd[open] .sd-fam');
    const guide = await ap.evaluate(() => {
      const nav = document.querySelector('#sd-nav [data-at="2"]'), app = document.querySelector('#sd-pane [data-fam="app"]');
      const picks = [...document.querySelectorAll('#sd-pane .sd-fam')].map((f) => [...f.querySelectorAll('input[data-arch-pick]')]);
      return { note: !!document.querySelector('#sd-pane .sd-note[data-guide]'), cls: nav.className, sr: nav.querySelector('.sr').textContent,
        needs: [...document.querySelectorAll('#sd-pane .sd-fam')].every((f) => !!f.querySelector('.sd-rec, .sd-need')),
        needPath: !!app.querySelector('.sd-need [data-need="path"][data-at="0"]'),
        use: picks.every((l) => l.length > 2 && l[0].value === '' && l[0].checked && l.every((b) => b.closest('label').getClientRects().length > 0)) };
    });
    check('Architecture: dòng "guide" ở đầu, mục trái dấu trung tính "(guide)", mỗi nhóm nêu gợi ý hay câu còn thiếu, mỗi nhóm có hàng chọn (Not chosen đang chọn)',
      guide.note && /\bis-guide\b/.test(guide.cls) && guide.sr.includes('(guide)') && guide.needs && guide.needPath && guide.use, JSON.stringify(guide));
    const card = '#sd-pane [data-fam="storage"] .sd-arch:not(.is-rec)';
    const bc0 = await ap.$eval(card, (d) => getComputedStyle(d).borderColor);
    await ap.hover(`${card} > summary`);
    const hovered = await ap.waitForFunction(([s, c]) => getComputedStyle(document.querySelector(s)).borderColor !== c, [card, bc0], { timeout: 2000 }).then(() => true, () => false);
    check('Architecture: thẻ kiến trúc đổi viền khi rê chuột', hovered);
    const arch = await ap.$eval('#sd-pane [data-fam="app"] [data-arch]', (b) => b.dataset.arch);
    await ap.click(`#sd-pane input[data-arch-pick="app"][value="${arch}"]`, { force: true });
    const used = await ap.$eval(`#sd-pane [data-arch="${arch}"]`, (d) => ({ open: d.open, mine: /Your deliverable/.test(d.querySelector('summary').textContent),
      rec: document.querySelector('#sd-pane [data-fam="app"] .sd-rec')?.dataset.rec }));
    check('Architecture: chọn kiến trúc mang lối đặt lối mà không mở thẻ; nhóm app gợi ý đúng kiến trúc ấy', !used.open && used.mine && used.rec === arch
      && !!(await cur(ap)).design.path, JSON.stringify(used));
    await ap.click(`#sd-nav [data-at="${pageOf('raw')}"]`);
    await ap.click('#sd-pane .sd-opt input');
    await ap.keyboard.press('Escape');
    await shut(ap);
    await ap.click('#sd-plan');
    await ap.waitForSelector('#dlg-sdp[open]');
    await ap.click('#sdp-go');
    await waitTo(ap, 'hộp Update plan đóng', () => !document.getElementById('dlg-sdp').open);
    await ap.click('#sd-plan');
    await ap.waitForSelector('#dlg-sdp[open]');
    const nulls = () => ap.$eval('#sdp-list', (l) => { const w = document.createTreeWalker(l, NodeFilter.SHOW_TEXT); let n, k = 0; while ((n = w.nextNode())) if (/^(null|undefined)$/.test(n.nodeValue.trim())) k++; return k; });
    const same = await ap.$eval('#sdp-list', (l) => l.textContent.trim());
    check('Add tasks to plan: không chữ "null"; một việc khớp ghi "1 task already matches"', (await nulls()) === 0 && same === '1 task already matches the design.', same);
    await ap.keyboard.press('Escape');
    await ap.click(`#sd-arch [data-arch-open]`);
    await ap.click(`#sd-nav [data-at="${pageOf('raw')}"]`);
    await ap.click('#sd-pane .sd-opt input:checked');
    await ap.keyboard.press('Escape');
    await shut(ap);
    await ap.click('#sd-plan');
    await ap.waitForSelector('#dlg-sdp[open] .sd-pill');
    const pill = await ap.$eval('#sdp-list .sd-pill input:checked + span', (s) => {
      const probe = document.body.appendChild(Object.assign(document.createElement('i'), { style: 'background: var(--accent)' }));
      const accent = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return { text: s.textContent, bg: getComputedStyle(s).backgroundColor, accent };
    });
    check('Update plan: lựa chọn Cancel đang chọn ở "No longer in the design" không tô màu nhấn', pill.text === 'Cancel' && pill.bg !== pill.accent && (await nulls()) === 0, JSON.stringify(pill));
    await ax.close();

    /* 390px, cảm ứng: chạm lòng nút chưa quyết mở hộp; hộp toàn màn không dáng tấm trượt; dải chip thấy mục đang xem;
     * link chữ của mục (Architecture guide) có vùng chạm ≥ 44px. */
    const { ctx: mx, page: mp } = await open(390, 844, { isMobile: true, hasTouch: true });
    await mp.click('#start .tpl[data-tpl="crisp-dm"]');
    await mp.waitForSelector('#sd-fig svg');
    const tB = await mp.$eval('#sd-fig .sd-node.is-open[data-stage]', probe);
    await mp.touchscreen.tap(tB.x, tB.y);
    const tapB = await waitTo(mp, 'chạm lòng nút chưa quyết mở hộp', () => document.getElementById('dlg-sd').open);
    const full = await mp.$eval('#dlg-sd', (d) => (d.getAnimations({ subtree: true }).forEach((x) => x.finish()), { radius: getComputedStyle(d).borderTopLeftRadius, grip: getComputedStyle(d.querySelector('.dlg-head'), '::before').content,
      top: Math.round(d.getBoundingClientRect().top) }));
    check('390px: chạm lòng nút chưa quyết mở hộp; hộp toàn màn không bo góc, không thanh nắm', tB.ok && tapB && full.radius === '0px' && full.grip === 'none' && full.top === 0, JSON.stringify(full));
    await mp.keyboard.press('Escape');
    await shut(mp);
    await mp.$eval(`#sd-fig [data-stage="${last}"]`, (n) => n.scrollIntoView({ block: 'center' }));
    await mp.focus(`#sd-fig [data-stage="${last}"]`);
    await mp.keyboard.press('Enter');
    await mp.waitForSelector('#dlg-sd[open]');
    const navM = await navIn(mp, 'ol');
    check('390px: hộp mở ở khâu cuối, chip đang xem nằm trong dải chip', navM.ok && +navM.item === pageOf(last), JSON.stringify(navM));
    await mp.keyboard.press('Escape');
    await shut(mp);
    const link = await mp.$eval('#sd-arch [data-arch-open]', (el) => {
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const at = (y) => { const t = document.elementFromPoint(cx, y); return !!t && (t === el || el.contains(t)); };
      return { h: Math.round(r.height), ok: at(cy - 21.5) && at(cy + 21.5) };
    });
    check('390px: link chữ "Architecture guide" có vùng chạm cao ≥ 44px', link.ok, JSON.stringify(link));
    await mx.close();

    /* 768px: sơ đồ hai cột; chữ trong nút bị cắt thì có tooltip ghi đủ. */
    const { ctx: tx, page: tp } = await open(768, 1024);
    await tp.click('#start .tpl[data-tpl="crisp-dm"]');
    await tp.waitForSelector('#sd-fig svg');
    const wide = await tp.$eval('#sd-fig', (f) => {
      const ns = [...f.querySelectorAll('.sd-flow > .sd-node')];
      const cols = new Set(ns.map((n) => Math.round(n.getBoundingClientRect().left))).size;
      const cut = ns.filter((n) => [...n.querySelectorAll('text')].some((t) => t.textContent.endsWith('…')));
      return { cols, cut: cut.length, tips: cut.every((n) => n.querySelector(':scope > title')?.textContent.length > 0) };
    });
    check('768px: sơ đồ xếp hai cột; chữ bị cắt có tooltip <title>', wide.cols === 2 && wide.tips, JSON.stringify(wide));
    await tx.close();
  });

  /* ── Nhập: Esc, Close khi đã dán chữ thì hỏi lại như hộp sửa; chưa dán gì thì đóng ngay ── */
  await section('Nhập hỏi lại khi đóng', async () => {
    const { ctx: ix, page: ip } = await open(1280, 900);
    await ip.click('#start .tpl[data-tpl="stats-report"]');
    await ip.waitForSelector('.card[data-sub]');
    const isOpen = (id) => ip.$eval(id, (d) => d.open);
    await ip.click('#import-btn');
    await ip.waitForSelector('#dlg-import[open]');
    await ip.keyboard.press('Escape');
    const emptyClosed = await waitTo(ip, 'hộp Nhập trống đóng ngay', () => !document.querySelector('#dlg-import').open);
    await ip.click('#import-btn');
    await ip.fill('#import-text', '# Dự án dán\n\n## 1. Bước\n- [ ] Việc');
    await ip.keyboard.press('Escape');
    await ip.waitForSelector('#dlg-ask[open]');
    const title = await ip.textContent('#dlg-ask-title');
    await ip.keyboard.press('Escape');
    await waitTo(ip, 'hộp hỏi đóng', () => !document.querySelector('#dlg-ask').open);
    const kept = (await isOpen('#dlg-import')) && (await ip.inputValue('#import-text')).startsWith('# Dự án dán');
    await ip.click('#dlg-import .dlg-foot [data-close]');
    await ip.waitForSelector('#dlg-ask[open]');
    await ip.click('#ask-ok');
    const gone = await waitTo(ip, 'Discard đóng hộp Nhập', () => !document.querySelector('#dlg-import').open);
    check('Nhập: chưa dán gì thì Esc đóng ngay; đã dán thì Esc, Close hỏi "Discard changes?", đóng hộp hỏi thì chữ còn nguyên',
      emptyClosed && title === 'Discard changes?' && kept && gone, JSON.stringify({ emptyClosed, title, kept, gone }));
    /* Nhập xong không hỏi lại. */
    await ip.click('#import-btn');
    await ip.fill('#import-text', '# Dự án dán\n\n## 1. Bước\n- [ ] Việc');
    await ip.click('#import-go');
    const done = await waitTo(ip, 'Nhập xong đóng hộp', () => !document.querySelector('#dlg-import').open);
    check('Nhập: bấm Import thì đóng, không hỏi lại', done && !(await isOpen('#dlg-ask')));
    await ix.close();
  });

  /* ── Tab tới thẻ ở mép hàng (320px, 390px): cả thẻ vào trong scroll-padding, không nằm dưới mép mờ; bấm chuột không làm hàng nhảy ── */
  await section('Tab tới thẻ ở mép hàng', async () => {
    for (const w of [320, 390]) {
      const { ctx: tx, page: tp } = await open(w, 800, { reducedMotion: 'reduce' });
      await tp.click('#start .tpl[data-tpl="stats-report"]');
      await tp.waitForSelector('.card[data-sub]');
      const sid = await tp.$$eval('.step[data-step]', (rows) => rows.find((r) => r.querySelectorAll('.card').length >= 3).dataset.step);
      const ids = await tp.$$eval(`.step[data-step="${sid}"] .card`, (cs) => cs.map((c) => c.dataset.sub));
      /* Phần thẻ (trái) và tên thẻ nằm ngoài vùng trong scroll-padding, px; hàng đã cuộn tới mép thì mép ấy không mờ, không tính. */
      const hidden = () => tp.evaluate(() => {
        const a = document.activeElement, sc = a.closest('.cards-scroll'), cs = getComputedStyle(sc), r = sc.getBoundingClientRect();
        const lo = r.left + parseFloat(cs.scrollPaddingLeft), hi = r.right - parseFloat(cs.scrollPaddingRight);
        const c = a.closest('.card').getBoundingClientRect(), t = a.getBoundingClientRect();
        const atL = sc.scrollLeft <= 1, atR = sc.scrollLeft + sc.clientWidth >= sc.scrollWidth - 1;
        return Math.max(atL ? 0 : lo - c.left, atL ? 0 : lo - t.left, atR || c.width > hi - lo ? 0 : c.right - hi, atR || t.width > hi - lo ? 0 : t.right - hi);
      });
      await tp.focus(subSel(ids[0], 'edit-sub'));
      await tp.keyboard.press('Tab'); // tên → chip
      const worst = [];
      for (let i = 1; i < ids.length; i++) {
        await tp.keyboard.press('Tab'); // chip → tên thẻ sau
        await tp.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        worst.push(Math.round(await hidden()));
        await tp.keyboard.press('Tab');
      }
      check(`${w}px: Tab từ chip sang tên thẻ sau — cả thẻ và tên nằm ngoài mép mờ`, worst.every((x) => x <= 1), worst.join(','));
      /* Chuột: bấm tên thẻ đang lấp dưới mép mờ trái thì hàng đứng yên. */
      const sc = `.step[data-step="${sid}"] .cards-scroll`;
      const tb = await tp.$eval(sc, (el, id) => {
        const t = el.querySelector(`.card[data-sub="${id}"] [data-act="edit-sub"]`);
        el.scrollLeft += t.getBoundingClientRect().left - el.getBoundingClientRect().left + 8;
        const b = t.getBoundingClientRect();
        return b.right > el.getBoundingClientRect().left + 24 && { x: el.getBoundingClientRect().left + 16, y: b.top + b.height / 2 };
      }, ids[1]);
      const before = await tp.$eval(sc, (el) => el.scrollLeft);
      check(`${w}px: có tên thẻ lấp một phần dưới mép mờ trái để bấm`, !!tb);
      if (tb) {
        await tp.mouse.click(tb.x, tb.y);
        await tp.waitForSelector('#dlg-sub[open]');
        const after = await tp.$eval(sc, (el) => el.scrollLeft);
        check(`${w}px: bấm chuột vào thẻ ở mép không cuộn hàng`, after === before, `${before} → ${after}`);
        await tp.keyboard.press('Escape');
      }
      await tx.close();
    }
  });

  /* ── Focus sau Lưu, refocus, Ctrl + Z khi đang gõ, gõ chữ đầu trong danh sách ── */
  await section('Focus, phím tắt, gõ chữ trong danh sách', async () => {
    const fws = { id: 'wf', name: 'Focus', log: [], steps: [
      { id: 'f1', title: 'Alpha', subs: [{ id: 'fa', title: 'Một' }, { id: 'fb', title: 'Hai' }] },
      { id: 'f2', title: 'Beta', subs: [{ id: 'fc', title: 'Ba' }] }] };
    const fc = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await fc.addInitScript((d) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('stepPlanner.v2', JSON.stringify({ version: 2, workspaces: [d], lastId: d.id })); } }, fws);
    const fp = await fc.newPage();
    fp.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    fp.on('pageerror', (e) => errors.push('focus: ' + e));
    await fp.goto(BASE);
    await fp.waitForSelector('.card[data-sub="fc"]');

    // Lưu hộp sửa bước: focus về nút tên của chính bước ấy (không về ô tìm).
    await fp.click('.step[data-step="f2"] .step-head [data-act="edit-step"]');
    await fp.fill('#step-form [name="title"]', 'Beta 2');
    await fp.click('#step-form button[type="submit"]');
    await waitTo(fp, 'hộp sửa bước đóng', () => !document.querySelector('#dlg-step[open]'));
    const back = await fp.evaluate(() => ({ step: document.activeElement?.closest('.step')?.dataset.step, act: document.activeElement?.dataset.act }));
    check('hộp sửa bước: Lưu thì focus về tên bước vừa sửa', back.step === 'f2' && back.act === 'edit-step', JSON.stringify(back));

    // refocus: bỏ qua phần tử ẩn, phần tử tắt; không trúng gì thì về bảng.
    const rf = await fp.evaluate(async () => {
      const { refocus } = await import(new URL('js/ui/state.js', location.href).href);
      const mk = (id, set) => { const b = document.createElement('button'); b.id = id; set(b); document.getElementById('app').append(b); };
      mk('rf-hidden', (b) => { b.hidden = true; });
      mk('rf-off', (b) => { b.disabled = true; });
      mk('rf-ok', () => {});
      refocus('#rf-hidden || #rf-off || #rf-ok');
      const a = document.activeElement?.id;
      refocus('#rf-hidden || #rf-off');
      const b = document.activeElement?.id;
      document.querySelectorAll('[id^="rf-"]').forEach((x) => x.remove());
      return { a, b };
    });
    check('refocus: bỏ qua phần tử ẩn và phần tử tắt; không trúng thì về bảng', rf.a === 'rf-ok' && rf.b === 'board', JSON.stringify(rf));

    // Xoá bước con: toast có Hoàn tác. Ctrl + Z khi đang ở ô chữ là của ô chữ, không hoàn tác; ra khỏi ô chữ thì hoàn tác.
    const subsOf = async () => (await cur(fp)).steps[0].subs.map((x) => x.id).join();
    await fp.click(subSel('fb', 'sub-del'), { force: true });
    await waitTo(fp, 'toast xoá có Hoàn tác', () => !document.getElementById('toast').hidden && !document.getElementById('toast-undo').hidden);
    const del = await subsOf();
    await fp.focus('#q');
    await fp.keyboard.press('Control+z');
    const typingZ = await subsOf();
    const toastOn = await fp.evaluate(() => !document.getElementById('toast').hidden);
    await fp.evaluate(() => /** @type {any} */ (document.activeElement)?.blur());
    await fp.keyboard.press('Control+z');
    const undone = await subsOf();
    check('Ctrl + Z trong ô chữ không bấm Hoàn tác của toast; ngoài ô chữ thì có', del === 'fa' && typingZ === 'fa' && toastOn && undone === 'fa,fb',
      JSON.stringify({ del, typingZ, toastOn, undone }));

    // Danh sách tự dựng: gõ "d" nhảy tới mục mở đầu bằng "Đ" (bỏ dấu, đ → d).
    const dd = await fp.evaluate(async () => {
      const { openList } = await import(new URL('js/ui/dropdown.js', location.href).href);
      const a = document.createElement('button');
      a.id = 'dd-probe';
      a.textContent = 'Probe';
      document.getElementById('app').append(a);
      openList(a, [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }, { value: 'd', label: 'Đánh giá' }, { value: 'e', label: 'Delta' }], () => {});
      return true;
    });
    await fp.keyboard.press('d');
    const act = await fp.$eval('.dd-pop [role="option"].active', (o) => o.dataset.value);
    await fp.keyboard.press('Escape');
    await fp.$eval('#dd-probe', (a) => a.remove());
    check('danh sách: gõ chữ đầu khớp cả chữ có dấu, "d" khớp "Đ"', dd && act === 'd', act);
    await fc.close();
  });

  /* ── Hộp hỏi và ô nhập: Enter trong ô hỏi là OK, câu hỏi xoá / bỏ chữ focus Close, xoá bước huỷ giữ hộp sửa, chữ chỉ có
   * khoảng trắng bị chặn, Enter ngoài ô tên không Lưu, Tab vòng lại thấy ô tên, focus không rơi về body, nhập chữ bất kỳ
   * bị chặn, danh sách chọn nằm trong hộp, tên miền dài không lấn tên tài liệu ── */
  await section('Hộp hỏi và ô nhập', async () => {
    const { page: q } = await open(1440, 900);
    await q.click('#start .tpl[data-tpl="crisp-dm"]');
    await q.waitForSelector('.card[data-sub]');
    const openIds = () => q.evaluate(() => [...document.querySelectorAll('dialog[open]')].map((d) => d.id).join());
    const focused = () => q.evaluate(() => { const a = document.activeElement; return !a || a === document.body ? 'body' : a.id || a.dataset.k || a.name || a.textContent.trim(); });
    const closed = (id) => waitTo(q, `#${id} đóng`, (x) => !document.getElementById(x).open, id);

    // Đổi tên dự án: Enter trong ô là OK (gửi ngầm từng dùng nút thứ hai đang ẩn, tên thành "\u0000alt").
    await q.click('#ws-btn');
    await q.click('#ws-list .ws-item:first-child [data-act="ws-rename"]');
    await q.fill('#ask-input', 'Đổi tên bằng Enter');
    await q.keyboard.press('Enter');
    await closed('dlg-ask');
    const renamed = (await cur(q)).name;
    check('hỏi tên: Enter trong ô là OK', renamed === 'Đổi tên bằng Enter', JSON.stringify(renamed));
    // Xoá dự án: focus Close, Enter không xoá.
    await q.click('#ws-list .ws-item:first-child [data-act="ws-del"]');
    const delFocus = await focused();
    await q.keyboard.press('Enter');
    await closed('dlg-ask');
    check('hỏi xoá dự án: focus Close, Enter không xoá', delFocus === 'Close' && (await stored(q)).workspaces.length === 1, delFocus);
    await q.keyboard.press('Escape');
    await closed('dlg-ws');

    // Esc rồi Enter trên "Discard changes?": hộp sửa vẫn mở, chữ còn.
    const sub0 = await q.$eval('.card[data-sub]', (x) => x.dataset.sub);
    await q.click(subSel(sub0, 'edit-sub'));
    await q.fill('#sub-form [name="title"]', 'Chữ chưa lưu');
    await q.keyboard.press('Escape');
    const discardFocus = await focused();
    await q.keyboard.press('Enter');
    await closed('dlg-ask');
    check('Esc rồi Enter trên "Discard changes?": focus Close, hộp sửa và chữ còn', discardFocus === 'Close' && (await openIds()) === 'dlg-sub'
      && (await q.inputValue('#sub-form [name="title"]')) === 'Chữ chưa lưu', discardFocus);

    // Tên chỉ có khoảng trắng: Lưu dừng ở ô tên, có câu báo; tên đầu ra chỉ có khoảng trắng: như thế.
    const title0 = (await cur(q)).steps[0].subs[0].title;
    await q.fill('#sub-form [name="title"]', '   ');
    await q.click('#sub-form button[type="submit"]');
    const blankTitle = await q.evaluate(() => ({ open: document.getElementById('dlg-sub').open, msg: document.querySelector('#sub-form [name="title"]').validationMessage }));
    await q.fill('#sub-form [name="title"]', title0);
    await q.click('#sub-hand [data-out-add]');
    await q.fill('#sub-hand .out-row:last-child [data-k="name"]', '  ');
    await q.click('#sub-form button[type="submit"]');
    const blankOut = await q.evaluate(() => ({ open: document.getElementById('dlg-sub').open, msg: document.querySelector('#sub-hand .out-row:last-child [data-k="name"]').validationMessage }));
    check('chữ chỉ có khoảng trắng: tên, tên đầu ra báo trên ô, không lưu', blankTitle.open && !!blankTitle.msg && blankOut.open && !!blankOut.msg
      && (await cur(q)).steps[0].subs[0].title === title0 && !(await cur(q)).steps[0].subs[0].outs.length, JSON.stringify({ blankTitle, blankOut }));

    // Enter ở ô ngoài tên (đầu ra, Path, Contract, Done when, trạng thái) không Lưu, không đóng hộp; Enter ở tên thì Lưu.
    await q.fill('#sub-hand .out-row:last-child [data-k="name"]', 'bảng.csv');
    const stay = [];
    for (const sel of ['#sub-hand .out-row:last-child [data-k="name"]', '#sub-hand .out-row:last-child [data-k="ref"]', '#sub-hand .out-row:last-child [data-k="note"]',
      '#sub-form [name="doneWhen"]', '#sub-form [name="status"]:checked', '#sub-form [name="due"]']) {
      await q.focus(sel);
      await q.keyboard.press('Enter');
      await afterSave(q);
      if (!(await q.evaluate(() => document.getElementById('dlg-sub').open))) stay.push(sel);
    }
    await q.focus('#sub-form [name="title"]');
    await q.keyboard.press('Enter');
    await closed('dlg-sub');
    const outs = (await cur(q)).steps[0].subs[0].outs;
    check('Enter ngoài ô tên không Lưu; Enter ở tên Lưu cả đầu ra', !stay.length && outs.length === 1 && outs[0].name === 'bảng.csv', stay.join(' | '));

    // Xoá bước còn bước con: hỏi trên hộp sửa; Close thì hộp và chữ còn; Delete step thì xoá, focus Hoàn tác.
    const step0 = await q.$eval('.step[data-step]', (x) => x.dataset.step);
    const nSteps0 = (await cur(q)).steps.length;
    await q.click(`.step[data-step="${step0}"] .step-head [data-act="edit-step"]`);
    await q.fill('#step-form [name="goal"]', 'Mục tiêu đang gõ');
    await q.click('#step-del');
    await q.waitForSelector('#dlg-ask[open]');
    const stepDelFocus = await focused();
    await q.click('#dlg-ask .dlg-foot [data-close]');
    await closed('dlg-ask');
    const kept = { open: await openIds(), goal: await q.inputValue('#step-form [name="goal"]'), steps: (await cur(q)).steps.length };
    await q.click('#step-del');
    await q.click('#ask-ok');
    await closed('dlg-step');
    const gone = { steps: (await cur(q)).steps.length, focus: await focused() };
    check('xoá bước: Close giữ hộp sửa và chữ; Delete step xoá, focus Hoàn tác', stepDelFocus === 'Close' && kept.open === 'dlg-step' && kept.goal === 'Mục tiêu đang gõ'
      && kept.steps === nSteps0 && gone.steps === nSteps0 - 1 && gone.focus === 'toast-undo', JSON.stringify({ stepDelFocus, kept, gone }));
    await q.keyboard.press('Enter'); // Hoàn tác
    await waitTo(q, 'hoàn tác xoá bước', (n) => JSON.parse(localStorage.getItem('stepPlanner.v2')).workspaces[0].steps.length === n, nSteps0);

    // Tab vòng lại về ô tên (khung thấp, thân đã cuộn): ô tên hiện trong thân hộp.
    await q.setViewportSize({ width: 1440, height: 600 });
    await q.click(subSel(sub0, 'edit-sub'));
    let wrap = null;
    for (let i = 0; i < 80 && !wrap; i++) {
      await q.keyboard.press('Tab');
      if (i > 2) wrap = await q.evaluate(() => { const a = document.activeElement; if (a.name !== 'title') return null;
        const r = a.getBoundingClientRect(), b = a.closest('.dlg-body').getBoundingClientRect(); return { top: Math.round(r.top - b.top), bottom: Math.round(b.bottom - r.bottom) }; });
    }
    check('Tab vòng lại về ô tên: ô tên hiện trong thân hộp', !!wrap && wrap.top >= -1 && wrap.bottom >= -1, JSON.stringify(wrap));
    await q.keyboard.press('Escape');
    await closed('dlg-sub');
    await q.setViewportSize({ width: 1440, height: 900 });

    // Nhập chữ không nhận ra gì: báo, tắt Import; Markdown có bước thì bật lại.
    await q.click('#import-btn');
    await q.fill('#import-text', 'chữ bất kỳ\nkhông phải dự án');
    const junk = await q.evaluate(() => ({ bad: document.getElementById('import-preview').classList.contains('bad'), off: document.getElementById('import-go').disabled, text: document.getElementById('import-preview').textContent }));
    await q.fill('#import-text', '# Dự án\n\n## 1. Bước\n- [ ] Việc');
    const good = await q.evaluate(() => !document.getElementById('import-go').disabled);
    check('nhập chữ không nhận ra gì: báo, tắt Import', junk.bad && junk.off && /Nothing recognised/.test(junk.text) && good, JSON.stringify(junk));
    await q.keyboard.press('Escape');
    await q.click('#ask-ok');
    await closed('dlg-import');
  });

  /* Danh sách chọn trong hộp, tên miền dài của tài liệu: đo ở 1440 và 390 px. Hộp hỏi đầu vào cuối: focus không về body. */
  await section('Danh sách chọn và tài liệu trong hộp', async () => {
    for (const [w, hgt] of [[1440, 900], [390, 844]]) {
      const { page: q } = await open(w, hgt);
      await q.click('#start .tpl[data-tpl="crisp-dm"]');
      await q.waitForSelector('.card[data-sub]');
      await q.evaluate(() => {
        const s = JSON.parse(localStorage.getItem('stepPlanner.v2'));
        const ws = s.workspaces.find((x) => x.id === s.lastId);
        ws.steps[0].subs[0].docs = [{ id: 'dl1', kind: 'link', title: 'Data card of the project', url: 'https://a-very-long-subdomain-name.some-really-long-domain-name-for-testing.example.com/x', proof: false }];
        localStorage.setItem('stepPlanner.v2', JSON.stringify(s));
      });
      await q.reload();
      await q.waitForSelector('.card[data-sub]');
      await q.click('.card[data-sub] [data-act="edit-sub"]');
      const row = await q.$eval('#sub-docs .doc-row', (r) => {
        const t = r.querySelector('.doc-link span').getBoundingClientRect(), d = r.querySelector('.doc-link small').getBoundingClientRect(), p = r.querySelector('.proof-btn').getBoundingClientRect();
        return { title: Math.round(t.width), titleEnd: Math.round(t.right), domain: Math.round(d.left), domainEnd: Math.round(d.right), proof: Math.round(p.left) };
      });
      check(`${w}px: tên miền dài không lấn tên tài liệu, không đè nút`, row.title >= 80 && row.titleEnd <= row.domain && row.domainEnd <= row.proof, JSON.stringify(row));
      await q.click('#sub-form .f-pos .dd-btn');
      await q.waitForSelector('.dd-pop');
      const pop = await q.evaluate(() => {
        const p = document.querySelector('.dd-pop').getBoundingClientRect(), d = document.getElementById('dlg-sub').getBoundingClientRect(), b = document.querySelector('#sub-form .f-pos .dd-btn').getBoundingClientRect();
        return { left: Math.round(p.left), right: Math.round(p.right), dl: Math.round(d.left), dr: Math.round(d.right), bl: Math.round(b.left), br: Math.round(b.right), vw: innerWidth };
      });
      await q.keyboard.press('Escape');
      const ctl = await q.$eval('#sub-form .f-pos .dd-btn', (b) => b.getAttribute('aria-controls'));
      check(`${w}px: danh sách Position nằm trong hộp và khung nhìn, canh theo nút (rộng hơn chỗ thì sát mép); đóng thì bỏ aria-controls`, pop.left >= Math.max(pop.dl, 0) && pop.right <= Math.min(pop.dr, pop.vw)
        && (pop.left === pop.bl || pop.right === pop.br || pop.left === Math.max(pop.dl, 8)) && ctl === null, JSON.stringify({ pop, ctl }));
    }
    // Gỡ đầu vào cuối khi "Use existing output" tắt (không đầu ra nào để chọn): focus sang nút còn bật, không về body.
    const { page: q } = await open(1440, 900);
    await q.click('#start .tpl[data-tpl="blank"]');
    await q.waitForSelector('#board');
    await q.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('stepPlanner.v2'));
      const ws = s.workspaces.find((x) => x.id === s.lastId);
      ws.steps = [{ id: 'gs1', title: 'Bước A', ins: ['mất1'], subs: [{ id: 'gu1', title: 'Việc A', status: 'todo', ins: ['mất2'] }] }];
      localStorage.setItem('stepPlanner.v2', JSON.stringify(s));
    });
    await q.reload();
    await q.waitForSelector('.card[data-sub="gu1"]');
    const res = [];
    for (const [open1, where] of [[subSel('gu1', 'edit-sub'), 'sub'], ['.step[data-step="gs1"] .step-head [data-act="edit-step"]', 'step']]) {
      await q.click(open1);
      const off = await q.$eval(`#${where}-hand [data-in-pick]`, (b) => b.disabled);
      await q.focus(`#${where}-hand [data-in-del]`);
      await q.keyboard.press('Enter');
      res.push({ where, off, at: await q.evaluate(() => { const a = document.activeElement; return a === document.body ? 'body' : (a.disabled ? 'disabled ' : '') + a.textContent.trim(); }) });
      await q.keyboard.press('Escape');
      await q.click('#ask-ok');
      await waitTo(q, 'hộp sửa đóng', () => !document.querySelector('dialog[open]'));
    }
    check('gỡ đầu vào cuối khi nút chọn tắt: focus nút còn bật, không về body', res.every((r) => r.off && r.at === 'Add output'), JSON.stringify(res));
  });

  /* ── Bảng và thanh trên: các lỗi chỉ thấy khi bấm thật ── */
  /** Mở trang với dữ liệu gieo sẵn (mỗi context một lần). @param {number} w @param {number} hh @param {any} data */
  const seeded = async (w, hh, data) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: hh }, isMobile: w < 500, hasTouch: w < 500 });
    if (data) await ctx.addInitScript((d) => { if (!localStorage.getItem('stepPlanner.v2')) localStorage.setItem('stepPlanner.v2', d); }, JSON.stringify(data));
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(BASE);
    return { ctx, page };
  };
  const three = { version: 2, lastId: 'wk', workspaces: [{ id: 'wk', name: 'Ba bước', steps: ['Một', 'Hai', 'Ba'].map((t, i) => ({ id: 'tk' + i, title: t,
    subs: [{ id: `k${i}a`, title: `Việc ${i}a`, status: 'todo' }, { id: `k${i}b`, title: `Việc ${i}b`, status: 'todo' }, { id: `k${i}c`, title: `Việc ${i}c ngắn`, status: 'todo' }] })), log: [] }] };

  /* Chạm thật qua CDP (Input.dispatchTouchEvent): trình duyệt tự capture ngón vào phần tử dưới ngón, như trên máy thật.
   * PointerEvent tự dựng bỏ qua bước ấy, nên phần "Điện thoại 390px" không thấy lỗi kéo bước bằng tay nắm tự huỷ. */
  await section('Kéo bằng ngón thật (CDP)', async () => {
    const { ctx, page } = await seeded(390, 844, three);
    await page.waitForSelector('.step[data-step="tk0"] .step-grip');
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y]) => ({ x, y, id: 1 })) });
    const ghost = () => page.evaluate(() => !!document.querySelector('.drag-ghost'));
    const order = () => page.$$eval('#board .step[data-step]', (s) => s.map((x) => x.dataset.step).join());
    const g = await page.$eval('.step[data-step="tk0"] .step-grip', (e) => { e.scrollIntoView({ block: 'start' }); const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    const to = await page.$eval('.step[data-step="tk1"]', (e) => e.getBoundingClientRect().bottom - 8);
    await touch('touchStart', [g]);
    const frames = [];
    for (let i = 1; i <= 10; i++) { await touch('touchMove', [[g[0], g[1] + (to - g[1]) * i / 10]]); frames.push(await ghost()); }
    await touch('touchEnd', []);
    await waitTo(page, 'bóng kéo bước gỡ sau khi thả', () => !document.querySelector('.drag-ghost'));
    check('chạm thật: kéo bước bằng tay nắm không tự huỷ ở khung hình đầu; thả là dời', frames.every(Boolean) && (await order()) !== 'tk0,tk1,tk2',
      `${frames.map(Number).join('')} ${await order()}`);
    // Thẻ: giữ yên tới khi bóng hiện (đợi theo điều kiện), rồi kéo; bóng còn ở mọi khung hình.
    const c = await page.$eval('.card[data-sub="k2a"]', (e) => { e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + 12]; });
    await touch('touchStart', [c]);
    const held = await waitTo(page, 'giữ thẻ đủ lâu thì bắt đầu kéo', () => !!document.querySelector('.drag-ghost'));
    const cf = [];
    for (let i = 1; i <= 6; i++) { await touch('touchMove', [[c[0] + 4 * i, c[1] + 2 * i]]); cf.push(await ghost()); }
    await touch('touchEnd', []);
    check('chạm thật: giữ thẻ rồi kéo, bóng không mất giữa chừng', held && cf.every(Boolean), cf.map(Number).join(''));
    await ctx.close();
  });

  /* Thanh công cụ: gõ tìm không đẩy hàng xuống dòng (bảng không nhảy); ghi chú rỗng không chiếm dòng; Renumber cao như nút bên cạnh. */
  await section('Thanh công cụ khi tìm', async () => {
    for (const [w, hh] of [[1440, 900], [1280, 800], [390, 844]]) {
      const { ctx, page } = await seeded(w, hh, three);
      await page.waitForSelector('.card[data-sub="k0a"]');
      const m = () => page.evaluate(() => {
        const r = (s) => { const e = document.querySelector(s); return e && e.getClientRects().length ? e.getBoundingClientRect() : null; };
        return { tools: Math.round(r('.tools').height), board: Math.round(r('#board').top), note: !!r('#filter-note'), q: Math.round(r('#q').left),
          ren: r('#renumber-btn') && [Math.round(r('#renumber-btn').left), Math.round(r('#renumber-btn').height)], compact: Math.round(r('#compact-btn').height) };
      });
      const a = await m();
      await page.focus('.card[data-sub="k0a"] [data-act="edit-sub"]');
      await page.keyboard.press('Alt+ArrowRight');
      const b = await m();
      check(`thanh công cụ ${w}px: ghi chú lọc rỗng không chiếm chỗ; Renumber cao như nút Compact${w < 500 ? ', thẳng mép ô tìm' : ''}`, !a.note && !b.note
        && !!b.ren && b.ren[1] === b.compact && (w >= 500 || b.ren[0] === b.q), JSON.stringify({ a, b }));
      await page.fill('#q', 'việc');
      const c = await m();
      const note = await page.evaluate(() => { const n = document.getElementById('filter-note'); return { text: n.textContent, title: n.title }; });
      check(`thanh công cụ ${w}px: gõ tìm hiện số khớp${w < 500 ? '' : ', hàng không xuống dòng, bảng không nhảy'}`, c.note && /^9 sub-steps match/.test(note.text)
        && note.title.replace(/ /g, ' ') === '9 sub-steps match · reordering is off while searching' && (w < 500 || (c.tools === a.tools && c.board === b.board)),
        JSON.stringify({ a, c, note }));
      check(`thanh công cụ ${w}px: trang không tràn ngang`, (await hOverflow(page)) <= 0);
      await ctx.close();
    }
  });

  /* Thẻ cao: "Show less" kéo nút về khung nhìn; Compact bật rồi tắt giữ khối đã mở. */
  await section('Thẻ mở: Show less, Compact', async () => {
    const long = Array.from({ length: 40 }, (_, i) => `Dòng ghi chú ${i + 1}, đủ dài để thẻ mở ra cao hơn khung nhìn rất nhiều.`).join('\n');
    const data = { version: 2, lastId: 'wm', workspaces: [{ id: 'wm', name: 'Mở', steps: [{ id: 'tm', title: 'Bước', subs: [
      { id: 'm1', title: 'Thẻ ghi chú dài', status: 'todo', notes: long }, { id: 'm2', title: 'Thẻ ngắn', status: 'todo' }] }], log: [] }] };
    for (const [w, hh] of [[1280, 800], [390, 844]]) {
      const { ctx, page } = await seeded(w, hh, data);
      await page.waitForSelector('.card[data-sub="m1"] .more');
      await page.click('.card[data-sub="m1"] .more');
      const tall = await page.$eval('.card[data-sub="m1"]', (c) => c.getBoundingClientRect().height);
      await page.$eval('.card[data-sub="m1"] .more', (b) => b.scrollIntoView({ block: 'end' }));
      await page.click('.card[data-sub="m1"] .more');
      const r = await page.$eval('.card[data-sub="m1"] .more', (b) => { const x = b.getBoundingClientRect(); return { top: Math.round(x.top), bottom: Math.round(x.bottom), vh: innerHeight, text: b.textContent }; });
      check(`thẻ cao ${w}px: "Show less" thu thẻ, nút "Show more" vẫn trong khung nhìn`, tall > hh && r.text === 'Show more' && r.top >= 0 && r.bottom <= r.vh,
        JSON.stringify({ tall: Math.round(tall), ...r }));
      await page.click('.card[data-sub="m1"] .more');
      await page.click('#compact-btn');
      await page.click('#compact-btn');
      const st = await page.$eval('.card[data-sub="m1"]', (c) => ({ open: c.classList.contains('open'), more: c.querySelector('.more')?.textContent }));
      check(`thẻ đã mở ${w}px: bật rồi tắt Compact, thẻ vẫn mở`, st.open && st.more === 'Show less', JSON.stringify(st));
      await ctx.close();
    }
  });

  /* Dự án trống vừa tạo: cái thêm đầu tiên nhận số ngay (không chấm, không Renumber); chưa có bước con thì không có dòng tiến độ 0/0. */
  await section('Dự án trống mới', async () => {
    const { ctx, page } = await seeded(1280, 800, null);
    await page.waitForSelector('#start:not([hidden]) .tpl[data-tpl="blank"]');
    await page.click('#start .tpl[data-tpl="blank"]');
    await page.waitForSelector('#app:not([hidden])');
    const st = () => page.evaluate(() => ({ overall: !document.getElementById('overall').hidden, fresh: document.querySelectorAll('#board .fresh').length,
      nums: [...document.querySelectorAll('#board .step-num, #board .num')].map((e) => e.textContent).join(' '), ren: !document.getElementById('renumber-btn').hidden }));
    const s0 = await st();
    for (const t of ['A', 'B']) {
      await page.click('#add-step');
      await page.fill('#step-form [name="title"]', t);
      await page.keyboard.press('Enter');
      await page.waitForSelector('#dlg-step', { state: 'hidden' });
    }
    const s1 = await st();
    for (const t of ['a1', 'a2']) {
      await page.click('.step[data-step]:first-child [data-act="add-sub"]');
      await page.fill('#sub-form [name="title"]', t);
      await page.keyboard.press('Enter');
      await page.waitForSelector('#dlg-sub', { state: 'hidden' });
    }
    const s2 = await st();
    check('dự án trống mới: chưa bước con thì ẩn tiến độ chung; bước, bước con thêm vào nhận số ngay, không chấm, không Renumber',
      !s0.overall && !s1.overall && s2.overall && s1.nums === '1 2' && s2.nums === '1 1 2 2' && !s1.fresh && !s2.fresh && !s1.ren && !s2.ren, JSON.stringify({ s0, s1, s2 }));
    await page.focus('.card[data-sub] [data-act="edit-sub"]');
    await page.keyboard.press('Alt+ArrowRight');
    const s3 = await st();
    await page.click('.step[data-step]:last-child [data-act="add-sub"]');
    await page.fill('#sub-form [name="title"]', 'b1');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#dlg-sub', { state: 'hidden' });
    const s4 = await st();
    check('dự án trống mới: dời lần đầu thì số đứng yên như mọi dự án (Renumber hiện, cái thêm sau có chấm)', s3.ren && s3.nums === '1 2 1 2' && s4.fresh === 1,
      JSON.stringify({ s3, s4 }));
    await ctx.close();
  });

  /* Toast dời làm treo đầu vào: tên cắt ở 40 ký tự, cái vừa dời gọi là "it"; Esc trên nút Undo đóng toast. Dòng "Next waits on"
   * cắt tên, lý do nhưng title và tên đọc có đủ chữ. */
  await section('Toast dời dài, Next waits on chữ đủ', async () => {
    const longA = 'Chờ phê duyệt của hội đồng đạo đức nghiên cứu về việc dùng dữ liệu cá nhân của bệnh nhân';
    const longR = 'Hội đồng họp lại vào cuối tháng sau, cần nộp thêm bản mô tả quy trình ẩn danh hoá dữ liệu và cam kết bảo mật';
    const longB = 'Bảng sạch đã kiểm đủ khoá chính và mọi cột ngày tháng của nguồn ERP và CRM';
    const data = { version: 2, lastId: 'wt', workspaces: [{ id: 'wt', name: 'Toast', steps: [{ id: 'tt', title: 'Bước', subs: [
      { id: 't1', title: longB, status: 'done', outs: [{ id: 'ot', name: 'bảng sạch' }] },
      { id: 't2', title: longA, status: 'pending', reason: longR, ins: ['ot'] }, { id: 't3', title: 'Sau', status: 'todo' }] }], log: [] }] };
    for (const [w, hh] of [[390, 844], [1280, 800]]) {
      const { ctx, page } = await seeded(w, hh, data);
      await page.waitForSelector('#next-wait [data-goto="t2"]');
      const nw = await page.evaluate(() => {
        const b = document.querySelector('#next-wait [data-goto="t2"]');
        return { label: b.getAttribute('aria-label'), title: b.title, sr: [...document.querySelectorAll('#next-wait .sr')].map((e) => e.textContent).join('|') };
      });
      check(`Next waits on ${w}px: tên, lý do bị cắt vẫn đủ chữ ở tên đọc, title và bản cho trình đọc màn hình`, nw.label === longA && nw.title.endsWith(longA) && nw.sr === longR,
        JSON.stringify(nw));
      await page.focus('.card[data-sub="t2"] [data-act="edit-sub"]');
      await page.keyboard.press('Alt+ArrowLeft');
      await page.waitForSelector('#toast:not([hidden])');
      const t = await page.$eval('#toast', (e) => { const r = e.getBoundingClientRect(); return { h: Math.round(r.height), text: document.getElementById('toast-text').textContent }; });
      const quoted = t.text.match(/"[^"]*"/g) || [];
      check(`toast dời ${w}px: báo đầu vào treo, mọi tên cắt ở 40 ký tự, không lặp tên vừa dời, toast thấp`, /Input on hold: it now comes before/.test(t.text)
        && quoted.length === 2 && quoted.every((q) => q.length <= 42) && t.h <= 4 * 28, JSON.stringify(t));
      await page.focus('#toast-undo');
      await page.keyboard.press('Escape');
      check(`toast dời ${w}px: Esc trên nút Undo đóng toast, focus về thẻ vừa dời`, await page.$eval('#toast', (e) => e.hidden)
        && await page.evaluate(() => document.activeElement?.closest('.card')?.dataset.sub) === 't2');
      await ctx.close();
    }
  });

  /* ── Dữ liệu lưu bị hỏng ── */
  await section('Dữ liệu lưu bị hỏng', async () => { // thân giữ thụt lề cũ cho dễ gộp
  const bad = await browser.newContext();
  await bad.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('stepPlanner.v2', '{hỏng'); } });
  const badp = await bad.newPage();
  await badp.goto(BASE);
  await badp.waitForSelector('#start:not([hidden])');
  check('dữ liệu hỏng: báo và giữ bản cũ', /corrupt/.test(await badp.textContent('#banner'))
    && (await badp.evaluate(() => localStorage.getItem('stepPlanner.v2.corrupt'))) === '{hỏng');
  await bad.close();
  });

  await browser.close();
  check('không lỗi console', errors.length === 0, errors.slice(0, 3).join(' | '));
  if (fails) { console.log(`smoke: ${fails} LỖI`); process.exit(1); }
  console.log('smoke: OK');
})().catch((e) => { console.log('smoke: LỖI', e); process.exit(1); });
