import { useMemo } from "react";
import { useCashy } from "@/data/store";
import { deleteTransaction } from "@/usecases";
import { rankTags, totals } from "@/domain";
import { useTxQuery } from "@/ui/features/transactions/useTxQuery";
import { AmountDisplay } from "@/ui/common/AmountDisplay";
import { Button } from "@/ui/kit/Button";
import { Capsule } from "@/ui/kit/Capsule";
import { EmptyState } from "@/ui/kit/EmptyState";
import { PageHeader } from "@/ui/common/PageHeader";
import { PeriodPicker } from "@/ui/common/PeriodPicker";
import { TxFilterBar } from "@/ui/features/transactions/TxFilterBar";
import { TransactionTable } from "@/ui/features/transactions/TransactionTable";
import { openTxEditor } from "@/lib/modals";

export function Transactions() {
  const { transactions, categories, tags, wallets } = useCashy();
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
        title="Transactions"
        subtitle={`${q.filtered.length} transactions in this period`}
        actions={
          <div className="wb-cluster" style={{ gap: 10 }}>
            <PeriodPicker value={q.period} custom={q.custom} onChange={q.setPeriod} />
            <Capsule size="sm" style={{ gap: 5 }}>
              Net
              {/* A net loss for the period IS a real problem, so this is one of
                  the few places red is earned (§1). */}
              <AmountDisplay
                amount={Math.abs(net)}
                type={net >= 0 ? "income" : "expense"}
                negative={net < 0}
                signed
              />
            </Capsule>
          </div>
        }
      />

      <TxFilterBar q={q} tagRanks={tagRanks} categories={categories} wallets={wallets} />

      <TransactionTable
        rows={q.sorted}
        categories={categories}
        tagRanks={tagRankMap}
        wallets={wallets}
        pageSize={50}
        onDelete={(ids) => ids.forEach(deleteTransaction)}
        emptyState={
          <EmptyState
            icon="🧾"
            title="No transactions"
            description="Try a different filter, or add a new transaction."
            action={
              <Button
                type="button"
                round
                style={{ gap: 6 }}
                onClick={() => openTxEditor(null)}
              >
                <span className="wb-ico wb-ico--sm">add</span>
                Add transaction
              </Button>
            }
          />
        }
      />
    </div>
  );
}
