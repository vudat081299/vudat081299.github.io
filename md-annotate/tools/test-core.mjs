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

console.log(fails ? `md-annotate core: ${fails} LỖI` : 'md-annotate core: OK');
process.exit(fails ? 1 : 0);
