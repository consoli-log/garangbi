export type LedgerMemberRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export type AssetGroupType = 'ASSET' | 'LIABILITY';

export type AssetType =
  | 'CASH'
  | 'BANK'
  | 'CHECK_CARD'
  | 'CREDIT_CARD'
  | 'LOAN'
  | 'INVESTMENT'
  | 'OTHER';

export type CategoryType = 'INCOME' | 'EXPENSE';

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
