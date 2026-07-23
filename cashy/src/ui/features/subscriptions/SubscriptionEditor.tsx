import { useEffect, useMemo, useState } from "react";
import { useCashy } from "@/data/store";
import { addSubscription, deleteSubscription, updateSubscription } from "@/usecases";
import { cycleDate, firstBillableCycle, firstCycleProration, flattenTree } from "@/domain";
import { fmtDateNum, todayYMD } from "@/domain/date";
import { formatMoney, parseMoney } from "@/domain/money";
import { SWATCHES } from "@/lib/palette";
import { Modal } from "@/ui/kit/Modal";
import { Popover } from "@/ui/kit/Popover";
import { Field } from "@/ui/kit/Input";
import { Textarea } from "@/ui/kit/Textarea";
import { IconPicker } from "@/ui/common/IconPicker";
import { ColorPicker } from "@/ui/common/ColorPicker";
import { Select } from "@/ui/common/Select";
import { WalletPicker } from "@/ui/common/WalletPicker";
import { SubTile } from "@/ui/features/subscriptions/SubTile";
import { TagChip } from "@/ui/common/TagChip";
import { registerSubscriptionEditor } from "@/lib/modals";
import { confirmDelete } from "@/lib/confirm";
import type { SubInterval, Subscription } from "@/domain/types";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function SubscriptionEditor() {
  const { categories, tags, subscriptions, wallets } = useCashy();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [interval, setInterval] = useState<SubInterval>("monthly");
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [monthOfYear, setMonthOfYear] = useState(1);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [color, setColor] = useState<string>(SWATCHES[0]);
  const [icon, setIcon] = useState("credit-card");
  const [note, setNote] = useState("");
  const [walletId, setWalletId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(todayYMD());
  // Shared / family plan: the whole price + how many split it; `amount` is the
  // user's own share.
  const [shared, setShared] = useState(false);
  const [fullAmountStr, setFullAmountStr] = useState("");
  const [membersStr, setMembersStr] = useState("2");
  // Prorated first cycle when joining mid-period.
  const [prorate, setProrate] = useState(false);
  const [firstAmountStr, setFirstAmountStr] = useState("");
  // Free trial: the first N months cost nothing, billing starts after.
  const [hasTrial, setHasTrial] = useState(false);
  const [trialMonthsStr, setTrialMonthsStr] = useState("1");

  useEffect(() => {
    registerSubscriptionEditor((id) => {
      const sub = id ? (subscriptions.find((s) => s.id === id) ?? null) : null;
      setEditingId(sub ? sub.id : null);
      setName(sub?.name ?? "");
      setAmountStr(sub && sub.amount ? String(sub.amount) : "");
      setInterval(sub?.interval ?? "monthly");
      setDayOfMonth(sub?.dayOfMonth ?? 1);
      setMonthOfYear(sub?.monthOfYear ?? new Date().getMonth() + 1);
      setCategoryId(sub?.categoryId ?? null);
      setTagIds(sub?.tagIds ?? []);
      setColor(sub?.colorHex ?? SWATCHES[0]);
      setIcon(sub?.icon ?? "credit-card");
      setNote(sub?.note ?? "");
      setWalletId(sub?.walletId ?? null);
      setStartedAt(sub?.startedAt ?? todayYMD());
      setShared((sub?.members ?? 0) > 1 || sub?.fullAmount != null);
      setFullAmountStr(sub?.fullAmount != null ? String(sub.fullAmount) : "");
      setMembersStr(sub?.members != null ? String(sub.members) : "2");
      setProrate(sub?.firstCycleAmount != null);
      setFirstAmountStr(sub?.firstCycleAmount != null ? String(sub.firstCycleAmount) : "");
      setHasTrial((sub?.trialMonths ?? 0) > 0);
      setTrialMonthsStr(sub?.trialMonths && sub.trialMonths > 0 ? String(sub.trialMonths) : "1");
      setOpen(true);
    });
    return () => {
      registerSubscriptionEditor(null);
    };
  }, [subscriptions]);

  const amount = parseMoney(amountStr);
  const fullAmount = parseMoney(fullAmountStr);
  const members = Math.max(2, parseInt(membersStr, 10) || 2);
  const clampedDay = Math.min(31, Math.max(1, dayOfMonth || 1));
  const firstAmount = parseMoney(firstAmountStr);
  const trialMonths = Math.max(1, parseInt(trialMonthsStr, 10) || 1);
  const catOptions = useMemo(() => flattenTree(categories, "expense"), [categories]);
  const canSave = name.trim() !== "" && amount > 0;

  // Live preview of the first day money is actually wanted, so the trial's end is
  // stated as a concrete date rather than left for the user to work out.
  const trialFirstCharge = useMemo(() => {
    if (!hasTrial) return null;
    const s = {
      interval,
      dayOfMonth: clampedDay,
      monthOfYear,
      startedAt,
      trialMonths,
    } as Subscription;
    return cycleDate(s, firstBillableCycle(s));
  }, [hasTrial, interval, clampedDay, monthOfYear, startedAt, trialMonths]);

  // Live proration suggestion for the first cycle (null when there is nothing to
  // prorate — joined on/before the billing anchor). Drives both the "Kỳ đầu" hint
  // and the default value, so the suggestion never goes stale as the amount or
  // the billing day is edited.
  const pro = useMemo(
    () =>
      firstCycleProration({
        amount,
        startedAt,
        dayOfMonth: clampedDay,
        interval,
        monthOfYear,
      }),
    [amount, startedAt, clampedDay, interval, monthOfYear],
  );

  function save() {
    if (!canSave) return;
    // Prorated first charge: an explicit value if typed, else the suggestion.
    const firstCycleAmount = prorate ? (firstAmount > 0 ? firstAmount : pro?.amount) : undefined;
    const payload = {
      name: name.trim(),
      amount,
      interval,
      dayOfMonth: clampedDay,
      // Shared-plan totals (kept only while the toggle is on) + the prorated
      // first charge. Undefined clears them on edit when a toggle is switched off.
      fullAmount: shared && fullAmount > 0 ? fullAmount : undefined,
      members: shared ? members : undefined,
      firstCycleAmount,
      // Free-trial length; cleared when the toggle is off.
      trialMonths: hasTrial && trialMonths > 0 ? trialMonths : undefined,
      // Only carried for yearly plans; a monthly one has no billing month.
      monthOfYear: interval === "yearly" ? Math.min(12, Math.max(1, monthOfYear || 1)) : undefined,
      categoryId,
      tagIds,
      colorHex: color,
      icon,
      note: note.trim(),
      walletId,
      startedAt,
    };
    if (editingId) updateSubscription(editingId, payload);
    else addSubscription(payload);
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
          onClick={async () => {
            if (
              await confirmDelete({
                title: "Delete this subscription?",
                message: "Recorded transactions are kept.",
              })
            ) {
              deleteSubscription(editingId);
              setOpen(false);
            }
          }}
        >
          <span className="wb-ico wb-ico--sm">delete</span>
          Delete
        </button>
      ) : (
        <span />
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="wb-btn wb-btn--secondary" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button type="button" className="wb-btn" onClick={save} disabled={!canSave}>
          {editingId ? "Save" : "Add"}
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title={editingId ? "Edit subscription" : "Add subscription"}
      footer={footer}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="wb-field">
          <label className="wb-label" htmlFor="sub-name">
            Service name
          </label>
          <input
            id="sub-name"
            className="wb-input"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Netflix, YouTube Premium"
          />
        </div>

        {/* Billing interval — decides whether the date below is a day of the
            month or a full "ngày a tháng b" date. */}
        <div className="wb-field">
          <label className="wb-label">Billing cycle</label>
          <div
            className="wb-tabs wb-tabs--pill"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}
          >
            {(["monthly", "yearly"] as SubInterval[]).map((iv) => (
              <button
                key={iv}
                type="button"
                className={interval === iv ? "wb-tab is-active" : "wb-tab"}
                style={{ textAlign: "center" }}
                onClick={() => setInterval(iv)}
              >
                {iv === "monthly" ? "Monthly" : "Yearly"}
              </button>
            ))}
          </div>
        </div>

        <div className="wb-cluster wb-cluster--nowrap wb-cluster--stretch" style={{ gap: 12 }}>
          <div className="wb-field" style={{ flex: 2 }}>
            <label className="wb-label" htmlFor="sub-amount">
              {shared ? "Your share" : "Amount"} / {interval === "yearly" ? "year" : "month"}
            </label>
            <input
              id="sub-amount"
              className="wb-input"
              inputMode="numeric"
              autoComplete="off"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0"
            />
            <span className="wb-num" style={{ fontSize: 12, color: "var(--wb-fg-muted)", textAlign: "left" }}>
              {formatMoney(amount)}
            </span>
          </div>
          <div className="wb-field" style={{ flex: 1 }}>
            <label className="wb-label" htmlFor="sub-day">
              {interval === "yearly" ? "Day" : "Day of month"}
            </label>
            <input
              id="sub-day"
              className="wb-input"
              type="number"
              min={1}
              max={31}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(Number(e.target.value))}
            />
          </div>
          {interval === "yearly" && (
            <div className="wb-field" style={{ flex: 1 }}>
              <label className="wb-label" htmlFor="sub-month">
                Month
              </label>
              <Select
                id="sub-month"
                value={monthOfYear}
                onChange={(e) => setMonthOfYear(Number(e.target.value))}
              >
                  {MONTH_NAMES.map((mn, i) => (
                    <option key={i + 1} value={i + 1}>
                      {mn}
                    </option>
                  ))}
              </Select>
            </div>
          )}
        </div>
        {interval === "yearly" && (
          <span className="wb-help" style={{ marginTop: -8 }}>
            Billed on {MONTH_NAMES[Math.min(12, Math.max(1, monthOfYear || 1)) - 1]}{" "}
            {Math.min(31, Math.max(1, dayOfMonth || 1))} each year.
          </span>
        )}

        <div className="wb-field">
          <label className="wb-label" htmlFor="sub-start">
            Start date
          </label>
          <input
            id="sub-start"
            className="wb-input"
            type="date"
            value={startedAt}
            onChange={(e) => setStartedAt(e.target.value)}
          />
          <span className="wb-help">No month before this date is ever charged.</span>
        </div>

        {/* Free trial — the first N months cost nothing; billing starts after. The
            first billing date is shown live so "when do I start paying" is never a
            guess. */}
        <div className="wb-field">
          <label className="wb-check" style={{ cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={hasTrial}
              onChange={(e) => setHasTrial(e.target.checked)}
            />
            <span>Free for the first months (free trial)</span>
          </label>
          {hasTrial && (
            <div
              className="wb-cluster wb-cluster--nowrap wb-cluster--stretch"
              style={{ gap: 12, marginTop: 10, alignItems: "flex-end" }}
            >
              <div className="wb-field" style={{ flex: "none", width: 132 }}>
                <label className="wb-label" htmlFor="sub-trial">
                  Free months
                </label>
                <input
                  id="sub-trial"
                  className="wb-input"
                  type="number"
                  min={1}
                  max={36}
                  value={trialMonthsStr}
                  onChange={(e) => setTrialMonthsStr(e.target.value)}
                />
              </div>
              {trialFirstCharge && (
                <span className="wb-help" style={{ margin: 0, flex: 1 }}>
                  Nothing is charged during the trial. First charge on{" "}
                  <strong>{fmtDateNum(trialFirstCharge)}</strong>.
                </span>
              )}
            </div>
          )}
        </div>

        {/* Shared / family plan — record the WHOLE price and how many split it, so
            the data mirrors reality; the amount above stays your own share. */}
        <div className="wb-field">
          <label className="wb-check" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
            <span>Shared / family plan (split between people)</span>
          </label>
          {shared && (
            <>
              <div
                className="wb-cluster wb-cluster--nowrap wb-cluster--stretch"
                style={{ gap: 12, marginTop: 10 }}
              >
                <div className="wb-field" style={{ flex: 2 }}>
                  <label className="wb-label" htmlFor="sub-full">
                    Full plan price / {interval === "yearly" ? "year" : "month"}
                  </label>
                  <input
                    id="sub-full"
                    className="wb-input"
                    inputMode="numeric"
                    autoComplete="off"
                    value={fullAmountStr}
                    onChange={(e) => setFullAmountStr(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="wb-field" style={{ flex: 1 }}>
                  <label className="wb-label" htmlFor="sub-members">
                    People
                  </label>
                  <input
                    id="sub-members"
                    className="wb-input"
                    type="number"
                    min={2}
                    value={membersStr}
                    onChange={(e) => setMembersStr(e.target.value)}
                  />
                </div>
              </div>
              <div className="wb-cluster" style={{ gap: 10, marginTop: 8, alignItems: "center" }}>
                <button
                  type="button"
                  className="wb-btn wb-btn--secondary wb-btn--sm"
                  disabled={fullAmount <= 0}
                  onClick={() => setAmountStr(String(Math.round(fullAmount / members)))}
                >
                  Split evenly across {members}
                </button>
                {fullAmount > 0 && (
                  <span className="wb-help" style={{ margin: 0 }}>
                    Your share: <strong>{formatMoney(amount)}</strong> · plan{" "}
                    {formatMoney(fullAmount)}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Prorated first cycle — offered only when the join date lands mid-period
            (the billing anchor already passed for this cycle). */}
        {pro && (
          <div className="wb-field">
            <label className="wb-check" style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={prorate}
                onChange={(e) => setProrate(e.target.checked)}
              />
              <span>Prorate the first cycle by days used (joined mid-period)</span>
            </label>
            {prorate && (
              <div style={{ marginTop: 10 }}>
                <label className="wb-label" htmlFor="sub-first">
                  First-cycle amount
                </label>
                <input
                  id="sub-first"
                  className="wb-input"
                  inputMode="numeric"
                  autoComplete="off"
                  value={firstAmountStr}
                  onChange={(e) => setFirstAmountStr(e.target.value)}
                  placeholder={String(pro.amount)}
                />
                <span className="wb-help">
                  Suggested {formatMoney(pro.amount)} — {pro.days}/{pro.total} days of the first
                  cycle. Later cycles stay {formatMoney(amount)}.
                </span>
              </div>
            )}
          </div>
        )}

        <div className="wb-field">
          <label className="wb-label" htmlFor="sub-cat">
            Category
          </label>
          <Select
            id="sub-cat"
            value={categoryId ?? "none"}
            onChange={(e) => setCategoryId(e.target.value === "none" ? null : e.target.value)}
          >
              <option value="none">Uncategorised</option>
              {catOptions.map(({ cat, depth }) => (
                <option key={cat.id} value={cat.id}>
                  {"  ".repeat(depth) + cat.name}
                </option>
              ))}
          </Select>
        </div>

        <div className="wb-field">
          <label className="wb-label">Tags</label>
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
                  <span style={{ color: "var(--wb-fg-subtle)" }}>Select tags…</span>
                )}
              </button>
            )}
          >
            {tags.length === 0 ? (
              <div style={{ padding: "8px 10px", textAlign: "center", fontSize: 12, color: "var(--wb-fg-muted)" }}>
                No tags yet. Create them on the Tags page.
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
                      <span className="cashy-dot cashy-dot--sm" style={{ background: t.colorHex }} />
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

        <div className="wb-cluster wb-cluster--nowrap" style={{ gap: 12, alignItems: "flex-start" }}>
          <div className="wb-field" style={{ flex: "none" }}>
            <label className="wb-label">Icon &amp; color</label>
            <SubTile icon={icon} colorHex={color} brand iconSize={20} />
          </div>
          <div className="wb-field" style={{ flex: 1, minWidth: 0 }}>
            <label className="wb-label" style={{ visibility: "hidden" }}>
              Color
            </label>
            <ColorPicker value={color} onChange={setColor} />
            <div style={{ marginTop: 8 }}>
              <IconPicker value={icon} onChange={setIcon} />
            </div>
          </div>
        </div>

        {/* Which wallet pays this service — inherited onto every cycle charge, so
            the ledger shows what funded each payment. */}
        <div className="wb-field">
          <label className="wb-label" htmlFor="sub-wallet">
            Paid from <span className="wb-label__opt">(wallet)</span>
          </label>
          <WalletPicker id="sub-wallet" wallets={wallets} value={walletId} onChange={setWalletId} />
        </div>

        <Field label="Note" htmlFor="sub-note">
          <Textarea
            id="sub-note"
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
