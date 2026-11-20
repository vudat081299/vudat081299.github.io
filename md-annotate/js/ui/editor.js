/* Khung Edit và ô nhập của phiên: gõ / dán văn bản, trạng thái trống (dán, mở file, văn bản mẫu), thả file,
   tên phiên, phiên mới. syncInputs() đổ S vào mọi ô nhập.
   Xuất: initEditor, syncInputs.
   Dùng: core/text.js, core/session.js, ui/dom.js, ui/state.js, ui/render.js, ui/views.js. */
import { isTextFile, normNewlines, plural } from '../core/text.js';
import { isEmpty } from '../core/session.js';
import { $, toast } from './dom.js';
import { flushSave, newSession, S, saveNow, scheduleSave, switchTo } from './state.js';
import { renderAll, renderMeta } from './render.js';
import { lastRead, setView, view } from './views.js';

export function syncInputs() {
  $('src-input').value = S.text;
  $('s-name').value = S.named ? S.name : '';
  $('s-name').placeholder = S.named ? '' : (S.name || 'Session name');
  $('p-head').value = S.header;
  $('p-foot').value = S.footer;
  $('inc-doc').checked = S.includeDoc;
  $('rv-prompt').checked = !!S.rvPrompt;
  $('line-nums').checked = S.lineNums;
  $('p-path').value = S.path;
  $('path-row').hidden = $('rv-prompt-row').hidden = !S.lineNums;
  document.querySelectorAll('input[name="fmt"]').forEach(function (r) { r.checked = r.value === S.fmt; });
}
function setText(t) {
  S.text = normNewlines(t);
  $('src-input').value = S.text;
  scheduleSave(); renderAll();
}
function loadFile(file) {
  if (!file) return;
  if (!isTextFile(file.name, file.type)) {
    toast('Only text files can be opened (.md, .markdown, .txt).');
    return;
  }
  file.text().then(function (t) {
    var fresh = !isEmpty(S);
    if (fresh) { flushSave(); switchTo(newSession('')); }
    S.name = file.name.replace(/\.[^.]+$/, ''); S.named = true;
    S.path = file.name;
    setText(t); saveNow(); syncInputs();
    setView(lastRead);
    toast(fresh ? 'Opened "' + file.name + '" in a new session. The previous one is in History.' : 'Opened "' + file.name + '".');
  }, function () { toast('Could not read the file.'); });
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
    S.text = ta.value;
    scheduleSave();
    clearTimeout(renderTimer);
    if (pasteIntoEmpty && S.text.trim()) {
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
    if (S.text || view !== 'edit') return;
    var a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return;
    var t = e.clipboardData && e.clipboardData.getData('text/plain');
    if (t) { e.preventDefault(); pasteText(t); }
  });
  $('btn-clear').addEventListener('click', function () {
    if (!S.text) return;
    if (S.comments.length && !window.confirm('Clear the text? ' + plural(S.comments.length, 'comment') + ' will lose their anchors.')) return;
    setText(''); ta.focus();
  });
  $('btn-goedit').addEventListener('click', function () { setView('edit'); ta.focus(); });
  $('file-in').addEventListener('change', function (e) { loadFile(e.target.files[0]); e.target.value = ''; });

  var docEl = $('doc'), dragDepth = 0;
  docEl.addEventListener('dragenter', function (e) { if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') >= 0) { dragDepth++; docEl.classList.add('is-drop'); } });
  docEl.addEventListener('dragleave', function () { if (--dragDepth <= 0) { dragDepth = 0; docEl.classList.remove('is-drop'); } });
  docEl.addEventListener('dragover', function (e) { if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') >= 0) e.preventDefault(); });
  docEl.addEventListener('drop', function (e) {
    dragDepth = 0; docEl.classList.remove('is-drop');
    if (!e.dataTransfer || !e.dataTransfer.files.length) return;
    e.preventDefault();
    loadFile(e.dataTransfer.files[0]);
  });

  $('s-name').addEventListener('input', function (e) {
    var v = e.target.value.trim();
    S.named = !!v; S.name = v;
    scheduleSave();
  });
  $('s-name').addEventListener('blur', function () { flushSave(); });

  $('btn-new').addEventListener('click', function () {
    if (!isEmpty(S)) switchTo(newSession(''));
    setView('edit'); ta.focus();
    toast('New session. The previous one is in History.');
  });
}
