import { useState, type DragEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * SlotGrid — the web-builder `wb-slotgrid` fixed-cell grid (CSS §48). Unlike
 * `Sortable`'s grid (which reflows and closes gaps), every cell is a FIXED slot:
 * items keep their exact position and empty cells persist as dashed drop targets,
 * so you can leave gaps on purpose. Drag a card onto an empty cell to move it;
 * drop onto an occupied cell to SWAP the two. `columns` locks the column count
 * (`--1`…`--6`); `--1` is the fixed-slot list.
 *
 * WHY a wrapper: the docs' `initSlotGrid` moves/swaps DOM nodes and toggles
 * `is-over` on the hovered cell. This ports that behaviour to React with native
 * HTML5 drag (no lib) but CONTROLLED — the model is a positional array where each
 * index is a cell and `null` is an empty slot, and every move emits a fresh array
 * through `onChange`. Move-into-empty and swap-with-occupied are the SAME
 * operation (swap the two indices — one of which may be `null`), which keeps the
 * logic a single line and empty slots automatically preserved.
 */
export function SlotGrid<T>({
  slots,
  onChange,
  renderItem,
  columns = 2,
  className,
}: {
  /** One entry per cell, in visual order; `null` marks a persistent empty slot. */
  slots: (T | null)[];
  /** Receives the new slot array after a move / swap (never mutates `slots`). */
  onChange: (next: (T | null)[]) => void;
  /** Inner content of a filled cell; the `wb-slotgrid__item` wrapper is added for you. */
  renderItem: (item: T, index: number) => ReactNode;
  /** Lock the column count (`wb-slotgrid--1`…`--6`); `1` is the fixed-slot list. */
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
}) {
  const [from, setFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const reset = () => {
    setFrom(null);
    setOver(null);
  };

  const onItemDragStart = (i: number, e: DragEvent<HTMLDivElement>) => {
    setFrom(i);
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", String(i));
    } catch {
      /* ignore */
    }
  };

  const onCellDragOver = (i: number, e: DragEvent<HTMLDivElement>) => {
    if (from === null) return;
    e.preventDefault();
    // Highlight the target slot — but never the source cell (nothing to drop there).
    setOver(i === from ? null : i);
  };

  const onCellDrop = (i: number, e: DragEvent<HTMLDivElement>) => {
    if (from === null) return;
    e.preventDefault();
    if (i !== from) {
      const next = slots.slice();
      // Swap the two indices — if the target held `null` this is a plain move,
      // if it held an item the two trade places. Empty slots persist either way.
      [next[from], next[i]] = [next[i], next[from]];
      onChange(next);
    }
    reset();
  };

  return (
    <div className={cn("wb-slotgrid", `wb-slotgrid--${columns}`, className)}>
      {slots.map((item, i) => (
        <div
          key={i}
          className={cn("wb-slotgrid__cell", over === i && "is-over")}
          onDragOver={(e) => onCellDragOver(i, e)}
          onDrop={(e) => onCellDrop(i, e)}
        >
          {item !== null && (
            <div
              className={cn("wb-slotgrid__item", from === i && "is-dragging")}
              draggable
              onDragStart={(e) => onItemDragStart(i, e)}
              onDragEnd={reset}
            >
              {renderItem(item, i)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
