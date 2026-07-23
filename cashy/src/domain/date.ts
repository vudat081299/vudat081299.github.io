import { differenceInCalendarDays, format } from "date-fns";

export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayYMD(): string {
  return ymd(new Date());
}

/** The wall clock right now as "HH:MM" — what a new transaction defaults to. */
export function nowHM(now: Date = new Date()): string {
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/** Yesterday's date as YYYY-MM-DD — the other date a "when?" field ever wants. */
export function yesterdayYMD(now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return ymd(d);
}

export function parseYMD(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

export function fmtDate(s: string): string {
  return format(parseYMD(s), "d MMM yyyy");
}

/** The three parts of a `fmtDate` string ("d MMM yyyy"), so a list can grey the
 *  parts that repeat across rows (day + year) and keep the distinguishing one
 *  (the month) prominent. */
export function fmtDateParts(s: string): { day: string; month: string; year: string } {
  const d = parseYMD(s);
  return { day: format(d, "d"), month: format(d, "MMM"), year: format(d, "yyyy") };
}

export function fmtDateShort(s: string): string {
  return format(parseYMD(s), "d MMM");
}

/** "05/07/2026" — numeric, fixed-width; for date columns in a dense table. */
export function fmtDateNum(s: string): string {
  return format(parseYMD(s), "dd/MM/yyyy");
}

/** "Today" / "Yesterday" / "Thursday, 10 July 2026" — for date group headers. */
export function relativeDateHead(s: string): string {
  const diff = differenceInCalendarDays(new Date(), parseYMD(s));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return format(parseYMD(s), "EEEE, d MMMM yyyy");
}

export function addDays(s: string, n: number): string {
  const d = parseYMD(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

/** Shift a YYYY-MM-DD date by n whole months, clamping the day to the target
 *  month's length so 31 Jan + 1 month lands on 28/29 Feb rather than rolling into
 *  March. Used by the subscription free-trial to find where the trial ends. */
export function addMonths(s: string, n: number): string {
  const [y, m, d] = s.split("-").map(Number);
  const first = new Date(y || 1970, (m || 1) - 1 + n, 1);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  first.setDate(Math.min(d || 1, daysInMonth));
  return ymd(first);
}

/** Parse a hand-typed "d/m/yyyy" (or "d-m-yy") into a YMD string, or null if it
 *  isn't a real date. Two-digit years are read as 20xx. */
export function parseDMY(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!m) return null;
  const day = +m[1];
  const month = +m[2];
  let year = +m[3];
  if (year < 100) year += 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(year, month - 1, day);
  if (dt.getMonth() !== month - 1) return null; // e.g. 31/2 → rolled over, reject
  return ymd(dt);
}

/** Parse a typed date range — "1/7/2026 - 15/7/2026", "1/7/2026 – 15/7", "… to …"
 *  — into an ordered {start,end}, or null if either side is unparseable. A
 *  missing end year is borrowed from the start. */
export function parseRangeText(s: string): { start: string; end: string } | null {
  const parts = s.split(/\s*[–—]\s*|\s+-\s+|\s+to\s+/i).map((p) => p.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  // Let a bare "15/7" on the end borrow the start's year.
  const startYearMatch = parts[0].match(/[/-](\d{2,4})$/);
  let endText = parts[1];
  if (startYearMatch && /^\d{1,2}[/-]\d{1,2}$/.test(endText)) endText = `${endText}/${startYearMatch[1]}`;
  const start = parseDMY(parts[0]);
  const end = parseDMY(endText);
  if (!start || !end) return null;
  return start <= end ? { start, end } : { start: end, end: start };
}

/** The Monday that opens the week containing `d` (weeks start Monday). Used to
 *  bucket the cash-flow chart by week. */
export function mondayOf(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (r.getDay() + 6) % 7; // Sun=0 → 6, Mon=1 → 0, …
  r.setDate(r.getDate() - offset);
  return r;
}

/** Whole calendar days from `a` to `b` (negative when `b` is earlier). Real dates,
 *  so month lengths and leap years are already accounted for — never assume 30. */
export function daysBetween(a: string, b: string): number {
  return differenceInCalendarDays(parseYMD(b), parseYMD(a));
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

/** Whole months from key `a` to key `b`. Negative when `b` precedes `a`. */
export function monthsBetweenKeys(a: string, b: string): number {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}

/** The billing date of a month for a given day-of-month, clamped to month length. */
export function billingDate(key: string, day: number): string {
  const [y, m] = key.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const d = Math.min(Math.max(1, day), daysInMonth);
  return `${key}-${String(d).padStart(2, "0")}`;
}

/** "Jul 2026" — compact month label. */
export function monthLabelShort(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${monthNameShort(m)} ${y}`;
}

/** "Mar" — English short month name from a 1..12 number. Used by the English
 *  subscription surfaces, which state a yearly plan's date as "15 Mar". */
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
export function monthNameShort(m: number): string {
  return MONTHS_SHORT[Math.min(12, Math.max(1, m)) - 1];
}

/** "July 2026" — full month label. */
export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return format(new Date(y || 1970, (m || 1) - 1, 1), "MMMM yyyy");
}

/**
 * The full title for a cash-flow chart bucket, read off its key:
 *   "W:2026-08-10" → "Week 10 Aug – 16 Aug 2026"
 *   "2026-01-01"   → "Thursday, 1 January 2026"
 *   "2026-03"      → "March 2026"
 *   "2026"         → "2026"
 */
export function chartBucketTitle(key: string): string {
  if (key.startsWith("W:")) {
    const start = parseYMD(key.slice(2));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const startL = format(start, "d MMM");
    const endL = format(end, "d MMM yyyy");
    return `Week ${startL} – ${endL}`;
  }
  if (key.length === 4) return key;
  if (key.length === 7) return monthLabel(key);
  return format(parseYMD(key), "EEEE, d MMMM yyyy");
}
