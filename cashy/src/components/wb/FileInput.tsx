import {
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/**
 * FileInput — the web-builder `.wb-file`: a styled native `<input type="file">`
 * (the "Choose file" button + filename). `solid` gives the high-emphasis black
 * button (`--solid`). Native `accept`/`multiple` and the rest of
 * InputHTMLAttributes pass through; `onFiles` is a convenience callback that
 * hands you the picked files as an array (the native `onChange` still fires too).
 */
export function FileInput({
  solid,
  onFiles,
  className,
  onChange,
  ...rest
}: {
  /** High-emphasis black button (wb-file--solid). */
  solid?: boolean;
  /** Convenience callback with the selected files as an array. */
  onFiles?: (files: File[]) => void;
} & InputHTMLAttributes<HTMLInputElement>) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onFiles?.(Array.from(e.target.files ?? []));
    onChange?.(e);
  };
  return (
    <input
      {...rest}
      type="file"
      onChange={handleChange}
      className={cn("wb-file", solid && "wb-file--solid", className)}
    />
  );
}

/**
 * Dropzone — the web-builder `.wb-dropzone`: a dashed drop target that's a
 * `<label>` wrapping a hidden file input, so a click opens the picker and a drop
 * catches files. Drag-and-drop is wired here (the `.is-dragover` state is toggled
 * on the CSS's own hook) and reported through `onFiles`. Pass `icon`/`title`/`hint`
 * for the default stacked content, or `children` to render your own. Native
 * `accept`/`multiple`/`disabled` pass through to the hidden input.
 */
export function Dropzone({
  icon = "cloud_upload",
  title,
  hint,
  onFiles,
  className,
  style,
  children,
  onChange,
  ...rest
}: {
  /** Material Symbols ligature for the header icon. */
  icon?: string;
  title?: ReactNode;
  hint?: ReactNode;
  onFiles?: (files: File[]) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "title">) {
  const [dragover, setDragover] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onFiles?.(Array.from(e.target.files ?? []));
    onChange?.(e);
  };

  return (
    // className/style target the visible label; accept/multiple/etc. go to the input.
    <label
      style={style}
      className={cn("wb-dropzone", dragover && "is-dragover", className)}
      onDragOver={(e) => {
        e.preventDefault();
        setDragover(true);
      }}
      onDragLeave={() => setDragover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragover(false);
        onFiles?.(Array.from(e.dataTransfer.files));
      }}
    >
      <span className="wb-ico wb-dropzone__icon">{icon}</span>
      {children ?? (
        <>
          {title != null && <div>{title}</div>}
          {hint != null && (
            <div className="wb-cell-muted" style={{ fontSize: 12 }}>
              {hint}
            </div>
          )}
        </>
      )}
      <input {...rest} type="file" hidden onChange={handleChange} />
    </label>
  );
}
