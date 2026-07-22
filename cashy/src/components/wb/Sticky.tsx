import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Sticky — a thin wb-sticky wrapper that pins its content to the top (default)
 * or bottom edge of the nearest scroll container while the rest scrolls past
 * (CSS `position: sticky`, so it stays in flow then pins). `offset` feeds the
 * `--wb-sticky-gap` custom property — e.g. the navbar height when pinning under
 * a fixed app bar. Give the content a surface background yourself so scrolled
 * rows don't show through.
 */
export function Sticky({
  side = "top",
  offset,
  className,
  style,
  children,
  ...rest
}: {
  side?: "top" | "bottom";
  /** Gap from the pinned edge → `--wb-sticky-gap` (number = px). */
  offset?: number | string;
  className?: string;
  children?: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  const gap = typeof offset === "number" ? `${offset}px` : offset;
  const mergedStyle = {
    ...style,
    ...(gap != null ? { "--wb-sticky-gap": gap } : {}),
  } as CSSProperties;

  return (
    <div
      className={cn("wb-sticky", side === "bottom" && "wb-sticky--bottom", className)}
      style={mergedStyle}
      {...rest}
    >
      {children}
    </div>
  );
}
