import { AmountDisplay } from "@/ui/common/AmountDisplay";

/**
 * One labelled money figure — a small caption over a bold, tone-aware amount.
 * The shared building block for the summary stat rows: the Loans overview
 * (`LoanSummary`) and the Dashboard "Balances" breakdown, so "a figure" reads
 * identically wherever money is summarised. Group several inside `.cashy-figrow`
 * (an even, wrapping column grid).
 *
 * Colour = status, never sign (see AmountDisplay + docs/components.md):
 * `positive` tints a real inflow/asset green, `negativeRed` tints a genuinely
 * negative balance red; a plain figure stays neutral-bold. `short` picks the
 * compact `334,1m` form for glance summaries.
 */
export function StatFigure({
  label,
  amount,
  positive = false,
  negativeRed = false,
  short = false,
}: {
  label: string;
  amount: number;
  positive?: boolean;
  negativeRed?: boolean;
  short?: boolean;
}) {
  return (
    <div className="cashy-fig">
      <span className="cashy-fig__label">{label}</span>
      <div className="cashy-fig__val">
        <AmountDisplay amount={amount} positive={positive} negative={negativeRed && amount < 0} short={short} />
      </div>
    </div>
  );
}
