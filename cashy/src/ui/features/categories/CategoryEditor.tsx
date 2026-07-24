import { useEffect, useState } from "react";
import { useCashy } from "@/data/store";
import { addCategory, updateCategory } from "@/usecases";
import { descendantIds, flattenTree } from "@/domain";
import { Icon } from "@/ui/kit/icons";
import { ICON_CHOICES } from "@/ui/kit/icon-map";
import { SWATCHES } from "@/lib/palette";
import type { Category, TxType } from "@/domain/types";
import { ColorPicker } from "@/ui/common/ColorPicker";
import { IconPicker } from "@/ui/common/IconPicker";
import { Select } from "@/ui/kit/Select";
import { Modal } from "@/ui/kit/Modal";
import { Button } from "@/ui/kit/Button";
import { Input } from "@/ui/kit/Input";

export interface EditorState {
  editing: Category | null;
  type: TxType;
  parentId: string | null;
}

export function CategoryEditor({
  state,
  onClose,
}: {
  state: EditorState | null;
  onClose: () => void;
}) {
  const { categories } = useCashy();
  const editing = state?.editing ?? null;

  const [name, setName] = useState("");
  const [colorHex, setColorHex] = useState<string>(SWATCHES[0]);
  const [icon, setIcon] = useState<string>(ICON_CHOICES[0]);
  const [parentId, setParentId] = useState<string | null>(null);

  useEffect(() => {
    if (!state) return;
    setName(editing?.name ?? "");
    setColorHex(editing?.colorHex ?? SWATCHES[0]);
    setIcon(editing?.icon ?? "shopping-bag");
    setParentId(editing ? (editing.parentId ?? null) : state.parentId);
  }, [state, editing]);

  if (!state) return null;
  const type = editing?.type ?? state.type;

  // valid parents: same type, excluding self + descendants
  const banned = editing ? descendantIds(categories, editing.id) : new Set<string>();
  const parentOptions = flattenTree(categories, type).filter((n) => !banned.has(n.cat.id));

  function save() {
    const n = name.trim();
    if (!n) return;
    if (editing) updateCategory(editing.id, { name: n, colorHex, icon, parentId });
    else addCategory({ name: n, type, colorHex, icon, parentId });
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`${editing ? "Edit category" : "Add category"} · ${type === "income" ? "Income" : "Expense"}`}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={!name.trim()}>
            {editing ? "Save" : "Add"}
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="wb-field">
          <label className="wb-label" htmlFor="cat-name">
            Name
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <span className="cashy-tile" style={{ width: 38, height: 38, color: colorHex }}>
              <Icon name={icon} size={18} />
            </span>
            <Input
              id="cat-name"
              style={{ flex: 1 }}
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="e.g. Dining"
            />
          </div>
        </div>

        <div className="wb-field">
          <label className="wb-label" htmlFor="cat-parent">
            Parent category
          </label>
          <Select
            id="cat-parent"
            value={parentId ?? "none"}
            onChange={(e) => setParentId(e.target.value === "none" ? null : e.target.value)}
          >
              <option value="none">— Top level —</option>
              {parentOptions.map(({ cat, depth }) => (
                <option key={cat.id} value={cat.id}>
                  {"  ".repeat(depth) + cat.name}
                </option>
              ))}
          </Select>
        </div>

        <div className="wb-field">
          <label className="wb-label">Color</label>
          <ColorPicker value={colorHex} onChange={setColorHex} />
        </div>

        <div className="wb-field">
          <label className="wb-label">Icon</label>
          <IconPicker value={icon} onChange={setIcon} />
        </div>
      </div>
    </Modal>
  );
}
