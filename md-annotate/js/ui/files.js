/* Cây file của phiên (MDAN-022…025): nơi duy nhất đổi cây. setTree(next, undoMsg) thay S bằng phiên next do core dựng
   (state.js putSession), lưu, vẽ prompt và cây, tuỳ chọn có Undo (trả ảnh chụp trước, core restoreTree). Mọi việc của
   cây (actions của ui/tree.js renderTree) ở đây và chỉ gọi hàm của core/session.js rồi setTree: tên, trùng tên, file kế
   bên, bất biến là việc của core. refreshTree(): vẽ cây từ S (bỏ qua khi mô hình không đổi).
   Mở file từ đĩa (openDiskFile, MDAN-024): file đang mở trống thì điền, không thì thêm cạnh nó. Nạp folder (importItems,
   MDAN-022): bản sao, đọc đệ quy, bỏ mục ẩn và node_modules, bỏ file không phải chữ hay > 1 MB (core importCheck);
   bộ nhớ đầy thì hoàn lại. Tải: file .md, folder .zip, cả phiên .zip.
   Xuất: droppedItems, importItems, openDiskFile, refreshTree, setTree.
   Dùng: core/session.js, core/tree.js, core/text.js, ui/dom.js, ui/state.js, ui/render.js, ui/prompt.js, ui/views.js,
     ui/tree.js. */
import { addDir, addFile, autoName, collapseAll, dirOf, docOf, importPaths, isEmpty, moveIn, openFile, openFromDisk,
  removeNodes, renameIn, restoreTree, toggleDir, UNTITLED, zipOf } from '../core/session.js';
import { subtree } from '../core/tree.js';
import { importCheck, isTextFile, normNewlines, plural, slug } from '../core/text.js';
import { $, saveFile, toast } from './dom.js';
import { loadSession, openFileId, putSession, S, saveClosed, saveNow } from './state.js';
import { renderPrompt } from './prompt.js';
import { lastRead, setView } from './views.js';
import { editName, renderTree, setTreeShown } from './tree.js';

/* VẼ CÂY. last: mô hình vừa vẽ (mảng của S so theo tham chiếu, số đếm và tiêu đề theo chữ). */
var last = null;
function title() { return S.named ? S.name : isEmpty(S) ? '' : autoName(S); }
export function refreshTree() {
  var counts = {};
  S.nodes.forEach(function (n) {
    var d = n.kind === 'file' && S.docs[n.id];
    if (d) counts[n.id] = { c: d.comments.length, rv: Number.isFinite(d.rvPct) ? d.rvPct : null };
  });
  var m = { nodes: S.nodes, open: S.open, collapsed: S.collapsed, counts: counts, title: title() };
  var key = JSON.stringify([counts, m.title]);
  if (last && last.nodes === m.nodes && last.open === m.open && last.collapsed === m.collapsed && last.key === key) return;
  last = { nodes: m.nodes, open: m.open, collapsed: m.collapsed, key: key };
  renderTree(m, ACTIONS);
}

/* GHI CÂY: next là phiên mới cùng id (core). opts.rollback: lưu hỏng thì trả lại S cũ, trả false. */
export function setTree(next, undoMsg, opts) {
  var prev = S;
  putSession(next);
  if (!saveNow(!!(opts && opts.rollback)) && opts && opts.rollback) {
    putSession(prev);
    saveNow(true);
    refreshTree();
    return false;
  }
  renderPrompt();   // nhãn file, số file (All files) đổi theo cây
  refreshTree();
  if (undoMsg) toast(undoMsg, { label: 'Undo', fn: function () { undoTo(prev); } });
  return true;
}
/* Undo: cây về ảnh chụp prev. Đã chuyển phiên thì trả về phiên của nó (đã lưu khi chuyển), không vào phiên đang mở. */
function undoTo(prev) {
  if (S.id === prev.id) { setTree(restoreTree(S, prev)); return; }
  var s = loadSession(prev.id);
  if (s) saveClosed(restoreTree(s, prev));
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
    setTree(openFile(r.s, r.id));
    editName(r.id);
  },
  newDir: function (parentId) {
    var r = addDir(S, parentId, 'folder');
    if (r.error) { toast(r.error); return; }
    setTree(r.s);
    editName(r.id);
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
    if (r.s.nodes === S.nodes) return '';
    setTree(r.s, 'Moved ' + n.name + ' to ' + (parentId == null ? 'the top level' : nodeOf(parentId).name) + '.');
    return '';
  },
  remove: function (id) {
    var n = nodeOf(id);
    if (!n) return;
    var files = subtree(S.nodes, id).filter(function (x) { return nodeOf(x).kind === 'file'; }).length;
    setTree(removeNodes(S, [id]).s, n.kind === 'dir' ? 'Deleted folder ' + n.name + ' (' + fileWord(files) + ').' : 'Deleted ' + n.name + '.');
  },
  importDir: function (list, parentId) { importItems(list, parentId); },
  download: download,
  collapseAll: function () { setTree(collapseAll(S)); }
};

/* TẢI XUỐNG: file → chữ của nó, tên của nó (thiếu đuôi thì .md); folder → .zip cây con; null → .zip cả phiên. */
function download(id) {
  var n = id == null ? null : nodeOf(id);
  if (n && n.kind === 'file') {
    var md = !/\.[^.]+$/.test(n.name) || /\.(md|markdown)$/i.test(n.name);
    saveFile(new Blob([docOf(S, id).text], { type: (md ? 'text/markdown' : 'text/plain') + ';charset=utf-8' }), /\.[^.]+$/.test(n.name) ? n.name : n.name + '.md');
    return;
  }
  var z;
  try { z = zipOf(S, new Date(), n ? n.id : null); } catch (e) { toast('Could not build the .zip: ' + e.message); return; }
  saveFile(new Blob([z], { type: 'application/zip' }), (n ? n.name : slug(S.name || autoName(S))) + '.zip');
}

/* MỞ FILE TỪ ĐĨA (nút Open, thả một file lên thẻ văn bản). */
export function openDiskFile(file) {
  if (!isTextFile(file.name, file.type)) { toast('Only text files can be opened (.md, .markdown, .txt).'); return; }
  file.text().then(function (t) {
    var r = openFromDisk(S, file.name, normNewlines(t));
    setTree(r.s);
    setView(lastRead);
    toast(r.added ? 'Added "' + nodeOf(r.id).name + '" next to the open file.' : 'Opened "' + nodeOf(r.id).name + '".');
  }, function () { toast('Could not read the file.'); });
}

/* NẠP FOLDER. Mục thả: FileSystemEntry (đọc được folder) khi trình duyệt có, không thì File. Gọi ngay trong sự kiện
   drop: dataTransfer hết hạn sau đó. */
export function droppedItems(dt) {
  var out = [];
  if (dt.items && dt.items.length && dt.items[0].webkitGetAsEntry) {
    for (var i = 0; i < dt.items.length; i++) {
      var en = dt.items[i].kind === 'file' ? dt.items[i].webkitGetAsEntry() : null;
      if (en) out.push(en);
    }
    if (out.length) return out;
  }
  return Array.prototype.slice.call(dt.files || []);
}
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
  /* readEntries trả từng đợt (Chromium: 100 mục): đọc tới khi rỗng. Mục ẩn không tính khi xét folder rỗng. */
  function children(dir) {
    var r = dir.createReader(), all = [];
    return new Promise(function (res) {
      (function more() {
        r.readEntries(function (b) {
          if (!b.length) { res(all.filter(function (x) { return x.name[0] !== '.'; })); return; }
          all = all.concat(b); more();
        }, function () { res(all); });
      })();
    });
  }
  return Promise.all(list.map(entry)).then(function () { return { files: files, dirs: dirs }; });
}
/* list: FileList / File[] (ô chọn folder: webkitRelativePath) hoặc FileSystemEntry[] (thả). parentId: folder đích (null
   = gốc), 'beside' = folder của file đang mở. */
export function importItems(list, parentId) {
  var arr = Array.prototype.slice.call(list || []);
  if (!arr.length) return;
  var got = arr[0] && typeof arr[0].isDirectory === 'boolean' ? readEntries(arr)
    : Promise.resolve({ files: arr.map(function (f) { return { path: f.webkitRelativePath || f.name, file: f }; }), dirs: [] });
  got.then(function (g) {
    var skipped = 0, take = g.files.filter(function (x) {
      var v = importCheck(x.path, x.file.type, x.file.size);
      if (v === 'skip') skipped++;
      return !v;
    });
    var dirs = g.dirs.filter(function (p) { return importCheck(p + 'x', '', 0) !== 'ignore'; });
    return Promise.all(take.map(function (x) {
      return x.file.text().then(function (t) { return { path: x.path, text: normNewlines(t) }; }, function () { skipped++; return null; });
    })).then(function (items) {
      items = items.filter(Boolean).concat(dirs.map(function (p) { return { path: p, text: '' }; }));
      finishImport(items, parentId === 'beside' ? dirOf(S, S.open) : parentId, skipped);
    });
  }, function () { toast('Could not read that folder.'); });
}
function finishImport(items, parentId, skipped) {
  var skip = skipped ? ', skipped ' + skipped : '';
  if (!items.length) { toast('No text files to import' + (skipped ? ' (skipped ' + skipped + ')' : '') + '.'); return; }
  if (parentId != null && !nodeOf(parentId)) parentId = null;   // folder đích bị xoá trong lúc đọc
  var open = S.open, r = importPaths(S, parentId, items);
  if (!setTree(r.s, '', { rollback: true })) {
    toast('Not enough browser storage for ' + fileWord(r.files) + '. Nothing was imported. Delete old sessions in History or import a smaller folder.');
    return;
  }
  setTreeShown(true);
  if (S.open !== open && docOf(S).text) setView(lastRead);   // phiên trống thay bằng folder: sang chế độ đọc
  toast('Imported ' + fileWord(r.files) + skip + '.');
}
