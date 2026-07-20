import { useMemo, useState } from "react";
import type { Category, Transaction, TxType } from "@/types";
import { filterTx } from "@/lib/domain";
import { periodRange, type PeriodKey } from "@/lib/period";

export interface TxQuery {
  period: PeriodKey;
  setPeriod: (k: PeriodKey) => void;
  type: TxType | "all";
  setType: (t: TxType | "all") => void;
  search: string;
  setSearch: (s: string) => void;
  activeTags: string[];
  toggleTag: (id: string) => void;
  /** true when a removable token is active (search or a tag) */
  hasTokens: boolean;
  /** clears the removable tokens (search + tags); leaves the type pills alone */
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
  defaultPeriod: PeriodKey = "this-month",
): TxQuery {
  const [period, setPeriod] = useState<PeriodKey>(defaultPeriod);
  const [type, setType] = useState<TxType | "all">("all");
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);

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

  const toggleTag = (id: string) =>
    setActiveTags((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return {
    period,
    setPeriod,
    type,
    setType,
    search,
    setSearch,
    activeTags,
    toggleTag,
    hasTokens: search.trim() !== "" || activeTags.length > 0,
    clearTokens: () => {
      setSearch("");
      setActiveTags([]);
    },
    filtered,
    sorted,
  };
}
