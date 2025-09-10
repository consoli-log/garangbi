import { api } from './httpClient';

export type TransactionType = "EXPENSE" | "INCOME" | "TRANSFER";

export interface CreateTransactionInput {
  type: TransactionType;
  date: string;
  amount: number;
  assetId?: string;
  counterAssetId?: string;
  memo?: string;
}

export interface TransactionDTO {
  id: string;
  type: TransactionType;
  date: string; 
  amount: number;
  memo?: string | null;
  assetId?: string | null;
  assetName?: string | null;
  counterAssetId?: string | null;
  counterAssetName?: string | null;
}

export async function createTransaction(ledgerId: string, input: CreateTransactionInput) {
  const { data } = await api.post<{ id: string }>(
    `/ledgers/${ledgerId}/transactions`,
    input
  );
  return data;
}

export async function fetchRecentTransactions(ledgerId: string, limit = 10) {
  const { data } = await api.get<TransactionDTO[]>(
    `/ledgers/${ledgerId}/transactions/recent`,
    { params: { limit } }
  );
  return data;
}

export interface ListQuery {
  from?: string; 
  to?: string;   
  type?: TransactionType;
  assetId?: string;
  tag?: string;
  cursor?: string;
  take?: number;
}

export async function fetchTransactions(ledgerId: string, query: ListQuery = {}) {
  const { data } = await api.get<{
    items: TransactionDTO[];
    nextCursor?: string | null;
  }>(`/ledgers/${ledgerId}/transactions`, { params: query });
  return data;
}
