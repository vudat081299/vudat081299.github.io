import { addDays, daysBetween, ymd } from "@/domain/date";

export type PeriodKey =
  | "this-month"
  | "last-month"
  | "30d"
  | "60d"
  | "90d"
  | "2m"
  | "3m"
  | "this-year"
  | "all"
  | "custom";

export interface Range {
  start: string;
  end: string;
}

/** The presets offered by the period picker, in two visual groups: rolling-day
 *  windows and whole-month windows. `custom` is NOT here — it is not a preset,
 *  it is the escape hatch the picker opens a calendar / text field for. */
export const PERIODS: { key: PeriodKey; label: string; group: "day" | "month" }[] = [
  { key: "30d", label: "Last 30 days", group: "day" },
  { key: "60d", label: "Last 60 days", group: "day" },
  { key: "90d", label: "Last 90 days", group: "day" },
  { key: "this-month", label: "This month", group: "month" },
  { key: "last-month", label: "Last month", group: "month" },
  { key: "2m", label: "Last 2 months", group: "month" },
  { key: "3m", label: "Last 3 months", group: "month" },
  { key: "this-year", label: "This year", group: "month" },
  { key: "all", label: "All time", group: "month" },
];

const OPEN_START = "0000-01-01";
const OPEN_END = "9999-12-31";

/** "05/07/2026 – 18/07/2026" — numeric, so it reads the same in any language. */
export function rangeLabel(r: Range): string {
  const d = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
  return r.start === r.end ? d(r.start) : `${d(r.start)} – ${d(r.end)}`;
}

export function periodLabel(key: PeriodKey, custom?: Range | null): string {
  if (key === "custom") return custom ? rangeLabel(custom) : "Custom";
  return PERIODS.find((p) => p.key === key)?.label ?? "This month";
}

/** "Tháng 5 – tháng 7" / "Tháng 11/2025 – tháng 1/2026" — the year is dropped
 *  when start and end share it. */
function monthRangeNote(r: Range): string {
  const sy = +r.start.slice(0, 4);
  const sm = +r.start.slice(5, 7);
  const ey = +r.end.slice(0, 4);
  const em = +r.end.slice(5, 7);
  if (sy === ey && sm === em) return `Tháng ${sm}`;
  if (sy === ey) return `Tháng ${sm} – tháng ${em}`;
  return `Tháng ${sm}/${sy} – tháng ${em}/${ey}`;
}

/** "23/4 – 21/7" / "23/4/2025 – 21/7/2026" — the year is dropped when shared. */
function dateRangeNote(r: Range): string {
  const dm = (s: string) => `${+s.slice(8, 10)}/${+s.slice(5, 7)}`;
  const sy = r.start.slice(0, 4);
  const ey = r.end.slice(0, 4);
  if (sy === ey) return `${dm(r.start)} – ${dm(r.end)}`;
  return `${dm(r.start)}/${sy} – ${dm(r.end)}/${ey}`;
}

// Which presets read most naturally as whole months rather than exact dates.
const MONTH_BASED = new Set<PeriodKey>(["this-month", "last-month", "2m", "3m"]);

/**
 * A plain-language note of the concrete window a preset resolves to, so the user
 * can see "Last 3 months" actually means "Tháng 5 – tháng 7". Month-based presets
 * are stated in months, day-based ones ("Last 90 days", custom) in dates; both
 * drop the year when it's shared. `null` for "All time" — nothing to bound.
 */
export function periodNote(
  key: PeriodKey,
  now: Date = new Date(),
  custom?: Range | null,
): string | null {
  if (key === "all") return null;
  if (key === "custom" && !custom) return null;
  if (key === "this-year") return `Năm ${now.getFullYear()}`;
  const r = periodRange(key, now, custom);
  return MONTH_BASED.has(key) ? monthRangeNote(r) : dateRangeNote(r);
}

export function periodRange(
  key: PeriodKey,
  now: Date = new Date(),
  custom?: Range | null,
): Range {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (key) {
    case "this-month":
      return { start: ymd(new Date(y, m, 1)), end: ymd(new Date(y, m + 1, 0)) };
    case "last-month":
      return { start: ymd(new Date(y, m - 1, 1)), end: ymd(new Date(y, m, 0)) };
    case "30d":
    case "60d":
    case "90d": {
      const span = key === "30d" ? 30 : key === "60d" ? 60 : 90;
      const end = new Date(y, m, now.getDate());
      const start = new Date(end);
      start.setDate(start.getDate() - (span - 1));
      return { start: ymd(start), end: ymd(end) };
    }
    // "N months" = N whole calendar months ending with (and INCLUDING) this one:
    // in July, "3 months" is 1 May → 31 July.
    case "2m":
    case "3m": {
      const back = key === "2m" ? 1 : 2;
      return { start: ymd(new Date(y, m - back, 1)), end: ymd(new Date(y, m + 1, 0)) };
    }
    case "this-year":
      return { start: `${y}-01-01`, end: `${y}-12-31` };
    case "custom":
      // No range picked yet → behave like "all" rather than filtering to nothing.
      return custom ?? { start: OPEN_START, end: OPEN_END };
    case "all":
      return { start: OPEN_START, end: OPEN_END };
  }
}

/** The immediately-preceding comparable window, for % change. */
export function prevRange(
  key: PeriodKey,
  now: Date = new Date(),
  custom?: Range | null,
): Range {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (key) {
    case "this-month":
      return { start: ymd(new Date(y, m - 1, 1)), end: ymd(new Date(y, m, 0)) };
    case "last-month":
      return { start: ymd(new Date(y, m - 2, 1)), end: ymd(new Date(y, m - 1, 0)) };
    case "30d":
    case "60d":
    case "90d": {
      const span = key === "30d" ? 30 : key === "60d" ? 60 : 90;
      const end = new Date(y, m, now.getDate());
      end.setDate(end.getDate() - span);
      const start = new Date(end);
      start.setDate(start.getDate() - (span - 1));
      return { start: ymd(start), end: ymd(end) };
    }
    case "2m":
    case "3m": {
      const months = key === "2m" ? 2 : 3;
      // The N whole months immediately BEFORE the current N-month window.
      return {
        start: ymd(new Date(y, m - months - (months - 1), 1)),
        end: ymd(new Date(y, m - months + 1, 0)),
      };
    }
    case "this-year":
      return { start: `${y - 1}-01-01`, end: `${y - 1}-12-31` };
    case "custom": {
      // The same number of days, ending the day before the custom range opens.
      if (!custom) return { start: OPEN_START, end: OPEN_START };
      const end = addDays(custom.start, -1);
      return { start: addDays(end, -daysBetween(custom.start, custom.end)), end };
    }
    case "all":
      return { start: OPEN_START, end: OPEN_START };
  }
}
