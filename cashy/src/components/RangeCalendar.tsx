import { useEffect, useState, type CSSProperties } from "react";
import type { Range } from "@/lib/period";

// Vietnamese, Monday-first (matches the app's date heads).
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const pad = (n: number) => String(n).padStart(2, "0");
const key = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

/**
 * The docs' `wb-calendar --range`: click the first day, then the last. The two
 * ends are solid neutral chips and the days between them a soft grey band — a
 * date range is a CHOICE, not a status, so it never takes a semantic colour (§1).
 *
 * Smart bits: after the first click the band PREVIEWS live under the cursor, so
 * you see the span forming before committing; and the view jumps to whatever
 * month the bound `value` starts in, so typing a date in the segmented field
 * scrolls the calendar to match. A click while a range is complete starts a new
 * one, so the control never gets stuck; picking backwards is swapped into order.
 */
export function RangeCalendar({
  value,
  onChange,
}: {
  value: Range | null;
  onChange: (r: Range) => void;
}) {
  const seed = value?.start ?? key(new Date());
  const [sy, sm] = seed.split("-").map(Number);
  const [view, setView] = useState<{ y: number; m: number }>({ y: sy, m: sm - 1 });
  // The first click of a new range: held here until the second click closes it.
  const [anchor, setAnchor] = useState<string | null>(null);
  // The day under the cursor while a range is half-open — drives the preview band.
  const [hover, setHover] = useState<string | null>(null);

  // Follow the bound value's month (e.g. the segmented input just parsed a date),
  // but leave the user free to page to other months while the value is unchanged.
  useEffect(() => {
    const s = value?.start;
    if (!s) return;
    const [yy, mm] = s.split("-").map(Number);
    setView((v) => (v.y === yy && v.m === mm - 1 ? v : { y: yy, m: mm - 1 }));
  }, [value?.start]);

  const todayKey = key(new Date());
  // While picking, the second endpoint is the hovered day (a live preview);
  // otherwise both ends come from the committed value. Ordered so a backwards
  // drag still highlights correctly.
  const a = anchor ?? value?.start ?? null;
  const b = anchor ? hover : (value?.end ?? null);
  const lo = a && b ? (a <= b ? a : b) : a;
  const hi = a && b ? (a <= b ? b : a) : null;

  const startWd = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Mon-first offset
  const gridStart = new Date(view.y, view.m, 1 - startWd);
  const cells = Array.from({ length: 42 }, (_, i) => {
    const dt = new Date(gridStart);
    dt.setDate(gridStart.getDate() + i);
    return dt;
  });

  const prevMonth = () =>
    setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  const nextMonth = () =>
    setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));

  function clickDay(k: string) {
    if (anchor === null) {
      setAnchor(k);
      return;
    }
    const [s, e] = anchor <= k ? [anchor, k] : [k, anchor];
    setAnchor(null);
    setHover(null);
    onChange({ start: s, end: e });
  }

  return (
    <div className="wb-calendar" style={{ "--wb-cal-cell": "34px" } as CSSProperties}>
      <div className="wb-calendar__head">
        <button
          type="button"
          className="wb-calendar__nav"
          aria-label="Tháng trước"
          onClick={prevMonth}
        >
          <span className="wb-ico">chevron_left</span>
        </button>
        <span className="wb-calendar__title">
          Tháng {view.m + 1}, {view.y}
        </span>
        <button
          type="button"
          className="wb-calendar__nav"
          aria-label="Tháng sau"
          onClick={nextMonth}
        >
          <span className="wb-ico">chevron_right</span>
        </button>
      </div>
      <div className="wb-calendar__grid" onMouseLeave={() => setHover(null)}>
        {WEEKDAYS.map((w) => (
          <span key={w} className="wb-calendar__wd">
            {w}
          </span>
        ))}
        {cells.map((dt) => {
          const k = key(dt);
          const isStart = k === lo;
          const isEnd = hi != null && k === hi;
          const inRange = Boolean(lo && hi && k > lo && k < hi);
          const cls =
            "wb-calendar__day" +
            (isStart ? " is-range-start" : "") +
            (isEnd ? " is-range-end" : "") +
            (inRange ? " is-in-range" : "") +
            (dt.getMonth() !== view.m ? " is-muted" : "") +
            (k === todayKey && !isStart && !isEnd ? " is-today" : "");
          return (
            <button
              key={k}
              type="button"
              className={cls}
              onClick={() => clickDay(k)}
              onMouseEnter={() => anchor && setHover(k)}
            >
              {dt.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
