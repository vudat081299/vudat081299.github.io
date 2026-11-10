// @ts-check
// Điểm vào: nạp dữ liệu, giữ trạng thái, vẽ lại từng vùng khi trạng thái đổi.

import { buildSchedule } from './model.js';
import { loadPrefs, savePrefs } from './store.js';
import { addDays, addMonths, instant, vnNow } from './time.js';
import { icon } from './icons.js';
import { visibleSessions } from './state.js';
import { renderDashboard } from './views/dashboard.js';
import { renderView, viewTitle } from './views/calendar.js';
import { renderPanel } from './views/panel.js';
import { html } from './html.js';

/** @typedef {import('./state.js').AppState} AppState */
/** @typedef {import('./store.js').View} View */

const TICK_MS = 30000;
const narrowQuery = matchMedia('(max-width: 639px)');
const darkQuery = matchMedia('(prefers-color-scheme: dark)');

/** @param {string} id */
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

/**
 * `?now=2026-11-18T18:15` (giờ Việt Nam) đặt đồng hồ giả để xem trang ở một thời điểm khác.
 * Đồng hồ giả vẫn chạy tiếp theo thời gian thật.
 */
function clockOffset() {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(new URLSearchParams(location.search).get('now') ?? '');
  return m ? instant(m[1], m[2]) - Date.now() : 0;
}
const offset = clockOffset();
const now = () => vnNow(Date.now() + offset);

const prefs = loadPrefs();

/** @type {AppState} */
let state;

async function start() {
  /** @type {import('./model.js').ScheduleData} */
  let data;
  try {
    const res = await fetch('data/schedule.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (e) {
    fail('Không tải được dữ liệu lịch học (data/schedule.json).', e);
    return;
  }
  let schedule;
  try {
    schedule = buildSchedule(data);
  } catch (e) {
    fail('Dữ liệu lịch học không hợp lệ.', e);
    return;
  }

  const t = now();
  const narrow = narrowQuery.matches;
  state = {
    schedule,
    now: t,
    view: prefs.view ?? (narrow ? 'agenda' : 'month'),
    cursor: t.key,
    selectedDay: t.key,
    query: '',
    hidden: new Set(prefs.hidden.filter((id) => schedule.courseById.has(id))),
    showPast: prefs.showPast,
    panel: null,
    narrow,
  };

  bindEvents();
  renderAll();
  setInterval(tick, TICK_MS);
}

/** @param {string} message @param {unknown} err */
function fail(message, err) {
  const box = $('app-error');
  box.hidden = false;
  box.querySelector('[data-msg]')?.replaceChildren(document.createTextNode(message));
  const detail = box.querySelector('[data-detail]');
  if (detail) detail.textContent = err instanceof Error ? err.message : String(err);
  $('app').hidden = true;
}

/* ---------- Vẽ ---------- */

const KEY_ATTRS = ['data-session', 'data-course', 'data-day', 'data-id', 'data-action', 'data-view'];

/**
 * Cách tìm lại một nút sau khi vùng chứa nó bị vẽ lại: id vùng + thuộc tính nhận dạng.
 * @param {Element|null} el
 * @returns {{region:string, selector:string}|null}
 */
function focusKeyOf(el) {
  if (!(el instanceof HTMLElement) || el === document.body) return null;
  const region = el.closest('[id]');
  const attr = KEY_ATTRS.find((a) => el.hasAttribute(a));
  if (!region || !attr) return null;
  return { region: region.id, selector: `${el.tagName.toLowerCase()}[${attr}="${CSS.escape(el.getAttribute(attr) ?? '')}"]` };
}

/** @param {{region:string, selector:string}|null} key */
function refocus(key) {
  if (!key) return false;
  const el = /** @type {HTMLElement|null} */ (document.getElementById(key.region)?.querySelector(key.selector) ?? null);
  el?.focus({ preventScroll: true });
  return !!el;
}

/** Thay nội dung một vùng mà không làm rơi focus bàn phím đang nằm trong nó. @param {HTMLElement} el @param {unknown} content */
function replace(el, content) {
  const active = document.activeElement;
  const key = active && el.contains(active) ? focusKeyOf(active) : null;
  el.innerHTML = String(content);
  if (key) refocus(key);
}

function renderAll() {
  renderDashboardArea();
  renderToolbar();
  renderCalendar();
  renderPanelArea(false);
}

function renderDashboardArea() {
  replace($('dashboard'), renderDashboard(state));
}

function renderToolbar() {
  $('cal-title').textContent = viewTitle(state);
  $('cal').dataset.mode = state.view;
  for (const b of document.querySelectorAll('[data-view]')) {
    const on = /** @type {HTMLElement} */ (b).dataset.view === state.view;
    b.setAttribute('aria-pressed', String(on));
  }
  replace($('filters'), html`${state.schedule.courses.map((c) => {
    const on = !state.hidden.has(c.id);
    return html`<button type="button" class="chip tone-${c.tone}" data-action="toggle-course" data-id="${c.id}" aria-pressed="${String(on)}" title="${on ? 'Ẩn' : 'Hiện'} ${c.name}">
      <span class="dot" aria-hidden="true"></span>${c.shortName}
    </button>`;
  })}`);
  const count = visibleSessions(state).length;
  $('result-count').textContent = state.query.trim() || state.hidden.size ? `${count} buổi khớp` : '';
}

/** @param {boolean} [animate] vẽ lại do người dùng thao tác (có hiệu ứng), không phải do đồng hồ */
function renderCalendar(animate = true) {
  const el = $('cal-view');
  replace(el, renderView(state));
  if (animate) {
    el.classList.remove('anim');
    void el.offsetWidth;
    el.classList.add('anim');
  }
}

/** @param {boolean} keepScroll */
function renderPanelArea(keepScroll) {
  const root = $('panel-root');
  const body = root.querySelector('.panel-body');
  const scroll = body ? body.scrollTop : 0;
  const wasOpen = root.classList.contains('is-open');
  replace(root, renderPanel(state));
  if (!state.panel) {
    root.classList.remove('is-open');
    return;
  }
  if (keepScroll) {
    const nb = root.querySelector('.panel-body');
    if (nb) nb.scrollTop = scroll;
  }
  if (!wasOpen) requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-open')));
}

function renderThemeButton() {
  const dark = document.documentElement.dataset.theme === 'dark' || (!prefs.theme && darkQuery.matches);
  const btn = $('theme-btn');
  btn.innerHTML = String(icon(dark ? 'sun' : 'moon'));
  btn.setAttribute('aria-label', dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối');
}

/* ---------- Hành động ---------- */

function persist() {
  prefs.view = state.view;
  prefs.hidden = [...state.hidden];
  prefs.showPast = state.showPast;
  savePrefs(prefs);
}

/** @param {View} view */
function setView(view) {
  if (state.view === 'month' && state.selectedDay) state.cursor = state.selectedDay;
  state.view = view;
  persist();
  renderToolbar();
  renderCalendar();
}

/** @param {number} dir */
function step(dir) {
  if (state.view === 'month') {
    state.cursor = addMonths(state.cursor, dir);
    state.selectedDay = state.cursor.slice(0, 7) === state.now.key.slice(0, 7) ? state.now.key : firstSessionDay(state.cursor);
  } else if (state.view === 'week') {
    state.cursor = addDays(state.cursor, dir * 7);
  }
  renderToolbar();
  renderCalendar();
}

/** Ngày đầu tiên có buổi học trong tháng của `key`, nếu không có thì ngày 1. @param {string} key */
function firstSessionDay(key) {
  const month = key.slice(0, 7);
  return visibleSessions(state).find((s) => s.date.startsWith(month))?.date ?? `${month}-01`;
}

function goToday() {
  state.cursor = state.now.key;
  state.selectedDay = state.now.key;
  renderToolbar();
  renderCalendar();
  if (state.view === 'agenda') {
    const target = [...document.querySelectorAll('.ag-day')].find((el) => (/** @type {HTMLElement} */ (el).dataset.date ?? '') >= state.now.key);
    target?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }
}

/** @type {{el:Element|null, key:{region:string, selector:string}|null}} */
let lastFocus = { el: null, key: null };

/** @param {string} courseId @param {string|null} sessionId */
function openPanel(courseId, sessionId) {
  const wasOpen = !!state.panel;
  if (!wasOpen) lastFocus = { el: document.activeElement, key: focusKeyOf(document.activeElement) };
  state.panel = { courseId, sessionId };
  renderPanelArea(false);
  document.documentElement.classList.add('panel-lock');
  const close = /** @type {HTMLElement|null} */ ($('panel-root').querySelector('.panel .icon-btn'));
  close?.focus({ preventScroll: true });
}

function closePanel() {
  if (!state.panel) return;
  state.panel = null;
  const root = $('panel-root');
  root.classList.remove('is-open');
  document.documentElement.classList.remove('panel-lock');
  const done = () => { if (!state.panel) root.innerHTML = ''; };
  setTimeout(done, 260);
  // Nút đã mở panel có thể đã bị vẽ lại trong lúc panel mở: tìm lại theo khoá.
  if (lastFocus.el instanceof HTMLElement && document.contains(lastFocus.el)) lastFocus.el.focus({ preventScroll: true });
  else refocus(lastFocus.key);
}

function tick() {
  state.now = now();
  renderDashboardArea();
  renderCalendar(false);
  if (state.panel) renderPanelArea(true);
}

/* ---------- Sự kiện ---------- */

function bindEvents() {
  document.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    if (!(target instanceof Element)) return;

    const sessionEl = /** @type {HTMLElement|null} */ (target.closest('[data-session]'));
    if (sessionEl) {
      const s = state.schedule.sessionById.get(sessionEl.dataset.session ?? '');
      if (s) openPanel(s.course.id, s.id);
      return;
    }
    const courseEl = /** @type {HTMLElement|null} */ (target.closest('[data-course]'));
    if (courseEl) {
      openPanel(courseEl.dataset.course ?? '', null);
      return;
    }
    const viewEl = /** @type {HTMLElement|null} */ (target.closest('button[data-view]'));
    if (viewEl) {
      setView(/** @type {View} */ (viewEl.dataset.view));
      return;
    }
    const actionEl = /** @type {HTMLElement|null} */ (target.closest('[data-action]'));
    if (actionEl) {
      handleAction(actionEl.dataset.action ?? '', actionEl);
      return;
    }
    const dayEl = /** @type {HTMLElement|null} */ (target.closest('[data-day]'));
    if (dayEl) {
      const key = dayEl.dataset.day ?? '';
      if (!state.narrow && dayEl.classList.contains('day-num')) {
        // Máy rộng: bấm số ngày để mở tuần chứa ngày đó.
        state.cursor = key;
        state.selectedDay = key;
        setView('week');
        return;
      }
      if (!state.narrow) return;
      state.selectedDay = key;
      if (key.slice(0, 7) !== state.cursor.slice(0, 7)) {
        state.cursor = key;
        renderToolbar();
      }
      renderCalendar();
    }
  });

  const search = /** @type {HTMLInputElement} */ ($('search'));
  search.addEventListener('input', () => {
    state.query = search.value;
    renderToolbar();
    renderCalendar();
  });
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && search.value) {
      e.stopPropagation();
      search.value = '';
      state.query = '';
      renderToolbar();
      renderCalendar();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (state.panel) {
      if (e.key === 'Escape') { e.preventDefault(); closePanel(); }
      else if (e.key === 'Tab') trapFocus(e);
      return;
    }
    const t = /** @type {HTMLElement} */ (e.target);
    if (t.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowLeft' && state.view !== 'agenda') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowRight' && state.view !== 'agenda') { e.preventDefault(); step(1); }
    else if (e.key === 't' || e.key === 'T') goToday();
    else if (e.key === '/') { e.preventDefault(); search.focus(); }
  });

  narrowQuery.addEventListener('change', () => {
    state.narrow = narrowQuery.matches;
    renderToolbar();
    renderCalendar();
  });
  darkQuery.addEventListener('change', renderThemeButton);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  renderThemeButton();
}

/** @param {string} action @param {HTMLElement} el */
function handleAction(action, el) {
  switch (action) {
    case 'prev': step(-1); break;
    case 'next': step(1); break;
    case 'today': goToday(); break;
    case 'close-panel': closePanel(); break;
    case 'toggle-past':
      state.showPast = !state.showPast;
      persist();
      renderCalendar();
      break;
    case 'toggle-course': {
      const id = el.dataset.id ?? '';
      if (state.hidden.has(id)) state.hidden.delete(id); else state.hidden.add(id);
      persist();
      renderToolbar();
      renderCalendar();
      break;
    }
    case 'reset-filters': {
      state.hidden.clear();
      state.query = '';
      /** @type {HTMLInputElement} */ ($('search')).value = '';
      persist();
      renderToolbar();
      renderCalendar();
      break;
    }
    case 'theme': {
      const dark = document.documentElement.dataset.theme === 'dark' || (!prefs.theme && darkQuery.matches);
      prefs.theme = dark ? 'light' : 'dark';
      document.documentElement.dataset.theme = prefs.theme;
      savePrefs(prefs);
      renderThemeButton();
      break;
    }
    default:
  }
}

/** @param {KeyboardEvent} e */
function trapFocus(e) {
  const panel = $('panel-root').querySelector('.panel');
  if (!panel) return;
  const items = /** @type {HTMLElement[]} */ ([...panel.querySelectorAll('button, a[href]')]);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  else if (!panel.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
}

start();
