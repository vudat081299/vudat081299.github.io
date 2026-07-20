import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { toast } from "@/components/wb/Toast";
import { cn } from "@/lib/utils";
import {
  exportData,
  importData,
  resetAll,
  setTheme,
  updateWorkspace,
  useCashy,
} from "@/lib/store";
import { todayYMD } from "@/lib/date";
import type { ThemeMode } from "@/types";

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
      <div className="wb-card__body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 650, margin: 0 }}>{title}</h3>
        {children}
      </div>
    </section>
  );
}

const THEMES: { key: ThemeMode; label: string; icon: string }[] = [
  { key: "system", label: "Hệ thống", icon: "computer" },
  { key: "light", label: "Sáng", icon: "light_mode" },
  { key: "dark", label: "Tối", icon: "dark_mode" },
];

export function Settings() {
  const { workspace, theme, categories, tags, transactions } = useCashy();
  const [name, setName] = useState(workspace?.displayName ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  function doExportJSON() {
    download(`cashy-${todayYMD()}.json`, exportData(), "application/json");
    toast.success("Đã xuất JSON");
  }

  function doExportCSV() {
    const catName = (id: string | null) =>
      id ? (categories.find((c) => c.id === id)?.name ?? "") : "";
    const tagNames = (ids: string[]) =>
      ids
        .map((id) => tags.find((t) => t.id === id)?.name ?? "")
        .filter(Boolean)
        .join("|");
    const header = ["Ngày", "Loại", "Số tiền", "Danh mục", "Nhãn", "Ghi chú"];
    const rows = transactions.map((t) => [
      t.occurredAt,
      t.type === "income" ? "Thu" : "Chi",
      String(t.amount),
      catName(t.categoryId),
      tagNames(t.tagIds),
      t.note,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    download(`cashy-${todayYMD()}.csv`, "﻿" + csv, "text/csv;charset=utf-8");
    toast.success("Đã xuất CSV");
  }

  function onImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = importData(String(reader.result));
      if (res.ok) toast.success("Đã nhập dữ liệu");
      else toast.error(res.error ?? "Nhập thất bại");
    };
    reader.readAsText(file);
  }

  function saveName() {
    updateWorkspace({ displayName: name.trim() || "Của tôi" });
    toast.success("Đã lưu");
  }

  function doReset() {
    if (
      window.confirm(
        "Xoá toàn bộ dữ liệu và bắt đầu lại? Hành động này không hoàn tác được.",
      )
    ) {
      resetAll();
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>Cài đặt</h2>

      <Section title="Giao diện">
        <div className="grid grid-cols-3 gap-2">
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
      </Section>

      <Section title="Không gian">
        <div className="wb-field">
          <label className="wb-label" htmlFor="ws">
            Tên
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              id="ws"
              className="wb-input"
              style={{ flex: 1 }}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              type="button"
              className="wb-btn wb-btn--secondary"
              onClick={saveName}
              disabled={name.trim() === (workspace?.displayName ?? "")}
            >
              Lưu
            </button>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--wb-surface-2)",
            borderRadius: "var(--wb-radius-sm)",
            padding: "8px 12px",
            fontSize: 13,
          }}
        >
          <span style={{ color: "var(--wb-fg-muted)" }}>Đơn vị tiền tệ</span>
          <span style={{ fontWeight: 600 }}>VND (₫)</span>
        </div>
      </Section>

      <Section title="Dữ liệu">
        <p style={{ fontSize: 13, color: "var(--wb-fg-muted)", margin: 0 }}>
          Sao lưu ra JSON (khôi phục được) hoặc CSV (mở bằng Excel). Dữ liệu chỉ lưu trên
          trình duyệt này.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" className="wb-btn wb-btn--secondary wb-btn--sm" style={{ gap: 6 }} onClick={doExportJSON}>
            <span className="wb-ico wb-ico--sm">download</span>
            Xuất JSON
          </button>
          <button type="button" className="wb-btn wb-btn--secondary wb-btn--sm" style={{ gap: 6 }} onClick={doExportCSV}>
            <span className="wb-ico wb-ico--sm">download</span>
            Xuất CSV
          </button>
          <button
            type="button"
            className="wb-btn wb-btn--secondary wb-btn--sm"
            style={{ gap: 6 }}
            onClick={() => fileRef.current?.click()}
          >
            <span className="wb-ico wb-ico--sm">upload</span>
            Nhập JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={onImportFile}
          />
        </div>
      </Section>

      <Section title="Nguy hiểm">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <p style={{ fontSize: 13, color: "var(--wb-fg-muted)", margin: 0 }}>
            Xoá toàn bộ giao dịch, danh mục và nhãn, rồi bắt đầu lại từ đầu.
          </p>
          <button
            type="button"
            className="wb-btn wb-btn--outline wb-btn--sm"
            style={{ gap: 6, flex: "none", color: "var(--wb-danger-text)", borderColor: "var(--wb-danger)" }}
            onClick={doReset}
          >
            <span className="wb-ico wb-ico--sm">delete</span>
            Xoá &amp; làm lại
          </button>
        </div>
      </Section>
    </div>
  );
}
