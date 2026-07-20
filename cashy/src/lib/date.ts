import { differenceInCalendarDays, format } from "date-fns";
import { vi } from "date-fns/locale";

export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayYMD(): string {
  return ymd(new Date());
}

export function parseYMD(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

export function fmtDate(s: string): string {
  return format(parseYMD(s), "d MMM, yyyy", { locale: vi });
}

export function fmtDateShort(s: string): string {
  return format(parseYMD(s), "d MMM", { locale: vi });
}

/** "Hôm nay" / "Hôm qua" / "Thứ Năm, 10 tháng 7 2026" — for date group headers. */
export function relativeDateHead(s: string): string {
  const diff = differenceInCalendarDays(new Date(), parseYMD(s));
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Hôm qua";
  return format(parseYMD(s), "EEEE, d MMMM yyyy", { locale: vi });
}

export function addDays(s: string, n: number): string {
  const d = parseYMD(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

// ---- month keys ("YYYY-MM") — for recurring / subscription math -------------
export function monthKey(d: Date = new Date()): string {
  return ymd(d).slice(0, 7);
}

/** Shift a "YYYY-MM" key by n months (n may be negative). */
export function addMonthKey(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y || 1970, (m || 1) - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** The billing date of a month for a given day-of-month, clamped to month length. */
export function billingDate(key: string, day: number): string {
  const [y, m] = key.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const d = Math.min(Math.max(1, day), daysInMonth);
  return `${key}-${String(d).padStart(2, "0")}`;
}

/** "T7/2026" — compact month label. */
export function monthLabelShort(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `T${m}/${y}`;
}

/** "tháng 7 2026" — full month label. */
export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `tháng ${m} ${y}`;
}
