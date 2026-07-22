import { describe, expect, it } from "vitest";
import type { Category, Transaction } from "@/domain/types";
import {
  breakdown,
  foldTailSlices,
  forecastSeries,
  monthlyNetRate,
  OTHER_SLICE_ID,
  pctChange,
  periodInsights,
  walletSeries,
} from "@/domain/analytics";
import type { BreakdownSlice } from "@/domain/analytics";

function tx(over: Partial<Transaction> = {}): Transaction {
  return {
    id: "t1",
    amount: 100,
    type: "expense",
    categoryId: null,
    tagIds: [],
    note: "",
    status: "recorded",
    occurredAt: "2026-03-15",
    createdAt: "2026-03-15T00:00:00.000Z",
    ...over,
  };
}

const cats: Category[] = [
  { id: "food", parentId: null, order: 0, name: "Ăn uống", colorHex: "#f59e0b", icon: "u", type: "expense", isSystem: false },
  { id: "cafe", parentId: "food", order: 0, name: "Cà phê", colorHex: "#f59e0b", icon: "c", type: "expense", isSystem: false },
  { id: "car", parentId: null, order: 1, name: "Di chuyển", colorHex: "#3b82f6", icon: "v", type: "expense", isSystem: false },
];

describe("breakdown", () => {
  it("rolls child categories up into their root", () => {
    const rows = [
      tx({ id: "a", categoryId: "cafe", amount: 30 }),
      tx({ id: "b", categoryId: "food", amount: 70 }),
      tx({ id: "c", categoryId: "car", amount: 50 }),
    ];
    const out = breakdown(rows, "expense", cats);
    // Cà phê is a child of Ăn uống, so its 30 lands on the parent's slice.
    expect(out.map((s) => [s.name, s.total])).toEqual([
      ["Ăn uống", 100],
      ["Di chuyển", 50],
    ]);
    expect(out[0].colorHex).toBe("#f59e0b");
  });

  it("orders the slices largest first", () => {
    const rows = [
      tx({ id: "a", categoryId: "car", amount: 10 }),
      tx({ id: "b", categoryId: "food", amount: 90 }),
    ];
    expect(breakdown(rows, "expense", cats).map((s) => s.pct)).toEqual([0.9, 0.1]);
  });

  it("buckets uncategorised spending on its own", () => {
    const out = breakdown([tx({ categoryId: null })], "expense", cats);
    expect(out[0]).toMatchObject({ id: "__none__", name: "Uncategorised", pct: 1 });
  });

  it("excludes rows that did not move money", () => {
    const rows = [tx({ categoryId: "car", amount: 100 }), tx({ id: "p", categoryId: "car", amount: 900, status: "pending" })];
    expect(breakdown(rows, "expense", cats)[0].total).toBe(100);
  });

  it("returns nothing rather than dividing by zero on an empty ledger", () => {
    expect(breakdown([], "expense", cats)).toEqual([]);
  });
});

describe("foldTailSlices", () => {
  const slice = (id: string, total: number, pct: number): BreakdownSlice => ({
    id,
    name: id,
    colorHex: "#000",
    total,
    pct,
  });

  it("folds the smallest categories whose shares sum to ≤5% into one 'Other'", () => {
    const slices = [
      slice("a", 700, 0.7),
      slice("b", 250, 0.25),
      slice("c", 30, 0.03),
      slice("d", 15, 0.015),
      slice("e", 5, 0.005),
    ];
    const out = foldTailSlices(slices);
    expect(out.map((s) => s.id)).toEqual(["a", "b", OTHER_SLICE_ID]);
    const other = out.find((s) => s.id === OTHER_SLICE_ID)!;
    expect(other.total).toBe(50); // c + d + e
    expect(other.count).toBe(3);
    expect(other.name).toBe("Other");
  });

  it("stops before a category that would push the tail over the budget", () => {
    // c is 6% on its own → it can never join a ≤5% fold, and d+e (2%) is only
    // one-plus-one below it, so nothing folds (a lone slice is left named).
    const slices = [
      slice("a", 800, 0.8),
      slice("c", 60, 0.06),
      slice("d", 15, 0.015),
      slice("e", 5, 0.005),
    ];
    const out = foldTailSlices(slices);
    expect(out.find((s) => s.id === OTHER_SLICE_ID)!.count).toBe(2); // d + e only
    expect(out.some((s) => s.id === "c")).toBe(true); // c survives on its own
  });

  it("leaves the list untouched when only one slice would fold", () => {
    const slices = [slice("a", 600, 0.6), slice("b", 390, 0.39), slice("c", 10, 0.01)];
    expect(foldTailSlices(slices)).toBe(slices);
  });

  it("never folds a list of two", () => {
    const slices = [slice("a", 990, 0.99), slice("b", 10, 0.01)];
    expect(foldTailSlices(slices)).toBe(slices);
  });
});

describe("periodInsights", () => {
  const range = { start: "2026-03-01", end: "2026-03-05" };
  const NOW = new Date("2026-03-05T12:00:00");

  it("reports a typical day (median) apart from the mean, plus the biggest category", () => {
    const rows = [
      tx({ id: "1", categoryId: "car", amount: 100, occurredAt: "2026-03-01" }),
      tx({ id: "2", categoryId: "car", amount: 100, occurredAt: "2026-03-02" }),
      tx({ id: "3", categoryId: "car", amount: 100, occurredAt: "2026-03-03" }),
      tx({ id: "4", categoryId: "car", amount: 100, occurredAt: "2026-03-04" }),
      tx({ id: "5", categoryId: "car", amount: 500, occurredAt: "2026-03-05" }),
    ];
    const ins = periodInsights(rows, range, cats, NOW);
    expect(ins.daysElapsed).toBe(5);
    expect(ins.avgPerDay).toBe(180); // 900 / 5
    expect(ins.medianPerDay).toBe(100); // one big day doesn't move the middle
    expect(ins.dailyCv).toBeGreaterThan(0);
    expect(ins.steadiness).not.toBeNull();
    expect(ins.topCategory).toMatchObject({ name: "Di chuyển", pct: 1 });
  });

  it("has no steadiness to report when nothing was spent", () => {
    const ins = periodInsights([], range, cats, NOW);
    expect(ins.dailyCv).toBeNull();
    expect(ins.steadiness).toBeNull();
    expect(ins.topCategory).toBeNull();
  });
});

describe("pctChange", () => {
  it("is a signed ratio against the previous period", () => {
    expect(pctChange(150, 100)).toBeCloseTo(0.5);
    expect(pctChange(50, 100)).toBeCloseTo(-0.5);
  });

  it("is null when there is no baseline to compare against", () => {
    // "+∞%" against a zero baseline is noise, not information.
    expect(pctChange(100, 0)).toBeNull();
  });
});

describe("walletSeries", () => {
  const range = { start: "2026-03-01", end: "2026-03-10" };

  it("trims dead buckets at both ends but keeps gaps in the middle", () => {
    const rows = [
      tx({ id: "a", occurredAt: "2026-03-03", amount: 10 }),
      tx({ id: "b", occurredAt: "2026-03-07", amount: 20 }),
    ];
    const out = walletSeries(rows, range);
    expect(out[0].key).toBe("2026-03-03");
    expect(out[out.length - 1].key).toBe("2026-03-07");
    expect(out).toHaveLength(5); // 3rd..7th — the quiet days between survive
  });

  it("runs the balance cumulatively across the whole ledger", () => {
    const rows = [
      tx({ id: "in", type: "income", amount: 1000, occurredAt: "2026-03-02" }),
      tx({ id: "out", amount: 400, occurredAt: "2026-03-05" }),
    ];
    const out = walletSeries(rows, range);
    expect(out[0].balance).toBe(1000);
    expect(out[out.length - 1].balance).toBe(600);
  });

  it("splits income and expense per bucket", () => {
    const rows = [
      tx({ id: "in", type: "income", amount: 1000, occurredAt: "2026-03-02" }),
      tx({ id: "out", amount: 400, occurredAt: "2026-03-02" }),
    ];
    const [bucket] = walletSeries(rows, range);
    expect(bucket).toMatchObject({ income: 1000, expense: 400 });
  });

  it("survives an empty ledger", () => {
    expect(() => walletSeries([], range)).not.toThrow();
  });
});

describe("monthlyNetRate", () => {
  it("normalises any window to money-per-average-month", () => {
    // A month and a half of data at 3M net is 2M per average month.
    expect(monthlyNetRate(3_000_000, 45.65625)).toBeCloseTo(2_000_000, 0);
  });

  it("uses a real average month, not a flat 30 days", () => {
    // 30 days is slightly SHORT of an average month (30.4375), so the same net
    // over 30 days implies a slightly larger monthly rate.
    expect(monthlyNetRate(1000, 30)).toBeCloseTo(1014.58, 2);
    expect(monthlyNetRate(1000, 30)).toBeGreaterThan(1000);
  });

  it("is zero rather than Infinity over a zero-length window", () => {
    expect(monthlyNetRate(1000, 0)).toBe(0);
  });
});

describe("forecastSeries", () => {
  const NOW = new Date("2026-03-15T12:00:00");

  it("opens on today's balance and walks the net forward by whole months", () => {
    const out = forecastSeries(1000, 100, 3, NOW);
    expect(out.map((p) => p.balance)).toEqual([1000, 1100, 1200, 1300]);
    expect(out.map((p) => p.key)).toEqual(["2026-03", "2026-04", "2026-05", "2026-06"]);
  });

  it("projects a shrinking balance the same way", () => {
    expect(forecastSeries(1000, -400, 2, NOW).map((p) => p.balance)).toEqual([1000, 600, 200]);
  });

  it("yields just the current point for a zero horizon", () => {
    expect(forecastSeries(1000, 100, 0, NOW)).toHaveLength(1);
  });
});
