import { useEffect, useMemo, useState } from "react";
import {
  addSubscription,
  deleteSubscription,
  updateSubscription,
  useCashy,
} from "@/lib/store";
import { firstCycleProration, flattenTree } from "@/lib/domain";
import { todayYMD } from "@/lib/date";
import { formatMoney, parseMoney } from "@/lib/money";
import { SWATCHES } from "@/lib/palette";
import { Modal } from "@/components/wb/Modal";
import { Popover } from "@/components/wb/Popover";
import { IconPicker } from "@/components/IconPicker";
import { ColorPicker } from "@/components/ColorPicker";
import { Select } from "@/components/Select";
import { SubTile } from "@/components/SubTile";
import { TagChip } from "@/components/TagChip";
import { registerSubscriptionEditor } from "@/lib/modals";
import { confirm } from "@/lib/confirm";
import type { SubInterval } from "@/types";

export function SubscriptionEditor() {
  const { categories, tags, subscriptions } = useCashy();
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
  const [startedAt, setStartedAt] = useState(todayYMD());
  // Shared / family plan: the whole price + how many split it; `amount` is the
  // user's own share.
  const [shared, setShared] = useState(false);
  const [fullAmountStr, setFullAmountStr] = useState("");
  const [membersStr, setMembersStr] = useState("2");
  // Prorated first cycle when joining mid-period.
  const [prorate, setProrate] = useState(false);
  const [firstAmountStr, setFirstAmountStr] = useState("");

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
      setStartedAt(sub?.startedAt ?? todayYMD());
      setShared((sub?.members ?? 0) > 1 || sub?.fullAmount != null);
      setFullAmountStr(sub?.fullAmount != null ? String(sub.fullAmount) : "");
      setMembersStr(sub?.members != null ? String(sub.members) : "2");
      setProrate(sub?.firstCycleAmount != null);
      setFirstAmountStr(sub?.firstCycleAmount != null ? String(sub.firstCycleAmount) : "");
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
  const catOptions = useMemo(() => flattenTree(categories, "expense"), [categories]);
  const canSave = name.trim() !== "" && amount > 0;

  // Live proration suggestion for the first cycle (null when nothing to prorate —
  // joined on/before the billing anchor). Drives the "Kỳ đầu" hint + default.
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
      // Only carried for yearly plans; a monthly one has no billing month.
      monthOfYear: interval === "yearly" ? Math.min(12, Math.max(1, monthOfYear || 1)) : undefined,
      categoryId,
      tagIds,
      colorHex: color,
      icon,
      note: note.trim(),
      startedAt,
      // Shared-plan totals (kept only while the toggle is on) + the prorated
      // first charge. Undefined clears them on edit when a toggle is switched off.
      fullAmount: shared && fullAmount > 0 ? fullAmount : undefined,
      members: shared ? members : undefined,
      firstCycleAmount,
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
              await confirm({
                title: "Xoá đăng ký này?",
                message: "Các giao dịch đã ghi vẫn được giữ lại.",
                confirmLabel: "Xoá",
                danger: true,
              })
            ) {
              deleteSubscription(editingId);
              setOpen(false);
            }
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
        <button type="button" className="wb-btn" onClick={save} disabled={!canSave}>
          {editingId ? "Lưu" : "Thêm"}
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title={editingId ? "Sửa đăng ký" : "Thêm đăng ký"}
      footer={footer}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="wb-field">
          <label className="wb-label" htmlFor="sub-name">
            Tên dịch vụ
          </label>
          <input
            id="sub-name"
            className="wb-input"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Netflix, YouTube Premium"
          />
        </div>

        {/* Billing interval — decides whether the date below is a day of the
            month or a full "ngày a tháng b" date. */}
        <div className="wb-field">
          <label className="wb-label">Chu kỳ thanh toán</label>
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
                {iv === "monthly" ? "Hàng tháng" : "Hàng năm"}
              </button>
            ))}
          </div>
        </div>

        <div className="wb-cluster wb-cluster--nowrap wb-cluster--stretch" style={{ gap: 12 }}>
          <div className="wb-field" style={{ flex: 2 }}>
            <label className="wb-label" htmlFor="sub-amount">
              {shared ? "Phần của bạn" : "Số tiền"} / {interval === "yearly" ? "năm" : "tháng"}
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
              {interval === "yearly" ? "Ngày" : "Ngày trong tháng"}
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
                Tháng
              </label>
              <Select
                id="sub-month"
                value={monthOfYear}
                onChange={(e) => setMonthOfYear(Number(e.target.value))}
              >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Tháng {i + 1}
                    </option>
                  ))}
              </Select>
            </div>
          )}
        </div>
        {interval === "yearly" && (
          <span className="wb-help" style={{ marginTop: -8 }}>
            Thu phí ngày {Math.min(31, Math.max(1, dayOfMonth || 1))} tháng{" "}
            {Math.min(12, Math.max(1, monthOfYear || 1))} hàng năm.
          </span>
        )}

        {/* Shared / family plan — record the WHOLE price and how many split it, so
            the data mirrors reality; the amount above stays your own share. */}
        <div className="wb-field">
          <label className="wb-check" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
            <span>Gói chia sẻ / gia đình (dùng chung nhiều người)</span>
          </label>
          {shared && (
            <>
              <div
                className="wb-cluster wb-cluster--nowrap wb-cluster--stretch"
                style={{ gap: 12, marginTop: 10 }}
              >
                <div className="wb-field" style={{ flex: 2 }}>
                  <label className="wb-label" htmlFor="sub-full">
                    Giá gói đầy đủ / {interval === "yearly" ? "năm" : "tháng"}
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
                    Số người
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
                  Chia đều cho {members} người
                </button>
                {fullAmount > 0 && (
                  <span className="wb-help" style={{ margin: 0 }}>
                    Phần của bạn: <strong>{formatMoney(amount)}</strong> · gói{" "}
                    {formatMoney(fullAmount)}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="wb-field">
          <label className="wb-label" htmlFor="sub-start">
            Ngày bắt đầu đăng ký
          </label>
          <input
            id="sub-start"
            className="wb-input"
            type="date"
            value={startedAt}
            onChange={(e) => setStartedAt(e.target.value)}
          />
          <span className="wb-help">Không tính phí cho bất kỳ tháng nào trước ngày này.</span>
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
              <span>Kỳ đầu tính theo số ngày dùng (tham gia giữa kỳ)</span>
            </label>
            {prorate && (
              <div style={{ marginTop: 10 }}>
                <label className="wb-label" htmlFor="sub-first">
                  Số tiền kỳ đầu
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
                  Gợi ý {formatMoney(pro.amount)} — {pro.days}/{pro.total} ngày của kỳ đầu. Các kỳ
                  sau vẫn {formatMoney(amount)}.
                </span>
              </div>
            )}
          </div>
        )}

        <div className="wb-field">
          <label className="wb-label" htmlFor="sub-cat">
            Danh mục
          </label>
          <Select
            id="sub-cat"
            value={categoryId ?? "none"}
            onChange={(e) => setCategoryId(e.target.value === "none" ? null : e.target.value)}
          >
              <option value="none">Chưa phân loại</option>
              {catOptions.map(({ cat, depth }) => (
                <option key={cat.id} value={cat.id}>
                  {"  ".repeat(depth) + cat.name}
                </option>
              ))}
          </Select>
        </div>

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
            <label className="wb-label">Biểu tượng &amp; màu</label>
            <SubTile icon={icon} colorHex={color} brand iconSize={20} />
          </div>
          <div className="wb-field" style={{ flex: 1, minWidth: 0 }}>
            <label className="wb-label" style={{ visibility: "hidden" }}>
              Màu
            </label>
            <ColorPicker value={color} onChange={setColor} />
            <div style={{ marginTop: 8 }}>
              <IconPicker value={icon} onChange={setIcon} />
            </div>
          </div>
        </div>

        <div className="wb-field">
          <label className="wb-label" htmlFor="sub-note">
            Ghi chú
          </label>
          <textarea
            id="sub-note"
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
