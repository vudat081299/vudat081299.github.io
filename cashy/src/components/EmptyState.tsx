import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-14 text-center",
        className,
      )}
    >
      {icon && (
        <div className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && (
        <p className="max-w-xs text-[13px] text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
