import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * MediaObject — the classic `wb-media` layout (CSS §45): a fixed leading
 * `figure` (an Avatar, an icon `<span>`, an emoji, or a number chip) beside a
 * flexible `wb-media__body` of title + text. Used for ranked rows, feature
 * rows, and settings items; drop it inside a `<Card><CardBody>` for a media
 * card, or a list row. `figure` is left as ReactNode because the CSS carries no
 * figure class — the leading element keeps its own natural size — so the caller
 * reuses `wb-avatar` (e.g. `wb-avatar--solid` for a numbered chip) directly.
 */
export function MediaObject({
  figure,
  title,
  text,
  center = false,
  className,
  children,
  ...rest
}: {
  /** Leading element: an Avatar, `<span className="wb-ico">…</span>`, emoji, or number chip. */
  figure: ReactNode;
  title?: ReactNode;
  text?: ReactNode;
  /** Vertically centre the figure against the body (`wb-media--center`). */
  center?: boolean;
  /** Extra body content appended under title/text (e.g. a progress bar, actions). */
  children?: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("wb-media", center && "wb-media--center", className)} {...rest}>
      {figure}
      <div className="wb-media__body">
        {title !== undefined && <p className="wb-media__title">{title}</p>}
        {text !== undefined && <p className="wb-media__text">{text}</p>}
        {children}
      </div>
    </div>
  );
}
