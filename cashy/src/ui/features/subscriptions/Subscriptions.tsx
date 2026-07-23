import { useMemo } from "react";
import type { Category, SubIconStyle, Subscription, Transaction } from "@/domain/types";
import { useCashy } from "@/data/store";
import { confirmSubscriptionCharges, setSubscriptionActive, skipSubscriptionCharge } from "@/usecases";
import {
  collectDues,
  currentCycle,
  firstUnpaidCycle,
  monthlyCommitment,
  needsPaymentNow,
  subscriptionStatus,
} from "@/domain";
import { useStableSubOrder } from "@/ui/features/subscriptions/useStableSubOrder";
import { formatMoney } from "@/domain/money";
import { fmtDateNum, fmtDateShort, monthLabelShort } from "@/domain/date";
import { SubTile } from "@/ui/features/subscriptions/SubTile";
import { PageHeader } from "@/ui/common/PageHeader";
import { EmptyState } from "@/ui/common/EmptyState";
import { CategoryCap } from "@/ui/common/CategoryCap";
import { SubscriptionDues } from "@/ui/features/subscriptions/SubscriptionDues";
import { openSubscriptionEditor } from "@/lib/modals";

/**
 * One service row. Modelled on the docs' "Công nợ" table — the pattern for
 * tracking money owed against a deadline — so a subscription that wants paying
 * gets a soft amber row and an amber status capsule, exactly like an invoice
 * coming due. Everything settled stays quiet.
 */
function SubscriptionRow({
  sub,
  category,
  txs,
  iconStyle,
}: {
  sub: Subscription;
  category: Category | null;
  txs: Transaction[];
  iconStyle: SubIconStyle;
}) {
  const st = subscriptionStatus(sub, txs);
  const due = needsPaymentNow(sub, txs);
  // The CYCLE in play — the current month for a monthly plan, the current
  // billing year for a yearly one. Using monthKey() here would tell a yearly
  // subscriber "chưa đến hạn tháng 7" every month of the year.
  const cur = currentCycle(sub);
  // The cycle the row should name as owed — the EARLIEST charge still pending,
  // so an older unpaid cycle is never masked by a newer one being settled.
  const owed = st.pending[0]?.month ?? firstUnpaidCycle(sub);
  // Settled for this cycle, as opposed to merely not billed yet — the two look
  // the same from "not due" but only one of them means the money has been paid.
  const paidThisCycle = sub.lastPaidAt?.slice(0, 7) === cur;

  const rowTone = !sub.active ? undefined : due ? "wb-row--warning" : undefined;

  return (
    <tr className={rowTone}>
      <td>
        <span className="cashy-subcell">
          <SubTile
            icon={sub.icon}
            colorHex={sub.colorHex}
            brand={iconStyle === "brand"}
            size={32}
            iconSize={16}
          />
          <span style={{ minWidth: 0 }}>
            <span className="wb-cell-strong">{sub.name}</span>
            {sub.note && <span className="wb-cell-sub">{sub.note}</span>}
          </span>
        </span>
      </td>
      <td>
        <CategoryCap category={category} />
      </td>
      <td className="wb-cell-muted">
        {sub.interval === "yearly"
          ? `${sub.dayOfMonth}/${sub.monthOfYear ?? 1} yearly`
          : `Day ${sub.dayOfMonth}`}
      </td>
      <td className="wb-cell-muted">{fmtDateNum(sub.startedAt)}</td>
      <td className="wb-cell-muted">
        {sub.lastPaidAt ? fmtDateNum(sub.lastPaidAt) : "—"}
        {/* The stored history, not a guess: one id per transaction that paid it. */}
        {sub.paymentTxIds.length > 0 && (
          <span className="wb-cell-sub">{sub.paymentTxIds.length} cycles paid</span>
        )}
      </td>
      <td className="wb-num wb-num--strong">{formatMoney(sub.amount)}</td>
      <td>
        {!sub.active ? (
          <span className="wb-cap">Suspended</span>
        ) : due ? (
          <span className="wb-cap wb-cap--warning">
            <span className="wb-cap__dot" />
            Pay {monthLabelShort(owed)}
          </span>
        ) : paidThisCycle ? (
          <span className="wb-cap wb-cap--success">
            <span className="wb-cap__dot" />
            Paid {monthLabelShort(cur)}
          </span>
        ) : (
          <span className="wb-cap">Not due yet</span>
        )}
        {sub.active && !due && st.nextDate && (
          <span className="wb-cell-sub">Next payment {fmtDateShort(st.nextDate)}</span>
        )}
      </td>
      <td className="cashy-actions-cell">
        <span className="cashy-rowactions">
          <button
            type="button"
            className="wb-btn wb-btn--ghost wb-btn--icon wb-btn--sm wb-btn--round"
            aria-label={`Edit ${sub.name}`}
            title="Edit"
            onClick={() => openSubscriptionEditor(sub.id)}
          >
            <span className="wb-ico wb-ico--sm">edit</span>
          </button>
          <button
            type="button"
            className="wb-btn wb-btn--ghost wb-btn--icon wb-btn--sm wb-btn--round"
            aria-label={sub.active ? `Suspend ${sub.name}` : `Resume ${sub.name}`}
            title={sub.active ? "Suspend" : "Resume"}
            onClick={() => setSubscriptionActive(sub.id, !sub.active)}
          >
            <span className="wb-ico wb-ico--sm">{sub.active ? "pause" : "play_arrow"}</span>
          </button>
        </span>
      </td>
    </tr>
  );
}

export function Subscriptions() {
  const { subscriptions, categories, transactions, subIconStyle } = useCashy();
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const dues = useMemo(() => collectDues(subscriptions, transactions), [subscriptions, transactions]);
  const active = subscriptions.filter((s) => s.active);
  const monthly = monthlyCommitment(subscriptions);
  const dueCount = subscriptions.filter((s) => needsPaymentNow(s, transactions)).length;

  // Whatever needs money first sits at the top; paused services sink. Sorted
  // once on open, then held stable so editing a row never makes it jump.
  const ordered = useStableSubOrder(subscriptions, transactions);

  return (
    <div className="wb-stack wb-stack--loose">
      <PageHeader
        title="Subscriptions"
        subtitle="Services billed monthly or yearly"
        actions={
          <button
            type="button"
            className="wb-btn wb-btn--round"
            style={{ gap: 6 }}
            onClick={() => openSubscriptionEditor(null)}
          >
            <span className="wb-ico wb-ico--sm">add</span>
            Add subscription
          </button>
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
        <div className="wb-card">
          <div className="wb-table-head">
            <div>
              <h3 className="wb-table-head__title">To confirm</h3>
              <p className="wb-table-head__sub">
                Confirm “Paid” to record it as a transaction, or “Skip” this month.
              </p>
            </div>
            <div className="wb-table-head__actions">
              <span className="wb-cap wb-cap--warning">{dues.length} months</span>
            </div>
          </div>
          <div className="wb-card__body">
            <SubscriptionDues
              dues={dues}
              onConfirm={(txId) => confirmSubscriptionCharges([txId])}
              onSkip={skipSubscriptionCharge}
            />
          </div>
        </div>
      )}

      {subscriptions.length ? (
        <div className="wb-card">
          <div className="wb-table-head">
            <div>
              <h3 className="wb-table-head__title">Subscribed services</h3>
              <p className="wb-table-head__sub">Cycle, start date &amp; last paid</p>
            </div>
            {dueCount > 0 && (
              <div className="wb-table-head__actions">
                <span className="wb-cap wb-cap--warning">{dueCount} due</span>
              </div>
            )}
          </div>
          <div className="wb-table-scroll">
            <table className="wb-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Category</th>
                  <th>Cycle</th>
                  <th>Started</th>
                  <th>Last paid</th>
                  <th className="wb-num">Amount</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {ordered.map((sub) => (
                  <SubscriptionRow
                    key={sub.id}
                    sub={sub}
                    txs={transactions}
                    iconStyle={subIconStyle}
                    category={sub.categoryId ? (catById.get(sub.categoryId) ?? null) : null}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5}>Monthly commitment · {active.length} services</td>
                  <td className="wb-num wb-num--strong">{formatMoney(monthly)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="wb-card">
          <div className="wb-card__body">
            <EmptyState
              icon="🔁"
              title="No subscriptions yet"
              description="Add services you pay for monthly like Netflix, Spotify, or YouTube. Cashy will remind you to confirm each month."
              action={
                <button
                  type="button"
                  className="wb-btn wb-btn--round"
                  style={{ gap: 6 }}
                  onClick={() => openSubscriptionEditor(null)}
                >
                  <span className="wb-ico wb-ico--sm">add</span>
                  Add subscription
                </button>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
