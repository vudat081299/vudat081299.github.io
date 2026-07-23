import { describe, expect, it } from "vitest";
import { formatPercent } from "@/domain/format";

describe("formatPercent", () => {
  it("takes a ratio and returns an integer percent by default", () => {
    expect(formatPercent(0.128)).toBe("13%");
    expect(formatPercent(0.5)).toBe("50%");
  });
  it("shows one vi-VN decimal (comma) when asked, dropping a trailing ,0", () => {
    expect(formatPercent(0.128, 1)).toBe("12,8%");
    expect(formatPercent(0.12, 1)).toBe("12%");
  });
  it("treats a missing input as 0%", () => {
    expect(formatPercent(NaN)).toBe("0%");
  });
});
