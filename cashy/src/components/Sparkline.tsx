import { Area, AreaChart, ResponsiveContainer } from "recharts";

/** Tiny inline trend used in KPI cards. Endpoint is emphasized by the caller's color. */
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
  const gid = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={rows} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gid})`}
          isAnimationActive={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
