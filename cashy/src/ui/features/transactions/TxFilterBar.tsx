import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { Category, TxType, Wallet } from "@/domain/types";
import { flattenTree, type TagRank } from "@/domain";
import type { TxQuery } from "@/ui/features/transactions/useTxQuery";
import { TX_STATUS_META, TX_STATUS_ORDER } from "@/domain/txStatus";
import { formatMoneyAxis } from "@/domain/money";
import { cn } from "@/lib/utils";
import { TagChip } from "@/ui/common/TagChip";
import { FacetChip } from "@/ui/common/FacetChip";
import { SearchField } from "@/ui/common/SearchField";

const TYPES: { key: TxType; label: string }[] = [
  { key: "expense", label: "Expense" },
  { key: "income", label: "Income" },
];

/** digits-only → integer đồng, or null for an empty field. */
function parseAmt(s: string): number | null {
  const d = s.replace(/[^\d]/g, "");
  return d ? parseInt(d, 10) : null;
}

/**
 * The shared transaction filter bar. Rather than one "Add filter" popover holding
 * every facet, each facet — Type, Status, Category, Amount, Tags — is its OWN
 * dropdown chip, so a busy query reads as a row of discrete, individually-editable
 * controls. Scopes stay neutral (§1); only the type chip is called out with a
 * black outline, and the status options keep their own tones.
 */
export function TxFilterBar({
  q,
  tagRanks,
  categories,
  wallets = [],
}: {
  q: TxQuery;
  /** tags already ordered most-used first (see `rankTags`) */
  tagRanks: TagRank[];
  categories: Category[];
  wallets?: Wallet[];
}) {
  const rankById = useMemo(() => new Map(tagRanks.map((r) => [r.tag.id, r])), [tagRanks]);
  const catFlat = useMemo(() => flattenTree(categories), [categories]);
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const walletOptions = useMemo(
    () => [...wallets].sort((a, b) => Number(a.archived) - Number(b.archived) || a.order - b.order),
    [wallets],
  );
  const walletById = useMemo(() => new Map(wallets.map((w) => [w.id, w])), [wallets]);
  const typeLabel = TYPES.find((t) => t.key === q.type)?.label;

  // Amount inputs live-drive the query; an external clear (chip ×, "clear all")
  // flows back so the fields empty out with it.
  const [minText, setMinText] = useState("");
  const [maxText, setMaxText] = useState("");
  useEffect(() => {
    if (q.amountMin == null) setMinText("");
  }, [q.amountMin]);
  useEffect(() => {
    if (q.amountMax == null) setMaxText("");
  }, [q.amountMax]);

  const summarise = (labels: string[]) =>
    labels.length <= 1 ? (labels[0] ?? "") : `${labels[0]} +${labels.length - 1}`;
  const statusToken = summarise(q.statuses.map((s) => TX_STATUS_META[s].label));
  const catToken = summarise(q.catIds.map((id) => catById.get(id)?.name ?? "?"));
  const tagToken = summarise(q.activeTags.map((id) => rankById.get(id)?.tag.name ?? "?"));
  const amountToken =
    q.amountMin != null && q.amountMax != null
      ? `${formatMoneyAxis(q.amountMin)} – ${formatMoneyAxis(q.amountMax)}`
      : q.amountMin != null
        ? `≥ ${formatMoneyAxis(q.amountMin)}`
        : q.amountMax != null
          ? `≤ ${formatMoneyAxis(q.amountMax)}`
          : "";

  return (
    <div className="wb-filterbar">
      <SearchField
        value={q.search}
        onChange={q.setSearch}
        placeholder="Search transactions…"
        className="wb-filterbar__search"
      />

      {/* One chip per facet, each its own dropdown. */}
      <FacetChip
        label="Type"
        value={typeLabel}
        active={q.type !== "all"}
        accent
        panelWidth={200}
        onClear={() => q.setType("all")}
      >
        <div className="wb-menu cashy-facet-pop" style={{ border: 0, boxShadow: "none" }}>
          <div className="wb-stack" style={{ "--wb-stack-gap": "1px" } as CSSProperties}>
            <label className="wb-radio wb-menu__item">
              <input
                type="radio"
                name="cashy-type"
                checked={q.type === "all"}
                onChange={() => q.setType("all")}
              />
              All
            </label>
            {TYPES.map((t) => (
              <label key={t.key} className="wb-radio wb-menu__item">
                <input
                  type="radio"
                  name="cashy-type"
                  checked={q.type === t.key}
                  onChange={() => q.setType(t.key)}
                />
                {t.label}
              </label>
            ))}
          </div>
        </div>
      </FacetChip>

      <FacetChip
        label="Status"
        value={statusToken}
        active={q.statuses.length > 0}
        panelWidth={220}
        onClear={() => q.statuses.forEach((s) => q.toggleStatus(s))}
      >
        <div className="wb-menu cashy-facet-pop" style={{ border: 0, boxShadow: "none" }}>
          <div className="wb-stack" style={{ "--wb-stack-gap": "1px" } as CSSProperties}>
            {TX_STATUS_ORDER.map((s) => {
              const meta = TX_STATUS_META[s];
              return (
                <label key={s} className="wb-check wb-menu__item">
                  <input
                    type="checkbox"
                    checked={q.statuses.includes(s)}
                    onChange={() => q.toggleStatus(s)}
                  />
                  <span className={cn("wb-cap", meta.cap)}>
                    {meta.dot && <span className="wb-cap__dot" />}
                    {meta.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </FacetChip>

      {catFlat.length > 0 && (
        <FacetChip
          label="Category"
          value={catToken}
          active={q.catIds.length > 0}
          panelWidth={248}
          onClear={() => q.catIds.forEach((id) => q.toggleCat(id))}
        >
          <div className="wb-menu cashy-facet-pop" style={{ border: 0, boxShadow: "none" }}>
            <div
              className="wb-stack wb-scroll-y"
              style={{ "--wb-stack-gap": "1px", maxHeight: 220 } as CSSProperties}
            >
              {catFlat.map(({ cat, depth }) => (
                <label key={cat.id} className="wb-check wb-menu__item">
                  <input
                    type="checkbox"
                    checked={q.catIds.includes(cat.id)}
                    onChange={() => q.toggleCat(cat.id)}
                  />
                  <span style={{ paddingLeft: depth * 14 }}>{cat.name}</span>
                </label>
              ))}
            </div>
          </div>
        </FacetChip>
      )}

      {walletOptions.length > 0 && (
        <FacetChip
          label="Wallet"
          value={q.walletId ? (walletById.get(q.walletId)?.name ?? "?") : ""}
          active={q.walletId != null}
          panelWidth={220}
          onClear={() => q.setWallet(null)}
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
                    name="cashy-wallet"
                    checked={q.walletId == null}
                    onChange={() => {
                      q.setWallet(null);
                      close();
                    }}
                  />
                  All wallets
                </label>
                {walletOptions.map((w) => (
                  <label key={w.id} className="wb-radio wb-menu__item">
                    <input
                      type="radio"
                      name="cashy-wallet"
                      checked={q.walletId === w.id}
                      onChange={() => {
                        q.setWallet(w.id);
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

      <FacetChip
        label="Amount"
        value={amountToken}
        active={q.amountMin != null || q.amountMax != null}
        panelWidth={248}
        onClear={() => q.setAmountRange(null, null)}
      >
        <div className="wb-menu cashy-facet-pop" style={{ border: 0, boxShadow: "none" }}>
          <p className="wb-filter-pop__title">Amount (₫)</p>
          <div className="cashy-amount-range">
            <input
              className="wb-input"
              inputMode="numeric"
              value={minText}
              onChange={(e) => {
                setMinText(e.target.value);
                q.setAmountRange(parseAmt(e.target.value), q.amountMax);
              }}
              placeholder="From"
              aria-label="Amount from"
            />
            <span className="cashy-amount-range__dash">–</span>
            <input
              className="wb-input"
              inputMode="numeric"
              value={maxText}
              onChange={(e) => {
                setMaxText(e.target.value);
                q.setAmountRange(q.amountMin, parseAmt(e.target.value));
              }}
              placeholder="To"
              aria-label="Amount to"
            />
          </div>
        </div>
      </FacetChip>

      {tagRanks.length > 0 && (
        <FacetChip
          label="Tags"
          value={tagToken}
          active={q.activeTags.length > 0}
          panelWidth={240}
          onClear={() => q.activeTags.forEach((id) => q.toggleTag(id))}
        >
          <div className="wb-menu cashy-facet-pop" style={{ border: 0, boxShadow: "none" }}>
            <div
              className="wb-stack wb-scroll-y"
              style={{ "--wb-stack-gap": "1px", maxHeight: 220 } as CSSProperties}
            >
              {tagRanks.map(({ tag, count: used, shade }) => (
                <label key={tag.id} className="wb-check wb-menu__item">
                  <input
                    type="checkbox"
                    checked={q.activeTags.includes(tag.id)}
                    onChange={() => q.toggleTag(tag.id)}
                  />
                  <TagChip tag={tag} shade={shade} />
                  <span className="wb-menu__kbd" style={{ marginLeft: "auto" }}>
                    {used}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </FacetChip>
      )}

      {/* Clear everything at once — only worth showing once something is applied. */}
      {q.hasTokens && (
        <button type="button" className="cashy-facet-clear" onClick={q.clearTokens}>
          Clear all
        </button>
      )}
    </div>
  );
}
