import { useCashy } from "@/lib/store";
import { totals } from "@/lib/domain";
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

  return (
    <div className="wb-stack wb-stack--loose">
      <PageHeader
        eyebrow={workspace?.displayName ?? "Cashy"}
        title="Giao dịch"
        subtitle={`${q.filtered.length} giao dịch trong kỳ`}
        actions={
          <span className="wb-cap wb-cap--sm" style={{ gap: 5 }}>
            Ròng
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

      <TxFilterBar q={q} tags={tags} count={q.filtered.length} showPeriod />

      <TransactionTable
        rows={q.sorted}
        categories={categories}
        tags={tags}
        pageSize={50}
        emptyState={
          <EmptyState
            icon="🧾"
            title="Không có giao dịch"
            description="Thử đổi bộ lọc, hoặc thêm giao dịch mới."
            action={
              <button type="button" className="wb-btn" onClick={() => openTxEditor(null)}>
                Thêm giao dịch
              </button>
            }
          />
        }
      />
    </div>
  );
}
