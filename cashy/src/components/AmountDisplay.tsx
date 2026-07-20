import { cn } from "@/lib/utils";
import { formatMoney, signedMoney } from "@/lib/money";
import type { TxType } from "@/types";

/**
 * The single way money is rendered in the UI. `.wb-num` gives tabular figures in
 * the UI sans (not mono); colour follows sign via the status tokens
 * (income = wb-num--pos green, expense = wb-num--neg red).
 */
export function AmountDisplay({
  amount,
  type,
  signed = false,
  tone = true,
  className,
}: {
  amount: number;
  type?: TxType;
  signed?: boolean;
  tone?: boolean;
  className?: string;
}) {
  const text = signed && type ? signedMoney(amount, type) : formatMoney(amount);
  const toneClass = !tone
    ? undefined
    : type === "income"
      ? "wb-num--pos"
      : type === "expense"
        ? "wb-num--neg"
        : undefined;
  return <span className={cn("wb-num", toneClass, className)}>{text}</span>;
}
