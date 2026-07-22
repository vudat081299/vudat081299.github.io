import { type ReactNode, type SVGProps } from "react";
import { cn } from "@/lib/utils";

/** One donut slice: a value (share of the total) with an optional colour. */
export type DonutSlice = {
  value: number;
  /** Slice colour; defaults to `--wb-chart-1..8` cycling by index. */
  color?: string;
};

// The donut is drawn on a fixed 0 0 140 140 viewBox centred at (70,70); the
// `size` prop only changes the rendered pixel box, not this coordinate space.
const CX = 70;
const CY = 70;

/**
 * Donut — the category-breakdown ring from pages/charts.html. Slices are
 * `<circle pathLength="100">`s whose `stroke-dasharray`/`-dashoffset` lay them
 * end-to-end (each = its share of the total, minus a thin gap for a clean seam),
 * rotated -90° so the first slice starts at 12 o'clock, over a `wb-donut__track`.
 * Optional centred value/label text sits in the hole.
 *
 * WHY a wrapper: the dash maths (cumulative offsets, per-slice gaps) is the
 * fiddly, error-prone part the source works out by hand for every slice. This
 * derives it from raw `slices`. Set `rounded` for the thin, pill-capped variant
 * (§35 `wb-arc--round`, wider gap) the page also shows; wrap in a
 * `wb-chart-scheme--mono/blue wb-chart-ramp--N` via `className` for single-hue.
 */
export function Donut({
  slices,
  size = 140,
  thickness,
  radius,
  gap,
  rounded = false,
  centerValue,
  centerLabel,
  className,
  ...rest
}: {
  slices: DonutSlice[];
  /** Rendered pixel size (square). */
  size?: number;
  /** Ring stroke width. Default 18 (solid) / 10 (rounded). */
  thickness?: number;
  /** Ring radius in viewBox units. Default 52 (solid) / 54 (rounded). */
  radius?: number;
  /** Gap between slices, in percent. Default 1 (solid) / 5.5 (rounded). */
  gap?: number;
  /** Thin, pill-capped slices (`wb-arc--round`) with a wider gap. */
  rounded?: boolean;
  /** Big number in the hole (`wb-donut__center-value`). */
  centerValue?: ReactNode;
  /** Small caption under it (`wb-donut__center-label`). */
  centerLabel?: ReactNode;
} & SVGProps<SVGSVGElement>) {
  const sw = thickness ?? (rounded ? 10 : 18);
  const r = radius ?? (rounded ? 54 : 52);
  const g = gap ?? (rounded ? 5.5 : 1);
  const total = slices.reduce((sum, s) => sum + s.value, 0) || 1;

  let cumulative = 0;
  const arcs = slices.map((s, i) => {
    const share = (s.value / total) * 100;
    const dash = Math.max(0, share - g);
    const offset = -cumulative;
    cumulative += share;
    return {
      dash,
      offset,
      color: s.color ?? `var(--wb-chart-${(i % 8) + 1})`,
    };
  });

  return (
    <svg
      className={cn("wb-chart", className)}
      width={size}
      height={size}
      viewBox="0 0 140 140"
      role="img"
      {...rest}
    >
      <g transform={`rotate(-90 ${CX} ${CY})`} fill="none" strokeWidth={sw}>
        <circle className="wb-donut__track" cx={CX} cy={CY} r={r} />
        {arcs.map((a, i) => (
          <circle
            key={i}
            className={rounded ? "wb-arc wb-arc--round" : undefined}
            cx={CX}
            cy={CY}
            r={r}
            pathLength={100}
            strokeDasharray={`${a.dash} 100`}
            strokeDashoffset={a.offset}
            style={{ stroke: a.color }}
          />
        ))}
      </g>
      {centerValue !== undefined && (
        <text className="wb-donut__center-value" x={CX} y={CY - 2}>
          {centerValue}
        </text>
      )}
      {centerLabel !== undefined && (
        <text className="wb-donut__center-label" x={CX} y={CY + 14}>
          {centerLabel}
        </text>
      )}
    </svg>
  );
}

/**
 * ProgressRing — a single-value gauge (budget used, savings goal) from the same
 * page: one pill-capped `wb-arc--round` arc over a `wb-ring__track`, with the
 * percentage/amount in the hole. Same dash technique as {@link Donut} but one
 * slice and no offset.
 *
 * WHY a wrapper AND `autoColor`: the source note says the fill should shift with
 * the level like a progress bar — chart-1 under ~80%, warning near the limit,
 * danger at/over 100%. Encoding that here means callers pass a raw value and get
 * the right semantic colour for free (opt out by passing an explicit `color`).
 */
export function ProgressRing({
  value,
  max = 100,
  color,
  autoColor = true,
  size = 140,
  thickness = 10,
  radius = 54,
  centerValue,
  centerLabel,
  className,
  ...rest
}: {
  /** Current amount (e.g. spent so far). */
  value: number;
  /** Full scale (e.g. the budget). Default 100. */
  max?: number;
  /** Explicit arc colour; overrides `autoColor`. */
  color?: string;
  /** Pick the colour by level (chart-1 → warning → danger). Default true. */
  autoColor?: boolean;
  size?: number;
  thickness?: number;
  radius?: number;
  centerValue?: ReactNode;
  centerLabel?: ReactNode;
} & Omit<SVGProps<SVGSVGElement>, "color">) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const dash = Math.min(100, Math.max(0, pct));
  const level =
    color ??
    (autoColor
      ? pct >= 100
        ? "var(--wb-danger)"
        : pct >= 80
          ? "var(--wb-warning)"
          : "var(--wb-chart-1)"
      : "var(--wb-chart-1)");

  return (
    <svg
      className={cn("wb-chart", className)}
      width={size}
      height={size}
      viewBox="0 0 140 140"
      role="img"
      {...rest}
    >
      <g transform={`rotate(-90 ${CX} ${CY})`} fill="none" strokeWidth={thickness}>
        <circle className="wb-ring__track" cx={CX} cy={CY} r={radius} />
        <circle
          className="wb-arc wb-arc--round"
          cx={CX}
          cy={CY}
          r={radius}
          pathLength={100}
          strokeDasharray={`${dash} 100`}
          style={{ stroke: level }}
        />
      </g>
      {centerValue !== undefined && (
        <text className="wb-donut__center-value" x={CX} y={CY - 2}>
          {centerValue}
        </text>
      )}
      {centerLabel !== undefined && (
        <text className="wb-donut__center-label" x={CX} y={CY + 14}>
          {centerLabel}
        </text>
      )}
    </svg>
  );
}
