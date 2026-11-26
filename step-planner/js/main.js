// @ts-check
/* Điểm vào của Data Science Step Planner: gọi init… của từng module đúng thứ tự, rồi khởi động (nạp mẫu, chọn dự án, vẽ).
   Thứ tự gọi là thứ tự đăng ký sự kiện; hai module nghe cùng phần tử thì đừng đảo:
   - initDropdown trước hết: pointerdown, scroll, focusin của document và resize của window đóng danh sách đang mở trước
     mọi việc khác của cùng sự kiện;
   - initState trước mọi init còn lại: đọc bộ nhớ (state) trước khi có gì đọc nó;
   - initToast trước initMove: keydown của document (Ctrl/Cmd + Z hoàn tác trước, Esc huỷ kéo của drag.js sau);
   - initClamp trước initLog: resize của window (đo chữ bị cắt của bảng trước, của nhật ký sau);
   - initClamp trước initActions trước initMove: sự kiện của #board (scroll, toggle; click, keydown; pointer…);
   - initDialogs trước initSubDialog, initStepDialog, initFilter: enhanceSelect nghe `change` của mọi <select> trước;
   - initDialogs trước initDocs: hộp #dlg-sub, #dlg-step (cancel trước, close của phần Tài liệu sau).
   Xuất: không (chạy khi nạp).
   Dùng: ui/dropdown.js, ui/state.js, ui/toast.js, ui/board.js, ui/clamp.js, ui/log.js, ui/dialogs.js, ui/start.js, ui/projects.js,
     ui/toolbar.js, ui/actions.js, ui/sub-dialog.js, ui/step-dialog.js, ui/docs.js, ui/md-dialog.js, ui/revisit.js,
     ui/filter.js, ui/export.js, ui/import.js, ui/move.js, ui/design.js, ui/hand.js, ui/render.js. */
import { initDropdown } from './ui/dropdown.js';
import { initState, loadData } from './ui/state.js';
import { initToast } from './ui/toast.js';
import { initBoard } from './ui/board.js';
import { initClamp } from './ui/clamp.js';
import { initLog } from './ui/log.js';
import { initDialogs } from './ui/dialogs.js';
import { initStart } from './ui/start.js';
import { initProjects } from './ui/projects.js';
import { initToolbar, paintThemeBtn } from './ui/toolbar.js';
import { initActions } from './ui/actions.js';
import { initSubDialog } from './ui/sub-dialog.js';
import { initStepDialog } from './ui/step-dialog.js';
import { initDocs } from './ui/docs.js';
import { initMdDialog } from './ui/md-dialog.js';
import { initRevisit } from './ui/revisit.js';
import { initFilter } from './ui/filter.js';
import { initExport } from './ui/export.js';
import { initImport } from './ui/import.js';
import { initMove } from './ui/move.js';
import { initDesign } from './ui/design.js';
import { initHand } from './ui/hand.js';
import { render } from './ui/render.js';

/* ── Khởi động ── */

async function boot() {
  paintThemeBtn();
  await loadData();
  render();
}

initDropdown();
initState();
initToast();
initBoard();
initClamp();
initLog();
initDialogs();
initStart();
initProjects();
initToolbar();
initActions();
initSubDialog();
initStepDialog();
initDocs();
initMdDialog();
initRevisit();
initFilter();
initExport();
initImport();
initMove();
initDesign();
initHand();
boot();
