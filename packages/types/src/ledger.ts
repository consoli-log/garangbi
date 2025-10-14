export enum LedgerMemberRole {
  OWNER = 'OWNER',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
}

export enum AssetGroupType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
}

export enum AssetType {
  CASH = 'CASH',
  BANK = 'BANK',
  CHECK_CARD = 'CHECK_CARD',
  CREDIT_CARD = 'CREDIT_CARD',
  LOAN = 'LOAN',
  INVESTMENT = 'INVESTMENT',
  OTHER = 'OTHER',
}

export enum CategoryType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export interface LedgerSummary {
  id: string;
  name: string;
  description?: string | null;
  currency: string;
  monthStartDay: number;
  role: LedgerMemberRole;
  memberCount: number;
  isMain: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLedgerPayload {
  name: string;
  description?: string;
  currency: string;
  monthStartDay: number;
}

export interface LedgerInvitationSummary {
  id: string;
  ledgerId: string;
  email: string;
  role: LedgerMemberRole;
  token: string;
  status: InvitationStatus;
  expiresAt: string;
  ledger: {
    name: string;
  };
  invitedBy: {
    nickname: string | null;
    email: string;
  };
}

export interface AssetGroup {
  id: string;
  ledgerId: string;
  name: string;
  type: AssetGroupType;
  sortOrder: number;
  assets: Asset[];
}

export interface Asset {
  id: string;
  ledgerId: string;
  groupId: string;
  name: string;
  type: AssetType;
  initialAmount: number;
  includeInNetWorth: boolean;
  billingDay?: number | null;
  upcomingPaymentAmount?: number | null;
  sortOrder: number;
}

export interface CategoryNode {
  id: string;
  ledgerId: string;
  name: string;
  type: CategoryType;
  parentId?: string | null;
  sortOrder: number;
  children: CategoryNode[];
}

export interface ReorderItemPayload {
  id: string;
  sortOrder: number;
}
