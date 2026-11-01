// @ts-check
// Mảnh giao diện dùng chung giữa các view.

import { html } from '../html.js';
import { icon } from '../icons.js';
import { statusOf } from '../model.js';
import { fmtDayMonth, weekdayShort } from '../time.js';

/** @typedef {import('../model.js').ClassSession} ClassSession */
/** @typedef {import('../model.js').SessionStatus} SessionStatus */

/**
 * Trạng thái để vẽ một buổi: đã qua / đang học / buổi tiếp theo / sắp tới.
 * @param {ClassSession} s @param {number} nowMs @param {ClassSession|null} next
 */
export function stateOf(s, nowMs, next) {
  const status = statusOf(s, nowMs);
  return { status, isNext: status === 'upcoming' && next === s };
}

/** @param {SessionStatus} status @param {boolean} isNext */
export function statusBadge(status, isNext) {
  if (status === 'live') return html`<span class="badge badge-live"><span class="pulse"></span>Đang học</span>`;
  if (isNext) return html`<span class="badge badge-next">Tiếp theo</span>`;
  if (status === 'past') return html`<span class="badge badge-past">${icon('check')}Đã học</span>`;
  return '';
}

/**
 * Một dòng buổi học, bấm để mở chi tiết.
 * @param {ClassSession} s
 * @param {{nowMs:number, next:ClassSession|null, showDate?:boolean}} opt
 */
export function sessionRow(s, opt) {
  const { status, isNext } = stateOf(s, opt.nowMs, opt.next);
  const cls = ['srow', `tone-${s.course.tone}`, `is-${status}`, isNext ? 'is-next' : ''].join(' ');
  return html`<button type="button" class="${cls}" data-session="${s.id}">
    ${opt.showDate
      ? html`<span class="srow-date"><span>${weekdayShort(s.date)}</span><strong>${fmtDayMonth(s.date)}</strong></span>`
      : ''}
    <span class="srow-bar" aria-hidden="true"></span>
    <span class="srow-time"><strong>${s.start}</strong><span>${s.end}</span></span>
    <span class="srow-main">
      <span class="srow-title">${s.course.shortName}</span>
      <span class="srow-meta">${s.room} · ${s.instructor.name}</span>
    </span>
    <span class="srow-status">${statusBadge(status, isNext)}</span>
  </button>`;
}

/** @param {number} percent @param {string} [label] */
export function progressBar(percent, label = '') {
  return html`<span class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-label="${label}"><span style="width:${percent}%"></span></span>`;
}

/** @param {string} title @param {string} text @param {boolean} [withReset] */
export function emptyState(title, text, withReset = false) {
  return html`<div class="empty">
    <p class="empty-title">${title}</p>
    <p class="empty-text">${text}</p>
    ${withReset ? html`<button type="button" class="btn" data-action="reset-filters">Xoá bộ lọc</button>` : ''}
  </div>`;
}
