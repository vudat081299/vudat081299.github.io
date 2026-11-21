/* Panel bên phải: ba tab Comments / Prompt / Review (setPane; thân của tab là #pane-<data-pane>; Review chỉ ở file
   markdown), kéo mép trái đổi bề rộng (prefs.side), thu gọn thành thanh dọc (prefs.rail), tấm trượt #dlg-panel ở máy ≤ 1080px.
   Xuất: initPanel, setPane.
   Dùng: core/file-type.js, ui/store.js, ui/dom.js, ui/state.js, ui/views.js. */
import { paneFor } from '../core/file-type.js';
import { prefs, savePrefs } from './store.js';
import { $, dragBar, mqSide } from './dom.js';
import { openType } from './state.js';
import { longText } from './views.js';

/* pane: tab người dùng chọn gần nhất. Tab nào có ở file đang mở là luật paneFor (Review chỉ ở markdown, MDAN-081):
   tab không có thì ẩn, hiện tab paneFor trả; pane vẫn nhớ Review nên mở lại file .md thì về Review. setPane() không tên:
   vẽ lại theo file đang mở (setView gọi mỗi khi đổi file). */
var pane = 'list';
export function setPane(name) {
  var t = openType();
  if (name) pane = name;
  var cur = paneFor(t, pane);
  document.querySelectorAll('.ma-ptab').forEach(function (b) {
    var on = b.dataset.pane === cur;
    b.hidden = paneFor(t, b.dataset.pane) !== b.dataset.pane;
    b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1;
    $('pane-' + b.dataset.pane).hidden = !on;
  });
}

/* Panel: kéo mép trái đổi bề rộng (320–560), hoặc thu gọn thành thanh dọc. Lưu ở prefs.side, prefs.rail. */
var SIDE_MIN = 320, SIDE_MAX = 560;
function clampSide(w) { return Math.max(SIDE_MIN, Math.min(SIDE_MAX, Math.round(w))); }
function applySide(w) {
  w = clampSide(w);
  document.documentElement.style.setProperty('--side', w + 'px');
  return w;
}
var sideW;
function setRail(on) {
  document.documentElement.classList.toggle('ma-railed', on);
  prefs.rail = on; savePrefs();
}

export function initPanel() {
  sideW = typeof prefs.side === 'number' ? applySide(prefs.side) : 360;
  var right = function () { return $('panel').getBoundingClientRect().right; };
  dragBar($('panel-grip'), function (x) { sideW = applySide(right() - x); }, function () { prefs.side = sideW; savePrefs(); }, longText,
    function (x) { return right() - clampSide(right() - x); });
  $('panel-grip').addEventListener('keydown', function (e) {
    var d = e.key === 'ArrowLeft' ? 16 : e.key === 'ArrowRight' ? -16 : 0;
    if (!d) return;
    e.preventDefault(); sideW = applySide(sideW + d); prefs.side = sideW; savePrefs();
  });
  if (prefs.rail) document.documentElement.classList.add('ma-railed');
  $('btn-rail').addEventListener('click', function () { setRail(true); $('btn-unrail').focus(); });
  $('btn-unrail').addEventListener('click', function () { setRail(false); $('btn-rail').focus(); });
  $('rail-n').addEventListener('click', function () { setRail(false); setPane('list'); });
  document.querySelectorAll('.ma-ptab').forEach(function (b) {
    b.addEventListener('click', function () { setPane(b.dataset.pane); });
    b.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var tabs = Array.prototype.filter.call(document.querySelectorAll('.ma-ptab'), function (x) { return !x.hidden; });
      var t = tabs[(tabs.indexOf(b) + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      setPane(t.dataset.pane); t.focus();
    });
  });
  setPane('list');
  /* Máy ≤ 1080px: panel vào tấm trượt khi bấm số nhận xét trên thanh đáy, đóng thì về chỗ cũ. */
  var panelHome = $('panel').parentNode, panelNext = $('panel').nextSibling;
  $('dock-n').addEventListener('click', function () {
    $('dlg-panel').append($('panel'));
    $('dlg-panel').showModal();
  });
  $('dlg-panel').addEventListener('close', function () { panelHome.insertBefore($('panel'), panelNext); });
  $('dlg-panel').addEventListener('click', function (e) {
    if (e.target === $('dlg-panel')) $('dlg-panel').close();
  });
  mqSide.addEventListener('change', function (e) { if (e.matches && $('dlg-panel').open) $('dlg-panel').close(); });
}
