import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";

type Tone = "neutral" | "income" | "expense";

// Income/expense amounts carry status meaning, so they earn a status hue; the
// neutral KPI stays ink. Delta always follows its own up/down colour.
const toneColor: Record<Tone, string | undefined> = {
  neutral: undefined,
  income: "var(--wb-success-text)",
  expense: "var(--wb-danger-text)",
};

/** One KPI tile on the dashboard — the web-builder `.wb-stat`: a neutral icon
 *  tile and a footer delta vs the previous period (no in-card sparkline; the
 *  "↑ 12,4% so với kỳ trước" line carries the trend, per the docs). */
export function BalanceCard({
  label,
  amount,
  tone = "neutral",
  icon,
  delta,
  note = "so với kỳ trước",
}: {
  label: string;
  amount: number;
  tone?: Tone;
  icon?: string;
  /** fractional change vs previous period, e.g. 0.12 = +12% */
  delta?: number | null;
  /** caption after the delta chip */
  note?: string;
}) {
  const hasDelta = delta !== undefined && delta !== null && isFinite(delta);
  const up = (delta ?? 0) >= 0;
  const color = toneColor[tone];
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
      <div className="wb-stat__value" style={color ? { color } : undefined}>
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
            {Math.abs(Math.round((delta ?? 0) * 100))}%
          </span>
          {note}
        </div>
      )}
    </div>
  );
}
