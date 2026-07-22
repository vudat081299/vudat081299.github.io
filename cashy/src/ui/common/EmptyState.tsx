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
    <div className={cn("wb-empty", className)}>
      {icon && <div className="wb-empty__icon">{icon}</div>}
      <p className="wb-empty__title">{title}</p>
      {description && <p className="wb-empty__msg">{description}</p>}
      {action}
    </div>
  );
}
