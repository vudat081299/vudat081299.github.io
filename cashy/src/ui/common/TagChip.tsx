import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { Tag } from "@/domain/types";

// The gray scale isn't linear in its own number, so each token step maps to a
// hand-measured fg-over-surface percentage (the mix that reproduces --wb-gray-N
// on light). The rank formula can land between steps, so interpolate.
const SHADE_PCT: Record<number, number> = {
  100: 5.8,
  200: 11.3,
  300: 18.1,
  400: 39.6,
  500: 60.4,
  600: 73.9,
  700: 82.5,
  800: 93.5,
  900: 100,
};
function shadePct(shade: number): number {
  const s = Math.min(900, Math.max(100, shade));
  const lo = Math.floor(s / 100) * 100;
  const hi = Math.min(900, lo + 100);
  const t = hi === lo ? 0 : (s - lo) / (hi - lo);
  return SHADE_PCT[lo] + (SHADE_PCT[hi] - SHADE_PCT[lo]) * t;
}

/**
 * A user tag as a `#`-chip. **Neutral by default** — per the colour ladder (§1)
 * a tag is trung tính unless it genuinely owns a hue, and a table where every
 * row carries two or three coloured chips is exactly the "rắc màu bừa" the
 * ladder exists to stop. The `#` prefix (CSS) already marks it apart from a
 * category capsule.
 *
 * `shade` (100..900, from `rankTags`) inks the chip to that gray-token step by
 * how much the ledger uses the tag: w900 (near-black) for the most-used, stepping
 * down to w100 (the category-capsule grey) for the rest. Emphasis by CONTRAST,
 * never by hue — and it's mixed through --wb-fg/--wb-surface rather than the fixed
 * gray tokens, so it inverts by itself on dark, where "more used" means lighter.
 *
 * Pass `tinted` on the surfaces that are ABOUT the tags themselves (the tag
 * manager, the tag picker) — there the hue is the tag's identity, not decoration.
 */
export function TagChip({
  tag,
  onRemove,
  tinted = false,
  shade,
  className,
}: {
  tag: Tag;
  onRemove?: () => void;
  tinted?: boolean;
  shade?: number;
  className?: string;
}) {
  const ranked = !tinted && shade != null;
  const style: CSSProperties = {};
  if (tinted) (style as Record<string, string>)["--wb-tag-color"] = tag.colorHex;
  if (ranked) {
    // Render the gray-token step as that token: mix --wb-fg over --wb-surface at
    // the percentage that reproduces --wb-gray-<shade> on light (w900 == --wb-fg
    // at 100%, w100 ≈ the capsule ground at ~6%). Going through fg/surface — not
    // the fixed tokens — keeps the whole ramp inverting on dark.
    const bg = shadePct(shade);
    // Dark chips need a light ink; lighter chips keep the capsule's ~gray-700 ink.
    const fg = bg >= 50 ? 6 : 83;
    (style as Record<string, string>)["--cashy-tag-bg"] = `${bg.toFixed(1)}%`;
    (style as Record<string, string>)["--cashy-tag-fg"] = `${fg.toFixed(1)}%`;
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
          aria-label={`Remove tag ${tag.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        />
      )}
    </span>
  );
}
