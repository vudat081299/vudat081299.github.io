import type { Category, TxType } from "@/domain/types";
import { uid } from "@/lib/id";

/**
 * The category tree a brand-new workspace starts with. One bright hue per ROOT
 * (from the web-builder chart palette); children inherit their parent's hue so
 * the by-root donut & ranked bars stay coherent.
 */
export function seedCategories(): Category[] {
  const out: Category[] = [];
  const add = (
    name: string,
    type: TxType,
    colorHex: string,
    icon: string,
    parentId: string | null = null,
  ): string => {
    const sibs = out.filter((c) => (c.parentId ?? null) === parentId);
    const cat: Category = {
      id: uid(),
      parentId,
      order: sibs.length,
      name,
      colorHex,
      icon,
      type,
      isSystem: false,
    };
    out.push(cat);
    return cat.id;
  };

  const food = add("Ăn uống", "expense", "#f59e0b", "utensils");
  add("Đi chợ", "expense", "#f59e0b", "shopping-cart", food);
  add("Nhà hàng", "expense", "#f59e0b", "utensils-crossed", food);
  add("Cà phê", "expense", "#f59e0b", "coffee", food);
  add("Di chuyển", "expense", "#3b82f6", "car");
  const bills = add("Hóa đơn", "expense", "#06b6d4", "receipt");
  add("Điện", "expense", "#06b6d4", "zap", bills);
  add("Nước", "expense", "#06b6d4", "droplet", bills);
  add("Internet", "expense", "#06b6d4", "wifi", bills);
  add("Mua sắm", "expense", "#8b5cf6", "shopping-bag");
  add("Sức khỏe", "expense", "#14b8a6", "heart-pulse");
  add("Giải trí", "expense", "#ec4899", "gamepad-2");
  add("Nhà ở", "expense", "#6366f1", "house");
  add("Lương", "income", "#10b981", "wallet");
  add("Thưởng", "income", "#84cc16", "gift");
  add("Đầu tư", "income", "#0ea5e9", "trending-up");
  add("Khác", "income", "#64748b", "circle-dollar-sign");
  return out;
}
