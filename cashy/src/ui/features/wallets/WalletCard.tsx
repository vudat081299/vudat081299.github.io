import type { CSSProperties } from "react";
import type { CardNetwork, Wallet, WalletKind } from "@/domain/types";
import { cardUtilization } from "@/domain/wallet";
import { formatMoneyShort } from "@/domain/money";
import { Icon } from "@/ui/kit/icons";
import { AmountDisplay } from "@/ui/common/AmountDisplay";

const KIND_LABEL: Record<WalletKind, string> = {
  cash: "Cash",
  bank: "Bank",
  ewallet: "E-wallet",
  card: "Card",
  other: "Other",
};

const NETWORK_LABEL: Record<CardNetwork, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  jcb: "JCB",
  other: "Card",
};

const truncate: CSSProperties = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

/**
 * One wallet as a card: an accent-tinted icon tile, name + kind (or card network),
 * and its current balance. A negative balance (an overdrawn card) renders red. A
 * `card` with a credit limit also gets a **utilisation bar** (debt ÷ limit) and an
 * available-credit line. Presentational — the balance is computed by the caller.
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
  const util = cardUtilization(wallet, balance);
  const sub =
    wallet.kind === "card" && wallet.cardNetwork ? NETWORK_LABEL[wallet.cardNetwork] : KIND_LABEL[wallet.kind];
  const tint = `color-mix(in srgb, ${wallet.colorHex} 15%, transparent)`;
  const barClass =
    util && util.pct >= 0.9
      ? "wb-progress__bar wb-progress__bar--danger"
      : util && util.pct >= 0.5
        ? "wb-progress__bar wb-progress__bar--warning"
        : "wb-progress__bar cashy-progress__bar--quiet";

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
      <div className="wb-card__body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="wb-cluster wb-cluster--nowrap" style={{ gap: 12, alignItems: "center" }}>
          <span
            className="cashy-subtile"
            aria-hidden="true"
            style={{ background: tint, color: wallet.colorHex }}
          >
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
            <span style={{ fontSize: 12, color: "var(--wb-fg-muted)" }}>{sub}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 12, color: "var(--wb-fg-muted)" }}>Balance</span>
          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.1 }}>
            <AmountDisplay amount={balance} negative={balance < 0} />
          </div>
        </div>

        {util && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="wb-progress">
              <div className={barClass} style={{ width: `${Math.round(util.pct * 100)}%` }} />
            </div>
            <span style={{ fontSize: 11, color: "var(--wb-fg-muted)" }}>
              {formatMoneyShort(util.debt)} used · {formatMoneyShort(util.available)} of{" "}
              {formatMoneyShort(util.limit)} available
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
