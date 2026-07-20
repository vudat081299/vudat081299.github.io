import { useEffect, useState } from "react";
import { Popover } from "@/components/wb/Popover";

// Vietnamese, Monday-first (matches the app's date heads).
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const pad = (n: number) => String(n).padStart(2, "0");
const key = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

/**
 * Date field on the web-builder `wb-calendar` component (month grid) hosted in a
 * `wb-popover` — replaces the native `<input type="date">`. Value is a
 * `YYYY-MM-DD` string; the whole month-grid is rendered in React (no date lib).
 */
export function DatePicker({
  value,
  onChange,
}: {
  value: string; // YYYY-MM-DD
  onChange: (v: string) => void;
}) {
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const seed = valid ? value : key(new Date());
  const [sy, sm, sd] = seed.split("-").map(Number);

  const [view, setView] = useState<{ y: number; m: number }>({ y: sy, m: sm - 1 });
  useEffect(() => {
    setView({ y: sy, m: sm - 1 });
  }, [seed, sy, sm]);

  const todayKey = key(new Date());

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

  const display = `${pad(sd)}/${pad(sm)}/${sy}`;

  return (
    <Popover
      trigger={({ toggle }) => (
        <button
          type="button"
          className="wb-input"
          onClick={toggle}
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", textAlign: "left" }}
        >
          <span className="wb-ico wb-ico--sm" style={{ color: "var(--wb-fg-muted)" }}>
            calendar_today
          </span>
          {display}
        </button>
      )}
    >
      {({ close }) => (
        <div className="wb-calendar" style={{ "--wb-cal-cell": "34px" } as React.CSSProperties}>
          <div className="wb-calendar__head">
            <button type="button" className="wb-calendar__nav" aria-label="Tháng trước" onClick={prevMonth}>
              <span className="wb-ico">chevron_left</span>
            </button>
            <span className="wb-calendar__title">
              Tháng {view.m + 1}, {view.y}
            </span>
            <button type="button" className="wb-calendar__nav" aria-label="Tháng sau" onClick={nextMonth}>
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
              const muted = dt.getMonth() !== view.m;
              const cls =
                "wb-calendar__day" +
                (k === value ? " is-selected" : "") +
                (muted ? " is-muted" : "") +
                (k === todayKey && k !== value ? " is-today" : "");
              return (
                <button
                  key={k}
                  type="button"
                  className={cls}
                  onClick={() => {
                    onChange(k);
                    close();
                  }}
                >
                  {dt.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Popover>
  );
}
