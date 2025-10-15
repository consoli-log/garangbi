export enum DigestType {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export interface UserNotificationSetting {
  id: string;
  userId: string;
  weeklyDigest: boolean;
  monthlyDigest: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledDigest {
  id: string;
  userId: string;
  type: DigestType;
  scheduledFor: string;
  payload?: unknown;
  createdAt: string;
  sentAt?: string | null;
}
