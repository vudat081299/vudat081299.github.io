import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import { formatMoney, formatMoneyShort } from "@/lib/money";
import { chartBucketTitle } from "@/lib/date";
import type { WalletPoint } from "@/lib/domain";

// Wallet balance rides a bright blue (the web-builder chart blue) so the running
// balance reads apart from the red spending bars — the two series never blur.
const BALANCE_COLOR = "var(--wb-chart-5)";

/**
 * The tooltip tells the bucket's whole money story: how much was in the wallet
 * at the START, what came in and what went out during it, and where that leaves
 * the wallet at the END — closing = opening + income − spending, spelled out so
 * the running balance line is never a mystery. The header names the exact bucket
 * (a full weekday-date for a day, "Tháng 3 năm 2026" for a month, "Năm 2026" for
 * a year). Styled with tokens via `.cashy-charttip` (see index.css).
 */
function ChartTip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const pt = payload[0]?.payload as WalletPoint | undefined;
  if (!pt) return null;
  const income = pt.income ?? 0;
  const spend = pt.expense ?? 0;
  const closing = pt.balance ?? 0;
  const opening = closing - income + spend;
  return (
    <div className="cashy-charttip">
      <div className="cashy-charttip__label">{chartBucketTitle(pt.key)}</div>
      <div className="cashy-charttip__row">
        <span className="cashy-charttip__dot" style={{ background: "var(--wb-neutral)" }} />
        <span>Số dư đầu kỳ</span>
        <span className="wb-num cashy-charttip__val">{formatMoney(opening)}</span>
      </div>
      <div className="cashy-charttip__row">
        <span className="cashy-charttip__dot" style={{ background: "var(--wb-success)" }} />
        <span>Thu nhập</span>
        <span className="wb-num cashy-charttip__val">{formatMoney(income)}</span>
      </div>
      <div className="cashy-charttip__row">
        <span className="cashy-charttip__dot" style={{ background: "var(--wb-chart-expense)" }} />
        <span>Chi tiêu</span>
        <span className="wb-num cashy-charttip__val">{formatMoney(spend)}</span>
      </div>
      <div className="cashy-charttip__row cashy-charttip__row--total">
        <span className="cashy-charttip__dot" style={{ background: BALANCE_COLOR }} />
        <span>Số dư cuối kỳ</span>
        <span className="wb-num cashy-charttip__val">{formatMoney(closing)}</span>
      </div>
    </div>
  );
}

/**
 * The personal cash-flow view: **columns = spending** each bucket, **line = money
 * in the wallet** (running balance). These are a flow vs a stock — spending is a
 * few million a month, the balance tens of millions — so they ride SEPARATE Y
 * axes, and **both axes are labelled**: the wallet balance on the left (blue, the
 * line), spending on the right (red, the bars). Leaving the spending axis hidden
 * made an 8M bar rise to the same height as 80M on the balance axis and read as a
 * wildly inflated column; a visible right axis states the bars' own scale so the
 * height is honest. Colours come straight from `--wb-chart-*`.
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
        {/* The balance line carries the same top-down gradient wash as the
            Projected-balance chart so both wallet-balance series read as one
            visual language. A distinct id keeps it from colliding with the
            forecast gradient when the two charts share the dashboard. */}
        <defs>
          <linearGradient id="cashy-cashflow-balance-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BALANCE_COLOR} stopOpacity={0.18} />
            <stop offset="100%" stopColor={BALANCE_COLOR} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {/* Bind the grid to the balance (left) axis — with two NAMED y-axes and no
            yAxisId here, recharts defaults to yAxisId={0}, finds no such axis, and
            silently draws zero horizontal lines. Naming it restores the dashed
            gridlines that make the balance line readable across buckets. */}
        <CartesianGrid
          yAxisId="balance"
          vertical={false}
          stroke="var(--wb-chart-grid)"
          strokeDasharray="2 3"
        />
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
          tick={{ fontSize: 10, fontWeight: 600, fill: BALANCE_COLOR }}
          tickFormatter={(v) => formatMoneyShort(Number(v)).replace(" đ", "")}
        />
        {/* Spending rides its own axis on the RIGHT, labelled in the spending
            colour so the bars are read against their own scale (0 → a few million)
            and never mistaken for the balance scale on the left. Starts at zero —
            spending is never negative. */}
        <YAxis
          yAxisId="expense"
          orientation="right"
          width={44}
          tickLine={false}
          axisLine={false}
          domain={[0, "auto"]}
          tick={{ fontSize: 10, fontWeight: 600, fill: "var(--wb-chart-expense)" }}
          tickFormatter={(v) => formatMoneyShort(Number(v)).replace(" đ", "")}
        />
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
        {/* Filled area (not a bare Line) so the running balance carries the same
            gradient as the Projected-balance chart. Declared after the bars so the
            line rides on top; the fill is faint enough not to muddy the red bars. */}
        <Area
          yAxisId="balance"
          type="monotone"
          dataKey="balance"
          stroke={BALANCE_COLOR}
          strokeWidth={2.5}
          fill="url(#cashy-cashflow-balance-fill)"
          dot={false}
          activeDot={{ r: 3.5, fill: BALANCE_COLOR, stroke: "var(--wb-surface)", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
