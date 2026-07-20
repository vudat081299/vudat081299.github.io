import { PERIODS, type PeriodKey } from "@/lib/period";

export function PeriodPicker({
  value,
  onChange,
}: {
  value: PeriodKey;
  onChange: (key: PeriodKey) => void;
}) {
  return (
    <span className="wb-select-wrap" style={{ width: 150 }}>
      <select
        className="wb-select"
        value={value}
        onChange={(e) => onChange(e.target.value as PeriodKey)}
      >
        {PERIODS.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </select>
      <span className="wb-ico">expand_more</span>
    </span>
  );
}
