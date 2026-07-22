import { Circle } from "lucide-react";
import { MAP } from "@/ui/kit/icon-map";

export function Icon({
  name,
  size = 16,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Cmp = MAP[name] ?? Circle;
  return <Cmp size={size} className={className} strokeWidth={2} aria-hidden />;
}
