import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import { formatMoney, formatMoneyShort } from "@/lib/money";
import type { WalletPoint } from "@/lib/domain";

// Wallet balance rides a bright blue (the web-builder chart blue) so the running
// balance reads apart from the red spending bars — the two series never blur.
const BALANCE_COLOR = "var(--wb-chart-5)";

/** Two-row tooltip card, styled with tokens via `.cashy-charttip` (see index.css). */
function ChartTip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const balance = payload.find((p) => p.dataKey === "balance")?.value;
  const expense = payload.find((p) => p.dataKey === "expense")?.value;
  return (
    <div className="cashy-charttip">
      <div className="cashy-charttip__label">{label}</div>
      {balance != null && (
        <div className="cashy-charttip__row">
          <span className="cashy-charttip__dot" style={{ background: BALANCE_COLOR }} />
          <span>Wallet balance</span>
          <span className="wb-num cashy-charttip__val">{formatMoney(Number(balance))}</span>
        </div>
      )}
      {expense != null && (
        <div className="cashy-charttip__row">
          <span
            className="cashy-charttip__dot"
            style={{ background: "var(--wb-chart-expense)" }}
          />
          <span>Spending</span>
          <span className="wb-num cashy-charttip__val">{formatMoney(Number(expense))}</span>
        </div>
      )}
    </div>
  );
}

/**
 * The personal cash-flow view: **columns = spending** each bucket, **line = money
 * in the wallet** (running balance). Two scales (a stock vs a flow), so each series
 * rides its own hidden Y axis; the line keeps a compact left axis because the wallet
 * balance is the figure that matters. Colours come straight from `--wb-chart-*`.
 */
export function CashflowChart({ data }: { data: WalletPoint[] }) {
  // Pin the axis to zero unless the wallet really does go negative. Left to
  // itself the scale pads below the lowest point and invents a stretch of
  // negative money under a line that never once went into the red — an axis
  // should not show territory the data cannot reach.
  const goesNegative = data.some((d) => d.balance < 0);
  const balanceDomain: [number | "auto", "auto"] = goesNegative ? ["auto", "auto"] : [0, "auto"];

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={240}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--wb-chart-grid)" strokeDasharray="2 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10, fill: "var(--wb-fg-muted)" }}
          interval="preserveStartEnd"
          minTickGap={14}
        />
        <YAxis
          yAxisId="balance"
          orientation="left"
          width={48}
          tickLine={false}
          axisLine={false}
          domain={balanceDomain}
          tick={{ fontSize: 10, fill: "var(--wb-fg-subtle)" }}
          tickFormatter={(v) => formatMoneyShort(Number(v)).replace(" đ", "")}
        />
        {/* Spending is never negative — its (hidden) scale starts at the baseline
            so the bars grow up from zero rather than from a padded floor. */}
        <YAxis yAxisId="expense" orientation="right" hide domain={[0, "auto"]} />
        <Tooltip
          cursor={{ fill: "var(--wb-surface-2)" }}
          content={ChartTip}
          wrapperStyle={{ outline: "none" }}
        />
        <Bar
          yAxisId="expense"
          dataKey="expense"
          fill="var(--wb-chart-expense)"
          fillOpacity={0.85}
          radius={[3, 3, 0, 0]}
          maxBarSize={26}
          isAnimationActive={false}
        />
        <Line
          yAxisId="balance"
          type="monotone"
          dataKey="balance"
          stroke={BALANCE_COLOR}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 3.5, fill: BALANCE_COLOR, stroke: "var(--wb-surface)", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
