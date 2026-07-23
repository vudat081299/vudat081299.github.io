import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Popover } from "@/ui/kit/Popover";

/**
 * One filter facet, rendered as a self-contained dropdown CHIP: click the body to
 * open its own little panel, and — once something is chosen — the chip shows the
 * selection and grows an × that clears just this facet. So the chip IS the applied
 * token; there is no separate token row echoing it.
 *
 * Unselected it wears a dashed outline; active it goes solid (see `.cashy-facet`),
 * so an applied filter reads at a glance. `accent` calls a facet out with a black
 * edge (the transaction bar uses it for the type scope); everything else stays
 * neutral grey.
 *
 * Shared across the transaction and loan filter bars so every filtered screen
 * speaks the same chip language.
 */
export function FacetChip({
  label,
  value,
  active,
  accent = false,
  panelWidth = 240,
  onClear,
  children,
}: {
  label: string;
  /** the summary shown after the label when active (e.g. "Recorded +1") */
  value?: string;
  active: boolean;
  accent?: boolean;
  panelWidth?: number;
  onClear: () => void;
  children: ReactNode | ((props: { close: () => void }) => ReactNode);
}) {
  return (
    <Popover
      inline
      panelWidth={panelWidth}
      trigger={({ open, toggle }) => (
        <span
          className={cn(
            "cashy-facet",
            active && "cashy-facet--active",
            active && accent && "cashy-facet--accent",
            open && "cashy-facet--open",
          )}
        >
          <button
            type="button"
            className="cashy-facet__main"
            onClick={toggle}
            aria-expanded={open}
          >
            <span className="cashy-facet__label">{label}</span>
            {active && value ? <span className="cashy-facet__val">{value}</span> : null}
            {!active && <span className="wb-ico wb-ico--xs cashy-facet__caret">expand_more</span>}
          </button>
          {active && (
            // Reuse the kit's filter-token × (18×18, glyph via ::before, proper
            // hover background) rather than a hand-rolled one — one × across the app.
            <button
              type="button"
              className="wb-filter-token__x cashy-facet__x"
              aria-label={`Clear ${label.toLowerCase()} filter`}
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
            />
          )}
        </span>
      )}
    >
      {children}
    </Popover>
  );
}
