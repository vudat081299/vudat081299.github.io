import { cn } from "@/lib/utils";
import { formatMoney, signedMoney } from "@/lib/money";
import type { TxType } from "@/types";

/**
 * The single way money is rendered in the UI. Numbers are mono + tabular
 * (they are the hero of this design). Color follows the transaction sign.
 */
export function AmountDisplay({
  amount,
  type,
  signed = false,
  mono = true,
  tone = true,
  className,
}: {
  amount: number;
  type?: TxType;
  signed?: boolean;
  mono?: boolean;
  tone?: boolean;
  className?: string;
}) {
  const text = signed && type ? signedMoney(amount, type) : formatMoney(amount);
  const color = !tone
    ? undefined
    : type === "income"
      ? "text-income"
      : type === "expense"
        ? "text-expense"
        : undefined;
  return (
    <span className={cn(mono && "font-mono tnum tracking-tight", color, className)}>
      {text}
    </span>
  );
}
