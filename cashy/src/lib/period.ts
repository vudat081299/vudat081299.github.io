import { ymd } from "@/lib/date";

export type PeriodKey = "this-month" | "last-month" | "30d" | "this-year" | "all";

export interface Range {
  start: string;
  end: string;
}

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "this-month", label: "Tháng này" },
  { key: "last-month", label: "Tháng trước" },
  { key: "30d", label: "30 ngày" },
  { key: "this-year", label: "Năm nay" },
  { key: "all", label: "Tất cả" },
];

export function periodLabel(key: PeriodKey): string {
  return PERIODS.find((p) => p.key === key)?.label ?? "Tháng này";
}

export function periodRange(key: PeriodKey, now: Date = new Date()): Range {
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
    case "all":
      return { start: "0000-01-01", end: "9999-12-31" };
  }
}

/** The immediately-preceding comparable window, for % change. */
export function prevRange(key: PeriodKey, now: Date = new Date()): Range {
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
    case "all":
      return { start: "0000-01-01", end: "0000-01-01" };
  }
}
