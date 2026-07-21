import { useMemo } from "react";
import type { TxType } from "@/types";
import type { TagRank } from "@/lib/domain";
import type { TxQuery } from "@/lib/useTxQuery";
import { PERIODS, periodLabel } from "@/lib/period";
import { TagChip } from "@/components/TagChip";
import { RangeCalendar } from "@/components/RangeCalendar";
import { Popover } from "@/components/wb/Popover";

const TYPES: { key: TxType; label: string }[] = [
  { key: "expense", label: "Expense" },
  { key: "income", label: "Income" },
];

/**
 * The shared transaction filter bar — the web-builder `filterbar` pattern, one
 * single row: search · the removable filter tokens · "Thêm bộ lọc" · the result
 * count pushed right by `.wb-filterbar__count`'s auto margin.
 *
 * Every applied filter reads as a `[ khoá : giá trị × ]` token, so the row shows
 * the whole query at a glance and each part is removable where it is shown —
 * instead of the three stacked rows (search / tokens / a segmented Chi·Thu
 * track) this used to be. All the editors live in one "Thêm bộ lọc" popover.
 * Tokens stay neutral: a period, a type and a tag are scopes, not statuses, so
 * under the colour ladder (§1) none of them gets a tone.
 */
export function TxFilterBar({
  q,
  tagRanks,
  count,
  showPeriod = true,
}: {
  q: TxQuery;
  /** tags already ordered most-used first (see `rankTags`) */
  tagRanks: TagRank[];
  count: number;
  showPeriod?: boolean;
}) {
  const rankById = useMemo(() => new Map(tagRanks.map((r) => [r.tag.id, r])), [tagRanks]);
  const typeLabel = TYPES.find((t) => t.key === q.type)?.label;

  return (
    <div className="wb-filterbar">
      <div className="wb-input-group wb-filterbar__search">
        <span className="wb-input-group__addon">
          <span className="wb-ico wb-ico--sm">search</span>
        </span>
        <input
          className="wb-input"
          type="search"
          value={q.search}
          onChange={(e) => q.setSearch(e.target.value)}
          placeholder="Search transactions…"
        />
      </div>

      {/* Applied filters, each removable right where it is shown. */}
      {showPeriod && q.period !== "all" && (
        <span className="wb-filter-token">
          <span className="wb-filter-token__key">Period</span>
          <span className="wb-filter-token__val">{periodLabel(q.period, q.custom)}</span>
          <button
            type="button"
            className="wb-filter-token__x"
            aria-label="Clear period filter"
            onClick={() => q.setPeriod("all")}
          />
        </span>
      )}

      {typeLabel && (
        <span className="wb-filter-token">
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

      {q.activeTags.map((id) => {
        const r = rankById.get(id);
        if (!r) return null;
        return (
          <span key={id} className="wb-filter-token">
            <span className="wb-filter-token__key">Tag</span>
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

      <Popover
        panelWidth={252}
        trigger={({ toggle }) => (
          <button type="button" className="wb-filter-add" onClick={toggle}>
            <span className="wb-ico wb-ico--sm">add</span> Add filter
          </button>
        )}
      >
        <div className="wb-menu wb-filter-pop" style={{ border: 0, boxShadow: "none" }}>
          {showPeriod && (
            <>
              <p className="wb-filter-pop__title">Period</p>
              <div className="wb-stack" style={{ "--wb-stack-gap": "1px" } as React.CSSProperties}>
                {PERIODS.map((p) => (
                  <label key={p.key} className="wb-radio wb-menu__item">
                    <input
                      type="radio"
                      name="cashy-period"
                      checked={q.period === p.key}
                      onChange={() => q.setPeriod(p.key)}
                    />
                    {p.label}
                  </label>
                ))}
              </div>
              <p className="wb-filter-pop__title">Custom range</p>
              <RangeCalendar
                value={q.period === "custom" ? q.custom : null}
                onChange={(r) => q.setPeriod("custom", r)}
              />
              <div className="wb-menu__sep" />
            </>
          )}

          <p className="wb-filter-pop__title">Type</p>
          <div className="wb-stack" style={{ "--wb-stack-gap": "1px" } as React.CSSProperties}>
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

          {tagRanks.length > 0 && (
            <>
              <div className="wb-menu__sep" />
              <p className="wb-filter-pop__title">Tags</p>
              <div
                className="wb-stack wb-scroll-y"
                style={{ "--wb-stack-gap": "1px", maxHeight: 188 } as React.CSSProperties}
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

      <span className="wb-filterbar__count">{count} transactions</span>
    </div>
  );
}
