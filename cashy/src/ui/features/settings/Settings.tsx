import { useRef, useState, type ChangeEvent, type CSSProperties, type ReactNode } from "react";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useCashy } from "@/data/store";
import { exportData, importData, loadSampleData, resetAll, setSubIconStyle, setTheme, updateWorkspace } from "@/usecases";
import { todayYMD } from "@/domain/date";
import { confirm, confirmDelete } from "@/lib/confirm";
import { PageHeader } from "@/ui/common/PageHeader";
import type { SubIconStyle, ThemeMode } from "@/domain/types";

function download(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="wb-card">
      <div className="wb-card__body wb-stack">
        <h3 className="wb-card__title">{title}</h3>
        {children}
      </div>
    </section>
  );
}

const THEMES: { key: ThemeMode; label: string; icon: string }[] = [
  { key: "system", label: "System", icon: "computer" },
  { key: "light", label: "Light", icon: "light_mode" },
  { key: "dark", label: "Dark", icon: "dark_mode" },
];

const SUB_ICON_STYLES: { key: SubIconStyle; label: string; icon: string }[] = [
  { key: "neutral", label: "Neutral", icon: "filter_b_and_w" },
  { key: "brand", label: "By service", icon: "palette" },
];

export function Settings() {
  const { workspace, theme, subIconStyle, categories, tags, transactions } = useCashy();
  const [name, setName] = useState(workspace?.displayName ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  function doExportJSON() {
    download(`cashy-${todayYMD()}.json`, exportData(), "application/json");
    toast.success("Exported JSON");
  }

  function doExportCSV() {
    const catName = (id: string | null) =>
      id ? (categories.find((c) => c.id === id)?.name ?? "") : "";
    const tagNames = (ids: string[]) =>
      ids
        .map((id) => tags.find((t) => t.id === id)?.name ?? "")
        .filter(Boolean)
        .join("|");
    const header = ["Date", "Type", "Amount", "Category", "Tag", "Note"];
    const rows = transactions.map((t) => [
      t.occurredAt,
      t.type === "income" ? "Income" : "Expense",
      String(t.amount),
      catName(t.categoryId),
      tagNames(t.tagIds),
      t.note,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    download(`cashy-${todayYMD()}.csv`, "﻿" + csv, "text/csv;charset=utf-8");
    toast.success("Exported CSV");
  }

  function onImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = importData(String(reader.result));
      if (res.ok) toast.success("Data imported");
      else toast.error(res.error ?? "Import failed");
    };
    reader.readAsText(file);
  }

  function saveName() {
    updateWorkspace({ displayName: name.trim() || "Mine" });
    toast.success("Saved");
  }

  async function doLoadSample() {
    if (transactions.length) {
      const ok = await confirm({
        title: "Load sample data?",
        message: "This will replace all current categories, tags, and transactions.",
        confirmLabel: "Load sample data",
        danger: true,
      });
      if (!ok) return;
    }
    loadSampleData();
    toast.success("Sample data loaded");
  }

  async function doReset() {
    const ok = await confirmDelete({
      title: "Delete all data and start over?",
      message: "This action cannot be undone.",
      confirmLabel: "Delete & start over",
    });
    if (ok) resetAll();
  }

  return (
    <div className="wb-stack wb-stack--loose">
      <PageHeader
        title="Settings"
        subtitle="Appearance, workspace, and data backup."
      />

      {/* Fills the page like every other screen (no narrow centred rail). Auto
          columns: two side-by-side only when there's room for a comfortable card,
          otherwise one full-width column — never a cramped, clipping two-up.
          align-items:start so a short card doesn't stretch to a tall neighbour. */}
      <div
        className="wb-grid wb-grid--auto"
        style={{ alignItems: "start", "--wb-grid-min": "340px" } as CSSProperties}
      >
      <Section title="Appearance">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {THEMES.map((t) => {
            const active = theme === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTheme(t.key)}
                className={cn("wb-btn", active ? "wb-btn--secondary" : "wb-btn--outline")}
                style={{ flexDirection: "column", gap: 6, height: "auto", paddingBlock: 12 }}
              >
                <span className="wb-ico">{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="wb-field">
          <label className="wb-label">Subscription icon color</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {SUB_ICON_STYLES.map((o) => {
              const active = subIconStyle === o.key;
              return (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setSubIconStyle(o.key)}
                  className={cn("wb-btn", active ? "wb-btn--secondary" : "wb-btn--outline")}
                  style={{ gap: 8 }}
                >
                  <span className="wb-ico wb-ico--sm">{o.icon}</span>
                  {o.label}
                </button>
              );
            })}
          </div>
          <span style={{ fontSize: 12, color: "var(--wb-fg-muted)" }}>
            “Neutral” keeps every service icon grey; “By service” tints each icon with its
            own service color.
          </span>
        </div>
      </Section>

      <Section title="Workspace">
        <div className="wb-field">
          <label className="wb-label" htmlFor="ws">
            Name
          </label>
          <div className="wb-cluster wb-cluster--nowrap">
            <input
              id="ws"
              className="wb-input wb-grow"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              type="button"
              className="wb-btn wb-btn--secondary"
              onClick={saveName}
              disabled={name.trim() === (workspace?.displayName ?? "")}
            >
              Save
            </button>
          </div>
        </div>
        <ul className="wb-list wb-list--flush">
          <li className="wb-list__item">
            <span className="wb-list__title">Currency</span>
            <span className="wb-list__end wb-num--strong">VND (₫)</span>
          </li>
        </ul>
      </Section>

      <Section title="Data">
        <p style={{ fontSize: 13, color: "var(--wb-fg-muted)", margin: 0 }}>
          Back up to JSON (restorable) or CSV (opens in Excel). Data is stored only in this
          browser.
        </p>
        <div className="wb-cluster">
          <button type="button" className="wb-btn wb-btn--secondary wb-btn--sm" style={{ gap: 6 }} onClick={doExportJSON}>
            <span className="wb-ico wb-ico--sm">download</span>
            Export JSON
          </button>
          <button type="button" className="wb-btn wb-btn--secondary wb-btn--sm" style={{ gap: 6 }} onClick={doExportCSV}>
            <span className="wb-ico wb-ico--sm">download</span>
            Export CSV
          </button>
          <button
            type="button"
            className="wb-btn wb-btn--secondary wb-btn--sm"
            style={{ gap: 6 }}
            onClick={() => fileRef.current?.click()}
          >
            <span className="wb-ico wb-ico--sm">upload</span>
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={onImportFile}
          />
        </div>
        <div className="wb-cluster wb-cluster--between">
          <p style={{ fontSize: 13, color: "var(--wb-fg-muted)", margin: 0, flex: "1 1 200px" }}>
            Load ~200 sample transactions with categories and tags to try out the interface.
          </p>
          <button
            type="button"
            className="wb-btn wb-btn--outline wb-btn--sm"
            style={{ gap: 6, flex: "none" }}
            onClick={doLoadSample}
          >
            <span className="wb-ico wb-ico--sm">database</span>
            Load sample data
          </button>
        </div>
      </Section>

      <Section title="Danger zone">
        <div className="wb-cluster wb-cluster--between">
          <p style={{ fontSize: 13, color: "var(--wb-fg-muted)", margin: 0, flex: "1 1 200px" }}>
            Delete all transactions, categories, and tags, then start over from scratch.
          </p>
          <button
            type="button"
            className="wb-btn wb-btn--outline wb-btn--sm"
            style={{ gap: 6, flex: "none", color: "var(--wb-danger-text)", borderColor: "var(--wb-danger)" }}
            onClick={doReset}
          >
            <span className="wb-ico wb-ico--sm">delete</span>
            Delete &amp; start over
          </button>
        </div>
      </Section>
      </div>
    </div>
  );
}
