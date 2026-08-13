#!/usr/bin/env node
/* ============================================================================
   read-html.mjs — đọc dữ liệu ra khỏi data-science-roadmap.html

   Vì sao tách ra thành file riêng: có hai công cụ cần cùng dữ liệu này —
   gate.mjs (kiểm cấu trúc) và plan.mjs (kiểm lịch học). Nếu mỗi bên tự đọc thì
   có hai bản luật đọc file, và chúng sẽ lệch nhau. Một bản, dùng chung.

   Cách đọc: KHÔNG dựng DOM, không dùng thư viện ngoài. Chỉ cắt đúng đoạn text
   của từng biến trong <script> rồi chạy nó trong sandbox. File 1 MB mất ~50ms.
   ========================================================================== */

import { readFileSync } from 'node:fs';
import vm from 'node:vm';

/* Tìm ngoặc đóng khớp với ngoặc mở ở vị trí `start`.

   Phải nhảy qua chuỗi và chú thích. Không nhảy thì một dấu ] trong câu tiếng
   Việt, hoặc một // trong URL, sẽ cắt sai chỗ. */
export function matchBracket(text, start) {
  const open = text[start];
  const close = { '[': ']', '{': '}', '(': ')' }[open];
  if (!close) throw new Error(`vị trí ${start} không phải ngoặc mở (thấy "${open}")`);
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

/* Đọc một biến. Xử lý được cả hai dạng khai báo mà trang đang dùng:
     const X = [...]  /  const X = {...}
     const X = new Set([...])                       ← READONLY_OK dùng dạng này */
export function readVar(src, name) {
  const m = new RegExp('\\nconst ' + name + '\\s*=\\s*').exec(src);
  if (!m) throw new Error(`không thấy "const ${name} =" trong HTML`);
  let start = m.index + m[0].length;
  const setM = /^new\s+Set\s*\(/.exec(src.slice(start, start + 40));
  if (setM) {
    start += setM[0].length;
    const end = matchBracket(src, start);
    return new Set(vm.runInNewContext('(' + src.slice(start, end + 1) + ')'));
  }
  const end = matchBracket(src, start);
  return vm.runInNewContext('(' + src.slice(start, end + 1) + ')');
}

/* Các khối <template>: id → { kind, key, title, from, to, body }.
   Template không lồng nhau nên quét tuyến tính là đủ. */
function scanTemplates(src) {
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
      at: m.index, closeAt,
      body: src.slice(m.index, closeAt),
    });
  }
  return out;
}

/* Đọc cả trang ra một object. Mọi công cụ trong tools/ đều bắt đầu từ đây. */
export function readPage(htmlPath) {
  const src = readFileSync(htmlPath, 'utf8');
  const lines = src.split('\n');
  const V = name => readVar(src, name);

  const TREE          = V('TREE');
  const WEEKS         = V('WEEKS');
  const DAYS          = V('DAYS');
  const PAYOFF        = V('PAYOFF');
  const COMPS         = V('COMPS');
  const ACCEPT        = V('ACCEPT');
  const QUIZ          = V('QUIZ');
  const SCOPE         = V('SCOPE');
  const PORTFOLIO     = V('PORTFOLIO');
  const PHASE_OUTCOME = V('PHASE_OUTCOME');
  const COMP_PHASE    = V('COMP_PHASE');
  const DELIV_MIN     = V('DELIV_MIN');
  const READONLY_OK   = V('READONLY_OK');

  const TPL = scanTemplates(src);
  const tplBy = kind => TPL.filter(t => t.kind === kind);
  const nodeTpl = Object.fromEntries(tplBy('node').map(t => [t.key, t]));

  const LEAVES  = TREE.flatMap(p => p.kids.map(k => ({ ...k, phase: p })));
  const byId    = Object.fromEntries(LEAVES.map(l => [l.id, l]));
  const orderOf = Object.fromEntries(LEAVES.map((l, i) => [l.id, i]));
  const FAST    = new Set(DAYS.flatMap(d => d.ids));

  const weekOf = {}; WEEKS.forEach(w => w.ids.forEach(id => { weekOf[id] = w.n; }));
  const dayOf  = {}; DAYS.forEach(d => d.ids.forEach(id => { dayOf[id] = d.n; }));

  const mins    = l => l.r + l.x + l.d;
  const dayMins = d => d.ids.reduce((s, id) => s + (byId[id] ? mins(byId[id]) : 0), 0);
  const sumMins = ls => ls.reduce((s, l) => s + mins(l), 0);

  const compByN     = Object.fromEntries(COMPS.map(c => [c.n, c]));
  const compIdsFor  = l => COMP_PHASE[l.phase.id] || [];

  const refsIn = (body, attr) =>
    [...body.matchAll(new RegExp(`data-${attr}="([^"${'$'}{}]+)"`, 'g'))].map(m => m[1]);

  /* Bài sau của mỗi bài, theo thứ tự học. Dùng cho cổng nhắc đọc lại
     PAYOFF[id][1] — câu "bài sau dùng nó để…" — khi bài sau đã đổi. */
  const nextOf = {};
  LEAVES.forEach((l, i) => { if (i + 1 < LEAVES.length) nextOf[l.id] = LEAVES[i + 1].id; });

  return {
    src, lines, htmlPath,
    TREE, WEEKS, DAYS, PAYOFF, COMPS, ACCEPT, QUIZ, SCOPE, PORTFOLIO,
    PHASE_OUTCOME, COMP_PHASE, DELIV_MIN, READONLY_OK,
    TPL, tplBy, nodeTpl, refsIn,
    LEAVES, byId, orderOf, FAST, weekOf, dayOf, nextOf,
    mins, dayMins, sumMins, compByN, compIdsFor,
  };
}
