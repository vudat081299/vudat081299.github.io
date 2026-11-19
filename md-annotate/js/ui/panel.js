/* Panel bên phải: hai tab (setPane), kéo mép trái đổi bề rộng (prefs.side), thu gọn thành thanh dọc
   (prefs.rail), tấm trượt #dlg-panel ở máy ≤ 1080px.
   Xuất: initPanel, setPane.
   Dùng: ui/store.js, ui/dom.js. */
import { prefs, savePrefs } from './store.js';
import { $, dragBar } from './dom.js';

/* Panel: hai tab. */
export function setPane(name) {
  document.querySelectorAll('.ma-ptab').forEach(function (b) {
    var on = b.dataset.pane === name;
    b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1;
  });
  $('pane-list').hidden = name !== 'list';
  $('pane-prompt').hidden = name !== 'prompt';
}

/* Panel: kéo mép trái đổi bề rộng (320–560), hoặc thu gọn thành thanh dọc. Lưu ở prefs.side, prefs.rail. */
var SIDE_MIN = 320, SIDE_MAX = 560;
function applySide(w) {
  w = Math.max(SIDE_MIN, Math.min(SIDE_MAX, Math.round(w)));
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
  dragBar($('panel-grip'), function (x) { sideW = applySide($('panel').getBoundingClientRect().right - x); },
    function () { prefs.side = sideW; savePrefs(); });
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
      var t = b.dataset.pane === 'list' ? $('ptab-prompt') : $('ptab-list');
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
  window.matchMedia('(min-width: 1081px)').addEventListener('change', function (e) { if (e.matches && $('dlg-panel').open) $('dlg-panel').close(); });
}
