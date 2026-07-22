import { type OlHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** State of a single step in a {@link Steps} sequence. */
export type StepStatus = "done" | "current" | "todo";

/** One step in a {@link Steps} sequence. */
export type Step = {
  /** Step title. */
  label: ReactNode;
  /** Optional secondary line under the title. */
  description?: ReactNode;
  /** Progress state — drives the marker look. Omitted reads as "done" (filled). */
  status?: StepStatus;
  /** Render a tentative/optional step: dashed marker + dashed connector rail. */
  dashed?: boolean;
  /** A dashed annotation pill hung under the step (e.g. a loop-back note). */
  note?: ReactNode;
  /** Marker icon name — defaults to `check` for a done step; overrides the number. */
  icon?: string;
};

/**
 * Steps / Stepper — a numbered (or dotted) sequence for wizards, onboarding and
 * timelines. Wraps the web-builder `wb-steps`. Vertical by default; pass
 * `orientation="horizontal"` for a wizard row, or `dot` for a slim timeline.
 * Each step's `status` drives the marker: `done` → filled check, `current` →
 * filled + ring, `todo` → muted outline.
 */
export function Steps({
  steps,
  orientation = "vertical",
  dot = false,
  className,
  ...rest
}: Omit<OlHTMLAttributes<HTMLOListElement>, "children"> & {
  steps: Step[];
  /** Layout direction. */
  orientation?: "vertical" | "horizontal";
  /** Slim dot markers instead of numbers (a plain timeline). */
  dot?: boolean;
}) {
  return (
    <ol
      className={cn(
        "wb-steps",
        orientation === "horizontal" && "wb-steps--horizontal",
        dot && "wb-steps--dot",
        className,
      )}
      {...rest}
    >
      {steps.map((step, i) => {
        const state =
          step.status === "done"
            ? "is-done"
            : step.status === "current"
              ? "is-active"
              : step.status === "todo"
                ? "is-todo"
                : undefined;

        let marker: ReactNode = i + 1;
        if (dot) {
          marker = null;
        } else if (step.status === "done") {
          marker = <span className="wb-ico">{step.icon ?? "check"}</span>;
        } else if (step.icon !== undefined) {
          marker = <span className="wb-ico">{step.icon}</span>;
        }

        return (
          <li
            key={i}
            className={cn("wb-steps__item", state, step.dashed && "wb-steps__item--dashed")}
          >
            <span className="wb-steps__marker">{marker}</span>
            <div className="wb-steps__content">
              <p className="wb-steps__title">{step.label}</p>
              {step.description !== undefined && (
                <p className="wb-steps__desc">{step.description}</p>
              )}
              {step.note !== undefined && <span className="wb-steps__note">{step.note}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
