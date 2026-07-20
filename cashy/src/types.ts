// Cashy domain types. Money is ALWAYS an integer count of Vietnamese đồng.
export type TxType = "income" | "expense";
export type ThemeMode = "system" | "light" | "dark";

export interface Workspace {
  displayName: string;
  currency: string; // "VND"
  createdAt: string; // ISO
}

// Self-referencing tree, unlimited depth. `order` sorts siblings.
export interface Category {
  id: string;
  parentId: string | null;
  order: number;
  name: string;
  colorHex: string;
  icon: string; // curated lucide key, see lib/icons
  type: TxType;
  isSystem: boolean;
}

// Flat label. A transaction may carry many tags (1-n).
export interface Tag {
  id: string;
  name: string;
  colorHex: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  amount: number; // integer VND, >= 0; sign implied by `type`
  type: TxType;
  categoryId: string | null; // exactly one category (or none)
  tagIds: string[]; // zero or more tags
  note: string;
  occurredAt: string; // YYYY-MM-DD
  createdAt: string; // ISO
}

export interface CashyState {
  version: number;
  theme: ThemeMode;
  workspace: Workspace | null;
  categories: Category[];
  tags: Tag[];
  transactions: Transaction[];
}
