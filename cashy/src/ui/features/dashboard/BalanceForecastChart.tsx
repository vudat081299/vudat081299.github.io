import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import { formatMoney, formatMoneyShort } from "@/domain/money";
import { chartBucketTitle } from "@/domain/date";
import type { ForecastPoint } from "@/domain";

// The projected balance rides the same blue as the wallet line elsewhere, so the
// eye reads "this is the balance series" without relearning a colour.
const LINE = "var(--wb-chart-5)";

/** One row: the month, and the balance it lands on. Point 0 is flagged as "now"
 *  because it is a fact, not a projection — everything after it is arithmetic. */
function ForecastTip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const pt = payload[0]?.payload as ForecastPoint | undefined;
  if (!pt) return null;
  return (
    <div className="cashy-charttip">
      <div className="cashy-charttip__label">
        {chartBucketTitle(pt.key)}
        {pt.offset === 0 ? " · now" : ""}
      </div>
      <div className="cashy-charttip__row cashy-charttip__row--total">
        <span className="cashy-charttip__dot" style={{ background: LINE }} />
        <span>{pt.offset === 0 ? "Current balance" : "Projected balance"}</span>
        <span className="wb-num cashy-charttip__val">{formatMoney(pt.balance)}</span>
      </div>
    </div>
  );
}

/**
 * The forward-looking companion to the cash-flow chart: a single filled line that
 * walks the wallet balance out month by month at the current monthly net. It is a
 * projection, not a promise — so when the line would cross into the red a dashed
 * zero rule is drawn and the axis is allowed below zero, letting a downward slope
 * show the month the money runs out rather than hiding it behind a floor.
 */
export function BalanceForecastChart({ data }: { data: ForecastPoint[] }) {
  const goesNegative = data.some((d) => d.balance < 0);
  const domain: [number | "auto", number | "auto"] = goesNegative ? ["auto", "auto"] : [0, "auto"];

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="cashy-forecast-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LINE} stopOpacity={0.18} />
            <stop offset="100%" stopColor={LINE} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--wb-chart-grid)" strokeDasharray="2 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10, fill: "var(--wb-fg-muted)" }}
          interval="preserveStartEnd"
          minTickGap={16}
        />
        <YAxis
          width={52}
          tickLine={false}
          axisLine={false}
          domain={domain}
          tick={{ fontSize: 10, fontWeight: 600, fill: "var(--wb-fg-muted)" }}
          tickFormatter={(v) => formatMoneyShort(Number(v)).replace(" đ", "")}
        />
        {goesNegative && (
          <ReferenceLine y={0} stroke="var(--wb-chart-expense)" strokeDasharray="3 3" />
        )}
        <Tooltip
          cursor={{ stroke: "var(--wb-chart-grid)", strokeWidth: 1 }}
          content={ForecastTip}
          wrapperStyle={{ outline: "none" }}
        />
        <Area
          type="monotone"
          dataKey="balance"
          stroke={LINE}
          strokeWidth={2.5}
          fill="url(#cashy-forecast-fill)"
          dot={false}
          activeDot={{ r: 3.5, fill: LINE, stroke: "var(--wb-surface)", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
