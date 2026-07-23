import type { CashyState, Category, Subscription, Tag, Transaction, Wallet } from "@/domain/types";
import { rootOf } from "@/domain/category";
import { paymentsOf } from "@/domain/subscription";
import { guessWalletKind, walletIcon } from "@/domain/wallet";
import { billingDate, monthKey } from "@/domain/date";
import { uid } from "@/lib/id";
import { SWATCHES } from "@/lib/palette";

// v2 re-colours legacy data onto the bright web-builder chart palette.
// v3 gives subscriptions a real `startedAt` date + a `lastPaidAt` marker.
// v4 gives subscriptions their payment history (`paymentTxIds`).
// v5 gives subscriptions a billing `interval` — everything before it was monthly.
// v6 turns the free-text `account` "Paid with" field into a real Wallet model.
// v7 adds the loans model (money owed / owing) — a brand-new array.
// v8 adds optional card fields (cardNetwork + creditLimit) — additive, no back-fill.
export const CURRENT_VERSION = 8;

/**
 * v1 → v2: repaint every category & tag onto the bright chart palette (each
 * ROOT category gets a distinct hue, children inherit it; tags cycle the
 * swatches). Legacy workspaces were seeded with muted earth tones that read
 * "murky" in the donut — this discards that old colour thinking wholesale,
 * without touching any other data.
 */
function recolor(cats: Category[], tags: Tag[]): { categories: Category[]; tags: Tag[] } {
  const roots = cats.filter((c) => !c.parentId).sort((a, b) => a.order - b.order);
  const hueByRoot = new Map<string, string>();
  roots.forEach((r, i) => hueByRoot.set(r.id, SWATCHES[i % SWATCHES.length]));
  const categories = cats.map((c) => {
    const root = rootOf(cats, c.id);
    const hex = root ? hueByRoot.get(root.id) : undefined;
    return hex ? { ...c, colorHex: hex } : c;
  });
  const recoloredTags = tags.map((t, i) => ({ ...t, colorHex: SWATCHES[i % SWATCHES.length] }));
  return { categories, tags: recoloredTags };
}

/**
 * v2 → v3: a subscription used to carry only `startMonth` ("YYYY-MM"). Give it a
 * real `startedAt` date — its first billing day in that month — and back-fill
 * `lastPaidAt` from whatever it has actually recorded, so the new reminder is
 * correct for existing data instead of demanding a payment already made.
 */
function migrateSubV3(s: Subscription, txs: Transaction[]): Subscription {
  const legacyMonth = (s as unknown as { startMonth?: string }).startMonth;
  const startedAt = s.startedAt ?? billingDate(legacyMonth ?? monthKey(), s.dayOfMonth);
  const { startMonth: _drop, ...rest } = s as Subscription & { startMonth?: string };
  return { ...rest, startedAt, ...paymentsOf(s.id, txs) };
}

/**
 * v5 → v6: turn the free-text `account` "Paid with" field into a real Wallet
 * model. Each distinct account string across transactions + subscriptions becomes
 * a Wallet (openingBalance 0, kind guessed from the name); every row that carried
 * that string is linked by `walletId`. `account` is left intact — the migration is
 * purely additive. See docs/wallets-plan.md.
 */
function migrateWalletsV6(state: CashyState): CashyState {
  if (state.wallets?.length) return state; // already has wallets — nothing to do
  const names: string[] = [];
  const seen = new Set<string>();
  const collect = (a?: string) => {
    const name = a?.trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  };
  for (const t of state.transactions) collect(t.account);
  for (const s of state.subscriptions) collect(s.account);

  const now = new Date().toISOString();
  const idByName = new Map<string, string>();
  const wallets: Wallet[] = names.map((name, i) => {
    const kind = guessWalletKind(name);
    const id = uid();
    idByName.set(name, id);
    return {
      id,
      name,
      kind,
      openingBalance: 0,
      colorHex: SWATCHES[i % SWATCHES.length],
      icon: walletIcon(kind),
      order: i,
      archived: false,
      createdAt: now,
    };
  });

  const link = <T extends { account?: string; walletId?: string | null }>(row: T): T => {
    const id = row.account?.trim() ? idByName.get(row.account.trim()) : undefined;
    return id ? { ...row, walletId: id } : row;
  };
  return {
    ...state,
    wallets,
    transactions: state.transactions.map(link),
    subscriptions: state.subscriptions.map(link),
  };
}

/** Bring a persisted snapshot of any past version up to `CURRENT_VERSION`. */
export function migrate(state: CashyState, fromVersion: number): CashyState {
  let next = state;
  if (fromVersion < 2) {
    const { categories, tags } = recolor(next.categories, next.tags);
    next = { ...next, categories, tags };
  }
  if (fromVersion < 3) {
    next = {
      ...next,
      subscriptions: next.subscriptions.map((s) => migrateSubV3(s, next.transactions)),
    };
  }
  if (fromVersion < 4) {
    next = {
      ...next,
      subscriptions: next.subscriptions.map((s) => ({ ...s, ...paymentsOf(s.id, next.transactions) })),
    };
  }
  // Every subscription that existed before v5 billed monthly, by construction
  // — the model had no other option — so the back-fill is unambiguous.
  if (fromVersion < 5) {
    next = {
      ...next,
      subscriptions: next.subscriptions.map((s) => ({ ...s, interval: s.interval ?? "monthly" })),
    };
  }
  if (fromVersion < 6) {
    next = migrateWalletsV6(next);
  }
  // Loans are brand new — no data to transform, so the branch only guarantees
  // the field exists on snapshots that predate it.
  if (fromVersion < 7) {
    next = { ...next, loans: next.loans ?? [] };
  }
  return next;
}
