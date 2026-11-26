// @ts-check
/* Markdown của cả dự án, thuần: xuất (toMarkdown) và nhập (fromMarkdown). Khuôn ghi đủ ở step-planner/FORMAT.md.
   Xuất: splitInline, toMarkdown, fromMarkdown.
   Dùng: core/board.js, core/design-md.js, core/handoffs.js, core/model.js. */
import { fold } from './board.js';
import { DESIGN_HEADING, DESIGN_HEAD_RE, designMd, designReader } from './design-md.js';
import { holderTitle, holders, outIndex } from './handoffs.js';
import { APP_NAME, FROM_MARK, LOG_HEADING, LOOSE_STEP, MARK, MD_VERSION, REASON_LABEL, hasReason, normDoc, normWorkspace, oneLine, parseDate, uid } from './model.js';

/* ── Markdown ── (khuôn ghi đủ ở step-planner/FORMAT.md) */

/* Ký tự thoát `\x` (x < U+18FF) đổi tạm sang vùng riêng của Unicode (U+E000 + x) để các biểu thức bên dưới không thấy nó, rồi
 * đổi lại. Ký tự vùng riêng có sẵn trong chữ mang dấu PUA_MARK (U+F8FF, không ký tự thoát nào đổi ra nó) đứng trước: restore
 * trả nguyên. Dấu và ký tự luôn đi liền (chỉ tách theo ` · `). */
const PUA = 0xe000;
const PUA_MARK = '\uf8ff';
const isPua = (/** @type {string} */ c) => c >= '\ue000' && c <= '\uf8ff';
const protect = (/** @type {string} */ s) => s.replace(/\\([\s\S])|[\ue000-\uf8ff]/g, (m, c) => {
  if (c === undefined) return PUA_MARK + m;
  const k = c.charCodeAt(0);
  return k < 0x18ff ? String.fromCharCode(PUA + k) : isPua(c) ? PUA_MARK + c : c;
});
const restore = (/** @type {string} */ s) => s.replace(/\uf8ff([\ue000-\uf8ff])|[\ue000-\uf8fe]/g,
  (m, p) => (p !== undefined ? p : String.fromCharCode(m.charCodeAt(0) - PUA)));
/** Tách chuỗi đã protect theo ` · `. */
const splitDots = (/** @type {string} */ s) => s.split(' · ');

/** Tên trên dòng bước con: thoát `\`, `·`, `@` (Markdown viết tay có `@tên` thì token ấy bị bỏ), và chữ `hạn` / `due`
 * để không bị đọc là hạn. */
const escInline = (/** @type {string} */ s) => s.replace(/\\/g, '\\\\').replace(/·/g, '\\·').replace(/@/g, '\\@')
  .replace(/(^|[^\p{L}\p{N}])(hạn|due)/giu, (_, a, k) => a + '\\' + k);

/** Tách theo ` · ` chưa thoát, đồng thời bỏ thoát. @param {string} line */
export const splitInline = (line) => splitDots(protect(line)).map(restore);

/* Nhãn Markdown: xuất nhãn tiếng Anh (định dạng 3); nhập nhận cả nhãn tiếng Việt của định dạng 2, không phân biệt hoa
 * thường. */
const LABELS = {
  goal: ['Goal', 'Mục tiêu'], // lang: vi — nhãn định dạng 2, chỉ để nhập
  doneWhen: ['Done when', 'Xong khi'],
  reopened: ['Reopened', 'Quay lại'], // lang: vi — nhãn định dạng 2, chỉ để nhập
  iteration: ['Iteration', 'Vòng'], // lang: vi — nhãn định dạng 2, chỉ để nhập
  notes: ['Notes', 'Ghi chú'], // lang: vi — nhãn định dạng 2, chỉ để nhập
  docs: ['Docs', 'Tài liệu'], // lang: vi — nhãn định dạng 2, chỉ để nhập
  why: ['Why', 'Vì sao'], // lang: vi — nhãn định dạng 2, chỉ để nhập
  /* Lý do của bước con: xuất nhãn theo trạng thái (REASON_LABEL); nhập nhận nhãn nào cũng được nếu trạng thái có lý do. */
  reason: ['Cancelled because', 'Huỷ vì', 'Blocked by', 'Waiting on'], // lang: vi — nhãn định dạng 2, chỉ để nhập
  step: ['Step', 'Bước'], // lang: vi — nhãn định dạng 2, chỉ để nhập
  outs: ['Outputs'], ins: ['Inputs'],
};
const labelRe = (/** @type {string[]} */ names) => names.join('|');
const ANY_LABEL = labelRe(Object.values(LABELS).flat());
/** Khoá của một nhãn (`Goal` / `Mục tiêu` → goal). @param {string} name */
const labelKey = (name) => Object.keys(LABELS).find((k) => LABELS[k].some((n) => n.toLowerCase() === name.toLowerCase())) || '';
/** Dòng mở bằng nhãn `k` rồi `:`; trả phần sau nhãn. @param {string} line @param {keyof typeof LABELS} k */
const after = (line, k) => {
  const m = new RegExp(`^(?:${labelRe(LABELS[k])}):[ \\t]?(.*)$`, 'i').exec(line);
  return m ? m[1] : null;
};

/* Dòng ghi chú: dòng trống viết `\`; dòng có thể bị đọc nhầm (nhãn, đầu mục danh sách, tiêu đề, trích dẫn, `\`)
 * thêm `\` phía trước. */
const RISKY = new RegExp(`^(\\\\|#|>|\\s|([-*+]|\\d+[.)])(\\s|$)|\\*\\*|(${ANY_LABEL}):)`, 'i');
const escBlock = (/** @type {string} */ s) => (s === '' ? '\\' : RISKY.test(s) ? '\\' + s : s);
const unescBlock = (/** @type {string} */ s) => (s.startsWith('\\') ? s.slice(1) : s);
/** Khối dòng: mỗi dòng trừ dòng cuối có hai dấu cách cuối (xuống dòng khi xem trên GitHub, VS Code). */
const hardBreaks = (/** @type {string[]} */ lines) => lines.map((l, i) => (i < lines.length - 1 ? l + '  ' : l));

/* Tài liệu trong Markdown: nhãn `Tài liệu:` rồi mỗi tài liệu một mục thụt. Link: `- [tên](url)`. Văn bản: `- tên` rồi
 * khối rào thụt thêm hai bậc; rào dài hơn chuỗi ` dài nhất trong thân, nên thân chứa ``` hay dòng #, -, nhãn vẫn
 * nguyên. Trong tên: `\`, `[`, `]` thoát bằng `\`. */
const escDoc = (/** @type {string} */ s) => s.replace(/[\\[\]]/g, '\\$&');
/* Tài liệu là bằng chứng: tên mở bằng `Evidence: ` (trang cũ đọc thành một phần tên, không mất gì). Tên thật mở bằng chữ ấy
 * mà không là bằng chứng thì thêm `\` phía trước. */
const PROOF = /^Evidence:[ \t]*/i;
const docTitle = (/** @type {any} */ d) => (d.proof ? 'Evidence: ' : PROOF.test(d.title) ? '\\' : '') + escDoc(d.title);
/** Tên tài liệu đọc từ Markdown (chưa bỏ thoát) → tên, bằng chứng không. @param {string} raw */
const readDocTitle = (raw) => (PROOF.test(raw) ? { title: unescDoc(raw.replace(PROOF, '')), proof: true }
  : { title: unescDoc(/^\\evidence:/i.test(raw) ? raw.slice(1) : raw), proof: false });
const unescDoc = (/** @type {string} */ s) => s.replace(/\\([\\[\]])/g, '$1');
const DOC_LINK = /^\[((?:\\.|[^\]\\])*)\]\((?:<([^<>]*)>|(\S+))\)$/;
const DOC_ITEM = /^(\s*)[-*+][ \t]+(.*)$/;
const DOC_FENCE = /^(\s*)(`{3,}|~{3,})/;
/** Các dòng sau nhãn `Tài liệu:` (nhãn do người gọi ghi). @param {any[]} docs @param {string} ind thụt của nhãn */
function docLines(docs, ind) {
  const out = [];
  for (const d of docs) {
    if (d.kind === 'link') {
      out.push(`${ind}  - [${docTitle(d)}](${/[()]/.test(d.url) ? '<' + d.url + '>' : d.url})`);
      continue;
    }
    const longest = Math.max(0, ...(d.body.match(/`+/g) || []).map((r) => r.length));
    const fence = '`'.repeat(Math.max(3, longest + 1));
    const fi = ind + '    ';
    out.push(`${ind}  - ${docTitle(d)}`, fi + fence + 'markdown',
      ...(d.body ? d.body.split('\n').map((l) => (l ? fi + l : '')) : []), fi + fence);
  }
  return out;
}
/* Bàn giao trong Markdown: nhãn `Outputs:` rồi mỗi đầu ra một mục `- tên · ref`, hợp đồng (note) là dòng thụt thêm hai ngay
 * dưới; nhãn `Inputs:` rồi mỗi đầu vào `- tên đầu ra ← tên bên giao` (bên giao dễ nhầm thì `N. bước › bước con`). Trong tên:
 * `\`, `·`, `←` thoát bằng `\`. Đầu vào mất nguồn (bên giao đã xoá): `- (deleted output)`, không có `←`; nhập lại vẫn là đầu
 * vào mất nguồn. */
const GONE_IN = '(deleted output)';
const escHand = (/** @type {string} */ s) => s.replace(/[\\·←]/g, '\\$&');
const unescHand = (/** @type {string} */ s) => s.replace(/\\([\s\S])/g, '$1');
/** Tách theo `sep` chưa thoát; phần tách ra vẫn giữ dấu thoát. @param {string} s @param {string} sep */
function splitEsc(s, sep) {
  const out = [''];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && i + 1 < s.length) out[out.length - 1] += s[i] + s[++i];
    else if (s.startsWith(sep, i)) { out.push(''); i += sep.length - 1; }
    else out[out.length - 1] += s[i];
  }
  return out;
}
/** Tên đầy đủ của bên giao: `bước › bước con`, hay tên bước. @param {Holder} hd */
const fullTitle = (hd) => (hd.sub ? `${hd.step.title} › ${hd.sub.title}` : hd.step.title);
/** Số bước đầu nhãn bên giao: `N. tên đầy đủ`. */
const NUMBERED = /^(\d+)\. ([\s\S]*)$/;
/** Nhãn bên giao không đánh số mà mở bằng `N. ` thì thoát: `\N. …`. @param {string} s đã escHand */
const escNum = (s) => (NUMBERED.test(s) ? '\\' + s : s);
/** Các dòng sau nhãn `Outputs:` / `Inputs:` (nhãn do người gọi ghi). @param {any} h @param {any} ws @param {Map<string, any>} idx @param {string} ind */
function handLines(h, ws, idx, ind) {
  const outs = [], ins = [];
  for (const o of h.outs) {
    const head = `${ind}  - ${escHand(o.name)}${o.ref ? ' · ' + escHand(o.ref) : ''}`;
    outs.push(...(o.note ? hardBreaks([head, `${ind}    ${escBlock(o.note)}`]) : [head]));
  }
  for (const id of h.ins) {
    const src = idx.get(id);
    if (!src) { ins.push(`${ind}  - ${GONE_IN}`); continue; }
    const short = holderTitle(src);
    /* Bên giao khác cùng tên đầu ra và cùng tên ngắn (bỏ dấu, hoa thường; kể cả bước trùng tên bước con): ghi số bước và tên
     * đầy đủ, như `Step: N. tên` của nhật ký. */
    const clash = [...idx.values()].some((y) => y.h !== src.h && fold(y.out.name) === fold(src.out.name) && fold(holderTitle(y)) === fold(short));
    ins.push(`${ind}  - ${escHand(src.out.name)} ← ${clash ? `${src.i + 1}. ${escHand(fullTitle(src))}` : escNum(escHand(short))}`);
  }
  return { outs, ins };
}
/**
 * Đọc các mục bàn giao bắt đầu ở dòng i (ngay sau nhãn), thụt ít nhất `min`. Đầu ra vào `h.outs` (id mới); đầu vào giữ chữ ở
 * `h.inRefs`, giải sau khi đọc hết file (resolveIns). Trả dòng đầu tiên không thuộc chúng.
 * @param {string[]} lines @param {number} i @param {'outs'|'ins'} kind @param {any} h @param {number} min
 */
function readHand(lines, i, kind, h, min) {
  const ITEM_RE = /^(\s*)[-*+][ \t]+(.*?)\s*$/;
  while (i < lines.length) {
    const m = ITEM_RE.exec(lines[i]);
    if (!m || m[1].length < min) break;
    if (kind === 'ins') (h.inRefs = h.inRefs || []).push(m[2]);
    else {
      const [name, ref = '', ...rest] = splitEsc(m[2], ' · ').map((p) => unescHand(p).trim());
      let note = rest.join(' · ');
      const nx = lines[i + 1] ?? '';
      if (nx.trim() && /^\s*/.exec(nx)[0].length > m[1].length && !ITEM_RE.test(nx)) { note = unescBlock(nx.trim()); i++; }
      (h.outs = h.outs || []).push({ id: uid('o'), name, ref, note });
    }
    i++;
  }
  return i;
}
/**
 * Đầu vào đọc từ Markdown → id đầu ra: theo tên đầu ra (bỏ dấu, hoa thường), trùng thì theo bên giao: `N. tên đầy đủ` (bước thứ
 * N), rồi tên đầy đủ, rồi tên ngắn. Còn nhiều cái khớp: ưu tiên tên đầu ra đúng từng chữ hoa thường, rồi tên bên giao đúng như vậy.
 * @param {any} ws @param {string[]} warnings
 */
function resolveIns(ws, warnings) {
  const all = holders(ws); // bước đọc từ Markdown luôn có `subs`
  const outs = all.flatMap((hd) => (hd.h.outs || []).map((/** @type {any} */ out) => ({ out, hd, short: fold(holderTitle(hd)), full: fold(fullTitle(hd)) })));
  for (const { h } of all) {
    if (!h.inRefs) continue;
    h.ins = [];
    for (const raw of h.inRefs) {
      const [nm, ...from] = splitEsc(raw, ' ← ');
      const name = unescHand(nm).trim();
      const byRaw = from.join(' ← ').trim();
      const by = from.length ? unescHand(byRaw).trim() : '';
      if (!by && fold(oneLine(name)) === fold(GONE_IN)) { h.ins.push(uid('o')); continue; } // mất nguồn: id không trỏ tới đâu
      const cand = outs.filter((c) => c.hd.h !== h && fold(oneLine(c.out.name)) === fold(oneLine(name)));
      const num = NUMBERED.exec(byRaw);
      const fb = fold(oneLine(by));
      /** @type {typeof outs} */ let hit = cand;
      if (by) {
        hit = num ? cand.filter((c) => c.hd.i === Number(num[1]) - 1 && c.full === fold(oneLine(unescHand(num[2])))) : [];
        if (!hit.length) hit = cand.filter((c) => c.full === fb);
        if (!hit.length) hit = cand.filter((c) => c.short === fb);
      }
      /** @param {typeof outs} list @param {(c: any) => boolean} f */
      const prefer = (list, f) => (list.length > 1 && list.some(f) ? list.filter(f) : list);
      hit = prefer(hit, (c) => c.out.name === oneLine(name));
      if (by) hit = prefer(hit, (c) => [fullTitle(c.hd), holderTitle(c.hd), `${c.hd.i + 1}. ${fullTitle(c.hd)}`].includes(oneLine(by)));
      const pick = hit.length ? hit : cand.length === 1 ? cand : [];
      const shown = name + (by ? ` ← ${by}` : '');
      if (!pick.length) { warnings.push(`Input not found, dropped: ${shown}`); continue; }
      if (pick.length > 1) warnings.push(`Input matches ${pick.length} outputs, linked to the first: ${shown}`);
      h.ins.push(pick[0].out.id);
    }
    delete h.inRefs;
  }
}
/** Bỏ tối đa n dấu cách đầu dòng. @param {string} l @param {number} n */
const dedent = (l, n) => l.replace(new RegExp(`^ {0,${n}}`), '');
/** Dòng k mở một tài liệu: mục là link, hoặc mục mà dòng ngay sau là rào. Mục mở bằng ô việc (`[ ]`, `[x]`…) là
 * bước con, kể cả khi ghi chú của nó mở bằng rào (tên tài liệu xuất ra luôn thoát `[`).
 * @param {string[]} lines @param {number} k @param {number} min */
function docAt(lines, k, min) {
  const m = DOC_ITEM.exec(lines[k] || '');
  return !!m && m[1].length >= min && (DOC_LINK.test(m[2]) || (!/^\[.?\]/.test(m[2]) && DOC_FENCE.test(lines[k + 1] || '')));
}
/**
 * Đọc các tài liệu bắt đầu ở dòng i (ngay sau nhãn `Tài liệu:`), đẩy vào docs. Trả về dòng đầu tiên không thuộc chúng.
 * min: thụt tối thiểu của mục (bước con: 2, để mục không thụt vẫn là bước con).
 * @param {string[]} lines @param {number} i @param {any[]} docs @param {string[]} warnings @param {number} min
 */
function readDocs(lines, i, docs, warnings, min) {
  while (i < lines.length) {
    if (!lines[i].trim()) {
      let k = i;
      while (k < lines.length && !lines[k].trim()) k++;
      if (!docAt(lines, k, min)) return i;
      i = k;
    }
    if (!docAt(lines, i, min)) return i;
    const text = /** @type {RegExpExecArray} */ (DOC_ITEM.exec(lines[i]))[2].trim();
    const lk = DOC_LINK.exec(text);
    if (lk) {
      const { title, proof } = readDocTitle(lk[1]), url = lk[2] ?? lk[3];
      const d = normDoc({ kind: 'link', title, url, proof });
      if (d) docs.push(d); else warnings.push(`Link is not http(s), skipped: ${title || url}`);
      i++;
      continue;
    }
    const f = /** @type {RegExpExecArray} */ (DOC_FENCE.exec(lines[i + 1]));
    const close = new RegExp(`^\\s*${f[2][0] === '`' ? '`' : '~'}{${f[2].length},}\\s*$`);
    const body = [];
    let k = i + 2;
    while (k < lines.length && !close.test(lines[k])) body.push(dedent(lines[k++], f[1].length));
    const { title, proof } = readDocTitle(text);
    if (k >= lines.length) warnings.push(`Document "${title}" has no closing fence; read to the end of the file.`);
    docs.push(normDoc({ kind: 'md', title, body: body.join('\n'), proof }));
    i = k + 1;
  }
  return i;
}

/**
 * `labels` (tuỳ chọn): danh mục thiết kế (data/system-design.json), cho mục System design dễ đọc; nhập chỉ đọc id.
 * @param {any} ws @param {any} [labels]
 * @returns {string}
 */
export function toMarkdown(ws, labels = null) {
  const out = [`# ${ws.name}`, '', `> ${APP_NAME} · format ${MD_VERSION}`];
  const idx = outIndex(ws);
  if (ws.templateId) out.push('>', `> Template: ${ws.templateId}`);
  if (ws.notes) out.push('', ...hardBreaks(ws.notes.split('\n').map(escBlock)));
  ws.steps.forEach((/** @type {any} */ s, /** @type {number} */ i) => {
    out.push('', `## ${i + 1}. ${s.title}`);
    if (s.goal) out.push('', `Goal: ${s.goal}`);
    if (s.doneWhen) out.push('', `Done when: ${s.doneWhen}`);
    if (s.revisit) out.push('', `Reopened: ${s.revisit.date} · iteration ${s.revisit.round}` + (s.revisit.reason ? ` · ${s.revisit.reason}` : ''));
    else if (s.round > 1) out.push('', `Iteration: ${s.round}`);
    if (s.notes) out.push('', ...hardBreaks(['Notes:', ...s.notes.split('\n').map((l) => '  ' + escBlock(l))]));
    if (s.docs.length) out.push('', 'Docs:', ...docLines(s.docs, ''));
    const sh = handLines(s, ws, idx, '');
    if (sh.outs.length) out.push('', 'Outputs:', ...sh.outs);
    if (sh.ins.length) out.push('', 'Inputs:', ...sh.ins);
    if (s.subs.length) out.push('');
    for (const x of s.subs) {
      let line = `- [${MARK[x.status]}] ${escInline(x.title)}`;
      if (x.par) line += ' · parallel';
      if (x.redo) line += ' · redo';
      if (x.due) line += ` · due ${x.due}`;
      if (x.status === 'done' && x.doneAt) line += ` · done ${x.doneAt}`;
      const more = [];
      if (x.doneWhen) more.push(`  Done when: ${x.doneWhen}`);
      if (hasReason(x.status) && x.reason) {
        const [first, ...rest] = x.reason.split('\n');
        more.push(`  ${REASON_LABEL[x.status]}: ${first}`, ...rest.map((l) => '    ' + escBlock(l)));
      }
      if (x.notes) more.push(...x.notes.split('\n').map((l) => '  ' + escBlock(l)));
      if (x.docs.length) more.push('  Docs:');
      const xh = handLines(x, ws, idx, '  ');
      out.push(...hardBreaks([line, ...more]), ...docLines(x.docs, '  '),
        ...(xh.outs.length ? ['  Outputs:', ...xh.outs] : []), ...(xh.ins.length ? ['  Inputs:', ...xh.ins] : []));
    }
  });
  if (ws.design) out.push('', `## ${DESIGN_HEADING}`, ...designMd(ws.design, labels, escBlock, hardBreaks));
  if (ws.log.length) {
    out.push('', `## ${LOG_HEADING}`, '');
    for (const l of ws.log) {
      const why = l.why ? l.why.split('\n') : [];
      /* Số thứ tự như tiêu đề `## N. tên`: hai bước trùng tên vẫn phân biệt được. */
      const k = ws.steps.findIndex((/** @type {any} */ s) => s.id === l.stepId);
      out.push(...hardBreaks([`- ${l.date} · ${l.decision}`, ...(k >= 0 ? [`  Step: ${k + 1}. ${ws.steps[k].title}`] : []),
        ...why.map((w, k) => (k ? '  ' + escBlock(w) : `  Why: ${w}`))]));
    }
  }
  return out.join('\n') + '\n';
}

const ITEM = /^(?:[-*+]|\d+[.)])\s+(?:\[(.?)\]\s*)?(.*)$/;
const STEP_PREFIX = /^(?:(?:bước|step)\s*)?\d+(?:\s*[.):]\s*|\s+)/i;
const DATE_TOKEN = '(\\d{4}-\\d{1,2}-\\d{1,2}|\\d{1,2}\\/\\d{1,2}\\/\\d{4})';
const META_DUE = new RegExp(`^(?:hạn|due):?\\s+${DATE_TOKEN}$`, 'i'); // lang: vi — nhãn định dạng 2, chỉ để nhập
const META_DONE = new RegExp(`^done:?\\s+${DATE_TOKEN}$`, 'i'); // ngày xong (`doneAt`)
const TITLE_DUE = new RegExp(`(^|[\\s(\\[,;])(?:hạn|due):?\\s+(\\d{1,4}[-\\/]\\d{1,2}[-\\/]\\d{1,4})`, 'gi'); // lang: vi — nhãn định dạng 2, chỉ để nhập
const LOG_DATE = new RegExp(`^${DATE_TOKEN}\\s*(?:·|–|-|:)?\\s*(.*)$`);

/**
 * Chữ sau dấu ô của một bước con: tên và hạn. Viết tay thì `hạn` / `due` ở đâu trên dòng cũng được. Không có khái niệm
 * người làm: `@tên`, `` `@tên` `` (file cũ, Markdown viết tay) bị bỏ khỏi tên.
 * @param {string} raw @param {string[]} warnings
 */
function parseSubText(raw, warnings) {
  const parts = splitDots(protect(raw));
  let title = parts[0];
  let due = '';
  let par = false;
  let redo = false;
  let doneAt = '';
  for (const part of parts.slice(1)) {
    const t = part.trim();
    let m;
    if (/^`@[^`]+`$/.test(t) || /^@.+$/.test(t)) continue; // người làm của file cũ: bỏ
    if (/^(?:parallel|song song)$/i.test(restore(t))) { par = true; continue; }
    if (/^(?:redo|làm lại)$/i.test(restore(t))) { redo = true; continue; }
    if ((m = META_DONE.exec(restore(t))) && parseDate(m[1]) && !doneAt) { doneAt = parseDate(m[1]); continue; }
    if ((m = META_DUE.exec(restore(t))) && parseDate(m[1]) && !due) due = parseDate(m[1]);
    else {
      if (/^(?:hạn|due)\b/i.test(restore(t))) warnings.push(`Due date not readable, kept in the title: ${restore(t)}`);
      title += ' · ' + part;
    }
  }
  let changed = false;
  title = title.replace(/`@[^`]+`/g, () => { changed = true; return ' '; });
  title = title.replace(/(^|[\s(\[,;])@[^\s,;()[\]`]+/g, (_, pre) => { changed = true; return pre; });
  title = title.replace(TITLE_DUE, (all, pre, d) => {
    const v = parseDate(d);
    if (!v) { warnings.push(`Due date not readable: ${d}`); return all; }
    if (!due) due = v;
    changed = true;
    return pre;
  });
  if (changed) title = title.replace(/\(\s*(?:[,;]\s*)*\)/g, '').replace(/\s+/g, ' ').replace(/^[\s,;·:-]+|[\s,;·:-]+$/g, '');
  return { title: restore(title).trim(), due, par, redo, doneAt };
}

/**
 * Đọc Markdown: khuôn do trang xuất, và cả Markdown viết tay (gạch đầu dòng thường, `+`, `1.`, `[]`, mục lồng, ngày
 * dd/mm/yyyy, chữ trước bước đầu). Dòng lạ không bị bỏ: thành ghi chú.
 * @param {string} text
 * @returns {{ workspace: any, warnings: string[] }}
 */
export function fromMarkdown(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  /** @type {string[]} */
  const warnings = [];
  /** @type {any} */
  const ws = { name: '', templateId: '', steps: [], log: [] };
  /** @type {any} */ let step = null;
  /** @type {any} */ let sub = null;
  /** @type {any} */ let entry = null;
  /** @type {any} */ let dr = null; // bộ đọc mục System design (core/design-md.js)
  let inLog = false;
  let inDesign = false;
  let started = false; // đã qua `## ` đầu tiên
  let block = /** @type {'' | 'step' | 'sub' | 'why'} */ ('');
  let blockFirst = false;
  let reasonCont = false; // đang ở các dòng thụt bốn nối tiếp nhãn lý do (`Cancelled because:`, `Huỷ vì:`…)
  const addNote = (/** @type {any} */ o, /** @type {string} */ key, /** @type {string} */ l) => {
    o[key] = o[key] === undefined || o[key] === null ? l : o[key] + '\n' + l;
  };
  const newSub = (/** @type {string} */ mark, /** @type {string} */ rest) => {
    if (!step) { step = { title: LOOSE_STEP, subs: [] }; ws.steps.push(step); }
    const p = parseSubText(rest, warnings);
    sub = { title: p.title, status: FROM_MARK[mark ?? ' '] || 'todo', due: p.due, par: p.par, redo: p.redo, doneAt: p.doneAt };
    if (mark != null && !(mark in FROM_MARK)) warnings.push(`Unknown mark [${mark}], read as New: ${p.title}`);
    step.subs.push(sub);
    block = 'sub'; blockFirst = true;
  };
  const newEntry = (/** @type {string} */ s) => {
    const d = LOG_DATE.exec(s);
    entry = d && parseDate(d[1]) ? { date: parseDate(d[1]), decision: d[2] } : { decision: s };
    ws.log.push(entry);
    block = 'why'; blockFirst = true;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (inDesign && !/^## /.test(raw)) { dr.line(raw); continue; }
    const ind = /^( {2}|\t)(.*)$/.exec(raw);
    if (ind && block === 'sub' && reasonCont && /^ {2}/.test(ind[2])) {
      sub.reason += '\n' + unescBlock(ind[2].slice(2));
      continue;
    }
    reasonCont = false;
    /* Nhãn lý do chỉ là lý do khi trạng thái có lý do; còn lại là một dòng ghi chú (không mất chữ). */
    if (ind && block === 'sub' && hasReason(sub.status) && after(ind[2], 'reason') !== null) {
      sub.reason = /** @type {string} */ (after(ind[2], 'reason'));
      reasonCont = true;
      blockFirst = false;
      continue;
    }
    const hk = ind && block === 'sub' ? (['outs', 'ins'].find((k) => /^\s*$/.test(after(ind[2], /** @type {any} */ (k)) ?? 'x')) || '') : '';
    if (hk) {
      i = readHand(lines, i + 1, /** @type {'outs'|'ins'} */ (hk), sub, 3) - 1;
      blockFirst = false;
      continue;
    }
    if (ind && block === 'sub' && /^\s*$/.test(after(ind[2], 'docs') ?? 'x')) {
      sub.docs = sub.docs || [];
      i = readDocs(lines, i + 1, sub.docs, warnings, 2) - 1;
      blockFirst = false;
      continue;
    }
    if (ind && block) {
      const l = ind[2];
      const item = ITEM.exec(l.trimStart());
      if (block === 'sub' && item && !/^\s*\\/.test(l)) { newSub(item[1], item[2]); continue; }
      if (block === 'sub') {
        if (blockFirst && after(l, 'doneWhen') !== null) sub.doneWhen = /** @type {string} */ (after(l, 'doneWhen'));
        else addNote(sub, 'notes', unescBlock(l));
      } else if (block === 'step') addNote(step, 'notes', unescBlock(l));
      else if (block === 'why' && blockFirst && entry.why == null && entry.stepTitle == null && after(l, 'step') !== null) {
        entry.stepTitle = oneLine(after(l, 'step')); // `Step:` đứng ngay dưới dòng quyết định, trước `Why:`
        continue;
      } else if (block === 'why') addNote(entry, 'why', blockFirst && after(l, 'why') !== null ? /** @type {string} */ (after(l, 'why')) : unescBlock(l));
      blockFirst = false;
      continue;
    }
    if (block === 'sub' && raw.trim() === '') continue; // dòng trống giữa các bước con
    block = '';
    if (raw.trim() === '') continue;
    let m;
    if ((m = /^## (.+)$/.exec(raw))) {
      started = true; sub = null;
      const h = m[1].trim();
      if (/^(nhật ký( quyết định)?|decision log)$/i.test(h)) { inLog = true; inDesign = false; step = null; continue; }
      inLog = false;
      if (DESIGN_HEAD_RE.test(h)) {
        inDesign = true; step = null;
        if (!dr) { dr = designReader(warnings, unescBlock); ws.design = dr.design; }
        continue;
      }
      inDesign = false;
      step = { title: h.replace(STEP_PREFIX, '') || h, subs: [] };
      ws.steps.push(step);
      continue;
    }
    if (inLog) {
      const it = ITEM.exec(raw);
      newEntry(it ? it[2] : raw.trim());
      continue;
    }
    if (!started) {
      if ((m = /^# (.+)$/.exec(raw)) && !ws.name) { ws.name = m[1]; continue; }
      if ((m = /^>\s?(.*)$/.exec(raw))) {
        const kv = /^(?:Template|Mẫu):\s*(.*)$/i.exec(m[1]);
        if (kv) ws.templateId = kv[1]; // dòng `Người:` của file cũ: bỏ qua
        continue;
      }
      const it = ITEM.exec(raw);
      if (it) { newSub(it[1], it[2]); continue; }
      if (!ws.name && !ws.notes && !ws.steps.length) { ws.name = raw.replace(/^#+\s*/, ''); continue; }
      addNote(ws, 'notes', unescBlock(raw));
      continue;
    }
    if (!step) continue;
    const it = ITEM.exec(raw);
    if (it) { newSub(it[1], it[2]); continue; }
    sub = null;
    const mm = new RegExp(`^\\**(${ANY_LABEL}):\\**\\s?(.*)$`, 'i').exec(raw);
    const key = mm ? labelKey(mm[1]) : '';
    const meta = mm && ['goal', 'doneWhen', 'reopened', 'iteration', 'notes', 'docs', 'outs', 'ins'].includes(key) ? [mm[0], key, mm[2]] : null;
    if (meta && meta[1] === 'goal') step.goal = meta[2];
    else if (meta && meta[1] === 'doneWhen') step.doneWhen = meta[2];
    else if (meta && meta[1] === 'reopened') {
      /* `ngày · iteration N · lý do` (định dạng 2: `vòng N`); dòng cũ `ngày · lý do` (không vòng) vẫn đọc: vòng 2. */
      const d = /^(\S+)(?: · (?:iteration|vòng) (\d+)(?= · |$))?(?: · (.*))?$/i.exec(meta[2]);
      step.revisit = d && parseDate(d[1]) ? { date: parseDate(d[1]), round: d[2] ? +d[2] : 0, reason: d[3] || '' } : { reason: meta[2] };
    } else if (meta && meta[1] === 'iteration') {
      const n = /^\s*(\d+)\s*$/.exec(meta[2]);
      if (n) step.round = +n[1]; else addNote(step, 'notes', raw);
    } else if (meta && meta[1] === 'notes' && !meta[2].trim()) { block = 'step'; blockFirst = true; }
    else if (meta && meta[1] === 'docs' && !meta[2].trim()) {
      step.docs = step.docs || [];
      i = readDocs(lines, i + 1, step.docs, warnings, 0) - 1;
    }
    else if (meta && (meta[1] === 'outs' || meta[1] === 'ins') && !meta[2].trim()) i = readHand(lines, i + 1, /** @type {any} */ (meta[1]), step, 2) - 1;
    else addNote(step, 'notes', raw);
  }
  if (!ws.name && !ws.steps.length) throw new Error('No "# …" title, "## …" step or "- [ ] …" task found.');
  resolveIns(ws, warnings);
  /* `Step: N. tên` của quyết định: bước thứ N nếu đúng tên ấy; không thì bước đầu tiên tên đúng cả chuỗi (file cũ ghi
   * `Step: tên`), rồi bước đầu tiên tên đúng phần sau số. So tên bỏ dấu, không phân biệt hoa thường. */
  const named = (/** @type {string} */ t) => ws.steps.find((/** @type {any} */ x) => fold(oneLine(x.title)) === fold(t));
  for (const l of ws.log) {
    if (l.stepTitle == null) continue;
    const nm = /^(\d+)\.\s+(.+)$/.exec(l.stepTitle);
    const at = nm ? ws.steps[+nm[1] - 1] : null;
    const s = (nm && at && fold(oneLine(at.title)) === fold(nm[2]) ? at : null) || named(l.stepTitle) || (nm ? named(nm[2]) : null);
    if (s) l.stepId = s.id = s.id || uid('t');
    else if (l.stepTitle) warnings.push(`Decision linked to a missing step, link dropped: ${l.stepTitle}`);
    delete l.stepTitle;
  }
  return { workspace: normWorkspace(ws), warnings };
}
