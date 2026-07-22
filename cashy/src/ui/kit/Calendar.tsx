import { useState } from "react";
import { cn } from "@/lib/utils";

/** A calendar range — inclusive `start`/`end` as `YYYY-MM-DD` strings. */
export type DateRange = { start: string; end: string };

// Vietnamese weekday heads, Monday-first (matches app.js initCalendar + the house date heads).
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const pad = (n: number) => String(n).padStart(2, "0");
// We speak `YYYY-MM-DD` everywhere so days compare as plain strings (lexicographic == chronological).
const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromYMD = (s: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
};

type CommonProps = {
  className?: string;
  /** Draw the neutral "today" ring (§46 — contrast, never colour). Default true. */
  showToday?: boolean;
  /** Month to open on when nothing is selected, as `YYYY-MM-DD`. Defaults to today. */
  defaultMonth?: string;
};

type SingleProps = CommonProps & {
  mode?: "single";
  /** Controlled selected day (`YYYY-MM-DD`); pass `null` for none. Omit to run uncontrolled. */
  value?: string | null;
  /** Initial day when uncontrolled. */
  defaultValue?: string | null;
  onChange?: (value: string) => void;
};

type RangeProps = CommonProps & {
  mode: "range";
  /** Controlled selected range; pass `null` for none. Omit to run uncontrolled. */
  value?: DateRange | null;
  /** Initial range when uncontrolled. */
  defaultValue?: DateRange | null;
  onChange?: (value: DateRange) => void;
};

/**
 * Calendar — the docs' `.wb-calendar` month grid (§46) as a typed wrapper, with the
 * month maths + click logic that the docs leave to a "behaviour engine" hand-rolled
 * here (no react-day-picker, no app.js). Two modes: `single` picks one day, `range`
 * picks two. Selection is TIER-1 CONTRAST, never colour — the chosen day is a solid
 * neutral chip, today a neutral ring, an in-range middle a soft-grey continuous band —
 * so a date reads as a *choice*, not a status.
 *
 * WHY the transient `anchor`: a range needs two clicks, but we only tell the parent
 * once the range is COMPLETE. The first click lives in local `anchor` state (shown as a
 * solid chip for feedback, exactly like app.js) until the second click closes the range
 * and fires `onChange`; a click on a finished range starts a fresh one, so the control
 * never gets stuck. Picking backwards is accepted and swapped into order.
 *
 * Controlled (`value`) or uncontrolled (`defaultValue`). Month navigation is purely
 * internal and seeded once, so it never fights the parent — matching RangeCalendar.tsx.
 */
export function Calendar(props: SingleProps | RangeProps) {
  const { className, showToday = true } = props;

  // Uncontrolled stores — one per mode so their types stay exact. Only the store for the
  // active mode is ever read; the other sits idle.
  const [innerSingle, setInnerSingle] = useState<string | null>(() =>
    props.mode === "range" ? null : (props.defaultValue ?? null),
  );
  const [innerRange, setInnerRange] = useState<DateRange | null>(() =>
    props.mode === "range" ? (props.defaultValue ?? null) : null,
  );
  // First click of a not-yet-complete range; held until the second click closes it.
  const [anchor, setAnchor] = useState<string | null>(null);
  // Navigation month, seeded once from the initial value (self-contained so hook order is stable).
  const [view, setView] = useState(() => {
    const seedStart =
      props.mode === "range"
        ? (props.value?.start ?? props.defaultValue?.start ?? null)
        : (props.value ?? props.defaultValue ?? null);
    const d = fromYMD(seedStart ?? props.defaultMonth ?? toYMD(new Date())) ?? new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  // Resolve the effective selection (controlled prop wins over the uncontrolled store).
  let selectedStart: string | null = null;
  let selectedEnd: string | null = null;
  if (props.mode === "range") {
    const r = props.value !== undefined ? props.value : innerRange;
    selectedStart = r?.start ?? null;
    selectedEnd = r?.end ?? null;
  } else {
    selectedStart = props.value !== undefined ? props.value : innerSingle;
  }

  // A pending range end is null while `anchor` is set — so a lone anchor paints as a
  // single solid chip until the range completes (see WHY above).
  const start = anchor ?? selectedStart;
  const end = anchor ? null : selectedEnd;

  const todayKey = toYMD(new Date());
  const firstWd = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Monday = 0
  const gridStart = new Date(view.y, view.m, 1 - firstWd);
  const cells = Array.from({ length: 42 }, (_, i) => {
    const dt = new Date(gridStart);
    dt.setDate(gridStart.getDate() + i);
    return dt;
  });

  const prevMonth = () =>
    setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  const nextMonth = () =>
    setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));

  function pick(k: string) {
    if (props.mode === "range") {
      if (anchor === null) {
        setAnchor(k);
        return;
      }
      const [a, b] = anchor <= k ? [anchor, k] : [k, anchor];
      setAnchor(null);
      const next = { start: a, end: b };
      if (props.value === undefined) setInnerRange(next);
      props.onChange?.(next);
    } else {
      if (props.value === undefined) setInnerSingle(k);
      props.onChange?.(k);
    }
  }

  return (
    <div className={cn("wb-calendar", className)}>
      <div className="wb-calendar__head">
        <button
          type="button"
          className="wb-calendar__nav"
          aria-label="Previous month"
          onClick={prevMonth}
        >
          <span className="wb-ico">chevron_left</span>
        </button>
        <span className="wb-calendar__title">
          Month {view.m + 1}, {view.y}
        </span>
        <button
          type="button"
          className="wb-calendar__nav"
          aria-label="Next month"
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
          const k = toYMD(dt);
          const hasRange = Boolean(start && end);
          const isStart = hasRange && k === start;
          const isEnd = hasRange && k === end;
          const inRange =
            hasRange && start !== null && end !== null && k > start && k < end;
          const isSelected = !hasRange && k === start;
          const isToday = showToday && k === todayKey && !isStart && !isEnd && !isSelected;
          return (
            <button
              key={k}
              type="button"
              className={cn(
                "wb-calendar__day",
                dt.getMonth() !== view.m && "is-muted",
                isToday && "is-today",
                isStart && "is-range-start",
                isEnd && "is-range-end",
                inRange && "is-in-range",
                isSelected && "is-selected",
              )}
              onClick={() => pick(k)}
            >
              {dt.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
