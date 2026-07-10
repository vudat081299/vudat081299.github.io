import { useMemo, useState } from "react";
import { Check, Receipt, Search, Tags as TagsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCashy } from "@/lib/store";
import { filterTx, totals } from "@/lib/domain";
import { periodRange, type PeriodKey } from "@/lib/period";
import { relativeDateHead } from "@/lib/date";
import type { Tag, TxType } from "@/types";
import { AmountDisplay } from "@/components/AmountDisplay";
import { EmptyState } from "@/components/EmptyState";
import { PeriodPicker } from "@/components/PeriodPicker";
import { TransactionRow } from "@/components/TransactionRow";
import { openTxEditor } from "@/components/TransactionEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const TYPES: { key: TxType | "all"; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "expense", label: "Chi" },
  { key: "income", label: "Thu" },
];

export function Transactions() {
  const { transactions, categories, tags } = useCashy();
  const [period, setPeriod] = useState<PeriodKey>("this-month");
  const [type, setType] = useState<TxType | "all">("all");
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );
  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  const filtered = useMemo(
    () =>
      filterTx(transactions, {
        range: periodRange(period),
        type,
        search,
        tagIds: activeTags,
        cats: categories,
      }),
    [transactions, categories, period, type, search, activeTags],
  );

  const groups = useMemo(() => {
    const sorted = [...filtered].sort(
      (a, b) =>
        b.occurredAt.localeCompare(a.occurredAt) ||
        b.createdAt.localeCompare(a.createdAt),
    );
    const map = new Map<string, typeof sorted>();
    for (const t of sorted) {
      const arr = map.get(t.occurredAt);
      if (arr) arr.push(t);
      else map.set(t.occurredAt, [t]);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Giao dịch</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {filtered.length} giao dịch trong kỳ
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo ghi chú…"
            className="h-8 pl-8 text-[13px]"
          />
        </div>

        <div className="flex rounded-md bg-muted p-0.5">
          {TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setType(t.key)}
              className={cn(
                "rounded-[4px] px-2.5 py-1 text-[13px] font-medium transition",
                type === t.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tags.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[13px]">
                <TagsIcon size={14} />
                Nhãn{activeTags.length ? ` (${activeTags.length})` : ""}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-52 p-1">
              {tags.map((t) => {
                const on = activeTags.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      setActiveTags(
                        on
                          ? activeTags.filter((x) => x !== t.id)
                          : [...activeTags, t.id],
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
              })}
            </PopoverContent>
          </Popover>
        )}

        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      {groups.length ? (
        <div className="space-y-3">
          {groups.map(([date, txs]) => {
            const net = totals(txs).net;
            return (
              <div key={date} className="overflow-hidden rounded-lg border bg-card">
                <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
                  <span className="text-[13px] font-medium text-muted-foreground">
                    {relativeDateHead(date)}
                  </span>
                  <AmountDisplay
                    amount={Math.abs(net)}
                    type={net >= 0 ? "income" : "expense"}
                    signed
                    className="text-xs"
                  />
                </div>
                <div className="divide-y p-1">
                  {txs.map((tx) => (
                    <TransactionRow
                      key={tx.id}
                      tx={tx}
                      category={
                        tx.categoryId ? (catById.get(tx.categoryId) ?? null) : null
                      }
                      tags={
                        tx.tagIds
                          .map((id) => tagById.get(id))
                          .filter((t): t is Tag => Boolean(t))
                      }
                      onClick={() => openTxEditor(tx.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Receipt size={18} />}
          title="Không có giao dịch"
          description="Thử đổi bộ lọc, hoặc thêm giao dịch mới."
          action={
            <Button size="sm" onClick={() => openTxEditor(null)}>
              Thêm giao dịch
            </Button>
          }
        />
      )}
    </div>
  );
}
