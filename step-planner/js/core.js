// @ts-check
/* Logic thuần của Step Planner: chuẩn hoá dữ liệu, tiến độ, Markdown và JSON vào / ra.
 * Không đụng DOM hay bộ nhớ trình duyệt; chạy được trong Node (tools/test-core.mjs). */

/* Sáu trạng thái. Bỏ qua: việc không cần với dự án này. Huỷ: đã quyết không làm, giữ thẻ để nhớ vì sao (cancelReason).
 * Tiến độ và "Tiếp theo" không tính cả hai. */
export const STATUSES = ['todo', 'doing', 'done', 'blocked', 'skip', 'cancel'];
export const STATUS_LABEL = { todo: 'Chưa làm', doing: 'Đang làm', done: 'Xong', blocked: 'Bị chặn', skip: 'Bỏ qua', cancel: 'Huỷ' };
const MARK = { todo: ' ', doing: '~', done: 'x', blocked: '!', skip: '-', cancel: '/' };
const FROM_MARK = { ' ': 'todo', '': 'todo', '~': 'doing', x: 'done', X: 'done', '!': 'blocked', '-': 'skip', '/': 'cancel' };
/* Bấm chip: chưa làm → đang làm → xong → chưa làm. Bị chặn → đang làm; bỏ qua, huỷ → chưa làm. */
const NEXT = { todo: 'doing', doing: 'done', done: 'todo', blocked: 'doing', skip: 'todo', cancel: 'todo' };
/** Trạng thái không tính vào tiến độ và việc tiếp theo. @param {string} s */
export const outOfScope = (s) => s === 'skip' || s === 'cancel';
export const nextStatus = (/** @type {string} */ s) => NEXT[s] || 'todo';

export const FORMAT = 'step-planner';
export const VERSION = 2;
export const MD_VERSION = 2;
export const APP_NAME = 'Data Science Step Planner';
export const LOG_HEADING = 'Nhật ký quyết định';
export const LOOSE_STEP = 'Việc chung';

let seq = 0;
export function uid(prefix = 'x') {
  return prefix + Date.now().toString(36) + (seq++).toString(36) + Math.random().toString(36).slice(2, 6);
}

const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
/** Ngày hôm nay theo giờ máy, dạng YYYY-MM-DD. */
export function today(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Ngày hợp lệ → YYYY-MM-DD, không thì ''. Nhận YYYY-MM-DD, YYYY-M-D, DD/MM/YYYY, D/M/YYYY; ngày phải có thật. */
export function parseDate(/** @type {any} */ s) {
  const t = String(s ?? '').trim();
  let r, y, m, d;
  if ((r = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t))) [y, m, d] = [+r[1], +r[2], +r[3]];
  else if ((r = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t))) [d, m, y] = [+r[1], +r[2], +r[3]];
  else return '';
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (y < 1000 || dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return '';
  return `${y}-${pad(m)}-${pad(d)}`;
}

/* ── Chuẩn hoá ── */

export const isObj = (/** @type {any} */ o) => !!o && typeof o === 'object' && !Array.isArray(o);
export const oneLine = (/** @type {any} */ s) => (typeof s === 'string' || typeof s === 'number' ? String(s) : '').replace(/\s+/g, ' ').trim();
export const multiLine = (/** @type {any} */ s) => (typeof s === 'string' ? s : '').replace(/\r\n?/g, '\n').split('\n')
  .map((l) => l.replace(/\s+$/, '')).join('\n').replace(/^\n+|\n+$/g, '');
const isoOr = (/** @type {any} */ s) => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(s) && !isNaN(Date.parse(s)) ? s : new Date().toISOString());
const objs = (/** @type {any} */ a) => (Array.isArray(a) ? a.filter(isObj) : []);
const idOr = (/** @type {any} */ id, /** @type {string} */ p) => (typeof id === 'string' && id ? id : uid(p));

/* Tài liệu của bước / bước con: link (chỉ http(s)) hoặc văn bản Markdown. */
export const DOC_KINDS = ['link', 'md'];
/** URL http(s) một dòng, không khoảng trắng; `<` `>` mã hoá để ghi được trong Markdown. Khác thì ''. @param {any} u */
export function safeUrl(u) {
  const s = oneLine(u).replace(/</g, '%3C').replace(/>/g, '%3E');
  return /^https?:\/\/[^\s]+$/i.test(s) ? s : '';
}
/** Thân văn bản Markdown: giữ nguyên từng dòng (kể cả dấu cách cuối dòng), bỏ dòng trống đầu và khoảng trắng cuối. */
const mdBody = (/** @type {any} */ s) => (typeof s === 'string' ? s : '').replace(/\r\n?/g, '\n').replace(/^(?:[ \t]*\n)+/, '').replace(/\s+$/, '');
/** Một tài liệu, hoặc null nếu hỏng (không phải object, link không phải http(s)). @param {any} o */
export function normDoc(o) {
  if (!isObj(o)) return null;
  const kind = o.kind === 'link' || (o.kind !== 'md' && typeof o.url === 'string' && o.url) ? 'link' : 'md';
  if (kind === 'link') {
    const url = safeUrl(o.url);
    return url ? { id: idOr(o.id, 'd'), kind, title: oneLine(o.title) || url, url } : null;
  }
  return { id: idOr(o.id, 'd'), kind, title: oneLine(o.title) || 'Tài liệu', body: mdBody(o.body) };
}
const docsOf = (/** @type {any} */ a) => (Array.isArray(a) ? a.map(normDoc).filter(Boolean) : []);

/** @param {any} o */
export function normSub(o) {
  const x = isObj(o) ? o : {};
  const status = STATUSES.includes(x.status) ? x.status : 'todo';
  return {
    id: idOr(x.id, 's'),
    title: oneLine(x.title) || 'Bước con',
    status,
    cancelReason: status === 'cancel' ? multiLine(x.cancelReason) : '',
    due: parseDate(x.due),
    doneWhen: oneLine(x.doneWhen),
    notes: multiLine(x.notes),
    docs: docsOf(x.docs),
  };
}

/** Số nguyên dương, không thì 0. @param {any} v */
const posInt = (v) => (Number.isInteger(v) && v > 0 && v < 10000 ? v : 0);

/* Vòng: step.round là vòng gần nhất của bước (1 = chưa làm lại lần nào). Đánh dấu "Cần làm lại" mở vòng round + 1, ghi
 * cả vào revisit.round; bỏ đánh dấu thì revisit về null, step.round giữ để lần sau tăng tiếp. */
/** @param {any} o */
export function normStep(o) {
  const x = isObj(o) ? o : {};
  const r = x.revisit;
  const rv = isObj(r) ? { reason: oneLine(r.reason), date: parseDate(r.date) || today(), round: Math.max(2, posInt(r.round), posInt(x.round)) } : null;
  return {
    id: idOr(x.id, 't'),
    title: oneLine(x.title) || 'Bước',
    goal: oneLine(x.goal),
    doneWhen: oneLine(x.doneWhen),
    notes: multiLine(x.notes),
    revisit: rv,
    round: rv ? rv.round : Math.max(1, posInt(x.round)),
    docs: docsOf(x.docs),
    subs: objs(x.subs).map(normSub),
  };
}

/** @param {any} o */
export function normLog(o) {
  const x = isObj(o) ? o : {};
  return {
    id: idOr(x.id, 'l'),
    date: parseDate(x.date) || today(),
    decision: oneLine(x.decision) || '(không ghi)',
    why: multiLine(x.why),
  };
}

/** @param {any} o */
export function normWorkspace(o) {
  const x = isObj(o) ? o : {};
  return {
    id: idOr(x.id, 'w'),
    name: oneLine(x.name) || 'Dự án',
    templateId: oneLine(x.templateId),
    createdAt: isoOr(x.createdAt),
    updatedAt: isoOr(x.updatedAt),
    notes: multiLine(x.notes),
    steps: objs(x.steps).map(normStep),
    log: objs(x.log).map(normLog),
  };
}

/** Bản sao sâu với id mới cho mọi thứ — dùng khi nhân bản và khi nhập. @param {any} ws */
export function freshCopy(ws) {
  const c = normWorkspace(JSON.parse(JSON.stringify(normWorkspace(ws))));
  const now = new Date().toISOString();
  c.id = uid('w');
  c.createdAt = now;
  c.updatedAt = now;
  for (const s of c.steps) {
    s.id = uid('t');
    for (const d of s.docs) d.id = uid('d');
    for (const x of s.subs) {
      x.id = uid('s');
      for (const d of x.docs) d.id = uid('d');
    }
  }
  for (const l of c.log) l.id = uid('l');
  return c;
}

/** Tên chưa trùng: tên, rồi "tên (nhập)", "tên (nhập 2)"… @param {string} name @param {Iterable<string>} taken */
export function uniqueName(name, taken, tag = 'nhập') {
  const set = new Set(taken);
  if (!set.has(name)) return name;
  for (let i = 1; ; i++) {
    const n = `${name} (${tag}${i > 1 ? ' ' + i : ''})`;
    if (!set.has(n)) return n;
  }
}

/** Dự án mới từ một mẫu của data/templates.json. @param {any} tpl @param {string} [name] */
export function fromTemplate(tpl, name) {
  const t = isObj(tpl) ? tpl : {};
  const now = new Date().toISOString();
  return normWorkspace({
    name: oneLine(name) || t.name || 'Dự án',
    templateId: t.id || '',
    createdAt: now,
    updatedAt: now,
    steps: objs(t.steps).map((/** @type {any} */ s) => ({
      title: s.title, goal: s.goal, doneWhen: s.doneWhen, notes: s.notes,
      subs: objs(s.subs).map((/** @type {any} */ x) => ({ title: x.title, doneWhen: x.doneWhen, notes: x.notes })),
    })),
  });
}

/* ── Tiến độ ── */

/** Xong / (tổng − bỏ qua − huỷ). @param {{status:string}[]} subs */
export function progress(subs) {
  const total = subs.filter((s) => !outOfScope(s.status)).length;
  const done = subs.filter((s) => s.status === 'done').length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

/** @param {{steps:{subs:{status:string}[]}[]}} ws */
export const overall = (ws) => progress(ws.steps.flatMap((s) => s.subs));

/** Việc tiếp theo của một bước: bước con đầu tiên chưa xong, không bỏ qua, không huỷ. @param {{subs:{id:string,status:string}[]}} step */
export function nextActionId(step) {
  const s = step.subs.find((x) => x.status !== 'done' && !outOfScope(x.status));
  return s ? s.id : null;
}

/** Việc tiếp theo của cả dự án: việc tiếp theo của bước đầu tiên còn việc. @param {any} ws */
export function projectNextId(ws) {
  for (const s of ws.steps) {
    const id = nextActionId(s);
    if (id) return id;
  }
  return null;
}

/** So khớp không phân biệt hoa thường và dấu. */
export const fold = (/** @type {string} */ s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[đĐ]/g, 'd').toLowerCase();

/* ── Markdown ── (khuôn ghi đủ ở step-planner/CLAUDE.md, mục Markdown) */

/* Ký tự thoát `\x` đổi tạm sang vùng riêng của Unicode để các biểu thức bên dưới không thấy nó, rồi đổi lại. */
const PUA = 0xe000;
const protect = (/** @type {string} */ s) => s.replace(/\\([\s\S])/g, (_, c) => (c.charCodeAt(0) < 0x1900 ? String.fromCharCode(PUA + c.charCodeAt(0)) : c));
const restore = (/** @type {string} */ s) => s.replace(/[\ue000-\uf8ff]/g, (c) => String.fromCharCode(c.charCodeAt(0) - PUA));
/** Tách chuỗi đã protect theo ` · `. */
const splitDots = (/** @type {string} */ s) => s.split(' · ');

/** Tên trên dòng bước con: thoát `\`, `·`, `@` (Markdown viết tay có `@tên` thì token ấy bị bỏ), và chữ `hạn` / `due`
 * để không bị đọc là hạn. */
const escInline = (/** @type {string} */ s) => s.replace(/\\/g, '\\\\').replace(/·/g, '\\·').replace(/@/g, '\\@')
  .replace(/(^|[^\p{L}\p{N}])(hạn|due)/giu, (_, a, k) => a + '\\' + k);

/** Tách theo ` · ` chưa thoát, đồng thời bỏ thoát. @param {string} line */
export const splitInline = (line) => splitDots(protect(line)).map(restore);

/* Dòng ghi chú: dòng trống viết `\`; dòng có thể bị đọc nhầm (nhãn, đầu mục danh sách, tiêu đề, trích dẫn, `\`)
 * thêm `\` phía trước. */
const RISKY = /^(\\|#|>|\s|([-*+]|\d+[.)])(\s|$)|\*\*|(Xong khi|Huỷ vì|Vì sao|Mục tiêu|Quay lại|Vòng|Ghi chú|Tài liệu):)/;
const escBlock = (/** @type {string} */ s) => (s === '' ? '\\' : RISKY.test(s) ? '\\' + s : s);
const unescBlock = (/** @type {string} */ s) => (s.startsWith('\\') ? s.slice(1) : s);
/** Khối dòng: mỗi dòng trừ dòng cuối có hai dấu cách cuối (xuống dòng khi xem trên GitHub, VS Code). */
const hardBreaks = (/** @type {string[]} */ lines) => lines.map((l, i) => (i < lines.length - 1 ? l + '  ' : l));

/* Tài liệu trong Markdown: nhãn `Tài liệu:` rồi mỗi tài liệu một mục thụt. Link: `- [tên](url)`. Văn bản: `- tên` rồi
 * khối rào thụt thêm hai bậc; rào dài hơn chuỗi ` dài nhất trong thân, nên thân chứa ``` hay dòng #, -, nhãn vẫn
 * nguyên. Trong tên: `\`, `[`, `]` thoát bằng `\`. */
const escDoc = (/** @type {string} */ s) => s.replace(/[\\[\]]/g, '\\$&');
const unescDoc = (/** @type {string} */ s) => s.replace(/\\([\\[\]])/g, '$1');
const DOC_LINK = /^\[((?:\\.|[^\]\\])*)\]\((?:<([^<>]*)>|(\S+))\)$/;
const DOC_ITEM = /^(\s*)[-*+][ \t]+(.*)$/;
const DOC_FENCE = /^(\s*)(`{3,}|~{3,})/;
/** Các dòng sau nhãn `Tài liệu:` (nhãn do người gọi ghi). @param {any[]} docs @param {string} ind thụt của nhãn */
function docLines(docs, ind) {
  const out = [];
  for (const d of docs) {
    if (d.kind === 'link') {
      out.push(`${ind}  - [${escDoc(d.title)}](${/[()]/.test(d.url) ? '<' + d.url + '>' : d.url})`);
      continue;
    }
    const longest = Math.max(0, ...(d.body.match(/`+/g) || []).map((r) => r.length));
    const fence = '`'.repeat(Math.max(3, longest + 1));
    const fi = ind + '    ';
    out.push(`${ind}  - ${escDoc(d.title)}`, fi + fence + 'markdown',
      ...(d.body ? d.body.split('\n').map((l) => (l ? fi + l : '')) : []), fi + fence);
  }
  return out;
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
      const title = unescDoc(lk[1]), url = lk[2] ?? lk[3];
      const d = normDoc({ kind: 'link', title, url });
      if (d) docs.push(d); else warnings.push(`Link không phải http(s), bỏ: ${title || url}`);
      i++;
      continue;
    }
    const f = /** @type {RegExpExecArray} */ (DOC_FENCE.exec(lines[i + 1]));
    const close = new RegExp(`^\\s*${f[2][0] === '`' ? '`' : '~'}{${f[2].length},}\\s*$`);
    const body = [];
    let k = i + 2;
    while (k < lines.length && !close.test(lines[k])) body.push(dedent(lines[k++], f[1].length));
    const title = unescDoc(text);
    if (k >= lines.length) warnings.push(`Tài liệu "${title}" thiếu rào đóng, đọc tới hết file.`);
    docs.push(normDoc({ kind: 'md', title, body: body.join('\n') }));
    i = k + 1;
  }
  return i;
}

/** @param {any} ws @returns {string} */
export function toMarkdown(ws) {
  const out = [`# ${ws.name}`, '', `> ${APP_NAME} · định dạng ${MD_VERSION}`];
  if (ws.templateId) out.push('>', `> Mẫu: ${ws.templateId}`);
  if (ws.notes) out.push('', ...hardBreaks(ws.notes.split('\n').map(escBlock)));
  ws.steps.forEach((/** @type {any} */ s, /** @type {number} */ i) => {
    out.push('', `## ${i + 1}. ${s.title}`);
    if (s.goal) out.push('', `Mục tiêu: ${s.goal}`);
    if (s.doneWhen) out.push('', `Xong khi: ${s.doneWhen}`);
    if (s.revisit) out.push('', `Quay lại: ${s.revisit.date} · vòng ${s.revisit.round}` + (s.revisit.reason ? ` · ${s.revisit.reason}` : ''));
    else if (s.round > 1) out.push('', `Vòng: ${s.round}`);
    if (s.notes) out.push('', ...hardBreaks(['Ghi chú:', ...s.notes.split('\n').map((l) => '  ' + escBlock(l))]));
    if (s.docs.length) out.push('', 'Tài liệu:', ...docLines(s.docs, ''));
    if (s.subs.length) out.push('');
    for (const x of s.subs) {
      let line = `- [${MARK[x.status]}] ${escInline(x.title)}`;
      if (x.due) line += ` · hạn ${x.due}`;
      const more = [];
      if (x.doneWhen) more.push(`  Xong khi: ${x.doneWhen}`);
      if (x.status === 'cancel' && x.cancelReason) {
        const [first, ...rest] = x.cancelReason.split('\n');
        more.push(`  Huỷ vì: ${first}`, ...rest.map((l) => '    ' + escBlock(l)));
      }
      if (x.notes) more.push(...x.notes.split('\n').map((l) => '  ' + escBlock(l)));
      if (x.docs.length) more.push('  Tài liệu:');
      out.push(...hardBreaks([line, ...more]), ...docLines(x.docs, '  '));
    }
  });
  if (ws.log.length) {
    out.push('', `## ${LOG_HEADING}`, '');
    for (const l of ws.log) {
      const why = l.why ? l.why.split('\n') : [];
      out.push(...hardBreaks([`- ${l.date} · ${l.decision}`, ...why.map((w, k) => (k ? '  ' + escBlock(w) : `  Vì sao: ${w}`))]));
    }
  }
  return out.join('\n') + '\n';
}

const ITEM = /^(?:[-*+]|\d+[.)])\s+(?:\[(.?)\]\s*)?(.*)$/;
const STEP_PREFIX = /^(?:(?:bước|step)\s*)?\d+(?:\s*[.):]\s*|\s+)/i;
const DATE_TOKEN = '(\\d{4}-\\d{1,2}-\\d{1,2}|\\d{1,2}\\/\\d{1,2}\\/\\d{4})';
const META_DUE = new RegExp(`^(?:hạn|due):?\\s+${DATE_TOKEN}$`, 'i');
const TITLE_DUE = new RegExp(`(^|[\\s(\\[,;])(?:hạn|due):?\\s+(\\d{1,4}[-\\/]\\d{1,2}[-\\/]\\d{1,4})`, 'gi');
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
  for (const part of parts.slice(1)) {
    const t = part.trim();
    let m;
    if (/^`@[^`]+`$/.test(t) || /^@.+$/.test(t)) continue; // người làm của file cũ: bỏ
    if ((m = META_DUE.exec(restore(t))) && parseDate(m[1]) && !due) due = parseDate(m[1]);
    else {
      if (/^(?:hạn|due)\b/i.test(restore(t))) warnings.push(`Hạn không đọc được, để lại trong tên: ${restore(t)}`);
      title += ' · ' + part;
    }
  }
  let changed = false;
  title = title.replace(/`@[^`]+`/g, () => { changed = true; return ' '; });
  title = title.replace(/(^|[\s(\[,;])@[^\s,;()[\]`]+/g, (_, pre) => { changed = true; return pre; });
  title = title.replace(TITLE_DUE, (all, pre, d) => {
    const v = parseDate(d);
    if (!v) { warnings.push(`Hạn không đọc được: ${d}`); return all; }
    if (!due) due = v;
    changed = true;
    return pre;
  });
  if (changed) title = title.replace(/\(\s*(?:[,;]\s*)*\)/g, '').replace(/\s+/g, ' ').replace(/^[\s,;·:-]+|[\s,;·:-]+$/g, '');
  return { title: restore(title).trim(), due };
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
  let inLog = false;
  let started = false; // đã qua `## ` đầu tiên
  let block = /** @type {'' | 'step' | 'sub' | 'why'} */ ('');
  let blockFirst = false;
  let cancelCont = false; // đang ở các dòng thụt bốn nối tiếp `Huỷ vì:`
  const addNote = (/** @type {any} */ o, /** @type {string} */ key, /** @type {string} */ l) => {
    o[key] = o[key] === undefined || o[key] === null ? l : o[key] + '\n' + l;
  };
  const newSub = (/** @type {string} */ mark, /** @type {string} */ rest) => {
    if (!step) { step = { title: LOOSE_STEP, subs: [] }; ws.steps.push(step); }
    const p = parseSubText(rest, warnings);
    sub = { title: p.title, status: FROM_MARK[mark ?? ' '] || 'todo', due: p.due };
    if (mark != null && !(mark in FROM_MARK)) warnings.push(`Dấu [${mark}] lạ, đọc là chưa làm: ${p.title}`);
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
    const ind = /^( {2}|\t)(.*)$/.exec(raw);
    if (ind && block === 'sub' && cancelCont && /^ {2}/.test(ind[2])) {
      sub.cancelReason += '\n' + unescBlock(ind[2].slice(2));
      continue;
    }
    cancelCont = false;
    if (ind && block === 'sub' && /^Huỷ vì:/.test(ind[2])) {
      sub.cancelReason = ind[2].replace(/^Huỷ vì: ?/, '');
      cancelCont = true;
      blockFirst = false;
      continue;
    }
    if (ind && block === 'sub' && /^Tài liệu:\s*$/.test(ind[2])) {
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
        if (blockFirst && l.startsWith('Xong khi: ')) sub.doneWhen = l.slice(10);
        else addNote(sub, 'notes', unescBlock(l));
      } else if (block === 'step') addNote(step, 'notes', unescBlock(l));
      else if (block === 'why') addNote(entry, 'why', blockFirst && l.startsWith('Vì sao: ') ? l.slice(8) : unescBlock(l));
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
      if (/^(nhật ký( quyết định)?|decision log)$/i.test(h)) { inLog = true; step = null; continue; }
      inLog = false;
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
        const kv = /^Mẫu:\s*(.*)$/.exec(m[1]);
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
    const meta = /^\**(Mục tiêu|Xong khi|Quay lại|Vòng|Ghi chú|Tài liệu):\**\s?(.*)$/.exec(raw);
    if (meta && meta[1] === 'Mục tiêu') step.goal = meta[2];
    else if (meta && meta[1] === 'Xong khi') step.doneWhen = meta[2];
    else if (meta && meta[1] === 'Quay lại') {
      /* `ngày · vòng N · lý do`; dòng cũ `ngày · lý do` (không vòng) vẫn đọc: vòng 2. */
      const d = /^(\S+)(?: · vòng (\d+)(?= · |$))?(?: · (.*))?$/.exec(meta[2]);
      step.revisit = d && parseDate(d[1]) ? { date: parseDate(d[1]), round: d[2] ? +d[2] : 0, reason: d[3] || '' } : { reason: meta[2] };
    } else if (meta && meta[1] === 'Vòng') {
      const n = /^\s*(\d+)\s*$/.exec(meta[2]);
      if (n) step.round = +n[1]; else addNote(step, 'notes', raw);
    } else if (meta && meta[1] === 'Ghi chú' && !meta[2].trim()) { block = 'step'; blockFirst = true; }
    else if (meta && meta[1] === 'Tài liệu' && !meta[2].trim()) {
      step.docs = step.docs || [];
      i = readDocs(lines, i + 1, step.docs, warnings, 0) - 1;
    }
    else addNote(step, 'notes', raw);
  }
  if (!ws.name && !ws.steps.length) throw new Error('Không thấy tiêu đề "# …", bước "## …" hay việc "- [ ] …" nào.');
  return { workspace: normWorkspace(ws), warnings };
}

/* ── JSON ── */

/** @param {any} ws */
export const toJSON = (ws) => JSON.stringify({ format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), workspace: ws }, null, 2) + '\n';
/** @param {any[]} all */
export const toBackup = (all) => JSON.stringify({ format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), workspaces: all }, null, 2) + '\n';

/** Đếm mục không đúng khuôn sẽ bị bỏ khi chuẩn hoá. @param {any} w @param {string[]} warnings */
function skipped(w, warnings) {
  const bad = (/** @type {any} */ a) => (Array.isArray(a) ? a.filter((x) => !isObj(x)).length : 0);
  const steps = Array.isArray(w.steps) ? w.steps : [];
  const n = { steps: bad(steps), subs: 0, log: bad(w.log), docs: 0 };
  const badDocs = (/** @type {any} */ a) => (Array.isArray(a) ? a.filter((d) => !normDoc(d)).length : 0);
  for (const s of steps) {
    if (!isObj(s)) continue;
    n.subs += bad(s.subs);
    n.docs += badDocs(s.docs);
    for (const x of Array.isArray(s.subs) ? s.subs : []) if (isObj(x)) n.docs += badDocs(x.docs);
  }
  const parts = [];
  if (n.steps) parts.push(`${n.steps} bước`);
  if (n.subs) parts.push(`${n.subs} bước con`);
  if (n.log) parts.push(`${n.log} quyết định`);
  if (n.docs) parts.push(`${n.docs} tài liệu (link không phải http(s))`);
  if (parts.length) warnings.push(`"${oneLine(w.name) || 'Dự án'}": bỏ qua ${parts.join(', ')} không đúng khuôn.`);
}

/**
 * Đọc chữ dán vào hay file chọn: JSON (một dự án, bản sao lưu, hay mảng dự án) hoặc Markdown.
 * Luôn trả bản sao có id mới; ghi vào đâu là việc của trang.
 * @param {string} text
 * @returns {{ kind: 'json' | 'backup' | 'md', workspaces: any[], warnings: string[] }}
 */
export function parseImport(text) {
  const t = String(text || '').trim();
  if (!t) throw new Error('Chưa có nội dung.');
  if (t[0] === '{' || t[0] === '[') {
    let data;
    try { data = JSON.parse(t); } catch (e) { throw new Error('JSON hỏng: ' + /** @type {Error} */ (e).message); }
    /** @type {any[]} */ let items;
    let kind = /** @type {'json' | 'backup'} */ ('json');
    if (Array.isArray(data)) { items = data; kind = 'backup'; }
    else if (isObj(data) && Array.isArray(data.workspaces)) { items = data.workspaces; kind = 'backup'; }
    else if (isObj(data) && isObj(data.workspace)) items = [data.workspace];
    else if (isObj(data) && Array.isArray(data.steps)) items = [data];
    else throw new Error('JSON không phải dự án Step Planner (thiếu `workspace`, `workspaces` hay `steps`).');
    /** @type {string[]} */
    const warnings = [];
    const out = [];
    items.forEach((w, i) => {
      if (!isObj(w) || !Array.isArray(w.steps)) { warnings.push(`Bỏ qua mục ${i + 1}: không phải dự án (thiếu danh sách steps).`); return; }
      skipped(w, warnings);
      out.push(freshCopy(w));
    });
    if (!out.length) throw new Error('Không có dự án hợp lệ nào trong JSON. ' + warnings.slice(0, 3).join(' '));
    return { kind, workspaces: out, warnings };
  }
  const { workspace, warnings } = fromMarkdown(t);
  return { kind: 'md', workspaces: [freshCopy(workspace)], warnings };
}

/** Đếm cho phần xem trước khi nhập. @param {any[]} wss */
export function counts(wss) {
  let steps = 0, subs = 0, log = 0, docs = 0;
  for (const w of wss) {
    steps += w.steps.length;
    for (const s of w.steps) {
      subs += s.subs.length;
      docs += s.docs.length + s.subs.reduce((/** @type {number} */ n, /** @type {any} */ x) => n + x.docs.length, 0);
    }
    log += w.log.length;
  }
  return { workspaces: wss.length, steps, subs, log, docs };
}

/** Tên file an toàn từ tên dự án. */
export function slug(/** @type {string} */ s) {
  return fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'du-an';
}

const docShape = (/** @type {any} */ d) => (d.kind === 'link' ? { kind: d.kind, title: d.title, url: d.url } : { kind: d.kind, title: d.title, body: d.body });
/** Phần so được khi kiểm Markdown đi rồi về: bỏ id và mốc thời gian. @param {any} ws */
export function shape(ws) {
  return {
    name: ws.name, templateId: ws.templateId, notes: ws.notes,
    steps: ws.steps.map((/** @type {any} */ s) => ({
      title: s.title, goal: s.goal, doneWhen: s.doneWhen, notes: s.notes, revisit: s.revisit, round: s.round, docs: s.docs.map(docShape),
      subs: s.subs.map((/** @type {any} */ x) => ({ title: x.title, status: x.status, cancelReason: x.cancelReason, due: x.due, doneWhen: x.doneWhen, notes: x.notes, docs: x.docs.map(docShape) })),
    })),
    log: ws.log.map((/** @type {any} */ l) => ({ date: l.date, decision: l.decision, why: l.why })),
  };
}
