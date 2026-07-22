import { useMemo } from "react";
import { useCashy } from "@/data/store";
import { deleteTransaction } from "@/usecases";
import { rankTags, totals } from "@/domain";
import { useTxQuery } from "@/ui/features/transactions/useTxQuery";
import { AmountDisplay } from "@/ui/common/AmountDisplay";
import { EmptyState } from "@/ui/common/EmptyState";
import { PageHeader } from "@/ui/common/PageHeader";
import { PeriodPicker } from "@/ui/common/PeriodPicker";
import { TxFilterBar } from "@/ui/features/transactions/TxFilterBar";
import { TransactionTable } from "@/ui/features/transactions/TransactionTable";
import { openTxEditor } from "@/lib/modals";

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
          <div className="wb-cluster" style={{ gap: 10 }}>
            <PeriodPicker value={q.period} custom={q.custom} onChange={q.setPeriod} />
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
          </div>
        }
      />

      <TxFilterBar q={q} tagRanks={tagRanks} categories={categories} />

      <TransactionTable
        rows={q.sorted}
        categories={categories}
        tagRanks={tagRankMap}
        pageSize={50}
        onDelete={(ids) => ids.forEach(deleteTransaction)}
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
