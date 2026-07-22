import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One column: an x-axis label, an income bar, an expense bar, hover value text. */
export type BarColumn = {
  label: ReactNode;
  income: number;
  expense: number;
  /** Value shown above the column on hover; falls back to "income / expense". */
  display?: ReactNode;
};

/**
 * BarChart — the grouped income-vs-expense column chart from pages/charts.html
 * ("Cột — thu vs chi"). This is the pure-CSS `wb-bars` variant (no SVG): each
 * `wb-bars__col` holds an income (green) and expense (red) `wb-bar` whose height
 * is a PERCENT of the axis, over the built-in repeating gridline background, with
 * a `wb-bar__val` caption that appears on column hover.
 *
 * WHY a wrapper: bar heights in the source are literal `height:NN%` strings, so
 * the real work is turning amounts into percentages of a common ceiling — done
 * here from `columns` (+ optional `max`). Because heights are relative, the
 * tallest bar defaults to touching the top of the frame.
 */
export function BarChart({
  columns,
  max,
  className,
  ...rest
}: {
  columns: BarColumn[];
  /** Ceiling that maps to 100% height. Defaults to the largest value present. */
  max?: number;
} & HTMLAttributes<HTMLDivElement>) {
  const ceiling =
    max ?? (Math.max(0, ...columns.flatMap((c) => [c.income, c.expense])) || 1);
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / ceiling) * 100))}%`;

  return (
    <div className={cn("wb-bars", className)} {...rest}>
      {columns.map((col, i) => (
        <div className="wb-bars__col" key={i}>
          <span className="wb-bar__val">{col.display ?? `${col.income} / ${col.expense}`}</span>
          <div className="wb-bar wb-bar--income" style={{ height: pct(col.income) }} />
          <div className="wb-bar wb-bar--expense" style={{ height: pct(col.expense) }} />
          <span className="wb-bars__label">{col.label}</span>
        </div>
      ))}
    </div>
  );
}
