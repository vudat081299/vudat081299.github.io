import { useMemo, useState } from "react";
import type { Subscription, Transaction, Wallet } from "@/domain/types";
import { nextPaymentDate, sortSubscriptions, subState, type SubState } from "@/domain";
import { daysBetween, ymd } from "@/domain/date";

export type SubSortKey = "status" | "price" | "days";
export interface SubSort {
  key: SubSortKey;
  dir: "asc" | "desc";
}

/** The natural FIRST direction of each explicit sort: priciest first, soonest
 *  (most overdue) first. A second click on the same capsule reverses it; a third
 *  drops back to the default "by status" order. */
const NATURAL: Record<"price" | "days", "asc" | "desc"> = { price: "desc", days: "asc" };

export interface SubFilter {
  query: string;
  setQuery: (s: string) => void;
  /** the one status bucket in view, or null for all */
  status: SubState | null;
  setStatus: (s: SubState | null) => void;
  walletId: string | null;
  setWallet: (id: string | null) => void;
  sort: SubSort;
  /** cycle a sort capsule: status → natural dir → reversed → back to status */
  cycleSort: (key: "price" | "days") => void;
  /** only the wallets that actually pay for a subscription — the rest are noise */
  walletOptions: Wallet[];
  /** true when any removable filter/sort is applied */
  hasTokens: boolean;
  clearTokens: () => void;
  result: Subscription[];
  count: number;
}

/**
 * The one subscription query used by BOTH the Dashboard strip and the
 * Subscriptions screen — free-text + status bucket + wallet → filtered list,
 * ordered by status (default), price, or days-until-payment. Each surface owns
 * its own instance; sharing the *shape* keeps the two filter bars identical
 * without coupling their state (mirrors `useTxQuery`).
 *
 * All ordering is delegated to the pure `domain/subscription` (`sortSubscriptions`
 * for the default, `subState` for the status facet), so the sort rules live in
 * one tested place rather than here in the UI.
 */
export function useSubFilter(
  subscriptions: Subscription[],
  transactions: Transaction[],
  wallets: Wallet[],
  { pinStatusOrder = false }: { pinStatusOrder?: boolean } = {},
): SubFilter {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SubState | null>(null);
  const [walletId, setWallet] = useState<string | null>(null);
  const [sort, setSort] = useState<SubSort>({ key: "status", dir: "asc" });

  // Snapshot the "by status" order ONCE, at first load, when the caller asks the
  // grid to stay put. On the Subscriptions screen, paying a service changes its
  // status — without this its card would jump to a new slot mid-interaction and
  // you'd lose the one you just edited. The Dashboard strip opts out (default):
  // there, a paid service dropping out of the "due" cluster is useful feedback.
  const [pinnedOrder] = useState<string[]>(() =>
    pinStatusOrder ? sortSubscriptions(subscriptions, transactions, new Date()).map((s) => s.id) : [],
  );
  const pinnedRank = useMemo(() => new Map(pinnedOrder.map((id, i) => [id, i])), [pinnedOrder]);

  const cycleSort = (key: "price" | "days") =>
    setSort((cur) => {
      if (cur.key !== key) return { key, dir: NATURAL[key] };
      if (cur.dir === NATURAL[key]) return { key, dir: NATURAL[key] === "asc" ? "desc" : "asc" };
      return { key: "status", dir: "asc" };
    });

  const walletOptions = useMemo(() => {
    const used = new Set(subscriptions.map((s) => s.walletId).filter(Boolean));
    return wallets.filter((w) => used.has(w.id));
  }, [subscriptions, wallets]);

  const result = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = new Date();
    const kept = subscriptions.filter((s) => {
      if (q && !`${s.name} ${s.note ?? ""}`.toLowerCase().includes(q)) return false;
      if (status && subState(s, transactions, now) !== status) return false;
      if (walletId && s.walletId !== walletId) return false;
      return true;
    });

    // Default order is the pure status sort; the two explicit keys re-sort live.
    if (sort.key === "status") {
      if (pinStatusOrder) {
        // Hold the first-load order: a status change (a payment) must not reshuffle
        // cards. Subs added later aren't in the snapshot, so they fall to the end.
        const rankOf = (s: Subscription) => pinnedRank.get(s.id) ?? Number.MAX_SAFE_INTEGER;
        return [...kept].sort((a, b) => rankOf(a) - rankOf(b));
      }
      return sortSubscriptions(kept, transactions, now);
    }

    const flip = sort.dir === "asc" ? 1 : -1;
    const byName = (a: Subscription, b: Subscription) => a.name.localeCompare(b.name, "en");
    if (sort.key === "price") {
      return [...kept].sort((a, b) => flip * (a.amount - b.amount) || byName(a, b));
    }
    // Days until the next payment (negative = already overdue), soonest first asc.
    const today = ymd(now);
    const daysLeft = (s: Subscription) => daysBetween(today, nextPaymentDate(s, transactions, now));
    return [...kept].sort((a, b) => flip * (daysLeft(a) - daysLeft(b)) || byName(a, b));
  }, [subscriptions, transactions, query, status, walletId, sort, pinStatusOrder, pinnedRank]);

  return {
    query,
    setQuery,
    status,
    setStatus,
    walletId,
    setWallet,
    sort,
    cycleSort,
    walletOptions,
    hasTokens: query.trim() !== "" || status != null || walletId != null || sort.key !== "status",
    clearTokens: () => {
      setQuery("");
      setStatus(null);
      setWallet(null);
      setSort({ key: "status", dir: "asc" });
    },
    result,
    count: result.length,
  };
}
