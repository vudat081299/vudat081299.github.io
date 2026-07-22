import { describe, expect, it } from "vitest";
import type { Subscription, Transaction } from "@/domain/types";
import {
  chargesSurvivingDeletion,
  cyclesOwed,
  dueCharges,
  firstUnpaidCycle,
  isLapsed,
  needsPaymentNow,
  nextPaymentDate,
  paymentsDrifted,
  paymentsOf,
  startCycle,
} from "@/domain/subscription";

// These tests exist because the billing rule used to live inside the store,
// where reaching it meant booting localStorage. It is a pure function now, so
// "what does a yearly plan owe on 15 March" is a question we can just ask.

function sub(over: Partial<Subscription> = {}): Subscription {
  return {
    id: "s1",
    name: "Netflix",
    amount: 260_000,
    interval: "monthly",
    dayOfMonth: 6,
    categoryId: null,
    tagIds: [],
    colorHex: "#000",
    icon: "tv",
    note: "",
    active: true,
    startedAt: "2026-01-06",
    lastPaidAt: null,
    paymentTxIds: [],
    createdAt: "2026-01-06T00:00:00.000Z",
    ...over,
  };
}

function charge(over: Partial<Transaction> = {}): Transaction {
  return {
    id: "t1",
    amount: 260_000,
    type: "expense",
    categoryId: null,
    tagIds: [],
    note: "Netflix",
    status: "recorded",
    occurredAt: "2026-01-06",
    createdAt: "2026-01-06T00:00:00.000Z",
    subscriptionId: "s1",
    subMonth: "2026-01",
    ...over,
  };
}

const AT = (ymd: string) => new Date(`${ymd}T12:00:00`);

describe("dueCharges", () => {
  it("raises one pending charge per cycle that has come due", () => {
    // Subscribed 6 Jan, today is 20 Mar → Jan, Feb and Mar have all billed.
    const out = dueCharges([sub()], [], AT("2026-03-20"));
    expect(out.map((c) => c.subMonth)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(out.every((c) => c.status === "pending")).toBe(true);
    expect(out.every((c) => c.type === "expense")).toBe(true);
  });

  it("does not raise a cycle whose billing day has not arrived", () => {
    // Billing day is the 6th; on the 5th of the start month nothing is owed yet.
    expect(dueCharges([sub()], [], AT("2026-01-05"))).toEqual([]);
  });

  it("is idempotent — a cycle already carrying a charge is never raised twice", () => {
    const existing = [charge({ subMonth: "2026-01" }), charge({ id: "t2", subMonth: "2026-02" })];
    const out = dueCharges([sub()], existing, AT("2026-03-20"));
    expect(out.map((c) => c.subMonth)).toEqual(["2026-03"]);
  });

  it("starts from the last payment, so an old subscription does not backfill a year", () => {
    // Subscribed Jan 2025, paid up to Jan 2026. Only Feb and Mar 2026 are owed —
    // NOT the twelve months in between.
    const s = sub({ startedAt: "2025-01-06", lastPaidAt: "2026-01-06" });
    const out = dueCharges([s], [], AT("2026-03-20"));
    expect(out.map((c) => c.subMonth)).toEqual(["2026-02", "2026-03"]);
  });

  it("ignores paused subscriptions", () => {
    expect(dueCharges([sub({ active: false })], [], AT("2026-03-20"))).toEqual([]);
  });

  it("bills a yearly plan once a year, on its own month", () => {
    const s = sub({ interval: "yearly", monthOfYear: 3, dayOfMonth: 15, startedAt: "2025-01-01" });
    const out = dueCharges([s], [], AT("2026-06-01"));
    expect(out.map((c) => c.subMonth)).toEqual(["2025-03", "2026-03"]);
  });

  it("does not backdate a yearly plan subscribed after its billing month", () => {
    // Signed up in June for a plan that bills in March: the first cycle is next
    // March, not a March that had already passed when they subscribed.
    const s = sub({ interval: "yearly", monthOfYear: 3, dayOfMonth: 15, startedAt: "2026-06-01" });
    expect(startCycle(s)).toBe("2027-03");
    expect(dueCharges([s], [], AT("2026-12-31"))).toEqual([]);
  });

  it("carries the subscription's category, tags and amount onto the charge", () => {
    const s = sub({ categoryId: "c1", tagIds: ["t1", "t2"], amount: 99_000 });
    const [c] = dueCharges([s], [], AT("2026-01-06"));
    expect(c).toMatchObject({ categoryId: "c1", tagIds: ["t1", "t2"], amount: 99_000 });
  });
});

describe("re-gridding after the billing date is edited", () => {
  // The editor lets a plan with payment history change its billing month, which
  // re-anchors every cycle. Option A: keep the history, re-grid from the new
  // date, and accept one odd-length cycle. What must NOT happen is the next due
  // cycle being silently skipped because the old payment no longer sits on the
  // grid.
  const yearlyMarch = sub({
    interval: "yearly",
    monthOfYear: 3,
    dayOfMonth: 15,
    startedAt: "2024-03-15",
    lastPaidAt: "2026-03-15",
  });
  const NOW = AT("2026-07-22");

  it("bills nothing while the plan is settled on its original grid", () => {
    expect(firstUnpaidCycle(yearlyMarch)).toBe("2027-03");
    expect(needsPaymentNow(yearlyMarch, NOW)).toBe(false);
  });

  it("re-grids onto the new date and bills the cycle that has come due", () => {
    // March → June. June 2026 has already passed, and was never paid.
    const moved = { ...yearlyMarch, monthOfYear: 6 };
    expect(startCycle(moved)).toBe("2024-06");
    expect(firstUnpaidCycle(moved)).toBe("2026-06"); // was "2027-03" — off-grid
    expect(needsPaymentNow(moved, NOW)).toBe(true);
    expect(dueCharges([moved], [], NOW).map((c) => c.subMonth)).toEqual(["2026-06"]);
  });

  it("raises exactly one catch-up charge, not one per intervening month", () => {
    const moved = { ...yearlyMarch, monthOfYear: 6 };
    expect(dueCharges([moved], [], NOW)).toHaveLength(1);
  });

  it("moving the date forward past today owes nothing yet", () => {
    // March → November: this year's November has not arrived.
    const moved = { ...yearlyMarch, monthOfYear: 11 };
    expect(needsPaymentNow(moved, NOW)).toBe(false);
    expect(dueCharges([moved], [], NOW)).toEqual([]);
  });

  it("treats the re-gridded plan as due, not lapsed", () => {
    // One cycle owed is a bill on the doormat, not a service the provider cut off.
    const moved = { ...yearlyMarch, monthOfYear: 6 };
    expect(isLapsed(moved, NOW)).toBe(false);
    expect(cyclesOwed(moved, NOW)).toBe(1);
  });
});

describe("firstUnpaidCycle — regression guards", () => {
  it("still advances one month for an ordinary monthly plan", () => {
    expect(firstUnpaidCycle(sub({ lastPaidAt: "2026-01-06" }))).toBe("2026-02");
  });

  it("counts a payment made EARLY as paying that cycle", () => {
    // Billing day is the 6th; paying on the 3rd settles February, so the next
    // owed cycle is March — not February all over again.
    expect(firstUnpaidCycle(sub({ lastPaidAt: "2026-02-03" }))).toBe("2026-03");
  });

  it("counts a payment made LATE as paying that cycle", () => {
    expect(firstUnpaidCycle(sub({ lastPaidAt: "2026-02-25" }))).toBe("2026-03");
  });

  it("falls back to the first cycle when the payment predates the plan", () => {
    const s = sub({ startedAt: "2026-06-06", lastPaidAt: "2025-01-06" });
    expect(firstUnpaidCycle(s)).toBe(startCycle(s));
  });

  it("leaves a stable yearly plan on its own grid", () => {
    const s = sub({
      interval: "yearly", monthOfYear: 3, dayOfMonth: 15,
      startedAt: "2024-03-15", lastPaidAt: "2026-03-15",
    });
    expect(firstUnpaidCycle(s)).toBe("2027-03");
  });
});

describe("needsPaymentNow / isLapsed", () => {
  it("is due on the billing day, and not the day before", () => {
    expect(needsPaymentNow(sub(), AT("2026-01-05"))).toBe(false);
    expect(needsPaymentNow(sub(), AT("2026-01-06"))).toBe(true);
  });

  it("is due but not lapsed inside the first unpaid cycle", () => {
    const at = AT("2026-01-20");
    expect(needsPaymentNow(sub(), at)).toBe(true);
    expect(isLapsed(sub(), at)).toBe(false);
  });

  it("is lapsed once a whole cycle has gone by unpaid", () => {
    expect(isLapsed(sub(), AT("2026-02-20"))).toBe(true);
  });

  it("never chases a paused subscription", () => {
    const s = sub({ active: false });
    expect(needsPaymentNow(s, AT("2026-06-01"))).toBe(false);
    expect(isLapsed(s, AT("2026-06-01"))).toBe(false);
    expect(cyclesOwed(s, AT("2026-06-01"))).toBe(0);
  });

  it("counts every cycle owed", () => {
    expect(cyclesOwed(sub(), AT("2026-03-20"))).toBe(3);
  });
});

describe("nextPaymentDate", () => {
  it("is the day an outstanding bill fell due — a date in the past", () => {
    // Reporting "next payment in three weeks" while a bill sits unpaid is a lie.
    expect(nextPaymentDate(sub())).toBe("2026-01-06");
  });

  it("is the end of the running cycle once the service is settled", () => {
    expect(nextPaymentDate(sub({ lastPaidAt: "2026-01-06" }))).toBe("2026-02-06");
  });
});

describe("paymentsOf", () => {
  it("reads only the confirmed charges, oldest first", () => {
    const txs = [
      charge({ id: "b", occurredAt: "2026-02-06", subMonth: "2026-02" }),
      charge({ id: "a", occurredAt: "2026-01-06", subMonth: "2026-01" }),
      charge({ id: "p", occurredAt: "2026-03-06", status: "pending", subMonth: "2026-03" }),
      charge({ id: "s", occurredAt: "2026-04-06", status: "skipped", subMonth: "2026-04" }),
    ];
    expect(paymentsOf("s1", txs)).toEqual({
      paymentTxIds: ["a", "b"],
      lastPaidAt: "2026-02-06",
    });
  });

  it("treats a legacy row with no status as recorded", () => {
    const legacy = charge({ id: "old", status: undefined });
    expect(paymentsOf("s1", [legacy]).paymentTxIds).toEqual(["old"]);
  });

  it("reports never-paid as null rather than a fabricated date", () => {
    expect(paymentsOf("s1", []).lastPaidAt).toBeNull();
  });

  it("ignores charges belonging to another subscription", () => {
    expect(paymentsOf("s1", [charge({ subscriptionId: "other" })]).paymentTxIds).toEqual([]);
  });
});

describe("paymentsDrifted", () => {
  const history = { paymentTxIds: ["a", "b"], lastPaidAt: "2026-02-06" };

  it("is false when the cache still matches the ledger", () => {
    expect(paymentsDrifted(sub(history), history)).toBe(false);
  });

  it("catches a changed date, a changed length and a changed order", () => {
    expect(paymentsDrifted(sub(history), { ...history, lastPaidAt: "2026-03-06" })).toBe(true);
    expect(paymentsDrifted(sub(history), { ...history, paymentTxIds: ["a"] })).toBe(true);
    expect(paymentsDrifted(sub(history), { ...history, paymentTxIds: ["b", "a"] })).toBe(true);
  });
});

describe("chargesSurvivingDeletion", () => {
  it("keeps recorded charges — money spent was still spent", () => {
    const txs = [
      charge({ id: "paid", status: "recorded" }),
      charge({ id: "pending", status: "pending" }),
      charge({ id: "skipped", status: "skipped" }),
      charge({ id: "elsewhere", subscriptionId: "s2", status: "pending" }),
    ];
    expect(chargesSurvivingDeletion(txs, "s1").map((t) => t.id)).toEqual(["paid", "elsewhere"]);
  });
});
