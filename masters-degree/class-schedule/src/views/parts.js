// @ts-check
// Mảnh giao diện dùng chung giữa các view.

import { html } from '../html.js';
import { statusOf } from '../model.js';

/** @typedef {import('../model.js').ClassSession} ClassSession */

/**
 * Trạng thái để vẽ một buổi: đã qua / đang học / buổi tiếp theo / sắp tới.
 * @param {ClassSession} s @param {number} nowMs @param {ClassSession|null} next
 */
export function stateOf(s, nowMs, next) {
  const status = statusOf(s, nowMs);
  return { status, isNext: status === 'upcoming' && next === s };
}

/**
 * Một dòng buổi học, bấm để mở chi tiết. Chỉ buổi đang học và buổi tiếp theo có nhãn bên phải.
 * @param {ClassSession} s
 * @param {{nowMs:number, next:ClassSession|null}} opt
 */
export function sessionRow(s, opt) {
  const { status, isNext } = stateOf(s, opt.nowMs, opt.next);
  const cls = ['srow', `tone-${s.course.tone}`, `is-${status}`, isNext ? 'is-next' : ''].join(' ');
  const tag = status === 'live' ? html`<span class="srow-tag"><span class="pulse"></span>Đang học</span>`
    : isNext ? html`<span class="srow-tag">Tiếp theo</span>` : '';
  return html`<button type="button" class="${cls}" data-session="${s.id}">
    <span class="srow-time"><span>${s.start}</span><span class="dash-sep"> – </span><span>${s.end}</span></span>
    <span class="srow-main">
      <span class="srow-title"><span class="dot" aria-hidden="true"></span>${s.course.shortName}${tag}</span>
      <span class="srow-meta">${s.room} · ${s.instructor.name}</span>
    </span>
  </button>`;
}

/** @param {number} percent @param {string} [label] */
export function meter(percent, label = '') {
  if (!label) return html`<span class="meter" aria-hidden="true"><span style="width:${percent}%"></span></span>`;
  return html`<span class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-label="${label}"><span style="width:${percent}%"></span></span>`;
}

/** @param {string} title @param {string} text @param {boolean} [withReset] */
export function emptyState(title, text, withReset = false) {
  return html`<div class="empty">
    <p class="empty-title">${title}</p>
    <p class="empty-text">${text}</p>
    ${withReset ? html`<button type="button" class="text-btn" data-action="reset-filters">Xoá bộ lọc</button>` : ''}
  </div>`;
}
