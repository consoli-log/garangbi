import httpClient from './httpClient';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  RecurringInterval,
} from '@garangbi/types';

export interface TransactionSplitInput {
  categoryId: string;
  amount: number;
  memo?: string;
}

export interface TransactionAttachmentInput {
  fileUrl: string;
  thumbnailUrl?: string | null;
  mimeType: string;
  size: number;
}

export interface CreateTransactionPayload {
  assetId: string;
  type: TransactionType;
  status?: TransactionStatus;
  amount: number;
  transactionDate: string;
  relatedAssetId?: string | null;
  categoryId?: string | null;
  recurringRuleId?: string | null;
  memo?: string | null;
  note?: string | null;
  splits?: TransactionSplitInput[];
  tags?: string[];
  attachments?: TransactionAttachmentInput[];
}

export interface UpdateTransactionPayload extends Partial<CreateTransactionPayload> {}

export interface TransactionQuery {
  startDate?: string;
  endDate?: string;
  categoryIds?: string[];
  assetIds?: string[];
  tagIds?: string[];
  types?: TransactionType[];
  includeSplits?: boolean;
  includeAttachments?: boolean;
}

export const listTransactions = async (
  ledgerId: string,
  query?: TransactionQuery,
) => {
  const response = await httpClient.get<Transaction[]>(
    `/ledgers/${ledgerId}/transactions`,
    { params: query },
  );
  return response.data;
};

export const createTransaction = async (
  ledgerId: string,
  payload: CreateTransactionPayload,
) => {
  const response = await httpClient.post<Transaction>(
    `/ledgers/${ledgerId}/transactions`,
    payload,
  );
  return response.data;
};

export const updateTransaction = async (
  transactionId: string,
  payload: UpdateTransactionPayload,
) => {
  const response = await httpClient.patch<Transaction>(
    `/transactions/${transactionId}`,
    payload,
  );
  return response.data;
};

export const deleteTransaction = async (transactionId: string) => {
  await httpClient.delete(`/transactions/${transactionId}`);
};

export interface CreateRecurringRulePayload {
  ledgerId: string;
  assetId: string;
  categoryId?: string | null;
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
}

// TODO: wire up recurring rule endpoints once backend logic is available.
