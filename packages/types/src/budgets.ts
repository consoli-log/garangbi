export enum BudgetBasis {
  CATEGORY = 'CATEGORY',
  ASSET = 'ASSET',
  CATEGORY_ASSET = 'CATEGORY_ASSET',
}

export interface Budget {
  id: string;
  ledgerId: string;
  year: number;
  month: number;
  basis: BudgetBasis;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetItem {
  id: string;
  budgetId: string;
  parentItemId?: string | null;
  categoryId?: string | null;
  assetId?: string | null;
  amount: number;
  path?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  children?: BudgetItem[];
}
