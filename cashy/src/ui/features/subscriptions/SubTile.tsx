import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/ui/kit/icons";

/**
 * The rounded service tile: a `cashy-subtile` square holding a lucide glyph.
 *
 * `brand` lets the service's own hue onto the tile (via `--cashy-sub-c`); left
 * off, the tile stays neutral grey (house taste). `size` sets the square in px
 * (omit to keep the CSS default); `iconSize` sizes the glyph inside.
 */
export function SubTile({
  icon,
  colorHex,
  brand = false,
  size,
  iconSize = 16,
  className,
}: {
  icon: string;
  colorHex?: string;
  brand?: boolean;
  size?: number;
  iconSize?: number;
  className?: string;
}) {
  const style = {
    ...(brand && colorHex ? { "--cashy-sub-c": colorHex } : {}),
    ...(size != null ? { width: size, height: size } : {}),
  } as CSSProperties;
  return (
    <span className={cn("cashy-subtile", className)} style={style}>
      <Icon name={icon} size={iconSize} />
    </span>
  );
}
