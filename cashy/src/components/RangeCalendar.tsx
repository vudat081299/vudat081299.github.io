import { useState } from "react";
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
 * A click while a range is complete starts a new one, so the control never gets
 * stuck; picking backwards is accepted and swapped into order.
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

  const todayKey = key(new Date());
  const start = anchor ?? value?.start ?? null;
  const end = anchor ? null : (value?.end ?? null);

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
    const [a, b] = anchor <= k ? [anchor, k] : [k, anchor];
    setAnchor(null);
    onChange({ start: a, end: b });
  }

  return (
    <div className="wb-calendar" style={{ "--wb-cal-cell": "34px" } as React.CSSProperties}>
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
      <div className="wb-calendar__grid">
        {WEEKDAYS.map((w) => (
          <span key={w} className="wb-calendar__wd">
            {w}
          </span>
        ))}
        {cells.map((dt) => {
          const k = key(dt);
          const isStart = k === start;
          const isEnd = k === end;
          const inRange = Boolean(start && end && k > start && k < end);
          const cls =
            "wb-calendar__day" +
            (isStart ? " is-range-start" : "") +
            (isEnd ? " is-range-end" : "") +
            (inRange ? " is-in-range" : "") +
            (dt.getMonth() !== view.m ? " is-muted" : "") +
            (k === todayKey && !isStart && !isEnd ? " is-today" : "");
          return (
            <button key={k} type="button" className={cls} onClick={() => clickDay(k)}>
              {dt.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
