import type { CSSProperties } from "react";
import type { SubState } from "@/domain";
import type { SubFilter } from "@/ui/features/subscriptions/useSubFilter";
import { cn } from "@/lib/utils";
import { FacetChip } from "@/ui/common/FacetChip";
import { SearchField } from "@/ui/common/SearchField";

/**
 * The subscriptions filter bar — the transaction bar's twin (`TxFilterBar`), so a
 * filtered screen speaks the same chip language everywhere: a seamless search,
 * then a Status and a Wallet facet (dashed when unselected, solid when applied),
 * then the two sort capsules pushed to the far right. Presentational: it drives a
 * `useSubFilter` instance handed in as `f`.
 *
 * The sort capsules are a three-state toggle rather than a dropdown: one click
 * sorts (leading arrow shows the direction), a second reverses, a third returns
 * to the default "by status" order. Only one sort key is ever active.
 */

// Each status option wears the same capsule tone as the card's own status pill,
// so "Payment due" reads amber here exactly as it does on the card.
const STATUS_OPTS: { key: SubState; label: string; cap: string; dot: boolean }[] = [
  { key: "due", label: "Payment due", cap: "wb-cap--warning", dot: true },
  { key: "trial", label: "Free trial", cap: "wb-cap--info", dot: true },
  { key: "active", label: "Active", cap: "wb-cap--success", dot: true },
  { key: "suspended", label: "Suspended", cap: "wb-cap--danger", dot: true },
  { key: "cancelled", label: "Cancelled", cap: "", dot: false },
];
const STATUS_LABEL: Record<SubState, string> = {
  due: "Payment due",
  trial: "Free trial",
  active: "Active",
  suspended: "Suspended",
  cancelled: "Cancelled",
};

function SortChip({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  // Inactive shows the neutral up/down double arrow ("sortable"); active swaps in
  // the concrete direction so the chosen order is legible.
  const icon = !active ? "unfold_more" : dir === "asc" ? "arrow_upward" : "arrow_downward";
  return (
    <button
      type="button"
      className={cn("cashy-facet cashy-sortchip", active && "cashy-facet--active")}
      aria-pressed={active}
      onClick={onClick}
    >
      <span className="wb-ico wb-ico--xs">{icon}</span>
      <span className="cashy-facet__label">{label}</span>
    </button>
  );
}

export function SubFilterBar({ f }: { f: SubFilter }) {
  return (
    <div className="wb-filterbar cashy-subfilter">
      <SearchField
        value={f.query}
        onChange={f.setQuery}
        placeholder="Search subscriptions…"
        className="cashy-subfilter__search"
      />

      <FacetChip
        label="Status"
        value={f.status ? STATUS_LABEL[f.status] : ""}
        active={f.status != null}
        panelWidth={210}
        onClear={() => f.setStatus(null)}
      >
        {({ close }) => (
          <div className="wb-menu cashy-facet-pop" style={{ border: 0, boxShadow: "none" }}>
            <div className="wb-stack" style={{ "--wb-stack-gap": "1px" } as CSSProperties}>
              <label className="wb-radio wb-menu__item">
                <input
                  type="radio"
                  name="cashy-substatus"
                  checked={f.status == null}
                  onChange={() => {
                    f.setStatus(null);
                    close();
                  }}
                />
                All
              </label>
              {STATUS_OPTS.map((o) => (
                <label key={o.key} className="wb-radio wb-menu__item">
                  <input
                    type="radio"
                    name="cashy-substatus"
                    checked={f.status === o.key}
                    onChange={() => {
                      f.setStatus(o.key);
                      close();
                    }}
                  />
                  <span className={cn("wb-cap", o.cap)}>
                    {o.dot && <span className="wb-cap__dot" />}
                    {o.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </FacetChip>

      {f.walletOptions.length > 0 && (
        <FacetChip
          label="Wallet"
          value={f.walletId ? (f.walletOptions.find((w) => w.id === f.walletId)?.name ?? "?") : ""}
          active={f.walletId != null}
          panelWidth={220}
          onClear={() => f.setWallet(null)}
        >
          {({ close }) => (
            <div className="wb-menu cashy-facet-pop" style={{ border: 0, boxShadow: "none" }}>
              <div
                className="wb-stack wb-scroll-y"
                style={{ "--wb-stack-gap": "1px", maxHeight: 220 } as CSSProperties}
              >
                <label className="wb-radio wb-menu__item">
                  <input
                    type="radio"
                    name="cashy-subwallet"
                    checked={f.walletId == null}
                    onChange={() => {
                      f.setWallet(null);
                      close();
                    }}
                  />
                  All wallets
                </label>
                {f.walletOptions.map((w) => (
                  <label key={w.id} className="wb-radio wb-menu__item">
                    <input
                      type="radio"
                      name="cashy-subwallet"
                      checked={f.walletId === w.id}
                      onChange={() => {
                        f.setWallet(w.id);
                        close();
                      }}
                    />
                    {w.name}
                    {w.archived && <span style={{ color: "var(--wb-fg-muted)" }}> · archived</span>}
                  </label>
                ))}
              </div>
            </div>
          )}
        </FacetChip>
      )}

      {/* Sort capsules float to the far right (see `.cashy-subfilter__sort`). */}
      <div className="cashy-subfilter__sort">
        <SortChip
          label="Price"
          active={f.sort.key === "price"}
          dir={f.sort.key === "price" ? f.sort.dir : "desc"}
          onClick={() => f.cycleSort("price")}
        />
        <SortChip
          label="Days left"
          active={f.sort.key === "days"}
          dir={f.sort.key === "days" ? f.sort.dir : "asc"}
          onClick={() => f.cycleSort("days")}
        />
        {f.hasTokens && (
          <button type="button" className="cashy-facet-clear" onClick={f.clearTokens}>
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
