import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Stat — a single KPI tile (`wb-stat`) from pages/stats.html: a label + boxed
 * icon on top, a big tabular-nums value, and a foot line. The tile is neutral;
 * the only colour is the `delta` (up = success green, down = danger red) since
 * a change direction is the one thing that carries meaning. This is the generic
 * form of cashy's BalanceCard. Lay several out inside a `.wb-stat-grid` wrapper.
 */
export function Stat({
  label,
  value,
  icon,
  delta,
  note,
  footer,
  className,
  ...rest
}: {
  label: ReactNode;
  value: ReactNode;
  /** Material Symbols name rendered in the boxed `wb-stat__icon` (e.g. "payments"). */
  icon?: string;
  /** Signed change; `dir` picks the colour and prepends ↑ / ↓. */
  delta?: { dir: "up" | "down"; value: ReactNode };
  /** Caption after the delta (e.g. "so với tháng trước"). */
  note?: ReactNode;
  /** Replace the whole foot with custom content (e.g. a capsule). Overrides delta/note. */
  footer?: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  const hasFoot = footer !== undefined || delta !== undefined || note !== undefined;

  return (
    <div className={cn("wb-stat", className)} {...rest}>
      <div className="wb-stat__top">
        <span className="wb-stat__label">{label}</span>
        {icon !== undefined && (
          <span className="wb-stat__icon" aria-hidden="true">
            <span className="wb-ico wb-ico--sm">{icon}</span>
          </span>
        )}
      </div>
      <div className="wb-stat__value">{value}</div>
      {hasFoot && (
        <div className="wb-stat__foot">
          {footer !== undefined ? (
            footer
          ) : (
            <>
              {delta !== undefined && (
                <span className={cn("wb-stat__delta", `wb-stat__delta--${delta.dir}`)}>
                  {delta.dir === "up" ? "↑" : "↓"} {delta.value}
                </span>
              )}
              {note}
            </>
          )}
        </div>
      )}
    </div>
  );
}
