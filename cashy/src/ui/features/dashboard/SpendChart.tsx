import { formatMoneyShort } from "@/domain/money";
import { formatPercent } from "@/domain/format";
import type { BreakdownSlice } from "@/domain";

/**
 * Interactive donut of spend-by-category. Each slice keeps its category's
 * identity hue and is clickable: the selected slice lifts OUT past the ring's
 * edge and dims the rest, while the hole switches from the running total to that
 * category's name, amount and share. Selection is controlled by the parent so the
 * legend list beside it highlights and toggles in lock-step.
 *
 * Drawn by hand as SVG annular sectors (not recharts) precisely so the pop-out
 * and per-slice offset are exact and never clipped by a chart library's radius
 * maths.
 */
const CX = 50;
const CY = 50;
const INNER_R = 27;
const OUTER_R = 42;
// How much the selected slice's OUTER edge grows — a gentle emphasis, not a
// leap. It grows outward only: the inner radius is untouched, so the slice keeps
// its distance from the centre hole instead of sliding away from it. Kept small
// so OUTER_R + POP (45) still sits inside the 0–100 viewBox and never clips.
const POP = 3;

/** A point on a circle, angle in degrees measured clockwise from 12 o'clock. */
function pt(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
}

/** Path for one donut segment between innerR/outerR from deg0 to deg1. */
function segPath(cx: number, cy: number, innerR: number, outerR: number, deg0: number, deg1: number) {
  const large = deg1 - deg0 > 180 ? 1 : 0;
  const [ox0, oy0] = pt(cx, cy, outerR, deg0);
  const [ox1, oy1] = pt(cx, cy, outerR, deg1);
  const [ix1, iy1] = pt(cx, cy, innerR, deg1);
  const [ix0, iy0] = pt(cx, cy, innerR, deg0);
  return `M${ox0},${oy0} A${outerR},${outerR} 0 ${large} 1 ${ox1},${oy1} L${ix1},${iy1} A${innerR},${innerR} 0 ${large} 0 ${ix0},${iy0} Z`;
}

export function SpendChart({
  slices,
  total,
  label = "Total spent",
  size = 220,
  selectedId = null,
  onSelect,
}: {
  slices: BreakdownSlice[];
  total: number;
  label?: string;
  size?: number;
  /** id of the currently-selected category (controlled), or null for none. */
  selectedId?: string | null;
  /** toggle selection; passes the id, or null when the slice is deselected. */
  onSelect?: (id: string | null) => void;
}) {
  const empty = slices.length === 0;
  const sel = selectedId ? (slices.find((s) => s.id === selectedId) ?? null) : null;
  const anySel = sel !== null;

  // Lay the slices end-to-end from 12 o'clock, leaving a hair of gap between them
  // (only when there are ≥2) so the seams read.
  const gap = slices.length > 1 ? 1.5 : 0;
  let cursor = 0;
  const arcs = slices.map((s) => {
    const sweep = Math.max(0, s.pct * 360 - gap);
    const deg0 = cursor;
    const deg1 = Math.min(359.99, cursor + Math.max(sweep, 0.01));
    cursor += s.pct * 360;
    const selected = s.id === selectedId;
    // The selected slice grows OUTWARD from a fixed centre — no lift along its
    // mid-angle, so its inner edge stays flush with the hole and it can't drift
    // past the viewBox and get clipped.
    return {
      id: s.id,
      d: segPath(CX, CY, INNER_R, selected ? OUTER_R + POP : OUTER_R, deg0, deg1),
      color: s.colorHex,
      selected,
    };
  });

  return (
    <div
      style={{
        position: "relative",
        marginInline: "auto",
        width: size,
        height: size,
        maxWidth: "100%",
      }}
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label={label}>
        {empty ? (
          <circle
            cx={CX}
            cy={CY}
            r={(INNER_R + OUTER_R) / 2}
            fill="none"
            stroke="var(--wb-border)"
            strokeWidth={OUTER_R - INNER_R}
          />
        ) : (
          arcs.map((a) => (
            <path
              key={a.id}
              d={a.d}
              fill={a.color}
              fillOpacity={anySel && !a.selected ? 0.4 : 1}
              stroke="var(--wb-surface)"
              strokeWidth={0.5}
              style={{ cursor: "pointer", transition: "fill-opacity .12s ease" }}
              onClick={() => onSelect?.(a.selected ? null : a.id)}
            />
          ))
        )}
      </svg>
      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          padding: "0 22%",
          textAlign: "center",
        }}
      >
        {sel ? (
          <>
            <span
              style={{
                fontSize: 11,
                fontWeight: 550,
                color: "var(--wb-fg-muted)",
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {sel.name}
            </span>
            <span className="wb-num" style={{ fontSize: 16, fontWeight: 700, color: "var(--wb-fg)" }}>
              {formatMoneyShort(sel.total)}
            </span>
            <span
              className="wb-num"
              style={{ fontSize: 12, fontWeight: 700, color: sel.colorHex }}
            >
              {formatPercent(sel.pct)}
            </span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 11, fontWeight: 550, color: "var(--wb-fg-muted)" }}>
              {label}
            </span>
            <span className="wb-num" style={{ fontSize: 18, fontWeight: 700, color: "var(--wb-fg)" }}>
              {formatMoneyShort(total)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
