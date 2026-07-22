import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One ranked row: a label, its value, an optional amount caption and colour. */
export type RankedItem = {
  label: ReactNode;
  value: number;
  /** Right-aligned amount caption; falls back to `String(value)`. */
  display?: ReactNode;
  /** Bar colour; defaults to `--wb-chart-1..8` cycling by index. */
  color?: string;
};

/**
 * RankedBars — the "thanh ngang — xếp hạng danh mục" chart from
 * pages/charts.html: a `wb-stack` of rows where each is a label + amount over a
 * `wb-progress` bar, sized RELATIVE to the largest item (longest = 100%). The
 * page notes horizontal bars beat a donut for ranking many categories (top
 * spend, top debt), and that it's just `wb-progress` reused — so this composes
 * those existing primitives rather than inventing markup.
 *
 * WHY a wrapper: the relative widths (each value ÷ the max) and the repeated
 * label/amount/bar row are precisely what a screen shouldn't hand-write per
 * item. Bar colours follow the category palette (`--wb-chart-*`) by default so
 * the ranking reads like the rest of the charts.
 */
export function RankedBars({
  items,
  max,
  className,
  ...rest
}: {
  items: RankedItem[];
  /** Value mapped to 100%. Defaults to the largest item. */
  max?: number;
} & HTMLAttributes<HTMLDivElement>) {
  const ceiling = max ?? (Math.max(0, ...items.map((it) => it.value)) || 1);

  return (
    <div className={cn("wb-stack", className)} {...rest}>
      {items.map((it, i) => {
        const width = Math.min(100, Math.max(0, (it.value / ceiling) * 100));
        return (
          <div key={i}>
            <div
              className="wb-cluster wb-cluster--between"
              style={{ fontSize: 13, marginBottom: 5 }}
            >
              <span className="wb-cell-strong">{it.label}</span>
              <span className="wb-cell-muted">{it.display ?? String(it.value)}</span>
            </div>
            <div className="wb-progress">
              <div
                className="wb-progress__bar"
                style={{
                  width: `${width}%`,
                  background: it.color ?? `var(--wb-chart-${(i % 8) + 1})`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
