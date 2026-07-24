import type { CSSProperties } from "react";
import { useCashy } from "@/data/store";
import { confirmSubscriptionCharges, skipSubscriptionCharge } from "@/usecases";
import { collectDues, monthlyCommitment, needsPaymentNow } from "@/domain";
import { formatMoney } from "@/domain/money";
import { PageHeader } from "@/ui/common/PageHeader";
import { EmptyState } from "@/ui/kit/EmptyState";
import { Button } from "@/ui/kit/Button";
import { Card } from "@/ui/kit/Card";
import { Capsule } from "@/ui/kit/Capsule";
import { SubscriptionDues } from "@/ui/features/subscriptions/SubscriptionDues";
import { ConnectedSubscriptionCard } from "@/ui/features/subscriptions/ConnectedSubscriptionCard";
import { SubFilterBar } from "@/ui/features/subscriptions/SubFilterBar";
import { useSubFilter } from "@/ui/features/subscriptions/useSubFilter";
import { openSubscriptionEditor } from "@/lib/modals";

/**
 * The subscriptions screen. Its stats and "to confirm" dues stay, but the flat
 * services table is now the SAME card grid the Overview strip shows — one
 * `ConnectedSubscriptionCard` per service — so a subscription looks and behaves
 * identically wherever it appears. Past six services a filter bar appears (search
 * · status · wallet · sort), mirroring the transaction screen.
 */
export function Subscriptions() {
  const { subscriptions, transactions, wallets, subIconStyle } = useCashy();

  const dues = collectDues(subscriptions, transactions);
  const active = subscriptions.filter((s) => s.active);
  const monthly = monthlyCommitment(subscriptions);
  const dueCount = subscriptions.filter((s) => needsPaymentNow(s, transactions)).length;

  // The filter owns ordering too: default is the "by status" sort, so the grid
  // opens with whatever needs attention first. `pinStatusOrder` freezes that order
  // at first load — paying a service must not reshuffle the grid and lose the card
  // the user just acted on (the Dashboard strip keeps the live re-sort instead).
  const filter = useSubFilter(subscriptions, transactions, wallets, { pinStatusOrder: true });
  // A filter bar earns its space only once the list is long enough to need it.
  const showFilter = subscriptions.length > 6;

  return (
    <div className="wb-stack wb-stack--loose">
      <PageHeader
        title="Subscriptions"
        subtitle="Services billed monthly or yearly"
        actions={
          <Button
            round
            type="button"
            style={{ gap: 6 }}
            onClick={() => openSubscriptionEditor(null)}
          >
            <span className="wb-ico wb-ico--sm">add</span>
            Add subscription
          </Button>
        }
      />

      {subscriptions.length > 0 && (
        <div className="wb-stat-grid">
          <div className="wb-stat">
            <div className="wb-stat__top">
              <span className="wb-stat__label">Monthly commitment</span>
              <span className="wb-stat__icon">
                <span className="wb-ico wb-ico--sm">autorenew</span>
              </span>
            </div>
            <div className="wb-stat__value">{formatMoney(monthly)}</div>
            <div className="wb-stat__foot">{active.length} active services</div>
          </div>
          <div className="wb-stat">
            <div className="wb-stat__top">
              <span className="wb-stat__label">Due this month</span>
              <span className="wb-stat__icon">
                <span className="wb-ico wb-ico--sm">notifications</span>
              </span>
            </div>
            <div className="wb-stat__value">{dueCount}</div>
            <div className="wb-stat__foot">unpaid services</div>
          </div>
          <div className="wb-stat">
            <div className="wb-stat__top">
              <span className="wb-stat__label">Total services</span>
              <span className="wb-stat__icon">
                <span className="wb-ico wb-ico--sm">list</span>
              </span>
            </div>
            <div className="wb-stat__value">{subscriptions.length}</div>
            <div className="wb-stat__foot">{subscriptions.length - active.length} suspended</div>
          </div>
        </div>
      )}

      {dues.length > 0 && (
        <Card>
          <div className="wb-table-head">
            <div>
              <h3 className="wb-table-head__title">To confirm</h3>
              <p className="wb-table-head__sub">
                Confirm “Paid” to record it as a transaction, or “Skip” this month.
              </p>
            </div>
            <div className="wb-table-head__actions">
              <Capsule tone="warning">{dues.length} months</Capsule>
            </div>
          </div>
          <div className="wb-card__body">
            <SubscriptionDues
              dues={dues}
              onConfirm={(txId) => confirmSubscriptionCharges([txId])}
              onSkip={skipSubscriptionCharge}
            />
          </div>
        </Card>
      )}

      {subscriptions.length ? (
        <div className="wb-stack" style={{ "--wb-stack-gap": "14px" } as CSSProperties}>
          <div className="wb-cluster wb-cluster--between" style={{ gap: 10 }}>
            <div>
              <span className="cashy-card-eyebrow">Recurring</span>
              <h3 className="cashy-card-title">Subscribed services</h3>
            </div>
            {dueCount > 0 && <Capsule tone="warning">{dueCount} due</Capsule>}
          </div>

          {showFilter && <SubFilterBar f={filter} />}

          {filter.result.length ? (
            <div className="cashy-subgrid">
              {filter.result.map((sub) => (
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

          <p className="cashy-subgrid-foot">
            Monthly commitment · {active.length} {active.length === 1 ? "service" : "services"} ·{" "}
            <strong>{formatMoney(monthly)}</strong>
          </p>
        </div>
      ) : (
        <Card>
          <div className="wb-card__body">
            <EmptyState
              icon="🔁"
              title="No subscriptions yet"
              description="Add services you pay for monthly like Netflix, Spotify, or YouTube. Cashy will remind you to confirm each month."
              action={
                <Button
                  round
                  type="button"
                  style={{ gap: 6 }}
                  onClick={() => openSubscriptionEditor(null)}
                >
                  <span className="wb-ico wb-ico--sm">add</span>
                  Add subscription
                </Button>
              }
            />
          </div>
        </Card>
      )}
    </div>
  );
}
