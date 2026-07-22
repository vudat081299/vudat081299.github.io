import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

function range(start: number, end: number): number[] {
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}

/**
 * Build the visible item list — page numbers with `"ellipsis"` gaps — keeping
 * the first/last `boundaryCount` pages, `siblingCount` pages either side of the
 * current page, and collapsing the rest (the MUI pagination algorithm).
 */
function buildItems(
  page: number,
  pageCount: number,
  siblingCount: number,
  boundaryCount: number,
): (number | "ellipsis")[] {
  const startPages = range(1, Math.min(boundaryCount, pageCount));
  const endPages = range(Math.max(pageCount - boundaryCount + 1, boundaryCount + 1), pageCount);

  const siblingsStart = Math.max(
    Math.min(page - siblingCount, pageCount - boundaryCount - siblingCount * 2 - 1),
    boundaryCount + 2,
  );
  const siblingsEnd = Math.min(
    Math.max(page + siblingCount, boundaryCount + siblingCount * 2 + 2),
    endPages.length > 0 ? endPages[0] - 2 : pageCount - 1,
  );

  return [
    ...startPages,
    ...(siblingsStart > boundaryCount + 2
      ? (["ellipsis"] as const)
      : boundaryCount + 1 < pageCount - boundaryCount
        ? [boundaryCount + 1]
        : []),
    ...range(siblingsStart, siblingsEnd),
    ...(siblingsEnd < pageCount - boundaryCount - 1
      ? (["ellipsis"] as const)
      : pageCount - boundaryCount > boundaryCount
        ? [pageCount - boundaryCount]
        : []),
    ...endPages,
  ];
}

/**
 * Pagination — controlled page-number navigation with prev/next buttons and an
 * ellipsis for long ranges. Wraps the web-builder `wb-pagination` / `wb-page`.
 * Drive it with `page` (1-based), `pageCount` and `onChange`.
 */
export function Pagination({
  page,
  pageCount,
  onChange,
  siblingCount = 1,
  boundaryCount = 1,
  prevLabel = "Previous",
  nextLabel = "Next",
  prevIcon = "chevron_left",
  nextIcon = "chevron_right",
  className,
  ...rest
}: Omit<HTMLAttributes<HTMLElement>, "onChange"> & {
  /** Current page (1-based). */
  page: number;
  /** Total number of pages. */
  pageCount: number;
  /** Called with the requested 1-based page. */
  onChange: (page: number) => void;
  /** Pages shown either side of the current page. */
  siblingCount?: number;
  /** Pages always shown at each end. */
  boundaryCount?: number;
  /** Accessible label for the previous button. */
  prevLabel?: string;
  /** Accessible label for the next button. */
  nextLabel?: string;
  /** Icon name for the previous button. */
  prevIcon?: string;
  /** Icon name for the next button. */
  nextIcon?: string;
}) {
  const items = buildItems(page, pageCount, siblingCount, boundaryCount);

  return (
    <nav aria-label="Pagination" className={cn("wb-pagination", className)} {...rest}>
      <button
        type="button"
        className="wb-page"
        aria-label={prevLabel}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <span className="wb-ico wb-ico--sm">{prevIcon}</span>
      </button>
      {items.map((item, i) =>
        item === "ellipsis" ? (
          <span key={`gap-${i}`} className="wb-page wb-page--gap">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            className={cn("wb-page", item === page && "is-active")}
            aria-current={item === page ? "page" : undefined}
            onClick={() => onChange(item)}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        className="wb-page"
        aria-label={nextLabel}
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
      >
        <span className="wb-ico wb-ico--sm">{nextIcon}</span>
      </button>
    </nav>
  );
}
