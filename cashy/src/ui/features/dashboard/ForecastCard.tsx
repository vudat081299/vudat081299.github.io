import type { ComponentProps } from "react";
import { formatMoneyShort } from "@/domain/money";
import { BalanceForecastChart } from "@/ui/features/dashboard/BalanceForecastChart";
import { Card } from "@/ui/kit/Card";

export function ForecastCard({
  monthlyNet,
  forecast,
  horizon,
  setHorizon,
}: {
  monthlyNet: number;
  forecast: ComponentProps<typeof BalanceForecastChart>["data"];
  horizon: number;
  setHorizon: (mo: number) => void;
}) {
  return (
      <Card>
        <div className="wb-card__body">
          <div
            className="wb-cluster wb-cluster--between"
            style={{ marginBottom: 16, gap: 10 }}
          >
            <div>
              <span className="cashy-card-eyebrow">Forecast</span>
              <h3 className="cashy-card-title">Projected balance</h3>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--wb-fg-muted)" }}>
                Today's balance, compounding{" "}
                <strong style={{ color: "var(--wb-fg)", fontWeight: 650 }}>
                  {monthlyNet >= 0 ? "+" : ""}
                  {formatMoneyShort(monthlyNet)}
                </strong>{" "}
                net per month
              </p>
            </div>
            <div className="wb-tabs wb-tabs--pill" role="group" aria-label="Forecast horizon">
              {[6, 12, 24].map((mo) => (
                <button
                  key={mo}
                  type="button"
                  className={horizon === mo ? "wb-tab is-active" : "wb-tab"}
                  onClick={() => setHorizon(mo)}
                >
                  {mo} mo
                </button>
              ))}
            </div>
          </div>
          <div style={{ height: 260 }}>
            <BalanceForecastChart data={forecast} />
          </div>
        </div>
      </Card>
  );
}
