import { useId, useState, type CSSProperties } from "react";
import { PERIODS, periodNote, type PeriodKey, type Range } from "@/lib/period";
import { parseRangeText } from "@/lib/date";
import { RangeCalendar } from "@/components/RangeCalendar";

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
  const [rangeText, setRangeText] = useState("");
  const [err, setErr] = useState(false);

  const applyText = () => {
    const t = rangeText.trim();
    if (!t) return;
    const r = parseRangeText(t);
    if (!r) {
      setErr(true);
      return;
    }
    setErr(false);
    onChange("custom", r);
    onPick?.();
  };

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
      <div className="cashy-range-type">
        <input
          className={err ? "wb-input is-invalid" : "wb-input"}
          value={rangeText}
          onChange={(e) => {
            setRangeText(e.target.value);
            if (err) setErr(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applyText();
            }
          }}
          placeholder="1/7/2026 – 15/7/2026"
          aria-label="Nhập khoảng ngày"
        />
        <button type="button" className="wb-btn wb-btn--sm" onClick={applyText}>
          Áp dụng
        </button>
      </div>
      {err && (
        <p className="cashy-range-err">Định dạng: ngày/tháng/năm – ngày/tháng/năm</p>
      )}

      <div style={{ marginTop: 8 }}>
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
