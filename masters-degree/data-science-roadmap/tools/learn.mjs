#!/usr/bin/env node
/* ============================================================================
   learn.mjs — luật đọc/ghi LEARNING-LOG.md

   Vì sao có file này: chủ trang vừa là người VIẾT trang vừa là người HỌC nó. Phản
   hồi "chỗ này tôi đọc mà không hiểu" là bằng chứng chất lượng nội dung đắt nhất
   trang có thể có — và trước đây không có chỗ nào để ghi, nên nó bay hơi sau mỗi
   buổi học.

   Một file, hai mục đích — quyết định có chủ ý:
     · TIẾN ĐỘ (bài nào đã tick tới mức nào) — trang tự lưu vào localStorage
     · GHI CHÚ (tắc ở đâu, sản phẩm gì)      — người gõ, trên trang hoặc qua agent
   Tách hai file thì phải mở hai file để trả lời một câu ("bài d-eda đang thế nào").
   Gộp một file thì phải chống việc sinh lại đè mất ghi chú tay. Cách chống:

     · mục `## Sổ` là NGUỒN, và chỉ-thêm-vào-cuối (append-only). Không lệnh nào
       trong file này xoá hay sửa lại một dòng đã có ở đó.
     · khối giữa hai dấu `<!-- learn:summary -->` là SẢN PHẨM, sinh lại toàn bộ
       mỗi lần `--write`. Nó là hàm thuần của (Sổ + HTML), nên chạy hai lần cho
       ra đúng một kết quả — không có dấu thời gian, không churn.

   Trạng thái hiện tại của một bài = dòng `mức N` MỚI NHẤT của bài đó. Nghĩa là
   lịch sử không bao giờ bị viết lại: hạ mức cũng là thêm một dòng.

   Vì sao có `--sync` chứ không chỉ `--import <file>`: trang là một file HTML tĩnh,
   nó KHÔNG ghi được vào file trong repo — không có server, và File System Access API
   thì cần cấp quyền lại mỗi phiên, chưa kể trang thường được mở từ GitHub Pages nên
   còn khác cả origin. Nên đường đi bắt buộc là "trang → file tải về → repo". Việc duy
   nhất còn có thể bỏ là bắt người dùng TỰ TÌM cái file đó và gõ đường dẫn vào: `--sync`
   tự quét ~/Downloads (và vài chỗ hay gặp khác), lấy bản mới nhất, trộn vào. Trộn là
   idempotent nhờ khoá lọc trùng, nên chạy lại nhiều lần không sinh dòng thừa — không
   cần đánh dấu "file này đã nạp rồi".

   Dùng:
     node tools/learn.mjs                          in tóm tắt
     node tools/learn.mjs --sync                    TỰ tìm bản xuất mới nhất rồi trộn
     node tools/learn.mjs --write                   sinh lại khối summary
     node tools/learn.mjs --add <id> <loại> <chữ>   thêm một dòng vào sổ
     node tools/learn.mjs --import <file>           trộn đúng một file đã chỉ tên
     node tools/learn.mjs --check                   in phần nhắc (cổng G-LEARN dùng)

   <loại>: m1 m2 m3 (mức) · tac (tắc ở đâu) · go (đã gỡ được) · ghi (ghi chú thường)
   ========================================================================== */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
export const LOG_PATH = join(ROOT, 'LEARNING-LOG.md');

const MARK_A = '<!-- learn:summary — TỰ SINH, đừng sửa tay. Sinh lại: node tools/learn.mjs --write -->';
const MARK_B = '<!-- /learn:summary -->';
const SO_HEAD = '## Sổ — nguồn sự thật, chỉ thêm vào cuối';

/* Sáu loại dòng. Tên trong FILE có dấu (người đọc), tên trên CLI không dấu
   (không phải quote trong shell). Parser nhận cả hai. */
const KINDS = [
  ['mức 1', ['m1', 'muc1', 'mức1']],
  ['mức 2', ['m2', 'muc2', 'mức2']],
  ['mức 3', ['m3', 'muc3', 'mức3']],
  ['tắc',   ['tac', 'tắc']],
  ['gỡ',    ['go', 'gỡ']],
  ['ghi',   ['ghi', 'note']],
];
const KIND_NAMES = KINDS.map(k => k[0]);
function normKind(s) {
  const t = String(s).trim().toLowerCase().replace(/\s+/g, ' ');
  for (const [name, alias] of KINDS) {
    if (t === name || alias.includes(t)) return name;
  }
  return null;
}
const levelOf = kind => (kind.startsWith('mức ') ? +kind.slice(4) : 0);

/* ---------------------------------------------------------------------------
   Đọc sổ

   Ngữ pháp cố tình bé để cả node và JavaScript trong trang đều đọc được, và để
   người gõ tay không sai:

     ### <id> · <tiêu đề bài>            ← mở một nhóm
     - YYYY-MM-DD · <loại> · <nội dung>  ← một dòng
       <dòng tiếp>                       ← thụt 2 dấu cách, nối vào dòng trên

   Mọi thứ khác trong mục Sổ bị bỏ qua, TRỪ dòng bắt đầu bằng "- " mà không khớp
   — cái đó được báo ra, vì im lặng bỏ qua một ghi chú người ta vừa gõ là cách
   nhanh nhất để họ mất tin vào file.
   ------------------------------------------------------------------------- */
const RE_GROUP = /^###\s+`?([a-z0-9-]+)`?/;
/* Nội dung được phép RỖNG — `- 2026-08-04 · mức 1` là một dòng hợp lệ và đủ nghĩa
   ("hôm đó đọc xong bài này"), nên dấu · thứ hai là tuỳ chọn. */
const RE_ENTRY = /^-\s+`?(\d{4}-\d{2}-\d{2})`?\s+·\s+([^·]+?)\s*(?:·\s*(.*))?$/;

export function parseLog(text) {
  const entries = [];
  const bad = [];
  let id = null, cur = null;
  let inSo = false;
  const all = text.split('\n');
  for (let i = 0; i < all.length; i++) {
    const line = all[i];
    if (/^##\s/.test(line)) { inSo = line.startsWith(SO_HEAD.slice(0, 8)); id = null; cur = null; continue; }
    if (!inSo) continue;

    const g = RE_GROUP.exec(line);
    if (g) { id = g[1]; cur = null; continue; }

    if (cur && /^ {2,}\S/.test(line)) { cur.text += '\n' + line.trim(); continue; }

    const e = RE_ENTRY.exec(line);
    if (e) {
      const kind = normKind(e[2]);
      if (!kind) { bad.push({ line: i + 1, why: `loại "${e[2].trim()}" không có — dùng: ${KIND_NAMES.join(' / ')}`, raw: line }); cur = null; continue; }
      if (!id)   { bad.push({ line: i + 1, why: 'dòng nằm ngoài mọi "### <id>"', raw: line }); cur = null; continue; }
      cur = { id, date: e[1], kind, text: (e[3] || '').trim(), line: i + 1 };
      entries.push(cur);
      continue;
    }
    if (/^-\s/.test(line)) { bad.push({ line: i + 1, why: 'không đúng khuôn "- YYYY-MM-DD · <loại> · <nội dung>"', raw: line }); cur = null; }
  }
  return { entries, bad };
}

export function readLog() {
  if (!existsSync(LOG_PATH)) return { exists: false, raw: '', entries: [], bad: [] };
  const raw = readFileSync(LOG_PATH, 'utf8');
  return { exists: true, raw, ...parseLog(raw) };
}

/* ---------------------------------------------------------------------------
   Suy ra trạng thái từ sổ

   Ba thứ được suy ra, không cái nào được lưu:
     level[id]  mức hiện tại   = dòng `mức N` mới nhất của bài
     open[]     chỗ tắc còn mở = dòng `tắc` chưa có `gỡ` nào SAU nó cho cùng bài,
                                 và bài cũng chưa đạt `mức 3` sau nó
     hits       khái niệm nào bị tắc ở mấy bài khác nhau
   ------------------------------------------------------------------------- */
export function digest(entries) {
  const byLesson = new Map();
  for (const e of entries) {
    if (!byLesson.has(e.id)) byLesson.set(e.id, []);
    byLesson.get(e.id).push(e);
  }
  const level = {}, open = [], touched = [...byLesson.keys()];
  for (const [id, list] of byLesson) {
    // Sổ là append-only nên thứ tự trong file LÀ thứ tự thời gian. Không sort lại
    // theo ngày: một dòng ghi lùi ngày (nhớ ra hôm qua bị tắc) vẫn phải nằm đúng
    // chỗ người ta đặt nó.
    let lv = 0;
    for (const e of list) { const n = levelOf(e.kind); if (n) lv = n; }
    if (lv) level[id] = lv;
    for (let i = 0; i < list.length; i++) {
      if (list[i].kind !== 'tắc') continue;
      const closed = list.slice(i + 1).some(x => x.kind === 'gỡ' || x.kind === 'mức 3');
      if (!closed) open.push(list[i]);
    }
  }
  return { byLesson, level, open, touched };
}

/* Khái niệm nào xuất hiện trong các dòng `tắc` ở ≥2 BÀI khác nhau. Đây là tín
   hiệu mà concepts.json không thể tự có: nó khai "khái niệm này dạy ở bài kia"
   theo phán đoán của người viết, còn đây là dữ liệu từ người học thật. Hai bài
   khác nhau cùng tắc ở một khái niệm = khái niệm đó đang được dạy quá muộn. */
export function stuckConcepts(entries, concepts) {
  const out = [];
  for (const [name, c] of Object.entries(concepts || {})) {
    let re;
    try { re = new RegExp(c.pattern || name, 'i'); } catch { continue; }
    const where = new Set();
    for (const e of entries) if (e.kind === 'tắc' && re.test(e.text)) where.add(e.id);
    if (where.size >= 2) out.push({ name, definedIn: c.definedIn, where: [...where] });
  }
  return out;
}

/* ---------------------------------------------------------------------------
   Khối summary — hàm thuần của (sổ + trang)
   ------------------------------------------------------------------------- */
const pad = (s, n) => String(s).padEnd(n);
const hrs = m => (m / 60).toFixed(1).replace('.0', '') + ' h';

export function buildSummary(P, entries) {
  const { level, open, touched } = digest(entries);
  const { LEAVES, byId, TREE, ACCEPT, mins, sumMins } = P;
  const minsAt = (l, lv) => (lv >= 1 ? l.r : 0) + (lv >= 2 ? l.x : 0) + (lv >= 3 ? l.d : 0);
  const maxLevel = l => (l.d > 0 ? 3 : (l.x > 0 ? 2 : 1));

  const known = touched.filter(id => byId[id]);
  const total = sumMins(LEAVES);
  const got = known.reduce((s, id) => s + minsAt(byId[id], Math.min(level[id] || 0, maxLevel(byId[id]))), 0);
  const ceil = known.filter(id => (level[id] || 0) >= maxLevel(byId[id]));

  const L = [];
  L.push(`**${known.length}/${LEAVES.length} bài đã chạm · ${ceil.length} bài đạt mức cao nhất · `
    + `${hrs(got)}/${hrs(total)} khối lượng (${Math.round(got / total * 100)}%)**`);
  L.push('');

  if (!known.length) {
    L.push('Sổ chưa có dòng nào. Thêm bằng `node tools/learn.mjs --add <id> <loại> <nội dung>`,');
    L.push('hoặc gõ trên trang (nút **Sổ học** ở thanh trên) → "Tải sổ về máy" → `node tools/learn.mjs --sync`.');
    return L.join('\n');
  }

  // Theo chặng — để thấy đang đứng ở đâu trên lộ trình, không phải chỉ một con số.
  const rows = [];
  for (const p of TREE) {
    const ids = p.kids.map(k => k.id).filter(id => known.includes(id));
    if (!ids.length) continue;
    const nCeil = ids.filter(id => (level[id] || 0) >= maxLevel(byId[id])).length;
    const nOpen = open.filter(e => ids.includes(e.id)).length;
    rows.push(`| ${p.t} | ${ids.length}/${p.kids.length} | ${nCeil} | ${nOpen || '—'} |`);
  }
  L.push('| chặng | đã chạm | đạt mức cao nhất | chỗ tắc còn mở |');
  L.push('|---|---|---|---|');
  L.push(...rows);
  L.push('');

  if (open.length) {
    L.push(`**${open.length} chỗ tắc còn mở** — đóng bằng một dòng \`gỡ\`, hoặc bằng \`mức 3\` của bài đó:`);
    L.push('');
    for (const e of open) {
      const t = byId[e.id] ? byId[e.id].t : 'bài không còn trong trang';
      L.push(`- \`${e.id}\` (${t}) · ${e.date} — ${e.text.split('\n')[0] || '(không ghi nội dung)'}`);
    }
    L.push('');
  }

  // Bài tự nhận đạt deliverable mà trang không có tiêu chí nào để kiểm.
  const noAccept = ceil.filter(id => !ACCEPT[id] && byId[id].d > 0);
  if (noAccept.length) {
    L.push(`**${noAccept.length} bài đã đạt mức cao nhất nhưng trang không có \`ACCEPT\`** — `
      + 'nghĩa là "đạt" ở đây không có gì kiểm được: ' + noAccept.map(i => `\`${i}\``).join(', '));
    L.push('');
  }

  const gone = touched.filter(id => !byId[id]);
  if (gone.length) {
    L.push(`**${gone.length} id trong sổ không còn trong trang** (bài đã đổi tên hoặc bị xoá) — `
      + gone.map(i => `\`${i}\``).join(', ') + '. Sổ là lịch sử, nên KHÔNG sửa lại; '
      + 'chỉ để biết vì sao chúng không được tính vào các con số trên.');
    L.push('');
  }

  return L.join('\n').replace(/\n+$/, '');
}

/* ---------------------------------------------------------------------------
   Cổng G-LEARN — chỉ nhắc, không chặn

   Vì sao không chặn: sổ là dữ liệu của người học, không phải cấu trúc trang. Một
   dòng gõ sai khuôn không được phép chặn commit nội dung.
   ------------------------------------------------------------------------- */
export function checkLearn(P) {
  const out = [];
  const log = readLog();
  if (!log.exists) return out;

  for (const b of log.bad) {
    out.push(`G-LEARN: LEARNING-LOG.md dòng ${b.line} không đọc được — ${b.why}\n`
      + `      ${b.raw.trim()}\n`
      + '    Dòng này KHÔNG được tính vào tóm tắt. Khuôn đúng: `- 2026-08-04 · tắc · <nội dung>`');
  }

  const want = buildSummary(P, log.entries);
  const a = log.raw.indexOf(MARK_A), b = log.raw.indexOf(MARK_B);
  if (a < 0 || b < 0) {
    out.push('G-LEARN: LEARNING-LOG.md thiếu khối summary — chạy `node tools/learn.mjs --write`');
  } else if (log.raw.slice(a + MARK_A.length, b).trim() !== want.trim()) {
    out.push('G-LEARN: khối summary trong LEARNING-LOG.md đã cũ so với sổ — `node tools/learn.mjs --write`');
  }

  let concepts = {};
  try { concepts = JSON.parse(readFileSync(join(HERE, 'concepts.json'), 'utf8')).concepts || {}; } catch {}
  for (const s of stuckConcepts(log.entries, concepts)) {
    out.push(`G-LEARN: khái niệm "${s.name}" (dạy ở \`${s.definedIn}\`) làm người học tắc ở ${s.where.length} bài khác nhau: `
      + s.where.map(i => `\`${i}\``).join(', ') + '\n'
      + '    Đây là dữ liệu thật, không phải heuristic: hai bài khác nhau cùng tắc ở một khái niệm\n'
      + `    nghĩa là nó đang được dạy MUỘN hơn chỗ cần dùng, hoặc \`${s.definedIn}\` giải thích chưa đủ.\n`
      + '    Xem CLAUDE.md §8 để biết ba mức nghiêm khắc của loại lỗi này.');
  }
  return out;
}

/* ---------------------------------------------------------------------------
   Ghi
   ------------------------------------------------------------------------- */
function today() {
  // Ngày địa phương, không UTC: một dòng gõ lúc 23h phải mang đúng ngày hôm đó.
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* Thêm một hoặc nhiều dòng vào đúng nhóm `### <id>`, tạo nhóm nếu chưa có.
   Trả về số dòng thật sự thêm (đã bỏ trùng). */
export function appendEntries(P, list) {
  if (!existsSync(LOG_PATH)) throw new Error('chưa có LEARNING-LOG.md — tạo file trước (xem tools/learn.mjs --write)');
  let raw = readFileSync(LOG_PATH, 'utf8');
  const have = new Set(parseLog(raw).entries.map(e => `${e.id}\0${e.date}\0${e.kind}\0${e.text.trim()}`));

  const lines = raw.split('\n');
  const soAt = lines.findIndex(l => l.startsWith(SO_HEAD.slice(0, 8)) && /^##\s+Sổ/.test(l));
  if (soAt < 0) throw new Error(`LEARNING-LOG.md không có mục "${SO_HEAD}"`);

  let added = 0, skipped = 0;
  for (const e of list) {
    const kind = normKind(e.kind);
    if (!kind) throw new Error(`loại "${e.kind}" không có — dùng: ${KINDS.map(k => k[1][0]).join(' / ')}`);
    const date = e.date || today();
    const text = String(e.text || '').trim();
    const key = `${e.id}\0${date}\0${kind}\0${text}`;
    if (have.has(key)) { skipped++; continue; }
    have.add(key);

    // Tìm nhóm của bài. Nhóm xếp theo THỨ TỰ HỌC, không theo thứ tự gõ — mở file
    // ra là đọc được như một lộ trình, không phải như một dòng thời gian lộn xộn.
    let gi = -1;
    for (let i = soAt + 1; i < lines.length; i++) {
      const g = RE_GROUP.exec(lines[i]);
      if (g && g[1] === e.id) { gi = i; break; }
    }
    if (gi < 0) {
      const title = P.byId[e.id] ? P.byId[e.id].t : '(không còn trong trang)';
      const ord = id => (P.orderOf[id] === undefined ? 1e9 : P.orderOf[id]);
      let at = lines.length;
      for (let i = soAt + 1; i < lines.length; i++) {
        const g = RE_GROUP.exec(lines[i]);
        if (g && ord(g[1]) > ord(e.id)) { at = i; break; }
      }
      lines.splice(at, 0, `### \`${e.id}\` · ${title}`, '');
      gi = at;
    }
    // Chèn vào CUỐI nhóm (append-only).
    let end = gi + 1;
    while (end < lines.length && !/^###\s/.test(lines[end]) && !/^##\s/.test(lines[end])) end++;
    while (end - 1 > gi && lines[end - 1].trim() === '') end--;
    // Dòng tiếp phải được THỤT 2 DẤU CÁCH, không thì lần đọc sau parseLog không nối
    // nó vào dòng trên nữa — và hệ quả không chỉ là hiển thị: khoá lọc trùng tính trên
    // cả nội dung, nên một ghi chú nhiều dòng sẽ được thêm lại mỗi lần import.
    const body = text.split('\n');
    const rows = [body[0] ? `- ${date} · ${kind} · ${body[0]}` : `- ${date} · ${kind}`,
      ...body.slice(1).map(x => '  ' + x.trim())];
    lines.splice(end, 0, ...rows);
    added++;
  }
  raw = lines.join('\n');
  writeFileSync(LOG_PATH, raw, 'utf8');
  return { added, skipped };
}

/* ---------------------------------------------------------------------------
   Tìm bản xuất từ trang  (nguồn của --sync và của lời nhắc trong session.mjs)
   ------------------------------------------------------------------------- */
/* Phải KHỚP tên file mà trang đặt (`a.download` trong data-science-roadmap.html).
   Đuôi `.*` là cho bản trùng tên: Chrome lưu thành "learning-log-2026-08-04 (1).md".
   Vẫn nhận `so-hoc-` (tên cũ, trước khi đổi tên file sang tiếng Anh) — một bản xuất còn
   nằm trong ~/Downloads từ trước không được im lặng biến thành vô hình. */
export const PAT_EXPORT = /^(learning-log|so-hoc)-\d{4}-\d{2}-\d{2}.*\.md$/i;

/* Bốn chỗ, theo đúng thứ tự khả năng: thư mục tải về là chỗ 99% file rơi vào; Desktop
   cho người đổi mặc định của trình duyệt; hai chỗ cuối cho người chủ động lưu vào repo.
   Không quét sâu — quét cả cây thư mục nhà là chậm và là chuyện không ai nhờ. */
export function findExports() {
  const dirs = [join(homedir(), 'Downloads'), join(homedir(), 'Desktop'), ROOT, join(ROOT, '..', '..')];
  const out = [];
  for (const d of dirs) {
    let names;
    try { names = readdirSync(d); } catch { continue; }   // không có / không đọc được: bỏ qua
    for (const n of names) {
      if (!PAT_EXPORT.test(n)) continue;
      const p = join(d, n);
      try { out.push({ path: p, mtime: statSync(p).mtimeMs }); } catch { /* file vừa bị xoá */ }
    }
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}

/* Bao nhiêu dòng trong bản xuất mà sổ CHƯA có. Dùng cùng khoá lọc trùng với
   appendEntries, nên con số này đúng bằng số dòng `--sync` sẽ thêm. */
export function pendingFromExport(file) {
  let inc;
  try { inc = parseLog(readFileSync(file, 'utf8')); } catch { return null; }
  const log = readLog();
  const have = new Set((log.exists ? parseLog(log.raw).entries : [])
    .map(e => `${e.id}\0${e.date}\0${e.kind}\0${e.text.trim()}`));
  return inc.entries.filter(e => !have.has(`${e.id}\0${e.date}\0${e.kind}\0${e.text.trim()}`)).length;
}

export function writeSummary(P) {
  const log = readLog();
  if (!log.exists) throw new Error('chưa có LEARNING-LOG.md');
  const want = buildSummary(P, log.entries);
  const a = log.raw.indexOf(MARK_A), b = log.raw.indexOf(MARK_B);
  if (a < 0 || b < 0) throw new Error('LEARNING-LOG.md thiếu hai dấu learn:summary — thêm lại thủ công');
  const out = log.raw.slice(0, a + MARK_A.length) + '\n\n' + want + '\n\n' + log.raw.slice(b);
  if (out !== log.raw) writeFileSync(LOG_PATH, out, 'utf8');
  return out !== log.raw;
}

/* ---------------------------------------------------------------------------
   CLI
   ------------------------------------------------------------------------- */
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const { readPage } = await import('./read-html.mjs');
  const P = readPage(join(ROOT, 'data-science-roadmap.html'));
  const argv = process.argv.slice(2);
  const has = f => argv.includes(f);

  if (has('--add')) {
    const i = argv.indexOf('--add');
    const [id, kind] = [argv[i + 1], argv[i + 2]];
    const text = argv.slice(i + 3).join(' ');
    if (!id || !kind) {
      console.error('dùng: node tools/learn.mjs --add <id> <loại> <nội dung>');
      console.error('loại: ' + KINDS.map(k => `${k[1][0]} (${k[0]})`).join(' · '));
      process.exit(2);
    }
    if (!P.byId[id]) console.error(`· cảnh báo: "${id}" không phải bài nào trong trang — vẫn ghi, nhưng kiểm lại id`);
    const r = appendEntries(P, [{ id, kind, text }]);
    writeSummary(P);
    console.log(`✓ thêm ${r.added} dòng${r.skipped ? ` · bỏ qua ${r.skipped} trùng` : ''} · đã sinh lại summary`);
    process.exit(0);
  }

  /* --sync và --import là MỘT việc, khác nhau ở chỗ ai tìm file. Gộp thành một nhánh
     để không có hai đoạn code trộn-vào-sổ chạy lệch nhau. */
  if (has('--sync') || has('--import')) {
    const flag = has('--sync') ? '--sync' : '--import';
    let f = argv[argv.indexOf(flag) + 1];
    if (f && f.startsWith('--')) f = undefined;

    if (!f) {
      if (flag === '--import') {
        console.error('dùng: node tools/learn.mjs --import <file>   (hoặc --sync để tự tìm)');
        process.exit(2);
      }
      const found = findExports();
      if (!found.length) {
        console.log('· không thấy bản xuất nào (tên dạng `learning-log-YYYY-MM-DD.md`).');
        console.log('  Trên trang: bấm **Sổ học** ở thanh trên → "1. Tải sổ về máy", rồi chạy lại lệnh này.');
        console.log('  Đã quét: ~/Downloads · ~/Desktop · thư mục trang · gốc repo');
        process.exit(0);
      }
      f = found[0].path;
      if (found.length > 1) {
        console.log(`· thấy ${found.length} bản xuất, lấy bản MỚI NHẤT: ${f}`);
        console.log('  (bản cũ hơn: ' + found.slice(1, 4).map(x => x.path).join(', ') + ')');
      }
    }
    if (!existsSync(f)) { console.error(`· không có file "${f}"`); process.exit(2); }

    const inc = parseLog(readFileSync(f, 'utf8'));
    if (!inc.entries.length && !inc.bad.length) {
      console.error(`· "${f}" không có dòng nào đúng khuôn. Bản xuất từ trang phải giữ nguyên cả dòng "${SO_HEAD}".`);
      process.exit(2);
    }
    const r = appendEntries(P, inc.entries);
    writeSummary(P);
    console.log(`✓ nạp ${f}\n  thêm ${r.added} dòng${r.skipped ? ` · bỏ qua ${r.skipped} dòng đã có` : ''}`
      + (inc.bad.length ? ` · ${inc.bad.length} dòng không đọc được (dòng ${inc.bad.map(b => b.line).join(', ')})` : ''));
    if (!r.added) console.log('  (sổ đã có đủ những dòng này — chạy lại không sinh trùng, cứ yên tâm)');
    process.exit(0);
  }

  if (has('--write')) {
    const changed = writeSummary(P);
    console.log(changed ? '✓ LEARNING-LOG.md: đã sinh lại khối summary' : '· LEARNING-LOG.md: summary đã đúng, không đổi gì');
    process.exit(0);
  }

  if (has('--check')) {
    const msgs = checkLearn(P);
    msgs.forEach(m => console.log('  · ' + m));
    console.log(msgs.length ? `\n· ${msgs.length} nhắc` : '✓ sổ học không có gì phải nhắc');
    process.exit(0);
  }

  const log = readLog();
  if (!log.exists) {
    console.log('chưa có LEARNING-LOG.md. Xem CLAUDE.md §13 để biết file này dùng làm gì.');
    process.exit(0);
  }
  console.log(buildSummary(P, log.entries).replace(/\*\*/g, '').replace(/`/g, ''));
  const msgs = checkLearn(P);
  if (msgs.length) console.log(`\n· ${msgs.length} nhắc — xem bằng \`node tools/learn.mjs --check\``);
}
