#!/usr/bin/env node
/* ============================================================================
   gate.test.mjs — test cho chính bộ cổng

       node tools/gate.test.mjs

   Vì sao cần: gate.mjs là thứ mọi việc khác dựa vào, và nó đã từng sai thật —
   cổng G-VIZ có lúc báo sai một bài chỉ vì bảng của bài đó do JS dựng nên trong
   nguồn chỉ là một <div> rỗng. Lần đó mắt người phát hiện. Một cổng hỏng âm thầm
   thì không ai biết, và trang sẽ trôi đi sau lưng nó.

   Cách test — mỗi cổng phải qua CẢ HAI chiều:
     · chiều NỔ: cố ý tạo một vi phạm, cổng phải kêu đúng tên
     · chiều IM: khi không có vi phạm, cổng phải không kêu

   Chiều IM quan trọng không kém. Một cổng kêu cả khi không có lỗi thì người ta
   sẽ học cách bỏ qua nó, và nó kéo theo cả những cổng đúng nằm cùng danh sách.

   Cách chạy: dựng một bản sao của trang trong thư mục tạm, sửa bản sao, rồi chạy
   gate.mjs trên đó. Không bao giờ chạm vào file thật.
   ========================================================================== */

import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, mkdtempSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const REAL = join(HERE, '..');

/* --- dựng sân tạm --------------------------------------------------------
   Cấu trúc phải giống thật, vì gate.mjs tìm gốc repo bằng đường dẫn tương đối
   (để kiểm hook). Nên: TMP/.git/hooks/ + TMP/.claude/ + TMP/md/ds/ */
const TMP = mkdtempSync(join(tmpdir(), 'ds-gate-test-'));
const DS  = join(TMP, 'md', 'ds');
mkdirSync(join(TMP, '.git', 'hooks'), { recursive: true });
mkdirSync(join(TMP, '.claude'), { recursive: true });
mkdirSync(DS, { recursive: true });

// Hook giả cho CẢ HAI hook git, để chiều IM của G-HOOK là trạng thái mặc định của
// sân tạm. Nội dung phải chứa đúng chuỗi mà G-HOOK tìm — đây là cách cài "gọi sang
// từ hook có sẵn". Thiếu một cái thì G-HOOK kêu ở chiều IM và cả bộ test đỏ.
const fakeHook = name => `#!/bin/sh\nsh masters-degree/data-science-roadmap/tools/hooks/${name} || exit 1\n`;
const GIT_HOOKS = ['pre-commit', 'pre-push'];
GIT_HOOKS.forEach(h => writeFileSync(join(TMP, '.git', 'hooks', h), fakeHook(h)));
writeFileSync(join(TMP, '.claude', 'settings.json'),
  JSON.stringify({ hooks: { PostToolUse: [{ command: 'data-science-roadmap' }] } }));

/* roadmap.html có trong danh sách vì nó cũng là SẢN PHẨM sinh ra (cổng G-ROADMAP so nó
   với bản sinh lại). Thiếu nó thì chiều IM đỏ vì "chưa có roadmap.html". */
const COPIES = ['data-science-roadmap.html', 'roadmap.html', 'TOC.md', 'CLAUDE.md', 'HANDOFF.md', 'LEARNING-LOG.md'];
for (const f of COPIES) cpSync(join(REAL, f), join(DS, f));
cpSync(join(REAL, 'tools'), join(DS, 'tools'), { recursive: true });

/* G-HANDOFF đọc `git status`, nên sân tạm phải là một repo thật — không thì cổng đó
   im trong CẢ HAI chiều và ta không test được gì. `git init` là đủ: mọi file thành
   "chưa theo dõi", và đó chính là trạng thái "vừa sửa, chưa commit" mà cổng xét. */
let GIT_OK = true;
try { execFileSync('git', ['-C', TMP, 'init', '-q'], { stdio: 'ignore' }); } catch { GIT_OK = false; }

/* Nền của chiều IM phải là một trang TỰ NHẤT QUÁN, không phải "bản đang có trong
   working tree". Nếu người chạy test vừa sửa HTML mà chưa `--write` thì TOC.md thật
   đang cũ — và G-TOC-STALE sẽ kêu ở chiều IM, tức test báo đỏ vì một lý do không
   liên quan gì tới cổng. Sinh lại TOC.md trong sân tạm một lần, rồi lấy nền từ ĐÓ. */
execFileSync(process.execPath, [join(DS, 'tools', 'gate.mjs'), '--write'],
  { cwd: DS, stdio: 'ignore' });

const ORIG = Object.fromEntries(COPIES.map(f => [f, readFileSync(join(DS, f), 'utf8')]));
const HTML0 = ORIG['data-science-roadmap.html'];
const TOC0  = ORIG['TOC.md'];
const CL0   = ORIG['CLAUDE.md'];

function reset() {
  for (const f of COPIES) writeFileSync(join(DS, f), ORIG[f]);
}

function runGate() {
  try {
    return execFileSync(process.execPath, [join(DS, 'tools', 'gate.mjs'), '--advice'],
      { cwd: DS, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    return (e.stdout || '') + (e.stderr || '');   // thoát 1 khi có lỗi chặn — vẫn cần output
  }
}

/* --- tiện ích sửa văn bản ------------------------------------------------ */
function once(s, from, to) {
  const i = s.indexOf(from);
  if (i < 0) throw new Error(`test tự hỏng: không tìm thấy trong nguồn: ${from.slice(0, 60)}`);
  return s.slice(0, i) + to + s.slice(i + from.length);
}

/* Đổi chỗ hai bài LIỀN NHAU trong TREE, không đụng thứ tự <template>. */
function swapTwoInTree(s) {
  const at = s.indexOf('\nconst TREE = [');
  const re = /^(\s*)\{ id:'[^']+'[^\n]*\},\n/gm;
  re.lastIndex = at;
  const a = re.exec(s); const b = re.exec(s);
  if (!a || !b) throw new Error('test tự hỏng: không tìm được hai dòng bài trong TREE');
  return s.slice(0, a.index) + b[0] + a[0] + s.slice(b.index + b[0].length);
}

/* Bỏ mọi thứ "nhìn được" ra khỏi một bài, để G-VIZ có cái mà báo. */
function stripVisuals(s, id) {
  const from = s.indexOf(`<template data-node="${id}"`);
  const to = s.indexOf('</template>', from);
  const body = s.slice(from, to)
    .replace(/<table/g, '<x-tbl').replace(/ds-code/g, 'x-code')
    .replace(/ds-viz/g, 'x-viz').replace(/data-viz=/g, 'x-viz=')
    .replace(/<div id="plan/g, '<div id="x-plan');
  return s.slice(0, from) + body + s.slice(to);
}

/* Một đoạn văn đúng kiểu "bảng bị viết thành câu" — mật độ chữ số cao, nhiều
   cụm số ngăn bằng phẩy. Đây chính là dạng lỗi mà C8 trong tài liệu mô tả. */
const DUMPY = '<p>Số giờ mỗi ngày: 1 là 5,8, 2 là 5,3, 3 là 5,9, 4 là 5,1, 5 là 6,0, '
  + '6 là 5,4, 7 là 5,2, 8 là 4,8, 9 là 3,5, 10 là 5,6, 11 là 5,9, 12 là 6,1, '
  + '13 là 6,3, 14 là 5,8, tổng 75,8, trung bình 5,4, thấp nhất 4,8, cao nhất 6,3, '
  + 'chênh 1,5, số bài 84, số tuần 8, số chặng 11, tổng cả lộ trình 106,5.</p>';

/* --- các ca test --------------------------------------------------------- */
const CASES = [
  ['G-ORDER', 'đổi chỗ hai data-node để lệch thứ tự TREE', h => {
    const i = h.indexOf('<template data-node="s-intro"');
    const j = h.indexOf('<template data-node="s-pipeline"');
    return h.slice(0, i) + h.slice(i, j).replace('data-node="s-intro"', 'data-node="s-pipeline"')
         + h.slice(j).replace('data-node="s-pipeline"', 'data-node="s-intro"');
  }],
  ['G-NODE', 'khai một data-node hai lần', h =>
    once(h, '<template data-node="m-bayes"', '<template data-node="m-bayes" data-dup="1"></template><template data-node="m-bayes"')],
  ['G-REF', 'trỏ data-math tới khoá không tồn tại', h =>
    once(h, 'data-math="bayes"', 'data-math="khong-he-ton-tai"')],
  ['G-ORPHAN', 'thêm popup không bài nào mở', h =>
    once(h, '<template data-mathdef=', '<template data-mathdef="mo-coi-test" data-title="Mồ côi"><p>x</p></template>\n<template data-mathdef=')],
  ['G-PAYOFF', 'xoá PAYOFF của một bài', h =>
    once(h, "'m-bayes':    ['Lý do một mô hình", "'m-bayes-da-doi-ten':    ['Lý do một mô hình")],
  ['G-NO-DETAILS', 'dùng <details> cho kiến thức', h =>
    once(h, '<template data-node="m-bayes">', '<template data-node="m-bayes"><details><summary>x</summary><p>y</p></details>')],
  ['G-FWD', 'tiêu chí đạt đòi PR-AUC trước bài dạy nó', h =>
    once(h, 'const ACCEPT = {', "const ACCEPT = {\n  'm-vector':[{k:'result', v:'in ra PR-AUC của validation'}],")],
  ['G-PLAN', 'DELIV_MIN đòi nhiều phút hơn bài có', h =>
    once(h, "'th-topic':40", "'th-topic':400")],
  ['G-LAYER', 'tiêu đề tự khai là không cần thiết', h =>
    once(h, '<template data-node="m-bayes">', '<template data-node="m-bayes"><h2>Thứ bạn có thể bỏ qua</h2>')],
  ['G-DUMP', 'đoạn văn đọc lại cả một bảng số', h =>
    once(h, '<template data-node="m-bayes">', '<template data-node="m-bayes">' + DUMPY)],
  ['G-MEASURE', 'thêm max-width cứng', h =>
    once(h, '</style>', '.ds-test-mep-thu-ba { max-width: 500px; }\n</style>')],
  /* Ba dòng, không phải một: dòng đầu là thứ PHẢI nổ, hai dòng sau là hai ngoại lệ mà
     §0.6 cho phép — nhích quang học ≤5px, và padding (hình dạng component, không phải
     nhịp trang). Nếu cổng bắt luôn hai dòng kia thì ca "im" ở dưới sẽ không đủ để lộ ra,
     vì ở đó không có margin px trần nào cả. */
  ['G-SPACING', 'margin dọc viết px trần trong <style>', h =>
    once(h, '</style>', '.ds-test-nhip { margin-bottom: 17px; }\n'
      + '.ds-test-nhich { margin-top: 3px; }\n'
      + '.ds-test-pad { padding: 12px 16px; margin: 0 12px; }\n</style>')],
  ['G-VIZ', 'bài không còn gì để nhìn', h => stripVisuals(h, 'm-bayes')],
  /* Dựng lại đúng hình dạng câu đã có thật trên trang trước 2026-08-09 ("cột thiếu
     > 60% và không mang thông tin → bỏ cột"): ngưỡng % + mũi tên mệnh lệnh, không có
     từ nào hạ giọng. Ca "im" ở dưới đồng thời chứng minh cổng KHÔNG bắt những câu có
     nhãn điểm khởi đầu — đó mới là thứ giữ cho nó không thành tiếng ồn. */
  ['G-ABS', 'ngưỡng % viết như quy luật, không gắn nhãn', h =>
    once(h, '<template data-node="m-bayes">',
      '<template data-node="m-bayes"><p>Cột nào thiếu &gt; 60% dữ liệu thì bỏ khỏi mô hình.</p>')],
  ['G-TOC-STRUCT', 'đổi tên một bài trong TREE', h =>
    once(h, "t:'Bayes & likelihood'", "t:'Bayes & likelihood (đổi tên)'")],
  ['G-NEXT', 'đổi chỗ hai bài trong TREE', swapTwoInTree],
  /* Ca này dựng lại ĐÚNG lỗi đã xảy ra 2026-08-04, không phải một lỗi cú pháp bất kỳ:
     một dấu backtick lọt vào comment HTML nằm TRONG template literal của renderHome().
     Dựng lại đúng hình dạng đó là cách duy nhất để biết cổng bắt được thứ nó sinh ra để
     bắt — một ca `let x = ;` cũng làm cổng nổ, nhưng không chứng minh được gì cả. */
  ['G-SYNTAX', 'backtick trong comment HTML bên trong template literal', h =>
    once(h, '<ol class="wb-steps ds-map">', '<!-- `wb-steps` -->\n      <ol class="wb-steps ds-map">')],
  /* Chèn vào CUỐI object QUIZ (ngay trước `};` của nó) một khoá 's-how' TRÙNG — khoá
     literal trùng thì bản CUỐI thắng, nên nó ghi đè quiz thật của s-how. Không phụ
     thuộc nội dung câu hỏi thật (sẽ đổi khi thêm bài), chỉ phụ thuộc mốc kết thúc
     object, nên ca test không tự hỏng mỗi lần thêm quiz. */
  ['G-QUIZ', 'đáp án đúng (a) trỏ ra ngoài số lựa chọn', h =>
    once(h, '\n};\n\n/* Ma trận năng lực', "\n  's-how':[{ q:'x?', o:['a','b'], a:9, why:'y' }],\n};\n\n/* Ma trận năng lực")],
  ['G-QUIZ-COV', 'một bài có mảng câu hỏi rỗng', h =>
    once(h, '\n};\n\n/* Ma trận năng lực', "\n  's-how':[],\n};\n\n/* Ma trận năng lực")],
];

/* Các ca không sửa HTML mà sửa file khác. Mỗi ca tự dọn ở `after` nếu nó chạm vào
   thứ nằm NGOÀI những gì reset() phục hồi (ví dụ .git/hooks/). */
const OTHER_CASES = [
  ['G-TOC-STALE', 'TOC.md còn số dòng cũ', () => {
    // Dải dòng ĐẦU TIÊN trong bảng, tìm bằng khuôn chứ không bằng con số cụ thể —
    // gõ số vào đây thì test tự hỏng mỗi lần trang dài ra vài dòng.
    writeFileSync(join(DS, 'TOC.md'), TOC0.replace(/\| \d+–\d+ \|/, '| 1–2 |'));
  }],
  ['G-DOC', 'CLAUDE.md thiếu tên một cổng', () => {
    writeFileSync(join(DS, 'CLAUDE.md'), CL0.replace(/G-ORPHAN/g, 'G-KHONG-CO-TEN-NAY'));
  }],
  ['G-HOOK', 'lớp hook lúc push chưa được cài', () => {
    rmSync(join(TMP, '.git', 'hooks', 'pre-push'));
  }, () => writeFileSync(join(TMP, '.git', 'hooks', 'pre-push'), fakeHook('pre-push'))],
  ['G-LEARN', 'sổ học có dòng gõ sai khuôn', () => {
    writeFileSync(join(DS, 'LEARNING-LOG.md'),
      ORIG['LEARNING-LOG.md'] + '\n### `d-eda` · x\n- 2026-08-04 · loai-khong-co · y\n');
  }],
  ['G-HANDOFF', 'sửa trang mà không có HANDOFF.md', () => {
    rmSync(join(DS, 'HANDOFF.md'));
  }],
  ['G-ROADMAP', 'roadmap.html bị sửa tay, lệch bản sinh lại', () => {
    writeFileSync(join(DS, 'roadmap.html'), ORIG['roadmap.html'] + '\n<!-- sửa tay -->\n');
  }],
  /* Chiều NỔ của G-ROADMAP-SUM: xoá vân tay nội dung của một bài. Đó là ca "chưa đóng dấu";
     ca "bài đã đổi" thì mọi mutation HTML ở trên đã dựng ra rồi. tools/ nằm ngoài phạm vi
     reset() nên ca này tự trả file về. */
  ['G-ROADMAP-SUM', 'một bản tóm tắt chưa có vân tay nội dung', () => {
    const p = join(DS, 'tools', 'roadmap-summaries.json');
    SUMS0 = readFileSync(p, 'utf8');
    const j = JSON.parse(SUMS0);
    delete j.srcHash['m-bayes'];
    writeFileSync(p, JSON.stringify(j, null, 1) + '\n');
  }, () => writeFileSync(join(DS, 'tools', 'roadmap-summaries.json'), SUMS0)],
];
let SUMS0 = null;

/* --- chạy ---------------------------------------------------------------- */
const ALL_GATES = execFileSync(process.execPath, [join(DS, 'tools', 'gate.mjs'), '--gates'],
  { cwd: DS, encoding: 'utf8' }).match(/G-[A-Z-]+/g);

let pass = 0, failed = 0;
const ok = (name, msg) => { console.log(`  ✓ ${name.padEnd(14)} ${msg}`); pass++; };
const no = (name, msg) => { console.error(`  ✗ ${name.padEnd(14)} ${msg}`); failed++; };

// --- chiều IM: sân tạm chưa sửa gì thì cổng nào cũng phải im -------------
console.log('\nchiều IM — chưa có vi phạm nào:\n');
reset();
const clean = runGate();
for (const g of ALL_GATES) {
  // G-FWD ở mức thân bài là trạng thái ổn định đã soát (xem HANDOFF) — nó kêu
  // 6 lần một cách có chủ ý, nên đây là ngoại lệ đã biết, không phải cổng hỏng.
  if (g === 'G-FWD') continue;
  if (clean.includes(g + ':')) no(g, 'kêu dù không có vi phạm');
  else ok(g, 'im');
}

// --- chiều NỔ ------------------------------------------------------------
console.log('\nchiều NỔ — mỗi cổng một vi phạm cố ý:\n');
for (const [gate, what, mutate] of CASES) {
  reset();
  try {
    writeFileSync(join(DS, 'data-science-roadmap.html'), mutate(HTML0));
  } catch (e) { no(gate, `test tự hỏng: ${e.message}`); continue; }
  const out = runGate();
  if (out.includes(gate + ':')) ok(gate, what);
  else no(gate, `KHÔNG kêu khi ${what}`);
}
for (const [gate, what, mutate, after] of OTHER_CASES) {
  reset();
  if (gate === 'G-HANDOFF' && !GIT_OK) { console.log(`  · ${gate.padEnd(14)} bỏ qua — không gọi được git trong sân tạm`); continue; }
  mutate();
  const out = runGate();
  if (out.includes(gate + ':')) ok(gate, what);
  else no(gate, `KHÔNG kêu khi ${what}`);
  if (after) after();
}

// --- cổng nào chưa có ca NỔ: nói ra, đừng im lặng ------------------------
const tested = new Set([...CASES, ...OTHER_CASES].map(c => c[0]));
const untested = ALL_GATES.filter(g => !tested.has(g));
if (untested.length) console.log(`\n· chưa có ca NỔ: ${untested.join(', ')}`);

/* --- hai công cụ không phải cổng: chỉ cần chúng CHẠY ---------------------
   session.mjs và learn.mjs không kiểm gì cả nên không có chiều NỔ/IM. Nhưng chúng
   là hai lệnh mà quy trình bắt buộc gọi (CLAUDE.md §0a và §12), nên một lỗi cú pháp
   trong đó làm hỏng cả quy trình mà không cổng nào biết. Đây là cái chặn rẻ nhất. */
/* Hợp đồng giữa HAI file, không phải một cổng: tên file sổ học mà trang tải về phải
   khớp mẫu mà `learn.mjs --sync` đi tìm. Lệch một bên thì không cổng nào nổ, không lỗi
   nào hiện ra — chỉ là `--sync` mãi mãi báo "không thấy bản xuất nào". Đúng loại lỗi mà
   test tồn tại để bắt. */
console.log('\nhợp đồng tên file sổ học (HTML ↔ learn.mjs):\n');
reset();
{
  const html = readFileSync(join(DS, 'data-science-roadmap.html'), 'utf8');
  const m = /a\.download\s*=\s*`([^`]+)`/.exec(html);
  if (!m) {
    no('bản xuất', 'không tìm thấy `a.download` trong HTML — trang không còn tải file về?');
  } else {
    const { PAT_EXPORT } = await import(pathToFileURL(join(DS, 'tools', 'learn.mjs')).href);
    // Dựng đúng tên file thật: thay ${isoToday()} bằng một ngày cụ thể.
    const name = m[1].replace(/\$\{[^}]+\}/g, '2026-08-04');
    const dup = name.replace(/\.md$/, ' (1).md');       // Chrome khi trùng tên
    PAT_EXPORT.test(name)
      ? ok('bản xuất', `PAT_EXPORT khớp tên trang đặt (${name})`)
      : no('bản xuất', `PAT_EXPORT KHÔNG khớp "${name}" — --sync sẽ không bao giờ thấy file`);
    PAT_EXPORT.test(dup)
      ? ok('bản xuất', 'khớp cả bản trùng tên của Chrome')
      : no('bản xuất', `PAT_EXPORT không khớp "${dup}" — tải lần thứ hai là mất`);
  }
}

/* ---- đơn vị viewport dưới `zoom` ------------------------------------------
   `html { zoom: .9 }` KHÔNG điều chỉnh vh/vw/dvh: một `height: 100vh` ra 90% chiều cao
   cửa sổ thật. Lỗi này đã xảy ra HAI lần (mức tràn bảng, rồi thanh bên + ngăn phụ +
   dock cụt 10% đáy) và cả hai lần đều không có cổng nào bắt được — nó không phải lỗi
   cấu trúc, nó là một con số đúng cú pháp mà sai nghĩa. Nên nó là test, không phải cổng.

   Luật: trong khối <style> của trang, mọi `<số>vh|vw|dvh|dvw` chỉ được xuất hiện ở
     · dòng định nghĩa hai token `--ds-vh` / `--ds-vw`, hoặc
     · một khai báo `font-size` (chữ CO theo zoom là đúng, không phải lỗi).
   Media query cũng bị kiểm: con số ở đó phải là con số ĐÃ CHIA zoom, nên nó phải mang
   một chú thích nói ra điều đó — không có chú thích thì gần như chắc là quên chia. */
console.log('\nđơn vị viewport dưới zoom (không dùng vh/vw trần):\n');
reset();
{
  const html = readFileSync(join(DS, 'data-science-roadmap.html'), 'utf8');
  const style = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
  /* Xoá RUỘT chú thích nhưng giữ số dòng: các khối chú thích ở đây NÓI về cái bẫy nên
     chúng đầy chữ `100vw`, và một test báo động vào chính tài liệu giải thích lỗi thì
     nó là tiếng ồn. Thay mọi ký tự trong chú thích bằng dấu cách, chừa \n. */
  const code = style.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
  const bad = [];
  code.split('\n').forEach((line, i) => {
    if (!/\d\s*(dvh|dvw|vh|vw)\b/.test(line)) return;
    if (/--ds-vh\s*:|--ds-vw\s*:/.test(line)) return;             // chính hai token
    if (/font-size/.test(line)) return;                           // cỡ chữ co theo zoom là đúng
    bad.push(`${i + 1}: ${line.trim().slice(0, 90)}`);
  });
  bad.length === 0
    ? ok('đơn vị vp', 'không có vh/vw/dvh trần nào ngoài hai token --ds-vh/--ds-vw')
    : no('đơn vị vp', `${bad.length} chỗ dùng đơn vị viewport trần:\n      ` + bad.join('\n      '));

  /* Media query cũng bị nhân zoom, nhưng nó KHÔNG phải lỗi — chỉ là con số phải được
     chọn có ý thức. Test chỉ in ra danh sách để lần soát nào cũng đi qua nó một lần. */
  const mqs = [...code.matchAll(/@media[^{]*\((?:min|max)-width:\s*(\d+)px\)/g)].map(m => m[1]);
  ok('media query', mqs.length
    ? `${mqs.length} ngưỡng: ${mqs.join(', ')}px — ngưỡng THẬT = số × zoom, kiểm lại nếu vừa thêm`
    : 'không có media query nào');
  const tokens = ['--ds-vh', '--ds-vw'];
  tokens.every(t => style.includes(t + ': calc('))
    ? ok('đơn vị vp', 'hai token --ds-vh/--ds-vw còn được định nghĩa bằng calc()')
    : no('đơn vị vp', 'thiếu định nghĩa --ds-vh hoặc --ds-vw — mọi chỗ dùng chúng sẽ im lặng thành 0');
}

console.log('\ncông cụ phiên — chỉ kiểm chạy được:\n');
reset();
for (const [tool, args] of [['session.mjs', []], ['session.mjs', ['--close']], ['learn.mjs', []], ['learn.mjs', ['--check']], ['learn.mjs', ['--sync']]]) {
  try {
    execFileSync(process.execPath, [join(DS, 'tools', tool), ...args],
      { cwd: DS, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    ok(tool, `chạy được${args.length ? ' ' + args.join(' ') : ''}`);
  } catch (e) {
    no(tool, `NÉM khi chạy ${args.join(' ')}: ${String((e.stderr || e.message)).split('\n')[0]}`);
  }
}

rmSync(TMP, { recursive: true, force: true });
console.log(`\n${failed ? '✗' : '✓'} ${pass} đạt · ${failed} trượt\n`);
process.exit(failed ? 1 : 0);
