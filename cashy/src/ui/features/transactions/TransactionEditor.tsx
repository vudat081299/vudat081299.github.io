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
import { PayeeInput } from "@/ui/common/PayeeInput";
import { StatusPicker } from "@/ui/common/StatusPicker";
import { TagChip } from "@/ui/common/TagChip";
import { registerTxEditor } from "@/lib/modals";
import { confirmDelete } from "@/lib/confirm";

/** ⌘ on Apple hardware, Ctrl elsewhere — for both the handler and the hint chip. */
const IS_MAC =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform || "");
const kbdLabel = (key: string) => (IS_MAC ? `⌘${key}` : `Ctrl ${key}`);

export function TransactionEditor() {
  const { categories, tags, transactions } = useCashy();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<TxType>("expense");
  const [amountStr, setAmountStr] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [occurredAt, setOccurredAt] = useState(todayYMD());
  const [occurredTime, setOccurredTime] = useState("");
  const [note, setNote] = useState("");
  const [payee, setPayee] = useState("");
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState<TxStatus>("recorded");

  useEffect(() => {
    registerTxEditor((id) => {
      const tx = id ? (transactions.find((t) => t.id === id) ?? null) : null;
      // Adding: pick up whatever was left half-typed last time. Editing an
      // existing row never touches the draft — that is a different transaction.
      const d = tx ? null : getDraft();
      setEditingId(tx ? tx.id : null);
      setType(tx?.type ?? d?.type ?? "expense");
      setAmountStr(tx && tx.amount ? formatDigits(tx.amount) : (d?.amountStr ?? ""));
      setCategoryId(tx?.categoryId ?? d?.categoryId ?? null);
      setTagIds(tx?.tagIds ?? d?.tagIds ?? []);
      setOccurredAt(tx?.occurredAt ?? d?.occurredAt ?? todayYMD());
      // A NEW transaction opens on the current time — you are almost always
      // recording something as it happens, so the common case should need no
      // input at all. An existing row keeps whatever it was saved with (including
      // deliberately having no time), and a resumed draft keeps what was typed.
      setOccurredTime(tx ? (tx.occurredTime ?? "") : (d?.occurredTime ?? nowHM()));
      setNote(tx?.note ?? d?.note ?? "");
      setPayee(tx?.payee ?? d?.payee ?? "");
      setAccount(tx?.account ?? d?.account ?? "");
      setStatus(tx?.status ?? d?.status ?? "recorded");
      setOpen(true);
    });
    return () => {
      registerTxEditor(null);
    };
  }, [transactions]);

  const amount = parseMoney(amountStr);
  const isDraft = !editingId && getDraft() !== null;

  // Group the digits with dots as they're typed ("1000000" -> "1.000.000"), so a
  // mistyped zero is visible in the field itself — which is why the old spelled-out
  // amount beneath it is now gone. Store the grouped string; `parseMoney` strips the
  // dots back out, and a resumed draft keeps the grouped form as-is.
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

  // The cards / accounts already seen in the ledger, most-used first — the same
  // suggestion treatment the payee field gets, so "Paid with" autocompletes.
  const accountSuggestions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of transactions) {
      const a = t.account?.trim();
      if (a) counts.set(a, (counts.get(a) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([a]) => a);
  }, [transactions]);

  /**
   * Leaving without confirming does NOT create a transaction — it parks what was
   * typed as a draft, and the "add transaction" button then wears the dashed
   * "chưa chốt" outline until it is either confirmed or thrown away.
   */
  function dismiss() {
    if (!editingId) {
      const d: TxDraft = {
        type, amountStr, categoryId, tagIds, occurredAt, occurredTime, note, payee, account, status,
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

  // Switching sides drops a category that doesn't exist on the new side. Functional
  // setState keeps this off `categoryId`, so it depends only on `categories` and the
  // keyboard-shortcut effect below can hold a stable reference to it.
  const changeType = useCallback(
    (t: TxType) => {
      setType(t);
      setCategoryId((cur) =>
        cur && !categories.some((c) => c.id === cur && c.type === t) ? null : cur,
      );
    },
    [categories],
  );

  // ⌘I / ⌘O flip the Chi/Thu toggle without leaving the keyboard — the two fastest
  // things to get wrong when logging quickly. Capture phase + preventDefault so the
  // browser's own ⌘I/⌘O never fires while the editor owns the screen.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      const k = e.key.toLowerCase();
      if (k === "i") {
        e.preventDefault();
        changeType("income");
      } else if (k === "o") {
        e.preventDefault();
        changeType("expense");
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, changeType]);

  function save() {
    if (amount <= 0) return;
    const payload = {
      amount,
      type,
      categoryId,
      tagIds,
      note: note.trim(),
      payee: payee.trim() || undefined,
      account: account.trim() || undefined,
      status,
      occurredAt,
      // Empty means "no particular time" — store nothing rather than "00:00",
      // which would read as midnight and be a claim the user never made.
      occurredTime: occurredTime || undefined,
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
        <button type="button" className="wb-btn" onClick={save} disabled={amount <= 0}>
          {editingId ? "Save" : "Add transaction"}
        </button>
      </div>
    </div>
  );

  return (
    // Wider than the 460 default: this is the app's densest form, and the five
    // status capsules want one uninterrupted row. Modal widths here are sized to
    // their content already (Tags 380, confirm 400, catch-up picker 420) — this
    // is the largest of them, not a new convention.
    //
    // 540 rather than the 520 that just barely fits: the capsule row needs 444px
    // in this font, and the app takes the system UI face first (SF Pro here,
    // Segoe UI on Windows), so a few percent of metric drift is normal. 520 left
    // 19px of slack, which that drift would eat; 540 leaves ~39px.
    <Modal
      open={open}
      onClose={dismiss}
      maxWidth={540}
      title={editingId ? "Edit transaction" : "Add transaction"}
      footer={footer}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Chi / Thu segmented toggle. Each tab carries its own shortcut chip
            (⌘O = chi ra / out, ⌘I = thu vào / in) so the keys are discoverable
            without a legend, and the handler above makes them work. */}
        <div className="wb-tabs wb-tabs--pill" style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          {(["expense", "income"] as TxType[]).map((t) => {
            const active = type === t;
            const tone = t === "income" ? "var(--wb-success-text)" : "var(--wb-danger-text)";
            return (
              <button
                key={t}
                type="button"
                className={active ? "wb-tab is-active" : "wb-tab"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  color: active ? tone : undefined,
                }}
                onClick={() => changeType(t)}
              >
                {t === "expense" ? "Expense" : "Income"}
                <Kbd style={{ opacity: 0.7, textTransform: "uppercase" }}>
                  {kbdLabel(t === "expense" ? "O" : "I")}
                </Kbd>
              </button>
            );
          })}
        </div>

        {/* Amount — the field the eye should land on first: large digits with a ₫
            unit addon, grouped with dots as you type so a mistyped zero shows up
            in the field itself. */}
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

        {/* Category — a real tree picker (icon + colour + indent), not a native
            select faking nesting with leading spaces. */}
        <div className="wb-field">
          <label className="wb-label" htmlFor="tx-cat">
            Category
          </label>
          <CategorySelect
            id="tx-cat"
            categories={categories}
            type={type}
            value={categoryId}
            onChange={setCategoryId}
          />
        </div>

        {/* Counterparty — full width now that the status picker below needs the
            room for five capsules. */}
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

        {/* Paid with — which card / account / wallet the money moved through. Free
            text (with autocomplete from past entries) for now; the seed of a real
            multi-wallet model later. */}
        <div className="wb-field">
          <label className="wb-label" htmlFor="tx-account">
            Paid with <span className="wb-label__opt">(card / account / wallet)</span>
          </label>
          <PayeeInput
            id="tx-account"
            className="wb-input--underline"
            value={account}
            onChange={setAccount}
            suggestions={accountSuggestions}
            placeholder="e.g. Techcombank Visa, MoMo, Cash"
          />
        </div>

        {/* Status — capsules, not a dropdown: five options, and this vocabulary
            is already a capsule everywhere else it is shown. */}
        <div className="wb-field">
          <label className="wb-label">Status</label>
          <StatusPicker value={status} onChange={setStatus} />
        </div>

        {/* Tags — a dashed "＋" capsule LEADS (fixed first slot, so the way to add
            never moves as chips come and go), then the chosen tags follow as
            removable, frequency-inked chips. No text-input frame: you never type
            here, you pick. */}
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
                // Ranked (most-used first) + bounded height with its own scroll,
                // so a long tag list stays a fixed pane instead of stretching the modal.
                <div
                  className="wb-menu"
                  style={{
                    border: 0,
                    boxShadow: "none",
                    padding: 0,
                    background: "none",
                    maxHeight: 240,
                    overflowY: "auto",
                  }}
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
                          <span className="wb-ico wb-ico--xs" style={{ marginLeft: "auto" }}>
                            check
                          </span>
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

        {/* When it happened. Pre-filled with NOW, because a transaction is almost
            always entered as it happens — so the fast path is to touch neither
            control. The quick chips cover nearly all of the rest ("bought it
            yesterday", "correct the clock back to now"); the pickers are there for
            the genuinely arbitrary date. */}
        <div className="wb-field">
          <label className="wb-label">When</label>
          <div className="wb-cluster wb-cluster--nowrap" style={{ gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <DatePicker value={occurredAt} onChange={setOccurredAt} />
            </div>
            {/* Scroll columns rather than a native time box: picking 21:35 by
                spinning two wheels beats typing into a control whose keyboard
                behaviour differs on every platform. */}
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
                <TimePicker
                  value={occurredTime || nowHM()}
                  onChange={setOccurredTime}
                  minuteStep={1}
                />
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
            <button
              type="button"
              className="cashy-tag-add"
              onClick={() => setOccurredAt(todayYMD())}
            >
              Today
            </button>
            <button
              type="button"
              className="cashy-tag-add"
              onClick={() => setOccurredAt(yesterdayYMD())}
            >
              Yesterday
            </button>
            {/* The time stays genuinely optional — a transaction you only know the
                DAY of should not be forced to claim an hour it doesn't have. */}
            {occurredTime && (
              <button
                type="button"
                className="cashy-tag-add"
                onClick={() => setOccurredTime("")}
              >
                Clear time
              </button>
            )}
          </div>
        </div>

        {/* Note */}
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
