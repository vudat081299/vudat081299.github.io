import { useState, type DragEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One node of a {@link Tree}. Recursive — `children` gives unlimited depth. */
export type TreeNode = {
  id: string;
  label: ReactNode;
  /** Material Symbols ligature shown before the label, in the `wb-tree__ico` slot. */
  icon?: string;
  children?: TreeNode[];
};

/** Where a dragged node lands relative to the row it is dropped on. */
type DropZone = "before" | "after" | "inside";

/** Read the drop zone from the pointer's position inside a row: top 30 % = insert
 *  before, bottom 30 % = insert after, middle = drop INSIDE (reparent). Mirrors
 *  the thresholds app.js `initTree` uses so the feel matches the CSS docs exactly. */
function zoneFromEvent(e: { currentTarget: HTMLElement; clientY: number }): DropZone {
  const r = e.currentTarget.getBoundingClientRect();
  const y = e.clientY - r.top;
  return y < r.height * 0.3 ? "before" : y > r.height * 0.7 ? "after" : "inside";
}

/** True when `id` is `node` itself or anywhere in its subtree — used to forbid
 *  dropping a node into its own descendant (which would detach the subtree). */
function containsId(node: TreeNode, id: string): boolean {
  if (node.id === id) return true;
  return (node.children ?? []).some((c) => containsId(c, id));
}

/** Find a node by id anywhere in the forest (returns the original reference). */
function findNode(nodes: TreeNode[], id: string): TreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = n.children && findNode(n.children, id);
    if (hit) return hit;
  }
  return null;
}

/** Return a NEW forest with `id` removed, plus the removed node. Pure — every
 *  touched level is copied, so the caller's tree prop is never mutated. */
function removeNode(nodes: TreeNode[], id: string): [TreeNode[], TreeNode | null] {
  let removed: TreeNode | null = null;
  const out: TreeNode[] = [];
  for (const n of nodes) {
    if (n.id === id) {
      removed = n;
      continue;
    }
    if (n.children && n.children.length) {
      const [kids, kidRemoved] = removeNode(n.children, id);
      if (kidRemoved) removed = kidRemoved;
      out.push({ ...n, children: kids });
    } else {
      out.push(n);
    }
  }
  return [out, removed];
}

/** Return a NEW forest with `moved` inserted relative to `targetId` per `zone`
 *  (sibling before/after, or appended as the last child for `inside`). Pure. */
function insertRelative(
  nodes: TreeNode[],
  targetId: string,
  zone: DropZone,
  moved: TreeNode,
): TreeNode[] {
  const out: TreeNode[] = [];
  for (const n of nodes) {
    const isTarget = n.id === targetId;
    if (isTarget && zone === "before") out.push(moved);
    const kids =
      n.children && n.children.length
        ? insertRelative(n.children, targetId, zone, moved)
        : n.children;
    let node = kids === n.children ? n : { ...n, children: kids };
    if (isTarget && zone === "inside") {
      node = { ...node, children: [...(node.children ?? []), moved] };
    }
    out.push(node);
    if (isTarget && zone === "after") out.push(moved);
  }
  return out;
}

/**
 * Tree — the web-builder `wb-tree` nested list (CSS §22): a category tree of
 * unlimited depth with a real chevron toggle (`wb-tree__toggle`), a 6-dot drag
 * handle (`wb-tree__handle`), and the drop feedback classes (`is-drop-before /
 * after / inside`) the docs style.
 *
 * WHY a wrapper: the docs drive expand/collapse and drag through app.js DOM
 * mutation; that can't be imported. This ports the exact `initTree` behaviour to
 * React with a CONTROLLED contract instead — `expandedIds` + `onToggle` own the
 * open state, and drag emits a brand-new tree through `onChange` (built by the
 * pure `removeNode` / `insertRelative` helpers, so the `nodes` prop is never
 * mutated). Drag is native HTML5 drag-and-drop (no lib), and — like `initTree` —
 * a node can never be dropped into its own descendant.
 */
export function Tree({
  nodes,
  expandedIds,
  onToggle,
  draggable = false,
  onChange,
  selectedId,
  onSelect,
  renderMeta,
  renderActions,
  lines = false,
  actionsShown = false,
  className,
}: {
  nodes: TreeNode[];
  /** Ids whose children are shown; a node with children NOT listed here renders collapsed. */
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  /** Enable HTML5 drag to reorder / reparent. Requires `onChange` to take effect. */
  draggable?: boolean;
  /** Receives the whole new tree after a drag move (never mutates the `nodes` prop). */
  onChange?: (nextTree: TreeNode[]) => void;
  /** Highlight one row (`is-selected`). */
  selectedId?: string;
  /** Called when a row (not its toggle) is clicked. */
  onSelect?: (id: string) => void;
  /** Right-aligned count / amount for a node → `wb-tree__meta`. */
  renderMeta?: (node: TreeNode) => ReactNode;
  /** Per-row action buttons (add / edit …) → `wb-tree__actions` (revealed on hover). */
  renderActions?: (node: TreeNode) => ReactNode;
  /** Draw vertical guide rails (`wb-tree--lines`). */
  lines?: boolean;
  /** Keep row actions always visible (`wb-tree--actions-shown`) — touch / management screens. */
  actionsShown?: boolean;
  className?: string;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropMark, setDropMark] = useState<{ id: string; zone: DropZone } | null>(null);

  const reset = () => {
    setDraggingId(null);
    setDropMark(null);
  };

  const handleDragStart = (node: TreeNode, e: DragEvent<HTMLDivElement>) => {
    setDraggingId(node.id);
    e.dataTransfer.effectAllowed = "move";
    // setData can throw in a few browsers; the drag still works without it.
    try {
      e.dataTransfer.setData("text/plain", node.id);
    } catch {
      /* ignore */
    }
  };

  const handleDragOver = (node: TreeNode, e: DragEvent<HTMLDivElement>) => {
    if (!draggingId || node.id === draggingId) return;
    const dragged = findNode(nodes, draggingId);
    if (!dragged || containsId(dragged, node.id)) return; // never into self / descendant
    e.preventDefault(); // allow the drop
    const zone = zoneFromEvent(e);
    if (!dropMark || dropMark.id !== node.id || dropMark.zone !== zone) {
      setDropMark({ id: node.id, zone });
    }
  };

  const handleDrop = (node: TreeNode, e: DragEvent<HTMLDivElement>) => {
    if (!draggingId) return;
    e.preventDefault();
    const dragged = findNode(nodes, draggingId);
    if (dragged && node.id !== draggingId && !containsId(dragged, node.id)) {
      const zone = zoneFromEvent(e);
      const [without, moved] = removeNode(nodes, draggingId);
      if (moved) onChange?.(insertRelative(without, node.id, zone, moved));
    }
    reset();
  };

  const renderNode = (node: TreeNode): ReactNode => {
    const hasChildren = !!node.children?.length;
    const expanded = expandedIds.has(node.id);
    return (
      <li
        key={node.id}
        className={cn(
          "wb-tree__node",
          hasChildren && !expanded && "is-collapsed",
          draggingId === node.id && "is-dragging",
        )}
      >
        <div
          className={cn(
            "wb-tree__row",
            selectedId === node.id && "is-selected",
            dropMark?.id === node.id && `is-drop-${dropMark.zone}`,
          )}
          draggable={draggable || undefined}
          onDragStart={draggable ? (e) => handleDragStart(node, e) : undefined}
          onDragOver={draggable ? (e) => handleDragOver(node, e) : undefined}
          onDrop={draggable ? (e) => handleDrop(node, e) : undefined}
          onDragEnd={draggable ? reset : undefined}
          onClick={onSelect ? () => onSelect(node.id) : undefined}
        >
          <button
            type="button"
            className={cn("wb-tree__toggle", !hasChildren && "is-leaf")}
            aria-label={hasChildren ? "Mở/đóng" : undefined}
            aria-hidden={hasChildren ? undefined : true}
            tabIndex={hasChildren ? undefined : -1}
            onClick={
              hasChildren
                ? (e) => {
                    e.stopPropagation();
                    onToggle(node.id);
                  }
                : undefined
            }
          />
          {draggable && <span className="wb-tree__handle" aria-hidden="true" />}
          {node.icon && (
            <span className="wb-tree__ico" aria-hidden="true">
              <span className="wb-ico wb-ico--sm">{node.icon}</span>
            </span>
          )}
          <span className="wb-tree__label">{node.label}</span>
          {renderMeta && <span className="wb-tree__meta">{renderMeta(node)}</span>}
          {renderActions && <span className="wb-tree__actions">{renderActions(node)}</span>}
        </div>
        {hasChildren && (
          <ul className="wb-tree__children">{node.children!.map(renderNode)}</ul>
        )}
      </li>
    );
  };

  return (
    <ul
      className={cn(
        "wb-tree",
        lines && "wb-tree--lines",
        actionsShown && "wb-tree--actions-shown",
        className,
      )}
    >
      {nodes.map(renderNode)}
    </ul>
  );
}
