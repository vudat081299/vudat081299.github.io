import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  FolderTree,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  addCategory,
  deleteCategory,
  getState,
  reorderCategory,
  updateCategory,
  useCashy,
} from "@/lib/store";
import { descendantIds, flattenTree } from "@/lib/domain";
import { Icon, ICON_CHOICES } from "@/lib/icons";
import { SWATCHES } from "@/lib/palette";
import type { Category, TxType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/ColorPicker";
import { IconPicker } from "@/components/IconPicker";
import { EmptyState } from "@/components/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const open = state !== null;
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
  const parentOptions = flattenTree(categories, type).filter(
    (n) => !banned.has(n.cat.id),
  );

  function save() {
    const n = name.trim();
    if (!n) return;
    if (editing) updateCategory(editing.id, { name: n, colorHex, icon, parentId });
    else addCategory({ name: n, type, colorHex, icon, parentId });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Sửa danh mục" : "Thêm danh mục"} ·{" "}
            {type === "income" ? "Thu nhập" : "Chi tiêu"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Tên</Label>
            <div className="flex gap-2">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-md"
                style={{ background: colorHex + "22", color: colorHex }}
              >
                <Icon name={icon} size={18} />
              </span>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                placeholder="Ví dụ: Ăn uống"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Danh mục cha</Label>
            <Select
              value={parentId ?? "none"}
              onValueChange={(v) => setParentId(v === "none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Cấp gốc —</SelectItem>
                {parentOptions.map(({ cat, depth }) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span style={{ paddingLeft: depth * 12 }}>{cat.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Màu</Label>
            <ColorPicker value={colorHex} onChange={setColorHex} />
          </div>

          <div className="space-y-2">
            <Label>Biểu tượng</Label>
            <IconPicker value={icon} onChange={setIcon} />
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
        const target = getState().categories.find((c) => c.id === d.id);
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

  function remove(cat: Category) {
    const kids = descendantIds(categories, cat.id).size - 1;
    if (
      window.confirm(
        kids
          ? `Xoá "${cat.name}" và ${kids} danh mục con? Giao dịch liên quan sẽ thành "Chưa phân loại".`
          : `Xoá "${cat.name}"? Giao dịch liên quan sẽ thành "Chưa phân loại".`,
      )
    )
      deleteCategory(cat.id);
  }

  if (nodes.length === 0) {
    return (
      <EmptyState
        icon={<FolderTree size={18} />}
        title="Chưa có danh mục"
        description={`Thêm danh mục ${type === "income" ? "thu nhập" : "chi tiêu"} đầu tiên.`}
      />
    );
  }

  return (
    <div className="rounded-lg border bg-card p-1">
      {nodes.map(({ cat, depth }) => {
        const isDrop = drop?.id === cat.id;
        const style: CSSProperties = { paddingLeft: 8 + depth * 22 };
        if (isDrop && drop.pos !== "into")
          style.boxShadow =
            drop.pos === "before"
              ? "inset 0 2px 0 hsl(var(--brand))"
              : "inset 0 -2px 0 hsl(var(--brand))";
        return (
          <div
            key={cat.id}
            data-cat-id={cat.id}
            className={cn(
              "group relative flex items-center gap-2 rounded-md py-1.5 pr-1",
              dragId === cat.id && "opacity-40",
              isDrop && drop.pos === "into" && "ring-2 ring-brand ring-inset",
            )}
            style={style}
          >
            <button
              type="button"
              className="cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground"
              onPointerDown={(e) => {
                e.preventDefault();
                document.body.style.userSelect = "none";
                setDragId(cat.id);
              }}
              aria-label="Kéo để sắp xếp"
            >
              <GripVertical size={15} />
            </button>
            <span
              className="grid size-6 shrink-0 place-items-center rounded-[5px]"
              style={{ background: cat.colorHex + "22", color: cat.colorHex }}
            >
              <Icon name={cat.icon} size={13} />
            </span>
            <span className="flex-1 truncate text-[13.5px]">{cat.name}</span>
            <div className="flex items-center opacity-0 transition group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                onClick={() => onAddChild(cat.id)}
                aria-label="Thêm danh mục con"
              >
                <Plus size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                onClick={() => onEdit(cat)}
                aria-label="Sửa"
              >
                <Pencil size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-expense"
                onClick={() => remove(cat)}
                aria-label="Xoá"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Categories() {
  const [type, setType] = useState<TxType>("expense");
  const [editor, setEditor] = useState<EditorState | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Danh mục</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Kéo tay cầm để đổi thứ tự; thả vào giữa một mục để lồng vào — cây sâu
            tuỳ ý.
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => setEditor({ editing: null, type, parentId: null })}
        >
          <Plus size={15} />
          Thêm danh mục
        </Button>
      </div>

      <div className="flex w-fit rounded-md bg-muted p-0.5">
        {(["expense", "income"] as TxType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              "rounded-[4px] px-3 py-1 text-[13px] font-medium transition",
              type === t
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
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
