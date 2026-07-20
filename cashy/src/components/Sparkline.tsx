/**
 * Tiny inline trend for KPI cards — the web-builder `.wb-spark` component: a
 * single SVG `<path>` line (no chart lib). `color` rides as CSS `color` on the
 * wrapper and the stroke uses `currentColor`, so any theme token works.
 * `vector-effect="non-scaling-stroke"` keeps the line crisp when the SVG is
 * stretched to the card width.
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
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const n = data.length;
  const pad = 10; // vertical breathing room inside the 0..100 box
  const points = data.map((v, i) => {
    const x = (i / (n - 1)) * 100;
    const y = 100 - pad - ((v - min) / span) * (100 - pad * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const d = "M" + points.join(" L");
  return (
    <span className="wb-spark" style={{ color, width: "100%", height }}>
      <svg
        width="100%"
        height={height}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={d} stroke="currentColor" vectorEffect="non-scaling-stroke" />
      </svg>
    </span>
  );
}
