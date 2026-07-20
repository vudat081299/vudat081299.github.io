import { useMemo } from "react";
import type { Tag, TxType } from "@/types";
import type { TxQuery } from "@/lib/useTxQuery";
import { PeriodPicker } from "@/components/PeriodPicker";
import { Popover } from "@/components/wb/Popover";

const TYPES: { key: TxType | "all"; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "expense", label: "Chi" },
  { key: "income", label: "Thu" },
];

/**
 * The shared transaction filter bar — identical on the Dashboard and the
 * Transactions screen. Three stacked rows so each control has room:
 *   1. a rounded search field (divided magnifier addon + hover-only clear) ·
 *      tag picker · (optional) period · result count
 *   2. the removable `wb-filter-token` chips + "Xoá lọc"
 *   3. the Tất cả / Chi / Thu segmented control (dark boxed track)
 * The Dashboard hides the period here because it drives period from the header.
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

  return (
    <div className="wb-stack" style={{ "--wb-stack-gap": "12px" } as React.CSSProperties}>
      {/* Row 1 — search + tag picker + count */}
      <div className="wb-filterbar">
        <div className="wb-input-group wb-filterbar__search cashy-search">
          <span className="wb-input-group__addon">
            <span className="wb-ico wb-ico--sm">search</span>
          </span>
          <input
            className="wb-input"
            type="search"
            value={q.search}
            onChange={(e) => q.setSearch(e.target.value)}
            placeholder="Tìm theo ghi chú…"
          />
          {q.search && (
            <button
              type="button"
              className="wb-input-group__btn cashy-search__clear"
              aria-label="Xoá tìm kiếm"
              title="Xoá"
              onClick={() => q.setSearch("")}
            >
              <span className="wb-ico wb-ico--sm">close</span>
            </button>
          )}
        </div>

        {tags.length > 0 && (
          <Popover
            panelWidth={224}
            trigger={({ toggle }) => (
              <button type="button" className="wb-filter-add" onClick={toggle}>
                <span className="wb-ico wb-ico--sm">sell</span>
                Nhãn{q.activeTags.length ? ` · ${q.activeTags.length}` : ""}
              </button>
            )}
          >
            <div
              className="wb-menu"
              style={{ border: 0, boxShadow: "none", padding: 0, background: "none" }}
            >
              {tags.map((t) => {
                const on = q.activeTags.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    className="wb-menu__item"
                    onClick={() => q.toggleTag(t.id)}
                  >
                    <span className="cashy-dot cashy-dot--sm" style={{ background: t.colorHex }} />
                    {t.name}
                    {on && (
                      <span className="wb-ico wb-ico--xs" style={{ marginLeft: "auto" }}>
                        check
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Popover>
        )}

        {showPeriod && <PeriodPicker value={q.period} onChange={q.setPeriod} />}
        <span className="wb-filterbar__count">{count} giao dịch</span>
      </div>

      {/* Row 2 — active filter tokens */}
      {q.hasTokens && (
        <div className="wb-cluster wb-cluster--tight">
          {q.search.trim() && (
            <span className="wb-filter-token">
              <span className="wb-filter-token__key">Tìm</span>
              <span className="wb-filter-token__val">“{q.search.trim()}”</span>
              <button
                type="button"
                className="wb-filter-token__x"
                aria-label="Bỏ tìm kiếm"
                onClick={() => q.setSearch("")}
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
          <button
            type="button"
            className="wb-btn wb-btn--ghost wb-btn--sm"
            onClick={q.clearTokens}
          >
            Xoá lọc
          </button>
        </div>
      )}

      {/* Row 3 — type segmented control (dark boxed track), below everything */}
      <div className="wb-tabs wb-tabs--boxed cashy-typeseg">
        {TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            className={q.type === t.key ? "wb-tab is-active" : "wb-tab"}
            onClick={() => q.setType(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
