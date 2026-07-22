import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { parseDMY } from "@/domain/date";
import { cn } from "@/lib/utils";
import type { Range } from "@/domain/period";

// Six numeric segments in order: dd mm yyyy — dd mm yyyy.
const MAXLEN = [2, 2, 4, 2, 2, 4];
const PLACEHOLDER = ["dd", "mm", "yyyy", "dd", "mm", "yyyy"];
const ARIA = ["From day", "From month", "From year", "To day", "To month", "To year"];

function segsFromRange(r: Range | null): string[] {
  if (!r) return ["", "", "", "", "", ""];
  const [ys, ms, ds] = r.start.split("-");
  const [ye, me, de] = r.end.split("-");
  return [ds, ms, ys, de, me, ye];
}

/** All six filled AND both halves parse to real dates → an ordered range. */
function rangeFromSegs(s: string[]): Range | null {
  if (s.some((x) => !x)) return null;
  const a = parseDMY(`${s[0]}/${s[1]}/${s[2]}`);
  const b = parseDMY(`${s[3]}/${s[4]}/${s[5]}`);
  if (!a || !b) return null;
  return a <= b ? { start: a, end: b } : { start: b, end: a };
}

/**
 * The docs' `wb-input-tpl` in its date-range shape: six numeric segments with
 * inked "/" separators and a "–" between the two dates (dd/mm/yyyy – dd/mm/yyyy),
 * so the slashes are part of the field, not text the user types. A tiny driver
 * auto-advances segment→segment as each fills and steps back on Backspace, the
 * way a native date field does — the "smart" bit the plain text box lacked.
 *
 * It applies LIVE: the moment all six segments form a valid range it fires
 * `onChange`, which the picker treats as a preview that keeps the panel open so
 * the chart updates as you type; Enter commits via `onCommit` (closes the panel).
 */
export function DateRangeInput({
  value,
  onChange,
  onCommit,
}: {
  value: Range | null;
  /** a complete, valid range was typed — apply it but keep the panel open */
  onChange: (r: Range) => void;
  /** Enter pressed on a complete range — apply and dismiss */
  onCommit?: (r: Range) => void;
}) {
  const [segs, setSegs] = useState<string[]>(() => segsFromRange(value));
  const [invalid, setInvalid] = useState(false);
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  // Set by the blank-space click just before it focuses a segment, and read by
  // that segment's onFocus to collapse the caret to the end instead of selecting.
  // A ref (not state) because it must be readable inside the very same tick.
  const resumeRef = useRef(false);

  // Re-seed only when an EXTERNAL value (a calendar click, a preset) says
  // something different from what the segments already spell — so applying our
  // own live edits never yanks the caret back mid-type.
  const valKey = value ? `${value.start}|${value.end}` : "";
  useEffect(() => {
    setSegs((cur) => {
      const parsed = rangeFromSegs(cur);
      const curKey = parsed ? `${parsed.start}|${parsed.end}` : "";
      if (valKey === curKey) return cur;
      const [start, end] = valKey.split("|");
      return segsFromRange(valKey ? { start, end } : null);
    });
    setInvalid(false);
  }, [valKey]);

  const write = (i: number, raw: string) => {
    const v = raw.replace(/\D/g, "").slice(0, MAXLEN[i]);
    const next = segs.slice();
    next[i] = v;
    setSegs(next);
    const r = rangeFromSegs(next);
    setInvalid(next.every(Boolean) && !r);
    if (r) onChange(r);
    // Auto-advance once a segment is full (day/month at 2, year at 4).
    if (v.length === MAXLEN[i] && i < 5) refs.current[i + 1]?.focus();
  };

  // Clicking the field's own empty space — its padding or an inked "/" separator,
  // anywhere that is NOT a segment — should still land the caret somewhere useful:
  //
  //   __/__/____  → the FIRST segment, ready to start typing
  //   21/02/____  → the END of "02", the last segment that holds a value
  //
  // so a stray click either starts entry or resumes it exactly where it left off,
  // instead of doing nothing. Clicking a segment itself is left alone — the
  // browser puts the caret where the user aimed.
  const focusFromBlankSpace = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("input")) return; // a real segment was hit
    e.preventDefault(); // keep focus off the wrapper; drive it to a segment instead
    const lastFilled = segs.reduce((last, v, i) => (v ? i : last), -1);
    const target = lastFilled === -1 ? 0 : lastFilled;
    const el = refs.current[target];
    if (!el) return;
    // Resuming means "carry on from the end of what I typed", so the caret is
    // collapsed AFTER the digits rather than selecting them — a select-all would
    // make the next keystroke wipe the segment instead of continuing it. The
    // empty-field case has nothing to place a caret past, so it just focuses.
    resumeRef.current = lastFilled !== -1;
    el.focus();
  };

  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !segs[i] && i > 0) {
      e.preventDefault();
      refs.current[i - 1]?.focus();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = rangeFromSegs(segs);
      if (r) onCommit?.(r);
    }
  };

  return (
    <div
      className={cn("wb-input-tpl", invalid && "is-invalid")}
      role="group"
      aria-label="Date range"
      onMouseDown={focusFromBlankSpace}
    >
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Fragment key={i}>
          <input
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={cn("wb-input-tpl__seg", (i === 2 || i === 5) && "wb-input-tpl__seg--y")}
            inputMode="numeric"
            maxLength={MAXLEN[i]}
            placeholder={PLACEHOLDER[i]}
            aria-label={ARIA[i]}
            value={segs[i]}
            onChange={(e) => write(i, e.target.value)}
            onKeyDown={(e) => onKey(i, e)}
            onFocus={(e) => {
              // Tabbing or clicking a segment selects it, so typing replaces the
              // value — the usual date-field behaviour. Resuming from a
              // blank-space click instead parks the caret after the last digit.
              if (resumeRef.current) {
                resumeRef.current = false;
                const end = e.currentTarget.value.length;
                e.currentTarget.setSelectionRange(end, end);
              } else {
                e.currentTarget.select();
              }
            }}
          />
          {i === 2 ? (
            <span className="wb-input-tpl__sep wb-input-tpl__sep--gap">–</span>
          ) : i < 5 ? (
            <span className="wb-input-tpl__sep">/</span>
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}
