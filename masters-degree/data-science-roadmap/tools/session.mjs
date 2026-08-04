#!/usr/bin/env node
/* ============================================================================
   session.mjs — mở phiên và đóng phiên

   Vì sao có file này: bộ cổng canh được NỘI DUNG trang, nhưng không canh được
   cách làm việc quanh nó. Hai lỗ thật, đã dính cả hai:

     · MỞ PHIÊN. Repo này thường có nhiều phiên chạy song song trên cùng một file
       HTML. Phiên trước dính bẫy đó HAI LẦN: đọc HANDOFF.md, phân tích, kết luận
       — rồi phát hiện một phiên khác đã sửa đúng chỗ đó và bản mình đọc là bản cũ.
       `git status` biết điều này ngay từ giây đầu, chỉ là không ai gọi nó.
     · ĐÓNG PHIÊN. CLAUDE.md §12 bắt ghi HANDOFF "đã sửa gì, cố ý không sửa gì".
       Một bắt buộc mà phải tự nhớ và tự gõ lại từ đầu thì trên thực tế sẽ bị bỏ.
       Ở đây nó thành một khung điền trước, dựng từ `git diff` thật.

   Dùng:
     node tools/session.mjs           mở phiên — chạy TRƯỚC khi sửa gì
     node tools/session.mjs --close   đóng phiên — khung HANDOFF + câu commit

   Không phải cổng: file này không bao giờ thoát khác 0 vì nội dung. Nó chỉ đọc và
   in. Cổng nằm ở gate.mjs.
   ========================================================================== */

import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readPage } from './read-html.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const HTML = join(ROOT, 'data-science-roadmap.html');
const HANDOFF = join(ROOT, 'HANDOFF.md');
const REL = 'masters-degree/data-science-roadmap';

const argv = process.argv.slice(2);
const CLOSE = argv.includes('--close');

const B = s => `\x1b[1m${s}\x1b[0m`;
const DIM = s => `\x1b[2m${s}\x1b[0m`;
const RED = s => `\x1b[31m${s}\x1b[0m`;
const YEL = s => `\x1b[33m${s}\x1b[0m`;
const GRN = s => `\x1b[32m${s}\x1b[0m`;
const rule = () => console.log(DIM('─'.repeat(74)));

function git(...args) {
  try { return execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch { return null; }
}
function node(...args) {
  try { return { ok: true, out: execFileSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { ok: false, out: (e.stdout || '') + (e.stderr || '') }; }
}

/* Trạng thái làm việc của ĐÚNG thư mục này, không phải cả repo — commit ở cashy/
   không liên quan gì tới trang DS. */
function dirtyHere() {
  const s = git('status', '--porcelain', '--', '.');
  if (s == null) return null;
  return s.split('\n').filter(Boolean).map(l => {
    // git in ra đường dẫn tính từ GỐC REPO, và với file đổi tên thì là "cũ -> mới".
    // Cắt về đường dẫn tương đối trong thư mục này, vì mọi chỗ khác trong file này
    // (need/changed, câu commit) đều nói bằng đường dẫn đó.
    let p = l.slice(3).trim();
    const arrow = p.indexOf(' -> ');
    if (arrow >= 0) p = p.slice(arrow + 4);
    return { code: l.slice(0, 2), path: p.startsWith(REL + '/') ? p.slice(REL.length + 1) : p, raw: l.slice(3).trim() };
  });
}

/* Lấy một mục `## <tên>` trong HANDOFF.md, tới `## ` kế tiếp. */
function handoffSection(name) {
  if (!existsSync(HANDOFF)) return null;
  const lines = readFileSync(HANDOFF, 'utf8').split('\n');
  const at = lines.findIndex(l => l.startsWith('## ') && l.slice(3).trim().startsWith(name));
  if (at < 0) return null;
  let end = at + 1;
  while (end < lines.length && !lines[end].startsWith('## ')) end++;
  const body = lines.slice(at, end).join('\n').replace(/\n{3,}/g, '\n\n').replace(/\n+-{3,}\s*$/, '').trim();
  return { at: at + 1, body };
}

/* --------------------------------------------------------------------------
   MỞ PHIÊN
   ------------------------------------------------------------------------ */
function start() {
  const P = readPage(HTML);
  console.log('');
  console.log(B(`Mở phiên · ${REL}`) + DIM(`  ${P.LEAVES.length} bài · ${P.TREE.length} chặng · ${P.lines.length} dòng HTML`));
  rule();

  // 1. Có phiên khác đang làm dở không — câu quan trọng nhất, nên đứng đầu.
  const dirty = dirtyHere();
  if (dirty == null) {
    console.log(YEL('· không gọi được git') + ' — không kiểm được có phiên khác đang làm dở.');
  } else if (!dirty.length) {
    console.log(GRN('✓ thư mục sạch') + DIM(' — không có phiên nào đang làm dở, bạn bắt đầu từ nền commit.'));
  } else {
    console.log(RED(`⚠ ${dirty.length} file đang đổi mà CHƯA COMMIT`) + ' — rất có thể một phiên khác đang làm dở:');
    console.log('');
    for (const f of dirty) console.log(`    ${f.code}  ${f.raw}`);
    console.log('');
    console.log('  Trước khi Edit bất cứ file nào trong danh sách trên: ' + B('đọc lại vùng sắp sửa.'));
    console.log(DIM('  Bản trong ngữ cảnh của bạn có thể là bản trước khi phiên kia sửa. Xem việc họ đang'));
    console.log(DIM('  làm: `git diff -- <file>`. Đừng commit hộ họ — commit riêng phần của bạn.'));
  }
  console.log('');

  // 2. Ba commit cuối — để biết phiên ngay trước làm gì.
  const log = git('log', '--oneline', '-3', '--', '.');
  if (log) { console.log(B('3 commit cuối chạm thư mục này')); log.trimEnd().split('\n').forEach(l => console.log('    ' + l)); console.log(''); }

  // 3. Hook: nếu chưa cài thì mọi thứ CLAUDE.md §3 mô tả đang tắt.
  const GITROOT = join(ROOT, '..', '..');
  const same = (a, b) => { try { return realpathSync(a) === realpathSync(b); } catch { return false; } };
  const hookOk = (name, needle) => {
    const p = join(GITROOT, '.git', 'hooks', name);
    return existsSync(p) && (same(p, join(HERE, 'hooks', name)) || readFileSync(p, 'utf8').includes(needle));
  };
  const cs = join(GITROOT, '.claude', 'settings.json');
  const layers = [
    ['sau mỗi Edit/Write', existsSync(cs) && readFileSync(cs, 'utf8').includes('data-science-roadmap')],
    ['lúc commit',        hookOk('pre-commit', 'data-science-roadmap/tools/hooks/pre-commit')],
    ['lúc push',          hookOk('pre-push',   'data-science-roadmap/tools/hooks/pre-push')],
  ];
  const off = layers.filter(l => !l[1]);
  if (off.length) {
    console.log(RED(`⚠ ${off.length}/3 lớp tự động CHƯA cài`) + ` — ${off.map(l => l[0]).join(', ')}`);
    console.log('  Chạy: ' + B('tools/install-hooks.sh') + DIM('  (một lần cho mỗi máy / mỗi bản clone)'));
  } else {
    console.log(GRN('✓ cả 3 lớp tự động đã cài') + DIM(' — sau mỗi Edit · lúc commit · lúc push'));
  }
  console.log('');

  // 4. Việc đang dở, từ HANDOFF.md — in NGUYÊN VĂN, đây là mục dễ bị bỏ qua nhất.
  const dang = handoffSection('ĐANG LÀM');
  if (dang) {
    console.log(B('▶ ĐANG LÀM') + DIM(`  (HANDOFF.md dòng ${dang.at})`));
    rule();
    console.log(dang.body);
    rule();
    console.log(DIM('  Xong việc này thì đổi tiêu đề mục trên thành `## Phiên <ngày> (<chữ>)`.'));
  } else {
    console.log(DIM('· HANDOFF.md không có mục `## ĐANG LÀM` — không có việc nào đang dở.'));
  }
  console.log('');

  const chua = handoffSection('CHƯA LÀM');
  if (chua) {
    const heads = chua.body.split('\n').filter(l => l.startsWith('### ')).map(l => l.slice(4));
    console.log(B('CHƯA LÀM') + DIM('  (tiêu đề mục — chi tiết ở HANDOFF.md)'));
    heads.forEach(h => console.log('    · ' + h));
    console.log('');
  }

  // 5. Cổng + sổ học: trạng thái nền, để biết mình bắt đầu từ đâu.
  const g = node('tools/gate.mjs', '--advice');
  const nAdv = (g.out.match(/^  · /gm) || []).length;
  console.log(g.ok
    ? GRN('✓ cổng CHẶN đều qua') + DIM(` · ${nAdv} khuyến nghị (\`node tools/gate.mjs --advice\`)`)
    : RED('✗ cổng CHẶN đang TRƯỢT') + ' — sửa trước khi làm việc mới:\n' + g.out.split('\n').filter(l => l.includes('✗')).map(l => '  ' + l).join('\n'));

  const l = node('tools/learn.mjs');
  if (l.ok) {
    const first = l.out.trim().split('\n')[0];
    const open = (l.out.match(/^- /gm) || []).length;
    console.log(DIM('  sổ học: ') + first + (open ? YEL(` · ${open} chỗ tắc còn mở`) : ''));
  }
  console.log('');

  console.log(DIM('Bảng "định làm X → đọc gì, chạy gì" ở đầu CLAUDE.md. Đóng phiên: ')
    + B('node tools/session.mjs --close'));
  console.log('');
}

/* --------------------------------------------------------------------------
   ĐÓNG PHIÊN

   Giá trị thật nằm ở bảng "dòng nào đổi → bài nào bị chạm". `git diff --stat` chỉ
   nói "HTML +88/−39", mà đó là con số vô nghĩa cho một file 12k dòng: nó không cho
   biết đã chạm vào bài NÀO, tức là không đủ để viết HANDOFF hay để biết phải đọc
   lại `PAYOFF` của bài nào.
   ------------------------------------------------------------------------ */
function touchedLessons(P) {
  const d = git('diff', '-U0', '--', 'data-science-roadmap.html');
  if (!d) return null;
  const hit = new Map();
  for (const m of d.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
    const from = +m[1], n = m[2] === undefined ? 1 : +m[2];
    if (!n) continue;
    for (const t of P.TPL) {
      if (from <= t.to && from + n - 1 >= t.from) {
        const k = `${t.kind}:${t.key}`;
        hit.set(k, (hit.get(k) || 0) + n);
      }
    }
    // Dòng ngoài mọi template = phần khung: CSS, script, dữ liệu TREE/WEEKS/PAYOFF…
    if (!P.TPL.some(t => from <= t.to && from + n - 1 >= t.from)) {
      hit.set('(khung: CSS / script / dữ liệu)', (hit.get('(khung: CSS / script / dữ liệu)') || 0) + n);
    }
  }
  return [...hit.entries()].sort((a, b) => b[1] - a[1]);
}

function close() {
  const P = readPage(HTML);
  console.log('');
  console.log(B(`Đóng phiên · ${REL}`));
  rule();

  const dirty = dirtyHere() || [];
  if (!dirty.length) {
    console.log(DIM('Thư mục sạch — không có gì để ghi vào HANDOFF, không có gì để commit.'));
    console.log('');
    return;
  }

  const stat = git('diff', '--stat', '--', '.');
  console.log(B('Đã đổi'));
  for (const f of dirty) console.log(`    ${f.code}  ${f.path}`);
  if (stat && stat.trim()) { console.log(''); stat.trimEnd().split('\n').forEach(l => console.log('  ' + l.trim())); }
  console.log('');

  const touched = touchedLessons(P);
  if (touched && touched.length) {
    console.log(B('Dòng đã đổi thuộc về') + DIM('  — dùng cột này để viết HANDOFF, không dùng con số +/− ở trên'));
    for (const [k, n] of touched.slice(0, 20)) {
      const id = k.replace(/^node:/, '');
      const l = P.byId[id];
      console.log(`    ${String(n).padStart(4)} dòng  ${k}${l ? DIM('  ' + l.t) : ''}`);
    }
    if (touched.length > 20) console.log(DIM(`    … và ${touched.length - 20} chỗ nữa`));
    console.log('');
    const lessons = touched.filter(([k]) => k.startsWith('node:')).map(([k]) => k.slice(5));
    if (lessons.length) {
      console.log(DIM('  Nhắc: bài nào đổi VỊ TRÍ thì câu "bài sau…" trong PAYOFF của bài đứng trước nó'));
      console.log(DIM('  trỏ sai — cổng G-NEXT liệt kê ra, nhưng chỉ mắt đọc được câu đó.'));
      console.log('');
    }
  }

  // Danh sách phải-làm-trước-khi-commit, mỗi dòng một lệnh, đã biết cái nào cần.
  const need = [];
  const changed = p => dirty.some(f => f.path === p || f.path.startsWith(p));
  need.push(['node tools/gate.mjs --advice', 'cổng CHẶN phải qua; đọc phần nhắc mới sinh ra']);
  if (changed('tools/')) need.push(['node tools/gate.test.mjs', 'bạn đã sửa tools/ — test cổng phải xanh']);
  if (changed('data-science-roadmap.html')) need.push(['node tools/gate.mjs --write', 'sinh lại TOC.md rồi `git add TOC.md`']);
  if (changed('LEARNING-LOG.md')) need.push(['node tools/learn.mjs --write', 'sinh lại khối summary của sổ học']);
  console.log(B('Chạy trước khi commit'));
  for (const [cmd, why] of need) console.log(`    ${cmd.padEnd(32)} ${DIM('# ' + why)}`);
  console.log('');

  // Khung HANDOFF điền trước. Đây là thứ CLAUDE.md §12 bắt buộc mà trước đây phải
  // gõ lại từ đầu mỗi phiên.
  const dang = handoffSection('ĐANG LÀM');
  console.log(B('Khung HANDOFF.md — dán vào ngay dưới mục `## ĐANG LÀM`'));
  rule();
  const d = new Date();
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  console.log(`## Phiên ${day} (?) — <một câu: phiên này giải quyết cái gì>`);
  console.log('');
  if (touched && touched.length) {
    console.log('### <việc 1>');
    console.log('');
    console.log('<đã làm gì, và VÌ SAO cách này chứ không phải cách khác>');
    console.log('');
    console.log('Chạm vào: ' + touched.slice(0, 8).map(([k]) => '`' + k.replace(/^node:/, '') + '`').join(', ')
      + (touched.length > 8 ? ` … (+${touched.length - 8})` : ''));
    console.log('');
  }
  console.log('### Cố ý KHÔNG làm trong phiên này');
  console.log('');
  console.log('- <việc đã cân nhắc rồi bỏ, và vì sao>   ← mục này quan trọng HƠN mục trên:');
  console.log('  nó là thứ giữ cho phiên sau không làm lại việc đã cân nhắc và bỏ qua.');
  console.log('');
  console.log('### Còn nợ của riêng phiên này');
  console.log('');
  console.log('- <việc làm dở, hoặc biết là thiếu mà chưa làm>');
  rule();
  if (dang) {
    console.log(YEL('⚠ HANDOFF.md vẫn còn mục `## ĐANG LÀM`') + ` (dòng ${dang.at}).`);
    console.log('  Việc trong đó đã xong thì ' + B('đổi tiêu đề thành `## Phiên …`') + ' thay vì thêm mục mới —');
    console.log(DIM('  hai mục cùng mô tả một việc là cách nhanh nhất làm HANDOFF hết đáng tin.'));
    console.log('');
  }

  // Câu commit. Loại suy ra từ file nào đổi; scope luôn là ds-roadmap.
  const onlyDocs = dirty.every(f => /\.md$/.test(f.path) || f.path.startsWith('docs/'));
  const kind = onlyDocs ? 'docs' : (changed('tools/') && !changed('data-science-roadmap.html') ? 'chore' : 'feat');
  console.log(B('Câu commit') + DIM('  — quy ước: <loại>(ds-roadmap): <việc, tiếng Việt, không dấu chấm cuối>'));
  console.log(`    ${kind}(ds-roadmap): <việc>`);
  console.log(DIM('    loại: feat (thêm năng lực) · fix (sửa lỗi) · docs (chỉ tài liệu) · chore (công cụ, không đổi trang)'));
  console.log('');
  console.log(DIM('Push là DEPLOY (GitHub Pages, nhánh main). Hook pre-push chạy cổng + audit + test'));
  console.log(DIM('rồi mới cho đi — mất ~20 giây, và nó chặn thật.'));
  console.log('');
}

if (CLOSE) close(); else start();
