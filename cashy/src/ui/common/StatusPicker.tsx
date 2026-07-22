import type { TxStatus } from "@/domain/types";
import { TX_STATUS_META, TX_STATUS_ORDER } from "@/domain/txStatus";
import { cn } from "@/lib/utils";

/** Each status's tone, so an UNSELECTED capsule can still hint its colour with a
 *  soft outline. Skipped is neutral by design (grey), matching the table. */
const TONE: Record<TxStatus, string> = {
  recorded: "success",
  pending: "warning",
  awaiting: "info",
  skipped: "neutral",
  failed: "danger",
};

/**
 * Pick a transaction status by clicking the capsule you mean, rather than
 * hunting through a dropdown. Five options is well under the count where a
 * select starts to earn its keep, and the status vocabulary is *already* a
 * capsule everywhere else it appears (the table's Trạng thái column, the filter
 * bar) — so picking one should look like the thing you are picking.
 *
 * Each option wears its status colour even unselected — but as a SOFT outline
 * (tier 3), so the row reads as five muted hints, not five competing fills. The
 * CHOSEN one fills with its full tone via the kit's `--success/--warning/…`
 * class; `Skipped` has no tone, so chosen-skipped falls back to the plain grey
 * `wb-cap` — deliberately identical to how a skipped row looks in the table.
 *
 * Real radio inputs, visually hidden: that buys keyboard arrow-key navigation,
 * focus handling and screen-reader semantics for free.
 */
export function StatusPicker({
  value,
  onChange,
  name = "tx-status",
}: {
  value: TxStatus;
  onChange: (s: TxStatus) => void;
  /** radio group name — only matters if two pickers are ever on one screen */
  name?: string;
}) {
  return (
    <div className="cashy-statuspick" role="radiogroup" aria-label="Status">
      {TX_STATUS_ORDER.map((s) => {
        const meta = TX_STATUS_META[s];
        const active = value === s;
        return (
          <label key={s} className="cashy-statuspick__opt">
            <input
              type="radio"
              name={name}
              value={s}
              checked={active}
              onChange={() => onChange(s)}
            />
            {/* Chosen = filled with the tone (or plain grey for skipped, the
                table's look). Unselected = soft tone outline, driven by
                `data-tone` in CSS. */}
            <span className={cn("wb-cap", active && meta.cap)} data-tone={TONE[s]}>
              {meta.dot && <span className="wb-cap__dot" />}
              {meta.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
