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
    <div className="wb-swatches">
      {SWATCHES.map((hex) => (
        <button
          key={hex}
          type="button"
          onClick={() => onChange(hex)}
          className={cn("wb-swatch", value === hex && "is-selected")}
          style={{ "--wb-swatch-color": hex } as React.CSSProperties}
          aria-label={hex}
        />
      ))}
    </div>
  );
}
