import { navigate } from "@/lib/router";
import { AmountDisplay } from "@/ui/common/AmountDisplay";
import { StatFigure } from "@/ui/common/StatFigure";
import { Icon } from "@/ui/kit/icons";
import { Button } from "@/ui/kit/Button";
import { Card } from "@/ui/kit/Card";
import type { Wallet } from "@/domain/types";

export function BalancesCard({
  shownWallets,
  hasLoans,
  walletBals,
  walletNet,
  netWorthAll,
  payable,
  receivable,
  loansNet,
}: {
  shownWallets: Wallet[];
  hasLoans: boolean;
  walletBals: Map<string, number>;
  walletNet: number;
  netWorthAll: number;
  payable: number;
  receivable: number;
  loansNet: number;
}) {
  return (
        <Card>
          <div className="wb-card__body">
            <div className="wb-cluster wb-cluster--between" style={{ marginBottom: hasLoans ? 16 : 14, gap: 10 }}>
              <div className="cashy-networth">
                <span className="cashy-card-eyebrow">Balances</span>
                <div className="cashy-networth__val">
                  <AmountDisplay amount={netWorthAll} negative={netWorthAll < 0} />
                </div>
                <span className="cashy-networth__cap">Net worth · assets − debts</span>
              </div>
              <Button variant="ghost" size="sm" type="button" onClick={() => navigate("wallets")}>
                Manage
              </Button>
            </div>
            {/* Net worth broken into its three parts as stat figures (shared
                StatFigure), clustered left and colour-coded as a legend: assets
                blue, what you owe red, what's owed to you green. */}
            {hasLoans && (
              <div className="cashy-networth__break">
                <StatFigure label="Assets" amount={walletNet} short valueColor="var(--wb-info-text)" />
                <StatFigure label="You owe" amount={payable} short valueColor="var(--wb-danger-text)" />
                {receivable > 0 && (
                  <StatFigure label="Owed to you" amount={receivable} short valueColor="var(--wb-success-text)" />
                )}
              </div>
            )}
            {/* Per-wallet mini-tiles: icon + a stacked name-over-amount body, top
                aligned; the name never truncates and the amount sits right under
                it, so nothing clips or drifts to the far edge. */}
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
              {/* Loans fold in as one reconciling line — wallet tiles + this = net worth. */}
              {hasLoans && (
                <div
                  role="button"
                  tabIndex={0}
                  title="Manage loans"
                  onClick={() => navigate("loans")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate("loans");
                    }
                  }}
                  className="cashy-balloans"
                >
                  <span className="cashy-tile">
                    <Icon name="handshake" size={15} />
                  </span>
                  <span className="cashy-balloans__label">
                    Loans <span style={{ color: "var(--wb-fg-muted)" }}>· net</span>
                  </span>
                  <AmountDisplay amount={loansNet} negative={loansNet < 0} />
                </div>
              )}
            </div>
          </div>
        </Card>
  );
}
