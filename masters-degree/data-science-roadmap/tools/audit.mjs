#!/usr/bin/env node
/* ============================================================================
   audit.mjs — chạy phần kiểm lịch học, không cần mở trình duyệt

   Đây là bản node của `auditPlan()`. Trước đây muốn chạy nó phải: chép file
   sang thư mục tạm, bật server, mở trang, thêm ?v=n để tránh cache, gõ hàm vào
   Console. Giờ:

       node tools/audit.mjs            in kết quả, thoát 1 nếu có vấn đề
       node tools/audit.mjs --quiet    chỉ in khi có vấn đề

   Cùng hợp đồng với hàm trong trang: KHÔNG có vấn đề nào = đạt.

   `node tools/gate.mjs` đã gọi sẵn các kiểm tra này (cổng G-PLAN), nên bình
   thường không cần chạy riêng file này. Nó tồn tại để đọc kết quả cho người,
   và để trả lời được câu "auditPlan có sạch không" bằng một lệnh.
   ========================================================================== */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readPage } from './read-html.mjs';
import { checkPlan } from './plan.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const P = readPage(join(HERE, '..', 'data-science-roadmap.html'));
const bad = checkPlan(P);
const quiet = process.argv.includes('--quiet');

if (bad.length) {
  console.error(`✗ lịch học có ${bad.length} vấn đề:\n`);
  bad.forEach(m => console.error('  ✗ ' + m));
  console.error('\nĐây là các kiểm tra mà `auditPlan()` trong trang cũng chạy.');
  process.exit(1);
}

if (!quiet) {
  const hrs = m => (m / 60).toFixed(1);
  const fast = P.LEAVES.filter(l => P.FAST.has(l.id));
  console.log(`✓ lịch học nhất quán — ${P.LEAVES.length} bài · ${P.TREE.length} chặng · `
    + `${P.WEEKS.length} tuần · ${P.DAYS.length} ngày fast track`);
  console.log(`  tổng ${hrs(P.sumMins(P.LEAVES))} giờ · fast track ${hrs(P.sumMins(fast))} giờ`);
}
process.exit(0);
