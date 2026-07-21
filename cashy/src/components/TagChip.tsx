import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { Tag } from "@/types";

/**
 * A user tag as a `#`-chip. **Neutral by default** — per the colour ladder (§1)
 * a tag is trung tính unless it genuinely owns a hue, and a table where every
 * row carries two or three coloured chips is exactly the "rắc màu bừa" the
 * ladder exists to stop. The `#` prefix (CSS) already marks it apart from a
 * category capsule.
 *
 * Pass `tinted` on the surfaces that are ABOUT the tags themselves (the tag
 * manager, the tag picker) — there the hue is the tag's identity, not decoration.
 */
export function TagChip({
  tag,
  onRemove,
  tinted = false,
  className,
}: {
  tag: Tag;
  onRemove?: () => void;
  tinted?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("wb-tag", tinted && "wb-tag--tinted", className)}
      style={tinted ? ({ "--wb-tag-color": tag.colorHex } as CSSProperties) : undefined}
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
