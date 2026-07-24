import type { CSSProperties, ComponentProps } from "react";
import { navigate } from "@/lib/router";
import { useSubFilter } from "@/ui/features/subscriptions/useSubFilter";
import { SubFilterBar } from "@/ui/features/subscriptions/SubFilterBar";
import { ConnectedSubscriptionCard } from "@/ui/features/subscriptions/ConnectedSubscriptionCard";
import { useAtScrollEnd } from "@/ui/features/dashboard/useAtScrollEnd";
import { Capsule } from "@/ui/kit/Capsule";
import { Button } from "@/ui/kit/Button";
import type { Transaction } from "@/domain/types";

export function DashboardSubscriptions({
  dueCount,
  showSubFilter,
  subFilter,
  subCards,
  subPeek,
  subScroll,
  transactions,
  subIconStyle,
}: {
  dueCount: number;
  showSubFilter: boolean;
  subFilter: ReturnType<typeof useSubFilter>;
  subCards: ReturnType<typeof useSubFilter>["result"];
  subPeek: ReturnType<typeof useAtScrollEnd<HTMLDivElement>>;
  subScroll: boolean;
  transactions: Transaction[];
  subIconStyle: ComponentProps<typeof ConnectedSubscriptionCard>["iconStyle"];
}) {
  return (
        <div className="wb-stack" style={{ "--wb-stack-gap": "14px" } as CSSProperties}>
          <div className="wb-cluster wb-cluster--between" style={{ gap: 10 }}>
            <div>
              <span className="cashy-card-eyebrow">Recurring</span>
              <h3 className="cashy-card-title">Subscriptions</h3>
            </div>
            <div className="wb-cluster" style={{ gap: 8 }}>
              {dueCount > 0 && (
                <Capsule tone="warning">{dueCount} due now</Capsule>
              )}
              <Button
                variant="ghost"
                size="sm"
                round
                type="button"
                style={{ gap: 4 }}
                onClick={() => navigate("subscriptions")}
              >
                Manage
                <span className="wb-ico wb-ico--xs">arrow_forward</span>
              </Button>
            </div>
          </div>

          {showSubFilter && <SubFilterBar f={subFilter} />}

          {/* Past 6 services the strip stops growing the page: it caps at ~2.5
              rows and scrolls, with the foot half-row fading out to signal more.
              (`Manage` opens the full, unclipped list.) */}
          {subCards.length ? (
            <div
              ref={subPeek.ref}
              className={
                subScroll
                  ? `cashy-subgrid cashy-subgrid--scroll${subPeek.atEnd ? " is-at-bottom" : ""}`
                  : "cashy-subgrid"
              }
            >
              {subCards.map((sub) => (
                <ConnectedSubscriptionCard
                  key={sub.id}
                  sub={sub}
                  txs={transactions}
                  iconStyle={subIconStyle}
                />
              ))}
            </div>
          ) : (
            <p className="cashy-subgrid-empty">No subscriptions match these filters.</p>
          )}
        </div>
  );
}
