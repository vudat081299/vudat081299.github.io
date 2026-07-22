import { describe, expect, it } from "vitest";
import type { Category, Transaction } from "@/domain/types";
import { detachTag, filterTx, orphanCategory, totals } from "@/domain/transaction";

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
  { id: "food", parentId: null, order: 0, name: "Ăn uống", colorHex: "#f00", icon: "u", type: "expense", isSystem: false },
  { id: "cafe", parentId: "food", order: 0, name: "Cà phê", colorHex: "#f00", icon: "c", type: "expense", isSystem: false },
  { id: "car", parentId: null, order: 1, name: "Di chuyển", colorHex: "#00f", icon: "v", type: "expense", isSystem: false },
];

describe("totals", () => {
  it("sums income and expense into a net", () => {
    const t = totals([tx({ type: "income", amount: 500 }), tx({ amount: 200 })]);
    expect(t).toEqual({ income: 500, expense: 200, net: 300 });
  });

  it("counts only rows that actually moved money", () => {
    // pending / skipped / failed are shown in the table but must not be summed —
    // a subscription charge you have not confirmed is not money you have spent.
    const t = totals([
      tx({ amount: 100 }),
      tx({ id: "p", amount: 999, status: "pending" }),
      tx({ id: "s", amount: 999, status: "skipped" }),
      tx({ id: "f", amount: 999, status: "failed" }),
    ]);
    expect(t.expense).toBe(100);
  });

  it("treats a legacy row with no status as recorded", () => {
    expect(totals([tx({ status: undefined, amount: 42 })]).expense).toBe(42);
  });
});

describe("filterTx", () => {
  const rows = [
    tx({ id: "a", categoryId: "cafe", amount: 50, note: "Highlands", occurredAt: "2026-03-01" }),
    tx({ id: "b", categoryId: "car", amount: 300, note: "Grab", occurredAt: "2026-03-20" }),
    tx({ id: "c", type: "income", amount: 900, note: "Lương", occurredAt: "2026-03-25" }),
  ];
  const ids = (r: Transaction[]) => r.map((t) => t.id);

  it("narrows by date range, inclusive at both ends", () => {
    expect(ids(filterTx(rows, { range: { start: "2026-03-01", end: "2026-03-20" } }))).toEqual(["a", "b"]);
  });

  it("expands a parent category to its descendants", () => {
    // Filtering by "Ăn uống" must catch the transaction filed under its child.
    expect(ids(filterTx(rows, { categoryIds: ["food"], cats }))).toEqual(["a"]);
  });

  it("filters by amount bounds", () => {
    expect(ids(filterTx(rows, { amountMin: 100, amountMax: 500 }))).toEqual(["b"]);
  });

  it("searches the note case-insensitively", () => {
    expect(ids(filterTx(rows, { search: "grab" }))).toEqual(["b"]);
  });

  it("treats 'all' as no type filter", () => {
    expect(ids(filterTx(rows, { type: "all" }))).toEqual(["a", "b", "c"]);
    expect(ids(filterTx(rows, { type: "income" }))).toEqual(["c"]);
  });

  it("ANDs the criteria together", () => {
    expect(ids(filterTx(rows, { type: "expense", amountMin: 100 }))).toEqual(["b"]);
  });
});

describe("orphanCategory", () => {
  it("empties the category but keeps the transaction", () => {
    const rows = [tx({ id: "a", categoryId: "cafe" }), tx({ id: "b", categoryId: "car" })];
    const out = orphanCategory(rows, new Set(["food", "cafe"]));
    expect(out).toHaveLength(2);
    expect(out[0].categoryId).toBeNull();
    expect(out[1].categoryId).toBe("car");
  });
});

describe("detachTag", () => {
  it("peels the tag off every row wearing it, leaving the others alone", () => {
    const rows = [tx({ id: "a", tagIds: ["x", "y"] }), tx({ id: "b", tagIds: ["y"] })];
    const out = detachTag(rows, "x");
    expect(out[0].tagIds).toEqual(["y"]);
    expect(out[1]).toBe(rows[1]); // untouched rows keep their identity
  });
});
