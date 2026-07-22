import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Category, Transaction } from "@/domain/types";
import type { TagRank } from "@/domain";
import { confirm } from "@/lib/confirm";
import { AmountDisplay } from "@/ui/common/AmountDisplay";
import { CategoryCap } from "@/ui/common/CategoryCap";
import { StatusCap } from "@/ui/common/StatusCap";
import { TagChip } from "@/ui/common/TagChip";
import { TagsMorePopover } from "@/ui/features/transactions/TagsMorePopover";
import { openTxEditor, openTxDetail } from "@/lib/modals";
import { usePagination } from "@/ui/features/transactions/usePagination";
import { Pagination } from "@/ui/features/transactions/Pagination";

/**
 * The one transaction table shared by the Dashboard (20/page) and the
 * Transactions screen (50/page). Self-contained: internal pagination, a
 * multi-select column with a bulk-delete bar, an always-visible row edit button,
 * row click → the receipt detail, and a card foot with the pager + page info.
 *
 * There is deliberately NO per-row delete: one stray click should not be able to
 * destroy a row. Deleting is inside the editor, where the transaction is open in
 * front of you (bulk delete still exists, but only after an explicit selection).
 */
export function TransactionTable({
  rows,
  categories,
  tagRanks,
  pageSize,
  title,
  subtitle,
  headerActions,
  emptyState,
  onDelete,
}: {
  rows: Transaction[];
  categories: Category[];
  /** tag → how heavily the ledger uses it; drives chip order and ink */
  tagRanks: Map<string, TagRank>;
  pageSize: number;
  title?: ReactNode;
  subtitle?: ReactNode;
  headerActions?: ReactNode;
  emptyState?: ReactNode;
  /** the ids the user chose to bulk-delete, once they have confirmed it */
  onDelete: (ids: string[]) => void;
}) {
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const { page, setPage, totalPages, pageItems, total, from, to } = usePagination(rows, pageSize);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Drop ids that no longer exist (deleted, filtered out) so the count stays honest.
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const live = new Set(rows.map((r) => r.id));
      const next = new Set<string>();
      prev.forEach((id) => live.has(id) && next.add(id));
      return next.size === prev.size ? prev : next;
    });
  }, [rows]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const pageIds = pageItems.map((t) => t.id);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someChecked = !allChecked && pageIds.some((id) => selected.has(id));
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });

  const bulkDelete = async () => {
    const ok = await confirm({
      title: `Delete ${selected.size} selected transactions?`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      danger: true,
    });
    if (!ok) return;
    onDelete([...selected]);
    setSelected(new Set());
  };

  if (total === 0) {
    return (
      <div className="wb-card">
        {(title || headerActions) && (
          <div className="wb-table-head">
            {title && (
              <div>
                <h3 className="wb-table-head__title">{title}</h3>
                {subtitle && <p className="wb-table-head__sub">{subtitle}</p>}
              </div>
            )}
            {headerActions && <div className="wb-table-head__actions">{headerActions}</div>}
          </div>
        )}
        <div style={{ padding: 16 }}>{emptyState}</div>
      </div>
    );
  }

  const selecting = selected.size > 0;

  return (
    <div className="wb-card">
      <div className="wb-table-head">
        {selecting ? (
          <>
            <div>
              <h3 className="wb-table-head__title">{selected.size} selected</h3>
              <p className="wb-table-head__sub">Pick a bulk action</p>
            </div>
            <div className="wb-table-head__actions">
              <button
                type="button"
                className="wb-btn wb-btn--ghost wb-btn--sm"
                onClick={() => setSelected(new Set())}
              >
                Deselect
              </button>
              <button
                type="button"
                className="wb-btn wb-btn--danger wb-btn--sm"
                style={{ gap: 4 }}
                onClick={bulkDelete}
              >
                <span className="wb-ico wb-ico--sm">delete</span>
                Delete selected
              </button>
            </div>
          </>
        ) : (
          <>
            {(title || subtitle) && (
              <div style={{ minWidth: 0 }}>
                {title && (
                  <h3 className="wb-table-head__title cashy-table-title">
                    <span>{title}</span>
                    {/* The row count rides along in parentheses — "Recent
                        transactions (219)". */}
                    <span className="cashy-table-title__count">({total})</span>
                  </h3>
                )}
                {subtitle && <p className="wb-table-head__sub">{subtitle}</p>}
              </div>
            )}
            {headerActions && <div className="wb-table-head__actions">{headerActions}</div>}
          </>
        )}
      </div>

      <div className="wb-table-scroll">
        <table className="wb-table">
          <thead>
            <tr>
              <th className="cashy-check-cell">
                <label className="wb-check" aria-label="Select every row on this page">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = someChecked;
                    }}
                    onChange={toggleAll}
                  />
                </label>
              </th>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Tags</th>
              <th className="wb-num">Amount</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {pageItems.map((tx) => {
              const category = tx.categoryId ? (catById.get(tx.categoryId) ?? null) : null;
              // Most-used tag first: when only two of them fit, show the two that
              // actually say something about this ledger.
              const txTags = tx.tagIds
                .map((id) => tagRanks.get(id))
                .filter((r): r is TagRank => Boolean(r))
                .sort((a, b) => b.count - a.count);
              const day = `${tx.occurredAt.slice(8, 10)}/${tx.occurredAt.slice(5, 7)}`;
              const isSel = selected.has(tx.id);
              return (
                <tr
                  key={tx.id}
                  className={isSel ? "is-selected" : undefined}
                  style={{ cursor: "pointer" }}
                  onClick={() => openTxDetail(tx.id)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      openTxDetail(tx.id);
                    }
                  }}
                >
                  <td className="cashy-check-cell" onClick={(e) => e.stopPropagation()}>
                    <label className="wb-check" aria-label="Select transaction">
                      <input type="checkbox" checked={isSel} onChange={() => toggle(tx.id)} />
                    </label>
                  </td>
                  {/* Time is optional, so it only takes a line when it exists —
                      an empty slot on every other row would cost more than it
                      is worth. */}
                  <td className="wb-cell-muted">
                    {day}
                    {tx.occurredTime && <span className="wb-cell-sub">{tx.occurredTime}</span>}
                  </td>
                  <td>
                    <span className="wb-cell-strong">
                      {tx.note || category?.name || "Transaction"}
                    </span>
                    {tx.payee && <span className="wb-cell-sub">{tx.payee}</span>}
                  </td>
                  <td>
                    <CategoryCap category={category} />
                  </td>
                  <td>
                    {txTags.length > 0 ? (
                      <span className="wb-tags">
                        {txTags.slice(0, 2).map((r) => (
                          <TagChip key={r.tag.id} tag={r.tag} shade={r.shade} />
                        ))}
                        {txTags.length > 2 && (
                          <TagsMorePopover tags={txTags} count={txTags.length - 2} />
                        )}
                      </span>
                    ) : (
                      <span className="wb-cell-muted">—</span>
                    )}
                  </td>
                  <td className="wb-num">
                    <AmountDisplay amount={tx.amount} type={tx.type} signed />
                  </td>
                  <td>
                    <StatusCap tx={tx} />
                  </td>
                  <td className="cashy-actions-cell" onClick={(e) => e.stopPropagation()}>
                    <span className="cashy-rowactions">
                      <button
                        type="button"
                        className="wb-btn wb-btn--ghost wb-btn--icon wb-btn--sm wb-btn--round"
                        aria-label="Edit transaction"
                        title="Edit"
                        onClick={() => openTxEditor(tx.id)}
                      >
                        <span className="wb-ico wb-ico--sm">edit</span>
                      </button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="wb-card__foot">
        <span className="wb-cell-muted" style={{ fontSize: 13, marginRight: "auto" }}>
          {from}–{to} of {total} transactions
        </span>
        <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      </div>
    </div>
  );
}
