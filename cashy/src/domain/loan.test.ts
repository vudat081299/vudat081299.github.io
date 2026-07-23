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
  loansNetWorth,
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
