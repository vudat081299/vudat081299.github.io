import type { ComponentProps } from "react";
import { OTHER_SLICE_ID } from "@/domain";
import { formatMoney } from "@/domain/money";
import { formatPercent } from "@/domain/format";
import { ScrollArea } from "@/ui/kit/ScrollArea";
import { SpendChart } from "@/ui/features/dashboard/SpendChart";
import { Card } from "@/ui/kit/Card";

export function CategoryBreakdownCard({
  slices,
  total,
  selectedCat,
  setSelectedCat,
  maxSlice,
}: {
  slices: ComponentProps<typeof SpendChart>["slices"];
  total: number;
  selectedCat: string | null;
  setSelectedCat: (id: string | null) => void;
  maxSlice: number;
}) {
  return (
        <Card>
          <div className="wb-card__body">
            <span className="cashy-card-eyebrow">Breakdown</span>
            <h3 className="cashy-card-title" style={{ marginBottom: 14 }}>
              Spending by category
            </h3>
            <SpendChart
              slices={slices}
              total={total}
              size={168}
              selectedId={selectedCat}
              onSelect={setSelectedCat}
            />
            {/* EVERY category in the period is listed (not just the top few); each
                row toggles its slice on the donut. Themed scroll container so a
                long list scrolls under the kit's thin scrollbar, not the OS one. */}
            <ScrollArea className="cashy-rank" style={{ marginTop: 18 }}>
              {slices.map((s) => {
                const on = s.id === selectedCat;
                const dim = selectedCat !== null && !on;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={
                      "cashy-rank__row" +
                      (on ? " cashy-rank__row--active" : "") +
                      (dim ? " cashy-rank__row--dim" : "")
                    }
                    onClick={() => setSelectedCat(on ? null : s.id)}
                  >
                    <div className="cashy-rank__head">
                      <span className="cashy-dot cashy-dot--sm" style={{ background: s.colorHex }} />
                      <span className="cashy-rank__name">
                        {s.name}
                        {s.id === OTHER_SLICE_ID && s.count
                          ? ` · ${s.count} categories`
                          : ""}
                      </span>
                      <span className="wb-num cashy-rank__amt">{formatMoney(s.total)}</span>
                      <span className="wb-num cashy-rank__val">{formatPercent(s.pct)}</span>
                    </div>
                    <div className="wb-progress">
                      <div
                        className="wb-progress__bar"
                        style={{
                          width: `${Math.max(4, (s.pct / maxSlice) * 100)}%`,
                          // full category hue, matching its donut slice (web-builder
                          // ranked bars use the bright chart colour, not a soft tint)
                          background: s.colorHex,
                        }}
                      />
                    </div>
                  </button>
                );
              })}
              {slices.length === 0 && (
                <p style={{ fontSize: 13, color: "var(--wb-fg-muted)", margin: 0 }}>
                  No spending in this period.
                </p>
              )}
            </ScrollArea>
          </div>
        </Card>
  );
}
