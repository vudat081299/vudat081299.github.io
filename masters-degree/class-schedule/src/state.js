// @ts-check
// Trạng thái của trang và các phép suy ra từ nó.

import { matchesQuery } from './model.js';

/**
 * @typedef {Object} AppState
 * @property {import('./model.js').Schedule} schedule
 * @property {{ms:number, key:string, minutes:number}} now
 * @property {import('./store.js').View} view
 * @property {string} cursor          ngày neo của tháng/tuần đang xem
 * @property {string|null} selectedDay ngày đang chọn trong lịch tháng (điện thoại)
 * @property {string} query
 * @property {Set<string>} hidden     id các môn đang ẩn
 * @property {boolean} showPast
 * @property {{courseId:string, sessionId:string|null}|null} panel
 * @property {boolean} narrow         màn hình hẹp (điện thoại)
 */

/** Buổi còn hiện sau bộ lọc môn và ô tìm kiếm. @param {AppState} state */
export function visibleSessions(state) {
  return state.schedule.sessions.filter((s) => !state.hidden.has(s.course.id) && matchesQuery(s, state.query));
}

/** @param {AppState} state */
export function hasFilters(state) {
  return state.hidden.size > 0 || state.query.trim() !== '';
}
