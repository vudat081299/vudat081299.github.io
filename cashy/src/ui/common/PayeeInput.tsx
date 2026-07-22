import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

/** Gap below the input, and the margin kept off the viewport edge. */
const GAP = 6;
const EDGE = 8;

/**
 * The counterparty field — a free-text input that suggests as you type. It never
 * forces a choice: whatever you type is the value, and the dropdown only offers
 * payees you've used before, ranked by how close they are to what's typed
 * (prefix matches first, then anything containing it, each group in most-used
 * order). Pick one to fill the field, or ignore the list and keep typing.
 *
 * The list is PORTALLED and positioned `fixed` against the input, for the same
 * reason the app's popovers are: it lives inside the modal's scrolling body,
 * which would otherwise clip a dropdown hanging past a field near the bottom.
 */
export function PayeeInput({
  id,
  value,
  onChange,
  suggestions,
  placeholder,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  /** distinct payees already in the ledger, most-used first */
  suggestions: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const q = value.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return suggestions.slice(0, 8);
    // Array.sort is stable, so ranking by prefix-vs-contains keeps the incoming
    // most-used order within each group. Drop an entry that's already exactly
    // what's typed — there's nothing to complete.
    return suggestions
      .filter((s) => {
        const l = s.toLowerCase();
        return l.includes(q) && l !== q;
      })
      .sort((a, b) => rank(a, q) - rank(b, q))
      .slice(0, 8);
  }, [suggestions, q]);

  const show = open && matches.length > 0;

  const place = useCallback(() => {
    const anchor = inputRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    const a = anchor.getBoundingClientRect();
    const h = panel.offsetHeight;
    const below = a.bottom + GAP;
    const above = a.top - GAP - h;
    const fitsBelow = below + h <= window.innerHeight - EDGE;
    let top = fitsBelow || above < EDGE ? below : above;
    top = Math.max(EDGE, Math.min(top, window.innerHeight - EDGE - h));
    setPos({ top, left: a.left, width: a.width });
  }, []);

  useLayoutEffect(() => {
    if (show) place();
  }, [show, place, matches.length]);

  useEffect(() => {
    if (!show) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (inputRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [show, place]);

  // A fresh query means the old highlight is meaningless; clear it so Enter falls
  // through to submitting the form rather than picking a stale row.
  useEffect(() => {
    setActive(-1);
  }, [q]);

  const pick = (s: string) => {
    onChange(s);
    setOpen(false);
    setActive(-1);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      if (!show) {
        if (matches.length) setOpen(true);
        return;
      }
      e.preventDefault();
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      if (!show) return;
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (show && active >= 0) {
        e.preventDefault();
        pick(matches[active]);
      }
    } else if (e.key === "Escape") {
      if (show) {
        // Close only the suggestions — let the modal keep its own Escape.
        e.stopPropagation();
        setOpen(false);
      }
    }
  };

  return (
    <>
      <input
        id={id}
        ref={inputRef}
        className="wb-input"
        value={value}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          // Keep it open when focus moves INTO the panel; otherwise (tab-out) close.
          // A pointer pick uses mousedown+preventDefault, so it never blurs here.
          if (!panelRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
        }}
        onKeyDown={onKeyDown}
      />
      {show &&
        createPortal(
          <div
            ref={panelRef}
            className="wb-popover__panel"
            style={{
              position: "fixed",
              // `.wb-popover__panel` is `display:none` until an `.is-open` ancestor
              // reveals it; portalled to <body> there is none, so say `block` here —
              // the same override the Popover component makes.
              display: "block",
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              // Neutralise the stylesheet's default placement (centred above via
              // bottom + translateX(-50%)) — left unset it drags the panel half its
              // width sideways and pins its height to 10px. Same reset as Popover.
              right: "auto",
              bottom: "auto",
              transform: "none",
              width: pos?.width,
              maxWidth: pos?.width,
              padding: 4,
              zIndex: 1000,
              maxHeight: 240,
              overflowY: "auto",
            }}
          >
            <div
              className="wb-menu"
              style={{ border: 0, boxShadow: "none", padding: 0, background: "none" }}
            >
              {matches.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  className="wb-menu__item"
                  // mousedown, not click: a click fires after the input's blur, which
                  // would already have torn the panel down. preventDefault also keeps
                  // focus on the input so no blur fires at all.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(s);
                  }}
                  onMouseEnter={() => setActive(i)}
                  style={i === active ? { background: "var(--wb-surface-hover)" } : undefined}
                >
                  <span className="wb-ico wb-ico--xs" style={{ color: "var(--wb-fg-muted)" }}>
                    person
                  </span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s}
                  </span>
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/** Prefix matches rank above mere substring matches. */
function rank(s: string, q: string): number {
  return s.toLowerCase().startsWith(q) ? 0 : 1;
}
