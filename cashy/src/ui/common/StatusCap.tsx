import type { Transaction } from "@/domain/types";
import { statusOf, TX_STATUS_META } from "@/domain/txStatus";
import { Capsule } from "@/ui/kit/Capsule";

/** The Trạng thái cell — a tone capsule (green/amber/blue/grey/red) per the docs. */
export function StatusCap({ tx }: { tx: Transaction }) {
  const meta = TX_STATUS_META[statusOf(tx)];
  return (
    <Capsule className={meta.cap} dot={meta.dot}>
      {meta.label}
    </Capsule>
  );
}
