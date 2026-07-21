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
 * `weight` (0..1, from `rankTags`) inks the chip by how much the ledger actually
 * uses that tag: a heavily-used tag darkens toward the text colour, a rarely-used
 * one fades back into the surface. Emphasis by CONTRAST, never by hue — so it
 * inverts by itself on dark, where "more used" means lighter.
 *
 * Pass `tinted` on the surfaces that are ABOUT the tags themselves (the tag
 * manager, the tag picker) — there the hue is the tag's identity, not decoration.
 */
export function TagChip({
  tag,
  onRemove,
  tinted = false,
  weight,
  className,
}: {
  tag: Tag;
  onRemove?: () => void;
  tinted?: boolean;
  weight?: number;
  className?: string;
}) {
  const ranked = !tinted && weight != null;
  const style: CSSProperties = {};
  if (tinted) (style as Record<string, string>)["--wb-tag-color"] = tag.colorHex;
  if (ranked) {
    // The two ends of the ramp are the tokens' own neutrals: a tag nobody uses
    // sits near --wb-fg-subtle on a barely-there ground, the most-used one lands
    // at full --wb-fg on a solid-ish one.
    const w = Math.min(1, Math.max(0, weight));
    (style as Record<string, string>)["--cashy-tag-bg"] = `${(4 + w * 20).toFixed(1)}%`;
    (style as Record<string, string>)["--cashy-tag-fg"] = `${(52 + w * 48).toFixed(1)}%`;
  }

  return (
    <span
      className={cn(
        "wb-tag",
        tinted && "wb-tag--tinted",
        ranked && "cashy-tag--rank",
        className,
      )}
      style={tinted || ranked ? style : undefined}
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
