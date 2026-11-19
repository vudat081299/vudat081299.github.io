/* Lưu trữ: localStorage bọc try/catch (hỏng thì trang vẫn chạy), khoá, và tuỳ chọn người dùng (prefs).
   Xuất: KEY, prefs, savePrefs, store.
   Dùng: không module nào. */

/* Mọi lần đọc ghi bọc try/catch; hỏng thì trang vẫn chạy. */
export var KEY = {
  index: 'md-annotate:index:v1',
  cur: 'md-annotate:current',
  stats: 'md-annotate:stats:v1',
  prefs: 'md-annotate:prefs:v1',
  s: function (id) { return 'md-annotate:s:' + id; }
};
export var store = {
  get: function (k, d) {
    try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
  },
  set: function (k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
  },
  del: function (k) { try { localStorage.removeItem(k); } catch (e) {} },
  bytes: function () {
    var n = 0;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('md-annotate:') === 0) n += (k.length + (localStorage.getItem(k) || '').length) * 2;
      }
    } catch (e) {}
    return n;
  }
};

/* Tuỳ chọn người dùng: chế độ xem, kiểu prompt, lời dẫn mặc định, tô màu, panel, Layout. Đọc một lần lúc nạp. */
export var prefs = store.get(KEY.prefs, null);
if (!prefs || typeof prefs !== 'object') prefs = {};
export function savePrefs() { store.set(KEY.prefs, prefs); }
