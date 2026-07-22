import { cn } from "@/lib/utils";
import { formatMoney, signedMoney } from "@/domain/money";
import type { TxType } from "@/domain/types";

/**
 * The single way money is rendered in the UI. `.wb-num` gives tabular figures in
 * the UI sans (not mono).
 *
 * Colour follows the ladder (§1), NOT the sign: real money in is green
 * (`wb-num--pos`), while ordinary spending stays **neutral bold**
 * (`wb-num--strong`) — "đừng phản xạ tô mọi khoản chi đỏ". Red is reserved for a
 * real problem (over budget, a negative net), which callers opt into with
 * `negative`, so that when red does appear it still means something.
 */
export function AmountDisplay({
  amount,
  type,
  signed = false,
  tone = true,
  negative = false,
  className,
}: {
  amount: number;
  type?: TxType;
  signed?: boolean;
  tone?: boolean;
  /** Render red — for a genuine problem, not merely for an expense. */
  negative?: boolean;
  className?: string;
}) {
  const text = signed && type ? signedMoney(amount, type) : formatMoney(amount);
  const toneClass = !tone
    ? undefined
    : negative
      ? "wb-num--neg"
      : type === "income"
        ? "wb-num--pos"
        : "wb-num--strong";
  return <span className={cn("wb-num", toneClass, className)}>{text}</span>;
}
