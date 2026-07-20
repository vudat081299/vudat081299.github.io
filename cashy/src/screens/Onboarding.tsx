import { useState } from "react";
import { createWorkspace } from "@/lib/store";

export function Onboarding() {
  const [name, setName] = useState("");

  function submit() {
    createWorkspace({ displayName: name.trim() || "Của tôi" });
  }

  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100dvh", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div
          style={{
            marginBottom: 24,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            textAlign: "center",
          }}
        >
          <span
            className="wb-navbar__mark"
            style={{ width: 44, height: 44, borderRadius: "var(--wb-radius-lg)" }}
          >
            <span className="wb-ico">account_balance_wallet</span>
          </span>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em", margin: 0 }}>
              Chào mừng đến Cashy
            </h1>
            <p style={{ marginTop: 4, fontSize: 13, color: "var(--wb-fg-muted)" }}>
              Sổ chi tiêu cá nhân — số liệu là nhân vật chính.
            </p>
          </div>
        </div>

        <div className="wb-card">
          <div
            className="wb-card__body"
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <div className="wb-field">
              <label className="wb-label" htmlFor="ws-name">
                Tên không gian
              </label>
              <input
                id="ws-name"
                className="wb-input"
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Ví dụ: Chi tiêu của Đạt"
              />
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
                color: "var(--wb-fg-muted)",
              }}
            >
              <span>Đơn vị tiền tệ</span>
              <span style={{ fontWeight: 600, color: "var(--wb-fg)" }}>VND (₫)</span>
            </div>

            <button className="wb-btn" style={{ width: "100%" }} onClick={submit}>
              Tạo không gian
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
