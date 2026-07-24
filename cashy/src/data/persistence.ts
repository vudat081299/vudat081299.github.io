import type { CashyState } from "@/domain/types";
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
    contacts: [],
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
    const next = migrate(
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
        contacts: p.contacts ?? [],
      },
      fromVersion,
    );
    save(next);
    return next;
  } catch {
    return emptyState();
  }
}
