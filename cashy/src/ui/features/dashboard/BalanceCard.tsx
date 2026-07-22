import { cn } from "@/lib/utils";
import { formatMoney } from "@/domain/money";

/** One KPI tile on the dashboard — the web-builder `.wb-stat`: a neutral icon
 *  tile and a footer delta vs the previous period (no in-card sparkline; the
 *  "↑ 12,4% so với kỳ trước" line carries the trend, per the docs).
 *
 *  The value is ink by default (a magnitude, not a status — it spends no colour
 *  per §1). `muted` drops it to the subdued grey so a single ink tile — the
 *  all-time balance — reads as the one figure to look at first, with income /
 *  spend / net stepping back as supporting numbers. */
export function BalanceCard({
  label,
  amount,
  icon,
  delta,
  note = "vs. previous period",
  muted = false,
}: {
  label: string;
  amount: number;
  icon?: string;
  /** fractional change vs previous period, e.g. 0.12 = +12% */
  delta?: number | null;
  /** caption after the delta chip */
  note?: string;
  /** render the value in subdued grey rather than full ink (supporting KPI) */
  muted?: boolean;
}) {
  const hasDelta = delta !== undefined && delta !== null && isFinite(delta);
  const up = (delta ?? 0) >= 0;
  return (
    <div className="wb-stat">
      <div className="wb-stat__top">
        <span className="wb-stat__label">{label}</span>
        {icon && (
          <span className="wb-stat__icon">
            <span className="wb-ico wb-ico--sm">{icon}</span>
          </span>
        )}
      </div>
      <div
        className="wb-stat__value"
        style={
          muted
            ? {
                color: "var(--wb-fg-muted)",
                // A touch smaller, but the line box is pinned to the ink tile's
                // (26px × 1.1) so the card keeps its height. The shorter glyphs
                // would otherwise centre 2px high in that box, so nudge them back
                // down onto the balance figure's baseline (relative → no reflow).
                fontSize: "22px",
                lineHeight: "28.6px",
                position: "relative",
                top: "2px",
              }
            : undefined
        }
      >
        {formatMoney(amount)}
      </div>
      {hasDelta && (
        <div className="wb-stat__foot">
          <span
            className={cn(
              "wb-stat__delta",
              up ? "wb-stat__delta--up" : "wb-stat__delta--down",
            )}
          >
            <span className="wb-ico wb-ico--xs">{up ? "trending_up" : "trending_down"}</span>
            {/* One decimal when it carries signal, vi-VN comma separator: the
                delta is a precise fraction, so "12,4%" — but a whole number drops
                the ",0" and reads "12%", never "12,0%". */}
            {parseFloat(Math.abs((delta ?? 0) * 100).toFixed(1)).toString().replace(".", ",")}%
          </span>
          {note}
        </div>
      )}
    </div>
  );
}
