import { PERIODS, periodLabel, periodNote, type PeriodKey, type Range } from "@/lib/period";
import { Popover } from "@/components/wb/Popover";
import { PeriodPanel } from "@/components/PeriodPanel";

/**
 * The period scope: presets (rolling-day + whole-month) AND an arbitrary range,
 * typed or clicked. The trigger states the window in force plus the concrete
 * dates it means ("Last 3 months · Tháng 5 – tháng 7"); the panel lives in
 * `PeriodPanel`, shared with anything else that scopes by date.
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
  const note = periodNote(value, new Date(), custom);
  const isPreset = PERIODS.some((p) => p.key === value);
  return (
    <Popover
      panelWidth={300}
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
          {/* The resolved window rides along so the label is never ambiguous.
              Skipped for custom, whose label already IS the exact dates. */}
          {note && isPreset && value !== "custom" && (
            <span className="cashy-period-btn__note">· {note}</span>
          )}
          <span className="wb-ico wb-ico--xs">expand_more</span>
        </button>
      )}
    >
      {({ close }) => (
        <div className="wb-menu wb-filter-pop cashy-period-pop" style={{ border: 0, boxShadow: "none" }}>
          <PeriodPanel value={value} custom={custom} onChange={onChange} onPick={close} />
        </div>
      )}
    </Popover>
  );
}
