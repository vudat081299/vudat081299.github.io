import { useMemo } from "react";
import { useCashy } from "@/lib/store";
import { rankTags, totals } from "@/lib/domain";
import { useTxQuery } from "@/lib/useTxQuery";
import { AmountDisplay } from "@/components/AmountDisplay";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { TxFilterBar } from "@/components/tx/TxFilterBar";
import { TransactionTable } from "@/components/tx/TransactionTable";
import { openTxEditor } from "@/components/TransactionEditor";

export function Transactions() {
  const { workspace, transactions, categories, tags } = useCashy();
  const q = useTxQuery(transactions, categories);
  const net = totals(q.filtered).net;
  const tagRanks = useMemo(() => rankTags(tags, transactions), [tags, transactions]);
  const tagRankMap = useMemo(
    () => new Map(tagRanks.map((r) => [r.tag.id, r] as const)),
    [tagRanks],
  );

  return (
    <div className="wb-stack wb-stack--loose">
      <PageHeader
        eyebrow={workspace?.displayName ?? "Cashy"}
        title="Transactions"
        subtitle={`${q.filtered.length} transactions in this period`}
        actions={
          <span className="wb-cap wb-cap--sm" style={{ gap: 5 }}>
            Net
            {/* A net loss for the period IS a real problem, so this is one of
                the few places red is earned (§1). */}
            <AmountDisplay
              amount={Math.abs(net)}
              type={net >= 0 ? "income" : "expense"}
              negative={net < 0}
              signed
            />
          </span>
        }
      />

      <TxFilterBar q={q} tagRanks={tagRanks} count={q.filtered.length} showPeriod />

      <TransactionTable
        rows={q.sorted}
        categories={categories}
        tagRanks={tagRankMap}
        pageSize={50}
        emptyState={
          <EmptyState
            icon="🧾"
            title="No transactions"
            description="Try a different filter, or add a new transaction."
            action={
              <button type="button" className="wb-btn" onClick={() => openTxEditor(null)}>
                Add transaction
              </button>
            }
          />
        }
      />
    </div>
  );
}
