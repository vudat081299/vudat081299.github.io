#!/usr/bin/env node
/*
 * calibrate.js — sinh lại các bảng hiệu chuẩn của `thesis-topic-rubric.md`.
 *
 *   node calibrate.js            # in bảng §1b và §1c dạng markdown
 *   node calibrate.js --check    # chỉ báo lệch so với calibrated_as_of trong rubric
 *
 * Vì sao có file này: bản đầu của rubric chép tay các con số phân bố (90 đề tài,
 * 16 lĩnh vực). Page đi tiếp lên bản 9, bản 10 thì mọi con số đó sai — mà rubric
 * lại dùng chính chúng làm mốc tự-kiểm. Chép tay là nguồn lỗi, nên nó thành script.
 */

const fs = require("fs");
const path = require("path");

const HTML = path.join(__dirname, "thesis-topic-selector.html");
const RUBRIC = path.join(__dirname, "thesis-topic-rubric.md");

/* ---------- đọc TOPICS / IMPACT ra khỏi file HTML ---------- */
// Không dùng số dòng cứng: page bị sửa liên tục nên số dòng là mốc chết.
function slice(src, startMarker, endMarker) {
  const a = src.indexOf(startMarker);
  if (a < 0) throw new Error("không tìm thấy " + startMarker);
  const b = src.indexOf(endMarker, a);
  if (b < 0) throw new Error("không tìm thấy kết thúc của " + startMarker);
  return src.slice(a, b + endMarker.length);
}

function load() {
  const src = fs.readFileSync(HTML, "utf8");
  const topicsSrc = slice(src, "const TOPICS = [", "\n];");
  const impactSrc = slice(src, "const IMPACT = {", "\n};");
  const sandbox = {};
  new Function("s", topicsSrc.replace("const TOPICS", "s.TOPICS"))(sandbox);
  new Function("s", impactSrc.replace("const IMPACT", "s.IMPACT"))(sandbox);
  return sandbox;
}

/* ---------- ánh xạ máy móc ba trục, đúng như §4 định nghĩa ---------- */
// R1 đọc `risk`, R2 đọc `know`: thap → ĐI ĐƯỢC, tb → CĂNG, cao → CHẶN.
// R3 đọc `compute`: §R3 xếp cả `thap` LẪN `tb` vào ĐI ĐƯỢC, chỉ `cao` mới là CHẶN
// — nên R3 không bao giờ sinh ra CĂNG trong lượt chấm máy móc.
const AX = { thap: 0, tb: 1, cao: 2 };
const r1 = t => AX[t.risk];
const r2 = t => AX[t.know];
const r3 = t => (t.compute === "cao" ? 2 : 0);

function tally(list, key) {
  const m = {};
  list.forEach(t => { const v = key(t); m[v] = (m[v] || 0) + 1; });
  return m;
}
const show = (m, order) =>
  (order || Object.keys(m).sort()).filter(k => m[k]).map(k => `\`${k}\` ${m[k]}`).join(" · ");

function main() {
  const { TOPICS, IMPACT } = load();
  const N = TOPICS.length;
  const pct = n => ((n / N) * 100).toFixed(0) + "%";

  const ns = TOPICS.map(t => t.n).sort((a, b) => a - b);
  const holes = [];
  for (let i = 1; i <= ns[ns.length - 1]; i++) if (!ns.includes(i)) holes.push(i);

  const impS = tally(TOPICS, t => (IMPACT[t.id] ? IMPACT[t.id].s : "FALLBACK"));
  const mobile = TOPICS.filter(t => t.mobile).length;
  const vn = TOPICS.filter(t => t.vn).length;

  /* --- §1c: hình dạng phân bố --- */
  const bucket = { zero: [], one: [], two: [], blocked: [] };
  TOPICS.forEach(t => {
    const a = [r1(t), r2(t), r3(t)];
    if (a.some(x => x === 2)) bucket.blocked.push(t);
    else {
      const c = a.filter(x => x === 1).length;
      bucket[c === 0 ? "zero" : c === 1 ? "one" : "two"].push(t);
    }
  });

  /* --- kiểm tính toàn vẹn, những thứ rubric giả định là đúng --- */
  const problems = [];
  const dupN = ns.filter((v, i) => ns.indexOf(v) !== i);
  const ids = TOPICS.map(t => t.id);
  const dupId = ids.filter((v, i) => ids.indexOf(v) !== i);
  if (dupN.length) problems.push("trùng `n`: " + [...new Set(dupN)].join(", "));
  if (dupId.length) problems.push("trùng `id`: " + [...new Set(dupId)].join(", "));
  const noImpact = TOPICS.filter(t => !IMPACT[t.id]);
  if (noImpact.length) problems.push("thiếu entry `IMPACT`: " + noImpact.map(t => "#" + t.n).join(", "));
  const dash = TOPICS.filter(t => { const e = IMPACT[t.id]; return e && (e.who === "—" || e.pay === "—" || e.out === "—"); });
  if (dash.length) problems.push("`IMPACT` có `—`: " + dash.map(t => "#" + t.n).join(", "));
  const orphan = Object.keys(IMPACT).filter(k => !TOPICS.find(t => t.id === k));
  if (orphan.length) problems.push("`IMPACT` mồ côi: " + orphan.join(", "));
  const noSrc = TOPICS.filter(t => !t.src || !String(t.src).trim());
  if (noSrc.length) problems.push("thiếu `src` (F33): " + noSrc.map(t => "#" + t.n).join(", "));
  // `?` ở bất kỳ vị trí nào của src = xuất xứ chưa truy được → F33, verdict THIEU_THONG_TIN.
  const unknownSrc = TOPICS.filter(t => /\?|CHUA_XAC_DINH/.test(String(t.src || "")));
  if (unknownSrc.length) problems.push(
    `\`src\` chưa truy được (F33, verdict THIEU_THONG_TIN cho tới khi điền): ${unknownSrc.length} đề tài — ` +
    unknownSrc.map(t => "#" + t.n).join(", "));
  const badAi = TOPICS.filter(t => /^ai:/.test(String(t.src || "")) && !/^ai:[a-z0-9][a-z0-9.\-]*[0-9a-z]$/i.test(String(t.src)));
  if (badAi.length) problems.push("`src: ai:` thiếu model id thật (F34): " + badAi.map(t => "#" + t.n).join(", "));
  const emptyField = [];
  TOPICS.forEach(t => {
    ["t", "q", "data", "contrib"].forEach(k => { if (!t[k]) emptyField.push("#" + t.n + "." + k); });
    ["method", "why", "risk", "learn", "spike"].forEach(k => { if (!t.d || !t.d[k]) emptyField.push("#" + t.n + ".d." + k); });
  });
  if (emptyField.length) problems.push("trường rỗng: " + emptyField.join(", "));

  const today = new Date().toISOString().slice(0, 10);

  /* --- nếu chỉ cần kiểm lệch --- */
  if (process.argv.includes("--check")) {
    const md = fs.readFileSync(RUBRIC, "utf8");
    const m = md.match(/calibrated_topics:\s*(\d+)/);
    const old = m ? Number(m[1]) : null;
    if (old === null) { console.log("rubric chưa có `calibrated_topics:` — chạy `node calibrate.js` rồi dán vào §1b."); process.exit(1); }
    const drift = Math.abs(N - old) / old;
    console.log(`rubric hiệu chuẩn trên ${old} đề tài · page hiện có ${N} · lệch ${(drift * 100).toFixed(1)}%`);
    if (drift > 0.1) { console.log("→ VƯỢT NGƯỠNG 10%: tính lại §1b/§1c trước khi chấm (mục 1b, quy tắc hết hạn)."); process.exit(2); }
    console.log("→ trong ngưỡng, bảng cũ còn dùng được.");
    process.exit(0);
  }

  /* --- in bảng markdown để dán vào rubric --- */
  const out = [];
  out.push(`<!-- sinh bởi \`node calibrate.js\` ngày ${today} — ĐỪNG sửa tay -->`);
  out.push("");
  out.push("```yaml");
  out.push(`calibrated_as_of: ${today}`);
  out.push(`calibrated_topics: ${N}`);
  out.push(`calibrated_domains: ${new Set(TOPICS.map(t => t.dom)).size}`);
  out.push(`n_range: 1–${ns[ns.length - 1]}   # ${holes.length} lỗ: ${holes.join(" ")}`);
  out.push("```");
  out.push("");
  out.push("| Trường | Khai báo | Giá trị thực xuất hiện | Hệ quả |");
  out.push("|---|---|---|---|");
  out.push(`| \`diff\` | 1–5 | ${show(tally(TOPICS, t => t.diff), ["1", "2", "3", "4", "5"])} | |`);
  out.push(`| \`impact.s\` | 1–5 | ${show(impS, ["1", "2", "3", "4", "5", "FALLBACK"])} | bậc 5 chiếm ${pct(impS[5] || 0)} |`);
  out.push(`| \`risk\` | 3 bậc | ${show(tally(TOPICS, t => t.risk), ["thap", "tb", "cao"])} | |`);
  out.push(`| \`compute\` | 3 bậc | ${show(tally(TOPICS, t => t.compute), ["thap", "tb", "cao"])} | |`);
  out.push(`| \`know\` | 3 bậc | ${show(tally(TOPICS, t => t.know), ["thap", "tb", "cao"])} | \`cao\` chiếm ${pct(tally(TOPICS, t => t.know).cao || 0)} |`);
  out.push(`| \`mobile\` | bool | \`true\` ${mobile} | ${pct(mobile)} |`);
  out.push(`| \`vn\` | bool | \`true\` ${vn} | ${pct(vn)} |`);
  out.push(`| \`src\` | chuỗi | \`ai:\` ${TOPICS.filter(t => /^ai:/.test(String(t.src || ""))).length} · \`ext:\` ${TOPICS.filter(t => /^ext:/.test(String(t.src || ""))).length} · chưa rõ ${unknownSrc.length + noSrc.length} | |`);
  out.push("");
  out.push("**§1c — hình dạng phân bố** (chấm máy móc R1/R2/R3, xem chú thích trong `calibrate.js`):");
  out.push("");
  out.push("| Kết quả | Số đề tài | Trần verdict nếu R4/R6 chưa xác minh |");
  out.push("|---|---|---|");
  out.push(`| Không trục nào \`CĂNG\` | ${bucket.zero.length} | \`DI_DUOC_CO_DIEU_KIEN\` |`);
  out.push(`| Đúng một trục \`CĂNG\` | ${bucket.one.length} | \`DI_DUOC_CO_DIEU_KIEN\` |`);
  out.push(`| Hai trục \`CĂNG\` | ${bucket.two.length} | \`DI_DUOC_CO_DIEU_KIEN\` |`);
  out.push(`| Có ít nhất một trục \`CHẶN\` | ${bucket.blocked.length} | \`CHAN\` cho tới khi văn xuôi hạ được nó |`);
  out.push("");
  out.push(`Đề tài không trục nào \`CĂNG\`: ${bucket.zero.map(t => "#" + t.n).join(" ")}`);
  out.push("");
  out.push(`Đề tài có trục \`CHẶN\`: ${bucket.blocked.map(t => "#" + t.n).join(" ")}`);
  out.push("");
  out.push(problems.length ? "**Vấn đề toàn vẹn:**\n- " + problems.join("\n- ") : "**Toàn vẹn: không có vấn đề.**");
  console.log(out.join("\n"));
}

main();
