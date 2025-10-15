export enum GoalStatus {
  ACTIVE = 'ACTIVE',
  ACHIEVED = 'ACHIEVED',
  ARCHIVED = 'ARCHIVED',
}

export interface Goal {
  id: string;
  ledgerId: string;
  assetId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string | null;
  status: GoalStatus;
  achievedAt?: string | null;
  coverImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  transactionId: string;
  amount: number;
  createdAt: string;
}
