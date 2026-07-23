import { describe, expect, it } from "vitest";
import type { Loan, LoanPayment } from "@/domain/types";
import {
  daysUntilDue,
  isPaidOff,
  loanNetWorthDelta,
  loanOutstanding,
  loanPaid,
  loanProgress,
  loanSourceIcon,
  loanStatus,
  loanTimeLeft,
  loansNetWorth,
  nextPayment,
  payableSchedule,
  sortLoans,
  totalPayable,
  totalReceivable,
} from "@/domain/loan";

const NOW = new Date("2026-07-23T09:00:00");

function pay(amount: number, date = "2026-01-01", id = "p"): LoanPayment {
  return { id, amount, date, note: "" };
}

function loan(over: Partial<Loan> = {}): Loan {
  return {
    id: "L",
    direction: "borrowed",
    counterparty: "Bank",
    source: "bank",
    principal: 100,
    interestRatePct: 0,
    interestPeriod: "year",
    openedAt: "2026-01-01",
    dueAt: null,
    payments: [],
    colorHex: "#000000",
    icon: "landmark",
    note: "",
    archived: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

describe("loan outstanding + progress", () => {
  it("outstanding = principal − Σ payments", () => {
    const l = loan({ principal: 100, payments: [pay(30, "2026-02-01", "a"), pay(20, "2026-03-01", "b")] });
    expect(loanPaid(l)).toBe(50);
    expect(loanOutstanding(l)).toBe(50);
    expect(loanProgress(l)).toBeCloseTo(0.5);
  });

  it("floors outstanding at 0 on overpayment (never a negative debt)", () => {
    const l = loan({ principal: 100, payments: [pay(120)] });
    expect(loanOutstanding(l)).toBe(0);
    expect(loanProgress(l)).toBe(1);
    expect(isPaidOff(l)).toBe(true);
  });

  it("a fresh loan is fully outstanding and not paid off", () => {
    const l = loan({ principal: 100 });
    expect(loanOutstanding(l)).toBe(100);
    expect(isPaidOff(l)).toBe(false);
    expect(loanProgress(l)).toBe(0);
  });
});

describe("daysUntilDue + status", () => {
  it("returns null when open-ended", () => {
    expect(daysUntilDue(loan({ dueAt: null }), NOW)).toBeNull();
    expect(loanStatus(loan({ dueAt: null }), NOW)).toBe("active");
  });

  it("counts whole days, negative when overdue", () => {
    expect(daysUntilDue(loan({ dueAt: "2026-07-30" }), NOW)).toBe(7);
    expect(daysUntilDue(loan({ dueAt: "2026-07-23" }), NOW)).toBe(0);
    expect(daysUntilDue(loan({ dueAt: "2026-07-13" }), NOW)).toBe(-10);
  });

  it("derives paid / overdue / due-soon / active", () => {
    expect(loanStatus(loan({ principal: 100, payments: [pay(100)] }), NOW)).toBe("paid");
    expect(loanStatus(loan({ dueAt: "2026-07-13" }), NOW)).toBe("overdue"); // past + owed
    expect(loanStatus(loan({ dueAt: "2026-07-27" }), NOW)).toBe("due-soon"); // within 7d
    expect(loanStatus(loan({ dueAt: "2026-09-01" }), NOW)).toBe("active");
  });

  it("a paid loan is never overdue even past its due date", () => {
    const l = loan({ dueAt: "2026-07-13", principal: 100, payments: [pay(100)] });
    expect(loanStatus(l, NOW)).toBe("paid");
  });
});

describe("loanTimeLeft (round DOWN to the nearest half)", () => {
  it("returns null for a non-positive day count", () => {
    expect(loanTimeLeft(0)).toBeNull();
    expect(loanTimeLeft(-5)).toBeNull();
  });

  it("keeps short spans in whole days", () => {
    expect(loanTimeLeft(1)).toEqual({ value: 1, unit: "day", approx: false });
    expect(loanTimeLeft(20)).toEqual({ value: 20, unit: "day", approx: false });
    expect(loanTimeLeft(31)).toEqual({ value: 31, unit: "day", approx: false });
  });

  it("rounds months DOWN, never up (65d → 2, 55d → 1,5)", () => {
    expect(loanTimeLeft(65)).toEqual({ value: 2, unit: "month", approx: false });
    expect(loanTimeLeft(55)).toEqual({ value: 1.5, unit: "month", approx: true });
    // 32d = 1.05 months → floors to a clean 1, not up to 1.5
    expect(loanTimeLeft(32)).toEqual({ value: 1, unit: "month", approx: false });
    // 59d = 1.94 months → floors to 1.5, never rounds up to 2
    expect(loanTimeLeft(59)).toEqual({ value: 1.5, unit: "month", approx: true });
  });

  it("switches to years at a full year, still rounding down", () => {
    expect(loanTimeLeft(365)).toEqual({ value: 1, unit: "year", approx: false });
    expect(loanTimeLeft(550)).toEqual({ value: 1.5, unit: "year", approx: true });
    // 729d = 1.99 years → floors to 1.5, not up to 2
    expect(loanTimeLeft(729)).toEqual({ value: 1.5, unit: "year", approx: true });
  });
});

describe("payableSchedule", () => {
  // NOW = 2026-07-23. Buckets: overdue (<0), within30 (0..30), within60 (31..60),
  // later (>60 or open-ended). Only non-archived BORROWED loans with outstanding.
  const loans: Loan[] = [
    loan({ id: "od", direction: "borrowed", principal: 100, dueAt: "2026-07-13" }), // -10 → overdue
    loan({ id: "w30", direction: "borrowed", principal: 200, dueAt: "2026-08-10" }), // +18 → within30
    loan({ id: "w60", direction: "borrowed", principal: 400, dueAt: "2026-09-01" }), // +40 → within60
    loan({ id: "later", direction: "borrowed", principal: 800, dueAt: "2026-12-01" }), // far → later
    loan({ id: "open", direction: "borrowed", principal: 1000, dueAt: null }), // open-ended → later
    loan({ id: "lent", direction: "lent", principal: 500, dueAt: "2026-08-01" }), // excluded (owed to me)
    loan({ id: "paidoff", direction: "borrowed", principal: 100, payments: [pay(100)], dueAt: "2026-08-01" }), // no outstanding
    loan({ id: "arch", direction: "borrowed", principal: 999, dueAt: "2026-08-01", archived: true }), // excluded
  ];

  it("buckets each debt once, by when it's due", () => {
    expect(payableSchedule(loans, NOW)).toEqual({
      overdue: 100,
      within30: 200,
      within60: 400,
      later: 1800, // 800 dated far out + 1000 open-ended
      total: 2500,
    });
  });

  it("total matches totalPayable", () => {
    expect(payableSchedule(loans, NOW).total).toBe(totalPayable(loans));
  });
});

describe("nextPayment", () => {
  const NOW2 = new Date("2026-07-23T09:00:00");
  it("picks the soonest upcoming borrowed debt with outstanding", () => {
    const loans: Loan[] = [
      loan({ id: "od", direction: "borrowed", principal: 100, dueAt: "2026-07-13" }), // overdue → skipped
      loan({ id: "soon", direction: "borrowed", principal: 200, dueAt: "2026-07-30" }), // +7
      loan({ id: "later", direction: "borrowed", principal: 400, dueAt: "2026-09-01" }),
      loan({ id: "lent", direction: "lent", principal: 999, dueAt: "2026-07-25" }), // excluded
    ];
    expect(nextPayment(loans, NOW2)).toEqual({
      loan: expect.objectContaining({ id: "soon" }),
      days: 7,
      amount: 200,
    });
  });

  it("returns null when only overdue / open-ended debts remain", () => {
    const loans: Loan[] = [
      loan({ id: "od", direction: "borrowed", principal: 100, dueAt: "2026-07-13" }),
      loan({ id: "open", direction: "borrowed", principal: 100, dueAt: null }),
    ];
    expect(nextPayment(loans, NOW2)).toBeNull();
  });
});

describe("net worth", () => {
  it("borrowed subtracts, lent adds (by outstanding)", () => {
    expect(loanNetWorthDelta(loan({ direction: "borrowed", principal: 100 }))).toBe(-100);
    expect(loanNetWorthDelta(loan({ direction: "lent", principal: 100 }))).toBe(100);
  });

  it("aggregates payable / receivable and nets them, ignoring archived", () => {
    const loans = [
      loan({ id: "a", direction: "borrowed", principal: 100, payments: [pay(40)] }), // owe 60
      loan({ id: "b", direction: "borrowed", principal: 50 }), // owe 50
      loan({ id: "c", direction: "lent", principal: 80, payments: [pay(30)] }), // receive 50
      loan({ id: "d", direction: "borrowed", principal: 999, archived: true }), // ignored
    ];
    expect(totalPayable(loans)).toBe(110);
    expect(totalReceivable(loans)).toBe(50);
    expect(loansNetWorth(loans)).toBe(-60); // 50 − 110
    expect(totalPayable(loans, { includeArchived: true })).toBe(1109);
  });
});

describe("sortLoans", () => {
  it("orders overdue → due-soon → active → paid", () => {
    const loans = [
      loan({ id: "paid", principal: 100, payments: [pay(100)] }),
      loan({ id: "active", dueAt: "2026-12-01" }),
      loan({ id: "overdue", dueAt: "2026-07-01" }),
      loan({ id: "soon", dueAt: "2026-07-26" }),
    ];
    expect(sortLoans(loans, NOW).map((l) => l.id)).toEqual(["overdue", "soon", "active", "paid"]);
  });
});

describe("loanSourceIcon", () => {
  it("maps each source to a curated key", () => {
    expect(loanSourceIcon("personal")).toBe("users");
    expect(loanSourceIcon("card")).toBe("credit-card");
    expect(loanSourceIcon("bank")).toBe("landmark");
    expect(loanSourceIcon("other")).toBe("hand-coins");
  });
});
