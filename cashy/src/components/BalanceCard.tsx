import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";

/** One KPI tile on the dashboard — the web-builder `.wb-stat`: a neutral icon
 *  tile and a footer delta vs the previous period (no in-card sparkline; the
 *  "↑ 12,4% so với kỳ trước" line carries the trend, per the docs).
 *
 *  The value itself is always **ink**, exactly as every specimen on the docs'
 *  stats page prints it. A period's income or spend is a magnitude, not a
 *  status, so it does not spend colour (§1) — the only tinted thing on the tile
 *  is the delta chip, where up/down genuinely is the signal. */
export function BalanceCard({
  label,
  amount,
  icon,
  delta,
  note = "vs. previous period",
}: {
  label: string;
  amount: number;
  icon?: string;
  /** fractional change vs previous period, e.g. 0.12 = +12% */
  delta?: number | null;
  /** caption after the delta chip */
  note?: string;
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
      <div className="wb-stat__value">{formatMoney(amount)}</div>
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
