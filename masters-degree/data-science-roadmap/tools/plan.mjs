#!/usr/bin/env node
/* ============================================================================
   plan.mjs — kiểm lịch học: 14 ngày, 8 tuần, thời lượng, nhóm năng lực

   Đây là bản chạy-bằng-node của `auditPlan()` — hàm nằm trong trang và trước
   đây chỉ chạy được khi mở trình duyệt rồi gõ tay vào Console.

   Vì sao phải đưa nó ra khỏi trình duyệt: nó là cổng BẮT BUỘC (CLAUDE.md §12
   bước 2) nhưng cách chạy thì tốn 6 bước tay — chép file sang chỗ khác, bật
   server, mở trang, thêm ?v=n chống cache, gõ hàm, đọc kết quả. Một cổng bắt
   buộc mà đắt như vậy thì trên thực tế sẽ bị bỏ. Giờ nó là một lệnh.

   Không cần trình duyệt và không cần thư viện: mọi thứ hàm này kiểm đều nằm
   trong dữ liệu (TREE / DAYS / WEEKS / COMPS…) chứ không cần trang được vẽ ra.
   Phần duy nhất từng cần DOM là "id trùng" — làm được bằng cách đọc thuộc tính
   id trong phần HTML, bỏ qua <script> và <style>.

   Ai gọi file này:
     · gate.mjs   — chạy như cổng G-PLAN (chặn commit)
     · audit.mjs  — chạy một mình, để đọc kết quả cho người
   ========================================================================== */

/* Liệt kê các đoạn <script> và <style>, để không nhặt `id="…"` nằm trong code. */
function codeRanges(src) {
  const out = [];
  for (const tag of ['script', 'style']) {
    const re = new RegExp(`<${tag}[^>]*>`, 'gi');
    let m;
    while ((m = re.exec(src))) {
      const close = src.indexOf(`</${tag}>`, m.index);
      out.push([m.index, close < 0 ? src.length : close]);
    }
  }
  return out;
}

/* Mọi thuộc tính id trong phần HTML, chia thành hai giỏ:
     doc  — id nằm ngoài mọi <template>: chúng cùng tồn tại trên trang một lúc,
            nên trùng là lỗi thật.
     tpl  — id nằm trong một <template>: mỗi lúc chỉ một bài được dựng ra, nên
            hai bài dùng cùng id thì KHÔNG sao; chỉ trùng TRONG một template
            mới là lỗi.
   Đây là chỗ duy nhất auditPlan() cần DOM, và cũng là chỗ dễ báo sai nhất nếu
   quét cả file — nên bỏ hẳn code ra khỏi phạm vi quét. */
function scanIds(P) {
  const skip = codeRanges(P.src);
  const inCode = i => skip.some(([a, b]) => i >= a && i < b);
  const doc = [];
  const perTpl = new Map();
  for (const m of P.src.matchAll(/\sid="([^"]+)"/g)) {
    if (inCode(m.index)) continue;
    const t = P.TPL.find(t => m.index > t.at && m.index < t.closeAt);
    if (t) {
      if (!perTpl.has(t.key)) perTpl.set(t.key, []);
      perTpl.get(t.key).push(m[1]);
    } else doc.push(m[1]);
  }
  return { doc, perTpl };
}

const dups = arr => arr.filter((v, i) => arr.indexOf(v) !== i);

/* Trả về mảng các câu mô tả vấn đề. Mảng rỗng = lịch học nhất quán.
   Cùng hợp đồng với auditPlan() trong trang: rỗng là đạt. */
export function checkPlan(P) {
  const bad = [];
  const {
    TREE, LEAVES, byId, DAYS, WEEKS, PAYOFF, ACCEPT, SCOPE, PORTFOLIO,
    COMPS, DELIV_MIN, READONLY_OK, FAST,
    mins, dayMins, sumMins, compByN, compIdsFor,
  } = P;

  /* --- id trùng ---------------------------------------------------------- */
  for (const id of new Set(dups(LEAVES.map(l => l.id)))) bad.push(`TREE: id bài trùng "${id}"`);
  for (const id of new Set(dups(TREE.map(p => p.id))))   bad.push(`TREE: id chặng trùng "${id}"`);

  const ids = scanIds(P);
  for (const id of new Set(dups(ids.doc))) bad.push(`HTML: id trùng "${id}" (ngoài template — cùng tồn tại một lúc)`);
  for (const [key, list] of ids.perTpl) {
    for (const id of new Set(dups(list))) bad.push(`template ${key}: id trùng "${id}"`);
  }

  /* --- Fast track 14 ngày ------------------------------------------------ */
  const flat = DAYS.flatMap(d => d.ids);
  flat.forEach((id, i) => {
    if (!byId[id]) bad.push(`DAYS: id lạ "${id}" (tham chiếu bài không tồn tại)`);
    if (flat.indexOf(id) !== i) bad.push(`DAYS: "${id}" xuất hiện nhiều lần`);
  });
  const dayOf = {}; DAYS.forEach(d => d.ids.forEach(id => { dayOf[id] = d.n; }));
  DAYS.forEach(d => {
    const h = dayMins(d) / 60;
    if (h > 6.5) bad.push(`Ngày ${d.n} dài ${h.toFixed(1)} giờ — quá 6,5 giờ`);
    if (h < 3.5) bad.push(`Ngày ${d.n} chỉ ${h.toFixed(1)} giờ — quá ngắn, gộp lại đi`);
    if (!d.out) bad.push(`Ngày ${d.n} không có deliverable`);
    if (!d.proof || !d.proof.length) bad.push(`Ngày ${d.n}: deliverable không liên kết bài tạo bằng chứng`);
    (d.proof || []).forEach(id => {
      if (!byId[id]) bad.push(`Ngày ${d.n}: proof "${id}" không tồn tại`);
      else if (!dayOf[id] || dayOf[id] > d.n) bad.push(`Ngày ${d.n}: proof "${id}" chỉ được dạy ở ngày ${dayOf[id] || '?'}`);
    });
  });

  /* --- Lộ trình 8 tuần: phải phủ ĐÚNG mọi bài, mỗi bài một lần ---------- */
  const wIds = WEEKS.flatMap(w => w.ids);
  wIds.forEach((id, i) => {
    if (!byId[id]) bad.push(`WEEKS: id lạ "${id}"`);
    if (wIds.indexOf(id) !== i) bad.push(`WEEKS: "${id}" xuất hiện nhiều lần`);
  });
  LEAVES.forEach(l => { if (!wIds.includes(l.id)) bad.push(`WEEKS: bài "${l.id}" không nằm ở tuần nào`); });

  /* Deliverable của tuần N chỉ được dựa trên bài dạy ở tuần N hoặc sớm hơn. */
  const weekOf = {}; WEEKS.forEach(w => w.ids.forEach(id => { weekOf[id] = w.n; }));
  WEEKS.forEach(w => {
    (w.needs || []).forEach(id => {
      if (!byId[id]) { bad.push(`Tuần ${w.n}: prerequisite "${id}" không tồn tại`); return; }
      if (weekOf[id] > w.n) bad.push(`Tuần ${w.n}: deliverable cần "${id}" nhưng bài đó dạy ở tuần ${weekOf[id]} (phụ thuộc ngược)`);
    });
    if (!w.out) bad.push(`Tuần ${w.n} không có deliverable`);
    if (!w.proof || !w.proof.length) bad.push(`Tuần ${w.n}: deliverable không liên kết bài tạo bằng chứng`);
    if (!w.next) bad.push(`Tuần ${w.n}: deliverable không nói bước tiếp theo sử dụng nó`);
    (w.proof || []).forEach(id => {
      if (!byId[id]) bad.push(`Tuần ${w.n}: proof "${id}" không tồn tại`);
      else if (weekOf[id] > w.n) bad.push(`Tuần ${w.n}: proof "${id}" chỉ được dạy ở tuần ${weekOf[id]}`);
    });
  });

  /* --- Từng bài --------------------------------------------------------- */
  LEAVES.forEach(l => {
    if (![l.r, l.x, l.d].every(v => Number.isInteger(v) && v >= 0)) bad.push(`${l.id}: r/x/d không hợp lệ`);
    if (mins(l) <= 0) bad.push(`${l.id}: tổng thời lượng bằng 0`);
    if (!PAYOFF[l.id]) bad.push(`${l.id}: thiếu PAYOFF`);
    if (l.p === 'core' && l.x === 0 && l.d === 0 && !ACCEPT[l.id] && !READONLY_OK.has(l.id))
      bad.push(`${l.id}: bài core nhưng không có thực hành / deliverable / acceptance`);
    const cs = compIdsFor(l);
    if (!cs.length) bad.push(`${l.id}: thiếu competency mapping`);
    cs.forEach(n => { if (!compByN[n]) bad.push(`${l.id}: competency ${n} không tồn tại`); });
  });

  /* --- Deliverable không được ngắn hơn mức bài tự mô tả ----------------- */
  for (const [id, min] of Object.entries(DELIV_MIN)) {
    const l = byId[id];
    if (!l) bad.push(`DELIV_MIN: bài "${id}" không tồn tại`);
    else if (l.d < min) bad.push(`${id}: cột deliverable ${l.d}′ < tối thiểu ${min}′ mô tả trong bài`);
  }

  /* --- Mọi bảng phụ trợ chỉ được trỏ tới bài có thật ------------------- */
  const refCheck = (name, list) => list.forEach(id => { if (!byId[id]) bad.push(`${name}: tham chiếu bài lạ "${id}"`); });
  refCheck('ACCEPT', Object.keys(ACCEPT));
  refCheck('SCOPE', Object.keys(SCOPE));
  refCheck('PORTFOLIO', PORTFOLIO.map(p => p.id));
  refCheck('DAYS.proof', DAYS.flatMap(d => d.proof || []));
  refCheck('WEEKS.needs/proof', WEEKS.flatMap(w => [...(w.needs || []), ...(w.proof || [])]));
  COMPS.forEach(c => {
    refCheck(`COMP ${c.n}`, [...c.lessons, ...c.key]);
    if (![2, 3, 4].includes(c.cap)) bad.push(`COMP ${c.n}: cap lạ ${c.cap}`);
    if (!c.key.every(k => c.lessons.includes(k))) bad.push(`COMP ${c.n}: có key nằm ngoài lessons`);
  });

  /* --- Mốc phải ánh xạ được sang năng lực ------------------------------- */
  const compLessons = new Set(COMPS.flatMap(c => c.lessons));
  WEEKS.filter(w => w.mile).forEach(w => {
    if (!w.ids.some(id => compLessons.has(id)))
      bad.push(`Mốc tuần ${w.n} (${w.mile}) không ánh xạ tới nhóm năng lực nào`);
    if (!w.proof || !w.proof.length) bad.push(`Mốc tuần ${w.n} (${w.mile}) thiếu proof checklist`);
    (w.proof || []).forEach(id => {
      if (!ACCEPT[id]) bad.push(`Mốc tuần ${w.n}: bài proof "${id}" thiếu acceptance criteria`);
      if (byId[id] && !compIdsFor(byId[id]).length) bad.push(`Mốc tuần ${w.n}: proof "${id}" thiếu competency mapping`);
    });
  });

  /* --- Tổng giờ giữa các cách xem phải khớp tuyệt đối -------------------
     Trang chủ, cây bên trái, lịch 8 tuần và fast track đều tính giờ từ cùng ba
     trường r/x/d. Lệch nhau nghĩa là có bài bị đếm hai lần hoặc bị bỏ sót. */
  const totalLeaves = sumMins(LEAVES);
  const totalWeeks  = wIds.reduce((s, id) => s + (byId[id] ? mins(byId[id]) : 0), 0);
  if (totalLeaves !== totalWeeks) bad.push(`Tổng giờ lệch: LEAVES ${totalLeaves}′ vs WEEKS ${totalWeeks}′`);
  const fastFromDays = sumMins(LEAVES.filter(l => FAST.has(l.id)));
  const fastFromPlan = DAYS.reduce((s, d) => s + dayMins(d), 0);
  if (fastFromDays !== fastFromPlan) bad.push(`Tổng fast track lệch: ${fastFromDays} vs ${fastFromPlan}`);

  return bad;
}
