import { type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Tag — wraps the web-builder `wb-tag` hashtag chip (CSS §2.5). Same family as
 * Capsule but a tag ALWAYS shows a leading "#" (added by the CSS `::before`, so
 * pass the bare label as children). Three shapes (pill · rect · notch), the
 * semantic tones, a custom per-category hue (`--tinted`), a solid emphasis, and
 * three sizes.
 *
 * WHY a wrapper: it types the shape/tone/size axes and hand-rolls the two
 * interactive bits the raw markup only hints at — the `wb-tag__x` remove button
 * (`onRemove`) with its own stopPropagation so removing never fires a surrounding
 * tag click, and a `selected` toggle that reuses the `--solid` emphasis fill as
 * the active look (there's no separate "active" class) and exposes `aria-pressed`
 * so a selectable tag is an honest toggle. No external libs, no app.js.
 */
export function Tag({
  children,
  shape = "pill",
  tone = "neutral",
  color,
  solid = false,
  selected,
  size = "md",
  onRemove,
  removeLabel = "Xoá",
  className,
  style,
  ...rest
}: {
  /** The bare label — the leading "#" is drawn by CSS, don't include it. */
  children: ReactNode;
  shape?: "pill" | "rect" | "notch";
  /** Semantic tone. Ignored when `color` (a custom hue) is set. */
  tone?: "neutral" | "success" | "danger" | "warning" | "info";
  /** Custom category hue (e.g. `#0d9488`) → `--tinted`. */
  color?: string;
  /** `--solid` high-emphasis fill (neutral black, or full-strength tone/hue). */
  solid?: boolean;
  /** Selectable/active state: renders the solid emphasis look + sets aria-pressed. */
  selected?: boolean;
  size?: "sm" | "md" | "lg";
  /** When set, renders the `wb-tag__x` remove button that calls this on click. */
  onRemove?: () => void;
  /** Accessible label for the remove button. */
  removeLabel?: string;
} & HTMLAttributes<HTMLSpanElement>) {
  const tinted = color != null;
  // `selected` and `solid` both read as emphasis, so both light up the solid fill.
  const isSolid = solid || selected === true;
  const cls = cn(
    "wb-tag",
    shape === "rect" && "wb-tag--rect",
    shape === "notch" && "wb-tag--notch",
    tinted && "wb-tag--tinted",
    !tinted && tone !== "neutral" && `wb-tag--${tone}`,
    isSolid && "wb-tag--solid",
    size === "sm" && "wb-tag--sm",
    size === "lg" && "wb-tag--lg",
    className,
  );

  const mergedStyle: CSSProperties = tinted
    ? { ["--wb-tag-color" as string]: color, ...style }
    : (style ?? {});

  return (
    <span
      className={cls}
      style={mergedStyle}
      aria-pressed={selected}
      {...rest}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          className="wb-tag__x"
          aria-label={removeLabel}
          onClick={(e) => {
            // Don't let the × bubble up to a selectable tag's own click handler.
            e.stopPropagation();
            onRemove();
          }}
        />
      )}
    </span>
  );
}

/**
 * TagList — wraps `wb-tags`, the wrapping flex row that groups several tags
 * (a transaction's labels, a filter bar). Purely a layout container.
 */
export function TagList({
  children,
  className,
  ...rest
}: {
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("wb-tags", className)} {...rest}>
      {children}
    </div>
  );
}
