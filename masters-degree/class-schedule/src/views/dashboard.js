// @ts-check
// Tổng quan: hôm nay, buổi tiếp theo, tiến độ, tuần này, ba môn.

import { html } from '../html.js';
import { icon } from '../icons.js';
import { nextSession, progressOf, sessionsOf, statusOf, totalCredits } from '../model.js';
import {
  addDays, fmtDate, fmtDayMonth, fmtDuration, fmtMonthTitle, fmtWeekRange, relativeDay, startOfWeek, weekdayLong, weekdayName,
} from '../time.js';
import { progressBar, sessionRow } from './parts.js';

/** @typedef {import('../state.js').AppState} AppState */
/** @typedef {import('../model.js').ClassSession} ClassSession */

/** @param {AppState} state */
export function renderDashboard(state) {
  const { schedule, now } = state;
  const next = nextSession(schedule.sessions, now.ms);
  return html`
    ${hero(state, next)}
    <div class="dash-grid">
      ${nextCard(state, next)}
      ${statsCard(state)}
    </div>
    ${weekCard(state, next)}
    ${courseCards(state)}`;
}

/** @param {AppState} state @param {ClassSession|null} next */
function hero(state, next) {
  const { now, schedule } = state;
  const today = schedule.sessions.filter((s) => s.date === now.key);
  let line;
  let pill;
  if (today.length) {
    const left = today.filter((s) => statusOf(s, now.ms) !== 'past');
    pill = html`<span class="pill pill-yes">Có học</span>`;
    line = left.length
      ? html`Hôm nay có ${today.length} buổi: ${today.map((s, i) => html`${i ? ', ' : ''}<button type="button" class="link tone-${s.course.tone}" data-session="${s.id}">${s.course.shortName}</button> lúc ${s.start} tại ${s.room}`)}.`
      : html`Hôm nay đã học xong ${today.length} buổi.`;
  } else {
    pill = html`<span class="pill">Không có buổi học</span>`;
    line = next
      ? html`Buổi gần nhất là ${relativeDay(next.date, now.key).toLowerCase()}, ${weekdayLong(next.date).toLowerCase()} ${fmtDate(next.date)}.`
      : html`Đã hết lịch học của cả ba môn.`;
  }
  return html`<section class="hero" aria-label="Hôm nay">
    <p class="eyebrow">Hôm nay ${pill}</p>
    <h1 class="hero-date">${weekdayLong(now.key)}, <span class="num">${fmtDate(now.key)}</span></h1>
    <p class="hero-line">${line}</p>
  </section>`;
}

/** @param {AppState} state @param {ClassSession|null} next */
function nextCard(state, next) {
  const { now } = state;
  if (!next) {
    return html`<article class="card next-card is-done">
      <p class="card-label">Buổi học tiếp theo</p>
      <p class="next-title">Đã hoàn thành toàn bộ lịch học</p>
      <p class="muted">Không còn buổi nào trong dữ liệu.</p>
    </article>`;
  }
  const live = statusOf(next, now.ms) === 'live';
  const later = state.schedule.sessions.find((s) => s.startMs >= next.endMs);
  return html`<article class="card next-card tone-${next.course.tone}${live ? ' is-live' : ''}">
    <div class="next-head">
      <p class="card-label">${live ? html`<span class="pulse"></span>Đang diễn ra` : 'Buổi học tiếp theo'}</p>
      <span class="countdown num">${live ? `Kết thúc sau ${fmtDuration(next.endMs - now.ms)}` : `Còn ${fmtDuration(next.startMs - now.ms)}`}</span>
    </div>
    <button type="button" class="next-title-btn" data-session="${next.id}">
      <span class="tone-dot" aria-hidden="true"></span>
      <span class="next-title">${next.course.name}</span>
    </button>
    <dl class="facts">
      <div><dt>${icon('calendar')}<span class="sr">Ngày</span></dt><dd>${weekdayLong(next.date)}, <span class="num">${fmtDate(next.date)}</span> <span class="muted">· ${relativeDay(next.date, now.key)}</span></dd></div>
      <div><dt>${icon('clock')}<span class="sr">Giờ</span></dt><dd class="num">${next.start} – ${next.end}</dd></div>
      <div><dt>${icon('user')}<span class="sr">Giảng viên</span></dt><dd>${next.instructor.name}</dd></div>
      <div><dt>${icon('map-pin')}<span class="sr">Phòng</span></dt><dd>Phòng <strong>${next.room}</strong></dd></div>
    </dl>
    <div class="next-foot">
      <span class="muted">Buổi ${next.index}/${next.total} của môn</span>
      <button type="button" class="btn btn-ghost" data-session="${next.id}">Chi tiết ${icon('chevron-right')}</button>
    </div>
    ${later
      ? html`<p class="next-after">Sau đó: <button type="button" class="link tone-${later.course.tone}" data-session="${later.id}">${later.course.shortName}</button> · ${weekdayLong(later.date)} <span class="num">${fmtDayMonth(later.date)}, ${later.start}</span></p>`
      : ''}
  </article>`;
}

/** @param {AppState} state */
function statsCard(state) {
  const { schedule, now } = state;
  const p = progressOf(schedule.sessions, now.ms);
  const left = schedule.sessions.filter((s) => statusOf(s, now.ms) !== 'past');
  const weekEnd = addDays(startOfWeek(now.key), 6);
  const weekLeft = left.filter((s) => s.date <= weekEnd).length;
  const monthLeft = left.filter((s) => s.date.slice(0, 7) === now.key.slice(0, 7)).length;
  const last = schedule.sessions[schedule.sessions.length - 1];
  return html`<article class="card stats-card">
    <p class="card-label">Tiến độ học kỳ</p>
    <p class="stats-big num">${p.percent}<span>%</span></p>
    ${progressBar(p.percent, 'Tiến độ học tập')}
    <p class="muted stats-caption num">${p.done} / ${p.total} buổi đã học</p>
    <dl class="stats-list">
      <div><dt>Tuần này</dt><dd class="num">${weekLeft} buổi còn lại</dd></div>
      <div><dt>${fmtMonthTitle(now.key)}</dt><dd class="num">${monthLeft} buổi còn lại</dd></div>
      <div><dt>Buổi cuối cùng</dt><dd class="num">${last ? fmtDate(last.date) : '—'}</dd></div>
    </dl>
    <dl class="stats-grid">
      <div><dt>Môn học</dt><dd class="num">${schedule.courses.length}</dd></div>
      <div><dt>Tín chỉ</dt><dd class="num">${totalCredits(schedule)}</dd></div>
      <div><dt>Tổng buổi</dt><dd class="num">${p.total}</dd></div>
      <div><dt>Đã học</dt><dd class="num">${p.done}</dd></div>
      <div><dt>Còn lại</dt><dd class="num">${p.remaining}</dd></div>
    </dl>
  </article>`;
}

/** @param {AppState} state @param {ClassSession|null} next */
function weekCard(state, next) {
  const { schedule, now } = state;
  const start = startOfWeek(now.key);
  const inWeek = (/** @type {string} */ from) => {
    const to = addDays(from, 6);
    return schedule.sessions.filter((s) => s.date >= from && s.date <= to);
  };
  const thisWeek = inWeek(start);
  const leftThisWeek = thisWeek.filter((s) => statusOf(s, now.ms) !== 'past').length;
  const nextStart = addDays(start, 7);
  const nextWeek = leftThisWeek === 0 ? inWeek(nextStart) : [];
  const opt = { nowMs: now.ms, next, showDate: true };

  return html`<section class="card week-card" aria-labelledby="week-title">
    <div class="card-head">
      <h2 id="week-title">Tuần này</h2>
      <span class="muted num">${fmtWeekRange(start)}</span>
      <span class="count num">${thisWeek.length} buổi${thisWeek.length && leftThisWeek < thisWeek.length ? ` · còn ${leftThisWeek}` : ''}</span>
    </div>
    ${thisWeek.length
      ? html`<div class="srows">${thisWeek.map((s) => sessionRow(s, opt))}</div>`
      : html`<p class="muted week-empty">Tuần này không có buổi học.</p>`}
    ${leftThisWeek === 0 && nextWeek.length
      ? html`<div class="card-head card-subhead">
          <h3>Tuần sau</h3>
          <span class="muted num">${fmtWeekRange(nextStart)}</span>
          <span class="count num">${nextWeek.length} buổi</span>
        </div>
        <div class="srows">${nextWeek.map((s) => sessionRow(s, opt))}</div>`
      : ''}
  </section>`;
}

/** @param {AppState} state */
function courseCards(state) {
  const { schedule, now } = state;
  return html`<section class="courses" aria-label="Môn học">
    ${schedule.courses.map((c) => {
      const own = sessionsOf(schedule, c);
      const p = progressOf(own, now.ms);
      const upcoming = own.find((s) => s.endMs > now.ms);
      const days = c.weekdays.map((d) => weekdayName(d)).join(', ');
      return html`<button type="button" class="card course-card tone-${c.tone}" data-course="${c.id}">
        <span class="course-top"><span class="tone-dot" aria-hidden="true"></span><span class="course-short">${c.shortName}</span><span class="muted num">${c.credits} TC</span></span>
        <span class="course-name">${c.name}</span>
        <span class="course-meta">${days} · <span class="num">${c.start}–${c.end}</span> · ${c.room}</span>
        ${progressBar(p.percent, `Tiến độ ${c.shortName}`)}
        <span class="course-foot muted num"><span>${p.done}/${p.total} buổi</span><span>${upcoming ? `Buổi tới ${fmtDayMonth(upcoming.date)}` : 'Đã xong'}</span></span>
      </button>`;
    })}
  </section>`;
}
