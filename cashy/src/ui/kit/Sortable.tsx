import { useState, type DragEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Move the item at `from` to insertion index `to` (0..len), returning a NEW array.
 *  `to` is expressed in the ORIGINAL coordinates, so removing the item first shifts
 *  the target down by one when it sat after the source — the standard splice dance. */
function move<T>(arr: T[], from: number, to: number): T[] {
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(from < to ? to - 1 : to, 0, item);
  return copy;
}

/** Live drag state: the source index, the insertion index the placeholder marks,
 *  and the dragged item's measured size (so the dashed slot matches it). */
type DragState = { from: number; over: number; h: number; w?: number };

/**
 * Sortable — the web-builder `wb-sortable` reorderable list or card grid (CSS
 * §23): a flat, single-level drag-to-reorder with the dashed `wb-sortable__ph`
 * placeholder showing where the item will land. `layout="grid"` adds
 * `wb-sortable--grid`; `noGrip` hides the 6-dot `wb-grip` and drags the whole
 * row/card.
 *
 * WHY a wrapper: the docs' `initSortable` reorders by mutating the DOM and
 * inserting a placeholder node. This ports that behaviour to React with native
 * HTML5 drag (no lib) but stays CONTROLLED — it computes the drop index and emits
 * a fresh array through `onReorder` rather than moving DOM nodes, so the caller's
 * `items` stay the source of truth. The placeholder is a real rendered element
 * sized to the dragged item, matching the docs' affordance. Callers give an
 * `itemKey` so React keeps stable identity through a reorder; `renderItem`
 * supplies only the row's inner content — the draggable wrapper and grip are the
 * component's job.
 */
export function Sortable<T>({
  items,
  itemKey,
  renderItem,
  onReorder,
  layout = "list",
  noGrip = false,
  className,
}: {
  items: T[];
  /** Stable identity for React keys — required so a reorder animates, not rebuilds. */
  itemKey: (item: T) => string | number;
  /** Inner content of one row/card; the `wb-sortable__item` wrapper + grip are added for you. */
  renderItem: (item: T, index: number) => ReactNode;
  /** Receives the reordered array (never mutates `items`). */
  onReorder: (next: T[]) => void;
  /** `list` = vertical rows (default); `grid` = responsive card grid (`wb-sortable--grid`). */
  layout?: "list" | "grid";
  /** Hide the grip and make the whole row/card the drag surface (`wb-sortable--no-grip`). */
  noGrip?: boolean;
  className?: string;
}) {
  const [drag, setDrag] = useState<DragState | null>(null);

  const onItemDragStart = (i: number, e: DragEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setDrag({ from: i, over: i, h: r.height, w: layout === "grid" ? r.width : undefined });
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", String(i));
    } catch {
      /* ignore */
    }
  };

  const onItemDragOver = (i: number, e: DragEvent<HTMLDivElement>) => {
    if (!drag) return;
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    let over: number;
    if (layout === "list") {
      over = e.clientY < r.top + r.height / 2 ? i : i + 1;
    } else {
      // Grid: decide before/after by the pointer vs the card centre — same-row
      // comparisons use X, cross-row use Y, mirroring app.js's nearest-cell logic.
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const sameRow = Math.abs(e.clientY - cy) < r.height * 0.6;
      over = (sameRow ? e.clientX > cx : e.clientY > cy) ? i + 1 : i;
    }
    if (drag.over !== over) setDrag({ ...drag, over });
  };

  const commit = () => {
    if (drag) onReorder(move(items, drag.from, drag.over));
    setDrag(null);
  };

  const placeholder = (
    <div
      key="__ph"
      className="wb-sortable__ph"
      style={{ height: drag?.h, width: drag?.w }}
    />
  );

  const children: ReactNode[] = [];
  items.forEach((item, i) => {
    if (drag && drag.over === i) children.push(placeholder);
    children.push(
      <div
        key={itemKey(item)}
        className={cn("wb-sortable__item", drag?.from === i && "is-dragging")}
        draggable
        onDragStart={(e) => onItemDragStart(i, e)}
        onDragOver={(e) => onItemDragOver(i, e)}
      >
        {!noGrip && <span className="wb-grip" aria-hidden="true" />}
        {renderItem(item, i)}
      </div>,
    );
  });
  if (drag && drag.over === items.length) children.push(placeholder);

  return (
    <div
      className={cn(
        "wb-sortable",
        layout === "grid" && "wb-sortable--grid",
        noGrip && "wb-sortable--no-grip",
        className,
      )}
      // Container-level handlers catch drops that land in a gap or on the
      // placeholder (which carry no item handler of their own).
      onDragOver={(e) => {
        if (drag) e.preventDefault();
      }}
      onDrop={(e) => {
        if (!drag) return;
        e.preventDefault();
        commit();
      }}
      onDragEnd={() => setDrag(null)}
    >
      {children}
    </div>
  );
}
