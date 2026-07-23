import { describe, expect, it } from "vitest";
import { formatMoney, formatMoneyShort, parseMoney, toVnd, toVndNonNeg } from "@/domain/money";

describe("formatMoney", () => {
  it("groups digits vi-VN and appends the unit", () => {
    expect(formatMoney(18785000)).toBe("18.785.000 đ");
  });
  it("rounds to a whole đồng and treats junk as 0", () => {
    expect(formatMoney(100.6)).toBe("101 đ");
    expect(formatMoney(NaN)).toBe("0 đ");
  });
});

describe("formatMoneyShort", () => {
  it("uses k/m/b magnitude letters and drops đ once a letter carries the unit", () => {
    expect(formatMoneyShort(890000)).toBe("890k");
    expect(formatMoneyShort(3400000)).toBe("3,4m");
    expect(formatMoneyShort(1200000000)).toBe("1,2b");
  });
  it("keeps đ only for the sub-1.000 form that has no letter", () => {
    expect(formatMoneyShort(500)).toBe("500 đ");
  });
  it("drops a trailing ,0 on a whole magnitude and carries the sign", () => {
    expect(formatMoneyShort(5000000)).toBe("5m");
    expect(formatMoneyShort(-2000000)).toBe("-2m");
  });
});

describe("toVnd / toVndNonNeg — the one place money is coerced to integer đồng", () => {
  it("rounds to the nearest đồng", () => {
    expect(toVnd(100.4)).toBe(100);
    expect(toVnd(100.6)).toBe(101);
  });
  it("treats a missing / NaN input as 0", () => {
    expect(toVnd(NaN)).toBe(0);
    expect(toVnd(undefined as unknown as number)).toBe(0);
  });
  it("keeps a signed value (a wallet may start in the red)", () => {
    expect(toVnd(-5000)).toBe(-5000);
  });
  it("toVndNonNeg clamps a negative up to 0 but still rounds", () => {
    expect(toVndNonNeg(-5000)).toBe(0);
    expect(toVndNonNeg(2500.9)).toBe(2501);
  });
});

describe("parseMoney", () => {
  it("keeps only digits", () => {
    expect(parseMoney("1.500.000 đ")).toBe(1500000);
    expect(parseMoney("")).toBe(0);
  });
});
