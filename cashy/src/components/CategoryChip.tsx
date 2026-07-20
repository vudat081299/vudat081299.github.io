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
      <span className={cn("wb-cap wb-cap--outline", className)}>
        <span className="wb-cap__dot" />
        Chưa phân loại
      </span>
    );
  }
  return (
    <span
      className={cn("wb-cap wb-cap--tinted", className)}
      style={{ "--wb-cap-color": category.colorHex } as React.CSSProperties}
    >
      {showIcon && <Icon name={category.icon} size={13} />}
      {category.name}
    </span>
  );
}
