import { useEffect, useState } from "react";
import { addLoan, deleteLoan, setLoanArchived, updateLoan } from "@/usecases";
import { confirmDelete } from "@/lib/confirm";
import { SWATCHES } from "@/lib/palette";
import { uid } from "@/lib/id";
import { formatDigits, formatMoney, parseMoney } from "@/domain/money";
import { todayYMD } from "@/domain/date";
import { loanSourceIcon } from "@/domain/loan";
import type { InterestPeriod, Loan, LoanDirection, LoanPayment, LoanSource } from "@/domain/types";
import { Button } from "@/ui/kit/Button";
import { Select } from "@/ui/kit/Select";
import { Modal } from "@/ui/kit/Modal";
import { ColorPicker } from "@/ui/common/ColorPicker";
import { IconPicker } from "@/ui/common/IconPicker";
import { SOURCES, PERIODS } from "./loanOptions";

export function LoanEditor({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: Loan | null;
  onClose: () => void;
}) {
  const [direction, setDirection] = useState<LoanDirection>("borrowed");
  const [counterparty, setCounterparty] = useState("");
  const [source, setSource] = useState<LoanSource>("personal");
  const [principalStr, setPrincipalStr] = useState("0");
  const [rateStr, setRateStr] = useState("0");
  const [period, setPeriod] = useState<InterestPeriod>("year");
  const [openedAt, setOpenedAt] = useState(todayYMD());
  const [dueAt, setDueAt] = useState("");
  const [color, setColor] = useState<string>(SWATCHES[0]);
  const [icon, setIcon] = useState<string>(loanSourceIcon("personal"));
  const [note, setNote] = useState("");
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  // The "add a payment" row.
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(todayYMD());
  const [payNote, setPayNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setDirection(editing?.direction ?? "borrowed");
    setCounterparty(editing?.counterparty ?? "");
    setSource(editing?.source ?? "personal");
    setPrincipalStr(editing ? formatDigits(editing.principal) : "0");
    setRateStr(editing ? String(editing.interestRatePct) : "0");
    setPeriod(editing?.interestPeriod ?? "year");
    setOpenedAt(editing?.openedAt ?? todayYMD());
    setDueAt(editing?.dueAt ?? "");
    setColor(editing?.colorHex ?? SWATCHES[0]);
    setIcon(editing?.icon ?? loanSourceIcon("personal"));
    setNote(editing?.note ?? "");
    setPayments(editing ? editing.payments.map((p) => ({ ...p })) : []);
    setPayAmount("");
    setPayDate(todayYMD());
    setPayNote("");
  }, [open, editing]);

  const principal = parseMoney(principalStr);
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = Math.max(0, principal - paid);
  const owed = direction === "borrowed";

  function addPayment() {
    const amount = parseMoney(payAmount);
    if (amount <= 0) return;
    setPayments((ps) =>
      [...ps, { id: uid(), amount, date: payDate || todayYMD(), note: payNote.trim() }].sort((a, b) =>
        a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
      ),
    );
    setPayAmount("");
    setPayNote("");
  }
  function removePayment(id: string) {
    setPayments((ps) => ps.filter((p) => p.id !== id));
  }

  function save() {
    const name = counterparty.trim();
    if (!name || principal <= 0) return;
    const fields = {
      direction,
      counterparty: name,
      source,
      principal,
      interestRatePct: Math.max(0, Number(rateStr) || 0),
      interestPeriod: period,
      openedAt: openedAt || todayYMD(),
      dueAt: dueAt || null,
      colorHex: color,
      icon,
      note,
      payments,
    };
    if (editing) updateLoan(editing.id, fields);
    else addLoan(fields);
    onClose();
  }

  async function remove() {
    if (!editing) return;
    const ok = await confirmDelete({
      title: `Delete loan "${editing.counterparty}"?`,
      message: "This removes the loan and its payment history. Archive instead to keep the record.",
    });
    if (ok) {
      deleteLoan(editing.id);
      onClose();
    }
  }

  const canSave = counterparty.trim().length > 0 && principal > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit loan" : "Add loan"}
      maxWidth={480}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={!canSave}>
            {editing ? "Save" : "Add"}
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Borrowed / Lent — which side of the loan you're on. */}
        <div className="wb-tabs wb-tabs--pill" style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          {(["borrowed", "lent"] as LoanDirection[]).map((d) => (
            <button
              key={d}
              type="button"
              className={direction === d ? "wb-tab is-active" : "wb-tab"}
              style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={() => setDirection(d)}
            >
              {d === "borrowed" ? "I borrowed" : "I lent"}
            </button>
          ))}
        </div>

        <div className="wb-field">
          <label className="wb-label" htmlFor="loan-party">
            {owed ? "Lender" : "Borrower"}
          </label>
          <input
            id="loan-party"
            className="wb-input"
            value={counterparty}
            autoFocus
            onChange={(e) => setCounterparty(e.target.value)}
            placeholder={owed ? "e.g. Techcombank, Bố mẹ" : "e.g. Minh, em trai"}
          />
        </div>

        <div className="wb-cluster" style={{ gap: 12, alignItems: "flex-end" }}>
          <div className="wb-field" style={{ flex: 1, minWidth: 0 }}>
            <label className="wb-label" htmlFor="loan-source">
              Source
            </label>
            <Select
              id="loan-source"
              value={source}
              onChange={(e) => {
                const s = e.target.value as LoanSource;
                setSource(s);
                setIcon(loanSourceIcon(s));
              }}
            >
              {SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="wb-field" style={{ flex: 1, minWidth: 0 }}>
            <label className="wb-label" htmlFor="loan-principal">
              Principal <span className="wb-label__opt">(₫)</span>
            </label>
            <input
              id="loan-principal"
              className="wb-input"
              inputMode="numeric"
              value={principalStr}
              onChange={(e) => setPrincipalStr(e.target.value)}
              onBlur={() => setPrincipalStr(formatDigits(parseMoney(principalStr)))}
            />
          </div>
        </div>

        <div className="wb-cluster" style={{ gap: 12, alignItems: "flex-end" }}>
          <div className="wb-field" style={{ flex: 1, minWidth: 0 }}>
            <label className="wb-label" htmlFor="loan-rate">
              Interest rate <span className="wb-label__opt">(%)</span>
            </label>
            <input
              id="loan-rate"
              className="wb-input"
              inputMode="decimal"
              value={rateStr}
              onChange={(e) => setRateStr(e.target.value)}
            />
          </div>
          <div className="wb-field" style={{ flex: 1, minWidth: 0 }}>
            <label className="wb-label" htmlFor="loan-period">
              Rate period
            </label>
            <Select id="loan-period" value={period} onChange={(e) => setPeriod(e.target.value as InterestPeriod)}>
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="wb-cluster" style={{ gap: 12, alignItems: "flex-end" }}>
          <div className="wb-field" style={{ flex: 1, minWidth: 0 }}>
            <label className="wb-label" htmlFor="loan-opened">
              Opened
            </label>
            <input
              id="loan-opened"
              type="date"
              className="wb-input"
              value={openedAt}
              onChange={(e) => setOpenedAt(e.target.value)}
            />
          </div>
          <div className="wb-field" style={{ flex: 1, minWidth: 0 }}>
            <label className="wb-label" htmlFor="loan-due">
              Due date <span className="wb-label__opt">(hạn trả — optional)</span>
            </label>
            <input
              id="loan-due"
              type="date"
              className="wb-input"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>
        </div>

        {/* Payments — the manual repayment / collection log. Outstanding updates live. */}
        <div className="wb-field">
          <div className="wb-cluster" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
            <label className="wb-label" style={{ marginBottom: 0 }}>
              {owed ? "Repayments" : "Collections"}
            </label>
            <span style={{ fontSize: 12, color: "var(--wb-fg-muted)" }}>
              Outstanding <strong style={{ color: "var(--wb-fg)" }}>{formatMoney(outstanding)}</strong>
            </span>
          </div>

          {payments.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "8px 0" }}>
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="wb-cluster wb-cluster--nowrap"
                  style={{ gap: 8, alignItems: "center", fontSize: 13 }}
                >
                  <span style={{ color: "var(--wb-fg-muted)", minWidth: 92 }}>{p.date}</span>
                  <span style={{ fontWeight: 600 }}>{formatMoney(p.amount)}</span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "var(--wb-fg-muted)",
                    }}
                  >
                    {p.note}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    iconOnly
                    size="sm"
                    round
                    aria-label="Remove payment"
                    onClick={() => removePayment(p.id)}
                  >
                    <span className="wb-ico wb-ico--xs">close</span>
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="wb-cluster wb-cluster--nowrap" style={{ gap: 8, alignItems: "flex-end", marginTop: 4 }}>
            <input
              className="wb-input"
              style={{ flex: 1, minWidth: 0 }}
              inputMode="numeric"
              value={payAmount}
              placeholder="Amount"
              onChange={(e) => setPayAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPayment())}
            />
            <input
              type="date"
              className="wb-input"
              style={{ flex: "none", width: 150 }}
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addPayment}
              disabled={parseMoney(payAmount) <= 0}
            >
              Add
            </Button>
          </div>
          <input
            className="wb-input"
            style={{ marginTop: 8 }}
            value={payNote}
            placeholder="Note (optional)"
            onChange={(e) => setPayNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPayment())}
          />
        </div>

        <div className="wb-field">
          <label className="wb-label" htmlFor="loan-note">
            Note <span className="wb-label__opt">(optional)</span>
          </label>
          <input
            id="loan-note"
            className="wb-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Vay mua ô tô"
          />
        </div>

        <div className="wb-cluster" style={{ gap: 16, alignItems: "flex-start" }}>
          <div className="wb-field" style={{ flex: 1, minWidth: 0 }}>
            <label className="wb-label">Color</label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </div>
        <div className="wb-field">
          <label className="wb-label">Icon</label>
          <IconPicker value={icon} onChange={setIcon} />
        </div>

        {editing && (
          <div className="wb-cluster" style={{ gap: 8, justifyContent: "flex-start" }}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setLoanArchived(editing.id, !editing.archived);
                onClose();
              }}
            >
              <span className="wb-ico wb-ico--xs">{editing.archived ? "unarchive" : "archive"}</span>
              {editing.archived ? "Unarchive" : "Archive"}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="cashy-btn--quiet-danger" onClick={remove}>
              <span className="wb-ico wb-ico--xs">delete</span>
              Delete
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
