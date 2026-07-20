import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { Tag } from "@/types";

/**
 * A user tag as a **tinted** `#`-chip in the tag's own bright hue (`wb-tag--tinted`
 * + `--wb-tag-color`), matching the web-builder tables page. The `#` prefix (CSS)
 * still marks it apart from a category capsule.
 */
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
      style={{ "--wb-tag-color": tag.colorHex } as CSSProperties}
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
