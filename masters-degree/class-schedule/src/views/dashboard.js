// @ts-check
// Tổng quan: hôm nay và buổi tiếp theo (một khối), tiến độ học kỳ và từng môn (một khối).

import { html } from '../html.js';
import { nextSession, progressOf, sessionsOf, statusOf, totalCredits } from '../model.js';
import { fmtDate, fmtDayMonth, fmtDuration, relativeDay, WEEK_HEADERS, weekdayLong } from '../time.js';
import { meter } from './parts.js';

/** @typedef {import('../state.js').AppState} AppState */
/** @typedef {import('../model.js').ClassSession} ClassSession */

/** @param {AppState} state */
export function renderDashboard(state) {
  const next = nextSession(state.schedule.sessions, state.now.ms);
  return html`${nowBlock(state, next)}${progressBlock(state)}`;
}

/** @param {AppState} state @param {ClassSession|null} next */
function nowBlock(state, next) {
  const { now, schedule } = state;
  const today = schedule.sessions.filter((s) => s.date === now.key);
  const left = today.filter((s) => statusOf(s, now.ms) !== 'past');
  const summary = !today.length ? 'Không có buổi học'
    : left.length ? `Có ${today.length} buổi học` : `Đã học xong ${today.length} buổi`;
  const dateLine = html`<p class="now-date"><strong>${weekdayLong(now.key)}, ${fmtDate(now.key)}</strong> · ${summary}</p>`;

  if (!next) {
    return html`<section class="now" aria-label="Hôm nay">
      ${dateLine}
      <h1 class="now-title is-done">Đã hoàn thành toàn bộ lịch học</h1>
      <p class="now-meta">Không còn buổi nào trong lịch.</p>
    </section>`;
  }

  const live = statusOf(next, now.ms) === 'live';
  const status = live
    ? html`<p class="now-status is-live"><span class="pulse" aria-hidden="true"></span>Đang diễn ra · kết thúc sau ${fmtDuration(next.endMs - now.ms)}</p>`
    : html`<p class="now-status">Buổi tiếp theo · ${next.date === now.key ? `bắt đầu sau ${fmtDuration(next.startMs - now.ms)}` : relativeDay(next.date, now.key)}</p>`;
  const later = schedule.sessions.find((s) => s.startMs >= next.endMs);

  return html`<section class="now tone-${next.course.tone}" aria-label="Hôm nay và buổi tiếp theo">
    ${dateLine}
    ${status}
    <h1><button type="button" class="now-title" data-session="${next.id}">${next.course.name}</button></h1>
    <p class="now-meta">
      ${next.date !== now.key ? html`<span>${weekdayLong(next.date)}, ${fmtDayMonth(next.date)}</span>` : ''}
      <span>${next.start} – ${next.end}</span>
      <span>Phòng <strong>${next.room}</strong></span>
      <span>${next.instructor.name}</span>
      <span class="muted">Buổi ${next.index}/${next.total}</span>
    </p>
    ${later
      ? html`<button type="button" class="now-after" data-session="${later.id}">Sau đó: <span class="link tone-${later.course.tone}">${later.course.shortName}</span>, ${weekdayLong(later.date)} ${fmtDayMonth(later.date)} lúc ${later.start}</button>`
      : ''}
  </section>`;
}

/** @param {AppState} state */
function progressBlock(state) {
  const { schedule, now } = state;
  const p = progressOf(schedule.sessions, now.ms);
  const last = schedule.sessions[schedule.sessions.length - 1];
  return html`<section class="progress" aria-labelledby="prog-title">
    <h2 class="label" id="prog-title">Tiến độ học kỳ</h2>
    <p class="prog-head"><span class="prog-big">${p.percent}<small>%</small></span><span class="muted">${p.done}/${p.total} buổi đã học</span></p>
    ${meter(p.percent, 'Tiến độ học kỳ')}
    <ul class="courses">
      ${schedule.courses.map((c) => {
        const cp = progressOf(sessionsOf(schedule, c), now.ms);
        const days = c.weekdays.map((d) => WEEK_HEADERS[(d + 6) % 7]).join(', ');
        return html`<li><button type="button" class="course-row tone-${c.tone}" data-course="${c.id}" aria-label="${c.name}: ${cp.done}/${cp.total} buổi">
          <span class="dot" aria-hidden="true"></span>
          <span class="course-name">${c.shortName}<span class="muted">${days}</span></span>
          ${meter(cp.percent)}
          <span class="course-count">${cp.done}/${cp.total}</span>
        </button></li>`;
      })}
    </ul>
    <p class="prog-foot">${totalCredits(schedule)} tín chỉ${last ? ` · buổi cuối ${fmtDate(last.date)}` : ''}</p>
  </section>`;
}
