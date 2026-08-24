/* viz-check.mjs — kiểm HÌNH có đọc được không, bằng máy, trên Chrome thật.
 *
 * Vì sao cần: `gate.mjs` đọc HTML như VĂN BẢN nên không cổng nào biết một nhãn SVG có
 * đè lên nhãn khác hay không. Bốn lỗi tìm được 2026-08-20 đều thuộc loại đó, và cái đầu
 * tiên do CHỦ TRANG nhìn thấy — tức phép kiểm này đang nằm trong mắt người, không nằm
 * trong repo (`CLAUDE.md` gốc repo, luật 1). File này đưa nó vào repo.
 *
 * Cách chạy: node tools/viz-check.mjs [--json]
 * Cần Chrome trên máy. Không có Chrome thì nó KHÔNG nổ — in một dòng rồi thoát 0, vì
 * đây là phép kiểm phụ thuộc môi trường, không phải cổng chặn commit.
 *
 * Nó KHÔNG kiểm "hình có dạy được không" — thứ đó cần người đọc thật, xem HANDOFF mục
 * "Tám hình P1". Nó kiểm năm thứ máy thấy được, ở MỌI trạng thái điều khiển:
 *   1. mount có render ra svg không (mount rỗng = hình biến mất, im lặng)
 *   2. hai nhãn <text> có đè nhau không
 *   3. nhãn có tràn ra ngoài viewBox không
 *   4. .ds-viz__alt có chữ không (mọi thông tin trong SVG phải đọc được ở đó — CLAUDE.md §10)
 *   5. VIỀN một <rect> có nằm trong hộp chữ không — tức nhãn dài hơn hộp chứa nó. CHỈ
 *      <rect>, và đó là kết luận của một phép ĐO chứ không phải lựa chọn cho tiện: cùng
 *      phép đo này áp cho MỌI loại hình (line/path/ellipse/polyline) cho 10 chỗ, và cả 10
 *      là nhãn đặt CỐ Ý lên đúng thứ nó gọi tên — "0" trên đường 0, "train" trên đường
 *      train, "trung vị" trên đường trung vị, ★ chính là cái mốc. Đó là direct labelling,
 *      một kỹ thuật ĐÚNG, nên bắt cả chúng thì cổng thành tiếng ồn. Thu về <rect>: 0 chỗ
 *      ở trạng thái ổn định, mà vẫn bắt được lớp lỗi thật. Xem CLAUDE.md §3.
 */
import { readFileSync, writeFileSync, existsSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { readPage } from './read-html.mjs';

const HERE = dirname(new URL(import.meta.url).pathname);
const DS = join(HERE, '..');
const PAGE = join(DS, 'data-science-roadmap.html');
const JSON_OUT = process.argv.includes('--json');

const CHROMES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
];
const chrome = CHROMES.find(p => existsSync(p));
if (!chrome) {
  console.log('viz-check: không tìm thấy Chrome trên máy này — bỏ qua (phép kiểm này cần một trình duyệt thật).');
  process.exit(0);
}

const ids = readPage(PAGE).LEAVES.map(l => l.id);

/* Script tiêm vào trang. Nó đọc DOM ĐÃ RENDER để biết bài nào có hình nào — không tự
   suy ra từ HTML, nên không có bản đồ thứ hai nào phải giữ cho khớp. */
const AUDIT = `
<script>
(async () => {
  const IDS = ${JSON.stringify(ids)};
  const wait = ms => new Promise(r => setTimeout(r, ms));
  /* Bỏ chữ KHÔNG hiện. Đo 2026-08-20: confmat vẽ mỗi con số HAI lần ở đúng một chỗ, một
     bản màu nền một bản màu chữ, với opacity bù nhau ("a > 0,45 ? 1 : 0" và ngược lại) —
     đó là cách sửa chữ-trên-ô-đậm từ phiên (p), chỉ một bản hiện. Bản đầu của phép kiểm
     này đếm cả hai và báo 75 "cặp chồng" toàn dương tính giả. */
  const shown = t => {
    const cs = getComputedStyle(t);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (+cs.opacity === 0 || +(t.getAttribute('opacity') ?? 1) === 0) return false;
    if (+cs.fillOpacity === 0) return false;
    for (let p = t.parentElement; p && p.tagName !== 'svg'; p = p.parentElement) {
      const pc = getComputedStyle(p);
      if (pc.display === 'none' || pc.visibility === 'hidden' || +pc.opacity === 0) return false;
    }
    return true;
  };
  /* Đo hộp SAU biến hình, và ĐO TRONG HỆ TOẠ ĐỘ CỦA viewBox — hai chuyện khác nhau, và
     tôi làm sai cả hai trước khi đúng:
       · getBBox() trần trả hộp trong hệ toạ độ RIÊNG của phần tử, nên nhãn trục xoay -90°
         có x âm mà sau khi xoay lại nằm gọn trong khung → tố oan calib, scale2d.
       · getCTM() thì trả toạ độ trong VIEWPORT (pixel CSS), còn viewBox là đơn vị user —
         so hai hệ đó với nhau cho 1.132 "lỗi", gần như toàn bộ là giả.
     Đúng là: nhân nghịch đảo getScreenCTM() của svg với getScreenCTM() của chữ, ra ma
     trận từ hệ của chữ về hệ của viewBox. */
  const boxes = svg => {
    let inv; try { inv = svg.getScreenCTM(); } catch (e) { inv = null; }
    if (!inv) return [];
    inv = inv.inverse();
    return [...svg.querySelectorAll('text')].filter(shown).map(t => {
      let b, sc; try { b = t.getBBox(); sc = t.getScreenCTM(); } catch (e) { return null; }
      if (!b || b.width <= 0 || !sc) return null;
      const m = inv.multiply(sc);
      const xs = [], ys = [];
      for (const [x, y] of [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]) {
        xs.push(m.a * x + m.c * y + m.e); ys.push(m.b * x + m.d * y + m.f);
      }
      return { t: t.textContent.trim().slice(0, 30),
        x1: Math.min(...xs), x2: Math.max(...xs), y1: Math.min(...ys), y2: Math.max(...ys) };
    }).filter(Boolean);
  };
  const hit = (a, b) => a.x1 < b.x2 - 0.5 && b.x1 < a.x2 - 0.5 && a.y1 < b.y2 - 0.5 && b.y1 < a.y2 - 0.5;

  /* Bốn cạnh của mỗi <rect> CÓ NÉT, cùng hệ toạ độ với boxes() (xem chú thích ở trên: phải
     nhân nghịch đảo getScreenCTM của svg, không dùng getCTM). */
  const rectEdges = svg => {
    let inv; try { inv = svg.getScreenCTM(); } catch (e) { inv = null; }
    if (!inv) return [];
    inv = inv.inverse();
    const out = [];
    for (const r of svg.querySelectorAll('rect')) {
      if (!shown(r)) continue;
      const cs = getComputedStyle(r);
      /* KHÔNG tin getComputedStyle().stroke: với stroke="var(--wb-border-strong)" viết bằng
         presentation attribute, Chrome trả 'none' ở computed style dù nó vẫn VẼ ra. Bản đầu
         của phép kiểm này vì thế loại sạch mọi rect và ĐẬU trên một lỗi có thật. */
      const st = r.getAttribute('stroke') || cs.stroke;
      if (!st || st === 'none' || !(parseFloat(cs.strokeWidth || '0') > 0)) continue;
      if (+cs.strokeOpacity === 0) continue;
      let sc; try { sc = r.getScreenCTM(); } catch (e) { continue; }
      if (!sc) continue;
      const m = inv.multiply(sc);
      const n = k => +(r.getAttribute(k) || 0);
      const x = n('x'), y = n('y'), w = n('width'), h = n('height');
      if (!(w > 0 && h > 0)) continue;
      const P = (px, py) => ({ x: m.a * px + m.c * py + m.e, y: m.b * px + m.d * py + m.f });
      const c = [P(x, y), P(x + w, y), P(x + w, y + h), P(x, y + h)];
      for (let i = 0; i < 4; i++) out.push({ a: c[i], b: c[(i + 1) % 4] });
    }
    return out;
  };
  /* KHOẢNG HỞ từ hộp chữ tới cạnh gần nhất, đơn vị viewBox: 0 = cạnh nằm TRONG hộp chữ.
     Ngưỡng 0,5 là số ĐO ĐƯỢC, không phải số chọn cho tiện — quét cả trang cho: lỗi thật
     (nhãn rộng hơn hộp chứa nó) ở hở 0,00, còn ca hợp lệ gần nhất ở 0,91 (chú thích đặt
     sát dưới một dải ô). Bản đầu làm ngược: co hộp chữ vào 0,6 rồi hỏi "có XUYÊN qua
     không", nên nó ĐẬU đúng cái lỗi nó được viết ra để bắt — nhãn vừa khít hộp thì viền
     chỉ CHẠM chứ không xuyên. */
  const clearance = (E, B) => {
    let best = Infinity;
    for (const e of E) {
      const xa = Math.min(e.a.x, e.b.x), xb = Math.max(e.a.x, e.b.x);
      const ya = Math.min(e.a.y, e.b.y), yb = Math.max(e.a.y, e.b.y);
      const dx = Math.max(0, B.x1 - xb, xa - B.x2);
      const dy = Math.max(0, B.y1 - yb, ya - B.y2);
      best = Math.min(best, Math.max(dx, dy));
    }
    return best;
  };
  const bad = [];
  const auditOne = (viz, name, state) => {
    const svgs = [...viz.querySelectorAll('svg')];
    /* KHÔNG đòi mọi hình phải là SVG. Đo 2026-08-20: 7 trong 50 mount dựng bằng HTML
       (families, leak, onehot, rollwin, thresh, shap, attn) — bản đầu của phép kiểm này
       báo cả 7 là "mount rỗng", tức 7/16 phát hiện là dương tính giả của chính nó. Chỉ
       mount KHÔNG CÓ GÌ mới là hỏng thật. */
    if (!svgs.length) {
      if (!viz.children.length) bad.push({ viz: name, state, kind: 'mount-rong' });
      return;
    }
    for (const svg of svgs) {
      const vbAttr = svg.getAttribute('viewBox');
      if (!svg.children.length) { bad.push({ viz: name, state, kind: 'svg-rong' }); continue; }
      const T = boxes(svg);
      for (let i = 0; i < T.length; i++) {
        for (let j = i + 1; j < T.length; j++) {
          if (hit(T[i], T[j])) bad.push({ viz: name, state, kind: 'chong', a: T[i].t, b: T[j].t,
            box: [+T[i].x1.toFixed(1), +T[i].x2.toFixed(1), +T[i].y1.toFixed(1), +T[i].y2.toFixed(1),
                  +T[j].x1.toFixed(1), +T[j].x2.toFixed(1), +T[j].y1.toFixed(1), +T[j].y2.toFixed(1)] });
        }
      }
      const RE = rectEdges(svg);
      if (RE.length) {
        for (const o of T) {
          const c = clearance(RE, o);
          if (c < 0.5) bad.push({ viz: name, state, kind: 'chu-tran-hop', a: o.t,
            box: [+c.toFixed(2), +o.x1.toFixed(1), +o.x2.toFixed(1), +o.y1.toFixed(1), +o.y2.toFixed(1)] });
        }
      }
      if (vbAttr) {
        const vb = vbAttr.trim().split(/[\\s,]+/).map(Number);
        for (const o of T) {
          if (o.x1 < vb[0] - 1 || o.x2 > vb[0] + vb[2] + 1 || o.y1 < vb[1] - 1 || o.y2 > vb[1] + vb[3] + 1)
            bad.push({ viz: name, state, kind: 'vuot-khung', a: o.t,
              box: [+o.x1.toFixed(1), +o.x2.toFixed(1), +o.y1.toFixed(1), +o.y2.toFixed(1)], vb });
        }
      }
    }
    const alt = viz.querySelector('.ds-viz__alt');
    if (alt && !alt.textContent.trim()) bad.push({ viz: name, state, kind: 'alt-rong' });
  };
  let nViz = 0, nState = 0;
  for (const id of IDS) {
    location.hash = '#/' + id;
    await wait(40);
    const mounts = [...document.querySelectorAll('#main [data-viz]')];
    for (const viz of mounts) {
      const name = viz.getAttribute('data-viz');
      nViz++;
      const segs = [...viz.querySelectorAll('[data-seg] button, .ds-seg button, .wb-seg button')];
      const ranges = [...viz.querySelectorAll('input[type=range]')];
      const setRanges = mode => ranges.forEach(s => {
        s.value = mode === 'min' ? s.min : mode === 'max' ? s.max : Math.round((+s.min + +s.max) / 2);
        s.dispatchEvent(new Event('input', { bubbles: true }));
      });
      const segList = segs.length ? segs : [null];
      for (let si = 0; si < segList.length; si++) {
        if (segList[si]) { segList[si].click(); await wait(25); }
        for (const mode of (ranges.length ? ['min', 'mid', 'max'] : ['-'])) {
          if (ranges.length) { setRanges(mode); await wait(25); }
          nState++;
          auditOne(viz, name, (segList[si] ? 'seg' + si : 'mac dinh') + (ranges.length ? '/' + mode : ''));
        }
      }
    }
  }
  const pre = document.createElement('pre');
  pre.id = 'vizaudit';
  /* Dấu mốc ghép từ hai nửa: --dump-dom in CẢ mã nguồn của script này, nên nếu chuỗi
     mốc xuất hiện nguyên vẹn trong source thì regex ở phía node khớp vào source trước
     khi khớp vào kết quả — đã dính một lần. */
  pre.textContent = '@@VIZ' + 'AUDIT@@' + JSON.stringify({ nViz, nState, bad }) + '@@E' + 'ND@@';
  document.body.appendChild(pre);
})();
</script>
`;

const tmp = mkdtempSync(join(tmpdir(), 'vizcheck-'));
const html = readFileSync(PAGE, 'utf8').replace('</body>', AUDIT + '</body>');
const f = join(tmp, 'page.html');
writeFileSync(f, html);

let dom = '';
try {
  dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--allow-file-access-from-files',
    '--virtual-time-budget=120000', '--dump-dom', 'file://' + f],
    { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });
} catch (e) {
  console.log('viz-check: Chrome không chạy được — bỏ qua.', e.message.slice(0, 120));
  process.exit(0);
}

const m = dom.match(/@@VIZAUDIT@@([\s\S]*?)@@END@@/);
if (!m) { console.error('viz-check: ✗ trang không chạy tới cuối phép kiểm (nghi SyntaxError trong script chính).'); process.exit(1); }
const res = JSON.parse(m[1]);
if (JSON_OUT) { console.log(JSON.stringify(res, null, 1)); process.exit(res.bad.length ? 1 : 0); }

console.log(`viz-check · ${res.nViz} mount hình · ${res.nState} trạng thái điều khiển đã thử`);
/* 0 mount = trang không render được (điển hình: SyntaxError trong script chính, và lúc đó
   G-SYNTAX cũng đang đỏ). Bản đầu in "✓ sạch" trong đúng tình huống đó — một phép kiểm ĐẬU
   khi trang trắng thì tệ hơn không có phép kiểm nào. Ngưỡng 30 là mức sàn thô: trang đang
   có 50 mount, nên tụt xuống dưới 30 là mất hàng loạt, không phải xoá một hình. */
if (res.nViz < 30) {
  console.error(`✗ chỉ thấy ${res.nViz} mount hình (trang đang có ~50) — trang gần như không render được.`);
  console.error('  Chạy `node tools/gate.mjs` trước: G-SYNTAX bắt lỗi làm cả script chết.');
  process.exit(1);
}
if (!res.bad.length) { console.log('✓ không nhãn nào đè nhau hay tràn hộp, không nhãn nào vượt khung, không mount rỗng'); process.exit(0); }

/* Gộp theo (hình, loại lỗi): một nhãn đè nhau thường nổ ở cả ba mức thanh trượt, in ba
   lần thì danh sách dài mà không thêm thông tin. */
const g = new Map();
for (const b of res.bad) {
  const k = b.viz + '|' + b.kind;
  if (!g.has(k)) g.set(k, { ...b, n: 0, states: new Set() });
  g.get(k).n++; g.get(k).states.add(b.state);
}
console.log(`\n✗ ${g.size} chỗ hỏng (${res.bad.length} lần nổ):\n`);
for (const v of [...g.values()].sort((a, b) => b.n - a.n)) {
  const what = v.kind === 'chong' ? `"${v.a}" đè "${v.b}"`
    : v.kind === 'vuot-khung' ? `"${v.a}" tràn ra ngoài viewBox`
    : v.kind === 'chu-tran-hop' ? `"${v.a}" tràn hộp: viền một <rect> cách hộp chữ ${String(v.box[0]).replace('.', ',')} đơn vị (nhãn dài hơn hộp chứa nó?)`
    : v.kind === 'mount-rong' ? 'mount không render svg nào'
    : v.kind === 'svg-rong' ? 'svg rỗng' : 'ds-viz__alt trống';
  console.log(`  ✗ ${v.viz.padEnd(14)} ${what}`);
  console.log(`    ${v.n} lần · trạng thái: ${[...v.states].slice(0, 4).join(', ')}${v.states.size > 4 ? '…' : ''}`);
}
process.exit(1);
