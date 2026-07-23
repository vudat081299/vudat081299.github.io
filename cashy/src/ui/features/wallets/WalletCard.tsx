import type { CardNetwork, Wallet, WalletKind } from "@/domain/types";
import { cardUtilization } from "@/domain/wallet";
import { formatMoneyShort } from "@/domain/money";
import { AmountDisplay } from "@/ui/common/AmountDisplay";
import { CardIdentity } from "@/ui/common/CardIdentity";

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
      <div className="wb-card__body cashy-cardstack">
        <CardIdentity
          icon={wallet.icon}
          tint={wallet.colorHex}
          title={wallet.name}
          subtitle={sub}
          archived={wallet.archived}
        />

        <div className="cashy-cardfig">
          <span className="cashy-cardfig__label">Balance</span>
          <div className="cashy-cardfig__val">
            <AmountDisplay amount={balance} negative={balance < 0} />
          </div>
        </div>

        {util && (
          <div className="cashy-cardmeter">
            <div className="wb-progress">
              <div className={barClass} style={{ width: `${Math.round(util.pct * 100)}%` }} />
            </div>
            <span className="cashy-cardmeter__note">
              {formatMoneyShort(util.debt)} used · {formatMoneyShort(util.available)} of{" "}
              {formatMoneyShort(util.limit)} available
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
