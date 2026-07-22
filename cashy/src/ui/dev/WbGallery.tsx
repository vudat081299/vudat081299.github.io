import { useState, type ReactNode } from "react";
import {
  Accordion,
  Alert,
  Avatar,
  AvatarGroup,
  BarChart,
  Breadcrumb,
  Button,
  ButtonGroup,
  Calendar,
  Capsule,
  Card,
  CardBody,
  CardFoot,
  CardHead,
  Checkbox,
  Collapse,
  ColorPicker,
  ComboChart,
  Container,
  Divider,
  Donut,
  Drawer,
  Dropdown,
  EmptyState,
  Field,
  FileInput,
  Dropzone,
  FilterAdd,
  FilterBar,
  FilterToken,
  Footer,
  Grid,
  Input,
  Kbd,
  Legend,
  LineChart,
  ListGroup,
  ListItem,
  MediaObject,
  Modal,
  Nav,
  Navbar,
  NavbarBrand,
  Pager,
  Pagination,
  Popover,
  Progress,
  ProgressRing,
  Radio,
  RadioGroup,
  RangeSlider,
  RankedBars,
  Ratio,
  Receipt,
  ReceiptBody,
  ReceiptHead,
  ReceiptLine,
  ReceiptNote,
  ReceiptRule,
  ReceiptTotal,
  RichText,
  ScrollArea,
  SegmentedToggle,
  Select,
  Sidenav,
  Skeleton,
  SkeletonText,
  Slider,
  SlotGrid,
  Sortable,
  Sparkline,
  Spinner,
  Stat,
  Steps,
  Sticky,
  Swatches,
  Switch,
  Table,
  type Column,
  Tabs,
  Tag,
  TagList,
  Textarea,
  TimePicker,
  Tooltip,
  Tree,
  type TreeNode,
  type DateRange,
} from "@/ui/kit";

/* ---------------------------------------------------------------------------
   A dev-only catalogue of the ported web-builder React library. Reached at
   #/wb (guarded by import.meta.env.DEV in App). Every block renders a real
   component from "@/ui/kit" so the whole kit can be eyeballed at once —
   this is the "does it actually render" check the type-checker can't give.
   -------------------------------------------------------------------------- */

function Demo({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 26 }}>
      <h3
        style={{
          margin: "0 0 12px",
          fontSize: 13,
          fontWeight: 650,
          letterSpacing: ".04em",
          textTransform: "uppercase",
          color: "var(--wb-fg-muted)",
        }}
      >
        {title}
      </h3>
      <div
        style={{
          padding: 20,
          border: "var(--wb-bw) solid var(--wb-border)",
          borderRadius: "var(--wb-radius-lg)",
          background: "var(--wb-surface)",
        }}
      >
        {children}
      </div>
    </section>
  );
}

function TabsDemo() {
  return (
    <Tabs
      defaultValue="a"
      items={[
        { value: "a", label: "Tổng quan" },
        { value: "b", label: "Giao dịch" },
        { value: "c", label: "Ngân sách" },
      ]}
      panels={{
        a: <span style={{ color: "var(--wb-fg-muted)" }}>Số dư, thu, chi trong kỳ…</span>,
        b: <span style={{ color: "var(--wb-fg-muted)" }}>Danh sách giao dịch…</span>,
        c: <span style={{ color: "var(--wb-fg-muted)" }}>Hạn mức theo danh mục…</span>,
      }}
    />
  );
}

function ModalDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Mở modal</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Xác nhận"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <Button onClick={() => setOpen(false)}>Đồng ý</Button>
          </>
        }
      >
        <p style={{ margin: 0 }}>Bạn có chắc muốn xoá giao dịch này?</p>
      </Modal>
    </>
  );
}

function DrawerDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Mở drawer
      </Button>
      <Drawer open={open} onClose={() => setOpen(false)} side="right" title="Bộ lọc">
        <p style={{ margin: 0, color: "var(--wb-fg-muted)" }}>Nội dung drawer…</p>
      </Drawer>
    </>
  );
}

function PaginationDemo() {
  const [page, setPage] = useState(3);
  return <Pagination page={page} pageCount={12} onChange={setPage} />;
}

function SliderDemo() {
  const [v, setV] = useState(3_500_000);
  const [band, setBand] = useState<[number, number]>([2_000_000, 7_000_000]);
  return (
    <div className="wb-stack" style={{ gap: 20, maxWidth: 360 }}>
      <Slider min={0} max={10_000_000} step={500_000} value={v} onChange={setV} aria-label="Hạn mức" />
      <RangeSlider min={0} max={10_000_000} step={500_000} value={band} onChange={setBand} />
    </div>
  );
}

function CalendarDemo() {
  const [day, setDay] = useState<string | null>("2026-07-14");
  const [range, setRange] = useState<DateRange | null>({ start: "2026-07-09", end: "2026-07-18" });
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <Calendar value={day} onChange={setDay} />
      <Calendar mode="range" value={range} onChange={setRange} />
    </div>
  );
}

function ColorDemo() {
  const [hex, setHex] = useState("#6366f1");
  const [cat, setCat] = useState("#14b8a6");
  return (
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
      <ColorPicker value={hex} onChange={setHex} />
      <Swatches
        colors={["#6366f1", "#14b8a6", "#f59e0b", "#ec4899", "#3b82f6", "#84cc16"]}
        value={cat}
        onChange={setCat}
        ariaLabel="Màu danh mục"
      />
    </div>
  );
}

function RichTextDemo() {
  const [v, setV] = useState("Ghi chú **giao dịch** — nhà hàng.");
  return <RichText value={v} onChange={setV} placeholder="Bôi đen rồi định dạng…" />;
}

function TimeDemo() {
  const [t, setT] = useState("09:30");
  return <TimePicker value={t} onChange={setT} minuteStep={5} />;
}

type Row = { id: string; name: string; kind: string; balance: number };
const ACCOUNTS: Row[] = [
  { id: "a1", name: "Vietcombank", kind: "Bank", balance: 42_850_000 },
  { id: "a2", name: "Momo", kind: "E-wallet", balance: 1_240_000 },
  { id: "a3", name: "Tiền mặt", kind: "Cash", balance: 3_500_000 },
];
const vnd = (n: number) => n.toLocaleString("vi-VN") + " đ";

function TableDemo() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const columns: Column<Row>[] = [
    { key: "name", header: "Tài khoản", render: (r) => <b>{r.name}</b> },
    { key: "kind", header: "Loại", render: (r) => <Capsule>{r.kind}</Capsule> },
    { key: "balance", header: "Số dư", align: "right", sortValue: (r) => r.balance, render: (r) => vnd(r.balance) },
  ];
  return (
    <Table
      columns={columns}
      rows={ACCOUNTS}
      rowKey={(r) => r.id}
      dense
      selectable
      selected={selected}
      onSelectedChange={setSelected}
    />
  );
}

function FilterBarDemo() {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"all" | "income" | "expense">("all");
  return (
    <FilterBar search={search} onSearch={setSearch} searchPlaceholder="Tìm giao dịch…" count="24 giao dịch">
      <SegmentedToggle
        ariaLabel="Loại"
        value={kind}
        onChange={setKind}
        options={[
          { value: "all", label: "Tất cả" },
          { value: "income", label: "Thu" },
          { value: "expense", label: "Chi" },
        ]}
      />
      {kind !== "all" && (
        <FilterToken label="Loại" value={kind === "income" ? "Thu" : "Chi"} onRemove={() => setKind("all")} />
      )}
      <FilterAdd onClick={() => {}} />
    </FilterBar>
  );
}

const TREE_DATA: TreeNode[] = [
  {
    id: "spend",
    label: "Chi tiêu",
    icon: "payments",
    children: [
      { id: "food", label: "Ăn uống", children: [{ id: "coffee", label: "Cà phê" }] },
      { id: "home", label: "Nhà ở" },
    ],
  },
  { id: "income", label: "Thu nhập", icon: "savings", children: [{ id: "salary", label: "Lương" }] },
];

function TreeDemo() {
  const [tree, setTree] = useState(TREE_DATA);
  const [expanded, setExpanded] = useState(() => new Set(["spend", "food", "income"]));
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return <Tree nodes={tree} expandedIds={expanded} onToggle={toggle} draggable onChange={setTree} />;
}

type Cat = { id: string; name: string; amount: string };
function SortableDemo() {
  const [rows, setRows] = useState<Cat[]>([
    { id: "food", name: "🍜 Ăn uống", amount: "−3.280.000 đ" },
    { id: "home", name: "🏠 Nhà ở", amount: "−6.500.000 đ" },
    { id: "move", name: "🚕 Di chuyển", amount: "−1.150.000 đ" },
  ]);
  return (
    <Sortable
      items={rows}
      itemKey={(r) => r.id}
      onReorder={setRows}
      layout="list"
      renderItem={(r) => (
        <>
          <span className="wb-sortable__label">{r.name}</span>
          <span className="wb-sortable__meta">{r.amount}</span>
        </>
      )}
    />
  );
}

type Widget = { id: string; title: string; value: string };
function SlotGridDemo() {
  const [slots, setSlots] = useState<(Widget | null)[]>([
    { id: "bal", title: "Số dư", value: "47.590.000 đ" },
    null,
    { id: "spend", title: "Chi tháng", value: "−11.840.000 đ" },
    { id: "budget", title: "Ngân sách", value: "còn 34%" },
  ]);
  return (
    <SlotGrid
      slots={slots}
      onChange={setSlots}
      columns={2}
      renderItem={(w) => (
        <>
          <span style={{ fontWeight: 600 }}>{w.title}</span>
          <span style={{ fontSize: 12.5, color: "var(--wb-fg-muted)" }}>{w.value}</span>
        </>
      )}
    />
  );
}

function TagsDemo() {
  const [tags, setTags] = useState(["du-lich", "gia-dinh", "tet-2027"]);
  return (
    <TagList>
      {tags.map((t) => (
        <Tag key={t} color="#0d9488" onRemove={() => setTags((xs) => xs.filter((x) => x !== t))}>
          {t}
        </Tag>
      ))}
    </TagList>
  );
}

export function WbGallery() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--wb-bg)", padding: "32px 0" }}>
      <Container>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 700 }}>web-builder · React library</h1>
          <p style={{ margin: 0, color: "var(--wb-fg-muted)" }}>
            Bộ component đã port sang React, dùng chung tokens & class wb-*. Trang dev-only tại
            <code style={{ margin: "0 4px" }}>#/wb</code>.
          </p>
        </div>

        <Demo title="Buttons & menus">
          <div className="wb-cluster" style={{ gap: 8, flexWrap: "wrap" }}>
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger" leadingIcon="delete">Xoá</Button>
            <Button size="sm" leadingIcon="add">Thêm</Button>
            <Button loading>Đang lưu…</Button>
            <ButtonGroup>
              <Button variant="outline">Ngày</Button>
              <Button variant="outline">Tuần</Button>
              <Button variant="outline">Tháng</Button>
            </ButtonGroup>
            <Dropdown
              label="Thao tác"
              items={[
                { label: "Sửa", icon: "edit", onSelect: () => {} },
                { label: "Nhân bản", icon: "content_copy", onSelect: () => {} },
                { divider: true },
                { label: "Xoá", icon: "delete", danger: true, onSelect: () => {} },
              ]}
            />
            <span>
              Nhấn <Kbd>⌘</Kbd> <Kbd>K</Kbd>
            </span>
          </div>
        </Demo>

        <Demo title="Feedback">
          <div className="wb-stack" style={{ gap: 12 }}>
            <Alert tone="info" icon="info" title="Đồng bộ ngân hàng" dismissible>
              Lần gần nhất: 5 phút trước.
            </Alert>
            <Alert tone="success" icon="check_circle" title="Đã lưu giao dịch" />
            <Alert tone="warning" icon="warning" title="Sắp vượt ngân sách" />
            <Progress value={40} label="40%" />
            <Progress value={82} tone="warning" label="82%" />
            <div className="wb-cluster" style={{ gap: 16, alignItems: "center" }}>
              <Spinner label="Đang tải" />
              <Tooltip label="Gồm cả ví và tiền mặt">
                <Button variant="secondary">Rê vào đây</Button>
              </Tooltip>
            </div>
            <div style={{ maxWidth: 360 }}>
              <Skeleton shape="title" />
              <SkeletonText lines={3} lastWidth="60%" />
            </div>
          </div>
        </Demo>

        <Demo title="Data display">
          <Grid columns={2}>
            <Card>
              <CardHead title="Ngân sách Đi lại" sub="Còn 12 ngày" actions={<Capsule tone="success">Đúng hạn</Capsule>} />
              <CardBody>
                <Progress value={46} label="1.850.000 / 4.000.000 đ" />
              </CardBody>
              <CardFoot>
                <Button variant="ghost" size="sm">Chi tiết</Button>
              </CardFoot>
            </Card>
            <Card>
              <CardBody>
                <MediaObject
                  figure={<Avatar solid>1</Avatar>}
                  title="Reuse-first"
                  text="Ráp từ part đã duyệt."
                />
              </CardBody>
            </Card>
          </Grid>
          <div style={{ height: 16 }} />
          <div className="wb-stat-grid">
            <Stat label="Số dư" icon="account_balance_wallet" value="47.590.000 đ" delta={{ dir: "up", value: "12,4%" }} note="so với kỳ trước" />
            <Stat label="Chi tiêu" icon="shopping_cart" value="11.840.000 đ" delta={{ dir: "down", value: "3,2%" }} note="so với kỳ trước" />
            <Stat label="Nợ phải thu" icon="schedule" value="6.800.000 đ" />
          </div>
          <div style={{ height: 16 }} />
          <div className="wb-cluster" style={{ gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Capsule>Mặc định</Capsule>
            <Capsule tone="success" dot>Đã trả</Capsule>
            <Capsule tone="warning" dot>Sắp đến hạn</Capsule>
            <Capsule tone="danger" fill="solid">Quá hạn</Capsule>
            <Avatar>VD</Avatar>
            <AvatarGroup>
              <Avatar>A</Avatar>
              <Avatar>B</Avatar>
              <Avatar>+3</Avatar>
            </AvatarGroup>
          </div>
          <div style={{ height: 16 }} />
          <TagsDemo />
          <div style={{ height: 16 }} />
          <Breadcrumb
            items={[
              { label: "Trang chủ", href: "#/wb", icon: "home" },
              { label: "Giao dịch", href: "#/wb" },
              { label: "Chi tiết #1042" },
            ]}
          />
          <Divider label="danh sách" />
          <ListGroup style={{ maxWidth: 440 }}>
            <ListItem title="Vietcombank" sub="•••• 8842" end={<b>18.740.000 đ</b>} />
            <ListItem title="Tiền mặt" sub="Ví" end={<b>2.150.000 đ</b>} />
          </ListGroup>
        </Demo>

        <Demo title="Steps · pagination · empty">
          <Steps
            steps={[
              { label: "Chọn nguồn", description: "Vietcombank", status: "done" },
              { label: "Nhập số tiền", description: "Đang làm…", status: "current" },
              { label: "Xác nhận OTP", status: "todo" },
            ]}
          />
          <div style={{ height: 16 }} />
          <PaginationDemo />
          <div style={{ height: 8 }} />
          <Pager prevLabel="Trước" prevHref="#/wb" nextLabel="Sau" nextHref="#/wb" />
          <div style={{ height: 16 }} />
          <EmptyState
            icon="🧾"
            title="Chưa có giao dịch"
            description="Thêm giao dịch đầu tiên để bắt đầu."
            action={<Button>Thêm giao dịch</Button>}
          />
        </Demo>

        <Demo title="Overlays & disclosure">
          <div className="wb-cluster" style={{ gap: 10, flexWrap: "wrap" }}>
            <ModalDemo />
            <DrawerDemo />
            <Popover trigger={({ toggle }) => <Button variant="secondary" onClick={toggle}>Popover</Button>}>
              <div style={{ padding: 4 }}>Nội dung popover.</div>
            </Popover>
          </div>
          <div style={{ height: 16 }} />
          <TabsDemo />
          <div style={{ height: 16 }} />
          <Accordion
            items={[
              { title: "Lấy dữ liệu ngân hàng thế nào?", content: "Qua kết nối đọc-chỉ.", defaultOpen: true },
              { title: "Đặt nhiều ngân sách được không?", content: "Có, mỗi danh mục một hạn mức." },
            ]}
          />
          <div style={{ height: 12 }} />
          <Collapse trigger="Xem chi tiết tính lãi">
            <p style={{ margin: "8px 0 0", color: "var(--wb-fg-muted)" }}>Lãi kép theo ngày, chốt cuối tháng.</p>
          </Collapse>
        </Demo>

        <Demo title="Navigation">
          <Navbar
            brand={<NavbarBrand mark="C" href="#/wb">Cashy</NavbarBrand>}
            items={[
              { label: "Tổng quan", href: "#/wb", active: true },
              { label: "Giao dịch", href: "#/wb" },
            ]}
          />
          <div style={{ height: 12 }} />
          <Nav
            variant="underline"
            items={[
              { label: "Tháng này", href: "#/wb", active: true },
              { label: "Quý", href: "#/wb" },
              { label: "Năm", href: "#/wb" },
            ]}
          />
          <div style={{ height: 16 }} />
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Sidenav
              style={{ width: 240 }}
              sections={[
                {
                  title: "Tổng quan",
                  items: [
                    { label: "Bảng điều khiển", icon: "dashboard", href: "#/wb", active: true },
                    { label: "Giao dịch", icon: "receipt_long", href: "#/wb", badge: 128 },
                  ],
                },
              ]}
            />
            <ScrollArea axis="y" maxHeight={140} style={{ flex: 1, minWidth: 220 }}>
              <Sticky style={{ background: "var(--wb-surface)", padding: "8px 4px", fontWeight: 600 }}>
                Giao dịch tháng 7
              </Sticky>
              <div style={{ padding: 4, color: "var(--wb-fg-muted)" }}>
                {Array.from({ length: 12 }, (_, i) => (
                  <p key={i} style={{ margin: "6px 0" }}>Dòng {i + 1}</p>
                ))}
              </div>
            </ScrollArea>
          </div>
        </Demo>

        <Demo title="Form controls">
          <div className="wb-stack" style={{ gap: 14, maxWidth: 420 }}>
            <Field label="Tên giao dịch" help="Tối đa 120 ký tự.">
              <Input placeholder="VD: Ăn trưa" />
            </Field>
            <Field label="Số tiền">
              <Input leadingAddon="đ" inputMode="numeric" defaultValue="1.280.000" />
            </Field>
            <Field label="Ghi chú">
              <Textarea placeholder="Mô tả…" />
            </Field>
            <Field label="Danh mục">
              <Select
                options={[
                  { value: "food", label: "Ăn uống" },
                  { value: "move", label: "Di chuyển" },
                ]}
              />
            </Field>
            <Switch label="Đã thanh toán" defaultChecked />
            <RadioGroup name="tt" defaultValue="chi" orientation="horizontal">
              <Radio value="chi" label="Chi" />
              <Radio value="thu" label="Thu" />
            </RadioGroup>
            <Checkbox label="Giao dịch định kỳ" defaultChecked />
            <FileInput aria-label="Chọn tệp" onFiles={() => {}} />
            <Dropzone title={<b>Kéo sao kê vào đây</b>} hint="PDF, CSV — tối đa 10MB" onFiles={() => {}} />
          </div>
          <div style={{ height: 20 }} />
          <SliderDemo />
          <div style={{ height: 20 }} />
          <RichTextDemo />
          <div style={{ height: 20 }} />
          <TimeDemo />
          <div style={{ height: 20 }} />
          <FilterBarDemo />
        </Demo>

        <Demo title="Pickers">
          <CalendarDemo />
          <div style={{ height: 20 }} />
          <ColorDemo />
        </Demo>

        <Demo title="Table">
          <TableDemo />
        </Demo>

        <Demo title="Drag & drop">
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ minWidth: 260 }}>
              <TreeDemo />
            </div>
            <div style={{ minWidth: 240 }}>
              <SortableDemo />
            </div>
            <div style={{ minWidth: 240 }}>
              <SlotGridDemo />
            </div>
          </div>
        </Demo>

        <Demo title="Charts">
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ width: 160 }}>
              <Sparkline values={[20, 17, 19, 11, 13, 7, 9, 4]} color="var(--wb-chart-income)" />
            </div>
            <Donut
              centerValue="11,8tr"
              centerLabel="tổng chi"
              slices={[
                { value: 6.5, color: "var(--wb-chart-1)" },
                { value: 3.28, color: "var(--wb-chart-3)" },
                { value: 1.15, color: "var(--wb-chart-2)" },
              ]}
            />
            <ProgressRing value={8.1} max={12} centerValue="68%" centerLabel="8,1 / 12tr" />
            <div style={{ width: 320 }}>
              <LineChart
                color="var(--wb-chart-expense)"
                max={12}
                points={[
                  { label: "T4", value: 7.5, display: "7,5tr" },
                  { label: "T5", value: 11.8, display: "11,8tr" },
                  { label: "T6", value: 10.4, display: "10,4tr" },
                  { label: "T7", value: 12, display: "12tr" },
                ]}
              />
            </div>
            <div style={{ width: 320 }}>
              <ComboChart
                max={24}
                points={[
                  { label: "T5", bar: 4.1, line: 16.6, lineDisplay: "16,6tr" },
                  { label: "T6", bar: 4.7, line: 19.4, lineDisplay: "19,4tr" },
                  { label: "T7", bar: 4.9, line: 20, lineDisplay: "20tr" },
                ]}
              />
            </div>
            <div style={{ width: 320 }}>
              <BarChart
                max={20}
                columns={[
                  { label: "T5", income: 20, expense: 4.7, display: "20 / 4,7tr" },
                  { label: "T6", income: 16.6, expense: 4.1, display: "16,6 / 4,1tr" },
                ]}
              />
            </div>
            <div style={{ width: 280 }}>
              <RankedBars
                items={[
                  { label: "Nhà ở", value: 6_500_000, display: "6.500.000 đ" },
                  { label: "Ăn uống", value: 3_280_000, display: "3.280.000 đ" },
                  { label: "Di chuyển", value: 1_150_000, display: "1.150.000 đ" },
                ]}
              />
            </div>
            <Legend
              items={[
                { label: "Thu", color: "var(--wb-chart-income)" },
                { label: "Chi", color: "var(--wb-chart-expense)" },
              ]}
            />
          </div>
        </Demo>

        <Demo title="Layout & receipt">
          <Grid columns={3}>
            <Ratio ratio="1x1">
              <div style={{ display: "grid", placeItems: "center", background: "var(--wb-surface-2)", height: "100%" }}>1×1</div>
            </Ratio>
            <Ratio ratio="4x3">
              <div style={{ display: "grid", placeItems: "center", background: "var(--wb-surface-2)", height: "100%" }}>4×3</div>
            </Ratio>
            <Ratio ratio="16x9">
              <div style={{ display: "grid", placeItems: "center", background: "var(--wb-surface-2)", height: "100%" }}>16×9</div>
            </Ratio>
          </Grid>
          <div style={{ height: 16 }} />
          <Receipt width={300}>
            <ReceiptHead merchant="WinMart+ Nguyễn Trãi" meta="08/07/2026 · 18:47 · #INV-77410" />
            <ReceiptBody>
              <ReceiptLine label="Gạo ST25 5kg" value="185.000" />
              <ReceiptLine label="Trứng gà hộp 10" value="38.000" />
            </ReceiptBody>
            <ReceiptRule />
            <ReceiptTotal label="Tổng" value="223.000 đ" />
            <ReceiptNote>Đổi trả trong 7 ngày kèm hoá đơn</ReceiptNote>
          </Receipt>
        </Demo>

        <Footer
          brand={{ mark: "C", name: "Cashy", tagline: "Thư viện component web-builder." }}
          columns={[
            { title: "Sản phẩm", links: [{ label: "Tính năng", href: "#/wb" }, { label: "Bảng giá", href: "#/wb" }] },
            { title: "Công ty", links: [{ label: "Giới thiệu", href: "#/wb" }] },
          ]}
          copyright="© 2026 Cashy"
        />
      </Container>
    </div>
  );
}
