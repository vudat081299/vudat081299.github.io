// @ts-check
/* Tiện ích DOM dùng chung: $(id), h() dựng phần tử (con là chuỗi thì thành text node), icon() (một <use> của bộ biểu
   tượng), iconBtn() (nút phụ ngoài vòng Tab), withLinks() (URL trong chữ thành thẻ a), field() (ô của form), autosize() (ô
   chữ cao theo nội dung), barFill() (thanh tiến độ), fmtDate() ("24 Nov 2026", không theo locale), quote() (tên trong ngoặc
   kép, cắt ở 40 ký tự). Chữ người dùng chỉ vào DOM qua text node, không qua HTML.
   Xuất: $, h, withLinks, icon, iconBtn, MONTHS, fmtDate, field, autosize, quote, barFill.
   Dùng: core/md.js. */
import { linkParts } from '../core/md.js';

/** @param {string} id @returns {any} */
export const $ = (id) => document.getElementById(id);

/** Dựng phần tử; con là chuỗi thì thành text node. @param {string} tag @param {Record<string, any>} [attrs] @param {...any} kids */
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false && kid !== '') el.append(kid instanceof Node ? kid : String(kid));
  return el;
}

/** Chữ có link http(s) thành text + thẻ a (tách ở core/md.js `linkParts`); mọi phần vẫn qua textContent. @param {string} text */
export function withLinks(text) {
  return linkParts(text).map((p) => (p.t === 'link'
    ? h('a', { href: p.v, target: '_blank', rel: 'noopener noreferrer' }, p.v)
    : p.v));
}

/* Biểu tượng: một bộ duy nhất, là các <symbol id="i-…"> trong index.html; nét và cỡ do CSS (svg.i) đặt. */
/** @param {string} name */
export function icon(name) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'i');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(NS, 'use');
  use.setAttribute('href', '#i-' + name);
  svg.append(use);
  return svg;
}
/* Nút phụ (dời, nhân bản, xoá) không nằm trong vòng Tab: bàn phím làm cùng việc ấy trong hộp sửa và bằng Alt + mũi tên. */
/** @param {string} name @param {string} label @param {string} act @param {boolean} [disabled] */
export const iconBtn = (name, label, act, disabled = false) =>
  h('button', { type: 'button', class: 'icon-btn aux', 'data-act': act, 'aria-label': label, title: label, disabled, tabindex: '-1' }, icon(name));

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** YYYY-MM-DD → "24 Nov 2026" (không phụ thuộc locale của máy). */
export const fmtDate = (/** @type {string} */ d) => (d ? `${+d.slice(8, 10)} ${MONTHS[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}` : '');

export const field = (/** @type {any} */ form, /** @type {string} */ name) => form.elements.namedItem(name);

export function autosize(/** @type {any} */ el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 2 + 'px';
}

export const quote = (/** @type {string} */ t) => `"${t.length > 40 ? t.slice(0, 39) + '…' : t}"`;

export function barFill(/** @type {number} */ pct) {
  const i = h('i');
  i.style.width = pct + '%';
  return i;
}
