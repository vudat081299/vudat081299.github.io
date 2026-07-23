import type { CashyState } from "@/domain/types";
import { buildSampleData } from "@/data/sample";
import { seedCategories } from "@/data/seed";
import { CURRENT_VERSION, migrate } from "@/data/migrations";

const KEY = "cashy_state_v1";

export function emptyState(): CashyState {
  return {
    version: CURRENT_VERSION,
    theme: "system",
    subIconStyle: "neutral",
    workspace: null,
    categories: [],
    tags: [],
    transactions: [],
    subscriptions: [],
    wallets: [],
    loans: [],
  };
}

/** Write the snapshot. Quota errors are swallowed: losing a save is survivable,
 *  crashing the app over it is not. */
export function save(state: CashyState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore quota errors */
  }
}

/**
 * Read the persisted snapshot, migrate it forward, and hand back a state the
 * app can open on. A corrupt or absent payload yields an empty workspace rather
 * than an exception — there is no useful way to fail here.
 */
export function load(): CashyState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const p = JSON.parse(raw) as Partial<CashyState>;
    const fromVersion = p.version ?? 1;
    let next = migrate(
      {
        ...emptyState(),
        ...p,
        version: CURRENT_VERSION,
        categories: p.categories ?? [],
        tags: p.tags ?? [],
        transactions: p.transactions ?? [],
        subscriptions: p.subscriptions ?? [],
        wallets: p.wallets ?? [],
        loans: p.loans ?? [],
      },
      fromVersion,
    );
    // A workspace must never open on an empty ledger: any account that got this
    // far with no transactions is re-seeded with the 200-row demo dataset. Only
    // an EMPTY ledger is filled, so nothing a user actually entered is touched.
    if (next.workspace && next.transactions.length === 0) {
      const categories = next.categories.length ? next.categories : seedCategories();
      const { tags, transactions, subscriptions, wallets, loans } = buildSampleData(categories);
      next = { ...next, categories, tags, transactions, subscriptions, wallets, loans };
    }
    save(next);
    return next;
  } catch {
    return emptyState();
  }
}
