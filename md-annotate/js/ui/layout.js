/* Hộp Settings (#dlg-layout): bề rộng vùng làm việc, khổ và cỡ chữ Preview, Focus mode, cuộn theo nhau, làm mờ khối đã đọc
   (prefs.rvDim, độ sáng prefs.rvDimV; ô Dim reviewed của tab Review cũng gọi setLayout). Áp ngay qua biến CSS.
   layoutVal(k): tuỳ chọn Layout, chưa đặt thì lấy mặc định.
   Xuất: initLayout, layoutVal, setLayout.
   Dùng: ui/store.js, ui/dom.js, ui/views.js, ui/focus.js. */
import { prefs, savePrefs } from './store.js';
import { $ } from './dom.js';
import { refreshSplit } from './views.js';
import { refreshFocus } from './focus.js';

/* Layout: bề rộng vùng làm việc (prefs.wrap: 'auto' | 50–100 %), khổ chữ Preview (prefs.measure: 0 = hết khung |
   50–140ch), cỡ chữ Preview (prefs.mdfs: 13–22px). Đổi là áp ngay qua biến CSS. */
var LAYOUT_DEF = { wrap: 'auto', measure: 0, mdfs: 16, focus: false, dim: 30, sync: true, focusBy: 'pointer', rvDim: false, rvDimV: 40 };
export function layoutVal(k) { return prefs[k] == null ? LAYOUT_DEF[k] : prefs[k]; }
function applyLayout() {
  var root = document.documentElement.style, w = layoutVal('wrap'), m = layoutVal('measure'), fs = layoutVal('mdfs');
  if (w === 'auto') { root.removeProperty('--wrap-f'); root.removeProperty('--wrap-min'); }
  else { root.setProperty('--wrap-f', String(w / 100)); root.setProperty('--wrap-min', '720px'); }
  if (m) root.setProperty('--md-max', m + 'ch'); else root.removeProperty('--md-max');
  root.setProperty('--md-fs', fs + 'px');
  $('set-wrap').value = w === 'auto' ? 70 : w;
  $('set-wrap-o').textContent = w === 'auto' ? 'Auto (70%)' : w + '%';
  $('set-measure-on').checked = !!m;
  $('set-measure').disabled = !m;
  $('set-measure').value = m || 90;
  $('set-measure-o').textContent = m ? m + ' ch' : 'Fill pane';
  var fo = !!layoutVal('focus'), dim = layoutVal('dim');
  document.documentElement.classList.toggle('ma-focus', fo);
  root.setProperty('--dim', String(dim / 100));
  $('set-focus').checked = fo;
  $('set-dim').disabled = !fo;
  document.querySelectorAll('input[name="focusby"]').forEach(function (r) { r.checked = r.value === layoutVal('focusBy'); r.disabled = !fo; });
  refreshFocus();
  $('set-dim').value = dim;
  $('set-dim-o').textContent = fo ? dim + '% visible' : 'Off';
  var rv = !!layoutVal('rvDim'), rvv = layoutVal('rvDimV');
  document.documentElement.classList.toggle('ma-rvdim', rv);
  root.setProperty('--rv-dim', String(rvv / 100));
  $('set-rvdim').checked = $('rv-dim').checked = rv;
  $('set-rvdimv').disabled = !rv;
  $('set-rvdimv').value = rvv;
  $('set-rvdimv-o').textContent = rv ? rvv + '% visible' : 'Off';
  $('set-sync').checked = layoutVal('sync') !== false;
  $('set-fs').value = fs;
  $('set-fs-o').textContent = fs + 'px';
}
export function setLayout(k, v) { prefs[k] = v; savePrefs(); applyLayout(); refreshSplit(); }

export function initLayout() {
  applyLayout();
  $('set-wrap').addEventListener('input', function (e) { setLayout('wrap', +e.target.value); });
  $('set-measure-on').addEventListener('change', function (e) { setLayout('measure', e.target.checked ? +$('set-measure').value : 0); });
  $('set-measure').addEventListener('input', function (e) { setLayout('measure', +e.target.value); });
  $('set-fs').addEventListener('input', function (e) { setLayout('mdfs', +e.target.value); });
  $('set-focus').addEventListener('change', function (e) { setLayout('focus', e.target.checked); });
  $('set-sync').addEventListener('change', function (e) { setLayout('sync', e.target.checked); });
  document.querySelectorAll('input[name="focusby"]').forEach(function (r) {
    r.addEventListener('change', function () { if (r.checked) setLayout('focusBy', r.value); });
  });
  $('set-dim').addEventListener('input', function (e) { setLayout('dim', +e.target.value); });
  $('set-rvdim').addEventListener('change', function (e) { setLayout('rvDim', e.target.checked); });
  $('set-rvdimv').addEventListener('input', function (e) { setLayout('rvDimV', +e.target.value); });
  $('set-reset').addEventListener('click', function () {
    Object.keys(LAYOUT_DEF).forEach(function (k) { delete prefs[k]; });
    savePrefs(); applyLayout(); refreshSplit();
  });
  $('btn-layout').addEventListener('click', function () { $('dlg-layout').showModal(); });
}
