/* Khung Edit và ô nhập của phiên: gõ / dán văn bản vào file đang mở (D), trạng thái trống (dán, mở file, văn bản mẫu),
   thả file / folder lên thẻ văn bản, tên phiên, phiên mới. syncInputs() đổ S và D vào mọi ô nhập. Mở file từ đĩa, nạp
   folder: ui/files.js (openDiskFile, importItems).
   Xuất: initEditor, syncInputs.
   Dùng: core/text.js, core/session.js, ui/dom.js, ui/state.js, ui/render.js, ui/views.js, ui/prompt.js, ui/files.js. */
import { normNewlines, plural } from '../core/text.js';
import { isEmpty } from '../core/session.js';
import { $, toast } from './dom.js';
import { D, flushSave, newSession, S, scheduleSave, switchTo } from './state.js';
import { renderAll, renderMeta } from './render.js';
import { lastRead, setView, view } from './views.js';
import { syncOptions } from './prompt.js';
import { droppedItems, importItems, openDiskFile, refreshTree } from './files.js';

export function syncInputs() {
  $('src-input').value = D.text;
  $('s-name').value = S.named ? S.name : '';
  $('s-name').placeholder = S.named ? '' : (S.name || 'Session name');
  syncOptions();
}
function setText(t) {
  D.text = normNewlines(t);
  $('src-input').value = D.text;
  scheduleSave(); renderAll();
}

var ta, pasteIntoEmpty = false, renderTimer = null;
function loadSample() {
  var t = $('sample-md').textContent.replace(/^\n/, '');
  if (!isEmpty(S)) switchTo(newSession(''));
  setText(t); setView(lastRead);
}
/* Trang trống: dán từ clipboard bằng nút, hoặc Ctrl/⌘ + V ở bất cứ đâu ngoài ô nhập. */
function pasteText(t) {
  if (!t || !t.trim()) { toast('The clipboard has no text.'); return; }
  ta.value = normNewlines(t); pasteIntoEmpty = true;
  ta.dispatchEvent(new Event('input'));
}

export function initEditor() {
  ta = $('src-input');
  ta.addEventListener('paste', function () { pasteIntoEmpty = !ta.value.trim(); });
  ta.addEventListener('input', function () {
    D.text = ta.value;
    scheduleSave();
    clearTimeout(renderTimer);
    if (pasteIntoEmpty && D.text.trim()) {
      pasteIntoEmpty = false;
      renderAll(); setView(lastRead);
      return;
    }
    renderTimer = setTimeout(renderAll, 250);
    renderMeta();
  });
  $('btn-sample').addEventListener('click', loadSample);
  $('btn-sample-2').addEventListener('click', loadSample);
  document.querySelectorAll('.js-open').forEach(function (b) { b.addEventListener('click', function () { $('file-in').click(); }); });
  $('btn-paste').addEventListener('click', function () {
    if (!navigator.clipboard || !navigator.clipboard.readText) { ta.focus(); toast('Press Ctrl/⌘ + V to paste.'); return; }
    navigator.clipboard.readText().then(pasteText, function () { ta.focus(); toast('Press Ctrl/⌘ + V to paste.'); });
  });
  document.addEventListener('paste', function (e) {
    if (D.text || view !== 'edit') return;
    var a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return;
    var t = e.clipboardData && e.clipboardData.getData('text/plain');
    if (t) { e.preventDefault(); pasteText(t); }
  });
  $('btn-clear').addEventListener('click', function () {
    if (!D.text) return;
    if (D.comments.length && !window.confirm('Clear the text? ' + plural(D.comments.length, 'comment') + ' will lose their anchors.')) return;
    setText(''); ta.focus();
  });
  $('btn-goedit').addEventListener('click', function () { setView('edit'); ta.focus(); });
  $('file-in').addEventListener('change', function (e) { if (e.target.files[0]) openDiskFile(e.target.files[0]); e.target.value = ''; });

  var docEl = $('doc'), dragDepth = 0;
  docEl.addEventListener('dragenter', function (e) { if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') >= 0) { dragDepth++; docEl.classList.add('is-drop'); } });
  docEl.addEventListener('dragleave', function () { if (--dragDepth <= 0) { dragDepth = 0; docEl.classList.remove('is-drop'); } });
  docEl.addEventListener('dragover', function (e) { if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') >= 0) e.preventDefault(); });
  docEl.addEventListener('drop', function (e) {
    dragDepth = 0; docEl.classList.remove('is-drop');
    if (!e.dataTransfer || !e.dataTransfer.files.length) return;
    e.preventDefault();
    /* Một file: mở (MDAN-024). Folder hay nhiều file: nạp vào folder của file đang mở (MDAN-022). */
    var items = droppedItems(e.dataTransfer);
    if (items.length === 1 && !items[0].isDirectory) openDiskFile(e.dataTransfer.files[0]);
    else importItems(items, 'beside');
  });

  $('s-name').addEventListener('input', function (e) {
    var v = e.target.value.trim();
    S.named = !!v; S.name = v;
    scheduleSave(); refreshTree();
  });
  $('s-name').addEventListener('blur', function () { flushSave(); });

  $('btn-new').addEventListener('click', function () {
    if (!isEmpty(S)) switchTo(newSession(''));
    setView('edit'); ta.focus();
    toast('New session. The previous one is in History.');
  });
}
