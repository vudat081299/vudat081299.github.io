import type { CashyState, Category, Subscription, Tag, Transaction } from "@/domain/types";
import { rootOf } from "@/domain/category";
import { paymentsOf } from "@/domain/subscription";
import { billingDate, monthKey } from "@/domain/date";
import { SWATCHES } from "@/lib/palette";

// v2 re-colours legacy data onto the bright web-builder chart palette.
// v3 gives subscriptions a real `startedAt` date + a `lastPaidAt` marker.
// v4 gives subscriptions their payment history (`paymentTxIds`).
// v5 gives subscriptions a billing `interval` — everything before it was monthly.
export const CURRENT_VERSION = 5;

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
  return next;
}
