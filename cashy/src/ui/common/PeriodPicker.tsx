import { PERIODS, periodLabel, periodNote, type PeriodKey, type Range } from "@/domain/period";
import { Popover } from "@/ui/kit/Popover";
import { PeriodPanel } from "@/ui/common/PeriodPanel";

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
      // Wide enough that a preset row keeps its label and its resolved-range note
      // ("Last 3 months" · "Tháng 5 – tháng 7") on ONE line, and that the six
      // segments of dd/mm/yyyy – dd/mm/yyyy sit in the field without crowding. At
      // 360 both wrapped to a second line and dragged the panel taller.
      panelWidth={420}
      align="right"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          className={open ? "wb-btn wb-btn--secondary is-active" : "wb-btn wb-btn--secondary"}
          style={{ gap: 6 }}
          onClick={toggle}
        >
          {/* `calendar_today` (a plain frame), not `calendar_month` — the latter
              draws a grid of date dots that turns to mush at 18px and reads busy
              next to the label. This also matches the DatePicker's trigger. */}
          <span className="wb-ico wb-ico--sm">calendar_today</span>
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
