import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { Sparkline } from "@/components/Sparkline";

type Tone = "neutral" | "income" | "expense";

const toneColor: Record<Tone, string> = {
  neutral: "text-foreground",
  income: "text-income",
  expense: "text-expense",
};

export function BalanceCard({
  label,
  amount,
  tone = "neutral",
  delta,
  spark,
  sparkColor,
}: {
  label: string;
  amount: number;
  tone?: Tone;
  /** fractional change vs previous period, e.g. 0.12 = +12% */
  delta?: number | null;
  spark?: number[];
  sparkColor?: string;
}) {
  const hasDelta = delta !== undefined && delta !== null && isFinite(delta);
  const up = (delta ?? 0) >= 0;
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-3.5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {hasDelta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-[4px] px-1 py-px text-[11px] font-medium tnum",
              up ? "text-income" : "text-expense",
            )}
          >
            {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(Math.round((delta ?? 0) * 100))}%
          </span>
        )}
      </div>
      <div
        className={cn(
          "text-[22px] font-semibold leading-none tracking-tight tnum",
          toneColor[tone],
        )}
      >
        {formatMoney(amount)}
      </div>
      {spark && spark.length > 1 && (
        <div className="-mx-1 -mb-1 mt-0.5">
          <Sparkline data={spark} color={sparkColor ?? "hsl(var(--brand))"} />
        </div>
      )}
    </div>
  );
}
