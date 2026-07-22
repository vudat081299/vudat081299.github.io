import {
  createContext,
  useContext,
  useState,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Label + optional description beside a choice control. Kept in one column so the
 * native input (centred by `.wb-check`/`.wb-radio`) lines up against the block.
 */
function ChoiceBody({
  label,
  description,
  children,
}: {
  label?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  const main = label ?? children;
  if (main == null && description == null) return null;
  return (
    <span>
      {main}
      {description != null && (
        <span className="wb-cell-muted" style={{ display: "block", fontSize: 12.5 }}>
          {description}
        </span>
      )}
    </span>
  );
}

/**
 * Checkbox — the web-builder `.wb-check`: a native checkbox drawn via
 * `appearance:none` (stays focusable + form-correct), wrapped in its label.
 * All InputHTMLAttributes pass through, controlled (`checked`+`onChange`) or
 * uncontrolled (`defaultChecked`); `label`/children is the text, `description`
 * an optional muted sub-line, and native `disabled` dims it inert.
 */
export function Checkbox({
  label,
  description,
  className,
  children,
  ...rest
}: {
  label?: ReactNode;
  description?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn("wb-check", className)}>
      <input {...rest} type="checkbox" />
      <ChoiceBody label={label} description={description}>
        {children}
      </ChoiceBody>
    </label>
  );
}

type RadioGroupCtx = {
  name: string;
  value?: string;
  onSelect: (value: string) => void;
};

// Internal only — lets a RadioGroup drive its Radio children without prop-drilling.
// Radios still work standalone when the context is absent.
const RadioGroupContext = createContext<RadioGroupCtx | null>(null);

/**
 * Radio — the web-builder `.wb-radio`: a native radio drawn via `appearance:none`.
 * `variant` picks the selected look (`ring` = classic hollow, `solid` = full ink;
 * omit for the default filled-with-dot). Inside a RadioGroup it inherits the
 * group's name/value/onChange automatically; standalone it takes native `name`,
 * `checked`/`defaultChecked` and `onChange` like any radio.
 */
export function Radio({
  label,
  description,
  variant,
  className,
  children,
  ...rest
}: {
  label?: ReactNode;
  description?: ReactNode;
  /** Selected-state look: classic hollow ring, or fully filled. */
  variant?: "ring" | "solid";
} & InputHTMLAttributes<HTMLInputElement>) {
  const group = useContext(RadioGroupContext);
  // In a group with a value, the group owns name/checked/onChange (overriding rest).
  const groupProps =
    group && rest.value !== undefined
      ? {
          name: group.name,
          checked: group.value === String(rest.value),
          onChange: () => group.onSelect(String(rest.value)),
        }
      : {};

  return (
    <label className={cn("wb-radio", variant && `wb-radio--${variant}`, className)}>
      <input {...rest} {...groupProps} type="radio" />
      <ChoiceBody label={label} description={description}>
        {children}
      </ChoiceBody>
    </label>
  );
}

/**
 * RadioGroup — coordinates a set of Radio children under one `name`. Controlled
 * via `value`+`onChange` or uncontrolled via `defaultValue` (it tracks its own
 * state when `value` is omitted). `orientation` lays the options out in a column
 * (`wb-stack`, default) or a row (`wb-cluster`). Children must each set a `value`.
 */
export function RadioGroup({
  name,
  value,
  defaultValue,
  onChange,
  orientation = "vertical",
  className,
  children,
  ...rest
}: {
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  orientation?: "vertical" | "horizontal";
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "onChange">) {
  const [internal, setInternal] = useState(defaultValue);
  const current = value !== undefined ? value : internal;

  const onSelect = (next: string) => {
    if (value === undefined) setInternal(next); // uncontrolled: track internally
    onChange?.(next);
  };

  return (
    <RadioGroupContext.Provider value={{ name, value: current, onSelect }}>
      <div
        role="radiogroup"
        className={cn(orientation === "horizontal" ? "wb-cluster" : "wb-stack", className)}
        {...rest}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}
