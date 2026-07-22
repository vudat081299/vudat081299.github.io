import type { Tag, Transaction } from "@/domain/types";
import { byName } from "@/domain/sort";

export interface TagRank {
  tag: Tag;
  /** how many transactions carry this tag */
  count: number;
  /** 100..900 — the gray-token step this tag's rank inks to (900 = most-used). */
  shade: number;
}

/**
 * Rank the tags by how much the ledger actually uses them. The result drives
 * BOTH the order tags are listed in and how strongly each one is inked (§1:
 * emphasis = contrast, not hue).
 *
 * Ink is a step on the gray scale, chosen by RANK, not raw count: the most-used
 * tag is w900, and the ramp steps evenly down to w100. With `m` used tags the
 * step is (900-100)/(m-1), but `m` is capped at 9 — so the 9th-most-used tag
 * already lands on w100 and everything past it (and every unused tag) stays
 * w100. Positional stepping keeps a busy ledger a clean dark→light gradient
 * instead of bunching every middling tag into one muddy grey.
 */
export function rankTags(tags: Tag[], txs: Transaction[]): TagRank[] {
  const count = new Map<string, number>();
  for (const t of txs) for (const id of t.tagIds) count.set(id, (count.get(id) ?? 0) + 1);
  const ranked = tags
    .map((tag) => ({ tag, count: count.get(tag.id) ?? 0 }))
    .sort((a, b) => b.count - a.count || byName(a.tag, b.tag));
  const used = ranked.filter((r) => r.count > 0).length;
  const m = Math.min(used, 9);
  const step = m > 1 ? 800 / (m - 1) : 0;
  return ranked.map((r, i) => ({
    ...r,
    shade: r.count > 0 && i < 9 ? Math.round(900 - i * step) : 100,
  }));
}

/** The ranks by tag id, for the tables that render one transaction's tags. */
export function tagRankMap(tags: Tag[], txs: Transaction[]): Map<string, TagRank> {
  return new Map(rankTags(tags, txs).map((r) => [r.tag.id, r] as const));
}
