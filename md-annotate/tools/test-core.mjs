/* Bài thử của js/core/ (logic thuần), chạy bằng node, không trình duyệt:  node md-annotate/tools/test-core.mjs
 * Thêm logic thuần mới thì thêm bài thử ở đây. Hành vi cần DOM thì thử ở tools/smoke.cjs. */
import { lexSpans, pairBlocks } from '../js/core/blocks.js';
import { numberSections, lineSections, bandBounds, bandPick, spanAt } from '../js/core/sections.js';
import { syncCurves, followTop } from '../js/core/sync-math.js';
import { paneHeight, splitFits } from '../js/core/panes.js';
import { normShortcuts } from '../js/core/shortcuts.js';

let fails = 0;
const check = (name, ok, detail = '') => {
  if (!ok) fails++;
  console.log(`${ok ? '  ok  ' : '  LỖI'} ${name}${detail ? '  — ' + detail : ''}`);
};
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const abh = ({ a, b, heading }) => ({ a, b, heading }); // bỏ `tag` của khối khi so dòng

/* Bộ tách giả, làm đúng ba điều marked.lexer làm với nguồn: bỏ khối định nghĩa link, dán định nghĩa ngay sau đoạn văn
 * vào raw của đoạn ấy (thêm '\n'), đổi tab đầu dòng thành bốn dấu cách. */
const tok = (type, raw) => ({ type, raw });

// 1. Định nghĩa link đứng riêng: khối sau nó không lệch dòng.
{
  const text = 'Para\n\n[id]: https://x.jpg  "T"\n\n\n## Plugins\n\nThe killer\n[syntax](u).\n';
  const lex = () => [tok('paragraph', 'Para'), tok('space', '\n\n'), tok('heading', '## Plugins\n\n'), tok('paragraph', 'The killer\n[syntax](u).'), tok('space', '\n')];
  const sp = lexSpans(text, lex).map(abh);
  check('lexSpans: định nghĩa link bị bỏ không làm lệch dòng', eq(sp, [{ a: 0, b: 0, heading: false }, { a: 5, b: 5, heading: true }, { a: 7, b: 8, heading: false }]), JSON.stringify(sp));
}
// 2. Định nghĩa dán vào đoạn văn trên nó: khối bao cả dòng định nghĩa, khối sau đúng dòng.
{
  const text = 'With ref:\n[id]: https://x.jpg\n\n## Next\n';
  const lex = () => [tok('paragraph', 'With ref:\n\n[id]: https://x.jpg'), tok('space', '\n\n'), tok('heading', '## Next\n')];
  const sp = lexSpans(text, lex).map(abh);
  check('lexSpans: định nghĩa dán vào đoạn trên', eq(sp, [{ a: 0, b: 1, heading: false }, { a: 3, b: 3, heading: true }]), JSON.stringify(sp));
}
// 3. Tab đầu dòng đổi thành dấu cách trong raw: vẫn tìm ra.
{
  const text = 'Intro\n\n\tcode line\n\tmore\n\n# H\n';
  const lex = () => [tok('paragraph', 'Intro'), tok('space', '\n\n'), tok('code', '    code line\n    more\n\n'), tok('heading', '# H\n')];
  const sp = lexSpans(text, lex).map(abh);
  check('lexSpans: tab đầu dòng', eq(sp, [{ a: 0, b: 0, heading: false }, { a: 2, b: 3, heading: false }, { a: 5, b: 5, heading: true }]), JSON.stringify(sp));
}
// 4. Nội dung khối xuất hiện giữa một dòng trước đó: chỉ khớp ở đầu dòng.
{
  const text = '[x]: https://u\n\nx\n';
  const lex = () => [tok('paragraph', 'x'), tok('space', '\n')];
  const sp = lexSpans(text, lex).map(abh);
  check('lexSpans: chỉ khớp ở đầu dòng', eq(sp, [{ a: 2, b: 2, heading: false }]), JSON.stringify(sp));
}
// 5. Bộ tách ném lỗi: không có khối.
check('lexSpans: bộ tách ném lỗi thì rỗng', eq(lexSpans('# a', () => { throw new Error('x'); }), []));

// Section
check('numberSections', eq(numberSections([false, true, false, true]), ['0', '1', '1', '2']));
check('lineSections: dòng đầu khối tiêu đề mở section', eq(lineSections([{ a: 0, b: 0, heading: false }, { a: 2, b: 2, heading: true }, { a: 4, b: 5, heading: false }], 6), ['0', '0', '1', '1', '1', '1']));
check('bandBounds: 25–50% vùng nhìn', eq(bandBounds(100, 900, 1000), [300, 500]));
{
  // Khối [top, bottom): 0–100, 100–280, 280–600, 600–900; dải 200–400.
  const bl = [[0, 100], [100, 280], [280, 600], [600, 900]];
  const pick = (b1, b2) => bandPick(bl.length, (i) => bl[i][1], (i) => bl[i][0], b1, b2);
  check('bandPick: đuôi khối trước còn trong dải thì khối trước thắng', pick(200, 400) === 1);
  check('bandPick: khối đầu tiên chạm dải', pick(300, 500) === 2);
  check('bandPick: không khối nào chạm thì lấy khối ngay trên', pick(950, 1000) === 3);
}

check('spanAt: dòng trong khối, giữa hai khối', eq([0, 1, 2, 3, 4, 5].map((l) => spanAt([{ a: 0, b: 0 }, { a: 2, b: 4 }], l)), [0, -1, 1, 1, 1, -1]));

// Cuộn theo nhau: khung theo đi đúng điểm neo và không bao giờ lùi khi khung dẫn tiến.
{
  const c = syncCurves([[0, 0], [100, 300], [400, 350], [1000, 1200]]);
  // Khung dẫn cao 200 / tổng 1200, khung theo cao 200 / tổng 1400: tại top = 300, giữa khung (400) ↔ 350.
  check('followTop: điểm neo nằm giữa cả hai khung', Math.abs(followTop(c.fwd, 200, 1200, 300, 200, 1400) - 250) < 1e-6);
  let prev = -1, mono = true;
  for (let top = 0; top <= 1000; top += 5) { const t = followTop(c.fwd, 200, 1200, top, 200, 1400); if (t < prev - 1e-9) mono = false; prev = t; }
  check('followTop: đơn điệu tăng', mono);
  check('followTop: đầu khớp đầu, cuối khớp cuối', Math.abs(followTop(c.fwd, 200, 1200, 0, 200, 1400)) < 1e-6 && Math.abs(followTop(c.fwd, 200, 1200, 1000, 200, 1400) - 1200) < 1e-6);
}

// ── review: data path ──
// Neo → nhận xét → prompt, phiên, số đếm gợi ý. Import theo không gian tên dp*, để không trùng tên với khối khác.
import * as dpAnchor from '../js/core/anchor.js';
import * as dpComments from '../js/core/comments.js';
import * as dpPrompt from '../js/core/prompt.js';
import * as dpSession from '../js/core/session.js';
import * as dpHints from '../js/core/hints.js';
import * as dpText from '../js/core/text.js';
{
  /* Nhận xét dựng như ui/anchor-dom.js: quoteFrom trên chữ của khung, chỗ của chuỗi `needle` thứ nth. */
  const quoteAt = (full, needle, nth, which = 'src') => {
    let i = -1; for (let k = 0; k <= nth; k++) i = full.indexOf(needle, i + 1);
    return dpAnchor.quoteFrom(full, i, i + needle.length, which, needle);
  };
  const cm = (id, info, comment, created = 0) => ({ id, quote: info.quote, comment, origin: info.origin, prefix: info.prefix, suffix: info.suffix, rel: info.rel, created });
  const ses = (text, comments, o = {}) => Object.assign({ text, comments, header: '', footer: '', fmt: 'inline', includeDoc: false, lineNums: true, path: '' }, o);

  // Đoạn trích lặp nhiều lần: chọn đúng chỗ theo prefix / suffix, kể cả khi có hơn 500 chỗ khớp trước nó.
  {
    const text = 'Many people can understand an answer and an idea. '.repeat(120) + 'Finally we found an apple.';
    const want = text.lastIndexOf('an apple');
    const info = dpAnchor.quoteFrom(text, want, want + 2, 'src', '');
    check('locate: đoạn trích ngắn lặp > 500 lần vẫn neo đúng chỗ', eq(dpAnchor.locate(info, text, true), [want, want + 2]), JSON.stringify(dpAnchor.locate(info, text, true)) + ' muốn ' + want);
    const vi = 'x và '.repeat(600) + 'TARGET và end.';
    const j = vi.lastIndexOf('và');
    check('locate: từ Việt lặp > 500 lần vẫn neo đúng chỗ', eq(dpAnchor.locate(dpAnchor.quoteFrom(vi, j, j + 2, 'src', ''), vi, true), [j, j + 2]));
  }
  {
    const text = 'Câu lặp lại. Câu lặp lại.\n';
    const a = quoteAt(text, 'Câu lặp lại.', 1);
    check('locate: hai câu giống nhau sát nhau, chọn câu thứ hai', eq(dpAnchor.locate(a, text, true), [13, 25]));
    check('locate: văn bản rỗng hoặc trích dẫn rỗng thì null', dpAnchor.locate(a, '', true) === null && dpAnchor.locate({ quote: '' }, text, true) === null);
  }
  // Chọn ở Preview, neo về nguồn qua tầng 2 (bỏ cú pháp markdown).
  {
    const src = 'Intro\n\nĐoạn có **chữ đậm** và [link](https://x.y/z) ở giữa.\n';
    const md = 'Intro\nĐoạn có chữ đậm và link ở giữa.';
    const info = quoteAt(md, 'chữ đậm và link', 0, 'md');
    const r = dpAnchor.locate(info, src, true);
    check('locate: trích ở Preview tìm được trong nguồn', r && src.slice(r[0], r[1]) === 'chữ đậm** và [link', JSON.stringify(r && src.slice(r[0], r[1])));
  }
  // Prompt: số dòng, hai kiểu, tệp, toàn văn trong rào dài hơn mọi dãy backtick.
  {
    const text = '# T\n\nDòng ba.\nDòng bốn\ntiếp dòng năm.\n\n````\ncode\n````\n';
    const c1 = cm('a', quoteAt(text, 'Dòng bốn\ntiếp', 0), 'Gộp\n hai   dòng', 2);
    const c2 = cm('b', quoteAt(text, 'Dòng ba.', 0), 'Ngắn hơn', 1);
    const c3 = cm('c', { quote: 'không còn trong văn bản', origin: 'src', prefix: '', suffix: '', rel: 0 }, 'mất neo', 0);
    const s = ses(text, [c1, c2, c3]);
    const d = dpComments.anchorAll(s.comments, s.text, '');
    check('anchorAll: xếp theo vị trí, mất neo không có số', eq(d.ordered.map((c) => c.id), ['b', 'a', 'c']) && eq(d.numbers, { b: 1, a: 2 }) && d.orphans.c === true);
    check('buildPrompt: gọn, L3 và L4-5', dpPrompt.buildPrompt(s, d) ===
      'Số dòng (L) tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.\n\n1. L3 "Dòng ba." — Ngắn hơn\n2. L4-5 "Dòng bốn tiếp" — Gộp hai dòng', JSON.stringify(dpPrompt.buildPrompt(s, d)));
    s.fmt = 'block'; s.path = 'notes/a.md'; s.header = ' Đầu '; s.footer = 'Cuối'; s.includeDoc = true;
    check('buildPrompt: khối, tệp:dòng, lời dẫn, toàn văn', dpPrompt.buildPrompt(s, d) ===
      'Đầu\nVị trí ghi dạng tệp:dòng, tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.\n\n' +
      '### 1 · notes/a.md:3\n> Dòng ba.\n\nNgắn hơn\n\n### 2 · notes/a.md:4-5\n> Dòng bốn\n> tiếp\n\nGộp\n hai   dòng\n\nCuối\n\n' +
      'Văn bản gốc:\n`````markdown\n' + text.trimEnd() + '\n`````', JSON.stringify(dpPrompt.buildPrompt(s, d)));
    s.lineNums = false;
    check('buildPrompt: tắt số dòng thì không nhãn, không câu dẫn số dòng', !/notes\/a\.md|tệp:dòng/.test(dpPrompt.buildPrompt(s, d)));
    check('buildPrompt: không nhận xét, không toàn văn thì rỗng', dpPrompt.buildPrompt(ses(text, [c3]), dpComments.anchorAll([c3], text, '')) === '');
    check('lineOf: đầu dòng, cuối văn bản', dpText.lineOf('a\nb\n', 0) === 1 && dpText.lineOf('a\nb\n', 2) === 2 && dpText.lineOf('a\nb\n', 4) === 3);
    check('slug: bỏ dấu tiếng Việt', dpText.slug('Bài thử Đặng — số 1') === 'bai-thu-dang-so-1');
  }
  // Gợi ý: renamed chỉ dồn số đếm của gợi ý mặc định cũ; nhận xét tự gõ trùng chữ cũ giữ nguyên.
  {
    const renamed = { 'Add an example': 'Thêm ví dụ' };
    const st = { items: { 'add an example': { t: 'Add an example', n: 3, last: 5, o: 4, seed: true, hidden: true } } };
    dpHints.migrateHints(st, renamed);
    check('migrateHints: gợi ý mặc định cũ dồn sang khoá mới, giữ ẩn', eq(Object.keys(st.items), ['thêm ví dụ']) && st.items['thêm ví dụ'].n === 3 && st.items['thêm ví dụ'].hidden === true);
    const own = { items: { 'add an example': { t: 'Add an example', n: 2, last: 9, o: 1e6 } } };
    dpHints.migrateHints(own, renamed);
    check('migrateHints: nhận xét tự gõ trùng chữ gợi ý cũ không bị đổi', eq(Object.keys(own.items), ['add an example']) && own.items['add an example'].n === 2, JSON.stringify(own));
  }
  // Bộ nhớ hỏng: trang vẫn chạy.
  {
    const st = dpHints.normStats({ items: { a: null, b: { t: 'b', n: 2 }, c: 5, d: 'x' } });
    let ok = true;
    try { dpHints.seedHints(st, ['c', 'Thêm ví dụ']); dpHints.countUse(st, 'b'); dpHints.rankedHints(st); dpHints.chipHints(st, '', false); } catch (e) { ok = false; }
    check('normStats: mục hỏng trong số đếm gợi ý không làm vỡ trang', ok && st.items.b.n === 3 && st.items.c.seed === true);
    check('normStats: items là mảng thì bỏ', !Array.isArray(dpHints.normStats({ items: [] }).items));
    const idx = dpSession.normIndex([{ id: 'a' }, null, 'x', { id: 'b', updated: 'hỏng' }, { id: 'c', updated: 7 }]);
    check('normIndex: mục thiếu giờ sửa vẫn ra ngày hợp lệ', idx.length === 3 && idx.every((e) => Number.isFinite(e.updated)) && idx[2].updated === 7, JSON.stringify(idx));
  }
  // Phiên: đổi tên, index.
  {
    const s = { text: '# Tiêu đề\n\nthân', comments: [], named: true, name: 'Cũ' };
    dpSession.renameSession(s, '');
    check('renameSession: tên rỗng thì về tên tự đặt', s.named === false && s.name === 'Tiêu đề');
    const idx = [{ id: 'a' }, { id: 'b' }];
    check('indexWith / indexWithout', eq(dpSession.indexWithout(idx, 'a'), [{ id: 'b' }]) &&
      dpSession.indexWith(idx, { id: 'b', text: 'x', comments: [], name: 'x', created: 1, updated: 2 })[0].id === 'b' &&
      eq(dpSession.indexWith(idx, { id: 'a', text: ' ', comments: [] }).map((e) => e.id), ['b']));
  }
}
// ── end review: data path ──
// ── review: render & select ──
import { tokens } from '../js/core/tokens.js';
import { sourceLines } from '../js/core/runs.js';
{
  // Text của #v-src ghép từ các đoạn của sourceLines: phải đúng bằng nguồn, kể cả tab, dấu cách cuối dòng, rào chưa
  // đóng, emoji (cặp surrogate), thẻ HTML, dòng trống cuối.
  const srcText = (t) => sourceLines(t, tokens(t), [{ s: 1, e: t.length, id: 'a', n: 1 }]).lines.map((l) => l.runs.map((r) => r.t).join('')).join('');
  const cases = ['\tcode\n  trailing  \n', '```js\nunclosed *x*\n', '*😀* `😀` **😀x** _😀_\n> 😀', '<div a="b">\n<!-- c -->\n', 'a\n\n', '| a | b |\n|:-:|--|\n| `|` | **x** |'];
  check('sourceLines: text ghép lại đúng bằng nguồn', cases.every((t) => srcText(t) === t), JSON.stringify(cases.filter((t) => srcText(t) !== t)));
  // Một dòng dài nhiều token (dán văn bản một dòng): trước đây mỗi token quét lại cả dòng bằng mọi luật, bậc ba (≈ 2 s).
  const line = '**b** '.repeat(1000);
  const t0 = performance.now(), k = tokens(line), ms = performance.now() - t0;
  check('tokens: dòng 6 000 ký tự, 1 000 chữ đậm, dưới 300 ms', ms < 300 && k.length === 3000 && k[1].c === 'sx-strong', Math.round(ms) + ' ms, ' + k.length + ' token');
  // Một dòng dài toàn snake_case (JSON một dòng): mỗi dấu _ giữa từ từng làm regex nghiêng quét lại tới cuối dòng (≈ 2,7 s).
  const snake = 'x_y '.repeat(20000), t1 = performance.now(), ks = tokens(snake), ms1 = performance.now() - t1;
  check('tokens: 80 000 ký tự snake_case, dưới 300 ms, không nghiêng', ms1 < 300 && ks.length === 0, Math.round(ms1) + ' ms, ' + ks.length + ' token');
  check('tokens: _nhấn_ vẫn nhận ở đầu từ, bỏ giữa từ', eq(tokens('a _b_ c_d_ e').map((x) => x.c), ['sx-punct', 'sx-em', 'sx-punct']));
}
import { lineCount } from '../js/core/runs.js';
// Số dòng ở thanh trên (#doc-meta) phải bằng số dòng ở lề Source: xuống dòng cuối không mở dòng mới.
check('lineCount: như lề số dòng', eq(['', 'a', 'a\n', 'a\nb', 'a\n\n', '\n'].map(lineCount), [0, 1, 1, 2, 2, 1]));
check('lineCount = số dòng của sourceLines', ['a\nb\n', 'x', '\n\nq'].every((t) => lineCount(t) === sourceLines(t, [], []).lines.length));
import { popPlace } from '../js/core/place.js';
{
  // Khung nhìn 1280×560, hộp 400×264. Dưới đoạn đủ chỗ: ngay dưới; chỉ trên đủ: lên trên; không bên nào đủ: vẫn trọn
  // trong khung nhìn; mép phải: lùi vào.
  const P = (r) => popPlace(r, 400, 264, 1280, 560);
  check('popPlace: dưới đoạn', eq(P({ top: 100, bottom: 120, left: 50 }), { top: 130, left: 50 }));
  check('popPlace: dưới không đủ thì lên trên', eq(P({ top: 400, bottom: 420, left: 50 }), { top: 126, left: 50 }));
  const mid = P({ top: 279, bottom: 299, left: 1200 });
  check('popPlace: hai bên đều không đủ thì vẫn trọn trong khung nhìn', mid.top >= 8 && mid.top + 264 <= 552 && mid.left === 864, JSON.stringify(mid));
  check('popPlace: đoạn đã cuộn khuất phía trên thì hộp vẫn trong khung nhìn', P({ top: -300, bottom: -280, left: 50 }).top === 8);
}
// ── end review: render & select ──
// ── review: layout & scroll ──
{
  // Dòng cuối của khối trùng một dòng trước nó trong khối (rào ``` của khối code trong mục danh sách): khối vẫn tới dòng cuối thật.
  const F = '`'.repeat(3);
  const text = '1. step\n\n   ' + F + '\n   x\n   ' + F + '\n\n# H\n';
  const lex = () => [tok('list', '1. step\n\n   ' + F + '\n   x\n   ' + F + '\n\n'), tok('heading', '# H\n')];
  const sp = lexSpans(text, lex).map(({ a, b }) => [a, b]);
  check('lexSpans: dòng cuối lặp lại trong khối vẫn tính tới dòng cuối thật', eq(sp, [[0, 4], [6, 6]]), JSON.stringify(sp));
}
{
  // Khối HTML mở bằng <h1>…<h6> thành tiêu đề cấp cao ở Preview, nên ở Source nó cũng mở section.
  const text = '<h1 align="center">Title</h1>\n\nIntro\n\n<div>x</div>\n';
  const lex = () => [tok('html', '<h1 align="center">Title</h1>\n\n'), tok('paragraph', 'Intro'), tok('space', '\n\n'), tok('html', '<div>x</div>\n')];
  const sp = lexSpans(text, lex).map((s) => s.heading);
  check('lexSpans: khối HTML <h1> là tiêu đề, <div> thì không', eq(sp, [true, false, false]), JSON.stringify(sp));
}
{
  // Thẻ dự đoán của khối, để ghép với Preview.
  const lex = () => [{ type: 'heading', depth: 2, raw: '## A' }, tok('html', '<!-- c -->\n<details>\n'), { type: 'list', ordered: true, raw: '1. x' }, tok('html', '<!-- only -->')];
  const tags = lexSpans('## A\n<!-- c -->\n<details>\n1. x\n<!-- only -->\n', lex).map((s) => s.tag);
  check('lexSpans: thẻ của khối (H2, DETAILS sau chú thích, OL, chú thích thì rỗng)', eq(tags, ['H2', 'DETAILS', 'OL', '']), JSON.stringify(tags));
}
{
  // Ghép khối nguồn ↔ Preview khi số khối lệch: khối HTML không dựng ra gì, dựng ra hai phần tử, hay gộp ba khối.
  const P = (s, m) => pairBlocks(s.split(' '), m.split(' ')).md;
  check('pairBlocks: cùng số khối thì ghép theo thứ tự', eq(P('H1 P UL', 'H1 P OL'), [0, 1, 2]));
  check('pairBlocks: chú thích HTML không dựng ra gì', eq(pairBlocks(['H1', '', 'P', 'H2', 'P'], ['H1', 'P', 'H2', 'P']).md, [0, -1, 1, 2, 3]));
  check('pairBlocks: một khối HTML dựng ra hai <p>', eq(P('H1 P H2 P', 'H1 P P H2 P'), [0, 1, 3, 4]));
  const d = pairBlocks(['H1', 'DETAILS', 'P', '', 'H2', 'P'], ['H1', 'DETAILS', 'H2', 'P']);
  check('pairBlocks: <details> gộp ba khối', eq(d.md, [0, 1, -1, -1, 2, 3]) && eq(d.src, [0, 1, 4, 5]), JSON.stringify(d));
}
{
  // Dải đọc trượt về mép khi vùng cuộn ở sát đầu / cuối, để section đầu và cuối cũng chạm dải được.
  check('bandBounds: giữa vùng cuộn vẫn 25–50%', eq(bandBounds(100, 900, 1000, 2000, 5000), [300, 500]));
  check('bandBounds: cuộn hết lên thì hai mốc ở mép trên', eq(bandBounds(100, 900, 1000, 0, 5000), [100, 100]));
  check('bandBounds: cuộn hết xuống thì hai mốc ở mép dưới', eq(bandBounds(100, 900, 1000, 5000, 5000), [900, 900]));
  let prev, mono = true;
  for (const max of [100, 500, 5000]) {
    prev = [-Infinity, -Infinity];
    for (let s = 0; s <= max; s += 10) { const b = bandBounds(0, 800, 800, s, max).map((x) => x + s); if (b[0] < prev[0] || b[1] < prev[1]) mono = false; prev = b; }
  }
  check('bandBounds: dải (theo vị trí trong văn bản) không lùi khi cuộn tới', mono);
}
check('splitFits: hai khung 420px + vách 9px', !splitFits(848) && splitFits(849));
check('paneHeight: khung nhìn trừ đỉnh, 17px đáy, thanh đáy; vừa khi ≥ 320', eq(paneHeight(900, 100.5, 0), { h: 782, fit: true }) && eq(paneHeight(500, 100, 76), { h: 320, fit: false }));
// ── end review: layout & scroll ──

// ── neo khác khung ──
// Chọn ở Preview, tìm trong nguồn: ngữ cảnh so trên chữ và số, không trên ký tự thô (`**`, `|`).
{
  const { locate, quoteFrom } = await import('../js/core/anchor.js');
  const src = '| a | b |\n|---|---|\n| alpha | one two |\n\nSome text alpha and **one two** again.\n';
  const md = 'a\tb\nalpha\tone two\nSome text alpha and one two again.';
  const at = (nth) => { const s = nth ? md.lastIndexOf('one two') : md.indexOf('one two'); return locate(quoteFrom(md, s, s + 7, 'md', 'one two'), src, true); };
  check('locate khác khung: chọn "one two" ở đoạn văn thì neo vào đoạn văn, không vào hàng bảng', eq(at(1), [src.indexOf('**one two**') + 2, src.indexOf('**one two**') + 9]), JSON.stringify(at(1)));
  check('locate khác khung: chọn ở hàng bảng thì vẫn neo vào hàng bảng', eq(at(0), [src.indexOf('one two'), src.indexOf('one two') + 7]), JSON.stringify(at(0)));
}
// ── end neo khác khung ──

// ── nhận xét nhiều dòng ──
{
  const { lineRuns, pickable, pickInfo, pickSummary } = await import('../js/core/picks.js');
  const { addComment, anchorAll, markRanges, overlapWarning, partsOf } = await import('../js/core/comments.js');
  const { buildPrompt, locLabel } = await import('../js/core/prompt.js');
  const { normSession } = await import('../js/core/session.js');
  const { locate } = await import('../js/core/anchor.js');
  check('lineRuns: xếp, gộp dòng liền, bỏ trùng', eq(lineRuns([20, 12, 16, 15, 16]), [[12, 12], [15, 16], [20, 20]]));
  check('pickSummary: số dòng và nhãn', pickSummary([20, 12, 16, 15]) === '4 lines · L12, L15-16, L20' && pickSummary([3]) === '1 line · L3');
  const text = ['# Doc', '', 'Alpha line.', 'Beta line.', '   ', '- [ ] same', 'Gamma.', '- [ ] same', 'Delta.', '```js', 'x = 1', '```', ''].join('\n');
  check('pickable: dòng trống, chỉ khoảng trắng, ngoài văn bản thì không', pickable(text, 1) && !pickable(text, 2) && !pickable(text, 5) && !pickable(text, 0) && !pickable(text, 99) && pickable(text, 10));
  const info = pickInfo(text, [8, 3, 4, 2]);
  check('pickInfo: dòng trống bị bỏ, mỗi dải liền một phần, quote là trọn dòng', eq(info.lines, [3, 4, 8]) && eq(info.parts.map((p) => p.quote), ['Alpha line.\nBeta line.', '- [ ] same']) && info.quote === info.parts[0].quote, JSON.stringify(info.parts.map((p) => p.quote)));
  const at8 = text.lastIndexOf('- [ ] same');
  check('pickInfo: prefix / suffix 48 ký tự quanh dải', info.parts[1].prefix === text.slice(at8 - 48, at8) && info.parts[1].suffix === text.slice(at8 + 10, at8 + 58) && info.parts[1].suffix.startsWith('\nDelta.'));
  check('pickInfo: không dòng nào chọn được thì null', pickInfo(text, [2, 5]) === null);
  const S = { text, comments: [], header: '', footer: '', fmt: 'inline', includeDoc: false, lineNums: true, path: '' };
  addComment(S, info, 'Gộp lại');
  const mc = S.comments[0];
  check('addComment: lưu parts (chỉ trường neo), ngoài bằng parts[0]', mc.parts.length === 2 && eq(Object.keys(mc.parts[0]).sort(), ['origin', 'prefix', 'quote', 'rel', 'suffix']) && mc.quote === mc.parts[0].quote && mc.prefix === mc.parts[0].prefix && mc.origin === 'src');
  addComment(S, pickInfo(text, [6]), 'Một dòng');
  check('addComment: một dải thì là nhận xét thường, không parts', !('parts' in S.comments[1]) && S.comments[1].quote === '- [ ] same');
  // Dòng giống hệt nhau (6 và 8): mỗi phần neo đúng chỗ nhờ prefix / suffix.
  const second = text.lastIndexOf('- [ ] same'), first = text.indexOf('- [ ] same');
  check('neo phần: dòng giống hệt, chọn dòng 8 thì neo dòng 8', eq(locate(mc.parts[1], text, true), [second, second + 10]), JSON.stringify(locate(mc.parts[1], text, true)));
  check('neo phần: chọn dòng 6 thì neo dòng 6', eq(locate(S.comments[1], text, true), [first, first + 10]));
  // Hai khối giống hệt cả 48 ký tự trước, chỉ khác sau: suffix bắt đầu bằng xuống dòng vẫn được tính.
  const twin = 'x'.repeat(60) + '\nsame line\nAAA\n' + 'x'.repeat(60) + '\nsame line\nBBB\n';
  const tw = Object.assign(pickInfo(twin, [5]), { rel: 0 }); // rel lệch về chỗ đầu: chỉ suffix phân biệt được
  check('locate: suffix bắt đầu bằng xuống dòng phân biệt hai dòng giống hệt', eq(locate(tw, twin, true), [twin.lastIndexOf('same line'), twin.lastIndexOf('same line') + 9]), JSON.stringify(locate(tw, twin, true)));
  let d = anchorAll(S.comments, text, '');
  check('anchorAll: mỗi phần một neo, ngoài là phần đầu', d.anchors[mc.id].parts.length === 2 && eq(d.anchors[mc.id].src, d.anchors[mc.id].parts[0].src) && !d.orphans[mc.id]);
  check('anchorAll: xếp theo vị trí phần đầu', eq(d.ordered.map((c) => c.id), [mc.id, S.comments[1].id]));
  const rs = markRanges(d).src.filter((r) => r.id === mc.id);
  check('markRanges: mỗi phần một dải, số chỉ ở phần đầu', rs.length === 2 && rs[0].n === 1 && rs[1].n === 0);
  check('locLabel: nhãn từng phần', locLabel(S, d, mc, false) === 'L3-4, L8' && locLabel(Object.assign({}, S, { path: 'a.md' }), d, mc, true) === 'a.md:3-4, a.md:8');
  check('buildPrompt nhiều phần: gọn', buildPrompt(S, d) ===
    'Số dòng (L) tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.\n\n1. L3-4 "Alpha line. Beta line."; L8 "- [ ] same" — Gộp lại\n2. L6 "- [ ] same" — Một dòng', JSON.stringify(buildPrompt(S, d)));
  check('buildPrompt nhiều phần: gọn, có tệp', buildPrompt(Object.assign({}, S, { path: 'a.md' }), d).includes('\n1. a.md:3-4 "Alpha line. Beta line."; a.md:8 "- [ ] same" — Gộp lại\n'));
  check('buildPrompt nhiều phần: khối', buildPrompt(Object.assign({}, S, { fmt: 'block' }), d) ===
    'Số dòng (L) tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.\n\n### 1 · L3-4, L8\n> Alpha line.\n> Beta line.\n\n> - [ ] same\n\nGộp lại\n\n### 2 · L6\n> - [ ] same\n\nMột dòng', JSON.stringify(buildPrompt(Object.assign({}, S, { fmt: 'block' }), d)));
  check('buildPrompt nhiều phần: tắt số dòng', buildPrompt(Object.assign({}, S, { lineNums: false }), d) === '1. "Alpha line. Beta line."; "- [ ] same" — Gộp lại\n2. "- [ ] same" — Một dòng');
  check('buildPrompt nhiều phần: khối, tắt số dòng', buildPrompt(Object.assign({}, S, { fmt: 'block', lineNums: false }), d).startsWith('### 1\n> Alpha line.\n> Beta line.\n\n> - [ ] same\n\nGộp lại'));
  // Mất một phần: bỏ khỏi highlight và prompt, nhận xét vẫn neo. Mất hết: mất neo.
  const t2 = text.replace('Alpha line.\nBeta line.', 'Đã viết lại hẳn.');
  d = anchorAll(S.comments, t2, '');
  check('mất một phần: nhận xét vẫn neo, phần ấy null', !d.orphans[mc.id] && d.anchors[mc.id].parts[0].src === null && !!d.anchors[mc.id].parts[1].src);
  check('mất một phần: xếp theo phần đầu tìm thấy', eq(d.ordered.map((c) => c.id), [S.comments[1].id, mc.id]));
  check('mất một phần: prompt bỏ phần ấy', buildPrompt(Object.assign({}, S, { text: t2 }), d).endsWith('1. L5 "- [ ] same" — Một dòng\n2. L7 "- [ ] same" — Gộp lại'), JSON.stringify(buildPrompt(Object.assign({}, S, { text: t2 }), d)));
  check('mất một phần: số chỉ ở phần còn lại', markRanges(d).src.filter((r) => r.id === mc.id).map((r) => r.n).join() === '2');
  d = anchorAll([mc], 'Không còn gì.', '');
  check('mất mọi phần: mất neo', d.orphans[mc.id] === true);
  // Cảnh báo trùng / chồng.
  d = anchorAll(S.comments, text, '');
  const pk = (inf) => inf.parts.map((p) => ({ pos: [p.s, p.e], quote: p.quote }));
  check('overlapWarning: cùng các phần thì trùng', /Same passage as comment #1\./.test(overlapWarning(d, pk(pickInfo(text, [3, 4, 8])))));
  check('overlapWarning: một phần chạm phần của nhận xét khác thì chồng', overlapWarning(d, pk(pickInfo(text, [4, 9]))) === 'Overlaps comment #1.');
  check('overlapWarning: một đoạn thường như cũ', overlapWarning(d, [{ pos: [first, first + 10], quote: '- [ ] same' }]) === 'Same passage as comment #2. Saving adds a separate item.');
  // Phiên đã lưu: parts giữ, parts hỏng / một phần thì bỏ, phiên cũ không đổi.
  const raw = JSON.parse(JSON.stringify({ text, comments: [mc, { id: 'z', quote: 'Delta.', comment: 'c', parts: [{ quote: 'Delta.' }, null, 5] }, { id: 'y', quote: 'Gamma.', comment: 'c', parts: 'x' }, { id: 'w', quote: 'Gamma.', comment: 'c' }] }));
  const ns = normSession(raw, 'id1');
  check('normSession: giữ parts hợp lệ, bỏ parts hỏng hay một phần', ns.comments.length === 4 && ns.comments[0].parts.length === 2 && !('parts' in ns.comments[1]) && !('parts' in ns.comments[2]) && !('parts' in ns.comments[3]));
  check('partsOf: không parts thì chính nó', partsOf(ns.comments[3])[0] === ns.comments[3] && partsOf(ns.comments[0]) === ns.comments[0].parts);
}
// ── end nhận xét nhiều dòng ──
// ── đánh dấu đã đọc (MDAN-013) ──
{
  const R = await import('../js/core/review.js');
  const { buildPrompt, optionsSummary } = await import('../js/core/prompt.js');
  const { anchorAll } = await import('../js/core/comments.js');
  const { normSession, createSession, indexWith } = await import('../js/core/session.js');
  // Bộ tách giả: mỗi khối cách nhau dòng trống; khối mở bằng '#' là tiêu đề; danh sách có items như marked.
  const lexer = (text) => text.split(/\n{2,}/).filter((b) => b.trim()).map((raw) => {
    if (/^#/.test(raw)) return { type: 'heading', depth: raw.match(/^#+/)[0].length, raw };
    if (/^(?:[-*]|\d+\.) /.test(raw)) {
      const items = raw.split(/\n(?=(?:[-*]|\d+\.) )/).map((x, i, a) => x + (i < a.length - 1 ? '\n' : ''));
      return { type: 'list', ordered: /^\d/.test(raw), raw, items: items.map((x) => ({ raw: x })) };
    }
    if (/^---$/.test(raw)) return { type: 'hr', raw };
    return { type: 'paragraph', raw };
  });
  const U = (t) => R.reviewUnits(t, lexSpans(t, lexer));
  const T0 = ['# Đầu', 'Mở bài.', '- mục một\n  - con của một\n- mục hai', '---', '## Hai', 'Đoạn A.', 'Đoạn B.', '1. bước một\n2. bước hai'].join('\n\n');
  const u0 = U(T0);
  check('reviewUnits: mỗi mục cấp cao một đơn vị, mục con thuộc mục cha, kẻ ngang không là đơn vị',
    eq(u0.map((u) => [u.a, u.b, u.item]), [[0, 0, -1], [2, 2, -1], [4, 5, 0], [6, 6, 1], [10, 10, -1], [12, 12, -1], [14, 14, -1], [16, 16, 0], [17, 17, 1]]), JSON.stringify(u0.map((u) => [u.a, u.b, u.item])));
  check('reviewUnits: section và cấp tiêu đề', eq(u0.map((u) => u.sec), [1, 1, 1, 1, 2, 2, 2, 2, 2]) && u0[0].depth === 1 && u0[4].depth === 2 && u0[4].head && !u0[5].head);
  {
    // Mục con có chữ giống hệt mục cấp cao kế tiếp: mục kế tiếp vẫn bắt đầu ở đúng dòng (cùng thụt lề với mục đầu).
    const t = '- a\n  - b\n- b\n';
    const sp = lexSpans(t, () => [{ type: 'list', raw: '- a\n  - b\n- b', items: [{ raw: '- a\n  - b\n' }, { raw: '- b' }] }]);
    check('lexSpans: dòng đầu mục cấp cao không nhầm với mục con cùng chữ', eq(sp[0].items, [0, 2]), JSON.stringify(sp));
  }
  check('normUnit: đánh số lại danh sách không đổi chữ chuẩn hoá', R.normUnit('1. bước  một\n') === R.normUnit('7) bước một') && R.normUnit('- x') === 'x' && R.normUnit('# H') === '# H');
  const all = (units) => units.map((_, i) => i);
  const markAll = (units, idx) => R.setMarks(units, [], R.resolveMarks(units, []), idx, true);
  // Đã đọc 'Đoạn A.' (đơn vị 5). Chuyển nó lên đầu văn bản, chữ giữ nguyên: vẫn done.
  const mA = markAll(u0, [5]);
  check('dấu: không lưu số dòng', mA.length === 1 && eq(Object.keys(mA[0]).sort(), ['h', 'n', 'p', 'q', 'r']));
  const moved = 'Đoạn A.\n\n' + T0.replace('Đoạn A.\n\n', '');
  let r = R.resolveMarks(U(moved), mA);
  check('resolveMarks: khối chuyển chỗ, chữ không đổi thì vẫn done', r.state[0] === 'done' && r.state.filter((x) => x === 'done').length === 1 && !r.lost.length, JSON.stringify(r));
  // Sửa chữ tại chỗ: changed (không done, không mất).
  const edited = T0.replace('Đoạn A.', 'Đoạn A đã sửa hẳn.');
  r = R.resolveMarks(U(edited), mA);
  check('resolveMarks: chữ đổi tại chỗ thì changed', r.state[5] === 'changed' && !r.lost.length, JSON.stringify(r.state));
  check('progress: changed tính là chưa đọc', R.progress(U(edited), r.state).done === 0 && R.progress(U(edited), r.state).changed === 1);
  // Đánh dấu lại đơn vị changed: done, dấu cũ được thay (không thêm dấu thứ hai).
  const re = R.setMarks(U(edited), mA, r, [5], true);
  check('setMarks: xác nhận lại changed thì done, một dấu', re.length === 1 && R.resolveMarks(U(edited), re).state[5] === 'done');
  // Xoá hẳn khối đã đọc: dấu mất (báo), khối sau dồn lên không bị nhận là changed.
  const gone = T0.replace('Đoạn A.\n\n', '');
  r = R.resolveMarks(U(gone), mA);
  check('resolveMarks: khối đã đọc bị xoá thì dấu mất, khối sau không thành changed', r.lost.length === 1 && r.state.every((x) => x === 'todo'), JSON.stringify(r));
  check('dropLost: bỏ dấu mất', R.dropLost(mA, r).length === 0);
  check('setMarks: dấu mất được giữ khi đánh dấu khối khác', R.setMarks(U(gone), mA, r, [0], true).length === 2);
  // Hai khối giống hệt chữ: dấu ở khối thứ hai không nhảy sang khối thứ nhất.
  const twin = ['# T', 'Cùng chữ.', 'Trước một.', 'Cùng chữ.', 'Sau hai.'].join('\n\n'), ut = U(twin);
  r = R.resolveMarks(ut, markAll(ut, [3]));
  check('resolveMarks: chữ trùng hai chỗ, dấu ở chỗ thứ hai', r.state[1] === 'todo' && r.state[3] === 'done', JSON.stringify(r.state));
  // Đánh số lại danh sách có thứ tự (chèn bước ở đầu): các bước cũ vẫn done.
  const mSteps = markAll(u0, [7, 8]);
  const renum = T0.replace('1. bước một\n2. bước hai', '1. bước mới\n2. bước một\n3. bước hai');
  r = R.resolveMarks(U(renum), mSteps);
  check('resolveMarks: đánh số lại danh sách không làm mất dấu', eq(r.state.slice(-3), ['todo', 'done', 'done']), JSON.stringify(r.state));
  // Bỏ dấu.
  r = R.resolveMarks(u0, mSteps);
  check('setMarks: bỏ dấu', R.resolveMarks(u0, R.setMarks(u0, mSteps, r, [7], false)).state[7] === 'todo');
  // Tiến độ theo số dòng; 100% chỉ khi đọc hết.
  const pAll = R.progress(u0, R.resolveMarks(u0, markAll(u0, all(u0))).state);
  const pMost = R.progress(u0, R.resolveMarks(u0, markAll(u0, all(u0).slice(1))).state);
  check('progress: theo dòng, 100 chỉ khi đọc hết', pAll.pct === 100 && pMost.pct === 90 && pMost.done === 8, JSON.stringify(pMost));
  // Kế tiếp / trước: bỏ qua done, vòng qua mép.
  const st = ['done', 'todo', 'done', 'changed', 'done'];
  check('nextOpen: kế tiếp, trước, vòng', eq(R.nextOpen(st, 1, 1), { i: 3, wrapped: false }) && eq(R.nextOpen(st, 3, 1), { i: 1, wrapped: true }) && eq(R.nextOpen(st, 3, -1), { i: 1, wrapped: false }) && eq(R.nextOpen(st, -1, 1), { i: 1, wrapped: false }) && R.nextOpen(['done'], 0, 1) === null);
  check('unitAt / unitsIn: bôi đen nới ra trọn khối', R.unitAt(u0, 5) === 2 && R.unitAt(u0, 1) === -1 && eq(R.unitsIn(u0, 5, 6), [2, 3]));
  // Section: dàn ý, số nhận xét, trạng thái.
  const ss = R.reviewSections(u0, ['done', 'done', 'done', 'done', 'done', 'changed', 'todo', 'todo', 'todo'], [2, 12, 12]);
  check('reviewSections: tiêu đề, trạng thái, số nhận xét', eq(ss.map((x) => [x.title, x.state, x.done, x.total, x.comments]), [['Đầu', 'done', 4, 4, 1], ['Hai', 'changed', 1, 5, 2]]), JSON.stringify(ss));
  check('reviewSections: một phần là part', R.reviewSections(u0, ['done', 'todo', 'todo', 'todo', 'todo', 'todo', 'todo', 'todo', 'todo'], [])[0].state === 'part');
  // Dải dòng cho prompt: gộp đơn vị liền nhau cùng loại, changed là chưa đọc.
  const rg = R.reviewRanges(u0, ['done', 'done', 'done', 'todo', 'changed', 'done', 'done', 'todo', 'done']);
  check('reviewRanges: gộp dải, changed là chưa đọc', eq(rg, { done: [[1, 6], [13, 15], [18, 18]], todo: [[7, 11], [17, 17]] }), JSON.stringify(rg));
  // Prompt: tắt thì y hệt từng byte; bật thì thêm dòng tiếng Việt; chưa đánh dấu gì thì không thêm.
  const text = 'Dòng một.\n\nDòng ba.\n';
  const cm = { id: 'a', quote: 'Dòng ba.', comment: 'Sửa', origin: 'src', prefix: 'Dòng một.\n\n', suffix: '\n', rel: 0.5, created: 1 };
  const s = Object.assign(createSession(text, {}), { comments: [cm] });
  const d = anchorAll(s.comments, text, '');
  const base = buildPrompt(s, d);
  const dR = Object.assign({}, d, { review: { done: [[1, 1]], todo: [[3, 3]] } });
  check('buildPrompt: tắt dòng đã đọc thì y hệt từng byte', buildPrompt(s, dR) === base && base === 'Số dòng (L) tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.\n\n1. L3 "Dòng ba." — Sửa', JSON.stringify(base));
  s.rvPrompt = true;
  check('buildPrompt: bật dòng đã đọc', buildPrompt(s, dR) === 'Số dòng (L) tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.\nĐã đọc kỹ: L1; chỗ nào không có nhận xét là ổn. Chưa đọc: L3.\n\n1. L3 "Dòng ba." — Sửa', JSON.stringify(buildPrompt(s, dR)));
  check('buildPrompt: bật mà chưa đánh dấu gì thì y hệt', buildPrompt(s, Object.assign({}, d, { review: { done: [], todo: [[1, 3]] } })) === base && buildPrompt(s, d) === base);
  check('buildPrompt: đọc hết thì không có "Chưa đọc", có tệp thì tệp:dòng', buildPrompt(Object.assign({}, s, { path: 'a.md', header: 'Đầu' }), Object.assign({}, d, { review: { done: [[1, 3]], todo: [] } })) ===
    'Đầu\nVị trí ghi dạng tệp:dòng, tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.\nĐã đọc kỹ: a.md:1-3; chỗ nào không có nhận xét là ổn.\n\n1. a.md:3 "Dòng ba." — Sửa');
  check('optionsSummary: có "reviewed" khi bật', optionsSummary(s) === 'compact · line numbers · reviewed' && optionsSummary(Object.assign({}, s, { rvPrompt: false })) === 'compact · line numbers');
  // Phiên: reviews là trường thêm; thiếu hay hỏng thì mặc định, phiên cũ vẫn đọc được.
  const old = normSession({ text: 'x', comments: [] }, 'o');
  const bad = normSession({ text: 'x', comments: [], reviews: [null, { h: 5 }, { h: 'k', r: 7, q: 3 }], rvPrompt: 'yes' }, 'b');
  check('normSession: phiên cũ không có reviews thì []', eq(old.reviews, []) && old.rvPrompt === false);
  check('normSession: bỏ dấu hỏng, sửa trường', eq(bad.reviews, [{ h: 'k', p: '', n: '', q: '', r: 1 }]) && bad.rvPrompt === false, JSON.stringify(bad.reviews));
  {
    // bandScroll: cuộn tới đâu để khối k là khối dải đọc chọn (X kế tiếp trúng nó), cả khi dải trượt sát đầu / cuối.
    const { bandScroll } = await import('../js/core/sections.js');
    const blocks = []; for (let y = 0, i = 0; i < 30; i++) { const h = 40 + (i * 37) % 120; blocks.push([y, y + h]); y += h + 16; }
    const H = 800, top = 100, max = blocks[blocks.length - 1][1] - H;
    const pickAt = (s) => { const b = bandBounds(top, top + H, 2000, s, max); return bandPick(blocks.length, (j) => top + blocks[j][1] - s, (j) => top + blocks[j][0] - s, b[0], b[1]); };
    const at = (k) => bandScroll((s) => top + blocks[k][0] - s - bandBounds(top, top + H, 2000, s, max)[0], max, 6);
    const reach = blocks.map((_, k) => k).filter((k) => pickAt(at(k)) === k);
    const naive = blocks.map((_, k) => k).filter((k) => pickAt(Math.max(0, Math.min(max, blocks[k][0] - H * 0.3))) === k);
    check('bandScroll: mọi khối giữa văn bản tới được dải đọc, sát đầu / cuối cũng được', reach.length >= 27 && [0, 1, 2, 10, 20].every((k) => reach.includes(k)), JSON.stringify(reach));
    check('bandScroll: đặt đỉnh ở 30% thì khối trước thắng (cách cũ hỏng)', naive.length < reach.length - 10, naive.length + ' / ' + reach.length);
  }
  check('indexWith: % đã đọc vào index khi có', indexWith([], Object.assign(createSession('x', {}), { rvPct: 40 }))[0].rv === 40 && !('rv' in indexWith([], createSession('x', {}))[0]));
}
// ── end đánh dấu đã đọc ──

// ── bảng phím tắt (data/shortcuts.json) ──
{
  const d = { groups: [
    { title: ' Multi ', note: 'n', rows: [{ keys: [['Shift', 'X'], ['J']], action: ' Go ' }, { keys: [['']], action: 'bad' }, { keys: [], action: 'none' }, { keys: [['K']] }, null] },
    { title: 'Empty', rows: [{ keys: 'X', action: 'a' }] },
    { rows: [{ keys: [['X']], action: 'no title' }] }
  ] };
  const g = normShortcuts(d);
  check('normShortcuts: giữ hàng hợp lệ, cắt khoảng trắng, bỏ hàng / nhóm hỏng', eq(g, [{ title: 'Multi', note: 'n', rows: [{ keys: [['Shift', 'X'], ['J']], action: 'Go' }] }]), JSON.stringify(g));
  check('normShortcuts: dữ liệu rỗng hay sai kiểu thì danh sách rỗng', eq(normShortcuts(null), []) && eq(normShortcuts({ groups: 'x' }), []));
}
// ── end bảng phím tắt ──

// ── đã đọc, nhiều dòng: trường hợp biên ──
{
  const R = await import('../js/core/review.js');
  const { normSession } = await import('../js/core/session.js');
  const { anchorAll } = await import('../js/core/comments.js');
  // Tiêu đề setext (gạch === / --- ở dòng dưới): tên section không kèm vạch gạch.
  const st = 'Title\n=====\n\nBody one.\n\nSub\n---\n\nBody two.\n';
  const ss = R.reviewSections(R.reviewUnits(st, [{ a: 0, b: 1, heading: true, tag: 'H1' }, { a: 3, b: 3, heading: false, tag: 'P' },
    { a: 5, b: 6, heading: true, tag: 'H2' }, { a: 8, b: 8, heading: false, tag: 'P' }]), ['todo', 'todo', 'todo', 'todo'], []);
  check('reviewSections: tiêu đề setext không kèm vạch gạch', eq(ss.map((x) => x.title), ['Title', 'Sub']), JSON.stringify(ss.map((x) => x.title)));
  // Tiêu đề hay đoạn chỉ có emoji vẫn là đơn vị (có chữ để đọc); kẻ ngang vẫn không.
  const et = '# 🎉\n\n🎉🎉\n\n***\n\n---\n';
  const eu = R.reviewUnits(et, [{ a: 0, b: 0, heading: true, tag: 'H1' }, { a: 2, b: 2, heading: false, tag: 'P' }, { a: 4, b: 4, heading: false, tag: 'HR' }, { a: 6, b: 6, heading: false, tag: 'HR' }]);
  check('reviewUnits: tiêu đề / đoạn chỉ có emoji là đơn vị, kẻ ngang thì không', eq(eu.map((u) => [u.a, u.head]), [[0, true], [2, false]]) && R.reviewSections(eu, ['todo', 'todo'], [])[0].title === '🎉', JSON.stringify(eu.map((u) => [u.a, u.head])));
  // parts hỏng từng trường (rel không phải số, prefix không phải chuỗi) trong bộ nhớ: sửa lại, phần vẫn neo được.
  const text = 'Alpha one.\nBeta two.\nGamma three.\nAlpha one.\n';
  const ns = normSession({ text, comments: [{ id: 'a', quote: 'Alpha one.', comment: 'c', origin: 'src', parts: [{ quote: 'Alpha one.', origin: 'src', rel: 'x', prefix: 3, suffix: null }, { quote: 'Gamma three.', origin: 9 }] }] }, 's');
  const pa = anchorAll(ns.comments, text, '').anchors.a.parts;
  check('normSession: trường hỏng của parts được sửa, phần vẫn neo', pa.every((x) => x.src) && ns.comments[0].parts.every((p) => typeof p.prefix === 'string' && typeof p.suffix === 'string' && Number.isFinite(p.rel) && (p.origin === 'src' || p.origin === 'md')), JSON.stringify([pa, ns.comments[0].parts]));
  // Sửa hàng loạt (đổi một từ ở mọi đoạn) trong văn bản dài đã đọc hết: mọi dấu thành changed, neo lại vẫn nhanh
  // (chạy ở mỗi lần vẽ khi đang gõ).
  const mk = (tag) => Array.from({ length: 2500 }, (_, i) => {
    const q = tag + ' paragraph number ' + i + ' with some words about topic ' + (i % 17) + ' and more text here';
    return { a: i * 2, b: i * 2, h: R.hashStr(q), q: q.slice(0, 80), block: i, item: -1, head: false, depth: 0, sec: 0 };
  });
  const UA = mk('alpha'), UB = mk('beta'), MA = R.setMarks(UA, [], R.resolveMarks(UA, []), UA.map((_, i) => i), true);
  R.resolveMarks(UB, MA);
  const t0 = performance.now(), rB = R.resolveMarks(UB, MA), ms = performance.now() - t0;
  check('resolveMarks: 2.500 dấu đều đổi chữ, neo lại dưới 400ms', ms < 400 && rB.state.every((x, i) => x === 'changed' && rB.owner[i] === i), Math.round(ms) + 'ms');
}
// ── end đã đọc, nhiều dòng: trường hợp biên ──
// ── dải tiến độ và gợi ý theo thời gian đọc (MDAN-016) ──
{
  const D = await import('../js/core/dwell.js');
  const M = await import('../js/core/minimap.js');
  const R = await import('../js/core/review.js');
  // Thời gian cần: 40% số từ ÷ 230 từ/phút, sàn 4 s, trần 60 s.
  check('dwellNeed: 460 từ cần 48 s (40% ÷ 230 wpm)', D.dwellNeed(460) === 48000, String(D.dwellNeed(460)));
  check('dwellNeed: đoạn ngắn cần ít nhất 4 s, đoạn rất dài nhiều nhất 60 s', D.dwellNeed(3) === 4000 && D.dwellNeed(0) === 4000 && D.dwellNeed(5000) === 60000);
  check('dwellReady: đủ thời gian thì sẵn, thiếu 1 ms thì chưa', D.dwellReady(48000, 460) && !D.dwellReady(47999, 460) && !D.dwellReady(undefined, 10));
  // Khoá: băm chữ + thứ tự trong các đơn vị trùng chữ; chữ đổi thì khoá đổi.
  const text = '# T\n\nSame para.\n\nSame para.\n\nOther words here now.\n';
  const spans = [{ a: 0, b: 0, heading: true, tag: 'H1' }, { a: 2, b: 2 }, { a: 4, b: 4 }, { a: 6, b: 6 }];
  const units = R.reviewUnits(text, spans), keys = D.sugKeys(units);
  check('sugKeys: đơn vị trùng chữ có khoá khác nhau', keys[1] !== keys[2] && keys[1].split('.')[0] === keys[2].split('.')[0] && new Set(keys).size === 4, JSON.stringify(keys));
  check('unitWords: đếm từ của từng đơn vị', eq(D.unitWords(text, units), [1, 2, 2, 4]), JSON.stringify(D.unitWords(text, units)));
  const units2 = R.reviewUnits(text.replace('Other words', 'Other changed words'), spans), keys2 = D.sugKeys(units2);
  // Một bước đo: dải [200, 300]; A chạm dải, B dưới dải.
  const it = (k, top, bottom, w) => ({ k, top, bottom, w });
  const band = [200, 300];
  let s = D.dwellStep({}, [it('A', 150, 250, 10), it('B', 320, 400, 10)], band, 0, { count: true, emit: true });
  check('dwellStep: đơn vị chạm dải vào inb, đơn vị ngoài dải không', eq(s.tr.inb, ['A']) && !s.ready.length, JSON.stringify(s.tr));
  // Đọc 5 s (mười bước 500 ms) rồi người dùng cuộn xuống: A lên trên dải → sẵn sàng gợi ý.
  let tr = s.tr;
  for (let k = 0; k < 10; k++) tr = D.dwellStep(tr, [it('A', 150, 250, 10), it('B', 320, 400, 10)], band, 500, { count: true, emit: true }).tr;
  check('dwellStep: thời gian cộng cho đơn vị chạm dải ở bước trước', tr.ms.A === 5000 && !tr.ms.B, JSON.stringify(tr.ms));
  const moved = D.dwellStep(s.tr, [it('A', 50, 150, 10), it('B', 220, 300, 10)], band, 1000, { count: true, emit: false }).tr;
  check('dwellStep: khoảng thời gian thuộc về đơn vị chạm dải ở đầu khoảng, không phải đơn vị vừa vào', moved.ms.A === 1000 && !moved.ms.B, JSON.stringify(moved.ms));
  const up = [it('A', 0, 100, 10), it('B', 170, 250, 10)];
  check('dwellStep: rời dải đi lên sau đủ thời gian thì gợi ý', eq(D.dwellStep(tr, up, band, 0, { count: true, emit: true }).ready, ['A']));
  check('dwellStep: rời dải do cuộn không phải của người dùng (emit tắt) thì không gợi ý', !D.dwellStep(tr, up, band, 0, { count: true, emit: false }).ready.length);
  const down = [it('A', 400, 500, 10), it('B', 600, 700, 10)];
  check('dwellStep: rời dải đi xuống (cuộn ngược lên) thì không gợi ý', !D.dwellStep(tr, down, band, 0, { count: true, emit: true }).ready.length);
  let hid = s.tr;
  for (let k = 0; k < 10; k++) hid = D.dwellStep(hid, [it('A', 150, 250, 10)], band, 500, { count: false, emit: true }).tr;
  check('dwellStep: thời gian không đếm (tab ẩn, mất focus, cuộn do trang) không cộng', !hid.ms.A && !D.dwellStep(hid, up, band, 0, { count: true, emit: true }).ready.length, JSON.stringify(hid.ms));
  let short = s.tr;
  for (let k = 0; k < 7; k++) short = D.dwellStep(short, [it('A', 150, 250, 10)], band, 500, { count: true, emit: true }).tr;
  check('dwellStep: chưa đủ 4 s thì không gợi ý', short.ms.A === 3500 && !D.dwellStep(short, up, band, 0, { count: true, emit: true }).ready.length);
  // Vòng đời gợi ý: chỉ đơn vị chưa đọc hiện gợi ý; chữ đổi thì khoá cũ không còn, gợi ý rơi.
  const sug = { [keys[1]]: true, [keys[3]]: true };
  check('sugList: gợi ý hiện ở đơn vị chưa đọc hay đã đổi chữ', eq(D.sugList(sug, keys, ['todo', 'todo', 'todo', 'changed']), [1, 3]));
  check('sugList: đơn vị đã đọc (chấp nhận gợi ý) không còn gợi ý', eq(D.sugList(sug, keys, ['todo', 'done', 'todo', 'todo']), [3]));
  check('sugList: chữ của đơn vị đổi thì gợi ý của nó rơi', eq(D.sugList(sug, keys2, ['todo', 'todo', 'todo', 'todo']), [1]), JSON.stringify(keys2));
  // Đoạn của dải: co theo tỉ lệ, cao tối thiểu, gộp đơn vị liền cùng trạng thái.
  const seg = M.mmSegments([{ top: 0, bottom: 100, state: 'done' }, { top: 110, bottom: 200, state: 'done' }, { top: 210, bottom: 212, state: 'todo' }, { top: 600, bottom: 1000, state: 'done' }], 1000, 100, 2, 1);
  check('mmSegments: co theo H / total, gộp hai đơn vị liền cùng trạng thái', seg.length === 3 && seg[0].y === 0 && seg[0].h === 20 && seg[0].n === 2, JSON.stringify(seg));
  check('mmSegments: đơn vị thấp vẫn cao ít nhất minH', seg[1].state === 'todo' && seg[1].h === 2 && Math.abs(seg[1].y - 21) < 1e-9, JSON.stringify(seg[1]));
  check('mmSegments: cách xa thì không gộp, đặt đúng chỗ', seg[2].y === 60 && seg[2].h === 40 && seg[2].n === 1, JSON.stringify(seg[2]));
  check('mmSegments: cùng trạng thái nhưng cách xa thì hai đoạn', M.mmSegments([{ top: 0, bottom: 10, state: 'done' }, { top: 500, bottom: 510, state: 'done' }], 1000, 100, 0, 1).length === 2);
  check('mmSegments: khác trạng thái thì không gộp', M.mmSegments([{ top: 0, bottom: 10, state: 'done' }, { top: 10, bottom: 20, state: 'changed' }], 20, 20, 0, 1).length === 2);
  check('mmSegments: tổng cao 0 thì không có đoạn', !M.mmSegments([{ top: 0, bottom: 10, state: 'done' }], 0, 100).length);
  const v = M.mmView(500, 250, 1000, 200, 10);
  check('mmView: hộp khung nhìn theo tỉ lệ', v.y === 100 && v.h === 50, JSON.stringify(v));
  const v2 = M.mmView(990, 10, 1000, 200, 12);
  check('mmView: cao tối thiểu, không tràn khỏi dải', v2.h === 12 && v2.y === 188, JSON.stringify(v2));
  check('mmScroll: bấm giữa dải thì giữa văn bản vào giữa khung nhìn', M.mmScroll(100, 200, 1000, 200) === 400);
  check('mmScroll: sát đầu / cuối kẹp trong [0, total - view]', M.mmScroll(0, 200, 1000, 200) === 0 && M.mmScroll(200, 200, 1000, 200) === 800 && M.mmScroll(50, 200, 100, 200) === 0);
  check('mmDots: đổi ra px trên dải, bỏ chấm quá gần', eq(M.mmDots([500, 10, 520, 900], 1000, 100, 4), [1, 50, 90]), JSON.stringify(M.mmDots([500, 10, 520, 900], 1000, 100, 4)));
}
// ── end dải tiến độ và gợi ý ──

console.log(fails ? `md-annotate core: ${fails} LỖI` : 'md-annotate core: OK');
process.exit(fails ? 1 : 0);
