import { useEffect, useRef, useState } from "react";
import { useCashy } from "@/data/store";
import { addCategory, deleteCategory, reorderCategory, updateCategory } from "@/usecases";
import { descendantIds, flattenTree } from "@/domain";
import { confirm } from "@/lib/confirm";
import { Icon } from "@/ui/kit/icons";
import { ICON_CHOICES } from "@/ui/kit/icon-map";
import { SWATCHES } from "@/lib/palette";
import type { Category, TxType } from "@/domain/types";
import { ColorPicker } from "@/ui/common/ColorPicker";
import { IconPicker } from "@/ui/common/IconPicker";
import { Select } from "@/ui/common/Select";
import { EmptyState } from "@/ui/common/EmptyState";
import { PageHeader } from "@/ui/common/PageHeader";
import { Modal } from "@/ui/kit/Modal";

type DropPos = "before" | "into" | "after";
interface Drop {
  id: string;
  pos: DropPos;
}

interface EditorState {
  editing: Category | null;
  type: TxType;
  parentId: string | null;
}

function CategoryEditor({
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
      title={`${editing ? "Sửa danh mục" : "Thêm danh mục"} · ${type === "income" ? "Thu nhập" : "Chi tiêu"}`}
      footer={
        <>
          <button type="button" className="wb-btn wb-btn--secondary" onClick={onClose}>
            Huỷ
          </button>
          <button type="button" className="wb-btn" onClick={save} disabled={!name.trim()}>
            {editing ? "Lưu" : "Thêm"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="wb-field">
          <label className="wb-label" htmlFor="cat-name">
            Tên
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <span className="cashy-tile" style={{ width: 38, height: 38, color: colorHex }}>
              <Icon name={icon} size={18} />
            </span>
            <input
              id="cat-name"
              className="wb-input"
              style={{ flex: 1 }}
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="Ví dụ: Ăn uống"
            />
          </div>
        </div>

        <div className="wb-field">
          <label className="wb-label" htmlFor="cat-parent">
            Danh mục cha
          </label>
          <Select
            id="cat-parent"
            value={parentId ?? "none"}
            onChange={(e) => setParentId(e.target.value === "none" ? null : e.target.value)}
          >
              <option value="none">— Cấp gốc —</option>
              {parentOptions.map(({ cat, depth }) => (
                <option key={cat.id} value={cat.id}>
                  {"  ".repeat(depth) + cat.name}
                </option>
              ))}
          </Select>
        </div>

        <div className="wb-field">
          <label className="wb-label">Màu</label>
          <ColorPicker value={colorHex} onChange={setColorHex} />
        </div>

        <div className="wb-field">
          <label className="wb-label">Biểu tượng</label>
          <IconPicker value={icon} onChange={setIcon} />
        </div>
      </div>
    </Modal>
  );
}

function Tree({
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
    const ok = await confirm({
      title: kids ? `Xoá "${cat.name}" và ${kids} danh mục con?` : `Xoá "${cat.name}"?`,
      message: 'Giao dịch liên quan sẽ thành "Chưa phân loại".',
      confirmLabel: "Xoá",
      danger: true,
    });
    if (ok) deleteCategory(cat.id);
  }

  if (nodes.length === 0) {
    return (
      <div className="wb-card">
        <div className="wb-card__body">
          <EmptyState
            icon="🗂️"
            title="Chưa có danh mục"
            description={`Thêm danh mục ${type === "income" ? "thu nhập" : "chi tiêu"} đầu tiên.`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="wb-card" style={{ padding: 4 }}>
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
                  aria-label="Kéo để sắp xếp"
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
                  <button
                    type="button"
                    className="wb-btn wb-btn--ghost wb-btn--icon wb-btn--sm"
                    onClick={() => onAddChild(cat.id)}
                    aria-label="Thêm danh mục con"
                  >
                    <span className="wb-ico wb-ico--sm">add</span>
                  </button>
                  <button
                    type="button"
                    className="wb-btn wb-btn--ghost wb-btn--icon wb-btn--sm"
                    onClick={() => onEdit(cat)}
                    aria-label="Sửa"
                  >
                    <span className="wb-ico wb-ico--sm">edit</span>
                  </button>
                  <button
                    type="button"
                    className="wb-btn wb-btn--ghost wb-btn--icon wb-btn--sm"
                    onClick={() => remove(cat)}
                    aria-label="Xoá"
                  >
                    <span className="wb-ico wb-ico--sm">delete</span>
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Categories() {
  const [type, setType] = useState<TxType>("expense");
  const [editor, setEditor] = useState<EditorState | null>(null);

  const { workspace } = useCashy();

  return (
    <div className="wb-stack wb-stack--loose">
      <PageHeader
        eyebrow={workspace?.displayName ?? "Cashy"}
        title="Danh mục"
        subtitle="Kéo tay cầm để đổi thứ tự; thả vào giữa một mục để lồng vào — cây sâu tuỳ ý."
        actions={
          <button
            type="button"
            className="wb-btn"
            style={{ gap: 6 }}
            onClick={() => setEditor({ editing: null, type, parentId: null })}
          >
            <span className="wb-ico wb-ico--sm">add</span>
            Thêm danh mục
          </button>
        }
      />

      <div className="wb-tabs wb-tabs--pill" style={{ width: "fit-content" }}>
        {(["expense", "income"] as TxType[]).map((t) => (
          <button
            key={t}
            type="button"
            className={type === t ? "wb-tab is-active" : "wb-tab"}
            onClick={() => setType(t)}
          >
            {t === "expense" ? "Chi tiêu" : "Thu nhập"}
          </button>
        ))}
      </div>

      <Tree
        type={type}
        onAddChild={(parentId) => setEditor({ editing: null, type, parentId })}
        onEdit={(cat) => setEditor({ editing: cat, type: cat.type, parentId: cat.parentId ?? null })}
      />

      <CategoryEditor state={editor} onClose={() => setEditor(null)} />
    </div>
  );
}
