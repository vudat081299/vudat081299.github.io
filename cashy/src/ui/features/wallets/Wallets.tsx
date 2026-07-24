import { useMemo, useState, type CSSProperties } from "react";
import { useCashy } from "@/data/store";
import { netWorth, walletBalances } from "@/domain/wallet";
import type { Wallet, WalletKind } from "@/domain/types";
import { PageHeader } from "@/ui/common/PageHeader";
import { AmountDisplay } from "@/ui/common/AmountDisplay";
import { Button } from "@/ui/kit/Button";
import { Card } from "@/ui/kit/Card";
import { WalletCard } from "@/ui/features/wallets/WalletCard";
import { WalletEditor } from "./WalletEditor";

// The screen groups wallets so the page reads as sections, not one flat grid.
const GROUPS: { title: string; kinds: WalletKind[] }[] = [
  { title: "Cash & accounts", kinds: ["cash", "bank", "ewallet"] },
  { title: "Cards", kinds: ["card"] },
  { title: "Other", kinds: ["other"] },
];

function WalletGroup({
  title,
  wallets,
  balances,
  onEdit,
}: {
  title: string;
  wallets: Wallet[];
  balances: Map<string, number>;
  onEdit: (id: string) => void;
}) {
  if (wallets.length === 0) return null;
  return (
    <div className="wb-stack" style={{ "--wb-stack-gap": "10px" } as CSSProperties}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--wb-fg-muted)" }}>
        {title} <span style={{ fontWeight: 400 }}>· {wallets.length}</span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 12,
        }}
      >
        {wallets.map((w) => (
          <WalletCard key={w.id} wallet={w} balance={balances.get(w.id) ?? w.openingBalance} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}

export function Wallets() {
  const { wallets, transactions } = useCashy();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Wallet | null>(null);

  const balances = useMemo(() => walletBalances(wallets, transactions), [wallets, transactions]);
  const nw = useMemo(() => netWorth(wallets, transactions), [wallets, transactions]);

  const active = useMemo(
    () => wallets.filter((w) => !w.archived).sort((a, b) => a.order - b.order),
    [wallets],
  );
  const archived = useMemo(
    () => wallets.filter((w) => w.archived).sort((a, b) => a.order - b.order),
    [wallets],
  );

  function openAdd() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(id: string) {
    setEditing(wallets.find((w) => w.id === id) ?? null);
    setOpen(true);
  }

  return (
    <div className="wb-stack wb-stack--loose">
      <PageHeader
        title="Wallets"
        subtitle={`${wallets.length} ${wallets.length === 1 ? "wallet" : "wallets"} · where your money sits`}
        actions={
          <Button round type="button" onClick={openAdd}>
            <span className="wb-ico wb-ico--xs">add</span>
            Add wallet
          </Button>
        }
      />

      <Card>
        <div className="wb-card__body" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: "var(--wb-fg-muted)" }}>Net worth</span>
          <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>
            <AmountDisplay amount={nw} negative={nw < 0} />
          </div>
          <span style={{ fontSize: 12, color: "var(--wb-fg-muted)" }}>
            across {active.length} active {active.length === 1 ? "wallet" : "wallets"}
          </span>
        </div>
      </Card>

      {wallets.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--wb-fg-muted)", margin: "2px 0 0" }}>
          No wallets yet — add one for your cash, a bank account, or a card.
        </p>
      ) : (
        <>
          {GROUPS.map((g) => (
            <WalletGroup
              key={g.title}
              title={g.title}
              wallets={active.filter((w) => g.kinds.includes(w.kind))}
              balances={balances}
              onEdit={openEdit}
            />
          ))}
          <WalletGroup title="Archived" wallets={archived} balances={balances} onEdit={openEdit} />
        </>
      )}

      <WalletEditor open={open} editing={editing} onClose={() => setOpen(false)} />
    </div>
  );
}
