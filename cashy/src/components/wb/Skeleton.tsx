import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const SHAPE_CLASS = {
  text: "wb-skeleton--text",
  title: "wb-skeleton--title",
  circle: "wb-skeleton--circle",
  box: "",
} as const;

/**
 * Skeleton — wraps the web-builder `wb-skeleton` shimmer placeholder (CSS §20),
 * the calmer alternative to a spinner for lists/cards while data loads. `shape`
 * picks a preset: `text` line, `title` heading, `circle` avatar, or a plain `box`
 * (no modifier). `width`/`height` override the size inline (numbers become px, as
 * React does for style values) — the same overrides the docs show via `style`.
 *
 * WHY a wrapper: it types the shape presets and the size overrides so a placeholder
 * is one prop instead of hand-picking the modifier class + an inline `style`. Pure
 * CSS animation.
 */
export function Skeleton({
  shape = "text",
  width,
  height,
  className,
  style,
  ...rest
}: {
  /** Preset: `text` line · `title` heading · `circle` avatar · `box` bare block. */
  shape?: "text" | "title" | "circle" | "box";
  /** Inline width override (number → px). */
  width?: number | string;
  /** Inline height override (number → px). */
  height?: number | string;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">) {
  return (
    <div
      className={cn("wb-skeleton", SHAPE_CLASS[shape], className)}
      style={{ width, height, ...style }}
      {...rest}
    />
  );
}

/**
 * SkeletonText — a stack of `wb-skeleton--text` lines with the last one shortened,
 * the loading-list pattern the skeleton page demonstrates. Uses only the existing
 * skeleton classes; `lines` sets the count and `lastWidth` the final line's width.
 */
export function SkeletonText({
  lines = 3,
  lastWidth = "60%",
  className,
  ...rest
}: {
  /** Number of text lines to render. */
  lines?: number;
  /** Width of the final line when there is more than one (the rest are full width). */
  lastWidth?: number | string;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">) {
  const count = Math.max(0, lines);
  return (
    <div className={className} {...rest}>
      {Array.from({ length: count }, (_unused, i) => (
        <Skeleton
          key={i}
          shape="text"
          width={i === count - 1 && count > 1 ? lastWidth : undefined}
        />
      ))}
    </div>
  );
}
