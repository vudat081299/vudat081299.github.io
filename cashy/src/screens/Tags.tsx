import { useEffect, useMemo, useState } from "react";
import { addTag, deleteTag, updateTag, useCashy } from "@/lib/store";
import { confirm } from "@/lib/confirm";
import { SWATCHES } from "@/lib/palette";
import type { Tag } from "@/types";
import { ColorPicker } from "@/components/ColorPicker";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/wb/Modal";

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
      title={editing ? "Sửa nhãn" : "Thêm nhãn"}
      maxWidth={380}
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
          <label className="wb-label" htmlFor="tag-name">
            Tên nhãn
          </label>
          <input
            id="tag-name"
            className="wb-input"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="Ví dụ: Du lịch"
          />
        </div>
        <div className="wb-field">
          <label className="wb-label">Màu</label>
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
      title: `Xoá nhãn "${t.name}"?`,
      message: n ? `Nhãn sẽ bị gỡ khỏi ${n} giao dịch.` : undefined,
      confirmLabel: "Xoá",
      danger: true,
    });
    if (ok) deleteTag(t.id);
  }

  return (
    <div className="wb-stack wb-stack--loose">
      <PageHeader
        eyebrow={workspace?.displayName ?? "Cashy"}
        title="Nhãn"
        subtitle={`${tags.length} nhãn · gắn nhiều nhãn cho một giao dịch để lọc nhanh`}
        actions={
          <button type="button" className="wb-btn" style={{ gap: 6 }} onClick={openAdd}>
            <span className="wb-ico wb-ico--sm">add</span>
            Thêm nhãn
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
              <span className="wb-list__end">{usage.get(t.id) ?? 0} giao dịch</span>
              <button
                type="button"
                className="wb-btn wb-btn--ghost wb-btn--icon wb-btn--sm"
                onClick={() => openEdit(t)}
                aria-label="Sửa"
              >
                <span className="wb-ico wb-ico--sm">edit</span>
              </button>
              <button
                type="button"
                className="wb-btn wb-btn--ghost wb-btn--icon wb-btn--sm"
                onClick={() => remove(t)}
                aria-label="Xoá"
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
              title="Chưa có nhãn"
              description="Tạo nhãn như “Du lịch”, “Công việc” để lọc giao dịch dễ hơn."
              action={
                <button type="button" className="wb-btn" onClick={openAdd}>
                  Thêm nhãn
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
