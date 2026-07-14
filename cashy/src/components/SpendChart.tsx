import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { formatMoneyShort } from "@/lib/money";
import type { BreakdownSlice } from "@/lib/domain";

/**
 * Donut of spend-by-category. Colors stay vivid (they are the small marks the
 * palette is meant for); the ground behind them is the card, not a fill.
 */
export function SpendChart({
  slices,
  total,
  label = "Tổng chi",
  size = 220,
}: {
  slices: BreakdownSlice[];
  total: number;
  label?: string;
  size?: number;
}) {
  const empty = slices.length === 0;
  const data = empty ? [{ id: "empty", total: 1 }] : slices;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size, maxWidth: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="id"
            innerRadius="70%"
            outerRadius="100%"
            paddingAngle={empty || slices.length < 2 ? 0 : 2}
            startAngle={90}
            endAngle={-270}
            strokeWidth={0}
            isAnimationActive={false}
          >
            {data.map((s, i) => (
              <Cell
                key={i}
                fill={empty ? "hsl(var(--muted))" : (s as BreakdownSlice).colorHex}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
        <span className="text-lg font-semibold tracking-tight tnum">
          {formatMoneyShort(total)}
        </span>
      </div>
    </div>
  );
}
