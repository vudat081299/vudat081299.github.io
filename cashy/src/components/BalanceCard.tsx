import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { Sparkline } from "@/components/Sparkline";

type Tone = "neutral" | "income" | "expense";

// Income/expense amounts carry status meaning, so they earn a status hue; the
// neutral KPI stays ink. Delta always follows its own up/down colour.
const toneColor: Record<Tone, string | undefined> = {
  neutral: undefined,
  income: "var(--wb-success-text)",
  expense: "var(--wb-danger-text)",
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
  const color = toneColor[tone];
  return (
    <div className="wb-stat">
      <div className="wb-stat__top">
        <span className="wb-stat__label">{label}</span>
        {hasDelta && (
          <span
            className={cn(
              "wb-stat__delta",
              up ? "wb-stat__delta--up" : "wb-stat__delta--down",
            )}
            style={{ marginLeft: "auto" }}
          >
            {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(Math.round((delta ?? 0) * 100))}%
          </span>
        )}
      </div>
      <div className="wb-stat__value" style={color ? { color } : undefined}>
        {formatMoney(amount)}
      </div>
      {spark && spark.length > 1 && (
        <div style={{ marginTop: 8, marginInline: -2 }}>
          <Sparkline
            data={spark}
            color={sparkColor ?? color ?? "var(--wb-neutral-strong)"}
          />
        </div>
      )}
    </div>
  );
}
