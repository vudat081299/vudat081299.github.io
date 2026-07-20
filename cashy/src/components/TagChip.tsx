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
      className={cn("wb-tag wb-tag--tinted", className)}
      style={{ "--wb-tag-color": tag.colorHex } as React.CSSProperties}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          className="wb-tag__x"
          aria-label={`Bỏ tag ${tag.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        />
      )}
    </span>
  );
}
