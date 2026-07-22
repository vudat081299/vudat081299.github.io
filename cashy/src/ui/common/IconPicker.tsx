import { cn } from "@/lib/utils";
import { Icon } from "@/ui/kit/icons";
import { ICON_CHOICES } from "@/ui/kit/icon-map";

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  return (
    <div
      className="wb-scroll-y"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(8, 1fr)",
        gap: 4,
        maxHeight: 160,
        padding: 6,
        border: "var(--wb-bw) solid var(--wb-border)",
        borderRadius: "var(--wb-radius-sm)",
      }}
    >
      {ICON_CHOICES.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => onChange(name)}
          className={cn(
            "wb-btn wb-btn--icon wb-btn--sm",
            value === name ? "wb-btn--secondary" : "wb-btn--ghost",
          )}
          aria-label={name}
        >
          <Icon name={name} size={16} />
        </button>
      ))}
    </div>
  );
}
