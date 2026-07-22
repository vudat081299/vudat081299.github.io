import { useEffect, useMemo, useState } from "react";
import { useCashy } from "@/data/store";
import { addTag, deleteTag, updateTag } from "@/usecases";
import { confirm } from "@/lib/confirm";
import { SWATCHES } from "@/lib/palette";
import type { Tag } from "@/domain/types";
import { ColorPicker } from "@/ui/common/ColorPicker";
import { EmptyState } from "@/ui/common/EmptyState";
import { PageHeader } from "@/ui/common/PageHeader";
import { Modal } from "@/ui/kit/Modal";

function TagEditor({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: Tag | null;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(SWATCHES[5]);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setColor(editing?.colorHex ?? SWATCHES[5]);
    }
  }, [open, editing]);

  function save() {
    const n = name.trim();
    if (!n) return;
    if (editing) updateTag(editing.id, { name: n, colorHex: color });
    else addTag({ name: n, colorHex: color });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit tag" : "Add tag"}
      maxWidth={380}
      footer={
        <>
          <button type="button" className="wb-btn wb-btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="wb-btn" onClick={save} disabled={!name.trim()}>
            {editing ? "Save" : "Add"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="wb-field">
          <label className="wb-label" htmlFor="tag-name">
            Tag name
          </label>
          <input
            id="tag-name"
            className="wb-input"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="e.g. Travel"
          />
        </div>
        <div className="wb-field">
          <label className="wb-label">Color</label>
          <ColorPicker value={color} onChange={setColor} />
        </div>
      </div>
    </Modal>
  );
}

export function Tags() {
  const { workspace, tags, transactions } = useCashy();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tag | null>(null);

  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of transactions)
      for (const id of t.tagIds) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [transactions]);

  function openAdd() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(t: Tag) {
    setEditing(t);
    setOpen(true);
  }
  async function remove(t: Tag) {
    const n = usage.get(t.id) ?? 0;
    const ok = await confirm({
      title: `Delete tag "${t.name}"?`,
      message: n ? `The tag will be removed from ${n} transactions.` : undefined,
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok) deleteTag(t.id);
  }

  return (
    <div className="wb-stack wb-stack--loose">
      <PageHeader
        eyebrow={workspace?.displayName ?? "Cashy"}
        title="Tags"
        subtitle={`${tags.length} tags · add multiple tags to a transaction for quick filtering`}
        actions={
          <button type="button" className="wb-btn" style={{ gap: 6 }} onClick={openAdd}>
            <span className="wb-ico wb-ico--sm">add</span>
            Add tag
          </button>
        }
      />

      {tags.length ? (
        <div className="wb-list">
          {tags.map((t) => (
            <div key={t.id} className="wb-list__item">
              <span className="cashy-dot" style={{ background: t.colorHex }} />
              <span
                className="wb-list__title"
                style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {t.name}
              </span>
              <span className="wb-list__end">{usage.get(t.id) ?? 0} transactions</span>
              <button
                type="button"
                className="wb-btn wb-btn--ghost wb-btn--icon wb-btn--sm"
                onClick={() => openEdit(t)}
                aria-label="Edit"
              >
                <span className="wb-ico wb-ico--sm">edit</span>
              </button>
              <button
                type="button"
                className="wb-btn wb-btn--ghost wb-btn--icon wb-btn--sm"
                onClick={() => remove(t)}
                aria-label="Delete"
              >
                <span className="wb-ico wb-ico--sm">delete</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="wb-card">
          <div className="wb-card__body">
            <EmptyState
              icon="🏷️"
              title="No tags yet"
              description="Create tags like “Travel” or “Work” to filter transactions more easily."
              action={
                <button type="button" className="wb-btn" onClick={openAdd}>
                  Add tag
                </button>
              }
            />
          </div>
        </div>
      )}

      <TagEditor open={open} editing={editing} onClose={() => setOpen(false)} />
    </div>
  );
}
