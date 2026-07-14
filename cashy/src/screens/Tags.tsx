import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Tag as TagIcon, Trash2 } from "lucide-react";
import { addTag, deleteTag, updateTag, useCashy } from "@/lib/store";
import { SWATCHES } from "@/lib/palette";
import type { Tag } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/ColorPicker";
import { EmptyState } from "@/components/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? "Sửa nhãn" : "Thêm nhãn"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tag-name">Tên nhãn</Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="Ví dụ: Du lịch"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Màu</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={save} disabled={!name.trim()}>
            {editing ? "Lưu" : "Thêm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Tags() {
  const { tags, transactions } = useCashy();
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
  function remove(t: Tag) {
    const n = usage.get(t.id) ?? 0;
    if (
      window.confirm(
        n
          ? `Xoá nhãn "${t.name}"? Nhãn sẽ bị gỡ khỏi ${n} giao dịch.`
          : `Xoá nhãn "${t.name}"?`,
      )
    )
      deleteTag(t.id);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Nhãn</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {tags.length} nhãn · gắn nhiều nhãn cho một giao dịch để lọc nhanh
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openAdd}>
          <Plus size={15} />
          Thêm nhãn
        </Button>
      </div>

      {tags.length ? (
        <div className="divide-y rounded-xl border bg-card shadow-card">
          {tags.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-3 py-2.5">
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ background: t.colorHex }}
              />
              <span className="flex-1 truncate text-sm font-medium">{t.name}</span>
              <span className="text-xs text-muted-foreground tnum">
                {usage.get(t.id) ?? 0} giao dịch
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                onClick={() => openEdit(t)}
                aria-label="Sửa"
              >
                <Pencil size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-expense"
                onClick={() => remove(t)}
                aria-label="Xoá"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<TagIcon size={18} />}
          title="Chưa có nhãn"
          description="Tạo nhãn như “Du lịch”, “Công việc” để lọc giao dịch dễ hơn."
          action={
            <Button size="sm" onClick={openAdd}>
              Thêm nhãn
            </Button>
          }
        />
      )}

      <TagEditor open={open} editing={editing} onClose={() => setOpen(false)} />
    </div>
  );
}
