import { useState } from "react";
import { createWorkspace } from "@/usecases";

export function Onboarding() {
  const [name, setName] = useState("");

  function submit() {
    createWorkspace({ displayName: name.trim() || "Của tôi" });
  }

  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100dvh", padding: 16 }}>
      <div className="wb-stack" style={{ width: "100%", maxWidth: 400 }}>
        <div className="cashy-brand">
          <span
            className="wb-navbar__mark"
            style={{ width: 48, height: 48, borderRadius: "var(--wb-radius-lg)" }}
          >
            <span className="wb-ico wb-ico--lg">account_balance_wallet</span>
          </span>
          <div>
            <span className="cashy-eyebrow">Sổ chi tiêu cá nhân</span>
            <h1 className="cashy-brand__title" style={{ marginTop: 8 }}>
              Chào mừng đến Cashy
            </h1>
            <p className="cashy-brand__sub">Số liệu là nhân vật chính — trắng, đen, xám.</p>
          </div>
        </div>

        <div className="wb-card">
          <div className="wb-card__body wb-stack">
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

            <ul className="wb-list wb-list--flush">
              <li className="wb-list__item">
                <span className="wb-list__title">Đơn vị tiền tệ</span>
                <span className="wb-list__end wb-num--strong">VND (₫)</span>
              </li>
              <li className="wb-list__item">
                <span className="wb-list__title" style={{ flex: 1 }}>
                  Dữ liệu mẫu
                  <span className="wb-list__sub">200 giao dịch trong 10 ngày gần đây</span>
                </span>
                <span className="wb-list__end wb-cell-muted">Tự động nạp</span>
              </li>
            </ul>

            <button className="wb-btn wb-btn--block" onClick={submit}>
              Tạo không gian
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
