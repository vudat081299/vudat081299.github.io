/* Kết quả HTML của highlight.js → đoạn tô màu, thuần (MDAN-066). highlight.js trả chữ đã thoát (&amp; &lt; &gt; &quot;
   &#x27;) trong <span class="hljs-…">; span lồng thì lấy lớp trong cùng, span không phải hljs- (language-css: phần nhúng)
   theo lớp ngoài. Vị trí đếm trên chữ gốc, nên khung dựng từ đoạn vẫn có text đúng bằng nguồn.
   hlRuns(html) → [{ s, e, c }], c là lớp của highlight.js ('hljs-title function_'): Preview.
   sxTokens(runs) → như tokens() của core/tokens.js, c là sx-*: Source.
   Xuất: hlRuns, sxTokens.
   Dùng: không module nào. */

/* Nối đoạn [s, e) lớp c vào out; liền đoạn trước cùng lớp thì gộp. */
function pushRun(out, s, e, c) {
  var last = out[out.length - 1];
  if (last && last.e === s && last.c === c) last.e = e;
  else out.push({ s: s, e: e, c: c });
}

var PART = /<span class="([^"]*)">|<\/span>|&(?:amp|lt|gt|quot|#x27);|[^<&]+/g;
export function hlRuns(html) {
  var out = [], stack = [null], pos = 0, m;
  PART.lastIndex = 0;
  while ((m = PART.exec(html))) {
    if (m[1] != null) stack.push(/^hljs-/.test(m[1]) ? m[1] : stack[stack.length - 1]);
    else if (m[0] === '</span>') stack.pop();
    else {
      var len = m[0][0] === '&' ? 1 : m[0].length, c = stack[stack.length - 1];
      if (c) pushRun(out, pos, pos + len, c);
      pos += len;
    }
  }
  return out;
}

/* Lớp của highlight.js (từ đầu, bỏ hljs-) → màu sx-* của Source, đã đủ tương phản (MDAN-001). Lớp khác: chữ thường. */
var SX = {
  keyword: 'sx-punct', doctag: 'sx-punct', 'selector-tag': 'sx-punct',
  built_in: 'sx-tag', type: 'sx-tag', name: 'sx-tag', addition: 'sx-tag',
  title: 'sx-code', meta: 'sx-code', section: 'sx-head',
  string: 'sx-string', regexp: 'sx-string', symbol: 'sx-string', char: 'sx-string', deletion: 'sx-string',
  number: 'sx-link', literal: 'sx-link', attr: 'sx-link', attribute: 'sx-link', variable: 'sx-link',
  'template-variable': 'sx-link', property: 'sx-link', 'selector-id': 'sx-link', 'selector-class': 'sx-link',
  comment: 'sx-comment', quote: 'sx-comment'
};
export function sxTokens(runs) {
  var out = [];
  runs.forEach(function (r) {
    var c = SX[r.c.split(' ')[0].slice(5)];
    if (c) pushRun(out, r.s, r.e, c);
  });
  return out;
}
