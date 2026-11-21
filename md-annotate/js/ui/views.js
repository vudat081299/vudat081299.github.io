/* Chế độ xem: Edit / Source / Preview / Split (setView); Preview và Split chỉ ở file markdown (viewFor, MDAN-067); file
   khác chỉ có tab Source, Edit là nút bật / tắt #btn-edit (MDAN-074). Split chỉ khi đủ chỗ (splitOK); chiều cao hai khung
   (sizePanes, html.ma-fit), vách giữa (prefs.split), nút Syntax colors.
   longText(): kéo vách / mép cây / mép panel có dàn lại ngay không (dragBar).
   Xuất: initViews, isSplit, lastRead, longText, refreshSplit, setView, sizePanes, view.
   Dùng: core/panes.js, core/file-type.js, core/runs.js, ui/store.js, ui/dom.js, ui/state.js, ui/render.js, ui/popup.js, ui/picks.js. */
import { paneHeight, splitFits } from '../core/panes.js';
import { viewFor } from '../core/file-type.js';
import { lineCount } from '../core/runs.js';
import { prefs, savePrefs } from './store.js';
import { $, dragBar, mqSide, shown } from './dom.js';
import { D, openType } from './state.js';
import { renderAll, renderMeta } from './render.js';
import { closePop, pop } from './popup.js';
import { clearPicks, repaintPicks } from './picks.js';

/* Split chỉ khi mỗi khung được ≥ 420px. Muốn Split mà chưa đủ chỗ (kể cả vì cột cây) thì hiện Preview, prefs.view vẫn nhớ
   'split'; ẩn cây hay kéo hẹp cây thì Split về. */
function splitOK() { return splitFits($('doc').clientWidth); }
/* Nút Split hiện khi file có Preview và đủ chỗ. */
function splitShown() { return openType().md && splitOK(); }
/* view: chế độ đang hiện; lastRead: chế độ đọc người dùng chọn ở file markdown (prefs.read), không phải chế độ đang
   hiện: Split lùi về Preview vì thiếu chỗ, hay Edit / Source ở file code, vẫn nhớ Split. */
export var view = prefs.view || 'view';
export var lastRead = prefs.read || (view === 'edit' ? 'view' : view);
export function setView(v) {
  var want = v, t = openType();
  v = viewFor(t, v);
  if (v === 'split' && !splitOK()) v = 'view';
  view = v;
  /* Chế độ đọc chỉ nhớ ở file có đủ chế độ: Source ở file code không ghi đè Preview / Split đã chọn cho markdown. */
  if (want !== 'edit' && t.md) lastRead = want;
  prefs.view = want === 'edit' ? want : lastRead; prefs.read = lastRead; savePrefs();
  /* File không phải markdown: tab Source luôn chọn, Edit bật trong nó (nút nhấn #btn-edit). */
  var tab = t.md ? v : 'src';
  document.querySelectorAll('.ma-tab').forEach(function (b) {
    b.setAttribute('aria-selected', String(b.dataset.view === tab));
    b.tabIndex = b.dataset.view === tab ? 0 : -1;
  });
  $('tab-edit').hidden = !t.md;
  $('btn-edit').hidden = t.md;
  $('btn-edit').setAttribute('aria-pressed', String(v === 'edit'));
  $('pane-edit').hidden = v !== 'edit';
  $('views').dataset.mode = v;
  $('wrap-src').hidden = !(v === 'src' || v === 'split');
  $('syn').checked = prefs.syntax !== false;
  $('wrap-md').hidden = !(v === 'view' || v === 'split');
  $('tab-view').hidden = !t.md;
  $('tab-split').hidden = !splitShown();
  $('divider').hidden = v !== 'split';
  renderMeta(); // gọi sizePanes(): bật / tắt khoá cuộn trang (ma-fit) theo chế độ
  if (v !== 'edit' && pop.mode) closePop(true);
  /* Chọn dòng chỉ có ở nơi có lề số dòng (Source, Split): sang Edit / Preview thì thoát. */
  if (v === 'edit' || v === 'view') clearPicks(); else repaintPicks();
}
export function isSplit() { return $('views').dataset.mode === 'split'; }
/* Bề rộng thay đổi (cửa sổ, panel, thu gọn): xem lại Split và chiều cao hai khung.
   Muốn Split: hết chỗ thì lùi về Preview, đủ chỗ lại thì về Split (setView quyết). */
export function refreshSplit() {
  $('tab-split').hidden = !splitShown();
  if (view !== 'edit' && prefs.view === 'split' && (view === 'split') !== splitShown()) setView('split');
  else sizePanes();
}
export function sizePanes() {
  var v = $('views'), de = document.documentElement;
  if (!isSplit() || v.hidden) { de.classList.remove('ma-fit'); return; }
  var top = v.getBoundingClientRect().top + window.scrollY;
  var ph = paneHeight(window.innerHeight, top, mqSide.matches ? 0 : $('dock').offsetHeight);
  v.style.setProperty('--pane-h', ph.h + 'px');
  if (ph.fit && !de.classList.contains('ma-fit')) window.scrollTo(0, 0);
  de.classList.toggle('ma-fit', ph.fit);
}
/* Văn bản dài hơn LIVE_MAX dòng: kéo vách, mép cây, mép panel chỉ dời vạch, thả ra mới dàn lại (dragBar); 2.000 dòng đã
   mất ~70 ms mỗi bước kéo, 10.000 dòng ~0,5 s. */
var LIVE_MAX = 1500;
export function longText() { return lineCount(D.text) > LIVE_MAX; }
var rafSplit = 0;
/* Vách giữa hai khung: kéo hoặc phím mũi tên; tỉ lệ (0,25–0,75) lưu ở prefs.split. */
function clampSplit(r) { return Math.max(0.25, Math.min(0.75, r)); }
function applySplit(r) {
  r = clampSplit(r);
  $('views').style.setProperty('--ra', r + 'fr'); $('views').style.setProperty('--rb', (1 - r) + 'fr');
  $('divider').setAttribute('aria-valuenow', String(Math.round(r * 100)));
  return r;
}
var splitR;
/* Nút Edit của file không phải markdown: Edit ↔ Source. */
function toggleEdit() { setView(view === 'edit' ? 'src' : 'edit'); }

export function initViews() {
  document.querySelectorAll('.ma-tab').forEach(function (b) {
    b.addEventListener('click', function () { setView(b.dataset.view); });
    b.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var tabs = Array.prototype.filter.call(document.querySelectorAll('.ma-tab'), shown);
      if (tabs.length === 1) { toggleEdit(); return; }   // file không phải markdown: mũi tên bật / tắt Edit như trước
      var i = tabs.indexOf(b) + (e.key === 'ArrowRight' ? 1 : -1);
      var t = tabs[(i + tabs.length) % tabs.length];
      setView(t.dataset.view); t.focus();
    });
  });
  $('btn-edit').addEventListener('click', toggleEdit);
  if (window.ResizeObserver) new ResizeObserver(function () {
    cancelAnimationFrame(rafSplit); rafSplit = requestAnimationFrame(refreshSplit);
  }).observe($('doc'));
  var later = function () { cancelAnimationFrame(rafSplit); rafSplit = requestAnimationFrame(refreshSplit); };
  window.addEventListener('resize', later);
  /* #doc đổi bề rộng mà cửa sổ không đổi (ẩn / hiện cột cây, kéo mép cây, thanh dọc): xét lại Split. */
  if (window.ResizeObserver) new ResizeObserver(later).observe($('doc'));

  splitR = applySplit(typeof prefs.split === 'number' ? prefs.split : 0.5);
  dragBar($('divider'), function (x) {
    var r = $('views').getBoundingClientRect();
    splitR = applySplit((x - r.left) / r.width);
  }, function () { prefs.split = splitR; savePrefs(); }, longText, function (x) {
    var r = $('views').getBoundingClientRect();
    return r.left + r.width * clampSplit((x - r.left) / r.width);
  });
  $('divider').addEventListener('keydown', function (e) {
    var d = e.key === 'ArrowLeft' ? -0.02 : e.key === 'ArrowRight' ? 0.02 : 0;
    if (!d) return;
    e.preventDefault(); splitR = applySplit(splitR + d); prefs.split = splitR; savePrefs();
  });
  $('syn').addEventListener('change', function (e) { prefs.syntax = e.target.checked; savePrefs(); renderAll(); });
}
