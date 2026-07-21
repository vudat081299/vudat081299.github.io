import { useMemo, useState } from "react";
import type { Category, Transaction, TxType } from "@/types";
import { filterTx } from "@/lib/domain";
import { periodRange, type PeriodKey, type Range } from "@/lib/period";

export interface TxQuery {
  period: PeriodKey;
  /** the hand-picked window, only meaningful while `period === "custom"` */
  custom: Range | null;
  setPeriod: (k: PeriodKey, custom?: Range | null) => void;
  /** the concrete dates the period resolves to — what the charts should bucket */
  range: Range;
  type: TxType | "all";
  setType: (t: TxType | "all") => void;
  search: string;
  setSearch: (s: string) => void;
  activeTags: string[];
  toggleTag: (id: string) => void;
  /** true when any removable filter is applied (search, type or a tag) */
  hasTokens: boolean;
  /** clears every removable filter; leaves the period scope alone */
  clearTokens: () => void;
  filtered: Transaction[];
  sorted: Transaction[];
}

/**
 * The one transaction query used by BOTH the Dashboard and the Transactions
 * screen — period + type + free-text + tags → filtered & date-sorted list. Each
 * screen owns its own instance; sharing the *shape* keeps the two filter bars and
 * tables identical without coupling their state.
 */
export function useTxQuery(
  transactions: Transaction[],
  categories: Category[],
  // 30 days, not "this month": the seeded dataset spans the last 10 days, which
  // straddles a month boundary for most of the month — a "this month" default
  // would hide part of it on those days.
  defaultPeriod: PeriodKey = "30d",
): TxQuery {
  const [period, setPeriodKey] = useState<PeriodKey>(defaultPeriod);
  const [custom, setCustom] = useState<Range | null>(null);
  const [type, setType] = useState<TxType | "all">("all");
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);

  // A preset clears whatever range was hand-picked; picking dates implies custom.
  const setPeriod = (k: PeriodKey, next?: Range | null) => {
    setPeriodKey(k);
    if (next !== undefined) setCustom(next);
    else if (k !== "custom") setCustom(null);
  };

  const range = useMemo(() => periodRange(period, new Date(), custom), [period, custom]);

  const filtered = useMemo(
    () =>
      filterTx(transactions, {
        range,
        type,
        search,
        tagIds: activeTags,
        cats: categories,
      }),
    [transactions, categories, range, type, search, activeTags],
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

  const toggleTag = (id: string) =>
    setActiveTags((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return {
    period,
    custom,
    setPeriod,
    range,
    type,
    setType,
    search,
    setSearch,
    activeTags,
    toggleTag,
    hasTokens: search.trim() !== "" || activeTags.length > 0 || type !== "all",
    clearTokens: () => {
      setSearch("");
      setActiveTags([]);
      setType("all");
    },
    filtered,
    sorted,
  };
}
