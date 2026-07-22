import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One accordion row: a `title` in the summary and `content` in the body. */
export type AccordionItem = {
  title: ReactNode;
  content: ReactNode;
  /** Start expanded. */
  defaultOpen?: boolean;
};

/**
 * Accordion — the `.wb-accordion` group from the web-builder ACCORDION section
 * (§18), built on native `<details>`/`<summary>` exactly as the source is, so the
 * disclosure toggle and keyboard support come for free with no toggle library.
 *
 * `type="single"` makes it exclusive (opening one closes the rest); the default
 * `"multiple"` lets any number stay open. Open state is mirrored into React via
 * the native `toggle` event so it stays correct across re-renders — the browser
 * still drives the actual open/close, we only track it (and, for single mode,
 * close the siblings).
 */
export function Accordion({
  items,
  type = "multiple",
  className,
  ...rest
}: {
  items: AccordionItem[];
  /** `single` = one open at a time; `multiple` (default) = independent rows. */
  type?: "single" | "multiple";
  className?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children">) {
  const [open, setOpen] = useState<boolean[]>(() => items.map((it) => !!it.defaultOpen));

  const handleToggle = (idx: number, isOpen: boolean) => {
    setOpen((prev) => {
      // Single mode: every other row is forced closed, so the state is just
      // "index idx matches its new value, all others false".
      if (type === "single") return prev.map((_, i) => (i === idx ? isOpen : false));
      const next = [...prev];
      next[idx] = isOpen;
      return next;
    });
  };

  return (
    <div className={cn("wb-accordion", className)} {...rest}>
      {items.map((it, i) => (
        <details
          key={i}
          className="wb-accordion__item"
          open={open[i]}
          onToggle={(e) => handleToggle(i, e.currentTarget.open)}
        >
          <summary>{it.title}</summary>
          <div className="wb-accordion__body">{it.content}</div>
        </details>
      ))}
    </div>
  );
}
