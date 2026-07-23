import { describe, expect, it } from "vitest";
import type { Subscription, Transaction } from "@/domain/types";
import {
  chargesSurvivingCancel,
  chargesSurvivingDeletion,
  cyclesOwed,
  dueCharges,
  firstBillableCycle,
  firstCycleProration,
  firstUnpaidCycle,
  inTrial,
  isLapsed,
  needsPaymentNow,
  nextPaymentDate,
  paymentsDrifted,
  paymentsOf,
  planCatchUp,
  sortSubscriptions,
  startCycle,
  subState,
  trialCycle,
  trialEndDate,
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

/**
 * The ledger the app would actually be holding for `s` at `now`: every cycle
 * that has come due, raised as a pending charge — which is exactly what
 * `syncSubscriptions` does on mount. `needsPaymentNow` and friends read the
 * charges rather than `lastPaidAt`, so a test that asks "is this due?" has to
 * hand them the same ledger the screen would have.
 */
function ledger(s: Subscription, now: Date): Transaction[] {
  return dueCharges([s], [], now).map((c, i) => ({
    ...c,
    id: `auto${i}`,
    createdAt: `${c.occurredAt}T00:00:00.000Z`,
  }));
}

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
    expect(needsPaymentNow(yearlyMarch, ledger(yearlyMarch, NOW), NOW)).toBe(false);
  });

  it("re-grids onto the new date and bills the cycle that has come due", () => {
    // March → June. June 2026 has already passed, and was never paid.
    const moved = { ...yearlyMarch, monthOfYear: 6 };
    expect(startCycle(moved)).toBe("2024-06");
    expect(firstUnpaidCycle(moved)).toBe("2026-06"); // was "2027-03" — off-grid
    expect(needsPaymentNow(moved, ledger(moved, NOW), NOW)).toBe(true);
    expect(dueCharges([moved], [], NOW).map((c) => c.subMonth)).toEqual(["2026-06"]);
  });

  it("raises exactly one catch-up charge, not one per intervening month", () => {
    const moved = { ...yearlyMarch, monthOfYear: 6 };
    expect(dueCharges([moved], [], NOW)).toHaveLength(1);
  });

  it("moving the date forward past today owes nothing yet", () => {
    // March → November: this year's November has not arrived.
    const moved = { ...yearlyMarch, monthOfYear: 11 };
    expect(needsPaymentNow(moved, ledger(moved, NOW), NOW)).toBe(false);
    expect(dueCharges([moved], [], NOW)).toEqual([]);
  });

  it("treats the re-gridded plan as due, not lapsed", () => {
    // One cycle owed is a bill on the doormat, not a service the provider cut off.
    const moved = { ...yearlyMarch, monthOfYear: 6 };
    expect(isLapsed(moved, ledger(moved, NOW), NOW)).toBe(false);
    expect(cyclesOwed(moved, ledger(moved, NOW), NOW)).toBe(1);
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
  const at = (d: string) => {
    const now = AT(d);
    return [sub(), ledger(sub(), now), now] as const;
  };

  it("is due on the billing day, and not the day before", () => {
    expect(needsPaymentNow(...at("2026-01-05"))).toBe(false);
    expect(needsPaymentNow(...at("2026-01-06"))).toBe(true);
  });

  it("is due but not lapsed inside the first unpaid cycle", () => {
    expect(needsPaymentNow(...at("2026-01-20"))).toBe(true);
    expect(isLapsed(...at("2026-01-20"))).toBe(false);
  });

  it("is lapsed once a whole cycle has gone by unpaid", () => {
    expect(isLapsed(...at("2026-02-20"))).toBe(true);
  });

  it("never chases a paused subscription", () => {
    const s = sub({ active: false });
    const now = AT("2026-06-01");
    expect(needsPaymentNow(s, ledger(s, now), now)).toBe(false);
    expect(isLapsed(s, ledger(s, now), now)).toBe(false);
    expect(cyclesOwed(s, ledger(s, now), now)).toBe(0);
  });

  it("counts every cycle owed", () => {
    expect(cyclesOwed(...at("2026-03-20"))).toBe(3);
  });

  it("keeps an older cycle owed when a newer one is settled out of order", () => {
    // The bug this whole ledger-based reading exists to kill. Jan, Feb and Mar
    // are owed; the user confirms FEBRUARY only. Read from `lastPaidAt` the
    // subscription then looks settled through February and quietly stops asking
    // — while January's pending charge is still sitting in the ledger nagging
    // from the dues list. It must stay due, and it must still name January.
    const now = AT("2026-03-20");
    const s = sub({ lastPaidAt: "2026-02-06" });
    const txs = ledger(sub(), now).map((t) =>
      t.subMonth === "2026-02" ? { ...t, status: "recorded" as const } : t,
    );
    expect(needsPaymentNow(s, txs, now)).toBe(true);
    expect(cyclesOwed(s, txs, now)).toBe(2); // Jan and Mar
    expect(isLapsed(s, txs, now)).toBe(true); // January is a whole cycle behind
    expect(nextPaymentDate(s, txs, now)).toBe("2026-01-06"); // not February's successor
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

describe("firstCycleProration", () => {
  const monthly = { amount: 300_000, dayOfMonth: 1, interval: "monthly" as const };

  it("charges a fraction of the cycle when you join part-way through", () => {
    // Billing anchors on the 1st; joining on 16 Jan covers 16 Jan → 1 Feb.
    const p = firstCycleProration({ ...monthly, startedAt: "2026-01-16" });
    expect(p).not.toBeNull();
    expect(p!.total).toBe(31); // 1 Jan → 1 Feb
    expect(p!.days).toBe(16); // 16 Jan → 1 Feb
    expect(p!.amount).toBe(Math.round((300_000 * 16) / 31));
  });

  it("has nothing to prorate when you join on the anchor itself", () => {
    expect(firstCycleProration({ ...monthly, startedAt: "2026-01-01" })).toBeNull();
  });

  it("never prorates a yearly plan — its first cycle is always still ahead", () => {
    // Joining in March on a January-billing plan: `startCycle` pushes the first
    // cycle to Jan 2027 rather than backdating Jan 2026, so the whole first cycle
    // lies in the future and is billed in full. There is no part-period to charge.
    expect(
      firstCycleProration({
        amount: 1_200_000,
        startedAt: "2026-03-15",
        dayOfMonth: 1,
        interval: "yearly",
        monthOfYear: 1,
      }),
    ).toBeNull();
  });

  it("bills only the FIRST cycle at the reduced rate", () => {
    const s = sub({ startedAt: "2026-01-16", dayOfMonth: 1, firstCycleAmount: 100_000 });
    const out = dueCharges([s], [], AT("2026-03-20"));
    expect(out.map((c) => c.amount)).toEqual([100_000, 260_000, 260_000]);
  });
});

describe("free trial", () => {
  // Subscribed 6 Jan, three months free → first charge 6 Apr.
  const trialSub = sub({ startedAt: "2026-01-06", trialMonths: 3 });

  it("ends the trial `trialMonths` on from the start date", () => {
    expect(trialEndDate(trialSub)).toBe("2026-04-06");
    expect(trialEndDate(sub())).toBeNull(); // no trial → no end date
  });

  it("bills from the first cycle on or after the trial end", () => {
    expect(firstBillableCycle(trialSub)).toBe("2026-04");
    expect(firstUnpaidCycle(trialSub)).toBe("2026-04");
  });

  it("is in trial strictly before the end date, and out of it on the day", () => {
    expect(inTrial(trialSub, AT("2026-02-01"))).toBe(true);
    expect(inTrial(trialSub, AT("2026-04-05"))).toBe(true);
    expect(inTrial(trialSub, AT("2026-04-06"))).toBe(false); // charge day = out
  });

  it("raises no charge while the trial is running", () => {
    // 20 Mar is inside the free window — Jan/Feb/Mar are all free.
    expect(dueCharges([trialSub], [], AT("2026-03-20"))).toEqual([]);
    expect(needsPaymentNow(trialSub, ledger(trialSub, AT("2026-03-20")), AT("2026-03-20"))).toBe(
      false,
    );
  });

  it("bills only the cycles from the trial end onward", () => {
    // By 20 May: Apr and May have billed; Jan–Mar stay free and are never raised.
    const out = dueCharges([trialSub], [], AT("2026-05-20"));
    expect(out.map((c) => c.subMonth)).toEqual(["2026-04", "2026-05"]);
  });

  it("points the next payment at the first charge date during the trial", () => {
    expect(nextPaymentDate(trialSub, [], AT("2026-02-15"))).toBe("2026-04-06");
  });

  it("trialCycle charts the free window and is null without a trial", () => {
    expect(trialCycle(sub())).toBeNull();
    // 90 days from 6 Jan to 6 Apr; on 5 Feb, 30 have elapsed.
    const tc = trialCycle(trialSub, AT("2026-02-05"))!;
    expect(tc.start).toBe("2026-01-06");
    expect(tc.end).toBe("2026-04-06");
    expect(tc.totalDays).toBe(90);
    expect(tc.elapsedDays).toBe(30);
    expect(tc.remainingDays).toBe(60);
    expect(tc.started).toBe(true);
  });
});

describe("subState / sortSubscriptions", () => {
  it("labels each service by its one bucket", () => {
    // No trial, up to date, before its first bill → plain active.
    const active = sub({ startedAt: "2026-07-01", dayOfMonth: 1 });
    expect(subState(active, [], AT("2026-07-01"))).toBe("active");

    // In its free window → trial.
    const trial = sub({ startedAt: "2026-07-01", trialMonths: 2 });
    expect(subState(trial, [], AT("2026-07-10"))).toBe("trial");

    // Cancelled outranks everything else.
    expect(subState(sub({ active: false }), [], AT("2026-07-10"))).toBe("cancelled");

    // A cycle has billed and sits pending → due.
    const dueSub = sub({ startedAt: "2026-06-06" });
    const dueLedger = ledger(dueSub, AT("2026-06-10"));
    expect(subState(dueSub, dueLedger, AT("2026-06-10"))).toBe("due");
  });

  it("orders urgent → calm, then by name within a bucket", () => {
    const now = AT("2026-07-10");
    const cancelled = sub({ id: "c", name: "AAA cancelled", active: false });
    const active1 = sub({ id: "a1", name: "Zeta", startedAt: "2026-08-01", dayOfMonth: 1 });
    const active2 = sub({ id: "a2", name: "Alpha", startedAt: "2026-08-01", dayOfMonth: 1 });
    const ordered = sortSubscriptions([cancelled, active1, active2], [], now);
    // Both active plans sort before the cancelled one despite its earlier name;
    // within the active bucket, Alpha precedes Zeta.
    expect(ordered.map((s) => s.id)).toEqual(["a2", "a1", "c"]);
  });
});

describe("planCatchUp", () => {
  // Five owed cycles, Jan → May, in the order the dialog lists them.
  const rows = (answers: Array<[used: boolean, paid: boolean]>) =>
    answers.map(([used, paid], i) => ({
      txId: `t${i + 1}`,
      month: `2026-0${i + 1}`,
      used,
      paid,
    }));
  const ALL_USED_UNPAID = rows([
    [true, false],
    [true, false],
    [true, false],
    [true, false],
    [true, false],
  ]);

  it("records the ticked cycles and skips the switched-off ones", () => {
    const plan = planCatchUp(
      rows([
        [true, true],
        [false, false],
        [true, false],
      ]),
    );
    expect(plan.pay).toEqual(["t1"]);
    expect(plan.skip).toEqual(["t2"]);
    expect(plan.problem).toBeNull();
  });

  it("accepts any prefix of the timeline — the oldest debts settled first", () => {
    for (const n of [1, 2, 3, 4, 5]) {
      const plan = planCatchUp(ALL_USED_UNPAID.map((r, i) => ({ ...r, paid: i < n })));
      expect(plan.problem).toBeNull();
      expect(plan.pay).toHaveLength(n);
    }
  });

  it("refuses to pay a later cycle while an earlier one stands unpaid", () => {
    // Paying only February with January still owed: a provider paid in February
    // while January is outstanding has been paid for JANUARY.
    const plan = planCatchUp(ALL_USED_UNPAID.map((r, i) => ({ ...r, paid: i === 1 })));
    expect(plan.problem).toMatch(/oldest cycle first/);
  });

  it("lets a skipped cycle sit anywhere — it is not a debt", () => {
    // January not used at all, February paid. Nothing is owed before February,
    // so this is in order despite the gap.
    const plan = planCatchUp(
      rows([
        [false, false],
        [true, true],
        [true, false],
      ]),
    );
    expect(plan.problem).toBeNull();
    expect(plan.pay).toEqual(["t2"]);
    expect(plan.skip).toEqual(["t1"]);
  });

  it("reads every cycle switched off as cancelling the service", () => {
    const plan = planCatchUp(
      rows([
        [false, false],
        [false, false],
      ]),
    );
    expect(plan.cancelling).toBe(true);
    expect(plan.skip).toHaveLength(2);
    expect(plan.problem).toBeNull();
  });

  it("has nothing to submit when the user changed nothing", () => {
    const plan = planCatchUp(ALL_USED_UNPAID);
    expect(plan.cancelling).toBe(false);
    expect(plan.problem).toBe("No changes to save.");
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

describe("chargesSurvivingCancel", () => {
  // Billing on the 6th; Jan, Feb and Mar were all raised and never settled.
  const s = sub();
  const owed = ["2026-01", "2026-02", "2026-03"].map((m, i) =>
    charge({ id: `p${i}`, status: "pending", subMonth: m, occurredAt: `${m}-06` }),
  );

  it("drops the cycles that would have billed on or after the stop date", () => {
    // Stopped 20 Feb: March (bills 6 Mar) never happened.
    const out = chargesSurvivingCancel(owed, s, "2026-02-20");
    expect(out.map((t) => t.subMonth)).toEqual(["2026-01", "2026-02"]);
  });

  it("keeps a cycle that had already billed when the service stopped", () => {
    // Stopped 10 Feb, after February's 6th — that period WAS used, so it is
    // still owed even though the service is now off.
    const out = chargesSurvivingCancel(owed, s, "2026-02-10");
    expect(out.map((t) => t.subMonth)).toContain("2026-02");
  });

  it("never rewrites settled history", () => {
    const history = [
      charge({ id: "paid", status: "recorded", subMonth: "2026-05" }),
      charge({ id: "skipped", status: "skipped", subMonth: "2026-06" }),
    ];
    // Both cycles bill long after the stop date and would be dropped if pending.
    expect(chargesSurvivingCancel(history, s, "2026-01-01").map((t) => t.id)).toEqual([
      "paid",
      "skipped",
    ]);
  });

  it("leaves other subscriptions' charges alone", () => {
    const other = [charge({ id: "x", subscriptionId: "s2", status: "pending", subMonth: "2026-09" })];
    expect(chargesSurvivingCancel(other, s, "2026-01-01")).toHaveLength(1);
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
