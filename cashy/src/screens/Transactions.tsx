import { useMemo, useState } from "react";
import { useCashy } from "@/lib/store";
import { filterTx, totals } from "@/lib/domain";
import { periodRange, type PeriodKey } from "@/lib/period";
import type { Tag, TxType } from "@/types";
import { AmountDisplay } from "@/components/AmountDisplay";
import { EmptyState } from "@/components/EmptyState";
import { PeriodPicker } from "@/components/PeriodPicker";
import { TransactionRow } from "@/components/TransactionRow";
import { openTxEditor } from "@/components/TransactionEditor";
import { Popover } from "@/components/wb/Popover";

const TYPES: { key: TxType | "all"; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "expense", label: "Chi" },
  { key: "income", label: "Thu" },
];

export function Transactions() {
  const { transactions, categories, tags } = useCashy();
  const [period, setPeriod] = useState<PeriodKey>("this-month");
  const [type, setType] = useState<TxType | "all">("all");
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  const filtered = useMemo(
    () =>
      filterTx(transactions, {
        range: periodRange(period),
        type,
        search,
        tagIds: activeTags,
        cats: categories,
      }),
    [transactions, categories, period, type, search, activeTags],
  );

  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) =>
          b.occurredAt.localeCompare(a.occurredAt) ||
          b.createdAt.localeCompare(a.createdAt),
      ),
    [filtered],
  );

  const net = totals(filtered).net;

  return (
    <div className="wb-stack wb-stack--loose">
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>Giao dịch</h2>
        <p style={{ marginTop: 2, fontSize: 13, color: "var(--wb-fg-muted)" }}>
          {filtered.length} giao dịch trong kỳ
        </p>
      </div>

      <div className="wb-filterbar">
        <div className="wb-input-group wb-filterbar__search">
          <span className="wb-input-group__addon">
            <span className="wb-ico wb-ico--sm">search</span>
          </span>
          <input
            className="wb-input"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo ghi chú…"
          />
        </div>

        <div className="wb-tabs wb-tabs--pill" style={{ flex: "none" }}>
          {TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              className={type === t.key ? "wb-tab is-active" : "wb-tab"}
              onClick={() => setType(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tags.length > 0 && (
          <Popover
            panelWidth={208}
            trigger={({ toggle }) => (
              <button
                type="button"
                className={
                  activeTags.length
                    ? "wb-filter-token"
                    : "wb-filter-add"
                }
                onClick={toggle}
              >
                <span className="wb-ico wb-ico--sm">sell</span>
                Nhãn{activeTags.length ? ` · ${activeTags.length}` : ""}
              </button>
            )}
          >
            <div className="wb-menu" style={{ border: 0, boxShadow: "none", padding: 0, background: "none" }}>
              {tags.map((t) => {
                const on = activeTags.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    className="wb-menu__item"
                    onClick={() =>
                      setActiveTags(on ? activeTags.filter((x) => x !== t.id) : [...activeTags, t.id])
                    }
                  >
                    <span
                      style={{ width: 8, height: 8, borderRadius: "50%", background: t.colorHex, flex: "none" }}
                    />
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

        <PeriodPicker value={period} onChange={setPeriod} />
        <span className="wb-filterbar__count">{filtered.length} giao dịch</span>
      </div>

      {sorted.length ? (
        <div className="wb-card">
          <div className="wb-table-scroll">
            <table className="wb-table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Nội dung</th>
                  <th>Danh mục</th>
                  <th className="wb-num">Số tiền</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    category={tx.categoryId ? (catById.get(tx.categoryId) ?? null) : null}
                    tags={tx.tagIds
                      .map((id) => tagById.get(id))
                      .filter((t): t is Tag => Boolean(t))}
                    onClick={() => openTxEditor(tx.id)}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>Ròng trong kỳ</td>
                  <td className="wb-num">
                    <AmountDisplay amount={Math.abs(net)} type={net >= 0 ? "income" : "expense"} signed />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="wb-card">
          <div className="wb-card__body">
            <EmptyState
              icon="🧾"
              title="Không có giao dịch"
              description="Thử đổi bộ lọc, hoặc thêm giao dịch mới."
              action={
                <button type="button" className="wb-btn" onClick={() => openTxEditor(null)}>
                  Thêm giao dịch
                </button>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
