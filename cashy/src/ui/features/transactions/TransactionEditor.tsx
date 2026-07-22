import { useEffect, useMemo, useState } from "react";
import {
  addTransaction,
  deleteTransaction,
  updateTransaction,
  useCashy,
} from "@/data/store";
import { flattenTree, rankTags } from "@/domain";
import { clearDraft, getDraft, saveDraft, type TxDraft } from "@/data/draft";
import { formatMoney, parseMoney } from "@/domain/money";
import { todayYMD } from "@/domain/date";
import { TX_STATUS_META, TX_STATUS_ORDER } from "@/domain/txStatus";
import type { TxStatus, TxType } from "@/domain/types";
import { Modal } from "@/ui/kit/Modal";
import { Popover } from "@/ui/kit/Popover";
import { DatePicker } from "@/ui/common/DatePicker";
import { Select } from "@/ui/common/Select";
import { TagChip } from "@/ui/common/TagChip";
import { registerTxEditor } from "@/lib/modals";
import { confirm } from "@/lib/confirm";

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

        {/* Amount */}
        <div className="wb-field">
          <label className="wb-label" htmlFor="tx-amount">
            Số tiền
          </label>
          <input
            id="tx-amount"
            className="wb-input"
            inputMode="numeric"
            autoComplete="off"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="0"
            style={{ fontSize: 18 }}
          />
          <span
            className="wb-num"
            style={{ fontSize: 12, color: "var(--wb-fg-muted)", textAlign: "left" }}
          >
            {formatMoney(amount)}
          </span>
        </div>

        {/* Category */}
        <div className="wb-field">
          <label className="wb-label" htmlFor="tx-cat">
            Danh mục
          </label>
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
        </div>

        {/* Counterparty + status */}
        <div className="wb-cluster wb-cluster--nowrap wb-cluster--stretch" style={{ gap: 12 }}>
          <div className="wb-field" style={{ flex: 1, minWidth: 0 }}>
            <label className="wb-label" htmlFor="tx-payee">
              Bên giao dịch <span className="wb-label__opt">(người / công ty)</span>
            </label>
            <input
              id="tx-payee"
              className="wb-input"
              value={payee}
              autoComplete="off"
              onChange={(e) => setPayee(e.target.value)}
              placeholder="VD: Highlands, Công ty ABC"
            />
          </div>
          <div className="wb-field" style={{ flex: 1, minWidth: 0 }}>
            <label className="wb-label" htmlFor="tx-status">
              Trạng thái
            </label>
            <Select
              id="tx-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TxStatus)}
            >
              {TX_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {TX_STATUS_META[s].label}
                </option>
              ))}
            </Select>
          </div>
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

        {/* Note */}
        <div className="wb-field">
          <label className="wb-label" htmlFor="tx-note">
            Ghi chú
          </label>
          <textarea
            id="tx-note"
            className="wb-textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Không bắt buộc"
            rows={2}
          />
        </div>
      </div>
    </Modal>
  );
}
