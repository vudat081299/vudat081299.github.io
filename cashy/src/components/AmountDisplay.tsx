import { cn } from "@/lib/utils";
import { formatMoney, signedMoney } from "@/lib/money";
import type { TxType } from "@/types";

/**
 * The single way money is rendered in the UI. Numbers use the body sans with
 * tabular figures — Notion keeps one typeface, so no mono. Color follows sign.
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
  const color = !tone
    ? undefined
    : type === "income"
      ? "text-income"
      : type === "expense"
        ? "text-expense"
        : undefined;
  return (
    <span className={cn("tnum tracking-tight", color, className)}>{text}</span>
  );
}
