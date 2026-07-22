import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Pager — a prev / next footer navigation: two cards showing a direction label
 * plus the target page's title (and optional meta). Wraps the web-builder
 * `wb-pager`. Each side renders as an `<a>` when its `*Href` is set, otherwise a
 * `<button>` driven by `onPrev` / `onNext`; omit a side entirely to leave that
 * column empty. Disabling a side turns it into a disabled button.
 */
export function Pager({
  prevLabel,
  nextLabel,
  prevDir = "Trang trước",
  nextDir = "Trang sau",
  prevMeta,
  nextMeta,
  prevHref,
  nextHref,
  onPrev,
  onNext,
  prevDisabled = false,
  nextDisabled = false,
  prevIcon = "chevron_left",
  nextIcon = "chevron_right",
  className,
  ...rest
}: HTMLAttributes<HTMLElement> & {
  /** Title of the previous target. */
  prevLabel?: ReactNode;
  /** Title of the next target. */
  nextLabel?: ReactNode;
  /** Small uppercase direction text for the previous side. */
  prevDir?: ReactNode;
  /** Small uppercase direction text for the next side. */
  nextDir?: ReactNode;
  /** Meta / group line under the previous title. */
  prevMeta?: ReactNode;
  /** Meta / group line under the next title. */
  nextMeta?: ReactNode;
  /** Turn the previous side into a link. */
  prevHref?: string;
  /** Turn the next side into a link. */
  nextHref?: string;
  /** Handler for the previous side. */
  onPrev?: () => void;
  /** Handler for the next side. */
  onNext?: () => void;
  /** Disable the previous side. */
  prevDisabled?: boolean;
  /** Disable the next side. */
  nextDisabled?: boolean;
  /** Icon name for the previous arrow. */
  prevIcon?: string;
  /** Icon name for the next arrow. */
  nextIcon?: string;
}) {
  const hasPrev = prevLabel !== undefined || prevHref !== undefined || onPrev !== undefined;
  const hasNext = nextLabel !== undefined || nextHref !== undefined || onNext !== undefined;

  const arrow = (icon: string) => <span className="wb-ico wb-pager__arrow">{icon}</span>;
  const body = (dir: ReactNode, label: ReactNode, meta: ReactNode) => (
    <span className="wb-pager__text">
      <span className="wb-pager__dir">{dir}</span>
      {label !== undefined && <span className="wb-pager__title">{label}</span>}
      {meta !== undefined && <span className="wb-pager__meta">{meta}</span>}
    </span>
  );

  return (
    <nav aria-label="Chuyển trang" className={cn("wb-pager", className)} {...rest}>
      {hasPrev &&
        (prevHref !== undefined && !prevDisabled ? (
          <a
            className="wb-pager__link wb-pager__link--prev"
            href={prevHref}
            onClick={onPrev}
          >
            {arrow(prevIcon)}
            {body(prevDir, prevLabel, prevMeta)}
          </a>
        ) : (
          <button
            type="button"
            className="wb-pager__link wb-pager__link--prev"
            onClick={onPrev}
            disabled={prevDisabled}
          >
            {arrow(prevIcon)}
            {body(prevDir, prevLabel, prevMeta)}
          </button>
        ))}
      {hasNext &&
        (nextHref !== undefined && !nextDisabled ? (
          <a
            className="wb-pager__link wb-pager__link--next"
            href={nextHref}
            onClick={onNext}
          >
            {body(nextDir, nextLabel, nextMeta)}
            {arrow(nextIcon)}
          </a>
        ) : (
          <button
            type="button"
            className="wb-pager__link wb-pager__link--next"
            onClick={onNext}
            disabled={nextDisabled}
          >
            {body(nextDir, nextLabel, nextMeta)}
            {arrow(nextIcon)}
          </button>
        ))}
    </nav>
  );
}
