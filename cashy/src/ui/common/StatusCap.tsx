import { cn } from "@/lib/utils";
import type { Transaction } from "@/domain/types";
import { statusOf, TX_STATUS_META } from "@/domain/txStatus";

/** The Trạng thái cell — a tone capsule (green/amber/blue/grey/red) per the docs. */
export function StatusCap({ tx }: { tx: Transaction }) {
  const meta = TX_STATUS_META[statusOf(tx)];
  return (
    <span className={cn("wb-cap", meta.cap)}>
      {meta.dot && <span className="wb-cap__dot" />}
      {meta.label}
    </span>
  );
}
