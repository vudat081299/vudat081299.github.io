import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PERIODS, type PeriodKey } from "@/lib/period";

export function PeriodPicker({
  value,
  onChange,
}: {
  value: PeriodKey;
  onChange: (key: PeriodKey) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PeriodKey)}>
      <SelectTrigger className="h-8 w-[132px] text-[13px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PERIODS.map((p) => (
          <SelectItem key={p.key} value={p.key} className="text-[13px]">
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
