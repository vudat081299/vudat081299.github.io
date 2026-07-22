import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/** Selection-wrapping tokens (the same map app.js's initFormatbar uses). */
const WRAP: Record<string, [string, string]> = {
  bold: ["**", "**"],
  italic: ["*", "*"],
  underline: ["<u>", "</u>"],
  strike: ["~~", "~~"],
  highlight: ["==", "=="],
};
/** Line-prefix tokens (heading / clear-to-normal). */
const PREFIX: Record<string, string> = { h1: "# ", h2: "## ", normal: "" };

/**
 * useFormatbar — ports app.js's initFormatbar to a React hook. It owns a textarea
 * ref and a `run(cmd)` dispatcher: wrap commands surround the selection with markdown
 * tokens, heading commands prefix the current line, and `clear` strips tokens. The
 * command reads the live DOM value (so it never goes stale), writes the next value
 * back through `setValue`, then restores focus + selection on the next frame — after
 * React has re-rendered the controlled value.
 */
function useFormatbar(setValue: (value: string) => void) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const emit = (next: string, selStart?: number, selEnd?: number) => {
    const ta = ref.current;
    setValue(next);
    requestAnimationFrame(() => {
      if (!ta) return;
      ta.focus();
      if (selStart !== undefined) ta.setSelectionRange(selStart, selEnd ?? selStart);
    });
  };

  const run = (cmd: string) => {
    const ta = ref.current;
    if (!ta) return;
    const v = ta.value;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;

    if (WRAP[cmd]) {
      const [a, b] = WRAP[cmd];
      emit(v.slice(0, s) + a + v.slice(s, e) + b + v.slice(e), s + a.length, e + a.length);
      return;
    }
    if (cmd in PREFIX) {
      const lineStart = v.lastIndexOf("\n", s - 1) + 1;
      const rest = v.slice(lineStart).replace(/^#{1,6}\s*/, "");
      const p = PREFIX[cmd];
      emit(v.slice(0, lineStart) + p + rest, lineStart + p.length);
      return;
    }
    if (cmd === "clear") {
      const hasSel = e > s;
      const target = hasSel ? v.slice(s, e) : v;
      const out = target
        .replace(/\*\*|__|~~|==|`|\*|_|<\/?u>/g, "")
        .replace(/^#{1,6}\s*/gm, "");
      emit(hasSel ? v.slice(0, s) + out + v.slice(e) : out, s, hasSel ? s + out.length : s);
      return;
    }
  };

  return { ref, run };
}

/** Neutral highlight hues offered in the swatch dropdown (mirrors the docs page). */
const DEFAULT_HIGHLIGHTS = ["#fde68a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#fed7aa"];

const TEXT_BUTTONS: { cmd: string; label: string; title: string }[] = [
  { cmd: "normal", label: "Aa", title: "Văn bản thường" },
  { cmd: "h1", label: "H1", title: "Tiêu đề 1" },
  { cmd: "h2", label: "H2", title: "Tiêu đề 2" },
];
const MARK_BUTTONS: { cmd: string; icon: string; title: string }[] = [
  { cmd: "bold", icon: "format_bold", title: "Đậm" },
  { cmd: "italic", icon: "format_italic", title: "Nghiêng" },
  { cmd: "underline", icon: "format_underlined", title: "Gạch dưới" },
  { cmd: "strike", icon: "format_strikethrough", title: "Gạch ngang" },
];

/**
 * RichText — the web-builder `.wb-toolbar` format bar attached to a `.wb-textarea`.
 * Faithful to the source, this is a MARKDOWN editor, not a contentEditable/execCommand
 * surface: the toolbar inserts markdown tokens (**bold**, ## heading, ==highlight==)
 * around the selection, exactly as app.js does, and `value`/`onChange` carry a markdown
 * STRING (the page's own note: content is stored as markdown, rendered on display).
 * A headless colour dropdown sets the highlight-swatch preview (`--wb-hl-color`),
 * hand-rolled with the same outside-click/Esc dismissal as Popover.
 *
 * Controlled (`value`) or uncontrolled (`defaultValue`).
 */
export function RichText({
  value,
  defaultValue,
  onChange,
  label,
  help,
  rows = 6,
  placeholder,
  attached = true,
  highlightColors = DEFAULT_HIGHLIGHTS,
  id,
  className,
}: {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Optional `.wb-label` above the bar. */
  label?: ReactNode;
  /** Optional `.wb-help` caption below the textarea. */
  help?: ReactNode;
  rows?: number;
  placeholder?: string;
  /** Fuse the bar to the textarea's top edge (`--attached`); off = a standalone bar. */
  attached?: boolean;
  /** Highlight hues shown in the colour dropdown. */
  highlightColors?: string[];
  id?: string;
  className?: string;
}) {
  const [internal, setInternal] = useState(defaultValue ?? "");
  const current = value ?? internal;
  const setValue = (next: string) => {
    if (value === undefined) setInternal(next);
    onChange?.(next);
  };

  const { ref, run } = useFormatbar(setValue);

  const [hlColor, setHlColor] = useState(highlightColors[0]);
  const [ddOpen, setDdOpen] = useState(false);
  const ddRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ddOpen) return;
    const onDown = (e: MouseEvent) => {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) setDdOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setDdOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [ddOpen]);

  // Keep the textarea's selection alive when a toolbar button is pressed.
  const keepSelection = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className={cn("wb-field", className)}>
      {label !== undefined && (
        <label className="wb-label" htmlFor={id}>
          {label}
        </label>
      )}
      <div
        className={cn("wb-toolbar", attached && "wb-toolbar--attached")}
        role="toolbar"
        aria-label="Định dạng văn bản"
        style={{ "--wb-hl-color": hlColor } as CSSProperties}
      >
        <div className="wb-toolbar__group">
          {TEXT_BUTTONS.map((b) => (
            <button
              key={b.cmd}
              type="button"
              className="wb-toolbar__btn wb-toolbar__btn--text"
              title={b.title}
              onMouseDown={keepSelection}
              onClick={() => run(b.cmd)}
            >
              {b.label}
            </button>
          ))}
        </div>
        <span className="wb-toolbar__sep" />
        <div className="wb-toolbar__group">
          {MARK_BUTTONS.map((b) => (
            <button
              key={b.cmd}
              type="button"
              className="wb-toolbar__btn"
              title={b.title}
              aria-label={b.title}
              onMouseDown={keepSelection}
              onClick={() => run(b.cmd)}
            >
              <span className="wb-ico">{b.icon}</span>
            </button>
          ))}
        </div>
        <span className="wb-toolbar__sep" />
        <div className="wb-toolbar__group">
          <button
            type="button"
            className="wb-toolbar__btn"
            title="Tô nền"
            aria-label="Tô nền"
            onMouseDown={keepSelection}
            onClick={() => run("highlight")}
          >
            <span className="wb-ico">ink_highlighter</span>
          </button>
          <div ref={ddRef} className={cn("wb-dropdown", ddOpen && "is-open")}>
            <button
              type="button"
              className="wb-toolbar__btn"
              title="Màu tô"
              aria-label="Chọn màu tô"
              aria-expanded={ddOpen}
              onMouseDown={keepSelection}
              onClick={() => setDdOpen((v) => !v)}
            >
              <span className="wb-toolbar__swatch" />
              <span className="wb-ico wb-ico--xs wb-dropdown__caret">expand_more</span>
            </button>
            <div className="wb-dropdown__menu">
              <div
                className="wb-swatches"
                style={{ padding: 8, maxWidth: 132 }}
                role="group"
                aria-label="Màu tô nền"
              >
                {highlightColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={cn("wb-swatch", c === hlColor && "is-selected")}
                    style={{ "--wb-swatch-color": c } as CSSProperties}
                    aria-label={c}
                    onMouseDown={keepSelection}
                    onClick={() => {
                      setHlColor(c);
                      setDdOpen(false);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <span className="wb-toolbar__sep" />
        <button
          type="button"
          className="wb-toolbar__btn"
          title="Xoá định dạng"
          aria-label="Xoá toàn bộ định dạng"
          onMouseDown={keepSelection}
          onClick={() => run("clear")}
        >
          <span className="wb-ico">format_clear</span>
        </button>
      </div>
      <div className="wb-textarea-wrap">
        <textarea
          ref={ref}
          id={id}
          className="wb-textarea"
          rows={rows}
          placeholder={placeholder}
          value={current}
          onChange={(e) => setValue(e.currentTarget.value)}
        />
      </div>
      {help !== undefined && <span className="wb-help">{help}</span>}
    </div>
  );
}
