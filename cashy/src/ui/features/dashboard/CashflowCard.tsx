import type { ComponentProps } from "react";
import { CashflowChart } from "@/ui/features/dashboard/CashflowChart";
import { Card } from "@/ui/kit/Card";
import type { ChartBucket } from "@/domain";

export function CashflowCard({
  showBucketToggle,
  chartBucket,
  setBucketOverride,
  hasFlow,
  wallet,
}: {
  showBucketToggle: boolean;
  chartBucket: ChartBucket | "auto";
  setBucketOverride: (b: ChartBucket) => void;
  hasFlow: boolean;
  wallet: ComponentProps<typeof CashflowChart>["data"];
}) {
  return (
        <Card
          style={{ gridColumn: "span 2", display: "flex", flexDirection: "column" }}
        >
          <div
            className="wb-card__body"
            style={{ flex: 1, display: "flex", flexDirection: "column" }}
          >
            <div
              className="wb-cluster wb-cluster--between"
              style={{ marginBottom: 16, gap: 10, alignItems: "flex-start" }}
            >
              {/* LEFT: title + the colour key. The legend is only ever read, so it
                  belongs beside the heading it explains, not out at the edge. */}
              <div>
                <span className="cashy-card-eyebrow">Cash flow</span>
                <h3 className="cashy-card-title">Wallet balance &amp; spending</h3>
                <div className="wb-legend" style={{ marginTop: 8 }}>
                  <span className="wb-legend__item">
                    <span className="wb-legend__dot" style={{ background: "var(--wb-chart-5)" }} />{" "}
                    Wallet balance
                  </span>
                  <span className="wb-legend__item">
                    <span
                      className="wb-legend__dot"
                      style={{ background: "var(--wb-chart-expense)" }}
                    />{" "}
                    Spending
                  </span>
                </div>
              </div>
              {/* RIGHT: the Day / Week / Month roll-up — the one control the user
                  operates. Built from the kit's segmented primitive (wb-tabs--pill),
                  not a bespoke one. Only offered past a 30-day window (see spanDays). */}
              {showBucketToggle && (
                <div className="wb-tabs wb-tabs--pill" role="group" aria-label="Chart granularity">
                  {(
                    [
                      ["day", "Day"],
                      ["week", "Week"],
                      ["month", "Month"],
                    ] as [ChartBucket, string][]
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={chartBucket === key ? "wb-tab is-active" : "wb-tab"}
                      onClick={() => setBucketOverride(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {hasFlow ? (
              <div style={{ flex: 1, minHeight: 240 }}>
                <CashflowChart data={wallet} />
              </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: "grid",
                  placeItems: "center",
                  minHeight: 240,
                  fontSize: 13,
                  color: "var(--wb-fg-muted)",
                }}
              >
                Nothing recorded in this period
              </div>
            )}
          </div>
        </Card>
  );
}
