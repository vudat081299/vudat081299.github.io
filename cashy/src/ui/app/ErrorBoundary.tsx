import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Last line of defence around the whole app.
 *
 * Without it, ANY exception thrown while rendering unmounts the tree and leaves
 * a blank white page — no message, nothing in the UI to act on, and the only
 * trace is a console the user has to know to open. That failure mode cost a
 * debugging session, so the boundary prints the error where it happened and
 * offers the one recovery that fixes a corrupt saved ledger.
 *
 * Deliberately plain CSS-in-JS: if the crash happened before the stylesheets
 * applied, a screen built out of `wb-*` classes would itself be unreadable.
 */
interface State {
  error: Error | null;
  info: string;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, info: "" };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the console copy — it carries the full component stack.
    console.error("[cashy] render crashed:", error, info.componentStack);
    this.setState({ info: info.componentStack ?? "" });
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        style={{
          maxWidth: 720,
          margin: "48px auto",
          padding: 24,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 13,
          lineHeight: 1.6,
          color: "#18181b",
          background: "#fff",
          border: "1px solid #e4e4e7",
          borderRadius: 10,
          // The page declares `color-scheme: light dark`, so on a dark OS the UA
          // paints form controls with white `buttontext` — invisible on this
          // deliberately light card. Pin the scheme; this panel is always light.
          colorScheme: "light",
        }}
      >
        <h1 style={{ fontSize: 16, margin: "0 0 4px" }}>Cashy đã dừng khi render</h1>
        <p style={{ margin: "0 0 16px", color: "#71717a" }}>
          Lỗi bên dưới là nguyên nhân trang bị trắng. Dữ liệu vẫn nằm trong trình duyệt.
        </p>

        <pre
          style={{
            margin: 0,
            padding: 12,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "#fafafa",
            border: "1px solid #e4e4e7",
            borderRadius: 6,
            color: "#b91c1c",
          }}
        >
          {error.name}: {error.message}
        </pre>

        {info && (
          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: "pointer", color: "#71717a" }}>Component stack</summary>
            <pre
              style={{
                marginTop: 8,
                padding: 12,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                background: "#fafafa",
                border: "1px solid #e4e4e7",
                borderRadius: 6,
                color: "#52525b",
              }}
            >
              {info.trim()}
            </pre>
          </details>
        )}

        <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #d4d4d8",
              background: "#fff",
              cursor: "pointer",
              font: "inherit",
              color: "#18181b",
            }}
          >
            Tải lại trang
          </button>
          {/* The escape hatch when the SAVED STATE is what crashes: nothing else
              in the app can run to clear it once rendering is down. */}
          <button
            type="button"
            onClick={() => {
              if (!window.confirm("Xoá toàn bộ dữ liệu Cashy trong trình duyệt này?")) return;
              localStorage.removeItem("cashy_state_v1");
              localStorage.removeItem("cashy_tx_draft_v1");
              window.location.reload();
            }}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #d4d4d8",
              background: "#fff",
              cursor: "pointer",
              font: "inherit",
              color: "#b91c1c",
            }}
          >
            Xoá dữ liệu đã lưu &amp; tải lại
          </button>
        </div>
      </div>
    );
  }
}
