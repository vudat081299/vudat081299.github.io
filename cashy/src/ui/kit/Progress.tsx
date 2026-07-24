import { type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Progress — wraps the web-builder `wb-progress` track + `wb-progress__bar` fill
 * (CSS §17), ideal for a budget "đã chi / ngân sách" bar. The fill is the neutral
 * ink by default; a `tone` colours it when spend hits a warn/over threshold. `size`
 * picks the taller `--lg` track, and `loading` turns on the shimmer sweep that
 * rides ACROSS THE FILLED part only — `band`/`shimmer` expose the `--wb-progress-*`
 * knobs for its width and colour.
 *
 * WHY a wrapper: it computes the fill width from `value`/`max` (clamped 0–100%),
 * emits the proper `progressbar` ARIA, and types the tone/size axes — instead of
 * hand-writing the nested track/bar markup and an inline `width:%` every time. Pure
 * CSS animation, so there's nothing to wire up.
 */
export function Progress({
  value,
  max = 100,
  tone = "neutral",
  size = "md",
  loading = false,
  band,
  shimmer,
  label,
  className,
  barClassName,
  style,
  ...rest
}: {
  /** Current amount (e.g. đã chi). */
  value: number;
  /** Full amount the bar fills to; default 100 so `value` reads as a percent. */
  max?: number;
  /** Fill colour by meaning; `neutral` is the default ink ladder. */
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  /** `lg` is the taller `wb-progress--lg` track. */
  size?: "md" | "lg";
  /** Turn on the shimmer sweep across the filled part (`wb-progress--loading`). */
  loading?: boolean;
  /** Width of the sweeping band, e.g. "22%" (`--wb-progress-band`). */
  band?: string;
  /** Colour of the sweep, e.g. "var(--wb-info)" (`--wb-progress-shimmer`). */
  shimmer?: string;
  /** Optional muted caption rendered above the bar (`wb-cell-muted`). */
  label?: ReactNode;
  /** Extra class on the fill bar — an escape hatch for app-level bar variants
   * (e.g. a muted `cashy-progress__bar--quiet`) beyond the generic `tone` axis. */
  barClassName?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;

  const trackStyle: CSSProperties = {
    ...(band != null ? { ["--wb-progress-band" as string]: band } : {}),
    ...(shimmer != null ? { ["--wb-progress-shimmer" as string]: shimmer } : {}),
    ...style,
  };

  const track = (
    <div
      className={cn(
        "wb-progress",
        size === "lg" && "wb-progress--lg",
        loading && "wb-progress--loading",
        className,
      )}
      style={trackStyle}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      {...rest}
    >
      <div
        className={cn(
          "wb-progress__bar",
          tone !== "neutral" && `wb-progress__bar--${tone}`,
          barClassName,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );

  if (label === undefined) return track;

  return (
    <div>
      <div className="wb-cell-muted" style={{ fontSize: 12, marginBottom: 6 }}>
        {label}
      </div>
      {track}
    </div>
  );
}
