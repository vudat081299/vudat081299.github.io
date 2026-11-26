// @ts-check
/* Markdown của tài liệu văn bản → DOM. Bản dựng chép dáng đọc của md-annotate (.ma-md, kiểu GitHub) nhưng không dùng
   marked hay chuỗi HTML: mọi chữ vào DOM qua text node (createElement); link chỉ http(s), mở tab mới.
   renderMd: cây khối của core/md.js → DocumentFragment; renderSrc: khung Edit, mỗi dòng một span có số, token là span sx-*.
   Xuất: renderMd, renderSrc.
   Dùng: core/md.js. */
import { parseMd, srcTokens } from '../core/md.js';
/** @typedef {import('../core/md.js').Inline} Inline */
/** @typedef {import('../core/md.js').Block} Block */

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

export function renderSrc(text) {
  const f = document.createDocumentFragment(), toks = srcTokens(text);
  let k = 0, off = 0;
  for (const line of text.split('\n')) {
    const ln = el('span', { class: 'md-ln' }), end = off + line.length;
    let pos = off;
    while (k < toks.length && toks[k].s < end) {
      const t = toks[k];
      if (t.s > pos) ln.appendChild(document.createTextNode(text.slice(pos, t.s)));
      const sp = el('span', { class: t.c });
      sp.textContent = text.slice(t.s, Math.min(t.e, end));
      ln.appendChild(sp);
      pos = Math.min(t.e, end);
      if (t.e > end) break;
      k++;
    }
    if (pos < end) ln.appendChild(document.createTextNode(text.slice(pos, end)));
    f.appendChild(ln);
    off = end + 1;
  }
  return f;
}
