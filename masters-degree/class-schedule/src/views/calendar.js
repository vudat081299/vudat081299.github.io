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

/** Dòng báo khi bộ lọc làm trống view. @param {AppState} state @param {ClassSession[]} list */
function filterNote(state, list) {
  if (list.length || !hasFilters(state)) return '';
  return html`<p class="filter-note">Không có buổi nào khớp bộ lọc trong khoảng này. <button type="button" class="link" data-action="reset-filters">Xoá bộ lọc</button></p>`;
}

/**
 * Một ngày trong danh sách: cột ngày bên trái, các buổi bên phải.
 * @param {AppState} state @param {string} key @param {ClassSession[]} list @param {ClassSession|null} next
 */
function dayBlock(state, key, list, next) {
  const { now } = state;
  const cls = ['ag-day', key === now.key ? 'is-today' : '', key < now.key ? 'is-before' : '', list.length ? '' : 'is-empty'].join(' ');
  return html`<section class="${cls}" data-date="${key}" aria-label="${weekdayLong(key)}, ${fmtDate(key)} · ${relativeDay(key, now.key)}">
    <p class="ag-date" aria-hidden="true"><span class="ag-wd">${weekdayShort(key)}</span><span class="ag-d">${parseKey(key).d}</span></p>
    <div class="ag-rows">
      ${list.length
        ? list.map((s) => sessionRow(s, { nowMs: now.ms, next }))
        : html`<p class="ag-empty">Không có buổi học</p>`}
    </div>
  </section>`;
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

  const rows = [];
  for (let w = 0; w < weeks; w++) {
    const keys = Array.from({ length: 7 }, (_, i) => addDays(gridStart, w * 7 + i));
    const busy = keys.some((k) => days.has(k));
    rows.push(html`<div class="m-week${busy ? ' has-events' : ''}">${keys.map((key) => {
      const list = days.get(key) ?? [];
      const cls = ['day', parseKey(key).m !== m ? 'is-out' : '', key === now.key ? 'is-today' : '', key === selected ? 'is-selected' : '',
        key < now.key ? 'is-before' : ''].join(' ');
      const label = `${weekdayLong(key)}, ${fmtDate(key)}${list.length ? `, ${list.length} buổi học` : ''}`;
      return html`<div class="${cls}" data-day="${key}">
        <button type="button" class="day-num" data-day="${key}" aria-label="${label}" aria-current="${key === now.key ? 'date' : 'false'}">${parseKey(key).d}</button>
        ${list.length
          ? html`<span class="day-events">${list.map((s) => {
              const { status, isNext } = stateOf(s, now.ms, next);
              return html`<button type="button" class="ev tone-${s.course.tone} is-${status}${isNext ? ' is-next' : ''}" data-session="${s.id}" title="${s.course.name} · ${s.start}–${s.end} · ${s.room} · ${s.instructor.name}">
                <span class="dot" aria-hidden="true"></span><span class="ev-name">${s.course.shortName}</span><span class="ev-time">${s.start} · ${s.room}</span>
              </button>`;
            })}</span>
            <span class="day-dots" aria-hidden="true">${list.map((s) => html`<span class="dot tone-${s.course.tone} is-${statusOf(s, now.ms)}"></span>`)}</span>`
          : ''}
      </div>`;
    })}</div>`);
  }

  const dayList = selected ? days.get(selected) ?? [] : [];
  return html`<div class="month" aria-label="${fmtMonthTitle(first)}">
      <div class="m-head" aria-hidden="true">${WEEK_HEADERS.map((h) => html`<span>${h}</span>`)}</div>
      ${rows}
    </div>
    ${filterNote(state, inMonth)}
    <div class="daylist" aria-live="polite">
      ${selected
        ? html`<p class="daylist-title">${weekdayLong(selected)}, ${fmtDate(selected)} <span class="muted">· ${relativeDay(selected, now.key)}</span></p>
          ${dayList.length
            ? dayList.map((s) => sessionRow(s, { nowMs: now.ms, next }))
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
    return html`<div class="agenda">${keys.map((k) => dayBlock(state, k, days.get(k) ?? [], next))}</div>${filterNote(state, inWeek)}`;
  }

  const hours = [];
  for (let t = DAY_START; t < DAY_END; t += 60) hours.push(t / 60);
  const nowInWeek = keys.includes(now.key) && now.minutes >= DAY_START && now.minutes <= DAY_END;
  const pct = (/** @type {number} */ min) => ((min - DAY_START) / (DAY_END - DAY_START)) * 100;

  return html`<div class="week" style="--rows:${hours.length}">
      <div class="w-head">
        <span></span>
        ${keys.map((k) => html`<span class="wh${k === now.key ? ' is-today' : ''}"><span>${weekdayShort(k)}</span><span class="wh-d">${parseKey(k).d}</span></span>`)}
      </div>
      <div class="w-body">
        <div class="w-gutter" aria-hidden="true">${hours.map((h) => html`<span>${String(h).padStart(2, '0')}:00</span>`)}</div>
        ${keys.map((k) => html`<div class="w-col${k === now.key ? ' is-today' : ''}" aria-label="${weekdayLong(k)}, ${fmtDate(k)}">
          ${(days.get(k) ?? []).map((s) => {
            const { status, isNext } = stateOf(s, now.ms, next);
            return html`<button type="button" class="wev tone-${s.course.tone} is-${status}${isNext ? ' is-next' : ''}" data-session="${s.id}" style="top:${pct(minutesOf(s.start))}%;height:${pct(minutesOf(s.end)) - pct(minutesOf(s.start))}%">
              <span class="wev-name">${s.course.shortName}</span>
              <span class="wev-time">${s.start} – ${s.end}</span>
              <span class="wev-room">${s.room}</span>
              <span class="wev-who">${s.instructor.name}</span>
            </button>`;
          })}
          ${nowInWeek && k === now.key ? html`<span class="now-line" style="top:${pct(now.minutes)}%" aria-hidden="true"></span>` : ''}
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

  /** @type {unknown[]} */
  const out = [];
  let month = '';
  for (const [key, list] of byDate(shown)) {
    if (key.slice(0, 7) !== month) {
      month = key.slice(0, 7);
      out.push(html`<h3 class="ag-month">${fmtMonthTitle(key)}</h3>`);
    }
    out.push(dayBlock(state, key, list, next));
  }

  return html`<div class="agenda">
    ${past.length
      ? html`<button type="button" class="past-toggle" data-action="toggle-past" aria-expanded="${String(state.showPast)}">
          ${icon('chevron-down', state.showPast ? 'rot' : '')}${state.showPast ? 'Ẩn' : 'Hiện'} ${past.length} buổi đã qua
        </button>`
      : ''}
    ${shown.length ? out : emptyState('Không còn buổi sắp tới', 'Mọi buổi khớp bộ lọc đều đã qua.')}
  </div>`;
}
