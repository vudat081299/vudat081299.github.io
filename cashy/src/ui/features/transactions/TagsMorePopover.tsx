import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TagRank } from "@/domain";
import { TagChip } from "@/ui/common/TagChip";

/**
 * The "+n" chip in a table's tags column, and the little grid it opens.
 *
 * A row only has room for the two most-used tags; the rest hide behind a "+n"
 * the user can click to see the whole set. The panel is **portalled to <body>
 * and fixed-positioned** on purpose: a normal in-flow popover would be clipped
 * by the table's own `overflow: auto`. It drops below the chip, flips above when
 * the row sits low in the viewport, and closes on outside-click / Esc / scroll
 * (scrolling would otherwise drift the fixed panel away from its anchor).
 *
 * `tags` is ONLY the tags that didn't fit in the row (the hidden overflow, still
 * ranked most-used first), so the panel reveals what the row couldn't show rather
 * than re-listing the chips already visible beside the "+n".
 */
export function TagsMorePopover({ tags, count }: { tags: TagRank[]; count: number }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Re-measure once the panel is in the DOM: place below the chip, or above when
  // there isn't room, and clamp inside the viewport so it never runs off-screen.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const t = triggerRef.current;
      const p = panelRef.current;
      if (!t || !p) return;
      const r = t.getBoundingClientRect();
      const pw = p.offsetWidth;
      const ph = p.offsetHeight;
      const gap = 6;
      const m = 8;
      let left = Math.min(r.left, window.innerWidth - m - pw);
      left = Math.max(m, left);
      let top = r.bottom + gap;
      if (top + ph > window.innerHeight - m) {
        const above = r.top - gap - ph;
        top = above >= m ? above : Math.max(m, window.innerHeight - m - ph);
      }
      setCoords({ left, top });
    };
    place();

    const onDown = (e: MouseEvent) => {
      const node = e.target as Node;
      if (triggerRef.current?.contains(node) || panelRef.current?.contains(node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    // capture: catch scrolls on any ancestor (the table body scroller included).
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="cashy-tagmore"
        aria-label={`Show ${count} more tags`}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        +{count}
      </button>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="cashy-tagpop"
            style={{ left: coords.left, top: coords.top }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cashy-tagpop__wrap">
              {tags.map((r) => (
                <TagChip key={r.tag.id} tag={r.tag} shade={r.shade} />
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
