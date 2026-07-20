// Demo seed — gives a fresh workspace a lively, realistic ~3 months of data so
// the dashboard/charts aren't empty on first run AND period-over-period deltas +
// the wallet-balance trend have something to show. ~7 tx/day over the last 92
// days ending "now", an opening balance so the wallet starts positive, plus a
// curated set of tags, all wired to the seeded categories. Amounts are integer
// VND. Referenced by store.createWorkspace and store.loadSampleData.
import type { Category, Tag, Transaction, TxStatus, TxType } from "@/types";
import { uid } from "@/lib/id";
import { ymd } from "@/lib/date";

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

const DAYS = 92;
const PER_DAY = 7;
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

export function buildSampleData(
  categories: Category[],
  now: Date = new Date(),
): { tags: Tag[]; transactions: Transaction[] } {
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

  const transactions: Transaction[] = [];

  // Opening balance on the oldest day, timestamped earliest so it sorts first —
  // the wallet-balance line then starts from a real, positive figure.
  {
    const [y, m, dd] = dates[0].split("-").map(Number);
    transactions.push({
      id: uid(),
      amount: OPENING_BALANCE,
      type: "income",
      categoryId: catIdByName.get("Khác") ?? null,
      tagIds: [tg("Chuyển khoản")],
      note: "Số dư đầu kỳ",
      payee: "Vietcombank",
      occurredAt: dates[0],
      createdAt: new Date(y, m - 1, dd, 0, 0).toISOString(),
    });
  }

  const monthSeen = new Set<string>();

  for (const dateStr of dates) {
    const monthKey = dateStr.slice(0, 7);
    const payday = !monthSeen.has(monthKey);
    monthSeen.add(monthKey);

    const income: Pool[] = [];
    if (payday) income.push(SALARY);
    if (chance(0.1)) income.push(pick(INCOME_EXTRA));

    const expenses: Pool[] = [];
    // Fixed bills land once, on payday; the rest of the month is daily spending.
    if (payday) expenses.push(...FIXED);
    for (let i = 0; i < PER_DAY; i++) expenses.push(pick(EXPENSES));

    let seq = 0;
    const make = (pool: Pool, type: TxType) => {
      const amount = moneyK(pool.min, pool.max);
      const [y, m, dd] = dateStr.split("-").map(Number);
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

    for (const p of income) make(p, "income");
    for (const p of expenses) make(p, "expense");
  }

  // Newest first, matching addTransaction's prepend order.
  transactions.sort((a, b) =>
    a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : a.createdAt < b.createdAt ? 1 : -1,
  );

  return { tags, transactions };
}
