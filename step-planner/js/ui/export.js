// @ts-check
/* Xuất (#dlg-export: Markdown, JSON, sao lưu mọi dự án; tải, chép) và nhắc sao lưu (thay đổi chưa sao lưu ≥ 3 ngày).
   Xuất: renderNudge, initExport.
   Dùng: core/io.js, core/markdown.js, core/model.js, ui/design.js, ui/dialogs.js, ui/dom.js, ui/state.js, ui/toast.js. */
import { plural, slug, toBackup, toJSON } from '../core/io.js';
import { toMarkdown } from '../core/markdown.js';
import { today } from '../core/model.js';
import { mdLabels } from './design.js';
import { showDlg } from './dialogs.js';
import { $, fmtDate, h } from './dom.js';
import { cur, persist, refocus, state } from './state.js';
import { toast } from './toast.js';

const DAY = 86400000;
const BACKUP_NUDGE_DAYS = 3;

/** Nhắc sao lưu: có thay đổi chưa sao lưu từ ≥ 3 ngày. */
export function renderNudge() {
  const b = $('backup-nudge');
  const since = state.dirtySince ? Date.now() - Date.parse(state.dirtySince) : 0;
  b.hidden = !state.workspaces.length || since < BACKUP_NUDGE_DAYS * DAY;
  b.textContent = state.lastBackup
    ? `Not backed up for ${plural(Math.floor((Date.now() - Date.parse(state.lastBackup)) / DAY), 'day')}`
    : 'Never backed up';
  b.title = 'Download a JSON backup of every project';
  $('backup-when').textContent = state.lastBackup ? `Last backup: ${fmtDate(state.lastBackup.slice(0, 10))}` : 'Never backed up.';
}

/* ── Xuất và sao lưu ── */

const exportKind = () => /** @type {any} */ (document.querySelector('input[name="export-kind"]:checked')).value;
function exportText(kind = exportKind()) {
  const ws = cur();
  if (kind === 'md') return { text: toMarkdown(ws, mdLabels()), file: slug(ws.name) + '.md', type: 'text/markdown' };
  if (kind === 'json') return { text: toJSON(ws), file: slug(ws.name) + '.json', type: 'application/json' };
  return { text: toBackup(state.workspaces), file: `step-planner-backup-${today()}.json`, type: 'application/json' };
}
function download(/** @type {{text:string, file:string, type:string}} */ x) {
  const url = URL.createObjectURL(new Blob([x.text], { type: x.type + ';charset=utf-8' }));
  const a = h('a', { href: url, download: x.file });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** Đã có bản sao lưu mọi dự án: ghi mốc, tắt lời nhắc. */
function markBackup() {
  state.lastBackup = new Date().toISOString();
  state.dirtySince = '';
  persist();
  renderNudge();
}
function backupAll() {
  const x = exportText('backup');
  download(x);
  markBackup();
  return x.file;
}
function openExport() {
  $('export-text').value = exportText().text;
  $('export-status').textContent = '';
  renderNudge();
  showDlg($('dlg-export'));
}

/** Gắn sự kiện, chạy một lần lúc khởi động (main.js gọi theo thứ tự). */
export function initExport() {
  $('export-btn').addEventListener('click', openExport);
  $('backup-nudge').addEventListener('click', () => {
    const file = backupAll();
    toast('Downloaded backup ' + file);
    refocus('#export-btn');
  });
  $('backup-all').addEventListener('click', () => { $('export-status').textContent = 'Downloaded ' + backupAll(); });
  $('export-kind').addEventListener('change', () => { $('export-text').value = exportText().text; $('export-status').textContent = ''; });
  $('export-download').addEventListener('click', () => {
    const x = exportText();
    download(x);
    if (exportKind() === 'backup') markBackup();
    $('export-status').textContent = 'Downloaded ' + x.file;
  });
  $('export-copy').addEventListener('click', async () => {
    const text = exportText().text;
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch (e) {
      $('export-text').select();
      ok = !!(document.execCommand && document.execCommand('copy'));
    }
    if (ok && exportKind() === 'backup') markBackup();
    $('export-status').textContent = ok ? 'Copied.' : 'Could not copy — select the text and copy it by hand.';
  });
}
