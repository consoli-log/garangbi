import { TransactionType } from './transactions';

export enum RecurringInterval {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum RecurringStatus {
  SCHEDULED = 'SCHEDULED',
  POSTED = 'POSTED',
  SKIPPED = 'SKIPPED',
}

export interface RecurringRule {
  id: string;
  ledgerId: string;
  assetId: string;
  categoryId?: string | null;
  createdById: string;
  title?: string | null;
  amount: number;
  type: TransactionType;
  interval: RecurringInterval;
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
  monthOfYear?: number | null;
  startDate: string;
  endDate?: string | null;
  leadTimeDays?: number | null;
  note?: string | null;
  isActive: boolean;
  nextRunAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringInstance {
  id: string;
  ruleId: string;
  transactionId?: string | null;
  scheduledDate: string;
  status: RecurringStatus;
  createdAt: string;
}
