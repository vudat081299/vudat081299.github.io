/* Panel Prompt: hiện prompt, chép (⌘/Ctrl + Shift + C ở main.js), tải .md, tuỳ chọn trong Options (kiểu, mọi file,
   số dòng, folder, dòng đã đọc, toàn văn, lời dẫn). Dựng chữ prompt ở core/prompt.js: file đang mở (buildPrompt) hoặc mọi
   file khi bật All files (promptsAll → buildPromptAll; file không mở neo qua render.js anchorsOf, dấu đã đọc qua
   review.js reviewDocOf). Dải dòng đã đọc của file đang mở từ ui/review.js.
   Xuất: copyPrompt, initPrompt, locText, renderPrompt, syncOptions.
   Dùng: core/text.js, core/comments.js, core/prompt.js, core/tree.js, ui/store.js, ui/dom.js,
     ui/state.js, ui/render.js, ui/review.js. */
import { plural } from '../core/text.js';
import { anchorAll } from '../core/comments.js';
import { allFilesOffered, buildPrompt, buildPromptAll, exportName, included, locLabel, optionsSummary, promptsAll, promptSize } from '../core/prompt.js';
import { filesInOrder } from '../core/tree.js';
import { prefs, savePrefs } from './store.js';
import { $, h, saveFile, toast } from './dom.js';
import { D, S, scheduleSave } from './state.js';
import { anchors, anchorsOf, mdText, ordered, orphans } from './render.js';
import { reviewDoc, reviewDocOf } from './review.js';

/* Kết quả neo của lần vẽ gần nhất (render.js): đủ cho panel, vì renderAll() vẽ lại prompt ngay sau khi neo. */
function doc() { return { ordered: ordered, orphans: orphans, anchors: anchors, review: reviewDoc() }; }
/* Chép / tải: neo lại theo D.text lúc này. Gõ ở Edit đổi D.text ngay nhưng chỉ vẽ lại sau 250ms (ui/editor.js), nên
   kết quả neo của lần vẽ trước có thể thuộc văn bản cũ: số dòng lệch. */
function freshDoc() { var d = anchorAll(D.comments, D.text, mdText); d.review = reviewDoc(); return d; }
/* Prompt hiện tại: { p, n } (n: số nhận xét vào prompt). All files: mọi file theo thứ tự cây, file đang mở dùng d. */
function current(d) {
  if (!promptsAll(S)) return { p: buildPrompt(S, D, d), n: included(d).length };
  var n = 0, files = filesInOrder(S.nodes).map(function (id) {
    var doc = S.docs[id], r = id === S.open ? d : anchorsOf(doc);
    if (id !== S.open) r.review = reviewDocOf(doc);
    n += included(r).length;
    return { fileId: id, doc: doc, d: r };
  });
  return { p: buildPromptAll(S, files), n: n };
}
/* Nhãn vị trí của nhận xét c cho danh sách (L12). */
export function locText(c) { return locLabel(D, doc(), c, ''); }
export function renderPrompt() {
  var r = current(doc());
  $('out').textContent = r.p;
  $('out-n').textContent = promptSize(r.p);
  $('foot-n').textContent = r.n ? plural(r.n, 'comment') : 'No comments yet';
  ['btn-copy', 'btn-export', 'dock-copy', 'rail-copy', 'rail-export'].forEach(function (id) { $(id).disabled = !r.p; });
  $('opts-sum').textContent = optionsSummary(S);
  $('all-row').hidden = !allFilesOffered(S);
}
/* Đổ tuỳ chọn của S vào các ô của Options. */
export function syncOptions() {
  $('p-head').value = S.header;
  $('p-foot').value = S.footer;
  $('inc-doc').checked = S.includeDoc;
  $('rv-prompt').checked = !!S.rvPrompt;
  $('line-nums').checked = S.lineNums;
  $('p-all').checked = S.promptAll;
  $('p-path').value = S.path;
  $('path-row').hidden = $('rv-prompt-row').hidden = !S.lineNums;
  $('all-row').hidden = !allFilesOffered(S);
  document.querySelectorAll('input[name="fmt"]').forEach(function (r) { r.checked = r.value === S.fmt; });
}
function legacyCopy(t) {
  var ta = h('textarea', { style: 'position:fixed;top:0;left:0;opacity:0;font-size:16px', readonly: true });   // 16px: Safari iOS không phóng to
  ta.value = t; document.body.append(ta); ta.select();
  var ok = false;
  try { ok = document.execCommand('copy'); } catch (e) {}
  ta.remove();
  return ok;
}
export function copyPrompt() {
  var r = current(freshDoc()), p = r.p;
  if (!p) { toast('Nothing to copy yet: select a passage and add a comment first.'); return; }
  var done = function (ok) {
    if (!ok) { toast('The browser blocked copying. Open the Prompt tab, select the prompt and copy it by hand.'); return; }
    morphCopy();
    $('sr-live').textContent = 'Prompt copied: ' + plural(r.n, 'comment') + ', ' + p.length + ' characters.';
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(p).then(function () { done(true); }, function () { done(legacyCopy(p)); });
  } else done(legacyCopy(p));
}
/* Sau khi chép: nút đổi thành "Đã chép ✓" một lúc. */
var morphTimer = null;
function morphCopy() {
  var btns = document.querySelectorAll('.ma-copy');
  btns.forEach(function (b) { b.classList.add('is-done'); b.querySelector('.ma-copy__lbl').textContent = 'Copied ✓'; });
  clearTimeout(morphTimer);
  morphTimer = setTimeout(function () {
    btns.forEach(function (b) { b.classList.remove('is-done'); b.querySelector('.ma-copy__lbl').textContent = 'Copy prompt'; });
  }, 1600);
}
function exportMd() {
  var p = current(freshDoc()).p;
  if (p) saveFile(new Blob([p + '\n'], { type: 'text/markdown;charset=utf-8' }), exportName(S));
}

export function initPrompt() {
  $('p-head').addEventListener('input', function (e) { S.header = e.target.value; prefs.header = S.header; savePrefs(); scheduleSave(); renderPrompt(); });
  $('p-foot').addEventListener('input', function (e) { S.footer = e.target.value; prefs.footer = S.footer; savePrefs(); scheduleSave(); renderPrompt(); });
  $('btn-headtpl').addEventListener('click', function () {
    var tpl = $('btn-headtpl').dataset.tpl;
    if (S.header.trim() && S.header.trim() !== tpl && !window.confirm('Replace the current header with the template?')) return;
    $('p-head').value = tpl;
    $('p-head').dispatchEvent(new Event('input'));
  });
  $('inc-doc').addEventListener('change', function (e) { S.includeDoc = e.target.checked; scheduleSave(); renderPrompt(); });
  $('rv-prompt').addEventListener('change', function (e) { S.rvPrompt = e.target.checked; scheduleSave(); renderPrompt(); });
  $('p-all').addEventListener('change', function (e) { S.promptAll = e.target.checked; scheduleSave(); renderPrompt(); });
  $('line-nums').addEventListener('change', function (e) {
    S.lineNums = e.target.checked; $('path-row').hidden = $('rv-prompt-row').hidden = !S.lineNums;
    scheduleSave(); renderPrompt();
  });
  $('p-path').addEventListener('input', function (e) { S.path = e.target.value.trim(); scheduleSave(); renderPrompt(); });
  document.querySelectorAll('input[name="fmt"]').forEach(function (r) {
    r.addEventListener('change', function () { S.fmt = r.value; prefs.fmt = r.value; savePrefs(); scheduleSave(); renderPrompt(); });
  });
  $('btn-copy').addEventListener('click', copyPrompt);
  $('dock-copy').addEventListener('click', copyPrompt);
  $('btn-export').addEventListener('click', exportMd);
  $('rail-copy').addEventListener('click', copyPrompt);
  $('rail-export').addEventListener('click', exportMd);
}
