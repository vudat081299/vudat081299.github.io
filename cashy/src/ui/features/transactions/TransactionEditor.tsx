import { useCallback, useEffect, useMemo, useState } from "react";
import { useCashy } from "@/data/store";
import { addTransaction, deleteTransaction, updateTransaction } from "@/usecases";
import { rankTags } from "@/domain";
import { clearDraft, getDraft, saveDraft, type TxDraft } from "@/data/draft";
import { formatDigits, parseMoney } from "@/domain/money";
import { nowHM, todayYMD, yesterdayYMD } from "@/domain/date";
import type { TxStatus, TxType } from "@/domain/types";
import { Modal } from "@/ui/kit/Modal";
import { Popover } from "@/ui/kit/Popover";
import { Field, Input } from "@/ui/kit/Input";
import { Kbd } from "@/ui/kit/Kbd";
import { Textarea } from "@/ui/kit/Textarea";
import { TimePicker } from "@/ui/kit/TimePicker";
import { DatePicker } from "@/ui/common/DatePicker";
import { CategorySelect } from "@/ui/common/CategorySelect";
import { WalletPicker } from "@/ui/common/WalletPicker";
import { PayeeInput } from "@/ui/common/PayeeInput";
import { StatusPicker } from "@/ui/common/StatusPicker";
import { TagChip } from "@/ui/common/TagChip";
import { registerTxEditor } from "@/lib/modals";
import { confirmDelete } from "@/lib/confirm";

/** ⌘ on Apple hardware, Ctrl elsewhere — for both the handler and the hint chip. */
const IS_MAC =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform || "");
const kbdLabel = (key: string) => (IS_MAC ? `⌘${key}` : `Ctrl ${key}`);

/** The editor's three modes. `expense`/`income` map to `Transaction.type`;
 *  `transfer` is a row with a `toWalletId` (income/expense-neutral). */
type Mode = "expense" | "income" | "transfer";

export function TransactionEditor() {
  const { categories, tags, transactions, wallets } = useCashy();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("expense");
  const [amountStr, setAmountStr] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [toWalletId, setToWalletId] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [occurredAt, setOccurredAt] = useState(todayYMD());
  const [occurredTime, setOccurredTime] = useState("");
  const [note, setNote] = useState("");
  const [payee, setPayee] = useState("");
  const [status, setStatus] = useState<TxStatus>("recorded");

  const isTransfer = mode === "transfer";
  const type: TxType = mode === "income" ? "income" : "expense";

  useEffect(() => {
    registerTxEditor((id) => {
      const tx = id ? (transactions.find((t) => t.id === id) ?? null) : null;
      // Adding: pick up whatever was left half-typed last time. Editing an
      // existing row never touches the draft — that is a different transaction.
      const d = tx ? null : getDraft();
      const src = tx ?? d;
      setEditingId(tx ? tx.id : null);
      setMode(src?.toWalletId ? "transfer" : (src?.type ?? "expense"));
      setAmountStr(tx && tx.amount ? formatDigits(tx.amount) : (d?.amountStr ?? ""));
      setCategoryId(tx?.categoryId ?? d?.categoryId ?? null);
      setWalletId(tx?.walletId ?? d?.walletId ?? null);
      setToWalletId(tx?.toWalletId ?? d?.toWalletId ?? null);
      setTagIds(tx?.tagIds ?? d?.tagIds ?? []);
      setOccurredAt(tx?.occurredAt ?? d?.occurredAt ?? todayYMD());
      // A NEW transaction opens on the current time — you are almost always
      // recording something as it happens, so the common case should need no
      // input at all. An existing row keeps whatever it was saved with (including
      // deliberately having no time), and a resumed draft keeps what was typed.
      setOccurredTime(tx ? (tx.occurredTime ?? "") : (d?.occurredTime ?? nowHM()));
      setNote(tx?.note ?? d?.note ?? "");
      setPayee(tx?.payee ?? d?.payee ?? "");
      setStatus(tx?.status ?? d?.status ?? "recorded");
      setOpen(true);
    });
    return () => {
      registerTxEditor(null);
    };
  }, [transactions]);

  const amount = parseMoney(amountStr);
  const isDraft = !editingId && getDraft() !== null;
  // A transfer needs two distinct wallets; everything else just needs an amount.
  const valid =
    amount > 0 && (!isTransfer || (!!walletId && !!toWalletId && walletId !== toWalletId));

  // Group the digits with dots as they're typed ("1000000" -> "1.000.000"), so a
  // mistyped zero is visible in the field itself.
  function changeAmount(raw: string) {
    const digits = raw.replace(/\D/g, "");
    setAmountStr(digits ? formatDigits(parseInt(digits, 10)) : "");
  }

  // Distinct counterparties already in the ledger, most-used first — the ranking
  // the suggestion list wants. Recomputed only when the ledger changes.
  const payeeSuggestions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of transactions) {
      const p = t.payee?.trim();
      if (p) counts.set(p, (counts.get(p) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([p]) => p);
  }, [transactions]);

  /**
   * Leaving without confirming does NOT create a transaction — it parks what was
   * typed as a draft, and the "add transaction" button then wears the dashed
   * "chưa chốt" outline until it is either confirmed or thrown away.
   */
  function dismiss() {
    if (!editingId) {
      const d: TxDraft = {
        type, amountStr, categoryId, walletId, toWalletId, tagIds, occurredAt, occurredTime, note, payee, status,
      };
      saveDraft(d);
    }
    setOpen(false);
  }

  function discard() {
    clearDraft();
    setOpen(false);
  }
  // Tags ordered by how much the ledger uses them (most-used first), each with a
  // shade that inks the chip — the same rank ramp the transaction table uses.
  const rankedTags = useMemo(() => rankTags(tags, transactions), [tags, transactions]);
  const tagShade = useMemo(
    () => new Map(rankedTags.map((r) => [r.tag.id, r.shade])),
    [rankedTags],
  );

  // Switching to income/expense drops a category that doesn't exist on the new
  // side; switching to transfer drops the category entirely (a transfer has none).
  const changeMode = useCallback(
    (m: Mode) => {
      setMode(m);
      if (m === "transfer") setCategoryId(null);
      else
        setCategoryId((cur) =>
          cur && !categories.some((c) => c.id === cur && c.type === m) ? null : cur,
        );
    },
    [categories],
  );

  // ⌘O / ⌘I / ⌘T flip the mode without leaving the keyboard. Capture phase +
  // preventDefault so the browser's own ⌘I/⌘O never fires while the editor is up.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      const k = e.key.toLowerCase();
      if (k === "o") {
        e.preventDefault();
        changeMode("expense");
      } else if (k === "i") {
        e.preventDefault();
        changeMode("income");
      } else if (k === "t") {
        e.preventDefault();
        changeMode("transfer");
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, changeMode]);

  function save() {
    if (!valid) return;
    const base = {
      amount,
      tagIds,
      note: note.trim(),
      status,
      occurredAt,
      // Empty means "no particular time" — store nothing rather than "00:00".
      occurredTime: occurredTime || undefined,
    };
    const payload = isTransfer
      ? {
          ...base,
          type: "expense" as TxType, // convention — never summed; `isTransfer` gates it
          categoryId: null,
          walletId,
          toWalletId: toWalletId ?? undefined,
          payee: undefined,
        }
      : {
          ...base,
          type,
          categoryId,
          walletId,
          toWalletId: undefined,
          payee: payee.trim() || undefined,
        };
    if (editingId) updateTransaction(editingId, payload);
    else {
      addTransaction(payload);
      clearDraft(); // the draft became a real transaction
    }
    setOpen(false);
  }

  const footer = (
    <div
      style={{
        display: "flex",
        width: "100%",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      {/* Deleting lives HERE, not on the table row: you open the transaction,
          look at it, and only then may you destroy it. */}
      {editingId ? (
        <button
          type="button"
          className="wb-btn wb-btn--ghost"
          style={{ color: "var(--wb-danger-text)", gap: 6 }}
          onClick={async () => {
            if (!(await confirmDelete({ title: "Delete this transaction?" })))
              return;
            deleteTransaction(editingId);
            setOpen(false);
          }}
        >
          <span className="wb-ico wb-ico--sm">delete</span>
          Delete
        </button>
      ) : isDraft ? (
        <button type="button" className="wb-btn wb-btn--ghost" style={{ gap: 6 }} onClick={discard}>
          <span className="wb-ico wb-ico--sm">backspace</span>
          Discard draft
        </button>
      ) : (
        <span />
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="wb-btn wb-btn--secondary" onClick={dismiss}>
          {editingId ? "Cancel" : "Later"}
        </button>
        <button type="button" className="wb-btn" onClick={save} disabled={!valid}>
          {editingId ? "Save" : isTransfer ? "Add transfer" : "Add transaction"}
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={dismiss}
      maxWidth={540}
      title={editingId ? "Edit transaction" : "Add transaction"}
      footer={footer}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Expense / Income / Transfer segmented toggle. Each carries its own
            shortcut chip (⌘O out, ⌘I in, ⌘T transfer) so the keys are
            discoverable, and the handler above makes them work. */}
        <div className="wb-tabs wb-tabs--pill" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
          {(["expense", "income", "transfer"] as Mode[]).map((m) => {
            const active = mode === m;
            const tone =
              m === "income"
                ? "var(--wb-success-text)"
                : m === "expense"
                  ? "var(--wb-danger-text)"
                  : undefined;
            const label = m === "expense" ? "Expense" : m === "income" ? "Income" : "Transfer";
            const key = m === "expense" ? "O" : m === "income" ? "I" : "T";
            return (
              <button
                key={m}
                type="button"
                className={active ? "wb-tab is-active" : "wb-tab"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  color: active ? tone : undefined,
                }}
                onClick={() => changeMode(m)}
              >
                {label}
                <Kbd style={{ opacity: 0.7, textTransform: "uppercase" }}>{kbdLabel(key)}</Kbd>
              </button>
            );
          })}
        </div>

        {/* Amount — the field the eye should land on first. */}
        <Field label="Amount" htmlFor="tx-amount">
          <Input
            id="tx-amount"
            className="wb-input-group--underline"
            inputMode="numeric"
            autoComplete="off"
            value={amountStr}
            onChange={(e) => changeAmount(e.target.value)}
            placeholder="0"
            trailingAddon="₫"
            style={{ fontSize: 18 }}
          />
        </Field>

        {isTransfer ? (
          /* Transfer — money moving between two of your own wallets. Neither in
             nor out: it changes two balances and no total. */
          <div className="wb-cluster wb-cluster--nowrap" style={{ gap: 12, alignItems: "flex-end" }}>
            <div className="wb-field" style={{ flex: 1, minWidth: 0 }}>
              <label className="wb-label" htmlFor="tx-from">From</label>
              <WalletPicker
                id="tx-from"
                wallets={wallets}
                value={walletId}
                onChange={setWalletId}
                allowNone={false}
                placeholder="Choose wallet"
                excludeId={toWalletId ?? undefined}
              />
            </div>
            <span className="wb-ico" style={{ color: "var(--wb-fg-muted)", paddingBottom: 8, flex: "none" }}>
              arrow_forward
            </span>
            <div className="wb-field" style={{ flex: 1, minWidth: 0 }}>
              <label className="wb-label" htmlFor="tx-to">To</label>
              <WalletPicker
                id="tx-to"
                wallets={wallets}
                value={toWalletId}
                onChange={setToWalletId}
                allowNone={false}
                placeholder="Choose wallet"
                excludeId={walletId ?? undefined}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Category — a real tree picker (icon + colour + indent). */}
            <div className="wb-field">
              <label className="wb-label" htmlFor="tx-cat">Category</label>
              <CategorySelect
                id="tx-cat"
                categories={categories}
                type={type}
                value={categoryId}
                onChange={setCategoryId}
              />
            </div>

            {/* Counterparty. */}
            <div className="wb-field">
              <label className="wb-label" htmlFor="tx-payee">
                Payee <span className="wb-label__opt">(person / company)</span>
              </label>
              <PayeeInput
                id="tx-payee"
                className="wb-input--underline"
                value={payee}
                onChange={setPayee}
                suggestions={payeeSuggestions}
                placeholder="e.g. Highlands, ABC Company"
              />
            </div>

            {/* Wallet — which wallet the money moved through. Replaces the old
                free-text "Paid with"; label adapts to the flow direction. */}
            <div className="wb-field">
              <label className="wb-label" htmlFor="tx-wallet">
                {type === "income" ? "Received into" : "Paid from"}{" "}
                <span className="wb-label__opt">(wallet)</span>
              </label>
              <WalletPicker
                id="tx-wallet"
                wallets={wallets}
                value={walletId}
                onChange={setWalletId}
                placeholder="No wallet"
              />
            </div>
          </>
        )}

        {/* Status — capsules, not a dropdown. */}
        <div className="wb-field">
          <label className="wb-label">Status</label>
          <StatusPicker value={status} onChange={setStatus} />
        </div>

        {/* Tags — a dashed "＋" capsule LEADS, then the chosen tags follow. */}
        <div className="wb-field">
          <label className="wb-label">Tags</label>
          <div className="wb-cluster" style={{ flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <Popover
              inline
              panelWidth={240}
              trigger={({ toggle }) => (
                <button type="button" className="cashy-tag-add" onClick={toggle}>
                  <span className="wb-ico wb-ico--xs">add</span>
                  Add tag
                </button>
              )}
            >
              {tags.length === 0 ? (
                <div style={{ padding: "8px 10px", textAlign: "center", fontSize: 12, color: "var(--wb-fg-muted)" }}>
                  No tags yet. Create them on the Tags screen.
                </div>
              ) : (
                <div
                  className="wb-menu"
                  style={{ border: 0, boxShadow: "none", padding: 0, background: "none", maxHeight: 240, overflowY: "auto" }}
                >
                  {rankedTags.map(({ tag, shade }) => {
                    const on = tagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        className="wb-menu__item"
                        style={{ gap: 8 }}
                        onClick={() =>
                          setTagIds(on ? tagIds.filter((x) => x !== tag.id) : [...tagIds, tag.id])
                        }
                      >
                        <TagChip tag={tag} shade={shade} />
                        {on && (
                          <span className="wb-ico wb-ico--xs" style={{ marginLeft: "auto" }}>check</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </Popover>
            {tagIds.map((id) => {
              const t = tags.find((x) => x.id === id);
              return t ? (
                <TagChip
                  key={id}
                  tag={t}
                  shade={tagShade.get(id)}
                  onRemove={() => setTagIds(tagIds.filter((x) => x !== id))}
                />
              ) : null;
            })}
          </div>
        </div>

        {/* When it happened. Pre-filled with NOW. */}
        <div className="wb-field">
          <label className="wb-label">When</label>
          <div className="wb-cluster wb-cluster--nowrap" style={{ gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <DatePicker value={occurredAt} onChange={setOccurredAt} />
            </div>
            <Popover
              panelWidth={220}
              align="right"
              trigger={({ open, toggle }) => (
                <button
                  type="button"
                  className="wb-input"
                  onClick={toggle}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: 128,
                    flex: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    borderColor: open ? "var(--wb-fg)" : undefined,
                  }}
                >
                  <span className="wb-ico wb-ico--sm">schedule</span>
                  <span className="wb-num">{occurredTime || "--:--"}</span>
                </button>
              )}
            >
              <div style={{ padding: 4 }}>
                <TimePicker value={occurredTime || nowHM()} onChange={setOccurredTime} minuteStep={1} />
              </div>
            </Popover>
          </div>
          <div className="wb-cluster" style={{ gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="cashy-tag-add"
              onClick={() => {
                setOccurredAt(todayYMD());
                setOccurredTime(nowHM());
              }}
            >
              Now
            </button>
            <button type="button" className="cashy-tag-add" onClick={() => setOccurredAt(todayYMD())}>
              Today
            </button>
            <button type="button" className="cashy-tag-add" onClick={() => setOccurredAt(yesterdayYMD())}>
              Yesterday
            </button>
            {occurredTime && (
              <button type="button" className="cashy-tag-add" onClick={() => setOccurredTime("")}>
                Clear time
              </button>
            )}
          </div>
        </div>

        {/* Note — the migrated wb Textarea (themed resize handle). */}
        <Field label="Note" htmlFor="tx-note">
          <Textarea
            id="tx-note"
            className="wb-textarea--underline"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional"
            rows={2}
          />
        </Field>
      </div>
    </Modal>
  );
}
