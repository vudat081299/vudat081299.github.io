import type { ReactNode } from "react";

/**
 * The screen header shared by every page: an eyebrow (small-caps kicker) + a
 * strong title + an optional subtitle, with an actions cluster pinned right.
 * All styling is token-based (`.cashy-*` in index.css) — no inline magic values.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="cashy-pagehead">
      <div style={{ minWidth: 0 }}>
        {eyebrow && <span className="cashy-eyebrow">{eyebrow}</span>}
        <h1 className="cashy-title">{title}</h1>
        {subtitle && <p className="cashy-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="cashy-pagehead__actions">{actions}</div>}
    </header>
  );
}
