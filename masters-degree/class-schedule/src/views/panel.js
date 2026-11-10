// @ts-check
// Panel chi tiết: một môn, và nếu mở từ một buổi thì buổi ấy (giảng viên đúng của ngày đó).

import { html } from '../html.js';
import { icon } from '../icons.js';
import { instructorsOf, progressOf, sessionsOf, statusOf } from '../model.js';
import { fmtDate, fmtDuration, relativeDay, weekdayLong, weekdayName, weekdayShort } from '../time.js';
import { meter } from './parts.js';

/** @typedef {import('../state.js').AppState} AppState */

/** @param {AppState} state */
export function renderPanel(state) {
  if (!state.panel) return '';
  const { schedule, now } = state;
  const course = schedule.courseById.get(state.panel.courseId);
  if (!course) return '';
  const session = state.panel.sessionId ? schedule.sessionById.get(state.panel.sessionId) ?? null : null;
  const own = sessionsOf(schedule, course);
  const p = progressOf(own, now.ms);
  const teachers = instructorsOf(schedule, course);
  const ownNext = own.find((s) => s.endMs > now.ms) ?? null;
  const days = course.weekdays.map((d) => weekdayName(d)).join(' và ');

  /** @type {unknown} */
  let focus = '';
  if (session) {
    const status = statusOf(session, now.ms);
    const when = status === 'live'
      ? `Đang học · kết thúc sau ${fmtDuration(session.endMs - now.ms)}`
      : status === 'upcoming' ? `${relativeDay(session.date, now.key)} · bắt đầu sau ${fmtDuration(session.startMs - now.ms)}` : `${relativeDay(session.date, now.key)} · đã học`;
    focus = html`<section class="p-session" aria-label="Buổi đang xem">
      <p class="p-session-date">${weekdayLong(session.date)}, ${fmtDate(session.date)}</p>
      <p class="p-session-rel${status === 'live' ? ' is-live' : ''}">Buổi ${session.index}/${session.total} · ${when}</p>
      <dl class="p-facts">
        <div><dt>Giờ</dt><dd>${session.start} – ${session.end}</dd></div>
        <div><dt>Phòng</dt><dd>${session.room}</dd></div>
        <div><dt>Giảng viên</dt><dd>${session.instructor.name}</dd></div>
        <div><dt>Email</dt><dd><a href="mailto:${session.instructor.email}">${session.instructor.email}</a></dd></div>
      </dl>
    </section>`;
  }

  return html`<div class="panel-backdrop" data-action="close-panel"></div>
  <aside class="panel tone-${course.tone}" role="dialog" aria-modal="true" aria-labelledby="panel-title">
    <header class="panel-head">
      <span class="grabber" aria-hidden="true"></span>
      <div class="panel-titles">
        <p class="panel-kicker"><span class="dot" aria-hidden="true"></span>${course.shortName}</p>
        <h2 id="panel-title">${course.name}</h2>
      </div>
      <button type="button" class="icon-btn" data-action="close-panel" aria-label="Đóng">${icon('x')}</button>
    </header>
    <div class="panel-body">
      ${focus}

      <section class="p-block">
        <h3>Tiến độ môn</h3>
        <p class="p-progress"><strong>${p.done}/${p.total}</strong><span>buổi đã học · còn ${p.remaining} · ${p.percent}%</span></p>
        ${meter(p.percent, `Tiến độ ${course.shortName}`)}
      </section>

      <section class="p-block">
        <h3>Học phần</h3>
        <dl class="info">
          <div><dt>Mã</dt><dd>${course.code}</dd></div>
          <div><dt>Tín chỉ</dt><dd>${course.credits}</dd></div>
          <div><dt>Lịch</dt><dd>${days}</dd></div>
          <div><dt>Giờ học</dt><dd>${course.start} – ${course.end}${course.periods ? html` <span class="muted">· ${course.periods}</span>` : ''}</dd></div>
          <div><dt>Phòng</dt><dd>${course.room}</dd></div>
          <div><dt>Khoa</dt><dd>${course.faculty}</dd></div>
          <div><dt>Hình thức</dt><dd>${course.mode
            ? html`${course.mode}${course.mode === 'Hybrid Learning' ? html`<span class="muted"> · kết hợp trực tiếp và trực tuyến</span>` : ''}`
            : html`<span class="muted">Chưa cập nhật</span>`}</dd></div>
        </dl>
      </section>

      <section class="p-block">
        <h3>${teachers.length > 1 ? `Giảng viên · ${teachers.length} người dạy luân phiên` : 'Giảng viên'}</h3>
        <ul class="teachers">
          ${teachers.map((t) => html`<li class="${session && session.instructor === t ? 'is-current' : ''}">
            <span class="t-name">${t.name}</span>
            <a href="mailto:${t.email}">${t.email}</a>
            <span class="muted">${own.filter((s) => s.instructor === t).length} buổi</span>
          </li>`)}
        </ul>
      </section>

      <section class="p-block">
        <h3>Tất cả buổi học · ${own.length}</h3>
        <ol class="p-dates">
          ${own.map((s) => {
            const st = statusOf(s, now.ms);
            const cls = ['p-date', `is-${st}`, s === session ? 'is-current' : '', s === ownNext ? 'is-own-next' : ''].join(' ');
            return html`<li><button type="button" class="${cls}" data-session="${s.id}" aria-current="${s === session ? 'true' : 'false'}">
              <span class="p-idx">${s.index}</span>
              <span class="p-when"><span>${weekdayShort(s.date)} ${fmtDate(s.date)}</span>${teachers.length > 1 ? html`<span class="muted">${s.instructor.name}</span>` : ''}</span>
              <span class="p-st">${st === 'past' ? html`${icon('check')}<span class="sr">Đã học</span>` : st === 'live' ? 'Đang học' : s === ownNext ? 'Tiếp theo' : ''}</span>
            </button></li>`;
          })}
        </ol>
      </section>
    </div>
  </aside>`;
}
