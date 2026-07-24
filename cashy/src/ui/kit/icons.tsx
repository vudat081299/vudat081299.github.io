import type { CSSProperties } from "react";
import { Circle } from "lucide-react";
import { MAP } from "@/ui/kit/icon-map";

export function Icon({
  name,
  size = 16,
  className,
  style,
}: {
  name: string;
  size?: number;
  className?: string;
  /** inline style — e.g. `{ color }` to tint the stroke (lucide uses currentColor) */
  style?: CSSProperties;
}) {
  const Cmp = MAP[name] ?? Circle;
  return <Cmp size={size} className={className} style={style} strokeWidth={2} aria-hidden />;
}
