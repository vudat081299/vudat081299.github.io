import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { Category, TxType } from "@/types";
import { flattenTree, type TagRank } from "@/lib/domain";
import type { TxQuery } from "@/lib/useTxQuery";
import { TX_STATUS_META, TX_STATUS_ORDER } from "@/lib/txStatus";
import { formatMoneyShort } from "@/lib/money";
import { cn } from "@/lib/utils";
import { TagChip } from "@/components/TagChip";
import { Popover } from "@/components/wb/Popover";

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
 * The shared transaction filter bar — the web-builder `filterbar` pattern, one
 * row: the search field, then "Add filter" (always right after the search and
 * ahead of every capsule), then the removable filter tokens.
 *
 * One popover holds every editor — type, status, category, amount range, tags —
 * so a busy query is assembled in one place and each applied filter reads back
 * as a `[ key : value × ]` token. Scopes stay neutral (§1); only the type token
 * is called out with a black outline, and the status column keeps its own tones.
 */
export function TxFilterBar({
  q,
  tagRanks,
  categories,
}: {
  q: TxQuery;
  /** tags already ordered most-used first (see `rankTags`) */
  tagRanks: TagRank[];
  categories: Category[];
}) {
  const rankById = useMemo(() => new Map(tagRanks.map((r) => [r.tag.id, r])), [tagRanks]);
  const catFlat = useMemo(() => flattenTree(categories), [categories]);
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const typeLabel = TYPES.find((t) => t.key === q.type)?.label;

  // Amount inputs live-drive the query; an external clear (token ×, "clear all")
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
  const amountToken =
    q.amountMin != null && q.amountMax != null
      ? `${formatMoneyShort(q.amountMin).replace(" đ", "")} – ${formatMoneyShort(q.amountMax)}`
      : q.amountMin != null
        ? `≥ ${formatMoneyShort(q.amountMin)}`
        : q.amountMax != null
          ? `≤ ${formatMoneyShort(q.amountMax)}`
          : "";

  return (
    <div className="wb-filterbar">
      {/* Search — a seamless pill (bo tròn 2 đầu): the magnifier and the clear
          button carry no fill or divider, they share the field with the text. */}
      <div className="wb-input-group wb-input-group--seamless wb-filterbar__search cashy-search">
        <span className="wb-input-group__addon">
          <span className="wb-ico wb-ico--sm">search</span>
        </span>
        <input
          className="wb-input"
          type="text"
          value={q.search}
          onChange={(e) => q.setSearch(e.target.value)}
          placeholder="Search transactions…"
        />
        {q.search && (
          <button
            type="button"
            className="wb-input-group__btn"
            aria-label="Clear search"
            onClick={() => q.setSearch("")}
          >
            <span className="wb-ico wb-ico--sm">close</span>
          </button>
        )}
      </div>

      {/* Add filter — right after the search, always ahead of the capsules. */}
      <Popover
        panelWidth={272}
        trigger={({ toggle }) => (
          <button type="button" className="wb-filter-add" onClick={toggle}>
            <span className="wb-ico wb-ico--sm">add</span> Add filter
          </button>
        )}
      >
        <div
          className="wb-menu wb-filter-pop cashy-filter-scroll"
          style={{ border: 0, boxShadow: "none" }}
        >
          <p className="wb-filter-pop__title">Type</p>
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

          <div className="wb-menu__sep" />
          <p className="wb-filter-pop__title">Status</p>
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

          {catFlat.length > 0 && (
            <>
              <div className="wb-menu__sep" />
              <p className="wb-filter-pop__title">Category</p>
              <div
                className="wb-stack wb-scroll-y"
                style={{ "--wb-stack-gap": "1px", maxHeight: 176 } as CSSProperties}
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
            </>
          )}

          <div className="wb-menu__sep" />
          <p className="wb-filter-pop__title">Amount (đ)</p>
          <div className="cashy-amount-range">
            <input
              className="wb-input"
              inputMode="numeric"
              value={minText}
              onChange={(e) => {
                setMinText(e.target.value);
                q.setAmountRange(parseAmt(e.target.value), q.amountMax);
              }}
              placeholder="Từ"
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
              placeholder="Đến"
              aria-label="Amount to"
            />
          </div>

          {tagRanks.length > 0 && (
            <>
              <div className="wb-menu__sep" />
              <p className="wb-filter-pop__title">Tags</p>
              <div
                className="wb-stack wb-scroll-y"
                style={{ "--wb-stack-gap": "1px", maxHeight: 176 } as CSSProperties}
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
            </>
          )}

          {q.hasTokens && (
            <>
              <div className="wb-menu__sep" />
              <button
                type="button"
                className="wb-btn wb-btn--ghost wb-btn--sm wb-btn--block"
                onClick={q.clearTokens}
              >
                Clear all filters
              </button>
            </>
          )}
        </div>
      </Popover>

      {/* Applied filters, each removable right where it is shown. */}
      {typeLabel && (
        <span className="wb-filter-token cashy-filter-token--type">
          <span className="wb-filter-token__key">Type</span>
          <span className="wb-filter-token__val">{typeLabel}</span>
          <button
            type="button"
            className="wb-filter-token__x"
            aria-label="Clear type filter"
            onClick={() => q.setType("all")}
          />
        </span>
      )}

      {q.statuses.length > 0 && (
        <span className="wb-filter-token">
          <span className="wb-filter-token__key">Status</span>
          <span className="wb-filter-token__val">{statusToken}</span>
          <button
            type="button"
            className="wb-filter-token__x"
            aria-label="Clear status filter"
            onClick={() => q.statuses.forEach((s) => q.toggleStatus(s))}
          />
        </span>
      )}

      {q.catIds.length > 0 && (
        <span className="wb-filter-token">
          <span className="wb-filter-token__key">Category</span>
          <span className="wb-filter-token__val">{catToken}</span>
          <button
            type="button"
            className="wb-filter-token__x"
            aria-label="Clear category filter"
            onClick={() => q.catIds.forEach((id) => q.toggleCat(id))}
          />
        </span>
      )}

      {amountToken && (
        <span className="wb-filter-token">
          <span className="wb-filter-token__key">Amount</span>
          <span className="wb-filter-token__val">{amountToken}</span>
          <button
            type="button"
            className="wb-filter-token__x"
            aria-label="Clear amount filter"
            onClick={() => q.setAmountRange(null, null)}
          />
        </span>
      )}

      {q.activeTags.map((id) => {
        const r = rankById.get(id);
        if (!r) return null;
        return (
          <span key={id} className="wb-filter-token">
            <span className="wb-filter-token__key">#</span>
            <span className="wb-filter-token__val">{r.tag.name}</span>
            <button
              type="button"
              className="wb-filter-token__x"
              aria-label={`Remove tag ${r.tag.name}`}
              onClick={() => q.toggleTag(id)}
            />
          </span>
        );
      })}
    </div>
  );
}
