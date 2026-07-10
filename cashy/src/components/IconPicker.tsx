import { cn } from "@/lib/utils";
import { Icon, ICON_CHOICES } from "@/lib/icons";

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  return (
    <div className="grid max-h-40 grid-cols-8 gap-1 overflow-y-auto rounded-md border p-2">
      {ICON_CHOICES.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => onChange(name)}
          className={cn(
            "grid aspect-square place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground",
            value === name && "bg-accent text-foreground ring-1 ring-foreground/30",
          )}
          aria-label={name}
        >
          <Icon name={name} size={16} />
        </button>
      ))}
    </div>
  );
}
