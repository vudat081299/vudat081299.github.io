import { type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One legend key: a coloured dot, a label, and an optional trailing value. */
export type LegendItem = {
  label: ReactNode;
  /** Dot colour — a `--wb-chart-*` token or any CSS colour. */
  color: string;
  /** Optional amount shown right-aligned (`wb-legend__val`). */
  value?: ReactNode;
};

/**
 * Legend — the shared chart key (`wb-legend`) used by every chart on
 * pages/charts.html: a wrapping row (or a vertical column beside a donut) of
 * `wb-legend__item`s, each a `wb-legend__dot` + label, optionally with a
 * right-aligned `wb-legend__val` amount.
 *
 * WHY a wrapper: the same dot/label/value markup is repeated for bars, combo
 * and donut charts, and the only real variation is layout (inline row vs. the
 * stacked column the donut uses). Typing `items` + a `direction` collapses all
 * of that into one component so no screen re-hand-writes the spans.
 */
export function Legend({
  items,
  direction = "row",
  className,
  style,
  ...rest
}: {
  items: LegendItem[];
  /** `row` (default, wraps) or `column` (stacked beside a donut, values pushed right). */
  direction?: "row" | "column";
} & Omit<HTMLAttributes<HTMLDivElement>, "color">) {
  const isColumn = direction === "column";
  const mergedStyle: CSSProperties = isColumn
    ? { flexDirection: "column", alignItems: "stretch", ...style }
    : (style ?? {});

  return (
    <div className={cn("wb-legend", className)} style={mergedStyle} {...rest}>
      {items.map((item, i) => (
        <span className="wb-legend__item" key={i}>
          <span className="wb-legend__dot" style={{ background: item.color }} />
          {item.label}
          {item.value !== undefined && (
            <span
              className="wb-legend__val"
              style={isColumn ? { marginLeft: "auto" } : undefined}
            >
              {item.value}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
