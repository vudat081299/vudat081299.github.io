import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Category, Tag, Transaction } from "@/types";
import { deleteTransaction } from "@/lib/store";
import { AmountDisplay } from "@/components/AmountDisplay";
import { CategoryCap } from "@/components/CategoryCap";
import { StatusCap } from "@/components/StatusCap";
import { TagChip } from "@/components/TagChip";
import { openTxEditor } from "@/components/TransactionEditor";
import { openTxDetail } from "@/components/TransactionDetail";
import { usePagination } from "@/components/tx/usePagination";
import { Pagination } from "@/components/tx/Pagination";

/**
 * The one transaction table shared by the Dashboard (20/page) and the
 * Transactions screen (50/page). Self-contained: internal pagination, a
 * multi-select column with a bulk-delete bar, reveal-on-hover row edit/delete,
 * row click → the receipt detail, and a card foot with the pager + page info.
 */
export function TransactionTable({
  rows,
  categories,
  tags,
  pageSize,
  title,
  subtitle,
  headerActions,
  emptyState,
}: {
  rows: Transaction[];
  categories: Category[];
  tags: Tag[];
  pageSize: number;
  title?: ReactNode;
  subtitle?: ReactNode;
  headerActions?: ReactNode;
  emptyState?: ReactNode;
}) {
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);
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
      next.has(id) ? next.delete(id) : next.add(id);
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

  const bulkDelete = () => {
    if (!window.confirm(`Xoá ${selected.size} giao dịch đã chọn?`)) return;
    selected.forEach((id) => deleteTransaction(id));
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
              <h3 className="wb-table-head__title">Đã chọn {selected.size}</h3>
              <p className="wb-table-head__sub">Chọn hành động hàng loạt</p>
            </div>
            <div className="wb-table-head__actions">
              <button
                type="button"
                className="wb-btn wb-btn--ghost wb-btn--sm"
                onClick={() => setSelected(new Set())}
              >
                Bỏ chọn
              </button>
              <button
                type="button"
                className="wb-btn wb-btn--danger wb-btn--sm"
                style={{ gap: 4 }}
                onClick={bulkDelete}
              >
                <span className="wb-ico wb-ico--sm">delete</span>
                Xoá đã chọn
              </button>
            </div>
          </>
        ) : (
          <>
            {(title || subtitle) && (
              <div>
                {title && <h3 className="wb-table-head__title">{title}</h3>}
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
                <label className="wb-check" aria-label="Chọn tất cả trên trang">
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
              <th>Ngày</th>
              <th>Nội dung</th>
              <th>Danh mục</th>
              <th>Nhãn</th>
              <th className="wb-num">Số tiền</th>
              <th>Trạng thái</th>
              <th aria-label="Hành động" />
            </tr>
          </thead>
          <tbody>
            {pageItems.map((tx) => {
              const category = tx.categoryId ? (catById.get(tx.categoryId) ?? null) : null;
              const txTags = tx.tagIds
                .map((id) => tagById.get(id))
                .filter((t): t is Tag => Boolean(t));
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
                    <label className="wb-check" aria-label="Chọn giao dịch">
                      <input type="checkbox" checked={isSel} onChange={() => toggle(tx.id)} />
                    </label>
                  </td>
                  <td className="wb-cell-muted">{day}</td>
                  <td>
                    <span className="wb-cell-strong">
                      {tx.note || category?.name || "Giao dịch"}
                    </span>
                    {tx.payee && <span className="wb-cell-sub">{tx.payee}</span>}
                  </td>
                  <td>
                    <CategoryCap category={category} />
                  </td>
                  <td>
                    {txTags.length > 0 ? (
                      <span className="wb-tags">
                        {txTags.slice(0, 2).map((t) => (
                          <TagChip key={t.id} tag={t} />
                        ))}
                        {txTags.length > 2 && (
                          <span className="wb-cell-muted" style={{ fontSize: 12 }}>
                            +{txTags.length - 2}
                          </span>
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
                        aria-label="Sửa giao dịch"
                        title="Sửa"
                        onClick={() => openTxEditor(tx.id)}
                      >
                        <span className="wb-ico wb-ico--sm">edit</span>
                      </button>
                      <button
                        type="button"
                        className="wb-btn wb-btn--ghost wb-btn--icon wb-btn--sm wb-btn--round"
                        aria-label="Xoá giao dịch"
                        title="Xoá"
                        onClick={() => {
                          if (window.confirm("Xoá giao dịch này?")) deleteTransaction(tx.id);
                        }}
                      >
                        <span className="wb-ico wb-ico--sm">delete</span>
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
          {from}–{to} / {total} giao dịch
        </span>
        <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      </div>
    </div>
  );
}
