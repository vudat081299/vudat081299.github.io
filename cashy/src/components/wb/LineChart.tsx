import { type ReactNode, type SVGProps } from "react";
import { cn } from "@/lib/utils";

/** One plotted point: an x-axis label, a value, and optional tooltip text. */
export type LinePoint = {
  label: ReactNode;
  value: number;
  /** Tooltip text; falls back to `format(value)` then `String(value)`. */
  display?: ReactNode;
};

// Fixed plot frame — matches charts.html's 0 0 340 172 viewBox exactly.
const VB_W = 340;
const VB_H = 172;
const LEFT = 40; // x of the y-axis / first point
const RIGHT = 320; // x of the last point
const TOP = 22; // y at full scale (`max`)
const BASE = 140; // y at zero (the axis line)
const MID = 81; // y of the mid gridline
const LABEL_Y = 158; // x-axis label baseline

/**
 * LineChart — the line/area spend-trend chart from pages/charts.html ("Đường /
 * vùng"): a `wb-chart__svg` with two `wb-grid-line`s, a baseline `wb-axis-line`,
 * a shaded `wb-series-area`, the `wb-series-line` polyline, and per-point
 * `wb-point` groups whose `wb-point__tip` fades in on hover (pure SVG `:hover`,
 * no JS).
 *
 * WHY a wrapper: the source hand-plots every coordinate and repeats the same
 * ~6-line point-and-tooltip group per data point — precisely the mechanical part
 * that should be derived. This takes `points` (+ an optional scale ceiling) and
 * computes the geometry, so a screen passes numbers, not SVG paths. Colour is a
 * single `--wb-chart-*` token; wrap the element in `wb-chart-scheme--mono` via
 * `className` for the neutral variant the page also shows.
 */
export function LineChart({
  points,
  max,
  color = "var(--wb-chart-expense)",
  area = true,
  showGrid = true,
  showAxis = true,
  format,
  formatAxis = (v) => String(Math.round(v)),
  className,
  ...rest
}: {
  points: LinePoint[];
  /** Scale ceiling (top of the plot). Defaults to the largest value. */
  max?: number;
  /** Line/area/dot colour — a `--wb-chart-*` token (default expense red). */
  color?: string;
  /** Fill the translucent `wb-series-area` under the line. */
  area?: boolean;
  showGrid?: boolean;
  /** Draw the baseline axis, y-tick labels and x-axis labels. */
  showAxis?: boolean;
  /** Format a value for its tooltip when a point has no `display`. */
  format?: (v: number) => ReactNode;
  /** Format the three y-axis tick labels (top / mid / 0). */
  formatAxis?: (v: number) => ReactNode;
} & Omit<SVGProps<SVGSVGElement>, "color" | "points">) {
  const ceiling = max ?? (Math.max(0, ...points.map((p) => p.value)) || 1);
  const n = points.length;

  const xAt = (i: number) => (n <= 1 ? LEFT : LEFT + (i * (RIGHT - LEFT)) / (n - 1));
  const yAt = (v: number) => {
    const ratio = Math.min(1, Math.max(0, v / ceiling));
    return BASE - ratio * (BASE - TOP);
  };

  const coords = points.map((p, i) => ({ ...p, x: xAt(i), y: yAt(p.value) }));
  const linePts = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const areaD =
    coords.length > 0
      ? `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)} ` +
        coords
          .slice(1)
          .map((c) => `L${c.x.toFixed(1)},${c.y.toFixed(1)}`)
          .join(" ") +
        ` L${coords[coords.length - 1].x.toFixed(1)},${BASE} L${coords[0].x.toFixed(1)},${BASE} Z`
      : "";

  return (
    <svg
      className={cn("wb-chart__svg", className)}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      {...rest}
    >
      {showGrid && (
        <>
          <line className="wb-grid-line" x1={LEFT} y1={TOP} x2={RIGHT} y2={TOP} />
          <line className="wb-grid-line" x1={LEFT} y1={MID} x2={RIGHT} y2={MID} />
        </>
      )}
      {showAxis && (
        <>
          <line className="wb-axis-line" x1={LEFT} y1={BASE} x2={RIGHT} y2={BASE} />
          <text className="wb-axis-label" x={LEFT - 6} y={TOP + 4} textAnchor="end">
            {formatAxis(ceiling)}
          </text>
          <text className="wb-axis-label" x={LEFT - 6} y={MID + 4} textAnchor="end">
            {formatAxis(ceiling / 2)}
          </text>
          <text className="wb-axis-label" x={LEFT - 6} y={BASE + 4} textAnchor="end">
            {formatAxis(0)}
          </text>
        </>
      )}

      {area && areaD && <path className="wb-series-area" style={{ fill: color }} d={areaD} />}
      {linePts && <polyline className="wb-series-line" style={{ stroke: color }} points={linePts} />}

      {coords.map((c, i) => (
        <g className="wb-point" key={i}>
          <circle className="wb-point__hit" cx={c.x} cy={c.y} r={14} />
          <circle className="wb-series-dot" style={{ fill: color }} cx={c.x} cy={c.y} r={3.5} />
          <g className="wb-point__tip" transform={`translate(${c.x},${c.y})`}>
            <rect x={-20} y={-26} width={40} height={17} rx={4} />
            <text x={0} y={-14} textAnchor="middle">
              {c.display ?? format?.(c.value) ?? String(c.value)}
            </text>
          </g>
        </g>
      ))}

      {showAxis &&
        coords.map((c, i) => (
          <text className="wb-axis-label" x={c.x} y={LABEL_Y} textAnchor="middle" key={i}>
            {c.label}
          </text>
        ))}
    </svg>
  );
}
