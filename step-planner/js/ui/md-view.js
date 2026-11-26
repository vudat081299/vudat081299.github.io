// @ts-check
/* Markdown của tài liệu văn bản → DOM. Bản dựng chép dáng đọc của md-annotate (.ma-md, kiểu GitHub) nhưng không dùng
   marked hay chuỗi HTML: mọi chữ vào DOM qua text node (createElement); link chỉ http(s), mở tab mới.
   renderMd: cây khối của core/md.js → DocumentFragment; renderSrc: khung Edit, mỗi dòng một span có số, token là span sx-*.
   Xuất: renderMd, renderSrc.
   Dùng: core/md.js, ui/dom.js. */
import { parseMd, srcTokens } from '../core/md.js';
import { h } from './dom.js';
/** @typedef {import('../core/md.js').Inline} Inline */
/** @typedef {import('../core/md.js').Block} Block */

/* ── DOM ── */

/** @param {Node} parent @param {Inline[]} list */
function putInline(parent, list) {
  for (const n of list) {
    if (n.t === 'text') parent.appendChild(document.createTextNode(n.v));
    else if (n.t === 'br') parent.appendChild(h('br'));
    else if (n.t === 'code') { const c = h('code'); c.textContent = n.v; parent.appendChild(c); }
    else if (n.t === 'link') {
      const a = h('a', { href: n.href, target: '_blank', rel: 'noopener noreferrer' });
      putInline(a, n.c);
      parent.appendChild(a);
    } else { const e = h(n.t === 'del' ? 'del' : n.t === 'strong' ? 'strong' : 'em'); putInline(e, n.c); parent.appendChild(e); }
  }
}
/** @param {Node} parent @param {Block[]} list @param {boolean} [tight] */
function putBlocks(parent, list, tight = false) {
  for (const b of list) {
    if (b.t === 'h') { const e = h('h' + b.level); putInline(e, b.c); parent.appendChild(e); }
    else if (b.t === 'p') {
      if (tight) putInline(parent, b.c);
      else { const e = h('p'); putInline(e, b.c); parent.appendChild(e); }
    } else if (b.t === 'code') {
      const pre = h('pre'), code = h('code');
      if (b.lang) code.setAttribute('data-lang', b.lang);
      code.textContent = b.v;
      pre.appendChild(code); parent.appendChild(pre);
    } else if (b.t === 'quote') { const q = h('blockquote'); putBlocks(q, b.c); parent.appendChild(q); }
    else if (b.t === 'hr') parent.appendChild(h('hr'));
    else if (b.t === 'list') {
      const ul = h(b.ordered ? 'ol' : 'ul');
      if (b.ordered && b.start !== 1) ul.setAttribute('start', String(b.start));
      for (const it of b.items) {
        const li = h('li');
        if (it.task !== null) {
          const cb = /** @type {HTMLInputElement} */ (h('input', { type: 'checkbox', disabled: '' }));
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
      const table = h('table'), thead = h('thead'), tbody = h('tbody'), tr = h('tr');
      b.head.forEach((c, k) => { const th = h('th'); if (b.align[k]) th.style.textAlign = b.align[k]; putInline(th, c); tr.appendChild(th); });
      thead.appendChild(tr);
      for (const r of b.rows) {
        const row = h('tr');
        r.forEach((c, k) => { const td = h('td'); if (b.align[k]) td.style.textAlign = b.align[k]; putInline(td, c); row.appendChild(td); });
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
    const ln = h('span', { class: 'md-ln' }), end = off + line.length;
    let pos = off;
    while (k < toks.length && toks[k].s < end) {
      const t = toks[k];
      if (t.s > pos) ln.appendChild(document.createTextNode(text.slice(pos, t.s)));
      const sp = h('span', { class: t.c });
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
