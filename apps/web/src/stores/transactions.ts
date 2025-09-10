import { create } from "zustand";
import { toast } from "react-toastify";
import { createTransaction as apiCreateTransaction, fetchRecentTransactions, type CreateTransactionInput, type TransactionDTO, } from "@services/transactions";

type State = {
  recent: TransactionDTO[] | null;
  loading: boolean;
};

type Actions = {
  fetchRecent: (ledgerId: string, limit?: number) => Promise<void>;
  createTransaction: (ledgerId: string, input: CreateTransactionInput) => Promise<string>;
};

export const useTransactionsStore = create<State & Actions>((set, get) => ({
  recent: null,
  loading: false,

  async fetchRecent(ledgerId: string, limit = 10) {
    set({ loading: true });
    try {
      const list = await fetchRecentTransactions(ledgerId, limit);
      set({ recent: list });
    } catch (err: any) {
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  async createTransaction(ledgerId: string, input: CreateTransactionInput) {
    try {
      const res = await apiCreateTransaction(ledgerId, input);
      toast.success("거래가 저장되었습니다.");
      const { recent } = get();
      if (recent) {
        const newItem: TransactionDTO = {
          id: res.id,
          type: input.type,
          date: new Date(input.date).toISOString(),
          amount: input.amount,
          memo: input.memo ?? null,
          assetId: input.assetId,
          counterAssetId: input.counterAssetId,
        };
        set({ recent: [newItem, ...recent].slice(0, recent.length) });
      }
      return res.id;
    } catch (err: any) {
      throw err;
    }
  },
}));
