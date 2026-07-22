import {
  useEffect,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "@/lib/utils";

/* ---- Colour maths (ported from app.js initColorPicker) --------------------------
   Pure, module-level so they're stable across renders and never land in a hook's deps.
   HSV is the interaction source of truth (an SV point can't be reconstructed from a hex
   alone — pure black loses its hue); hex is what we report out. --------------------- */
type HSV = { h: number; s: number; v: number };

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, "0");

/** HSV (h 0–360, s/v 0–100) -> `RRGGBB` uppercase, no leading `#`. */
function hsvToHex(H: number, S: number, V: number): string {
  S /= 100;
  V /= 100;
  const c = V * S;
  const x = c * (1 - Math.abs(((H / 60) % 2) - 1));
  const m = V - c;
  const [r, g, b] =
    H < 60 ? [c, x, 0]
    : H < 120 ? [x, c, 0]
    : H < 180 ? [0, c, x]
    : H < 240 ? [0, x, c]
    : H < 300 ? [x, 0, c]
    : [c, 0, x];
  return (hex2((r + m) * 255) + hex2((g + m) * 255) + hex2((b + m) * 255)).toUpperCase();
}

function rgbToHsv(r: number, g: number, b: number): HSV {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let H = 0;
  if (d) {
    H = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    H = (H * 60 + 360) % 360;
  }
  return { h: H, s: mx ? (d / mx) * 100 : 0, v: mx * 100 };
}

/** Parse `#RRGGBB`, `RRGGBB`, a 3-digit shorthand, or `rgb(r,g,b)` -> HSV, or null. */
function parseColor(str: string): HSV | null {
  const s = str.trim();
  if (s.startsWith("rgb")) {
    const n = s.match(/\d+/g);
    return n && n.length >= 3 ? rgbToHsv(+n[0], +n[1], +n[2]) : null;
  }
  let hx = s.replace("#", "");
  if (hx.length === 3)
    hx = hx
      .split("")
      .map((c) => c + c)
      .join("");
  if (!/^[0-9a-f]{6}$/i.test(hx)) return null;
  return rgbToHsv(
    parseInt(hx.slice(0, 2), 16),
    parseInt(hx.slice(2, 4), 16),
    parseInt(hx.slice(4, 6), 16),
  );
}

// Case-insensitive, `#`-agnostic key so a selected swatch matches regardless of casing.
const normColor = (c: string) => c.trim().replace(/^#/, "").toLowerCase();

// The approved chart hues (mirrors --wb-chart-1…8), in hex so preset clicks parse cleanly.
const DEFAULT_PRESETS = [
  "#6366f1",
  "#14b8a6",
  "#f59e0b",
  "#ec4899",
  "#3b82f6",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
];

/**
 * Swatches — the docs' `.wb-swatches` preset grid (§29): a row of colour chips you pick
 * FROM, so choice stays inside approved hues (the colour ladder) instead of opening the
 * OS colour dialog. Each chip carries its hue inline via `--wb-swatch-color`; the selected
 * chip gets the fg gap-ring that reads on any hue. Controlled/uncontrolled is the parent's
 * call — it's a stateless pick grid: give it `colors` + `value`, get `onChange(color)`.
 */
export function Swatches({
  colors,
  value,
  onChange,
  round,
  size,
  className,
  ariaLabel,
}: {
  /** Preset colours to choose from — hex (`#6366f1`) or any CSS colour string. */
  colors: string[];
  /** Selected colour; the matching chip gets the ring (hex compare is case-insensitive). */
  value?: string | null;
  onChange?: (color: string) => void;
  /** Pill chips — `.wb-swatches--round`. */
  round?: boolean;
  /** Smaller chips — `.wb-swatches--sm`. */
  size?: "sm";
  className?: string;
  ariaLabel?: string;
}) {
  const sel = value != null ? normColor(value) : null;
  return (
    <div
      className={cn(
        "wb-swatches",
        round && "wb-swatches--round",
        size === "sm" && "wb-swatches--sm",
        className,
      )}
      role="group"
      aria-label={ariaLabel}
    >
      {colors.map((c) => {
        const isSel = sel !== null && normColor(c) === sel;
        return (
          <button
            key={c}
            type="button"
            className={cn("wb-swatch", isSel && "is-selected")}
            style={{ "--wb-swatch-color": c } as CSSProperties}
            aria-label={c}
            aria-pressed={isSel}
            onClick={() => onChange?.(c)}
          />
        );
      })}
    </div>
  );
}

/**
 * ColorPicker — the docs' `.wb-colorpicker` panel (§29) that REPLACES the native OS colour
 * dialog: a saturation/value area, a rainbow hue slider, a hex field, and a preset row
 * (reuses `Swatches`). The docs leave the drag + HSV maths to "a small pointer handler";
 * this hand-rolls it (no app.js, no lib) with the same pointer-capture drag as the source.
 *
 * WHY HSV lives in local state even when `value` is controlled: the SV area position isn't
 * recoverable from a hex alone, so HSV is the working truth and hex is the reported value.
 * A controlled `value` is synced back in via effect ONLY when it differs from what we'd emit,
 * so a round-tripped `onChange` can't loop. The hex field keeps a local draft while focused
 * (so a half-typed value isn't clobbered) and snaps to the canonical hex on blur — matching
 * app.js's "don't overwrite the focused field" behaviour.
 */
export function ColorPicker({
  value,
  defaultValue = "#6366F1",
  onChange,
  presets = DEFAULT_PRESETS,
  className,
}: {
  /** Controlled colour (`#RRGGBB`). Omit to run uncontrolled. */
  value?: string;
  /** Initial colour when uncontrolled. */
  defaultValue?: string;
  onChange?: (hex: string) => void;
  /** Preset row hues; pass `[]` to hide the row. */
  presets?: string[];
  className?: string;
}) {
  const [hsv, setHsv] = useState<HSV>(
    () => parseColor(value ?? defaultValue) ?? { h: 239, s: 59, v: 95 },
  );
  // Raw text shown while the hex field is being edited; null == show the canonical hex.
  const [hexDraft, setHexDraft] = useState<string | null>(null);

  const hex = hsvToHex(hsv.h, hsv.s, hsv.v); // "RRGGBB", uppercase, no '#'

  // Adopt a controlled `value` that changed outside our own emit. The functional update
  // reads the live HSV (so `hex` needn't be a dep) and returns `prev` when the colour already
  // matches — no re-render, no feedback loop.
  useEffect(() => {
    if (value === undefined) return;
    const c = parseColor(value);
    if (!c) return;
    setHsv((prev) =>
      hsvToHex(c.h, c.s, c.v) === hsvToHex(prev.h, prev.s, prev.v) ? prev : c,
    );
  }, [value]);

  function commit(next: HSV) {
    setHsv(next);
    onChange?.("#" + hsvToHex(next.h, next.s, next.v));
  }

  // Pointer-capture drag shared by the SV area and the hue track (mirrors app.js `track`):
  // press registers immediately, then move/up/cancel run off the captured node.
  function drag(
    e: ReactPointerEvent<HTMLDivElement>,
    toHsv: (nx: number, ny: number) => HSV,
  ) {
    const node = e.currentTarget;
    setHexDraft(null); // a drag re-syncs the hex field to the live value
    const apply = (clientX: number, clientY: number) => {
      const r = node.getBoundingClientRect();
      commit(toHsv(clamp01((clientX - r.left) / r.width), clamp01((clientY - r.top) / r.height)));
    };
    apply(e.clientX, e.clientY);
    try {
      node.setPointerCapture(e.pointerId);
    } catch {
      // setPointerCapture can throw if the pointer is already gone — safe to ignore.
    }
    const onMove = (ev: PointerEvent) => apply(ev.clientX, ev.clientY);
    const onUp = () => {
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerup", onUp);
      node.removeEventListener("pointercancel", onUp);
    };
    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerup", onUp);
    node.addEventListener("pointercancel", onUp);
  }

  return (
    <div className={cn("wb-colorpicker", className)} style={{ "--wb-cp-value": "#" + hex } as CSSProperties}>
      <div
        className="wb-colorpicker__area"
        style={{ "--wb-cp-hue": `hsl(${hsv.h}, 100%, 50%)` } as CSSProperties}
        onPointerDown={(e) => drag(e, (nx, ny) => ({ h: hsv.h, s: nx * 100, v: (1 - ny) * 100 }))}
      >
        <span
          className="wb-colorpicker__thumb"
          style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }}
        />
      </div>
      <div
        className="wb-colorpicker__hue"
        onPointerDown={(e) => drag(e, (nx) => ({ h: nx * 360, s: hsv.s, v: hsv.v }))}
      >
        <span className="wb-colorpicker__thumb" style={{ left: `${(hsv.h / 360) * 100}%` }} />
      </div>
      <div className="wb-colorpicker__foot">
        <span className="wb-colorpicker__preview" />
        <div className="wb-input-group">
          <span className="wb-input-group__addon">#</span>
          <input
            className="wb-input"
            value={hexDraft ?? hex}
            spellCheck={false}
            inputMode="text"
            aria-label="Mã màu hex"
            onChange={(e) => {
              const raw = e.target.value;
              setHexDraft(raw);
              const c = parseColor(raw);
              if (c) commit(c);
            }}
            onBlur={() => setHexDraft(null)}
          />
        </div>
      </div>
      {presets.length > 0 && (
        <Swatches
          size="sm"
          colors={presets}
          value={"#" + hex}
          ariaLabel="Màu gợi ý"
          onChange={(c) => {
            const parsed = parseColor(c);
            if (parsed) commit(parsed);
          }}
        />
      )}
    </div>
  );
}
