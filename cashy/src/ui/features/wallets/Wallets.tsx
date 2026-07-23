import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useCashy } from "@/data/store";
import { addWallet, deleteWallet, setWalletArchived, updateWallet } from "@/usecases";
import { confirmDelete } from "@/lib/confirm";
import { SWATCHES } from "@/lib/palette";
import { formatDigits, parseMoney } from "@/domain/money";
import { netWorth, walletBalances, walletIcon } from "@/domain/wallet";
import type { CardNetwork, Wallet, WalletKind } from "@/domain/types";
import { PageHeader } from "@/ui/common/PageHeader";
import { Select } from "@/ui/common/Select";
import { ColorPicker } from "@/ui/common/ColorPicker";
import { IconPicker } from "@/ui/common/IconPicker";
import { AmountDisplay } from "@/ui/common/AmountDisplay";
import { Modal } from "@/ui/kit/Modal";
import { WalletCard } from "@/ui/features/wallets/WalletCard";

const KINDS: { value: WalletKind; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank account" },
  { value: "ewallet", label: "E-wallet" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

const NETWORKS: { value: CardNetwork; label: string }[] = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "amex", label: "Amex" },
  { value: "jcb", label: "JCB" },
  { value: "other", label: "Other" },
];

// The screen groups wallets so the page reads as sections, not one flat grid.
const GROUPS: { title: string; kinds: WalletKind[] }[] = [
  { title: "Cash & accounts", kinds: ["cash", "bank", "ewallet"] },
  { title: "Cards", kinds: ["card"] },
  { title: "Other", kinds: ["other"] },
];

/** "-1.000.000" ⇄ number, keeping a leading minus (a card can open in debt). */
function fmtOpening(n: number): string {
  return (n < 0 ? "-" : "") + formatDigits(Math.abs(n));
}
function parseOpening(s: string): number {
  const neg = s.trim().startsWith("-");
  const digits = s.replace(/[^\d]/g, "");
  const v = digits ? parseInt(digits, 10) : 0;
  return neg ? -v : v;
}

function WalletEditor({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: Wallet | null;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<WalletKind>("bank");
  const [openingStr, setOpeningStr] = useState("0");
  const [cardNetwork, setCardNetwork] = useState<CardNetwork>("visa");
  const [limitStr, setLimitStr] = useState("0");
  const [color, setColor] = useState<string>(SWATCHES[0]);
  const [icon, setIcon] = useState<string>(walletIcon("bank"));

  const isCard = kind === "card";

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setKind(editing?.kind ?? "bank");
    setOpeningStr(editing ? fmtOpening(editing.openingBalance) : "0");
    setCardNetwork(editing?.cardNetwork ?? "visa");
    setLimitStr(editing?.creditLimit ? formatDigits(editing.creditLimit) : "0");
    setColor(editing?.colorHex ?? SWATCHES[0]);
    setIcon(editing?.icon ?? walletIcon("bank"));
  }, [open, editing]);

  function save() {
    const n = name.trim();
    if (!n) return;
    const openingBalance = parseOpening(openingStr);
    const limit = parseMoney(limitStr);
    const patch = {
      name: n,
      kind,
      openingBalance,
      colorHex: color,
      icon,
      cardNetwork: isCard ? cardNetwork : undefined,
      creditLimit: isCard && limit > 0 ? limit : undefined,
    };
    if (editing) updateWallet(editing.id, patch);
    else addWallet(patch);
    onClose();
  }

  async function remove() {
    if (!editing) return;
    const ok = await confirmDelete({
      title: `Delete wallet "${editing.name}"?`,
      message: "Its transactions are kept — they just lose the wallet. Archive instead to keep the link.",
    });
    if (ok) {
      deleteWallet(editing.id);
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit wallet" : "Add wallet"}
      maxWidth={440}
      footer={
        <>
          <button type="button" className="wb-btn wb-btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="wb-btn" onClick={save} disabled={!name.trim()}>
            {editing ? "Save" : "Add"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="wb-field">
          <label className="wb-label" htmlFor="wallet-name">
            Wallet name
          </label>
          <input
            id="wallet-name"
            className="wb-input"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="e.g. Techcombank, MoMo, Cash"
          />
        </div>

        <div className="wb-cluster" style={{ gap: 12, alignItems: "flex-end" }}>
          <div className="wb-field" style={{ flex: 1, minWidth: 0 }}>
            <label className="wb-label" htmlFor="wallet-kind">
              Kind
            </label>
            <Select
              id="wallet-kind"
              value={kind}
              onChange={(e) => {
                const k = e.target.value as WalletKind;
                setKind(k);
                setIcon(walletIcon(k));
              }}
            >
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="wb-field" style={{ flex: 1, minWidth: 0 }}>
            <label className="wb-label" htmlFor="wallet-opening">
              {isCard ? "Current balance" : "Opening balance"}{" "}
              <span className="wb-label__opt">(₫ · − = {isCard ? "debt owed" : "you owe"})</span>
            </label>
            <input
              id="wallet-opening"
              className="wb-input"
              inputMode="numeric"
              value={openingStr}
              onChange={(e) => setOpeningStr(e.target.value)}
              onBlur={() => setOpeningStr(fmtOpening(parseOpening(openingStr)))}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
          </div>
        </div>

        {/* Card-only: the network printed on it + its credit limit (hạn mức). */}
        {isCard && (
          <div className="wb-cluster" style={{ gap: 12, alignItems: "flex-end" }}>
            <div className="wb-field" style={{ flex: 1, minWidth: 0 }}>
              <label className="wb-label" htmlFor="wallet-network">
                Card type
              </label>
              <Select
                id="wallet-network"
                value={cardNetwork}
                onChange={(e) => setCardNetwork(e.target.value as CardNetwork)}
              >
                {NETWORKS.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="wb-field" style={{ flex: 1, minWidth: 0 }}>
              <label className="wb-label" htmlFor="wallet-limit">
                Credit limit <span className="wb-label__opt">(₫ · optional)</span>
              </label>
              <input
                id="wallet-limit"
                className="wb-input"
                inputMode="numeric"
                value={limitStr}
                onChange={(e) => setLimitStr(e.target.value)}
                onBlur={() => setLimitStr(formatDigits(parseMoney(limitStr)))}
                onKeyDown={(e) => e.key === "Enter" && save()}
              />
            </div>
          </div>
        )}

        <div className="wb-field">
          <label className="wb-label">Color</label>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        <div className="wb-field">
          <label className="wb-label">Icon</label>
          <IconPicker value={icon} onChange={setIcon} />
        </div>

        {editing && (
          <div className="wb-cluster" style={{ gap: 8, justifyContent: "flex-start" }}>
            <button
              type="button"
              className="wb-btn wb-btn--ghost wb-btn--sm"
              onClick={() => {
                setWalletArchived(editing.id, !editing.archived);
                onClose();
              }}
            >
              <span className="wb-ico wb-ico--xs">{editing.archived ? "unarchive" : "archive"}</span>
              {editing.archived ? "Unarchive" : "Archive"}
            </button>
            <button type="button" className="wb-btn wb-btn--ghost wb-btn--sm cashy-btn--quiet-danger" onClick={remove}>
              <span className="wb-ico wb-ico--xs">delete</span>
              Delete
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

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
          <button type="button" className="wb-btn wb-btn--round" onClick={openAdd}>
            <span className="wb-ico wb-ico--xs">add</span>
            Add wallet
          </button>
        }
      />

      <div className="wb-card">
        <div className="wb-card__body" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: "var(--wb-fg-muted)" }}>Net worth</span>
          <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>
            <AmountDisplay amount={nw} negative={nw < 0} />
          </div>
          <span style={{ fontSize: 12, color: "var(--wb-fg-muted)" }}>
            across {active.length} active {active.length === 1 ? "wallet" : "wallets"}
          </span>
        </div>
      </div>

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
