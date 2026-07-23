// Demo seed — every workspace opens on a full, BALANCED ledger rather than an
// empty shell. The dataset runs from Jan 2026 to today:
//   • income  — one salary on the 1st of each month, starting at 25M and
//     compounding +1% every following month (a gentle raise schedule).
//   • spending — everyday expenses spread across the days of each month, sized
//     so a month's TOTAL outgo (daily spend + the subscription charges that
//     month) lands between 6M and 8M. The current, partial month is prorated.
//   • subscriptions — the services and their past charges, all clamped into the
//     same window so the balance line never opens months in the red.
//   • one opening-balance row dated the very first day, so the wallet reads
//     positive from the first point of the line.
// Amounts are integer VND. Referenced by store.createWorkspace, store.load
// (re-seeds an empty workspace) and store.loadSampleData.
import type {
  Category,
  SubInterval,
  Subscription,
  Tag,
  Transaction,
  TxStatus,
  TxType,
  Wallet,
} from "@/domain/types";
import { uid } from "@/lib/id";
import { addMonthKey, addMonths, billingDate, monthKey, monthLabelShort, todayYMD } from "@/domain/date";
import { guessWalletKind, walletIcon } from "@/domain/wallet";
import { SWATCHES } from "@/lib/palette";

type Pool = {
  key: string;
  name: string;
  min: number;
  max: number;
  notes: string[];
  payees: string[]; // counterparty / source-destination
};

// `min`/`max` are in thousands of VND; `name` matches a seeded category.
// Small day-to-day spending — kept modest so a month of it sits inside the 6–8M
// budget alongside the subscription charges.
const EXPENSES: Pool[] = [
  { key: "cho", name: "Đi chợ", min: 40, max: 250, notes: ["Đi chợ rau củ", "Mua thịt cá", "Đi siêu thị", "Đồ ăn cả tuần"], payees: ["Siêu thị WinMart", "Bách hoá Xanh", "Co.opmart", "Chợ Bà Chiểu"] },
  { key: "nhahang", name: "Nhà hàng", min: 80, max: 350, notes: ["Ăn trưa đồng nghiệp", "Cơm tối gia đình", "Ăn nhà hàng", "Lẩu cuối tuần"], payees: ["Nhà hàng Sen", "Golden Gate", "Pizza 4P's", "Quán cơm tấm"] },
  { key: "cafe", name: "Cà phê", min: 25, max: 65, notes: ["Cà phê sáng", "Trà sữa chiều", "Họp ở quán", "Cà phê với bạn"], payees: ["Highlands Coffee", "The Coffee House", "Starbucks", "Cộng Cà Phê"] },
  { key: "dichuyen", name: "Di chuyển", min: 15, max: 120, notes: ["Grab đi làm", "Đổ xăng", "Gửi xe", "Taxi về nhà", "Vé xe buýt"], payees: ["Grab", "Be", "Petrolimex", "Bãi giữ xe"] },
  { key: "muasam", name: "Mua sắm", min: 100, max: 900, notes: ["Mua áo", "Mua giày", "Mỹ phẩm", "Đồ gia dụng", "Mua sách"], payees: ["Shopee", "Lazada", "Uniqlo", "Điện máy Xanh"] },
  { key: "suckhoe", name: "Sức khỏe", min: 40, max: 350, notes: ["Mua thuốc", "Khám răng", "Khám sức khỏe", "Tập gym"], payees: ["Nhà thuốc Long Châu", "Phòng khám Vinmec", "California Fitness", "Pharmacity"] },
  { key: "giaitri", name: "Giải trí", min: 40, max: 280, notes: ["Xem phim", "Vé nhạc hội", "Karaoke", "Nạp game"], payees: ["CGV", "Galaxy Play", "Steam", "Ticketbox"] },
];
// Salary — booked once a month on the 1st. Only its name/notes/payee are used;
// the amount comes from the compounding schedule below, not from min/max.
const SALARY: Pool = { key: "luong", name: "Lương", min: 0, max: 0, notes: ["Lương tháng"], payees: ["Công ty ABC"] };

// name + colour for the seeded tags (payment method / context / who).
const TAG_DEFS: [string, string][] = [
  ["Tiền mặt", "#14b8a6"], ["Thẻ", "#3b82f6"], ["Chuyển khoản", "#8b5cf6"],
  ["Ví MoMo", "#ec4899"], ["ZaloPay", "#06b6d4"],
  ["Cần thiết", "#f59e0b"], ["Phát sinh", "#f43f5e"], ["Định kỳ", "#64748b"],
  ["Giảm giá", "#84cc16"], ["Trả góp", "#6366f1"],
  ["Gia đình", "#10b981"], ["Bạn bè", "#ec4899"], ["Công việc", "#0ea5e9"],
  ["Du lịch", "#8b5cf6"], ["Cá nhân", "#f59e0b"],
];

// The ledger window + money knobs.
const DATA_START_MONTH = "2026-01"; // income + spending both start here
const SALARY_BASE = 25_000_000; // January's salary
const SALARY_GROWTH = 0.01; // +1% each following month
const MONTHLY_SPEND_MIN = 6000; // in thousands — a month's total outgo target
const MONTHLY_SPEND_MAX = 8000;
const MIN_SPEND_TXN = 20_000; // never book a spend row below this
const OPENING_BALANCE = 200_000_000; // wallet already held this before the ledger begins

const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const chance = (p: number) => Math.random() < p;
const moneyK = (minK: number, maxK: number) => rnd(minK, maxK) * 1000;
function weighted(pairs: [string, number][]): string {
  const total = pairs.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * total;
  for (const [name, w] of pairs) if ((r -= w) < 0) return name;
  return pairs[0][0];
}

/** Inclusive list of "YYYY-MM" keys from start to end. */
function monthsInclusive(startKey: string, endKey: string): string[] {
  const out: string[] = [];
  for (let m = startKey, g = 0; m <= endKey && g < 240; m = addMonthKey(m, 1), g++) out.push(m);
  return out;
}

// The demo subscriptions. `dueOffset` places the billing day relative to TODAY
// so every payment state is on screen whenever the demo is opened: a negative
// offset is a day already past this month, a positive one is still to come.
// `paidThrough` is which month the service is settled up to — "this" needs
// nothing, "last" makes the current month fall due, and a paused service keeps
// an older marker. Amounts are VND.
type SubDef = {
  name: string;
  amount: number;
  dueOffset: number;
  category: string;
  icon: string;
  colorHex: string;
  note: string;
  paidThrough: "this" | "last" | "older";
  startedMonthsAgo: number;
  active?: boolean;
  interval?: SubInterval;
  /** 1..12, yearly only — the month it bills in. */
  monthOfYear?: number;
  /** free-trial length in months from the start date; no charge before it ends */
  trialMonths?: number;
  /** how many cycles ago the last payment was — sets how many cycles are OWED
   *  now (with a past billing day). Overrides `paidThrough` when given. */
  paidCyclesAgo?: number;
  /** which card / account pays it ("Paid with") — inherited onto each charge */
  account?: string;
};

// The cards / wallets the demo pays from — a small, realistic set so the new
// "Paid with" field has something to show across the seeded ledger.
const ACCOUNTS = [
  "Techcombank Visa",
  "VPBank Mastercard",
  "Vietcombank",
  "MoMo",
  "ZaloPay",
  "Cash",
];

const SUBSCRIPTIONS: SubDef[] = [
  { name: "Netflix", amount: 260_000, dueOffset: -16, category: "Giải trí", icon: "film", colorHex: "#ef4444", note: "Gói Premium 4K", paidThrough: "last", startedMonthsAgo: 14 },
  { name: "Spotify", amount: 59_000, dueOffset: -9, category: "Giải trí", icon: "music", colorHex: "#22c55e", note: "Gói cá nhân", paidThrough: "this", startedMonthsAgo: 8 },
  { name: "YouTube Premium", amount: 79_000, dueOffset: -3, category: "Giải trí", icon: "star", colorHex: "#f43f5e", note: "Không quảng cáo", paidThrough: "last", startedMonthsAgo: 5 },
  { name: "iCloud 200GB", amount: 25_000, dueOffset: -12, category: "Hóa đơn", icon: "smartphone", colorHex: "#3b82f6", note: "Sao lưu iPhone", paidThrough: "this", startedMonthsAgo: 20 },
  { name: "ChatGPT Plus", amount: 500_000, dueOffset: 4, category: "Mua sắm", icon: "laptop", colorHex: "#8b5cf6", note: "Dùng cho công việc", paidThrough: "last", startedMonthsAgo: 3 },
  // Still switched on but two months behind — the "suspended, unpaid" state.
  { name: "Adobe Creative Cloud", amount: 620_000, dueOffset: -6, category: "Mua sắm", icon: "laptop", colorHex: "#06b6d4", note: "Quên gia hạn 2 tháng", paidThrough: "older", startedMonthsAgo: 9 },
  { name: "California Fitness", amount: 750_000, dueOffset: -20, category: "Sức khỏe", icon: "dumbbell", colorHex: "#f59e0b", note: "Tạm dừng khi đi công tác", paidThrough: "older", startedMonthsAgo: 10, active: false },
  // A yearly plan — settled for this year, so its card shows a long cycle in
  // progress and a next payment twelve months out.
  { name: "Tên miền & hosting", amount: 1_450_000, dueOffset: -6, category: "Hóa đơn", icon: "wifi", colorHex: "#6366f1", note: "Gia hạn thường niên", paidThrough: "this", startedMonthsAgo: 40, interval: "yearly", monthOfYear: 3 },
  // Two bank credit-card annual fees — billed once a year.
  { name: "Thẻ tín dụng Techcombank Visa", amount: 499_000, dueOffset: -8, category: "Hóa đơn", icon: "credit-card", colorHex: "#e11d48", note: "Phí thường niên", paidThrough: "this", startedMonthsAgo: 5, interval: "yearly", monthOfYear: 2 },
  { name: "Thẻ tín dụng VPBank Mastercard", amount: 999_000, dueOffset: 5, category: "Hóa đơn", icon: "credit-card", colorHex: "#7c3aed", note: "Phí thường niên hạng Platinum", paidThrough: "this", startedMonthsAgo: 4, interval: "yearly", monthOfYear: 4 },
  // A deliberately long name — stresses the card & table layout.
  { name: "Phí thường niên thẻ tín dụng Vietcombank Visa Signature Priority Banking", amount: 1_200_000, dueOffset: -3, category: "Hóa đơn", icon: "credit-card", colorHex: "#0ea5e9", note: "Hạng Signature — miễn phí năm đầu", paidThrough: "last", startedMonthsAgo: 6, interval: "yearly", monthOfYear: 1 },
  // FREE TRIAL, still running — subscribed a month ago with three months free, so
  // the card shows "Free trial" and a first-charge date roughly two months out and
  // no charge has been raised yet.
  { name: "Disney+ Hotstar", amount: 149_000, dueOffset: 2, category: "Giải trí", icon: "film", colorHex: "#2563eb", note: "Miễn phí 3 tháng đầu", paidThrough: "this", startedMonthsAgo: 1, trialMonths: 3 },
  // FREE TRIAL that has ENDED — two free months, subscribed six months ago, so the
  // first four months of billing sit in the history and it now bills normally.
  { name: "Notion Plus", amount: 220_000, dueOffset: -5, category: "Mua sắm", icon: "laptop", colorHex: "#0ea5e9", note: "Hết 2 tháng dùng thử, giờ thu phí", paidThrough: "this", startedMonthsAgo: 6, trialMonths: 2, account: "Techcombank Visa" },

  // ---- OWING N cycles — the reminder / suspended states, one per depth ----
  { name: "Apple Music", amount: 65_000, dueOffset: -7, category: "Giải trí", icon: "music", colorHex: "#ef4444", note: "Nợ 1 kỳ", paidThrough: "this", paidCyclesAgo: 1, startedMonthsAgo: 10, account: "MoMo" },
  { name: "Dropbox", amount: 240_000, dueOffset: -10, category: "Mua sắm", icon: "laptop", colorHex: "#2563eb", note: "Nợ 2 kỳ", paidThrough: "this", paidCyclesAgo: 2, startedMonthsAgo: 12, account: "VPBank Mastercard" },
  { name: "Notion AI", amount: 200_000, dueOffset: -4, category: "Mua sắm", icon: "laptop", colorHex: "#8b5cf6", note: "Nợ 3 kỳ", paidThrough: "this", paidCyclesAgo: 3, startedMonthsAgo: 12, account: "Techcombank Visa" },
  { name: "FPT Play", amount: 90_000, dueOffset: -14, category: "Giải trí", icon: "film", colorHex: "#f59e0b", note: "Nợ 4 kỳ", paidThrough: "this", paidCyclesAgo: 4, startedMonthsAgo: 14, account: "ZaloPay" },

  // ---- FREE TRIAL in progress, one per length (1 / 2 / 3 months) ----
  { name: "Canva Pro", amount: 130_000, dueOffset: 3, category: "Mua sắm", icon: "laptop", colorHex: "#06b6d4", note: "Miễn phí 1 tháng đầu", paidThrough: "this", startedMonthsAgo: 0, trialMonths: 1, account: "VPBank Mastercard" },
  { name: "Coursera Plus", amount: 480_000, dueOffset: 6, category: "Mua sắm", icon: "laptop", colorHex: "#6366f1", note: "Miễn phí 2 tháng đầu", paidThrough: "this", startedMonthsAgo: 1, trialMonths: 2, account: "Vietcombank" },
];

/** How many past cycles of each service get a real charge row in the demo. */
const MAX_HISTORY = 6;

/**
 * The demo subscriptions — one service in each payment state, so the reminder,
 * the paid rows, an upcoming charge and a paused service are all visible on
 * first open.
 *
 * Each past payment is a REAL recorded transaction, not a date on the service:
 * `paymentTxIds` points at them and `lastPaidAt` is simply the last of them. The
 * ledger stays the only place money exists, and the service's payment history is
 * a view of it — which is what lets the store re-derive both fields at any time.
 *
 * `floorMonth` clamps the charge history (and the shown start date) into the
 * dataset window, so a service that "started 40 months ago" still only books
 * charges from Jan 2026 on — the balance line never predates the income.
 */
export function buildSampleSubscriptions(
  categories: Category[],
  tags: Tag[],
  now: Date = new Date(),
  floorMonth: string = DATA_START_MONTH,
): { subscriptions: Subscription[]; charges: Transaction[] } {
  const catIdByName = new Map<string, string>();
  for (const c of categories) if (!catIdByName.has(c.name)) catIdByName.set(c.name, c.id);
  const tagIdByName = new Map(tags.map((t) => [t.name, t.id] as const));
  const subTagIds = ["Định kỳ", "Thẻ"]
    .map((n) => tagIdByName.get(n))
    .filter((id): id is string => Boolean(id));

  const cur = monthKey(now);
  const today = now.getDate();
  // Clamp to 1..28 so the billing day exists in every month.
  const clampDay = (d: number) => Math.min(28, Math.max(1, d));

  const subscriptions: Subscription[] = [];
  const charges: Transaction[] = [];

  for (const s of SUBSCRIPTIONS) {
    const id = uid();
    // Which card pays this service ("Paid with"): explicit when the def names one,
    // otherwise spread deterministically across ACCOUNTS by position.
    const account = s.account ?? ACCOUNTS[subscriptions.length % ACCOUNTS.length];
    const dayOfMonth = clampDay(today + s.dueOffset);
    const interval = s.interval ?? "monthly";
    // One "cycle" is 1 month or 12; a yearly plan's cycles sit on the grid of its
    // own billing month, so its keys are built from that rather than from today.
    const step = interval === "yearly" ? 12 : 1;
    const anchorMM =
      interval === "yearly" ? String(s.monthOfYear ?? 1).padStart(2, "0") : null;

    let startMonth: string;
    let paidMonth: string;
    if (anchorMM) {
      const y = Number(cur.slice(0, 4));
      paidMonth = `${y}-${anchorMM}` <= cur ? `${y}-${anchorMM}` : `${y - 1}-${anchorMM}`;
      startMonth = `${y - Math.max(1, Math.round(s.startedMonthsAgo / 12))}-${anchorMM}`;
    } else {
      startMonth = addMonthKey(cur, -s.startedMonthsAgo);
      // `paidCyclesAgo` (owe exactly N) wins; otherwise the paidThrough shorthand.
      if (s.paidCyclesAgo != null) {
        paidMonth = addMonthKey(cur, -s.paidCyclesAgo);
      } else if (s.paidThrough === "this") {
        paidMonth = cur;
      } else if (s.paidThrough === "last") {
        paidMonth = addMonthKey(cur, -1);
      } else {
        paidMonth = addMonthKey(cur, -2);
      }
    }

    // Every cycle from the start (capped) through the last settled one is paid —
    // but never earlier than the dataset floor.
    const earliest = addMonthKey(paidMonth, -(MAX_HISTORY - 1) * step);
    let m = earliest > startMonth ? earliest : startMonth;
    while (m < floorMonth) m = addMonthKey(m, step);
    const startKey = startMonth < floorMonth ? floorMonth : startMonth;
    const startedAt = billingDate(startKey, dayOfMonth);
    // Free trial: the first `trialMonths` months are free, so any cycle billing
    // before the trial end books nothing (matching domain/subscription.dueCharges).
    const trialEndYMD = s.trialMonths ? addMonths(startedAt, s.trialMonths) : null;

    const paymentTxIds: string[] = [];
    let lastPaidAt: string | null = null;
    for (let guard = 0; m <= paidMonth && guard < MAX_HISTORY; guard++, m = addMonthKey(m, step)) {
      const occurredAt = billingDate(m, dayOfMonth);
      if (trialEndYMD && occurredAt < trialEndYMD) continue; // free cycle → no charge
      const txId = uid();
      charges.push({
        id: txId,
        amount: s.amount,
        type: "expense",
        categoryId: catIdByName.get(s.category) ?? null,
        tagIds: subTagIds,
        note: s.name,
        payee: `Subscription · ${monthLabelShort(m)}`,
        account,
        status: "recorded",
        occurredAt,
        createdAt: new Date(`${occurredAt}T09:00:00`).toISOString(),
        subscriptionId: id,
        subMonth: m,
      });
      paymentTxIds.push(txId);
      lastPaidAt = occurredAt;
    }

    subscriptions.push({
      id,
      name: s.name,
      amount: s.amount,
      interval,
      dayOfMonth,
      monthOfYear: s.monthOfYear,
      categoryId: catIdByName.get(s.category) ?? null,
      tagIds: subTagIds,
      colorHex: s.colorHex,
      icon: s.icon,
      note: s.note,
      account,
      active: s.active ?? true,
      startedAt,
      trialMonths: s.trialMonths,
      lastPaidAt,
      paymentTxIds,
      createdAt: now.toISOString(),
    });
  }

  return { subscriptions, charges };
}

export function buildSampleData(
  categories: Category[],
  now: Date = new Date(),
): { tags: Tag[]; transactions: Transaction[]; subscriptions: Subscription[]; wallets: Wallet[] } {
  const catIdByName = new Map<string, string>();
  for (const c of categories) if (!catIdByName.has(c.name)) catIdByName.set(c.name, c.id);

  const tags: Tag[] = TAG_DEFS.map(([name, colorHex]) => ({
    id: uid(),
    name,
    colorHex,
    createdAt: now.toISOString(),
  }));
  const tagId = new Map(tags.map((t) => [t.name, t.id] as const));
  const tg = (name: string) => tagId.get(name) as string;

  const assignTags = (key: string, type: TxType, amount: number): string[] => {
    const set = new Set<string>();
    set.add(tg(weighted([["Thẻ", 30], ["Tiền mặt", 25], ["Chuyển khoản", 25], ["Ví MoMo", 15], ["ZaloPay", 5]])));
    if (type === "income") {
      if (key === "luong") set.add(tg("Định kỳ"));
      if (chance(0.4)) set.add(tg("Công việc"));
      if (chance(0.2)) set.add(tg("Cá nhân"));
    } else {
      if (["cho", "nhahang", "cafe", "suckhoe"].includes(key) && chance(0.5)) set.add(tg("Cần thiết"));
      if (["giaitri", "muasam"].includes(key) && chance(0.55)) set.add(tg("Phát sinh"));
      if (["muasam", "cho"].includes(key) && chance(0.3)) set.add(tg("Giảm giá"));
      if (key === "muasam" && amount > 700000 && chance(0.55)) set.add(tg("Trả góp"));
      if (["cafe", "nhahang", "giaitri"].includes(key) && chance(0.35)) set.add(tg("Bạn bè"));
      if (["cho", "nhahang", "suckhoe"].includes(key) && chance(0.3)) set.add(tg("Gia đình"));
      if (["dichuyen", "cafe"].includes(key) && chance(0.25)) set.add(tg("Công việc"));
      if (["giaitri", "dichuyen"].includes(key) && chance(0.2)) set.add(tg("Du lịch"));
      if (chance(0.18)) set.add(tg("Cá nhân"));
    }
    return [...set];
  };

  // Which card / wallet a row was paid from. Income lands in the bank; everyday
  // spend is spread across the cards and wallets, cash most common.
  const accountFor = (type: TxType): string => {
    if (type === "income") return "Vietcombank";
    return weighted([
      ["Cash", 28],
      ["Techcombank Visa", 26],
      ["MoMo", 16],
      ["Vietcombank", 14],
      ["ZaloPay", 9],
      ["VPBank Mastercard", 7],
    ]);
  };

  // Services + their real payment history, all inside the window. Needed up
  // front so each month's everyday spend can be sized around the sub charges.
  const { subscriptions, charges } = buildSampleSubscriptions(categories, tags, now, DATA_START_MONTH);
  const subExpenseByMonth = new Map<string, number>();
  for (const c of charges) {
    if (c.type !== "expense" || !c.subMonth) continue;
    subExpenseByMonth.set(c.subMonth, (subExpenseByMonth.get(c.subMonth) ?? 0) + c.amount);
  }

  const transactions: Transaction[] = [];
  const curMonth = monthKey(now);
  const months = monthsInclusive(DATA_START_MONTH, curMonth);

  // Opening balance — money the wallet already held BEFORE the ledger begins, so
  // it is dated the day before the first month (never counted as this-year
  // income) and the balance line rises from 200M rather than from zero.
  const openedAt = billingDate(addMonthKey(DATA_START_MONTH, -1), 31);
  transactions.push({
    id: uid(),
    amount: OPENING_BALANCE,
    type: "income",
    categoryId: catIdByName.get("Khác") ?? null,
    tagIds: [tg("Chuyển khoản")],
    note: "Số dư đầu kỳ",
    payee: "Vietcombank",
    account: "Vietcombank",
    occurredAt: openedAt,
    createdAt: new Date(`${openedAt}T00:00:00`).toISOString(),
  });

  months.forEach((mk, idx) => {
    const [y, mm] = mk.split("-").map(Number);
    const daysInMonth = new Date(y, mm, 0).getDate();
    const isCurrent = mk === curMonth;
    const lastDay = isCurrent ? Math.min(daysInMonth, now.getDate()) : daysInMonth;

    // Salary on the 1st, compounding +1% a month across the dataset.
    const salaryAmt = Math.round(SALARY_BASE * (1 + SALARY_GROWTH) ** idx);
    const salaryDate = billingDate(mk, 1);
    transactions.push({
      id: uid(),
      amount: salaryAmt,
      type: "income",
      categoryId: catIdByName.get(SALARY.name) ?? null,
      tagIds: assignTags(SALARY.key, "income", salaryAmt),
      note: pick(SALARY.notes),
      payee: pick(SALARY.payees),
      account: accountFor("income"),
      status: "recorded",
      occurredAt: salaryDate,
      createdAt: new Date(`${salaryDate}T08:00:00`).toISOString(),
    });

    // Everyday spending — a month's total (prorated for the partial current
    // month) minus what the subscriptions already took, spread across the days.
    let monthTarget = moneyK(MONTHLY_SPEND_MIN, MONTHLY_SPEND_MAX);
    if (isCurrent) monthTarget = Math.round((monthTarget * lastDay) / daysInMonth);
    const subSpent = subExpenseByMonth.get(mk) ?? 0;
    let remaining = Math.max(MIN_SPEND_TXN, monthTarget - subSpent);

    for (let guard = 0; remaining >= MIN_SPEND_TXN && guard < 200; guard++) {
      const pool = pick(EXPENSES);
      let amt = moneyK(pool.min, pool.max);
      // Absorb the tail into one row rather than leaving un-bookable dust.
      if (amt >= remaining || remaining - amt < MIN_SPEND_TXN) amt = remaining;
      const day = rnd(1, lastDay);
      const dateStr = billingDate(mk, day);
      const status: TxStatus | undefined = chance(0.03) ? "failed" : undefined;
      transactions.push({
        id: uid(),
        amount: amt,
        type: "expense",
        categoryId: catIdByName.get(pool.name) ?? null,
        tagIds: assignTags(pool.key, "expense", amt),
        note: pick(pool.notes),
        payee: pick(pool.payees),
        account: accountFor("expense"),
        status,
        occurredAt: dateStr,
        createdAt: new Date(y, mm - 1, day, 7 + rnd(0, 14), rnd(0, 59)).toISOString(),
      });
      remaining -= amt;
    }
  });

  transactions.push(...charges);

  // Real wallets for the demo — one per "Paid with" account the ledger names,
  // kind guessed from the name. Opening balances stay 0; every row is linked by
  // `walletId` from its `account` string, exactly as migration v6 does for real data.
  const wallets: Wallet[] = ACCOUNTS.map((name, i) => {
    const kind = guessWalletKind(name);
    return {
      id: uid(),
      name,
      kind,
      openingBalance: 0,
      colorHex: SWATCHES[i % SWATCHES.length],
      icon: walletIcon(kind),
      order: i,
      archived: false,
      createdAt: now.toISOString(),
    };
  });
  const walletIdByName = new Map(wallets.map((w) => [w.name, w.id] as const));

  // A couple of TRANSFERS, so the demo shows the "moves between two wallets,
  // counts toward no total" case: monthly cash withdrawals from the bank.
  const bankId = walletIdByName.get("Vietcombank");
  const cashId = walletIdByName.get("Cash");
  if (bankId && cashId) {
    for (const mk of months) {
      const day = billingDate(mk, 3);
      if (day > todayYMD()) continue;
      transactions.push({
        id: uid(),
        amount: 3_000_000,
        type: "expense", // convention — never summed; `toWalletId` marks it a transfer
        categoryId: null,
        tagIds: [],
        note: "Rút tiền mặt",
        walletId: bankId,
        toWalletId: cashId,
        status: "recorded",
        occurredAt: day,
        createdAt: new Date(`${day}T10:00:00`).toISOString(),
      });
    }
  }

  // Newest first, matching addTransaction's prepend order.
  transactions.sort((a, b) =>
    a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : a.createdAt < b.createdAt ? 1 : -1,
  );

  const linkWallet = <T extends { account?: string; walletId?: string | null }>(row: T): T => {
    // A row that already names a wallet (a transfer) keeps it; otherwise link by account.
    if (row.walletId) return row;
    const id = row.account?.trim() ? walletIdByName.get(row.account.trim()) : undefined;
    return id ? { ...row, walletId: id } : row;
  };

  return {
    tags,
    transactions: transactions.map(linkWallet),
    subscriptions: subscriptions.map(linkWallet),
    wallets,
  };
}
