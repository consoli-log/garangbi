import { Transaction, TransactionType } from '@garangbi/types';

export function formatCurrency(amount: number | '') {
  if (amount === '' || Number.isNaN(amount)) {
    return '0';
  }
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function calculateDailySummary(transactions: Transaction[]) {
  return transactions.reduce<{ income: number; expense: number }>((acc, transaction) => {
    if (transaction.type === TransactionType.INCOME) {
      acc.income += transaction.amount;
    }
    if (transaction.type === TransactionType.EXPENSE) {
      acc.expense += transaction.amount;
    }
    return acc;
  }, { income: 0, expense: 0 });
}
