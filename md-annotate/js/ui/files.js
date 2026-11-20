/* Cây file của phiên (MDAN-022…025): nơi duy nhất đổi cây. setTree(next, undoMsg, opts) thay S bằng phiên next do core
   dựng (state.js putSession, có thể bị chặn khi hộp nhận xét có chữ), lưu, vẽ prompt và cây; chỉ gập / mở folder thì
   hẹn lưu, không vẽ lại prompt. Undo của xoá / chuyển: core applyUndo trên phiên hiện tại (MDAN-028), kể cả khi đã
   chuyển phiên (state.js sessionFor). Mọi việc của cây (actions của ui/tree.js renderTree) ở đây và chỉ gọi core rồi
   setTree: tên, trùng tên, file kế bên, bất biến, tên tải về là việc của core. refreshTree(): vẽ cây từ S (bỏ qua khi
   mô hình không đổi).
   Mở file từ đĩa (openDiskFile, MDAN-024), nạp folder (importItems, MDAN-022): luật file chữ ở core/text.js (isTextFile,
   hasNul, skipEntry, importCheck); đọc xong mà đã chuyển phiên thì ghi vào phiên đã lưu, phiên ấy mất thì bỏ và báo.
   Bộ nhớ đầy thì hoàn lại. Nạp xong thì cây hiện cho phiên ấy, không ghi prefs.tree (MDAN-032).
   Xuất: importItems, openDiskFile, refreshTree, setTree.
   Dùng: core/session.js, core/text.js, ui/dom.js, ui/state.js, ui/prompt.js, ui/views.js, ui/tree.js. */
import { addDir, addFile, applyUndo, collapseAll, dirOf, docOf, downloadOf, importPaths, moveIn, openFile, openFromDisk,
  removeNodes, renameIn, sessionTitle, toggleDir, UNTITLED, zipOf } from '../core/session.js';
import { hasNul, importCheck, isTextFile, normNewlines, plural, skipEntry } from '../core/text.js';
import { saveFile, toast } from './dom.js';
import { canLeave, loadSession, openFileId, putSession, S, saveClosed, saveNow, scheduleSave, sessionFor } from './state.js';
import { renderPrompt } from './prompt.js';
import { lastRead, setView } from './views.js';
import { editName, focusRow, renderTree, revealTree } from './tree.js';

/* VẼ CÂY. last: mô hình vừa vẽ (mảng của S so theo tham chiếu, số đếm và tiêu đề theo chữ). */
var last = null;
export function refreshTree() {
  var counts = {};
  S.nodes.forEach(function (n) {
    var d = n.kind === 'file' && S.docs[n.id];
    if (d) counts[n.id] = { c: d.comments.length, rv: Number.isFinite(d.rvPct) ? d.rvPct : null };
  });
  var m = { sid: S.id, nodes: S.nodes, open: S.open, collapsed: S.collapsed, counts: counts, title: sessionTitle(S) };
  var key = JSON.stringify([counts, m.title]);
  if (last && last.sid === m.sid && last.nodes === m.nodes && last.open === m.open && last.collapsed === m.collapsed && last.key === key) return;
  last = { sid: m.sid, nodes: m.nodes, open: m.open, collapsed: m.collapsed, key: key };
  renderTree(m, ACTIONS);
}

/* GHI CÂY: next là phiên mới cùng id (core). Trả false khi không đổi (không rời được file mở, hay lưu hỏng có rollback).
   opts.rollback: lưu hỏng thì trả lại S cũ. opts.undo: undo của core cho nút Undo của toast undoMsg. */
export function setTree(next, undoMsg, opts) {
  opts = opts || {};
  var prev = S;
  if (!putSession(next)) return false;
  if (next.nodes === prev.nodes && next.docs === prev.docs && next.open === prev.open) {
    scheduleSave();   // chỉ gập / mở folder: prompt không đổi
    refreshTree();
    return true;
  }
  if (!saveNow(!!opts.rollback) && opts.rollback) {
    putSession(prev);
    saveNow(true);
    refreshTree();
    return false;
  }
  renderPrompt();   // nhãn file, số file (All files) đổi theo cây
  refreshTree();
  if (undoMsg) {
    var sid = S.id, after = S, u = opts.undo;
    toast(undoMsg, u ? { label: 'Undo', fn: function () { undoTree(sid, after, u); } } : null);
  }
  return true;
}
/* Undo: chỉ trả lại mục đã xoá / chuyển vào phiên hiện tại; focus về hàng ấy. Đã chuyển phiên thì ghi vào phiên ấy (bản
   đã lưu, hay after nếu nó bị xoá vì trống), không vào phiên đang mở. */
function undoTree(sid, after, u) {
  if (S.id === sid) {
    var r = applyUndo(S, u);
    if (r.id && setTree(r.s)) focusRow(r.id);
    return;
  }
  var s = sessionFor(sid, after);
  if (s && !saveClosed(applyUndo(s, u).s)) toast('Could not save to browser storage (full or blocked).');
}

function nodeOf(id) { return S.nodes.filter(function (n) { return n.id === id; })[0]; }
function fileWord(n) { return plural(n, 'file'); }

/* VIỆC CỦA CÂY (actions của renderTree). */
var ACTIONS = {
  open: function (id) { openFileId(id); },
  toggle: function (id) { setTree(toggleDir(S, id)); },
  newFile: function (parentId) {
    var r = addFile(S, parentId, UNTITLED, '', false);
    if (r.error) { toast(r.error); return; }
    if (setTree(openFile(r.s, r.id))) editName(r.id);
  },
  newDir: function (parentId) {
    var r = addDir(S, parentId, 'folder');
    if (r.error) { toast(r.error); return; }
    if (setTree(r.s)) editName(r.id);
  },
  rename: function (id, name) {
    var r = renameIn(S, id, name);
    if (r.error) return r.error;
    setTree(r.s);
    return '';
  },
  move: function (id, parentId) {
    var r = moveIn(S, id, parentId), n = nodeOf(id);
    if (r.error) return r.error;
    if (!r.undo) return '';
    setTree(r.s, 'Moved ' + n.name + ' to ' + (parentId == null ? 'the top level' : nodeOf(parentId).name) + '.', { undo: r.undo });
    return '';
  },
  remove: function (id) {
    var n = nodeOf(id);
    if (!n) return;
    var r = removeNodes(S, [id]), files = r.removed.filter(function (x) { return nodeOf(x).kind === 'file'; }).length;
    setTree(r.s, n.kind === 'dir' ? 'Deleted folder ' + n.name + ' (' + fileWord(files) + ').' : 'Deleted ' + n.name + '.', { undo: r.undo });
  },
  importDir: function (list, parentId) { importItems(list, parentId); },
  download: download,
  collapseAll: function () { setTree(collapseAll(S)); }
};

/* TẢI XUỐNG: file → chữ của nó; folder → .zip cây con; null → .zip cả phiên. Tên và kiểu: core downloadOf. */
function download(id) {
  var f = downloadOf(S, id == null ? null : id), z;
  if (!f.zip) { saveFile(new Blob([docOf(S, id).text], { type: f.type }), f.name); return; }
  try { z = zipOf(S, new Date(), id == null ? null : id); } catch (e) { toast('Could not build the .zip: ' + e.message); return; }
  saveFile(new Blob([z], { type: f.type }), f.name);
}

/* MỞ FILE TỪ ĐĨA (nút Open, thả một file lên thẻ văn bản). */
export function openDiskFile(file) {
  if (!isTextFile(file.name, file.type)) { toast('Only text files can be opened.'); return; }
  var sid = S.id;
  file.text().then(function (t) {
    if (hasNul(t)) { toast('"' + file.name + '" is not a text file.'); return; }
    t = normNewlines(t);
    if (S.id !== sid) {   // đã chuyển phiên trong lúc đọc
      var s = loadSession(sid);
      if (!s) { toast('The session was closed before "' + file.name + '" finished loading. Nothing was added.'); return; }
      var c = openFromDisk(s, file.name, t);
      toast(saveClosed(c.s) ? 'Added "' + file.name + '" to the session "' + sessionTitle(c.s) + '".' : 'Could not save to browser storage (full or blocked).');
      return;
    }
    var r = openFromDisk(S, file.name, t);
    if (!setTree(r.s)) return;
    setView(lastRead);
    toast(r.added ? 'Added "' + nodeOf(r.id).name + '" next to the open file.' : 'Opened "' + nodeOf(r.id).name + '".');
  }, function () { toast('Could not read the file.'); });
}

/* NẠP FOLDER. */
/* Mọi file dưới các mục: [{ path, file }] (path tính cả tên mục thả), folder rỗng trên đĩa: [path + '/']. */
function readEntries(list) {
  var files = [], dirs = [];
  function entry(en) {
    if (en.isFile) {
      return new Promise(function (res) {
        en.file(function (f) { files.push({ path: en.fullPath.replace(/^\/+/, ''), file: f }); res(); }, function () { res(); });
      });
    }
    if (!en.isDirectory) return Promise.resolve();
    return children(en).then(function (kids) {
      if (!kids.length) dirs.push(en.fullPath.replace(/^\/+/, '') + '/');
      return Promise.all(kids.map(entry));
    });
  }
  /* readEntries trả từng đợt (Chromium: 100 mục): đọc tới khi rỗng. Mục bị bỏ (skipEntry: ẩn, node_modules) không đọc
     tiếp, không tính khi xét folder rỗng. */
  function children(dir) {
    var r = dir.createReader(), all = [];
    return new Promise(function (res) {
      (function more() {
        r.readEntries(function (b) {
          if (!b.length) { res(all.filter(function (x) { return !skipEntry(x.name, x.isDirectory); })); return; }
          all = all.concat(b); more();
        }, function () { res(all); });
      })();
    });
  }
  return Promise.all(list.map(entry)).then(function () { return { files: files, dirs: dirs }; });
}
/* list: FileList / File[] (ô chọn folder: webkitRelativePath) hoặc FileSystemEntry[] (thả). parentId: folder đích (null
   = gốc), 'beside' = folder của file đang mở lúc bắt đầu. Đọc lâu hơn 1 giây thì báo đang đọc. */
export function importItems(list, parentId) {
  var arr = Array.prototype.slice.call(list || []);
  if (!arr.length) return;
  var sid = S.id, to = parentId === 'beside' ? dirOf(S, S.open) : parentId;
  var slow = setTimeout(function () { toast('Reading the folder…'); }, 1000);
  var got = arr[0] && typeof arr[0].isDirectory === 'boolean' ? readEntries(arr)
    : Promise.resolve({ files: arr.map(function (f) { return { path: f.webkitRelativePath || f.name, file: f }; }), dirs: [] });
  got.then(function (g) {
    var skipped = 0, take = g.files.filter(function (x) {
      var v = importCheck(x.path, x.file.type, x.file.size);
      if (v === 'skip') skipped++;
      return !v;
    });
    return Promise.all(take.map(function (x) {
      return x.file.text().then(function (t) {
        if (hasNul(t)) { skipped++; return null; }
        return { path: x.path, text: normNewlines(t) };
      }, function () { skipped++; return null; });
    })).then(function (items) {
      clearTimeout(slow);
      items = items.filter(Boolean).concat(g.dirs.map(function (p) { return { path: p, text: '' }; }));
      finishImport(sid, items, to, skipped);
    });
  }, function () { clearTimeout(slow); toast('Could not read that folder.'); });
}
function finishImport(sid, items, parentId, skipped) {
  if (!items.length) { toast('No text files to import' + (skipped ? ' (skipped ' + skipped + ')' : '') + '.'); return; }
  var skip = function (r) { var k = skipped + r.skipped; return k ? ', skipped ' + k : ''; };
  if (S.id !== sid) {   // đã chuyển phiên trong lúc đọc: vào phiên đã lưu
    var s = loadSession(sid);
    if (!s) { toast('The session was closed before the import finished. Nothing was imported.'); return; }
    var c = importPaths(s, parentId, items);
    toast(saveClosed(c.s) ? 'Imported ' + fileWord(c.files) + skip(c) + ' into the session "' + sessionTitle(c.s) + '".'
      : 'Not enough browser storage for ' + fileWord(c.files) + '. Delete old sessions in History or import a smaller folder.');
    return;
  }
  var open = S.open, r = importPaths(S, parentId, items);
  if (r.s.open !== open && !canLeave()) return;
  if (!setTree(r.s, '', { rollback: true })) {
    toast('Not enough browser storage for ' + fileWord(r.files) + '. Nothing was imported. Delete old sessions in History or import a smaller folder.');
    return;
  }
  revealTree();
  if (S.open !== open && docOf(S).text) setView(lastRead);   // phiên trống thay bằng folder: sang chế độ đọc
  toast('Imported ' + fileWord(r.files) + skip(r) + '.');
}
