import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tag } from "@/types";

export function TagChip({
  tag,
  onRemove,
  className,
}: {
  tag: Tag;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[4px] border px-1.5 py-px text-xs font-medium leading-5",
        className,
      )}
      style={{ borderColor: tag.colorHex + "55", color: tag.colorHex }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ background: tag.colorHex }}
      />
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="-mr-0.5 grid size-3.5 place-items-center rounded-full opacity-60 hover:opacity-100"
          aria-label={`Bỏ tag ${tag.name}`}
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}
