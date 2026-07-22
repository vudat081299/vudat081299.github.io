import { describe, expect, it } from "vitest";
import type { Category } from "@/domain/types";
import { canReparent, descendantIds, nextOrder, reorderCategories, rootOf } from "@/domain/category";

function cat(id: string, parentId: string | null, order: number): Category {
  return {
    id,
    parentId,
    order,
    name: id,
    colorHex: "#000",
    icon: "x",
    type: "expense",
    isSystem: false,
  };
}

//  food ── cafe ── beans
//  car
const tree: Category[] = [
  cat("food", null, 0),
  cat("cafe", "food", 0),
  cat("beans", "cafe", 0),
  cat("car", null, 1),
];

describe("descendantIds / rootOf", () => {
  it("collects a node and everything under it, at any depth", () => {
    expect([...descendantIds(tree, "food")].sort()).toEqual(["beans", "cafe", "food"]);
  });

  it("walks a deep child back up to its root", () => {
    expect(rootOf(tree, "beans")?.id).toBe("food");
    expect(rootOf(tree, "car")?.id).toBe("car");
    expect(rootOf(tree, null)).toBeNull();
  });
});

describe("canReparent", () => {
  it("allows a move to the root or to an unrelated branch", () => {
    expect(canReparent(tree, "cafe", null)).toBe(true);
    expect(canReparent(tree, "cafe", "car")).toBe(true);
  });

  it("refuses to drop a category into its own subtree", () => {
    // Allowing this would detach the whole branch from the tree.
    expect(canReparent(tree, "food", "beans")).toBe(false);
    expect(canReparent(tree, "food", "food")).toBe(false);
  });
});

describe("reorderCategories", () => {
  it("renumbers siblings contiguously after a move", () => {
    const out = reorderCategories(tree, "car", "food", "cafe", true)!;
    const kids = out.filter((c) => c.parentId === "food").sort((a, b) => a.order - b.order);
    expect(kids.map((c) => [c.id, c.order])).toEqual([
      ["cafe", 0],
      ["car", 1],
    ]);
  });

  it("places a node before its reference when `after` is false", () => {
    const out = reorderCategories(tree, "car", "food", "cafe", false)!;
    const kids = out.filter((c) => c.parentId === "food").sort((a, b) => a.order - b.order);
    expect(kids.map((c) => c.id)).toEqual(["car", "cafe"]);
  });

  it("appends when there is no reference sibling", () => {
    const out = reorderCategories(tree, "car", "food", null, false)!;
    expect(out.find((c) => c.id === "car")).toMatchObject({ parentId: "food", order: 1 });
  });

  it("returns null rather than corrupting the tree on an illegal move", () => {
    expect(reorderCategories(tree, "food", "beans", null, false)).toBeNull();
    expect(reorderCategories(tree, "ghost", null, null, false)).toBeNull();
  });

  it("leaves every category present", () => {
    const out = reorderCategories(tree, "cafe", null, "car", true)!;
    expect(out).toHaveLength(tree.length);
  });
});

describe("nextOrder", () => {
  it("puts a new child last among its siblings", () => {
    expect(nextOrder(tree, null)).toBe(2);
    expect(nextOrder(tree, "food")).toBe(1);
  });

  it("starts at 0 when there are no siblings yet", () => {
    expect(nextOrder(tree, "beans")).toBe(0);
  });
});
