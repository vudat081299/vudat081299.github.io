#!/usr/bin/env node
/* ============================================================================
   gate.mjs — cổng kiểm chất lượng cho data-science-roadmap.html

   Vì sao có file này: trang là MỘT file HTML ~12k dòng. Không ai (người hay AI) đọc
   hết được nó mỗi lần sửa một bài, nên mọi tính chất "toàn cục" — mục lục còn khớp
   không, bài này có bị dạy sau thứ nó cần không, nhánh phụ có lọt lên mạch chính
   không — đều là thứ trôi đi trong im lặng. File này biến chúng thành lỗi to tiếng.

   Nguyên tắc kiến trúc (đọc kỹ trước khi thêm gate):
     · HTML là NGUỒN SỰ THẬT DUY NHẤT. Script này chỉ ĐỌC nó.
     · TOC.md là SẢN PHẨM SINH RA từ HTML — không bao giờ sửa tay, không bao giờ
       được coi là nguồn sự thật. Gate sinh lại rồi so; lệch là lỗi.
     · HTML không được phụ thuộc ngược lại vào tools/ hay docs/. Bỏ cả thư mục
       tools/ đi thì trang vẫn chạy y nguyên.
     · concepts.json là DỮ LIỆU VÀO của gate G-FWD, không phải nội dung trang.

   Dùng:
     node tools/gate.mjs              kiểm tất cả, thoát 1 nếu có lỗi cứng
     node tools/gate.mjs --write      sinh lại TOC.md rồi kiểm
     node tools/gate.mjs --show <id>  in đúng một bài ra stdout (kèm số dòng)
     node tools/gate.mjs --where <id> in dải dòng của một bài, để sed/Read đúng chỗ
     node tools/gate.mjs --advice     in cả phần khuyến nghị (không chặn commit)
     node tools/gate.mjs --gates      in danh sách cổng đang chạy
     node tools/gate.mjs --ci         dùng trong pre-commit: nghiêm hơn một bậc

   Các file đi kèm:
     read-html.mjs   luật đọc dữ liệu ra khỏi HTML (dùng chung)
     plan.mjs        luật kiểm lịch học — cổng G-PLAN, cũng là bản node của
                     auditPlan(). Chạy riêng được: node tools/audit.mjs
     learn.mjs       luật đọc LEARNING-LOG.md — cổng G-LEARN. Chạy riêng được:
                     node tools/learn.mjs
     session.mjs     mở/đóng phiên. KHÔNG phải cổng — chỉ đọc và in.
   ========================================================================== */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readPage } from './read-html.mjs';
import { checkPlan } from './plan.mjs';
import { checkLearn } from './learn.mjs';
import { hookLayers } from './hook-state.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const HTML = join(ROOT, 'data-science-roadmap.html');
const TOC  = join(ROOT, 'TOC.md');
const CONCEPTS = join(HERE, 'concepts.json');

const argv = process.argv.slice(2);
const has = f => argv.includes(f);
const arg = f => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };

/* ---------------------------------------------------------------------------
   1. Đọc dữ liệu ra khỏi HTML

   Luật đọc file nằm ở tools/read-html.mjs, dùng chung với plan.mjs. Trước đây
   mỗi công cụ tự đọc, tức có hai bản luật đọc cùng một file — và hai bản thì sẽ
   lệch nhau. Giờ chỉ còn một bản.
   ------------------------------------------------------------------------- */
const P = readPage(HTML);
const {
  src, lines,
  TREE, WEEKS, DAYS, PAYOFF, COMPS, ACCEPT, QUIZ, SCOPE, PORTFOLIO, PHASE_OUTCOME,
  TPL, tplBy, nodeTpl, refsIn,
  LEAVES, byId, orderOf, FAST, weekOf, nextOf, mins,
} = P;

/* ---------------------------------------------------------------------------
   2. Sinh TOC.md — bản đồ để ĐỌC THAY CHO việc mở file 12k dòng

   Mỗi bài một dòng bảng: đủ để một AI quyết định "bài này liên quan không, cần mở
   không, mở thì sed từ dòng nào" mà không phải nạp cả file vào ngữ cảnh.
   ------------------------------------------------------------------------- */
const PRIO_LABEL = { core: 'bắt buộc', good: 'nên biết', skim: 'định vị' };

/* Chữ ký CẤU TRÚC của mục lục: chỉ những thứ mà đổi là đổi GIÁO TRÌNH — danh sách
   bài, tên, chặng, ưu tiên, thời lượng, tuần, có tiêu chí đạt hay không.

   Cố ý KHÔNG gồm số dòng. Số dòng đổi mỗi lần sửa một câu bất kỳ trong file; nếu
   trộn nó vào cổng chặn thì cổng nổ liên tục vì lý do máy móc, và người ta sẽ học
   cách bỏ qua nó. Số dòng vẫn có trong TOC.md (nó là thứ hữu ích nhất để mở đúng
   đoạn) — chỉ là được làm mới tự động, không phải thứ để chặn commit. */
function tocSignature() {
  const parts = [];
  for (const p of TREE) {
    parts.push(`P|${p.id}|${p.t}`);
    for (const k of p.kids) {
      parts.push(`L|${k.id}|${k.t}|${k.p}|${k.r}/${k.x}/${k.d}|w${weekOf[k.id] || 0}`
        + `|f${FAST.has(k.id) ? 1 : 0}|a${ACCEPT[k.id] ? ACCEPT[k.id].length : 0}|s${SCOPE[k.id] || '-'}`);
    }
  }
  for (const t of TPL) if (t.kind !== 'node') parts.push(`X|${t.kind}|${t.key}|${t.title}`);
  let h = 5381;
  const s = parts.join('\n');
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0') + '-' + LEAVES.length + 'b' + TREE.length + 'c';
}
const SIG = tocSignature();
const SIG_RE = /^<!-- toc-signature: (\S+) -->$/m;

function buildToc() {
  const L = [];
  L.push('# TOC — data-science-roadmap.html');
  L.push('');
  L.push(`<!-- toc-signature: ${SIG} -->`);
  L.push('');
  L.push('> **SINH TỰ ĐỘNG — đừng sửa tay.** Nguồn sự thật là `data-science-roadmap.html`.');
  L.push('> Sinh lại: `node tools/gate.mjs --write`. Gate chặn commit nếu file này lệch HTML.');
  L.push('');
  L.push('File này tồn tại để **đọc thay cho việc mở cả file HTML**. Muốn xem một bài:');
  L.push('`node tools/gate.mjs --show <id>` (hoặc `--where <id>` để lấy dải dòng rồi đọc đúng đoạn).');
  L.push('');
  L.push(`**Tổng:** ${LEAVES.length} bài · ${TREE.length} chặng · ${WEEKS.length} tuần · `
       + `${DAYS.length} ngày fast track · ${(sum(LEAVES.map(mins)) / 60).toFixed(1)} giờ `
       + `(fast ${(sum(LEAVES.filter(l => FAST.has(l.id)).map(mins)) / 60).toFixed(1)} giờ)`);
  L.push('');
  L.push('Cột: **ưu tiên** bắt buộc/nên biết/định vị · **r/x/d** phút đọc/thực hành/deliverable ·');
  L.push('**F** có trong fast track 14 ngày · **T** tuần trong lộ trình 8 tuần · **A** có tiêu chí đạt ·');
  L.push('**dòng** dải dòng trong HTML.');
  L.push('');

  for (const p of TREE) {
    L.push(`## ${p.t}`);
    L.push('');
    if (PHASE_OUTCOME[p.id]) { L.push(`**Xong chặng làm được gì.** ${PHASE_OUTCOME[p.id]}`); L.push(''); }
    L.push('| id | bài | ưu tiên | r/x/d | F | T | A | dòng |');
    L.push('|---|---|---|---|---|---|---|---|');
    for (const k of p.kids) {
      const t = nodeTpl[k.id];
      L.push(`| \`${k.id}\` | ${esc(k.t)} | ${PRIO_LABEL[k.p]} | ${k.r}/${k.x}/${k.d} `
           + `| ${FAST.has(k.id) ? '✓' : ''} | ${weekOf[k.id] || ''} | ${ACCEPT[k.id] ? ACCEPT[k.id].length : ''} `
           + `| ${t ? t.from + '–' + t.to : '**THIẾU**'} |`);
    }
    L.push('');
    for (const k of p.kids) {
      const g = PAYOFF[k.id];
      if (!g) continue;
      const t = nodeTpl[k.id];
      const opens = t ? [...new Set([...refsIn(t.body, 'math'), ...refsIn(t.body, 'aside')])] : [];
      L.push(`- **\`${k.id}\`** — ${esc(g[0])}`);
      L.push(`  - dẫn tới: ${esc(g[1])}`);
      if (opens.length) L.push(`  - mở nhánh phụ: ${opens.map(o => '`' + o + '`').join(', ')}`);
    }
    L.push('');
  }

  L.push('---');
  L.push('');
  L.push('## Nhánh phụ — popup toán (`data-mathdef`)');
  L.push('');
  L.push('| khoá | tiêu đề | dòng | bài nào mở |');
  L.push('|---|---|---|---|');
  for (const t of tplBy('mathdef')) {
    L.push(`| \`${t.key}\` | ${esc(t.title || '')} | ${t.from}–${t.to} | ${openedBy('math', t.key).join(', ') || '—'} |`);
  }
  L.push('');
  L.push('## Nhánh phụ — ngăn bên phải (`data-aside`)');
  L.push('');
  L.push('| khoá | tiêu đề | dòng | bài nào mở |');
  L.push('|---|---|---|---|');
  for (const t of tplBy('aside')) {
    L.push(`| \`${t.key}\` | ${esc(t.title || '')} | ${t.from}–${t.to} | ${openedBy('aside', t.key).join(', ') || '—'} |`);
  }
  L.push('');
  L.push('## Lịch 8 tuần');
  L.push('');
  L.push('| tuần | deliverable | mốc | bài |');
  L.push('|---|---|---|---|');
  for (const w of WEEKS) {
    L.push(`| ${w.n} | ${esc(w.out || '')} | ${esc(w.mile || '')} | ${w.ids.map(i => '`' + i + '`').join(' ')} |`);
  }
  L.push('');
  L.push('## Nhóm năng lực');
  L.push('');
  L.push('| # | nhóm | bằng chứng | bài |');
  L.push('|---|---|---|---|');
  for (const c of COMPS) {
    L.push(`| ${c.n} | ${esc(c.t)} | ${esc(c.evid || '')} | ${c.lessons.map(i => '`' + i + '`').join(' ')} |`);
  }
  L.push('');
  return L.join('\n');
}

function openedBy(attr, key) {
  return tplBy('node').filter(t => refsIn(t.body, attr).includes(key)).map(t => '`' + t.key + '`');
}
function esc(s) { return String(s).replace(/\|/g, '\\|').replace(/\n/g, ' '); }
function sum(a) { return a.reduce((x, y) => x + y, 0); }

/* ---------------------------------------------------------------------------
   3. Các cổng
   ------------------------------------------------------------------------- */
const fail = [];   // chặn commit
const warn = [];   // báo để người quyết định
const held = [];   // lỗi thật đang được HOÃN có chủ ý (waiver) — vẫn in mỗi lần chạy
const F = m => fail.push(m);
const W = m => warn.push(m);

/* Danh sách cổng — NGUỒN SỰ THẬT về "trang này có những cổng nào".
   Cổng G-DOC ở dưới đối chiếu danh sách này với CLAUDE.md, nên thêm một cổng mà
   quên ghi vào tài liệu thì máy nhắc. Trước khi có nó, G-DUMP đã tồn tại trong
   code hơn một phiên mà bảng cổng trong CLAUDE.md không có tên nó. */
const GATES = [
  ['G-TOC-STRUCT', 'chặn', 'cấu trúc mục lục trong TOC.md còn khớp HTML'],
  ['G-TOC-STALE',  'nhắc', 'số dòng trong TOC.md đã cũ (chặn khi commit)'],
  ['G-ORDER',      'chặn', 'thứ tự khối <template> trong file == thứ tự học'],
  ['G-NODE',       'chặn', 'mỗi bài đúng một template, không thừa không trùng'],
  ['G-REF',        'chặn', 'mọi data-aside / data-math / data-goto / #/id giải được'],
  ['G-ORPHAN',     'chặn', 'không có nhánh phụ nào mà không bài nào mở'],
  ['G-PAYOFF',     'chặn', 'mọi bài khai PAYOFF (thiếu = đầu bài không có mục tiêu)'],
  ['G-SYNTAX',     'chặn', 'script chính của trang phân tích được (không thì trang trắng)'],
  ['G-NO-DETAILS', 'chặn', 'không dùng <details> để ẩn kiến thức'],
  ['G-FWD',        'chặn', 'tiêu chí đạt / deliverable tuần không đòi thứ chưa dạy'],
  ['G-PLAN',       'chặn', 'lịch 14 ngày & 8 tuần nhất quán (bản node của auditPlan)'],
  ['G-LAYER',      'nhắc', 'mục tự khai là nhánh phụ, hoặc bài quá dài'],
  ['G-DUMP',       'nhắc', 'đổ dữ liệu thành câu thay vì nói ý'],
  ['G-ABS',        'nhắc', 'ngưỡng % viết như quy luật, không gắn nhãn điểm khởi đầu'],
  ['G-VIZ',        'nhắc', 'bài chưa có hình / bảng / code nào để nhìn'],
  ['G-MEASURE',    'nhắc', 'có max-width cứng làm trôi khổ chữ'],
  ['G-SPACING',    'nhắc', 'margin dọc còn viết px trần, chưa trỏ vào thang --ds-sp-*'],
  ['G-NEXT',       'nhắc', 'bài sau đã đổi → đọc lại câu "bài sau…" trong PAYOFF'],
  ['G-HOOK',       'nhắc', 'ba lớp hook tự động đã được cài chưa'],
  ['G-DOC',        'nhắc', 'mọi cổng trong code đều có tên trong CLAUDE.md'],
  ['G-HANDOFF',    'nhắc', 'đổi trang / bộ cổng mà HANDOFF.md không đổi'],
  ['G-LEARN',      'nhắc', 'sổ học đọc được, và chỗ tắc trùng nhau = dạy quá muộn'],
  ['G-ROADMAP',    'nhắc', 'roadmap.html còn khớp bản sinh lại từ nguồn (chặn khi commit)'],
  ['G-ROADMAP-SUM','nhắc', 'tóm tắt roadmap thiếu bài, hoặc bài đã đổi sau khi tóm tắt'],
  ['G-QUIZ',       'chặn', 'câu hỏi trắc nghiệm đủ trường và có đáp án đúng hợp lệ'],
  ['G-QUIZ-COV',   'nhắc', 'bài chưa có quiz, hoặc có ít câu hơn số mục của chính nó'],
  ['G-QUIZ-POS',   'nhắc', 'giải thích gọi lựa chọn theo vị trí ("đáp án cuối") — đảo thứ tự là sai'],
];

/* Waiver: một lỗi CHẶN đã biết, đã có hướng sửa, nhưng cách sửa là một quyết định
   giáo trình chứ không phải một dòng code — nên không được chặn mọi commit khác trong
   lúc chờ. Nợ vẫn phải kêu: mọi lần chạy gate đều in ra, kèm ngày ghi nhận và cách sửa.

   Waiver KHÔNG phải chỗ để làm cổng im. Nếu một waiver sống quá lâu thì hoặc sửa nó,
   hoặc thừa nhận cái cổng đó sai và bỏ cổng đi — đừng để danh sách này dài ra. */
const WAIVERS = join(HERE, 'waivers.json');
let waivers = [];
if (existsSync(WAIVERS)) waivers = JSON.parse(readFileSync(WAIVERS, 'utf8')).waivers || [];
function applyWaivers() {
  for (let i = fail.length - 1; i >= 0; i--) {
    const w = waivers.find(w => fail[i].includes(w.match));
    if (!w) continue;
    held.push({ msg: fail[i].split('\n')[0], w });
    fail.splice(i, 1);
  }
  for (const w of waivers) {
    if (!held.some(h => h.w === w)) W(`WAIVER "${w.match}" không còn khớp lỗi nào — đã sửa xong thì xoá khỏi waivers.json`);
  }
}

/* --- G-TOC-STRUCT / G-TOC-STALE: hai mức, cố ý khác nhau -----------------
   G-TOC-STRUCT (CHẶN)  — chữ ký cấu trúc lệch: bạn vừa thêm/xoá/đổi tên/dời/đổi vai
                          một bài. Đây là lúc PHẢI soi lại mục lục bằng đầu, nên nó
                          chặn và bắt bạn xác nhận có ý thức.
   G-TOC-STALE (nhắc)   — chỉ số dòng cũ. Máy móc, tự làm mới, không đáng chặn ai. */
const tocWanted = buildToc();
const tocOnDisk = existsSync(TOC) ? readFileSync(TOC, 'utf8') : null;
const sigOnDisk = tocOnDisk ? (SIG_RE.exec(tocOnDisk) || [])[1] : null;

if (has('--write')) {
  writeFileSync(TOC, tocWanted);
  console.log(sigOnDisk === SIG ? '· TOC.md: làm mới số dòng' : `· TOC.md: sinh lại (chữ ký ${sigOnDisk || 'chưa có'} → ${SIG})`);
} else if (!tocOnDisk) {
  F('G-TOC-STRUCT: chưa có TOC.md — chạy `node tools/gate.mjs --write`');
} else if (sigOnDisk !== SIG) {
  F(`G-TOC-STRUCT: cấu trúc mục lục đã đổi (${sigOnDisk || 'không đọc được chữ ký'} → ${SIG}).\n`
  + '    Bạn vừa thêm / xoá / đổi tên / dời / đổi ưu tiên-thời lượng một bài. TRƯỚC KHI sinh lại,\n'
  + '    tự trả lời bốn câu ở CLAUDE.md §6: đúng chặng chưa · thứ tự còn dễ→khó không · có làm\n'
  + '    bài nào phía trước thành dư không · có dùng khái niệm chưa được dạy không.\n'
  + '    Rồi: node tools/gate.mjs --write && git add TOC.md');
} else if (tocOnDisk !== tocWanted) {
  // Lúc đang sửa thì số dòng cũ chỉ là nhắc nhở. Nhưng lúc COMMIT thì không: bản commit
  // phải mang mục lục có số dòng đúng, nếu không thì phiên sau mở sai đoạn. `--ci` (hook
  // pre-commit dùng) nâng nó thành lỗi chặn.
  (has('--ci') ? F : W)('G-TOC-STALE: TOC.md còn số dòng cũ (cấu trúc vẫn đúng) — `node tools/gate.mjs --write` rồi `git add TOC.md`');
}

/* --- G-ROADMAP / G-ROADMAP-SUM: trang thứ hai cũng là SẢN PHẨM ------------
   `roadmap.html` được sinh từ đúng nguồn này (build-roadmap.mjs), và bộ sinh còn TRÍCH
   thẳng CSS/JS của trang chính (khối tương tác, tay kéo, đầu ngăn). Nên nó trôi khỏi nguồn
   trong im lặng đúng như TOC.md từng trôi — chỉ khác là ở đây một lần sửa trang chính là
   đủ làm bản đã sinh cũ, mà push main thì là deploy. Hai mức, cùng lý do tách như cặp
   G-TOC-STRUCT / G-TOC-STALE:

   G-ROADMAP     — file trên đĩa khác bản sinh lại. Máy móc, sửa bằng đúng một lệnh, nên
                   chỉ NHẮC lúc đang sửa; `--ci` (pre-commit / pre-push) nâng thành CHẶN.
   G-ROADMAP-SUM — phần KHÔNG sinh được: 84 bản tóm tắt do một workflow viết ra. Máy không
                   đọc được "tóm tắt này còn đúng không", nhưng đọc được "bài đã đổi kể từ
                   lúc tóm tắt được viết" nhờ vân tay nội dung đóng dấu trong
                   roadmap-summaries.json. (Audit 2026-08-06 đã tìm ra drift thật ở
                   `s-plan8w` bằng mắt — đây là cách để lần sau máy tìm.) Luôn chỉ NHẮC:
                   viết lại một bản tóm tắt là việc của người, không phải của lệnh.

   Import động + try: bộ sinh CỐ Ý ném lỗi khi không trích được CSS/JS từ trang chính (ai
   đổi tên một class là build đổ chứ không âm thầm mất luật). Ở đây phải bắt lấy, không thì
   cả bộ cổng chết theo với một stack trace thay vì một câu nói rõ chuyện gì. */
let RM = null, rmErr = null;
try { RM = await import('./build-roadmap.mjs'); } catch (e) { rmErr = e; }

if (rmErr) {
  (has('--ci') ? F : W)(`G-ROADMAP: không sinh được roadmap.html — ${rmErr.message}\n`
  + '    Bộ sinh trích CSS/JS thẳng từ trang chính; đổi tên class hoặc dời khối là nó ném.');
} else {
  const rmOnDisk = existsSync(RM.OUT) ? readFileSync(RM.OUT, 'utf8') : null;
  if (has('--write')) {
    writeFileSync(RM.OUT, RM.html);
    console.log(rmOnDisk === RM.html ? '· roadmap.html: không đổi' : '· roadmap.html: sinh lại từ nguồn');
  } else if (!rmOnDisk) {
    W('G-ROADMAP: chưa có roadmap.html — chạy `node tools/build-roadmap.mjs`');
  } else if (rmOnDisk !== RM.html) {
    (has('--ci') ? F : W)('G-ROADMAP: roadmap.html không còn khớp bản sinh lại từ nguồn — '
    + '`node tools/build-roadmap.mjs` rồi `git add roadmap.html`.\n'
    + '    (Đừng sửa tay roadmap.html: nó là SẢN PHẨM, lượt sinh sau xoá sạch.)');
  }

  const ids = new Set(LEAVES.map(l => l.id));
  const missing   = LEAVES.filter(l => !RM.sums[l.id]).map(l => l.id);
  const orphan    = Object.keys(RM.sums).filter(id => !ids.has(id));
  const stale     = LEAVES.filter(l => nodeTpl[l.id] && RM.srcHash[l.id]
                             && RM.srcHash[l.id] !== RM.nodeHash(nodeTpl[l.id].body)).map(l => l.id);
  const unstamped = LEAVES.filter(l => RM.sums[l.id] && !RM.srcHash[l.id]).map(l => l.id);

  if (missing.length) W(`G-ROADMAP-SUM: ${missing.length} bài chưa có bản tóm tắt trên trang học nhanh `
    + `(${missing.slice(0, 6).join(', ')}${missing.length > 6 ? '…' : ''}).\n`
    + '    Trang vẫn dựng được (dùng PAYOFF làm tldr tạm), nhưng node đó đọc mỏng hơn hẳn.');
  if (orphan.length) W(`G-ROADMAP-SUM: roadmap-summaries.json còn tóm tắt của bài không còn trong TREE `
    + `(${orphan.join(', ')}) — xoá đi.`);
  if (stale.length) W(`G-ROADMAP-SUM: ${stale.length} bài đã ĐỔI NỘI DUNG sau khi bản tóm tắt được viết `
    + `(${stale.slice(0, 8).join(', ')}${stale.length > 8 ? '…' : ''}).\n`
    + '    Đọc lại tóm tắt của CHÚNG: sai chỗ nào thì sửa trong roadmap-summaries.json; còn đúng thì\n'
    + '    đóng dấu lại bằng `node tools/build-roadmap.mjs --stamp`. Đóng dấu mà không đọc thì cổng\n'
    + '    này thành con dấu cao su.');
  if (unstamped.length) W(`G-ROADMAP-SUM: ${unstamped.length} bản tóm tắt chưa có vân tay nội dung — `
    + 'chạy `node tools/build-roadmap.mjs --stamp` một lần để lấy mốc.');
}

/* --- G-QUIZ / G-QUIZ-COV: câu hỏi trắc nghiệm tự kiểm ----------------------
   G-QUIZ (CHẶN)     — phần MÁY kiểm được: mỗi câu đủ trường, và `a` trỏ đúng một
                       đáp án CÓ THẬT. `a` lệch = bấm "Chấm điểm" chấm sai đáp án —
                       một lỗi chạy được, nên chặn. Câu hỏi có ĐÚNG/HAY không thì máy
                       không kiểm được: đó là việc đọc của người (như docs/writing.md).
   G-QUIZ-COV (nhắc) — bài chưa có câu nào. Chỉ liệt kê: thêm quiz là việc nội dung. */
{
  const quizIds = Object.keys(QUIZ);
  const badId = quizIds.filter(id => !byId[id]);
  if (badId.length) F(`G-QUIZ: QUIZ có bài không có trong TREE: ${badId.join(', ')} — sửa id hoặc xoá.`);

  const problems = [];
  for (const id of quizIds) {
    if (!byId[id]) continue;
    const qs = QUIZ[id];
    if (!Array.isArray(qs)) { problems.push(`${id}: QUIZ["${id}"] không phải mảng`); continue; }
    qs.forEach((q, i) => {
      const at = `${id} câu ${i + 1}`;
      if (!q || typeof q !== 'object') { problems.push(`${at}: không phải object`); return; }
      if (typeof q.q !== 'string' || !q.q.trim()) problems.push(`${at}: thiếu đề bài (q)`);
      const nOpt = Array.isArray(q.o) ? q.o.length : 0;
      if (nOpt < 2) problems.push(`${at}: cần ≥2 lựa chọn (o)`);
      else if (q.o.some(o => typeof o !== 'string' || !o.trim())) problems.push(`${at}: có lựa chọn rỗng`);
      if (!Number.isInteger(q.a)) problems.push(`${at}: đáp án đúng (a) phải là số nguyên`);
      else if (nOpt && (q.a < 0 || q.a >= nOpt)) problems.push(`${at}: a=${q.a} ngoài khoảng 0..${nOpt - 1}`);
      if (typeof q.why !== 'string' || !q.why.trim()) problems.push(`${at}: thiếu giải thích (why)`);
    });
  }
  if (problems.length) F(`G-QUIZ: ${problems.length} câu hỏi trắc nghiệm hỏng:\n    `
    + problems.slice(0, 12).join('\n    ') + (problems.length > 12 ? `\n    … và ${problems.length - 12} chỗ nữa` : ''));

  /* G-QUIZ-POS: giải thích trỏ tới VỊ TRÍ lựa chọn ("đáp án cuối", "phương án đầu").
     Máy không biết câu đó đang đúng hay sai, nhưng biết nó MONG MANH: đảo thứ tự
     lựa chọn một lần là nó nói sai, mà không cổng nào bắt được. Đo 2026-08-14: rải
     lại vị trí đáp án cho 453 câu làm 2/11 câu loại này thành sai thật. Cách viết
     đúng là gọi lựa chọn bằng NỘI DUNG: Phương án "…" sai ở chỗ… */
  const POSREF = /(đáp án|phương án|lựa chọn)\s+(cuối(?!\s*cùng\s*là\s*đúng)|đầu|thứ\s+(nhất|hai|ba|tư|[1-4]))/i;
  const posref = [];
  for (const id of quizIds) {
    if (!byId[id] || !Array.isArray(QUIZ[id])) continue;
    QUIZ[id].forEach((q, i) => {
      const m = typeof q?.why === 'string' && q.why.replace(/<[^>]+>/g, '').match(POSREF);
      if (m) posref.push(`${id} câu ${i + 1}: «${m[0]}»`);
    });
  }
  if (posref.length) W(`G-QUIZ-POS: ${posref.length} giải thích gọi lựa chọn theo VỊ TRÍ:\n    `
    + posref.slice(0, 8).join('\n    ') + (posref.length > 8 ? `\n    … và ${posref.length - 8} chỗ nữa` : '')
    + '\n    Đảo thứ tự lựa chọn là chúng nói sai. Gọi bằng nội dung: Phương án "…" sai ở chỗ…');

  /* G-QUIZ-COV: bài không có câu nào là ca nặng nhất, nhưng không phải ca hay gặp
     nhất. Đo 2026-08-14 trước lượt bổ sung: 0/84 bài trắng quiz, mà 29/84 bài có ít
     câu hơn số MỤC của chính nó — số câu được phát theo định mức ~6 câu/bài, không
     theo lượng nội dung (pr-eval 12 mục / 7 câu; f-store 3 mục / 3 câu). Nên cổng đo
     theo chuẩn "mỗi mục mạch chính ít nhất một câu" thay vì đếm có/không. */
  const noQuiz = LEAVES.filter(l => !QUIZ[l.id] || !QUIZ[l.id].length).map(l => l.id);
  if (noQuiz.length) W(`G-QUIZ-COV: ${noQuiz.length}/${LEAVES.length} bài chưa có câu hỏi trắc nghiệm tự kiểm `
    + `(${noQuiz.slice(0, 8).join(', ')}${noQuiz.length > 8 ? '…' : ''}).`);

  const thin = [];
  for (const l of LEAVES) {
    const n = (QUIZ[l.id] || []).length;
    if (!n || !nodeTpl[l.id]) continue;                 // ca trắng đã do dòng trên báo
    const heads = [...nodeTpl[l.id].body.matchAll(/<h([23])[^>]*>([\s\S]*?)<\/h\1>/g)]
      .map(m => m[2].replace(/<[^>]+>/g, '').trim()).filter(t => t.length > 2).length;
    if (n < heads) thin.push(`${l.id} (${n} câu / ${heads} mục)`);
  }
  if (thin.length) W(`G-QUIZ-COV: ${thin.length}/${LEAVES.length} bài có ít câu hơn số mục của chính nó:\n    `
    + thin.slice(0, 10).join(' · ') + (thin.length > 10 ? `\n    … và ${thin.length - 10} bài nữa` : '')
    + '\n    Không phải mục nào cũng đáng một câu, nhưng lệch nhiều thì gần như chắc là bỏ sót.');
}

/* --- G-ORDER: thứ tự template trong file == thứ tự học ------------------- */
const nodeOrder = tplBy('node').map(t => t.key);
const wantOrder = ['home', ...LEAVES.map(l => l.id)];
if (nodeOrder.join('|') !== wantOrder.join('|')) {
  const firstBad = nodeOrder.findIndex((k, i) => k !== wantOrder[i]);
  F(`G-ORDER: thứ tự khối <template data-node> trong file không khớp thứ tự TREE `
  + `(lệch đầu tiên ở vị trí ${firstBad}: file có "${nodeOrder[firstBad]}", TREE cần "${wantOrder[firstBad]}").\n`
  + '    Đọc file từ trên xuống PHẢI là đọc giáo trình theo đúng thứ tự học.');
}

/* --- G-NODE: mỗi bài đúng một template, mỗi template một bài ------------- */
for (const l of LEAVES) if (!nodeTpl[l.id]) F(`G-NODE: bài "${l.id}" trong TREE nhưng không có <template data-node>`);
for (const t of tplBy('node')) {
  if (t.key !== 'home' && !byId[t.key]) F(`G-NODE: có <template data-node="${t.key}"> nhưng TREE không có bài đó`);
}
for (const kind of ['node', 'aside', 'mathdef']) {
  const seen = new Set();
  for (const t of tplBy(kind)) {
    if (seen.has(t.key)) F(`G-NODE: data-${kind}="${t.key}" khai hai lần (dòng ${t.from})`);
    seen.add(t.key);
  }
}

/* --- G-REF: mọi tham chiếu phải giải được -------------------------------- */
const asideKeys = new Set(tplBy('aside').map(t => t.key));
const mathKeys  = new Set(tplBy('mathdef').map(t => t.key));
for (const t of TPL) {
  for (const k of refsIn(t.body, 'aside')) if (!asideKeys.has(k)) F(`G-REF: ${t.key} mở data-aside="${k}" không tồn tại`);
  for (const k of refsIn(t.body, 'math'))  if (!mathKeys.has(k))  F(`G-REF: ${t.key} mở data-math="${k}" không tồn tại`);
  for (const k of refsIn(t.body, 'goto'))  if (!byId[k])          F(`G-REF: ${t.key} có data-goto="${k}" không phải bài nào`);
  for (const m of t.body.matchAll(/href="#\/([^"]+)"/g)) {
    if (m[1] !== 'home' && !byId[m[1]]) F(`G-REF: ${t.key} liên kết #/${m[1]} không tồn tại`);
  }
}

/* --- G-ORPHAN: nhánh phụ không ai mở là nhánh phụ chết ------------------- */
for (const t of [...tplBy('aside'), ...tplBy('mathdef')]) {
  const attr = t.kind === 'aside' ? 'aside' : 'math';
  if (!tplBy('node').some(n => refsIn(n.body, attr).includes(t.key)))
    F(`G-ORPHAN: ${t.kind}="${t.key}" (dòng ${t.from}) không bài nào mở — hoặc nối vào một bài, hoặc xoá`);
}

/* --- G-PAYOFF: mọi bài phải khai kết quả --------------------------------
   Không chỉ là kỷ luật viết: dải "Xong bài này bạn có" ở ĐẦU mỗi bài đọc trực tiếp
   từ PAYOFF[id][0]. Thiếu PAYOFF = bài không có mục tiêu hiện trên trang. */
for (const l of LEAVES) {
  const g = PAYOFF[l.id];
  if (!g) { F(`G-PAYOFF: bài "${l.id}" thiếu PAYOFF → đầu bài không có dòng mục tiêu`); continue; }
  if (!Array.isArray(g) || g.length !== 2 || !g[0] || !g[1]) F(`G-PAYOFF: "${l.id}" PAYOFF phải là [kết quả, dẫn tới đâu]`);
  else if (g[0].length < 25) W(`G-PAYOFF: "${l.id}" mục tiêu quá ngắn để nói được kết quả: "${g[0]}"`);
}

/* --- G-SYNTAX: script của trang phải phân tích được ---------------------
   Vì sao cổng này tồn tại: 2026-08-04 một phiên thêm một comment HTML vào TRONG một
   template literal của `renderHome()`, và comment đó chứa dấu backtick. Một dấu backtick
   là đứt template, đứt template là `SyntaxError`, và `SyntaxError` trong <script> nghĩa là
   KHÔNG hàm nào được định nghĩa: router chết, trang chỉ còn cái vỏ. Cả 9 cổng CHẶN lúc đó
   vẫn xanh — vì tất cả chúng đọc HTML như VĂN BẢN, không cổng nào hỏi "đoạn script này có
   chạy được không".

   Đó là loại lỗi tệ nhất mà bộ cổng này có thể bỏ sót: hậu quả tối đa (trang trắng), dấu
   hiệu tối thiểu (diff nhìn vô hại — chỉ là một comment), và người sửa CSS thì không có lý
   do nào để mở trình duyệt kiểm lại JS. Máy phải bắt.

   Cách kiểm: bóc script dài nhất (script chính của trang) rồi nhờ `new Function` phân tích.
   Chỉ PHÂN TÍCH, không chạy — nên không cần DOM, không có tác dụng phụ, và mất ~10ms. */
{
  const scripts = [...src.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  if (!scripts.length) F('G-SYNTAX: không tìm thấy khối <script> nào trong trang — router không thể chạy');
  else {
    const main = scripts.reduce((a, b) => (b.length > a.length ? b : a));
    try {
      new Function(main);
    } catch (e) {
      // Đếm dòng để chỉ đúng chỗ trong FILE, không phải trong đoạn đã bóc ra.
      const at = src.indexOf(main);
      const base = at < 0 ? 0 : src.slice(0, at).split('\n').length;
      F(`G-SYNTAX: script chính của trang không phân tích được — ${e.message}\n` +
        `    Cả trang sẽ trắng: SyntaxError nghĩa là không hàm nào được định nghĩa.\n` +
        `    Khối script bắt đầu ở dòng ~${base}. Nghi phạm số 1: dấu backtick trong một\n` +
        `    comment HTML nằm bên trong template literal (đã dính một lần) — xem CLAUDE.md §4.`);
    }
  }
}

/* --- G-NO-DETAILS: kiến thức không được ẩn bằng gập tại chỗ -------------
   Trang rất dài. Một <details> mở ra làm nội dung nhảy xuống, người đọc phải cuộn
   ngược lên tìm lại chỗ đang đọc. Nhánh phụ đi vào popup (mặc định) hoặc ngăn phải. */
for (const t of TPL) {
  if (/<details[\s>]/i.test(t.body)) F(`G-NO-DETAILS: ${t.key} dùng <details> cho nội dung — chuyển sang popup (data-math) hoặc ngăn phải (data-aside)`);
}

/* --- G-FWD: không dùng khái niệm trước khi dạy nó ------------------------
   Gate này bắt loại lỗi mà auditPlan() trong trang KHÔNG bắt được: auditPlan chỉ
   kiểm các phụ thuộc đã KHAI (WEEKS.needs), còn phụ thuộc thật thì nằm trong chữ.
   Một bài có thể yêu cầu "in PR-AUC" ở tiêu chí đạt trong khi PR-AUC được dạy sáu
   bài sau — mọi con số vẫn khớp, giáo trình vẫn sai. */
let CONCEPT_MAP = {};
if (existsSync(CONCEPTS)) CONCEPT_MAP = JSON.parse(readFileSync(CONCEPTS, 'utf8')).concepts || {};
else W('G-FWD: chưa có tools/concepts.json — cổng chống dùng-trước-khi-dạy đang tắt');

for (const [term, spec] of Object.entries(CONCEPT_MAP)) {
  const defIn = spec.definedIn;
  if (!byId[defIn]) { F(`G-FWD: concepts.json khai "${term}" được dạy ở "${defIn}" — không có bài đó`); continue; }
  const defAt = orderOf[defIn];
  const allow = new Set(spec.allowEarly || []);
  const re = new RegExp(spec.pattern || escRe(term), 'gi');

  /* Gộp theo KHÁI NIỆM, không phải theo bài: "PR-AUC bị dùng sớm ở 11 bài, sớm nhất
     là s-pipeline" là một quyết định phải ra (dời bài dạy lên? định nghĩa sớm?), còn
     11 dòng cảnh báo gần y hệt nhau thì chỉ dạy người ta bỏ qua cảnh báo. */
  const early = [];
  for (const l of LEAVES) {
    if (orderOf[l.id] >= defAt || allow.has(l.id)) continue;
    const t = nodeTpl[l.id];
    if (t && new RegExp(re.source, 'i').test(t.body)) early.push(l.id);
    // Tiêu chí đạt là chỗ nguy hiểm nhất: nó BẮT người học làm, không chỉ đọc.
    const acc = ACCEPT[l.id];
    if (acc && acc.some(c => new RegExp(re.source, 'i').test(c.v))) {
      F(`G-FWD: tiêu chí đạt của "${l.id}" (thứ ${orderOf[l.id] + 1}) đòi "${term}", nhưng "${term}" mới được dạy ở "${defIn}" (thứ ${defAt + 1}).\n`
      + '    Người học không thể đạt một tiêu chí dựa trên thứ chưa được dạy.');
    }
  }
  if (early.length) {
    W(`G-FWD: "${term}" được dùng ở ${early.length} bài TRƯỚC bài dạy nó ("${defIn}", thứ ${defAt + 1}); `
    + `sớm nhất là "${early[0]}" (thứ ${orderOf[early[0]] + 1}).\n`
    + `    Bài: ${early.join(', ')}\n`
    + `    Chọn một: (a) dời "${defIn}" lên trước — nếu nhiều bài đã cần nó thì đây thường là câu trả lời đúng;\n`
    + '    (b) định nghĩa một câu tại lần dùng đầu tiên; (c) thêm vào allowEarly kèm allowWhy nếu chỉ là nêu tên để định vị.');
  }
  // và trong lịch 8 tuần
  const defWeek = weekOf[defIn];
  for (const w of WEEKS) {
    if (defWeek && w.n < defWeek && w.out && re.test(w.out)) {
      F(`G-FWD: deliverable tuần ${w.n} đòi "${term}" nhưng bài dạy nó ("${defIn}") nằm ở tuần ${defWeek}.`);
    }
  }
}
function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/* --- G-LAYER (khuyến nghị): nhánh phụ còn nằm trên mạch chính ------------
   Không có cách tự động nào phân biệt chắc chắn "mạch chính" với "đào sâu". Nhưng có
   một chỗ mà nhánh phụ TỰ TỐ GIÁC gần như chắc chắn: TIÊU ĐỀ MỤC. Một <h2> tên là
   "Thứ bạn có thể bỏ qua" hay "Cách 4 · …" là một mục tự khai mình không nằm trên
   đường đi — và một mục thì nặng hơn một câu, nên đáng soát.

   Chỉ quét h2/h3, KHÔNG quét cả thân bài: quét thân bài bắt đúng những câu dẫn hợp
   lệ ("chưa cần deploy gì"), và nhất là bắt luôn nhãn của các chip mở nhánh phụ —
   tức là bắt đúng chỗ quy tắc đang được TUÂN THỦ. Cảnh báo sai kiểu đó làm người ta
   tắt cả cổng.

   Thoát cửa: viết `<!-- gate:main -->` ngay trước tiêu đề nếu mục đó thật sự thuộc
   mạch chính (ví dụ một so sánh mà cả bài phải dựa vào để quyết định). */
/* Chỉ hai họ mẫu, cả hai đều CHÍNH XÁC CAO:
   (1) mục tự khai là không cần thiết;
   (2) mục SO SÁNH SẢN PHẨM — nhận ra bằng cách đếm tên công cụ trong tiêu đề, chứ
       KHÔNG bằng chữ "vs"/"hay"/"Cách 2". Trang này dùng "Cách 2 · …", "Cách 3 · …"
       để dạy tăng dần độ nghiêm túc của cùng một việc (f-cyclic, ml-metrics) — đó là
       mạch chính đúng nghĩa, bắt nó là bắt sai. Còn "IEEE-CIS hay PaySim", "XGBoost
       hay LightGBM" thì gần như luôn là mua sắm công cụ: thuộc ngăn so sánh. */
const TOOLS = /\b(pandas|polars|numpy|sklearn|scikit-learn|DuckDB|SQLite|PostgreSQL|MySQL|LightGBM|XGBoost|CatBoost|Optuna|MLflow|W&B|SHAP|LIME|FastAPI|Flask|Django|Docker|Streamlit|Gradio|Colab|Codespaces|Kaggle|Prophet|ARIMA|ETS|LSTM|Transformer|PyTorch|TensorFlow|Keras|Feast|Tecton|DVC|Overleaf|IEEE-CIS|PaySim|ULB|Hugging Face|Vertex AI|Databricks|Airflow|dbt|Spark)\b/gi;
const OPTIONAL_HEAD = [
  h => /có thể bỏ qua|bỏ qua được|chưa cần|không bắt buộc|không cần dùng|nếu bạn muốn|nếu bạn thích/i.test(h)
       && 'mục tự khai là không cần thiết',
  h => /đọc thêm|đào sâu|tên để biết|mỏ đề tài|ngoài phạm vi|xếp theo công sức/i.test(h)
       && 'mục tự khai là phần thêm',
  h => /chọn (bộ|thư viện|công cụ|framework|thuật toán) nào/i.test(h)
       && 'mục đi chọn công cụ/dữ liệu',
  // đếm tên KHÁC NHAU: "dùng Colab đúng cách … Colab là chỗ chạy" nhắc một tên hai
  // lần, không phải so sánh hai sản phẩm.
  h => new Set((h.match(TOOLS) || []).map(s => s.toLowerCase())).size >= 2
       && 'mục so sánh ≥2 sản phẩm cụ thể',
];
for (const t of tplBy('node')) {
  const nlines = t.to - t.from;
  /* Bài quá dài là TÍN HIỆU, không phải lỗi: có bài dài vì catalogue lọt lên mạch chính
     (phải sửa), có bài dài vì nó thật sự là sáu file nguồn phải gõ (không sửa được mà
     không cắt mất nội dung). Cổng không phân biệt được hai ca đó, nên nó hỏi người.
     Trả lời bằng <!-- gate:long: lý do --> trong template — cùng cơ chế với gate:main.
     Không có escape hatch thì bốn khuyến nghị này ở lại mãi, và một danh sách khuyến
     nghị không bao giờ về 0 sẽ bị bỏ qua toàn bộ. */
  const longOk = /<!--\s*gate:long:/.test(t.body);
  if (nlines > 200 && !longOk)
    W(`G-LAYER: bài "${t.key}" dài ${nlines} dòng (${t.from}–${t.to}) — bài dài thường là chỗ catalogue/so sánh/đào sâu lọt lên mạch chính. Soát thủ công.\n`
    + '    Soát rồi mà dài là đúng (ví dụ: bài đi qua nhiều file nguồn): ghi\n'
    + '    <!-- gate:long: lý do cụ thể --> trong template để khuyến nghị này im.');
  for (const m of t.body.matchAll(/<h([23])[^>]*>([\s\S]*?)<\/h\1>/g)) {
    const head = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const before = t.body.slice(Math.max(0, m.index - 120), m.index);
    if (/gate:main/.test(before)) continue;
    let why = null;
    for (const test of OPTIONAL_HEAD) { const r = test(head); if (r) { why = r; break; } }
    if (!why) continue;
    const at = t.from + t.body.slice(0, m.index).split('\n').length - 1;
    W(`G-LAYER: "${t.key}" dòng ~${at} — ${why}: "${head}"\n`
    + '    → popup (data-math) nếu là đào sâu/công thức/catalogue; ngăn phải (data-aside) nếu là so sánh\n'
    + '      cần đọc song song với mạch chính; hoặc cắt. Nếu thật là mạch chính: <!-- gate:main --> trước tiêu đề.');
  }
}

/* --- G-DUMP (khuyến nghị): đổ dữ liệu thay vì nói ý ---------------------
   "Ngày 1 5,8 giờ, ngày 2 5,3 giờ, … ngày 14 5,8 giờ." — đúng dữ liệu, vô dụng với
   người đọc: mắt đã thấy các con số đó trên hình, và một dãy 14 số chôn mất điều duy
   nhất cái hình muốn nói. Đây là lỗi khó tự thấy nhất khi viết, vì nó *cảm giác* như
   đang đầy đủ và cẩn thận.

   Hai dấu vết bắt được bằng máy:
     (1) mô tả hình được sinh bằng cách map cả một mảng dữ liệu rồi join — dấu hiệu
         gần như chắc chắn của việc liệt kê thay vì tóm ý;
     (2) một đoạn văn trên mạch chính có mật độ CHỮ SỐ quá cao — bảng bị viết thành
         câu, hoặc câu bị nhồi số. */
const DATA_ARRAYS = /\b(DAYS|WEEKS|LEAVES|TREE|COMPS|PORTFOLIO|COLS)\b/;
const scriptBlock = src.slice(src.indexOf('<script>', src.indexOf('</style>')));
for (const m of scriptBlock.matchAll(/([A-Za-z_$][\w$.\[\]"'-]*)\s*\.textContent\s*=([\s\S]{0,400}?);\n/g)) {
  const target = m[1], body = m[2];
  // Chỉ soi mô tả HIỆN RA (.ds-viz__alt). <desc> của SVG thì ngược lại: đó đúng là chỗ
  // để số liệu thô cho trình đọc màn hình, liệt kê ở đó là làm đúng.
  if (!/alt/i.test(target) || /desc/i.test(target)) continue;
  if (!/\.map\(/.test(body) || !/\.join\(/.test(body)) continue;
  if (!DATA_ARRAYS.test(body)) continue;
  const at = scriptBlock.slice(0, m.index).split('\n').length
    + src.slice(0, src.indexOf('<script>', src.indexOf('</style>'))).split('\n').length - 1;
  W(`G-DUMP: dòng ~${at} — mô tả hình sinh bằng map+join trên cả mảng dữ liệu (${(DATA_ARRAYS.exec(body) || [])[1]}).\n`
  + '    Mô tả hình phải nói HÌNH DẠNG và hai đầu mút, không đọc lại từng giá trị (mắt đã\n'
  + '    thấy chúng rồi). Số liệu thô, nếu cần cho trình đọc màn hình, để trong <desc> của SVG.');
}
for (const t of tplBy('node')) {
  for (const m of t.body.matchAll(/<p(?![^>]*class="[^"]*(?:ds-viz__alt|ds-srcline)[^"]*")[^>]*>([\s\S]*?)<\/p>/g)) {
    const txt = m[1].replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
    if (txt.length < 200) continue;
    const digits = (txt.match(/\d/g) || []).length;
    const commaRuns = (txt.match(/\d[^,;.]{0,18},/g) || []).length;
    if (digits / txt.length > 0.14 && commaRuns >= 6) {
      const at = t.from + t.body.slice(0, m.index).split('\n').length - 1;
      W(`G-DUMP: "${t.key}" dòng ~${at} — đoạn văn ${txt.length} ký tự với ${digits} chữ số và ${commaRuns} cụm số ngăn bằng phẩy.\n`
      + `    Có mùi bảng bị viết thành câu: …${txt.slice(0, 70)}…\n`
      + '    Nếu là dữ liệu thì dùng <table>; nếu là ý thì nói ý rồi bỏ bớt số.');
    }
  }
}

/* --- G-VIZ (khuyến nghị): bài nào chưa có gì để NHÌN --------------------
   Không ép: có khái niệm không visualize được. Chỉ liệt kê để không bỏ sót bài
   đáng vẽ mà chưa vẽ.

   Phải tính cả các hộp do JS dựng lúc chạy (planWeeks / planDays / planRest…):
   trong nguồn chúng chỉ là một <div> rỗng, nhưng trên trang chúng LÀ cái bảng của
   bài. Không tính chúng thì cổng báo sai — và một khuyến nghị báo sai sẽ bị bỏ qua,
   kéo theo cả những khuyến nghị đúng nằm cùng danh sách. */
const noVisual = tplBy('node').filter(t => t.key !== 'home')
  .filter(t => !/ds-viz|<table|ds-code|data-viz=|<div id="plan/.test(t.body))
  .map(t => t.key);
if (noVisual.length) W(`G-VIZ: ${noVisual.length} bài không có hình / bảng / khối code nào: ${noVisual.join(', ')}`);

/* --- G-ABS (khuyến nghị): ngưỡng số được viết như quy luật ---------------
   Lỗi hay gặp nhất trong bản audit 2026-08-07 không phải "nói sai" mà "nói chắc quá":
   một con số đúng trong MỘT bối cảnh được viết thành quy tắc chung. Ví dụ thật đã có
   trên trang: "cột thiếu > 60% và không mang thông tin → bỏ cột" — con số 60 không có
   nguồn nào, và người mới đọc nó như một ngưỡng chuẩn của ngành.

   Vì sao cổng này HẸP đến thế (và không phải một cổng "từ tuyệt đối" chung):
   đã thử bản rộng — quét `luôn`, `duy nhất`, `bảo đảm`, `không bao giờ` — và trên nội
   dung hiện tại nó cho 22 kết quả mà gần như tất cả là dương tính giả: câu phủ định
   ("GPU không được bảo đảm"), câu trích tài liệu nhà cung cấp, và cả chính những đoạn
   đang SỬA một tuyên bố tuyệt đối (đoạn giải thích "trần lý thuyết của AP là 1" bị bắt
   vì nó chứa cụm đó). Một khuyến nghị sai nhiều hơn đúng thì kéo cả danh sách xuống,
   nên bản giữ lại chỉ bắt đúng một HÌNH DẠNG CÂU: ngưỡng phần trăm + mệnh lệnh, không
   có từ nào hạ giọng ở gần.

   Thoát cửa: <!-- gate:abs: lý do --> ngay trước khối, khi con số THẬT SỰ là một ràng
   buộc cứng (hạn mức nhà cung cấp, quy định) chứ không phải kinh nghiệm. */
const ABS_RULE  = /(?:[>≥<≤]|trên|dưới|vượt|quá|hơn)\s*\d+(?:[.,]\d+)?\s*%[^.;]{0,60}(?:thì|→)/i;
const ABS_RULE2 = /(?:nên|hãy|phải|luôn)[^.;]{0,50}(?:[>≥<≤]|trên|dưới|ít nhất|tối thiểu)\s*\d+(?:[.,]\d+)?\s*%/i;
const ABS_HEDGE = /thường|tuỳ|tùy|minh hoạ|minh họa|khởi đầu|phụ thuộc|khoảng|ước lượng|kinh nghiệm|hay gặp|\bmốc\b|ví dụ|điển hình|không phải quy luật|tham khảo|dao động|không phải|chứ không/i;
for (const t of tplBy('node')) {
  if (/<!--\s*gate:abs\b/.test(t.body)) continue;
  /* Đổi &gt;/&lt; thành ký tự thật TRƯỚC khi bỏ thực thể — trong HTML mọi dấu so sánh
     đều được viết dưới dạng thực thể, nên xoá chúng cùng lượt là cổng mù đúng thứ nó
     đi tìm. (Chính ca test G-ABS đã lộ ra lỗi này.) */
  const text = t.body.replace(/<div class="ds-code">[\s\S]*?<\/div>/g, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&ge;/g, '≥').replace(/&le;/g, '≤');
  for (const s of text.split(/(?<=[.!?])\s+|\n/)) {
    const c = s.replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
    if (c.length < 25) continue;
    if (!ABS_RULE.test(c) && !ABS_RULE2.test(c)) continue;
    if (ABS_HEDGE.test(c)) continue;
    W(`G-ABS: "${t.key}" — ngưỡng % đang được viết như quy luật:\n`
    + `    …${c.slice(0, 110)}…\n`
    + '    Gắn nhãn nó là điểm khởi đầu (thường / tuỳ / mốc minh hoạ / phụ thuộc…), hoặc nói\n'
    + '    con số đó đo ở đâu ra. Nếu đây là ràng buộc cứng thật: <!-- gate:abs: lý do -->');
  }
}

/* --- G-MEASURE (khuyến nghị): canh trôi khổ chữ -------------------------
   Cả trang chỉ được có MỘT mép phải: cột nội dung đúng bằng khổ chữ, và chỉ bảng
   được tràn ra hai bên. Mỗi max-width bằng px/ch viết rời trong CSS là một mép
   thứ hai đang hình thành. (Mô hình "hai mép" cũ đã bỏ từ phiên 2026-08-04 (d).) */
const cssBlock = src.slice(src.indexOf('<style>'), src.indexOf('</style>'));
for (const m of cssBlock.matchAll(/^\s*(\.[a-z0-9_-]+[^{\n]*)\{[^}\n]*max-width:\s*(\d+(?:px|ch))/gim)) {
  if (/--ds-measure|ds-mathmodal|ds-drawer|ds-viz svg/.test(m[1])) continue;
  W(`G-MEASURE: "${m[1].trim()}" đặt max-width cứng ${m[2]} — dùng var(--ds-measure) hoặc để nó chạm mép cột`);
}

/* --- G-SPACING (khuyến nghị): margin dọc còn viết px trần ----------------
   docs/design.md §0.6 chốt ranh giới bằng đúng một câu: "`margin` giữa hai khối anh
   em thì LÊN thang; `padding` trong lòng một component thì KHÔNG" — và nói luôn cách
   tự kiểm: grep margin dọc còn px trần. Đây là cái grep đó, thành cổng.

   Vì sao đáng có: `G-MEASURE` canh `max-width` cứng, nhưng KHÔNG cổng nào bắt được
   "vừa viết `margin-bottom: 17px` tại chỗ" — mà đó chính là cách thang khoảng cách
   trôi trở lại 9 nhịp như trước khi token hoá. Nợ này đã nằm trong HANDOFF từ phiên
   (k); chạy thử lần đầu ra 9 chỗ, và cả 9 đều rơi ĐÚNG vào một bậc có sẵn (4/6/8/14)
   — tức là drift thật, không phải cổng bắt sai.

   Hai thứ KHÔNG bắt, vì §0.6 cho phép có chủ ý:
     · |giá trị| ≤ 5px — nhích quang học bên trong một component (bù đường viền icon…).
     · `padding`, và margin NGANG — đó là hình dạng của component, không phải nhịp trang.
   Thoát cửa khi thật sự cần px trần: viết `/* gate:sp: lý do *␘/` ngay trên dòng đó. */
{
  const styleStart = src.indexOf('<style>') + 7;
  const before = src.slice(0, styleStart).split('\n').length;
  const lines = src.slice(styleStart, src.indexOf('</style>')).split('\n');
  let sel = '';
  lines.forEach((ln, i) => {
    const s = ln.match(/^\s*([^{}]+)\{/);
    if (s) sel = s[1].trim();
    if (/gate:sp\b/.test(ln) || /gate:sp\b/.test(lines[i - 1] || '')) return;
    for (const m of ln.matchAll(/(?:^|[;{\s])margin(-top|-bottom)?\s*:\s*([^;}]+)/g)) {
      const val = m[2].trim();
      if (!/\dpx/.test(val)) continue;
      // shorthand `margin`: trục dọc là ô 1 và 3 (1 nếu chỉ có 1–2 ô)
      const parts = val.split(/\s+/);
      const vert = m[1] ? [val]
        : (parts.length >= 3 ? [parts[0], parts[2]] : [parts[0]]);
      const bad = vert.filter(v => /px$/.test(v || '') && Math.abs(parseFloat(v)) > 5);
      if (bad.length) {
        W(`G-SPACING: "${sel.slice(0, 48)}" (dòng ${before + i}) đặt margin dọc ${bad.join(' / ')} trần`
        + ' — trỏ vào một bậc --ds-sp-* (docs/design.md §0.6)');
      }
    }
  });
}

/* --- G-PLAN: lịch học nhất quán -----------------------------------------
   Đây là các kiểm tra mà `auditPlan()` trong trang chạy — tổng giờ giữa các cách
   xem phải khớp, mọi bài phải nằm ở đúng một tuần, ngày fast track phải 3,5–6,5
   giờ, deliverable không được dựa vào bài dạy sau nó.

   Trước đây muốn chạy chúng phải mở trình duyệt và gõ tay vào Console, nên trên
   thực tế chúng bị bỏ. Giờ chạy cùng các cổng khác. Luật nằm ở tools/plan.mjs. */
for (const m of checkPlan(P)) F(`G-PLAN: ${m}`);

/* --- G-NEXT (khuyến nghị): "bài sau" đã đổi, câu văn thì chưa ------------
   PAYOFF[id][1] là câu "bài sau dùng nó để…", và nó hiện ra ở cuối mỗi bài. Dời
   một bài thì câu đó lập tức trỏ sai — nhưng không cổng nào bắt được, vì đây là
   văn xuôi chứ không phải tham chiếu. Tài liệu đã ghi ba lần rằng "phải tự nhớ".

   Máy không đọc được nội dung câu, nhưng đọc được ĐIỀU KIỆN làm câu đó thành
   sai: bài đứng sau đã đổi. TOC.md trên đĩa còn giữ thứ tự cũ, nên chỉ cần so
   hai thứ tự là biết chính xác những câu nào cần đọc lại. */
function tocOrder(md) {
  const out = [];
  for (const line of md.split('\n')) {
    if (/^## Nhánh phụ/.test(line)) break;          // hết bảng bài, sang bảng nhánh phụ
    const m = /^\|\s*`([a-z0-9-]+)`\s*\|/.exec(line);
    if (m) out.push(m[1]);
  }
  return out;
}
if (tocOnDisk) {
  const old = tocOrder(tocOnDisk);
  const wasThere = new Set(old);
  const oldNext = {};
  old.forEach((id, i) => { if (i + 1 < old.length) oldNext[id] = old[i + 1]; });
  const changed = old.filter(id => byId[id] && oldNext[id] !== nextOf[id]);
  if (changed.length) {
    W(`G-NEXT: ${changed.length} bài có BÀI SAU đã đổi — đọc lại câu "bài sau…" trong PAYOFF của chúng:\n`
    + changed.slice(0, 12).map(id =>
        `      ${id}: bài sau ${oldNext[id] || '(không có)'} → ${nextOf[id] || '(không có)'}`).join('\n')
    + (changed.length > 12 ? `\n      … và ${changed.length - 12} bài nữa` : '')
    + '\n    Câu đó hiện ra ở cuối bài, nên sai là người đọc thấy. Máy chỉ biết bài sau đã đổi,\n'
    + '    không đọc được câu — nên đây là việc của mắt. Sửa xong: node tools/gate.mjs --write');
  }
  for (const l of LEAVES) if (!wasThere.has(l.id)) W(`G-NEXT: bài mới "${l.id}" — nhớ sửa PAYOFF của bài ĐỨNG TRƯỚC nó, câu "bài sau…" của bài đó giờ trỏ sai`);
}

/* --- G-HOOK (khuyến nghị): ba lớp tự động đã cài chưa -------------------
   Cả .git/hooks/ lẫn .claude/ đều không được git theo dõi, nên hook không tự
   theo repo về máy mới. Hệ quả: mọi thứ trong CLAUDE.md §3 mô tả có thể đang tắt
   mà không ai biết — và đã từng đúng như vậy.

   Bỏ qua khi chạy với --ci: lúc đó chính hook đang gọi ta, nên nó rõ ràng đã cài. */
const GITROOT = join(ROOT, '..', '..');
if (!has('--ci')) {
  // Luật "đã cài chưa" nằm ở tools/hook-state.mjs — MỘT bản, vì session.mjs hỏi đúng
  // câu này và hai bản trả lời đã từng lệch nhau (xem đầu file đó).
  const layers = hookLayers({ hooksDir: join(HERE, 'hooks'), gitRoot: GITROOT });
  const off = layers.filter(l => !l.ok);
  if (off.length) {
    W(`G-HOOK: ${off.length}/3 lớp tự động chưa cài — ` + layers.map(l => `${l.what}: ${l.ok ? 'có' : 'CHƯA'}`).join(' · ') + '\n'
    + '    Chạy: tools/install-hooks.sh, rồi sh ../../facts/tools/install-hooks.sh (một lần cho mỗi máy / mỗi bản clone)\n'
    + '    Chưa cài thì cổng chỉ chạy khi bạn tự gõ tay — mọi thứ CLAUDE.md §3 mô tả đang tắt.');
  }
}

/* --- G-HANDOFF (khuyến nghị): đổi trang mà không ghi lại -----------------
   CLAUDE.md §12 bắt buộc ghi HANDOFF "đã sửa gì, cố ý KHÔNG sửa gì và vì sao".
   Mục thứ hai là thứ giữ cho phiên sau không làm lại việc đã cân nhắc và bỏ qua —
   và nó không thể suy ra được từ diff, nên nếu không ai gõ thì nó mất hẳn.

   Máy không đọc được HANDOFF có ĐÚNG hay không, nhưng đọc được điều kiện cần: có
   đổi trang/bộ cổng mà HANDOFF không nằm trong cùng lần đổi đó. */
function gitLines(...args) {
  try {
    return execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\n').filter(Boolean);
  } catch { return null; }
}
{
  // Lúc commit thì xét đúng những gì đang được commit; lúc chạy tay thì xét worktree.
  // `-uall`: mặc định git GỘP một thư mục chưa theo dõi thành một dòng (`?? thumuc/`),
  // nên tên file bên trong không xuất hiện và cổng tưởng không có gì đổi.
  const files = has('--ci')
    ? gitLines('diff', '--cached', '--name-only', '--', '.')
    : (gitLines('status', '--porcelain', '-uall', '--', '.') || []).map(l => l.slice(3).trim());
  if (files) {
    const hit = s => files.some(f => f.includes(s));
    const substantive = hit('data-science-roadmap.html') || hit('/tools/');
    if (substantive && !hit('HANDOFF.md')) {
      W('G-HANDOFF: có đổi trang hoặc bộ cổng, mà HANDOFF.md không đổi.\n'
      + '    Khung điền trước: node tools/session.mjs --close\n'
      + '    Phần đáng ghi nhất không phải "đã sửa gì" (diff nói được) mà "cố ý KHÔNG sửa gì\n'
      + '    và vì sao" — không ghi thì phiên sau cân nhắc lại đúng thứ bạn đã bỏ.');
    }
  }
}

/* --- G-LEARN (khuyến nghị): sổ học ---------------------------------------
   Luật nằm ở learn.mjs, cùng khuôn với G-PLAN ↔ plan.mjs: gate.mjs chỉ gọi.
   Không có LEARNING-LOG.md thì cổng im — nó là dữ liệu của người học, không phải
   thứ trang cần để sống. */
for (const m of checkLearn(P)) W(m);

/* --- G-DOC (khuyến nghị): cổng nào có trong code thì phải có trong tài liệu */
const CLAUDEMD = join(ROOT, 'CLAUDE.md');
if (existsSync(CLAUDEMD)) {
  const doc = readFileSync(CLAUDEMD, 'utf8');
  const missing = GATES.map(g => g[0]).filter(n => !doc.includes(n));
  if (missing.length) {
    W(`G-DOC: ${missing.length} cổng có trong code nhưng CLAUDE.md không nhắc tên: ${missing.join(', ')}\n`
    + '    Bảng cổng trong tài liệu là thứ người ta đọc để biết máy đang canh gì. Bảng thiếu\n'
    + '    thì người ta canh lại bằng tay những thứ máy đã canh, hoặc tưởng máy canh thứ nó không canh.\n'
    + '    Xem danh sách đầy đủ: node tools/gate.mjs --gates');
  }
}

/* ---------------------------------------------------------------------------
   4. Chế độ tra cứu — để không phải mở cả file
   ------------------------------------------------------------------------- */
if (has('--gates')) {
  console.log('Cổng đang chạy — "chặn" là chặn commit, "nhắc" là khuyến nghị:\n');
  const w = Math.max(...GATES.map(g => g[0].length));
  for (const [name, kind, what] of GATES) {
    console.log(`  ${name.padEnd(w)}  ${kind}  ${what}`);
  }
  console.log(`\n  ${GATES.filter(g => g[1] === 'chặn').length} cổng chặn · ${GATES.filter(g => g[1] === 'nhắc').length} cổng nhắc`);
  process.exit(0);
}

if (arg('--show') || arg('--where')) {
  const id = arg('--show') || arg('--where');
  const t = nodeTpl[id] || TPL.find(x => x.key === id);
  if (!t) { console.error(`không có bài / nhánh phụ nào tên "${id}"`); process.exit(2); }
  const l = byId[id];
  console.log(`# ${id} — ${l ? l.t : t.title}`);
  if (l) {
    console.log(`chặng ${l.phase.id} ${l.phase.t} · ưu tiên ${PRIO_LABEL[l.p]} · r${l.r}/x${l.x}/d${l.d}`
      + (FAST.has(id) ? ' · fast track' : '') + (weekOf[id] ? ` · tuần ${weekOf[id]}` : ''));
    if (PAYOFF[id]) console.log(`mục tiêu: ${PAYOFF[id][0]}\ndẫn tới: ${PAYOFF[id][1]}`);
    if (SCOPE[id]) console.log(`phạm vi: ${SCOPE[id]}`);
    if (ACCEPT[id]) console.log(`tiêu chí đạt: ${ACCEPT[id].length} dòng`);
  }
  console.log(`dòng ${t.from}–${t.to} trong data-science-roadmap.html`);
  if (arg('--show')) {
    console.log('---');
    for (let i = t.from; i <= t.to; i++) console.log(String(i).padStart(5) + '  ' + (lines[i - 1] ?? ''));
  }
  process.exit(0);
}

/* ---------------------------------------------------------------------------
   5. Báo cáo
   ------------------------------------------------------------------------- */
applyWaivers();

const nodes = tplBy('node').length - 1;
console.log(`gate · ${LEAVES.length} bài · ${nodes} template bài · ${tplBy('mathdef').length} popup · `
  + `${tplBy('aside').length} ngăn phụ · ${lines.length} dòng · ${(src.length / 1024 / 1024).toFixed(2)} MB`);

if (held.length) {
  console.log(`\n⚠ ${held.length} lỗi THẬT đang được hoãn (waiver) — nợ giáo trình, không phải đã sửa:\n`);
  held.forEach(h => {
    console.log('  ⚠ ' + h.msg);
    console.log(`     ghi nhận ${h.w.since} · ${h.w.why}`);
    console.log(`     cách sửa: ${h.w.fix}`);
  });
}
if (fail.length) {
  console.error(`\n✗ ${fail.length} lỗi CHẶN:\n`);
  fail.forEach(m => console.error('  ✗ ' + m));
}
if (warn.length) {
  if (has('--advice')) {
    console.log(`\n· ${warn.length} khuyến nghị (không chặn):\n`);
    warn.forEach(m => console.log('  · ' + m));
  } else {
    console.log(`\n· ${warn.length} khuyến nghị — xem bằng \`node tools/gate.mjs --advice\``);
  }
}
if (!fail.length) console.log('\n✓ các cổng CHẶN đều qua');
process.exit(fail.length ? 1 : 0);
