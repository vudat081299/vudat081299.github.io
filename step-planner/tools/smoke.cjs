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
  const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('stepPlanner.v2') || 'null'));
  const cur = async (page) => { const s = await stored(page); return s.workspaces.find((w) => w.id === s.lastId); };
  const shape = (page, ws) => page.evaluate(async (w) => (await import(new URL('js/core.js', location.href).href)).shape(w), ws);
  const subSel = (id, act) => `.card[data-sub="${id}"] [data-act="${act}"]`;
  /* Đổi trạng thái qua danh sách: Shift + bấm chip luôn mở danh sách. */
  const setSt = async (page, subId, st) => {
    await page.click(`.card[data-sub="${subId}"] [data-act="status"]`, { modifiers: ['Shift'] });
    await page.click(`.dd-pop [role="option"][data-value="${st}"]`);
  };
  const hOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  /* ── Máy rộng ── */
  const { ctx, page } = await open(1280, 900, { permissions: ['clipboard-read', 'clipboard-write'] });
  await page.waitForSelector('#start:not([hidden]) .tpl');
  const tplIds = await page.$$eval('#start .tpl', (bs) => bs.map((b) => b.dataset.tpl));
  check('màn đầu: đủ năm mẫu', tplIds.length === 5, tplIds.join(','));
  // Nút đóng hộp không lưu ghi "Đóng": "Huỷ" là tên một trạng thái.
  const closeBtns = await page.$$eval('dialog button', (bs) => bs.filter((b) => b.textContent.trim() && (b.hasAttribute('data-close') || b.textContent.trim() === 'Huỷ'))
    .map((b) => b.textContent.trim()));
  check('hộp thoại: nút đóng ghi "Đóng", không ghi "Huỷ"', closeBtns.length >= 8 && closeBtns.every((t) => t === 'Đóng'), [...new Set(closeBtns)].join(','));

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
  check('dự án trống: báo chưa có bước', /No steps yet/.test(await page.textContent('#board')));
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
  await page.click('.step:nth-child(1) .card[data-sub]:nth-child(2) .more');
  const keepBefore = await page.evaluate(() => { const sc = document.querySelector('.step:nth-child(1) .cards-scroll'); sc.scrollLeft = sc.scrollWidth; return sc.scrollLeft; });
  await page.click('.step:nth-child(1) .card[data-sub]:nth-child(4) [data-act="status"]');
  const keep = await page.evaluate(() => {
    const row = document.querySelector('.step:nth-child(1)');
    const c2 = row.querySelector('.card[data-sub]:nth-child(2)');
    return { notes: row.querySelector('.step-notes').open, open: c2.classList.contains('open'), more: c2.querySelector('.more')?.textContent,
      expanded: c2.querySelector('.more')?.getAttribute('aria-expanded'), left: row.querySelector('.cards-scroll').scrollLeft };
  });
  check('vẽ lại giữ ghi chú bước đang mở, thẻ đã "Xem thêm", chỗ cuộn ngang của hàng', keep.notes && keep.open && keep.more === 'Show less'
    && keep.expanded === 'true' && keepBefore > 0 && Math.abs(keep.left - keepBefore) < 2, `${keepBefore} ${JSON.stringify(keep)}`);
  await setSt(page, await page.getAttribute('.step:nth-child(1) .card[data-sub]:nth-child(4)', 'data-sub'), 'todo');
  await page.click('.step:nth-child(1) .card[data-sub]:nth-child(2) .more');
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
  const scr = await page.evaluate(() => {
    const sc = document.querySelector('.step .cards-scroll'), st = getComputedStyle(document.querySelector('.step'));
    sc.scrollBy(400, 0);
    const moved = sc.scrollLeft > 0;
    sc.scrollLeft = 0;
    return { bar: sc.offsetHeight - sc.clientHeight, more: sc.scrollWidth > sc.clientWidth, moved, cue: sc.classList.contains('more-right'),
      pad: [parseFloat(st.paddingTop), parseFloat(st.paddingBottom)] };
  });
  check('hàng thẻ: không hiện thanh cuộn, vẫn cuộn được, mép báo còn thẻ; bước có lề dưới rộng hơn lề trên', scr.bar === 0 && scr.more && scr.moved && scr.cue
    && scr.pad[1] > scr.pad[0], JSON.stringify(scr));
  check('đánh số 2.1, 2.2', geo.nums === '2.1,2.2', geo.nums);
  check('việc tiếp theo là 1.1', geo.next === '1.1');

  // Chip trạng thái: bấm hai lần → xong; việc tiếp theo dời sang 1.2; tiến độ. Bấm khi Done: mở danh sách.
  const chip = '.step:nth-child(1) .card[data-sub]:nth-child(1) [data-act="status"]';
  await page.click(chip);
  check('chip: New → In progress', (await page.textContent(chip)).trim() === 'In progress');
  const chipLook = (sel) => page.$eval(sel, (el) => { const c = getComputedStyle(el); return [c.color, c.backgroundColor, c.borderColor].join('|'); });
  const doingLook = await chipLook(chip), todoLook = await chipLook('.step:nth-child(1) .card[data-sub]:nth-child(2) [data-act="status"]');
  check('chip Đang làm có màu riêng (chữ, nền, viền khác Chưa làm)', doingLook.split('|').every((v, k) => v !== todoLook.split('|')[k]), `${doingLook} / ${todoLook}`);
  await page.click(chip);
  check(`chip: → xong, tiến độ 1/${n1}`, (await page.textContent(chip)).trim() === 'Done'
    && (await page.textContent('.step:nth-child(1) .prog')).includes(`1/${n1}`));
  check('việc tiếp theo dời sang 1.2', (await page.textContent('.step:nth-child(1) .card.next .num')) === '1.2');
  check('chip giữ focus sau khi bấm', await page.evaluate(() => document.activeElement?.dataset.act === 'status'));
  const layout0 = await page.evaluate(() => document.querySelector('.step').getBoundingClientRect().height);
  await page.click(chip);
  const menu = await page.evaluate(() => {
    const pop = document.querySelector('.dd-pop');
    const chipEl = document.querySelector('.step:nth-child(1) .card[data-sub]:nth-child(1) [data-act="status"]');
    return pop && { opts: [...pop.querySelectorAll('[role="option"] .dd-label')].map((o) => o.textContent),
      sel: pop.querySelector('[aria-selected="true"]')?.dataset.value, hints: pop.querySelectorAll('.dd-hint').length, dots: pop.querySelectorAll('.st-dot').length,
      focus: document.activeElement === pop, expanded: chipEl.getAttribute('aria-expanded'),
      below: pop.getBoundingClientRect().top >= chipEl.getBoundingClientRect().bottom - 1 || pop.getBoundingClientRect().bottom <= chipEl.getBoundingClientRect().top + 1,
      rowH: document.querySelector('.step').getBoundingClientRect().height };
  });
  check('chip Done: bấm mở danh sách sáu trạng thái (chấm, dòng gợi ý, đánh dấu hiện tại), không đẩy bố cục', !!menu && menu.opts.length === 6
    && menu.sel === 'done' && menu.hints === 6 && menu.dots === 6 && menu.focus && menu.expanded === 'true' && menu.below && menu.rowH === layout0, JSON.stringify(menu));
  await page.keyboard.press('Escape');
  check('danh sách trạng thái: Esc đóng, focus về chip, không đổi gì', !(await page.$('.dd-pop')) && (await page.textContent(chip)).trim() === 'Done'
    && await page.evaluate(() => document.activeElement?.dataset.act === 'status'));
  await page.keyboard.press('Alt+ArrowDown');
  check('Alt + ↓ trên chip: mở danh sách', !!(await page.$('.dd-pop')));
  await page.keyboard.press('Escape');

  // Huỷ: chỉ chọn trong hộp sửa, có ô "Vì sao huỷ"; thẻ hiện lý do, tên gạch; không tính vào tiến độ; "Tiếp theo" bỏ qua;
  // chú giải có Huỷ; bấm chip Huỷ → Chưa làm.
  const c12 = '.step:nth-child(1) .card[data-sub]:nth-child(2)';
  await page.click(`${c12} [data-act="edit-sub"]`);
  check('hộp sửa: có Huỷ trong trạng thái, ô "Vì sao huỷ" ẩn khi chưa chọn', (await page.$$eval('#sub-form [name="status"] option', (o) => o.map((x) => x.textContent))).includes('Cancelled')
    && !(await page.isVisible('#sub-cancel')));
  // Danh sách chọn tự dựng thay <select>: mở bằng bấm, chọn bằng bàn phím (gõ chữ đầu, Enter), phát change.
  await page.click('#sub-form .dd-btn');
  const ddOpen = await page.evaluate(() => ({ pop: !!document.querySelector('#dlg-sub .dd-pop'), native: getComputedStyle(document.querySelector('#sub-form [name="status"]')).opacity }));
  await page.keyboard.press('c');
  await page.keyboard.press('Enter');
  check('danh sách chọn tự dựng: mở trong hộp, gõ chữ + Enter chọn, <select> đổi theo và phát change (hiện ô lý do)', ddOpen.pop && ddOpen.native === '0'
    && (await page.inputValue('#sub-form [name="status"]')) === 'cancel' && await page.isVisible('#sub-cancel')
    && /Cancelled/.test(await page.textContent('#sub-form .dd-btn')) && await page.evaluate(() => document.activeElement?.name === 'cancelReason'), JSON.stringify(ddOpen));
  check('chọn Cancelled: hiện ô lý do', await page.isVisible('#sub-cancel'));
  await page.fill('#sub-form [name="cancelReason"]', 'Đã có số liệu từ nguồn khác\nkhông cần làm lại');
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
    return { chip: c.querySelector('.chip').textContent, reason: c.querySelector('.card-cancel')?.textContent, line: getComputedStyle(c.querySelector('.card-title .link')).textDecorationLine,
      prog: document.querySelector('.step:nth-child(1) .prog').textContent, next: document.querySelector('.card.next .num')?.textContent,
      legend: [...document.querySelectorAll('#legend li')].map((li) => li.textContent).join(',') };
  }, c12);
  check('Huỷ: chip, lý do trên thẻ, tên gạch ngang', cx.chip === 'Cancelled' && /^Cancelled because Đã có số liệu từ nguồn khác\nkhông cần làm lại$/.test(cx.reason) && cx.line === 'line-through', JSON.stringify(cx));
  check(`Huỷ: tiến độ 1/${n1 - 1}, "Tiếp theo" sang 1.3, chú giải có Huỷ 1`, cx.prog.startsWith(`1/${n1 - 1}`) && cx.next === '1.3' && cx.legend.includes('Cancelled1'), JSON.stringify(cx));
  check('Huỷ: lưu lý do', (await cur(page)).steps[0].subs[1].cancelReason === 'Đã có số liệu từ nguồn khác\nkhông cần làm lại');
  await page.click(`${c12} [data-act="status"]`);
  check('bấm chip Cancelled: mở danh sách', !!(await page.$('.dd-pop')));
  await page.click('.dd-pop [role="option"][data-value="todo"]');
  check('chọn New từ danh sách: lý do huỷ bỏ', (await page.textContent(`${c12} .chip`)).trim() === 'New' && (await cur(page)).steps[0].subs[1].cancelReason === '');
  check('về Chưa làm: hạn đã qua báo trễ', !!(await page.$(`${c12} .due.overdue`)));
  await page.click(`${c12} [data-act="edit-sub"]`);
  await page.fill('#sub-form [name="due"]', '');
  await page.click('#sub-form button[type="submit"]');
  // Chọn Cancelled từ danh sách của chip: mở hộp sửa ở ô lý do; Lưu mới huỷ, Esc thì không đổi gì.
  const c12id = await page.getAttribute(c12, 'data-sub');
  await setSt(page, c12id, 'cancel');
  check('danh sách chip → Cancelled: hộp sửa mở, trạng thái đặt sẵn, focus ở ô lý do, chưa huỷ', await page.isVisible('#dlg-sub')
    && (await page.inputValue('#sub-form [name="status"]')) === 'cancel' && await page.evaluate(() => document.activeElement?.name === 'cancelReason')
    && (await cur(page)).steps[0].subs[1].status === 'todo');
  await page.keyboard.press('Escape');
  check('Esc: không huỷ', !(await page.isVisible('#dlg-sub')) && (await cur(page)).steps[0].subs[1].status === 'todo');

  // Thêm bước con có đủ trường.
  await page.click('.step:nth-child(1) [data-act="add-sub"]');
  await page.fill('#sub-form [name="title"]', 'Thử <img src=x onerror=alert(1)> · chấm');
  await page.selectOption('#sub-form [name="status"]', 'blocked');
  await page.fill('#sub-form [name="due"]', '2026-12-01');
  await page.fill('#sub-form [name="doneWhen"]', 'Có kết quả');
  await page.fill('#sub-form [name="notes"]', 'dòng 1\n\ndòng 3');
  await page.click('#sub-form button[type="submit"]');
  let ws = await cur(page);
  const added = ws.steps[0].subs[n1];
  check('thêm bước con: lưu đủ trường', added && added.status === 'blocked' && added.due === '2026-12-01' && !('owner' in added)
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
  check('nhân bản bước con', ws.steps[1].subs.length === n2 + 2 && /\(copy\)/.test(ws.steps[1].subs[n2 + 1].title));
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
    mk.moved.join() === before[1] && mk.swapped.join() === before[0] && /^Moved 2\.2 → 2\.1 · /.test(mk.toast), JSON.stringify(mk));
  await page.focus(subSel(before[1], 'edit-sub'));
  await page.keyboard.press('Alt+ArrowRight');
  await page.keyboard.press('Alt+ArrowRight');
  mk = await marks();
  check('Alt + →: tô thẻ vừa dời, toast nói chỗ cũ → chỗ mới, focus giữ trên thẻ',
    (await order())[2] === before[1] && mk.moved.join() === before[1] && mk.swapped.join() === before[2] && /^Moved 2\.2 → 2\.3 · /.test(mk.toast)
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
    mk.moved.join() === stepsBefore[1] && mk.swapped.join() === stepsBefore[0] && /^Moved step 2 → 1 · /.test(mk.toast), JSON.stringify(mk));
  await page.click(`.step[data-step="${stepsBefore[1]}"] [data-act="step-down"]`);

  // Kéo thả: bước con cuối của hàng 1 lên đầu hàng 1; bước 3 lên trên bước 1. Khung cao để nguồn và đích cùng
  // trong tầm nhìn (kéo HTML5 của Playwright không cuộn trang giữa chừng); hàng của mẫu dài thì 900px không đủ.
  await page.setViewportSize({ width: 1280, height: 2400 });
  await page.evaluate(() => document.querySelectorAll('.cards-scroll').forEach((sc) => { sc.scrollLeft = 0; })); // vẽ lại giữ chỗ cuộn
  const r1 = (await cur(page)).steps[0].subs.map((x) => x.id);
  await page.dragAndDrop(`.card[data-sub="${r1[2]}"]`, `.card[data-sub="${r1[0]}"]`, { targetPosition: { x: 5, y: 20 } });
  const r1b = (await cur(page)).steps[0].subs.map((x) => x.id);
  check('kéo thả bước con trong hàng', r1b[0] === r1[2] && r1b.length === n1, r1b.indexOf(r1[2]) + '');
  const st = (await cur(page)).steps.map((s) => s.id);
  await page.dragAndDrop(`.step[data-step="${st[2]}"] .step-head`, `.step[data-step="${st[0]}"] .step-head`, { targetPosition: { x: 10, y: 5 } });
  const st2 = (await cur(page)).steps.map((s) => s.id);
  check('kéo thả bước', st2[0] === st[2] && st2[1] === st[0], st2.indexOf(st[2]) + '');
  const r2 = (await cur(page)).steps[2].subs.map((x) => x.id);
  await page.evaluate((id) => { const sc = document.querySelector(`.step[data-step="${id}"] .cards-scroll`); sc.scrollLeft = sc.scrollWidth; }, st2[0]);
  await page.dragAndDrop(`.card[data-sub="${r2[0]}"]`, `.step[data-step="${st2[0]}"] .card[data-sub]:last-child`, { targetPosition: { x: 220, y: 20 } });
  const mkd = await marks();
  check('kéo thả bước con sang bước khác', (await cur(page)).steps[0].subs.at(-1).id === r2[0]);
  check('kéo thả: thẻ vừa thả tô nổi, toast "Đã dời 3.1 → 1.N"', mkd.moved.join() === r2[0]
    && new RegExp(`^Moved 3\\.1 → 1\\.${(await cur(page)).steps[0].subs.length} · `).test(mkd.toast), JSON.stringify(mkd));
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

  // Cần làm lại bước này (step.revisit): nút có chữ, hộp có câu giải thích, danh sách bước con đưa về Chưa làm,
  // băng "Đang làm lại · Vòng N · ngày · lý do", dòng nhật ký tự ghi, Hoàn tác cả thao tác, bỏ đánh dấu, vòng tăng tiếp.
  const revBtn = `.step[data-step="${s2id}"] .acts [data-act="revisit"]`;
  check('cần làm lại: nút có chữ', (await page.textContent(revBtn)).trim() === 'Reopen');
  const r0 = (await cur(page)).steps[1];
  const doneId = r0.subs[0].id;
  for (let k = 0; k < 3 && (await cur(page)).steps[1].subs[0].status !== 'done'; k++) await page.click(subSel(doneId, 'status'));
  const statuses0 = (await cur(page)).steps[1].subs.map((x) => x.status).join();
  const nLogR = (await cur(page)).log.length;
  await page.click(revBtn);
  check('cần làm lại: hộp có giải thích và ví dụ', /Ví dụ/.test(await page.textContent('#dlg-revisit'))
    && !!(await page.getAttribute('#revisit-form [name="reason"]', 'placeholder')));
  const rl = await page.evaluate(() => ({
    n: document.querySelectorAll('#revisit-list input[name="reset"]').length,
    checked: document.querySelectorAll('#revisit-list input:checked').length, round: document.getElementById('revisit-round').textContent,
  }));
  check('cần làm lại: danh sách mọi bước con, mặc định không chọn, báo vòng 2', rl.n === r0.subs.length && rl.checked === 0
    && /iteration 2/.test(rl.round), JSON.stringify(rl));
  await page.click('#revisit-all-done');
  const picked = await page.$$eval('#revisit-list input:checked', (c) => c.map((x) => x.value));
  check('"Chọn tất cả đã xong": chọn đúng các bước con đã xong', picked.join() === (await cur(page)).steps[1].subs.filter((x) => x.status === 'done').map((x) => x.id).join()
    && picked.includes(doneId), picked.join());
  await page.fill('#revisit-form [name="reason"]', 'EDA lộ cột thiếu');
  await page.click('#revisit-form button[type="submit"]');
  let rs = await cur(page);
  const autoLog = rs.log.at(-1);
  check('cần làm lại: bước con đã chọn về Chưa làm, vòng 2, nhật ký tự ghi',
    rs.steps[1].subs.find((x) => x.id === doneId).status === 'todo' && rs.steps[1].revisit.round === 2 && rs.steps[1].round === 2
    && rs.log.length === nLogR + 1 && autoLog.decision === `Reopened: ${r0.title} (iteration 2)` && autoLog.why === 'EDA lộ cột thiếu'
    && /Reopened: /.test(await page.textContent('#log-list')), JSON.stringify(autoLog));
  check('cần làm lại: toast có Hoàn tác, focus không bị lấy', await page.isVisible('#toast-undo')
    && await page.evaluate(() => document.activeElement?.id !== 'toast-undo'));
  await page.keyboard.press('Control+z');
  rs = await cur(page);
  check('hoàn tác cần làm lại: trạng thái thẻ, nhật ký, đánh dấu, vòng đều về như cũ', rs.steps[1].revisit === null && rs.steps[1].round === 1
    && rs.steps[1].subs.map((x) => x.status).join() === statuses0 && rs.log.length === nLogR && !/Reopened: /.test(await page.textContent('#log-list')));
  await page.click(revBtn);
  await page.fill('#revisit-form [name="reason"]', 'EDA lộ cột thiếu');
  await page.click('#revisit-form button[type="submit"]');
  const band = `.step[data-step="${s2id}"] .revisit-band`;
  check('cần làm lại: băng "Đang làm lại · Vòng 2 · ngày · lý do", nút bỏ đánh dấu',
    /^Reopened · Iteration 2 · \d{1,2} \w{3} \d{4} · EDA lộ cột thiếu$/.test((await page.textContent(`${band} .badge`)).trim())
    && /Close iteration/.test(await page.textContent(band))
    && (await cur(page)).steps[1].revisit.reason === 'EDA lộ cột thiếu');
  await page.click(`${band} [data-act="revisit-clear"]`);
  check('cần làm lại: "Xong, bỏ đánh dấu" xoá đánh dấu và băng', (await cur(page)).steps[1].revisit === null && !(await page.$(band)));
  await page.click(revBtn);
  check('đánh dấu lại sau khi bỏ: báo vòng 3', /iteration 3/.test(await page.textContent('#revisit-round')));
  await page.fill('#revisit-form [name="reason"]', 'EDA lộ cột thiếu');
  await page.click('#revisit-form button[type="submit"]');
  check('đánh dấu lại: băng "Vòng 3", nhật ký "(vòng 3)"', /^Reopened · Iteration 3 · /.test((await page.textContent(`${band} .badge`)).trim())
    && (await cur(page)).log.at(-1).decision.endsWith('(iteration 3)'));
  await page.click(`${band} .badge`);
  check('sửa lý do khi đang làm lại: không có danh sách bước con', !(await page.isVisible('#revisit-subs')));
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
  }));
  let ms = await mdState();
  check('tài liệu văn bản mới: hộp lớn mở ở chế độ Sửa', ms.open && ms.mode === 'edit' && ms.sel === 'edit' && ms.src && !ms.view && ms.w > 1000, JSON.stringify(ms));
  await page.fill('#md-form [name="body"]', '# Cột thiếu\n\n**age** thiếu <img src=x onerror=alert(1)>\n\n- a\n  - b\n\n[xấu](javascript:alert(1)) [tốt](https://ok.example)\n\n````\n```\nlồng\n```\n````');
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
  check('tài liệu văn bản: mở từ cột bước ở chế độ Xem', ms.mode === 'view' && ms.sel === 'view' && ms.view && !ms.src, JSON.stringify(ms));
  check('tài liệu văn bản: dựng Markdown, chữ HTML không thành thẻ, link chỉ http(s) mở tab mới',
    view.h1 === 'Cột thiếu' && view.strong === 'age' && view.img === 0 && view.nested && view.pre === '```\nlồng\n```'
    && view.links.join() === 'https://ok.example/ _blank noopener noreferrer', JSON.stringify(view));
  await page.click('#dlg-md .tab[data-mode="split"]');
  ms = await mdState();
  check('tài liệu văn bản: Chia đôi hiện cả hai', ms.mode === 'split' && ms.sel === 'split' && ms.src && ms.view, JSON.stringify(ms));
  await page.fill('#md-form [name="body"]', 'chữ chưa lưu');
  await page.keyboard.press('Escape');
  check('tài liệu văn bản: đóng khi chưa lưu thì hỏi lại', await page.isVisible('#dlg-ask') && (await mdState()).open);
  await page.click('#dlg-ask [data-close]');
  await page.click('#dlg-md .md-foot [data-close]');
  await page.click('#ask-ok');
  await page.waitForTimeout(50);
  check('tài liệu văn bản: chọn bỏ thì không lưu', !(await mdState()).open && /lồng/.test((await cur(page)).steps[1].docs[1].body));

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
  await page.click('#dlg-sub .row-end [data-close]');
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
  await page.fill('#q', 'kiem chat');
  check('tìm không dấu: một bước con', (await page.$$eval('.card[data-sub]', (c) => c.length)) === 1);
  check('lọc: tắt sắp xếp', (await page.$$('[data-act="sub-left"], [data-act="step-up"]')).length === 0);
  await page.fill('#q', 'hieu nghiep vu');
  check('tìm không dấu theo tên bước: cả hàng hiện', (await page.$$eval('.step', (r) => r.length)) === 1);
  await page.fill('#q', '');

  // Nhật ký quyết định.
  await page.fill('#log-decision', 'Bỏ cột thiếu > 40%');
  await page.fill('#log-why', 'Không điền được\nđáng tin');
  await page.click('#log-form button[type="submit"]');
  await page.fill('#log-decision', 'Quyết định hai');
  await page.click('#log-form button[type="submit"]');
  const nL = (await cur(page)).log.length;
  check('nhật ký: thêm hai mục', nL === nLogR + 4 && (await page.$$('.log-item')).length === nL);
  await page.click('.log-item:first-child [data-act="del-log"]');
  check('nhật ký: xoá', (await cur(page)).log.length === nL - 1);
  await page.click('#toast-undo');
  check('nhật ký: hoàn tác', (await cur(page)).log.length === nL);
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
  check('xuất Markdown: tải file .md', /\.md$/.test(dl.suggestedFilename()) && md.startsWith('# Dự án Data Science'));
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
    return { stacked: head.bottom <= sc.getBoundingClientRect().top + 1, scrolls: sc.scrollWidth > sc.clientWidth, left: head.left,
      whole: sc.clientHeight >= card.offsetHeight };
  });
  await m.page.click('.step:first-child [data-act="add-doc"]');
  await m.page.check('#doc-form input[name="kind"][value="md"]', { force: true });
  await m.page.fill('#doc-form [name="title"]', 'Ghi chép');
  await m.page.click('#doc-save');
  await m.page.fill('#md-form [name="body"]', '# Tiêu đề\n\n' + 'dòng dài '.repeat(60) + '\n\n| a | b | c | d | e | f |\n|---|---|---|---|---|---|\n| ' + 'x'.repeat(80) + ' | 2 | 3 | 4 | 5 | 6 |');
  await m.page.click('#dlg-md .tab[data-mode="split"]');
  const mdM = await m.page.evaluate(() => { const r = document.getElementById('dlg-md').getBoundingClientRect(); return [r.left, r.top, r.width, r.height, innerWidth, innerHeight]; });
  check('390px: hộp văn bản toàn màn, không tràn', mdM[0] === 0 && mdM[1] === 0 && mdM[2] === mdM[4] && Math.abs(mdM[3] - mdM[5]) < 2
    && (await hOverflow(m.page)) === 0, mdM.join(','));
  await m.page.click('#md-form button[type="submit"]');
  await m.page.click('.step:first-child .card[data-sub]:first-child [data-act="edit-sub"]');
  await m.page.click('#sub-docs [data-doc-add]');
  await m.page.fill('#doc-form [name="url"]', 'https://example.com/x');
  await m.page.click('#doc-save');
  await m.page.click('#sub-form button[type="submit"]');
  check('390px: không tràn ngang trang', (await hOverflow(m.page)) === 0, String(await hOverflow(m.page)));
  check('390px: tên bước nằm trên hàng bước con, hàng cuộn ngang bên trong', mob.stacked && mob.scrolls && mob.whole);
  check('390px: lề 16px', Math.round(mob.left) === 16, String(mob.left));
  const brand = await m.page.evaluate(() => {
    const t = document.querySelector('.brand-txt');
    return { text: t.textContent, fits: t.scrollWidth <= t.clientWidth && t.getBoundingClientRect().right <= document.getElementById('theme-btn').getBoundingClientRect().left,
      ellipsis: getComputedStyle(t).textOverflow };
  });
  check('390px: thanh trên ghi tên đầy đủ, không cắt "…"', brand.text === 'vudat081299 / Data Science Step Planner' && brand.fits
    && brand.ellipsis !== 'ellipsis', JSON.stringify(brand));
  const small = await m.page.evaluate(() => {
    const bad = [];
    const els = document.querySelectorAll('.step:first-child .card[data-sub]:first-child button:not([data-act="edit-sub"]),'
      + ' .step:first-child .step-head button, .tools button, #theme-btn, #hint-off, #ws-btn, .ws-notes summary, .step:first-child .doc-tag,'
      + ' .step:first-child .step-notes summary');
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
    && (await m.page.$$eval('.step-notes a', (a) => a.filter((x) => /sports-monitoring-project\.html#lt-lich$/.test(x.href)).length)) === 10);
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
  check('bộ nhớ bị chặn: banner, vẫn dùng được', /blocks storage/.test(await bp.textContent('#banner')) && await bp.isVisible('#banner')
    && (await bp.$$('.step')).length === nSteps && !bErr.length, bErr.join(' | '));
  await blocked.close();

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
  const ov = await op.evaluate(() => [JSON.parse(localStorage.getItem('stepPlanner.v2')), localStorage.getItem('stepPlanner.v1')]);
  check('khoá cũ có người làm: mở được, chuyển sang khoá mới không còn người, khoá cũ giữ nguyên',
    !oErr.length && (await op.textContent('#ws-name')) === 'Dự án cũ' && ov[0].workspaces[0].steps[0].subs[0].status === 'done'
    && !('me' in ov[0]) && !('people' in ov[0].workspaces[0]) && !('owner' in ov[0].workspaces[0].steps[0].subs[0])
    && ov[1] === JSON.stringify(v1), oErr.join(' | '));
  await oldCtx.close();

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
