import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Kbd — the web-builder `.wb-kbd` keycap: a small monospace key chip with a
 * slightly heavier bottom edge (the "3-D key" cue). Rendered as a semantic
 * <kbd>. Use inline in menus, tooltips or a pager to show a shortcut hint; pass
 * the key(s) as children (e.g. `<Kbd>⌘K</Kbd>`, `<Kbd>Esc</Kbd>`).
 */
export function Kbd({
  children,
  className,
  ...rest
}: { children: ReactNode } & HTMLAttributes<HTMLElement>) {
  return (
    <kbd {...rest} className={cn("wb-kbd", className)}>
      {children}
    </kbd>
  );
}
