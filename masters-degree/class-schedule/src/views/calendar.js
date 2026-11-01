// @ts-check
// Ba chế độ xem lịch: tháng, tuần, danh sách.

import { html } from '../html.js';
import { icon } from '../icons.js';
import { nextSession, statusOf } from '../model.js';
import {
  addDays, daysInMonth, diffDays, fmtDate, minutesOf, fmtMonthTitle, fmtWeekRange, parseKey, relativeDay, startOfMonth, startOfWeek,
  WEEK_HEADERS, weekdayLong, weekdayShort,
} from '../time.js';
import { emptyState, sessionRow, stateOf } from './parts.js';
import { hasFilters, visibleSessions } from '../state.js';

/** @typedef {import('../state.js').AppState} AppState */
/** @typedef {import('../model.js').ClassSession} ClassSession */

/** Tiêu đề thanh điều hướng của view hiện tại. @param {AppState} state */
export function viewTitle(state) {
  if (state.view === 'month') return fmtMonthTitle(state.cursor);
  if (state.view === 'week') return fmtWeekRange(startOfWeek(state.cursor), state.narrow);
  return 'Các buổi học';
}

/** @param {AppState} state */
export function renderView(state) {
  if (state.view === 'week') return weekView(state);
  if (state.view === 'agenda') return agendaView(state);
  return monthView(state);
}

/** @param {ClassSession[]} sessions */
function byDate(sessions) {
  /** @type {Map<string, ClassSession[]>} */
  const map = new Map();
  for (const s of sessions) {
    const list = map.get(s.date);
    if (list) list.push(s); else map.set(s.date, [s]);
  }
  return map;
}

/** Ô chú thích khi bộ lọc làm trống view. @param {AppState} state @param {ClassSession[]} list */
function filterNote(state, list) {
  if (list.length || !hasFilters(state)) return '';
  return html`<p class="filter-note">Không có buổi nào khớp bộ lọc trong khoảng này. <button type="button" class="link" data-action="reset-filters">Xoá bộ lọc</button></p>`;
}

/* ---------- Tháng ---------- */

/** @param {AppState} state */
function monthView(state) {
  const { now } = state;
  const visible = visibleSessions(state);
  const days = byDate(visible);
  const next = nextSession(state.schedule.sessions, now.ms);
  const first = startOfMonth(state.cursor);
  const { m } = parseKey(first);
  const gridStart = startOfWeek(first);
  const lastOfMonth = addDays(first, daysInMonth(first) - 1);
  const weeks = Math.ceil((diffDays(gridStart, lastOfMonth) + 1) / 7);
  const inMonth = visible.filter((s) => s.date.slice(0, 7) === first.slice(0, 7));
  const selected = state.selectedDay && state.selectedDay.slice(0, 7) === first.slice(0, 7) ? state.selectedDay : null;

  const cells = [];
  for (let i = 0; i < weeks * 7; i++) {
    const key = addDays(gridStart, i);
    const list = days.get(key) ?? [];
    const out = parseKey(key).m !== m;
    const cls = ['day', out ? 'is-out' : '', key === now.key ? 'is-today' : '', key === selected ? 'is-selected' : '',
      key < now.key ? 'is-before' : '', list.length ? 'has-events' : ''].join(' ');
    const label = `${weekdayLong(key)}, ${fmtDate(key)}${list.length ? `, ${list.length} buổi học` : ''}`;
    cells.push(html`<div class="${cls}" data-day="${key}" role="gridcell">
      <button type="button" class="day-num num" data-day="${key}" aria-label="${label}"${key === now.key ? ' aria-current="date"' : ''}>${parseKey(key).d}</button>
      ${list.length
        ? html`<span class="day-events">${list.map((s) => {
            const { status, isNext } = stateOf(s, now.ms, next);
            return html`<button type="button" class="ev tone-${s.course.tone} is-${status}${isNext ? ' is-next' : ''}" data-session="${s.id}" title="${s.course.name} · ${s.start}–${s.end} · ${s.room}">
              <span class="ev-time num">${s.start}</span><span class="ev-name">${s.course.shortName}</span><span class="ev-room">${s.room}</span>
            </button>`;
          })}</span>
          <span class="day-dots" aria-hidden="true">${list.map((s) => html`<span class="dot tone-${s.course.tone} is-${statusOf(s, now.ms)}"></span>`)}</span>`
        : ''}
    </div>`);
  }

  const dayList = selected ? days.get(selected) ?? [] : [];
  return html`<div class="month" role="grid" aria-label="${fmtMonthTitle(first)}">
      <div class="month-head" role="row">${WEEK_HEADERS.map((h) => html`<span role="columnheader">${h}</span>`)}</div>
      <div class="month-body" role="rowgroup" style="--weeks:${weeks}">${cells}</div>
    </div>
    ${filterNote(state, inMonth)}
    <div class="month-daylist" aria-live="polite">
      ${selected
        ? html`<p class="daylist-title">${weekdayLong(selected)}, <span class="num">${fmtDate(selected)}</span> <span class="muted">· ${relativeDay(selected, now.key)}</span></p>
          ${dayList.length
            ? html`<div class="srows">${dayList.map((s) => sessionRow(s, { nowMs: now.ms, next }))}</div>`
            : html`<p class="muted">Không có buổi học.</p>`}`
        : html`<p class="muted">Chạm vào một ngày để xem buổi học.</p>`}
    </div>`;
}

/* ---------- Tuần ---------- */

const DAY_START = 7 * 60;   // 07:00
const DAY_END = 21 * 60;    // 21:00 — buổi muộn nhất kết thúc 20:30

/** @param {AppState} state */
function weekView(state) {
  const { now } = state;
  const visible = visibleSessions(state);
  const days = byDate(visible);
  const next = nextSession(state.schedule.sessions, now.ms);
  const start = startOfWeek(state.cursor);
  const keys = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const inWeek = keys.flatMap((k) => days.get(k) ?? []);

  if (state.narrow) {
    return html`<div class="week-list">
      ${keys.map((k) => {
        const list = days.get(k) ?? [];
        return html`<section class="wl-day${k === now.key ? ' is-today' : ''}${k < now.key ? ' is-before' : ''}">
          <h3 class="wl-head"><span class="wl-wd">${weekdayShort(k)}</span><span class="num">${fmtDate(k)}</span>${k === now.key ? html`<span class="pill pill-today">Hôm nay</span>` : ''}</h3>
          ${list.length
            ? html`<div class="srows">${list.map((s) => sessionRow(s, { nowMs: now.ms, next }))}</div>`
            : html`<p class="muted wl-empty">Không có buổi học</p>`}
        </section>`;
      })}
    </div>${filterNote(state, inWeek)}`;
  }

  const hours = [];
  for (let t = DAY_START; t < DAY_END; t += 60) hours.push(t / 60);
  const nowInWeek = keys.includes(now.key) && now.minutes >= DAY_START && now.minutes <= DAY_END;

  return html`<div class="week" style="--rows:${hours.length}">
      <div class="week-head">
        <span></span>
        ${keys.map((k) => html`<span class="wh${k === now.key ? ' is-today' : ''}"><span class="wh-wd">${weekdayShort(k)}</span><span class="wh-d num">${parseKey(k).d}</span></span>`)}
      </div>
      <div class="week-body">
        <div class="week-gutter" aria-hidden="true">${hours.map((h) => html`<span class="num">${String(h).padStart(2, '0')}:00</span>`)}</div>
        ${keys.map((k) => html`<div class="week-col${k === now.key ? ' is-today' : ''}" aria-label="${weekdayLong(k)}, ${fmtDate(k)}">
          ${(days.get(k) ?? []).map((s) => {
            const top = ((minutesOf(s.start) - DAY_START) / (DAY_END - DAY_START)) * 100;
            const height = ((minutesOf(s.end) - minutesOf(s.start)) / (DAY_END - DAY_START)) * 100;
            const { status, isNext } = stateOf(s, now.ms, next);
            return html`<button type="button" class="wev tone-${s.course.tone} is-${status}${isNext ? ' is-next' : ''}" data-session="${s.id}" style="top:${top}%;height:${height}%">
              <span class="wev-name">${s.course.shortName}</span>
              <span class="wev-time num">${s.start} – ${s.end}</span>
              <span class="wev-room">${s.room}</span>
              <span class="wev-who">${s.instructor.name}</span>
            </button>`;
          })}
          ${nowInWeek && k === now.key
            ? html`<span class="now-line" style="top:${((now.minutes - DAY_START) / (DAY_END - DAY_START)) * 100}%" aria-hidden="true"></span>`
            : ''}
        </div>`)}
      </div>
    </div>${filterNote(state, inWeek)}`;
}

/* ---------- Danh sách ---------- */

/** @param {AppState} state */
function agendaView(state) {
  const { now } = state;
  const visible = visibleSessions(state);
  const next = nextSession(state.schedule.sessions, now.ms);
  const past = visible.filter((s) => statusOf(s, now.ms) === 'past');
  const shown = state.showPast ? visible : visible.filter((s) => statusOf(s, now.ms) !== 'past');

  if (!visible.length) {
    return emptyState('Không có buổi học nào', hasFilters(state) ? 'Không buổi nào khớp bộ lọc hiện tại.' : 'Dữ liệu chưa có buổi học.', hasFilters(state));
  }

  const groups = byDate(shown);
  /** @type {unknown[]} */
  const out = [];
  let month = '';
  for (const [key, list] of groups) {
    const mk = key.slice(0, 7);
    if (mk !== month) {
      month = mk;
      out.push(html`<h3 class="ag-month">${fmtMonthTitle(key)}</h3>`);
    }
    const cls = ['ag-day', key === now.key ? 'is-today' : '', key < now.key ? 'is-before' : ''].join(' ');
    out.push(html`<section class="${cls}" data-date="${key}">
      <div class="ag-date">
        <span class="ag-wd">${weekdayShort(key)}</span>
        <span class="ag-d num">${parseKey(key).d}</span>
      </div>
      <div class="ag-body">
        <p class="ag-label">${weekdayLong(key)}, <span class="num">${fmtDate(key)}</span> <span class="muted">· ${relativeDay(key, now.key)}</span></p>
        <div class="srows">${list.map((s) => sessionRow(s, { nowMs: now.ms, next }))}</div>
      </div>
    </section>`);
  }

  return html`<div class="agenda">
    ${past.length
      ? html`<button type="button" class="past-toggle" data-action="toggle-past" aria-expanded="${state.showPast}">
          ${icon('chevron-down', state.showPast ? 'rot' : '')}${state.showPast ? 'Ẩn' : 'Hiện'} ${past.length} buổi đã qua
        </button>`
      : ''}
    ${shown.length ? out : emptyState('Không còn buổi sắp tới', 'Mọi buổi khớp bộ lọc đều đã qua.')}
  </div>`;
}
