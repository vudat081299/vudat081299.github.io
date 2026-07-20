import { AmountDisplay } from "@/components/AmountDisplay";
import { TagChip } from "@/components/TagChip";
import type { Category, Tag, Transaction } from "@/types";

/** One transaction as a `wb-table` row (the hero pattern). Used by the
 *  Dashboard "recent" table and the Transactions list. */
export function TransactionRow({
  tx,
  category,
  tags,
  onClick,
}: {
  tx: Transaction;
  category?: Category | null;
  tags?: Tag[];
  onClick?: () => void;
}) {
  const day = `${tx.occurredAt.slice(8, 10)}/${tx.occurredAt.slice(5, 7)}`;
  return (
    <tr
      style={onClick ? { cursor: "pointer" } : undefined}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <td className="wb-cell-muted">{day}</td>
      <td>
        <span className="wb-cell-strong">{tx.note || category?.name || "Giao dịch"}</span>
        {tags && tags.length > 0 && (
          <span className="wb-cell-sub">
            <span className="wb-tags">
              {tags.slice(0, 3).map((t) => (
                <TagChip key={t.id} tag={t} />
              ))}
              {tags.length > 3 && <span>+{tags.length - 3}</span>}
            </span>
          </span>
        )}
      </td>
      <td>
        {category ? (
          <span
            className="wb-cap wb-cap--tinted"
            style={{ "--wb-cap-color": category.colorHex } as React.CSSProperties}
          >
            {category.name}
          </span>
        ) : (
          <span className="wb-cap">Chưa phân loại</span>
        )}
      </td>
      <td className="wb-num">
        <AmountDisplay amount={tx.amount} type={tx.type} signed />
      </td>
    </tr>
  );
}
