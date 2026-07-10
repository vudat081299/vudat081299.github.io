import { cn } from "@/lib/utils";
import { Icon } from "@/lib/icons";
import { AmountDisplay } from "@/components/AmountDisplay";
import { TagChip } from "@/components/TagChip";
import type { Category, Tag, Transaction } from "@/types";

export function TransactionRow({
  tx,
  category,
  tags,
  onClick,
  className,
}: {
  tx: Transaction;
  category?: Category | null;
  tags?: Tag[];
  onClick?: () => void;
  className?: string;
}) {
  const color = category?.colorHex ?? "#9b9a97";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 px-2 py-2 text-left transition-colors hover:bg-accent",
        className,
      )}
    >
      <span
        className="grid size-8 shrink-0 place-items-center rounded-md"
        style={{ background: color + "1f", color }}
      >
        <Icon name={category?.icon ?? "circle-dollar-sign"} size={16} />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13.5px] font-medium">
            {tx.note || category?.name || "Giao dịch"}
          </span>
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span className="truncate">{category?.name ?? "Chưa phân loại"}</span>
          {tags && tags.length > 0 && (
            <span className="flex items-center gap-1">
              {tags.slice(0, 3).map((t) => (
                <TagChip key={t.id} tag={t} />
              ))}
              {tags.length > 3 && <span>+{tags.length - 3}</span>}
            </span>
          )}
        </span>
      </span>

      <AmountDisplay
        amount={tx.amount}
        type={tx.type}
        signed
        className="shrink-0 text-[13.5px] font-medium"
      />
    </button>
  );
}
