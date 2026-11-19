/* Bài thử của js/core/ (logic thuần), chạy bằng node, không trình duyệt:  node md-annotate/tools/test-core.mjs
 * Thêm logic thuần mới thì thêm bài thử ở đây. Hành vi cần DOM thì thử ở tools/smoke.cjs. */
import { lexSpans, pairBlocks } from '../js/core/blocks.js';
import { numberSections, lineSections, bandBounds, bandPick, spanAt } from '../js/core/sections.js';
import { syncCurves, followTop } from '../js/core/sync-math.js';
import { paneHeight, splitFits } from '../js/core/panes.js';

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

console.log(fails ? `md-annotate core: ${fails} LỖI` : 'md-annotate core: OK');
process.exit(fails ? 1 : 0);
