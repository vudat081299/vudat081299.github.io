import { useMemo } from "react";
import type { Tag, TxType } from "@/types";
import type { TxQuery } from "@/lib/useTxQuery";
import { PERIODS, periodLabel } from "@/lib/period";
import { TagChip } from "@/components/TagChip";
import { Popover } from "@/components/wb/Popover";

const TYPES: { key: TxType; label: string }[] = [
  { key: "expense", label: "Chi" },
  { key: "income", label: "Thu" },
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
  tags,
  count,
  showPeriod = true,
}: {
  q: TxQuery;
  tags: Tag[];
  count: number;
  showPeriod?: boolean;
}) {
  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);
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
          placeholder="Tìm giao dịch…"
        />
      </div>

      {/* Applied filters, each removable right where it is shown. */}
      {showPeriod && q.period !== "all" && (
        <span className="wb-filter-token">
          <span className="wb-filter-token__key">Kỳ</span>
          <span className="wb-filter-token__val">{periodLabel(q.period)}</span>
          <button
            type="button"
            className="wb-filter-token__x"
            aria-label="Bỏ lọc kỳ"
            onClick={() => q.setPeriod("all")}
          />
        </span>
      )}

      {typeLabel && (
        <span className="wb-filter-token">
          <span className="wb-filter-token__key">Loại</span>
          <span className="wb-filter-token__val">{typeLabel}</span>
          <button
            type="button"
            className="wb-filter-token__x"
            aria-label="Bỏ lọc loại"
            onClick={() => q.setType("all")}
          />
        </span>
      )}

      {q.activeTags.map((id) => {
        const t = tagById.get(id);
        if (!t) return null;
        return (
          <span key={id} className="wb-filter-token">
            <span className="wb-filter-token__key">Nhãn</span>
            <span className="wb-filter-token__val">{t.name}</span>
            <button
              type="button"
              className="wb-filter-token__x"
              aria-label={`Bỏ nhãn ${t.name}`}
              onClick={() => q.toggleTag(id)}
            />
          </span>
        );
      })}

      <Popover
        panelWidth={252}
        trigger={({ toggle }) => (
          <button type="button" className="wb-filter-add" onClick={toggle}>
            <span className="wb-ico wb-ico--sm">add</span> Thêm bộ lọc
          </button>
        )}
      >
        <div className="wb-menu wb-filter-pop" style={{ border: 0, boxShadow: "none" }}>
          {showPeriod && (
            <>
              <p className="wb-filter-pop__title">Kỳ</p>
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
              <div className="wb-menu__sep" />
            </>
          )}

          <p className="wb-filter-pop__title">Loại</p>
          <div className="wb-stack" style={{ "--wb-stack-gap": "1px" } as React.CSSProperties}>
            <label className="wb-radio wb-menu__item">
              <input
                type="radio"
                name="cashy-type"
                checked={q.type === "all"}
                onChange={() => q.setType("all")}
              />
              Tất cả
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

          {tags.length > 0 && (
            <>
              <div className="wb-menu__sep" />
              <p className="wb-filter-pop__title">Nhãn</p>
              <div
                className="wb-stack wb-scroll-y"
                style={{ "--wb-stack-gap": "1px", maxHeight: 188 } as React.CSSProperties}
              >
                {tags.map((t) => (
                  <label key={t.id} className="wb-check wb-menu__item">
                    <input
                      type="checkbox"
                      checked={q.activeTags.includes(t.id)}
                      onChange={() => q.toggleTag(t.id)}
                    />
                    <TagChip tag={t} tinted />
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
                Xoá hết bộ lọc
              </button>
            </>
          )}
        </div>
      </Popover>

      <span className="wb-filterbar__count">{count} giao dịch</span>
    </div>
  );
}
