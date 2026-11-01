// @ts-check
// Dựng HTML bằng chuỗi. Mọi giá trị chèn vào qua esc(); chỉ chuỗi đã dựng sẵn mới được bọc raw().

/** @param {unknown} value */
export function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

class Raw {
  /** @param {string} value */
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

/** @param {string} value */
export const raw = (value) => new Raw(value);

/**
 * Tagged template: giá trị chèn vào được escape, trừ Raw và mảng Raw.
 * @param {TemplateStringsArray} strings @param {...unknown} values
 */
export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((v, i) => {
    out += render(v) + strings[i + 1];
  });
  return raw(out);
}

/** @param {unknown} v @returns {string} */
function render(v) {
  if (v === null || v === undefined || v === false) return '';
  if (v instanceof Raw) return v.value;
  if (Array.isArray(v)) return v.map(render).join('');
  return esc(v);
}
