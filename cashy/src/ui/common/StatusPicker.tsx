import type { TxStatus } from "@/domain/types";
import { TX_STATUS_META, TX_STATUS_ORDER } from "@/domain/txStatus";
import { cn } from "@/lib/utils";

/**
 * Pick a transaction status by clicking the capsule you mean, rather than
 * hunting through a dropdown. Five options is well under the count where a
 * select starts to earn its keep, and the status vocabulary is *already* a
 * capsule everywhere else it appears (the table's Trạng thái column, the filter
 * bar) — so picking one should look like the thing you are picking.
 *
 * Only the CHOSEN capsule spends its tone. The rest sit neutral and muted, so a
 * form does not turn into five competing colours; the selected one also carries
 * a ring, which is what distinguishes "Skipped" (a neutral tone by design) when
 * it is the active choice.
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
    <div className="cashy-statuspick" role="radiogroup" aria-label="Trạng thái">
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
            {/* Chosen = filled. Toned statuses fill themselves via the kit's
                tone class; `Skipped` has no tone, so it gets an explicit
                neutral fill — otherwise the chosen one would be
                indistinguishable from the four it was chosen over. */}
            <span className={cn("wb-cap", active && (meta.cap || "cashy-cap--chosen-plain"))}>
              {meta.dot && <span className="wb-cap__dot" />}
              {meta.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
