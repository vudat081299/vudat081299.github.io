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
{
  const { partAt, partCount, partLines } = await import('../js/core/sections.js');
  // Danh sách dòng 10–15: mục ở 10, 12, 14 (mục giữa có dòng trống ở đuôi, dòng 13); bảng dòng 20–23: đầu, phân cách, hai hàng.
  const li = { a: 10, b: 15, tag: 'UL', items: [10, 12, 14] }, tb = { a: 20, b: 23, tag: 'TABLE' }, p = { a: 30, b: 32, tag: 'P' };
  const blank = (k) => k === 13;
  check('partCount: mục danh sách, hàng bảng (trừ dòng phân cách), khối khác 0', partCount(li) === 3 && partCount(tb) === 3 && partCount(p) === 0);
  check('partAt: dòng → mục; ngoài khối -1', eq([9, 10, 11, 12, 13, 14, 15, 16].map((l) => partAt(li, l)), [-1, 0, 0, 1, 1, 2, 2, -1]));
  check('partAt: hàng bảng; dòng phân cách -1; đoạn văn -1', eq([20, 21, 22, 23].map((l) => partAt(tb, l)), [0, -1, 1, 2]) && partAt(p, 31) === -1);
  check('partLines: mục bỏ dòng trống ở đuôi, mục cuối tới hết khối', eq([0, 1, 2].map((i) => partLines(li, i, blank)), [[10, 11], [12, 12], [14, 15]]));
  check('partLines: hàng bảng một dòng, bỏ dòng phân cách; khối khác cả khối',
    eq([0, 1, 2].map((i) => partLines(tb, i, blank)), [[20, 20], [22, 22], [23, 23]]) && eq(partLines(p, 0, blank), [30, 32]));
  const { subItems } = await import('../js/core/sections.js');
  const T = ['- P1', '  - C1', '    - G1', '  - C2', '', '    more of C2', '- P2'];
  check('subItems: mục con theo thứ tự cây, mục con chứa cháu, bỏ dòng trống ở đuôi', eq(subItems(T, 0, 5), [[1, 2], [2, 2], [3, 5]]), JSON.stringify(subItems(T, 0, 5)));
  check('subItems: mục không có con thì rỗng; dòng thụt bằng mục cha không là con', eq(subItems(['1. a', 'tiếp', '2. b'], 0, 1), []) && eq(subItems(['  - x', '  - y'], 0, 1), []));
  check('partAt ↔ partLines: mỗi dòng của phần i trả lại i', [li, tb].every((sp) => [0, 1, 2].every((i) => { const r = partLines(sp, i, blank); return partAt(sp, r[0]) === i && partAt(sp, r[1]) === i; })));
}

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
/* Phiên dạng cũ (text, comments, path ở cấp phiên) → phiên mới qua normSession (chép trước, không sửa bản gốc), rồi prompt
   của file đang mở. Mọi bài thử prompt dạng cũ đi qua đây: prompt sau khi nâng phải y hệt từng byte như trước. */
const upS = (o) => dpSession.normSession(JSON.parse(JSON.stringify(o)), 'x');
const bp = (o, d) => { const u = upS(o); return dpPrompt.buildPrompt(u, u.docs[u.open], d); };
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
    check('buildPrompt: gọn, L3 và L4-5', bp(s, d) ===
      'Số dòng (L) tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.\n\n1. L3 "Dòng ba." — Ngắn hơn\n2. L4-5 "Dòng bốn tiếp" — Gộp hai dòng', JSON.stringify(bp(s, d)));
    s.fmt = 'block'; s.path = 'notes/a.md'; s.header = ' Đầu '; s.footer = 'Cuối'; s.includeDoc = true;
    check('buildPrompt: khối, tệp:dòng, lời dẫn, toàn văn', bp(s, d) ===
      'Đầu\nVị trí ghi dạng tệp:dòng, tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.\n\n' +
      '### 1 · notes/a.md:3\n> Dòng ba.\n\nNgắn hơn\n\n### 2 · notes/a.md:4-5\n> Dòng bốn\n> tiếp\n\nGộp\n hai   dòng\n\nCuối\n\n' +
      'Văn bản gốc:\n`````markdown\n' + text.trimEnd() + '\n`````', JSON.stringify(bp(s, d)));
    s.lineNums = false;
    check('buildPrompt: tắt số dòng thì không nhãn, không câu dẫn số dòng', !/notes\/a\.md|tệp:dòng/.test(bp(s, d)));
    check('buildPrompt: không nhận xét, không toàn văn thì rỗng', bp(ses(text, [c3]), dpComments.anchorAll([c3], text, '')) === '');
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
    const s = upS({ text: '# Tiêu đề\n\nthân', comments: [], named: true, name: 'Cũ' });
    dpSession.renameSession(s, '');
    check('renameSession: tên rỗng thì về tên tự đặt', s.named === false && s.name === 'Tiêu đề');
    const idx = [{ id: 'a' }, { id: 'b' }];
    check('indexWith / indexWithout', eq(dpSession.indexWithout(idx, 'a'), [{ id: 'b' }]) &&
      dpSession.indexWith(idx, Object.assign(upS({ text: 'x', comments: [], name: 'x', created: 1, updated: 2 }), { id: 'b' }))[0].id === 'b' &&
      eq(dpSession.indexWith(idx, Object.assign(upS({ text: ' ', comments: [] }), { id: 'a' })).map((e) => e.id), ['b']));
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
import { clampInto, edgeScroll, fabSide, popPlace, sheetReveal } from '../js/core/place.js';
{
  // Khung nhìn 1280×560, hộp 400×264. Dưới đoạn đủ chỗ: ngay dưới; chỉ trên đủ: lên trên; không bên nào đủ: vẫn trọn
  // trong khung nhìn; mép phải: lùi vào.
  const P = (r) => popPlace(r, 400, 264, 1280, 560);
  check('popPlace: dưới đoạn', eq(P({ top: 100, bottom: 120, left: 50 }), { top: 130, left: 50 }));
  check('popPlace: dưới không đủ thì lên trên', eq(P({ top: 400, bottom: 420, left: 50 }), { top: 126, left: 50 }));
  const mid = P({ top: 279, bottom: 299, left: 1200 });
  check('popPlace: hai bên đều không đủ thì vẫn trọn trong khung nhìn', mid.top >= 8 && mid.top + 264 <= 552 && mid.left === 864, JSON.stringify(mid));
  check('popPlace: đoạn đã cuộn khuất phía trên thì hộp vẫn trong khung nhìn', P({ top: -300, bottom: -280, left: 50 }).top === 8);
  // Tấm đáy đỉnh ở 400, thanh trên đáy ở 56, cách 12: đoạn dưới tấm thì cuộn xuống tới khi đáy đoạn ở 388.
  const R = (t, b) => sheetReveal(t, b, 400, 56, 12);
  check('sheetReveal: đoạn bị tấm che thì cuộn xuống tới ngay trên tấm', R(466, 495) === 107 && R(380, 399) === 11);
  check('sheetReveal: đoạn đã nằm gọn thì không cuộn', R(100, 380) === 0 && R(68, 120) === 0);
  check('sheetReveal: đoạn dưới thanh trên thì cuộn lên, không đẩy đáy xuống dưới tấm', R(30, 60) === -38 && R(20, 380) === -8);
  check('sheetReveal: đoạn cao hơn chỗ trống thì đáy sát tấm', R(10, 900) === 512);
  check('fabSide: đoạn ở nửa dưới hay chạm nút thì nút lên trên', fabSide(500, 520, 529, 659) === 'top' && fabSide(100, 130, 529, 659) === 'bottom' && fabSide(200, 525, 529, 659) === 'top');
  const box = { left: 100, right: 500, top: 50, bottom: 650 };
  check('clampInto: trái hộp là đầu dòng, phải hộp là cuối dòng, trên / dưới về dòng đầu / cuối đang thấy, trong hộp giữ nguyên',
    JSON.stringify([clampInto(4, 300, box), clampInto(900, 300, box), clampInto(200, 10, box), clampInto(200, 700, box), clampInto(200, 300, box)])
    === JSON.stringify([{ x: 101, y: 300 }, { x: 499, y: 300 }, { x: 200, y: 51 }, { x: 200, y: 649 }, { x: 200, y: 300 }]));
  check('edgeScroll: giữa vùng thấy không cuộn; vào dải 16px sát mép hay quá mép thì cuộn theo khoảng vào dải, tối đa 24px mỗi khung hình',
    edgeScroll(300, 50, 650) === 0 && edgeScroll(66, 50, 650) === 0 && edgeScroll(634, 50, 650) === 0 && edgeScroll(56, 50, 650) === -5
    && edgeScroll(649, 50, 650) === 7 && edgeScroll(670, 50, 650) === 18 && edgeScroll(2000, 50, 650) === 24 && edgeScroll(-900, 50, 650) === -24);
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
  const { locLabel } = await import('../js/core/prompt.js');
  const { normSession, docOf } = await import('../js/core/session.js');
  const { locate } = await import('../js/core/anchor.js');
  const buildPrompt = bp;
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
  check('locLabel: nhãn từng phần', locLabel(S, d, mc, '') === 'L3-4, L8' && locLabel(S, d, mc, 'a.md') === 'a.md:3-4, a.md:8');
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
  const ns = normSession(raw, 'id1'), nc = docOf(ns).comments;
  check('normSession: giữ parts hợp lệ, bỏ parts hỏng hay một phần', nc.length === 4 && nc[0].parts.length === 2 && !('parts' in nc[1]) && !('parts' in nc[2]) && !('parts' in nc[3]));
  check('partsOf: không parts thì chính nó', partsOf(nc[3])[0] === nc[3] && partsOf(nc[0]) === nc[0].parts);
}
// ── end nhận xét nhiều dòng ──
// ── đánh dấu đã đọc (MDAN-013) ──
{
  const R = await import('../js/core/review.js');
  const { optionsSummary } = await import('../js/core/prompt.js');
  const { anchorAll } = await import('../js/core/comments.js');
  const { normSession, createSession, indexWith, docOf, renameIn } = await import('../js/core/session.js');
  const buildPrompt = (s, d) => dpPrompt.buildPrompt(s, docOf(s), d);
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
  {
    // Sửa khối đầu / cuối văn bản: thiếu một hàng xóm nhưng mép văn bản cũng là hàng xóm khớp, nên thành changed, không mất.
    const ed = ['# Thiết kế', 'Đoạn giữa một.', 'Đoạn giữa hai.', 'Cuối cùng là đây.'].join('\n\n'), ue = U(ed), me = markAll(ue, [0, 3]);
    const r2 = R.resolveMarks(U(ed.replace('# Thiết kế', '# Thanh toán').replace('Cuối cùng là đây.', 'Cuối cùng đã viết lại.')), me);
    check('resolveMarks: sửa khối đầu / cuối thì changed, không mất', r2.state[0] === 'changed' && r2.state[3] === 'changed' && !r2.lost.length, JSON.stringify(r2));
    // Chữ trùng: sửa bản đã đọc thì nó thành changed; dấu không nhảy sang bản trùng chưa đọc ở chỗ khác.
    const du = ['Same.', 'Other.', 'Same.'].join('\n\n'), ud = U(du);
    const r3 = R.resolveMarks(U(du.replace(/Same\.$/, 'Same!')), markAll(ud, [2]));
    check('resolveMarks: sửa bản trùng chữ đã đọc thì changed, bản kia không nhận dấu', eq(r3.state, ['todo', 'todo', 'changed']), JSON.stringify(r3.state));
    // Hai bản trùng đều đã đọc, sửa bản đầu: kết quả không tuỳ thứ tự đánh dấu.
    const dd = ['Intro.', 'Same note.', 'Beta.', 'Same note.', 'End.'].join('\n\n'), udd = U(dd), ed2 = U(dd.replace('Same note.', 'Rewritten line.'));
    const a1 = R.resolveMarks(ed2, R.setMarks(udd, markAll(udd, [1]), R.resolveMarks(udd, markAll(udd, [1])), [3], true));
    const a2 = R.resolveMarks(ed2, R.setMarks(udd, markAll(udd, [3]), R.resolveMarks(udd, markAll(udd, [3])), [1], true));
    check('resolveMarks: chữ trùng, sửa một bản: changed + done, không tuỳ thứ tự bấm', eq(a1.state, ['todo', 'changed', 'todo', 'done', 'todo']) && eq(a2.state, a1.state) && !a1.lost.length && !a2.lost.length, JSON.stringify([a1, a2]));
    // Xoá khối đã đọc: khối hàng xóm có chữ gần giống dồn lên không nhận dấu (changed) — dấu mất.
    const sb = ['Head.', 'Add field foo to table users now', 'Add field bar to table users now', 'Tail.'].join('\n\n'), us = U(sb);
    const r4 = R.resolveMarks(U(sb.replace('Add field foo to table users now\n\n', '')), markAll(us, [1]));
    check('resolveMarks: xoá khối đã đọc, hàng xóm gần giống không thành changed', r4.lost.length === 1 && r4.state.every((x) => x === 'todo'), JSON.stringify(r4));
    check('reviewUnits: khối chỉ có chú thích HTML không là đơn vị', U('Một.\n\n<!-- ghi chú -->\n\nHai.').length === 2);
    check('unitRuns / markWord: gộp đơn vị liền nhau', eq(R.unitRuns(u0, [0, 1, 5, 6]), [[0, 2], [12, 14]]) && R.markWord(u0, [0, 1, 5, 6], true) === 'Marked 4 blocks (L1–3, L13–15) reviewed.' && R.markWord(u0, [5], false) === 'Unmarked 1 block (L13).');
    {
      // Đơn vị 0–1 (đã đọc), 3 (chưa), 5–6 (đã đọc); dòng 2, 4, 7, 8 trống; dòng 9 có chữ, ngoài đơn vị.
      const us = [{ a: 0, b: 1 }, { a: 3, b: 3 }, { a: 5, b: 6 }], bl = [0, 0, 1, 0, 1, 0, 0, 1, 1, 0].map(Boolean);
      check('rvLines: dòng của đơn vị đã đọc và dải dòng trống ngay dưới nó mờ; dòng trống sau khối chưa đọc thì không',
        eq([...R.rvLines(us, ['done', 'todo', 'done'], bl)], [1, 1, 1, 0, 0, 1, 1, 1, 1, 0]) && eq([...R.rvLines(us, ['todo', 'done', 'changed'], bl)], [0, 0, 0, 1, 1, 0, 0, 0, 0, 0]));
      check('rvLines: đơn vị vượt số dòng thì cắt', eq([...R.rvLines([{ a: 1, b: 9 }], ['done'], [false, false, true])], [0, 1, 1]));
    }
    check('unitsOfLines / allDone / withSug', eq(R.unitsOfLines(u0, [6, 5, 7, 2]), [2, 3]) && R.allDone(['done', 'done'], [0, 1]) && !R.allDone(['done'], []) && !R.allDone(['done', 'todo'], [0, 1]) && eq(R.withSug(['done', 'todo', 'changed'], [0, 1, 2]), ['done', 'sug', 'sug']));
  }
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
  const s = createSession(text, {});
  docOf(s).comments.push(cm);
  const d = anchorAll(docOf(s).comments, text, '');
  const base = buildPrompt(s, d);
  const dR = Object.assign({}, d, { review: { done: [[1, 1]], todo: [[3, 3]] } });
  check('buildPrompt: tắt dòng đã đọc thì y hệt từng byte', buildPrompt(s, dR) === base && base === 'Số dòng (L) tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.\n\n1. L3 "Dòng ba." — Sửa', JSON.stringify(base));
  s.rvPrompt = true;
  check('buildPrompt: bật dòng đã đọc', buildPrompt(s, dR) === 'Số dòng (L) tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.\nĐã đọc kỹ: L1; chỗ nào không có nhận xét là ổn. Chưa đọc: L3.\n\n1. L3 "Dòng ba." — Sửa', JSON.stringify(buildPrompt(s, dR)));
  check('buildPrompt: bật mà chưa đánh dấu gì thì y hệt', buildPrompt(s, Object.assign({}, d, { review: { done: [], todo: [[1, 3]] } })) === base && buildPrompt(s, d) === base);
  check('buildPrompt: đọc hết thì không có "Chưa đọc", có tệp thì tệp:dòng', buildPrompt(Object.assign(renameIn(s, s.open, 'a.md').s, { header: 'Đầu' }), Object.assign({}, d, { review: { done: [[1, 3]], todo: [] } })) ===
    'Đầu\nVị trí ghi dạng tệp:dòng, tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.\nĐã đọc kỹ: a.md:1-3; chỗ nào không có nhận xét là ổn.\n\n1. a.md:3 "Dòng ba." — Sửa');
  check('buildPrompt: tắt số dòng thì không có dòng đã đọc', buildPrompt(Object.assign({}, s, { lineNums: false }), dR) === buildPrompt(Object.assign({}, s, { lineNums: false, rvPrompt: false }), dR) && optionsSummary(Object.assign({}, s, { lineNums: false })) === 'compact');
  check('optionsSummary: có "reviewed" khi bật', optionsSummary(s) === 'compact · line numbers · reviewed' && optionsSummary(Object.assign({}, s, { rvPrompt: false })) === 'compact · line numbers');
  // Phiên: reviews là trường thêm; thiếu hay hỏng thì mặc định, phiên cũ vẫn đọc được.
  const old = normSession({ text: 'x', comments: [] }, 'o');
  const bad = normSession({ text: 'x', comments: [], reviews: [null, { h: 5 }, { h: 'k', r: 7, q: 3 }], rvPrompt: 'yes' }, 'b');
  check('normSession: phiên cũ không có reviews thì []', eq(docOf(old).reviews, []) && old.rvPrompt === false);
  check('normSession: bỏ dấu hỏng, sửa trường', eq(docOf(bad).reviews, [{ h: 'k', p: '', n: '', q: '', r: 1 }]) && bad.rvPrompt === false, JSON.stringify(docOf(bad).reviews));
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
  check('indexWith: % đã đọc vào index khi có', indexWith([], ((x) => { docOf(x).rvPct = 40; return x; })(createSession('x', {})))[0].rv === 40 && !('rv' in indexWith([], createSession('x', {}))[0]));
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
  const { normSession, docOf } = await import('../js/core/session.js');
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
  const pa = anchorAll(docOf(ns).comments, text, '').anchors.a.parts;
  check('normSession: trường hỏng của parts được sửa, phần vẫn neo', pa.every((x) => x.src) && docOf(ns).comments[0].parts.every((p) => typeof p.prefix === 'string' && typeof p.suffix === 'string' && Number.isFinite(p.rel) && (p.origin === 'src' || p.origin === 'md')), JSON.stringify([pa, docOf(ns).comments[0].parts]));
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
  check('sugList: tiêu đề không được gợi ý', eq(D.sugList(sug, keys, ['todo', 'todo', 'todo', 'todo'], units.map((u, i) => ({ head: i === 1 }))), [3]));
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

// ── cây folder + file (tree.js), phiên nhiều file (session.js), prompt gom file, .zip ──
{
  const T = await import('../js/core/tree.js');
  const { findFiles } = await import('../js/core/tree-find.js');
  const S = await import('../js/core/session.js');
  const P = await import('../js/core/prompt.js');
  const Z = await import('../js/core/zip.js');
  const { anchorAll } = await import('../js/core/comments.js');
  const { quoteFrom } = await import('../js/core/anchor.js');
  const freeze = (a) => Object.freeze(a.map((n) => Object.freeze(Object.assign({}, n))));
  const N = (id, parent, kind, name) => ({ id, parent, kind, name });
  let k = 0; const mk = (kind) => kind[0] + (++k);
  const names = (nodes, ids) => ids.map((id) => nodes.find((n) => n.id === id).name);

  // Sâu ≥ 6, gập folder, thứ tự hiển thị; mọi hàm không sửa mảng / nút đầu vào (đóng băng thì sửa là ném lỗi).
  {
    const r = T.fromPaths([], null, ['a/b/c/d/e/f/g.md', 'a/b/c/d/e/f/h.md', 'a/top.md'], mk);
    const nodes = freeze(r.nodes), g = r.ids['a/b/c/d/e/f/g.md'];
    check('tree: sâu 7 tầng, pathOf', T.pathOf(nodes, g) === 'a/b/c/d/e/f/g.md' && T.pathOf(nodes, 'không có') === '');
    const rows = T.visibleRows(nodes, []);
    check('visibleRows: depth từ 0, folder trước file', eq(rows.map((x) => x.depth + ':' + x.node.name), ['0:a', '1:b', '2:c', '3:d', '4:e', '5:f', '6:g.md', '6:h.md', '1:top.md']), JSON.stringify(rows.map((x) => x.depth + ':' + x.node.name)));
    const c = nodes.find((n) => n.name === 'c');
    check('visibleRows: con của folder gập bị ẩn, filesInOrder thì không', eq(T.visibleRows(nodes, [c.id]).map((x) => x.node.name), ['a', 'b', 'c', 'top.md']) && eq(names(nodes, T.filesInOrder(nodes)), ['g.md', 'h.md', 'top.md']));
    check('byId: nút theo id, không có thì null', T.byId(nodes, c.id) === c && T.byId(nodes, 'x') === null);
    check('subtree: id và mọi hậu duệ', T.subtree(nodes, c.id).length === 6 && T.subtree(nodes, 'x').length === 0);
    // Tìm file theo mẫu (MDAN-068): RegExp không phân biệt hoa thường trên tên; không hợp lệ thì chuỗi con; giữ folder tổ tiên.
    const fr = T.fromPaths([], null, ['docs/axb-notes.text', 'docs/abc.text', 'docs/deep/AXB-plan.text', 'notes.md', 'a(b.md', 'Tiếng.md'], mk), fn = freeze(fr.nodes);
    const shownBy = (q) => { const f = findFiles(fn, q); return f && T.visibleRows(fn, [fr.ids['docs'] || ''], f.keep).map((x) => x.depth + ':' + x.node.name); };
    check('findFiles: ^a.b.*\.text$ tìm axb-notes.text, AXB-plan.text (không phân biệt hoa thường), hiện cả folder tổ tiên, mở',
      eq(shownBy('^a.b.*\\.text$'), ['0:docs', '1:deep', '2:AXB-plan.text', '1:axb-notes.text']) && findFiles(fn, '^a.b.*\\.text$').files === 2, JSON.stringify(shownBy('^a.b.*\\.text$')));
    check('findFiles: chữ thường là chuỗi con; rỗng là null', eq(shownBy('notes'), ['0:docs', '1:axb-notes.text', '0:notes.md']) && findFiles(fn, '') === null && findFiles(fn, '  ') === null);
    const bad = findFiles(fn, 'a(b');
    check('findFiles: mẫu không hợp lệ thì tìm chuỗi con, không ném', bad.literal && bad.files === 1 && !findFiles(fn, 'a.b').literal);
    check('findFiles: không khớp gì thì 0 file, không hàng nào; NFC', findFiles(fn, 'zzz').files === 0 && findFiles(fn, 'zzz').keep.size === 0 && findFiles(fn, 'tie\u0302\u0301ng').files === 1);
    const rm = T.removeNode(nodes, c.id);
    check('removeNode: xoá cả cây con', rm.removed.length === 6 && rm.nodes.length === 3 && nodes.length === 9);
    check('moveNode: không vào chính nó / hậu duệ', /itself/.test(T.moveNode(nodes, c.id, c.id).error) && /itself/.test(T.moveNode(nodes, c.id, nodes.find((n) => n.name === 'f').id).error));
    const mv = T.moveNode(nodes, g, null);
    check('moveNode: lên gốc', !mv.error && mv.nodes.find((n) => n.id === g).parent === null && nodes.find((n) => n.id === g).parent !== null);
    check('moveNode: cha là file thì lỗi', T.moveNode(nodes, c.id, nodes.find((n) => n.name === 'top.md').id).error === 'Parent folder not found.');
  }
  // Thứ tự tự nhiên, không phân biệt hoa thường; folder trước.
  {
    const nodes = freeze([N('1', null, 'file', 'file10.md'), N('2', null, 'file', 'file2.md'), N('3', null, 'file', 'File1.md'), N('4', null, 'dir', 'zeta'), N('5', null, 'dir', 'Alpha'), N('6', null, 'file', 'a.md')]);
    check('kids: folder trước, so tên tự nhiên', eq(T.kids(nodes, null).map((n) => n.name), ['Alpha', 'zeta', 'a.md', 'File1.md', 'file2.md', 'file10.md']));
  }
  // Tên: hỏng, trùng anh em không phân biệt hoa thường (cả NFC / NFD), tự đổi khi thêm.
  {
    const nodes = freeze([N('d', null, 'dir', 'docs'), N('r', null, 'file', 'readme.md'), N('u', null, 'file', 'untitled.md'), N('v', null, 'file', 'untitled-2.md'), N('t', null, 'file', 'Tiếng Việt.md')]);
    check('nameError: rỗng, /, \\, .., quá 255', ['', '  ', 'a/b', 'a\\b', '.', '..', 'x'.repeat(256)].every((x) => T.nameError(nodes, null, x, null)) && T.nameError(nodes, null, 'x'.repeat(255), null) === '');
    check('nameError: trùng anh em không phân biệt hoa thường', /already exists/.test(T.nameError(nodes, null, 'README.md', null)) && /folder named "docs"/.test(T.nameError(nodes, null, 'Docs', null)) && T.nameError(nodes, 'd', 'readme.md', null) === '');
    check('nameError: tên NFD trùng tên NFC', /already exists/.test(T.nameError(nodes, null, 'Tiếng Việt.md'.normalize('NFD'), null)));
    check('renameNode: đổi hoa thường của chính nó được, trùng nút khác thì lỗi', !T.renameNode(nodes, 'r', 'README.md').error && /already exists/.test(T.renameNode(nodes, 'r', 'Untitled.md').error));
    check('uniqueName: untitled-3.md, folder docs-2', T.uniqueName(nodes, null, 'untitled.md') === 'untitled-3.md' && T.uniqueName(nodes, null, 'DOCS') === 'DOCS-2' && T.uniqueName(nodes, 'd', 'readme.md') === 'readme.md');
    check('addNode: trùng tên, trùng id, cha không có thì lỗi; được thì mảng mới', /already exists/.test(T.addNode(nodes, N('n', null, 'file', 'Readme.md')).error) && T.addNode(nodes, N('r', 'd', 'file', 'x.md')).error === 'Duplicate id.' && T.addNode(nodes, N('n', 'zz', 'file', 'x.md')).error === 'Parent folder not found.' && T.addNode(nodes, N('n', 'd', 'file', 'x.md')).nodes.length === 6);
  }
  // Nạp folder: gộp folder đã có (khác hoa thường), file trùng thì đổi tên, bỏ đoạn rỗng / '.', bỏ đường dẫn có '..'.
  {
    const nodes = freeze([N('d', null, 'dir', 'docs'), N('a', 'd', 'file', 'a.md'), N('f', null, 'file', 'notes')]);
    const r = T.fromPaths(nodes, null, ['Docs/a.md', 'docs/sub/b.md', './x.md', 'docs//sub/c.md', '../bad.md', 'notes/n.md', 'notes/m.md'], mk);
    check('fromPaths: gộp folder đã có, file trùng thành a-2.md', T.pathOf(r.nodes, r.ids['Docs/a.md']) === 'docs/a-2.md' && T.pathOf(r.nodes, r.ids['docs/sub/b.md']) === 'docs/sub/b.md' && T.pathOf(r.nodes, r.ids['docs//sub/c.md']) === 'docs/sub/c.md', JSON.stringify(r.ids));
    check('fromPaths: một folder sub, bỏ ./ và đường dẫn có ..', r.nodes.filter((n) => n.name === 'sub').length === 1 && T.pathOf(r.nodes, r.ids['./x.md']) === 'x.md' && !('../bad.md' in r.ids));
    check('fromPaths: folder trùng tên file thì notes-2, các file sau vào cùng folder ấy', T.pathOf(r.nodes, r.ids['notes/n.md']) === 'notes-2/n.md' && T.pathOf(r.nodes, r.ids['notes/m.md']) === 'notes-2/m.md' && nodes.length === 3);
    const into = T.fromPaths(nodes, 'd', ['q/w.md'], mk);
    check('fromPaths: dưới một folder', T.pathOf(into.nodes, into.ids['q/w.md']) === 'docs/q/w.md');
  }
  // Vòng cha – con (dữ liệu hỏng): không treo, không hiện; normSession cắt vòng.
  {
    const nodes = freeze([N('x', 'y', 'dir', 'x'), N('y', 'x', 'dir', 'y'), N('f', 'x', 'file', 'f.md'), N('g', null, 'file', 'g.md')]);
    check('tree: vòng không treo, nút trong vòng không hiện', eq(T.visibleRows(nodes, []).map((r) => r.node.id), ['g']) && T.pathOf(nodes, 'f') === 'y/x/f.md' && eq(T.filesInOrder(nodes), ['g']));
    const s = S.normSession({ nodes: nodes.map((n) => Object.assign({}, n)), docs: { f: { text: 'F' }, g: { text: 'G' } }, open: 'f' }, 'c');
    check('normSession: cắt vòng, mọi nút tới được từ gốc', T.visibleRows(s.nodes, []).length === 4 && T.filesInOrder(s.nodes).length === 2 && s.open === 'f');
  }
  // afterRemove: giữ file mở; xoá nó thì file kế sau, hết thì kế trước, hết file thì null.
  {
    const nodes = freeze([N('d', null, 'dir', 'd'), N('a', 'd', 'file', 'a.md'), N('b', 'd', 'file', 'b.md'), N('c', null, 'file', 'c.md')]);
    check('afterRemove: kế bên theo thứ tự hiển thị', T.afterRemove(nodes, ['a'], 'a') === 'b' && T.afterRemove(nodes, ['c'], 'c') === 'b' && T.afterRemove(nodes, ['d', 'a', 'b'], 'a') === 'c' && T.afterRemove(nodes, ['c'], 'a') === 'a' && T.afterRemove(nodes, ['d', 'a', 'b', 'c'], 'b') === null);
  }

  // Phiên: tạo mới, nâng phiên cũ, chuẩn hoá khuôn mới.
  {
    const s = S.createSession('Chữ', { fmt: 'block' });
    const f = s.nodes[0];
    check('createSession: một file untitled.md, real false, mở nó', s.nodes.length === 1 && f.kind === 'file' && f.name === 'untitled.md' && f.parent === null && s.open === f.id && S.docOf(s).text === 'Chữ' && S.docOf(s).real === false && s.promptAll === false && eq(s.collapsed, []) && s.fmt === 'block');
    const up = (path, extra) => S.normSession(Object.assign({ text: 'T', comments: [], reviews: [{ h: 'k' }], path, rvPct: 30 }, extra), 'o');
    const a = up('notes/a.md'), b = up(''), c = up('docs/'), w = up('C:\\x\\a.md');
    check('normSession: phiên cũ có path → file a.md thật, phần trước là tiền tố', a.nodes.length === 1 && a.nodes[0].name === 'a.md' && a.path === 'notes/' && S.docOf(a).real === true && S.docOf(a).rvPct === 30 && S.docOf(a).reviews.length === 1 && !('text' in a) && !('comments' in a) && !('rvPct' in a));
    check('normSession: phiên cũ không path → untitled.md, real false', b.nodes[0].name === 'untitled.md' && S.docOf(b).real === false && b.path === '' && c.nodes[0].name === 'untitled.md' && c.path === 'docs/');
    check('fileLabel: bằng path cũ', S.fileLabel(a, a.open) === 'notes/a.md' && S.fileLabel(b, b.open) === '' && S.fileLabel(w, w.open) === 'C:\\x\\a.md' && S.fileLabel(c, c.open) === 'docs/');
    check('normSession: không dùng được thì null', S.normSession(null, 'x') === null && S.normSession({ comments: [] }, 'x') === null && S.normSession('x', 'x') === null);
    const raw = {
      nodes: [null, { id: 'd', parent: null, kind: 'dir', name: 'docs' }, { id: 'a', parent: 'd', kind: 'file', name: 'a.md' },
        { id: 'a', parent: null, kind: 'file', name: 'dup-id.md' }, { id: 'x', kind: 'weird', name: 'x' }, { id: 'nodoc', parent: null, kind: 'file', name: 'n.md' },
        { id: 'o', parent: 'gone', kind: 'file', name: 'orphan.md' }, { id: 'p', parent: 'a', kind: 'file', name: 'under-file.md' },
        { id: 'q', parent: 'd', kind: 'file', name: 'A.MD' }, { id: 'r', parent: null, kind: 'file', name: '../bad' }, { id: 'e', parent: null, kind: 'dir', name: 'empty' }],
      docs: { a: { text: 'A', comments: [null, { quote: 'A', comment: 'c' }], reviews: 'x', rvPct: 'x', real: 1 }, o: { text: 'O' }, p: { text: 'P' }, q: { text: 'Q' }, r: { text: 'R' }, zz: { text: 'thừa' }, nodoc: { text: 5 } },
      open: 'gone', collapsed: ['d', 'd', 'a', 'nope', 'e'], promptAll: 'yes'
    };
    const n = S.normSession(raw, 'id');
    const paths = T.filesInOrder(n.nodes).map((id) => T.pathOf(n.nodes, id));
    check('normSession: bỏ nút hỏng, mồ côi về gốc, tên trùng / hỏng đổi', eq(paths, ['docs/A-2.MD', 'docs/a.md', 'orphan.md', 'under-file.md', 'untitled.md']), JSON.stringify(paths));
    check('normSession: docs khớp nodes, doc chuẩn hoá', eq(Object.keys(n.docs).sort(), ['a', 'o', 'p', 'q', 'r']) && n.docs.a.comments.length === 1 && eq(n.docs.a.reviews, []) && !('rvPct' in n.docs.a) && n.docs.a.real === false && n.docs.o.real === false);
    check('normSession: open hợp lệ, collapsed chỉ folder có thật, promptAll là boolean', n.open === 'q' && eq(n.collapsed, ['d', 'e']) && n.promptAll === false && n.id === 'id');
    const none = S.normSession({ nodes: [{ id: 'd', parent: null, kind: 'dir', name: 'd' }], docs: {} }, 'z');
    check('normSession: không còn file thì thêm untitled.md rỗng', S.fileCount(none) === 1 && S.docOf(none).text === '' && none.nodes.length === 2);
  }
  // Đổi cây: trả phiên mới, phiên cũ không đổi; docs luôn khớp nodes.
  {
    const s0 = S.createSession('# Một', {}), before = JSON.stringify(s0);
    const r1 = S.addFile(s0, null, 'untitled.md', 'Hai', false);
    const r2 = S.addDir(r1.s, null, 'docs');
    const r3 = S.addPaths(r2.s, r2.id, [{ path: 'x/y.md', text: 'Y' }, { path: 'z.md', text: '' }]);
    check('addFile / addDir / addPaths: không sửa phiên đầu vào', JSON.stringify(s0) === before && r1.s !== s0 && S.fileCount(r1.s) === 2);
    check('addFile: tên trùng tự đổi, doc mới', T.pathOf(r1.s.nodes, r1.id) === 'untitled-2.md' && r1.s.docs[r1.id].text === 'Hai' && r1.s.open === s0.open);
    check('addPaths: dưới folder, real true', T.pathOf(r3.s.nodes, r3.ids['x/y.md']) === 'docs/x/y.md' && r3.s.docs[r3.ids['x/y.md']].real === true && S.fileCount(r3.s) === 4);
    check('addFile: tên hỏng là lỗi, phiên giữ nguyên', S.addFile(s0, null, 'a/b', '', false).error !== '' && S.addFile(s0, null, 'a/b', '', false).s === s0);
    const x = r3.s.nodes.find((n) => n.name === 'x').id, y = r3.ids['x/y.md'];
    let s = S.toggleDir(r3.s, x);
    check('toggleDir: gập rồi mở', eq(s.collapsed, [x]) && eq(S.toggleDir(s, x).collapsed, []) && eq(r3.s.collapsed, []));
    s = S.openFile(S.toggleDir(s, r2.id), y);
    check('openFile: mở các folder chứa nó', s.open === y && eq(s.collapsed, []));
    const rn = S.renameIn(s0, s0.open, 'note.md');
    check('renameIn: file thành real, phiên cũ không đổi', S.docOf(rn.s).real === true && rn.s.nodes[0].name === 'note.md' && S.docOf(s0).real === false && rn.s.docs !== s0.docs);
    check('moveIn: trùng tên ở chỗ mới thì lỗi', /already exists/.test(S.moveIn(S.addFile(r3.s, r2.id, 'untitled.md', '', false).s, s0.open, r2.id).error));
    const rm = S.removeNodes(s, [r2.id]);
    check('removeNodes: xoá folder thì doc của file trong nó đi theo, file mở chuyển sang kế bên', rm.removed.length === 4 && Object.keys(rm.s.docs).length === 2 && rm.s.open === r1.id && !(y in rm.s.docs) && s.docs[y]);
    const all = S.removeNodes(r1.s, [r1.s.nodes[0].id, r1.id]);
    check('removeNodes: xoá hết file thì còn untitled.md rỗng', S.fileCount(all.s) === 1 && S.docOf(all.s).text === '' && all.s.nodes[0].name === 'untitled.md');
  }
  // Tên tự đặt, phiên trống, index, file cho .zip.
  {
    const e = S.createSession('', {});
    check('isEmpty: phiên mới trống; có folder hay chữ thì không', S.isEmpty(e) && !S.isEmpty(S.addDir(e, null, 'd').s) && !S.isEmpty(S.createSession('x', {})));
    const one = S.addPaths(S.createSession('', {}), null, [{ path: 'proj/a.md', text: '# A' }]).s;
    const onlyDir = S.removeNodes(one, [one.nodes[0].id]).s;
    check('autoName: gốc chỉ một folder thì tên folder', S.autoName(onlyDir) === 'proj' && S.autoName(one) === 'A');
    const two = S.addFile(S.createSession('', {}), null, 'b.md', '## Thứ hai', true).s;
    check('autoName: file mở rỗng thì file đầu có chữ; không có chữ thì Untitled session', S.autoName(two) === 'Thứ hai' && S.autoName(e) === 'Untitled session');
    let s = S.addFile(S.createSession('x'.repeat(100), {}), null, 'b.md', 'y'.repeat(300), true).s;
    s = S.addFile(s, null, 'c.md', 'z', true).s;
    const byName = (nm) => s.docs[s.nodes.find((n) => n.name === nm).id];
    byName('untitled.md').rvPct = 100; byName('b.md').rvPct = 0; byName('b.md').comments.push({ id: 'k' });
    const ent = S.indexWith([], s)[0];
    check('indexWith: files, chars, count tổng; rv bình quân theo độ dài mọi file có chữ, file chưa có rvPct là 0%', ent.files === 3 && ent.chars === 401 && ent.count === 1 && ent.rv === 24, JSON.stringify(ent));
    S.touchSession(s);
    check('touchSession: tên tự đặt từ file đầu theo thứ tự cây, không từ file mở', s.name === 'y'.repeat(60) && S.sessionTitle(s) === 'y'.repeat(60));
    const z = S.addDir(S.addPaths(S.createSession('', {}), null, [{ path: 'd/a.md', text: 'A' }]).s, null, 'rỗng').s;
    check('treeFiles: file theo thứ tự cây, folder rỗng có /', eq(S.treeFiles(z).map((f) => f.path), ['d/a.md', 'untitled.md', 'rỗng/']));
  }

  // Prompt nhiều file: thứ tự cây, số chạy tiếp, nhãn tiền tố + đường dẫn, file không nhận xét bị bỏ.
  {
    const TA = '# A\n\nMột dòng.\nHai dòng.\n', TB = 'Đầu B.\n\nCuối B.\n', TC = 'Không nhận xét.\n';
    const cm = (id, text, q, comment) => { const i = text.indexOf(q); return Object.assign({ id, comment, created: 0 }, quoteFrom(text, i, i + q.length, 'src', q)); };
    const s = S.normSession({ name: '', header: '', footer: '', fmt: 'inline', includeDoc: false, lineNums: true, path: 'repo', rvPrompt: false, promptAll: true,
      nodes: [N('c', null, 'file', 'c.md'), N('d', null, 'dir', 'docs'), N('b', 'd', 'file', 'B.md'), N('a', 'd', 'file', 'a.md')],
      docs: { a: { text: TA, comments: [cm('a1', TA, 'Hai dòng.', 'Sửa A')] }, b: { text: TB, comments: [cm('b2', TB, 'Cuối B.', 'Sửa B2'), cm('b1', TB, 'Đầu B.', 'Sửa B1')] }, c: { text: TC, comments: [] } },
      open: 'c' }, 'm');
    const list = (o = {}) => ['c', 'b', 'a'].map((id) => ({ fileId: id, doc: s.docs[id], d: Object.assign(anchorAll(s.docs[id].comments, s.docs[id].text, ''), o[id] ? { review: o[id] } : {}) }));
    const note = 'Vị trí ghi dạng tệp:dòng, tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.';
    const got = P.buildPromptAll(s, list());
    check('buildPromptAll: gọn', got === note + '\n\n## Tệp repo/docs/a.md\n\n1. repo/docs/a.md:4 "Hai dòng." — Sửa A\n\n## Tệp repo/docs/B.md\n\n2. repo/docs/B.md:1 "Đầu B." — Sửa B1\n3. repo/docs/B.md:3 "Cuối B." — Sửa B2', JSON.stringify(got));
    const blk = P.buildPromptAll(Object.assign({}, s, { fmt: 'block', header: 'Đầu', footer: 'Cuối' }), list());
    check('buildPromptAll: khối, lời dẫn', blk === 'Đầu\n' + note + '\n\n## Tệp repo/docs/a.md\n\n### 1 · repo/docs/a.md:4\n> Hai dòng.\n\nSửa A\n\n## Tệp repo/docs/B.md\n\n### 2 · repo/docs/B.md:1\n> Đầu B.\n\nSửa B1\n\n### 3 · repo/docs/B.md:3\n> Cuối B.\n\nSửa B2\n\nCuối', JSON.stringify(blk));
    const rv = P.buildPromptAll(Object.assign({}, s, { rvPrompt: true }), list({ a: { done: [[1, 2]], todo: [[4, 4]] }, c: { done: [[1, 1]], todo: [] } }));
    check('buildPromptAll: dòng đã đọc theo file, file chỉ có dòng đã đọc vẫn vào', rv === note + '\n\n## Tệp repo/docs/a.md\n\nĐã đọc kỹ: repo/docs/a.md:1-2; chỗ nào không có nhận xét là ổn. Chưa đọc: repo/docs/a.md:4.\n\n1. repo/docs/a.md:4 "Hai dòng." — Sửa A\n\n## Tệp repo/docs/B.md\n\n2. repo/docs/B.md:1 "Đầu B." — Sửa B1\n3. repo/docs/B.md:3 "Cuối B." — Sửa B2\n\n## Tệp repo/c.md\n\nĐã đọc kỹ: repo/c.md:1; chỗ nào không có nhận xét là ổn.', JSON.stringify(rv));
    const off = P.buildPromptAll(Object.assign({}, s, { lineNums: false, rvPrompt: true }), list({ c: { done: [[1, 1]], todo: [] } }));
    check('buildPromptAll: tắt số dòng thì không nhãn, không câu dẫn, vẫn có tên tệp', off === '## Tệp repo/docs/a.md\n\n1. "Hai dòng." — Sửa A\n\n## Tệp repo/docs/B.md\n\n2. "Đầu B." — Sửa B1\n3. "Cuối B." — Sửa B2', JSON.stringify(off));
    const full = P.buildPromptAll(Object.assign({}, s, { includeDoc: true }), list());
    check('buildPromptAll: kèm toàn văn mọi file có chữ, theo thứ tự cây', full.endsWith('3. repo/docs/B.md:3 "Cuối B." — Sửa B2\n\nVăn bản gốc của repo/docs/a.md:\n```markdown\n# A\n\nMột dòng.\nHai dòng.\n```\n\nVăn bản gốc của repo/docs/B.md:\n```markdown\nĐầu B.\n\nCuối B.\n```\n\nVăn bản gốc của repo/c.md:\n```markdown\nKhông nhận xét.\n```'), JSON.stringify(full));
    check('buildPromptAll: không nhận xét, không toàn văn thì rỗng', P.buildPromptAll(s, [list()[0]]) === '');
    check('buildPrompt một file trong phiên nhiều file: nhãn tệp', P.buildPrompt(s, s.docs.a, list()[2].d, 'a') === note + '\n\n1. repo/docs/a.md:4 "Hai dòng." — Sửa A');
    check('promptsAll / optionsSummary', P.promptsAll(s) && !P.promptsAll(Object.assign({}, s, { promptAll: false })) && P.optionsSummary(s) === 'compact · all files · line numbers' && P.optionsSummary(Object.assign({}, s, { promptAll: false })) === 'compact · repo/c.md');
    // Phiên một file: gom hay không cũng y hệt buildPrompt.
    const one = S.normSession({ text: TA, comments: [cm('a1', TA, 'Hai dòng.', 'Sửa A')], path: 'x/a.md', promptAll: true }, 'o');
    const d1 = anchorAll(S.docOf(one).comments, TA, '');
    check('buildPromptAll: phiên một file y hệt buildPrompt', !P.promptsAll(one) && P.buildPromptAll(one, [{ fileId: one.open, doc: S.docOf(one), d: d1 }]) === P.buildPrompt(one, S.docOf(one), d1) && P.buildPrompt(one, S.docOf(one), d1) === 'Vị trí ghi dạng tệp:dòng, tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.\n\n1. x/a.md:4 "Hai dòng." — Sửa A');
    // Phiên cũ đủ mọi tuỳ chọn: prompt sau khi nâng y hệt từng byte (chuỗi chép từ bản trước khi có cây).
    const legacy = { text: TA, comments: [cm('a1', TA, 'Hai dòng.', 'Sửa A')], path: ' C:\\x\\a.md ', fmt: 'block', header: 'H', footer: 'F', includeDoc: true, rvPrompt: true, lineNums: true, name: 'Tên', named: true };
    const dl = Object.assign(anchorAll(legacy.comments, TA, ''), { review: { done: [[1, 1]], todo: [[3, 4]] } });
    const ul = S.normSession(JSON.parse(JSON.stringify(legacy)), 'l');
    check('phiên cũ nâng lên: prompt, tóm tắt, tên tải về y hệt', P.buildPrompt(ul, S.docOf(ul), dl) === 'H\nVị trí ghi dạng tệp:dòng, tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.\nĐã đọc kỹ: C:\\x\\a.md:1; chỗ nào không có nhận xét là ổn. Chưa đọc: C:\\x\\a.md:3-4.\n\n### 1 · C:\\x\\a.md:4\n> Hai dòng.\n\nSửa A\n\nF\n\nVăn bản gốc:\n```markdown\n# A\n\nMột dòng.\nHai dòng.\n```' &&
      P.optionsSummary(ul) === 'block · C:\\x\\a.md · full text · reviewed · header' && P.exportName(ul) === 'ten-comments.md', JSON.stringify(P.buildPrompt(ul, S.docOf(ul), dl)));
  }

  // ZIP: CRC-32, cấu trúc đọc lại bằng JS, và bằng zipfile của Python (công cụ thật).
  {
    check('crc32: vector chuẩn', Z.crc32(new TextEncoder().encode('123456789')) === 0xCBF43926 && Z.crc32(new Uint8Array(0)) === 0);
    const files = [{ path: 'docs/a.md', text: 'Xin chào\n' }, { path: 'Tài liệu/ghi chú.md', text: '# Đầu\n' + 'x'.repeat(1000) }, { path: 'rỗng/', text: '' }, { path: 'e.md', text: '' }];
    const z = Z.zipFiles(files, new Date(2024, 0, 2, 3, 4, 6));
    const v = new DataView(z.buffer, z.byteOffset, z.byteLength), dec = new TextDecoder();
    const end = z.length - 22, cnt = v.getUint16(end + 10, true), cdSize = v.getUint32(end + 12, true), cd = v.getUint32(end + 16, true);
    let o = cd; const seen = [];
    for (let i = 0; i < cnt; i++) {
      const flags = v.getUint16(o + 8, true), method = v.getUint16(o + 10, true), crc = v.getUint32(o + 16, true), size = v.getUint32(o + 20, true);
      const nl = v.getUint16(o + 28, true), at = v.getUint32(o + 42, true), name = dec.decode(z.subarray(o + 46, o + 46 + nl));
      const lnl = v.getUint16(at + 26, true), data = z.subarray(at + 30 + lnl, at + 30 + lnl + size);
      seen.push({ ok: v.getUint32(o, true) === 0x02014B50 && v.getUint32(at, true) === 0x04034B50 && flags === 0x0800 && method === 0 && Z.crc32(data) === crc, name, text: dec.decode(data) });
      o += 46 + nl;
    }
    check('zipFiles: đọc lại bằng JS', v.getUint32(end, true) === 0x06054B50 && cnt === 4 && o === cd + cdSize && seen.every((x) => x.ok) && eq(seen.map((x) => [x.name, x.text]), files.map((f) => [f.path, f.text])), JSON.stringify(seen));
    const { spawnSync } = await import('node:child_process');
    const py = 'import sys, io, json, zipfile\nz = zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))\n' +
      'print(json.dumps({"bad": z.testzip(), "names": z.namelist(), "texts": [z.read(n).decode("utf-8") for n in z.namelist()], "dt": list(z.infolist()[0].date_time), "utf8": all(i.flag_bits & 0x800 for i in z.infolist()), "dirs": [i.is_dir() for i in z.infolist()]}))';
    const r = spawnSync('python3', ['-I', '-c', py], { input: Buffer.from(z) });
    let res = null; try { res = JSON.parse(r.stdout.toString()); } catch (e) { /* in lỗi bên dưới */ }
    check('zipFiles: Python zipfile đọc được, CRC đúng, tên UTF-8, giờ, folder rỗng', res && res.bad === null && eq(res.names, files.map((f) => f.path)) && eq(res.texts, files.map((f) => f.text)) && eq(res.dt, [2024, 1, 2, 3, 4, 6]) && res.utf8 && eq(res.dirs, [false, false, true, false]), r.stderr.toString() + r.stdout.toString());
    const s = S.addPaths(S.createSession('', {}), null, [{ path: 'a/b.md', text: 'B' }]).s;
    check('zipOf: cả cây', dec.decode(S.zipOf(s, new Date(2024, 0, 1)).subarray(30, 30 + 6)) === 'a/b.md');
  }
}
// ── nối cây vào giao diện: mở file từ đĩa, nạp folder, tải một folder, Undo ──
{
  const T = await import('../js/core/tree.js');
  const S = await import('../js/core/session.js');
  const X = await import('../js/core/text.js');
  let k = 0; const mk = (kind) => kind[0] + (++k);
  const byName = (s, name) => s.nodes.find((n) => n.name === name);
  const paths = (s) => T.filesInOrder(s.nodes).map((id) => T.pathOf(s.nodes, id));
  {
    const r = T.fromPaths([], null, ['a/empty/', 'a/b.md', 'a/empty/'], mk);
    check('fromPaths: đường dẫn kết thúc / chỉ dựng folder, không vào ids, không trùng', eq(r.nodes.map((n) => n.kind + ':' + n.name), ['dir:a', 'dir:empty', 'file:b.md']) && eq(Object.keys(r.ids), ['a/b.md']), JSON.stringify(r));
  }
  // Mở file từ đĩa (MDAN-024): file đang mở trống thì điền, không thì thêm cạnh nó.
  {
    const s0 = S.createSession('', {});
    const a = S.openFromDisk(s0, 'ghi-chu.md', '# G\n');
    check('openFromDisk: phiên trống — điền file đang mở, tên thật, phiên mang tên file', !a.added && a.id === s0.open && a.s.nodes.length === 1 && a.s.nodes[0].name === 'ghi-chu.md' && S.docOf(a.s).text === '# G\n' && S.docOf(a.s).real && a.s.name === 'ghi-chu' && a.s.named && S.docOf(s0).text === '', JSON.stringify(a.s));
    let s1 = S.addPaths(S.createSession('', {}), null, [{ path: 'docs/a.md', text: 'A' }]).s;
    s1 = S.openFile(s1, T.filesInOrder(s1.nodes)[0]);
    const docs = byName(s1, 'docs').id;
    const b = S.openFromDisk(s1, 'a.md', 'B');
    check('openFromDisk: file đang mở có chữ — thêm cạnh nó (cùng folder), tên tránh trùng, mở file mới', b.added && b.s.open === b.id && S.dirOf(b.s, b.id) === docs && eq(paths(b.s), ['docs/a-2.md', 'docs/a.md', 'untitled.md']) && S.docOf(b.s).text === 'B' && !b.s.named, JSON.stringify(paths(b.s)));
    const c = S.openFromDisk(S.openFile(b.s, byName(b.s, 'untitled.md').id), 'x.md', 'X');
    check('openFromDisk: file trống trong phiên nhiều file — điền, không đổi tên phiên', !c.added && byName(c.s, 'x.md') && c.s.nodes.length === b.s.nodes.length && !c.s.named, JSON.stringify(paths(c.s)));
    const d = S.openFromDisk(s0, 'a/b', 'z');
    check('openFromDisk: tên hỏng thì giữ untitled.md', d.s.nodes[0].name === 'untitled.md' && S.docOf(d.s).text === 'z');
  }
  // Nạp folder (MDAN-022): phiên trống thì thay nội dung, không thì nạp dưới folder đích và mở folder ấy ra.
  {
    const items = [{ path: 'notes/a.md', text: 'A' }, { path: 'notes/sub/deep/b.md', text: 'B' }, { path: 'notes/empty/', text: '' }];
    const r = S.importPaths(S.createSession('', {}), null, items);
    S.touchSession(r.s);
    check('importPaths: phiên trống — folder nạp là cả phiên, mở file nông nhất, tên phiên là tên folder', r.files === 2 && r.skipped === 0 && eq(paths(r.s), ['notes/sub/deep/b.md', 'notes/a.md']) && r.s.open === r.ids['notes/a.md'] && r.s.name === 'notes' && !!byName(r.s, 'empty') && S.normSession(JSON.parse(JSON.stringify(r.s)), r.s.id).nodes.length === r.s.nodes.length, JSON.stringify(paths(r.s)));
    let s = S.addDir(S.createSession('text', {}), null, 'inbox').s;
    const inbox = byName(s, 'inbox').id, open = s.open;
    s = S.toggleDir(s, inbox);
    const r2 = S.importPaths(s, inbox, items);
    check('importPaths: phiên có chữ — nạp dưới folder đích, folder ấy mở ra, file mở giữ nguyên', r2.files === 2 && r2.s.open === open && r2.s.collapsed.indexOf(inbox) < 0 && eq(paths(r2.s), ['inbox/notes/sub/deep/b.md', 'inbox/notes/a.md', 'untitled.md']), JSON.stringify(paths(r2.s)));
    const r3 = S.importPaths(S.createSession('', {}), null, [{ path: 'only/', text: '' }]);
    check('importPaths: phiên trống, chỉ folder rỗng — giữ file trống', r3.files === 0 && S.fileCount(r3.s) === 1 && !!byName(r3.s, 'only'));
  }
  // Tải một folder: đường dẫn tính từ folder cha của nó; gập hết; mở ra; Undo giữ chữ sửa sau ảnh chụp.
  {
    let s = S.addPaths(S.createSession('', {}), null, [{ path: 'p/notes/a.md', text: 'A' }, { path: 'p/notes/x/', text: '' }, { path: 'p/z.md', text: 'Z' }]).s;
    const notes = byName(s, 'notes').id;
    check('treeFiles(folder): đường dẫn từ folder cha, giữ folder rỗng, bỏ file ngoài', eq(S.treeFiles(s, notes), [{ path: 'notes/a.md', text: 'A' }, { path: 'notes/x/', text: '' }]), JSON.stringify(S.treeFiles(s, notes)));
    const z = S.zipOf(s, new Date(2024, 0, 1), notes);
    check('zipOf(folder): mục đầu là notes/a.md', new TextDecoder().decode(z.subarray(30, 30 + 10)) === 'notes/a.md');
    const all = S.collapseAll(s);
    check('collapseAll: mọi folder gập, phiên đầu vào không đổi', all.collapsed.length === 3 && s.collapsed.length === 0);
    const rv = S.reveal(all, byName(s, 'a.md').id);
    check('reveal: mở các folder chứa nút', eq(rv.collapsed, [byName(s, 'x').id]) && S.reveal(all, notes, true).collapsed.indexOf(notes) < 0);
    s = S.openFile(s, byName(s, 'a.md').id);
    const snap = s, rm = S.removeNodes(s, [notes]), del = rm.s;
    S.docOf(del, byName(s, 'z.md').id).text = 'Z sửa sau';
    const back = S.applyUndo(Object.assign({}, del, { header: 'H' }), rm.undo).s;
    check('applyUndo (xoá): cây, file mở về như trước; chữ sửa sau và tuỳ chọn giữ', eq(paths(back), paths(snap)) && back.open === snap.open && S.docOf(back, byName(s, 'z.md').id).text === 'Z sửa sau' && S.docOf(back).text === 'A' && back.header === 'H');
    check('dirOf: folder chứa, gốc là null', S.dirOf(s, byName(s, 'a.md').id) === notes && S.dirOf(s, byName(s, 'p').id) === null && S.dirOf(s, 'không có') === null);
  }
  check('importCheck: ẩn / node_modules bỏ không đếm, folder chọn ẩn vẫn nạp; ảnh, > 1 MB bỏ có đếm',
    X.importCheck('r/.git/x.md', '', 1) === 'ignore' && X.importCheck('r/node_modules/a.md', '', 1) === 'ignore' && X.importCheck('.cfg/a.md', '', 1) === '' &&
    X.importCheck('r/a.png', 'image/png', 1) === 'skip' && X.importCheck('r/a.md', '', X.MAX_IMPORT + 1) === 'skip' && X.importCheck('r/a.md', '', X.MAX_IMPORT) === '' && X.importCheck('.env', '', 1) === 'ignore');
}
// ── Undo chỉ trả lại mục ấy (MDAN-028), nhãn, tên tự đặt, luật nạp, chỗ chuyển, tải về ──
{
  const T = await import('../js/core/tree.js');
  const S = await import('../js/core/session.js');
  const X = await import('../js/core/text.js');
  const P = await import('../js/core/prompt.js');
  const C = await import('../js/core/comments.js');
  const byName = (s, name) => s.nodes.find((n) => n.name === name);
  const paths = (s) => T.filesInOrder(s.nodes).map((id) => T.pathOf(s.nodes, id));
  // Xoá rồi làm thêm việc (file mới, đổi tên, gõ chữ), Undo: chỉ file đã xoá quay lại, việc sau còn nguyên.
  {
    let s = S.createSession('A text', {});
    const b = S.addFile(s, null, 'b.md', 'B text', true); s = b.s;
    const rm = S.removeNodes(s, [b.id]); s = rm.s;
    const c = S.addFile(s, null, 'new.md', 'typed new work', true); s = S.openFile(c.s, c.id);
    s = S.renameIn(s, byName(s, 'untitled.md').id, 'renamed.md').s;
    const u = S.applyUndo(s, rm.undo);
    check('applyUndo (xoá): việc làm sau vẫn còn, file xoá quay lại', eq(paths(u.s).sort(), ['b.md', 'new.md', 'renamed.md']) && S.docOf(u.s, c.id).text === 'typed new work' && S.docOf(u.s, b.id).text === 'B text' && u.id === b.id && u.s.open === c.id, JSON.stringify(paths(u.s)));
    check('applyUndo: không sửa phiên đầu vào, Undo lần hai không làm gì', paths(s).length === 2 && S.applyUndo(u.s, rm.undo).s === u.s);
  }
  // Xoá folder chứa file mở; folder cha đã mất thì về gốc; tên trùng thì đổi; folder gập giữ; file mở trở lại.
  {
    let s = S.addPaths(S.createSession('', {}), null, [{ path: 'p/d/a.md', text: 'A' }, { path: 'p/d/sub/b.md', text: 'B' }, { path: 'x.md', text: 'X' }]).s;
    s = S.removeNodes(s, [s.open]).s;   // bỏ untitled.md
    const d = byName(s, 'd').id, sub = byName(s, 'sub').id;
    s = S.openFile(s, byName(s, 'a.md').id); s = S.toggleDir(s, sub);
    const rm = S.removeNodes(s, [d]);
    let cur = S.removeNodes(rm.s, [byName(rm.s, 'p').id]).s;   // folder cha cũng bị xoá sau đó
    cur = S.addDir(cur, null, 'd').s;                            // một folder mới cùng tên ở gốc
    const u = S.applyUndo(cur, rm.undo).s;
    check('applyUndo (xoá): cha mất thì về gốc, trùng tên thành d-2, cây con nguyên, gập giữ, mở lại file cũ', eq(paths(u), ['d-2/sub/b.md', 'd-2/a.md', 'x.md']) && u.open === byName(s, 'a.md').id && u.collapsed.indexOf(sub) >= 0 && !!byName(u, 'd'), JSON.stringify(paths(u)));
  }
  // Xoá file cuối cùng: phiên có untitled.md trống; Undo bỏ nó nếu còn trống, giữ nếu đã gõ chữ.
  {
    const s = S.addFile(S.createSession('', {}), null, 'only.md', 'quý', true);
    const s1 = S.removeNodes(s.s, [s.s.open]).s;
    const rm = S.removeNodes(s1, [s.id]);
    check('removeNodes: xoá file cuối thì có untitled.md, undo ghi lại nó', S.fileCount(rm.s) === 1 && rm.undo.added === rm.s.open);
    const u1 = S.applyUndo(rm.s, rm.undo).s;
    check('applyUndo: untitled.md thêm khi xoá còn trống thì bỏ', eq(paths(u1), ['only.md']) && u1.open === s.id && S.docOf(u1).text === 'quý');
    const typed = Object.assign({}, rm.s, { docs: Object.assign({}, rm.s.docs, { [rm.s.open]: { text: 'mới', comments: [], reviews: [], real: false } }) });
    check('applyUndo: untitled.md đã có chữ thì giữ', eq(paths(S.applyUndo(typed, rm.undo).s), ['only.md', 'untitled.md']));
  }
  // Chuyển: Undo về folder cũ; chỉ nút ấy; folder cũ mất thì về gốc; trùng tên thì đổi; nút đã xoá thì thôi.
  {
    let s = S.addPaths(S.createSession('', {}), null, [{ path: 'a/f.md', text: 'F' }, { path: 'b/g.md', text: 'G' }]).s;
    const a = byName(s, 'a').id, b = byName(s, 'b').id, f = byName(s, 'f.md').id;
    const mv = S.moveIn(s, f, b);
    check('moveIn: undo ghi folder cũ; chuyển về chỗ cũ thì không có undo', mv.undo.kind === 'move' && mv.undo.parent === a && S.moveIn(s, f, a).undo === null);
    let cur = S.renameIn(mv.s, byName(mv.s, 'g.md').id, 'g2.md').s;
    let u = S.applyUndo(cur, mv.undo).s;
    check('applyUndo (chuyển): về folder cũ, đổi tên làm sau giữ', eq(paths(u), ['a/f.md', 'b/g2.md', 'untitled.md']), JSON.stringify(paths(u)));
    cur = S.addFile(mv.s, a, 'f.md', 'khác', true).s;
    check('applyUndo (chuyển): trùng tên ở folder cũ thì f-2.md', eq(paths(S.applyUndo(cur, mv.undo).s), ['a/f-2.md', 'a/f.md', 'b/g.md', 'untitled.md']));
    cur = S.removeNodes(mv.s, [a]).s;
    check('applyUndo (chuyển): folder cũ mất thì về gốc; nút mất thì không làm gì', eq(paths(S.applyUndo(cur, mv.undo).s), ['b/g.md', 'f.md', 'untitled.md']) && S.applyUndo(S.removeNodes(mv.s, [f]).s, mv.undo).id === '');
  }
  // Phiên cũ: path không tách được thành tên file — nhãn y hệt bản một văn bản (so với chuỗi của bản cũ).
  {
    const text = '# T\n\nhello world line\n\nsecond para here\n';
    const legacy = (path) => ({ text, comments: [{ id: 'c1', quote: 'hello world', comment: 'fix', prefix: '', suffix: '', origin: 'src', rel: 0.1 }], path, header: '', footer: '', fmt: 'inline', lineNums: true, includeDoc: false, reviews: [], rvPrompt: false, named: false, name: '', created: 1, updated: 1 });
    const NOTE = 'Vị trí ghi dạng tệp:dòng, tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.\n\n1. ';
    const long = 'x/' + 'y'.repeat(300);
    const got = ['docs/', '.', '..', 'C:\\work\\', long, ' docs/a.md ', 'a/b/c'].map((p) => {
      const n = S.normSession(JSON.parse(JSON.stringify(legacy(p))), 'x'), d = S.docOf(n);
      return P.buildPrompt(n, d, C.anchorAll(d.comments, d.text, ''));
    });
    const want = ['docs/', '.', '..', 'C:\\work\\', long, 'docs/a.md', 'a/b/c'].map((l) => NOTE + l + ':3 "hello world" — fix');
    check('phiên cũ: path docs/, ., .., C:\\work\\, > 255 ký tự — prompt y hệt bản cũ', eq(got, want), JSON.stringify(got.filter((g, i) => g !== want[i])));
    const n = S.normSession(JSON.parse(JSON.stringify(legacy('docs/'))), 'x');
    check('phiên cũ legacy: ô Folder giữ nguyên văn, sửa ô thì nhãn theo; thêm file thì về luật cây', n.path === 'docs/' && S.fileLabel(Object.assign({}, n, { path: 'repo/' }), n.open) === 'repo/' && S.fileLabel(S.addFile(n, null, 'b.md', '', true).s, n.open) === 'docs/untitled.md');
    const again = S.normSession(JSON.parse(JSON.stringify(n)), 'x');
    check('phiên cũ legacy: lưu rồi đọc lại vẫn giữ; đổi tên file thì thôi', S.docOf(again).legacy === true && S.fileLabel(S.renameIn(n, n.open, 'a.md').s, n.open) === 'docs/a.md');
  }
  // File dán chữ (chưa tên thật) trong phiên một file: không nhãn tệp dù ô Folder có chữ (MDAN-029).
  {
    const s = Object.assign(S.createSession('# T\n\nhello\n', {}), { path: 'docs' });
    check('fileLabel: một file chưa có tên thật — rỗng dù có Folder; tên thật hay hai file thì có tiền tố', S.fileLabel(s, s.open) === '' && P.optionsSummary(s) === 'compact · line numbers' &&
      S.fileLabel(S.renameIn(s, s.open, 'a.md').s, s.open) === 'docs/a.md' && S.fileLabel(S.addFile(s, null, 'b.md', '', false).s, s.open) === 'docs/untitled.md');
  }
  // Tên tự đặt không theo file đang mở (MDAN-027).
  {
    let s = S.createSession('# Alpha', {});
    const b = S.addFile(s, null, 'b.md', '# Beta', true); s = b.s;
    check('autoName: không đổi khi đổi file mở; file đầu theo thứ tự cây có chữ', S.autoName(s) === 'Beta' && S.autoName(S.openFile(s, b.id)) === 'Beta' && S.sessionTitle(S.createSession('', {})) === '' && S.sessionTitle(Object.assign({}, s, { named: true, name: 'Tên' })) === 'Tên');
  }
  // Mở file từ đĩa: file trống có tên thật (người dùng đặt) không bị ghi đè, file mới vào cạnh nó.
  {
    let s = S.createSession('# A', {});
    const n = S.addFile(s, null, 'untitled.md', '', false); s = S.openFile(n.s, n.id);
    s = S.renameIn(s, n.id, 'spec.md').s;
    const r = S.openFromDisk(s, 'readme.md', '# R');
    check('openFromDisk: file mở trống nhưng có tên thật — thêm cạnh, spec.md giữ tên', r.added && !!byName(r.s, 'spec.md') && !!byName(r.s, 'readme.md') && S.openFromDisk(s, '  x.md ', 'X').s.nodes.some((x) => x.name === 'x.md'));
  }
  // Luật file chữ (MDAN-030), mục bỏ qua, tên có dấu cách.
  {
    check('isTextFile: theo đuôi trước kiểu (.ts dù video/mp2t), tên quen không đuôi, text/*; nhị phân không rõ kiểu thì không',
      X.isTextFile('app.ts', 'video/mp2t') && X.isTextFile('a.PY', '') && X.isTextFile('Makefile', '') && X.isTextFile('x.weird', 'text/x-weird') &&
      !X.isTextFile('blob.dat', '') && !X.isTextFile('logo.png', 'image/png') && !X.isTextFile('noext', ''));
    check('isTextFile: theo sổ ngôn ngữ (langOf) — mọi đuôi được tô màu cũng nạp được (.gemspec, .plist, .xsd, .edn, .h++, Dockerfile)',
      ['a.gemspec', 'Info.plist', 's.xsd', 'deps.edn', 'x.h++', 'Dockerfile', 'notes.mdx', 'a.csv'].every((n) => X.isTextFile(n, '')));
    check('hasNul: NUL trong 8 KB đầu', X.hasNul('\u0000\u0001PK') && !X.hasNul('chữ') && !X.hasNul('x'.repeat(9000) + '\u0000'));
    check('importCheck: .ts nạp, .dat không rõ kiểu bỏ có đếm, file tên node_modules không phải folder', X.importCheck('r/app.ts', 'video/mp2t', 1) === '' && X.importCheck('r/blob.dat', '', 1) === 'skip' && X.importCheck('r/node_modules', 'text/plain', 1) === '');
    check('skipEntry: tên ẩn, folder node_modules', X.skipEntry('.git', true) && X.skipEntry('.DS_Store', false) && X.skipEntry('node_modules', true) && !X.skipEntry('src', true));
    check('nameError: dấu cách đầu / cuối là lỗi', /space/.test(T.nameError([], null, ' x.md')) && /space/.test(T.nameError([], null, 'x.md ')) && T.nameError([], null, 'a b.md') === '');
    const r = S.importPaths(S.createSession('x', {}), null, [{ path: 'a /b.md', text: 'x' }, { path: 'a/c.md', text: 'y' }, { path: ' /d.md', text: 'z' }, { path: 'e/ f.md ', text: 'w' }]);
    check('importPaths: đoạn bỏ dấu cách đầu / cuối, đoạn chỉ dấu cách thì bỏ và đếm', eq(paths(r.s), ['a/b.md', 'a/c.md', 'e/f.md', 'untitled.md']) && r.files === 3 && r.skipped === 1, JSON.stringify([paths(r.s), r.skipped]));
    const g = S.importPaths(S.createSession('x', {}), 'không có', [{ path: 'q/w.md', text: 'w' }]);
    check('importPaths: folder đích không còn thì nạp ở gốc', eq(paths(g.s), ['q/w.md', 'untitled.md']) && g.files === 1);
  }
  // File mở đầu sau khi nạp folder vào phiên trống (MDAN-031).
  {
    const open = (items) => { const r = S.importPaths(S.createSession('', {}), null, items.map((p) => ({ path: p, text: p }))); return T.pathOf(r.s.nodes, r.s.open); };
    check('firstFile: file nông nhất, README trước index, rồi thứ tự hiển thị', open(['proj/a/b/deep.md', 'proj/notes.txt', 'proj/readme.md']) === 'proj/readme.md' &&
      open(['p/z.md', 'p/index.html', 'p/README']) === 'p/README' && open(['p/z.md', 'p/index.md']) === 'p/index.md' && open(['p/sub/x.md', 'p/b.md', 'p/a.md']) === 'p/a.md' && T.firstFile([]) === null);
  }
  // Chỗ chuyển: vòng và trùng tên cùng một luật (canMove) cho kéo thả và Move to….
  {
    const N = (id, parent, kind, name) => ({ id, parent, kind, name });
    const nodes = [N('d', null, 'dir', 'docs'), N('r', 'd', 'file', 'readme.md'), N('s', 'd', 'dir', 'sub'), N('t', null, 'file', 'readme.md'), N('e', null, 'dir', 'empty')];
    check('canMove: trùng tên, vào chính nó / hậu duệ, cùng chỗ thì không', !T.canMove(nodes, 't', 'd') && T.canMove(nodes, 't', 's') && !T.canMove(nodes, 'd', 's') && !T.canMove(nodes, 'd', 'd') && !T.canMove(nodes, 't', null) && T.canMove(nodes, 'r', null) === false && T.canMove(nodes, 's', null));
    const mt = T.moveTargets(nodes, 't').map((x) => (x.name || 'Top') + ':' + x.depth + (x.ok ? '' : 'x'));
    check('moveTargets: gốc rồi folder theo thứ tự, trừ chính nó / hậu duệ, ok theo canMove', eq(mt, ['Top:0x', 'docs:1x', 'sub:2', 'empty:1']) && eq(T.moveTargets(nodes, 'd').map((x) => x.name), ['', 'empty']), JSON.stringify(mt));
  }
  // Thêm folder / file trong folder đang gập: folder ấy mở ra (thấy hàng mới, đổi tên tại chỗ được).
  {
    let s = S.addDir(S.createSession('x', {}), null, 'a').s;
    const a = byName(s, 'a').id;
    s = S.toggleDir(s, a);
    check('addDir / addFile: folder cha đang gập thì mở ra', S.addDir(s, a, 'folder').s.collapsed.indexOf(a) < 0 && S.addFile(s, a, 'n.md', '', false).s.collapsed.indexOf(a) < 0 && s.collapsed.indexOf(a) >= 0);
  }
  // Tên và kiểu file tải về; câu hỏi dùng chung với giao diện.
  {
    const s = S.addPaths(Object.assign(S.createSession('', {}), { name: 'Tên phiên', named: true }), null, [{ path: 'd/a.md', text: 'A' }, { path: 'd/NOTES', text: 'N' }, { path: 'd/x.txt', text: 'X' }]).s;
    const dn = (nm) => S.downloadOf(s, nm == null ? null : byName(s, nm).id);
    check('downloadOf: file giữ tên (thiếu đuôi thêm .md), kiểu theo đuôi; folder / cả phiên .zip', eq(dn('a.md'), { name: 'a.md', type: 'text/markdown;charset=utf-8', zip: false }) && dn('NOTES').name === 'NOTES.md' && /markdown/.test(dn('NOTES').type) && /^text\/plain/.test(dn('x.txt').type) &&
      eq(dn('d'), { name: 'd.zip', type: 'application/zip', zip: true }) && dn(null).name === 'ten-phien.zip', JSON.stringify([dn('NOTES'), dn(null)]));
    const t = S.addPaths(S.createSession('', {}), null, [{ path: 'Makefile', text: 'all:' }, { path: 'Dockerfile', text: 'FROM x' }, { path: 'p.mdx', text: '# P' }, { path: 'a.py', text: '' }]).s;
    const dt = (nm) => { const f = S.downloadOf(t, byName(t, nm).id); return f.name + ' ' + f.type.split(';')[0]; };
    check('downloadOf: kiểu theo fileType — Makefile / Dockerfile giữ tên, chữ trơn; .mdx là markdown; .py chữ trơn',
      eq(['Makefile', 'Dockerfile', 'p.mdx', 'a.py'].map(dt), ['Makefile text/plain', 'Dockerfile text/plain', 'p.mdx text/markdown', 'a.py text/plain']), JSON.stringify(['Makefile', 'Dockerfile', 'p.mdx', 'a.py'].map(dt)));
    const one = S.createSession('x', {});
    check('wantsReview / allFilesOffered', P.wantsReview({ rvPrompt: true, lineNums: true }) && !P.wantsReview({ rvPrompt: true, lineNums: false }) && !P.wantsReview({ rvPrompt: false, lineNums: true }) && P.allFilesOffered(s) && !P.allFilesOffered(one) && !P.promptsAll(Object.assign({}, one, { promptAll: true })));
  }
}
// ── end cây folder + file ──

// ── màu thanh trình duyệt khi có lớp mờ (core/color.js) ──
{
  const C = await import('../js/core/color.js');
  check('parseColor: rgb, rgba, cú pháp có /, color(srgb), hex ngắn / dài',
    eq(C.parseColor('rgb(245, 246, 243)'), { r: 245, g: 246, b: 243, a: 1 }) && eq(C.parseColor('rgba(11, 15, 12, 0.38)'), { r: 11, g: 15, b: 12, a: 0.38 }) &&
    eq(C.parseColor('rgb(0 0 0 / 50%)'), { r: 0, g: 0, b: 0, a: 0.5 }) && eq(C.parseColor('color(srgb 1 0 0.5 / 0.2)'), { r: 255, g: 0, b: 127.5, a: 0.2 }) &&
    eq(C.parseColor('#abc'), { r: 170, g: 187, b: 204, a: 1 }) && eq(C.parseColor(' #F5F6F3 '), { r: 245, g: 246, b: 243, a: 1 }));
  check('parseColor: chuỗi lạ thì null', C.parseColor('transparentish') === null && C.parseColor('color(display-p3 1 0 0)') === null && C.parseColor('rgb(1, 2)') === null && C.parseColor('') === null);
  check('barColor: không lớp thì là nền', C.barColor('rgb(245, 246, 243)', []) === '#f5f6f3' && C.barColor('#090b0a') === '#090b0a');
  check('barColor: --scrim sáng (.38) và --scrim-live tối (.42) trộn đục lên --bg',
    C.barColor('rgb(245, 246, 243)', ['rgba(11, 15, 12, 0.38)']) === '#9c9e9b' && C.barColor('rgb(9, 11, 10)', ['rgba(0, 0, 0, 0.42)']) === '#050606');
  const two = C.barColor('rgb(245, 246, 243)', ['rgba(11, 15, 12, 0.2)', 'rgba(11, 15, 12, 0.38)']);
  check('barColor: hai lớp chồng nhau đậm hơn một lớp; lớp trong suốt, lớp hỏng bỏ qua',
    two === C.barColor('rgb(245, 246, 243)', ['rgba(11, 15, 12, 0.38)', 'rgba(11, 15, 12, 0.2)']) && two < '#9c9e9b' &&
    C.barColor('rgb(245, 246, 243)', ['rgba(0, 0, 0, 0)', 'nonsense']) === '#f5f6f3' && C.barColor('nope', []) === null, two);
}
// ── end màu thanh ──

// ── loại file, sổ ngôn ngữ, token code (MDAN-066) ──
import { fileType, langOf, viewFor } from '../js/core/file-type.js';
import { LANGS, CORE_SRI } from '../js/core/langs.js';
import { hlRuns, sxTokens } from '../js/core/code-tokens.js';
{
  const k = (n) => fileType(n).kind + ':' + fileType(n).lang;
  check('loại file: markdown theo đuôi, không đuôi là markdown', ['a.md', 'B.MARKDOWN', 'x.mdx', 'README', 'notes/LICENSE'].every((n) => k(n) === 'markdown:null'));
  check('loại file: code theo đuôi hay tên', k('a.py') === 'code:python' && k('App.TSX') === 'code:typescript' && k('Makefile') === 'code:makefile' && k('Dockerfile') === 'code:dockerfile' && k('i.htm') === 'code:xml');
  check('loại file: đuôi lạ là chữ trơn', ['a.txt', 'data.csv', 'x.log', 'a.', '.env'].every((n) => k(n) === 'plain:null'));
  check('loại file: chỉ markdown có phần của markdown (md)', fileType('a.md').md && fileType('README').md && !fileType('a.py').md && !fileType('a.txt').md);
  const md = fileType('a.md'), py = fileType('a.py');
  check('viewFor: markdown giữ mọi chế độ', ['edit', 'src', 'view', 'split'].every((v) => viewFor(md, v) === v));
  check('viewFor: file không có Preview — Preview / Split về Source, Edit / Source giữ', ['edit', 'src', 'src', 'src'].join() === ['edit', 'src', 'view', 'split'].map((v) => viewFor(py, v)).join());
  check('langOf: khối rào theo alias, chữ hoa, ký tự lạ', langOf('JS') === 'javascript' && langOf('c++') === 'cpp' && langOf('c#') === 'csharp' && langOf('text') === null && langOf('') === null);
  const sri = /^sha384-[A-Za-z0-9+/]{64}$/;
  const bad = Object.keys(LANGS).filter((id) => !sri.test(LANGS[id][1]) || (LANGS[id][2] || '').split(' ').some((d) => d && !LANGS[d]));
  check('sổ ngôn ngữ: mỗi dòng có integrity sha384, ngôn ngữ nạp kèm có trong sổ', sri.test(CORE_SRI) && !bad.length, bad.join());
  const seen = new Map(), dup = [];
  Object.keys(LANGS).forEach((id) => [id].concat(LANGS[id][0].split(' ').filter(Boolean)).forEach((n) => { if (seen.has(n) && seen.get(n) !== id) dup.push(n); seen.set(n, id); }));
  check('sổ ngôn ngữ: không tên nào trỏ hai ngôn ngữ', !dup.length, dup.join());

  // highlight.js: chữ đã thoát trong span lồng; span language-* theo lớp ngoài.
  const html = '<span class="hljs-keyword">if</span> a &lt; b &amp;&amp; <span class="hljs-string">&quot;x&#x27;<span class="hljs-subst">${y}</span>&quot;</span>' +
    '<span class="language-css"><span class="hljs-attribute">color</span></span>';
  const text = 'if a < b && "x\'${y}"color';
  const runs = hlRuns(html);
  check('hlRuns: vị trí đếm trên chữ gốc', eq(runs.map((r) => text.slice(r.s, r.e)), ['if', '"x\'', '${y}', '"', 'color']), JSON.stringify(runs));
  check('hlRuns: lớp trong cùng, span ngôn ngữ nhúng trong suốt', eq(runs.map((r) => r.c), ['hljs-keyword', 'hljs-string', 'hljs-subst', 'hljs-string', 'hljs-attribute']));
  const sx = sxTokens(runs);
  check('sxTokens: đổi sang sx-*, bỏ lớp không màu, gộp đoạn liền cùng màu',
    eq(sx, [{ s: 0, e: 2, c: 'sx-punct' }, { s: 12, e: 15, c: 'sx-string' }, { s: 19, e: 20, c: 'sx-string' }, { s: 20, e: 25, c: 'sx-link' }]), JSON.stringify(sx));
  check('sxTokens: lớp nhiều chữ lấy chữ đầu', eq(sxTokens([{ s: 0, e: 3, c: 'hljs-title function_' }, { s: 3, e: 5, c: 'hljs-title class_' }]), [{ s: 0, e: 5, c: 'sx-code' }]));
}
// ── end loại file ──

console.log(fails ? `md-annotate core: ${fails} LỖI` : 'md-annotate core: OK');
process.exit(fails ? 1 : 0);
