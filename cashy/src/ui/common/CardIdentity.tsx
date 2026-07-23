import type { CSSProperties, ReactNode } from "react";
import { Icon } from "@/ui/kit/icons";

/**
 * CardIdentity — the identity header shared by entity cards (wallet, loan, …):
 * a neutral (or classification-tinted) icon tile, the entity's name (truncated,
 * with an optional "· archived" suffix), a muted subtitle beneath it, and an
 * optional trailing slot for a status capsule.
 *
 * Feature-leaf cards compose this instead of re-hand-rolling the same
 * icon + name + subtitle block with inline styles; the bespoke spacing lives in
 * the `cashy-cardhead*` classes (index.css), and the tile reuses `.cashy-subtile`
 * (its hue is driven by the `--cashy-sub-c` custom property).
 */
export function CardIdentity({
  icon,
  tint,
  title,
  subtitle,
  archived = false,
  trailing,
}: {
  /** curated lucide key (see lib/icons) */
  icon: string;
  /** classification hue for the tile; omitted → neutral grey */
  tint?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** appends a muted "· archived" marker after the title */
  archived?: boolean;
  /** right-aligned slot — typically a status capsule */
  trailing?: ReactNode;
}) {
  return (
    <div className="cashy-cardhead">
      <span
        className="cashy-subtile"
        aria-hidden="true"
        style={tint ? ({ "--cashy-sub-c": tint } as CSSProperties) : undefined}
      >
        <Icon name={icon} size={18} />
      </span>
      <div className="cashy-cardhead__main">
        <div className="cashy-cardhead__title">
          {title}
          {archived && <span className="cashy-cardhead__archived"> · archived</span>}
        </div>
        {subtitle != null && <div className="cashy-cardhead__sub">{subtitle}</div>}
      </div>
      {trailing != null && <div className="cashy-cardhead__trailing">{trailing}</div>}
    </div>
  );
}
