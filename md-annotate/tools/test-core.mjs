/* Bài thử của js/core/ (logic thuần), chạy bằng node, không trình duyệt:  node md-annotate/tools/test-core.mjs
 * Thêm logic thuần mới thì thêm bài thử ở đây. Hành vi cần DOM thì thử ở tools/smoke.cjs. */
import { lexSpans } from '../js/core/blocks.js';
import { numberSections, lineSections, bandBounds, bandPick, spanAt } from '../js/core/sections.js';
import { syncCurves, followTop } from '../js/core/sync-math.js';

let fails = 0;
const check = (name, ok, detail = '') => {
  if (!ok) fails++;
  console.log(`${ok ? '  ok  ' : '  LỖI'} ${name}${detail ? '  — ' + detail : ''}`);
};
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* Bộ tách giả, làm đúng ba điều marked.lexer làm với nguồn: bỏ khối định nghĩa link, dán định nghĩa ngay sau đoạn văn
 * vào raw của đoạn ấy (thêm '\n'), đổi tab đầu dòng thành bốn dấu cách. */
const tok = (type, raw) => ({ type, raw });

// 1. Định nghĩa link đứng riêng: khối sau nó không lệch dòng.
{
  const text = 'Para\n\n[id]: https://x.jpg  "T"\n\n\n## Plugins\n\nThe killer\n[syntax](u).\n';
  const lex = () => [tok('paragraph', 'Para'), tok('space', '\n\n'), tok('heading', '## Plugins\n\n'), tok('paragraph', 'The killer\n[syntax](u).'), tok('space', '\n')];
  const sp = lexSpans(text, lex);
  check('lexSpans: định nghĩa link bị bỏ không làm lệch dòng', eq(sp, [{ a: 0, b: 0, heading: false }, { a: 5, b: 5, heading: true }, { a: 7, b: 8, heading: false }]), JSON.stringify(sp));
}
// 2. Định nghĩa dán vào đoạn văn trên nó: khối bao cả dòng định nghĩa, khối sau đúng dòng.
{
  const text = 'With ref:\n[id]: https://x.jpg\n\n## Next\n';
  const lex = () => [tok('paragraph', 'With ref:\n\n[id]: https://x.jpg'), tok('space', '\n\n'), tok('heading', '## Next\n')];
  const sp = lexSpans(text, lex);
  check('lexSpans: định nghĩa dán vào đoạn trên', eq(sp, [{ a: 0, b: 1, heading: false }, { a: 3, b: 3, heading: true }]), JSON.stringify(sp));
}
// 3. Tab đầu dòng đổi thành dấu cách trong raw: vẫn tìm ra.
{
  const text = 'Intro\n\n\tcode line\n\tmore\n\n# H\n';
  const lex = () => [tok('paragraph', 'Intro'), tok('space', '\n\n'), tok('code', '    code line\n    more\n\n'), tok('heading', '# H\n')];
  const sp = lexSpans(text, lex);
  check('lexSpans: tab đầu dòng', eq(sp, [{ a: 0, b: 0, heading: false }, { a: 2, b: 3, heading: false }, { a: 5, b: 5, heading: true }]), JSON.stringify(sp));
}
// 4. Nội dung khối xuất hiện giữa một dòng trước đó: chỉ khớp ở đầu dòng.
{
  const text = '[x]: https://u\n\nx\n';
  const lex = () => [tok('paragraph', 'x'), tok('space', '\n')];
  const sp = lexSpans(text, lex);
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

console.log(fails ? `md-annotate core: ${fails} LỖI` : 'md-annotate core: OK');
process.exit(fails ? 1 : 0);
