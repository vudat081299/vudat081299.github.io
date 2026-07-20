import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

/**
 * Tiny inline trend used in KPI cards. `color` is set as CSS `color` on the
 * wrapper and the SVG uses `currentColor` — so any value works, including
 * theme tokens like `var(--wb-neutral-strong)` (a CSS var can't resolve inside
 * an SVG presentation attribute, but currentColor can).
 */
export function Sparkline({
  data,
  color,
  height = 32,
}: {
  data: number[];
  color: string;
  height?: number;
}) {
  const rows = data.map((v, i) => ({ i, v }));
  const gid = useId();
  return (
    <div style={{ color, width: "100%", height }}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={rows} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.28} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke="currentColor"
            strokeWidth={1.5}
            fill={`url(#${gid})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
