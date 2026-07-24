import { useEffect, useRef, useState } from "react";
import { useCashy } from "@/data/store";
import { deleteCategory, reorderCategory } from "@/usecases";
import { descendantIds, flattenTree } from "@/domain";
import { confirmDelete } from "@/lib/confirm";
import { Icon } from "@/ui/kit/icons";
import type { Category, TxType } from "@/domain/types";
import { EmptyState } from "@/ui/kit/EmptyState";
import { Button } from "@/ui/kit/Button";
import { Card } from "@/ui/kit/Card";

type DropPos = "before" | "into" | "after";
interface Drop {
  id: string;
  pos: DropPos;
}

export function Tree({
  type,
  onAddChild,
  onEdit,
}: {
  type: TxType;
  onAddChild: (parentId: string) => void;
  onEdit: (cat: Category) => void;
}) {
  const { categories } = useCashy();
  const nodes = flattenTree(categories, type);
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<Drop | null>(null);
  const dropRef = useRef<Drop | null>(null);
  // The pointer handlers below are bound once per drag, so they would close over
  // a stale list. A ref keeps them reading the tree as it stands on drop.
  const catsRef = useRef(categories);
  catsRef.current = categories;

  useEffect(() => {
    if (!dragId) return;
    const move = (e: PointerEvent) => {
      const el = (
        document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
      )?.closest("[data-cat-id]") as HTMLElement | null;
      if (!el || el.dataset.catId === dragId) {
        dropRef.current = null;
        setDrop(null);
        return;
      }
      const r = el.getBoundingClientRect();
      const rel = (e.clientY - r.top) / r.height;
      const pos: DropPos = rel < 0.3 ? "before" : rel > 0.7 ? "after" : "into";
      const d = { id: el.dataset.catId!, pos };
      dropRef.current = d;
      setDrop(d);
    };
    const up = () => {
      const d = dropRef.current;
      if (d) {
        const target = catsRef.current.find((c) => c.id === d.id);
        if (target) {
          if (d.pos === "into") reorderCategory(dragId, target.id, null, false);
          else
            reorderCategory(
              dragId,
              target.parentId ?? null,
              target.id,
              d.pos === "after",
            );
        }
      }
      setDragId(null);
      setDrop(null);
      dropRef.current = null;
      document.body.style.userSelect = "";
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
    return () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
    };
  }, [dragId]);

  async function remove(cat: Category) {
    const kids = descendantIds(categories, cat.id).size - 1;
    const ok = await confirmDelete({
      title: kids ? `Delete "${cat.name}" and ${kids} subcategories?` : `Delete "${cat.name}"?`,
      message: 'Related transactions will become "Uncategorised".',
    });
    if (ok) deleteCategory(cat.id);
  }

  if (nodes.length === 0) {
    return (
      <Card>
        <div className="wb-card__body">
          <EmptyState
            icon="🗂️"
            title="No categories yet"
            description={`Add your first ${type === "income" ? "income" : "expense"} category.`}
          />
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ padding: 4 }}>
      <ul className="wb-tree">
        {nodes.map(({ cat, depth }) => {
          const dropCls =
            drop?.id === cat.id
              ? drop.pos === "into"
                ? " is-drop-inside"
                : drop.pos === "before"
                  ? " is-drop-before"
                  : " is-drop-after"
              : "";
          return (
            <li
              key={cat.id}
              className={dragId === cat.id ? "wb-tree__node is-dragging" : "wb-tree__node"}
            >
              <div
                data-cat-id={cat.id}
                className={"wb-tree__row" + dropCls}
                style={{ paddingLeft: 8 + depth * 22 }}
              >
                <span
                  className="wb-tree__handle"
                  role="button"
                  aria-label="Drag to reorder"
                  style={{ touchAction: "none" }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    document.body.style.userSelect = "none";
                    setDragId(cat.id);
                  }}
                />
                <span className="cashy-tile" style={{ width: 26, height: 26, color: cat.colorHex }}>
                  <Icon name={cat.icon} size={14} />
                </span>
                <span className="wb-tree__label">{cat.name}</span>
                <div className="wb-tree__actions">
                  <Button
                    variant="ghost"
                    iconOnly
                    size="sm"
                    type="button"
                    onClick={() => onAddChild(cat.id)}
                    aria-label="Add subcategory"
                  >
                    <span className="wb-ico wb-ico--sm">add</span>
                  </Button>
                  <Button
                    variant="ghost"
                    iconOnly
                    size="sm"
                    type="button"
                    onClick={() => onEdit(cat)}
                    aria-label="Edit"
                  >
                    <span className="wb-ico wb-ico--sm">edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    iconOnly
                    size="sm"
                    type="button"
                    onClick={() => remove(cat)}
                    aria-label="Delete"
                  >
                    <span className="wb-ico wb-ico--sm">delete</span>
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
