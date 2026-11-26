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
  /* Trang ghi bộ nhớ ở lượt việc kế: chờ một khung hình và một lượt rồi mới đọc. */
  const afterSave = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))));
  const stored = async (page) => { await afterSave(page); return page.evaluate(() => JSON.parse(localStorage.getItem('stepPlanner.v2') || 'null')); };
  const cur = async (page) => { const s = await stored(page); return s.workspaces.find((w) => w.id === s.lastId); };
  const shape = (page, ws) => page.evaluate(async (w) => (await import(new URL('js/core.js', location.href).href)).shape(w), ws);
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
  const { ctx, page } = await open(1280, 900, { permissions: ['clipboard-read', 'clipboard-write'] });
  await page.waitForSelector('#start:not([hidden]) .tpl');
  const tplIds = await page.$$eval('#start .tpl', (bs) => bs.map((b) => b.dataset.tpl));
  check('màn đầu: đủ năm mẫu', tplIds.length === 5, tplIds.join(','));
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
  for (const id of tplIds.filter((x) => x !== 'crisp-dm')) {
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
  check('tạo từ mỗi mẫu: đúng bước và bước con', s0.workspaces.length === 5 && okTpl);
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
  check('hộp Dự án: tab Open, dòng đang mở đánh dấu, hành động gọn; tab New có Create và thẻ mẫu',
    wsd.open === 'true' && wsd.rows === 5 && wsd.count === '5' && wsd.now === 1 && wsd.create && wsd.acts === 'Rename,Duplicate,Delete' && wsd.dupName === 0
    && !wsn.create && wsn.list && wsn.checked === 1 && wsn.top === 0 && wsn.cards === 5, JSON.stringify({ wsd, wsn }));
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
  check('thẻ dài dừng ở max-height, cắt và có "Xem thêm"', Math.abs(ch.b - ch.max) < 1 && ch.cut && ch.more, JSON.stringify(ch));
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
  check('Pending → Blocked: giữ ghi chú, nhãn "Blocked by"', (await cur(page)).steps[0].subs[1].reason === 'Chủ dữ liệu duyệt quyền truy cập'
    && (await page.textContent(`${c12} .card-reason`)) === 'Blocked by Chủ dữ liệu duyệt quyền truy cập');
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
  await page.waitForFunction(() => !document.querySelector('.moved, .swapped'), null, { timeout: 6000 }).catch(() => {});
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
    mk.moved.join() === stepsBefore[1] && mk.swapped.join() === stepsBefore[0] && /^Moved step ".*" to the top$/.test(mk.toast), JSON.stringify(mk));
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
    && /^Moved ".*" to step ".*", after ".*"$/.test(mkd.toast), JSON.stringify(mkd));
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
  await page.waitForFunction((n) => JSON.parse(localStorage.getItem('stepPlanner.v2')).workspaces[0].steps.length === n, nSteps, { timeout: 3000 }).catch(() => {});
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
    && rs.log.length === nLogR + 1 && autoLog.decision === `Reopened: ${r0.title} (iteration 2)` && autoLog.why === 'EDA lộ cột thiếu'
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
  await page.waitForFunction(() => !document.getElementById('dlg-md').open, null, { timeout: 3000 }).catch(() => {});
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
  check('xuất Markdown: tải file .md', /\.md$/.test(dl.suggestedFilename()) && md.startsWith('# Data Science project (CRISP-DM)'));
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

  // Đổi tên, nhân bản, xoá dự án.
  await page.click('#ws-btn');
  await page.click('.ws-item:first-child [data-act="ws-rename"]');
  await page.fill('#ask-input', 'Tên mới');
  await page.click('#ask-ok');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('stepPlanner.v2')).workspaces[0].name === 'Tên mới', null, { timeout: 3000 }).catch(() => {});
  check('đổi tên dự án', (await stored(page)).workspaces[0].name === 'Tên mới');
  const nw = (await stored(page)).workspaces.length;
  await page.click('.ws-item:first-child [data-act="ws-dup"]');
  check('nhân bản dự án', (await stored(page)).workspaces.length === nw + 1);
  await page.click('.ws-item:nth-child(2) [data-act="ws-del"]');
  await page.click('#ask-ok');
  await page.waitForFunction((n) => JSON.parse(localStorage.getItem('stepPlanner.v2')).workspaces.length === n, nw, { timeout: 3000 }).catch(() => {});
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
  await page.waitForFunction((n) => { const d = JSON.parse(localStorage.getItem('stepPlanner.v2')); return d.workspaces.find((w) => w.id === d.lastId).steps[0].subs.length === n + 1; }, nSub0, { timeout: 3000 }).catch(() => {});
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
  check('thêm mà bộ lọc ẩn: báo, focus không về body', /hidden by the search filter/.test(await page.textContent('#toast-text'))
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

  /* ── Hai tab cùng dữ liệu ── */
  const tc = await browser.newContext({ viewport: { width: 1280, height: 900 } });
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
  await B.click('.card[data-sub] >> nth=0 >> [data-act="status"]');
  await A.waitForTimeout(200);
  check('hai tab: tab kia đổi dự án và sửa, tab này vẫn ở dự án của nó', (await A.textContent('#ws-name')) === w2.name
    && (await B.textContent('#ws-name')) === w1.name);
  const w2sub = w2.steps[0].subs[0];
  await A.click(subSel(w2sub.id, 'sub-del'));
  await B.click('.card[data-sub] >> nth=1 >> [data-act="status"]');
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
  await B.click('.card[data-sub] >> nth=2 >> [data-act="status"]');
  await A.waitForTimeout(200);
  await A.click('#toast-undo');
  await A.waitForTimeout(100);
  check('hai tab: hoàn tác xoá bước sau khi tab kia ghi', (await stored(A)).workspaces.find((w) => w.id === w2.id).steps[1].id === w2step.id
    && !/was deleted/.test(await A.textContent('#toast-text')));
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
      if (!tall || !wide) bad.push(`${el.dataset.act || el.id || el.className} ${Math.round(r.width)}x${Math.round(r.height)}`);
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
  check('mẫu đồ án: ghi chú bước gập, có link trang đồ án', (await m.page.$$('.step-notes')).length === 10
    && (await m.page.$$eval('.step-notes a', (a) => a.filter((x) => /sports-monitoring-build\.html#lich$/.test(x.href)).length)) === 10);
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

  /* ── Vẽ lại theo hàng: một thay đổi chỉ dựng lại hàng đổi; hàng khác giữ nguyên nút DOM (thẻ đã "Show more" vẫn mở),
   * "Next", chú giải, tiến độ vẫn đúng dù đổi sang bước khác; Hoàn tác, Compact, tìm không làm hỏng điều ấy ── */
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
  await pp.addStyleTag({ content: ':root { --card-max: 4000px; }' });
  await setSt(pp, 'b1', 'todo');
  const tall = await pp.$eval('.card[data-sub="b2"]', (c) => [c.classList.contains('cut'), !!c.querySelector('.card-notes[data-clip]'), c.querySelector('.card-notes').textContent.split('\n').length]);
  check('thẻ đủ chỗ: ghi chú dựng đủ, không cắt', !tall[0] && !tall[1] && tall[2] === 40, String(tall));
  await pc.close();

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
  check('bộ nhớ bị chặn: banner, vẫn dùng được', /blocks storage/.test(await bp.textContent('#banner')) && await bp.isVisible('#banner')
    && (await bp.$$('.step')).length === nSteps && !bErr.length, bErr.join(' | '));
  await blocked.close();

  /* ── Bố cục bước: bước đang mở lại có tài liệu, bước đã đóng vòng, bước chưa có bước con xong ── */
  const lay = { version: 2, lastId: 'wl', workspaces: [{ id: 'wl', name: 'Bố cục', steps: [
    { id: 'tl1', title: 'Đang mở lại', round: 2, revisit: { reason: 'Thiếu cột', date: '2026-11-20', round: 2 },
      docs: [{ id: 'dl1', kind: 'link', title: 'Từ điển dữ liệu', url: 'https://a.example' }],
      subs: [{ id: 'sl1', title: 'Một', status: 'done' }, { id: 'sl2', title: 'Hai', status: 'todo', redo: true }] },
    { id: 'tl2', title: 'Đã đóng vòng', round: 3, subs: [{ id: 'sl3', title: 'Ba', status: 'done' }, { id: 'sl4', title: 'Bốn', status: 'todo' }] },
    { id: 'tl3', title: 'Chưa xong gì', subs: [{ id: 'sl5', title: 'Năm', status: 'doing' }, { id: 'sl6', title: 'Sáu', status: 'todo', par: true }] }],
  log: [{ id: 'll1', date: '2026-11-10', decision: 'Reopened: Đã đóng vòng (iteration 2)', why: 'a', stepId: 'tl2' },
    { id: 'll2', date: '2026-11-18', decision: 'Reopened: Đã đóng vòng (iteration 3)', why: 'b', stepId: 'tl2' }] }] };
  for (const [w, hgt] of [[1440, 900], [1280, 800], [390, 844]]) {
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
      return { head: r('.step-head'), band: r('.revisit-band'), docs: r('.step-docs'), cards: r('.cards-scroll') };
    });
    check(`${w}px: bước đọc liền một khối (${w < 500 ? 'đầu bước, băng, tài liệu, thẻ' : 'băng, tài liệu trên cột tên và hàng thẻ'})`, w < 500
      ? ord.head.bottom <= ord.band.top + 1 && ord.band.bottom <= ord.docs.top + 1 && ord.docs.bottom <= ord.cards.top + 1
      : ord.band.bottom <= ord.docs.top + 1 && ord.docs.bottom <= Math.min(ord.head.top, ord.cards.top) + 1,
    JSON.stringify(Object.fromEntries(Object.entries(ord).map(([k, v]) => [k, [Math.round(v.top), Math.round(v.bottom)]]))));
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

  /* ── Hàng đầu thẻ chật (số, "Tiếp theo", nhãn kẹp, chip dài): không chữ nào bị bẻ dòng, không tràn thẻ ── */
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

  /* ── Bộ nhớ khoá cũ (v1, có người làm): đọc, chuẩn hoá bỏ người, ghi sang khoá mới, giữ khoá cũ ── */
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

  /* ── System design (PLAN-016): hồ sơ đổi gợi ý, chọn lưu ngay, "không cần" bỏ khỏi sơ đồ, sơ đồ không tràn, việc sang
   * bảng (Hoàn tác gỡ), Markdown xuất có mục và nhập lại giữ nguyên, 390px không tràn ngang ── */
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
    await sp.waitForSelector('#dlg-sd[open] .sd-prof');
    const before = await sp.$$eval('#sd-nav .sd-nav-btn', (b) => b.length);
    check(`${tag}: hộp có hồ sơ và mọi khâu`, before === cat.stages.length + 1);
    await sp.click('input[data-q="size"][value="large"]', { force: true });
    await sp.click('#sd-nav [data-at="4"]');
    const proc = cat.stages[3];
    const top = await sp.$eval('#sd-pane .sd-opt:has(.sd-tag.top)', (e) => e.dataset.opt).catch(() => '');
    const want = proc.options.find((o) => !o.fit || !o.fit.size || o.fit.size.includes('large'));
    check(`${tag}: dữ liệu lớn thì gợi ý ở ${proc.id} hợp cỡ lớn`, !!top && proc.options.find((o) => o.id === top).fit?.size?.includes('large') !== false && !!want, top);
    await sp.click(`#sd-pane [data-opt="${top}"] input`);
    let ws = await cur(sp);
    check(`${tag}: chọn thì lưu ngay`, ws.design?.stages[proc.id]?.pick[0] === top && ws.design.profile.size === 'large');
    check(`${tag}: đã chọn thì phương án khác gập lại`, await sp.$eval('#sd-pane .sd-more', (d) => !d.open && d.querySelectorAll('.sd-opt').length > 0));
    check(`${tag}: focus ở lại ô vừa chọn`, await sp.evaluate((id) => document.activeElement?.closest('.sd-opt')?.dataset.opt === id, top));
    await sp.click('#sd-next');
    const ing = cat.stages[4].id;
    await sp.click(`#sd-pane [data-skip="${ing}"]`);
    await sp.fill('#sd-pane [data-note]', 'Own: lý do\n- không phải việc');
    ws = await cur(sp);
    check(`${tag}: "Not needed" và ghi chú lưu`, ws.design.stages[ing].skip && /không phải việc/.test(ws.design.stages[ing].note));
    if (w === 390) check(`${tag}: hộp không tràn ngang`, await sp.$eval('#dlg-sd', (d) => d.scrollWidth <= d.clientWidth + 1));
    await sp.keyboard.press('Escape');
    check(`${tag}: sơ đồ bỏ khâu không cần, khâu đã chọn có tên`, !(await sp.$(`#sd-fig [data-stage="${ing}"]`))
      && /\S/.test(await sp.$eval(`#sd-fig [data-stage="${proc.id}"]`, (g) => g.textContent)) && !(await sp.$(`#sd-fig [data-stage="${proc.id}"].is-open`)));
    check(`${tag}: sơ đồ nằm trong khung, trang không tràn ngang`, await sp.$eval('#sd-fig', (f) => f.scrollWidth <= f.clientWidth + 1) && (await hOverflow(sp)) <= 0);
    const steps0 = (await cur(sp)).steps.length;
    await sp.click('#sd-plan');
    ws = await cur(sp);
    const build = ws.steps[1];
    check(`${tag}: Add tasks to plan thêm bước System build ở vị trí 2, có link`, ws.steps.length === steps0 + 1 && build.title === 'System build'
      && build.subs.length === 1 && build.subs[0].docs.length > 0 && build.subs[0].title.startsWith(proc.title));
    await sp.click('#sd-plan');
    check(`${tag}: bấm lại không thêm trùng`, (await cur(sp)).steps[1].subs.length === 1 && /already/.test(await sp.textContent('#toast-text')));
    if (w === 1280) {
      const [dl] = await Promise.all([sp.waitForEvent('download'), sp.click('#sd-svg')]);
      const body = fs.readFileSync(await dl.path(), 'utf8');
      check(`${tag}: tải SVG đứng một mình (màu chép vào thuộc tính)`, /^<\?xml/.test(body) && /<svg[^>]+xmlns=/.test(body) && !/class=/.test(body) && /fill="rgb/.test(body));
      const md = await sp.evaluate(async () => {
        const C = await import(new URL('js/core.js', location.href).href);
        const s = JSON.parse(localStorage.getItem('stepPlanner.v2'));
        return C.toMarkdown(s.workspaces.find((x) => x.id === s.lastId));
      });
      await sp.click('#export-btn');
      const shown = await sp.$eval('#export-text', (e) => e.value);
      check(`${tag}: Markdown xuất có mục System design kèm tên đọc được`, /## System design/.test(md) && md.includes(`[${proc.id}: ${top}]`)
        && shown.includes(`- ${proc.title}: `) && shown.includes(`[${proc.id}: ${top}]`));
      await sp.keyboard.press('Escape');
      const rt = await sp.evaluate(async () => {
        const C = await import(new URL('js/core.js', location.href).href);
        const s = JSON.parse(localStorage.getItem('stepPlanner.v2'));
        const w0 = s.workspaces.find((x) => x.id === s.lastId);
        return JSON.stringify(C.shape(C.fromMarkdown(C.toMarkdown(w0)).workspace)) === JSON.stringify(C.shape(C.normWorkspace(w0)));
      });
      check(`${tag}: Markdown đi rồi về giữ nguyên thiết kế`, rt);
    }
    await sp.click('#toast-undo').catch(() => {});
    await sx.close();
  }

  /* ── Dấu Redo qua hộp sửa: chỉ sửa Notes thì giữ dấu và số "k of n"; chuyển sang bước khác thì bỏ dấu, Hoàn tác trả lại ── */
  {
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
  }

  /* ── Hai tab sửa cùng một mục: Lưu chỉ ghi trường đã đổi; cùng trường thì hỏi; mục đã bị xoá thì hỏi tạo lại ── */
  {
    const seed = { version: 2, lastId: 'wm', workspaces: [{ id: 'wm', name: 'Gộp', steps: [
      { id: 'tm1', title: 'Một', goal: 'g', subs: [{ id: 'sm1', title: 'Việc', status: 'todo', doneWhen: 'gốc' }, { id: 'sm2', title: 'Việc hai', status: 'todo' }] }],
    log: [{ id: 'lm1', date: '2026-11-01', decision: 'Chọn A', why: 'vì' }] }] };
    const mc = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await mc.addInitScript((d) => { if (!localStorage.getItem('stepPlanner.v2')) localStorage.setItem('stepPlanner.v2', d); }, JSON.stringify(seed));
    const [A, B] = [await mc.newPage(), await mc.newPage()];
    for (const [n, pg] of [['A', A], ['B', B]]) { pg.on('pageerror', (e) => errors.push(n + ' ' + e)); await pg.goto(BASE); await pg.waitForSelector('.card[data-sub="sm1"]'); }
    const sm = async (id) => (await cur(A)).steps.flatMap((x) => x.subs).find((x) => x.id === id);
    // 1. A sửa Notes (chưa lưu), B đổi Done when và lưu, A lưu: giữ cả hai, không hỏi.
    await A.click(subSel('sm1', 'edit-sub'));
    await A.fill('#sub-form [name="notes"]', 'ghi chú của A');
    await B.click(subSel('sm1', 'edit-sub'));
    await B.fill('#sub-form [name="doneWhen"]', 'của B');
    await B.click('#sub-form button[type="submit"]');
    await A.waitForTimeout(200);
    await A.click('#sub-form button[type="submit"]');
    let x = await sm('sm1');
    check('hai tab: trường khác nhau thì giữ cả hai (Done when của tab kia không bị trả về)', x.doneWhen === 'của B' && x.notes === 'ghi chú của A'
      && !(await A.isVisible('#dlg-ask')) && !(await A.isVisible('#dlg-sub')), JSON.stringify(x));
    // 2. Cùng trường: A thấy hộp hỏi liệt kê trường, Close thì hộp sửa vẫn mở; Keep the other tab's thì giữ của B, trường khác của A vẫn ghi.
    await B.waitForTimeout(100);
    await A.click(subSel('sm1', 'edit-sub'));
    await A.fill('#sub-form [name="doneWhen"]', 'của A');
    await A.fill('#sub-form [name="title"]', 'Việc (A)');
    await B.click(subSel('sm1', 'edit-sub'));
    await B.fill('#sub-form [name="doneWhen"]', 'của B lần hai');
    await B.click('#sub-form button[type="submit"]');
    await A.waitForTimeout(200);
    await A.click('#sub-form button[type="submit"]');
    await A.waitForSelector('#dlg-ask[open]');
    const askTxt = await A.textContent('#ask-list');
    await A.click('#dlg-ask [data-close]');
    const stillOpen = await A.isVisible('#dlg-sub') && (await A.inputValue('#sub-form [name="doneWhen"]')) === 'của A';
    await A.click('#sub-form button[type="submit"]');
    await A.click('#ask-alt');
    x = await sm('sm1');
    check('hai tab: cùng trường thì hỏi (Yours / Other tab), Close giữ hộp sửa, chọn tab kia thì giữ của nó, trường khác của mình vẫn ghi',
      /Done when/.test(askTxt) && /Yours: của A/.test(askTxt) && /Other tab: của B lần hai/.test(askTxt) && !/Title/.test(askTxt) && stillOpen
      && x.doneWhen === 'của B lần hai' && x.title === 'Việc (A)', `${askTxt} ${JSON.stringify(x)}`);
    // Keep mine.
    await A.click(subSel('sm1', 'edit-sub'));
    await A.fill('#sub-form [name="doneWhen"]', 'A thắng');
    await B.click(subSel('sm1', 'edit-sub'));
    await B.fill('#sub-form [name="doneWhen"]', 'B thua');
    await B.click('#sub-form button[type="submit"]');
    await A.waitForTimeout(200);
    await A.click('#sub-form button[type="submit"]');
    await A.click('#ask-ok');
    await B.waitForTimeout(200);
    check('hai tab: "Keep mine" ghi của mình, tab kia đọc lại thấy', (await sm('sm1')).doneWhen === 'A thắng'
      && /A thắng/.test(await B.textContent('.card[data-sub="sm1"]')));
    // 3. Tab kia xoá bước con trong lúc sửa: hỏi; Re-create trả nó về với chữ đã sửa.
    await A.click(subSel('sm2', 'edit-sub'));
    await A.fill('#sub-form [name="notes"]', 'đang viết');
    await B.click(subSel('sm2', 'sub-del'));
    await A.waitForTimeout(200);
    await A.click('#sub-form button[type="submit"]');
    await A.waitForSelector('#dlg-ask[open]');
    const delTitle = await A.textContent('#dlg-ask-title');
    await A.click('#ask-ok');
    x = await sm('sm2');
    check('hai tab: bước con bị xoá ở tab kia thì hỏi, Re-create trả về với chữ đã sửa', /Deleted in another tab/.test(delTitle) && x?.notes === 'đang viết'
      && !!(await A.$('.card[data-sub="sm2"]')), delTitle);
    // 4. Hộp bước: A đổi Goal, B đổi Notes của bước: giữ cả hai.
    await B.waitForTimeout(100);
    await A.click('.step[data-step="tm1"] [data-act="edit-step"]');
    await A.fill('#step-form [name="goal"]', 'mục tiêu A');
    await B.click('.step[data-step="tm1"] [data-act="edit-step"]');
    await B.fill('#step-form [name="notes"]', 'ghi chú B');
    await B.click('#step-form button[type="submit"]');
    await A.waitForTimeout(200);
    await A.click('#step-form button[type="submit"]');
    const st = (await cur(A)).steps[0];
    check('hai tab: hộp bước gộp trường khác nhau', st.goal === 'mục tiêu A' && st.notes === 'ghi chú B' && !(await A.isVisible('#dlg-ask')), JSON.stringify(st).slice(0, 160));
    // 5. Hộp quyết định: A sửa Why, B sửa Decision: giữ cả hai.
    await B.waitForTimeout(100);
    await A.click('.log-item[data-log="lm1"] [data-act="edit-log"]');
    await A.fill('#log-edit-form [name="why"]', 'lý do A');
    await B.click('.log-item[data-log="lm1"] [data-act="edit-log"]');
    await B.fill('#log-edit-form [name="decision"]', 'Chọn B');
    await B.click('#log-edit-form button[type="submit"]');
    await A.waitForTimeout(200);
    await A.click('#log-edit-form button[type="submit"]');
    const lg = (await cur(A)).log[0];
    check('hai tab: hộp quyết định gộp trường khác nhau', lg.decision === 'Chọn B' && lg.why === 'lý do A', JSON.stringify(lg));
    await mc.close();
  }

  /* ── Dữ liệu lưu bị hỏng ── */
  const bad = await browser.newContext();
  await bad.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('stepPlanner.v2', '{hỏng'); } });
  const badp = await bad.newPage();
  await badp.goto(BASE);
  await badp.waitForSelector('#start:not([hidden])');
  check('dữ liệu hỏng: báo và giữ bản cũ', /corrupt/.test(await badp.textContent('#banner'))
    && (await badp.evaluate(() => localStorage.getItem('stepPlanner.v2.corrupt'))) === '{hỏng');
  await bad.close();

  await browser.close();
  check('không lỗi console', errors.length === 0, errors.slice(0, 3).join(' | '));
  if (fails) { console.log(`smoke: ${fails} LỖI`); process.exit(1); }
  console.log('smoke: OK');
})().catch((e) => { console.log('smoke: LỖI', e); process.exit(1); });
