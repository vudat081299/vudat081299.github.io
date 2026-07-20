import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { toast } from "@/components/wb/Toast";
import {
  Download,
  Monitor,
  Moon,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
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
import { AVATAR_COLORS } from "@/lib/palette";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

const THEMES: { key: ThemeMode; label: string; icon: typeof Sun }[] = [
  { key: "system", label: "Hệ thống", icon: Monitor },
  { key: "light", label: "Sáng", icon: Sun },
  { key: "dark", label: "Tối", icon: Moon },
];

export function Settings() {
  const { workspace, theme, categories, tags, transactions } = useCashy();
  const [name, setName] = useState(workspace?.displayName ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  function doExportJSON() {
    download(
      `cashy-${todayYMD()}.json`,
      exportData(),
      "application/json",
    );
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Cài đặt</h2>
      </div>

      <Section title="Giao diện">
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => {
            const active = theme === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTheme(t.key)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-md border py-3 text-[13px] font-medium transition",
                  active
                    ? "border-foreground/30 bg-accent"
                    : "text-muted-foreground hover:bg-accent/50",
                )}
              >
                <t.icon size={18} />
                {t.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Không gian">
        <div className="space-y-1.5">
          <Label htmlFor="ws">Tên</Label>
          <div className="flex gap-2">
            <Input id="ws" value={name} onChange={(e) => setName(e.target.value)} />
            <Button
              variant="outline"
              onClick={saveName}
              disabled={name.trim() === (workspace?.displayName ?? "")}
            >
              Lưu
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Màu nhận diện</Label>
          <div className="flex flex-wrap gap-1.5">
            {AVATAR_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => updateWorkspace({ avatarColor: hex })}
                className={cn(
                  "size-7 rounded-md ring-offset-2 ring-offset-card transition",
                  workspace?.avatarColor === hex && "ring-2 ring-foreground/40",
                )}
                style={{ background: hex }}
                aria-label={hex}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-[13px]">
          <span className="text-muted-foreground">Đơn vị tiền tệ</span>
          <span className="font-medium">VND (₫)</span>
        </div>
      </Section>

      <Section title="Dữ liệu">
        <p className="text-[13px] text-muted-foreground">
          Sao lưu ra JSON (khôi phục được) hoặc CSV (mở bằng Excel). Dữ liệu chỉ
          lưu trên trình duyệt này.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={doExportJSON}>
            <Download size={15} />
            Xuất JSON
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={doExportCSV}>
            <Download size={15} />
            Xuất CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={15} />
            Nhập JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onImportFile}
          />
        </div>
      </Section>

      <Section title="Nguy hiểm">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[13px] text-muted-foreground">
            Xoá toàn bộ giao dịch, danh mục và nhãn, rồi bắt đầu lại từ đầu.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 border-expense/40 text-expense hover:bg-expense/10"
            onClick={doReset}
          >
            <Trash2 size={15} />
            Xoá & làm lại
          </Button>
        </div>
      </Section>
    </div>
  );
}
