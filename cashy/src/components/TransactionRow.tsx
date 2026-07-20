import { cn } from "@/lib/utils";
import { Icon } from "@/lib/icons";
import { AmountDisplay } from "@/components/AmountDisplay";
import { TagChip } from "@/components/TagChip";
import type { Category, Tag, Transaction } from "@/types";

const ELLIPSIS: React.CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

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
    <div
      className={cn("wb-list__item wb-list__item--link", className)}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          flex: "none",
          display: "grid",
          placeItems: "center",
          borderRadius: "var(--wb-radius-sm)",
          background: `color-mix(in srgb, ${color} 15%, transparent)`,
          color,
        }}
      >
        <Icon name={category?.icon ?? "circle-dollar-sign"} size={16} />
      </span>

      <span
        style={{ minWidth: 0, flex: "1 1 auto", display: "flex", flexDirection: "column", gap: 1 }}
      >
        <span className="wb-list__title" style={ELLIPSIS}>
          {tx.note || category?.name || "Giao dịch"}
        </span>
        <span
          className="wb-list__sub"
          style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}
        >
          <span style={ELLIPSIS}>{category?.name ?? "Chưa phân loại"}</span>
          {tags && tags.length > 0 && (
            <span className="wb-tags">
              {tags.slice(0, 3).map((t) => (
                <TagChip key={t.id} tag={t} />
              ))}
              {tags.length > 3 && <span>+{tags.length - 3}</span>}
            </span>
          )}
        </span>
      </span>

      <span style={{ marginLeft: "auto", flex: "none", fontWeight: 550 }}>
        <AmountDisplay amount={tx.amount} type={tx.type} signed />
      </span>
    </div>
  );
}
