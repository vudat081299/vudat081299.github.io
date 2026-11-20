/* Điểm vào: gọi init… của từng module đúng thứ tự cũ, rồi khởi động. Chỉ giữ ở đây việc dùng chung cả trang:
   phím tắt chép prompt, đóng hộp thoại (và màu thanh trình duyệt theo lớp mờ, syncBar), nút theme, bàn phím ảo (trackKeyboard).
   Thứ tự quan trọng (hai module nghe cùng phần tử):
   - initSyncScroll trước initFocus: cuộn #wrap-src / #wrap-md (sync bỏ syncExpect cũ của khung người dùng cuộn trước
     khi focus hỏi setByPage);
   - initViews trước initFocus trước initPopup: resize của window (chiều cao khung trước, dải đọc sau);
   - initShortcuts trước initPopup: keydown của document;
   - initPopup trước initSelection: pointerdown của document;
   - initPopup trước initPicks: keydown của document (Esc đóng hộp trước, rồi bỏ các dòng đã chọn);
   - initPanel trước initDialogs: close của #dlg-panel (panel về chỗ cũ trước khi trả toast);
   - initSyncScroll trước initReview: cuộn #wrap-* (như initFocus, đọc setByPage).
   Xuất: không (chạy khi nạp).
   Dùng: ui/store.js, ui/dom.js, ui/state.js, ui/hints.js, ui/render.js, ui/list.js, ui/prompt.js, ui/views.js,
     ui/sync-scroll.js, ui/panel.js, ui/layout.js, ui/help.js, ui/focus.js, ui/popup.js, ui/selection.js, ui/picks.js,
     ui/history.js, ui/editor.js, ui/review.js, ui/review-panel.js, ui/minimap.js, ui/dwell.js, ui/tree.js, ui/bar.js.
   ui/files.js (cây của phiên) không có init: renderAll() vẽ cây lần đầu. */
import { KEY, store } from './ui/store.js';
import { $, syncBar, trackKeyboard } from './ui/dom.js';
import { D, initState, S } from './ui/state.js';
import { initHints, loadDefaultHints, renderHintsDlg } from './ui/hints.js';
import { checkRenderer, renderAll } from './ui/render.js';
import { initList } from './ui/list.js';
import { copyPrompt, initPrompt } from './ui/prompt.js';
import { initViews, setView, view } from './ui/views.js';
import { initSyncScroll } from './ui/sync-scroll.js';
import { initPanel } from './ui/panel.js';
import { initTree } from './ui/tree.js';
import { initBar } from './ui/bar.js';
import { initLayout } from './ui/layout.js';
import { initHelp } from './ui/help.js';
import { initFocus } from './ui/focus.js';
import { initPopup, pop, renderPopHints } from './ui/popup.js';
import { initSelection } from './ui/selection.js';
import { initPicks } from './ui/picks.js';
import { initHistory, renderHistCount } from './ui/history.js';
import { initEditor, syncInputs } from './ui/editor.js';
import { initReview } from './ui/review.js';
import { initReviewPanel } from './ui/review-panel.js';
import { initMinimap } from './ui/minimap.js';
import { initDwell } from './ui/dwell.js';

function initShortcuts() {
  /* ⌘/Ctrl + Shift + C chép prompt, ở đâu cũng được. */
  var isMac = /Mac|iPhone|iPad/.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.userAgent);
  document.querySelectorAll('.js-copy-kbd').forEach(function (k) { k.textContent = isMac ? '⌘⇧C' : 'Ctrl⇧C'; });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && e.code === 'KeyC') { e.preventDefault(); copyPrompt(); }
  });
}
function initDialogs() {
  document.querySelectorAll('[data-close]').forEach(function (b) {
    b.addEventListener('click', function () { var d = b.closest('dialog'); if (d) d.close(); });
  });
  document.querySelectorAll('dialog').forEach(function (d) {
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    d.addEventListener('close', function () { if (d.contains($('toast'))) document.body.append($('toast')); });
    /* Mở / đóng (thuộc tính open, mọi đường: showModal, close, Esc): màu thanh trình duyệt theo lớp mờ. */
    new MutationObserver(syncBar).observe(d, { attributes: true, attributeFilter: ['open'] });
  });
}
/* html.ma-tabbing: vòng focus chỉ hiện từ lần bấm Tab đầu (css/base.css); bấm chuột / chạm thì tắt. Focus do script đặt
   (hộp thoại tự focus nút đầu, trả focus khi đóng) không có vòng. */
function initKbdRing() {
  var root = document.documentElement;
  window.addEventListener('keydown', function (e) { if (e.key === 'Tab') root.classList.add('ma-tabbing'); }, true);
  window.addEventListener('pointerdown', function () { root.classList.remove('ma-tabbing'); }, true);
}
function initTheme() {
  $('theme').addEventListener('click', function () {
    var dark = document.documentElement.classList.toggle('dark');
    try { localStorage.setItem('hub-theme', dark ? 'dark' : 'light'); } catch (e) {}
    syncBar();
  });
}

initViews();
initSyncScroll();
initPanel();
initTree();
initLayout();
initHelp();
initFocus();
initEditor();
initPrompt();
initHistory();
initHints();
initList();
initShortcuts();
initDialogs();
initKbdRing();
initTheme();
trackKeyboard();
initBar();
initPopup();
initSelection();
initPicks();
initReview();
initReviewPanel();
initMinimap();
initDwell();
initState();

/* KHỞI ĐỘNG */
checkRenderer();
syncInputs();
renderAll();
setView(D.text ? view : 'edit');
renderHistCount();
store.set(KEY.cur, S.id);

loadDefaultHints()
  .then(function () {
    if (pop.mode) renderPopHints();
    if ($('dlg-hints').open) renderHintsDlg();
  });
