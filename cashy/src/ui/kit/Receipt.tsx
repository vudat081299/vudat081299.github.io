import { type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Coerce a length knob to CSS — a bare number means px; a string (e.g. "57%") passes through. */
const len = (v: number | string) => (typeof v === "number" ? `${v}px` : v);

/**
 * Receipt — the web-builder `wb-receipt` slip (CSS §36): a torn-paper ticket for
 * one transaction, bill, transfer, or voucher. The markup is a fixed two-element
 * shell — an outer `.wb-receipt` that casts the scallop-hugging drop-shadow and
 * carries the geometry knobs, wrapping the `.wb-receipt__paper` that holds the
 * surface, the mask-cut notches, and the content — so this one component renders
 * both and drops `children` into the paper. Compose the inside from the
 * ReceiptHead / ReceiptBody / ReceiptLine / ReceiptRule / ReceiptTotal / …
 * subparts, mirroring the free ordering the page shows (some slips are body-only,
 * some lead with a status capsule, some add a barcode). Native div props land on
 * the outer element — the "receipt" the caller thinks of, where the knobs live.
 */
export function Receipt({
  edge = "scallop",
  bottom = false,
  flat = false,
  ticket = false,
  notch,
  gap,
  sideNotch,
  tear,
  width,
  center = false,
  className,
  style,
  children,
  ...rest
}: {
  /** Torn-edge style: `scallop` (default) · `wave` (bigger, sparser) · `dashed` (flat coupon perforation). */
  edge?: "scallop" | "wave" | "dashed";
  /** Notch only the bottom edge — flat top, good under a logo (`--bottom`). */
  bottom?: boolean;
  /** Drop the shadow (`--flat`). */
  flat?: boolean;
  /** Tear-off ticket: a dashed cross-rule with a half-circle cut into each side edge (`--ticket`). */
  ticket?: boolean;
  /** Notch diameter (→ `--wb-receipt-d`, default 12px); a number means px. */
  notch?: number | string;
  /** Flat gap between notches (→ `--wb-receipt-gap`, default 6px); a number means px. */
  gap?: number | string;
  /** `ticket` side-notch diameter (→ `--wb-receipt-side-d`, default 20px); a number means px. */
  sideNotch?: number | string;
  /** `ticket` tear position down the paper (→ `--wb-receipt-tear`, default 50%); a number means px, or pass a % string. */
  tear?: number | string;
  /** Paper width (default 300px); a number means px. */
  width?: number | string;
  /** Centre the paper's text (vouchers / transfer slips). */
  center?: boolean;
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  const knobs: Record<string, string> = {};
  if (notch != null) knobs["--wb-receipt-d"] = len(notch);
  if (gap != null) knobs["--wb-receipt-gap"] = len(gap);
  if (sideNotch != null) knobs["--wb-receipt-side-d"] = len(sideNotch);
  if (tear != null) knobs["--wb-receipt-tear"] = len(tear);
  const hasWrapStyle = style != null || Object.keys(knobs).length > 0;

  const paperStyle: CSSProperties = {};
  if (width != null) paperStyle.width = len(width);
  if (center) paperStyle.textAlign = "center";
  const hasPaperStyle = Object.keys(paperStyle).length > 0;

  return (
    <div
      className={cn(
        "wb-receipt",
        edge === "wave" && "wb-receipt--wave",
        edge === "dashed" && "wb-receipt--dashed",
        bottom && "wb-receipt--bottom",
        flat && "wb-receipt--flat",
        ticket && "wb-receipt--ticket",
        className,
      )}
      style={hasWrapStyle ? ({ ...style, ...knobs } as CSSProperties) : undefined}
      {...rest}
    >
      <div className="wb-receipt__paper" style={hasPaperStyle ? paperStyle : undefined}>
        {children}
      </div>
    </div>
  );
}

/**
 * ReceiptHead — `.wb-receipt__head`: the centred masthead. `status` (a capsule)
 * sits above the merchant, then `merchant` (`__merchant`) and `meta` (`__meta`);
 * `children` covers anything bespoke (e.g. a big amount rendered as the title).
 * Order matches the page: status, merchant, meta, extras.
 */
export function ReceiptHead({
  status,
  merchant,
  meta,
  className,
  children,
  ...rest
}: {
  /** A leading status capsule (`wb-cap`), shown above the merchant. */
  status?: ReactNode;
  merchant?: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("wb-receipt__head", className)} {...rest}>
      {status}
      {merchant !== undefined && <div className="wb-receipt__merchant">{merchant}</div>}
      {meta !== undefined && <div className="wb-receipt__meta">{meta}</div>}
      {children}
    </div>
  );
}

/** ReceiptMerchant — the standalone `.wb-receipt__merchant` title, for custom heads. */
export function ReceiptMerchant({
  className,
  children,
  ...rest
}: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("wb-receipt__merchant", className)} {...rest}>
      {children}
    </div>
  );
}

/** ReceiptMeta — the standalone `.wb-receipt__meta` caption (date / id), for custom heads. */
export function ReceiptMeta({
  className,
  children,
  ...rest
}: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("wb-receipt__meta", className)} {...rest}>
      {children}
    </div>
  );
}

/** ReceiptBody — `.wb-receipt__body`: the line-item column (a slip can hold several, split by rules). */
export function ReceiptBody({
  className,
  children,
  ...rest
}: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("wb-receipt__body", className)} {...rest}>
      {children}
    </div>
  );
}

/**
 * ReceiptLine — one `.wb-receipt__line`: a label on the left and a tabular-nums
 * amount on the right. `muted` (`--muted`) greys the whole row for secondary
 * lines like VAT / discount / subtotal.
 */
export function ReceiptLine({
  label,
  value,
  muted = false,
  className,
  ...rest
}: {
  label: ReactNode;
  value: ReactNode;
  /** Grey, smaller row for secondary lines (VAT, discount, subtotal). */
  muted?: boolean;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("wb-receipt__line", muted && "wb-receipt__line--muted", className)}
      {...rest}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/** ReceiptRule — `.wb-receipt__rule`: the dashed perforation divider between sections. */
export function ReceiptRule({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("wb-receipt__rule", className)} {...rest} />;
}

/** ReceiptTotal — `.wb-receipt__total`: the emphasised bottom line (label · big total). */
export function ReceiptTotal({
  label,
  value,
  className,
  ...rest
}: {
  label: ReactNode;
  value: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("wb-receipt__total", className)} {...rest}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/** ReceiptNote — `.wb-receipt__note`: a centred muted footer (thank-you / terms). */
export function ReceiptNote({
  className,
  children,
  ...rest
}: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("wb-receipt__note", className)} {...rest}>
      {children}
    </div>
  );
}

/** ReceiptBarcode — `.wb-receipt__barcode`: the decorative pure-CSS barcode strip (empty by design). */
export function ReceiptBarcode({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("wb-receipt__barcode", className)} aria-hidden="true" {...rest} />;
}

/** ReceiptCode — `.wb-receipt__code`: the spaced monospace code line under a barcode / voucher. */
export function ReceiptCode({
  className,
  children,
  ...rest
}: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("wb-receipt__code", className)} {...rest}>
      {children}
    </div>
  );
}
