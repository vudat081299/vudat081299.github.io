import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SWATCHES } from "@/lib/palette";

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SWATCHES.map((hex) => (
        <button
          key={hex}
          type="button"
          onClick={() => onChange(hex)}
          className={cn(
            "grid size-7 place-items-center rounded-md ring-offset-2 ring-offset-background transition",
            value === hex && "ring-2 ring-foreground/40",
          )}
          style={{ background: hex }}
          aria-label={hex}
        >
          {value === hex && <Check size={14} className="text-white" />}
        </button>
      ))}
    </div>
  );
}
