// @ts-check
/* System design, thuần: mục "## System design" của Markdown dự án (designMd xuất, designReader nhập).
   Xuất: DESIGN_HEADING, DESIGN_HEAD_RE, profileLine, readProfile, stageLine, readStageLine, designMd, designReader.
   Dùng: core/design.js. */
import { OWN_MAX, VIA, pathOf, pickNames, warnings } from './design.js';

/* ── Markdown: mục "## System design" (core/markdown.js gọi designMd, designReader). `Path: tên [path: id]` (dòng thụt dưới nó: luồng
 * và mốc nghiệm thu của lối, chép từ danh mục cho người và AI đọc, nhập bỏ qua). Mỗi khâu một dòng: chữ đọc được, cuối dòng
 * là `[khâu: id, id]` (hay `[khâu: skip]`; lựa chọn ẩn của khâu "không cần" không ghi) — trang chỉ đọc phần trong ngoặc.
 * Dòng thụt: `Own: …` rồi ghi chú. `Handoffs:` rồi mỗi đường nối một mục `- A → B [handoff: a > b]`, dòng thụt `Via:`, `What:`,
 * `Where:`, `Promise:` (dòng tiếp thụt bốn), `Check:`. `Warnings:` (luật phối hợp đang báo, cho người và AI đọc) nhập bỏ qua. ── */

export const DESIGN_HEADING = 'System design';
export const DESIGN_HEAD_RE = /^(?:system design|thiết kế hệ thống)$/i;
const TAIL = /\[([a-z0-9][a-z0-9-]{0,39}):\s*([a-z0-9-]*(?:\s*,\s*[a-z0-9-]+)*)\s*\]\s*$/;

/** @param {Record<string,string>} profile */
export const profileLine = (profile) => 'Profile: ' + Object.entries(profile).map(([k, v]) => `${k} ${v}`).join(' · ');

/** Đọc `Profile: size small · fresh once`. @param {string} rest */
export function readProfile(rest) {
  /** @type {Record<string,string>} */
  const p = {};
  for (const part of rest.split('·')) {
    const m = /^\s*([a-z0-9][a-z0-9-]*)\s*[:=]?\s+([a-z0-9][a-z0-9-]*)\s*$/i.exec(part);
    if (m) p[m[1].toLowerCase()] = m[2].toLowerCase();
  }
  return p;
}

/**
 * Dòng khâu. `labels` (tuỳ chọn, từ danh mục) cho chữ đọc được trước ngoặc.
 * @param {string} id @param {any} st @param {{stage?: string, names?: string[]}} [labels]
 */
export function stageLine(id, st, labels = {}) {
  const tag = `[${id}: ${st.skip ? 'skip' : st.pick.join(', ')}]`;
  const human = st.skip ? 'not needed' : (labels.names || []).filter(Boolean).join(' + ');
  const head = labels.stage ? `${labels.stage}: ${human || '—'}` : human;
  return `- ${head ? head + ' ' : ''}${tag}`;
}

/** Dòng gạch đầu dòng của mục System design → {id, pick, skip} hay null. `skip` cùng id khác (viết tay `[raw: skip, minio]`):
 * khâu Not needed, id khác là lựa chọn ẩn; `skip`, `own` không bao giờ là id phương án. @param {string} text */
export function readStageLine(text) {
  const m = TAIL.exec(text);
  if (!m) return null;
  const vals = m[2].split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  return { id: m[1].toLowerCase(), pick: vals.filter((x) => x !== 'skip' && x !== 'own'), skip: vals.includes('skip') };
}

export function designMd(d, cat, esc, hard) {
  const out = [];
  if (d.path) {
    const p = cat ? pathOf(cat, d) : null;
    out.push('', ...hard([`Path: ${p ? p.label + ' ' : ''}[path: ${d.path}]`,
      ...(p ? [...p.flow.map((/** @type {string} */ f, /** @type {number} */ i) => `  Flow ${i + 1}: ${f}`), ...p.accept.map((/** @type {string} */ a) => `  Accept: ${a}`)] : [])]));
  }
  if (Object.keys(d.profile).length) out.push('', profileLine(d.profile));
  const ids = Object.keys(d.stages);
  if (ids.length) out.push('');
  for (const id of ids) {
    const st = d.stages[id];
    const more = [];
    if (st.own && !st.skip) more.push(`  Own: ${st.own}`);
    /* Ghi chú mở bằng `Own:` thì thoát, kẻo đọc lại thành chữ tự ghi. */
    if (st.note) more.push(...st.note.split('\n').map((/** @type {string} */ l) => '  ' + (/^own:/i.test(l) ? '\\' + l : esc(l))));
    const s = cat && cat.stages.find((/** @type {any} */ x) => x.id === id);
    out.push(...hard([stageLine(id, st, s ? { stage: s.title, names: pickNames(s, st) } : {}), ...more]));
  }
  const keys = Object.keys(d.edges || {});
  if (keys.length) {
    const order = (/** @type {string} */ k) => (cat ? cat.stages.findIndex((/** @type {any} */ x) => x.id === k.split('>')[0]) : 0);
    out.push('', 'Handoffs:');
    for (const k of keys.sort((a, b) => order(a) - order(b))) {
      const e = d.edges[k];
      const [a, b] = k.split('>');
      const t = (/** @type {string} */ id) => (cat && cat.stages.find((/** @type {any} */ x) => x.id === id)?.title) || id;
      const pr = e.promise ? e.promise.split('\n') : [];
      out.push(...hard([`- ${cat ? `${t(a)} → ${t(b)} ` : ''}[handoff: ${a} > ${b}]`, ...(e.via ? [`  Via: ${e.via}`] : []),
        ...(e.what ? [`  What: ${e.what}`] : []), ...(e.where ? [`  Where: ${e.where}`] : []),
        ...pr.map((/** @type {string} */ l, /** @type {number} */ i) => (i ? '    ' + esc(l) : `  Promise: ${esc(l)}`)), ...(e.check ? [`  Check: ${e.check}`] : [])]));
    }
  }
  const warns = cat ? warnings(cat, d) : [];
  if (warns.length) out.push('', 'Warnings:', ...hard(warns.map((w) => `- ${w.title}: ${w.msg}`)));
  return out;
}

/**
 * Bộ đọc mục System design của Markdown: core/markdown.js đưa từng dòng (trừ tiêu đề `## `) vào `line`; kết quả ở `design`.
 * @param {string[]} warnings @param {(s: string) => string} unesc
 */
export function designReader(warnings, unesc) {
  /** @type {any} */
  const design = { path: '', profile: {}, stages: {}, edges: {} };
  let block = /** @type {'' | 'path' | 'stage' | 'edge' | 'warn'} */ ('');
  let list = /** @type {'' | 'handoffs' | 'warnings'} */ ('');
  let first = false;
  let inPromise = false;
  /** @type {any} */ let dst = null;
  /** @type {any} */ let edge = null;
  const unread = (/** @type {string} */ raw) => warnings.push(`Line in System design not read: ${raw.trim()}`);
  /** @param {string} raw */
  const line = (raw) => {
    const ind = /^( {2}|\t)(.*)$/.exec(raw);
    if (ind && block) {
      const l = ind[2];
      if (block === 'edge') {
        const m = /^(via|what|where|promise|check):\s?(.*)$/i.exec(l);
        if (inPromise && /^ {2}/.test(l)) edge.promise += '\n' + unesc(l.slice(2));
        else if (m) {
          const k = m[1].toLowerCase();
          inPromise = k === 'promise';
          if (k === 'via') edge.via = (VIA.find((x) => x.id === m[2].trim().toLowerCase() || x.label.toLowerCase() === m[2].trim().toLowerCase()) || { id: '' }).id;
          else edge[k] = k === 'promise' ? unesc(m[2]) : m[2];
        } else unread(raw);
        return;
      }
      if (block === 'stage') {
        const own = /^Own:\s?(.*)$/i.exec(l);
        if (first && own) dst.own = own[1].slice(0, OWN_MAX);
        else dst.note = dst.note == null ? unesc(l) : dst.note + '\n' + unesc(l);
      } // block 'path': luồng, mốc nghiệm thu chép từ danh mục — bỏ qua
      first = false;
      return;
    }
    block = '';
    inPromise = false;
    if (!raw.trim()) return;
    if (/^Handoffs:\s*$/i.test(raw)) { list = 'handoffs'; return; }
    if (/^Warnings:\s*$/i.test(raw)) { list = 'warnings'; return; }
    if (list === 'warnings' && /^[-*+]\s/.test(raw)) { block = 'warn'; return; } // chép từ danh mục: bỏ qua
    const hm = /^[-*+]\s+.*\[handoff:\s*([a-z0-9-]+)\s*>\s*([a-z0-9-]+)\s*\]\s*$/i.exec(raw);
    if (hm) {
      edge = design.edges[`${hm[1].toLowerCase()}>${hm[2].toLowerCase()}`] = { via: '', what: '', where: '', promise: '', check: '' };
      block = 'edge';
      return;
    }
    list = '';
    const pm = /^Profile:\s*(.*)$/i.exec(raw);
    const pa = /^Path:\s*(.*)$/i.exec(raw);
    const item = /^(?:[-*+]|\d+[.)])\s+(.*)$/.exec(raw);
    const sl = item ? readStageLine(item[1]) : null;
    if (pa) {
      const m = /\[path:\s*([a-z0-9-]+)\s*\]\s*$/i.exec(pa[1]) || /^([a-z0-9-]+)$/i.exec(pa[1].trim());
      if (m) design.path = m[1].toLowerCase(); else unread(raw);
      block = 'path';
    } else if (pm) Object.assign(design.profile, readProfile(pm[1]));
    else if (sl) {
      dst = design.stages[sl.id] = { pick: sl.pick, skip: sl.skip, own: '', note: null };
      block = 'stage'; first = true;
    } else unread(raw);
  };
  return { design, line };
}
