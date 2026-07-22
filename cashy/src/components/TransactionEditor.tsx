import { useEffect, useMemo, useState } from "react";
import {
  addTransaction,
  deleteTransaction,
  updateTransaction,
  useCashy,
} from "@/lib/store";
import { flattenTree, rankTags } from "@/lib/domain";
import { clearDraft, getDraft, saveDraft, type TxDraft } from "@/lib/draft";
import { formatMoney, parseMoney } from "@/lib/money";
import { todayYMD } from "@/lib/date";
import { TX_STATUS_META, TX_STATUS_ORDER } from "@/lib/txStatus";
import type { TxStatus, TxType } from "@/types";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/wb/Modal";
import { Popover } from "@/components/wb/Popover";
import { Field, Input } from "@/components/wb/Input";
import { Textarea } from "@/components/wb/Textarea";
import { DatePicker } from "@/components/DatePicker";
import { Select } from "@/components/Select";
import { TagChip } from "@/components/TagChip";
import { registerTxEditor } from "@/lib/modals";
import { confirm } from "@/lib/confirm";

/**
 * Status as a colour capsule that opens the full ladder — recorded (green),
 * awaiting-you (amber), in-flight (blue), skipped (grey), failed (red) — so the
 * choice is read by COLOUR, not by parsing a dropdown's words. Each option is the
 * exact capsule it will become, so picking is recognition, not recall.
 */
function StatusPicker({ value, onChange }: { value: TxStatus; onChange: (s: TxStatus) => void }) {
  const meta = TX_STATUS_META[value];
  return (
    <Popover
      inline
      panelWidth={220}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          className={cn("cashy-statuspick", open && "is-open")}
          onClick={toggle}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={cn("wb-cap", meta.cap)}>
            {meta.dot && <span className="wb-cap__dot" />}
            {meta.label}
          </span>
          <span className="wb-ico wb-ico--xs" style={{ marginLeft: "auto", color: "var(--wb-fg-muted)" }}>
            expand_more
          </span>
        </button>
      )}
    >
      {({ close }) => (
        <div
          className="wb-menu"
          role="listbox"
          style={{ border: 0, boxShadow: "none", padding: 4, background: "none" }}
        >
          {TX_STATUS_ORDER.map((s) => {
            const m = TX_STATUS_META[s];
            const on = s === value;
            return (
              <button
                key={s}
                type="button"
                role="option"
                aria-selected={on}
                className="wb-menu__item cashy-statuspick__opt"
                style={{ gap: 8 }}
                onClick={() => {
                  onChange(s);
                  close();
                }}
              >
                <span className={cn("wb-cap", m.cap)}>
                  {m.dot && <span className="wb-cap__dot" />}
                  {m.label}
                </span>
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
  );
}

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
  const [status, setStatus] = useState<TxStatus>("recorded");

  useEffect(() => {
    registerTxEditor((id) => {
      const tx = id ? (transactions.find((t) => t.id === id) ?? null) : null;
      // Adding: pick up whatever was left half-typed last time. Editing an
      // existing row never touches the draft — that is a different transaction.
      const d = tx ? null : getDraft();
      setEditingId(tx ? tx.id : null);
      setType(tx?.type ?? d?.type ?? "expense");
      setAmountStr(tx && tx.amount ? String(tx.amount) : (d?.amountStr ?? ""));
      setCategoryId(tx?.categoryId ?? d?.categoryId ?? null);
      setTagIds(tx?.tagIds ?? d?.tagIds ?? []);
      setOccurredAt(tx?.occurredAt ?? d?.occurredAt ?? todayYMD());
      setOccurredTime(tx?.occurredTime ?? d?.occurredTime ?? "");
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

  /**
   * Leaving without confirming does NOT create a transaction — it parks what was
   * typed as a draft, and the "add transaction" button then wears the dashed
   * "chưa chốt" outline until it is either confirmed or thrown away.
   */
  function dismiss() {
    if (!editingId) {
      const d: TxDraft = {
        type, amountStr, categoryId, tagIds, occurredAt, occurredTime, note, payee, status,
      };
      saveDraft(d);
    }
    setOpen(false);
  }

  function discard() {
    clearDraft();
    setOpen(false);
  }
  const catOptions = useMemo(() => flattenTree(categories, type), [categories, type]);
  // Tags ordered by how much the ledger uses them (most-used first), each with a
  // shade that inks the chip — the same rank ramp the transaction table uses.
  const rankedTags = useMemo(() => rankTags(tags, transactions), [tags, transactions]);
  const tagShade = useMemo(
    () => new Map(rankedTags.map((r) => [r.tag.id, r.shade])),
    [rankedTags],
  );

  function changeType(t: TxType) {
    setType(t);
    if (categoryId && !categories.some((c) => c.id === categoryId && c.type === t)) {
      setCategoryId(null);
    }
  }

  function save() {
    if (amount <= 0) return;
    const payload = {
      amount,
      type,
      categoryId,
      tagIds,
      note: note.trim(),
      payee: payee.trim() || undefined,
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
            if (!(await confirm({ title: "Xoá giao dịch này?", confirmLabel: "Xoá", danger: true })))
              return;
            deleteTransaction(editingId);
            setOpen(false);
          }}
        >
          <span className="wb-ico wb-ico--sm">delete</span>
          Xoá
        </button>
      ) : isDraft ? (
        <button type="button" className="wb-btn wb-btn--ghost" style={{ gap: 6 }} onClick={discard}>
          <span className="wb-ico wb-ico--sm">backspace</span>
          Bỏ bản nháp
        </button>
      ) : (
        <span />
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="wb-btn wb-btn--secondary" onClick={dismiss}>
          {editingId ? "Huỷ" : "Để sau"}
        </button>
        <button type="button" className="wb-btn" onClick={save} disabled={amount <= 0}>
          {editingId ? "Lưu" : "Thêm giao dịch"}
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={dismiss}
      title={editingId ? "Sửa giao dịch" : "Thêm giao dịch"}
      footer={footer}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Chi / Thu segmented toggle */}
        <div className="wb-tabs wb-tabs--pill" style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          {(["expense", "income"] as TxType[]).map((t) => {
            const active = type === t;
            const tone = t === "income" ? "var(--wb-success-text)" : "var(--wb-danger-text)";
            return (
              <button
                key={t}
                type="button"
                className={active ? "wb-tab is-active" : "wb-tab"}
                style={{ textAlign: "center", color: active ? tone : undefined }}
                onClick={() => changeType(t)}
              >
                {t === "expense" ? "Chi tiêu" : "Thu nhập"}
              </button>
            );
          })}
        </div>

        {/* Amount — the field the eye should land on first: large, monospaced
            digits with a ₫ unit addon, and the grouped value spelled out beneath. */}
        <Field label="Số tiền" htmlFor="tx-amount" help={amount > 0 ? formatMoney(amount) : undefined}>
          <Input
            id="tx-amount"
            inputMode="numeric"
            autoComplete="off"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="0"
            size="lg"
            trailingAddon="₫"
            style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
          />
        </Field>

        {/* Category */}
        <Field label="Danh mục" htmlFor="tx-cat">
          <Select
            id="tx-cat"
            value={categoryId ?? "none"}
            onChange={(e) => setCategoryId(e.target.value === "none" ? null : e.target.value)}
          >
              <option value="none">Chưa phân loại</option>
              {catOptions.map(({ cat, depth }) => (
                <option key={cat.id} value={cat.id}>
                  {"  ".repeat(depth) + cat.name}
                </option>
              ))}
          </Select>
        </Field>

        {/* Counterparty + status */}
        <div className="wb-cluster wb-cluster--nowrap wb-cluster--stretch" style={{ gap: 12 }}>
          <Field
            label="Bên giao dịch"
            labelOptional="(người / công ty)"
            htmlFor="tx-payee"
            style={{ flex: 1, minWidth: 0 }}
          >
            <Input
              id="tx-payee"
              value={payee}
              autoComplete="off"
              onChange={(e) => setPayee(e.target.value)}
              placeholder="VD: Highlands, Công ty ABC"
            />
          </Field>
          <Field label="Trạng thái" style={{ flex: 1, minWidth: 0 }}>
            <StatusPicker value={status} onChange={setStatus} />
          </Field>
        </div>

        {/* Tags — a dashed "＋" capsule LEADS (fixed first slot, so the way to add
            never moves as chips come and go), then the chosen tags follow as
            removable, frequency-inked chips. No text-input frame: you never type
            here, you pick. */}
        <div className="wb-field">
          <label className="wb-label">Nhãn</label>
          <div className="wb-cluster" style={{ flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <Popover
              inline
              panelWidth={240}
              trigger={({ toggle }) => (
                <button type="button" className="cashy-tag-add" onClick={toggle}>
                  <span className="wb-ico wb-ico--xs">add</span>
                  Thêm nhãn
                </button>
              )}
            >
              {tags.length === 0 ? (
                <div style={{ padding: "8px 10px", textAlign: "center", fontSize: 12, color: "var(--wb-fg-muted)" }}>
                  Chưa có nhãn nào. Tạo ở màn Nhãn.
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

        {/* Date + optional time */}
        <div className="wb-cluster wb-cluster--nowrap" style={{ gap: 12, alignItems: "flex-start" }}>
          <div className="wb-field" style={{ flex: 1, minWidth: 0 }}>
            <label className="wb-label">Ngày</label>
            <DatePicker value={occurredAt} onChange={setOccurredAt} />
          </div>
          <div className="wb-field" style={{ flex: "none", width: 132 }}>
            <label className="wb-label" htmlFor="tx-time">
              Giờ <span className="wb-label__opt">(không bắt buộc)</span>
            </label>
            <div className="wb-cluster wb-cluster--nowrap" style={{ gap: 4 }}>
              <input
                id="tx-time"
                className="wb-input"
                type="time"
                value={occurredTime}
                onChange={(e) => setOccurredTime(e.target.value)}
                style={{ minWidth: 0 }}
              />
              {/* A time input has no "unset" of its own once filled. */}
              {occurredTime && (
                <button
                  type="button"
                  className="wb-btn wb-btn--ghost wb-btn--sm wb-btn--icon"
                  aria-label="Bỏ giờ"
                  onClick={() => setOccurredTime("")}
                >
                  <span className="wb-ico wb-ico--xs">close</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Note — the migrated wb Textarea (themed resize handle, auto-grows). */}
        <Field label="Ghi chú" htmlFor="tx-note">
          <Textarea
            id="tx-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Không bắt buộc"
            autoSize
            rows={2}
          />
        </Field>
      </div>
    </Modal>
  );
}
