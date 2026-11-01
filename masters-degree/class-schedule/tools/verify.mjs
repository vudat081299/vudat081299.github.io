// Kiểm data/schedule.json với lịch gốc (chép nguyên từ thông báo của trường) và kiểm logic thời gian.
// Chạy: node masters-degree/class-schedule/tools/verify.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSchedule, nextSession, progressOf, statusOf, matchesQuery } from '../src/model.js';
import { instant, startOfWeek, vnNow, fmtDate, fmtDuration } from '../src/time.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(join(root, 'data/schedule.json'), 'utf8'));

// Lịch gốc: môn → giảng viên → ngày (DD/MM/YYYY).
const SOURCE = {
  it5305e: {
    'Bùi Quốc Trung': ['04/11/2026', '18/11/2026', '02/12/2026', '16/12/2026', '30/12/2026', '13/01/2027'],
    'Vũ Văn Thiệu': ['11/11/2026', '25/11/2026', '09/12/2026', '23/12/2026', '06/01/2027', '20/01/2027'],
  },
  it4043e: {
    'Trần Văn Đặng': ['07/11/2026', '14/11/2026', '21/11/2026', '28/11/2026', '05/12/2026', '12/12/2026', '19/12/2026', '26/12/2026', '09/01/2027'],
  },
  it5425e: {
    'Nguyễn Văn Sơn': ['09/11/2026', '16/11/2026', '23/11/2026', '30/11/2026', '07/12/2026', '14/12/2026', '21/12/2026', '28/12/2026',
      '11/12/2026', '18/12/2026', '25/12/2026'],
  },
};
const COURSE = {
  it5305e: { start: '17:30', end: '20:30', room: 'B1-405', credits: 3, mode: 'Hybrid Learning', total: 12 },
  it4043e: { start: '08:00', end: '12:00', room: 'B1-504', credits: 3, mode: 'Hybrid Learning', total: 9 },
  it5425e: { start: '18:00', end: '20:30', room: 'C7-238', credits: 3, mode: null, total: 11 },
};

let fails = 0;
const check = (name, ok, detail = '') => {
  if (!ok) fails++;
  console.log(`${ok ? '  ok  ' : '  LỖI'} ${name}${!ok && detail ? '  — ' + detail : ''}`);
};

const s = buildSchedule(data);

// 1. Dữ liệu khớp lịch gốc, từng buổi một, không thừa không thiếu.
const want = new Set();
for (const [cid, byTeacher] of Object.entries(SOURCE)) {
  for (const [name, dates] of Object.entries(byTeacher)) for (const d of dates) want.add(`${cid}|${d}|${name}`);
}
const got = new Set(s.sessions.map((x) => `${x.course.id}|${fmtDate(x.date)}|${x.instructor.name}`));
const missing = [...want].filter((x) => !got.has(x));
const extra = [...got].filter((x) => !want.has(x));
check('mọi buổi trong lịch gốc có mặt, đúng giảng viên', missing.length === 0, missing.join(', '));
check('không có buổi nào ngoài lịch gốc', extra.length === 0, extra.join(', '));
check('tổng 32 buổi', s.sessions.length === 32, String(s.sessions.length));
for (const [cid, c] of Object.entries(COURSE)) {
  const course = s.courseById.get(cid);
  const own = s.sessions.filter((x) => x.course.id === cid);
  check(`${cid}: ${c.total} buổi, ${c.start}–${c.end}, phòng ${c.room}`,
    own.length === c.total && own.every((x) => x.start === c.start && x.end === c.end && x.room === c.room && x.total === c.total),
    `${own.length} buổi`);
  check(`${cid}: ${c.credits} tín chỉ, hình thức ${c.mode ?? 'chưa cập nhật'}`, course?.credits === c.credits && course?.mode === c.mode);
}
check('tổng 9 tín chỉ', s.courses.reduce((a, c) => a + c.credits, 0) === 9);
check('năm: tháng 11–12 là 2026, tháng 1 là 2027',
  s.sessions.every((x) => (x.date.slice(5, 7) === '01' ? x.date.startsWith('2027') : x.date.startsWith('2026'))));

// 2. Giờ Việt Nam: 17:30 ngày 04/11/2026 = 10:30 UTC.
check('17:30 giờ VN = 10:30 UTC', instant('2026-11-04', '17:30') === Date.UTC(2026, 10, 4, 10, 30));
check('vnNow qua nửa đêm UTC', vnNow(Date.UTC(2026, 10, 3, 18, 0)).key === '2026-11-04');
check('tuần bắt đầu Thứ Hai', startOfWeek('2026-11-01') === '2026-10-26' && startOfWeek('2026-11-02') === '2026-11-02');

// 3. Trạng thái và tiến độ.
const at = (key, hhmm) => instant(key, hhmm);
const first = s.sessions[0];
check('buổi đầu tiên là Khởi nghiệp số 04/11 với Bùi Quốc Trung',
  first.course.id === 'it5305e' && first.date === '2026-11-04' && first.instructor.name === 'Bùi Quốc Trung');
check('trước giờ học: sắp tới', statusOf(first, at('2026-11-04', '17:29')) === 'upcoming');
check('trong giờ học: đang học', statusOf(first, at('2026-11-04', '18:00')) === 'live');
check('đúng giờ tan: đã qua', statusOf(first, at('2026-11-04', '20:30')) === 'past');
check('đang học thì buổi đó vẫn là buổi tiếp theo', nextSession(s.sessions, at('2026-11-04', '18:00')) === first);
const p = progressOf(s.sessions, at('2026-11-10', '00:00'));
check('đến 10/11: đã học 3 buổi (04, 07, 09/11)', p.done === 3 && p.remaining === 29, JSON.stringify(p));
check('sau buổi cuối: 100%', progressOf(s.sessions, at('2027-01-21', '00:00')).percent === 100);
check('11/11 dạy bởi Vũ Văn Thiệu', s.sessionById.get('it5305e@2026-11-11')?.instructor.name === 'Vũ Văn Thiệu');

// 4. Tìm kiếm không phân biệt dấu.
check('tìm "thieu" ra 6 buổi', s.sessions.filter((x) => matchesQuery(x, 'thieu')).length === 6);
check('tìm "dữ liệu lớn" ra 9 buổi', s.sessions.filter((x) => matchesQuery(x, 'dữ liệu lớn')).length === 9);
check('đếm ngược gọn', fmtDuration(3 * 86400000 + 2 * 3600000 + 5 * 60000) === '3 ngày 2 giờ');

if (fails) { console.log(`class-schedule: ${fails} lỗi`); process.exit(1); }
console.log('class-schedule: OK');
