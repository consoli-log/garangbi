export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER',
}

export enum TransactionStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  SOFT_DELETED = 'SOFT_DELETED',
}

export enum TagType {
  CUSTOM = 'CUSTOM',
  SYSTEM = 'SYSTEM',
}

export interface Tag {
  id: string;
  ledgerId: string;
  name: string;
  type: TagType;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionSplit {
  id: string;
  transactionId: string;
  categoryId: string;
  amount: number;
  memo?: string | null;
  createdAt: string;
}

export interface TransactionAttachment {
  id: string;
  transactionId: string;
  fileUrl: string;
  thumbnailUrl?: string | null;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  ledgerId: string;
  assetId: string;
  relatedAssetId?: string | null;
  categoryId?: string | null;
  recurringRuleId?: string | null;
  createdById: string;
  type: TransactionType;
  status: TransactionStatus;
  transactionDate: string;
  bookedAt: string;
  amount: number;
  memo?: string | null;
  note?: string | null;
  photoUrl?: string | null;
  receiptId?: string | null;
  createdAt: string;
  updatedAt: string;
  splits?: TransactionSplit[];
  tags?: Tag[];
  attachments?: TransactionAttachment[];
}
