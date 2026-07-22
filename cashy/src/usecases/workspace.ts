import type { CashyState, Workspace } from "@/domain/types";
import { commit, getState } from "@/data/store";
import { emptyState } from "@/data/persistence";
import { CURRENT_VERSION } from "@/data/migrations";
import { buildSampleData } from "@/data/sample";
import { seedCategories } from "@/data/seed";

function freshDataset() {
  const categories = seedCategories();
  return { categories, ...buildSampleData(categories) };
}

/**
 * Create a workspace. It is ALWAYS seeded with the 200-transaction demo dataset
 * — every account, from every entry point, opens on a populated ledger.
 */
export function createWorkspace(input: { displayName: string; currency?: string }): void {
  const workspace: Workspace = {
    displayName: input.displayName.trim() || "Mine",
    currency: input.currency ?? "VND",
    createdAt: new Date().toISOString(),
  };
  commit({ ...getState(), workspace, ...freshDataset() });
}

/** Replace categories/tags/transactions with a fresh demo dataset (200 txns). */
export function loadSampleData(): void {
  const state = getState();
  const workspace: Workspace = state.workspace ?? {
    displayName: "Mine",
    currency: "VND",
    createdAt: new Date().toISOString(),
  };
  commit({ ...state, workspace, ...freshDataset() });
}

export function updateWorkspace(patch: Partial<Workspace>): void {
  const state = getState();
  if (!state.workspace) return;
  commit({ ...state, workspace: { ...state.workspace, ...patch } });
}

/** Wipe the ledger back to onboarding. Display preferences survive — they are
 *  about this browser, not about the data being thrown away. */
export function resetAll(): void {
  const { theme, subIconStyle } = getState();
  commit({ ...emptyState(), theme, subIconStyle });
}

// ---- import / export -------------------------------------------------------
export function exportData(): string {
  const state = getState();
  return JSON.stringify(
    {
      app: "cashy",
      version: CURRENT_VERSION,
      exportedAt: new Date().toISOString(),
      workspace: state.workspace,
      categories: state.categories,
      tags: state.tags,
      transactions: state.transactions,
      subscriptions: state.subscriptions,
    },
    null,
    2,
  );
}

export function importData(json: string): { ok: boolean; error?: string } {
  try {
    const p = JSON.parse(json) as Partial<CashyState>;
    if (!Array.isArray(p.categories) || !Array.isArray(p.transactions)) {
      return { ok: false, error: "File is not a valid Cashy file." };
    }
    const state = getState();
    commit({
      version: CURRENT_VERSION,
      theme: state.theme,
      subIconStyle: p.subIconStyle ?? state.subIconStyle,
      workspace: p.workspace ?? state.workspace,
      categories: p.categories,
      tags: Array.isArray(p.tags) ? p.tags : [],
      transactions: p.transactions,
      subscriptions: Array.isArray(p.subscriptions) ? p.subscriptions : [],
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not read the JSON content." };
  }
}
