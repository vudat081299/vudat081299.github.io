import type { Tag } from "@/domain/types";
import { detachTag } from "@/domain/transaction";
import { commit, getState } from "@/data/store";
import { uid } from "@/lib/id";

export function addTag(input: { name: string; colorHex: string }): string {
  const state = getState();
  const tag: Tag = {
    id: uid(),
    name: input.name.trim(),
    colorHex: input.colorHex,
    createdAt: new Date().toISOString(),
  };
  commit({ ...state, tags: [...state.tags, tag] });
  return tag.id;
}

export function updateTag(id: string, patch: Partial<Tag>): void {
  const state = getState();
  commit({ ...state, tags: state.tags.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
}

/** Delete a tag and peel it off every transaction wearing it. */
export function deleteTag(id: string): void {
  const state = getState();
  commit({
    ...state,
    tags: state.tags.filter((t) => t.id !== id),
    transactions: detachTag(state.transactions, id),
  });
}
