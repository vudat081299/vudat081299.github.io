import { useState, type CSSProperties, type ReactNode } from "react";
import type { Category, Subscription, Tag, Transaction, TxStatus } from "@/domain/types";
import type { BreakdownSlice, WalletPoint, ForecastPoint } from "@/domain/analytics";
import type { TagRank } from "@/domain/tag";
import type { Due } from "@/domain/subscription";
import type { Range, PeriodKey } from "@/domain/period";

import { Container } from "@/ui/kit";

// common — Cashy-aware building blocks
import { AmountDisplay } from "@/ui/common/AmountDisplay";
import { CategoryCap } from "@/ui/common/CategoryCap";
import { StatusCap } from "@/ui/common/StatusCap";
import { TagChip } from "@/ui/common/TagChip";
import { StatusPicker } from "@/ui/common/StatusPicker";
import { CategorySelect } from "@/ui/common/CategorySelect";
import { PayeeInput } from "@/ui/common/PayeeInput";
import { DatePicker } from "@/ui/common/DatePicker";
import { DateRangeInput } from "@/ui/common/DateRangeInput";
import { RangeCalendar } from "@/ui/common/RangeCalendar";
import { PeriodPicker } from "@/ui/common/PeriodPicker";
import { IconPicker } from "@/ui/common/IconPicker";
import { ColorPicker } from "@/ui/common/ColorPicker";
import { Select } from "@/ui/common/Select";
import { PageHeader } from "@/ui/common/PageHeader";
import { EmptyState } from "@/ui/common/EmptyState";

// feature-leaf — presentational, fed entirely by the fixtures below
import { BalanceCard } from "@/ui/features/dashboard/BalanceCard";
import { SpendChart } from "@/ui/features/dashboard/SpendChart";
import { CashflowChart } from "@/ui/features/dashboard/CashflowChart";
import { BalanceForecastChart } from "@/ui/features/dashboard/BalanceForecastChart";
import { TransactionTable } from "@/ui/features/transactions/TransactionTable";
import { TxFilterBar } from "@/ui/features/transactions/TxFilterBar";
import { Pagination } from "@/ui/features/transactions/Pagination";
import { TagsMorePopover } from "@/ui/features/transactions/TagsMorePopover";
import { useTxQuery } from "@/ui/features/transactions/useTxQuery";
import { SubTile } from "@/ui/features/subscriptions/SubTile";
import { WalletCard } from "@/ui/features/wallets/WalletCard";
import { LoanCard } from "@/ui/features/loans/LoanCard";
import { SubscriptionCard } from "@/ui/features/subscriptions/SubscriptionCard";
import { SubscriptionDues } from "@/ui/features/subscriptions/SubscriptionDues";
import { SubscriptionCatchUp } from "@/ui/features/subscriptions/SubscriptionCatchUp";
import { SubscriptionHistory } from "@/ui/features/subscriptions/SubscriptionHistory";
import { SubscriptionCancel } from "@/ui/features/subscriptions/SubscriptionCancel";

/**
 * CashyGallery — the DEV-only catalogue of the Cashy-SPECIFIC component layer,
 * mirror of `WbGallery` (which shows the generic `wb-*` primitives at `#/wb`).
 * Reached at `#/cashy`, guarded by `import.meta.env.DEV` in `App.tsx`, code-split
 * so it never ships in production.
 *
 * Everything here is fed by the hand-written FIXTURES below — no store, no
 * usecases, no real ledger — so the page renders identically for anyone, and the
 * callbacks are inert (they log rather than mutate). Components are ordered
 * low → high: money/identity atoms, then cashy-aware form controls, then feedback,
 * then charts, then the transaction and subscription organisms.
 */

// ============================================================================
// Fixtures — small, explicit fake data shaped exactly like the real entities.
// ============================================================================

const CATS: Category[] = [
  { id: "c-food", parentId: null, order: 0, name: "Ăn uống", colorHex: "#f59e0b", icon: "utensils", type: "expense", isSystem: false },
  { id: "c-coffee", parentId: "c-food", order: 0, name: "Cà phê", colorHex: "#f59e0b", icon: "coffee", type: "expense", isSystem: false },
  { id: "c-market", parentId: "c-food", order: 1, name: "Đi chợ", colorHex: "#f59e0b", icon: "shopping-cart", type: "expense", isSystem: false },
  { id: "c-move", parentId: null, order: 1, name: "Di chuyển", colorHex: "#3b82f6", icon: "car", type: "expense", isSystem: false },
  { id: "c-bills", parentId: null, order: 2, name: "Hóa đơn", colorHex: "#06b6d4", icon: "receipt", type: "expense", isSystem: false },
  { id: "c-salary", parentId: null, order: 0, name: "Lương", colorHex: "#10b981", icon: "wallet", type: "income", isSystem: false },
  { id: "c-invest", parentId: null, order: 1, name: "Đầu tư", colorHex: "#0ea5e9", icon: "trending-up", type: "income", isSystem: false },
];
const catBy = (id: string) => CATS.find((c) => c.id === id) ?? null;

const TAGS: Tag[] = [
  { id: "t-fixed", name: "định-kỳ", colorHex: "#6366f1", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "t-work", name: "công-việc", colorHex: "#14b8a6", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "t-fun", name: "giải-trí", colorHex: "#ec4899", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "t-food", name: "ăn-ngoài", colorHex: "#f59e0b", createdAt: "2026-01-01T00:00:00.000Z" },
];
const tagBy = (id: string) => TAGS.find((t) => t.id === id)!;

// TagRank = tag + usage count + grey shade (100..900 by rank). Real data gets
// these from `rankTags`; here they are hand-set to show the ink ramp.
const TAG_RANKS: TagRank[] = [
  { tag: tagBy("t-fixed"), count: 24, shade: 700 },
  { tag: tagBy("t-work"), count: 12, shade: 500 },
  { tag: tagBy("t-fun"), count: 6, shade: 300 },
  { tag: tagBy("t-food"), count: 3, shade: 200 },
];
const TAG_RANK_MAP = new Map(TAG_RANKS.map((r) => [r.tag.id, r]));

const iso = (d: string) => `${d}T09:00:00.000Z`;
const tx = (t: Partial<Transaction> & Pick<Transaction, "id" | "amount" | "type" | "occurredAt">): Transaction => ({
  categoryId: null,
  tagIds: [],
  note: "",
  status: "recorded",
  createdAt: iso(t.occurredAt),
  ...t,
});

const TXS: Transaction[] = [
  tx({ id: "x1", amount: 65_000, type: "expense", categoryId: "c-coffee", tagIds: ["t-fun", "t-food"], note: "Cà phê sáng", payee: "Highlands", account: "Techcombank Visa", occurredAt: "2026-07-21", occurredTime: "08:15" }),
  tx({ id: "x2", amount: 25_000_000, type: "income", categoryId: "c-salary", tagIds: ["t-work"], note: "Lương tháng 7", payee: "ABC Company", occurredAt: "2026-07-01" }),
  tx({ id: "x3", amount: 186_000, type: "expense", categoryId: "c-move", note: "Grab về nhà", payee: "Grab", status: "awaiting", occurredAt: "2026-07-20" }),
  tx({ id: "x4", amount: 299_000, type: "expense", categoryId: "c-bills", tagIds: ["t-fixed", "t-fun"], note: "Netflix", status: "pending", subscriptionId: "s-netflix", subMonth: "2026-07", occurredAt: "2026-07-05" }),
  tx({ id: "x5", amount: 120_000, type: "expense", categoryId: "c-food", tagIds: ["t-fixed", "t-work", "t-fun", "t-food"], note: "Ăn trưa văn phòng", occurredAt: "2026-07-18" }),
  tx({ id: "x6", amount: 850_000, type: "expense", categoryId: "c-bills", tagIds: ["t-fixed"], note: "Tiền điện", status: "failed", occurredAt: "2026-07-10" }),
  tx({ id: "x7", amount: 240_000, type: "expense", categoryId: "c-market", tagIds: ["t-food"], note: "Đi chợ cuối tuần", payee: "Co.opmart", occurredAt: "2026-07-19" }),
  tx({ id: "x8", amount: 1_500_000, type: "income", categoryId: "c-invest", note: "Cổ tức", status: "awaiting", occurredAt: "2026-07-15" }),
  tx({ id: "x9", amount: 95_000, type: "expense", categoryId: "c-coffee", tagIds: ["t-fun"], note: "Cà phê chiều", payee: "The Coffee House", occurredAt: "2026-07-16" }),
];

const STATUS_LABELS: Record<TxStatus, string> = {
  recorded: "recorded",
  pending: "pending",
  awaiting: "awaiting",
  skipped: "skipped",
  failed: "failed",
};

const SLICES: BreakdownSlice[] = [
  { id: "c-food", name: "Ăn uống", colorHex: "#f59e0b", total: 2_480_000, pct: 0.4 },
  { id: "c-bills", name: "Hóa đơn", colorHex: "#06b6d4", total: 1_550_000, pct: 0.25 },
  { id: "c-move", name: "Di chuyển", colorHex: "#3b82f6", total: 1_240_000, pct: 0.2 },
  { id: "__other__", name: "Other", colorHex: "#64748b", total: 930_000, pct: 0.15, count: 4 },
];
const SLICE_TOTAL = SLICES.reduce((s, x) => s + x.total, 0);

const WALLET: WalletPoint[] = [
  { key: "2026-02", label: "Feb", income: 25_000_000, expense: 6_800_000, balance: 218_200_000 },
  { key: "2026-03", label: "Mar", income: 25_250_000, expense: 7_400_000, balance: 236_050_000 },
  { key: "2026-04", label: "Apr", income: 25_500_000, expense: 8_100_000, balance: 253_450_000 },
  { key: "2026-05", label: "May", income: 25_750_000, expense: 6_900_000, balance: 272_300_000 },
  { key: "2026-06", label: "Jun", income: 26_000_000, expense: 7_600_000, balance: 290_700_000 },
  { key: "2026-07", label: "Jul", income: 26_500_000, expense: 6_800_000, balance: 310_400_000 },
];

const FORECAST: ForecastPoint[] = Array.from({ length: 13 }, (_, k) => {
  const d = new Date(2026, 6 + k, 1);
  const label = `T${d.getMonth() + 1}/${d.getFullYear()}`;
  return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label, offset: k, balance: 310_400_000 + k * 19_700_000 };
});

const SUB_NETFLIX: Subscription = {
  id: "s-netflix", name: "Netflix", amount: 299_000, interval: "monthly", dayOfMonth: 5,
  categoryId: "c-bills", tagIds: ["t-fixed", "t-fun"], colorHex: "#e50914", icon: "film",
  note: "Gói Premium", account: "Techcombank Visa", active: true, startedAt: "2026-04-01",
  lastPaidAt: "2026-06-05", paymentTxIds: ["n-may", "n-jun"], fullAmount: 260_000, members: 4,
  createdAt: iso("2026-04-01"),
};
const SUB_SPOTIFY: Subscription = {
  id: "s-spotify", name: "Spotify", amount: 59_000, interval: "monthly", dayOfMonth: 12,
  categoryId: "c-bills", tagIds: ["t-fixed"], colorHex: "#1db954", icon: "music",
  note: "", active: false, startedAt: "2026-01-12", lastPaidAt: "2026-05-12",
  paymentTxIds: ["sp-1"], createdAt: iso("2026-01-12"),
};
const SUB_ICLOUD: Subscription = {
  id: "s-icloud", name: "iCloud+", amount: 25_000, interval: "monthly", dayOfMonth: 20,
  categoryId: "c-bills", tagIds: ["t-fixed"], colorHex: "#3b82f6", icon: "laptop",
  note: "200GB", active: true, startedAt: "2026-05-20", lastPaidAt: null,
  paymentTxIds: [], createdAt: iso("2026-05-20"),
};

const SUB_TXS: Transaction[] = [
  tx({ id: "n-may", amount: 299_000, type: "expense", categoryId: "c-bills", tagIds: ["t-fixed"], note: "Netflix", subscriptionId: "s-netflix", subMonth: "2026-05", occurredAt: "2026-05-05" }),
  tx({ id: "n-jun", amount: 299_000, type: "expense", categoryId: "c-bills", tagIds: ["t-fixed"], note: "Netflix", subscriptionId: "s-netflix", subMonth: "2026-06", occurredAt: "2026-06-05" }),
  tx({ id: "n-jul", amount: 299_000, type: "expense", categoryId: "c-bills", tagIds: ["t-fixed"], note: "Netflix", status: "pending", subscriptionId: "s-netflix", subMonth: "2026-07", occurredAt: "2026-07-05" }),
  tx({ id: "ic-jun", amount: 25_000, type: "expense", categoryId: "c-bills", note: "iCloud+", status: "pending", subscriptionId: "s-icloud", subMonth: "2026-06", occurredAt: "2026-06-20" }),
  tx({ id: "ic-jul", amount: 25_000, type: "expense", categoryId: "c-bills", note: "iCloud+", status: "pending", subscriptionId: "s-icloud", subMonth: "2026-07", occurredAt: "2026-07-20" }),
];

const DUES: Due[] = [
  { sub: SUB_NETFLIX, month: "2026-07", txId: "n-jul" },
  { sub: SUB_ICLOUD, month: "2026-06", txId: "ic-jun" },
  { sub: SUB_ICLOUD, month: "2026-07", txId: "ic-jul" },
];

// ============================================================================
// Layout helpers — copied from the WbGallery pattern.
// ============================================================================

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 26 }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 650, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--wb-fg-muted)" }}>
        {title}
      </h3>
      {hint && <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "var(--wb-fg-subtle)" }}>{hint}</p>}
      <div style={{ padding: 20, border: "var(--wb-bw) solid var(--wb-border)", borderRadius: "var(--wb-radius-lg)", background: "var(--wb-surface)" }}>
        {children}
      </div>
    </section>
  );
}

/** A small labelled cell so several variants of one component sit side by side. */
function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
      <span style={{ fontSize: 11, color: "var(--wb-fg-subtle)", fontFamily: "var(--wb-font-mono)" }}>{label}</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>{children}</div>
    </div>
  );
}

const rowStyle: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" };

// ============================================================================
// Stateful demos — one per group so the hooks stay tidy.
// ============================================================================

function ControlsDemo() {
  const [status, setStatus] = useState<TxStatus>("recorded");
  const [cat, setCat] = useState<string | null>("c-coffee");
  const [payee, setPayee] = useState("");
  const [day, setDay] = useState("2026-07-21");
  const [range, setRange] = useState<Range | null>({ start: "2026-07-01", end: "2026-07-15" });
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [periodCustom, setPeriodCustom] = useState<Range | null>(null);
  const [icon, setIcon] = useState("utensils");
  const [color, setColor] = useState("#6366f1");
  const [sel, setSel] = useState("expense");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <Cell label="StatusPicker — pick a TxStatus by capsule">
        <StatusPicker value={status} onChange={setStatus} />
      </Cell>
      <div style={rowStyle}>
        <Cell label="CategorySelect (tree picker)">
          <div style={{ width: 260 }}>
            <CategorySelect categories={CATS} type="expense" value={cat} onChange={setCat} />
          </div>
        </Cell>
        <Cell label="PayeeInput (ranked autocomplete)">
          <div style={{ width: 240 }}>
            <PayeeInput value={payee} onChange={setPayee} suggestions={["Highlands", "The Coffee House", "Grab", "Co.opmart", "ABC Company"]} placeholder="e.g. Highlands" />
          </div>
        </Cell>
        <Cell label="Select (native, chevron inside)">
          <Select value={sel} onChange={(e) => setSel(e.target.value)}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </Select>
        </Cell>
      </div>
      <div style={rowStyle}>
        <Cell label="DatePicker (single day)">
          <div style={{ width: 200 }}>
            <DatePicker value={day} onChange={setDay} />
          </div>
        </Cell>
        <Cell label="DateRangeInput (typed dd/mm/yyyy)">
          <div style={{ width: 260 }}>
            <DateRangeInput value={range} onChange={setRange} />
          </div>
        </Cell>
        <Cell label="PeriodPicker (period + custom range)">
          <PeriodPicker value={period} custom={periodCustom} onChange={(k, c) => { setPeriod(k); setPeriodCustom(c ?? null); }} />
        </Cell>
      </div>
      <div style={rowStyle}>
        <Cell label="RangeCalendar">
          <RangeCalendar value={range} onChange={setRange} />
        </Cell>
        <Cell label="IconPicker (lucide keys)">
          <div style={{ width: 300 }}>
            <IconPicker value={icon} onChange={setIcon} />
          </div>
        </Cell>
        <Cell label="ColorPicker (swatch grid)">
          <ColorPicker value={color} onChange={setColor} />
        </Cell>
      </div>
    </div>
  );
}

function SpendDemo() {
  const [sel, setSel] = useState<string | null>(null);
  return <SpendChart slices={SLICES} total={SLICE_TOTAL} selectedId={sel} onSelect={setSel} />;
}

function TxDemo() {
  const q = useTxQuery(TXS, CATS);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <TxFilterBar q={q} tagRanks={TAG_RANKS} categories={CATS} />
      <TransactionTable
        rows={q.sorted}
        categories={CATS}
        tagRanks={TAG_RANK_MAP}
        pageSize={5}
        title="Recent transactions"
        subtitle={`${q.sorted.length} rows · click one to open it (inert here)`}
        onDelete={(ids) => console.log("delete", ids)}
      />
    </div>
  );
}

function PaginationDemo() {
  const [page, setPage] = useState(3);
  return <Pagination page={page} totalPages={8} onPage={setPage} />;
}

function SubsDemo() {
  const [catchUp, setCatchUp] = useState(false);
  const [history, setHistory] = useState(false);
  const [cancel, setCancel] = useState(false);
  const noop = () => {};
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        <SubscriptionCard sub={SUB_NETFLIX} txs={SUB_TXS} onOpenCatchUp={noop} onOpenHistory={noop} onOpenCancel={noop} onSetActive={noop} />
        <SubscriptionCard sub={SUB_ICLOUD} txs={SUB_TXS} onOpenCatchUp={noop} onOpenHistory={noop} onOpenCancel={noop} onSetActive={noop} />
        <SubscriptionCard sub={SUB_SPOTIFY} txs={[]} onOpenCatchUp={noop} onOpenHistory={noop} onOpenCancel={noop} onSetActive={noop} />
      </div>

      <Cell label="SubscriptionDues — one row per owed cycle">
        <div style={{ width: "100%", maxWidth: 520 }}>
          <SubscriptionDues dues={DUES} onConfirm={(id) => console.log("paid", id)} onSkip={(id) => console.log("skip", id)} />
        </div>
      </Cell>

      <Cell label="Dialogs (controlled — open with the button)">
        <button type="button" className="wb-btn wb-btn--secondary wb-btn--sm" onClick={() => setCatchUp(true)}>Catch-up</button>
        <button type="button" className="wb-btn wb-btn--secondary wb-btn--sm" onClick={() => setHistory(true)}>History</button>
        <button type="button" className="wb-btn wb-btn--secondary wb-btn--sm" onClick={() => setCancel(true)}>Cancel</button>
      </Cell>

      <SubscriptionCatchUp
        sub={SUB_NETFLIX}
        pending={[{ month: "2026-06", txId: "n-jun" }, { month: "2026-07", txId: "n-jul" }]}
        open={catchUp}
        onClose={() => setCatchUp(false)}
        onResolve={(plan) => console.log("resolve", plan)}
        defaultAmount={299_000}
      />
      <SubscriptionHistory sub={SUB_NETFLIX} txs={SUB_TXS} open={history} onClose={() => setHistory(false)} onRevert={(id) => console.log("revert", id)} />
      <SubscriptionCancel sub={SUB_NETFLIX} pending={[{ month: "2026-07", txId: "n-jul" }]} open={cancel} onClose={() => setCancel(false)} onCancel={(d) => console.log("cancel", d)} />
    </div>
  );
}

// ============================================================================
// The page.
// ============================================================================

export function CashyGallery() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--wb-canvas)", padding: "32px 0" }}>
      <Container>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 750, letterSpacing: "-.01em" }}>Cashy components</h1>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--wb-fg-muted)" }}>
            The Cashy-specific layer (<code>ui/common</code> + <code>ui/features</code>), ordered low → high, fed by fake data.
            DEV-only at <code>#/cashy</code>. The generic <code>wb-*</code> primitives live at <code>#/wb</code>.
          </p>
        </div>

        <Section title="1 · Money & identity atoms" hint="The smallest Cashy pieces: how a sum, a category, a status and a tag are drawn.">
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={rowStyle}>
              <Cell label="AmountDisplay">
                <AmountDisplay amount={25_000_000} type="income" signed />
                <AmountDisplay amount={299_000} type="expense" signed />
                <AmountDisplay amount={1_240_000} />
                <AmountDisplay amount={-450_000} negative />
              </Cell>
              <Cell label="CategoryCap">
                <CategoryCap category={catBy("c-food")} />
                <CategoryCap category={catBy("c-bills")} />
                <CategoryCap category={null} />
              </Cell>
            </div>
            <div style={rowStyle}>
              <Cell label="StatusCap — one per lifecycle status">
                {(Object.keys(STATUS_LABELS) as TxStatus[]).map((s) => (
                  <StatusCap key={s} tx={tx({ id: `st-${s}`, amount: 1, type: "expense", occurredAt: "2026-07-01", status: s })} />
                ))}
              </Cell>
              <Cell label="SubTile — neutral vs brand-tinted">
                <SubTile icon="film" colorHex="#e50914" />
                <SubTile icon="film" colorHex="#e50914" brand />
                <SubTile icon="laptop" colorHex="#3b82f6" brand />
                <SubTile icon="music" colorHex="#1db954" brand />
              </Cell>
            </div>
            <Cell label="TagChip — grey by usage rank (shade), tinted, removable">
              <TagChip tag={tagBy("t-fixed")} shade={700} />
              <TagChip tag={tagBy("t-work")} shade={500} />
              <TagChip tag={tagBy("t-fun")} shade={300} />
              <TagChip tag={tagBy("t-fun")} tinted />
              <TagChip tag={tagBy("t-food")} onRemove={() => {}} />
            </Cell>
          </div>
        </Section>

        <Section title="2 · Form controls & pickers" hint="Cashy-aware inputs the editors are built from — each is interactive here.">
          <ControlsDemo />
        </Section>

        <Section title="3 · Feedback & layout">
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <PageHeader eyebrow="DAT" title="Overview" subtitle="48 transactions · Last 30 days" actions={<button type="button" className="wb-btn wb-btn--sm">Add</button>} />
            <EmptyState
              icon={<span className="wb-ico">receipt_long</span>}
              title="No transactions yet"
              description="Add your first transaction to get started."
              action={<button type="button" className="wb-btn wb-btn--sm">Add transaction</button>}
            />
          </div>
        </Section>

        <Section title="4 · KPIs & charts" hint="Recharts-backed; each is fed a plain array of points.">
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <BalanceCard label="Balance (all time)" amount={310_400_000} icon="account_balance_wallet" delta={0.063} note="vs. start of period" />
              <BalanceCard label="Income" amount={26_500_000} icon="trending_up" delta={0.01} muted />
              <BalanceCard label="Spending" amount={6_800_000} icon="trending_down" delta={-0.113} muted />
              <BalanceCard label="Net" amount={19_700_000} icon="swap_vert" delta={0.021} muted />
            </div>
            <div style={rowStyle}>
              <Cell label="SpendChart (donut — click a slice)">
                <SpendDemo />
              </Cell>
            </div>
            <Cell label="CashflowChart (bars = spend, line = balance)">
              <div style={{ width: "100%", height: 280 }}>
                <CashflowChart data={WALLET} />
              </div>
            </Cell>
            <Cell label="BalanceForecastChart (projected balance)">
              <div style={{ width: "100%", height: 260 }}>
                <BalanceForecastChart data={FORECAST} />
              </div>
            </Cell>
          </div>
        </Section>

        <Section title="5 · Transactions" hint="The filter bar + table are shared by the Dashboard and the Transactions screen. Row/bulk actions are inert here.">
          <TxDemo />
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 16 }}>
            <Cell label="Pagination">
              <PaginationDemo />
            </Cell>
            <Cell label="TagsMorePopover — the “+n” overflow chip">
              <TagsMorePopover tags={TAG_RANKS.slice(1)} count={TAG_RANKS.length - 1} />
            </Cell>
          </div>
        </Section>

        <Section title="6 · Subscriptions" hint="The service card, the dues list, and the three settle/history/cancel dialogs.">
          <SubsDemo />
        </Section>

        <Section title="7 · Wallets" hint="A wallet as a card — neutral tile, kind, and its derived balance. A negative balance (an overdrawn card) reads red; an archived wallet is dimmed.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            <WalletCard wallet={{ id: "w-cash", name: "Cash", kind: "cash", openingBalance: 0, colorHex: "#10b981", icon: "banknote", order: 0, archived: false, createdAt: "" }} balance={2_400_000} onEdit={() => {}} />
            <WalletCard wallet={{ id: "w-bank", name: "Vietcombank", kind: "bank", openingBalance: 0, colorHex: "#3b82f6", icon: "landmark", order: 1, archived: false, createdAt: "" }} balance={48_750_000} onEdit={() => {}} />
            <WalletCard wallet={{ id: "w-card", name: "Techcombank Visa", kind: "card", openingBalance: 0, colorHex: "#8b5cf6", icon: "credit-card", order: 2, archived: false, createdAt: "" }} balance={-3_120_000} onEdit={() => {}} />
            <WalletCard wallet={{ id: "w-momo", name: "MoMo", kind: "ewallet", openingBalance: 0, colorHex: "#ec4899", icon: "smartphone", order: 3, archived: true, createdAt: "" }} balance={180_000} onEdit={() => {}} />
          </div>
        </Section>

        <Section title="8 · Loans" hint="A loan as a card — neutral tile, source, outstanding, a repayment progress bar, and a due-date line. A status pill (overdue / due-soon / paid) carries the urgency; borrowed vs lent flips the wording (repaid / collected).">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            <LoanCard now={new Date("2026-07-23T09:00:00")} onEdit={() => {}} loan={{ id: "l-overdue", direction: "borrowed", counterparty: "Anh Hùng", source: "personal", principal: 15_000_000, interestRatePct: 2, interestPeriod: "month", openedAt: "2026-05-23", dueAt: "2026-07-13", payments: [{ id: "p1", amount: 5_000_000, date: "2026-06-23", note: "" }], colorHex: "#6366f1", icon: "users", note: "", archived: false, createdAt: "" }} />
            <LoanCard now={new Date("2026-07-23T09:00:00")} onEdit={() => {}} loan={{ id: "l-soon", direction: "borrowed", counterparty: "Thẻ tín dụng VPBank", source: "card", principal: 24_000_000, interestRatePct: 0, interestPeriod: "month", openedAt: "2026-02-23", dueAt: "2026-07-28", payments: [{ id: "p2", amount: 16_000_000, date: "2026-06-23", note: "" }], colorHex: "#8b5cf6", icon: "credit-card", note: "", archived: false, createdAt: "" }} />
            <LoanCard now={new Date("2026-07-23T09:00:00")} onEdit={() => {}} loan={{ id: "l-paid", direction: "borrowed", counterparty: "VPBank", source: "bank", principal: 20_000_000, interestRatePct: 12, interestPeriod: "year", openedAt: "2025-09-23", dueAt: "2026-06-23", payments: [{ id: "p3", amount: 20_000_000, date: "2026-06-23", note: "Tất toán" }], colorHex: "#3b82f6", icon: "landmark", note: "", archived: false, createdAt: "" }} />
            <LoanCard now={new Date("2026-07-23T09:00:00")} onEdit={() => {}} loan={{ id: "l-lent", direction: "lent", counterparty: "Minh", source: "personal", principal: 10_000_000, interestRatePct: 0, interestPeriod: "year", openedAt: "2026-05-23", dueAt: "2026-08-23", payments: [], colorHex: "#14b8a6", icon: "users", note: "", archived: false, createdAt: "" }} />
          </div>
        </Section>

        <p style={{ marginTop: 32, fontSize: 12, color: "var(--wb-fg-subtle)" }}>
          Fixtures live at the top of <code>src/ui/dev/CashyGallery.tsx</code>. Containers (Dashboard, screens) and
          singleton modals (TransactionEditor, SubscriptionEditor, TransactionDetail) are omitted — they read the live
          store; see <code>docs/components.md</code>.
        </p>
      </Container>
    </div>
  );
}
