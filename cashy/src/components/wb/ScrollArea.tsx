import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * ScrollArea — a theme-aware scroll container (wb-scroll-y / wb-scroll-x): a thin
 * neutral, pill scrollbar that follows light/dark instead of the bright OS
 * default. `axis` picks the overflow direction ("both" applies both classes);
 * `pad` adds the `--pad` tail so the last row can scroll clear of the bottom edge
 * (long lists, menus, sidebars). `maxHeight`/`maxWidth` are the usual clamps that
 * make the region actually scroll — passed inline since they are per-instance.
 */
export function ScrollArea({
  axis = "y",
  pad = false,
  maxHeight,
  maxWidth,
  className,
  style,
  children,
  ...rest
}: {
  axis?: "y" | "x" | "both";
  /** Extra bottom breathing room (`--pad`); applies to the vertical axis only. */
  pad?: boolean;
  maxHeight?: number | string;
  maxWidth?: number | string;
  className?: string;
  children?: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  const vertical = axis === "y" || axis === "both";
  const horizontal = axis === "x" || axis === "both";
  const mergedStyle: CSSProperties = { maxHeight, maxWidth, ...style };

  return (
    <div
      className={cn(
        vertical && "wb-scroll-y",
        horizontal && "wb-scroll-x",
        pad && vertical && "wb-scroll-y--pad",
        className,
      )}
      style={mergedStyle}
      {...rest}
    >
      {children}
    </div>
  );
}
