import { type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const SIZE_CLASS = { sm: "wb-avatar--sm", md: "", lg: "wb-avatar--lg" } as const;
const DOT_PX = { sm: 9, md: 11, lg: 13 } as const;

// Presence dot colours ride existing status tokens — no new CSS, same idiom the
// avatar page uses when it sets `style="background:var(--wb-chart-…)"` inline.
const STATUS_COLOR: Record<"online" | "away" | "busy" | "offline", string> = {
  online: "var(--wb-success)",
  away: "var(--wb-warning)",
  busy: "var(--wb-danger)",
  offline: "var(--wb-gray-400)",
};

/**
 * Avatar — the web-builder `wb-avatar` chip from pages/avatar.html: an image
 * (`src`) or a short initials/number fallback (`children`), in three sizes,
 * circle or square, with an optional high-contrast `solid` treatment.
 *
 * `status` adds a presence dot. The CSS ships no avatar-status class, so it is
 * drawn as a token-coloured dot in a relative wrapper (avatars set
 * `overflow:hidden`, which would clip a child) — added ONLY when `status` is
 * set, so the common dot-less avatar stays the bare `<span>` that AvatarGroup's
 * `:first-child` / negative-margin rules expect.
 */
export function Avatar({
  src,
  alt = "",
  size = "md",
  shape = "circle",
  solid = false,
  status,
  className,
  children,
  style,
  ...rest
}: {
  /** Image URL; when set it renders `<img>` and `children` is ignored. */
  src?: string;
  alt?: string;
  size?: "sm" | "md" | "lg";
  shape?: "circle" | "square";
  /** Filled ink chip (`wb-avatar--solid`) — reuse for numbered / high-emphasis figures. */
  solid?: boolean;
  /** Presence dot; colour comes from status tokens (green/amber/red/grey). */
  status?: "online" | "away" | "busy" | "offline";
  /** Initials, a number, or an icon `<span>` — the fallback when there is no `src`. */
  children?: ReactNode;
} & HTMLAttributes<HTMLSpanElement>) {
  const avatar = (
    <span
      className={cn(
        "wb-avatar",
        SIZE_CLASS[size],
        shape === "square" && "wb-avatar--square",
        solid && "wb-avatar--solid",
        className,
      )}
      style={style}
      {...rest}
    >
      {src !== undefined ? <img src={src} alt={alt} /> : children}
    </span>
  );

  if (status === undefined) return avatar;

  const dot = DOT_PX[size];
  const dotStyle: CSSProperties = {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: dot,
    height: dot,
    borderRadius: "50%",
    background: STATUS_COLOR[status],
    border: "2px solid var(--wb-surface)",
    boxSizing: "content-box",
  };

  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      {avatar}
      <span style={dotStyle} aria-hidden="true" />
    </span>
  );
}

/**
 * AvatarGroup — `wb-avatar-group`: overlapping avatars with a ring gap (people
 * sharing a bill, members of a shared wallet). Children should be plain
 * `<Avatar>`s; a trailing `+N` Avatar reads as the overflow count.
 */
export function AvatarGroup({
  className,
  children,
  ...rest
}: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("wb-avatar-group", className)} {...rest}>
      {children}
    </div>
  );
}
