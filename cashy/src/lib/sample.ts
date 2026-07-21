// Demo seed — every workspace opens on a full dataset, never an empty shell:
// EXACTLY 200 transactions spread evenly over the last 10 days (20 per day,
// ending "now"), each one tagged, all wired to the seeded categories. The oldest
// day also carries the salary and the fixed monthly bills, so income/expense
// both have something to show. On top of that window sit the subscriptions'
// past charges (older months) and one opening-balance row dated before them all,
// so the wallet reads positive from the very first point of the balance line.
// Amounts are integer VND. Referenced by store.createWorkspace, store.load
// (re-seeds an empty workspace) and store.loadSampleData.
import type { Category, Subscription, Tag, Transaction, TxStatus, TxType } from "@/types";
import { uid } from "@/lib/id";
import { addDays, addMonthKey, billingDate, monthKey, monthLabelShort, ymd } from "@/lib/date";

type Pool = {
  key: string;
  name: string;
  min: number;
  max: number;
  notes: string[];
  payees: string[]; // counterparty / source-destination
};

// `min`/`max` are in thousands of VND; `name` matches a seeded category.
// Small day-to-day spending — kept modest so a month's total sits comfortably
// below income (a realistic surplus, not a deficit).
const EXPENSES: Pool[] = [
  { key: "cho", name: "Đi chợ", min: 40, max: 250, notes: ["Đi chợ rau củ", "Mua thịt cá", "Đi siêu thị", "Đồ ăn cả tuần"], payees: ["Siêu thị WinMart", "Bách hoá Xanh", "Co.opmart", "Chợ Bà Chiểu"] },
  { key: "nhahang", name: "Nhà hàng", min: 80, max: 350, notes: ["Ăn trưa đồng nghiệp", "Cơm tối gia đình", "Ăn nhà hàng", "Lẩu cuối tuần"], payees: ["Nhà hàng Sen", "Golden Gate", "Pizza 4P's", "Quán cơm tấm"] },
  { key: "cafe", name: "Cà phê", min: 25, max: 65, notes: ["Cà phê sáng", "Trà sữa chiều", "Họp ở quán", "Cà phê với bạn"], payees: ["Highlands Coffee", "The Coffee House", "Starbucks", "Cộng Cà Phê"] },
  { key: "dichuyen", name: "Di chuyển", min: 15, max: 120, notes: ["Grab đi làm", "Đổ xăng", "Gửi xe", "Taxi về nhà", "Vé xe buýt"], payees: ["Grab", "Be", "Petrolimex", "Bãi giữ xe"] },
  { key: "muasam", name: "Mua sắm", min: 100, max: 900, notes: ["Mua áo", "Mua giày", "Mỹ phẩm", "Đồ gia dụng", "Mua sách"], payees: ["Shopee", "Lazada", "Uniqlo", "Điện máy Xanh"] },
  { key: "suckhoe", name: "Sức khỏe", min: 40, max: 350, notes: ["Mua thuốc", "Khám răng", "Khám sức khỏe", "Tập gym"], payees: ["Nhà thuốc Long Châu", "Phòng khám Vinmec", "California Fitness", "Pharmacity"] },
  { key: "giaitri", name: "Giải trí", min: 40, max: 280, notes: ["Xem phim", "Vé nhạc hội", "Karaoke", "Nạp game"], payees: ["CGV", "Galaxy Play", "Steam", "Ticketbox"] },
];
// Fixed monthly bills — booked ONCE per month on payday (not sprinkled daily).
const FIXED: Pool[] = [
  { key: "nhao", name: "Nhà ở", min: 4500, max: 7000, notes: ["Tiền thuê nhà"], payees: ["Chủ nhà"] },
  { key: "bill", name: "Điện", min: 300, max: 650, notes: ["Tiền điện tháng"], payees: ["EVN HCMC"] },
  { key: "bill", name: "Nước", min: 70, max: 160, notes: ["Tiền nước tháng"], payees: ["Sawaco"] },
  { key: "bill", name: "Internet", min: 220, max: 320, notes: ["Cước internet"], payees: ["FPT Telecom"] },
];
const SALARY: Pool = { key: "luong", name: "Lương", min: 40000, max: 52000, notes: ["Lương tháng"], payees: ["Công ty ABC"] };
const INCOME_EXTRA: Pool[] = [
  { key: "thuong", name: "Thưởng", min: 2000, max: 8000, notes: ["Thưởng dự án", "Thưởng KPI"], payees: ["Công ty ABC"] },
  { key: "dautu", name: "Đầu tư", min: 500, max: 5000, notes: ["Lãi đầu tư", "Cổ tức", "Bán cổ phiếu"], payees: ["VNDirect", "SSI", "TCBS"] },
  { key: "khac", name: "Khác", min: 100, max: 1500, notes: ["Được tặng", "Hoàn tiền", "Bán đồ cũ"], payees: ["Bạn bè", "Shopee", "Chợ Tốt"] },
];

// name + colour for the seeded tags (payment method / context / who).
const TAG_DEFS: [string, string][] = [
  ["Tiền mặt", "#14b8a6"], ["Thẻ", "#3b82f6"], ["Chuyển khoản", "#8b5cf6"],
  ["Ví MoMo", "#ec4899"], ["ZaloPay", "#06b6d4"],
  ["Cần thiết", "#f59e0b"], ["Phát sinh", "#f43f5e"], ["Định kỳ", "#64748b"],
  ["Giảm giá", "#84cc16"], ["Trả góp", "#6366f1"],
  ["Gia đình", "#10b981"], ["Bạn bè", "#ec4899"], ["Công việc", "#0ea5e9"],
  ["Du lịch", "#8b5cf6"], ["Cá nhân", "#f59e0b"],
];

// 10 days × 20 rows = the 200 transactions the demo dataset promises.
const DAYS = 10;
const PER_DAY = 20;
const OPENING_BALANCE = 60_000_000; // wallet starts here, so it reads positive

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
};

const SUBSCRIPTIONS: SubDef[] = [
  { name: "Netflix", amount: 260_000, dueOffset: -16, category: "Giải trí", icon: "film", colorHex: "#ef4444", note: "Gói Premium 4K", paidThrough: "last", startedMonthsAgo: 14 },
  { name: "Spotify", amount: 59_000, dueOffset: -9, category: "Giải trí", icon: "music", colorHex: "#22c55e", note: "Gói cá nhân", paidThrough: "this", startedMonthsAgo: 8 },
  { name: "YouTube Premium", amount: 79_000, dueOffset: -3, category: "Giải trí", icon: "star", colorHex: "#f43f5e", note: "Không quảng cáo", paidThrough: "last", startedMonthsAgo: 5 },
  { name: "iCloud 200GB", amount: 25_000, dueOffset: -12, category: "Hóa đơn", icon: "smartphone", colorHex: "#3b82f6", note: "Sao lưu iPhone", paidThrough: "this", startedMonthsAgo: 20 },
  { name: "ChatGPT Plus", amount: 500_000, dueOffset: 4, category: "Mua sắm", icon: "laptop", colorHex: "#8b5cf6", note: "Dùng cho công việc", paidThrough: "last", startedMonthsAgo: 3 },
  // Still switched on but two months behind — the "suspended, unpaid" state.
  { name: "Adobe Creative Cloud", amount: 620_000, dueOffset: -6, category: "Mua sắm", icon: "laptop", colorHex: "#06b6d4", note: "Quên gia hạn 2 tháng", paidThrough: "older", startedMonthsAgo: 9 },
  { name: "California Fitness", amount: 750_000, dueOffset: -20, category: "Sức khỏe", icon: "dumbbell", colorHex: "#f59e0b", note: "Tạm dừng khi đi công tác", paidThrough: "older", startedMonthsAgo: 10, active: false },
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
 */
export function buildSampleSubscriptions(
  categories: Category[],
  tags: Tag[],
  now: Date = new Date(),
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
    const dayOfMonth = clampDay(today + s.dueOffset);
    const startMonth = addMonthKey(cur, -s.startedMonthsAgo);
    const paidMonth =
      s.paidThrough === "this" ? cur : addMonthKey(cur, s.paidThrough === "last" ? -1 : -2);

    // Every month from the start (capped) through the last settled one is paid.
    const earliest = addMonthKey(paidMonth, -(MAX_HISTORY - 1));
    let m = earliest > startMonth ? earliest : startMonth;
    const paymentTxIds: string[] = [];
    let lastPaidAt: string | null = null;
    for (let guard = 0; m <= paidMonth && guard < MAX_HISTORY; guard++, m = addMonthKey(m, 1)) {
      const txId = uid();
      const occurredAt = billingDate(m, dayOfMonth);
      charges.push({
        id: txId,
        amount: s.amount,
        type: "expense",
        categoryId: catIdByName.get(s.category) ?? null,
        tagIds: subTagIds,
        note: s.name,
        payee: `Đăng ký · ${monthLabelShort(m)}`,
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
      dayOfMonth,
      categoryId: catIdByName.get(s.category) ?? null,
      tagIds: subTagIds,
      colorHex: s.colorHex,
      icon: s.icon,
      note: s.note,
      active: s.active ?? true,
      startedAt: billingDate(startMonth, dayOfMonth),
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
): { tags: Tag[]; transactions: Transaction[]; subscriptions: Subscription[] } {
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
      if (key === "bill" || key === "nhao") set.add(tg("Định kỳ"));
      if (["cho", "nhahang", "cafe", "suckhoe", "bill", "nhao"].includes(key) && chance(0.5)) set.add(tg("Cần thiết"));
      if (["giaitri", "muasam"].includes(key) && chance(0.55)) set.add(tg("Phát sinh"));
      if (["muasam", "cho"].includes(key) && chance(0.3)) set.add(tg("Giảm giá"));
      if (key === "muasam" && amount > 700000 && chance(0.55)) set.add(tg("Trả góp"));
      if (["cafe", "nhahang", "giaitri"].includes(key) && chance(0.35)) set.add(tg("Bạn bè"));
      if (["cho", "nhahang", "nhao", "suckhoe"].includes(key) && chance(0.3)) set.add(tg("Gia đình"));
      if (["dichuyen", "cafe"].includes(key) && chance(0.25)) set.add(tg("Công việc"));
      if (["giaitri", "dichuyen"].includes(key) && chance(0.2)) set.add(tg("Du lịch"));
      if (chance(0.18)) set.add(tg("Cá nhân"));
    }
    return [...set];
  };

  // Oldest → newest so we can drop one salary on the first in-range day of each month.
  const dates: string[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(ymd(d));
  }

  // The services and their real payment history — needed up front so the opening
  // balance can be dated before the oldest of those charges.
  const { subscriptions, charges } = buildSampleSubscriptions(categories, tags, now);

  const transactions: Transaction[] = [];

  // Every day carries EXACTLY `PER_DAY` rows, so the 10-day window always holds
  // 200. The oldest day spends its first slots on the salary and the fixed
  // monthly bills; every other day is daily spending plus the odd windfall.
  // Whatever slots are left over that day get filled with spending.
  dates.forEach((dateStr, dayIndex) => {
    const opening = dayIndex === 0;
    const [y, m, dd] = dateStr.split("-").map(Number);

    let seq = 0;
    const make = (pool: Pool, type: TxType) => {
      const amount = moneyK(pool.min, pool.max);
      const createdAt = new Date(y, m - 1, dd, 7 + (seq % 14), rnd(0, 59)).toISOString();
      seq++;
      // Most rows are recorded; sprinkle a few other statuses to show the column.
      let status: TxStatus | undefined;
      if (type === "expense" && chance(0.03)) status = "failed";
      else if (pool.key === "dautu" && chance(0.45)) status = "awaiting";
      transactions.push({
        id: uid(),
        amount,
        type,
        categoryId: catIdByName.get(pool.name) ?? null,
        tagIds: assignTags(pool.key, type, amount),
        note: pick(pool.notes),
        payee: pick(pool.payees),
        status,
        occurredAt: dateStr,
        createdAt,
      });
    };

    let slots = PER_DAY;

    const income: Pool[] = opening ? [SALARY] : chance(0.15) ? [pick(INCOME_EXTRA)] : [];
    const fixed: Pool[] = opening ? FIXED : [];

    for (const p of income) make(p, "income");
    for (const p of fixed) make(p, "expense");
    slots -= income.length + fixed.length;

    for (let i = 0; i < slots; i++) make(pick(EXPENSES), "expense");
  });

  // The wallet has to be funded BEFORE the first subscription charge, otherwise
  // the running balance would open months in the red purely because the demo
  // starts its history there. So the opening balance is dated a day earlier than
  // anything else in the dataset — it is the ground the line rises from.
  const firstDated = [...charges.map((c) => c.occurredAt), dates[0]].sort()[0];
  const openedAt = addDays(firstDated, -1);
  transactions.push({
    id: uid(),
    amount: OPENING_BALANCE,
    type: "income",
    categoryId: catIdByName.get("Khác") ?? null,
    tagIds: [tg("Chuyển khoản")],
    note: "Số dư đầu kỳ",
    payee: "Vietcombank",
    occurredAt: openedAt,
    createdAt: new Date(`${openedAt}T00:00:00`).toISOString(),
  });
  transactions.push(...charges);

  // Newest first, matching addTransaction's prepend order.
  transactions.sort((a, b) =>
    a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : a.createdAt < b.createdAt ? 1 : -1,
  );

  return { tags, transactions, subscriptions };
}
