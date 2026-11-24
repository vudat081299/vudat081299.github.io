// @ts-check
/* Markdown của tài liệu văn bản → cây khối (parseMd, thuần, chạy được trong Node) → DOM (renderMd).
 * Bản dựng chép dáng đọc của md-annotate (.ma-md, kiểu GitHub) nhưng không dùng marked hay chuỗi HTML: step-planner cấm
 * gán HTML thô, nên mọi chữ vào DOM qua text node; link chỉ http(s), mở tab mới.
 * Hỗ trợ: tiêu đề #, đoạn, xuống dòng cứng, danh sách (lồng, đánh số, ô việc), trích dẫn, khối code rào ``` / ~~~,
 * bảng GFM, vạch ngang; trong dòng: code, **đậm**, *nghiêng*, ~~gạch~~, [link](url), <url>, url trần. */

/** @typedef {{t:'text', v:string} | {t:'code', v:string} | {t:'br'} | {t:'strong'|'em'|'del', c:Inline[]} | {t:'link', href:string, c:Inline[]}} Inline */
/** @typedef {{t:'h', level:number, c:Inline[]} | {t:'p', c:Inline[]} | {t:'code', lang:string, v:string} | {t:'quote', c:Block[]}
 *  | {t:'list', ordered:boolean, start:number, items:{task:null|boolean, c:Block[]}[]} | {t:'table', align:string[], head:Inline[][], rows:Inline[][][]}
 *  | {t:'hr'}} Block */

const FENCE = /^( {0,3})(`{3,}|~{3,})(.*)$/;
const ATX = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const HR = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const QUOTE = /^ {0,3}> ?(.*)$/;
const ITEM = /^( {0,3})([-*+]|\d{1,9}[.)])(?:([ \t]+)(.*))?$/;
const TABLE_SEP = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;

/** Bỏ tối đa n dấu cách đầu dòng (tab tính bốn). @param {string} l @param {number} n */
function dedent(l, n) {
  let i = 0, w = 0;
  while (i < l.length && w < n && (l[i] === ' ' || l[i] === '\t')) { w += l[i] === '\t' ? 4 : 1; i++; }
  return l.slice(i);
}
const indentOf = (/** @type {string} */ l) => { let w = 0; for (const ch of l) { if (ch === ' ') w++; else if (ch === '\t') w += 4; else break; } return w; };
const blank = (/** @type {string} */ l) => /^\s*$/.test(l);

/** Dòng có mở một khối khác (để đoạn văn dừng lại). @param {string} l */
function startsBlock(l) {
  if (FENCE.test(l) || ATX.test(l) || HR.test(l) || QUOTE.test(l)) return true;
  const m = ITEM.exec(l);
  return !!m && !!m[4] && (!/^\d/.test(m[2]) || /^1[.)]$/.test(m[2]));
}

/** Tách một hàng bảng thành các ô (bỏ | đầu, cuối; `\|` là chữ). @param {string} l */
function cells(l) {
  let s = l.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const out = [];
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && s[i + 1] === '|') { cur += '|'; i++; } else if (s[i] === '|') { out.push(cur.trim()); cur = ''; } else cur += s[i];
  }
  out.push(cur.trim());
  return out;
}

/** @param {string} text @returns {Block[]} */
export function parseMd(text) {
  return blocks(String(text ?? '').replace(/\r\n?/g, '\n').split('\n'));
}

/** @param {string[]} lines @returns {Block[]} */
function blocks(lines) {
  /** @type {Block[]} */
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (blank(l)) { i++; continue; }
    let m;
    if ((m = FENCE.exec(l)) && !(m[2][0] === '`' && m[3].includes('`'))) {
      const ind = m[1].length, mark = m[2];
      const close = new RegExp(`^ {0,3}${mark[0] === '`' ? '`' : '~'}{${mark.length},}[ \\t]*$`);
      const body = [];
      i++;
      while (i < lines.length && !close.test(lines[i])) body.push(dedent(lines[i++], ind));
      i++;
      out.push({ t: 'code', lang: m[3].trim().split(/\s+/)[0] || '', v: body.join('\n') });
      continue;
    }
    if ((m = ATX.exec(l))) { out.push({ t: 'h', level: m[1].length, c: inline(m[2] || '') }); i++; continue; }
    if (HR.test(l)) { out.push({ t: 'hr' }); i++; continue; }
    if (QUOTE.test(l)) {
      const body = [];
      while (i < lines.length && !blank(lines[i])) {
        const q = QUOTE.exec(lines[i]);
        if (q) body.push(q[1]);
        else if (startsBlock(lines[i])) break;
        else body.push(lines[i]); // dòng nối lười của đoạn trong trích dẫn
        i++;
      }
      out.push({ t: 'quote', c: blocks(body) });
      continue;
    }
    if ((m = ITEM.exec(l))) {
      const ordered = /^\d/.test(m[2]);
      const kind = ordered ? m[2].slice(-1) : m[2];
      /** @type {{task:null|boolean, c:Block[]}[]} */
      const items = [];
      const start = ordered ? parseInt(m[2], 10) : 1;
      while (i < lines.length) {
        const it = ITEM.exec(lines[i]);
        if (!it || (/^\d/.test(it[2]) ? it[2].slice(-1) : it[2]) !== kind) break;
        const sp = it[3] ? indentOf(it[3]) : 1;
        const width = it[1].length + it[2].length + (sp > 4 ? 1 : sp);
        const first = sp > 4 ? ' '.repeat(sp - 1) + (it[4] || '') : (it[4] || '');
        const body = [first];
        i++;
        let lastBlank = false;
        while (i < lines.length) {
          const x = lines[i];
          if (blank(x)) { body.push(''); lastBlank = true; i++; continue; }
          if (indentOf(x) >= width) { body.push(dedent(x, width)); lastBlank = false; i++; continue; }
          if (lastBlank || startsBlock(x) || ITEM.test(x)) break;
          body.push(x); // dòng nối lười
          i++;
        }
        while (body.length && body[body.length - 1] === '') { body.pop(); }
        let task = null;
        const tm = /^\[([ xX])\](?:[ \t]+|$)/.exec(body[0]);
        if (tm) { task = tm[1] !== ' '; body[0] = body[0].slice(tm[0].length); }
        items.push({ task, c: blocks(body) });
        if (lastBlank && !(i < lines.length && ITEM.test(lines[i]))) break;
      }
      out.push({ t: 'list', ordered, start, items });
      continue;
    }
    if (l.includes('|') && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      const head = cells(l);
      const align = cells(lines[i + 1]).map((c) => (/^:-+:$/.test(c) ? 'center' : /-:$/.test(c) ? 'right' : /^:-/.test(c) ? 'left' : ''));
      if (align.length === head.length) {
        i += 2;
        const rows = [];
        while (i < lines.length && !blank(lines[i]) && lines[i].includes('|') && !startsBlock(lines[i])) {
          const r = cells(lines[i++]);
          rows.push(head.map((_, k) => inline(r[k] || '')));
        }
        out.push({ t: 'table', align, head: head.map((x) => inline(x)), rows });
        continue;
      }
    }
    const para = [l.replace(/^[ \t]+/, '')];
    i++;
    while (i < lines.length && !blank(lines[i]) && !startsBlock(lines[i])) para.push(lines[i++].replace(/^[ \t]+/, ''));
    out.push({ t: 'p', c: inline(para.join('\n')) });
  }
  return out;
}

const PUNCT = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/;
const SAFE_URL = /^https?:\/\/\S+$/i;
/** URL trần: bỏ dấu câu cuối không thuộc URL. @param {string} u */
function trimUrl(u) {
  let x = u.replace(/[.,;:!?'"*_~]+$/, '');
  while (x.endsWith(')') && (x.match(/\(/g) || []).length < (x.match(/\)/g) || []).length) x = x.slice(0, -1);
  return x;
}

/** @param {string} s @returns {Inline[]} */
export function inline(s) {
  /** @type {Inline[]} */
  const out = [];
  let buf = '';
  const flush = () => { if (buf) { out.push({ t: 'text', v: buf }); buf = ''; } };
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '\\' && s[i + 1] === '\n') { flush(); out.push({ t: 'br' }); i += 2; continue; }
    if (ch === '\\' && PUNCT.test(s[i + 1] || '')) { buf += s[i + 1]; i += 2; continue; }
    if (ch === '\n') {
      const hard = / {2,}$/.test(buf);
      buf = buf.replace(/ +$/, '');
      if (hard) { flush(); out.push({ t: 'br' }); } else buf += '\n';
      i++;
      continue;
    }
    if (ch === '`') {
      const run = /^`+/.exec(s.slice(i))[0];
      const end = s.indexOf(run, i + run.length);
      let ok = end >= 0;
      while (ok && s[end + run.length] === '`') { ok = false; }
      if (ok) {
        let v = s.slice(i + run.length, end).replace(/\n/g, ' ');
        if (/^ .*[^ ].* $/.test(v)) v = v.slice(1, -1);
        flush(); out.push({ t: 'code', v }); i = end + run.length; continue;
      }
      buf += run; i += run.length; continue;
    }
    if (ch === '<') {
      const m = /^<(https?:\/\/[^\s<>]+)>/i.exec(s.slice(i));
      if (m) { flush(); out.push({ t: 'link', href: m[1], c: [{ t: 'text', v: m[1] }] }); i += m[0].length; continue; }
    }
    if (ch === '[') {
      const r = linkAt(s, i);
      if (r) {
        flush();
        const c = inline(r.label);
        if (SAFE_URL.test(r.url)) out.push({ t: 'link', href: r.url, c }); else out.push(...c); // link không phải http(s): chỉ giữ chữ
        i = r.end; continue;
      }
    }
    if ((ch === 'h' || ch === 'H') && /^https?:\/\//i.test(s.slice(i, i + 8)) && !/[\p{L}\p{N}]/u.test(s[i - 1] || '')) {
      const u = trimUrl(/^\S+/.exec(s.slice(i))[0]);
      flush(); out.push({ t: 'link', href: u, c: [{ t: 'text', v: u }] }); i += u.length; continue;
    }
    if ((ch === '*' || ch === '_' || ch === '~') && s[i + 1] === ch) {
      const mark = ch + ch;
      const end = closing(s, i + 2, mark);
      if (ch !== '_' || !/[\p{L}\p{N}]/u.test(s[i - 1] || '')) {
        if (end > i + 2) { flush(); out.push({ t: ch === '~' ? 'del' : 'strong', c: inline(s.slice(i + 2, end)) }); i = end + 2; continue; }
      }
      buf += mark; i += 2; continue;
    }
    if (ch === '*' || ch === '_') {
      const end = closing(s, i + 1, ch);
      const intra = ch === '_' && /[\p{L}\p{N}]/u.test(s[i - 1] || '');
      if (!intra && end > i + 1) { flush(); out.push({ t: 'em', c: inline(s.slice(i + 1, end)) }); i = end + 1; continue; }
    }
    buf += ch; i++;
  }
  flush();
  return out;
}

/** Chỗ đóng của dấu nhấn: sau mở không là khoảng trắng, trước đóng không là khoảng trắng; bỏ qua chữ thoát và code.
 * @param {string} s @param {number} from @param {string} mark */
function closing(s, from, mark) {
  if (/\s/.test(s[from] || ' ')) return -1;
  for (let k = from + 1; k < s.length; k++) {
    if (s[k] === '\\') { k++; continue; }
    if (s[k] === '`') { const run = /^`+/.exec(s.slice(k))[0]; const e = s.indexOf(run, k + run.length); if (e > 0) { k = e + run.length - 1; continue; } }
    if (s.startsWith(mark, k) && !/\s/.test(s[k - 1]) && (mark.length === 2 || s[k + 1] !== mark)) {
      if (mark[0] === '_' && /[\p{L}\p{N}]/u.test(s[k + mark.length] || '')) continue; // `_` / `__` dính chữ sau: không đóng
      return k;
    }
  }
  return -1;
}

/** `[chữ](url)` bắt đầu ở i: trả label, url, vị trí sau `)`. @param {string} s @param {number} i */
function linkAt(s, i) {
  let depth = 0, k = i;
  for (; k < s.length; k++) {
    if (s[k] === '\\') { k++; continue; }
    if (s[k] === '[') depth++;
    else if (s[k] === ']' && --depth === 0) break;
  }
  if (k >= s.length || s[k + 1] !== '(') return null;
  const rest = s.slice(k + 2);
  const m = /^[ \t]*(?:<([^<>\n]*)>|((?:\\.|[^\s()\\]|\((?:\\.|[^\s()\\])*\))*))(?:[ \t]+("[^"]*"|'[^']*'))?[ \t]*\)/.exec(rest);
  if (!m) return null;
  const url = (m[1] ?? m[2] ?? '').replace(/\\([!-/:-@[-`{-~])/g, '$1');
  return { label: s.slice(i + 1, k), url, end: k + 2 + m[0].length };
}

/* ── DOM ── */

/** @param {string} tag @param {Record<string, string>} [attrs] */
function el(tag, attrs = {}) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}
/** @param {Node} parent @param {Inline[]} list */
function putInline(parent, list) {
  for (const n of list) {
    if (n.t === 'text') parent.appendChild(document.createTextNode(n.v));
    else if (n.t === 'br') parent.appendChild(el('br'));
    else if (n.t === 'code') { const c = el('code'); c.textContent = n.v; parent.appendChild(c); }
    else if (n.t === 'link') {
      const a = el('a', { href: n.href, target: '_blank', rel: 'noopener noreferrer' });
      putInline(a, n.c);
      parent.appendChild(a);
    } else { const e = el(n.t === 'del' ? 'del' : n.t === 'strong' ? 'strong' : 'em'); putInline(e, n.c); parent.appendChild(e); }
  }
}
/** @param {Node} parent @param {Block[]} list @param {boolean} [tight] */
function putBlocks(parent, list, tight = false) {
  for (const b of list) {
    if (b.t === 'h') { const e = el('h' + b.level); putInline(e, b.c); parent.appendChild(e); }
    else if (b.t === 'p') {
      if (tight) putInline(parent, b.c);
      else { const e = el('p'); putInline(e, b.c); parent.appendChild(e); }
    } else if (b.t === 'code') {
      const pre = el('pre'), code = el('code');
      if (b.lang) code.setAttribute('data-lang', b.lang);
      code.textContent = b.v;
      pre.appendChild(code); parent.appendChild(pre);
    } else if (b.t === 'quote') { const q = el('blockquote'); putBlocks(q, b.c); parent.appendChild(q); }
    else if (b.t === 'hr') parent.appendChild(el('hr'));
    else if (b.t === 'list') {
      const ul = el(b.ordered ? 'ol' : 'ul');
      if (b.ordered && b.start !== 1) ul.setAttribute('start', String(b.start));
      for (const it of b.items) {
        const li = el('li');
        if (it.task !== null) {
          const cb = /** @type {HTMLInputElement} */ (el('input', { type: 'checkbox', disabled: '' }));
          cb.checked = it.task;
          li.appendChild(cb);
          li.appendChild(document.createTextNode(' '));
        }
        /* Mục chỉ một đoạn: chữ nằm thẳng trong li (danh sách gọn như GitHub). */
        putBlocks(li, it.c, it.c.length === 1 || (it.c.length === 2 && it.c[1].t === 'list'));
        ul.appendChild(li);
      }
      parent.appendChild(ul);
    } else if (b.t === 'table') {
      const table = el('table'), thead = el('thead'), tbody = el('tbody'), tr = el('tr');
      b.head.forEach((c, k) => { const th = el('th'); if (b.align[k]) th.style.textAlign = b.align[k]; putInline(th, c); tr.appendChild(th); });
      thead.appendChild(tr);
      for (const r of b.rows) {
        const row = el('tr');
        r.forEach((c, k) => { const td = el('td'); if (b.align[k]) td.style.textAlign = b.align[k]; putInline(td, c); row.appendChild(td); });
        tbody.appendChild(row);
      }
      table.append(thead, tbody);
      parent.appendChild(table);
    }
  }
}

/** Markdown → DocumentFragment (chỉ text node và thẻ dựng bằng createElement). @param {string} text */
export function renderMd(text) {
  const f = document.createDocumentFragment();
  putBlocks(f, parseMd(text));
  return f;
}
