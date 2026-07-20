import { useEffect, useMemo, useState } from "react";
import {
  addTransaction,
  deleteTransaction,
  updateTransaction,
  useCashy,
} from "@/lib/store";
import { flattenTree } from "@/lib/domain";
import { formatMoney, parseMoney } from "@/lib/money";
import { todayYMD } from "@/lib/date";
import type { TxType } from "@/types";
import { Modal } from "@/components/wb/Modal";
import { Popover } from "@/components/wb/Popover";
import { TagChip } from "@/components/TagChip";

let openFn: ((id: string | null) => void) | null = null;
/** Open the transaction editor from anywhere. Pass an id to edit, or null to add. */
export function openTxEditor(id: string | null = null) {
  openFn?.(id);
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
  const [note, setNote] = useState("");

  useEffect(() => {
    openFn = (id) => {
      const tx = id ? (transactions.find((t) => t.id === id) ?? null) : null;
      setEditingId(tx ? tx.id : null);
      setType(tx?.type ?? "expense");
      setAmountStr(tx && tx.amount ? String(tx.amount) : "");
      setCategoryId(tx?.categoryId ?? null);
      setTagIds(tx?.tagIds ?? []);
      setOccurredAt(tx?.occurredAt ?? todayYMD());
      setNote(tx?.note ?? "");
      setOpen(true);
    };
    return () => {
      openFn = null;
    };
  }, [transactions]);

  const amount = parseMoney(amountStr);
  const catOptions = useMemo(() => flattenTree(categories, type), [categories, type]);

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
      occurredAt,
    };
    if (editingId) updateTransaction(editingId, payload);
    else addTransaction(payload);
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
      {editingId ? (
        <button
          type="button"
          className="wb-btn wb-btn--ghost"
          style={{ color: "var(--wb-danger-text)", gap: 6 }}
          onClick={() => {
            deleteTransaction(editingId);
            setOpen(false);
          }}
        >
          <span className="wb-ico wb-ico--sm">delete</span>
          Xoá
        </button>
      ) : (
        <span />
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="wb-btn wb-btn--secondary" onClick={() => setOpen(false)}>
          Huỷ
        </button>
        <button type="button" className="wb-btn" onClick={save} disabled={amount <= 0}>
          {editingId ? "Lưu" : "Thêm"}
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
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
          <span className="wb-select-wrap">
            <select
              id="tx-cat"
              className="wb-select"
              value={categoryId ?? "none"}
              onChange={(e) => setCategoryId(e.target.value === "none" ? null : e.target.value)}
            >
              <option value="none">Chưa phân loại</option>
              {catOptions.map(({ cat, depth }) => (
                <option key={cat.id} value={cat.id}>
                  {"  ".repeat(depth) + cat.name}
                </option>
              ))}
            </select>
            <span className="wb-ico">expand_more</span>
          </span>
        </div>

        {/* Tags */}
        <div className="wb-field">
          <label className="wb-label">Nhãn</label>
          <Popover
            panelWidth={224}
            trigger={({ toggle }) => (
              <button
                type="button"
                className="wb-input"
                onClick={toggle}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 4,
                  alignItems: "center",
                  minHeight: 38,
                  height: "auto",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {tagIds.length ? (
                  tagIds.map((id) => {
                    const t = tags.find((x) => x.id === id);
                    return t ? <TagChip key={id} tag={t} /> : null;
                  })
                ) : (
                  <span style={{ color: "var(--wb-fg-subtle)" }}>Chọn nhãn…</span>
                )}
              </button>
            )}
          >
            {tags.length === 0 ? (
              <div style={{ padding: "8px 10px", textAlign: "center", fontSize: 12, color: "var(--wb-fg-muted)" }}>
                Chưa có nhãn nào. Tạo ở màn Nhãn.
              </div>
            ) : (
              <div className="wb-menu" style={{ border: 0, boxShadow: "none", padding: 0, background: "none" }}>
                {tags.map((t) => {
                  const on = tagIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className="wb-menu__item"
                      onClick={() =>
                        setTagIds(on ? tagIds.filter((x) => x !== t.id) : [...tagIds, t.id])
                      }
                    >
                      <span
                        style={{ width: 8, height: 8, borderRadius: "50%", background: t.colorHex, flex: "none" }}
                      />
                      {t.name}
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
        </div>

        {/* Date */}
        <div className="wb-field">
          <label className="wb-label" htmlFor="tx-date">
            Ngày
          </label>
          <input
            id="tx-date"
            className="wb-input"
            type="date"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
          />
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
