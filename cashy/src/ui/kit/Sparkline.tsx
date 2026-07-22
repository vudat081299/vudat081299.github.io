import { type SVGProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Sparkline — the tiny inline trend line (`wb-spark`) that tucks into a KPI tile
 * on pages/charts.html ("Sparkline — trong thẻ KPI"). A single `<path>` on a
 * fixed 84×26 viewBox with `preserveAspectRatio="none"`, so it stretches to
 * whatever width the tile gives it.
 *
 * WHY a wrapper: the SVG is pure geometry — the source hard-codes the `d`
 * string, which is exactly the bit that changes per data set. This takes plain
 * `values` and derives the path (auto-scaled to its own min/max), so callers
 * never hand-plot points. Colour comes from a `--wb-chart-*` token (green for an
 * up trend, red for spend) since direction is the only thing that carries
 * meaning here.
 */
export function Sparkline({
  values,
  color = "var(--wb-chart-income)",
  width = 84,
  height = 26,
  className,
  ...rest
}: {
  /** The series to trace, oldest → newest. Auto-scaled to its own min/max. */
  values: number[];
  /** Stroke colour — pass a `--wb-chart-*` token (default income green). */
  color?: string;
  /** viewBox width/height; the rendered size still fills the container. */
  width?: number;
  height?: number;
} & Omit<SVGProps<SVGSVGElement>, "color" | "values">) {
  const pad = 2;
  const n = values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1; // flat series → a centred horizontal line
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const d = values
    .map((v, i) => {
      const x = n <= 1 ? pad : pad + (i * innerW) / (n - 1);
      const y = pad + (1 - (v - min) / span) * innerH;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      className={cn("wb-spark", className)}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      {...rest}
    >
      <path style={{ stroke: color }} d={d} />
    </svg>
  );
}
