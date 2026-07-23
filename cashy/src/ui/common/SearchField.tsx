import { cn } from "@/lib/utils";

/**
 * The seamless search pill shared by every filter bar (transactions, loans,
 * subscriptions): a magnifier addon, a borderless input, and a clear × that
 * appears only once there is text — all sharing one rounded field with no
 * dividers. One home for the markup that used to be copy-pasted per bar.
 *
 * `className` carries the bar-specific width rule (`wb-filterbar__search` /
 * `cashy-subfilter__search`); everything else is identical everywhere.
 */
export function SearchField({
  value,
  onChange,
  placeholder,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  /** input `aria-label` when the placeholder alone isn't descriptive enough */
  ariaLabel?: string;
}) {
  return (
    <div className={cn("wb-input-group wb-input-group--seamless cashy-search", className)}>
      <span className="wb-input-group__addon">
        <span className="wb-ico wb-ico--sm">search</span>
      </span>
      <input
        className="wb-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      {value && (
        <button
          type="button"
          className="wb-input-group__btn"
          aria-label="Clear search"
          onClick={() => onChange("")}
        >
          <span className="wb-ico wb-ico--sm">close</span>
        </button>
      )}
    </div>
  );
}
