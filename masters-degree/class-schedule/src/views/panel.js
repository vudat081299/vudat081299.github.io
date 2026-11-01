// @ts-check
// Panel chi tiết: một môn, và nếu mở từ một buổi thì buổi ấy (giảng viên đúng của ngày đó).

import { html } from '../html.js';
import { icon } from '../icons.js';
import { instructorsOf, nextSession, progressOf, sessionsOf, statusOf } from '../model.js';
import { fmtDate, fmtDuration, relativeDay, weekdayLong, weekdayName, weekdayShort } from '../time.js';
import { progressBar, statusBadge } from './parts.js';

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
  const next = nextSession(schedule.sessions, now.ms);
  const ownNext = own.find((s) => s.endMs > now.ms) ?? null;
  const days = course.weekdays.map((d) => weekdayName(d)).join(' và ');

  /** @type {unknown} */
  let focus = '';
  if (session) {
    const status = statusOf(session, now.ms);
    const when = status === 'live'
      ? `Kết thúc sau ${fmtDuration(session.endMs - now.ms)}`
      : status === 'upcoming' ? `Bắt đầu sau ${fmtDuration(session.startMs - now.ms)}` : 'Đã diễn ra';
    focus = html`<section class="p-session" aria-label="Buổi đang xem">
      <div class="p-session-head">
        <span class="muted">Buổi ${session.index}/${session.total}</span>
        ${statusBadge(status, session === next)}
      </div>
      <p class="p-session-date">${weekdayLong(session.date)}, <span class="num">${fmtDate(session.date)}</span></p>
      <p class="muted p-session-rel">${relativeDay(session.date, now.key)} · ${when}</p>
      <dl class="facts">
        <div><dt>${icon('clock')}<span class="sr">Giờ</span></dt><dd class="num">${session.start} – ${session.end}</dd></div>
        <div><dt>${icon('map-pin')}<span class="sr">Phòng</span></dt><dd>Phòng <strong>${session.room}</strong></dd></div>
        <div><dt>${icon('user')}<span class="sr">Giảng viên buổi này</span></dt><dd>${session.instructor.name}</dd></div>
        <div><dt>${icon('mail')}<span class="sr">Email</span></dt><dd><a href="mailto:${session.instructor.email}">${session.instructor.email}</a></dd></div>
      </dl>
    </section>`;
  }

  return html`<div class="panel-backdrop" data-action="close-panel"></div>
  <aside class="panel tone-${course.tone}" role="dialog" aria-modal="true" aria-labelledby="panel-title">
    <header class="panel-head">
      <span class="grabber" aria-hidden="true"></span>
      <div class="panel-titles">
        <p class="panel-kicker"><span class="tone-dot" aria-hidden="true"></span>${course.shortName}</p>
        <h2 id="panel-title">${course.name}</h2>
      </div>
      <button type="button" class="icon-btn" data-action="close-panel" aria-label="Đóng">${icon('x')}</button>
    </header>
    <div class="panel-body">
      ${focus}

      <section class="p-block">
        <h3>Tiến độ môn</h3>
        ${progressBar(p.percent, `Tiến độ ${course.shortName}`)}
        <p class="p-progress num"><span><strong>${p.done}</strong> đã học</span><span><strong>${p.remaining}</strong> còn lại</span><span><strong>${p.total}</strong> buổi</span><span>${p.percent}%</span></p>
      </section>

      <section class="p-block">
        <h3>Thông tin học phần</h3>
        <dl class="info">
          <div><dt>Mã học phần</dt><dd class="num">${course.code}</dd></div>
          <div><dt>Số tín chỉ</dt><dd class="num">${course.credits}</dd></div>
          <div><dt>Lịch</dt><dd>${days}</dd></div>
          <div><dt>Giờ học</dt><dd class="num">${course.start} – ${course.end}${course.periods ? html` <span class="muted">· ${course.periods}</span>` : ''}</dd></div>
          <div><dt>Phòng học</dt><dd>${course.room}</dd></div>
          <div><dt>Khoa</dt><dd>${course.faculty}</dd></div>
          <div><dt>Hình thức</dt><dd>${course.mode
            ? html`${course.mode}${course.mode === 'Hybrid Learning' ? html`<span class="muted"> · kết hợp trực tiếp và trực tuyến</span>` : ''}`
            : html`<span class="muted">Chưa cập nhật</span>`}</dd></div>
        </dl>
      </section>

      <section class="p-block">
        <h3>${teachers.length > 1 ? `Giảng viên · ${teachers.length} người dạy luân phiên` : 'Giảng viên'}</h3>
        <ul class="teachers">
          ${teachers.map((t) => {
            const taught = own.filter((s) => s.instructor === t);
            return html`<li class="${session && session.instructor === t ? 'is-current' : ''}">
              <span class="avatar" aria-hidden="true">${initials(t.name)}</span>
              <span class="t-main"><span class="t-name">${t.name}</span><a href="mailto:${t.email}">${t.email}</a></span>
              <span class="muted num">${taught.length} buổi</span>
            </li>`;
          })}
        </ul>
      </section>

      <section class="p-block">
        <h3>Tất cả buổi học · <span class="num">${own.length}</span></h3>
        <ol class="p-dates">
          ${own.map((s) => {
            const st = statusOf(s, now.ms);
            const cls = ['p-date', `is-${st}`, s === session ? 'is-current' : '', s === ownNext ? 'is-own-next' : ''].join(' ');
            return html`<li><button type="button" class="${cls}" data-session="${s.id}" aria-current="${s === session ? 'true' : 'false'}">
              <span class="p-idx num">${s.index}</span>
              <span class="p-when"><span class="num">${weekdayShort(s.date)} ${fmtDate(s.date)}</span>${teachers.length > 1 ? html`<span class="muted">${s.instructor.name}</span>` : ''}</span>
              <span class="p-st">${st === 'past' ? icon('check') : st === 'live' ? html`<span class="pulse"></span>` : s === ownNext ? html`<span class="badge badge-next">Tới</span>` : ''}</span>
            </button></li>`;
          })}
        </ol>
      </section>
    </div>
  </aside>`;
}

/** @param {string} name */
function initials(name) {
  const parts = name.trim().split(/\s+/);
  // Họ + tên: "Bùi Quốc Trung" → "BT".
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
}
