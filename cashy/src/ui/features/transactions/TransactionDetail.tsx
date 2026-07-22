import { useEffect, useState } from "react";
import { useCashy } from "@/data/store";
import { deleteTransaction } from "@/usecases";
import { fmtDate } from "@/domain/date";
import { formatMoney } from "@/domain/money";
import { AmountDisplay } from "@/ui/common/AmountDisplay";
import { StatusCap } from "@/ui/common/StatusCap";
import { TagChip } from "@/ui/common/TagChip";
import { registerTxDetail, openTxEditor } from "@/lib/modals";
import { confirm } from "@/lib/confirm";

/**
 * A single transaction rendered as a torn-paper receipt (web-builder `wb-receipt`)
 * floating on the overlay — the "detail / record view" recipe. Edit hands off to
 * the form editor; delete removes it. Neutral throughout; only the amount is tinted.
 */
export function TransactionDetail() {
  const { transactions, categories, tags } = useCashy();
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    registerTxDetail((txId) => setId(txId));
    return () => {
      registerTxDetail(null);
    };
  }, []);

  const close = () => setId(null);

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [id]);

  const tx = id ? transactions.find((t) => t.id === id) : null;
  if (!id || !tx) return null;

  const category = tx.categoryId ? categories.find((c) => c.id === tx.categoryId) : null;
  const txTags = tx.tagIds.map((tid) => tags.find((t) => t.id === tid)).filter(Boolean);
  const typeLabel = tx.type === "income" ? "Income" : "Expense";
  const merchant = tx.note.trim() || category?.name || "Transaction";

  return (
    <div
      className="wb-overlay is-open"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="wb-stack" style={{ alignItems: "center", maxWidth: 420, width: "100%" }}>
        <div className="wb-receipt" style={{ width: "100%" }}>
          <div className="wb-receipt__paper">
            <div className="wb-receipt__head">
              <div className="wb-receipt__merchant">{merchant}</div>
              <div className="wb-receipt__meta">
                {fmtDate(tx.occurredAt)}
                {tx.occurredTime ? ` at ${tx.occurredTime}` : ""} · {typeLabel}
              </div>
            </div>

            <div className="wb-receipt__body">
              <div className="wb-receipt__line">
                <span>Category</span>
                <span>{category?.name ?? "Uncategorised"}</span>
              </div>
              <div className="wb-receipt__line">
                <span>Type</span>
                <span>{typeLabel}</span>
              </div>
              <div className="wb-receipt__line">
                <span>Status</span>
                <StatusCap tx={tx} />
              </div>
              {tx.payee && (
                <div className="wb-receipt__line wb-receipt__line--muted">
                  <span>Payee</span>
                  <span>{tx.payee}</span>
                </div>
              )}
              {tx.account && (
                <div className="wb-receipt__line wb-receipt__line--muted">
                  <span>Paid with</span>
                  <span>{tx.account}</span>
                </div>
              )}
              {tx.note.trim() && (
                <div className="wb-receipt__line wb-receipt__line--muted">
                  <span>Note</span>
                  <span>{tx.note}</span>
                </div>
              )}
            </div>

            {txTags.length > 0 && (
              <>
                <div className="wb-receipt__rule" />
                <div className="wb-tags" style={{ padding: "0 2px" }}>
                  {txTags.map((t) => t && <TagChip key={t.id} tag={t} />)}
                </div>
              </>
            )}

            <div className="wb-receipt__rule" />
            <div className="wb-receipt__total">
              <span>Amount</span>
              <AmountDisplay amount={tx.amount} type={tx.type} signed />
            </div>

            <div className="wb-receipt__barcode" aria-hidden />
            <div className="wb-receipt__code">#{tx.id.slice(0, 8).toUpperCase()}</div>
          </div>
        </div>

        <div className="wb-cluster wb-cluster--between" style={{ width: "100%" }}>
          <button
            type="button"
            className="wb-btn wb-btn--ghost"
            style={{ color: "var(--wb-danger-text)", gap: 6 }}
            onClick={async () => {
              if (
                await confirm({
                  title: `Delete transaction "${merchant}" (${formatMoney(tx.amount)})?`,
                  confirmLabel: "Delete",
                  danger: true,
                })
              ) {
                deleteTransaction(tx.id);
                close();
              }
            }}
          >
            <span className="wb-ico wb-ico--sm">delete</span>
            Delete
          </button>
          <div className="wb-cluster wb-cluster--tight">
            <button type="button" className="wb-btn wb-btn--secondary" onClick={close}>
              Close
            </button>
            <button
              type="button"
              className="wb-btn"
              style={{ gap: 6 }}
              onClick={() => {
                const editId = tx.id;
                close();
                openTxEditor(editId);
              }}
            >
              <span className="wb-ico wb-ico--sm">edit</span>
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
