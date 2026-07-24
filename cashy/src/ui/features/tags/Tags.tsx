import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useCashy } from "@/data/store";
import { addTag, deleteTag, updateTag } from "@/usecases";
import { confirmDelete } from "@/lib/confirm";
import { SWATCHES } from "@/lib/palette";
import type { Tag } from "@/domain/types";
import { ColorPicker } from "@/ui/common/ColorPicker";
import { PageHeader } from "@/ui/common/PageHeader";
import { Modal } from "@/ui/kit/Modal";
import { Button } from "@/ui/kit/Button";
import { Input } from "@/ui/kit/Input";

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
          <label className="wb-label" htmlFor="tag-name">
            Tag name
          </label>
          <Input
            id="tag-name"
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

type SortKey = "name" | "count";

export function Tags() {
  const { tags, transactions } = useCashy();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [sort, setSort] = useState<SortKey>("name");

  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of transactions)
      for (const id of t.tagIds) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [transactions]);

  // Two orders the UI toggles between: alphabetical, or most-used first. The
  // count itself is hidden until hover, so "Most used" is how you read the ranking.
  const ordered = useMemo(() => {
    const list = [...tags];
    if (sort === "count") {
      list.sort(
        (a, b) =>
          (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) ||
          a.name.localeCompare(b.name, "vi"),
      );
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name, "vi"));
    }
    return list;
  }, [tags, usage, sort]);

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
    const ok = await confirmDelete({
      title: `Delete tag "${t.name}"?`,
      message: n ? `The tag will be removed from ${n} transactions.` : undefined,
    });
    if (ok) deleteTag(t.id);
  }

  return (
    <div className="wb-stack wb-stack--loose">
      <PageHeader
        title="Tags"
        subtitle={`${tags.length} tags · click to edit, × to remove`}
        actions={
          <div className="wb-tabs wb-tabs--pill" role="group" aria-label="Sort tags">
            <button
              type="button"
              className={sort === "name" ? "wb-tab is-active" : "wb-tab"}
              onClick={() => setSort("name")}
            >
              Name
            </button>
            <button
              type="button"
              className={sort === "count" ? "wb-tab is-active" : "wb-tab"}
              onClick={() => setSort("count")}
            >
              Most used
            </button>
          </div>
        }
      />

      <div className="cashy-taggrid">
        {/* The create capsule lives in the grid itself — dashed = "add", per the
            house convention — so there's one obvious way to make a tag. */}
        <button type="button" className="cashy-tag-add" onClick={openAdd}>
          <span className="wb-ico wb-ico--sm">add</span>
          New tag
        </button>

        {ordered.map((t) => {
          const n = usage.get(t.id) ?? 0;
          return (
            <span
              key={t.id}
              className="wb-tag wb-tag--notch wb-tag--lg cashy-tag-mgmt cashy-tag-edit"
              style={{ "--wb-tag-color": t.colorHex } as CSSProperties}
              role="button"
              tabIndex={0}
              title={`${t.name} · ${n} ${n === 1 ? "transaction" : "transactions"}`}
              onClick={() => openEdit(t)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openEdit(t);
                }
              }}
            >
              <span className="cashy-tag-mgmt__name">{t.name}</span>
              <button
                type="button"
                className="wb-tag__x"
                aria-label={`Delete tag ${t.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  remove(t);
                }}
              />
            </span>
          );
        })}
      </div>

      {tags.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--wb-fg-muted)", margin: "2px 0 0" }}>
          No tags yet — create one like “Travel” or “Work” to filter transactions more easily.
        </p>
      )}

      <TagEditor open={open} editing={editing} onClose={() => setOpen(false)} />
    </div>
  );
}
