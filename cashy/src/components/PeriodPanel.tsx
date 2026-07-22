import { useId, type CSSProperties } from "react";
import { PERIODS, periodNote, type PeriodKey, type Range } from "@/lib/period";
import { RangeCalendar } from "@/components/RangeCalendar";
import { DateRangeInput } from "@/components/DateRangeInput";

/**
 * The period chooser body, shared by the header PeriodPicker and any filter that
 * scopes by date. Three ways in, top to bottom: rolling-day presets, whole-month
 * presets, and a hand-picked range (typed OR clicked on the calendar). Every
 * preset carries a muted note of the concrete window it resolves to — "Last 3
 * months" spells out "Tháng 5 – tháng 7" — so the scope is never a guess.
 */
export function PeriodPanel({
  value,
  custom,
  onChange,
  onPick,
}: {
  value: PeriodKey;
  custom: Range | null;
  onChange: (key: PeriodKey, custom?: Range | null) => void;
  /** fired after any pick — a popover host uses it to close */
  onPick?: () => void;
}) {
  const name = useId();
  const now = new Date();

  const presetRow = (p: { key: PeriodKey; label: string }) => {
    const note = periodNote(p.key, now);
    return (
      <label key={p.key} className="wb-radio wb-menu__item cashy-period-row">
        <input
          type="radio"
          name={name}
          checked={value === p.key}
          onChange={() => {
            onChange(p.key, null);
            onPick?.();
          }}
        />
        <span className="cashy-period-row__label">{p.label}</span>
        {note && <span className="cashy-period-row__note">{note}</span>}
      </label>
    );
  };

  const dayPresets = PERIODS.filter((p) => p.group === "day");
  const monthPresets = PERIODS.filter((p) => p.group === "month");

  return (
    <div>
      <p className="wb-filter-pop__title">Gần đây</p>
      <div className="wb-stack" style={{ "--wb-stack-gap": "1px" } as CSSProperties}>
        {dayPresets.map(presetRow)}
      </div>

      <p className="wb-filter-pop__title">Theo tháng</p>
      <div className="wb-stack" style={{ "--wb-stack-gap": "1px" } as CSSProperties}>
        {monthPresets.map(presetRow)}
      </div>

      <div className="wb-menu__sep" />
      <p className="wb-filter-pop__title">Khoảng tuỳ chọn</p>
      {/* Type the range in a segmented dd/mm/yyyy – dd/mm/yyyy field (inked "/"),
          OR click it out on the calendar. The two stay in sync: typing a valid
          range applies live and moves the calendar; clicking the calendar fills
          the field. Typed edits keep the panel open (preview); Enter or a second
          calendar click commits and closes. */}
      <div className="cashy-range-type">
        <DateRangeInput
          value={value === "custom" ? custom : null}
          onChange={(r) => onChange("custom", r)}
          onCommit={(r) => {
            onChange("custom", r);
            onPick?.();
          }}
        />
      </div>

      <div style={{ marginTop: 10 }}>
        <RangeCalendar
          value={value === "custom" ? custom : null}
          onChange={(r) => {
            onChange("custom", r);
            onPick?.();
          }}
        />
      </div>
    </div>
  );
}
