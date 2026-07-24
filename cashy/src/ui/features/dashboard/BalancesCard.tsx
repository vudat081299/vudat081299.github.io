import { navigate } from "@/lib/router";
import { AmountDisplay } from "@/ui/common/AmountDisplay";
import { Icon } from "@/ui/kit/icons";
import { Button } from "@/ui/kit/Button";
import { Card } from "@/ui/kit/Card";
import type { Wallet } from "@/domain/types";

/**
 * The Dashboard "Net worth" card. The headline number is spelled out as the
 * three labelled parts that add up to it, so the reader can trace where it comes
 * from instead of guessing:
 *
 *   In your wallets   (walletNet, with each wallet listed as detail beneath)
 * + Owed to you       (receivable — money others owe you)
 * − You owe           (payable — your debts)
 * = Net worth         (netWorthAll)
 *
 * Every component line is label-left / amount-right, so the three amounts stack
 * into one column you can read down and see them sum to the headline. When there
 * are no loans, net worth IS the wallet total, so the component lines collapse and
 * only the wallet list shows.
 */
export function BalancesCard({
  shownWallets,
  hasLoans,
  walletBals,
  walletNet,
  netWorthAll,
  payable,
  receivable,
}: {
  shownWallets: Wallet[];
  hasLoans: boolean;
  walletBals: Map<string, number>;
  walletNet: number;
  netWorthAll: number;
  payable: number;
  receivable: number;
}) {
  const goLoans = () => navigate("loans");
  return (
    <Card>
      <div className="wb-card__body">
        <div className="wb-cluster wb-cluster--between" style={{ gap: 10 }}>
          <div className="cashy-networth">
            <span className="cashy-card-eyebrow">Net worth</span>
            <div className="cashy-networth__val">
              <AmountDisplay amount={netWorthAll} negative={netWorthAll < 0} />
            </div>
            <span className="cashy-networth__cap">
              {hasLoans
                ? "What's in your wallets, plus what's owed to you, minus what you owe"
                : "Total across all your wallets"}
            </span>
          </div>
          <Button variant="ghost" size="sm" type="button" onClick={() => navigate("wallets")}>
            Manage
          </Button>
        </div>

        <div className="cashy-nwbreak">
          {/* Component 1 — the wallet total, with each wallet listed as detail
              beneath. Only labelled as a component when loans also contribute;
              otherwise it equals net worth and the header would just repeat it. */}
          {hasLoans && (
            <div className="cashy-nwline cashy-nwline--head">
              <span className="cashy-nwline__label">In your wallets</span>
              <AmountDisplay amount={walletNet} negative={walletNet < 0} className="cashy-nwline__amt" />
            </div>
          )}

          {/* Per-wallet rows: an icon beside a left-aligned two-line stack — the
              wallet name over its balance as a secondary label. Long names
              ellipsize rather than wrap. */}
          <div className="cashy-balgrid">
            {shownWallets.map((w) => {
              const bal = walletBals.get(w.id) ?? w.openingBalance;
              return (
                <div key={w.id} className="cashy-balrow">
                  <span className="cashy-tile">
                    <Icon name={w.icon} size={15} />
                  </span>
                  <div className="cashy-balrow__body">
                    <span className="cashy-balrow__name">{w.name}</span>
                    <AmountDisplay amount={bal} negative={bal < 0} className="cashy-balrow__amt" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Components 2 & 3 — the loan side of net worth: money owed to you adds
              (+, green), money you owe subtracts (−, red). The group is clickable
              through to the Loans screen. */}
          {hasLoans && (
            <div
              className="cashy-nwloans"
              role="button"
              tabIndex={0}
              title="Manage loans"
              onClick={goLoans}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  goLoans();
                }
              }}
            >
              {receivable > 0 && (
                <div className="cashy-nwline">
                  <span className="cashy-nwline__label">
                    Owed to you
                    <span className="cashy-nwline__hint">people who owe you</span>
                  </span>
                  <span className="cashy-nwline__amt">
                    <span className="cashy-nwsign cashy-nwsign--pos">+</span>
                    <AmountDisplay amount={receivable} positive />
                  </span>
                </div>
              )}
              {payable > 0 && (
                <div className="cashy-nwline">
                  <span className="cashy-nwline__label">
                    You owe
                    <span className="cashy-nwline__hint">your debts</span>
                  </span>
                  <span className="cashy-nwline__amt">
                    <span className="cashy-nwsign cashy-nwsign--neg">−</span>
                    <AmountDisplay amount={payable} negative />
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
