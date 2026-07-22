import { useMemo, useState, type DragEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * One column of a {@link Table}. `key` is both the React key for the header/cell
 * and the default accessor: with no `render`, the cell shows `row[key]`. Give a
 * `sortValue` to make the column click-sortable (see {@link useTableSort}), and
 * `align: "right"` to get the web-builder `wb-num` treatment (right-aligned,
 * tabular figures) — the finance default for money columns.
 */
export type Column<T> = {
  key: string;
  header: ReactNode;
  /** `right` maps to the `wb-num` cell (tabular-nums, right-aligned). */
  align?: "left" | "right";
  /** Fixed column width; a number is treated as px. */
  width?: number | string;
  render?: (row: T) => ReactNode;
  /** Return a comparable for `row` to make this header click-sortable. */
  sortValue?: (row: T) => string | number;
};

/** Active sort, or `null` when the table is in its natural (unsorted) order. */
export type SortState = { key: string; dir: "asc" | "desc" } | null;

/**
 * useTableSort — the click-a-header sort behaviour, hand-rolled (no table lib):
 * clicking a sortable header cycles asc → desc → unsorted, and only ever one
 * column is active. Kept internal to {@link Table} (a component module stays a
 * component module — Fast Refresh friendly, matching how cashy files its hooks
 * separately). WHY a cycle back to unsorted: a money ledger has a meaningful
 * natural order (entry order), and a third click restores it without a separate
 * "clear sort" affordance.
 */
function useTableSort<T>(rows: T[], columns: Column<T>[]) {
  const [sort, setSort] = useState<SortState>(null);

  const toggleSort = (key: string) =>
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    const dir = sort.dir === "asc" ? 1 : -1;
    // Copy first — never sort the caller's array in place.
    return [...rows].sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      if (av < bv) return -dir;
      if (av > bv) return dir;
      return 0;
    });
  }, [rows, columns, sort]);

  return { sort, toggleSort, sorted };
}

/** Read a cell: an explicit `render`, else the row's `key` property. */
function cellContent<T>(col: Column<T>, row: T): ReactNode {
  if (col.render) return col.render(row);
  const value = (row as Record<string, unknown>)[col.key];
  return value == null ? null : (value as ReactNode);
}

/**
 * Table — a generic, typed data table reproducing the web-builder `wb-table`
 * markup (hairline rows, quiet uppercase headers, `wb-num` money cells, a tinted
 * `tfoot` total row). It is the GENERIC counterpart to cashy's product-specific
 * `tx/TransactionTable`: columns and rows are passed in, so any list — accounts,
 * budgets, receivables — reuses one table instead of hand-writing `<table>`s.
 *
 * Opt-in features, each off by default so the plain case stays a plain table:
 *   • sort   — declare `sortValue` on a column; headers become click-sortable.
 *   • select — `selectable` adds a checkbox column with an indeterminate
 *              "select all" header; controlled via `selected`/`onSelectedChange`
 *              or self-managed when those are omitted.
 *   • reorder — `onReorder` adds a drag grip per row (native HTML5 drag). When
 *              set, sorting is bypassed so the manual order is what you drag.
 *   • dense/striped/bordered/sticky — the `wb-table--*` modifiers.
 */
export function Table<T>({
  columns,
  rows,
  rowKey,
  dense = false,
  striped = false,
  bordered = false,
  hover = true,
  sticky = false,
  scrollMaxHeight,
  footer,
  onRowClick,
  rowClassName,
  selectable = false,
  selected,
  onSelectedChange,
  onReorder,
  emptyState,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  /** Stable id per row — the React key AND the selection identity. */
  rowKey: (row: T) => string;
  /** `wb-table--compact`: tighter cell padding for long ledgers. */
  dense?: boolean;
  striped?: boolean;
  bordered?: boolean;
  /** Row hover highlight; on by default (adds `wb-table--no-hover` when off). */
  hover?: boolean;
  /** `wb-table--sticky` header — pair with `scrollMaxHeight` to bound the scroll. */
  sticky?: boolean;
  /** Caps the scroll region height (needed for a sticky header to have somewhere to scroll). */
  scrollMaxHeight?: number | string;
  /** `tfoot` content — pass one or more `<tr>` rows of `<td>`s (e.g. a net total). */
  footer?: ReactNode;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  /** Turn on the leading multi-select checkbox column. */
  selectable?: boolean;
  /** Controlled selection (row ids). Omit both to let the table manage it. */
  selected?: Set<string>;
  onSelectedChange?: (next: Set<string>) => void;
  /** Enable drag-to-reorder; called with source/target row indices on drop. */
  onReorder?: (from: number, to: number) => void;
  emptyState?: ReactNode;
  className?: string;
}) {
  const { sort, toggleSort, sorted } = useTableSort(rows, columns);
  // Reorder needs the natural order to be what you see (indices must line up
  // with `rows`), so a sortable header and a drag grip are mutually exclusive.
  const display = onReorder ? rows : sorted;

  // Selection: controlled when the caller passes both handles, else self-managed.
  const [ownSel, setOwnSel] = useState<Set<string>>(() => new Set());
  const sel = selected ?? ownSel;
  const setSel = onSelectedChange ?? setOwnSel;

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const ids = display.map(rowKey);
  const allChecked = ids.length > 0 && ids.every((id) => sel.has(id));
  const someChecked = !allChecked && ids.some((id) => sel.has(id));

  const toggleOne = (id: string) => {
    const next = new Set(sel);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSel(next);
  };
  const toggleAll = () => {
    const next = new Set(sel);
    if (allChecked) ids.forEach((id) => next.delete(id));
    else ids.forEach((id) => next.add(id));
    setSel(next);
  };

  const onDrop = (to: number) => {
    if (onReorder && dragIndex !== null && dragIndex !== to) onReorder(dragIndex, to);
    setDragIndex(null);
  };

  const leading = (selectable ? 1 : 0) + (onReorder ? 1 : 0);
  const totalCols = columns.length + leading;

  return (
    <div
      className="wb-table-scroll"
      style={scrollMaxHeight != null ? { maxHeight: scrollMaxHeight } : undefined}
    >
      <table
        className={cn(
          "wb-table",
          dense && "wb-table--compact",
          striped && "wb-table--striped",
          bordered && "wb-table--bordered",
          sticky && "wb-table--sticky",
          !hover && "wb-table--no-hover",
          onReorder && "wb-table--sortable",
          className,
        )}
      >
        <thead>
          <tr>
            {onReorder && <th className="wb-row-grip" aria-hidden="true" />}
            {selectable && (
              <th style={{ width: 44 }}>
                <label className="wb-check" aria-label="Select all rows">
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
            )}
            {columns.map((col) => {
              // `sort &&` narrows sort to non-null in the true branch, so the
              // direction is read safely without leaning on runtime guards.
              const activeDir = sort && sort.key === col.key ? sort.dir : null;
              const ariaSort = !col.sortValue
                ? undefined
                : activeDir === "asc"
                  ? "ascending"
                  : activeDir === "desc"
                    ? "descending"
                    : "none";
              return (
                <th
                  key={col.key}
                  className={cn(col.align === "right" && "wb-num")}
                  style={col.width != null ? { width: col.width } : undefined}
                  aria-sort={ariaSort}
                >
                  {col.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      // Inherit the th's uppercase/tracking so the trigger is
                      // invisible chrome — only the sort caret is added ink.
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        margin: 0,
                        padding: 0,
                        border: 0,
                        background: "none",
                        font: "inherit",
                        letterSpacing: "inherit",
                        textTransform: "inherit",
                        color: "inherit",
                        cursor: "pointer",
                        flexDirection: col.align === "right" ? "row-reverse" : "row",
                      }}
                    >
                      {col.header}
                      <span
                        className={cn("wb-ico wb-ico--xs", !activeDir && "wb-ico--faint")}
                        aria-hidden="true"
                      >
                        {activeDir === "asc"
                          ? "arrow_upward"
                          : activeDir === "desc"
                            ? "arrow_downward"
                            : "unfold_more"}
                      </span>
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {display.length === 0 && emptyState != null ? (
            <tr>
              <td colSpan={totalCols}>{emptyState}</td>
            </tr>
          ) : (
            display.map((row, index) => {
              const id = rowKey(row);
              const isSel = sel.has(id);
              return (
                <tr
                  key={id}
                  className={cn(
                    rowClassName?.(row),
                    isSel && "is-selected",
                    dragIndex === index && "is-dragging",
                  )}
                  style={onRowClick ? { cursor: "pointer" } : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  draggable={onReorder ? true : undefined}
                  onDragStart={onReorder ? () => setDragIndex(index) : undefined}
                  onDragOver={
                    onReorder
                      ? (e: DragEvent<HTMLTableRowElement>) => e.preventDefault()
                      : undefined
                  }
                  onDrop={onReorder ? () => onDrop(index) : undefined}
                >
                  {onReorder && (
                    <td className="wb-row-grip">
                      <span className="wb-grip" aria-hidden="true" />
                    </td>
                  )}
                  {selectable && (
                    // Stop the checkbox cell from bubbling into a row click.
                    <td onClick={(e) => e.stopPropagation()}>
                      <label className="wb-check" aria-label="Select row">
                        <input type="checkbox" checked={isSel} onChange={() => toggleOne(id)} />
                      </label>
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={cn(col.align === "right" && "wb-num")}>
                      {cellContent(col, row)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>

        {footer != null && <tfoot>{footer}</tfoot>}
      </table>
    </div>
  );
}
