import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");

/** Build [a..b] stepped by `step`. */
function seq(a: number, b: number, step = 1) {
  const out: number[] = [];
  for (let i = a; i <= b; i += step) out.push(i);
  return out;
}

/**
 * Parse "HH:MM" into a clamped {hour, minute}, snapping the minute onto the step
 * grid — the same tolerance app.js's initTimePicker applies to `data-value`.
 */
function parseTime(v: string | undefined, step: number): { hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{2})/.exec((v ?? "").trim());
  if (!m) return { hour: 9, minute: 0 };
  const hour = Math.min(23, Math.max(0, +m[1]));
  let minute = Math.min(59, Math.max(0, +m[2]));
  if (step > 1) {
    minute = Math.round(minute / step) * step;
    if (minute > 59) minute -= step;
  }
  return { hour, minute };
}

/** Scroll a column so its selected option lands in the vertical middle (app.js `center`). */
function centerColumn(col: HTMLDivElement | null) {
  if (!col || !col.clientHeight) return;
  const opt = col.querySelector<HTMLElement>(".wb-timepicker__opt.is-selected");
  if (!opt) return;
  col.scrollTop +=
    opt.getBoundingClientRect().top -
    col.getBoundingClientRect().top -
    col.clientHeight / 2 +
    opt.offsetHeight / 2;
}

/**
 * TimePicker — the web-builder `.wb-timepicker`: iOS-style scroll columns (hour :
 * minute, 24-hour) where the selected option is a solid neutral chip. Ports app.js's
 * initTimePicker: the option lists are generated, clicking one selects it and emits
 * "HH:MM", and the selected chip is scrolled to each column's centre on mount and on
 * every change (guarded by `clientHeight`, so it no-ops inside a not-yet-laid-out
 * popover, then re-centres once it has height). No popup — pick a value inline.
 *
 * Controlled (`value`) or uncontrolled (`defaultValue`); values are "HH:MM".
 */
export function TimePicker({
  value,
  defaultValue,
  onChange,
  minuteStep = 1,
  hourLabel = "Giờ",
  minuteLabel = "Phút",
  className,
}: {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Minute granularity (e.g. 5 → 00, 05, 10 …). */
  minuteStep?: number;
  hourLabel?: string;
  minuteLabel?: string;
  className?: string;
}) {
  const step = Math.max(1, Math.floor(minuteStep) || 1);
  const [internal, setInternal] = useState(defaultValue ?? "09:00");
  const current = value ?? internal;
  const { hour, minute } = parseTime(current, step);

  const hours = useMemo(() => seq(0, 23), []);
  const minutes = useMemo(() => seq(0, 59, step), [step]);

  const hourCol = useRef<HTMLDivElement>(null);
  const minuteCol = useRef<HTMLDivElement>(null);

  // Re-centre whenever the selection changes (and on first layout).
  useLayoutEffect(() => {
    centerColumn(hourCol.current);
    centerColumn(minuteCol.current);
  }, [hour, minute]);

  const commit = (h: number, m: number) => {
    const next = `${pad(h)}:${pad(m)}`;
    if (value === undefined) setInternal(next);
    onChange?.(next);
  };

  return (
    <div className={cn("wb-timepicker", className)}>
      <div
        ref={hourCol}
        className="wb-timepicker__col wb-scroll-y"
        data-tp="hour"
        aria-label={hourLabel}
      >
        {hours.map((h) => (
          <button
            key={h}
            type="button"
            className={cn("wb-timepicker__opt", h === hour && "is-selected")}
            onClick={() => commit(h, minute)}
          >
            {pad(h)}
          </button>
        ))}
      </div>
      <span className="wb-timepicker__sep">:</span>
      <div
        ref={minuteCol}
        className="wb-timepicker__col wb-scroll-y"
        data-tp="minute"
        aria-label={minuteLabel}
      >
        {minutes.map((m) => (
          <button
            key={m}
            type="button"
            className={cn("wb-timepicker__opt", m === minute && "is-selected")}
            onClick={() => commit(hour, m)}
          >
            {pad(m)}
          </button>
        ))}
      </div>
    </div>
  );
}
