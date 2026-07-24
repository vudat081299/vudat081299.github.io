import { useEffect, useState } from "react";
import { addWallet, deleteWallet, setWalletArchived, updateWallet } from "@/usecases";
import { confirmDelete } from "@/lib/confirm";
import { SWATCHES } from "@/lib/palette";
import { formatDigits, parseMoney } from "@/domain/money";
import { walletIcon } from "@/domain/wallet";
import type { CardNetwork, Wallet, WalletKind } from "@/domain/types";
import { Select } from "@/ui/kit/Select";
import { ColorPicker } from "@/ui/common/ColorPicker";
import { IconPicker } from "@/ui/common/IconPicker";
import { Modal } from "@/ui/kit/Modal";
import { Button } from "@/ui/kit/Button";
import { Input } from "@/ui/kit/Input";

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

export function WalletEditor({
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
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={!name.trim()}>
            {editing ? "Save" : "Add"}
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="wb-field">
          <label className="wb-label" htmlFor="wallet-name">
            Wallet name
          </label>
          <Input
            id="wallet-name"
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
            <Input
              id="wallet-opening"
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
              <Input
                id="wallet-limit"
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
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => {
                setWalletArchived(editing.id, !editing.archived);
                onClose();
              }}
            >
              <span className="wb-ico wb-ico--xs">{editing.archived ? "unarchive" : "archive"}</span>
              {editing.archived ? "Unarchive" : "Archive"}
            </Button>
            <Button variant="ghost" size="sm" className="cashy-btn--quiet-danger" type="button" onClick={remove}>
              <span className="wb-ico wb-ico--xs">delete</span>
              Delete
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
