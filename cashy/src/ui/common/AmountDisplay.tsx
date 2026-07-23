import { cn } from "@/lib/utils";
import { formatMoney, formatMoneyShort, signedMoney } from "@/domain/money";
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
  positive = false,
  short = false,
  className,
}: {
  amount: number;
  type?: TxType;
  signed?: boolean;
  tone?: boolean;
  /** Render red — for a genuine problem, not merely for an expense. */
  negative?: boolean;
  /** Render green — a real inflow / asset (e.g. money owed to you), the way
   *  income already reads, without having to fake a `type`. */
  positive?: boolean;
  /** Compact magnitude form (`334,1m`, no `đ`) for glance summaries — see
   *  `formatMoneyShort`. Ignores `signed`/`type`. */
  short?: boolean;
  className?: string;
}) {
  let text: string;
  if (short) {
    text = formatMoneyShort(amount);
  } else if (signed && type) {
    text = signedMoney(amount, type);
  } else {
    text = formatMoney(amount);
  }
  let toneClass: string | undefined;
  if (!tone) {
    toneClass = undefined;
  } else if (negative) {
    toneClass = "wb-num--neg";
  } else if (positive || type === "income") {
    toneClass = "wb-num--pos";
  } else {
    toneClass = "wb-num--strong";
  }
  return <span className={cn("wb-num", toneClass, className)}>{text}</span>;
}
