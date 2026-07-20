import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { formatMoneyShort } from "@/lib/money";
import type { BreakdownSlice } from "@/lib/domain";

/**
 * Donut of spend-by-category. Slices keep each category's identity hue (a
 * genuine colour key / legend); the empty ring + centre text use neutral
 * tokens. The empty fill rides `currentColor` so it themes with the wrapper.
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
    <div
      className="relative mx-auto"
      style={{ width: size, height: size, maxWidth: "100%", color: "var(--wb-border)" }}
    >
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
                fill={empty ? "currentColor" : (s as BreakdownSlice).colorHex}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span style={{ fontSize: 11, fontWeight: 550, color: "var(--wb-fg-muted)" }}>
          {label}
        </span>
        <span
          className="wb-num"
          style={{ fontSize: 18, fontWeight: 700, color: "var(--wb-fg)" }}
        >
          {formatMoneyShort(total)}
        </span>
      </div>
    </div>
  );
}
