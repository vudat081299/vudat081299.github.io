import { useSyncExternalStore } from "react";
import type { CashyState } from "@/domain/types";
import { load, save } from "@/data/persistence";

/**
 * The single mutable cell the whole app reads from, plus the two verbs that move
 * it. Nothing here knows a business rule — deciding WHAT the next state should
 * be is `usecases/`, deciding how it survives a reload is `persistence.ts`.
 *
 * UI must never import this module for writes: read through `useCashy`, write
 * through a usecase.
 */
let state: CashyState = load();
const listeners = new Set<() => void>();

export function getState(): CashyState {
  return state;
}

/** Replace the state, persist it, and wake every subscriber. */
export function commit(next: CashyState): void {
  state = next;
  save(state);
  for (const l of listeners) l();
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** React binding — whole state; components select what they need. */
export function useCashy(): CashyState {
  return useSyncExternalStore(subscribe, getState, getState);
}
