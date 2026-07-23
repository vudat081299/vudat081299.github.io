import type { CSSProperties } from "react";
import type { Wallet, WalletKind } from "@/domain/types";
import { Icon } from "@/ui/kit/icons";
import { AmountDisplay } from "@/ui/common/AmountDisplay";

const KIND_LABEL: Record<WalletKind, string> = {
  cash: "Cash",
  bank: "Bank",
  ewallet: "E-wallet",
  card: "Card",
  other: "Other",
};

const truncate: CSSProperties = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

/**
 * One wallet as a card: neutral icon tile, name + kind, and its current balance.
 * Presentational — the balance is computed by the caller (`domain/wallet`). A
 * negative balance (an overdrawn card, say) renders red via `AmountDisplay`.
 */
export function WalletCard({
  wallet,
  balance,
  onEdit,
}: {
  wallet: Wallet;
  balance: number;
  onEdit?: (id: string) => void;
}) {
  const clickable = Boolean(onEdit);
  return (
    <div
      className={clickable ? "wb-card wb-card--hover" : "wb-card"}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => onEdit?.(wallet.id) : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onEdit?.(wallet.id);
              }
            }
          : undefined
      }
      style={{ opacity: wallet.archived ? 0.55 : 1 }}
    >
      <div className="wb-card__body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="wb-cluster wb-cluster--nowrap" style={{ gap: 12, alignItems: "center" }}>
          <span className="cashy-subtile" aria-hidden="true">
            <Icon name={wallet.icon} size={18} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ ...truncate, fontWeight: 600 }}>
              {wallet.name}
              {wallet.archived && (
                <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 500, color: "var(--wb-fg-muted)" }}>
                  · archived
                </span>
              )}
            </div>
            <span style={{ fontSize: 12, color: "var(--wb-fg-muted)" }}>{KIND_LABEL[wallet.kind]}</span>
          </div>
        </div>
        <div className="wb-cluster" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 12, color: "var(--wb-fg-muted)" }}>Balance</span>
          <AmountDisplay amount={balance} negative={balance < 0} />
        </div>
      </div>
    </div>
  );
}
