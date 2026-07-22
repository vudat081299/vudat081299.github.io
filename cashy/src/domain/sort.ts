import type { Category } from "@/domain/types";

/** Vietnamese-aware name sort — the default order for anything the user named. */
export function byName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name, "vi");
}

/** Sibling order as the user arranged it, falling back to name. */
export function byOrder(a: Category, b: Category): number {
  return a.order - b.order || byName(a, b);
}
