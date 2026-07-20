import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { toast } from "@/components/wb/Toast";
import { cn } from "@/lib/utils";
import {
  exportData,
  importData,
  loadSampleData,
  resetAll,
  setTheme,
  updateWorkspace,
  useCashy,
} from "@/lib/store";
import { todayYMD } from "@/lib/date";
import { PageHeader } from "@/components/PageHeader";
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
      <div className="wb-card__body wb-stack">
        <h3 className="wb-card__title">{title}</h3>
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

  function doLoadSample() {
    if (
      transactions.length &&
      !window.confirm(
        "Nạp dữ liệu mẫu sẽ thay thế toàn bộ danh mục, nhãn và giao dịch hiện tại. Tiếp tục?",
      )
    )
      return;
    loadSampleData();
    toast.success("Đã nạp dữ liệu mẫu");
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
    <div className="wb-stack wb-stack--loose" style={{ maxWidth: 640, marginInline: "auto", width: "100%" }}>
      <PageHeader
        eyebrow={workspace?.displayName ?? "Cashy"}
        title="Cài đặt"
        subtitle="Giao diện, không gian và sao lưu dữ liệu."
      />

      <Section title="Giao diện">
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
      </Section>

      <Section title="Không gian">
        <div className="wb-field">
          <label className="wb-label" htmlFor="ws">
            Tên
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
              Lưu
            </button>
          </div>
        </div>
        <ul className="wb-list wb-list--flush">
          <li className="wb-list__item">
            <span className="wb-list__title">Đơn vị tiền tệ</span>
            <span className="wb-list__end wb-num--strong">VND (₫)</span>
          </li>
        </ul>
      </Section>

      <Section title="Dữ liệu">
        <p style={{ fontSize: 13, color: "var(--wb-fg-muted)", margin: 0 }}>
          Sao lưu ra JSON (khôi phục được) hoặc CSV (mở bằng Excel). Dữ liệu chỉ lưu trên
          trình duyệt này.
        </p>
        <div className="wb-cluster">
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
        <div className="wb-cluster wb-cluster--between">
          <p style={{ fontSize: 13, color: "var(--wb-fg-muted)", margin: 0, flex: "1 1 200px" }}>
            Nạp ~200 giao dịch mẫu cùng danh mục và nhãn để xem thử giao diện.
          </p>
          <button
            type="button"
            className="wb-btn wb-btn--outline wb-btn--sm"
            style={{ gap: 6, flex: "none" }}
            onClick={doLoadSample}
          >
            <span className="wb-ico wb-ico--sm">database</span>
            Nạp dữ liệu mẫu
          </button>
        </div>
      </Section>

      <Section title="Nguy hiểm">
        <div className="wb-cluster wb-cluster--between">
          <p style={{ fontSize: 13, color: "var(--wb-fg-muted)", margin: 0, flex: "1 1 200px" }}>
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
