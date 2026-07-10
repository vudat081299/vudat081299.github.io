import { cn } from "@/lib/utils";
import { Icon } from "@/lib/icons";
import type { Category } from "@/types";

export function CategoryChip({
  category,
  className,
  showIcon = true,
}: {
  category?: Category | null;
  className?: string;
  showIcon?: boolean;
}) {
  if (!category) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-muted-foreground",
          className,
        )}
      >
        <span className="size-2 rounded-[3px] bg-muted-foreground/40" />
        Chưa phân loại
      </span>
    );
  }
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      {showIcon && (
        <span
          className="grid size-[18px] shrink-0 place-items-center rounded-[4px]"
          style={{ background: category.colorHex + "22", color: category.colorHex }}
        >
          <Icon name={category.icon} size={11} />
        </span>
      )}
      <span className="truncate">{category.name}</span>
    </span>
  );
}
