import { type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Coerce a spacing/size knob to a CSS length — a bare number means px. */
const len = (v: number | string) => (typeof v === "number" ? `${v}px` : v);

/**
 * Stack — the web-builder `wb-stack` (CSS §34): a vertical flex column with an
 * even gap, the vertical partner of Cluster. The gap reads from the
 * `--wb-stack-gap` custom property, so `gap` sets it inline (this is exactly how
 * cashy screens tune stacks today) and the shipped `--tight`/`--loose` presets
 * are surfaced as `variant`. `align` is the cross-axis (horizontal) placement;
 * the default stretch lets children fill the width. Kept thin on purpose — it
 * only picks the wb class and sets the gap variable.
 */
export function Stack({
  gap,
  variant,
  align,
  className,
  style,
  children,
  ...rest
}: {
  /** Vertical gap between children — overrides `variant`; a number means px. */
  gap?: number | string;
  /** Preset gaps the CSS ships: `tight` (8px) or `loose` (22px). */
  variant?: "tight" | "loose";
  /** Cross-axis (horizontal) placement; default stretches children full width. */
  align?: "start" | "center" | "end";
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "wb-stack",
        variant && `wb-stack--${variant}`,
        align && `wb-stack--${align}`,
        className,
      )}
      style={gap != null ? ({ ...style, "--wb-stack-gap": len(gap) } as CSSProperties) : style}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * Cluster — the web-builder `wb-cluster` (CSS §26): a horizontal row that wraps.
 * `justify` distributes items along the main axis (incl. `between` for the
 * common label-left / value-right split), `align` sets the cross-axis when items
 * differ in height (default middle), and `gap` sets the inline gap — matching how
 * cashy screens already pass `style={{ gap }}`. `wrap={false}` pins one row
 * (`--nowrap`); `stretch` gives equal-width children that fill the row.
 */
export function Cluster({
  justify,
  align,
  gap,
  wrap = true,
  stretch = false,
  className,
  style,
  children,
  ...rest
}: {
  /** Main-axis distribution; `between` is the label · value split. */
  justify?: "start" | "end" | "center" | "between" | "around" | "evenly";
  /** Cross-axis alignment for uneven-height items (default middle). */
  align?: "top" | "middle" | "bottom" | "baseline";
  /** Inline gap between items; a number means px. */
  gap?: number | string;
  /** Allow wrapping to a new line (default true); false pins one row (`--nowrap`). */
  wrap?: boolean;
  /** Equal-width children filling the row (`--stretch`). */
  stretch?: boolean;
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "wb-cluster",
        justify && `wb-cluster--${justify}`,
        align && `wb-cluster--${align}`,
        !wrap && "wb-cluster--nowrap",
        stretch && "wb-cluster--stretch",
        className,
      )}
      style={gap != null ? { ...style, gap: len(gap) } : style}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * Grid — the web-builder `wb-grid` (CSS §26): an even 2-D grid. `columns` picks
 * the shipped template: `auto` fills by a minimum column width (tune with `min`
 * → `--wb-grid-min`) and wraps; `2`/`3`/`4` are fixed counts that collapse to a
 * single column on mobile; `equal` splits one row into equal columns. `gap`
 * overrides the 14px default. Use this (not Cluster `stretch`) for equal-HEIGHT
 * blocks — grid rows share a height, a flex row does not.
 */
export function Grid({
  columns = "auto",
  min,
  gap,
  className,
  style,
  children,
  ...rest
}: {
  /** Column template: auto-fill, a fixed 2/3/4, or `equal` (one equal-split row). */
  columns?: "auto" | 2 | 3 | 4 | "equal";
  /** Min column width for `columns="auto"` (→ `--wb-grid-min`); a number means px. */
  min?: number | string;
  /** Gap between cells, overriding the 14px default; a number means px. */
  gap?: number | string;
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  const hasStyle = min != null || gap != null || style != null;
  const merged = {
    ...style,
    ...(min != null ? { "--wb-grid-min": len(min) } : {}),
    ...(gap != null ? { gap: len(gap) } : {}),
  } as CSSProperties;
  return (
    <div
      className={cn("wb-grid", `wb-grid--${columns}`, className)}
      style={hasStyle ? merged : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * Container — the web-builder `wb-container` (CSS §34): a centred, max-width page
 * column. `variant` swaps the shipped widths (`narrow` 720px · default 1120px ·
 * `wide` 1320px); `max` sets an arbitrary cap via `--wb-container-max`.
 */
export function Container({
  variant,
  max,
  className,
  style,
  children,
  ...rest
}: {
  variant?: "narrow" | "wide";
  /** Arbitrary max width (→ `--wb-container-max`); a number means px. Overrides `variant`. */
  max?: number | string;
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("wb-container", variant && `wb-container--${variant}`, className)}
      style={
        max != null ? ({ ...style, "--wb-container-max": len(max) } as CSSProperties) : style
      }
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * Ratio — the web-builder `wb-ratio` (CSS §34): an aspect-ratio box for images,
 * embeds, maps, or receipt previews. The child is stretched to fill the box
 * (absolute inset:0), so pass a single element. `ratio` picks a shipped aspect
 * (16:9 default · 4:3 · 1:1).
 */
export function Ratio({
  ratio = "16x9",
  className,
  children,
  ...rest
}: {
  ratio?: "1x1" | "4x3" | "16x9";
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("wb-ratio", `wb-ratio--${ratio}`, className)} {...rest}>
      {children}
    </div>
  );
}
