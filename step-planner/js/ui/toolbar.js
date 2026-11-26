// @ts-check
/* Thanh công cụ và thanh trên: tắt mẹo, Compact, nút tới System design và nhật ký, ghi chú dự án (#dlg-notes), nút theme
   (REPO-024: theo hệ điều hành tới khi người dùng bấm).
   Xuất: paintThemeBtn, initToolbar.
   Dùng: core/model.js, ui/dialogs.js, ui/dom.js, ui/render.js, ui/state.js, ui/store.js. */
import * as S from './store.js';
import { multiLine } from '../core/model.js';
import { closeSaved, openDlg } from './dialogs.js';
import { $, field } from './dom.js';
import { render } from './render.js';
import { commit, cur, refocus } from './state.js';

/* ── Theme (REPO-024): theo hệ điều hành tới khi người dùng bấm ── */

const darkMq = matchMedia('(prefers-color-scheme: dark)');
const effectiveTheme = () => document.documentElement.dataset.theme || (darkMq.matches ? 'dark' : 'light');
export function paintThemeBtn() {
  $('theme-btn').setAttribute('aria-label', effectiveTheme() === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme');
}

/** Gắn sự kiện, chạy một lần lúc khởi động (main.js gọi theo thứ tự). */
export function initToolbar() {
  /* ── Mẹo cho người mới: tắt một lần, nhớ ở máy này ── */

  $('hint-off').addEventListener('click', () => {
    S.hideHint();
    $('hint').hidden = true;
    refocus('#q');
  });

  /* ── Chế độ Gọn (ẩn "Xong khi" và ghi chú trên bảng) và nút tới nhật ký ── */

  $('compact-btn').addEventListener('click', () => {
    S.setCompact(!S.compactOn());
    render();
  });
  $('sd-btn').addEventListener('click', () => {
    const sd = $('sd');
    sd.scrollIntoView({ block: 'start' });
    sd.focus({ preventScroll: true });
  });
  $('log-btn').addEventListener('click', () => {
    const log = $('log');
    log.scrollIntoView({ block: 'start' });
    log.focus({ preventScroll: true });
  });

  /* ── Ghi chú dự án ── */

  $('ws-notes-edit').addEventListener('click', () => {
    const ws = cur();
    if (!ws) return;
    field($('notes-form'), 'notes').value = ws.notes;
    openDlg($('dlg-notes'), field($('notes-form'), 'notes'));
  });
  $('notes-form').addEventListener('submit', (/** @type {any} */ e) => {
    e.preventDefault();
    const ws = cur();
    closeSaved($('dlg-notes'));
    if (!ws) return;
    ws.notes = multiLine(field($('notes-form'), 'notes').value);
    commit('#ws-notes-edit');
  });

  $('theme-btn').addEventListener('click', () => {
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    S.saveTheme(next);
    paintThemeBtn();
  });
  darkMq.addEventListener('change', paintThemeBtn);
}
