import { type ReactNode, type SVGProps } from "react";
import { cn } from "@/lib/utils";

/** One month's pair: a bar value (e.g. spend) and a line value (e.g. income). */
export type ComboPoint = {
  label: ReactNode;
  bar: number;
  line: number;
  /** Tooltip text for the line point; falls back to `String(line)`. */
  lineDisplay?: ReactNode;
};

// Fixed plot frame — matches the combo demo's 0 0 340 172 viewBox.
const VB_W = 340;
const VB_H = 172;
const LEFT = 34;
const RIGHT = 328;
const TOP = 22;
const BASE = 140;
const MID = 81;
const LABEL_Y = 158;

/**
 * ComboChart — the "cột + đường" chart from pages/charts.html: `<rect>` columns
 * for one series (spend) with a `wb-series-line` + hover `wb-point`s for another
 * (income) laid over the SAME grid and axis, so you can read at a glance which
 * months income beat spend (line above the columns).
 *
 * WHY its own component (not a LineChart flag): the source draws the bars FIRST
 * then overlays the line — a fixed two-layer z-order that would only muddy the
 * line chart's API. Both series share one `max`, computed from whichever is
 * taller unless a ceiling is passed. Colours are `--wb-chart-*` tokens
 * (expense/income by default).
 */
export function ComboChart({
  points,
  max,
  barColor = "var(--wb-chart-expense)",
  lineColor = "var(--wb-chart-income)",
  showGrid = true,
  showAxis = true,
  formatAxis = (v) => String(Math.round(v)),
  className,
  ...rest
}: {
  points: ComboPoint[];
  /** Shared scale ceiling. Defaults to the tallest bar-or-line value. */
  max?: number;
  /** Column colour — a `--wb-chart-*` token (default expense red). */
  barColor?: string;
  /** Line/dot colour — a `--wb-chart-*` token (default income green). */
  lineColor?: string;
  showGrid?: boolean;
  showAxis?: boolean;
  formatAxis?: (v: number) => ReactNode;
} & Omit<SVGProps<SVGSVGElement>, "points">) {
  const n = points.length;
  const ceiling =
    max ?? (Math.max(0, ...points.flatMap((p) => [p.bar, p.line])) || 1);
  const colW = n > 0 ? (RIGHT - LEFT) / n : 0;
  const barW = Math.min(22, colW * 0.5);
  const plotH = BASE - TOP;

  const centerAt = (i: number) => LEFT + colW * (i + 0.5);
  const yAt = (v: number) => BASE - Math.min(1, Math.max(0, v / ceiling)) * plotH;

  const linePts = points
    .map((p, i) => `${centerAt(i).toFixed(1)},${yAt(p.line).toFixed(1)}`)
    .join(" ");

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

      {/* 1) columns (bar series) first */}
      {points.map((p, i) => {
        const h = Math.min(1, Math.max(0, p.bar / ceiling)) * plotH;
        return (
          <rect
            key={i}
            x={centerAt(i) - barW / 2}
            y={BASE - h}
            width={barW}
            height={h}
            rx={3}
            style={{ fill: barColor, opacity: 0.9 }}
          />
        );
      })}

      {/* 2) line series overlaid, with hover points */}
      {linePts && <polyline className="wb-series-line" style={{ stroke: lineColor }} points={linePts} />}
      {points.map((p, i) => {
        const cx = centerAt(i);
        const cy = yAt(p.line);
        return (
          <g className="wb-point" key={i}>
            <circle className="wb-point__hit" cx={cx} cy={cy} r={13} />
            <circle className="wb-series-dot" style={{ fill: lineColor }} cx={cx} cy={cy} r={3.5} />
            <g className="wb-point__tip" transform={`translate(${cx},${cy})`}>
              <rect x={-20} y={-26} width={40} height={17} rx={4} />
              <text x={0} y={-14} textAnchor="middle">
                {p.lineDisplay ?? String(p.line)}
              </text>
            </g>
          </g>
        );
      })}

      {showAxis &&
        points.map((p, i) => (
          <text className="wb-axis-label" x={centerAt(i)} y={LABEL_Y} textAnchor="middle" key={i}>
            {p.label}
          </text>
        ))}
    </svg>
  );
}
