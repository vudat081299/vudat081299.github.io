import { addDays, daysBetween, ymd } from "@/lib/date";

export type PeriodKey =
  | "this-month"
  | "last-month"
  | "30d"
  | "this-year"
  | "all"
  | "custom";

export interface Range {
  start: string;
  end: string;
}

/** The presets offered by the period picker. `custom` is NOT here — it is not a
 *  preset, it is the escape hatch the picker opens a calendar for. */
export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "30d", label: "Last 30 days" },
  { key: "this-year", label: "This year" },
  { key: "all", label: "All time" },
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
    case "30d": {
      const end = new Date(y, m, now.getDate());
      const start = new Date(end);
      start.setDate(start.getDate() - 29);
      return { start: ymd(start), end: ymd(end) };
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
    case "30d": {
      const end = new Date(y, m, now.getDate());
      end.setDate(end.getDate() - 30);
      const start = new Date(end);
      start.setDate(start.getDate() - 29);
      return { start: ymd(start), end: ymd(end) };
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
