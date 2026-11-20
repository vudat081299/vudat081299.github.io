/* Chế độ xem: Edit / Source / Preview / Split (setView), Split chỉ khi đủ chỗ (splitOK), chiều cao hai khung
   (sizePanes, html.ma-fit), vách giữa (prefs.split), nút Syntax colors.
   Xuất: initViews, isSplit, lastRead, refreshSplit, setView, sizePanes, view.
   Dùng: core/panes.js, ui/store.js, ui/dom.js, ui/render.js, ui/popup.js, ui/picks.js, ui/tree.js. */
import { paneHeight, splitFits } from '../core/panes.js';
import { prefs, savePrefs } from './store.js';
import { $, dragBar, mqSide, shown } from './dom.js';
import { renderAll, renderMeta } from './render.js';
import { closePop, pop } from './popup.js';
import { clearPicks, repaintPicks } from './picks.js';

/* Split chỉ khi mỗi khung được ≥ 420px. Muốn Split mà chưa đủ chỗ (kể cả vì cột cây) thì hiện Preview, prefs.view vẫn nhớ
   'split'; ẩn cây hay kéo hẹp cây thì Split về. */
function splitOK() { return splitFits($('doc').clientWidth); }
export var view = prefs.view || 'view';
export var lastRead = view === 'edit' ? 'view' : view;
export function setView(v) {
  var want = v;
  if (v === 'split' && !splitOK()) v = 'view';
  view = v;
  if (want !== 'edit') lastRead = want;
  prefs.view = want; savePrefs();
  document.querySelectorAll('.ma-tab').forEach(function (b) {
    b.setAttribute('aria-selected', String(b.dataset.view === v));
    b.tabIndex = b.dataset.view === v ? 0 : -1;
  });
  $('pane-edit').hidden = v !== 'edit';
  $('views').dataset.mode = v;
  $('wrap-src').hidden = !(v === 'src' || v === 'split');
  $('syn').checked = prefs.syntax !== false;
  $('wrap-md').hidden = !(v === 'view' || v === 'split');
  $('tab-split').hidden = !splitOK();
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
  $('tab-split').hidden = !splitOK();
  if (view !== 'edit' && prefs.view === 'split' && (view === 'split') !== splitOK()) setView('split');
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
var rafSplit = 0;
/* Vách giữa hai khung: kéo hoặc phím mũi tên; tỉ lệ lưu ở prefs.split. */
function applySplit(r) {
  r = Math.max(0.25, Math.min(0.75, r));
  $('views').style.setProperty('--ra', r + 'fr'); $('views').style.setProperty('--rb', (1 - r) + 'fr');
  $('divider').setAttribute('aria-valuenow', String(Math.round(r * 100)));
  return r;
}
var splitR;

export function initViews() {
  document.querySelectorAll('.ma-tab').forEach(function (b) {
    b.addEventListener('click', function () { setView(b.dataset.view); });
    b.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var tabs = Array.prototype.filter.call(document.querySelectorAll('.ma-tab'), shown);
      var i = tabs.indexOf(b) + (e.key === 'ArrowRight' ? 1 : -1);
      var t = tabs[(i + tabs.length) % tabs.length];
      setView(t.dataset.view); t.focus();
    });
  });
  if (window.ResizeObserver) new ResizeObserver(function () {
    cancelAnimationFrame(rafSplit); rafSplit = requestAnimationFrame(refreshSplit);
  }).observe($('doc'));
  window.addEventListener('resize', function () { cancelAnimationFrame(rafSplit); rafSplit = requestAnimationFrame(refreshSplit); });

  splitR = applySplit(typeof prefs.split === 'number' ? prefs.split : 0.5);
  dragBar($('divider'), function (x) {
    var r = $('views').getBoundingClientRect();
    splitR = applySplit((x - r.left) / r.width);
  }, function () { prefs.split = splitR; savePrefs(); });
  $('divider').addEventListener('keydown', function (e) {
    var d = e.key === 'ArrowLeft' ? -0.02 : e.key === 'ArrowRight' ? 0.02 : 0;
    if (!d) return;
    e.preventDefault(); splitR = applySplit(splitR + d); prefs.split = splitR; savePrefs();
  });
  $('syn').addEventListener('change', function (e) { prefs.syntax = e.target.checked; savePrefs(); renderAll(); });
}
