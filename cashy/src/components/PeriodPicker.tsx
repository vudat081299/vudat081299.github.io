import type { CSSProperties } from "react";
import { PERIODS, periodLabel, type PeriodKey, type Range } from "@/lib/period";
import { Popover } from "@/components/wb/Popover";
import { RangeCalendar } from "@/components/RangeCalendar";

/**
 * The period scope: five presets **and** an arbitrary range. A `<select>` could
 * only ever offer the presets, which is why picking "01/07 → 12/07" was
 * impossible before — so the control is a popover holding the preset list plus
 * the docs' range calendar, and the trigger simply states the window in force.
 */
export function PeriodPicker({
  value,
  custom,
  onChange,
}: {
  value: PeriodKey;
  custom: Range | null;
  onChange: (key: PeriodKey, custom?: Range | null) => void;
}) {
  return (
    <Popover
      panelWidth={288}
      align="right"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          className={open ? "wb-btn wb-btn--secondary is-active" : "wb-btn wb-btn--secondary"}
          style={{ gap: 6 }}
          onClick={toggle}
        >
          <span className="wb-ico wb-ico--sm">calendar_month</span>
          {periodLabel(value, custom)}
          <span className="wb-ico wb-ico--xs">expand_more</span>
        </button>
      )}
    >
      {({ close }) => (
        <div className="wb-menu wb-filter-pop" style={{ border: 0, boxShadow: "none" }}>
          <div className="wb-stack" style={{ "--wb-stack-gap": "1px" } as CSSProperties}>
            {PERIODS.map((p) => (
              <label key={p.key} className="wb-radio wb-menu__item">
                <input
                  type="radio"
                  name="cashy-period-picker"
                  checked={value === p.key}
                  onChange={() => {
                    onChange(p.key, null);
                    close();
                  }}
                />
                {p.label}
              </label>
            ))}
          </div>

          <div className="wb-menu__sep" />
          <p className="wb-filter-pop__title">Custom range</p>
          <RangeCalendar
            value={value === "custom" ? custom : null}
            onChange={(r) => {
              onChange("custom", r);
              close();
            }}
          />
        </div>
      )}
    </Popover>
  );
}
