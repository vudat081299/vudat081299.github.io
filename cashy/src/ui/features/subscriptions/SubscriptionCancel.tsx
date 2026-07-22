import { useEffect, useState } from "react";
import type { Subscription } from "@/domain/types";
import { cycleDate } from "@/domain";
import { fmtDateShort, monthLabelShort, todayYMD } from "@/domain/date";
import { Modal } from "@/ui/kit/Modal";
import { DatePicker } from "@/ui/common/DatePicker";

/**
 * Cancelling a subscription, with the one fact that makes the rest of the app
 * behave: WHEN it stopped.
 *
 * Without a date, Cashy keeps raising a charge every cycle until the user
 * notices, and they then have to clear a pile of phantom "unpaid" months by hand.
 * Asking here — defaulted to today, which is what most cancellations mean — lets
 * those cycles be retired at the source. Cycles that billed before the date are
 * left alone and stay owed: the service really was running then.
 *
 * A dedicated dialog rather than the shared `confirm()` because that one takes
 * text only, and this question needs a date field and a live count of what the
 * choice will drop.
 */
export function SubscriptionCancel({
  sub,
  pending,
  open,
  onClose,
  onCancel,
}: {
  sub: Subscription;
  /** the owed cycles, oldest first */
  pending: { month: string; txId: string }[];
  open: boolean;
  onClose: () => void;
  onCancel: (cancelledAt: string) => void;
}) {
  const [date, setDate] = useState(todayYMD());
  useEffect(() => {
    if (open) setDate(todayYMD());
  }, [open]);

  // What the chosen date does to the cycles currently standing unpaid.
  const dropped = pending.filter((p) => cycleDate(sub, p.month) >= date);
  const kept = pending.length - dropped.length;
  // Cancelling from the first unpaid cycle is the other common shape: "I stopped
  // using it back when I stopped paying for it."
  const firstOwed = pending[0];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Cancel the ${sub.name} subscription?`}
      maxWidth={440}
      footer={
        <>
          <button
            type="button"
            className="wb-btn wb-btn--ghost wb-btn--sm"
            style={{ marginRight: "auto" }}
            onClick={onClose}
          >
            Keep it
          </button>
          <button
            type="button"
            className="wb-btn wb-btn--danger wb-btn--sm"
            onClick={() => {
              onCancel(date);
              onClose();
            }}
          >
            Cancel subscription
          </button>
        </>
      }
    >
      <p className="cashy-catchup__lead">
        The service won't create new cycles anymore. Cycles already recorded stay in your spending
        history, and you can resume the subscription anytime.
      </p>

      <label className="wb-label">Stopped using on</label>
      <DatePicker value={date} onChange={setDate} />

      <div className="wb-cluster" style={{ gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        <button type="button" className="cashy-tag-add" onClick={() => setDate(todayYMD())}>
          Today
        </button>
        {firstOwed && (
          <button
            type="button"
            className="cashy-tag-add"
            onClick={() => setDate(cycleDate(sub, firstOwed.month))}
          >
            From {monthLabelShort(firstOwed.month)}
          </button>
        )}
      </div>

      {/* Spell out the consequence rather than making the user infer it from a
          date — this is the whole reason the dialog asks. */}
      {pending.length > 0 && (
        <p className="cashy-catchup__note">
          {dropped.length > 0 && (
            <>
              {dropped.length} unsettled cycles (from {monthLabelShort(dropped[0].month)}) will be
              removed because the service wasn't running during those cycles.
            </>
          )}
          {dropped.length > 0 && kept > 0 && " "}
          {kept > 0 && (
            <>
              {kept} cycles before {fmtDateShort(date)} remain owed — you used the service during
              those cycles.
            </>
          )}
        </p>
      )}
    </Modal>
  );
}
