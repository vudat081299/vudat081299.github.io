// @ts-check
// Mô hình dữ liệu: Course, Instructor, ClassSession. Không đụng tới DOM, để chạy được cả trong Node (tools/verify.mjs).

import { instant, weekday } from './time.js';

/** @typedef {import('./time.js').DateKey} DateKey */

/**
 * @typedef {Object} Instructor
 * @property {string} id
 * @property {string} name
 * @property {string} email
 */

/**
 * @typedef {'indigo'|'teal'|'amber'} Tone
 */

/**
 * @typedef {Object} Course
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {string} shortName
 * @property {number} credits
 * @property {number[]} weekdays   0 = Chủ Nhật … 6 = Thứ Bảy
 * @property {string} start        "HH:MM" giờ Việt Nam
 * @property {string} end
 * @property {string|null} periods
 * @property {string} room
 * @property {string} faculty
 * @property {string|null} mode    null = chưa có thông tin
 * @property {Tone} tone
 */

/**
 * Một dòng trong data/schedule.json. Giờ và phòng lấy từ môn, trừ khi buổi ghi đè.
 * @typedef {Object} SessionRecord
 * @property {string} courseId
 * @property {DateKey} date
 * @property {string} instructorId
 * @property {string} [start]
 * @property {string} [end]
 * @property {string} [room]
 */

/**
 * @typedef {Object} ScheduleData
 * @property {string} timezone
 * @property {number} utcOffsetHours
 * @property {Instructor[]} instructors
 * @property {Course[]} courses
 * @property {SessionRecord[]} sessions
 */

/**
 * @typedef {Object} ClassSession
 * @property {string} id
 * @property {Course} course
 * @property {Instructor} instructor
 * @property {DateKey} date
 * @property {string} start
 * @property {string} end
 * @property {string} room
 * @property {number} startMs
 * @property {number} endMs
 * @property {number} index   thứ tự buổi trong môn, từ 1
 * @property {number} total   tổng số buổi của môn
 */

/** @typedef {'past'|'live'|'upcoming'} SessionStatus */

/**
 * @typedef {Object} Schedule
 * @property {Course[]} courses
 * @property {Instructor[]} instructors
 * @property {ClassSession[]} sessions   xếp theo thời điểm bắt đầu
 * @property {Map<string, Course>} courseById
 * @property {Map<string, ClassSession>} sessionById
 */

const TONES = ['indigo', 'teal', 'amber'];
const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;
const RE_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Kiểm dữ liệu và dựng lịch. Dữ liệu sai thì ném lỗi, không đoán.
 * @param {ScheduleData} data
 * @returns {Schedule}
 */
export function buildSchedule(data) {
  /** @type {string[]} */
  const errors = [];
  if (data.timezone !== 'Asia/Ho_Chi_Minh' || data.utcOffsetHours !== 7) {
    errors.push('múi giờ phải là Asia/Ho_Chi_Minh (UTC+7)');
  }

  const instructorById = new Map(data.instructors.map((i) => [i.id, i]));
  const courseById = new Map(data.courses.map((c) => [c.id, c]));
  if (instructorById.size !== data.instructors.length) errors.push('trùng id giảng viên');
  if (courseById.size !== data.courses.length) errors.push('trùng id môn');

  for (const c of data.courses) {
    if (!RE_TIME.test(c.start) || !RE_TIME.test(c.end) || c.start >= c.end) errors.push(`${c.id}: giờ học sai`);
    if (!TONES.includes(c.tone)) errors.push(`${c.id}: màu "${c.tone}" không có`);
  }

  const seen = new Set();
  for (const r of data.sessions) {
    const c = courseById.get(r.courseId);
    const where = `${r.courseId} ${r.date}`;
    if (!c) { errors.push(`${where}: không có môn này`); continue; }
    if (!instructorById.has(r.instructorId)) errors.push(`${where}: không có giảng viên "${r.instructorId}"`);
    if (!RE_DATE.test(r.date)) { errors.push(`${where}: ngày phải là YYYY-MM-DD`); continue; }
    if (!c.weekdays.includes(weekday(r.date))) errors.push(`${where}: rơi vào thứ không có trong lịch môn`);
    if (seen.has(where)) errors.push(`${where}: trùng buổi`);
    seen.add(where);
  }
  if (errors.length) throw new Error('Dữ liệu lịch học sai:\n' + errors.join('\n'));

  /** @type {ClassSession[]} */
  const sessions = data.sessions.map((r) => {
    const course = /** @type {Course} */ (courseById.get(r.courseId));
    const start = r.start ?? course.start;
    const end = r.end ?? course.end;
    return {
      id: `${r.courseId}@${r.date}`,
      course,
      instructor: /** @type {Instructor} */ (instructorById.get(r.instructorId)),
      date: r.date,
      start,
      end,
      room: r.room ?? course.room,
      startMs: instant(r.date, start),
      endMs: instant(r.date, end),
      index: 0,
      total: 0,
    };
  });
  sessions.sort((a, b) => a.startMs - b.startMs || a.course.id.localeCompare(b.course.id));

  for (const c of data.courses) {
    const own = sessions.filter((s) => s.course === c);
    own.forEach((s, i) => { s.index = i + 1; s.total = own.length; });
  }

  return {
    courses: data.courses,
    instructors: data.instructors,
    sessions,
    courseById,
    sessionById: new Map(sessions.map((s) => [s.id, s])),
  };
}

/** @param {ClassSession} s @param {number} nowMs @returns {SessionStatus} */
export function statusOf(s, nowMs) {
  if (nowMs >= s.endMs) return 'past';
  if (nowMs >= s.startMs) return 'live';
  return 'upcoming';
}

/** @param {ClassSession[]} sessions @param {number} nowMs */
export function nextSession(sessions, nowMs) {
  return sessions.find((s) => s.endMs > nowMs) ?? null;
}

/** @param {Schedule} schedule @param {Course} course */
export function sessionsOf(schedule, course) {
  return schedule.sessions.filter((s) => s.course === course);
}

/** Giảng viên của môn, theo thứ tự buổi dạy đầu tiên. @param {Schedule} schedule @param {Course} course */
export function instructorsOf(schedule, course) {
  /** @type {Instructor[]} */
  const list = [];
  for (const s of sessionsOf(schedule, course)) if (!list.includes(s.instructor)) list.push(s.instructor);
  return list;
}

/**
 * @param {ClassSession[]} sessions @param {number} nowMs
 * @returns {{total:number, done:number, remaining:number, percent:number}}
 */
export function progressOf(sessions, nowMs) {
  const total = sessions.length;
  const done = sessions.filter((s) => statusOf(s, nowMs) === 'past').length;
  return { total, done, remaining: total - done, percent: total ? Math.round((done / total) * 100) : 0 };
}

/** @param {Schedule} schedule */
export function totalCredits(schedule) {
  return schedule.courses.reduce((sum, c) => sum + c.credits, 0);
}

/** @param {string} text */
export function fold(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

/**
 * Buổi khớp ô tìm kiếm: tên môn, tên ngắn, mã học phần, giảng viên, phòng. Không phân biệt dấu.
 * @param {ClassSession} s @param {string} query
 */
export function matchesQuery(s, query) {
  const q = fold(query.trim());
  if (!q) return true;
  const hay = fold([s.course.name, s.course.shortName, s.course.code, s.instructor.name, s.room].join(' '));
  return q.split(/\s+/).every((word) => hay.includes(word));
}
