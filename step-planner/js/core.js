// @ts-check
/* Logic thuần của Step Planner: chuẩn hoá dữ liệu, tiến độ, Markdown và JSON vào / ra.
 * Không đụng DOM hay bộ nhớ trình duyệt; chạy được trong Node (tools/test-core.mjs). */

export const STATUSES = ['todo', 'doing', 'done', 'blocked', 'skip'];
export const STATUS_LABEL = { todo: 'Chưa làm', doing: 'Đang làm', done: 'Xong', blocked: 'Bị chặn', skip: 'Bỏ qua' };
const MARK = { todo: ' ', doing: '~', done: 'x', blocked: '!', skip: '-' };
const FROM_MARK = { ' ': 'todo', '~': 'doing', x: 'done', X: 'done', '!': 'blocked', '-': 'skip' };
/* Bấm chip: chưa làm → đang làm → xong → chưa làm. Bị chặn → đang làm, bỏ qua → chưa làm. */
const NEXT = { todo: 'doing', doing: 'done', done: 'todo', blocked: 'doing', skip: 'todo' };
export const nextStatus = (/** @type {string} */ s) => NEXT[s] || 'todo';

export const FORMAT = 'step-planner';
export const VERSION = 1;
export const LOG_HEADING = 'Nhật ký quyết định';

let seq = 0;
export function uid(prefix = 'x') {
  return prefix + Date.now().toString(36) + (seq++).toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Ngày hôm nay theo giờ máy, dạng YYYY-MM-DD. */
export function today(d = new Date()) {
  const p = (/** @type {number} */ n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ── Chuẩn hoá ── */

export const oneLine = (/** @type {any} */ s) => String(s ?? '').replace(/\s+/g, ' ').trim();
export const multiLine = (/** @type {any} */ s) => String(s ?? '').replace(/\r\n?/g, '\n').split('\n')
  .map((l) => l.replace(/\s+$/, '')).join('\n').replace(/^\n+|\n+$/g, '');
const isDate = (/** @type {any} */ s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
const dateOr = (/** @type {any} */ s, fallback = '') => (isDate(s) ? s : fallback);
const isoOr = (/** @type {any} */ s) => (typeof s === 'string' && !isNaN(Date.parse(s)) ? s : new Date().toISOString());
const list = (/** @type {any} */ a) => (Array.isArray(a) ? a : []);

/** @param {any} o */
export function normSub(o = {}) {
  return {
    id: typeof o.id === 'string' && o.id ? o.id : uid('s'),
    title: oneLine(o.title) || 'Bước con',
    status: STATUSES.includes(o.status) ? o.status : 'todo',
    owner: oneLine(o.owner),
    due: dateOr(o.due),
    doneWhen: oneLine(o.doneWhen),
    notes: multiLine(o.notes),
  };
}

/** @param {any} o */
export function normStep(o = {}) {
  const r = o.revisit;
  return {
    id: typeof o.id === 'string' && o.id ? o.id : uid('t'),
    title: oneLine(o.title) || 'Bước',
    goal: oneLine(o.goal),
    doneWhen: oneLine(o.doneWhen),
    notes: multiLine(o.notes),
    revisit: r && typeof r === 'object' ? { reason: oneLine(r.reason), date: dateOr(r.date, today()) } : null,
    subs: list(o.subs).map(normSub),
  };
}

/** @param {any} o */
export function normLog(o = {}) {
  return {
    id: typeof o.id === 'string' && o.id ? o.id : uid('l'),
    date: dateOr(o.date, today()),
    decision: oneLine(o.decision) || '(không ghi)',
    why: multiLine(o.why),
  };
}

/** @param {any} o */
export function normWorkspace(o = {}) {
  const people = [];
  for (const p of list(o.people)) {
    const n = oneLine(p);
    if (n && !people.includes(n)) people.push(n);
  }
  return {
    id: typeof o.id === 'string' && o.id ? o.id : uid('w'),
    name: oneLine(o.name) || 'Dự án',
    templateId: oneLine(o.templateId),
    createdAt: isoOr(o.createdAt),
    updatedAt: isoOr(o.updatedAt),
    people,
    steps: list(o.steps).map(normStep),
    log: list(o.log).map(normLog),
  };
}

/** Bản sao sâu với id mới cho mọi thứ — dùng khi nhân bản và khi nhập. @param {any} ws */
export function freshCopy(ws) {
  const c = normWorkspace(JSON.parse(JSON.stringify(ws)));
  const now = new Date().toISOString();
  c.id = uid('w');
  c.createdAt = now;
  c.updatedAt = now;
  for (const s of c.steps) {
    s.id = uid('t');
    for (const x of s.subs) x.id = uid('s');
  }
  for (const l of c.log) l.id = uid('l');
  return c;
}

/** Dự án mới từ một mẫu của data/templates.json. @param {any} tpl @param {string} [name] */
export function fromTemplate(tpl, name) {
  const t = tpl || {};
  const now = new Date().toISOString();
  return normWorkspace({
    name: oneLine(name) || t.name || 'Dự án',
    templateId: t.id || '',
    createdAt: now,
    updatedAt: now,
    people: t.people || [],
    steps: list(t.steps).map((/** @type {any} */ s) => ({
      title: s.title, goal: s.goal, doneWhen: s.doneWhen, notes: s.notes,
      subs: list(s.subs).map((/** @type {any} */ x) => ({ title: x.title, doneWhen: x.doneWhen, owner: x.owner, notes: x.notes })),
    })),
  });
}

/* ── Tiến độ ── */

/** Xong / (tổng − bỏ qua). @param {{status:string}[]} subs */
export function progress(subs) {
  const total = subs.filter((s) => s.status !== 'skip').length;
  const done = subs.filter((s) => s.status === 'done').length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

/** @param {{steps:{subs:{status:string}[]}[]}} ws */
export const overall = (ws) => progress(ws.steps.flatMap((s) => s.subs));

/** Việc tiếp theo của một bước: bước con đầu tiên chưa xong và không bị bỏ qua. @param {{subs:{id:string,status:string}[]}} step */
export function nextActionId(step) {
  const s = step.subs.find((x) => x.status !== 'done' && x.status !== 'skip');
  return s ? s.id : null;
}

/** So khớp không phân biệt hoa thường và dấu. */
export const fold = (/** @type {string} */ s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[đĐ]/g, 'd').toLowerCase();

/* ── Markdown ──
 * Khuôn (ghi đủ ở step-planner/CLAUDE.md, mục Markdown):
 *   # Tên dự án
 *   > Step Planner · định dạng 1
 *   > Mẫu: crisp-dm
 *   > Người: @A · @B
 *   ## 1. Tên bước
 *   Mục tiêu: …   Xong khi: …   Quay lại: 2026-11-24 · lý do   Ghi chú: (rồi các dòng thụt 2 dấu cách)
 *   - [~] Tên bước con · @người · hạn 2026-12-01
 *     Xong khi: …
 *     ghi chú (mỗi dòng thụt 2 dấu cách)
 *   ## Nhật ký quyết định
 *   - 2026-11-24 · quyết định
 *     Vì sao: …
 */

/** Giá trị nằm giữa các dấu ` · `: thoát `\` và `·`. */
const escInline = (/** @type {string} */ s) => s.replace(/\\/g, '\\\\').replace(/·/g, '\\·');

/** Tách theo ` · ` chưa thoát, đồng thời bỏ thoát. @param {string} line */
export function splitInline(line) {
  const parts = [];
  let cur = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '\\' && i + 1 < line.length) { cur += line[++i]; continue; }
    if (line.startsWith(' · ', i)) { parts.push(cur); cur = ''; i += 2; continue; }
    cur += c;
  }
  parts.push(cur);
  return parts;
}

/* Dòng thụt của ghi chú: dòng trống viết `\`; dòng bắt đầu bằng `\`, `Xong khi:` hay `Vì sao:` thêm `\` phía trước. */
const escBlock = (/** @type {string} */ s) => (s === '' ? '\\' : /^(\\|Xong khi:|Vì sao:)/.test(s) ? '\\' + s : s);
const unescBlock = (/** @type {string} */ s) => (s.startsWith('\\') ? s.slice(1) : s);
const indentLines = (/** @type {string} */ text) => text.split('\n').map((l) => '  ' + escBlock(l));

/** @param {any} ws @returns {string} */
export function toMarkdown(ws) {
  const out = [`# ${ws.name}`, '', `> Step Planner · định dạng ${VERSION}`];
  if (ws.templateId) out.push(`> Mẫu: ${ws.templateId}`);
  if (ws.people.length) out.push('> Người: ' + ws.people.map((/** @type {string} */ p) => '@' + escInline(p)).join(' · '));
  ws.steps.forEach((/** @type {any} */ s, /** @type {number} */ i) => {
    out.push('', `## ${i + 1}. ${s.title}`);
    if (s.goal) out.push(`Mục tiêu: ${s.goal}`);
    if (s.doneWhen) out.push(`Xong khi: ${s.doneWhen}`);
    if (s.revisit) out.push(`Quay lại: ${s.revisit.date} · ${s.revisit.reason}`.replace(/ · $/, ''));
    if (s.notes) out.push('Ghi chú:', ...indentLines(s.notes));
    if (s.subs.length) out.push('');
    for (const x of s.subs) {
      let line = `- [${MARK[x.status]}] ${escInline(x.title)}`;
      if (x.owner) line += ` · @${escInline(x.owner)}`;
      if (x.due) line += ` · hạn ${x.due}`;
      out.push(line);
      if (x.doneWhen) out.push(`  Xong khi: ${x.doneWhen}`);
      if (x.notes) out.push(...indentLines(x.notes));
    }
  });
  if (ws.log.length) {
    out.push('', `## ${LOG_HEADING}`, '');
    for (const l of ws.log) {
      out.push(`- ${l.date} · ${l.decision}`);
      if (l.why) {
        const [first, ...rest] = l.why.split('\n');
        out.push(`  Vì sao: ${first}`, ...rest.map((/** @type {string} */ r) => '  ' + escBlock(r)));
      }
    }
  }
  return out.join('\n') + '\n';
}

/**
 * Đọc Markdown theo khuôn ở trên. Dòng lạ không bị bỏ: nằm trong bước thì thành ghi chú của bước.
 * @param {string} text
 * @returns {{ workspace: any, warnings: string[] }}
 */
export function fromMarkdown(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  const warnings = [];
  /** @type {any} */
  const ws = { name: '', templateId: '', people: [], steps: [], log: [] };
  /** @type {any} */ let step = null;
  /** @type {any} */ let sub = null;
  /** @type {any} */ let entry = null;
  let inLog = false;
  let block = /** @type {'' | 'step' | 'sub' | 'why'} */ ('');
  let blockFirst = false;
  const addNote = (/** @type {any} */ o, /** @type {string} */ key, /** @type {string} */ l) => {
    o[key] = o[key] === undefined || o[key] === null ? l : o[key] + '\n' + l;
  };

  for (const raw of lines) {
    const ind = /^( {2}|\t)(.*)$/.exec(raw);
    if (ind && block) {
      const l = ind[2];
      if (block === 'sub') {
        if (blockFirst && sub.notes === undefined && sub.doneWhen === undefined && l.startsWith('Xong khi: ')) {
          sub.doneWhen = l.slice(10);
        } else addNote(sub, 'notes', unescBlock(l));
      } else if (block === 'step') addNote(step, 'notes', unescBlock(l));
      else if (block === 'why') addNote(entry, 'why', blockFirst && l.startsWith('Vì sao: ') ? l.slice(8) : unescBlock(l));
      blockFirst = false;
      continue;
    }
    if (block === 'sub' && raw.trim() === '') continue; // dòng trống giữa các bước con
    block = '';
    if (raw.trim() === '') continue;
    let m;
    if ((m = /^# (.+)$/.exec(raw)) && !ws.name && !step && !inLog) { ws.name = m[1]; continue; }
    if ((m = /^>\s?(.*)$/.exec(raw)) && !step && !inLog) {
      const kv = /^(Mẫu|Người):\s*(.*)$/.exec(m[1]);
      if (kv && kv[1] === 'Mẫu') ws.templateId = kv[2];
      if (kv && kv[1] === 'Người') ws.people = splitInline(kv[2]).map((p) => p.replace(/^@/, ''));
      continue;
    }
    if ((m = /^## (.+)$/.exec(raw))) {
      sub = null;
      const num = /^\d+\.\s+(.*)$/.exec(m[1]);
      if (num) { inLog = false; step = { title: num[1], subs: [] }; ws.steps.push(step); continue; }
      if (m[1].trim() === LOG_HEADING) { inLog = true; step = null; continue; }
      inLog = false; step = { title: m[1], subs: [] }; ws.steps.push(step);
      warnings.push(`"${m[1]}" không có số thứ tự; vẫn đọc là một bước.`);
      continue;
    }
    if (inLog) {
      if ((m = /^[-*] (\d{4}-\d{2}-\d{2}) · (.*)$/.exec(raw))) entry = { date: m[1], decision: m[2] };
      else if ((m = /^[-*] (.*)$/.exec(raw))) entry = { decision: m[1] };
      else { warnings.push(`Bỏ qua dòng trong nhật ký: ${raw}`); continue; }
      ws.log.push(entry);
      block = 'why'; blockFirst = true;
      continue;
    }
    if (!step) { warnings.push(`Bỏ qua dòng trước bước đầu: ${raw}`); continue; }
    if ((m = /^[-*] \[(.)\]\s?(.*)$/.exec(raw))) {
      const [title, ...meta] = splitInline(m[2]);
      sub = { title, status: FROM_MARK[m[1]] || 'todo', owner: '', due: '' };
      for (const p of meta) {
        const due = /^hạn (\d{4}-\d{2}-\d{2})$/.exec(p);
        if (p.startsWith('@') && !sub.owner) sub.owner = p.slice(1);
        else if (due && !sub.due) sub.due = due[1];
        else sub.title += ' · ' + p;
      }
      if (!FROM_MARK[m[1]]) warnings.push(`Dấu [${m[1]}] lạ, đọc là chưa làm: ${title}`);
      step.subs.push(sub);
      block = 'sub'; blockFirst = true;
      continue;
    }
    sub = null;
    if ((m = /^Mục tiêu: (.*)$/.exec(raw))) step.goal = m[1];
    else if ((m = /^Xong khi: (.*)$/.exec(raw))) step.doneWhen = m[1];
    else if ((m = /^Quay lại: (.*)$/.exec(raw))) {
      const d = /^(\d{4}-\d{2}-\d{2})(?: · (.*))?$/.exec(m[1]);
      step.revisit = d ? { date: d[1], reason: d[2] || '' } : { reason: m[1] };
    } else if (/^Ghi chú:\s*$/.test(raw)) { block = 'step'; blockFirst = true; }
    else addNote(step, 'notes', raw);
  }
  if (!ws.name && !ws.steps.length) throw new Error('Không thấy tiêu đề "# …" hay bước "## 1. …" nào.');
  return { workspace: normWorkspace(ws), warnings };
}

/* ── JSON ── */

/** @param {any} ws */
export const toJSON = (ws) => JSON.stringify({ format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), workspace: ws }, null, 2) + '\n';
/** @param {any[]} all */
export const toBackup = (all) => JSON.stringify({ format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), workspaces: all }, null, 2) + '\n';

/**
 * Đọc chữ dán vào hay file chọn: JSON (một dự án, bản sao lưu, hay mảng dự án) hoặc Markdown.
 * Luôn trả bản sao có id mới — nhập không bao giờ ghi đè dự án đang có.
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
    else if (data && Array.isArray(data.workspaces)) { items = data.workspaces; kind = 'backup'; }
    else if (data && data.workspace && typeof data.workspace === 'object') items = [data.workspace];
    else if (data && Array.isArray(data.steps)) items = [data];
    else throw new Error('JSON không phải dự án Step Planner (thiếu `workspace`, `workspaces` hay `steps`).');
    items = items.filter((w) => w && typeof w === 'object');
    if (!items.length) throw new Error('Không có dự án nào trong JSON.');
    return { kind, workspaces: items.map(freshCopy), warnings: [] };
  }
  const { workspace, warnings } = fromMarkdown(t);
  return { kind: 'md', workspaces: [freshCopy(workspace)], warnings };
}

/** Đếm cho phần xem trước khi nhập. @param {any[]} wss */
export function counts(wss) {
  let steps = 0, subs = 0, log = 0;
  for (const w of wss) {
    steps += w.steps.length;
    subs += w.steps.reduce((/** @type {number} */ n, /** @type {any} */ s) => n + s.subs.length, 0);
    log += w.log.length;
  }
  return { workspaces: wss.length, steps, subs, log };
}

/** Tên file an toàn từ tên dự án. */
export function slug(/** @type {string} */ s) {
  return fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'du-an';
}

/** Phần so được khi kiểm Markdown đi rồi về: bỏ id và mốc thời gian. @param {any} ws */
export function shape(ws) {
  return {
    name: ws.name, templateId: ws.templateId, people: ws.people,
    steps: ws.steps.map((/** @type {any} */ s) => ({
      title: s.title, goal: s.goal, doneWhen: s.doneWhen, notes: s.notes, revisit: s.revisit,
      subs: s.subs.map((/** @type {any} */ x) => ({ title: x.title, status: x.status, owner: x.owner, due: x.due, doneWhen: x.doneWhen, notes: x.notes })),
    })),
    log: ws.log.map((/** @type {any} */ l) => ({ date: l.date, decision: l.decision, why: l.why })),
  };
}
