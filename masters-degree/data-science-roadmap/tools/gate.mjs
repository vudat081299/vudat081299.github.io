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
   ========================================================================== */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const HTML = join(ROOT, 'data-science-roadmap.html');
const TOC  = join(ROOT, 'TOC.md');
const CONCEPTS = join(HERE, 'concepts.json');

const argv = process.argv.slice(2);
const has = f => argv.includes(f);
const arg = f => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };

const src = readFileSync(HTML, 'utf8');
const lines = src.split('\n');

/* ---------------------------------------------------------------------------
   1. Đọc dữ liệu ra khỏi HTML

   Không parse HTML, không dựng DOM: chỉ cần cắt đúng các literal trong <script>
   rồi eval chúng trong sandbox. Nhanh (một file 1MB, ~50ms) và không cần thư viện.
   ------------------------------------------------------------------------- */

/* Nhảy qua chuỗi và chú thích khi đếm ngoặc — nếu không, một dấu ] trong câu tiếng
   Việt hoặc một // trong URL sẽ cắt literal sai chỗ. */
function matchBracket(text, start) {
  const open = text[start];
  const close = { '[': ']', '{': '}', '(': ')' }[open];
  let depth = 0, i = start;
  while (i < text.length) {
    const c = text[i];
    if (c === '\\') { i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') {           // chuỗi
      const q = c; i++;
      while (i < text.length && text[i] !== q) { if (text[i] === '\\') i++; i++; }
      i++; continue;
    }
    if (c === '/' && text[i + 1] === '/') { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (c === '/' && text[i + 1] === '*') { i = text.indexOf('*/', i) + 2; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return i; }
    i++;
  }
  throw new Error('không tìm được ngoặc đóng từ vị trí ' + start);
}

function literal(name) {
  const m = new RegExp('\\nconst ' + name + '\\s*=\\s*').exec(src);
  if (!m) throw new Error(`không thấy "const ${name} =" trong HTML`);
  const start = m.index + m[0].length;
  const end = matchBracket(src, start);
  return vm.runInNewContext('(' + src.slice(start, end + 1) + ')');
}

const TREE     = literal('TREE');
const WEEKS    = literal('WEEKS');
const DAYS     = literal('DAYS');
const PAYOFF   = literal('PAYOFF');
const COMPS    = literal('COMPS');
const ACCEPT   = literal('ACCEPT');
const SCOPE    = literal('SCOPE');
const PORTFOLIO = literal('PORTFOLIO');
const PHASE_OUTCOME = literal('PHASE_OUTCOME');

const LEAVES = TREE.flatMap(p => p.kids.map(k => ({ ...k, phase: p })));
const byId = Object.fromEntries(LEAVES.map(l => [l.id, l]));
const orderOf = Object.fromEntries(LEAVES.map((l, i) => [l.id, i]));
const mins = l => l.r + l.x + l.d;

/* Các khối <template>: id → { kind, title, from, to, body }. Template không lồng
   nhau nên quét tuyến tính là đủ. */
function scanTemplates() {
  const out = [];
  const re = /<template\s+data-(node|aside|mathdef)="([^"]+)"([^>]*)>/g;
  let m;
  while ((m = re.exec(src))) {
    const closeAt = src.indexOf('</template>', m.index);
    const titleM = /data-title="([^"]*)"/.exec(m[3]);
    out.push({
      kind: m[1], key: m[2],
      title: titleM ? titleM[1] : null,
      from: src.slice(0, m.index).split('\n').length,
      to: src.slice(0, closeAt).split('\n').length + 1,
      body: src.slice(m.index, closeAt),
    });
  }
  return out;
}
const TPL = scanTemplates();
const tplBy = kind => TPL.filter(t => t.kind === kind);
const nodeTpl = Object.fromEntries(tplBy('node').map(t => [t.key, t]));

const refsIn = (body, attr) =>
  [...body.matchAll(new RegExp(`data-${attr}="([^"${'$'}{}]+)"`, 'g'))].map(m => m[1]);

/* ---------------------------------------------------------------------------
   2. Sinh TOC.md — bản đồ để ĐỌC THAY CHO việc mở file 12k dòng

   Mỗi bài một dòng bảng: đủ để một AI quyết định "bài này liên quan không, cần mở
   không, mở thì sed từ dòng nào" mà không phải nạp cả file vào ngữ cảnh.
   ------------------------------------------------------------------------- */
const PRIO_LABEL = { core: 'bắt buộc', good: 'nên biết', skim: 'định vị' };
const FAST = new Set(DAYS.flatMap(d => d.ids));
const weekOf = {}; WEEKS.forEach(w => w.ids.forEach(id => { weekOf[id] = w.n; }));

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

/* --- G-MEASURE (khuyến nghị): canh trôi khổ chữ -------------------------
   Cả trang chỉ được có HAI mép phải. Mỗi max-width bằng px/ch viết rời trong CSS
   bài học là một mép thứ ba đang hình thành. */
const cssBlock = src.slice(src.indexOf('<style>'), src.indexOf('</style>'));
for (const m of cssBlock.matchAll(/^\s*(\.[a-z0-9_-]+[^{\n]*)\{[^}\n]*max-width:\s*(\d+(?:px|ch))/gim)) {
  if (/--ds-measure|ds-mathmodal|ds-drawer|ds-viz svg/.test(m[1])) continue;
  W(`G-MEASURE: "${m[1].trim()}" đặt max-width cứng ${m[2]} — dùng var(--ds-measure) hoặc để nó chạm mép cột`);
}

/* ---------------------------------------------------------------------------
   4. Chế độ tra cứu — để không phải mở cả file
   ------------------------------------------------------------------------- */
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
