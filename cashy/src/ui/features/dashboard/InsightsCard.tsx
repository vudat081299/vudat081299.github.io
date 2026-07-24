import { formatPercent } from "@/domain/format";
import { formatMoneyShort } from "@/domain/money";
import { Card } from "@/ui/kit/Card";
import { periodInsights, type Steadiness } from "@/domain";

/** Plain-language wording for the daily-spend steadiness band (see periodInsights).
 *  The band already hides the "coefficient of variation" — this hides the jargon. */
const STEADINESS: Record<Steadiness, { label: string; hint: string }> = {
  "very-steady": { label: "Very steady", hint: "barely changes day to day" },
  steady: { label: "Steady", hint: "fairly consistent day to day" },
  uneven: { label: "Uneven", hint: "some days spike above the rest" },
  erratic: { label: "Erratic", hint: "a few days dominate the total" },
};

export function InsightsCard({
  insights,
  spendDelta,
}: {
  insights: ReturnType<typeof periodInsights>;
  spendDelta: number | null;
}) {
  const steady = insights.steadiness ? STEADINESS[insights.steadiness] : null;
  const insightTiles: {
    icon: string;
    label: string;
    value: string;
    hint: string;
    color?: string;
  }[] = [
    {
      icon: "savings",
      label: "Savings rate",
      value: insights.savingsRate == null ? "—" : formatPercent(insights.savingsRate),
      hint: "of income kept",
      color:
        insights.savingsRate == null
          ? undefined
          : insights.savingsRate >= 0
            ? "var(--wb-success-text)"
            : "var(--wb-danger-text)",
    },
    {
      icon: spendDelta != null && spendDelta > 0 ? "trending_up" : "trending_down",
      label: "Spending vs last period",
      value:
        spendDelta == null
          ? "—"
          : `${spendDelta > 0 ? "+" : spendDelta < 0 ? "−" : ""}${formatPercent(Math.abs(spendDelta))}`,
      hint:
        spendDelta == null
          ? "no earlier period yet"
          : spendDelta > 0
            ? "you spent more"
            : spendDelta < 0
              ? "you spent less"
              : "about the same",
      color:
        spendDelta == null || spendDelta === 0
          ? undefined
          : spendDelta < 0
            ? "var(--wb-success-text)"
            : "var(--wb-danger-text)",
    },
    {
      icon: "today",
      label: "Average per day",
      value: formatMoneyShort(insights.avgPerDay),
      hint: `over ${insights.daysElapsed} ${insights.daysElapsed === 1 ? "day" : "days"}`,
    },
    {
      icon: "speed",
      label: "Typical day",
      value: formatMoneyShort(insights.medianPerDay),
      hint:
        insights.medianPerDay > 0 && insights.avgPerDay > insights.medianPerDay * 1.3
          ? "a few big days lift the average"
          : "close to your average",
    },
    {
      icon: "show_chart",
      label: "How steady",
      value: steady?.label ?? "—",
      hint: steady?.hint ?? "not enough spending yet",
    },
    {
      icon: "donut_small",
      label: "Top category",
      value: insights.topCategory ? formatPercent(insights.topCategory.pct) : "—",
      hint: insights.topCategory ? `on ${insights.topCategory.name}` : "no spending yet",
    },
    {
      icon: "insights",
      label: "This month's forecast",
      value: insights.projected == null ? "—" : formatMoneyShort(insights.projected),
      hint: insights.projected == null ? "this month only" : "at the current pace",
    },
    {
      icon: "local_fire_department",
      label: "Largest expense",
      value: insights.topExpense ? formatMoneyShort(insights.topExpense.amount) : "—",
      hint: insights.topExpense ? insights.topExpense.note : "nothing spent yet",
    },
  ];

  return (
        <Card>
          <div className="wb-card__body">
            <span className="cashy-card-eyebrow">Insights</span>
            <h3 className="cashy-card-title" style={{ marginBottom: 16 }}>
              Spending indicators
            </h3>
            <div className="cashy-insights">
              {insightTiles.map((tile) => (
                <div className="cashy-insight" key={tile.label}>
                  <span className="cashy-insight__ico">
                    <span className="wb-ico wb-ico--sm">{tile.icon}</span>
                  </span>
                  <div>
                    <div className="cashy-insight__label">{tile.label}</div>
                    <div
                      className="cashy-insight__value"
                      style={tile.color ? { color: tile.color } : undefined}
                    >
                      {tile.value}
                    </div>
                    <div className="cashy-insight__hint">{tile.hint}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
  );
}
