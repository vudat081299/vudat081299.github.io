import { useEffect, useMemo, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  addTransaction,
  deleteTransaction,
  updateTransaction,
  useCashy,
} from "@/lib/store";
import { flattenTree } from "@/lib/domain";
import { formatMoney, parseMoney } from "@/lib/money";
import { todayYMD } from "@/lib/date";
import type { TxType } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TagChip } from "@/components/TagChip";

let openFn: ((id: string | null) => void) | null = null;
/** Open the transaction editor from anywhere. Pass an id to edit, or null to add. */
export function openTxEditor(id: string | null = null) {
  openFn?.(id);
}

export function TransactionEditor() {
  const { categories, tags, transactions } = useCashy();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<TxType>("expense");
  const [amountStr, setAmountStr] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [occurredAt, setOccurredAt] = useState(todayYMD());
  const [note, setNote] = useState("");

  useEffect(() => {
    openFn = (id) => {
      const tx = id ? (transactions.find((t) => t.id === id) ?? null) : null;
      setEditingId(tx ? tx.id : null);
      setType(tx?.type ?? "expense");
      setAmountStr(tx && tx.amount ? String(tx.amount) : "");
      setCategoryId(tx?.categoryId ?? null);
      setTagIds(tx?.tagIds ?? []);
      setOccurredAt(tx?.occurredAt ?? todayYMD());
      setNote(tx?.note ?? "");
      setOpen(true);
    };
    return () => {
      openFn = null;
    };
  }, [transactions]);

  const amount = parseMoney(amountStr);
  const catOptions = useMemo(() => flattenTree(categories, type), [categories, type]);

  function changeType(t: TxType) {
    setType(t);
    if (categoryId && !categories.some((c) => c.id === categoryId && c.type === t)) {
      setCategoryId(null);
    }
  }

  function save() {
    if (amount <= 0) return;
    const payload = {
      amount,
      type,
      categoryId,
      tagIds,
      note: note.trim(),
      occurredAt,
    };
    if (editingId) updateTransaction(editingId, payload);
    else addTransaction(payload);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingId ? "Sửa giao dịch" : "Thêm giao dịch"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
            {(["expense", "income"] as TxType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => changeType(t)}
                className={cn(
                  "rounded-[4px] py-1.5 text-[13px] font-medium transition",
                  type === t
                    ? t === "income"
                      ? "bg-card text-income shadow-sm"
                      : "bg-card text-expense shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                {t === "expense" ? "Chi tiêu" : "Thu nhập"}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-amount">Số tiền</Label>
            <Input
              id="tx-amount"
              inputMode="numeric"
              autoComplete="off"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0"
              className="font-mono text-lg tnum"
            />
            <div className="font-mono text-xs text-muted-foreground tnum">
              {formatMoney(amount)}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Danh mục</Label>
            <Select
              value={categoryId ?? "none"}
              onValueChange={(v) => setCategoryId(v === "none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Chưa phân loại</SelectItem>
                {catOptions.map(({ cat, depth }) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span style={{ paddingLeft: depth * 12 }}>{cat.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Nhãn</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-auto min-h-9 w-full flex-wrap justify-start gap-1 py-1.5 font-normal"
                >
                  {tagIds.length ? (
                    tagIds.map((id) => {
                      const t = tags.find((x) => x.id === id);
                      return t ? <TagChip key={id} tag={t} /> : null;
                    })
                  ) : (
                    <span className="text-muted-foreground">Chọn nhãn…</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56 p-1">
                {tags.length === 0 ? (
                  <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                    Chưa có nhãn nào. Tạo ở màn Nhãn.
                  </div>
                ) : (
                  tags.map((t) => {
                    const on = tagIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          setTagIds(
                            on ? tagIds.filter((x) => x !== t.id) : [...tagIds, t.id],
                          )
                        }
                        className={cn(
                          "flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-[13px] hover:bg-accent",
                          on && "bg-accent",
                        )}
                      >
                        <span
                          className="size-2 rounded-full"
                          style={{ background: t.colorHex }}
                        />
                        {t.name}
                        {on && <Check size={14} className="ml-auto" />}
                      </button>
                    );
                  })
                )}
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-date">Ngày</Label>
            <Input
              id="tx-date"
              type="date"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-note">Ghi chú</Label>
            <Textarea
              id="tx-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Không bắt buộc"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {editingId ? (
            <Button
              variant="ghost"
              className="gap-1.5 text-expense hover:text-expense"
              onClick={() => {
                deleteTransaction(editingId);
                setOpen(false);
              }}
            >
              <Trash2 size={15} />
              Xoá
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <Button onClick={save} disabled={amount <= 0}>
              {editingId ? "Lưu" : "Thêm"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
