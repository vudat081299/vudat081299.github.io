import { useState } from "react";
import { createWorkspace } from "@/usecases";

export function Onboarding() {
  const [name, setName] = useState("");

  function submit() {
    createWorkspace({ displayName: name.trim() || "Mine" });
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
            <span className="cashy-eyebrow">Personal spending tracker</span>
            <h1 className="cashy-brand__title" style={{ marginTop: 8 }}>
              Welcome to Cashy
            </h1>
            <p className="cashy-brand__sub">The numbers are the star — white, black, grey.</p>
          </div>
        </div>

        <div className="wb-card">
          <div className="wb-card__body wb-stack">
            <div className="wb-field">
              <label className="wb-label" htmlFor="ws-name">
                Workspace name
              </label>
              <input
                id="ws-name"
                className="wb-input"
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="e.g. Dat's spending"
              />
            </div>

            <ul className="wb-list wb-list--flush">
              <li className="wb-list__item">
                <span className="wb-list__title">Currency</span>
                <span className="wb-list__end wb-num--strong">VND (₫)</span>
              </li>
              <li className="wb-list__item">
                <span className="wb-list__title" style={{ flex: 1 }}>
                  Sample data
                  <span className="wb-list__sub">200 transactions from the last 10 days</span>
                </span>
                <span className="wb-list__end wb-cell-muted">Auto-loaded</span>
              </li>
            </ul>

            <button className="wb-btn wb-btn--block" onClick={submit}>
              Create workspace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
